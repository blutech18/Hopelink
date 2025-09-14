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

// Matching criteria weights (sum should equal 1.0)
const MATCHING_WEIGHTS = {
  DONOR_RECIPIENT: {
    geographic_proximity: 0.25,    // Distance between donor and recipient
    item_compatibility: 0.30,      // How well donation matches request
    urgency_alignment: 0.20,       // Priority matching
    user_reliability: 0.15,        // User ratings and history
    delivery_compatibility: 0.10   // Delivery method preferences
  },
  VOLUNTEER_TASK: {
    geographic_proximity: 0.30,    // Distance from volunteer to pickup/delivery
    availability_match: 0.25,     // Volunteer schedule vs task timing
    skill_compatibility: 0.20,    // Volunteer experience with task type
    user_reliability: 0.15,       // Volunteer ratings and completion rate
    urgency_response: 0.10        // Volunteer's ability to handle urgent tasks
  },
  DONOR_VOLUNTEER: {
    geographic_proximity: 0.25,
    reliability_match: 0.30,       // Volunteer reliability for donor's items
    delivery_preference: 0.20,     // Volunteer delivery capabilities
    communication_style: 0.15,    // User interaction preferences
    timing_flexibility: 0.10      // Schedule compatibility
  }
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
    if (distance <= 0) return 1.0
    if (distance >= maxDistance) return 0.0
    return Math.max(0, 1 - (distance / maxDistance))
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
    return Math.max(0, 1 - (difference / 3))
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
    return Math.min(1.0, reliabilityScore)
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
    return Math.max(0, 1 - (timeDiff / maxReasonableDelay))
  },

  /**
   * Normalize quantity compatibility
   * @param {number} available - Available quantity
   * @param {number} needed - Needed quantity
   * @returns {number} Quantity match score (0-1)
   */
  normalizeQuantityMatch(available, needed) {
    if (available >= needed) return 1.0
    return available / needed
  }
}

/**
 * Calculate geographic distance between two points
 * @param {number} lat1 - Latitude of first point
 * @param {number} lon1 - Longitude of first point
 * @param {number} lat2 - Latitude of second point
 * @param {number} lon2 - Longitude of second point
 * @returns {number} Distance in kilometers
 */
