import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { 
  Calendar, 
  Search, 
  Filter,
  Eye,
  Edit,
  Trash2,
  MapPin,
  Clock,
  Users,
  Plus,
  CheckCircle,
  XCircle,
  AlertTriangle,
  CalendarDays,
  PartyPopper,
  Gift,
  Utensils,
  GraduationCap,
  Heart,
  FileText
} from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import { useToast } from '../../contexts/ToastContext'
import { db } from '../../lib/supabase'
import { ListPageSkeleton } from '../../components/ui/Skeleton'
import ConfirmationModal from '../../components/ui/ConfirmationModal'
import CreateEventModal from '../../components/ui/CreateEventModal'

const AdminEventsPage = () => {
  const { user } = useAuth()
  const { success, error } = useToast()
  const [events, setEvents] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false)
  const [eventToDelete, setEventToDelete] = useState(null)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [editingEvent, setEditingEvent] = useState(null)
  const [showCancelConfirmation, setShowCancelConfirmation] = useState(false)
  const [eventToCancel, setEventToCancel] = useState(null)
  const [showViewModal, setShowViewModal] = useState(false)
  const [selectedEvent, setSelectedEvent] = useState(null)

  useEffect(() => {
    loadEvents()
  }, [])

  const loadEvents = async () => {
    try {
      setLoading(true)
      
      // Fetch events with limit for better performance
      const eventsData = await db.getEvents({ limit: 100 })
      setEvents(eventsData || [])
    } catch (error) {
      console.error('Error loading events:', error)
      setEvents([]) // Fallback to empty array on error
    } finally {
      setLoading(false)
    }
  }

  const filteredEvents = events.filter(event => {
    const matchesSearch = event.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         event.description?.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesStatus = statusFilter === 'all' || event.status === statusFilter
    const matchesCategory = categoryFilter === 'all' || event.target_goal === categoryFilter
    
    return matchesSearch && matchesStatus && matchesCategory
  })

  const getStatusColor = (status) => {
    switch (status) {
      case 'active': return 'text-green-400 bg-green-500/20'
      case 'upcoming': return 'text-blue-400 bg-blue-500/20'
      case 'completed': return 'text-gray-400 bg-gray-500/20'
      case 'cancelled': return 'text-red-400 bg-red-500/20'
      default: return 'text-yellow-400 bg-yellow-500/20'
    }
  }

  const getStatusIcon = (status) => {
    switch (status) {
      case 'active': return CheckCircle
      case 'upcoming': return Clock
      case 'completed': return CalendarDays
      case 'cancelled': return XCircle
      default: return Clock
    }
  }

  const getCategoryIcon = (category) => {
    switch (category) {
      case 'Fundraising': return Gift
      case 'Food Distribution': return Utensils
      case 'Educational Program': return GraduationCap
      case 'Community Cleanup': return Heart
      case 'Clothing Drive': return Gift
      case 'Medical Mission': return Heart
      default: return Calendar
    }
  }

  const handleCreateEvent = () => {
    setEditingEvent(null)
    setShowCreateModal(true)
  }

  const handleEditEvent = (event) => {
    setEditingEvent(event)
    setShowCreateModal(true)
  }

  const handleViewEvent = (event) => {
    setSelectedEvent(event)
    setShowViewModal(true)
  }

  const handleCancelEvent = async (eventId) => {
    setEventToCancel(eventId)
    setShowCancelConfirmation(true)
  }

  const confirmCancelEvent = async () => {
    if (!eventToCancel) return
    
    try {
      await db.updateEvent(eventToCancel, { status: 'cancelled' }, [])
      await loadEvents()
      setShowCancelConfirmation(false)
      setEventToCancel(null)
      success('Event cancelled successfully')
    } catch (err) {
      console.error('Error cancelling event:', err)
      error('Failed to cancel event')
    }
  }

  const handleDeleteEvent = async (eventId) => {
    setEventToDelete(eventId)
    setShowDeleteConfirmation(true)
  }

  const confirmDeleteEvent = async () => {
    if (!eventToDelete) return
    
    try {
      await db.deleteEvent(eventToDelete)
      await loadEvents()
      setShowDeleteConfirmation(false)
      setEventToDelete(null)
      success('Event deleted successfully')
    } catch (error) {
      console.error('Error deleting event:', error)
      error('Failed to delete event')
    }
  }

  const handleSaveEvent = async (eventData) => {
    try {
      if (editingEvent) {
        await db.updateEvent(editingEvent.id, eventData)
        success('Event updated successfully')
      } else {
        await db.createEvent(eventData)
        success('Event created successfully')
      }
      await loadEvents()
      setShowCreateModal(false)
      setEditingEvent(null)
    } catch (error) {
      console.error('Error saving event:', error)
      error('Failed to save event')
    }
  }

  if (loading) {
    return <ListPageSkeleton />
  }

  return (
    <div className="min-h-screen py-4 sm:py-8 custom-scrollbar" style={{backgroundColor: '#00237d'}}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6 sm:mb-8"
        >
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
            <div className="flex items-center gap-3 sm:gap-4">
              <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-xl bg-gradient-to-br from-yellow-500 to-yellow-600 flex items-center justify-center shadow-lg flex-shrink-0">
                <Calendar className="w-6 h-6 sm:w-7 sm:h-7 text-white" />
              </div>
              <div className="min-w-0">
                <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white">Events Management</h1>
                <p className="text-yellow-300 text-xs sm:text-sm">Manage community events and activities</p>
              </div>
            </div>
            <div className="w-full sm:w-auto">
              <button
                onClick={handleCreateEvent}
                className="btn btn-primary flex items-center justify-center gap-2 w-full sm:w-auto py-3 sm:py-2 active:scale-95"
              >
                <Plus className="h-4 w-4 flex-shrink-0" />
                <span>Create Event</span>
              </button>
            </div>
          </div>

          {/* Filters */}
          <div className="flex flex-col gap-3 sm:gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-yellow-400 flex-shrink-0" />
              <input
                type="text"
                placeholder="Search events by title or description..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-3 sm:py-2 bg-navy-800 border border-navy-700 rounded-lg text-white text-sm sm:text-base placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:border-transparent"
              />
            </div>
            
            <div className="flex flex-col sm:flex-row gap-3">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="flex-1 px-4 py-3 sm:py-2 bg-navy-800 border border-navy-700 rounded-lg text-white text-sm sm:text-base focus:outline-none focus:ring-2 focus:ring-yellow-400"
              >
                <option value="all">All Status</option>
                <option value="active">Active</option>
                <option value="upcoming">Upcoming</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
              </select>
              
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="flex-1 px-4 py-3 sm:py-2 bg-navy-800 border border-navy-700 rounded-lg text-white text-sm sm:text-base focus:outline-none focus:ring-2 focus:ring-yellow-400"
              >
                <option value="all">All Categories</option>
                <option value="Food Distribution">Food Distribution</option>
                <option value="Clothing Drive">Clothing Drive</option>
                <option value="Medical Mission">Medical Mission</option>
                <option value="Educational Program">Educational Program</option>
                <option value="Community Cleanup">Community Cleanup</option>
                <option value="Fundraising">Fundraising</option>
                <option value="Volunteer Training">Volunteer Training</option>
                <option value="Awareness Campaign">Awareness Campaign</option>
                <option value="Emergency Relief">Emergency Relief</option>
                <option value="celebration">Celebration</option>
              </select>
            </div>
          </div>

          {/* Stats */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-6 sm:mb-8"
          >
            <div className="card p-4 sm:p-6">
              <div className="flex items-center space-x-3">
                <Calendar className="h-6 w-6 sm:h-8 sm:w-8 text-blue-400" />
                <div className="flex flex-col">
                  <p className="text-xl sm:text-2xl font-bold text-white">{events.length}</p>
                  <p className="text-yellow-300 text-xs sm:text-sm">Total Events</p>
                </div>
              </div>
            </div>
            
            <div className="card p-4 sm:p-6">
              <div className="flex items-center space-x-3">
                <CheckCircle className="h-6 w-6 sm:h-8 sm:w-8 text-green-400" />
                <div className="flex flex-col">
                  <p className="text-xl sm:text-2xl font-bold text-white">
                    {events.filter(e => e.status === 'active').length}
                  </p>
                  <p className="text-yellow-300 text-xs sm:text-sm">Active</p>
                </div>
              </div>
            </div>
            
            <div className="card p-4 sm:p-6">
              <div className="flex items-center space-x-3">
                <Clock className="h-6 w-6 sm:h-8 sm:w-8 text-yellow-400" />
                <div className="flex flex-col">
                  <p className="text-xl sm:text-2xl font-bold text-white">
                    {events.filter(e => e.status === 'upcoming').length}
                  </p>
                  <p className="text-yellow-300 text-xs sm:text-sm">Upcoming</p>
                </div>
              </div>
            </div>
            
            <div className="card p-4 sm:p-6">
              <div className="flex items-center space-x-3">
                <CalendarDays className="h-6 w-6 sm:h-8 sm:w-8 text-gray-400" />
                <div className="flex flex-col">
                  <p className="text-xl sm:text-2xl font-bold text-white">
                    {events.filter(e => e.status === 'completed').length}
                  </p>
                  <p className="text-yellow-300 text-xs sm:text-sm">Completed</p>
                </div>
              </div>
            </div>
          </motion.div>
        </motion.div>

        {/* Events List */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="card overflow-hidden"
          style={{backgroundColor: '#001a5c'}}
        >
          <div className="px-4 sm:px-6 py-4 border-b border-navy-700">
            <h2 className="text-lg sm:text-xl font-semibold text-white">
              Events ({filteredEvents.length})
            </h2>
          </div>
          
          <div className="overflow-x-auto">
            <div className="min-w-[800px]">
            <table className="w-full">
              <thead className="bg-navy-800">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-yellow-300 uppercase tracking-wider">
                    Event
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-yellow-300 uppercase tracking-wider">
                    Category
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-yellow-300 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-yellow-300 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-yellow-300 uppercase tracking-wider">
                    Location
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-yellow-300 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-navy-700">
                {filteredEvents.map((event, index) => {
                  const StatusIcon = getStatusIcon(event.status)
                  const CategoryIcon = getCategoryIcon(event.target_goal)
                  
                  return (
                    <tr key={event.id} className="hover:bg-navy-800/50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 h-10 w-10">
                            <div className="h-10 w-10 rounded-lg bg-navy-800 flex items-center justify-center">
                              <CategoryIcon className="h-5 w-5 text-yellow-300" />
                            </div>
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-white">{event.name}</div>
                            <div className="text-sm text-yellow-400 truncate max-w-xs">
                              {event.description}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-navy-800 text-yellow-300">
                          {event.target_goal || 'General'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-white">
                        {new Date(event.start_date).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(event.status)}`}>
                          <StatusIcon className="h-3 w-3 mr-1" />
                          {event.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-yellow-400">
                        {event.location || 'Not specified'}
                      </td>
                       <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                         <div className="flex items-center justify-end space-x-2">
                           <button
                             onClick={() => handleViewEvent(event)}
                             className="text-yellow-400 hover:text-yellow-300 transition-all active:scale-95 p-1"
                             title="View Details"
                           >
                             <Eye className="h-4 w-4" />
                           </button>
                           <button
                             onClick={() => handleEditEvent(event)}
                             className="text-blue-400 hover:text-blue-300 transition-all active:scale-95 p-1"
                             title="Edit Event"
                           >
                             <Edit className="h-4 w-4" />
                           </button>
                           {event.status !== 'cancelled' && (
                             <button
                               onClick={() => handleCancelEvent(event.id)}
                               className="text-orange-400 hover:text-orange-300 transition-all active:scale-95 p-1"
                               title="Cancel Event"
                             >
                               <XCircle className="h-4 w-4" />
                             </button>
                           )}
                           <button
                             onClick={() => handleDeleteEvent(event.id)}
                             className="text-red-400 hover:text-red-300 transition-all active:scale-95 p-1"
                             title="Delete Event"
                           >
                             <Trash2 className="h-4 w-4" />
                           </button>
                         </div>
                       </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
            </div>
          </div>

          {filteredEvents.length === 0 && (
            <div className="text-center py-12">
              <Calendar className="h-12 w-12 text-yellow-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-white mb-2">No events found</h3>
              <p className="text-yellow-300">
                {searchTerm || statusFilter !== 'all' || categoryFilter !== 'all'
                  ? 'Try adjusting your search or filter criteria'
                  : 'Events will appear here as they are created'
                }
              </p>
            </div>
          )}
        </motion.div>

        {/* Delete Confirmation Modal */}
        <ConfirmationModal
          isOpen={showDeleteConfirmation}
          onClose={() => {
            setShowDeleteConfirmation(false)
            setEventToDelete(null)
          }}
          onConfirm={confirmDeleteEvent}
          title="Delete Event"
          message="Are you sure you want to delete this event? This action cannot be undone."
          confirmText="Delete"
          cancelText="Cancel"
          isDestructive={true}
        />

        {/* Cancel Event Confirmation Modal */}
        <ConfirmationModal
          isOpen={showCancelConfirmation}
          onClose={() => {
            setShowCancelConfirmation(false)
            setEventToCancel(null)
          }}
          onConfirm={confirmCancelEvent}
          title="Cancel Event"
          message="Are you sure you want to cancel this event? This will mark the event as cancelled and notify participants."
          confirmText="Cancel Event"
          cancelText="Keep Active"
          isDestructive={false}
        />

        {/* Create/Edit Event Modal */}
        <CreateEventModal
          isOpen={showCreateModal}
          onClose={() => {
            setShowCreateModal(false)
            setEditingEvent(null)
          }}
          event={editingEvent}
          onSave={handleSaveEvent}
        />

        {/* Event View Modal */}
        {showViewModal && selectedEvent && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-navy-800 rounded-lg shadow-xl border border-navy-700 max-w-4xl w-full max-h-[90vh] overflow-y-auto"
            >
              <div className="p-6">
                {/* Modal Header */}
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center space-x-3">
                    <div className="p-2 bg-navy-700 rounded-lg">
                      <Calendar className="h-6 w-6 text-yellow-300" />
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-white">Event Details</h2>
                      <p className="text-skyblue-300 text-sm">View event information</p>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      setShowViewModal(false)
                      setSelectedEvent(null)
                    }}
                    className="p-2 text-skyblue-400 hover:text-white hover:bg-navy-700 rounded-lg transition-colors"
                  >
                    <XCircle className="h-5 w-5" />
                  </button>
                </div>

                {/* Event Content */}
                <div className="space-y-6">
                  {/* Event Image - Full Width */}
                  <div className="w-full rounded-lg overflow-hidden border-2 border-navy-700">
                    {selectedEvent.image_url ? (
                      <img
                        src={selectedEvent.image_url}
                        alt={selectedEvent.name}
                        className="w-full h-64 object-cover"
                      />
                    ) : (
                      <div className="w-full h-64 bg-gradient-to-br from-navy-700 via-navy-600 to-navy-700 flex flex-col items-center justify-center">
                        <Calendar className="h-20 w-20 text-yellow-300 mb-4" />
                        <p className="text-skyblue-300 text-lg font-medium">No Image Available</p>
                        <p className="text-skyblue-400 text-sm mt-1">Event image not uploaded</p>
                      </div>
                    )}
                  </div>

                  {/* Event Header */}
                  <div className="bg-navy-700/50 rounded-lg p-4 border border-navy-600">
                    <h3 className="text-2xl font-bold text-white mb-3">{selectedEvent.name}</h3>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(selectedEvent.status)}`}>
                        <CheckCircle className="h-4 w-4 mr-1" />
                        {selectedEvent.status}
                      </span>
                      {selectedEvent.target_goal && (
                        <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-yellow-500/20 text-yellow-300 border border-yellow-500/30">
                          <Gift className="h-4 w-4 mr-1" />
                          {selectedEvent.target_goal}
                        </span>
                      )}
                      {selectedEvent.max_participants && (
                        <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-500/20 text-blue-300 border border-blue-500/30">
                          <Users className="h-4 w-4 mr-1" />
                          Max: {selectedEvent.max_participants}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Event Description */}
                  <div className="bg-navy-700/30 rounded-lg p-4 border border-navy-600">
                    <h4 className="text-lg font-semibold text-white mb-3 flex items-center">
                      <FileText className="h-5 w-5 mr-2 text-yellow-300" />
                      Description
                    </h4>
                    <p className="text-skyblue-300 leading-relaxed">
                      {selectedEvent.description || 'No description available'}
                    </p>
                  </div>

                  {/* Event Details Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Date & Time Card */}
                    <div className="bg-navy-700/30 rounded-lg p-4 border border-navy-600">
                      <h4 className="text-sm font-semibold text-yellow-300 mb-3 uppercase tracking-wide">Date & Time</h4>
                      <div className="space-y-3">
                        <div className="flex items-start space-x-3">
                          <Calendar className="h-5 w-5 text-skyblue-400 mt-0.5 flex-shrink-0" />
                          <div>
                            <p className="text-xs text-skyblue-400">Start Date</p>
                            <p className="text-white font-medium">
                              {new Date(selectedEvent.start_date).toLocaleDateString('en-US', {
                                weekday: 'short',
                                year: 'numeric',
                                month: 'short',
                                day: 'numeric'
                              })}
                            </p>
                            <p className="text-skyblue-300 text-sm">
                              {new Date(selectedEvent.start_date).toLocaleTimeString('en-US', {
                                hour: 'numeric',
                                minute: '2-digit',
                                hour12: true
                              })}
                            </p>
                          </div>
                        </div>
                        {selectedEvent.end_date && (
                          <div className="flex items-start space-x-3">
                            <Clock className="h-5 w-5 text-skyblue-400 mt-0.5 flex-shrink-0" />
                            <div>
                              <p className="text-xs text-skyblue-400">End Date</p>
                              <p className="text-white font-medium">
                                {new Date(selectedEvent.end_date).toLocaleDateString('en-US', {
                                  weekday: 'short',
                                  year: 'numeric',
                                  month: 'short',
                                  day: 'numeric'
                                })}
                              </p>
                              <p className="text-skyblue-300 text-sm">
                                {new Date(selectedEvent.end_date).toLocaleTimeString('en-US', {
                                  hour: 'numeric',
                                  minute: '2-digit',
                                  hour12: true
                                })}
                              </p>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Location & Info Card */}
                    <div className="bg-navy-700/30 rounded-lg p-4 border border-navy-600">
                      <h4 className="text-sm font-semibold text-yellow-300 mb-3 uppercase tracking-wide">Location & Info</h4>
                      <div className="space-y-3">
                        {selectedEvent.location && (
                          <div className="flex items-start space-x-3">
                            <MapPin className="h-5 w-5 text-skyblue-400 mt-0.5 flex-shrink-0" />
                            <div>
                              <p className="text-xs text-skyblue-400">Location</p>
                              <p className="text-white font-medium">{selectedEvent.location}</p>
                            </div>
                          </div>
                        )}
                        <div className="flex items-start space-x-3">
                          <Calendar className="h-5 w-5 text-skyblue-400 mt-0.5 flex-shrink-0" />
                          <div>
                            <p className="text-xs text-skyblue-400">Created On</p>
                            <p className="text-white font-medium">
                              {new Date(selectedEvent.created_at).toLocaleDateString('en-US', {
                                year: 'numeric',
                                month: 'long',
                                day: 'numeric'
                              })}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex items-center justify-end space-x-3 pt-6 border-t border-navy-700">
                    <button
                      onClick={() => {
                        setShowViewModal(false)
                        setSelectedEvent(null)
                      }}
                      className="px-4 py-2 text-skyblue-300 hover:text-white hover:bg-navy-700 rounded-lg transition-colors"
                    >
                      Close
                    </button>
                    <button
                      onClick={() => {
                        setShowViewModal(false)
                        setSelectedEvent(null)
                        handleEditEvent(selectedEvent)
                      }}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors flex items-center space-x-2"
                    >
                      <Edit className="h-4 w-4" />
                      <span>Edit Event</span>
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </div>
    </div>
  )
}

export default AdminEventsPage
