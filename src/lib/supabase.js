import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

// Check if Supabase is properly configured
const isSupabaseConfigured = supabaseUrl && supabaseAnonKey && supabaseUrl !== 'your_supabase_project_url'

let supabase = null

if (isSupabaseConfigured) {
  try {
    // Production-optimized Supabase client configuration
    const isProduction = import.meta.env.PROD || import.meta.env.MODE === 'production'
    
    supabase = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        autoRefreshToken: true, // Critical for production - keeps sessions alive
        persistSession: true,
        detectSessionInUrl: true,
        // Production-specific settings
        storage: typeof window !== 'undefined' ? window.localStorage : undefined,
        storageKey: 'hopelink-auth-token',
        // Refresh token before it expires (5 minutes before expiry)
        flowType: 'pkce'
      },
      // Production optimizations
      global: {
        headers: isProduction ? {
          'x-client-info': 'hopelink-web'
        } : {}
      },
      // Real-time settings for production
      realtime: {
        params: {
          eventsPerSecond: isProduction ? 10 : 2
        }
      }
    })
    
    // Note: Session refresh is handled in AuthContext.jsx to prevent idle timeout
    // This ensures proper cleanup and React lifecycle management
  } catch (error) {
    if (import.meta.env.DEV) {
    console.warn('❌ Failed to initialize Supabase:', error)
    }
  }
} else {
  if (import.meta.env.DEV) {
  console.warn('⚠️ Supabase not configured. Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY')
  }
}

