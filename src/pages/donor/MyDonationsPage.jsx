import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { motion } from 'framer-motion'
import { Link, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { 
  Package, 
  Plus, 
  Filter, 
  Search, 
  Eye, 
  Edit, 
  Trash2,
  MapPin,
  Calendar,
  Clock,
  AlertCircle,
  CheckCircle,
  XCircle,
  MoreHorizontal,
  TrendingUp,
  Users,
  Gift,
  Activity,
  X,
  Bell,
  User,
  Phone,
  Truck,
  Award,
  Heart,
  RefreshCw,
  Upload,
  Building,
  Flag,
  Tag
} from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import { useToast } from '../../contexts/ToastContext'
import { db, supabase } from '../../lib/supabase'
import { ListPageSkeleton } from '../../components/ui/Skeleton'
import LoadingSpinner from '../../components/ui/LoadingSpinner'
import ConfirmationModal from '../../components/ui/ConfirmationModal'
import DonorRecipientTrackingModal from '../../components/ui/DonorRecipientTrackingModal'
import ReportUserModal from '../../components/ui/ReportUserModal'

const MyDonationsPage = () => {
  const { user } = useAuth()
  const { success, error } = useToast()
  const navigate = useNavigate()
  const [donations, setDonations] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [deletingId, setDeletingId] = useState(null)
  const [selectedDonation, setSelectedDonation] = useState(null)
  const [trackingDelivery, setTrackingDelivery] = useState(null)
  const [showTrackingModal, setShowTrackingModal] = useState(false)
  const [showViewModal, setShowViewModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false)
  const [donationToDelete, setDonationToDelete] = useState(null)
  
  // Delivery confirmation states for final donor confirmation
  const [deliveryConfirmationNotifications, setDeliveryConfirmationNotifications] = useState([])
  const [confirmingDeliveryId, setConfirmingDeliveryId] = useState(null)
  
  // Pickup confirmation states for self-pickup donations
  const [pickupNotifications, setPickupNotifications] = useState([])
  const [pickupConfirmationNotifications, setPickupConfirmationNotifications] = useState([])
  const [confirmingPickupId, setConfirmingPickupId] = useState(null)

  // Direct delivery confirmation states
  const [directDeliveryNotifications, setDirectDeliveryNotifications] = useState([])
  const [directDeliveryConfirmationNotifications, setDirectDeliveryConfirmationNotifications] = useState([])
  const [confirmingDirectDeliveryId, setConfirmingDirectDeliveryId] = useState(null)
  
  // Report user states
  const [showReportModal, setShowReportModal] = useState(false)
  const [reportUser, setReportUser] = useState(null)
  const [reportTransactionContext, setReportTransactionContext] = useState(null)
  const [donationClaims, setDonationClaims] = useState({}) // Store claims for completed donations

  // Image upload state
  const [uploadedImage, setUploadedImage] = useState(null)
  const [imagePreview, setImagePreview] = useState(null)

  const statusOptions = [
    { value: 'all', label: 'All Status' },
    { value: 'available', label: 'Available' },
    { value: 'matched', label: 'Matched' },
    { value: 'donated', label: 'Donated' },
    { value: 'claimed', label: 'Claimed' },
    { value: 'in_transit', label: 'In Transit' },
    { value: 'delivered', label: 'Delivered' },
    { value: 'completed', label: 'Completed' },
    { value: 'cancelled', label: 'Cancelled' },
    { value: 'expired', label: 'Expired' }
  ]

  const categories = [
    'All Categories',
    'Food & Beverages',
    'Clothing & Accessories',
    'Medical Supplies',
    'Educational Materials',
    'Household Items',
    'Electronics & Technology',
    'Toys & Recreation',
    'Personal Care Items',
    'Emergency Supplies',
    'Other'
  ]

  const donationCategories = [
    'Food & Beverages',
    'Clothing & Accessories',
    'Medical Supplies',
    'Educational Materials',
    'Household Items',
    'Electronics & Technology',
    'Toys & Recreation',
    'Personal Care Items',
    'Emergency Supplies',
    'Other'
  ]

  const conditions = [
    { value: 'new', label: 'New' },
    { value: 'like_new', label: 'Like New' },
    { value: 'good', label: 'Good' },
    { value: 'fair', label: 'Fair' }
  ]

  // Form setup for editing donations
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isDirty }
  } = useForm()

  const fetchDonationClaims = async (donationsList) => {
    try {
      // Get all completed donations
      const completedDonations = donationsList.filter(d => d.status === 'completed')
      
      if (completedDonations.length === 0) {
        setDonationClaims({})
        return
      }

      // Fetch claims for completed donations
      const donationIds = completedDonations.map(d => d.id)
      if (donationIds.length === 0) {
        setDonationClaims({})
        return
      }

      // First, get all claims
      const { data: claims, error: claimsError } = await supabase
        .from('donation_claims')
        .select('*')
        .in('donation_id', donationIds)
        .eq('status', 'completed')

      if (claimsError) throw claimsError
      if (!claims || claims.length === 0) {
        setDonationClaims({})
        return
      }

      // Get all user IDs (recipients)
      const recipientIds = claims.map(c => c.recipient_id).filter(Boolean)
      
      // Get all delivery IDs
      const claimIds = claims.map(c => c.id)
      
      // Fetch recipients
      const { data: recipients } = await supabase
        .from('users')
        .select('id, name, email, role')
        .in('id', recipientIds)

      // Fetch deliveries
      const { data: deliveries } = await supabase
        .from('deliveries')
        .select('id, claim_id, volunteer_id')
        .in('claim_id', claimIds)

      // Get volunteer IDs
      const volunteerIds = deliveries?.map(d => d.volunteer_id).filter(Boolean) || []
      
      // Fetch volunteers
      const { data: volunteers } = volunteerIds.length > 0 ? await supabase
        .from('users')
        .select('id, name, email, role')
        .in('id', volunteerIds) : { data: [] }

      // Create maps for quick lookup
      const recipientsMap = new Map()
      recipients?.forEach(r => recipientsMap.set(r.id, r))

      const volunteersMap = new Map()
      volunteers?.forEach(v => volunteersMap.set(v.id, v))

      const deliveriesMap = new Map()
      deliveries?.forEach(d => {
        if (!deliveriesMap.has(d.claim_id)) {
          deliveriesMap.set(d.claim_id, [])
        }
        deliveriesMap.get(d.claim_id).push({
          ...d,
          volunteer: volunteersMap.get(d.volunteer_id) || null
        })
      })

      // Organize claims by donation_id with enriched data
      const claimsByDonation = {}
      claims.forEach(claim => {
        if (!claimsByDonation[claim.donation_id]) {
          claimsByDonation[claim.donation_id] = []
        }
        claimsByDonation[claim.donation_id].push({
          ...claim,
          recipient: recipientsMap.get(claim.recipient_id) || null,
          delivery: deliveriesMap.get(claim.id) || []
        })
      })

      setDonationClaims(claimsByDonation)
    } catch (err) {
      console.error('Error fetching donation claims:', err)
    }
  }

  const fetchDonationRequests = useCallback(async () => {
    if (!user?.id) return

    try {
      // Get notifications for confirmation requests only
      const notifications = await db.getUserNotifications(user.id, 100)
      
      // Filter final confirmation requests (after recipients have confirmed)
      const deliveryConfirmationNotifications = notifications.filter(n => 
        n.type === 'delivery_completed' && 
        n.data?.action_required === 'donor_final_confirmation' && 
        !n.read_at
      )
      
      // Filter pickup notifications (for self-pickup donations)
      const pickupNotifications = notifications.filter(n => 
        n.type === 'system_alert' &&
        (n.data?.notification_type === 'pickup_scheduled' || n.data?.notification_type === 'pickup_update') && 
        !n.read_at
      )
      
      // Filter pickup confirmation requests (for self-pickup completions)
      const pickupConfirmationNotifications = notifications.filter(n => 
        n.type === 'system_alert' &&
        n.data?.notification_type === 'pickup_completed' && 
        n.data?.action_required === 'confirm_pickup' &&
        n.data?.role === 'donor' &&
        !n.read_at
      )

      // Filter direct delivery notifications
      const directDeliveryNotifications = notifications.filter(n => 
        n.type === 'system_alert' &&
        (n.data?.notification_type === 'direct_delivery_request' || n.data?.notification_type === 'direct_delivery_update') && 
        !n.read_at
      )

      // Filter direct delivery confirmation requests
      const directDeliveryConfirmationNotifications = notifications.filter(n => 
        n.type === 'system_alert' &&
        n.data?.notification_type === 'direct_delivery_completed' && 
        n.data?.action_required === 'confirm_direct_delivery' &&
        n.data?.role === 'donor' &&
        !n.read_at
      )
      
      setDeliveryConfirmationNotifications(deliveryConfirmationNotifications)
      setPickupNotifications(pickupNotifications)
      setPickupConfirmationNotifications(pickupConfirmationNotifications)
      setDirectDeliveryNotifications(directDeliveryNotifications)
      setDirectDeliveryConfirmationNotifications(directDeliveryConfirmationNotifications)
    } catch (err) {
      console.error('Error fetching donation requests:', err)
    }
  }, [user?.id])

  const fetchDonations = useCallback(async () => {
    if (!user?.id) {
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      // Load donations with reduced limit for faster initial load
      // Load only 30 donations initially for better performance
      const data = await db.getDonations({ donor_id: user.id, limit: 30 })
      
      // Log donation statuses for debugging
      console.log('📊 Fetched donations with statuses:', data?.map(d => ({ 
        id: d.id, 
        title: d.title, 
        status: d.status 
      })))
      
      const donationsData = data || []
      setDonations(donationsData)
      
      // Fetch donation requests and claims in background (non-blocking) after donations are loaded
      // This improves perceived performance by showing donations immediately
      // Fetch donation requests for each donation (don't await to avoid blocking)
      fetchDonationRequests().catch(err => {
        console.error('Error fetching donation requests:', err)
      })
      
      // Fetch claims for completed donations (don't await to avoid blocking)
      fetchDonationClaims(donationsData).catch(err => {
        console.error('Error fetching donation claims:', err)
      })
    } catch (err) {
      console.error('Error fetching donations:', err)
      error('Failed to load donations')
    } finally {
      setLoading(false)
    }
  }, [user?.id, error, fetchDonationRequests])

  const handleViewDonation = async (donation) => {
    setSelectedDonation(donation)
    setShowViewModal(true)
    
    // If it's a completed donation and we don't have claims yet, fetch them
    if (donation.status === 'completed' && !donationClaims[donation.id]) {
      await fetchDonationClaims([donation])
    }
  }

  const handleImageUpload = (event) => {
    const file = event.target.files[0]
    if (!file) return

    if (file.size > 5 * 1024 * 1024) { // 5MB limit
      error('Image must be less than 5MB')
      return
    }

    const reader = new FileReader()
    reader.onload = (e) => {
      setImagePreview(e.target.result)
      setUploadedImage(file)
    }
    reader.readAsDataURL(file)
  }

  const removeUploadedImage = () => {
    setImagePreview(null)
    setUploadedImage(null)
  }

  const handleEditDonation = (donation) => {
    if (donation.status !== 'available') {
      error('Only available donations can be edited')
      return
    }
    
    setSelectedDonation(donation)
    setImagePreview(donation.images && donation.images.length > 0 ? donation.images[0] : null)
    setUploadedImage(null)
    
    // Populate form with existing donation data
    reset({
      title: donation.title,
      description: donation.description,
      category: donation.category,
      quantity: donation.quantity,
      condition: donation.condition,
      pickup_location: donation.pickup_location,
      pickup_instructions: donation.pickup_instructions || '',
      expiry_date: donation.expiry_date ? new Date(donation.expiry_date).toISOString().split('T')[0] : '',
      tags: donation.tags ? donation.tags.join(', ') : '',
      is_urgent: donation.is_urgent || false,
      delivery_mode: donation.delivery_mode || 'pickup'
    })
    setShowEditModal(true)
  }

  const handleEditSubmit = async (data) => {
    if (!selectedDonation) return

    try {
      setEditingId(selectedDonation.id)
      
      const updateData = {
        ...data,
        quantity: parseInt(data.quantity),
        expiry_date: data.expiry_date || null,
        tags: data.tags ? data.tags.split(',').map(tag => tag.trim()).filter(tag => tag) : []
      }

      // Add image if uploaded or changed
      if (uploadedImage) {
        updateData.images = [imagePreview]
      } else if (imagePreview === null && selectedDonation.images && selectedDonation.images.length > 0) {
        // Image was removed
        updateData.images = []
      }

      await db.updateDonation(selectedDonation.id, updateData, user.id)
      success('Donation updated successfully!')
      setShowEditModal(false)
      setSelectedDonation(null)
      setImagePreview(null)
      setUploadedImage(null)
      await fetchDonations() // Refresh the list
    } catch (err) {
      console.error('Error updating donation:', err)
      error(err.message || 'Failed to update donation. Please try again.')
    } finally {
      setEditingId(null)
    }
  }

  const handleDeleteDonation = async (donationId) => {
    setDonationToDelete(donationId)
    setShowDeleteConfirmation(true)
  }

  const confirmDeleteDonation = async () => {
    if (!donationToDelete) return

    try {
      setDeletingId(donationToDelete)
      // Add delete functionality to supabase.js if not exists
      await db.deleteDonation(donationToDelete, user.id)
      success('Donation deleted successfully!')
      await fetchDonations() // Refresh the list
      setShowDeleteConfirmation(false)
      setDonationToDelete(null)
    } catch (err) {
      console.error('Error deleting donation:', err)
      error(err.message || 'Failed to delete donation. Please try again.')
    } finally {
      setDeletingId(null)
    }
  }


  const handleFinalConfirmation = async (notification) => {
    try {
      setConfirmingDeliveryId(notification.data.delivery_id)
      
      // Complete the transaction
      await db.confirmDonorDelivery(
        notification.data.delivery_id,
        user.id,
        true
      )
      
      success('Transaction completed successfully!')
      
      // Refresh data
      await fetchDonationRequests()
      await fetchDonations()
    } catch (err) {
      console.error('Error completing transaction:', err)
      error('Failed to complete transaction. Please try again.')
    } finally {
      setConfirmingDeliveryId(null)
    }
  }

  const handlePickupConfirmation = async (notification) => {
    try {
      setConfirmingPickupId(notification.data.claim_id)
      
      // Complete the pickup transaction
      await db.confirmPickupCompletion(
        notification.data.claim_id,
        user.id,
        true
      )
      
      success('Pickup transaction completed successfully!')
      
      // Refresh data
      await fetchDonationRequests()
      await fetchDonations()
    } catch (err) {
      console.error('Error completing pickup transaction:', err)
      error('Failed to complete pickup transaction. Please try again.')
    } finally {
      setConfirmingPickupId(null)
    }
  }

  const handleDirectDeliveryConfirmation = async (notification) => {
    try {
      setConfirmingDirectDeliveryId(notification.data.claim_id)
      
      // Complete the direct delivery transaction
      await db.confirmDirectDeliveryCompletion(
        notification.data.claim_id,
        user.id,
        true
      )
      
      success('Direct delivery transaction completed successfully!')
      
      // Refresh data
      await fetchDonationRequests()
      await fetchDonations()
    } catch (err) {
      console.error('Error completing direct delivery transaction:', err)
      error('Failed to complete direct delivery transaction. Please try again.')
    } finally {
      setConfirmingDirectDeliveryId(null)
    }
  }

  useEffect(() => {
    fetchDonations()

    // Set up real-time subscriptions for automatic updates
    let donationsSubscription
    let notificationsSubscription

    if (supabase && user?.id) {
      // Subscribe to changes in donations table for current user
      donationsSubscription = supabase
        .channel('donations_changes')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'donations',
            filter: `donor_id=eq.${user.id}`
          },
          (payload) => {
            console.log('📦 Donation change detected:', payload)
            // Refresh donations when any change occurs
            fetchDonations()
          }
        )
        .subscribe()

      // Subscribe to notifications for delivery confirmations and requests
      notificationsSubscription = supabase
        .channel('notifications_changes')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'notifications',
            filter: `user_id=eq.${user.id}`
          },
          (payload) => {
            console.log('🔔 Notification change detected:', payload)
            // Refresh requests when notifications change
            fetchDonationRequests()
          }
        )
        .subscribe()
    }

    // Cleanup subscriptions
    return () => {
      if (donationsSubscription) {
        supabase.removeChannel(donationsSubscription)
      }
      if (notificationsSubscription) {
        supabase.removeChannel(notificationsSubscription)
      }
    }
  }, [fetchDonations, fetchDonationRequests, user?.id])

  // Memoize filtered donations to avoid recalculating on every render
  const filteredDonations = useMemo(() => {
    return donations.filter(donation => {
      const matchesSearch = !searchTerm || 
        donation.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        donation.description?.toLowerCase().includes(searchTerm.toLowerCase())
      const matchesStatus = statusFilter === 'all' || donation.status === statusFilter
      const matchesCategory = categoryFilter === 'All Categories' || 
                             categoryFilter === 'all' || 
                             donation.category === categoryFilter
      
      return matchesSearch && matchesStatus && matchesCategory
    })
  }, [donations, searchTerm, statusFilter, categoryFilter])

  const getStatusColor = (status, donation) => {
    // Regular donations color mapping
    const colors = {
      available: 'bg-success-900/70 text-white',
      matched: 'bg-yellow-900/70 text-white',
      donated: 'bg-blue-900/70 text-white',
      claimed: 'bg-amber-900/70 text-white',
      in_transit: 'bg-purple-900/70 text-white',
      delivered: 'bg-emerald-900/70 text-white',
      completed: 'bg-green-500/70 text-white border border-green-500/50',
      cancelled: 'bg-danger-900/70 text-white',
      expired: 'bg-gray-900/70 text-white'
    }
    
    // Special handling for direct donations
    if (donation?.donation_destination === 'organization') {
      const directStatusColors = {
        available: donation?.delivery_mode === 'donor_delivery' ? 'bg-blue-900/70 text-white' :
                    donation?.delivery_mode === 'organization_pickup' ? 'bg-purple-900/70 text-white' :
                    'bg-yellow-900/70 text-white', // volunteer delivery waiting
        delivered: 'bg-green-900/70 text-white',
        claimed: 'bg-emerald-900/70 text-white'
      }
      return directStatusColors[status] || colors[status] || 'bg-gray-900/70 text-white'
    }
    
    return colors[status] || 'bg-gray-900/70 text-white'
  }

  const getStatusIcon = (status) => {
    const icons = {
      available: CheckCircle,
      matched: Users,
      donated: Gift,
      claimed: Package,
      in_transit: Activity,
      delivered: CheckCircle,
      completed: Award, // More celebratory icon for completed
      cancelled: XCircle,
      expired: Clock
    }
    const Icon = icons[status] || Package
    return <Icon className="h-3 w-3" />
  }

  const stats = {
    total: donations.length,
    available: donations.filter(d => d.status === 'available').length,
    claimed: donations.filter(d => ['claimed', 'in_transit'].includes(d.status)).length,
    completed: donations.filter(d => ['delivered', 'completed'].includes(d.status)).length
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
                <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-white">My Donations</h1>
                <p className="text-xs sm:text-sm text-yellow-200">Manage and track your donations</p>
              </div>
            </div>
            <div className="flex items-center gap-2 sm:gap-3">
              <Link
                to="/post-donation"
                className="btn btn-primary flex items-center justify-center text-xs sm:text-sm px-3 sm:px-4 py-2 whitespace-nowrap flex-1 sm:flex-initial active:scale-95"
              >
                <Plus className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1.5 sm:mr-2" />
                <span>Post Donation</span>
              </Link>
              <button
                onClick={() => fetchDonations()}
                disabled={loading}
                className="btn btn-secondary flex items-center justify-center text-xs sm:text-sm px-3 sm:px-4 py-2 flex-1 sm:flex-initial active:scale-95"
                title="Refresh donations"
              >
                <RefreshCw className={`h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1.5 sm:mr-2 ${loading ? 'animate-spin' : ''}`} />
                <span>Refresh</span>
              </button>
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
                <p className="text-xs text-yellow-400 mb-0.5">Total</p>
                <p className="text-2xl sm:text-3xl font-bold text-white">{stats.total}</p>
              </div>
              <div className="flex flex-col items-center gap-0.5">
                <Gift className="h-5 w-5 sm:h-6 sm:w-6 lg:h-7 lg:w-7 text-yellow-500" />
                <span className="text-[10px] sm:hidden text-yellow-400 font-medium">Gifts</span>
              </div>
            </div>
          </div>
          
          <div className="card p-2.5 sm:p-4 lg:p-6 border border-gray-600" style={{backgroundColor: '#001a5c'}}>
            <div className="flex items-center justify-between gap-2">
              <div className="flex-1 min-w-0">
                <p className="text-xs text-yellow-400 mb-0.5">Available</p>
                <p className="text-2xl sm:text-3xl font-bold text-white">{stats.available}</p>
              </div>
              <div className="flex flex-col items-center gap-0.5">
                <CheckCircle className="h-5 w-5 sm:h-6 sm:w-6 lg:h-7 lg:w-7 text-success-500" />
                <span className="text-[10px] sm:hidden text-success-400 font-medium">Ready</span>
              </div>
            </div>
          </div>
          
          <div className="card p-2.5 sm:p-4 lg:p-6 border border-gray-600" style={{backgroundColor: '#001a5c'}}>
            <div className="flex items-center justify-between gap-2">
              <div className="flex-1 min-w-0">
                <p className="text-xs text-yellow-400 mb-0.5">In Progress</p>
                <p className="text-2xl sm:text-3xl font-bold text-white">{stats.claimed}</p>
              </div>
              <div className="flex flex-col items-center gap-0.5">
                <Activity className="h-5 w-5 sm:h-6 sm:w-6 lg:h-7 lg:w-7 text-amber-500" />
                <span className="text-[10px] sm:hidden text-amber-400 font-medium">Active</span>
              </div>
            </div>
          </div>
          
          <div className="card p-2.5 sm:p-4 lg:p-6 relative overflow-hidden">
            <div className="flex items-center justify-between gap-2">
              <div className="flex-1 min-w-0">
                <p className="text-xs text-yellow-400 mb-0.5">Completed</p>
                <p className="text-2xl sm:text-3xl font-bold text-white">{stats.completed}</p>
                {stats.completed > 0 && (
                  <p className="text-[10px] text-green-400 mt-0.5">🎉 Impact!</p>
                )}
              </div>
              <div className="flex flex-col items-center gap-0.5">
                <Award className="h-5 w-5 sm:h-6 sm:w-6 lg:h-7 lg:w-7 text-emerald-500" />
                <span className="text-[10px] sm:hidden text-emerald-400 font-medium">Done</span>
              </div>
            </div>
            {stats.completed > 0 && (
              <div className="absolute inset-0 bg-gradient-to-r from-green-500/5 to-emerald-500/5 pointer-events-none"></div>
            )}
          </div>
        </motion.div>

        {/* Final Confirmation Requests */}
        {deliveryConfirmationNotifications.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="card p-6 mb-8 border border-navy-700 border-l-4 border-l-emerald-500"
            style={{backgroundColor: '#001a5c'}}
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-emerald-500/10 rounded-lg">
                  <CheckCircle className="h-6 w-6 text-emerald-500" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-white">Complete Transactions</h3>
                  <p className="text-yellow-300 text-sm">Recipients have confirmed receipt - mark as complete</p>
                </div>
              </div>
              <span className="bg-emerald-500/20 text-emerald-400 px-3 py-1 rounded-full text-sm font-medium">
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
                    <CheckCircle className="h-5 w-5 text-emerald-500" />
                    <div>
                      <p className="text-white font-medium">{notification.title}</p>
                      <p className="text-yellow-300 text-sm">{notification.message}</p>
                      <p className="text-yellow-400 text-xs mt-1">
                        Recipient has confirmed receipt
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => handleFinalConfirmation(notification)}
                    disabled={confirmingDeliveryId === notification.data.delivery_id}
                    className="btn btn-success text-sm px-4 py-2 flex items-center"
                  >
                    {confirmingDeliveryId === notification.data.delivery_id ? (
                      <LoadingSpinner size="sm" />
                    ) : (
                      <>
                        <Award className="h-4 w-4 mr-2" />
                        Mark Complete
                      </>
                    )}
                  </button>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* Pickup Notifications */}
        {pickupNotifications.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.17 }}
            className="card p-6 mb-8 border border-navy-700 border-l-4 border-l-blue-500"
            style={{backgroundColor: '#001a5c'}}
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-500/10 rounded-lg">
                  <MapPin className="h-6 w-6 text-blue-500" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-white">Pickup Notifications</h3>
                  <p className="text-yellow-300 text-sm">Self-pickup donation updates</p>
                </div>
              </div>
              <span className="bg-blue-500/20 text-blue-400 px-3 py-1 rounded-full text-sm font-medium">
                {pickupNotifications.length} updates
              </span>
            </div>
            
            <div className="space-y-3">
              {pickupNotifications.map((notification) => (
                <div
                  key={notification.id}
                  className="bg-navy-800/50 rounded-lg p-4 flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    <MapPin className="h-5 w-5 text-blue-500" />
                    <div>
                      <p className="text-white font-medium">{notification.title}</p>
                      <p className="text-yellow-300 text-sm">{notification.message}</p>
                      <p className="text-yellow-400 text-xs mt-1">
                        {notification.data?.pickup_location && `Location: ${notification.data.pickup_location}`}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={async () => {
                      await db.markNotificationAsRead(notification.id)
                      await fetchDonationRequests()
                    }}
                    className="btn btn-secondary text-sm px-4 py-2"
                  >
                    Mark Read
                  </button>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* Pickup Confirmation Requests */}
        {pickupConfirmationNotifications.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.19 }}
            className="card p-6 mb-8 border border-navy-700 border-l-4 border-l-purple-500"
            style={{backgroundColor: '#001a5c'}}
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-500/10 rounded-lg">
                  <CheckCircle className="h-6 w-6 text-purple-500" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-white">Confirm Pickup Completions</h3>
                  <p className="text-yellow-300 text-sm">Self-pickup donations ready for final confirmation</p>
                </div>
              </div>
              <span className="bg-purple-500/20 text-purple-400 px-3 py-1 rounded-full text-sm font-medium">
                {pickupConfirmationNotifications.length} pending
              </span>
            </div>
            
            <div className="space-y-3">
              {pickupConfirmationNotifications.map((notification) => (
                <div
                  key={notification.id}
                  className="bg-navy-800/50 rounded-lg p-4 flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    <CheckCircle className="h-5 w-5 text-purple-500" />
                    <div>
                      <p className="text-white font-medium">{notification.title}</p>
                      <p className="text-yellow-300 text-sm">{notification.message}</p>
                      <p className="text-yellow-400 text-xs mt-1">
                        Completed by: {notification.data?.completed_by_name}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => handlePickupConfirmation(notification)}
                    disabled={confirmingPickupId === notification.data.claim_id}
                    className="btn btn-success text-sm px-4 py-2 flex items-center"
                  >
                    {confirmingPickupId === notification.data.claim_id ? (
                      <LoadingSpinner size="sm" />
                    ) : (
                      <>
                        <Award className="h-4 w-4 mr-2" />
                        Confirm Pickup
                      </>
                    )}
                  </button>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* Direct Delivery Notifications */}
        {directDeliveryNotifications.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.21 }}
            className="card p-6 mb-8 border border-navy-700 border-l-4 border-l-orange-500"
            style={{backgroundColor: '#001a5c'}}
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-orange-500/10 rounded-lg">
                  <Truck className="h-6 w-6 text-orange-500" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-white">Direct Delivery Updates</h3>
                  <p className="text-yellow-300 text-sm">Direct delivery coordination and updates</p>
                </div>
              </div>
              <span className="bg-orange-500/20 text-orange-400 px-3 py-1 rounded-full text-sm font-medium">
                {directDeliveryNotifications.length} updates
              </span>
            </div>
            
            <div className="space-y-3">
              {directDeliveryNotifications.map((notification) => (
                <div
                  key={notification.id}
                  className="bg-navy-800/50 rounded-lg p-4 flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    <Truck className="h-5 w-5 text-orange-500" />
                    <div>
                      <p className="text-white font-medium">{notification.title}</p>
                      <p className="text-yellow-300 text-sm">{notification.message}</p>
                      <p className="text-yellow-400 text-xs mt-1">
                        {notification.data?.delivery_address && `Address: ${notification.data.delivery_address}`}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={async () => {
                      await db.markNotificationAsRead(notification.id)
                      await fetchDonationRequests()
                    }}
                    className="btn btn-secondary text-sm px-4 py-2"
                  >
                    Mark Read
                  </button>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* Direct Delivery Confirmation Requests */}
        {directDeliveryConfirmationNotifications.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.23 }}
            className="card p-6 mb-8 border border-navy-700 border-l-4 border-l-indigo-500"
            style={{backgroundColor: '#001a5c'}}
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-indigo-500/10 rounded-lg">
                  <CheckCircle className="h-6 w-6 text-indigo-500" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-white">Confirm Direct Delivery Completions</h3>
                  <p className="text-yellow-300 text-sm">Direct deliveries ready for final confirmation</p>
                </div>
              </div>
              <span className="bg-indigo-500/20 text-indigo-400 px-3 py-1 rounded-full text-sm font-medium">
                {directDeliveryConfirmationNotifications.length} pending
              </span>
            </div>
            
            <div className="space-y-3">
              {directDeliveryConfirmationNotifications.map((notification) => (
                <div
                  key={notification.id}
                  className="bg-navy-800/50 rounded-lg p-4 flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    <CheckCircle className="h-5 w-5 text-indigo-500" />
                    <div>
                      <p className="text-white font-medium">{notification.title}</p>
                      <p className="text-yellow-300 text-sm">{notification.message}</p>
                      <p className="text-yellow-400 text-xs mt-1">
                        Delivered to recipient
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => handleDirectDeliveryConfirmation(notification)}
                    disabled={confirmingDirectDeliveryId === notification.data.claim_id}
                    className="btn btn-success text-sm px-4 py-2 flex items-center"
                  >
                    {confirmingDirectDeliveryId === notification.data.claim_id ? (
                      <LoadingSpinner size="sm" />
                    ) : (
                      <>
                        <Award className="h-4 w-4 mr-2" />
                        Confirm Delivery
                      </>
                    )}
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
          className="card p-4 sm:p-6 mb-6 sm:mb-8 border-2 border-yellow-500/20"
        >
          {/* Filter Header */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Filter className="h-5 w-5 text-yellow-400" />
              <h3 className="text-base sm:text-lg font-semibold text-white">Filter Donations</h3>
            </div>
            {(searchTerm || statusFilter !== 'all' || categoryFilter !== 'all') && (
              <span className="text-xs sm:text-sm text-yellow-300 bg-yellow-900/20 px-2 sm:px-3 py-1 rounded-full">
                {filteredDonations.length} result{filteredDonations.length !== 1 ? 's' : ''}
              </span>
            )}
          </div>

          <div className="flex flex-col sm:flex-row flex-wrap gap-3 sm:gap-4">
            {/* Search Input */}
            <div className="relative flex-1 min-w-full sm:min-w-[200px]">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 sm:h-5 sm:w-5 text-yellow-400" />
              <input
                type="text"
                placeholder="Search by title or description..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 sm:pl-10 pr-4 py-2.5 sm:py-3 text-sm sm:text-base bg-navy-800 border-2 border-navy-700 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-yellow-500 focus:ring-2 focus:ring-yellow-500/20 transition-all duration-200 hover:border-yellow-600/50"
              />
            </div>
            
            {/* Status Filter */}
            <div className="relative w-full sm:w-auto sm:min-w-[180px]">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="appearance-none w-full px-4 sm:px-5 py-2.5 sm:py-3 pr-10 text-sm sm:text-base bg-navy-800 border-2 border-navy-700 rounded-lg text-white font-medium focus:outline-none focus:border-yellow-500 focus:ring-2 focus:ring-yellow-500/20 transition-all duration-200 cursor-pointer hover:border-yellow-600/50"
              >
                {statusOptions.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              <Filter className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-yellow-400 pointer-events-none" />
            </div>
            
            {/* Category Filter */}
            <div className="relative w-full sm:w-auto sm:min-w-[180px]">
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="appearance-none w-full px-4 sm:px-5 py-2.5 sm:py-3 pr-10 text-sm sm:text-base bg-navy-800 border-2 border-navy-700 rounded-lg text-white font-medium focus:outline-none focus:border-yellow-500 focus:ring-2 focus:ring-yellow-500/20 transition-all duration-200 cursor-pointer hover:border-yellow-600/50"
              >
                {categories.map(category => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
              <Package className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-yellow-400 pointer-events-none" />
            </div>
            
            {/* Clear Button */}
            <button
              onClick={() => {
                setSearchTerm('')
                setStatusFilter('all')
                setCategoryFilter('all')
              }}
              disabled={!searchTerm && statusFilter === 'all' && categoryFilter === 'all'}
              className={`w-full sm:w-auto px-4 sm:px-5 py-2.5 sm:py-3 rounded-lg text-sm sm:text-base font-semibold transition-all duration-200 flex items-center justify-center gap-2 whitespace-nowrap border-2 ${
                searchTerm || statusFilter !== 'all' || categoryFilter !== 'all'
                  ? 'bg-gradient-to-r from-yellow-500 to-yellow-600 hover:from-yellow-600 hover:to-yellow-700 text-white border-yellow-500 hover:border-yellow-600 shadow-md hover:shadow-lg active:scale-95'
                  : 'bg-navy-800 text-gray-500 border-navy-700 cursor-not-allowed opacity-50'
              }`}
            >
              <X className="h-4 w-4" />
              Clear Filters
            </button>
          </div>
        </motion.div>

        {/* Donations List */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          {filteredDonations.length === 0 ? (
            <div className="card p-12 text-center">
              <Package className="h-16 w-16 text-yellow-600 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-white mb-2">No donations found</h3>
              <p className="text-yellow-300 mb-6">
                {donations.length === 0 
                  ? "You haven't posted any donations yet. Start sharing your generosity!"
                  : "No donations match your current filters."
                }
              </p>
              {donations.length === 0 && (
                <Link to="/post-donation" className="btn btn-primary inline-flex items-center justify-center whitespace-nowrap">
                  <Plus className="h-4 w-4 mr-2 flex-shrink-0" />
                  Post Your First Donation
                </Link>
              )}
            </div>
          ) : (
            <div className="space-y-6">
              {filteredDonations.map((donation, index) => (
                <motion.div
                  key={donation.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="card hover:shadow-xl transition-all duration-300 overflow-hidden border-l-4 sm:border-l-4"
                  style={{
                    borderLeftColor: donation.status === 'completed' ? '#4ade80' : 
                                    donation.status === 'delivered' ? '#10b981' : 
                                    donation.status === 'in_transit' ? '#fb923c' : 
                                    donation.status === 'claimed' ? '#a78bfa' : 
                                    donation.status === 'matched' ? '#fbbf24' : 
                                    donation.status === 'donated' ? '#3b82f6' : '#60a5fa'
                  }}
                >
                  <div className="p-4 sm:p-6">
                    <div className="flex flex-col sm:flex-row gap-4 sm:gap-6">
                      {/* Donation Image */}
                      <div className="flex-shrink-0">
                        {donation.images && donation.images.length > 0 ? (
                          <div className="relative w-full sm:w-48 lg:w-56 h-40 sm:h-48 rounded-lg overflow-hidden border-2 border-yellow-500/30 shadow-lg">
                            <img 
                              src={donation.images[0]} 
                              alt={donation.title}
                              className="w-full h-full object-cover"
                            />
                            {/* Status Badge on Image */}
                            <div className="absolute top-2 right-2">
                              <span className={`px-2 py-0.5 sm:py-1 rounded-md text-[10px] sm:text-xs font-semibold backdrop-blur-md border-2 shadow-lg ${getStatusColor(donation.status, donation)}`}>
                                {donation.description?.includes('Donation for request:') && donation.status === 'claimed'
                                  ? 'SENT'
                                  : donation.status.replace('_', ' ').toUpperCase()}
                              </span>
                            </div>
                          </div>
                        ) : (
                          <div className="w-full sm:w-48 lg:w-56 h-40 sm:h-48 rounded-lg bg-gradient-to-br from-navy-800 to-navy-900 flex flex-col items-center justify-center border-2 border-navy-600 shadow-lg">
                            <Gift className="h-12 w-12 sm:h-16 sm:w-16 text-yellow-400 mb-2" />
                            <span className="text-[10px] sm:text-xs text-gray-400 font-medium uppercase tracking-wide">No Image</span>
                            <span className={`mt-2 px-2 py-0.5 sm:py-1 rounded-md text-[10px] sm:text-xs font-semibold ${getStatusColor(donation.status, donation)}`}>
                              {donation.status.replace('_', ' ').toUpperCase()}
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Donation Details */}
                      <div className="flex-1 space-y-2 sm:space-y-3">
                        {/* Header with Actions */}
                        <div className="flex flex-col sm:flex-row items-start justify-between gap-3 sm:gap-4">
                          <div className="flex-1 min-w-0">
                            <h3 className="text-base sm:text-lg lg:text-xl font-bold text-white mb-1.5 sm:mb-2">{donation.title}</h3>
                            <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 mb-2">
                              <span className="px-2 sm:px-3 py-0.5 sm:py-1 rounded-full text-[10px] sm:text-xs font-semibold bg-yellow-900/30 text-yellow-300 border border-yellow-500/30 whitespace-nowrap">
                                {donation.category}
                              </span>
                              {/* Requested Donation Badge */}
                              {donation.description?.includes('Donation for request:') && (
                                <span className="inline-flex items-center gap-1 px-2 sm:px-3 py-0.5 sm:py-1 rounded-full text-[10px] sm:text-xs font-semibold bg-purple-500/20 text-purple-400 border border-purple-500/30 whitespace-nowrap">
                                  <Heart className="h-3 w-3" />
                                  Requested
                                </span>
                              )}
                              {donation.donation_destination === 'organization' && (
                                <span className="inline-flex items-center gap-1 px-2 sm:px-3 py-0.5 sm:py-1 rounded-full text-[10px] sm:text-xs font-semibold bg-blue-500/20 text-blue-400 border border-blue-500/30 whitespace-nowrap">
                                  <Building className="h-3 w-3" />
                                  Direct
                                </span>
                              )}
                              {donation.is_urgent && (
                                <span className="px-2 sm:px-3 py-0.5 sm:py-1 rounded-full text-[10px] sm:text-xs font-semibold text-red-400 bg-red-500/20 border border-red-500/30 uppercase whitespace-nowrap">
                                  ⚡ URGENT
                                </span>
                              )}
                            </div>
                            <p className="text-gray-300 text-xs sm:text-sm line-clamp-2">
                              {donation.description?.startsWith('Donation for request:') 
                                ? 'Donation created to fulfill a recipient request' 
                                : donation.description || 'No description available'}
                            </p>
                          </div>
                          
                          {/* Action Buttons */}
                          <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
                            <button 
                              onClick={() => handleViewDonation(donation)}
                              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-navy-950 bg-yellow-400 hover:bg-yellow-500 rounded-lg transition-all active:scale-95"
                            >
                              <Eye className="h-3.5 w-3.5" />
                              <span>View</span>
                            </button>
                            <button 
                              onClick={() => handleEditDonation(donation)}
                              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-navy-700 hover:bg-navy-600 border border-yellow-500/30 rounded-lg transition-all active:scale-95"
                            >
                              <Edit className="h-3.5 w-3.5" />
                              <span>Edit</span>
                            </button>
                            <button 
                              onClick={() => handleDeleteDonation(donation.id)}
                              disabled={deletingId === donation.id}
                              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-danger-600 hover:bg-danger-700 rounded-lg transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              {deletingId === donation.id ? (
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
                        <div className="flex flex-wrap items-center gap-2 sm:gap-3 lg:gap-4 text-xs sm:text-sm text-yellow-300">
                          <div className="flex items-center gap-1 sm:gap-1.5">
                            <Package className="h-3 w-3 sm:h-4 sm:w-4 text-blue-400 flex-shrink-0" />
                            <span className="font-medium">Quantity:</span>
                            <span className="text-white">{donation.quantity}</span>
                          </div>
                          
                          <div className="flex items-center gap-1 sm:gap-1.5">
                            <MapPin className="h-3 w-3 sm:h-4 sm:w-4 text-green-400 flex-shrink-0" />
                            <span className="font-medium">Location:</span>
                            <span className="text-white truncate max-w-[150px] sm:max-w-none">{donation.pickup_location}</span>
                          </div>
                          
                          <div className="flex items-center gap-1 sm:gap-1.5">
                            <Calendar className="h-3 w-3 sm:h-4 sm:w-4 text-purple-400 flex-shrink-0" />
                            <span className="font-medium">Posted:</span>
                            <span className="text-white">{new Date(donation.created_at).toLocaleDateString()}</span>
                          </div>
                          
                          {donation.expiry_date && (
                            <div className="flex items-center gap-1 sm:gap-1.5">
                              <Clock className="h-3 w-3 sm:h-4 sm:w-4 text-orange-400 flex-shrink-0" />
                              <span className="font-medium">Expires:</span>
                              <span className="text-white">{new Date(donation.expiry_date).toLocaleDateString()}</span>
                            </div>
                          )}
                        </div>

                        {/* Tags */}
                        {donation.tags && donation.tags.length > 0 && (
                          <div className="flex flex-wrap gap-1">
                            {donation.tags.map((tag, tagIndex) => (
                              <span
                                key={tagIndex}
                                className="inline-flex items-center px-2 py-1 rounded text-xs bg-navy-700 text-yellow-300 border border-navy-600"
                              >
                                #{tag}
                              </span>
                            ))}
                          </div>
                        )}

                        {/* Status Badge and Impact */}
                        <div className="flex items-center gap-2">
                          {donation.status === 'completed' && (
                            <motion.div
                              initial={{ opacity: 0, scale: 0 }}
                              animate={{ opacity: 1, scale: 1 }}
                              transition={{ delay: 0.3, type: "spring", stiffness: 200 }}
                              className="flex items-center gap-1 px-3 py-1.5 bg-green-500/20 rounded-full border border-green-500/30"
                            >
                              <Heart className="h-4 w-4 text-green-400" />
                              <span className="text-sm text-green-400 font-medium">Impact Made!</span>
                            </motion.div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </motion.div>

        {/* View Donation Modal */}
        {showViewModal && selectedDonation && (
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
                    <Gift className="h-5 w-5 sm:h-6 sm:w-6 text-yellow-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-base sm:text-lg lg:text-xl font-bold text-white truncate">Donation Details</h3>
                    <p className="text-[10px] sm:text-xs text-yellow-300">Complete information</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowViewModal(false)}
                  className="text-gray-400 hover:text-white transition-colors p-1.5 sm:p-2 hover:bg-navy-800 rounded-lg flex-shrink-0"
                >
                  <X className="h-5 w-5 sm:h-6 sm:w-6" />
                </button>
              </div>

              {/* Content with Custom Scrollbar */}
              <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-3 sm:py-4 custom-scrollbar">
                <div className="space-y-4 sm:space-y-6">
                  {/* Donation Image */}
                  {selectedDonation.images && selectedDonation.images.length > 0 && (
                    <div className="relative rounded-lg overflow-hidden bg-navy-800">
                      <img
                        src={selectedDonation.images[0]}
                        alt={selectedDonation.title}
                        className="w-full h-48 sm:h-64 object-cover"
                      />
                      {selectedDonation.is_urgent && (
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
                      <h4 className="text-lg sm:text-xl lg:text-2xl font-bold text-white">{selectedDonation.title}</h4>
                      <span className="px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-full text-[10px] sm:text-xs font-semibold bg-yellow-900/30 text-yellow-300 border border-yellow-500/30 whitespace-nowrap">
                        {selectedDonation.category}
                      </span>
                    </div>
                    <p className="text-sm sm:text-base text-gray-300 leading-relaxed">{selectedDonation.description || 'No description provided'}</p>
                  </div>

                  {/* Details Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-navy-800/30 rounded-lg p-4 border border-navy-700">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Package className="h-4 w-4 text-blue-400" />
                          <label className="text-sm font-semibold text-yellow-300">Quantity Available</label>
                        </div>
                        <span className={`text-lg font-medium ${selectedDonation.quantity != null ? 'text-white' : 'text-gray-400 italic'}`}>
                          {selectedDonation.quantity != null ? selectedDonation.quantity : 'Not provided'}
                        </span>
                      </div>
                    </div>
                    
                    <div className="bg-navy-800/30 rounded-lg p-4 border border-navy-700">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <CheckCircle className="h-4 w-4 text-green-400" />
                          <label className="text-sm font-semibold text-yellow-300">Condition</label>
                        </div>
                        <span className={`text-lg font-medium ${selectedDonation.condition ? 'text-white capitalize' : 'text-gray-400 italic'}`}>
                          {selectedDonation.condition ? selectedDonation.condition.replace('_', ' ') : 'Not provided'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Location */}
                  <div className="bg-navy-800/30 rounded-lg p-4 border border-navy-700">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <MapPin className="h-4 w-4 text-purple-400" />
                        <label className="text-sm font-semibold text-yellow-300">Pickup Location</label>
                      </div>
                      <span className={`text-center max-w-[60%] break-words ${selectedDonation.pickup_location ? 'text-white' : 'text-gray-400 italic'}`}>
                        {selectedDonation.pickup_location || 'Not provided'}
                      </span>
                    </div>
                  </div>

                  <div className="bg-navy-800/30 rounded-lg p-4 border border-navy-700">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <AlertCircle className="h-4 w-4 text-orange-400" />
                        <label className="text-sm font-semibold text-yellow-300">Pickup Instructions</label>
                      </div>
                      <span className={`text-center max-w-[60%] break-words ${selectedDonation.pickup_instructions ? 'text-white' : 'text-gray-400 italic'}`}>
                        {selectedDonation.pickup_instructions || 'Not provided'}
                      </span>
                    </div>
                  </div>

                  {/* Delivery Mode and Posted Date */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-navy-800/30 rounded-lg p-4 border border-navy-700">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Package className="h-4 w-4 text-yellow-400" />
                          <label className="text-sm font-semibold text-yellow-300">Delivery Mode</label>
                        </div>
                        <span className={`text-lg font-medium ${selectedDonation.delivery_mode ? 'text-white' : 'text-gray-400 italic'}`}>
                          {selectedDonation.delivery_mode
                            ? (selectedDonation.delivery_mode === 'pickup' ? 'Self Pickup'
                              : selectedDonation.delivery_mode === 'volunteer' ? 'Volunteer Delivery'
                              : selectedDonation.delivery_mode === 'direct' ? 'Direct Delivery'
                              : selectedDonation.delivery_mode === 'donor_delivery' ? 'Donor Delivery'
                              : selectedDonation.delivery_mode === 'organization_pickup' ? 'Organization Pickup'
                              : selectedDonation.delivery_mode.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase()))
                            : 'Not provided'}
                        </span>
                      </div>
                    </div>

                    <div className="bg-navy-800/30 rounded-lg p-4 border border-navy-700">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-orange-400" />
                          <label className="text-sm font-semibold text-yellow-300">Posted Date</label>
                        </div>
                        <span className="text-white">
                          {selectedDonation.created_at
                            ? new Date(selectedDonation.created_at).toLocaleDateString('en-US', {
                                year: 'numeric',
                                month: 'short',
                                day: 'numeric'
                              })
                            : 'Not provided'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Expiry Date */}
                  <div className="bg-navy-800/30 rounded-lg p-4 border border-navy-700">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-red-400" />
                        <label className="text-sm font-semibold text-yellow-300">Expires On</label>
                      </div>
                      <span className={`text-lg font-medium ${selectedDonation.expiry_date ? 'text-white' : 'text-gray-400 italic'}`}>
                        {selectedDonation.expiry_date
                          ? new Date(selectedDonation.expiry_date).toLocaleDateString('en-US', {
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric'
                            })
                          : 'Not provided'}
                      </span>
                    </div>
                  </div>

                  {/* Tags */}
                  {selectedDonation.tags && selectedDonation.tags.length > 0 && (
                    <div className="bg-navy-800/30 rounded-lg p-4 border border-navy-700">
                      <label className="text-sm font-semibold text-yellow-300 mb-3 block">Tags</label>
                      <div className="flex flex-wrap gap-2">
                        {selectedDonation.tags.map((tag, tagIndex) => (
                          <span key={tagIndex} className="inline-flex items-center text-xs font-medium bg-navy-700 text-yellow-300 px-3 py-1.5 rounded-lg border border-yellow-500/30">
                            <Tag className="h-3 w-3 mr-1" />
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Completed Transaction Info with Report Options */}
                  {selectedDonation.status === 'completed' && donationClaims[selectedDonation.id] && donationClaims[selectedDonation.id].length > 0 && (
                    <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4">
                      <h4 className="text-sm font-semibold text-green-400 mb-3 flex items-center gap-2">
                        <Award className="h-4 w-4" />
                        Completed Transaction
                      </h4>
                      <div className="space-y-3">
                        {donationClaims[selectedDonation.id].map((claim, idx) => (
                          <div key={claim.id || idx} className="bg-navy-800/50 rounded-lg p-3 space-y-2">
                            {/* Recipient Info */}
                            {claim.recipient && claim.recipient.id !== user?.id && (
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <User className="h-4 w-4 text-blue-400" />
                                  <div>
                                    <p className="text-white text-sm font-medium">Recipient: {claim.recipient.name}</p>
                                    <p className="text-gray-400 text-xs">{claim.recipient.email}</p>
                                  </div>
                                </div>
                                <button
                                  onClick={() => {
                                    setReportUser({
                                      id: claim.recipient.id,
                                      name: claim.recipient.name,
                                      role: claim.recipient.role || 'recipient'
                                    })
                                    setReportTransactionContext({
                                      type: 'donation',
                                      id: selectedDonation.id,
                                      title: selectedDonation.title
                                    })
                                    setShowReportModal(true)
                                  }}
                                  className="px-3 py-1.5 text-xs bg-red-600/20 hover:bg-red-600/30 border border-red-500/50 text-red-400 rounded-lg transition-all flex items-center gap-1.5"
                                >
                                  <Flag className="h-3 w-3" />
                                  Report
                                </button>
                              </div>
                            )}
                            
                            {/* Volunteer Info */}
                            {claim.delivery?.[0]?.volunteer && claim.delivery[0].volunteer.id !== user?.id && (
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <Truck className="h-4 w-4 text-purple-400" />
                                  <div>
                                    <p className="text-white text-sm font-medium">Volunteer: {claim.delivery[0].volunteer.name}</p>
                                    <p className="text-gray-400 text-xs">{claim.delivery[0].volunteer.email}</p>
                                  </div>
                                </div>
                                <button
                                  onClick={() => {
                                    setReportUser({
                                      id: claim.delivery[0].volunteer.id,
                                      name: claim.delivery[0].volunteer.name,
                                      role: claim.delivery[0].volunteer.role || 'volunteer'
                                    })
                                    setReportTransactionContext({
                                      type: 'delivery',
                                      id: claim.delivery[0].id,
                                      title: selectedDonation.title
                                    })
                                    setShowReportModal(true)
                                  }}
                                  className="px-3 py-1.5 text-xs bg-red-600/20 hover:bg-red-600/30 border border-red-500/50 text-red-400 rounded-lg transition-all flex items-center gap-1.5"
                                >
                                  <Flag className="h-3 w-3" />
                                  Report
                                </button>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Footer */}
              <div className="p-4 sm:p-6 pt-3 sm:pt-4 border-t-2 border-yellow-500/20 flex justify-end flex-shrink-0">
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

        {/* Edit Donation Modal */}
        {showEditModal && selectedDonation && (
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
                    <Edit className="h-6 w-6 text-yellow-400" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-white">Edit Donation</h3>
                    <p className="text-xs text-yellow-300">Update donation information</p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setShowEditModal(false)
                    setSelectedDonation(null)
                  }}
                  className="text-gray-400 hover:text-white transition-colors p-2 hover:bg-navy-800 rounded-lg"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Content with Custom Scrollbar */}
              <div className="flex-1 overflow-y-auto px-6 py-4 custom-scrollbar">
                <form onSubmit={handleSubmit(handleEditSubmit)} className="space-y-6">
                  {/* Image Upload Section */}
                  <div className="bg-navy-800/30 rounded-lg p-4 border border-navy-700">
                    <label className="block text-sm font-semibold text-yellow-300 mb-3">Donation Image</label>
                    
                    {imagePreview ? (
                      <div className="relative">
                        <img 
                          src={imagePreview} 
                          alt="Preview" 
                          className="w-full h-48 object-cover rounded-lg border-2 border-yellow-500/30"
                        />
                        <button
                          type="button"
                          onClick={removeUploadedImage}
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
                          onChange={handleImageUpload}
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
                      <label className="block text-sm font-medium text-white mb-2">
                        Donation Title *
                      </label>
                      <input
                        {...register('title', {
                          required: 'Title is required',
                          minLength: { value: 5, message: 'Title must be at least 5 characters' },
                          maxLength: { value: 100, message: 'Title must be less than 100 characters' }
                        })}
                        className="input"
                        placeholder="e.g., Winter Clothes for Children"
                      />
                      {errors.title && (
                        <p className="mt-1 text-sm text-danger-400">{errors.title.message}</p>
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
                        placeholder="Describe what you're donating..."
                      />
                      {errors.description && (
                        <p className="mt-1 text-sm text-danger-400">{errors.description.message}</p>
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
                        {donationCategories.map(category => (
                          <option key={category} value={category}>
                            {category}
                          </option>
                        ))}
                      </select>
                      {errors.category && (
                        <p className="mt-1 text-sm text-danger-400">{errors.category.message}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-white mb-2">
                        Quantity *
                      </label>
                      <input
                        {...register('quantity', {
                          required: 'Quantity is required',
                          min: { value: 1, message: 'Quantity must be at least 1' },
                          max: { value: 1000, message: 'Quantity must be less than 1000' }
                        })}
                        type="number"
                        className="input"
                        placeholder="1"
                        min="1"
                      />
                      {errors.quantity && (
                        <p className="mt-1 text-sm text-danger-400">{errors.quantity.message}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-white mb-2">
                        Condition *
                      </label>
                      <select
                        {...register('condition', { required: 'Condition is required' })}
                        className="input"
                      >
                        {conditions.map(condition => (
                          <option key={condition.value} value={condition.value}>
                            {condition.label}
                          </option>
                        ))}
                      </select>
                      {errors.condition && (
                        <p className="mt-1 text-sm text-danger-400">{errors.condition.message}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-white mb-2">
                        Expiry Date (optional)
                      </label>
                      <input
                        {...register('expiry_date')}
                        type="date"
                        className="input"
                        min={new Date().toISOString().split('T')[0]}
                      />
                    </div>

                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-white mb-2">
                        Pickup Location *
                      </label>
                      <input
                        {...register('pickup_location', { required: 'Pickup location is required' })}
                        className="input"
                        placeholder="Where can recipients pick up this donation?"
                      />
                      {errors.pickup_location && (
                        <p className="mt-1 text-sm text-danger-400">{errors.pickup_location.message}</p>
                      )}
                    </div>

                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-white mb-2">
                        Pickup Instructions (optional)
                      </label>
                      <textarea
                        {...register('pickup_instructions')}
                        className="input h-20 resize-none"
                        placeholder="Any special instructions for pickup..."
                      />
                    </div>

                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-white mb-2">
                        Mode of Delivery *
                      </label>
                      <select
                        {...register('delivery_mode', { required: 'Delivery mode is required' })}
                        className="input"
                      >
                        <option value="pickup">Self Pickup</option>
                        <option value="volunteer">Volunteer Delivery</option>
                        <option value="direct">Direct Delivery (by donor)</option>
                      </select>
                      {errors.delivery_mode && (
                        <p className="mt-1 text-sm text-danger-400">{errors.delivery_mode.message}</p>
                      )}
                      <p className="mt-1 text-xs text-yellow-400">
                        Choose how recipients can receive this donation
                      </p>
                    </div>

                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-white mb-2">
                        Tags (optional)
                      </label>
                      <input
                        {...register('tags')}
                        className="input"
                        placeholder="Separate tags with commas (e.g., children, winter, clothing)"
                      />
                      <p className="mt-1 text-xs text-yellow-400">
                        Add relevant tags to help people find your donation
                      </p>
                    </div>

                    <div className="md:col-span-2">
                      <label className="flex items-center cursor-pointer">
                        <input
                          {...register('is_urgent')}
                          type="checkbox"
                          className="h-4 w-4 text-yellow-600 focus:ring-yellow-500 border-navy-600 rounded bg-navy-800 mr-3"
                        />
                        <span className="text-sm text-white">
                          Mark as urgent (recipients will see this donation prioritized)
                        </span>
                      </label>
                    </div>
                  </div>
                </form>
              </div>

              {/* Footer */}
              <div className="p-6 pt-4 border-t-2 border-yellow-500/20 flex justify-between items-center flex-shrink-0">
                <div className="text-sm text-yellow-300">
                  {isDirty ? (
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
                      setShowEditModal(false)
                      setSelectedDonation(null)
                    }}
                    className="px-6 py-2.5 bg-navy-800 hover:bg-navy-700 text-white rounded-lg font-medium transition-colors border border-navy-600"
                    disabled={editingId}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSubmit(handleEditSubmit)}
                    disabled={editingId || !isDirty}
                    className={`px-6 py-2.5 rounded-lg font-medium transition-colors flex items-center gap-2 ${
                      isDirty && !editingId
                        ? 'bg-yellow-600 hover:bg-yellow-700 text-white'
                        : 'bg-gray-600 text-gray-400 cursor-not-allowed'
                    }`}
                  >
                    {editingId ? (
                      <>
                        <LoadingSpinner size="sm" />
                        Updating...
                      </>
                    ) : (
                      <>
                        <Edit className="h-4 w-4" />
                        Update Donation
                      </>
                    )}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}

      </div>

      {/* Confirmation Modal */}
      <ConfirmationModal
        isOpen={showDeleteConfirmation}
        onClose={() => {
          setShowDeleteConfirmation(false)
          setDonationToDelete(null)
        }}
        onConfirm={confirmDeleteDonation}
        title="Delete Donation"
        message="Are you sure you want to delete this donation? This action cannot be undone and will remove the donation permanently."
        confirmText="Yes, Delete"
        cancelText="Cancel"
        type="danger"
        confirmButtonVariant="danger"
        loading={deletingId === donationToDelete}
      />

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
  )
}

export default MyDonationsPage 