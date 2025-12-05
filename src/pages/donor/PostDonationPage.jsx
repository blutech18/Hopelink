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
import { Info } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import { useToast } from '../../contexts/ToastContext'
import { db } from '../../lib/supabase'
import { FormSkeleton } from '../../components/ui/Skeleton'
import LoadingSpinner from '../../components/ui/LoadingSpinner'
import LocationPicker from '../../components/ui/LocationPicker'
import { HelpIcon } from '../../components/ui/HelpTooltip'
import WorkflowGuideModal from '../../components/ui/WorkflowGuideModal'

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
  const [showWorkflowGuide, setShowWorkflowGuide] = useState(false)

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
      // Scroll to top of form smoothly after state update
      setTimeout(() => {
        if (formTopRef.current) {
          const headerOffset = 80 // Account for sticky header
          const elementPosition = formTopRef.current.getBoundingClientRect().top
          const offsetPosition = elementPosition + window.pageYOffset - headerOffset

          window.scrollTo({
            top: offsetPosition,
            behavior: 'smooth'
          })
        }
      }, 100)
    } else if (!isValid) {
      console.log('Validation failed, staying on current step')
    }
  }

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1)
      // Scroll to top of form smoothly after state update
      setTimeout(() => {
        if (formTopRef.current) {
          const headerOffset = 80 // Account for sticky header
          const elementPosition = formTopRef.current.getBoundingClientRect().top
          const offsetPosition = elementPosition + window.pageYOffset - headerOffset

          window.scrollTo({
            top: offsetPosition,
            behavior: 'smooth'
          })
        }
      }, 100)
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
    <div className="min-h-screen py-4 sm:py-6 md:py-8" style={{backgroundColor: '#00237d'}}>
      <div className="w-full max-w-[1400px] mx-auto px-4 sm:px-6 md:px-8 lg:px-10">

        {/* Header - Removed title, subtitle, and logo */}
        {location.state?.fromRequestId && (
          <motion.div
            ref={formTopRef}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-6"
          >
            <div className="mt-2 bg-yellow-900/20 border border-yellow-500/30 rounded-lg px-4 py-3 inline-block text-left">
              <p className="text-sm text-yellow-300">
                You are fulfilling a recipient's request. You can adjust the details if needed.
              </p>
              <div className="text-sm text-yellow-400 mt-2">
                <Link to="/browse-requests" className="underline hover:text-yellow-300">Back to Browse Requests</Link>
              </div>
            </div>
          </motion.div>
        )}

        {/* Main Layout: Steps on Left, Form on Right */}
        <div className="flex flex-col lg:flex-row gap-6 lg:gap-8">
          {/* Vertical Progress Steps - Left Side */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
            className="lg:w-80 xl:w-96 flex-shrink-0"
          >
            <div className="card px-6 py-10 sm:py-11 lg:px-8 lg:py-12 xl:py-14 border-2 border-yellow-500/20 shadow-2xl lg:sticky lg:top-20 rounded-xl" style={{backgroundColor: '#001a5c'}}>
              {/* Header */}
              <div className="flex items-center justify-between mb-10 sm:mb-11 lg:mb-12 pb-7 sm:pb-8 lg:pb-9 border-b border-navy-700">
                <h3 className="text-xl font-bold text-white">Progress</h3>
                <button
                  type="button"
                  onClick={() => setShowWorkflowGuide(true)}
                  className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-navy-800 hover:bg-navy-700 text-yellow-400 hover:text-yellow-300 transition-all"
                  title="How the workflow works"
                  aria-label="How the workflow works"
                >
                  <Info className="h-4 w-4" />
                </button>
              </div>

              {/* Steps */}
              <div className="relative">
                {steps.map((step, index) => {
                  const StepIcon = step.icon
                  const isActive = currentStep === step.number
                  const isCompleted = currentStep > step.number
                  const isUpcoming = currentStep < step.number
                  
                  return (
                    <div key={step.number} className="relative">
                      {/* Step Item */}
                      <div className="flex items-start gap-4 relative z-10">
                        {/* Icon Container */}
                        <div className="flex-shrink-0">
                          <motion.div
                            animate={{
                              scale: isActive ? 1.05 : 1
                            }}
                            transition={{ duration: 0.3 }}
                            className={`relative flex items-center justify-center w-14 h-14 lg:w-16 lg:h-16 rounded-full border-2 transition-all duration-300 ${
                              isActive
                                ? 'bg-gradient-to-br from-yellow-500 to-yellow-600 border-yellow-400 text-white shadow-lg shadow-yellow-500/50'
                                : isCompleted
                                ? 'bg-gradient-to-br from-yellow-500/80 to-yellow-600/80 border-yellow-500/50 text-white'
                                : 'bg-navy-800/50 border-navy-600 text-gray-500'
                            }`}
                          >
                            <StepIcon className={`h-7 w-7 lg:h-8 lg:w-8 transition-all relative z-10 ${
                              isActive ? 'text-white' : isCompleted ? 'text-white' : 'text-gray-500'
                            }`} />
                            {/* Yellow wave/glow effect for active step */}
                            {isActive && (
                              <motion.div
                                animate={{
                                  scale: [1, 1.3, 1],
                                  opacity: [0.5, 0.8, 0.5]
                                }}
                                transition={{
                                  duration: 2,
                                  repeat: Infinity,
                                  ease: "easeInOut"
                                }}
                                className="absolute inset-0 rounded-full bg-yellow-400/30 border-2 border-yellow-400/50"
                              />
                            )}
                          </motion.div>
                        </div>

                        {/* Text Content */}
                        <div className="flex-1 pt-2 sm:pt-2.5 lg:pt-3 min-w-0">
                          <div className={`text-xs font-semibold uppercase tracking-wider mb-1.5 sm:mb-2 ${
                            isActive ? 'text-yellow-400' : isCompleted ? 'text-yellow-500/70' : 'text-gray-500'
                          }`}>
                            Step {step.number}
                          </div>
                          <div className={`text-sm lg:text-base font-semibold leading-tight ${
                            isActive ? 'text-white' : isCompleted ? 'text-gray-300' : 'text-gray-500'
                          }`}>
                            {step.title}
                          </div>
                        </div>
                      </div>

                      {/* Connector Line */}
                      {index < steps.length - 1 && (
                        <div className="relative ml-7 lg:ml-8 my-8 sm:my-10 lg:my-12">
                          <div className={`absolute left-0 top-0 w-0.5 transition-all duration-500 ${
                            isCompleted 
                              ? 'h-full bg-gradient-to-b from-yellow-500 via-yellow-500 to-yellow-600' 
                              : 'h-full bg-navy-700'
                          }`} />
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          </motion.div>

          {/* Form - Right Side */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="flex-1"
            ref={formTopRef}
          >
            <div className="card p-6 sm:p-8 md:p-10 lg:p-12 border-2 border-yellow-500/20 shadow-2xl" style={{backgroundColor: '#001a5c'}}>
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
                  className="space-y-6"
                >
                  <div>
                    <label className="block text-sm font-medium text-white mb-2">
                      <div className="flex items-center gap-2">
                      Donation Title *
                      <HelpIcon content="A clear title helps recipients find your donation. Your donation will be matched with recipients who need this item." />
                    </div>
                    </label>
                    <input
                      {...register('title', {
                        required: 'Title is required',
                        minLength: { value: 5, message: 'Title must be at least 5 characters' },
                        maxLength: { value: 100, message: 'Title must be less than 100 characters' }
                      })}
                      className="input text-sm px-4 py-3"
                      placeholder="e.g., Winter Clothes for Children"
                    />
                    {errors.title && (
                      <p className="mt-2 text-sm text-danger-600">{errors.title.message}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-white mb-2">
                      <div className="flex items-center gap-2">
                        Description
                        <HelpIcon content="Detailed descriptions help recipients understand what you're offering. This improves matching and helps your donation reach those who need it most." />
                      </div>
                    </label>
                    <textarea
                      {...register('description', {
                        maxLength: { value: 1000, message: 'Description must be less than 1000 characters' }
                      })}
                      className="input h-32 sm:h-36 resize-none text-sm px-4 py-3"
                      placeholder="Describe what you're donating, its condition, and any special instructions..."
                    />
                    {errors.description && (
                      <p className="mt-2 text-sm text-danger-600">{errors.description.message}</p>
                    )}
                    <div className="mt-2 text-sm text-yellow-400 text-right">
                      {watch('description')?.length || 0}/1000 characters
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-white mb-2">
                        <div className="flex items-center gap-2">
                          Category *
                          <HelpIcon content="Selecting the right category helps our smart matching algorithm connect your donation with recipients who need this type of item." />
                        </div>
                      </label>
                      <select
                        {...register('category', {
                          required: 'Category is required'
                        })}
                        className="input text-sm px-4 py-3"
                      >
                        <option value="">Select a category</option>
                        {categories.map((category) => (
                          <option key={category} value={category}>
                            {category}
                          </option>
                        ))}
                      </select>
                      {errors.category && (
                        <p className="mt-2 text-sm text-danger-600">{errors.category.message}</p>
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
                        className="input text-sm px-4 py-3"
                        placeholder="1"
                        min="1"
                      />
                      {errors.quantity && (
                        <p className="mt-2 text-sm text-danger-600">{errors.quantity.message}</p>
                      )}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-white mb-2">
                      Tags (optional)
                    </label>
                    <input
                      {...register('tags')}
                      className="input text-sm px-4 py-3"
                      placeholder="urgent, winter, children (separate with commas)"
                    />
                    <p className="mt-2 text-sm text-yellow-400">
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
                  className="space-y-6"
                >
                  {/* Donation Destination Selection - Moved to first */}
                  <div>
                    <label className="block text-sm font-medium text-white mb-3">
                      Where to send this donation? *
                    </label>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* To Recipients with Options - Moved to first */}
                      <label
                        className={`cursor-pointer p-2 sm:p-2.5 rounded-lg border-2 transition-all ${
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
                          <div className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center transition-all flex-shrink-0 ${
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
                        className={`cursor-pointer p-2 sm:p-2.5 rounded-lg border-2 transition-all ${
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
                          <div className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center transition-all flex-shrink-0 ${
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
                    <label className="block text-sm font-medium text-white mb-3">
                      Condition *
                    </label>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {conditions.map((condition) => (
                        <label
                          key={condition.value}
                          className={`cursor-pointer p-2 sm:p-2.5 rounded-lg border transition-all ${
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
                        <p className="mt-2 text-sm text-danger-600">{errors.condition.message}</p>
                      )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-white mb-2">
                      Pickup Location *
                    </label>
                    <div className="space-y-3">
                      <div className="flex flex-col sm:flex-row gap-3">
                        <input
                          {...register('pickup_location', {
                            required: 'Pickup location is required'
                          })}
                          className="input flex-1 text-sm px-4 py-3"
                          placeholder="Enter pickup address or location"
                          value={selectedLocation?.address || watch('pickup_location') || ''}
                          readOnly={selectedLocation !== null}
                        />
                        <button
                          type="button"
                          onClick={() => setShowLocationPicker(true)}
                          className="px-4 sm:px-6 py-3 bg-yellow-600 hover:bg-yellow-700 text-white rounded-lg transition-colors flex items-center justify-center space-x-2 text-sm whitespace-nowrap font-medium"
                        >
                          <MapPin className="w-5 h-5" />
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
                        <p className="mt-2 text-sm text-danger-600">{errors.pickup_location.message}</p>
                      )}
                    </div>
                  </div>

                  {/* Mode of Delivery and Expiry Date in same row */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Mode of Delivery */}
                    <div>
                      <label className="block text-sm font-medium text-white mb-2">
                        Mode of Delivery *
                      </label>
                      <select
                        {...register('delivery_mode', {
                          required: 'Delivery mode is required'
                        })}
                        className="input text-sm px-4 py-3 h-[42px]"
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
                        <p className="mt-2 text-sm text-danger-600">{errors.delivery_mode.message}</p>
                      )}
                      <p className="mt-2 text-sm text-yellow-400">
                        {donationDestination === 'organization' 
                          ? 'Choose how to deliver your donation to the organization' 
                          : 'Choose how recipients can receive this donation'}
                      </p>
                    </div>

                    {/* Expiry Date */}
                    <div>
                      <label className="block text-sm font-medium text-white mb-2">
                        Expiry Date (if applicable)
                      </label>
                      <input
                        {...register('expiry_date')}
                        type="date"
                        className="input text-sm px-4 py-3 h-[42px]"
                        min={new Date().toISOString().split('T')[0]}
                      />
                    </div>
                  </div>

                  {/* Info message when organization is selected */}
                  {donationDestination === 'organization' && (
                    <div className="bg-yellow-900/20 border border-yellow-500/30 rounded-lg p-4 flex items-start space-x-3">
                      <AlertCircle className="h-5 w-5 flex-shrink-0 mt-0.5 text-yellow-400" />
                      <div className="flex-1">
                        <p className="text-sm font-medium text-yellow-300">Sending to Organization</p>
                        <p className="text-sm text-yellow-400 mt-1">
                          Your donation will be sent directly to the organization (CFC-GK) for distribution to those in need.
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Pickup Instructions - Moved to last */}
                  <div>
                    <label className="block text-sm font-medium text-white mb-2">
                      Pickup Instructions (optional)
                    </label>
                    <textarea
                      {...register('pickup_instructions')}
                      className="input h-24 sm:h-28 resize-none text-sm px-4 py-3"
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
                  className="space-y-6"
                >
                  {/* Urgent Priority Section */}
                  <div>
                    <label className="block text-sm font-medium text-white mb-2">
                      Priority Level *
                    </label>
                    <p className="text-sm text-yellow-400 mb-4">
                      Select the urgency level for this donation
                    </p>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Normal Priority Button */}
                      <button
                        type="button"
                        onClick={() => setValue('is_urgent', false)}
                        className={`relative p-2 sm:p-2.5 rounded-lg border-2 transition-all duration-300 ${
                          !watchedIsUrgent
                            ? 'border-yellow-500 bg-gradient-to-br from-yellow-900/30 to-yellow-800/20 shadow-lg shadow-yellow-500/20'
                            : 'border-navy-600 bg-navy-800 hover:border-navy-500'
                        }`}
                      >
                        <div className="flex items-start space-x-2">
                          <div className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center transition-all flex-shrink-0 ${
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
                        className={`relative p-2 sm:p-2.5 rounded-lg border-2 transition-all duration-300 ${
                          watchedIsUrgent
                            ? 'border-red-500 bg-gradient-to-br from-red-900/30 to-red-800/20 shadow-lg shadow-red-500/20'
                            : 'border-navy-600 bg-navy-800 hover:border-navy-500'
                        }`}
                      >
                        <div className="flex items-start space-x-2">
                          <div className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center transition-all flex-shrink-0 ${
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
                        className="mt-4 flex items-start space-x-3 text-red-400 bg-red-900/20 px-4 py-3 rounded-lg border border-red-500/30"
                      >
                        <AlertCircle className="h-5 w-5 flex-shrink-0 mt-0.5" />
                        <div>
                          <p className="text-sm font-medium">Urgent Priority Enabled</p>
                          <p className="text-sm text-red-300 mt-1">
                            This donation will be highlighted and prioritized in search results to ensure quick matching with recipients.
                          </p>
                        </div>
                      </motion.div>
                    )}
                  </div>

                  {/* Image Upload Section */}
                  <div>
                    <label className="block text-sm font-medium text-white mb-2">
                      Donation Photos
                    </label>
                    <p className="text-sm text-yellow-400 mb-4">
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
                        <div className={`border-2 border-dashed rounded-lg p-6 sm:p-8 text-center transition-all ${
                          uploadedImages.length >= 5 
                            ? 'border-navy-700 bg-navy-800/50 cursor-not-allowed' 
                            : 'border-navy-600 bg-navy-800 hover:border-yellow-500 hover:bg-navy-700 cursor-pointer'
                        }`}>
                          <Upload className={`h-8 w-8 sm:h-10 sm:w-10 mx-auto mb-3 ${
                            uploadedImages.length >= 5 ? 'text-gray-500' : 'text-yellow-400'
                          }`} />
                          <p className={`text-sm ${
                            uploadedImages.length >= 5 ? 'text-gray-500' : 'text-white'
                          }`}>
                            {uploadedImages.length >= 5 
                              ? 'Maximum 5 images reached' 
                              : 'Click to upload images or drag and drop'}
                          </p>
                          <p className={`text-sm mt-2 ${
                            uploadedImages.length >= 5 ? 'text-gray-500' : 'text-yellow-400'
                          }`}>
                            PNG, JPG, JPEG up to 5MB each
                          </p>
                        </div>
                      </div>

                      {/* Image Preview Grid */}
                      {uploadedImages.length > 0 && (
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-4">
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
                  <div className="border-t-2 border-navy-600 pt-8 mt-8">
                    <div className="mb-8">
                      <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 bg-yellow-500/10 rounded-lg border border-yellow-500/20">
                          <CheckCircle className="h-6 w-6 text-yellow-400" />
                        </div>
                        <div>
                          <h3 className="text-2xl font-bold text-white">Donation Review</h3>
                          <p className="text-sm text-gray-400 mt-1">Please review all information before submitting</p>
                        </div>
                      </div>
                    </div>
                    
                    <div className="bg-gradient-to-br from-navy-800/50 to-navy-900/50 rounded-xl border-2 border-navy-600/50 shadow-xl overflow-hidden">
                      {/* Header Section */}
                      <div className="bg-navy-900/50 px-6 py-4 border-b-2 border-navy-700">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="text-xs text-yellow-400/70 font-semibold uppercase tracking-wider mb-2">Donation Information</div>
                            <h4 className="text-xl font-bold text-white leading-tight">{watch('title') || 'Untitled Donation'}</h4>
                          </div>
                          {watchedIsUrgent && (
                            <div className="ml-4 flex-shrink-0">
                              <span className="inline-flex items-center px-3 py-1.5 rounded-md text-xs font-bold bg-danger-900/40 text-danger-300 border border-danger-500/40 uppercase tracking-wide">
                                <AlertCircle className="h-3.5 w-3.5 mr-1.5" />
                                Urgent
                              </span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Description Section */}
                      {watch('description') && (
                        <div className="px-6 py-5 border-b border-navy-700/50">
                          <div className="text-xs text-yellow-400/70 font-semibold uppercase tracking-wider mb-2">Description</div>
                          <p className="text-sm text-gray-200 leading-relaxed whitespace-pre-wrap">{watch('description')}</p>
                        </div>
                      )}

                      {/* Details Grid */}
                      <div className="px-6 py-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                          {/* Category */}
                          <div className="space-y-2">
                            <div className="text-xs text-yellow-400/70 font-semibold uppercase tracking-wider">Category</div>
                            <div className="text-base text-white font-medium">{watch('category') || 'Not specified'}</div>
                          </div>

                          {/* Quantity */}
                          <div className="space-y-2">
                            <div className="text-xs text-yellow-400/70 font-semibold uppercase tracking-wider">Quantity</div>
                            <div className="text-base text-white font-medium">{watch('quantity') || 1} {watch('quantity') === 1 ? 'item' : 'items'}</div>
                          </div>

                          {/* Condition */}
                          <div className="space-y-2">
                            <div className="text-xs text-yellow-400/70 font-semibold uppercase tracking-wider">Item Condition</div>
                            <div className={`inline-flex items-center px-3 py-1.5 rounded-md text-sm font-medium ${
                              watchedCondition === 'new' ? 'bg-success-900/40 text-success-300 border border-success-500/40' :
                              watchedCondition === 'like_new' ? 'bg-yellow-900/40 text-yellow-300 border border-yellow-500/40' :
                              watchedCondition === 'good' ? 'bg-amber-900/40 text-amber-300 border border-amber-500/40' :
                              'bg-orange-900/40 text-orange-300 border border-orange-500/40'
                            }`}>
                              {watchedCondition && conditions.find(c => c.value === watchedCondition)?.label || 'Not specified'}
                            </div>
                          </div>

                          {/* Pickup Location */}
                          <div className="space-y-2">
                            <div className="text-xs text-yellow-400/70 font-semibold uppercase tracking-wider flex items-center gap-1.5">
                              <MapPin className="h-3.5 w-3.5" />
                              Pickup Location
                            </div>
                            <div className="text-sm text-white font-medium leading-relaxed">{watch('pickup_location') || 'Not specified'}</div>
                          </div>
                          
                          {/* Delivery Method */}
                          <div className="space-y-2">
                            <div className="text-xs text-yellow-400/70 font-semibold uppercase tracking-wider flex items-center gap-1.5">
                              {donationDestination === 'organization' ? (
                                <Package className="h-3.5 w-3.5" />
                              ) : (
                                <Users className="h-3.5 w-3.5" />
                              )}
                              Delivery Method
                            </div>
                            <div className="space-y-1">
                              <div className="text-sm text-white font-semibold">{donationDestination === 'organization' ? 'Direct to Organization' : 'To Recipients'}</div>
                              <div className="text-sm text-gray-300">
                                {watchedDeliveryMode === 'pickup' ? 'Self Pickup' : 
                                 watchedDeliveryMode === 'volunteer' ? 'Volunteer Delivery' : 
                                 watchedDeliveryMode === 'direct' ? 'Direct Delivery (by donor)' :
                                 watchedDeliveryMode === 'donor_delivery' ? 'Donor will deliver to organization' :
                                 watchedDeliveryMode === 'organization_pickup' ? 'Organization will pick up' :
                                 'Not specified'}
                              </div>
                            </div>
                          </div>

                          {/* Expiry Date */}
                          {watch('expiry_date') && (
                            <div className="space-y-2">
                              <div className="text-xs text-yellow-400/70 font-semibold uppercase tracking-wider flex items-center gap-1.5">
                                <Calendar className="h-3.5 w-3.5" />
                                Expiry Date
                              </div>
                              <div className="text-sm text-white font-medium">
                                {new Date(watch('expiry_date')).toLocaleDateString('en-US', { 
                                  year: 'numeric', 
                                  month: 'long', 
                                  day: 'numeric' 
                                })}
                              </div>
                            </div>
                          )}

                          {/* Photos */}
                          {uploadedImages.length > 0 && (
                            <div className="space-y-2">
                              <div className="text-xs text-yellow-400/70 font-semibold uppercase tracking-wider flex items-center gap-1.5">
                                <ImageIcon className="h-3.5 w-3.5" />
                                Attachments
                              </div>
                              <div className="text-sm text-white font-medium">{uploadedImages.length} image{uploadedImages.length > 1 ? 's' : ''} attached</div>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Additional Information */}
                      {(watch('pickup_instructions') || watch('tags')) && (
                        <div className="border-t border-navy-700/50">
                          {/* Pickup Instructions */}
                          {watch('pickup_instructions') && (
                            <div className="px-6 py-5 border-b border-navy-700/50">
                              <div className="text-xs text-yellow-400/70 font-semibold uppercase tracking-wider mb-2">Pickup Instructions</div>
                              <p className="text-sm text-gray-200 leading-relaxed whitespace-pre-wrap">{watch('pickup_instructions')}</p>
                            </div>
                          )}

                          {/* Tags */}
                          {watch('tags') && (
                            <div className="px-6 py-5">
                              <div className="text-xs text-yellow-400/70 font-semibold uppercase tracking-wider mb-3">Tags</div>
                              <div className="flex flex-wrap gap-2">
                                {watch('tags').split(',').map((tag, idx) => tag.trim()).filter(tag => tag).map((tag, idx) => (
                                  <span key={idx} className="inline-flex items-center px-3 py-1.5 rounded-md text-xs bg-yellow-900/30 text-yellow-300 border border-yellow-500/30 font-medium">
                                    {tag.trim()}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Navigation Buttons */}
            <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-4 mt-8 pt-6 border-t-2 border-navy-700">
              <button
                type="button"
                onClick={prevStep}
                disabled={currentStep === 1}
                className="w-full sm:w-auto px-6 py-3 bg-navy-700 hover:bg-navy-600 text-white rounded-lg text-sm font-medium transition-all flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-navy-700 shadow-lg hover:shadow-xl order-2 sm:order-1"
              >
                <ArrowLeft className="h-5 w-5" />
                <span>Previous</span>
              </button>

              {currentStep < 3 ? (
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault()
                    nextStep()
                  }}
                  className="w-full sm:w-auto px-6 sm:px-8 py-3 bg-gradient-to-r from-yellow-500 to-yellow-600 hover:from-yellow-600 hover:to-yellow-700 text-white rounded-lg text-sm font-semibold transition-all flex items-center justify-center space-x-2 shadow-lg hover:shadow-xl hover:scale-105 transform active:scale-95 order-1 sm:order-2"
                >
                  <span>Next Step</span>
                  <ArrowRight className="h-5 w-5" />
                </button>
              ) : (
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full sm:w-auto px-6 sm:px-8 py-3 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white rounded-lg text-sm font-bold transition-all flex items-center justify-center space-x-2 shadow-lg hover:shadow-xl hover:scale-105 transform active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 order-1 sm:order-2"
                >
                  {isLoading ? (
                    <>
                      <LoadingSpinner size="sm" />
                      <span>Posting...</span>
                    </>
                  ) : (
                    <>
                      <Gift className="h-5 w-5" />
                      <span>Post Donation</span>
                    </>
                  )}
                </button>
              )}
            </div>
          </form>
            </div>
          </motion.div>
        </div>

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
        {/* Workflow Guide Modal */}
        <WorkflowGuideModal
          isOpen={showWorkflowGuide}
          onClose={() => setShowWorkflowGuide(false)}
          userRole="donor"
        />
      </div>
    </div>
  )
}

export default PostDonationPage 