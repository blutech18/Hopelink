import React, { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useForm, Controller } from 'react-hook-form'
import { 
  User, 
  Mail, 
  Phone, 
  MapPin, 
  Edit3, 
  Save, 
  X, 
  Eye,
  EyeOff,
  Building2,
  Calendar,
  Truck,
  Users,
  Gift,
  Heart,
  Shield,
  AlertCircle,
  CheckCircle,
  Globe,
  Camera,
  Upload,
  Trash2,
  Navigation
} from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import { useToast } from '../../contexts/ToastContext'
import { ProfileSkeleton } from '../../components/ui/Skeleton'
import LoadingSpinner from '../../components/ui/LoadingSpinner'
import VolunteerProfileSettings from '../../components/ui/VolunteerProfileSettings'
import { IDVerificationBadge } from '../../components/ui/VerificationBadge'
import LocationPicker from '../../components/ui/LocationPicker'

const ProfilePage = () => {
  const { user, profile, updateProfile, updatePassword } = useAuth()
  const { success, error } = useToast()
  const [isEditing, setIsEditing] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [showPasswordSection, setShowPasswordSection] = useState(false)
  const [showCurrentPassword, setShowCurrentPassword] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [profileImage, setProfileImage] = useState(null)
  const [imagePreview, setImagePreview] = useState(null)
  const [uploadingImage, setUploadingImage] = useState(false)
  const [idImagePreview, setIdImagePreview] = useState(null)
  const [uploadingIdImage, setUploadingIdImage] = useState(false)
  const [secondaryIdImagePreview, setSecondaryIdImagePreview] = useState(null)
  const [uploadingSecondaryIdImage, setUploadingSecondaryIdImage] = useState(false)
  const [showLocationPicker, setShowLocationPicker] = useState(false)
  const [selectedLocation, setSelectedLocation] = useState(null)
  const fileInputRef = useRef(null)

  const {
    register,
    handleSubmit,
    reset,
    watch,
    control,
    setValue,
    getValues,
    formState: { errors, isDirty }
  } = useForm({
    defaultValues: {
      donation_types: [],
      assistance_needs: [],
          availability_days: [],
    availability_times: [],
      public_profile: false,
      receive_notifications: true,
      share_contact_info: false,
      has_vehicle: false,
      background_check_consent: false
    }
  })

  const {
    register: registerPassword,
    handleSubmit: handlePasswordSubmit,
    watch: watchPassword,
    reset: resetPassword,
    formState: { errors: passwordErrors }
  } = useForm()

  // Load profile data into form when component mounts or profile changes
  useEffect(() => {
    if (profile) {
      const formData = {
        name: profile.name || '',
        email: profile.email || '',
        phone_number: profile.phone_number || '',
        address: profile.address || '',
        city: profile.city || '',
        province: profile.province || '',
        zip_code: profile.zip_code || '',
        bio: profile.bio || '',
        organization_name: profile.organization_name || '',
        website_link: profile.website_link || '',
        household_size: profile.household_size || '',
        emergency_contact_name: profile.emergency_contact_name || '',
        emergency_contact_phone: profile.emergency_contact_phone || '',
        max_delivery_distance: profile.max_delivery_distance || 20,
        volunteer_experience: profile.volunteer_experience || '',
        donation_types: Array.isArray(profile.donation_types) ? profile.donation_types : [],
        assistance_needs: Array.isArray(profile.assistance_needs) ? profile.assistance_needs : [],
        availability_days: Array.isArray(profile.availability_days) ? profile.availability_days : [],
        availability_times: Array.isArray(profile.availability_times) ? profile.availability_times : [],
        has_vehicle: profile.has_vehicle || false,
        vehicle_type: profile.vehicle_type || '',
        background_check_consent: profile.background_check_consent || false,
        account_type: profile.account_type || 'individual',
        preferred_pickup_location: profile.preferred_pickup_location || '',
        donation_frequency: profile.donation_frequency || '',
        max_donation_value: profile.max_donation_value || '',
        preferred_contact_method: profile.preferred_contact_method || '',
        public_profile: profile.public_profile || false,
        receive_notifications: profile.receive_notifications !== false, // Default to true
        share_contact_info: profile.share_contact_info || false,
        // Valid ID fields
        primary_id_type: profile.primary_id_type || '',
        primary_id_number: profile.primary_id_number || '',
        primary_id_image_url: profile.primary_id_image_url || '',
        primary_id_expiry: profile.primary_id_expiry || '',
        secondary_id_type: profile.secondary_id_type || '',
        secondary_id_number: profile.secondary_id_number || '',
        secondary_id_image_url: profile.secondary_id_image_url || '',
        secondary_id_expiry: profile.secondary_id_expiry || '',
        organization_representative_name: profile.organization_representative_name || '',
        organization_representative_position: profile.organization_representative_position || ''
      }
      reset(formData)
      
      // Set profile image if it exists
      if (profile.profile_image_url) {
        setImagePreview(profile.profile_image_url)
      }
      
      // Set ID images if they exist
      if (profile.primary_id_image_url) {
        setIdImagePreview(profile.primary_id_image_url)
      }
      if (profile.secondary_id_image_url) {
        setSecondaryIdImagePreview(profile.secondary_id_image_url)
      }

      // Set location if coordinates exist
      if (profile.latitude && profile.longitude) {
        setSelectedLocation({
          lat: profile.latitude,
          lng: profile.longitude,
          address: profile.address || ''
        })
      }
    }
  }, [profile, reset])

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
      
      // Set preview
      setImagePreview(base64String)
      setProfileImage(base64String)
      
      success('Image selected successfully!')
    } catch (err) {
      console.error('Error processing image:', err)
      error('Failed to process image. Please try again.')
    } finally {
      setUploadingImage(false)
    }
  }

  const handleImageUpload = () => {
    fileInputRef.current?.click()
  }

  const handleRemoveImage = async () => {
    try {
      setUploadingImage(true)
      
      // Clear local states
      setImagePreview(null)
      setProfileImage(null)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
      
      // If user had an existing profile image, update the database to remove it
      if (profile?.profile_image_url) {
        await updateProfile({ profile_image_url: null })
        success('Profile picture removed successfully!')
      } else {
        success('Image removed!')
      }
    } catch (err) {
      console.error('Error removing profile image:', err)
      error('Failed to remove profile picture. Please try again.')
      // Restore the image preview if the database update failed
      if (profile?.profile_image_url) {
        setImagePreview(profile.profile_image_url)
      }
    } finally {
      setUploadingImage(false)
    }
  }

  const saveProfileImage = async () => {
    if (!profileImage) return

    try {
      setUploadingImage(true)
      await updateProfile({ profile_image_url: profileImage })
      success('Profile picture updated successfully!')
      setProfileImage(null) // Clear the pending image
    } catch (err) {
      console.error('Error updating profile image:', err)
      error('Failed to update profile picture. Please try again.')
    } finally {
      setUploadingImage(false)
    }
  }

  // ID Image handling functions
  const handleIdImageSelect = async (event) => {
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
      setUploadingIdImage(true)
      
      // Convert to base64
      const base64String = await convertToBase64(file)
      
      // Set preview and update form
      setIdImagePreview(base64String)
      setValue('primary_id_image_url', base64String)
      
      success('ID image uploaded successfully!')
    } catch (err) {
      console.error('Error processing ID image:', err)
      error('Failed to process ID image. Please try again.')
    } finally {
      setUploadingIdImage(false)
    }
  }

  const removeIdImage = () => {
    setIdImagePreview(null)
    setValue('primary_id_image_url', '')
  }

  // Secondary ID Image handling functions
  const handleSecondaryIdImageSelect = async (event) => {
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
      setUploadingSecondaryIdImage(true)
      
      // Convert to base64
      const base64String = await convertToBase64(file)
      
      // Set preview and update form
      setSecondaryIdImagePreview(base64String)
      setValue('secondary_id_image_url', base64String)
      
      success('Secondary ID image uploaded successfully!')
    } catch (err) {
      console.error('Error processing secondary ID image:', err)
      error('Failed to process secondary ID image. Please try again.')
    } finally {
      setUploadingSecondaryIdImage(false)
    }
  }

  const removeSecondaryIdImage = () => {
    setSecondaryIdImagePreview(null)
    setValue('secondary_id_image_url', '')
  }

  const watchedAccountType = watch('account_type')
  const watchedHasVehicle = watch('has_vehicle')
  const newPassword = watchPassword('newPassword')

  // Helper function to parse Google Maps address components
  const parseAddressComponents = (addressComponents) => {
    if (!addressComponents || !Array.isArray(addressComponents)) return {}

    const parsed = {
      street_number: '',
      route: '',
      sublocality: '',
      locality: '',
      administrative_area_level_2: '',
      administrative_area_level_1: '',
      postal_code: '',
      country: ''
    }

    addressComponents.forEach(component => {
      const type = component.types[0]
      if (parsed.hasOwnProperty(type)) {
        parsed[type] = component.long_name
      }
    })

    return parsed
  }

  // Handle location selection from LocationPicker
  const handleLocationSelect = (location) => {
    setSelectedLocation(location)
    
    // Parse address components if available
    if (location.addressComponents) {
      const parsed = parseAddressComponents(location.addressComponents)
      
      // Build street address from street number and route
      const streetAddress = [parsed.street_number, parsed.route].filter(Boolean).join(' ').trim()
      
      // Update all address fields
      if (streetAddress) {
        setValue('address', streetAddress, { shouldDirty: true })
      } else if (location.address) {
        // Fallback to full formatted address
        setValue('address', location.address, { shouldDirty: true })
      }
      
      // City: Try locality first, then sublocality, then administrative_area_level_2
      const city = parsed.locality || parsed.sublocality || parsed.administrative_area_level_2
      if (city) {
        setValue('city', city, { shouldDirty: true })
      }
      
      if (parsed.administrative_area_level_1) {
        // Check if the province matches one of our options
        const province = parsed.administrative_area_level_1
        const validProvinces = ['Misamis Oriental', 'Misamis Occidental', 'Bukidnon', 'Camiguin', 'Lanao del Norte']
        
        // Try to find a matching province (case-insensitive)
        const matchedProvince = validProvinces.find(p => 
          p.toLowerCase() === province.toLowerCase() || 
          province.toLowerCase().includes(p.toLowerCase()) ||
          p.toLowerCase().includes(province.toLowerCase())
        )
        
        if (matchedProvince) {
          setValue('province', matchedProvince, { shouldDirty: true })
        } else {
          // If not in our list, still set it
          setValue('province', province, { shouldDirty: true })
        }
      }
      
      if (parsed.postal_code) {
        setValue('zip_code', parsed.postal_code, { shouldDirty: true })
      }
      
      success('Location and address fields updated successfully')
    } else if (location.address) {
      // Fallback if no address components available
      setValue('address', location.address, { shouldDirty: true })
      
      // Try to extract city from address
      const addressParts = location.address.split(',')
      if (addressParts.length >= 2) {
        const city = addressParts[addressParts.length - 2].trim()
        setValue('city', city, { shouldDirty: true })
      }
      
      success('Location updated successfully')
    }
  }

  const onSubmit = async (data) => {
    setIsLoading(true)
    try {
      console.log('Form data before processing:', data)
      

      
      // Process and clean the data, only including fields with meaningful values
      const processedData = {
        // Always include updated timestamp
        updated_at: new Date().toISOString()
      }

      // Helper function to add field if it has a meaningful value
      const addFieldIfValid = (fieldName, value, processor = null) => {
        if (value !== undefined && value !== null) {
          if (typeof value === 'string') {
            const trimmed = value.trim()
            if (trimmed !== '' && trimmed !== 'To be completed' && trimmed !== '09000000000') {
              processedData[fieldName] = processor ? processor(trimmed) : trimmed
            }
          } else if (typeof value === 'number' && !isNaN(value)) {
            processedData[fieldName] = processor ? processor(value) : value
          } else if (typeof value === 'boolean') {
            processedData[fieldName] = value
          } else if (Array.isArray(value) && value.length > 0) {
            processedData[fieldName] = value
          } else if (value instanceof Date || (typeof value === 'string' && value.includes('-'))) {
            // Handle dates
            processedData[fieldName] = value
          }
        }
      }

      // Core fields
      addFieldIfValid('name', data.name)
      addFieldIfValid('phone_number', data.phone_number)
      addFieldIfValid('address', data.address)
      addFieldIfValid('city', data.city)
      addFieldIfValid('province', data.province)
      addFieldIfValid('zip_code', data.zip_code)
      addFieldIfValid('bio', data.bio)

      // Location coordinates for matching algorithm
      if (selectedLocation && selectedLocation.lat && selectedLocation.lng) {
        processedData.latitude = selectedLocation.lat
        processedData.longitude = selectedLocation.lng
      }
      
      // Account info
      addFieldIfValid('account_type', data.account_type)
      addFieldIfValid('organization_name', data.organization_name)
      addFieldIfValid('website_link', data.website_link)
      
      // Numeric fields
      addFieldIfValid('household_size', data.household_size, (val) => parseInt(val))
      addFieldIfValid('max_donation_value', data.max_donation_value, (val) => parseFloat(val))
      addFieldIfValid('max_delivery_distance', data.max_delivery_distance, (val) => parseInt(val))
      
      // Boolean fields - always include these
      processedData.public_profile = !!data.public_profile
      processedData.receive_notifications = data.receive_notifications !== false
      processedData.share_contact_info = !!data.share_contact_info
      processedData.has_vehicle = !!data.has_vehicle
      processedData.background_check_consent = !!data.background_check_consent
      
      // Array fields
      if (Array.isArray(data.donation_types)) processedData.donation_types = data.donation_types
      if (Array.isArray(data.assistance_needs)) processedData.assistance_needs = data.assistance_needs
      if (Array.isArray(data.availability_days)) processedData.availability_days = data.availability_days
      if (Array.isArray(data.availability_times)) processedData.availability_times = data.availability_times
      
      // Preference fields
      addFieldIfValid('preferred_pickup_location', data.preferred_pickup_location)
      addFieldIfValid('donation_frequency', data.donation_frequency)
      addFieldIfValid('preferred_contact_method', data.preferred_contact_method)
      addFieldIfValid('vehicle_type', data.vehicle_type)
      addFieldIfValid('volunteer_experience', data.volunteer_experience)
      
      // Emergency contact
      addFieldIfValid('emergency_contact_name', data.emergency_contact_name)
      addFieldIfValid('emergency_contact_phone', data.emergency_contact_phone)
      
      // ID fields
      addFieldIfValid('primary_id_type', data.primary_id_type)
      addFieldIfValid('primary_id_number', data.primary_id_number)
      addFieldIfValid('primary_id_expiry', data.primary_id_expiry)
      addFieldIfValid('secondary_id_type', data.secondary_id_type)
      addFieldIfValid('secondary_id_number', data.secondary_id_number)
      addFieldIfValid('secondary_id_expiry', data.secondary_id_expiry)
      
      // Image fields
      if (data.primary_id_image_url) processedData.primary_id_image_url = data.primary_id_image_url
      if (data.secondary_id_image_url) processedData.secondary_id_image_url = data.secondary_id_image_url
      
      // Organization representative fields
      addFieldIfValid('organization_representative_name', data.organization_representative_name)
      addFieldIfValid('organization_representative_position', data.organization_representative_position)

      console.log('Processed data for update:', processedData)

      // Save profile image if there's a pending one
      if (profileImage) {
        processedData.profile_image_url = profileImage
      }

      await updateProfile(processedData)
      success('Profile updated successfully!')
      setIsEditing(false)
      setProfileImage(null) // Clear pending image after successful save
    } catch (err) {
      console.error('Profile update error:', err)
      error(err.message || 'Failed to update profile. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const onPasswordSubmit = async (data) => {
    setIsLoading(true)
    try {
      await updatePassword(data.newPassword)
      success('Password updated successfully!')
      resetPassword()
      setShowPasswordSection(false)
    } catch (err) {
      error(err.message || 'Failed to update password')
    } finally {
      setIsLoading(false)
    }
  }

  const cancelEdit = () => {
    if (profile) {
      // Reset form with current profile data
      const formData = {
        name: profile.name || '',
        email: profile.email || '',
        phone_number: profile.phone_number || '',
        address: profile.address || '',
        city: profile.city || '',
        province: profile.province || '',
        zip_code: profile.zip_code || '',
        bio: profile.bio || '',
        organization_name: profile.organization_name || '',
        website_link: profile.website_link || '',
        household_size: profile.household_size || '',
        emergency_contact_name: profile.emergency_contact_name || '',
        emergency_contact_phone: profile.emergency_contact_phone || '',
        max_delivery_distance: profile.max_delivery_distance || 20,
        volunteer_experience: profile.volunteer_experience || '',
        donation_types: Array.isArray(profile.donation_types) ? profile.donation_types : [],
        assistance_needs: Array.isArray(profile.assistance_needs) ? profile.assistance_needs : [],
        availability_days: Array.isArray(profile.availability_days) ? profile.availability_days : [],
        availability_times: Array.isArray(profile.availability_times) ? profile.availability_times : [],
        has_vehicle: profile.has_vehicle || false,
        vehicle_type: profile.vehicle_type || '',
        background_check_consent: profile.background_check_consent || false,
        account_type: profile.account_type || 'individual',
        preferred_pickup_location: profile.preferred_pickup_location || '',
        donation_frequency: profile.donation_frequency || '',
        max_donation_value: profile.max_donation_value || '',
        preferred_contact_method: profile.preferred_contact_method || '',
        public_profile: profile.public_profile || false,
        receive_notifications: profile.receive_notifications !== false,
        share_contact_info: profile.share_contact_info || false,
        primary_id_type: profile.primary_id_type || '',
        primary_id_number: profile.primary_id_number || '',
        primary_id_image_url: profile.primary_id_image_url || '',
        primary_id_expiry: profile.primary_id_expiry || '',
        secondary_id_type: profile.secondary_id_type || '',
        secondary_id_number: profile.secondary_id_number || '',
        secondary_id_image_url: profile.secondary_id_image_url || '',
        secondary_id_expiry: profile.secondary_id_expiry || '',
        organization_representative_name: profile.organization_representative_name || '',
        organization_representative_position: profile.organization_representative_position || ''
      }
      reset(formData)
    }
    setIsEditing(false)
    // Reset image changes
    setProfileImage(null)
    if (profile?.profile_image_url) {
      setImagePreview(profile.profile_image_url)
    } else {
      setImagePreview(null)
    }
    
    // Reset ID image changes
    if (profile?.primary_id_image_url) {
      setIdImagePreview(profile.primary_id_image_url)
    } else {
      setIdImagePreview(null)
    }
    
    if (profile?.secondary_id_image_url) {
      setSecondaryIdImagePreview(profile.secondary_id_image_url)
    } else {
      setSecondaryIdImagePreview(null)
    }
  }

  const getRoleIcon = (role) => {
    switch (role) {
      case 'donor': return Gift
      case 'recipient': return Heart
      case 'volunteer': return Truck
      case 'admin': return Shield
      default: return User
    }
  }

  const getRoleColor = (role) => {
    switch (role) {
      case 'donor': return 'text-blue-400'
      case 'recipient': return 'text-green-400'
      case 'volunteer': return 'text-purple-400'
      case 'admin': return 'text-amber-400'
      default: return 'text-skyblue-400'
    }
  }

  const getCompletionStatus = () => {
    if (!profile) return { percentage: 0, missingFields: [] }

    // Admin users don't require ID verification and have minimal requirements
    const baseRequiredFields = profile.role === 'admin' 
      ? ['name', 'phone_number'] // Only essential contact info for admins
      : ['name', 'phone_number', 'address', 'city', 'primary_id_type', 'primary_id_number']
    
    const roleSpecificFields = {
      donor: ['donation_types', 'preferred_contact_method'],
      recipient: ['household_size', 'assistance_needs', 'emergency_contact_name'],
      volunteer: ['availability_days', 'background_check_consent'],
      admin: [] // Admins have minimal required fields
    }

    // Additional recommended fields for better profile completion
    const recommendedFields = {
      donor: ['bio', 'preferred_pickup_location', 'donation_frequency', 'availability_days'],
      recipient: ['emergency_contact_phone', 'bio'], // Emergency contact phone and bio for better trust
      volunteer: [],
      admin: []
    }

    // Add organization-specific required fields
    let organizationFields = []
    if ((profile.account_type === 'business' || profile.account_type === 'organization') && 
        (profile.role === 'donor' || profile.role === 'recipient')) {
      organizationFields = ['secondary_id_type', 'secondary_id_number', 'organization_representative_name']
    }
    
    // Special validation for volunteers - must have driver's license
    let volunteerSpecificFields = []
    if (profile.role === 'volunteer') {
      volunteerSpecificFields = ['drivers_license_validation'] // Custom validation handled separately
    }

    const allRequiredFields = [...baseRequiredFields, ...(roleSpecificFields[profile.role] || []), ...organizationFields]
    const allRecommendedFields = [...allRequiredFields, ...(recommendedFields[profile.role] || [])]
    
    const missingRequired = allRequiredFields.filter(field => {
      const value = profile[field]
      if (Array.isArray(value)) return value.length === 0
      return !value || value === 'To be completed' || value === '09000000000'
    })
    
    // Special validation for volunteers - must have driver's license (not applicable to admins)
    if (profile.role === 'volunteer' && profile.primary_id_type !== 'drivers_license') {
      missingRequired.push('drivers_license_required')
    }

    const missingRecommended = allRecommendedFields.filter(field => {
      const value = profile[field]
      if (Array.isArray(value)) return value.length === 0
      return !value || value === 'To be completed' || value === '09000000000'
    })

    // Calculate percentage based on recommended fields for better UX
    const percentage = Math.round(((allRecommendedFields.length - missingRecommended.length) / allRecommendedFields.length) * 100)

    return {
      percentage,
      missingFields: missingRequired, // Return only required missing fields for critical alerts
      missingRecommended: missingRecommended
    }
  }

  const { percentage: completionPercentage } = getCompletionStatus()

  if (!profile) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{backgroundColor: '#00237d'}}>
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  const RoleIcon = getRoleIcon(profile.role)

  return (
    <div className="min-h-screen py-8" style={{backgroundColor: '#00237d'}}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold text-white mb-2">Profile Settings</h1>
              <p className="text-skyblue-300">Manage your account information and preferences</p>
            </div>
            <div className="flex items-center space-x-4">
              {/* Profile completion only shown for non-admin users */}
              {profile.role !== 'admin' && (
                <div className="text-right">
                  <div className="text-sm text-skyblue-300">Profile Completion</div>
                  <div className="flex items-center space-x-2">
                    <div className="w-20 bg-navy-800 rounded-full h-2">
                      <div
                        className="bg-gradient-to-r from-skyblue-500 to-blue-500 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${completionPercentage}%` }}
                      />
                    </div>
                    <span className="text-sm font-medium text-white">{completionPercentage}%</span>
                  </div>
                </div>
              )}
              {!isEditing && (
                <button
                  onClick={() => setIsEditing(true)}
                  className="btn btn-primary flex items-center"
                >
                  <Edit3 className="h-4 w-4 mr-2" />
                  Edit Profile
                </button>
              )}
            </div>
          </div>

          {/* Role Badge */}
          <div className="flex items-center space-x-3">
            <div className={`flex items-center space-x-2 px-3 py-1 rounded-full bg-navy-800 border border-navy-700`}>
              <RoleIcon className={`h-4 w-4 ${getRoleColor(profile.role)}`} />
              <span className="text-sm font-medium text-white capitalize">{profile.role}</span>
            </div>
            {profile.account_type === 'business' && (
              <div className="flex items-center space-x-2 px-3 py-1 rounded-full bg-navy-800 border border-navy-700">
                <Building2 className="h-4 w-4 text-skyblue-400" />
                <span className="text-sm font-medium text-white">Business Account</span>
              </div>
            )}
            {/* Verification Status Badge */}
            <div className="flex items-center">
              {profile.is_verified ? (
                <div className="flex items-center space-x-2 px-3 py-1 rounded-full bg-green-500/20 border border-green-500/30">
                  <CheckCircle className="h-4 w-4 text-green-300" />
                  <span className="text-sm font-medium text-green-300">Verified</span>
                </div>
              ) : (
                <div className="flex items-center space-x-2 px-3 py-1 rounded-full bg-orange-500/20 border border-orange-500/30">
                  <AlertCircle className="h-4 w-4 text-orange-300" />
                  <span className="text-sm font-medium text-orange-300">Unverified</span>
                </div>
              )}
            </div>
          </div>
        </motion.div>

        {/* Profile Picture Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="card p-6 mb-8"
        >
          <h2 className="text-xl font-semibold text-white mb-6 flex items-center">
            <Camera className="h-5 w-5 text-skyblue-400 mr-2" />
            Profile Picture
          </h2>

          <div className="flex items-start space-x-6">
            {/* Current Profile Picture */}
            <div className="relative">
              <div className="w-32 h-32 rounded-full overflow-hidden bg-navy-800 border-4 border-navy-700 flex items-center justify-center">
                {imagePreview ? (
                  <img
                    src={imagePreview}
                    alt="Profile"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <User className="h-16 w-16 text-skyblue-400" />
                )}
              </div>
              
              {/* Upload/Edit Overlay */}
              <button
                type="button"
                onClick={handleImageUpload}
                disabled={uploadingImage}
                className="absolute inset-0 w-32 h-32 rounded-full bg-black bg-opacity-50 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity"
              >
                {uploadingImage ? (
                  <LoadingSpinner size="sm" />
                ) : (
                  <Camera className="h-6 w-6 text-white" />
                )}
              </button>
            </div>

            {/* Upload Controls */}
            <div className="flex-1">
              <div className="mb-4">
                <p className="text-white font-medium mb-2">Upload a profile picture</p>
                <p className="text-skyblue-400 text-sm mb-4">
                  Choose a clear photo that represents you. Accepted formats: JPG, PNG, GIF. Max size: 5MB.
                </p>
              </div>

              <div className="flex items-center space-x-3">
                <button
                  type="button"
                  onClick={handleImageUpload}
                  disabled={uploadingImage}
                  className="btn btn-secondary flex items-center"
                >
                  <Upload className="h-4 w-4 mr-2" />
                  {uploadingImage ? 'Processing...' : 'Choose Image'}
                </button>

                {imagePreview && (
                  <button
                    type="button"
                    onClick={handleRemoveImage}
                    disabled={uploadingImage}
                    className="btn btn-outline-danger flex items-center"
                  >
                    {uploadingImage ? (
                      <>
                        <LoadingSpinner size="sm" />
                        <span className="ml-2">Removing...</span>
                      </>
                    ) : (
                      <>
                        <Trash2 className="h-4 w-4 mr-2" />
                        Remove Photo
                      </>
                    )}
                  </button>
                )}

                {profileImage && (
                  <button
                    type="button"
                    onClick={saveProfileImage}
                    disabled={uploadingImage}
                    className="btn btn-primary flex items-center"
                  >
                    <Save className="h-4 w-4 mr-2" />
                    Save Picture
                  </button>
                )}
              </div>

              {/* Hidden File Input */}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleImageSelect}
                className="hidden"
              />
            </div>
          </div>
        </motion.div>

        <form onSubmit={handleSubmit(onSubmit)}>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Main Profile Section */}
            <div className="lg:col-span-2 space-y-8">
              {/* Basic Information */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="card p-6"
              >
                <h2 className="text-xl font-semibold text-white mb-6 flex items-center">
                  <User className="h-5 w-5 text-skyblue-400 mr-2" />
                  Basic Information
                </h2>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-white mb-2">
                      Full Name
                    </label>
                    {isEditing ? (
                      <input
                        {...register('name', {
                          validate: {
                            requiredIfProvided: (value) => {
                              if (value && value.trim().length > 0) {
                                return value.trim().length >= 2 || 'Name must be at least 2 characters'
                              }
                              return true
                            }
                          }
                        })}
                        className="input"
                        placeholder="Enter your full name"
                      />
                    ) : (
                      <div className="input bg-navy-800 text-skyblue-200">
                        {profile.name || 'Not provided'}
                      </div>
                    )}
                    {errors.name && (
                      <p className="mt-1 text-sm text-danger-600">{errors.name.message}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-white mb-2">
                      Email Address
                    </label>
                    <div className="input bg-navy-800 text-skyblue-200 flex items-center">
                      <Mail className="h-4 w-4 text-skyblue-400 mr-2" />
                      {profile.email}
                    </div>
                    <p className="mt-1 text-xs text-skyblue-400">Email cannot be changed</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-white mb-2">
                      Phone Number
                    </label>
                    {isEditing ? (
                      <input
                        {...register('phone_number', {
                          validate: {
                            validFormat: (value) => {
                              if (value && value.trim().length > 0) {
                                const phoneRegex = /^(09|\+639)\d{9}$/
                                if (!phoneRegex.test(value)) {
                                  return 'Please enter a valid Philippines phone number (e.g., 09123456789 or +639123456789)'
                                }
                                if (value === '09000000000') {
                                  return 'Please enter your actual phone number'
                                }
                              }
                              return true
                            }
                          }
                        })}
                        className="input"
                        placeholder="09123456789"
                        maxLength="11"
                      />
                    ) : (
                      <div className="input bg-navy-800 text-skyblue-200 flex items-center">
                        <Phone className="h-4 w-4 text-skyblue-400 mr-2" />
                        {profile.phone_number || 'Not provided'}
                      </div>
                    )}
                    {errors.phone_number && (
                      <p className="mt-1 text-sm text-danger-600">{errors.phone_number.message}</p>
                    )}
                  </div>

                  {profile.role === 'donor' && (
                    <div>
                      <label className="block text-sm font-medium text-white mb-2">
                        Account Type
                      </label>
                      {isEditing ? (
                        <select
                          {...register('account_type')}
                          className="input"
                        >
                          <option value="individual">Individual</option>
                          <option value="business">Business/Organization</option>
                        </select>
                      ) : (
                        <div className="input bg-navy-800 text-skyblue-200 flex items-center">
                          <Building2 className="h-4 w-4 text-skyblue-400 mr-2" />
                          {profile.account_type === 'business' ? 'Business/Organization' : 'Individual'}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </motion.div>

              {/* Address Information */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="card p-6"
              >
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-semibold text-white flex items-center">
                    <MapPin className="h-5 w-5 text-skyblue-400 mr-2" />
                    Address Information
                  </h2>
                  {isEditing && (
                    <button
                      type="button"
                      onClick={() => setShowLocationPicker(true)}
                      className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
                    >
                      <Navigation className="h-4 w-4" />
                      Select on Map
                    </button>
                  )}
                </div>

                {/* Matching Algorithm Info Banner */}
                {(profile.role === 'donor' || profile.role === 'recipient' || profile.role === 'volunteer') && (
                  <div className="mb-6 p-4 bg-gradient-to-r from-green-500/10 to-skyblue-500/10 border border-green-500/20 rounded-lg">
                    <div className="flex items-start gap-3">
                      <div className="flex-shrink-0 w-10 h-10 bg-green-500/20 rounded-full flex items-center justify-center">
                        <Globe className="h-5 w-5 text-green-400" />
                      </div>
                      <div className="flex-1">
                        <h3 className="text-sm font-semibold text-white mb-1">
                          Smart Location Matching
                        </h3>
                        <p className="text-xs text-skyblue-200 leading-relaxed">
                          Your location helps our intelligent matching algorithm connect you with nearby{' '}
                          {profile.role === 'donor' && 'recipients and volunteers'}
                          {profile.role === 'recipient' && 'donors and volunteers'}
                          {profile.role === 'volunteer' && 'donors and recipients'}
                          . This ensures faster deliveries and more efficient assistance. 
                          {selectedLocation && selectedLocation.lat && selectedLocation.lng && (
                            <span className="text-green-400 font-medium ml-1">
                              ✓ Location verified
                            </span>
                          )}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-white mb-2">
                      Street Address
                    </label>
                    {isEditing ? (
                      <input
                        {...register('address', {
                          validate: {
                            validIfProvided: (value) => {
                              if (value && value.trim().length > 0) {
                                return value.trim().length >= 5 || 'Address must be at least 5 characters'
                              }
                              return true
                            }
                          }
                        })}
                        className="input"
                        placeholder="Enter your street address or use 'Select on Map'"
                      />
                    ) : (
                      <div className="input bg-navy-800 text-skyblue-200 flex items-center justify-between">
                        <span>{profile.address || 'Not provided'}</span>
                        {selectedLocation && selectedLocation.lat && selectedLocation.lng && (
                          <CheckCircle className="h-4 w-4 text-green-400 flex-shrink-0 ml-2" />
                        )}
                      </div>
                    )}
                    {errors.address && (
                      <p className="mt-1 text-sm text-danger-600">{errors.address.message}</p>
                    )}
                    {selectedLocation && selectedLocation.lat && selectedLocation.lng && (
                      <p className="mt-1 text-xs text-green-400 flex items-center gap-1">
                        <MapPin className="h-3 w-3" />
                        GPS Coordinates: {selectedLocation.lat.toFixed(6)}, {selectedLocation.lng.toFixed(6)}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-white mb-2">
                      City
                    </label>
                    {isEditing ? (
                      <input
                        {...register('city', {
                          validate: {
                            validIfProvided: (value) => {
                              if (value && value.trim().length > 0) {
                                return value.trim().length >= 2 || 'City must be at least 2 characters'
                              }
                              return true
                            }
                          }
                        })}
                        className="input"
                        placeholder="Enter your city"
                      />
                    ) : (
                      <div className="input bg-navy-800 text-skyblue-200">
                        {profile.city || 'Not provided'}
                      </div>
                    )}
                    {errors.city && (
                      <p className="mt-1 text-sm text-danger-600">{errors.city.message}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-white mb-2">
                      Province
                    </label>
                    {isEditing ? (
                      <select
                        {...register('province')}
                        className="input"
                      >
                        <option value="Misamis Oriental">Misamis Oriental</option>
                        <option value="Misamis Occidental">Misamis Occidental</option>
                        <option value="Bukidnon">Bukidnon</option>
                        <option value="Camiguin">Camiguin</option>
                        <option value="Lanao del Norte">Lanao del Norte</option>
                      </select>
                    ) : (
                      <div className="input bg-navy-800 text-skyblue-200">
                        {profile.province || 'Not provided'}
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-white mb-2">
                      ZIP Code
                    </label>
                    {isEditing ? (
                      <input
                        {...register('zip_code')}
                        className="input"
                        placeholder="Enter ZIP code"
                      />
                    ) : (
                      <div className="input bg-navy-800 text-skyblue-200">
                        {profile.zip_code || 'Not provided'}
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>

              {/* Valid ID Information - Only show for non-volunteers and optional for admins */}
              {profile.role !== 'volunteer' && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.25 }}
                  className="card p-6"
                >
                <h2 className="text-xl font-semibold text-white mb-6 flex items-center">
                  <Shield className="h-5 w-5 text-amber-400 mr-2" />
                  Valid ID Requirements
                  {profile.role !== 'admin' && (
                    <span className="ml-2 text-xs bg-amber-500/20 text-amber-300 px-2 py-1 rounded-full">
                      Required
                    </span>
                  )}
                  {profile.role === 'admin' && (
                    <span className="ml-2 text-xs bg-blue-500/20 text-blue-300 px-2 py-1 rounded-full">
                      Optional
                    </span>
                  )}
                  {/* ID Verification Status Badge */}
                  <div className="ml-auto flex items-center">
                    {(() => {
                      const hasIdUploaded = profile.primary_id_type && profile.primary_id_number && 
                        (profile.primary_id_image_url || true) // Consider ID uploaded if type and number exist
                      
                      return (
                        <IDVerificationBadge
                          idStatus={profile.id_verification_status}
                          hasIdUploaded={hasIdUploaded}
                          size="sm"
                          showText={true}
                          showDescription={false}
                        />
                      )
                    })()}
                  </div>
                </h2>

                {/* Get valid ID options based on role and account type */}
                {(() => {
                  const getValidIdOptions = () => {
                    if (profile.role === 'donor') {
                      if ((isEditing ? watchedAccountType : profile.account_type) === 'business' || 
                          (isEditing ? watchedAccountType : profile.account_type) === 'organization') {
                        return {
                          primary: [
                            { value: 'sec_registration', label: 'SEC Registration Certificate (Corporation/NGO)' },
                            { value: 'dti_registration', label: 'DTI Business Registration (Sole Proprietor)' },
                            { value: 'barangay_clearance', label: 'Barangay Clearance or Mayor\'s Permit' }
                          ],
                          secondary: [
                            { value: 'philsys_id', label: 'Philippine National ID (PhilSys)' },
                            { value: 'passport', label: 'Passport' },
                            { value: 'drivers_license', label: 'Driver\'s License' },
                            { value: 'sss_umid', label: 'SSS or UMID Card' },
                            { value: 'voters_id', label: 'Voter\'s ID or Certificate' }
                          ],
                          requireSecondary: true,
                          secondaryLabel: 'Valid ID of Authorized Representative *'
                        }
                      } else {
                        return {
                          primary: [
                            { value: 'philsys_id', label: 'Philippine National ID (PhilSys)' },
                            { value: 'passport', label: 'Passport' },
                            { value: 'drivers_license', label: 'Driver\'s License' },
                            { value: 'sss_umid', label: 'SSS or UMID Card' },
                            { value: 'prc_id', label: 'PRC ID' },
                            { value: 'voters_id', label: 'Voter\'s ID or Certificate' },
                            { value: 'postal_id', label: 'Postal ID' },
                            { value: 'senior_citizen_id', label: 'Senior Citizen ID (if applicable)' }
                          ],
                          requireSecondary: false
                        }
                      }
                    } else if (profile.role === 'recipient') {
                      if ((isEditing ? watchedAccountType : profile.account_type) === 'organization') {
                        return {
                          primary: [
                            { value: 'sec_registration', label: 'SEC Registration Certificate (for NGOs/Institutions)' },
                            { value: 'dswd_accreditation', label: 'DSWD Accreditation (if applicable)' }
                          ],
                          secondary: [
                            { value: 'philsys_id', label: 'Philippine National ID (PhilSys)' },
                            { value: 'passport', label: 'Passport' },
                            { value: 'drivers_license', label: 'Driver\'s License' },
                            { value: 'voters_id', label: 'Voter\'s ID or Certificate' }
                          ],
                          requireSecondary: true,
                          secondaryLabel: 'Valid ID of Authorized Representative *'
                        }
                      } else {
                        return {
                          primary: [
                            { value: 'fourps_id', label: '4Ps Beneficiary ID (DSWD)' },
                            { value: 'philsys_id', label: 'Philippine National ID (PhilSys)' },
                            { value: 'voters_id', label: 'Voter\'s ID or Certificate' },
                            { value: 'drivers_license', label: 'Driver\'s License' },
                            { value: 'postal_id', label: 'Postal ID' },
                            { value: 'barangay_certificate', label: 'Barangay Certificate with photo' },
                            { value: 'senior_citizen_id', label: 'Senior Citizen ID (for recipients aged 60+)' },
                            { value: 'school_id', label: 'School ID (for student recipients)' }
                          ],
                          requireSecondary: false
                        }
                      }
                    } else if (profile.role === 'volunteer') {
                      return {
                        primary: [
                          { value: 'drivers_license', label: 'Driver\'s License (Mandatory for delivery roles)' }
                        ],
                        secondary: [
                          { value: 'philsys_id', label: 'Philippine National ID (PhilSys)' },
                          { value: 'sss_umid', label: 'UMID/SSS ID' },
                          { value: 'voters_id', label: 'Voter\'s ID or Certificate' }
                        ],
                        requireSecondary: false,
                        secondaryLabel: 'Optional Supporting ID'
                      }
                    } else if (profile.role === 'admin') {
                      return {
                        primary: [
                          { value: 'philsys_id', label: 'Philippine National ID (PhilSys)' },
                          { value: 'passport', label: 'Passport' },
                          { value: 'drivers_license', label: 'Driver\'s License' },
                          { value: 'sss_umid', label: 'SSS or UMID Card' },
                          { value: 'prc_id', label: 'PRC ID' },
                          { value: 'voters_id', label: 'Voter\'s ID or Certificate' },
                          { value: 'postal_id', label: 'Postal ID' }
                        ],
                        requireSecondary: false
                      }
                    }
                    return { primary: [], requireSecondary: false }
                  }

                  const idOptions = getValidIdOptions()

                  return (
                    <div className="space-y-6">
                      {/* Role-specific ID requirements info */}
                      <div className="bg-navy-800/50 border border-skyblue-500/20 rounded-lg p-4">
                        <div className="flex items-start space-x-3">
                          <AlertCircle className="h-5 w-5 text-skyblue-400 mt-0.5 flex-shrink-0" />
                          <div>
                            <h4 className="text-sm font-medium text-white mb-2">
                              {profile.role === 'donor' && 'Donor ID Requirements'}
                              {profile.role === 'recipient' && 'Recipient ID Requirements'}
                              {profile.role === 'volunteer' && 'Volunteer ID Requirements'}
                              {profile.role === 'admin' && 'Admin ID Requirements'}
                            </h4>
                            <p className="text-xs text-skyblue-300">
                              {profile.role === 'donor' && (
                                (isEditing ? watchedAccountType : profile.account_type) === 'business' || 
                                (isEditing ? watchedAccountType : profile.account_type) === 'organization'
                                  ? 'Organizations must provide business registration AND a valid ID of the authorized representative.'
                                  : 'Individual donors must provide at least one (1) valid Philippine government-issued ID.'
                              )}
                              {profile.role === 'recipient' && (
                                (isEditing ? watchedAccountType : profile.account_type) === 'organization'
                                  ? 'Organizations must provide SEC registration or DSWD accreditation AND a valid ID of the authorized representative.'
                                  : 'Individual recipients must provide at least one (1) valid ID. 4Ps Beneficiary ID is preferred for eligible families.'
                              )}
                              {profile.role === 'volunteer' && 'Volunteers must have a valid Driver\'s License for all delivery-related roles. This is mandatory for safety and legal compliance.'}
                              {profile.role === 'admin' && 'ID verification is optional for administrators. You may provide identification for additional security, but it is not required for platform access.'}
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* ID Verification Status Summary */}
                      <div className="bg-navy-800/30 border border-navy-600 rounded-lg p-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <h4 className="text-sm font-medium text-white mb-1">Verification Status</h4>
                            <p className="text-xs text-skyblue-300">
                              {(() => {
                                const hasIdUploaded = profile.primary_id_type && profile.primary_id_number
                                const idStatus = profile.id_verification_status
                                
                                if (!hasIdUploaded) {
                                  return 'Please provide your valid ID information to complete verification.'
                                } else if (idStatus === 'pending') {
                                  return 'Your ID information is under review by our admin team.'
                                } else if (idStatus === 'verified') {
                                  return 'Your ID has been verified.'
                                } else if (idStatus === 'rejected') {
                                  return 'Your ID verification was rejected. Please contact support for assistance.'
                                } else {
                                  return 'Your ID information is being processed.'
                                }
                              })()}
                            </p>
                          </div>
                          <div>
                            <IDVerificationBadge
                              idStatus={profile.id_verification_status}
                              hasIdUploaded={profile.primary_id_type && profile.primary_id_number}
                              size="sm"
                              showText={true}
                              showDescription={false}
                            />
                          </div>
                        </div>
                        
                        {/* Progress indicators */}
                        <div className="mt-4 space-y-2">
                          <div className="flex items-center space-x-3 text-xs">
                            {profile.primary_id_type && profile.primary_id_number ? (
                              <CheckCircle className="h-4 w-4 text-green-400" />
                            ) : (
                              <div className="h-4 w-4 rounded-full border-2 border-gray-400"></div>
                            )}
                            <span className={profile.primary_id_type && profile.primary_id_number ? 'text-green-300' : 'text-gray-400'}>
                              ID Information Provided
                            </span>
                          </div>
                          
                          {idOptions.requireSecondary && (
                            <div className="flex items-center space-x-3 text-xs">
                              {profile.secondary_id_type && profile.secondary_id_number && profile.organization_representative_name ? (
                                <CheckCircle className="h-4 w-4 text-green-400" />
                              ) : (
                                <div className="h-4 w-4 rounded-full border-2 border-gray-400"></div>
                              )}
                              <span className={profile.secondary_id_type && profile.secondary_id_number && profile.organization_representative_name ? 'text-green-300' : 'text-gray-400'}>
                                Representative ID Provided
                              </span>
                            </div>
                          )}
                          
                          <div className="flex items-center space-x-3 text-xs">
                            {profile.id_verification_status === 'verified' ? (
                              <CheckCircle className="h-4 w-4 text-green-400" />
                            ) : profile.id_verification_status === 'pending' ? (
                              <div className="h-4 w-4 rounded-full border-2 border-yellow-400 flex items-center justify-center">
                                <div className="h-2 w-2 rounded-full bg-yellow-400"></div>
                              </div>
                            ) : (
                              <div className="h-4 w-4 rounded-full border-2 border-gray-400"></div>
                            )}
                            <span className={
                              profile.id_verification_status === 'verified' 
                                ? 'text-green-300' 
                                : profile.id_verification_status === 'pending' 
                                  ? 'text-yellow-300' 
                                  : 'text-gray-400'
                            }>
                              Admin Verification
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Primary ID */}
                      <div className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div>
                            <label className="block text-sm font-medium text-white mb-2">
                              {profile.role === 'volunteer' ? 'Driver\'s License *' : 
                               profile.role === 'admin' ? 'Primary Valid ID (Optional)' : 
                               'Primary Valid ID *'}
                            </label>
                            {isEditing ? (
                              <select
                                {...register('primary_id_type', {
                                  validate: {
                                    requiredWithNumber: (value, formValues) => {
                                      const idNumber = formValues.primary_id_number
                                      if (idNumber && idNumber.trim().length > 0 && (!value || value.trim().length === 0)) {
                                        return 'ID type is required when ID number is provided'
                                      }
                                      return true
                                    }
                                  }
                                })}
                                className="input"
                              >
                                <option value="">Select ID type</option>
                                {idOptions.primary.map(option => (
                                  <option key={option.value} value={option.value}>
                                    {option.label}
                                  </option>
                                ))}
                              </select>
                            ) : (
                              <div className="input bg-navy-800 text-skyblue-200">
                                {profile.primary_id_type ? 
                                  idOptions.primary.find(opt => opt.value === profile.primary_id_type)?.label || profile.primary_id_type
                                  : 'Not provided'
                                }
                              </div>
                            )}
                            {errors.primary_id_type && (
                              <p className="mt-1 text-sm text-danger-600">{errors.primary_id_type.message}</p>
                            )}
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-white mb-2">
                              {profile.role === 'admin' ? 'ID Number (Optional)' : 'ID Number *'}
                            </label>
                            {isEditing ? (
                              <input
                                {...register('primary_id_number', {
                                  validate: {
                                    requiredWithType: (value, formValues) => {
                                      const idType = formValues.primary_id_type
                                      if (idType && idType.trim().length > 0 && (!value || value.trim().length === 0)) {
                                        return 'ID number is required when ID type is selected'
                                      }
                                      if (value && value.trim().length > 0 && value.trim().length < 5) {
                                        return 'ID number must be at least 5 characters'
                                      }
                                      return true
                                    }
                                  }
                                })}
                                type="text"
                                className="input"
                                placeholder="Enter ID number"
                              />
                            ) : (
                              <div className="input bg-navy-800 text-skyblue-200">
                                {profile.primary_id_number || 'Not provided'}
                              </div>
                            )}
                            {errors.primary_id_number && (
                              <p className="mt-1 text-sm text-danger-600">{errors.primary_id_number.message}</p>
                            )}
                          </div>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-white mb-2">
                            ID Expiry Date
                          </label>
                          {isEditing ? (
                            <input
                              {...register('primary_id_expiry')}
                              type="date"
                              className="input max-w-xs"
                            />
                          ) : (
                            <div className="input bg-navy-800 text-skyblue-200 max-w-xs">
                              {profile.primary_id_expiry ? 
                                new Date(profile.primary_id_expiry).toLocaleDateString() : 
                                'Not provided'
                              }
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Secondary ID (for organizations or optional for volunteers) */}
                      {(idOptions.requireSecondary || idOptions.secondaryLabel) && (
                        <div className="border-t border-navy-700 pt-6">
                          <h4 className="text-lg font-medium text-white mb-4">
                            {idOptions.secondaryLabel || 'Secondary ID'}
                          </h4>
                          
                          {/* Representative information for organizations */}
                          {idOptions.requireSecondary && (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                              <div>
                                <label className="block text-sm font-medium text-white mb-2">
                                  Representative Name *
                                </label>
                                {isEditing ? (
                                  <input
                                    {...register('organization_representative_name', {
                                      validate: {
                                        requiredForOrgEditing: (value, formValues) => {
                                          // Only validate if user is specifically filling this field
                                          if (value && value.trim().length > 0 && value.trim().length < 2) {
                                            return 'Representative name must be at least 2 characters'
                                          }
                                          return true
                                        }
                                      }
                                    })}
                                    type="text"
                                    className="input"
                                    placeholder="Full name of authorized representative"
                                  />
                                ) : (
                                  <div className="input bg-navy-800 text-skyblue-200">
                                    {profile.organization_representative_name || 'Not provided'}
                                  </div>
                                )}
                                {errors.organization_representative_name && (
                                  <p className="mt-1 text-sm text-danger-600">{errors.organization_representative_name.message}</p>
                                )}
                              </div>

                              <div>
                                <label className="block text-sm font-medium text-white mb-2">
                                  Representative Position
                                </label>
                                {isEditing ? (
                                  <input
                                    {...register('organization_representative_position')}
                                    type="text"
                                    className="input"
                                    placeholder="Position/Title in organization"
                                  />
                                ) : (
                                  <div className="input bg-navy-800 text-skyblue-200">
                                    {profile.organization_representative_position || 'Not provided'}
                                  </div>
                                )}
                              </div>
                            </div>
                          )}

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                              <label className="block text-sm font-medium text-white mb-2">
                                {idOptions.requireSecondary ? 'Representative ID Type *' : 'Secondary ID Type'}
                              </label>
                              {isEditing ? (
                                <select
                                  {...register('secondary_id_type', {
                                    validate: {
                                      conditionalForOrg: (value, formValues) => {
                                        // Only validate if secondary ID number is provided
                                        const secIdNumber = formValues.secondary_id_number
                                        if (secIdNumber && secIdNumber.trim().length > 0 && (!value || value.trim().length === 0)) {
                                          return 'ID type is required when ID number is provided'
                                        }
                                        return true
                                      }
                                    }
                                  })}
                                  className="input"
                                >
                                  <option value="">Select ID type</option>
                                  {idOptions.secondary?.map(option => (
                                    <option key={option.value} value={option.value}>
                                      {option.label}
                                    </option>
                                  ))}
                                </select>
                              ) : (
                                <div className="input bg-navy-800 text-skyblue-200">
                                  {profile.secondary_id_type ? 
                                    idOptions.secondary?.find(opt => opt.value === profile.secondary_id_type)?.label || profile.secondary_id_type
                                    : 'Not provided'
                                  }
                                </div>
                              )}
                              {errors.secondary_id_type && (
                                <p className="mt-1 text-sm text-danger-600">{errors.secondary_id_type.message}</p>
                              )}
                            </div>

                            <div>
                              <label className="block text-sm font-medium text-white mb-2">
                                {idOptions.requireSecondary ? 'Representative ID Number *' : 'Secondary ID Number'}
                              </label>
                              {isEditing ? (
                                <input
                                  {...register('secondary_id_number', {
                                    validate: {
                                      conditionalForOrg: (value, formValues) => {
                                        // Only validate if secondary ID type is provided
                                        const secIdType = formValues.secondary_id_type
                                        if (secIdType && secIdType.trim().length > 0 && (!value || value.trim().length === 0)) {
                                          return 'ID number is required when ID type is selected'
                                        }
                                        if (value && value.trim().length > 0 && value.trim().length < 5) {
                                          return 'ID number must be at least 5 characters'
                                        }
                                        return true
                                      }
                                    }
                                  })}
                                  type="text"
                                  className="input"
                                  placeholder="Enter ID number"
                                />
                              ) : (
                                <div className="input bg-navy-800 text-skyblue-200">
                                  {profile.secondary_id_number || 'Not provided'}
                                </div>
                              )}
                              {errors.secondary_id_number && (
                                <p className="mt-1 text-sm text-danger-600">{errors.secondary_id_number.message}</p>
                              )}
                            </div>
                          </div>
                        </div>
                      )}

                      {/* ID Image Upload Section */}
                      <div className="border-t border-navy-700 pt-6 space-y-6">
                        {/* Primary ID Image Upload */}
                        <div>
                          <label className="block text-sm font-medium text-white mb-2">
                            {profile.role === 'admin' ? 'ID Document Image (Optional)' : 'ID Document Image *'}
                          </label>
                          <input
                            {...register('primary_id_image_url', { 
                              validate: {
                                optionalForEdit: () => true // Make ID image optional for editing
                              } 
                            })}
                            type="hidden"
                          />
                          {isEditing ? (
                            <div className="space-y-4">
                              {idImagePreview ? (
                                <div className="relative">
                                  <img
                                    src={idImagePreview}
                                    alt="ID Preview"
                                    className="w-full max-w-md h-48 object-cover rounded-lg border-2 border-navy-600"
                                  />
                                  <button
                                    type="button"
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
                                    Take a clear photo of your ID document
                                  </p>
                                  <input
                                    type="file"
                                    accept="image/*"
                                    onChange={handleIdImageSelect}
                                    className="hidden"
                                    id="id-upload"
                                  />
                                  <label
                                    htmlFor="id-upload"
                                    className="btn btn-secondary inline-flex items-center px-4 py-2 rounded cursor-pointer"
                                  >
                                    {uploadingIdImage ? (
                                      <>
                                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-skyblue-500"></div>
                                        Uploading...
                                      </>
                                    ) : (
                                      <>
                                        <Upload className="h-4 w-4 mr-2" />
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
                                <p className="mt-1 text-sm text-danger-600">{errors.primary_id_image_url.message}</p>
                              )}
                            </div>
                          ) : (
                            <div>
                              {profile.primary_id_image_url ? (
                                <img
                                  src={profile.primary_id_image_url}
                                  alt="ID Document"
                                  className="w-full max-w-md h-48 object-cover rounded-lg border-2 border-navy-600"
                                />
                              ) : (
                                <div className="input bg-navy-800 text-skyblue-400 text-center py-8">
                                  <Camera className="h-8 w-8 mx-auto mb-2 opacity-50" />
                                  No ID image uploaded
                                </div>
                              )}
                            </div>
                          )}
                        </div>

                        {/* Secondary ID Image Upload (for organizations) */}
                        {idOptions.requireSecondary && (
                          <div>
                            <label className="block text-sm font-medium text-white mb-2">
                              Representative ID Document Image *
                            </label>
                            <input
                              {...register('secondary_id_image_url', { 
                                validate: {
                                  conditionalForOrg: (value, formValues) => {
                                    // Only require for organizations if they're specifically editing this field
                                    return true
                                  }
                                } 
                              })}
                              type="hidden"
                            />
                            {isEditing ? (
                              <div className="space-y-4">
                                {secondaryIdImagePreview ? (
                                  <div className="relative">
                                    <img
                                      src={secondaryIdImagePreview}
                                      alt="Representative ID Preview"
                                      className="w-full max-w-md h-48 object-cover rounded-lg border-2 border-navy-600"
                                    />
                                    <button
                                      type="button"
                                      onClick={removeSecondaryIdImage}
                                      className="absolute top-2 right-2 p-2 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors"
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </button>
                                  </div>
                                ) : (
                                  <div className="border-2 border-dashed border-navy-600 rounded-lg p-8 text-center">
                                    <Camera className="h-12 w-12 text-skyblue-500 mx-auto mb-4" />
                                    <p className="text-white mb-2">Upload Representative ID</p>
                                    <p className="text-sm text-skyblue-300 mb-4">
                                      Clear photo of the authorized representative's ID
                                    </p>
                                    <input
                                      type="file"
                                      accept="image/*"
                                      onChange={handleSecondaryIdImageSelect}
                                      className="hidden"
                                      id="secondary-id-upload"
                                    />
                                    <label
                                      htmlFor="secondary-id-upload"
                                      className="btn btn-secondary inline-flex items-center px-4 py-2 rounded cursor-pointer"
                                    >
                                      {uploadingSecondaryIdImage ? (
                                        <>
                                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-skyblue-500"></div>
                                          Uploading...
                                        </>
                                      ) : (
                                        <>
                                          <Upload className="h-4 w-4 mr-2" />
                                          Choose Image
                                        </>
                                      )}
                                    </label>
                                  </div>
                                )}
                                <p className="text-xs text-skyblue-400">
                                  Maximum file size: 5MB. Supported formats: JPG, PNG, GIF
                                </p>
                                {errors.secondary_id_image_url && (
                                  <p className="mt-1 text-sm text-danger-600">{errors.secondary_id_image_url.message}</p>
                                )}
                              </div>
                            ) : (
                              <div>
                                {profile.secondary_id_image_url ? (
                                  <img
                                    src={profile.secondary_id_image_url}
                                    alt="Representative ID Document"
                                    className="w-full max-w-md h-48 object-cover rounded-lg border-2 border-navy-600"
                                  />
                                ) : (
                                  <div className="input bg-navy-800 text-skyblue-400 text-center py-8">
                                    <Camera className="h-8 w-8 mx-auto mb-2 opacity-50" />
                                    No representative ID image uploaded
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })()}
                </motion.div>
              )}

              {/* Role-specific sections */}
              <AnimatePresence>
                {profile.role === 'donor' && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                    className="card p-6"
                  >
                    <h2 className="text-xl font-semibold text-white mb-6 flex items-center">
                      <Gift className="h-5 w-5 text-blue-400 mr-2" />
                      Donor Information
                    </h2>

                    <div className="space-y-6">
                      {/* Business/Organization fields */}
                      {(isEditing ? watchedAccountType : profile.account_type) === 'business' && (
                        <>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                              <label className="block text-sm font-medium text-white mb-2">
                                Organization Name *
                              </label>
                              {isEditing ? (
                                <input
                                  {...register('organization_name', {
                                    validate: {
                                      requiredForBusiness: (value, formValues) => {
                                        const accountType = formValues.account_type || profile.account_type
                                        if (accountType === 'business' && (!value || value.trim().length === 0)) {
                                          return 'Organization name is required for business accounts'
                                        }
                                        if (value && value.trim().length > 0 && value.trim().length < 2) {
                                          return 'Organization name must be at least 2 characters'
                                        }
                                        return true
                                      }
                                    }
                                  })}
                                  className="input"
                                  placeholder="Enter organization name"
                                />
                              ) : (
                                <div className="input bg-navy-800 text-skyblue-200">
                                  {profile.organization_name || 'Not provided'}
                                </div>
                              )}
                              {errors.organization_name && (
                                <p className="mt-1 text-sm text-danger-600">{errors.organization_name.message}</p>
                              )}
                            </div>

                            <div>
                              <label className="block text-sm font-medium text-white mb-2">
                                Website URL
                              </label>
                              {isEditing ? (
                                <input
                                  {...register('website_link', {
                                    pattern: {
                                      value: /^https?:\/\/.+/,
                                      message: 'Please enter a valid URL starting with http:// or https://'
                                    }
                                  })}
                                  className="input"
                                  placeholder="https://your-website.com"
                                  type="url"
                                />
                              ) : (
                                <div className="input bg-navy-800 text-skyblue-200 flex items-center">
                                  {profile.website_link ? (
                                    <>
                                      <Globe className="h-4 w-4 text-skyblue-400 mr-2" />
                                      <a 
                                        href={profile.website_link} 
                                        target="_blank" 
                                        rel="noopener noreferrer"
                                        className="text-skyblue-400 hover:text-skyblue-300 truncate"
                                      >
                                        {profile.website_link}
                                      </a>
                                    </>
                                  ) : (
                                    'Not provided'
                                  )}
                                </div>
                              )}
                              {errors.website_link && (
                                <p className="mt-1 text-sm text-danger-600">{errors.website_link.message}</p>
                              )}
                            </div>
                          </div>
                        </>
                      )}

                      <div>
                        <label className="block text-sm font-medium text-white mb-2">
                          Bio/Description
                          <span className="text-xs text-skyblue-400 ml-1">(Optional - Tell others about yourself and your motivation to donate)</span>
                        </label>
                        {isEditing ? (
                          <textarea
                            {...register('bio', {
                              minLength: {
                                value: 10,
                                message: 'Bio must be at least 10 characters if provided'
                              },
                              maxLength: {
                                value: 1000,
                                message: 'Bio must be less than 1000 characters'
                              },
                              validate: {
                                notOnlySpaces: (value) => 
                                  !value || value.trim().length >= 10 || 'Bio must contain meaningful content'
                              }
                            })}
                            className="input h-32 resize-none"
                            placeholder="Share your story, motivation, and what drives you to help others through donations... (Optional)"
                          />
                        ) : (
                          <div className="input bg-navy-800 text-skyblue-200 h-32 overflow-y-auto custom-scrollbar">
                            {profile.bio || 'Not provided'}
                          </div>
                        )}
                        {isEditing && (
                          <div className="flex justify-between mt-1">
                            {errors.bio ? (
                              <p className="text-sm text-danger-600">{errors.bio.message}</p>
                            ) : (
                              <span className="text-xs text-skyblue-400">
                                {watch('bio')?.length || 0}/1000 characters
                              </span>
                            )}
                          </div>
                        )}
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-white mb-3">
                          Donation Types You Can Provide *
                          <span className="text-xs text-skyblue-400 ml-1">(Select all that apply)</span>
                        </label>
                        {isEditing ? (
                          <Controller
                            name="donation_types"
                            control={control}
                            rules={{ 
                              validate: {
                                optional: () => true // Make donation types optional for editing
                              }
                            }}
                            render={({ field: { value = [], onChange } }) => (
                              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                                {[
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
                                ].map((type) => (
                                  <label key={type} className="flex items-center cursor-pointer">
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
                                      className="h-4 w-4 text-skyblue-600 focus:ring-skyblue-500 border-navy-600 rounded bg-navy-800"
                                    />
                                    <span className="ml-2 text-sm text-white">{type}</span>
                                  </label>
                                ))}
                              </div>
                            )}
                          />
                        ) : (
                          <div className="flex flex-wrap gap-2">
                            {profile.donation_types && profile.donation_types.length > 0 ? (
                              profile.donation_types.map((type, index) => (
                                <span key={index} className="badge badge-primary">{type}</span>
                              ))
                            ) : (
                              <span className="text-skyblue-400 text-sm">None specified</span>
                            )}
                          </div>
                        )}
                        {errors.donation_types && (
                          <p className="mt-1 text-sm text-danger-600">{errors.donation_types.message}</p>
                        )}
                      </div>

                      {/* Additional Donor Preferences */}
                      <div className="border-t border-navy-700 pt-6">
                        <h3 className="text-lg font-medium text-white mb-4">Donation Preferences</h3>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div>
                            <label className="block text-sm font-medium text-white mb-2">
                              Preferred Pickup Location
                            </label>
                            {isEditing ? (
                              <select
                                {...register('preferred_pickup_location')}
                                className="input"
                              >
                                <option value="">Select pickup preference</option>
                                <option value="home">My Home/Office</option>
                                <option value="public">Public Location</option>
                                <option value="delivery">I can deliver</option>
                                <option value="flexible">Flexible</option>
                              </select>
                            ) : (
                              <div className="input bg-navy-800 text-skyblue-200">
                                {profile.preferred_pickup_location ? 
                                  profile.preferred_pickup_location.charAt(0).toUpperCase() + profile.preferred_pickup_location.slice(1) 
                                  : 'Not specified'}
                              </div>
                            )}
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-white mb-2">
                              Donation Frequency
                            </label>
                            {isEditing ? (
                              <select
                                {...register('donation_frequency')}
                                className="input"
                              >
                                <option value="">Select frequency</option>
                                <option value="one-time">One-time</option>
                                <option value="monthly">Monthly</option>
                                <option value="quarterly">Quarterly</option>
                                <option value="as-needed">As needed</option>
                                <option value="regular">Regular basis</option>
                              </select>
                            ) : (
                              <div className="input bg-navy-800 text-skyblue-200">
                                {profile.donation_frequency ? 
                                  profile.donation_frequency.charAt(0).toUpperCase() + profile.donation_frequency.slice(1) 
                                  : 'Not specified'}
                              </div>
                            )}
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-white mb-2">
                              Maximum Donation Value (₱)
                            </label>
                            {isEditing ? (
                              <input
                                {...register('max_donation_value', {
                                  min: { value: 0, message: 'Value must be positive' },
                                  max: { value: 10000000, message: 'Value cannot exceed ₱10,000,000' },
                                  validate: {
                                    isValidNumber: (value) => {
                                      if (!value) return true // Optional field
                                      const num = parseFloat(value)
                                      return !isNaN(num) && num >= 0 || 'Please enter a valid positive number'
                                    }
                                  }
                                })}
                                type="number"
                                className="input"
                                placeholder="5000"
                                min="0"
                                step="1"
                              />
                            ) : (
                              <div className="input bg-navy-800 text-skyblue-200">
                                {profile.max_donation_value ? `₱${parseInt(profile.max_donation_value).toLocaleString()}` : 'Not specified'}
                              </div>
                            )}
                            {errors.max_donation_value && (
                              <p className="mt-1 text-sm text-danger-600">{errors.max_donation_value.message}</p>
                            )}
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-white mb-2">
                              Preferred Contact Method
                            </label>
                            {isEditing ? (
                              <select
                                {...register('preferred_contact_method')}
                                className="input"
                              >
                                <option value="">Select contact method</option>
                                <option value="email">Email</option>
                                <option value="phone">Phone</option>
                                <option value="sms">SMS/Text</option>
                                <option value="app">In-app messaging</option>
                              </select>
                            ) : (
                              <div className="input bg-navy-800 text-skyblue-200">
                                {profile.preferred_contact_method ? 
                                  profile.preferred_contact_method.charAt(0).toUpperCase() + profile.preferred_contact_method.slice(1) 
                                  : 'Not specified'}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Donation Availability */}
                      <div className="border-t border-navy-700 pt-6">
                        <h3 className="text-lg font-medium text-white mb-4">Availability</h3>
                        
                        <div className="space-y-4">
                          <div>
                            <label className="block text-sm font-medium text-white mb-3">
                              Available Days for Pickup/Coordination
                            </label>
                            {isEditing ? (
                              <Controller
                                name="availability_days"
                                control={control}
                                render={({ field: { value = [], onChange } }) => (
                                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                    {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map((day) => (
                                      <label key={day} className="flex items-center cursor-pointer">
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
                                          className="h-4 w-4 text-skyblue-600 focus:ring-skyblue-500 border-navy-600 rounded bg-navy-800"
                                        />
                                        <span className="ml-2 text-sm text-white">{day}</span>
                                      </label>
                                    ))}
                                  </div>
                                )}
                              />
                            ) : (
                              <div className="flex flex-wrap gap-2">
                                                              {profile.availability_days && profile.availability_days.length > 0 ? (
                                profile.availability_days.map((day, index) => (
                                    <span key={index} className="badge badge-primary">{day}</span>
                                  ))
                                ) : (
                                  <span className="text-skyblue-400 text-sm">Not specified</span>
                                )}
                              </div>
                            )}
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-white mb-3">
                              Preferred Time Slots
                            </label>
                            {isEditing ? (
                              <Controller
                                name="availability_times"
                                control={control}
                                render={({ field: { value = [], onChange } }) => (
                                  <div className="grid grid-cols-2 gap-3">
                                    {['Morning (6AM-12PM)', 'Afternoon (12PM-6PM)', 'Evening (6PM-9PM)', 'Flexible/Any time'].map((time) => (
                                      <label key={time} className="flex items-center cursor-pointer">
                                        <input
                                          type="checkbox"
                                          checked={value.includes(time)}
                                          onChange={(e) => {
                                            if (e.target.checked) {
                                              onChange([...value, time])
                                            } else {
                                              onChange(value.filter(item => item !== time))
                                            }
                                          }}
                                          className="h-4 w-4 text-skyblue-600 focus:ring-skyblue-500 border-navy-600 rounded bg-navy-800"
                                        />
                                        <span className="ml-2 text-sm text-white">{time}</span>
                                      </label>
                                    ))}
                                  </div>
                                )}
                              />
                            ) : (
                              <div className="flex flex-wrap gap-2">
                                                              {profile.availability_times && profile.availability_times.length > 0 ? (
                                profile.availability_times.map((time, index) => (
                                    <span key={index} className="badge badge-primary">{time}</span>
                                  ))
                                ) : (
                                  <span className="text-skyblue-400 text-sm">Not specified</span>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Privacy and Verification Preferences */}
                      <div className="border-t border-navy-700 pt-6">
                        <h3 className="text-lg font-medium text-white mb-4">Preferences & Privacy</h3>
                        
                        <div className="space-y-4">
                          {isEditing ? (
                            <>
                              <Controller
                                name="public_profile"
                                control={control}
                                render={({ field: { value, onChange } }) => (
                                  <label className="flex items-start">
                                    <input
                                      type="checkbox"
                                      checked={!!value}
                                      onChange={(e) => onChange(e.target.checked)}
                                      className="h-4 w-4 text-skyblue-600 focus:ring-skyblue-500 border-navy-600 rounded bg-navy-800 mt-0.5"
                                    />
                                    <div className="ml-3">
                                      <span className="text-sm font-medium text-white">Make my profile public</span>
                                      <p className="text-xs text-skyblue-400">Allow other users to see your profile and donation history</p>
                                    </div>
                                  </label>
                                )}
                              />

                              <Controller
                                name="receive_notifications"
                                control={control}
                                render={({ field: { value, onChange } }) => (
                                  <label className="flex items-start">
                                    <input
                                      type="checkbox"
                                      checked={!!value}
                                      onChange={(e) => onChange(e.target.checked)}
                                      className="h-4 w-4 text-skyblue-600 focus:ring-skyblue-500 border-navy-600 rounded bg-navy-800 mt-0.5"
                                    />
                                    <div className="ml-3">
                                      <span className="text-sm font-medium text-white">Receive donation match notifications</span>
                                      <p className="text-xs text-skyblue-400">Get notified when your donations match with requests</p>
                                    </div>
                                  </label>
                                )}
                              />

                              <Controller
                                name="share_contact_info"
                                control={control}
                                render={({ field: { value, onChange } }) => (
                                  <label className="flex items-start">
                                    <input
                                      type="checkbox"
                                      checked={!!value}
                                      onChange={(e) => onChange(e.target.checked)}
                                      className="h-4 w-4 text-skyblue-600 focus:ring-skyblue-500 border-navy-600 rounded bg-navy-800 mt-0.5"
                                    />
                                    <div className="ml-3">
                                      <span className="text-sm font-medium text-white">Allow sharing contact information</span>
                                      <p className="text-xs text-skyblue-400">Allow verified recipients to see your contact information for coordination</p>
                                    </div>
                                  </label>
                                )}
                              />
                            </>
                          ) : (
                            <div className="grid grid-cols-1 gap-3">
                              <div className="flex items-center justify-between p-3 bg-navy-800 rounded-lg">
                                <span className="text-sm text-white">Public Profile</span>
                                <span className={`text-sm ${profile.public_profile ? 'text-green-400' : 'text-gray-400'}`}>
                                  {profile.public_profile ? 'Enabled' : 'Disabled'}
                                </span>
                              </div>
                              <div className="flex items-center justify-between p-3 bg-navy-800 rounded-lg">
                                <span className="text-sm text-white">Donation Notifications</span>
                                <span className={`text-sm ${profile.receive_notifications ? 'text-green-400' : 'text-gray-400'}`}>
                                  {profile.receive_notifications ? 'Enabled' : 'Disabled'}
                                </span>
                              </div>
                              <div className="flex items-center justify-between p-3 bg-navy-800 rounded-lg">
                                <span className="text-sm text-white">Contact Sharing</span>
                                <span className={`text-sm ${profile.share_contact_info ? 'text-green-400' : 'text-gray-400'}`}>
                                  {profile.share_contact_info ? 'Enabled' : 'Disabled'}
                                </span>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}

                {profile.role === 'recipient' && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                    className="card p-6"
                  >
                    <h2 className="text-xl font-semibold text-white mb-6 flex items-center">
                      <Heart className="h-5 w-5 text-green-400 mr-2" />
                      Recipient Information
                    </h2>

                    <div className="space-y-6">
                      {/* Account Type for Recipients */}
                      <div>
                        <label className="block text-sm font-medium text-white mb-2">
                          Account Type
                        </label>
                        {isEditing ? (
                          <select
                            {...register('account_type')}
                            className="input"
                          >
                            <option value="individual">Individual</option>
                            <option value="organization">Organization/Institution</option>
                          </select>
                        ) : (
                          <div className="input bg-navy-800 text-skyblue-200 flex items-center">
                            <Building2 className="h-4 w-4 text-skyblue-400 mr-2" />
                            {profile.account_type === 'organization' ? 'Organization/Institution' : 'Individual'}
                          </div>
                        )}
                      </div>

                      {/* Organization Name for organizational recipients */}
                      {(isEditing ? watchedAccountType : profile.account_type) === 'organization' && (
                        <div>
                          <label className="block text-sm font-medium text-white mb-2">
                            Organization/Institution Name *
                          </label>
                          {isEditing ? (
                            <input
                              {...register('organization_name', {
                                validate: {
                                  requiredForOrgType: (value, formValues) => {
                                    const accountType = formValues.account_type || profile.account_type
                                    if (accountType === 'organization' && value && value.trim().length > 0) {
                                      if (value.trim().length < 2) {
                                        return 'Organization name must be at least 2 characters'
                                      }
                                      if (value.trim().length > 200) {
                                        return 'Organization name must be less than 200 characters'
                                      }
                                    }
                                    return true
                                  }
                                }
                              })}
                              className="input"
                              placeholder="Enter organization/institution name"
                            />
                          ) : (
                            <div className="input bg-navy-800 text-skyblue-200">
                              {profile.organization_name || 'Not provided'}
                            </div>
                          )}
                          {errors.organization_name && (
                            <p className="mt-1 text-sm text-danger-600">{errors.organization_name.message}</p>
                          )}
                        </div>
                      )}

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-sm font-medium text-white mb-2">
                          Household Size
                        </label>
                        {isEditing ? (
                          <input
                            {...register('household_size', {
                              validate: {
                                validIfProvided: (value) => {
                                  if (value && value.toString().trim().length > 0) {
                                    const num = parseInt(value)
                                    if (!Number.isInteger(num) || num <= 0) {
                                      return 'Please enter a valid whole number'
                                    }
                                    if (num < 1) {
                                      return 'Household size must be at least 1'
                                    }
                                    if (num > 50) {
                                      return 'Household size cannot exceed 50 people'
                                    }
                                  }
                                  return true
                                }
                              }
                            })}
                            type="number"
                            className="input"
                            placeholder="Enter household size"
                            min="1"
                          />
                        ) : (
                          <div className="input bg-navy-800 text-skyblue-200">
                            {profile.household_size || 'Not provided'}
                          </div>
                        )}
                        {errors.household_size && (
                          <p className="mt-1 text-sm text-danger-600">{errors.household_size.message}</p>
                        )}
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-white mb-2">
                          Emergency Contact Name
                        </label>
                        {isEditing ? (
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
                            className="input"
                            placeholder="Enter emergency contact name"
                          />
                        ) : (
                          <div className="input bg-navy-800 text-skyblue-200">
                            {profile.emergency_contact_name || 'Not provided'}
                          </div>
                        )}
                        {errors.emergency_contact_name && (
                          <p className="mt-1 text-sm text-danger-600">{errors.emergency_contact_name.message}</p>
                        )}
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-white mb-2">
                          Emergency Contact Phone
                        </label>
                        {isEditing ? (
                          <input
                            {...register('emergency_contact_phone', {
                              pattern: {
                                value: /^(09|\+639)\d{9}$/,
                                message: 'Please enter a valid Philippines phone number (e.g., 09123456789 or +639123456789)'
                              },
                              validate: {
                                notPlaceholder: (value) => 
                                  !value || value !== '09000000000' || 'Please enter an actual phone number'
                              }
                            })}
                            className="input"
                            placeholder="09123456789 or +639123456789"
                            maxLength="13"
                          />
                        ) : (
                          <div className="input bg-navy-800 text-skyblue-200">
                            {profile.emergency_contact_phone || 'Not provided'}
                          </div>
                        )}
                        {errors.emergency_contact_phone && (
                          <p className="mt-1 text-sm text-danger-600">{errors.emergency_contact_phone.message}</p>
                        )}
                      </div>

                      <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-white mb-3">
                          Types of Assistance Needed
                        </label>
                        {isEditing ? (
                          <Controller
                            name="assistance_needs"
                            control={control}
                            rules={{ 
                              validate: {
                                optional: () => true // Make assistance needs optional for editing
                              }
                            }}
                            render={({ field: { value = [], onChange } }) => (
                              <div className="grid grid-cols-2 gap-3">
                                {[
                                  'Food & Beverages',
                                  'Clothing & Accessories',
                                  'Medical Supplies',
                                  'Educational Materials',
                                  'Household Items',
                                  'Financial Assistance',
                                  'Personal Care Items',
                                  'Transportation',
                                  'Emergency Supplies',
                                  'Other'
                                ].map((type) => (
                                  <label key={type} className="flex items-center cursor-pointer">
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
                                      className="h-4 w-4 text-skyblue-600 focus:ring-skyblue-500 border-navy-600 rounded bg-navy-800"
                                    />
                                    <span className="ml-2 text-sm text-white">{type}</span>
                                  </label>
                                ))}
                              </div>
                            )}
                          />
                        ) : (
                          <div className="flex flex-wrap gap-2">
                            {profile.assistance_needs && profile.assistance_needs.length > 0 ? (
                              profile.assistance_needs.map((need, index) => (
                                <span key={index} className="badge badge-success">{need}</span>
                              ))
                            ) : (
                              <span className="text-skyblue-400 text-sm">None specified</span>
                            )}
                          </div>
                        )}
                        {errors.assistance_needs && (
                          <p className="mt-1 text-sm text-danger-600">{errors.assistance_needs.message}</p>
                        )}
                      </div>

                      {/* Bio Section for Recipients */}
                      <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-white mb-2">
                          Bio/Description
                          <span className="text-xs text-skyblue-400 ml-1">(Optional - Tell others about your situation and needs)</span>
                        </label>
                        {isEditing ? (
                          <textarea
                            {...register('bio', {
                              minLength: {
                                value: 10,
                                message: 'Bio must be at least 10 characters if provided'
                              },
                              maxLength: {
                                value: 1000,
                                message: 'Bio must be less than 1000 characters'
                              },
                              validate: {
                                notOnlySpaces: (value) => 
                                  !value || value.trim().length >= 10 || 'Bio must contain meaningful content'
                              }
                            })}
                            className="input h-32 resize-none"
                            placeholder="Share your story, current situation, and specific needs... (Optional)"
                          />
                        ) : (
                          <div className="input bg-navy-800 text-skyblue-200 h-32 overflow-y-auto custom-scrollbar">
                            {profile.bio || 'Not provided'}
                          </div>
                        )}
                        {isEditing && (
                          <div className="flex justify-between mt-1">
                            {errors.bio ? (
                              <p className="text-sm text-danger-600">{errors.bio.message}</p>
                            ) : (
                              <span className="text-xs text-skyblue-400">
                                {watch('bio')?.length || 0}/1000 characters
                              </span>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Recipient Privacy Preferences */}
                      <div className="md:col-span-2 border-t border-navy-700 pt-6">
                        <h3 className="text-lg font-medium text-white mb-4">Privacy & Notification Preferences</h3>
                        
                        <div className="space-y-4">
                          {isEditing ? (
                            <>
                              <Controller
                                name="public_profile"
                                control={control}
                                render={({ field: { value, onChange } }) => (
                                  <label className="flex items-start">
                                    <input
                                      type="checkbox"
                                      checked={!!value}
                                      onChange={(e) => onChange(e.target.checked)}
                                      className="h-4 w-4 text-skyblue-600 focus:ring-skyblue-500 border-navy-600 rounded bg-navy-800 mt-0.5"
                                    />
                                    <div className="ml-3">
                                      <span className="text-sm font-medium text-white">Make my profile visible to donors</span>
                                      <p className="text-xs text-skyblue-400">Allow donors to see your profile and assistance needs</p>
                                    </div>
                                  </label>
                                )}
                              />

                              <Controller
                                name="receive_notifications"
                                control={control}
                                render={({ field: { value, onChange } }) => (
                                  <label className="flex items-start">
                                    <input
                                      type="checkbox"
                                      checked={!!value}
                                      onChange={(e) => onChange(e.target.checked)}
                                      className="h-4 w-4 text-skyblue-600 focus:ring-skyblue-500 border-navy-600 rounded bg-navy-800 mt-0.5"
                                    />
                                    <div className="ml-3">
                                      <span className="text-sm font-medium text-white">Receive donation availability notifications</span>
                                      <p className="text-xs text-skyblue-400">Get notified when donations matching your needs become available</p>
                                    </div>
                                  </label>
                                )}
                              />

                              <Controller
                                name="share_contact_info"
                                control={control}
                                render={({ field: { value, onChange } }) => (
                                  <label className="flex items-start">
                                    <input
                                      type="checkbox"
                                      checked={!!value}
                                      onChange={(e) => onChange(e.target.checked)}
                                      className="h-4 w-4 text-skyblue-600 focus:ring-skyblue-500 border-navy-600 rounded bg-navy-800 mt-0.5"
                                    />
                                    <div className="ml-3">
                                      <span className="text-sm font-medium text-white">Allow donors to contact me directly</span>
                                      <p className="text-xs text-skyblue-400">Let verified donors see your contact information for coordination</p>
                                    </div>
                                  </label>
                                )}
                              />
                            </>
                          ) : (
                            <div className="grid grid-cols-1 gap-3">
                              <div className="flex items-center justify-between p-3 bg-navy-800 rounded-lg">
                                <span className="text-sm text-white">Public Profile</span>
                                <span className={`text-sm ${profile.public_profile ? 'text-green-400' : 'text-gray-400'}`}>
                                  {profile.public_profile ? 'Visible' : 'Private'}
                                </span>
                              </div>
                              <div className="flex items-center justify-between p-3 bg-navy-800 rounded-lg">
                                <span className="text-sm text-white">Donation Notifications</span>
                                <span className={`text-sm ${profile.receive_notifications ? 'text-green-400' : 'text-gray-400'}`}>
                                  {profile.receive_notifications ? 'Enabled' : 'Disabled'}
                                </span>
                              </div>
                              <div className="flex items-center justify-between p-3 bg-navy-800 rounded-lg">
                                <span className="text-sm text-white">Direct Contact</span>
                                <span className={`text-sm ${profile.share_contact_info ? 'text-green-400' : 'text-gray-400'}`}>
                                  {profile.share_contact_info ? 'Allowed' : 'Not Allowed'}
                                </span>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                    </div>
                  </motion.div>
                )}

                {profile.role === 'volunteer' && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                  >
                    <VolunteerProfileSettings 
                      profileData={profile}
                      onUpdate={(data) => {
                        // Update form data when volunteer component changes
                        Object.entries(data).forEach(([key, value]) => {
                          setValue(key, value)
                        })
                      }}
                      isEditing={isEditing}
                    />
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Action Buttons */}
              {isEditing && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex space-x-4"
                >
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="btn btn-primary flex items-center flex-1"
                  >
                    {isLoading ? (
                      <LoadingSpinner size="sm" />
                    ) : (
                      <>
                        <Save className="h-4 w-4 mr-2" />
                        Save Changes
                      </>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={cancelEdit}
                    className="btn btn-secondary flex items-center flex-1"
                  >
                    <X className="h-4 w-4 mr-2" />
                    Cancel
                  </button>
                </motion.div>
              )}
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Account Security */}
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.4 }}
                className="card p-6"
              >
                <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
                  <Shield className="h-5 w-5 text-skyblue-400 mr-2" />
                  Account Security
                </h3>

                <div className="space-y-4">
                  <div className="flex items-center justify-between p-3 bg-navy-800 rounded-lg">
                    <div>
                      <p className="text-sm font-medium text-white">Password</p>
                      <p className="text-xs text-skyblue-400">Last updated: Never</p>
                    </div>
                    <button
                      onClick={() => setShowPasswordSection(!showPasswordSection)}
                      className="text-skyblue-400 hover:text-skyblue-300 text-sm"
                    >
                      {showPasswordSection ? 'Cancel' : 'Change'}
                    </button>
                  </div>

                  <AnimatePresence>
                    {showPasswordSection && (
                      <motion.form
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        onSubmit={handlePasswordSubmit(onPasswordSubmit)}
                        className="space-y-4 overflow-hidden"
                      >
                        <div>
                          <label className="block text-sm font-medium text-white mb-2">
                            New Password
                          </label>
                          <div className="relative">
                            <input
                              {...registerPassword('newPassword', {
                                required: 'New password is required',
                                minLength: { value: 6, message: 'Password must be at least 6 characters' }
                              })}
                              type={showNewPassword ? 'text' : 'password'}
                              className="input pr-10"
                              placeholder="Enter new password"
                            />
                            <button
                              type="button"
                              className="absolute inset-y-0 right-0 pr-3 flex items-center"
                              onClick={() => setShowNewPassword(!showNewPassword)}
                            >
                              {showNewPassword ? (
                                <EyeOff className="h-5 w-5 text-gray-400" />
                              ) : (
                                <Eye className="h-5 w-5 text-gray-400" />
                              )}
                            </button>
                          </div>
                          {passwordErrors.newPassword && (
                            <p className="mt-1 text-sm text-danger-600">{passwordErrors.newPassword.message}</p>
                          )}
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-white mb-2">
                            Confirm New Password
                          </label>
                          <input
                            {...registerPassword('confirmPassword', {
                              required: 'Please confirm your password',
                              validate: value => value === newPassword || 'Passwords do not match'
                            })}
                            type="password"
                            className="input"
                            placeholder="Confirm new password"
                          />
                          {passwordErrors.confirmPassword && (
                            <p className="mt-1 text-sm text-danger-600">{passwordErrors.confirmPassword.message}</p>
                          )}
                        </div>

                        <button
                          type="submit"
                          disabled={isLoading}
                          className="btn btn-primary w-full"
                        >
                          {isLoading ? <LoadingSpinner size="sm" /> : 'Update Password'}
                        </button>
                      </motion.form>
                    )}
                  </AnimatePresence>

                  <div className="flex items-center justify-between p-3 bg-navy-800 rounded-lg">
                    <div>
                      <p className="text-sm font-medium text-white">Two-Factor Authentication</p>
                      <p className="text-xs text-skyblue-400">Coming soon</p>
                    </div>
                    <span className="text-xs text-amber-400 bg-amber-900/20 px-2 py-1 rounded">
                      Soon
                    </span>
                  </div>
                </div>
              </motion.div>

              {/* Profile Completion Status - Hide for admins */}
              {profile.role !== 'admin' && (
                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.5 }}
                  className="card p-6"
                >
                  <h3 className="text-lg font-semibold text-white mb-4">
                    Profile Verification
                  </h3>

                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-white">Profile Completion</span>
                      <span className="text-sm font-medium text-white">{completionPercentage}%</span>
                    </div>
                    
                    <div className="w-full bg-navy-800 rounded-full h-2">
                      <div
                        className="bg-gradient-to-r from-skyblue-500 to-blue-500 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${completionPercentage}%` }}
                      />
                    </div>

                    {completionPercentage === 100 ? (
                      <div className="flex items-center space-x-2 text-green-400">
                        <CheckCircle className="h-4 w-4" />
                        <span className="text-sm">Profile Complete</span>
                      </div>
                    ) : (
                      <div className="flex items-center space-x-2 text-amber-400">
                        <AlertCircle className="h-4 w-4" />
                        <span className="text-sm">Complete your profile for verification</span>
                      </div>
                    )}
                  </div>
                </motion.div>
              )}

              {/* Account Stats */}
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.6 }}
                className="card p-6"
              >
                <h3 className="text-lg font-semibold text-white mb-4">
                  Account Summary
                </h3>

                {/* Mini Profile Card */}
                <div className="flex items-center space-x-3 p-3 bg-navy-800 rounded-lg mb-4">
                  <div className="w-12 h-12 rounded-full overflow-hidden bg-navy-700 border-2 border-navy-600 flex items-center justify-center flex-shrink-0">
                    {imagePreview || profile.profile_image_url ? (
                      <img
                        src={imagePreview || profile.profile_image_url}
                        alt="Profile"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <User className="h-6 w-6 text-skyblue-400" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white truncate">
                      {profile.name || 'Name not set'}
                    </p>
                    <p className="text-xs text-skyblue-400 truncate">
                      {profile.email}
                    </p>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-skyblue-300">Member Since</span>
                    <span className="text-sm text-white">
                      {profile.created_at ? new Date(profile.created_at).toLocaleDateString() : 'Unknown'}
                    </span>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-skyblue-300">Account Type</span>
                    <span className="text-sm text-white capitalize">{profile.role}</span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-sm text-skyblue-300">Status</span>
                    <span className="text-sm text-green-400">Active</span>
                  </div>
                </div>
              </motion.div>
            </div>
          </div>
        </form>
      </div>

      {/* Location Picker Modal */}
      <LocationPicker
        isOpen={showLocationPicker}
        onClose={() => setShowLocationPicker(false)}
        onLocationSelect={handleLocationSelect}
        initialLocation={selectedLocation}
        title="Select Your Location"
      />
    </div>
  )
}

export default ProfilePage 