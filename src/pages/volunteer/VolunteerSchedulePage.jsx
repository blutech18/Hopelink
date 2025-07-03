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
  User
} from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import { useToast } from '../../contexts/ToastContext'
import LoadingSpinner from '../../components/ui/LoadingSpinner'

const VolunteerSchedulePage = () => {
  const { profile, updateProfile } = useAuth()
  const { success, error } = useToast()
  const [loading, setLoading] = useState(false)
  const [selectedWeek, setSelectedWeek] = useState(0)
  const [scheduleData, setScheduleData] = useState({
    availability_days: profile?.availability_days || [],
    availability_times: profile?.availability_times || [],
    max_delivery_distance: profile?.max_delivery_distance || 20,
    delivery_preferences: profile?.delivery_preferences || []
  })
  const [editingAvailability, setEditingAvailability] = useState(false)

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
  }

  const handleTimeSlotToggle = (timeSlot) => {
    const newTimes = scheduleData.availability_times.includes(timeSlot)
      ? scheduleData.availability_times.filter(t => t !== timeSlot)
      : [...scheduleData.availability_times, timeSlot]
    
    setScheduleData(prev => ({
      ...prev,
      availability_times: newTimes
    }))
  }

  const handlePreferenceToggle = (preference) => {
    const newPrefs = scheduleData.delivery_preferences.includes(preference)
      ? scheduleData.delivery_preferences.filter(p => p !== preference)
      : [...scheduleData.delivery_preferences, preference]
    
    setScheduleData(prev => ({
      ...prev,
      delivery_preferences: newPrefs
    }))
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
    } catch (err) {
      console.error('Error updating schedule:', err)
      error('Failed to update schedule')
    } finally {
      setLoading(false)
    }
  }

  const weekDates = getCurrentWeekDates(selectedWeek)
  const isCurrentWeek = selectedWeek === 0

  return (
    <div className="min-h-screen bg-navy-950 py-8">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="mb-8"
        >
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-white">Volunteer Schedule</h1>
              <p className="text-skyblue-300 mt-2">
                Manage your availability and delivery preferences
              </p>
            </div>
            <button
              onClick={() => setEditingAvailability(!editingAvailability)}
              className="btn-primary flex items-center gap-2"
            >
              {editingAvailability ? (
                <>
                  <X className="h-4 w-4" />
                  Cancel
                </>
              ) : (
                <>
                  <Settings className="h-4 w-4" />
                  Edit Schedule
                </>
              )}
            </button>
          </div>
        </motion.div>

        {/* Weekly Calendar View */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="card p-6 mb-8"
        >
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-white flex items-center gap-2">
              <Calendar className="h-5 w-5 text-skyblue-500" />
              Weekly Schedule
            </h2>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setSelectedWeek(selectedWeek - 1)}
                className="btn-secondary px-3 py-1 text-sm"
              >
                ← Previous
              </button>
              <span className="text-skyblue-300 text-sm">
                {isCurrentWeek ? 'This Week' : `Week of ${weekDates[0].toLocaleDateString()}`}
              </span>
              <button
                onClick={() => setSelectedWeek(selectedWeek + 1)}
                className="btn-secondary px-3 py-1 text-sm"
              >
                Next →
              </button>
            </div>
          </div>

          {/* Calendar Grid */}
          <div className="grid grid-cols-7 gap-4">
            {weekDates.map((date, index) => {
              const dayName = daysOfWeek[index]
              const isAvailable = scheduleData.availability_days.includes(dayName)
              const isToday = date.toDateString() === new Date().toDateString()
              
              return (
                <div
                  key={index}
                  className={`p-4 rounded-lg border-2 transition-colors ${
                    isAvailable 
                      ? 'border-green-500 bg-green-500/10' 
                      : 'border-navy-600 bg-navy-800'
                  } ${isToday ? 'ring-2 ring-skyblue-500' : ''}`}
                >
                  <div className="text-center">
                    <div className="text-sm text-skyblue-300 mb-1">
                      {dayName}
                    </div>
                    <div className={`text-lg font-semibold ${isToday ? 'text-skyblue-400' : 'text-white'}`}>
                      {date.getDate()}
                    </div>
                    <div className="text-xs text-skyblue-400 mt-2">
                      {isAvailable ? (
                        <span className="text-green-400">Available</span>
                      ) : (
                        <span className="text-gray-400">Unavailable</span>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Availability Settings */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="card p-6"
          >
            <h3 className="text-lg font-semibold text-white mb-6 flex items-center gap-2">
              <Clock className="h-5 w-5 text-skyblue-500" />
              Availability Settings
            </h3>

            {editingAvailability ? (
              <div className="space-y-6">
                {/* Available Days */}
                <div>
                  <label className="block text-sm text-skyblue-300 mb-3">Available Days</label>
                  <div className="grid grid-cols-2 gap-3">
                    {daysOfWeek.map(day => (
                      <label key={day} className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={scheduleData.availability_days.includes(day)}
                          onChange={() => handleDayToggle(day)}
                          className="rounded border-navy-600 bg-navy-800 text-skyblue-500 focus:ring-skyblue-500"
                        />
                        <span className="text-white text-sm">{day}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Time Slots */}
                <div>
                  <label className="block text-sm text-skyblue-300 mb-3">Available Time Slots</label>
                  <div className="space-y-3">
                    {timeSlots.map(slot => (
                      <label key={slot.value} className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          checked={scheduleData.availability_times.includes(slot.value)}
                          onChange={() => handleTimeSlotToggle(slot.value)}
                          className="rounded border-navy-600 bg-navy-800 text-skyblue-500 focus:ring-skyblue-500"
                        />
                        <div>
                          <span className="text-white text-sm font-medium">{slot.label}</span>
                          <span className="text-skyblue-400 text-xs ml-2">({slot.time})</span>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Max Distance */}
                <div>
                  <label className="block text-sm text-skyblue-300 mb-2">
                    Maximum Delivery Distance: {scheduleData.max_delivery_distance} km
                  </label>
                  <input
                    type="range"
                    min="5"
                    max="100"
                    value={scheduleData.max_delivery_distance}
                    onChange={(e) => setScheduleData(prev => ({
                      ...prev,
                      max_delivery_distance: parseInt(e.target.value)
                    }))}
                    className="w-full h-2 bg-navy-700 rounded-lg appearance-none cursor-pointer"
                  />
                  <div className="flex justify-between text-xs text-skyblue-400 mt-1">
                    <span>5km</span>
                    <span>100km</span>
                  </div>
                </div>

                {/* Save Button */}
                <button
                  onClick={saveSchedule}
                  disabled={loading}
                  className="btn-primary w-full flex items-center gap-2"
                >
                  {loading ? (
                    <LoadingSpinner size="sm" />
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
                  <label className="block text-sm text-skyblue-300 mb-3">Available Days</label>
                  <div className="flex flex-wrap gap-2">
                    {scheduleData.availability_days.length > 0 ? (
                      scheduleData.availability_days.map(day => (
                        <span key={day} className="px-3 py-1 bg-green-500/20 text-green-400 rounded-full text-sm">
                          {day}
                        </span>
                      ))
                    ) : (
                      <span className="text-skyblue-400 text-sm">No days selected</span>
                    )}
                  </div>
                </div>

                <div>
                  <label className="block text-sm text-skyblue-300 mb-3">Available Time Slots</label>
                  <div className="space-y-2">
                    {scheduleData.availability_times.length > 0 ? (
                      scheduleData.availability_times.map(timeValue => {
                        const slot = timeSlots.find(s => s.value === timeValue)
                        return slot ? (
                          <div key={timeValue} className="flex items-center gap-2">
                            <CheckCircle className="h-4 w-4 text-green-400" />
                            <span className="text-white text-sm">{slot.label}</span>
                            <span className="text-skyblue-400 text-xs">({slot.time})</span>
                          </div>
                        ) : null
                      })
                    ) : (
                      <span className="text-skyblue-400 text-sm">No time slots selected</span>
                    )}
                  </div>
                </div>

                <div>
                  <label className="block text-sm text-skyblue-300 mb-2">Maximum Delivery Distance</label>
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-skyblue-500" />
                    <span className="text-white">{scheduleData.max_delivery_distance} km</span>
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
            className="card p-6"
          >
            <h3 className="text-lg font-semibold text-white mb-6 flex items-center gap-2">
              <User className="h-5 w-5 text-skyblue-500" />
              Delivery Preferences
            </h3>

            {editingAvailability ? (
              <div>
                <label className="block text-sm text-skyblue-300 mb-3">
                  Preferred Delivery Types (Optional)
                </label>
                <div className="grid grid-cols-1 gap-3">
                  {deliveryPreferences.map(pref => (
                    <label key={pref} className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={scheduleData.delivery_preferences.includes(pref)}
                        onChange={() => handlePreferenceToggle(pref)}
                        className="rounded border-navy-600 bg-navy-800 text-skyblue-500 focus:ring-skyblue-500"
                      />
                      <span className="text-white text-sm">{pref}</span>
                    </label>
                  ))}
                </div>
              </div>
            ) : (
              <div>
                <label className="block text-sm text-skyblue-300 mb-3">Preferred Delivery Types</label>
                <div className="space-y-2">
                  {scheduleData.delivery_preferences.length > 0 ? (
                    scheduleData.delivery_preferences.map(pref => (
                      <div key={pref} className="flex items-center gap-2">
                        <CheckCircle className="h-4 w-4 text-green-400" />
                        <span className="text-white text-sm">{pref}</span>
                      </div>
                    ))
                  ) : (
                    <span className="text-skyblue-400 text-sm">No preferences specified</span>
                  )}
                </div>
              </div>
            )}

            {!editingAvailability && (
              <div className="mt-6 p-4 bg-navy-800 rounded-lg">
                <div className="flex items-start gap-3">
                  <AlertCircle className="h-5 w-5 text-skyblue-400 mt-0.5 flex-shrink-0" />
                  <div>
                    <h4 className="text-white font-medium mb-1">Schedule Tips</h4>
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
          className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8"
        >
          <div className="card p-6 text-center">
            <div className="text-2xl font-bold text-skyblue-400 mb-2">
              {scheduleData.availability_days.length}
            </div>
            <div className="text-sm text-skyblue-300">
              Available Days per Week
            </div>
          </div>
          
          <div className="card p-6 text-center">
            <div className="text-2xl font-bold text-skyblue-400 mb-2">
              {scheduleData.availability_times.length}
            </div>
            <div className="text-sm text-skyblue-300">
              Time Slots Available
            </div>
          </div>
          
          <div className="card p-6 text-center">
            <div className="text-2xl font-bold text-skyblue-400 mb-2">
              {scheduleData.max_delivery_distance}km
            </div>
            <div className="text-sm text-skyblue-300">
              Maximum Delivery Range
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  )
}

export default VolunteerSchedulePage 