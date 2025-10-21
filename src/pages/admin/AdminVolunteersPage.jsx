import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { 
  Truck, 
  Search, 
  User,
  MapPin,
  Calendar,
  Star,
  CheckCircle,
  Clock,
  Package,
  Phone,
  Mail,
  Award
} from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import { db } from '../../lib/supabase'
import { ListPageSkeleton } from '../../components/ui/Skeleton'

const AdminVolunteersPage = () => {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [volunteers, setVolunteers] = useState([])
  const [deliveries, setDeliveries] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')

  useEffect(() => {
    loadVolunteersAndDeliveries()
  }, [])

  const loadVolunteersAndDeliveries = async () => {
    try {
      setLoading(true)
      
      // Fetch volunteers and deliveries with limits for better performance
      const [volunteersData, deliveriesData] = await Promise.all([
        db.getVolunteers({ limit: 100 }),
        db.getDeliveries({ limit: 50 })
      ])
      
      setVolunteers(volunteersData || [])
      setDeliveries(deliveriesData || [])
    } catch (error) {
      console.error('Error loading volunteers and deliveries:', error)
      setVolunteers([]) // Fallback to empty arrays on error
      setDeliveries([])
    } finally {
      setLoading(false)
    }
  }

  const filteredVolunteers = volunteers.filter(volunteer => {
    const matchesSearch = volunteer.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         volunteer.email?.toLowerCase().includes(searchTerm.toLowerCase())
    const volunteerStatus = volunteer.is_active ? 'active' : 'inactive'
    const matchesStatus = statusFilter === 'all' || volunteerStatus === statusFilter
    
    return matchesSearch && matchesStatus
  })

  const getStatusColor = (status) => {
    switch (status) {
      case 'active': return 'text-green-400 bg-green-500/20'
      case 'inactive': return 'text-gray-400 bg-gray-500/20'
      case 'suspended': return 'text-red-400 bg-red-500/20'
      default: return 'text-yellow-400 bg-yellow-500/20'
    }
  }

  const getDeliveryStatusColor = (status) => {
    switch (status) {
      case 'pending': return 'text-yellow-400 bg-yellow-500/20'
      case 'in_progress': return 'text-blue-400 bg-blue-500/20'
      case 'completed': return 'text-green-400 bg-green-500/20'
      case 'cancelled': return 'text-red-400 bg-red-500/20'
      default: return 'text-yellow-400 bg-yellow-500/20'
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
              <h1 className="text-3xl font-bold text-white">Volunteer Management</h1>
              <p className="text-yellow-300">Monitor volunteers and delivery operations</p>
            </div>
          </div>

          {/* Filters */}
          <div className="flex flex-col lg:flex-row gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-yellow-400" />
              <input
                type="text"
                placeholder="Search volunteers by name or email..."
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
                <option value="all">All Status</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
              <Truck className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-yellow-400 pointer-events-none" />
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
              <User className="h-6 w-6 sm:h-8 sm:w-8 text-blue-400" />
              <div className="flex flex-col">
                <p className="text-xl sm:text-2xl font-bold text-white">{volunteers.length}</p>
                <p className="text-yellow-300 text-xs sm:text-sm">Total Volunteers</p>
              </div>
            </div>
          </div>
          
          <div className="card p-4 sm:p-6">
            <div className="flex items-center space-x-3">
              <CheckCircle className="h-6 w-6 sm:h-8 sm:w-8 text-green-400" />
              <div className="flex flex-col">
                <p className="text-xl sm:text-2xl font-bold text-white">
                  {volunteers.filter(v => v.is_active).length}
                </p>
                <p className="text-yellow-300 text-xs sm:text-sm">Active Volunteers</p>
              </div>
            </div>
          </div>
          
          <div className="card p-4 sm:p-6">
            <div className="flex items-center space-x-3">
              <Truck className="h-6 w-6 sm:h-8 sm:w-8 text-yellow-400" />
              <div className="flex flex-col">
                <p className="text-xl sm:text-2xl font-bold text-white">
                  {deliveries.filter(d => d.status === 'in_progress').length}
                </p>
                <p className="text-yellow-300 text-xs sm:text-sm">Active Deliveries</p>
              </div>
            </div>
          </div>
          
          <div className="card p-4 sm:p-6">
            <div className="flex items-center space-x-3">
              <Package className="h-6 w-6 sm:h-8 sm:w-8 text-green-400" />
              <div className="flex flex-col">
                <p className="text-xl sm:text-2xl font-bold text-white">
                  {deliveries.filter(d => d.status === 'delivered').length}
                </p>
                <p className="text-yellow-300 text-xs sm:text-sm">Completed Today</p>
              </div>
            </div>
          </div>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Volunteers List */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
            className="card overflow-hidden"
          >
            <div className="px-6 py-4 border-b-2 border-yellow-500/20 bg-navy-900">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                  <User className="h-5 w-5 text-blue-400" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-white">Active Volunteers</h2>
                  <p className="text-xs text-gray-400">{filteredVolunteers.length} volunteers available</p>
                </div>
              </div>
            </div>
            
            <div className="max-h-[600px] overflow-y-auto custom-scrollbar">
              {filteredVolunteers.map((volunteer, index) => (
                <motion.div
                  key={volunteer.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="p-5 border-b border-navy-700 last:border-b-0 hover:bg-navy-800/50 transition-colors"
                >
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-600 to-blue-500 flex items-center justify-center text-white font-bold text-lg shadow-lg flex-shrink-0">
                      {volunteer.name.charAt(0).toUpperCase()}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="text-white font-semibold text-lg">{volunteer.name}</h3>
                        <div className="flex items-center gap-1.5 bg-yellow-500/10 px-2 py-1 rounded-lg">
                          <Star className="h-3.5 w-3.5 text-yellow-400 fill-yellow-400" />
                          <span className="text-xs font-semibold text-yellow-400">4.5</span>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2 mb-3">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${getStatusColor(volunteer.is_active ? 'active' : 'inactive')}`}>
                          {volunteer.is_active ? 'Active' : 'Inactive'}
                        </span>
                        {volunteer.is_verified && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-green-500/20 text-green-400">
                            <CheckCircle className="h-3 w-3" />
                            Verified
                          </span>
                        )}
                      </div>
                      
                      <div className="grid grid-cols-1 gap-2 mb-3 text-sm">
                        <div className="flex items-center gap-2 text-gray-300">
                          <Mail className="h-3.5 w-3.5 text-yellow-400 flex-shrink-0" />
                          <span className="truncate">{volunteer.email}</span>
                        </div>
                        <div className="flex items-center gap-2 text-gray-300">
                          <Phone className="h-3.5 w-3.5 text-yellow-400 flex-shrink-0" />
                          <span>{volunteer.phone_number || 'Not provided'}</span>
                        </div>
                        <div className="flex items-center gap-2 text-gray-300">
                          <MapPin className="h-3.5 w-3.5 text-yellow-400 flex-shrink-0" />
                          <span>{volunteer.city}, {volunteer.province}</span>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-3 gap-3 pt-3 border-t border-navy-700">
                        <div className="text-center bg-navy-800/50 rounded-lg p-2">
                          <p className="text-lg font-bold text-white">{volunteer.total_deliveries || 0}</p>
                          <p className="text-xs text-gray-400">Total</p>
                        </div>
                        <div className="text-center bg-navy-800/50 rounded-lg p-2">
                          <p className="text-lg font-bold text-green-400">{volunteer.completed_deliveries || 0}</p>
                          <p className="text-xs text-gray-400">Completed</p>
                        </div>
                        <div className="text-center bg-navy-800/50 rounded-lg p-2">
                          <p className="text-lg font-bold text-yellow-400">{deliveries.filter(d => d.volunteer_id === volunteer.id && d.status === 'in_progress').length}</p>
                          <p className="text-xs text-gray-400">Active</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
            
            {filteredVolunteers.length === 0 && (
              <div className="text-center py-12">
                <User className="h-12 w-12 text-yellow-400 mx-auto mb-4" />
                <p className="text-yellow-300">No volunteers found</p>
                <p className="text-yellow-400 text-sm">
                  {searchTerm || statusFilter !== 'all'
                    ? 'Try adjusting your filters'
                    : 'Volunteers will appear here as they join'
                  }
                </p>
              </div>
            )}
          </motion.div>

          {/* Recent Deliveries */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 }}
            className="card overflow-hidden"
          >
            <div className="px-6 py-4 border-b-2 border-yellow-500/20 bg-navy-900">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-green-500/10 flex items-center justify-center">
                  <Package className="h-5 w-5 text-green-400" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-white">Recent Deliveries</h2>
                  <p className="text-xs text-gray-400">{deliveries.length} total deliveries</p>
                </div>
              </div>
            </div>
            
            <div className="max-h-[600px] overflow-y-auto custom-scrollbar">
              {deliveries.slice(0, 10).map((delivery, index) => {
                // Get volunteer name from volunteers list
                const volunteer = volunteers.find(v => v.id === delivery.volunteer_id)
                const donationTitle = delivery.claim?.donation?.title || 'Unknown Donation'
                
                return (
                  <motion.div
                    key={delivery.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="p-5 border-b border-navy-700 last:border-b-0 hover:bg-navy-800/50 transition-colors"
                  >
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-green-600 to-green-500 flex items-center justify-center shadow-lg flex-shrink-0">
                        <Package className="h-6 w-6 text-white" />
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-2">
                          <h3 className="text-white font-semibold text-lg truncate">{donationTitle}</h3>
                          <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${getDeliveryStatusColor(delivery.status)}`}>
                            {delivery.status?.replace('_', ' ') || 'pending'}
                          </span>
                        </div>
                        
                        <div className="flex items-center gap-2 mb-3 text-sm">
                          <Truck className="h-3.5 w-3.5 text-yellow-400 flex-shrink-0" />
                          <span className="text-gray-300">{volunteer?.name || 'Unassigned'}</span>
                        </div>
                        
                        <div className="bg-navy-800/50 rounded-lg p-3 space-y-2 text-sm">
                          <div className="flex items-start gap-2">
                            <MapPin className="h-3.5 w-3.5 text-green-400 flex-shrink-0 mt-0.5" />
                            <div className="flex-1">
                              <span className="text-gray-400 text-xs">From:</span>
                              <p className="text-white">{delivery.pickup_location || 'Not specified'}</p>
                            </div>
                          </div>
                          <div className="flex items-start gap-2">
                            <MapPin className="h-3.5 w-3.5 text-red-400 flex-shrink-0 mt-0.5" />
                            <div className="flex-1">
                              <span className="text-gray-400 text-xs">To:</span>
                              <p className="text-white">{delivery.delivery_location || 'Not specified'}</p>
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-2 mt-3 text-xs text-gray-400">
                          <Calendar className="h-3.5 w-3.5 text-yellow-400" />
                          <span>{delivery.scheduled_delivery_date ? new Date(delivery.scheduled_delivery_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'Not scheduled'}</span>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )
              })}
            </div>
            
            {deliveries.length === 0 && (
              <div className="text-center py-12">
                <Package className="h-12 w-12 text-yellow-400 mx-auto mb-4" />
                <p className="text-yellow-300">No deliveries found</p>
                <p className="text-yellow-400 text-sm">Delivery activity will appear here</p>
              </div>
            )}
          </motion.div>
        </div>
      </div>
    </div>
  )
}

export default AdminVolunteersPage 