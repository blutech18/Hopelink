import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useForm } from 'react-hook-form'
import { useNavigate } from 'react-router-dom'
import { 
  Gift, 
  Package, 
  MapPin, 
  Calendar, 
  Clock, 
  Image as ImageIcon,
  DollarSign,
  AlertCircle,
  CheckCircle,
  ArrowLeft,
  ArrowRight,
  Tag,
  Users,
  Truck,
  Upload,
  X,
  Plus
} from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import { useToast } from '../../contexts/ToastContext'
import { db } from '../../lib/supabase'
import { FormSkeleton } from '../../components/ui/Skeleton'
import LoadingSpinner from '../../components/ui/LoadingSpinner'
import LocationPicker from '../../components/ui/LocationPicker'

const PostDonationPage = () => {
  const { user, profile } = useAuth()
  const { success, error } = useToast()
  const navigate = useNavigate()
  const [currentStep, setCurrentStep] = useState(1)
  const [isLoading, setIsLoading] = useState(false)
  const [uploadedImages, setUploadedImages] = useState([])
  const [imageFiles, setImageFiles] = useState([])
  const [showLocationPicker, setShowLocationPicker] = useState(false)
  const [selectedLocation, setSelectedLocation] = useState(null)

  const {
    register,
    handleSubmit,
    watch,
    trigger,
    setValue,
    formState: { errors }
  } = useForm({
    defaultValues: {
      pickup_location: profile?.address || '',
      condition: 'good',
      status: 'available',
      is_urgent: false,
      quantity: 1
    }
  })

  const watchedCategory = watch('category')
  const watchedCondition = watch('condition')
  const watchedIsUrgent = watch('is_urgent')

  const categories = [
    'Food & Beverages',
    'Clothing & Accessories',
    'Medical Supplies',
    'Educational Materials',
    'Household Items',
    'Electronics & Technology',
    'Toys & Recreation',
    'Personal Care Items',
    'Emergency Supplies',
    'Other'
  ]

  const conditions = [
    { value: 'new', label: 'New', description: 'Unused, in original packaging' },
    { value: 'like_new', label: 'Like New', description: 'Excellent condition, barely used' },
    { value: 'good', label: 'Good', description: 'Minor signs of use, fully functional' },
    { value: 'fair', label: 'Fair', description: 'Shows wear but still usable' }
  ]

  const steps = [
    { number: 1, title: 'Basic Information', icon: Package },
    { number: 2, title: 'Details & Location', icon: MapPin },
    { number: 3, title: 'Availability & Review', icon: Calendar }
  ]

  const nextStep = async () => {
    let fieldsToValidate = []
    
    if (currentStep === 1) {
      fieldsToValidate = ['title', 'description', 'category', 'quantity']
    } else if (currentStep === 2) {
      fieldsToValidate = ['condition', 'pickup_location']
    }

    console.log('Current step:', currentStep, 'Fields to validate:', fieldsToValidate)
    
    const isValid = await trigger(fieldsToValidate)
    console.log('Validation result:', isValid)
    
    if (isValid && currentStep < 3) {
      console.log('Moving to step:', currentStep + 1)
      setCurrentStep(currentStep + 1)
    } else if (!isValid) {
      console.log('Validation failed, staying on current step')
    }
  }

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1)
    }
  }

  const handleImageUpload = (event) => {
    const files = Array.from(event.target.files)
    const maxFiles = 5 - uploadedImages.length
    
    if (files.length > maxFiles) {
      error(`You can only upload ${maxFiles} more image(s)`)
      return
    }

    files.forEach(file => {
      if (file.size > 5 * 1024 * 1024) { // 5MB limit
        error('Each image must be less than 5MB')
        return
      }

      const reader = new FileReader()
      reader.onload = (e) => {
        const newImage = {
          id: Date.now() + Math.random(),
          file: file,
          preview: e.target.result,
          name: file.name
        }
        setUploadedImages(prev => [...prev, newImage])
        setImageFiles(prev => [...prev, file])
      }
      reader.readAsDataURL(file)
    })
  }

  const removeImage = (imageId) => {
    setUploadedImages(prev => prev.filter(img => img.id !== imageId))
    setImageFiles(prev => {
      const imageToRemove = uploadedImages.find(img => img.id === imageId)
      return prev.filter(file => file !== imageToRemove?.file)
    })
  }

  const onSubmit = async (data) => {
    setIsLoading(true)
    try {
      const donationData = {
        ...data,
        donor_id: user.id,
        quantity: parseInt(data.quantity),
        expiry_date: data.expiry_date || null,
        tags: data.tags ? data.tags.split(',').map(tag => tag.trim()).filter(tag => tag) : [],
        image_url: uploadedImages.length > 0 ? uploadedImages[0].preview : null, // Save first image as base64
        created_at: new Date().toISOString()
      }

      const newDonation = await db.createDonation(donationData)
      success('Donation posted successfully!')
      navigate('/my-donations')
    } catch (err) {
      console.error('Error creating donation:', err)
      error(err.message || 'Failed to post donation. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  if (!user || !profile) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{backgroundColor: '#00237d'}}>
        <LoadingSpinner size="lg" />
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
          className="text-center mb-8"
        >
          <Gift className="h-16 w-16 text-yellow-500 mx-auto mb-4" />
          <h1 className="text-3xl font-bold text-white mb-2">Post a Donation</h1>
          <p className="text-yellow-300">Share your generosity with those in need</p>
        </motion.div>

        {/* Progress Steps */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mb-8"
        >
          <div className="flex items-center justify-center space-x-4">
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
                    <StepIcon className="h-5 w-5" />
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

        {/* Form */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="card p-8 border border-gray-600"
          style={{backgroundColor: '#001a5c'}}
        >
          <form onSubmit={(e) => {
            if (currentStep !== 3) {
              e.preventDefault()
              return
            }
            handleSubmit(onSubmit)(e)
          }}>
            <AnimatePresence mode="wait">
              {/* Step 1: Basic Information */}
              {currentStep === 1 && (
                <motion.div
                  key="step1"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-6"
                >
                  <div>
                    <label className="block text-sm font-medium text-white mb-2">
                      Donation Title *
                    </label>
                    <input
                      {...register('title', {
                        required: 'Title is required',
                        minLength: { value: 5, message: 'Title must be at least 5 characters' },
                        maxLength: { value: 100, message: 'Title must be less than 100 characters' }
                      })}
                      className="input"
                      placeholder="e.g., Winter Clothes for Children"
                    />
                    {errors.title && (
                      <p className="mt-1 text-sm text-danger-600">{errors.title.message}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-white mb-2">
                      Description
                    </label>
                    <textarea
                      {...register('description', {
                        maxLength: { value: 1000, message: 'Description must be less than 1000 characters' }
                      })}
                      className="input h-32 resize-none"
                      placeholder="Describe what you're donating, its condition, and any special instructions..."
                    />
                    {errors.description && (
                      <p className="mt-1 text-sm text-danger-600">{errors.description.message}</p>
                    )}
                    <div className="mt-1 text-xs text-yellow-400 text-right">
                      {watch('description')?.length || 0}/1000 characters
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-white mb-2">
                        Category *
                      </label>
                      <select
                        {...register('category', {
                          required: 'Category is required'
                        })}
                        className="input"
                      >
                        <option value="">Select a category</option>
                        {categories.map((category) => (
                          <option key={category} value={category}>
                            {category}
                          </option>
                        ))}
                      </select>
                      {errors.category && (
                        <p className="mt-1 text-sm text-danger-600">{errors.category.message}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-white mb-2">
                        Quantity *
                      </label>
                      <input
                        {...register('quantity', {
                          required: 'Quantity is required',
                          min: { value: 1, message: 'Quantity must be at least 1' },
                          max: { value: 1000, message: 'Quantity must be less than 1000' }
                        })}
                        type="number"
                        className="input"
                        placeholder="1"
                        min="1"
                      />
                      {errors.quantity && (
                        <p className="mt-1 text-sm text-danger-600">{errors.quantity.message}</p>
                      )}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-white mb-2">
                      Tags (optional)
                    </label>
                    <input
                      {...register('tags')}
                      className="input"
                      placeholder="urgent, winter, children (separate with commas)"
                    />
                    <p className="mt-1 text-xs text-yellow-400">
                      Add tags to help recipients find your donation more easily
                    </p>
                  </div>
                </motion.div>
              )}

              {/* Step 2: Details & Location */}
              {currentStep === 2 && (
                <motion.div
                  key="step2"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-6"
                >
                  <div>
                    <label className="block text-sm font-medium text-white mb-3">
                      Condition *
                    </label>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {conditions.map((condition) => (
                        <label
                          key={condition.value}
                          className={`cursor-pointer p-4 rounded-lg border transition-all ${
                            watchedCondition === condition.value
                              ? 'border-yellow-500 bg-yellow-900/20'
                              : 'border-navy-700 bg-navy-800 hover:border-navy-600'
                          }`}
                        >
                          <input
                            {...register('condition', {
                              required: 'Condition is required'
                            })}
                            type="radio"
                            value={condition.value}
                            className="sr-only"
                          />
                          <div>
                            <h3 className="font-medium text-white">{condition.label}</h3>
                            <p className="text-sm text-yellow-300 mt-1">{condition.description}</p>
                          </div>
                        </label>
                      ))}
                    </div>
                    {errors.condition && (
                      <p className="mt-1 text-sm text-danger-600">{errors.condition.message}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-white mb-2">
                      Pickup Location *
                    </label>
                    <div className="space-y-2">
                      <div className="flex space-x-2">
                        <input
                          {...register('pickup_location', {
                            required: 'Pickup location is required'
                          })}
                          className="input flex-1"
                          placeholder="Enter pickup address or location"
                          value={selectedLocation?.address || watch('pickup_location') || ''}
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
                      {errors.pickup_location && (
                        <p className="mt-1 text-sm text-danger-600">{errors.pickup_location.message}</p>
                      )}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-white mb-2">
                      Mode of Delivery *
                    </label>
                    <select
                      {...register('delivery_mode', {
                        required: 'Delivery mode is required'
                      })}
                      className="input"
                    >
                      <option value="">Select delivery mode</option>
                      <option value="pickup">Self Pickup</option>
                      <option value="volunteer">Volunteer Delivery</option>
                      <option value="direct">Direct Delivery (by donor)</option>
                    </select>
                    {errors.delivery_mode && (
                      <p className="mt-1 text-sm text-danger-600">{errors.delivery_mode.message}</p>
                    )}
                    <p className="mt-1 text-xs text-yellow-400">
                      Choose how recipients can receive this donation
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-white mb-2">
                      Pickup Instructions (optional)
                    </label>
                    <textarea
                      {...register('pickup_instructions')}
                      className="input h-24 resize-none"
                      placeholder="Special instructions for pickup (e.g., gate code, best time to contact, etc.)"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-white mb-2">
                      Expiry Date (if applicable)
                    </label>
                    <input
                      {...register('expiry_date')}
                      type="date"
                      className="input"
                      min={new Date().toISOString().split('T')[0]}
                    />
                  </div>
                </motion.div>
              )}

              {/* Step 3: Availability & Review */}
              {currentStep === 3 && (
                <motion.div
                  key="step3"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-6"
                >
                  <div>
                    <label className="flex items-start">
                      <input
                        {...register('is_urgent')}
                        type="checkbox"
                        className="h-4 w-4 text-yellow-600 focus:ring-yellow-500 border-navy-600 rounded bg-navy-800 mt-1"
                      />
                      <div className="ml-3">
                        <span className="text-sm font-medium text-white">Mark as urgent</span>
                        <p className="text-xs text-yellow-400">
                          This donation needs to be claimed quickly (e.g., perishable items)
                        </p>
                      </div>
                    </label>
                  </div>

                  {/* Image Upload Section */}
                  <div>
                    <label className="block text-sm font-medium text-white mb-3">
                      Donation Photos
                    </label>
                    <p className="text-xs text-yellow-400 mb-4">
                      Upload photos of your donation to help recipients see what you're offering. (Max 5 images, 5MB each)
                    </p>
                    
                    <div className="space-y-4">
                      {/* Upload Area */}
                      <div className="relative">
                        <input
                          type="file"
                          multiple
                          accept="image/*"
                          onChange={handleImageUpload}
                          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                          disabled={uploadedImages.length >= 5}
                        />
                        <div className={`border-2 border-dashed rounded-lg p-6 text-center transition-all ${
                          uploadedImages.length >= 5 
                            ? 'border-navy-700 bg-navy-800/50 cursor-not-allowed' 
                            : 'border-navy-600 bg-navy-800 hover:border-yellow-500 hover:bg-navy-700 cursor-pointer'
                        }`}>
                          <Upload className={`h-8 w-8 mx-auto mb-2 ${
                            uploadedImages.length >= 5 ? 'text-gray-500' : 'text-yellow-400'
                          }`} />
                          <p className={`text-sm ${
                            uploadedImages.length >= 5 ? 'text-gray-500' : 'text-white'
                          }`}>
                            {uploadedImages.length >= 5 
                              ? 'Maximum 5 images reached' 
                              : 'Click to upload images or drag and drop'}
                          </p>
                          <p className={`text-xs mt-1 ${
                            uploadedImages.length >= 5 ? 'text-gray-500' : 'text-yellow-400'
                          }`}>
                            PNG, JPG, JPEG up to 5MB each
                          </p>
                        </div>
                      </div>

                      {/* Image Preview Grid */}
                      {uploadedImages.length > 0 && (
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                          {uploadedImages.map((image) => (
                            <div key={image.id} className="relative group">
                              <div className="aspect-square rounded-lg overflow-hidden bg-navy-800">
                                <img
                                  src={image.preview}
                                  alt={image.name}
                                  className="w-full h-full object-cover"
                                />
                              </div>
                              <button
                                type="button"
                                onClick={() => removeImage(image.id)}
                                className="absolute -top-2 -right-2 bg-danger-600 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-danger-700"
                              >
                                <X className="h-3 w-3" />
                              </button>
                              <p className="text-xs text-yellow-400 mt-1 truncate" title={image.name}>
                                {image.name}
                              </p>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Review Section */}
                  <div className="border-t border-navy-700 pt-6">
                    <h3 className="text-lg font-semibold text-white mb-4">Review Your Donation</h3>
                    
                    <div className="bg-navy-800 rounded-lg p-6 space-y-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h4 className="font-medium text-white">{watch('title') || 'Donation Title'}</h4>
                          <p className="text-sm text-yellow-300 mt-1">
                            {watch('category') || 'Category'} • Quantity: {watch('quantity') || 1}
                          </p>
                          {watchedIsUrgent && (
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-danger-900/20 text-danger-300 mt-2">
                              <AlertCircle className="h-3 w-3 mr-1" />
                              Urgent
                            </span>
                          )}
                        </div>
                        <div className="text-right">
                          <div className={`inline-flex items-center px-2 py-1 rounded-full text-xs ${
                            watchedCondition === 'new' ? 'bg-success-900/20 text-success-300' :
                            watchedCondition === 'like_new' ? 'bg-yellow-900/20 text-yellow-300' :
                            watchedCondition === 'good' ? 'bg-amber-900/20 text-amber-300' :
                            'bg-orange-900/20 text-orange-300'
                          }`}>
                            {watchedCondition && conditions.find(c => c.value === watchedCondition)?.label}
                          </div>
                        </div>
                      </div>
                      
                      <div className="text-sm text-yellow-200">
                        <p className="mb-2">{watch('description') || 'Description will appear here...'}</p>
                        <div className="flex items-center text-yellow-400 mb-2">
                          <MapPin className="h-4 w-4 mr-1" />
                          {watch('pickup_location') || 'Pickup location'}
                        </div>
                        {uploadedImages.length > 0 && (
                          <div className="flex items-center text-yellow-400">
                            <ImageIcon className="h-4 w-4 mr-1" />
                            {uploadedImages.length} photo(s) uploaded
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

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

              {currentStep < 3 ? (
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault()
                    nextStep()
                  }}
                  className="btn btn-primary flex items-center"
                >
                  Next
                  <ArrowRight className="h-4 w-4 ml-2" />
                </button>
              ) : (
                <button
                  type="submit"
                  disabled={isLoading}
                  className="btn btn-primary flex items-center"
                >
                  {isLoading ? (
                    <LoadingSpinner size="sm" />
                  ) : (
                    <>
                      <Gift className="h-4 w-4 mr-2" />
                      Post Donation
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
            setValue('pickup_location', location.address)
            setShowLocationPicker(false)
          }}
          initialLocation={selectedLocation}
          title="Select Pickup Location"
        />
      </div>
    </div>
  )
}

export default PostDonationPage 