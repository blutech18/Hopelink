import React, { useState, useEffect, forwardRef, useImperativeHandle } from 'react'
import { motion } from 'framer-motion'
import { useForm, Controller } from 'react-hook-form'
import { 
  FileText, 
  CheckCircle, 
  AlertCircle,
  Star,
  Navigation,
  User,
  Mail,
  Camera,
  Upload,
  Trash2
} from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import { useToast } from '../../contexts/ToastContext'
import { IDVerificationBadge } from './VerificationBadge'

const VolunteerProfileSettings = forwardRef(({ profileData, onUpdate, isEditing }, ref) => {
  const { profile } = useAuth()
  const { success, error } = useToast()
  const [idImagePreview, setIdImagePreview] = useState(profileData?.primary_id_image_url || null)
  const [uploadingImage, setUploadingImage] = useState(false)
  const [originalValues, setOriginalValues] = useState(null)

  const {
    register,
    control,
    watch,
    setValue,
    getValues,
    reset,
    formState: { errors }
  } = useForm({
    defaultValues: {
      // Experience and Skills
      volunteer_experience: '',
      special_skills: [],
      languages_spoken: [],
      
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

  const watchedHasInsurance = watch('has_insurance')
  const watchedIdType = watch('primary_id_type')

  // Sync form changes with parent component
  useEffect(() => {
    const subscription = watch((data) => {
      if (onUpdate && typeof onUpdate === 'function') {
        // Pass both current data and original values for comparison
        onUpdate(data, originalValues)
      }
    })
    return () => subscription.unsubscribe()
  }, [watch, onUpdate, originalValues])

  // Update form when profileData changes
  useEffect(() => {
    if (profileData) {
      const formData = {
        volunteer_experience: profileData?.volunteer_experience || '',
        special_skills: Array.isArray(profileData?.special_skills) ? profileData?.special_skills : [],
        languages_spoken: Array.isArray(profileData?.languages_spoken) ? profileData?.languages_spoken : [],
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
      
      // Store original values for comparison
      setOriginalValues({ ...formData })
      
      Object.entries(formData).forEach(([key, value]) => {
        setValue(key, value)
      })
      
      if (profileData?.primary_id_image_url) {
        setIdImagePreview(profileData.primary_id_image_url)
      }
    }
  }, [profileData, setValue])

  // Expose resetForm method to parent via ref
  useImperativeHandle(ref, () => ({
    resetForm: () => {
      // Reset form to original values
      if (originalValues) {
        reset(originalValues)
        // Notify parent that form has been reset
        if (onUpdate) {
          onUpdate(originalValues, originalValues)
        }
      } else if (profileData) {
        // If no original values stored, reload from profileData
        const formData = {
          volunteer_experience: profileData?.volunteer_experience || '',
          special_skills: Array.isArray(profileData?.special_skills) ? profileData?.special_skills : [],
          languages_spoken: Array.isArray(profileData?.languages_spoken) ? profileData?.languages_spoken : [],
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
        reset(formData)
        setOriginalValues({ ...formData })
        if (onUpdate) {
          onUpdate(formData, formData)
        }
      }
    }
  }), [originalValues, profileData, onUpdate, reset])

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
        {/* Valid ID Information */}
        <div className="card p-6">
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-yellow-400" />
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
                <label className="text-sm text-yellow-300">ID Type</label>
                <p className={getValues('primary_id_type') ? 'text-white' : 'text-gray-400 italic'}>
                  {getValues('primary_id_type') || 'Not specified'}
                </p>
              </div>
              <div>
                <label className="text-sm text-yellow-300">ID Number</label>
                <p className={getValues('primary_id_number') ? 'text-white' : 'text-gray-400 italic'}>
                  {getValues('primary_id_number') || 'Not specified'}
                </p>
              </div>
            </div>
            
            {getValues('primary_id_expiry') && (
              <div>
                <label className="text-sm text-yellow-300">Expiry Date</label>
                <p className="text-white">{new Date(getValues('primary_id_expiry')).toLocaleDateString()}</p>
              </div>
            )}

            {idImagePreview && (
              <div>
                <label className="text-sm text-yellow-300 mb-2 block">ID Image</label>
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
              
              <p className="text-xs text-yellow-300 mt-2">
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
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Valid ID Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="card p-6"
      >
        <div className="border-b border-navy-700 pb-4 mb-6">
          <h3 className="text-xl font-semibold text-white flex items-center">
            <FileText className="h-5 w-5 text-yellow-400 mr-2" />
            Valid ID (Required for Volunteers)
        </h3>
          <p className="text-sm text-yellow-300 mt-1">Upload your driver's license for verification</p>
          </div>

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
                <label className="block text-sm text-yellow-300 mb-2">ID Type *</label>
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
                  className="w-full px-3 py-2 bg-navy-800 border border-navy-600 rounded-lg text-white focus:border-yellow-400 focus:outline-none"
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
                <label className="block text-sm text-yellow-300 mb-2">ID Number *</label>
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
                  className="w-full px-3 py-2 bg-navy-800 border border-navy-600 rounded-lg text-white placeholder-gray-400 focus:border-yellow-400 focus:outline-none"
                />
                {errors.primary_id_number && (
                  <p className="mt-1 text-sm text-red-400">{errors.primary_id_number.message}</p>
                )}
              </div>
          </div>

          <div>
            <label className="block text-sm text-yellow-300 mb-2">ID Expiry Date</label>
            <input
              {...register('primary_id_expiry')}
              type="date"
              className="w-full px-3 py-2 bg-navy-800 border border-navy-600 rounded-lg text-white focus:border-yellow-400 focus:outline-none"
            />
          </div>

          {/* ID Image Upload */}
          <div>
            <label className="block text-sm text-yellow-300 mb-2">ID Image *</label>
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
                  <Camera className="h-12 w-12 text-yellow-400 mx-auto mb-4" />
                  <p className="text-white mb-2">Upload ID Image</p>
                  <p className="text-sm text-yellow-300 mb-4">
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
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-yellow-400"></div>
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
              <p className="text-xs text-yellow-400">
                Maximum file size: 5MB. Supported formats: JPG, PNG, GIF
              </p>
              {errors.primary_id_image_url && (
                <p className="mt-1 text-sm text-red-400">{errors.primary_id_image_url.message}</p>
              )}
            </div>
          </div>
        </div>
      </motion.div>

      {/* Experience and Skills Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="card p-6"
      >
        <div className="border-b border-navy-700 pb-4 mb-6">
          <h3 className="text-xl font-semibold text-white flex items-center">
            <Star className="h-5 w-5 text-yellow-400 mr-2" />
          Experience & Skills
        </h3>
          <p className="text-sm text-yellow-300 mt-1">Share your volunteer experience and special skills</p>
        </div>

        <div className="space-y-6">
          {/* Volunteer Experience */}
          <div>
            <label className="block text-sm text-yellow-300 mb-2">
              Previous Volunteer Experience
            </label>
            <textarea
              {...register('volunteer_experience')}
              placeholder="Describe any previous volunteer work or relevant experience..."
              className="w-full px-3 py-2 bg-navy-800 border border-navy-600 rounded-lg text-white placeholder-gray-400 focus:border-yellow-400 focus:outline-none"
              rows={3}
            />
          </div>

          {/* Special Skills */}
          <div>
            <label className="block text-sm text-yellow-300 mb-3">Special Skills</label>
            <Controller
              name="special_skills"
              control={control}
              render={({ field: { value = [], onChange } }) => (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                  {specialSkills.map(skill => (
                    <button
                      key={skill}
                      type="button"
                      onClick={() => {
                        if (value.includes(skill)) {
                            onChange(value.filter(item => item !== skill))
                        } else {
                          onChange([...value, skill])
                          }
                        }}
                      className={`h-16 w-full rounded-lg border-2 transition-all flex items-center gap-2 px-3 ${
                        value.includes(skill)
                          ? 'border-blue-400 bg-blue-500/20 text-white'
                          : 'border-navy-700 bg-navy-800/50 text-gray-300 hover:border-blue-400/50 hover:bg-navy-700/50'
                      }`}
                    >
                      <span className="text-xs font-medium truncate">{skill}</span>
                    </button>
                  ))}
                </div>
              )}
            />
          </div>

          {/* Languages */}
          <div>
            <label className="block text-sm text-yellow-300 mb-3">Languages Spoken</label>
            <Controller
              name="languages_spoken"
              control={control}
              render={({ field: { value = [], onChange } }) => (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                  {languages.map(language => (
                    <button
                      key={language}
                      type="button"
                      onClick={() => {
                        if (value.includes(language)) {
                            onChange(value.filter(item => item !== language))
                        } else {
                          onChange([...value, language])
                          }
                        }}
                      className={`h-16 w-full rounded-lg border-2 transition-all flex items-center gap-2 px-3 ${
                        value.includes(language)
                          ? 'border-blue-400 bg-blue-500/20 text-white'
                          : 'border-navy-700 bg-navy-800/50 text-gray-300 hover:border-blue-400/50 hover:bg-navy-700/50'
                      }`}
                    >
                      <span className="text-xs font-medium truncate">{language}</span>
                    </button>
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
        transition={{ delay: 0.3 }}
        className="card p-6"
      >
        <div className="border-b border-navy-700 pb-4 mb-6">
          <h3 className="text-xl font-semibold text-white flex items-center">
            <User className="h-5 w-5 text-yellow-400 mr-2" />
          Delivery Preferences
        </h3>
          <p className="text-sm text-yellow-300 mt-1">Set your preferred delivery types and communication methods</p>
        </div>

        <div className="space-y-6">
          {/* Preferred Delivery Types */}
          <div>
            <label className="block text-sm text-yellow-300 mb-3">
              Preferred Delivery Types
            </label>
            <Controller
              name="preferred_delivery_types"
              control={control}
              render={({ field: { value = [], onChange } }) => (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                  {deliveryTypes.map(type => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => {
                        if (value.includes(type)) {
                            onChange(value.filter(item => item !== type))
                        } else {
                          onChange([...value, type])
                          }
                        }}
                      className={`h-16 w-full rounded-lg border-2 transition-all flex items-center gap-2 px-3 ${
                        value.includes(type)
                          ? 'border-blue-400 bg-blue-500/20 text-white'
                          : 'border-navy-700 bg-navy-800/50 text-gray-300 hover:border-blue-400/50 hover:bg-navy-700/50'
                      }`}
                    >
                      <span className="text-xs font-medium truncate">{type}</span>
                    </button>
                  ))}
                </div>
              )}
            />
          </div>

          {/* Communication Preferences */}
          <div>
            <label className="block text-sm text-yellow-300 mb-3">
              Preferred Communication Methods
            </label>
            <Controller
              name="communication_preferences"
              control={control}
              render={({ field: { value = [], onChange } }) => (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                  {communicationPrefs.map(pref => (
                    <button
                      key={pref}
                      type="button"
                      onClick={() => {
                        if (value.includes(pref)) {
                            onChange(value.filter(item => item !== pref))
                        } else {
                          onChange([...value, pref])
                          }
                        }}
                      className={`h-16 w-full rounded-lg border-2 transition-all flex items-center gap-2 px-3 ${
                        value.includes(pref)
                          ? 'border-blue-400 bg-blue-500/20 text-white'
                          : 'border-navy-700 bg-navy-800/50 text-gray-300 hover:border-blue-400/50 hover:bg-navy-700/50'
                      }`}
                    >
                      <span className="text-xs font-medium truncate">{pref}</span>
                    </button>
                  ))}
                </div>
              )}
            />
          </div>

          {/* Additional Notes */}
          <div>
            <label className="block text-sm text-yellow-300 mb-2">
              Additional Notes
            </label>
            <textarea
              {...register('delivery_notes')}
              placeholder="Any additional information about your availability, preferences, or special circumstances..."
              className="w-full px-3 py-2 bg-navy-800 border border-navy-600 rounded-lg text-white placeholder-gray-400 focus:border-yellow-400 focus:outline-none"
              rows={3}
            />
          </div>
        </div>
      </motion.div>
    </div>
  )
})

VolunteerProfileSettings.displayName = 'VolunteerProfileSettings'

export default VolunteerProfileSettings 