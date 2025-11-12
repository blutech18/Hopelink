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
  Navigation,
  Award,
  Settings
} from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import { useToast } from '../../contexts/ToastContext'
import { ProfileSkeleton } from '../../components/ui/Skeleton'
import LoadingSpinner from '../../components/ui/LoadingSpinner'
import VolunteerProfileSettings from '../../components/ui/VolunteerProfileSettings'
import { IDVerificationBadge } from '../../components/ui/VerificationBadge'
import AdminSettings from '../../components/ui/AdminSettings'
import LocationPicker from '../../components/ui/LocationPicker'
import { db } from '../../lib/supabase'

const ProfilePage = () => {
  const { user, profile, updateProfile, updatePassword } = useAuth()
  const { success, error } = useToast()
  const [badges, setBadges] = useState([])

  // Helper function to calculate age from birthdate
  const calculateAge = (birthDate) => {
    if (!birthDate) return null
    const today = new Date()
    const birth = new Date(birthDate)
    let age = today.getFullYear() - birth.getFullYear()
    const monthDiff = today.getMonth() - birth.getMonth()
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--
    }
    return age
  }
  const [donorStats, setDonorStats] = useState(null)
  const [volunteerStats, setVolunteerStats] = useState(null)
  const [completedEventsCount, setCompletedEventsCount] = useState(0)
  const [isEditing] = useState(true) // Always in edit mode
  const [isLoading, setIsLoading] = useState(false)
  const [showPasswordSection, setShowPasswordSection] = useState(false)
  const [showCurrentPassword, setShowCurrentPassword] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [profileImage, setProfileImage] = useState(null)
  const [imagePreview, setImagePreview] = useState(null)
  const [selectedAvatar, setSelectedAvatar] = useState(null)
  const [originalProfileImage, setOriginalProfileImage] = useState(null)
  const [uploadingImage, setUploadingImage] = useState(false)
  const [savingImage, setSavingImage] = useState(false)
  const [idImagePreview, setIdImagePreview] = useState(null)
  const [uploadingIdImage, setUploadingIdImage] = useState(false)
  const [secondaryIdImagePreview, setSecondaryIdImagePreview] = useState(null)
  const [uploadingSecondaryIdImage, setUploadingSecondaryIdImage] = useState(false)
  const [showLocationPicker, setShowLocationPicker] = useState(false)
  const [selectedLocation, setSelectedLocation] = useState(null)
  const [activeTab, setActiveTab] = useState('personal')
  const [adminSettingsDirty, setAdminSettingsDirty] = useState(false)
  const [showProfileImageModal, setShowProfileImageModal] = useState(false)
  const fileInputRef = useRef(null)
  const adminSettingsRef = useRef(null)
  const volunteerSettingsRef = useRef(null)
  const isResettingRef = useRef(false)

  // Check URL hash on mount and when hash changes to set active tab (for admin-settings)
  useEffect(() => {
    const checkHash = () => {
      if (profile?.role === 'admin') {
        if (window.location.hash === '#admin-settings') {
          setActiveTab('admin-settings')
        } else if (activeTab === 'role') {
          // If admin user is on role tab, redirect to personal tab (admin has no role tab)
          setActiveTab('personal')
        }
      }
    }
    
    // Check on mount
    checkHash()
    
    // Listen for hash changes
    window.addEventListener('hashchange', checkHash)
    
    return () => {
      window.removeEventListener('hashchange', checkHash)
    }
  }, [profile?.role, activeTab])

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
      // Volunteer-specific fields
      volunteer_experience: '',
      special_skills: [],
      languages_spoken: [],
      preferred_delivery_types: [],
      communication_preferences: [],
      delivery_notes: '',
      has_insurance: false,
      insurance_provider: '',
      insurance_policy_number: '',
      // Granular address fields
      address_house: '',
      address_street: '',
      address_barangay: '',
      address_subdivision: '',
      address_landmark: '',
      // Personal information fields
      birthdate: '',
      age: ''
    }
  })

  const {
    register: registerPassword,
    handleSubmit: handlePasswordSubmit,
    watch: watchPassword,
    reset: resetPassword,
    formState: { errors: passwordErrors }
  } = useForm()

  // Redirect volunteers away from ID Verification tab
  useEffect(() => {
    if (profile?.role === 'volunteer' && activeTab === 'id') {
      setActiveTab('personal')
    }
  }, [profile?.role, activeTab])

  // Load profile data into form when component mounts or profile changes
  useEffect(() => {
    if (profile) {
      const formData = {
        name: profile.name || '',
        email: profile.email || '',
        phone_number: profile.phone_number || '',
        birthdate: profile.birthdate || profile.birth_date || profile.date_of_birth || '',
        age: profile.age || '',
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
        volunteer_experience: profile.volunteer_experience || '',
        special_skills: Array.isArray(profile.special_skills) ? profile.special_skills : [],
        languages_spoken: Array.isArray(profile.languages_spoken) ? profile.languages_spoken : [],
        preferred_delivery_types: Array.isArray(profile.preferred_delivery_types) ? profile.preferred_delivery_types : [],
        communication_preferences: Array.isArray(profile.communication_preferences) ? profile.communication_preferences : [],
        delivery_notes: profile.delivery_notes || '',
        has_insurance: profile.has_insurance || false,
        insurance_provider: profile.insurance_provider || '',
        insurance_policy_number: profile.insurance_policy_number || '',
        donation_types: Array.isArray(profile.donation_types) ? profile.donation_types : [],
        assistance_needs: Array.isArray(profile.assistance_needs) ? profile.assistance_needs : [],
        account_type: profile.account_type || 'individual',
        donation_frequency: profile.donation_frequency || '',
        max_donation_value: profile.max_donation_value || '',
        // Granular address fields
        address_house: profile.address_house || '',
        address_street: profile.address_street || '',
        address_barangay: profile.address_barangay || '',
        address_subdivision: profile.address_subdivision || '',
        address_landmark: profile.address_landmark || '',
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
        setOriginalProfileImage(profile.profile_image_url)
        // Check if the profile image is an avatar
        const avatarMatch = profile.profile_image_url.match(/\/avatar(\d+)\.png/)
        if (avatarMatch) {
          setSelectedAvatar(parseInt(avatarMatch[1]))
        } else {
          setSelectedAvatar(null)
        }
      } else {
        setImagePreview(null)
        setOriginalProfileImage(null)
        setSelectedAvatar(null)
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

  // Track form changes and compare with original profile to clear dirty state when values match
  useEffect(() => {
    if (!profile || !isDirty || isResettingRef.current) return
    
    let timeoutId = null
    
    const subscription = watch((formValues) => {
      // Skip if we're currently resetting to prevent infinite loop
      if (isResettingRef.current) return
      
      // Debounce the comparison to avoid too many checks
      if (timeoutId) {
        clearTimeout(timeoutId)
      }
      
      timeoutId = setTimeout(() => {
        if (isResettingRef.current) return
        
        // Compare current form values with original profile values
        const originalFormData = {
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
          volunteer_experience: profile.volunteer_experience || '',
          special_skills: Array.isArray(profile.special_skills) ? profile.special_skills : [],
          languages_spoken: Array.isArray(profile.languages_spoken) ? profile.languages_spoken : [],
          preferred_delivery_types: Array.isArray(profile.preferred_delivery_types) ? profile.preferred_delivery_types : [],
          communication_preferences: Array.isArray(profile.communication_preferences) ? profile.communication_preferences : [],
          delivery_notes: profile.delivery_notes || '',
          has_insurance: profile.has_insurance || false,
          insurance_provider: profile.insurance_provider || '',
          insurance_policy_number: profile.insurance_policy_number || '',
          donation_types: Array.isArray(profile.donation_types) ? profile.donation_types : [],
          assistance_needs: Array.isArray(profile.assistance_needs) ? profile.assistance_needs : [],
          account_type: profile.account_type || 'individual',
          donation_frequency: profile.donation_frequency || '',
          max_donation_value: profile.max_donation_value || '',
          primary_id_type: profile.primary_id_type || '',
          primary_id_number: profile.primary_id_number || '',
          primary_id_expiry: profile.primary_id_expiry || '',
          secondary_id_type: profile.secondary_id_type || '',
          secondary_id_number: profile.secondary_id_number || '',
          secondary_id_expiry: profile.secondary_id_expiry || '',
          organization_representative_name: profile.organization_representative_name || '',
          organization_representative_position: profile.organization_representative_position || '',
          // Granular address fields
          address_house: profile.address_house || '',
          address_street: profile.address_street || '',
          address_barangay: profile.address_barangay || '',
          address_subdivision: profile.address_subdivision || '',
          address_landmark: profile.address_landmark || ''
        }
        
        // Compare all fields
        const allFieldsMatch = Object.keys(originalFormData).every(key => {
          const currentValue = formValues[key]
          const originalValue = originalFormData[key]
          
          // Handle arrays
          if (Array.isArray(currentValue) && Array.isArray(originalValue)) {
            if (currentValue.length !== originalValue.length) return false
            return currentValue.every((val, idx) => val === originalValue[idx])
          }
          
          // Handle other types
          return currentValue === originalValue
        })
        
        // If all fields match original values, reset form to clear dirty state
        // Use reset with keepValues to reset dirty state without changing values
        if (allFieldsMatch && !isResettingRef.current) {
          isResettingRef.current = true
          reset(formValues, { keepValues: true, keepDefaultValues: true })
          // Reset the flag after reset completes
          requestAnimationFrame(() => {
            isResettingRef.current = false
          })
        }
      }, 100) // Debounce by 100ms
    })
    
    return () => {
      subscription.unsubscribe()
      if (timeoutId) {
        clearTimeout(timeoutId)
      }
    }
  }, [watch, profile, isDirty, reset])

  // Load derived badges
  useEffect(() => {
    let mounted = true
    async function load() {
      if (!user?.id) return
      try {
        const b = await db.getUserBadges(user.id)
        if (mounted) setBadges(b || [])
      } catch (_) {}
    }
    load()
    return () => { mounted = false }
  }, [user?.id])

  // Load donor stats and completed events for donors and volunteers
  useEffect(() => {
    let mounted = true
    async function loadStats() {
      if (!profile?.id) return
      
      try {
        // Load completed events for both donors and volunteers
        const events = await db.getUserCompletedEvents(profile.id).catch(() => [])
        if (mounted) {
          setCompletedEventsCount(events?.length || 0)
        }
        
        // Load role-specific stats
        if (profile?.role === 'donor') {
          const stats = await db.getDonorStats(profile.id).catch(() => null)
          if (mounted) {
            setDonorStats(stats)
          }
        } else if (profile?.role === 'volunteer') {
          const stats = await db.getVolunteerStats(profile.id).catch(() => null)
          if (mounted) {
            setVolunteerStats(stats)
          }
        }
      } catch (_) {}
    }
    loadStats()
    return () => { mounted = false }
  }, [profile?.id, profile?.role])

  // Image handling functions
  const handleImageSelect = async (event) => {
    const file = event.target.files[0]
    if (!file) return

    try {
      setUploadingImage(true)
      
      // Use storage helper for secure upload
      const { uploadFile, validateFile } = await import('../../lib/storageHelper')
      
      // Validate file
      const validation = validateFile(file, 'image')
      if (!validation.valid) {
        error(validation.error || 'Invalid file')
        return
      }

      // Create preview for immediate UI feedback
      const reader = new FileReader()
      reader.onload = (e) => {
        setImagePreview(e.target.result)
      }
      reader.readAsDataURL(file)
      
      // Upload to Supabase Storage
      if (!profile?.id) {
        error('User profile not loaded. Please refresh the page.')
        return
      }
      
      const { url, path } = await uploadFile(file, profile.id, 'profile')
      
      // Set the URL (not base64)
      setProfileImage(url)
      setSelectedAvatar(null) // Clear avatar selection when uploading own image
      
      success('Image uploaded successfully!')
    } catch (err) {
      console.error('Error uploading image:', err)
      error(err.message || 'Failed to upload image. Please try again.')
      setImagePreview(null)
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
      setSelectedAvatar(null)
      setOriginalProfileImage(null)
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
        setOriginalProfileImage(profile.profile_image_url)
        const avatarMatch = profile.profile_image_url.match(/\/avatar(\d+)\.png/)
        if (avatarMatch) {
          setSelectedAvatar(parseInt(avatarMatch[1]))
        }
      }
    } finally {
      setUploadingImage(false)
    }
  }

  const handleAvatarSelect = (avatarNumber) => {
    // Store original profile image if not already stored
    if (!originalProfileImage && profile?.profile_image_url) {
      setOriginalProfileImage(profile.profile_image_url)
    }
    
    const avatarPath = `/avatar${avatarNumber}.png`
    setImagePreview(avatarPath)
    setProfileImage(avatarPath)
    setSelectedAvatar(avatarNumber)
    // Clear file input if any
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const handleCancelAvatarSelection = () => {
    // Restore original profile image preview
    if (originalProfileImage) {
      setImagePreview(originalProfileImage)
    } else {
      setImagePreview(null)
    }
    // Clear profileImage to hide Save Picture button
    setProfileImage(null)
    setSelectedAvatar(null)
    // Clear file input if any
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
    success('Avatar selection cancelled.')
  }

  const saveProfileImage = async () => {
    if (!profileImage) return

    try {
      setSavingImage(true)
      await updateProfile({ profile_image_url: profileImage })
      success('Profile picture updated successfully!')
      setProfileImage(null) // Clear the pending image
      // Update original profile image to the newly saved one
      setOriginalProfileImage(profileImage)
    } catch (err) {
      console.error('Error updating profile image:', err)
      error('Failed to update profile picture. Please try again.')
    } finally {
      setSavingImage(false)
    }
  }

  // ID Image handling functions
  const handleIdImageSelect = async (event) => {
    const file = event.target.files[0]
    if (!file) return

    try {
      setUploadingIdImage(true)
      
      // Use storage helper for secure upload
      const { uploadFile, validateFile } = await import('../../lib/storageHelper')
      
      // Validate file
      const validation = validateFile(file, 'document')
      if (!validation.valid) {
        error(validation.error || 'Invalid file')
        return
      }

      // Create preview for immediate UI feedback
      const reader = new FileReader()
      reader.onload = (e) => {
        setIdImagePreview(e.target.result)
      }
      reader.readAsDataURL(file)
      
      // Upload to Supabase Storage
      if (!profile?.id) {
        error('User profile not loaded. Please refresh the page.')
        return
      }
      
      const { url, path } = await uploadFile(file, profile.id, 'id-documents')
      
      // Set the URL (not base64)
      setValue('primary_id_image_url', url)
      
      success('ID image uploaded successfully!')
    } catch (err) {
      console.error('Error uploading ID image:', err)
      error(err.message || 'Failed to upload ID image. Please try again.')
      setIdImagePreview(null)
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

    try {
      setUploadingSecondaryIdImage(true)
      
      // Use storage helper for secure upload
      const { uploadFile, validateFile } = await import('../../lib/storageHelper')
      
      // Validate file
      const validation = validateFile(file, 'document')
      if (!validation.valid) {
        error(validation.error || 'Invalid file')
        return
      }

      // Create preview for immediate UI feedback
      const reader = new FileReader()
      reader.onload = (e) => {
        setSecondaryIdImagePreview(e.target.result)
      }
      reader.readAsDataURL(file)
      
      // Upload to Supabase Storage
      if (!profile?.id) {
        error('User profile not loaded. Please refresh the page.')
        return
      }
      
      const { url, path } = await uploadFile(file, profile.id, 'id-documents')
      
      // Set the URL (not base64)
      setValue('secondary_id_image_url', url)
      
      success('Secondary ID image uploaded successfully!')
    } catch (err) {
      console.error('Error uploading secondary ID image:', err)
      error(err.message || 'Failed to upload secondary ID image. Please try again.')
      setSecondaryIdImagePreview(null)
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
      sublocality_level_1: '',
      sublocality_level_2: '',
      neighborhood: '',
      locality: '',
      administrative_area_level_3: '',
      administrative_area_level_4: '',
      administrative_area_level_5: '',
      administrative_area_level_2: '',
      administrative_area_level_1: '',
      postal_code: '',
      country: ''
    }

    // Parse all types, not just the first one
    addressComponents.forEach(component => {
      component.types.forEach(type => {
        if (parsed.hasOwnProperty(type) && !parsed[type]) {
          parsed[type] = component.long_name
        }
      })
    })

    return parsed
  }

  // Helper: derive barangay from parsed components or formatted address
  const deriveBarangay = (parsed, formattedAddress = '') => {
    const candidates = [
      parsed.sublocality_level_1,
      parsed.sublocality_level_2,
      parsed.administrative_area_level_3,
      parsed.administrative_area_level_4,
      parsed.administrative_area_level_5,
      parsed.neighborhood,
      parsed.sublocality
    ].filter(Boolean)

    let barangay = candidates.find(val => /barangay|brgy/i.test(val)) || candidates[0] || ''

    // Normalize common prefixes
    if (barangay) {
      barangay = barangay
        .replace(/^barangay\s*/i, '')
        .replace(/^brgy\.?\s*/i, '')
        .trim()
    }

    // Fallback: try to extract from formatted address
    if (!barangay && formattedAddress) {
      const match = formattedAddress.match(/\b(?:Barangay|Brgy\.?)[\s-]*([^,]+)\b/i)
      if (match && match[1]) {
        barangay = match[1].trim()
      }
    }

    return barangay
  }

  // Handle location selection from LocationPicker
  const handleLocationSelect = (location) => {
    setSelectedLocation(location)
    
    // Parse address components if available
    if (location.addressComponents) {
      console.log('Raw address components:', location.addressComponents)
      const parsed = parseAddressComponents(location.addressComponents)
      console.log('Parsed address components:', parsed)
      
      // Build street address from street number and route
      const houseNumber = parsed.street_number
      const streetName = parsed.route
      const barangay = deriveBarangay(parsed, location.address)
      const streetAddress = [houseNumber, streetName].filter(Boolean).join(' ').trim()
      
      // Update all address fields
      if (streetAddress) {
        setValue('address', streetAddress, { shouldDirty: true })
      } else if (location.address) {
        // Fallback to full formatted address
        setValue('address', location.address, { shouldDirty: true })
      }

      // Set granular fields when available
      if (houseNumber) setValue('address_house', houseNumber, { shouldDirty: true })
      if (streetName) setValue('address_street', streetName, { shouldDirty: true })
      if (barangay) setValue('address_barangay', barangay, { shouldDirty: true })
      
      // City: Try locality first, then sublocality, then administrative_area_level_2
      const city = parsed.locality || parsed.sublocality_level_1 || parsed.sublocality || parsed.administrative_area_level_2
      if (city) {
        setValue('city', city, { shouldDirty: true })
      }
      
      // Province: Check both administrative_area_level_1 and administrative_area_level_2
      // In Philippines, sometimes province is in level_2 and region is in level_1
      const provinceCandidate = parsed.administrative_area_level_2 || parsed.administrative_area_level_1
      
      if (provinceCandidate) {
        const validProvinces = ['Misamis Oriental', 'Misamis Occidental', 'Bukidnon', 'Camiguin', 'Lanao del Norte']
        
        // Try to find a matching province (case-insensitive and partial match)
        const matchedProvince = validProvinces.find(p => {
          const pLower = p.toLowerCase()
          const candidateLower = provinceCandidate.toLowerCase()
          
          return pLower === candidateLower || 
                 candidateLower.includes(pLower) ||
                 pLower.includes(candidateLower)
        })
        
        if (matchedProvince) {
          setValue('province', matchedProvince, { shouldDirty: true })
        } else {
          // If not in our predefined list, still set the value
          setValue('province', provinceCandidate, { shouldDirty: true })
        }
      }
      
      // ZIP Code: Sometimes postal_code might be empty, try to infer from city for common areas
      if (parsed.postal_code) {
        setValue('zip_code', parsed.postal_code, { shouldDirty: true })
      } else if (city) {
        // Common ZIP codes for Northern Mindanao region
        const cityZipMap = {
          'cagayan de oro': '9000',
          'cagayan de oro city': '9000',
          'iligan': '9200',
          'iligan city': '9200',
          'valencia': '8709',
          'valencia city': '8709',
          'malaybalay': '8700',
          'malaybalay city': '8700',
          'oroquieta': '7207',
          'oroquieta city': '7207',
          'ozamiz': '7200',
          'ozamiz city': '7200',
          'tangub': '7214',
          'tangub city': '7214',
          'mambajao': '9100',
          'gingoog': '9014',
          'gingoog city': '9014'
        }
        
        const cityLower = city.toLowerCase()
        if (cityZipMap[cityLower]) {
          setValue('zip_code', cityZipMap[cityLower], { shouldDirty: true })
        }
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
      // If on admin-settings tab, save admin settings only and return early
      if (activeTab === 'admin-settings' && adminSettingsRef.current) {
        const saved = await adminSettingsRef.current.saveSettings()
        if (!saved) {
          setIsLoading(false)
          return // Don't proceed if admin settings save failed
        }
        // After saving, the originalSettings in AdminSettings are updated
        // Clear dirty state since settings are now saved
        setAdminSettingsDirty(false)
        setIsLoading(false)
        return // Exit early - admin settings already saved with its own toast
      }

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
      // Birthdate - try different field names that might exist in database
      if (data.birthdate) {
        addFieldIfValid('birthdate', data.birthdate)
      } else if (data.birth_date) {
        addFieldIfValid('birth_date', data.birth_date)
      } else if (data.date_of_birth) {
        addFieldIfValid('date_of_birth', data.date_of_birth)
      }
      addFieldIfValid('age', data.age, (val) => parseInt(val))
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

      // Persist granular address fields (after migration)
      addFieldIfValid('address_house', data.address_house)
      addFieldIfValid('address_street', data.address_street)
      addFieldIfValid('address_barangay', data.address_barangay)
      addFieldIfValid('address_subdivision', data.address_subdivision)
      addFieldIfValid('address_landmark', data.address_landmark)
      
      // Account info
      addFieldIfValid('account_type', data.account_type)
      addFieldIfValid('organization_name', data.organization_name)
      addFieldIfValid('website_link', data.website_link)
      
      // Numeric fields
      addFieldIfValid('household_size', data.household_size, (val) => parseInt(val))
      addFieldIfValid('max_donation_value', data.max_donation_value, (val) => parseFloat(val))
      
      // Array fields
      if (Array.isArray(data.donation_types)) processedData.donation_types = data.donation_types
      if (Array.isArray(data.assistance_needs)) processedData.assistance_needs = data.assistance_needs
      
      // Preference fields
      addFieldIfValid('donation_frequency', data.donation_frequency)
      addFieldIfValid('volunteer_experience', data.volunteer_experience)
      
      // Volunteer-specific fields
      if (profile.role === 'volunteer') {
        if (Array.isArray(data.special_skills)) processedData.special_skills = data.special_skills
        if (Array.isArray(data.languages_spoken)) processedData.languages_spoken = data.languages_spoken
        if (Array.isArray(data.preferred_delivery_types)) processedData.preferred_delivery_types = data.preferred_delivery_types
        if (Array.isArray(data.communication_preferences)) processedData.communication_preferences = data.communication_preferences
        addFieldIfValid('delivery_notes', data.delivery_notes)
        if (typeof data.has_insurance === 'boolean') processedData.has_insurance = data.has_insurance
        addFieldIfValid('insurance_provider', data.insurance_provider)
        addFieldIfValid('insurance_policy_number', data.insurance_policy_number)
      }
      
      // Emergency contact (for recipients only, not volunteers)
      if (profile.role !== 'volunteer') {
      addFieldIfValid('emergency_contact_name', data.emergency_contact_name)
      addFieldIfValid('emergency_contact_phone', data.emergency_contact_phone)
      }
      
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

      // Update profile (we only get here if not on admin-settings tab)
      await updateProfile(processedData)
      success('Profile updated successfully!')
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
    // If on admin-settings tab, reset admin settings
    if (activeTab === 'admin-settings' && adminSettingsRef.current) {
      adminSettingsRef.current.resetSettings()
      setAdminSettingsDirty(false)
      return
    }
    
    // If volunteer role, reset volunteer settings form
    if (profile?.role === 'volunteer' && volunteerSettingsRef.current) {
      volunteerSettingsRef.current.resetForm()
      // Also reset the main form to clear any volunteer fields
      if (profile) {
        const formData = {
          volunteer_experience: profile.volunteer_experience || '',
          special_skills: Array.isArray(profile.special_skills) ? profile.special_skills : [],
          languages_spoken: Array.isArray(profile.languages_spoken) ? profile.languages_spoken : [],
          preferred_delivery_types: Array.isArray(profile.preferred_delivery_types) ? profile.preferred_delivery_types : [],
          communication_preferences: Array.isArray(profile.communication_preferences) ? profile.communication_preferences : [],
          delivery_notes: profile.delivery_notes || '',
          has_insurance: profile.has_insurance || false,
          insurance_provider: profile.insurance_provider || '',
          insurance_policy_number: profile.insurance_policy_number || ''
        }
        Object.entries(formData).forEach(([key, value]) => {
          setValue(key, value, { shouldDirty: false })
        })
      }
      return
    }
    
    // If recipient role, ensure recipient-specific fields are properly reset
    if (profile?.role === 'recipient') {
      // Reset recipient-specific fields explicitly to ensure buttons/checkboxes reset
      const recipientFields = {
        household_size: profile.household_size || '',
        assistance_needs: Array.isArray(profile.assistance_needs) ? profile.assistance_needs : [],
        emergency_contact_name: profile.emergency_contact_name || '',
        emergency_contact_phone: profile.emergency_contact_phone || '',
        donation_types: Array.isArray(profile.donation_types) ? profile.donation_types : []
      }
      Object.entries(recipientFields).forEach(([key, value]) => {
        setValue(key, value, { shouldDirty: false })
      })
    }
    
    // If donor role, ensure donor-specific fields are properly reset
    if (profile?.role === 'donor') {
      // Reset donor-specific fields explicitly to ensure buttons/checkboxes reset
      const donorFields = {
        donation_types: Array.isArray(profile.donation_types) ? profile.donation_types : [],
        donation_frequency: profile.donation_frequency || '',
        max_donation_value: profile.max_donation_value || '',
        emergency_contact_name: profile.emergency_contact_name || '',
        emergency_contact_phone: profile.emergency_contact_phone || ''
      }
      Object.entries(donorFields).forEach(([key, value]) => {
        setValue(key, value, { shouldDirty: false })
      })
    }
    
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
        volunteer_experience: profile.volunteer_experience || '',
        special_skills: Array.isArray(profile.special_skills) ? profile.special_skills : [],
        languages_spoken: Array.isArray(profile.languages_spoken) ? profile.languages_spoken : [],
        preferred_delivery_types: Array.isArray(profile.preferred_delivery_types) ? profile.preferred_delivery_types : [],
        communication_preferences: Array.isArray(profile.communication_preferences) ? profile.communication_preferences : [],
        delivery_notes: profile.delivery_notes || '',
        has_insurance: profile.has_insurance || false,
        insurance_provider: profile.insurance_provider || '',
        insurance_policy_number: profile.insurance_policy_number || '',
        donation_types: Array.isArray(profile.donation_types) ? profile.donation_types : [],
        assistance_needs: Array.isArray(profile.assistance_needs) ? profile.assistance_needs : [],
        account_type: profile.account_type || 'individual',
        donation_frequency: profile.donation_frequency || '',
        max_donation_value: profile.max_donation_value || '',
        primary_id_type: profile.primary_id_type || '',
        primary_id_number: profile.primary_id_number || '',
        primary_id_image_url: profile.primary_id_image_url || '',
        primary_id_expiry: profile.primary_id_expiry || '',
        secondary_id_type: profile.secondary_id_type || '',
        secondary_id_number: profile.secondary_id_number || '',
        secondary_id_image_url: profile.secondary_id_image_url || '',
        secondary_id_expiry: profile.secondary_id_expiry || '',
        organization_representative_name: profile.organization_representative_name || '',
        organization_representative_position: profile.organization_representative_position || '',
        // Granular address fields
        address_house: profile.address_house || '',
        address_street: profile.address_street || '',
        address_barangay: profile.address_barangay || '',
        address_subdivision: profile.address_subdivision || '',
        address_landmark: profile.address_landmark || ''
      }
      reset(formData)
    }
    // Reset image changes - ensure all image previews are reset
    setProfileImage(null)
    if (profile?.profile_image_url) {
      setImagePreview(profile.profile_image_url)
    } else {
      setImagePreview(null)
    }
    
    // Reset ID image changes - ensure all ID image previews are reset
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
    
    // Ensure all Personal Information and ID Verification fields are reset
    // This includes all fields that might have been changed
    const personalAndIdFields = {
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
      account_type: profile.account_type || 'individual',
      // Granular address fields
      address_house: profile.address_house || '',
      address_street: profile.address_street || '',
      address_barangay: profile.address_barangay || '',
      address_subdivision: profile.address_subdivision || '',
      address_landmark: profile.address_landmark || '',
      // ID Verification fields
      primary_id_type: profile.primary_id_type || '',
      primary_id_number: profile.primary_id_number || '',
      primary_id_expiry: profile.primary_id_expiry || '',
      primary_id_image_url: profile.primary_id_image_url || '',
      secondary_id_type: profile.secondary_id_type || '',
      secondary_id_number: profile.secondary_id_number || '',
      secondary_id_expiry: profile.secondary_id_expiry || '',
      secondary_id_image_url: profile.secondary_id_image_url || '',
      organization_representative_name: profile.organization_representative_name || '',
      organization_representative_position: profile.organization_representative_position || ''
    }
    
    // Reset all Personal Information and ID Verification fields
    Object.entries(personalAndIdFields).forEach(([key, value]) => {
      setValue(key, value, { shouldDirty: false })
    })
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
      default: return 'text-yellow-400'
    }
  }

  const getCompletionStatus = () => {
    if (!profile) return { percentage: 0, missingFields: [] }

    // Admin users don't require ID verification and have minimal requirements
    const baseRequiredFields = profile.role === 'admin' 
      ? ['name', 'phone_number'] // Only essential contact info for admins
      : ['name', 'phone_number', 'address', 'city', 'primary_id_type', 'primary_id_number']
    
    const roleSpecificFields = {
      donor: ['donation_types'],
      recipient: ['household_size', 'assistance_needs', 'emergency_contact_name'],
      volunteer: [],
      admin: [] // Admins have minimal required fields
    }

    // Additional recommended fields for better profile completion
    const recommendedFields = {
      donor: ['bio', 'donation_frequency'],
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
    
    // Special validation for volunteers - must have driver's license type and ID image
    // Note: primary_id_number is already checked in baseRequiredFields above
    if (profile.role === 'volunteer') {
      // Check if ID type is specifically driver's license (not just any ID type)
      if (profile.primary_id_type !== 'drivers_license') {
      missingRequired.push('drivers_license_required')
      }
      // Check if ID image is uploaded (not in baseRequiredFields)
      if (!profile.primary_id_image_url) {
        missingRequired.push('primary_id_image_url')
      }
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

  // Calculate missing fields per tab
  const getMissingFieldsByTab = () => {
    if (!profile) return { personal: 0, id: 0, role: 0 }

    const counts = { personal: 0, id: 0, role: 0 }

    // Personal tab required fields
    const personalFields = ['name', 'phone_number', 'address', 'city']
    personalFields.forEach(field => {
      const value = profile[field]
      if (!value || value === 'To be completed') counts.personal++
    })

    // ID Verification tab required fields (not for volunteers or admins)
    if (profile.role !== 'volunteer' && profile.role !== 'admin') {
      const idFields = ['primary_id_type', 'primary_id_number']
      idFields.forEach(field => {
        const value = profile[field]
        if (!value || value === 'To be completed') counts.id++
      })

      // Organization additional IDs
      if (profile.account_type === 'business' || profile.account_type === 'organization') {
        const orgIdFields = ['secondary_id_type', 'secondary_id_number', 'organization_representative_name']
        orgIdFields.forEach(field => {
          const value = profile[field]
          if (!value || value === 'To be completed') counts.id++
        })
      }
    }

    // Role-specific tab required fields
    const roleSpecificFields = {
      donor: ['donation_types'],
      recipient: ['household_size', 'assistance_needs', 'emergency_contact_name'],
      volunteer: [], // No required fields in volunteer settings tab (removed vehicle, availability, background check, emergency contact)
      admin: []
    }

    const roleFields = roleSpecificFields[profile.role] || []
    roleFields.forEach(field => {
      const value = profile[field]
      if (Array.isArray(value)) {
        if (value.length === 0) counts.role++
      } else if (!value || value === 'To be completed' || value === false) {
        counts.role++
      }
    })

    // Special check for volunteers - must have driver's license, ID number, and ID image
    if (profile.role === 'volunteer') {
      if (profile.primary_id_type !== 'drivers_license') {
        counts.role++ // Driver's license type is required
      }
      if (!profile.primary_id_number) {
        counts.role++ // ID number is required
      }
      if (!profile.primary_id_image_url) {
        counts.role++ // ID image is required
      }
    }

    return counts
  }

  const missingFieldsCounts = getMissingFieldsByTab()

  if (!profile) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{backgroundColor: '#00237d'}}>
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  const RoleIcon = getRoleIcon(profile.role)

  // Helper to get role tab config
  const getRoleTabConfig = () => {
    switch (profile.role) {
      case 'donor':
        return { icon: Gift, label: 'Donor Information' }
      case 'recipient':
        return { icon: Heart, label: 'Recipient Information' }
      case 'volunteer':
        return { icon: Truck, label: 'Volunteer Settings' }
      case 'admin':
        return { icon: Users, label: 'Admin Information' }
      default:
        return { icon: Users, label: 'Profile Information' }
    }
  }

  const roleTabConfig = getRoleTabConfig()
  const RoleTabIcon = roleTabConfig.icon

  return (
    <div className="min-h-screen py-4 sm:py-6 lg:py-8" style={{backgroundColor: '#00237d'}}>
      <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-6 xl:px-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-4 sm:mb-6 lg:mb-8"
        >
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4 mb-4">
            <div>
              <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-white mb-1 sm:mb-2">Profile Settings</h1>
              <p className="text-sm sm:text-base text-yellow-300">Manage your account information and preferences</p>
            </div>
          </div>

          {/* Role Badge */}
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            <div className={`flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-1 rounded-full bg-navy-800 border border-navy-700`}>
              <RoleIcon className={`h-3.5 w-3.5 sm:h-4 sm:w-4 ${getRoleColor(profile.role)}`} />
              <span className="text-xs sm:text-sm font-medium text-white capitalize">{profile.role}</span>
            </div>
            {profile.account_type === 'business' && (
              <div className="flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-1 rounded-full bg-navy-800 border border-navy-700">
                <Building2 className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-yellow-400" />
                <span className="text-xs sm:text-sm font-medium text-white">Business Account</span>
              </div>
            )}
            {/* Verification Status Badge */}
              {profile.is_verified ? (
              <div className="flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-1 rounded-full bg-navy-800 border border-navy-700">
                <CheckCircle className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-green-400" />
                  <span className="text-xs sm:text-sm font-medium text-green-300">Verified</span>
                </div>
              ) : (
              <div className="flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-1 rounded-full bg-navy-800 border border-navy-700">
                <AlertCircle className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-orange-400" />
                  <span className="text-xs sm:text-sm font-medium text-orange-300">Unverified</span>
                </div>
              )}
            {/* Derived Badges */}
            {Array.isArray(badges) && badges.length > 0 && (
              <div className="flex flex-wrap items-center gap-2">
                {badges.map((b) => (
                  <div key={b} className="flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-1 rounded-full bg-navy-800 border border-navy-700">
                    <Shield className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-yellow-400" />
                    <span className="text-xs sm:text-sm font-medium text-yellow-200">{b}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Donor stats: rating, totals, and completed events */}
            {profile.role === 'donor' && donorStats && (
              <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                <div className="flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-1 rounded-full bg-navy-800 border border-navy-700">
                  <span className="text-xs sm:text-sm font-medium text-yellow-200">
                    ⭐ {donorStats.averageRating?.toFixed(2) || '0.00'} ({donorStats.totalRatings || 0})
                  </span>
                </div>
                <div className="flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-1 rounded-full bg-navy-800 border border-navy-700">
                  <Gift className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-yellow-400" />
                  <span className="text-xs sm:text-sm font-medium text-yellow-200">
                    {donorStats.totalCompletedDonations || 0} Donations
                  </span>
                </div>
                <div
                  className={`flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-1 rounded-full border ${
                    completedEventsCount > 0
                      ? 'bg-green-500/20 border-green-500/30'
                      : 'bg-navy-800 border-navy-700'
                  }`}
                >
                  <Award
                    className={`h-3.5 w-3.5 sm:h-4 sm:w-4 ${
                      completedEventsCount > 0 ? 'text-green-400' : 'text-yellow-200'
                    }`}
                  />
                  <span
                    className={`text-xs sm:text-sm font-medium ${
                      completedEventsCount > 0 ? 'text-green-300' : 'text-yellow-200'
                    }`}
                  >
                    {completedEventsCount} Events Participated
                  </span>
                </div>
              </div>
            )}

            {/* Volunteer stats: delivered items and completed events */}
            {profile.role === 'volunteer' && volunteerStats && (
              <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                <div className="flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-1 rounded-full bg-navy-800 border border-navy-700">
                  <Truck className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-yellow-400" />
                  <span className="text-xs sm:text-sm font-medium text-yellow-200">
                    {volunteerStats.completedDeliveries || 0} Deliveries
                  </span>
                </div>
                <div
                  className={`flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-1 rounded-full border ${
                    completedEventsCount > 0
                      ? 'bg-green-500/20 border-green-500/30'
                      : 'bg-navy-800 border-navy-700'
                  }`}
                >
                  <Award
                    className={`h-3.5 w-3.5 sm:h-4 sm:w-4 ${
                      completedEventsCount > 0 ? 'text-green-400' : 'text-yellow-200'
                    }`}
                  />
                  <span
                    className={`text-xs sm:text-sm font-medium ${
                      completedEventsCount > 0 ? 'text-green-300' : 'text-yellow-200'
                    }`}
                  >
                    {completedEventsCount} Events Participated
                  </span>
                </div>
              </div>
            )}
          </div>
        </motion.div>

        {/* Profile Completion Progress Bar - Only shown for non-admin users */}
        {profile.role !== 'admin' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            className="card p-2.5 sm:p-3 mb-3 sm:mb-4"
          >
            <div className="flex items-center justify-between gap-3">
              <div className="flex-1">
                <div className="text-xs sm:text-sm text-yellow-300 mb-1 font-medium">Profile Completion</div>
                <div className="flex items-center gap-2">
                  <div className="flex-1 bg-navy-700 rounded-full h-2">
                    <div
                      className="bg-gradient-to-r from-yellow-400 to-orange-400 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${completionPercentage}%` }}
                    />
                  </div>
                  <span className="text-xs sm:text-sm font-semibold text-white min-w-[2.5rem] text-right">{completionPercentage}%</span>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* Profile Picture Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="card p-4 sm:p-5 lg:p-6 mb-4 sm:mb-6 lg:mb-8"
        >
          <h2 className="text-lg sm:text-xl font-semibold text-white mb-4 sm:mb-6 flex items-center justify-center sm:justify-start">
            <Camera className="h-4 w-4 sm:h-5 sm:w-5 text-yellow-400 mr-2" />
            Profile Picture
          </h2>

          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 sm:gap-6">
            {/* Current Profile Picture */}
            <div className="relative">
              <div 
                className="w-32 h-32 sm:w-40 sm:h-40 lg:w-48 lg:h-48 xl:w-56 xl:h-56 rounded-full overflow-hidden bg-navy-800 border-2 sm:border-4 border-navy-700 flex items-center justify-center cursor-pointer hover:border-yellow-400 transition-colors"
                onClick={() => setShowProfileImageModal(true)}
                title="View profile picture"
              >
                {imagePreview ? (
                  <img
                    src={imagePreview}
                    alt="Profile"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <User className="h-16 w-16 sm:h-20 sm:w-20 lg:h-24 lg:w-24 xl:h-28 xl:w-28 text-yellow-400" />
                )}
              </div>
              
              {/* View/Edit Overlay - Shows on hover */}
              <div
                className="absolute inset-0 w-32 h-32 sm:w-40 sm:h-40 lg:w-48 lg:h-48 xl:w-56 xl:h-56 rounded-full bg-black bg-opacity-50 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity pointer-events-none"
              >
                <div className="text-white text-xs sm:text-sm font-medium text-center px-2">View Profile</div>
              </div>
            </div>

            {/* Upload Controls */}
            <div className="flex-1 w-full text-center sm:text-left">
              <div className="mb-3 sm:mb-4">
                <p className="text-white font-medium mb-1 sm:mb-2 text-sm sm:text-base">Upload a profile picture</p>
                <p className="text-yellow-300 text-xs sm:text-sm mb-3 sm:mb-4">
                  Choose a clear photo that represents you. Accepted formats: JPG, PNG, GIF. Max size: 5MB.
                </p>
              </div>

              <div className="flex flex-col sm:flex-row sm:flex-wrap items-stretch sm:items-center gap-2 sm:gap-3">
                <button
                  type="button"
                  onClick={handleImageUpload}
                  disabled={uploadingImage}
                  className="btn btn-secondary flex items-center justify-center w-full sm:w-auto text-sm px-3 py-2 active:scale-95"
                >
                  <Upload className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1.5 sm:mr-2" />
                  {uploadingImage ? 'Processing...' : 'Choose Image'}
                </button>

                {imagePreview && (
                  <button
                    type="button"
                    onClick={handleRemoveImage}
                    disabled={uploadingImage}
                    className="btn btn-outline-danger flex items-center justify-center w-full sm:w-auto text-sm px-3 py-2 active:scale-95"
                  >
                    {uploadingImage ? (
                      <>
                        <LoadingSpinner size="sm" />
                        <span className="ml-2">Removing...</span>
                      </>
                    ) : (
                      <>
                        <Trash2 className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1.5 sm:mr-2" />
                        Remove Photo
                      </>
                    )}
                  </button>
                )}

                {profileImage && (
                  <>
                    <button
                      type="button"
                      onClick={saveProfileImage}
                      disabled={savingImage}
                      className="btn btn-primary flex items-center justify-center w-full sm:w-auto text-sm px-3 py-2 active:scale-95"
                    >
                      {savingImage ? (
                        <>
                          <LoadingSpinner size="sm" />
                          <span className="ml-2">Saving...</span>
                        </>
                      ) : (
                        <>
                          <Save className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1.5 sm:mr-2" />
                          Save Picture
                        </>
                      )}
                    </button>
                    {selectedAvatar && (
                      <button
                        type="button"
                        onClick={handleCancelAvatarSelection}
                        className="btn btn-outline-danger flex items-center justify-center w-full sm:w-auto text-sm px-3 py-2 active:scale-95 hover:bg-red-500/10 hover:border-red-500 transition-colors"
                        title="Cancel avatar selection"
                      >
                        <X className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1.5 sm:mr-2" />
                        Cancel
                      </button>
                    )}
                  </>
                )}
              </div>

              {/* Avatar Selection - Compact */}
              <div className="mt-3">
                <p className="text-gray-400 text-xs mb-2 text-center sm:text-left">Or choose an avatar:</p>
                <div className="flex flex-wrap gap-2 justify-center sm:justify-start">
                  {[1, 2, 3, 4, 5, 6].map((avatarNum) => (
                    <button
                      key={avatarNum}
                      type="button"
                      onClick={() => handleAvatarSelect(avatarNum)}
                      className={`relative w-10 h-10 sm:w-12 sm:h-12 rounded-full overflow-hidden border-2 transition-all duration-200 cursor-pointer hover:scale-110 ${
                        selectedAvatar === avatarNum
                          ? 'border-yellow-400 ring-1 ring-yellow-400/50'
                          : 'border-navy-700 hover:border-yellow-400/50'
                      }`}
                      title={`Select Avatar ${avatarNum}`}
                    >
                      <img
                        src={`/avatar${avatarNum}.png`}
                        alt={`Avatar ${avatarNum}`}
                        className="w-full h-full object-cover"
                      />
                      {selectedAvatar === avatarNum && (
                        <div className="absolute inset-0 bg-yellow-400/30 flex items-center justify-center">
                          <CheckCircle className="w-3 h-3 sm:w-4 sm:h-4 text-yellow-400" />
                        </div>
                      )}
                    </button>
                  ))}
                </div>
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
          <div className="space-y-4 sm:space-y-6 lg:space-y-8">
            {/* Tab Navigation */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="card p-0 overflow-hidden"
            >
              <div className="flex border-b border-navy-700">
                <button
                  type="button"
                  onClick={() => setActiveTab('personal')}
                  className={`flex-1 px-4 sm:px-6 py-3 sm:py-4 text-sm sm:text-base font-medium transition-colors relative ${
                    activeTab === 'personal'
                      ? 'text-yellow-400 border-b-2 border-yellow-400 bg-navy-800/50'
                      : 'text-yellow-200 hover:text-yellow-300 hover:bg-navy-800/30'
                  }`}
                >
                  <span className="flex items-center justify-center gap-2">
                    <User className="inline h-4 w-4" />
                    <span>Personal Information</span>
                    {missingFieldsCounts.personal > 0 && (
                      <span className="inline-flex items-center justify-center px-2 py-0.5 text-xs font-bold bg-red-500 text-white rounded-full">
                        {missingFieldsCounts.personal}
                      </span>
                    )}
                  </span>
                </button>
                {profile.role !== 'volunteer' && (
                  <button
                    type="button"
                    onClick={() => setActiveTab('id')}
                    className={`flex-1 px-4 sm:px-6 py-3 sm:py-4 text-sm sm:text-base font-medium transition-colors relative ${
                      activeTab === 'id'
                        ? 'text-yellow-400 border-b-2 border-yellow-400 bg-navy-800/50'
                        : 'text-yellow-200 hover:text-yellow-300 hover:bg-navy-800/30'
                    }`}
                  >
                    <span className="flex items-center justify-center gap-2">
                      <Shield className="inline h-4 w-4" />
                      <span>ID Verification</span>
                      {missingFieldsCounts.id > 0 && (
                        <span className="inline-flex items-center justify-center px-2 py-0.5 text-xs font-bold bg-red-500 text-white rounded-full">
                          {missingFieldsCounts.id}
                        </span>
                      )}
                    </span>
                  </button>
                )}
                {profile.role !== 'admin' && (
                <button
                  type="button"
                  onClick={() => setActiveTab('role')}
                  className={`flex-1 px-4 sm:px-6 py-3 sm:py-4 text-sm sm:text-base font-medium transition-colors relative ${
                    activeTab === 'role'
                      ? 'text-yellow-400 border-b-2 border-yellow-400 bg-navy-800/50'
                      : 'text-yellow-200 hover:text-yellow-300 hover:bg-navy-800/30'
                  }`}
                >
                  <span className="flex items-center justify-center gap-2">
                    <RoleTabIcon className="inline h-4 w-4" />
                    <span>{roleTabConfig.label}</span>
                    {missingFieldsCounts.role > 0 && (
                      <span className="inline-flex items-center justify-center px-2 py-0.5 text-xs font-bold bg-red-500 text-white rounded-full">
                        {missingFieldsCounts.role}
                      </span>
                    )}
                  </span>
                </button>
                )}
                {profile.role === 'admin' && (
                  <button
                    type="button"
                    onClick={() => setActiveTab('admin-settings')}
                    className={`flex-1 px-4 sm:px-6 py-3 sm:py-4 text-sm sm:text-base font-medium transition-colors relative ${
                      activeTab === 'admin-settings'
                        ? 'text-yellow-400 border-b-2 border-yellow-400 bg-navy-800/50'
                        : 'text-yellow-200 hover:text-yellow-300 hover:bg-navy-800/30'
                    }`}
                  >
                    <span className="flex items-center justify-center gap-2">
                      <Settings className="inline h-4 w-4" />
                      <span>Admin Settings</span>
                    </span>
                  </button>
                )}
              </div>
            </motion.div>

            {/* Tab Content */}
            <AnimatePresence mode="wait">
              {/* Personal Information Tab */}
              {activeTab === 'personal' && (
                <motion.div
                  key="personal"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  transition={{ duration: 0.2 }}
                  className="space-y-6"
                >
                  {/* Basic Information */}
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="card p-4 sm:p-5 lg:p-6"
                  >
                <div className="border-b border-navy-700 pb-4 mb-6">
                  <h2 className="text-xl font-semibold text-white flex items-center">
                    <User className="h-5 w-5 text-yellow-400 mr-2" />
                    Basic Information
                  </h2>
                  <p className="text-sm text-yellow-300 mt-1">Your personal details and contact information</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-yellow-200 mb-2">
                      Full Name <span className="text-red-400">*</span>
                    </label>
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
                      className="input focus:ring-2 focus:ring-yellow-400 focus:border-yellow-400"
                      placeholder="Enter your full name"
                    />
                    {errors.name && (
                      <p className="mt-2 text-sm text-red-400 flex items-center">
                        <AlertCircle className="h-4 w-4 mr-1" />
                        {errors.name.message}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-yellow-200 mb-2">
                      Email Address
                    </label>
                    <div className="input bg-navy-800/50 border-navy-700 cursor-not-allowed opacity-75 flex items-center">
                      <Mail className="h-4 w-4 text-yellow-400 mr-2" />
                      <span className="text-white">{profile.email}</span>
                    </div>
                    <p className="mt-2 text-xs text-gray-400 flex items-center">
                      <AlertCircle className="h-3 w-3 mr-1" />
                      Email address cannot be changed
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-yellow-200 mb-2">
                      Phone Number <span className="text-red-400">*</span>
                    </label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-yellow-400" />
                      <input
                        {...register('phone_number', {
                          validate: {
                            validFormat: (value) => {
                              if (value && value.trim().length > 0) {
                                const phoneRegex = /^(09|\+639)\d{9}$/
                                if (!phoneRegex.test(value)) {
                                  return 'Please enter a valid Philippines phone number'
                                }
                                if (value === '09000000000') {
                                  return 'Please enter your actual phone number'
                                }
                              }
                              return true
                            }
                          }
                        })}
                        className="input pl-10 focus:ring-2 focus:ring-yellow-400 focus:border-yellow-400"
                        placeholder="09123456789"
                        maxLength="11"
                      />
                    </div>
                    {errors.phone_number ? (
                      <p className="mt-2 text-sm text-red-400 flex items-center">
                        <AlertCircle className="h-4 w-4 mr-1" />
                        {errors.phone_number.message}
                      </p>
                    ) : (
                      <p className="mt-2 text-xs text-gray-400">Format: 09123456789 or +639123456789</p>
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
                        <div className="input bg-navy-800 flex items-center">
                          <Building2 className="h-4 w-4 text-yellow-400 mr-2" />
                          <span className="text-yellow-200">
                            {profile.account_type === 'business' ? 'Business/Organization' : 'Individual'}
                          </span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Birthdate Field - Always display */}
                  <div>
                    <label className="block text-sm font-medium text-yellow-200 mb-2">
                      Birthdate
                    </label>
                    <div className="relative">
                      <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-yellow-400" />
                      <input
                        type="date"
                        {...register('birthdate')}
                        defaultValue={profile.birthdate || profile.birth_date || profile.date_of_birth || ''}
                        className="input pl-10 focus:ring-2 focus:ring-yellow-400 focus:border-yellow-400"
                      />
                    </div>
                  </div>

                  {/* Age Field - Always display, calculate from birthdate if available */}
                  <div>
                    <label className="block text-sm font-medium text-yellow-200 mb-2">
                      Age
                    </label>
                    <div className="input bg-navy-800/50 border-navy-700 flex items-center">
                      <Calendar className="h-4 w-4 text-yellow-400 mr-2" />
                      <span className="text-white">
                        {(() => {
                          if (profile.age) return profile.age
                          const birthDate = profile.birthdate || profile.birth_date || profile.date_of_birth
                          if (birthDate) {
                            const calculatedAge = calculateAge(birthDate)
                            return calculatedAge !== null ? calculatedAge : 'Not provided'
                          }
                          return 'Not provided'
                        })()}
                      </span>
                    </div>
                  </div>
                </div>
              </motion.div>

              {/* Address Information */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="card p-6"
              >
                <div className="border-b border-navy-700 pb-4 mb-6">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <div>
                      <h2 className="text-xl font-semibold text-white flex items-center">
                        <MapPin className="h-5 w-5 text-yellow-400 mr-2" />
                        Address Information
                      </h2>
                      <p className="text-sm text-yellow-300 mt-1">Your residential or business location</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowLocationPicker(true)}
                      className="btn btn-primary flex items-center justify-center gap-2 px-4 py-2.5 text-sm active:scale-95 w-full sm:w-auto bg-yellow-400 hover:bg-yellow-500 text-navy-900 border-yellow-400"
                    >
                      <Navigation className="h-4 w-4" />
                      Select on Map
                    </button>
                  </div>
                </div>

                {/* Matching Algorithm Info Banner */}
                {(profile.role === 'donor' || profile.role === 'recipient' || profile.role === 'volunteer') && (
                  <div className="mb-6 p-4 bg-yellow-500/10 border-l-4 border-yellow-400 rounded-lg">
                    <div className="flex items-start gap-3">
                      <div className="flex-shrink-0">
                        <Globe className="h-5 w-5 text-yellow-400 mt-0.5" />
                      </div>
                      <div className="flex-1">
                        <h3 className="text-sm font-medium text-white mb-1">
                          Smart Location Matching
                        </h3>
                        <p className="text-xs text-gray-300 leading-relaxed">
                          Your location helps our intelligent matching algorithm connect you with nearby{' '}
                          {profile.role === 'donor' && 'recipients and volunteers'}
                          {profile.role === 'recipient' && 'donors and volunteers'}
                          {profile.role === 'volunteer' && 'donors and recipients'}
                          . This ensures faster deliveries and more efficient assistance. 
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Reorganized by importance: Province → City → Barangay → Street → House → Subdivision → ZIP → Landmark */}
                  
                  {/* 1. Province - Most general, regional level */}
                  <div>
                    <label className="block text-sm font-medium text-white mb-2">
                      Province <span className="text-red-400">*</span>
                    </label>
                    {isEditing ? (
                      <select
                        {...register('province', {
                          required: 'Province is required'
                        })}
                        className="input"
                      >
                        <option value="">Select Province</option>
                        <option value="Misamis Oriental">Misamis Oriental</option>
                        <option value="Misamis Occidental">Misamis Occidental</option>
                        <option value="Bukidnon">Bukidnon</option>
                        <option value="Camiguin">Camiguin</option>
                        <option value="Lanao del Norte">Lanao del Norte</option>
                      </select>
                    ) : (
                      <div className="input bg-navy-800">
                        <span className={profile.province ? 'text-yellow-200' : 'text-gray-400 italic'}>
                          {profile.province || 'Not provided'}
                        </span>
                      </div>
                    )}
                    {errors.province && (
                      <p className="mt-1 text-sm text-danger-600">{errors.province.message}</p>
                    )}
                  </div>

                  {/* 2. City / Municipality - City level */}
                  <div>
                    <label className="block text-sm font-medium text-white mb-2">
                      City / Municipality <span className="text-red-400">*</span>
                    </label>
                    {isEditing ? (
                      <input
                        {...register('city', {
                          required: 'City is required',
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
                        placeholder="e.g., Cagayan de Oro"
                      />
                    ) : (
                      <div className="input bg-navy-800">
                        <span className={profile.city ? 'text-yellow-200' : 'text-gray-400 italic'}>
                          {profile.city || 'Not provided'}
                        </span>
                      </div>
                    )}
                    {errors.city && (
                      <p className="mt-1 text-sm text-danger-600">{errors.city.message}</p>
                    )}
                  </div>

                  {/* 3. Barangay - Local area */}
                  <div>
                    <label className="block text-sm font-medium text-white mb-2">
                      Barangay <span className="text-red-400">*</span>
                    </label>
                    {isEditing ? (
                      <input
                        {...register('address_barangay', {
                          required: 'Barangay is required'
                        })}
                        className="input"
                        placeholder="e.g., Brgy. 28 or Gusa"
                      />
                    ) : (
                      <div className="input bg-navy-800">
                        <span className={profile.address_barangay ? 'text-yellow-200' : 'text-gray-400 italic'}>
                          {profile.address_barangay || 'Not provided'}
                        </span>
                      </div>
                    )}
                    {errors.address_barangay && (
                      <p className="mt-1 text-sm text-danger-600">{errors.address_barangay.message}</p>
                    )}
                  </div>

                  {/* 4. Street Name - Street level */}
                  <div>
                    <label className="block text-sm font-medium text-white mb-2">
                      Street Name
                    </label>
                    {isEditing ? (
                      <input
                        {...register('address_street')}
                        className="input"
                        placeholder="e.g., J. Ramirez St."
                      />
                    ) : (
                      <div className="input bg-navy-800">
                        <span className={profile.address_street ? 'text-yellow-200' : 'text-gray-400 italic'}>
                          {profile.address_street || 'Not provided'}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* 5. House / Unit Number - Most specific location */}
                  <div>
                    <label className="block text-sm font-medium text-white mb-2">
                      House/Unit Number
                    </label>
                    {isEditing ? (
                      <input
                        {...register('address_house')}
                        className="input"
                        placeholder="e.g., Unit 3B or #12"
                      />
                    ) : (
                      <div className="input bg-navy-800">
                        <span className={profile.address_house ? 'text-yellow-200' : 'text-gray-400 italic'}>
                          {profile.address_house || 'Not provided'}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* 6. Subdivision / Building - Optional but helpful */}
                  <div>
                    <label className="block text-sm font-medium text-white mb-2">
                      Subdivision / Building
                    </label>
                    {isEditing ? (
                      <input
                        {...register('address_subdivision')}
                        className="input"
                        placeholder="e.g., Villa Ernesto Phase 2 or Limketkai Center"
                      />
                    ) : (
                      <div className="input bg-navy-800">
                        <span className={profile.address_subdivision ? 'text-yellow-200' : 'text-gray-400 italic'}>
                          {profile.address_subdivision || 'Not provided'}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* 7. ZIP Code - Postal code */}
                  <div>
                    <label className="block text-sm font-medium text-white mb-2">
                      ZIP Code
                    </label>
                    {isEditing ? (
                      <input
                        {...register('zip_code')}
                        className="input"
                        placeholder="e.g., 9000"
                      />
                    ) : (
                      <div className="input bg-navy-800">
                        <span className={profile.zip_code ? 'text-yellow-200' : 'text-gray-400 italic'}>
                          {profile.zip_code || 'Not provided'}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* 8. Landmark - Optional reference point */}
                  <div>
                    <label className="block text-sm font-medium text-white mb-2">
                      Landmark (optional)
                    </label>
                    {isEditing ? (
                      <input
                        {...register('address_landmark')}
                        className="input"
                        placeholder="Near church, beside pharmacy, etc."
                      />
                    ) : (
                      <div className="input bg-navy-800">
                        <span className={profile.address_landmark ? 'text-yellow-200' : 'text-gray-400 italic'}>
                          {profile.address_landmark || 'Not provided'}
                        </span>
                      </div>
                    )}
                  </div>

                </div>
              </motion.div>
                </motion.div>
              )}

              {/* ID Verification Tab */}
              {activeTab === 'id' && profile.role !== 'volunteer' && (
                <motion.div
                  key="id"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  transition={{ duration: 0.2 }}
                  className="space-y-4 sm:space-y-6 lg:space-y-8"
                >
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="card p-4 sm:p-5 lg:p-6"
                  >
                <div className="border-b border-navy-700 pb-4 mb-6">
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                    <div className="flex-1">
                      <h2 className="text-xl font-semibold text-white flex items-center mb-1">
                        <Shield className="h-5 w-5 text-amber-400 mr-2" />
                      Valid ID Requirements
                    </h2>
                      <p className="text-sm text-yellow-300">
                        {profile.role === 'donor' && 'Provide valid identification documents for account verification'}
                        {profile.role === 'recipient' && 'Provide valid identification documents for account verification'}
                        {profile.role === 'admin' && 'ID verification is optional for administrators'}
                      </p>
                    </div>
                    {/* ID Verification Status Indicator */}
                    <div className="flex-shrink-0">
                        {(() => {
                        const hasIdUploaded = profile.primary_id_type && profile.primary_id_number
                          
                          return (
                            <IDVerificationBadge
                              idStatus={profile.id_verification_status}
                              hasIdUploaded={hasIdUploaded}
                            size="md"
                              showText={true}
                              showDescription={false}
                            />
                          )
                        })()}
                    </div>
                  </div>
                </div>

                {/* Get valid ID options based on role and account type */}
                {(() => {
                  const getValidIdOptions = () => {
                    if (profile.role === 'donor') {
                      if ((watchedAccountType || profile.account_type) === 'business' || 
                          (watchedAccountType || profile.account_type) === 'organization') {
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
                      if ((watchedAccountType || profile.account_type) === 'organization') {
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
                      {/* Primary ID */}
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
                              <div className="input bg-navy-800">
                                <span className={profile.primary_id_type ? 'text-yellow-200' : 'text-gray-400 italic'}>
                                  {profile.primary_id_type ? 
                                    idOptions.primary.find(opt => opt.value === profile.primary_id_type)?.label || profile.primary_id_type
                                    : 'Not provided'
                                  }
                                </span>
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
                              <div className="input bg-navy-800">
                                <span className={profile.primary_id_number ? 'text-yellow-200' : 'text-gray-400 italic'}>
                                  {profile.primary_id_number || 'Not provided'}
                                </span>
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
                              className="input w-full"
                            />
                          ) : (
                            <div className="input bg-navy-800">
                              <span className={profile.primary_id_expiry ? 'text-yellow-200' : 'text-gray-400 italic'}>
                                {profile.primary_id_expiry ? 
                                  new Date(profile.primary_id_expiry).toLocaleDateString() : 
                                  'Not provided'
                                }
                              </span>
                            </div>
                          )}
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
                                  <div className="input bg-navy-800">
                                    <span className={profile.organization_representative_name ? 'text-yellow-200' : 'text-gray-400 italic'}>
                                      {profile.organization_representative_name || 'Not provided'}
                                    </span>
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
                                  <div className="input bg-navy-800">
                                    <span className={profile.organization_representative_position ? 'text-yellow-200' : 'text-gray-400 italic'}>
                                      {profile.organization_representative_position || 'Not provided'}
                                    </span>
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
                                <div className="input bg-navy-800">
                                  <span className={profile.secondary_id_type ? 'text-yellow-200' : 'text-gray-400 italic'}>
                                    {profile.secondary_id_type ? 
                                      idOptions.secondary?.find(opt => opt.value === profile.secondary_id_type)?.label || profile.secondary_id_type
                                      : 'Not provided'
                                    }
                                  </span>
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
                                <div className="input bg-navy-800">
                                  <span className={profile.secondary_id_number ? 'text-yellow-200' : 'text-gray-400 italic'}>
                                    {profile.secondary_id_number || 'Not provided'}
                                  </span>
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
                                  <p className="text-sm text-yellow-300 mb-4">
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
                              <p className="text-xs text-yellow-400">
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
                                <div className="input bg-navy-800 text-yellow-400 text-center py-8">
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
                                    <p className="text-sm text-yellow-300 mb-4">
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
                                <p className="text-xs text-yellow-400">
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
                                  <div className="input bg-navy-800 text-yellow-400 text-center py-8">
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
                </motion.div>
              )}

              {/* Role-specific Tab */}
              {activeTab === 'role' && (
                <motion.div
                  key="role"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  transition={{ duration: 0.2 }}
                  className="space-y-4 sm:space-y-6 lg:space-y-8"
                >
                  {profile.role === 'donor' && (
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.1 }}
                      className="card p-6 rounded-xl shadow-lg"
                    >
                    <div className="border-b border-navy-700 pb-4 mb-6">
                      <h2 className="text-xl font-semibold text-white flex items-center">
                        <Gift className="h-5 w-5 text-blue-400 mr-2" />
                        Donor Information
                      </h2>
                      <p className="text-sm text-yellow-300 mt-1">Provide details about your donations and preferences</p>
                    </div>

                    <div className="space-y-8">
                      {/* Business/Organization fields */}
                      {(watchedAccountType || profile.account_type) === 'business' && (
                        <div className="bg-blue-500/5 border border-blue-500/20 rounded-lg p-5">
                          <h3 className="text-md font-semibold text-white mb-4 flex items-center">
                            <Building2 className="h-4 w-4 text-blue-400 mr-2" />
                            Organization Details
                          </h3>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                              <label className="block text-sm font-medium text-yellow-200 mb-2">
                                Organization Name <span className="text-red-400">*</span>
                              </label>
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
                                className="input focus:ring-2 focus:ring-blue-400 focus:border-blue-400"
                                placeholder="Enter organization name"
                              />
                              {errors.organization_name && (
                                <p className="mt-2 text-sm text-red-400 flex items-center">
                                  <AlertCircle className="h-4 w-4 mr-1" />
                                  {errors.organization_name.message}
                                </p>
                              )}
                            </div>

                            <div>
                              <label className="block text-sm font-medium text-yellow-200 mb-2">
                                Website URL
                              </label>
                              <div className="relative">
                                <Globe className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-blue-400" />
                                <input
                                  {...register('website_link', {
                                    pattern: {
                                      value: /^https?:\/\/.+/,
                                      message: 'Enter a valid URL (https://...)'
                                    }
                                  })}
                                  className="input pl-10 focus:ring-2 focus:ring-blue-400 focus:border-blue-400"
                                  placeholder="https://your-website.com"
                                  type="url"
                                />
                              </div>
                              {errors.website_link ? (
                                <p className="mt-2 text-sm text-red-400 flex items-center">
                                  <AlertCircle className="h-4 w-4 mr-1" />
                                  {errors.website_link.message}
                                </p>
                              ) : (
                                <p className="mt-2 text-xs text-gray-400">Optional - Your organization's website</p>
                              )}
                            </div>
                          </div>
                        </div>
                      )}

                      <div>
                        <label className="block text-sm font-medium text-yellow-200 mb-2">
                          Bio/Description
                          <span className="text-xs text-gray-400 ml-2">(Optional)</span>
                        </label>
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
                          className="input h-32 resize-none focus:ring-2 focus:ring-yellow-400 focus:border-yellow-400"
                          placeholder="Share your story, motivation, and what drives you to help others..."
                        />
                        <div className="flex justify-between mt-2">
                          {errors.bio ? (
                            <p className="text-sm text-red-400 flex items-center">
                              <AlertCircle className="h-4 w-4 mr-1" />
                              {errors.bio.message}
                            </p>
                          ) : (
                            <span className="text-xs text-gray-400">
                              {watch('bio')?.length || 0}/1000 characters
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Emergency Contact Name */}
                      <div>
                        <label className="block text-sm font-medium text-yellow-200 mb-2">
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
                            className="input focus:ring-2 focus:ring-yellow-400 focus:border-yellow-400"
                            placeholder="Enter emergency contact name"
                          />
                        ) : (
                          <div className="input bg-navy-800">
                            <span className={profile.emergency_contact_name ? 'text-yellow-200' : 'text-gray-400 italic'}>
                              {profile.emergency_contact_name || 'Not provided'}
                            </span>
                          </div>
                        )}
                        {errors.emergency_contact_name && (
                          <p className="mt-2 text-sm text-red-400 flex items-center">
                            <AlertCircle className="h-4 w-4 mr-1" />
                            {errors.emergency_contact_name.message}
                          </p>
                        )}
                      </div>

                      {/* Emergency Contact Phone */}
                      <div>
                        <label className="block text-sm font-medium text-yellow-200 mb-2">
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
                            className="input focus:ring-2 focus:ring-yellow-400 focus:border-yellow-400"
                            placeholder="09123456789 or +639123456789"
                            maxLength="13"
                          />
                        ) : (
                          <div className="input bg-navy-800">
                            <span className={profile.emergency_contact_phone ? 'text-yellow-200' : 'text-gray-400 italic'}>
                              {profile.emergency_contact_phone || 'Not provided'}
                            </span>
                          </div>
                        )}
                        {errors.emergency_contact_phone && (
                          <p className="mt-2 text-sm text-red-400 flex items-center">
                            <AlertCircle className="h-4 w-4 mr-1" />
                            {errors.emergency_contact_phone.message}
                          </p>
                        )}
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-yellow-200 mb-3">
                          Donation Types You Can Provide <span className="text-red-400">*</span>
                        </label>
                        <p className="text-sm text-gray-400 mb-4">Select all types of items or assistance you can offer</p>
                        <Controller
                          name="donation_types"
                          control={control}
                          rules={{ 
                            validate: {
                              optional: () => true
                            }
                          }}
                          render={({ field: { value = [], onChange } }) => (
                            <>
                              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                                {[
                                  { icon: '🍔', label: 'Food & Beverages' },
                                  { icon: '👕', label: 'Clothing & Accessories' },
                                  { icon: '💊', label: 'Medical Supplies' },
                                  { icon: '📚', label: 'Educational Materials' },
                                  { icon: '🏠', label: 'Household Items' },
                                  { icon: '💻', label: 'Electronics & Technology' },
                                  { icon: '🧸', label: 'Toys & Recreation' },
                                  { icon: '🧴', label: 'Personal Care Items' },
                                  { icon: '🚨', label: 'Emergency Supplies' },
                                  { icon: '💰', label: 'Financial Assistance' },
                                  { icon: '🚗', label: 'Transportation' },
                                  { icon: '📦', label: 'Other' }
                                ].map(({ icon, label }) => (
                                  <button
                                    key={label}
                                    type="button"
                                    onClick={() => {
                                      if (value.includes(label)) {
                                        onChange(value.filter(item => item !== label))
                                      } else {
                                        onChange([...value, label])
                                      }
                                    }}
                                    className={`h-16 w-full rounded-lg border-2 transition-all flex items-center gap-2 px-3 ${
                                      value.includes(label)
                                        ? 'border-blue-400 bg-blue-500/20 text-white'
                                        : 'border-navy-700 bg-navy-800/50 text-gray-300 hover:border-blue-400/50 hover:bg-navy-700/50'
                                    }`}
                                  >
                                    <span className="text-2xl flex-shrink-0">{icon}</span>
                                    <span className="text-xs font-medium text-left truncate">{label}</span>
                                  </button>
                                ))}
                              </div>
                              {value && value.length > 0 && (
                                <p className="mt-3 text-sm text-green-400">
                                  ✓ {value.length} donation type(s) selected
                                </p>
                              )}
                            </>
                          )}
                        />
                        {errors.donation_types && (
                          <p className="mt-2 text-sm text-red-400 flex items-center">
                            <AlertCircle className="h-4 w-4 mr-1" />
                            {errors.donation_types.message}
                          </p>
                        )}
                      </div>

                    </div>
                  </motion.div>
                )}

                {profile.role === 'recipient' && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="card p-6 rounded-xl shadow-lg"
                  >
                    <div className="border-b border-navy-700 pb-4 mb-6">
                      <h2 className="text-xl font-semibold text-white flex items-center">
                      <Heart className="h-5 w-5 text-green-400 mr-2" />
                      Recipient Information
                    </h2>
                      <p className="text-sm text-yellow-300 mt-1">Provide details about your needs and assistance requirements</p>
                    </div>

                    <div className="space-y-8">
                      {/* Account Type */}
                      <div>
                        <label className="block text-sm font-medium text-yellow-200 mb-2">
                          Account Type
                        </label>
                        {isEditing ? (
                          <select
                            {...register('account_type')}
                            className="input focus:ring-2 focus:ring-green-400 focus:border-green-400"
                          >
                            <option value="individual">Individual</option>
                            <option value="organization">Organization/Institution</option>
                          </select>
                        ) : (
                          <div className="input bg-navy-800 flex items-center">
                            <Building2 className="h-4 w-4 text-green-400 mr-2" />
                            <span className="text-yellow-200">
                              {profile.account_type === 'organization' ? 'Organization/Institution' : 'Individual'}
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Organization Details for organizational recipients */}
                      {(watchedAccountType || profile.account_type) === 'organization' && (
                        <div className="bg-green-500/5 border border-green-500/20 rounded-lg p-5">
                          <h3 className="text-md font-semibold text-white mb-4 flex items-center">
                            <Building2 className="h-4 w-4 text-green-400 mr-2" />
                            Organization Details
                          </h3>
                        <div>
                            <label className="block text-sm font-medium text-yellow-200 mb-2">
                              Organization/Institution Name <span className="text-red-400">*</span>
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
                                className="input focus:ring-2 focus:ring-green-400 focus:border-green-400"
                              placeholder="Enter organization/institution name"
                            />
                          ) : (
                            <div className="input bg-navy-800">
                              <span className={profile.organization_name ? 'text-yellow-200' : 'text-gray-400 italic'}>
                                {profile.organization_name || 'Not provided'}
                              </span>
                            </div>
                          )}
                          {errors.organization_name && (
                              <p className="mt-2 text-sm text-red-400 flex items-center">
                                <AlertCircle className="h-4 w-4 mr-1" />
                                {errors.organization_name.message}
                              </p>
                          )}
                          </div>
                        </div>
                      )}

                      {/* Household Information */}
                      <div>
                        <label className="block text-sm font-medium text-yellow-200 mb-2">
                          Household Size <span className="text-red-400">*</span>
                        </label>
                        <p className="text-sm text-gray-400 mb-4">Number of people in your household</p>
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
                            className="input focus:ring-2 focus:ring-green-400 focus:border-green-400"
                            placeholder="Enter household size"
                            min="1"
                          />
                        ) : (
                          <div className="input bg-navy-800">
                            <span className={profile.household_size ? 'text-yellow-200' : 'text-gray-400 italic'}>
                              {profile.household_size || 'Not provided'}
                            </span>
                          </div>
                        )}
                        {errors.household_size && (
                          <p className="mt-2 text-sm text-red-400 flex items-center">
                            <AlertCircle className="h-4 w-4 mr-1" />
                            {errors.household_size.message}
                          </p>
                        )}
                      </div>

                      {/* Types of Assistance Needed */}
                      <div>
                        <label className="block text-sm font-medium text-yellow-200 mb-3">
                          Types of Assistance Needed <span className="text-red-400">*</span>
                        </label>
                        <p className="text-sm text-gray-400 mb-4">Select all types of assistance you need</p>
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
                              <>
                                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                                  {[
                                    { icon: '🍔', label: 'Food & Beverages' },
                                    { icon: '👕', label: 'Clothing & Accessories' },
                                    { icon: '💊', label: 'Medical Supplies' },
                                    { icon: '📚', label: 'Educational Materials' },
                                    { icon: '🏠', label: 'Household Items' },
                                    { icon: '💰', label: 'Financial Assistance' },
                                    { icon: '🧴', label: 'Personal Care Items' },
                                    { icon: '🚗', label: 'Transportation' },
                                    { icon: '🚨', label: 'Emergency Supplies' },
                                    { icon: '📦', label: 'Other' }
                                  ].map(({ icon, label }) => (
                                    <button
                                      key={label}
                                      type="button"
                                      onClick={() => {
                                        if (value.includes(label)) {
                                          onChange(value.filter(item => item !== label))
                                        } else {
                                          onChange([...value, label])
                                        }
                                      }}
                                      className={`h-16 w-full rounded-lg border-2 transition-all flex items-center gap-2 px-3 ${
                                        value.includes(label)
                                          ? 'border-green-400 bg-green-500/20 text-white'
                                          : 'border-navy-700 bg-navy-800/50 text-gray-300 hover:border-green-400/50 hover:bg-navy-700/50'
                                      }`}
                                    >
                                      <span className="text-2xl flex-shrink-0">{icon}</span>
                                      <span className="text-xs font-medium text-left truncate">{label}</span>
                                    </button>
                                  ))}
                                </div>
                                {value && value.length > 0 && (
                                  <p className="mt-3 text-sm text-green-400">
                                    ✓ {value.length} assistance type(s) selected
                                  </p>
                                )}
                              </>
                            )}
                          />
                        ) : (
                          <div className="flex flex-wrap gap-2">
                            {profile.assistance_needs && profile.assistance_needs.length > 0 ? (
                              profile.assistance_needs.map((need, index) => (
                                <span key={index} className="badge badge-success">{need}</span>
                              ))
                            ) : (
                              <span className="text-yellow-400 text-sm">None specified</span>
                            )}
                          </div>
                        )}
                        {errors.assistance_needs && (
                          <p className="mt-2 text-sm text-red-400 flex items-center">
                            <AlertCircle className="h-4 w-4 mr-1" />
                            {errors.assistance_needs.message}
                          </p>
                        )}
                      </div>

                      {/* Emergency Contact Name */}
                      <div>
                        <label className="block text-sm font-medium text-yellow-200 mb-2">
                          Emergency Contact Name <span className="text-red-400">*</span>
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
                            className="input focus:ring-2 focus:ring-green-400 focus:border-green-400"
                            placeholder="Enter emergency contact name"
                          />
                        ) : (
                          <div className="input bg-navy-800">
                            <span className={profile.emergency_contact_name ? 'text-yellow-200' : 'text-gray-400 italic'}>
                              {profile.emergency_contact_name || 'Not provided'}
                            </span>
                          </div>
                        )}
                        {errors.emergency_contact_name && (
                          <p className="mt-2 text-sm text-red-400 flex items-center">
                            <AlertCircle className="h-4 w-4 mr-1" />
                            {errors.emergency_contact_name.message}
                          </p>
                        )}
                      </div>

                      {/* Emergency Contact Phone */}
                      <div>
                        <label className="block text-sm font-medium text-yellow-200 mb-2">
                          Emergency Contact Phone <span className="text-red-400">*</span>
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
                            className="input focus:ring-2 focus:ring-green-400 focus:border-green-400"
                            placeholder="09123456789 or +639123456789"
                            maxLength="13"
                          />
                        ) : (
                          <div className="input bg-navy-800">
                            <span className={profile.emergency_contact_phone ? 'text-yellow-200' : 'text-gray-400 italic'}>
                              {profile.emergency_contact_phone || 'Not provided'}
                            </span>
                          </div>
                        )}
                        {errors.emergency_contact_phone && (
                          <p className="mt-2 text-sm text-red-400 flex items-center">
                            <AlertCircle className="h-4 w-4 mr-1" />
                            {errors.emergency_contact_phone.message}
                          </p>
                        )}
                      </div>

                      {/* Bio Section */}
                      <div>
                        <label className="block text-sm font-medium text-yellow-200 mb-2">
                          Bio/Description
                          <span className="text-xs text-gray-400 ml-2">(Optional)</span>
                        </label>
                        <p className="text-sm text-gray-400 mb-4">Tell others about your situation and needs</p>
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
                            className="input h-32 resize-none focus:ring-2 focus:ring-green-400 focus:border-green-400"
                            placeholder="Share your story, current situation, and specific needs... (Optional)"
                          />
                        ) : (
                          <div className="input bg-navy-800 h-32 overflow-y-auto custom-scrollbar">
                            <span className={profile.bio ? 'text-yellow-200' : 'text-gray-400 italic'}>
                              {profile.bio || 'Not provided'}
                            </span>
                          </div>
                        )}
                        {isEditing && (
                          <div className="flex justify-between mt-2">
                            {errors.bio ? (
                              <p className="text-sm text-red-400 flex items-center">
                                <AlertCircle className="h-4 w-4 mr-1" />
                                {errors.bio.message}
                              </p>
                            ) : (
                              <span className="text-xs text-gray-400">
                                {watch('bio')?.length || 0}/1000 characters
                              </span>
                            )}
                          </div>
                        )}
                      </div>

                  </div>
                </motion.div>
                )}

                {profile.role === 'volunteer' && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                  >
                    <VolunteerProfileSettings 
                      ref={volunteerSettingsRef}
                      profileData={profile}
                      onUpdate={(currentData, originalValues) => {
                        // Update form data when volunteer component changes
                        Object.entries(currentData).forEach(([key, value]) => {
                          setValue(key, value, { shouldDirty: true, shouldValidate: true })
                        })
                        
                        // Compare current data with original values to determine if dirty
                        if (originalValues) {
                          const volunteerFields = [
                            'volunteer_experience',
                            'special_skills',
                            'languages_spoken',
                            'primary_id_type',
                            'primary_id_number',
                            'primary_id_expiry',
                            'primary_id_image_url',
                            'has_insurance',
                            'insurance_provider',
                            'insurance_policy_number',
                            'preferred_delivery_types',
                            'delivery_notes',
                            'communication_preferences'
                          ]
                          
                          const hasChanges = volunteerFields.some(key => {
                            const currentValue = currentData[key]
                            const originalValue = originalValues[key]
                            
                            // Handle arrays - compare deeply
                            if (Array.isArray(currentValue) && Array.isArray(originalValue)) {
                              if (currentValue.length !== originalValue.length) return true
                              return currentValue.some((val, idx) => val !== originalValue[idx])
                            }
                            
                            // Handle other types
                            return currentValue !== originalValue
                          })
                          
                          // Only mark form as dirty if there are actual changes
                          // Note: react-hook-form's isDirty will handle this, but we can also manually control it
                          if (!hasChanges) {
                            // Reset the specific fields to their original values to clear dirty state
                            Object.entries(originalValues).forEach(([key, value]) => {
                              setValue(key, value, { shouldDirty: false })
                            })
                          }
                        }
                      }}
                      isEditing={isEditing}
                    />
                  </motion.div>
                )}
                </motion.div>
              )}

              {/* Admin Settings Tab */}
              {activeTab === 'admin-settings' && profile.role === 'admin' && (
                <motion.div
                  key="admin-settings"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  transition={{ duration: 0.2 }}
                >
                  <AdminSettings 
                    ref={adminSettingsRef}
                    onUpdate={(currentSettings, originalSettings) => {
                      // Compare current settings with original to determine if dirty
                      if (originalSettings) {
                        // List of all settings keys to compare
                        const settingsKeys = [
                          'enableSystemLogs',
                          'logRetentionDays',
                          'requireIdVerification',
                          'auto_assign_enabled',
                          'expiry_retention_days',
                          'donor_signup_enabled',
                          'recipient_signup_enabled',
                          'volunteer_signup_enabled'
                        ]
                        
                        const hasChanges = settingsKeys.some(key => {
                          const currentValue = currentSettings[key]
                          const originalValue = originalSettings[key]
                          
                          // Normalize values for comparison (handle null/undefined/boolean)
                          const normalize = (val) => {
                            if (val === null || val === undefined) {
                              // Use default values based on key
                              if (key === 'enableSystemLogs' || key === 'requireIdVerification' || 
                                  key === 'donor_signup_enabled' || key === 'recipient_signup_enabled' || 
                                  key === 'volunteer_signup_enabled') {
                                return true
                              }
                              if (key === 'auto_assign_enabled') {
                                return false
                              }
                              if (key === 'logRetentionDays' || key === 'expiry_retention_days') {
                                return 30
                              }
                              return val
                            }
                            return val
                          }
                          
                          const normalizedCurrent = normalize(currentValue)
                          const normalizedOriginal = normalize(originalValue)
                          
                          return normalizedCurrent !== normalizedOriginal
                        })
                        
                        setAdminSettingsDirty(hasChanges)
                      } else {
                        // If no original settings yet, don't mark as dirty
                        setAdminSettingsDirty(false)
                      }
                    }}
                    isEditing={isEditing}
                  />
                </motion.div>
              )}
            </AnimatePresence>

            {/* Save Button - Only visible when there are unsaved changes */}
            <AnimatePresence>
              {(isDirty || (activeTab === 'admin-settings' && adminSettingsDirty)) && (
                <motion.div
                  initial={{ opacity: 0, y: 10, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 10, scale: 0.98 }}
                  transition={{
                    duration: 0.3,
                    ease: [0.4, 0, 0.2, 1],
                    opacity: { duration: 0.25 },
                    scale: { duration: 0.3 }
                  }}
                  className="sticky bottom-4 z-50 mt-8 flex justify-center"
                >
                  <div className="bg-gradient-to-r from-navy-800 to-navy-900 border border-yellow-400/30 rounded-lg p-2.5 shadow-2xl backdrop-blur-sm w-[60%]">
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center text-yellow-300">
                        <AlertCircle className="h-2.5 w-2.5 mr-1.5" />
                        <span className="text-xs font-medium">You have unsaved changes</span>
                      </div>
                    </div>
                    <div className="flex flex-col sm:flex-row gap-1.5">
                      <button
                        type="submit"
                        disabled={isLoading}
                        className="btn btn-primary flex items-center justify-center flex-1 text-xs px-3.5 py-1.5 active:scale-95 font-semibold shadow-lg"
                      >
                        {isLoading ? (
                          <>
                            <LoadingSpinner size="sm" />
                            <span className="ml-1.5">Saving Changes...</span>
                          </>
                        ) : (
                          <>
                            <Save className="h-3 w-3 mr-1.5" />
                            Save Changes
                          </>
                        )}
                      </button>
                      <button
                        type="button"
                        onClick={cancelEdit}
                        disabled={isLoading}
                        className="btn btn-secondary flex items-center justify-center sm:flex-none sm:px-3.5 text-xs px-3.5 py-1.5 active:scale-95 font-semibold"
                      >
                        <X className="h-3 w-3 mr-1.5" />
                        Discard
                      </button>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
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

      {/* Profile Image Viewer Modal */}
      <AnimatePresence>
        {showProfileImageModal && (
          <div className="fixed inset-0 z-50">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowProfileImageModal(false)}
              className="absolute inset-0 bg-black/90 backdrop-blur-sm"
            />
            
            {/* Image Container - Full Screen */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative w-full h-full flex items-center justify-center p-4"
              onClick={(e) => e.stopPropagation()}
            >
              {imagePreview ? (
                <>
                  <img
                    src={imagePreview}
                    alt="Profile"
                    className="max-w-full max-h-full w-auto h-auto object-contain"
                  />
                  {/* Close Button Overlay */}
                  <button
                    type="button"
                    onClick={() => setShowProfileImageModal(false)}
                    className="absolute top-4 right-4 p-2.5 rounded-full bg-black/70 hover:bg-black/90 text-white transition-colors backdrop-blur-sm z-10 shadow-lg"
                    title="Close"
                  >
                    <X className="h-6 w-6" />
                  </button>
                </>
              ) : (
                <div className="relative flex flex-col items-center justify-center text-center">
                  <div className="w-48 h-48 rounded-full bg-navy-800 border-4 border-navy-700 flex items-center justify-center mb-4">
                    <User className="h-24 w-24 text-yellow-400" />
                  </div>
                  <p className="text-gray-400 text-lg">No profile picture uploaded</p>
                  <p className="text-gray-500 text-sm mt-2">Click "Choose Image" to upload a profile picture</p>
                  {/* Close Button Overlay */}
                  <button
                    type="button"
                    onClick={() => setShowProfileImageModal(false)}
                    className="absolute top-4 right-4 p-2.5 rounded-full bg-black/70 hover:bg-black/90 text-white transition-colors backdrop-blur-sm z-10 shadow-lg"
                    title="Close"
                  >
                    <X className="h-6 w-6" />
                  </button>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default ProfilePage 