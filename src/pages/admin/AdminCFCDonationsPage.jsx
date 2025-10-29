import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { 
  Building, 
  Package,
  Search, 
  Filter,
  Eye,
  CheckCircle,
  Clock,
  Truck,
  MapPin,
  Calendar,
  User,
  XCircle,
  AlertCircle,
  Phone,
  Mail,
  RefreshCw,
  X
} from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import { db } from '../../lib/supabase'
import { ListPageSkeleton } from '../../components/ui/Skeleton'
import LoadingSpinner from '../../components/ui/LoadingSpinner'

const AdminCFCDonationsPage = () => {
  const { user } = useAuth()
  const [donations, setDonations] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [selectedDonation, setSelectedDonation] = useState(null)
  const [showModal, setShowModal] = useState(false)
  const [updatingStatus, setUpdatingStatus] = useState(false)
  const [selectedImage, setSelectedImage] = useState(null)
  const [showImageModal, setShowImageModal] = useState(false)

  useEffect(() => {
    loadCFCDonations()
  }, [])

  const loadCFCDonations = async () => {
    try {
      setLoading(true)
      
      // Fetch all donations and filter for CFC-GK donations
      const donationsData = await db.getDonations({ limit: 500 })
      
      // Filter for CFC-GK donations
      const cfcDonations = donationsData.filter(donation => 
        donation.donation_destination === 'organization'
      )
      
      setDonations(cfcDonations || [])
    } catch (error) {
      console.error('Error loading CFC-GK donations:', error)
      setDonations([])
    } finally {
      setLoading(false)
    }
  }

  const filteredDonations = donations.filter(donation => {
    const donorName = donation.donor?.name || ''
    const matchesSearch = donation.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         donorName.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesStatus = statusFilter === 'all' || donation.status === statusFilter
    
    return matchesSearch && matchesStatus
  })

  const getStatusColor = (status) => {
    switch (status) {
      case 'available': return 'text-green-400 bg-green-500/20'
      case 'claimed': return 'text-yellow-400 bg-yellow-500/20'
      case 'delivered': return 'text-blue-400 bg-blue-500/20'
      case 'expired': return 'text-red-400 bg-red-500/20'
      default: return 'text-yellow-400 bg-yellow-500/20'
    }
  }

  const getStatusIcon = (status) => {
    switch (status) {
      case 'available': return CheckCircle
      case 'claimed': return Clock
      case 'delivered': return Truck
      case 'expired': return XCircle
      default: return Clock
    }
  }

  const getDeliveryModeLabel = (mode) => {
    switch (mode) {
      case 'donor_delivery': return 'Donor will deliver to CFC-GK'
      case 'volunteer': return 'Volunteer delivery to CFC-GK'
      case 'organization_pickup': return 'CFC-GK will pick up'
      default: return mode || 'Not specified'
    }
  }

  const handleViewDonation = (donation) => {
    setSelectedDonation(donation)
    setShowModal(true)
  }

  const handleStatusUpdate = async (donationId, newStatus) => {
    try {
      setUpdatingStatus(true)
      await db.updateDonation(donationId, { status: newStatus })
      await loadCFCDonations()
      
      // Update selected donation if modal is open
      if (selectedDonation && selectedDonation.id === donationId) {
        setSelectedDonation({ ...selectedDonation, status: newStatus })
      }
    } catch (error) {
      console.error('Error updating donation status:', error)
      alert('Failed to update status. Please try again.')
    } finally {
      setUpdatingStatus(false)
    }
  }

  if (loading) {
    return <ListPageSkeleton />
  }

  return (
    <div className="min-h-screen py-4 sm:py-8 custom-scrollbar" style={{backgroundColor: '#00237d'}}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6 sm:mb-8"
        >
          <div className="flex items-center gap-3 sm:gap-4 mb-6">
            <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-lg flex-shrink-0">
              <Building className="w-6 h-6 sm:w-7 sm:h-7 text-white" />
            </div>
            <div className="min-w-0">
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white">Direct Donations</h1>
              <p className="text-yellow-300 text-xs sm:text-sm">Manage donations directly to organization</p>
            </div>
          </div>

          {/* Filters */}
          <div className="flex flex-col gap-3 sm:gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-yellow-400 flex-shrink-0" />
                <input
                type="text"
                placeholder="Search direct donations..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-3 sm:py-2.5 bg-navy-800 border-2 border-navy-700 rounded-lg text-white text-sm sm:text-base placeholder-gray-400 focus:outline-none focus:border-yellow-500 focus:ring-2 focus:ring-yellow-500/20 transition-all duration-200"
              />
            </div>
            
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="appearance-none w-full px-5 py-3 sm:py-2.5 pr-10 bg-navy-800 border-2 border-navy-700 rounded-lg text-white text-sm sm:text-base font-medium focus:outline-none focus:border-yellow-500 focus:ring-2 focus:ring-yellow-500/20 transition-all duration-200 cursor-pointer hover:border-yellow-600"
                >
                  <option value="all">All Statuses</option>
                  <option value="available">Available</option>
                  <option value="delivered">Delivered (Pending Admin Approval)</option>
                  <option value="claimed">Claimed (Completed)</option>
                </select>
                <Filter className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-yellow-400 pointer-events-none" />
              </div>
              
              <button
                onClick={loadCFCDonations}
                className="w-full sm:w-auto px-5 py-2.5 bg-navy-800 hover:bg-navy-700 text-white rounded-lg text-sm sm:text-base font-medium transition-all border-2 border-navy-700 hover:border-yellow-500 flex items-center justify-center gap-2"
              >
                <RefreshCw className="h-4 w-4" />
                Refresh
              </button>
            </div>
          </div>
        </motion.div>

        {/* Stats */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6 mb-6 sm:mb-8"
        >
          <div className="card p-4 sm:p-6">
            <div className="flex items-center space-x-3">
              <Building className="h-6 w-6 sm:h-8 sm:w-8 text-blue-400" />
              <div className="flex flex-col">
                <p className="text-xl sm:text-2xl font-bold text-white">{donations.length}</p>
                <p className="text-yellow-300 text-xs sm:text-sm">Total Direct Donations</p>
              </div>
            </div>
          </div>
          
          <div className="card p-4 sm:p-6">
            <div className="flex items-center space-x-3">
              <CheckCircle className="h-6 w-6 sm:h-8 sm:w-8 text-green-400" />
              <div className="flex flex-col">
                <p className="text-xl sm:text-2xl font-bold text-white">
                  {donations.filter(d => d.status === 'available').length}
                </p>
                <p className="text-yellow-300 text-xs sm:text-sm">Available</p>
              </div>
            </div>
          </div>
          
          <div className="card p-4 sm:p-6">
            <div className="flex items-center space-x-3">
              <Truck className="h-6 w-6 sm:h-8 sm:w-8 text-blue-400" />
              <div className="flex flex-col">
                <p className="text-xl sm:text-2xl font-bold text-white">
                  {donations.filter(d => d.status === 'delivered').length}
                </p>
                <p className="text-yellow-300 text-xs sm:text-sm">Delivered</p>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Donations List */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="card overflow-hidden"
        >
          <div className="overflow-x-auto custom-scrollbar">
            <div className="min-w-[800px]">
            <table className="w-full">
              <thead className="bg-navy-800">
                <tr>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold text-yellow-300 uppercase tracking-wider">
                    Donation
                  </th>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold text-yellow-300 uppercase tracking-wider">
                    Donor
                  </th>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold text-yellow-300 uppercase tracking-wider">
                    Delivery
                  </th>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold text-yellow-300 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold text-yellow-300 uppercase tracking-wider">
                    Posted
                  </th>
                  <th className="px-4 py-2.5 text-right text-xs font-semibold text-yellow-300 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-navy-700">
                {filteredDonations.map((donation, index) => {
                  const StatusIcon = getStatusIcon(donation.status)
                  
                  return (
                    <motion.tr
                      key={donation.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className="hover:bg-navy-800/50"
                    >
                      <td className="px-4 py-2.5">
                        <div className="flex items-center gap-2">
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs font-medium bg-blue-500/20 text-blue-400 border border-blue-500/30">
                            <Building className="h-2.5 w-2.5" />
                            Direct
                          </span>
                          <span className="text-sm font-medium text-white truncate max-w-xs">{donation.title}</span>
                        </div>
                      </td>
                      
                      <td className="px-4 py-2.5">
                        <div className="text-xs text-white truncate max-w-xs">{donation.donor?.name || 'Unknown'}</div>
                      </td>
                      
                      <td className="px-4 py-2.5">
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-blue-500/20 text-blue-400 truncate max-w-[120px]">
                          {getDeliveryModeLabel(donation.delivery_mode)}
                        </span>
                      </td>
                      
                      <td className="px-4 py-2.5">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${getStatusColor(donation.status)}`}>
                          <StatusIcon className="h-2.5 w-2.5 mr-1" />
                          {donation.status}
                        </span>
                      </td>
                      
                      <td className="px-4 py-2.5">
                        <div className="text-xs text-yellow-400">
                          {new Date(donation.created_at).toLocaleDateString()}
                        </div>
                      </td>
                      
                      <td className="px-4 py-2.5 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => handleViewDonation(donation)}
                            className="p-1.5 text-yellow-400 hover:text-yellow-300 hover:bg-navy-800 rounded transition-all active:scale-95"
                            title="View Details"
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                          
                          {/* Status Update Button */}
                          {/* For volunteer delivery: only show after volunteer marks as delivered */}
                          {donation.status === 'delivered' && donation.delivery_mode === 'volunteer' && (
                            <button
                              onClick={() => handleStatusUpdate(donation.id, 'claimed')}
                              disabled={updatingStatus}
                              className="px-2 py-1 text-xs font-medium bg-green-600 hover:bg-green-700 text-white rounded transition-all disabled:opacity-50 disabled:cursor-not-allowed active:scale-95 flex items-center"
                              title="Mark as Claimed"
                            >
                              <CheckCircle className="h-3 w-3" />
                            </button>
                          )}
                          
                          {/* For donor delivery or organization pickup: can mark as claimed directly */}
                          {donation.status === 'available' && (donation.delivery_mode === 'donor_delivery' || donation.delivery_mode === 'organization_pickup') && (
                            <button
                              onClick={() => handleStatusUpdate(donation.id, 'claimed')}
                              disabled={updatingStatus}
                              className="px-2 py-1 text-xs font-medium bg-blue-600 hover:bg-blue-700 text-white rounded transition-all disabled:opacity-50 disabled:cursor-not-allowed active:scale-95 flex items-center"
                              title="Mark as Claimed"
                            >
                              <CheckCircle className="h-3 w-3" />
                            </button>
                          )}
                        </div>
                      </td>
                    </motion.tr>
                  )
                })}
              </tbody>
            </table>
            </div>
          </div>
          
          {filteredDonations.length === 0 && (
            <div className="text-center py-12">
              <Building className="h-12 w-12 text-yellow-400 mx-auto mb-4" />
              <p className="text-yellow-300">No direct donations found</p>
              <p className="text-yellow-400 text-sm">
                {searchTerm || statusFilter !== 'all'
                  ? 'Try adjusting your filters'
                  : 'Direct donations will appear here as they are posted'}
              </p>
            </div>
          )}
        </motion.div>
      </div>

      {/* Donation Details Modal */}
      {showModal && selectedDonation && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50" onClick={() => setShowModal(false)}>
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="card max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="sticky top-0 bg-navy-900 border-b-2 border-blue-500/20 px-4 sm:px-6 py-4 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center flex-shrink-0">
                  <Building className="h-5 w-5 text-blue-400" />
                </div>
                <div className="min-w-0">
                  <h3 className="text-lg sm:text-xl font-bold text-white">Direct Donation Details</h3>
                  <p className="text-xs text-gray-400 hidden sm:block">Complete donation information</p>
                </div>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="p-2 rounded-lg hover:bg-navy-800 text-gray-400 hover:text-yellow-400 transition-colors flex-shrink-0"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-4 sm:p-6 space-y-4 sm:space-y-5 overflow-y-auto">
              {/* Basic Information */}
              <div className="bg-navy-800/50 rounded-lg p-4 border border-navy-700">
                <div className="flex items-center gap-2 mb-4 pb-3 border-b border-navy-700">
                  <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center">
                    <Package className="h-4 w-4 text-blue-400" />
                  </div>
                  <h4 className="text-sm font-semibold text-white">Donation Information</h4>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-400 mb-1">Title</label>
                    <p className="text-sm text-white font-medium">{selectedDonation.title}</p>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-400 mb-1">Category</label>
                    <span className="inline-flex px-3 py-1 rounded-full text-xs font-semibold bg-yellow-500/20 text-yellow-400">
                      {selectedDonation.category}
                    </span>
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-medium text-gray-400 mb-1">Description</label>
                    <p className="text-sm text-gray-300 leading-relaxed">{selectedDonation.description}</p>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-400 mb-1">Delivery Mode</label>
                    <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-blue-500/20 text-blue-400 border border-blue-500/30">
                      <Building className="h-4 w-4" />
                      {getDeliveryModeLabel(selectedDonation.delivery_mode)}
                    </span>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-400 mb-1">Status</label>
                    <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${getStatusColor(selectedDonation.status)}`}>
                      {selectedDonation.status}
                    </span>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-400 mb-1">Posted Date</label>
                    <p className="text-sm text-white">{new Date(selectedDonation.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
                  </div>
                </div>
              </div>

              {/* Donor Information */}
              <div className="bg-navy-800/50 rounded-lg p-4 border border-navy-700">
                <div className="flex items-center gap-2 mb-4 pb-3 border-b border-navy-700">
                  <div className="w-8 h-8 rounded-lg bg-green-500/10 flex items-center justify-center">
                    <User className="h-4 w-4 text-green-400" />
                  </div>
                  <h4 className="text-sm font-semibold text-white">Donor Information</h4>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-400 mb-1">Name</label>
                    <p className="text-sm text-white font-medium">{selectedDonation.donor?.name || 'Anonymous'}</p>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-400 mb-1">Email</label>
                    <p className="text-sm text-white">{selectedDonation.donor?.email || 'Not provided'}</p>
                  </div>
                  {selectedDonation.donor?.phone_number && (
                    <div className="sm:col-span-2">
                      <label className="block text-xs font-medium text-gray-400 mb-1">Phone</label>
                      <p className="text-sm text-white">{selectedDonation.donor.phone_number}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Location Information */}
              <div className="bg-navy-800/50 rounded-lg p-4 border border-navy-700">
                <div className="flex items-center gap-2 mb-4 pb-3 border-b border-navy-700">
                  <div className="w-8 h-8 rounded-lg bg-purple-500/10 flex items-center justify-center">
                    <MapPin className="h-4 w-4 text-purple-400" />
                  </div>
                  <h4 className="text-sm font-semibold text-white">Location Information</h4>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-400 mb-1">Pickup Location</label>
                  <p className="text-sm text-white">{selectedDonation.pickup_location || selectedDonation.city || 'Not specified'}</p>
                </div>
              </div>

              {/* Images Section */}
              {selectedDonation.images && selectedDonation.images.length > 0 && (
                <div className="bg-navy-800/50 rounded-lg p-4 border border-navy-700">
                  <div className="flex items-center gap-2 mb-4 pb-3 border-b border-navy-700">
                    <div className="w-8 h-8 rounded-lg bg-pink-500/10 flex items-center justify-center">
                      <Package className="h-4 w-4 text-pink-400" />
                    </div>
                    <h4 className="text-sm font-semibold text-white">Donation Images</h4>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {selectedDonation.images.map((image, index) => (
                      <div 
                        key={index} 
                        className="relative group cursor-pointer"
                        onClick={() => {
                          setSelectedImage(image)
                          setShowImageModal(true)
                        }}
                      >
                        <img
                          src={image}
                          alt={`Donation ${index + 1}`}
                          className="w-full h-32 object-cover rounded-lg border border-navy-700 hover:border-yellow-500 transition-all"
                        />
                        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center pointer-events-none">
                          <Eye className="h-6 w-6 text-white" />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="sticky bottom-0 bg-navy-900 border-t border-navy-700 px-4 sm:px-6 py-4 flex flex-col gap-4">
              {/* Status Update Section */}
              <div className="flex flex-col gap-3">
                {/* For volunteer delivery - waiting for volunteer */}
                {selectedDonation.status === 'available' && selectedDonation.delivery_mode === 'volunteer' && (
                  <div className="bg-yellow-900/20 border border-yellow-500/30 rounded-lg p-4">
                    <div className="flex items-center gap-3">
                      <Clock className="h-5 w-5 text-yellow-400 flex-shrink-0" />
                      <div>
                        <p className="text-sm font-medium text-yellow-300">Waiting for volunteer to deliver</p>
                        <p className="text-xs text-yellow-400 mt-1">Admin can only mark as 'Claimed' after volunteer marks as 'Delivered'</p>
                      </div>
                    </div>
                  </div>
                )}
                
                {/* For volunteer delivery - volunteer has delivered */}
                {selectedDonation.status === 'delivered' && selectedDonation.delivery_mode === 'volunteer' && (
                  <div className="bg-green-900/20 border border-green-500/30 rounded-lg p-4">
                    <div className="flex items-start gap-3">
                      <CheckCircle className="h-5 w-5 text-green-400 flex-shrink-0 mt-0.5" />
                      <div className="flex-1">
                        <p className="text-sm font-medium text-green-300 mb-2">Volunteer has marked this as delivered</p>
                        <button
                          onClick={() => {
                            handleStatusUpdate(selectedDonation.id, 'claimed')
                            setShowModal(false)
                          }}
                          disabled={updatingStatus}
                          className="px-6 py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-lg font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed active:scale-95 shadow-lg flex items-center gap-2"
                        >
                          {updatingStatus ? (
                            <>
                              <RefreshCw className="h-4 w-4 animate-spin" />
                              Updating...
                            </>
                          ) : (
                            <>
                              <CheckCircle className="h-4 w-4" />
                              Mark as Claimed
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                )}
                
                {/* For donor delivery - can mark as claimed */}
                {selectedDonation.status === 'available' && selectedDonation.delivery_mode === 'donor_delivery' && (
                  <div className="bg-blue-900/20 border border-blue-500/30 rounded-lg p-4">
                    <div className="flex items-start gap-3">
                      <Truck className="h-5 w-5 text-blue-400 flex-shrink-0 mt-0.5" />
                      <div className="flex-1">
                        <p className="text-sm font-medium text-blue-300 mb-2">Donor will deliver directly to organization</p>
                        <button
                          onClick={() => {
                            handleStatusUpdate(selectedDonation.id, 'claimed')
                            setShowModal(false)
                          }}
                          disabled={updatingStatus}
                          className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed active:scale-95 shadow-lg flex items-center gap-2"
                        >
                          {updatingStatus ? (
                            <>
                              <RefreshCw className="h-4 w-4 animate-spin" />
                              Updating...
                            </>
                          ) : (
                            <>
                              <CheckCircle className="h-4 w-4" />
                              Mark as Claimed (Donor Delivered)
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                )}
                
                {/* For organization pickup - can mark as claimed */}
                {selectedDonation.status === 'available' && selectedDonation.delivery_mode === 'organization_pickup' && (
                  <div className="bg-purple-900/20 border border-purple-500/30 rounded-lg p-4">
                    <div className="flex items-start gap-3">
                      <MapPin className="h-5 w-5 text-purple-400 flex-shrink-0 mt-0.5" />
                      <div className="flex-1">
                        <p className="text-sm font-medium text-purple-300 mb-2">Organization will pick up from donor location</p>
                        <button
                          onClick={() => {
                            handleStatusUpdate(selectedDonation.id, 'claimed')
                            setShowModal(false)
                          }}
                          disabled={updatingStatus}
                          className="px-6 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed active:scale-95 shadow-lg flex items-center gap-2"
                        >
                          {updatingStatus ? (
                            <>
                              <RefreshCw className="h-4 w-4 animate-spin" />
                              Updating...
                            </>
                          ) : (
                            <>
                              <CheckCircle className="h-4 w-4" />
                              Mark as Claimed (Picked Up)
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                )}
                
                {/* Claimed/Completed status */}
                {selectedDonation.status === 'claimed' && (
                  <div className="bg-blue-900/20 border border-blue-500/30 rounded-lg p-4">
                    <div className="flex items-center gap-3">
                      <CheckCircle className="h-5 w-5 text-blue-400 flex-shrink-0" />
                      <p className="text-sm font-medium text-blue-300">This donation has been claimed and completed.</p>
                    </div>
                  </div>
                )}
              </div>
              
              {/* Close Button */}
              <button
                onClick={() => setShowModal(false)}
                className="w-full px-6 py-3 bg-gradient-to-r from-yellow-600 to-yellow-500 hover:from-yellow-500 hover:to-yellow-400 text-white rounded-lg font-bold transition-all duration-200 transform hover:scale-105 active:scale-95 shadow-lg flex items-center justify-center gap-2"
              >
                <X className="h-4 w-4 flex-shrink-0" />
                Close
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Image View Modal */}
      {showImageModal && selectedImage && (
        <div 
          className="fixed inset-0 bg-black/90 backdrop-blur-sm flex items-center justify-center p-4 z-[60]" 
          onClick={() => setShowImageModal(false)}
        >
          <div className="relative max-w-5xl max-h-[90vh] w-full h-full flex items-center justify-center">
            <img
              src={selectedImage}
              alt="Full size donation image"
              className="max-w-full max-h-full object-contain rounded-lg"
              onClick={(e) => e.stopPropagation()}
            />
            <button
              onClick={() => setShowImageModal(false)}
              className="absolute top-4 right-4 p-2 bg-black/70 hover:bg-black/90 text-white rounded-full transition-all"
            >
              <X className="h-6 w-6" />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default AdminCFCDonationsPage

