import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { useParams, useNavigate, Link } from 'react-router-dom'
import {
  Calendar,
  MapPin,
  Clock,
  Users,
  ArrowLeft,
  UserPlus,
  UserCheck,
  Share2,
  Heart,
  MessageCircle,
  ExternalLink,
  Flag,
  Info,
  CheckCircle,
  XCircle,
  AlertCircle,
  Utensils,
  Gift,
  GraduationCap,
  PartyPopper,
  Mail,
  Phone,
  User
} from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import { useToast } from '../../contexts/ToastContext'
import { db, supabase } from '../../lib/supabase'
import { FormSkeleton } from '../../components/ui/Skeleton'
import LoadingSpinner from '../../components/ui/LoadingSpinner'
import JoinEventConfirmationModal from '../../components/ui/JoinEventConfirmationModal'
import CancelEventConfirmationModal from '../../components/ui/CancelEventConfirmationModal'

const EventDetailsPage = () => {
  const { id: eventId } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const { success, error } = useToast()
  const [event, setEvent] = useState(null)
  const [loading, setLoading] = useState(true)
  const [isParticipant, setIsParticipant] = useState(false)
  const [joinLoading, setJoinLoading] = useState(false)
  const [windowWidth, setWindowWidth] = useState(typeof window !== 'undefined' ? window.innerWidth : 1024)
  const [showJoinModal, setShowJoinModal] = useState(false)
  const [showCancelModal, setShowCancelModal] = useState(false)

  useEffect(() => {
    if (eventId) {
      fetchEventDetails()
    }
  }, [eventId])

  useEffect(() => {
    const handleResize = () => {
      setWindowWidth(window.innerWidth)
    }
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  const fetchEventDetails = async () => {
    try {
      setLoading(true)
      
      // Fetch event from database
      const eventData = await db.getEvent(eventId)
      
      if (!eventData) {
        setEvent(null)
        return
      }

      // Transform the data to match the expected format
      const transformedEvent = {
        ...eventData,
        created_by: eventData.creator || { name: 'Unknown', email: '' },
        current_participants: Array.isArray(eventData.participants) ? eventData.participants.length : 0,
        donation_items: eventData.items || [],
        // Parse JSON fields if they exist
        requirements: eventData.requirements || [],
        what_to_bring: eventData.what_to_bring || [],
        schedule: eventData.schedule || [],
        contact_info: eventData.contact_info || {
          coordinator: eventData.creator?.name || 'Event Coordinator',
          phone: eventData.creator?.phone_number || 'N/A',
          email: eventData.creator?.email || 'N/A'
        }
      }
      
      setEvent(transformedEvent)
      
      // Check if user is already a participant via JSONB participants
      if (user) {
        const parts = Array.isArray(transformedEvent.participants) ? transformedEvent.participants : []
        setIsParticipant(parts.some(p => p.user_id === user.id))
      }
    } catch (err) {
      console.error('Error fetching event:', err)
      error('Failed to load event details')
      setEvent(null)
    } finally {
      setLoading(false)
    }
  }

  const handleJoinEvent = async () => {
    if (!user) {
      error('Please log in to join events')
      return
    }

    // Show confirmation modal
    setShowJoinModal(true)
  }

  const confirmJoinEvent = async () => {
    if (!user) return

    setJoinLoading(true)
    try {
      await db.joinEvent(eventId, user.id)
      
      setIsParticipant(true)
      setEvent(prev => ({ ...prev, current_participants: prev.current_participants + 1 }))
      success('Successfully joined the event!')
      setShowJoinModal(false)
      
      // Refresh event details to get updated participant count
      await fetchEventDetails()
    } catch (err) {
      console.error('Error joining event:', err)
      error(err.message || 'Failed to join event. Please try again.')
    } finally {
      setJoinLoading(false)
    }
  }

  const handleLeaveEvent = async () => {
    if (!user) return
    
    // Show confirmation modal
    setShowCancelModal(true)
  }

  const confirmCancelEvent = async () => {
    if (!user) return
    
    setJoinLoading(true)
    try {
      await db.leaveEvent(eventId, user.id)
      
      setIsParticipant(false)
      setEvent(prev => ({ ...prev, current_participants: Math.max(0, prev.current_participants - 1) }))
      success('You have canceled your registration')
      setShowCancelModal(false)
      
      // Refresh event details to get updated participant count
      await fetchEventDetails()
    } catch (err) {
      console.error('Error leaving event:', err)
      error(err.message || 'Failed to cancel registration. Please try again.')
    } finally {
      setJoinLoading(false)
    }
  }

  const getEventTypeIcon = (type) => {
    const icons = {
      'Food Distribution': Utensils,
      'Clothing Drive': Gift,
      'Educational Program': GraduationCap,
      'Community Cleanup': PartyPopper
    }
    return icons[type] || Calendar
  }

  const getStatusColor = (status) => {
    const colors = {
      active: 'bg-success-900/20 text-success-300',
      upcoming: 'bg-yellow-900/20 text-yellow-300',
      completed: 'bg-gray-900/20 text-gray-300',
      cancelled: 'bg-danger-900/20 text-danger-300'
    }
    return colors[status] || 'bg-gray-900/20 text-gray-300'
  }

  const formatDate = (dateString) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
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

  const formatScheduleTime = (timeString) => {
    if (!timeString) return timeString
    
    // Check if it's already in 12-hour format (contains AM/PM)
    if (/AM|PM/i.test(timeString)) {
      return timeString
    }
    
    // Try to parse as 24-hour format (HH:MM or HH:MM:SS)
    const timeMatch = timeString.match(/(\d{1,2}):(\d{2})(?::(\d{2}))?/)
    if (timeMatch) {
      let hours = parseInt(timeMatch[1], 10)
      const minutes = timeMatch[2]
      const ampm = hours >= 12 ? 'PM' : 'AM'
      
      if (hours === 0) {
        hours = 12
      } else if (hours > 12) {
        hours = hours - 12
      }
      
      return `${hours}:${minutes} ${ampm}`
    }
    
    // Return as-is if we can't parse it
    return timeString
  }

  if (loading) {
    return <FormSkeleton />
  }

  if (!event) {
    return (
      <div className="min-h-screen py-8" style={{backgroundColor: '#00237d'}}>
        <div className="w-full px-4 sm:px-6 lg:px-8">
          <div className="card p-12 text-center">
            <AlertCircle className="h-16 w-16 text-danger-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-white mb-2">Event Not Found</h2>
            <p className="text-yellow-300 mb-6">The event you're looking for doesn't exist or has been removed.</p>
            <Link to="/events" className="btn btn-primary">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Events
            </Link>
          </div>
        </div>
      </div>
    )
  }

      const EventIcon = getEventTypeIcon(event.target_goal)
  const isUpcoming = new Date(event.start_date) > new Date()
  const isActive = new Date(event.start_date) <= new Date() && new Date(event.end_date) >= new Date()
  const isCompleted = new Date(event.end_date) < new Date()
  const participationPercentage = (event.current_participants / event.max_participants) * 100

  // Calculate responsive grid columns for donation items
  const getDonationGridColumns = (count) => {
    if (count === 1) return '1fr'
    if (count === 2) return 'repeat(2, 1fr)'
    if (count === 3) return 'repeat(3, 1fr)'
    if (count === 4) return 'repeat(4, 1fr)'
    if (count === 5) return 'repeat(5, 1fr)'
    if (count === 6) return 'repeat(3, 1fr)'
    return 'repeat(4, 1fr)' // 7+ items
  }

  return (
    <div className="min-h-screen py-6" style={{backgroundColor: '#00237d'}}>
      <div className="w-full px-4 sm:px-6 lg:px-8">
        {/* Back Button */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="mb-4"
        >
          <button
            onClick={() => navigate('/events')}
            className="flex items-center text-white hover:text-yellow-300 transition-colors bg-navy-800/60 px-3 py-1.5 rounded-lg text-sm"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Events
          </button>
        </motion.div>

        {/* Hero Image Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-4"
        >
          <div className="w-full rounded-lg overflow-hidden border-2 border-yellow-500/30">
            {event.image_url ? (
              <>
                {/* Image - 100% Display */}
                <div className="w-full relative">
                  <img
                    src={event.image_url}
                    alt={event.name}
                    className="w-full h-80 object-cover"
                  />
                  {/* Gradient Transition Overlay at Bottom of Image */}
                  <div className="absolute bottom-0 left-0 right-0 h-20 bg-gradient-to-b from-transparent to-[#00237d]"></div>
                  
                  {/* Share and Save Buttons - Top Right */}
                  <div className="absolute top-3 right-3 flex items-center gap-2">
                    <button 
                      className="p-2 bg-yellow-400 hover:bg-yellow-300 text-navy-900 rounded-lg transition-all shadow-lg"
                      title="Share Event"
                    >
                      <Share2 className="h-4 w-4" />
                    </button>
                    <button 
                      className="p-2 bg-yellow-400 hover:bg-yellow-300 text-navy-900 rounded-lg transition-all shadow-lg"
                      title="Save Event"
                    >
                      <Heart className="h-4 w-4" />
                    </button>
                  </div>
                </div>
                
                {/* Dark Blue Gradient Section Below Image */}
                <div className="w-full bg-gradient-to-b from-[#00237d] to-[#001a5c] p-6">
                  <h1 className="text-3xl lg:text-4xl font-bold text-white mb-2">
                    {event.name}
                  </h1>
                  <p className="text-base text-white/85">
                    {event.description}
                  </p>
                </div>
              </>
            ) : (
              <div className="w-full h-80 bg-gradient-to-br from-[#00237d] to-[#001a5c] flex flex-col items-center justify-center p-6 border-2 border-yellow-500/30 rounded-lg">
                <EventIcon className="h-24 w-24 text-yellow-400 mb-4" />
                <h1 className="text-3xl lg:text-4xl font-bold text-white mb-2 text-center">
                  {event.name}
                </h1>
                <p className="text-base text-white/85 text-center">
                  {event.description}
                </p>
              </div>
            )}
          </div>
        </motion.div>

        {/* Event Details Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="card p-4 mb-4 border border-yellow-500/20"
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
            <div className="flex items-center justify-between gap-3 bg-navy-800/40 p-3 rounded-lg border border-yellow-500/10">
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <div className="p-1.5 bg-yellow-400/20 rounded flex-shrink-0">
                  <Calendar className="h-4 w-4 text-yellow-400" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-semibold text-yellow-400 uppercase tracking-wide mb-0.5">Date & Time</div>
                  <div className="text-sm text-white font-medium">{formatDate(event.start_date)}</div>
                </div>
              </div>
              <div className="text-right flex-shrink-0">
                <div className="text-xs text-gray-400">
                  {formatTime(event.start_date)} - {formatTime(event.end_date)}
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-3 bg-navy-800/40 p-3 rounded-lg border border-yellow-500/10">
              <div className="p-1.5 bg-yellow-400/20 rounded">
                <MapPin className="h-4 w-4 text-yellow-400 flex-shrink-0" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-xs font-semibold text-yellow-400 uppercase tracking-wide mb-0.5">Location</div>
                <div className="text-sm text-white font-medium break-words">{event.location}</div>
              </div>
            </div>
          </div>

          {/* Participation Bar */}
          <div className="bg-navy-800/40 p-4 rounded-lg border border-yellow-500/20">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-yellow-400" />
                <span className="text-sm font-semibold text-white">Participation</span>
                <span className="text-xs text-gray-400">
                  ({event.current_participants}/{event.max_participants})
                </span>
              </div>
              
              {/* Right Side: Button and Percentage */}
              <div className="flex items-center gap-3">
                {/* Action Button */}
                {!user ? (
                  <Link to="/login" className="btn btn-primary text-sm px-6 py-2 flex items-center justify-center">
                    <UserPlus className="h-3.5 w-3.5 mr-2" />
                    Log In to Join
                  </Link>
                ) : isCompleted ? (
                  <div className="flex items-center gap-2 px-4 py-2 bg-navy-900/50 rounded-lg border border-gray-700">
                    <CheckCircle className="h-4 w-4 text-gray-400" />
                    <span className="text-gray-400 text-sm font-medium">Event has ended</span>
                  </div>
                ) : event.status === 'cancelled' ? (
                  <div className="flex items-center gap-2 px-4 py-2 bg-navy-900/50 rounded-lg border border-danger-500/30">
                    <XCircle className="h-4 w-4 text-danger-400" />
                    <span className="text-danger-400 text-sm font-medium">Event cancelled</span>
                </div>
                ) : isParticipant ? (
                  <button
                    onClick={handleLeaveEvent}
                    disabled={joinLoading}
                    className="btn btn-secondary text-sm px-6 py-2 flex items-center justify-center"
                  >
                    {joinLoading ? (
                      <LoadingSpinner size="sm" />
                    ) : (
                      <>
                        <XCircle className="h-3.5 w-3.5 mr-2" />
                        Cancel
                      </>
                    )}
                  </button>
                ) : event.current_participants >= event.max_participants ? (
                  <div className="flex items-center gap-2 px-4 py-2 bg-navy-900/50 rounded-lg border border-amber-500/30">
                    <Users className="h-4 w-4 text-amber-400" />
                    <span className="text-amber-400 text-sm font-medium">Event is full</span>
                  </div>
                ) : (
                  <button
                    onClick={handleJoinEvent}
                    disabled={joinLoading}
                    className="btn btn-primary text-sm px-6 py-2 flex items-center justify-center"
                  >
                    {joinLoading ? (
                      <LoadingSpinner size="sm" />
                    ) : (
                      <>
                        <UserPlus className="h-3.5 w-3.5 mr-2" />
                        Join Event
                      </>
                    )}
                  </button>
                )}
                
                {/* Percentage */}
                <div className="px-3 py-1.5 bg-yellow-400/20 border border-yellow-400/40 rounded-lg">
                  <span className="text-sm font-bold text-yellow-400">{Math.round(participationPercentage)}%</span>
                </div>
              </div>
            </div>
            
            {/* Progress Bar */}
            <div className="w-full bg-navy-900 rounded-full h-2.5 overflow-hidden">
              <div 
                className="bg-gradient-to-r from-yellow-400 to-yellow-500 h-2.5 rounded-full transition-all duration-500"
                style={{ width: `${participationPercentage}%` }}
              />
            </div>
          </div>
        </motion.div>

        {/* Donation Needs */}
        {event.donation_items && event.donation_items.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="card p-4 mb-4 border border-yellow-500/20"
          >
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-yellow-500/10">
              <div className="flex items-center gap-2">
                <Gift className="h-4 w-4 text-yellow-400" />
                <h2 className="text-lg font-bold text-white">Donation Needs</h2>
                <span className="text-sm text-gray-400">
                  ({event.donation_items.reduce((total, item) => total + item.collected_quantity, 0)} / {event.donation_items.reduce((total, item) => total + item.quantity, 0)})
                </span>
              </div>
            </div>
            
            <div 
              className="grid gap-3"
              style={{
                gridTemplateColumns: windowWidth >= 1024 
                  ? getDonationGridColumns(event.donation_items.length)
                  : windowWidth >= 640 
                  ? event.donation_items.length <= 2 
                    ? `repeat(${event.donation_items.length}, 1fr)` 
                    : 'repeat(2, 1fr)'
                  : '1fr'
              }}
            >
              {event.donation_items.map((item, index) => {
                const progress = item.quantity > 0 ? (item.collected_quantity / item.quantity) * 100 : 0
                const isComplete = item.collected_quantity >= item.quantity
                
                return (
                  <div key={index} className="bg-navy-800/40 p-3 rounded-lg border border-yellow-500/10 hover:border-yellow-500/30 transition-all">
                    <div className="flex items-start justify-between mb-2">
                      <div className="min-w-0 flex-1">
                        <h3 className="text-white font-semibold text-sm">
                          {item.name} <span className="text-gray-400 font-normal">({item.collected_quantity} / {item.quantity})</span>
                        </h3>
                        <p className="text-yellow-400 text-xs">{item.category}</p>
                      </div>
                      
                      {/* Button and Percentage - Upper Right */}
                      <div className="flex items-center gap-2 ml-2 flex-shrink-0">
                        {!isComplete && (
                          <button className="btn btn-primary text-xs px-4 py-1.5 flex items-center justify-center">
                            <Gift className="h-3 w-3 mr-1.5" />
                            Donate
                          </button>
                        )}
                        <div className={`px-2.5 py-1 border rounded-lg ${isComplete ? 'bg-green-400/20 border-green-400/40' : 'bg-yellow-400/20 border-yellow-400/40'}`}>
                          <span className={`text-xs font-bold ${isComplete ? 'text-green-400' : 'text-yellow-400'}`}>
                            {isComplete ? '100%' : `${Math.round(progress)}%`}
                          </span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="w-full bg-navy-900 rounded-full h-1.5">
                      <div 
                        className={`h-1.5 rounded-full transition-all ${
                          isComplete ? 'bg-green-500' : 'bg-yellow-400'
                        }`}
                        style={{ width: `${Math.min(progress, 100)}%` }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
            
            <div className="mt-4 pt-3 border-t border-yellow-500/10">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs font-semibold text-yellow-400 uppercase tracking-wide">Total Progress</span>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {event.donation_items.reduce((total, item) => total + item.collected_quantity, 0)} / {event.donation_items.reduce((total, item) => total + item.quantity, 0)} items
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <div className="px-3 py-1.5 bg-yellow-400/20 border border-yellow-400/40 rounded-lg">
                    <span className="text-sm font-bold text-yellow-400">
                    {Math.round(event.donation_items.reduce((total, item) => total + (item.collected_quantity / item.quantity), 0) / event.donation_items.length * 100)}%
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* Event Schedule and Contact Information - Side by Side */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            {/* Event Schedule */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            className="card p-4 border border-yellow-500/20"
            style={{ minHeight: '280px' }}
            >
            <h2 className="text-base font-bold text-white mb-3 pb-2 border-b border-yellow-500/10">Event Schedule</h2>
            {/* Event Time Range */}
            <div className="mb-4 p-3 bg-yellow-400/10 rounded-lg border border-yellow-400/20">
              <div className="flex items-center gap-2 mb-1">
                <Clock className="h-4 w-4 text-yellow-400" />
                <span className="text-xs font-semibold text-yellow-400 uppercase tracking-wide">Event Time</span>
              </div>
              <div className="text-white font-medium text-sm">
                {formatTime(event.start_date)} - {formatTime(event.end_date)}
              </div>
            </div>
            {/* Schedule Items */}
            {event.schedule && event.schedule.length > 0 && (
              <div className="space-y-2">
                {event.schedule.map((item, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <div className="bg-yellow-400 w-1.5 h-1.5 rounded-full flex-shrink-0" />
                    <div className="flex-1 flex justify-between items-center min-w-0">
                      <span className="text-white text-sm truncate">{item.activity}</span>
                      <span className="text-yellow-400 text-xs font-medium ml-2 flex-shrink-0">{formatScheduleTime(item.time)}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
            </motion.div>

            {/* Contact Information */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            className="card p-4 border border-yellow-500/20"
            style={{ minHeight: '280px' }}
            >
            <h3 className="text-base font-bold text-white mb-4 pb-2 border-b border-yellow-500/10">Contact Information</h3>
            <div className="space-y-3">
              <div className="flex items-start justify-between gap-4 p-2.5 bg-navy-800/40 rounded-lg border border-yellow-500/10 hover:border-yellow-500/30 transition-colors">
                <div className="flex items-center gap-2 flex-shrink-0">
                  <div className="p-1.5 bg-yellow-400/20 rounded">
                    <User className="h-4 w-4 text-yellow-400" />
                  </div>
                  <span className="text-yellow-400 text-xs uppercase tracking-wide font-semibold">Coordinator</span>
                </div>
                <div className="text-right flex-1">
                  <div className="text-white text-sm font-medium">{event.contact_info.coordinator}</div>
                </div>
              </div>
              
              <div className="flex items-start justify-between gap-4 p-2.5 bg-navy-800/40 rounded-lg border border-yellow-500/10 hover:border-yellow-500/30 transition-colors">
                <div className="flex items-center gap-2 flex-shrink-0">
                  <div className="p-1.5 bg-yellow-400/20 rounded">
                    <Phone className="h-4 w-4 text-yellow-400" />
                  </div>
                  <span className="text-yellow-400 text-xs uppercase tracking-wide font-semibold">Phone</span>
                </div>
                <div className="text-right flex-1">
                  <div className="text-white text-sm font-medium">{event.contact_info.phone}</div>
                </div>
              </div>
              
              <div className="flex items-start justify-between gap-4 p-2.5 bg-navy-800/40 rounded-lg border border-yellow-500/10 hover:border-yellow-500/30 transition-colors">
                <div className="flex items-center gap-2 flex-shrink-0">
                  <div className="p-1.5 bg-yellow-400/20 rounded">
                    <Mail className="h-4 w-4 text-yellow-400" />
                  </div>
                  <span className="text-yellow-400 text-xs uppercase tracking-wide font-semibold">Email</span>
                </div>
                <div className="text-right flex-1">
                  <div className="text-white text-sm font-medium break-words">{event.contact_info.email}</div>
                </div>
              </div>
            </div>
            </motion.div>
          </div>

        {/* Requirements and What to Bring - Side by Side */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            {/* Requirements */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            className="card p-4 border border-yellow-500/20"
            style={{ minHeight: '280px' }}
            >
            <h3 className="text-base font-bold text-white mb-3 pb-2 border-b border-yellow-500/10">Requirements</h3>
            <ul className="space-y-1.5">
                {event.requirements.map((req, index) => (
                <li key={index} className="flex items-start text-white text-sm">
                  <CheckCircle className="h-3.5 w-3.5 mr-2 text-success-400 mt-0.5 flex-shrink-0" />
                    {req}
                  </li>
                ))}
              </ul>
            </motion.div>

            {/* What to Bring */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            className="card p-4 border border-yellow-500/20"
            style={{ minHeight: '280px' }}
            >
            <h3 className="text-base font-bold text-white mb-3 pb-2 border-b border-yellow-500/10">What to Bring</h3>
            <ul className="space-y-1.5">
                {event.what_to_bring.map((item, index) => (
                <li key={index} className="flex items-start text-white text-sm">
                  <Info className="h-3.5 w-3.5 mr-2 text-yellow-400 mt-0.5 flex-shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
            </motion.div>
        </div>

        {/* Organized by - Full Width */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="card p-6 border border-yellow-500/20"
            >
          <h3 className="text-lg font-semibold text-white mb-4 text-center pb-2 border-b border-yellow-500/10">Organized by</h3>
              
          <div className="flex items-center justify-center gap-4 flex-wrap">
            {/* Avatar */}
            <div className="flex-shrink-0">
              <div className="w-12 h-12 bg-gradient-to-br from-yellow-400 to-yellow-500 rounded-full flex items-center justify-center shadow-lg">
                <span className="text-white font-bold text-lg">
                  {event.created_by.name.split(' ').map(n => n[0]).join('').toUpperCase()}
                </span>
                </div>
                </div>

            {/* Name */}
            <div className="flex-shrink-0">
              <h4 className="text-base font-bold text-white">{event.created_by.name}</h4>
                </div>

            {/* Contact Details - Plain Text */}
            {event.created_by.email && (
              <div className="flex items-center gap-2">
                <Mail className="h-3.5 w-3.5 text-yellow-400 flex-shrink-0" />
                <div className="min-w-0">
                  <span className="text-xs text-yellow-400 uppercase tracking-wide mr-2">Email:</span>
                  <span className="text-sm text-white truncate max-w-[200px]">{event.created_by.email}</span>
                </div>
                </div>
              )}
            
            {event.contact_info?.phone && event.contact_info.phone !== 'N/A' && (
              <div className="flex items-center gap-2">
                <Phone className="h-3.5 w-3.5 text-yellow-400 flex-shrink-0" />
                <div className="min-w-0">
                  <span className="text-xs text-yellow-400 uppercase tracking-wide mr-2">Phone:</span>
                  <span className="text-sm text-white">{event.contact_info.phone}</span>
                </div>
              </div>
            )}
          </div>
        </motion.div>
      </div>

      {/* Join Event Confirmation Modal */}
      <JoinEventConfirmationModal
        isOpen={showJoinModal}
        onClose={() => setShowJoinModal(false)}
        onConfirm={confirmJoinEvent}
        event={event}
        loading={joinLoading}
      />

      {/* Cancel Event Confirmation Modal */}
      <CancelEventConfirmationModal
        isOpen={showCancelModal}
        onClose={() => setShowCancelModal(false)}
        onConfirm={confirmCancelEvent}
        event={event}
        loading={joinLoading}
      />
    </div>
  )
}

export default EventDetailsPage 