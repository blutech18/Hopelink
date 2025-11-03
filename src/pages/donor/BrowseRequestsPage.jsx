import React, { useState, useEffect, useCallback, useRef } from 'react'
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
  Gift
} from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import { useToast } from '../../contexts/ToastContext'
import { ListPageSkeleton } from '../../components/ui/Skeleton'
import { IDVerificationBadge } from '../../components/ui/VerificationBadge'
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
  const [requestsWithScores, setRequestsWithScores] = useState([])
  const [userDonations, setUserDonations] = useState([])
  const [smartRecommendations, setSmartRecommendations] = useState([])
  const [showRecommendations, setShowRecommendations] = useState(true)

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

  const loadRequests = useCallback(async () => {
    try {
      setLoading(true)
      
      // Load ranked open requests for better prioritization
      const ranked = await db.rankOpenRequests({ limit: 100 })
      const rankedRequests = (ranked || []).map(r => ({ ...r.request, _rankScore: r.score }))
      const fallbackRequests = rankedRequests.length > 0 ? rankedRequests : (await db.getRequests({ status: 'open' }))
      setRequests(fallbackRequests || [])
      
      // Load user's donations for matching
      if (user?.id) {
        const donations = await db.getDonations({ donor_id: user.id, status: 'available' })
        setUserDonations(donations || [])
        
        // Calculate matching scores for each request
        const requestsWithMatchingScores = await Promise.all(
          ((rankedRequests.length > 0 ? rankedRequests : (fallbackRequests || [])) || []).map(async (request) => {
            let bestScore = 0
            let bestDonation = null
            let matchReason = 'No compatible donations'
            
            // Find best matching donation from user's donations
            for (const donation of donations || []) {
              const itemCompatibility = intelligentMatcher.calculateItemCompatibility(
                request.category, donation.category,
                request.title, donation.title,
                request.quantity_needed, donation.quantity
              )
              
              const urgencyAlignment = intelligentMatcher.normalize.normalizeUrgencyAlignment(
                request.urgency, donation.is_urgent ? 'high' : 'medium'
              )
              
              const deliveryCompatibility = intelligentMatcher.calculateDeliveryCompatibility(
                request.delivery_mode, donation.delivery_mode
              )
              
              // Calculate geographic score if locations available
              let geographicScore = 0.5 // Default neutral score
              if (request.requester?.latitude && donation.donor?.latitude) {
                geographicScore = intelligentMatcher.calculateGeographicScore(
                  request.requester.latitude, request.requester.longitude,
                  donation.donor.latitude, donation.donor.longitude
                )
              }
              
              // Calculate weighted score
              const totalScore = (
                itemCompatibility * 0.35 +
                urgencyAlignment * 0.25 +
                deliveryCompatibility * 0.20 +
                geographicScore * 0.20
              )
              
              if (totalScore > bestScore) {
                bestScore = totalScore
                bestDonation = donation
                matchReason = intelligentMatcher.generateMatchReason({
                  item_compatibility: itemCompatibility,
                  urgency_alignment: urgencyAlignment,
                  delivery_compatibility: deliveryCompatibility,
                  geographic_proximity: geographicScore
                }, {
                  item_compatibility: 0.35,
                  urgency_alignment: 0.25,
                  delivery_compatibility: 0.20,
                  geographic_proximity: 0.20
                })
              }
            }
            
            return {
              ...request,
              matchingScore: bestScore,
              bestMatchingDonation: bestDonation,
              matchReason: matchReason
            }
          })
        )
        
        setRequestsWithScores(requestsWithMatchingScores)
        
        // Generate smart recommendations (high-scoring matches)
        const highScoreMatches = requestsWithMatchingScores
          .filter(request => request.matchingScore > 0.7)
          .sort((a, b) => b.matchingScore - a.matchingScore)
          .slice(0, 3)
        
        setSmartRecommendations(highScoreMatches)
      } else {
        setRequestsWithScores(requests || [])
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

  const filteredRequests = (requestsWithScores.length > 0 ? requestsWithScores : requests).filter(request => {
    const matchesSearch = request.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         request.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         request.tags?.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()))
    
    const matchesCategory = !selectedCategory || request.category === selectedCategory
    const matchesUrgency = !selectedUrgency || request.urgency === selectedUrgency

    return matchesSearch && matchesCategory && matchesUrgency
  })

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
        const detailedProfile = await db.getProfile(request.requester.id)
        
        // Update the selected request with detailed profile info
        setSelectedRequest(prev => ({
          ...prev,
          requester: {
            ...prev.requester,
            ...detailedProfile
          }
        }))
      }
    } catch (err) {
      console.error('Error fetching requester profile:', err)
      error('Failed to load profile information')
    } finally {
      setLoadingProfile(false)
    }
  }

  const handleCreateSmartMatch = async (request) => {
    if (!request.bestMatchingDonation) {
      error('No matching donation found for this request.')
      return
    }
    
    try {
      setLoading(true)
      await db.createSmartMatch(request.id, request.bestMatchingDonation.id)
      success(`Smart match created! Your donation "${request.bestMatchingDonation.title}" has been matched with "${request.title}"`)
      await loadRequests() // Refresh the list
    } catch (err) {
      console.error('Error creating smart match:', err)
      
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
              <p className="text-xs sm:text-sm text-yellow-300">Find recipients who need your help with smart matching</p>
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
              
              {/* Smart Matches Badge */}
              {smartRecommendations.length > 0 && (
                <div className="flex items-center gap-2 px-3 sm:px-4 py-1.5 sm:py-2 bg-gradient-to-r from-green-500/20 to-emerald-600/20 border-2 border-green-500/40 rounded-full shadow-lg">
                  <span className="h-2 w-2 bg-green-400 rounded-full animate-pulse shadow-lg shadow-green-400/50"></span>
                  <div className="flex items-center gap-1.5">
                    <span className="text-base sm:text-lg font-bold text-white">{smartRecommendations.length}</span>
                    <span className="text-xs sm:text-sm font-medium text-green-300">smart match{smartRecommendations.length !== 1 ? 'es' : ''}</span>
                  </div>
                </div>
              )}
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

        {/* Smart Recommendations */}
        {smartRecommendations.length > 0 && showRecommendations && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-yellow-900/10 border-2 border-yellow-500/30 rounded-lg p-4 sm:p-6 mb-6 sm:mb-8"
          >
            <div className="flex items-start sm:items-center justify-between mb-4 gap-2">
              <div className="flex items-start sm:items-center space-x-2 sm:space-x-3 flex-1">
                <div className="h-6 w-6 sm:h-8 sm:w-8 bg-yellow-500/20 rounded-full flex items-center justify-center flex-shrink-0">
                  <span className="text-yellow-400 text-xs sm:text-sm font-bold">🤖</span>
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm sm:text-base lg:text-lg font-semibold text-white">Smart Match Recommendations</h3>
                  <p className="text-xs sm:text-sm text-yellow-300">High-compatibility matches</p>
                </div>
              </div>
              <button
                onClick={() => setShowRecommendations(false)}
                className="text-gray-400 hover:text-white transition-colors flex-shrink-0"
              >
                <X className="h-4 w-4 sm:h-5 sm:w-5" />
              </button>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
              {smartRecommendations.map((request) => (
                <div key={request.id} className="bg-navy-800 border border-yellow-500/20 rounded-lg p-4">
                  <div className="flex items-start justify-between mb-3">
                    <h4 className="font-medium text-white text-sm">{request.title}</h4>
                    <div className={`badge text-xs ${getScoreColor(request.matchingScore)}`}>
                      {Math.round(request.matchingScore * 100)}%
                    </div>
                  </div>
                  
                  <p className="text-xs text-yellow-300 mb-3 line-clamp-2">
                    Matches your: {request.bestMatchingDonation?.title}
                  </p>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-yellow-300">{request.matchReason}</span>
                    <button
                      onClick={() => handleCreateSmartMatch(request)}
                      disabled={loading}
                      className="px-3 py-1 bg-yellow-600 hover:bg-yellow-700 text-white text-xs rounded-md transition-colors disabled:opacity-50"
                    >
                      Auto Match
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
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
                    className="card hover:shadow-xl hover:border-yellow-500/20 transition-all duration-300 overflow-hidden border-l-4 border-2 border-navy-700 cursor-pointer group active:scale-[0.99]"
                    style={{
                      borderLeftColor: request.urgency === 'critical' ? '#ef4444' : 
                                      request.urgency === 'high' ? '#f59e0b' : 
                                      request.urgency === 'medium' ? '#fbbf24' : '#60a5fa'
                    }}
                    onClick={() => handleViewDetails(request)}
                  >
                    <div className="flex flex-col sm:flex-row gap-4 p-4">
                      {/* Sample Image or Placeholder */}
                      <div className="flex-shrink-0">
                        {request.sample_image ? (
                          <div className="relative w-full sm:w-56 lg:w-64 h-36 sm:h-full rounded-lg overflow-hidden border-2 border-yellow-500/30">
                            <img 
                              src={request.sample_image} 
                              alt={request.title}
                              className="w-full h-full object-cover"
                            />
                          </div>
                        ) : (
                          <div className="w-full sm:w-56 lg:w-64 h-36 sm:h-full rounded-lg bg-gradient-to-br from-navy-800 to-navy-900 flex flex-col items-center justify-center border-2 border-navy-600">
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
                                {request.title}
                              </h3>
                            </div>
                            
                            {/* Badges Row */}
                            <div className="flex flex-wrap gap-1.5 mb-3">
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-yellow-900/30 text-yellow-300 border border-yellow-500/30">
                                {request.category}
                              </span>
                              <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold border ${urgencyInfo.color}`}>
                                {urgencyInfo.label}
                              </span>
                            </div>
                          </div>
                          
                          {/* Action Buttons */}
                          <div className="flex items-center gap-2 flex-shrink-0">
                            {request.matchingScore > 0.6 && request.bestMatchingDonation ? (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation()
                                  handleCreateSmartMatch(request)
                                }}
                                disabled={loading}
                                className="px-3 py-2 bg-gradient-to-r from-yellow-500 to-yellow-600 hover:from-yellow-600 hover:to-yellow-700 text-white text-xs font-semibold rounded-lg transition-all disabled:opacity-50 flex items-center gap-1.5 shadow-lg hover:shadow-xl whitespace-nowrap active:scale-95"
                              >
                                <Heart className="h-3.5 w-3.5" />
                                <span>Smart Match</span>
                              </button>
                            ) : (
                              <>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    handleViewDetails(request)
                                  }}
                                  className="px-3 py-2 bg-navy-700 hover:bg-navy-600 text-yellow-300 hover:text-white text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5 border border-navy-600 hover:border-yellow-500/50 shadow-md hover:shadow-lg active:scale-95"
                                >
                                  <Eye className="h-3.5 w-3.5" />
                                  <span>View</span>
                                </button>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    handleDonateToRequest(request)
                                  }}
                                  className="px-3 py-2 bg-gradient-to-r from-yellow-500 to-yellow-600 hover:from-yellow-600 hover:to-yellow-700 text-white text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5 shadow-md hover:shadow-lg active:scale-95"
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
                        <div className="grid grid-cols-2 gap-x-4 gap-y-1 mb-3 text-xs">
                          <div className="flex items-center gap-1.5">
                            <Package className="h-3.5 w-3.5 text-yellow-400 flex-shrink-0" />
                            <span className="text-yellow-400 font-medium">Quantity:</span>
                            <span className="text-white font-semibold">{request.quantity_needed}</span>
                          </div>
                          
                          <div className="flex items-center gap-1.5">
                            <User className="h-3.5 w-3.5 text-yellow-400 flex-shrink-0" />
                            <span className="text-yellow-400 font-medium">By:</span>
                            <span className="text-white">{request.requester?.name || 'Anonymous'}</span>
                          </div>
                          
                          <div className="flex items-center gap-1.5">
                            <Calendar className="h-3.5 w-3.5 text-yellow-400 flex-shrink-0" />
                            <span className="text-yellow-400 font-medium">Posted:</span>
                            <span className="text-gray-300">{formatDate(request.created_at)}</span>
                          </div>

                          {request.needed_by && (
                            <div className="flex items-center gap-1.5">
                              <Clock className="h-3.5 w-3.5 text-amber-400 flex-shrink-0" />
                              <span className="text-amber-400 font-medium">Deadline:</span>
                              <span className="text-amber-300 font-semibold">{formatDate(request.needed_by)}</span>
                            </div>
                          )}
                          
                          {request.location && (
                            <div className="flex items-center gap-1.5 col-span-2">
                              <MapPin className="h-3.5 w-3.5 text-yellow-400 flex-shrink-0" />
                              <span className="text-yellow-400 font-medium">Location:</span>
                              <span className="text-gray-300 truncate">{request.location}</span>
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

                      {/* Matching Score */}
                      {request.matchingScore !== undefined && request.matchingScore > 0 && (
                        <div className="p-3 sm:p-4 bg-gradient-to-r from-yellow-900/10 to-yellow-800/10 border-2 border-yellow-500/30 rounded-lg">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-xs sm:text-sm font-semibold text-yellow-300">🎯 Compatibility Score</span>
                            <div className={`badge text-xs sm:text-sm font-bold border-2 ${getScoreColor(request.matchingScore)}`}>
                              {Math.round(request.matchingScore * 100)}%
                            </div>
                          </div>
                          
                          <div className="text-xs sm:text-sm text-yellow-200 mb-2">
                            💡 {request.matchReason}
                          </div>
                          
                          {request.bestMatchingDonation && (
                            <div className="p-2 sm:p-3 bg-navy-800/50 border border-yellow-500/30 rounded-lg">
                              <div className="text-xs sm:text-sm text-yellow-300">Your matching donation: <span className="text-white font-bold">{request.bestMatchingDonation.title}</span></div>
                            </div>
                          )}
                        </div>
                      )}
                      </div>
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
                <div className="flex items-center justify-between p-4 sm:p-6 border-b-2 border-yellow-500/20 flex-shrink-0">
                  <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
                    <div className="p-1.5 sm:p-2 bg-yellow-500/10 rounded-lg flex-shrink-0">
                      <Heart className="h-5 w-5 sm:h-6 sm:w-6 text-yellow-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-base sm:text-lg lg:text-xl font-bold text-white truncate">Request Details</h3>
                      <p className="text-[10px] sm:text-xs text-yellow-300">Complete information</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button
                      onClick={() => handleViewProfile(selectedRequest)}
                      className="px-3 py-1.5 bg-yellow-600 hover:bg-yellow-700 text-white text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5 active:scale-95"
                    >
                      <Eye className="h-3.5 w-3.5" />
                      <span>View Profile</span>
                    </button>
                    <button
                      onClick={() => setShowDetailsModal(false)}
                      className="text-gray-400 hover:text-white transition-colors p-1.5 sm:p-2 hover:bg-navy-800 rounded-lg active:scale-95"
                      aria-label="Close modal"
                    >
                      <X className="h-4 w-4 sm:h-5 sm:w-5" />
                    </button>
                  </div>
                </div>

                {/* Content with Custom Scrollbar */}
                <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-3 sm:py-4 custom-scrollbar">
                  <div className="space-y-4 sm:space-y-6">
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

                    {/* Compact Details Grid */}
                    <div className="bg-navy-800/30 rounded-lg p-3 border border-navy-700">
                      <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                        <div className="flex items-center gap-1.5">
                          <Package className="h-3.5 w-3.5 text-blue-400 flex-shrink-0" />
                          <span className="text-yellow-300 font-medium">Quantity:</span>
                          <span className="text-white font-semibold">{selectedRequest.quantity_needed}</span>
                        </div>
                        
                        <div className="flex items-center gap-1.5">
                          <User className="h-3.5 w-3.5 text-green-400 flex-shrink-0" />
                          <span className="text-yellow-300 font-medium">By:</span>
                          <span className="text-white font-semibold">{selectedRequest.requester?.name || 'Anonymous'}</span>
                        </div>
                        
                        <div className="flex items-center gap-1.5">
                          <Calendar className="h-3.5 w-3.5 text-orange-400 flex-shrink-0" />
                          <span className="text-yellow-300 font-medium">Posted:</span>
                          <span className="text-white">{formatDate(selectedRequest.created_at)}</span>
                        </div>

                        {selectedRequest.needed_by && (
                          <div className="flex items-center gap-1.5">
                            <Clock className="h-3.5 w-3.5 text-red-400 flex-shrink-0" />
                            <span className="text-yellow-300 font-medium">Deadline:</span>
                            <span className="text-white">{formatDate(selectedRequest.needed_by)}</span>
                          </div>
                        )}
                        
                        {selectedRequest.requester?.phone_number && (
                          <div className="flex items-center gap-1.5 col-span-2">
                            <Phone className="h-3.5 w-3.5 text-green-400 flex-shrink-0" />
                            <span className="text-yellow-300 font-medium">Contact:</span>
                            <a
                              href={`tel:${selectedRequest.requester.phone_number}`}
                              className="text-yellow-400 hover:text-yellow-300 font-medium"
                            >
                              {selectedRequest.requester.phone_number}
                            </a>
                          </div>
                        )}
                        
                        <div className="flex items-center gap-1.5 col-span-2">
                          <MapPin className="h-3.5 w-3.5 text-purple-400 flex-shrink-0" />
                          <span className="text-yellow-300 font-medium">Location:</span>
                          <span className="text-white truncate">{selectedRequest.location || 'Not specified'}</span>
                        </div>
                      </div>
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
                <div className="p-6 pt-4 border-t-2 border-yellow-500/20 flex justify-end flex-shrink-0">
                  <button
                    onClick={() => setShowDetailsModal(false)}
                    className="px-6 py-2.5 bg-navy-800 hover:bg-navy-700 text-white rounded-lg font-medium transition-colors border border-navy-600"
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
                      <User className="h-4 w-4 sm:h-5 sm:w-5 text-yellow-400" />
                    </div>
                    <h3 className="text-lg sm:text-xl font-bold text-white">Requester Profile</h3>
                  </div>
                  <button
                    onClick={() => setShowProfileModal(false)}
                    className="text-gray-400 hover:text-white transition-colors p-1.5 sm:p-2 hover:bg-navy-800 rounded-lg"
                    aria-label="Close profile modal"
                  >
                    <X className="h-5 w-5 sm:h-6 sm:w-6" />
                  </button>
                </div>

                {/* Profile Content */}
                <div className="space-y-4 sm:space-y-6">
                  {loadingProfile ? (
                    <div className="flex flex-col items-center justify-center py-8 sm:py-12">
                      <div className="animate-spin rounded-full h-10 w-10 sm:h-12 sm:w-12 border-b-2 border-yellow-400 mb-3"></div>
                      <p className="text-yellow-300 text-sm">Loading profile...</p>
                    </div>
                  ) : (
                    <>
                      {/* Profile Header */}
                      <div className="flex flex-col sm:flex-row items-center sm:items-start gap-3 sm:gap-4">
                        <div className="flex-shrink-0">
                          {selectedRequest.requester?.profile_image_url ? (
                            <img 
                              src={selectedRequest.requester.profile_image_url} 
                              alt={selectedRequest.requester?.name || 'User'}
                              className="h-20 w-20 sm:h-24 sm:w-24 rounded-full object-cover border-2 border-yellow-500 shadow-lg"
                            />
                          ) : (
                            <div className="h-20 w-20 sm:h-24 sm:w-24 rounded-full bg-navy-700 flex items-center justify-center border-2 border-yellow-500/30 shadow-lg">
                              <User className="h-10 w-10 sm:h-12 sm:w-12 text-yellow-400" />
                            </div>
                          )}
                        </div>
                        
                        <div className="flex-grow text-center sm:text-left">
                          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-2">
                            <h4 className="text-white font-bold text-lg sm:text-xl">
                              {selectedRequest.requester?.name || selectedRequest.requester?.full_name || 'Anonymous'}
                            </h4>
                            <div className="flex justify-center sm:justify-end">
                              <IDVerificationBadge
                                idStatus={selectedRequest.requester?.id_verification_status}
                                hasIdUploaded={selectedRequest.requester?.primary_id_type && selectedRequest.requester?.primary_id_number}
                                size="sm"
                                showText={true}
                                showDescription={false}
                              />
                            </div>
                          </div>
                          <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 text-xs sm:text-sm">
                            <span className="text-yellow-400 flex items-center gap-1">
                              <Calendar className="h-3.5 w-3.5" />
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
                                        month: 'long', 
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
                          </div>
                        </div>
                      </div>

                      {/* Contact & Location Information - 2 Column Layout */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Contact Information */}
                        <div className="bg-navy-800/30 rounded-lg p-4 border border-yellow-500/20">
                          <h5 className="text-white font-semibold mb-3 flex items-center gap-2">
                            <Phone className="h-4 w-4 text-yellow-400" />
                            Contact Information
                          </h5>
                          <div className="space-y-3 text-sm">
                            <div className="flex items-start justify-between gap-4">
                              <span className="text-yellow-400 font-medium">Phone:</span>
                              {selectedRequest.requester?.phone_number || selectedRequest.requester?.phone ? (
                                <a
                                  href={`tel:${selectedRequest.requester.phone_number || selectedRequest.requester.phone}`}
                                  className="text-white hover:text-yellow-300 transition-colors flex items-center gap-1"
                                >
                                  <Phone className="h-3.5 w-3.5" />
                                  {selectedRequest.requester.phone_number || selectedRequest.requester.phone}
                                </a>
                              ) : (
                                <span className="text-gray-400 italic">Not provided</span>
                              )}
                            </div>
                            <div className="flex items-start justify-between gap-4">
                              <span className="text-yellow-400 font-medium">Email:</span>
                              {selectedRequest.requester?.email ? (
                                <a
                                  href={`mailto:${selectedRequest.requester.email}`}
                                  className="text-white hover:text-yellow-300 transition-colors break-all text-right"
                                >
                                  {selectedRequest.requester.email}
                                </a>
                              ) : (
                                <span className="text-gray-400 italic">Not provided</span>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Location Information */}
                        <div className="bg-navy-800/30 rounded-lg p-4 border border-yellow-500/20">
                          <h5 className="text-white font-semibold mb-3 flex items-center gap-2">
                            <MapPin className="h-4 w-4 text-yellow-400" />
                            Location Information
                          </h5>
                          <div className="space-y-3 text-sm">
                            <div className="flex items-start justify-between gap-4">
                              <span className="text-yellow-400 font-medium">City:</span>
                              <span className="text-white text-right">
                                {selectedRequest.requester?.city ? (
                                  selectedRequest.requester.city
                                ) : (
                                  <span className="text-gray-400 italic">Not specified</span>
                                )}
                              </span>
                            </div>
                            <div className="flex items-start justify-between gap-4">
                              <span className="text-yellow-400 font-medium">Province:</span>
                              <span className="text-white text-right">
                                {selectedRequest.requester?.province ? (
                                  selectedRequest.requester.province
                                ) : (
                                  <span className="text-gray-400 italic">Not specified</span>
                                )}
                              </span>
                            </div>
                            {selectedRequest.requester?.address_barangay && (
                              <div className="flex items-start justify-between gap-4">
                                <span className="text-yellow-400 font-medium">Barangay:</span>
                                <span className="text-white text-right">
                                  {selectedRequest.requester.address_barangay}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Full Address - Spans full width if available */}
                      {selectedRequest.requester?.address && (
                        <div className="bg-navy-800/30 rounded-lg p-4 border border-yellow-500/20">
                          <h5 className="text-white font-semibold mb-3 flex items-center gap-2">
                            <MapPin className="h-4 w-4 text-yellow-400" />
                            Full Address
                          </h5>
                          <p className="text-sm text-white leading-relaxed">
                            {selectedRequest.requester.address}
                          </p>
                        </div>
                      )}

                      {/* Recipient-specific information */}
                      {selectedRequest.requester?.role === 'recipient' && (
                        <div className="bg-navy-800/30 rounded-lg p-4 border border-yellow-500/20">
                          <h5 className="text-white font-semibold mb-3 flex items-center gap-2">
                            <Heart className="h-4 w-4 text-yellow-400" />
                            Recipient Details
                          </h5>
                          <div className="space-y-3 text-sm">
                            <div className="flex items-start justify-between gap-4">
                              <span className="text-yellow-400 font-medium">Household Size:</span>
                              <span className="text-white">
                                {selectedRequest.requester?.household_size ? 
                                  `${selectedRequest.requester.household_size} ${selectedRequest.requester.household_size === 1 ? 'person' : 'people'}` : 
                                  <span className="text-gray-400 italic">Not specified</span>
                                }
                              </span>
                            </div>
                            {selectedRequest.requester?.assistance_needs?.length > 0 && (
                              <div>
                                <span className="text-yellow-400 font-medium block mb-2">Assistance Needs:</span>
                                <div className="flex flex-wrap gap-2">
                                  {selectedRequest.requester.assistance_needs.map((need, i) => (
                                    <span key={i} className="bg-navy-700 text-xs px-3 py-1.5 rounded-full text-yellow-300 border border-yellow-500/30 font-medium">
                                      {need}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Bio/About */}
                      {selectedRequest.requester?.bio && (
                        <div className="bg-navy-800/30 rounded-lg p-4 border border-yellow-500/20">
                          <h5 className="text-white font-semibold mb-3 flex items-center gap-2">
                            <MessageSquare className="h-4 w-4 text-yellow-400" />
                            About
                          </h5>
                          <p className="text-yellow-200 text-sm leading-relaxed">
                            {selectedRequest.requester.bio}
                          </p>
                        </div>
                      )}
                    </>
                  )}
                </div>

                {/* Footer: Proceed to donation details */}
                <div className="mt-4 sm:mt-6">
                  <button
                    onClick={() => {
                      setShowProfileModal(false)
                      setShowDonationDetailsModal(true)
                    }}
                    className="btn btn-primary w-full"
                  >
                    Donate to this Recipient
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}

export default BrowseRequestsPage 