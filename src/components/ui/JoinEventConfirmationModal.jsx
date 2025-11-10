import React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Calendar, MapPin, Clock, Users, Info, AlertCircle, CheckCircle } from 'lucide-react'

const JoinEventConfirmationModal = ({ isOpen, onClose, onConfirm, event, loading }) => {
  if (!isOpen || !event) return null

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A'
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
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    })
  }

  const getEventStatus = () => {
    const now = new Date()
    const startDate = new Date(event.start_date)
    const endDate = new Date(event.end_date)
    
    if (event.status === 'cancelled') return { text: 'Cancelled', color: 'text-red-400' }
    if (endDate < now) return { text: 'Completed', color: 'text-gray-400' }
    if (startDate <= now && endDate >= now) return { text: 'Active', color: 'text-green-400' }
    if (startDate > now) return { text: 'Upcoming', color: 'text-yellow-400' }
    return { text: 'Unknown', color: 'text-gray-400' }
  }

  const status = getEventStatus()
  const currentParticipants = event.participants?.[0]?.count || 0
  const maxParticipants = event.max_participants || 0
  const spotsRemaining = maxParticipants - currentParticipants
  const isFull = maxParticipants > 0 && currentParticipants >= maxParticipants

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-black/70 backdrop-blur-sm"
          onClick={onClose}
        />

        {/* Modal */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="relative bg-navy-900 rounded-lg shadow-xl border border-yellow-500/30 w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-navy-700">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-yellow-400/20 rounded-lg">
                <Info className="h-5 w-5 text-yellow-400" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">Confirm Event Registration</h2>
                <p className="text-sm text-gray-400">Please review event details before joining</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-navy-800 rounded-lg transition-colors"
              disabled={loading}
            >
              <X className="h-5 w-5 text-gray-400" />
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6">
            {/* Event Image */}
            {event.image_url && (
              <div className="w-full h-48 rounded-lg overflow-hidden mb-6 border-2 border-yellow-500/30">
                <img
                  src={event.image_url}
                  alt={event.name}
                  className="w-full h-full object-cover"
                />
              </div>
            )}

            {/* Event Name */}
            <h3 className="text-2xl font-bold text-white mb-4">{event.name}</h3>

            {/* Status Badge */}
            <div className="mb-6">
              <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${status.color} bg-navy-800`}>
                <CheckCircle className="h-4 w-4 mr-1.5" />
                {status.text}
              </span>
            </div>

            {/* Event Details */}
            <div className="space-y-4 mb-6">
              {/* Description */}
              {event.description && (
                <div className="bg-navy-800/50 rounded-lg p-4 border border-navy-700">
                  <h4 className="text-sm font-semibold text-yellow-400 mb-2">Description</h4>
                  <p className="text-gray-300 text-sm leading-relaxed">{event.description}</p>
                </div>
              )}

              {/* Date & Time */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-navy-800/50 rounded-lg p-4 border border-navy-700">
                  <div className="flex items-center gap-2 mb-2">
                    <Calendar className="h-4 w-4 text-yellow-400" />
                    <h4 className="text-sm font-semibold text-yellow-400">Date</h4>
                  </div>
                  <p className="text-white text-sm">{formatDate(event.start_date)}</p>
                  {event.end_date && new Date(event.start_date).toDateString() !== new Date(event.end_date).toDateString() && (
                    <p className="text-gray-400 text-xs mt-1">to {formatDate(event.end_date)}</p>
                  )}
                </div>

                <div className="bg-navy-800/50 rounded-lg p-4 border border-navy-700">
                  <div className="flex items-center gap-2 mb-2">
                    <Clock className="h-4 w-4 text-yellow-400" />
                    <h4 className="text-sm font-semibold text-yellow-400">Time</h4>
                  </div>
                  <p className="text-white text-sm">
                    {formatTime(event.start_date)}
                    {event.end_date && ` - ${formatTime(event.end_date)}`}
                  </p>
                </div>
              </div>

              {/* Location */}
              {event.location && (
                <div className="bg-navy-800/50 rounded-lg p-4 border border-navy-700">
                  <div className="flex items-center gap-2 mb-2">
                    <MapPin className="h-4 w-4 text-yellow-400" />
                    <h4 className="text-sm font-semibold text-yellow-400">Location</h4>
                  </div>
                  <p className="text-white text-sm">{event.location}</p>
                </div>
              )}

              {/* Participants */}
              {maxParticipants > 0 && (
                <div className="bg-navy-800/50 rounded-lg p-4 border border-navy-700">
                  <div className="flex items-center gap-2 mb-2">
                    <Users className="h-4 w-4 text-yellow-400" />
                    <h4 className="text-sm font-semibold text-yellow-400">Participants</h4>
                  </div>
                  <div className="flex items-center justify-between">
                    <p className="text-white text-sm">
                      {currentParticipants} / {maxParticipants} registered
                    </p>
                    {isFull ? (
                      <span className="text-xs text-red-400 font-medium">Event Full</span>
                    ) : (
                      <span className="text-xs text-green-400 font-medium">
                        {spotsRemaining} spot{spotsRemaining !== 1 ? 's' : ''} remaining
                      </span>
                    )}
                  </div>
                  {/* Progress Bar */}
                  <div className="mt-3 w-full bg-navy-700 rounded-full h-2 overflow-hidden">
                    <div
                      className="h-full bg-yellow-400 transition-all"
                      style={{ width: `${Math.min(100, (currentParticipants / maxParticipants) * 100)}%` }}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Important Notice */}
            <div className="bg-yellow-400/10 border border-yellow-400/30 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-yellow-400 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <h4 className="text-sm font-semibold text-yellow-400 mb-1">Important Notice</h4>
                  <p className="text-xs text-gray-300 leading-relaxed">
                    By joining this event, you commit to attending. If you cannot attend, please cancel your registration 
                    as soon as possible to allow others to join. Repeated no-shows may affect your ability to join future events.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-navy-700 bg-navy-800/50 flex items-center justify-end gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-300 hover:text-white transition-colors"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              onClick={onConfirm}
              disabled={loading || isFull}
              className="btn btn-primary px-6 py-2 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                  Joining...
                </>
              ) : (
                <>
                  <CheckCircle className="h-4 w-4" />
                  Confirm & Join Event
                </>
              )}
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  )
}

export default JoinEventConfirmationModal

