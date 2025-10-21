import React, { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
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
      case 'high': return 'text-orange-400 bg-orange-500/10'
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
          <p className="text-yellow-300 mt-2">
            Help connect donors and recipients by volunteering for delivery tasks
          </p>
        </motion.div>

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
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-yellow-400 h-5 w-5" />
                <input
                  type="text"
                  placeholder="Search by location, category, or description..."
                  value={filters.search}
                  onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                  className="w-full pl-10 pr-4 py-2 bg-navy-800 border border-navy-600 rounded-lg text-white placeholder-gray-400 focus:border-yellow-500 focus:outline-none"
                />
              </div>
              <button
                onClick={() => setShowFilters(!showFilters)}
                className={`w-40 px-6 py-2 rounded-lg font-medium transition-all duration-200 flex items-center justify-center gap-2 border-2 whitespace-nowrap ${
                  showFilters 
                    ? 'bg-yellow-600 text-white border-yellow-600 shadow-lg' 
                    : 'bg-navy-800 text-yellow-400 border-yellow-600 hover:bg-yellow-600 hover:text-white'
                }`}
              >
                <Filter className="h-5 w-5 flex-shrink-0" />
                <span>Filters</span>
              </button>
            </div>

            {/* Filter Options */}
            <AnimatePresence>
              {showFilters && (
                <motion.div
                  initial={{ height: 0, opacity: 0, y: -10 }}
                  animate={{ height: 'auto', opacity: 1, y: 0 }}
                  exit={{ height: 0, opacity: 0, y: -10 }}
                  transition={{ duration: 0.3, ease: 'easeInOut' }}
                  className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4 border-t border-navy-600 overflow-hidden"
                >
                <div>
                  <label className="block text-sm text-yellow-300 mb-2">Category</label>
                  <select
                    value={filters.category}
                    onChange={(e) => setFilters(prev => ({ ...prev, category: e.target.value }))}
                    className="w-full px-3 py-2 bg-navy-800 border border-navy-600 rounded-lg text-white focus:border-yellow-500 focus:outline-none"
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
                  <label className="block text-sm text-yellow-300 mb-2">Urgency</label>
                  <select
                    value={filters.urgency}
                    onChange={(e) => setFilters(prev => ({ ...prev, urgency: e.target.value }))}
                    className="w-full px-3 py-2 bg-navy-800 border border-navy-600 rounded-lg text-white focus:border-yellow-500 focus:outline-none"
                  >
                    <option value="">All Urgency Levels</option>
                    <option value="critical">Critical</option>
                    <option value="high">High Priority</option>
                    <option value="medium">Medium Priority</option>
                    <option value="low">Low Priority</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm text-yellow-300 mb-2">Type</label>
                  <select
                    value={filters.type}
                    onChange={(e) => setFilters(prev => ({ ...prev, type: e.target.value }))}
                    className="w-full px-3 py-2 bg-navy-800 border border-navy-600 rounded-lg text-white focus:border-yellow-500 focus:outline-none"
                  >
                    <option value="">All Types</option>
                    <option value="approved_donation">Ready for Delivery</option>
                    <option value="request">Open Requests</option>
                  </select>
                </div>
              </motion.div>
              )}
            </AnimatePresence>
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
              <Package className="h-16 w-16 text-yellow-500 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-white mb-2">No Available Tasks</h3>
              <p className="text-yellow-300">
                {tasks.length === 0 
                  ? "There are currently no delivery tasks available. Check back later!"
                  : "No tasks match your current filters. Try adjusting your search criteria."
                }
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredTasks.map((task, index) => (
                <motion.div
                  key={task.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: index * 0.05 }}
                  className="card hover:shadow-xl transition-all duration-300 overflow-hidden border-l-4"
                  style={{
                    borderLeftColor: task.urgency === 'critical' ? '#ef4444' : 
                                    task.urgency === 'high' ? '#fb923c' : 
                                    task.urgency === 'medium' ? '#fbbf24' : '#4ade80'
                  }}
                >
                  <div className="p-6">
                    <div className="flex flex-col md:flex-row gap-6">
                      {/* Item Image - Left Side */}
                      <div className="flex-shrink-0">
                          {task.imageUrl ? (
                            <div className="relative w-48 h-48 rounded-lg overflow-hidden border-2 border-yellow-500/30 shadow-lg">
                              <img 
                                src={task.imageUrl} 
                                alt={task.title}
                                className="w-full h-full object-cover hover:scale-110 transition-transform duration-300"
                              />
                              {/* Category Badge on Image */}
                              <div className="absolute top-2 left-2">
                                <span className="px-2 py-1 rounded-md text-xs font-semibold bg-navy-900/80 text-yellow-400 backdrop-blur-sm border border-yellow-500/30">
                                  {task.category}
                                </span>
                              </div>
                            </div>
                          ) : (
                            <div className="w-48 h-48 rounded-lg bg-gradient-to-br from-navy-800 to-navy-900 flex flex-col items-center justify-center border-2 border-navy-600 shadow-lg">
                              <div className="text-5xl mb-2">
                                {getCategoryIcon(task.category)}
                              </div>
                              <span className="text-xs text-gray-400 font-medium uppercase tracking-wide">No Image</span>
                              <span className="text-xs text-yellow-400 font-semibold mt-1">{task.category}</span>
                            </div>
                          )}
                        </div>
                        
                        {/* Task Info - Right Side */}
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-2 mb-3">
                            <h3 className="text-xl font-bold text-white">{task.title}</h3>
                            <span className={`px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wide ${getUrgencyColor(task.urgency)}`}>
                              {task.urgency}
                            </span>
                            <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                              task.type === 'approved_donation' 
                                ? 'bg-green-500/20 text-green-400 border border-green-500/30' 
                                : 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                            }`}>
                              {task.type === 'approved_donation' ? '✓ Ready for Delivery' : '○ Open Request'}
                            </span>
                          </div>
                          <p className="text-gray-300 text-sm leading-relaxed line-clamp-2 mb-4">{task.description}</p>
                        
                          {/* Task Details - Compact Style */}
                          <div className="flex flex-wrap items-center gap-4 text-sm text-yellow-300 mb-3">
                            <div className="flex items-center gap-1.5">
                              <MapPin className="h-4 w-4 text-yellow-400" />
                              <span className="font-medium">From:</span>
                              <span className="text-white">{task.pickupLocation || 'TBD'}</span>
                            </div>
                            
                            <div className="flex items-center gap-1.5">
                              <Navigation className="h-4 w-4 text-green-400" />
                              <span className="font-medium">To:</span>
                              <span className="text-white">{task.deliveryLocation || 'TBD'}</span>
                            </div>
                            
                            <div className="flex items-center gap-1.5">
                              <User className="h-4 w-4 text-blue-400" />
                              <span className="font-medium">{task.type === 'approved_donation' ? 'Donor:' : 'Requester:'}</span>
                              <span className="text-white">{task.type === 'approved_donation' ? (task.donor?.name || 'Anonymous') : (task.recipient?.name || 'Anonymous')}</span>
                            </div>
                            
                            {(task.quantity || task.quantityNeeded) && (
                              <div className="flex items-center gap-1.5">
                                <Package className="h-4 w-4 text-purple-400" />
                                <span className="font-medium">Qty:</span>
                                <span className="text-white">{task.quantity || task.quantityNeeded}</span>
                              </div>
                            )}
                            
                            {(task.neededBy || task.expiryDate) && (
                              <div className="flex items-center gap-1.5">
                                <Calendar className="h-4 w-4 text-amber-400" />
                                <span className="text-amber-300 font-medium">
                                  {task.neededBy && `Due: ${new Date(task.neededBy).toLocaleDateString()}`}
                                  {task.expiryDate && `Expires: ${new Date(task.expiryDate).toLocaleDateString()}`}
                                </span>
                              </div>
                            )}
                            
                            <div className="flex items-center gap-1.5 text-gray-400">
                              <Clock className="h-3.5 w-3.5" />
                              <span className="text-xs">Posted {new Date(task.createdAt).toLocaleDateString()}</span>
                            </div>
                          </div>
                        </div>

                      {/* Action Section */}
                      <div className="flex flex-col items-stretch justify-center gap-4 xl:min-w-[220px] border-t-2 md:border-t-0 md:border-l-2 border-yellow-500/20 pt-4 md:pt-0 md:pl-6 mt-4 md:mt-0">
                        <div className="flex flex-col gap-3">
                          {volunteerRequests.has(task.id) ? (
                            (() => {
                              const request = volunteerRequests.get(task.id)
                              const status = request.status
                              
                              if (status === 'pending') {
                                return (
                                  <div className="px-5 py-3 rounded-lg font-semibold flex items-center justify-center gap-2 bg-amber-500/20 text-amber-300 border-2 border-amber-500/40">
                                    <Clock className="h-5 w-5" />
                                    <span>Pending</span>
                                  </div>
                                )
                              } else if (status === 'approved') {
                                return (
                                  <div className="px-5 py-3 rounded-lg font-semibold flex items-center justify-center gap-2 bg-green-500/20 text-green-300 border-2 border-green-500/40">
                                    <CheckCircle className="h-5 w-5" />
                                    <span>Approved</span>
                                  </div>
                                )
                              } else if (status === 'rejected') {
                                return (
                                  <div className="px-5 py-3 rounded-lg font-semibold flex items-center justify-center gap-2 bg-red-500/20 text-red-300 border-2 border-red-500/40">
                                    <AlertCircle className="h-5 w-5" />
                                    <span>Declined</span>
                                  </div>
                                )
                              }
                              
                              return (
                                <div className="px-5 py-3 rounded-lg font-semibold flex items-center justify-center gap-2 bg-green-500/20 text-green-300 border-2 border-green-500/40">
                                  <CheckCircle className="h-5 w-5" />
                                  <span>Sent</span>
                                </div>
                              )
                            })()
                          ) : (
                            <button
                              onClick={() => handleAcceptTask(task)}
                              disabled={loading}
                              className="px-6 py-3 rounded-lg font-bold transition-all duration-200 flex items-center justify-center gap-2 bg-gradient-to-r from-yellow-600 to-yellow-500 hover:from-yellow-500 hover:to-yellow-400 text-white shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed transform hover:scale-105 active:scale-95 border-2 border-yellow-400/50"
                            >
                              <Truck className="h-5 w-5" />
                              <span>Volunteer</span>
                            </button>
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

        {/* Summary Stats */}
        {filteredTasks.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="mt-8 card p-4"
          >
            <div className="flex items-center justify-between text-sm text-yellow-300">
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