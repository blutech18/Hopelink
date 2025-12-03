import React, { useState, useEffect, useCallback, useRef } from 'react'
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
  Heart,
  Package,
  Truck,
  X,
  Gift,
  Upload,
  // User,
  // Phone,
  // Image as ImageIcon,
  // Navigation
} from 'lucide-react'
import PropTypes from 'prop-types'
import { useAuth } from '../../contexts/AuthContext'
import { useToast } from '../../contexts/ToastContext'
import { useNavigate } from 'react-router-dom'
import { ListPageSkeleton } from '../../components/ui/Skeleton'
import LoadingSpinner from '../../components/ui/LoadingSpinner'
import DeliveryConfirmationModal from '../../components/ui/DeliveryConfirmationModal'
import { db, supabase } from '../../lib/supabase'

// Edit Request Modal Component
const EditRequestModal = ({ request, onClose, onSuccess }) => {
  const { success, error } = useToast()
  const [sampleImage, setSampleImage] = useState(request.sample_image || null)
  const [imageChanged, setImageChanged] = useState(false)
  
  // Reset image state when request changes
  React.useEffect(() => {
    setSampleImage(request.sample_image || null)
    setImageChanged(false)
  }, [request.id])
  
  // Format needed_by date for input field (YYYY-MM-DD)
  const formatDateForInput = (dateString) => {
    if (!dateString) return ''
    try {
      const date = new Date(dateString)
      return date.toISOString().split('T')[0]
    } catch {
      return ''
    }
  }

  const { register, handleSubmit, formState: { errors, isSubmitting, isDirty } } = useForm({
    defaultValues: {
      title: request.title || '',
      description: request.description || '',
      category: request.category || '',
      quantity_needed: request.quantity_needed || 1,
      urgency: request.urgency || 'medium',
      needed_by: formatDateForInput(request.needed_by),
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

  const handleImageChange = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate file type
    if (!file.type.startsWith('image/')) {
      error('Please select a valid image file')
      return
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      error('Image size must be less than 5MB')
      return
    }

    try {
      const reader = new FileReader()
      reader.onload = () => {
        setSampleImage(reader.result)
        setImageChanged(true)
      }
      reader.readAsDataURL(file)
    } catch (err) {
      console.error('Error processing image:', err)
      error('Failed to process image. Please try again.')
    }
  }

  const removeImage = () => {
    setSampleImage(null)
    setImageChanged(true)
  }

  // Check if form has changes (including image changes)
  const hasChanges = isDirty || imageChanged

  const onSubmit = async (data) => {
    try {
      const updateData = {
        ...data,
        needed_by: data.needed_by || null,
        sample_image: sampleImage || null
      }
      await db.updateDonationRequest(request.id, updateData)
      success('Request updated successfully!')
      setImageChanged(false)
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
            onClick={() => {
              onClose()
              setSampleImage(request.sample_image || null)
              setImageChanged(false)
            }}
            className="text-gray-400 hover:text-white transition-colors p-2 hover:bg-navy-800 rounded-lg"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content with Custom Scrollbar */}
        <div className="flex-1 overflow-y-auto px-6 py-4 custom-scrollbar">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {/* Image Upload Section */}
            <div className="bg-navy-800/30 rounded-lg p-4 border border-navy-700">
              <p className="block text-sm font-semibold text-yellow-300 mb-3">Sample Image</p>
              
              {sampleImage ? (
                <div className="relative">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageChange}
                    className="hidden"
                    id="changeImageInput"
                  />
                  <label htmlFor="changeImageInput" className="cursor-pointer block">
                    <div className="w-full h-48 rounded-lg border-2 border-yellow-500/30 overflow-hidden">
                      <img 
                        src={sampleImage} 
                        alt="Preview" 
                        className="w-full h-full object-cover hover:opacity-90 transition-opacity"
                      />
                    </div>
                  </label>
                  <button
                    type="button"
                    onClick={removeImage}
                    className="absolute top-2 right-2 p-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ) : (
                <div className="relative">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageChange}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />
                  <div className="border-2 border-dashed border-navy-600 rounded-lg p-8 text-center hover:border-yellow-500 hover:bg-navy-700 transition-all cursor-pointer">
                    <Upload className="h-10 w-10 text-yellow-400 mx-auto mb-3" />
                    <p className="text-white text-sm mb-1">Click to upload image</p>
                    <p className="text-yellow-400 text-xs">PNG, JPG up to 5MB</p>
                  </div>
                </div>
              )}
            </div>

            {/* Basic Information */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="md:col-span-2">
                <label htmlFor="edit-title" className="block text-sm font-medium text-white mb-2">
                  Request Title *
                </label>
                <input
                  id="edit-title"
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
                <label htmlFor="edit-description" className="block text-sm font-medium text-white mb-2">
                  Description
                </label>
                <textarea
                  id="edit-description"
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
                <label htmlFor="edit-category" className="block text-sm font-medium text-white mb-2">
                  Category *
                </label>
                <select
                  id="edit-category"
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
                <label htmlFor="edit-quantity" className="block text-sm font-medium text-white mb-2">
                  Quantity *
                </label>
                <input
                  id="edit-quantity"
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
                <label htmlFor="edit-urgency" className="block text-sm font-medium text-white mb-2">
                  Urgency Level *
                </label>
                <select
                  id="edit-urgency"
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
                <label htmlFor="edit-needed-by" className="block text-sm font-medium text-white mb-2">
                  Needed By (Optional)
                </label>
                <input
                  id="edit-needed-by"
                  {...register('needed_by')}
                  type="date"
                  className="input"
                  min={new Date().toISOString().split('T')[0]}
                />
              </div>

              <div className="md:col-span-2">
                <label htmlFor="edit-location" className="block text-sm font-medium text-white mb-2">
                  Location *
                </label>
                <input
                  id="edit-location"
                  {...register('location', { required: 'Location is required' })}
                  className="input"
                  placeholder="Enter your address"
                />
                {errors.location && (
                  <p className="mt-1 text-sm text-red-400">{errors.location.message}</p>
                )}
              </div>

              <div className="md:col-span-2">
                <label htmlFor="edit-delivery-mode" className="block text-sm font-medium text-white mb-2">
                  Delivery Mode *
                </label>
                <select
                  id="edit-delivery-mode"
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
        <div className="p-6 pt-4 border-t-2 border-yellow-500/20 flex justify-between items-center flex-shrink-0">
          <div className="text-sm text-yellow-300">
            {hasChanges ? (
              <span className="flex items-center gap-2">
                <AlertCircle className="h-4 w-4" />
                You have unsaved changes
              </span>
            ) : (
              <span className="text-gray-500">No changes made</span>
            )}
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => {
                onClose()
                setSampleImage(request.sample_image || null)
                setImageChanged(false)
              }}
              className="px-6 py-2.5 bg-navy-800 hover:bg-navy-700 text-white rounded-lg font-medium transition-colors border border-navy-600"
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit(onSubmit)}
              disabled={isSubmitting || !hasChanges}
              className={`px-6 py-2.5 rounded-lg font-medium transition-colors flex items-center gap-2 ${
                hasChanges && !isSubmitting
                  ? 'bg-yellow-600 hover:bg-yellow-700 text-white'
                  : 'bg-gray-600 text-gray-400 cursor-not-allowed'
              }`}
            >
              {isSubmitting ? (
                <>
                  <LoadingSpinner size="sm" />
                  Updating...
                </>
              ) : (
                <>
                  <Edit3 className="h-4 w-4" />
                  Update Request
                </>
              )}
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  )
}

