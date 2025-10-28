import React, { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useForm } from 'react-hook-form'
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
import { ListPageSkeleton } from '../../components/ui/Skeleton'
import LoadingSpinner from '../../components/ui/LoadingSpinner'
import DeliveryConfirmationModal from '../../components/ui/DeliveryConfirmationModal'
import { db } from '../../lib/supabase'

// Edit Request Modal Component
const EditRequestModal = ({ request, onClose, onSuccess }) => {
  const { success, error } = useToast()
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm({
    defaultValues: {
      title: request.title || '',
      description: request.description || '',
      category: request.category || '',
      quantity_needed: request.quantity_needed || 1,
      urgency: request.urgency || 'medium',
      needed_by: request.needed_by || '',
      location: request.location || '',
      delivery_mode: request.delivery_mode || ''
    }
  })

  const categories = [
    'Food', 'Clothing', 'Medical Supplies', 'Educational Materials', 
    'Household Items', 'Electronics', 'Toys & Games', 'Books', 
    'Furniture', 'Financial Assistance', 'Transportation', 'Other'
  ]

  const urgencyLevels = [
    { value: 'low', label: 'Low' },
    { value: 'medium', label: 'Medium' },
    { value: 'high', label: 'High' },
    { value: 'critical', label: 'Critical' }
  ]

  const onSubmit = async (data) => {
    try {
      await db.updateDonationRequest(request.id, data)
      success('Request updated successfully!')
      onSuccess()
      onClose()
    } catch (err) {
      console.error('Error updating request:', err)
      error('Failed to update request. Please try again.')
    }
  }

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
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
              <Edit3 className="h-6 w-6 text-yellow-400" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-white">Edit Request</h3>
              <p className="text-xs text-yellow-300">Update request information</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors p-2 hover:bg-navy-800 rounded-lg"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content with Custom Scrollbar */}
        <div className="flex-1 overflow-y-auto px-6 py-4 custom-scrollbar">
          <form onSubmit={handleSubmit(onSubmit)} id="edit-request-form" className="space-y-6">
            {/* Basic Information */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-white mb-2">
                  Request Title *
                </label>
                <input
                  {...register('title', {
                    required: 'Title is required',
                    minLength: { value: 5, message: 'Title must be at least 5 characters' }
                  })}
                  className="input"
                  placeholder="e.g., Need Winter Clothes for Children"
                />
                {errors.title && (
                  <p className="mt-1 text-sm text-red-400">{errors.title.message}</p>
                )}
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-white mb-2">
                  Description
                </label>
                <textarea
                  {...register('description', {
                    maxLength: { value: 1000, message: 'Description must be less than 1000 characters' }
                  })}
                  className="input h-24 resize-none"
                  placeholder="Describe what you need and why..."
                />
                {errors.description && (
                  <p className="mt-1 text-sm text-red-400">{errors.description.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-white mb-2">
                  Category *
                </label>
                <select
                  {...register('category', { required: 'Category is required' })}
                  className="input"
                >
                  <option value="">Select a category</option>
                  {categories.map(category => (
                    <option key={category} value={category}>
                      {category}
                    </option>
                  ))}
                </select>
                {errors.category && (
                  <p className="mt-1 text-sm text-red-400">{errors.category.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-white mb-2">
                  Quantity *
                </label>
                <input
                  {...register('quantity_needed', {
                    required: 'Quantity is required',
                    min: { value: 1, message: 'Quantity must be at least 1' }
                  })}
                  type="number"
                  className="input"
                  placeholder="1"
                  min="1"
                />
                {errors.quantity_needed && (
                  <p className="mt-1 text-sm text-red-400">{errors.quantity_needed.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-white mb-2">
                  Urgency Level *
                </label>
                <select
                  {...register('urgency', { required: 'Urgency is required' })}
                  className="input"
                >
                  {urgencyLevels.map(level => (
                    <option key={level.value} value={level.value}>
                      {level.label}
                    </option>
                  ))}
                </select>
                {errors.urgency && (
                  <p className="mt-1 text-sm text-red-400">{errors.urgency.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-white mb-2">
                  Needed By (Optional)
                </label>
                <input
                  {...register('needed_by')}
                  type="date"
                  className="input"
                  min={new Date().toISOString().split('T')[0]}
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-white mb-2">
                  Location *
                </label>
                <input
                  {...register('location', { required: 'Location is required' })}
                  className="input"
                  placeholder="Enter your address"
                />
                {errors.location && (
                  <p className="mt-1 text-sm text-red-400">{errors.location.message}</p>
                )}
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-white mb-2">
                  Delivery Mode *
                </label>
                <select
                  {...register('delivery_mode', { required: 'Delivery mode is required' })}
                  className="input"
                >
                  <option value="">Select delivery mode</option>
                  <option value="pickup">Self Pickup</option>
                  <option value="volunteer">Volunteer Delivery</option>
                  <option value="direct">Direct Delivery (by donor)</option>
                </select>
                {errors.delivery_mode && (
                  <p className="mt-1 text-sm text-red-400">{errors.delivery_mode.message}</p>
                )}
              </div>
            </div>
          </form>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-6 border-t-2 border-yellow-500/20 flex-shrink-0">
          <button
            onClick={onClose}
            className="px-5 py-2.5 bg-navy-700 hover:bg-navy-600 text-yellow-300 rounded-lg transition-colors font-medium border border-navy-600"
          >
            Cancel
          </button>
          <button
            type="submit"
            form="edit-request-form"
            disabled={isSubmitting}
            className="px-5 py-2.5 bg-yellow-600 hover:bg-yellow-700 text-white rounded-lg transition-colors flex items-center gap-2 font-medium disabled:opacity-50"
          >
            {isSubmitting ? (
              <LoadingSpinner size="sm" />
            ) : (
              <>
                <Edit3 className="h-4 w-4" />
                Update Request
              </>
            )}
          </button>
        </div>
      </motion.div>
    </div>
  )
}

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
              <Heart className="h-6 w-6 sm:h-7 sm:w-7 lg:h-8 lg:w-8 text-yellow-500 mr-2 sm:mr-3" />
              <div>
                <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-white">My Requests</h1>
                <p className="text-xs sm:text-sm text-yellow-200">Manage your donation requests and track their status</p>
              </div>
            </div>
            <button
              onClick={() => navigate('/create-request')}
              className="btn btn-primary flex items-center justify-center text-xs sm:text-sm px-3 sm:px-4 py-2 whitespace-nowrap active:scale-95"
            >
              <Plus className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1.5 sm:mr-2" />
              <span>Create Request</span>
            </button>
          </div>

        </motion.div>

        {/* Stats Cards */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4 lg:gap-6 mb-4 sm:mb-6 lg:mb-8"
        >
          <div className="card p-2.5 sm:p-4 lg:p-6 border border-gray-600" style={{backgroundColor: '#001a5c'}}>
            <div className="flex items-center justify-between gap-2">
              <div className="flex-1 min-w-0">
                <p className="text-xs text-yellow-400 mb-0.5">Open</p>
                <p className="text-2xl sm:text-3xl font-bold text-white">{requests.filter(r => r.status === 'open').length}</p>
              </div>
              <div className="flex flex-col items-center gap-0.5">
                <Eye className="h-5 w-5 sm:h-6 sm:w-6 lg:h-7 lg:w-7 text-blue-500" />
                <span className="text-[10px] sm:hidden text-blue-400 font-medium">Active</span>
              </div>
            </div>
          </div>
          
          <div className="card p-2.5 sm:p-4 lg:p-6 border border-gray-600" style={{backgroundColor: '#001a5c'}}>
            <div className="flex items-center justify-between gap-2">
              <div className="flex-1 min-w-0">
                <p className="text-xs text-yellow-400 mb-0.5">Claimed</p>
                <p className="text-2xl sm:text-3xl font-bold text-white">{requests.filter(r => r.status === 'claimed').length}</p>
              </div>
              <div className="flex flex-col items-center gap-0.5">
                <Heart className="h-5 w-5 sm:h-6 sm:w-6 lg:h-7 lg:w-7 text-yellow-500" />
                <span className="text-[10px] sm:hidden text-yellow-400 font-medium">Matched</span>
              </div>
            </div>
          </div>
          
          <div className="card p-2.5 sm:p-4 lg:p-6 border border-gray-600" style={{backgroundColor: '#001a5c'}}>
            <div className="flex items-center justify-between gap-2">
              <div className="flex-1 min-w-0">
                <p className="text-xs text-yellow-400 mb-0.5">Fulfilled</p>
                <p className="text-2xl sm:text-3xl font-bold text-white">{requests.filter(r => r.status === 'fulfilled').length}</p>
              </div>
              <div className="flex flex-col items-center gap-0.5">
                <CheckCircle className="h-5 w-5 sm:h-6 sm:w-6 lg:h-7 lg:w-7 text-success-500" />
                <span className="text-[10px] sm:hidden text-success-400 font-medium">Done</span>
              </div>
            </div>
          </div>
          
          <div className="card p-2.5 sm:p-4 lg:p-6 border border-gray-600" style={{backgroundColor: '#001a5c'}}>
            <div className="flex items-center justify-between gap-2">
              <div className="flex-1 min-w-0">
                <p className="text-xs text-yellow-400 mb-0.5">Total</p>
                <p className="text-2xl sm:text-3xl font-bold text-white">{requests.length}</p>
              </div>
              <div className="flex flex-col items-center gap-0.5">
                <Package className="h-5 w-5 sm:h-6 sm:w-6 lg:h-7 lg:w-7 text-yellow-500" />
                <span className="text-[10px] sm:hidden text-yellow-400 font-medium">All</span>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Delivery Confirmation Requests */}
        {deliveryConfirmationNotifications.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="card p-4 sm:p-6 mb-4 sm:mb-6 lg:mb-8 border border-navy-700 border-l-4 border-l-amber-500"
            style={{backgroundColor: '#001a5c'}}
          >
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-amber-500/10 rounded-lg flex-shrink-0">
                  <Truck className="h-5 w-5 sm:h-6 sm:w-6 text-amber-500" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-semibold text-white">Delivery Confirmations Needed</h3>
                  <p className="text-yellow-300 text-xs sm:text-sm">Please confirm these completed deliveries</p>
                </div>
              </div>
              <span className="bg-amber-500/20 text-amber-400 px-3 py-1 rounded-full text-xs sm:text-sm font-medium self-start sm:self-auto">
                {deliveryConfirmationNotifications.length} pending
              </span>
            </div>
            
            <div className="space-y-3">
              {deliveryConfirmationNotifications.map((notification) => (
                <div
                  key={notification.id}
                  className="bg-navy-800/50 rounded-lg p-3 sm:p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"
                >
                  <div className="flex items-start gap-3">
                    <CheckCircle className="h-5 w-5 text-amber-500 flex-shrink-0 mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <p className="text-white font-medium text-sm sm:text-base">{notification.title}</p>
                      <p className="text-yellow-300 text-xs sm:text-sm">{notification.message}</p>
                      <p className="text-yellow-400 text-xs mt-1">
                        Volunteer: {notification.data?.volunteer_name}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => handleConfirmDelivery(notification)}
                    className="btn btn-primary text-xs sm:text-sm px-3 sm:px-4 py-2 whitespace-nowrap active:scale-95 w-full sm:w-auto"
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
          transition={{ delay: 0.2 }}
          className="mb-4 sm:mb-6 lg:mb-8"
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

            {/* Status */}
            <div className="relative w-full sm:w-auto sm:min-w-[180px]">
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="appearance-none w-full px-4 sm:px-5 py-2.5 sm:py-3 pr-10 bg-navy-800 border-2 border-navy-700 rounded-lg text-sm sm:text-base text-white font-medium focus:outline-none focus:border-yellow-500 focus:ring-2 focus:ring-yellow-500/20 transition-all duration-200 cursor-pointer hover:border-yellow-600"
              >
                <option value="">All Statuses</option>
                {statusOptions.map(status => (
                  <option key={status.value} value={status.value}>{status.label}</option>
                ))}
              </select>
              <Filter className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-yellow-400 pointer-events-none" />
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
            <Package className="h-16 w-16 text-yellow-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">
              {requests.length === 0 ? 'No requests yet' : 'No matching requests'}
            </h3>
            <p className="text-yellow-400 mb-6">
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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
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
                    transition={{ delay: index * 0.05 }}
                    className="card overflow-hidden hover:shadow-xl hover:border-yellow-500/30 transition-all duration-300 group"
                  >
                    {/* Status Bar */}
                    <div className={`h-1.5 ${statusInfo.color.includes('bg-') ? statusInfo.color : 'bg-navy-700'}`} />
                    
                    {/* Card Content */}
                    <div className="p-5">
                      {/* Header */}
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-2">
                            <StatusIcon className={`h-5 w-5 flex-shrink-0 ${statusInfo.color.split(' ')[0]}`} />
                            <h3 className="text-lg font-bold text-white truncate group-hover:text-yellow-300 transition-colors">
                              {request.title}
                            </h3>
                          </div>
                          
                          {/* Badges */}
                          <div className="flex flex-wrap gap-2">
                            <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${statusInfo.color}`}>
                              {statusInfo.label}
                            </span>
                            <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${urgencyInfo.color}`}>
                              <AlertCircle className="h-3 w-3 mr-1" />
                              {urgencyInfo.label}
                            </span>
                            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-yellow-900/30 text-yellow-300 border border-yellow-600/30">
                              <Package className="h-3 w-3 mr-1" />
                              {request.category}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Description */}
                      {request.description && (
                        <p className="text-gray-300 text-sm leading-relaxed mb-4 line-clamp-2">
                          {request.description}
                        </p>
                      )}

                      {/* Info Grid */}
                      <div className="space-y-2 mb-4">
                        <div className="flex items-center justify-between text-sm">
                          <div className="flex items-center text-yellow-400">
                            <Package className="h-4 w-4 mr-2" />
                            <span className="font-medium">Quantity:</span>
                          </div>
                          <span className="text-white font-semibold">{request.quantity_needed}</span>
                        </div>
                        
                        <div className="flex items-center justify-between text-sm">
                          <div className="flex items-center text-yellow-400">
                            <Calendar className="h-4 w-4 mr-2" />
                            <span className="font-medium">Created:</span>
                          </div>
                          <span className="text-gray-300">{formatDate(request.created_at)}</span>
                        </div>
                        
                        {request.needed_by && (
                          <div className="flex items-center justify-between text-sm">
                            <div className="flex items-center text-amber-400">
                              <Clock className="h-4 w-4 mr-2" />
                              <span className="font-medium">Deadline:</span>
                            </div>
                            <span className="text-amber-300 font-medium">{formatDate(request.needed_by)}</span>
                          </div>
                        )}
                        
                        {request.location && (
                          <div className="flex items-center justify-between text-sm">
                            <div className="flex items-center text-yellow-400">
                              <MapPin className="h-4 w-4 mr-2" />
                              <span className="font-medium">Location:</span>
                            </div>
                            <span className="text-gray-300 text-xs line-clamp-1 text-right flex-1 ml-2">{request.location}</span>
                          </div>
                        )}
                      </div>

                      {/* Tags */}
                      {request.tags && request.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mb-4">
                          {request.tags.slice(0, 3).map((tag, tagIndex) => (
                            <span key={tagIndex} className="inline-flex items-center text-xs bg-navy-800/80 text-yellow-300 px-2 py-1 rounded border border-navy-700">
                              <Tag className="h-2.5 w-2.5 mr-1" />
                              {tag}
                            </span>
                          ))}
                          {request.tags.length > 3 && (
                            <span className="text-xs text-yellow-400 px-2 py-1">
                              +{request.tags.length - 3}
                            </span>
                          )}
                        </div>
                      )}

                      {/* Claims Badge */}
                      {request.claims_count > 0 && (
                        <div className="mb-4 p-2 bg-green-900/20 rounded-lg border border-green-500/30">
                          <div className="flex items-center text-green-400 text-xs font-medium">
                            <Heart className="h-3.5 w-3.5 mr-1.5" />
                            <span>{request.claims_count} donor{request.claims_count > 1 ? 's' : ''} claimed this request</span>
                          </div>
                        </div>
                      )}

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
                        <div className="p-3 bg-green-900/20 rounded-lg border border-green-500/30">
                          <div className="flex items-center text-green-400 text-xs font-medium">
                            <CheckCircle className="h-3.5 w-3.5 mr-1.5 flex-shrink-0" />
                            <span>Request fulfilled! Thank you for using HopeLink.</span>
                          </div>
                        </div>
                      )}

                      {/* Action Buttons */}
                      <div className="flex items-center gap-2 pt-4 border-t border-navy-700">
                        <button
                          onClick={() => handleViewRequest(request)}
                          className="flex-1 px-4 py-2.5 bg-yellow-600 hover:bg-yellow-700 text-white rounded-lg transition-colors flex items-center justify-center gap-2 font-medium text-sm"
                        >
                          <Eye className="h-4 w-4" />
                          View Details
                        </button>

                        {canEdit(request) && (
                          <button
                            onClick={() => handleEditRequest(request)}
                            className="px-4 py-2.5 bg-navy-700 hover:bg-navy-600 text-yellow-300 rounded-lg transition-colors flex items-center justify-center gap-2 font-medium text-sm border border-navy-600"
                            title="Edit Request"
                          >
                            <Edit3 className="h-4 w-4" />
                          </button>
                        )}

                        {canDelete(request) && (
                          <button
                            onClick={() => handleDeleteClick(request)}
                            disabled={deletingId === request.id}
                            className="px-4 py-2.5 bg-red-600/20 hover:bg-red-600/30 text-red-400 rounded-lg transition-colors flex items-center justify-center gap-2 font-medium text-sm border border-red-600/30"
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
                  </motion.div>
                )
              })}
            </AnimatePresence>
          </div>
        )}

        {/* View Request Modal */}
        <AnimatePresence>
          {showViewModal && selectedRequest && (
            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-3 sm:p-4">
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                transition={{ duration: 0.2 }}
                className="bg-navy-900 border-2 border-yellow-500/20 shadow-2xl rounded-xl max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col"
              >
                {/* Header */}
                <div className="flex items-center justify-between p-4 sm:p-6 border-b-2 border-yellow-500/20 flex-shrink-0">
                  <div className="flex items-center gap-2 sm:gap-3">
                    <div className="p-1.5 sm:p-2 bg-yellow-500/10 rounded-lg flex-shrink-0">
                      <Heart className="h-5 w-5 sm:h-6 sm:w-6 text-yellow-400" />
                    </div>
                    <div>
                      <h3 className="text-base sm:text-xl font-bold text-white">Request Details</h3>
                      <p className="text-xs text-yellow-300">Complete information</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setShowViewModal(false)}
                    className="text-gray-400 hover:text-white transition-colors p-2 hover:bg-navy-800 rounded-lg flex-shrink-0"
                  >
                    <X className="h-4 w-4 sm:h-5 sm:w-5" />
                  </button>
                </div>

                {/* Content with Custom Scrollbar */}
                <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-3 sm:py-4 custom-scrollbar">
                  <div className="space-y-6">
                    {/* Title and Status */}
                    <div className="bg-navy-800/50 rounded-lg p-3 sm:p-4 border border-navy-700">
                      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 sm:gap-4 mb-3">
                        <h4 className="text-lg sm:text-2xl font-bold text-white">{selectedRequest.title}</h4>
                        <span className="px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-full text-xs font-semibold bg-yellow-900/30 text-yellow-300 border border-yellow-500/30 whitespace-nowrap self-start">
                          {selectedRequest.category}
                        </span>
                      </div>
                      <div className="flex flex-wrap items-center gap-2 mb-3">
                        {(() => {
                          const statusInfo = getStatusInfo(selectedRequest.status)
                          const urgencyInfo = getUrgencyInfo(selectedRequest.urgency)
                          return (
                            <>
                              <span className={`inline-flex items-center px-2.5 sm:px-3 py-1 rounded-full text-xs font-medium ${statusInfo.color}`}>
                                {statusInfo.label}
                              </span>
                              <span className={`inline-flex items-center px-2.5 sm:px-3 py-1 rounded-full text-xs font-medium ${urgencyInfo.color}`}>
                                <AlertCircle className="h-3 w-3 mr-1" />
                                {urgencyInfo.label} Priority
                              </span>
                              <span className="inline-flex items-center px-2.5 sm:px-3 py-1 rounded-full text-xs font-semibold bg-navy-700 text-yellow-300 border border-navy-600">
                                <Package className="h-3 w-3 mr-1" />
                                Quantity: {selectedRequest.quantity_needed}
                              </span>
                            </>
                          )
                        })()}
                      </div>
                      {selectedRequest.description && (
                        <p className="text-sm sm:text-base text-gray-300 leading-relaxed">{selectedRequest.description}</p>
                      )}
                    </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                    <div>
                      <h5 className="text-sm font-medium text-white mb-2 sm:mb-3">Request Information</h5>
                      <div className="space-y-2 text-xs sm:text-sm">
                        <div className="flex items-center text-gray-300">
                          <Calendar className="h-4 w-4 mr-2 text-yellow-400" />
                          <span>Created {formatDate(selectedRequest.created_at)}</span>
                        </div>
                        {selectedRequest.needed_by && (
                          <div className="flex items-center text-gray-300">
                            <Clock className="h-4 w-4 mr-2 text-amber-400" />
                            <span>Needed by {formatDate(selectedRequest.needed_by)}</span>
                          </div>
                        )}
                        {selectedRequest.location && (
                          <div className="flex items-center text-gray-300">
                            <MapPin className="h-4 w-4 mr-2 text-yellow-400" />
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
                        <h5 className="text-sm font-medium text-white mb-2 sm:mb-3">Tags</h5>
                        <div className="flex flex-wrap gap-1.5 sm:gap-2">
                          {selectedRequest.tags.map((tag, index) => (
                            <span key={index} className="inline-flex items-center text-xs sm:text-sm bg-navy-800 text-yellow-300 px-2.5 sm:px-3 py-1 rounded-full">
                              <Tag className="h-3 w-3 mr-1" />
                              {tag}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  </div>
                </div>

                {/* Footer */}
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-2 sm:gap-3 p-4 sm:p-6 border-t-2 border-yellow-500/20 flex-shrink-0">
                  {canEdit(selectedRequest) && (
                    <button
                      onClick={() => handleEditRequest(selectedRequest)}
                      className="w-full sm:w-auto px-4 sm:px-5 py-2.5 bg-navy-700 hover:bg-navy-600 text-yellow-300 rounded-lg transition-colors flex items-center justify-center gap-2 font-medium border border-navy-600 order-2 sm:order-1"
                    >
                      <Edit3 className="h-4 w-4" />
                      <span>Edit Request</span>
                    </button>
                  )}
                  <button
                    onClick={() => setShowViewModal(false)}
                    className="w-full sm:w-auto px-4 sm:px-5 py-2.5 bg-yellow-600 hover:bg-yellow-700 text-white rounded-lg transition-colors font-medium order-1 sm:order-2"
                  >
                    Close
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* Edit Request Modal */}
        <AnimatePresence>
          {showEditModal && selectedRequest && <EditRequestModal request={selectedRequest} onClose={() => {
            setShowEditModal(false)
            setSelectedRequest(null)
          }} onSuccess={loadRequests} />}
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
                    className="text-yellow-400 hover:text-white transition-colors"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>

                <div className="space-y-4">
                  <p className="text-yellow-300">
                    Are you sure you want to delete this request?
                  </p>
                  
                  <div className="p-3 bg-navy-800 rounded-lg">
                    <h4 className="font-medium text-white mb-1">{requestToDelete.title}</h4>
                    <p className="text-sm text-yellow-400">{requestToDelete.category}</p>
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