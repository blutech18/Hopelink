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
  ArrowLeft,
  Flag,
  Search,
  Filter,
  Gift,
  Heart,
  XCircle,
  X
} from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import { useToast } from '../../contexts/ToastContext'
import { ListPageSkeleton } from '../../components/ui/Skeleton'
import DeliveryConfirmationModal from '../../components/ui/DeliveryConfirmationModal'
import PickupManagementModal from '../../components/ui/PickupManagementModal'
import DirectDeliveryManagementModal from '../../components/ui/DirectDeliveryManagementModal'
import ReportUserModal from '../../components/ui/ReportUserModal'
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
  const [showReportModal, setShowReportModal] = useState(false)
  const [reportUser, setReportUser] = useState(null)
  const [reportTransactionContext, setReportTransactionContext] = useState(null)
  
  // Filter states
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedStatus, setSelectedStatus] = useState('')
  const [imageErrors, setImageErrors] = useState(new Set())
  const [loadingImages, setLoadingImages] = useState(new Set())

  const loadApprovedDonations = useCallback(async () => {
    if (!user?.id) return

    try {
      setLoading(true)
      
      // Fetch donations that have claims (JSONB array) - limit to recent 200 for performance
      const { data: donations, error: donationsError } = await supabase
        .from('donations')
        .select(`
          *,
          donor:users(id, name, email, phone_number, profile_image_url)
        `)
        .not('claims', 'is', null)
        .order('created_at', { ascending: false })
        .limit(200)

      if (donationsError) {
        console.error('Donations query error:', donationsError)
        throw donationsError
      }

      // Extract claims where recipient_id matches current user and status is valid
      const validStatuses = ['claimed', 'delivered', 'completed']
      const userClaims = []
      const claimIdToDonationMap = new Map()

      if (donations && donations.length > 0) {
        donations.forEach(donation => {
          if (Array.isArray(donation.claims)) {
            donation.claims.forEach(claim => {
              if (claim.recipient_id === user.id && validStatuses.includes(claim.status)) {
                // Store the donation with the claim
                userClaims.push({
                  ...claim,
                  donation: donation
                })
                claimIdToDonationMap.set(claim.id, donation.id)
              }
            })
          }
        })
      }

      // Sort by claimed_at descending
      userClaims.sort((a, b) => {
        const dateA = a.claimed_at ? new Date(a.claimed_at) : new Date(0)
        const dateB = b.claimed_at ? new Date(b.claimed_at) : new Date(0)
        return dateB - dateA
      })

      // Fetch deliveries for volunteer-mode claims
      const claimIds = userClaims.map(c => c.id).filter(Boolean)
      let deliveriesMap = new Map()

      if (claimIds.length > 0) {
        // Fetch deliveries that match these claim IDs
        let deliveriesQuery = supabase
          .from('deliveries')
          .select('*')
        
        // Use .eq() for single ID, .in() for multiple IDs
        if (claimIds.length === 1) {
          deliveriesQuery = deliveriesQuery.eq('claim_id', claimIds[0])
        } else {
          deliveriesQuery = deliveriesQuery.in('claim_id', claimIds)
        }
        
        const { data: deliveries, error: deliveriesError } = await deliveriesQuery

        if (!deliveriesError && deliveries) {
          // Get unique volunteer IDs
          const volunteerIds = [...new Set(deliveries.map(d => d.volunteer_id).filter(Boolean))]
          
          // Fetch volunteers separately
          let volunteersMap = new Map()
          if (volunteerIds.length > 0) {
            let volunteersQuery = supabase
              .from('users')
              .select('id, name, phone_number')
            
            // Use .eq() for single ID, .in() for multiple IDs
            if (volunteerIds.length === 1) {
              volunteersQuery = volunteersQuery.eq('id', volunteerIds[0])
            } else {
              volunteersQuery = volunteersQuery.in('id', volunteerIds)
            }
            
            const { data: volunteers, error: volunteersError } = await volunteersQuery

            if (!volunteersError && volunteers) {
              volunteers.forEach(v => volunteersMap.set(v.id, v))
            }
          }

          // Map deliveries to claims and attach volunteer info
          deliveries.forEach(delivery => {
            if (!deliveriesMap.has(delivery.claim_id)) {
              deliveriesMap.set(delivery.claim_id, [])
            }
            deliveriesMap.get(delivery.claim_id).push({
              ...delivery,
              volunteer: delivery.volunteer_id ? volunteersMap.get(delivery.volunteer_id) || null : null
            })
          })
        }
      }

      // Enrich claims with delivery and donor info
      const enrichedClaims = userClaims.map(claim => {
        const donation = claim.donation
        const deliveries = deliveriesMap.get(claim.id) || []
        
        return {
          ...claim,
          donation: {
            ...donation,
            donor: donation.donor || null
          },
          delivery: deliveries,
          recipient: {
            id: user.id,
            name: profile?.name || user.name,
            phone_number: profile?.phone_number || user.phone_number
          }
        }
      })

      // Check feedback status for completed donations
      const completedClaims = enrichedClaims.filter(c => c.status === 'completed')
      if (completedClaims.length > 0) {
        const feedbackStatusMap = await db.getFeedbackStatusForTransactions(
          user.id,
          completedClaims.map(c => ({
            delivery_id: c.delivery?.[0]?.id,
            claim_id: c.id,
            donation_id: c.donation?.id
          }))
        )
        
        // Add feedback status to each claim
        enrichedClaims.forEach(claim => {
          if (claim.status === 'completed') {
            const key = claim.id || claim.donation?.id || claim.delivery?.[0]?.id
            claim.hasFeedback = feedbackStatusMap.get(key) || false
          }
        })
      }
      
      setApprovedDonations(enrichedClaims)
      
      // Clear image error states when new data is loaded
      setImageErrors(new Set())
      setLoadingImages(new Set())
    } catch (err) {
      console.error('Error loading approved donations:', err)
      error('Failed to load approved donations')
    } finally {
      setLoading(false)
    }
  }, [user?.id, profile, error])

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
        n.type === 'system_alert' &&
        n.data?.notification_type === 'pickup_completed' && 
        n.data?.action_required === 'confirm_pickup' && 
        n.data?.role === 'recipient' &&
        !n.read_at
      )
      
      // Filter direct delivery confirmation notifications
      const directDeliveryConfirmationNotifications = notifications.filter(n => 
        n.type === 'system_alert' &&
        n.data?.notification_type === 'direct_delivery_completed' && 
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
  
  // Status options for filtering
  const statusOptions = [
    { value: 'claimed', label: 'Approved', color: 'text-blue-400 bg-blue-900/20' },
    { value: 'delivered', label: 'Delivered', color: 'text-yellow-400 bg-yellow-900/20' },
    { value: 'completed', label: 'Completed', color: 'text-green-400 bg-green-900/20' }
  ]
  
  // Filter donations
  const filteredDonations = approvedDonations.filter(claim => {
    const matchesSearch = claim.donation?.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         claim.donation?.description?.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesStatus = !selectedStatus || claim.status === selectedStatus

    return matchesSearch && matchesStatus
  })

  const openRatingModal = (notification) => {
    setSelectedRatingNotification(notification)
    setRating(0)
    setFeedback('')
    setShowRatingModal(true)
  }

  const submitDonorRating = async () => {
    if (!user?.id || !selectedRatingNotification || rating === 0) return
    try {
      const data = selectedRatingNotification.data
      const transactionId = data?.delivery_id || data?.claim_id || data?.donation_id
      
      // Submit feedback for donor if available
      if (data?.donor_id) {
        await db.submitFeedback({
          transaction_id: transactionId,
          transaction_type: 'donation',
          rater_id: user.id,
          rated_user_id: data.donor_id,
          rating: rating,
          feedback: feedback || `Feedback for donation: ${data.donation_title || 'donation'}`
        })
        
        // Update donor rating
        await db.updateUserRating(data.donor_id).catch(() => {})
      }
      
      // Submit feedback for volunteer if available
      if (data?.volunteer_id && data.volunteer_id !== user.id) {
        await db.submitFeedback({
          transaction_id: transactionId,
          transaction_type: 'delivery',
          rater_id: user.id,
          rated_user_id: data.volunteer_id,
          rating: rating,
          feedback: feedback || `Feedback for delivery: ${data.donation_title || 'delivery'}`
        })
        
        // Update volunteer rating
        await db.updateUserRating(data.volunteer_id).catch(() => {})
      }
      
      // Fallback to rated_user_id if provided (for backward compatibility)
      if (!data?.donor_id && !data?.volunteer_id && data?.rated_user_id) {
        await db.submitFeedback({
          transaction_id: transactionId,
          transaction_type: 'delivery',
          rater_id: user.id,
          rated_user_id: data.rated_user_id,
          rating: rating,
          feedback: feedback || ''
        })
        await db.updateUserRating(data.rated_user_id).catch(() => {})
      }
      
      success('Thank you for your feedback! Your input helps improve the community.')
      if (selectedRatingNotification.id) {
        await db.markNotificationAsRead(selectedRatingNotification.id).catch(() => {})
      }
      setShowRatingModal(false)
      setSelectedRatingNotification(null)
      setRating(0)
      setFeedback('')
      await loadDeliveryConfirmations()
      await loadApprovedDonations() // Refresh the list to update feedback status
    } catch (err) {
      console.error('Error submitting rating:', err)
      error('Failed to submit feedback. Please try again.')
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
          className="mb-4 sm:mb-6 lg:mb-8"
        >
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex items-center">
              <div>
                <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-white">My Approved Donations</h1>
                <p className="text-xs sm:text-sm text-yellow-200">Track donations approved for you and manage pickups or deliveries</p>
              </div>
            </div>
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
                <p className="text-xs text-yellow-400 mb-0.5">Approved</p>
                <p className="text-2xl sm:text-3xl font-bold text-white">{approvedDonations.filter(r => r.status === 'claimed').length}</p>
              </div>
              <div className="flex flex-col items-center gap-0.5">
                <CheckCircle className="h-5 w-5 sm:h-6 sm:w-6 lg:h-7 lg:w-7 text-blue-500" />
                <span className="text-[10px] sm:hidden text-blue-400 font-medium">Ready</span>
              </div>
            </div>
          </div>
          
          <div className="card p-2.5 sm:p-4 lg:p-6 border border-gray-600" style={{backgroundColor: '#001a5c'}}>
            <div className="flex items-center justify-between gap-2">
              <div className="flex-1 min-w-0">
                <p className="text-xs text-yellow-400 mb-0.5">Delivered</p>
                <p className="text-2xl sm:text-3xl font-bold text-white">{approvedDonations.filter(r => r.status === 'delivered').length}</p>
              </div>
              <div className="flex flex-col items-center gap-0.5">
                <Truck className="h-5 w-5 sm:h-6 sm:w-6 lg:h-7 lg:w-7 text-yellow-500" />
                <span className="text-[10px] sm:hidden text-yellow-400 font-medium">Transit</span>
              </div>
            </div>
          </div>
          
          <div className="card p-2.5 sm:p-4 lg:p-6 border border-gray-600" style={{backgroundColor: '#001a5c'}}>
            <div className="flex items-center justify-between gap-2">
              <div className="flex-1 min-w-0">
                <p className="text-xs text-yellow-400 mb-0.5">Completed</p>
                <p className="text-2xl sm:text-3xl font-bold text-white">{approvedDonations.filter(r => r.status === 'completed').length}</p>
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
                <p className="text-2xl sm:text-3xl font-bold text-white">{approvedDonations.length}</p>
              </div>
              <div className="flex flex-col items-center gap-0.5">
                <Package className="h-5 w-5 sm:h-6 sm:w-6 lg:h-7 lg:w-7 text-yellow-500" />
                <span className="text-[10px] sm:hidden text-yellow-400 font-medium">All</span>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Rating Reminders */}
        {ratingReminderNotifications && ratingReminderNotifications.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="card p-4 sm:p-6 mb-4 sm:mb-6 lg:mb-8 border border-navy-700 border-l-4 border-l-emerald-500"
            style={{backgroundColor: '#001a5c'}}
          >
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-emerald-500/10 rounded-lg flex-shrink-0">
                  <Star className="h-5 w-5 sm:h-6 sm:w-6 text-emerald-500" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-semibold text-white">Rate Your Recent Donations</h3>
                  <p className="text-yellow-300 text-xs sm:text-sm">Please rate your experience</p>
                </div>
              </div>
              <span className="bg-emerald-500/20 text-emerald-400 px-3 py-1 rounded-full text-xs sm:text-sm font-medium self-start sm:self-auto">
                {ratingReminderNotifications.length} pending
              </span>
            </div>
            
            <div className="space-y-3">
              {ratingReminderNotifications.map((n) => (
                <div
                  key={n.id}
                  className="bg-navy-800/50 rounded-lg p-3 sm:p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"
                >
                  <div className="flex items-start gap-3">
                    <Star className="h-5 w-5 text-emerald-500 flex-shrink-0 mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <p className="text-white font-medium text-sm sm:text-base">{n.message}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => openRatingModal(n)}
                    className="btn btn-primary text-xs sm:text-sm px-3 sm:px-4 py-2 whitespace-nowrap active:scale-95 w-full sm:w-auto"
                  >
                    Rate now
                  </button>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* Delivery Confirmations */}
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

        {/* Pickup Confirmations */}
        {pickupConfirmationNotifications.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="card p-4 sm:p-6 mb-4 sm:mb-6 lg:mb-8 border border-navy-700 border-l-4 border-l-emerald-500"
            style={{backgroundColor: '#001a5c'}}
          >
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-emerald-500/10 rounded-lg flex-shrink-0">
                  <Navigation className="h-5 w-5 sm:h-6 sm:w-6 text-emerald-500" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-semibold text-white">Pickup Confirmations Needed</h3>
                  <p className="text-yellow-300 text-xs sm:text-sm">Please confirm these completed pickups</p>
                </div>
              </div>
              <span className="bg-emerald-500/20 text-emerald-400 px-3 py-1 rounded-full text-xs sm:text-sm font-medium self-start sm:self-auto">
                {pickupConfirmationNotifications.length} pending
              </span>
            </div>
            
            <div className="space-y-3">
              {pickupConfirmationNotifications.map((notification) => (
                <div
                  key={notification.id}
                  className="bg-navy-800/50 rounded-lg p-3 sm:p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"
                >
                  <div className="flex items-start gap-3">
                    <CheckCircle className="h-5 w-5 text-emerald-500 flex-shrink-0 mt-0.5" />
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
                    className="btn btn-primary text-xs sm:text-sm px-3 sm:px-4 py-2 whitespace-nowrap active:scale-95 w-full sm:w-auto"
                  >
                    Confirm Pickup
                  </button>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* Direct Delivery Confirmations */}
        {directDeliveryConfirmationNotifications.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="card p-4 sm:p-6 mb-4 sm:mb-6 lg:mb-8 border border-navy-700 border-l-4 border-l-purple-500"
            style={{backgroundColor: '#001a5c'}}
          >
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-500/10 rounded-lg flex-shrink-0">
                  <Truck className="h-5 w-5 sm:h-6 sm:w-6 text-purple-500" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-semibold text-white">Direct Delivery Confirmations Needed</h3>
                  <p className="text-yellow-300 text-xs sm:text-sm">Please confirm these completed deliveries</p>
                </div>
              </div>
              <span className="bg-purple-500/20 text-purple-400 px-3 py-1 rounded-full text-xs sm:text-sm font-medium self-start sm:self-auto">
                {directDeliveryConfirmationNotifications.length} pending
              </span>
            </div>
            
            <div className="space-y-3">
              {directDeliveryConfirmationNotifications.map((notification) => (
                <div
                  key={notification.id}
                  className="bg-navy-800/50 rounded-lg p-3 sm:p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"
                >
                  <div className="flex items-start gap-3">
                    <CheckCircle className="h-5 w-5 text-purple-500 flex-shrink-0 mt-0.5" />
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
                    className="btn btn-primary text-xs sm:text-sm px-3 sm:px-4 py-2 whitespace-nowrap active:scale-95 w-full sm:w-auto"
                  >
                    Confirm Receipt
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
                placeholder="Search approved requests..."
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
          </div>
        </motion.div>

        {/* Approved Requests List */}
        {filteredDonations.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-12"
          >
            <Package className="h-16 w-16 text-yellow-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">
              {approvedDonations.length === 0 ? 'No approved donations yet' : 'No matching approved donations'}
            </h3>
            <p className="text-yellow-400 mb-6">
              {approvedDonations.length === 0 
                ? 'When donors approve your requests for their donations, they will appear here for tracking.' 
                : 'Try adjusting your filters to see more results.'}
            </p>
          </motion.div>
        ) : (
          <div className="grid grid-cols-1 gap-6">
            <AnimatePresence>
              {filteredDonations.map((claim, index) => {
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
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ delay: index * 0.05 }}
                    className="card overflow-hidden hover:shadow-xl hover:border-yellow-500/30 transition-all duration-300 group"
                  >
                    <div className="flex flex-col sm:flex-row gap-4 p-4">
                      {/* Sample Image or Placeholder */}
                      <div className="flex-shrink-0">
                        {claim.donation?.images && claim.donation.images.length > 0 && !imageErrors.has(claim.id) ? (
                          <div className="relative w-full sm:w-48 lg:w-56 h-40 sm:h-48 rounded-lg overflow-hidden border-2 border-yellow-500/30 shadow-lg">
                            {loadingImages.has(claim.id) && (
                              <div className="absolute inset-0 bg-navy-800 flex items-center justify-center">
                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-yellow-400"></div>
                              </div>
                            )}
                            <img 
                              src={claim.donation.images[0]} 
                              alt={claim.donation.title}
                              className="w-full h-full object-cover"
                              onLoad={() => {
                                setLoadingImages(prev => {
                                  const newSet = new Set(prev)
                                  newSet.delete(claim.id)
                                  return newSet
                                })
                              }}
                              onLoadStart={() => {
                                setLoadingImages(prev => new Set([...prev, claim.id]))
                              }}
                              onError={() => {
                                setImageErrors(prev => new Set([...prev, claim.id]))
                                setLoadingImages(prev => {
                                  const newSet = new Set(prev)
                                  newSet.delete(claim.id)
                                  return newSet
                                })
                              }}
                            />
                          </div>
                        ) : (
                          <div className="w-full sm:w-48 lg:w-56 h-40 sm:h-48 rounded-lg bg-gradient-to-br from-navy-800 to-navy-900 flex flex-col items-center justify-center border-2 border-navy-600 shadow-lg">
                            <Gift className="h-12 w-12 sm:h-16 sm:w-16 text-yellow-400 mb-2" />
                            <span className="text-[10px] sm:text-xs text-gray-400 font-medium uppercase tracking-wide">No Image</span>
                            <span className={`mt-2 px-2 py-0.5 sm:py-1 rounded-md text-[10px] sm:text-xs font-semibold ${getStatusColor(claim.status)}`}>
                              {claim.status === 'claimed' ? 'Approved' : claim.status === 'completed' ? 'Completed' : 'Delivered'}
                            </span>
                          </div>
                        )}
                      </div>
                      
                      {/* Card Content */}
                      <div className="flex-1 min-w-0 space-y-2 sm:space-y-3">
                        {/* Header with Actions */}
                        <div className="flex flex-col sm:flex-row items-start justify-between gap-3 sm:gap-4">
                          <div className="flex-1 min-w-0">
                            <h3 className="text-base sm:text-lg lg:text-xl font-bold text-white mb-1.5 sm:mb-2">{claim.donation?.title}</h3>
                            <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 mb-2">
                              <span className={`inline-flex items-center px-2 sm:px-3 py-0.5 sm:py-1 rounded-full text-[10px] sm:text-xs font-semibold ${getStatusColor(claim.status)}`}>
                                <StatusIcon className="h-3 w-3 mr-1" />
                                {claim.status === 'claimed' ? 'Approved' : claim.status === 'completed' ? 'Completed' : 'Delivered'}
                              </span>
                              
                              {claim.donation?.category && (
                                <span className="inline-flex items-center px-2 sm:px-3 py-0.5 sm:py-1 rounded-full text-[10px] sm:text-xs font-semibold bg-yellow-900/30 text-yellow-300 border border-yellow-500/30 whitespace-nowrap">
                                  {claim.donation.category}
                                </span>
                              )}
                            </div>
                            <p className="text-gray-300 text-xs sm:text-sm line-clamp-2">
                              {claim.donation?.description || 'No description provided'}
                            </p>
                          </div>
                          
                          {/* Action Buttons */}
                          <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
                            <button
                              onClick={() => handleViewDetails(claim)}
                              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-navy-950 bg-yellow-400 hover:bg-yellow-500 rounded-lg transition-all active:scale-95"
                            >
                              <Eye className="h-3.5 w-3.5" />
                              <span>View</span>
                            </button>
                          </div>
                        </div>

                        {/* Compact Details */}
                        <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 sm:gap-y-2 text-xs sm:text-sm">
                          <div className="flex items-center gap-1 sm:gap-1.5">
                            <User className="h-3 w-3 sm:h-4 sm:w-4 text-blue-400 flex-shrink-0" />
                            <span className="text-blue-400 font-medium">Donor:</span>
                            <span className="text-white font-semibold truncate">{claim.donation?.donor?.name || 'Anonymous'}</span>
                          </div>
                          
                          <div className="flex items-center gap-1 sm:gap-1.5">
                            <Package className="h-3 w-3 sm:h-4 sm:w-4 text-green-400 flex-shrink-0" />
                            <span className="text-green-400 font-medium">Quantity:</span>
                            <span className="text-white font-semibold">{claim.quantity_claimed || claim.donation?.quantity}</span>
                          </div>
                          
                          <div className="flex items-center gap-1 sm:gap-1.5">
                            <Calendar className="h-3 w-3 sm:h-4 sm:w-4 text-purple-400 flex-shrink-0" />
                            <span className="text-purple-400 font-medium">Approved:</span>
                            <span className="text-gray-300">{formatTimeAgo(claim.claimed_at)}</span>
                          </div>
                          
                          <div className="flex items-center gap-1 sm:gap-1.5">
                            {isVolunteerDelivery ? (
                              <>
                                <Truck className="h-3 w-3 sm:h-4 sm:w-4 text-amber-400 flex-shrink-0" />
                                <span className="text-amber-400 font-medium">Mode:</span>
                                <span className="text-gray-300 truncate">Volunteer</span>
                              </>
                            ) : isSelfPickup ? (
                              <>
                                <Navigation className="h-3 w-3 sm:h-4 sm:w-4 text-blue-400 flex-shrink-0" />
                                <span className="text-blue-400 font-medium">Mode:</span>
                                <span className="text-gray-300 truncate">Self Pickup</span>
                              </>
                            ) : (
                              <>
                                <MessageSquare className="h-3 w-3 sm:h-4 sm:w-4 text-green-400 flex-shrink-0" />
                                <span className="text-green-400 font-medium">Mode:</span>
                                <span className="text-gray-300 truncate">Direct</span>
                              </>
                            )}
                          </div>
                        </div>

                        {/* Management Buttons Row */}
                        {(isSelfPickup || isDirectDelivery || isVolunteerDelivery || claim.status === 'completed') && (
                          <div className="flex flex-wrap items-center gap-2 pt-2">
                            {/* Self-Pickup Management Button */}
                            {isSelfPickup && claim.status !== 'completed' && (
                              <button
                                onClick={() => handleManagePickup(claim)}
                                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-navy-700 hover:bg-navy-600 border border-yellow-500/30 rounded-lg transition-all active:scale-95"
                              >
                                <Navigation className="h-3.5 w-3.5" />
                                <span>Manage Pickup</span>
                              </button>
                            )}
                            
                            {/* Direct Delivery Management Button */}
                            {isDirectDelivery && claim.status !== 'completed' && (
                              <button
                                onClick={() => handleManageDirectDelivery(claim)}
                                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-navy-700 hover:bg-navy-600 border border-yellow-500/30 rounded-lg transition-all active:scale-95"
                              >
                                <Truck className="h-3.5 w-3.5" />
                                <span>Manage Delivery</span>
                              </button>
                            )}

                            {/* Received Button for delivered volunteer deliveries */}
                            {isVolunteerDelivery && claim.status === 'delivered' && (
                              <button
                                onClick={() => handleConfirmReceipt(claim)}
                                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-success-600 hover:bg-success-700 rounded-lg transition-all active:scale-95"
                              >
                                <CheckCircle className="h-3.5 w-3.5" />
                                <span>Confirm Receipt</span>
                              </button>
                            )}

                            {/* Feedback and Report Buttons for Completed Transactions */}
                            {claim.status === 'completed' && (
                              <>
                                {/* Provide Feedback Button */}
                                {claim.hasFeedback ? (
                                  <div className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-green-400 bg-green-500/20 border border-green-500/30 rounded-lg">
                                    <CheckCircle className="h-3.5 w-3.5" />
                                    <span>Feedback Provided</span>
                                  </div>
                                ) : (
                                  <button
                                    onClick={() => {
                                      // Create a notification-like object for the feedback modal
                                      const feedbackNotification = {
                                        id: `feedback-${claim.id}`,
                                        data: {
                                          delivery_id: delivery?.id || claim.id,
                                          claim_id: claim.id,
                                          donation_id: claim.donation?.id,
                                          donor_id: claim.donation?.donor?.id,
                                          volunteer_id: delivery?.volunteer?.id,
                                          donor_name: claim.donation?.donor?.name,
                                          volunteer_name: delivery?.volunteer?.name,
                                          donation_title: claim.donation?.title,
                                          role: 'recipient'
                                        }
                                      }
                                      openRatingModal(feedbackNotification)
                                    }}
                                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-yellow-600 hover:bg-yellow-700 rounded-lg transition-all active:scale-95"
                                    title="Provide feedback on this donation"
                                  >
                                    <Star className="h-3.5 w-3.5" />
                                    <span>Provide Feedback</span>
                                  </button>
                                )}
                                
                                {/* Report Donor */}
                                {claim.donation?.donor?.id && claim.donation.donor.id !== user?.id && (
                                  <button
                                    onClick={() => {
                                      setReportUser({
                                        id: claim.donation.donor.id,
                                        name: claim.donation.donor.name,
                                        role: 'donor'
                                      })
                                      setReportTransactionContext({
                                        type: 'donation',
                                        id: claim.donation.id,
                                        title: claim.donation.title
                                      })
                                      setShowReportModal(true)
                                    }}
                                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-danger-600 hover:bg-danger-700 rounded-lg transition-all active:scale-95"
                                    title="Report donor"
                                  >
                                    <Flag className="h-3.5 w-3.5" />
                                    <span>Report Donor</span>
                                  </button>
                                )}
                                
                                {/* Report Volunteer */}
                                {delivery?.volunteer?.id && delivery.volunteer.id !== user?.id && (
                                  <button
                                    onClick={() => {
                                      setReportUser({
                                        id: delivery.volunteer.id,
                                        name: delivery.volunteer.name,
                                        role: 'volunteer'
                                      })
                                      setReportTransactionContext({
                                        type: 'delivery',
                                        id: delivery.id,
                                        title: claim.donation.title
                                      })
                                      setShowReportModal(true)
                                    }}
                                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-danger-600 hover:bg-danger-700 rounded-lg transition-all active:scale-95"
                                    title="Report volunteer"
                                  >
                                    <Flag className="h-3.5 w-3.5" />
                                    <span>Report Volunteer</span>
                                  </button>
                                )}
                              </>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </motion.div>
                )
              })}
            </AnimatePresence>
          </div>
        )}
        
        {/* Enhanced Rating/Feedback Modal */}
        {showRatingModal && selectedRatingNotification && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-navy-900 border-2 border-yellow-500/30 shadow-xl rounded-xl p-6 max-w-lg w-full"
            >
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <Star className="h-6 w-6 text-yellow-400" />
                  <h3 className="text-white font-semibold text-lg">
                    {selectedRatingNotification.data?.donor_id ? 'Rate Donor' : 
                     selectedRatingNotification.data?.volunteer_id ? 'Rate Volunteer' : 
                     'Provide Feedback'}
                  </h3>
                </div>
                <button 
                  onClick={() => {
                    setShowRatingModal(false)
                    setSelectedRatingNotification(null)
                    setRating(0)
                    setFeedback('')
                  }} 
                  className="text-gray-400 hover:text-white transition-colors p-1 hover:bg-navy-800 rounded"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              
              {/* Donation Info */}
              {selectedRatingNotification.data?.donation_title && (
                <div className="bg-navy-800/50 rounded-lg p-3 mb-4 border border-yellow-500/20">
                  <p className="text-sm text-yellow-300 font-medium mb-1">Donation:</p>
                  <p className="text-white font-semibold">{selectedRatingNotification.data.donation_title}</p>
                </div>
              )}
              
              <div className="space-y-4 mb-6">
                {/* Overall Rating */}
                <div>
                  <label className="block text-sm font-medium text-yellow-300 mb-2">
                    Overall Rating {rating > 0 && <span className="text-yellow-400">({rating}/5)</span>}
                  </label>
                  <div className="flex items-center gap-2">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        type="button"
                        onClick={() => setRating(star)}
                        className="focus:outline-none transition-transform hover:scale-110 active:scale-95"
                      >
                        <Star
                          className={`h-8 w-8 ${
                            star <= rating
                              ? 'text-yellow-400 fill-yellow-400'
                              : 'text-gray-500'
                          }`}
                        />
                      </button>
                    ))}
                  </div>
                </div>
                
                {/* Feedback Text */}
                <div>
                  <label className="block text-sm font-medium text-yellow-300 mb-2">
                    Additional Feedback {rating > 0 && <span className="text-gray-400">(optional)</span>}
                  </label>
                  <textarea
                    value={feedback}
                    onChange={(e) => setFeedback(e.target.value)}
                    placeholder="Share your experience with this donation..."
                    className="w-full px-3 py-2 bg-navy-800 border border-yellow-500/30 rounded-lg text-white placeholder-yellow-400/50 focus:border-yellow-500 focus:outline-none focus:ring-2 focus:ring-yellow-500/20 resize-none"
                    rows={4}
                  />
                </div>
              </div>
              
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => {
                    setShowRatingModal(false)
                    setSelectedRatingNotification(null)
                    setRating(0)
                    setFeedback('')
                  }}
                  className="px-4 py-2 bg-navy-700 hover:bg-navy-600 text-white rounded-lg font-medium transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={submitDonorRating}
                  disabled={rating === 0}
                  className="px-4 py-2 bg-yellow-600 hover:bg-yellow-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors flex items-center gap-2"
                >
                  <Star className="h-4 w-4" />
                  Submit Feedback
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {/* Details Modal */}
        <AnimatePresence>
          {showDetailsModal && selectedDonation && (
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
                      <Package className="h-5 w-5 sm:h-6 sm:w-6 text-yellow-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-base sm:text-lg lg:text-xl font-bold text-white truncate">Donation Details</h3>
                      <p className="text-[10px] sm:text-xs text-yellow-300">Complete information</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setShowDetailsModal(false)}
                    className="text-gray-400 hover:text-white transition-colors p-1.5 sm:p-2 hover:bg-navy-800 rounded-lg flex-shrink-0"
                    aria-label="Close modal"
                  >
                    <X className="h-5 w-5 sm:h-6 sm:w-6" />
                  </button>
                </div>

                {/* Content with Custom Scrollbar */}
                <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-3 sm:py-4 custom-scrollbar">
                  <div className="space-y-4 sm:space-y-6">
                    {/* Donation Image */}
                    {selectedDonation.donation?.images && selectedDonation.donation.images.length > 0 && (
                      <div className="relative rounded-lg overflow-hidden bg-navy-800">
                        <img
                          src={selectedDonation.donation.images[0]}
                          alt={selectedDonation.donation.title}
                          className="w-full h-48 sm:h-64 object-cover"
                        />
                      </div>
                    )}

                    {/* Title and Status */}
                    <div className="bg-navy-800/50 rounded-lg p-3 sm:p-4 border border-navy-700">
                      <div className="flex flex-col sm:flex-row items-start justify-between gap-2 sm:gap-4 mb-2 sm:mb-3">
                        <h4 className="text-lg sm:text-xl lg:text-2xl font-bold text-white">{selectedDonation.donation?.title}</h4>
                        <span className="px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-full text-[10px] sm:text-xs font-semibold bg-yellow-900/30 text-yellow-300 border border-yellow-500/30 whitespace-nowrap">
                          {selectedDonation.donation?.category}
                        </span>
                      </div>
                      <p className="text-sm sm:text-base text-gray-300 leading-relaxed">{selectedDonation.donation?.description || 'No description provided'}</p>
                    </div>

                    {/* Details Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="bg-navy-800/30 rounded-lg p-4 border border-navy-700">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Package className="h-4 w-4 text-blue-400" />
                            <label className="text-sm font-semibold text-yellow-300">Quantity Claimed</label>
                          </div>
                          <p className="text-white text-lg font-medium">{selectedDonation.quantity_claimed}</p>
                        </div>
                      </div>
                      
                      <div className="bg-navy-800/30 rounded-lg p-4 border border-navy-700">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <AlertCircle className="h-4 w-4 text-orange-400" />
                            <label className="text-sm font-semibold text-yellow-300">Status</label>
                          </div>
                          <p className="text-white text-lg font-medium">
                            {selectedDonation.status === 'claimed' ? 'Approved' : selectedDonation.status === 'completed' ? 'Completed' : 'Delivered'}
                          </p>
                        </div>
                      </div>
                      
                      <div className="bg-navy-800/30 rounded-lg p-4 border border-navy-700">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Star className="h-4 w-4 text-green-400" />
                            <label className="text-sm font-semibold text-yellow-300">Condition</label>
                          </div>
                          <p className="text-white text-lg font-medium">{selectedDonation.donation?.condition || 'Not specified'}</p>
                        </div>
                      </div>

                      <div className="bg-navy-800/30 rounded-lg p-4 border border-navy-700">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Truck className="h-4 w-4 text-purple-400" />
                            <label className="text-sm font-semibold text-yellow-300">Delivery Mode</label>
                          </div>
                          <p className="text-white text-lg font-medium capitalize">{selectedDonation.donation?.delivery_mode?.replace('_', ' ') || 'Not specified'}</p>
                        </div>
                      </div>
                    </div>

                    {/* Dates */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="bg-navy-800/30 rounded-lg p-4 border border-navy-700">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4 text-orange-400" />
                            <label className="text-sm font-semibold text-yellow-300">Approved Date</label>
                          </div>
                          <p className="text-white">{formatDate(selectedDonation.claimed_at)}</p>
                        </div>
                      </div>

                      <div className="bg-navy-800/30 rounded-lg p-4 border border-navy-700">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Clock className="h-4 w-4 text-red-400" />
                            <label className="text-sm font-semibold text-yellow-300">Posted Date</label>
                          </div>
                          <p className="text-white">{formatDate(selectedDonation.donation?.created_at)}</p>
                        </div>
                      </div>
                    </div>

                    {/* Donor Information */}
                    <div className="bg-navy-800/30 rounded-lg p-3 border border-navy-700">
                      <label className="text-sm font-semibold text-yellow-300 mb-2 block">Donor Information</label>
                      <div className="space-y-2">
                        <div className="flex items-start gap-2">
                          <User className="h-4 w-4 text-blue-400 flex-shrink-0 mt-0.5" />
                          <div className="min-w-0 flex-1">
                            <span className="text-xs text-yellow-400 font-medium">Name: </span>
                            <span className="text-white text-sm">{selectedDonation.donation?.donor?.name || 'Anonymous'}</span>
                          </div>
                        </div>
                        
                        <div className="flex items-start gap-2">
                          <MessageSquare className="h-4 w-4 text-green-400 flex-shrink-0 mt-0.5" />
                          <div className="min-w-0 flex-1">
                            <span className="text-xs text-yellow-400 font-medium">Email: </span>
                            <span className="text-white text-sm break-all">
                              {selectedDonation.donation?.donor?.email || 'Email not provided'}
                            </span>
                          </div>
                        </div>
                        
                        <div className="flex items-start gap-2">
                          <Phone className="h-4 w-4 text-purple-400 flex-shrink-0 mt-0.5" />
                          <div className="min-w-0 flex-1">
                            <span className="text-xs text-yellow-400 font-medium">Phone: </span>
                            {selectedDonation.donation?.donor?.phone_number ? (
                              <a
                                href={`tel:${selectedDonation.donation.donor.phone_number}`}
                                className="text-yellow-400 hover:text-yellow-300 text-sm"
                              >
                                {selectedDonation.donation.donor.phone_number}
                              </a>
                            ) : (
                              <span className="text-white text-sm">Not provided</span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Pickup Info for Self-Pickup */}
                    {selectedDonation.donation?.delivery_mode === 'pickup' && (
                      <div className="bg-navy-800/30 rounded-lg p-4 border border-navy-700">
                        <label className="text-sm font-semibold text-yellow-300 mb-3 block">Pickup Information</label>
                        <div className="space-y-3">
                          <div className="flex items-center gap-3">
                            <MapPin className="h-5 w-5 text-blue-400" />
                            <div>
                              <p className="text-white font-medium">Pickup Location</p>
                              <p className="text-gray-300 text-sm">
                                {selectedDonation.pickup?.[0]?.pickup_location || selectedDonation.donation.pickup_location || 'Not specified'}
                              </p>
                            </div>
                          </div>
                          
                          {(selectedDonation.pickup?.[0]?.pickup_instructions || selectedDonation.donation.pickup_instructions) && (
                            <div className="flex items-start gap-3">
                              <MessageSquare className="h-5 w-5 text-green-400 mt-0.5" />
                              <div>
                                <p className="text-white font-medium">Pickup Instructions</p>
                                <p className="text-gray-300 text-sm">
                                  {selectedDonation.pickup?.[0]?.pickup_instructions || selectedDonation.donation.pickup_instructions}
                                </p>
                              </div>
                            </div>
                          )}
                          
                          {selectedDonation.pickup?.[0] && (
                            <div className="grid grid-cols-2 gap-4 text-sm pt-2 border-t border-navy-600">
                              <div>
                                <span className="text-yellow-400 font-medium">Status:</span>
                                <span className="text-white ml-2 capitalize">{selectedDonation.pickup[0].status.replace('_', ' ')}</span>
                              </div>
                              <div>
                                <span className="text-yellow-400 font-medium">Scheduled:</span>
                                <span className="text-white ml-2">{formatDate(selectedDonation.pickup[0].created_at)}</span>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Delivery Info for Volunteer Deliveries */}
                    {selectedDonation.delivery?.[0] && (
                      <div className="bg-navy-800/30 rounded-lg p-4 border border-navy-700">
                        <label className="text-sm font-semibold text-yellow-300 mb-3 block">Delivery Information</label>
                        <div className="space-y-3">
                          <div className="flex items-center gap-3">
                            <Truck className="h-5 w-5 text-orange-400" />
                            <div>
                              <p className="text-white font-medium">Volunteer: {selectedDonation.delivery[0].volunteer?.name || 'TBD'}</p>
                              {selectedDonation.delivery[0].volunteer?.phone_number && (
                                <a
                                  href={`tel:${selectedDonation.delivery[0].volunteer.phone_number}`}
                                  className="text-yellow-400 hover:text-yellow-300 text-sm flex items-center gap-1 mt-1"
                                >
                                  <Phone className="h-3 w-3" />
                                  {selectedDonation.delivery[0].volunteer.phone_number}
                                </a>
                              )}
                            </div>
                          </div>
                          
                          <div className="grid grid-cols-2 gap-4 text-sm pt-2 border-t border-navy-600">
                            <div>
                              <span className="text-yellow-400 font-medium">Status:</span>
                              <span className="text-white ml-2 capitalize">{selectedDonation.delivery[0].status.replace('_', ' ')}</span>
                            </div>
                            <div>
                              <span className="text-yellow-400 font-medium">Assigned:</span>
                              <span className="text-white ml-2">{formatDate(selectedDonation.delivery[0].created_at)}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Footer */}
                <div className="p-4 sm:p-6 pt-3 sm:pt-4 border-t-2 border-yellow-500/20 flex justify-end gap-3 flex-shrink-0">
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

        {/* Report User Modal */}
        {reportUser && (
          <ReportUserModal
            isOpen={showReportModal}
            onClose={() => {
              setShowReportModal(false)
              setReportUser(null)
              setReportTransactionContext(null)
            }}
            reportedUserId={reportUser.id}
            reportedUserName={reportUser.name}
            reportedUserRole={reportUser.role}
            transactionContext={reportTransactionContext}
          />
        )}
      </div>
    </div>
  )
}

export default MyApprovedDonationsPage 