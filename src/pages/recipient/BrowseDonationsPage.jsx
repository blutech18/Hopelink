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
  ArrowRight,
  Eye,
  X,
  Phone,
  Mail
} from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import { useToast } from '../../contexts/ToastContext'
import { ListPageSkeleton } from '../../components/ui/Skeleton'
import LoadingSpinner from '../../components/ui/LoadingSpinner'
import { IDVerificationBadge } from '../../components/ui/VerificationBadge'
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
  const [selectedDonation, setSelectedDonation] = useState(null)
  const [showDetailsModal, setShowDetailsModal] = useState(false)
  const [showDonorProfileModal, setShowDonorProfileModal] = useState(false)
  const [selectedDonor, setSelectedDonor] = useState(null)
  const [loadingDonorProfile, setLoadingDonorProfile] = useState(false)

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
    // Exclude donations that are destined for organization only (CFC-GK)
    if (donation.donation_destination === 'organization') {
      return false
    }
    
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
      case 'like_new': return 'text-yellow-400 bg-yellow-900/20'
      case 'good': return 'text-yellow-400 bg-yellow-900/20'
      case 'fair': return 'text-orange-400 bg-orange-900/20'
      default: return 'text-gray-400 bg-gray-900/20'
    }
  }

  const getDeliveryModeColor = (mode) => {
    switch (mode) {
      case 'pickup': return 'text-yellow-400 bg-yellow-900/20'
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

  const handleViewDetails = (donation) => {
    setSelectedDonation(donation)
    setShowDetailsModal(true)
  }

  const handleViewDonorProfile = async (donor) => {
    try {
      setShowDonorProfileModal(true)
      setLoadingDonorProfile(true)
      
      // Fetch detailed profile
      if (donor?.id) {
        const detailedProfile = await db.getProfile(donor.id)
        setSelectedDonor(detailedProfile)
      } else {
        setSelectedDonor(donor)
      }
    } catch (err) {
      console.error('Error fetching donor profile:', err)
      error('Failed to load profile information')
    } finally {
      setLoadingDonorProfile(false)
    }
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
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between mb-4 gap-3">
            <div className="flex-1">
              <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-white mb-2">Browse Donations</h1>
              <p className="text-xs sm:text-sm text-yellow-300">Find donations that match your needs</p>
            </div>
            <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
              {/* Donation Count Badge */}
              <div className="flex items-center gap-2 px-3 sm:px-4 py-1.5 sm:py-2 bg-gradient-to-r from-yellow-500/20 to-yellow-600/20 border-2 border-yellow-500/40 rounded-full shadow-lg">
                <Gift className="h-4 w-4 sm:h-5 sm:w-5 text-yellow-400 fill-yellow-400 animate-pulse" />
                <div className="flex items-center gap-1.5">
                  <span className="text-lg sm:text-xl font-bold text-white">{filteredDonations.length}</span>
                  <span className="text-xs sm:text-sm font-medium text-yellow-300">Donation{filteredDonations.length !== 1 ? 's' : ''}</span>
                </div>
              </div>
              
              {/* My Approved Requests Button - Hidden on mobile, shown on tablet+ */}
              <button
                onClick={() => navigate('/my-approved-requests')}
                className="hidden sm:flex items-center gap-1.5 px-3 sm:px-4 py-1.5 sm:py-2 bg-gradient-to-r from-green-500/20 to-emerald-600/20 border-2 border-green-500/40 rounded-full shadow-lg hover:from-green-500/30 hover:to-emerald-600/30 transition-all active:scale-95"
              >
                <Package className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-green-400" />
                <span className="text-xs sm:text-sm font-medium text-green-300">My Requests</span>
                <ArrowRight className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-green-400" />
              </button>
            </div>
          </div>
          
          {/* Mobile My Requests Button */}
          <button
            onClick={() => navigate('/my-approved-requests')}
            className="sm:hidden w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-green-600 to-emerald-700 hover:from-green-700 hover:to-emerald-800 text-white rounded-lg font-semibold transition-all shadow-md active:scale-95"
          >
            <Package className="h-4 w-4" />
            <span>My Approved Requests</span>
            <ArrowRight className="h-4 w-4" />
          </button>
        </motion.div>

        {/* Filters */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="card p-4 sm:p-6 mb-6 sm:mb-8"
        >
          <div className="flex flex-col sm:flex-row flex-wrap gap-3 sm:gap-4">
            {/* Search */}
            <div className="relative flex-1 min-w-full sm:min-w-[200px]">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 sm:h-5 sm:w-5 text-yellow-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 sm:pl-10 pr-4 py-2 sm:py-3 text-sm sm:text-base bg-navy-800 border-2 border-navy-700 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-yellow-500 focus:ring-2 focus:ring-yellow-500/20 transition-all duration-200"
                placeholder="Search donations..."
              />
            </div>

            {/* Category */}
            <div className="relative w-full sm:w-auto sm:min-w-[180px]">
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="appearance-none w-full px-5 py-3 pr-10 bg-navy-800 border-2 border-navy-700 rounded-lg text-white font-medium focus:outline-none focus:border-yellow-500 focus:ring-2 focus:ring-yellow-500/20 transition-all duration-200 cursor-pointer hover:border-yellow-600"
              >
                <option value="">All Categories</option>
                {categories.map(category => (
                  <option key={category} value={category}>{category}</option>
                ))}
              </select>
              <Package className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-yellow-400 pointer-events-none" />
            </div>

            {/* Condition */}
            <div className="relative w-full sm:w-auto sm:min-w-[180px]">
              <select
                value={selectedCondition}
                onChange={(e) => setSelectedCondition(e.target.value)}
                className="appearance-none w-full px-5 py-3 pr-10 bg-navy-800 border-2 border-navy-700 rounded-lg text-white font-medium focus:outline-none focus:border-yellow-500 focus:ring-2 focus:ring-yellow-500/20 transition-all duration-200 cursor-pointer hover:border-yellow-600"
              >
                <option value="">All Conditions</option>
                {conditions.map(condition => (
                  <option key={condition.value} value={condition.value}>{condition.label}</option>
                ))}
              </select>
              <CheckCircle className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-yellow-400 pointer-events-none" />
            </div>

            {/* Urgent Filter */}
            <button
              onClick={() => setShowUrgentOnly(!showUrgentOnly)}
              className={`w-full sm:w-auto px-4 sm:px-5 py-2.5 sm:py-3 rounded-lg text-sm sm:text-base font-semibold transition-all duration-200 flex items-center justify-center gap-2 whitespace-nowrap border-2 active:scale-95 ${
                showUrgentOnly
                  ? 'bg-red-600 hover:bg-red-700 text-white border-red-600 shadow-md hover:shadow-lg'
                  : 'bg-navy-800 hover:bg-navy-700 text-white border-navy-700 hover:border-yellow-600/50'
              }`}
            >
              <AlertCircle className="h-4 w-4" />
              <span>Urgent Only</span>
            </button>
            
            {/* Clear Filters Button */}
            <button
              onClick={() => {
                setSearchTerm('')
                setSelectedCategory('')
                setSelectedCondition('')
                setShowUrgentOnly(false)
              }}
              disabled={!searchTerm && !selectedCategory && !selectedCondition && !showUrgentOnly}
              className={`w-full sm:w-auto px-4 sm:px-5 py-2.5 sm:py-3 rounded-lg text-sm sm:text-base font-semibold transition-all duration-200 flex items-center justify-center gap-2 whitespace-nowrap border-2 ${
                searchTerm || selectedCategory || selectedCondition || showUrgentOnly
                  ? 'bg-gradient-to-r from-yellow-500 to-yellow-600 hover:from-yellow-600 hover:to-yellow-700 text-white border-yellow-500 hover:border-yellow-600 shadow-md hover:shadow-lg active:scale-95'
                  : 'bg-navy-800 text-gray-500 border-navy-700 cursor-not-allowed opacity-50'
              }`}
            >
              <X className="h-4 w-4" />
              Clear Filters
            </button>
          </div>
        </motion.div>

        {/* Donations Grid */}
        {filteredDonations.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-8 sm:py-12"
          >
            <Gift className="h-12 w-12 sm:h-16 sm:w-16 text-yellow-400 mx-auto mb-3 sm:mb-4" />
            <h3 className="text-lg sm:text-xl font-semibold text-white mb-2">No donations found</h3>
            <p className="text-sm sm:text-base text-yellow-300 px-4">
              {searchTerm || selectedCategory || selectedCondition || showUrgentOnly
                ? 'Try adjusting your filters to see more results.'
                : 'There are no donations available at the moment.'}
            </p>
          </motion.div>
        ) : (
          <div className="space-y-4 sm:space-y-6">
            <AnimatePresence>
              {filteredDonations.map((donation, index) => (
                <motion.div
                  key={donation.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ delay: index * 0.05 }}
                  className="card hover:shadow-xl hover:border-yellow-500/20 transition-all duration-300 overflow-hidden border-l-4 border-2 border-navy-700 cursor-pointer group active:scale-[0.99]"
                  style={{
                    borderLeftColor: donation.is_urgent ? '#ef4444' : '#fbbf24'
                  }}
                  onClick={() => handleViewDetails(donation)}
                >
                  <div className="p-4 sm:p-5 lg:p-6">
                    {/* Header Section */}
                    <div className="flex items-start justify-between gap-3 sm:gap-4 mb-3 sm:mb-4">
                      {/* Left: Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 mb-2">
                          <h3 className="text-base sm:text-lg lg:text-xl font-bold text-white group-hover:text-yellow-300 transition-colors">
                            {donation.title}
                          </h3>
                          <span className="px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-full text-[10px] sm:text-xs font-semibold bg-yellow-900/30 text-yellow-300 border border-yellow-500/30">
                            {donation.category}
                          </span>
                          <div className={`badge text-[10px] sm:text-xs px-2 py-0.5 ${getConditionColor(donation.condition)}`}>
                            {donation.condition?.replace('_', ' ') || 'Unknown'}
                          </div>
                          {donation.is_urgent && (
                            <div className="badge text-[10px] sm:text-xs px-2 py-0.5 text-red-400 bg-red-900/20">
                              <AlertCircle className="h-3 w-3 mr-1" />
                              Urgent
                            </div>
                          )}
                        </div>
                        <p className="text-gray-300 text-xs sm:text-sm line-clamp-2 mb-3">
                          {donation.description || 'No description provided'}
                        </p>
                        
                        {/* Compact Details */}
                        <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-xs sm:text-sm text-yellow-300">
                          <div className="flex items-center gap-1 sm:gap-1.5 whitespace-nowrap">
                            <Package className="h-3 w-3 sm:h-4 sm:w-4 text-blue-400 flex-shrink-0" />
                            <span className="font-medium">Qty:</span>
                            <span className="text-white">{donation.quantity}</span>
                          </div>
                          
                          <div className="flex items-center gap-1 sm:gap-1.5 whitespace-nowrap">
                            <User className="h-3 w-3 sm:h-4 sm:w-4 text-green-400 flex-shrink-0" />
                            <span className="font-medium">By:</span>
                            <span className="text-white">{donation.donor?.name || 'Anonymous'}</span>
                          </div>
                          
                          {donation.pickup_location && (
                            <div className="flex items-center gap-1 sm:gap-1.5 whitespace-nowrap min-w-0">
                              <MapPin className="h-3 w-3 sm:h-4 sm:w-4 text-purple-400 flex-shrink-0" />
                              <span className="text-white overflow-hidden text-ellipsis">{donation.pickup_location}</span>
                            </div>
                          )}
                          
                          <div className="flex items-center gap-1 sm:gap-1.5 whitespace-nowrap">
                            <Calendar className="h-3 w-3 sm:h-4 sm:w-4 text-orange-400 flex-shrink-0" />
                            <span className="text-white">{formatDate(donation.created_at)}</span>
                          </div>

                          {donation.expiry_date && (
                            <div className="flex items-center gap-1 sm:gap-1.5 whitespace-nowrap">
                              <Clock className="h-3 w-3 sm:h-4 sm:w-4 text-red-400 flex-shrink-0" />
                              <span className="font-medium">Expires:</span>
                              <span className="text-white">{formatDate(donation.expiry_date)}</span>
                            </div>
                          )}
                        </div>
                      </div>
                      
                      {/* Right: Action Button */}
                      <div className="flex flex-col items-end gap-2 flex-shrink-0">
                        {requestedDonations.has(donation.id) ? (
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                            }}
                            disabled
                            className="px-3 sm:px-4 py-2 sm:py-2.5 bg-gray-600 text-gray-300 text-xs sm:text-sm font-semibold rounded-lg flex items-center gap-1.5 sm:gap-2 cursor-not-allowed opacity-70 whitespace-nowrap"
                          >
                            <CheckCircle className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                            <span>Request Sent</span>
                          </button>
                        ) : (
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              handleRequestDonation(donation)
                            }}
                            disabled={claimingId === donation.id}
                            className="px-3 sm:px-4 py-2 sm:py-2.5 bg-gradient-to-r from-yellow-500 to-yellow-600 hover:from-yellow-600 hover:to-yellow-700 text-white text-xs sm:text-sm font-semibold rounded-lg transition-all disabled:opacity-50 flex items-center gap-1.5 sm:gap-2 shadow-lg hover:shadow-xl whitespace-nowrap active:scale-95"
                          >
                            {claimingId === donation.id ? (
                              <LoadingSpinner size="sm" />
                            ) : (
                              <>
                                <Heart className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                                <span>Request</span>
                              </>
                            )}
                          </button>
                        )}
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            handleViewDetails(donation)
                          }}
                          className="px-3 sm:px-4 py-2 sm:py-2.5 bg-navy-700 hover:bg-navy-600 text-yellow-300 hover:text-white text-xs sm:text-sm font-semibold rounded-lg transition-all flex items-center gap-1.5 sm:gap-2 border border-navy-600 hover:border-yellow-500/50 shadow-md hover:shadow-lg active:scale-95"
                        >
                          <Eye className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                          <span>Details</span>
                        </button>
                      </div>
                    </div>

                    {/* Tags */}
                    {donation.tags && donation.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mb-3 sm:mb-4">
                        {donation.tags.slice(0, 4).map((tag, tagIndex) => (
                          <span key={tagIndex} className="inline-flex items-center text-[10px] sm:text-xs bg-navy-700 text-yellow-300 px-2 py-1 rounded-md border border-navy-600">
                            <Tag className="h-3 w-3 mr-1" />
                            {tag}
                          </span>
                        ))}
                        {donation.tags.length > 4 && (
                          <span className="text-[10px] sm:text-xs text-yellow-300 font-medium">+{donation.tags.length - 4} more</span>
                        )}
                      </div>
                    )}

                    {/* Delivery Mode Info */}
                    <div className="p-3 sm:p-4 bg-gradient-to-r from-yellow-900/10 to-yellow-800/10 border-2 border-yellow-500/30 rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs sm:text-sm font-semibold text-yellow-300">🚚 Delivery Mode</span>
                        <div className={`badge text-xs sm:text-sm font-bold border-2 ${getDeliveryModeColor(donation.delivery_mode)}`}>
                          {getDeliveryModeLabel(donation.delivery_mode)}
                        </div>
                      </div>
                      
                      <div className="text-xs sm:text-sm text-yellow-200">
                        💡 {getDeliveryInstructions(donation.delivery_mode)}
                      </div>
                      
                      {donation.estimated_value && (
                        <div className="mt-2 pt-2 border-t border-yellow-500/30">
                          <div className="text-xs sm:text-sm text-yellow-300">Estimated Value: <span className="text-white font-bold">₱{parseInt(donation.estimated_value).toLocaleString()}</span></div>
                        </div>
                      )}
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}

        {/* Donation Details Modal */}
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
                      <Gift className="h-5 w-5 sm:h-6 sm:w-6 text-yellow-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-base sm:text-lg lg:text-xl font-bold text-white truncate">Donation Details</h3>
                      <p className="text-[10px] sm:text-xs text-yellow-300">Complete information</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {selectedDonation.donor && (
                      <button
                        onClick={() => handleViewDonorProfile(selectedDonation.donor)}
                        className="text-xs sm:text-sm px-3 sm:px-4 py-1.5 sm:py-2 bg-yellow-600/20 hover:bg-yellow-600/30 text-yellow-300 rounded-lg transition-colors flex items-center gap-1.5 sm:gap-2 border border-yellow-500/30 hover:border-yellow-500/50 active:scale-95"
                      >
                        <Eye className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                        <span className="hidden sm:inline">View Donor Profile</span>
                        <span className="sm:hidden">View</span>
                      </button>
                    )}
                    <button
                      onClick={() => setShowDetailsModal(false)}
                      className="text-gray-400 hover:text-white transition-colors p-1.5 sm:p-2 hover:bg-navy-800 rounded-lg active:scale-95 flex-shrink-0"
                      aria-label="Close modal"
                    >
                      <X className="h-4 w-4 sm:h-5 sm:w-5" />
                    </button>
                  </div>
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
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                      <div className="bg-navy-800/30 rounded-lg p-3 sm:p-4 border border-navy-700">
                        <div className="flex items-center gap-2 mb-2">
                          <Package className="h-4 w-4 text-blue-400 flex-shrink-0" />
                          <label className="text-xs sm:text-sm font-semibold text-yellow-300">Quantity Available</label>
                        </div>
                        <p className="text-white text-base sm:text-lg font-medium">{selectedDonation.quantity}</p>
                      </div>
                      
                      <div className="bg-navy-800/30 rounded-lg p-3 sm:p-4 border border-navy-700">
                        <div className="flex items-center gap-2 mb-2">
                          <CheckCircle className="h-4 w-4 text-green-400 flex-shrink-0" />
                          <label className="text-xs sm:text-sm font-semibold text-yellow-300">Condition</label>
                        </div>
                        <p className="text-white text-base sm:text-lg font-medium">{selectedDonation.condition?.replace('_', ' ') || 'Unknown'}</p>
                      </div>
                      
                      <div className="bg-navy-800/30 rounded-lg p-3 sm:p-4 border border-navy-700">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <User className="h-4 w-4 text-green-400 flex-shrink-0" />
                            <label className="text-xs sm:text-sm font-semibold text-yellow-300">Donated By</label>
                          </div>
                          {selectedDonation.donor && (
                            <button
                              onClick={() => handleViewDonorProfile(selectedDonation.donor)}
                              className="text-xs px-2 py-1 bg-yellow-600/20 hover:bg-yellow-600/30 text-yellow-300 rounded-md transition-colors flex items-center gap-1"
                            >
                              <Eye className="h-3 w-3" />
                              View Profile
                            </button>
                          )}
                        </div>
                        <p className="text-white text-base sm:text-lg font-medium">{selectedDonation.donor?.name || 'Anonymous'}</p>
                      </div>

                      {selectedDonation.estimated_value && (
                        <div className="bg-navy-800/30 rounded-lg p-3 sm:p-4 border border-navy-700">
                          <div className="flex items-center gap-2 mb-2">
                            <Star className="h-4 w-4 text-yellow-400 flex-shrink-0" />
                            <label className="text-xs sm:text-sm font-semibold text-yellow-300">Estimated Value</label>
                          </div>
                          <p className="text-white text-base sm:text-lg font-medium">₱{parseInt(selectedDonation.estimated_value).toLocaleString()}</p>
                        </div>
                      )}
                    </div>

                    {/* Location */}
                    {selectedDonation.pickup_location && (
                      <div className="bg-navy-800/30 rounded-lg p-3 sm:p-4 border border-navy-700">
                        <div className="flex items-center gap-2 mb-2">
                          <MapPin className="h-4 w-4 text-purple-400 flex-shrink-0" />
                          <label className="text-xs sm:text-sm font-semibold text-yellow-300">Pickup Location</label>
                        </div>
                        <p className="text-sm sm:text-base text-white">{selectedDonation.pickup_location}</p>
                      </div>
                    )}

                    {/* Delivery Mode */}
                    <div className="bg-navy-800/30 rounded-lg p-3 sm:p-4 border border-navy-700">
                      <div className="flex items-center gap-2 mb-2">
                        <Package className="h-4 w-4 text-yellow-400 flex-shrink-0" />
                        <label className="text-xs sm:text-sm font-semibold text-yellow-300">Delivery Mode</label>
                      </div>
                      <div className={`badge ${getDeliveryModeColor(selectedDonation.delivery_mode)} mb-2`}>
                        {getDeliveryModeLabel(selectedDonation.delivery_mode)}
                      </div>
                      <p className="text-sm text-yellow-200">💡 {getDeliveryInstructions(selectedDonation.delivery_mode)}</p>
                    </div>

                    {/* Dates */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="bg-navy-800/30 rounded-lg p-4 border border-navy-700">
                        <div className="flex items-center gap-2 mb-2">
                          <Calendar className="h-4 w-4 text-orange-400" />
                          <label className="text-sm font-semibold text-yellow-300">Posted Date</label>
                        </div>
                        <p className="text-white">{formatDate(selectedDonation.created_at)}</p>
                      </div>

                      {selectedDonation.expiry_date && (
                        <div className="bg-navy-800/30 rounded-lg p-4 border border-navy-700">
                          <div className="flex items-center gap-2 mb-2">
                            <Clock className="h-4 w-4 text-red-400" />
                            <label className="text-sm font-semibold text-yellow-300">Expires On</label>
                          </div>
                          <p className="text-white">{formatDate(selectedDonation.expiry_date)}</p>
                        </div>
                      )}
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

                    {/* Action Note */}
                    <div className="bg-yellow-900/20 border border-yellow-500/20 rounded-lg p-4">
                      <p className="text-yellow-300 text-sm">
                        <strong>Interested?</strong> Click the "Request Donation" button to send a request to the donor. They will review and approve your request.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Footer */}
                <div className="p-4 sm:p-6 pt-3 sm:pt-4 border-t-2 border-yellow-500/20 flex flex-col sm:flex-row justify-between gap-3 flex-shrink-0">
                  {requestedDonations.has(selectedDonation.id) ? (
                    <button
                      disabled
                      className="flex-1 px-4 sm:px-6 py-2.5 bg-gray-600 text-gray-300 rounded-lg font-semibold flex items-center justify-center gap-2 cursor-not-allowed opacity-70"
                    >
                      <CheckCircle className="h-4 w-4" />
                      Request Already Sent
                    </button>
                  ) : (
                    <button
                      onClick={() => {
                        handleRequestDonation(selectedDonation)
                        setShowDetailsModal(false)
                      }}
                      disabled={claimingId === selectedDonation.id}
                      className="flex-1 px-4 sm:px-6 py-2.5 bg-gradient-to-r from-yellow-500 to-yellow-600 hover:from-yellow-600 hover:to-yellow-700 text-white rounded-lg font-semibold transition-all disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg hover:shadow-xl active:scale-95"
                    >
                      {claimingId === selectedDonation.id ? (
                        <LoadingSpinner size="sm" />
                      ) : (
                        <>
                          <Heart className="h-4 w-4" />
                          Request This Donation
                        </>
                      )}
                    </button>
                  )}
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

        {/* Donor Profile Modal */}
        <AnimatePresence>
          {showDonorProfileModal && selectedDonor && (
            <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-3 sm:p-4">
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                transition={{ duration: 0.2 }}
                className="bg-navy-900 border-2 border-yellow-500/30 shadow-2xl rounded-lg sm:rounded-xl p-4 sm:p-6 max-w-2xl w-full max-h-[95vh] sm:max-h-[90vh] overflow-y-auto custom-scrollbar"
              >
                {/* Header */}
                <div className="flex justify-between items-center mb-4 sm:mb-6 pb-3 sm:pb-4 border-b-2 border-yellow-500/20">
                  <div className="flex items-center gap-2 sm:gap-3">
                    <div className="p-1.5 sm:p-2 bg-yellow-500/10 rounded-lg">
                      <User className="h-4 w-4 sm:h-5 sm:w-5 text-yellow-400" />
                    </div>
                    <h3 className="text-lg sm:text-xl font-bold text-white">Donor Profile</h3>
                  </div>
                  <button
                    onClick={() => setShowDonorProfileModal(false)}
                    className="text-gray-400 hover:text-white transition-colors p-1.5 sm:p-2 hover:bg-navy-800 rounded-lg"
                    aria-label="Close profile modal"
                  >
                    <X className="h-5 w-5 sm:h-6 sm:w-6" />
                  </button>
                </div>

                {/* Profile Content */}
                <div className="space-y-4 sm:space-y-6">
                  {loadingDonorProfile ? (
                    <div className="flex flex-col items-center justify-center py-8 sm:py-12">
                      <div className="animate-spin rounded-full h-10 w-10 sm:h-12 sm:w-12 border-b-2 border-yellow-400 mb-3"></div>
                      <p className="text-yellow-300 text-sm">Loading profile...</p>
                    </div>
                  ) : (
                    <>
                      {/* Profile Header */}
                      <div className="flex flex-col sm:flex-row items-center sm:items-start gap-3 sm:gap-4">
                        <div className="flex-shrink-0">
                          {selectedDonor?.profile_image_url ? (
                            <img 
                              src={selectedDonor.profile_image_url} 
                              alt={selectedDonor?.name || 'Donor'}
                              className="h-20 w-20 sm:h-24 sm:w-24 rounded-full object-cover border-2 border-yellow-500 shadow-lg"
                            />
                          ) : (
                            <div className="h-20 w-20 sm:h-24 sm:w-24 rounded-full bg-navy-700 flex items-center justify-center border-2 border-yellow-500/30 shadow-lg">
                              <User className="h-10 w-10 sm:h-12 sm:w-12 text-yellow-400" />
                            </div>
                          )}
                        </div>
                        
                        <div className="flex-grow text-center sm:text-left">
                          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-2">
                            <h4 className="text-white font-bold text-lg sm:text-xl">
                              {selectedDonor?.name || selectedDonor?.full_name || 'Anonymous'}
                            </h4>
                            <div className="flex justify-center sm:justify-end">
                              <IDVerificationBadge
                                idStatus={selectedDonor?.id_verification_status}
                                hasIdUploaded={selectedDonor?.primary_id_type && selectedDonor?.primary_id_number}
                                size="sm"
                                showText={true}
                                showDescription={false}
                              />
                            </div>
                          </div>
                          <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 text-xs sm:text-sm">
                            <span className="text-yellow-400 flex items-center gap-1">
                              <Calendar className="h-3.5 w-3.5" />
                              {(() => {
                                const memberDate = selectedDonor?.created_at || selectedDonor?.user_created_at || selectedDonor?.joined_at || selectedDonor?.signup_date;
                                if (memberDate) {
                                  try {
                                    const date = new Date(memberDate);
                                    if (!isNaN(date.getTime())) {
                                      return `Member since ${date.toLocaleDateString('en-US', { 
                                        year: 'numeric', 
                                        month: 'long', 
                                        day: 'numeric' 
                                      })}`;
                                    }
                                  } catch (e) {
                                    console.error('Error parsing date:', e);
                                  }
                                }
                                return 'New member';
                              })()}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Contact Information */}
                      <div className="bg-navy-800/30 rounded-lg p-4 border border-yellow-500/20">
                        <h5 className="text-white font-semibold mb-3 flex items-center gap-2">
                          <Phone className="h-4 w-4 text-yellow-400" />
                          Contact Information
                        </h5>
                        <div className="space-y-3 text-sm">
                          <div className="flex items-start justify-between gap-4">
                            <span className="text-yellow-400 font-medium">Phone:</span>
                            {selectedDonor?.phone_number || selectedDonor?.phone ? (
                              <a
                                href={`tel:${selectedDonor.phone_number || selectedDonor.phone}`}
                                className="text-white hover:text-yellow-300 transition-colors flex items-center gap-1"
                              >
                                <Phone className="h-3.5 w-3.5" />
                                {selectedDonor.phone_number || selectedDonor.phone}
                              </a>
                            ) : (
                              <span className="text-gray-400 italic">Not provided</span>
                            )}
                          </div>
                          <div className="flex items-start justify-between gap-4">
                            <span className="text-yellow-400 font-medium">Email:</span>
                            {selectedDonor?.email ? (
                              <a
                                href={`mailto:${selectedDonor.email}`}
                                className="text-white hover:text-yellow-300 transition-colors break-all text-right"
                              >
                                {selectedDonor.email}
                              </a>
                            ) : (
                              <span className="text-gray-400 italic">Not provided</span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Location Information */}
                      <div className="bg-navy-800/30 rounded-lg p-4 border border-yellow-500/20">
                        <h5 className="text-white font-semibold mb-3 flex items-center gap-2">
                          <MapPin className="h-4 w-4 text-yellow-400" />
                          Location Information
                        </h5>
                        <div className="space-y-3 text-sm">
                          <div className="flex items-start justify-between gap-4">
                            <span className="text-yellow-400 font-medium">City:</span>
                            <span className="text-white text-right">
                              {selectedDonor?.city ? (
                                selectedDonor.city
                              ) : (
                                <span className="text-gray-400 italic">Not specified</span>
                              )}
                            </span>
                          </div>
                          <div className="flex items-start justify-between gap-4">
                            <span className="text-yellow-400 font-medium">Province:</span>
                            <span className="text-white text-right">
                              {selectedDonor?.province ? (
                                selectedDonor.province
                              ) : (
                                <span className="text-gray-400 italic">Not specified</span>
                              )}
                            </span>
                          </div>
                          {selectedDonor?.address && (
                            <div className="flex items-start justify-between gap-4">
                              <span className="text-yellow-400 font-medium">Address:</span>
                              <span className="text-white text-right leading-relaxed">
                                {selectedDonor.address}
                              </span>
                            </div>
                          )}
                          {selectedDonor?.address_barangay && (
                            <div className="flex items-start justify-between gap-4">
                              <span className="text-yellow-400 font-medium">Barangay:</span>
                              <span className="text-white text-right">
                                {selectedDonor.address_barangay}
                              </span>
                            </div>
                          )}
                          {(selectedDonor?.city || selectedDonor?.province) && (
                            <div className="pt-2 border-t border-yellow-500/20">
                              <div className="flex items-center gap-2 text-yellow-300">
                                <MapPin className="h-3.5 w-3.5" />
                                <span>
                                  {[selectedDonor?.city, selectedDonor?.province].filter(Boolean).join(', ')}
                                </span>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Bio */}
                      {selectedDonor?.bio && (
                        <div className="bg-navy-800/30 rounded-lg p-4 border border-yellow-500/20">
                          <h5 className="text-white font-semibold mb-3">About</h5>
                          <p className="text-white text-sm leading-relaxed">{selectedDonor.bio}</p>
                        </div>
                      )}
                    </>
                  )}
                </div>

                {/* Footer */}
                <div className="pt-4 mt-6 border-t-2 border-yellow-500/20">
                  <button
                    onClick={() => setShowDonorProfileModal(false)}
                    className="w-full px-4 py-2.5 bg-gradient-to-r from-yellow-500 to-yellow-600 hover:from-yellow-600 hover:to-yellow-700 text-white rounded-lg font-semibold transition-all shadow-lg hover:shadow-xl active:scale-95"
                  >
                    Close
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}

export default BrowseDonationsPage 