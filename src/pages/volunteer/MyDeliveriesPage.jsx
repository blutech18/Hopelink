import React, { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { 
  MapPin, 
  Clock, 
  Package, 
  User, 
  Phone,
  MessageCircle,
  CheckCircle,
  AlertCircle,
  Truck,
  Calendar,
  Navigation,
  Star,
  Camera,
  Upload,
  ArrowRight,
  Timer,
  X,
  Check,
  FileImage,
  Eye,
  Building,
  Users
} from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import { useToast } from '../../contexts/ToastContext'
import { db } from '../../lib/supabase'
import { ListPageSkeleton } from '../../components/ui/Skeleton'
import LoadingSpinner from '../../components/ui/LoadingSpinner'

const MyDeliveriesPage = () => {
  const { profile } = useAuth()
  const { success, error } = useToast()
  const [deliveries, setDeliveries] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedDelivery, setSelectedDelivery] = useState(null)
  const [showStatusModal, setShowStatusModal] = useState(false)
  const [showDetailsModal, setShowDetailsModal] = useState(false)
  const [showPhotoModal, setShowPhotoModal] = useState(false)
  const [selectedPhoto, setSelectedPhoto] = useState(null)
  const [statusUpdate, setStatusUpdate] = useState({
    status: '',
    notes: '',
    pickup_photo: null,
    delivery_photo: null
  })
  const [uploading, setUploading] = useState(false)

  useEffect(() => {
    loadMyDeliveries()
  }, [profile])

  const loadMyDeliveries = async () => {
    if (!profile?.id) return

    try {
      const deliveriesData = await db.getDeliveries({ 
        volunteer_id: profile.id 
      })
      
      // Sort by status priority and date
      const sorted = deliveriesData.sort((a, b) => {
        const statusOrder = { 
          assigned: 1, 
          accepted: 2, 
          picked_up: 3, 
          in_transit: 4, 
          delivered: 5
        }
        if (statusOrder[a.status] !== statusOrder[b.status]) {
          return statusOrder[a.status] - statusOrder[b.status]
        }
        return new Date(b.created_at) - new Date(a.created_at)
      })

      setDeliveries(sorted)
    } catch (err) {
      console.error('Error loading deliveries:', err)
      error('Failed to load your deliveries')
    } finally {
      setLoading(false)
    }
  }

  const handlePhotoCapture = (event, photoType) => {
    const file = event.target.files[0]
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        error('Please select a valid image file')
        return
      }
      
      // Validate file size (max 10MB)
      if (file.size > 10 * 1024 * 1024) {
        error('Photo size must be less than 10MB')
        return
      }
      
      // Create preview URL
      const previewUrl = URL.createObjectURL(file)
      setStatusUpdate(prev => ({ 
        ...prev, 
        [photoType]: { file, preview: previewUrl }
      }))
      
      success('Photo captured successfully!')
    }
  }

  const uploadPhoto = async (photoFile) => {
    if (!photoFile) return null
    
    try {
      // In a real implementation, upload to Supabase storage or similar
      // For now, we'll simulate the upload
      await new Promise(resolve => setTimeout(resolve, 1000))
      return `https://example.com/photos/${Date.now()}-${photoFile.name}`
    } catch (err) {
      console.error('Error uploading photo:', err)
      throw new Error('Failed to upload photo')
    }
  }

  const handleStatusUpdate = async (deliveryId, newStatus, notes = '') => {
    try {
      setUploading(true)
      
      const updateData = {
        status: newStatus,
        updated_at: new Date().toISOString()
      }

      // Add timestamp for this specific status
      if (newStatus === 'accepted') {
        updateData.accepted_at = new Date().toISOString()
      } else if (newStatus === 'picked_up') {
        updateData.picked_up_at = new Date().toISOString()
      } else if (newStatus === 'in_transit') {
        updateData.in_transit_at = new Date().toISOString()
      } else if (newStatus === 'delivered') {
        updateData.delivered_at = new Date().toISOString()
      }

      if (notes) {
        updateData.volunteer_notes = notes
      }

      // Upload photos if provided
      if (statusUpdate.pickup_photo?.file) {
        const pickupPhotoUrl = await uploadPhoto(statusUpdate.pickup_photo.file)
        updateData.pickup_photo_url = pickupPhotoUrl
      }

      if (statusUpdate.delivery_photo?.file) {
        const deliveryPhotoUrl = await uploadPhoto(statusUpdate.delivery_photo.file)
        updateData.delivery_photo_url = deliveryPhotoUrl
      }

      await db.updateDelivery(deliveryId, updateData)

      // Initialize notification variables outside the scope
        let notificationTitle = ''
        let notificationMessage = ''

      // Create notifications based on status
      const delivery = deliveries.find(d => d.id === deliveryId)
      if (delivery?.claim) {
        switch (newStatus) {
          case 'accepted':
            notificationTitle = 'Delivery Accepted'
            notificationMessage = `${profile.name} has accepted the delivery and will coordinate pickup soon.`
            break
          case 'picked_up':
            notificationTitle = 'Items Picked Up'
            notificationMessage = `${profile.name} has picked up the donation and is preparing for delivery.`
            break
          case 'in_transit':
            notificationTitle = 'Delivery In Transit'
            notificationMessage = `Your items are now on the way to the recipient.`
            break
          case 'delivered':
            // For delivered status, create confirmation requests instead of simple notifications
            await db.createDeliveryConfirmationRequest(deliveryId, profile.id)
            notificationTitle = 'DELIVERY_CONFIRMATION_SENT' // Special flag
            break
        }

        // Send regular notifications for non-delivered statuses
        if (notificationTitle && newStatus !== 'delivered') {
          // Notify donor
          if (delivery.claim.donor?.id) {
            await db.createNotification({
              user_id: delivery.claim.donor.id,
              type: 'delivery_completed',
              title: notificationTitle,
              message: notificationMessage,
              data: { delivery_id: deliveryId, status: newStatus }
            })
          }

          // Notify recipient
          if (delivery.claim.recipient?.id) {
            await db.createNotification({
              user_id: delivery.claim.recipient.id,
              type: 'delivery_completed',
              title: notificationTitle,
              message: notificationMessage,
              data: { delivery_id: deliveryId, status: newStatus }
            })
          }
        }
      }

      // Show appropriate success message
      if (notificationTitle === 'DELIVERY_CONFIRMATION_SENT') {
        success('Delivery completed! The donation has been marked as complete and confirmation requests sent to all parties.')
      } else {
        success(`Delivery status updated to ${newStatus.replace('_', ' ')}`)
      }
      
      loadMyDeliveries()
      setShowStatusModal(false)
      setSelectedDelivery(null)
      setStatusUpdate({ status: '', notes: '', pickup_photo: null, delivery_photo: null })
    } catch (err) {
      console.error('Error updating delivery status:', err)
      error('Failed to update delivery status')
    } finally {
      setUploading(false)
    }
  }

  const openStatusModal = (delivery, status) => {
    setSelectedDelivery(delivery)
    setStatusUpdate({ status, notes: '', pickup_photo: null, delivery_photo: null })
    setShowStatusModal(true)
  }

  const openDetailsModal = (delivery) => {
    setSelectedDelivery(delivery)
    setShowDetailsModal(true)
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'assigned': return 'text-blue-400 bg-blue-500/20 border-blue-500/30'
      case 'accepted': return 'text-purple-400 bg-purple-500/20 border-purple-500/30'
      case 'picked_up': return 'text-yellow-400 bg-yellow-500/20 border-yellow-500/30'
      case 'in_transit': return 'text-orange-400 bg-orange-500/20 border-orange-500/30'
      case 'delivered': return 'text-emerald-400 bg-emerald-500/20 border-emerald-500/30'
      default: return 'text-gray-400 bg-gray-500/20 border-gray-500/30'
    }
  }

  const getStatusIcon = (status) => {
    switch (status) {
      case 'assigned': return Clock
      case 'accepted': return CheckCircle
      case 'picked_up': return Package
      case 'in_transit': return Truck
      case 'delivered': return Star
      default: return AlertCircle
    }
  }

  const getNextAction = (status) => {
    switch (status) {
      case 'assigned': return { action: 'accepted', label: 'Start Delivery', icon: CheckCircle, color: 'bg-green-600 hover:bg-green-700', requiresPhoto: true, photoType: 'before' }
      case 'accepted': return { action: 'picked_up', label: 'Mark as Picked Up', icon: Package, color: 'bg-yellow-600 hover:bg-yellow-700' }
      case 'picked_up': return { action: 'in_transit', label: 'Start Transit', icon: Truck, color: 'bg-orange-600 hover:bg-orange-700' }
      case 'in_transit': return { action: 'delivered', label: 'Mark as Delivered', icon: MapPin, color: 'bg-green-600 hover:bg-green-700', requiresPhoto: true, photoType: 'after' }
      case 'delivered': return null
      default: return null
    }
  }

  const formatTimeAgo = (dateString) => {
    if (!dateString) return 'N/A'
    const date = new Date(dateString)
    const now = new Date()
    const diffInHours = Math.floor((now - date) / (1000 * 60 * 60))
    
    if (diffInHours < 1) return 'Just now'
    if (diffInHours < 24) return `${diffInHours}h ago`
    return `${Math.floor(diffInHours / 24)}d ago`
  }

  if (loading) {
    return <ListPageSkeleton />
  }

  return (
    <div className="min-h-screen py-8" style={{backgroundColor: '#00237d'}}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="mb-6 sm:mb-8"
        >
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-4">
            <div className="flex-1">
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white">My Deliveries</h1>
              <p className="text-yellow-300 mt-2 text-sm sm:text-base">
                Track and manage your volunteer delivery assignments with photo documentation
              </p>
              
              {/* Result Count Badge */}
              {deliveries.length > 0 && (
                <div className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-yellow-600/20 to-yellow-500/20 border border-yellow-500/30 rounded-full">
                  <Truck className="h-4 w-4 text-yellow-400" />
                  <span className="text-yellow-300 font-semibold text-sm">
                    {deliveries.length} {deliveries.length === 1 ? 'Delivery' : 'Deliveries'}
                  </span>
                </div>
              )}
            </div>
          </div>
        </motion.div>

        {/* Summary Stats */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-6 sm:mb-8"
        >
          {[
            { 
              label: 'Active Deliveries', 
              value: deliveries.filter(d => d.status !== 'delivered').length,
              icon: Truck,
              color: 'text-blue-400'
            },
            { 
              label: 'In Transit', 
              value: deliveries.filter(d => d.status === 'in_transit').length,
              icon: Navigation,
              color: 'text-orange-400'
            },
            { 
              label: 'Completed', 
              value: deliveries.filter(d => d.status === 'delivered').length,
              icon: CheckCircle,
              color: 'text-green-400'
            },
            { 
              label: 'Total Distance', 
              value: `${deliveries.reduce((sum, d) => sum + (d.estimated_distance || 0), 0)}km`,
              icon: Navigation,
              color: 'text-purple-400'
            }
          ].map((stat, index) => (
            <motion.div 
              key={index} 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 + index * 0.1 }}
              className="bg-navy-900/50 backdrop-blur-sm border border-navy-700 rounded-xl p-4 sm:p-6 hover:border-yellow-500/30 transition-colors"
            >
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <stat.icon className={`h-8 w-8 ${stat.color}`} />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-yellow-300">{stat.label}</p>
                  <p className="text-2xl font-bold text-white">{stat.value}</p>
                </div>
              </div>
            </motion.div>
          ))}
        </motion.div>

        {/* Status Legend */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.15 }}
          className="mb-6 sm:mb-8"
        >
          <div className="card p-4 sm:p-5 w-full">
            <h3 className="text-xs sm:text-sm font-semibold text-yellow-300 uppercase tracking-wide mb-3 sm:mb-4">Status Legend</h3>
            <div className="flex flex-wrap gap-3 sm:gap-4 justify-center sm:justify-start">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                <span className="text-xs sm:text-sm text-gray-300">Assigned</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-purple-500"></div>
                <span className="text-xs sm:text-sm text-gray-300">Accepted</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                <span className="text-xs sm:text-sm text-gray-300">Picked Up</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-orange-500"></div>
                <span className="text-xs sm:text-sm text-gray-300">In Transit</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-green-500"></div>
                <span className="text-xs sm:text-sm text-gray-300">Delivered</span>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Deliveries List */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          {deliveries.length === 0 ? (
            <div className="bg-navy-900/50 backdrop-blur-sm border border-navy-700 rounded-xl p-8 sm:p-12 text-center">
              <Truck className="h-16 w-16 text-yellow-500 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-white mb-2">No Deliveries Yet</h3>
              <p className="text-yellow-300 mb-6">
                You haven't been assigned any deliveries yet. Check the Available Tasks page to find delivery opportunities.
              </p>
              <button
                onClick={() => window.location.href = '/available-tasks'}
                className="bg-yellow-600 hover:bg-yellow-700 text-white px-6 py-3 rounded-lg font-semibold transition-colors active:scale-95"
              >
                Find Available Tasks
              </button>
            </div>
          ) : (
            <div className="space-y-4 sm:space-y-6">
              {deliveries.map((delivery, index) => {
                const StatusIcon = getStatusIcon(delivery.status)
                const nextAction = getNextAction(delivery.status)
                
                return (
                  <motion.div
                    key={delivery.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4, delay: index * 0.05 }}
                    className="card hover:shadow-xl transition-all duration-300 overflow-hidden border-l-4 group"
                    style={{
                      borderLeftColor: delivery.status === 'delivered' ? '#4ade80' : 
                                      delivery.status === 'in_transit' ? '#fb923c' : 
                                      delivery.status === 'picked_up' ? '#fbbf24' : 
                                      delivery.status === 'accepted' ? '#a78bfa' : '#60a5fa'
                    }}
                  >
                    <div className="p-4 sm:p-5 lg:p-6">
                      <div className="flex flex-col lg:flex-row gap-4 sm:gap-5 lg:gap-6">
                        {/* Item Image */}
                        <div className="flex-shrink-0 mx-auto lg:mx-0">
                          {delivery.claim?.donation?.image_url || delivery.claim?.request?.image_url ? (
                            <div className="relative w-full sm:w-64 lg:w-56 h-48 sm:h-64 lg:h-56 rounded-lg overflow-hidden border-2 border-yellow-500/30 shadow-lg">
                              <img 
                                src={delivery.claim?.donation?.image_url || delivery.claim?.request?.image_url} 
                                alt={delivery.claim?.donation?.title || delivery.claim?.request?.title}
                                className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                              />
                              {/* Status Badge on Image */}
                              <div className="absolute top-2 right-2">
                                <span className={`px-2 py-1 rounded-md text-xs font-semibold backdrop-blur-sm border ${getStatusColor(delivery.status)}`}>
                                  {delivery.status.replace('_', ' ').toUpperCase()}
                                </span>
                              </div>
                            </div>
                          ) : (
                            <div className="w-full sm:w-64 lg:w-56 h-48 sm:h-64 lg:h-56 rounded-lg bg-gradient-to-br from-navy-800 to-navy-900 flex flex-col items-center justify-center border-2 border-navy-600 shadow-lg">
                              <StatusIcon className="h-16 w-16 text-yellow-400 mb-2" />
                              <span className="text-xs text-gray-400 font-medium uppercase tracking-wide">No Image</span>
                              <span className={`mt-2 px-2 py-1 rounded-md text-xs font-semibold ${getStatusColor(delivery.status)}`}>
                                {delivery.status.replace('_', ' ').toUpperCase()}
                              </span>
                            </div>
                          )}
                        </div>

                        {/* Delivery Details */}
                        <div className="flex-1 space-y-3">
                          {/* Header with View Details */}
                          <div className="flex flex-col sm:flex-row items-start justify-between gap-3 sm:gap-4">
                            <div className="flex-1 min-w-0">
                              <div className="flex flex-wrap items-center gap-2 mb-2">
                                <h3 className="text-lg sm:text-xl font-bold text-white break-words">
                                  {delivery.claim?.donation?.title || delivery.claim?.request?.title || 'Delivery Task'}
                                </h3>
                                {delivery.claim?.donation?.is_urgent && (
                                  <span className="px-3 py-1 rounded-full text-xs font-semibold text-red-400 bg-red-500/20 border border-red-500/30 uppercase">
                                    ⚡ URGENT
                                  </span>
                                )}
                                {delivery.claim?.donation?.donation_destination === 'organization' && (
                                  <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-blue-500/20 text-blue-400 border border-blue-500/30">
                                    <Building className="h-3 w-3" />
                                    Direct
                                  </span>
                                )}
                              </div>
                              <p className="text-gray-300 text-sm line-clamp-2">
                                {delivery.claim?.donation?.description || delivery.claim?.request?.description || 'No description available'}
                              </p>
                            </div>
                            
                            {/* View Details Button */}
                            <button
                              onClick={() => openDetailsModal(delivery)}
                              className="w-full sm:w-auto px-4 py-2.5 sm:py-2 bg-navy-700 hover:bg-navy-600 text-yellow-300 rounded-lg font-medium transition-colors flex items-center justify-center gap-2 border border-navy-600 whitespace-nowrap active:scale-95"
                            >
                              <Eye className="h-4 w-4" />
                              View Details
                            </button>
                          </div>

                          {/* Compact Details */}
                          <div className="space-y-2 text-sm">
                            <div className="flex items-start gap-1.5 text-yellow-300">
                              <MapPin className="h-4 w-4 text-green-400 mt-0.5 flex-shrink-0" />
                              <div className="flex-1 min-w-0">
                                <span className="font-medium">From:</span>
                                <span className="text-white ml-1 break-words">{delivery.pickup_city || 'TBD'}</span>
                              </div>
                            </div>
                            
                            <div className="flex items-start gap-1.5 text-yellow-300">
                              <Navigation className="h-4 w-4 text-red-400 mt-0.5 flex-shrink-0" />
                              <div className="flex-1 min-w-0">
                                <span className="font-medium">To:</span>
                                <span className="text-white ml-1 break-words">{delivery.delivery_city || 'TBD'}</span>
                              </div>
                            </div>
                            
                            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 pt-2 text-yellow-300">
                              {delivery.estimated_distance && (
                                <div className="flex items-center gap-1.5">
                                  <Truck className="h-4 w-4 text-purple-400 flex-shrink-0" />
                                  <span className="font-medium">Distance:</span>
                                  <span className="text-white">~{delivery.estimated_distance}km</span>
                                </div>
                              )}
                              
                              <div className="flex items-center gap-1.5">
                                <User className="h-4 w-4 text-blue-400 flex-shrink-0" />
                                <span className="font-medium whitespace-nowrap">Donor:</span>
                                <span className="text-white truncate">{delivery.claim?.donor?.name || 'Anonymous'}</span>
                                {delivery.claim?.donor?.phone_number && (
                                  <a
                                    href={`tel:${delivery.claim.donor.phone_number}`}
                                    className="text-yellow-400 hover:text-yellow-300 transition-colors flex-shrink-0"
                                  >
                                    <Phone className="h-4 w-4" />
                                  </a>
                                )}
                              </div>
                              
                              <div className="flex items-center gap-1.5">
                                <User className="h-4 w-4 text-green-400 flex-shrink-0" />
                                <span className="font-medium whitespace-nowrap">Recipient:</span>
                                <span className="text-white truncate">{delivery.claim?.recipient?.name || 'Anonymous'}</span>
                                {delivery.claim?.recipient?.phone_number && (
                                  <a
                                    href={`tel:${delivery.claim.recipient.phone_number}`}
                                    className="text-yellow-400 hover:text-yellow-300 transition-colors flex-shrink-0"
                                  >
                                    <Phone className="h-4 w-4" />
                                  </a>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Additional Information */}
                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 p-4 bg-navy-800/50 rounded-lg border border-yellow-500/20">
                            {/* Delivery Timeline */}
                            <div className="space-y-2">
                              <div className="flex items-center gap-2 pb-2 border-b border-navy-700">
                                <div className="w-8 h-8 rounded-lg bg-orange-500/10 flex items-center justify-center">
                                  <Clock className="h-4 w-4 text-orange-400" />
                                </div>
                                <h4 className="text-sm font-semibold text-white">Delivery Timeline</h4>
                              </div>
                              <div className="flex flex-col gap-1.5 text-xs">
                                <div className="flex items-start gap-2">
                                  <span className="text-gray-400 min-w-[60px]">Assigned:</span>
                                  <span className="text-white font-medium">{formatTimeAgo(delivery.created_at)}</span>
                                </div>
                                {delivery.accepted_at && (
                                  <div className="flex items-start gap-2">
                                    <span className="text-gray-400 min-w-[60px]">Accepted:</span>
                                    <span className="text-white font-medium">{formatTimeAgo(delivery.accepted_at)}</span>
                                  </div>
                                )}
                                {delivery.picked_up_at && (
                                  <div className="flex items-start gap-2">
                                    <span className="text-gray-400 min-w-[60px]">Picked up:</span>
                                    <span className="text-white font-medium">{formatTimeAgo(delivery.picked_up_at)}</span>
                                  </div>
                                )}
                                {delivery.in_transit_at && (
                                  <div className="flex items-start gap-2">
                                    <span className="text-gray-400 min-w-[60px]">In transit:</span>
                                    <span className="text-white font-medium">{formatTimeAgo(delivery.in_transit_at)}</span>
                                  </div>
                                )}
                                {delivery.delivered_at && (
                                  <div className="flex items-start gap-2">
                                    <span className="text-gray-400 min-w-[60px]">Delivered:</span>
                                    <span className="text-white font-medium">{formatTimeAgo(delivery.delivered_at)}</span>
                                  </div>
                                )}
                              </div>
                            </div>

                            {/* Documentation Photos */}
                            {(delivery.pickup_photo_url || delivery.delivery_photo_url) && (
                              <div className="space-y-2">
                                <div className="flex items-center gap-2 pb-2 border-b border-navy-700">
                                  <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center">
                                    <Camera className="h-4 w-4 text-blue-400" />
                                  </div>
                                  <h4 className="text-sm font-semibold text-white">Documentation</h4>
                                </div>
                                <div className="flex flex-col gap-2">
                                  {delivery.pickup_photo_url && (
                                    <button
                                      onClick={() => {
                                        setSelectedPhoto({ url: delivery.pickup_photo_url, type: 'Before Pickup' })
                                        setShowPhotoModal(true)
                                      }}
                                      className="px-3 py-2 bg-navy-700 hover:bg-navy-600 text-yellow-300 rounded-lg text-xs font-medium transition-colors flex items-center justify-between gap-2 border border-navy-600 group"
                                    >
                                      <span className="flex items-center gap-2">
                                        <Camera className="h-3.5 w-3.5" />
                                        Before Photo
                                      </span>
                                      <Eye className="h-3.5 w-3.5 opacity-50 group-hover:opacity-100" />
                                    </button>
                                  )}
                                  {delivery.delivery_photo_url && (
                                    <button
                                      onClick={() => {
                                        setSelectedPhoto({ url: delivery.delivery_photo_url, type: 'After Delivery' })
                                        setShowPhotoModal(true)
                                      }}
                                      className="px-3 py-2 bg-navy-700 hover:bg-navy-600 text-yellow-300 rounded-lg text-xs font-medium transition-colors flex items-center justify-between gap-2 border border-navy-600 group"
                                    >
                                      <span className="flex items-center gap-2">
                                        <Camera className="h-3.5 w-3.5" />
                                        After Photo
                                      </span>
                                      <Eye className="h-3.5 w-3.5 opacity-50 group-hover:opacity-100" />
                                    </button>
                                  )}
                                </div>
                              </div>
                            )}

                            {/* Volunteer Notes */}
                            {delivery.volunteer_notes && (
                              <div className="space-y-2">
                                <div className="flex items-center gap-2 pb-2 border-b border-navy-700">
                                  <div className="w-8 h-8 rounded-lg bg-purple-500/10 flex items-center justify-center">
                                    <MessageCircle className="h-4 w-4 text-purple-400" />
                                  </div>
                                  <h4 className="text-sm font-semibold text-white">Your Notes</h4>
                                </div>
                                <p className="text-xs text-gray-300 leading-relaxed line-clamp-4">{delivery.volunteer_notes}</p>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Action Section */}
                        {nextAction && (
                          <div className="flex flex-col justify-center lg:min-w-[200px] border-t-2 lg:border-t-0 lg:border-l-2 border-yellow-500/20 pt-4 lg:pt-0 lg:pl-6 mt-4 lg:mt-0">
                            <button
                              onClick={() => openStatusModal(delivery, nextAction.action)}
                              className={`px-5 py-3.5 sm:py-3 rounded-lg font-bold text-sm sm:text-base transition-all duration-200 flex items-center justify-center gap-2 text-white shadow-lg hover:shadow-xl transform hover:scale-105 active:scale-95 border-2 border-white/20 ${nextAction.color}`}
                            >
                              <nextAction.icon className="h-5 w-5 flex-shrink-0" />
                              {nextAction.label}
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </motion.div>
                )
              })}
            </div>
          )}
        </motion.div>

        {/* Status Update Modal */}
        {showStatusModal && selectedDelivery && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-navy-900 border border-navy-700 rounded-xl max-w-lg w-full max-h-[90vh] overflow-hidden"
            >
              <div className="sticky top-0 bg-navy-900 border-b border-navy-700 px-4 sm:px-6 py-4 flex items-center justify-between">
                <h3 className="text-lg sm:text-xl font-semibold text-white">
                  Update Delivery Status
                </h3>
                <button
                  onClick={() => setShowStatusModal(false)}
                  className="text-yellow-400 hover:text-yellow-300 p-2 hover:bg-navy-800 rounded-lg transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              
              <div className="p-4 sm:p-6 space-y-4 overflow-y-auto max-h-[calc(90vh-5rem)]">
                <div className="bg-navy-800/50 rounded-lg p-3 sm:p-4">
                  <p className="text-yellow-300 text-sm">
                    Updating status to: <span className="font-semibold text-white">{statusUpdate.status.replace('_', ' ').toUpperCase()}</span>
                  </p>
                  {statusUpdate.status === 'delivered' && (
                    <p className="text-emerald-400 text-xs mt-1">
                      This will mark the delivery as complete and notify all parties.
                    </p>
                  )}
                </div>

                {/* Photo Requirements */}
                {statusUpdate.status === 'accepted' && (
                  <div className="space-y-3">
                    <label className="block text-sm font-medium text-yellow-300">
                      Take Before Photo (Required)
                    </label>
                    <div className="border-2 border-dashed border-navy-600 rounded-lg p-4 text-center">
                      {statusUpdate.pickup_photo ? (
                        <div className="space-y-3">
                          <div className="relative bg-navy-800 rounded-lg overflow-hidden">
                            <img 
                              src={statusUpdate.pickup_photo.preview} 
                              alt="Before photo preview" 
                              className="w-full h-48 object-cover"
                              onError={(e) => {
                                console.error('Error loading photo preview:', e);
                                e.target.style.display = 'none';
                              }}
                            />
                          </div>
                          <div className="flex items-center justify-center gap-2">
                            <button
                              onClick={() => setStatusUpdate(prev => ({ ...prev, pickup_photo: null }))}
                              className="inline-flex items-center gap-1 px-3 py-1 bg-red-600 hover:bg-red-700 text-white text-sm rounded-lg transition-colors"
                            >
                              <X className="h-3 w-3" />
                              Remove Photo
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div>
                          <Camera className="h-8 w-8 text-yellow-500 mx-auto mb-2" />
                          <p className="text-sm text-yellow-300 mb-2">
                            Take a photo of the items before starting the delivery
                          </p>
                          <input
                            type="file"
                            accept="image/*,video/*"
                            capture="environment"
                            onChange={(e) => handlePhotoCapture(e, 'pickup_photo')}
                            className="hidden"
                            id="before-photo"
                          />
                          <label
                            htmlFor="before-photo"
                            className="inline-flex items-center px-4 py-3 bg-yellow-600 hover:bg-yellow-700 text-white rounded-lg cursor-pointer transition-colors font-medium"
                          >
                            <Camera className="h-5 w-5 mr-2" />
                            Take Before Photo
                          </label>
                          <p className="text-xs text-yellow-400 mt-2">
                            Photo will be visible immediately after capture
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {statusUpdate.status === 'delivered' && (
                  <div className="space-y-3">
                    <label className="block text-sm font-medium text-yellow-300">
                      Take After Photo (Required)
                    </label>
                    <div className="border-2 border-dashed border-navy-600 rounded-lg p-4 text-center">
                      {statusUpdate.delivery_photo ? (
                        <div className="space-y-3">
                          <div className="relative bg-navy-800 rounded-lg overflow-hidden">
                            <img 
                              src={statusUpdate.delivery_photo.preview} 
                              alt="After photo preview" 
                              className="w-full h-48 object-cover"
                              onError={(e) => {
                                console.error('Error loading photo preview:', e);
                                e.target.style.display = 'none';
                              }}
                            />
                          </div>
                          <div className="flex items-center justify-center gap-2">
                            <button
                              onClick={() => setStatusUpdate(prev => ({ ...prev, delivery_photo: null }))}
                              className="inline-flex items-center gap-1 px-3 py-1 bg-red-600 hover:bg-red-700 text-white text-sm rounded-lg transition-colors"
                            >
                              <X className="h-3 w-3" />
                              Remove Photo
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div>
                          <Camera className="h-8 w-8 text-yellow-500 mx-auto mb-2" />
                          <p className="text-sm text-yellow-300 mb-2">
                            Take a photo showing successful delivery to the recipient
                          </p>
                          <input
                            type="file"
                            accept="image/*,video/*"
                            capture="environment"
                            onChange={(e) => handlePhotoCapture(e, 'delivery_photo')}
                            className="hidden"
                            id="after-photo"
                          />
                          <label
                            htmlFor="after-photo"
                            className="inline-flex items-center px-4 py-3 bg-yellow-600 hover:bg-yellow-700 text-white rounded-lg cursor-pointer transition-colors font-medium"
                          >
                            <Camera className="h-5 w-5 mr-2" />
                            Take After Photo
                          </label>
                          <p className="text-xs text-yellow-400 mt-2">
                            Photo will be visible immediately after capture
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Notes */}
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-yellow-300">
                    Notes (optional)
                  </label>
                  <textarea
                    value={statusUpdate.notes}
                    onChange={(e) => setStatusUpdate(prev => ({ ...prev, notes: e.target.value }))}
                    placeholder="Add any relevant notes about this status update..."
                    className="w-full px-3 py-2 bg-navy-800 border border-navy-600 rounded-lg text-white placeholder-gray-400 focus:border-yellow-500 focus:outline-none"
                    rows={3}
                  />
                </div>

                {/* Action Buttons */}
                <div className="flex flex-col sm:flex-row gap-3 pt-4">
                  <button
                    onClick={() => setShowStatusModal(false)}
                    className="flex-1 px-4 py-3 sm:py-2 bg-navy-700 hover:bg-navy-600 text-yellow-300 rounded-lg font-medium transition-colors active:scale-95"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => handleStatusUpdate(selectedDelivery.id, statusUpdate.status, statusUpdate.notes)}
                    disabled={uploading || 
                      (statusUpdate.status === 'accepted' && !statusUpdate.pickup_photo) ||
                      (statusUpdate.status === 'delivered' && !statusUpdate.delivery_photo)
                    }
                    className="flex-1 px-4 py-3 sm:py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-2 active:scale-95"
                  >
                    {uploading ? (
                      <>
                        <LoadingSpinner size="sm" />
                        Updating...
                      </>
                    ) : (
                      <>
                        <Check className="h-4 w-4" />
                        Update Status
                      </>
                    )}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}

        {/* Delivery Details Modal */}
        {showDetailsModal && selectedDelivery && (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="card max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col"
            >
              {/* Modal Header */}
              <div className="sticky top-0 bg-navy-900 border-b-2 border-yellow-500/20 px-4 sm:px-6 py-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-yellow-500/10 flex items-center justify-center flex-shrink-0">
                    <Package className="h-5 w-5 text-yellow-400" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-lg sm:text-xl font-bold text-white">Delivery Details</h3>
                    <p className="text-xs text-gray-400 hidden sm:block">Complete delivery information</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowDetailsModal(false)}
                  className="p-2 rounded-lg hover:bg-navy-800 text-gray-400 hover:text-yellow-400 transition-colors flex-shrink-0"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              
              <div className="p-4 sm:p-6 space-y-4 sm:space-y-5 overflow-y-auto">
                {/* Basic Information */}
                <div className="bg-navy-800/50 rounded-lg p-4 border border-navy-700">
                  <div className="flex items-center gap-2 mb-4 pb-3 border-b border-navy-700">
                    <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center">
                      <Package className="h-4 w-4 text-blue-400" />
                    </div>
                    <h4 className="text-sm font-semibold text-white">Basic Information</h4>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-gray-400 mb-1">Item</label>
                      <p className="text-sm text-white font-medium">{selectedDelivery.claim?.donation?.title || selectedDelivery.claim?.request?.title || 'N/A'}</p>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-400 mb-1">Status</label>
                      <span className={`inline-flex px-3 py-1 rounded-full text-xs font-semibold border ${getStatusColor(selectedDelivery.status)}`}>
                        {selectedDelivery.status.replace('_', ' ').toUpperCase()}
                      </span>
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-xs font-medium text-gray-400 mb-1">Description</label>
                      <p className="text-sm text-gray-300 leading-relaxed">{selectedDelivery.claim?.donation?.description || selectedDelivery.claim?.request?.description || 'No description available'}</p>
                    </div>
                  </div>
                </div>

                {/* Route Information */}
                <div className="bg-navy-800/50 rounded-lg p-4 border border-navy-700">
                  <div className="flex items-center gap-2 mb-4 pb-3 border-b border-navy-700">
                    <div className="w-8 h-8 rounded-lg bg-green-500/10 flex items-center justify-center">
                      <MapPin className="h-4 w-4 text-green-400" />
                    </div>
                    <h4 className="text-sm font-semibold text-white">Route Information</h4>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-gray-400 mb-1">Pickup Location</label>
                      <div className="flex items-center gap-2 text-sm text-white font-medium">
                        <MapPin className="h-4 w-4 text-green-400" />
                        <span>{selectedDelivery.pickup_city || 'TBD'}</span>
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-400 mb-1">Delivery Location</label>
                      <div className="flex items-center gap-2 text-sm text-white font-medium">
                        <MapPin className="h-4 w-4 text-red-400" />
                        <span>{selectedDelivery.delivery_city || 'TBD'}</span>
                      </div>
                    </div>
                    {selectedDelivery.estimated_distance && (
                      <div>
                        <label className="block text-xs font-medium text-gray-400 mb-1">Estimated Distance</label>
                        <div className="flex items-center gap-2 text-sm text-white font-medium">
                          <Navigation className="h-4 w-4 text-purple-400" />
                          <span>~{selectedDelivery.estimated_distance}km</span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Contact Information */}
                <div className="bg-navy-800/50 rounded-lg p-4 border border-navy-700">
                  <div className="flex items-center gap-2 mb-4 pb-3 border-b border-navy-700">
                    <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center">
                      <User className="h-4 w-4 text-blue-400" />
                    </div>
                    <h4 className="text-sm font-semibold text-white">Contact Information</h4>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="block text-xs font-medium text-gray-400">Donor</label>
                      <div className="flex items-center gap-2 text-white">
                        <User className="h-4 w-4 text-blue-400" />
                        <span>{selectedDelivery.claim?.donor?.name || 'Anonymous'}</span>
                        {selectedDelivery.claim?.donor?.phone_number && (
                          <a
                            href={`tel:${selectedDelivery.claim.donor.phone_number}`}
                            className="text-yellow-400 hover:text-yellow-300 transition-colors"
                          >
                            <Phone className="h-4 w-4" />
                          </a>
                        )}
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="block text-xs font-medium text-gray-400">Recipient</label>
                      <div className="flex items-center gap-2 text-white">
                        <User className="h-4 w-4 text-green-400" />
                        <span>{selectedDelivery.claim?.recipient?.name || 'Anonymous'}</span>
                        {selectedDelivery.claim?.recipient?.phone_number && (
                          <a
                            href={`tel:${selectedDelivery.claim.recipient.phone_number}`}
                            className="text-yellow-400 hover:text-yellow-300 transition-colors"
                          >
                            <Phone className="h-4 w-4" />
                          </a>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Timeline */}
                <div className="bg-navy-800/50 rounded-lg p-4 border border-navy-700">
                  <div className="flex items-center gap-2 mb-4 pb-3 border-b border-navy-700">
                    <div className="w-8 h-8 rounded-lg bg-orange-500/10 flex items-center justify-center">
                      <Clock className="h-4 w-4 text-orange-400" />
                    </div>
                    <h4 className="text-sm font-semibold text-white">Delivery Timeline</h4>
                  </div>
                  <div className="space-y-3">
                    <div className="flex items-center gap-3 text-sm">
                      <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
                      <span className="text-gray-400 text-xs">Assigned:</span>
                      <span className="text-white">{formatTimeAgo(selectedDelivery.created_at)}</span>
                    </div>
                    {selectedDelivery.accepted_at && (
                      <div className="flex items-center gap-3 text-sm">
                        <div className="w-2 h-2 bg-purple-400 rounded-full"></div>
                        <span className="text-gray-400 text-xs">Accepted:</span>
                        <span className="text-white">{formatTimeAgo(selectedDelivery.accepted_at)}</span>
                      </div>
                    )}
                    {selectedDelivery.picked_up_at && (
                      <div className="flex items-center gap-3 text-sm">
                        <div className="w-2 h-2 bg-yellow-400 rounded-full"></div>
                        <span className="text-gray-400 text-xs">Picked up:</span>
                        <span className="text-white">{formatTimeAgo(selectedDelivery.picked_up_at)}</span>
                      </div>
                    )}
                    {selectedDelivery.in_transit_at && (
                      <div className="flex items-center gap-3 text-sm">
                        <div className="w-2 h-2 bg-orange-400 rounded-full"></div>
                        <span className="text-gray-400 text-xs">In transit:</span>
                        <span className="text-white">{formatTimeAgo(selectedDelivery.in_transit_at)}</span>
                      </div>
                    )}
                    {selectedDelivery.delivered_at && (
                      <div className="flex items-center gap-3 text-sm">
                        <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                        <span className="text-gray-400 text-xs">Delivered:</span>
                        <span className="text-white">{formatTimeAgo(selectedDelivery.delivered_at)}</span>
                      </div>
                    )}

                  </div>
                </div>

                {/* Photos */}
                {(selectedDelivery.pickup_photo_url || selectedDelivery.delivery_photo_url) && (
                  <div className="bg-navy-800/50 rounded-lg p-4 border border-navy-700">
                    <div className="flex items-center gap-2 mb-4 pb-3 border-b border-navy-700">
                      <div className="w-8 h-8 rounded-lg bg-purple-500/10 flex items-center justify-center">
                        <Camera className="h-4 w-4 text-purple-400" />
                      </div>
                      <h4 className="text-sm font-semibold text-white">Documentation Photos</h4>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {selectedDelivery.pickup_photo_url && (
                        <div className="space-y-2">
                          <label className="block text-xs font-medium text-gray-400">Before Photo</label>
                          <img 
                            src={selectedDelivery.pickup_photo_url} 
                            alt="Before delivery photo" 
                            className="w-full h-48 object-cover rounded-lg border border-navy-600"
                          />
                          <p className="text-xs text-gray-400">Items before delivery started</p>
                        </div>
                      )}
                      {selectedDelivery.delivery_photo_url && (
                        <div className="space-y-2">
                          <label className="block text-xs font-medium text-gray-400">After Photo</label>
                          <img 
                            src={selectedDelivery.delivery_photo_url} 
                            alt="After delivery photo" 
                            className="w-full h-48 object-cover rounded-lg border border-navy-600"
                          />
                          <p className="text-xs text-gray-400">Proof of successful delivery</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Notes */}
                {selectedDelivery.volunteer_notes && (
                  <div className="bg-navy-800/50 rounded-lg p-4 border border-navy-700">
                    <div className="flex items-center gap-2 mb-3 pb-3 border-b border-navy-700">
                      <div className="w-8 h-8 rounded-lg bg-yellow-500/10 flex items-center justify-center">
                        <MessageCircle className="h-4 w-4 text-yellow-400" />
                      </div>
                      <h4 className="text-sm font-semibold text-white">Your Notes</h4>
                    </div>
                    <p className="text-sm text-gray-300 leading-relaxed">{selectedDelivery.volunteer_notes}</p>
                  </div>
                )}

                {/* Close Button */}
                <div className="flex justify-end pt-2">
                  <button
                    onClick={() => setShowDetailsModal(false)}
                    className="px-6 py-3 bg-gradient-to-r from-yellow-600 to-yellow-500 hover:from-yellow-500 hover:to-yellow-400 text-white rounded-lg font-bold transition-all duration-200 transform hover:scale-105 shadow-lg flex items-center gap-2"
                  >
                    <Check className="h-4 w-4" />
                    Close
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}

        {/* Photo Viewer Modal */}
        {showPhotoModal && selectedPhoto && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50" onClick={() => setShowPhotoModal(false)}>
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="relative max-w-4xl w-full"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Close Button */}
              <button
                onClick={() => setShowPhotoModal(false)}
                className="absolute -top-12 right-0 text-white hover:text-yellow-400 transition-colors"
              >
                <X className="h-8 w-8" />
              </button>
              
              {/* Photo Label */}
              <div className="absolute -top-12 left-0 text-white">
                <h3 className="text-xl font-bold">{selectedPhoto.type}</h3>
              </div>

              {/* Photo */}
              <div className="bg-navy-900 rounded-xl overflow-hidden border-2 border-yellow-500/30 shadow-2xl">
                <img 
                  src={selectedPhoto.url} 
                  alt={selectedPhoto.type}
                  className="w-full h-auto max-h-[80vh] object-contain"
                />
              </div>
              
              {/* Hint */}
              <p className="text-center text-gray-400 text-sm mt-4">
                Click outside to close
              </p>
            </motion.div>
          </div>
        )}
      </div>
    </div>
  )
}

export default MyDeliveriesPage 