import React, { useState, useEffect, useCallback } from 'react'
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
  RefreshCw
} from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import { useToast } from '../../contexts/ToastContext'
import { db } from '../../lib/supabase'
import LoadingSpinner from '../../components/ui/LoadingSpinner'
import DeliveryConfirmationModal from '../../components/ui/DeliveryConfirmationModal'

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
  const [showViewModal, setShowViewModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [donationRequests, setDonationRequests] = useState({})
  const [volunteerRequests, setVolunteerRequests] = useState({})
  const [showRequestsModal, setShowRequestsModal] = useState(false)
  const [selectedDonationRequests, setSelectedDonationRequests] = useState([])
  const [selectedVolunteerRequests, setSelectedVolunteerRequests] = useState([])
  const [processingRequestId, setProcessingRequestId] = useState(null)
  
  // Delivery confirmation states
  const [deliveryConfirmationNotifications, setDeliveryConfirmationNotifications] = useState([])
  const [selectedConfirmationNotification, setSelectedConfirmationNotification] = useState(null)
  const [showConfirmationModal, setShowConfirmationModal] = useState(false)

  const statusOptions = [
    { value: 'all', label: 'All Status' },
    { value: 'available', label: 'Available' },
    { value: 'matched', label: 'Matched' },
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
    formState: { errors }
  } = useForm()

  const fetchDonations = useCallback(async () => {
    if (!user?.id) {
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      const data = await db.getDonations({ donor_id: user.id })
      
      // Log donation statuses for debugging
      console.log('📊 Fetched donations with statuses:', data?.map(d => ({ 
        id: d.id, 
        title: d.title, 
        status: d.status 
      })))
      
      setDonations(data || [])
      
      // Fetch donation requests for each donation
      await fetchDonationRequests()
    } catch (err) {
      console.error('Error fetching donations:', err)
      error('Failed to load donations')
    } finally {
      setLoading(false)
    }
  }, [user?.id, error])

  const fetchDonationRequests = useCallback(async () => {
    if (!user?.id) return

    try {
      // Get notifications for donation requests and volunteer requests
      const notifications = await db.getUserNotifications(user.id, 100)
      
      // Filter donation requests (from recipients)
      const donationRequestNotifications = notifications.filter(n => n.type === 'donation_request' && !n.read_at)
      
      // Filter volunteer requests (from volunteers)
      const volunteerRequestNotifications = notifications.filter(n => n.type === 'volunteer_request' && !n.read_at)
      
      // Filter delivery confirmation requests
      const deliveryConfirmationNotifications = notifications.filter(n => n.type === 'delivery_completed' && n.data?.action_required === 'confirm_delivery' && !n.read_at)
      
      // Group donation requests by donation_id
      const requestsByDonation = {}
      donationRequestNotifications.forEach(request => {
        const donationId = request.data?.donation_id
        if (donationId) {
          if (!requestsByDonation[donationId]) {
            requestsByDonation[donationId] = []
          }
          requestsByDonation[donationId].push(request)
        }
      })
      
      // Group volunteer requests by donation_id
      const volunteerRequestsByDonation = {}
      volunteerRequestNotifications.forEach(request => {
        // For volunteer requests on donations
        const donationId = request.data?.donation_id
        
        if (donationId) {
          if (!volunteerRequestsByDonation[donationId]) {
            volunteerRequestsByDonation[donationId] = []
          }
          volunteerRequestsByDonation[donationId].push(request)
        }
      })
      
      setDonationRequests(requestsByDonation)
      setVolunteerRequests(volunteerRequestsByDonation)
      setDeliveryConfirmationNotifications(deliveryConfirmationNotifications)
    } catch (err) {
      console.error('Error fetching donation requests:', err)
    }
  }, [user?.id])

  const handleViewDonation = (donation) => {
    setSelectedDonation(donation)
    setShowViewModal(true)
  }

  const handleEditDonation = (donation) => {
    if (donation.status !== 'available') {
      error('Only available donations can be edited')
      return
    }
    
    setSelectedDonation(donation)
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

      await db.updateDonation(selectedDonation.id, updateData, user.id)
      success('Donation updated successfully!')
      setShowEditModal(false)
      setSelectedDonation(null)
      await fetchDonations() // Refresh the list
    } catch (err) {
      console.error('Error updating donation:', err)
      error(err.message || 'Failed to update donation. Please try again.')
    } finally {
      setEditingId(null)
    }
  }

  const handleDeleteDonation = async (donationId) => {
    if (!window.confirm('Are you sure you want to delete this donation? This action cannot be undone.')) {
      return
    }

    try {
      setDeletingId(donationId)
      // Add delete functionality to supabase.js if not exists
      await db.deleteDonation(donationId, user.id)
      success('Donation deleted successfully!')
      await fetchDonations() // Refresh the list
    } catch (err) {
      console.error('Error deleting donation:', err)
      error(err.message || 'Failed to delete donation. Please try again.')
    } finally {
      setDeletingId(null)
    }
  }

  const handleViewRequests = (donation) => {
    const donationReqs = donationRequests[donation.id] || []
    const volunteerReqs = volunteerRequests[donation.id] || []
    setSelectedDonationRequests(donationReqs)
    setSelectedVolunteerRequests(volunteerReqs)
    setSelectedDonation(donation)
    setShowRequestsModal(true)
  }

  const handleApproveRequest = async (request) => {
    try {
      setProcessingRequestId(request.id)
      
      // Create a claim record
      await db.claimDonation(request.data.donation_id, request.data.requester_id)
      
      // Create approval notification for requester
      await db.createNotification({
        user_id: request.data.requester_id,
        type: 'donation_approved',
        title: 'Donation Request Approved',
        message: `Your request for "${request.title.split(': ')[1]}" has been approved!`,
        data: {
          donation_id: request.data.donation_id,
          donor_id: user.id
        }
      })

      // Mark original request as read
      await db.markNotificationAsRead(request.id)

      success('Request approved successfully!')
      await fetchDonationRequests()
      await fetchDonations()
      
      // Close the modal after successful approval
      setShowRequestsModal(false)
      setSelectedDonationRequests([])
      setSelectedVolunteerRequests([])
      setSelectedDonation(null)
    } catch (err) {
      console.error('Error approving request:', err)
      error(err.message || 'Failed to approve request')
    } finally {
      setProcessingRequestId(null)
    }
  }

  const handleDeclineRequest = async (request) => {
    try {
      setProcessingRequestId(request.id)
      
      // Create decline notification for requester
      await db.createNotification({
        user_id: request.data.requester_id,
        type: 'donation_declined',
        title: 'Donation Request Declined',
        message: `Your request for "${request.title.split(': ')[1]}" was declined.`,
        data: {
          donation_id: request.data.donation_id,
          donor_id: user.id
        }
      })

      // Mark original request as read
      await db.markNotificationAsRead(request.id)

      success('Request declined')
      await fetchDonationRequests()
    } catch (err) {
      console.error('Error declining request:', err)
      error(err.message || 'Failed to decline request')
    } finally {
      setProcessingRequestId(null)
    }
  }

  const handleApproveVolunteerRequest = async (request) => {
    try {
      setProcessingRequestId(request.id)
      
      // Update volunteer request status to approved
      if (request.data.volunteer_request_id) {
        await db.updateVolunteerRequestStatus(
          request.data.volunteer_request_id, 
          'approved', 
          user.id
        )
      }
      
      // Create a delivery assignment for the volunteer
      if (request.data.claim_id) {
        // This is for an approved donation - create delivery record
        await db.assignVolunteerToDelivery(
          request.data.claim_id,
          request.data.volunteer_id
        )
      }
      
      // Create approval notification for volunteer
      await db.createNotification({
        user_id: request.data.volunteer_id,
        type: 'volunteer_approved',
        title: 'Volunteer Request Approved',
        message: `Your volunteer request has been approved! You can now manage the delivery.`,
        data: {
          claim_id: request.data.claim_id,
          donor_id: user.id,
          volunteer_request_id: request.data.volunteer_request_id
        }
      })

      // Mark original request as read
      await db.markNotificationAsRead(request.id)

      success('Volunteer request approved successfully!')
      await fetchDonationRequests()
      await fetchDonations()
      
      // Close the modal after successful approval
      setShowRequestsModal(false)
      setSelectedDonationRequests([])
      setSelectedVolunteerRequests([])
      setSelectedDonation(null)
    } catch (err) {
      console.error('Error approving volunteer request:', err)
      error(err.message || 'Failed to approve volunteer request')
    } finally {
      setProcessingRequestId(null)
    }
  }

  const handleDeclineVolunteerRequest = async (request) => {
    try {
      setProcessingRequestId(request.id)
      
      // Update volunteer request status to rejected
      if (request.data.volunteer_request_id) {
        await db.updateVolunteerRequestStatus(
          request.data.volunteer_request_id, 
          'rejected', 
          user.id
        )
      }
      
      // Create decline notification for volunteer
      await db.createNotification({
        user_id: request.data.volunteer_id,
        type: 'volunteer_declined',
        title: 'Volunteer Request Declined',
        message: `Your volunteer request was declined.`,
        data: {
          claim_id: request.data.claim_id,
          donor_id: user.id,
          volunteer_request_id: request.data.volunteer_request_id
        }
      })

      // Mark original request as read
      await db.markNotificationAsRead(request.id)

      success('Volunteer request declined')
      await fetchDonationRequests()
    } catch (err) {
      console.error('Error declining volunteer request:', err)
      error(err.message || 'Failed to decline volunteer request')
    } finally {
      setProcessingRequestId(null)
    }
  }

  const handleConfirmDelivery = (notification) => {
    setSelectedConfirmationNotification(notification)
    setShowConfirmationModal(true)
  }

  const handleConfirmationComplete = async (result) => {
    // Refresh notifications and donations after confirmation
    await fetchDonationRequests()
    await fetchDonations()
  }

  useEffect(() => {
    fetchDonations()

    // Set up periodic refresh to catch status updates
    const interval = setInterval(() => {
      fetchDonations()
    }, 30000) // Refresh every 30 seconds

    return () => clearInterval(interval)
  }, [fetchDonations])

  const filteredDonations = donations.filter(donation => {
    const matchesSearch = donation.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         donation.description?.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesStatus = statusFilter === 'all' || donation.status === statusFilter
    const matchesCategory = categoryFilter === 'All Categories' || 
                           categoryFilter === 'all' || 
                           donation.category === categoryFilter
    
    return matchesSearch && matchesStatus && matchesCategory
  })

  const getStatusColor = (status) => {
    const colors = {
      available: 'bg-success-900/20 text-success-300',
      matched: 'bg-skyblue-900/20 text-skyblue-300',
      claimed: 'bg-amber-900/20 text-amber-300',
      in_transit: 'bg-purple-900/20 text-purple-300',
      delivered: 'bg-emerald-900/20 text-emerald-300',
      completed: 'bg-green-500/30 text-green-200 border border-green-500/50', // More prominent for completed
      cancelled: 'bg-danger-900/20 text-danger-300',
      expired: 'bg-gray-900/20 text-gray-300'
    }
    return colors[status] || 'bg-gray-900/20 text-gray-300'
  }

  const getStatusIcon = (status) => {
    const icons = {
      available: CheckCircle,
      matched: Users,
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
    claimed: donations.filter(d => ['claimed', 'in_transit', 'delivered'].includes(d.status)).length,
    completed: donations.filter(d => d.status === 'completed').length
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
          className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-8"
        >
          <div className="flex items-center mb-4 sm:mb-0">
            <Package className="h-8 w-8 text-skyblue-500 mr-3" />
            <div>
              <h1 className="text-3xl font-bold text-white">My Donations</h1>
              <p className="text-skyblue-300">Manage and track your donations</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => fetchDonations()}
              disabled={loading}
              className="btn btn-secondary flex items-center justify-center"
              title="Refresh donations"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
            <Link
              to="/post-donation"
              className="btn btn-primary flex items-center justify-center"
            >
              <Plus className="h-4 w-4 mr-2" />
              Post New Donation
            </Link>
          </div>
        </motion.div>

        {/* Stats Cards */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8"
        >
          <div className="card p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-skyblue-400">Total Donations</p>
                <p className="text-2xl font-bold text-white">{stats.total}</p>
              </div>
              <Gift className="h-8 w-8 text-skyblue-500" />
            </div>
          </div>
          
          <div className="card p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-skyblue-400">Available</p>
                <p className="text-2xl font-bold text-white">{stats.available}</p>
              </div>
              <CheckCircle className="h-8 w-8 text-success-500" />
            </div>
          </div>
          
          <div className="card p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-skyblue-400">In Progress</p>
                <p className="text-2xl font-bold text-white">{stats.claimed}</p>
              </div>
              <Activity className="h-8 w-8 text-amber-500" />
            </div>
          </div>
          
          <div className="card p-6 relative overflow-hidden">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-skyblue-400">Completed</p>
                <p className="text-2xl font-bold text-white">{stats.completed}</p>
                {stats.completed > 0 && (
                  <p className="text-xs text-green-400 mt-1">🎉 Impact achieved!</p>
                )}
              </div>
              <Award className="h-8 w-8 text-emerald-500" />
            </div>
            {stats.completed > 0 && (
              <div className="absolute inset-0 bg-gradient-to-r from-green-500/5 to-emerald-500/5 pointer-events-none"></div>
            )}
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
                    <Bell className="h-5 w-5 text-amber-500" />
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
          transition={{ delay: 0.2 }}
          className="card p-6 mb-8"
        >
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-skyblue-400" />
              <input
                type="text"
                placeholder="Search donations..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="input pl-10"
              />
            </div>
            
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="input"
            >
              {statusOptions.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="input"
            >
              {categories.map(category => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
            
            <button
              onClick={() => {
                setSearchTerm('')
                setStatusFilter('all')
                setCategoryFilter('all')
              }}
              className="btn btn-secondary"
            >
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
              <Package className="h-16 w-16 text-skyblue-600 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-white mb-2">No donations found</h3>
              <p className="text-skyblue-300 mb-6">
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
                  transition={{ delay: index * 0.1 }}
                  className="card p-6 hover:bg-navy-800/50 transition-all"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <div className="flex items-center gap-3 mb-2">
                            <h3 className="text-lg font-semibold text-white">{donation.title}</h3>
                            {donation.is_urgent && (
                              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-danger-900/20 text-danger-300">
                                <AlertCircle className="h-3 w-3 mr-1" />
                                Urgent
                              </span>
                            )}
                          </div>
                          <p className="text-skyblue-300 text-sm mb-2">{donation.category}</p>
                          <p className="text-skyblue-200 text-sm leading-relaxed">
                            {donation.description?.length > 150 
                              ? `${donation.description.substring(0, 150)}...` 
                              : donation.description
                            }
                          </p>
                        </div>
                        
                        <div className="flex items-center gap-2 ml-4">
                          <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(donation.status)}`}>
                            {getStatusIcon(donation.status)}
                            <span className="ml-1 capitalize">{donation.status.replace('_', ' ')}</span>
                          </span>
                          {donation.status === 'completed' && (
                            <motion.div
                              initial={{ opacity: 0, scale: 0 }}
                              animate={{ opacity: 1, scale: 1 }}
                              transition={{ delay: 0.3, type: "spring", stiffness: 200 }}
                              className="flex items-center gap-1 px-2 py-1 bg-green-500/20 rounded-full"
                            >
                              <Heart className="h-3 w-3 text-green-400" />
                              <span className="text-xs text-green-400 font-medium">Impact Made!</span>
                            </motion.div>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex flex-wrap items-center gap-4 text-sm text-skyblue-400">
                        <div className="flex items-center">
                          <Package className="h-4 w-4 mr-1" />
                          Quantity: {donation.quantity}
                        </div>
                        
                        <div className="flex items-center">
                          <MapPin className="h-4 w-4 mr-1" />
                          {donation.pickup_location}
                        </div>
                        
                        <div className="flex items-center">
                          <Calendar className="h-4 w-4 mr-1" />
                          {new Date(donation.created_at).toLocaleDateString()}
                        </div>
                        
                        {donation.estimated_value && (
                          <div className="flex items-center">
                            <span className="mr-1">₱</span>
                            {donation.estimated_value.toLocaleString()}
                          </div>
                        )}
                        
                        {donation.expiry_date && (
                          <div className="flex items-center">
                            <Clock className="h-4 w-4 mr-1" />
                            Expires: {new Date(donation.expiry_date).toLocaleDateString()}
                          </div>
                        )}
                      </div>
                      
                      {donation.tags && donation.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-3">
                          {donation.tags.map((tag, tagIndex) => (
                            <span
                              key={tagIndex}
                              className="inline-flex items-center px-2 py-1 rounded text-xs bg-navy-700 text-skyblue-300"
                            >
                              #{tag}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                    
                    <div className="flex items-center gap-2 ml-6">
                      {/* Request Indicators */}
                      {donationRequests[donation.id] && donationRequests[donation.id].length > 0 && (
                        <button
                          onClick={() => handleViewRequests(donation)}
                          className="relative p-2 text-amber-400 hover:text-amber-300 hover:bg-navy-700 rounded-lg transition-all"
                          title={`${donationRequests[donation.id].length} pending donation request(s)`}
                        >
                          <Bell className="h-4 w-4" />
                          <span className="absolute -top-1 -right-1 bg-danger-600 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                            {donationRequests[donation.id].length}
                          </span>
                        </button>
                      )}
                      
                      {/* Volunteer Request Indicator */}
                      {volunteerRequests[donation.id] && volunteerRequests[donation.id].length > 0 && (
                        <button
                          onClick={() => handleViewRequests(donation)}
                          className="relative p-2 text-purple-400 hover:text-purple-300 hover:bg-navy-700 rounded-lg transition-all"
                          title={`${volunteerRequests[donation.id].length} pending volunteer request(s)`}
                        >
                          <Truck className="h-4 w-4" />
                          <span className="absolute -top-1 -right-1 bg-purple-600 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                            {volunteerRequests[donation.id].length}
                          </span>
                        </button>
                      )}
                      
                      <button 
                        onClick={() => handleViewDonation(donation)}
                        className="p-2 text-skyblue-400 hover:text-skyblue-300 hover:bg-navy-700 rounded-lg transition-all"
                        title="View Details"
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                      <button 
                        onClick={() => handleEditDonation(donation)}
                        className="p-2 text-skyblue-400 hover:text-skyblue-300 hover:bg-navy-700 rounded-lg transition-all"
                        title="Edit Donation"
                      >
                        <Edit className="h-4 w-4" />
                      </button>
                      <button 
                        onClick={() => handleDeleteDonation(donation.id)}
                        disabled={deletingId === donation.id}
                        className="p-2 text-skyblue-400 hover:text-danger-300 hover:bg-navy-700 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                        title="Delete Donation"
                      >
                        {deletingId === donation.id ? (
                          <LoadingSpinner size="sm" />
                        ) : (
                          <Trash2 className="h-4 w-4" />
                        )}
                      </button>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </motion.div>

        {/* View Donation Modal */}
        {showViewModal && selectedDonation && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ duration: 0.2 }}
              className="bg-navy-900 border border-navy-700 shadow-xl rounded-lg p-6 max-w-2xl w-full max-h-[90vh] overflow-hidden"
            >
              {/* Header */}
              <div className="flex items-center justify-between mb-6 border-b border-navy-700 pb-4">
                <div className="flex items-center">
                  <Gift className="h-6 w-6 text-skyblue-500 mr-3" />
                  <h3 className="text-xl font-semibold text-white">Donation Details</h3>
                </div>
                <button
                  onClick={() => setShowViewModal(false)}
                  className="text-skyblue-400 hover:text-white transition-colors p-2 hover:bg-navy-800 rounded-lg"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Content with Custom Scrollbar */}
              <div className="max-h-96 overflow-y-auto pr-2 custom-scrollbar">
                <div className="space-y-4">
                <div>
                  <h4 className="text-lg font-semibold text-white mb-2">{selectedDonation.title}</h4>
                  <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(selectedDonation.status)}`}>
                    {getStatusIcon(selectedDonation.status)}
                    <span className="ml-1 capitalize">{selectedDonation.status.replace('_', ' ')}</span>
                  </span>
                  {selectedDonation.is_urgent && (
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-danger-900/20 text-danger-300 ml-2">
                      <AlertCircle className="h-3 w-3 mr-1" />
                      Urgent
                    </span>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-skyblue-400 mb-2">Category</label>
                  <p className="text-white">{selectedDonation.category}</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-skyblue-400 mb-2">Description</label>
                  <p className="text-white">{selectedDonation.description}</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-skyblue-400 mb-2">Quantity</label>
                    <p className="text-white">{selectedDonation.quantity}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-skyblue-400 mb-2">Condition</label>
                    <p className="text-white capitalize">{selectedDonation.condition?.replace('_', ' ')}</p>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-skyblue-400 mb-2">Pickup Location</label>
                  <p className="text-white">{selectedDonation.pickup_location}</p>
                </div>

                {selectedDonation.pickup_instructions && (
                  <div>
                    <label className="block text-sm font-medium text-skyblue-400 mb-2">Pickup Instructions</label>
                    <p className="text-white">{selectedDonation.pickup_instructions}</p>
                  </div>
                )}

                {selectedDonation.expiry_date && (
                  <div>
                    <label className="block text-sm font-medium text-skyblue-400 mb-2">Expiry Date</label>
                    <p className="text-white">{new Date(selectedDonation.expiry_date).toLocaleDateString()}</p>
                  </div>
                )}

                {selectedDonation.tags && selectedDonation.tags.length > 0 && (
                  <div>
                    <label className="block text-sm font-medium text-skyblue-400 mb-2">Tags</label>
                    <div className="flex flex-wrap gap-1">
                      {selectedDonation.tags.map((tag, tagIndex) => (
                        <span
                          key={tagIndex}
                          className="inline-flex items-center px-2 py-1 rounded text-xs bg-navy-700 text-skyblue-300"
                        >
                          #{tag}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-skyblue-400 mb-2">Posted Date</label>
                  <p className="text-white">{new Date(selectedDonation.created_at).toLocaleDateString()}</p>
                </div>
                </div>
              </div>

              {/* Footer */}
              <div className="mt-6 pt-4 border-t border-navy-700 flex justify-end gap-3">
                <button
                  onClick={() => setShowViewModal(false)}
                  className="btn border border-gray-600 text-gray-400 bg-navy-800 hover:bg-navy-700"
                >
                  Close
                </button>
                <button
                  onClick={() => {
                    setShowViewModal(false)
                    handleEditDonation(selectedDonation)
                  }}
                  disabled={selectedDonation?.status !== 'available'}
                  className={`btn flex items-center ${
                    selectedDonation?.status === 'available' 
                      ? 'btn-primary hover:bg-skyblue-700' 
                      : 'bg-gray-600 text-gray-400 cursor-not-allowed'
                  }`}
                >
                  <Edit className="h-4 w-4 mr-2" />
                  {selectedDonation?.status === 'available' ? 'Edit Donation' : 'Cannot Edit'}
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {/* Edit Donation Modal */}
        {showEditModal && selectedDonation && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ duration: 0.2 }}
              className="bg-navy-900 border border-navy-700 shadow-xl rounded-lg p-6 max-w-3xl w-full max-h-[90vh] overflow-hidden"
            >
              {/* Header */}
              <div className="flex items-center justify-between mb-6 border-b border-navy-700 pb-4">
                <div className="flex items-center">
                  <Edit className="h-6 w-6 text-skyblue-500 mr-3" />
                  <h3 className="text-xl font-semibold text-white">Edit Donation</h3>
                </div>
                <button
                  onClick={() => {
                    setShowEditModal(false)
                    setSelectedDonation(null)
                  }}
                  className="text-skyblue-400 hover:text-white transition-colors p-2 hover:bg-navy-800 rounded-lg"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Content with Custom Scrollbar */}
              <div className="max-h-96 overflow-y-auto pr-2 custom-scrollbar">
                <form onSubmit={handleSubmit(handleEditSubmit)} className="space-y-6">
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
                      <p className="mt-1 text-xs text-skyblue-400">
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
                      <p className="mt-1 text-xs text-skyblue-400">
                        Add relevant tags to help people find your donation
                      </p>
                    </div>

                    <div className="md:col-span-2">
                      <label className="flex items-center cursor-pointer">
                        <input
                          {...register('is_urgent')}
                          type="checkbox"
                          className="h-4 w-4 text-skyblue-600 focus:ring-skyblue-500 border-navy-600 rounded bg-navy-800 mr-3"
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
              <div className="mt-6 pt-4 border-t border-navy-700 flex justify-end gap-3">
                <button
                  onClick={() => {
                    setShowEditModal(false)
                    setSelectedDonation(null)
                  }}
                  className="btn border border-gray-600 text-gray-400 bg-navy-800 hover:bg-navy-700"
                  disabled={editingId}
                >
                  Cancel
                </button>
                <button
                  onClick={handleSubmit(handleEditSubmit)}
                  disabled={editingId}
                  className="btn btn-primary hover:bg-skyblue-700 flex items-center"
                >
                  {editingId ? (
                    <>
                      <LoadingSpinner size="sm" className="mr-2" />
                      Updating...
                    </>
                  ) : (
                    <>
                      <Edit className="h-4 w-4 mr-2" />
                      Update Donation
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {/* Request Management Modal */}
        {showRequestsModal && selectedDonation && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ duration: 0.2 }}
              className="bg-navy-900 border border-navy-700 shadow-xl rounded-lg p-6 max-w-2xl w-full max-h-[90vh] overflow-hidden"
            >
              {/* Header */}
              <div className="flex items-center justify-between mb-6 border-b border-navy-700 pb-4">
                <div className="flex items-center">
                  <Users className="h-6 w-6 text-skyblue-500 mr-3" />
                  <div>
                    <h3 className="text-xl font-semibold text-white">Requests Management</h3>
                    <p className="text-sm text-skyblue-300">For: {selectedDonation.title}</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowRequestsModal(false)}
                  className="text-skyblue-400 hover:text-white transition-colors p-2 hover:bg-navy-800 rounded-lg"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Requests List */}
              <div className="space-y-6 max-h-96 overflow-y-auto custom-scrollbar">
                
                {/* Donation Requests Section */}
                {selectedDonationRequests.length > 0 && (
                  <div>
                    <div className="flex items-center gap-2 mb-4">
                      <Bell className="h-5 w-5 text-amber-400" />
                      <h4 className="text-lg font-semibold text-white">Donation Requests</h4>
                      <span className="px-2 py-1 bg-amber-900/20 text-amber-400 text-xs rounded-full">
                        {selectedDonationRequests.length}
                      </span>
                    </div>
                    <div className="space-y-3">
                      {selectedDonationRequests.map((request) => (
                        <div key={request.id} className="bg-amber-900/10 border border-amber-500/20 rounded-lg p-4">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <User className="h-4 w-4 text-amber-400" />
                                <span className="font-medium text-white">{request.data?.requester_name}</span>
                              </div>
                              
                              <div className="flex items-center gap-2 mb-2">
                                <Phone className="h-4 w-4 text-amber-400" />
                                <span className="text-amber-300">{request.data?.requester_phone}</span>
                              </div>

                              <div className="flex items-center gap-2 mb-3">
                                <Calendar className="h-4 w-4 text-amber-400" />
                                <span className="text-amber-300 text-sm">
                                  Requested on {new Date(request.created_at).toLocaleDateString()}
                                </span>
                              </div>

                              {request.data?.delivery_mode === 'volunteer' && (
                                <div className="bg-green-900/20 border border-green-500/20 rounded-lg p-2 mb-3">
                                  <div className="flex items-center text-green-400 text-sm">
                                    <AlertCircle className="h-4 w-4 mr-2" />
                                    <span>Volunteer delivery requested</span>
                                  </div>
                                </div>
                              )}
                            </div>

                            <div className="flex flex-col gap-2 ml-4">
                              <button
                                onClick={() => handleApproveRequest(request)}
                                disabled={processingRequestId === request.id}
                                className="px-3 py-1 bg-amber-600 hover:bg-amber-700 text-white text-sm rounded-lg font-medium transition-colors flex items-center gap-2"
                              >
                                {processingRequestId === request.id ? (
                                  <LoadingSpinner size="sm" />
                                ) : (
                                  <>
                                    <CheckCircle className="h-4 w-4" />
                                    Approve
                                  </>
                                )}
                              </button>
                              
                              <button
                                onClick={() => handleDeclineRequest(request)}
                                disabled={processingRequestId === request.id}
                                className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white text-sm rounded-lg font-medium transition-colors flex items-center gap-2"
                              >
                                <XCircle className="h-4 w-4" />
                                Decline
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Volunteer Requests Section */}
                {selectedVolunteerRequests.length > 0 && (
                  <div>
                    <div className="flex items-center gap-2 mb-4">
                      <Truck className="h-5 w-5 text-purple-400" />
                      <h4 className="text-lg font-semibold text-white">Volunteer Requests</h4>
                      <span className="px-2 py-1 bg-purple-900/20 text-purple-400 text-xs rounded-full">
                        {selectedVolunteerRequests.length}
                      </span>
                    </div>
                    <div className="space-y-3">
                      {selectedVolunteerRequests.map((request) => (
                        <div key={request.id} className="bg-purple-900/10 border border-purple-500/20 rounded-lg p-4">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <User className="h-4 w-4 text-purple-400" />
                                <span className="font-medium text-white">{request.data?.volunteer_name}</span>
                              </div>
                              
                              <div className="flex items-center gap-2 mb-3">
                                <Calendar className="h-4 w-4 text-purple-400" />
                                <span className="text-purple-300 text-sm">
                                  Volunteered on {new Date(request.created_at).toLocaleDateString()}
                                </span>
                              </div>

                              <div className="bg-purple-900/20 border border-purple-500/20 rounded-lg p-2 mb-3">
                                <div className="flex items-center text-purple-400 text-sm">
                                  <Truck className="h-4 w-4 mr-2" />
                                  <span>Volunteer delivery service</span>
                                </div>
                              </div>
                            </div>

                            <div className="flex flex-col gap-2 ml-4">
                              <button
                                onClick={() => handleApproveVolunteerRequest(request)}
                                disabled={processingRequestId === request.id}
                                className="px-3 py-1 bg-purple-600 hover:bg-purple-700 text-white text-sm rounded-lg font-medium transition-colors flex items-center gap-2"
                              >
                                {processingRequestId === request.id ? (
                                  <LoadingSpinner size="sm" />
                                ) : (
                                  <>
                                    <CheckCircle className="h-4 w-4" />
                                    Approve
                                  </>
                                )}
                              </button>
                              
                              <button
                                onClick={() => handleDeclineVolunteerRequest(request)}
                                disabled={processingRequestId === request.id}
                                className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white text-sm rounded-lg font-medium transition-colors flex items-center gap-2"
                              >
                                <XCircle className="h-4 w-4" />
                                Decline
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* No Requests Message */}
                {selectedDonationRequests.length === 0 && selectedVolunteerRequests.length === 0 && (
                  <div className="text-center py-8">
                    <Users className="h-12 w-12 text-skyblue-400 mx-auto mb-4" />
                    <p className="text-skyblue-300">No pending requests for this donation.</p>
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="mt-6 pt-4 border-t border-navy-700 flex justify-end">
                <button
                  onClick={() => setShowRequestsModal(false)}
                  className="btn btn-secondary"
                >
                  Close
                </button>
              </div>
            </motion.div>
          </div>
        )}

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

export default MyDonationsPage 