import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import {
  Calendar,
  MapPin,
  Clock,
  Users,
  Tag,
  Search,
  Filter,
  Plus,
  ExternalLink,
  UserPlus,
  Eye,
  Heart,
  Share2,
  CheckCircle,
  XCircle,
  AlertCircle,
  CalendarDays,
  PartyPopper,
  Gift,
  Utensils,
  GraduationCap,
  Heart as HeartIcon,
  Edit,
  Trash2,
  ArrowLeft
} from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import { useToast } from '../../contexts/ToastContext'
import { db } from '../../lib/supabase'
import { EventsSkeleton } from '../../components/ui/Skeleton'

const EventsPage = () => {
  const { user, profile } = useAuth()
  const { success, error } = useToast()
  const [events, setEvents] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [categoryFilter, setCategoryFilter] = useState('all')

  const statusOptions = [
    { value: 'all', label: 'All Events' },
    { value: 'active', label: 'Active' },
    { value: 'upcoming', label: 'Upcoming' },
    { value: 'completed', label: 'Completed' },
    { value: 'cancelled', label: 'Cancelled' }
  ]

  const eventTypes = [
    'All Categories',
    'Food Distribution',
    'Clothing Drive',
    'Medical Mission',
    'Educational Program',
    'Community Cleanup',
    'Fundraising',
    'Volunteer Training',
    'Awareness Campaign',
    'Emergency Relief',
    'Other'
  ]

  const fetchEvents = async () => {
    try {
      setLoading(true)
      const data = await db.getEvents()
      setEvents(data || [])
    } catch (err) {
      console.error('Error fetching events:', err)
      error('Failed to load events')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchEvents()
  }, [])

  const filteredEvents = events.filter(event => {
    if (!event) return false
    
    const matchesSearch = event.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         event.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         event.location?.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesStatus = statusFilter === 'all' || 
                         (statusFilter === 'upcoming' && new Date(event.start_date) > new Date()) ||
                         (statusFilter === 'active' && event.status === 'active') ||
                         (statusFilter === 'completed' && event.status === 'completed') ||
                         (statusFilter === 'cancelled' && event.status === 'cancelled')
    
    const matchesCategory = categoryFilter === 'All Categories' || 
                           categoryFilter === 'all' || 
                           event.target_goal === categoryFilter
    
    return matchesSearch && matchesStatus && matchesCategory
  })

  const getStatusColor = (event) => {
    const now = new Date()
    const startDate = new Date(event.start_date)
    const endDate = new Date(event.end_date)
    
    if (event.status === 'cancelled') return 'bg-danger-900/20 text-danger-300'
    if (event.status === 'completed' || endDate < now) return 'bg-gray-900/20 text-gray-300'
    if (startDate <= now && endDate >= now) return 'bg-success-900/20 text-success-300'
    if (startDate > now) return 'bg-yellow-900/20 text-yellow-300'
    
    return 'bg-gray-900/20 text-gray-300'
  }

  const getStatusText = (event) => {
    const now = new Date()
    const startDate = new Date(event.start_date)
    const endDate = new Date(event.end_date)
    
    if (event.status === 'cancelled') return 'Cancelled'
    if (event.status === 'completed' || endDate < now) return 'Completed'
    if (startDate <= now && endDate >= now) return 'Active'
    if (startDate > now) return 'Upcoming'
    
    return 'Unknown'
  }

  const getEventTypeIcon = (type) => {
    const icons = {
      'Food Distribution': Utensils,
      'Clothing Drive': Gift,
      'Medical Mission': Heart,
      'Educational Program': GraduationCap,
      'Community Cleanup': PartyPopper,
      'Fundraising': HeartIcon,
      'Volunteer Training': Users,
      'Awareness Campaign': Calendar,
      'Emergency Relief': AlertCircle,
      'Other': Calendar
    }
    return icons[type] || Calendar
  }

  const formatDate = (dateString) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    })
  }

  const formatTime = (dateString) => {
    const date = new Date(dateString)
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    })
  }

  if (loading) {
    return <EventsSkeleton />
  }

  return (
    <div className="min-h-screen py-4 sm:py-8" style={{backgroundColor: '#00237d'}}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6 sm:mb-8"
        >
          {/* Back Button */}
          <div className="mb-4 sm:mb-6">
            <Link
              to="/"
              className="inline-flex items-center text-yellow-400 hover:text-yellow-300 transition-colors active:scale-95"
            >
              <ArrowLeft className="h-4 w-4 sm:h-5 sm:w-5 mr-2 flex-shrink-0" />
              <span className="font-medium text-sm sm:text-base">Back to Home</span>
            </Link>
          </div>
          
          <div className="flex items-center justify-center mb-6">
            <div className="text-center">
              <Calendar className="h-12 w-12 sm:h-16 sm:w-16 text-yellow-400 mx-auto mb-3 sm:mb-4" />
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white mb-2">Community Events</h1>
              <p className="text-yellow-200 text-sm sm:text-base max-w-2xl mx-auto px-4">
                Discover and participate in local events that make a difference in our community
              </p>
            </div>
          </div>

        </motion.div>

        {/* Filters */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="card p-4 sm:p-6 mb-6 sm:mb-8"
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            <div className="relative sm:col-span-2 lg:col-span-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-yellow-400 flex-shrink-0" />
              <input
                type="text"
                placeholder="Search events..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="input pl-10 text-sm sm:text-base"
              />
            </div>
            
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="input text-sm sm:text-base"
            >
              {statusOptions.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="input text-sm sm:text-base"
            >
              {eventTypes.map(type => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
            
            <button
              onClick={() => {
                setSearchTerm('')
                setStatusFilter('all')
                setCategoryFilter('all')
              }}
              className="btn btn-secondary text-sm sm:text-base active:scale-95"
            >
              Clear Filters
            </button>
          </div>
        </motion.div>

        {/* Events List */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          {filteredEvents.length === 0 ? (
            <div className="card p-12 text-center">
              <Calendar className="h-16 w-16 text-yellow-400 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-white mb-2">No events found</h3>
              <p className="text-yellow-300 mb-6">
                {events.length === 0 
                  ? "No community events are currently available. Check back soon!"
                  : "No events match your current filters."
                }
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {filteredEvents.map((event, index) => {
                const EventIcon = getEventTypeIcon(event.target_goal)
                const isUpcoming = new Date(event.start_date) > new Date()
                const isActive = new Date(event.start_date) <= new Date() && new Date(event.end_date) >= new Date()
                
                return (
                  <motion.div
                    key={event.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="card p-4 sm:p-5 hover:border-yellow-400/30 transition-all border-2 border-navy-700"
                  >
                    <div className="flex flex-col lg:flex-row gap-4 sm:gap-5">
                      {/* Left Side - Responsive Image */}
                      <div className="flex-shrink-0 w-full lg:w-96">
                        {event.image_url ? (
                          <div className="relative w-full h-48 sm:h-56 lg:h-64 rounded-lg overflow-hidden">
                            <img
                              src={event.image_url}
                              alt={event.name}
                              className="w-full h-full object-cover"
                            />
                            {/* Status Badge - Top Right */}
                            <div className="absolute top-2 right-2">
                              <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-semibold backdrop-blur-sm ${getStatusColor(event)}`}>
                                {getStatusText(event)}
                              </span>
                            </div>
                          </div>
                        ) : (
                          <div className="w-full h-48 sm:h-56 lg:h-64 bg-gradient-to-br from-[#00237d] to-[#001a5c] rounded-lg flex flex-col items-center justify-center">
                            <EventIcon className="h-12 w-12 text-yellow-400 mb-2" />
                            <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-semibold ${getStatusColor(event)}`}>
                              {getStatusText(event)}
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Right Side - Information */}
                      <div className="flex-1 min-w-0">
                        {/* Title and Badges */}
                        <div className="mb-3">
                          <div className="flex items-center gap-2 mb-2">
                            {event.target_goal && (
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-medium bg-yellow-400 text-navy-900">
                                {event.target_goal}
                              </span>
                            )}
                            {isActive && (
                              <span className="text-xs text-success-400 font-semibold flex items-center bg-navy-900/80 px-2 py-0.5 rounded">
                                <div className="w-2 h-2 bg-success-400 rounded-full mr-1 animate-pulse"></div>
                                LIVE
                              </span>
                            )}
                          </div>
                          <h3 className="text-lg sm:text-xl font-bold text-white mb-2">{event.name}</h3>
                          <p className="text-xs sm:text-sm text-yellow-200 line-clamp-2">
                            {event.description || 'No description available'}
                          </p>
                        </div>
                        
                        {/* Event Details */}
                        <div className="flex flex-wrap items-center gap-3 sm:gap-4 text-xs sm:text-sm text-yellow-300 mb-4">
                          <div className="flex items-center">
                            <Calendar className="h-4 w-4 mr-1" />
                            {formatDate(event.start_date)}
                            {event.end_date && new Date(event.start_date).toDateString() !== new Date(event.end_date).toDateString() && 
                              ` - ${formatDate(event.end_date)}`
                            }
                          </div>
                          
                          <div className="flex items-center">
                            <Clock className="h-4 w-4 mr-1" />
                            {formatTime(event.start_date)}
                            {event.end_date && ` - ${formatTime(event.end_date)}`}
                          </div>
                          
                          {event.location && (
                            <div className="flex items-center">
                              <MapPin className="h-4 w-4 mr-1" />
                              {event.location}
                            </div>
                          )}
                          
                          {event.max_participants && (
                            <div className="flex items-center">
                              <Users className="h-4 w-4 mr-1" />
                              {event.participants?.[0]?.count || 0} / {event.max_participants} participants
                            </div>
                          )}
                        </div>

                    {/* Donation Needs Summary */}
                    {event.event_items && event.event_items.length > 0 && (
                      <div className="bg-navy-800/50 rounded-lg p-3 border border-yellow-400/20 mb-4">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-semibold text-white">Donation Needs</span>
                          <span className="text-xs font-medium text-yellow-300">
                            {event.event_items.filter(item => item.collected_quantity >= item.quantity).length} / {event.event_items.length} complete
                          </span>
                        </div>
                        <div className="flex flex-wrap gap-x-6 gap-y-1">
                          {event.event_items.slice(0, 2).map((item, index) => (
                            <div key={index} className="flex items-center text-xs">
                              <span className="text-yellow-200">{item.name}</span>
                              <span className="text-yellow-400 ml-2 font-medium">
                                {item.collected_quantity}/{item.quantity}
                              </span>
                            </div>
                          ))}
                          {event.event_items.length > 2 && (
                            <span className="text-xs text-yellow-400 font-medium">
                              +{event.event_items.length - 2} more
                            </span>
                          )}
                        </div>
                      </div>
                    )}

                        {/* Action Buttons */}
                        <div className="flex items-center justify-end gap-2 mt-4">
                          <Link
                            to={`/events/${event.id}`}
                            className="p-2 text-yellow-400 hover:text-yellow-300 hover:bg-navy-700 rounded-lg transition-all active:scale-95"
                            title="View Details"
                          >
                            <Eye className="h-4 w-4" />
                          </Link>
                          
                          {isUpcoming && event.status !== 'cancelled' && (
                            <button className="p-2 text-yellow-400 hover:text-yellow-300 hover:bg-navy-700 rounded-lg transition-all active:scale-95" title="Join Event">
                              <UserPlus className="h-4 w-4" />
                            </button>
                          )}
                          <button className="p-2 text-yellow-400 hover:text-yellow-300 hover:bg-navy-700 rounded-lg transition-all active:scale-95" title="Share Event">
                            <Share2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )
              })}
            </div>
          )}
        </motion.div>

        {/* Community Impact Section */}
        {events.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="mt-12"
          >
            <div className="card p-6 sm:p-8 text-center">
              <h3 className="text-lg sm:text-xl font-semibold text-white mb-4">Community Impact</h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
                <div>
                  <div className="text-xl sm:text-2xl font-bold text-yellow-400 mb-1">
                    {events.filter(e => e.status === 'completed').length}
                  </div>
                  <div className="text-sm text-yellow-300">Events Completed</div>
                </div>
                <div>
                  <div className="text-xl sm:text-2xl font-bold text-yellow-400 mb-1">
                    {events.filter(e => new Date(e.start_date) > new Date()).length}
                  </div>
                  <div className="text-sm text-yellow-300">Upcoming Events</div>
                </div>
                <div>
                  <div className="text-xl sm:text-2xl font-bold text-yellow-400 mb-1">
                    {events.reduce((total, event) => total + (event.participants?.[0]?.count || 0), 0)}
                  </div>
                  <div className="text-sm text-yellow-300">Total Participants</div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  )
}

export default EventsPage 