EditRequestModal.propTypes = {
  request: PropTypes.shape({
    id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
    sample_image: PropTypes.string,
    title: PropTypes.string,
    description: PropTypes.string,
    category: PropTypes.string,
    quantity_needed: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    urgency: PropTypes.string,
    needed_by: PropTypes.oneOfType([PropTypes.string, PropTypes.instanceOf(Date)]),
    location: PropTypes.string,
    delivery_mode: PropTypes.string,
  }).isRequired,
  onClose: PropTypes.func.isRequired,
  onSuccess: PropTypes.func.isRequired,
}

const MyRequestsPage = () => {
  const { user } = useAuth()
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
    { value: 'fulfilled', label: 'Received', color: 'text-green-400 bg-green-900/20' },
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

  const loadDeliveryConfirmations = useCallback(async () => {
    if (!user?.id) return
    try {
      const notifications = await db.getUserNotifications(user.id, 100)
      const deliveryConfirmationNotifications = notifications.filter(
        (n) =>
          n.type === 'delivery_completed' &&
          n.data?.action_required === 'confirm_delivery' &&
          !n.read_at
      )
      setDeliveryConfirmationNotifications(deliveryConfirmationNotifications)
    } catch (err) {
      console.error('Error loading delivery confirmations:', err)
    }
  }, [user?.id])

  const loadRequests = useCallback(async () => {
    if (!user?.id) {
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      const userRequests = await db.getUserDonationRequests(user.id)
      setRequests(userRequests || [])
      await loadDeliveryConfirmations()
    } catch (err) {
      console.error('Error loading requests:', err)
      error('Failed to load requests. Please try again.')
    } finally {
      setLoading(false)
    }
  }, [user?.id, error, loadDeliveryConfirmations])

  useEffect(() => {
    loadRequests()
  }, [loadRequests])

  // Set up real-time subscription to refresh when donation_requests are updated
  useEffect(() => {
    if (!user?.id || !supabase) return

    const requestsSubscription = supabase
      .channel('my_requests_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'donation_requests',
          filter: `requester_id=eq.${user.id}`
        },
        (payload) => {
          console.log('📋 Request change detected in MyRequestsPage:', payload)
          // Refresh requests when any change occurs
          loadRequests()
        }
      )
      .subscribe()

    // Also subscribe to notifications to refresh when approval notifications arrive
    const notificationsSubscription = supabase
      .channel('my_requests_notifications')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`
        },
        (payload) => {
          // Only refresh if it's a donation_approved notification
          if (payload.new?.type === 'donation_approved' || payload.old?.type === 'donation_approved') {
            console.log('🔔 Donation approval notification detected, refreshing requests')
            loadRequests()
          }
        }
      )
      .subscribe()

    // Cleanup subscriptions
    return () => {
      if (requestsSubscription) {
        supabase.removeChannel(requestsSubscription)
      }
      if (notificationsSubscription) {
        supabase.removeChannel(notificationsSubscription)
      }
    }
  }, [user?.id, loadRequests])

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
                            <span className={`mt-2 px-2 py-0.5 sm:py-1 rounded-md text-[10px] sm:text-xs font-semibold ${statusInfo.color}`}>
                              {statusInfo.label}
                            </span>
                          </div>
                        )}
                      </div>
                      
                      {/* Card Content */}
                      <div className="flex-1 min-w-0 space-y-2 sm:space-y-3">
                        {/* Header with Actions */}
                        <div className="flex flex-col sm:flex-row items-start justify-between gap-3 sm:gap-4">
                          <div className="flex-1 min-w-0">
                            <h3 className="text-base sm:text-lg lg:text-xl font-bold text-white mb-1.5 sm:mb-2">{request.title}</h3>
                            <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 mb-2">
                              <span className={`inline-flex items-center px-2 sm:px-3 py-0.5 sm:py-1 rounded-full text-[10px] sm:text-xs font-semibold ${statusInfo.color}`}>
                                {statusInfo.label}
                              </span>
                              <span className={`inline-flex items-center px-2 sm:px-3 py-0.5 sm:py-1 rounded-full text-[10px] sm:text-xs font-semibold border ${urgencyInfo.color}`}>
                                {urgencyInfo.label}
                              </span>
                              <span className="inline-flex items-center px-2 sm:px-3 py-0.5 sm:py-1 rounded-full text-[10px] sm:text-xs font-semibold bg-yellow-900/30 text-yellow-300 border border-yellow-500/30 whitespace-nowrap">
                                {request.category}
                              </span>
                            </div>
                            <p className="text-gray-300 text-xs sm:text-sm line-clamp-2">
                              {request.description || 'No description provided'}
                            </p>
                          </div>
                          
                          {/* Action Buttons */}
                          <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
                            <button
                              onClick={() => handleViewRequest(request)}
                              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-navy-950 bg-yellow-400 hover:bg-yellow-500 rounded-lg transition-all active:scale-95"
                            >
                              <Eye className="h-3.5 w-3.5" />
                              <span>View</span>
                            </button>
                            <button
                              onClick={() => handleEditRequest(request)}
                              disabled={!canEdit(request)}
                              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-navy-700 hover:bg-navy-600 border border-yellow-500/30 rounded-lg transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                              title={canEdit(request) ? "Edit Request" : "Only open requests can be edited"}
                            >
                              <Edit3 className="h-3.5 w-3.5" />
                              <span>Edit</span>
                            </button>
                            <button
                              onClick={() => handleDeleteClick(request)}
                              disabled={!canDelete(request) || deletingId === request.id}
                              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-danger-600 hover:bg-danger-700 rounded-lg transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                              title={canDelete(request) ? "Delete Request" : "This request cannot be deleted"}
                            >
                              {deletingId === request.id ? (
                                <LoadingSpinner size="sm" />
                              ) : (
                                <>
                                  <Trash2 className="h-3.5 w-3.5" />
                                  <span>Delete</span>
                                </>
                              )}
                            </button>
                          </div>
                        </div>

                        {/* Compact Details */}
                        <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 sm:gap-y-2 text-xs sm:text-sm">
                          <div className="flex items-center gap-1 sm:gap-1.5">
                            <Package className="h-3 w-3 sm:h-4 sm:w-4 text-blue-400 flex-shrink-0" />
                            <span className="text-blue-400 font-medium">Quantity:</span>
                            <span className="text-white font-semibold">{request.quantity_needed}</span>
                          </div>
                          
                          {request.needed_by && (
                            <div className="flex items-center gap-1 sm:gap-1.5">
                              <Clock className="h-3 w-3 sm:h-4 sm:w-4 text-amber-400 flex-shrink-0" />
                              <span className="text-amber-400 font-medium">Deadline:</span>
                              <span className="text-amber-300 font-semibold">{formatDate(request.needed_by)}</span>
                            </div>
                          )}
                          
                          {request.location && (
                            <div className="flex items-center gap-1 sm:gap-1.5">
                              <MapPin className="h-3 w-3 sm:h-4 sm:w-4 text-yellow-400 flex-shrink-0" />
                              <span className="text-yellow-400 font-medium">Location:</span>
                              <span className="text-gray-300 truncate">{request.location}</span>
                            </div>
                          )}
                          
                          <div className="flex items-center gap-1 sm:gap-1.5">
                            <Calendar className="h-3 w-3 sm:h-4 sm:w-4 text-purple-400 flex-shrink-0" />
                            <span className="text-purple-400 font-medium">Created:</span>
                            <span className="text-gray-300">{formatDate(request.created_at)}</span>
                          </div>
                        </div>
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
                  <button
                    onClick={() => setShowViewModal(false)}
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
                            <span className="text-sm font-semibold text-yellow-300">Quantity Needed</span>
                          </div>
                          <p className="text-white text-lg font-medium">{selectedRequest.quantity_needed}</p>
                        </div>
                      </div>
                      
                      {(() => {
                        const statusInfo = getStatusInfo(selectedRequest.status)
                        return (
                          <div className="bg-navy-800/30 rounded-lg p-4 border border-navy-700">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <AlertCircle className="h-4 w-4 text-orange-400" />
                                <span className="text-sm font-semibold text-yellow-300">Status</span>
                              </div>
                              <p className="text-white text-lg font-medium">{statusInfo.label}</p>
                            </div>
                          </div>
                        )
                      })()}
                      
                      {(() => {
                        const urgencyInfo = getUrgencyInfo(selectedRequest.urgency)
                        return (
                          <div className="bg-navy-800/30 rounded-lg p-4 border border-navy-700">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <Clock className="h-4 w-4 text-red-400" />
                                <span className="text-sm font-semibold text-yellow-300">Urgency</span>
                              </div>
                              <p className="text-white text-lg font-medium">{urgencyInfo.label}</p>
                            </div>
                          </div>
                        )
                      })()}

                      <div className="bg-navy-800/30 rounded-lg p-4 border border-navy-700">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Heart className="h-4 w-4 text-green-400" />
                            <span className="text-sm font-semibold text-yellow-300">Claims</span>
                          </div>
                          <p className={`text-lg font-medium ${selectedRequest.claims_count > 0 ? 'text-white' : 'text-gray-400 italic'}`}>
                            {selectedRequest.claims_count > 0 ? `${selectedRequest.claims_count} claim(s)` : 'Not provided'}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Location */}
                    <div className="bg-navy-800/30 rounded-lg p-4 border border-navy-700">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <MapPin className="h-4 w-4 text-purple-400" />
                          <span className="text-sm font-semibold text-yellow-300">Location</span>
                        </div>
                        <p className={`text-center max-w-[60%] break-words ${selectedRequest.location ? 'text-white' : 'text-gray-400 italic'}`}>
                          {selectedRequest.location || 'Not provided'}
                        </p>
                      </div>
                    </div>

                    {/* Dates */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="bg-navy-800/30 rounded-lg p-4 border border-navy-700">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4 text-orange-400" />
                            <span className="text-sm font-semibold text-yellow-300">Posted Date</span>
                          </div>
                          <p className="text-white">{formatDate(selectedRequest.created_at)}</p>
                        </div>
                      </div>

                      <div className="bg-navy-800/30 rounded-lg p-4 border border-navy-700">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Clock className="h-4 w-4 text-red-400" />
                            <span className="text-sm font-semibold text-yellow-300">Needed By</span>
                          </div>
                          <p className={selectedRequest.needed_by ? 'text-white' : 'text-gray-400 italic'}>
                            {selectedRequest.needed_by ? formatDate(selectedRequest.needed_by) : 'Not provided'}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Tags */}
                    <div className="bg-navy-800/30 rounded-lg p-4 border border-navy-700">
                      <p className="text-sm font-semibold text-yellow-300 mb-3 block">Tags</p>
                      {selectedRequest.tags && selectedRequest.tags.length > 0 ? (
                        <div className="flex flex-wrap gap-2">
                          {selectedRequest.tags.map((tag) => (
                            <span key={tag} className="inline-flex items-center text-xs font-medium bg-navy-700 text-yellow-300 px-3 py-1.5 rounded-lg border border-yellow-500/30">
                              <Tag className="h-3 w-3 mr-1" />
                              {tag}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <p className="text-gray-400 italic text-sm">Not provided</p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Footer */}
                <div className="p-4 sm:p-6 pt-3 sm:pt-4 border-t-2 border-yellow-500/20 flex flex-col sm:flex-row justify-between gap-3 flex-shrink-0">
                  {canEdit(selectedRequest) && (
                    <button
                      onClick={() => handleEditRequest(selectedRequest)}
                      className="px-4 sm:px-6 py-2.5 bg-navy-700 hover:bg-navy-600 text-yellow-300 rounded-lg transition-colors flex items-center justify-center gap-2 font-medium border border-navy-600"
                    >
                      <Edit3 className="h-4 w-4" />
                      <span>Edit Request</span>
                    </button>
                  )}
                  <button
                    onClick={() => setShowViewModal(false)}
                    className="px-4 sm:px-6 py-2.5 bg-navy-800 hover:bg-navy-700 text-white rounded-lg font-medium transition-colors border border-navy-600"
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