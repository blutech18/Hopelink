import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { 
  Package, 
  Search, 
  Filter,
  Eye,
  Edit,
  Archive,
  MapPin,
  Calendar,
  User,
  CheckCircle,
  Clock,
  XCircle,
  X
} from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import { db } from '../../lib/supabase'
import { ListPageSkeleton } from '../../components/ui/Skeleton'
import ConfirmationModal from '../../components/ui/ConfirmationModal'

const AdminDonationsPage = () => {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [donations, setDonations] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [selectedDonation, setSelectedDonation] = useState(null)
  const [showModal, setShowModal] = useState(false)
  const [showArchiveConfirmation, setShowArchiveConfirmation] = useState(false)
  const [donationToArchive, setDonationToArchive] = useState(null)

  useEffect(() => {
    loadDonations()
  }, [])

  const loadDonations = async () => {
    try {
      setLoading(true)
      
      // Fetch recent donations with limit for better performance
      const donationsData = await db.getDonations({ limit: 100 })
      setDonations(donationsData || [])
    } catch (error) {
      console.error('Error loading donations:', error)
      setDonations([]) // Fallback to empty array on error
    } finally {
      setLoading(false)
    }
  }

  const filteredDonations = donations.filter(donation => {
    const donorName = donation.donor?.name || ''
    const matchesSearch = donation.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         donorName.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesStatus = statusFilter === 'all' || donation.status === statusFilter
    const matchesCategory = categoryFilter === 'all' || donation.category === categoryFilter
    
    return matchesSearch && matchesStatus && matchesCategory
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
      case 'delivered': return Package
      case 'expired': return XCircle
      default: return Clock
    }
  }

  const handleViewDonation = (donation) => {
    setSelectedDonation(donation)
    setShowModal(true)
  }

  const handleArchiveDonation = async (donationId) => {
    setDonationToArchive(donationId)
    setShowArchiveConfirmation(true)
  }

  const confirmArchiveDonation = async () => {
    if (!donationToArchive) return
    
    try {
      await db.updateDonation(donationToArchive, { status: 'archived' })
      await loadDonations()
      setShowArchiveConfirmation(false)
      setDonationToArchive(null)
    } catch (error) {
      console.error('Error archiving donation:', error)
      alert('Failed to archive donation. Please try again.')
    }
  }

  if (loading) {
    return <ListPageSkeleton />
  }

  return (
    <div className="min-h-screen py-8 custom-scrollbar" style={{backgroundColor: '#00237d'}}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex items-center space-x-3 mb-6">
            <div>
              <h1 className="text-3xl font-bold text-white">Donations Management</h1>
              <p className="text-yellow-300">Monitor and manage all platform donations</p>
            </div>
          </div>

          {/* Filters */}
          <div className="flex flex-col lg:flex-row gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-yellow-400" />
              <input
                type="text"
                placeholder="Search donations by title or donor..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-navy-800 border-2 border-navy-700 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-yellow-500 focus:ring-2 focus:ring-yellow-500/20 transition-all duration-200"
              />
            </div>
            
            <div className="relative">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="appearance-none px-5 py-3 pr-10 bg-navy-800 border-2 border-navy-700 rounded-lg text-white font-medium focus:outline-none focus:border-yellow-500 focus:ring-2 focus:ring-yellow-500/20 transition-all duration-200 cursor-pointer hover:border-yellow-600"
              >
                <option value="all">All Statuses</option>
                <option value="available">Available</option>
                <option value="claimed">Claimed</option>
                <option value="delivered">Delivered</option>
                <option value="expired">Expired</option>
              </select>
              <Filter className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-yellow-400 pointer-events-none" />
            </div>

            <div className="relative">
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="appearance-none px-5 py-3 pr-10 bg-navy-800 border-2 border-navy-700 rounded-lg text-white font-medium focus:outline-none focus:border-yellow-500 focus:ring-2 focus:ring-yellow-500/20 transition-all duration-200 cursor-pointer hover:border-yellow-600"
              >
                <option value="all">All Categories</option>
                <option value="Food">Food</option>
                <option value="Clothing">Clothing</option>
                <option value="Education">Education</option>
                <option value="Healthcare">Healthcare</option>
                <option value="Household">Household</option>
              </select>
              <Filter className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-yellow-400 pointer-events-none" />
            </div>
          </div>
        </motion.div>

        {/* Stats */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8"
        >
          <div className="card p-4 sm:p-6">
            <div className="flex items-center space-x-3">
              <Package className="h-6 w-6 sm:h-8 sm:w-8 text-green-400" />
              <div className="flex flex-col">
                <p className="text-xl sm:text-2xl font-bold text-white">{donations.length}</p>
                <p className="text-yellow-300 text-xs sm:text-sm">Total Donations</p>
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
              <Clock className="h-6 w-6 sm:h-8 sm:w-8 text-yellow-400" />
              <div className="flex flex-col">
                <p className="text-xl sm:text-2xl font-bold text-white">
                  {donations.filter(d => d.status === 'claimed').length}
                </p>
                <p className="text-yellow-300 text-xs sm:text-sm">Claimed</p>
              </div>
            </div>
          </div>
          
          <div className="card p-4 sm:p-6">
            <div className="flex items-center space-x-3">
              <Package className="h-6 w-6 sm:h-8 sm:w-8 text-blue-400" />
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
            <table className="w-full">
              <thead className="bg-navy-800">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-medium text-yellow-300 uppercase tracking-wider">
                    Donation
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-yellow-300 uppercase tracking-wider">
                    Donor
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-yellow-300 uppercase tracking-wider">
                    Category
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-yellow-300 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-yellow-300 uppercase tracking-wider">
                    Posted
                  </th>
                  <th className="px-6 py-4 text-right text-xs font-medium text-yellow-300 uppercase tracking-wider">
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
                      <td className="px-6 py-4">
                        <div>
                          <div className="text-sm font-medium text-white">{donation.title}</div>
                          <div className="text-sm text-yellow-400 truncate max-w-xs">
                            {donation.description}
                          </div>
                          <div className="flex items-center mt-1 text-xs text-yellow-500">
                            <MapPin className="h-3 w-3 mr-1" />
                            {donation.pickup_location || donation.city || 'Location not specified'}
                          </div>
                        </div>
                      </td>
                      
                      <td className="px-6 py-4">
                        <div>
                          <div className="text-sm font-medium text-white">{donation.donor?.name || 'Unknown'}</div>
                          <div className="text-sm text-yellow-400">{donation.donor?.email || 'No email'}</div>
                        </div>
                      </td>
                      
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-500/20 text-yellow-400">
                          {donation.category}
                        </span>
                      </td>
                      
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(donation.status)}`}>
                          <StatusIcon className="h-3 w-3 mr-1" />
                          {donation.status}
                        </span>
                      </td>
                      
                      <td className="px-6 py-4">
                        <div className="flex items-center text-sm text-yellow-400">
                          <Calendar className="h-4 w-4 mr-1" />
                          {new Date(donation.created_at).toLocaleDateString()}
                        </div>
                      </td>
                      
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end space-x-2">
                          <button
                            onClick={() => handleViewDonation(donation)}
                            className="p-2 text-yellow-400 hover:text-yellow-300 hover:bg-navy-800 rounded-lg transition-colors"
                            title="View Details"
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleArchiveDonation(donation.id)}
                            className="p-2 text-orange-400 hover:text-orange-300 hover:bg-navy-800 rounded-lg transition-colors"
                            title="Archive"
                          >
                            <Archive className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </motion.tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          
          {filteredDonations.length === 0 && (
            <div className="text-center py-12">
              <Package className="h-12 w-12 text-yellow-400 mx-auto mb-4" />
              <p className="text-yellow-300">No donations found</p>
              <p className="text-yellow-400 text-sm">
                {searchTerm || statusFilter !== 'all' || categoryFilter !== 'all'
                  ? 'Try adjusting your filters'
                  : 'Donations will appear here as they are posted'
                }
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
            <div className="sticky top-0 bg-navy-900 border-b-2 border-yellow-500/20 px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-yellow-500/10 flex items-center justify-center">
                  <Package className="h-5 w-5 text-yellow-400" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white">Donation Details</h3>
                  <p className="text-xs text-gray-400">Complete donation information</p>
                </div>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="p-2 rounded-lg hover:bg-navy-800 text-gray-400 hover:text-yellow-400 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 space-y-5 overflow-y-auto">
              {/* Basic Information */}
              <div className="bg-navy-800/50 rounded-lg p-4 border border-navy-700">
                <div className="flex items-center gap-2 mb-4 pb-3 border-b border-navy-700">
                  <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center">
                    <Package className="h-4 w-4 text-blue-400" />
                  </div>
                  <h4 className="text-sm font-semibold text-white">Basic Information</h4>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                  <div className="md:col-span-2">
                    <label className="block text-xs font-medium text-gray-400 mb-1">Description</label>
                    <p className="text-sm text-gray-300 leading-relaxed">{selectedDonation.description}</p>
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
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-400 mb-1">Name</label>
                    <p className="text-sm text-white font-medium">{selectedDonation.donor?.name || 'Anonymous'}</p>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-400 mb-1">Email</label>
                    <p className="text-sm text-white">{selectedDonation.donor?.email || 'Not provided'}</p>
                  </div>
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
            </div>

            {/* Modal Footer */}
            <div className="sticky bottom-0 bg-navy-900 border-t border-navy-700 px-6 py-4 flex justify-end">
              <button
                onClick={() => setShowModal(false)}
                className="px-6 py-3 bg-gradient-to-r from-yellow-600 to-yellow-500 hover:from-yellow-500 hover:to-yellow-400 text-white rounded-lg font-bold transition-all duration-200 transform hover:scale-105 shadow-lg flex items-center gap-2"
              >
                <CheckCircle className="h-4 w-4" />
                Close
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Confirmation Modal */}
      <ConfirmationModal
        isOpen={showArchiveConfirmation}
        onClose={() => {
          setShowArchiveConfirmation(false)
          setDonationToArchive(null)
        }}
        onConfirm={confirmArchiveDonation}
        title="Archive Donation"
        message="Are you sure you want to archive this donation? This action will move the donation to archived status."
        confirmText="Yes, Archive"
        cancelText="Cancel"
        type="warning"
        confirmButtonVariant="danger"
      />
    </div>
  )
}

export default AdminDonationsPage 