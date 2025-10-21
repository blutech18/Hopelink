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
  PartyPopper
} from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import { useToast } from '../../contexts/ToastContext'
import { db, supabase } from '../../lib/supabase'
import { FormSkeleton } from '../../components/ui/Skeleton'
import LoadingSpinner from '../../components/ui/LoadingSpinner'

const EventDetailsPage = () => {
  const { id: eventId } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const { success, error } = useToast()
  const [event, setEvent] = useState(null)
  const [loading, setLoading] = useState(true)
  const [isParticipant, setIsParticipant] = useState(false)
  const [joinLoading, setJoinLoading] = useState(false)

  useEffect(() => {
    if (eventId) {
      fetchEventDetails()
    }
  }, [eventId])

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
        current_participants: eventData.participants?.[0]?.count || 0,
        donation_items: eventData.event_items || [],
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
      
      // Check if user is already a participant
      if (user && supabase) {
        try {
          const { data: participation, error: participationError } = await supabase
            .from('event_participants')
            .select('id')
            .eq('event_id', eventId)
            .eq('user_id', user.id)
            .maybeSingle()
          
          if (!participationError) {
            setIsParticipant(!!participation)
          }
        } catch (participationErr) {
          console.log('Could not check participation status:', participationErr)
          setIsParticipant(false)
        }
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

    setJoinLoading(true)
    try {
      // Mock API call to join event
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      setIsParticipant(true)
      setEvent(prev => ({ ...prev, current_participants: prev.current_participants + 1 }))
      success('Successfully joined the event!')
    } catch (err) {
      console.error('Error joining event:', err)
      error('Failed to join event. Please try again.')
    } finally {
      setJoinLoading(false)
    }
  }

  const handleLeaveEvent = async () => {
    setJoinLoading(true)
    try {
      // Mock API call to leave event
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      setIsParticipant(false)
      setEvent(prev => ({ ...prev, current_participants: prev.current_participants - 1 }))
      success('You have left the event')
    } catch (err) {
      console.error('Error leaving event:', err)
      error('Failed to leave event. Please try again.')
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
    const date = new Date(dateString)
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    })
  }

  if (loading) {
    return <FormSkeleton />
  }

  if (!event) {
    return (
      <div className="min-h-screen bg-navy-950 py-8">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
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

  return (
    <div className="min-h-screen bg-navy-950 py-8">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Back Button */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="mb-6"
        >
          <button
            onClick={() => navigate('/events')}
            className="flex items-center text-white hover:text-yellow-300 transition-colors bg-navy-800/80 backdrop-blur-sm px-4 py-2 rounded-lg"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Events
          </button>
        </motion.div>

        {/* Hero Image Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6"
        >
          <div className="w-full rounded-lg overflow-hidden">
            {event.image_url ? (
              <>
                {/* Image - 100% Display */}
                <div className="w-full relative">
                  <img
                    src={event.image_url}
                    alt={event.name}
                    className="w-full h-96 object-cover"
                  />
                  {/* Gradient Transition Overlay at Bottom of Image */}
                  <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-b from-transparent to-[#00237d]"></div>
                  
                  {/* Share and Save Buttons - Top Right */}
                  <div className="absolute top-4 right-4 flex items-center gap-2">
                    <button 
                      className="p-2 bg-yellow-400 hover:bg-yellow-300 text-navy-900 rounded-lg transition-all shadow-lg"
                      title="Share Event"
                    >
                      <Share2 className="h-5 w-5" />
                    </button>
                    <button 
                      className="p-2 bg-yellow-400 hover:bg-yellow-300 text-navy-900 rounded-lg transition-all shadow-lg"
                      title="Save Event"
                    >
                      <Heart className="h-5 w-5" />
                    </button>
                  </div>
                </div>
                
                {/* Dark Blue Gradient Section Below Image */}
                <div className="w-full bg-gradient-to-b from-[#00237d] to-[#001a5c] p-8 pt-4">
                  <h1 className="text-4xl lg:text-5xl font-bold text-white mb-3">
                    {event.name}
                  </h1>
                  <p className="text-lg text-white/90 max-w-4xl">
                    {event.description}
                  </p>
                </div>
              </>
            ) : (
              <div className="w-full h-96 bg-gradient-to-br from-[#00237d] to-[#001a5c] flex flex-col items-center justify-center p-8">
                <EventIcon className="h-32 w-32 text-yellow-400 mb-6" />
                <h1 className="text-4xl lg:text-5xl font-bold text-white mb-3 text-center">
                  {event.name}
                </h1>
                <p className="text-lg text-white/90 max-w-4xl text-center">
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
          className="card p-6 mb-6 border-2 border-yellow-400/20"
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">
            <div className="flex items-start gap-4 bg-navy-700/30 p-4 rounded-lg border border-yellow-400/10">
              <div className="p-2 bg-yellow-400/20 rounded-lg">
                <Calendar className="h-6 w-6 text-yellow-400 flex-shrink-0" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="font-semibold text-white text-sm mb-1">Event Date</div>
                <div className="text-sm text-yellow-300 font-medium">{formatDate(event.start_date)}</div>
                <div className="text-xs text-yellow-200 mt-1">
                  {formatTime(event.start_date)} - {formatTime(event.end_date)}
                </div>
              </div>
            </div>
            
            <div className="flex items-start gap-4 bg-navy-700/30 p-4 rounded-lg border border-yellow-400/10">
              <div className="p-2 bg-yellow-400/20 rounded-lg">
                <MapPin className="h-6 w-6 text-yellow-400 flex-shrink-0" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="font-semibold text-white text-sm mb-1">Location</div>
                <div className="text-sm text-yellow-300 font-medium break-words">{event.location}</div>
              </div>
            </div>

            <div className="flex items-start gap-4 bg-navy-700/30 p-4 rounded-lg border border-yellow-400/10">
              <div className="p-2 bg-yellow-400/20 rounded-lg">
                <Users className="h-6 w-6 text-yellow-400 flex-shrink-0" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="font-semibold text-white text-sm mb-1">Participants</div>
                <div className="text-sm text-yellow-300 font-medium">
                  {event.current_participants} / {event.max_participants} joined
                </div>
              </div>
            </div>
          </div>

          {/* Enhanced Participation Bar - 3x Height */}
          <div className="bg-gradient-to-r from-yellow-900/20 to-orange-900/20 p-5 rounded-lg border border-yellow-400/30">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-yellow-400 rounded-lg">
                  <Users className="h-5 w-5 text-navy-900" />
                </div>
                <div>
                  <div className="font-bold text-white text-base">Event Participation</div>
                  <div className="text-xs text-yellow-300">
                    {event.current_participants} out of {event.max_participants} spots filled
                  </div>
                </div>
              </div>
              <div className="text-right">
                <div className="text-3xl font-bold text-yellow-300">{Math.round(participationPercentage)}%</div>
                <div className="text-xs text-yellow-200">Capacity</div>
              </div>
            </div>
            
            {/* 3x Height Progress Bar */}
            <div className="w-full bg-navy-700 rounded-full h-6 overflow-hidden shadow-inner">
              <div 
                className="bg-gradient-to-r from-yellow-400 to-orange-400 h-6 rounded-full transition-all duration-500 flex items-center justify-end pr-3"
                style={{ width: `${participationPercentage}%` }}
              >
                {participationPercentage > 15 && (
                  <span className="text-xs font-bold text-navy-900">{Math.round(participationPercentage)}%</span>
                )}
              </div>
            </div>
            
            {/* Status Message */}
            <div className="mt-3 text-center">
              {participationPercentage >= 100 ? (
                <span className="text-sm font-semibold text-red-400">⚠️ Event is Full</span>
              ) : participationPercentage >= 80 ? (
                <span className="text-sm font-semibold text-orange-400">🔥 Almost Full - Only {event.max_participants - event.current_participants} spots left!</span>
              ) : participationPercentage >= 50 ? (
                <span className="text-sm font-semibold text-yellow-300">✨ Filling Up Fast - {event.max_participants - event.current_participants} spots remaining</span>
              ) : (
                <span className="text-sm font-semibold text-green-400">✓ Plenty of Spots Available - {event.max_participants - event.current_participants} spots remaining</span>
              )}
            </div>
          </div>
        </motion.div>

        {/* Donation Needs - Full Width Row */}
        {event.donation_items && event.donation_items.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="card p-6 mb-6 border-2 border-yellow-400/30 bg-gradient-to-br from-yellow-900/10 to-orange-900/10"
          >
            <div className="flex items-center mb-6">
              <div className="bg-yellow-400 p-2 rounded-lg mr-3">
                <Gift className="h-6 w-6 text-navy-900" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-yellow-300">Donation Needs</h2>
                <p className="text-yellow-200 text-sm">Help make this event successful!</p>
              </div>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {event.donation_items.map((item, index) => {
                const progress = item.quantity > 0 ? (item.collected_quantity / item.quantity) * 100 : 0
                const isComplete = item.collected_quantity >= item.quantity
                
                return (
                  <div key={index} className="bg-navy-800/80 p-4 rounded-lg border border-yellow-400/20 hover:border-yellow-400/40 transition-all">
                    <div className="flex items-start justify-between mb-3">
                      <div className="min-w-0 flex-1">
                        <h3 className="text-white font-semibold text-sm truncate">{item.name}</h3>
                        <p className="text-yellow-300 text-xs font-medium">{item.category}</p>
                        {item.description && (
                          <p className="text-yellow-200 text-xs mt-1 line-clamp-2">{item.description}</p>
                        )}
                      </div>
                      <div className="text-right ml-2 flex-shrink-0">
                        <div className="text-white font-bold text-sm">
                          {item.collected_quantity}/{item.quantity}
                        </div>
                        <div className={`text-xs font-medium ${isComplete ? 'text-green-400' : 'text-yellow-400'}`}>
                          {isComplete ? '✓ Complete' : `${Math.round(progress)}%`}
                        </div>
                      </div>
                    </div>
                    
                    <div className="w-full bg-navy-700 rounded-full h-2 mb-3">
                      <div 
                        className={`h-2 rounded-full transition-all ${
                          isComplete ? 'bg-green-500' : 'bg-gradient-to-r from-yellow-400 to-orange-400'
                        }`}
                        style={{ width: `${Math.min(progress, 100)}%` }}
                      />
                    </div>
                    
                    {!isComplete && (
                      <button className="w-full btn btn-primary text-sm py-2 flex items-center justify-center font-semibold">
                        <Gift className="h-4 w-4 mr-2" />
                        Donate This Item
                      </button>
                    )}
                  </div>
                )
              })}
            </div>
            
            <div className="mt-6 p-4 bg-gradient-to-r from-yellow-900/20 to-orange-900/20 rounded-lg border border-yellow-400/30">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-yellow-300 font-bold">Total Progress</h4>
                  <p className="text-yellow-200 text-sm">
                    {event.donation_items.reduce((total, item) => total + item.collected_quantity, 0)} / {event.donation_items.reduce((total, item) => total + item.quantity, 0)} items collected
                  </p>
                </div>
                <div className="text-right">
                  <div className="text-3xl font-bold text-yellow-300">
                    {Math.round(event.donation_items.reduce((total, item) => total + (item.collected_quantity / item.quantity), 0) / event.donation_items.length * 100)}%
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* Two Column Layout for Remaining Content */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Column */}
          <div className="space-y-6">
            {/* Event Schedule */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="card p-6"
            >
              <h2 className="text-lg font-semibold text-white mb-4">Event Schedule</h2>
              <div className="space-y-3">
                {event.schedule.map((item, index) => (
                  <div key={index} className="flex items-center gap-3">
                    <div className="bg-yellow-400 w-2 h-2 rounded-full flex-shrink-0" />
                    <div className="flex-1 flex justify-between items-center min-w-0">
                      <span className="text-yellow-200 truncate">{item.activity}</span>
                      <span className="text-yellow-300 text-sm font-medium ml-2 flex-shrink-0">{item.time}</span>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>

            {/* Contact Information */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="card p-6"
            >
              <h3 className="text-lg font-semibold text-white mb-4">Contact Information</h3>
              <div className="space-y-3 text-sm">
                <div>
                  <span className="text-yellow-400">Coordinator:</span>
                  <div className="text-yellow-200">{event.contact_info.coordinator}</div>
                </div>
                <div>
                  <span className="text-yellow-400">Phone:</span>
                  <div className="text-yellow-200">{event.contact_info.phone}</div>
                </div>
                <div>
                  <span className="text-yellow-400">Email:</span>
                  <div className="text-yellow-200">{event.contact_info.email}</div>
                </div>
              </div>
              <button className="btn btn-secondary w-full mt-4 flex items-center justify-center">
                <MessageCircle className="h-4 w-4 mr-2" />
                Contact Organizer
              </button>
            </motion.div>
          </div>

          {/* Right Column */}
          <div className="space-y-6">
            {/* Requirements */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="card p-6"
            >
              <h3 className="text-lg font-semibold text-white mb-4">Requirements</h3>
              <ul className="space-y-2">
                {event.requirements.map((req, index) => (
                  <li key={index} className="flex items-start text-yellow-200 text-sm">
                    <CheckCircle className="h-4 w-4 mr-2 text-success-400 mt-0.5 flex-shrink-0" />
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
              className="card p-6"
            >
              <h3 className="text-lg font-semibold text-white mb-4">What to Bring</h3>
              <ul className="space-y-2">
                {event.what_to_bring.map((item, index) => (
                  <li key={index} className="flex items-start text-yellow-200 text-sm">
                    <Info className="h-4 w-4 mr-2 text-yellow-400 mt-0.5 flex-shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
            </motion.div>

            {/* Participation */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="card p-6"
            >
              <h3 className="text-lg font-semibold text-white mb-4">Participation</h3>
              
              {!user ? (
                <div className="text-center">
                  <p className="text-yellow-300 text-sm mb-4">Please log in to join this event</p>
                  <Link to="/login" className="btn btn-primary w-full flex items-center justify-center">
                    <UserPlus className="h-4 w-4 mr-2" />
                    Log In to Join
                  </Link>
                </div>
              ) : isCompleted ? (
                <div className="text-center">
                  <CheckCircle className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                  <p className="text-gray-400 text-sm">This event has ended</p>
                </div>
              ) : event.status === 'cancelled' ? (
                <div className="text-center">
                  <XCircle className="h-8 w-8 text-danger-400 mx-auto mb-2" />
                  <p className="text-danger-400 text-sm">This event has been cancelled</p>
                </div>
              ) : isParticipant ? (
                <div className="text-center">
                  <UserCheck className="h-8 w-8 text-success-400 mx-auto mb-3" />
                  <p className="text-success-300 font-medium mb-4">You're participating!</p>
                  <button
                    onClick={handleLeaveEvent}
                    disabled={joinLoading}
                    className="btn btn-secondary w-full flex items-center justify-center"
                  >
                    {joinLoading ? (
                      <LoadingSpinner size="sm" />
                    ) : (
                      <>
                        <XCircle className="h-4 w-4 mr-2" />
                        Leave Event
                      </>
                    )}
                  </button>
                </div>
              ) : event.current_participants >= event.max_participants ? (
                <div className="text-center">
                  <Users className="h-8 w-8 text-amber-400 mx-auto mb-2" />
                  <p className="text-amber-400 text-sm">Event is full</p>
                </div>
              ) : (
                <div className="text-center">
                  <button
                    onClick={handleJoinEvent}
                    disabled={joinLoading}
                    className="btn btn-primary w-full mb-4 flex items-center justify-center"
                  >
                    {joinLoading ? (
                      <LoadingSpinner size="sm" />
                    ) : (
                      <>
                        <UserPlus className="h-4 w-4 mr-2" />
                        Join Event
                      </>
                    )}
                  </button>
                  <p className="text-yellow-300 text-xs">
                    {event.max_participants - event.current_participants} spots remaining
                  </p>
                </div>
              )}
            </motion.div>

            {/* Event Creator */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="card p-6"
            >
              <h3 className="text-lg font-semibold text-white mb-4">Organized by</h3>
              <div className="flex items-center">
                <div className="w-12 h-12 bg-yellow-400 rounded-full flex items-center justify-center mr-3">
                  <span className="text-white font-semibold">
                    {event.created_by.name.split(' ').map(n => n[0]).join('')}
                  </span>
                </div>
                <div>
                  <div className="text-white font-medium">{event.created_by.name}</div>
                  <div className="text-sm text-yellow-300">{event.created_by.email}</div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default EventDetailsPage 