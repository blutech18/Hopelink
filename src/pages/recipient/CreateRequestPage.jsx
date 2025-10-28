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
  const formTopRef = React.useRef(null)
  
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
      // Scroll to top of form smoothly
      formTopRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1)
      // Scroll to top of form smoothly
      formTopRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
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
    <div className="min-h-screen py-4 sm:py-6 lg:py-8" style={{backgroundColor: '#00237d'}}>
      <div className="max-w-4xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8">
        {/* Header */}
        <motion.div
          ref={formTopRef}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-6 sm:mb-8"
        >
          <Heart className="h-12 w-12 sm:h-14 sm:w-14 lg:h-16 lg:w-16 text-yellow-500 mx-auto mb-3 sm:mb-4" />
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white mb-2">
            {editMode ? 'Edit Request' : 'Create a Request'}
          </h1>
          <p className="text-sm sm:text-base text-yellow-300">
            {editMode ? 'Update your request details' : 'Share your needs with generous donors'}
          </p>
        </motion.div>

        {/* Progress Steps */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mb-6 sm:mb-8"
        >
          <div className="flex items-center justify-center space-x-2 sm:space-x-4">
            {steps.map((step, index) => {
              const StepIcon = step.icon
              return (
                <div key={step.number} className="flex items-center">
                  <motion.div
                    animate={{
                      scale: currentStep === step.number ? 1.1 : 1,
                      boxShadow: currentStep === step.number ? '0 0 20px rgba(251, 191, 36, 0.5)' : 'none'
                    }}
                    transition={{ duration: 0.3 }}
                    className={`flex items-center justify-center w-10 h-10 sm:w-12 sm:h-12 lg:w-14 lg:h-14 rounded-full border-2 transition-all ${
                      currentStep >= step.number
                        ? 'bg-gradient-to-br from-yellow-500 to-yellow-600 border-yellow-400 text-white shadow-lg'
                        : 'bg-navy-800 border-navy-600 text-yellow-400'
                    }`}
                  >
                    <StepIcon className="h-4 w-4 sm:h-5 sm:w-5 lg:h-6 lg:w-6" />
                  </motion.div>
                  {index < steps.length - 1 && (
                    <div
                      className={`w-8 sm:w-12 lg:w-16 h-1 mx-1 sm:mx-2 transition-all duration-500 ${
                        currentStep > step.number ? 'bg-gradient-to-r from-yellow-500 to-yellow-600' : 'bg-navy-700'
                      }`}
                    />
                  )}
                </div>
              )
            })}
          </div>
          <div className="flex justify-center mt-4 sm:mt-6">
            <div className="bg-navy-800 px-3 sm:px-4 lg:px-6 py-1.5 sm:py-2 rounded-full border border-yellow-500/30">
              <span className="text-xs sm:text-sm font-medium text-yellow-300">
                Step {currentStep} of {steps.length}: <span className="text-white hidden sm:inline">{steps[currentStep - 1].title}</span>
              </span>
            </div>
          </div>
        </motion.div>

        {/* Form */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="card p-4 sm:p-6 lg:p-8 border-2 border-yellow-500/20 shadow-2xl"
          style={{backgroundColor: '#001a5c'}}
        >
          <form onSubmit={handleSubmit(onSubmit)}>
            <AnimatePresence mode="wait">
              {/* Step 1: Basic Information */}
              {currentStep === 1 && (
                <motion.div
                  key="step1"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.3 }}
                  className="space-y-6"
                >
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
                        className="input h-32 resize-none"
                        placeholder="Describe what you need and why. Include any specific requirements, sizes, or conditions."
                      />
                      {errors.description && (
                        <p className="mt-1 text-sm text-danger-600">{errors.description.message}</p>
                      )}
                      <div className="mt-1 text-xs text-yellow-400 text-right">
                        {watch('description')?.length || 0}/1000 characters
                      </div>
                    </div>
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
                  className="space-y-6"
                >
                  {/* Urgency Level Section */}
                  <div>
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
                  <div>
                    <label className="block text-sm font-medium text-white mb-2">
                      Deadline (Optional)
                    </label>
                    <input
                      {...register('needed_by')}
                      type="date"
                      className="input"
                      min={new Date().toISOString().split('T')[0]}
                    />
                    <p className="mt-1 text-xs text-yellow-400">
                      Leave empty if there's no specific deadline
                    </p>
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
                  className="space-y-6"
                >
                  {/* Location Section */}
                  <div>
                    <label className="block text-sm font-medium text-white mb-2">
                      Pickup/Delivery Location *
                    </label>
                    <div className="space-y-2">
                      <div className="flex space-x-2">
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
                          className="px-4 py-2 bg-yellow-600 hover:bg-yellow-700 text-white rounded-lg transition-colors flex items-center space-x-2"
                        >
                          <MapPin className="w-4 h-4" />
                          <span>Map</span>
                        </button>
                      </div>
                      {selectedLocation && (
                        <div className="bg-green-900/20 border border-green-500/20 p-2 rounded-lg">
                          <p className="text-xs text-green-400 flex items-center">
                            <CheckCircle className="w-3 h-3 mr-1" />
                            Location set on map
                          </p>
                        </div>
                      )}
                      {errors.location && (
                        <p className="mt-1 text-sm text-danger-600">{errors.location.message}</p>
                      )}
                    </div>
                  </div>

                  {/* Delivery Mode Section */}
                  <div>
                    <label className="block text-sm font-medium text-white mb-2">
                      Preferred Delivery Mode *
                    </label>
                    <select
                      {...register('delivery_mode', {
                        required: 'Delivery mode is required'
                      })}
                      className="input"
                    >
                      <option value="">Select how you'd like to receive donations</option>
                      <option value="pickup">Self Pickup - I will collect the items</option>
                      <option value="volunteer">Volunteer Delivery - Request volunteer assistance</option>
                      <option value="direct">Direct Delivery - Donor will deliver directly</option>
                    </select>
                    {errors.delivery_mode && (
                      <p className="mt-1 text-sm text-danger-600">{errors.delivery_mode.message}</p>
                    )}
                    <p className="mt-1 text-xs text-yellow-400">
                      Choose the most convenient option for you
                    </p>
                  </div>

                  {/* Tags Section */}
                  <div>
                    <label className="block text-sm font-medium text-white mb-2">
                      Tags (optional)
                    </label>
                    <div className="space-y-3">
                      {fields.map((field, index) => (
                        <div key={field.id} className="flex items-center gap-2">
                          <div className="flex-1">
                            <input
                              {...register(`tags.${index}.value`)}
                              className="input"
                              placeholder={`Tag ${index + 1} (e.g., urgent, children, winter)`}
                            />
                          </div>
                          {index > 0 && (
                            <button
                              type="button"
                              onClick={() => remove(index)}
                              className="p-2 bg-danger-600 hover:bg-danger-700 text-white rounded-lg transition-colors flex-shrink-0"
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
                    <p className="mt-1 text-xs text-yellow-400">
                      Add keywords to help donors find your request
                    </p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Navigation Buttons */}
            <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-3 mt-6 sm:mt-8 lg:mt-10 pt-4 sm:pt-6 border-t-2 border-navy-700">
              <button
                type="button"
                onClick={prevStep}
                disabled={currentStep === 1}
                className="w-full sm:w-auto px-4 sm:px-6 py-2.5 sm:py-3 bg-navy-700 hover:bg-navy-600 text-white rounded-lg text-sm sm:text-base font-medium transition-all flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-navy-700 shadow-lg hover:shadow-xl order-2 sm:order-1"
              >
                <ArrowLeft className="h-4 w-4 sm:h-5 sm:w-5" />
                <span>Previous</span>
              </button>

              {currentStep < 3 ? (
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault()
                    nextStep()
                  }}
                  className="w-full sm:w-auto px-6 sm:px-8 py-2.5 sm:py-3 bg-gradient-to-r from-yellow-500 to-yellow-600 hover:from-yellow-600 hover:to-yellow-700 text-white rounded-lg text-sm sm:text-base font-semibold transition-all flex items-center justify-center space-x-2 shadow-lg hover:shadow-xl hover:scale-105 transform active:scale-95 order-1 sm:order-2"
                >
                  <span>Next Step</span>
                  <ArrowRight className="h-4 w-4 sm:h-5 sm:w-5" />
                </button>
              ) : (
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full sm:w-auto px-6 sm:px-8 py-3 sm:py-3.5 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white rounded-lg text-sm sm:text-base font-bold transition-all flex items-center justify-center space-x-2 shadow-lg hover:shadow-xl hover:scale-105 transform active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 order-1 sm:order-2"
                >
                  {isSubmitting ? (
                    <>
                      <LoadingSpinner size="sm" />
                      <span>{editMode ? 'Updating...' : 'Creating...'}</span>
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4 sm:h-5 sm:w-5" />
                      <span>{editMode ? 'Update Request' : 'Create Request'}</span>
                    </>
                  )}
                </button>
              )}
            </div>
          </form>
        </motion.div>

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