// Helper functions for common database operations
export const db = {
  // Users
  async getProfile(userId) {
    if (!supabase) {
      throw new Error('Supabase not configured. Please set up your environment variables.')
    }

    try {
      // Get user data with joined profile tables based on role
      // Explicitly list users table columns to avoid schema cache issues with moved columns
      const { data: user, error: userError } = await supabase
        .from('users')
        .select(`
          id,
          email,
          name,
          role,
          phone_number,
          is_verified,
          is_active,
          verification_status,
          address,
          city,
          province,
          latitude,
          longitude,
          profile_image_url,
          bio,
          birthdate,
          age,
          role_preferences,
          contact_info,
          address_details,
          id_verification,
          organization_info,
          created_at,
          updated_at,
          last_login_at,
          event_absence_count,
          event_banned,
          event_banned_at,
          event_banned_by,
          account_type,
          zip_code,
          address_barangay,
          address_house,
          address_street,
          address_subdivision,
          address_landmark,
          communication_preferences,
          preferred_delivery_types,
          languages_spoken,
          special_skills,
          support_needs,
          profile:user_profiles!user_profiles_user_id_fkey(*)
        `)
        .eq('id', userId)
        .maybeSingle()
      
      if (userError) {
        console.error('Database error in getProfile:', userError)
        throw userError
      }

      if (!user) return null

      // Merge profile data from user_profiles JSONB fields
      const userProfile = Array.isArray(user.profile) ? user.profile[0] : user.profile

      const profile = {
        ...user,
        // Flatten donor JSONB fields
        ...(userProfile?.donor ? {
          organization_name: userProfile.donor.organization_name,
          website_link: userProfile.donor.website_link,
          donation_types: userProfile.donor.donation_types
        } : {}),
        // Flatten volunteer JSONB fields
        ...(userProfile?.volunteer ? {
          has_vehicle: userProfile.volunteer.has_vehicle,
          vehicle_type: userProfile.volunteer.vehicle_type,
          vehicle_capacity: userProfile.volunteer.vehicle_capacity,
          max_delivery_distance: userProfile.volunteer.max_delivery_distance,
          max_deliveries_per_week: userProfile.volunteer.max_deliveries_per_week,
          volunteer_experience: userProfile.volunteer.volunteer_experience,
          background_check_consent: userProfile.volunteer.background_check_consent,
          availability_days: userProfile.volunteer.availability_days,
          availability_times: userProfile.volunteer.availability_times,
          delivery_preferences: userProfile.volunteer.delivery_preferences,
          has_insurance: userProfile.volunteer.has_insurance,
          insurance_provider: userProfile.volunteer.insurance_provider,
          insurance_policy_number: userProfile.volunteer.insurance_policy_number,
          urgency_response: userProfile.volunteer.urgency_response,
          preferred_urgency: userProfile.volunteer.preferred_urgency
        } : {}),
        // Flatten recipient JSONB fields
        ...(userProfile?.recipient ? {
          household_size: userProfile.recipient.household_size,
          assistance_needs: userProfile.recipient.assistance_needs,
          emergency_contact_name: userProfile.recipient.emergency_contact_name,
          emergency_contact_phone: userProfile.recipient.emergency_contact_phone
        } : {}),
        // Flatten ID document JSONB fields
        ...(userProfile?.id_documents ? {
          primary_id_type: userProfile.id_documents.primary_id_type,
          primary_id_number: userProfile.id_documents.primary_id_number,
          primary_id_expiry: userProfile.id_documents.primary_id_expiry,
          primary_id_image_url: userProfile.id_documents.primary_id_image_url,
          secondary_id_type: userProfile.id_documents.secondary_id_type,
          secondary_id_number: userProfile.id_documents.secondary_id_number,
          secondary_id_expiry: userProfile.id_documents.secondary_id_expiry,
          secondary_id_image_url: userProfile.id_documents.secondary_id_image_url,
          verification_status: userProfile.id_documents.verification_status
        } : {})
      }

      // Remove nested object
      delete profile.profile
      
      return profile
    } catch (error) {
      // Handle network errors gracefully
      if (error.message?.includes('Failed to fetch') || 
          error.message?.includes('CORS') || 
          error.message?.includes('NetworkError') || 
          error.message?.includes('QUIC') ||
          error.message?.includes('TypeError: Failed to fetch') ||
          error.code === '' || 
          error.statusCode === 502 || 
          error.statusCode === 503 || 
          error.statusCode === 504 || 
          error.statusCode === 500) {
        console.warn('Network/server error fetching profile (non-critical):', error.message)
        return null
      }
      
      // Handle statement timeout errors
      if (error.code === '57014' || 
          error.message?.includes('statement timeout') || 
          error.message?.includes('canceling statement')) {
        console.warn('Query timeout fetching profile (table may be large or slow):', error.message)
        return null
      }
      
      console.error('Error in getProfile:', error)
      throw error
    }
  },

  async checkEmailAvailability(email) {
    if (!supabase) {
      throw new Error('Supabase not configured. Please set up your environment variables.')
    }

    try {
      const { data, error } = await supabase
        .from('users')
        .select('email')
        .eq('email', email.toLowerCase())
        .maybeSingle()
      
      if (error && error.code !== 'PGRST116') {
        // PGRST116 means no rows found, which is fine
        console.error('Database error in checkEmailAvailability:', error)
        throw error
      }
      
      return !data // Returns true if email is available (no user found)
    } catch (error) {
      console.error('Error checking email availability:', error)
      throw error
    }
  },

  async createProfile(userId, profileData) {
    if (!supabase) {
      throw new Error('Supabase not configured. Please set up your environment variables.')
    }

    // Separate core user data from role-specific data
    const {
      // Donor fields
      organization_name,
      website_link,
      donation_types,
      // Volunteer fields
      has_vehicle,
      vehicle_type,
      max_delivery_distance,
      volunteer_experience,
      background_check_consent,
      availability_days,
      availability_times,
      delivery_preferences,
      has_insurance,
      insurance_provider,
      insurance_policy_number,
      // Recipient fields
      household_size,
      assistance_needs,
      emergency_contact_name,
      emergency_contact_phone,
      // ID document fields
      primary_id_type,
      primary_id_number,
      primary_id_image_url,
      secondary_id_type,
      secondary_id_number,
      secondary_id_image_url,
      // Core user fields (everything else)
      ...userData
    } = profileData

    // Create user record
    // Only select core fields to avoid schema cache issues with moved columns
    const { data: user, error: userError } = await supabase
      .from('users')
      .insert({
        id: userId,
        ...userData,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select('id, email, name, role, created_at, updated_at')
      .single()
    
    if (userError) throw userError

    // Create user_profiles with JSONB fields
    const role = userData.role || user.role
    
    const userProfileData = {}
    
    // Build donor JSONB
    if (role === 'donor' && (organization_name || website_link || donation_types)) {
      userProfileData.donor = {
          organization_name,
          website_link,
          donation_types
      }
    }

    // Build volunteer JSONB
    if (role === 'volunteer' && (
      has_vehicle !== undefined ||
      vehicle_type ||
      vehicle_capacity ||
      max_delivery_distance !== undefined ||
      volunteer_experience ||
      background_check_consent !== undefined ||
      availability_days ||
      availability_times ||
      delivery_preferences ||
      has_insurance !== undefined ||
      insurance_provider ||
      insurance_policy_number
    )) {
      userProfileData.volunteer = {
          has_vehicle: true, // Vehicle is required for volunteers
          vehicle_type,
          vehicle_capacity,
          max_delivery_distance,
          volunteer_experience,
          background_check_consent: background_check_consent || false,
          availability_days,
          availability_times,
          delivery_preferences,
          has_insurance: has_insurance || false,
          insurance_provider,
          insurance_policy_number
      }
    }

    // Build recipient JSONB
    if (role === 'recipient' && (
      household_size !== undefined ||
      assistance_needs ||
      emergency_contact_name ||
      emergency_contact_phone
    )) {
      userProfileData.recipient = {
          household_size,
          assistance_needs,
          emergency_contact_name,
          emergency_contact_phone
      }
    }

    // Build ID documents JSONB
    if (primary_id_type || primary_id_number || primary_id_image_url ||
        secondary_id_type || secondary_id_number || secondary_id_image_url) {
      userProfileData.id_documents = {
          primary_id_type,
          primary_id_number,
          primary_id_image_url,
          secondary_id_type,
          secondary_id_number,
          secondary_id_image_url,
          verification_status: 'pending'
      }
    }
    
    // Insert user_profiles if there's any profile data
    if (Object.keys(userProfileData).length > 0) {
      const { error: profileError } = await supabase
        .from('user_profiles')
        .insert({
          user_id: userId,
          ...userProfileData
        })
      
      if (profileError) {
        console.error('Error creating user profile:', profileError)
        // Don't throw - user was created successfully
      }
    }

    // Get complete profile with joined data
    const completeProfile = await this.getProfile(userId)

    // Notify admins about new user registration
    try {
      const userName = user.name || 'A new user'
      const roleEmoji = role === 'donor' ? '💝' : role === 'recipient' ? '🤲' : role === 'volunteer' ? '🚚' : '👤'
      
      await this.notifyAllAdmins({
        type: 'system_alert',
        title: `${roleEmoji} New User Registration`,
        message: `${userName} registered as ${role}`,
        data: {
          user_id: userId,
          user_name: userName,
          user_role: role,
          user_email: user.email,
          link: '/admin/users',
          notification_type: 'new_user'
        }
      })
    } catch (notifError) {
      console.error('Error notifying admins about new user:', notifError)
      // Don't throw - user was created successfully
    }

    return completeProfile || user
  },

  async updateProfile(userId, updates) {
    if (!supabase) {
      throw new Error('Supabase not configured. Please set up your environment variables.')
    }

    // Separate updates by table
    const {
      // Donor fields
      organization_name,
      website_link,
      donation_types,
      // Volunteer fields
      has_vehicle,
      vehicle_type,
      vehicle_capacity,
      max_delivery_distance,
      max_deliveries_per_week,
      volunteer_experience,
      background_check_consent,
      availability_days,
      availability_times,
      delivery_preferences,
      has_insurance,
      insurance_provider,
      insurance_policy_number,
      // Recipient fields
      household_size,
      assistance_needs,
      emergency_contact_name,
      emergency_contact_phone,
      // ID document fields
      primary_id_type,
      primary_id_number,
      primary_id_expiry,
      primary_id_image_url,
      secondary_id_type,
      secondary_id_number,
      secondary_id_expiry,
      secondary_id_image_url,
      // Core user fields (everything else)
      ...userUpdates
    } = updates

    // Update user table if there are core user fields
    // Only select necessary fields to avoid schema cache issues
    let userData = null
    if (Object.keys(userUpdates).length > 0) {
      const { data, error } = await supabase
        .from('users')
        .update({ ...userUpdates, updated_at: new Date().toISOString() })
        .eq('id', userId)
        .select('id, role, name, email, updated_at')
        .single()
      
      if (error) throw error
      userData = data
    }

    // Get user role to determine which profile table to update
    if (!userData) {
      const { data: user } = await supabase
        .from('users')
        .select('role')
        .eq('id', userId)
        .single()
      userData = user
    }

    const role = userData?.role

    // Get existing profile to merge JSONB fields
    const { data: existingProfile } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle()

    // Build updates for each JSONB field
    const profileUpdates = {}
    
    // Build donor JSONB updates
    const donorUpdates = {}
    if (organization_name !== undefined) donorUpdates.organization_name = organization_name
    if (website_link !== undefined) donorUpdates.website_link = website_link
    if (donation_types !== undefined) donorUpdates.donation_types = donation_types

    if (role === 'donor' && Object.keys(donorUpdates).length > 0) {
      profileUpdates.donor = {
        ...(existingProfile?.donor || {}),
        ...donorUpdates
      }
    }

    // Build volunteer JSONB updates
    const volunteerUpdates = {}
    // Vehicle is required for volunteers - automatically set has_vehicle to true if vehicle info is provided
    if (vehicle_type !== undefined || vehicle_capacity !== undefined) {
      volunteerUpdates.has_vehicle = true
    }
    if (has_vehicle !== undefined) volunteerUpdates.has_vehicle = has_vehicle
    if (vehicle_type !== undefined) volunteerUpdates.vehicle_type = vehicle_type
    if (vehicle_capacity !== undefined) volunteerUpdates.vehicle_capacity = vehicle_capacity
    if (max_delivery_distance !== undefined) volunteerUpdates.max_delivery_distance = max_delivery_distance
    if (max_deliveries_per_week !== undefined) volunteerUpdates.max_deliveries_per_week = max_deliveries_per_week
    if (volunteer_experience !== undefined) volunteerUpdates.volunteer_experience = volunteer_experience
    if (background_check_consent !== undefined) volunteerUpdates.background_check_consent = background_check_consent
    if (availability_days !== undefined) volunteerUpdates.availability_days = availability_days
    if (availability_times !== undefined) volunteerUpdates.availability_times = availability_times
    if (delivery_preferences !== undefined) volunteerUpdates.delivery_preferences = delivery_preferences
    if (has_insurance !== undefined) volunteerUpdates.has_insurance = has_insurance
    if (insurance_provider !== undefined) volunteerUpdates.insurance_provider = insurance_provider
    if (insurance_policy_number !== undefined) volunteerUpdates.insurance_policy_number = insurance_policy_number

    if (role === 'volunteer' && Object.keys(volunteerUpdates).length > 0) {
      profileUpdates.volunteer = {
        ...(existingProfile?.volunteer || {}),
        ...volunteerUpdates
      }
    }

    // Build recipient JSONB updates
    const recipientUpdates = {}
    if (household_size !== undefined) recipientUpdates.household_size = household_size
    if (assistance_needs !== undefined) recipientUpdates.assistance_needs = assistance_needs
    if (emergency_contact_name !== undefined) recipientUpdates.emergency_contact_name = emergency_contact_name
    if (emergency_contact_phone !== undefined) recipientUpdates.emergency_contact_phone = emergency_contact_phone

    if (role === 'recipient' && Object.keys(recipientUpdates).length > 0) {
      profileUpdates.recipient = {
        ...(existingProfile?.recipient || {}),
        ...recipientUpdates
      }
    }

    // Build ID documents JSONB updates
    const idDocUpdates = {}
    if (primary_id_type !== undefined) idDocUpdates.primary_id_type = primary_id_type
    if (primary_id_number !== undefined) idDocUpdates.primary_id_number = primary_id_number
    if (primary_id_expiry !== undefined) idDocUpdates.primary_id_expiry = primary_id_expiry
    if (primary_id_image_url !== undefined) idDocUpdates.primary_id_image_url = primary_id_image_url
    if (secondary_id_type !== undefined) idDocUpdates.secondary_id_type = secondary_id_type
    if (secondary_id_number !== undefined) idDocUpdates.secondary_id_number = secondary_id_number
    if (secondary_id_expiry !== undefined) idDocUpdates.secondary_id_expiry = secondary_id_expiry
    if (secondary_id_image_url !== undefined) idDocUpdates.secondary_id_image_url = secondary_id_image_url

    if (Object.keys(idDocUpdates).length > 0) {
      profileUpdates.id_documents = {
        ...(existingProfile?.id_documents || {}),
            ...idDocUpdates,
        verification_status: existingProfile?.id_documents?.verification_status || 'pending'
      }

      // Notify admins when user uploads ID documents
      if ((primary_id_image_url || secondary_id_image_url) && userData) {
        try {
          const userName = userData.name || 'A user'
          const idType = primary_id_type || secondary_id_type || 'ID'
          
          await this.notifyAllAdmins({
            type: 'system_alert',
            title: '🆔 New ID Document Uploaded',
            message: `${userName} uploaded ${idType} for verification`,
            data: {
              user_id: userId,
              user_name: userName,
              user_role: userData.role,
              id_type: idType,
              has_primary_id: !!primary_id_image_url,
              has_secondary_id: !!secondary_id_image_url,
              link: '/admin/id-verification',
              notification_type: 'new_id_upload'
            }
          })
        } catch (notifError) {
          console.error('Error notifying admins about ID upload:', notifError)
          // Don't throw - profile was updated successfully
        }
      }
    }

    // Update or insert user_profiles
    if (Object.keys(profileUpdates).length > 0) {
      profileUpdates.updated_at = new Date().toISOString()
      
      if (existingProfile) {
        // Update existing profile
        const { error: profileError } = await supabase
          .from('user_profiles')
          .update(profileUpdates)
          .eq('user_id', userId)
        
        if (profileError) {
          console.error('Error updating user profile:', profileError)
        }
      } else {
        // Insert new profile
        const { error: profileError } = await supabase
          .from('user_profiles')
          .insert({
            user_id: userId,
            ...profileUpdates
          })
        
        if (profileError) {
          console.error('Error creating user profile:', profileError)
        }
      }
    }

    // Get complete updated profile
    const completeProfile = await this.getProfile(userId)
    return completeProfile || userData
  },

  // Donations
  async getDonations(filters = {}) {
    if (!supabase) {
      throw new Error('Supabase not configured. Please set up your environment variables.')
    }

    // Apply limit first for better performance - reduced default to 200 for faster loading
    const limit = filters.limit || 200 // Default reasonable limit

    // Auto-expire donations in background (non-blocking) for better performance
    // Fire and forget - don't wait for it to complete
    this.autoExpireDonations(null).catch(err => {
      console.warn('Background auto-expire donations failed:', err)
    })

    let query = supabase
      .from('donations')
      .select(`
        *,
        donor:users!donations_donor_id_fkey(
          id,
          name, 
          email, 
          profile_image_url,
          latitude,
          longitude,
          profile:user_profiles(donor)
        )
      `)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (filters.status) {
      query = query.eq('status', filters.status)
    }
    
    if (filters.category) {
      query = query.eq('category', filters.category)
    }

    if (filters.donor_id) {
      query = query.eq('donor_id', filters.donor_id)
    }

    if (filters.donation_destination) {
      query = query.eq('donation_destination', filters.donation_destination)
    }

    const { data, error } = await query
    if (error) throw error
    return data
  },

  async getDonationById(donationId) {
    if (!supabase) {
      throw new Error('Supabase not configured. Please set up your environment variables.')
    }

    const { data, error } = await supabase
      .from('donations')
      .select(`
        *,
        donor:users!donations_donor_id_fkey(name, email, profile_image_url)
      `)
      .eq('id', donationId)
      .single()

    if (error) throw error
    return data
  },

  async createDonation(donation) {
    if (!supabase) {
      throw new Error('Supabase not configured. Please set up your environment variables.')
    }

    // Simplified insert without complex joins for better performance
    const { data, error } = await supabase
      .from('donations')
      .insert(donation)
      .select(`
        *,
        donor:users!donations_donor_id_fkey(id, name, email)
      `)
      .single()
    
    if (error) throw error

    // Notify admins about new donations
    try {
      const donorName = data.donor?.name || 'A donor'
      
      if (data.donation_destination === 'organization') {
        // CFC Direct Donation
        await this.notifyAllAdmins({
          type: 'system_alert',
          title: '🏢 New Direct Donation to CFC-GK',
          message: `${donorName} donated ${data.category} directly to the organization`,
          data: {
            donation_id: data.id,
            donor_id: data.donor_id,
            donor_name: donorName,
            title: data.title,
            category: data.category,
            quantity: data.quantity,
            link: '/admin/cfc-donations',
            notification_type: 'new_cfc_donation'
          }
        })
      } else {
        // Regular Posted Donation
        await this.notifyAllAdmins({
          type: 'system_alert',
          title: '📦 New Donation Posted',
          message: `${donorName} posted ${data.category} for recipients`,
          data: {
            donation_id: data.id,
            donor_id: data.donor_id,
            donor_name: donorName,
            title: data.title,
            category: data.category,
            quantity: data.quantity,
            link: '/admin/donations',
            notification_type: 'new_donation'
          }
        })
      }
    } catch (notifError) {
      console.error('Error notifying admins about new donation:', notifError)
      // Don't throw - donation was created successfully
    }

    // Perform automatic matching if enabled (non-blocking)
    if (data.donation_destination === 'recipients' && data.status === 'available') {
      try {
        const autoMatchResult = await this.performAutomaticMatching(data.id, null)
        if (autoMatchResult.matched) {
          return { ...data, _autoMatched: true, _autoMatchResult: autoMatchResult }
        }
      } catch (matchError) {
        console.warn('Automatic matching failed (non-blocking):', matchError)
      }
    }

    // Incremental matching: suggest top matches for this new donation (non-blocking best-effort)
    try {
      const suggestions = await this.matchNewDonation(data.id, { maxResults: 3 })
      // Attach suggestions without altering DB
      return { ...data, _suggestedMatches: suggestions }
    } catch (e) {
      // Fallback to original data on any error
      console.warn('matchNewDonation failed:', e)
      return data
    }
  },

  async updateDonation(donationId, updates, userId = null) {
    if (!supabase) {
      throw new Error('Supabase not configured. Please set up your environment variables.')
    }

    // If userId is provided, check ownership and status restrictions
    if (userId) {
      const { data: donation, error: checkError } = await supabase
        .from('donations')
        .select('donor_id, status')
        .eq('id', donationId)
        .single()

      if (checkError) throw checkError

      if (donation.donor_id !== userId) {
        throw new Error('You can only edit your own donations')
      }

      if (!['available'].includes(donation.status)) {
        throw new Error('Cannot edit donations that are claimed or completed')
      }
    }

    // Remove fields that shouldn't be updated
    const { donor_id, created_at, ...allowedUpdates } = updates

    let query = supabase
      .from('donations')
      .update({
        ...allowedUpdates,
        updated_at: new Date().toISOString()
      })
      .eq('id', donationId)

    // Add user restriction only if userId is provided
    if (userId) {
      query = query.eq('donor_id', userId)
    }

    const { data, error } = await query.select('*').single()

    if (error) throw error
    return data
  },

  async deleteDonation(donationId, userId) {
    if (!supabase) {
      throw new Error('Supabase not configured. Please set up your environment variables.')
    }

    // First check if the donation belongs to the user and can be deleted
    const { data: donation, error: checkError } = await supabase
      .from('donations')
      .select('donor_id, status')
      .eq('id', donationId)
      .single()

    if (checkError) throw checkError

    if (donation.donor_id !== userId) {
      throw new Error('You can only delete your own donations')
    }

    if (!['available', 'cancelled', 'expired'].includes(donation.status)) {
      throw new Error('Cannot delete donations that are claimed or in progress')
    }

    const { error } = await supabase
      .from('donations')
      .delete()
      .eq('id', donationId)
      .eq('donor_id', userId)

    if (error) throw error
    return true
  },

  // Donation Requests
  async getRequests(filters = {}) {
    if (!supabase) {
      throw new Error('Supabase not configured. Please set up your environment variables.')
    }

    // Apply limit first for better performance - reduced default to 200 for faster loading
    const limit = filters.limit || 200 // Default reasonable limit

    let query = supabase
      .from('donation_requests')
      .select(`
        *,
        requester:users!donation_requests_requester_id_fkey(
          id,
          name,
          email,
          phone_number,
          profile_image_url,
          role,
          city,
          province,
          address,
          address_barangay,
          address_house,
          address_street,
          address_subdivision,
          address_landmark,
          bio,
          latitude,
          longitude,
          created_at,
          profile:user_profiles!user_profiles_user_id_fkey(recipient)
        )
      `)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (filters.status) {
      query = query.eq('status', filters.status)
    }
    
    if (filters.category) {
      query = query.eq('category', filters.category)
    }

    if (filters.requester_id) {
      query = query.eq('requester_id', filters.requester_id)
    }

    const { data, error } = await query
    if (error) throw error
    return data
  },

  async createRequest(request) {
    if (!supabase) {
      throw new Error('Supabase not configured. Please set up your environment variables.')
    }

    const { data, error } = await supabase
      .from('donation_requests')
      .insert(request)
      .select(`
        *,
        requester:users!donation_requests_requester_id_fkey(
          id,
          name,
          email,
          phone_number,
          profile_image_url,
          role,
          city,
          province,
          address,
          address_barangay,
          bio,
          created_at,
          profile:user_profiles(recipient)
        )
      `)
      .single()
    
    if (error) throw error
    
    // Perform automatic matching if enabled (non-blocking)
    try {
      const autoMatchResult = await this.performAutomaticMatching(null, data.id)
      if (autoMatchResult.matched) {
        return { ...data, _autoMatched: true, _autoMatchResult: autoMatchResult }
      }
    } catch (matchError) {
      console.warn('Automatic matching failed (non-blocking):', matchError)
    }
    
    // Incremental matching: suggest top matches for this new request (non-blocking best-effort)
    try {
      const suggestions = await this.matchNewRequest(data.id, { maxResults: 5 })
      return { ...data, _suggestedMatches: suggestions }
    } catch (e) {
      console.warn('matchNewRequest failed:', e)
      return data
    }
  },

  // ------------------------------
  // Incremental matching helpers
  // ------------------------------

  async matchNewDonation(donationId, { maxResults = 5 } = {}) {
    if (!supabase) {
      throw new Error('Supabase not configured. Please set up your environment variables.')
    }

    try {
      const { intelligentMatcher } = await import('./matchingAlgorithm.js')

      // Load the donation with donor info
      const { data: donation, error: dErr } = await supabase
        .from('donations')
        .select(`
          *,
          donor:users!donations_donor_id_fkey(
            id, name, latitude, longitude, city
          )
        `)
        .eq('id', donationId)
        .single()

      if (dErr) throw dErr
      if (!donation || donation.status !== 'available') return []

      // Load currently open requests - limit to 200 for performance
      const requests = await this.getRequests({ status: 'open', limit: 200 })

      // Score each request against this donation only (efficient path)
      const scored = await Promise.all((requests || []).map(async (request) => {
        const matches = await intelligentMatcher.matchDonorsToRequest(request, [donation], 1)
        if (!matches || matches.length === 0) return null
        const top = matches[0]
        return {
          request,
          donation: top.donation,
          score: top.score,
          criteriaScores: top.criteriaScores,
          matchReason: top.matchReason
        }
      }))

      return (scored.filter(Boolean))
        .sort((a, b) => b.score - a.score)
        .slice(0, maxResults)
    } catch (error) {
      console.error('Error in matchNewDonation:', error)
      return []
    }
  },

  async matchNewRequest(requestId, { maxResults = 10 } = {}) {
    if (!supabase) {
      throw new Error('Supabase not configured. Please set up your environment variables.')
    }

    try {
      const { intelligentMatcher } = await import('./matchingAlgorithm.js')

      // Load the request with requester info
      const { data: request, error: rErr } = await supabase
        .from('donation_requests')
        .select(`
          *,
          requester:users!donation_requests_requester_id_fkey(
            id, name, latitude, longitude, city
          )
        `)
        .eq('id', requestId)
        .single()

      if (rErr) throw rErr
      if (!request || request.status !== 'open') return []

      // Load available donations - limit to 200 for performance
      const donations = await this.getDonations({ status: 'available', limit: 200 })

      // Use optimized matcher to find top donations for this request
      const matches = await intelligentMatcher.matchDonorsToRequest(request, donations, maxResults)
      return matches
    } catch (error) {
      console.error('Error in matchNewRequest:', error)
      return []
    }
  },

  // ------------------------------
  // Chapter 1 alignment utilities
  // ------------------------------

  // Objective: Build a ranking system for recipient requests
  async rankOpenRequests({ limit = 50 } = {}) {
    if (!supabase) {
      throw new Error('Supabase not configured. Please set up your environment variables.')
    }

    try {
      // Optimize: Only load slightly more than needed for ranking (limit * 2 max, or 100 max)
      // This prevents loading 200 requests when we only need 30
      const fetchLimit = Math.min(Math.max(limit * 2, 50), 100)
      const requests = await this.getRequests({ status: 'open', limit: fetchLimit })

      // Compute ranking score using urgency, quantity ratio, recency, and basic category priority
      const scored = (requests || []).map(req => {
        const urgencyLevels = { low: 1, medium: 2, high: 3, critical: 4 }
        const urgencyScore = (urgencyLevels[req.urgency] || 2) / 4 // 0..1

        const qtyNeeded = typeof req.quantity_needed === 'number' ? req.quantity_needed : 1
        const quantityPressure = Math.min(qtyNeeded / 10, 1) // 0..1 (higher need → higher score)

        const created = req.created_at ? new Date(req.created_at).getTime() : Date.now()
        const ageDays = Math.max(1, (Date.now() - created) / (1000 * 60 * 60 * 24))
        const recencyPenalty = Math.max(0, 1 - (ageDays / 30)) // recent → closer to 1

        // Optional: slight category boost for perishables
        const perishableCategories = new Set(['food', 'groceries', 'meals'])
        const categoryBoost = perishableCategories.has((req.category || '').toLowerCase()) ? 0.1 : 0

        const score = (
          urgencyScore * 0.5 +
          quantityPressure * 0.25 +
          recencyPenalty * 0.15 +
          categoryBoost
        )

        return { request: req, score }
      })

      return scored
        .sort((a, b) => b.score - a.score)
        .slice(0, limit)
    } catch (error) {
      console.error('Error ranking open requests:', error)
      return []
    }
  },

  // Objective: Provide verification badges derived from existing stats
  async getUserBadges(userId) {
    if (!supabase) {
      throw new Error('Supabase not configured. Please set up your environment variables.')
    }

    try {
      const profile = await this.getProfile(userId)
      if (!profile) {
        console.warn('No profile found for badges calculation, returning empty array')
        return []
      }
      
      const role = profile?.role
      const badges = []

      if (role === 'donor') {
        const { totalCompletedDonations, averageRating, totalRatings } = await this.getDonorStats(userId)
        const completedEvents = await this.getUserCompletedEvents(userId).catch(() => [])
        const completedEventsCount = completedEvents?.length || 0
        
        // Trusted Donor: Minimum 5 completed donations with at least 3.5 average rating
        if (totalCompletedDonations >= 5 && (averageRating || 0) >= 3.5) badges.push('Trusted Donor')
        // Gold Donor: Minimum 10 completed donations with at least 4.0 average rating
        if (totalCompletedDonations >= 10 && (averageRating || 0) >= 4.0) badges.push('Gold Donor')
        // Top Rated: Minimum 4.5 average rating with at least 10 ratings
        if ((averageRating || 0) >= 4.5 && (totalRatings || 0) >= 10) badges.push('Top Rated')
        // Community Champion: Completed 3 or more events with present attendance
        if (completedEventsCount >= 3) badges.push('Community Champion')
        // Event Volunteer: Completed at least 1 event with present attendance
        if (completedEventsCount >= 1) badges.push('Event Volunteer')
      } else if (role === 'recipient') {
        // Priority Recipient if critical requests exist (indicates urgent need)
        const requests = await this.getRequests({ requester_id: userId, status: 'open' })
        const hasCritical = (requests || []).some(r => r.urgency === 'critical')
        if (hasCritical) badges.push('Priority Recipient')
      } else if (role === 'volunteer') {
        const stats = await this.getVolunteerStats(userId).catch(() => null)
        const completedEvents = await this.getUserCompletedEvents(userId).catch(() => [])
        const completedEventsCount = completedEvents?.length || 0
        
        if (stats) {
          // Verified Volunteer: Minimum 5 completed deliveries with at least 3.5 average rating
          if (stats.completedDeliveries >= 5 && (stats.averageRating || 0) >= 3.5) {
            badges.push('Verified Volunteer')
          }
          // Elite Volunteer: Minimum 20 completed deliveries with at least 4.0 average rating
          if (stats.completedDeliveries >= 20 && (stats.averageRating || 0) >= 4.0) {
            badges.push('Elite Volunteer')
          }
        }
        
        // Community Champion: Completed 3 or more events with present attendance
        if (completedEventsCount >= 3) badges.push('Community Champion')
        // Event Volunteer: Completed at least 1 event with present attendance
        if (completedEventsCount >= 1) badges.push('Event Volunteer')
      }

      return badges
    } catch (error) {
      console.error('Error getting user badges:', error)
      return []
    }
  },

  // Donor stats: total completed donations, average rating, total ratings
  async getDonorStats(userId) {
    if (!supabase) {
      throw new Error('Supabase not configured. Please set up your environment variables.')
    }

    try {
      // Total completed donations by this donor (delivered status)
      const { data: completedDonations, error: countError } = await supabase
        .from('donations')
        .select('id, status')
        .eq('donor_id', userId)
        .eq('status', 'delivered')

      if (countError) throw countError
      
      const count = completedDonations?.length || 0

      // Average rating received by this donor
      const { data: feedback, error: feedbackError } = await supabase
        .from('feedback_ratings')
        .select('rating')
        .eq('rated_user_id', userId)

      if (feedbackError) throw feedbackError

      const totalRatings = feedback?.length || 0
      const averageRating = totalRatings > 0
        ? feedback.reduce((sum, f) => sum + (f.rating || 0), 0) / totalRatings
        : 0

      return {
        totalCompletedDonations: count || 0,
        averageRating,
        totalRatings
      }
    } catch (error) {
      console.error('Error getting donor stats:', error)
      return {
        totalCompletedDonations: 0,
        averageRating: 0,
        totalRatings: 0
      }
    }
  },

  // Objective: Donation quality validation helper (client-side checks before insert)
  validateDonationInput(donation) {
    const errors = []
    if (!donation?.title || donation.title.trim().length < 3) {
      errors.push('Title must be at least 3 characters')
    }
    if (!donation?.category) {
      errors.push('Category is required')
    }
    if (typeof donation?.quantity !== 'number' || donation.quantity <= 0) {
      errors.push('Quantity must be a positive number')
    }
    // If provided, ensure expiration is in future (for perishables)
    if (donation?.expiration_date) {
      const exp = new Date(donation.expiration_date).getTime()
      if (isFinite(exp) && exp < Date.now()) {
        errors.push('Expiration date must be in the future')
      }
    }
    return errors
  },

  // Objective: Volunteer assignment helper using existing matching
  async autoAssignVolunteerForClaim(claimId) {
    if (!supabase) {
      throw new Error('Supabase not configured. Please set up your environment variables.')
    }

    try {
      // Find candidates
      const matches = await this.findVolunteersForTask(claimId, 'claim', 3)
      if (!matches || matches.length === 0) {
        return { assigned: false, reason: 'No volunteers available', candidates: [] }
      }

      // Select the top candidate (do not mutate DB here to keep it safe)
      const top = matches[0]
      return { assigned: false, suggestedVolunteer: top.volunteer, candidates: matches }
    } catch (error) {
      console.error('Error auto-assigning volunteer for claim:', error)
      return { assigned: false, reason: 'Error', candidates: [] }
    }
  },

  async updateRequest(requestId, updates) {
    if (!supabase) {
      throw new Error('Supabase not configured. Please set up your environment variables.')
    }

    const { data, error } = await supabase
      .from('donation_requests')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', requestId)
      .select()
      .single()

    if (error) throw error
    return data
  },

  // Additional recipient-specific functions
  async getAvailableDonations(filters = {}) {
    if (!supabase) {
      throw new Error('Supabase not configured. Please set up your environment variables.')
    }

    // Auto-expire donations in background (non-blocking) for better performance
    // Fire and forget - don't wait for it to complete
    this.autoExpireDonations().catch(err => {
      console.warn('Background auto-expire donations failed:', err)
    })

    // Extract limit and other filters safely - reduced default to 200 for performance
    const limit = filters?.limit || 200 // Default to reasonable limit, can be overridden
    const otherFilters = filters ? { ...filters } : {}
    delete otherFilters.limit

    let query = supabase
      .from('donations')
      .select(`
        *,
        donor:users!donations_donor_id_fkey(
          id, 
          name, 
          email, 
          profile_image_url, 
          city,
          province,
          address,
          address_barangay,
          address_house,
          address_street,
          address_subdivision,
          address_landmark,
          latitude,
          longitude,
          profile:user_profiles!user_profiles_user_id_fkey(donor)
        )
      `)
      .eq('status', 'available')
      // Exclude donations destined for organization (CFC-GK) - only show donations for recipients
      .or('donation_destination.is.null,donation_destination.eq.recipients')
      .order('is_urgent', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(limit)

    // Apply additional filters if provided
    if (otherFilters.category) {
      query = query.eq('category', otherFilters.category)
    }
    if (otherFilters.condition) {
      query = query.eq('condition', otherFilters.condition)
    }
    if (otherFilters.is_urgent !== undefined) {
      query = query.eq('is_urgent', otherFilters.is_urgent)
    }

    const { data, error } = await query

    if (error) throw error
    return data
  },

  // Mark donations as expired if past expiration_date; archive expired older than retention
  async autoExpireDonations(retentionDays = null) {
    if (!supabase) {
      throw new Error('Supabase not configured. Please set up your environment variables.')
    }

    // Load retention from settings dynamically if not provided
    if (retentionDays === null) {
      try {
        const s = await this.getSettings()
        if (s?.expiry_retention_days && Number.isFinite(s.expiry_retention_days)) {
          retentionDays = s.expiry_retention_days
        } else {
          retentionDays = 30 // Default fallback
        }
      } catch (_) {
        retentionDays = 30 // Default fallback on error
      }
    }

    let expiredCount = 0
    let archivedCount = 0

    // Expire: set status='expired' and expired_at when expiration_date < now and not already terminal
    try {
      // Get ids to update to avoid mass updates blindly
      const { data: toExpire, error: expireError } = await supabase
        .from('donations')
        .select('id')
        .lt('expiration_date', new Date().toISOString())
        .in('status', ['available', 'matched', 'claimed', 'in_transit', 'delivered'])

      if (expireError) {
        console.warn('Error fetching donations to expire:', expireError)
      } else if (toExpire && toExpire.length > 0) {
        const ids = toExpire.map(d => d.id)
        const { error: updateError } = await supabase
          .from('donations')
          .update({ status: 'expired', expired_at: new Date().toISOString() })
          .in('id', ids)

        if (updateError) {
          console.warn('Error expiring donations:', updateError)
        } else {
          expiredCount = ids.length
        }
      }
    } catch (e) {
      console.warn('Error in autoExpireDonations (expire):', e)
    }

    // Archive: move expired to archived after retention
    try {
      const cutoff = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000).toISOString()
      const { data: toArchive, error: archiveError } = await supabase
        .from('donations')
        .select('id')
        .eq('status', 'expired')
        .lt('expired_at', cutoff)

      if (archiveError) {
        console.warn('Error fetching donations to archive:', archiveError)
      } else if (toArchive && toArchive.length > 0) {
        const ids = toArchive.map(d => d.id)
        const { error: updateError } = await supabase
          .from('donations')
          .update({ status: 'archived', archived_at: new Date().toISOString() })
          .in('id', ids)

        if (updateError) {
          console.warn('Error archiving donations:', updateError)
        } else {
          archivedCount = ids.length
        }
      }
    } catch (e) {
      console.warn('Error in autoExpireDonations (archive):', e)
    }

    return { expiredCount, archivedCount }
  },

  async claimDonation(donationId, recipientId) {
    if (!supabase) {
      throw new Error('Supabase not configured. Please set up your environment variables.')
    }

    // First, check if donation is still available and get delivery mode
    const { data: donation, error: checkError } = await supabase
      .from('donations')
      .select('status, quantity, delivery_mode, donor_id, pickup_location, pickup_instructions, claims')
      .eq('id', donationId)
      .single()

    if (checkError) throw checkError
    
    if (donation.status !== 'available') {
      throw new Error('This donation is no longer available')
    }

    // Generate claim ID
    const claimId = crypto.randomUUID()
    const claimedAt = new Date().toISOString()

    // Create claim object
    const newClaim = {
      id: claimId,
      recipient_id: recipientId,
      donor_id: donation.donor_id,
      quantity_claimed: donation.quantity,
      status: 'claimed',
      claimed_at: claimedAt
    }

    // Get existing claims array or create new one
    const existingClaims = Array.isArray(donation.claims) ? donation.claims : []
    const updatedClaims = [...existingClaims, newClaim]

    // Determine the new status based on delivery mode
    // For volunteer deliveries, keep status as 'available' so it appears in available-tasks
    // The status will change to 'matched' or 'in_transit' when a volunteer is assigned
    const newStatus = donation.delivery_mode === 'volunteer' ? 'available' : 'claimed'

    // Update donation with new claim in JSONB array and update status
    const { error: updateError } = await supabase
      .from('donations')
      .update({ 
        claims: updatedClaims,
        status: newStatus
      })
      .eq('id', donationId)

    if (updateError) throw updateError

    // Use the new claim object for return value
    const claim = newClaim

    // Handle different delivery modes
    if (donation.delivery_mode === 'volunteer') {
      // Create delivery record for volunteer assignments
      const { error: deliveryError } = await supabase
        .from('deliveries')
        .insert({
          claim_id: claim.id,
          pickup_address: 'TBD', // Will be filled when volunteer is assigned
          delivery_address: 'TBD', // Will be filled when volunteer is assigned
          pickup_city: 'TBD',
          delivery_city: 'TBD',
          status: 'pending' // Waiting for volunteer assignment
        })

      if (deliveryError) {
        console.error('Error creating delivery record:', deliveryError)
        // Don't throw error here as the claim was successful
      }

      // NOTE: Auto-assignment of volunteers is DISABLED
      // Volunteers must always manually browse and accept tasks from the available-tasks page
      // This ensures volunteers have full control over which tasks they accept
      // No automatic assignment based on match score - volunteers decide themselves
    } else if (donation.delivery_mode === 'pickup') {
      // Create a pickup delivery record in deliveries table with delivery_mode='pickup'
      const recipient = await this.getProfile(claim.recipient_id)
      const deliveryAddress = recipient?.address 
        ? `${recipient.address}, ${recipient.city || ''}`.trim()
        : 'TBD'
      
      const { error: pickupDeliveryError } = await supabase
        .from('deliveries')
        .insert({
          claim_id: claim.id,
          volunteer_id: null, // Pickup donations don't have volunteers
          delivery_mode: 'pickup',
          status: 'pending', // Initial status for self-pickup
          pickup_address: donation.pickup_location || 'TBD',
          delivery_address: deliveryAddress,
          pickup_city: donation.pickup_location?.split(',')?.pop()?.trim() || 'TBD',
          delivery_city: recipient?.city || 'TBD'
        })

      if (pickupDeliveryError) {
        console.error('Error creating pickup delivery record:', pickupDeliveryError)
        // Don't throw error here as the claim was successful
      }

      // Notify donor about the pickup arrangement
      await this.createNotification({
        user_id: donation.donor_id,
        type: 'system_alert',
        title: 'Pickup Scheduled',
        message: `A recipient has claimed your donation and will arrange pickup. Please coordinate the pickup time and location.`,
        data: {
          claim_id: claim.id,
          donation_id: donationId,
          pickup_location: donation.pickup_location,
          notification_type: 'pickup_scheduled'
        }
      })

      // Notify recipient with pickup instructions  
      await this.createNotification({
        user_id: recipientId,
        type: 'system_alert',
        title: 'Pickup Instructions',
        message: `Your donation claim has been approved! Please coordinate with the donor to arrange pickup.`,
        data: {
          claim_id: claim.id,
          donation_id: donationId,
          pickup_location: donation.pickup_location,
          pickup_instructions: donation.pickup_instructions,
          donor_id: donation.donor_id,
          notification_type: 'pickup_instructions'
        }
      })
    } else if (donation.delivery_mode === 'direct') {
      // Create a direct delivery record in deliveries table with delivery_mode='direct'
      const recipient = await this.getProfile(claim.recipient_id)
      const deliveryAddress = recipient?.address 
        ? `${recipient.address}, ${recipient.city || ''}`.trim()
        : 'TBD'
      
      const { error: directDeliveryError } = await supabase
        .from('deliveries')
        .insert({
          claim_id: claim.id,
          volunteer_id: null, // Direct deliveries don't have volunteers
          delivery_mode: 'direct',
          status: 'pending', // Use standard delivery status
          pickup_address: donation.pickup_location || 'TBD',
          delivery_address: deliveryAddress,
          pickup_city: donation.pickup_location?.split(',')?.pop()?.trim() || 'TBD',
          delivery_city: recipient?.city || 'TBD'
        })

      if (directDeliveryError) {
        console.error('Error creating direct delivery record:', directDeliveryError)
        // Don't throw error here as the claim was successful
      }

      // Notify donor about the direct delivery request
      await this.createNotification({
        user_id: donation.donor_id,
        type: 'system_alert',
        title: 'Direct Delivery Requested',
        message: `A recipient has claimed your donation and requested direct delivery. Please coordinate the delivery details.`,
        data: {
          claim_id: claim.id,
          donation_id: donationId,
          recipient_id: recipientId,
          notification_type: 'direct_delivery_request'
        }
      })

      // Notify recipient about coordination needed
      await this.createNotification({
        user_id: recipientId,
        type: 'system_alert',
        title: 'Delivery Coordination Needed',
        message: `Your direct delivery request has been approved! Please coordinate with the donor to arrange delivery details.`,
        data: {
          claim_id: claim.id,
          donation_id: donationId,
          donor_id: donation.donor_id,
          notification_type: 'direct_delivery_coordination'
        }
      })
    }

    return claim
  },

  // Auto-assign top volunteer with acceptance timeout and fallback
  async autoAssignTopVolunteerWithAcceptance(claimId, { timeoutMinutes = 30 } = {}) {
    if (!supabase) {
      throw new Error('Supabase not configured. Please set up your environment variables.')
    }

    // Find candidates using existing matcher
    const candidates = await this.findVolunteersForTask(claimId, 'claim', 3)
    if (!candidates || candidates.length === 0) {
      return { success: false, reason: 'no_candidates' }
    }

    const top = candidates[0]
    const expiresAt = new Date(Date.now() + timeoutMinutes * 60 * 1000).toISOString()

    // Mark claim as awaiting acceptance and tentatively assign volunteer
    const { data: updatedClaim, error: updErr } = await supabase
      .from('donation_claims')
      .update({
        tentative_volunteer_id: top.volunteer.id,
        status: 'awaiting_volunteer_acceptance',
        acceptance_expires_at: expiresAt
      })
      .eq('id', claimId)
      .select('id, donor_id, recipient_id')
      .single()

    if (updErr) throw updErr

    // Notify volunteer to accept
    await this.createNotification({
      user_id: top.volunteer.id,
      type: 'volunteer_assignment_request',
      title: 'New Delivery Opportunity',
      message: 'You have been auto-selected for a delivery. Please accept within the time limit to confirm.',
      data: {
        claim_id: claimId,
        expires_at: expiresAt
      }
    })

    // Notify donor and recipient of pending assignment
    try {
      await this.createNotification({
        user_id: updatedClaim.donor_id,
        type: 'volunteer_assignment_pending',
        title: 'Volunteer Assignment Pending',
        message: 'A volunteer has been selected and is confirming availability.',
        data: { claim_id: claimId }
      })
      await this.createNotification({
        user_id: updatedClaim.recipient_id,
        type: 'volunteer_assignment_pending',
        title: 'Volunteer Assignment Pending',
        message: 'A volunteer has been selected and is confirming availability.',
        data: { claim_id: claimId }
      })
    } catch (_) {}

    return { success: true, volunteerId: top.volunteer.id, expiresAt }
  },

  // Volunteer accepts assignment;
  // if expired, try next candidate
  async acceptVolunteerAssignment(claimId, volunteerId) {
    if (!supabase) {
      throw new Error('Supabase not configured. Please set up your environment variables.')
    }

    // Load claim and check tentative assignment
    const { data: claim, error: claimErr } = await supabase
      .from('donation_claims')
      .select('*')
      .eq('id', claimId)
      .single()

    if (claimErr) throw claimErr
    if (claim.tentative_volunteer_id !== volunteerId) {
      throw new Error('This assignment is not reserved for this volunteer')
    }
    if (claim.acceptance_expires_at && new Date(claim.acceptance_expires_at) < new Date()) {
      throw new Error('Assignment has expired')
    }

    // Persist actual assignment using existing helper
    const deliveryRecord = await this.assignVolunteerToDelivery(claimId, volunteerId)

    // Update claim status
    await supabase
      .from('donation_claims')
      .update({ status: 'assigned', tentative_volunteer_id: null, acceptance_expires_at: null })
      .eq('id', claimId)

    return { success: true, delivery: deliveryRecord }
  },

  // Admin setting to toggle auto-assign
  async setAutoAssignEnabled(enabled) {
    if (!supabase) {
      throw new Error('Supabase not configured. Please set up your environment variables.')
    }
    const { data, error } = await supabase
      .from('system_settings')
      .upsert({ id: 1, auto_assign_enabled: !!enabled, updated_at: new Date().toISOString() }, { onConflict: 'id' })
      .select('*')
      .single()
    if (error) throw error
    return data
  },

  async createDonationRequest(requestData) {
    if (!supabase) {
      throw new Error('Supabase not configured. Please set up your environment variables.')
    }

    // Validation: Check if verification is required (client-side safeguard)
    // Note: This should be enforced by RLS policies or database triggers for security
    try {
      const settings = await this.getSettings()
      const requireVerification = settings?.requireIdVerification !== false
      
      if (requireVerification && requestData.requester_id) {
        // Fetch user profile to check verification status
        const profile = await this.getProfile(requestData.requester_id)
        
        if (!profile) {
          throw new Error('User profile not found. Please complete your profile first.')
        }

        // Check if account is active
        if (profile.is_active === false || profile.is_active === 'false' || profile.is_active === 0) {
          throw new Error('Your account has been suspended. Please contact the administrator.')
        }

        // Check verification status
        const hasIdUploaded = profile.primary_id_type && profile.primary_id_number && profile.primary_id_image_url
        const isVerified = profile.id_verification_status === 'verified' || profile.is_verified === true
        
        if (!hasIdUploaded) {
          throw new Error('ID verification required. Please upload a valid ID document in your profile settings.')
        }
        
        if (!isVerified) {
          if (profile.id_verification_status === 'rejected') {
            throw new Error('Your ID verification was rejected. Please update your ID documents and try again.')
          } else {
            throw new Error('ID verification is pending admin approval. Please wait for verification to complete before creating requests.')
          }
        }
      }
    } catch (error) {
      // If it's a verification error, throw it
      if (error.message?.includes('verification') || error.message?.includes('suspended') || error.message?.includes('profile')) {
        throw error
      }
      // Otherwise, log and continue (don't block if settings check fails)
      console.warn('Verification check warning:', error.message)
    }

    const { data, error } = await supabase
      .from('donation_requests')
      .insert({
        ...requestData,
        status: 'open'
      })
      .select(`
        *,
        requester:users!donation_requests_requester_id_fkey(name, email, profile_image_url)
      `)
      .single()
    
    if (error) throw error

    // Notify all admins about new request
    try {
      const requesterName = data.requester?.name || 'A recipient'
      const urgencyEmoji = data.urgency === 'critical' ? '🚨' : data.urgency === 'high' ? '⚠️' : data.urgency === 'medium' ? '📋' : '📝'
      
      await this.notifyAllAdmins({
        type: 'system_alert',
        title: `${urgencyEmoji} New Donation Request`,
        message: `${requesterName} created a ${data.urgency} priority request for ${data.category}`,
        data: {
          request_id: data.id,
          requester_id: data.requester_id,
          requester_name: requesterName,
          title: data.title,
          category: data.category,
          urgency: data.urgency,
          quantity_needed: data.quantity_needed,
          link: '/admin/requests',
          notification_type: 'new_request'
        }
      })
    } catch (notifError) {
      console.error('Error notifying admins about new request:', notifError)
      // Don't throw - request was created successfully
    }

    return data
  },

  async getUserDonationRequests(userId) {
    if (!supabase) {
      throw new Error('Supabase not configured. Please set up your environment variables.')
    }

    const { data, error } = await supabase
      .from('donation_requests')
      .select('*')
      .eq('requester_id', userId)
      .order('created_at', { ascending: false })

    if (error) throw error
    
    // Return requests (claims are stored in donations table, not directly related to requests)
    return data || []
  },

  async updateDonationRequest(requestId, updates) {
    if (!supabase) {
      throw new Error('Supabase not configured. Please set up your environment variables.')
    }

    const { data, error } = await supabase
      .from('donation_requests')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', requestId)
      .select(`
        *,
        requester:users!donation_requests_requester_id_fkey(name, email, profile_image_url)
      `)
      .single()

    if (error) throw error
    return data
  },

  async deleteDonationRequest(requestId, userId) {
    if (!supabase) {
      throw new Error('Supabase not configured. Please set up your environment variables.')
    }

    // First check if the request belongs to the user and can be deleted
    const { data: request, error: checkError } = await supabase
      .from('donation_requests')
      .select('requester_id, status')
      .eq('id', requestId)
      .single()

    if (checkError) throw checkError

    if (request.requester_id !== userId) {
      throw new Error('You can only delete your own requests')
    }

    if (!['open', 'cancelled', 'expired'].includes(request.status)) {
      throw new Error('Cannot delete requests that are in progress or fulfilled')
    }

    const { error } = await supabase
      .from('donation_requests')
      .delete()
      .eq('id', requestId)
      .eq('requester_id', userId)

    if (error) throw error
    return true
  },

  // Events
  async getEvents(filters = {}) {
    if (!supabase) {
      throw new Error('Supabase not configured. Please set up your environment variables.')
    }

    // Apply limit for better performance - reduced default to 200 for faster loading
    const limit = filters.limit || 200 // Default reasonable limit

    let query = supabase
      .from('events')
      .select(`
        id,
        name,
        description,
        location,
        start_date,
        end_date,
        max_participants,
        target_goal,
        status,
        image_url,
        created_at,
        updated_at,
        created_by,
        creator:users!events_created_by_fkey(name, email),
        items,
        participants
      `)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (filters.status) {
      query = query.eq('status', filters.status)
    }

    const { data, error } = await query
    if (error) throw error
    return data
  },

  async getEvent(eventId) {
    if (!supabase) {
      throw new Error('Supabase not configured. Please set up your environment variables.')
    }

    const { data, error } = await supabase
      .from('events')
      .select(`
        *,
        creator:users!events_created_by_fkey(name, email, phone_number),
        items,
        participants
      `)
      .eq('id', eventId)
      .single()

    if (error) throw error
    return data
  },

  async createEvent(eventData, donationItems = []) {
    if (!supabase) {
      throw new Error('Supabase not configured. Please set up your environment variables.')
    }

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      throw new Error('User not authenticated')
    }

    // Create the event first (store donation items in JSONB 'items')
    const { data: event, error: eventError } = await supabase
      .from('events')
      .insert({
        ...eventData,
        items: donationItems && donationItems.length ? donationItems : null,
        created_by: user.id,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single()

    if (eventError) throw eventError

    // Return event with items
    const { data: fullEvent, error: fetchError } = await supabase
      .from('events')
      .select(`
        *,
        creator:users!events_created_by_fkey(name, email),
        items,
        participants
      `)
      .eq('id', event.id)
      .single()

    if (fetchError) throw fetchError

    // Notify all admins about new event (except the creator if they're an admin)
    const { data: creatorData } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single()

    // Only notify if creator is not an admin (to avoid self-notification)
    if (creatorData?.role !== 'admin') {
      await this.notifyAllAdmins({
        type: 'event_created',
        title: 'New Event Created',
        message: `A new event "${eventData.name}" has been created`,
        data: {
          event_id: event.id,
          event_name: eventData.name,
          creator_id: user.id,
          creator_name: creatorData?.name || 'Unknown'
        }
      })
    }

    return fullEvent
  },

  async updateEvent(eventId, eventData, donationItems = []) {
    if (!supabase) {
      throw new Error('Supabase not configured. Please set up your environment variables.')
    }

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      throw new Error('User not authenticated')
    }

    // Update the event (store donation items in JSONB 'items')
    const { data: event, error: eventError } = await supabase
      .from('events')
      .update({
        ...eventData,
        items: donationItems && donationItems.length ? donationItems : null,
        updated_at: new Date().toISOString()
      })
      .eq('id', eventId)
      .select()
      .single()

    if (eventError) throw eventError

    // Return updated event with items
    const { data: fullEvent, error: fetchError } = await supabase
      .from('events')
      .select(`
        *,
        creator:users!events_created_by_fkey(name, email),
        items,
        participants
      `)
      .eq('id', eventId)
      .single()

    if (fetchError) throw fetchError

    // Notify admins about event status changes (cancellation, etc.)
    if (eventData.status === 'cancelled' && event.status !== 'cancelled') {
      // Get user details
      const { data: updaterData } = await supabase
        .from('users')
        .select('name, role')
        .eq('id', user.id)
        .single()

      // Notify all admins about event cancellation (excluding the admin who cancelled it)
      await this.notifyAllAdmins({
        type: 'event_cancelled',
        title: 'Event Cancelled',
        message: `The event "${event.name}" has been cancelled${updaterData?.name ? ` by ${updaterData.name}` : ''}`,
        data: {
          event_id: eventId,
          event_name: event.name,
          cancelled_by: user.id,
          cancelled_by_name: updaterData?.name || 'Unknown'
        }
      }, user.id)
    }

    // Skipping previous per-item donation notifications logic since items are now JSONB

    return fullEvent
  },

  async deleteEvent(eventId) {
    if (!supabase) {
      throw new Error('Supabase not configured. Please set up your environment variables.')
    }

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      throw new Error('User not authenticated')
    }

    // Delete the event (participants/items are stored as JSONB within the event, so they'll be deleted automatically)
    const { error: eventError } = await supabase
      .from('events')
      .delete()
      .eq('id', eventId)

    if (eventError) throw eventError

    return true
  },

  async joinEvent(eventId, userId) {
    if (!supabase) {
      throw new Error('Supabase not configured. Please set up your environment variables.')
    }

    try {
      // Check if user is banned from events and get user details
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('id, event_banned, event_absence_count, name, email')
        .eq('id', userId)
        .single()

      if (userError) throw userError

      if (userData?.event_banned) {
        throw new Error('You are banned from joining events due to excessive absences. Please contact an administrator if you believe this is an error.')
      }

      // Get the event details
      const { data: newEvent, error: eventError} = await supabase
        .from('events')
        .select('id, name, start_date, end_date, max_participants, status, participants')
        .eq('id', eventId)
        .single()

      if (eventError) throw eventError
      if (!newEvent) {
        throw new Error('Event not found')
      }

      // Check if user is already a participant
      const participants = Array.isArray(newEvent.participants) ? newEvent.participants : []
      const existing = participants.find(p => p.user_id === userId)

      if (existing) {
        throw new Error('You are already registered for this event')
      }

      // Check if event is cancelled
      if (newEvent.status === 'cancelled') {
        throw new Error('Cannot join a cancelled event')
      }

      // Check if event is full
      const currentCount = participants.length
      if (newEvent.max_participants && currentCount >= newEvent.max_participants) {
        throw new Error('Event is full')
      }

      // Check for schedule conflicts with other events user is registered for
      const { data: allEvents, error: allEventsError } = await supabase
        .from('events')
        .select('id, name, start_date, end_date, status, participants')
        .neq('id', eventId)

      if (allEventsError) throw allEventsError

      // Filter to events where user is a participant
      const userParticipations = (allEvents || []).filter(event => {
        const parts = Array.isArray(event.participants) ? event.participants : []
        return parts.some(p => p.user_id === userId)
      })

      // Check for overlapping events
      if (userParticipations && userParticipations.length > 0) {
        const newEventStart = new Date(newEvent.start_date)
        const newEventEnd = new Date(newEvent.end_date)

        for (const existingEvent of userParticipations) {
          
          // Skip cancelled or completed events
          if (existingEvent.status === 'cancelled' || existingEvent.status === 'completed') {
            continue
          }

          const existingEventStart = new Date(existingEvent.start_date)
          const existingEventEnd = new Date(existingEvent.end_date)

          // Check if events overlap
          // Two events overlap if: newEventStart < existingEventEnd AND newEventEnd > existingEventStart
          if (newEventStart < existingEventEnd && newEventEnd > existingEventStart) {
            const existingEventName = existingEvent.name || 'another event'
            const existingStartTime = existingEventStart.toLocaleString('en-US', {
              month: 'short',
              day: 'numeric',
              hour: 'numeric',
              minute: '2-digit',
              hour12: true
            })
            const existingEndTime = existingEventEnd.toLocaleString('en-US', {
              month: 'short',
              day: 'numeric',
              hour: 'numeric',
              minute: '2-digit',
              hour12: true
            })
            
            throw new Error(
              `Schedule conflict! You are already registered for "${existingEventName}" ` +
              `(${existingStartTime} - ${existingEndTime}). ` +
              `Please cancel your registration for that event first if you want to join this one.`
            )
          }
        }
      }

      // Join the event by adding to participants JSONB array
      const newParticipant = {
        id: crypto.randomUUID(),
          user_id: userId,
        role: 'participant',
        registration_date: new Date().toISOString(),
        attendance_status: 'pending',
        attended: false,
        created_at: new Date().toISOString()
      }

      const updatedParticipants = [...participants, newParticipant]

      const { data, error } = await supabase
        .from('events')
        .update({ participants: updatedParticipants })
        .eq('id', eventId)
        .select('participants')
        .single()

      if (error) throw error

      // Notify all admins about new participant (userData already fetched above)
      try {
      await this.notifyAllAdmins({
          type: 'system_alert',
          title: '🎉 New Event Participant',
          message: `${userData?.name || 'A user'} joined "${newEvent.name}" (${currentCount + 1}/${newEvent.max_participants || '∞'} participants)`,
        data: {
          event_id: eventId,
          event_name: newEvent.name,
          user_id: userId,
          user_name: userData?.name || 'Unknown',
          participant_count: currentCount + 1,
            max_participants: newEvent.max_participants,
            link: '/admin/events',
            notification_type: 'event_participant_joined'
        }
      })
      } catch (notifError) {
        console.error('Error notifying admins about event participant:', notifError)
        // Don't throw - participant was added successfully
      }

      return data
    } catch (error) {
      console.error('Error joining event:', error)
      throw error
    }
  },

  async leaveEvent(eventId, userId) {
    if (!supabase) {
      throw new Error('Supabase not configured. Please set up your environment variables.')
    }

    try {
      // Get event and user details before deleting
      const { data: eventData } = await supabase
        .from('events')
        .select('id, name')
        .eq('id', eventId)
        .single()

      const { data: userData } = await supabase
        .from('users')
        .select('name, email')
        .eq('id', userId)
        .single()

      const { error } = await supabase
        .from('event_participants')
        .delete()
        .eq('event_id', eventId)
        .eq('user_id', userId)

      if (error) throw error

      // Notify all admins about participant cancellation
      if (eventData) {
        try {
        await this.notifyAllAdmins({
            type: 'system_alert',
            title: '❌ Event Participant Cancelled',
            message: `${userData?.name || 'A user'} cancelled registration for "${eventData.name}"`,
          data: {
            event_id: eventId,
            event_name: eventData.name,
            user_id: userId,
              user_name: userData?.name || 'Unknown',
              link: '/admin/events',
              notification_type: 'event_participant_left'
          }
        })
        } catch (notifError) {
          console.error('Error notifying admins about event cancellation:', notifError)
          // Don't throw - cancellation was successful
        }
      }

      return true
    } catch (error) {
      console.error('Error leaving event:', error)
      throw error
    }
  },

  async getEventParticipants(eventId) {
    if (!supabase) {
      throw new Error('Supabase not configured. Please set up your environment variables.')
    }

    try {
      // First, get event details to check if it has ended
      const { data: eventData, error: eventError } = await supabase
        .from('events')
        .select('id, start_date, end_date, status')
        .eq('id', eventId)
        .single()

      if (eventError) throw eventError

      // Auto-mark attendance if event has ended
      if (eventData && eventData.end_date) {
        const eventEndDate = new Date(eventData.end_date)
        const now = new Date()
        
        // If event has ended, automatically mark pending participants as absent
        if (eventEndDate < now && eventData.status !== 'cancelled') {
          try {
            // Get pending participants first
            const { data: pendingParticipants, error: pendingError } = await supabase
              .from('event_participants')
              .select('user_id')
              .eq('event_id', eventId)
              .eq('attendance_status', 'pending')

            if (pendingError) {
              console.error('Error fetching pending participants:', pendingError)
            } else if (pendingParticipants && pendingParticipants.length > 0) {
              // Update attendance status to absent
            const { error: autoMarkError } = await supabase
              .from('event_participants')
              .update({ attendance_status: 'absent' })
              .eq('event_id', eventId)
              .eq('attendance_status', 'pending')

            if (autoMarkError) {
              console.error('Error auto-marking attendance:', autoMarkError)
              } else {
                // Track absences for users who were auto-marked as absent
                const userIds = pendingParticipants.map(p => p.user_id)
                const { data: userData } = await supabase
                  .from('users')
                  .select('id, event_absence_count, event_banned, name')
                  .in('id', userIds)

                if (userData) {
                  const absenceUpdates = []
                  const banUpdates = []
                  const notificationsToSend = []

                  for (const user of userData) {
                    if (user.event_banned) continue // Skip if already banned

                    const previousCount = user.event_absence_count || 0
                    const absenceCount = previousCount + 1

                    absenceUpdates.push({ userId: user.id, absenceCount })

                    // Check for warnings (2-3 absences)
                    if (absenceCount >= 2 && absenceCount <= 3) {
                      notificationsToSend.push({
                        user_id: user.id,
                        type: 'system_alert',
                        title: 'Event Attendance Warning',
                        message: `You have ${absenceCount} absence${absenceCount > 1 ? 's' : ''} from events. Please attend the next event to avoid being banned. If you reach 5 absences, you will be permanently banned from joining events.`,
                        data: {
                          event_id: eventId,
                          event_name: eventData.name,
                          absence_count: absenceCount,
                          notification_type: 'event_absence_warning'
                        }
                      })
                    }

                    // Check for ban (5 absences)
                    if (absenceCount >= 5) {
                      banUpdates.push({ userId: user.id })
                      notificationsToSend.push({
                        user_id: user.id,
                        type: 'system_alert',
                        title: 'Banned from Events',
                        message: `You have been permanently banned from joining events due to ${absenceCount} absences. Please contact an administrator if you believe this is an error.`,
                        data: {
                          event_id: eventId,
                          event_name: eventData.name,
                          absence_count: absenceCount,
                          notification_type: 'event_ban'
                        }
                      })
                    }
                  }

                  // Update absence counts
                  if (absenceUpdates.length > 0) {
                    await Promise.all(
                      absenceUpdates.map(({ userId, absenceCount }) =>
                        supabase
                          .from('users')
                          .update({ event_absence_count: absenceCount })
                          .eq('id', userId)
                      )
                    )
                  }

                  // Update ban status
                  if (banUpdates.length > 0) {
                    await Promise.all(
                      banUpdates.map(({ userId }) =>
                        supabase
                          .from('users')
                          .update({
                            event_banned: true,
                            event_banned_at: new Date().toISOString(),
                            event_banned_by: null
                          })
                          .eq('id', userId)
                      )
                    )
                  }

                  // Send notifications
                  for (const notification of notificationsToSend) {
                    try {
                      await this.createNotification(notification)
                    } catch (notifError) {
                      console.error('Error sending auto-mark absence notification:', notifError)
                    }
                  }
                }
              }
            }
          } catch (autoMarkErr) {
            console.error('Error in auto-mark attendance:', autoMarkErr)
            // Continue to fetch participants even if auto-mark fails
          }
        }
      }

      // Fetch event with participants JSONB
      const { data: event, error } = await supabase
        .from('events')
        .select('id, participants')
        .eq('id', eventId)
        .single()

      if (error) throw error
      if (!event || !event.participants) return []

      // Extract participants from JSONB and fetch user data
      const participants = Array.isArray(event.participants) ? event.participants : []
      
      // Fetch user data for all participants
      const userIds = participants.map(p => p.user_id).filter(Boolean)
      if (userIds.length === 0) return []

      const { data: users, error: userError } = await supabase
        .from('users')
        .select('id, name, email, phone_number, role, event_absence_count, event_banned')
        .in('id', userIds)

      if (userError) throw userError

      // Map users to participants
      const usersMap = {}
      users?.forEach(u => { usersMap[u.id] = u })

      return participants.map(p => ({
        id: p.id,
        user_id: p.user_id,
        event_id: eventId,
        attendance_status: p.attendance_status || 'pending',
        joined_at: p.registration_date || p.created_at,
        user: usersMap[p.user_id] || null
      })).filter(p => p.user)
    } catch (error) {
      console.error('Error getting event participants:', error)
      throw error
    }
  },

  async updateAttendance(eventId, userId, attendanceStatus) {
    if (!supabase) {
      throw new Error('Supabase not configured. Please set up your environment variables.')
    }

    try {
      // Fetch current event with participants
      const { data: event, error: fetchError } = await supabase
        .from('events')
        .select('participants')
        .eq('id', eventId)
        .single()

      if (fetchError) throw fetchError

      const participants = Array.isArray(event.participants) ? event.participants : []
      
      // Find and update the specific participant
      const updatedParticipants = participants.map(p => {
        if (p.user_id === userId) {
          return { ...p, attendance_status: attendanceStatus }
        }
        return p
      })

      // Update the events table with modified participants
      const { data, error } = await supabase
        .from('events')
        .update({ participants: updatedParticipants })
        .eq('id', eventId)
        .select('participants')
        .single()

      if (error) throw error
      
      // Return the updated participant
      const updatedParticipant = updatedParticipants.find(p => p.user_id === userId)
      return updatedParticipant
    } catch (error) {
      console.error('Error updating attendance:', error)
      throw error
    }
  },

  async getUserCompletedEvents(userId) {
    if (!supabase) {
      throw new Error('Supabase not configured. Please set up your environment variables.')
    }

    try {
      // Fetch all events with participants
      const { data, error } = await supabase
        .from('events')
        .select(`
            id,
            name,
            description,
            location,
            start_date,
            end_date,
            status,
            target_goal,
          image_url,
          participants
        `)
        .order('start_date', { ascending: false })

      if (error) throw error

      // Filter events where user participated with 'present' status
      const now = new Date()
      const completedEvents = (data || []).filter(event => {
        if (!event.participants) return false
        
        const participants = Array.isArray(event.participants) ? event.participants : []
        const userParticipation = participants.find(p => p.user_id === userId)
        
        if (!userParticipation || userParticipation.attendance_status !== 'present') {
          return false
        }
        
        // Event must be finished (end_date in the past)
        const endDate = new Date(event.end_date)
        const isFinished = endDate < now
        
        // Event must not be cancelled
        const isNotCancelled = event.status !== 'cancelled'
        
        return isFinished && isNotCancelled
      }).map(event => ({
        id: event.id,
        attendance_status: 'present',
        joined_at: event.participants.find(p => p.user_id === userId)?.registration_date,
        event: {
          id: event.id,
          name: event.name,
          description: event.description,
          location: event.location,
          start_date: event.start_date,
          end_date: event.end_date,
          status: event.status,
          target_goal: event.target_goal,
          image_url: event.image_url
        }
      }))

      return completedEvents
    } catch (error) {
      console.error('Error getting user completed events:', error)
      throw error
    }
  },

  async bulkUpdateAttendance(eventId, attendanceUpdates, originalAttendance = {}) {
    if (!supabase) {
      throw new Error('Supabase not configured. Please set up your environment variables.')
    }

    try {
      // First, get current user absence counts and ban status
      const userIds = attendanceUpdates.map(u => u.user_id)
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('id, event_absence_count, event_banned, name')
        .in('id', userIds)

      if (userError) throw userError

      const userMap = new Map(userData.map(u => [u.id, u]))

      // Get event details for notifications
      const { data: eventData } = await supabase
        .from('events')
        .select('id, name')
        .eq('id', eventId)
        .single()

      // Process each attendance update
      const processedUpdates = []
      const absenceUpdates = []
      const banUpdates = []
      const notificationsToSend = []

      for (const update of attendanceUpdates) {
        const userId = String(update.user_id)
        const newStatus = String(update.attendance_status)
        const originalStatus = String(originalAttendance[userId] || 'pending')
        const user = userMap.get(userId)

        if (!user) {
          console.warn(`User ${userId} not found for absence tracking`)
          processedUpdates.push(update)
          continue
        }

        // Track absence changes
        let absenceCount = user.event_absence_count || 0
        let shouldUpdateAbsence = false
        let wasAbsent = originalStatus === 'absent'
        let isAbsent = newStatus === 'absent'

        // Only process if status actually changed
        if (originalStatus !== newStatus) {
          // If changing from non-absent to absent: increment
          if (!wasAbsent && isAbsent) {
            absenceCount = Math.max(0, absenceCount + 1)
            shouldUpdateAbsence = true
          }
          // If changing from absent to present: decrement (reset)
          else if (wasAbsent && newStatus === 'present') {
            absenceCount = Math.max(0, absenceCount - 1)
            shouldUpdateAbsence = true
          }
        }

        // Update absence count if needed
        if (shouldUpdateAbsence) {
          const previousCount = user.event_absence_count || 0
          
          absenceUpdates.push({
            userId,
            absenceCount,
            previousCount
          })

          // Check for warnings (2-3 absences) - send warning when marked absent and count is 2-3
          if (isAbsent && absenceCount >= 2 && absenceCount <= 3) {
            notificationsToSend.push({
              user_id: userId,
              type: 'system_alert',
              title: 'Event Attendance Warning',
              message: `You have ${absenceCount} absence${absenceCount > 1 ? 's' : ''} from events. Please attend the next event to avoid being banned. If you reach 5 absences, you will be permanently banned from joining events.`,
              data: {
                event_id: eventId,
                event_name: eventData?.name,
                absence_count: absenceCount,
                notification_type: 'event_absence_warning'
              }
            })
          }

          // Check for ban (5 absences)
          if (absenceCount >= 5 && !user.event_banned) {
            banUpdates.push({
              userId,
              absenceCount
            })

            notificationsToSend.push({
              user_id: userId,
              type: 'system_alert',
              title: 'Banned from Events',
              message: `You have been permanently banned from joining events due to ${absenceCount} absences. Please contact an administrator if you believe this is an error.`,
              data: {
                event_id: eventId,
                event_name: eventData?.name,
                absence_count: absenceCount,
                notification_type: 'event_ban'
              }
            })
          }
        }

        processedUpdates.push(update)
      }

      // Update attendance statuses
      const attendanceUpdatePromises = processedUpdates.map(update =>
        supabase
          .from('event_participants')
          .update({ attendance_status: update.attendance_status })
          .eq('event_id', eventId)
          .eq('user_id', update.user_id)
      )

      // Update absence counts
      const absenceUpdatePromises = absenceUpdates.map(({ userId, absenceCount }) =>
        supabase
          .from('users')
          .update({ event_absence_count: absenceCount })
          .eq('id', userId)
      )

      // Update ban status for users who reached 5 absences
      const banUpdatePromises = banUpdates.map(({ userId }) =>
        supabase
          .from('users')
          .update({
            event_banned: true,
            event_banned_at: new Date().toISOString(),
            event_banned_by: null // Auto-banned by system
          })
          .eq('id', userId)
      )

      // Execute all updates in parallel
      await Promise.all([
        ...attendanceUpdatePromises,
        ...absenceUpdatePromises,
        ...banUpdatePromises
      ])

      // Send notifications
      for (const notification of notificationsToSend) {
        try {
          await this.createNotification(notification)
        } catch (notifError) {
          console.error('Error sending absence notification:', notifError)
          // Continue with other notifications
        }
      }

      return {
        success: true,
        absenceUpdates: absenceUpdates.length,
        bansApplied: banUpdates.length,
        notificationsSent: notificationsToSend.length
      }
    } catch (error) {
      console.error('Error bulk updating attendance:', error)
      throw error
    }
  },

  // Deliveries
  async getDeliveries(filters = {}) {
    if (!supabase) {
      throw new Error('Supabase not configured. Please set up your environment variables.')
    }

    // Apply limit first for better performance - reduced default to 200 for faster loading
    const limit = filters.limit || 200 // Default reasonable limit

    let query = supabase
      .from('deliveries')
      .select(`*`)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (filters.volunteer_id) {
      query = query.eq('volunteer_id', filters.volunteer_id)
    }

    if (filters.status) {
      // Handle both single status and array of statuses
      if (Array.isArray(filters.status)) {
        query = query.in('status', filters.status)
      } else {
        query = query.eq('status', filters.status)
      }
    }

    const { data: deliveries, error } = await query
    if (error) throw error

    if (!deliveries || deliveries.length === 0) return []

    // Collect related ids
    const volunteerIds = Array.from(
      new Set(
        deliveries
          .map(d => d.volunteer_id)
          .filter(Boolean)
      )
    )
    const claimIds = Array.from(
      new Set(
        deliveries
          .map(d => d.claim_id)
          .filter(Boolean)
          .map(String)
      )
    )

    // Fetch volunteers (minimal fields)
    let volunteersMap = {}
    if (volunteerIds.length > 0) {
      const { data: volunteers } = await supabase
        .from('users')
        .select('id, name, email')
        .in('id', volunteerIds)
      volunteersMap = {}
      ;(volunteers || []).forEach(v => {
        volunteersMap[v.id] = v
      })
    }

    // Fetch donations with claims to resolve donation titles by claim_id
    // Fetch donations that contain the specific claim_ids we need
    let claimIdToDonation = {}
    let claimIdToClaimData = {}
    const recipientIds = new Set()
    const donorIds = new Set()
    
    if (claimIds.length > 0) {
      // Create a Set for faster lookup
      const claimIdsSet = new Set(claimIds.map(id => String(id)))
      
      // Fetch donations where claims is not null - we need to check all donations that might contain our claim_ids
      // Use a reasonable limit but prioritize finding the claims we need
      const { data: donationsWithClaims } = await supabase
        .from('donations')
        .select('id, title, description, category, quantity, condition, images, is_urgent, donation_destination, delivery_mode, pickup_location, donor_id, claims')
        .not('claims', 'is', null)
        .order('created_at', { ascending: false })
        .limit(500) // Increased limit to ensure we find all relevant donations

      if (donationsWithClaims) {
        donationsWithClaims.forEach(donation => {
          const claims = Array.isArray(donation.claims) ? donation.claims : []
          claims.forEach(claim => {
            if (claim && claim.id) {
              const claimIdStr = String(claim.id)
              if (claimIdsSet.has(claimIdStr)) {
                claimIdToDonation[claimIdStr] = {
                  donation_id: donation.id,
                  title: donation.title,
                  description: donation.description,
                  category: donation.category,
                  quantity: donation.quantity,
                  condition: donation.condition,
                  images: donation.images,
                  is_urgent: donation.is_urgent,
                  donation_destination: donation.donation_destination,
                  delivery_mode: donation.delivery_mode,
                  pickup_location: donation.pickup_location,
                  donor_id: donation.donor_id
                }
                claimIdToClaimData[claimIdStr] = claim
                if (claim.recipient_id) recipientIds.add(claim.recipient_id)
                if (donation.donor_id) donorIds.add(donation.donor_id)
              }
            }
          })
        })
      }
    }

    // Fetch recipients
    let recipientsMap = new Map()
    if (recipientIds.size > 0) {
      const recipientIdsArray = Array.from(recipientIds)
      let recipientsQuery = supabase
        .from('users')
        .select('id, name, email, phone_number, city, province, address, address_barangay, address_house, address_street, address_subdivision, address_landmark, latitude, longitude')
      
      if (recipientIdsArray.length === 1) {
        recipientsQuery = recipientsQuery.eq('id', recipientIdsArray[0])
      } else {
        recipientsQuery = recipientsQuery.in('id', recipientIdsArray)
      }
      
      const { data: recipients, error: recipientsError } = await recipientsQuery
      if (!recipientsError && recipients) {
        recipients.forEach(r => recipientsMap.set(r.id, r))
      }
    }

    // Fetch donors
    let donorsMap = new Map()
    if (donorIds.size > 0) {
      const donorIdsArray = Array.from(donorIds)
      let donorsQuery = supabase
        .from('users')
        .select('id, name, email, phone_number, city, province, address, address_barangay, address_house, address_street, address_subdivision, address_landmark, latitude, longitude, profile_image_url')
      
      if (donorIdsArray.length === 1) {
        donorsQuery = donorsQuery.eq('id', donorIdsArray[0])
      } else {
        donorsQuery = donorsQuery.in('id', donorIdsArray)
      }
      
      const { data: donors, error: donorsError } = await donorsQuery
      if (!donorsError && donors) {
        donors.forEach(d => donorsMap.set(d.id, d))
      }
    }

    // Enrich deliveries with proper claim and donation structure
    const enriched = deliveries.map(d => {
      const claimId = d.claim_id ? String(d.claim_id) : null
      const donationData = claimId ? claimIdToDonation[claimId] : null
      const claimData = claimId ? claimIdToClaimData[claimId] : null
      const recipient = claimData?.recipient_id ? recipientsMap.get(claimData.recipient_id) : null
      const donor = donationData?.donor_id ? donorsMap.get(donationData.donor_id) : null

      return {
        ...d,
        volunteer: d.volunteer_id ? volunteersMap[d.volunteer_id] || null : null,
        claim: claimData ? {
          ...claimData,
          donor: donor, // Add donor at claim level for easy access
          recipient: recipient,
          donation: donationData ? {
            ...donationData,
            donor: donor // Also keep donor in donation for consistency
          } : null
        } : null,
        // Keep backward compatibility
        donation_id: donationData?.donation_id || d.donation_id || null,
        donation_title: donationData?.title || d.donation_title || null,
      }
    })

    return enriched
  },

  async createDelivery(deliveryData) {
    if (!supabase) {
      throw new Error('Supabase not configured. Please set up your environment variables.')
    }

    const { data, error } = await supabase
      .from('deliveries')
      .insert({
        ...deliveryData,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single()
    
    if (error) throw error
    return data
  },

  async updateDelivery(deliveryId, updates) {
    if (!supabase) {
      throw new Error('Supabase not configured. Please set up your environment variables.')
    }

    // Update delivery without foreign key relationships (claims are JSONB)
    const { data: delivery, error } = await supabase
      .from('deliveries')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', deliveryId)
      .select(`
        *,
        volunteer:users!deliveries_volunteer_id_fkey(id, name)
      `)
      .single()
    
    if (error) throw error

    // Fetch claim from JSONB in donations table if claim_id exists
    if (delivery.claim_id) {
      const { data: donations, error: donationsError } = await supabase
        .from('donations')
        .select('id, title, category, claims')
        .not('claims', 'is', null)

      if (!donationsError && donations) {
        // Find the claim in the donations' JSONB claims arrays
        for (const d of donations) {
          if (Array.isArray(d.claims)) {
            const claim = d.claims.find(c => c && c.id === delivery.claim_id)
            if (claim) {
              // Add claim data to delivery object
              delivery.claim = {
                ...claim,
                donation_id: d.id,
                donation: {
                  id: d.id,
                  title: d.title,
                  category: d.category
                }
              }
              break
            }
          }
        }
      }
    }

    // Notify admins when delivery is completed or delivered
    if ((updates.status === 'completed' || updates.status === 'delivered') && delivery.volunteer) {
      try {
        const volunteerName = delivery.volunteer?.name || 'A volunteer'
        const donationTitle = delivery.claim?.donation?.title || 'a donation'
        
        await this.notifyAllAdmins({
          type: 'system_alert',
          title: '✅ Delivery Completed',
          message: `${volunteerName} completed delivery of "${donationTitle}"`,
          data: {
            delivery_id: deliveryId,
            volunteer_id: delivery.volunteer_id,
            volunteer_name: volunteerName,
            donation_title: donationTitle,
            status: updates.status,
            link: '/admin/volunteers',
            notification_type: 'delivery_completed'
          }
        })
      } catch (notifError) {
        console.error('Error notifying admins about delivery completion:', notifError)
        // Don't throw - delivery was updated successfully
      }
    }

    return delivery
  },

  // Volunteer-specific functions
  async getAvailableVolunteerTasks() {
    if (!supabase) {
      throw new Error('Supabase not configured. Please set up your environment variables.')
    }

    try {
      // Fetch donations with volunteer delivery mode that have claims - limit to 50 for performance
      // Only fetch necessary fields to reduce data transfer
      const { data: donationsWithClaims, error: donationsError } = await supabase
        .from('donations')
        .select('id, title, description, category, quantity, condition, status, delivery_mode, donation_destination, donor_id, pickup_location, pickup_instructions, is_urgent, images, expiry_date, claims, created_at')
        .eq('delivery_mode', 'volunteer')
        .eq('donation_destination', 'recipients')
        .not('claims', 'is', null)
        .eq('status', 'available')
        .order('created_at', { ascending: false })
        .limit(50)

      if (donationsError) throw donationsError

      // Fetch direct donations to CFC-GK (organization) with volunteer delivery mode
      // Only fetch necessary fields to reduce data transfer
      const { data: cfcgkDonations, error: cfcgkError } = await supabase
        .from('donations')
        .select('id, title, description, category, quantity, condition, status, delivery_mode, donation_destination, donor_id, pickup_location, pickup_instructions, is_urgent, images, expiry_date, created_at')
        .eq('delivery_mode', 'volunteer')
        .eq('donation_destination', 'organization')
        .eq('status', 'available')
        .order('created_at', { ascending: false })
        .limit(30)

      if (cfcgkError) {
        console.error('Error fetching CFC-GK donations:', cfcgkError)
        // Don't throw, just continue without CFC-GK donations
      }

      // Combine both types of donations
      const donations = [...(donationsWithClaims || []), ...(cfcgkDonations || [])]

      // Extract claims with status 'claimed' from JSONB array
      const availableClaims = []
      const donationMap = new Map()
      
      if (donations && donations.length > 0) {
        donations.forEach(donation => {
          donationMap.set(donation.id, donation)
          
          if (Array.isArray(donation.claims)) {
            donation.claims.forEach(claim => {
              if (claim.status === 'claimed') {
                availableClaims.push({
                  ...claim,
                  donation: donation
                })
              }
            })
          }
        })
      }

      // Get all claim IDs to check for existing deliveries
      const claimIds = availableClaims.map(c => c.id).filter(Boolean)
      let deliveriesMap = new Map()
      
      if (claimIds.length > 0) {
        // Optimize: Only fetch deliveries with volunteer assignments (volunteer_id IS NOT NULL)
        // This reduces the query result size significantly
        let deliveriesQuery = supabase
          .from('deliveries')
          .select('claim_id, volunteer_id')
          .not('volunteer_id', 'is', null) // Only get deliveries with volunteers assigned
        
        if (claimIds.length === 1) {
          deliveriesQuery = deliveriesQuery.eq('claim_id', claimIds[0])
        } else if (claimIds.length > 0) {
          deliveriesQuery = deliveriesQuery.in('claim_id', claimIds)
        }
        
        const { data: deliveries, error: deliveriesError } = await deliveriesQuery
        
        if (!deliveriesError && deliveries) {
          deliveries.forEach(delivery => {
            deliveriesMap.set(delivery.claim_id, true) // Just track if claim has volunteer
          })
        }
      }

      // Filter out claims that already have volunteer assignments
      const availableForDelivery = availableClaims.filter(claim => {
        return !deliveriesMap.has(claim.id) // If not in map, no volunteer assigned
      })

      // Handle CFC-GK direct donations (donations with donation_destination = 'organization')
      // Check for existing volunteer requests on CFC-GK donations
      const cfcgkDonationIds = (cfcgkDonations || []).map(d => d.id).filter(Boolean)
      let cfcgkVolunteerRequestsMap = new Map()
      
      if (cfcgkDonationIds.length > 0) {
        // Check for volunteer requests that might be associated with these donations
        // Since CFC-GK donations don't have claims, we need to check differently
        // For now, we'll check if there are any approved/pending volunteer requests
        // that might be for these donations (we'll filter by checking task IDs later)
        // Actually, since CFC-GK tasks use 'cfcgk-' prefix, we can check volunteer requests
        // by looking for requests without claim_id that might be for CFC-GK donations
        // For simplicity, we'll just show all available CFC-GK donations and let
        // the volunteer request system handle duplicates
      }

      // Filter CFC-GK donations that are available (status = 'available')
      // We'll show all available CFC-GK donations with volunteer delivery mode
      const availableCFCGKDonations = (cfcgkDonations || []).filter(donation => {
        return donation.status === 'available'
      })

      // Get unique donor and recipient IDs
      const donorIdsFromClaims = [...new Set(availableForDelivery.map(c => c.donation?.donor_id).filter(Boolean))]
      const donorIdsFromCFCGK = [...new Set(availableCFCGKDonations.map(d => d.donor_id).filter(Boolean))]
      const donorIds = [...new Set([...donorIdsFromClaims, ...donorIdsFromCFCGK])]
      const recipientIds = [...new Set(availableForDelivery.map(c => c.recipient_id).filter(Boolean))]

      // Fetch donors and recipients in parallel for better performance
      const [donorsResult, recipientsResult] = await Promise.all([
        donorIds.length > 0 ? (async () => {
          let donorsQuery = supabase
            .from('users')
            .select('id, name, email, phone_number, city, province, address, address_barangay, address_house, address_street, address_subdivision, address_landmark, latitude, longitude')
          
          if (donorIds.length === 1) {
            donorsQuery = donorsQuery.eq('id', donorIds[0])
          } else {
            donorsQuery = donorsQuery.in('id', donorIds)
          }
          
          const { data: donors, error: donorsError } = await donorsQuery
          return { donors, error: donorsError }
        })() : Promise.resolve({ donors: [], error: null }),
        
        recipientIds.length > 0 ? (async () => {
          let recipientsQuery = supabase
            .from('users')
            .select('id, name, phone_number, city, province, address, address_barangay, address_house, address_street, address_subdivision, address_landmark, latitude, longitude')
          
          if (recipientIds.length === 1) {
            recipientsQuery = recipientsQuery.eq('id', recipientIds[0])
          } else {
            recipientsQuery = recipientsQuery.in('id', recipientIds)
          }
          
          const { data: recipients, error: recipientsError } = await recipientsQuery
          return { recipients, error: recipientsError }
        })() : Promise.resolve({ recipients: [], error: null })
      ])
      
      // Build maps
      let donorsMap = new Map()
      if (donorsResult.donors) {
        donorsResult.donors.forEach(d => donorsMap.set(d.id, d))
      }
      
      let recipientsMap = new Map()
      if (recipientsResult.recipients) {
        recipientsResult.recipients.forEach(r => recipientsMap.set(r.id, r))
      }

      // Helper function to format address from user profile
      const formatAddressFromUser = (user) => {
        if (!user) return null;
        const locationParts = [];
        
        // Priority 1: House/Unit + Street
        if (user.address_house || user.address_street) {
          const houseStreet = [user.address_house, user.address_street]
            .filter(v => v && v.trim() && v.toLowerCase() !== 'n/a' && v.toLowerCase() !== 'tbd')
            .join(' ')
            .trim();
          if (houseStreet) {
            locationParts.push(houseStreet);
          }
        }
        
        // Priority 2: Barangay
        if (user.address_barangay && user.address_barangay.trim() && user.address_barangay.toLowerCase() !== 'n/a') {
          locationParts.push(user.address_barangay.trim());
        }
        
        // Priority 3: Subdivision
        if (user.address_subdivision && user.address_subdivision.trim() && user.address_subdivision.toLowerCase() !== 'n/a') {
          locationParts.push(user.address_subdivision.trim());
        }
        
        // Priority 4: Landmark (if no street address)
        if (user.address_landmark && !user.address_street && user.address_landmark.trim() && user.address_landmark.toLowerCase() !== 'n/a') {
          locationParts.push(`Near ${user.address_landmark.trim()}`);
        }
        
        // Priority 5: Full address (if no specific parts)
        if (user.address && !locationParts.length && user.address.trim() && user.address.toLowerCase() !== 'n/a' && !user.address.toLowerCase().includes('to be completed')) {
          locationParts.push(user.address.trim());
        }
        
        // Priority 6: City
        if (user.city && user.city.trim()) {
          locationParts.push(user.city.trim());
        }
        
        // Priority 7: Province
        if (user.province && user.province.trim()) {
          locationParts.push(user.province.trim());
        }
        
        return locationParts.length > 0 ? locationParts.join(', ') : null;
      };

      // Transform claimed donations into task format - these are approved donations needing volunteers
      const deliveryTasks = availableForDelivery
        .filter(claim => claim.donation && claim.donation.title) // Filter out claims with null donations
        .map(claim => {
          // Get donor and recipient from maps
          const donor = claim.donation?.donor_id ? donorsMap.get(claim.donation.donor_id) : null
          const recipient = claim.recipient_id ? recipientsMap.get(claim.recipient_id) : null
          
          // Format pickup location from donor (use donation.pickup_location if available, otherwise format from donor)
          const pickupLocation = claim.donation.pickup_location || formatAddressFromUser(donor) || 'Address TBD';
          
          // Format delivery location from recipient
          const deliveryLocation = formatAddressFromUser(recipient) || recipient?.city || 'Address TBD';
          
          return {
            id: `claim-${claim.id}`,
            type: 'approved_donation',
            title: claim.donation.title,
            description: claim.donation.description || 'No description available',
            category: claim.donation.category,
            // Assign diverse urgency levels based on donation urgency and claim ID for consistency
            // This creates more realistic urgency distribution for matching
            urgency: (() => {
              // Use claim ID as seed for deterministic but diverse urgency assignment
              const seed = claim.id ? claim.id.charCodeAt(0) + claim.id.charCodeAt(claim.id.length - 1) : Math.random() * 100
              const urgencyLevels = ['low', 'medium', 'high', 'critical']
              
              if (claim.donation.is_urgent) {
                // For urgent donations, assign 'high' or 'critical' based on seed
                return seed % 2 === 0 ? 'high' : 'critical'
              } else {
                // For non-urgent donations, assign 'low' or 'medium' based on seed
                return seed % 3 === 0 ? 'low' : 'medium'
              }
            })(),
            pickupLocation: pickupLocation,
            pickup_location: claim.donation.pickup_location || pickupLocation, // Ensure pickup_location is available for matching
            deliveryLocation: deliveryLocation,
            delivery_location: deliveryLocation, // Ensure delivery_location is available for matching
            donor: donor,
            recipient: recipient,
            donation: claim.donation, // Include full donation object with pickup_location
            originalId: claim.id,
            claimId: claim.id,
            createdAt: claim.claimed_at,
            isUrgent: claim.donation.is_urgent,
            quantity: claim.donation.quantity,
            condition: claim.donation.condition,
            expiryDate: claim.donation.expiry_date,
            pickup_instructions: claim.donation.pickup_instructions,
            imageUrl: claim.donation.images && claim.donation.images.length > 0 ? claim.donation.images[0] : null,
            // Include coordinates for accurate distance calculation
            pickup_latitude: donor?.latitude || null,
            pickup_longitude: donor?.longitude || null,
            delivery_latitude: recipient?.latitude || null,
            delivery_longitude: recipient?.longitude || null
          };
        })

      // Transform CFC-GK direct donations into task format
      const cfcgkTasks = availableCFCGKDonations
        .filter(donation => donation.title) // Filter out donations without titles
        .map(donation => {
          // Get donor from map
          const donor = donation.donor_id ? donorsMap.get(donation.donor_id) : null
          
          // Format pickup location from donor
          const pickupLocation = donation.pickup_location || formatAddressFromUser(donor) || 'Address TBD';
          
          // CFC-GK Mission Center delivery location
          const deliveryLocation = 'Pasil, Kauswagan, Kauswagan, Philippines';
          
          return {
            id: `cfcgk-${donation.id}`,
            type: 'approved_donation',
            title: donation.title,
            description: donation.description || 'No description available',
            category: donation.category,
            urgency: (() => {
              // Use donation ID as seed for deterministic but diverse urgency assignment
              const seed = donation.id ? donation.id.charCodeAt(0) + donation.id.charCodeAt(donation.id.length - 1) : Math.random() * 100
              
              if (donation.is_urgent) {
                return seed % 2 === 0 ? 'high' : 'critical'
              } else {
                return seed % 3 === 0 ? 'low' : 'medium'
              }
            })(),
            pickupLocation: pickupLocation,
            pickup_location: donation.pickup_location || pickupLocation,
            deliveryLocation: deliveryLocation,
            delivery_location: deliveryLocation,
            donor: donor,
            recipient: null, // No recipient for CFC-GK donations
            donation: donation,
            originalId: donation.id,
            claimId: null, // No claim for direct CFC-GK donations
            createdAt: donation.created_at,
            isUrgent: donation.is_urgent,
            quantity: donation.quantity,
            condition: donation.condition,
            expiryDate: donation.expiry_date,
            pickup_instructions: donation.pickup_instructions,
            imageUrl: donation.images && donation.images.length > 0 ? donation.images[0] : null,
            // Include coordinates for accurate distance calculation
            pickup_latitude: donor?.latitude || null,
            pickup_longitude: donor?.longitude || null,
            delivery_latitude: 8.4993342, // CFC-GK Mission Center approximate coordinates
            delivery_longitude: 124.6427564
          };
        })

      // Only show approved donations that have donors - don't show requests without matched donors
      // Requests without donors can't be delivered yet, so they shouldn't appear as volunteer tasks
      // Volunteers should only see tasks where there's actually a donation to deliver (approved donations)
      
      // Combine and sort by urgency and date (only approved donations with donors)
      const allTasks = [...deliveryTasks, ...cfcgkTasks]
      
      allTasks.sort((a, b) => {
        const urgencyOrder = { critical: 4, high: 3, medium: 2, low: 1 }
        if (urgencyOrder[a.urgency] !== urgencyOrder[b.urgency]) {
          return urgencyOrder[b.urgency] - urgencyOrder[a.urgency]
        }
        return new Date(b.createdAt) - new Date(a.createdAt)
      })

      return allTasks
    } catch (error) {
      console.error('Error fetching volunteer tasks:', error)
      throw error
    }
  },

  async assignVolunteerToDelivery(claimId, volunteerId) {
    if (!supabase) {
      throw new Error('Supabase not configured. Please set up your environment variables.')
    }

    // First check if delivery record exists for this claim
    const { data: existingDelivery, error: checkError } = await supabase
      .from('deliveries')
      .select('*')
      .eq('claim_id', claimId)
      .single()

    if (checkError && checkError.code !== 'PGRST116') { // PGRST116 means no rows found
      throw checkError
    }

    if (existingDelivery) {
      // Update existing delivery record
      const { data, error } = await supabase
        .from('deliveries')
        .update({
          volunteer_id: volunteerId,
          status: 'assigned'
        })
        .eq('id', existingDelivery.id)
        .select()
        .single()
      
      if (error) throw error
      
      // Update donation status to 'matched' when volunteer is assigned
      // Get the donation ID from the claim
      const { data: donations, error: donationLookupError } = await supabase
        .from('donations')
        .select('id, claims')
        .not('claims', 'is', null)
      
      if (!donationLookupError && donations) {
        for (const donation of donations) {
          if (Array.isArray(donation.claims)) {
            const claim = donation.claims.find(c => c && c.id === claimId)
            if (claim) {
              // Update donation status to 'matched' since volunteer is now assigned
              await supabase
                .from('donations')
                .update({ status: 'matched' })
                .eq('id', donation.id)
              break
            }
          }
        }
      }
      
      return data
    } else {
      // Create new delivery record
      // Get claim from JSONB in donations table
      const { data: donations, error: donationsError } = await supabase
        .from('donations')
        .select('id, claims, pickup_location, donor_id')
        .not('claims', 'is', null)

      if (donationsError) throw donationsError

      // Find the claim in the donations' JSONB claims arrays
      let claim = null
      let donation = null
      for (const d of donations || []) {
        if (Array.isArray(d.claims)) {
          claim = d.claims.find(c => c && c.id === claimId)
          if (claim) {
            donation = d
            break
          }
        }
      }

      if (!claim || !donation) {
        throw new Error(`Claim ${claimId} not found in any donation`)
      }

      // Get recipient address for delivery address
      const { data: recipient } = await supabase
        .from('users')
        .select('address, city')
        .eq('id', claim.recipient_id)
        .single()

      const pickupAddress = donation.pickup_location || 'TBD'
      const deliveryAddress = recipient?.address 
        ? `${recipient.address}, ${recipient.city || ''}`.trim()
        : 'TBD'
      const pickupCity = donation.pickup_location?.split(',')?.pop()?.trim() || 'TBD'
      const deliveryCity = recipient?.city || 'TBD'

      const { data, error } = await supabase
        .from('deliveries')
        .insert({
          claim_id: claimId,
          volunteer_id: volunteerId,
          pickup_address: pickupAddress,
          delivery_address: deliveryAddress,
          pickup_city: pickupCity,
          delivery_city: deliveryCity,
          status: 'assigned',
          delivery_mode: 'volunteer'
        })
        .select()
        .single()
      
      if (error) throw error
      
      // Update donation status to 'matched' when volunteer is assigned
      // This ensures the donation no longer appears in available-tasks
      await supabase
        .from('donations')
        .update({ status: 'matched' })
        .eq('id', donation.id)
      
      return data
    }
  },

  async getVolunteerStats(volunteerId) {
    if (!supabase) {
      throw new Error('Supabase not configured. Please set up your environment variables.')
    }

    // Get delivery statistics with pickup and delivery timestamps
    const { data: deliveries, error: deliveryError } = await supabase
      .from('deliveries')
      .select('status, created_at, picked_up_at, delivered_at')
      .eq('volunteer_id', volunteerId)

    if (deliveryError) throw deliveryError

    // Get volunteer ratings from feedback table (volunteer ratings are stored in feedback table)
    const { data: ratings, error: ratingError } = await supabase
      .from('feedback')
      .select('rating')
      .eq('user_id', volunteerId)
      .eq('feedback_type', 'volunteer')

    if (ratingError) {
      // If error, just log it and continue with empty ratings
      console.warn('Error fetching volunteer ratings from feedback table:', ratingError)
    }

    const totalDeliveries = deliveries.length
    const completedDeliveries = deliveries.filter(d => d.status === 'delivered').length
    const activeDeliveries = deliveries.filter(d => !['delivered', 'cancelled'].includes(d.status)).length
    const averageRating = ratings && ratings.length > 0 ? 
      ratings.reduce((sum, r) => sum + (r.rating || 0), 0) / ratings.length : 0

    // Calculate total volunteer hours (time between picked_up_at and delivered_at)
    let totalHours = 0
    const completedDeliveriesWithTimestamps = deliveries.filter(d => 
      d.status === 'delivered' && d.picked_up_at && d.delivered_at
    )
    
    completedDeliveriesWithTimestamps.forEach(delivery => {
      const pickupTime = new Date(delivery.picked_up_at)
      const deliveryTime = new Date(delivery.delivered_at)
      const hours = (deliveryTime - pickupTime) / (1000 * 60 * 60) // Convert milliseconds to hours
      if (hours > 0) {
        totalHours += hours
      }
    })

    return {
      totalDeliveries,
      completedDeliveries,
      activeDeliveries,
      averageRating: Number(averageRating.toFixed(1)),
      totalRatings: ratings?.length || 0,
      totalHours: Number(totalHours.toFixed(2)) // Total hours volunteered (rounded to 2 decimal places)
    }
  },

  async createVolunteerRating(ratingData) {
    if (!supabase) {
      throw new Error('Supabase not configured. Please set up your environment variables.')
    }

    // Convert volunteer_ratings format to feedback table format
    const feedbackData = {
      user_id: ratingData.volunteer_id,
      rating: ratingData.rating,
      feedback_type: 'volunteer',
      transaction_type: 'delivery',
      transaction_id: ratingData.delivery_id || ratingData.transaction_id,
      feedback_text: ratingData.comment || ratingData.feedback_text || null,
      created_at: new Date().toISOString()
    }

    const { data, error } = await supabase
      .from('feedback')
      .insert(feedbackData)
      .select()
      .single()
    
    if (error) throw error
    return data
  },

  async getVolunteerRatings(volunteerId) {
    if (!supabase) {
      throw new Error('Supabase not configured. Please set up your environment variables.')
    }

    // Get ratings from feedback table
    const { data: feedback, error: feedbackError } = await supabase
      .from('feedback')
      .select('*')
      .eq('user_id', volunteerId)
      .eq('feedback_type', 'volunteer')
      .order('created_at', { ascending: false })

    if (feedbackError) throw feedbackError

    // Transform feedback data to match expected volunteer_ratings format
    const ratings = (feedback || []).map(f => ({
      id: f.id,
      volunteer_id: f.user_id,
      rating: f.rating,
      comment: f.feedback_text,
      delivery_id: f.transaction_id,
      created_at: f.created_at,
      rater: null // Rater info not stored in feedback table structure
    }))

    return ratings
  },

  // Notifications
  async getAllAdminUsers() {
    if (!supabase) {
      throw new Error('Supabase not configured. Please set up your environment variables.')
    }

    try {
      const { data, error } = await supabase
        .from('users')
        .select('id, name, email')
        .eq('role', 'admin')
        .eq('is_active', true)
      
      if (error) throw error
      return data || []
    } catch (error) {
      console.error('Error fetching admin users:', error)
      return []
    }
  },

  async notifyAllAdmins(notificationData) {
    if (!supabase) {
      throw new Error('Supabase not configured. Please set up your environment variables.')
    }

    try {
      const admins = await this.getAllAdminUsers()
      
      if (admins.length === 0) {
        console.warn('No admin users found to notify')
        return []
      }

      const notifications = admins.map(admin => ({
        user_id: admin.id,
        type: notificationData.type || 'system_alert',
        title: notificationData.title,
        message: notificationData.message,
        data: notificationData.data || null,
        read_at: null
      }))

      const { data, error } = await supabase
        .from('notifications')
        .insert(notifications)
        .select()

      if (error) {
        console.error('Error creating admin notifications:', error)
        throw error
      }

      return data
    } catch (error) {
      console.error('Error notifying admins:', error)
      throw error
    }
  },

  async createNotification(notificationData) {
    if (!supabase) {
      throw new Error('Supabase not configured. Please set up your environment variables.')
    }

    try {
      // Ensure required fields are present
      if (!notificationData.user_id) {
        throw new Error('user_id is required for notification')
      }
      if (!notificationData.type) {
        throw new Error('type is required for notification')
      }
      if (!notificationData.title) {
        throw new Error('title is required for notification')
      }
      if (!notificationData.message) {
        throw new Error('message is required for notification')
      }

      // Prepare notification data with defaults
      // Remove created_at if provided since the database will handle it automatically
      const { created_at, ...restData } = notificationData
      
      const dataToInsert = {
        user_id: restData.user_id,
        type: restData.type,
        title: restData.title,
        message: restData.message,
        data: restData.data || null,
        read_at: null, // Ensure it starts as unread
        ...restData // Allow other fields to be passed (created_at will be auto-generated by DB)
      }
      
      // Only set created_at explicitly if it's provided and needed
      // Otherwise let the database handle it with DEFAULT now()
      if (created_at) {
        dataToInsert.created_at = created_at
      }

      const { data, error } = await supabase
        .from('notifications')
        .insert(dataToInsert)
        .select()
        .single()
      
      if (error) {
        console.error('Error inserting notification:', error)
        console.error('Notification data that failed:', dataToInsert)
        throw error
      }

      if (!data) {
        console.error('Notification insert returned no data')
        throw new Error('Failed to create notification: No data returned')
      }

      // Verify the notification was actually created by fetching it
      const { data: verifyData, error: verifyError } = await supabase
        .from('notifications')
        .select('*')
        .eq('id', data.id)
        .single()

      if (verifyError) {
        console.warn('Warning: Could not verify notification creation:', verifyError)
      } else if (!verifyData) {
        console.warn('Warning: Notification was created but could not be retrieved for verification')
      }

      return data
    } catch (error) {
      console.error('createNotification error:', error)
      throw error
    }
  },

  async getUserNotifications(userId, limit = 50) {
    if (!supabase) {
      throw new Error('Supabase not configured. Please set up your environment variables.')
    }

    try {
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit)

      if (error) {
        console.error('❌ Error fetching notifications:', error)
        throw error
      }
      
      return data || []
    } catch (error) {
      console.error('❌ Exception in getUserNotifications:', error)
      throw error
    }
  },

  async markNotificationAsRead(notificationId) {
    if (!supabase) {
      throw new Error('Supabase not configured. Please set up your environment variables.')
    }

    const { data, error } = await supabase
      .from('notifications')
      .update({ read_at: new Date().toISOString() })
      .eq('id', notificationId)
      .select()
      .single()
    
    if (error) throw error
    return data
  },

  // Realtime subscription to notifications for a user
  subscribeToUserNotifications(userId, onChange) {
    if (!supabase) {
      throw new Error('Supabase not configured. Please set up your environment variables.')
    }
    if (!userId) return null
    
    // Use a simpler channel name to avoid issues (not used currently, but kept for future real-time support)
    const channelName = `notif_${userId.replace(/-/g, '_')}`
    
    let channel = null
    let pollInterval = null
    let retryTimeout = null
    let isSubscribed = false
    let isActive = true // Flag to track if subscription is still active
    
    // Function to start polling (primary method since real-time isn't configured)
    const startPolling = () => {
      if (pollInterval || !isActive) {
        return // Already polling or subscription is inactive
      }
      
      
      // Poll function - just trigger onChange, Navbar will fetch notifications
      const pollNotifications = () => {
        // Check if subscription is still active before processing
        if (!isActive) {
          // Clear interval if subscription is inactive
          if (pollInterval) {
            clearInterval(pollInterval)
            pollInterval = null
          }
          return
        }
        
        try {
          // Trigger onChange callback - Navbar will fetch and update notifications
          onChange?.({ eventType: 'POLL', new: null })
        } catch (error) {
          console.error('Error in polling callback:', error)
        }
      }
      
      // Poll immediately to get latest notifications
      pollNotifications()
      
      // Then poll every 5 seconds for optimized real-time updates
      // 5 seconds provides good balance between responsiveness and performance
      pollInterval = setInterval(pollNotifications, 5000)
    }
    
    // Function to setup subscription (only attempt if real-time is properly configured)
    const setupSubscription = () => {
      // Skip real-time subscription if we've already determined it's not working
      // The error "mismatch between server and client bindings" indicates real-time replication
      // is not configured on the server side, so we'll just use polling
      isSubscribed = false
      startPolling()
      return
      
      /* 
      // Real-time subscription code (disabled due to server configuration issue)
      // Uncomment this if you enable real-time replication for the notifications table in Supabase
      try {
        // Clean up existing channel if any
        if (channel) {
          try {
            supabase.removeChannel(channel)
          } catch (e) {
            // Ignore cleanup errors
          }
        }
        
        channel = supabase
          .channel(channelName)
          .on(
            'postgres_changes',
            { 
              event: 'INSERT',
              schema: 'public', 
              table: 'notifications', 
              filter: `user_id=eq.${userId}` 
            },
            (payload) => {
              console.log('🔔 Real-time notification received:', payload)
              try { 
                onChange?.(payload) 
              } catch (error) {
                console.error('Error in notification subscription callback:', error)
              }
            }
          )
          .subscribe((status, err) => {
            if (status === 'SUBSCRIBED') {
              console.log(`✅ Successfully subscribed to notifications for user ${userId}`)
              isSubscribed = true
              if (pollInterval) {
                clearInterval(pollInterval)
                pollInterval = null
              }
            } else if (status === 'CHANNEL_ERROR') {
              console.warn(`⚠️ Real-time subscription error, using polling instead`)
              isSubscribed = false
              startPolling()
            }
          })
      } catch (error) {
        console.error('Error setting up notification subscription:', error)
        isSubscribed = false
        startPolling()
      }
      */
    }
    
    // Start with polling directly since real-time replication isn't configured
    // This ensures notifications are received reliably
    startPolling()

    return () => {
      try { 
        // Mark subscription as inactive FIRST to prevent new callbacks
        isActive = false
        
        // Clear polling interval to stop scheduled callbacks
        if (pollInterval) {
          clearInterval(pollInterval)
          pollInterval = null
        }
        
        // Clear timeouts
        if (retryTimeout) {
          clearTimeout(retryTimeout)
          retryTimeout = null
        }
        
        // Remove channel (if it was created)
        if (channel) {
          try {
            supabase.removeChannel(channel)
          } catch (e) {
            // Ignore cleanup errors
          }
          channel = null
        }
      } catch (error) {
        console.error('Error cleaning up notification subscription:', error)
        // Ensure polling is stopped even if cleanup fails
        isActive = false
        if (pollInterval) {
          clearInterval(pollInterval)
          pollInterval = null
        }
      }
    }
  },

  // User Reports Functions
  async getReportedUsers(status = 'pending') {
    if (!supabase) {
      throw new Error('Supabase not configured. Please set up your environment variables.')
    }

    try {
      // Reports are stored in user_profiles.reports (JSONB array)
      const { data: profiles, error } = await supabase
        .from('user_profiles')
        .select('user_id, reports')

      if (error) throw error
      if (!profiles || profiles.length === 0) return []

      // Flatten and attach holder user_id
      let reports = []
      profiles.forEach(p => {
        const arr = Array.isArray(p.reports) ? p.reports : []
        arr.forEach(r => {
          reports.push({ ...r, holder_user_id: p.user_id })
        })
      })

      // Filter by status if needed
      if (status !== 'all') {
        reports = reports.filter(r => r?.status === status)
      }

      // Sort by created_at desc
      reports.sort((a, b) => new Date(b?.created_at || 0) - new Date(a?.created_at || 0))
      if (reports.length === 0) return []

      // Fetch user details for all reports
      const userIds = new Set()
      reports.forEach(report => {
        userIds.add(report.reported_user_id)
        userIds.add(report.reported_by_user_id)
        if (report.reviewed_by) userIds.add(report.reviewed_by)
      })

      // Prepare valid UUID list only (avoid 'undefined' causing 22P02)
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
      const userIdList = Array.from(userIds).filter(
        id => typeof id === 'string' && uuidRegex.test(id)
      )

      const { data: users, error: usersError } = await supabase
        .from('users')
        .select('id, name, email, role, is_verified, is_active, created_at')
        .in('id', userIdList.length ? userIdList : ['00000000-0000-0000-0000-000000000000'])

      if (usersError) throw usersError

      // Map users by id for quick lookup
      const usersMap = new Map()
      users?.forEach(user => usersMap.set(user.id, user))

      // Enrich reports with user data
      const enrichedReports = reports.map(report => ({
        ...report,
        reported_user: usersMap.get(report.reported_user_id) || null,
        reported_by: usersMap.get(report.reported_by_user_id) || null,
        reviewed_by_user: report.reviewed_by ? usersMap.get(report.reviewed_by) || null : null
      }))

      return enrichedReports
    } catch (error) {
      console.error('Error fetching reported users:', error)
      throw error
    }
  },

  async getReportCount(status = 'pending') {
    if (!supabase) {
      throw new Error('Supabase not configured. Please set up your environment variables.')
    }

    try {
      // Reports are now stored in user_profiles.reports (JSONB array)
      // Fetch minimal data and count in app
      const { data, error } = await supabase
        .from('user_profiles')
        .select('reports')

      if (error) throw error
      const allReports = (data || [])
        .flatMap(p => Array.isArray(p.reports) ? p.reports : [])
      if (status === 'all') {
        return allReports.length
      }
      return allReports.filter(r => r?.status === status).length
    } catch (error) {
      console.error('Error fetching report count:', error)
      return 0
    }
  },

  async createUserReport(reportData) {
    if (!supabase) {
      throw new Error('Supabase not configured. Please set up your environment variables.')
    }

    try {
      // Append to user_profiles.reports JSONB of the reported user
      // 1) Fetch existing reports
      const { data: profile, error: fetchErr } = await supabase
        .from('user_profiles')
        .select('id, reports')
        .eq('user_id', reportData.reportedUserId)
        .single()

      if (fetchErr) throw fetchErr

      const newReport = {
        id: crypto.randomUUID ? crypto.randomUUID() : undefined,
          reported_user_id: reportData.reportedUserId,
          reported_by_user_id: reportData.reportedByUserId,
          reason: reportData.reason,
          description: reportData.description,
        status: 'pending',
        created_at: new Date().toISOString()
      }
      const updatedReports = [...(Array.isArray(profile?.reports) ? profile.reports : []), newReport]

      const { data, error } = await supabase
        .from('user_profiles')
        .update({ reports: updatedReports })
        .eq('id', profile.id)
        .select('reports')
        .single()

      if (error) throw error

      // Notify all admins about the new report
      try {
        const { data: reportedUser } = await supabase
          .from('users')
          .select('name, email, role')
          .eq('id', reportData.reportedUserId)
          .single()

        const { data: reporterUser } = await supabase
          .from('users')
          .select('name')
          .eq('id', reportData.reportedByUserId)
          .single()

        await this.notifyAllAdmins({
          type: 'system_alert',
          title: '🚨 New User Report',
          message: `${reporterUser?.name || 'A user'} reported ${reportedUser?.name || 'a user'} (${reportedUser?.role || 'unknown role'}) - ${reportData.reason}`,
          data: {
            report_id: data.id,
            reported_user_id: reportData.reportedUserId,
            reported_user_name: reportedUser?.name,
            reported_user_role: reportedUser?.role,
            reported_by_user_id: reportData.reportedByUserId,
            reported_by_name: reporterUser?.name,
            reason: reportData.reason,
            link: '/admin/users',
            notification_type: 'user_report'
          }
            })
      } catch (notifError) {
        console.error('Error notifying admins about user report:', notifError)
        // Don't throw - report was created successfully
      }

      return newReport
    } catch (error) {
      console.error('Error creating user report:', error)
      throw error
    }
  },

  async updateReportStatus(reportId, status, reviewedBy, resolutionNotes = null) {
    if (!supabase) {
      throw new Error('Supabase not configured. Please set up your environment variables.')
    }

    try {
      // Update specific report inside user_profiles.reports
      // 1) Find which profile holds this report
      const { data: profiles, error: fetchErr } = await supabase
        .from('user_profiles')
        .select('id, reports')
      if (fetchErr) throw fetchErr
      const holder = (profiles || []).find(p => (Array.isArray(p.reports) ? p.reports : []).some(r => r?.id === reportId))
      if (!holder) throw new Error('Report not found')
      const reports = Array.isArray(holder.reports) ? holder.reports : []
      const updated = reports.map(r => {
        if (r?.id === reportId) {
          return {
            ...r,
        status,
        reviewed_by: reviewedBy,
            resolution_notes: resolutionNotes || r.resolution_notes,
        reviewed_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }
        }
        return r
      })
      const { error: updErr } = await supabase
        .from('user_profiles')
        .update({ reports: updated })
        .eq('id', holder.id)
      if (updErr) throw updErr
      return updated.find(r => r?.id === reportId)
    } catch (error) {
      console.error('Error updating report status:', error)
      throw error
    }
  },

  async setRetentionDays(days) {
    if (!supabase) {
      throw new Error('Supabase not configured. Please set up your environment variables.')
    }
    const safeDays = Math.max(0, parseInt(days || 0, 10))
    const { data, error } = await supabase
      .from('system_settings')
      .upsert({ id: 1, expiry_retention_days: safeDays, updated_at: new Date().toISOString() }, { onConflict: 'id' })
      .select('*')
      .single()
    if (error) throw error
    return data
  },

  async getDonationExpiryStats() {
    if (!supabase) {
      throw new Error('Supabase not configured. Please set up your environment variables.')
    }
    
    try {
      // Count expired donations by status
      // Count archived donations by archived_at column (not status, since 'archived' is not in the enum)
      const [expiredResult, archivedResult] = await Promise.all([
        supabase
          .from('donations')
          .select('*', { count: 'exact', head: false })
          .eq('status', 'expired'),
        supabase
          .from('donations')
          .select('*', { count: 'exact', head: false })
          .not('archived_at', 'is', null) // Use archived_at column instead of status
      ])
      
      // Extract counts from results
      const expiredCount = expiredResult.error ? 0 : (expiredResult.count ?? 0)
      const archivedCount = archivedResult.error ? 0 : (archivedResult.count ?? 0)
      
      // Log errors for debugging but don't break the UI
      if (expiredResult.error) {
        console.warn('Error fetching expired donations count:', expiredResult.error)
      }
      if (archivedResult.error) {
        console.warn('Error fetching archived donations count:', archivedResult.error)
      }
      
      return {
        expiredCount,
        archivedCount
      }
    } catch (error) {
      console.error('Error in getDonationExpiryStats:', error)
      // Return zeros on error to prevent UI breaking
      return { expiredCount: 0, archivedCount: 0 }
    }
  },

  // Profile completion check
  async checkProfileCompletion(userId) {
    if (!supabase) {
      throw new Error('Supabase not configured. Please set up your environment variables.')
    }

    const { data, error } = await supabase
      .rpc('check_profile_completion', { user_uuid: userId })

    if (error) throw error
    return data
  },

  // Volunteer request confirmation functions
  async confirmVolunteerRequest(notificationId, volunteerId, claimId, approved = true) {
    if (!supabase) {
      throw new Error('Supabase not configured. Please set up your environment variables.')
    }

    try {
      if (approved) {
        // Assign volunteer to delivery
        const deliveryRecord = await this.assignVolunteerToDelivery(claimId, volunteerId)
        
        // Mark notification as read
        await this.markNotificationAsRead(notificationId)
        
        // Get claim details from JSONB in donations table
        const { data: donations, error: donationsError } = await supabase
          .from('donations')
          .select(`
            id,
            title,
            donor_id,
            claims,
            donor:users!donations_donor_id_fkey(id, name)
          `)
          .not('claims', 'is', null)

        if (donationsError) throw donationsError

        // Find the claim in the donations' JSONB claims arrays
        let claim = null
        let donation = null
        for (const d of donations || []) {
          if (Array.isArray(d.claims)) {
            claim = d.claims.find(c => c && c.id === claimId)
            if (claim) {
              donation = d
              break
            }
          }
        }

        if (claim && donation) {
          // Fetch recipient details
          const { data: recipient, error: recipientError } = await supabase
            .from('users')
            .select('id, name')
            .eq('id', claim.recipient_id)
            .single()

          // Structure claim object to match expected format
          const claimData = {
            ...claim,
            donation_id: donation.id,
            donation: {
              id: donation.id,
              title: donation.title,
              donor: donation.donor
            },
            recipient: recipient || { id: claim.recipient_id, name: 'Unknown' }
          }

          // Notify volunteer of confirmation
          await this.createNotification({
            user_id: volunteerId,
            type: 'delivery_assigned',
            title: 'Volunteer Request Approved',
            message: `Your volunteer request has been approved! You can now start the delivery process for: ${claimData.donation?.title}`,
            data: { delivery_id: deliveryRecord.id, claim_id: claimId }
          })

          // Notify other party (donor/recipient) about confirmation
          const otherPartyId = claimData.donation?.donor?.id === volunteerId ? claimData.recipient?.id : claimData.donation?.donor?.id
          if (otherPartyId) {
            await this.createNotification({
              user_id: otherPartyId,
              type: 'delivery_assigned',
              title: 'Volunteer Confirmed',
              message: `The volunteer request has been approved and delivery will proceed for: ${claimData.donation?.title}`,
              data: { delivery_id: deliveryRecord.id, claim_id: claimId }
            })
          }
        }

        return deliveryRecord
      } else {
        // Mark notification as read (declined)
        await this.markNotificationAsRead(notificationId)
        
        // Optionally notify volunteer of decline
        await this.createNotification({
          user_id: volunteerId,
          type: 'system_alert',
          title: 'Volunteer Request Declined',
          message: 'Your volunteer request was not approved. Please check other available opportunities.',
          data: { claim_id: claimId }
        })

        return null
      }
    } catch (error) {
      console.error('Error confirming volunteer request:', error)
      throw error
    }
  },

  // Volunteer request management
  async createVolunteerRequest(requestData) {
    if (!supabase) {
      throw new Error('Supabase not configured. Please set up your environment variables.')
    }

    try {
      // The constraint volunteer_requests_task_check likely requires:
      // - For 'approved_donation': claim_id must be set (not null)
      // - For 'request': request_id must be set (not null)
      // CFC-GK tasks don't have claims, so we need to handle them differently
      // For now, we'll skip creating the volunteer_request record for CFC-GK tasks
      // and handle notifications directly
      
      let volunteerRequest = null
      
      // For CFC-GK tasks (approved_donation without claim_id), handle notifications directly
      if (requestData.task_type === 'approved_donation' && !requestData.claim_id && !requestData.request_id && requestData.donation_id) {
        // CFC-GK direct donations - create notifications without volunteer_request record
        // This bypasses the constraint issue
        const { data: donation } = await supabase
          .from('donations')
          .select(`
            *,
            donor:users!donations_donor_id_fkey(id, name)
          `)
          .eq('id', requestData.donation_id)
          .single()

        if (donation && donation.donation_destination === 'organization') {
          // Create a temporary volunteer request object for state management
          volunteerRequest = {
            id: `temp-${Date.now()}`,
            volunteer_id: requestData.volunteer_id,
            claim_id: null,
            request_id: null,
            task_type: 'approved_donation',
            status: 'pending',
            created_at: new Date().toISOString()
          }
          
          // Notify donor for CFC-GK donation
          await this.createNotification({
            user_id: donation.donor.id,
            type: 'volunteer_request',
            title: 'Volunteer Request for CFC-GK Delivery',
            message: `${requestData.volunteer_name} is requesting to deliver your donation to CFC-GK: ${donation.title}. Please confirm if you approve this volunteer.`,
            data: { 
              volunteer_id: requestData.volunteer_id,
              volunteer_name: requestData.volunteer_name,
              volunteer_email: requestData.volunteer_email,
              volunteer_phone: requestData.volunteer_phone,
              donation_id: requestData.donation_id,
              task_type: 'approved_donation',
              volunteer_request_id: volunteerRequest.id,
              is_cfcgk: true
            }
          })
          
          // Also notify admins about volunteer request for CFC-GK donation
          await this.notifyAllAdmins({
            type: 'system_alert',
            title: '🚚 Volunteer Request for CFC-GK Delivery',
            message: `${requestData.volunteer_name} wants to deliver "${donation.title}" to CFC-GK Mission Center`,
            data: {
              donation_id: requestData.donation_id,
              volunteer_id: requestData.volunteer_id,
              volunteer_name: requestData.volunteer_name,
              volunteer_request_id: volunteerRequest.id,
              link: '/admin/cfc-donations',
              notification_type: 'cfcgk_volunteer_request'
            }
          })
          
          return volunteerRequest
        }
      }
      
      // For regular tasks, insert volunteer request record normally
      const { data: insertedRequest, error: requestError } = await supabase
        .from('volunteer_requests')
        .insert({
          volunteer_id: requestData.volunteer_id,
          claim_id: requestData.claim_id || null,
          request_id: requestData.request_id || null,
          task_type: requestData.task_type,
          status: 'pending',
          created_at: new Date().toISOString()
        })
        .select()
        .single()

      if (requestError) {
        // If it's a constraint violation, provide a more helpful error message
        if (requestError.code === '23514' && requestError.message?.includes('volunteer_requests_task_check')) {
          throw new Error('Invalid task configuration. For approved donations, a claim_id or request_id is required.')
        }
        throw requestError
      }
      
      volunteerRequest = insertedRequest

      // Create notifications for relevant parties
      if (requestData.task_type === 'approved_donation' && requestData.claim_id) {
        // Get claim details from JSONB in donations table
        const { data: donations, error: donationsError } = await supabase
          .from('donations')
          .select(`
            id,
            title,
            donor_id,
            claims,
            donor:users!donations_donor_id_fkey(id, name)
          `)
          .not('claims', 'is', null)

        if (donationsError) throw donationsError

        // Find the claim in the donations' JSONB claims arrays
        let claim = null
        let donation = null
        for (const d of donations || []) {
          if (Array.isArray(d.claims)) {
            claim = d.claims.find(c => c && c.id === requestData.claim_id)
            if (claim) {
              donation = d
              break
            }
          }
        }

        if (!claim || !donation) {
          throw new Error(`Claim ${requestData.claim_id} not found in any donation`)
        }

        if (claim && donation) {
          // Get donor ID - use donor relation if available, otherwise use donor_id directly
          const donorId = donation.donor?.id || donation.donor_id
          if (!donorId) {
            throw new Error('Donor ID not found for donation')
          }

          // Fetch recipient details
          const { data: recipient, error: recipientError } = await supabase
            .from('users')
            .select('id, name')
            .eq('id', claim.recipient_id)
            .single()

          // Structure claim object to match expected format
          const claimData = {
            ...claim,
            donation_id: donation.id,
            donation: {
              id: donation.id,
              title: donation.title,
              donor: donation.donor || { id: donorId, name: 'Unknown' }
            },
            recipient: recipient || { id: claim.recipient_id, name: 'Unknown' }
          }

          try {
            const donorNotification = await this.createNotification({
              user_id: donorId,
              type: 'volunteer_request',
              title: 'Volunteer Request',
              message: `${requestData.volunteer_name} is requesting to deliver your donation: ${donation.title}. Please confirm if you approve this volunteer.`,
              data: { 
                volunteer_id: requestData.volunteer_id,
                volunteer_name: requestData.volunteer_name,
                volunteer_email: requestData.volunteer_email,
                volunteer_phone: requestData.volunteer_phone,
                claim_id: requestData.claim_id,
                donation_id: donation.id,
                task_type: 'approved_donation',
                volunteer_request_id: volunteerRequest.id
              }
            })
          } catch (notifError) {
            console.error('❌ Error creating volunteer request notification for donor:', notifError)
            // Don't throw - we still want to continue with recipient notification
            // But log the error so we can debug
          }
          
          // Notify recipient
          await this.createNotification({
            user_id: claimData.recipient.id,
            type: 'volunteer_request',
            title: 'Volunteer Request',
            message: `${requestData.volunteer_name} is requesting to deliver your requested item: ${claimData.donation.title}. Please confirm if you approve this volunteer.`,
            data: { 
              volunteer_id: requestData.volunteer_id,
              volunteer_name: requestData.volunteer_name,
              volunteer_email: requestData.volunteer_email,
              volunteer_phone: requestData.volunteer_phone,
              claim_id: requestData.claim_id,
              donation_id: claimData.donation.id,
              task_type: 'approved_donation',
              volunteer_request_id: volunteerRequest.id
            }
          })
        }
      } else if (requestData.task_type === 'request' && requestData.request_id) {
        // Get request details for requester notification
        const { data: request } = await supabase
          .from('donation_requests')
          .select(`
            *,
            requester:users!donation_requests_requester_id_fkey(id, name)
          `)
          .eq('id', requestData.request_id)
          .single()

        if (request) {
          // Notify requester
          await this.createNotification({
            user_id: request.requester.id,
            type: 'volunteer_request',
            title: 'Volunteer Available',
            message: `${requestData.volunteer_name} is requesting to help with your request: ${request.title}. Please confirm if you would like this volunteer to assist.`,
            data: { 
              volunteer_id: requestData.volunteer_id,
              volunteer_name: requestData.volunteer_name,
              request_id: requestData.request_id,
              task_type: 'request',
              volunteer_request_id: volunteerRequest.id
            }
          })
        }
      }

      return volunteerRequest
    } catch (error) {
      console.error('Error creating volunteer request:', error)
      throw error
    }
  },

  async getVolunteerRequestStatus(volunteerId, taskId) {
    if (!supabase) {
      throw new Error('Supabase not configured. Please set up your environment variables.')
    }

    try {
      let query = supabase
        .from('volunteer_requests')
        .select('*')
        .eq('volunteer_id', volunteerId)

      // Check if it's a claim, request, or CFC-GK task
      if (taskId.startsWith('claim-')) {
        const claimId = taskId.replace('claim-', '')
        query = query.eq('claim_id', claimId)
      } else if (taskId.startsWith('request-')) {
        const requestId = taskId.replace('request-', '')
        query = query.eq('request_id', requestId)
      } else if (taskId.startsWith('cfcgk-')) {
        // For CFC-GK tasks, check by donation_id if available in volunteer_requests
        // Since CFC-GK donations don't have claims, we check for requests with null claim_id
        // and match by donation_id if the table supports it
        // For now, we'll check if there's a way to identify CFC-GK requests
        // This might need to be handled differently based on the schema
        const donationId = taskId.replace('cfcgk-', '')
        // Check if volunteer_requests has donation_id field or we need to join
        // For now, return null and let the UI handle it
        // TODO: Implement proper CFC-GK volunteer request checking
        return null
      }

      const { data, error } = await query.maybeSingle()
      
      if (error) {
        throw error
      }

      return data
    } catch (error) {
      console.error('Error getting volunteer request status:', error)
      return null
    }
  },

  async updateVolunteerRequestStatus(requestId, status, volunteerId = null) {
    if (!supabase) {
      throw new Error('Supabase not configured. Please set up your environment variables.')
    }

    const updates = { 
      status,
      updated_at: new Date().toISOString()
    }

    if (volunteerId && status === 'approved') {
      updates.approved_by = volunteerId
    }

    const { data, error } = await supabase
      .from('volunteer_requests')
      .update(updates)
      .eq('id', requestId)
      .select()
      .single()

    if (error) throw error
    return data
  },

  // Post-delivery completion workflow
  async createDeliveryConfirmationRequest(deliveryId, volunteerId) {
    if (!supabase) {
      throw new Error('Supabase not configured. Please set up your environment variables.')
    }

    try {
      // Get delivery details (claims are now stored as JSONB in donations table)
      const { data: delivery, error: deliveryError } = await supabase
        .from('deliveries')
        .select(`
          *,
          volunteer:users!deliveries_volunteer_id_fkey(id, name)
        `)
        .eq('id', deliveryId)
        .single()

      if (deliveryError) throw deliveryError

      if (!delivery) {
        throw new Error('Delivery not found')
      }

      if (!delivery.claim_id) {
        throw new Error('Delivery does not have a claim_id')
      }

      // Fetch donation that contains this claim in its JSONB claims array
      const { data: donations, error: donationsError } = await supabase
        .from('donations')
        .select(`
          id,
          title,
          donor_id,
          claims,
          donor:users!donations_donor_id_fkey(id, name)
        `)
        .not('claims', 'is', null)

      if (donationsError) throw donationsError

      // Find the claim in the donations' JSONB claims arrays
      let claim = null
      let donation = null
      for (const d of donations || []) {
        if (Array.isArray(d.claims)) {
          claim = d.claims.find(c => c && c.id === delivery.claim_id)
          if (claim) {
            donation = d
            break
          }
        }
      }

      if (!claim || !donation) {
        throw new Error(`Claim ${delivery.claim_id} not found in any donation`)
      }

      // Fetch recipient details
      const { data: recipient, error: recipientError } = await supabase
        .from('users')
        .select('id, name')
        .eq('id', claim.recipient_id)
        .single()

      if (recipientError) {
        console.warn('Could not fetch recipient:', recipientError)
      }

      // Structure the delivery object to match expected format
      delivery.claim = {
        ...claim,
        donation_id: donation.id,
        donation: {
          id: donation.id,
          title: donation.title,
          donor: donation.donor
        },
        recipient: recipient || { id: claim.recipient_id, name: 'Unknown' }
      }

      // AUTOMATICALLY UPDATE DONATION STATUS TO DELIVERED when volunteer marks as delivered
      
      // Update claim status in the JSONB claims array
      const updatedClaims = donation.claims.map(c => 
        c.id === delivery.claim_id 
          ? { ...c, status: 'delivered' }
          : c
      )
      
      const { error: claimUpdateError } = await supabase
        .from('donations')
        .update({ 
          claims: updatedClaims
        })
        .eq('id', donation.id)

      if (claimUpdateError) {
        console.error('❌ Error updating donation claim:', claimUpdateError)
        throw claimUpdateError
      }

      // Update donation status to delivered
      const donationId = delivery.claim.donation_id || delivery.claim.donation?.id
      
      if (!donationId) {
        console.error('❌ No donation ID found in delivery claim')
        throw new Error('Could not find donation ID to update')
      }
      
      const { error: donationUpdateError } = await supabase
        .from('donations')
        .update({ status: 'delivered' })
        .eq('id', donationId)

      if (donationUpdateError) {
        console.error('❌ Error updating donation:', donationUpdateError)
        throw donationUpdateError
      }

      // Create confirmation request notifications for both donor and recipient
      const confirmationMessage = `${delivery.volunteer.name} has delivered the items: "${delivery.claim.donation.title}". Please confirm receipt/delivery to complete the transaction.`

      // Notify donor for confirmation
      if (delivery.claim.donation.donor?.id) {
        await this.createNotification({
          user_id: delivery.claim.donation.donor.id,
          type: 'delivery_completed',
          title: 'Delivery Reported - Please Confirm',
          message: confirmationMessage,
          data: { 
            delivery_id: deliveryId,
            volunteer_id: volunteerId,
            volunteer_name: delivery.volunteer.name,
            role: 'donor',
            action_required: 'confirm_delivery'
          }
        })
      }

      // Notify recipient for confirmation
      if (delivery.claim.recipient?.id) {
        await this.createNotification({
          user_id: delivery.claim.recipient.id,
          type: 'delivery_completed',
          title: 'Delivery Reported - Please Confirm Receipt',
          message: confirmationMessage,
          data: { 
            delivery_id: deliveryId,
            volunteer_id: volunteerId,
            volunteer_name: delivery.volunteer.name,
            role: 'recipient',
            action_required: 'confirm_delivery'
          }
        })
      }

      return { success: true, message: 'Delivery reported. Awaiting confirmations from donor and recipient to complete transaction.' }
    } catch (error) {
      console.error('Error creating delivery confirmation request:', error)
      throw error
    }
  },

  async confirmDeliveryByUser(deliveryId, userId, userRole, confirmed = true, rating = null, feedback = '') {
    if (!supabase) {
      throw new Error('Supabase not configured. Please set up your environment variables.')
    }

    try {
      // Get current delivery details
      const { data: delivery, error: deliveryError } = await supabase
        .from('deliveries')
        .select(`
          *,
          claim:donation_claims(
            *,
            donation:donations(title, donor_id),
            recipient_id
          )
        `)
        .eq('id', deliveryId)
        .single()

      if (deliveryError) throw deliveryError

      // Since delivery_confirmations table doesn't exist yet, we'll just mark the notification as read
      // and send completion notifications directly without storing confirmations
      
      // Send completion notification to the user who confirmed
      await this.createNotification({
        user_id: userId,
        type: 'delivery_completed',
        title: 'Delivery Confirmation Received',
        message: `Thank you for confirming the delivery${confirmed ? '' : ' dispute'}${rating ? ` and rating ${rating} stars` : ''}. ${confirmed ? 'Your feedback helps maintain trust in our community!' : 'We will investigate this matter.'}`,
        data: { 
          delivery_id: deliveryId,
          claim_id: delivery.claim.id,
          confirmed: confirmed,
          rating: rating,
          feedback: feedback,
          user_role: userRole
        }
      })

      // Send final completion notifications to all parties since transaction is already marked complete
      await this.createNotification({
        user_id: delivery.claim.donation.donor_id,
        type: 'delivery_completed',
        title: 'Transaction Confirmed!',
        message: `The ${userRole} has confirmed ${confirmed ? 'successful delivery' : 'an issue with delivery'} for your donation "${delivery.claim.donation.title}". Thank you for your generosity!`,
        data: { 
          delivery_id: deliveryId,
          claim_id: delivery.claim.id,
          transaction_completed: true,
          confirmed_by: userRole
        }
      })

      await this.createNotification({
        user_id: delivery.claim.recipient_id,
        type: 'delivery_completed',
        title: 'Transaction Confirmed!',
        message: `The ${userRole} has confirmed ${confirmed ? 'successful delivery' : 'an issue with delivery'} for "${delivery.claim.donation.title}". Thank you for being part of our community!`,
        data: { 
          delivery_id: deliveryId,
          claim_id: delivery.claim.id,
          transaction_completed: true,
          confirmed_by: userRole
        }
      })

      // Get volunteer ID from delivery and notify them
      const { data: deliveryData } = await supabase
        .from('deliveries')
        .select('volunteer_id')
        .eq('id', deliveryId)
        .single()

      if (deliveryData?.volunteer_id) {
        await this.createNotification({
          user_id: deliveryData.volunteer_id,
          type: 'delivery_completed',
          title: 'Delivery Confirmation Received!',
          message: `The ${userRole} has confirmed ${confirmed ? 'successful delivery' : 'an issue with delivery'} for "${delivery.claim.donation.title}". Thank you for your volunteer service!`,
          data: { 
            delivery_id: deliveryId,
            claim_id: delivery.claim.id,
            transaction_completed: true,
            confirmed_by: userRole
          }
        })
      }

      // Mark confirmation request notifications as read
      // Get unread notifications for this user and type, then filter in JavaScript
      const { data: unreadNotifications } = await supabase
        .from('notifications')
        .select('id, data')
        .eq('user_id', userId)
        .eq('type', 'delivery_completed')
        .is('read_at', null)

      // Filter by delivery_id and action_required in JavaScript since JSON path queries can be problematic
      const targetNotifications = unreadNotifications?.filter(n => 
        n.data?.delivery_id === deliveryId && 
        n.data?.action_required === 'confirm_delivery'
      ) || []

      if (targetNotifications.length > 0) {
        await supabase
          .from('notifications')
          .update({ read_at: new Date().toISOString() })
          .in('id', targetNotifications.map(n => n.id))
      }

      return { 
        confirmation: {
          delivery_id: deliveryId,
          user_id: userId,
          user_role: userRole,
          confirmed: confirmed,
          rating: rating,
          feedback: feedback
        }, 
        transactionCompleted: true, // Since transaction is already marked complete
        message: confirmed ? 'Delivery confirmed successfully' : 'Delivery issue reported successfully'
      }
    } catch (error) {
      console.error('Error confirming delivery:', error)
      throw error
    }
  },

  // New function for recipient to confirm receipt
  async confirmReceipt(deliveryId, recipientId, confirmed = true, rating = null, feedback = '') {
    if (!supabase) {
      throw new Error('Supabase not configured. Please set up your environment variables.')
    }

    try {
      // Get current delivery details (without foreign key relationships since claims are JSONB)
      const { data: delivery, error: deliveryError } = await supabase
        .from('deliveries')
        .select('*')
        .eq('id', deliveryId)
        .single()

      if (deliveryError) throw deliveryError

      // Get claim from JSONB in donations table
      if (!delivery.claim_id) {
        throw new Error('Delivery does not have a claim_id')
      }

      const { data: donations, error: donationsError } = await supabase
        .from('donations')
        .select('id, title, donor_id, claims')
        .not('claims', 'is', null)

      if (donationsError) throw donationsError

      // Find the claim in the donations' JSONB claims arrays
      let claim = null
      let donation = null
      for (const d of donations || []) {
        if (Array.isArray(d.claims)) {
          claim = d.claims.find(c => c && c.id === delivery.claim_id)
          if (claim) {
            donation = d
            break
          }
        }
      }

      if (!claim || !donation) {
        throw new Error(`Claim ${delivery.claim_id} not found in any donation`)
      }

      // Structure claim object to match expected format
      const claimData = {
        ...claim,
        donation_id: donation.id,
        donation: {
          id: donation.id,
          title: donation.title,
          donor_id: donation.donor_id
        }
      }

      // Attach claim data to delivery object for consistency
      delivery.claim = claimData

      // Send notification to recipient confirming their action
      await this.createNotification({
        user_id: recipientId,
        type: 'delivery_completed',
        title: 'Receipt Confirmed',
        message: `Thank you for confirming receipt of "${claimData.donation.title}". Waiting for donor confirmation to complete the transaction.`,
        data: { 
          delivery_id: deliveryId,
          claim_id: claimData.id,
          confirmed: confirmed,
          rating: rating,
          feedback: feedback,
          user_role: 'recipient',
          recipient_confirmed: true
        }
      })

      // Notify donor that recipient has confirmed and ask for final confirmation
      await this.createNotification({
        user_id: claimData.donation.donor_id,
        type: 'delivery_completed',
        title: 'Recipient Confirmed Receipt - Please Complete',
        message: `The recipient has confirmed receiving "${claimData.donation.title}". Please mark this donation as complete to finalize the transaction.`,
        data: { 
          delivery_id: deliveryId,
          claim_id: claimData.id,
          recipient_confirmed: true,
          action_required: 'donor_final_confirmation'
        }
      })

      // Rating reminders removed - rating functionality has been removed from the system

      // Mark recipient confirmation notifications as read
      const { data: unreadNotifications } = await supabase
        .from('notifications')
        .select('id, data')
        .eq('user_id', recipientId)
        .eq('type', 'delivery_completed')
        .is('read_at', null)

      const targetNotifications = unreadNotifications?.filter(n => 
        n.data?.delivery_id === deliveryId && 
        n.data?.action_required === 'confirm_delivery'
      ) || []

      if (targetNotifications.length > 0) {
        await supabase
          .from('notifications')
          .update({ read_at: new Date().toISOString() })
          .in('id', targetNotifications.map(n => n.id))
      }

      return { 
        success: true,
        message: 'Receipt confirmed successfully. Awaiting donor confirmation to complete transaction.'
      }
    } catch (error) {
      console.error('Error confirming receipt:', error)
      throw error
    }
  },

  // New function for donor to confirm and complete transaction
  async confirmDonorDelivery(deliveryId, donorId, confirmed = true, rating = null, feedback = '') {
    if (!supabase) {
      throw new Error('Supabase not configured. Please set up your environment variables.')
    }

    try {
      // Get current delivery details
      const { data: delivery, error: deliveryError } = await supabase
        .from('deliveries')
        .select(`
          *,
          claim:donation_claims(
            *,
            donation:donations(title, donor_id),
            recipient_id
          )
        `)
        .eq('id', deliveryId)
        .single()

      if (deliveryError) throw deliveryError

      // Update the claim to complete transaction
      const { error: updateError } = await supabase
        .from('donation_claims')
        .update({
          status: 'completed'
        })
        .eq('id', delivery.claim.id)

      if (updateError) throw updateError

      // Update donation status to completed
      const { error: donationUpdateError } = await supabase
        .from('donations')
        .update({ status: 'completed' })
        .eq('id', delivery.claim.donation.id)

      if (donationUpdateError) throw donationUpdateError

      // Send completion notifications to all parties
      await this.createNotification({
        user_id: donorId,
        type: 'delivery_completed',
        title: 'Transaction Completed!',
        message: `Thank you for confirming the delivery of "${delivery.claim.donation.title}". The transaction is now complete!`,
        data: { 
          delivery_id: deliveryId,
          claim_id: delivery.claim.id,
          transaction_completed: true,
          confirmed_by: 'donor',
          donor_confirmed: true,
          rating: rating,
          feedback: feedback
        }
      })

      await this.createNotification({
        user_id: delivery.claim.recipient_id,
        type: 'delivery_completed',
        title: 'Transaction Completed!',
        message: `The donation transaction for "${delivery.claim.donation.title}" is now complete. Thank you for being part of our community!`,
        data: { 
          delivery_id: deliveryId,
          claim_id: delivery.claim.id,
          transaction_completed: true,
          confirmed_by: 'donor'
        }
      })

      // Get volunteer ID and notify them
      const { data: deliveryData } = await supabase
        .from('deliveries')
        .select('volunteer_id')
        .eq('id', deliveryId)
        .single()

      if (deliveryData?.volunteer_id) {
        await this.createNotification({
          user_id: deliveryData.volunteer_id,
          type: 'delivery_completed',
          title: 'Transaction Completed!',
          message: `The delivery for "${delivery.claim.donation.title}" has been completed and confirmed by all parties. Thank you for your volunteer service!`,
          data: { 
            delivery_id: deliveryId,
            claim_id: delivery.claim.id,
            transaction_completed: true,
            confirmed_by: 'donor'
          }
        })
      }

      // Send immediate feedback prompt to recipient after transaction completion
      try {
        // Check if recipient has already provided feedback
        const { data: existingFeedback } = await supabase
          .from('feedback_ratings')
          .select('id')
          .eq('rater_id', delivery.claim.recipient_id)
          .or(`transaction_id.eq.${deliveryId},transaction_id.eq.${delivery.claim.donation.id}`)
          .limit(1)

        // Only send reminder if no feedback exists
        if (!existingFeedback || existingFeedback.length === 0) {
          await this.createNotification({
            user_id: delivery.claim.recipient_id,
            type: 'rating_reminder',
            title: 'Share Your Experience',
            message: `How was your experience with "${delivery.claim.donation.title}"? Your feedback helps improve our community!`,
            data: {
              delivery_id: deliveryId,
              claim_id: delivery.claim.id,
              donation_id: delivery.claim.donation.id,
              donation_title: delivery.claim.donation.title,
              donor_id: delivery.claim.donation.donor_id,
              volunteer_id: deliveryData?.volunteer_id,
              action_required: 'provide_feedback'
            }
          })
        }
      } catch (err) {
        console.error('Error sending feedback reminder:', err)
        // Don't throw - this is a background task
      }

      // Mark donor confirmation notifications as read
      const { data: unreadNotifications } = await supabase
        .from('notifications')
        .select('id, data')
        .eq('user_id', donorId)
        .eq('type', 'delivery_completed')
        .is('read_at', null)

      const targetNotifications = unreadNotifications?.filter(n => 
        n.data?.delivery_id === deliveryId && 
        (n.data?.action_required === 'confirm_delivery' || n.data?.action_required === 'donor_confirm_delivery')
      ) || []

      if (targetNotifications.length > 0) {
        await supabase
          .from('notifications')
          .update({ read_at: new Date().toISOString() })
          .in('id', targetNotifications.map(n => n.id))
      }

      return { 
        success: true,
        message: 'Transaction completed successfully!'
      }
    } catch (error) {
      console.error('Error confirming donor delivery:', error)
      throw error
    }
  },

  async completeTransaction(deliveryId, delivery) {
    if (!supabase) {
      throw new Error('Supabase not configured. Please set up your environment variables.')
    }

    try {
      // Update donation claim status to completed
      await supabase
        .from('donation_claims')
        .update({ 
          status: 'completed'
        })
        .eq('id', delivery.claim.id)

              // Update donation status to delivered  
        await supabase
        .from('donations')
        .update({ status: 'delivered' })
        .eq('id', delivery.claim.donation_id)

      // Send completion notifications
      await this.createNotification({
        user_id: delivery.claim.donation.donor_id,
        type: 'delivery_completed',
        title: 'Transaction Completed!',
        message: `Your donation "${delivery.claim.donation.title}" has been successfully delivered and confirmed by all parties. Thank you for your generosity!`,
        data: { 
          delivery_id: deliveryId,
          claim_id: delivery.claim.id,
          transaction_completed: true
        }
      })

      await this.createNotification({
        user_id: delivery.claim.recipient_id,
        type: 'delivery_completed',
        title: 'Transaction Completed!',
        message: `You have successfully received "${delivery.claim.donation.title}". Thank you for being part of our community!`,
        data: { 
          delivery_id: deliveryId,
          claim_id: delivery.claim.id,
          transaction_completed: true
        }
      })

      await this.createNotification({
        user_id: delivery.volunteer_id,
        type: 'delivery_completed',
        title: 'Delivery Completed Successfully!',
        message: `Thank you for completing the delivery of "${delivery.claim.donation.title}". Both parties have confirmed the successful delivery. You're making a real difference in our community!`,
        data: { 
          delivery_id: deliveryId,
          claim_id: delivery.claim.id,
          transaction_completed: true
        }
      })

      return { success: true, message: 'Transaction completed successfully' }
    } catch (error) {
      console.error('Error completing transaction:', error)
      throw error
    }
  },

  async getDeliveryConfirmations(deliveryId) {
    if (!supabase) {
      throw new Error('Supabase not configured. Please set up your environment variables.')
    }

    // Since delivery_confirmations table doesn't exist yet, return empty array
    // In future, this will query the actual confirmations table
    return []
  },

  // Admin-specific functions
  async getVolunteers(filters = {}) {
    if (!supabase) {
      throw new Error('Supabase not configured. Please set up your environment variables.')
    }

    // Apply limit first for better performance - reduced default to 200 for faster loading
    const limit = filters.limit || 200 // Default reasonable limit

    let query = supabase
      .from('users')
      .select('id, name, email, phone_number, city, province, role, is_active, is_verified, created_at, profile_image_url, latitude, longitude, address, preferred_delivery_types')
      .eq('role', 'volunteer')
      .order('created_at', { ascending: false })
      .limit(limit)

    if (filters.status) {
      query = query.eq('is_active', filters.status === 'active')
    }

    const { data, error } = await query
    if (error) throw error
    return data
  },

  async getAllUsers(filters = {}) {
    if (!supabase) {
      throw new Error('Supabase not configured. Please set up your environment variables.')
    }

    // Apply limit for better performance
    const limit = filters.limit || 500 // Reduced default limit

    // Select only essential fields to avoid fetching large image URLs and other heavy data
    const { data, error } = await supabase
      .from('users')
      .select(`
        id,
        name,
        email,
        phone_number,
        role,
        is_verified,
        is_active,
        created_at,
        city,
        province
      `)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (error) throw error
    return data
  },

  // Optimized count functions for statistics
  async getUserCounts() {
    if (!supabase) {
      throw new Error('Supabase not configured. Please set up your environment variables.')
    }

    try {
      // Get all counts in parallel for better performance
      // Use single column select with count for better compatibility
      const [totalUsers, verifiedUsers, donors, recipients, volunteers, activeVolunteers, verifiedDonors] = await Promise.all([
        supabase.from('users').select('id', { count: 'exact' }),
        supabase.from('users').select('id', { count: 'exact' }).eq('is_verified', true),
        supabase.from('users').select('id', { count: 'exact' }).eq('role', 'donor'),
        supabase.from('users').select('id', { count: 'exact' }).eq('role', 'recipient'),
        supabase.from('users').select('id', { count: 'exact' }).eq('role', 'volunteer'),
        supabase.from('users').select('id', { count: 'exact' }).eq('role', 'volunteer').eq('is_active', true),
        supabase.from('users').select('id', { count: 'exact' }).eq('role', 'donor').eq('is_verified', true)
      ])

      return {
        total: totalUsers.count || 0,
        verified: verifiedUsers.count || 0,
        donors: donors.count || 0,
        recipients: recipients.count || 0,
        volunteers: volunteers.count || 0,
        activeVolunteers: activeVolunteers.count || 0,
        verifiedDonors: verifiedDonors.count || 0,
        unverified: (totalUsers.count || 0) - (verifiedUsers.count || 0)
      }
    } catch (error) {
      console.error('Error getting user counts:', error)
      throw error
    }
  },

  async getDonationCounts() {
    if (!supabase) {
      throw new Error('Supabase not configured. Please set up your environment variables.')
    }

    try {
      // Fetch only status field with a reasonable limit to avoid timeouts
      // For very large datasets, this will give an approximation
      const { data: donations, error } = await supabase
        .from('donations')
        .select('status')
        .limit(2000) // Further reduced to avoid timeouts

      if (error) {
        console.error('Error fetching donations for count:', error)
        return {
          total: 0,
          available: 0,
          matched: 0,
          claimed: 0,
          delivered: 0,
          completed: 0,
          matchedOrClaimed: 0,
          deliveredOrCompleted: 0
        }
      }

      if (!donations || donations.length === 0) {
        return {
          total: 0,
          available: 0,
          matched: 0,
          claimed: 0,
          delivered: 0,
          completed: 0,
          matchedOrClaimed: 0,
          deliveredOrCompleted: 0
        }
      }

      // Count efficiently using reduce (single pass)
      const counts = donations.reduce((acc, d) => {
        acc.total++
        if (d.status) {
          acc[d.status] = (acc[d.status] || 0) + 1
        }
        return acc
      }, { total: 0, available: 0, matched: 0, claimed: 0, delivered: 0, completed: 0 })
      
      return {
        total: counts.total,
        available: counts.available || 0,
        matched: counts.matched || 0,
        claimed: counts.claimed || 0,
        delivered: counts.delivered || 0,
        completed: counts.completed || 0,
        matchedOrClaimed: (counts.matched || 0) + (counts.claimed || 0),
        deliveredOrCompleted: (counts.delivered || 0) + (counts.completed || 0)
      }
    } catch (error) {
      console.error('Error getting donation counts:', error)
      return {
        total: 0,
        available: 0,
        matched: 0,
        claimed: 0,
        delivered: 0,
        completed: 0,
        matchedOrClaimed: 0,
        deliveredOrCompleted: 0
      }
    }
  },

  async getRequestCounts() {
    if (!supabase) {
      throw new Error('Supabase not configured. Please set up your environment variables.')
    }

    try {
      // Fetch only status field for efficient counting
      const { data: requests, error } = await supabase
        .from('donation_requests')
        .select('status')
        .limit(2000) // Reasonable limit to avoid timeouts

      if (error) {
        console.error('Error fetching requests for count:', error)
        return {
          total: 0,
          open: 0,
          fulfilled: 0,
          cancelled: 0,
          expired: 0
        }
      }

      if (!requests || requests.length === 0) {
        return {
          total: 0,
          open: 0,
          fulfilled: 0,
          cancelled: 0,
          expired: 0
        }
      }

      // Count efficiently using reduce
      const counts = requests.reduce((acc, r) => {
        acc.total++
        if (r.status) {
          acc[r.status] = (acc[r.status] || 0) + 1
        }
        return acc
      }, { total: 0, open: 0, fulfilled: 0, cancelled: 0, expired: 0 })

      return {
        total: counts.total,
        open: counts.open || 0,
        fulfilled: counts.fulfilled || 0,
        cancelled: counts.cancelled || 0,
        expired: counts.expired || 0
      }
    } catch (error) {
      console.error('Error getting request counts:', error)
      return {
        total: 0,
        open: 0,
        fulfilled: 0,
        cancelled: 0,
        expired: 0
      }
    }
  },

  async getDeliveryCounts() {
    if (!supabase) {
      throw new Error('Supabase not configured. Please set up your environment variables.')
    }

    try {
      // Fetch all deliveries (volunteer and direct are now in the same table)
      const { data: allDeliveries, error: deliveriesError } = await supabase
        .from('deliveries')
        .select('status')
        .limit(2000)

      if (deliveriesError) {
        console.error('Error fetching deliveries for count:', deliveriesError)
      }

      if (allDeliveries.length === 0) {
        return {
          total: 0,
          pending: 0,
          inTransit: 0,
          delivered: 0,
          cancelled: 0
        }
      }

      // Count efficiently using reduce
      // Include all possible statuses: volunteer delivery statuses and direct delivery statuses
      const counts = allDeliveries.reduce((acc, d) => {
        acc.total++
        if (d.status) {
          acc[d.status] = (acc[d.status] || 0) + 1
        }
        return acc
      }, { 
        total: 0, 
        pending: 0, 
        assigned: 0,
        accepted: 0,
        picked_up: 0,
        in_transit: 0, 
        delivered: 0, 
        cancelled: 0,
        coordination_needed: 0,
        scheduled: 0,
        out_for_delivery: 0
      })

      // Combine in_transit status (includes in_transit and out_for_delivery)
      const inTransitCount = (counts.in_transit || 0) + (counts.out_for_delivery || 0)
      
      // Combine delivered status (includes delivered from both tables)
      const deliveredCount = counts.delivered || 0

      return {
        total: counts.total,
        pending: counts.pending || counts.coordination_needed || 0,
        inTransit: inTransitCount,
        delivered: deliveredCount,
        cancelled: counts.cancelled || 0
      }
    } catch (error) {
      console.error('Error getting delivery counts:', error)
      return {
        total: 0,
        pending: 0,
        inTransit: 0,
        delivered: 0,
        cancelled: 0
      }
    }
  },

  async getEventCounts() {
    if (!supabase) {
      throw new Error('Supabase not configured. Please set up your environment variables.')
    }

    try {
      // Fetch events with status, start_date, and end_date to calculate status if not set
      // Limit to recent 500 events for performance
      const { data: events, error } = await supabase
        .from('events')
        .select('status, start_date, end_date')
        .order('created_at', { ascending: false })
        .limit(500)

      if (error) {
        console.error('Error fetching events for count:', error)
        return {
          total: 0,
          active: 0,
          upcoming: 0,
          completed: 0,
          cancelled: 0
        }
      }

      if (!events || events.length === 0) {
        return {
          total: 0,
          active: 0,
          upcoming: 0,
          completed: 0,
          cancelled: 0
        }
      }

      const now = new Date()
      const counts = { total: 0, active: 0, upcoming: 0, completed: 0, cancelled: 0 }

      // Count events by status, calculating status from dates if not set
      events.forEach(event => {
        counts.total++
        
        // If event is cancelled, count it as cancelled
        if (event.status === 'cancelled') {
          counts.cancelled++
          return
        }

        // Calculate status based on dates if status is not set or if we need to override
        const startDate = event.start_date ? new Date(event.start_date) : null
        const endDate = event.end_date ? new Date(event.end_date) : null

        if (!startDate || !endDate) {
          // If dates are missing, use stored status or default to upcoming
          if (event.status === 'completed') {
            counts.completed++
          } else if (event.status === 'active') {
            counts.active++
          } else {
            counts.upcoming++
          }
          return
        }

        // Determine status based on dates (dates take precedence over stored status)
        if (endDate < now) {
          // Event has ended - count as completed
          counts.completed++
        } else if (startDate <= now && endDate >= now) {
          // Event is currently happening - count as active
          counts.active++
        } else if (startDate > now) {
          // Event is in the future - count as upcoming
          counts.upcoming++
        } else {
          // Fallback to stored status if date logic fails
          if (event.status === 'completed') {
            counts.completed++
          } else if (event.status === 'active') {
            counts.active++
          } else if (event.status === 'upcoming') {
            counts.upcoming++
          } else {
            // Default to upcoming for events without clear status
            counts.upcoming++
          }
        }
      })
      
      return {
        total: counts.total,
        active: counts.active,
        upcoming: counts.upcoming,
        completed: counts.completed,
        cancelled: counts.cancelled
      }
    } catch (error) {
      console.error('Error getting event counts:', error)
      return {
        total: 0,
        active: 0,
        upcoming: 0,
        completed: 0,
        cancelled: 0
      }
    }
  },

  // Event ban management
  async unbanUserFromEvents(userId, adminId) {
    if (!supabase) {
      throw new Error('Supabase not configured. Please set up your environment variables.')
    }

    try {
      // Get user data first
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('id, name, event_banned, event_absence_count')
        .eq('id', userId)
        .single()

      if (userError) throw userError
      if (!userData) {
        throw new Error('User not found')
      }

      if (!userData.event_banned) {
        throw new Error('User is not banned from events')
      }

      // Unban the user (but keep the absence count for record-keeping)
      const { data, error } = await supabase
        .from('users')
        .update({
          event_banned: false,
          event_banned_at: null,
          event_banned_by: null
        })
        .eq('id', userId)
        .select()
        .single()

      if (error) throw error

      // Notify the user
      await this.createNotification({
        user_id: userId,
        type: 'system_alert',
        title: 'Event Ban Removed',
        message: 'Your ban from joining events has been removed. You can now join events again.',
        data: {
          notification_type: 'event_unban',
          unbanned_by_admin: adminId
        }
      })

      return data
    } catch (error) {
      console.error('Error unbanning user from events:', error)
      throw error
    }
  },

  async banUserFromEvents(userId, adminId, reason = null) {
    if (!supabase) {
      throw new Error('Supabase not configured. Please set up your environment variables.')
    }

    try {
      // Get user data first
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('id, name, event_banned, event_absence_count')
        .eq('id', userId)
        .single()

      if (userError) throw userError
      if (!userData) {
        throw new Error('User not found')
      }

      // Ban the user
      const { data, error } = await supabase
        .from('users')
        .update({
          event_banned: true,
          event_banned_at: new Date().toISOString(),
          event_banned_by: adminId
        })
        .eq('id', userId)
        .select()
        .single()

      if (error) throw error

      // Notify the user
      await this.createNotification({
        user_id: userId,
        type: 'system_alert',
        title: 'Banned from Events',
        message: reason 
          ? `You have been banned from joining events. Reason: ${reason}`
          : 'You have been banned from joining events by an administrator. Please contact support if you believe this is an error.',
        data: {
          notification_type: 'event_ban',
          banned_by_admin: adminId,
          reason: reason
        }
      })

      return data
    } catch (error) {
      console.error('Error banning user from events:', error)
      throw error
    }
  },

  async resetUserAbsenceCount(userId, adminId) {
    if (!supabase) {
      throw new Error('Supabase not configured. Please set up your environment variables.')
    }

    try {
      // Reset absence count
      const { data, error } = await supabase
        .from('users')
        .update({
          event_absence_count: 0
        })
        .eq('id', userId)
        .select()
        .single()

      if (error) throw error

      // Notify the user
      await this.createNotification({
        user_id: userId,
        type: 'system_alert',
        title: 'Absence Count Reset',
        message: 'Your event absence count has been reset by an administrator.',
        data: {
          notification_type: 'absence_reset',
          reset_by_admin: adminId
        }
      })

      return data
    } catch (error) {
      console.error('Error resetting user absence count:', error)
      throw error
    }
  },

  async getBannedUsers() {
    if (!supabase) {
      throw new Error('Supabase not configured. Please set up your environment variables.')
    }

    try {
      const { data, error } = await supabase
        .from('users')
        .select(`
          id,
          name,
          email,
          event_banned,
          event_banned_at,
          event_absence_count,
          event_banned_by,
          banned_by_admin:users!users_event_banned_by_fkey(id, name)
        `)
        .eq('event_banned', true)
        .order('event_banned_at', { ascending: false })

      if (error) throw error
      return data || []
    } catch (error) {
      console.error('Error getting banned users:', error)
      throw error
    }
  },

  async getAdminUsers() {
    if (!supabase) {
      throw new Error('Supabase not configured. Please set up your environment variables.')
    }

    const { data, error } = await supabase
      .from('users')
      .select('id, is_active')
      .eq('role', 'admin')

    if (error) throw error

    // Treat null as active to avoid missing legacy admin accounts
    return (data || []).filter(admin => admin.is_active !== false)
  },

  async notifyAllAdmins(notificationData, excludeUserId = null) {
    try {
      const admins = await this.getAdminUsers()
      if (!admins || admins.length === 0) return

      let adminsToNotify = excludeUserId
        ? admins.filter(admin => admin.id !== excludeUserId)
        : admins

      // If we filtered everyone out (e.g., only one admin in the system), notify the excluded admin as well
      if (adminsToNotify.length === 0 && excludeUserId) {
        adminsToNotify = admins.filter(admin => admin.id === excludeUserId)
      }

      if (adminsToNotify.length === 0) return

      await Promise.all(
        adminsToNotify.map(admin =>
          this.createNotification({
            ...notificationData,
            user_id: admin.id,
            created_at: new Date().toISOString()
          }).catch(err => {
            console.error('Failed to create admin notification:', err)
            return null
          })
        )
      )
    } catch (error) {
      console.error('Error in notifyAllAdmins:', error)
      // Don't throw - notification failures shouldn't break the main operation
    }
  },

  // New function to handle pickup status updates
  async updatePickupStatus(claimId, userId, status, notes = '') {
    if (!supabase) {
      throw new Error('Supabase not configured. Please set up your environment variables.')
    }

    try {
      // Get pickup delivery and claim details from deliveries table
      const { data: pickupDelivery, error: pickupError } = await supabase
        .from('deliveries')
        .select(`
          *,
          claim:donation_claims!inner(
            id,
            recipient_id,
            donation:donations!inner(
              id,
              title,
              donor_id,
              claims
            )
          )
        `)
        .eq('claim_id', claimId)
        .eq('delivery_mode', 'pickup')
        .single()

      if (pickupError) throw pickupError

      // Get recipient and donor info
      const claim = pickupDelivery.claim
      const donation = claim.donation
      const recipientId = claim.recipient_id
      const donorId = donation.donor_id

      // Update delivery status (pickup deliveries are stored in deliveries table)
      const updateData = {
        status: status,
        updated_at: new Date().toISOString()
      }

      // Add status-specific timestamps
      if (status === 'accepted' || ['picked_up', 'in_transit', 'delivered'].includes(status)) {
        updateData.accepted_at = new Date().toISOString()
      }
      if (['picked_up', 'in_transit', 'delivered'].includes(status)) {
        updateData.picked_up_at = new Date().toISOString()
      }
      if (['in_transit', 'delivered'].includes(status)) {
        updateData.in_transit_at = new Date().toISOString()
      }
      if (status === 'delivered') {
        updateData.delivered_at = new Date().toISOString()
      }

      const { error: updateError } = await supabase
        .from('deliveries')
        .update(updateData)
        .eq('claim_id', claimId)
        .eq('delivery_mode', 'pickup')

      if (updateError) throw updateError

      // Handle status-specific logic
      let notificationTitle, notificationMessage

      switch (status) {
        case 'accepted':
          notificationTitle = 'Pickup Confirmed'
          notificationMessage = `Pickup has been confirmed. The recipient will collect the items soon.`
          break
        case 'delivered':
          notificationTitle = 'Pickup Completed'
          notificationMessage = `The donation "${donation.title}" has been successfully picked up!`
          
          // Update claim status in donations table JSONB
          if (donation.claims && Array.isArray(donation.claims)) {
            const updatedClaims = donation.claims.map(c => 
              c.id === claimId ? { ...c, status: 'delivered' } : c
            )
            await supabase
              .from('donations')
              .update({ claims: updatedClaims })
              .eq('id', donation.id)
          }

          // Update donation status to delivered
          await supabase
            .from('donations')
            .update({ status: 'delivered' })
            .eq('id', donation.id)

          // Create completion confirmation requests for both parties
          await this.createPickupCompletionRequest(claimId, userId)
          return { success: true, message: 'Pickup completed successfully!' }
          
        case 'cancelled':
          notificationTitle = 'Pickup Cancelled'
          notificationMessage = `The pickup for "${donation.title}" has been cancelled.`
          
          // Update claim status in donations table JSONB
          if (donation.claims && Array.isArray(donation.claims)) {
            const updatedClaims = donation.claims.map(c => 
              c.id === claimId ? { ...c, status: 'cancelled' } : c
            )
            await supabase
              .from('donations')
              .update({ claims: updatedClaims })
              .eq('id', donation.id)
          }

          // Update donation status back to available
          await supabase
            .from('donations')
            .update({ status: 'available' })
            .eq('id', donation.id)
          break
          
        default:
          notificationTitle = 'Pickup Status Updated'
          notificationMessage = `Pickup status updated to: ${status.replace('_', ' ')}`
      }

      // Send notifications to both parties (except for delivered, which is handled separately)
      if (status !== 'delivered') {
        // Notify donor
        await this.createNotification({
          user_id: donorId,
          type: 'system_alert',
          title: notificationTitle,
          message: notificationMessage,
          data: { 
            claim_id: claimId, 
            status: status, 
            notes: notes,
            notification_type: 'pickup_update'
          }
        })

        // Notify recipient
        await this.createNotification({
          user_id: recipientId,
          type: 'system_alert',
          title: notificationTitle,
          message: notificationMessage,
          data: { 
            claim_id: claimId, 
            status: status, 
            notes: notes,
            notification_type: 'pickup_update'
          }
        })
      }

      return { success: true, message: `Pickup status updated to ${status}` }
      
    } catch (error) {
      console.error('Error updating pickup status:', error)
      throw error
    }
  },

  // New function to create pickup completion confirmation requests
  async createPickupCompletionRequest(claimId, completedByUserId) {
    if (!supabase) {
      throw new Error('Supabase not configured. Please set up your environment variables.')
    }

    try {
      // Get pickup delivery and claim details from deliveries table
      const { data: pickupDelivery, error: pickupError } = await supabase
        .from('deliveries')
        .select(`
          *,
          claim:donation_claims!inner(
            id,
            recipient_id,
            donation:donations!inner(
              id,
              title,
              donor_id,
              donor:users!donations_donor_id_fkey(id, name)
            ),
            recipient:users!donation_claims_recipient_id_fkey(id, name)
          )
        `)
        .eq('claim_id', claimId)
        .eq('delivery_mode', 'pickup')
        .single()

      if (pickupError) throw pickupError

      const claim = pickupDelivery.claim
      const donation = claim.donation

      // Determine who completed the pickup
      const isCompletedByDonor = completedByUserId === donation.donor_id
      const isCompletedByRecipient = completedByUserId === claim.recipient_id
      
      const completedByName = isCompletedByDonor 
        ? donation.donor.name 
        : isCompletedByRecipient 
          ? claim.recipient.name 
          : 'Someone'

      const confirmationMessage = `${completedByName} has marked the pickup as completed for "${donation.title}". Please confirm to finalize the transaction.`

      // Notify donor for confirmation (if not the one who completed it)
      if (!isCompletedByDonor) {
        await this.createNotification({
          user_id: donation.donor_id,
          type: 'system_alert',
          title: 'Pickup Completed - Please Confirm',
          message: confirmationMessage,
          data: { 
            claim_id: claimId,
            completed_by: completedByUserId,
            completed_by_name: completedByName,
            role: 'donor',
            action_required: 'confirm_pickup',
            delivery_id: pickupDelivery.id,
            notification_type: 'pickup_completed'
          }
        })
      }

      // Notify recipient for confirmation (if not the one who completed it)
      if (!isCompletedByRecipient) {
        await this.createNotification({
          user_id: claim.recipient_id,
          type: 'system_alert',
          title: 'Pickup Completed - Please Confirm',
          message: confirmationMessage,
          data: { 
            claim_id: claimId,
            completed_by: completedByUserId,
            completed_by_name: completedByName,
            role: 'recipient',
            action_required: 'confirm_pickup',
            delivery_id: pickupDelivery.id,
            notification_type: 'pickup_completed'
          }
        })
      }

    } catch (error) {
      console.error('Error creating pickup completion request:', error)
      throw error
    }
  },

  // New function to confirm pickup completion
  async confirmPickupCompletion(claimId, userId, confirmed = true, rating = null, feedback = '') {
    if (!supabase) {
      throw new Error('Supabase not configured. Please set up your environment variables.')
    }

    try {
      // Get claim from JSONB in donations table first (delivery may not exist)
      const { data: donations, error: donationsError } = await supabase
        .from('donations')
        .select('id, title, donor_id, delivery_mode, claims')
        .not('claims', 'is', null)

      if (donationsError) throw donationsError

      // Find the claim in the donations' JSONB claims arrays
      let claim = null
      let donation = null
      for (const d of donations || []) {
        if (Array.isArray(d.claims)) {
          claim = d.claims.find(c => c && c.id === claimId)
          if (claim) {
            donation = d
            break
          }
        }
      }

      if (!claim || !donation) {
        throw new Error(`Claim ${claimId} not found in any donation`)
      }

      // Verify this is a pickup donation
      if (donation.delivery_mode !== 'pickup') {
        throw new Error('This donation is not a pickup donation')
      }

      // Try to get pickup delivery (optional - may not exist for all pickup donations)
      let pickupDelivery = null
      const { data: deliveryData, error: pickupError } = await supabase
        .from('deliveries')
        .select('*')
        .eq('claim_id', claimId)
        .eq('delivery_mode', 'pickup')
        .maybeSingle()

      if (!pickupError && deliveryData) {
        pickupDelivery = deliveryData
      }

      if (confirmed) {
        // Update claim status in donations table JSONB and donation status in a single update
        // Note: claim status can be 'completed', but donation status should be 'delivered' (valid enum value)
        if (donation.claims && Array.isArray(donation.claims)) {
          const updatedClaims = donation.claims.map(c => 
            c.id === claimId ? { ...c, status: 'completed' } : c
          )
          
          const { error: updateError } = await supabase
            .from('donations')
            .update({ 
              claims: updatedClaims,
              status: 'delivered'
            })
            .eq('id', donation.id)
          
          if (updateError) {
            console.error('Error updating donation:', updateError)
            throw updateError
          }
        } else {
          // If no claims array, just update status
          const { error: updateError } = await supabase
            .from('donations')
            .update({ status: 'delivered' })
            .eq('id', donation.id)
          
          if (updateError) {
            console.error('Error updating donation status:', updateError)
            throw updateError
          }
        }

        // Send completion notifications to both parties
        await this.createNotification({
          user_id: donation.donor_id,
          type: 'system_alert',
          title: 'Transaction Completed!',
          message: `The pickup for "${donation.title}" has been completed and confirmed by all parties. Thank you for your generosity!`,
          data: { 
            claim_id: claimId,
            transaction_completed: true,
            confirmed_by: userId,
            rating: rating,
            feedback: feedback,
            notification_type: 'pickup_completed'
          }
        })

        await this.createNotification({
          user_id: claim.recipient_id,
          type: 'system_alert',
          title: 'Transaction Completed!',
          message: `You have successfully received "${donation.title}". Thank you for being part of our community!`,
          data: { 
            claim_id: claimId,
            transaction_completed: true,
            confirmed_by: userId,
            notification_type: 'pickup_completed'
          }
        })
      }

      // Mark confirmation notifications as read
      // Query all system_alert notifications and filter in JavaScript (JSONB queries can be tricky)
      const { data: allNotifications, error: notificationsError } = await supabase
        .from('notifications')
        .select('id, data')
        .eq('user_id', userId)
        .eq('type', 'system_alert')
        .is('read_at', null)

      if (notificationsError) {
        console.warn('Error fetching notifications:', notificationsError)
      }

      // Filter notifications in JavaScript for more reliable JSONB filtering
      const targetNotifications = (allNotifications || []).filter(n => 
        n.data?.notification_type === 'pickup_completed' &&
        n.data?.claim_id === claimId && 
        n.data?.action_required === 'confirm_pickup'
      )

      if (targetNotifications.length > 0) {
        await supabase
          .from('notifications')
          .update({ read_at: new Date().toISOString() })
          .in('id', targetNotifications.map(n => n.id))
      }

      return { 
        success: true, 
        message: confirmed 
          ? 'Pickup confirmed successfully. Transaction completed!' 
          : 'Pickup completion disputed.'
      }
      
    } catch (error) {
      console.error('Error confirming pickup completion:', error)
      throw error
    }
  },

  // Direct Delivery Management Functions
  async updateDirectDeliveryStatus(claimId, userId, status, deliveryAddress = '', instructions = '', notes = '') {
    if (!supabase) {
      throw new Error('Supabase not configured. Please set up your environment variables.')
    }

    try {
      // Get direct delivery from deliveries table with delivery_mode='direct'
      const { data: directDelivery, error: directDeliveryError } = await supabase
        .from('deliveries')
        .select('*')
        .eq('claim_id', claimId)
        .eq('delivery_mode', 'direct')
        .single()

      if (directDeliveryError) throw directDeliveryError

      // Fetch donation with claim to get claim and donation info
      const { data: donations, error: donationsError } = await supabase
        .from('donations')
        .select('id, title, donor_id, claims')
        .not('claims', 'is', null)
        .limit(500)

      if (donationsError) throw donationsError

      // Find the claim in the donations' claims JSONB array
      let claimData = null
      let donationData = null
      if (donations) {
        for (const donation of donations) {
          if (Array.isArray(donation.claims)) {
            const claim = donation.claims.find(c => c && c.id === claimId)
            if (claim) {
              claimData = claim
              donationData = donation
              break
            }
          }
        }
      }

      // Fetch recipient if we have claim data
      let recipient = null
      if (claimData?.recipient_id) {
        const { data: recipientData, error: recipientError } = await supabase
          .from('users')
          .select('id, name')
          .eq('id', claimData.recipient_id)
          .single()
        if (!recipientError && recipientData) {
          recipient = recipientData
        }
      }

      // Update the direct delivery record
      const updateData = { 
        status,
        updated_at: new Date().toISOString()
      }

      if (deliveryAddress) updateData.delivery_address = deliveryAddress
      if (notes) updateData.volunteer_notes = notes // Use volunteer_notes field if available

      const { error: updateError } = await supabase
        .from('deliveries')
        .update(updateData)
        .eq('claim_id', claimId)
        .eq('delivery_mode', 'direct')

      if (updateError) throw updateError

      // Handle status-specific logic and notifications
      let notificationTitle, notificationMessage
      const donationTitle = donationData?.title || 'the donation'

      switch (status) {
        case 'scheduled':
          notificationTitle = 'Direct Delivery Scheduled'
          notificationMessage = `Direct delivery has been scheduled for "${donationTitle}". Delivery details have been confirmed.`
          break
        case 'accepted':
        case 'picked_up':
        case 'in_transit':
          notificationTitle = 'Out for Delivery'
          notificationMessage = `The donor is on their way to deliver "${donationTitle}"!`
          break
        case 'delivered':
          notificationTitle = 'Direct Delivery Completed'
          notificationMessage = `The donation "${donationTitle}" has been delivered!`
          
          // Update claim status in donations table JSONB
          if (donationData && claimData) {
            const updatedClaims = donationData.claims.map(c => 
              c.id === claimId ? { ...c, status: 'delivered' } : c
            )
            await supabase
              .from('donations')
              .update({ claims: updatedClaims })
              .eq('id', donationData.id)
          }

          // Create completion confirmation requests for both parties
          await this.createDirectDeliveryCompletionRequest(claimId, userId)
          return { success: true, message: 'Direct delivery completed successfully!' }
          
        case 'cancelled':
          notificationTitle = 'Direct Delivery Cancelled'
          notificationMessage = `The direct delivery for "${donationTitle}" has been cancelled.`
          
          // Update claim status in donations table JSONB
          if (donationData && claimData) {
            const updatedClaims = donationData.claims.map(c => 
              c.id === claimId ? { ...c, status: 'cancelled' } : c
            )
            await supabase
              .from('donations')
              .update({ claims: updatedClaims })
              .eq('id', donationData.id)
          }
          break
          
        default:
          notificationTitle = 'Direct Delivery Updated'
          notificationMessage = `Direct delivery status updated to: ${status.replace('_', ' ')}`
      }

      // Send notifications to both parties (except for delivered status which is handled above)
      if (status !== 'delivered' && recipient) {
        // Notify recipient
        await this.createNotification({
          user_id: recipient.id,
          type: 'system_alert',
          title: notificationTitle,
          message: notificationMessage,
          data: {
            claim_id: claimId,
            status: status,
            delivery_address: deliveryAddress,
            instructions: instructions,
            notification_type: 'direct_delivery_update'
          }
        })

        // Notify donor
        if (donationData?.donor_id) {
          await this.createNotification({
            user_id: donationData.donor_id,
            type: 'system_alert',
            title: notificationTitle,
            message: notificationMessage,
            data: {
              claim_id: claimId,
              status: status,
              delivery_address: deliveryAddress,
              instructions: instructions,
              notification_type: 'direct_delivery_update'
            }
          })
        }
      }

      return { success: true, message: 'Direct delivery status updated successfully!' }
    } catch (error) {
      console.error('Error updating direct delivery status:', error)
      throw error
    }
  },

  async createDirectDeliveryCompletionRequest(claimId, userId) {
    if (!supabase) {
      throw new Error('Supabase not configured. Please set up your environment variables.')
    }

    try {
      // Fetch donation with claim to get claim and donation info
      const { data: donations, error: donationsError } = await supabase
        .from('donations')
        .select('id, title, donor_id, claims')
        .not('claims', 'is', null)
        .limit(500)

      if (donationsError) throw donationsError

      // Find the claim in the donations' claims JSONB array
      let claimData = null
      let donationData = null
      if (donations) {
        for (const donation of donations) {
          if (Array.isArray(donation.claims)) {
            const claim = donation.claims.find(c => c && c.id === claimId)
            if (claim) {
              claimData = claim
              donationData = donation
              break
            }
          }
        }
      }

      if (!claimData || !donationData) {
        throw new Error('Claim or donation not found')
      }

      // Fetch recipient
      let recipient = null
      if (claimData.recipient_id) {
        const { data: recipientData, error: recipientError } = await supabase
          .from('users')
          .select('id, name')
          .eq('id', claimData.recipient_id)
          .single()
        if (!recipientError && recipientData) {
          recipient = recipientData
        }
      }

      // Create completion confirmation request for recipient
      if (recipient) {
        await this.createNotification({
          user_id: recipient.id,
          type: 'system_alert',
          title: 'Direct Delivery Completed - Please Confirm',
          message: `The donor has marked "${donationData.title}" as delivered. Please confirm receipt to complete the transaction.`,
          data: {
            claim_id: claimId,
            donor_id: donationData.donor_id,
            role: 'recipient',
            action_required: 'confirm_direct_delivery',
            notification_type: 'direct_delivery_completed'
          }
        })
      }

      // Create completion confirmation request for donor
      if (donationData.donor_id) {
        await this.createNotification({
          user_id: donationData.donor_id,
          type: 'system_alert',
          title: 'Direct Delivery Completed - Please Confirm',
          message: `You have marked "${donationData.title}" as delivered. Please confirm delivery completion.`,
          data: {
            claim_id: claimId,
            recipient_id: claimData.recipient_id,
            role: 'donor',
            action_required: 'confirm_direct_delivery',
            notification_type: 'direct_delivery_completed'
          }
        })
      }

      return { success: true }
    } catch (error) {
      console.error('Error creating direct delivery completion request:', error)
      throw error
    }
  },

  async confirmDirectDeliveryCompletion(claimId, userId, confirmed = true, rating = null, feedback = '') {
    if (!supabase) {
      throw new Error('Supabase not configured. Please set up your environment variables.')
    }

    try {
      // Get direct delivery from deliveries table
      const { data: directDelivery, error: directDeliveryError } = await supabase
        .from('deliveries')
        .select('*')
        .eq('claim_id', claimId)
        .eq('delivery_mode', 'direct')
        .single()

      if (directDeliveryError) throw directDeliveryError

      // Fetch donation with claim to get claim and donation info
      const { data: donations, error: donationsError } = await supabase
        .from('donations')
        .select('id, title, donor_id, claims')
        .not('claims', 'is', null)
        .limit(500)

      if (donationsError) throw donationsError

      // Find the claim in the donations' claims JSONB array
      let claimData = null
      let donationData = null
      if (donations) {
        for (const donation of donations) {
          if (Array.isArray(donation.claims)) {
            const claim = donation.claims.find(c => c && c.id === claimId)
            if (claim) {
              claimData = claim
              donationData = donation
              break
            }
          }
        }
      }

      if (!claimData || !donationData) {
        throw new Error('Claim or donation not found')
      }

      // Fetch recipient
      let recipient = null
      if (claimData.recipient_id) {
        const { data: recipientData, error: recipientError } = await supabase
          .from('users')
          .select('id, name')
          .eq('id', claimData.recipient_id)
          .single()
        if (!recipientError && recipientData) {
          recipient = recipientData
        }
      }

      const isDonor = userId === donationData.donor_id
      const isRecipient = userId === claimData.recipient_id

      // Check if both parties have already confirmed
      const { data: existingNotifications } = await supabase
        .from('notifications')
        .select('data')
        .eq('type', 'system_alert')
        .eq('data->notification_type', 'direct_delivery_completed')
        .eq('data->claim_id', claimId)
        .is('read_at', null)

      const donorConfirmed = existingNotifications?.some(n => 
        n.data?.role === 'donor' && n.data?.confirmed === true
      ) || false

      const recipientConfirmed = existingNotifications?.some(n => 
        n.data?.role === 'recipient' && n.data?.confirmed === true
      ) || false

      // Update confirmation status
      const userRole = isDonor ? 'donor' : 'recipient'
      const bothConfirmed = (isDonor && recipientConfirmed) || (isRecipient && donorConfirmed)

      if (bothConfirmed) {
        // Both parties have confirmed - complete the transaction
        // Update claim status in donations table JSONB
        if (donationData && claimData) {
          const updatedClaims = donationData.claims.map(c => 
            c.id === claimId ? { ...c, status: 'completed' } : c
          )
          await supabase
            .from('donations')
            .update({ claims: updatedClaims })
            .eq('id', donationData.id)
        }

        // Send completion notifications to both parties
        if (donationData.donor_id) {
          await this.createNotification({
            user_id: donationData.donor_id,
            type: 'system_alert',
            title: 'Direct Delivery Transaction Completed!',
            message: `The direct delivery transaction for "${donationData.title}" is now complete. Thank you for your generosity!`,
            data: {
              claim_id: claimId,
              transaction_completed: true,
              confirmed_by: userRole,
              rating: rating,
              feedback: feedback,
              notification_type: 'direct_delivery_completed'
            }
          })
        }

        if (recipient) {
          await this.createNotification({
            user_id: recipient.id,
            type: 'system_alert',
            title: 'Direct Delivery Transaction Completed!',
            message: `The direct delivery transaction for "${donationData.title}" is now complete. Thank you for being part of our community!`,
            data: {
              claim_id: claimId,
              transaction_completed: true,
            confirmed_by: userRole,
            notification_type: 'direct_delivery_completed'
          }
        })
      } else {
        // First confirmation - notify the other party
        const otherPartyId = isDonor ? directDelivery.claim.recipient.id : directDelivery.claim.donation.donor_id
        const otherPartyRole = isDonor ? 'recipient' : 'donor'

        await this.createNotification({
          user_id: userId,
          type: 'system_alert',
          title: 'Direct Delivery Confirmed',
          message: `Thank you for confirming ${isDonor ? 'delivery completion' : 'receipt'} of "${directDelivery.claim.donation.title}". Waiting for the ${otherPartyRole} to confirm.`,
          data: {
            claim_id: claimId,
            confirmed: confirmed,
            rating: rating,
            feedback: feedback,
            user_role: userRole,
            [`${userRole}_confirmed`]: true
          }
        })

        await this.createNotification({
          user_id: otherPartyId,
          type: 'system_alert',
          title: `${userRole === 'donor' ? 'Donor' : 'Recipient'} Confirmed - Please Complete`,
          message: `The ${userRole} has confirmed the direct delivery of "${directDelivery.claim.donation.title}". Please confirm to complete the transaction.`,
          data: {
            claim_id: claimId,
            [`${userRole}_confirmed`]: true,
            action_required: 'confirm_direct_delivery',
            notification_type: 'direct_delivery_completed'
          }
        })
      }
      }

      // Mark related notifications as read
      await supabase
        .from('notifications')
        .update({ read_at: new Date().toISOString() })
        .eq('user_id', userId)
        .eq('type', 'system_alert')
        .eq('data->claim_id', claimId)
        .eq('data->action_required', 'confirm_direct_delivery')
        .eq('data->notification_type', 'direct_delivery_completed')

      return { 
        success: true, 
        message: bothConfirmed ? 'Transaction completed successfully!' : 'Your confirmation has been recorded. Waiting for the other party to confirm.'
      }
    } catch (error) {
      console.error('Error confirming direct delivery completion:', error)
      throw error
    }
  },

  // Location Tracking
  async updateDeliveryLocation(deliveryId, location, volunteerId) {
    if (!supabase) {
      throw new Error('Supabase not configured')
    }

    try {
      const { data, error } = await supabase
        .from('deliveries')
        .update({
          volunteer_location: location,
          location_updated_at: new Date().toISOString()
        })
        .eq('id', deliveryId)
        .eq('volunteer_id', volunteerId)
        .select()

      if (error) throw error
      return data?.[0]
    } catch (error) {
      console.error('Error updating delivery location:', error)
      throw error
    }
  },

  async getDeliveryLocationHistory(deliveryId) {
    if (!supabase) {
      throw new Error('Supabase not configured')
    }

    try {
      const { data, error } = await supabase
        .from('delivery_location_history')
        .select('*')
        .eq('delivery_id', deliveryId)
        .order('created_at', { ascending: false })

      if (error) throw error
      return data || []
    } catch (error) {
      console.error('Error getting delivery location history:', error)
      throw error
    }
  },

  async logDeliveryLocation(deliveryId, location, volunteerId) {
    if (!supabase) {
      throw new Error('Supabase not configured')
    }

    try {
      const { data, error } = await supabase
        .from('delivery_location_history')
        .insert({
          delivery_id: deliveryId,
          volunteer_id: volunteerId,
          location: location,
          created_at: new Date().toISOString()
        })
        .select()

      if (error) throw error
      return data?.[0]
    } catch (error) {
      console.error('Error logging delivery location:', error)
      throw error
    }
  },

  async getVolunteerDeliveriesWithLocation(volunteerId, status = null) {
    if (!supabase) {
      throw new Error('Supabase not configured')
    }

    try {
      let query = supabase
        .from('deliveries')
        .select(`
          *,
          donation:donation_id(*),
          recipient:recipient_id(*),
          donor:donor_id(*)
        `)
        .eq('volunteer_id', volunteerId)

      if (status) {
        if (Array.isArray(status)) {
          query = query.in('status', status)
        } else {
          query = query.eq('status', status)
        }
      }

      const { data, error } = await query.order('created_at', { ascending: false })

      if (error) throw error
      return data || []
    } catch (error) {
      console.error('Error getting volunteer deliveries with location:', error)
      throw error
    }
  },

  async updateDeliveryStatus(deliveryId, status, volunteerId, additionalData = {}) {
    if (!supabase) {
      throw new Error('Supabase not configured')
    }

    try {
      const updateData = {
        status,
        updated_at: new Date().toISOString(),
        ...additionalData
      }

      // Add timestamp based on status
      switch (status) {
        case 'in_transit':
          updateData.started_at = new Date().toISOString()
          break
        case 'arrived':
          updateData.arrived_at = new Date().toISOString()
          break
        case 'completed':
          updateData.completed_at = new Date().toISOString()
          break
      }

      const { data, error } = await supabase
        .from('deliveries')
        .update(updateData)
        .eq('id', deliveryId)
        .eq('volunteer_id', volunteerId)
        .select()

      if (error) throw error
      return data?.[0]
    } catch (error) {
      console.error('Error updating delivery status:', error)
      throw error
    }
  },

  async deleteDelivery(deliveryId) {
    if (!supabase) {
      throw new Error('Supabase not configured')
    }
    try {
      const { error } = await supabase
        .from('deliveries')
        .delete()
        .eq('id', deliveryId)
      if (error) throw error
      return true
    } catch (error) {
      console.error('Error deleting delivery:', error)
      throw error
    }
  },

  // Intelligent Matching Functions
  async findMatchesForRequest(requestId, maxResults = 10) {
    if (!supabase) {
      throw new Error('Supabase not configured. Please set up your environment variables.')
    }

    try {
      // Import matching algorithm
      const { intelligentMatcher } = await import('./matchingAlgorithm.js')
      
      // Get the specific request
      const { data: request, error: requestError } = await supabase
        .from('donation_requests')
        .select(`
          *,
          requester:users!donation_requests_requester_id_fkey(*)
        `)
        .eq('id', requestId)
        .single()

      if (requestError) throw requestError

      // Get available donations
      const availableDonations = await this.getAvailableDonations()

      // Find matches using the intelligent algorithm
      const matches = await intelligentMatcher.matchDonorsToRequest(request, availableDonations, maxResults)

      return {
        request,
        matches,
        totalMatches: matches.length,
        algorithm: 'Weighted Sum Model (WSM)',
        criteria: ['geographic_proximity', 'item_compatibility', 'urgency_alignment', 'user_reliability', 'delivery_compatibility']
      }
    } catch (error) {
      console.error('Error finding matches for request:', error)
      throw error
    }
  },

  // Matching Parameters Management
  async getMatchingParameters() {
    if (!supabase) {
      throw new Error('Supabase not configured. Please set up your environment variables.')
    }

    try {
      const { data, error } = await supabase
        .from('matching_parameters')
        .select('*')
        .eq('is_active', true)

      if (error) throw error

      // Transform database rows into a structured object
      const params = {}
      for (const row of data || []) {
        const group = row.parameter_group
        // For DONOR_RECIPIENT_VOLUNTEER, only include the 5 unified matching weights
        // Volunteer-specific weights (availability_match, skill_compatibility, urgency_response) 
        // are not used in unified matching and should not be included in the weights object
        const weights = {
          geographic_proximity: parseFloat(row.geographic_proximity_weight) || 0,
          item_compatibility: parseFloat(row.item_compatibility_weight) || 0,
          urgency_alignment: parseFloat(row.urgency_alignment_weight) || 0,
          user_reliability: parseFloat(row.user_reliability_weight) || 0,
          delivery_compatibility: parseFloat(row.delivery_compatibility_weight) || 0
        }
        
        // Only include volunteer-specific weights for legacy VOLUNTEER_TASK group (for backward compatibility)
        if (group === 'VOLUNTEER_TASK') {
          weights.availability_match = parseFloat(row.availability_match_weight) || 0
          weights.skill_compatibility = parseFloat(row.skill_compatibility_weight) || 0
          weights.urgency_response = parseFloat(row.urgency_response_weight) || 0
        }
        
        params[group] = {
          weights,
          auto_match_enabled: row.auto_match_enabled || false,
          auto_match_threshold: parseFloat(row.auto_match_threshold) || 0.75,
          auto_claim_threshold: parseFloat(row.auto_claim_threshold) || 0.85,
          max_distance_km: parseFloat(row.max_matching_distance_km) || 50,
          min_quantity_match_ratio: parseFloat(row.min_quantity_match_ratio) || 0.8,
          perishable_geographic_boost: parseFloat(row.perishable_geographic_boost) || 0.35,
          critical_urgency_boost: parseFloat(row.critical_urgency_boost) || 0.30,
          description: row.description,
          is_active: row.is_active
        }
      }

      return params
    } catch (error) {
      console.error('Error getting matching parameters:', error)
      // Return empty object if table doesn't exist yet
      if (error.code === '42P01') {
        return {}
      }
      throw error
    }
  },

  async updateMatchingParameters(parameterGroup, updates, userId = null) {
    if (!supabase) {
      throw new Error('Supabase not configured. Please set up your environment variables.')
    }

    try {
      const updateData = {
        ...updates,
        updated_at: new Date().toISOString()
      }

      if (userId) {
        updateData.updated_by = userId
      }

      const { data, error } = await supabase
        .from('matching_parameters')
        .update(updateData)
        .eq('parameter_group', parameterGroup)
        .select()
        .single()

      if (error) {
        // If parameter group doesn't exist, create it
        if (error.code === 'PGRST116') {
          const insertData = {
            parameter_group: parameterGroup,
            ...updateData
          }
          const { data: newData, error: insertError } = await supabase
            .from('matching_parameters')
            .insert(insertData)
            .select()
            .single()
          
          if (insertError) throw insertError
          return newData
        }
        throw error
      }

      return data
    } catch (error) {
      console.error('Error updating matching parameters:', error)
      throw error
    }
  },

  // Automatic Matching Functions
  async performAutomaticMatching(donationId = null, requestId = null) {
    if (!supabase) {
      throw new Error('Supabase not configured. Please set up your environment variables.')
    }

    try {
      // Get matching parameters
      const params = await this.getMatchingParameters()
      // Use unified DONOR_RECIPIENT_VOLUNTEER parameters, with fallback to DONOR_RECIPIENT for backward compatibility
      const matchingParams = params.DONOR_RECIPIENT_VOLUNTEER || params.DONOR_RECIPIENT

      // Check if auto-matching is enabled
      if (!matchingParams || !matchingParams.auto_match_enabled) {
        return { matched: false, reason: 'auto_match_disabled' }
      }

      const { intelligentMatcher } = await import('./matchingAlgorithm.js')
      const autoMatchThreshold = matchingParams.auto_match_threshold || 0.75
      const autoClaimThreshold = matchingParams.auto_claim_threshold || 0.85

      let matches = []
      let matched = false

      // Match new donation to open requests
      if (donationId) {
        const donationMatches = await this.matchNewDonation(donationId, { maxResults: 5 })
        
        for (const match of donationMatches) {
          if (match.score >= autoClaimThreshold) {
            // Auto-claim: Create claim automatically
            try {
              await this.claimDonation(match.donation.id, match.request.requester_id)
              matched = true
              matches.push({ type: 'auto_claim', match, claimCreated: true })
              
              // Notify recipient
              await this.createNotification({
                user_id: match.request.requester_id,
                type: 'donation_auto_matched',
                title: 'Donation Auto-Matched',
                message: `A donation matching your request "${match.request.title}" has been automatically matched!`,
                data: {
                  donation_id: match.donation.id,
                  request_id: match.request.id,
                  match_score: match.score
                }
              })
            } catch (claimError) {
              console.error('Error auto-claiming donation:', claimError)
              matches.push({ type: 'auto_match', match, claimCreated: false, error: claimError.message })
            }
          } else if (match.score >= autoMatchThreshold) {
            // Auto-match: Create notification for high-scoring match
            matches.push({ type: 'auto_match', match, claimCreated: false })
            
            await this.createNotification({
              user_id: match.request.requester_id,
              type: 'high_score_match',
              title: 'High-Score Match Found',
              message: `A donation with ${Math.round(match.score * 100)}% match score is available for your request "${match.request.title}"`,
              data: {
                donation_id: match.donation.id,
                request_id: match.request.id,
                match_score: match.score
              }
            })
          }
        }
      }

      // Match new request to available donations
      if (requestId) {
        const requestMatches = await this.matchNewRequest(requestId, { maxResults: 5 })
        
        for (const match of requestMatches) {
          if (match.score >= autoClaimThreshold) {
            // Auto-claim: Create claim automatically
            try {
              await this.claimDonation(match.donation.id, match.request.requester_id)
              matched = true
              matches.push({ type: 'auto_claim', match, claimCreated: true })
              
              // Notify recipient
              await this.createNotification({
                user_id: match.request.requester_id,
                type: 'donation_auto_matched',
                title: 'Donation Auto-Matched',
                message: `Your request "${match.request.title}" has been automatically matched with a donation!`,
                data: {
                  donation_id: match.donation.id,
                  request_id: match.request.id,
                  match_score: match.score
                }
              })
            } catch (claimError) {
              console.error('Error auto-claiming donation:', claimError)
              matches.push({ type: 'auto_match', match, claimCreated: false, error: claimError.message })
            }
          } else if (match.score >= autoMatchThreshold) {
            // Auto-match: Create notification for high-scoring match
            matches.push({ type: 'auto_match', match, claimCreated: false })
            
            await this.createNotification({
              user_id: match.request.requester_id,
              type: 'high_score_match',
              title: 'High-Score Match Found',
              message: `A donation with ${Math.round(match.score * 100)}% match score is available for your request "${match.request.title}"`,
              data: {
                donation_id: match.donation.id,
                request_id: match.request.id,
                match_score: match.score
              }
            })
          }
        }
      }

      return {
        matched,
        matches,
        threshold: autoMatchThreshold,
        claimThreshold: autoClaimThreshold
      }
    } catch (error) {
      console.error('Error performing automatic matching:', error)
      // Don't throw error - auto-matching should not block donation/request creation
      return { matched: false, error: error.message }
    }
  },

  async findVolunteersForTask(taskId, taskType = 'claim', maxResults = 5) {
    if (!supabase) {
      throw new Error('Supabase not configured. Please set up your environment variables.')
    }

    try {
      const { intelligentMatcher } = await import('./matchingAlgorithm.js')
      
      let task = null

      if (taskType === 'claim') {
        // Get claim details
        const { data: claim, error: claimError } = await supabase
          .from('donation_claims')
          .select(`
            *,
            donation:donations(
              *,
              donor:users!donations_donor_id_fkey(*)
            ),
            recipient:users!donation_claims_recipient_id_fkey(*)
          `)
          .eq('id', taskId)
          .single()

        if (claimError) throw claimError

        task = {
          type: 'delivery',
          claim,
          donation: claim.donation,
          urgency: claim.donation.is_urgent ? 'high' : 'medium',
          pickup_location: claim.donation.pickup_location, // Use actual donation pickup_location
          pickup_latitude: claim.donation.donor?.latitude, // Fallback to donor coordinates if available
          pickup_longitude: claim.donation.donor?.longitude,
          delivery_location: claim.recipient?.address || claim.recipient?.city, // Use recipient address
          delivery_latitude: claim.recipient?.latitude, // Fallback to recipient coordinates if available
          delivery_longitude: claim.recipient?.longitude
        }
      } else {
        // Get request details
        const { data: request, error: requestError } = await supabase
          .from('donation_requests')
          .select(`
            *,
            requester:users!donation_requests_requester_id_fkey(*)
          `)
          .eq('id', taskId)
          .single()

        if (requestError) throw requestError

        task = {
          type: 'request_fulfillment',
          request,
          urgency: request.urgency,
          delivery_location: request.location, // Use actual request location
          delivery_latitude: request.requester?.latitude, // Fallback to requester coordinates if available
          delivery_longitude: request.requester?.longitude
        }
      }

      // Find volunteer matches
      const matches = await intelligentMatcher.matchVolunteersToTask(task, null, maxResults)

      return {
        task,
        matches,
        totalMatches: matches.length,
        algorithm: 'Weighted Sum Model (WSM)',
        criteria: ['geographic_proximity', 'availability_match', 'skill_compatibility', 'user_reliability', 'urgency_response']
      }
    } catch (error) {
      console.error('Error finding volunteers for task:', error)
      throw error
    }
  },

  async findOptimalMatches(filters = {}) {
    if (!supabase) {
      throw new Error('Supabase not configured. Please set up your environment variables.')
    }

    try {
      const { intelligentMatcher } = await import('./matchingAlgorithm.js')

      // Get open requests
      const requests = await this.getRequests({ status: 'open', ...filters })
      
      // Get available donations
      const donations = await this.getAvailableDonations()

      // Find optimal matches
      const optimalMatches = await intelligentMatcher.findOptimalMatches(requests, donations)

      return {
        matches: optimalMatches,
        totalMatches: optimalMatches.length,
        algorithm: 'Weighted Sum Model (WSM)',
        processingTime: new Date().toISOString(),
        filters: filters
      }
    } catch (error) {
      console.error('Error finding optimal matches:', error)
      throw error
    }
  },

  async getMatchingRecommendations(userId, userRole, limit = 5) {
    if (!supabase) {
      throw new Error('Supabase not configured. Please set up your environment variables.')
    }

    try {
      const { intelligentMatcher } = await import('./matchingAlgorithm.js')
      let recommendations = []

      if (userRole === 'recipient') {
        // Get user's open requests
        const userRequests = await this.getRequests({ 
          requester_id: userId, 
          status: 'open' 
        })

        for (const request of userRequests.slice(0, 3)) {
          const matches = await this.findMatchesForRequest(request.id, 3)
          if (matches.matches.length > 0) {
            recommendations.push({
              type: 'donation_matches',
              request,
              topMatches: matches.matches.slice(0, 2),
              reason: 'Found potential donors for your request'
            })
          }
        }
      } else if (userRole === 'donor') {
        // Get user's available donations
        const userDonations = await this.getDonations({ 
          donor_id: userId, 
          status: 'available' 
        })

        // Find requests that match user's donations using the unified matching algorithm
        const openRequests = await this.getRequests({ status: 'open' })
        
        for (const donation of userDonations.slice(0, 3)) {
          try {
            // Use the unified matching algorithm to find best matching requests
            // This uses database-driven parameters (DONOR_RECIPIENT_VOLUNTEER)
          const compatibleRequests = []
          
            for (const request of openRequests.slice(0, 10)) {
              try {
                // Use matchDonorsToRequest to get proper matching scores
                const matches = await intelligentMatcher.matchDonorsToRequest(request, [donation], 1)
                
                if (matches && matches.length > 0 && matches[0].score > 0.5) {
              compatibleRequests.push({
                request,
                    compatibility: matches[0].score,
                    matchReason: matches[0].matchReason
                  })
                }
              } catch (err) {
                console.error(`Error matching request ${request.id} for donation ${donation.id}:`, err)
            }
          }

          if (compatibleRequests.length > 0) {
            recommendations.push({
              type: 'request_matches',
              donation,
              topMatches: compatibleRequests
                .sort((a, b) => b.compatibility - a.compatibility)
                .slice(0, 2),
              reason: 'Found recipients who need your donation'
            })
            }
          } catch (err) {
            console.error(`Error processing donation ${donation.id} for recommendations:`, err)
          }
        }
      } else if (userRole === 'volunteer') {
        // Get available volunteer tasks
        const availableTasks = await this.getAvailableVolunteerTasks()
        
        // Score tasks using the unified matching algorithm with database-driven parameters
        const userProfile = await this.getProfile(userId)
        const scoredTasks = []

        for (const task of availableTasks.slice(0, 10)) {
          try {
            // Use the unified matching algorithm to score this task for the volunteer
            const matchResult = await intelligentMatcher.calculateTaskScoreForVolunteer(task, userProfile)
            scoredTasks.push({ ...task, score: matchResult.score, matchReason: matchResult.matchReason })
          } catch (err) {
            console.error(`Error scoring task ${task.id} for recommendations:`, err)
            // Fallback to neutral score
            scoredTasks.push({ ...task, score: 0.5, matchReason: 'Unable to calculate match score' })
          }
        }

        const topTasks = scoredTasks
          .sort((a, b) => b.score - a.score)
          .slice(0, 3)

        recommendations.push({
          type: 'volunteer_opportunities',
          tasks: topTasks,
          reason: 'High-priority volunteer opportunities matched to your profile'
        })
      }

      return {
        recommendations,
        userId,
        userRole,
        generatedAt: new Date().toISOString(),
        algorithm: 'Weighted Sum Model (WSM)'
      }
    } catch (error) {
      console.error('Error getting matching recommendations:', error)
      throw error
    }
  },

  async createSmartMatch(requestId, donationId, volunteerId = null) {
    if (!supabase) {
      throw new Error('Supabase not configured. Please set up your environment variables.')
    }

    try {
      // Get request and donation details
      const [requestResult, donationResult] = await Promise.all([
        supabase.from('donation_requests').select('*').eq('id', requestId).single(),
        supabase.from('donations').select('*').eq('id', donationId).single()
      ])

      if (requestResult.error) throw requestResult.error
      if (donationResult.error) throw donationResult.error

      const request = requestResult.data
      const donation = donationResult.data

      // Verify basic compatibility - use a low threshold since UI already filtered
      // The UI shows Smart Match button only for items with > 60% total compatibility score
      // Here we just do a basic sanity check to ensure items are somewhat related
      const { intelligentMatcher } = await import('./matchingAlgorithm.js')
      const itemCompatibility = intelligentMatcher.calculateItemCompatibility(
        request.category, donation.category,
        request.title, donation.title,
        request.quantity_needed, donation.quantity
      )

      // Very low threshold (30%) since UI already validated the match
      if (itemCompatibility < 0.3) {
        throw new Error('Items are not sufficiently compatible for matching')
      }

      // Update donation status to matched (donor is offering it to fulfill a request)
      const { data: updatedDonation, error: donationError } = await supabase
        .from('donations')
        .update({ 
          status: 'matched'
        })
        .eq('id', donationId)
        .select()
        .single()

      if (donationError) throw donationError

      // Update request status to claimed (a donation has been offered/matched to this request)
      const { data: updatedRequest, error: requestError } = await supabase
        .from('donation_requests')
        .update({ 
          status: 'claimed'
        })
        .eq('id', requestId)
        .select()
        .single()

      if (requestError) throw requestError

      // Create success notifications
      try {
        await this.createNotification({
          user_id: request.requester_id,
          type: 'system_alert',
          title: 'Match Created!',
          message: `Your request "${request.title}" has been matched with a donation.`,
          data: {
            request_id: requestId,
            donation_id: donationId,
            match_type: 'smart_match'
          }
        })

        await this.createNotification({
          user_id: donation.donor_id,
          type: 'system_alert',
          title: 'Your Donation Was Matched!',
          message: `Your donation "${donation.title}" was matched with someone in need.`,
          data: {
            request_id: requestId,
            donation_id: donationId,
            match_type: 'smart_match'
          }
        })
      } catch (notifError) {
        console.error('Error creating notifications:', notifError)
        // Don't fail the match if notifications fail
      }

      return {
        success: true,
        match: {
          request: updatedRequest,
          donation: updatedDonation,
          volunteer_id: volunteerId,
          compatibility_score: itemCompatibility,
          match_algorithm: 'Weighted Sum Model (WSM)',
          created_at: new Date().toISOString()
        }
      }
    } catch (error) {
      console.error('Error creating smart match:', error)
      throw error
    }
  },

  // Admin Settings
  async getSettings() {
    if (!supabase) {
      throw new Error('Supabase not configured')
    }

    try {
      // Fetch all settings from key-value table
      const { data, error } = await supabase
        .from('system_settings')
        .select('setting_key, setting_value')

      if (error) {
        throw error
      }

      // Default settings
      const defaults = {
          enableSystemLogs: true,
          logRetentionDays: 30,
          requireIdVerification: true,
          auto_assign_enabled: false,
          expiry_retention_days: 30,
          donor_signup_enabled: true,
          recipient_signup_enabled: true,
          volunteer_signup_enabled: true
        }

      // Return defaults if no data
      if (!data || data.length === 0) {
        return defaults
      }

      // Convert key-value rows to object
      const settings = {}
      data.forEach(row => {
        const key = row.setting_key
        let value = row.setting_value

        // Extract value from JSONB (it might be wrapped)
        if (typeof value === 'object' && value !== null) {
          // If it's a plain JSONB value, use it directly
          value = value
        }

        // Map setting keys to camelCase property names
        const keyMap = {
          'enable_system_logs': 'enableSystemLogs',
          'log_retention_days': 'logRetentionDays',
          'require_id_verification': 'requireIdVerification',
          'auto_assign_enabled': 'auto_assign_enabled',
          'expiry_retention_days': 'expiry_retention_days',
          'donor_signup_enabled': 'donor_signup_enabled',
          'recipient_signup_enabled': 'recipient_signup_enabled',
          'volunteer_signup_enabled': 'volunteer_signup_enabled'
        }

        const mappedKey = keyMap[key] || key
        settings[mappedKey] = value
      })

      // Merge with defaults
      return { ...defaults, ...settings }
    } catch (error) {
      console.error('Error fetching settings:', error)
      throw error
    }
  },

  async isRoleSignupEnabled(role) {
    if (!supabase) {
      throw new Error('Supabase not configured')
    }

    try {
      const settings = await this.getSettings()
      
      switch (role) {
        case 'donor':
          return settings.donor_signup_enabled !== false
        case 'recipient':
          return settings.recipient_signup_enabled !== false
        case 'volunteer':
          return settings.volunteer_signup_enabled !== false
        case 'admin':
          // Admin signup is always disabled (admin accounts must be created manually)
          return false
        default:
          return false
      }
    } catch (error) {
      console.error('Error checking role signup status:', error)
      // Default to enabled if check fails (fail open to prevent blocking legitimate signups)
      return true
    }
  },

  async updateSettings(settings) {
    if (!supabase) {
      throw new Error('Supabase not configured')
    }

    try {
      // Map JavaScript camelCase to database setting_key names
      const keyMap = {
        enableSystemLogs: 'enable_system_logs',
        logRetentionDays: 'log_retention_days',
        requireIdVerification: 'require_id_verification',
        auto_assign_enabled: 'auto_assign_enabled',
        expiry_retention_days: 'expiry_retention_days',
        donor_signup_enabled: 'donor_signup_enabled',
        recipient_signup_enabled: 'recipient_signup_enabled',
        volunteer_signup_enabled: 'volunteer_signup_enabled'
      }

      // Upsert each setting as a separate row
      for (const [jsKey, value] of Object.entries(settings)) {
        if (value === undefined) continue

        const settingKey = keyMap[jsKey] || jsKey
        
        // Upsert the setting
        const { error } = await supabase
          .from('system_settings')
          .upsert({
            setting_key: settingKey,
            setting_value: value,
            description: `Setting for ${settingKey}`,
            setting_type: typeof value === 'boolean' ? 'boolean' : typeof value === 'number' ? 'number' : 'string',
            category: 'platform',
            updated_at: new Date().toISOString()
          }, {
            onConflict: 'setting_key'
          })

        if (error) throw error
      }

      // Return the updated settings
      return await this.getSettings()
    } catch (error) {
      console.error('Error updating settings:', error)
      throw error
    }
  },

  // Feedback and Rating System
  async getCompletedTransactionsForFeedback(userId, sinceDate) {
    if (!supabase) throw new Error('Supabase not configured')
    
    try {
      // Get completed donations where user was donor (get recipient from claims)
      const { data: donationClaims, error: donError } = await supabase
        .from('donation_claims')
        .select(`
          id,
          donation_id,
          recipient_id,
          updated_at,
          donation:donations(id, title, donor_id),
          recipient:users!donation_claims_recipient_id_fkey(id, name)
        `)
        .eq('donation.donor_id', userId)
        .eq('status', 'completed')
        .gte('updated_at', sinceDate)

      if (donError) throw donError

      // Transform donation claims to match expected format
      const donations = (donationClaims || []).map(claim => ({
        id: claim.donation_id,
        title: claim.donation?.title,
        status: 'completed',
        updated_at: claim.updated_at,
        donor_id: claim.donation?.donor_id,
        recipient_id: claim.recipient_id,
        recipient: claim.recipient
      }))

      // Get fulfilled requests where user was requester
      const { data: requests, error: reqError } = await supabase
        .from('donation_requests')
        .select(`
          id,
          title,
          status,
          created_at,
          updated_at,
          requester_id,
          users!donation_requests_requester_id_fkey(id, name)
        `)
        .eq('status', 'fulfilled')
        .eq('requester_id', userId)
        .gte('updated_at', sinceDate)

      if (reqError) throw reqError

      // Check which transactions already have feedback from this user
      const allTransactionIds = [
        ...(donations || []).map(d => d.id),
        ...(requests || []).map(r => r.id)
      ]

      const { data: existingFeedback } = await supabase
        .from('feedback_ratings')
        .select('transaction_id')
        .eq('rater_id', userId)
        .in('transaction_id', allTransactionIds)

      const ratedIds = new Set(existingFeedback?.map(f => f.transaction_id) || [])

      // Format and filter transactions
      const formattedTransactions = [
        ...(donations || [])
          .filter(d => !ratedIds.has(d.id))
          .map(d => ({
            id: d.id,
            title: d.title,
            type: 'Donation',
            completed_at: d.updated_at,
            other_user_id: d.recipient_id,
            other_user_name: d.recipient?.name || 'Unknown User'
          })),
        ...(requests || [])
          .filter(r => !ratedIds.has(r.id))
          .map(r => ({
            id: r.id,
            title: r.title,
            type: 'Request',
            completed_at: r.updated_at,
            other_user_id: null, // Requests don't track specific donor in main table
            other_user_name: 'Fulfilled Request'
          }))
      ]

      return formattedTransactions
    } catch (error) {
      console.error('Error getting transactions for feedback:', error)
      throw error
    }
  },

  // Check if recipient has provided feedback for a specific transaction
  async hasRecipientProvidedFeedback(recipientId, deliveryId, claimId, donationId) {
    if (!supabase) throw new Error('Supabase not configured')
    
    try {
      // Check for feedback on delivery, claim, or donation
      const transactionIds = [deliveryId, claimId, donationId].filter(Boolean)
      
      if (transactionIds.length === 0) return false

      const { data: feedback, error } = await supabase
        .from('feedback_ratings')
        .select('id')
        .eq('rater_id', recipientId)
        .in('transaction_id', transactionIds)
        .limit(1)

      if (error) throw error
      
      return feedback && feedback.length > 0
    } catch (error) {
      console.error('Error checking feedback status:', error)
      return false
    }
  },

  // Get feedback status for multiple transactions
  async getFeedbackStatusForTransactions(recipientId, transactions) {
    if (!supabase) throw new Error('Supabase not configured')
    
    try {
      const transactionIds = transactions
        .map(t => [t.delivery_id, t.claim_id, t.donation_id])
        .flat()
        .filter(Boolean)
        .filter((id, index, self) => self.indexOf(id) === index) // Remove duplicates

      if (transactionIds.length === 0) {
        return new Map() // Return empty map if no transactions
      }

      const { data: feedback, error } = await supabase
        .from('feedback_ratings')
        .select('transaction_id, rated_user_id, created_at')
        .eq('rater_id', recipientId)
        .in('transaction_id', transactionIds)

      if (error) throw error

      // Create a map of transaction_id -> feedback exists
      const feedbackMap = new Map()
      transactions.forEach(t => {
        const ids = [t.delivery_id, t.claim_id, t.donation_id].filter(Boolean)
        const hasFeedback = ids.some(id => 
          feedback?.some(f => f.transaction_id === id)
        )
        feedbackMap.set(t.claim_id || t.donation_id || t.delivery_id, hasFeedback)
      })

      return feedbackMap
    } catch (error) {
      console.error('Error getting feedback status:', error)
      return new Map()
    }
  },

  async getUserPerformanceMetrics(userId) {
    if (!supabase) throw new Error('Supabase not configured')
    
    try {
      // Get all feedback received by this user
      const { data: feedback, error: feedbackError } = await supabase
        .from('feedback_ratings')
        .select('rating, created_at')
        .eq('rated_user_id', userId)
        .order('created_at', { ascending: false })

      if (feedbackError) throw feedbackError

      const totalFeedback = feedback?.length || 0
      const averageRating = totalFeedback > 0
        ? feedback.reduce((sum, f) => sum + f.rating, 0) / totalFeedback
        : 0

      const positiveRate = totalFeedback > 0
        ? Math.round((feedback.filter(f => f.rating >= 4).length / totalFeedback) * 100)
        : 0

      // Get completed transactions count
      // For donations, get completed claims and filter by donor
      const { data: donationClaims } = await supabase
        .from('donation_claims')
        .select('id, donation:donations!inner(donor_id)')
        .eq('donation.donor_id', userId)
        .eq('status', 'completed')

      const donationsCount = donationClaims?.length || 0

      // For requests, count fulfilled requests where user was requester
      const { count: requestsCount } = await supabase
        .from('donation_requests')
        .select('*', { count: 'exact', head: true })
        .eq('requester_id', userId)
        .eq('status', 'fulfilled')

      const completedTransactions = donationsCount + (requestsCount || 0)

      // Calculate satisfaction trend (last 30 days vs previous 30 days)
      const thirtyDaysAgo = new Date()
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
      const sixtyDaysAgo = new Date()
      sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60)

      const recentFeedback = feedback?.filter(f => new Date(f.created_at) >= thirtyDaysAgo) || []
      const previousFeedback = feedback?.filter(f => 
        new Date(f.created_at) >= sixtyDaysAgo && new Date(f.created_at) < thirtyDaysAgo
      ) || []

      const recentAvg = recentFeedback.length > 0
        ? recentFeedback.reduce((sum, f) => sum + f.rating, 0) / recentFeedback.length
        : 0
      const previousAvg = previousFeedback.length > 0
        ? previousFeedback.reduce((sum, f) => sum + f.rating, 0) / previousFeedback.length
        : 0

      let satisfactionTrend = 'stable'
      if (recentAvg > previousAvg + 0.3) satisfactionTrend = 'improving'
      else if (recentAvg < previousAvg - 0.3) satisfactionTrend = 'declining'

      return {
        average_rating: averageRating,
        total_feedback: totalFeedback,
        positive_rate: positiveRate,
        completed_transactions: completedTransactions,
        satisfaction_trend: satisfactionTrend
      }
    } catch (error) {
      console.error('Error getting performance metrics:', error)
      throw error
    }
  },

  async submitFeedback(feedbackData) {
    if (!supabase) throw new Error('Supabase not configured')
    
    try {
      const { data, error } = await supabase
        .from('feedback_ratings')
        .insert({
          transaction_id: feedbackData.transaction_id,
          transaction_type: feedbackData.transaction_type,
          rater_id: feedbackData.rater_id,
          rated_user_id: feedbackData.rated_user_id,
          rating: feedbackData.rating,
          feedback: feedbackData.feedback,
          created_at: feedbackData.created_at
        })
        .select()
        .single()

      if (error) throw error

      // Update rated user's aggregate rating
      try { await this.updateUserRating(feedbackData.rated_user_id) } catch (_) {}

      // Notify rated user in real-time
      try {
        await this.createNotification({
          user_id: feedbackData.rated_user_id,
          type: 'new_rating',
          title: 'You received a new rating',
          message: `You received a ${feedbackData.rating}-star rating.`,
          data: {
            transaction_id: feedbackData.transaction_id,
            rating: feedbackData.rating
          }
        })
      } catch (_) {}

      return data
    } catch (error) {
      console.error('Error submitting feedback:', error)
      throw error
    }
  },

  async updateUserRating(userId) {
    if (!supabase) throw new Error('Supabase not configured')
    
    try {
      // Calculate new average rating
      const { data: feedback, error: feedbackError } = await supabase
        .from('feedback_ratings')
        .select('rating')
        .eq('rated_user_id', userId)

      if (feedbackError) throw feedbackError

      const averageRating = feedback && feedback.length > 0
        ? feedback.reduce((sum, f) => sum + f.rating, 0) / feedback.length
        : 0

      // Update user's rating in users table
      const { error: updateError } = await supabase
        .from('users')
        .update({ 
          rating: averageRating,
          total_ratings: feedback?.length || 0
        })
        .eq('id', userId)

      if (updateError) throw updateError

      return { averageRating, totalRatings: feedback?.length || 0 }
    } catch (error) {
      console.error('Error updating user rating:', error)
      throw error
    }
  },

  async submitPlatformFeedback(feedbackData) {
    if (!supabase) throw new Error('Supabase not configured')
    
    try {
      // Store platform feedback in unified feedback table
      const { data, error } = await supabase
        .from('feedback')
        .insert({
          user_id: feedbackData.user_id,
          feedback_text: feedbackData.feedback,
          feedback_type: 'platform',
          rating: feedbackData.rating,
          created_at: feedbackData.created_at || new Date().toISOString()
        })
        .select()
        .single()

      if (error) throw error

      // Notify all admins about new feedback
      try {
        await this.notifyAllAdmins({
          type: 'system_alert',
          title: '📝 New User Feedback',
          message: `New feedback received from ${feedbackData.user_role || 'user'} with ${feedbackData.rating}/5 rating`,
          data: {
            feedback_id: data.id,
            user_role: feedbackData.user_role,
            rating: feedbackData.rating,
            link: '/admin/feedback',
            notification_type: 'new_feedback'
          }
        })
      } catch (notifError) {
        console.error('Error notifying admins about feedback:', notifError)
        // Don't throw - feedback was submitted successfully
      }

      return data
    } catch (error) {
      console.error('Error submitting platform feedback:', error)
      throw error
    }
  },

  async getAllPlatformFeedback() {
    if (!supabase) throw new Error('Supabase not configured')
    
    try {
      // Try with foreign key join first
      let { data, error } = await supabase
        .from('feedback')
        .select(`
          *,
          users!feedback_user_id_fkey(
            id,
            name,
            email,
            role
          )
        `)
        .eq('feedback_type', 'platform')
        .order('created_at', { ascending: false })

      // If foreign key join fails, try without specifying the foreign key name
      if (error && error.message?.includes('foreign key')) {
        const result = await supabase
          .from('feedback')
          .select(`
            *,
            users(
              id,
              name,
              email,
              role
            )
          `)
          .eq('feedback_type', 'platform')
          .order('created_at', { ascending: false })
        data = result.data
        error = result.error
      }

      // If still fails, fetch users separately
      if (error || !data) {
        const { data: feedbackData, error: feedbackError } = await supabase
        .from('feedback')
        .select('*')
        .eq('feedback_type', 'platform')
        .order('created_at', { ascending: false })

        if (feedbackError) throw feedbackError

        // Get unique user IDs
        const userIds = [...new Set((feedbackData || []).map(f => f.user_id).filter(Boolean))]
        
        // Fetch users
        const { data: usersData } = await supabase
          .from('users')
          .select('id, name, email, role')
          .in('id', userIds)

        // Create a map of users by ID
        const usersMap = new Map((usersData || []).map(u => [u.id, u]))

        // Combine feedback with user data
        data = (feedbackData || []).map(feedback => ({
          ...feedback,
          users: usersMap.get(feedback.user_id) || null
        }))
      }

      if (error && !data) throw error
      
      // Transform data to include user info at top level for easier access
      return (data || []).map(feedback => ({
        ...feedback,
        feedback: feedback.feedback_text || feedback.feedback, // Map feedback_text to feedback for compatibility
        user_name: feedback.users?.name || 'User',
        user_email: feedback.users?.email,
        user_role: feedback.users?.role || feedback.user_role,
        user: feedback.users // Keep user object for backward compatibility
      }))
    } catch (error) {
      console.error('Error getting platform feedback:', error)
      throw error
    }
  },

  // Database Backups Management
  async getDatabaseBackups(backupType = null) {
    if (!supabase) {
      throw new Error('Supabase not configured')
    }

    try {
      // Optimize query: Don't select sql_data column (can be very large and cause timeouts)
      // Only select the columns we actually need for display
      let query = supabase
        .from('database_backups')
        .select('id, file_name, file_size, backup_date, status, backup_type, created_at, updated_at')
        .order('backup_date', { ascending: false })
      
      // Filter by backup type if provided
      // If backup_type column doesn't exist yet, the query will fail and we'll handle it
      if (backupType === 'automatic' || backupType === 'manual') {
        query = query.eq('backup_type', backupType)
      }
      
      // For automatic backups, limit to 5 most recent
      // For manual backups, get all (reasonable limit)
      if (backupType === 'automatic') {
        query = query.limit(5)
      } else if (backupType === 'manual') {
        query = query.limit(100) // Reasonable limit for manual backups
      } else {
        query = query.limit(15) // Default limit when fetching all
      }
      
      const { data, error } = await query
      
      // If error is about backup_type column not existing, fetch all and filter in memory
      if (error && error.message && error.message.includes('backup_type')) {
        // Column doesn't exist yet - fetch all backups and filter in memory
        // Don't select sql_data to avoid timeouts
        const { data: allBackups, error: allError } = await supabase
          .from('database_backups')
          .select('id, file_name, file_size, backup_date, status, created_at, updated_at')
          .order('backup_date', { ascending: false })
          .limit(backupType === 'automatic' ? 5 : 100)
        
        if (allError) {
          throw allError
        }
        
        // All existing backups are treated as automatic (backward compatibility)
        if (backupType === 'automatic') {
          return (allBackups || []).slice(0, 5)
        } else if (backupType === 'manual') {
          return [] // No manual backups if column doesn't exist
        }
        return allBackups || []
      }

      if (error) {
        // If table doesn't exist, return empty array
        if (error.code === '42P01' || error.code === 'PGRST116') {
          return []
        }
        // Handle statement timeout errors (code 57014)
        if (error.code === '57014' || error.message?.includes('statement timeout') || error.message?.includes('canceling statement')) {
          console.warn('Query timeout fetching backups (table may be large or slow):', error.message)
          return [] // Return empty array for timeout errors to prevent UI breakage
        }
        // Handle network errors gracefully (CORS, 502, connection errors)
        if (error.message?.includes('Failed to fetch') || 
            error.message?.includes('CORS') ||
            error.message?.includes('NetworkError') ||
            error.message?.includes('QUIC') ||
            error.code === '' || 
            error.statusCode === 502 ||
            error.statusCode === 503 ||
            error.statusCode === 504 ||
            error.statusCode === 500) {
          console.warn('Network/server error fetching backups (non-critical):', error.message)
          return [] // Return empty array for network errors to prevent UI breakage
        }
        throw error
      }
      return data || []
    } catch (error) {
      console.error('Error fetching database backups:', error)
      // Return empty array if table doesn't exist
      if (error.code === '42P01' || error.code === 'PGRST116') {
        return []
      }
      // Handle statement timeout errors (code 57014)
      if (error.code === '57014' || error.message?.includes('statement timeout') || error.message?.includes('canceling statement')) {
        console.warn('Query timeout fetching backups (table may be large or slow):', error.message)
        return [] // Return empty array for timeout errors to prevent UI breakage
      }
      // Handle network errors gracefully (CORS, 502, connection errors)
      if (error.message?.includes('Failed to fetch') || 
          error.message?.includes('CORS') ||
          error.message?.includes('NetworkError') ||
          error.message?.includes('QUIC') ||
          error.code === '' || 
          error.statusCode === 502 ||
          error.statusCode === 503 ||
          error.statusCode === 504 ||
          error.statusCode === 500) {
        console.warn('Network/server error fetching backups (non-critical):', error.message)
        return [] // Return empty array for network errors to prevent UI breakage
      }
      // For other errors, still return empty array to prevent UI breakage
      // This allows the UI to continue functioning even if backup loading fails
      console.warn('Error fetching backups, returning empty array:', error.message)
      return []
    }
  },

  async checkAndCreateWeeklyBackup() {
    if (!supabase) {
      throw new Error('Supabase not configured')
    }

    try {
      // Get the start of the current week (Monday)
      const now = new Date()
      const dayOfWeek = now.getDay()
      // Calculate days to subtract to get to Monday (0 = Sunday, 1 = Monday, etc.)
      const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1
      const startOfWeek = new Date(now)
      startOfWeek.setDate(startOfWeek.getDate() - daysToMonday)
      startOfWeek.setHours(0, 0, 0, 0)
      const endOfWeek = new Date(startOfWeek)
      endOfWeek.setDate(endOfWeek.getDate() + 7)

      // Check if an automatic backup already exists for this week
      const { data: existingBackups, error: checkError } = await supabase
        .from('database_backups')
        .select('id, backup_date')
        .eq('backup_type', 'automatic')
        .gte('backup_date', startOfWeek.toISOString())
        .lt('backup_date', endOfWeek.toISOString())
        .order('backup_date', { ascending: false })

      if (checkError) {
        // If table doesn't exist, create first backup
        if (checkError.code === '42P01' || checkError.code === 'PGRST116') {
          // Backup table does not exist yet, creating first backup
          return await this.createDatabaseBackup('automatic')
        }
        throw checkError
      }

      // If no backup exists for this week, create one automatically
      if (!existingBackups || existingBackups.length === 0) {
        // Create automatic weekly backup
        const newBackup = await this.createDatabaseBackup('automatic')
        
        // After creating backup, check again for duplicates (race condition protection)
        // This ensures that if multiple backups were created simultaneously, we clean them up
        const { data: backupsAfterCreation, error: recheckError } = await supabase
          .from('database_backups')
          .select('id, backup_date')
          .eq('backup_type', 'automatic')
          .gte('backup_date', startOfWeek.toISOString())
          .lt('backup_date', endOfWeek.toISOString())
          .order('backup_date', { ascending: false })

        if (!recheckError && backupsAfterCreation && backupsAfterCreation.length > 1) {
          // Multiple backups found for this week - keep the most recent, delete older ones
          console.warn(`Found ${backupsAfterCreation.length} backups for this week. Cleaning up duplicates...`)
          
          // Keep the first (most recent) backup, delete the rest
          const backupsToDelete = backupsAfterCreation.slice(1)
          
          for (const backupToDelete of backupsToDelete) {
            try {
              await this.deleteDatabaseBackup(backupToDelete.id)
            } catch (deleteError) {
              console.error(`Error deleting duplicate backup ${backupToDelete.id}:`, deleteError)
              // Continue deleting other duplicates even if one fails
            }
          }
        }
        
        return newBackup
      }

      // If multiple backups exist for this week (shouldn't happen, but cleanup if it does)
      if (existingBackups.length > 1) {
        console.warn(`Found ${existingBackups.length} backups for this week. Cleaning up duplicates...`)
        
        // Keep the first (most recent) backup, delete the rest
        const backupsToDelete = existingBackups.slice(1)
        
        for (const backupToDelete of backupsToDelete) {
          try {
            await this.deleteDatabaseBackup(backupToDelete.id)
          } catch (deleteError) {
            console.error(`Error deleting duplicate backup ${backupToDelete.id}:`, deleteError)
            // Continue deleting other duplicates even if one fails
          }
        }
      }

      return null // Backup already exists for this week
    } catch (error) {
      console.error('Error checking/creating weekly backup:', error)
      throw error
    }
  },

  async createDatabaseBackup(backupType = 'automatic') {
    if (!supabase) {
      throw new Error('Supabase not configured')
    }

    // Validate backup type
    if (backupType !== 'automatic' && backupType !== 'manual') {
      throw new Error('Invalid backup type. Must be "automatic" or "manual"')
    }

    try {
      // Get all tables in the database (export ALL data from ALL tables)
      // Only include tables that actually exist in the database
      // Tables that don't exist will be skipped gracefully (no console errors)
      const tables = [
        'users', 
        'donations', 
        'donation_requests', 
        'donation_claims',
        'events', 
        'event_items',
        'feedback_ratings', 
        'platform_feedback',
        'notifications', 
        'settings', 
        'deliveries', 
        // 'direct_deliveries' - merged into deliveries table with delivery_mode='direct'
        'database_backups' // Include backups table metadata (but exclude sql_data to avoid recursion)
      ]
      
      // Optional tables that may not exist in all databases
      // Only include tables that actually exist in your database to avoid 404 errors
      // If you add these tables later, uncomment them below
      const optionalTables = [
        // Uncomment tables below if they exist in your database:
        // 'event_attendance',
        // 'smart_matches',
        // 'pickups',
        // 'system_logs' // Uncomment if system_logs table exists
      ]
      
      // Track which tables were successfully backed up
      const backedUpTables = []
      const skippedTables = []

      let sqlBackup = `-- HopeLink Database Backup\n-- Generated: ${new Date().toISOString()}\n\n`
      sqlBackup += `SET session_replication_role = 'replica';\n\n`

      // Export data from each table (required tables)
      for (const table of tables) {
        try {
          // For database_backups table, exclude sql_data column to avoid huge backups
          const selectColumns = table === 'database_backups' 
            ? 'id, file_name, file_size, backup_date, status, created_at, updated_at'
            : '*'

          // Try to fetch ALL data directly
          // If table doesn't exist, error will be caught and table will be skipped
          const { data, error } = await supabase
            .from(table)
            .select(selectColumns)

          if (error) {
            // Check if table doesn't exist
            const errorMsg = error.message?.toLowerCase() || ''
            const errorCode = error.code || ''
            if (errorCode === '42P01' || errorCode === 'PGRST116' || 
                errorMsg.includes('does not exist') || 
                (errorMsg.includes('relation') && errorMsg.includes('not exist'))) {
              // Table doesn't exist - skip it and track (this is expected for some tables)
              skippedTables.push(table)
              continue
            }
            // Other errors - skip this table and track
            skippedTables.push(table)
            continue
          }
          
          // Table exists and data fetched successfully - track it
          backedUpTables.push(table)
          
          // Always include table in backup (even if empty)
          sqlBackup += `\n-- Table: ${table}\n`
          sqlBackup += `DELETE FROM ${table};\n\n`
          
          if (data && data.length > 0) {
            // Generate INSERT statements for ALL rows
            data.forEach(row => {
              const columns = Object.keys(row).join(', ')
              const values = Object.values(row).map(val => {
                if (val === null) return 'NULL'
                if (typeof val === 'string') {
                  // Escape single quotes and wrap in quotes
                  return `'${val.replace(/'/g, "''")}'`
                }
                if (typeof val === 'boolean') return val ? 'TRUE' : 'FALSE'
                if (val instanceof Date) {
                  return `'${val.toISOString()}'`
                }
                if (typeof val === 'object') {
                  // Handle JSON/JSONB objects
                  try {
                    const jsonStr = JSON.stringify(val).replace(/'/g, "''")
                    return `'${jsonStr}'::jsonb`
                  } catch {
                    return `'${String(val).replace(/'/g, "''")}'`
                  }
                }
                if (typeof val === 'number') {
                  return String(val)
                }
                return String(val)
              }).join(', ')
              
              sqlBackup += `INSERT INTO ${table} (${columns}) VALUES (${values});\n`
            })
            sqlBackup += `-- End of table ${table} (${data.length} rows)\n\n`
          } else {
            // Table exists but is empty
            sqlBackup += `-- Table ${table} is empty (0 rows)\n\n`
          }
        } catch (tableError) {
          // Silently skip tables that cause errors
          skippedTables.push(table)
          continue
        }
      }
      
      // Export data from optional tables (may not exist - check first)
      // Use Promise.allSettled to handle all table checks without stopping on errors
      const optionalTablePromises = optionalTables.map(async (table) => {
        try {
          // Try to fetch data directly - if table doesn't exist, it will error
          // We catch the error and return null to indicate table doesn't exist
          const { data, error } = await supabase
            .from(table)
            .select('*')

          if (error) {
            // Check if table doesn't exist
            const errorMsg = error.message?.toLowerCase() || ''
            const errorCode = error.code || ''
            if (errorCode === '42P01' || errorCode === 'PGRST116' || 
                errorMsg.includes('does not exist') || 
                (errorMsg.includes('relation') && errorMsg.includes('not exist'))) {
              // Table doesn't exist - return null to skip
              return { table, exists: false, data: null, error: null }
            }
            // Other errors - also skip
            return { table, exists: false, data: null, error }
          }

          // Table exists - return data
          return { table, exists: true, data, error: null }
        } catch (tableError) {
          // Catch any unexpected errors
          return { table, exists: false, data: null, error: tableError }
        }
      })

      // Wait for all optional table checks to complete
      const optionalTableResults = await Promise.allSettled(optionalTablePromises)

      // Process results
      for (const result of optionalTableResults) {
        if (result.status === 'fulfilled') {
          const { table, exists, data, error } = result.value
          
          if (!exists) {
            // Table doesn't exist - track and skip
            skippedTables.push(table)
            continue
          }

          // Table exists and data fetched successfully - track it
          backedUpTables.push(table)

          // Add table to backup (even if empty)
          sqlBackup += `\n-- Table: ${table}\n`
          sqlBackup += `DELETE FROM ${table};\n\n`
          
          if (data && data.length > 0) {
            // Generate INSERT statements for ALL rows
            data.forEach(row => {
              const columns = Object.keys(row).join(', ')
              const values = Object.values(row).map(val => {
                if (val === null) return 'NULL'
                if (typeof val === 'string') return `'${val.replace(/'/g, "''")}'`
                if (typeof val === 'boolean') return val ? 'TRUE' : 'FALSE'
                if (val instanceof Date) return `'${val.toISOString()}'`
                if (typeof val === 'object') {
                  // Handle JSON/JSONB objects
                  try {
                    const jsonStr = JSON.stringify(val).replace(/'/g, "''")
                    return `'${jsonStr}'::jsonb`
                  } catch {
                    return `'${String(val).replace(/'/g, "''")}'`
                  }
                }
                if (typeof val === 'number') {
                  return String(val)
                }
                return String(val)
              }).join(', ')
              sqlBackup += `INSERT INTO ${table} (${columns}) VALUES (${values});\n`
            })
            sqlBackup += `-- End of table ${table} (${data.length} rows)\n\n`
          } else {
            // Table exists but is empty
            sqlBackup += `-- Table ${table} is empty (0 rows)\n\n`
          }
        } else {
          // Promise was rejected - skip this table
          const table = optionalTables[optionalTableResults.indexOf(result)]
          skippedTables.push(table)
        }
      }

      sqlBackup += `SET session_replication_role = 'origin';\n\n`
      
      // Add backup summary with actual results
      sqlBackup += `-- ============================================\n`
      sqlBackup += `-- BACKUP SUMMARY\n`
      sqlBackup += `-- ============================================\n`
      sqlBackup += `-- Backup Date: ${new Date().toISOString()}\n`
      sqlBackup += `-- Tables Successfully Backed Up: ${backedUpTables.length}\n`
      if (backedUpTables.length > 0) {
        sqlBackup += `-- Backed Up Tables: ${backedUpTables.join(', ')}\n`
      }
      if (skippedTables.length > 0) {
        sqlBackup += `-- Tables Skipped (do not exist): ${skippedTables.length} (${skippedTables.join(', ')})\n`
      }
      sqlBackup += `-- Total Tables Checked: ${tables.length + optionalTables.length}\n`
      sqlBackup += `-- Note: This backup contains ALL data from ALL existing tables\n`
      sqlBackup += `-- ============================================\n`

      // Create backup blob
      const backupBlob = new Blob([sqlBackup], { type: 'text/sql' })
      const backupSize = backupBlob.size

      // Generate filename with date
      const today = new Date()
      const fileName = `backup-${today.toISOString().split('T')[0]}.sql`

      // Try to upload to Supabase Storage
      let storageUploaded = false
      try {
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('database-backups')
          .upload(fileName, backupBlob, {
            contentType: 'text/sql',
            upsert: true, // Allow overwriting if file exists
            cacheControl: '3600'
          })
        
        if (uploadError) {
          // Log specific error for debugging
          console.error('Storage upload error:', {
            message: uploadError.message,
            statusCode: uploadError.statusCode,
            error: uploadError
          })
          
          // Check for common issues
          if (uploadError.message?.includes('Bucket not found') || uploadError.statusCode === '404') {
            console.error('❌ Storage bucket "database-backups" not found. Please verify the bucket exists in Supabase Dashboard > Storage.')
          } else if (uploadError.message?.includes('new row violates row-level security') || uploadError.statusCode === '403') {
            console.error('❌ Storage bucket permissions issue. Please check bucket policies in Supabase Dashboard > Storage > database-backups > Policies.')
            console.error('   The bucket needs policies that allow authenticated users (admins) to upload files.')
          } else if (uploadError.message?.includes('Payload too large') || uploadError.statusCode === '413') {
            console.error('❌ Backup file is too large for storage. Backup will be stored in database only.')
          } else if (uploadError.statusCode === '400') {
            console.error('❌ Bad Request (400) - This usually means:')
            console.error('   1. Bucket policies are not configured correctly')
            console.error('   2. File size exceeds bucket limit')
            console.error('   3. MIME type restrictions (should allow text/sql)')
            console.error('   Please check bucket settings in Supabase Dashboard > Storage > database-backups')
          } else {
            console.error('❌ Storage upload failed. Backup will be stored in database only.')
          }
        } else {
          storageUploaded = true
        }
      } catch (storageError) {
        // Catch any unexpected errors
        console.error('❌ Unexpected storage error:', storageError)
      }

      // Store backup metadata in database_backups table
      const backupDate = today.toISOString()
      
      // Try to store backup metadata (with SQL data if possible)
      // If SQL is too large, store without sql_data (it will be in storage or can be regenerated)
      let backupRecord = null
      let backupError = null
      
      // Check if SQL backup is too large (PostgreSQL text column limit is ~1GB, but we'll use 10MB as safe limit)
      const maxSqlDataSize = 10 * 1024 * 1024 // 10MB
      const shouldStoreSqlData = backupSize < maxSqlDataSize
      
      try {
        const insertData = {
          file_name: fileName,
          file_size: backupSize,
          backup_date: backupDate,
          status: 'completed',
          backup_type: backupType // 'automatic' or 'manual'
        }
        
        // Only include sql_data if backup is small enough
        if (shouldStoreSqlData) {
          insertData.sql_data = sqlBackup
        } else {
          // For large backups, don't store SQL data in database
          // It should be in storage, or can be regenerated
          insertData.sql_data = null
        }
        
        const { data, error } = await supabase
          .from('database_backups')
          .insert(insertData)
          .select()
          .single()
        
        backupRecord = data
        backupError = error
      } catch (insertError) {
        backupError = insertError
      }

      if (backupError) {
        // If table doesn't exist, throw error
        if (backupError.code === '42P01' || backupError.code === 'PGRST116') {
          throw new Error('Backup storage table not configured. Please run CREATE_DATABASE_BACKUPS_TABLE.sql')
        }
        
        // If it's a network error or size issue, try storing without sql_data
        if (backupError.message?.includes('Failed to fetch') || 
            backupError.message?.includes('QUIC') ||
            backupError.message?.includes('too large') ||
            backupSize > maxSqlDataSize) {
          console.warn('Backup SQL is too large or network error occurred. Storing metadata without SQL data...')
          
          try {
            const { data, error: retryError } = await supabase
              .from('database_backups')
              .insert({
                file_name: fileName,
                file_size: backupSize,
                backup_date: backupDate,
                status: 'completed',
                backup_type: backupType,
                sql_data: null // Don't store large SQL in database
              })
              .select()
              .single()
            
            if (!retryError) {
              backupRecord = data
            } else {
              // If we still can't store metadata, create minimal record
              backupRecord = {
                file_name: fileName,
                file_size: backupSize,
                backup_date: backupDate,
                status: 'completed',
                sql_data: null
              }
            }
          } catch (retryError) {
            // Create a minimal backup record object for return
            backupRecord = {
              file_name: fileName,
              file_size: backupSize,
              backup_date: backupDate,
              status: 'completed',
              sql_data: null
            }
          }
        } else {
          // For other errors, create a minimal record
          backupRecord = {
            file_name: fileName,
            file_size: backupSize,
            backup_date: backupDate,
            status: 'completed',
            sql_data: null
          }
        }
      }

      // Auto-cleanup: Delete automatic backups older than 5 weeks (keep only 5 most recent)
      // Manual backups are never deleted automatically
      // This is handled by database trigger, but we also do it here as backup
      // Only run cleanup if we successfully stored the backup record and it's an automatic backup
      if (backupRecord && backupRecord.id && backupType === 'automatic') {
        try {
          const { data: allAutomaticBackups, error: listError } = await supabase
            .from('database_backups')
            .select('id, file_name')
            .eq('backup_type', 'automatic')
            .order('backup_date', { ascending: false })

          if (!listError && allAutomaticBackups && allAutomaticBackups.length > 5) {
            const backupsToDelete = allAutomaticBackups.slice(5)
            const idsToDelete = backupsToDelete.map(b => b.id)
            
            // Delete from database
            await supabase
              .from('database_backups')
              .delete()
              .in('id', idsToDelete)

            // Try to delete files from storage (only if bucket exists - check via storageUploaded flag)
            const filesToDelete = backupsToDelete.map(b => b.file_name).filter(Boolean)
            if (filesToDelete.length > 0 && storageUploaded) {
              try {
                await supabase.storage
                  .from('database-backups')
                  .remove(filesToDelete)
              } catch (storageError) {
                // Silently ignore storage errors - bucket may not exist
              }
            }
          }
        } catch (cleanupError) {
          // Silently ignore cleanup errors - don't fail backup
        }
      }

      // Return backup record (even if metadata storage failed, we still have the SQL backup)
      // If backupRecord exists, return it; otherwise create a minimal record
      // Note: The SQL backup data is stored in sqlBackup variable but may be too large for database
      // For large backups, the SQL will need to be stored in storage or downloaded directly
      if (backupRecord) {
        return backupRecord
      } else {
          // Create a minimal backup record if metadata storage failed
          // The actual SQL backup was created successfully, just couldn't store metadata
          return {
            file_name: fileName,
            file_size: backupSize,
            backup_date: backupDate,
            status: 'completed',
            backup_type: backupType,
            sql_data: null // SQL data too large or storage failed
          }
      }
    } catch (error) {
      // Only log critical errors that prevent backup creation
      if (error.message && error.message.includes('Backup storage table not configured')) {
        console.error('Backup storage table not configured. Please run CREATE_DATABASE_BACKUPS_TABLE.sql')
        throw error // Re-throw configuration errors
      }
      // For other errors, the SQL backup was likely created successfully
      // Throw error only if it's a critical failure
      throw error
    }
  },

  // System Logging Functions
  async logSystemEvent(level, category, message, details = null, userId = null, skipSettingsCheck = false) {
    if (!supabase) {
      return // Fail silently if Supabase not configured
    }

    try {
      // Check if system logging is enabled (skip check during settings operations to avoid circular dependency)
      if (!skipSettingsCheck) {
        try {
          const settings = await this.getSettings()
          if (settings?.enableSystemLogs === false) {
            return // Logging is disabled
          }
        } catch (_) {
          // If settings check fails, continue logging (don't block logging due to settings errors)
        }
      }

      // Get user ID from auth if not provided
      if (!userId) {
        try {
          const { data: { user } } = await supabase.auth.getUser()
          userId = user?.id || null
        } catch (_) {
          // User not authenticated, continue without user_id
        }
      }

      const { error } = await supabase
        .from('system_logs')
        .insert({
          level: level || 'info',
          category: category || 'system',
          message: message || '',
          details: details || null,
          user_id: userId || null,
          created_at: new Date().toISOString()
        })

      if (error) {
        // Don't throw error, just log to console to avoid infinite loops
        // Only log if it's not a table-not-exists error (which is expected on first run)
        if (error.code !== '42P01' && error.code !== 'PGRST116') {
          console.warn('Failed to log system event:', error.message)
        }
      }
    } catch (error) {
      // Fail silently to prevent logging errors from breaking the application
      console.warn('Error in logSystemEvent:', error.message)
    }
  },

  async cleanupOldSystemLogs(retentionDays = null) {
    if (!supabase) {
      throw new Error('Supabase not configured')
    }

    try {
      // Load retention from settings dynamically if not provided
      if (retentionDays === null) {
        const settings = await this.getSettings()
        if (settings?.logRetentionDays && Number.isFinite(settings.logRetentionDays)) {
          retentionDays = settings.logRetentionDays
        } else {
          retentionDays = 30 // Default fallback
        }
      }

      // Check if system logging is enabled
      const settings = await this.getSettings()
      if (settings?.enableSystemLogs === false) {
        return { deletedCount: 0, message: 'System logging is disabled' }
      }

      // Cleanup old logs directly (avoid RPC dependency)
      const cutoffDate = new Date()
      cutoffDate.setDate(cutoffDate.getDate() - retentionDays)
      
      const { data: logsToDelete, error: selectError } = await supabase
        .from('system_logs')
        .select('id')
        .lt('created_at', cutoffDate.toISOString())

      if (selectError) {
        // If table doesn't exist, return success with 0 deleted
        if (selectError.code === '42P01' || selectError.code === 'PGRST116') {
          return { deletedCount: 0, retentionDays, message: 'System logs table does not exist yet' }
        }
        console.warn('Error selecting logs to delete:', selectError)
        throw selectError
      }

      let deletedCount = 0
      if (logsToDelete && logsToDelete.length > 0) {
        const idsToDelete = logsToDelete.map(log => log.id)
        const { error: deleteError } = await supabase
          .from('system_logs')
          .delete()
          .in('id', idsToDelete)

        if (deleteError) {
          console.warn('Error deleting old logs:', deleteError)
          throw deleteError
        }

        deletedCount = idsToDelete.length
      }

      return { deletedCount, retentionDays }
    } catch (error) {
      console.error('Error cleaning up old system logs:', error)
      throw error
    }
  },

  async getSystemLogs(limit = 100, level = null, category = null, startDate = null, endDate = null) {
    if (!supabase) {
      throw new Error('Supabase not configured')
    }

    try {
      let query = supabase
        .from('system_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit)

      if (level) {
        query = query.eq('level', level)
      }

      if (category) {
        query = query.eq('category', category)
      }

      if (startDate) {
        query = query.gte('created_at', startDate)
      }

      if (endDate) {
        query = query.lte('created_at', endDate)
      }

      const { data, error } = await query

      if (error) throw error
      return data || []
    } catch (error) {
      console.error('Error fetching system logs:', error)
      throw error
    }
  },

  // System Health Checks
  async checkSystemHealth() {
    if (!supabase) {
      throw new Error('Supabase not configured')
    }

    const healthStatus = {
      database: 'error',
      email: 'warning', // Email service check is limited client-side
      storage: 'error',
      timestamp: new Date().toISOString()
    }

    try {
      // Check Database Connection
      try {
        const startTime = Date.now()
        const { error: dbError } = await supabase
          .from('system_settings')
          .select('id')
          .limit(1)
        
        if (dbError) {
          healthStatus.database = 'error'
        } else {
          const responseTime = Date.now() - startTime
          // Healthy if response time is reasonable (< 1000ms)
          healthStatus.database = responseTime < 1000 ? 'healthy' : 'warning'
        }
      } catch (error) {
        console.error('Database health check failed:', error)
        healthStatus.database = 'error'
      }

      // Check Storage Service
      try {
        // Try to list buckets (this checks if storage is accessible)
        const { data: buckets, error: storageError } = await supabase.storage.listBuckets()
        
        if (storageError) {
          // Check error type
          const errorMsg = storageError.message?.toLowerCase() || ''
          // Permission errors (401, 403) indicate service is up but access is restricted
          if (errorMsg.includes('permission') || errorMsg.includes('401') || errorMsg.includes('403')) {
            // Storage service is accessible but permissions are restricted
            healthStatus.storage = 'warning'
          } else if (errorMsg.includes('not found') || errorMsg.includes('does not exist')) {
            // Service might be accessible but bucket doesn't exist
            healthStatus.storage = 'warning'
          } else {
            // Other errors indicate service might be down
            healthStatus.storage = 'error'
          }
        } else {
          // Successfully listed buckets (even if empty array) - service is healthy
          healthStatus.storage = 'healthy'
        }
      } catch (error) {
        console.error('Storage health check failed:', error)
        // Fallback: try to access a common bucket to verify service
        try {
          // Try listing from a common bucket (donations, profiles, or database-backups)
          const { error: testError } = await supabase.storage.from('donations').list('', { limit: 1 })
          
          if (testError) {
            const errorMsg = testError.message?.toLowerCase() || ''
            if (errorMsg.includes('not found') || errorMsg.includes('does not exist') || errorMsg.includes('bucket')) {
              // Bucket doesn't exist but storage service is accessible
              healthStatus.storage = 'warning'
            } else if (errorMsg.includes('permission') || errorMsg.includes('401') || errorMsg.includes('403')) {
              // Permission issue - service is up
              healthStatus.storage = 'warning'
            } else {
              // Service error
              healthStatus.storage = 'error'
            }
          } else {
            // Successfully accessed bucket
            healthStatus.storage = 'healthy'
          }
        } catch (e) {
          // If all checks fail, mark as error
          healthStatus.storage = 'error'
        }
      }

      // Email Service Check (limited - we can only check if Supabase is configured)
      // In a real implementation, this would check an email service API
      // For now, we assume it's working if Supabase is configured
      // Email service is typically handled server-side, so we mark as warning
      // (needs server-side verification for accurate status)
      healthStatus.email = 'warning' // Default to warning since we can't fully verify client-side

    } catch (error) {
      console.error('System health check error:', error)
    }

    return healthStatus
  },

  // Automatic maintenance function that runs both cleanup tasks
  async runAutomaticMaintenance() {
    if (!supabase) {
      throw new Error('Supabase not configured')
    }

    try {
      const results = {
        logsCleaned: { deletedCount: 0 },
        donationsExpired: { expiredCount: 0, archivedCount: 0 },
        timestamp: new Date().toISOString()
      }

      // Cleanup old system logs
      try {
        results.logsCleaned = await this.cleanupOldSystemLogs()
      } catch (error) {
        console.error('Error in log cleanup:', error)
        results.logsCleaned.error = error.message
      }

      // Process expired donations
      try {
        results.donationsExpired = await this.autoExpireDonations()
      } catch (error) {
        console.error('Error in donation expiry:', error)
        results.donationsExpired.error = error.message
      }

      // Log maintenance completion (skip settings check to avoid circular dependency)
      await this.logSystemEvent('info', 'system', 'Automatic maintenance completed', results, null, true)

      return results
    } catch (error) {
      console.error('Error running automatic maintenance:', error)
      await this.logSystemEvent('error', 'system', `Error running automatic maintenance: ${error.message}`, { error })
      throw error
    }
  },

  async deleteDatabaseBackup(backupId) {
    if (!supabase) {
      throw new Error('Supabase not configured')
    }

    try {
      // Get backup record first to get file_name for storage deletion
      const { data: backup, error: backupError } = await supabase
        .from('database_backups')
        .select('id, file_name')
        .eq('id', backupId)
        .single()

      if (backupError) throw backupError

      // Delete from storage if file exists
      if (backup.file_name) {
        try {
          const { error: storageError } = await supabase.storage
            .from('database-backups')
            .remove([backup.file_name])

          // Log warning if storage deletion fails, but don't fail the whole operation
          if (storageError) {
            console.warn('Failed to delete backup file from storage:', storageError)
          }
        } catch (storageError) {
          // Silently continue if storage bucket doesn't exist or file is missing
          console.warn('Storage deletion error (non-critical):', storageError)
        }
      }

      // Delete from database
      const { error: deleteError } = await supabase
        .from('database_backups')
        .delete()
        .eq('id', backupId)

      if (deleteError) throw deleteError

      return { success: true }
    } catch (error) {
      console.error('Error deleting database backup:', error)
      throw error
    }
  },

  async downloadDatabaseBackup(backupId) {
    if (!supabase) {
      throw new Error('Supabase not configured')
    }

    try {
      // Get backup record
      const { data: backup, error: backupError } = await supabase
        .from('database_backups')
        .select('*')
        .eq('id', backupId)
        .single()

      if (backupError) throw backupError

      // Try to download from storage first
      if (backup.file_name) {
        try {
          const { data: fileData, error: downloadError } = await supabase.storage
            .from('database-backups')
            .download(backup.file_name)

          if (!downloadError && fileData) {
            return fileData
          }
        } catch (storageError) {
          console.warn('File not found in storage, using database backup:', storageError)
        }
      }

      // Fallback: Use SQL data stored in database
      if (backup.sql_data) {
        const blob = new Blob([backup.sql_data], { type: 'text/sql' })
        return blob
      }

      // Last resort: Regenerate SQL from current database state
      const tables = [
        'users', 
        'donations', 
        'donation_requests', 
        'donation_claims',
        'events', 
        'event_attendance', 
        'event_items',
        'feedback_ratings', 
        'platform_feedback',
        'notifications', 
        'settings', 
        'smart_matches',
        'deliveries', 
        'pickups', 
        // 'direct_deliveries' - merged into deliveries table with delivery_mode='direct'
        'database_backups'
      ]

      let sqlBackup = `-- HopeLink Database Backup\n-- Generated: ${new Date().toISOString()}\n-- Backup Date: ${backup.backup_date}\n\n`
      sqlBackup += `SET session_replication_role = 'replica';\n\n`

      for (const table of tables) {
        try {
          // For database_backups table, exclude sql_data column
          const selectColumns = table === 'database_backups' 
            ? 'id, file_name, file_size, backup_date, status, created_at, updated_at'
            : '*'

          const { data, error } = await supabase
            .from(table)
            .select(selectColumns)

          if (error) continue

          sqlBackup += `\n-- Table: ${table}\n`
          sqlBackup += `DELETE FROM ${table};\n\n`
          
          if (data && data.length > 0) {
            data.forEach(row => {
              const columns = Object.keys(row).join(', ')
              const values = Object.values(row).map(val => {
                if (val === null) return 'NULL'
                if (typeof val === 'string') return `'${val.replace(/'/g, "''")}'`
                if (typeof val === 'boolean') return val ? 'TRUE' : 'FALSE'
                if (val instanceof Date) return `'${val.toISOString()}'`
                if (typeof val === 'object') {
                  try {
                    const jsonStr = JSON.stringify(val).replace(/'/g, "''")
                    return `'${jsonStr}'::jsonb`
                  } catch {
                    return `'${String(val).replace(/'/g, "''")}'`
                  }
                }
                return val
              }).join(', ')
              sqlBackup += `INSERT INTO ${table} (${columns}) VALUES (${values});\n`
            })
          }
          sqlBackup += '\n'
        } catch (tableError) {
          console.warn(`Error processing table ${table}:`, tableError)
        }
      }

      sqlBackup += `SET session_replication_role = 'origin';\n`
      const blob = new Blob([sqlBackup], { type: 'text/sql' })
      return blob
    } catch (error) {
      console.error('Error downloading database backup:', error)
      throw error
    }
  }
}

// Export the supabase client and helper functions
export { supabase }
export default db