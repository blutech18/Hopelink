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
import { db, supabase } from '../../lib/supabase'
import { EventsSkeleton } from '../../components/ui/Skeleton'
import JoinEventConfirmationModal from '../../components/ui/JoinEventConfirmationModal'
import CancelEventConfirmationModal from '../../components/ui/CancelEventConfirmationModal'

const EventsPage = () => {
  const { user, profile } = useAuth()
  const { success, error } = useToast()
  const [events, setEvents] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [participantStatus, setParticipantStatus] = useState({}) // { eventId: true/false }
  const [joinLoading, setJoinLoading] = useState({}) // { eventId: true/false }
  const [showJoinModal, setShowJoinModal] = useState(false)
  const [eventToJoin, setEventToJoin] = useState(null)
  const [showCancelModal, setShowCancelModal] = useState(false)
  const [eventToCancel, setEventToCancel] = useState(null)

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

  useEffect(() => {
    // Check participation status for all events when user or events change
    if (user && events.length > 0 && supabase) {
      checkParticipationStatus()
    }
  }, [user, events])

  const checkParticipationStatus = async () => {
    if (!user || !supabase) return
    
    try {
      const eventIds = events.map(e => e.id).filter(Boolean)
      if (eventIds.length === 0) return

      const { data: participations } = await supabase
        .from('event_participants')
        .select('event_id')
        .eq('user_id', user.id)
        .in('event_id', eventIds)

      const statusMap = {}
      participations?.forEach(p => {
        statusMap[p.event_id] = true
      })
      setParticipantStatus(statusMap)
    } catch (err) {
      console.error('Error checking participation status:', err)
    }
  }

  const handleJoinEvent = async (eventId) => {
    if (!user) {
      error('Please log in to join events')
      return
    }

    // Find the event and show confirmation modal
    const event = events.find(e => e.id === eventId)
    if (event) {
      setEventToJoin(event)
      setShowJoinModal(true)
    }
  }

  const confirmJoinEvent = async () => {
    if (!eventToJoin || !user) return

    setJoinLoading(prev => ({ ...prev, [eventToJoin.id]: true }))
    try {
      await db.joinEvent(eventToJoin.id, user.id)
      
      setParticipantStatus(prev => ({ ...prev, [eventToJoin.id]: true }))
      setEvents(prev => prev.map(e => 
        e.id === eventToJoin.id 
          ? { ...e, current_participants: (e.participants?.[0]?.count || 0) + 1 }
          : e
      ))
      success('Successfully joined the event!')
      setShowJoinModal(false)
      setEventToJoin(null)
      
      // Refresh events to get updated counts
      await fetchEvents()
    } catch (err) {
      console.error('Error joining event:', err)
      error(err.message || 'Failed to join event. Please try again.')
    } finally {
      setJoinLoading(prev => ({ ...prev, [eventToJoin.id]: false }))
    }
  }

  const handleLeaveEvent = async (eventId) => {
    if (!user) return
    
    // Find the event and show confirmation modal
    const event = events.find(e => e.id === eventId)
    if (event) {
      setEventToCancel(event)
      setShowCancelModal(true)
    }
  }

  const confirmCancelEvent = async () => {
    if (!eventToCancel || !user) return
    
    setJoinLoading(prev => ({ ...prev, [eventToCancel.id]: true }))
    try {
      await db.leaveEvent(eventToCancel.id, user.id)
      
      setParticipantStatus(prev => ({ ...prev, [eventToCancel.id]: false }))
      setEvents(prev => prev.map(e => 
        e.id === eventToCancel.id 
          ? { ...e, current_participants: Math.max(0, (e.participants?.[0]?.count || 0) - 1) }
          : e
      ))
      success('You have canceled your registration')
      setShowCancelModal(false)
      setEventToCancel(null)
      
      // Refresh events to get updated counts
      await fetchEvents()
    } catch (err) {
      console.error('Error leaving event:', err)
      error(err.message || 'Failed to cancel registration. Please try again.')
    } finally {
      setJoinLoading(prev => ({ ...prev, [eventToCancel.id]: false }))
    }
  }

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
    if (!dateString) return 'N/A'
    const date = new Date(dateString)
    if (isNaN(date.getTime())) {
      console.error('Invalid date string:', dateString)
      return 'Invalid Date'
    }
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
                    className="card p-4 sm:p-5 hover:border-yellow-400/30 transition-all border-2 border-navy-700 relative"
                  >
                    {/* Action Buttons - Top Right */}
                    <div className="absolute top-3 right-3 flex items-center gap-2 z-10 flex-wrap justify-end">
                      <Link
                        to={`/events/${event.id}`}
                        className="px-3 py-2 bg-navy-800/80 hover:bg-navy-700 text-yellow-400 hover:text-yellow-300 rounded-lg transition-all active:scale-95 backdrop-blur-sm flex items-center gap-1.5 text-xs sm:text-sm font-medium"
                        title="View Details"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Eye className="h-4 w-4 flex-shrink-0" />
                        <span className="hidden sm:inline">View</span>
                      </Link>
                      
                      {isUpcoming && event.status !== 'cancelled' && (
                        <>
                          {participantStatus[event.id] ? (
                            <button 
                              className="px-3 py-2 bg-navy-800/80 hover:bg-navy-700 text-yellow-400 hover:text-yellow-300 rounded-lg transition-all active:scale-95 backdrop-blur-sm flex items-center gap-1.5 text-xs sm:text-sm font-medium disabled:opacity-50" 
                              title="Cancel Registration"
                              onClick={(e) => {
                                e.stopPropagation()
                                handleLeaveEvent(event.id)
                              }}
                              disabled={joinLoading[event.id]}
                            >
                              <XCircle className="h-4 w-4 flex-shrink-0" />
                              <span className="hidden sm:inline">Cancel</span>
                            </button>
                          ) : (
                            <button 
                              className="px-3 py-2 bg-navy-800/80 hover:bg-navy-700 text-yellow-400 hover:text-yellow-300 rounded-lg transition-all active:scale-95 backdrop-blur-sm flex items-center gap-1.5 text-xs sm:text-sm font-medium disabled:opacity-50" 
                              title="Join Event"
                              onClick={(e) => {
                                e.stopPropagation()
                                handleJoinEvent(event.id)
                              }}
                              disabled={joinLoading[event.id] || (event.max_participants && (event.participants?.[0]?.count || 0) >= event.max_participants)}
                            >
                              <UserPlus className="h-4 w-4 flex-shrink-0" />
                              <span className="hidden sm:inline">Join</span>
                            </button>
                          )}
                        </>
                      )}
                      <button 
                        className="px-3 py-2 bg-navy-800/80 hover:bg-navy-700 text-yellow-400 hover:text-yellow-300 rounded-lg transition-all active:scale-95 backdrop-blur-sm flex items-center gap-1.5 text-xs sm:text-sm font-medium" 
                        title="Share Event"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Share2 className="h-4 w-4 flex-shrink-0" />
                        <span className="hidden sm:inline">Share</span>
                      </button>
                    </div>

                    <div className="flex flex-col lg:flex-row lg:items-stretch gap-4 sm:gap-5">
                      {/* Left Side - Fixed Image */}
                      <div className="flex-shrink-0 w-full lg:w-96">
                        {event.image_url ? (
                          <div className="relative w-full h-64 rounded-lg overflow-hidden border-2 border-yellow-500/30">
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
                          <div className="w-full h-64 bg-gradient-to-br from-[#00237d] to-[#001a5c] rounded-lg flex flex-col items-center justify-center border-2 border-yellow-500/30">
                            <EventIcon className="h-12 w-12 text-yellow-400 mb-2" />
                            <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-semibold ${getStatusColor(event)}`}>
                              {getStatusText(event)}
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Right Side - Information */}
                      <div className="flex-1 min-w-0 flex flex-col pr-8 lg:pr-0">
                        {/* Badges - Aligned with Image Top */}
                        <div className="flex items-center gap-2 mb-3 flex-shrink-0 flex-wrap">
                            {event.target_goal && (
                            <span className="inline-flex items-center px-3 py-1 rounded-md text-xs font-semibold bg-yellow-400 text-navy-900 uppercase tracking-wide">
                                {event.target_goal}
                              </span>
                            )}
                          {participantStatus[event.id] && (
                            <span className="inline-flex items-center px-3 py-1 rounded-md text-xs font-semibold bg-green-500/20 text-green-400 border border-green-500/40">
                              <CheckCircle className="h-3 w-3 mr-1.5" />
                              Joined
                              </span>
                            )}
                            {isActive && (
                            <span className="text-xs text-success-400 font-semibold flex items-center bg-navy-900/90 px-3 py-1 rounded-md border border-success-400/30">
                              <div className="w-2 h-2 bg-success-400 rounded-full mr-1.5 animate-pulse"></div>
                                LIVE
                              </span>
                            )}
                          {event.max_participants && (
                            <div className="flex items-center gap-1.5">
                              <Users className="h-3.5 w-3.5 text-yellow-400 flex-shrink-0" />
                              <span className="text-yellow-300 font-medium text-xs">
                                {event.participants?.[0]?.count || 0} / {event.max_participants}
                              </span>
                            </div>
                            )}
                          </div>

                        {/* Title */}
                        <h3 className="text-lg sm:text-xl font-bold text-white mb-2 line-clamp-1 leading-tight flex-shrink-0">{event.name}</h3>
                        
                        {/* Description */}
                        <p className="text-xs sm:text-sm text-gray-300 line-clamp-2 mb-4 leading-relaxed flex-shrink-0">
                            {event.description || 'No description available'}
                          </p>
                        
                        {/* Event Details */}
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-gray-400 mb-4 flex-shrink-0">
                          <div className="flex items-center gap-1.5">
                            <Calendar className="h-3.5 w-3.5 text-yellow-400 flex-shrink-0" />
                            <span className="text-yellow-300 font-medium">
                            {formatDate(event.start_date)}
                            {event.end_date && new Date(event.start_date).toDateString() !== new Date(event.end_date).toDateString() && 
                              ` - ${formatDate(event.end_date)}`
                            }
                            </span>
                          </div>
                          
                          <div className="flex items-center gap-1.5">
                            <Clock className="h-3.5 w-3.5 text-yellow-400 flex-shrink-0" />
                            {event.start_date && event.end_date ? (
                              <span className="text-yellow-300 font-medium">
                            {formatTime(event.start_date)}
                                {event.start_date !== event.end_date && ` - ${formatTime(event.end_date)}`}
                              </span>
                            ) : (
                              <span className="text-gray-500">Time TBD</span>
                            )}
                          </div>
                          
                          {event.location && (
                            <div className="flex items-center gap-1.5">
                              <MapPin className="h-3.5 w-3.5 text-yellow-400 flex-shrink-0" />
                              <span className="text-yellow-300 font-medium truncate">{event.location}</span>
                            </div>
                          )}
                        </div>

                    {/* Donation Needs Summary */}
                        {event.event_items && event.event_items.length > 0 ? (
                          <div className="bg-navy-800/60 rounded-lg p-3 border border-yellow-400/30 mt-auto flex-shrink-0">
                            <div className="flex items-center justify-between mb-2.5">
                              <span className="text-sm font-semibold text-white uppercase tracking-wide">Donation Needs</span>
                              <span className="text-xs font-semibold text-yellow-400">
                            {event.event_items.filter(item => item.collected_quantity >= item.quantity).length} / {event.event_items.length} complete
                          </span>
                        </div>
                            <div className="flex flex-wrap gap-x-4 gap-y-1.5">
                          {event.event_items.slice(0, 2).map((item, index) => (
                                <div key={index} className="flex items-center gap-2 text-xs">
                                  <span className="text-gray-300">{item.name}</span>
                                  <span className="text-yellow-400 font-semibold">
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
                        ) : (
                          <div className="mt-auto flex-shrink-0"></div>
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

      {/* Join Event Confirmation Modal */}
      <JoinEventConfirmationModal
        isOpen={showJoinModal}
        onClose={() => {
          setShowJoinModal(false)
          setEventToJoin(null)
        }}
        onConfirm={confirmJoinEvent}
        event={eventToJoin}
        loading={eventToJoin ? joinLoading[eventToJoin.id] : false}
      />

      {/* Cancel Event Confirmation Modal */}
      <CancelEventConfirmationModal
        isOpen={showCancelModal}
        onClose={() => {
          setShowCancelModal(false)
          setEventToCancel(null)
        }}
        onConfirm={confirmCancelEvent}
        event={eventToCancel}
        loading={eventToCancel ? joinLoading[eventToCancel.id] : false}
      />
    </div>
  )
}

export default EventsPage 