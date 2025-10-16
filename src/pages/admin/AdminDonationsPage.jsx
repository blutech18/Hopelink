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
  XCircle
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
      default: return 'text-skyblue-400 bg-skyblue-500/20'
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
    alert(`Donation Details:\n\nTitle: ${donation.title}\nDescription: ${donation.description}\nDonor: ${donation.donor?.name || 'Unknown'}\nCategory: ${donation.category}\nStatus: ${donation.status}\nLocation: ${donation.pickup_location || donation.city || 'Not specified'}\nPosted: ${new Date(donation.created_at).toLocaleDateString()}`)
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
            <Package className="h-8 w-8 text-green-400" />
            <div>
              <h1 className="text-3xl font-bold text-white">Donations Management</h1>
              <p className="text-skyblue-300">Monitor and manage all platform donations</p>
            </div>
          </div>

          {/* Filters */}
          <div className="flex flex-col lg:flex-row gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-skyblue-400" />
              <input
                type="text"
                placeholder="Search donations by title or donor..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-navy-800 border border-navy-700 rounded-lg text-white placeholder-skyblue-400 focus:outline-none focus:ring-2 focus:ring-skyblue-500"
              />
            </div>
            
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-4 py-2 bg-navy-800 border border-navy-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-skyblue-500"
            >
              <option value="all">All Statuses</option>
              <option value="available">Available</option>
              <option value="claimed">Claimed</option>
              <option value="delivered">Delivered</option>
              <option value="expired">Expired</option>
            </select>

            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="px-4 py-2 bg-navy-800 border border-navy-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-skyblue-500"
            >
              <option value="all">All Categories</option>
              <option value="Food">Food</option>
              <option value="Clothing">Clothing</option>
              <option value="Education">Education</option>
              <option value="Healthcare">Healthcare</option>
              <option value="Household">Household</option>
            </select>
          </div>
        </motion.div>

        {/* Stats */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8"
        >
          <div className="card p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-skyblue-300 text-sm">Total Donations</p>
                <p className="text-2xl font-bold text-white">{donations.length}</p>
              </div>
              <Package className="h-8 w-8 text-green-400" />
            </div>
          </div>
          
          <div className="card p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-skyblue-300 text-sm">Available</p>
                <p className="text-2xl font-bold text-white">
                  {donations.filter(d => d.status === 'available').length}
                </p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-400" />
            </div>
          </div>
          
          <div className="card p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-skyblue-300 text-sm">Claimed</p>
                <p className="text-2xl font-bold text-white">
                  {donations.filter(d => d.status === 'claimed').length}
                </p>
              </div>
              <Clock className="h-8 w-8 text-yellow-400" />
            </div>
          </div>
          
          <div className="card p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-skyblue-300 text-sm">Delivered</p>
                <p className="text-2xl font-bold text-white">
                  {donations.filter(d => d.status === 'delivered').length}
                </p>
              </div>
              <Package className="h-8 w-8 text-blue-400" />
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
                  <th className="px-6 py-4 text-left text-xs font-medium text-skyblue-300 uppercase tracking-wider">
                    Donation
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-skyblue-300 uppercase tracking-wider">
                    Donor
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-skyblue-300 uppercase tracking-wider">
                    Category
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-skyblue-300 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-skyblue-300 uppercase tracking-wider">
                    Posted
                  </th>
                  <th className="px-6 py-4 text-right text-xs font-medium text-skyblue-300 uppercase tracking-wider">
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
                          <div className="text-sm text-skyblue-400 truncate max-w-xs">
                            {donation.description}
                          </div>
                          <div className="flex items-center mt-1 text-xs text-skyblue-500">
                            <MapPin className="h-3 w-3 mr-1" />
                            {donation.pickup_location || donation.city || 'Location not specified'}
                          </div>
                        </div>
                      </td>
                      
                      <td className="px-6 py-4">
                        <div>
                          <div className="text-sm font-medium text-white">{donation.donor?.name || 'Unknown'}</div>
                          <div className="text-sm text-skyblue-400">{donation.donor?.email || 'No email'}</div>
                        </div>
                      </td>
                      
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-skyblue-500/20 text-skyblue-400">
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
                        <div className="flex items-center text-sm text-skyblue-400">
                          <Calendar className="h-4 w-4 mr-1" />
                          {new Date(donation.created_at).toLocaleDateString()}
                        </div>
                      </td>
                      
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end space-x-2">
                          <button
                            onClick={() => handleViewDonation(donation)}
                            className="p-2 text-skyblue-400 hover:text-skyblue-300 hover:bg-navy-800 rounded-lg transition-colors"
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
              <Package className="h-12 w-12 text-skyblue-400 mx-auto mb-4" />
              <p className="text-skyblue-300">No donations found</p>
              <p className="text-skyblue-400 text-sm">
                {searchTerm || statusFilter !== 'all' || categoryFilter !== 'all'
                  ? 'Try adjusting your filters'
                  : 'Donations will appear here as they are posted'
                }
              </p>
            </div>
          )}
        </motion.div>
      </div>

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