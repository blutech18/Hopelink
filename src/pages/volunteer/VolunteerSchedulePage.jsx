import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { 
  Calendar, 
  Clock, 
  Plus, 
  Edit, 
  Trash2, 
  Save, 
  X,
  MapPin,
  AlertCircle,
  CheckCircle,
  Settings,
  Timer,
  User,
  Navigation,
  Package
} from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import { useToast } from '../../contexts/ToastContext'
import { FormSkeleton } from '../../components/ui/Skeleton'
import LoadingSpinner from '../../components/ui/LoadingSpinner'
import ConfirmationModal from '../../components/ui/ConfirmationModal'
import VolunteerDeliveryDashboard from './VolunteerDeliveryDashboard'

const VolunteerSchedulePage = () => {
  const { profile, updateProfile } = useAuth()
  const { success, error } = useToast()
  const [loading, setLoading] = useState(false)
  const [activeTab, setActiveTab] = useState('schedule') // 'schedule' or 'deliveries'
  const [selectedWeek, setSelectedWeek] = useState(0)
  const [scheduleData, setScheduleData] = useState({
    availability_days: profile?.availability_days || [],
    availability_times: profile?.availability_times || [],
    max_delivery_distance: profile?.max_delivery_distance || 20,
    delivery_preferences: profile?.delivery_preferences || []
  })
  const [editingAvailability, setEditingAvailability] = useState(false)
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)
  const [originalScheduleData, setOriginalScheduleData] = useState(null)
  const [showCancelConfirmation, setShowCancelConfirmation] = useState(false)

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

  // Initialize original data when profile changes
  useEffect(() => {
    if (profile && !originalScheduleData) {
      setOriginalScheduleData({
        availability_days: profile.availability_days || [],
        availability_times: profile.availability_times || [],
        max_delivery_distance: profile.max_delivery_distance || 20,
        delivery_preferences: profile.delivery_preferences || []
      })
    }
  }, [profile, originalScheduleData])

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
    
    setScheduleData(prev => ({
      ...prev,
      availability_days: newDays
    }))
    setHasUnsavedChanges(true)
  }

  const handleTimeSlotToggle = (timeSlot) => {
    const newTimes = scheduleData.availability_times.includes(timeSlot)
      ? scheduleData.availability_times.filter(t => t !== timeSlot)
      : [...scheduleData.availability_times, timeSlot]
    
    setScheduleData(prev => ({
      ...prev,
      availability_times: newTimes
    }))
    setHasUnsavedChanges(true)
  }

  const handlePreferenceToggle = (preference) => {
    const newPrefs = scheduleData.delivery_preferences.includes(preference)
      ? scheduleData.delivery_preferences.filter(p => p !== preference)
      : [...scheduleData.delivery_preferences, preference]
    
    setScheduleData(prev => ({
      ...prev,
      delivery_preferences: newPrefs
    }))
    setHasUnsavedChanges(true)
  }

  const startEditing = () => {
    setOriginalScheduleData({ ...scheduleData })
    setEditingAvailability(true)
    setHasUnsavedChanges(false)
  }

  const cancelEditing = () => {
    if (hasUnsavedChanges) {
      setShowCancelConfirmation(true)
    } else {
      performCancel()
    }
  }

  const performCancel = () => {
    if (originalScheduleData) {
      setScheduleData(originalScheduleData)
    }
    setEditingAvailability(false)
    setHasUnsavedChanges(false)
    setOriginalScheduleData(null)
    setShowCancelConfirmation(false)
  }

  const saveSchedule = async () => {
    if (scheduleData.availability_days.length === 0) {
      error('Please select at least one available day')
      return
    }

    if (scheduleData.availability_times.length === 0) {
      error('Please select at least one time slot')
      return
    }

    try {
      setLoading(true)
      await updateProfile(scheduleData)
      success('Schedule updated successfully!')
      setEditingAvailability(false)
      setHasUnsavedChanges(false)
      setOriginalScheduleData(null)
    } catch (err) {
      console.error('Error updating schedule:', err)
      error('Failed to update schedule')
    } finally {
      setLoading(false)
    }
  }

  const handleDistanceChange = (value) => {
    setScheduleData(prev => ({
      ...prev,
      max_delivery_distance: parseInt(value)
    }))
    setHasUnsavedChanges(true)
  }

  const weekDates = getCurrentWeekDates(selectedWeek)
  const isCurrentWeek = selectedWeek === 0

  return (
    <div className="min-h-screen py-4 sm:py-8" style={{backgroundColor: '#00237d'}}>
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="mb-6 sm:mb-8"
        >
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-white mb-2">
                Volunteer Dashboard
              </h1>
              <p className="text-navy-200">
                Manage your availability and delivery assignments
              </p>
            </div>
            
            {/* Tab Navigation */}
            <div className="flex bg-navy-800 rounded-lg p-1">
              <button
                onClick={() => setActiveTab('schedule')}
                className={`px-4 py-2 rounded-md transition-colors flex items-center space-x-2 ${
                  activeTab === 'schedule'
                    ? 'bg-skyblue-600 text-white'
                    : 'text-navy-200 hover:text-white hover:bg-navy-700'
                }`}
              >
                <Calendar className="w-4 h-4" />
                <span>Schedule</span>
              </button>
              <button
                onClick={() => setActiveTab('deliveries')}
                className={`px-4 py-2 rounded-md transition-colors flex items-center space-x-2 ${
                  activeTab === 'deliveries'
                    ? 'bg-skyblue-600 text-white'
                    : 'text-navy-200 hover:text-white hover:bg-navy-700'
                }`}
              >
                <Package className="w-4 h-4" />
                <span>Deliveries</span>
              </button>
            </div>
          </div>
        </motion.div>

        {/* Tab Content */}
        {activeTab === 'schedule' ? (
          // Existing schedule content
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="space-y-6 sm:space-y-8"
          >
            <div className="flex-1">
              <h1 className="text-2xl sm:text-3xl font-bold text-white">Volunteer Schedule</h1>
              <p className="text-skyblue-300 mt-1 sm:mt-2 text-sm sm:text-base">
                Manage your availability and delivery preferences
              </p>
            </div>
            <button
              onClick={editingAvailability ? cancelEditing : startEditing}
              className={`btn w-full sm:w-auto flex items-center justify-center gap-2 ${
                editingAvailability 
                  ? hasUnsavedChanges 
                    ? 'btn-danger' 
                    : 'btn-secondary'
                  : 'btn-primary'
              }`}
            >
              {editingAvailability ? (
                <>
                  <X className="h-4 w-4" />
                  <span className="hidden sm:inline">
                    {hasUnsavedChanges ? 'Cancel Changes' : 'Cancel'}
                  </span>
                  <span className="sm:hidden">
                    {hasUnsavedChanges ? 'Cancel' : 'Cancel'}
                  </span>
                  {hasUnsavedChanges && (
                    <span className="ml-1 text-xs bg-red-500 text-white px-1.5 py-0.5 rounded-full">
                      Unsaved
                    </span>
                  )}
                </>
              ) : (
                <>
                  <Settings className="h-4 w-4" />
                  <span className="hidden sm:inline">Edit Schedule</span>
                  <span className="sm:hidden">Edit</span>
                </>
              )}
            </button>

          {/* Weekly Calendar View */}
          <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="card p-4 sm:p-6 mb-6 sm:mb-8"
        >
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4 sm:mb-6 gap-4">
            <h2 className="text-lg sm:text-xl font-semibold text-white flex items-center gap-2">
              <Calendar className="h-5 w-5 text-skyblue-500" />
              Weekly Schedule
            </h2>
            <div className="flex items-center justify-center sm:justify-end gap-2">
              <button
                onClick={() => setSelectedWeek(selectedWeek - 1)}
                className="btn btn-secondary text-sm"
                aria-label="Previous week"
              >
                ← Previous
              </button>
              <span className="text-skyblue-300 text-sm px-2 py-1 bg-navy-800 rounded">
                {isCurrentWeek ? 'This Week' : `Week of ${weekDates[0].toLocaleDateString()}`}
              </span>
              <button
                onClick={() => setSelectedWeek(selectedWeek + 1)}
                className="btn btn-secondary text-sm"
                aria-label="Next week"
              >
                Next →
              </button>
            </div>
          </div>

          {/* Calendar Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-7 gap-2 sm:gap-3 md:gap-4">
            {weekDates.map((date, index) => {
              const dayName = daysOfWeek[index]
              const isAvailable = scheduleData.availability_days.includes(dayName)
              const isToday = date.toDateString() === new Date().toDateString()
              
              return (
                <div
                  key={index}
                  className={`p-3 sm:p-4 rounded-lg border-2 transition-all duration-200 hover:scale-105 cursor-pointer ${
                    isAvailable 
                      ? 'border-green-500 bg-green-500/10 hover:bg-green-500/20' 
                      : 'border-navy-600 bg-navy-800 hover:bg-navy-700'
                  } ${isToday ? 'ring-2 ring-skyblue-500 shadow-lg' : ''}`}
                  onClick={() => editingAvailability && handleDayToggle(dayName)}
                  role={editingAvailability ? "button" : undefined}
                  tabIndex={editingAvailability ? 0 : undefined}
                  onKeyDown={(e) => {
                    if (editingAvailability && (e.key === 'Enter' || e.key === ' ')) {
                      e.preventDefault()
                      handleDayToggle(dayName)
                    }
                  }}
                  aria-label={`${dayName}, ${date.toLocaleDateString()} - ${isAvailable ? 'Available' : 'Unavailable'}`}
                >
                  <div className="text-center">
                    <div className="text-xs sm:text-sm text-skyblue-300 mb-1 font-medium">
                      {dayName.slice(0, 3)}
                    </div>
                    <div className={`text-base sm:text-lg font-semibold ${isToday ? 'text-skyblue-400' : 'text-white'}`}>
                      {date.getDate()}
                    </div>
                    <div className="text-xs mt-2">
                      {isAvailable ? (
                        <span className="inline-flex items-center gap-1 text-green-400 bg-green-500/20 px-2 py-1 rounded-full">
                          <CheckCircle className="h-3 w-3" />
                          <span className="hidden sm:inline">Available</span>
                          <span className="sm:hidden">✓</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-gray-400 bg-navy-700 px-2 py-1 rounded-full">
                          <X className="h-3 w-3" />
                          <span className="hidden sm:inline">Unavailable</span>
                          <span className="sm:hidden">✗</span>
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
          
          {editingAvailability && (
            <div className="mt-4 p-3 bg-skyblue-500/10 border border-skyblue-500/20 rounded-lg">
              <p className="text-sm text-skyblue-300 text-center">
                💡 Click on any day to toggle availability
                {hasUnsavedChanges && (
                  <span className="block mt-1 text-orange-400 font-medium">
                    ⚠️ You have unsaved changes
                  </span>
                )}
              </p>
            </div>
          )}
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8">
          {/* Availability Settings */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="card p-4 sm:p-6"
          >
            <h3 className="text-lg font-semibold text-white mb-4 sm:mb-6 flex items-center gap-2">
              <Clock className="h-5 w-5 text-skyblue-500" />
              Availability Settings
            </h3>

            {editingAvailability ? (
              <div className="space-y-6">
                {/* Available Days */}
                <div>
                  <label className="block text-sm font-medium text-skyblue-300 mb-3">Available Days</label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {daysOfWeek.map(day => (
                      <label key={day} className="flex items-center gap-3 p-3 rounded-lg border border-navy-700 hover:border-skyblue-500/50 transition-colors cursor-pointer group">
                        <input
                          type="checkbox"
                          checked={scheduleData.availability_days.includes(day)}
                          onChange={() => handleDayToggle(day)}
                          className="rounded border-navy-600 bg-navy-800 text-skyblue-500 focus:ring-skyblue-500 focus:ring-2 w-4 h-4"
                          aria-describedby={`day-${day}-description`}
                        />
                        <span className="text-white text-sm font-medium group-hover:text-skyblue-300 transition-colors">{day}</span>
                        <span id={`day-${day}-description`} className="sr-only">
                          Toggle availability for {day}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Time Slots */}
                <div>
                  <label className="block text-sm font-medium text-skyblue-300 mb-3">Available Time Slots</label>
                  <div className="space-y-3">
                    {timeSlots.map(slot => (
                      <label key={slot.value} className="flex items-center gap-3 p-3 rounded-lg border border-navy-700 hover:border-skyblue-500/50 transition-colors cursor-pointer group">
                        <input
                          type="checkbox"
                          checked={scheduleData.availability_times.includes(slot.value)}
                          onChange={() => handleTimeSlotToggle(slot.value)}
                          className="rounded border-navy-600 bg-navy-800 text-skyblue-500 focus:ring-skyblue-500 focus:ring-2 w-4 h-4"
                          aria-describedby={`time-${slot.value}-description`}
                        />
                        <div className="flex-1">
                          <span className="text-white text-sm font-medium group-hover:text-skyblue-300 transition-colors">{slot.label}</span>
                          <span className="text-skyblue-400 text-xs ml-2">({slot.time})</span>
                        </div>
                        <span id={`time-${slot.value}-description`} className="sr-only">
                          Toggle availability for {slot.label} time slot
                        </span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Max Distance */}
                <div>
                  <label className="block text-sm font-medium text-skyblue-300 mb-3">
                    Maximum Delivery Distance: <span className="text-skyblue-400 font-semibold">{scheduleData.max_delivery_distance} km</span>
                  </label>
                  <div className="px-3 py-2 bg-navy-800 rounded-lg">
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
                    <div className="flex justify-between text-xs text-skyblue-400 mt-2">
                      <span>5km</span>
                      <span>100km</span>
                    </div>
                  </div>
                </div>

                {/* Save Button */}
                <button
                  onClick={saveSchedule}
                  disabled={loading}
                  className="btn btn-primary w-full flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <>
                      <LoadingSpinner size="sm" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4" />
                      Save Schedule
                    </>
                  )}
                </button>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Current Availability Display */}
                <div>
                  <label className="block text-sm font-medium text-skyblue-300 mb-3">Available Days</label>
                  <div className="flex flex-wrap gap-2">
                    {scheduleData.availability_days.length > 0 ? (
                      scheduleData.availability_days.map(day => (
                        <span key={day} className="inline-flex items-center gap-1 px-3 py-1.5 bg-green-500/20 text-green-400 rounded-full text-sm font-medium border border-green-500/30">
                          <CheckCircle className="h-3 w-3" />
                          {day}
                        </span>
                      ))
                    ) : (
                      <div className="flex items-center gap-2 text-skyblue-400 text-sm p-3 bg-navy-800 rounded-lg border border-navy-700">
                        <AlertCircle className="h-4 w-4" />
                        No days selected
                      </div>
                    )}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-skyblue-300 mb-3">Available Time Slots</label>
                  <div className="space-y-2">
                    {scheduleData.availability_times.length > 0 ? (
                      scheduleData.availability_times.map(timeValue => {
                        const slot = timeSlots.find(s => s.value === timeValue)
                        return slot ? (
                          <div key={timeValue} className="flex items-center gap-3 p-2 bg-green-500/10 rounded-lg border border-green-500/20">
                            <CheckCircle className="h-4 w-4 text-green-400 flex-shrink-0" />
                            <div className="flex-1">
                              <span className="text-white text-sm font-medium">{slot.label}</span>
                              <span className="text-skyblue-400 text-xs ml-2">({slot.time})</span>
                            </div>
                          </div>
                        ) : null
                      })
                    ) : (
                      <div className="flex items-center gap-2 text-skyblue-400 text-sm p-3 bg-navy-800 rounded-lg border border-navy-700">
                        <AlertCircle className="h-4 w-4" />
                        No time slots selected
                      </div>
                    )}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-skyblue-300 mb-2">Maximum Delivery Distance</label>
                  <div className="flex items-center gap-3 p-3 bg-navy-800 rounded-lg border border-navy-700">
                    <MapPin className="h-4 w-4 text-skyblue-500 flex-shrink-0" />
                    <span className="text-white font-medium">{scheduleData.max_delivery_distance} km</span>
                  </div>
                </div>
              </div>
            )}
          </motion.div>

          {/* Delivery Preferences */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="card p-4 sm:p-6"
          >
            <h3 className="text-lg font-semibold text-white mb-4 sm:mb-6 flex items-center gap-2">
              <User className="h-5 w-5 text-skyblue-500" />
              Delivery Preferences
            </h3>

            {editingAvailability ? (
              <div>
                <label className="block text-sm font-medium text-skyblue-300 mb-3">
                  Preferred Delivery Types (Optional)
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {deliveryPreferences.map(pref => (
                    <label key={pref} className="flex items-center gap-3 p-3 rounded-lg border border-navy-700 hover:border-skyblue-500/50 transition-colors cursor-pointer group">
                      <input
                        type="checkbox"
                        checked={scheduleData.delivery_preferences.includes(pref)}
                        onChange={() => handlePreferenceToggle(pref)}
                        className="rounded border-navy-600 bg-navy-800 text-skyblue-500 focus:ring-skyblue-500 focus:ring-2 w-4 h-4"
                        aria-describedby={`pref-${pref}-description`}
                      />
                      <span className="text-white text-sm font-medium group-hover:text-skyblue-300 transition-colors">{pref}</span>
                      <span id={`pref-${pref}-description`} className="sr-only">
                        Toggle preference for {pref} deliveries
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            ) : (
              <div>
                <label className="block text-sm font-medium text-skyblue-300 mb-3">Preferred Delivery Types</label>
                <div className="space-y-2">
                  {scheduleData.delivery_preferences.length > 0 ? (
                    scheduleData.delivery_preferences.map(pref => (
                      <div key={pref} className="flex items-center gap-3 p-2 bg-green-500/10 rounded-lg border border-green-500/20">
                        <CheckCircle className="h-4 w-4 text-green-400 flex-shrink-0" />
                        <span className="text-white text-sm font-medium">{pref}</span>
                      </div>
                    ))
                  ) : (
                    <div className="flex items-center gap-2 text-skyblue-400 text-sm p-3 bg-navy-800 rounded-lg border border-navy-700">
                      <AlertCircle className="h-4 w-4" />
                      No preferences specified
                    </div>
                  )}
                </div>
              </div>
            )}

            {!editingAvailability && (
              <div className="mt-6 p-4 bg-navy-800 rounded-lg border border-navy-700">
                <div className="flex items-start gap-3">
                  <AlertCircle className="h-5 w-5 text-skyblue-400 mt-0.5 flex-shrink-0" />
                  <div>
                    <h4 className="text-white font-medium mb-2">Schedule Tips</h4>
                    <ul className="text-sm text-skyblue-300 space-y-1">
                      <li>• Keep your schedule updated for better task matching</li>
                      <li>• Set realistic time slots based on your actual availability</li>
                      <li>• Consider traffic and distance when setting delivery radius</li>
                    </ul>
                  </div>
                </div>
              </div>
            )}
          </motion.div>
        </div>

        {/* Quick Stats */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 mt-6 sm:mt-8"
        >
          <div className="card p-4 sm:p-6 text-center hover:bg-navy-800 transition-colors">
            <div className="text-2xl sm:text-3xl font-bold text-skyblue-400 mb-2">
              {scheduleData.availability_days.length}
            </div>
            <div className="text-sm text-skyblue-300">
              Available Days per Week
            </div>
          </div>
          
          <div className="card p-4 sm:p-6 text-center hover:bg-navy-800 transition-colors">
            <div className="text-2xl sm:text-3xl font-bold text-skyblue-400 mb-2">
              {scheduleData.availability_times.length}
            </div>
            <div className="text-sm text-skyblue-300">
              Time Slots Available
            </div>
          </div>
          
          <div className="card p-4 sm:p-6 text-center hover:bg-navy-800 transition-colors sm:col-span-2 lg:col-span-1">
            <div className="text-2xl sm:text-3xl font-bold text-skyblue-400 mb-2">
              {scheduleData.max_delivery_distance}km
            </div>
            <div className="text-sm text-skyblue-300">
              Maximum Delivery Range
            </div>
          </div>
        </motion.div>
        </motion.div>
      ) : (
        // Deliveries tab content
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          <VolunteerDeliveryDashboard />
        </motion.div>
      )}

      {/* Confirmation Modal */}
      <ConfirmationModal
        isOpen={showCancelConfirmation}
        onClose={() => setShowCancelConfirmation(false)}
        onConfirm={performCancel}
        title="Cancel Changes"
        message="You have unsaved changes. Are you sure you want to cancel? Your changes will be lost."
        confirmText="Yes, Cancel"
        cancelText="Keep Editing"
        type="warning"
        confirmButtonVariant="danger"
      />
      </div>
    </div>
  )
}

export default VolunteerSchedulePage 