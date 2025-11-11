import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { GoogleMap, Marker, Autocomplete } from '@react-google-maps/api'
import LocationPicker from '../../components/ui/LocationPicker'
import { 
  Search, 
  Filter, 
  Heart, 
  MapPin, 
  Calendar, 
  Tag, 
  AlertCircle,
  Clock,
  User,
  Package,
  Eye,
  ArrowRight,
  X,
  Phone,
  MessageSquare,
  Upload,
  Image as ImageIcon,
  Truck,
  Gift,
  Flag,
  Camera,
  Building2,
  Globe,
  Users,
  Star,
  Mail,
  Shield
} from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import { useToast } from '../../contexts/ToastContext'
import { ListPageSkeleton } from '../../components/ui/Skeleton'
import { IDVerificationBadge } from '../../components/ui/VerificationBadge'
import ReportUserModal from '../../components/ui/ReportUserModal'
import { db } from '../../lib/supabase'
import { intelligentMatcher } from '../../lib/matchingAlgorithm'

const BrowseRequestsPage = () => {
  const navigate = useNavigate()
  const { user, profile } = useAuth()
  const { success, error } = useToast()
  const [requests, setRequests] = useState([])
  const [loadingProfile, setLoadingProfile] = useState(false)
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('')
  const [selectedUrgency, setSelectedUrgency] = useState('')
  const [selectedRequest, setSelectedRequest] = useState(null)
  const [showDetailsModal, setShowDetailsModal] = useState(false)
  const [showProfileModal, setShowProfileModal] = useState(false)
  const [showReportModal, setShowReportModal] = useState(false)
  const [showProfileImageModal, setShowProfileImageModal] = useState(false)
  const [requestsWithScores, setRequestsWithScores] = useState([])
  const [userDonations, setUserDonations] = useState([])

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

  // Helper function to convert ID type value to readable label
  const getIDTypeLabel = (idType) => {
    if (!idType) return 'No ID'
    
    const idTypeMap = {
      'fourps_id': '4Ps Beneficiary ID (DSWD)',
      'philsys_id': 'Philippine National ID (PhilSys)',
      'voters_id': 'Voter\'s ID or Certificate',
      'drivers_license': 'Driver\'s License',
      'passport': 'Passport',
      'postal_id': 'Postal ID',
      'barangay_certificate': 'Barangay Certificate with photo',
      'senior_citizen_id': 'Senior Citizen ID',
      'school_id': 'School ID',
      'sss_umid': 'SSS or UMID Card',
      'prc_id': 'PRC ID',
      'sec_registration': 'SEC Registration Certificate',
      'dti_registration': 'DTI Business Registration',
      'barangay_clearance': 'Barangay Clearance or Mayor\'s Permit',
      'dswd_accreditation': 'DSWD Accreditation'
    }
    
    return idTypeMap[idType] || idType
  }

  const categories = [
    'Food & Beverages',
    'Clothing & Accessories',
    'Medical Supplies',
    'Educational Materials',
    'Household Items',
    'Electronics & Technology',
    'Toys & Recreation',
    'Personal Care Items',
    'Emergency Supplies',
    'Other'
  ]

  const urgencyLevels = [
    { value: 'low', label: 'Low Priority', color: 'text-green-400 bg-green-900/20' },
    { value: 'medium', label: 'Medium Priority', color: 'text-yellow-400 bg-yellow-900/20' },
    { value: 'high', label: 'High Priority', color: 'text-orange-400 bg-orange-900/20' },
    { value: 'critical', label: 'Critical', color: 'text-red-400 bg-red-900/20' }
  ]

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
  const formatLocation = (request) => {
    const requester = request?.requester
    const locationParts = []
    
    // Priority 1: Most specific - House/Unit + Street
    if (isValidLocationValue(requester?.address_house) || isValidLocationValue(requester?.address_street)) {
      const houseStreet = [requester.address_house, requester.address_street]
        .filter(isValidLocationValue)
        .join(' ')
        .trim()
      if (houseStreet) {
        locationParts.push(houseStreet)
      }
    }
    
    // Priority 2: Barangay (very important for Philippines)
    if (isValidLocationValue(requester?.address_barangay)) {
      locationParts.push(requester.address_barangay.trim())
    }
    
    // Priority 3: Subdivision/Building
    if (isValidLocationValue(requester?.address_subdivision)) {
      locationParts.push(requester.address_subdivision.trim())
    }
    
    // Priority 4: Landmark (if no street address)
    if (isValidLocationValue(requester?.address_landmark) && !isValidLocationValue(requester?.address_street)) {
      locationParts.push(`Near ${requester.address_landmark.trim()}`)
    }
    
    // Priority 5: Full address (if it's more specific than just city/province)
    if (isValidLocationValue(requester?.address) && !locationParts.length) {
      const addressStr = requester.address.trim()
      // Check if address is generic (like just "Cagayan de Oro City" or "Philippines, Cagayan de Oro City")
      const isGenericAddress = /^(Philippines|Philippines,?\s*[A-Za-z\s]+(?: City)?|[A-Za-z\s]+ City)$/i.test(addressStr)
      // Also check if it contains "To be completed"
      if (!isGenericAddress && !addressStr.toLowerCase().includes('to be completed')) {
        locationParts.push(addressStr)
      }
    }
    
    // Priority 6: City
    if (isValidLocationValue(requester?.city)) {
      locationParts.push(requester.city.trim())
    }
    
    // Priority 7: Province
    if (isValidLocationValue(requester?.province)) {
      locationParts.push(requester.province.trim())
    }
    
    // If we have specific details, return them (don't include generic location)
    if (locationParts.length > 0) {
      return locationParts.join(', ')
    }
    
    // Fallback: Use request.location only if no specific details available
    if (request?.location) {
      const locationStr = request.location.trim()
      // Filter out placeholder values from request.location too
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

  const loadRequests = useCallback(async () => {
    try {
      setLoading(true)
      
      // Load ranked open requests with reduced limit for faster initial load
      const ranked = await db.rankOpenRequests({ limit: 30 })
      const rankedRequests = (ranked || []).map(r => ({ ...r.request, _rankScore: r.score }))
      const fallbackRequests = rankedRequests.length > 0 ? rankedRequests : (await db.getRequests({ status: 'open', limit: 30 }))
      setRequests(fallbackRequests || [])
      
      // Load user's donations for matching
      if (user?.id) {
        const donations = await db.getDonations({ donor_id: user.id, status: 'available' })
        setUserDonations(donations || [])
        
        // If user has no donations, skip matching entirely for faster load
        if (!donations || donations.length === 0) {
          setRequestsWithScores(fallbackRequests.map(req => ({
            ...req,
            matchingScore: 0,
            bestMatchingDonation: null,
            matchReason: 'No available donations to match'
          })))
          return
        }
        
        // Progressive loading: Show requests immediately, then calculate matching scores in batches
        // Set initial requests without blocking
        setRequestsWithScores(fallbackRequests.map(req => ({
          ...req,
          matchingScore: 0,
          bestMatchingDonation: null,
          matchReason: 'Calculating match...'
        })))
        
        // Calculate matching scores in smaller batches for better performance
        const batchSize = 5
        const requestsToProcess = fallbackRequests || []
        
        // Process requests in batches to avoid blocking
        for (let i = 0; i < requestsToProcess.length; i += batchSize) {
          const batch = requestsToProcess.slice(i, i + batchSize)
          
          // Process batch in parallel
          const batchResults = await Promise.all(
            batch.map(async (request) => {
              try {
                // Use the unified matching algorithm to find best matches
                const matches = await intelligentMatcher.matchDonorsToRequest(request, donations, 1)
                
                if (matches && matches.length > 0 && matches[0].score > 0) {
                  const bestMatch = matches[0]
                  return {
                    ...request,
                    matchingScore: bestMatch.score,
                    bestMatchingDonation: bestMatch.donation,
                    matchReason: bestMatch.matchReason || 'Good match based on multiple criteria'
                  }
                } else {
                  return {
                    ...request,
                    matchingScore: 0,
                    bestMatchingDonation: null,
                    matchReason: 'No compatible donations found'
                  }
                }
              } catch (err) {
                console.error(`Error matching request ${request.id}:`, err)
                return {
                  ...request,
                  matchingScore: 0,
                  bestMatchingDonation: null,
                  matchReason: 'Unable to calculate match score'
                }
              }
            })
          )
          
          // Update state progressively with batch results
          // React will batch these updates efficiently
          setRequestsWithScores(prev => {
            // Create a new array with updated batch results
            const updated = [...prev]
            batchResults.forEach((result, batchIdx) => {
              const targetIndex = i + batchIdx
              if (targetIndex < updated.length) {
                updated[targetIndex] = result
              }
            })
            return updated
          })
        }
      } else {
        setRequestsWithScores(fallbackRequests || [])
      }
    } catch (err) {
      console.error('Error loading requests:', err)
      error('Failed to load requests. Please try again.')
    } finally {
      setLoading(false)
    }
  }, [error, user?.id])

  useEffect(() => {
    loadRequests()
  }, [loadRequests])

  // Memoize filtered and sorted requests to avoid recalculating on every render
  const filteredRequests = useMemo(() => {
    const requestsToFilter = requestsWithScores.length > 0 ? requestsWithScores : requests
    
    return requestsToFilter
      .filter(request => {
        const matchesSearch = !searchTerm || 
          request.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
          request.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          request.tags?.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()))
        
        const matchesCategory = !selectedCategory || request.category === selectedCategory
        const matchesUrgency = !selectedUrgency || request.urgency === selectedUrgency

        return matchesSearch && matchesCategory && matchesUrgency
      })
      .sort((a, b) => {
        // Primary sort: by matching score (highest first) - as per manuscript
        if (a.matchingScore !== undefined && b.matchingScore !== undefined) {
          if (Math.abs(a.matchingScore - b.matchingScore) > 0.01) {
            return b.matchingScore - a.matchingScore
          }
        }
        // Secondary sort: by urgency level (critical > high > medium > low)
        const urgencyOrder = { critical: 4, high: 3, medium: 2, low: 1 }
        const urgencyA = urgencyOrder[a.urgency] || 0
        const urgencyB = urgencyOrder[b.urgency] || 0
        if (urgencyA !== urgencyB) {
          return urgencyB - urgencyA
        }
        // Tertiary sort: by creation date (newest first)
        return new Date(b.created_at || b.createdAt || 0) - new Date(a.created_at || a.createdAt || 0)
      })
  }, [requestsWithScores, requests, searchTerm, selectedCategory, selectedUrgency])

  const getUrgencyInfo = (urgency) => {
    return urgencyLevels.find(level => level.value === urgency) || urgencyLevels[0]
  }

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  const handleViewDetails = async (request) => {
    try {
      console.log('Opening request details:', request)
      console.log('Requester data:', request.requester)
      
      // Set request info - requester data should already be complete from the initial fetch
      setSelectedRequest(request)
      setShowDetailsModal(true)
    } catch (err) {
      console.error('Error viewing request details:', err)
    }
  }

  const handleViewProfile = async (request) => {
    try {
      setSelectedRequest(request)
      setShowProfileModal(true)
      
      // If requester info exists, fetch detailed profile
      if (request.requester?.id) {
        setLoadingProfile(true)
        try {
        const detailedProfile = await db.getProfile(request.requester.id)
        
        // Update the selected request with detailed profile info
        setSelectedRequest(prev => ({
          ...prev,
          requester: {
            ...prev.requester,
            ...detailedProfile
          }
        }))
        } catch (profileErr) {
          console.error('Error fetching detailed profile:', profileErr)
          // Continue with the existing requester info if detailed fetch fails
        }
      } else {
        // If no requester ID, try to fetch requester from request if we have request ID
        if (request.id) {
          setLoadingProfile(true)
          try {
            const requests = await db.getRequests({ requester_id: request.requester_id || request.requester?.id })
            if (requests && requests.length > 0 && requests[0].requester) {
              setSelectedRequest(prev => ({
                ...prev,
                requester: requests[0].requester
              }))
            }
          } catch (fetchErr) {
            console.error('Error fetching requester data:', fetchErr)
          }
        }
      }
    } catch (err) {
      console.error('Error opening profile:', err)
      error('Failed to load profile information')
    } finally {
      setLoadingProfile(false)
    }
  }

  const handleCreateMatch = async (request) => {
    if (!request.bestMatchingDonation) {
      error('No matching donation found for this request.')
      return
    }
    
    try {
      setLoading(true)
      await db.createSmartMatch(request.id, request.bestMatchingDonation.id)
      success(`Match created! Your donation "${request.bestMatchingDonation.title}" has been matched with "${request.title}"`)
      await loadRequests() // Refresh the list
    } catch (err) {
      console.error('Error creating match:', err)
      
      // Provide more specific error messages
      if (err.message?.includes('not sufficiently compatible')) {
        error('These items are not compatible enough for matching. The compatibility score is too low.')
      } else if (err.message?.includes('already matched')) {
        error('This request or donation has already been matched.')
      } else if (err.message?.includes('not available')) {
        error('The donation is no longer available for matching.')
      } else {
        error('Failed to create match. Please try again or contact support.')
      }
    } finally {
      setLoading(false)
    }
  }

  const [showDonateModal, setShowDonateModal] = useState(false)
  const [donateTargetRequest, setDonateTargetRequest] = useState(null)
  const [selectedDonationId, setSelectedDonationId] = useState(null)
  const [newDonationTitle, setNewDonationTitle] = useState('')
  const [newDonationQuantity, setNewDonationQuantity] = useState(1)
  const [newDonationDeliveryMode, setNewDonationDeliveryMode] = useState('volunteer')
  const [creatingDonation, setCreatingDonation] = useState(false)
  const [showDonationDetailsModal, setShowDonationDetailsModal] = useState(false)
  const [qualityImage, setQualityImage] = useState(null)
  const [pickupLocation, setPickupLocation] = useState('')
  const [pickupLatLng, setPickupLatLng] = useState(null)
  const mapRef = useRef(null)
  const autocompleteRef = useRef(null)
  const [showPickupPicker, setShowPickupPicker] = useState(false)

  // Auto-fill donation details when modal opens (must be after related state hooks)
  useEffect(() => {
    if (showDonationDetailsModal && donateTargetRequest) {
      setNewDonationTitle(donateTargetRequest.title || '')
      setNewDonationQuantity(donateTargetRequest.quantity_needed || 1)
      setNewDonationDeliveryMode(donateTargetRequest.delivery_mode || 'volunteer')
      setQualityImage(null)
      setPickupLocation('')
      setPickupLatLng(null)
    }
  }, [showDonationDetailsModal, donateTargetRequest])

  const handleDonateToRequest = (request) => {
    // Show requester profile first per new flow
    setSelectedRequest(request)
    setShowProfileModal(true)
    // set up target for next step
    setDonateTargetRequest(request)
  }

  const submitDonationOffer = async () => {
    if (!donateTargetRequest || !selectedDonationId) return
    try {
      setLoading(true)
      await db.createSmartMatch(donateTargetRequest.id, selectedDonationId)
      success('Thank you! Your donation has been offered to the recipient.')
      setShowDonateModal(false)
      setDonateTargetRequest(null)
      await loadRequests()
    } catch (err) {
      console.error('Error creating offer:', err)
      error(err.message || 'Failed to offer donation')
    } finally {
      setLoading(false)
    }
  }

  const createAndOfferDonation = async () => {
    if (!donateTargetRequest || !user?.id) return
    try {
      if (!qualityImage) {
        error('Please upload a quality assurance photo before proceeding')
        return
      }
      if ((newDonationDeliveryMode === 'pickup' || newDonationDeliveryMode === 'volunteer') && !pickupLocation.trim()) {
        error('Please provide a pickup location for this delivery mode')
        return
      }
      setCreatingDonation(true)
      // Prepare images array if available
      const images = []
      if (qualityImage) images.push(qualityImage)

      const donation = await db.createDonation({
        title: newDonationTitle?.trim() || donateTargetRequest.title,
        description: `Donation for request: ${donateTargetRequest.title}`,
        category: donateTargetRequest.category,
        quantity: Number(newDonationQuantity) > 0 ? Number(newDonationQuantity) : 1,
        pickup_location: (newDonationDeliveryMode === 'pickup' || newDonationDeliveryMode === 'volunteer') ? pickupLocation.trim() : null,
        delivery_mode: newDonationDeliveryMode || 'volunteer',
        is_urgent: donateTargetRequest.urgency === 'critical' || donateTargetRequest.urgency === 'high',
        status: 'available',
        donor_id: user.id,
        donation_destination: 'recipients',
        images,
        created_at: new Date().toISOString()
      })
      await db.createSmartMatch(donateTargetRequest.id, donation.id)
      success('Donation created and offered to the recipient!')
      setShowDonateModal(false)
      setShowDonationDetailsModal(false)
      setDonateTargetRequest(null)
      await loadRequests()
    } catch (err) {
      console.error('Error creating and offering donation:', err)
      error(err.message || 'Failed to create and offer donation')
    } finally {
      setCreatingDonation(false)
    }
  }

  const toBase64 = (file) => new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result)
    reader.onerror = (e) => reject(e)
    reader.readAsDataURL(file)
  })

  const getScoreColor = (score) => {
    if (score >= 0.9) return 'text-yellow-400 bg-yellow-900/20 border-yellow-500/20'
    if (score >= 0.75) return 'text-yellow-400 bg-yellow-900/20 border-yellow-500/20'
    if (score >= 0.6) return 'text-yellow-400 bg-yellow-900/20 border-yellow-500/20'
    if (score >= 0.4) return 'text-yellow-400 bg-yellow-900/20 border-yellow-500/20'
    return 'text-yellow-400 bg-yellow-900/20 border-yellow-500/20'
  }

  const getScoreLabel = (score) => {
    if (score >= 0.9) return 'Excellent Match'
    if (score >= 0.75) return 'Great Match'
    if (score >= 0.6) return 'Good Match'
    if (score >= 0.4) return 'Fair Match'
    return 'Poor Match'
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
              <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-white mb-2">Browse Requests</h1>
              <p className="text-xs sm:text-sm text-yellow-300">Find recipients who need your help</p>
            </div>
            <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
              {/* Request Count Badge */}
              <div className="flex items-center gap-2 px-3 sm:px-4 py-1.5 sm:py-2 bg-gradient-to-r from-yellow-500/20 to-yellow-600/20 border-2 border-yellow-500/40 rounded-full shadow-lg">
                <Heart className="h-4 w-4 sm:h-5 sm:w-5 text-yellow-400 fill-yellow-400 animate-pulse" />
                <div className="flex items-center gap-1.5">
                  <span className="text-lg sm:text-xl font-bold text-white">{filteredRequests.length}</span>
                  <span className="text-xs sm:text-sm font-medium text-yellow-300">Request{filteredRequests.length !== 1 ? 's' : ''}</span>
                </div>
              </div>
              
            </div>
          </div>
        </motion.div>

        {/* Donate Selection Modal */}
        <AnimatePresence>
          {showDonateModal && donateTargetRequest && (
            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-3 sm:p-4">
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                transition={{ duration: 0.2 }}
                className="bg-navy-900 border border-navy-700 rounded-lg p-4 sm:p-6 max-w-lg w-full"
              >
                <h3 className="text-white font-semibold mb-3">Select one of your donations</h3>
                <p className="text-yellow-300 text-sm mb-4">Request: <span className="text-white font-medium">{donateTargetRequest.title}</span></p>

                {userDonations && userDonations.length > 0 ? (
                  <div className="space-y-2 max-h-64 overflow-auto custom-scrollbar">
                    {userDonations
                      .filter(d => !donateTargetRequest.category || d.category === donateTargetRequest.category)
                      .map(d => (
                      <label key={d.id} className="flex items-start gap-3 p-3 bg-navy-800/50 rounded-lg border border-navy-700 cursor-pointer">
                        <input
                          type="radio"
                          name="selectedDonation"
                          className="mt-1"
                          checked={selectedDonationId === d.id}
                          onChange={() => setSelectedDonationId(d.id)}
                        />
                        <div>
                          <div className="text-white font-medium">{d.title}</div>
                          <div className="text-yellow-300 text-xs">Qty: {d.quantity} • {d.category}</div>
                          {d.description && (<div className="text-gray-300 text-xs line-clamp-2">{d.description}</div>)}
                        </div>
                      </label>
                    ))}
                  </div>
                ) : (
                  <div className="text-yellow-300 text-sm">You have no available donations.
                    <div className="mt-2 text-white">Create a new donation for this request:</div>
                    <div className="mt-2 grid grid-cols-1 gap-2">
                      <input value={newDonationTitle} onChange={(e) => setNewDonationTitle(e.target.value)} placeholder="Donation title" className="input" />
                      <div className="flex items-center gap-2">
                        <label className="text-yellow-300 text-xs">Quantity</label>
                        <input type="number" min="1" value={newDonationQuantity} onChange={(e) => setNewDonationQuantity(e.target.value)} className="input w-24" />
                        <label className="text-yellow-300 text-xs ml-2">Delivery</label>
                        <select value={newDonationDeliveryMode} onChange={(e) => setNewDonationDeliveryMode(e.target.value)} className="input w-40">
                          <option value="volunteer">Volunteer Delivery</option>
                          <option value="pickup">Recipient Pickup</option>
                          <option value="direct">Direct Delivery</option>
                        </select>
                      </div>
                    </div>
                  </div>
                )}

                <div className="flex justify-end gap-2 mt-4">
                  <button onClick={() => setShowDonateModal(false)} className="btn btn-secondary">Cancel</button>
                  {userDonations && userDonations.length > 0 ? (
                    <button onClick={submitDonationOffer} disabled={!selectedDonationId || loading} className="btn btn-primary">Send Offer</button>
                  ) : (
                    <button onClick={createAndOfferDonation} disabled={creatingDonation} className="btn btn-primary">Create & Send</button>
                  )}
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* Donation Details Modal (Quality assurance + proof + delivery) */}
        <AnimatePresence>
          {showDonationDetailsModal && donateTargetRequest && (
            <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-3 sm:p-4">
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                transition={{ duration: 0.2 }}
                className="bg-navy-900 border-2 border-yellow-500/30 shadow-2xl rounded-lg sm:rounded-xl p-4 sm:p-6 max-w-4xl w-full max-h-[95vh] sm:max-h-[90vh] overflow-y-auto custom-scrollbar"
              >
                {/* Header */}
                <div className="flex justify-between items-center mb-4 sm:mb-6 pb-3 sm:pb-4 border-b-2 border-yellow-500/20">
                  <div className="flex items-center gap-2 sm:gap-3">
                    <div className="p-1.5 sm:p-2 bg-yellow-500/10 rounded-lg">
                      <Package className="h-4 w-4 sm:h-5 sm:w-5 text-yellow-400" />
                    </div>
                    <div>
                      <h3 className="text-lg sm:text-xl font-bold text-white">Prepare Your Donation</h3>
                      <p className="text-yellow-300 text-xs sm:text-sm">Complete the form to offer your donation</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setShowDonationDetailsModal(false)}
                    className="text-gray-400 hover:text-white transition-colors p-1.5 sm:p-2 hover:bg-navy-800 rounded-lg"
                    aria-label="Close modal"
                  >
                    <X className="h-5 w-5 sm:h-6 sm:w-6" />
                  </button>
                </div>

                {/* Content */}
                <div className="space-y-4 sm:space-y-5">
                  {/* Request Information Card */}
                  <div className="bg-navy-800/30 rounded-lg p-4 border border-yellow-500/20">
                    <div className="flex items-center gap-2 mb-3">
                      <AlertCircle className="h-4 w-4 text-yellow-400" />
                      <h5 className="text-white font-semibold text-sm">Request Information</h5>
                    </div>
                    <div className="space-y-3">
                      <div>
                        <label className="block text-yellow-300 text-xs sm:text-sm font-medium mb-1.5">Donation Title</label>
                        <input 
                          value={newDonationTitle} 
                          onChange={(e) => setNewDonationTitle(e.target.value)} 
                          placeholder="Enter donation title" 
                          className="input w-full" 
                        />
                        <p className="text-gray-400 text-xs mt-1">Auto-filled from the request; you may edit for clarity.</p>
                      </div>
                      
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-yellow-300 text-xs sm:text-sm font-medium mb-1.5">Quantity</label>
                          <input 
                            type="number" 
                            min="1" 
                            value={newDonationQuantity} 
                            onChange={(e) => setNewDonationQuantity(e.target.value)} 
                            className="input w-full" 
                          />
                        </div>
                        <div>
                          <label className="block text-yellow-300 text-xs sm:text-sm font-medium mb-1.5">
                            Preferred Delivery Mode
                          </label>
                          <select 
                            value={newDonationDeliveryMode} 
                            onChange={(e) => setNewDonationDeliveryMode(e.target.value)} 
                            className="input w-full"
                          >
                            <option value="volunteer">Volunteer Delivery</option>
                            <option value="pickup">Recipient Pickup</option>
                            <option value="direct">Direct Delivery</option>
                          </select>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Delivery Location Card */}
                  {(newDonationDeliveryMode === 'pickup' || newDonationDeliveryMode === 'volunteer') && (
                    <div className="bg-navy-800/30 rounded-lg p-4 border border-yellow-500/20">
                      <div className="flex items-center gap-2 mb-3">
                        <MapPin className="h-4 w-4 text-yellow-400" />
                        <h5 className="text-white font-semibold text-sm">Pickup Location</h5>
                      </div>
                      <div>
                        <label className="block text-yellow-300 text-xs sm:text-sm font-medium mb-1.5">
                          {newDonationDeliveryMode === 'pickup' ? 'Location for Recipient Pickup' : 'Location for Volunteer Pickup'}
                        </label>
                        <div className="flex gap-2">
                          <input
                            value={pickupLocation}
                            onChange={(e) => setPickupLocation(e.target.value)}
                            placeholder="e.g., House #, Street, Barangay, City"
                            className="input flex-1"
                          />
                          <button
                            type="button"
                            className="px-3 sm:px-4 py-2 bg-yellow-600 hover:bg-yellow-700 text-white text-xs sm:text-sm font-medium rounded-md whitespace-nowrap transition-colors flex items-center gap-1.5"
                            onClick={() => setShowPickupPicker(true)}
                          >
                            <MapPin className="h-3.5 w-3.5" />
                            Select on Map
                          </button>
                        </div>
                        <p className="text-gray-400 text-xs mt-1.5">
                          {newDonationDeliveryMode === 'pickup'
                            ? 'Provide a safe, specific location where the recipient can pick up the item.'
                            : 'Provide the pickup location for the volunteer to collect the item.'}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Photo Upload Card */}
                  <div className="bg-navy-800/30 rounded-lg p-4 border border-yellow-500/20">
                    <div className="flex items-center gap-2 mb-3">
                      <ImageIcon className="h-4 w-4 text-yellow-400" />
                      <h5 className="text-white font-semibold text-sm">Item Photo <span className="text-red-400">*</span></h5>
                    </div>
                    <div className="border-2 border-dashed border-yellow-500/30 bg-navy-800/50 rounded-lg p-6 flex flex-col items-center justify-center text-center min-h-[200px]">
                      {!qualityImage ? (
                        <>
                          <div className="p-3 bg-yellow-500/10 rounded-full mb-3">
                            <Upload className="h-8 w-8 text-yellow-400" />
                          </div>
                          <p className="text-white font-medium mb-1">Upload Item Photo</p>
                          <p className="text-yellow-300 text-xs mb-4">Drag & drop or click to upload a clear photo of your donation</p>
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            id="qualityUpload"
                            onChange={async (e) => {
                              const f = e.target.files?.[0]
                              if (f) setQualityImage(await toBase64(f))
                            }}
                          />
                          <label htmlFor="qualityUpload" className="px-4 py-2 bg-yellow-600 hover:bg-yellow-700 text-white text-sm font-medium rounded-lg cursor-pointer transition-colors flex items-center gap-2">
                            <Upload className="h-4 w-4" />
                            Choose Photo
                          </label>
                          <p className="text-gray-400 text-xs mt-3">Supported formats: JPG, PNG, GIF (Max 5MB)</p>
                        </>
                      ) : (
                        <div className="w-full">
                          <div className="relative">
                            <img src={qualityImage} alt="Item preview" className="max-h-80 mx-auto rounded-lg border-2 border-yellow-500/30 shadow-lg" />
                            <div className="absolute top-2 right-2">
                              <button 
                                type="button" 
                                className="p-2 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors shadow-lg"
                                onClick={() => setQualityImage(null)}
                              >
                                <X className="h-4 w-4" />
                              </button>
                            </div>
                          </div>
                          <div className="flex justify-center gap-3 mt-4">
                            <label htmlFor="qualityUpload" className="px-4 py-2 bg-navy-700 hover:bg-navy-600 text-yellow-300 text-sm font-medium rounded-lg cursor-pointer transition-colors flex items-center gap-2">
                              <Upload className="h-4 w-4" />
                              Change Photo
                            </label>
                            <input
                              type="file"
                              accept="image/*"
                              className="hidden"
                              id="qualityUpload"
                              onChange={async (e) => {
                                const f = e.target.files?.[0]
                                if (f) setQualityImage(await toBase64(f))
                              }}
                            />
                          </div>
                        </div>
                      )}
                    </div>
                    <p className="text-gray-400 text-xs mt-2 flex items-start gap-1.5">
                      <AlertCircle className="h-3.5 w-3.5 flex-shrink-0 mt-0.5" />
                      <span>A clear photo helps recipients and admins verify the quality and condition of your donation.</span>
                    </p>
                  </div>
                </div>

                {/* Footer Actions */}
                <div className="flex flex-col sm:flex-row justify-end gap-2 sm:gap-3 mt-6 pt-4 border-t-2 border-yellow-500/20">
                  <button 
                    onClick={() => setShowDonationDetailsModal(false)} 
                    className="px-4 sm:px-6 py-2 sm:py-2.5 bg-navy-800 hover:bg-navy-700 text-white text-sm font-medium rounded-lg transition-colors border border-navy-600"
                  >
                    Cancel
                  </button>
                  <button 
                    onClick={createAndOfferDonation} 
                    disabled={creatingDonation || !qualityImage} 
                    className="px-4 sm:px-6 py-2 sm:py-2.5 bg-gradient-to-r from-yellow-500 to-yellow-600 hover:from-yellow-600 hover:to-yellow-700 text-white text-sm font-semibold rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg"
                  >
                    {creatingDonation ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        Processing...
                      </>
                    ) : (
                      <>
                        <Heart className="h-4 w-4" />
                        Send Donation
                      </>
                    )}
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* Location Picker modal to match Profile Address Information */}
        {showPickupPicker && (
          <LocationPicker
            isOpen={showPickupPicker}
            onClose={() => setShowPickupPicker(false)}
            onLocationSelect={(loc) => {
              // Expecting: { address, lat, lng, addressComponents }
              if (loc?.address) setPickupLocation(loc.address)
              if (loc?.lat && loc?.lng) setPickupLatLng({ lat: loc.lat, lng: loc.lng })
              setShowPickupPicker(false)
            }}
            initialLocation={pickupLatLng || null}
            title="Select Pickup Location"
          />
        )}


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
                placeholder="Search requests..."
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

            {/* Urgency */}
            <div className="relative w-full sm:w-auto sm:min-w-[200px]">
              <select
                value={selectedUrgency}
                onChange={(e) => setSelectedUrgency(e.target.value)}
                className="appearance-none w-full pl-4 sm:pl-5 pr-10 py-2.5 sm:py-3 text-sm sm:text-base bg-navy-800 border-2 border-navy-700 rounded-lg text-white font-medium focus:outline-none focus:border-yellow-500 focus:ring-2 focus:ring-yellow-500/20 transition-all duration-200 cursor-pointer hover:border-yellow-600/50"
              >
                <option value="">All Urgency Levels</option>
                {urgencyLevels.map(level => (
                  <option key={level.value} value={level.value}>{level.label}</option>
                ))}
              </select>
              <AlertCircle className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-yellow-400 pointer-events-none" />
            </div>

            {/* Clear Filters Button */}
            <button
              onClick={() => {
                setSearchTerm('')
                setSelectedCategory('')
                setSelectedUrgency('')
              }}
              disabled={!searchTerm && !selectedCategory && !selectedUrgency}
              className={`w-full sm:w-auto px-4 sm:px-5 py-2.5 sm:py-3 rounded-lg text-sm sm:text-base font-semibold transition-all duration-200 flex items-center justify-center gap-2 whitespace-nowrap border-2 ${
                searchTerm || selectedCategory || selectedUrgency
                  ? 'bg-gradient-to-r from-yellow-500 to-yellow-600 hover:from-yellow-600 hover:to-yellow-700 text-white border-yellow-500 hover:border-yellow-600 shadow-md hover:shadow-lg active:scale-95'
                  : 'bg-navy-800 text-gray-500 border-navy-700 cursor-not-allowed opacity-50'
              }`}
            >
              <X className="h-4 w-4" />
              Clear Filters
            </button>
          </div>
        </motion.div>

        {/* Requests Grid */}
        {filteredRequests.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-8 sm:py-12"
          >
            <Heart className="h-12 w-12 sm:h-16 sm:w-16 text-yellow-400 mx-auto mb-3 sm:mb-4" />
            <h3 className="text-lg sm:text-xl font-semibold text-white mb-2">No requests found</h3>
            <p className="text-sm sm:text-base text-yellow-300 px-4">
              {searchTerm || selectedCategory || selectedUrgency
                ? 'Try adjusting your filters to see more results.'
                : 'There are no open requests at the moment.'}
            </p>
          </motion.div>
        ) : (
          <div className="space-y-4 sm:space-y-6">
            <AnimatePresence>
              {filteredRequests.map((request, index) => {
                const urgencyInfo = getUrgencyInfo(request.urgency)
                return (
                  <motion.div
                    key={request.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ delay: index * 0.05 }}
                    className="relative"
                  >
                    {/* Compatibility Score Extension - Connected to Card */}
                    {request.matchingScore !== undefined && request.matchingScore > 0 && (
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
                          {request.bestMatchingDonation && (
                            <div className="flex items-center gap-2 flex-1 min-w-0">
                              <span className="text-xs font-semibold text-skyblue-200 uppercase tracking-wide whitespace-nowrap">Matches:</span>
                              <span className="text-xs text-white font-medium truncate">{request.bestMatchingDonation.title}</span>
                            </div>
                          )}
                          <div className="flex items-center gap-2 flex-shrink-0">
                            <span className="text-xs font-semibold text-skyblue-200 uppercase tracking-wide">Match Score:</span>
                            <div className={`px-2.5 py-0.5 rounded text-xs font-bold ${getScoreColor(request.matchingScore)}`}>
                              {Math.round(request.matchingScore * 100)}%
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Card */}
                    <div
                      className={`card hover:shadow-xl hover:border-yellow-500/30 transition-all duration-300 overflow-hidden border-2 border-navy-700 cursor-pointer group active:scale-[0.99] ${request.matchingScore !== undefined && request.matchingScore > 0 ? 'rounded-t-none -mt-[1px]' : ''}`}
                      style={{
                        borderTopLeftRadius: request.matchingScore !== undefined && request.matchingScore > 0 ? '0' : undefined,
                        borderTopRightRadius: request.matchingScore !== undefined && request.matchingScore > 0 ? '0' : undefined,
                        marginTop: request.matchingScore !== undefined && request.matchingScore > 0 ? '-1px' : undefined
                    }}
                    onClick={() => handleViewDetails(request)}
                  >
                    <div className="flex flex-col sm:flex-row gap-4 p-4">
                      {/* Sample Image or Placeholder */}
                      <div className="flex-shrink-0">
                        {request.sample_image ? (
                            <div className="relative w-full sm:w-56 lg:w-64 h-48 sm:h-56 lg:h-64 rounded-lg overflow-hidden border-2 border-yellow-500/30">
                            <img 
                              src={request.sample_image} 
                              alt={request.title}
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
                          <div className="flex items-start justify-between mb-3">
                          <div className="flex-1 min-w-0">
                              <h3 className="text-base sm:text-lg font-bold text-white mb-2 truncate">
                                {request.title}
                              </h3>
                            
                            {/* Badges Row */}
                              <div className="flex flex-wrap gap-2 mb-3">
                                <span className="inline-flex items-center px-2.5 py-1 rounded text-xs font-semibold bg-yellow-900/30 text-yellow-300 border border-yellow-500/40">
                                {request.category}
                              </span>
                                <span className={`inline-flex items-center px-2.5 py-1 rounded text-xs font-semibold border ${urgencyInfo.color}`}>
                                {urgencyInfo.label}
                              </span>
                            </div>
                          </div>
                          
                          {/* Action Buttons */}
                          <div className="flex flex-wrap items-center gap-2 flex-shrink-0">
                            {/* Matched Request Buttons: View Profile, View Details, Match */}
                            {request.matchingScore > 0.6 && request.bestMatchingDonation ? (
                              <>
                                {request.requester && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation()
                                      handleViewProfile(request)
                                    }}
                                    className="px-3 py-2 bg-navy-700 hover:bg-navy-600 text-white text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5 shadow-md hover:shadow-lg active:scale-95 whitespace-nowrap"
                                    title="View recipient profile"
                                  >
                                    <User className="h-3.5 w-3.5" />
                                    <span>View Profile</span>
                                  </button>
                                )}
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    handleViewDetails(request)
                                  }}
                                  className="px-3 py-2 bg-navy-700 hover:bg-navy-600 text-white text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5 shadow-md hover:shadow-lg active:scale-95 whitespace-nowrap"
                                >
                                  <Eye className="h-3.5 w-3.5" />
                                  <span>View Details</span>
                                </button>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    handleCreateMatch(request)
                                }}
                                disabled={loading}
                                className="px-3 py-2 bg-gradient-to-r from-yellow-500 to-yellow-600 hover:from-yellow-600 hover:to-yellow-700 text-white text-xs font-semibold rounded-lg transition-all disabled:opacity-50 flex items-center gap-1.5 shadow-lg hover:shadow-xl whitespace-nowrap active:scale-95"
                              >
                                <Heart className="h-3.5 w-3.5" />
                                  <span>Match</span>
                              </button>
                              </>
                            ) : (
                              /* Unmatched Request Buttons: View Details, Donate */
                              <>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    handleViewDetails(request)
                                  }}
                                  className="px-3 py-2 bg-navy-700 hover:bg-navy-600 text-white text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5 shadow-md hover:shadow-lg active:scale-95 whitespace-nowrap"
                                >
                                  <Eye className="h-3.5 w-3.5" />
                                  <span>View Details</span>
                                </button>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    handleDonateToRequest(request)
                                  }}
                                  className="px-3 py-2 bg-gradient-to-r from-yellow-500 to-yellow-600 hover:from-yellow-600 hover:to-yellow-700 text-white text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5 shadow-md hover:shadow-lg active:scale-95 whitespace-nowrap"
                                >
                                  <Heart className="h-3.5 w-3.5" />
                                  <span>Donate</span>
                                </button>
                              </>
                            )}
                          </div>
                        </div>

                        {/* Description */}
                        {request.description && (
                          <p className="text-gray-300 text-sm mb-3 line-clamp-1">
                            {request.description}
                          </p>
                        )}

                        {/* Compact Info Grid */}
                          <div className="grid grid-cols-2 gap-x-4 gap-y-2 mb-3 text-xs">
                            <div className="flex items-center gap-2">
                            <Package className="h-3.5 w-3.5 text-yellow-400 flex-shrink-0" />
                              <span className="text-yellow-400 font-semibold uppercase tracking-wide text-[10px]">Quantity:</span>
                            <span className="text-white font-semibold">{request.quantity_needed}</span>
                          </div>
                          
                            <div className="flex items-center gap-2">
                            <User className="h-3.5 w-3.5 text-yellow-400 flex-shrink-0" />
                              <span className="text-yellow-400 font-semibold uppercase tracking-wide text-[10px]">By:</span>
                              <span className="text-white font-medium truncate">{request.requester?.name || 'Anonymous'}</span>
                          </div>
                          
                            <div className="flex items-center gap-2">
                            <Calendar className="h-3.5 w-3.5 text-yellow-400 flex-shrink-0" />
                              <span className="text-yellow-400 font-semibold uppercase tracking-wide text-[10px]">Posted:</span>
                            <span className="text-gray-300">{formatDate(request.created_at)}</span>
                          </div>

                          {request.needed_by && (
                              <div className="flex items-center gap-2">
                              <Clock className="h-3.5 w-3.5 text-amber-400 flex-shrink-0" />
                                <span className="text-amber-400 font-semibold uppercase tracking-wide text-[10px]">Deadline:</span>
                              <span className="text-amber-300 font-semibold">{formatDate(request.needed_by)}</span>
                            </div>
                          )}
                          
                          {(request.location || request.requester) && (
                              <div className="flex items-center gap-2 col-span-2">
                              <MapPin className="h-3.5 w-3.5 text-yellow-400 flex-shrink-0" />
                                <span className="text-yellow-400 font-semibold uppercase tracking-wide text-[10px]">Location:</span>
                                <span className="text-gray-300 truncate">
                                  {formatLocation(request)}
                                </span>
                            </div>
                          )}
                        </div>

                        {/* Tags */}
                      {request.tags && request.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mb-3 sm:mb-4">
                          {request.tags.slice(0, 4).map((tag, tagIndex) => (
                            <span key={tagIndex} className="inline-flex items-center text-[10px] sm:text-xs bg-navy-700 text-yellow-300 px-2 py-1 rounded-md border border-navy-600">
                              <Tag className="h-3 w-3 mr-1" />
                              {tag}
                            </span>
                          ))}
                          {request.tags.length > 4 && (
                            <span className="text-[10px] sm:text-xs text-yellow-300 font-medium">+{request.tags.length - 4} more</span>
                          )}
                        </div>
                      )}
                            </div>
                          </div>
                          
                      {/* Urgency Indicator - Bottom Line */}
                      <div 
                        className="h-1 w-full"
                        style={{
                          backgroundColor: request.urgency === 'critical' ? '#ef4444' : 
                                          request.urgency === 'high' ? '#a8b03c' : 
                                          request.urgency === 'medium' ? '#cdd74a' : '#60a5fa'
                        }}
                      ></div>
                    </div>
                  </motion.div>
                )
              })}
            </AnimatePresence>
          </div>
        )}

        {/* Request Details Modal */}
        <AnimatePresence>
          {showDetailsModal && selectedRequest && (
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
                      <Heart className="h-5 w-5 sm:h-6 sm:w-6 text-yellow-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-base sm:text-lg lg:text-xl font-bold text-white truncate">Request Details</h3>
                      <p className="text-[10px] sm:text-xs text-yellow-300">Complete information</p>
                    </div>
                  </div>
                  {selectedRequest.requester && (
                    <button
                      onClick={() => handleViewProfile(selectedRequest)}
                      className="text-xs sm:text-sm px-3 sm:px-4 py-1.5 sm:py-2 bg-yellow-600/20 hover:bg-yellow-600/30 text-yellow-300 rounded-lg transition-colors flex items-center gap-1.5 sm:gap-2 border border-yellow-500/30 hover:border-yellow-500/50 active:scale-95"
                    >
                      <Eye className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                      <span className="hidden sm:inline">View Profile</span>
                      <span className="sm:hidden">View</span>
                    </button>
                  )}
                  <button
                    onClick={() => setShowDetailsModal(false)}
                    className="text-gray-400 hover:text-white transition-colors p-1.5 sm:p-2 hover:bg-navy-800 rounded-lg flex-shrink-0"
                    aria-label="Close modal"
                  >
                    <X className="h-5 w-5 sm:h-6 sm:w-6" />
                  </button>
                </div>

                {/* Content with Custom Scrollbar */}
                <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-3 sm:py-4 custom-scrollbar">
                  <div className="space-y-4 sm:space-y-6">
                    {/* Request Image */}
                    {selectedRequest.sample_image && (
                      <div className="relative rounded-lg overflow-hidden bg-navy-800">
                        <img
                          src={selectedRequest.sample_image}
                          alt={selectedRequest.title}
                          className="w-full h-48 sm:h-64 object-cover"
                        />
                        {selectedRequest.urgency === 'critical' && (
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
                        <h4 className="text-lg sm:text-xl lg:text-2xl font-bold text-white">{selectedRequest.title}</h4>
                        <span className="px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-full text-[10px] sm:text-xs font-semibold bg-yellow-900/30 text-yellow-300 border border-yellow-500/30 whitespace-nowrap">
                          {selectedRequest.category}
                        </span>
                      </div>
                      <p className="text-sm sm:text-base text-gray-300 leading-relaxed">{selectedRequest.description || 'No description provided'}</p>
                    </div>

                    {/* Details Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="bg-navy-800/30 rounded-lg p-4 border border-navy-700">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Package className="h-4 w-4 text-blue-400" />
                            <label className="text-sm font-semibold text-yellow-300">Quantity Needed</label>
                          </div>
                          <p className="text-white text-lg font-medium">{selectedRequest.quantity_needed}</p>
                        </div>
                      </div>
                        
                      <div className="bg-navy-800/30 rounded-lg p-4 border border-navy-700">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <User className="h-4 w-4 text-green-400" />
                            <label className="text-sm font-semibold text-yellow-300">Requested By</label>
                          </div>
                          <p className="text-white text-lg font-medium">{selectedRequest.requester?.name || 'Anonymous'}</p>
                        </div>
                      </div>
                    </div>

                    {/* Location */}
                    {(selectedRequest.location || selectedRequest.requester) && (
                      <div className="bg-navy-800/30 rounded-lg p-4 border border-navy-700">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <MapPin className="h-4 w-4 text-purple-400" />
                            <label className="text-sm font-semibold text-yellow-300">Location</label>
                          </div>
                          <p className="text-white text-center max-w-[60%] break-words">{formatLocation(selectedRequest)}</p>
                        </div>
                      </div>
                    )}
                        
                    {/* Contact */}
                    {selectedRequest.requester?.phone_number && (
                      <div className="bg-navy-800/30 rounded-lg p-4 border border-navy-700">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Phone className="h-4 w-4 text-green-400" />
                            <label className="text-sm font-semibold text-yellow-300">Contact</label>
                          </div>
                          <a
                            href={`tel:${selectedRequest.requester.phone_number}`}
                            className="text-yellow-400 hover:text-yellow-300 font-medium"
                          >
                            {selectedRequest.requester.phone_number}
                          </a>
                        </div>
                      </div>
                    )}

                    {/* Address Details */}
                    {(selectedRequest.requester?.address_street ||
                      selectedRequest.requester?.address_barangay ||
                      selectedRequest.requester?.address_landmark ||
                      selectedRequest.requester?.city ||
                      selectedRequest.requester?.province ||
                      selectedRequest.requester?.zip_code) && (
                      <div className="bg-navy-800/30 rounded-lg p-4 border border-navy-700">
                        <div className="flex items-center gap-2 mb-3">
                          <MapPin className="h-4 w-4 text-purple-400" />
                          <label className="text-sm font-semibold text-yellow-300">Address Details</label>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {selectedRequest.requester?.address_street && (
                            <div className="flex gap-4">
                              <span className="text-gray-400 w-20 flex-shrink-0">Street:</span>
                              <span className="text-white flex-1 break-words">
                                {selectedRequest.requester.address_street}
                              </span>
                            </div>
                          )}
                          {selectedRequest.requester?.address_barangay && (
                            <div className="flex gap-4">
                              <span className="text-gray-400 w-20 flex-shrink-0">Barangay:</span>
                              <span className="text-white flex-1 break-words">
                                {selectedRequest.requester.address_barangay}
                              </span>
                            </div>
                          )}
                          {selectedRequest.requester?.address_landmark && (
                            <div className="flex gap-4">
                              <span className="text-gray-400 w-20 flex-shrink-0">Landmark:</span>
                              <span className="text-white flex-1 break-words">
                                {selectedRequest.requester.address_landmark}
                              </span>
                            </div>
                          )}
                          {selectedRequest.requester?.city && (
                            <div className="flex gap-4">
                              <span className="text-gray-400 w-20 flex-shrink-0">City:</span>
                              <span className="text-white flex-1 break-words">
                                {selectedRequest.requester.city}
                              </span>
                            </div>
                          )}
                          {selectedRequest.requester?.province && (
                            <div className="flex gap-4">
                              <span className="text-gray-400 w-20 flex-shrink-0">Province:</span>
                              <span className="text-white flex-1 break-words">
                                {selectedRequest.requester.province}
                              </span>
                            </div>
                          )}
                          {selectedRequest.requester?.zip_code && (
                            <div className="flex gap-4">
                              <span className="text-gray-400 w-20 flex-shrink-0">ZIP Code:</span>
                              <span className="text-white flex-1 break-words">
                                {selectedRequest.requester.zip_code}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                        
                    {/* Dates */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="bg-navy-800/30 rounded-lg p-4 border border-navy-700">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4 text-orange-400" />
                            <label className="text-sm font-semibold text-yellow-300">Posted Date</label>
                          </div>
                          <p className="text-white">{formatDate(selectedRequest.created_at)}</p>
                        </div>
                      </div>

                      {selectedRequest.needed_by && (
                        <div className="bg-navy-800/30 rounded-lg p-4 border border-navy-700">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <Clock className="h-4 w-4 text-red-400" />
                              <label className="text-sm font-semibold text-yellow-300">Needed By</label>
                            </div>
                            <p className="text-white">{formatDate(selectedRequest.needed_by)}</p>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Tags */}
                    {selectedRequest.tags && selectedRequest.tags.length > 0 && (
                      <div className="bg-navy-800/30 rounded-lg p-4 border border-navy-700">
                        <label className="text-sm font-semibold text-yellow-300 mb-3 block">Tags</label>
                        <div className="flex flex-wrap gap-2">
                          {selectedRequest.tags.map((tag, tagIndex) => (
                            <span key={tagIndex} className="inline-flex items-center text-xs font-medium bg-navy-700 text-yellow-300 px-3 py-1.5 rounded-lg border border-yellow-500/30">
                              <Tag className="h-3 w-3 mr-1" />
                              {tag}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Action Note */}
                    <div className="bg-yellow-900/20 border border-yellow-500/20 rounded-lg p-4">
                      <p className="text-yellow-300 text-sm">
                        <strong>Want to help?</strong> Contact the requester directly or consider creating a donation that matches their needs.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Footer */}
                <div className="p-4 sm:p-6 pt-3 sm:pt-4 border-t-2 border-yellow-500/20 flex flex-col sm:flex-row justify-between gap-3 flex-shrink-0">
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

        {/* Profile Modal */}
        <AnimatePresence>
          {showProfileModal && selectedRequest && (
            <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-2 sm:p-4">
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                transition={{ duration: 0.2 }}
                className="bg-navy-900 border-2 border-yellow-500/30 shadow-2xl rounded-lg sm:rounded-xl p-3 sm:p-5 max-w-3xl w-full max-h-[95vh] sm:max-h-[90vh] overflow-y-auto overflow-x-hidden custom-scrollbar"
              >
                {/* Header */}
                <div className="flex justify-between items-center mb-3 sm:mb-4 pb-2 sm:pb-3 border-b-2 border-yellow-500/20">
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    <div className="p-1.5 bg-yellow-500/10 rounded-lg flex-shrink-0">
                      <User className="h-4 w-4 text-yellow-400" />
                    </div>
                    <h3 className="text-base sm:text-lg font-bold text-white truncate">Requester Profile</h3>
                  </div>
                  <button
                    onClick={() => setShowProfileModal(false)}
                    className="text-gray-400 hover:text-white transition-colors p-1.5 hover:bg-navy-800 rounded-lg flex-shrink-0 ml-2"
                    aria-label="Close profile modal"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>

                {/* Profile Content */}
                <div className="space-y-3 sm:space-y-4">
                  {loadingProfile ? (
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
                            onClick={() => setShowProfileImageModal(true)}
                            title="View profile picture"
                          >
                          {selectedRequest.requester?.profile_image_url ? (
                            <img 
                              src={selectedRequest.requester.profile_image_url} 
                              alt={selectedRequest.requester?.name || 'User'}
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
                            {selectedRequest.requester?.name || selectedRequest.requester?.full_name || 'Anonymous'}
                          </h4>
                          <div className="flex flex-wrap items-center gap-2 text-xs">
                            <span className="text-yellow-400 flex items-center gap-1 whitespace-nowrap">
                              <Calendar className="h-3.5 w-3.5 flex-shrink-0" />
                              {(() => {
                                const memberDate = selectedRequest.requester?.created_at || 
                                                   selectedRequest.requester?.user_created_at ||
                                                   selectedRequest.requester?.joined_at ||
                                                   selectedRequest.requester?.signup_date;
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
                            {selectedRequest.requester?.account_type && selectedRequest.requester.account_type !== 'individual' && (
                              <span className="text-yellow-400 flex items-center gap-1 whitespace-nowrap">
                                <Building2 className="h-3.5 w-3.5 flex-shrink-0" />
                                {selectedRequest.requester.account_type === 'business' ? 'Business' : 'Organization'}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* ID Verification Badge - Top Right Corner */}
                        <div className="absolute top-0 right-0 flex-shrink-0">
                          <IDVerificationBadge
                            idStatus={selectedRequest.requester?.id_verification_status}
                            hasIdUploaded={selectedRequest.requester?.primary_id_type && selectedRequest.requester?.primary_id_number}
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
                              <span className={`break-words flex-1 ${selectedRequest.requester?.birthdate ? 'text-white' : 'text-gray-400 italic'}`}>
                                {selectedRequest.requester?.birthdate ? (
                                  new Date(selectedRequest.requester.birthdate).toLocaleDateString('en-US', {
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
                              <span className={`break-words flex-1 ${selectedRequest.requester?.birthdate ? 'text-white' : 'text-gray-400 italic'}`}>
                                {selectedRequest.requester?.birthdate ? (calculateAge(selectedRequest.requester.birthdate) || 'Not available') : 'Not provided'}
                              </span>
                            </div>
                            <div className="flex items-start gap-2 min-w-0">
                              <span className="text-yellow-400 font-medium flex-shrink-0">Account Type:</span>
                              <span className={`break-words flex-1 ${selectedRequest.requester?.account_type ? 'text-white' : 'text-gray-400 italic'}`}>
                                {selectedRequest.requester?.account_type ? (selectedRequest.requester.account_type === 'business' ? 'Business/Organization' : 'Individual') : 'Not provided'}
                              </span>
                            </div>
                            {selectedRequest.requester?.account_type === 'business' && (
                              <>
                                <div className="flex items-start gap-2 min-w-0">
                                  <span className="text-yellow-400 font-medium flex-shrink-0">Organization:</span>
                                  <span className={`break-words flex-1 ${selectedRequest.requester?.organization_name ? 'text-white' : 'text-gray-400 italic'}`}>
                                    {selectedRequest.requester?.organization_name || 'Not provided'}
                                  </span>
                                </div>
                                <div className="flex items-start gap-2 min-w-0">
                                  <span className="text-yellow-400 font-medium flex-shrink-0">Website:</span>
                                  {selectedRequest.requester?.website_link ? (
                                    <a
                                      href={selectedRequest.requester.website_link}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="text-yellow-300 hover:text-yellow-200 break-all flex-1 flex items-center gap-1"
                                    >
                                      <Globe className="h-3 w-3 flex-shrink-0" />
                                      {selectedRequest.requester.website_link}
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
                                {selectedRequest.requester?.phone_number || selectedRequest.requester?.phone ? (
                                  <a
                                    href={`tel:${selectedRequest.requester.phone_number || selectedRequest.requester.phone}`}
                                    className="text-white hover:text-yellow-300 transition-colors break-all"
                                  >
                                    {selectedRequest.requester.phone_number || selectedRequest.requester.phone}
                                  </a>
                                ) : (
                                  <span className="text-gray-400 italic">Not provided</span>
                                )}
                              </span>
                            </div>
                            <div className="flex items-start gap-2 min-w-0">
                              <span className="text-yellow-400 font-medium flex-shrink-0">Email:</span>
                              <span className="text-white break-words flex-1">
                                {selectedRequest.requester?.email ? (
                                  <a
                                    href={`mailto:${selectedRequest.requester.email}`}
                                    className="text-white hover:text-yellow-300 transition-colors break-all"
                                  >
                                    {selectedRequest.requester.email}
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
                            <span className={`break-words flex-1 ${selectedRequest.requester?.address_street ? 'text-white' : 'text-gray-400 italic'}`}>
                              {selectedRequest.requester?.address_street || 'Not provided'}
                            </span>
                          </div>
                          <div className="flex items-start gap-2 min-w-0">
                            <span className="text-yellow-400 font-medium flex-shrink-0">Barangay:</span>
                            <span className={`break-words flex-1 ${selectedRequest.requester?.address_barangay ? 'text-white' : 'text-gray-400 italic'}`}>
                              {selectedRequest.requester?.address_barangay || 'Not provided'}
                            </span>
                          </div>
                          <div className="flex items-start gap-2 min-w-0">
                            <span className="text-yellow-400 font-medium flex-shrink-0">Landmark:</span>
                            <span className={`break-words flex-1 ${selectedRequest.requester?.address_landmark ? 'text-white' : 'text-gray-400 italic'}`}>
                              {selectedRequest.requester?.address_landmark || 'Not provided'}
                            </span>
                          </div>
                          <div className="flex items-start gap-2 min-w-0">
                            <span className="text-yellow-400 font-medium flex-shrink-0">City:</span>
                            <span className={`break-words flex-1 ${selectedRequest.requester?.city ? 'text-white' : 'text-gray-400 italic'}`}>
                              {selectedRequest.requester?.city || 'Not provided'}
                            </span>
                          </div>
                          <div className="flex items-start gap-2 min-w-0">
                            <span className="text-yellow-400 font-medium flex-shrink-0">Province:</span>
                            <span className={`break-words flex-1 ${selectedRequest.requester?.province ? 'text-white' : 'text-gray-400 italic'}`}>
                              {selectedRequest.requester?.province || 'Not provided'}
                            </span>
                          </div>
                          <div className="flex items-start gap-2 min-w-0">
                            <span className="text-yellow-400 font-medium flex-shrink-0">ZIP Code:</span>
                            <span className={`break-words flex-1 ${selectedRequest.requester?.zip_code ? 'text-white' : 'text-gray-400 italic'}`}>
                              {selectedRequest.requester?.zip_code || 'Not provided'}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Emergency Contact and Recipient Details - 2 Column Layout */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {/* Emergency Contact */}
                        {selectedRequest.requester?.role !== 'volunteer' && (
                          <div className="bg-navy-800/30 rounded-lg p-3 border border-yellow-500/20">
                            <h5 className="text-white font-semibold mb-2 text-sm flex items-center gap-2">
                              <AlertCircle className="h-3.5 w-3.5 text-yellow-400 flex-shrink-0" />
                              Emergency Contact
                            </h5>
                            <div className="space-y-2 text-xs sm:text-sm">
                              <div className="flex items-start gap-2 min-w-0">
                                <span className="text-yellow-400 font-medium flex-shrink-0">Name:</span>
                                <span className={`break-words flex-1 ${selectedRequest.requester?.emergency_contact_name ? 'text-white' : 'text-gray-400 italic'}`}>
                                  {selectedRequest.requester?.emergency_contact_name || 'Not provided'}
                                </span>
                              </div>
                              <div className="flex items-start gap-2 min-w-0">
                                <span className="text-yellow-400 font-medium flex-shrink-0">Phone:</span>
                                {selectedRequest.requester?.emergency_contact_phone ? (
                                  <a
                                    href={`tel:${selectedRequest.requester.emergency_contact_phone}`}
                                    className="text-white hover:text-yellow-300 transition-colors break-all flex-1"
                                  >
                                    {selectedRequest.requester.emergency_contact_phone}
                                  </a>
                                ) : (
                                  <span className="text-gray-400 italic break-words flex-1">Not provided</span>
                                )}
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Recipient-specific information */}
                        {selectedRequest.requester?.role === 'recipient' && (
                          <div className="bg-navy-800/30 rounded-lg p-3 border border-yellow-500/20">
                            <h5 className="text-white font-semibold mb-2 text-sm flex items-center gap-2">
                              <Heart className="h-3.5 w-3.5 text-yellow-400 flex-shrink-0" />
                              Recipient Details
                            </h5>
                            <div className="space-y-2 text-xs sm:text-sm">
                              <div className="flex items-start gap-2 min-w-0">
                                <span className="text-yellow-400 font-medium flex-shrink-0">Household Size:</span>
                                <span className={`break-words flex-1 ${selectedRequest.requester?.household_size ? 'text-white' : 'text-gray-400 italic'}`}>
                                  {selectedRequest.requester?.household_size ? (
                                    `${selectedRequest.requester.household_size} ${selectedRequest.requester.household_size === 1 ? 'person' : 'people'}`
                                  ) : (
                                    'Not provided'
                                  )}
                                </span>
                              </div>
                              <div className="flex items-start gap-2 min-w-0">
                                <span className="text-yellow-400 font-medium flex-shrink-0">ID Type:</span>
                                <span className={`break-words flex-1 ${selectedRequest.requester?.primary_id_type ? 'text-white' : 'text-gray-400 italic'}`}>
                                  {selectedRequest.requester?.primary_id_type ? getIDTypeLabel(selectedRequest.requester.primary_id_type) : 'No ID'}
                                </span>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Assistance Needs - Separate Container */}
                      {selectedRequest.requester?.role === 'recipient' && (
                        <div className="bg-navy-800/30 rounded-lg p-3 border border-yellow-500/20">
                          <h5 className="text-white font-semibold mb-2 text-sm flex items-center gap-2">
                            <Heart className="h-3.5 w-3.5 text-yellow-400 flex-shrink-0" />
                            Assistance Needs
                          </h5>
                          {selectedRequest.requester?.assistance_needs?.length > 0 ? (
                            <div className="flex gap-1.5 overflow-x-auto custom-scrollbar">
                              {selectedRequest.requester.assistance_needs.map((need, i) => (
                                <span key={i} className="bg-navy-700 text-xs px-2 py-1 rounded-full text-yellow-300 border border-yellow-500/30 font-medium whitespace-nowrap flex-shrink-0">
                                  {need}
                                </span>
                              ))}
                            </div>
                          ) : (
                            <p className="text-gray-400 italic text-xs">Not provided</p>
                          )}
                        </div>
                      )}

                      {/* Volunteer-specific information - 2x2 Grid */}
                      {selectedRequest.requester?.role === 'volunteer' && (
                        <div className="bg-navy-800/30 rounded-lg p-3 border border-yellow-500/20">
                          <h5 className="text-white font-semibold mb-2 text-sm flex items-center gap-2">
                            <Truck className="h-3.5 w-3.5 text-yellow-400 flex-shrink-0" />
                            Volunteer Details
                          </h5>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs sm:text-sm">
                            <div className="flex items-start gap-2 min-w-0">
                              <span className="text-yellow-400 font-medium flex-shrink-0">ID Type:</span>
                              <span className={`break-words flex-1 ${selectedRequest.requester?.primary_id_type ? 'text-white' : 'text-gray-400 italic'}`}>
                                {selectedRequest.requester?.primary_id_type ? getIDTypeLabel(selectedRequest.requester.primary_id_type) : 'Not provided'}
                              </span>
                            </div>
                            <div className="flex items-start gap-2 min-w-0">
                              <span className="text-yellow-400 font-medium flex-shrink-0">Experience:</span>
                              <span className={`break-words flex-1 ${selectedRequest.requester?.volunteer_experience ? 'text-white' : 'text-gray-400 italic'}`}>
                                {selectedRequest.requester?.volunteer_experience || 'Not provided'}
                              </span>
                            </div>
                            <div className="flex items-start gap-2 min-w-0">
                              <span className="text-yellow-400 font-medium flex-shrink-0">Insurance:</span>
                              <span className={`break-words flex-1 ${selectedRequest.requester?.has_insurance !== undefined ? 'text-white' : 'text-gray-400 italic'}`}>
                                {selectedRequest.requester?.has_insurance !== undefined ? (selectedRequest.requester.has_insurance ? 'Yes' : 'No') : 'Not provided'}
                              </span>
                            </div>
                            {selectedRequest.requester?.has_insurance && (
                              <div className="flex items-start gap-2 min-w-0">
                                <span className="text-yellow-400 font-medium flex-shrink-0">Insurance Provider:</span>
                                <span className={`break-words flex-1 ${selectedRequest.requester?.insurance_provider ? 'text-white' : 'text-gray-400 italic'}`}>
                                  {selectedRequest.requester?.insurance_provider || 'Not provided'}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Preferred Delivery Types and Special Skills - 2 Column Layout */}
                      {selectedRequest.requester?.role === 'volunteer' && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          {/* Preferred Delivery Types */}
                          <div className="bg-navy-800/30 rounded-lg p-3 border border-yellow-500/20">
                            <h5 className="text-white font-semibold mb-2 text-sm flex items-center gap-2">
                              <Truck className="h-3.5 w-3.5 text-yellow-400 flex-shrink-0" />
                              Preferred Delivery Types
                            </h5>
                            {selectedRequest.requester?.preferred_delivery_types?.length > 0 ? (
                              <div className="flex gap-1.5 overflow-x-auto custom-scrollbar">
                                {selectedRequest.requester.preferred_delivery_types.map((type, i) => (
                                  <span key={i} className="bg-navy-700 text-xs px-2 py-1 rounded-full text-yellow-300 border border-yellow-500/30 font-medium whitespace-nowrap flex-shrink-0">
                                    {type}
                                  </span>
                                ))}
                              </div>
                            ) : (
                              <p className="text-gray-400 italic text-xs">Not provided</p>
                            )}
                          </div>

                          {/* Special Skills */}
                          <div className="bg-navy-800/30 rounded-lg p-3 border border-yellow-500/20">
                            <h5 className="text-white font-semibold mb-2 text-sm flex items-center gap-2">
                              <Star className="h-3.5 w-3.5 text-yellow-400 flex-shrink-0" />
                              Special Skills
                            </h5>
                            {selectedRequest.requester?.special_skills?.length > 0 ? (
                              <div className="flex gap-1.5 overflow-x-auto custom-scrollbar">
                                {selectedRequest.requester.special_skills.map((skill, i) => (
                                  <span key={i} className="bg-navy-700 text-xs px-2 py-1 rounded-full text-yellow-300 border border-yellow-500/30 font-medium whitespace-nowrap flex-shrink-0">
                                    {skill}
                                  </span>
                                ))}
                              </div>
                            ) : (
                              <p className="text-gray-400 italic text-xs">Not provided</p>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Languages Spoken and Communication Preferences - 2 Column Layout */}
                      {selectedRequest.requester?.role === 'volunteer' && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          {/* Languages Spoken */}
                          <div className="bg-navy-800/30 rounded-lg p-3 border border-yellow-500/20">
                            <h5 className="text-white font-semibold mb-2 text-sm flex items-center gap-2">
                              <MessageSquare className="h-3.5 w-3.5 text-yellow-400 flex-shrink-0" />
                              Languages Spoken
                            </h5>
                            {selectedRequest.requester?.languages_spoken?.length > 0 ? (
                              <div className="flex gap-1.5 overflow-x-auto custom-scrollbar">
                                {selectedRequest.requester.languages_spoken.map((lang, i) => (
                                  <span key={i} className="bg-navy-700 text-xs px-2 py-1 rounded-full text-yellow-300 border border-yellow-500/30 font-medium whitespace-nowrap flex-shrink-0">
                                    {lang}
                                  </span>
                                ))}
                              </div>
                            ) : (
                              <p className="text-gray-400 italic text-xs">Not provided</p>
                            )}
                          </div>

                          {/* Communication Preferences */}
                          <div className="bg-navy-800/30 rounded-lg p-3 border border-yellow-500/20">
                            <h5 className="text-white font-semibold mb-2 text-sm flex items-center gap-2">
                              <Mail className="h-3.5 w-3.5 text-yellow-400 flex-shrink-0" />
                              Communication Preferences
                            </h5>
                            {selectedRequest.requester?.communication_preferences?.length > 0 ? (
                              <div className="flex gap-1.5 overflow-x-auto custom-scrollbar">
                                {selectedRequest.requester.communication_preferences.map((pref, i) => (
                                  <span key={i} className="bg-navy-700 text-xs px-2 py-1 rounded-full text-yellow-300 border border-yellow-500/30 font-medium whitespace-nowrap flex-shrink-0">
                                    {pref}
                                  </span>
                                ))}
                              </div>
                            ) : (
                              <p className="text-gray-400 italic text-xs">Not provided</p>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Donor-specific information */}
                      {selectedRequest.requester?.role === 'donor' && selectedRequest.requester?.donation_types?.length > 0 && (
                        <div className="bg-navy-800/30 rounded-lg p-3 border border-yellow-500/20">
                          <h5 className="text-white font-semibold mb-2 text-sm flex items-center gap-2">
                            <Gift className="h-3.5 w-3.5 text-yellow-400 flex-shrink-0" />
                            Donation Preferences
                          </h5>
                          <div className="space-y-2 text-xs sm:text-sm">
                            <div className="min-w-0">
                              <span className="text-yellow-400 font-medium block mb-1.5 text-xs">Donation Types:</span>
                              <div className="flex flex-wrap gap-1.5">
                                {selectedRequest.requester.donation_types.map((type, i) => (
                                  <span key={i} className="bg-navy-700 text-xs px-2 py-1 rounded-full text-yellow-300 border border-yellow-500/30 font-medium break-words">
                                    {type}
                                  </span>
                                ))}
                              </div>
                            </div>
                            {selectedRequest.requester?.donation_frequency && (
                              <div className="flex items-start gap-2 min-w-0">
                                <span className="text-yellow-400 font-medium flex-shrink-0">Frequency:</span>
                                <span className="text-white break-words flex-1">
                                  {selectedRequest.requester.donation_frequency}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Bio/About */}
                      <div className="bg-navy-800/30 rounded-lg p-3 border border-yellow-500/20">
                        <h5 className="text-white font-semibold mb-2 text-sm flex items-center gap-2">
                          <MessageSquare className="h-3.5 w-3.5 text-yellow-400 flex-shrink-0" />
                          About
                        </h5>
                        <p className={`text-xs sm:text-sm leading-relaxed break-words ${selectedRequest.requester?.bio ? 'text-yellow-200' : 'text-gray-400 italic'}`}>
                          {selectedRequest.requester?.bio || 'Not provided'}
                        </p>
                      </div>
                    </>
                  )}
                </div>

                {/* Footer: Proceed to donation details */}
                <div className="mt-3 sm:mt-4 pt-3 border-t border-yellow-500/20 flex flex-col sm:flex-row gap-2">
                  {selectedRequest?.requester?.id && user?.id && selectedRequest.requester.id !== user.id && (
                    <button
                      onClick={() => setShowReportModal(true)}
                      className="flex-1 px-3 py-2 bg-red-600/20 hover:bg-red-600/30 border border-red-500/50 text-red-400 rounded-lg text-sm font-semibold transition-all active:scale-95 flex items-center justify-center gap-2"
                    >
                      <Flag className="h-3.5 w-3.5" />
                      Report User
                    </button>
                  )}
                  <button
                    onClick={() => {
                      setShowProfileModal(false)
                      setShowDonationDetailsModal(true)
                    }}
                    className={`btn btn-primary text-sm py-2 ${selectedRequest?.requester?.id && user?.id && selectedRequest.requester.id !== user.id ? 'flex-1' : 'w-full'}`}
                  >
                    Donate to this Recipient
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* Profile Image Viewer Modal */}
        <AnimatePresence>
          {showProfileImageModal && selectedRequest?.requester && (
            <div className="fixed inset-0 z-[60]">
              {/* Backdrop */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setShowProfileImageModal(false)}
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
                {selectedRequest.requester?.profile_image_url ? (
                  <>
                    <img
                      src={selectedRequest.requester.profile_image_url}
                      alt={selectedRequest.requester?.name || 'Profile'}
                      className="max-w-full max-h-[85vh] w-auto h-auto object-contain rounded-lg shadow-2xl"
                    />
                    {/* Close Button */}
                    <button
                      type="button"
                      onClick={() => setShowProfileImageModal(false)}
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
                      onClick={() => setShowProfileImageModal(false)}
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
        {selectedRequest?.requester && (
          <ReportUserModal
            isOpen={showReportModal}
            onClose={() => setShowReportModal(false)}
            reportedUserId={selectedRequest.requester.id}
            reportedUserName={selectedRequest.requester.name || selectedRequest.requester.full_name}
            reportedUserRole={selectedRequest.requester.role}
          />
        )}
      </div>
    </div>
  )
}

export default BrowseRequestsPage 