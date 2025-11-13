import React, { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Package, 
  CheckCircle, 
  Search,
  Eye,
  Gift,
  MapPin,
  Calendar,
  X
} from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import { useToast } from '../../contexts/ToastContext'
import { useNavigate } from 'react-router-dom'
import { ListPageSkeleton } from '../../components/ui/Skeleton'
import { db } from '../../lib/supabase'

const MyApprovedRequestsPage = () => {
  const { user, profile } = useAuth()
  const { success, error } = useToast()
  const navigate = useNavigate()
  const [requests, setRequests] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedRequest, setSelectedRequest] = useState(null)
  const [showViewModal, setShowViewModal] = useState(false)
  
  // Filter states
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('')

  const loadRequests = useCallback(async () => {
    if (!user?.id) {
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      // Get all user requests
      const userRequests = await db.getUserDonationRequests(user.id)
      // Filter to show only fulfilled/approved requests
      const approvedRequests = (userRequests || []).filter(r => r.status === 'fulfilled')
      setRequests(approvedRequests || [])
    } catch (err) {
      console.error('Error loading approved requests:', err)
      error('Failed to load approved requests. Please try again.')
    } finally {
      setLoading(false)
    }
  }, [user?.id, error])

  useEffect(() => {
    loadRequests()
  }, [loadRequests])

  const handleViewRequest = (request) => {
    setSelectedRequest(request)
    setShowViewModal(true)
  }

  const getStatusInfo = (status) => {
    const statusMap = {
      fulfilled: { label: 'Fulfilled', color: 'bg-success-900/70 text-white' },
      open: { label: 'Open', color: 'bg-blue-900/70 text-white' },
      cancelled: { label: 'Cancelled', color: 'bg-danger-900/70 text-white' },
      expired: { label: 'Expired', color: 'bg-gray-900/70 text-white' }
    }
    return statusMap[status] || { label: status, color: 'bg-gray-900/70 text-white' }
  }

  const getUrgencyInfo = (urgency) => {
    const urgencyMap = {
      critical: { label: 'Critical', color: 'bg-danger-900/30 text-danger-300 border-danger-500/30' },
      high: { label: 'High', color: 'bg-amber-900/30 text-amber-300 border-amber-500/30' },
      medium: { label: 'Medium', color: 'bg-yellow-900/30 text-yellow-300 border-yellow-500/30' },
      low: { label: 'Low', color: 'bg-blue-900/30 text-blue-300 border-blue-500/30' }
    }
    return urgencyMap[urgency] || { label: urgency, color: 'bg-gray-900/30 text-gray-300 border-gray-500/30' }
  }

  const categories = [
    'Food & Beverages', 'Clothing & Accessories', 'Medical Supplies', 'Educational Materials', 
    'Household Items', 'Electronics & Technology', 'Toys & Recreation', 'Personal Care Items',
    'Emergency Supplies', 'Other'
  ]

  // Filter requests
  const filteredRequests = requests.filter(request => {
    const matchesSearch = !searchTerm || 
      request.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      request.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      request.category?.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesCategory = !selectedCategory || request.category === selectedCategory
    
    return matchesSearch && matchesCategory
  })

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
          className="mb-4 sm:mb-6 lg:mb-8"
        >
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex items-center">
              <div>
                <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-white">My Approved Requests</h1>
                <p className="text-xs sm:text-sm text-yellow-200">View your fulfilled donation requests</p>
              </div>
            </div>
            {/* Fulfilled Indicator Card */}
            <div className="flex items-center gap-2 px-3 sm:px-4 py-1.5 sm:py-2 bg-gradient-to-r from-yellow-500/20 to-yellow-600/20 border-2 border-yellow-500/40 rounded-full shadow-lg flex-shrink-0">
              <CheckCircle className="h-4 w-4 sm:h-5 sm:w-5 text-yellow-400 fill-yellow-400 flex-shrink-0" />
              <div className="flex items-center gap-1.5">
                <span className="text-lg sm:text-xl font-bold text-white">{requests.length}</span>
                <span className="text-xs sm:text-sm font-medium text-yellow-300">Fulfilled</span>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Filters */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="card p-4 sm:p-6 mb-4 sm:mb-6 lg:mb-8"
        >
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
            {/* Search */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 sm:h-5 sm:w-5 text-yellow-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 sm:pl-10 pr-4 py-2.5 sm:py-3 bg-navy-800 border-2 border-navy-700 rounded-lg text-sm sm:text-base text-white placeholder-gray-400 focus:outline-none focus:border-yellow-500 focus:ring-2 focus:ring-yellow-500/20 transition-all duration-200"
                placeholder="Search requests..."
              />
            </div>

            {/* Category */}
            <div className="relative w-full sm:w-auto sm:min-w-[180px]">
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="appearance-none w-full px-4 sm:px-5 py-2.5 sm:py-3 pr-10 bg-navy-800 border-2 border-navy-700 rounded-lg text-sm sm:text-base text-white font-medium focus:outline-none focus:border-yellow-500 focus:ring-2 focus:ring-yellow-500/20 transition-all duration-200 cursor-pointer hover:border-yellow-600"
              >
                <option value="">All Categories</option>
                {categories.map(category => (
                  <option key={category} value={category}>{category}</option>
                ))}
              </select>
              <Package className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-yellow-400 pointer-events-none" />
            </div>
          </div>
        </motion.div>

        {/* Requests List */}
        {filteredRequests.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-12"
          >
            <CheckCircle className="h-16 w-16 text-yellow-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">
              {requests.length === 0 ? 'No approved requests yet' : 'No matching requests'}
            </h3>
            <p className="text-yellow-400 mb-6">
              {requests.length === 0 
                ? 'Your fulfilled donation requests will appear here once they are approved by donors.' 
                : 'Try adjusting your filters to see more results.'}
            </p>
            {requests.length === 0 && (
              <button
                onClick={() => navigate('/my-requests')}
                className="btn btn-primary flex items-center mx-auto"
              >
                <Package className="h-4 w-4 mr-2" />
                View My Requests
              </button>
            )}
          </motion.div>
        ) : (
          <div className="grid grid-cols-1 gap-6">
            <AnimatePresence>
              {filteredRequests.map((request, index) => {
                const statusInfo = getStatusInfo(request.status)
                const urgencyInfo = getUrgencyInfo(request.urgency)

                return (
                  <motion.div
                    key={request.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ delay: index * 0.05 }}
                    className="card overflow-hidden hover:shadow-xl hover:border-yellow-500/30 transition-all duration-300 group"
                  >
                    <div className="flex flex-col sm:flex-row gap-4 p-4">
                      {/* Sample Image or Placeholder */}
                      <div className="flex-shrink-0">
                        {request.sample_image ? (
                          <div className="relative w-full sm:w-48 lg:w-56 h-40 sm:h-48 rounded-lg overflow-hidden border-2 border-yellow-500/30 shadow-lg">
                            <img 
                              src={request.sample_image} 
                              alt={request.title}
                              className="w-full h-full object-cover"
                            />
                          </div>
                        ) : (
                          <div className="w-full sm:w-48 lg:w-56 h-40 sm:h-48 rounded-lg bg-gradient-to-br from-navy-800 to-navy-900 flex flex-col items-center justify-center border-2 border-navy-600 shadow-lg">
                            <Gift className="h-12 w-12 sm:h-16 sm:w-16 text-yellow-400 mb-2" />
                            <span className="text-[10px] sm:text-xs text-gray-400 font-medium uppercase tracking-wide">No Image</span>
                            <span className="mt-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-success-900/30 text-success-300 border border-success-500/30">
                              Fulfilled
                            </span>
                          </div>
                        )}
                      </div>
                      
                      {/* Card Content */}
                      <div className="flex-1 min-w-0 space-y-2 sm:space-y-3">
                        {/* Header */}
                        <div className="flex flex-col sm:flex-row items-start justify-between gap-3 sm:gap-4">
                          <div className="flex-1 min-w-0">
                            <h3 className="text-base sm:text-lg lg:text-xl font-bold text-white mb-1.5 sm:mb-2">{request.title}</h3>
                            {/* Badges Row */}
                            <div className="flex flex-wrap gap-1.5 mb-3">
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-success-900/30 text-success-300 border border-success-500/30">
                                Fulfilled
                              </span>
                              <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold border ${urgencyInfo.color}`}>
                                {urgencyInfo.label}
                              </span>
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-yellow-900/30 text-yellow-300 border border-yellow-500/30">
                                {request.category}
                              </span>
                            </div>
                            <p className="text-gray-300 text-xs sm:text-sm line-clamp-2">
                              {request.description || 'No description provided'}
                            </p>
                          </div>
                          
                          {/* Action Button */}
                          <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
                            <button
                              onClick={() => handleViewRequest(request)}
                              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-navy-950 bg-yellow-400 hover:bg-yellow-500 rounded-lg transition-all active:scale-95"
                            >
                              <Eye className="h-3.5 w-3.5" />
                              <span>View</span>
                            </button>
                          </div>
                        </div>

                        {/* Details */}
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs sm:text-sm text-gray-400">
                          {request.location && (
                            <div className="flex items-center gap-1.5">
                              <MapPin className="h-3.5 w-3.5 text-yellow-400 flex-shrink-0" />
                              <span className="text-yellow-300 truncate">{request.location}</span>
                            </div>
                          )}
                          {request.needed_by && (
                            <div className="flex items-center gap-1.5">
                              <Calendar className="h-3.5 w-3.5 text-yellow-400 flex-shrink-0" />
                              <span className="text-yellow-300">Needed by: {new Date(request.needed_by).toLocaleDateString()}</span>
                            </div>
                          )}
                          {request.quantity_needed && (
                            <div className="flex items-center gap-1.5">
                              <Package className="h-3.5 w-3.5 text-yellow-400 flex-shrink-0" />
                              <span className="text-yellow-300">Quantity: {request.quantity_needed}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )
              })}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* View Request Modal */}
      {showViewModal && selectedRequest && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="bg-navy-900 border-2 border-yellow-500/20 shadow-2xl rounded-xl max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b-2 border-yellow-500/20 flex-shrink-0">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-yellow-500/10 rounded-lg">
                  <Eye className="h-6 w-6 text-yellow-400" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white">Request Details</h3>
                  <p className="text-xs text-yellow-300">View approved request information</p>
                </div>
              </div>
              <button
                onClick={() => {
                  setShowViewModal(false)
                  setSelectedRequest(null)
                }}
                className="text-gray-400 hover:text-white transition-colors p-2 hover:bg-navy-800 rounded-lg"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto px-6 py-4 custom-scrollbar">
              <div className="space-y-6">
                {/* Image */}
                {selectedRequest.sample_image && (
                  <div className="w-full h-64 rounded-lg overflow-hidden border-2 border-yellow-500/30">
                    <img 
                      src={selectedRequest.sample_image} 
                      alt={selectedRequest.title}
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}

                {/* Title and Status */}
                <div>
                  <h2 className="text-2xl font-bold text-white mb-3">{selectedRequest.title}</h2>
                  {/* Badges Row */}
                  <div className="flex flex-wrap gap-1.5 mb-3">
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-success-900/30 text-success-300 border border-success-500/30">
                      Fulfilled
                    </span>
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold border ${getUrgencyInfo(selectedRequest.urgency).color}`}>
                      {getUrgencyInfo(selectedRequest.urgency).label}
                    </span>
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-yellow-900/30 text-yellow-300 border border-yellow-500/30">
                      {selectedRequest.category}
                    </span>
                  </div>
                </div>

                {/* Description */}
                <div>
                  <h3 className="text-sm font-semibold text-yellow-300 mb-2">Description</h3>
                  <p className="text-gray-300 text-sm leading-relaxed">
                    {selectedRequest.description || 'No description provided'}
                  </p>
                </div>

                {/* Details Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {selectedRequest.location && (
                    <div className="bg-navy-800/30 rounded-lg p-4 border border-navy-700">
                      <div className="flex items-center gap-2 mb-2">
                        <MapPin className="h-4 w-4 text-yellow-400" />
                        <h4 className="text-sm font-semibold text-yellow-300">Location</h4>
                      </div>
                      <p className="text-white text-sm">{selectedRequest.location}</p>
                    </div>
                  )}
                  
                  {selectedRequest.needed_by && (
                    <div className="bg-navy-800/30 rounded-lg p-4 border border-navy-700">
                      <div className="flex items-center gap-2 mb-2">
                        <Calendar className="h-4 w-4 text-yellow-400" />
                        <h4 className="text-sm font-semibold text-yellow-300">Needed By</h4>
                      </div>
                      <p className="text-white text-sm">{new Date(selectedRequest.needed_by).toLocaleDateString()}</p>
                    </div>
                  )}
                  
                  {selectedRequest.quantity_needed && (
                    <div className="bg-navy-800/30 rounded-lg p-4 border border-navy-700">
                      <div className="flex items-center gap-2 mb-2">
                        <Package className="h-4 w-4 text-yellow-400" />
                        <h4 className="text-sm font-semibold text-yellow-300">Quantity Needed</h4>
                      </div>
                      <p className="text-white text-sm">{selectedRequest.quantity_needed}</p>
                    </div>
                  )}
                  
                  {selectedRequest.delivery_mode && (
                    <div className="bg-navy-800/30 rounded-lg p-4 border border-navy-700">
                      <div className="flex items-center gap-2 mb-2">
                        <Package className="h-4 w-4 text-yellow-400" />
                        <h4 className="text-sm font-semibold text-yellow-300">Delivery Mode</h4>
                      </div>
                      <p className="text-white text-sm capitalize">{selectedRequest.delivery_mode.replace('_', ' ')}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-3 p-6 border-t-2 border-yellow-500/20 flex-shrink-0">
              <button
                onClick={() => {
                  setShowViewModal(false)
                  setSelectedRequest(null)
                }}
                className="btn btn-secondary"
              >
                Close
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  )
}

export default MyApprovedRequestsPage
