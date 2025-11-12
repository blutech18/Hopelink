/**
 * HopeLink Intelligent Matching Algorithm
 * Implementation of Weighted Sum Model (WSM) for Multi-Criteria Decision Making
 * 
 * This algorithm matches donors, recipients, and volunteers based on multiple criteria:
 * - Geographic proximity
 * - Item compatibility
 * - Urgency levels
 * - User reliability/ratings
 * - Availability/timing
 * - Delivery preferences
 */

import { db } from './supabase.js'

// Default matching criteria weights (fallback if database parameters are unavailable)
// These will be overridden by database parameters when available
// Unified weights for donor-recipient-volunteer matching
const DEFAULT_MATCHING_WEIGHTS = {
  DONOR_RECIPIENT_VOLUNTEER: {
    geographic_proximity: 0.30,    // Shared: Distance between donor, recipient, and volunteer
    item_compatibility: 0.25,      // Shared: Donor's item matches recipient's request and volunteer's preferred delivery types
    urgency_alignment: 0.20,       // Priority matching for urgent requests
    user_reliability: 0.15,        // User ratings and history for all parties
    delivery_compatibility: 0.10   // Shared: Delivery method preferences across all parties
  }
}

// Cache for matching parameters (refresh every 5 minutes)
let matchingParametersCache = {
  data: null,
  timestamp: null,
  ttl: 5 * 60 * 1000 // 5 minutes
}

/**
 * Load matching parameters from database
 * @returns {Promise<Object>} Matching parameters object
 */
async function loadMatchingParameters() {
  const now = Date.now()
  
  // Return cached data if still valid
  if (matchingParametersCache.data && 
      matchingParametersCache.timestamp && 
      (now - matchingParametersCache.timestamp) < matchingParametersCache.ttl) {
    return matchingParametersCache.data
  }
  
  try {
    const params = await db.getMatchingParameters()
    matchingParametersCache.data = params
    matchingParametersCache.timestamp = now
    return params
  } catch (error) {
    console.warn('Failed to load matching parameters from database, using defaults:', error)
    // Return default weights if database load fails
    return {
      DONOR_RECIPIENT_VOLUNTEER: {
        weights: DEFAULT_MATCHING_WEIGHTS.DONOR_RECIPIENT_VOLUNTEER,
        auto_match_enabled: false,
        auto_match_threshold: 0.75,
        auto_claim_threshold: 0.85,
        max_distance_km: 50,
        min_quantity_match_ratio: 0.8,
        perishable_geographic_boost: 0.35,
        critical_urgency_boost: 0.30
      }
    }
  }
}

/**
 * Get matching weights for a specific parameter group
 * @param {string} group - Parameter group name (e.g., 'DONOR_RECIPIENT_VOLUNTEER')
 * @returns {Promise<Object>} Matching weights object
 */
async function getMatchingWeights(group = 'DONOR_RECIPIENT_VOLUNTEER') {
  const params = await loadMatchingParameters()
  // Support both new unified group and legacy groups for backward compatibility
  const groupParams = params[group] || params.DONOR_RECIPIENT_VOLUNTEER || params.DONOR_RECIPIENT
  
  if (groupParams && groupParams.weights) {
    return groupParams.weights
  }
  
  // Fallback to default weights
  return DEFAULT_MATCHING_WEIGHTS[group] || DEFAULT_MATCHING_WEIGHTS.DONOR_RECIPIENT_VOLUNTEER
}

// Normalization functions for different criterion types
const normalizationFunctions = {
  /**
   * Normalize distance (lower distance = higher score)
   * @param {number} distance - Distance in kilometers
   * @param {number} maxDistance - Maximum reasonable distance (default 50km)
   * @returns {number} Normalized score (0-1)
   */
  normalizeDistance(distance, maxDistance = 50) {
    if (distance === null || distance === undefined || Number.isNaN(distance) || !Number.isFinite(distance)) {
      return 0.5 // Neutral score if distance is unknown
    }
    if (distance <= 0) return 1.0
    if (distance >= maxDistance) return 0.0
    const score = Math.max(0, 1 - (distance / maxDistance))
    // Round to 4 decimal places for precision
    return Math.round(score * 10000) / 10000
  },

  /**
   * Normalize category compatibility
   * @param {string} category1 - First category
   * @param {string} category2 - Second category
   * @param {string} subcategory1 - First subcategory (optional)
   * @param {string} subcategory2 - Second subcategory (optional)
   * @returns {number} Compatibility score (0-1)
   */
  normalizeCategoryMatch(category1, category2, subcategory1 = null, subcategory2 = null) {
    if (category1 === category2) {
      if (subcategory1 && subcategory2) {
        return subcategory1 === subcategory2 ? 1.0 : 0.8
      }
      return 1.0
    }
    
    // Related categories get partial score
    const relatedCategories = {
      'food': ['groceries', 'meals'],
      'clothing': ['accessories', 'shoes'],
      'electronics': ['appliances', 'gadgets'],
      'furniture': ['home_goods', 'decor']
    }
    
    for (const [main, related] of Object.entries(relatedCategories)) {
      if ((category1 === main && related.includes(category2)) ||
          (category2 === main && related.includes(category1))) {
        return 0.6
      }
    }
    
    return 0.0
  },

  /**
   * Normalize urgency alignment
   * @param {string} urgency1 - First urgency level
   * @param {string} urgency2 - Second urgency level
   * @returns {number} Alignment score (0-1)
   */
  normalizeUrgencyAlignment(urgency1, urgency2) {
    const urgencyLevels = { 'low': 1, 'medium': 2, 'high': 3, 'critical': 4 }
    const level1 = urgencyLevels[urgency1] || 2
    const level2 = urgencyLevels[urgency2] || 2
    
    const difference = Math.abs(level1 - level2)
    // Exponential decay penalizes larger gaps more strongly
    const score = Math.exp(-(difference / 1.5))
    // Clamp to [0, 1] and round to 4 decimal places for precision
    const clampedScore = Math.max(0, Math.min(1, score))
    return Math.round(clampedScore * 10000) / 10000
  },

  /**
   * Normalize user reliability score
   * @param {number} rating - User rating (0-5)
   * @param {number} completionRate - Task completion rate (0-1)
   * @param {number} totalTasks - Total number of completed tasks
   * @returns {number} Reliability score (0-1)
   */
  normalizeReliability(rating = 0, completionRate = 0, totalTasks = 0) {
    const ratingScore = rating / 5.0
    const experienceBonus = Math.min(totalTasks / 10, 0.2) // Up to 20% bonus for experience
    const reliabilityScore = (ratingScore * 0.7) + (completionRate * 0.3) + experienceBonus
    // Clamp to [0, 1] and round to 4 decimal places for precision
    const clampedScore = Math.max(0, Math.min(1.0, reliabilityScore))
    return Math.round(clampedScore * 10000) / 10000
  },

  /**
   * Normalize time-based compatibility
   * @param {Date} availableTime - When item/volunteer is available
   * @param {Date} neededTime - When item/service is needed
   * @param {number} flexibilityHours - Flexibility window in hours
   * @returns {number} Time compatibility score (0-1)
   */
  normalizeTimeCompatibility(availableTime, neededTime, flexibilityHours = 24) {
    if (!availableTime || !neededTime) return 0.5 // Neutral if times not specified
    
    const timeDiff = Math.abs(neededTime - availableTime) / (1000 * 60 * 60) // Hours
    if (timeDiff <= flexibilityHours) return 1.0
    
    const maxReasonableDelay = flexibilityHours * 7 // 1 week max
    const score = Math.max(0, 1 - (timeDiff / maxReasonableDelay))
    // Round to 4 decimal places for precision
    return Math.round(score * 10000) / 10000
  },

  /**
   * Normalize quantity compatibility
   * @param {number} available - Available quantity
   * @param {number} needed - Needed quantity
   * @returns {number} Quantity match score (0-1)
   */
  normalizeQuantityMatch(available, needed) {
    if (available >= needed) return 1.0
    const score = available / needed
    // Clamp to [0, 1] and round to 4 decimal places for precision
    const clampedScore = Math.max(0, Math.min(1, score))
    return Math.round(clampedScore * 10000) / 10000
  }
}

