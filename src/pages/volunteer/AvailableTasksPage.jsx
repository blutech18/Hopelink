import React, { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { 
  Package, 
  MapPin, 
  Clock, 
  User, 
  Calendar,
  Truck,
  Filter,
  Search,
  AlertCircle,
  Heart,
  ArrowRight,
  Star,
  Navigation,
  CheckCircle
} from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import { useToast } from '../../contexts/ToastContext'
import { db } from '../../lib/supabase'
import { ListPageSkeleton } from '../../components/ui/Skeleton'
import ProfileCompletionPrompt from '../../components/ui/ProfileCompletionPrompt'

const AvailableTasksPage = () => {
  const { profile } = useAuth()
  const { success, error } = useToast()
  const [tasks, setTasks] = useState([])
  const [filteredTasks, setFilteredTasks] = useState([])
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState({
    category: '',
    urgency: '',
    distance: '',
    search: '',
    type: ''
  })
  const [showFilters, setShowFilters] = useState(false)
  const [volunteerRequests, setVolunteerRequests] = useState(new Map()) // Store request status by task ID

  useEffect(() => {
    loadAvailableTasks()
  }, [profile])

  useEffect(() => {
    applyFilters()
  }, [tasks, filters])

  const loadAvailableTasks = async () => {
    if (!profile) return

    try {
      // Get available volunteer tasks
      const taskData = await db.getAvailableVolunteerTasks()
      setTasks(taskData)

      // Load volunteer request statuses for current user
      if (profile?.id) {
        await loadVolunteerRequestStatuses(taskData)
      }
    } catch (err) {
      console.error('Error loading available tasks:', err)
      error('Failed to load available tasks')
    } finally {
      setLoading(false)
    }
  }

  const loadVolunteerRequestStatuses = async (taskData) => {
    if (!profile?.id) return

    try {
      const requestStatusMap = new Map()
      
      // Check each task for existing volunteer requests
      for (const task of taskData) {
        const requestStatus = await db.getVolunteerRequestStatus(profile.id, task.id)
        if (requestStatus) {
          requestStatusMap.set(task.id, requestStatus)
        }
      }
      
      setVolunteerRequests(requestStatusMap)
    } catch (err) {
      console.error('Error loading volunteer request statuses:', err)
    }
  }

  const calculateDistance = (city1, city2) => {
    // Simplified distance calculation for demo
    // In real implementation, use geolocation API
    if (city1 === city2) return 5
    return Math.floor(Math.random() * 25) + 5
  }

  const applyFilters = () => {
    let filtered = [...tasks]

    if (filters.category) {
      filtered = filtered.filter(task => 
        task.category.toLowerCase().includes(filters.category.toLowerCase())
      )
    }

    if (filters.urgency) {
      filtered = filtered.filter(task => task.urgency === filters.urgency)
    }

    if (filters.search) {
      filtered = filtered.filter(task =>
        task.title.toLowerCase().includes(filters.search.toLowerCase()) ||
        task.description.toLowerCase().includes(filters.search.toLowerCase()) ||
        task.pickupLocation?.toLowerCase().includes(filters.search.toLowerCase()) ||
        task.deliveryLocation?.toLowerCase().includes(filters.search.toLowerCase())
      )
    }

    if (filters.type) {
      filtered = filtered.filter(task => task.type === filters.type)
    }

    // Sort by urgency and date
    filtered.sort((a, b) => {
      const urgencyOrder = { critical: 4, high: 3, medium: 2, low: 1 }
      if (urgencyOrder[a.urgency] !== urgencyOrder[b.urgency]) {
        return urgencyOrder[b.urgency] - urgencyOrder[a.urgency]
      }
      return new Date(b.createdAt) - new Date(a.createdAt)
    })

    setFilteredTasks(filtered)
  }

  const handleAcceptTask = async (task) => {
    if (!profile?.id) {
      error('Please complete your profile first')
      return
    }

    try {
      setLoading(true)
      
      // Create volunteer request with proper data structure
      const requestData = {
        volunteer_id: profile.id,
        volunteer_name: profile.name,
        task_type: task.type
      }

      if (task.type === 'approved_donation' && task.claimId) {
        requestData.claim_id = task.claimId
      } else if (task.type === 'request') {
        requestData.request_id = task.originalId
      }

      // Create the volunteer request (this will also create notifications)
      const volunteerRequest = await db.createVolunteerRequest(requestData)
      
      // Update local state to show request sent
      setVolunteerRequests(prev => new Map(prev.set(task.id, volunteerRequest)))
      
      if (task.type === 'approved_donation') {
        success('Volunteer request sent! Both donor and recipient will be notified to confirm.')
      } else {
        success('Volunteer request sent! The requester will be notified to confirm your assistance.')
      }
    } catch (err) {
      console.error('Error sending volunteer request:', err)
      if (err.message?.includes('duplicate')) {
        error('You have already sent a request for this task.')
      } else {
        error('Failed to send volunteer request. Please try again.')
      }
    } finally {
      setLoading(false)
    }
  }

  const getUrgencyColor = (urgency) => {
    switch (urgency) {
      case 'critical': return 'text-red-500 bg-red-500/10'
      case 'high': return 'text-red-400 bg-red-500/10'
      case 'medium': return 'text-yellow-400 bg-yellow-500/10'
      case 'low': return 'text-green-400 bg-green-500/10'
      default: return 'text-gray-400 bg-gray-500/10'
    }
  }

  const getCategoryIcon = (category) => {
    switch (category.toLowerCase()) {
      case 'food': return '🍽️'
      case 'clothing': return '👕'
      case 'electronics': return '📱'
      case 'books': return '📚'
      case 'toys': return '🧸'
      default: return '📦'
    }
  }

  if (loading) {
    return <ListPageSkeleton />
  }

  return (
    <div className="min-h-screen py-8" style={{backgroundColor: '#00237d'}}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="mb-8"
        >
          <h1 className="text-3xl font-bold text-white">Available Tasks</h1>
          <p className="text-skyblue-300 mt-2">
            Help connect donors and recipients by volunteering for delivery tasks
          </p>
        </motion.div>

        {/* Profile Completion Prompt */}
        <ProfileCompletionPrompt />

        {/* Search and Filters */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="mb-6"
        >
          <div className="card p-6">
            {/* Search Bar */}
            <div className="flex flex-col sm:flex-row gap-4 mb-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-skyblue-400 h-5 w-5" />
                <input
                  type="text"
                  placeholder="Search by location, category, or description..."
                  value={filters.search}
                  onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                  className="w-full pl-10 pr-4 py-2 bg-navy-800 border border-navy-600 rounded-lg text-white placeholder-skyblue-400 focus:border-skyblue-500 focus:outline-none"
                />
              </div>
              <button
                onClick={() => setShowFilters(!showFilters)}
                className="btn-secondary flex items-center gap-2"
              >
                <Filter className="h-4 w-4" />
                Filters
              </button>
            </div>

            {/* Filter Options */}
            {showFilters && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4 border-t border-navy-600"
              >
                <div>
                  <label className="block text-sm text-skyblue-300 mb-2">Category</label>
                  <select
                    value={filters.category}
                    onChange={(e) => setFilters(prev => ({ ...prev, category: e.target.value }))}
                    className="w-full px-3 py-2 bg-navy-800 border border-navy-600 rounded-lg text-white focus:border-skyblue-500 focus:outline-none"
                  >
                    <option value="">All Categories</option>
                    <option value="food">Food</option>
                    <option value="clothing">Clothing</option>
                    <option value="electronics">Electronics</option>
                    <option value="books">Books</option>
                    <option value="toys">Toys</option>
                    <option value="household">Household</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm text-skyblue-300 mb-2">Urgency</label>
                  <select
                    value={filters.urgency}
                    onChange={(e) => setFilters(prev => ({ ...prev, urgency: e.target.value }))}
                    className="w-full px-3 py-2 bg-navy-800 border border-navy-600 rounded-lg text-white focus:border-skyblue-500 focus:outline-none"
                  >
                    <option value="">All Urgency Levels</option>
                    <option value="critical">Critical</option>
                    <option value="high">High Priority</option>
                    <option value="medium">Medium Priority</option>
                    <option value="low">Low Priority</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm text-skyblue-300 mb-2">Type</label>
                  <select
                    value={filters.type}
                    onChange={(e) => setFilters(prev => ({ ...prev, type: e.target.value }))}
                    className="w-full px-3 py-2 bg-navy-800 border border-navy-600 rounded-lg text-white focus:border-skyblue-500 focus:outline-none"
                  >
                    <option value="">All Types</option>
                    <option value="approved_donation">Ready for Delivery</option>
                    <option value="request">Open Requests</option>
                  </select>
                </div>
              </motion.div>
            )}
          </div>
        </motion.div>

        {/* Tasks List */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          {filteredTasks.length === 0 ? (
            <div className="card p-12 text-center">
              <Package className="h-16 w-16 text-skyblue-500 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-white mb-2">No Available Tasks</h3>
              <p className="text-skyblue-300">
                {tasks.length === 0 
                  ? "There are currently no delivery tasks available. Check back later!"
                  : "No tasks match your current filters. Try adjusting your search criteria."
                }
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {filteredTasks.map((task, index) => (
                <motion.div
                  key={task.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: index * 0.1 }}
                  className="card p-6 hover:shadow-lg transition-shadow duration-300"
                >
                  <div className="flex flex-col xl:flex-row gap-6">
                    {/* Task Details */}
                    <div className="flex-1 space-y-4">
                      {/* Header */}
                      <div className="flex items-start gap-4">
                        <div className="text-3xl flex-shrink-0">
                          {getCategoryIcon(task.category)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-3 mb-2">
                            <h3 className="text-xl font-semibold text-white truncate">{task.title}</h3>
                            <span className={`px-3 py-1 rounded-full text-xs font-medium ${getUrgencyColor(task.urgency)}`}>
                              {task.urgency} priority
                            </span>
                            <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                              task.type === 'approved_donation' ? 'bg-green-900/20 text-green-400' : 'bg-blue-900/20 text-blue-400'
                            }`}>
                              {task.type === 'approved_donation' ? 'Ready for Delivery' : 'Open Request'}
                            </span>
                          </div>
                          <p className="text-skyblue-300 text-sm leading-relaxed">{task.description}</p>
                        </div>
                      </div>

                      {/* Metadata Grid */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Location Information */}
                        <div className="space-y-2">
                          <div className="flex items-center gap-2 text-sm text-skyblue-300">
                            <MapPin className="h-4 w-4 text-skyblue-400" />
                            <span className="font-medium">Pickup:</span>
                            <span>{task.pickupLocation || 'TBD'}</span>
                          </div>
                          <div className="flex items-center gap-2 text-sm text-skyblue-300">
                            <Navigation className="h-4 w-4 text-skyblue-400" />
                            <span className="font-medium">Delivery:</span>
                            <span>{task.deliveryLocation || 'TBD'}</span>
                          </div>
                        </div>

                        {/* Task Details */}
                        <div className="space-y-2">
                          <div className="flex items-center gap-2 text-sm text-skyblue-300">
                            <User className="h-4 w-4 text-skyblue-400" />
                            <span className="font-medium">
                              {task.type === 'approved_donation' ? 'Donor:' : 'Requester:'}
                            </span>
                            <span>{task.type === 'approved_donation' ? (task.donor?.name || 'Anonymous') : (task.recipient?.name || 'Anonymous')}</span>
                          </div>
                          {(task.quantity || task.quantityNeeded) && (
                            <div className="flex items-center gap-2 text-sm text-skyblue-300">
                              <Package className="h-4 w-4 text-skyblue-400" />
                              <span className="font-medium">Quantity:</span>
                              <span>{task.quantity || task.quantityNeeded}</span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Additional Info */}
                      {(task.neededBy || task.expiryDate) && (
                        <div className="flex items-center gap-2 text-sm text-amber-400">
                          <Calendar className="h-4 w-4" />
                          <span className="font-medium">
                            {task.neededBy && `Needed by: ${new Date(task.neededBy).toLocaleDateString()}`}
                            {task.expiryDate && `Expires: ${new Date(task.expiryDate).toLocaleDateString()}`}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Action Section */}
                    <div className="flex flex-col items-center xl:items-end justify-between gap-4 xl:min-w-[200px]">
                      <div className="flex flex-col items-center xl:items-end gap-2">
                        {volunteerRequests.has(task.id) ? (
                          (() => {
                            const request = volunteerRequests.get(task.id)
                            const status = request.status
                            
                            if (status === 'pending') {
                              return (
                                <div className="px-6 py-3 rounded-lg font-semibold flex items-center gap-2 whitespace-nowrap bg-amber-900/20 text-amber-400 border border-amber-500/30">
                                  <Clock className="h-4 w-4" />
                                  Request Pending
                                </div>
                              )
                            } else if (status === 'approved') {
                              return (
                                <div className="px-6 py-3 rounded-lg font-semibold flex items-center gap-2 whitespace-nowrap bg-green-900/20 text-green-400 border border-green-500/30">
                                  <CheckCircle className="h-4 w-4" />
                                  Request Approved
                                </div>
                              )
                            } else if (status === 'rejected') {
                              return (
                                <div className="px-6 py-3 rounded-lg font-semibold flex items-center gap-2 whitespace-nowrap bg-red-900/20 text-red-400 border border-red-500/30">
                                  <AlertCircle className="h-4 w-4" />
                                  Request Declined
                                </div>
                              )
                            }
                            
                            return (
                              <div className="px-6 py-3 rounded-lg font-semibold flex items-center gap-2 whitespace-nowrap bg-green-900/20 text-green-400 border border-green-500/30">
                                <CheckCircle className="h-4 w-4" />
                                Request Sent
                              </div>
                            )
                          })()
                        ) : (
                          <button
                            onClick={() => handleAcceptTask(task)}
                            disabled={loading}
                            className={`px-6 py-3 rounded-lg font-semibold transition-all duration-200 flex items-center gap-2 whitespace-nowrap
                              bg-skyblue-600 hover:bg-skyblue-700 text-white shadow-lg hover:shadow-xl
                              disabled:opacity-50 disabled:cursor-not-allowed transform hover:scale-105 active:scale-95`}
                          >
                            <Truck className="h-4 w-4" />
                            Request to Volunteer
                          </button>
                        )}
                        <div className="text-xs text-skyblue-400 text-center xl:text-right">
                          Posted {new Date(task.createdAt).toLocaleDateString()}
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </motion.div>

        {/* Summary Stats */}
        {filteredTasks.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="mt-8 card p-4"
          >
            <div className="flex items-center justify-between text-sm text-skyblue-300">
              <span>
                Showing {filteredTasks.length} of {tasks.length} available tasks
              </span>
              <div className="flex items-center gap-4">
                <span>Critical: {filteredTasks.filter(t => t.urgency === 'critical').length}</span>
                <span>High priority: {filteredTasks.filter(t => t.urgency === 'high').length}</span>
                <span>Ready for delivery: {filteredTasks.filter(t => t.type === 'approved_donation').length}</span>
              </div>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  )
}

export default AvailableTasksPage