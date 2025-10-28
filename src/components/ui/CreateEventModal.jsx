import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  X, 
  Calendar, 
  MapPin, 
  Clock, 
  Users, 
  Type, 
  FileText,
  Save,
  AlertCircle,
  Plus,
  Trash2,
  Package,
  Upload,
  Image as ImageIcon,
  CheckCircle
} from 'lucide-react'
import { useToast } from '../../contexts/ToastContext'
import { db } from '../../lib/supabase'
import LoadingSpinner from './LoadingSpinner'
import LocationPicker from './LocationPicker'

const CreateEventModal = ({ isOpen, onClose, event = null, onSave }) => {
  const { success, error } = useToast()
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    event_type: 'Community Cleanup',
    location: '',
    start_date: '',
    start_time: '',
    end_date: '',
    end_time: '',
    max_participants: '',
    image_url: '',
    donation_items: [],
    schedule: [],
    requirements: [],
    what_to_bring: [],
    contact_coordinator: '',
    contact_phone: '',
    contact_email: ''
  })
  const [imageFile, setImageFile] = useState(null)
  const [imagePreview, setImagePreview] = useState(null)
  const [isLocationPickerOpen, setIsLocationPickerOpen] = useState(false)
  const [selectedLocationData, setSelectedLocationData] = useState(null)

  const eventTypes = [
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

  const donationCategories = [
    'Food & Beverages',
    'Clothing & Accessories',
    'Medical Supplies',
    'Educational Materials',
    'Household Items',
    'Electronics & Technology',
    'Toys & Recreation',
    'Personal Care Items',
    'Emergency Supplies',
    'Financial Assistance',
    'Transportation',
    'Other'
  ]

  useEffect(() => {
    if (event) {
      // Parse existing event data for editing
      const startDate = new Date(event.start_date)
      const endDate = new Date(event.end_date)
      
      setFormData({
        name: event.name || '',
        description: event.description || '',
        event_type: event.target_goal || 'Community Cleanup',
        location: event.location || '',
        start_date: startDate.toISOString().split('T')[0],
        start_time: startDate.toTimeString().slice(0, 5),
        end_date: endDate.toISOString().split('T')[0],
        end_time: endDate.toTimeString().slice(0, 5),
        max_participants: event.max_participants?.toString() || '',
        image_url: event.image_url || '',
        donation_items: event.event_items || [],
        schedule: event.schedule || [],
        requirements: event.requirements || [],
        what_to_bring: event.what_to_bring || [],
        contact_coordinator: event.contact_info?.coordinator || '',
        contact_phone: event.contact_info?.phone || '',
        contact_email: event.contact_info?.email || ''
      })
      setImagePreview(event.image_url || null)
      setImageFile(null)
    } else {
      // Reset form for new event
      setFormData({
        name: '',
        description: '',
        event_type: 'Community Cleanup',
        location: '',
        start_date: '',
        start_time: '',
        end_date: '',
        end_time: '',
        max_participants: '',
        image_url: '',
        donation_items: [],
        schedule: [],
        requirements: [],
        what_to_bring: [],
        contact_coordinator: '',
        contact_phone: '',
        contact_email: ''
      })
      setImagePreview(null)
      setImageFile(null)
    }
  }, [event, isOpen])

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
  }

  const handleLocationSelect = (locationData) => {
    setSelectedLocationData(locationData)
    setFormData(prev => ({
      ...prev,
      location: locationData.address
    }))
    setIsLocationPickerOpen(false)
  }

  const addDonationItem = () => {
    setFormData(prev => ({
      ...prev,
      donation_items: [...prev.donation_items, {
        name: '',
        category: 'Food & Beverages',
        quantity: 1,
        description: '',
        collected_quantity: 0
      }]
    }))
  }

  const removeDonationItem = (index) => {
    setFormData(prev => ({
      ...prev,
      donation_items: prev.donation_items.filter((_, i) => i !== index)
    }))
  }

  const updateDonationItem = (index, field, value) => {
    setFormData(prev => ({
      ...prev,
      donation_items: prev.donation_items.map((item, i) => 
        i === index ? { ...item, [field]: value } : item
      )
    }))
  }

  // Schedule management
  const addScheduleItem = () => {
    setFormData(prev => ({
      ...prev,
      schedule: [...prev.schedule, { time: '', activity: '' }]
    }))
  }

  const removeScheduleItem = (index) => {
    setFormData(prev => ({
      ...prev,
      schedule: prev.schedule.filter((_, i) => i !== index)
    }))
  }

  const updateScheduleItem = (index, field, value) => {
    setFormData(prev => ({
      ...prev,
      schedule: prev.schedule.map((item, i) => 
        i === index ? { ...item, [field]: value } : item
      )
    }))
  }

  // Requirements management
  const addRequirement = () => {
    setFormData(prev => ({
      ...prev,
      requirements: [...prev.requirements, '']
    }))
  }

  const removeRequirement = (index) => {
    setFormData(prev => ({
      ...prev,
      requirements: prev.requirements.filter((_, i) => i !== index)
    }))
  }

  const updateRequirement = (index, value) => {
    setFormData(prev => ({
      ...prev,
      requirements: prev.requirements.map((item, i) => 
        i === index ? value : item
      )
    }))
  }

  // What to Bring management
  const addWhatToBring = () => {
    setFormData(prev => ({
      ...prev,
      what_to_bring: [...prev.what_to_bring, '']
    }))
  }

  const removeWhatToBring = (index) => {
    setFormData(prev => ({
      ...prev,
      what_to_bring: prev.what_to_bring.filter((_, i) => i !== index)
    }))
  }

  const updateWhatToBring = (index, value) => {
    setFormData(prev => ({
      ...prev,
      what_to_bring: prev.what_to_bring.map((item, i) => 
        i === index ? value : item
      )
    }))
  }

  const handleImageChange = (e) => {
    const file = e.target.files[0]
    if (file) {
      if (file.size > 5 * 1024 * 1024) { // 5MB limit
        error('Image file size must be less than 5MB')
        return
      }
      
      if (!file.type.startsWith('image/')) {
        error('Please select a valid image file')
        return
      }
      
      setImageFile(file)
      
      // Create preview
      const reader = new FileReader()
      reader.onload = (e) => {
        setImagePreview(e.target.result)
      }
      reader.readAsDataURL(file)
    }
  }

  const removeImage = () => {
    setImageFile(null)
    setImagePreview(null)
    setFormData(prev => ({ ...prev, image_url: '' }))
  }

  const uploadImage = async (file) => {
    // In a real application, this would upload to Supabase Storage or another cloud service
    // For now, we'll create a data URL as a placeholder
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(reader.result)
      reader.onerror = reject
      reader.readAsDataURL(file)
    })
  }

  const validateForm = () => {
    const errors = []
    
    if (!formData.name.trim()) errors.push('Event name is required')
    if (!formData.description.trim()) errors.push('Event description is required')
    if (!formData.location.trim()) errors.push('Location is required')
    if (!formData.start_date) errors.push('Start date is required')
    if (!formData.start_time) errors.push('Start time is required')
    if (!formData.end_date) errors.push('End date is required')
    if (!formData.end_time) errors.push('End time is required')
    
    const startDateTime = new Date(`${formData.start_date}T${formData.start_time}`)
    const endDateTime = new Date(`${formData.end_date}T${formData.end_time}`)
    
    if (startDateTime >= endDateTime) {
      errors.push('End date/time must be after start date/time')
    }
    
    if (startDateTime <= new Date()) {
      errors.push('Event must be scheduled for a future date/time')
    }

    // Validate donation items
    formData.donation_items.forEach((item, index) => {
      if (!item.name.trim()) {
        errors.push(`Donation item ${index + 1}: Name is required`)
      }
      if (item.quantity < 1) {
        errors.push(`Donation item ${index + 1}: Quantity must be at least 1`)
      }
    })
    
    return errors
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    const errors = validateForm()
    if (errors.length > 0) {
      error(errors[0])
      return
    }

    try {
      setLoading(true)
      
      // Note: Image upload disabled to prevent JSON parsing issues with large base64 strings
      // TODO: Implement proper file storage (Supabase Storage, Cloudinary, etc.)
      let imageUrl = null
      
      // Combine date and time into ISO datetime strings
      const startDateTime = new Date(`${formData.start_date}T${formData.start_time}:00`).toISOString()
      const endDateTime = new Date(`${formData.end_date}T${formData.end_time}:00`).toISOString()
      
      const eventData = {
        name: formData.name,
        description: formData.description,
        location: formData.location,
        start_date: startDateTime,
        end_date: endDateTime,
        max_participants: formData.max_participants ? parseInt(formData.max_participants) : null,
        target_goal: formData.event_type,
        status: 'active',
        image_url: imageUrl,
        schedule: formData.schedule.filter(item => item.time && item.activity),
        requirements: formData.requirements.filter(req => req.trim()),
        what_to_bring: formData.what_to_bring.filter(item => item.trim()),
        contact_info: {
          coordinator: formData.contact_coordinator || 'Event Coordinator',
          phone: formData.contact_phone || 'N/A',
          email: formData.contact_email || 'N/A'
        }
      }

      // Remove donation_items from eventData as it will be handled separately
      const { donation_items, ...eventDataToSave } = eventData

      if (event) {
        await db.updateEvent(event.id, eventDataToSave, formData.donation_items)
      } else {
        await db.createEvent(eventDataToSave, formData.donation_items)
      }

      success(
        event ? 'Event updated successfully' : 'Event created successfully'
      )
      
      if (onSave) {
        onSave({...eventData, event_items: donation_items})
      }
      
      onClose()
    } catch (err) {
      console.error('Error saving event:', err)
      error('Failed to save event')
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-black/50 backdrop-blur-sm"
          onClick={onClose}
        />
        
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          transition={{ duration: 0.2 }}
          className="relative bg-navy-800 rounded-lg shadow-xl border border-navy-700 w-full max-w-4xl max-h-[90vh] overflow-hidden mx-4"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4 sm:p-6 border-b border-navy-700">
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <div className="p-2 bg-navy-700 rounded-lg flex-shrink-0">
                <Calendar className="h-5 w-5 sm:h-6 sm:w-6 text-yellow-300" />
              </div>
              <div className="min-w-0">
                <h2 className="text-lg sm:text-xl font-bold text-white">
                  {event ? 'Edit Event' : 'Create New Event'}
                </h2>
                <p className="text-yellow-300 text-xs sm:text-sm hidden sm:block">
                  {event ? 'Update event information' : 'Fill in the event details'}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-yellow-400 hover:text-white hover:bg-navy-700 rounded-lg transition-colors flex-shrink-0"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Scrollable Content */}
          <div className="max-h-[calc(90vh-200px)] overflow-y-auto pr-2 custom-scrollbar">
            {/* Form */}
            <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-4 sm:space-y-6">
            {/* Basic Info */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
              <div className="md:col-span-2">
                <label className="block text-white font-medium mb-2">
                  <Type className="h-4 w-4 inline mr-2" />
                  Event Name *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  className="w-full px-4 py-2.5 sm:py-2 bg-navy-800 border border-navy-700 rounded-lg text-white text-sm sm:text-base placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-yellow-500"
                  placeholder="Enter event name"
                  required
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-white font-medium mb-2">
                  <FileText className="h-4 w-4 inline mr-2" />
                  Description *
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => handleInputChange('description', e.target.value)}
                  rows={3}
                  className="w-full px-4 py-2.5 sm:py-2 bg-navy-800 border border-navy-700 rounded-lg text-white text-sm sm:text-base placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-yellow-500"
                  placeholder="Describe the event and its purpose"
                  required
                />
              </div>

              <div>
                <label className="block text-white font-medium mb-2">Event Type *</label>
                <select
                  value={formData.event_type}
                  onChange={(e) => handleInputChange('event_type', e.target.value)}
                  className="w-full px-4 py-2.5 sm:py-2 bg-navy-800 border border-navy-700 rounded-lg text-white text-sm sm:text-base focus:outline-none focus:ring-2 focus:ring-yellow-500"
                  required
                >
                  {eventTypes.map(type => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-white font-medium mb-2">
                  <Users className="h-4 w-4 inline mr-2" />
                  Max Participants
                </label>
                <input
                  type="number"
                  value={formData.max_participants}
                  onChange={(e) => handleInputChange('max_participants', e.target.value)}
                  className="w-full px-4 py-2.5 sm:py-2 bg-navy-800 border border-navy-700 rounded-lg text-white text-sm sm:text-base placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-yellow-500"
                  placeholder="Optional"
                  min="1"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-white font-medium mb-2">
                  <MapPin className="h-4 w-4 inline mr-2" />
                  Location *
                </label>
                <div className="flex flex-col sm:flex-row gap-2">
                  <input
                    type="text"
                    value={formData.location}
                    onChange={(e) => handleInputChange('location', e.target.value)}
                    className="flex-1 px-4 py-2.5 sm:py-2 bg-navy-800 border border-navy-700 rounded-lg text-white text-sm sm:text-base placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-yellow-500"
                    placeholder="Event location address"
                    required
                    readOnly
                  />
                  <button
                    type="button"
                    onClick={() => setIsLocationPickerOpen(true)}
                    className="w-full sm:w-auto px-4 py-2.5 sm:py-2 bg-yellow-400 text-navy-900 rounded-lg hover:bg-yellow-500 transition-all active:scale-95 flex items-center justify-center gap-2 font-medium text-sm sm:text-base flex-shrink-0"
                  >
                    <MapPin className="h-4 w-4 flex-shrink-0" />
                    Select
                  </button>
                </div>
              </div>
            </div>

            {/* Event Image */}
            <div className="space-y-4">
              <div>
                <label className="block text-white font-medium mb-2">
                  <ImageIcon className="h-4 w-4 inline mr-2" />
                  Event Image
                </label>
                <p className="text-yellow-400 text-xs sm:text-sm mb-3">
                  Upload an image of your organization, building, or logo (Max 5MB)
                </p>
                
                {imagePreview ? (
                  <div className="relative">
                    <img
                      src={imagePreview}
                      alt="Event preview"
                      className="w-full h-48 object-cover rounded-lg border border-navy-700"
                    />
                    <button
                      type="button"
                      onClick={removeImage}
                      className="absolute top-2 right-2 bg-red-600 hover:bg-red-700 text-white p-2 rounded-full transition-colors"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ) : (
                  <div className="border-2 border-dashed border-navy-700 rounded-lg p-8 text-center">
                    <Upload className="h-12 w-12 text-yellow-500 mx-auto mb-4" />
                    <div className="mb-4">
                      <label className="btn btn-secondary inline-flex items-center px-4 py-2 rounded cursor-pointer">
                        <Upload className="h-4 w-4 mr-2" />
                        Choose Image
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleImageChange}
                          className="hidden"
                        />
                      </label>
                    </div>
                    <p className="text-yellow-400 text-xs sm:text-sm">
                      Drop an image here or click to browse
                    </p>
                    <p className="text-yellow-500 text-xs mt-1">
                      Supports JPG, PNG, GIF up to 5MB
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Date & Time */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-white font-medium mb-2">
                  <Calendar className="h-4 w-4 inline mr-2 text-yellow-400" />
                  Start Date *
                </label>
                <input
                  type="date"
                  value={formData.start_date}
                  onChange={(e) => handleInputChange('start_date', e.target.value)}
                  className="w-full px-4 py-2.5 sm:py-2 bg-navy-800 border border-navy-700 rounded-lg text-white text-sm sm:text-base focus:outline-none focus:ring-2 focus:ring-yellow-500"
                  required
                />
              </div>

              <div>
                <label className="block text-white font-medium mb-2">
                  <Clock className="h-4 w-4 inline mr-2 text-yellow-400" />
                  Start Time *
                </label>
                <input
                  type="time"
                  value={formData.start_time}
                  onChange={(e) => handleInputChange('start_time', e.target.value)}
                  className="w-full px-4 py-2.5 sm:py-2 bg-navy-800 border border-navy-700 rounded-lg text-white text-sm sm:text-base focus:outline-none focus:ring-2 focus:ring-yellow-500"
                  required
                />
              </div>

              <div>
                <label className="block text-white font-medium mb-2">
                  <Calendar className="h-4 w-4 inline mr-2 text-yellow-400" />
                  End Date *
                </label>
                <input
                  type="date"
                  value={formData.end_date}
                  onChange={(e) => handleInputChange('end_date', e.target.value)}
                  className="w-full px-4 py-2.5 sm:py-2 bg-navy-800 border border-navy-700 rounded-lg text-white text-sm sm:text-base focus:outline-none focus:ring-2 focus:ring-yellow-500"
                  required
                />
              </div>

              <div>
                <label className="block text-white font-medium mb-2">
                  <Clock className="h-4 w-4 inline mr-2 text-yellow-400" />
                  End Time *
                </label>
                <input
                  type="time"
                  value={formData.end_time}
                  onChange={(e) => handleInputChange('end_time', e.target.value)}
                  className="w-full px-4 py-2.5 sm:py-2 bg-navy-800 border border-navy-700 rounded-lg text-white text-sm sm:text-base focus:outline-none focus:ring-2 focus:ring-yellow-500"
                  required
                />
              </div>
            </div>

            {/* Donation Needs Section */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <label className="block text-white font-medium">
                  <Package className="h-4 w-4 inline mr-2" />
                  Donation Needs
                </label>
                <button
                  type="button"
                  onClick={addDonationItem}
                  className="px-4 py-2 bg-gradient-to-r from-yellow-600 to-yellow-500 hover:from-yellow-500 hover:to-yellow-400 text-white rounded-lg font-medium transition-all active:scale-95 flex items-center gap-2 shadow-md"
                >
                  <Plus className="h-4 w-4 flex-shrink-0" />
                  <span>Add Item</span>
                </button>
              </div>
              
              {formData.donation_items.length === 0 && (
                <div className="text-center py-8 text-yellow-400 bg-navy-800 rounded-lg border border-navy-700">
                  <Package className="h-12 w-12 mx-auto mb-2 text-yellow-500" />
                  <p>No donation items added yet</p>
                  <p className="text-sm">Add items that donors can contribute to this event</p>
                </div>
              )}

              {formData.donation_items.map((item, index) => (
                <div key={index} className="bg-navy-800 p-4 rounded-lg border border-navy-700">
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="text-white font-medium">Donation Item {index + 1}</h4>
                    <button
                      type="button"
                      onClick={() => removeDonationItem(index)}
                      className="text-red-400 hover:text-red-300 p-1"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                    <div>
                      <label className="block text-yellow-200 text-xs sm:text-sm mb-1">Item Name *</label>
                      <input
                        type="text"
                        value={item.name}
                        onChange={(e) => updateDonationItem(index, 'name', e.target.value)}
                        className="w-full px-3 py-2 bg-navy-700 border border-navy-600 rounded text-white text-sm focus:outline-none focus:ring-1 focus:ring-yellow-500"
                        placeholder="e.g., Canned Goods, Rice Bags"
                        required
                      />
                    </div>
                    
                    <div>
                      <label className="block text-yellow-200 text-xs sm:text-sm mb-1">Category *</label>
                      <select
                        value={item.category}
                        onChange={(e) => updateDonationItem(index, 'category', e.target.value)}
                        className="w-full px-3 py-2 bg-navy-700 border border-navy-600 rounded text-white text-sm focus:outline-none focus:ring-1 focus:ring-yellow-500"
                        required
                      >
                        {donationCategories.map(category => (
                          <option key={category} value={category}>{category}</option>
                        ))}
                      </select>
                    </div>
                    
                    <div>
                      <label className="block text-yellow-200 text-xs sm:text-sm mb-1">Quantity Needed *</label>
                      <input
                        type="number"
                        value={item.quantity}
                        onChange={(e) => updateDonationItem(index, 'quantity', parseInt(e.target.value) || 1)}
                        className="w-full px-3 py-2 bg-navy-700 border border-navy-600 rounded text-white text-sm focus:outline-none focus:ring-1 focus:ring-yellow-500"
                        min="1"
                        required
                      />
                    </div>
                    
                    <div>
                      <label className="block text-yellow-200 text-xs sm:text-sm mb-1">Description</label>
                      <input
                        type="text"
                        value={item.description}
                        onChange={(e) => updateDonationItem(index, 'description', e.target.value)}
                        className="w-full px-3 py-2 bg-navy-700 border border-navy-600 rounded text-white text-sm focus:outline-none focus:ring-1 focus:ring-yellow-500"
                        placeholder="Optional details about the item"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Event Schedule Section */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <label className="block text-white font-medium">
                  <Clock className="h-4 w-4 inline mr-2" />
                  Event Schedule
                </label>
                <button
                  type="button"
                  onClick={addScheduleItem}
                  className="px-4 py-2 bg-gradient-to-r from-yellow-600 to-yellow-500 hover:from-yellow-500 hover:to-yellow-400 text-white rounded-lg font-medium transition-all active:scale-95 flex items-center gap-2 shadow-md"
                >
                  <Plus className="h-4 w-4 flex-shrink-0" />
                  <span className="hidden sm:inline">Add Schedule Item</span>
                  <span className="sm:hidden">Add Item</span>
                </button>
              </div>
              
              {formData.schedule.length === 0 && (
                <div className="text-center py-6 text-yellow-400 bg-navy-800 rounded-lg border border-navy-700">
                  <Clock className="h-10 w-10 mx-auto mb-2 text-yellow-500" />
                  <p className="text-sm">No schedule items added yet</p>
                </div>
              )}

              {formData.schedule.map((item, index) => (
                <div key={index} className="bg-navy-800 p-4 rounded-lg border border-navy-700">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-white font-medium text-sm">Schedule Item {index + 1}</h4>
                    <button
                      type="button"
                      onClick={() => removeScheduleItem(index)}
                      className="text-red-400 hover:text-red-300 p-1"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-yellow-200 text-xs sm:text-sm mb-1">Time</label>
                      <input
                        type="text"
                        value={item.time}
                        onChange={(e) => updateScheduleItem(index, 'time', e.target.value)}
                        className="w-full px-3 py-2 bg-navy-700 border border-navy-600 rounded text-white text-sm focus:outline-none focus:ring-1 focus:ring-yellow-500"
                        placeholder="e.g., 9:00 AM"
                      />
                    </div>
                    
                    <div className="md:col-span-2">
                      <label className="block text-yellow-200 text-xs sm:text-sm mb-1">Activity</label>
                      <input
                        type="text"
                        value={item.activity}
                        onChange={(e) => updateScheduleItem(index, 'activity', e.target.value)}
                        className="w-full px-3 py-2 bg-navy-700 border border-navy-600 rounded text-white text-sm focus:outline-none focus:ring-1 focus:ring-yellow-500"
                        placeholder="e.g., Registration & Orientation"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Requirements Section */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <label className="block text-white font-medium">
                  <CheckCircle className="h-4 w-4 inline mr-2" />
                  Requirements
                </label>
                <button
                  type="button"
                  onClick={addRequirement}
                  className="px-4 py-2 bg-gradient-to-r from-yellow-600 to-yellow-500 hover:from-yellow-500 hover:to-yellow-400 text-white rounded-lg font-medium transition-all active:scale-95 flex items-center gap-2 shadow-md"
                >
                  <Plus className="h-4 w-4 flex-shrink-0" />
                  <span className="hidden sm:inline">Add Requirement</span>
                  <span className="sm:hidden">Add</span>
                </button>
              </div>
              
              {formData.requirements.length === 0 && (
                <div className="text-center py-6 text-yellow-400 bg-navy-800 rounded-lg border border-navy-700">
                  <AlertCircle className="h-10 w-10 mx-auto mb-2 text-yellow-500" />
                  <p className="text-sm">No requirements added yet</p>
                </div>
              )}

              {formData.requirements.map((req, index) => (
                <div key={index} className="flex items-center gap-3 bg-navy-800 p-3 rounded-lg border border-navy-700">
                  <input
                    type="text"
                    value={req}
                    onChange={(e) => updateRequirement(index, e.target.value)}
                    className="flex-1 px-3 py-2 bg-navy-700 border border-navy-600 rounded text-white text-sm focus:outline-none focus:ring-1 focus:ring-yellow-500"
                    placeholder="e.g., Must be able to lift up to 25 lbs"
                  />
                  <button
                    type="button"
                    onClick={() => removeRequirement(index)}
                    className="text-red-400 hover:text-red-300 p-2"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>

            {/* What to Bring Section */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <label className="block text-white font-medium">
                  <Package className="h-4 w-4 inline mr-2" />
                  What to Bring
                </label>
                <button
                  type="button"
                  onClick={addWhatToBring}
                  className="px-4 py-2 bg-gradient-to-r from-yellow-600 to-yellow-500 hover:from-yellow-500 hover:to-yellow-400 text-white rounded-lg font-medium transition-all active:scale-95 flex items-center gap-2 shadow-md"
                >
                  <Plus className="h-4 w-4 flex-shrink-0" />
                  <span>Add Item</span>
                </button>
              </div>
              
              {formData.what_to_bring.length === 0 && (
                <div className="text-center py-6 text-yellow-400 bg-navy-800 rounded-lg border border-navy-700">
                  <Package className="h-10 w-10 mx-auto mb-2 text-yellow-500" />
                  <p className="text-sm">No items added yet</p>
                </div>
              )}

              {formData.what_to_bring.map((item, index) => (
                <div key={index} className="flex items-center gap-3 bg-navy-800 p-3 rounded-lg border border-navy-700">
                  <input
                    type="text"
                    value={item}
                    onChange={(e) => updateWhatToBring(index, e.target.value)}
                    className="flex-1 px-3 py-2 bg-navy-700 border border-navy-600 rounded text-white text-sm focus:outline-none focus:ring-1 focus:ring-skyblue-500"
                    placeholder="e.g., Water bottle, Comfortable work clothes"
                  />
                  <button
                    type="button"
                    onClick={() => removeWhatToBring(index)}
                    className="text-red-400 hover:text-red-300 p-2"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>

            {/* Contact Information Section */}
            <div className="space-y-4">
              <label className="block text-white font-medium">
                <Users className="h-4 w-4 inline mr-2" />
                Contact Information
              </label>
              
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
                <div>
                  <label className="block text-yellow-200 text-xs sm:text-sm mb-1">Coordinator Name</label>
                  <input
                    type="text"
                    value={formData.contact_coordinator}
                    onChange={(e) => handleInputChange('contact_coordinator', e.target.value)}
                    className="w-full px-3 py-2 bg-navy-800 border border-navy-700 rounded text-white text-sm focus:outline-none focus:ring-1 focus:ring-yellow-500"
                    placeholder="Event Coordinator"
                  />
                </div>
                
                <div>
                  <label className="block text-yellow-200 text-xs sm:text-sm mb-1">Phone Number</label>
                  <input
                    type="tel"
                    value={formData.contact_phone}
                    onChange={(e) => handleInputChange('contact_phone', e.target.value)}
                    className="w-full px-3 py-2 bg-navy-800 border border-navy-700 rounded text-white text-sm focus:outline-none focus:ring-1 focus:ring-yellow-500"
                    placeholder="+63 XX XXX-XXXX"
                  />
                </div>
                
                <div>
                  <label className="block text-yellow-200 text-xs sm:text-sm mb-1">Email Address</label>
                  <input
                    type="email"
                    value={formData.contact_email}
                    onChange={(e) => handleInputChange('contact_email', e.target.value)}
                    className="w-full px-3 py-2 bg-navy-800 border border-navy-700 rounded text-white text-sm focus:outline-none focus:ring-1 focus:ring-yellow-500"
                    placeholder="events@example.com"
                  />
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-col sm:flex-row items-center justify-end gap-3 sm:gap-4 pt-6 border-t border-navy-700">
              <button
                type="button"
                onClick={onClose}
                className="w-full sm:w-auto btn border border-gray-600 text-gray-400 bg-navy-800 hover:bg-navy-700 py-3 sm:py-2 active:scale-95"
                disabled={loading}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="w-full sm:w-auto btn btn-primary hover:bg-yellow-600 flex items-center justify-center py-3 sm:py-2 active:scale-95"
                disabled={loading}
              >
                {loading ? (
                  <LoadingSpinner size="sm" className="mr-2" />
                ) : (
                  <Save className="h-4 w-4 mr-2 flex-shrink-0" />
                )}
                {loading ? 'Saving...' : (event ? 'Update Event' : 'Create Event')}
              </button>
            </div>
          </form>
          </div>
        </motion.div>
      </div>

      {/* Location Picker Modal */}
      <LocationPicker
        isOpen={isLocationPickerOpen}
        onClose={() => setIsLocationPickerOpen(false)}
        onLocationSelect={handleLocationSelect}
        initialLocation={selectedLocationData?.coordinates || null}
        title="Select Event Location"
      />
    </AnimatePresence>
  )
}

export default CreateEventModal 