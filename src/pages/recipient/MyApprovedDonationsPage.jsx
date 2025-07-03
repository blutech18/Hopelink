import React, { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Package, 
  CheckCircle, 
  Clock, 
  Truck, 
  User,
  MapPin,
  Calendar,
  Phone,
  Eye,
  Star,
  MessageSquare,
  Award,
  AlertCircle,
  Navigation
} from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import { useToast } from '../../contexts/ToastContext'
import LoadingSpinner from '../../components/ui/LoadingSpinner'
import DeliveryConfirmationModal from '../../components/ui/DeliveryConfirmationModal'
import PickupManagementModal from '../../components/ui/PickupManagementModal'
import DirectDeliveryManagementModal from '../../components/ui/DirectDeliveryManagementModal'
import { db, supabase } from '../../lib/supabase'

const MyApprovedDonationsPage = () => {
  const { user, profile } = useAuth()
  const { success, error } = useToast()
  const [approvedDonations, setApprovedDonations] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedDonation, setSelectedDonation] = useState(null)
  const [showDetailsModal, setShowDetailsModal] = useState(false)
  const [deliveryConfirmationNotifications, setDeliveryConfirmationNotifications] = useState([])
  const [selectedConfirmationNotification, setSelectedConfirmationNotification] = useState(null)
  const [showConfirmationModal, setShowConfirmationModal] = useState(false)
  const [pickupConfirmationNotifications, setPickupConfirmationNotifications] = useState([])
  const [showPickupModal, setShowPickupModal] = useState(false)
  const [directDeliveryConfirmationNotifications, setDirectDeliveryConfirmationNotifications] = useState([])
  const [showDirectDeliveryModal, setShowDirectDeliveryModal] = useState(false)

  const loadApprovedDonations = useCallback(async () => {
    if (!user?.id) return

    try {
      setLoading(true)
      
      // Get donation claims where the user is the recipient
      const { data: claims, error: claimsError } = await supabase
        .from('donation_claims')
        .select(`
          *,
          donation:donations(
            *,
            donor:users!donations_donor_id_fkey(id, name, phone_number, profile_image_url)
          ),
          delivery:deliveries(
            *,
            volunteer:users!deliveries_volunteer_id_fkey(id, name, phone_number)
          ),
          pickup:pickups(
            *
          ),
          direct_delivery:direct_deliveries(
            *
          ),
          recipient:users!donation_claims_recipient_id_fkey(id, name, phone_number)
        `)
        .eq('recipient_id', user.id)
        .in('status', ['claimed', 'delivered', 'completed'])
        .order('claimed_at', { ascending: false })

      if (claimsError) throw claimsError

      setApprovedDonations(claims || [])
    } catch (err) {
      console.error('Error loading approved donations:', err)
      error('Failed to load approved donations')
    } finally {
      setLoading(false)
    }
  }, [user?.id, error])

  const loadDeliveryConfirmations = useCallback(async () => {
    if (!user?.id) return

    try {
      const notifications = await db.getUserNotifications(user.id, 100)
      
      // Filter delivery confirmation notifications (for volunteer deliveries)
      const deliveryConfirmationNotifications = notifications.filter(n => 
        n.type === 'delivery_completed' && 
        n.data?.action_required === 'confirm_delivery' && 
        n.data?.role === 'recipient' &&
        !n.read_at
      )
      
      // Filter pickup confirmation notifications (for self-pickup)
      const pickupConfirmationNotifications = notifications.filter(n => 
        n.type === 'pickup_completed' && 
        n.data?.action_required === 'confirm_pickup' && 
        n.data?.role === 'recipient' &&
        !n.read_at
      )
      
      // Filter direct delivery confirmation notifications
      const directDeliveryConfirmationNotifications = notifications.filter(n => 
        n.type === 'direct_delivery_completed' && 
        n.data?.action_required === 'confirm_direct_delivery' && 
        n.data?.role === 'recipient' &&
        !n.read_at
      )
      
      setDeliveryConfirmationNotifications(deliveryConfirmationNotifications)
      setPickupConfirmationNotifications(pickupConfirmationNotifications)
      setDirectDeliveryConfirmationNotifications(directDeliveryConfirmationNotifications)
    } catch (err) {
      console.error('Error loading confirmations:', err)
    }
  }, [user?.id])

  useEffect(() => {
    loadApprovedDonations()
    loadDeliveryConfirmations()
  }, [loadApprovedDonations, loadDeliveryConfirmations])

  const handleConfirmDelivery = (notification) => {
    setSelectedConfirmationNotification(notification)
    setShowConfirmationModal(true)
  }

  const handleConfirmPickup = async (notification) => {
    try {
      await db.confirmPickupCompletion(notification.data.claim_id, user.id, true)
      success('Pickup confirmed successfully!')
      await loadApprovedDonations()
      await loadDeliveryConfirmations()
    } catch (err) {
      console.error('Error confirming pickup:', err)
      error('Failed to confirm pickup completion')
    }
  }

  const handleConfirmReceipt = async (claim) => {
    try {
      const delivery = claim.delivery?.[0]
      if (!delivery) {
        error('No delivery information found')
        return
      }

      await db.confirmReceipt(delivery.id, user.id, true)
      success('Receipt confirmed! Waiting for donor confirmation to complete transaction.')
      
      // Refresh the data
      await loadApprovedDonations()
      await loadDeliveryConfirmations()
    } catch (err) {
      console.error('Error confirming receipt:', err)
      error('Failed to confirm receipt. Please try again.')
    }
  }

  const handleConfirmationComplete = async (result) => {
    // Refresh data after confirmation
    await loadDeliveryConfirmations()
    await loadApprovedDonations()
  }

  const handleViewDetails = (donation) => {
    setSelectedDonation(donation)
    setShowDetailsModal(true)
  }

  const handleManagePickup = (donation) => {
    setSelectedDonation(donation)
    setShowPickupModal(true)
  }

  const handleManageDirectDelivery = (donation) => {
    setSelectedDonation(donation)
    setShowDirectDeliveryModal(true)
  }

  const handleConfirmDirectDelivery = async (notification) => {
    try {
      await db.confirmDirectDeliveryCompletion(notification.data.claim_id, user.id, true)
      success('Direct delivery confirmed successfully!')
      await loadApprovedDonations()
      await loadDeliveryConfirmations()
    } catch (err) {
      console.error('Error confirming direct delivery:', err)
      error('Failed to confirm direct delivery completion')
    }
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'claimed': return 'text-blue-400 bg-blue-500/20 border-blue-500/30'
      case 'delivered': return 'text-yellow-400 bg-yellow-500/20 border-yellow-500/30'
      case 'completed': return 'text-emerald-400 bg-emerald-500/20 border-emerald-500/30'
      default: return 'text-gray-400 bg-gray-500/20 border-gray-500/30'
    }
  }

  const getStatusIcon = (status) => {
    switch (status) {
      case 'claimed': return Clock
      case 'delivered': return Package
      case 'completed': return Award
      default: return AlertCircle
    }
  }

  const getDeliveryStatusColor = (status) => {
    switch (status) {
      case 'pending': return 'text-gray-400 bg-gray-500/20 border-gray-500/30'
      case 'assigned': return 'text-blue-400 bg-blue-500/20 border-blue-500/30'
      case 'accepted': return 'text-purple-400 bg-purple-500/20 border-purple-500/30'
      case 'picked_up': return 'text-yellow-400 bg-yellow-500/20 border-yellow-500/30'
      case 'in_transit': return 'text-orange-400 bg-orange-500/20 border-orange-500/30'
      case 'delivered': return 'text-emerald-400 bg-emerald-500/20 border-emerald-500/30'
      default: return 'text-gray-400 bg-gray-500/20 border-gray-500/30'
    }
  }

  const getDeliveryStatusIcon = (status) => {
    switch (status) {
      case 'pending': return Clock
      case 'assigned': return User
      case 'accepted': return CheckCircle
      case 'picked_up': return Package
      case 'in_transit': return Truck
      case 'delivered': return Star
      default: return AlertCircle
    }
  }

  const getPickupStatusColor = (status) => {
    switch (status) {
      case 'scheduled': return 'text-blue-400 bg-blue-500/20 border-blue-500/30'
      case 'confirmed': return 'text-purple-400 bg-purple-500/20 border-purple-500/30'
      case 'completed': return 'text-emerald-400 bg-emerald-500/20 border-emerald-500/30'
      case 'cancelled': return 'text-red-400 bg-red-500/20 border-red-500/30'
      default: return 'text-gray-400 bg-gray-500/20 border-gray-500/30'
    }
  }

  const getPickupStatusIcon = (status) => {
    switch (status) {
      case 'scheduled': return Clock
      case 'confirmed': return CheckCircle
      case 'completed': return Navigation
      case 'cancelled': return AlertCircle
      default: return Package
    }
  }

  const getDirectDeliveryStatusColor = (status) => {
    switch (status) {
      case 'coordination_needed': return 'text-yellow-400 bg-yellow-500/20 border-yellow-500/30'
      case 'scheduled': return 'text-blue-400 bg-blue-500/20 border-blue-500/30'
      case 'out_for_delivery': return 'text-orange-400 bg-orange-500/20 border-orange-500/30'
      case 'delivered': return 'text-emerald-400 bg-emerald-500/20 border-emerald-500/30'
      case 'cancelled': return 'text-red-400 bg-red-500/20 border-red-500/30'
      default: return 'text-gray-400 bg-gray-500/20 border-gray-500/30'
    }
  }

  const getDirectDeliveryStatusIcon = (status) => {
    switch (status) {
      case 'coordination_needed': return MessageSquare
      case 'scheduled': return Calendar
      case 'out_for_delivery': return Truck
      case 'delivered': return Package
      case 'cancelled': return AlertCircle
      default: return Clock
    }
  }

  const formatTimeAgo = (dateString) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffInHours = Math.floor((now - date) / (1000 * 60 * 60))
    
    if (diffInHours < 1) return 'Just now'
    if (diffInHours < 24) return `${diffInHours}h ago`
    
    const diffInDays = Math.floor(diffInHours / 24)
    if (diffInDays < 7) return `${diffInDays}d ago`
    
    return date.toLocaleDateString()
  }

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
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
          <h1 className="text-3xl font-bold text-white mb-2">My Approved Donations</h1>
          <p className="text-skyblue-300">
            Track your approved donation requests and manage pickups or deliveries
          </p>
        </motion.div>

        {/* Delivery Confirmations */}
        {deliveryConfirmationNotifications.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="mb-8"
          >
            <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-6">
              <div className="flex items-center mb-4">
                <AlertCircle className="h-6 w-6 text-amber-500 mr-3" />
                <h2 className="text-lg font-semibold text-white">
                  Delivery Confirmations Needed ({deliveryConfirmationNotifications.length})
                </h2>
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
            </div>
          </motion.div>
        )}

        {/* Pickup Confirmations */}
        {pickupConfirmationNotifications.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.15 }}
            className="mb-8"
          >
            <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-6">
              <div className="flex items-center mb-4">
                <Navigation className="h-6 w-6 text-emerald-500 mr-3" />
                <h2 className="text-lg font-semibold text-white">
                  Pickup Confirmations Needed ({pickupConfirmationNotifications.length})
                </h2>
              </div>
              <div className="space-y-3">
                {pickupConfirmationNotifications.map((notification) => (
                  <div
                    key={notification.id}
                    className="bg-navy-800/50 rounded-lg p-4 flex items-center justify-between"
                  >
                    <div className="flex items-center gap-3">
                      <CheckCircle className="h-5 w-5 text-emerald-500" />
                      <div>
                        <p className="text-white font-medium">{notification.title}</p>
                        <p className="text-skyblue-300 text-sm">{notification.message}</p>
                        <p className="text-skyblue-400 text-xs mt-1">
                          Completed by: {notification.data?.completed_by_name}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => handleConfirmPickup(notification)}
                      className="btn btn-success text-sm px-4 py-2"
                    >
                      Confirm Pickup
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}

        {/* Direct Delivery Confirmations */}
        {directDeliveryConfirmationNotifications.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="mb-8"
          >
            <div className="bg-purple-500/10 border border-purple-500/20 rounded-xl p-6">
              <div className="flex items-center mb-4">
                <Truck className="h-6 w-6 text-purple-500 mr-3" />
                <h2 className="text-lg font-semibold text-white">
                  Direct Delivery Confirmations Needed ({directDeliveryConfirmationNotifications.length})
                </h2>
              </div>
              <div className="space-y-3">
                {directDeliveryConfirmationNotifications.map((notification) => (
                  <div
                    key={notification.id}
                    className="bg-navy-800/50 rounded-lg p-4 flex items-center justify-between"
                  >
                    <div className="flex items-center gap-3">
                      <CheckCircle className="h-5 w-5 text-purple-500" />
                      <div>
                        <p className="text-white font-medium">{notification.title}</p>
                        <p className="text-skyblue-300 text-sm">{notification.message}</p>
                        <p className="text-skyblue-400 text-xs mt-1">
                          Direct delivery by donor
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => handleConfirmDirectDelivery(notification)}
                      className="btn btn-success text-sm px-4 py-2"
                    >
                      Confirm Receipt
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}

        {/* Approved Donations List */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.4 }}
        >
          {approvedDonations.length === 0 ? (
            <div className="text-center py-12">
              <Package className="h-16 w-16 text-skyblue-400 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-white mb-2">No approved donations yet</h3>
              <p className="text-skyblue-400 mb-6">
                Once donors approve your requests, they will appear here for tracking.
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {approvedDonations.map((claim, index) => {
                const StatusIcon = getStatusIcon(claim.status)
                const delivery = claim.delivery?.[0]
                const pickup = claim.pickup?.[0]
                const directDelivery = claim.direct_delivery?.[0]
                const isVolunteerDelivery = claim.donation.delivery_mode === 'volunteer'
                const isSelfPickup = claim.donation.delivery_mode === 'pickup'
                const isDirectDelivery = claim.donation.delivery_mode === 'direct'
                
                return (
                  <motion.div
                    key={claim.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, delay: index * 0.1 }}
                    className="bg-navy-900/50 backdrop-blur-sm border border-navy-700 rounded-xl p-6 hover:border-skyblue-500/30 transition-colors"
                  >
                    {/* Header */}
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <h3 className="text-lg font-semibold text-white mb-2">
                          {claim.donation?.title}
                        </h3>
                        <p className="text-skyblue-300 text-sm mb-3">
                          {claim.donation?.description}
                        </p>
                        
                        {/* Status Badges */}
                        <div className="flex items-center gap-3 mb-3">
                          <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(claim.status)}`}>
                            <StatusIcon className="h-3 w-3 mr-1" />
                            {claim.status === 'claimed' ? 'In Progress' : claim.status === 'completed' ? 'Completed' : 'Delivered'}
                          </span>
                          
                          {/* Delivery Status for Volunteer Deliveries */}
                          {isVolunteerDelivery && delivery && (
                            <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium border ${getDeliveryStatusColor(delivery.status)}`}>
                              {React.createElement(getDeliveryStatusIcon(delivery.status), { className: "h-3 w-3 mr-1" })}
                              {delivery.status.replace('_', ' ')}
                            </span>
                          )}
                          
                          {/* Pickup Status for Self Pickup */}
                          {isSelfPickup && pickup && (
                            <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium border ${getPickupStatusColor(pickup.status)}`}>
                              {React.createElement(getPickupStatusIcon(pickup.status), { className: "h-3 w-3 mr-1" })}
                              Pickup: {pickup.status.replace('_', ' ')}
                            </span>
                          )}

                          {/* Direct Delivery Status */}
                          {isDirectDelivery && directDelivery && (
                            <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium border ${getDirectDeliveryStatusColor(directDelivery.status)}`}>
                              {React.createElement(getDirectDeliveryStatusIcon(directDelivery.status), { className: "h-3 w-3 mr-1" })}
                              Direct: {directDelivery.status.replace('_', ' ')}
                            </span>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        {/* Self-Pickup Management Button */}
                        {isSelfPickup && claim.status !== 'completed' && (
                          <button
                            onClick={() => handleManagePickup(claim)}
                            className="btn btn-primary text-sm flex items-center"
                          >
                            <Navigation className="h-4 w-4 mr-2" />
                            Manage Pickup
                          </button>
                        )}
                        
                        {/* Direct Delivery Management Button */}
                        {isDirectDelivery && claim.status !== 'completed' && (
                          <button
                            onClick={() => handleManageDirectDelivery(claim)}
                            className="btn btn-primary text-sm flex items-center"
                          >
                            <Truck className="h-4 w-4 mr-2" />
                            Manage Delivery
                          </button>
                        )}

                        {/* Received Button for delivered volunteer deliveries */}
                        {isVolunteerDelivery && claim.status === 'delivered' && (
                          <button
                            onClick={() => handleConfirmReceipt(claim)}
                            className="btn btn-success text-sm flex items-center"
                          >
                            <CheckCircle className="h-4 w-4 mr-2" />
                            Received
                          </button>
                        )}
                        
                        <button
                          onClick={() => handleViewDetails(claim)}
                          className="btn btn-secondary text-sm flex items-center"
                        >
                          <Eye className="h-4 w-4 mr-2" />
                          View Details
                        </button>
                      </div>
                    </div>
                    
                    {/* Details Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
                      <div className="flex items-center text-skyblue-300">
                        <User className="h-4 w-4 mr-2 text-blue-400" />
                        <div>
                          <p className="font-medium">Donor</p>
                          <p>{claim.donation?.donor?.name || 'Anonymous'}</p>
                        </div>
                      </div>
                      
                      <div className="flex items-center text-skyblue-300">
                        <Package className="h-4 w-4 mr-2 text-green-400" />
                        <div>
                          <p className="font-medium">Quantity</p>
                          <p>{claim.quantity_claimed || claim.donation?.quantity}</p>
                        </div>
                      </div>
                      
                      <div className="flex items-center text-skyblue-300">
                        <Calendar className="h-4 w-4 mr-2 text-purple-400" />
                        <div>
                          <p className="font-medium">Approved</p>
                          <p>{formatTimeAgo(claim.claimed_at)}</p>
                        </div>
                      </div>
                      
                      {/* Show delivery method and relevant info */}
                      <div className="flex items-center text-skyblue-300">
                        {isVolunteerDelivery ? (
                          <>
                            <Truck className="h-4 w-4 mr-2 text-orange-400" />
                            <div>
                              <p className="font-medium">Volunteer</p>
                              <p>{delivery?.volunteer?.name || 'TBD'}</p>
                            </div>
                          </>
                        ) : isSelfPickup ? (
                          <>
                            <MapPin className="h-4 w-4 mr-2 text-blue-400" />
                            <div>
                              <p className="font-medium">Self Pickup</p>
                              <p className="text-xs text-skyblue-400 truncate">
                                {pickup?.pickup_location || claim.donation.pickup_location || 'Location TBD'}
                              </p>
                            </div>
                          </>
                        ) : (
                          <>
                            <MessageSquare className="h-4 w-4 mr-2 text-green-400" />
                            <div>
                              <p className="font-medium">Direct Delivery</p>
                              <p className="text-xs text-skyblue-400">
                                {directDelivery?.delivery_address ? directDelivery.delivery_address : 'Coordination needed'}
                              </p>
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  </motion.div>
                )
              })}
            </div>
          )}
        </motion.div>

        {/* Details Modal */}
        <AnimatePresence>
          {showDetailsModal && selectedDonation && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-navy-900 rounded-xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto"
              >
                <div className="space-y-6">
                  {/* Basic Info */}
                  <div>
                    <h3 className="text-lg font-medium text-white mb-3">{selectedDonation.donation?.title}</h3>
                    <p className="text-skyblue-300 mb-4">{selectedDonation.donation?.description}</p>
                    
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-skyblue-400">Category:</span>
                        <span className="text-white ml-2">{selectedDonation.donation?.category}</span>
                      </div>
                      <div>
                        <span className="text-skyblue-400">Condition:</span>
                        <span className="text-white ml-2">{selectedDonation.donation?.condition}</span>
                      </div>
                      <div>
                        <span className="text-skyblue-400">Quantity:</span>
                        <span className="text-white ml-2">{selectedDonation.quantity_claimed}</span>
                      </div>
                      <div>
                        <span className="text-skyblue-400">Approved:</span>
                        <span className="text-white ml-2">{formatDate(selectedDonation.claimed_at)}</span>
                      </div>
                      <div>
                        <span className="text-skyblue-400">Delivery Mode:</span>
                        <span className="text-white ml-2 capitalize">{selectedDonation.donation?.delivery_mode?.replace('_', ' ')}</span>
                      </div>
                    </div>
                  </div>

                  {/* Donor Info */}
                  <div className="border-t border-navy-700 pt-4">
                    <h4 className="text-md font-medium text-white mb-3">Donor Information</h4>
                    <div className="flex items-center gap-3">
                      <User className="h-5 w-5 text-blue-400" />
                      <div>
                        <p className="text-white">{selectedDonation.donation?.donor?.name || 'Anonymous'}</p>
                        {selectedDonation.donation?.donor?.phone_number && (
                          <a
                            href={`tel:${selectedDonation.donation.donor.phone_number}`}
                            className="text-skyblue-400 hover:text-skyblue-300 text-sm flex items-center gap-1"
                          >
                            <Phone className="h-3 w-3" />
                            {selectedDonation.donation.donor.phone_number}
                          </a>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Pickup Info for Self-Pickup */}
                  {selectedDonation.donation?.delivery_mode === 'pickup' && (
                    <div className="border-t border-navy-700 pt-4">
                      <h4 className="text-md font-medium text-white mb-3">Pickup Information</h4>
                      <div className="space-y-3">
                        <div className="flex items-center gap-3">
                          <MapPin className="h-5 w-5 text-blue-400" />
                          <div>
                            <p className="text-white">Pickup Location</p>
                            <p className="text-skyblue-300 text-sm">
                              {selectedDonation.pickup?.[0]?.pickup_location || selectedDonation.donation.pickup_location}
                            </p>
                          </div>
                        </div>
                        
                        {(selectedDonation.pickup?.[0]?.pickup_instructions || selectedDonation.donation.pickup_instructions) && (
                          <div className="flex items-start gap-3">
                            <MessageCircle className="h-5 w-5 text-green-400 mt-0.5" />
                            <div>
                              <p className="text-white">Pickup Instructions</p>
                              <p className="text-skyblue-300 text-sm">
                                {selectedDonation.pickup?.[0]?.pickup_instructions || selectedDonation.donation.pickup_instructions}
                              </p>
                            </div>
                          </div>
                        )}
                        
                        {selectedDonation.pickup?.[0] && (
                          <div className="grid grid-cols-2 gap-4 text-sm">
                            <div>
                              <span className="text-skyblue-400">Status:</span>
                              <span className="text-white ml-2">{selectedDonation.pickup[0].status.replace('_', ' ')}</span>
                            </div>
                            <div>
                              <span className="text-skyblue-400">Scheduled:</span>
                              <span className="text-white ml-2">{formatDate(selectedDonation.pickup[0].created_at)}</span>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Delivery Info for Volunteer Deliveries */}
                  {selectedDonation.delivery?.[0] && (
                    <div className="border-t border-navy-700 pt-4">
                      <h4 className="text-md font-medium text-white mb-3">Delivery Information</h4>
                      <div className="space-y-3">
                        <div className="flex items-center gap-3">
                          <Truck className="h-5 w-5 text-orange-400" />
                          <div>
                            <p className="text-white">Volunteer: {selectedDonation.delivery[0].volunteer?.name || 'TBD'}</p>
                            {selectedDonation.delivery[0].volunteer?.phone_number && (
                              <a
                                href={`tel:${selectedDonation.delivery[0].volunteer.phone_number}`}
                                className="text-skyblue-400 hover:text-skyblue-300 text-sm flex items-center gap-1"
                              >
                                <Phone className="h-3 w-3" />
                                {selectedDonation.delivery[0].volunteer.phone_number}
                              </a>
                            )}
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <span className="text-skyblue-400">Status:</span>
                            <span className="text-white ml-2">{selectedDonation.delivery[0].status.replace('_', ' ')}</span>
                          </div>
                          <div>
                            <span className="text-skyblue-400">Assigned:</span>
                            <span className="text-white ml-2">{formatDate(selectedDonation.delivery[0].created_at)}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex justify-end mt-6">
                  <button
                    onClick={() => setShowDetailsModal(false)}
                    className="btn btn-secondary"
                  >
                    Close
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* Pickup Management Modal */}
        <PickupManagementModal
          isOpen={showPickupModal}
          onClose={() => {
            setShowPickupModal(false)
            setSelectedDonation(null)
          }}
          claim={selectedDonation}
          onStatusUpdate={() => {
            loadApprovedDonations()
            loadDeliveryConfirmations()
          }}
        />

        {/* Direct Delivery Management Modal */}
        <DirectDeliveryManagementModal
          isOpen={showDirectDeliveryModal}
          onClose={() => {
            setShowDirectDeliveryModal(false)
            setSelectedDonation(null)
          }}
          donation={selectedDonation}
          onStatusUpdate={() => {
            loadApprovedDonations()
            loadDeliveryConfirmations()
          }}
        />

        {/* Delivery Confirmation Modal */}
        {showConfirmationModal && selectedConfirmationNotification && (
          <DeliveryConfirmationModal
            notification={selectedConfirmationNotification}
            onClose={() => {
              setShowConfirmationModal(false)
              setSelectedConfirmationNotification(null)
            }}
            onComplete={handleConfirmationComplete}
          />
        )}
      </div>
    </div>
  )
}

export default MyApprovedDonationsPage 