/**
 * Calculate geographic distance between two points
 * @param {number} lat1 - Latitude of first point
 * @param {number} lon1 - Longitude of first point
 * @param {number} lat2 - Latitude of second point
 * @param {number} lon2 - Longitude of second point
 * @returns {number|null} Distance in kilometers or null if insufficient data
 */
function calculateDistance(lat1, lon1, lat2, lon2) {
  if (
    lat1 === null || lat1 === undefined ||
    lon1 === null || lon1 === undefined ||
    lat2 === null || lat2 === undefined ||
    lon2 === null || lon2 === undefined
  ) {
    return null // Unknown distance when coordinates are missing
  }
  
  const R = 6371 // Earth's radius in kilometers
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLon = (lon2 - lon1) * Math.PI / 180
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon/2) * Math.sin(dLon/2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))
  return R * c
}

/**
 * Main matching algorithm class
 */
class IntelligentMatcher {
  constructor() {
    // Weights will be loaded from database dynamically
    this.normalize = normalizationFunctions
    // Simple in-memory caches with TTL to avoid redundant heavy computations
    this.distanceCache = new Map()
    this.reliabilityCache = new Map()
    this.distanceTtlMs = 5 * 60 * 1000 // 5 minutes
    this.reliabilityTtlMs = 15 * 60 * 1000 // 15 minutes
  }

  /**
   * Find best request matches for a donation (reverse matching for recipients)
   * @param {Object} donation - Donation object
   * @param {Array} availableRequests - Array of recipient's open requests
   * @param {Object} recipient - Recipient user object (for geographic proximity)
   * @param {number} maxResults - Maximum number of results to return
   * @returns {Array} Sorted array of request matches with scores
   */
  async matchDonationToRequests(donation, availableRequests = null, recipient = null, maxResults = 10) {
    try {
      // Get recipient's requests if not provided
      if (!availableRequests && recipient?.id) {
        availableRequests = await db.getRequests({ requester_id: recipient.id, status: 'open' })
      }

      if (!availableRequests || availableRequests.length === 0) {
        return []
      }

      // 1) Pre-filter to eliminate incompatible requests quickly
      const candidates = availableRequests.filter(request => {
        if (!request) return false
        if (request.status && request.status !== 'open') return false
        // Category must match or be related
        const categoryScore = this.normalize.normalizeCategoryMatch(request.category, donation.category)
        if (categoryScore <= 0) return false
        // Quantity sufficient
        if (typeof request.quantity_needed === 'number' && typeof donation.quantity === 'number') {
          const minQuantityRatio = 0.5
          if (donation.quantity < (request.quantity_needed * minQuantityRatio)) return false
        }
        return true
      })

      // 2) Quick scoring for coarse ranking
      const quickRanked = candidates.map(request => ({
        request,
        quickScore: this.calculateQuickScore(request, donation)
      }))
        .sort((a, b) => b.quickScore - a.quickScore)
        .slice(0, Math.min(maxResults * 2, candidates.length))

      // 3) Get parameter-driven weights from database
      const params = await loadMatchingParameters()
      const baseWeights = await getMatchingWeights('DONOR_RECIPIENT_VOLUNTEER')
      const groupParams = params.DONOR_RECIPIENT_VOLUNTEER || params.DONOR_RECIPIENT
      
      // 4) Detailed scoring in parallel for top candidates
      const detailedMatches = await Promise.all(quickRanked.map(async ({ request }) => {
        const weights = await this.getContextualWeights(request, donation, baseWeights)
        const scores = await this.calculateDetailedScoresForDonation(donation, request, recipient, groupParams)
        
        // Calculate total score
        let totalScore = Object.keys(weights).reduce((sum, criterion) => {
          const score = scores[criterion] || 0
          const weight = weights[criterion] || 0
          return sum + (score * weight)
        }, 0)
        
        totalScore = Math.max(0, Math.min(1, totalScore))
        totalScore = Math.round(totalScore * 10000) / 10000
        
        return {
          request,
          score: totalScore,
          criteriaScores: scores,
          matchReason: this.generateMatchReason(scores, weights)
        }
      }))

      return detailedMatches
        .sort((a, b) => b.score - a.score)
        .slice(0, maxResults)
    } catch (error) {
      console.error('Error in matchDonationToRequests:', error)
      throw error
    }
  }

