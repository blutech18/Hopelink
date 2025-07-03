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
import LoadingSpinner from '../../components/ui/LoadingSpinner'
import { supabase } from '../../lib/supabase'

const BrowseRequestsPage = () => {
  const { user, profile } = useAuth()
  const { success, error } = useToast()
  const [requests, setRequests] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('')
  const [selectedUrgency, setSelectedUrgency] = useState('')
  const [selectedRequest, setSelectedRequest] = useState(null)
  const [showDetailsModal, setShowDetailsModal] = useState(false)

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
      const { data, error: fetchError } = await supabase
        .from('donation_requests')
        .select(`
          *,
          requester:users!requester_id(
            id,
            name,
            phone_number
          )
        `)
        .eq('status', 'open')
        .order('created_at', { ascending: false })

      if (fetchError) throw fetchError
      setRequests(data || [])
    } catch (err) {
      console.error('Error loading requests:', err)
      error('Failed to load requests. Please try again.')
    } finally {
      setLoading(false)
    }
  }, [error])

  useEffect(() => {
    loadRequests()
  }, [loadRequests])

  const filteredRequests = requests.filter(request => {
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

  const handleViewDetails = (request) => {
    setSelectedRequest(request)
    setShowDetailsModal(true)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-navy-950 flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-navy-950 py-8">
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
              <p className="text-skyblue-300">Find recipients who need your help</p>
            </div>
            <div className="flex items-center space-x-2 text-skyblue-400">
              <Heart className="h-5 w-5" />
              <span className="text-sm">{filteredRequests.length} requests available</span>
            </div>
          </div>
        </motion.div>

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

                    {/* View Details Button */}
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-skyblue-400">
                        Click to view details
                      </span>
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
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h3 className="text-xl font-semibold text-white mb-1">
                      {selectedRequest.title}
                    </h3>
                    <div className={`badge ${getUrgencyInfo(selectedRequest.urgency).color} inline-block`}>
                      {getUrgencyInfo(selectedRequest.urgency).label}
                    </div>
                  </div>
                  <button
                    onClick={() => setShowDetailsModal(false)}
                    className="text-skyblue-400 hover:text-white transition-colors"
                  >
                    <X className="h-5 w-5" />
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
      </div>
    </div>
  )
}

export default BrowseRequestsPage 