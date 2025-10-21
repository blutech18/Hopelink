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
              <p className="text-yellow-300">Find recipients who need your help with AI-powered matching</p>
            </div>
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2 text-yellow-300">
                <Heart className="h-5 w-5" />
                <span className="text-sm">{filteredRequests.length} requests available</span>
              </div>
              {smartRecommendations.length > 0 && (
                <div className="flex items-center space-x-2 text-yellow-300">
                  <span className="h-2 w-2 bg-yellow-400 rounded-full animate-pulse"></span>
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
            className="bg-yellow-900/10 border-2 border-yellow-500/30 rounded-lg p-6 mb-8"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-3">
                <div className="h-8 w-8 bg-yellow-500/20 rounded-full flex items-center justify-center">
                  <span className="text-yellow-400 text-sm font-bold">🤖</span>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-white">Smart Match Recommendations</h3>
                  <p className="text-sm text-yellow-300">High-compatibility matches based on your available donations</p>
                </div>
              </div>
              <button
                onClick={() => setShowRecommendations(false)}
                className="text-gray-400 hover:text-white transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
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
          className="card p-6 mb-8"
        >
          <div className="flex flex-wrap gap-4">
            {/* Search */}
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-yellow-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-navy-800 border-2 border-navy-700 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-yellow-500 focus:ring-2 focus:ring-yellow-500/20 transition-all duration-200"
                placeholder="Search requests..."
              />
            </div>

            {/* Category */}
            <div className="relative min-w-[180px]">
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
            <div className="relative min-w-[180px]">
              <select
                value={selectedUrgency}
                onChange={(e) => setSelectedUrgency(e.target.value)}
                className="appearance-none w-full px-5 py-3 pr-10 bg-navy-800 border-2 border-navy-700 rounded-lg text-white font-medium focus:outline-none focus:border-yellow-500 focus:ring-2 focus:ring-yellow-500/20 transition-all duration-200 cursor-pointer hover:border-yellow-600"
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
              className={`w-[110px] px-4 py-3 rounded-lg font-medium transition-colors duration-200 flex items-center justify-center gap-2 whitespace-nowrap border-2 ${
                searchTerm || selectedCategory || selectedUrgency
                  ? 'bg-yellow-600 hover:bg-yellow-700 text-white border-yellow-600 hover:border-yellow-700'
                  : 'bg-navy-800 hover:bg-navy-700 text-gray-400 border-navy-700'
              }`}
            >
              <X className="h-4 w-4" />
              Clear
            </button>
          </div>
        </motion.div>

        {/* Requests Grid */}
        {filteredRequests.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-12"
          >
            <Heart className="h-16 w-16 text-yellow-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">No requests found</h3>
            <p className="text-yellow-300">
              {searchTerm || selectedCategory || selectedUrgency
                ? 'Try adjusting your filters to see more results.'
                : 'There are no open requests at the moment.'}
            </p>
          </motion.div>
        ) : (
          <div className="space-y-6">
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
                    className="card hover:shadow-xl hover:border-yellow-500/20 transition-all duration-300 overflow-hidden border-l-4 border-2 border-navy-700 cursor-pointer group"
                    style={{
                      borderLeftColor: request.urgency === 'critical' ? '#ef4444' : 
                                      request.urgency === 'high' ? '#f59e0b' : 
                                      request.urgency === 'medium' ? '#fbbf24' : '#60a5fa'
                    }}
                    onClick={() => handleViewDetails(request)}
                  >
                    <div className="p-5">
                      {/* Header Section */}
                      <div className="mb-3">
                        <div className="flex items-start justify-between gap-3 mb-2">
                          <div className="flex-1">
                            <div className="flex flex-wrap items-center gap-2 mb-2">
                              <h3 className="text-lg font-bold text-white group-hover:text-yellow-300 transition-colors">
                                {request.title}
                              </h3>
                              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-yellow-900/30 text-yellow-300 border border-yellow-500/30">
                                {request.category}
                              </span>
                              <div className={`badge ${urgencyInfo.color}`}>
                                {request.urgency === 'critical' && <AlertCircle className="h-3 w-3 mr-1" />}
                                {urgencyInfo.label}
                              </div>
                            </div>
                            <p className="text-gray-300 text-sm line-clamp-2">
                              {request.description || 'No description provided'}
                            </p>
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
                                className="px-3 py-1.5 bg-yellow-600 hover:bg-yellow-700 text-white text-xs font-medium rounded-lg transition-colors disabled:opacity-50 flex items-center gap-1.5 shadow-lg hover:shadow-xl whitespace-nowrap"
                              >
                                <Heart className="h-3.5 w-3.5" />
                                Smart Match
                              </button>
                            ) : (
                              <div className="flex items-center gap-1.5 text-yellow-300">
                                <Eye className="h-4 w-4" />
                                <span className="text-sm font-medium">View</span>
                                <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Compact Details */}
                      <div className="flex flex-wrap items-center gap-3 mb-3 text-sm text-yellow-300">
                        <div className="flex items-center gap-1.5">
                          <Package className="h-4 w-4 text-blue-400" />
                          <span className="font-medium">Qty:</span>
                          <span className="text-white">{request.quantity_needed}</span>
                        </div>
                        
                        <div className="flex items-center gap-1.5">
                          <User className="h-4 w-4 text-green-400" />
                          <span className="font-medium">By:</span>
                          <span className="text-white">{request.requester?.name || 'Anonymous'}</span>
                        </div>
                        
                        {request.location && (
                          <div className="flex items-center gap-1.5">
                            <MapPin className="h-4 w-4 text-purple-400" />
                            <span className="text-white truncate max-w-[150px]">{request.location}</span>
                          </div>
                        )}
                        
                        <div className="flex items-center gap-1.5">
                          <Calendar className="h-4 w-4 text-orange-400" />
                          <span className="text-white">{formatDate(request.created_at)}</span>
                        </div>

                        {request.needed_by && (
                          <div className="flex items-center gap-1.5">
                            <Clock className="h-4 w-4 text-red-400" />
                            <span className="font-medium">Needed:</span>
                            <span className="text-white">{formatDate(request.needed_by)}</span>
                          </div>
                        )}
                      </div>

                      {/* Tags */}
                      {request.tags && request.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mb-3">
                          {request.tags.slice(0, 3).map((tag, tagIndex) => (
                            <span key={tagIndex} className="inline-flex items-center text-xs bg-navy-700 text-yellow-300 px-2 py-1 rounded border border-navy-600">
                              <Tag className="h-3 w-3 mr-1" />
                              {tag}
                            </span>
                          ))}
                          {request.tags.length > 3 && (
                            <span className="text-xs text-yellow-300">+{request.tags.length - 3}</span>
                          )}
                        </div>
                      )}

                      {/* Matching Score */}
                      {request.matchingScore !== undefined && (
                        <div className="mb-3 p-2.5 bg-yellow-900/10 border border-yellow-500/20 rounded-lg">
                          <div className="flex items-center justify-between mb-1.5">
                            <span className="text-xs font-medium text-yellow-300">Compatibility</span>
                            <div className={`badge text-xs border ${getScoreColor(request.matchingScore)}`}>
                              {Math.round(request.matchingScore * 100)}%
                            </div>
                          </div>
                          
                          {request.matchingScore > 0 && (
                            <div className="text-xs text-yellow-300">
                              💡 {request.matchReason}
                            </div>
                          )}
                          
                          {request.bestMatchingDonation && (
                            <div className="mt-1.5 p-2 bg-navy-800 border border-yellow-500/20 rounded text-xs">
                              <div className="text-yellow-300">Match: <span className="text-white font-semibold">{request.bestMatchingDonation.title}</span></div>
                            </div>
                          )}
                        </div>
                      )}
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
                className="bg-navy-900 border-2 border-yellow-500/20 shadow-2xl rounded-xl max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col"
              >
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b-2 border-yellow-500/20 flex-shrink-0">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-yellow-500/10 rounded-lg">
                      <Heart className="h-6 w-6 text-yellow-400" />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-white">Request Details</h3>
                      <p className="text-xs text-yellow-300">Complete information</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleViewProfile(selectedRequest)}
                      className="text-yellow-400 hover:text-yellow-300 transition-colors p-2 rounded-lg hover:bg-navy-800"
                      title="View requester profile"
                    >
                      <Eye className="h-5 w-5" />
                    </button>
                    <button
                      onClick={() => setShowDetailsModal(false)}
                      className="text-gray-400 hover:text-white transition-colors p-2 hover:bg-navy-800 rounded-lg"
                    >
                      <X className="h-5 w-5" />
                    </button>
                  </div>
                </div>

                {/* Content with Custom Scrollbar */}
                <div className="flex-1 overflow-y-auto px-6 py-4 custom-scrollbar">
                  <div className="space-y-6">
                    {/* Title and Status */}
                    <div className="bg-navy-800/50 rounded-lg p-4 border border-navy-700">
                      <div className="flex items-start justify-between gap-4 mb-3">
                        <h4 className="text-2xl font-bold text-white">{selectedRequest.title}</h4>
                        <span className="px-3 py-1.5 rounded-full text-xs font-semibold bg-yellow-900/30 text-yellow-300 border border-yellow-500/30 whitespace-nowrap">
                          {selectedRequest.category}
                        </span>
                      </div>
                      <p className="text-gray-300 leading-relaxed">{selectedRequest.description || 'No description provided'}</p>
                    </div>

                    {/* Details Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="bg-navy-800/30 rounded-lg p-4 border border-navy-700">
                        <div className="flex items-center gap-2 mb-2">
                          <Package className="h-4 w-4 text-blue-400" />
                          <label className="text-sm font-semibold text-yellow-300">Quantity Needed</label>
                        </div>
                        <p className="text-white text-lg font-medium">{selectedRequest.quantity_needed}</p>
                      </div>
                      
                      <div className="bg-navy-800/30 rounded-lg p-4 border border-navy-700">
                        <div className="flex items-center gap-2 mb-2">
                          <User className="h-4 w-4 text-green-400" />
                          <label className="text-sm font-semibold text-yellow-300">Requested By</label>
                        </div>
                        <p className="text-white text-lg font-medium">{selectedRequest.requester?.name || 'Anonymous'}</p>
                      </div>
                    </div>

                    {/* Location */}
                    <div className="bg-navy-800/30 rounded-lg p-4 border border-navy-700">
                      <div className="flex items-center gap-2 mb-2">
                        <MapPin className="h-4 w-4 text-purple-400" />
                        <label className="text-sm font-semibold text-yellow-300">Location</label>
                      </div>
                      <p className="text-white">{selectedRequest.location || 'Not specified'}</p>
                    </div>

                    {/* Contact Information */}
                    {selectedRequest.requester?.phone_number && (
                      <div className="bg-navy-800/30 rounded-lg p-4 border border-navy-700">
                        <div className="flex items-center gap-2 mb-2">
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
                    )}

                    {/* Dates */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="bg-navy-800/30 rounded-lg p-4 border border-navy-700">
                        <div className="flex items-center gap-2 mb-2">
                          <Calendar className="h-4 w-4 text-orange-400" />
                          <label className="text-sm font-semibold text-yellow-300">Posted Date</label>
                        </div>
                        <p className="text-white">{formatDate(selectedRequest.created_at)}</p>
                      </div>

                      {selectedRequest.needed_by && (
                        <div className="bg-navy-800/30 rounded-lg p-4 border border-navy-700">
                          <div className="flex items-center gap-2 mb-2">
                            <Clock className="h-4 w-4 text-red-400" />
                            <label className="text-sm font-semibold text-yellow-300">Needed By</label>
                          </div>
                          <p className="text-white">{formatDate(selectedRequest.needed_by)}</p>
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
                              className="h-20 w-20 rounded-full object-cover border-2 border-yellow-500"
                            />
                          ) : (
                            <div className="h-20 w-20 rounded-full bg-navy-700 flex items-center justify-center">
                              <User className="h-10 w-10 text-yellow-400" />
                            </div>
                          )}
                        </div>
                        
                        <div className="flex-grow">
                          <h4 className="text-white font-medium text-xl">
                            {selectedRequest.requester?.name || 'Anonymous'}
                          </h4>
                          <div className="text-yellow-400 text-sm mt-1">
                            {selectedRequest.requester?.role && (
                              <span className="inline-flex items-center bg-yellow-900/30 px-2 py-1 rounded text-xs mr-2">
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
                            <span className="text-yellow-400">Phone:</span>
                            {selectedRequest.requester?.phone_number ? (
                              <a
                                href={`tel:${selectedRequest.requester.phone_number}`}
                                className="text-white hover:text-yellow-300"
                              >
                                {selectedRequest.requester.phone_number}
                              </a>
                            ) : (
                              <span className="text-gray-400">Not provided</span>
                            )}
                          </div>
                          <div className="flex justify-between">
                            <span className="text-yellow-400">Email:</span>
                            {selectedRequest.requester?.email ? (
                              <a
                                href={`mailto:${selectedRequest.requester.email}`}
                                className="text-white hover:text-yellow-300 truncate"
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
                            <span className="text-yellow-400">City:</span>
                            <span className="text-white">
                              {selectedRequest.requester?.city || 'Not specified'}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-yellow-400">Province:</span>
                            <span className="text-white">
                              {selectedRequest.requester?.province || 'Not specified'}
                            </span>
                          </div>
                          {selectedRequest.requester?.address && (
                            <div className="flex justify-between">
                              <span className="text-yellow-400">Address:</span>
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
                              <span className="text-yellow-400">Household Size:</span>
                              <span className="text-white">
                                {selectedRequest.requester?.household_size || 'Not specified'}
                              </span>
                            </div>
                            {selectedRequest.requester?.assistance_needs?.length > 0 && (
                              <div>
                                <span className="text-yellow-400 block mb-2">Assistance Needs:</span>
                                <div className="flex flex-wrap gap-1">
                                  {selectedRequest.requester.assistance_needs.map((need, i) => (
                                    <span key={i} className="bg-navy-700 text-xs px-2 py-1 rounded text-yellow-300">
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
                          <p className="text-yellow-300 text-sm leading-relaxed">
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