  /**
   * Calculate detailed scores for donation-to-request matching (for recipients)
   * Uses donation location and recipient user location for geographic proximity
   * @param {Object} donation - Donation object
   * @param {Object} request - Request object
   * @param {Object} recipient - Recipient user object
   * @param {Object} params - Matching parameters
   * @returns {Object} Detailed scores object
   */
  async calculateDetailedScoresForDonation(donation, request, recipient, params = null) {
    const maxDistance = params?.max_distance_km || 50
    
    // Extract user profile preferences
    let donorPreferences = null
    let recipientPreferences = null
    
    try {
      if (donation.donor) {
        // Extract donation_types from user_profiles.donor JSONB field
        const donorProfile = Array.isArray(donation.donor.profile) ? donation.donor.profile[0] : donation.donor.profile
        const donationTypes = donorProfile?.donor?.donation_types || donation.donor.donation_types || []
        donorPreferences = {
          donation_types: Array.isArray(donationTypes) ? donationTypes : []
        }
      } else if (donation.donor_id) {
        const donorProfile = await db.getProfile(donation.donor_id)
        if (donorProfile) {
          donorPreferences = {
            donation_types: Array.isArray(donorProfile.donation_types) ? donorProfile.donation_types : []
          }
        }
      }
      
      if (recipient) {
        recipientPreferences = {
          assistance_needs: Array.isArray(recipient.assistance_needs) ? recipient.assistance_needs : []
        }
      } else if (request.requester_id) {
        const recipientProfile = await db.getProfile(request.requester_id)
        if (recipientProfile) {
          recipientPreferences = {
            assistance_needs: Array.isArray(recipientProfile.assistance_needs) ? recipientProfile.assistance_needs : []
          }
        }
      }
    } catch (error) {
      console.warn('Error fetching user preferences for matching:', error)
    }
    
    // Geographic score: Use donation pickup_location and recipient user location
    // Priority: donation pickup_location vs recipient user location (address or coordinates)
    const donationLocation = donation.pickup_location || donation.donor?.address || donation.donor?.city || ''
    const recipientLocation = recipient?.address || recipient?.city || request.requester?.address || request.requester?.city || ''
    
    let dist = null
    // Use recipient user location (latitude/longitude) if available, otherwise use address matching
    if (recipient?.latitude && recipient?.longitude) {
      // If donation has donor coordinates, use them; otherwise use address-based matching
      if (donation.donor?.latitude && donation.donor?.longitude) {
        dist = this.getCachedDistance(
          recipient.latitude, recipient.longitude,
          donation.donor.latitude, donation.donor.longitude
        )
      } else {
        // Use address-based proximity when coordinates not available
        dist = this.calculateAddressProximity(donationLocation, recipientLocation)
      }
    } else {
      // Fallback: Calculate distance based on address matching
      dist = this.calculateAddressProximity(donationLocation, recipientLocation)
    }
    
    const geographic_proximity = this.normalize.normalizeDistance(dist, maxDistance)

    const item_compatibility = this.calculateItemCompatibility(
      request.category, donation.category,
      request.title, donation.title,
      request.quantity_needed, donation.quantity,
      donorPreferences,
      recipientPreferences
    )

    const urgency_alignment = this.normalize.normalizeUrgencyAlignment(
      request.urgency, donation.is_urgent ? 'high' : 'medium'
    )

    const user_reliability = await this.getCachedReliability(donation.donor_id, 'donor')

    const delivery_compatibility = this.calculateDeliveryCompatibility(
      request.delivery_mode, donation.delivery_mode
    )

    return {
      geographic_proximity,
      item_compatibility,
      urgency_alignment,
      user_reliability,
      delivery_compatibility
    }
  }

  /**
   * Find best donor matches for a recipient's request
   * @param {Object} request - Donation request object
   * @param {Array} availableDonations - Array of available donations
   * @param {number} maxResults - Maximum number of results to return
   * @returns {Array} Sorted array of donation matches with scores
   */
  async matchDonorsToRequest(request, availableDonations = null, maxResults = 10) {
    try {
      // Get available donations if not provided
      if (!availableDonations) {
        availableDonations = await db.getAvailableDonations()
      }

      // 1) Pre-filter to eliminate incompatible donations quickly
      const candidates = this.preFilterDonations(request, availableDonations)

      // 2) Quick scoring (fast, synchronous) for coarse ranking
      const quickRanked = candidates.map(donation => ({
        donation,
        quickScore: this.calculateQuickScore(request, donation)
      }))
        .sort((a, b) => b.quickScore - a.quickScore)
        .slice(0, Math.min(maxResults * 2, candidates.length)) // keep 2x for safety

      // 3) Get parameter-driven weights from database
      const params = await loadMatchingParameters()
      const baseWeights = await getMatchingWeights('DONOR_RECIPIENT_VOLUNTEER')
      // Support both new unified group and legacy groups for backward compatibility
      const groupParams = params.DONOR_RECIPIENT_VOLUNTEER || params.DONOR_RECIPIENT
      
      // 4) Detailed scoring in parallel for top candidates
      const detailedMatches = await Promise.all(quickRanked.map(async ({ donation }) => {
        const weights = await this.getContextualWeights(request, donation, baseWeights)
        const scores = await this.calculateDetailedScores(request, donation, groupParams)
        // Calculate total score with precision control
        let totalScore = Object.keys(weights).reduce((sum, criterion) => {
          const score = scores[criterion] || 0
          const weight = weights[criterion] || 0
          return sum + (score * weight)
        }, 0)
        // Clamp score to [0, 1] range and round to 4 decimal places for precision
        totalScore = Math.max(0, Math.min(1, totalScore))
        totalScore = Math.round(totalScore * 10000) / 10000
        return {
          donation,
          score: totalScore,
          criteriaScores: scores,
          matchReason: this.generateMatchReason(scores, weights)
        }
      }))

      return detailedMatches
        .sort((a, b) => b.score - a.score)
        .slice(0, maxResults)
    } catch (error) {
      console.error('Error in matchDonorsToRequest:', error)
      throw error
    }
  }

  /**
   * Find best volunteer matches for a delivery task
   * @param {Object} task - Delivery task (claim or request)
   * @param {Array} availableVolunteers - Array of available volunteers
   * @param {number} maxResults - Maximum number of results to return
   * @returns {Array} Sorted array of volunteer matches with scores
   */
  async matchVolunteersToTask(task, availableVolunteers = null, maxResults = 5) {
    try {
      // Get available volunteers if not provided
      if (!availableVolunteers) {
        availableVolunteers = await this.getAvailableVolunteers()
      }

      // Get parameter-driven weights from database (using unified matching weights)
      const unifiedWeights = await getMatchingWeights('DONOR_RECIPIENT_VOLUNTEER')
      // Map volunteer-specific scores to unified weights
      // For volunteers, we use the shared criteria from unified matching
      const weights = {
        geographic_proximity: unifiedWeights.geographic_proximity || 0.30,
        item_compatibility: unifiedWeights.item_compatibility || 0.25, // Volunteer's preferred delivery types
        urgency_alignment: unifiedWeights.urgency_alignment || 0.20,
        user_reliability: unifiedWeights.user_reliability || 0.15,
        delivery_compatibility: unifiedWeights.delivery_compatibility || 0.10
      }
      const matches = []

      for (const volunteer of availableVolunteers) {
        const scores = {
          geographic_proximity: this.calculateVolunteerProximity(task, volunteer),
          item_compatibility: await this.calculateVolunteerItemCompatibility(task, volunteer), // Use volunteer's preferred delivery types
          urgency_alignment: this.calculateUrgencyResponse(task, volunteer), // Map urgency_response to urgency_alignment
          user_reliability: await this.calculateUserReliability(volunteer.id, 'volunteer'),
          delivery_compatibility: await this.calculateAvailabilityMatch(task, volunteer) // Map availability to delivery compatibility
        }

        // Calculate total score with precision control
        let totalScore = Object.keys(weights).reduce((sum, criterion) => {
          const score = scores[criterion] || 0
          const weight = weights[criterion] || 0
          return sum + (score * weight)
        }, 0)
        // Clamp score to [0, 1] range and round to 4 decimal places for precision
        totalScore = Math.max(0, Math.min(1, totalScore))
        totalScore = Math.round(totalScore * 10000) / 10000

        matches.push({
          volunteer,
          score: totalScore,
          criteriaScores: scores,
          matchReason: this.generateMatchReason(scores, weights)
        })
      }

      return matches
        .sort((a, b) => b.score - a.score)
        .slice(0, maxResults)
    } catch (error) {
      console.error('Error in matchVolunteersToTask:', error)
      throw error
    }
  }

