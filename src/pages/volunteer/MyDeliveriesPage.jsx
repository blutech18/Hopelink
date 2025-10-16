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
  Eye
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
          className="mb-8"
        >
          <h1 className="text-3xl font-bold text-white">My Deliveries</h1>
          <p className="text-skyblue-300 mt-2">
            Track and manage your volunteer delivery assignments with photo documentation
          </p>
        </motion.div>

        {/* Summary Stats */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8"
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
              className="bg-navy-900/50 backdrop-blur-sm border border-navy-700 rounded-xl p-6 hover:border-skyblue-500/30 transition-colors"
            >
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <stat.icon className={`h-8 w-8 ${stat.color}`} />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-skyblue-300">{stat.label}</p>
                  <p className="text-2xl font-bold text-white">{stat.value}</p>
                </div>
              </div>
            </motion.div>
          ))}
        </motion.div>

        {/* Deliveries List */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          {deliveries.length === 0 ? (
            <div className="bg-navy-900/50 backdrop-blur-sm border border-navy-700 rounded-xl p-12 text-center">
              <Truck className="h-16 w-16 text-skyblue-500 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-white mb-2">No Deliveries Yet</h3>
              <p className="text-skyblue-300 mb-6">
                You haven't been assigned any deliveries yet. Check the Available Tasks page to find delivery opportunities.
              </p>
              <button
                onClick={() => window.location.href = '/available-tasks'}
                className="bg-skyblue-600 hover:bg-skyblue-700 text-white px-6 py-3 rounded-lg font-semibold transition-colors"
              >
                Find Available Tasks
              </button>
            </div>
          ) : (
            <div className="space-y-6">
              {deliveries.map((delivery, index) => {
                const StatusIcon = getStatusIcon(delivery.status)
                const nextAction = getNextAction(delivery.status)
                
                return (
                  <motion.div
                    key={delivery.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, delay: index * 0.1 }}
                    className="bg-navy-900/50 backdrop-blur-sm border border-navy-700 rounded-xl p-6 hover:border-skyblue-500/30 transition-colors"
                  >
                    <div className="flex flex-col xl:flex-row gap-6">
                      {/* Delivery Details */}
                      <div className="flex-1 space-y-4">
                        {/* Header */}
                        <div className="flex items-start gap-4">
                          <div className="flex-shrink-0 p-2 rounded-lg bg-skyblue-500/10">
                            <StatusIcon className="h-6 w-6 text-skyblue-500" />
                          </div>
                          <div className="flex-1">
                            <div className="flex flex-wrap items-center gap-3 mb-2">
                              <h3 className="text-xl font-semibold text-white">
                                {delivery.claim?.donation?.title || delivery.claim?.request?.title || 'Delivery Task'}
                              </h3>
                              <span className={`px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(delivery.status)}`}>
                                {delivery.status.replace('_', ' ').toUpperCase()}
                              </span>
                              {delivery.claim?.donation?.is_urgent && (
                                <span className="px-2 py-1 rounded-full text-xs font-medium text-red-400 bg-red-500/20 border border-red-500/30">
                                  URGENT
                                </span>
                              )}
                            </div>
                            <p className="text-skyblue-300 text-sm">
                              {delivery.claim?.donation?.description || delivery.claim?.request?.description || 'No description available'}
                            </p>
                          </div>
                        </div>

                        {/* Route and Contact Information */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          {/* Route Information */}
                          <div className="space-y-3">
                            <h4 className="text-sm font-semibold text-skyblue-300 uppercase tracking-wide">Route Details</h4>
                            <div className="space-y-2">
                              <div className="flex items-center gap-3 text-sm text-skyblue-300">
                                <MapPin className="h-4 w-4 text-green-400" />
                                <span className="font-medium">Pickup:</span>
                                <span>{delivery.pickup_city || 'TBD'}</span>
                              </div>
                              <div className="flex items-center gap-3 text-sm text-skyblue-300">
                                <MapPin className="h-4 w-4 text-red-400" />
                                <span className="font-medium">Delivery:</span>
                                <span>{delivery.delivery_city || 'TBD'}</span>
                              </div>
                              {delivery.estimated_distance && (
                                <div className="flex items-center gap-3 text-sm text-skyblue-300">
                                  <Navigation className="h-4 w-4 text-purple-400" />
                                  <span className="font-medium">Distance:</span>
                                  <span>~{delivery.estimated_distance}km</span>
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Contact Information */}
                          <div className="space-y-3">
                            <h4 className="text-sm font-semibold text-skyblue-300 uppercase tracking-wide">Contacts</h4>
                            <div className="space-y-2">
                              <div className="flex items-center gap-3 text-sm text-skyblue-300">
                                <User className="h-4 w-4 text-blue-400" />
                                <span className="font-medium">Donor:</span>
                                <span>{delivery.claim?.donor?.name || 'Anonymous'}</span>
                                {delivery.claim?.donor?.phone_number && (
                                  <a
                                    href={`tel:${delivery.claim.donor.phone_number}`}
                                    className="text-skyblue-400 hover:text-skyblue-300 transition-colors"
                                  >
                                    <Phone className="h-4 w-4" />
                                  </a>
                                )}
                              </div>
                              <div className="flex items-center gap-3 text-sm text-skyblue-300">
                                <User className="h-4 w-4 text-green-400" />
                                <span className="font-medium">Recipient:</span>
                                <span>{delivery.claim?.recipient?.name || 'Anonymous'}</span>
                                {delivery.claim?.recipient?.phone_number && (
                                  <a
                                    href={`tel:${delivery.claim.recipient.phone_number}`}
                                    className="text-skyblue-400 hover:text-skyblue-300 transition-colors"
                                  >
                                    <Phone className="h-4 w-4" />
                                  </a>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>

                                                 {/* Timeline */}
                         <div className="space-y-3">
                           <h4 className="text-sm font-semibold text-skyblue-300 uppercase tracking-wide">Timeline</h4>
                           <div className="flex flex-wrap items-center gap-3 text-sm text-skyblue-300">
                             <div className="flex items-center gap-2">
                               <Timer className="h-4 w-4 text-orange-400" />
                               <span>Assigned {formatTimeAgo(delivery.created_at)}</span>
                             </div>
                             {delivery.accepted_at && (
                               <div className="flex items-center gap-2">
                                 <span>•</span>
                                 <span>Accepted {formatTimeAgo(delivery.accepted_at)}</span>
                               </div>
                             )}
                             {delivery.picked_up_at && (
                               <div className="flex items-center gap-2">
                                 <span>•</span>
                                 <span>Picked up {formatTimeAgo(delivery.picked_up_at)}</span>
                               </div>
                             )}
                             {delivery.in_transit_at && (
                               <div className="flex items-center gap-2">
                                 <span>•</span>
                                 <span>In transit {formatTimeAgo(delivery.in_transit_at)}</span>
                               </div>
                             )}
                             {delivery.delivered_at && (
                               <div className="flex items-center gap-2">
                                 <span>•</span>
                                 <span>Delivered {formatTimeAgo(delivery.delivered_at)}</span>
                               </div>
                             )}

                           </div>
                         </div>

                        {/* Photos */}
                        {(delivery.pickup_photo_url || delivery.delivery_photo_url) && (
                          <div className="space-y-3">
                            <h4 className="text-sm font-semibold text-skyblue-300 uppercase tracking-wide">Photos</h4>
                            <div className="flex gap-4">
                              {delivery.pickup_photo_url && (
                                <div className="relative">
                                  <img 
                                    src={delivery.pickup_photo_url} 
                                    alt="Before delivery photo" 
                                    className="w-20 h-20 object-cover rounded-lg border border-navy-600"
                                  />
                                  <span className="absolute -bottom-2 -right-2 bg-blue-500 text-white text-xs px-1 rounded">
                                    Before
                                  </span>
                                </div>
                              )}
                              {delivery.delivery_photo_url && (
                                <div className="relative">
                                  <img 
                                    src={delivery.delivery_photo_url} 
                                    alt="After delivery photo" 
                                    className="w-20 h-20 object-cover rounded-lg border border-navy-600"
                                  />
                                  <span className="absolute -bottom-2 -right-2 bg-green-500 text-white text-xs px-1 rounded">
                                    After
                                  </span>
                                </div>
                              )}
                            </div>
                          </div>
                        )}

                        {/* Notes */}
                        {delivery.volunteer_notes && (
                          <div className="bg-navy-800/50 rounded-lg p-3">
                            <h4 className="text-sm font-semibold text-skyblue-300 mb-1">Your Notes</h4>
                            <p className="text-sm text-skyblue-300">{delivery.volunteer_notes}</p>
                          </div>
                        )}
                      </div>

                      {/* Action Section */}
                      <div className="flex flex-col justify-between gap-4 xl:min-w-[220px]">
                        <div className="space-y-3">
                          {nextAction && (
                            <button
                              onClick={() => openStatusModal(delivery, nextAction.action)}
                              className={`w-full px-4 py-3 rounded-lg font-semibold transition-all duration-200 flex items-center justify-center gap-2 text-white shadow-lg hover:shadow-xl transform hover:scale-105 ${nextAction.color}`}
                            >
                              <nextAction.icon className="h-4 w-4" />
                              {nextAction.label}
                            </button>
                          )}
                          
                          <button
                            onClick={() => openDetailsModal(delivery)}
                            className="w-full px-4 py-2 bg-navy-700 hover:bg-navy-600 text-skyblue-300 rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
                          >
                            <Eye className="h-4 w-4" />
                            View Details
                          </button>
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
              <div className="sticky top-0 bg-navy-900 border-b border-navy-700 px-6 py-4 flex items-center justify-between">
                <h3 className="text-xl font-semibold text-white">
                  Update Delivery Status
                </h3>
                <button
                  onClick={() => setShowStatusModal(false)}
                  className="text-skyblue-400 hover:text-skyblue-300"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              
                            <div className="p-6 space-y-4 overflow-y-auto max-h-[calc(90vh-5rem)]">
                <div className="bg-navy-800/50 rounded-lg p-3">
                  <p className="text-skyblue-300 text-sm">
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
                    <label className="block text-sm font-medium text-skyblue-300">
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
                          <Camera className="h-8 w-8 text-skyblue-500 mx-auto mb-2" />
                          <p className="text-sm text-skyblue-300 mb-2">
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
                            className="inline-flex items-center px-4 py-3 bg-skyblue-600 hover:bg-skyblue-700 text-white rounded-lg cursor-pointer transition-colors font-medium"
                          >
                            <Camera className="h-5 w-5 mr-2" />
                            Take Before Photo
                          </label>
                          <p className="text-xs text-skyblue-400 mt-2">
                            Photo will be visible immediately after capture
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {statusUpdate.status === 'delivered' && (
                  <div className="space-y-3">
                    <label className="block text-sm font-medium text-skyblue-300">
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
                          <Camera className="h-8 w-8 text-skyblue-500 mx-auto mb-2" />
                          <p className="text-sm text-skyblue-300 mb-2">
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
                            className="inline-flex items-center px-4 py-3 bg-skyblue-600 hover:bg-skyblue-700 text-white rounded-lg cursor-pointer transition-colors font-medium"
                          >
                            <Camera className="h-5 w-5 mr-2" />
                            Take After Photo
                          </label>
                          <p className="text-xs text-skyblue-400 mt-2">
                            Photo will be visible immediately after capture
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Notes */}
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-skyblue-300">
                    Notes (optional)
                  </label>
                  <textarea
                    value={statusUpdate.notes}
                    onChange={(e) => setStatusUpdate(prev => ({ ...prev, notes: e.target.value }))}
                    placeholder="Add any relevant notes about this status update..."
                    className="w-full px-3 py-2 bg-navy-800 border border-navy-600 rounded-lg text-white placeholder-skyblue-400 focus:border-skyblue-500 focus:outline-none"
                    rows={3}
                  />
                </div>

                {/* Action Buttons */}
                <div className="flex gap-3 pt-4">
                  <button
                    onClick={() => setShowStatusModal(false)}
                    className="flex-1 px-4 py-2 bg-navy-700 hover:bg-navy-600 text-skyblue-300 rounded-lg font-medium transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => handleStatusUpdate(selectedDelivery.id, statusUpdate.status, statusUpdate.notes)}
                    disabled={uploading || 
                      (statusUpdate.status === 'accepted' && !statusUpdate.pickup_photo) ||
                      (statusUpdate.status === 'delivered' && !statusUpdate.delivery_photo)
                    }
                    className="flex-1 px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
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
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-navy-900 border border-navy-700 rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
            >
              <div className="sticky top-0 bg-navy-900 border-b border-navy-700 px-6 py-4 flex items-center justify-between">
                <h3 className="text-xl font-semibold text-white">
                  Delivery Details
                </h3>
                <button
                  onClick={() => setShowDetailsModal(false)}
                  className="text-skyblue-400 hover:text-skyblue-300"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              
              <div className="p-6 space-y-6">
                {/* Basic Information */}
                <div className="space-y-4">
                  <h4 className="text-lg font-semibold text-white border-b border-navy-700 pb-2">
                    Basic Information
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-skyblue-300 mb-1">Item</label>
                      <p className="text-white">{selectedDelivery.claim?.donation?.title || selectedDelivery.claim?.request?.title || 'N/A'}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-skyblue-300 mb-1">Status</label>
                      <span className={`px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(selectedDelivery.status)}`}>
                        {selectedDelivery.status.replace('_', ' ').toUpperCase()}
                      </span>
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-skyblue-300 mb-1">Description</label>
                      <p className="text-white">{selectedDelivery.claim?.donation?.description || selectedDelivery.claim?.request?.description || 'No description available'}</p>
                    </div>
                  </div>
                </div>

                {/* Route Information */}
                <div className="space-y-4">
                  <h4 className="text-lg font-semibold text-white border-b border-navy-700 pb-2">
                    Route Information
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-skyblue-300 mb-1">Pickup Location</label>
                      <div className="flex items-center gap-2 text-white">
                        <MapPin className="h-4 w-4 text-green-400" />
                        <span>{selectedDelivery.pickup_city || 'TBD'}</span>
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-skyblue-300 mb-1">Delivery Location</label>
                      <div className="flex items-center gap-2 text-white">
                        <MapPin className="h-4 w-4 text-red-400" />
                        <span>{selectedDelivery.delivery_city || 'TBD'}</span>
                      </div>
                    </div>
                    {selectedDelivery.estimated_distance && (
                      <div>
                        <label className="block text-sm font-medium text-skyblue-300 mb-1">Estimated Distance</label>
                        <div className="flex items-center gap-2 text-white">
                          <Navigation className="h-4 w-4 text-purple-400" />
                          <span>~{selectedDelivery.estimated_distance}km</span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Contact Information */}
                <div className="space-y-4">
                  <h4 className="text-lg font-semibold text-white border-b border-navy-700 pb-2">
                    Contact Information
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="block text-sm font-medium text-skyblue-300">Donor</label>
                      <div className="flex items-center gap-2 text-white">
                        <User className="h-4 w-4 text-blue-400" />
                        <span>{selectedDelivery.claim?.donor?.name || 'Anonymous'}</span>
                        {selectedDelivery.claim?.donor?.phone_number && (
                          <a
                            href={`tel:${selectedDelivery.claim.donor.phone_number}`}
                            className="text-skyblue-400 hover:text-skyblue-300 transition-colors"
                          >
                            <Phone className="h-4 w-4" />
                          </a>
                        )}
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="block text-sm font-medium text-skyblue-300">Recipient</label>
                      <div className="flex items-center gap-2 text-white">
                        <User className="h-4 w-4 text-green-400" />
                        <span>{selectedDelivery.claim?.recipient?.name || 'Anonymous'}</span>
                        {selectedDelivery.claim?.recipient?.phone_number && (
                          <a
                            href={`tel:${selectedDelivery.claim.recipient.phone_number}`}
                            className="text-skyblue-400 hover:text-skyblue-300 transition-colors"
                          >
                            <Phone className="h-4 w-4" />
                          </a>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Timeline */}
                <div className="space-y-4">
                  <h4 className="text-lg font-semibold text-white border-b border-navy-700 pb-2">
                    Delivery Timeline
                  </h4>
                  <div className="space-y-3">
                    <div className="flex items-center gap-3 text-sm">
                      <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
                      <span className="text-skyblue-300">Assigned:</span>
                      <span className="text-white">{formatTimeAgo(selectedDelivery.created_at)}</span>
                    </div>
                    {selectedDelivery.accepted_at && (
                      <div className="flex items-center gap-3 text-sm">
                        <div className="w-2 h-2 bg-purple-400 rounded-full"></div>
                        <span className="text-skyblue-300">Accepted:</span>
                        <span className="text-white">{formatTimeAgo(selectedDelivery.accepted_at)}</span>
                      </div>
                    )}
                    {selectedDelivery.picked_up_at && (
                      <div className="flex items-center gap-3 text-sm">
                        <div className="w-2 h-2 bg-yellow-400 rounded-full"></div>
                        <span className="text-skyblue-300">Picked up:</span>
                        <span className="text-white">{formatTimeAgo(selectedDelivery.picked_up_at)}</span>
                      </div>
                    )}
                    {selectedDelivery.in_transit_at && (
                      <div className="flex items-center gap-3 text-sm">
                        <div className="w-2 h-2 bg-orange-400 rounded-full"></div>
                        <span className="text-skyblue-300">In transit:</span>
                        <span className="text-white">{formatTimeAgo(selectedDelivery.in_transit_at)}</span>
                      </div>
                    )}
                    {selectedDelivery.delivered_at && (
                      <div className="flex items-center gap-3 text-sm">
                        <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                        <span className="text-skyblue-300">Delivered:</span>
                        <span className="text-white">{formatTimeAgo(selectedDelivery.delivered_at)}</span>
                      </div>
                    )}

                  </div>
                </div>

                {/* Photos */}
                {(selectedDelivery.pickup_photo_url || selectedDelivery.delivery_photo_url) && (
                  <div className="space-y-4">
                    <h4 className="text-lg font-semibold text-white border-b border-navy-700 pb-2">
                      Documentation Photos
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {selectedDelivery.pickup_photo_url && (
                        <div className="space-y-2">
                          <label className="block text-sm font-medium text-skyblue-300">Before Photo</label>
                          <img 
                            src={selectedDelivery.pickup_photo_url} 
                            alt="Before delivery photo" 
                            className="w-full h-48 object-cover rounded-lg border border-navy-600"
                          />
                          <p className="text-xs text-skyblue-400">Items before delivery started</p>
                        </div>
                      )}
                      {selectedDelivery.delivery_photo_url && (
                        <div className="space-y-2">
                          <label className="block text-sm font-medium text-skyblue-300">After Photo</label>
                          <img 
                            src={selectedDelivery.delivery_photo_url} 
                            alt="After delivery photo" 
                            className="w-full h-48 object-cover rounded-lg border border-navy-600"
                          />
                          <p className="text-xs text-skyblue-400">Proof of successful delivery</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Notes */}
                {selectedDelivery.volunteer_notes && (
                  <div className="space-y-4">
                    <h4 className="text-lg font-semibold text-white border-b border-navy-700 pb-2">
                      Your Notes
                    </h4>
                    <div className="bg-navy-800/50 rounded-lg p-4">
                      <p className="text-skyblue-300">{selectedDelivery.volunteer_notes}</p>
                    </div>
                  </div>
                )}

                {/* Close Button */}
                <div className="flex justify-end pt-4 border-t border-navy-700">
                  <button
                    onClick={() => setShowDetailsModal(false)}
                    className="px-6 py-2 bg-skyblue-600 hover:bg-skyblue-700 text-white rounded-lg font-medium transition-colors"
                  >
                    Close
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </div>
    </div>
  )
}

export default MyDeliveriesPage 