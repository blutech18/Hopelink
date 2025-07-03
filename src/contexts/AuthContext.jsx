import React, { createContext, useContext, useEffect, useState, useRef } from 'react'
import { supabase, db } from '../lib/supabase'
import { authDebug } from '../lib/devUtils'

const AuthContext = createContext({})

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [session, setSession] = useState(null)
  
  // Simple cache to prevent repeated profile loading
  const profileCacheRef = useRef(new Map())

  // Failsafe: Force stop loading after 10 seconds to prevent infinite loading
  useEffect(() => {
    const failsafeTimeout = setTimeout(() => {
      console.log('🔒 Auth initialization timeout reached - completing authentication flow')
      setLoading(false)
    }, 10000)

    return () => clearTimeout(failsafeTimeout)
  }, [])

  // Additional safeguard: prevent loading state from lasting too long
  useEffect(() => {
    if (loading) {
      const maxLoadingTimeout = setTimeout(() => {
        console.warn('⚠️ Loading state lasted too long, forcing completion')
        setLoading(false)
      }, 12000)

      return () => clearTimeout(maxLoadingTimeout)
    }
  }, [loading])

  useEffect(() => {
    let mounted = true
    
    const initializeAuth = async () => {
      try {
        // Only initialize auth if Supabase is available
        if (!supabase) {
          console.warn('Supabase not configured. Please set up your environment variables.')
          if (mounted) {
            setLoading(false)
          }
          return
        }

        // Get initial session
        const { data: { session } } = await supabase.auth.getSession()
        
        if (!mounted) return

        setSession(session)
        setUser(session?.user ?? null)
        
        if (session?.user) {
          await loadUserProfile(session.user.id)
        } else {
          setLoading(false)
        }

        // Listen for auth changes
        const {
          data: { subscription },
        } = supabase.auth.onAuthStateChange(async (event, session) => {
          if (!mounted) return
          
          console.log('Auth state changed:', event, session?.user?.email)
          setSession(session)
          setUser(session?.user ?? null)
          
          if (session?.user) {
            try {
              await loadUserProfile(session.user.id)
            } catch (profileError) {
              console.error('Error loading profile after auth change:', profileError)
              // Don't block the auth flow if profile loading fails
              // Just set profile to null and let the user continue
              setProfile(null)
              setLoading(false)
            }
          } else {
            setProfile(null)
            setLoading(false)
          }
        })

        return () => {
          subscription.unsubscribe()
        }
      } catch (error) {
        console.error('Error initializing auth:', error)
        if (mounted) {
          setLoading(false)
        }
      }
    }

    const cleanup = initializeAuth()

    return () => {
      mounted = false
      cleanup?.then(unsubscribe => unsubscribe?.())
    }
  }, [])

  const loadUserProfile = async (userId) => {
    if (!userId) {
      console.log('🔒 No user ID provided, stopping loading')
      setLoading(false)
      return
    }

    // Check cache first
    const cachedProfile = profileCacheRef.current.get(userId)
    if (cachedProfile) {
      console.log('📋 Using cached profile for user:', userId)
      setProfile(cachedProfile)
      setLoading(false)
      return
    }

    authDebug.logProfileLoading(userId, 'START')

    try {
      // Retry logic with exponential backoff
      let attempt = 0
      const maxAttempts = 3
      let userProfile = null
      
      while (attempt < maxAttempts && !userProfile) {
        try {
          const timeout = Math.min(5000 + (attempt * 2000), 15000) // 5s, 7s, 9s
          const profilePromise = db.getProfile(userId)
          const timeoutPromise = new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Profile loading timeout')), timeout)
          )
          
          userProfile = await Promise.race([profilePromise, timeoutPromise])
          break
        } catch (retryError) {
          attempt++
          if (attempt >= maxAttempts) {
            throw retryError
          }
          // Wait before retry (exponential backoff)
          await new Promise(resolve => setTimeout(resolve, 1000 * attempt))
          console.log(`Profile loading attempt ${attempt + 1}/${maxAttempts}`)
        }
      }
      
             if (userProfile) {
         authDebug.logProfileLoading(userId, 'SUCCESS', userProfile)
         // Cache the profile for future use
         profileCacheRef.current.set(userId, userProfile)
         setProfile(userProfile)
         setLoading(false)
         return
       } else {
         // Profile is null - user doesn't exist in database yet
         console.log('Profile is null, user may need to be created from metadata')
         throw new Error('Profile not found - needs creation from metadata')
       }
    } catch (error) {
      authDebug.logProfileLoading(userId, 'ERROR', { error: error.message, code: error.code })
      console.error('Error loading user profile:', error)
      
             // If profile doesn't exist, times out, or profile is null, try to create from metadata
       if (error.code === 'PGRST116' || 
           error.message?.includes('No rows found') || 
           error.message?.includes('Profile loading timeout') ||
           error.message?.includes('Profile not found')) {
        try {
          authDebug.logProfileLoading(userId, 'FALLBACK_TO_METADATA')
          // Get the current user to access metadata
          const { data: { user: currentUser } } = await supabase.auth.getUser()
          
          console.log('Current user metadata:', currentUser?.user_metadata)
          
          if (currentUser?.user_metadata && currentUser.user_metadata.name) {
            // Try to create profile from user metadata
            const profileData = {
              email: currentUser.email,
              name: currentUser.user_metadata.name,
              role: currentUser.user_metadata.role,
              account_type: currentUser.user_metadata.accountType || 'individual',
              phone_number: currentUser.user_metadata.phone || '09000000000',
              address: currentUser.user_metadata.address || 'Philippines',
              city: currentUser.user_metadata.city || 'Cagayan de Oro City',
              province: 'Misamis Oriental',
              zip_code: currentUser.user_metadata.zipcode || '9000'
            }
            
            // Ensure we have a valid role from metadata
            if (!profileData.role || !['donor', 'recipient', 'volunteer', 'admin'].includes(profileData.role)) {
              console.error('Invalid or missing role in user metadata:', currentUser.user_metadata.role)
              authDebug.logProfileLoading(userId, 'INVALID_ROLE', { role: currentUser.user_metadata.role })
              setProfile(null)
              setLoading(false)
              return
            }
            
            // Add role-specific fields
            if (currentUser.user_metadata.role === 'donor') {
              profileData.donation_types = currentUser.user_metadata.donationTypes || []
              profileData.bio = currentUser.user_metadata.bio || null
              // Only set organization fields if account type is business
              if (currentUser.user_metadata.accountType === 'business') {
                profileData.organization_name = currentUser.user_metadata.organizationName || null
                profileData.website_link = currentUser.user_metadata.websiteLink || null
              }
              // Initialize ID fields as empty for completion
              profileData.primary_id_type = null
              profileData.primary_id_number = null
            } else if (currentUser.user_metadata.role === 'volunteer') {
              profileData.has_vehicle = currentUser.user_metadata.hasVehicle || false
              profileData.vehicle_type = currentUser.user_metadata.vehicleType || null
              profileData.max_delivery_distance = currentUser.user_metadata.maxDeliveryDistance || 20
              profileData.volunteer_experience = currentUser.user_metadata.volunteerExperience || null
              profileData.background_check_consent = currentUser.user_metadata.backgroundCheckConsent || false
              profileData.availability_days = currentUser.user_metadata.availabilityDays || []
              profileData.availability_times = currentUser.user_metadata.availabilityTimes || []
              // Initialize ID fields - volunteers need driver's license
              profileData.primary_id_type = null
              profileData.primary_id_number = null
            } else if (currentUser.user_metadata.role === 'recipient') {
              profileData.household_size = currentUser.user_metadata.householdSize || null
              profileData.assistance_needs = currentUser.user_metadata.assistanceNeeds || []
              profileData.emergency_contact_name = currentUser.user_metadata.emergencyContactName || null
              profileData.emergency_contact_phone = currentUser.user_metadata.emergencyContactPhone || null
              // Initialize ID fields as empty for completion
              profileData.primary_id_type = null
              profileData.primary_id_number = null
            } else if (currentUser.user_metadata.role === 'admin') {
              // Admin users don't require ID verification and are automatically verified
              profileData.is_verified = true
              // No additional fields required for admins
            }
            
            console.log('Creating profile from metadata:', profileData)
            authDebug.logProfileLoading(userId, 'CREATING_FROM_METADATA', profileData)
            const newProfile = await db.createProfile(userId, profileData)
            console.log('Created profile:', newProfile)
            authDebug.logProfileLoading(userId, 'CREATED_FROM_METADATA', newProfile)
            // Cache the new profile
            profileCacheRef.current.set(userId, newProfile)
            setProfile(newProfile)
            setLoading(false)
            return
          } else {
            console.log('No user metadata found or name missing, user might need to complete signup')
            authDebug.logProfileLoading(userId, 'NO_METADATA')
          }
        } catch (createError) {
          console.error('Error creating profile from metadata:', createError)
          authDebug.logProfileLoading(userId, 'METADATA_ERROR', { error: createError.message })
        }
      }
      
      // If all else fails, set profile to null and stop loading
      authDebug.logProfileLoading(userId, 'FINAL_FAILURE')
      setProfile(null)
      setLoading(false)
    }
  }

  const signUp = async (email, password, userData) => {
    if (!supabase) {
      throw new Error('Supabase not configured. Please set up your environment variables.')
    }
    
    console.log('AUTHCONTEXT SIGNUP - USERDATA:', userData)
    console.log('AUTHCONTEXT SIGNUP - ROLE FIELD:', userData.role)
    
    // Validate that role is correctly set
    if (!userData.role || !['donor', 'recipient', 'volunteer', 'admin'].includes(userData.role)) {
      throw new Error(`Invalid role provided: ${userData.role}. Must be one of: donor, recipient, volunteer, admin`)
    }
    
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: userData,
        emailRedirectTo: `${window.location.origin}/login?verified=true`
      }
    })
    
    console.log('SUPABASE SIGNUP RESPONSE:', data)
    console.log('SUPABASE USER METADATA:', data?.user?.user_metadata)
    
    if (error) throw error
    
    // If user was created successfully, the profile will be created automatically
    // by the auth state change listener calling loadUserProfile
    if (data.user && !data.session) {
      console.log('Email confirmation required for:', email)
    }
    
    return data
  }

  const signIn = async (email, password) => {
    if (!supabase) {
      throw new Error('Supabase not configured. Please set up your environment variables.')
    }
    
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })
    
    if (error) throw error
    return data
  }

  // Provide fallback functions when supabase is not configured
  const signInFallback = async (email, password) => {
    throw new Error('Authentication service not configured. Please check your environment variables.')
  }

  const signUpFallback = async (email, password, userData) => {
    throw new Error('Authentication service not configured. Please check your environment variables.')
  }

  const signOut = async () => {
    authDebug.logSignOut('START')
    
    try {
      // Always clear local state first to ensure UI updates immediately
      setUser(null)
      setProfile(null)
      setSession(null)
      // Clear profile cache
      profileCacheRef.current.clear()
      authDebug.logSignOut('LOCAL_STATE_CLEARED')
      
      if (!supabase) {
        // If no Supabase, local state is already cleared
        console.log('Sign out completed (no Supabase connection)')
        authDebug.logSignOut('COMPLETED_NO_SUPABASE')
        return
      }
      
      // Attempt to sign out from Supabase
      const { error } = await supabase.auth.signOut()
      
      if (error) {
        console.error('Error during Supabase sign out:', error)
        authDebug.logSignOut('SUPABASE_ERROR', { error: error.message })
        // Even if Supabase sign out fails, we've already cleared local state
        // This ensures the user can still "sign out" from the UI perspective
      } else {
        console.log('Successfully signed out from Supabase')
        authDebug.logSignOut('SUPABASE_SUCCESS')
      }
    } catch (error) {
      console.error('Unexpected error during sign out:', error)
      authDebug.logSignOut('UNEXPECTED_ERROR', { error: error.message })
      // Ensure state is cleared even if there's an unexpected error
      setUser(null)
      setProfile(null)
      setSession(null)
    }
    
    authDebug.logSignOut('COMPLETED')
  }

  // Provide fallback signOut function when supabase is not configured
  const signOutFallback = async () => {
    console.log('Sign out completed (no authentication service)')
    setUser(null)
    setProfile(null)
    setSession(null)
    profileCacheRef.current.clear()
  }

  const updateProfile = async (updates) => {
    if (!user) throw new Error('No user logged in')
    
    try {
      const updatedProfile = await db.updateProfile(user.id, updates)
      // Update cache with new profile data
      profileCacheRef.current.set(user.id, updatedProfile)
      setProfile(updatedProfile)
      return updatedProfile
    } catch (error) {
      console.error('Error updating profile:', error)
      throw error
    }
  }

  const resetPassword = async (email) => {
    if (!supabase) {
      throw new Error('Supabase not configured. Please set up your environment variables.')
    }
    
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    })
    
    if (error) throw error
  }

  const updatePassword = async (newPassword) => {
    if (!supabase) {
      throw new Error('Supabase not configured. Please set up your environment variables.')
    }
    
    const { error } = await supabase.auth.updateUser({
      password: newPassword
    })
    
    if (error) throw error
  }

  const value = {
    user,
    profile,
    session,
    loading,
    signUp: supabase ? signUp : signUpFallback,
    signIn: supabase ? signIn : signInFallback,
    signOut: supabase ? signOut : signOutFallback,
    updateProfile,
    resetPassword,
    updatePassword,
    // Helper functions
    isAuthenticated: !!user,
    isDonor: profile?.role === 'donor',
    isRecipient: profile?.role === 'recipient',
    isVolunteer: profile?.role === 'volunteer',
    isAdmin: profile?.role === 'admin',
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
} 