  /**
   * Calculate match score for a single task for a specific volunteer
   * This is used to score tasks from the volunteer's perspective
   * @param {Object} task - Delivery task object
   * @param {Object} volunteer - Volunteer profile object
   * @returns {Promise<Object>} Match score and details
   */
  async calculateTaskScoreForVolunteer(task, volunteer) {
    try {
      // Get parameter-driven weights from database (using unified matching weights)
      const unifiedWeights = await getMatchingWeights('DONOR_RECIPIENT_VOLUNTEER')
      
      // Map volunteer-specific scores to unified weights
      const weights = {
        geographic_proximity: unifiedWeights.geographic_proximity || 0.30,
        item_compatibility: unifiedWeights.item_compatibility || 0.25,
        urgency_alignment: unifiedWeights.urgency_alignment || 0.20,
        user_reliability: unifiedWeights.user_reliability || 0.15,
        delivery_compatibility: unifiedWeights.delivery_compatibility || 0.10
      }

      // Prepare task object with location data for proximity calculation
      // Handle different task structures (from getAvailableVolunteerTasks vs direct task objects)
      const taskWithLocations = {
        ...task,
        // Ensure pickup_location is available (support both camelCase and snake_case)
        pickup_location: task.pickup_location || task.pickupLocation || task.donation?.pickup_location || '',
        // Ensure delivery_location is available
        delivery_location: task.delivery_location || task.deliveryLocation || task.request?.location || '',
        // Extract latitude/longitude from donor object for pickup location
        pickup_latitude: task.donor?.latitude || task.pickup_latitude || null,
        pickup_longitude: task.donor?.longitude || task.pickup_longitude || null,
        // Extract latitude/longitude from recipient object for delivery location
        delivery_latitude: task.recipient?.latitude || task.delivery_latitude || null,
        delivery_longitude: task.recipient?.longitude || task.delivery_longitude || null,
        // Ensure request and donation objects exist for compatibility
        request: task.request || { category: task.category, urgency: task.urgency },
        donation: task.donation || { category: task.category, pickup_location: task.pickup_location || task.pickupLocation },
        // Ensure category is available
        category: task.category || task.donation?.category || task.request?.category
      }

      // Calculate scores using unified criteria
      const scores = {
        geographic_proximity: this.calculateVolunteerProximity(taskWithLocations, volunteer),
        item_compatibility: await this.calculateVolunteerItemCompatibility(taskWithLocations, volunteer),
        urgency_alignment: this.calculateUrgencyResponse(taskWithLocations, volunteer),
        user_reliability: await this.calculateUserReliability(volunteer.id, 'volunteer'),
        delivery_compatibility: await this.calculateAvailabilityMatch(taskWithLocations, volunteer)
      }

      // Calculate total weighted score with precision control
      let totalScore = Object.keys(weights).reduce((sum, criterion) => {
        const score = scores[criterion] || 0
        const weight = weights[criterion] || 0
        return sum + (score * weight)
      }, 0)
      // Clamp score to [0, 1] range and round to 4 decimal places for precision
      totalScore = Math.max(0, Math.min(1, totalScore))
      totalScore = Math.round(totalScore * 10000) / 10000

      return {
        score: totalScore,
        criteriaScores: scores,
        matchReason: this.generateMatchReason(scores, weights),
        weights
      }
    } catch (error) {
      console.error('Error calculating task score for volunteer:', error)
      // Return neutral score on error
      return {
        score: 0.5,
        criteriaScores: {},
        matchReason: 'Unable to calculate match score',
        weights: {}
      }
    }
  }

  /**
   * Find optimal donor-recipient-volunteer combinations
   * @param {Array} requests - Array of donation requests
   * @param {Array} donations - Array of available donations
   * @param {Array} volunteers - Array of available volunteers
   * @returns {Array} Optimal matching combinations
   */
  async findOptimalMatches(requests = null, donations = null, volunteers = null) {
    try {
      // Get data if not provided
      if (!requests) requests = await db.getRequests({ status: 'open' })
      if (!donations) donations = await db.getAvailableDonations()
      if (!volunteers) volunteers = await this.getAvailableVolunteers()

      const optimalMatches = []

      // Process each request; parallelize volunteer matching inside per-request loop
      for (const request of requests) {
        const donorMatches = await this.matchDonorsToRequest(request, donations, 3)

        // For donor matches that need volunteers, build tasks
        const tasksNeedingVolunteers = donorMatches
          .filter(dm => request.delivery_mode === 'volunteer' || dm.donation.delivery_mode === 'volunteer')
          .map(dm => ({
            donorMatch: dm,
            task: {
              type: 'delivery',
              request,
              donation: dm.donation,
              urgency: request.urgency,
              pickup_location: dm.donation.pickup_location,
              delivery_location: request.location
            }
          }))

        // Parallel volunteer matching for tasks
        const volunteerResults = await Promise.all(tasksNeedingVolunteers.map(async ({ donorMatch, task }) => {
          const vols = await this.matchVolunteersToTask(task, volunteers, 2)
          return vols.map(volMatch => ({ donorMatch, task, volMatch }))
        }))

        // Flatten and build three-way matches
        volunteerResults.flat().forEach(({ donorMatch, task, volMatch }) => {
          const combinedScore = (donorMatch.score * 0.6) + (volMatch.score * 0.4)
          optimalMatches.push({
            request,
            donation: donorMatch.donation,
            volunteer: volMatch.volunteer,
            combinedScore,
            donorScore: donorMatch.score,
            volunteerScore: volMatch.score,
            matchType: 'three_way',
            estimatedDeliveryTime: this.estimateDeliveryTime(task, volMatch.volunteer)
          })
        })

        // Add direct matches (no volunteer needed)
        donorMatches
          .filter(dm => !(request.delivery_mode === 'volunteer' || dm.donation.delivery_mode === 'volunteer'))
          .forEach(dm => {
            optimalMatches.push({
              request,
              donation: dm.donation,
              volunteer: null,
              combinedScore: dm.score,
              donorScore: dm.score,
              volunteerScore: null,
              matchType: 'direct',
              estimatedDeliveryTime: null
            })
          })
      }

      return optimalMatches
        .sort((a, b) => b.combinedScore - a.combinedScore)
        .slice(0, 20) // Return top 20 optimal matches
    } catch (error) {
      console.error('Error in findOptimalMatches:', error)
      throw error
    }
  }

  // Helper methods for score calculations
  calculateGeographicScore(lat1, lon1, lat2, lon2) {
    const distance = calculateDistance(lat1, lon1, lat2, lon2)
    return this.normalize.normalizeDistance(distance)
  }

