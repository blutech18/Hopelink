import React, { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useForm } from 'react-hook-form'
import { useNavigate, useLocation, Link } from 'react-router-dom'
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
  const location = useLocation()
  const [currentStep, setCurrentStep] = useState(1)
  const [isLoading, setIsLoading] = useState(false)
  const [uploadedImages, setUploadedImages] = useState([])
  const [imageFiles, setImageFiles] = useState([])
  const [showLocationPicker, setShowLocationPicker] = useState(false)
  const [selectedLocation, setSelectedLocation] = useState(null)
  const [donationDestination, setDonationDestination] = useState('recipients') // 'organization' or 'recipients'
  const formTopRef = useRef(null)

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

  // Apply prefill if coming from a request
  useEffect(() => {
    const prefill = location.state?.prefill
    if (prefill) {
      if (prefill.title) setValue('title', prefill.title)
      if (prefill.description) setValue('description', prefill.description)
      if (prefill.category) setValue('category', prefill.category)
      if (prefill.quantity) setValue('quantity', prefill.quantity)
      // Default to recipients flow when fulfilling a request
      setDonationDestination('recipients')
    }
  }, [location.state, setValue])

  const watchedCategory = watch('category')
  const watchedCondition = watch('condition')
  const watchedIsUrgent = watch('is_urgent')
  const watchedDeliveryMode = watch('delivery_mode')

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
      fieldsToValidate = ['condition', 'pickup_location', 'delivery_mode']
    }

    console.log('Current step:', currentStep, 'Fields to validate:', fieldsToValidate)
    
    const isValid = await trigger(fieldsToValidate)
    console.log('Validation result:', isValid)
    
    if (isValid && currentStep < 3) {
      console.log('Moving to step:', currentStep + 1)
      setCurrentStep(currentStep + 1)
      // Scroll to top of form smoothly
      formTopRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    } else if (!isValid) {
      console.log('Validation failed, staying on current step')
    }
  }

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1)
      // Scroll to top of form smoothly
      formTopRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
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
        images: uploadedImages.length > 0 ? uploadedImages.map(img => img.preview) : [], // Save all images as base64 array
        donation_destination: donationDestination, // Add donation destination
        delivery_mode: data.delivery_mode, // Always include delivery mode
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
    <div className="min-h-screen py-2 sm:py-3" style={{backgroundColor: '#00237d'}}>
      <div className="w-full sm:w-[90%] max-w-7xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8">
        {/* Header - Removed title, subtitle, and logo */}
        {location.state?.fromRequestId && (
          <motion.div
            ref={formTopRef}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-3 sm:mb-4"
          >
            <div className="mt-2 bg-yellow-900/20 border border-yellow-500/30 rounded-lg px-3 py-2 inline-block text-left">
              <p className="text-[10px] sm:text-xs text-yellow-300">
                You are fulfilling a recipient's request. You can adjust the details if needed.
              </p>
              <div className="text-[10px] sm:text-xs text-yellow-400 mt-0.5">
                <Link to="/browse-requests" className="underline hover:text-yellow-300">Back to Browse Requests</Link>
              </div>
            </div>
          </motion.div>
        )}

        {/* Progress Steps */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mb-3 sm:mb-4"
        >
          <div className="card p-2 sm:p-3 md:p-4 lg:p-5 border-2 border-yellow-500/20 shadow-2xl overflow-visible" style={{backgroundColor: '#001a5c'}}>
            <div className="w-full flex justify-center overflow-x-auto overflow-y-visible -mx-1 sm:mx-0">
              <div className="flex items-center justify-center w-full min-w-fit py-2 px-1 sm:px-0">
                {steps.map((step, index) => {
                  const StepIcon = step.icon
                  const isActive = currentStep === step.number
                  const isCompleted = currentStep > step.number
                  // Shortened titles for very small screens
                  const shortTitle = step.title === 'Basic Information' ? 'Basic Info' : 
                                    step.title === 'Details & Location' ? 'Details' : 
                                    step.title === 'Availability & Review' ? 'Review' : step.title
                  return (
                    <React.Fragment key={step.number}>
                      <div className="flex flex-col items-center flex-shrink-0 py-2 min-w-[55px] sm:min-w-[70px] md:min-w-0">
                        <motion.div
                          animate={{
                            scale: isActive ? 1.1 : 1
                          }}
                          transition={{ duration: 0.3 }}
                          style={{
                            boxShadow: isActive ? '0 0 20px rgba(251, 191, 36, 0.5)' : 'none'
                          }}
                          className={`flex items-center justify-center w-7 h-7 sm:w-8 sm:h-8 md:w-9 md:h-9 lg:w-10 lg:h-10 rounded-full border-2 transition-all relative z-10 ${
                            isActive || isCompleted
                              ? 'bg-gradient-to-br from-yellow-500 to-yellow-600 border-yellow-400 text-white shadow-lg'
                              : 'bg-navy-800 border-navy-600 text-yellow-400'
                          }`}
                        >
                          <StepIcon className="h-3 w-3 sm:h-3.5 sm:w-3.5 md:h-4 md:w-4" />
                        </motion.div>
                        <span className={`mt-1 sm:mt-1.5 text-[9px] sm:text-[10px] md:text-xs lg:text-sm font-medium text-center leading-tight px-0.5 ${
                          isActive || isCompleted ? 'text-yellow-400' : 'text-gray-500'
                        }`}>
                          <span className="hidden sm:inline">{step.title}</span>
                          <span className="sm:hidden">{shortTitle}</span>
                        </span>
                      </div>
                      {index < steps.length - 1 && (
                        <div
                          className={`flex-1 h-0.5 mx-1 sm:mx-2 md:mx-3 lg:mx-4 xl:mx-6 transition-all duration-500 min-w-[8px] sm:min-w-[12px] md:min-w-[20px] ${
                            isCompleted ? 'bg-gradient-to-r from-yellow-500 to-yellow-600' : 'bg-navy-700'
                          }`}
                        />
                      )}
                    </React.Fragment>
                  )
                })}
              </div>
            </div>
          </div>
        </motion.div>

        {/* Form */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="card p-3 sm:p-4 border-2 border-yellow-500/20 shadow-2xl"
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
                  transition={{ duration: 0.3 }}
                  className="space-y-3"
                >
                  <div>
                    <label className="block text-xs sm:text-sm font-medium text-white mb-1">
                      Donation Title *
                    </label>
                    <input
                      {...register('title', {
                        required: 'Title is required',
                        minLength: { value: 5, message: 'Title must be at least 5 characters' },
                        maxLength: { value: 100, message: 'Title must be less than 100 characters' }
                      })}
                      className="input text-xs sm:text-sm"
                      placeholder="e.g., Winter Clothes for Children"
                    />
                    {errors.title && (
                      <p className="mt-1 text-xs sm:text-sm text-danger-600">{errors.title.message}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs sm:text-sm font-medium text-white mb-1">
                      Description
                    </label>
                    <textarea
                      {...register('description', {
                        maxLength: { value: 1000, message: 'Description must be less than 1000 characters' }
                      })}
                      className="input h-20 resize-none text-xs sm:text-sm"
                      placeholder="Describe what you're donating, its condition, and any special instructions..."
                    />
                    {errors.description && (
                      <p className="mt-0.5 text-xs sm:text-sm text-danger-600">{errors.description.message}</p>
                    )}
                    <div className="mt-0.5 text-[10px] sm:text-xs text-yellow-400 text-right">
                      {watch('description')?.length || 0}/1000 characters
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs sm:text-sm font-medium text-white mb-1">
                        Category *
                      </label>
                      <select
                        {...register('category', {
                          required: 'Category is required'
                        })}
                        className="input text-xs sm:text-sm"
                      >
                        <option value="">Select a category</option>
                        {categories.map((category) => (
                          <option key={category} value={category}>
                            {category}
                          </option>
                        ))}
                      </select>
                      {errors.category && (
                        <p className="mt-1 text-xs sm:text-sm text-danger-600">{errors.category.message}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-xs sm:text-sm font-medium text-white mb-1">
                        Quantity *
                      </label>
                      <input
                        {...register('quantity', {
                          required: 'Quantity is required',
                          min: { value: 1, message: 'Quantity must be at least 1' },
                          max: { value: 1000, message: 'Quantity must be less than 1000' }
                        })}
                        type="number"
                        className="input text-xs sm:text-sm"
                        placeholder="1"
                        min="1"
                      />
                      {errors.quantity && (
                        <p className="mt-1 text-xs sm:text-sm text-danger-600">{errors.quantity.message}</p>
                      )}
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs sm:text-sm font-medium text-white mb-2">
                      Tags (optional)
                    </label>
                    <input
                      {...register('tags')}
                      className="input text-xs sm:text-sm"
                      placeholder="urgent, winter, children (separate with commas)"
                    />
                    <p className="mt-2 text-[10px] sm:text-xs text-yellow-400">
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
                  transition={{ duration: 0.3 }}
                  className="space-y-3"
                >
                  {/* Donation Destination Selection - Moved to first */}
                  <div>
                    <label className="block text-xs sm:text-sm font-medium text-white mb-2">
                      Where to send this donation? *
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-3">
                      {/* To Recipients with Options - Moved to first */}
                      <label
                        className={`cursor-pointer p-2.5 sm:p-3 rounded-lg border-2 transition-all ${
                          donationDestination === 'recipients'
                            ? 'border-yellow-500 bg-yellow-900/20 shadow-lg shadow-yellow-500/20'
                            : 'border-navy-700 bg-navy-800 hover:border-navy-600'
                        }`}
                      >
                        <input
                          type="radio"
                          name="donationDestination"
                          value="recipients"
                          checked={donationDestination === 'recipients'}
                          onChange={(e) => setDonationDestination(e.target.value)}
                          className="sr-only"
                        />
                        <div className="flex items-start space-x-2">
                          <div className={`w-8 h-8 sm:w-9 sm:h-9 rounded-full flex items-center justify-center transition-all flex-shrink-0 ${
                            donationDestination === 'recipients'
                              ? 'bg-gradient-to-br from-yellow-500 to-yellow-600 shadow-lg'
                              : 'bg-navy-700 border-2 border-navy-600'
                          }`}>
                            <Users className={`h-4 w-4 sm:h-5 sm:w-5 ${
                              donationDestination === 'recipients' ? 'text-white' : 'text-yellow-400'
                            }`} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <h3 className={`text-xs sm:text-sm font-semibold mb-0.5 ${
                              donationDestination === 'recipients' ? 'text-white' : 'text-gray-300'
                            }`}>
                              To Recipients
                            </h3>
                            <p className="text-[10px] sm:text-xs text-yellow-400 leading-snug">
                              You decide how recipients will receive this donation (pickup/delivery)
                            </p>
                          </div>
                          {donationDestination === 'recipients' && (
                            <CheckCircle className="h-4 w-4 sm:h-5 sm:w-5 text-yellow-500 flex-shrink-0 mt-0.5" />
                          )}
                        </div>
                      </label>

                      {/* Direct to Organization */}
                      <label
                        className={`cursor-pointer p-2.5 sm:p-3 rounded-lg border-2 transition-all ${
                          donationDestination === 'organization'
                            ? 'border-yellow-500 bg-yellow-900/20 shadow-lg shadow-yellow-500/20'
                            : 'border-navy-700 bg-navy-800 hover:border-navy-600'
                        }`}
                      >
                        <input
                          type="radio"
                          name="donationDestination"
                          value="organization"
                          checked={donationDestination === 'organization'}
                          onChange={(e) => {
                            setDonationDestination(e.target.value)
                          }}
                          className="sr-only"
                        />
                        <div className="flex items-start space-x-2">
                          <div className={`w-8 h-8 sm:w-9 sm:h-9 rounded-full flex items-center justify-center transition-all flex-shrink-0 ${
                            donationDestination === 'organization'
                              ? 'bg-gradient-to-br from-yellow-500 to-yellow-600 shadow-lg'
                              : 'bg-navy-700 border-2 border-navy-600'
                          }`}>
                            <Package className={`h-4 w-4 sm:h-5 sm:w-5 ${
                              donationDestination === 'organization' ? 'text-white' : 'text-yellow-400'
                            }`} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <h3 className={`text-xs sm:text-sm font-semibold mb-0.5 ${
                              donationDestination === 'organization' ? 'text-white' : 'text-gray-300'
                            }`}>
                              Direct to Organization
                            </h3>
                            <p className="text-[10px] sm:text-xs text-yellow-400 leading-snug">
                              Send directly to organization (CFC-GK) for distribution
                            </p>
                          </div>
                          {donationDestination === 'organization' && (
                            <CheckCircle className="h-4 w-4 sm:h-5 sm:w-5 text-yellow-500 flex-shrink-0 mt-0.5" />
                          )}
                        </div>
                      </label>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs sm:text-sm font-medium text-white mb-2">
                      Condition *
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-3">
                      {conditions.map((condition) => (
                        <label
                          key={condition.value}
                          className={`cursor-pointer p-2.5 sm:p-3 rounded-lg border transition-all ${
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
                            <h3 className="text-xs sm:text-sm font-medium text-white">{condition.label}</h3>
                            <p className="text-[10px] sm:text-xs text-yellow-300 mt-0.5">{condition.description}</p>
                          </div>
                        </label>
                      ))}
                    </div>
                    {errors.condition && (
                      <p className="mt-1 text-xs sm:text-sm text-danger-600">{errors.condition.message}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs sm:text-sm font-medium text-white mb-1">
                      Pickup Location *
                    </label>
                    <div className="space-y-2">
                      <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2">
                        <input
                          {...register('pickup_location', {
                            required: 'Pickup location is required'
                          })}
                          className="input flex-1 text-xs sm:text-sm"
                          placeholder="Enter pickup address or location"
                          value={selectedLocation?.address || watch('pickup_location') || ''}
                          readOnly={selectedLocation !== null}
                        />
                        <button
                          type="button"
                          onClick={() => setShowLocationPicker(true)}
                          className="px-3 sm:px-4 py-2 bg-yellow-600 hover:bg-yellow-700 text-white rounded-lg transition-colors flex items-center justify-center space-x-2 text-xs sm:text-sm whitespace-nowrap"
                        >
                          <MapPin className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                          <span>Map</span>
                        </button>
                      </div>
                      {selectedLocation && (
                        <div className="bg-green-900/20 border border-green-500/20 p-2 rounded-lg">
                          <p className="text-[10px] sm:text-xs text-green-400 flex items-center">
                            <CheckCircle className="w-3 h-3 mr-1" />
                            Location set on map
                          </p>
                        </div>
                      )}
                      {errors.pickup_location && (
                        <p className="mt-1 text-xs sm:text-sm text-danger-600">{errors.pickup_location.message}</p>
                      )}
                    </div>
                  </div>

                  {/* Mode of Delivery and Expiry Date in same row */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {/* Mode of Delivery */}
                    <div>
                      <label className="block text-xs sm:text-sm font-medium text-white mb-1">
                        Mode of Delivery *
                      </label>
                      <select
                        {...register('delivery_mode', {
                          required: 'Delivery mode is required'
                        })}
                        className="input text-xs sm:text-sm"
                      >
                        <option value="">Select delivery mode</option>
                        {donationDestination === 'organization' ? (
                          <>
                            <option value="donor_delivery">I will deliver to organization</option>
                            <option value="volunteer">Use volunteer to deliver to organization</option>
                            <option value="organization_pickup">Organization will pick up at my location</option>
                          </>
                        ) : (
                          <>
                            <option value="pickup">Self Pickup</option>
                            <option value="volunteer">Volunteer Delivery</option>
                            <option value="direct">Direct Delivery (by donor)</option>
                          </>
                        )}
                      </select>
                      {errors.delivery_mode && (
                        <p className="mt-0.5 text-xs sm:text-sm text-danger-600">{errors.delivery_mode.message}</p>
                      )}
                      <p className="mt-0.5 text-[10px] sm:text-xs text-yellow-400">
                        {donationDestination === 'organization' 
                          ? 'Choose how to deliver your donation to the organization' 
                          : 'Choose how recipients can receive this donation'}
                      </p>
                    </div>

                    {/* Expiry Date */}
                    <div>
                      <label className="block text-xs sm:text-sm font-medium text-white mb-1">
                        Expiry Date (if applicable)
                      </label>
                      <input
                        {...register('expiry_date')}
                        type="date"
                        className="input text-xs sm:text-sm"
                        min={new Date().toISOString().split('T')[0]}
                      />
                    </div>
                  </div>

                  {/* Info message when organization is selected */}
                  {donationDestination === 'organization' && (
                    <div className="bg-yellow-900/20 border border-yellow-500/30 rounded-lg p-2 flex items-start space-x-2">
                      <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5 text-yellow-400" />
                      <div className="flex-1">
                        <p className="text-xs font-medium text-yellow-300">Sending to Organization</p>
                        <p className="text-xs text-yellow-400 mt-0.5">
                          Your donation will be sent directly to the organization (CFC-GK) for distribution to those in need.
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Pickup Instructions - Moved to last */}
                  <div>
                    <label className="block text-xs sm:text-sm font-medium text-white mb-1">
                      Pickup Instructions (optional)
                    </label>
                    <textarea
                      {...register('pickup_instructions')}
                      className="input h-16 resize-none text-xs sm:text-sm"
                      placeholder="Special instructions for pickup (e.g., gate code, best time to contact, etc.)"
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
                  transition={{ duration: 0.3 }}
                  className="space-y-3"
                >
                  {/* Urgent Priority Section */}
                  <div>
                    <label className="block text-xs sm:text-sm font-medium text-white mb-1.5">
                      Priority Level *
                    </label>
                    <p className="text-[10px] sm:text-xs text-yellow-400 mb-2">
                      Select the urgency level for this donation
                    </p>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-3">
                      {/* Normal Priority Button */}
                      <button
                        type="button"
                        onClick={() => setValue('is_urgent', false)}
                        className={`relative p-2.5 sm:p-3 rounded-lg border-2 transition-all duration-300 ${
                          !watchedIsUrgent
                            ? 'border-yellow-500 bg-gradient-to-br from-yellow-900/30 to-yellow-800/20 shadow-lg shadow-yellow-500/20'
                            : 'border-navy-600 bg-navy-800 hover:border-navy-500'
                        }`}
                      >
                        <div className="flex items-start space-x-2">
                          <div className={`w-8 h-8 sm:w-9 sm:h-9 rounded-full flex items-center justify-center transition-all flex-shrink-0 ${
                            !watchedIsUrgent
                              ? 'bg-gradient-to-br from-yellow-500 to-yellow-600 shadow-lg shadow-yellow-500/50'
                              : 'bg-navy-700 border-2 border-navy-600'
                          }`}>
                            <Clock className={`h-4 w-4 sm:h-5 sm:w-5 ${
                              !watchedIsUrgent ? 'text-white' : 'text-yellow-400'
                            }`} />
                          </div>
                          <div className="flex-1 text-left min-w-0">
                            <h3 className={`text-xs sm:text-sm font-semibold mb-0.5 ${
                              !watchedIsUrgent ? 'text-white' : 'text-gray-300'
                            }`}>
                              Normal Priority
                            </h3>
                            <p className="text-[10px] sm:text-xs text-yellow-400 leading-snug">
                              Standard donation with flexible pickup timeline
                            </p>
                          </div>
                        </div>
                        {!watchedIsUrgent && (
                          <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            className="absolute top-2 right-2"
                          >
                            <CheckCircle className="h-4 w-4 sm:h-5 sm:w-5 text-yellow-500" />
                          </motion.div>
                        )}
                      </button>

                      {/* Urgent Priority Button */}
                      <button
                        type="button"
                        onClick={() => setValue('is_urgent', true)}
                        className={`relative p-2.5 sm:p-3 rounded-lg border-2 transition-all duration-300 ${
                          watchedIsUrgent
                            ? 'border-red-500 bg-gradient-to-br from-red-900/30 to-red-800/20 shadow-lg shadow-red-500/20'
                            : 'border-navy-600 bg-navy-800 hover:border-navy-500'
                        }`}
                      >
                        <div className="flex items-start space-x-2">
                          <div className={`w-8 h-8 sm:w-9 sm:h-9 rounded-full flex items-center justify-center transition-all flex-shrink-0 ${
                            watchedIsUrgent
                              ? 'bg-gradient-to-br from-red-500 to-red-600 shadow-lg shadow-red-500/50'
                              : 'bg-navy-700 border-2 border-navy-600'
                          }`}>
                            <AlertCircle className={`h-4 w-4 sm:h-5 sm:w-5 ${
                              watchedIsUrgent ? 'text-white' : 'text-yellow-400'
                            }`} />
                          </div>
                          <div className="flex-1 text-left min-w-0">
                            <h3 className={`text-xs sm:text-sm font-semibold mb-0.5 ${
                              watchedIsUrgent ? 'text-white' : 'text-gray-300'
                            }`}>
                              Urgent Priority
                            </h3>
                            <p className="text-[10px] sm:text-xs text-yellow-400 leading-snug">
                              Needs immediate attention (perishable items, time-sensitive supplies)
                            </p>
                          </div>
                        </div>
                        {watchedIsUrgent && (
                          <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            className="absolute top-2 right-2"
                          >
                            <CheckCircle className="h-4 w-4 sm:h-5 sm:w-5 text-red-500" />
                          </motion.div>
                        )}
                      </button>
                    </div>

                    {/* Urgent Priority Info Banner */}
                    {watchedIsUrgent && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="mt-2 flex items-start space-x-2 text-red-400 bg-red-900/20 px-2.5 py-2 rounded-lg border border-red-500/30"
                      >
                        <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
                        <div>
                          <p className="text-xs font-medium">Urgent Priority Enabled</p>
                          <p className="text-xs text-red-300 mt-0.5">
                            This donation will be highlighted and prioritized in search results to ensure quick matching with recipients.
                          </p>
                        </div>
                      </motion.div>
                    )}
                  </div>

                  {/* Image Upload Section */}
                  <div>
                    <label className="block text-xs sm:text-sm font-medium text-white mb-1.5">
                      Donation Photos
                    </label>
                    <p className="text-xs text-yellow-400 mb-2">
                      Upload photos of your donation to help recipients see what you're offering. (Max 5 images, 5MB each)
                    </p>
                    
                    <div className="space-y-2">
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
                        <div className={`border-2 border-dashed rounded-lg p-3 text-center transition-all ${
                          uploadedImages.length >= 5 
                            ? 'border-navy-700 bg-navy-800/50 cursor-not-allowed' 
                            : 'border-navy-600 bg-navy-800 hover:border-yellow-500 hover:bg-navy-700 cursor-pointer'
                        }`}>
                          <Upload className={`h-5 w-5 mx-auto mb-1 ${
                            uploadedImages.length >= 5 ? 'text-gray-500' : 'text-yellow-400'
                          }`} />
                          <p className={`text-[10px] sm:text-xs ${
                            uploadedImages.length >= 5 ? 'text-gray-500' : 'text-white'
                          }`}>
                            {uploadedImages.length >= 5 
                              ? 'Maximum 5 images reached' 
                              : 'Click to upload images or drag and drop'}
                          </p>
                          <p className={`text-[10px] sm:text-xs mt-0.5 ${
                            uploadedImages.length >= 5 ? 'text-gray-500' : 'text-yellow-400'
                          }`}>
                            PNG, JPG, JPEG up to 5MB each
                          </p>
                        </div>
                      </div>

                      {/* Image Preview Grid */}
                      {uploadedImages.length > 0 && (
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2 sm:gap-3">
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
                              <p className="text-[10px] sm:text-xs text-yellow-400 mt-1 truncate" title={image.name}>
                                {image.name}
                              </p>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Review Section */}
                  <div className="border-t border-navy-700 pt-4 mt-4">
                    <div className="flex items-center gap-2 mb-4">
                      <CheckCircle className="h-4 w-4 sm:h-5 sm:w-5 text-yellow-400 flex-shrink-0" />
                      <h3 className="text-xs sm:text-sm font-semibold text-white">Review Your Donation</h3>
                    </div>
                    
                    <div className="bg-navy-800 rounded-lg border-2 border-navy-700 shadow-lg">
                      {/* Title and Description Section */}
                      <div className="p-4 sm:p-5 border-b border-navy-700">
                        <div className="mb-4">
                          <label className="block text-[10px] sm:text-xs text-yellow-400 font-semibold uppercase tracking-wider mb-2">Donation Title</label>
                          <h4 className="text-xs sm:text-sm font-semibold text-white">{watch('title') || 'No title provided'}</h4>
                        </div>

                        {watch('description') && (
                          <div>
                            <label className="block text-[10px] sm:text-xs text-yellow-400 font-semibold uppercase tracking-wider mb-2">Description</label>
                            <p className="text-xs sm:text-sm text-yellow-200 leading-relaxed">{watch('description')}</p>
                          </div>
                        )}
                      </div>

                      {/* Main Details Grid */}
                      <div className="p-4 sm:p-5">
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
                          {/* Category */}
                          <div className="pb-3 sm:pb-4 border-b border-navy-700 sm:border-b-0 sm:border-r sm:pr-4 lg:pr-5">
                            <label className="text-[10px] sm:text-xs text-yellow-400 font-semibold uppercase tracking-wider mb-2 block">Category</label>
                            <p className="text-xs sm:text-sm text-white font-medium">{watch('category') || 'Not specified'}</p>
                          </div>

                          {/* Quantity */}
                          <div className="pb-3 sm:pb-4 border-b border-navy-700 sm:border-b-0 sm:border-r sm:pr-4 lg:pr-5">
                            <label className="text-[10px] sm:text-xs text-yellow-400 font-semibold uppercase tracking-wider mb-2 block">Quantity</label>
                            <p className="text-xs sm:text-sm text-white font-medium">{watch('quantity') || 1}</p>
                          </div>

                          {/* Condition */}
                          <div className="pb-3 sm:pb-4">
                            <label className="text-[10px] sm:text-xs text-yellow-400 font-semibold uppercase tracking-wider mb-2 block">Condition</label>
                            <div className={`inline-flex items-center px-2 sm:px-3 py-1 sm:py-1.5 rounded-md text-xs sm:text-sm font-medium ${
                              watchedCondition === 'new' ? 'bg-success-900/30 text-success-300 border border-success-500/30' :
                              watchedCondition === 'like_new' ? 'bg-yellow-900/30 text-yellow-300 border border-yellow-500/30' :
                              watchedCondition === 'good' ? 'bg-amber-900/30 text-amber-300 border border-amber-500/30' :
                              'bg-orange-900/30 text-orange-300 border border-orange-500/30'
                            }`}>
                              {watchedCondition && conditions.find(c => c.value === watchedCondition)?.label || 'Not specified'}
                            </div>
                          </div>

                          {/* Priority */}
                          {watchedIsUrgent && (
                            <div className="pb-3 sm:pb-4 border-b border-navy-700 sm:border-b-0 sm:border-r sm:pr-4 lg:pr-5">
                              <label className="text-[10px] sm:text-xs text-yellow-400 font-semibold uppercase tracking-wider mb-2 block">Priority</label>
                              <span className="inline-flex items-center px-2 sm:px-3 py-1 sm:py-1.5 rounded-md text-xs sm:text-sm font-medium bg-danger-900/30 text-danger-300 border border-danger-500/30">
                                <AlertCircle className="h-3 w-3 sm:h-3.5 sm:w-3.5 mr-1.5" />
                                Urgent
                              </span>
                            </div>
                          )}

                          {/* Pickup Location */}
                          <div className={`pb-3 sm:pb-4 ${watchedIsUrgent ? 'sm:border-r sm:pr-4 lg:pr-5' : 'border-b border-navy-700 sm:border-b-0 sm:border-r sm:pr-4 lg:pr-5'}`}>
                            <label className="text-[10px] sm:text-xs text-yellow-400 font-semibold uppercase tracking-wider mb-2 flex items-center gap-1.5">
                              <MapPin className="h-3.5 w-3.5 flex-shrink-0" />
                              Pickup Location
                            </label>
                            <p className="text-xs sm:text-sm text-white font-medium break-words leading-relaxed">{watch('pickup_location') || 'Not specified'}</p>
                          </div>
                          
                          {/* Delivery Details */}
                          <div className={`pb-3 sm:pb-4 ${watchedIsUrgent ? '' : 'sm:border-r sm:pr-4 lg:pr-5'}`}>
                            <label className="text-[10px] sm:text-xs text-yellow-400 font-semibold uppercase tracking-wider mb-2 flex items-center gap-1.5">
                              {donationDestination === 'organization' ? (
                                <Package className="h-3.5 w-3.5 flex-shrink-0" />
                              ) : (
                                <Users className="h-3.5 w-3.5 flex-shrink-0" />
                              )}
                              Delivery Details
                            </label>
                            <div className="text-xs sm:text-sm text-white">
                              <p className="font-semibold mb-1">{donationDestination === 'organization' ? 'Direct to Organization' : 'To Recipients'}</p>
                              <p className="text-yellow-300 font-medium">
                                {watchedDeliveryMode === 'pickup' ? 'Self Pickup' : 
                                 watchedDeliveryMode === 'volunteer' ? 'Volunteer Delivery' : 
                                 watchedDeliveryMode === 'direct' ? 'Direct Delivery (by donor)' :
                                 watchedDeliveryMode === 'donor_delivery' ? 'I will deliver to organization' :
                                 watchedDeliveryMode === 'organization_pickup' ? 'Organization will pick up' :
                                 'Not specified'}
                              </p>
                            </div>
                          </div>

                          {/* Expiry Date */}
                          {watch('expiry_date') && (
                            <div className="pb-3 sm:pb-4">
                              <label className="text-[10px] sm:text-xs text-yellow-400 font-semibold uppercase tracking-wider mb-2 flex items-center gap-1.5">
                                <Calendar className="h-3.5 w-3.5 flex-shrink-0" />
                                Expiry Date
                              </label>
                              <p className="text-xs sm:text-sm text-white font-medium">
                                {new Date(watch('expiry_date')).toLocaleDateString('en-US', { 
                                  year: 'numeric', 
                                  month: 'long', 
                                  day: 'numeric' 
                                })}
                              </p>
                            </div>
                          )}

                          {/* Photos */}
                          {uploadedImages.length > 0 && (
                            <div className={`pb-3 sm:pb-4 ${watch('expiry_date') ? '' : 'sm:col-span-2 lg:col-span-1'}`}>
                              <label className="text-[10px] sm:text-xs text-yellow-400 font-semibold uppercase tracking-wider mb-2 flex items-center gap-1.5">
                                <ImageIcon className="h-3.5 w-3.5 flex-shrink-0" />
                                Photos ({uploadedImages.length})
                              </label>
                              <p className="text-xs sm:text-sm text-yellow-300 font-medium">{uploadedImages.length} photo{uploadedImages.length > 1 ? 's' : ''} uploaded</p>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Pickup Instructions - Full Width */}
                      {watch('pickup_instructions') && (
                        <div className="p-4 sm:p-5 border-t border-navy-700">
                          <label className="block text-[10px] sm:text-xs text-yellow-400 font-semibold uppercase tracking-wider mb-2">Pickup Instructions</label>
                          <p className="text-xs sm:text-sm text-yellow-200 leading-relaxed">{watch('pickup_instructions')}</p>
                        </div>
                      )}

                      {/* Tags - Full Width */}
                      {watch('tags') && (
                        <div className="p-4 sm:p-5 border-t border-navy-700">
                          <label className="block text-[10px] sm:text-xs text-yellow-400 font-semibold uppercase tracking-wider mb-2">Tags</label>
                          <div className="flex flex-wrap gap-2">
                            {watch('tags').split(',').map((tag, idx) => tag.trim()).filter(tag => tag).map((tag, idx) => (
                              <span key={idx} className="inline-flex items-center px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-md text-xs sm:text-sm bg-yellow-900/30 text-yellow-300 border border-yellow-500/30 font-medium">
                                {tag.trim()}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Navigation Buttons */}
            <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-2 mt-3 pt-3 border-t-2 border-navy-700">
              <button
                type="button"
                onClick={prevStep}
                disabled={currentStep === 1}
                className="w-full sm:w-auto px-3 sm:px-4 py-1.5 sm:py-2 bg-navy-700 hover:bg-navy-600 text-white rounded-lg text-[10px] sm:text-xs md:text-sm font-medium transition-all flex items-center justify-center space-x-1.5 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-navy-700 shadow-lg hover:shadow-xl order-2 sm:order-1"
              >
                <ArrowLeft className="h-3 w-3 sm:h-3.5 sm:w-3.5 md:h-4 md:w-4" />
                <span>Previous</span>
              </button>

              {currentStep < 3 ? (
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault()
                    nextStep()
                  }}
                  className="w-full sm:w-auto px-3 sm:px-4 md:px-5 py-1.5 sm:py-2 bg-gradient-to-r from-yellow-500 to-yellow-600 hover:from-yellow-600 hover:to-yellow-700 text-white rounded-lg text-[10px] sm:text-xs md:text-sm font-semibold transition-all flex items-center justify-center space-x-1.5 shadow-lg hover:shadow-xl hover:scale-105 transform active:scale-95 order-1 sm:order-2"
                >
                  <span>Next Step</span>
                  <ArrowRight className="h-3 w-3 sm:h-3.5 sm:w-3.5 md:h-4 md:w-4" />
                </button>
              ) : (
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full sm:w-auto px-3 sm:px-4 md:px-5 py-1.5 sm:py-2 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white rounded-lg text-[10px] sm:text-xs md:text-sm font-bold transition-all flex items-center justify-center space-x-1.5 shadow-lg hover:shadow-xl hover:scale-105 transform active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 order-1 sm:order-2"
                >
                  {isLoading ? (
                    <>
                      <LoadingSpinner size="sm" />
                      <span>Posting...</span>
                    </>
                  ) : (
                    <>
                      <Gift className="h-3 w-3 sm:h-3.5 sm:w-3.5 md:h-4 md:w-4" />
                      <span>Post Donation</span>
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