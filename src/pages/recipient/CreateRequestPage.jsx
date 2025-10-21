import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useForm, useFieldArray } from 'react-hook-form'
import { 
  Heart, 
  Plus, 
  Minus, 
  Calendar, 
  MapPin, 
  AlertCircle,
  Save,
  X,
  Tag,
  FileText,
  Users,
  Clock,
  ArrowLeft,
  ArrowRight,
  CheckCircle,
  Truck
} from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import { useToast } from '../../contexts/ToastContext'
import { useNavigate, useLocation } from 'react-router-dom'
import { FormSkeleton } from '../../components/ui/Skeleton'
import LoadingSpinner from '../../components/ui/LoadingSpinner'
import { db } from '../../lib/supabase'
import LocationPicker from '../../components/ui/LocationPicker'

const CreateRequestPage = () => {
  const { user, profile } = useAuth()
  const { success, error } = useToast()
  const navigate = useNavigate()
  const location = useLocation()
  const [currentStep, setCurrentStep] = useState(1)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showLocationPicker, setShowLocationPicker] = useState(false)
  const [selectedLocation, setSelectedLocation] = useState(null)
  
  // Check if we're in edit mode
  const editMode = location.state?.editMode || false
  const requestData = location.state?.requestData || null

  const {
    register,
    handleSubmit,
    watch,
    control,
    reset,
    setValue,
    trigger,
    formState: { errors }
  } = useForm({
    defaultValues: {
      title: '',
      description: '',
      category: '',
      quantity_needed: 1,
      urgency: 'medium',
      location: profile?.address || '',
      needed_by: '',
      delivery_mode: 'pickup',
      tags: [{ value: '' }]
    }
  })
  
  // Load edit data if in edit mode
  useEffect(() => {
    if (editMode && requestData) {
      const formData = {
        title: requestData.title || '',
        category: requestData.category || '',
        quantity_needed: requestData.quantity_needed || 1,
        description: requestData.description || '',
        urgency: requestData.urgency || 'medium',
        needed_by: requestData.needed_by || '',
        location: requestData.location || '',
        delivery_mode: requestData.delivery_mode || 'pickup',
        tags: requestData.tags?.length > 0 
          ? requestData.tags.map(tag => ({ value: tag })) 
          : [{ value: '' }]
      }
      reset(formData)
    }
  }, [editMode, requestData, reset])

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'tags'
  })

  const watchedUrgency = watch('urgency')

  const categories = [
    'Food',
    'Clothing',
    'Medical Supplies',
    'Educational Materials',
    'Household Items',
    'Electronics',
    'Toys & Games',
    'Books',
    'Furniture',
    'Financial Assistance',
    'Transportation',
    'Other'
  ]

  const urgencyLevels = [
    { 
      value: 'low', 
      label: 'Low Priority', 
      description: 'Can wait for suitable donation',
      color: 'text-green-400'
    },
    { 
      value: 'medium', 
      label: 'Medium Priority', 
      description: 'Needed within a few weeks',
      color: 'text-yellow-400'
    },
    { 
      value: 'high', 
      label: 'High Priority', 
      description: 'Needed within a week',
      color: 'text-orange-400'
    },
    { 
      value: 'critical', 
      label: 'Critical', 
      description: 'Urgently needed within 1-2 days',
      color: 'text-red-400'
    }
  ]

  const onSubmit = async (data) => {
    if (!profile) {
      error('Please complete your profile first')
      return
    }

    try {
      setIsSubmitting(true)

      // Process tags
      const tags = data.tags
        .map(tag => tag.value?.trim())
        .filter(tag => tag && tag.length > 0)

      // Prepare request data
      const submitData = {
        title: data.title.trim(),
        description: data.description?.trim() || '',
        category: data.category,
        quantity_needed: parseInt(data.quantity_needed),
        urgency: data.urgency,
        location: data.location.trim(),
        needed_by: data.needed_by || null,
        delivery_mode: data.delivery_mode,
        tags: tags.length > 0 ? tags : null,
        requester_id: user.id
      }

      if (editMode && requestData) {
        await db.updateDonationRequest(requestData.id, submitData)
        success('Request updated successfully!')
      } else {
        await db.createDonationRequest(submitData)
        success('Request created successfully!')
      }
      
      navigate('/my-requests')
    } catch (err) {
      console.error(`Error ${editMode ? 'updating' : 'creating'} request:`, err)
      error(err.message || `Failed to ${editMode ? 'update' : 'create'} request. Please try again.`)
    } finally {
      setIsSubmitting(false)
    }
  }

  const getUrgencyInfo = (urgency) => {
    return urgencyLevels.find(level => level.value === urgency) || urgencyLevels[1]
  }

  const selectedUrgency = getUrgencyInfo(watchedUrgency)

  // Step definitions
  const steps = [
    { number: 1, title: 'Basic Information', icon: Heart },
    { number: 2, title: 'Priority & Timeline', icon: AlertCircle },
    { number: 3, title: 'Location & Tags', icon: Calendar }
  ]

  // Step navigation
  const nextStep = async () => {
    let fieldsToValidate = []
    
    if (currentStep === 1) {
      fieldsToValidate = ['title', 'category', 'quantity_needed']
    } else if (currentStep === 2) {
      fieldsToValidate = ['urgency']
    }
    
    const isValid = await trigger(fieldsToValidate)
    
    if (isValid && currentStep < 3) {
      setCurrentStep(currentStep + 1)
    }
  }

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1)
    }
  }

  if (!profile) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{backgroundColor: '#00237d'}}>
        <div className="text-center">
          <AlertCircle className="h-16 w-16 text-amber-400 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-white mb-2">Profile Required</h2>
          <p className="text-yellow-400 mb-4">Please complete your profile to create requests.</p>
          <button
            onClick={() => navigate('/profile')}
            className="btn btn-primary"
          >
            Complete Profile
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen py-8" style={{backgroundColor: '#00237d'}}>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8 text-center"
        >
          <div className="flex justify-center mb-4">
            <div className="w-20 h-20 bg-yellow-600 rounded-2xl flex items-center justify-center">
              <Heart className="h-10 w-10 text-white" />
            </div>
          </div>
          <h1 className="text-4xl font-bold text-white mb-3">
            {editMode ? 'Edit Request' : 'Create a Request'}
          </h1>
          <p className="text-yellow-300 text-lg">
            {editMode ? 'Update your request details' : 'Share your needs with generous donors'}
          </p>
        </motion.div>

        {/* Step Indicator */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mb-8"
        >
          <div className="flex items-center justify-center">
            {steps.map((step, index) => {
              const StepIcon = step.icon
              return (
                <div key={step.number} className="flex items-center">
                  <div
                    className={`flex items-center justify-center w-12 h-12 rounded-full border-2 transition-all ${
                      currentStep >= step.number
                        ? 'bg-yellow-600 border-yellow-600 text-white'
                        : 'bg-navy-800 border-navy-600 text-yellow-400'
                    }`}
                  >
                    <StepIcon className="h-6 w-6" />
                  </div>
                  {index < steps.length - 1 && (
                    <div
                      className={`w-16 h-1 mx-2 transition-all ${
                        currentStep > step.number ? 'bg-yellow-600' : 'bg-navy-700'
                      }`}
                    />
                  )}
                </div>
              )
            })}
          </div>
          <div className="flex justify-center mt-4">
            <span className="text-sm text-yellow-300">
              Step {currentStep} of {steps.length}: {steps[currentStep - 1].title}
            </span>
          </div>
        </motion.div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
          <AnimatePresence mode="wait">
            {/* Step 1: Basic Information */}
            {currentStep === 1 && (
            <motion.div
              key="step1"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="card p-6"
          >
            <h2 className="text-xl font-semibold text-white mb-6 flex items-center">
              <FileText className="h-5 w-5 text-yellow-400 mr-2" />
              Basic Information
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-white mb-2">
                  Request Title *
                </label>
                <input
                  {...register('title', {
                    required: 'Title is required',
                    minLength: { value: 5, message: 'Title must be at least 5 characters' },
                    maxLength: { value: 100, message: 'Title must be less than 100 characters' }
                  })}
                  className="input"
                  placeholder="e.g., Need warm clothes for family of 4"
                />
                {errors.title && (
                  <p className="mt-1 text-sm text-danger-600">{errors.title.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-white mb-2">
                  Category *
                </label>
                <select
                  {...register('category', { required: 'Category is required' })}
                  className="input"
                >
                  <option value="">Select category</option>
                  {categories.map(category => (
                    <option key={category} value={category}>{category}</option>
                  ))}
                </select>
                {errors.category && (
                  <p className="mt-1 text-sm text-danger-600">{errors.category.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-white mb-2">
                  Quantity Needed *
                </label>
                <input
                  {...register('quantity_needed', {
                    required: 'Quantity is required',
                    min: { value: 1, message: 'Quantity must be at least 1' },
                    max: { value: 1000, message: 'Quantity must be less than 1000' }
                  })}
                  type="number"
                  className="input"
                  placeholder="1"
                  min="1"
                  max="1000"
                />
                {errors.quantity_needed && (
                  <p className="mt-1 text-sm text-danger-600">{errors.quantity_needed.message}</p>
                )}
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-white mb-2">
                  Description
                </label>
                <textarea
                  {...register('description', {
                    maxLength: { value: 1000, message: 'Description must be less than 1000 characters' }
                  })}
                  rows="4"
                  className="input resize-none"
                  placeholder="Describe what you need and why. Include any specific requirements, sizes, or conditions."
                />
                {errors.description && (
                  <p className="mt-1 text-sm text-danger-600">{errors.description.message}</p>
                )}
              </div>
            </div>

            {/* Navigation Buttons */}
            <div className="flex justify-between mt-8">
              <button
                type="button"
                onClick={prevStep}
                disabled={currentStep === 1}
                className="btn btn-secondary flex items-center disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Previous
              </button>

              <button
                type="button"
                onClick={nextStep}
                className="btn btn-primary flex items-center"
              >
                Next
                <ArrowRight className="h-4 w-4 ml-2" />
              </button>
            </div>
          </motion.div>
          )}

          {/* Step 2: Priority and Timeline */}
          {currentStep === 2 && (
            <motion.div
              key="step2"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
              className="card p-6"
            >
              <h2 className="text-xl font-semibold text-white mb-6 flex items-center">
                <AlertCircle className="h-5 w-5 text-yellow-400 mr-2" />
                Priority & Timeline
              </h2>

              {/* Urgency Level Section */}
              <div className="mb-8">
                <label className="block text-sm font-semibold text-white mb-4">
                  Urgency Level *
                </label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {urgencyLevels.map((level) => (
                    <label 
                      key={level.value} 
                      className={`relative flex items-start p-4 border-2 rounded-lg cursor-pointer transition-all duration-200 ${
                        watch('urgency') === level.value
                          ? 'border-yellow-500 bg-yellow-900/20'
                          : 'border-navy-700 bg-navy-800/50 hover:border-navy-600'
                      }`}
                    >
                      <input
                        {...register('urgency', { required: 'Urgency level is required' })}
                        type="radio"
                        value={level.value}
                        className="h-5 w-5 text-yellow-600 focus:ring-yellow-500 border-navy-600 mt-0.5 flex-shrink-0"
                      />
                      <div className="ml-3 flex-1">
                        <div className={`text-base font-semibold mb-1 ${level.color}`}>
                          {level.label}
                        </div>
                        <div className="text-sm text-gray-300">
                          {level.description}
                        </div>
                      </div>
                      {watch('urgency') === level.value && (
                        <CheckCircle className="absolute top-3 right-3 h-5 w-5 text-yellow-500" />
                      )}
                    </label>
                  ))}
                </div>
                {errors.urgency && (
                  <p className="mt-2 text-sm text-red-400 flex items-center">
                    <AlertCircle className="h-4 w-4 mr-1" />
                    {errors.urgency.message}
                  </p>
                )}
              </div>

              {/* Deadline Section */}
              <div className="bg-navy-800/50 border border-navy-700 rounded-lg p-5">
                <div className="flex items-center mb-3">
                  <Calendar className="h-5 w-5 text-yellow-400 mr-2" />
                  <label className="text-sm font-semibold text-white">
                    Deadline (Optional)
                  </label>
                </div>
                <input
                  {...register('needed_by')}
                  type="date"
                  className="input w-full"
                  min={new Date().toISOString().split('T')[0]}
                />
                <p className="mt-2 text-xs text-yellow-300 flex items-center">
                  <Clock className="h-3 w-3 mr-1" />
                  Leave empty if there's no specific deadline
                </p>
              </div>

            {/* Navigation Buttons */}
            <div className="flex justify-between mt-8">
              <button
                type="button"
                onClick={prevStep}
                className="btn btn-secondary flex items-center"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Previous
              </button>

              <button
                type="button"
                onClick={nextStep}
                className="btn btn-primary flex items-center"
              >
                Next
                <ArrowRight className="h-4 w-4 ml-2" />
              </button>
            </div>
          </motion.div>
          )}

          {/* Step 3: Location and Tags */}
          {currentStep === 3 && (
            <motion.div
              key="step3"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
              className="card p-6"
            >
              <h2 className="text-xl font-semibold text-white mb-6 flex items-center">
                <Calendar className="h-5 w-5 text-yellow-400 mr-2" />
                Location & Delivery Details
              </h2>

              {/* Location Section */}
              <div className="bg-navy-800/50 border border-navy-700 rounded-lg p-5 mb-6">
                <div className="flex items-center mb-4">
                  <MapPin className="h-5 w-5 text-yellow-400 mr-2" />
                  <label className="text-sm font-semibold text-white">
                    Pickup/Delivery Location *
                  </label>
                </div>
                <div className="space-y-3">
                  <div className="flex gap-3">
                    <input
                      {...register('location', {
                        required: 'Location is required',
                        minLength: { value: 5, message: 'Location must be at least 5 characters' }
                      })}
                      className="input flex-1"
                      placeholder="Enter your complete address"
                      value={selectedLocation?.address || watch('location') || ''}
                      readOnly={selectedLocation !== null}
                    />
                    <button
                      type="button"
                      onClick={() => setShowLocationPicker(true)}
                      className="px-5 py-3 bg-yellow-600 hover:bg-yellow-700 text-white rounded-lg transition-colors flex items-center gap-2 font-medium whitespace-nowrap"
                    >
                      <MapPin className="w-4 h-4" />
                      <span>Select on Map</span>
                    </button>
                  </div>
                  {selectedLocation && (
                    <div className="bg-green-900/20 border border-green-500/30 p-3 rounded-lg">
                      <p className="text-sm text-green-400 flex items-center">
                        <CheckCircle className="w-4 h-4 mr-2" />
                        Location confirmed on map
                      </p>
                    </div>
                  )}
                  {errors.location && (
                    <p className="text-sm text-red-400 flex items-center">
                      <AlertCircle className="h-4 w-4 mr-1" />
                      {errors.location.message}
                    </p>
                  )}
                  <p className="text-xs text-yellow-300 flex items-center">
                    <AlertCircle className="h-3 w-3 mr-1" />
                    This helps donors and volunteers coordinate delivery
                  </p>
                </div>
              </div>

              {/* Delivery Mode Section */}
              <div className="bg-navy-800/50 border border-navy-700 rounded-lg p-5 mb-6">
                <div className="flex items-center mb-4">
                  <Truck className="h-5 w-5 text-yellow-400 mr-2" />
                  <label className="text-sm font-semibold text-white">
                    Preferred Delivery Mode *
                  </label>
                </div>
                <select
                  {...register('delivery_mode', {
                    required: 'Delivery mode is required'
                  })}
                  className="input w-full text-base"
                >
                  <option value="">Select how you'd like to receive donations</option>
                  <option value="pickup">🚶 Self Pickup - I will collect the items</option>
                  <option value="volunteer">🚚 Volunteer Delivery - Request volunteer assistance</option>
                  <option value="direct">📦 Direct Delivery - Donor will deliver directly</option>
                </select>
                {errors.delivery_mode && (
                  <p className="mt-2 text-sm text-red-400 flex items-center">
                    <AlertCircle className="h-4 w-4 mr-1" />
                    {errors.delivery_mode.message}
                  </p>
                )}
                <p className="mt-2 text-xs text-yellow-300 flex items-center">
                  <AlertCircle className="h-3 w-3 mr-1" />
                  Choose the most convenient option for you
                </p>
              </div>

              {/* Tags Section */}
              <div className="bg-navy-800/50 border border-navy-700 rounded-lg p-5">
                <div className="flex items-center mb-4">
                  <Tag className="h-5 w-5 text-yellow-400 mr-2" />
                  <label className="text-sm font-semibold text-white">
                    Tags (Optional)
                  </label>
                </div>
                <p className="text-xs text-yellow-300 mb-4 flex items-center">
                  <AlertCircle className="h-3 w-3 mr-1" />
                  Add keywords to help donors find your request (e.g., urgent, children, winter)
                </p>
                
                <div className="space-y-3">
                  {fields.map((field, index) => (
                    <div key={field.id} className="flex items-center gap-2">
                      <div className="flex-1">
                        <input
                          {...register(`tags.${index}.value`)}
                          className="input w-full"
                          placeholder={`Tag ${index + 1} (e.g., urgent, children, winter)`}
                        />
                      </div>
                      {index > 0 && (
                        <button
                          type="button"
                          onClick={() => remove(index)}
                          className="p-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors flex-shrink-0"
                        >
                          <Minus className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  ))}
                  
                  {fields.length < 5 && (
                    <button
                      type="button"
                      onClick={() => append({ value: '' })}
                      className="w-full py-2 bg-navy-700 hover:bg-navy-600 text-yellow-300 rounded-lg transition-colors flex items-center justify-center gap-2 font-medium border border-navy-600"
                    >
                      <Plus className="h-4 w-4" />
                      Add Another Tag
                    </button>
                  )}
                </div>
              </div>

            {/* Navigation Buttons */}
            <div className="flex justify-between mt-8">
              <button
                type="button"
                onClick={prevStep}
                className="btn btn-secondary flex items-center"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Previous
              </button>

              <button
                type="submit"
                disabled={isSubmitting}
                className="btn btn-primary flex items-center"
              >
                {isSubmitting ? (
                  <LoadingSpinner size="sm" />
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    {editMode ? 'Update Request' : 'Create Request'}
                  </>
                )}
              </button>
            </div>
          </motion.div>
          )}
          </AnimatePresence>
        </form>

        {/* Location Picker Modal */}
        <LocationPicker
          isOpen={showLocationPicker}
          onClose={() => setShowLocationPicker(false)}
          onLocationSelect={(location) => {
            setSelectedLocation(location)
            setValue('location', location.address)
            setShowLocationPicker(false)
          }}
          initialLocation={selectedLocation}
          title="Select Delivery Location"
        />
      </div>
    </div>
  )
}

export default CreateRequestPage 