  calculateItemCompatibility(category1, category2, title1, title2, needed, available, donorPreferences = null, recipientPreferences = null) {
    const categoryScore = this.normalize.normalizeCategoryMatch(category1, category2)
    const quantityScore = this.normalize.normalizeQuantityMatch(available, needed)
    
    // Improved text similarity (Jaccard)
    const titleSimilarity = this.calculateTextSimilarity(title1, title2)
    
    // Base compatibility score
    let baseScore = (categoryScore * 0.5) + (quantityScore * 0.3) + (titleSimilarity * 0.2)
    
    // Apply preference-based adjustments if preferences are available
    let preferenceBoost = 0
    
    // Check if donor's donation_types preferences match the item category
    if (donorPreferences && Array.isArray(donorPreferences.donation_types) && donorPreferences.donation_types.length > 0) {
      const normalizedCategory = category1?.toLowerCase().trim()
      const matchesDonorPreference = donorPreferences.donation_types.some(type => {
        const normalizedType = type.toLowerCase().trim()
        // Map profile donation types to categories
        const typeToCategoryMap = {
          'food & beverages': ['food', 'groceries', 'meals'],
          'clothing & accessories': ['clothing', 'apparel'],
          'medical supplies': ['medical', 'medicine'],
          'educational materials': ['educational', 'books', 'education'],
          'household items': ['household', 'home'],
          'electronics & technology': ['electronics', 'technology', 'tech'],
          'toys & recreation': ['toys', 'recreation'],
          'personal care items': ['personal care', 'care'],
          'emergency supplies': ['emergency'],
          'financial assistance': ['financial'],
          'transportation': ['transportation'],
          'other': []
        }
        
        // Check if category matches any mapped categories for this preference type
        const mappedCategories = typeToCategoryMap[normalizedType] || []
        return mappedCategories.some(mapped => normalizedCategory?.includes(mapped)) || 
               normalizedCategory?.includes(normalizedType) ||
               normalizedType?.includes(normalizedCategory)
      })
      
      if (matchesDonorPreference) {
        preferenceBoost += 0.15 // Boost for matching donor preference
      }
    }
    
    // Check if recipient's assistance_needs preferences match the item category
    if (recipientPreferences && Array.isArray(recipientPreferences.assistance_needs) && recipientPreferences.assistance_needs.length > 0) {
      const normalizedCategory = category2?.toLowerCase().trim()
      const matchesRecipientPreference = recipientPreferences.assistance_needs.some(need => {
        const normalizedNeed = need.toLowerCase().trim()
        // Map profile assistance needs to categories
        const needToCategoryMap = {
          'food & beverages': ['food', 'groceries', 'meals'],
          'clothing & accessories': ['clothing', 'apparel'],
          'medical supplies': ['medical', 'medicine'],
          'educational materials': ['educational', 'books', 'education'],
          'household items': ['household', 'home'],
          'financial assistance': ['financial'],
          'personal care items': ['personal care', 'care'],
          'transportation': ['transportation'],
          'emergency supplies': ['emergency'],
          'other': []
        }
        
        // Check if category matches any mapped categories for this preference type
        const mappedCategories = needToCategoryMap[normalizedNeed] || []
        return mappedCategories.some(mapped => normalizedCategory?.includes(mapped)) || 
               normalizedCategory?.includes(normalizedNeed) ||
               normalizedNeed?.includes(normalizedCategory)
      })
      
      if (matchesRecipientPreference) {
        preferenceBoost += 0.15 // Boost for matching recipient preference
      }
    }
    
    // Apply preference boost (capped at 0.3 to prevent score from exceeding 1.0)
    const finalScore = Math.min(1.0, baseScore + preferenceBoost)
    // Clamp to [0, 1] and round to 4 decimal places for precision
    const clampedScore = Math.max(0, Math.min(1, finalScore))
    return Math.round(clampedScore * 10000) / 10000
  }

  calculateTextSimilarity(text1, text2) {
    if (!text1 || !text2) return 0
    const set1 = new Set(text1.toLowerCase().split(/\s+/).filter(Boolean))
    const set2 = new Set(text2.toLowerCase().split(/\s+/).filter(Boolean))
    if (set1.size === 0 || set2.size === 0) return 0
    let intersection = 0
    set1.forEach(w => { if (set2.has(w)) intersection += 1 })
    const union = new Set([...set1, ...set2]).size
    return intersection / union
  }

  calculateDeliveryCompatibility(mode1, mode2) {
    if (mode1 === mode2) return 1.0
    
    // Compatible modes
    const compatibleModes = {
      'volunteer': ['pickup', 'direct'],
      'pickup': ['volunteer'],
      'direct': ['volunteer']
    }
    
    return compatibleModes[mode1]?.includes(mode2) ? 0.7 : 0.3
  }

  async calculateUserReliability(userId, userType) {
    try {
      if (userType === 'volunteer') {
        const stats = await db.getVolunteerStats(userId)
        const completionRate = stats.totalDeliveries > 0 ? 
          stats.completedDeliveries / stats.totalDeliveries : 0
        
        return this.normalize.normalizeReliability(
          stats.averageRating,
          completionRate,
          stats.totalDeliveries
        )
      } else {
        // For donors/recipients, calculate based on their history
        const donations = await db.getDonations({ donor_id: userId })
        const completedDonations = donations.filter(d => d.status === 'completed').length
        const completionRate = donations.length > 0 ? completedDonations / donations.length : 0
        
        return this.normalize.normalizeReliability(4.0, completionRate, donations.length)
      }
    } catch (error) {
      console.error('Error calculating user reliability:', error)
      return 0.5 // Default neutral score
    }
  }

  calculateVolunteerProximity(task, volunteer) {
    // Calculate average distance from volunteer to pickup and delivery locations
    // Priority: Use actual donation pickup_location vs volunteer user location (address or coordinates)
    
    // Get pickup location from donation (primary source)
    // Support both camelCase (pickupLocation) and snake_case (pickup_location) for compatibility
    const pickupLocation = task.pickup_location || task.pickupLocation || task.donation?.pickup_location || ''
    // Get delivery location (from request location or task delivery_location)
    const deliveryLocation = task.delivery_location || task.deliveryLocation || task.request?.location || ''
    
    // Get volunteer user location (address or city)
    const volunteerLocation = volunteer.address || volunteer.city || ''
    
    let pickupDistance = null
    let deliveryDistance = null
    
    // Try coordinates first if available for accurate distance calculation
    if (volunteer.latitude && volunteer.longitude) {
      // Use donation pickup location coordinates (from donor) if available
      if (task.pickup_latitude && task.pickup_longitude) {
        pickupDistance = this.getCachedDistance(
          volunteer.latitude, volunteer.longitude,
          task.pickup_latitude, task.pickup_longitude
        )
      } else if (task.donor?.latitude && task.donor?.longitude) {
        // Fallback to donor coordinates from task.donor object
        pickupDistance = this.getCachedDistance(
          volunteer.latitude, volunteer.longitude,
          task.donor.latitude, task.donor.longitude
        )
      }
      
      // Use delivery location coordinates (from recipient) if available
      if (task.delivery_latitude && task.delivery_longitude) {
        deliveryDistance = this.getCachedDistance(
          volunteer.latitude, volunteer.longitude,
          task.delivery_latitude, task.delivery_longitude
        )
      } else if (task.recipient?.latitude && task.recipient?.longitude) {
        // Fallback to recipient coordinates from task.recipient object
        deliveryDistance = this.getCachedDistance(
          volunteer.latitude, volunteer.longitude,
          task.recipient.latitude, task.recipient.longitude
        )
      }
    }
    
    // Fallback to address-based matching if coordinates not available
    // Use donation pickup_location vs volunteer user location
    if (pickupDistance === null && pickupLocation) {
      pickupDistance = this.calculateAddressProximity(volunteerLocation, pickupLocation)
    }
    
    // Use delivery location vs volunteer user location
    if (deliveryDistance === null && deliveryLocation) {
      deliveryDistance = this.calculateAddressProximity(volunteerLocation, deliveryLocation)
    }
    
    const distances = [pickupDistance, deliveryDistance].filter(d => d !== null && d !== undefined)
    if (distances.length === 0) return 0.5 // Neutral score if no location data
    const averageDistance = distances.reduce((a, b) => a + b, 0) / distances.length
    return this.normalize.normalizeDistance(averageDistance)
  }