function calculateDistance(lat1, lon1, lat2, lon2) {
  if (!lat1 || !lon1 || !lat2 || !lon2) return 50 // Default high distance if coordinates missing
  
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
    this.weights = MATCHING_WEIGHTS
    this.normalize = normalizationFunctions
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

      const matches = []
      const weights = this.weights.DONOR_RECIPIENT

      for (const donation of availableDonations) {
        // Calculate individual criterion scores
        const scores = {
          geographic_proximity: this.calculateGeographicScore(
            request.requester?.latitude, request.requester?.longitude,
            donation.donor?.latitude, donation.donor?.longitude
          ),
          item_compatibility: this.calculateItemCompatibility(
            request.category, donation.category,
            request.title, donation.title,
            request.quantity_needed, donation.quantity
          ),
          urgency_alignment: this.normalize.normalizeUrgencyAlignment(
            request.urgency, donation.is_urgent ? 'high' : 'medium'
          ),
          user_reliability: await this.calculateUserReliability(donation.donor_id, 'donor'),
          delivery_compatibility: this.calculateDeliveryCompatibility(
            request.delivery_mode, donation.delivery_mode
          )
        }

        // Calculate weighted sum
        const totalScore = Object.keys(weights).reduce((sum, criterion) => {
          return sum + (scores[criterion] * weights[criterion])
        }, 0)

        matches.push({
          donation,
          score: totalScore,
          criteriaScores: scores,
          matchReason: this.generateMatchReason(scores, weights)
        })
      }

      // Sort by score and return top matches
      return matches
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

      const matches = []
      const weights = this.weights.VOLUNTEER_TASK

      for (const volunteer of availableVolunteers) {
        const scores = {
          geographic_proximity: this.calculateVolunteerProximity(task, volunteer),
          availability_match: await this.calculateAvailabilityMatch(task, volunteer),
          skill_compatibility: await this.calculateSkillCompatibility(task, volunteer),
          user_reliability: await this.calculateUserReliability(volunteer.id, 'volunteer'),
          urgency_response: this.calculateUrgencyResponse(task, volunteer)
        }

        const totalScore = Object.keys(weights).reduce((sum, criterion) => {
          return sum + (scores[criterion] * weights[criterion])
        }, 0)

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

      for (const request of requests) {
        // Find best donor matches for this request
        const donorMatches = await this.matchDonorsToRequest(request, donations, 3)
        
        for (const donorMatch of donorMatches) {
          // For each donor match, find best volunteer if volunteer delivery is needed
          if (request.delivery_mode === 'volunteer' || donorMatch.donation.delivery_mode === 'volunteer') {
            const task = {
              type: 'delivery',
              request,
              donation: donorMatch.donation,
              urgency: request.urgency,
              pickup_location: donorMatch.donation.pickup_location,
              delivery_location: request.location
            }

            const volunteerMatches = await this.matchVolunteersToTask(task, volunteers, 2)
            
            for (const volunteerMatch of volunteerMatches) {
              const combinedScore = (donorMatch.score * 0.6) + (volunteerMatch.score * 0.4)
              
              optimalMatches.push({
                request,
                donation: donorMatch.donation,
                volunteer: volunteerMatch.volunteer,
                combinedScore,
                donorScore: donorMatch.score,
                volunteerScore: volunteerMatch.score,
                matchType: 'three_way',
                estimatedDeliveryTime: this.estimateDeliveryTime(task, volunteerMatch.volunteer)
              })
            }
          } else {
            // Direct delivery or pickup - no volunteer needed
            optimalMatches.push({
              request,
              donation: donorMatch.donation,
              volunteer: null,
              combinedScore: donorMatch.score,
              donorScore: donorMatch.score,
              volunteerScore: null,
              matchType: 'direct',
              estimatedDeliveryTime: null
            })
          }
        }
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

  calculateItemCompatibility(category1, category2, title1, title2, needed, available) {
    const categoryScore = this.normalize.normalizeCategoryMatch(category1, category2)
    const quantityScore = this.normalize.normalizeQuantityMatch(available, needed)
    
    // Simple text similarity for titles
    const titleSimilarity = this.calculateTextSimilarity(title1, title2)
    
    return (categoryScore * 0.5) + (quantityScore * 0.3) + (titleSimilarity * 0.2)
  }

  calculateTextSimilarity(text1, text2) {
    if (!text1 || !text2) return 0
    
    const words1 = text1.toLowerCase().split(/\s+/)
    const words2 = text2.toLowerCase().split(/\s+/)
    
    const commonWords = words1.filter(word => words2.includes(word))
    const totalWords = new Set([...words1, ...words2]).size
    
    return commonWords.length / totalWords
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
    const pickupDistance = calculateDistance(
      volunteer.latitude, volunteer.longitude,
      task.pickup_latitude, task.pickup_longitude
    )
    const deliveryDistance = calculateDistance(
      volunteer.latitude, volunteer.longitude,
      task.delivery_latitude, task.delivery_longitude
    )
    
    const averageDistance = (pickupDistance + deliveryDistance) / 2
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
    // Score based on volunteer's ability to handle urgent tasks
    const urgencyLevel = task.urgency || 'medium'
    const urgencyScores = { 'low': 0.8, 'medium': 0.9, 'high': 1.0, 'critical': 1.0 }
    
    // This could be enhanced with volunteer preferences and past performance
    return urgencyScores[urgencyLevel] || 0.8
  }

  async getAvailableVolunteers() {
    // Get volunteers who are active and not overloaded
    try {
      const { data: volunteers, error } = await supabase
        .from('users')
        .select('*')
        .eq('role', 'volunteer')
        .eq('is_active', true)
      
      if (error) throw error
      
      // Filter out overloaded volunteers
      const availableVolunteers = []
      for (const volunteer of volunteers || []) {
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
    // Find the top contributing factors
    const weightedScores = Object.entries(scores).map(([criterion, score]) => ({
      criterion,
      score,
      weight: weights[criterion],
      contribution: score * weights[criterion]
    }))
    
    const topFactors = weightedScores
      .sort((a, b) => b.contribution - a.contribution)
      .slice(0, 2)
    
    const reasons = topFactors.map(factor => {
      const criterionNames = {
        geographic_proximity: 'close location',
        item_compatibility: 'perfect item match',
        urgency_alignment: 'matching urgency',
        user_reliability: 'high reliability',
        delivery_compatibility: 'compatible delivery',
        availability_match: 'good availability',
        skill_compatibility: 'relevant experience'
      }
      
      return criterionNames[factor.criterion] || factor.criterion
    })
    
    return `Best match due to ${reasons.join(' and ')}`
  }

  estimateDeliveryTime(task, volunteer) {
    // Estimate delivery time based on distance and volunteer efficiency
    const distance = calculateDistance(
      task.pickup_latitude, task.pickup_longitude,
      task.delivery_latitude, task.delivery_longitude
    )
    
    // Base time: 30 minutes + 2 minutes per km + volunteer efficiency factor
    const baseTime = 30 + (distance * 2)
    const volunteerEfficiency = 1.0 // Could be based on volunteer's past performance
    
    return Math.round(baseTime / volunteerEfficiency)
  }
}

// Export the matcher instance and utility functions
export const intelligentMatcher = new IntelligentMatcher()
export { normalizationFunctions, calculateDistance, MATCHING_WEIGHTS }
export default IntelligentMatcher
