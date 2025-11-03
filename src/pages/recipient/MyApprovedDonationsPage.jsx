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
  Navigation,
  ArrowLeft
} from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import { useToast } from '../../contexts/ToastContext'
import { ListPageSkeleton } from '../../components/ui/Skeleton'
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

      // Rating reminders
      const ratingReminderNotifications = notifications.filter(n => 
        n.type === 'rating_reminder' && !n.read_at
      )
      setRatingReminderNotifications(ratingReminderNotifications)
    } catch (err) {
      console.error('Error loading confirmations:', err)
    }
  }, [user?.id])

  useEffect(() => {
    loadApprovedDonations()
    loadDeliveryConfirmations()
  }, [loadApprovedDonations, loadDeliveryConfirmations])

  // Realtime notifications for recipients
  useEffect(() => {
    if (!user?.id) return
    const unsubscribe = db.subscribeToUserNotifications(user.id, async () => {
      try { await loadDeliveryConfirmations() } catch (_) {}
    })
    return () => { if (unsubscribe) unsubscribe() }
  }, [user?.id, loadDeliveryConfirmations])

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

  // Rating reminder state and handlers
  const [ratingReminderNotifications, setRatingReminderNotifications] = useState([])
  const [showRatingModal, setShowRatingModal] = useState(false)
  const [selectedRatingNotification, setSelectedRatingNotification] = useState(null)
  const [rating, setRating] = useState(0)
  const [feedback, setFeedback] = useState('')

  const openRatingModal = (notification) => {
    setSelectedRatingNotification(notification)
    setRating(0)
    setFeedback('')
    setShowRatingModal(true)
  }

  const submitDonorRating = async () => {
    if (!user?.id || !selectedRatingNotification) return
    try {
      const ratedUserId = selectedRatingNotification.data?.rated_user_id
      const transactionId = selectedRatingNotification.data?.delivery_id || selectedRatingNotification.data?.claim_id
      await db.submitFeedback({
        transaction_id: transactionId,
        transaction_type: 'delivery',
        rater_id: user.id,
        rated_user_id: ratedUserId,
        rating: rating || 5,
        feedback: feedback || ''
      })
      success('Thanks for rating your experience!')
      if (selectedRatingNotification.id) {
        await db.markNotificationAsRead(selectedRatingNotification.id)
      }
      setShowRatingModal(false)
      setSelectedRatingNotification(null)
      await loadDeliveryConfirmations()
    } catch (err) {
      console.error('Error submitting rating:', err)
      error('Failed to submit rating')
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

  // Render rating reminders list
  const renderRatingReminders = () => (
    ratingReminderNotifications && ratingReminderNotifications.length > 0 && (
      <div className="card p-4 sm:p-5 lg:p-6 mb-4 sm:mb-6">
        <h3 className="text-white font-semibold mb-3">Rate Your Recent Donations</h3>
        <div className="space-y-3">
          {ratingReminderNotifications.map((n) => (
            <div key={n.id} className="flex items-center justify-between bg-navy-800/50 border border-navy-700 rounded-lg p-3">
              <div className="text-yellow-300 text-sm">
                {n.message}
              </div>
              <button onClick={() => openRatingModal(n)} className="btn btn-primary text-sm px-3 py-1.5">Rate now</button>
            </div>
          ))}
        </div>
      </div>
    )
  )

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
    return <ListPageSkeleton />
  }

  return (
    <div className="min-h-screen py-4 sm:py-6 lg:py-8" style={{backgroundColor: '#00237d'}}>
      <div className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6 sm:mb-8"
        >
          {/* Back Button */}
          <button
            onClick={() => window.history.back()}
            className="mb-4 flex items-center gap-2 text-yellow-300 hover:text-yellow-400 transition-colors group"
          >
            <ArrowLeft className="h-4 w-4 sm:h-5 sm:w-5 group-hover:-translate-x-1 transition-transform" />
            <span className="text-sm sm:text-base font-medium">Back</span>
          </button>

          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between mb-4 gap-3">
            <div className="flex-1">
              <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-white mb-2">My Approved Requests</h1>
              <p className="text-xs sm:text-sm text-yellow-300">
                Track your approved donation requests and manage pickups or deliveries
              </p>
            </div>
            <div className="flex items-center gap-2 px-3 sm:px-4 py-1.5 sm:py-2 bg-gradient-to-r from-yellow-500/20 to-yellow-600/20 border-2 border-yellow-500/40 rounded-full shadow-lg">
              <Package className="h-4 w-4 sm:h-5 sm:w-5 text-yellow-400 fill-yellow-400 animate-pulse" />
              <div className="flex items-center gap-1.5">
                <span className="text-lg sm:text-xl font-bold text-white">{approvedDonations.length}</span>
                <span className="text-xs sm:text-sm font-medium text-yellow-300">Request{approvedDonations.length !== 1 ? 's' : ''}</span>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Rating Reminders */}
        {ratingReminderNotifications && ratingReminderNotifications.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.05 }}
            className="mb-6 sm:mb-8"
          >
            <div className="bg-emerald-500/10 border-2 border-emerald-500/30 rounded-lg sm:rounded-xl p-4 sm:p-6">
              <div className="flex items-center mb-3 sm:mb-4">
                <Star className="h-5 w-5 sm:h-6 sm:w-6 text-emerald-400 mr-2 sm:mr-3 flex-shrink-0" />
                <h2 className="text-base sm:text-lg font-semibold text-white">
                  Rate Your Recent Donations ({ratingReminderNotifications.length})
                </h2>
              </div>
              <div className="space-y-3">
                {ratingReminderNotifications.map((n) => (
                  <div key={n.id} className="flex items-center justify-between bg-navy-800/50 border border-navy-700 rounded-lg p-3">
                    <div className="text-yellow-300 text-sm pr-3">
                      {n.message}
                    </div>
                    <button onClick={() => openRatingModal(n)} className="btn btn-primary text-sm px-3 py-1.5">Rate now</button>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}

        {/* Delivery Confirmations */}
        {deliveryConfirmationNotifications.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="mb-6 sm:mb-8"
          >
            <div className="bg-amber-500/10 border-2 border-amber-500/30 rounded-lg sm:rounded-xl p-4 sm:p-6">
              <div className="flex items-center mb-3 sm:mb-4">
                <AlertCircle className="h-5 w-5 sm:h-6 sm:w-6 text-amber-400 mr-2 sm:mr-3 flex-shrink-0" />
                <h2 className="text-base sm:text-lg font-semibold text-white">
                  Delivery Confirmations Needed ({deliveryConfirmationNotifications.length})
                </h2>
              </div>
              <div className="space-y-3">
                {deliveryConfirmationNotifications.map((notification) => (
                  <div
                    key={notification.id}
                    className="bg-navy-800/50 rounded-lg p-3 sm:p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3"
                  >
                    <div className="flex items-start gap-2 sm:gap-3 flex-1 min-w-0">
                      <CheckCircle className="h-4 w-4 sm:h-5 sm:w-5 text-amber-400 flex-shrink-0 mt-0.5" />
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
                      className="w-full sm:w-auto px-4 py-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white text-sm font-semibold rounded-lg transition-all shadow-md hover:shadow-lg active:scale-95 whitespace-nowrap"
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
            className="mb-6 sm:mb-8"
          >
            <div className="bg-emerald-500/10 border-2 border-emerald-500/30 rounded-lg sm:rounded-xl p-4 sm:p-6">
              <div className="flex items-center mb-3 sm:mb-4">
                <Navigation className="h-5 w-5 sm:h-6 sm:w-6 text-emerald-400 mr-2 sm:mr-3 flex-shrink-0" />
                <h2 className="text-base sm:text-lg font-semibold text-white">
                  Pickup Confirmations Needed ({pickupConfirmationNotifications.length})
                </h2>
              </div>
              <div className="space-y-3">
                {pickupConfirmationNotifications.map((notification) => (
                  <div
                    key={notification.id}
                    className="bg-navy-800/50 rounded-lg p-3 sm:p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3"
                  >
                    <div className="flex items-start gap-2 sm:gap-3 flex-1 min-w-0">
                      <CheckCircle className="h-4 w-4 sm:h-5 sm:w-5 text-emerald-400 flex-shrink-0 mt-0.5" />
                      <div className="flex-1 min-w-0">
                        <p className="text-white font-medium text-sm sm:text-base">{notification.title}</p>
                        <p className="text-yellow-300 text-xs sm:text-sm">{notification.message}</p>
                        <p className="text-yellow-400 text-xs mt-1">
                          Completed by: {notification.data?.completed_by_name}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => handleConfirmPickup(notification)}
                      className="w-full sm:w-auto px-4 py-2 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white text-sm font-semibold rounded-lg transition-all shadow-md hover:shadow-lg active:scale-95 whitespace-nowrap"
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
            className="mb-6 sm:mb-8"
          >
            <div className="bg-purple-500/10 border-2 border-purple-500/30 rounded-lg sm:rounded-xl p-4 sm:p-6">
              <div className="flex items-center mb-3 sm:mb-4">
                <Truck className="h-5 w-5 sm:h-6 sm:w-6 text-purple-400 mr-2 sm:mr-3 flex-shrink-0" />
                <h2 className="text-base sm:text-lg font-semibold text-white">
                  Direct Delivery Confirmations Needed ({directDeliveryConfirmationNotifications.length})
                </h2>
              </div>
              <div className="space-y-3">
                {directDeliveryConfirmationNotifications.map((notification) => (
                  <div
                    key={notification.id}
                    className="bg-navy-800/50 rounded-lg p-3 sm:p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3"
                  >
                    <div className="flex items-start gap-2 sm:gap-3 flex-1 min-w-0">
                      <CheckCircle className="h-4 w-4 sm:h-5 sm:w-5 text-purple-400 flex-shrink-0 mt-0.5" />
                      <div className="flex-1 min-w-0">
                        <p className="text-white font-medium text-sm sm:text-base">{notification.title}</p>
                        <p className="text-yellow-300 text-xs sm:text-sm">{notification.message}</p>
                        <p className="text-yellow-400 text-xs mt-1">
                          Direct delivery by donor
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => handleConfirmDirectDelivery(notification)}
                      className="w-full sm:w-auto px-4 py-2 bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white text-sm font-semibold rounded-lg transition-all shadow-md hover:shadow-lg active:scale-95 whitespace-nowrap"
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
            <div className="text-center py-8 sm:py-12">
              <Package className="h-12 w-12 sm:h-16 sm:w-16 text-yellow-400 mx-auto mb-3 sm:mb-4" />
              <h3 className="text-lg sm:text-xl font-semibold text-white mb-2">No approved requests yet</h3>
              <p className="text-sm sm:text-base text-yellow-300 px-4 mb-4 sm:mb-6">
                Once donors approve your requests, they will appear here for tracking.
              </p>
            </div>
          ) : (
            <div className="space-y-4 sm:space-y-6">
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
                    className="card hover:shadow-xl hover:border-yellow-500/20 transition-all duration-300 overflow-hidden border-l-4 border-2 border-navy-700"
                    style={{
                      borderLeftColor: claim.status === 'completed' ? '#10b981' : claim.status === 'delivered' ? '#fbbf24' : '#3b82f6'
                    }}
                  >
                    <div className="p-4 sm:p-5 lg:p-6">
                      {/* Header */}
                      <div className="flex flex-col lg:flex-row items-start justify-between gap-3 sm:gap-4 mb-3 sm:mb-4">
                        <div className="flex-1 min-w-0 w-full">
                          <h3 className="text-base sm:text-lg lg:text-xl font-bold text-white mb-2">
                            {claim.donation?.title}
                          </h3>
                          <p className="text-gray-300 text-xs sm:text-sm mb-3">
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
                      
    {/* Rating Modal */}
    {showRatingModal && (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-navy-900 border border-navy-700 shadow-xl rounded-xl p-6 max-w-md w-full"
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-white font-semibold">Rate Donor</h3>
            <button onClick={() => setShowRatingModal(false)} className="text-yellow-300 hover:text-white">✕</button>
          </div>
          <div className="mb-4">
            <div className="flex gap-2 items-center justify-center mb-2">
              {[1,2,3,4,5].map(star => (
                <button key={star} onClick={() => setRating(star)} className={`p-1 ${star <= rating ? 'text-yellow-400' : 'text-gray-500'}`}>★</button>
              ))}
            </div>
            <textarea value={feedback} onChange={(e) => setFeedback(e.target.value)} placeholder="Optional feedback" className="input w-full h-24" />
          </div>
          <div className="flex justify-end gap-2">
            <button onClick={() => setShowRatingModal(false)} className="btn btn-secondary">Cancel</button>
            <button onClick={submitDonorRating} className="btn btn-primary">Submit</button>
          </div>
        </motion.div>
      </div>
    )}

                      <div className="flex flex-wrap items-center gap-2">
                        {/* Self-Pickup Management Button */}
                        {isSelfPickup && claim.status !== 'completed' && (
                          <button
                            onClick={() => handleManagePickup(claim)}
                            className="px-3 sm:px-4 py-2 sm:py-2.5 bg-gradient-to-r from-yellow-500 to-yellow-600 hover:from-yellow-600 hover:to-yellow-700 text-white text-xs sm:text-sm font-semibold rounded-lg transition-all flex items-center gap-1.5 sm:gap-2 shadow-lg hover:shadow-xl active:scale-95"
                          >
                            <Navigation className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                            Manage Pickup
                          </button>
                        )}
                        
                        {/* Direct Delivery Management Button */}
                        {isDirectDelivery && claim.status !== 'completed' && (
                          <button
                            onClick={() => handleManageDirectDelivery(claim)}
                            className="px-3 sm:px-4 py-2 sm:py-2.5 bg-gradient-to-r from-yellow-500 to-yellow-600 hover:from-yellow-600 hover:to-yellow-700 text-white text-xs sm:text-sm font-semibold rounded-lg transition-all flex items-center gap-1.5 sm:gap-2 shadow-lg hover:shadow-xl active:scale-95"
                          >
                            <Truck className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                            Manage Delivery
                          </button>
                        )}

                        {/* Received Button for delivered volunteer deliveries */}
                        {isVolunteerDelivery && claim.status === 'delivered' && (
                          <button
                            onClick={() => handleConfirmReceipt(claim)}
                            className="px-3 sm:px-4 py-2 sm:py-2.5 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white text-xs sm:text-sm font-semibold rounded-lg transition-all flex items-center gap-1.5 sm:gap-2 shadow-lg hover:shadow-xl active:scale-95"
                          >
                            <CheckCircle className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                            Received
                          </button>
                        )}
                        
                        <button
                          onClick={() => handleViewDetails(claim)}
                          className="px-3 sm:px-4 py-2 sm:py-2.5 bg-navy-700 hover:bg-navy-600 text-yellow-300 hover:text-white text-xs sm:text-sm font-semibold rounded-lg transition-all flex items-center gap-1.5 sm:gap-2 border border-navy-600 hover:border-yellow-500/50 shadow-md hover:shadow-lg active:scale-95"
                        >
                          <Eye className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                          View Details
                        </button>
                      </div>
                    </div>
                    </div>
                    
                    {/* Details Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-sm p-4 sm:p-5 lg:p-6 bg-navy-800/30 rounded-lg border-t border-navy-700">
                      <div className="flex items-start text-yellow-300 min-w-0">
                        <User className="h-4 w-4 mr-2 text-blue-400 flex-shrink-0 mt-0.5" />
                        <div className="min-w-0 flex-1">
                          <p className="font-medium">Donor</p>
                          <p className="text-white truncate">{claim.donation?.donor?.name || 'Anonymous'}</p>
                        </div>
                      </div>
                      
                      <div className="flex items-start text-yellow-300 min-w-0">
                        <Package className="h-4 w-4 mr-2 text-green-400 flex-shrink-0 mt-0.5" />
                        <div className="min-w-0 flex-1">
                          <p className="font-medium">Quantity</p>
                          <p className="text-white truncate">{claim.quantity_claimed || claim.donation?.quantity}</p>
                        </div>
                      </div>
                      
                      <div className="flex items-start text-yellow-300 min-w-0">
                        <Calendar className="h-4 w-4 mr-2 text-purple-400 flex-shrink-0 mt-0.5" />
                        <div className="min-w-0 flex-1">
                          <p className="font-medium">Approved</p>
                          <p className="text-white truncate">{formatTimeAgo(claim.claimed_at)}</p>
                        </div>
                      </div>
                      
                      {/* Show delivery method and relevant info */}
                      <div className="flex items-start text-yellow-300 min-w-0">
                        {isVolunteerDelivery ? (
                          <>
                            <Truck className="h-4 w-4 mr-2 text-orange-400 flex-shrink-0 mt-0.5" />
                            <div className="min-w-0 flex-1">
                              <p className="font-medium">Volunteer</p>
                              <p className="text-white truncate">{delivery?.volunteer?.name || 'TBD'}</p>
                            </div>
                          </>
                        ) : isSelfPickup ? (
                          <>
                            <MapPin className="h-4 w-4 mr-2 text-blue-400 flex-shrink-0 mt-0.5" />
                            <div className="min-w-0 flex-1">
                              <p className="font-medium">Self Pickup</p>
                              <p className="text-xs text-white truncate" title={pickup?.pickup_location || claim.donation.pickup_location || 'Location TBD'}>
                                {pickup?.pickup_location || claim.donation.pickup_location || 'Location TBD'}
                              </p>
                            </div>
                          </>
                        ) : (
                          <>
                            <MessageSquare className="h-4 w-4 mr-2 text-green-400 flex-shrink-0 mt-0.5" />
                            <div className="min-w-0 flex-1">
                              <p className="font-medium">Direct Delivery</p>
                              <p className="text-xs text-white truncate" title={directDelivery?.delivery_address || 'Coordination needed'}>
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
            <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-3 sm:p-4">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-navy-900 border-2 border-yellow-500/30 rounded-lg sm:rounded-xl p-4 sm:p-6 max-w-2xl w-full max-h-[95vh] sm:max-h-[90vh] overflow-y-auto custom-scrollbar"
              >
                <div className="space-y-4 sm:space-y-6">
                  {/* Basic Info */}
                  <div>
                    <h3 className="text-base sm:text-lg font-medium text-white mb-3">{selectedDonation.donation?.title}</h3>
                    <p className="text-yellow-300 text-sm sm:text-base mb-4">{selectedDonation.donation?.description}</p>
                    
                    <div className="grid grid-cols-2 gap-3 sm:gap-4 text-xs sm:text-sm">
                      <div>
                        <span className="text-yellow-400">Category:</span>
                        <span className="text-white ml-2">{selectedDonation.donation?.category}</span>
                      </div>
                      <div>
                        <span className="text-yellow-400">Condition:</span>
                        <span className="text-white ml-2">{selectedDonation.donation?.condition}</span>
                      </div>
                      <div>
                        <span className="text-yellow-400">Quantity:</span>
                        <span className="text-white ml-2">{selectedDonation.quantity_claimed}</span>
                      </div>
                      <div>
                        <span className="text-yellow-400">Approved:</span>
                        <span className="text-white ml-2">{formatDate(selectedDonation.claimed_at)}</span>
                      </div>
                      <div>
                        <span className="text-yellow-400">Delivery Mode:</span>
                        <span className="text-white ml-2 capitalize">{selectedDonation.donation?.delivery_mode?.replace('_', ' ')}</span>
                      </div>
                    </div>
                  </div>

                  {/* Donor Info */}
                  <div className="border-t border-navy-700 pt-4">
                    <h4 className="text-sm sm:text-base font-medium text-white mb-3">Donor Information</h4>
                    <div className="flex items-center gap-3">
                      <User className="h-5 w-5 text-blue-400" />
                      <div>
                        <p className="text-white">{selectedDonation.donation?.donor?.name || 'Anonymous'}</p>
                        {selectedDonation.donation?.donor?.phone_number && (
                          <a
                            href={`tel:${selectedDonation.donation.donor.phone_number}`}
                            className="text-yellow-400 hover:text-yellow-300 text-sm flex items-center gap-1"
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
                      <h4 className="text-sm sm:text-base font-medium text-white mb-3">Pickup Information</h4>
                      <div className="space-y-3">
                        <div className="flex items-center gap-3">
                          <MapPin className="h-5 w-5 text-blue-400" />
                          <div>
                            <p className="text-white">Pickup Location</p>
                            <p className="text-yellow-300 text-sm">
                              {selectedDonation.pickup?.[0]?.pickup_location || selectedDonation.donation.pickup_location}
                            </p>
                          </div>
                        </div>
                        
                        {(selectedDonation.pickup?.[0]?.pickup_instructions || selectedDonation.donation.pickup_instructions) && (
                          <div className="flex items-start gap-3">
                            <MessageSquare className="h-5 w-5 text-green-400 mt-0.5" />
                            <div>
                              <p className="text-white">Pickup Instructions</p>
                              <p className="text-yellow-300 text-sm">
                                {selectedDonation.pickup?.[0]?.pickup_instructions || selectedDonation.donation.pickup_instructions}
                              </p>
                            </div>
                          </div>
                        )}
                        
                        {selectedDonation.pickup?.[0] && (
                          <div className="grid grid-cols-2 gap-4 text-sm">
                            <div>
                              <span className="text-yellow-400">Status:</span>
                              <span className="text-white ml-2">{selectedDonation.pickup[0].status.replace('_', ' ')}</span>
                            </div>
                            <div>
                              <span className="text-yellow-400">Scheduled:</span>
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
                      <h4 className="text-sm sm:text-base font-medium text-white mb-3">Delivery Information</h4>
                      <div className="space-y-3">
                        <div className="flex items-center gap-3">
                          <Truck className="h-5 w-5 text-orange-400" />
                          <div>
                            <p className="text-white">Volunteer: {selectedDonation.delivery[0].volunteer?.name || 'TBD'}</p>
                            {selectedDonation.delivery[0].volunteer?.phone_number && (
                              <a
                                href={`tel:${selectedDonation.delivery[0].volunteer.phone_number}`}
                                className="text-yellow-400 hover:text-yellow-300 text-sm flex items-center gap-1"
                              >
                                <Phone className="h-3 w-3" />
                                {selectedDonation.delivery[0].volunteer.phone_number}
                              </a>
                            )}
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <span className="text-yellow-400">Status:</span>
                            <span className="text-white ml-2">{selectedDonation.delivery[0].status.replace('_', ' ')}</span>
                          </div>
                          <div>
                            <span className="text-yellow-400">Assigned:</span>
                            <span className="text-white ml-2">{formatDate(selectedDonation.delivery[0].created_at)}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex justify-end mt-4 sm:mt-6">
                  <button
                    onClick={() => setShowDetailsModal(false)}
                    className="px-4 sm:px-6 py-2 sm:py-2.5 bg-navy-800 hover:bg-navy-700 text-white rounded-lg font-medium transition-colors border border-navy-600"
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