  async calculateAvailabilityMatch(task, volunteer) {
    // This would integrate with volunteer scheduling system
    // For now, return a default score based on volunteer activity
    const recentDeliveries = await db.getDeliveries({ 
      volunteer_id: volunteer.id,
      status: 'assigned'
    })
    
    // Volunteers with fewer active deliveries are more available
    const availabilityScore = Math.max(0, 1 - (recentDeliveries.length * 0.2))
    return availabilityScore
  }

  async calculateSkillCompatibility(task, volunteer) {
    // Calculate based on volunteer's experience with similar tasks
    const volunteerHistory = await db.getDeliveries({ volunteer_id: volunteer.id })
    const relevantExperience = volunteerHistory.filter(delivery => {
      // Check if volunteer has experience with similar categories or urgency levels
      return delivery.claim?.donation?.category === task.request?.category ||
             delivery.urgency === task.urgency
    })
    
    const experienceScore = Math.min(1.0, relevantExperience.length / 5) // Max score at 5 similar tasks
    return experienceScore
  }

  calculateUrgencyResponse(task, volunteer) {
    // Calculate urgency alignment similar to donor-recipient matching
    // Compare task urgency with volunteer's preferred urgency handling
    const taskUrgency = task.urgency || 'medium'
    
    // Get volunteer's urgency preference from profile if available
    // Check multiple possible locations: flattened field, nested profile, or default
    let volunteerUrgencyPreference = volunteer?.urgency_response || 
                                     volunteer?.preferred_urgency ||
                                     volunteer?.profile?.volunteer?.urgency_response ||
                                     volunteer?.profile?.volunteer?.preferred_urgency
    
    // If still not found, randomly assign a preference to create diversity
    // This prevents all volunteers from defaulting to 'medium' and getting 100% matches
    if (!volunteerUrgencyPreference) {
      // Use volunteer ID as seed for consistent but diverse assignment
      const urgencyLevels = ['low', 'medium', 'high', 'critical']
      const seed = volunteer?.id ? volunteer.id.charCodeAt(0) : Math.random()
      volunteerUrgencyPreference = urgencyLevels[seed % urgencyLevels.length]
    }
    
    // Use the same normalization function as donor-recipient matching
    // This compares task urgency with volunteer's preference/ability
    // Returns a score based on how well the task urgency matches volunteer's preference
    return this.normalize.normalizeUrgencyAlignment(taskUrgency, volunteerUrgencyPreference)
  }

  async calculateVolunteerItemCompatibility(task, volunteer) {
    // Calculate item compatibility based on volunteer's preferred delivery types
    // This checks if the volunteer is willing/interested in delivering items of this category
    try {
      // Get the donation/request category from the task
      const itemCategory = task.donation?.category || task.request?.category
      if (!itemCategory) return 0.7 // Default neutral score if category is unknown
      
      // Get volunteer's preferred delivery types
      const preferredTypes = volunteer.preferred_delivery_types || []
      if (!preferredTypes || preferredTypes.length === 0) {
        // If no preferences set, return neutral score
        return 0.7
      }
      
      // Normalize function to handle case-insensitive matching
      const normalize = (str) => str?.toLowerCase().trim().replace(/\s+/g, ' ').replace(/[\/-]/g, ' ')
      
      // Map item categories (from donations/requests) to delivery types (from volunteer preferences)
      // Categories are typically: food, groceries, meals, clothing, electronics, furniture, medical, books, toys, etc.
      // Delivery types are: "Food Items", "Clothing", "Electronics", "Furniture", "Medical Supplies", "Books/Educational", "Toys", "Household Items"
      const categoryToDeliveryTypes = {
        'food': ['Food Items'],
        'groceries': ['Food Items', 'Household Items'],
        'meals': ['Food Items'],
        'clothing': ['Clothing'],
        'electronics': ['Electronics'],
        'furniture': ['Furniture', 'Household Items'],
        'medical': ['Medical Supplies'],
        'books': ['Books/Educational'],
        'toys': ['Toys'],
        'household': ['Household Items'],
        'educational': ['Books/Educational']
      }
      
      const normalizedCategory = normalize(itemCategory)
      const matchingDeliveryTypes = categoryToDeliveryTypes[normalizedCategory] || []
      
      // Check for exact match
      const normalizedPreferredTypes = preferredTypes.map(normalize)
      for (const deliveryType of matchingDeliveryTypes) {
        if (normalizedPreferredTypes.includes(normalize(deliveryType))) {
          return 1.0 // Perfect match
        }
      }
      
      // Check for partial match (category name appears in delivery type or vice versa)
      for (const preferredType of preferredTypes) {
        const normalizedPreferred = normalize(preferredType)
        if (normalizedPreferred.includes(normalizedCategory) || normalizedCategory.includes(normalizedPreferred)) {
          return 0.8 // Good match
        }
      }
      
      // Check for "Household Items" which is a catch-all category
      if (normalizedPreferredTypes.includes(normalize('Household Items'))) {
        return 0.7 // Moderate match
      }
      
      return 0.5 // Low compatibility
    } catch (error) {
      console.error('Error calculating volunteer item compatibility:', error)
      return 0.7 // Default neutral score on error
    }
  }

  async getAvailableVolunteers() {
    // Get volunteers who are active and not overloaded
    try {
      // Use db helper function to get volunteers (filter by status: 'active')
      const volunteers = await db.getVolunteers({ status: 'active' })
      
      if (!volunteers || volunteers.length === 0) {
        return []
      }
      
      // Filter out overloaded volunteers
      const availableVolunteers = []
      for (const volunteer of volunteers) {
        const activeDeliveries = await db.getDeliveries({
          volunteer_id: volunteer.id,
          status: 'assigned'
        })
        
        // Volunteers with less than 3 active deliveries are considered available
        if (activeDeliveries.length < 3) {
          availableVolunteers.push(volunteer)
        }
      }
      
      return availableVolunteers
    } catch (error) {
      console.error('Error getting available volunteers:', error)
      return []
    }
  }

