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
  Trash2
} from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import { useToast } from '../../contexts/ToastContext'
import { db } from '../../lib/supabase'
import LoadingSpinner from '../../components/ui/LoadingSpinner'
import CreateEventModal from '../../components/ui/CreateEventModal'

const EventsPage = () => {
  const { user, profile } = useAuth()
  const { success, error } = useToast()
  const [events, setEvents] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [viewMode, setViewMode] = useState('grid') // 'grid' or 'list'
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [editingEvent, setEditingEvent] = useState(null)

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

  const handleCreateEvent = () => {
    setEditingEvent(null)
    setShowCreateModal(true)
  }

  const handleEditEvent = (event) => {
    setEditingEvent(event)
    setShowCreateModal(true)
  }

  const handleCancelEvent = async (eventId) => {
    try {
      // TODO: Implement actual cancel event API call
      // await db.cancelEvent(eventId)
      
      // For now, update local state
      setEvents(events.map(event => 
        event.id === eventId ? { ...event, status: 'cancelled' } : event
      ))
      success('Event cancelled successfully')
    } catch (err) {
      console.error('Error cancelling event:', err)
      error('Failed to cancel event')
    }
  }

  const handleDeleteEvent = async (eventId) => {
    if (!confirm('Are you sure you want to delete this event? This action cannot be undone.')) {
      return
    }
    
    try {
      // TODO: Implement actual delete event API call
      // await db.deleteEvent(eventId)
      
      // For now, update local state
      setEvents(events.filter(event => event.id !== eventId))
      success('Event deleted successfully')
    } catch (err) {
      console.error('Error deleting event:', err)
      error('Failed to delete event')
    }
  }

  const filteredEvents = events.filter(event => {
    const matchesSearch = event.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
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
    if (startDate > now) return 'bg-skyblue-900/20 text-skyblue-300'
    
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
    return (
      <div className="min-h-screen bg-navy-950 flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-navy-950 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex items-center justify-between mb-6">
            <div className="text-center flex-1">
              <Calendar className="h-16 w-16 text-skyblue-500 mx-auto mb-4" />
              <h1 className="text-3xl font-bold text-white mb-2">Community Events</h1>
              <p className="text-skyblue-300 max-w-2xl mx-auto">
                {profile?.role === 'admin' 
                  ? 'Manage and create community events that make a difference'
                  : 'Discover and participate in local events that make a difference in our community'
                }
              </p>
            </div>
            
            {/* Admin Actions */}
            {profile?.role === 'admin' && (
              <div className="flex items-center space-x-3">
                <button 
                  onClick={handleCreateEvent}
                  className="btn btn-primary flex items-center"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Create Event
                </button>
              </div>
            )}
          </div>

          {/* Admin Stats */}
          {profile?.role === 'admin' && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              <div className="card p-4">
                <div className="text-2xl font-bold text-white">{events.length}</div>
                <div className="text-skyblue-300 text-sm">Total Events</div>
              </div>
              <div className="card p-4">
                <div className="text-2xl font-bold text-green-400">
                  {events.filter(e => new Date(e.start_date) <= new Date() && new Date(e.end_date) >= new Date()).length}
                </div>
                <div className="text-skyblue-300 text-sm">Active Events</div>
              </div>
              <div className="card p-4">
                <div className="text-2xl font-bold text-blue-400">
                  {events.filter(e => new Date(e.start_date) > new Date()).length}
                </div>
                <div className="text-skyblue-300 text-sm">Upcoming Events</div>
              </div>
              <div className="card p-4">
                <div className="text-2xl font-bold text-amber-400">
                  {events.reduce((total, event) => total + (event.participants?.[0]?.count || 0), 0)}
                </div>
                <div className="text-skyblue-300 text-sm">Total Participants</div>
              </div>
            </div>
          )}
        </motion.div>

        {/* Filters */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="card p-6 mb-8"
        >
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-skyblue-400" />
              <input
                type="text"
                placeholder="Search events..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="input pl-10"
              />
            </div>
            
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="input"
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
              className="input"
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
              className="btn btn-secondary"
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
              <Calendar className="h-16 w-16 text-skyblue-600 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-white mb-2">No events found</h3>
              <p className="text-skyblue-300 mb-6">
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
                    className="card p-6 hover:bg-navy-800/50 transition-all"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        {/* Event Header */}
                        <div className="flex items-start justify-between mb-4">
                          <div className="flex items-start">
                            {/* Event Image/Icon */}
                            <div className="w-20 h-20 rounded-lg overflow-hidden mr-4 flex-shrink-0">
                              {event.image_url ? (
                                <img
                                  src={event.image_url}
                                  alt={event.name}
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <div className="w-full h-full bg-gradient-to-r from-skyblue-600 to-skyblue-500 flex items-center justify-center">
                                  <EventIcon className="h-8 w-8 text-white" />
                                </div>
                              )}
                            </div>
                            
                            <div>
                              <div className="flex items-center gap-3 mb-2">
                                <h3 className="text-lg font-semibold text-white">{event.name}</h3>
                                {event.target_goal && (
                                  <span className="inline-flex items-center px-2 py-1 rounded text-xs bg-navy-700 text-skyblue-300">
                                    <Tag className="h-3 w-3 mr-1" />
                                    {event.target_goal}
                                  </span>
                                )}
                              </div>
                              <p className="text-skyblue-300 text-sm leading-relaxed">
                                {event.description?.length > 150 
                                  ? `${event.description.substring(0, 150)}...` 
                                  : event.description || 'No description available'
                                }
                              </p>
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-2 ml-4">
                            <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(event)}`}>
                              {getStatusText(event)}
                            </span>
                            {isActive && (
                              <span className="text-xs text-success-400 font-medium flex items-center">
                                <div className="w-2 h-2 bg-success-400 rounded-full mr-1 animate-pulse"></div>
                                LIVE
                              </span>
                            )}
                          </div>
                        </div>
                        
                        {/* Event Details */}
                        <div className="flex flex-wrap items-center gap-4 text-sm text-skyblue-400 mb-4">
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
                          <div className="p-3 bg-navy-800 rounded-lg border border-navy-700">
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-sm font-medium text-white">Donation Needs</span>
                              <span className="text-xs text-skyblue-400">
                                {event.event_items.filter(item => item.collected_quantity >= item.quantity).length} / {event.event_items.length} complete
                              </span>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                              {event.event_items.slice(0, 4).map((item, index) => {
                                const progress = item.quantity > 0 ? (item.collected_quantity / item.quantity) * 100 : 0
                                const isComplete = item.collected_quantity >= item.quantity
                                return (
                                  <div key={index} className="flex items-center justify-between text-xs">
                                    <span className={`${isComplete ? 'text-success-400' : 'text-skyblue-300'}`}>
                                      {item.name}
                                    </span>
                                    <span className={`${isComplete ? 'text-success-400' : 'text-skyblue-400'}`}>
                                      {item.collected_quantity}/{item.quantity}
                                    </span>
                                  </div>
                                )
                              })}
                              {event.event_items.length > 4 && (
                                <div className="text-xs text-skyblue-500 col-span-full">
                                  +{event.event_items.length - 4} more items needed
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                      
                      {/* Action Buttons */}
                      <div className="flex items-center gap-2 ml-6">
                        <Link
                          to={`/events/${event.id}`}
                          className="p-2 text-skyblue-400 hover:text-skyblue-300 hover:bg-navy-700 rounded-lg transition-all"
                          title="View Details"
                        >
                          <Eye className="h-4 w-4" />
                        </Link>
                        
                        {profile?.role === 'admin' ? (
                          <>
                            <button 
                              onClick={() => handleEditEvent(event)}
                              className="p-2 text-skyblue-400 hover:text-skyblue-300 hover:bg-navy-700 rounded-lg transition-all"
                              title="Edit Event"
                            >
                              <Edit className="h-4 w-4" />
                            </button>
                            {event.status !== 'cancelled' && (
                              <button 
                                onClick={() => handleCancelEvent(event.id)}
                                className="p-2 text-skyblue-400 hover:text-amber-300 hover:bg-navy-700 rounded-lg transition-all"
                                title="Cancel Event"
                              >
                                <XCircle className="h-4 w-4" />
                              </button>
                            )}
                            <button 
                              onClick={() => handleDeleteEvent(event.id)}
                              className="p-2 text-skyblue-400 hover:text-danger-300 hover:bg-navy-700 rounded-lg transition-all"
                              title="Delete Event"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </>
                        ) : (
                          <>
                            {isUpcoming && event.status !== 'cancelled' && (
                              <button className="p-2 text-skyblue-400 hover:text-green-300 hover:bg-navy-700 rounded-lg transition-all" title="Join Event">
                                <UserPlus className="h-4 w-4" />
                              </button>
                            )}
                            <button className="p-2 text-skyblue-400 hover:text-pink-300 hover:bg-navy-700 rounded-lg transition-all" title="Share Event">
                              <Share2 className="h-4 w-4" />
                            </button>
                          </>
                        )}
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
            <div className="card p-8 text-center">
              <h3 className="text-xl font-semibold text-white mb-4">Community Impact</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <div className="text-2xl font-bold text-skyblue-400 mb-1">
                    {events.filter(e => e.status === 'completed').length}
                  </div>
                  <div className="text-sm text-skyblue-300">Events Completed</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-skyblue-400 mb-1">
                    {events.filter(e => new Date(e.start_date) > new Date()).length}
                  </div>
                  <div className="text-sm text-skyblue-300">Upcoming Events</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-skyblue-400 mb-1">
                    {events.reduce((total, event) => total + (event.participants?.[0]?.count || 0), 0)}
                  </div>
                  <div className="text-sm text-skyblue-300">Total Participants</div>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* Create/Edit Event Modal */}
        <CreateEventModal
          isOpen={showCreateModal}
          onClose={() => {
            setShowCreateModal(false)
            setEditingEvent(null)
          }}
          event={editingEvent}
          onSave={(eventData) => {
            if (editingEvent) {
              // Update existing event
              setEvents(events.map(event => 
                event.id === editingEvent.id ? { ...event, ...eventData } : event
              ))
            } else {
              // Add new event
              const newEvent = {
                ...eventData,
                id: Date.now().toString(), // Temporary ID
                participants: [{ count: 0 }]
              }
              setEvents([newEvent, ...events])
            }
          }}
        />
      </div>
    </div>
  )
}

export default EventsPage 