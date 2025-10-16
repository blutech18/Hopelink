import React, { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
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
  X
} from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import { useToast } from '../../contexts/ToastContext'
import { ListPageSkeleton } from '../../components/ui/Skeleton'
import { db } from '../../lib/supabase'
import { intelligentMatcher } from '../../lib/matchingAlgorithm'

const BrowseRequestsPage = () => {
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
      
      // Load requests
      const requests = await db.getRequests({ status: 'open' })
      setRequests(requests || [])
      
      // Load user's donations for matching
      if (user?.id) {
        const donations = await db.getDonations({ donor_id: user.id, status: 'available' })
        setUserDonations(donations || [])
        
        // Calculate matching scores for each request
        const requestsWithMatchingScores = await Promise.all(
          (requests || []).map(async (request) => {
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
      // Set basic request info immediately for better UX
      setSelectedRequest(request)
      setShowDetailsModal(true)
      
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
      // Don't show error to user as this is an enhancement, not critical functionality
    } finally {
      setLoadingProfile(false)
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
    if (!request.bestMatchingDonation) return
    
    try {
      setLoading(true)
      await db.createSmartMatch(request.id, request.bestMatchingDonation.id)
      success(`Smart match created! Your donation "${request.bestMatchingDonation.title}" has been matched with "${request.title}"`)
      await loadRequests() // Refresh the list
    } catch (err) {
      console.error('Error creating smart match:', err)
      error('Failed to create smart match. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const getScoreColor = (score) => {
    if (score >= 0.9) return 'text-green-400 bg-green-900/20 border-green-500/20'
    if (score >= 0.75) return 'text-blue-400 bg-blue-900/20 border-blue-500/20'
    if (score >= 0.6) return 'text-yellow-400 bg-yellow-900/20 border-yellow-500/20'
    if (score >= 0.4) return 'text-orange-400 bg-orange-900/20 border-orange-500/20'
    return 'text-red-400 bg-red-900/20 border-red-500/20'
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
    <div className="min-h-screen py-8" style={{backgroundColor: '#00237d'}}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold text-white mb-2">Browse Requests</h1>
              <p className="text-yellow-200">Find recipients who need your help with AI-powered matching</p>
            </div>
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2 text-skyblue-400">
                <Heart className="h-5 w-5" />
                <span className="text-sm">{filteredRequests.length} requests available</span>
              </div>
              {smartRecommendations.length > 0 && (
                <div className="flex items-center space-x-2 text-green-400">
                  <span className="h-2 w-2 bg-green-400 rounded-full animate-pulse"></span>
                  <span className="text-sm">{smartRecommendations.length} smart matches</span>
                </div>
              )}
            </div>
          </div>
        </motion.div>

        {/* Smart Recommendations */}
        {smartRecommendations.length > 0 && showRecommendations && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="rounded-lg p-6 mb-8 border border-gray-600"
            style={{backgroundColor: '#001a5c'}}
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-3">
                <div className="h-8 w-8 bg-green-500/20 rounded-full flex items-center justify-center">
                  <span className="text-green-400 text-sm font-bold">🤖</span>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-white">Smart Match Recommendations</h3>
                  <p className="text-sm text-yellow-200">High-compatibility matches based on your available donations</p>
                </div>
              </div>
              <button
                onClick={() => setShowRecommendations(false)}
                className="text-skyblue-400 hover:text-white transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {smartRecommendations.map((request) => (
                <div key={request.id} className="rounded-lg p-4 border border-gray-600" style={{backgroundColor: '#001a5c'}}>
                  <div className="flex items-start justify-between mb-3">
                    <h4 className="font-medium text-white text-sm">{request.title}</h4>
                    <div className={`badge text-xs ${getScoreColor(request.matchingScore)}`}>
                      {Math.round(request.matchingScore * 100)}%
                    </div>
                  </div>
                  
                  <p className="text-xs text-yellow-200 mb-3 line-clamp-2">
                    Matches your: {request.bestMatchingDonation?.title}
                  </p>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-green-400">{request.matchReason}</span>
                    <button
                      onClick={() => handleCreateSmartMatch(request)}
                      disabled={loading}
                      className="px-3 py-1 bg-green-600 hover:bg-green-700 text-white text-xs rounded-md transition-colors disabled:opacity-50"
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
          transition={{ delay: 0.1 }}
          className="card p-6 mb-8"
        >
          <div className="flex items-center space-x-4 mb-4">
            <Filter className="h-5 w-5 text-skyblue-400" />
            <h2 className="text-lg font-semibold text-white">Filters</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Search */}
            <div>
              <label className="block text-sm font-medium text-white mb-2">Search</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="input pl-10"
                  placeholder="Search requests..."
                />
              </div>
            </div>

            {/* Category */}
            <div>
              <label className="block text-sm font-medium text-white mb-2">Category</label>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="input"
              >
                <option value="">All Categories</option>
                {categories.map(category => (
                  <option key={category} value={category}>{category}</option>
                ))}
              </select>
            </div>

            {/* Urgency */}
            <div>
              <label className="block text-sm font-medium text-white mb-2">Urgency</label>
              <select
                value={selectedUrgency}
                onChange={(e) => setSelectedUrgency(e.target.value)}
                className="input"
              >
                <option value="">All Urgency Levels</option>
                {urgencyLevels.map(level => (
                  <option key={level.value} value={level.value}>{level.label}</option>
                ))}
              </select>
            </div>
          </div>
        </motion.div>

        {/* Requests Grid */}
        {filteredRequests.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-12"
          >
            <Heart className="h-16 w-16 text-skyblue-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">No requests found</h3>
            <p className="text-skyblue-400">
              {searchTerm || selectedCategory || selectedUrgency
                ? 'Try adjusting your filters to see more results.'
                : 'There are no open requests at the moment.'}
            </p>
          </motion.div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <AnimatePresence>
              {filteredRequests.map((request, index) => {
                const urgencyInfo = getUrgencyInfo(request.urgency)
                return (
                  <motion.div
                    key={request.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ delay: index * 0.1 }}
                    className="card p-6 hover:shadow-lg transition-shadow cursor-pointer"
                    onClick={() => handleViewDetails(request)}
                  >
                    {/* Request Header */}
                    <div className="flex items-start justify-between mb-4">
                      <h3 className="text-lg font-semibold text-white truncate pr-2">
                        {request.title}
                      </h3>
                      <div className={`badge ${urgencyInfo.color} flex-shrink-0`}>
                        {request.urgency === 'critical' && <AlertCircle className="h-3 w-3 mr-1" />}
                        {urgencyInfo.label}
                      </div>
                    </div>

                    {/* Description */}
                    <p className="text-skyblue-300 text-sm mb-4 line-clamp-2">
                      {request.description || 'No description provided'}
                    </p>

                    {/* Details */}
                    <div className="space-y-2 mb-4 text-sm">
                      <div className="flex items-center text-skyblue-400">
                        <Package className="h-4 w-4 mr-2" />
                        <span>{request.category} • Qty: {request.quantity_needed}</span>
                      </div>
                      
                      <div className="flex items-center text-skyblue-400">
                        <User className="h-4 w-4 mr-2" />
                        <span>Requested by {request.requester?.name || 'Anonymous'}</span>
                      </div>
                      
                      {request.location && (
                        <div className="flex items-center text-skyblue-400">
                          <MapPin className="h-4 w-4 mr-2" />
                          <span className="truncate">{request.location}</span>
                        </div>
                      )}
                      
                      <div className="flex items-center text-skyblue-400">
                        <Calendar className="h-4 w-4 mr-2" />
                        <span>Posted {formatDate(request.created_at)}</span>
                      </div>

                      {request.needed_by && (
                        <div className="flex items-center text-amber-400">
                          <Clock className="h-4 w-4 mr-2" />
                          <span>Needed by {formatDate(request.needed_by)}</span>
                        </div>
                      )}
                    </div>

                    {/* Tags */}
                    {request.tags && request.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 mb-4">
                        {request.tags.slice(0, 3).map((tag, tagIndex) => (
                          <span key={tagIndex} className="inline-flex items-center text-xs bg-navy-800 text-skyblue-300 px-2 py-1 rounded">
                            <Tag className="h-3 w-3 mr-1" />
                            {tag}
                          </span>
                        ))}
                        {request.tags.length > 3 && (
                          <span className="text-xs text-skyblue-400">+{request.tags.length - 3} more</span>
                        )}
                      </div>
                    )}

                    {/* Matching Score */}
                    {request.matchingScore !== undefined && (
                      <div className="mb-4">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs text-skyblue-400">Compatibility Score</span>
                          <div className={`badge text-xs border ${getScoreColor(request.matchingScore)}`}>
                            {Math.round(request.matchingScore * 100)}% • {getScoreLabel(request.matchingScore)}
                          </div>
                        </div>
                        
                        {request.matchingScore > 0 && (
                          <div className="text-xs text-skyblue-300">
                            💡 {request.matchReason}
                          </div>
                        )}
                        
                        {request.bestMatchingDonation && (
                          <div className="mt-2 p-2 bg-navy-800/50 rounded text-xs">
                            <div className="text-skyblue-400 mb-1">Best match from your donations:</div>
                            <div className="text-white font-medium">{request.bestMatchingDonation.title}</div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Action Buttons */}
                    <div className="flex items-center justify-between">
                      {request.matchingScore > 0.6 && request.bestMatchingDonation ? (
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            handleCreateSmartMatch(request)
                          }}
                          disabled={loading}
                          className="px-3 py-1 bg-green-600 hover:bg-green-700 text-white text-xs rounded-md transition-colors disabled:opacity-50"
                        >
                          Smart Match
                        </button>
                      ) : (
                        <span className="text-sm text-skyblue-400">
                          Click to view details
                        </span>
                      )}
                      <ArrowRight className="h-4 w-4 text-skyblue-400" />
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
            <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                transition={{ duration: 0.2 }}
                className="bg-navy-900 border border-navy-700 shadow-xl rounded-lg p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto custom-scrollbar"
              >
                {/* Header */}
                <div className="flex justify-between items-start mb-6">
                  <div className="flex items-center space-x-3">
                    <h3 className="text-xl font-bold text-white">{selectedRequest.title}</h3>
                    <button
                      onClick={() => handleViewProfile(selectedRequest)}
                      className="text-skyblue-400 hover:text-skyblue-300 transition-colors p-1 rounded-full hover:bg-navy-700/50"
                      title="View requester profile"
                    >
                      <Eye className="h-5 w-5" />
                    </button>
                  </div>
                  <button
                    onClick={() => setShowDetailsModal(false)}
                    className="text-gray-400 hover:text-white transition-colors"
                  >
                    <X className="h-6 w-6" />
                  </button>
                </div>

                {/* Request Details */}
                <div className="space-y-6">
                  <div>
                    <h4 className="text-sm font-medium text-white mb-2">Description</h4>
                    <p className="text-skyblue-300">
                      {selectedRequest.description || 'No description provided'}
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <h4 className="text-sm font-medium text-white mb-2">Request Details</h4>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-skyblue-400">Category:</span>
                          <span className="text-white">{selectedRequest.category}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-skyblue-400">Quantity:</span>
                          <span className="text-white">{selectedRequest.quantity_needed}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-skyblue-400">Location:</span>
                          <span className="text-white">{selectedRequest.location || 'Not specified'}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-skyblue-400">Posted:</span>
                          <span className="text-white">{formatDate(selectedRequest.created_at)}</span>
                        </div>
                        {selectedRequest.needed_by && (
                          <div className="flex justify-between">
                            <span className="text-skyblue-400">Needed by:</span>
                            <span className="text-white">{formatDate(selectedRequest.needed_by)}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div>
                      <h4 className="text-sm font-medium text-white mb-2">Requester</h4>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-skyblue-400">Name:</span>
                          <span className="text-white">{selectedRequest.requester?.name || 'Anonymous'}</span>
                        </div>
                        {selectedRequest.requester?.phone_number && (
                          <div className="flex justify-between">
                            <span className="text-skyblue-400">Contact:</span>
                            <a
                              href={`tel:${selectedRequest.requester.phone_number}`}
                              className="text-skyblue-400 hover:text-skyblue-300"
                            >
                              {selectedRequest.requester.phone_number}
                            </a>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Tags */}
                  {selectedRequest.tags && selectedRequest.tags.length > 0 && (
                    <div>
                      <h4 className="text-sm font-medium text-white mb-2">Tags</h4>
                      <div className="flex flex-wrap gap-2">
                        {selectedRequest.tags.map((tag, tagIndex) => (
                          <span key={tagIndex} className="inline-flex items-center text-sm bg-navy-800 text-skyblue-300 px-3 py-1 rounded-full">
                            <Tag className="h-3 w-3 mr-1" />
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Action Note */}
                  <div className="bg-skyblue-900/20 border border-skyblue-500/20 rounded-lg p-4">
                    <p className="text-skyblue-300 text-sm">
                      <strong>Want to help?</strong> Contact the requester directly or consider creating a donation that matches their needs.
                    </p>
                  </div>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* Profile Modal */}
        <AnimatePresence>
          {showProfileModal && selectedRequest && (
            <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                transition={{ duration: 0.2 }}
                className="bg-navy-900 border border-navy-700 shadow-xl rounded-lg p-6 max-w-lg w-full max-h-[90vh] overflow-y-auto custom-scrollbar"
              >
                {/* Header */}
                <div className="flex justify-between items-start mb-6">
                  <h3 className="text-xl font-bold text-white">Requester Profile</h3>
                  <button
                    onClick={() => setShowProfileModal(false)}
                    className="text-gray-400 hover:text-white transition-colors"
                  >
                    <X className="h-6 w-6" />
                  </button>
                </div>

                {/* Profile Content */}
                <div className="space-y-6">
                  {loadingProfile ? (
                    <div className="flex justify-center py-8">
                      <LoadingSpinner />
                    </div>
                  ) : (
                    <>
                      {/* Profile Header */}
                      <div className="flex items-start space-x-4">
                        <div className="flex-shrink-0">
                          {selectedRequest.requester?.profile_image_url ? (
                            <img 
                              src={selectedRequest.requester.profile_image_url} 
                              alt={selectedRequest.requester?.name || 'User'}
                              className="h-20 w-20 rounded-full object-cover border-2 border-skyblue-500"
                            />
                          ) : (
                            <div className="h-20 w-20 rounded-full bg-navy-700 flex items-center justify-center">
                              <User className="h-10 w-10 text-skyblue-400" />
                            </div>
                          )}
                        </div>
                        
                        <div className="flex-grow">
                          <h4 className="text-white font-medium text-xl">
                            {selectedRequest.requester?.name || 'Anonymous'}
                          </h4>
                          <div className="text-skyblue-400 text-sm mt-1">
                            {selectedRequest.requester?.role && (
                              <span className="inline-flex items-center bg-skyblue-900/30 px-2 py-1 rounded text-xs mr-2">
                                {selectedRequest.requester.role.charAt(0).toUpperCase() + selectedRequest.requester.role.slice(1)}
                              </span>
                            )}
                            <span>Member since {selectedRequest.requester?.created_at ? 
                              new Date(selectedRequest.requester.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'short' }) : 
                              'Unknown'}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Contact Information */}
                      <div>
                        <h5 className="text-white font-medium mb-3">Contact Information</h5>
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span className="text-skyblue-400">Phone:</span>
                            {selectedRequest.requester?.phone_number ? (
                              <a
                                href={`tel:${selectedRequest.requester.phone_number}`}
                                className="text-white hover:text-skyblue-300"
                              >
                                {selectedRequest.requester.phone_number}
                              </a>
                            ) : (
                              <span className="text-gray-400">Not provided</span>
                            )}
                          </div>
                          <div className="flex justify-between">
                            <span className="text-skyblue-400">Email:</span>
                            {selectedRequest.requester?.email ? (
                              <a
                                href={`mailto:${selectedRequest.requester.email}`}
                                className="text-white hover:text-skyblue-300 truncate"
                              >
                                {selectedRequest.requester.email}
                              </a>
                            ) : (
                              <span className="text-gray-400">Not provided</span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Location Information */}
                      <div>
                        <h5 className="text-white font-medium mb-3">Location</h5>
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span className="text-skyblue-400">City:</span>
                            <span className="text-white">
                              {selectedRequest.requester?.city || 'Not specified'}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-skyblue-400">Province:</span>
                            <span className="text-white">
                              {selectedRequest.requester?.province || 'Not specified'}
                            </span>
                          </div>
                          {selectedRequest.requester?.address && (
                            <div className="flex justify-between">
                              <span className="text-skyblue-400">Address:</span>
                              <span className="text-white text-right">
                                {selectedRequest.requester.address}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Recipient-specific information */}
                      {selectedRequest.requester?.role === 'recipient' && (
                        <div>
                          <h5 className="text-white font-medium mb-3">Recipient Details</h5>
                          <div className="space-y-2 text-sm">
                            <div className="flex justify-between">
                              <span className="text-skyblue-400">Household Size:</span>
                              <span className="text-white">
                                {selectedRequest.requester?.household_size || 'Not specified'}
                              </span>
                            </div>
                            {selectedRequest.requester?.assistance_needs?.length > 0 && (
                              <div>
                                <span className="text-skyblue-400 block mb-2">Assistance Needs:</span>
                                <div className="flex flex-wrap gap-1">
                                  {selectedRequest.requester.assistance_needs.map((need, i) => (
                                    <span key={i} className="bg-navy-700 text-xs px-2 py-1 rounded text-skyblue-300">
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
                        <div>
                          <h5 className="text-white font-medium mb-3">About</h5>
                          <p className="text-skyblue-300 text-sm leading-relaxed">
                            {selectedRequest.requester.bio}
                          </p>
                        </div>
                      )}
                    </>
                  )}
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