  generateMatchReason(scores, weights) {
    // Find the parameter with the highest weighted contribution (not raw score)
    // This matches how the admin matching-parameters page displays parameters
    const weightedScores = Object.entries(scores).map(([criterion, score]) => ({
      criterion,
      score: score || 0,
      weight: weights[criterion] || 0,
      contribution: (score || 0) * (weights[criterion] || 0)
    }))
    
    // Filter out zero contributions and sort by weighted contribution (highest first)
    const validScores = weightedScores
      .filter(f => f.contribution > 0)
      .sort((a, b) => b.contribution - a.contribution)
    
    if (validScores.length === 0) {
      return 'Good match'
    }
    
    // Get the highest contributing parameter (this is what matters most in matching)
    const topFactor = validScores[0]
    
    // Short, user-friendly parameter names
    const parameterNames = {
      geographic_proximity: 'Close Location',
      item_compatibility: 'Perfect Item Match',
      urgency_alignment: 'Urgency Match',
      user_reliability: 'High Reliability',
      delivery_compatibility: 'Delivery Match',
      availability_match: 'Good Timing',
      skill_compatibility: 'Relevant Skills'
    }
    
    const parameterName = parameterNames[topFactor.criterion] || topFactor.criterion
    
    // Display short, user-friendly parameter name
    return parameterName
  }

  estimateDeliveryTime(task, volunteer) {
    // Estimate delivery time based on distance and volunteer efficiency
    const distance = calculateDistance(
      task.pickup_latitude, task.pickup_longitude,
      task.delivery_latitude, task.delivery_longitude
    )
    
    // Base time: 30 minutes + 2 minutes per km + volunteer efficiency factor
    const km = (distance === null || distance === undefined) ? 10 : distance
    const baseTime = 30 + (km * 2)
    const volunteerEfficiency = 1.0 // Could be based on volunteer's past performance
    
    return Math.round(baseTime / volunteerEfficiency)
  }

  // ------------------------------
  // Performance and accuracy helpers
  // ------------------------------

  preFilterDonations(request, donations) {
    return (donations || []).filter(donation => {
      if (!donation) return false
      if (donation.status && donation.status !== 'available') return false
      // Category must match or be related
      const categoryScore = this.normalize.normalizeCategoryMatch(request.category, donation.category)
      if (categoryScore <= 0) return false
      // Quantity check: Allow donations with at least 50% of needed quantity (more lenient for matching)
      // The detailed scoring will handle partial quantity matches
      if (typeof request.quantity_needed === 'number' && typeof donation.quantity === 'number') {
        const minQuantityRatio = 0.5 // Allow donations with at least 50% of needed quantity
        if (donation.quantity < (request.quantity_needed * minQuantityRatio)) return false
      }
      return true
    })
  }

  calculateQuickScore(request, donation) {
    const categoryScore = this.normalize.normalizeCategoryMatch(request.category, donation.category)
    const quantityScore = this.normalize.normalizeQuantityMatch(donation.quantity, request.quantity_needed)
    return (categoryScore * 0.6) + (quantityScore * 0.4)
  }

  async calculateDetailedScores(request, donation, params = null) {
    // Get max distance from parameters if available
    const maxDistance = params?.max_distance_km || 50
    
    // Extract user profile preferences from already-loaded data to avoid extra DB calls
    let donorPreferences = null
    let recipientPreferences = null
    
    try {
      // Use donor data from donation object if available (from join query)
      // This avoids an extra database call since donation.donor is already populated
      if (donation.donor) {
        // Extract donation_types from user_profiles.donor JSONB field
        const donorProfile = Array.isArray(donation.donor.profile) ? donation.donor.profile[0] : donation.donor.profile
        const donationTypes = donorProfile?.donor?.donation_types || donation.donor.donation_types || []
        donorPreferences = {
          donation_types: Array.isArray(donationTypes) ? donationTypes : []
        }
      } else if (donation.donor_id) {
        // Fallback: Only fetch if donor data is not in donation object
        const donorProfile = await db.getProfile(donation.donor_id)
        if (donorProfile) {
          donorPreferences = {
            donation_types: Array.isArray(donorProfile.donation_types) ? donorProfile.donation_types : []
          }
        }
      }
      
      // Use requester data from request object if available (from join query)
      // This avoids an extra database call since request.requester is already populated
      if (request.requester) {
        // Extract assistance_needs from user_profiles.recipient JSONB field
        const recipientProfile = Array.isArray(request.requester.profile) ? request.requester.profile[0] : request.requester.profile
        const assistanceNeeds = recipientProfile?.recipient?.assistance_needs || request.requester.assistance_needs || []
        recipientPreferences = {
          assistance_needs: Array.isArray(assistanceNeeds) ? assistanceNeeds : []
        }
      } else if (request.requester_id) {
        // Fallback: Only fetch if requester data is not in request object
        const recipientProfile = await db.getProfile(request.requester_id)
        if (recipientProfile) {
          recipientPreferences = {
            assistance_needs: Array.isArray(recipientProfile.assistance_needs) ? recipientProfile.assistance_needs : []
          }
        }
      }
    } catch (error) {
      console.warn('Error fetching user preferences for matching:', error)
      // Continue without preferences if fetch fails
    }
    
    // Geographic score: Use donation pickup_location and request location (address strings)
    // Extract city/barangay from addresses for proximity matching
    // Priority: Use actual donation pickup_location and request location, not donor/recipient user profile locations
    const donationLocation = donation.pickup_location || donation.donor?.address || donation.donor?.city || ''
    const requestLocation = request.location || request.requester?.address || request.requester?.city || ''
    
    // Calculate proximity based on address matching (city/barangay level)
    // If coordinates are available, use them; otherwise use address-based matching
    let dist = null
    if (request.requester?.latitude && request.requester?.longitude && 
        donation.donor?.latitude && donation.donor?.longitude) {
      // Use coordinates if available
      dist = this.getCachedDistance(
        request.requester.latitude, request.requester.longitude,
        donation.donor.latitude, donation.donor.longitude
      )
    } else {
      // Fallback: Calculate distance based on address matching (city/barangay)
      dist = this.calculateAddressProximity(donationLocation, requestLocation)
    }
    
    const geographic_proximity = this.normalize.normalizeDistance(dist, maxDistance)

    const item_compatibility = this.calculateItemCompatibility(
      request.category, donation.category,
      request.title, donation.title,
      request.quantity_needed, donation.quantity,
      donorPreferences, // Pass donor preferences (donation_types)
      recipientPreferences // Pass recipient preferences (assistance_needs)
    )

    const urgency_alignment = this.normalize.normalizeUrgencyAlignment(
      request.urgency, donation.is_urgent ? 'high' : 'medium'
    )

    const user_reliability = await this.getCachedReliability(donation.donor_id, 'donor')

    const delivery_compatibility = this.calculateDeliveryCompatibility(
      request.delivery_mode, donation.delivery_mode
    )

    return {
      geographic_proximity,
      item_compatibility,
      urgency_alignment,
      user_reliability,
      delivery_compatibility
    }
  }

