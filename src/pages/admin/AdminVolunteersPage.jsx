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
      default: return 'text-skyblue-400 bg-skyblue-500/20'
    }
  }

  const getDeliveryStatusColor = (status) => {
    switch (status) {
      case 'pending': return 'text-yellow-400 bg-yellow-500/20'
      case 'in_progress': return 'text-blue-400 bg-blue-500/20'
      case 'completed': return 'text-green-400 bg-green-500/20'
      case 'cancelled': return 'text-red-400 bg-red-500/20'
      default: return 'text-skyblue-400 bg-skyblue-500/20'
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
            <Truck className="h-8 w-8 text-blue-400" />
            <div>
              <h1 className="text-3xl font-bold text-white">Volunteer Management</h1>
              <p className="text-skyblue-300">Monitor volunteers and delivery operations</p>
            </div>
          </div>

          {/* Filters */}
          <div className="flex flex-col lg:flex-row gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-skyblue-400" />
              <input
                type="text"
                placeholder="Search volunteers by name or email..."
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
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="suspended">Suspended</option>
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
                <p className="text-skyblue-300 text-sm">Total Volunteers</p>
                <p className="text-2xl font-bold text-white">{volunteers.length}</p>
              </div>
              <User className="h-8 w-8 text-blue-400" />
            </div>
          </div>
          
                        <div className="card p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-skyblue-300 text-sm">Active Volunteers</p>
                <p className="text-2xl font-bold text-white">
                  {volunteers.filter(v => v.is_active).length}
                </p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-400" />
            </div>
          </div>
          
          <div className="card p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-skyblue-300 text-sm">Active Deliveries</p>
                <p className="text-2xl font-bold text-white">
                  {deliveries.filter(d => d.status === 'in_progress').length}
                </p>
              </div>
              <Truck className="h-8 w-8 text-yellow-400" />
            </div>
          </div>
          
          <div className="card p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-skyblue-300 text-sm">Completed Today</p>
                <p className="text-2xl font-bold text-white">
                  {deliveries.filter(d => d.status === 'delivered').length}
                </p>
              </div>
              <Package className="h-8 w-8 text-green-400" />
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
            <div className="px-6 py-4 border-b border-navy-700">
              <h2 className="text-xl font-semibold text-white flex items-center">
                <User className="h-5 w-5 text-blue-400 mr-2" />
                Volunteers
              </h2>
            </div>
            
            <div className="max-h-96 overflow-y-auto custom-scrollbar">
              {filteredVolunteers.map((volunteer, index) => (
                <motion.div
                  key={volunteer.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="p-6 border-b border-navy-700 last:border-b-0 hover:bg-navy-800/50"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <div className="h-10 w-10 rounded-full bg-blue-600 flex items-center justify-center text-white font-medium">
                          {volunteer.name.charAt(0)}
                        </div>
                        <div>
                          <h3 className="text-white font-medium">{volunteer.name}</h3>
                          <div className="flex items-center space-x-2">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${getStatusColor(volunteer.is_active ? 'active' : 'inactive')}`}>
                              {volunteer.is_active ? 'active' : 'inactive'}
                            </span>
                            <div className="flex items-center text-yellow-400">
                              <Star className="h-3 w-3 mr-1" />
                              <span className="text-xs">{volunteer.volunteer_rating || '4.5'}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                      
                      <div className="space-y-1 text-sm text-skyblue-400">
                        <div className="flex items-center">
                          <Mail className="h-3 w-3 mr-2" />
                          {volunteer.email}
                        </div>
                        <div className="flex items-center">
                          <Phone className="h-3 w-3 mr-2" />
                          {volunteer.phone_number || 'Not provided'}
                        </div>
                        <div className="flex items-center">
                          <MapPin className="h-3 w-3 mr-2" />
                          {volunteer.city}, {volunteer.province}
                        </div>
                      </div>
                      
                      <div className="mt-3 grid grid-cols-3 gap-4 text-xs">
                        <div className="text-center">
                          <p className="text-white font-medium">{volunteer.total_deliveries || 0}</p>
                          <p className="text-skyblue-400">Total</p>
                        </div>
                        <div className="text-center">
                          <p className="text-white font-medium">{volunteer.completed_deliveries || 0}</p>
                          <p className="text-skyblue-400">Completed</p>
                        </div>
                        <div className="text-center">
                          <p className="text-white font-medium">{deliveries.filter(d => d.volunteer_id === volunteer.id && d.status === 'in_progress').length}</p>
                          <p className="text-skyblue-400">Active</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
            
            {filteredVolunteers.length === 0 && (
              <div className="text-center py-12">
                <User className="h-12 w-12 text-skyblue-400 mx-auto mb-4" />
                <p className="text-skyblue-300">No volunteers found</p>
                <p className="text-skyblue-400 text-sm">
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
            <div className="px-6 py-4 border-b border-navy-700">
              <h2 className="text-xl font-semibold text-white flex items-center">
                <Package className="h-5 w-5 text-green-400 mr-2" />
                Recent Deliveries
              </h2>
            </div>
            
            <div className="max-h-96 overflow-y-auto custom-scrollbar">
              {deliveries.slice(0, 10).map((delivery, index) => {
                // Get volunteer name from volunteers list
                const volunteer = volunteers.find(v => v.id === delivery.volunteer_id)
                const donationTitle = delivery.claim?.donation?.title || 'Unknown Donation'
                
                return (
                  <motion.div
                    key={delivery.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="p-6 border-b border-navy-700 last:border-b-0 hover:bg-navy-800/50"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <h3 className="text-white font-medium mb-1">{donationTitle}</h3>
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${getDeliveryStatusColor(delivery.status)}`}>
                          {delivery.status?.replace('_', ' ') || 'pending'}
                        </span>
                      </div>
                    </div>
                    
                    <div className="space-y-2 text-sm text-skyblue-400">
                      <div className="flex items-center">
                        <Truck className="h-3 w-3 mr-2" />
                        <span className="text-white">{volunteer?.name || 'Unassigned'}</span>
                      </div>
                      <div>
                        <div className="flex items-center mb-1">
                          <span className="text-skyblue-300">From:</span>
                          <span className="ml-1 text-white">{delivery.pickup_location || 'Not specified'}</span>
                        </div>
                        <div className="flex items-center">
                          <span className="text-skyblue-300">To:</span>
                          <span className="ml-1 text-white">{delivery.delivery_location || 'Not specified'}</span>
                        </div>
                      </div>
                      <div className="flex items-center">
                        <Calendar className="h-3 w-3 mr-2" />
                        {delivery.scheduled_delivery_date ? new Date(delivery.scheduled_delivery_date).toLocaleDateString() : 'Not scheduled'}
                      </div>
                    </div>
                  </motion.div>
                )
              })}
            </div>
            
            {deliveries.length === 0 && (
              <div className="text-center py-12">
                <Package className="h-12 w-12 text-skyblue-400 mx-auto mb-4" />
                <p className="text-skyblue-300">No deliveries found</p>
                <p className="text-skyblue-400 text-sm">Delivery activity will appear here</p>
              </div>
            )}
          </motion.div>
        </div>
      </div>
    </div>
  )
}

export default AdminVolunteersPage 