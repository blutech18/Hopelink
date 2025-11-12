import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { 
  Search, 
  Filter, 
  Gift, 
  MapPin, 
  Calendar, 
  Tag, 
  Heart,
  AlertCircle,
  Star,
  Clock,
  User,
  Image as ImageIcon,
  CheckCircle,
  Package,
  ArrowRight,
  Eye,
  X,
  Phone,
  Mail,
  Flag,
  Camera,
  Building2,
  Globe,
  Users,
  MessageSquare,
  Truck
} from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import { useToast } from '../../contexts/ToastContext'
import { ListPageSkeleton } from '../../components/ui/Skeleton'
import LoadingSpinner from '../../components/ui/LoadingSpinner'
import { IDVerificationBadge } from '../../components/ui/VerificationBadge'
import ReportUserModal from '../../components/ui/ReportUserModal'
import { db } from '../../lib/supabase'
import { intelligentMatcher } from '../../lib/matchingAlgorithm'

const BrowseDonationsPage = () => {
  const { user, profile } = useAuth()
  const { success, error } = useToast()
  const navigate = useNavigate()
  const [donations, setDonations] = useState([])
  const [donationsWithScores, setDonationsWithScores] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('')
  const [selectedCondition, setSelectedCondition] = useState('')
  const [showUrgentOnly, setShowUrgentOnly] = useState(false)
  const [claimingId, setClaimingId] = useState(null)
  const [requestedDonations, setRequestedDonations] = useState(new Set())
  const [selectedDonation, setSelectedDonation] = useState(null)
  const [showDetailsModal, setShowDetailsModal] = useState(false)
  const [showDonorProfileModal, setShowDonorProfileModal] = useState(false)
  const [showDonorProfileImageModal, setShowDonorProfileImageModal] = useState(false)
  const [selectedDonor, setSelectedDonor] = useState(null)
  const [loadingDonorProfile, setLoadingDonorProfile] = useState(false)
  const [showReportModal, setShowReportModal] = useState(false)

  // Helper function to calculate age from birthdate
  const calculateAge = (birthDate) => {
    if (!birthDate) return null
    const today = new Date()
    const birth = new Date(birthDate)
    let age = today.getFullYear() - birth.getFullYear()
    const monthDiff = today.getMonth() - birth.getMonth()
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--
    }
    return age
  }

  const categories = [
    'Food',
    'Clothing',
    'Medical Supplies',
    'Educational Materials',
    'Household Items',
    'Electronics',
    'Toys & Games',
    'Books',
    'Furniture',
    'Other'
  ]

  const conditions = [
    { value: 'new', label: 'New' },
    { value: 'like_new', label: 'Like New' },
    { value: 'good', label: 'Good' },
    { value: 'fair', label: 'Fair' }
  ]

  const loadDonations = useCallback(async () => {
    try {
      setLoading(true)
      // Get available donations with reduced limit for faster initial load
      const availableDonations = await db.getAvailableDonations({ limit: 30 })
      setDonations(availableDonations || [])
      
      // Load requested donations from localStorage
      const storedRequests = localStorage.getItem(`requestedDonations_${user?.id}`)
      if (storedRequests) {
        const storedIds = new Set(JSON.parse(storedRequests))
        const currentDonationIds = new Set(availableDonations.map(d => d.id))
        const validRequests = new Set([...storedIds].filter(id => currentDonationIds.has(id)))
        
        setRequestedDonations(validRequests)
        
        if (validRequests.size !== storedIds.size) {
          localStorage.setItem(`requestedDonations_${user.id}`, JSON.stringify([...validRequests]))
        }
      }
      
      // Load ALL open requests for matching (not just recipient's own)
      // This allows recipients to see how donations match against all available requests
      let allOpenRequests = []
      let recipientUser = null
      
      if (user?.id) {
        // Get recipient's user profile with location data
        recipientUser = await db.getProfile(user.id)
        
        // Get ALL open requests (not just recipient's own) for comprehensive matching
        allOpenRequests = await db.getRequests({ status: 'open', limit: 10000 })
      }
      
      // Progressive loading: Show donations immediately, then calculate matching scores in batches
      setDonationsWithScores(availableDonations.map(donation => ({
        ...donation,
        matchingScore: 0,
        bestMatchingRequest: null,
        matchReason: 'Calculating match...'
      })))
      
      // If no requests available, show donations without scores
      if (!allOpenRequests || allOpenRequests.length === 0) {
        setDonationsWithScores(availableDonations.map(donation => ({
          ...donation,
          matchingScore: 0,
          bestMatchingRequest: null,
          matchReason: 'No open requests to match'
        })))
        return
      }
      
      // Check if auto-matching is enabled
      let autoMatchEnabled = false
      let autoClaimThreshold = 0.8 // Default 80%
      try {
        const matchingParams = await db.getMatchingParameters()
        const params = matchingParams?.DONOR_RECIPIENT_VOLUNTEER || matchingParams?.DONOR_RECIPIENT
        if (params) {
          autoMatchEnabled = params.auto_match_enabled || false
          autoClaimThreshold = params.auto_claim_threshold || 0.8
        }
      } catch (err) {
        console.warn('Could not load matching parameters for auto-claim:', err)
      }
      
      // Calculate matching scores in smaller batches for better performance
      const batchSize = 5
      const donationsToProcess = availableDonations || []
      
      // Process donations in batches to avoid blocking
      for (let i = 0; i < donationsToProcess.length; i += batchSize) {
        const batch = donationsToProcess.slice(i, i + batchSize)
        
        // Process batch in parallel
        const batchResults = await Promise.all(
          batch.map(async (donation) => {
            try {
              // Use the matching algorithm to find best matches from ALL open requests
              const matches = await intelligentMatcher.matchDonationToRequests(donation, allOpenRequests, recipientUser, 1)
              
              if (matches && matches.length > 0 && matches[0].score > 0) {
                const bestMatch = matches[0]
                
                // Auto-claim logic: If auto-match is enabled and score >= 80% (0.8) and request belongs to current user
                if (autoMatchEnabled && bestMatch.score >= autoClaimThreshold && bestMatch.request?.requester_id === user?.id) {
                  try {
                    // Check if donation is still available and request is still open
                    if (donation.status === 'available' && bestMatch.request.status === 'open') {
                      // Check if already claimed
                      const hasExistingClaim = donation.claims && Array.isArray(donation.claims) && 
                        donation.claims.some(claim => claim.recipient_id === user.id && claim.status === 'claimed')
                      
                      if (!hasExistingClaim) {
                        await db.claimDonation(donation.id, user.id)
                        console.log(`Auto-claimed: Donation "${donation.title}" for request "${bestMatch.request.title}" (score: ${(bestMatch.score * 100).toFixed(1)}%)`)
                      }
                    }
                  } catch (autoClaimErr) {
                    console.warn(`Auto-claim failed for donation ${donation.id}:`, autoClaimErr)
                    // Continue with normal flow even if auto-claim fails
                  }
                }
                
                return {
                  ...donation,
                  matchingScore: bestMatch.score,
                  bestMatchingRequest: bestMatch.request,
                  matchReason: bestMatch.matchReason || 'Good match based on multiple criteria'
                }
              } else {
                return {
                  ...donation,
                  matchingScore: 0,
                  bestMatchingRequest: null,
                  matchReason: 'No compatible requests found'
                }
              }
            } catch (err) {
              console.error(`Error matching donation ${donation.id}:`, err)
              return {
                ...donation,
                matchingScore: 0,
                bestMatchingRequest: null,
                matchReason: 'Unable to calculate match score'
              }
            }
          })
        )
        
        // Update state progressively with batch results
        setDonationsWithScores(prev => {
          const updated = [...(prev || [])]
          batchResults.forEach((result, batchIdx) => {
            const targetIndex = i + batchIdx
            if (targetIndex < updated.length) {
              updated[targetIndex] = result
            }
          })
          return updated
        })
      }
      
      // Refresh data after auto-claiming to show updated statuses
      if (autoMatchEnabled) {
        // Small delay to allow database updates to complete
        setTimeout(async () => {
          try {
            const availableDonations = await db.getAvailableDonations({ limit: 30 })
            setDonations(availableDonations || [])
          } catch (refreshErr) {
            console.warn('Error refreshing donations after auto-claim:', refreshErr)
          }
        }, 1000)
      }
    } catch (err) {
      console.error('Error loading donations:', err)
      error('Failed to load donations. Please try again.')
    } finally {
      setLoading(false)
    }
  }, [error, user?.id])

  useEffect(() => {
    loadDonations()
  }, [loadDonations])

  const handleRequestDonation = async (donation) => {
    if (!profile) {
      error('Please complete your profile first')
      return
    }

    // Validate donor information
    if (!donation.donor || !donation.donor.id) {
      error('Unable to find donor information. Please try again.')
      console.error('Missing donor information:', donation)
      return
    }

    try {
      setClaimingId(donation.id)
      
      // Create a donation request notification to the donor
      await db.createNotification({
        user_id: donation.donor.id,
        type: 'donation_request',
        title: 'Donation Request',
        message: `${profile.name} is requesting your donation: ${donation.title}`,
        data: {
          donation_id: donation.id,
          requester_id: user.id,
          requester_name: profile.name,
          requester_email: profile.email,
          requester_phone: profile.phone_number,
          requester_address: profile.address,
          delivery_mode: donation.delivery_mode
        }
      })
      
      success('Request sent successfully! The donor will be notified and can approve your request.')
      
      // Mark this donation as requested
      setRequestedDonations(prev => {
        const newRequested = new Set([...prev, donation.id])
        // Save to localStorage for persistence
        localStorage.setItem(`requestedDonations_${user.id}`, JSON.stringify([...newRequested]))
        return newRequested
      })
    } catch (err) {
      console.error('Error requesting donation:', err)
      error(err.message || 'Failed to send request. Please try again.')
    } finally {
      setClaimingId(null)
    }
  }

  // Memoize filtered donations to avoid recalculating on every render
  // Helper function to get score color
  const getScoreColor = (score) => {
    if (score >= 0.8) return 'text-green-400 bg-green-900/30 border-green-500/50'
    if (score >= 0.6) return 'text-blue-400 bg-blue-900/30 border-blue-500/50'
    if (score >= 0.4) return 'text-yellow-400 bg-yellow-900/30 border-yellow-500/50'
    return 'text-orange-400 bg-orange-900/30 border-orange-500/50'
  }

  const filteredDonations = useMemo(() => {
    const donationsToFilter = donationsWithScores.length > 0 ? donationsWithScores : donations
    
    return donationsToFilter.filter(donation => {
      // Exclude donations that are destined for organization only (CFC-GK)
      if (donation.donation_destination === 'organization') {
        return false
      }
      
      const matchesSearch = !searchTerm || 
        donation.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        donation.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        donation.tags?.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()))
      
      const matchesCategory = !selectedCategory || donation.category === selectedCategory
      const matchesCondition = !selectedCondition || donation.condition === selectedCondition
      const matchesUrgent = !showUrgentOnly || donation.is_urgent

      return matchesSearch && matchesCategory && matchesCondition && matchesUrgent
    })
    .sort((a, b) => {
      // Primary sort: by matching score (highest first)
      if (a.matchingScore !== undefined && b.matchingScore !== undefined) {
        if (Math.abs(a.matchingScore - b.matchingScore) > 0.01) {
          return b.matchingScore - a.matchingScore
        }
      }
      // Secondary sort: by urgency
      if (a.is_urgent !== b.is_urgent) {
        return b.is_urgent ? 1 : -1
      }
      // Tertiary sort: by date
      return new Date(b.created_at) - new Date(a.created_at)
    })
  }, [donations, donationsWithScores, searchTerm, selectedCategory, selectedCondition, showUrgentOnly])

  const getConditionColor = (condition) => {
    switch (condition) {
      case 'new': return 'text-green-400 bg-green-900/20'
      case 'like_new': return 'text-yellow-400 bg-yellow-900/20'
      case 'good': return 'text-yellow-400 bg-yellow-900/20'
      case 'fair': return 'text-orange-400 bg-orange-900/20'
      default: return 'text-gray-400 bg-gray-900/20'
    }
  }

  // Helper function to check if a value is a placeholder or invalid
  const isValidLocationValue = (value) => {
    if (!value || typeof value !== 'string') return false
    const trimmed = value.trim().toLowerCase()
    // Filter out placeholder values and invalid entries
    const invalidValues = [
      'to be completed',
      'not provided',
      'n/a',
      'na',
      'null',
      'undefined',
      '',
      'tbd',
      'to be determined'
    ]
    return trimmed !== '' && !invalidValues.includes(trimmed)
  }

  // Helper function to format location with priority: specific details first
  // Note: Excludes address_house and address_subdivision for security reasons
  const formatLocation = (donation) => {
    const donor = donation?.donor
    const locationParts = []
    
    // Priority 1: Street (without house/unit number for security)
    if (isValidLocationValue(donor?.address_street)) {
      locationParts.push(donor.address_street.trim())
    }
    
    // Priority 2: Barangay (very important for Philippines)
    if (isValidLocationValue(donor?.address_barangay)) {
      locationParts.push(donor.address_barangay.trim())
    }
    
    // Priority 3: Landmark (if no street address)
    if (isValidLocationValue(donor?.address_landmark) && !isValidLocationValue(donor?.address_street)) {
      locationParts.push(`Near ${donor.address_landmark.trim()}`)
    }
    
    // Priority 4: Full address (if it's more specific than just city/province)
    if (isValidLocationValue(donor?.address) && !locationParts.length) {
      const addressStr = donor.address.trim()
      // Check if address is generic (like just "Cagayan de Oro City" or "Philippines, Cagayan de Oro City")
      const isGenericAddress = /^(Philippines|Philippines,?\s*[A-Za-z\s]+(?: City)?|[A-Za-z\s]+ City)$/i.test(addressStr)
      // Also check if it contains "To be completed"
      if (!isGenericAddress && !addressStr.toLowerCase().includes('to be completed')) {
        locationParts.push(addressStr)
      }
    }
    
    // Priority 5: City
    if (isValidLocationValue(donor?.city)) {
      locationParts.push(donor.city.trim())
    }
    
    // Priority 6: Province
    if (isValidLocationValue(donor?.province)) {
      locationParts.push(donor.province.trim())
    }
    
    // If we have specific details, return them (don't include generic location)
    if (locationParts.length > 0) {
      return locationParts.join(', ')
    }
    
    // Fallback: Use donation.pickup_location only if no specific details available
    if (donation?.pickup_location) {
      const locationStr = donation.pickup_location.trim()
      // Filter out placeholder values from pickup_location too
      if (isValidLocationValue(locationStr)) {
        // Check if location is just generic (like "Philippines, Cagayan de Oro City" or similar patterns)
        const hasGenericPattern = /^(Philippines|Philippines,?\s*[A-Za-z\s]+(?: City)?)$/i.test(locationStr)
        
        if (!hasGenericPattern) {
          // Location has specific details, use it
          return locationStr
        }
        // If it's generic, still show it but it will be the same for all
        return locationStr
      }
    }
    
    // Last resort: Return a message
    return 'Location details not specified'
  }

  const getDeliveryModeColor = (mode) => {
    switch (mode) {
      case 'pickup': return 'text-yellow-400 bg-yellow-900/20'
      case 'volunteer': return 'text-green-400 bg-green-900/20'
      case 'direct': return 'text-purple-400 bg-purple-900/20'
      default: return 'text-gray-400 bg-gray-900/20'
    }
  }

  const getDeliveryModeLabel = (mode) => {
    switch (mode) {
      case 'pickup': return 'Self Pickup'
      case 'volunteer': return 'Volunteer Delivery'
      case 'direct': return 'Direct Delivery'
      case 'donor_delivery': return 'Donor Delivery'
      case 'organization_pickup': return 'Organization Pickup'
      default: return mode ? mode.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase()) : 'Pickup'
    }
  }

  const getDeliveryInstructions = (mode) => {
    switch (mode) {
      case 'pickup': return 'You will need to pick up this donation from the donor.'
      case 'volunteer': return 'A volunteer will coordinate the delivery between you and the donor.'
      case 'direct': return 'The donor will deliver this directly to you.'
      default: return ''
    }
  }

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  const handleViewDetails = (donation) => {
    setSelectedDonation(donation)
    setShowDetailsModal(true)
  }

  const handleViewDonorProfile = async (donor) => {
    try {
      setShowDonorProfileModal(true)
      setLoadingDonorProfile(true)
      
      // Fetch detailed profile
      if (donor?.id) {
        const detailedProfile = await db.getProfile(donor.id)
        setSelectedDonor(detailedProfile)
      } else {
        setSelectedDonor(donor)
      }
    } catch (err) {
      console.error('Error fetching donor profile:', err)
      error('Failed to load profile information')
    } finally {
      setLoadingDonorProfile(false)
    }
  }

  if (loading) {
    return <ListPageSkeleton />
  }

  return (
    <div className="min-h-screen py-4 sm:py-6 lg:py-8" style={{backgroundColor: '#00237d'}}>
      <div className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6 sm:mb-8"
        >
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between mb-4 gap-3">
            <div className="flex-1">
              <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-white mb-2">Browse Donations</h1>
              <p className="text-xs sm:text-sm text-yellow-300">Find donations that match your needs</p>
            </div>
            <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
              {/* Donation Count Badge */}
              <div className="flex items-center gap-2 px-3 sm:px-4 py-1.5 sm:py-2 bg-gradient-to-r from-yellow-500/20 to-yellow-600/20 border-2 border-yellow-500/40 rounded-full shadow-lg">
                <Gift className="h-4 w-4 sm:h-5 sm:w-5 text-yellow-400 fill-yellow-400 animate-pulse" />
                <div className="flex items-center gap-1.5">
                  <span className="text-lg sm:text-xl font-bold text-white">{filteredDonations.length}</span>
                  <span className="text-xs sm:text-sm font-medium text-yellow-300">Donation{filteredDonations.length !== 1 ? 's' : ''}</span>
                </div>
              </div>
              
              {/* My Approved Requests Button removed per request */}
            </div>
          </div>
          
          {/* Mobile My Requests Button removed per request */}
        </motion.div>

        {/* Filters */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="card p-4 sm:p-6 mb-6 sm:mb-8"
        >
          <div className="flex flex-col sm:flex-row flex-wrap gap-3 sm:gap-4">
            {/* Search */}
            <div className="relative flex-1 min-w-full sm:min-w-[200px]">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 sm:h-5 sm:w-5 text-yellow-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 sm:pl-10 pr-4 py-2 sm:py-3 text-sm sm:text-base bg-navy-800 border-2 border-navy-700 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-yellow-500 focus:ring-2 focus:ring-yellow-500/20 transition-all duration-200"
                placeholder="Search donations..."
              />
            </div>

            {/* Category */}
            <div className="relative w-full sm:w-auto sm:min-w-[180px]">
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="appearance-none w-full px-5 py-3 pr-10 bg-navy-800 border-2 border-navy-700 rounded-lg text-white font-medium focus:outline-none focus:border-yellow-500 focus:ring-2 focus:ring-yellow-500/20 transition-all duration-200 cursor-pointer hover:border-yellow-600"
              >
                <option value="">All Categories</option>
                {categories.map(category => (
                  <option key={category} value={category}>{category}</option>
                ))}
              </select>
              <Package className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-yellow-400 pointer-events-none" />
            </div>

            {/* Condition */}
            <div className="relative w-full sm:w-auto sm:min-w-[180px]">
              <select
                value={selectedCondition}
                onChange={(e) => setSelectedCondition(e.target.value)}
                className="appearance-none w-full px-5 py-3 pr-10 bg-navy-800 border-2 border-navy-700 rounded-lg text-white font-medium focus:outline-none focus:border-yellow-500 focus:ring-2 focus:ring-yellow-500/20 transition-all duration-200 cursor-pointer hover:border-yellow-600"
              >
                <option value="">All Conditions</option>
                {conditions.map(condition => (
                  <option key={condition.value} value={condition.value}>{condition.label}</option>
                ))}
              </select>
              <CheckCircle className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-yellow-400 pointer-events-none" />
            </div>

            {/* Urgent Filter */}
            <button
              onClick={() => setShowUrgentOnly(!showUrgentOnly)}
              className={`w-full sm:w-auto px-4 sm:px-5 py-2.5 sm:py-3 rounded-lg text-sm sm:text-base font-semibold transition-all duration-200 flex items-center justify-center gap-2 whitespace-nowrap border-2 active:scale-95 ${
                showUrgentOnly
                  ? 'bg-red-600 hover:bg-red-700 text-white border-red-600 shadow-md hover:shadow-lg'
                  : 'bg-navy-800 hover:bg-navy-700 text-white border-navy-700 hover:border-yellow-600/50'
              }`}
            >
              <AlertCircle className="h-4 w-4" />
              <span>Urgent Only</span>
            </button>
            
            {/* Clear Filters Button */}
            <button
              onClick={() => {
                setSearchTerm('')
                setSelectedCategory('')
                setSelectedCondition('')
                setShowUrgentOnly(false)
              }}
              disabled={!searchTerm && !selectedCategory && !selectedCondition && !showUrgentOnly}
              className={`w-full sm:w-auto px-4 sm:px-5 py-2.5 sm:py-3 rounded-lg text-sm sm:text-base font-semibold transition-all duration-200 flex items-center justify-center gap-2 whitespace-nowrap border-2 ${
                searchTerm || selectedCategory || selectedCondition || showUrgentOnly
                  ? 'bg-gradient-to-r from-yellow-500 to-yellow-600 hover:from-yellow-600 hover:to-yellow-700 text-white border-yellow-500 hover:border-yellow-600 shadow-md hover:shadow-lg active:scale-95'
                  : 'bg-navy-800 text-gray-500 border-navy-700 cursor-not-allowed opacity-50'
              }`}
            >
              <X className="h-4 w-4" />
              Clear Filters
            </button>
          </div>
        </motion.div>

        {/* Donations Grid */}
        {filteredDonations.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-8 sm:py-12"
          >
            <Gift className="h-12 w-12 sm:h-16 sm:w-16 text-yellow-400 mx-auto mb-3 sm:mb-4" />
            <h3 className="text-lg sm:text-xl font-semibold text-white mb-2">No donations found</h3>
            <p className="text-sm sm:text-base text-yellow-300 px-4">
              {searchTerm || selectedCategory || selectedCondition || showUrgentOnly
                ? 'Try adjusting your filters to see more results.'
                : 'There are no donations available at the moment.'}
            </p>
          </motion.div>
        ) : (
          <div className="space-y-4 sm:space-y-6">
            <AnimatePresence>
              {filteredDonations.map((donation, index) => (
                <motion.div
                  key={donation.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ delay: index * 0.05 }}
                  className="relative"
                >
                  {/* Compatibility Score Extension - Connected to Card */}
                  {donation.matchingScore !== undefined && donation.matchingScore > 0.01 && (
                    <div
                      className="px-4 py-3 bg-gradient-to-r from-skyblue-900/50 via-skyblue-800/45 to-skyblue-900/50 border-l-2 border-t-2 border-r-2 border-b-0 border-yellow-500 rounded-t-lg mb-0 relative z-10"
                      style={{
                        borderTopLeftRadius: '0.5rem',
                        borderTopRightRadius: '0.5rem',
                        borderBottomLeftRadius: '0',
                        borderBottomRightRadius: '0',
                        marginBottom: '0',
                        borderLeftColor: '#cdd74a'
                      }}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="flex items-center justify-between gap-4">
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          {donation.bestMatchingRequest && (
                            <>
                              <span className="text-xs font-semibold text-skyblue-200 uppercase tracking-wide whitespace-nowrap">Matches Request:</span>
                              <span className="text-xs text-white font-medium truncate">{donation.bestMatchingRequest.title}</span>
                            </>
                          )}
                          {donation.matchReason && (
                            <>
                              {donation.bestMatchingRequest && <span className="text-xs text-gray-500">•</span>}
                              <span className="text-xs text-white font-medium truncate">{donation.matchReason}</span>
                            </>
                          )}
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <span className="text-xs font-semibold text-skyblue-200 uppercase tracking-wide">Match Score:</span>
                          <div className={`px-2.5 py-0.5 rounded text-xs font-bold border ${getScoreColor(donation.matchingScore)}`}>
                            {Math.round(donation.matchingScore * 100)}%
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Card */}
                  <div
                    className={`card hover:shadow-xl hover:border-yellow-500/30 transition-all duration-300 overflow-hidden border-2 border-navy-700 cursor-pointer group active:scale-[0.99] ${donation.matchingScore !== undefined && donation.matchingScore > 0.01 ? 'rounded-t-none -mt-[1px]' : ''}`}
                    style={{
                      borderTopLeftRadius: donation.matchingScore !== undefined && donation.matchingScore > 0.01 ? '0' : undefined,
                      borderTopRightRadius: donation.matchingScore !== undefined && donation.matchingScore > 0.01 ? '0' : undefined,
                      marginTop: donation.matchingScore !== undefined && donation.matchingScore > 0.01 ? '-1px' : undefined
                    }}
                    onClick={() => handleViewDetails(donation)}
                  >
                  <div className="flex flex-col sm:flex-row gap-4 p-4">
                    {/* Sample Image or Placeholder */}
                    <div className="flex-shrink-0">
                      {donation.images && donation.images.length > 0 ? (
                        <div className="relative w-full sm:w-56 lg:w-64 h-48 sm:h-56 lg:h-64 rounded-lg overflow-hidden border-2 border-yellow-500/30">
                          <img 
                            src={donation.images[0]} 
                            alt={donation.title}
                            className="w-full h-full object-cover"
                          />
                        </div>
                      ) : (
                        <div className="w-full sm:w-56 lg:w-64 h-48 sm:h-56 lg:h-64 rounded-lg bg-gradient-to-br from-navy-800 to-navy-900 flex flex-col items-center justify-center border-2 border-navy-600">
                          <Gift className="h-12 w-12 text-yellow-400 mb-2" />
                          <span className="text-xs text-gray-400 font-medium uppercase tracking-wide">No Image</span>
                        </div>
                      )}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      {/* Header with Title and Badges */}
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-2">
                            <Heart className="h-5 w-5 flex-shrink-0 text-yellow-400" />
                            <h3 className="text-base sm:text-lg font-bold text-white truncate">
                              {donation.title}
                            </h3>
                          </div>
                          
                          {/* Badges Row */}
                          <div className="flex flex-wrap gap-1.5 mb-3">
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-yellow-900/30 text-yellow-300 border border-yellow-500/30">
                              {donation.category}
                            </span>
                            <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold border ${getConditionColor(donation.condition)}`}>
                              {donation.condition?.replace('_', ' ').split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ') || 'Unknown'}
                            </span>
                            {donation.is_urgent && (
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold text-red-400 bg-red-500/20 border border-red-500/30">
                                ⚡ Urgent
                              </span>
                            )}
                          </div>
                        </div>
                        
                        {/* Action Buttons */}
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              handleViewDetails(donation)
                            }}
                            className="px-3 py-2 bg-navy-700 hover:bg-navy-600 text-yellow-300 hover:text-white text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5 border border-navy-600 hover:border-yellow-500/50 shadow-md hover:shadow-lg active:scale-95"
                          >
                            <Eye className="h-3.5 w-3.5" />
                            <span>View</span>
                          </button>
                          {requestedDonations.has(donation.id) ? (
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                              }}
                              disabled
                              className="px-3 py-2 bg-gray-700 text-gray-400 text-xs font-semibold rounded-lg cursor-not-allowed flex items-center gap-1.5"
                            >
                              <CheckCircle className="h-3.5 w-3.5" />
                              <span>Requested</span>
                            </button>
                          ) : (
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                handleRequestDonation(donation)
                              }}
                              className="px-3 py-2 bg-gradient-to-r from-yellow-500 to-yellow-600 hover:from-yellow-600 hover:to-yellow-700 text-white text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5 shadow-md hover:shadow-lg active:scale-95"
                            >
                              <Heart className="h-3.5 w-3.5" />
                              <span>Request</span>
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Description */}
                      <p className="text-gray-300 text-sm mb-3 line-clamp-1">
                        {donation.description || 'No description provided'}
                      </p>

                      {/* Compact Info Grid */}
                      <div className="grid grid-cols-2 gap-x-4 gap-y-1 mb-3 text-xs">
                        <div className="flex items-center gap-1.5">
                          <Package className="h-3.5 w-3.5 text-yellow-400 flex-shrink-0" />
                          <span className="text-yellow-400 font-medium">Quantity:</span>
                          <span className="text-white font-semibold">{donation.quantity}</span>
                        </div>
                        
                        <div className="flex items-center gap-1.5">
                          <User className="h-3.5 w-3.5 text-yellow-400 flex-shrink-0" />
                          <span className="text-yellow-400 font-medium">By:</span>
                          <span className="text-white">{donation.donor?.name || 'Anonymous'}</span>
                        </div>
                        
                        <div className="flex items-center gap-1.5">
                          <Calendar className="h-3.5 w-3.5 text-yellow-400 flex-shrink-0" />
                          <span className="text-yellow-400 font-medium">Posted:</span>
                          <span className="text-gray-300">{formatDate(donation.created_at)}</span>
                        </div>

                        {donation.expiry_date && (
                          <div className="flex items-center gap-1.5">
                            <Clock className="h-3.5 w-3.5 text-red-400 flex-shrink-0" />
                            <span className="text-red-400 font-medium">Expires:</span>
                            <span className="text-red-300 font-semibold">{formatDate(donation.expiry_date)}</span>
                          </div>
                        )}
                        
                        {(donation.pickup_location || donation.donor) && (
                          <div className="flex items-center gap-1.5 col-span-2">
                            <MapPin className="h-3.5 w-3.5 text-yellow-400 flex-shrink-0" />
                            <span className="text-yellow-400 font-medium">Location:</span>
                            <span className="text-gray-300 truncate">{formatLocation(donation)}</span>
                          </div>
                        )}
                      </div>

                      {/* Tags */}
                      {donation.tags && donation.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mb-3">
                          {donation.tags.slice(0, 4).map((tag, tagIndex) => (
                            <span key={tagIndex} className="inline-flex items-center text-[10px] sm:text-xs bg-navy-700 text-yellow-300 px-2 py-1 rounded-md border border-navy-600">
                              <Tag className="h-3 w-3 mr-1" />
                              {tag}
                            </span>
                          ))}
                          {donation.tags.length > 4 && (
                            <span className="text-[10px] sm:text-xs text-yellow-300 font-medium">+{donation.tags.length - 4} more</span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {/* Status Indicator - Bottom Line */}
                  <div 
                    className="h-1 w-full"
                    style={{
                      backgroundColor: donation.is_urgent ? '#ef4444' : '#fbbf24'
                    }}
                  ></div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}

        {/* Donation Details Modal */}
        <AnimatePresence>
          {showDetailsModal && selectedDonation && (
            <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-3 sm:p-4">
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                transition={{ duration: 0.2 }}
                className="bg-navy-900 border-2 border-yellow-500/30 shadow-2xl rounded-lg sm:rounded-xl max-w-3xl w-full max-h-[95vh] sm:max-h-[90vh] overflow-hidden flex flex-col"
              >
                {/* Header */}
                <div className="flex items-center justify-between p-4 sm:p-6 border-b-2 border-yellow-500/20 flex-shrink-0 gap-3">
                  <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
                    <div className="p-1.5 sm:p-2 bg-yellow-500/10 rounded-lg flex-shrink-0">
                      <Gift className="h-5 w-5 sm:h-6 sm:w-6 text-yellow-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-base sm:text-lg lg:text-xl font-bold text-white truncate">Donation Details</h3>
                      <p className="text-[10px] sm:text-xs text-yellow-300">Complete information</p>
                    </div>
                  </div>
                  {selectedDonation.donor && (
                    <button
                      onClick={() => handleViewDonorProfile(selectedDonation.donor)}
                      className="text-xs sm:text-sm px-3 sm:px-4 py-1.5 sm:py-2 bg-yellow-600/20 hover:bg-yellow-600/30 text-yellow-300 rounded-lg transition-colors flex items-center gap-1.5 sm:gap-2 border border-yellow-500/30 hover:border-yellow-500/50 active:scale-95"
                    >
                      <Eye className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                      <span className="hidden sm:inline">View Donor Profile</span>
                      <span className="sm:hidden">View</span>
                    </button>
                  )}
                </div>

                {/* Content with Custom Scrollbar */}
                <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-3 sm:py-4 custom-scrollbar">
                  <div className="space-y-4 sm:space-y-6">
                    {/* Donation Image */}
                    {selectedDonation.images && selectedDonation.images.length > 0 && (
                      <div className="relative rounded-lg overflow-hidden bg-navy-800">
                        <img
                          src={selectedDonation.images[0]}
                          alt={selectedDonation.title}
                          className="w-full h-48 sm:h-64 object-cover"
                        />
                        {selectedDonation.is_urgent && (
                          <div className="absolute top-2 right-2 bg-red-600 text-white px-3 py-1.5 rounded-full text-xs font-medium flex items-center">
                            <AlertCircle className="h-3 w-3 mr-1" />
                            Urgent
                          </div>
                        )}
                      </div>
                    )}

                    {/* Title and Status */}
                    <div className="bg-navy-800/50 rounded-lg p-3 sm:p-4 border border-navy-700">
                      <div className="flex flex-col sm:flex-row items-start justify-between gap-2 sm:gap-4 mb-2 sm:mb-3">
                        <h4 className="text-lg sm:text-xl lg:text-2xl font-bold text-white">{selectedDonation.title}</h4>
                        <span className="px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-full text-[10px] sm:text-xs font-semibold bg-yellow-900/30 text-yellow-300 border border-yellow-500/30 whitespace-nowrap">
                          {selectedDonation.category}
                        </span>
                      </div>
                      <p className="text-sm sm:text-base text-gray-300 leading-relaxed">{selectedDonation.description || 'No description provided'}</p>
                    </div>

                    {/* Details Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="bg-navy-800/30 rounded-lg p-4 border border-navy-700">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Package className="h-4 w-4 text-blue-400" />
                            <label className="text-sm font-semibold text-yellow-300">Quantity Available</label>
                          </div>
                          <p className="text-white text-lg font-medium">{selectedDonation.quantity}</p>
                        </div>
                      </div>
                      
                      <div className="bg-navy-800/30 rounded-lg p-4 border border-navy-700">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <CheckCircle className="h-4 w-4 text-green-400" />
                            <label className="text-sm font-semibold text-yellow-300">Condition</label>
                          </div>
                          <p className={`text-lg font-medium capitalize ${selectedDonation.condition ? 'text-white' : 'text-gray-400 italic'}`}>
                            {selectedDonation.condition?.replace('_', ' ') || 'Not provided'}
                          </p>
                        </div>
                      </div>
                      
                      <div className="bg-navy-800/30 rounded-lg p-4 border border-navy-700">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <User className="h-4 w-4 text-green-400" />
                            <label className="text-sm font-semibold text-yellow-300">Donated By</label>
                          </div>
                          <p className={`text-lg font-medium ${selectedDonation.donor?.name ? 'text-white' : 'text-gray-400 italic'}`}>
                            {selectedDonation.donor?.name || 'Not provided'}
                          </p>
                        </div>
                      </div>

                      <div className="bg-navy-800/30 rounded-lg p-4 border border-navy-700">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Star className="h-4 w-4 text-yellow-400" />
                            <label className="text-sm font-semibold text-yellow-300">Estimated Value</label>
                          </div>
                          <p className={`text-lg font-medium ${selectedDonation.estimated_value ? 'text-white' : 'text-gray-400 italic'}`}>
                            {selectedDonation.estimated_value ? `₱${parseInt(selectedDonation.estimated_value).toLocaleString()}` : 'Not provided'}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Location */}
                    <div className="bg-navy-800/30 rounded-lg p-4 border border-navy-700">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <MapPin className="h-4 w-4 text-purple-400" />
                          <label className="text-sm font-semibold text-yellow-300">Pickup Location</label>
                        </div>
                        <p className={`text-center max-w-[60%] break-words ${(selectedDonation.pickup_location || selectedDonation.donor) ? 'text-white' : 'text-gray-400 italic'}`}>
                          {(selectedDonation.pickup_location || selectedDonation.donor) ? formatLocation(selectedDonation) : 'Not provided'}
                        </p>
                      </div>
                    </div>

                    {/* Delivery Mode and Posted Date */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="bg-navy-800/30 rounded-lg p-4 border border-navy-700">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Package className="h-4 w-4 text-yellow-400" />
                            <label className="text-sm font-semibold text-yellow-300">Delivery Mode</label>
                          </div>
                          <p className="text-white text-lg font-medium">{getDeliveryModeLabel(selectedDonation.delivery_mode)}</p>
                        </div>
                      </div>

                      <div className="bg-navy-800/30 rounded-lg p-4 border border-navy-700">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4 text-orange-400" />
                            <label className="text-sm font-semibold text-yellow-300">Posted Date</label>
                          </div>
                          <p className="text-white">{formatDate(selectedDonation.created_at)}</p>
                        </div>
                      </div>
                    </div>

                    {/* Expiry Date */}
                    <div className="bg-navy-800/30 rounded-lg p-4 border border-navy-700">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4 text-red-400" />
                          <label className="text-sm font-semibold text-yellow-300">Expires On</label>
                        </div>
                        <p className={selectedDonation.expiry_date ? 'text-white' : 'text-gray-400 italic'}>
                          {selectedDonation.expiry_date ? formatDate(selectedDonation.expiry_date) : 'Not provided'}
                        </p>
                      </div>
                    </div>

                    {/* Tags */}
                    <div className="bg-navy-800/30 rounded-lg p-4 border border-navy-700">
                      <label className="text-sm font-semibold text-yellow-300 mb-3 block">Tags</label>
                      {selectedDonation.tags && selectedDonation.tags.length > 0 ? (
                        <div className="flex flex-wrap gap-2">
                          {selectedDonation.tags.map((tag, tagIndex) => (
                            <span key={tagIndex} className="inline-flex items-center text-xs font-medium bg-navy-700 text-yellow-300 px-3 py-1.5 rounded-lg border border-yellow-500/30">
                              <Tag className="h-3 w-3 mr-1" />
                              {tag}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <p className="text-gray-400 italic text-sm">Not provided</p>
                      )}
                    </div>

                    {/* Action Note */}
                    <div className="bg-yellow-900/20 border border-yellow-500/20 rounded-lg p-4">
                      <p className="text-yellow-300 text-sm">
                        <strong>Interested?</strong> Click the "Request Donation" button to send a request to the donor. They will review and approve your request.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Footer */}
                <div className="p-4 sm:p-6 pt-3 sm:pt-4 border-t-2 border-yellow-500/20 flex flex-col sm:flex-row justify-between gap-3 flex-shrink-0">
                  {requestedDonations.has(selectedDonation.id) ? (
                    <button
                      disabled
                      className="flex-1 px-4 sm:px-6 py-2.5 bg-gray-600 text-gray-300 rounded-lg font-semibold flex items-center justify-center gap-2 cursor-not-allowed opacity-70"
                    >
                      <CheckCircle className="h-4 w-4" />
                      Request Already Sent
                    </button>
                  ) : (
                    <button
                      onClick={() => {
                        handleRequestDonation(selectedDonation)
                        setShowDetailsModal(false)
                      }}
                      disabled={claimingId === selectedDonation.id}
                      className="flex-1 px-4 sm:px-6 py-2.5 bg-gradient-to-r from-yellow-500 to-yellow-600 hover:from-yellow-600 hover:to-yellow-700 text-white rounded-lg font-semibold transition-all disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg hover:shadow-xl active:scale-95"
                    >
                      {claimingId === selectedDonation.id ? (
                        <LoadingSpinner size="sm" />
                      ) : (
                        <>
                          <Heart className="h-4 w-4" />
                          Request This Donation
                        </>
                      )}
                    </button>
                  )}
                  <button
                    onClick={() => setShowDetailsModal(false)}
                    className="px-4 sm:px-6 py-2.5 bg-navy-800 hover:bg-navy-700 text-white rounded-lg font-medium transition-colors border border-navy-600"
                  >
                    Close
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* Donor Profile Modal */}
        <AnimatePresence>
          {showDonorProfileModal && selectedDonor && (
            <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-3 sm:p-4">
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                transition={{ duration: 0.2 }}
                className="bg-navy-900 border-2 border-yellow-500/30 shadow-2xl rounded-lg sm:rounded-xl max-w-3xl w-full max-h-[95vh] sm:max-h-[90vh] overflow-hidden flex flex-col"
              >
                {/* Header */}
                <div className="flex items-center justify-between p-4 sm:p-6 border-b-2 border-yellow-500/20 flex-shrink-0 gap-3">
                  <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
                    <div className="p-1.5 sm:p-2 bg-yellow-500/10 rounded-lg flex-shrink-0">
                      <User className="h-5 w-5 sm:h-6 sm:w-6 text-yellow-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-base sm:text-lg lg:text-xl font-bold text-white truncate">Donor Profile</h3>
                      <p className="text-[10px] sm:text-xs text-yellow-300">Complete information</p>
                    </div>
                  </div>
                </div>

                {/* Content with Custom Scrollbar */}
                <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-3 sm:py-4 custom-scrollbar">
                  <div className="space-y-4 sm:space-y-6">
                  {loadingDonorProfile ? (
                    <div className="flex flex-col items-center justify-center py-6 sm:py-8">
                      <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-yellow-400 mb-3"></div>
                      <p className="text-yellow-300 text-sm">Loading profile...</p>
                    </div>
                  ) : (
                    <>
                      {/* Profile Header */}
                      <div className="relative flex items-center gap-4">
                        <div className="relative flex-shrink-0">
                          <div 
                            className="h-28 w-28 sm:h-36 sm:w-36 rounded-full overflow-hidden border-2 border-yellow-500 shadow-lg flex items-center justify-center cursor-pointer hover:border-yellow-400 transition-colors"
                            onClick={() => setShowDonorProfileImageModal(true)}
                            title="View profile picture"
                          >
                          {selectedDonor?.profile_image_url ? (
                            <img 
                              src={selectedDonor.profile_image_url} 
                              alt={selectedDonor?.name || 'Donor'}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="h-full w-full bg-navy-700 flex items-center justify-center">
                              <User className="h-16 w-16 sm:h-20 sm:w-20 text-yellow-400" />
                            </div>
                          )}
                          </div>
                          {/* View Overlay - Shows on hover */}
                          <div
                            className="absolute inset-0 h-28 w-28 sm:h-36 sm:w-36 rounded-full bg-black bg-opacity-50 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity pointer-events-none cursor-pointer"
                          >
                            <Camera className="h-6 w-6 text-white" />
                          </div>
                        </div>
                        
                        <div className="flex flex-col justify-center min-w-0 flex-1">
                          <h4 className="text-white font-bold text-base sm:text-lg mb-1">
                            {selectedDonor?.name || selectedDonor?.full_name || 'Anonymous'}
                          </h4>
                          <div className="flex flex-wrap items-center gap-2 text-xs">
                            <span className="text-yellow-400 flex items-center gap-1 whitespace-nowrap">
                              <Calendar className="h-3.5 w-3.5 flex-shrink-0" />
                              {(() => {
                                const memberDate = selectedDonor?.created_at || selectedDonor?.user_created_at || selectedDonor?.joined_at || selectedDonor?.signup_date;
                                if (memberDate) {
                                  try {
                                    const date = new Date(memberDate);
                                    if (!isNaN(date.getTime())) {
                                      return `Member since ${date.toLocaleDateString('en-US', { 
                                        year: 'numeric', 
                                        month: 'short', 
                                        day: 'numeric' 
                                      })}`;
                                    }
                                  } catch (e) {
                                    console.error('Error parsing date:', e);
                                  }
                                }
                                return 'New member';
                              })()}
                            </span>
                            {selectedDonor?.account_type && selectedDonor.account_type !== 'individual' && (
                              <span className="text-yellow-400 flex items-center gap-1 whitespace-nowrap">
                                <Building2 className="h-3.5 w-3.5 flex-shrink-0" />
                                {selectedDonor.account_type === 'business' ? 'Business' : 'Organization'}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* ID Verification Badge - Top Right Corner */}
                        <div className="absolute top-0 right-0 flex-shrink-0">
                          <IDVerificationBadge
                            idStatus={selectedDonor?.id_verification_status}
                            hasIdUploaded={selectedDonor?.primary_id_type && selectedDonor?.primary_id_number}
                            size="sm"
                            showText={true}
                            showDescription={false}
                          />
                        </div>
                      </div>

                      {/* Basic Information and Contact Information - 2 Column Layout */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {/* Basic Information */}
                        <div className="bg-navy-800/30 rounded-lg p-3 border border-yellow-500/20">
                          <h5 className="text-white font-semibold mb-2 text-sm flex items-center gap-2">
                            <User className="h-3.5 w-3.5 text-yellow-400 flex-shrink-0" />
                            Basic Information
                          </h5>
                          <div className="space-y-2 text-xs sm:text-sm">
                            <div className="flex items-start gap-2 min-w-0">
                              <span className="text-yellow-400 font-medium flex-shrink-0">Birthdate:</span>
                              <span className={`break-words flex-1 ${selectedDonor?.birthdate ? 'text-white' : 'text-gray-400 italic'}`}>
                                {selectedDonor?.birthdate ? (
                                  new Date(selectedDonor.birthdate).toLocaleDateString('en-US', {
                                    year: 'numeric',
                                    month: 'long',
                                    day: 'numeric'
                                  })
                                ) : (
                                  'Not provided'
                                )}
                              </span>
                            </div>
                            <div className="flex items-start gap-2 min-w-0">
                              <span className="text-yellow-400 font-medium flex-shrink-0">Age:</span>
                              <span className={`break-words flex-1 ${selectedDonor?.birthdate ? 'text-white' : 'text-gray-400 italic'}`}>
                                {selectedDonor?.birthdate ? (calculateAge(selectedDonor.birthdate) || 'Not available') : 'Not provided'}
                              </span>
                            </div>
                            <div className="flex items-start gap-2 min-w-0">
                              <span className="text-yellow-400 font-medium flex-shrink-0">Account Type:</span>
                              <span className={`break-words flex-1 ${selectedDonor?.account_type ? 'text-white' : 'text-gray-400 italic'}`}>
                                {selectedDonor?.account_type ? (selectedDonor.account_type === 'business' ? 'Business/Organization' : 'Individual') : 'Not provided'}
                              </span>
                            </div>
                            {selectedDonor?.account_type === 'business' && (
                              <>
                                <div className="flex items-start gap-2 min-w-0">
                                  <span className="text-yellow-400 font-medium flex-shrink-0">Organization:</span>
                                  <span className={`break-words flex-1 ${selectedDonor?.organization_name ? 'text-white' : 'text-gray-400 italic'}`}>
                                    {selectedDonor?.organization_name || 'Not provided'}
                                  </span>
                                </div>
                                <div className="flex items-start gap-2 min-w-0">
                                  <span className="text-yellow-400 font-medium flex-shrink-0">Website:</span>
                                  {selectedDonor?.website_link ? (
                                    <a
                                      href={selectedDonor.website_link}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="text-yellow-300 hover:text-yellow-200 break-all flex-1 flex items-center gap-1"
                                    >
                                      <Globe className="h-3 w-3 flex-shrink-0" />
                                      {selectedDonor.website_link}
                                    </a>
                                  ) : (
                                    <span className="text-gray-400 italic break-words flex-1">Not provided</span>
                                  )}
                                </div>
                              </>
                            )}
                          </div>
                        </div>

                        {/* Contact Information */}
                        <div className="bg-navy-800/30 rounded-lg p-3 border border-yellow-500/20">
                          <h5 className="text-white font-semibold mb-2 text-sm flex items-center gap-2">
                            <Phone className="h-3.5 w-3.5 text-yellow-400 flex-shrink-0" />
                            Contact Information
                          </h5>
                          <div className="space-y-2 text-xs sm:text-sm">
                            <div className="flex items-start gap-2 min-w-0">
                              <span className="text-yellow-400 font-medium flex-shrink-0">Phone:</span>
                              <span className="text-white break-words flex-1">
                                {selectedDonor?.phone_number || selectedDonor?.phone ? (
                                  <a
                                    href={`tel:${selectedDonor.phone_number || selectedDonor.phone}`}
                                    className="text-white hover:text-yellow-300 transition-colors break-all"
                                  >
                                    {selectedDonor.phone_number || selectedDonor.phone}
                                  </a>
                                ) : (
                                  <span className="text-gray-400 italic">Not provided</span>
                                )}
                              </span>
                            </div>
                            <div className="flex items-start gap-2 min-w-0">
                              <span className="text-yellow-400 font-medium flex-shrink-0">Email:</span>
                              <span className="text-white break-words flex-1">
                                {selectedDonor?.email ? (
                                  <a
                                    href={`mailto:${selectedDonor.email}`}
                                    className="text-white hover:text-yellow-300 transition-colors break-all"
                                  >
                                    {selectedDonor.email}
                                  </a>
                                ) : (
                                  <span className="text-gray-400 italic">Not provided</span>
                                )}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Address Details - Combined Location and Address */}
                      <div className="bg-navy-800/30 rounded-lg p-3 border border-yellow-500/20">
                        <h5 className="text-white font-semibold mb-2 text-sm flex items-center gap-2">
                          <MapPin className="h-3.5 w-3.5 text-yellow-400 flex-shrink-0" />
                          Address Details
                        </h5>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-xs sm:text-sm">
                          <div className="flex items-start gap-2 min-w-0">
                            <span className="text-yellow-400 font-medium flex-shrink-0">Street:</span>
                            <span className={`break-words flex-1 ${selectedDonor?.address_street ? 'text-white' : 'text-gray-400 italic'}`}>
                              {selectedDonor?.address_street || 'Not provided'}
                            </span>
                          </div>
                          <div className="flex items-start gap-2 min-w-0">
                            <span className="text-yellow-400 font-medium flex-shrink-0">Barangay:</span>
                            <span className={`break-words flex-1 ${selectedDonor?.address_barangay ? 'text-white' : 'text-gray-400 italic'}`}>
                              {selectedDonor?.address_barangay || 'Not provided'}
                            </span>
                          </div>
                          <div className="flex items-start gap-2 min-w-0">
                            <span className="text-yellow-400 font-medium flex-shrink-0">Landmark:</span>
                            <span className={`break-words flex-1 ${selectedDonor?.address_landmark ? 'text-white' : 'text-gray-400 italic'}`}>
                              {selectedDonor?.address_landmark || 'Not provided'}
                            </span>
                          </div>
                          <div className="flex items-start gap-2 min-w-0">
                            <span className="text-yellow-400 font-medium flex-shrink-0">City:</span>
                            <span className={`break-words flex-1 ${selectedDonor?.city ? 'text-white' : 'text-gray-400 italic'}`}>
                              {selectedDonor?.city || 'Not provided'}
                            </span>
                          </div>
                          <div className="flex items-start gap-2 min-w-0">
                            <span className="text-yellow-400 font-medium flex-shrink-0">Province:</span>
                            <span className={`break-words flex-1 ${selectedDonor?.province ? 'text-white' : 'text-gray-400 italic'}`}>
                              {selectedDonor?.province || 'Not provided'}
                            </span>
                          </div>
                          <div className="flex items-start gap-2 min-w-0">
                            <span className="text-yellow-400 font-medium flex-shrink-0">ZIP Code:</span>
                            <span className={`break-words flex-1 ${selectedDonor?.zip_code ? 'text-white' : 'text-gray-400 italic'}`}>
                              {selectedDonor?.zip_code || 'Not provided'}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Emergency Contact and Donation Preferences - 2 Column Layout */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {/* Emergency Contact */}
                        <div className="bg-navy-800/30 rounded-lg p-3 border border-yellow-500/20">
                          <h5 className="text-white font-semibold mb-2 text-sm flex items-center gap-2">
                            <AlertCircle className="h-3.5 w-3.5 text-yellow-400 flex-shrink-0" />
                            Emergency Contact
                          </h5>
                          <div className="space-y-2 text-xs sm:text-sm">
                            <div className="flex items-start gap-2 min-w-0">
                              <span className="text-yellow-400 font-medium flex-shrink-0">Name:</span>
                              <span className={`break-words flex-1 ${selectedDonor?.emergency_contact_name ? 'text-white' : 'text-gray-400 italic'}`}>
                                {selectedDonor?.emergency_contact_name || 'Not provided'}
                              </span>
                            </div>
                            <div className="flex items-start gap-2 min-w-0">
                              <span className="text-yellow-400 font-medium flex-shrink-0">Phone:</span>
                              {selectedDonor?.emergency_contact_phone ? (
                                <a
                                  href={`tel:${selectedDonor.emergency_contact_phone}`}
                                  className="text-white hover:text-yellow-300 transition-colors break-all flex-1"
                                >
                                  {selectedDonor.emergency_contact_phone}
                                </a>
                              ) : (
                                <span className="text-gray-400 italic break-words flex-1">Not provided</span>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Donation Preferences */}
                        <div className="bg-navy-800/30 rounded-lg p-3 border border-yellow-500/20">
                          <h5 className="text-white font-semibold mb-2 text-sm flex items-center gap-2">
                            <Gift className="h-3.5 w-3.5 text-yellow-400 flex-shrink-0" />
                            Donation Preferences
                          </h5>
                          <div className="space-y-2 text-xs sm:text-sm">
                            {selectedDonor?.donation_types?.length > 0 ? (
                              <div className="flex flex-wrap gap-1.5">
                                {selectedDonor.donation_types.map((type, i) => (
                                  <span key={i} className="bg-navy-700 text-xs px-2 py-1 rounded-full text-yellow-300 border border-yellow-500/30 font-medium break-words">
                                    {type}
                                  </span>
                                ))}
                              </div>
                            ) : (
                              <p className="text-gray-400 italic text-xs">Not provided</p>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Bio/About */}
                      <div className="bg-navy-800/30 rounded-lg p-3 border border-yellow-500/20">
                        <h5 className="text-white font-semibold mb-2 text-sm flex items-center gap-2">
                          <MessageSquare className="h-3.5 w-3.5 text-yellow-400 flex-shrink-0" />
                          About
                        </h5>
                        <p className={`text-xs sm:text-sm leading-relaxed break-words ${selectedDonor?.bio ? 'text-yellow-200' : 'text-gray-400 italic'}`}>
                          {selectedDonor?.bio || 'Not provided'}
                        </p>
                      </div>
                    </>
                  )}
                  </div>
                </div>

                {/* Footer */}
                <div className="p-4 sm:p-6 pt-3 sm:pt-4 border-t-2 border-yellow-500/20 flex flex-col sm:flex-row justify-between gap-3 flex-shrink-0">
                  {selectedDonor?.id && user?.id && selectedDonor.id !== user.id && (
                    <button
                      onClick={() => setShowReportModal(true)}
                      className="px-4 sm:px-6 py-2.5 bg-red-600/20 hover:bg-red-600/30 border border-red-500/50 text-red-400 rounded-lg font-semibold transition-all flex items-center justify-center gap-2"
                    >
                      <Flag className="h-4 w-4" />
                      Report User
                    </button>
                  )}
                  <button
                    onClick={() => setShowDonorProfileModal(false)}
                    className={`px-4 sm:px-6 py-2.5 bg-navy-800 hover:bg-navy-700 text-white rounded-lg font-medium transition-colors border border-navy-600 ${selectedDonor?.id && user?.id && selectedDonor.id !== user.id ? 'flex-1' : 'w-full'}`}
                  >
                    Close
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* Donor Profile Image Viewer Modal */}
        <AnimatePresence>
          {showDonorProfileImageModal && selectedDonor && (
            <div className="fixed inset-0 z-[60]">
              {/* Backdrop */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setShowDonorProfileImageModal(false)}
                className="absolute inset-0 bg-black/90 backdrop-blur-sm"
              />
              
              {/* Image Container */}
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="relative w-full h-full flex items-center justify-center p-4 sm:p-6"
                onClick={(e) => e.stopPropagation()}
              >
                {selectedDonor?.profile_image_url ? (
                  <>
                    <img
                      src={selectedDonor.profile_image_url}
                      alt={selectedDonor?.name || 'Donor'}
                      className="max-w-full max-h-[85vh] w-auto h-auto object-contain rounded-lg shadow-2xl"
                    />
                    {/* Close Button */}
                    <button
                      type="button"
                      onClick={() => setShowDonorProfileImageModal(false)}
                      className="absolute top-4 right-4 p-2.5 rounded-full bg-black/70 hover:bg-black/90 text-white transition-colors backdrop-blur-sm z-10 shadow-lg"
                      title="Close"
                      aria-label="Close image viewer"
                    >
                      <X className="h-5 w-5" />
                    </button>
                  </>
                ) : (
                  <div className="relative flex flex-col items-center justify-center text-center">
                    <div className="w-32 h-32 sm:w-40 sm:h-40 rounded-full bg-navy-800 border-4 border-navy-700 flex items-center justify-center mb-4">
                      <User className="h-16 w-16 sm:h-20 sm:w-20 text-yellow-400" />
                    </div>
                    <p className="text-gray-400 text-sm sm:text-base">No profile picture uploaded</p>
                    {/* Close Button */}
                    <button
                      type="button"
                      onClick={() => setShowDonorProfileImageModal(false)}
                      className="absolute top-4 right-4 p-2.5 rounded-full bg-black/70 hover:bg-black/90 text-white transition-colors backdrop-blur-sm z-10 shadow-lg"
                      title="Close"
                      aria-label="Close image viewer"
                    >
                      <X className="h-5 w-5" />
                    </button>
                  </div>
                )}
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* Report User Modal */}
        {selectedDonor && (
          <ReportUserModal
            isOpen={showReportModal}
            onClose={() => setShowReportModal(false)}
            reportedUserId={selectedDonor.id}
            reportedUserName={selectedDonor.name || selectedDonor.full_name}
            reportedUserRole={selectedDonor.role}
          />
        )}
      </div>
    </div>
  )
}

export default BrowseDonationsPage 