  async getContextualWeights(request, donation, baseWeights) {
    const base = { ...baseWeights }
    const params = await loadMatchingParameters()
    // Support both new unified group and legacy groups for backward compatibility
    const groupParams = params?.DONOR_RECIPIENT_VOLUNTEER || params?.DONOR_RECIPIENT
    
    const category = (donation?.category || '').toLowerCase()
    const perishableCategories = new Set(['food', 'groceries', 'meals'])

    // Apply contextual adjustments based on parameters if available
    if (perishableCategories.has(category) && groupParams?.perishable_geographic_boost) {
      // Adjust weights for perishable items
      const boost = groupParams.perishable_geographic_boost
      const otherWeights = {
        item_compatibility: base.item_compatibility || 0.25,
        urgency_alignment: base.urgency_alignment || 0.20,
        delivery_compatibility: base.delivery_compatibility || 0.10
      }
      const otherSum = otherWeights.item_compatibility + otherWeights.urgency_alignment + otherWeights.delivery_compatibility
      base.geographic_proximity = boost
      base.item_compatibility = otherWeights.item_compatibility
      base.urgency_alignment = otherWeights.urgency_alignment
      base.delivery_compatibility = otherWeights.delivery_compatibility
      // Normalize remaining weight to user_reliability to ensure sum = 1.0
      base.user_reliability = Math.max(0.05, 1.0 - (boost + otherSum))
      // Normalize all weights to ensure they sum to exactly 1.0
      const weightSum = base.geographic_proximity + base.item_compatibility + base.urgency_alignment + base.user_reliability + base.delivery_compatibility
      if (Math.abs(weightSum - 1.0) > 0.001) {
        const normalizeFactor = 1.0 / weightSum
        base.geographic_proximity *= normalizeFactor
        base.item_compatibility *= normalizeFactor
        base.urgency_alignment *= normalizeFactor
        base.user_reliability *= normalizeFactor
        base.delivery_compatibility *= normalizeFactor
      }
      return base
    }

    if (request?.urgency === 'critical' && groupParams?.critical_urgency_boost) {
      // Adjust weights for critical urgency
      const boost = groupParams.critical_urgency_boost
      const otherWeights = {
        item_compatibility: base.item_compatibility || 0.25,
        geographic_proximity: base.geographic_proximity || 0.30,
        delivery_compatibility: base.delivery_compatibility || 0.10
      }
      const otherSum = otherWeights.item_compatibility + otherWeights.geographic_proximity + otherWeights.delivery_compatibility
      base.urgency_alignment = boost
      base.item_compatibility = otherWeights.item_compatibility
      base.geographic_proximity = otherWeights.geographic_proximity
      base.delivery_compatibility = otherWeights.delivery_compatibility
      // Normalize remaining weight to user_reliability to ensure sum = 1.0
      base.user_reliability = Math.max(0.05, 1.0 - (boost + otherSum))
      // Normalize all weights to ensure they sum to exactly 1.0
      const weightSum = base.geographic_proximity + base.item_compatibility + base.urgency_alignment + base.user_reliability + base.delivery_compatibility
      if (Math.abs(weightSum - 1.0) > 0.001) {
        const normalizeFactor = 1.0 / weightSum
        base.geographic_proximity *= normalizeFactor
        base.item_compatibility *= normalizeFactor
        base.urgency_alignment *= normalizeFactor
        base.user_reliability *= normalizeFactor
        base.delivery_compatibility *= normalizeFactor
      }
      return base
    }

    // Ensure base weights sum to exactly 1.0 (normalize if needed)
    const weightSum = base.geographic_proximity + base.item_compatibility + base.urgency_alignment + base.user_reliability + base.delivery_compatibility
    if (Math.abs(weightSum - 1.0) > 0.001) {
      const normalizeFactor = 1.0 / weightSum
      base.geographic_proximity *= normalizeFactor
      base.item_compatibility *= normalizeFactor
      base.urgency_alignment *= normalizeFactor
      base.user_reliability *= normalizeFactor
      base.delivery_compatibility *= normalizeFactor
    }

    return base
  }

  getCachedDistance(lat1, lon1, lat2, lon2) {
    const key = `${lat1 ?? 'x'}:${lon1 ?? 'x'}:${lat2 ?? 'x'}:${lon2 ?? 'x'}`
    const now = Date.now()
    const cached = this.distanceCache.get(key)
    if (cached && (now - cached.t) < this.distanceTtlMs) {
      return cached.v
    }
    const d = calculateDistance(lat1, lon1, lat2, lon2)
    this.distanceCache.set(key, { v: d, t: now })
    return d
  }

  /**
   * Calculate proximity based on address strings (city/barangay matching)
   * Used when coordinates are not available
   * @param {string} address1 - First address (donation pickup_location)
   * @param {string} address2 - Second address (request location)
   * @returns {number|null} Estimated distance in km or null if cannot determine
   */
  calculateAddressProximity(address1, address2) {
    if (!address1 || !address2) return null
    
    const addr1Lower = address1.toLowerCase()
    const addr2Lower = address2.toLowerCase()
    
    // Extract city from addresses
    const extractCity = (addr) => {
      // Check for Cagayan de Oro City or Opol
      if (addr.includes('cagayan de oro city') || addr.includes('cagayan de oro')) {
        return 'cagayan de oro city'
      }
      if (addr.includes('opol')) {
        return 'opol'
      }
      // Try to extract city name (last part before "Philippines" or province)
      const cityMatch = addr.match(/([^,]+),\s*(?:misamis oriental|philippines)/i)
      if (cityMatch) return cityMatch[1].trim().toLowerCase()
      return null
    }
    
    // Extract barangay from addresses
    const extractBarangay = (addr) => {
      const barangayMatch = addr.match(/barangay\s+([^,\s]+)/i)
      if (barangayMatch) return barangayMatch[1].trim().toLowerCase()
      return null
    }
    
    const city1 = extractCity(addr1Lower)
    const city2 = extractCity(addr2Lower)
    const barangay1 = extractBarangay(addr1Lower)
    const barangay2 = extractBarangay(addr2Lower)
    
    // Same city and barangay = very close (0-2 km)
    if (city1 && city2 && city1 === city2 && barangay1 && barangay2 && barangay1 === barangay2) {
      return 1 // ~1 km
    }
    
    // Same city, different barangay = close (2-10 km)
    if (city1 && city2 && city1 === city2) {
      return 5 // ~5 km average within same city
    }
    
    // Different cities = farther (10-50 km)
    // Cagayan de Oro City and Opol are adjacent, so ~15-20 km
    if (city1 && city2 && city1 !== city2) {
      if ((city1 === 'cagayan de oro city' && city2 === 'opol') ||
          (city1 === 'opol' && city2 === 'cagayan de oro city')) {
        return 18 // ~18 km between CDO and Opol
      }
      return 30 // ~30 km for other different cities
    }
    
    // Cannot determine - return neutral distance
    return 25 // ~25 km (neutral)
  }

  async getCachedReliability(userId, userType) {
    const key = `${userType}:${userId}`
    const now = Date.now()
    const cached = this.reliabilityCache.get(key)
    if (cached && (now - cached.t) < this.reliabilityTtlMs) {
      return cached.v
    }
    const v = await this.calculateUserReliability(userId, userType)
    this.reliabilityCache.set(key, { v, t: now })
    return v
  }
}

// Export the matcher instance and utility functions
export const intelligentMatcher = new IntelligentMatcher()
export { normalizationFunctions, calculateDistance, DEFAULT_MATCHING_WEIGHTS, loadMatchingParameters, getMatchingWeights }
export default IntelligentMatcher
