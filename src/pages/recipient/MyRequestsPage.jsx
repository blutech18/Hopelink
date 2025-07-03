import React, { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Plus, 
  Search, 
  Filter, 
  Edit3, 
  Trash2, 
  Eye,
  Calendar,
  MapPin,
  Tag,
  AlertCircle,
  CheckCircle,
  Clock,
  XCircle,
  Heart,
  Package,
  Truck,
  X
} from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import { useToast } from '../../contexts/ToastContext'
import { useNavigate } from 'react-router-dom'
import LoadingSpinner from '../../components/ui/LoadingSpinner'
import DeliveryConfirmationModal from '../../components/ui/DeliveryConfirmationModal'
import { db } from '../../lib/supabase'

const MyRequestsPage = () => {
  const { user, profile } = useAuth()
  const { success, error } = useToast()
  const navigate = useNavigate()
  const [requests, setRequests] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedStatus, setSelectedStatus] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('')
  const [deletingId, setDeletingId] = useState(null)
  const [selectedRequest, setSelectedRequest] = useState(null)
  const [showViewModal, setShowViewModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [requestToDelete, setRequestToDelete] = useState(null)
  
  // Delivery confirmation states
  const [deliveryConfirmationNotifications, setDeliveryConfirmationNotifications] = useState([])
  const [selectedConfirmationNotification, setSelectedConfirmationNotification] = useState(null)
  const [showConfirmationModal, setShowConfirmationModal] = useState(false)

  const statusOptions = [
    { value: 'open', label: 'Open', color: 'text-blue-400 bg-blue-900/20' },
    { value: 'claimed', label: 'Claimed', color: 'text-yellow-400 bg-yellow-900/20' },
    { value: 'in_progress', label: 'In Progress', color: 'text-purple-400 bg-purple-900/20' },
    { value: 'fulfilled', label: 'Fulfilled', color: 'text-green-400 bg-green-900/20' },
    { value: 'cancelled', label: 'Cancelled', color: 'text-red-400 bg-red-900/20' },
    { value: 'expired', label: 'Expired', color: 'text-gray-400 bg-gray-900/20' }
  ]

  const urgencyLevels = [
    { value: 'low', label: 'Low', color: 'text-green-400 bg-green-900/20' },
    { value: 'medium', label: 'Medium', color: 'text-yellow-400 bg-yellow-900/20' },
    { value: 'high', label: 'High', color: 'text-orange-400 bg-orange-900/20' },
    { value: 'critical', label: 'Critical', color: 'text-red-400 bg-red-900/20' }
  ]

  const categories = [
    'Food', 'Clothing', 'Medical Supplies', 'Educational Materials', 
    'Household Items', 'Electronics', 'Toys & Games', 'Books', 
    'Furniture', 'Financial Assistance', 'Transportation', 'Other'
  ]

  const loadRequests = useCallback(async () => {
    if (!user?.id) {
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      const userRequests = await db.getUserDonationRequests(user.id)
      setRequests(userRequests || [])
      
      // Load delivery confirmation notifications
      await loadDeliveryConfirmations()
    } catch (err) {
      console.error('Error loading requests:', err)
      error('Failed to load requests. Please try again.')
    } finally {
      setLoading(false)
    }
  }, [user?.id, error])

  const loadDeliveryConfirmations = useCallback(async () => {
    if (!user?.id) return

    try {
      const notifications = await db.getUserNotifications(user.id, 100)
      const deliveryConfirmationNotifications = notifications.filter(n => n.type === 'delivery_completed' && n.data?.action_required === 'confirm_delivery' && !n.read_at)
      setDeliveryConfirmationNotifications(deliveryConfirmationNotifications)
    } catch (err) {
      console.error('Error loading delivery confirmations:', err)
    }
  }, [user?.id])

  useEffect(() => {
    loadRequests()
  }, [loadRequests])

  const handleViewRequest = (request) => {
    setSelectedRequest(request)
    setShowViewModal(true)
  }

  const handleEditRequest = (request) => {
    setSelectedRequest(request)
    setShowEditModal(true)
  }

  const handleDeleteClick = (request) => {
    setRequestToDelete(request)
    setShowDeleteModal(true)
  }

  const handleDeleteConfirm = async () => {
    if (!requestToDelete) return
    
    try {
      setDeletingId(requestToDelete.id)
      await db.deleteDonationRequest(requestToDelete.id, user.id)
      success('Request deleted successfully!')
      await loadRequests()
      setShowDeleteModal(false)
      setRequestToDelete(null)
    } catch (err) {
      console.error('Error deleting request:', err)
      error(err.message || 'Failed to delete request. Please try again.')
    } finally {
      setDeletingId(null)
    }
  }

  const handleConfirmDelivery = (notification) => {
    setSelectedConfirmationNotification(notification)
    setShowConfirmationModal(true)
  }

  const handleConfirmationComplete = async (result) => {
    // Refresh notifications and requests after confirmation
    await loadDeliveryConfirmations()
    await loadRequests()
  }

  const filteredRequests = requests.filter(request => {
    const matchesSearch = request.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         request.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         request.tags?.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()))
    
    const matchesStatus = !selectedStatus || request.status === selectedStatus
    const matchesCategory = !selectedCategory || request.category === selectedCategory

    return matchesSearch && matchesStatus && matchesCategory
  })

  const getStatusInfo = (status) => {
    return statusOptions.find(option => option.value === status) || statusOptions[0]
  }

  const getUrgencyInfo = (urgency) => {
    return urgencyLevels.find(level => level.value === urgency) || urgencyLevels[1]
  }

  const getStatusIcon = (status) => {
    switch (status) {
      case 'open': return Eye
      case 'claimed': return Heart
      case 'in_progress': return Truck
      case 'fulfilled': return CheckCircle
      case 'cancelled': return XCircle
      case 'expired': return Clock
      default: return Eye
    }
  }

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  const canEdit = (request) => {
    return request.status === 'open'
  }

  const canDelete = (request) => {
    return ['open', 'cancelled', 'expired'].includes(request.status)
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
              <h1 className="text-3xl font-bold text-white mb-2">My Requests</h1>
              <p className="text-skyblue-300">Manage your donation requests and track their status</p>
            </div>
            <button
              onClick={() => navigate('/create-request')}
              className="btn btn-primary flex items-center"
            >
              <Plus className="h-4 w-4 mr-2" />
              Create Request
            </button>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="card p-4">
              <div className="text-2xl font-bold text-white">
                {requests.filter(r => r.status === 'open').length}
              </div>
              <div className="text-sm text-skyblue-400">Open Requests</div>
            </div>
            <div className="card p-4">
              <div className="text-2xl font-bold text-yellow-400">
                {requests.filter(r => r.status === 'claimed').length}
              </div>
              <div className="text-sm text-skyblue-400">Claimed</div>
            </div>
            <div className="card p-4">
              <div className="text-2xl font-bold text-green-400">
                {requests.filter(r => r.status === 'fulfilled').length}
              </div>
              <div className="text-sm text-skyblue-400">Fulfilled</div>
            </div>
            <div className="card p-4">
              <div className="text-2xl font-bold text-skyblue-400">
                {requests.length}
              </div>
              <div className="text-sm text-skyblue-400">Total Requests</div>
            </div>
          </div>
        </motion.div>

        {/* Delivery Confirmation Requests */}
        {deliveryConfirmationNotifications.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="card p-6 mb-8 border-l-4 border-amber-500"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-amber-500/10 rounded-lg">
                  <Truck className="h-6 w-6 text-amber-500" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-white">Delivery Confirmations Needed</h3>
                  <p className="text-skyblue-300 text-sm">Please confirm these completed deliveries</p>
                </div>
              </div>
              <span className="bg-amber-500/20 text-amber-400 px-3 py-1 rounded-full text-sm font-medium">
                {deliveryConfirmationNotifications.length} pending
              </span>
            </div>
            
            <div className="space-y-3">
              {deliveryConfirmationNotifications.map((notification) => (
                <div
                  key={notification.id}
                  className="bg-navy-800/50 rounded-lg p-4 flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    <CheckCircle className="h-5 w-5 text-amber-500" />
                    <div>
                      <p className="text-white font-medium">{notification.title}</p>
                      <p className="text-skyblue-300 text-sm">{notification.message}</p>
                      <p className="text-skyblue-400 text-xs mt-1">
                        Volunteer: {notification.data?.volunteer_name}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => handleConfirmDelivery(notification)}
                    className="btn btn-primary text-sm px-4 py-2"
                  >
                    Confirm Delivery
                  </button>
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

            {/* Status */}
            <div>
              <label className="block text-sm font-medium text-white mb-2">Status</label>
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="input"
              >
                <option value="">All Statuses</option>
                {statusOptions.map(status => (
                  <option key={status.value} value={status.value}>{status.label}</option>
                ))}
              </select>
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
          </div>
        </motion.div>

        {/* Requests List */}
        {filteredRequests.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-12"
          >
            <Package className="h-16 w-16 text-skyblue-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">
              {requests.length === 0 ? 'No requests yet' : 'No matching requests'}
            </h3>
            <p className="text-skyblue-400 mb-6">
              {requests.length === 0 
                ? 'Create your first request to get started receiving donations.' 
                : 'Try adjusting your filters to see more results.'}
            </p>
            {requests.length === 0 && (
              <button
                onClick={() => navigate('/create-request')}
                className="btn btn-primary flex items-center mx-auto"
              >
                <Plus className="h-4 w-4 mr-2" />
                Create First Request
              </button>
            )}
          </motion.div>
        ) : (
          <div className="space-y-6">
            <AnimatePresence>
              {filteredRequests.map((request, index) => {
                const statusInfo = getStatusInfo(request.status)
                const urgencyInfo = getUrgencyInfo(request.urgency)
                const StatusIcon = getStatusIcon(request.status)

                return (
                  <motion.div
                    key={request.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ delay: index * 0.1 }}
                    className="card p-6 hover:shadow-lg transition-shadow"
                  >
                    {/* Header Section */}
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-start space-x-3 flex-1">
                        <StatusIcon className={`h-6 w-6 mt-1 flex-shrink-0 ${statusInfo.color.split(' ')[0]}`} />
                        <div className="flex-1 min-w-0">
                          <h3 className="text-xl font-semibold text-white mb-2 truncate">
                            {request.title}
                          </h3>
                          <div className="flex flex-wrap gap-2 mb-3">
                            <span className={`badge ${statusInfo.color}`}>
                              {statusInfo.label}
                            </span>
                            <span className={`badge ${urgencyInfo.color}`}>
                              {urgencyInfo.label} Priority
                            </span>
                            <span className="badge badge-primary">
                              {request.category}
                            </span>
                            <span className="badge badge-secondary">
                              Qty: {request.quantity_needed}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center space-x-2 flex-shrink-0 ml-4">
                        <button
                          onClick={() => handleViewRequest(request)}
                          className="btn btn-secondary p-2"
                          title="View Details"
                        >
                          <Eye className="h-4 w-4" />
                        </button>

                        {canEdit(request) && (
                          <button
                            onClick={() => handleEditRequest(request)}
                            className="btn btn-secondary p-2"
                            title="Edit Request"
                          >
                            <Edit3 className="h-4 w-4" />
                          </button>
                        )}

                        {canDelete(request) && (
                          <button
                            onClick={() => handleDeleteClick(request)}
                            disabled={deletingId === request.id}
                            className="btn btn-outline-danger p-2"
                            title="Delete Request"
                          >
                            {deletingId === request.id ? (
                              <LoadingSpinner size="sm" />
                            ) : (
                              <Trash2 className="h-4 w-4" />
                            )}
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Content Section */}
                    <div className="space-y-4">
                      {/* Description */}
                      {request.description && (
                        <p className="text-skyblue-300 text-sm leading-relaxed">
                          {request.description}
                        </p>
                      )}

                      {/* Tags */}
                      {request.tags && request.tags.length > 0 && (
                        <div className="flex flex-wrap gap-2">
                          {request.tags.slice(0, 4).map((tag, tagIndex) => (
                            <span key={tagIndex} className="inline-flex items-center text-xs bg-navy-800 text-skyblue-300 px-2 py-1 rounded-full">
                              <Tag className="h-3 w-3 mr-1" />
                              {tag}
                            </span>
                          ))}
                          {request.tags.length > 4 && (
                            <span className="text-xs text-skyblue-400 px-2 py-1">
                              +{request.tags.length - 4} more
                            </span>
                          )}
                        </div>
                      )}

                      {/* Details Grid */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                        <div className="flex items-center text-skyblue-400">
                          <Calendar className="h-4 w-4 mr-2 flex-shrink-0" />
                          <span>Created {formatDate(request.created_at)}</span>
                        </div>
                        
                        {request.needed_by && (
                          <div className="flex items-center text-amber-400">
                            <Clock className="h-4 w-4 mr-2 flex-shrink-0" />
                            <span>Needed by {formatDate(request.needed_by)}</span>
                          </div>
                        )}
                        
                        {request.location && (
                          <div className="flex items-center text-skyblue-400 md:col-span-2">
                            <MapPin className="h-4 w-4 mr-2 flex-shrink-0" />
                            <span className="truncate">{request.location}</span>
                          </div>
                        )}

                        {request.claims_count > 0 && (
                          <div className="flex items-center text-green-400">
                            <Heart className="h-4 w-4 mr-2 flex-shrink-0" />
                            <span>{request.claims_count} claim(s)</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Status Notifications */}
                    {request.status === 'in_progress' && (
                      <div className="mt-4 p-3 bg-purple-900/20 rounded-lg border border-purple-500/20">
                        <div className="flex items-center text-purple-400 text-sm">
                          <Truck className="h-4 w-4 mr-2 flex-shrink-0" />
                          <span>Your request is being processed. You'll be notified when it's ready for pickup or delivery.</span>
                        </div>
                      </div>
                    )}

                    {request.status === 'fulfilled' && (
                      <div className="mt-4 p-3 bg-green-900/20 rounded-lg border border-green-500/20">
                        <div className="flex items-center text-green-400 text-sm">
                          <CheckCircle className="h-4 w-4 mr-2 flex-shrink-0" />
                          <span>Request fulfilled! Thank you for using HopeLink.</span>
                        </div>
                      </div>
                    )}
                  </motion.div>
                )
              })}
            </AnimatePresence>
          </div>
        )}

        {/* View Request Modal */}
        <AnimatePresence>
          {showViewModal && selectedRequest && (
            <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                transition={{ duration: 0.2 }}
                className="bg-navy-900 border border-navy-700 shadow-xl rounded-lg p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto custom-scrollbar"
              >
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center space-x-3">
                    {(() => {
                      const StatusIcon = getStatusIcon(selectedRequest.status)
                      const statusInfo = getStatusInfo(selectedRequest.status)
                      return <StatusIcon className={`h-6 w-6 ${statusInfo.color.split(' ')[0]}`} />
                    })()}
                    <h3 className="text-xl font-semibold text-white">Request Details</h3>
                  </div>
                  <button
                    onClick={() => setShowViewModal(false)}
                    className="text-skyblue-400 hover:text-white transition-colors"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>

                <div className="space-y-6">
                  <div>
                    <h4 className="text-lg font-semibold text-white mb-2">{selectedRequest.title}</h4>
                    <div className="flex flex-wrap gap-2 mb-4">
                      {(() => {
                        const statusInfo = getStatusInfo(selectedRequest.status)
                        const urgencyInfo = getUrgencyInfo(selectedRequest.urgency)
                        return (
                          <>
                            <span className={`badge ${statusInfo.color}`}>{statusInfo.label}</span>
                            <span className={`badge ${urgencyInfo.color}`}>{urgencyInfo.label} Priority</span>
                            <span className="badge badge-primary">{selectedRequest.category}</span>
                            <span className="badge badge-secondary">Qty: {selectedRequest.quantity_needed}</span>
                          </>
                        )
                      })()}
                    </div>
                    {selectedRequest.description && (
                      <p className="text-skyblue-300 leading-relaxed">{selectedRequest.description}</p>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <h5 className="text-sm font-medium text-white mb-3">Request Information</h5>
                      <div className="space-y-2 text-sm">
                        <div className="flex items-center text-skyblue-400">
                          <Calendar className="h-4 w-4 mr-2" />
                          <span>Created {formatDate(selectedRequest.created_at)}</span>
                        </div>
                        {selectedRequest.needed_by && (
                          <div className="flex items-center text-amber-400">
                            <Clock className="h-4 w-4 mr-2" />
                            <span>Needed by {formatDate(selectedRequest.needed_by)}</span>
                          </div>
                        )}
                        {selectedRequest.location && (
                          <div className="flex items-center text-skyblue-400">
                            <MapPin className="h-4 w-4 mr-2" />
                            <span>{selectedRequest.location}</span>
                          </div>
                        )}
                        {selectedRequest.claims_count > 0 && (
                          <div className="flex items-center text-green-400">
                            <Heart className="h-4 w-4 mr-2" />
                            <span>{selectedRequest.claims_count} claim(s)</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {selectedRequest.tags && selectedRequest.tags.length > 0 && (
                      <div>
                        <h5 className="text-sm font-medium text-white mb-3">Tags</h5>
                        <div className="flex flex-wrap gap-2">
                          {selectedRequest.tags.map((tag, index) => (
                            <span key={index} className="inline-flex items-center text-sm bg-navy-800 text-skyblue-300 px-3 py-1 rounded-full">
                              <Tag className="h-3 w-3 mr-1" />
                              {tag}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="flex justify-end space-x-3 pt-4 border-t border-navy-700">
                    {canEdit(selectedRequest) && (
                      <button
                        onClick={() => {
                          setShowViewModal(false)
                          handleEditRequest(selectedRequest)
                        }}
                        className="btn btn-secondary flex items-center"
                      >
                        <Edit3 className="h-4 w-4 mr-2" />
                        Edit Request
                      </button>
                    )}
                    <button
                      onClick={() => setShowViewModal(false)}
                      className="btn btn-primary"
                    >
                      Close
                    </button>
                  </div>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* Edit Request Modal */}
        <AnimatePresence>
          {showEditModal && selectedRequest && (
            <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                transition={{ duration: 0.2 }}
                className="bg-navy-900 border border-navy-700 shadow-xl rounded-lg p-6 max-w-md w-full"
              >
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-xl font-semibold text-white">Edit Request</h3>
                  <button
                    onClick={() => setShowEditModal(false)}
                    className="text-skyblue-400 hover:text-white transition-colors"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>

                <div className="space-y-4">
                  <p className="text-skyblue-300">
                    You will be redirected to the edit page where you can modify your request details.
                  </p>
                  
                  <div className="flex justify-end space-x-3 pt-4">
                    <button
                      onClick={() => setShowEditModal(false)}
                      className="btn btn-secondary"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => {
                        setShowEditModal(false)
                        navigate('/create-request', { 
                          state: { 
                            editMode: true, 
                            requestData: selectedRequest 
                          } 
                        })
                      }}
                      className="btn btn-primary flex items-center"
                    >
                      <Edit3 className="h-4 w-4 mr-2" />
                      Continue to Edit
                    </button>
                  </div>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* Delete Confirmation Modal */}
        <AnimatePresence>
          {showDeleteModal && requestToDelete && (
            <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                transition={{ duration: 0.2 }}
                className="bg-navy-900 border border-navy-700 shadow-xl rounded-lg p-6 max-w-md w-full"
              >
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center space-x-3">
                    <AlertCircle className="h-6 w-6 text-red-400" />
                    <h3 className="text-xl font-semibold text-white">Confirm Deletion</h3>
                  </div>
                  <button
                    onClick={() => setShowDeleteModal(false)}
                    className="text-skyblue-400 hover:text-white transition-colors"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>

                <div className="space-y-4">
                  <p className="text-skyblue-300">
                    Are you sure you want to delete this request?
                  </p>
                  
                  <div className="p-3 bg-navy-800 rounded-lg">
                    <h4 className="font-medium text-white mb-1">{requestToDelete.title}</h4>
                    <p className="text-sm text-skyblue-400">{requestToDelete.category}</p>
                  </div>

                  <p className="text-red-400 text-sm">
                    This action cannot be undone.
                  </p>
                  
                  <div className="flex justify-end space-x-3 pt-4">
                    <button
                      onClick={() => setShowDeleteModal(false)}
                      className="btn btn-secondary"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleDeleteConfirm}
                      disabled={deletingId === requestToDelete.id}
                      className="btn btn-outline-danger flex items-center"
                    >
                      {deletingId === requestToDelete.id ? (
                        <LoadingSpinner size="sm" />
                      ) : (
                        <>
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete Request
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* Delivery Confirmation Modal */}
        <DeliveryConfirmationModal
          isOpen={showConfirmationModal}
          onClose={() => setShowConfirmationModal(false)}
          notification={selectedConfirmationNotification}
          onConfirmationComplete={handleConfirmationComplete}
        />
      </div>
    </div>
  )
}

export default MyRequestsPage 