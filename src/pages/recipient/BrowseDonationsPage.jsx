import React, { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { 
  Search, 
  Filter, 
  Gift, 
  MapPin, 
  Calendar, 
  Tag, 
  Heart,
  AlertCircle,
  Star,
  Clock,
  User,
  Image as ImageIcon,
  CheckCircle,
  Package,
  ArrowRight
} from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import { useToast } from '../../contexts/ToastContext'
import LoadingSpinner from '../../components/ui/LoadingSpinner'
import { db } from '../../lib/supabase'

const BrowseDonationsPage = () => {
  const { user, profile } = useAuth()
  const { success, error } = useToast()
  const navigate = useNavigate()
  const [donations, setDonations] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('')
  const [selectedCondition, setSelectedCondition] = useState('')
  const [showUrgentOnly, setShowUrgentOnly] = useState(false)
  const [claimingId, setClaimingId] = useState(null)
  const [requestedDonations, setRequestedDonations] = useState(new Set())

  const categories = [
    'Food',
    'Clothing',
    'Medical Supplies',
    'Educational Materials',
    'Household Items',
    'Electronics',
    'Toys & Games',
    'Books',
    'Furniture',
    'Other'
  ]

  const conditions = [
    { value: 'new', label: 'New' },
    { value: 'like_new', label: 'Like New' },
    { value: 'good', label: 'Good' },
    { value: 'fair', label: 'Fair' }
  ]

  const loadDonations = useCallback(async () => {
    try {
      setLoading(true)
      // Get available donations
      const availableDonations = await db.getAvailableDonations()
      setDonations(availableDonations || [])
      
      // Load requested donations from localStorage
      const storedRequests = localStorage.getItem(`requestedDonations_${user?.id}`)
      if (storedRequests) {
        const storedIds = new Set(JSON.parse(storedRequests))
        // Only keep requests for donations that still exist
        const currentDonationIds = new Set(availableDonations.map(d => d.id))
        const validRequests = new Set([...storedIds].filter(id => currentDonationIds.has(id)))
        
        setRequestedDonations(validRequests)
        
        // Update localStorage with cleaned data
        if (validRequests.size !== storedIds.size) {
          localStorage.setItem(`requestedDonations_${user.id}`, JSON.stringify([...validRequests]))
        }
      }
    } catch (err) {
      console.error('Error loading donations:', err)
      error('Failed to load donations. Please try again.')
    } finally {
      setLoading(false)
    }
  }, [error, user?.id])

  useEffect(() => {
    loadDonations()
  }, [loadDonations])

  const handleRequestDonation = async (donation) => {
    if (!profile) {
      error('Please complete your profile first')
      return
    }

    // Validate donor information
    if (!donation.donor || !donation.donor.id) {
      error('Unable to find donor information. Please try again.')
      console.error('Missing donor information:', donation)
      return
    }

    try {
      setClaimingId(donation.id)
      
      // Create a donation request notification to the donor
      await db.createNotification({
        user_id: donation.donor.id,
        type: 'donation_request',
        title: 'Donation Request',
        message: `${profile.name} is requesting your donation: ${donation.title}`,
        data: {
          donation_id: donation.id,
          requester_id: user.id,
          requester_name: profile.name,
          requester_phone: profile.phone_number,
          delivery_mode: donation.delivery_mode
        }
      })
      
      success('Request sent successfully! The donor will be notified and can approve your request.')
      
      // Mark this donation as requested
      setRequestedDonations(prev => {
        const newRequested = new Set([...prev, donation.id])
        // Save to localStorage for persistence
        localStorage.setItem(`requestedDonations_${user.id}`, JSON.stringify([...newRequested]))
        return newRequested
      })
    } catch (err) {
      console.error('Error requesting donation:', err)
      error(err.message || 'Failed to send request. Please try again.')
    } finally {
      setClaimingId(null)
    }
  }

  const filteredDonations = donations.filter(donation => {
    const matchesSearch = donation.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         donation.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         donation.tags?.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()))
    
    const matchesCategory = !selectedCategory || donation.category === selectedCategory
    const matchesCondition = !selectedCondition || donation.condition === selectedCondition
    const matchesUrgent = !showUrgentOnly || donation.is_urgent

    return matchesSearch && matchesCategory && matchesCondition && matchesUrgent
  })

  const getConditionColor = (condition) => {
    switch (condition) {
      case 'new': return 'text-green-400 bg-green-900/20'
      case 'like_new': return 'text-blue-400 bg-blue-900/20'
      case 'good': return 'text-yellow-400 bg-yellow-900/20'
      case 'fair': return 'text-orange-400 bg-orange-900/20'
      default: return 'text-gray-400 bg-gray-900/20'
    }
  }

  const getDeliveryModeColor = (mode) => {
    switch (mode) {
      case 'pickup': return 'text-blue-400 bg-blue-900/20'
      case 'volunteer': return 'text-green-400 bg-green-900/20'
      case 'direct': return 'text-purple-400 bg-purple-900/20'
      default: return 'text-gray-400 bg-gray-900/20'
    }
  }

  const getDeliveryModeLabel = (mode) => {
    switch (mode) {
      case 'pickup': return '📍 Self Pickup'
      case 'volunteer': return '🚚 Volunteer Delivery'
      case 'direct': return '🤝 Direct Delivery'
      default: return '📦 Pickup'
    }
  }

  const getDeliveryInstructions = (mode) => {
    switch (mode) {
      case 'pickup': return 'You will need to pick up this donation from the donor.'
      case 'volunteer': return 'A volunteer will coordinate the delivery between you and the donor.'
      case 'direct': return 'The donor will deliver this directly to you.'
      default: return ''
    }
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
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold text-white mb-2">Browse Donations</h1>
              <p className="text-skyblue-300">Find donations that match your needs</p>
            </div>
            <div className="flex items-center space-x-4">
              <button
                onClick={() => navigate('/my-approved-donations')}
                className="btn btn-primary flex items-center"
              >
                <Package className="h-4 w-4 mr-2" />
                My Approved Donations
                <ArrowRight className="h-4 w-4 ml-2" />
              </button>
              <div className="flex items-center space-x-2 text-skyblue-400">
                <Gift className="h-5 w-5" />
                <span className="text-sm">{filteredDonations.length} donations available</span>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Filters */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="card p-6 mb-8"
        >
          <div className="flex items-center space-x-4 mb-4">
            <Filter className="h-5 w-5 text-skyblue-400" />
            <h2 className="text-lg font-semibold text-white">Filters</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Search */}
            <div>
              <label className="block text-sm font-medium text-white mb-2">Search</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="input pl-10"
                  placeholder="Search donations..."
                />
              </div>
            </div>

            {/* Category */}
            <div>
              <label className="block text-sm font-medium text-white mb-2">Category</label>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="input"
              >
                <option value="">All Categories</option>
                {categories.map(category => (
                  <option key={category} value={category}>{category}</option>
                ))}
              </select>
            </div>

            {/* Condition */}
            <div>
              <label className="block text-sm font-medium text-white mb-2">Condition</label>
              <select
                value={selectedCondition}
                onChange={(e) => setSelectedCondition(e.target.value)}
                className="input"
              >
                <option value="">All Conditions</option>
                {conditions.map(condition => (
                  <option key={condition.value} value={condition.value}>{condition.label}</option>
                ))}
              </select>
            </div>

            {/* Urgent Only */}
            <div>
              <label className="block text-sm font-medium text-white mb-2">Priority</label>
              <label className="flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={showUrgentOnly}
                  onChange={(e) => setShowUrgentOnly(e.target.checked)}
                  className="h-4 w-4 text-skyblue-600 focus:ring-skyblue-500 border-navy-600 rounded bg-navy-800 mr-2"
                />
                <span className="text-sm text-white">Urgent only</span>
              </label>
            </div>
          </div>
        </motion.div>

        {/* Donations Grid */}
        {filteredDonations.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-12"
          >
            <Gift className="h-16 w-16 text-skyblue-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">No donations found</h3>
            <p className="text-skyblue-400">
              {searchTerm || selectedCategory || selectedCondition || showUrgentOnly
                ? 'Try adjusting your filters to see more results.'
                : 'There are no donations available at the moment.'}
            </p>
          </motion.div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <AnimatePresence>
              {filteredDonations.map((donation, index) => (
                <motion.div
                  key={donation.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ delay: index * 0.1 }}
                  className="card p-6 hover:shadow-lg transition-shadow"
                >
                  {/* Donation Image */}
                  <div className="relative mb-4">
                    <div className="w-full h-48 rounded-lg overflow-hidden bg-navy-800">
                      {donation.images && donation.images.length > 0 ? (
                        <img
                          src={donation.images[0]}
                          alt={donation.title}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <ImageIcon className="h-12 w-12 text-gray-400" />
                        </div>
                      )}
                    </div>
                    
                    {/* Urgent Badge */}
                    {donation.is_urgent && (
                      <div className="absolute top-2 right-2 bg-red-600 text-white px-2 py-1 rounded-full text-xs font-medium flex items-center">
                        <AlertCircle className="h-3 w-3 mr-1" />
                        Urgent
                      </div>
                    )}
                  </div>

                  {/* Donation Info */}
                  <div className="mb-4">
                    <div className="flex items-start justify-between mb-2">
                      <h3 className="text-lg font-semibold text-white truncate pr-2">{donation.title}</h3>
                      <div className="flex items-center space-x-1 text-skyblue-400">
                        <Star className="h-4 w-4" />
                        <span className="text-sm">{donation.donor_rating || 'New'}</span>
                      </div>
                    </div>

                    <p className="text-skyblue-300 text-sm mb-3 line-clamp-2">
                      {donation.description || 'No description provided'}
                    </p>

                    <div className="flex flex-wrap gap-2 mb-3">
                      <span className="badge badge-primary">{donation.category}</span>
                      <span className={`badge ${getConditionColor(donation.condition)}`}>
                        {donation.condition?.replace('_', ' ') || 'Unknown'}
                      </span>
                      <span className={`badge ${getDeliveryModeColor(donation.delivery_mode)}`}>
                        {getDeliveryModeLabel(donation.delivery_mode)}
                      </span>
                      {donation.estimated_value && (
                        <span className="badge badge-secondary">
                          ₱{parseInt(donation.estimated_value).toLocaleString()}
                        </span>
                      )}
                    </div>

                    {/* Tags */}
                    {donation.tags && donation.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 mb-3">
                        {donation.tags.slice(0, 3).map((tag, tagIndex) => (
                          <span key={tagIndex} className="inline-flex items-center text-xs bg-navy-800 text-skyblue-300 px-2 py-1 rounded">
                            <Tag className="h-3 w-3 mr-1" />
                            {tag}
                          </span>
                        ))}
                        {donation.tags.length > 3 && (
                          <span className="text-xs text-skyblue-400">+{donation.tags.length - 3} more</span>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Donation Details */}
                  <div className="space-y-2 mb-4 text-sm">
                    <div className="flex items-center text-skyblue-400">
                      <User className="h-4 w-4 mr-2" />
                      <span>Quantity: {donation.quantity}</span>
                    </div>
                    
                    {donation.pickup_location && (
                      <div className="flex items-center text-skyblue-400">
                        <MapPin className="h-4 w-4 mr-2" />
                        <span className="truncate">{donation.pickup_location}</span>
                      </div>
                    )}
                    
                    <div className="flex items-center text-skyblue-400">
                      <Calendar className="h-4 w-4 mr-2" />
                      <span>Posted {formatDate(donation.created_at)}</span>
                    </div>

                    {donation.expiry_date && (
                      <div className="flex items-center text-amber-400">
                        <Clock className="h-4 w-4 mr-2" />
                        <span>Expires {formatDate(donation.expiry_date)}</span>
                      </div>
                    )}

                    {/* Delivery Instructions */}
                    <div className="text-xs text-skyblue-300 bg-navy-800 p-2 rounded">
                      💡 {getDeliveryInstructions(donation.delivery_mode)}
                    </div>
                  </div>

                  {/* Action Button */}
                  <button
                    onClick={() => handleRequestDonation(donation)}
                    disabled={claimingId === donation.id || requestedDonations.has(donation.id)}
                    title={requestedDonations.has(donation.id) ? 'You have already requested this donation' : 'Click to request this donation'}
                    className={`btn w-full flex items-center justify-center ${
                      requestedDonations.has(donation.id) 
                        ? 'btn-secondary cursor-not-allowed' 
                        : 'btn-primary'
                    }`}
                  >
                    {claimingId === donation.id ? (
                      <LoadingSpinner size="sm" />
                    ) : requestedDonations.has(donation.id) ? (
                      <>
                        <CheckCircle className="h-4 w-4 mr-2" />
                        Request Sent
                      </>
                    ) : (
                      <>
                        <Heart className="h-4 w-4 mr-2" />
                        Request Donation
                      </>
                    )}
                  </button>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  )
}

export default BrowseDonationsPage 