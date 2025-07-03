import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { useForm, Controller } from 'react-hook-form'
import { 
  Truck, 
  Calendar, 
  Clock, 
  MapPin, 
  Shield, 
  FileText, 
  CheckCircle, 
  AlertCircle,
  Star,
  Navigation,
  Phone,
  Mail,
  User,
  Camera,
  Upload,
  Trash2
} from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import { useToast } from '../../contexts/ToastContext'
import { IDVerificationBadge } from './VerificationBadge'

const VolunteerProfileSettings = ({ profileData, onUpdate, isEditing }) => {
  const { profile } = useAuth()
  const { success, error } = useToast()
  const [idImagePreview, setIdImagePreview] = useState(profileData?.primary_id_image_url || null)
  const [uploadingImage, setUploadingImage] = useState(false)

  const {
    register,
    control,
    watch,
    setValue,
    getValues,
    formState: { errors }
  } = useForm({
    defaultValues: {
      // Vehicle Information
      has_vehicle: false,
      vehicle_type: '',
      vehicle_make_model: '',
      vehicle_year: '',
      vehicle_capacity: '',
      
      // Availability
      availability_days: [],
      availability_times: [],
      max_delivery_distance: 20,
      
      // Experience and Skills
      volunteer_experience: '',
      special_skills: [],
      languages_spoken: [],
      
      // Background Check and Verification
      background_check_consent: false,
      background_check_status: 'pending',
      background_check_date: '',
      
      // Emergency Contact
      emergency_contact_name: '',
      emergency_contact_phone: '',
      emergency_contact_relationship: '',
      
      // Valid ID (Required for volunteers)
      primary_id_type: '',
      primary_id_number: '',
      primary_id_expiry: '',
      primary_id_image_url: '',
      
      // Insurance Information
      has_insurance: false,
      insurance_provider: '',
      insurance_policy_number: '',
      
      // Preferences
      preferred_delivery_types: [],
      delivery_notes: '',
      communication_preferences: []
    }
  })

  const watchedHasVehicle = watch('has_vehicle')
  const watchedHasInsurance = watch('has_insurance')
  const watchedIdType = watch('primary_id_type')

  // Sync form changes with parent component
  useEffect(() => {
    const subscription = watch((data) => {
      if (onUpdate && typeof onUpdate === 'function') {
        onUpdate(data)
      }
    })
    return () => subscription.unsubscribe()
  }, [watch, onUpdate])

  // Update form when profileData changes
  useEffect(() => {
    if (profileData) {
      const formData = {
        has_vehicle: profileData?.has_vehicle || false,
        vehicle_type: profileData?.vehicle_type || '',
        vehicle_make_model: profileData?.vehicle_make_model || '',
        vehicle_year: profileData?.vehicle_year || '',
        vehicle_capacity: profileData?.vehicle_capacity || '',
        availability_days: Array.isArray(profileData?.availability_days) ? profileData?.availability_days : [],
        availability_times: Array.isArray(profileData?.availability_times) ? profileData?.availability_times : [],
        max_delivery_distance: profileData?.max_delivery_distance || 20,
        volunteer_experience: profileData?.volunteer_experience || '',
        special_skills: Array.isArray(profileData?.special_skills) ? profileData?.special_skills : [],
        languages_spoken: Array.isArray(profileData?.languages_spoken) ? profileData?.languages_spoken : [],
        background_check_consent: profileData?.background_check_consent || false,
        background_check_status: profileData?.background_check_status || 'pending',
        background_check_date: profileData?.background_check_date || '',
        emergency_contact_name: profileData?.emergency_contact_name || '',
        emergency_contact_phone: profileData?.emergency_contact_phone || '',
        emergency_contact_relationship: profileData?.emergency_contact_relationship || '',
        primary_id_type: profileData?.primary_id_type || '',
        primary_id_number: profileData?.primary_id_number || '',
        primary_id_expiry: profileData?.primary_id_expiry || '',
        primary_id_image_url: profileData?.primary_id_image_url || '',
        has_insurance: profileData?.has_insurance || false,
        insurance_provider: profileData?.insurance_provider || '',
        insurance_policy_number: profileData?.insurance_policy_number || '',
        preferred_delivery_types: Array.isArray(profileData?.preferred_delivery_types) ? profileData?.preferred_delivery_types : [],
        delivery_notes: profileData?.delivery_notes || '',
        communication_preferences: Array.isArray(profileData?.communication_preferences) ? profileData?.communication_preferences : []
      }
      
      Object.entries(formData).forEach(([key, value]) => {
        setValue(key, value)
      })
      
      if (profileData?.primary_id_image_url) {
        setIdImagePreview(profileData.primary_id_image_url)
      }
    }
  }, [profileData, setValue])

  // Image handling functions
  const convertToBase64 = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.readAsDataURL(file)
      reader.onload = () => resolve(reader.result)
      reader.onerror = (error) => reject(error)
    })
  }

  const handleImageSelect = async (event) => {
    const file = event.target.files[0]
    if (!file) return

    // Validate file type
    if (!file.type.startsWith('image/')) {
      error('Please select a valid image file')
      return
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      error('Image size must be less than 5MB')
      return
    }

    try {
      setUploadingImage(true)
      
      // Convert to base64
      const base64String = await convertToBase64(file)
      
      // Set preview and update data
      setIdImagePreview(base64String)
      setValue('primary_id_image_url', base64String)
      
      success('ID image uploaded successfully!')
    } catch (err) {
      console.error('Error processing image:', err)
      error('Failed to process image. Please try again.')
    } finally {
      setUploadingImage(false)
    }
  }

  const removeIdImage = () => {
    setIdImagePreview(null)
    setValue('primary_id_image_url', null)
  }



  const getCompletionPercentage = () => {
    const requiredFields = [
      'availability_days',
      'availability_times',
      'background_check_consent',
      'emergency_contact_name',
      'emergency_contact_phone',
      'primary_id_type',
      'primary_id_number',
      'primary_id_image_url'
    ]
    
    const completedFields = requiredFields.filter(field => {
      const value = getValues(field)
      if (Array.isArray(value)) return value.length > 0
      if (typeof value === 'boolean') return true
      return value && value !== ''
    })
    
    return Math.round((completedFields.length / requiredFields.length) * 100)
  }

  const vehicleTypes = [
    { value: 'sedan', label: 'Sedan' },
    { value: 'suv', label: 'SUV' },
    { value: 'truck', label: 'Pickup Truck' },
    { value: 'van', label: 'Van' },
    { value: 'motorcycle', label: 'Motorcycle' },
    { value: 'bicycle', label: 'Bicycle' },
    { value: 'other', label: 'Other' }
  ]

  const dayOptions = [
    'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'
  ]

  const timeSlots = [
    'Early Morning (6-9 AM)',
    'Morning (9-12 PM)',
    'Afternoon (12-3 PM)',
    'Late Afternoon (3-6 PM)',
    'Evening (6-9 PM)',
    'Night (9 PM-12 AM)'
  ]

  const specialSkills = [
    'Heavy Lifting',
    'Fragile Items Handling',
    'Medical Equipment',
    'Food Safety',
    'Electronics',
    'Furniture Assembly',
    'Translation Services',
    'Senior Care Experience'
  ]

  const languages = [
    'English', 'Filipino', 'Cebuano', 'Hiligaynon', 'Waray', 'Bikol', 'Kapampangan'
  ]

  const deliveryTypes = [
    'Food Items',
    'Clothing',
    'Electronics',
    'Furniture',
    'Medical Supplies',
    'Books/Educational',
    'Toys',
    'Household Items'
  ]

  const communicationPrefs = [
    'SMS/Text', 'Phone Calls', 'Email', 'In-App Messages', 'WhatsApp'
  ]

  const validIdTypes = [
    { value: 'drivers_license', label: "Driver's License (Required)" },
    { value: 'philsys_id', label: 'PhilSys ID' },
    { value: 'passport', label: 'Passport' },
    { value: 'sss_umid', label: 'SSS UMID' },
    { value: 'voters_id', label: "Voter's ID" }
  ]

  const completionPercentage = getCompletionPercentage()

  if (!isEditing) {
    return (
      <div className="space-y-6">

        {/* Vehicle Information Display */}
        <div className="card p-6">
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <Truck className="h-5 w-5 text-skyblue-500" />
            Vehicle Information
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm text-skyblue-300">Has Vehicle</label>
              <p className="text-white">{watchedHasVehicle ? 'Yes' : 'No'}</p>
            </div>
            {watchedHasVehicle && (
              <>
                <div>
                  <label className="text-sm text-skyblue-300">Vehicle Type</label>
                  <p className="text-white">{getValues('vehicle_type') || 'Not specified'}</p>
                </div>
                <div>
                  <label className="text-sm text-skyblue-300">Make & Model</label>
                  <p className="text-white">{getValues('vehicle_make_model') || 'Not specified'}</p>
                </div>
                <div>
                  <label className="text-sm text-skyblue-300">Max Delivery Distance</label>
                  <p className="text-white">{getValues('max_delivery_distance')} km</p>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Availability Display */}
        <div className="card p-6">
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <Calendar className="h-5 w-5 text-skyblue-500" />
            Availability
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm text-skyblue-300">Available Days</label>
              <p className="text-white">
                {getValues('availability_days')?.length ? 
                  getValues('availability_days').join(', ') : 
                  'Not specified'
                }
              </p>
            </div>
            <div>
              <label className="text-sm text-skyblue-300">Available Times</label>
              <p className="text-white">
                {getValues('availability_times')?.length ? 
                  getValues('availability_times').join(', ') : 
                  'Not specified'
                }
              </p>
            </div>
          </div>
        </div>

        {/* Valid ID Information */}
        <div className="card p-6">
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-skyblue-500" />
              Valid ID Requirements
            </div>
            <IDVerificationBadge
              idStatus={profileData?.id_verification_status || profile?.id_verification_status}
              hasIdUploaded={getValues('primary_id_type') && getValues('primary_id_number')}
              size="sm"
              showText={true}
              showDescription={false}
            />
          </h3>
          
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm text-skyblue-300">ID Type</label>
                <p className="text-white">{getValues('primary_id_type') || 'Not specified'}</p>
              </div>
              <div>
                <label className="text-sm text-skyblue-300">ID Number</label>
                <p className="text-white">{getValues('primary_id_number') || 'Not specified'}</p>
              </div>
            </div>
            
            {getValues('primary_id_expiry') && (
              <div>
                <label className="text-sm text-skyblue-300">Expiry Date</label>
                <p className="text-white">{new Date(getValues('primary_id_expiry')).toLocaleDateString()}</p>
              </div>
            )}

            {idImagePreview && (
              <div>
                <label className="text-sm text-skyblue-300 mb-2 block">ID Image</label>
                <img
                  src={idImagePreview}
                  alt="ID"
                  className="w-full max-w-md h-32 object-cover rounded-lg border-2 border-navy-600"
                />
              </div>
            )}

            {/* Verification Status Details */}
            <div className="bg-navy-800/30 border border-navy-600 rounded-lg p-3">
              <h4 className="text-sm font-medium text-white mb-2">Verification Status</h4>
              <div className="space-y-2 text-xs">
                <div className="flex items-center gap-2">
                  {getValues('primary_id_type') === 'drivers_license' && getValues('primary_id_number') ? (
                    <CheckCircle className="h-3 w-3 text-green-400" />
                  ) : (
                    <div className="h-3 w-3 rounded-full border border-gray-400"></div>
                  )}
                  <span className={getValues('primary_id_type') === 'drivers_license' && getValues('primary_id_number') ? 'text-green-300' : 'text-gray-400'}>
                    Driver's License Information
                  </span>
                </div>
                
                <div className="flex items-center gap-2">
                  {(profileData?.id_verification_status || profile?.id_verification_status) === 'verified' || 
                   false ? (
                    <CheckCircle className="h-3 w-3 text-green-400" />
                  ) : (profileData?.id_verification_status || profile?.id_verification_status) === 'pending' ? (
                    <div className="h-3 w-3 rounded-full border-2 border-yellow-400 flex items-center justify-center">
                      <div className="h-1 w-1 rounded-full bg-yellow-400"></div>
                    </div>
                  ) : (
                    <div className="h-3 w-3 rounded-full border border-gray-400"></div>
                  )}
                  <span className={
                    (profileData?.id_verification_status || profile?.id_verification_status) === 'verified' || 
                    false 
                      ? 'text-green-300' 
                      : (profileData?.id_verification_status || profile?.id_verification_status) === 'pending' 
                        ? 'text-yellow-300' 
                        : 'text-gray-400'
                  }>
                    Admin Verification
                  </span>
                </div>
              </div>
              
              <p className="text-xs text-skyblue-300 mt-2">
                {(() => {
                  const hasIdUploaded = getValues('primary_id_type') && getValues('primary_id_number')
                  const idStatus = profileData?.id_verification_status || profile?.id_verification_status
                  
                  if (!hasIdUploaded) {
                    return 'Please provide your driver\'s license information.'
                  } else if (idStatus === 'pending') {
                    return 'Your ID is being reviewed by our admin team.'
                  } else if (idStatus === 'verified') {
                    return 'Your ID has been verified. You can now accept delivery tasks.'
                  } else if (idStatus === 'rejected') {
                    return 'ID verification failed. Please contact support.'
                  } else {
                    return 'Awaiting admin verification.'
                  }
                })()}
              </p>
            </div>
          </div>
        </div>

        {/* Verification Status */}
        <div className="card p-6">
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <Shield className="h-5 w-5 text-skyblue-500" />
            Background Check Status
          </h3>
          <div className="flex items-center gap-2">
            {getValues('background_check_consent') ? (
              <CheckCircle className="h-4 w-4 text-green-400" />
            ) : (
              <AlertCircle className="h-4 w-4 text-yellow-400" />
            )}
            <span className="text-white">
              {getValues('background_check_consent') ? 'Consent Given' : 'Consent Required'}
            </span>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Vehicle Information Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="card p-6"
      >
        <h3 className="text-lg font-semibold text-white mb-6 flex items-center gap-2">
          <Truck className="h-5 w-5 text-skyblue-500" />
          Vehicle Information
        </h3>

        <div className="space-y-4">
          {/* Has Vehicle */}
          <div>
            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={watchedHasVehicle}
                onChange={(e) => setValue('has_vehicle', e.target.checked)}
                className="rounded border-navy-600 bg-navy-800 text-skyblue-500 focus:ring-skyblue-500"
              />
              <span className="text-white">I have access to a vehicle for deliveries</span>
            </label>
          </div>

          {watchedHasVehicle && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="space-y-4 pl-6 border-l border-navy-600"
            >
              {/* Vehicle Type */}
              <div>
                <label className="block text-sm text-skyblue-300 mb-2">Vehicle Type *</label>
                <select
                  {...register('vehicle_type', { 
                    required: watchedHasVehicle ? 'Vehicle type is required' : false 
                  })}
                  className="w-full px-3 py-2 bg-navy-800 border border-navy-600 rounded-lg text-white focus:border-skyblue-500 focus:outline-none"
                >
                  <option value="">Select vehicle type</option>
                  {vehicleTypes.map(type => (
                    <option key={type.value} value={type.value}>{type.label}</option>
                  ))}
                </select>
                {errors.vehicle_type && (
                  <p className="mt-1 text-sm text-red-400">{errors.vehicle_type.message}</p>
                )}
              </div>

              {/* Vehicle Details */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div>
                <label className="block text-sm text-skyblue-300 mb-2">Make & Model</label>
                <input
                  {...register('vehicle_make_model')}
                  type="text"
                  placeholder="e.g., Toyota Vios"
                  className="w-full px-3 py-2 bg-navy-800 border border-navy-600 rounded-lg text-white placeholder-skyblue-400 focus:border-skyblue-500 focus:outline-none"
                />
              </div>
                              <div>
                <label className="block text-sm text-skyblue-300 mb-2">Year</label>
                <input
                  {...register('vehicle_year')}
                  type="number"
                  placeholder="2020"
                  min="1990"
                  max="2025"
                  className="w-full px-3 py-2 bg-navy-800 border border-navy-600 rounded-lg text-white placeholder-skyblue-400 focus:border-skyblue-500 focus:outline-none"
                />
              </div>
              </div>

              {/* Cargo Capacity */}
              <div>
                <label className="block text-sm text-skyblue-300 mb-2">Cargo Capacity</label>
                <select
                  {...register('vehicle_capacity')}
                  className="w-full px-3 py-2 bg-navy-800 border border-navy-600 rounded-lg text-white focus:border-skyblue-500 focus:outline-none"
                >
                  <option value="">Select capacity</option>
                  <option value="small">Small (1-2 boxes)</option>
                  <option value="medium">Medium (3-5 boxes)</option>
                  <option value="large">Large (6+ boxes or furniture)</option>
                </select>
              </div>

              {/* Insurance */}
              <div>
                <label className="flex items-center gap-3 mb-2">
                  <input
                    type="checkbox"
                    checked={watchedHasInsurance}
                    onChange={(e) => setValue('has_insurance', e.target.checked)}
                    className="rounded border-navy-600 bg-navy-800 text-skyblue-500 focus:ring-skyblue-500"
                  />
                  <span className="text-white">Vehicle has valid insurance</span>
                </label>

                {watchedHasInsurance && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
                    <input
                      type="text"
                      value={getValues('insurance_provider')}
                      onChange={(e) => setValue('insurance_provider', e.target.value)}
                      placeholder="Insurance provider"
                      className="px-3 py-2 bg-navy-800 border border-navy-600 rounded-lg text-white placeholder-skyblue-400 focus:border-skyblue-500 focus:outline-none"
                    />
                    <input
                      type="text"
                      value={getValues('insurance_policy_number')}
                      onChange={(e) => setValue('insurance_policy_number', e.target.value)}
                      placeholder="Policy number"
                      className="px-3 py-2 bg-navy-800 border border-navy-600 rounded-lg text-white placeholder-skyblue-400 focus:border-skyblue-500 focus:outline-none"
                    />
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {/* Max Delivery Distance */}
          <div>
            <label className="block text-sm text-skyblue-300 mb-2">
              Maximum Delivery Distance *
            </label>
            <div className="flex items-center gap-3">
              <input
                type="range"
                min="5"
                max="100"
                value={getValues('max_delivery_distance')}
                onChange={(e) => setValue('max_delivery_distance', parseInt(e.target.value))}
                className="flex-1 h-2 bg-navy-700 rounded-lg appearance-none cursor-pointer"
              />
              <span className="text-white font-medium w-16 text-center">
                {getValues('max_delivery_distance')} km
              </span>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Availability Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="card p-6"
      >
        <h3 className="text-lg font-semibold text-white mb-6 flex items-center gap-2">
          <Calendar className="h-5 w-5 text-skyblue-500" />
          Availability Schedule
        </h3>

        <div className="space-y-6">
          {/* Available Days */}
          <div>
            <label className="block text-sm text-skyblue-300 mb-3">Available Days *</label>
            <Controller
              name="availability_days"
              control={control}
              rules={{ required: 'Please select at least one available day' }}
              render={({ field: { value = [], onChange } }) => (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {dayOptions.map(day => (
                    <label key={day} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={value.includes(day)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            onChange([...value, day])
                          } else {
                            onChange(value.filter(item => item !== day))
                          }
                        }}
                        className="rounded border-navy-600 bg-navy-800 text-skyblue-500 focus:ring-skyblue-500"
                      />
                      <span className="text-white text-sm">{day}</span>
                    </label>
                  ))}
                </div>
              )}
            />
            {errors.availability_days && (
              <p className="mt-1 text-sm text-red-400">{errors.availability_days.message}</p>
            )}
          </div>

          {/* Available Times */}
          <div>
            <label className="block text-sm text-skyblue-300 mb-3">Available Time Slots *</label>
            <Controller
              name="availability_times"
              control={control}
              rules={{ required: 'Please select at least one available time slot' }}
              render={({ field: { value = [], onChange } }) => (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {timeSlots.map(slot => (
                    <label key={slot} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={value.includes(slot)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            onChange([...value, slot])
                          } else {
                            onChange(value.filter(item => item !== slot))
                          }
                        }}
                        className="rounded border-navy-600 bg-navy-800 text-skyblue-500 focus:ring-skyblue-500"
                      />
                      <span className="text-white text-sm">{slot}</span>
                    </label>
                  ))}
                </div>
              )}
            />
            {errors.availability_times && (
              <p className="mt-1 text-sm text-red-400">{errors.availability_times.message}</p>
            )}
          </div>
        </div>
      </motion.div>

      {/* Valid ID Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="card p-6"
      >
        <h3 className="text-lg font-semibold text-white mb-6 flex items-center gap-2">
          <FileText className="h-5 w-5 text-skyblue-500" />
          Valid ID (Required for Volunteers)
        </h3>

        <div className="space-y-4">
          <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-yellow-400 mt-0.5 flex-shrink-0" />
              <div>
                <h4 className="text-yellow-400 font-medium mb-1">Driver's License Required</h4>
                <p className="text-sm text-yellow-300">
                  All volunteers must have a valid driver's license to participate in delivery activities.
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                <label className="block text-sm text-skyblue-300 mb-2">ID Type *</label>
                <select
                  {...register('primary_id_type', { 
                    validate: {
                      requiredWithNumber: (value, formValues) => {
                        const idNumber = formValues.primary_id_number
                        if (idNumber && idNumber.trim().length > 0 && (!value || value.trim().length === 0)) {
                          return 'ID type is required when ID number is provided'
                        }
                        if (value && value !== 'drivers_license') {
                          return 'Volunteers must have a valid Driver\'s License'
                        }
                        return true
                      }
                    }
                  })}
                  className="w-full px-3 py-2 bg-navy-800 border border-navy-600 rounded-lg text-white focus:border-skyblue-500 focus:outline-none"
                >
                  <option value="">Select ID type</option>
                  {validIdTypes.map(type => (
                    <option key={type.value} value={type.value}>{type.label}</option>
                  ))}
                </select>
                {errors.primary_id_type && (
                  <p className="mt-1 text-sm text-red-400">{errors.primary_id_type.message}</p>
                )}
              </div>
                          <div>
                <label className="block text-sm text-skyblue-300 mb-2">ID Number *</label>
                <input
                  {...register('primary_id_number', { 
                    validate: {
                      requiredWithType: (value, formValues) => {
                        const idType = formValues.primary_id_type
                        if (idType && idType.trim().length > 0 && (!value || value.trim().length === 0)) {
                          return 'ID number is required when ID type is selected'
                        }
                        if (value && value.trim().length > 0) {
                          if (value.trim().length < 5) {
                            return 'ID number must be at least 5 characters'
                          }
                          if (value.trim().length > 20) {
                            return 'ID number must be less than 20 characters'
                          }
                        }
                        return true
                      }
                    }
                  })}
                  type="text"
                  placeholder="Enter ID number"
                  className="w-full px-3 py-2 bg-navy-800 border border-navy-600 rounded-lg text-white placeholder-skyblue-400 focus:border-skyblue-500 focus:outline-none"
                />
                {errors.primary_id_number && (
                  <p className="mt-1 text-sm text-red-400">{errors.primary_id_number.message}</p>
                )}
              </div>
          </div>

          <div>
            <label className="block text-sm text-skyblue-300 mb-2">ID Expiry Date</label>
            <input
              {...register('primary_id_expiry')}
              type="date"
              className="w-full px-3 py-2 bg-navy-800 border border-navy-600 rounded-lg text-white focus:border-skyblue-500 focus:outline-none"
            />
          </div>

          {/* ID Image Upload */}
          <div>
            <label className="block text-sm text-skyblue-300 mb-2">ID Image *</label>
            <input
              {...register('primary_id_image_url', { 
                validate: {
                  optionalForEdit: () => true // Make ID image optional for editing
                } 
              })}
              type="hidden"
            />
            <div className="space-y-4">
              {idImagePreview ? (
                <div className="relative">
                  <img
                    src={idImagePreview}
                    alt="ID Preview"
                    className="w-full max-w-md h-48 object-cover rounded-lg border-2 border-navy-600"
                  />
                  <button
                    onClick={removeIdImage}
                    className="absolute top-2 right-2 p-2 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ) : (
                <div className="border-2 border-dashed border-navy-600 rounded-lg p-8 text-center">
                  <Camera className="h-12 w-12 text-skyblue-500 mx-auto mb-4" />
                  <p className="text-white mb-2">Upload ID Image</p>
                  <p className="text-sm text-skyblue-300 mb-4">
                    Take a clear photo of your driver's license or ID
                  </p>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageSelect}
                    className="hidden"
                    id="id-upload"
                  />
                  <label
                    htmlFor="id-upload"
                    className="btn-secondary inline-flex items-center gap-2 cursor-pointer"
                  >
                    {uploadingImage ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-skyblue-500"></div>
                        Uploading...
                      </>
                    ) : (
                      <>
                        <Upload className="h-4 w-4" />
                        Choose Image
                      </>
                    )}
                  </label>
                </div>
              )}
              <p className="text-xs text-skyblue-400">
                Maximum file size: 5MB. Supported formats: JPG, PNG, GIF
              </p>
              {errors.primary_id_image_url && (
                <p className="mt-1 text-sm text-red-400">{errors.primary_id_image_url.message}</p>
              )}
            </div>
          </div>
        </div>
      </motion.div>

      {/* Background Check Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="card p-6"
      >
        <h3 className="text-lg font-semibold text-white mb-6 flex items-center gap-2">
          <Shield className="h-5 w-5 text-skyblue-500" />
          Background Check & Verification
        </h3>

        <div className="space-y-4">
          <div>
            <label className="flex items-start gap-3">
              <input
                type="checkbox"
                checked={getValues('background_check_consent')}
                onChange={(e) => setValue('background_check_consent', e.target.checked)}
                className="rounded border-navy-600 bg-navy-800 text-skyblue-500 focus:ring-skyblue-500 mt-1"
              />
              <div>
                <span className="text-white block">I consent to a background check *</span>
                <span className="text-sm text-skyblue-300">
                  This helps ensure the safety of all community members participating in HopeLink
                </span>
              </div>
            </label>
          </div>

          {getValues('background_check_consent') && (
            <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-4">
              <div className="flex items-center gap-3">
                <CheckCircle className="h-5 w-5 text-green-400" />
                <div>
                  <h4 className="text-green-400 font-medium">Background Check Consent Given</h4>
                  <p className="text-sm text-green-300">
                    Thank you for your consent. A background check will be conducted as part of the volunteer verification process.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </motion.div>

      {/* Emergency Contact Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="card p-6"
      >
        <h3 className="text-lg font-semibold text-white mb-6 flex items-center gap-2">
          <Phone className="h-5 w-5 text-skyblue-500" />
          Emergency Contact
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm text-skyblue-300 mb-2">Contact Name *</label>
            <input
              {...register('emergency_contact_name', { 
                validate: {
                  validIfProvided: (value) => {
                    if (value && value.trim().length > 0) {
                      if (value.trim().length < 2) {
                        return 'Name must be at least 2 characters'
                      }
                      if (!/^[a-zA-Z\s\-'.]+$/.test(value)) {
                        return 'Name can only contain letters, spaces, hyphens, apostrophes, and periods'
                      }
                    }
                    return true
                  }
                }
              })}
              type="text"
              placeholder="Full name"
              className="w-full px-3 py-2 bg-navy-800 border border-navy-600 rounded-lg text-white placeholder-skyblue-400 focus:border-skyblue-500 focus:outline-none"
            />
            {errors.emergency_contact_name && (
              <p className="mt-1 text-sm text-red-400">{errors.emergency_contact_name.message}</p>
            )}
          </div>
          <div>
            <label className="block text-sm text-skyblue-300 mb-2">Contact Phone *</label>
            <input
              {...register('emergency_contact_phone', { 
                validate: {
                  validFormat: (value) => {
                    if (value && value.trim().length > 0) {
                      const phoneRegex = /^(09|\+639)\d{9}$/
                      if (!phoneRegex.test(value)) {
                        return 'Please enter a valid Philippines phone number (e.g., 09123456789 or +639123456789)'
                      }
                      if (value === '09000000000') {
                        return 'Please enter an actual phone number'
                      }
                    }
                    return true
                  }
                }
              })}
              type="tel"
              placeholder="09123456789 or +639123456789"
              maxLength="13"
              className="w-full px-3 py-2 bg-navy-800 border border-navy-600 rounded-lg text-white placeholder-skyblue-400 focus:border-skyblue-500 focus:outline-none"
            />
            {errors.emergency_contact_phone && (
              <p className="mt-1 text-sm text-red-400">{errors.emergency_contact_phone.message}</p>
            )}
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm text-skyblue-300 mb-2">Relationship</label>
            <select
              value={getValues('emergency_contact_relationship')}
              onChange={(e) => setValue('emergency_contact_relationship', e.target.value)}
              className="w-full px-3 py-2 bg-navy-800 border border-navy-600 rounded-lg text-white focus:border-skyblue-500 focus:outline-none"
            >
              <option value="">Select relationship</option>
              <option value="spouse">Spouse</option>
              <option value="parent">Parent</option>
              <option value="sibling">Sibling</option>
              <option value="child">Child</option>
              <option value="friend">Friend</option>
              <option value="other">Other</option>
            </select>
          </div>
        </div>
      </motion.div>

      {/* Experience and Skills Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="card p-6"
      >
        <h3 className="text-lg font-semibold text-white mb-6 flex items-center gap-2">
          <Star className="h-5 w-5 text-skyblue-500" />
          Experience & Skills
        </h3>

        <div className="space-y-6">
          {/* Volunteer Experience */}
          <div>
            <label className="block text-sm text-skyblue-300 mb-2">
              Previous Volunteer Experience
            </label>
            <textarea
              value={getValues('volunteer_experience')}
              onChange={(e) => setValue('volunteer_experience', e.target.value)}
              placeholder="Describe any previous volunteer work or relevant experience..."
              className="w-full px-3 py-2 bg-navy-800 border border-navy-600 rounded-lg text-white placeholder-skyblue-400 focus:border-skyblue-500 focus:outline-none"
              rows={3}
            />
          </div>

          {/* Special Skills */}
          <div>
            <label className="block text-sm text-skyblue-300 mb-3">Special Skills</label>
            <Controller
              name="special_skills"
              control={control}
              render={({ field: { value = [], onChange } }) => (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {specialSkills.map(skill => (
                    <label key={skill} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={value.includes(skill)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            onChange([...value, skill])
                          } else {
                            onChange(value.filter(item => item !== skill))
                          }
                        }}
                        className="rounded border-navy-600 bg-navy-800 text-skyblue-500 focus:ring-skyblue-500"
                      />
                      <span className="text-white text-sm">{skill}</span>
                    </label>
                  ))}
                </div>
              )}
            />
          </div>

          {/* Languages */}
          <div>
            <label className="block text-sm text-skyblue-300 mb-3">Languages Spoken</label>
            <Controller
              name="languages_spoken"
              control={control}
              render={({ field: { value = [], onChange } }) => (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {languages.map(language => (
                    <label key={language} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={value.includes(language)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            onChange([...value, language])
                          } else {
                            onChange(value.filter(item => item !== language))
                          }
                        }}
                        className="rounded border-navy-600 bg-navy-800 text-skyblue-500 focus:ring-skyblue-500"
                      />
                      <span className="text-white text-sm">{language}</span>
                    </label>
                  ))}
                </div>
              )}
            />
          </div>
        </div>
      </motion.div>

      {/* Preferences Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
        className="card p-6"
      >
        <h3 className="text-lg font-semibold text-white mb-6 flex items-center gap-2">
          <User className="h-5 w-5 text-skyblue-500" />
          Delivery Preferences
        </h3>

        <div className="space-y-6">
          {/* Preferred Delivery Types */}
          <div>
            <label className="block text-sm text-skyblue-300 mb-3">
              Preferred Delivery Types
            </label>
            <Controller
              name="preferred_delivery_types"
              control={control}
              render={({ field: { value = [], onChange } }) => (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {deliveryTypes.map(type => (
                    <label key={type} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={value.includes(type)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            onChange([...value, type])
                          } else {
                            onChange(value.filter(item => item !== type))
                          }
                        }}
                        className="rounded border-navy-600 bg-navy-800 text-skyblue-500 focus:ring-skyblue-500"
                      />
                      <span className="text-white text-sm">{type}</span>
                    </label>
                  ))}
                </div>
              )}
            />
          </div>

          {/* Communication Preferences */}
          <div>
            <label className="block text-sm text-skyblue-300 mb-3">
              Preferred Communication Methods
            </label>
            <Controller
              name="communication_preferences"
              control={control}
              render={({ field: { value = [], onChange } }) => (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {communicationPrefs.map(pref => (
                    <label key={pref} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={value.includes(pref)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            onChange([...value, pref])
                          } else {
                            onChange(value.filter(item => item !== pref))
                          }
                        }}
                        className="rounded border-navy-600 bg-navy-800 text-skyblue-500 focus:ring-skyblue-500"
                      />
                      <span className="text-white text-sm">{pref}</span>
                    </label>
                  ))}
                </div>
              )}
            />
          </div>

          {/* Additional Notes */}
          <div>
            <label className="block text-sm text-skyblue-300 mb-2">
              Additional Notes
            </label>
            <textarea
              value={getValues('delivery_notes')}
              onChange={(e) => setValue('delivery_notes', e.target.value)}
              placeholder="Any additional information about your availability, preferences, or special circumstances..."
              className="w-full px-3 py-2 bg-navy-800 border border-navy-600 rounded-lg text-white placeholder-skyblue-400 focus:border-skyblue-500 focus:outline-none"
              rows={3}
            />
          </div>
        </div>
      </motion.div>
    </div>
  )
}

export default VolunteerProfileSettings 