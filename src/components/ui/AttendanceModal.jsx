import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Users, CheckCircle, XCircle, Clock, Save, UserCheck, UserX, Info } from 'lucide-react'
import { db, supabase } from '../../lib/supabase'
import { useToast } from '../../contexts/ToastContext'
import LoadingSpinner from './LoadingSpinner'

const AttendanceModal = ({ isOpen, onClose, event }) => {
  const { success, error } = useToast()
  const [participants, setParticipants] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [attendanceUpdates, setAttendanceUpdates] = useState({}) // { userId: 'present' | 'absent' | 'pending' }
  const [originalAttendance, setOriginalAttendance] = useState({}) // Track original status for comparison

  useEffect(() => {
    if (isOpen && event?.id) {
      fetchParticipants()
    }
  }, [isOpen, event?.id])

  const fetchParticipants = async () => {
    try {
      setLoading(true)
      const data = await db.getEventParticipants(event.id)
      setParticipants(data || [])
      
      // Initialize attendance updates with current status
      const updates = {}
      const original = {}
      data?.forEach(p => {
        const userId = String(p.user_id) // Normalize user_id to string
        const status = String(p.attendance_status || 'pending') // Normalize status to string
        updates[userId] = status
        original[userId] = status
      })
      setAttendanceUpdates(updates)
      setOriginalAttendance(original)
      
      console.log('Initialized attendance data:', { updates, original, participantCount: data?.length })
    } catch (err) {
      console.error('Error fetching participants:', err)
      error('Failed to load participants')
    } finally {
      setLoading(false)
    }
  }

  const handleAttendanceChange = (userId, status) => {
    const normalizedUserId = String(userId)
    const normalizedStatus = String(status)
    setAttendanceUpdates(prev => ({
      ...prev,
      [normalizedUserId]: normalizedStatus
    }))
  }

  const handleSaveAttendance = async () => {
    try {
      setSaving(true)
      
      // Prepare updates (normalize user_id and status)
      const updates = Object.entries(attendanceUpdates).map(([userId, status]) => ({
        user_id: String(userId),
        attendance_status: String(status)
      }))

      await db.bulkUpdateAttendance(event.id, updates, originalAttendance)
      
      // Send notifications to users whose attendance status changed
      const notificationsToSend = []
      
      console.log('Checking attendance changes for notifications...')
      console.log('Original attendance:', originalAttendance)
      console.log('Updated attendance:', attendanceUpdates)
      console.log('Participants:', participants.map(p => ({ user_id: p.user_id, name: p.user?.name, status: p.attendance_status })))
      
      updates.forEach(({ user_id, attendance_status }) => {
        // Normalize values for consistent comparison
        const normalizedUserId = String(user_id)
        const originalStatus = String(originalAttendance[normalizedUserId] || 'pending')
        const newStatus = String(attendance_status || 'pending')
        const participant = participants.find(p => String(p.user_id) === normalizedUserId)
        
        console.log(`Checking user ${normalizedUserId}: original="${originalStatus}", new="${newStatus}", changed=${originalStatus !== newStatus}`)
        
        // Only notify if status changed and is not 'pending'
        if (originalStatus !== newStatus && newStatus !== 'pending') {
          // Ensure user_id is valid
          if (!normalizedUserId || normalizedUserId === 'undefined' || normalizedUserId === 'null') {
            console.warn('Invalid user_id for notification:', normalizedUserId, participant)
            return
          }
          
          // Double-check that participant exists
          if (!participant) {
            console.warn(`Participant not found for user_id: ${normalizedUserId}`)
            return
          }
          
          // Verify user_id is a valid UUID format
          const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
          if (!uuidRegex.test(normalizedUserId)) {
            console.warn(`Invalid UUID format for user_id: ${normalizedUserId}`)
            return
          }
          
          let notificationTitle = ''
          let notificationMessage = ''
          
          if (newStatus === 'present') {
            notificationTitle = 'Attendance Marked - Present'
            notificationMessage = `Your attendance for "${event?.name || 'the event'}" has been marked as Present. Thank you for participating!`
          } else if (newStatus === 'absent') {
            notificationTitle = 'Attendance Marked - Absent'
            notificationMessage = `Your attendance for "${event?.name || 'the event'}" has been marked as Absent.`
          }
          
          if (notificationTitle && notificationMessage) {
            notificationsToSend.push({
              user_id: normalizedUserId,
              title: notificationTitle,
              message: notificationMessage,
              status: newStatus,
              participantName: participant?.user?.name || 'Unknown'
            })
            console.log(`✓ Queued notification for user ${normalizedUserId} (${participant?.user?.name || 'Unknown'}) - Status: ${newStatus}`)
          }
        }
      })
      
      console.log(`Total notifications to send: ${notificationsToSend.length}`)
      
      // Send notifications sequentially to ensure they're all sent
      if (notificationsToSend.length > 0) {
        try {
          let successCount = 0
          for (const notification of notificationsToSend) {
            try {
              const notificationData = {
                user_id: notification.user_id,
                type: 'system_alert', // Use system_alert as it's a valid enum type
                title: notification.title,
                message: notification.message,
                data: {
                  event_id: event?.id,
                  event_name: event?.name,
                  attendance_status: notification.status,
                  notification_type: 'event_attendance' // Store the specific type in data
                }
              }
              
              console.log('Sending notification:', notificationData)
              console.log('Notification recipient:', {
                user_id: notification.user_id,
                name: notification.participantName,
                status: notification.status
              })
              
              const result = await db.createNotification(notificationData)
              
              if (result && result.id) {
                console.log(`✓ Notification created successfully for user ${notification.user_id} (${notification.participantName})`)
                console.log('Created notification:', {
                  id: result.id,
                  user_id: result.user_id,
                  title: result.title,
                  type: result.type,
                  created_at: result.created_at
                })
                
                // Verify notification exists in database by querying it
                if (supabase) {
                  try {
                    const { data: verifyNotification, error: verifyError } = await supabase
                      .from('notifications')
                      .select('*')
                      .eq('id', result.id)
                      .eq('user_id', notification.user_id)
                      .single()
                    
                    if (verifyError) {
                      console.error(`✗ Verification failed for notification ${result.id}:`, verifyError)
                    } else if (verifyNotification) {
                      console.log(`✓ Notification verified in database for user ${notification.user_id}:`, {
                        id: verifyNotification.id,
                        user_id: verifyNotification.user_id,
                        title: verifyNotification.title,
                        read_at: verifyNotification.read_at,
                        created_at: verifyNotification.created_at
                      })
                    } else {
                      console.warn(`⚠ Notification ${result.id} was created but could not be verified`)
                    }
                  } catch (verifyErr) {
                    console.error('Error verifying notification:', verifyErr)
                  }
                }
                
                successCount++
              } else {
                console.error(`✗ Notification creation returned invalid result for user ${notification.user_id}:`, result)
                throw new Error('Notification creation returned invalid result')
              }
            } catch (notifErr) {
              console.error(`✗ Failed to create notification for user ${notification.user_id} (${notification.participantName}):`, notifErr)
              console.error('Error details:', {
                message: notifErr.message,
                code: notifErr.code,
                details: notifErr.details,
                hint: notifErr.hint,
                stack: notifErr.stack
              })
              console.error('Notification data that failed:', {
                user_id: notification.user_id,
                type: 'system_alert',
                title: notification.title,
                message: notification.message,
                data: {
                  event_id: event?.id,
                  event_name: event?.name,
                  attendance_status: notification.status,
                  notification_type: 'event_attendance'
                }
              })
              // Continue with other notifications even if one fails
            }
          }
          console.log(`Successfully sent ${successCount} out of ${notificationsToSend.length} attendance notification(s)`)
        } catch (notifError) {
          console.error('Error sending attendance notifications:', notifError)
          // Don't show error to user - notifications are non-critical
        }
      } else {
        console.log('No notifications to send (no status changes or all are pending)')
      }
      
      success('Attendance saved successfully!')
      await fetchParticipants() // Refresh data
    } catch (err) {
      console.error('Error saving attendance:', err)
      error(err.message || 'Failed to save attendance')
    } finally {
      setSaving(false)
    }
  }

  const getAttendanceStats = () => {
    const stats = {
      pending: 0,
      present: 0,
      absent: 0,
      total: participants.length
    }
    
    Object.values(attendanceUpdates).forEach(status => {
      if (status === 'pending') stats.pending++
      else if (status === 'present') stats.present++
      else if (status === 'absent') stats.absent++
    })
    
    return stats
  }

  const stats = getAttendanceStats()
  const eventEnded = event?.end_date && new Date(event.end_date) < new Date()
  const eventOngoing = event?.start_date && new Date(event.start_date) <= new Date() && !eventEnded
  const eventStarted = event?.start_date && new Date(event.start_date) <= new Date()
  
  // Check if attendance was auto-closed (event ended and has absent participants)
  const hasAutoMarkedAbsent = eventEnded && participants.some(p => 
    p.attendance_status === 'absent' && 
    (!attendanceUpdates[p.user_id] || attendanceUpdates[p.user_id] === 'absent')
  )

  if (!isOpen) return null

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
          className="relative bg-navy-900 rounded-lg shadow-xl border border-yellow-500/30 w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-navy-700">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-yellow-400/20 rounded-lg">
                <Users className="h-5 w-5 text-yellow-400" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">Event Attendance</h2>
                <p className="text-sm text-gray-400">{event?.name}</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-navy-800 rounded-lg transition-colors"
            >
              <X className="h-5 w-5 text-gray-400" />
            </button>
          </div>

          {/* Stats Bar */}
          <div className="px-6 py-4 bg-navy-800/50 border-b border-navy-700">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-white">{stats.total}</div>
                <div className="text-xs text-gray-400">Total Registered</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-yellow-400">{stats.pending}</div>
                <div className="text-xs text-gray-400">Pending</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-400">{stats.present}</div>
                <div className="text-xs text-gray-400">Present</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-red-400">{stats.absent}</div>
                <div className="text-xs text-gray-400">Absent</div>
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <LoadingSpinner size="lg" />
              </div>
            ) : participants.length === 0 ? (
              <div className="text-center py-12">
                <Users className="h-12 w-12 text-gray-600 mx-auto mb-4" />
                <p className="text-gray-400">No participants registered for this event</p>
              </div>
            ) : (
              <div className="space-y-3">
                {participants.map((participant) => {
                  const currentStatus = attendanceUpdates[participant.user_id] || 'pending'
                  const user = participant.user

                  return (
                    <div
                      key={participant.id}
                      className="bg-navy-800/50 rounded-lg p-4 border border-navy-700 hover:border-yellow-500/30 transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-3">
                            <div className="flex-shrink-0 w-10 h-10 bg-yellow-400/20 rounded-full flex items-center justify-center">
                              <span className="text-yellow-400 font-semibold text-sm">
                                {user?.name?.charAt(0)?.toUpperCase() || 'U'}
                              </span>
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="text-white font-medium truncate">
                                {user?.name || 'Unknown User'}
                              </div>
                              <div className="text-xs text-gray-400 truncate">
                                {user?.email || 'No email'}
                                {user?.phone_number && ` • ${user?.phone_number}`}
                              </div>
                              <div className="flex items-center gap-3 mt-1">
                                <div className="text-xs text-gray-500">
                                  Registered: {new Date(participant.joined_at).toLocaleDateString()}
                                </div>
                                {user?.event_absence_count !== undefined && user.event_absence_count > 0 && (
                                  <div className={`text-xs font-medium ${
                                    user.event_absence_count >= 5 
                                      ? 'text-red-400' 
                                      : user.event_absence_count >= 2 
                                      ? 'text-yellow-400' 
                                      : 'text-gray-400'
                                  }`}>
                                    Absences: {user.event_absence_count}
                                  </div>
                                )}
                                {user?.event_banned && (
                                  <div className="text-xs font-medium text-red-400 flex items-center gap-1">
                                    <UserX className="h-3 w-3" />
                                    Banned
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Attendance Controls */}
                        <div className="flex items-center gap-2 ml-4">
                          <button
                            onClick={() => handleAttendanceChange(participant.user_id, 'pending')}
                            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                              currentStatus === 'pending'
                                ? 'bg-yellow-400/20 text-yellow-400 border border-yellow-400/40'
                                : 'bg-navy-700 text-gray-400 hover:bg-navy-600'
                            }`}
                            disabled={saving}
                          >
                            <Clock className="h-3.5 w-3.5 inline mr-1" />
                            Pending
                          </button>
                          <button
                            onClick={() => handleAttendanceChange(participant.user_id, 'present')}
                            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                              currentStatus === 'present'
                                ? 'bg-green-500/20 text-green-400 border border-green-500/40'
                                : 'bg-navy-700 text-gray-400 hover:bg-navy-600'
                            }`}
                            disabled={saving}
                          >
                            <CheckCircle className="h-3.5 w-3.5 inline mr-1" />
                            Present
                          </button>
                          <button
                            onClick={() => handleAttendanceChange(participant.user_id, 'absent')}
                            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                              currentStatus === 'absent'
                                ? 'bg-red-500/20 text-red-400 border border-red-500/40'
                                : 'bg-navy-700 text-gray-400 hover:bg-navy-600'
                            }`}
                            disabled={saving}
                          >
                            <XCircle className="h-3.5 w-3.5 inline mr-1" />
                            Absent
                          </button>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-navy-700 bg-navy-800/50 flex items-center justify-between">
            <div className="flex flex-col gap-1">
              <div className="text-sm text-gray-400">
                {eventEnded ? (
                  <span className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4" />
                    Event has ended - Attendance auto-closed
                  </span>
                ) : eventOngoing ? (
                  <span className="flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    Event is ongoing - Mark attendance in real-time
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    Event hasn't started yet
                  </span>
                )}
              </div>
              {eventEnded && hasAutoMarkedAbsent && (
                <div className="text-xs text-yellow-400 flex items-center gap-1">
                  <Info className="h-3 w-3" />
                  Pending participants were automatically marked as absent. You can still edit attendance.
                </div>
              )}
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={onClose}
                className="px-4 py-2 text-gray-300 hover:text-white transition-colors"
                disabled={saving}
              >
                Cancel
              </button>
              <button
                onClick={handleSaveAttendance}
                disabled={saving || loading}
                className="btn btn-primary px-6 py-2 flex items-center gap-2"
              >
                {saving ? (
                  <>
                    <LoadingSpinner size="sm" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4" />
                    {eventEnded ? 'Update Attendance' : 'Save Attendance'}
                  </>
                )}
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  )
}

export default AttendanceModal

