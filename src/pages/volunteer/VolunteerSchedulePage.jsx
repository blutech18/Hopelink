import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Calendar, 
  Clock, 
  MapPin,
  CheckCircle,
  User,
  Save,
  AlertCircle,
  X
} from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import { useToast } from '../../contexts/ToastContext'
import { ListPageSkeleton } from '../../components/ui/Skeleton'
import LoadingSpinner from '../../components/ui/LoadingSpinner'
import ConfirmationModal from '../../components/ui/ConfirmationModal'

const VolunteerSchedulePage = () => {
  const { profile, updateProfile } = useAuth()
  const { success, error } = useToast()
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [selectedWeek, setSelectedWeek] = useState(0)
  const [originalScheduleData, setOriginalScheduleData] = useState(null)
  const [scheduleData, setScheduleData] = useState({
    availability_days: profile?.availability_days || [],
    availability_times: profile?.availability_times || [],
    max_delivery_distance: profile?.max_delivery_distance || 20,
    delivery_preferences: profile?.delivery_preferences || []
  })
  const [showSaveConfirmation, setShowSaveConfirmation] = useState(false)
  const [showDiscardConfirmation, setShowDiscardConfirmation] = useState(false)

  const daysOfWeek = [
    'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'
  ]

  const timeSlots = [
    { value: 'early_morning', label: 'Early Morning', time: '6:00 AM - 9:00 AM' },
    { value: 'morning', label: 'Morning', time: '9:00 AM - 12:00 PM' },
    { value: 'afternoon', label: 'Afternoon', time: '12:00 PM - 3:00 PM' },
    { value: 'late_afternoon', label: 'Late Afternoon', time: '3:00 PM - 6:00 PM' },
    { value: 'evening', label: 'Evening', time: '6:00 PM - 9:00 PM' },
    { value: 'night', label: 'Night', time: '9:00 PM - 12:00 AM' }
  ]

  const deliveryPreferences = [
    'Food Items',
    'Clothing',
    'Electronics',
    'Books & Educational',
    'Medical Supplies',
    'Household Items',
    'Furniture',
    'Emergency Deliveries'
  ]

  // Helper function to compare arrays (sorted)
  const arraysEqual = (a, b) => {
    if (!a && !b) return true
    if (!a || !b) return false
    return JSON.stringify([...a].sort()) === JSON.stringify([...b].sort())
  }

  // Check if there are unsaved changes
  const hasUnsavedChanges = () => {
    if (!profile || !originalScheduleData) return false
    
    return (
      !arraysEqual(scheduleData.availability_days, originalScheduleData.availability_days) ||
      !arraysEqual(scheduleData.availability_times, originalScheduleData.availability_times) ||
      scheduleData.max_delivery_distance !== originalScheduleData.max_delivery_distance ||
      !arraysEqual(scheduleData.delivery_preferences, originalScheduleData.delivery_preferences)
    )
  }

  // Initialize schedule data when profile loads
  useEffect(() => {
    if (profile) {
      const initialData = {
        availability_days: profile.availability_days || [],
        availability_times: profile.availability_times || [],
        max_delivery_distance: profile.max_delivery_distance || 20,
        delivery_preferences: profile.delivery_preferences || []
      }
      setScheduleData(initialData)
      setOriginalScheduleData(initialData)
    }
  }, [profile])

  // Handle save with confirmation
  const handleSaveClick = () => {
    // Validate before showing confirmation
    if (scheduleData.availability_days.length === 0) {
      error('Please select at least one available day')
      return
    }
    if (scheduleData.availability_times.length === 0) {
      error('Please select at least one time slot')
      return
    }
    setShowSaveConfirmation(true)
  }

  const confirmSave = async () => {
    try {
      setSaving(true)
      setShowSaveConfirmation(false)
      
      await updateProfile(scheduleData)
      setOriginalScheduleData({ ...scheduleData })
      success('Schedule saved successfully!')
    } catch (err) {
      console.error('Error saving schedule:', err)
      error('Failed to save schedule. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  // Handle discard changes
  const handleDiscardClick = () => {
    if (hasUnsavedChanges()) {
      setShowDiscardConfirmation(true)
    }
  }

  const confirmDiscard = () => {
    if (originalScheduleData) {
      setScheduleData({ ...originalScheduleData })
    }
    setShowDiscardConfirmation(false)
  }

  const getCurrentWeekDates = (weekOffset = 0) => {
    const today = new Date()
    const currentDay = today.getDay()
    const mondayOffset = currentDay === 0 ? -6 : 1 - currentDay
    const monday = new Date(today)
    monday.setDate(today.getDate() + mondayOffset + (weekOffset * 7))

    const weekDates = []
    for (let i = 0; i < 7; i++) {
      const date = new Date(monday)
      date.setDate(monday.getDate() + i)
      weekDates.push(date)
    }
    return weekDates
  }

  const handleDayToggle = (day) => {
    const newDays = scheduleData.availability_days.includes(day)
      ? scheduleData.availability_days.filter(d => d !== day)
      : [...scheduleData.availability_days, day]
    
    setScheduleData({
      ...scheduleData,
      availability_days: newDays
    })
  }

  const handleTimeSlotToggle = (timeSlot) => {
    const newTimes = scheduleData.availability_times.includes(timeSlot)
      ? scheduleData.availability_times.filter(t => t !== timeSlot)
      : [...scheduleData.availability_times, timeSlot]
    
    setScheduleData({
      ...scheduleData,
      availability_times: newTimes
    })
  }

  const handlePreferenceToggle = (preference) => {
    const newPrefs = scheduleData.delivery_preferences.includes(preference)
      ? scheduleData.delivery_preferences.filter(p => p !== preference)
      : [...scheduleData.delivery_preferences, preference]
    
    setScheduleData({
      ...scheduleData,
      delivery_preferences: newPrefs
    })
  }

  const handleDistanceChange = (value) => {
    setScheduleData({
      ...scheduleData,
      max_delivery_distance: parseInt(value)
    })
  }

  const weekDates = getCurrentWeekDates(selectedWeek)
  const isCurrentWeek = selectedWeek === 0

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
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-4">
            <div className="flex-1">
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white">Volunteer Schedule</h1>
              <p className="text-yellow-300 mt-2 text-sm sm:text-base">
                Manage your availability and delivery preferences. Click "Save Changes" when you're done.
              </p>
            </div>
          </div>
        </motion.div>

        {/* Quick Stats */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6 mb-6 sm:mb-8"
          >
          <div className="bg-navy-900/50 backdrop-blur-sm border border-navy-700 rounded-xl p-4 sm:p-6 hover:border-yellow-500/30 transition-colors">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                <Calendar className="h-5 w-5 text-blue-400" />
              </div>
              <div>
                <p className="text-xs text-gray-400">Available Days</p>
                <p className="text-2xl font-bold text-white">{scheduleData.availability_days.length}/7</p>
              </div>
            </div>
          </div>
          
          <div className="bg-navy-900/50 backdrop-blur-sm border border-navy-700 rounded-xl p-4 sm:p-6 hover:border-yellow-500/30 transition-colors">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-lg bg-purple-500/10 flex items-center justify-center">
                <Clock className="h-5 w-5 text-purple-400" />
              </div>
              <div>
                <p className="text-xs text-gray-400">Time Slots</p>
                <p className="text-2xl font-bold text-white">{scheduleData.availability_times.length}</p>
              </div>
            </div>
            </div>
          
          <div className="bg-navy-900/50 backdrop-blur-sm border border-navy-700 rounded-xl p-4 sm:p-6 hover:border-yellow-500/30 transition-colors">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-lg bg-green-500/10 flex items-center justify-center">
                <MapPin className="h-5 w-5 text-green-400" />
              </div>
              <div>
                <p className="text-xs text-gray-400">Max Distance</p>
                <p className="text-2xl font-bold text-white">{scheduleData.max_delivery_distance}km</p>
              </div>
            </div>
          </div>
        </motion.div>

          {/* Weekly Calendar View */}
          <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="mb-6 sm:mb-8"
        >
          <div className="card p-4 sm:p-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4 sm:mb-6 gap-4">
              <div>
                <h2 className="text-lg sm:text-xl font-semibold text-white flex items-center gap-2 mb-1">
              <Calendar className="h-5 w-5 text-yellow-500" />
              Weekly Schedule
            </h2>
                <p className="text-sm text-gray-400">Click on days to toggle availability</p>
              </div>
            <div className="flex items-center justify-center sm:justify-end gap-2">
              <button
                onClick={() => setSelectedWeek(selectedWeek - 1)}
                  className="px-3 sm:px-4 py-2 bg-navy-800 hover:bg-navy-700 text-white rounded-lg text-xs sm:text-sm font-medium transition-colors active:scale-95 border border-navy-600"
                aria-label="Previous week"
              >
                <span className="hidden sm:inline">← Previous</span>
                <span className="sm:hidden">←</span>
              </button>
                <span className="text-yellow-300 text-xs sm:text-sm px-3 sm:px-4 py-2 bg-navy-800 rounded-lg font-medium whitespace-nowrap border border-navy-600">
                  {isCurrentWeek ? 'This Week' : `${weekDates[0].toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}`}
              </span>
              <button
                onClick={() => setSelectedWeek(selectedWeek + 1)}
                  className="px-3 sm:px-4 py-2 bg-navy-800 hover:bg-navy-700 text-white rounded-lg text-xs sm:text-sm font-medium transition-colors active:scale-95 border border-navy-600"
                aria-label="Next week"
              >
                <span className="hidden sm:inline">Next →</span>
                <span className="sm:hidden">→</span>
              </button>
            </div>
          </div>

            {/* Calendar Design */}
            <div className="border border-navy-700 rounded-lg overflow-hidden">
              {/* Calendar Header - Day Names */}
              <div className="grid grid-cols-7 bg-navy-800/50 border-b border-navy-700">
                {daysOfWeek.map((day, index) => (
                  <div
                    key={index}
                    className="px-2 sm:px-4 py-3 text-center border-r border-navy-700 last:border-r-0"
                  >
                    <div className="text-xs sm:text-sm font-semibold text-yellow-300 uppercase tracking-wide">
                      {day.slice(0, 3)}
                    </div>
                  </div>
                ))}
              </div>

              {/* Calendar Body - Dates */}
              <div className="grid grid-cols-7 bg-navy-900/30">
            {weekDates.map((date, index) => {
              const dayName = daysOfWeek[index]
              const isAvailable = scheduleData.availability_days.includes(dayName)
              const isToday = date.toDateString() === new Date().toDateString()
                  const month = date.toLocaleDateString('en-US', { month: 'short' })
              
              return (
                    <button
                  key={index}
                      onClick={() => handleDayToggle(dayName)}
                      className={`relative p-3 sm:p-4 sm:min-h-[100px] border-r border-b border-navy-700 last:border-r-0 transition-all duration-200 hover:bg-opacity-80 active:scale-[0.98] cursor-pointer group ${
                    isAvailable 
                          ? 'bg-green-500/10 hover:bg-green-500/20 border-green-500/30' 
                          : 'bg-navy-800/30 hover:bg-navy-800/50'
                      } ${isToday ? 'ring-2 ring-yellow-500 ring-inset bg-yellow-500/10' : ''}`}
                  aria-label={`${dayName}, ${date.toLocaleDateString()} - ${isAvailable ? 'Available' : 'Unavailable'}`}
                >
                      {/* Date Number */}
                      <div className="flex items-center justify-center mb-2">
                        <div className={`text-lg sm:text-xl font-bold ${
                          isToday 
                            ? 'text-yellow-400' 
                            : isAvailable 
                              ? 'text-green-400' 
                              : 'text-gray-400'
                        }`}>
                      {date.getDate()}
                    </div>
                      </div>

                      {/* Month indicator for first day of month */}
                      {date.getDate() === 1 && (
                        <div className="text-xs text-gray-500 mb-1 font-medium">
                          {month}
                        </div>
                      )}

                      {/* Availability Status */}
                      <div className="mt-auto pt-2 flex justify-center">
                        {isAvailable ? (
                          <div className="flex items-center gap-1.5">
                            <CheckCircle className="h-3.5 w-3.5 text-green-400 flex-shrink-0" />
                            <span className="text-xs text-green-400 font-medium">Available</span>
                    </div>
                        ) : (
                          <div className="flex items-center gap-1.5">
                            <div className="h-3.5 w-3.5 rounded-full border-2 border-gray-500 flex-shrink-0"></div>
                            <span className="text-xs text-gray-500 font-medium">Unavailable</span>
                  </div>
                        )}
                </div>

                      {/* Hover indicator */}
                      <div className={`absolute inset-0 border-2 border-dashed opacity-0 group-hover:opacity-100 transition-opacity rounded ${
                        isAvailable ? 'border-green-400' : 'border-yellow-400'
                      }`}></div>
                    </button>
              )
            })}
              </div>
          </div>
          
            {/* Calendar Legend */}
            <div className="mt-4 flex flex-wrap items-center gap-4 text-xs sm:text-sm">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded border-2 border-yellow-500 bg-yellow-500/10"></div>
                <span className="text-gray-300">Today</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded bg-green-500/20 border border-green-500/30"></div>
                <span className="text-gray-300">Available</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded bg-navy-800/30 border border-navy-700"></div>
                <span className="text-gray-300">Unavailable</span>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8 mb-6 sm:mb-8">
          {/* Availability Settings */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="lg:col-span-2"
          >
            <div className="card p-4 sm:p-6">
            <h3 className="text-lg font-semibold text-white mb-4 sm:mb-6 flex items-center gap-2">
              <Clock className="h-5 w-5 text-yellow-500" />
              Availability Settings
            </h3>

              <div className="space-y-6">
                {/* Available Days */}
                <div>
                  <label className="block text-sm font-medium text-yellow-300 mb-3">Available Days</label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 sm:gap-3">
                    {daysOfWeek.map(day => (
                      <button
                        key={day}
                        type="button"
                        onClick={() => handleDayToggle(day)}
                        className={`h-14 w-full rounded-lg border-2 transition-all flex items-center justify-center px-3 active:scale-95 ${
                          scheduleData.availability_days.includes(day)
                            ? 'border-green-400 bg-green-500/20 text-white'
                            : 'border-navy-700 bg-navy-800/50 text-gray-300 hover:border-green-400/50 hover:bg-navy-700/50'
                        }`}
                      >
                        <span className="text-sm font-medium">{day.slice(0, 3)}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Time Slots */}
                <div>
                  <label className="block text-sm font-medium text-yellow-300 mb-3">Available Time Slots</label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3">
                    {timeSlots.map(slot => (
                      <button
                        key={slot.value}
                        type="button"
                        onClick={() => handleTimeSlotToggle(slot.value)}
                        className={`h-16 w-full rounded-lg border-2 transition-all flex items-center gap-2 px-3 active:scale-95 ${
                          scheduleData.availability_times.includes(slot.value)
                            ? 'border-green-400 bg-green-500/20 text-white'
                            : 'border-navy-700 bg-navy-800/50 text-gray-300 hover:border-green-400/50 hover:bg-navy-700/50'
                        }`}
                      >
                        <div className="flex-1 min-w-0 text-left">
                          <div className="text-sm font-medium truncate">{slot.label}</div>
                          <div className="text-xs opacity-80">{slot.time}</div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Max Distance */}
                <div>
                  <label className="block text-sm font-medium text-yellow-300 mb-3">
                    Maximum Delivery Distance: <span className="text-yellow-400 font-semibold">{scheduleData.max_delivery_distance} km</span>
                  </label>
                  <div className="px-3 py-2 bg-navy-800 rounded-lg border border-navy-700">
                    <input
                      type="range"
                      min="5"
                      max="100"
                      step="5"
                      value={scheduleData.max_delivery_distance}
                      onChange={(e) => handleDistanceChange(e.target.value)}
                      className="w-full h-2 bg-navy-700 rounded-lg appearance-none cursor-pointer slider"
                      aria-label="Maximum delivery distance in kilometers"
                    />
                    <div className="flex justify-between text-xs text-yellow-400 mt-2">
                      <span>5km</span>
                      <span>100km</span>
                    </div>
                  </div>
                  </div>
                </div>
              </div>
          </motion.div>

          {/* Delivery Preferences */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
          >
            <div className="card p-4 sm:p-6">
            <h3 className="text-lg font-semibold text-white mb-4 sm:mb-6 flex items-center gap-2">
              <User className="h-5 w-5 text-yellow-500" />
              Delivery Preferences
            </h3>

              <div className="space-y-3">
                <p className="text-xs text-gray-400 mb-4">Select your preferred delivery types (optional)</p>
                <div className="grid grid-cols-2 gap-2">
                  {deliveryPreferences.map(pref => (
                    <button
                      key={pref}
                      type="button"
                      onClick={() => handlePreferenceToggle(pref)}
                      className={`h-12 w-full rounded-lg border-2 transition-all flex items-center justify-center px-3 active:scale-95 ${
                        scheduleData.delivery_preferences.includes(pref)
                          ? 'border-green-400 bg-green-500/20 text-white'
                          : 'border-navy-700 bg-navy-800/50 text-gray-300 hover:border-green-400/50 hover:bg-navy-700/50'
                      }`}
                    >
                      <span className="text-sm font-medium truncate text-center">{pref}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Tips Section */}
              <div className="mt-6 p-4 bg-navy-800/50 rounded-lg border border-navy-700">
                <div className="flex items-start gap-3">
                  <AlertCircle className="h-5 w-5 text-yellow-400 mt-0.5 flex-shrink-0" />
                  <div>
                    <h4 className="text-white font-medium mb-2 text-sm">Tips</h4>
                    <ul className="text-xs text-yellow-300 space-y-1">
                      <li>• Keep your schedule updated for better matching</li>
                      <li>• Set realistic time slots</li>
                      <li>• Consider traffic when setting distance</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Save Button - Only visible when there are unsaved changes */}
        <AnimatePresence>
          {hasUnsavedChanges() && (
        <motion.div
              initial={{ opacity: 0, y: 10, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.98 }}
              transition={{
                duration: 0.3,
                ease: [0.4, 0, 0.2, 1],
                opacity: { duration: 0.25 },
                scale: { duration: 0.3 }
              }}
              className="sticky bottom-4 z-50 mt-8 flex justify-center"
        >
              <div className="bg-gradient-to-r from-navy-800 to-navy-900 border border-yellow-400/30 rounded-lg p-2.5 shadow-2xl backdrop-blur-sm w-full max-w-md">
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center text-yellow-300">
                    <AlertCircle className="h-2.5 w-2.5 mr-1.5" />
                    <span className="text-xs font-medium">You have unsaved changes</span>
            </div>
          </div>
                <div className="flex flex-col sm:flex-row gap-1.5">
                  <button
                    onClick={handleSaveClick}
                    disabled={saving}
                    className="btn btn-primary flex items-center justify-center flex-1 text-xs px-3.5 py-1.5 active:scale-95 font-semibold shadow-lg"
                  >
                    {saving ? (
                      <>
                        <LoadingSpinner size="sm" />
                        <span className="ml-1.5">Saving Changes...</span>
                      </>
                    ) : (
                      <>
                        <Save className="h-3 w-3 mr-1.5" />
                        Save Changes
                      </>
                    )}
                  </button>
                  <button
                    onClick={handleDiscardClick}
                    disabled={saving}
                    className="btn btn-secondary flex items-center justify-center sm:flex-none sm:px-3.5 text-xs px-3.5 py-1.5 active:scale-95 font-semibold"
                  >
                    <X className="h-3 w-3 mr-1.5" />
                    Discard
                  </button>
            </div>
          </div>
        </motion.div>
          )}
        </AnimatePresence>

        {/* Save Confirmation Modal */}
        <ConfirmationModal
          isOpen={showSaveConfirmation}
          onClose={() => setShowSaveConfirmation(false)}
          onConfirm={confirmSave}
          title="Save Schedule Changes"
          message="Are you sure you want to save your schedule changes? This will update your availability and delivery preferences."
          confirmText="Yes, Save"
          cancelText="Cancel"
          type="info"
          loading={saving}
          confirmButtonVariant="primary"
        />

        {/* Discard Confirmation Modal */}
      <ConfirmationModal
          isOpen={showDiscardConfirmation}
          onClose={() => setShowDiscardConfirmation(false)}
          onConfirm={confirmDiscard}
          title="Discard Changes"
          message="Are you sure you want to discard all unsaved changes? This action cannot be undone."
          confirmText="Yes, Discard"
          cancelText="Cancel"
        type="warning"
        confirmButtonVariant="danger"
      />
      </div>
    </div>
  )
}

export default VolunteerSchedulePage 
