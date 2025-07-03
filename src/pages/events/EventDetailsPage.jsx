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
import { db } from '../../lib/supabase'
import LoadingSpinner from '../../components/ui/LoadingSpinner'

const EventDetailsPage = () => {
  const { eventId } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const { success, error } = useToast()
  const [event, setEvent] = useState(null)
  const [loading, setLoading] = useState(true)
  const [isParticipant, setIsParticipant] = useState(false)
  const [joinLoading, setJoinLoading] = useState(false)

  useEffect(() => {
    fetchEventDetails()
  }, [eventId])

  const fetchEventDetails = async () => {
    try {
      setLoading(true)
      // For now, we'll create a mock event since we don't have the specific endpoint
      // In a real app, this would be: const data = await db.getEvent(eventId)
      const mockEvent = {
        id: eventId,
        name: "Community Food Distribution Drive",
        description: "Join us for a large-scale food distribution event to help families in need across our community. We'll be distributing fresh produce, canned goods, and essential items to registered families. Volunteers will help with setup, distribution, and cleanup. This is a great opportunity to make a direct impact in our community.",
        target_goal: "Food Distribution",
        location: "Cagayan de Oro Community Center, J.R. Borja St, Cagayan de Oro",
        start_date: "2024-02-15T08:00:00Z",
        end_date: "2024-02-15T16:00:00Z",
        max_participants: 50,
        current_participants: 23,
        status: "active",
        created_by: {
          name: "HopeLink Foundation",
          email: "admin@hopelink.org"
        },
        requirements: [
          "Must be able to lift up to 25 lbs",
          "Comfortable working with diverse groups",
          "Available for the full event duration",
          "Follow health and safety protocols"
        ],
        what_to_bring: [
          "Comfortable work clothes",
          "Water bottle",
          "Sun protection (hat, sunscreen)",
          "Valid ID for registration"
        ],
        schedule: [
          { time: "8:00 AM", activity: "Volunteer Registration & Orientation" },
          { time: "9:00 AM", activity: "Setup & Preparation" },
          { time: "10:00 AM", activity: "Distribution Begins" },
          { time: "12:00 PM", activity: "Lunch Break (provided)" },
          { time: "1:00 PM", activity: "Afternoon Distribution" },
          { time: "3:30 PM", activity: "Cleanup & Closing" },
          { time: "4:00 PM", activity: "Volunteer Appreciation" }
        ],
        contact_info: {
          coordinator: "Maria Santos",
          phone: "+63 88 123-4567",
          email: "events@hopelink.org"
        },
        donation_items: [
          {
            id: 1,
            name: "Rice Bags (10kg)",
            category: "Food & Beverages",
            quantity: 50,
            collected_quantity: 23,
            description: "High-quality rice for family distribution"
          },
          {
            id: 2,
            name: "Canned Goods",
            category: "Food & Beverages", 
            quantity: 100,
            collected_quantity: 45,
            description: "Assorted canned foods - vegetables, meat, fruits"
          },
          {
            id: 3,
            name: "Cooking Oil (1L)",
            category: "Food & Beverages",
            quantity: 30,
            collected_quantity: 30,
            description: "Vegetable cooking oil for families"
          },
          {
            id: 4,
            name: "Reusable Shopping Bags",
            category: "Household Items",
            quantity: 75,
            collected_quantity: 12,
            description: "Eco-friendly bags for distributing items"
          }
        ]
      }
      setEvent(mockEvent)
      
      // Mock check if user is already a participant
      setIsParticipant(Math.random() > 0.7) // 30% chance user is already participating
    } catch (err) {
      console.error('Error fetching event:', err)
      error('Failed to load event details')
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
      upcoming: 'bg-skyblue-900/20 text-skyblue-300',
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
    return (
      <div className="min-h-screen bg-navy-950 flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  if (!event) {
    return (
      <div className="min-h-screen bg-navy-950 py-8">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="card p-12 text-center">
            <AlertCircle className="h-16 w-16 text-danger-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-white mb-2">Event Not Found</h2>
            <p className="text-skyblue-300 mb-6">The event you're looking for doesn't exist or has been removed.</p>
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
            className="flex items-center text-skyblue-400 hover:text-skyblue-300 transition-colors"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Events
          </button>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2">
            {/* Event Header */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="card p-8 mb-8"
            >
              <div className="flex items-start justify-between mb-6">
                <div className="flex items-start">
                  <div className="bg-skyblue-600 p-3 rounded-lg mr-4">
                    <EventIcon className="h-8 w-8 text-white" />
                  </div>
                  <div>
                    <h1 className="text-3xl font-bold text-white mb-2">{event.name}</h1>
                    <div className="flex items-center gap-4 text-sm text-skyblue-400">
                      <span className={`inline-flex items-center px-3 py-1 rounded-full font-medium ${getStatusColor(event.status)}`}>
                        {event.status === 'active' ? 'Active' : 
                         event.status === 'upcoming' ? 'Upcoming' : 
                         event.status === 'completed' ? 'Completed' : 'Cancelled'}
                      </span>
                      <span>{event.target_goal}</span>
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  <button className="p-2 text-skyblue-400 hover:text-skyblue-300 hover:bg-navy-700 rounded-lg transition-all">
                    <Share2 className="h-5 w-5" />
                  </button>
                  <button className="p-2 text-skyblue-400 hover:text-skyblue-300 hover:bg-navy-700 rounded-lg transition-all">
                    <Heart className="h-5 w-5" />
                  </button>
                </div>
              </div>

              <p className="text-skyblue-200 leading-relaxed mb-6">{event.description}</p>

              {/* Key Details */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="flex items-center text-skyblue-200">
                    <Calendar className="h-5 w-5 mr-3 text-skyblue-400" />
                    <div>
                      <div className="font-medium">{formatDate(event.start_date)}</div>
                      <div className="text-sm text-skyblue-400">
                        {formatTime(event.start_date)} - {formatTime(event.end_date)}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-start text-skyblue-200">
                    <MapPin className="h-5 w-5 mr-3 text-skyblue-400 mt-0.5" />
                    <div>
                      <div className="font-medium">Location</div>
                      <div className="text-sm text-skyblue-400">{event.location}</div>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center text-skyblue-200">
                    <Users className="h-5 w-5 mr-3 text-skyblue-400" />
                    <div>
                      <div className="font-medium">Participants</div>
                      <div className="text-sm text-skyblue-400">
                        {event.current_participants} / {event.max_participants} joined
                      </div>
                    </div>
                  </div>
                  
                  <div>
                    <div className="flex justify-between text-sm text-skyblue-400 mb-1">
                      <span>Participation</span>
                      <span>{Math.round(participationPercentage)}%</span>
                    </div>
                    <div className="w-full bg-navy-700 rounded-full h-2">
                      <div 
                        className="bg-skyblue-500 h-2 rounded-full transition-all"
                        style={{ width: `${participationPercentage}%` }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Event Schedule */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="card p-8 mb-8"
            >
              <h2 className="text-xl font-semibold text-white mb-6">Event Schedule</h2>
              <div className="space-y-4">
                {event.schedule.map((item, index) => (
                  <div key={index} className="flex items-center">
                    <div className="bg-skyblue-600 w-2 h-2 rounded-full mr-4" />
                    <div className="flex-1 flex justify-between items-center">
                      <span className="text-skyblue-200">{item.activity}</span>
                      <span className="text-skyblue-400 text-sm font-medium">{item.time}</span>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>

            {/* Donation Needs */}
            {event.donation_items && event.donation_items.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 }}
                className="card p-8 mb-8"
              >
                <h2 className="text-xl font-semibold text-white mb-6">Donation Needs</h2>
                <p className="text-skyblue-400 mb-6">Help make this event successful by contributing these needed items:</p>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {event.donation_items.map((item, index) => {
                    const progress = item.quantity > 0 ? (item.collected_quantity / item.quantity) * 100 : 0
                    const isComplete = item.collected_quantity >= item.quantity
                    
                    return (
                      <div key={index} className="bg-navy-800 p-4 rounded-lg border border-navy-700">
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <h3 className="text-white font-medium">{item.name}</h3>
                            <p className="text-skyblue-400 text-sm">{item.category}</p>
                            {item.description && (
                              <p className="text-skyblue-300 text-sm mt-1">{item.description}</p>
                            )}
                          </div>
                          <div className="text-right">
                            <div className="text-white font-medium">
                              {item.collected_quantity} / {item.quantity}
                            </div>
                            <div className={`text-sm ${isComplete ? 'text-success-400' : 'text-skyblue-400'}`}>
                              {isComplete ? 'Complete' : 'Needed'}
                            </div>
                          </div>
                        </div>
                        
                        <div className="mb-3">
                          <div className="flex justify-between text-sm text-skyblue-400 mb-1">
                            <span>Progress</span>
                            <span>{Math.round(progress)}%</span>
                          </div>
                          <div className="w-full bg-navy-700 rounded-full h-2">
                            <div 
                              className={`h-2 rounded-full transition-all ${
                                isComplete ? 'bg-success-500' : 'bg-skyblue-500'
                              }`}
                              style={{ width: `${Math.min(progress, 100)}%` }}
                            />
                          </div>
                        </div>
                        
                        {!isComplete && (
                          <button className="w-full btn btn-sm btn-secondary">
                            <Gift className="h-4 w-4 mr-2" />
                            Donate This Item
                          </button>
                        )}
                      </div>
                    )
                  })}
                </div>
                
                <div className="mt-6 p-4 bg-skyblue-900/20 rounded-lg border border-skyblue-800">
                  <div className="flex items-center">
                    <Info className="h-5 w-5 text-skyblue-400 mr-3" />
                    <div>
                      <p className="text-skyblue-200 font-medium">Want to contribute?</p>
                      <p className="text-skyblue-400 text-sm">
                        Visit the donation page to contribute items for this event, or contact the organizer directly.
                      </p>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Requirements & What to Bring */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="grid grid-cols-1 md:grid-cols-2 gap-8"
            >
              <div className="card p-6">
                <h3 className="text-lg font-semibold text-white mb-4">Requirements</h3>
                <ul className="space-y-2">
                  {event.requirements.map((req, index) => (
                    <li key={index} className="flex items-start text-skyblue-200 text-sm">
                      <CheckCircle className="h-4 w-4 mr-2 text-success-400 mt-0.5 flex-shrink-0" />
                      {req}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="card p-6">
                <h3 className="text-lg font-semibold text-white mb-4">What to Bring</h3>
                <ul className="space-y-2">
                  {event.what_to_bring.map((item, index) => (
                    <li key={index} className="flex items-start text-skyblue-200 text-sm">
                      <Info className="h-4 w-4 mr-2 text-skyblue-400 mt-0.5 flex-shrink-0" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            </motion.div>
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-1">
            {/* Join Event Card */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="card p-6 mb-8"
            >
              <h3 className="text-lg font-semibold text-white mb-4">Participation</h3>
              
              {!user ? (
                <div className="text-center">
                  <p className="text-skyblue-300 text-sm mb-4">Please log in to join this event</p>
                  <Link to="/login" className="btn btn-primary w-full">
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
                    className="btn btn-secondary w-full"
                  >
                    {joinLoading ? <LoadingSpinner size="sm" /> : 'Leave Event'}
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
                    className="btn btn-primary w-full mb-4"
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
                  <p className="text-skyblue-400 text-xs">
                    {event.max_participants - event.current_participants} spots remaining
                  </p>
                </div>
              )}
            </motion.div>

            {/* Contact Information */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="card p-6 mb-8"
            >
              <h3 className="text-lg font-semibold text-white mb-4">Contact Information</h3>
              <div className="space-y-3 text-sm">
                <div>
                  <span className="text-skyblue-400">Coordinator:</span>
                  <div className="text-skyblue-200">{event.contact_info.coordinator}</div>
                </div>
                <div>
                  <span className="text-skyblue-400">Phone:</span>
                  <div className="text-skyblue-200">{event.contact_info.phone}</div>
                </div>
                <div>
                  <span className="text-skyblue-400">Email:</span>
                  <div className="text-skyblue-200">{event.contact_info.email}</div>
                </div>
              </div>
              <button className="btn btn-secondary w-full mt-4">
                <MessageCircle className="h-4 w-4 mr-2" />
                Contact Organizer
              </button>
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
                <div className="w-12 h-12 bg-skyblue-600 rounded-full flex items-center justify-center mr-3">
                  <span className="text-white font-semibold">
                    {event.created_by.name.charAt(0)}
                  </span>
                </div>
                <div>
                  <div className="font-medium text-white">{event.created_by.name}</div>
                  <div className="text-sm text-skyblue-400">{event.created_by.email}</div>
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