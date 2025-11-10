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
  CheckCircle,
  Eye,
  X,
  Gift
} from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import { useToast } from '../../contexts/ToastContext'
import { db } from '../../lib/supabase'
import { intelligentMatcher } from '../../lib/matchingAlgorithm'
import { ListPageSkeleton } from '../../components/ui/Skeleton'

const AvailableTasksPage = () => {
  const { profile } = useAuth()
  const { success, error } = useToast()
  const [tasks, setTasks] = useState([])
  const [tasksWithScores, setTasksWithScores] = useState([])
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
  const [selectedTask, setSelectedTask] = useState(null) // Selected task for viewing details
  const [showViewModal, setShowViewModal] = useState(false) // Modal visibility state

  useEffect(() => {
    loadAvailableTasks()
  }, [profile])

  useEffect(() => {
    applyFilters()
  }, [tasks, tasksWithScores, filters])

  const loadAvailableTasks = async () => {
    if (!profile) return

    try {
      setLoading(true)
      // Get available volunteer tasks
      const taskData = await db.getAvailableVolunteerTasks()
      setTasks(taskData)

      // Score tasks using the unified matching algorithm with database-driven parameters
      if (profile?.id) {
        // Fetch full volunteer profile with all necessary fields (location, preferred_delivery_types, etc.)
        let volunteerProfile = profile
        try {
          const fullProfile = await db.getProfile(profile.id)
          if (fullProfile) {
            volunteerProfile = { ...profile, ...fullProfile }
          }
        } catch (err) {
          console.warn('Could not fetch full volunteer profile, using available profile data:', err)
        }
        
        const tasksWithMatchingScores = await Promise.all(
          (taskData || []).map(async (task) => {
            try {
              // Ensure task has category field (may be in task.category or task.donation?.category)
              const taskWithCategory = {
                ...task,
                category: task.category || task.donation?.category || task.request?.category,
                donation: task.donation || { category: task.category },
                request: task.request || { category: task.category, urgency: task.urgency }
              }
              
              // Use the unified matching algorithm to score this task for the current volunteer
              // This uses database-driven parameters (DONOR_RECIPIENT_VOLUNTEER)
              const matchResult = await intelligentMatcher.calculateTaskScoreForVolunteer(taskWithCategory, volunteerProfile)
              
              return {
                ...task,
                matchingScore: matchResult.score,
                matchReason: matchResult.matchReason,
                criteriaScores: matchResult.criteriaScores
              }
            } catch (err) {
              console.error(`Error scoring task ${task.id}:`, err)
              // Fallback to task without score
              return {
                ...task,
                matchingScore: 0.5,
                matchReason: 'Unable to calculate match score',
                criteriaScores: {}
              }
            }
          })
        )
        
        // Sort tasks by matching score (highest first), then by urgency
        tasksWithMatchingScores.sort((a, b) => {
          // First sort by matching score
          if (Math.abs(a.matchingScore - b.matchingScore) > 0.01) {
            return b.matchingScore - a.matchingScore
          }
          // Then by urgency
          const urgencyOrder = { critical: 4, high: 3, medium: 2, low: 1 }
          if (urgencyOrder[a.urgency] !== urgencyOrder[b.urgency]) {
            return urgencyOrder[b.urgency] - urgencyOrder[a.urgency]
          }
          // Finally by date
          return new Date(b.createdAt) - new Date(a.createdAt)
        })
        
        setTasksWithScores(tasksWithMatchingScores)
        
        // Load volunteer request statuses for current user
        await loadVolunteerRequestStatuses(taskData)
      } else {
        setTasksWithScores(taskData)
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
    // Use tasks with scores if available, otherwise use tasks
    const tasksToFilter = tasksWithScores.length > 0 ? tasksWithScores : tasks
    let filtered = [...tasksToFilter]

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

    // Sort by matching score (if available), then by urgency and date
    filtered.sort((a, b) => {
      // First sort by matching score if available
      if (a.matchingScore !== undefined && b.matchingScore !== undefined) {
        if (Math.abs(a.matchingScore - b.matchingScore) > 0.01) {
          return b.matchingScore - a.matchingScore
        }
      }
      // Then by urgency
      const urgencyOrder = { critical: 4, high: 3, medium: 2, low: 1 }
      if (urgencyOrder[a.urgency] !== urgencyOrder[b.urgency]) {
        return urgencyOrder[b.urgency] - urgencyOrder[a.urgency]
      }
      // Finally by date
      return new Date(b.createdAt || 0) - new Date(a.createdAt || 0)
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
        volunteer_email: profile.email,
        volunteer_phone: profile.phone_number,
        task_type: task.type
      }

      // All tasks are approved donations (requests without donors are not shown)
      if (task.type === 'approved_donation' && task.claimId) {
        requestData.claim_id = task.claimId
      }

      // Create the volunteer request (this will also create notifications)
      const volunteerRequest = await db.createVolunteerRequest(requestData)
      
      // Update local state to show request sent
      setVolunteerRequests(prev => new Map(prev.set(task.id, volunteerRequest)))
      
      success('Volunteer request sent! Both donor and recipient will be notified to confirm.')
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

  // Helper function to check if a value is a placeholder or invalid
  const isValidLocationValue = (value) => {
    if (!value || typeof value !== 'string') return false
    const trimmed = value.trim().toLowerCase()
    // Filter out placeholder values and invalid entries
    const invalidValues = [
      'to be completed',
      'not provided',
      'n/a',
      'na',
      'null',
      'undefined',
      '',
      'tbd',
      'to be determined',
      'to be determined when matched with donor',
      'address tbd'
    ]
    return trimmed !== '' && !invalidValues.includes(trimmed)
  }

  // Helper function to format location from user profile data
  const formatLocationFromUser = (user) => {
    if (!user) return null
    const locationParts = []
    
    // Priority 1: Most specific - House/Unit + Street
    if (isValidLocationValue(user?.address_house) || isValidLocationValue(user?.address_street)) {
      const houseStreet = [user.address_house, user.address_street]
        .filter(isValidLocationValue)
        .join(' ')
        .trim()
      if (houseStreet) {
        locationParts.push(houseStreet)
      }
    }
    
    // Priority 2: Barangay (very important for Philippines)
    if (isValidLocationValue(user?.address_barangay)) {
      locationParts.push(user.address_barangay.trim())
    }
    
    // Priority 3: Subdivision/Building
    if (isValidLocationValue(user?.address_subdivision)) {
      locationParts.push(user.address_subdivision.trim())
    }
    
    // Priority 4: Landmark (if no street address)
    if (isValidLocationValue(user?.address_landmark) && !isValidLocationValue(user?.address_street)) {
      locationParts.push(`Near ${user.address_landmark.trim()}`)
    }
    
    // Priority 5: Full address (if it's more specific than just city/province)
    if (isValidLocationValue(user?.address) && !locationParts.length) {
      const addressStr = user.address.trim()
      const isGenericAddress = /^(Philippines|Philippines,?\s*[A-Za-z\s]+(?: City)?|[A-Za-z\s]+ City)$/i.test(addressStr)
      if (!isGenericAddress && !addressStr.toLowerCase().includes('to be completed')) {
        locationParts.push(addressStr)
      }
    }
    
    // Priority 6: City
    if (isValidLocationValue(user?.city)) {
      locationParts.push(user.city.trim())
    }
    
    // Priority 7: Province
    if (isValidLocationValue(user?.province)) {
      locationParts.push(user.province.trim())
    }
    
    return locationParts.length > 0 ? locationParts.join(', ') : null
  }

  // Format "From" location - This is the DONOR location (pickup location)
  // All tasks are approved donations, so all have donors
  const formatPickupLocation = (task) => {
    // Priority 1: Format from donor's profile data (barangay, street, city, etc.)
    if (task.donor) {
      const formattedFromDonor = formatLocationFromUser(task.donor)
      if (formattedFromDonor) {
        return formattedFromDonor
      }
    }
    
    // Priority 2: Fallback to donation's pickup_location field if it's valid
    if (isValidLocationValue(task.pickupLocation)) {
      const locationStr = task.pickupLocation.trim()
      const hasGenericPattern = /^(Philippines|Philippines,?\s*[A-Za-z\s]+(?: City)?)$/i.test(locationStr)
      if (!hasGenericPattern && !locationStr.toLowerCase().includes('to be completed')) {
        return locationStr
      }
    }
    
    // Priority 3: If we have donor but no detailed location, at least show city/province
    if (task.donor) {
      if (isValidLocationValue(task.donor.city)) {
        const locationParts = [task.donor.city]
        if (isValidLocationValue(task.donor.province)) {
          locationParts.push(task.donor.province)
        }
        return locationParts.join(', ')
      }
    }
    
    return 'Location to be determined'
  }

  // Format "To" location - This is the RECIPIENT/REQUESTER location (delivery location)
  // This is where the donation needs to be delivered
  const formatDeliveryLocation = (task) => {
    // Priority 1: Format from recipient/requester's profile data (barangay, street, city, etc.)
    if (task.recipient) {
      const formattedFromUser = formatLocationFromUser(task.recipient)
      if (formattedFromUser) {
        return formattedFromUser
      }
    }
    
    // Priority 2: Fallback to deliveryLocation field if it's valid and not generic
    if (isValidLocationValue(task.deliveryLocation)) {
      const locationStr = task.deliveryLocation.trim()
      // Check if location is generic (like "Philippines, Cagayan de Oro City")
      const hasGenericPattern = /^(Philippines|Philippines,?\s*[A-Za-z\s]+(?: City)?)$/i.test(locationStr)
      // Also check for "To be completed" in the location
      const hasPlaceholder = locationStr.toLowerCase().includes('to be completed') || 
                            locationStr.toLowerCase().includes('to be determined')
      
      if (!hasGenericPattern && !hasPlaceholder) {
        // Location has specific details, use it
        return locationStr
      }
      // If it's generic or has placeholder, don't use it - try recipient data instead
    }
    
    // Priority 3: If we have recipient but no detailed location, at least show city/province
    if (task.recipient) {
      if (isValidLocationValue(task.recipient.city)) {
        const locationParts = [task.recipient.city]
        if (isValidLocationValue(task.recipient.province)) {
          locationParts.push(task.recipient.province)
        }
        return locationParts.join(', ')
      }
    }
    
    return 'Location details not specified'
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
          className="mb-6 sm:mb-8"
        >
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white">Available Tasks</h1>
          <p className="text-yellow-300 mt-2 text-sm sm:text-base">
            Help connect donors and recipients by volunteering for delivery tasks
          </p>
          
          {/* Result Count Badge */}
          {filteredTasks.length > 0 && (
            <div className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-yellow-600/20 to-yellow-500/20 border border-yellow-500/30 rounded-full">
              <Truck className="h-4 w-4 text-yellow-400" />
              <span className="text-yellow-300 font-semibold text-sm">
                {filteredTasks.length} {filteredTasks.length === 1 ? 'Task' : 'Tasks'} Available
              </span>
            </div>
          )}
        </motion.div>

        {/* Search and Filters */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="mb-6"
        >
          <div className="card p-4 sm:p-6">
            {/* Search Bar */}
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 mb-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-yellow-400 h-5 w-5" />
                <input
                  type="text"
                  placeholder="Search by location, category, or description..."
                  value={filters.search}
                  onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                  className="w-full pl-10 pr-4 py-3 sm:py-2 bg-navy-800 border border-navy-600 rounded-lg text-white text-sm sm:text-base placeholder-gray-400 focus:border-yellow-500 focus:outline-none transition-colors"
                />
              </div>
              <button
                onClick={() => setShowFilters(!showFilters)}
                className={`w-full sm:w-auto px-6 py-3 sm:py-2 rounded-lg font-medium transition-all duration-200 flex items-center justify-center gap-2 border-2 whitespace-nowrap active:scale-95 ${
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
                  className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 pt-4 border-t border-navy-600 overflow-hidden"
                >
                <div>
                  <label className="block text-sm font-medium text-yellow-300 mb-2">Category</label>
                  <select
                    value={filters.category}
                    onChange={(e) => setFilters(prev => ({ ...prev, category: e.target.value }))}
                    className="w-full px-3 py-3 sm:py-2 bg-navy-800 border border-navy-600 rounded-lg text-white text-sm sm:text-base focus:border-yellow-500 focus:ring-2 focus:ring-yellow-500/20 focus:outline-none transition-colors"
                  >
                    <option value="">All Categories</option>
                    <option value="food">🍽️ Food</option>
                    <option value="clothing">👕 Clothing</option>
                    <option value="electronics">📱 Electronics</option>
                    <option value="books">📚 Books</option>
                    <option value="toys">🧸 Toys</option>
                    <option value="household">🏠 Household</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-yellow-300 mb-2">Urgency</label>
                  <select
                    value={filters.urgency}
                    onChange={(e) => setFilters(prev => ({ ...prev, urgency: e.target.value }))}
                    className="w-full px-3 py-3 sm:py-2 bg-navy-800 border border-navy-600 rounded-lg text-white text-sm sm:text-base focus:border-yellow-500 focus:ring-2 focus:ring-yellow-500/20 focus:outline-none transition-colors"
                  >
                    <option value="">All Urgency Levels</option>
                    <option value="critical">🔴 Critical</option>
                    <option value="high">🟠 High Priority</option>
                    <option value="medium">🟡 Medium Priority</option>
                    <option value="low">🟢 Low Priority</option>
                  </select>
                </div>

                <div className="sm:col-span-2 lg:col-span-1">
                  <label className="block text-sm font-medium text-yellow-300 mb-2">Type</label>
                  <select
                    value={filters.type}
                    onChange={(e) => setFilters(prev => ({ ...prev, type: e.target.value }))}
                    className="w-full px-3 py-3 sm:py-2 bg-navy-800 border border-navy-600 rounded-lg text-white text-sm sm:text-base focus:border-yellow-500 focus:ring-2 focus:ring-yellow-500/20 focus:outline-none transition-colors"
                  >
                    <option value="">All Types</option>
                    <option value="approved_donation">✓ Ready for Delivery</option>
                    <option value="request">○ Open Requests</option>
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
                  className="card hover:shadow-xl transition-all duration-300 overflow-hidden border-l-4 group"
                  style={{
                    borderLeftColor: task.urgency === 'critical' ? '#ef4444' : 
                                    task.urgency === 'high' ? '#fb923c' : 
                                    task.urgency === 'medium' ? '#fbbf24' : '#4ade80'
                  }}
                >
                  <div className="p-4 sm:p-6">
                    <div className="flex flex-col sm:flex-row gap-4 sm:gap-6">
                      {/* Task Image - Left Side */}
                      <div className="flex-shrink-0">
                        {task.imageUrl ? (
                          <div className="relative w-full sm:w-48 lg:w-56 h-40 sm:h-48 rounded-lg overflow-hidden border-2 border-yellow-500/30 shadow-lg">
                            <img 
                              src={task.imageUrl} 
                              alt={task.title}
                              className="w-full h-full object-cover"
                            />
                            {/* Category Badge on Image */}
                            <div className="absolute top-2 left-2">
                              <span className="px-2 py-0.5 sm:py-1 rounded-md text-[10px] sm:text-xs font-semibold bg-navy-900/90 text-yellow-400 backdrop-blur-sm border border-yellow-500/30">
                                {task.category}
                              </span>
                            </div>
                            {/* Urgency Badge on Image */}
                            <div className="absolute top-2 right-2">
                              <span className={`px-2 py-0.5 sm:py-1 rounded-md text-[10px] sm:text-xs font-semibold backdrop-blur-md border-2 shadow-lg ${getUrgencyColor(task.urgency)}`}>
                                {task.urgency.toUpperCase()}
                              </span>
                            </div>
                          </div>
                        ) : (
                          <div className="w-full sm:w-48 lg:w-56 h-40 sm:h-48 rounded-lg bg-gradient-to-br from-navy-800 to-navy-900 flex flex-col items-center justify-center border-2 border-navy-600 shadow-lg">
                            <div className="text-5xl mb-2">
                              {getCategoryIcon(task.category)}
                            </div>
                            <span className="text-[10px] sm:text-xs text-gray-400 font-medium uppercase tracking-wide">No Image</span>
                            <span className="text-xs text-yellow-400 font-semibold mt-1">{task.category}</span>
                          </div>
                        )}
                      </div>

                      {/* Task Details - Right Side */}
                      <div className="flex-1 space-y-2 sm:space-y-3">
                        {/* Header with Actions */}
                        <div className="flex flex-col sm:flex-row items-start justify-between gap-3 sm:gap-4">
                          <div className="flex-1 min-w-0">
                            <h3 className="text-base sm:text-lg lg:text-xl font-bold text-white mb-1.5 sm:mb-2">{task.title}</h3>
                            <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 mb-2">
                              <span className="px-2 sm:px-3 py-0.5 sm:py-1 rounded-full text-[10px] sm:text-xs font-semibold bg-yellow-900/30 text-yellow-300 border border-yellow-500/30 whitespace-nowrap">
                                {task.category}
                              </span>
                              <span className="px-2 sm:px-3 py-0.5 sm:py-1 rounded-full text-[10px] sm:text-xs font-semibold bg-green-500/20 text-green-400 border border-green-500/30 whitespace-nowrap">
                                ✓ Ready
                              </span>
                            </div>
                            <p className="text-gray-300 text-xs sm:text-sm line-clamp-2">
                              {task.description || 'No description available'}
                            </p>
                          </div>
                          
                          {/* Action Buttons */}
                          <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
                            <button 
                              onClick={() => {
                                setSelectedTask(task)
                                setShowViewModal(true)
                              }}
                              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-navy-950 bg-yellow-400 hover:bg-yellow-500 rounded-lg transition-all active:scale-95"
                            >
                              <Eye className="h-3.5 w-3.5" />
                              <span>View</span>
                            </button>
                            {!volunteerRequests.has(task.id) ? (
                              <button
                                onClick={() => handleAcceptTask(task)}
                                disabled={loading}
                                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-green-600 hover:bg-green-700 rounded-lg transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                <Truck className="h-3.5 w-3.5" />
                                <span>Volunteer</span>
                              </button>
                            ) : (
                              (() => {
                                const request = volunteerRequests.get(task.id)
                                const status = request.status
                                
                                if (status === 'pending') {
                                  return (
                                    <div className="px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 bg-amber-500/20 text-amber-300 border border-amber-500/40">
                                      <Clock className="h-3.5 w-3.5" />
                                      <span>Pending</span>
                                    </div>
                                  )
                                } else if (status === 'approved') {
                                  return (
                                    <div className="px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 bg-green-500/20 text-green-300 border border-green-500/40">
                                      <CheckCircle className="h-3.5 w-3.5" />
                                      <span>Approved</span>
                                    </div>
                                  )
                                } else if (status === 'rejected') {
                                  return (
                                    <div className="px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 bg-red-500/20 text-red-300 border border-red-500/40">
                                      <AlertCircle className="h-3.5 w-3.5" />
                                      <span>Declined</span>
                                    </div>
                                  )
                                }
                                
                                return (
                                  <div className="px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 bg-green-500/20 text-green-300 border border-green-500/40">
                                    <CheckCircle className="h-3.5 w-3.5" />
                                    <span>Sent</span>
                                  </div>
                                )
                              })()
                            )}
                          </div>
                        </div>

                        {/* Compact Details */}
                        <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 sm:gap-y-2 text-xs sm:text-sm">
                          {/* From: Donor location (pickup location) */}
                          <div className="flex items-start gap-1.5 text-yellow-300">
                            <MapPin className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-yellow-400 mt-0.5 flex-shrink-0" />
                            <div className="flex-1 min-w-0">
                              <span className="font-medium">From:</span>
                              <span className="text-white ml-1 break-words text-[11px] sm:text-xs">{formatPickupLocation(task)}</span>
                            </div>
                          </div>
                          
                          {/* To: Recipient location (delivery location) */}
                          <div className="flex items-start gap-1.5 text-yellow-300">
                            <Navigation className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-green-400 mt-0.5 flex-shrink-0" />
                            <div className="flex-1 min-w-0">
                              <span className="font-medium">To:</span>
                              <span className="text-white ml-1 break-words text-[11px] sm:text-xs">{formatDeliveryLocation(task)}</span>
                            </div>
                          </div>
                          
                          {/* Donor */}
                          <div className="flex items-center gap-1.5 text-yellow-300">
                            <User className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-blue-400 flex-shrink-0" />
                            <span className="font-medium whitespace-nowrap">Donor:</span>
                            <span className="text-white truncate text-[11px] sm:text-xs">{task.donor?.name || 'Anonymous'}</span>
                          </div>
                          
                          {/* Quantity */}
                          {task.quantity && (
                            <div className="flex items-center gap-1.5 text-yellow-300">
                              <Package className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-purple-400 flex-shrink-0" />
                              <span className="font-medium">Qty:</span>
                              <span className="text-white text-[11px] sm:text-xs">{task.quantity}</span>
                            </div>
                          )}
                          
                          {/* Expiry Date */}
                          {task.expiryDate && (
                            <div className="flex items-center gap-1.5 col-span-2">
                              <Calendar className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-amber-400 flex-shrink-0" />
                              <span className="text-amber-300 font-medium text-[11px] sm:text-xs">
                                Expires: {new Date(task.expiryDate).toLocaleDateString()}
                              </span>
                            </div>
                          )}
                          
                          {/* Posted Date */}
                          <div className="flex items-center gap-1.5 text-gray-400 col-span-2">
                            <Clock className="h-3 w-3 sm:h-3.5 sm:w-3.5 flex-shrink-0" />
                            <span className="text-[10px] sm:text-xs">Posted {new Date(task.createdAt).toLocaleDateString()}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </motion.div>

        {/* View Task Details Modal */}
        {showViewModal && selectedTask && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ duration: 0.2 }}
              className="bg-navy-900 border-2 border-yellow-500/20 shadow-2xl rounded-xl max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col"
            >
              {/* Header */}
              <div className="flex items-center justify-between p-6 border-b-2 border-yellow-500/20 flex-shrink-0">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-yellow-500/10 rounded-lg">
                    <Truck className="h-6 w-6 text-yellow-400" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-white">Task Details</h3>
                    <p className="text-xs text-yellow-300">Complete information</p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setShowViewModal(false)
                    setSelectedTask(null)
                  }}
                  className="text-gray-400 hover:text-white transition-colors p-2 hover:bg-navy-800 rounded-lg"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Content with Custom Scrollbar */}
              <div className="flex-1 overflow-y-auto px-6 py-4 custom-scrollbar">
                <div className="space-y-6">
                  {/* Image Section */}
                  {selectedTask.imageUrl && (
                    <div className="relative rounded-lg overflow-hidden border-2 border-yellow-500/30">
                      <img 
                        src={selectedTask.imageUrl} 
                        alt={selectedTask.title}
                        className="w-full h-64 object-cover"
                      />
                      <div className="absolute top-3 right-3">
                        <span className={`px-3 py-1.5 rounded-lg text-xs font-semibold backdrop-blur-md border-2 ${getUrgencyColor(selectedTask.urgency)}`}>
                          {selectedTask.urgency.toUpperCase()}
                        </span>
                      </div>
                      <div className="absolute top-3 left-3">
                        <span className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-navy-900/90 text-yellow-400 backdrop-blur-sm border border-yellow-500/30">
                          {selectedTask.category}
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Title and Status */}
                  <div className="bg-navy-800/50 rounded-lg p-4 border border-navy-700">
                    <div className="flex items-start justify-between gap-4 mb-3">
                      <h4 className="text-2xl font-bold text-white">{selectedTask.title}</h4>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="px-3 py-1.5 rounded-full text-xs font-semibold bg-yellow-900/30 text-yellow-300 border border-yellow-500/30 whitespace-nowrap">
                          {selectedTask.category}
                        </span>
                        <span className="px-3 py-1.5 rounded-full text-xs font-semibold bg-green-500/20 text-green-400 border border-green-500/30 whitespace-nowrap">
                          ✓ Ready
                        </span>
                      </div>
                    </div>
                    {!selectedTask.imageUrl && (
                      <div className="flex items-center gap-2 mb-3">
                        <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${getUrgencyColor(selectedTask.urgency)}`}>
                          {selectedTask.urgency.toUpperCase()}
                        </span>
                      </div>
                    )}
                    <p className="text-gray-300 leading-relaxed">{selectedTask.description || 'No description available'}</p>
                  </div>

                  {/* Details Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {selectedTask.quantity && (
                      <div className="bg-navy-800/30 rounded-lg p-4 border border-navy-700">
                        <div className="flex items-center gap-2 mb-2">
                          <Package className="h-4 w-4 text-blue-400" />
                          <label className="text-sm font-semibold text-yellow-300">Quantity</label>
                        </div>
                        <p className="text-white text-lg font-medium">{selectedTask.quantity}</p>
                      </div>
                    )}
                    
                    {selectedTask.condition && (
                      <div className="bg-navy-800/30 rounded-lg p-4 border border-navy-700">
                        <div className="flex items-center gap-2 mb-2">
                          <CheckCircle className="h-4 w-4 text-green-400" />
                          <label className="text-sm font-semibold text-yellow-300">Condition</label>
                        </div>
                        <p className="text-white text-lg font-medium capitalize">{selectedTask.condition?.replace('_', ' ')}</p>
                      </div>
                    )}
                  </div>

                  {/* Location Details */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* From: Donor location */}
                    <div className="bg-navy-800/30 rounded-lg p-4 border border-navy-700">
                      <div className="flex items-center gap-2 mb-2">
                        <MapPin className="h-4 w-4 text-yellow-400" />
                        <label className="text-sm font-semibold text-yellow-300">Pickup Location (From)</label>
                      </div>
                      <p className="text-white">{formatPickupLocation(selectedTask)}</p>
                    </div>

                    {/* To: Recipient location */}
                    <div className="bg-navy-800/30 rounded-lg p-4 border border-navy-700">
                      <div className="flex items-center gap-2 mb-2">
                        <Navigation className="h-4 w-4 text-green-400" />
                        <label className="text-sm font-semibold text-yellow-300">Delivery Location (To)</label>
                      </div>
                      <p className="text-white">{formatDeliveryLocation(selectedTask)}</p>
                    </div>
                  </div>

                  {/* Donor Information */}
                  {selectedTask.donor && (
                    <div className="bg-navy-800/30 rounded-lg p-4 border border-navy-700">
                      <div className="flex items-center gap-2 mb-2">
                        <User className="h-4 w-4 text-blue-400" />
                        <label className="text-sm font-semibold text-yellow-300">Donor</label>
                      </div>
                      <p className="text-white">{selectedTask.donor.name || 'Anonymous'}</p>
                      {selectedTask.donor.email && (
                        <p className="text-gray-400 text-sm mt-1">{selectedTask.donor.email}</p>
                      )}
                    </div>
                  )}

                  {/* Pickup Instructions */}
                  {selectedTask.pickup_instructions && (
                    <div className="bg-navy-800/30 rounded-lg p-4 border border-navy-700">
                      <div className="flex items-center gap-2 mb-2">
                        <AlertCircle className="h-4 w-4 text-orange-400" />
                        <label className="text-sm font-semibold text-yellow-300">Pickup Instructions</label>
                      </div>
                      <p className="text-white">{selectedTask.pickup_instructions}</p>
                    </div>
                  )}

                  {/* Additional Info */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {selectedTask.expiryDate && (
                      <div className="bg-navy-800/30 rounded-lg p-4 border border-navy-700">
                        <div className="flex items-center gap-2 mb-2">
                          <Clock className="h-4 w-4 text-orange-400" />
                          <label className="text-sm font-semibold text-yellow-300">Expiry Date</label>
                        </div>
                        <p className="text-white">{new Date(selectedTask.expiryDate).toLocaleDateString()}</p>
                      </div>
                    )}

                    <div className="bg-navy-800/30 rounded-lg p-4 border border-navy-700">
                      <div className="flex items-center gap-2 mb-2">
                        <Calendar className="h-4 w-4 text-purple-400" />
                        <label className="text-sm font-semibold text-yellow-300">Posted Date</label>
                      </div>
                      <p className="text-white">{new Date(selectedTask.createdAt).toLocaleDateString()}</p>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}

        {/* Summary Stats */}
        {filteredTasks.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="mt-6 sm:mt-8 card p-4 sm:p-5"
          >
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-sm text-yellow-300">
              <span className="font-semibold">
                Showing {filteredTasks.length} of {tasks.length} available tasks
              </span>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs sm:text-sm">
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-red-500"></span>
                  Critical: {filteredTasks.filter(t => t.urgency === 'critical').length}
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-orange-400"></span>
                  High: {filteredTasks.filter(t => t.urgency === 'high').length}
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-green-400"></span>
                  Ready: {filteredTasks.filter(t => t.type === 'approved_donation').length}
                </span>
              </div>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  )
}

export default AvailableTasksPage