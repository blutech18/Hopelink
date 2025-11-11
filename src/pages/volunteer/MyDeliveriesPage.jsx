import React, { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { 
  MapPin, 
  Clock, 
  Package, 
  User, 
  Phone,
  Copy,
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

  const formatDateTime = (dateString) => {
    if (!dateString) return null
    const date = new Date(dateString)
    if (Number.isNaN(date.getTime())) return null
    return date.toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const formatFullAddress = (user) => {
    if (!user) return 'Address not available'
    
    const addressParts = []
    
    // Add street/house details
    if (user.address_street) addressParts.push(user.address_street)
    if (user.address_house) addressParts.push(user.address_house)
    if (user.address_subdivision) addressParts.push(user.address_subdivision)
    
    // Add barangay
    if (user.address_barangay) addressParts.push(`Brgy. ${user.address_barangay}`)
    
    // Add landmark
    if (user.address_landmark) addressParts.push(`(${user.address_landmark})`)
    
    // Add city
    if (user.city) addressParts.push(user.city)
    
    // Add province
    if (user.province) addressParts.push(user.province)
    
    // Add ZIP code
    if (user.zip_code) addressParts.push(user.zip_code)
    
    // Fallback to general address field if no structured address
    if (addressParts.length === 0 && user.address) {
      return user.address
    }
    
    return addressParts.length > 0 ? addressParts.join(', ') : 'Address not available'
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
              
            </div>
            {/* Result Count Badge - right aligned */}
            {deliveries.length > 0 && (
              <div className="lg:ml-auto">
                <div className="mt-2 lg:mt-0 inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-yellow-600/20 to-yellow-500/20 border border-yellow-500/30 rounded-full">
                  <Truck className="h-4 w-4 text-yellow-400" />
                  <span className="text-yellow-300 font-semibold text-sm">
                    {deliveries.length} {deliveries.length === 1 ? 'Delivery' : 'Deliveries'}
                  </span>
                </div>
              </div>
            )}
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
                    className="relative"
                  >
                    {/* Delivery Timeline Extension - Connected to Card */}
                    {(() => {
                      const status = delivery.status
                      const colors = status === 'delivered'
                        ? { gradient: 'from-emerald-900/35 via-emerald-800/30 to-emerald-900/35', borderClass: 'border-emerald-500', borderLeftHex: '#22c55e', iconColor: 'text-white', labelColor: 'text-white' }
                        : status === 'in_transit'
                        ? { gradient: 'from-orange-900/35 via-orange-800/30 to-orange-900/35', borderClass: 'border-orange-500', borderLeftHex: '#fb923c', iconColor: 'text-white', labelColor: 'text-white' }
                        : status === 'picked_up'
                        ? { gradient: 'from-yellow-900/35 via-yellow-800/30 to-yellow-900/35', borderClass: 'border-yellow-500', borderLeftHex: '#fbbf24', iconColor: 'text-white', labelColor: 'text-white' }
                        : status === 'accepted'
                        ? { gradient: 'from-purple-900/35 via-purple-800/30 to-purple-900/35', borderClass: 'border-purple-500', borderLeftHex: '#a78bfa', iconColor: 'text-white', labelColor: 'text-white' }
                        : { gradient: 'from-sky-900/35 via-sky-800/30 to-sky-900/35', borderClass: 'border-sky-500', borderLeftHex: '#60a5fa', iconColor: 'text-white', labelColor: 'text-white' }
                      return (
                        <div
                          className={`px-4 py-3 bg-gradient-to-r ${colors.gradient} border-l-2 border-t-2 border-r-2 border-b-0 ${colors.borderClass} rounded-t-lg mb-0 relative z-10`}
                          style={{
                            borderTopLeftRadius: '0.5rem',
                            borderTopRightRadius: '0.5rem',
                            borderBottomLeftRadius: '0',
                            borderBottomRightRadius: '0',
                            marginBottom: '0',
                            borderLeftColor: colors.borderLeftHex
                          }}
                        >
                          <div className="flex items-center justify-between gap-4 flex-wrap">
                            <div className="flex items-center gap-2">
                              <Clock className={`h-4 w-4 ${colors.iconColor}`} />
                              <span className={`text-xs font-semibold uppercase tracking-wide whitespace-nowrap ${colors.labelColor}`}>Timeline:</span>
                            </div>
                            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs">
                              <div className="flex items-center gap-2">
                                <span className="text-gray-200/80">Assigned:</span>
                                <span className="text-white font-medium">{formatTimeAgo(delivery.created_at)}</span>
                              </div>
                              {delivery.accepted_at && (
                                <div className="flex items-center gap-2">
                                  <span className="text-gray-200/80">Accepted:</span>
                                  <span className="text-white font-medium">{formatTimeAgo(delivery.accepted_at)}</span>
                                </div>
                              )}
                              {delivery.picked_up_at && (
                                <div className="flex items-center gap-2">
                                  <span className="text-gray-200/80">Picked up:</span>
                                  <span className="text-white font-medium">{formatTimeAgo(delivery.picked_up_at)}</span>
                                </div>
                              )}
                              {delivery.in_transit_at && (
                                <div className="flex items-center gap-2">
                                  <span className="text-gray-200/80">In transit:</span>
                                  <span className="text-white font-medium">{formatTimeAgo(delivery.in_transit_at)}</span>
                                </div>
                              )}
                              {delivery.delivered_at && (
                                <div className="flex items-center gap-2">
                                  <span className="text-gray-200/80">Delivered:</span>
                                  <span className="text-white font-medium">{formatTimeAgo(delivery.delivered_at)}</span>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      )
                    })()}

                    {/* Card */}
                    <div
                      className="card hover:shadow-xl transition-all duration-300 overflow-hidden border-2 border-navy-700 cursor-default group rounded-t-none -mt-[1px]"
                      style={{
                        borderTopLeftRadius: '0',
                        borderTopRightRadius: '0',
                        marginTop: '-1px'
                      }}
                    >
                      <div className="flex flex-col sm:flex-row gap-4 p-4">
                        {/* Item Image or Placeholder */}
                        <div className="flex-shrink-0">
                          {(delivery.claim?.donation?.images && delivery.claim.donation.images.length > 0) ? (
                            <div className="relative w-full sm:w-56 lg:w-64 h-48 sm:h-56 lg:h-64 rounded-lg overflow-hidden border-2 border-yellow-500/30">
                              <img 
                                src={delivery.claim.donation.images[0]} 
                                alt={delivery.claim?.donation?.title || 'Delivery Item'}
                                className="w-full h-full object-cover"
                              />
                            </div>
                          ) : (
                            <div className="w-full sm:w-56 lg:w-64 h-48 sm:h-56 lg:h-64 rounded-lg bg-gradient-to-br from-navy-800 to-navy-900 flex flex-col items-center justify-center border-2 border-navy-600">
                              <StatusIcon className="h-12 w-12 text-yellow-400 mb-2" />
                              <span className="text-xs text-gray-400 font-medium uppercase tracking-wide">No Image</span>
                            </div>
                          )}
                        </div>

                        {/* Delivery Details */}
                        <div className="flex-1 min-w-0">
                          {/* Header with Title and Badges */}
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex-1 min-w-0 pr-2">
                              <h3 className="text-lg sm:text-xl font-bold text-white mb-2 line-clamp-2 leading-tight">
                                {delivery.claim?.donation?.title || delivery.claim?.request?.title || 'Delivery Task'}
                              </h3>
                              
                              {/* Badges Row */}
                              <div className="flex flex-wrap gap-2 mb-2">
                                <span className={`inline-flex items-center px-2.5 py-1 rounded text-xs font-semibold border ${getStatusColor(delivery.status)}`}>
                                  {delivery.status.replace('_', ' ').toUpperCase()}
                                </span>
                                {delivery.claim?.donation?.is_urgent && (
                                  <span className="inline-flex items-center px-2.5 py-1 rounded text-xs font-semibold text-red-400 bg-red-500/20 border border-red-500/30">
                                    ⚡ URGENT
                                  </span>
                                )}
                                {delivery.claim?.donation?.donation_destination === 'organization' && (
                                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded text-xs font-medium bg-blue-500/20 text-blue-400 border border-blue-500/30">
                                    <Building className="h-3 w-3" />
                                    Direct
                                  </span>
                                )}
                              </div>
                            </div>
                            
                            {/* Action Buttons */}
                            <div className="flex flex-col gap-2 flex-shrink-0">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation()
                                  openDetailsModal(delivery)
                                }}
                                className="w-32 sm:w-36 justify-center px-3 py-2 bg-navy-700 hover:bg-navy-600 text-white text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5 shadow-md hover:shadow-lg active:scale-95 whitespace-nowrap"
                              >
                                <Eye className="h-3.5 w-3.5" />
                                <span>View Details</span>
                              </button>
                              {nextAction && (
                              <button
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    openStatusModal(delivery, nextAction.action)
                                  }}
                                  className={`px-3 py-2 rounded-lg text-white text-xs font-semibold transition-all flex items-center justify-center gap-1.5 shadow-lg hover:shadow-xl whitespace-nowrap active:scale-95 ${nextAction.color}`}
                                >
                                  <nextAction.icon className="h-3.5 w-3.5" />
                                  <span>{nextAction.label}</span>
                                </button>
                              )}
                            </div>
                          </div>

                          {/* Description */}
                          {(delivery.claim?.donation?.description || delivery.claim?.request?.description) && (
                            <p className="text-gray-300 text-sm mb-3 line-clamp-2 leading-relaxed">
                              {delivery.claim?.donation?.description || delivery.claim?.request?.description}
                            </p>
                          )}

                          {/* Compact Info Grid */}
                          <div className="grid grid-cols-2 gap-x-3 gap-y-2.5 mb-3 text-sm">
                            <div className="flex items-center gap-2 min-w-0">
                              <MapPin className="h-4 w-4 text-green-400 flex-shrink-0" />
                              <span className="text-yellow-400 font-semibold text-xs uppercase tracking-wide flex-shrink-0">From:</span>
                              <span className="text-white font-semibold truncate flex-1">{delivery.pickup_city || 'TBD'}</span>
                            </div>
                            
                            <div className="flex items-center gap-2 min-w-0">
                              <Navigation className="h-4 w-4 text-red-400 flex-shrink-0" />
                              <span className="text-yellow-400 font-semibold text-xs uppercase tracking-wide flex-shrink-0">To:</span>
                              <span className="text-white font-semibold truncate flex-1">{delivery.delivery_city || 'TBD'}</span>
                            </div>
                            
                            {delivery.estimated_distance && (
                              <div className="flex items-center gap-2 min-w-0">
                                <Truck className="h-4 w-4 text-purple-400 flex-shrink-0" />
                                <span className="text-yellow-400 font-semibold text-xs uppercase tracking-wide flex-shrink-0">Distance:</span>
                                <span className="text-white font-semibold truncate flex-1">~{delivery.estimated_distance}km</span>
                              </div>
                            )}
                            
                            <div className="flex items-start gap-2 min-w-0">
                              <User className="h-4 w-4 text-blue-400 flex-shrink-0 mt-0.5" />
                              <span className="text-yellow-400 font-semibold text-xs uppercase tracking-wide flex-shrink-0 mt-0.5">Donor:</span>
                              <div className="flex-1 min-w-0 flex items-center gap-2">
                                <span className="text-white font-semibold truncate">
                                  {delivery.claim?.donor?.name || 'Anonymous'}
                                </span>
                                {delivery.claim?.donor?.phone_number && (
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      navigator.clipboard.writeText(delivery.claim.donor.phone_number)
                                      success('Donor phone number copied!')
                                    }}
                                    className="text-yellow-400 hover:text-yellow-300 transition-colors flex-shrink-0"
                                    title="Copy donor number"
                                  >
                                    <Copy className="h-3.5 w-3.5" />
                                  </button>
                                )}
                              </div>
                            </div>
                            
                            <div className="flex items-start gap-2 min-w-0">
                              <User className="h-4 w-4 text-green-400 flex-shrink-0 mt-0.5" />
                              <span className="text-yellow-400 font-semibold text-xs uppercase tracking-wide flex-shrink-0 mt-0.5">Recipient:</span>
                              <div className="flex-1 min-w-0 flex items-center gap-2">
                                <span className="text-white font-semibold truncate">
                                  {delivery.claim?.recipient?.name || 'Anonymous'}
                                </span>
                                {delivery.claim?.recipient?.phone_number && (
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      navigator.clipboard.writeText(delivery.claim.recipient.phone_number)
                                      success('Recipient phone number copied!')
                                    }}
                                    className="text-yellow-400 hover:text-yellow-300 transition-colors flex-shrink-0"
                                    title="Copy recipient number"
                                  >
                                    <Copy className="h-3.5 w-3.5" />
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Contact Info buttons removed per request; keeping Photos quick link if available */}
                          {(delivery.pickup_photo_url || delivery.delivery_photo_url) && (
                            <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-sm">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation()
                                  openDetailsModal(delivery)
                                }}
                                className="inline-flex items-center gap-1.5 text-blue-400 hover:text-blue-300 transition-colors"
                              >
                                <Camera className="h-3.5 w-3.5" />
                                <span className="font-medium">Photos</span>
                              </button>
                            </div>
                          )}
                        </div>
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
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 z-50">
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
                    <Package className="h-5 w-5 sm:h-6 sm:w-6 text-yellow-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-base sm:text-lg lg:text-xl font-bold text-white truncate">Delivery Details</h3>
                    <p className="text-[10px] sm:text-xs text-yellow-300">Complete information</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowDetailsModal(false)}
                  className="text-gray-400 hover:text-white transition-colors p-1.5 sm:p-2 hover:bg-navy-800 rounded-lg flex-shrink-0"
                >
                  <X className="h-5 w-5 sm:h-6 sm:w-6" />
                </button>
              </div>
              
              {/* Content with Custom Scrollbar */}
              <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-3 sm:py-4 custom-scrollbar">
                <div className="space-y-4 sm:space-y-6">
                  {/* Product Image */}
                  {(selectedDelivery.claim?.donation?.images && selectedDelivery.claim.donation.images.length > 0) && (
                    <div className="relative rounded-lg overflow-hidden bg-navy-800">
                      <img
                        src={selectedDelivery.claim.donation.images[0]}
                        alt={selectedDelivery.claim?.donation?.title || 'Delivery Item'}
                        className="w-full h-48 sm:h-64 object-cover"
                      />
                      {selectedDelivery.claim?.donation?.is_urgent && (
                        <div className="absolute top-2 right-2 bg-red-600 text-white px-3 py-1.5 rounded-full text-xs font-medium flex items-center">
                          <AlertCircle className="h-3 w-3 mr-1" />
                          Urgent
                        </div>
                      )}
                    </div>
                  )}

                  {/* Item & Status */}
                  <div className="bg-navy-800/50 rounded-lg p-3 sm:p-4 border border-navy-700">
                    <div className="flex flex-col sm:flex-row items-start justify-between gap-2 sm:gap-4 mb-2 sm:mb-3">
                      <h4 className="text-lg sm:text-xl lg:text-2xl font-bold text-white">{selectedDelivery.claim?.donation?.title || selectedDelivery.claim?.request?.title || 'Delivery Task'}</h4>
                      <span className={`px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-full text-[10px] sm:text-xs font-semibold border ${getStatusColor(selectedDelivery.status)} whitespace-nowrap`}>
                        {selectedDelivery.status.replace('_', ' ').toUpperCase()}
                      </span>
                    </div>
                    {(selectedDelivery.claim?.donation?.description || selectedDelivery.claim?.request?.description) && (
                      <p className="text-sm sm:text-base text-gray-300 leading-relaxed">{selectedDelivery.claim?.donation?.description || selectedDelivery.claim?.request?.description}</p>
                    )}
                  </div>

                  {/* Route Information */}
                  <div className="bg-navy-800/30 rounded-lg p-4 border border-navy-700">
                    <div className="flex items-start gap-2">
                      <MapPin className="h-4 w-4 text-green-400 mt-0.5 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <label className="text-sm font-semibold text-yellow-300 block mb-2">Pickup Location (From)</label>
                        <p className="text-white text-sm leading-relaxed break-words">
                          {formatFullAddress(selectedDelivery.claim?.donor)}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-navy-800/30 rounded-lg p-4 border border-navy-700">
                    <div className="flex items-start gap-2">
                      <Navigation className="h-4 w-4 text-red-400 mt-0.5 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <label className="text-sm font-semibold text-yellow-300 block mb-2">Delivery Location (To)</label>
                        <p className="text-white text-sm leading-relaxed break-words">
                          {formatFullAddress(selectedDelivery.claim?.recipient)}
                        </p>
                      </div>
                    </div>
                  </div>

                  {selectedDelivery.estimated_distance && (
                    <div className="bg-navy-800/30 rounded-lg p-4 border border-navy-700">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Truck className="h-4 w-4 text-purple-400" />
                          <label className="text-sm font-semibold text-yellow-300">Estimated Distance</label>
                        </div>
                        <p className="text-white text-lg font-medium">~{selectedDelivery.estimated_distance}km</p>
                      </div>
                    </div>
                  )}

                  {/* Contact Information */}
                  <div className="bg-navy-800/30 rounded-lg p-4 border border-navy-700">
                    <div className="flex items-center gap-2 mb-4">
                      <User className="h-4 w-4 text-blue-400" />
                      <label className="text-sm font-semibold text-yellow-300">Contact Information</label>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Donor Details */}
                      <div className="bg-navy-900/40 rounded-lg p-3 border border-navy-700/60">
                        <div className="flex items-center gap-2 mb-3">
                          <User className="h-4 w-4 text-blue-400" />
                          <span className="text-sm font-semibold text-white">Donor</span>
                        </div>
                        <div className="space-y-2 text-sm">
                          <div className="flex gap-3">
                            <span className="text-gray-400 w-20 flex-shrink-0">Name:</span>
                            <span className={`flex-1 break-words ${selectedDelivery.claim?.donor?.name ? 'text-white' : 'text-gray-400 italic'}`}>
                              {selectedDelivery.claim?.donor?.name || 'Not provided'}
                            </span>
                          </div>
                          <div className="flex gap-3 items-center">
                            <span className="text-gray-400 w-20 flex-shrink-0">Mobile:</span>
                            <div className="flex items-center gap-2 flex-1 break-words">
                              <span className={`${selectedDelivery.claim?.donor?.phone_number ? 'text-white' : 'text-gray-400 italic'}`}>
                                {selectedDelivery.claim?.donor?.phone_number || 'Not provided'}
                              </span>
                              {selectedDelivery.claim?.donor?.phone_number && (
                                <button
                                  onClick={() => {
                                    navigator.clipboard.writeText(selectedDelivery.claim.donor.phone_number)
                                    success('Donor phone number copied!')
                                  }}
                                  className="text-yellow-400 hover:text-yellow-300 transition-colors"
                                >
                              <Copy className="h-4 w-4" />
                                </button>
                              )}
                            </div>
                          </div>
                          <div className="flex gap-3 items-center">
                            <span className="text-gray-400 w-20 flex-shrink-0">Email:</span>
                            {selectedDelivery.claim?.donor?.email ? (
                              <a
                                href={`mailto:${selectedDelivery.claim.donor.email}`}
                                className="text-white hover:text-yellow-300 transition-colors break-words flex-1"
                              >
                                {selectedDelivery.claim.donor.email}
                              </a>
                            ) : (
                              <span className="text-gray-400 italic flex-1">Not provided</span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Recipient Details */}
                      <div className="bg-navy-900/40 rounded-lg p-3 border border-navy-700/60">
                        <div className="flex items-center gap-2 mb-3">
                          <User className="h-4 w-4 text-green-400" />
                          <span className="text-sm font-semibold text-white">Recipient</span>
                        </div>
                        <div className="space-y-2 text-sm">
                          <div className="flex gap-3">
                            <span className="text-gray-400 w-20 flex-shrink-0">Name:</span>
                            <span className={`flex-1 break-words ${selectedDelivery.claim?.recipient?.name ? 'text-white' : 'text-gray-400 italic'}`}>
                              {selectedDelivery.claim?.recipient?.name || 'Not provided'}
                            </span>
                          </div>
                          <div className="flex gap-3 items-center">
                            <span className="text-gray-400 w-20 flex-shrink-0">Mobile:</span>
                            <div className="flex items-center gap-2 flex-1 break-words">
                              <span className={`${selectedDelivery.claim?.recipient?.phone_number ? 'text-white' : 'text-gray-400 italic'}`}>
                                {selectedDelivery.claim?.recipient?.phone_number || 'Not provided'}
                              </span>
                              {selectedDelivery.claim?.recipient?.phone_number && (
                                <button
                                  onClick={() => {
                                    navigator.clipboard.writeText(selectedDelivery.claim.recipient.phone_number)
                                    success('Recipient phone number copied!')
                                  }}
                                  className="text-yellow-400 hover:text-yellow-300 transition-colors"
                                >
                              <Copy className="h-4 w-4" />
                                </button>
                              )}
                            </div>
                          </div>
                          <div className="flex gap-3 items-center">
                            <span className="text-gray-400 w-20 flex-shrink-0">Email:</span>
                            {selectedDelivery.claim?.recipient?.email ? (
                              <a
                                href={`mailto:${selectedDelivery.claim.recipient.email}`}
                                className="text-white hover:text-yellow-300 transition-colors break-words flex-1"
                              >
                                {selectedDelivery.claim.recipient.email}
                              </a>
                            ) : (
                              <span className="text-gray-400 italic flex-1">Not provided</span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Timeline */}
                  <div className="bg-navy-800/30 rounded-lg p-4 border border-navy-700">
                    <div className="flex items-center gap-2 mb-3">
                      <Clock className="h-4 w-4 text-orange-400" />
                      <label className="text-sm font-semibold text-yellow-300">Delivery Timeline</label>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {/* Assigned */}
                      <div className="flex items-center gap-3 text-sm bg-navy-900/40 rounded-lg px-3 py-2 border border-navy-700/60">
                        <div className="w-2 h-2 rounded-full flex-shrink-0 bg-blue-400"></div>
                        <div className="min-w-0">
                          <span className="block text-gray-400 text-xs">Assigned</span>
                          {selectedDelivery.created_at ? (
                            <>
                              <span className="text-white">{formatTimeAgo(selectedDelivery.created_at)}</span>
                              <span className="text-xs text-gray-400 ml-2">• {formatDateTime(selectedDelivery.created_at)}</span>
                            </>
                          ) : (
                            <span className="text-gray-400 italic">Not yet</span>
                          )}
                        </div>
                      </div>
                      {/* Accepted */}
                      <div className="flex items-center gap-3 text-sm bg-navy-900/40 rounded-lg px-3 py-2 border border-navy-700/60">
                        <div className={`w-2 h-2 rounded-full flex-shrink-0 ${selectedDelivery.accepted_at ? 'bg-purple-400' : 'bg-gray-500'}`}></div>
                        <div className="min-w-0">
                          <span className="block text-gray-400 text-xs">Accepted</span>
                          {selectedDelivery.accepted_at ? (
                            <>
                              <span className="text-white">{formatTimeAgo(selectedDelivery.accepted_at)}</span>
                              <span className="text-xs text-gray-400 ml-2">• {formatDateTime(selectedDelivery.accepted_at)}</span>
                            </>
                          ) : (
                            <span className="text-gray-400 italic">Not yet</span>
                          )}
                        </div>
                      </div>
                      {/* Picked up */}
                      <div className="flex items-center gap-3 text-sm bg-navy-900/40 rounded-lg px-3 py-2 border border-navy-700/60">
                        <div className={`w-2 h-2 rounded-full flex-shrink-0 ${selectedDelivery.picked_up_at ? 'bg-yellow-400' : 'bg-gray-500'}`}></div>
                        <div className="min-w-0">
                          <span className="block text-gray-400 text-xs">Picked up</span>
                          {selectedDelivery.picked_up_at ? (
                            <>
                              <span className="text-white">{formatTimeAgo(selectedDelivery.picked_up_at)}</span>
                              <span className="text-xs text-gray-400 ml-2">• {formatDateTime(selectedDelivery.picked_up_at)}</span>
                            </>
                          ) : (
                            <span className="text-gray-400 italic">Not yet</span>
                          )}
                        </div>
                      </div>
                      {/* In transit */}
                      <div className="flex items-center gap-3 text-sm bg-navy-900/40 rounded-lg px-3 py-2 border border-navy-700/60">
                        <div className={`w-2 h-2 rounded-full flex-shrink-0 ${selectedDelivery.in_transit_at ? 'bg-orange-400' : 'bg-gray-500'}`}></div>
                        <div className="min-w-0">
                          <span className="block text-gray-400 text-xs">In transit</span>
                          {selectedDelivery.in_transit_at ? (
                            <>
                              <span className="text-white">{formatTimeAgo(selectedDelivery.in_transit_at)}</span>
                              <span className="text-xs text-gray-400 ml-2">• {formatDateTime(selectedDelivery.in_transit_at)}</span>
                            </>
                          ) : (
                            <span className="text-gray-400 italic">Not yet</span>
                          )}
                        </div>
                      </div>
                    </div>
                    {/* Delivered - full width */}
                    <div className="flex items-center gap-3 text-sm bg-navy-900/40 rounded-lg px-3 py-2 border border-navy-700/60 mt-3">
                      <div className={`w-2 h-2 rounded-full flex-shrink-0 ${selectedDelivery.delivered_at ? 'bg-green-400' : 'bg-gray-500'}`}></div>
                      <div className="min-w-0">
                        <span className="block text-gray-400 text-xs">Delivered</span>
                        {selectedDelivery.delivered_at ? (
                          <>
                            <span className="text-white">{formatTimeAgo(selectedDelivery.delivered_at)}</span>
                            <span className="text-xs text-gray-400 ml-2">• {formatDateTime(selectedDelivery.delivered_at)}</span>
                          </>
                        ) : (
                          <span className="text-gray-400 italic">Not yet</span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Photos */}
                  {(selectedDelivery.pickup_photo_url || selectedDelivery.delivery_photo_url) && (
                    <div className="bg-navy-800/30 rounded-lg p-4 border border-navy-700">
                      <div className="flex items-center gap-2 mb-3">
                        <Camera className="h-4 w-4 text-purple-400" />
                        <label className="text-sm font-semibold text-yellow-300">Documentation Photos</label>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {selectedDelivery.pickup_photo_url && (
                          <div className="space-y-2">
                            <label className="block text-xs font-medium text-gray-400">Before Photo</label>
                            <img 
                              src={selectedDelivery.pickup_photo_url} 
                              alt="Before delivery photo" 
                              className="w-full h-48 object-cover rounded-lg border border-navy-600 cursor-pointer hover:opacity-90 transition-opacity"
                              onClick={() => {
                                setSelectedPhoto({ url: selectedDelivery.pickup_photo_url, type: 'Before Pickup' })
                                setShowPhotoModal(true)
                              }}
                            />
                          </div>
                        )}
                        {selectedDelivery.delivery_photo_url && (
                          <div className="space-y-2">
                            <label className="block text-xs font-medium text-gray-400">After Photo</label>
                            <img 
                              src={selectedDelivery.delivery_photo_url} 
                              alt="After delivery photo" 
                              className="w-full h-48 object-cover rounded-lg border border-navy-600 cursor-pointer hover:opacity-90 transition-opacity"
                              onClick={() => {
                                setSelectedPhoto({ url: selectedDelivery.delivery_photo_url, type: 'After Delivery' })
                                setShowPhotoModal(true)
                              }}
                            />
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Notes */}
                  {selectedDelivery.volunteer_notes && (
                    <div className="bg-navy-800/30 rounded-lg p-4 border border-navy-700">
                      <div className="flex items-center gap-2 mb-3">
                        <MessageCircle className="h-4 w-4 text-yellow-400" />
                        <label className="text-sm font-semibold text-yellow-300">Your Notes</label>
                      </div>
                      <p className="text-sm text-gray-300 leading-relaxed">{selectedDelivery.volunteer_notes}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Footer */}
              <div className="p-4 sm:p-6 pt-3 sm:pt-4 border-t-2 border-yellow-500/20 flex justify-end flex-shrink-0">
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