import React, { createContext, useContext, useEffect, useState, useRef } from 'react'
import { supabase, db } from '../lib/supabase'
import { authDebug } from '../lib/devUtils'

// Global flag to track profile creation status across auth flows
let profileCreationInProgress = false

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
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)
  const [isHandlingGoogleCallback, setIsHandlingGoogleCallback] = useState(false)
  const [isSigningOut, setIsSigningOut] = useState(false)
  const [isSigningIn, setIsSigningIn] = useState(false)
  
  // Simple cache to prevent repeated profile loading
  const profileCacheRef = useRef(new Map())

  // Failsafe: Force stop loading after 5 seconds to prevent infinite loading (optimized)
  useEffect(() => {
    const failsafeTimeout = setTimeout(() => {
      console.log('🔒 Auth initialization timeout reached - completing authentication flow')
      setLoading(false)
    }, 5000)

    return () => clearTimeout(failsafeTimeout)
  }, [])

  // Additional safeguard: prevent loading state from lasting too long (optimized)
  useEffect(() => {
    if (loading) {
      const maxLoadingTimeout = setTimeout(() => {
        console.warn('⚠️ Loading state lasted too long, forcing completion')
        setLoading(false)
      }, 6000)

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
            // Skip profile loading if we're handling Google callback
            if (isHandlingGoogleCallback) {
              console.log('Skipping profile loading during Google callback')
              setLoading(false)
              return
            }
            
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
    
    // Check if profile creation is already in progress elsewhere (like in Google callback)
    if (profileCreationInProgress) {
      console.log('⚠️ Profile creation already in progress elsewhere, skipping duplicate attempt')
      authDebug.logProfileLoading(userId, 'SKIPPED_DUPLICATE_ATTEMPT')
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
      // Single fast attempt - no retries for maximum speed
      const userProfile = await db.getProfile(userId)
      
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
      // Only log if it's NOT an expected "profile not found" scenario
      const isExpectedError = error.code === 'PGRST116' || 
                             error.message?.includes('No rows found') || 
                             error.message?.includes('Profile not found')
      
      if (!isExpectedError) {
        authDebug.logProfileLoading(userId, 'ERROR', { error: error.message, code: error.code })
        console.error('Error loading user profile:', error)
      } else {
        authDebug.logProfileLoading(userId, 'NOT_FOUND')
      }
      
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
          
          // Check for pending Google signup role data first
          // IMPORTANT: Don't create profile here during Google signup flow
          // Let handleGoogleCallback do it after checking for existing accounts
          const pendingRoleData = localStorage.getItem('pendingGoogleSignupRole')
          
          // Skip profile creation if there's pending Google signup data
          // The callback handler will create the profile after verifying no existing account
          if (pendingRoleData) {
            console.log('⏭️ Skipping profile creation in loadUserProfile - pending Google signup detected')
            authDebug.logProfileLoading(userId, 'SKIPPED_PENDING_GOOGLE_SIGNUP')
            setProfile(null)
            setLoading(false)
            return
          }
          
          // Check for name or full_name in metadata for regular (non-Google) signups
          const userName = currentUser?.user_metadata?.full_name || currentUser?.user_metadata?.name
          
          if (currentUser?.user_metadata && userName) {
            // Set flag to prevent duplicate profile creation
            profileCreationInProgress = true
            console.log('🔄 Profile creation from metadata started in loadUserProfile, flag set')
            
            // Try to create profile from user metadata
            const profileData = {
              email: currentUser.email,
              name: userName,
              role: currentUser.user_metadata.role,
              account_type: currentUser.user_metadata.accountType || 'individual',
              phone_number: currentUser.user_metadata.phone || '09000000000',
              address: currentUser.user_metadata.address || 'Philippines',
              city: currentUser.user_metadata.city || 'Cagayan de Oro City',
              province: 'Misamis Oriental',
              zip_code: currentUser.user_metadata.zipcode || currentUser.user_metadata.zip_code || '9000'
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
            
            // Reset flag after successful profile creation
            profileCreationInProgress = false
            console.log('🔄 Profile creation from metadata completed, flag cleared')
            return
          } else {
            console.log('No user metadata found or name missing, user might need to complete signup')
            authDebug.logProfileLoading(userId, 'NO_METADATA')
          }
        } catch (createError) {
          console.error('Error creating profile from metadata:', createError)
          authDebug.logProfileLoading(userId, 'METADATA_ERROR', { error: createError.message })
          // Reset flag in case of error
          profileCreationInProgress = false
          console.log('🔄 Profile creation from metadata failed, flag cleared')
        }
      }
      
      // This fallback is now handled earlier in the function
      
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
    
    try {
      // Set signing in flag for smooth transition
      setIsSigningIn(true)
      
      console.log('AUTHCONTEXT SIGNUP - USERDATA:', userData)
      console.log('AUTHCONTEXT SIGNUP - ROLE FIELD:', userData.role)
      
      // Validate that role is correctly set
      if (!userData.role || !['donor', 'recipient', 'volunteer', 'admin'].includes(userData.role)) {
        throw new Error(`Invalid role provided: ${userData.role}. Must be one of: donor, recipient, volunteer, admin`)
      }
      
      // Check if email exists in our users table before attempting signup
      const isEmailAvailable = await db.checkEmailAvailability(email)
      if (!isEmailAvailable) {
        throw new Error('This email is already registered. Please login instead.')
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
      
      if (error) {
        // Check if error is about existing user
        const errMsg = error.message || ''
        if (errMsg.toLowerCase().includes('already registered') || 
            errMsg.toLowerCase().includes('user already exists') ||
            errMsg.toLowerCase().includes('duplicate')) {
          throw new Error('This email is already registered. Please login instead.')
        }
        throw error
      }
      
      // If user was created successfully, the profile will be created automatically
      // by the auth state change listener calling loadUserProfile
      if (data.user && !data.session) {
        console.log('Email confirmation required for:', email)
      }
      
      // Keep signing in flag active for smooth transition
      if (data.session) {
        setTimeout(() => {
          setIsSigningIn(false)
        }, 1000)
      } else {
        setIsSigningIn(false)
      }
      
      return data
    } catch (error) {
      setIsSigningIn(false)
      throw error
    }
  }

  const signIn = async (email, password) => {
    if (!supabase) {
      throw new Error('Supabase not configured. Please set up your environment variables.')
    }
    
    try {
      // Set signing in flag for smooth transition
      setIsSigningIn(true)
      
      // Note: Failed login attempts will show as 400 errors in browser Network tab
      // This is normal browser behavior for HTTP requests and cannot be suppressed
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })
      
      if (error) {
        const msg = (error.message || '').toLowerCase()
        if (msg.includes('email not confirmed') || msg.includes('email not confirmed')) {
          throw new Error('Email not confirmed. Please check your email inbox for the verification link, then try again.')
        }
        // Handle invalid credentials / 400 responses more clearly
        if (error.status === 400 || msg.includes('invalid login credentials') || msg.includes('invalid_grant')) {
          // Check if this account was created with Google OAuth
          throw new Error('Invalid email or password. If you signed up with Google, please use the "Continue with Google" button instead.')
        }
        throw error
      }

      // If user is not yet verified, sign out and instruct to verify email first
      try {
        const { data: userData } = await supabase.auth.getUser()
        const confirmedAt = userData?.user?.email_confirmed_at || userData?.user?.confirmed_at
        if (!confirmedAt) {
          await supabase.auth.signOut()
          setIsSigningIn(false)
          throw new Error('Please verify your email to activate your account. Check your inbox for the confirmation link.')
        }
      } catch (checkErr) {
        if (checkErr?.message?.includes('Please verify your email')) {
          throw checkErr
        }
        // Fall through if we can't determine, continue normal flow
      }
      
      // Keep signing in flag active for smooth transition
      setTimeout(() => {
        setIsSigningIn(false)
      }, 1000)
      
      return data
    } catch (error) {
      setIsSigningIn(false)
      throw error
    }
  }

  // Provide fallback functions when supabase is not configured
  const signInFallback = async (email, password) => {
    throw new Error('Authentication service not configured. Please check your environment variables.')
  }

  const signUpFallback = async (email, password, userData) => {
    throw new Error('Authentication service not configured. Please check your environment variables.')
  }

  const signInWithGoogle = async () => {
    if (!supabase) {
      throw new Error('Supabase not configured. Please set up your environment variables.')
    }
    
    try {
      // Set signing in flag for smooth transition
      setIsSigningIn(true)
      
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`
        }
      })
      
      if (error) throw error
      return data
    } catch (error) {
      setIsSigningIn(false)
      throw error
    }
  }

  const signUpWithGoogle = async (roleData) => {
    if (!supabase) {
      throw new Error('Supabase not configured. Please set up your environment variables.')
    }
    
    try {
      // Set signing in flag for smooth transition
      setIsSigningIn(true)
      
      // Store role data in localStorage temporarily for the callback
      if (roleData) {
        console.log('Storing role data for Google signup:', roleData)
        localStorage.setItem('pendingGoogleSignupRole', JSON.stringify(roleData))
        
        // Verify storage was successful
        const storedData = localStorage.getItem('pendingGoogleSignupRole')
        console.log('Verified stored role data:', storedData)
      } else {
        console.error('No role data provided for Google signup')
      }
      
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback?signup=true`
        }
      })
      
      if (error) throw error
      return data
    } catch (error) {
      setIsSigningIn(false)
      throw error
    }
  }

  const handleGoogleCallback = async (isSignup = false) => {
    if (!supabase) {
      throw new Error('Supabase not configured. Please set up your environment variables.')
    }

    // Set flag to prevent auth state listener conflicts
    setIsHandlingGoogleCallback(true)
    
    // Set global flag to indicate we're handling profile creation here
    profileCreationInProgress = true
    console.log('🔄 Google callback started, profile creation flag set')

    try {
      // Minimal delay for session establishment (100ms for maximum speed)
      await new Promise(resolve => setTimeout(resolve, 100))
      
      const { data: { session }, error } = await supabase.auth.getSession()
      
      if (error) throw error
      
      if (session?.user) {
        try {
          // Check if user exists in our database (ignore cache for signup verification)
          let existingProfile = null
          let profileError = null
          
          try {
            existingProfile = await db.getProfile(session.user.id)
            console.log('👤 Profile check result:', existingProfile ? 'Found existing profile' : 'No profile found')
          } catch (error) {
            profileError = error
            // Profile doesn't exist, which is expected for new users
            if (!error.code || error.code !== 'PGRST116') {
              console.error('Unexpected error checking profile:', error)
            }
          }
          
          if (isSignup) {
            if (existingProfile) {
              // If we found an existing profile during signup flow, this means the account already exists
              // We should NOT allow signup to proceed - sign out and show error
              console.log('⛔ Existing profile found during signup flow - account already exists')
              await supabase.auth.signOut()
              // Clear the pending role data
              localStorage.removeItem('pendingGoogleSignupRole')
              throw new Error('Account already exists. Please use the login option instead.')
            }
            
            // Get stored role data for signup
            const storedRoleData = localStorage.getItem('pendingGoogleSignupRole')
            console.log('Retrieved stored role data:', storedRoleData)
            let roleData = null
            
            if (storedRoleData) {
              try {
                roleData = JSON.parse(storedRoleData)
                console.log('Parsed role data:', roleData)
                // Only remove after successful profile creation
              } catch (parseError) {
                console.error('Error parsing role data:', parseError)
              }
            }
            
            if (!roleData || !roleData.role) {
              // If no role data during signup, sign out and throw error
              await supabase.auth.signOut()
              throw new Error('Role selection required. Please complete the signup process.')
            }
            
            // Create profile with Google data and selected role
            const profileData = {
              email: session.user.email,
              name: session.user.user_metadata.full_name || session.user.user_metadata.name || session.user.email.split('@')[0],
              role: roleData.role,
              account_type: 'individual',
              phone_number: roleData.phone || '09000000000',
              address: 'Philippines',
              city: 'Cagayan de Oro City',
              province: 'Misamis Oriental',
              zip_code: '9000'
            }
            
            console.log('Creating Google profile with data:', profileData)
            
            // Add role-specific fields
            if (roleData.role === 'donor') {
              profileData.donation_types = []
              profileData.bio = null
              profileData.primary_id_type = null
              profileData.primary_id_number = null
            } else if (roleData.role === 'volunteer') {
              profileData.has_vehicle = false
              profileData.vehicle_type = null
              profileData.max_delivery_distance = 20
              profileData.volunteer_experience = null
              profileData.background_check_consent = false
              profileData.availability_days = []
              profileData.availability_times = []
              profileData.primary_id_type = null
              profileData.primary_id_number = null
            } else if (roleData.role === 'recipient') {
              profileData.household_size = null
              profileData.assistance_needs = []
              profileData.emergency_contact_name = null
              profileData.emergency_contact_phone = null
              profileData.primary_id_type = null
              profileData.primary_id_number = null
            } else if (roleData.role === 'admin') {
              profileData.is_verified = true
            }
            
            const newProfile = await db.createProfile(session.user.id, profileData)
            console.log('✅ Successfully created new profile for Google signup:', newProfile)
            
            // Cache the newly created profile
            profileCacheRef.current.set(session.user.id, newProfile)
            
            // Set the profile state immediately so dashboard can load
            setProfile(newProfile)
            setLoading(false)
            
            // Only remove localStorage data after successful profile creation
            localStorage.removeItem('pendingGoogleSignupRole')
            return { user: session.user, isNewUser: true, role: roleData.role }
          } else {
            // Login flow
            if (!existingProfile) {
              // If no account found during login, sign out and throw error
              await supabase.auth.signOut()
              throw new Error('No account found. Please sign up first.')
            }
            
            // Cache the existing profile for login flow
            profileCacheRef.current.set(session.user.id, existingProfile)
            console.log('✅ Existing profile cached for Google login')
            
            // Set the profile state immediately so dashboard can load
            setProfile(existingProfile)
            setLoading(false)
            
            return { user: session.user, isNewUser: false, role: existingProfile.role }
          }
        } catch (profileError) {
          // For any error in profile handling, ensure we sign out
          await supabase.auth.signOut()
          throw profileError
        }
      }
      
      throw new Error('No session found')
    } catch (error) {
      // Only log unexpected errors, not controlled flow errors
      if (!error.message.includes('Account already exists') && 
          !error.message.includes('No account found') &&
          !error.message.includes('Role selection required')) {
        console.error('Google callback error:', error)
      }
      throw error
    } finally {
      // Clear flags regardless of success or failure
      setIsHandlingGoogleCallback(false)
      profileCreationInProgress = false
      console.log('🔄 Google callback completed, profile creation flag cleared')
    }
  }

  const signOut = async () => {
    authDebug.logSignOut('START')
    
    try {
      // Set signing out flag to prevent redirects during sign out
      setIsSigningOut(true)
      authDebug.logSignOut('SIGNING_OUT_FLAG_SET')
      
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
    } finally {
      // Keep signing out flag active for a brief moment to allow navigation to complete
      setTimeout(() => {
        setIsSigningOut(false)
        authDebug.logSignOut('SIGNING_OUT_FLAG_CLEARED')
      }, 500)
    }
    
    authDebug.logSignOut('COMPLETED')
  }

  // Provide fallback signOut function when supabase is not configured
  const signOutFallback = async () => {
    setIsSigningOut(true)
    console.log('Sign out completed (no authentication service)')
    setUser(null)
    setProfile(null)
    setSession(null)
    profileCacheRef.current.clear()
    setTimeout(() => {
      setIsSigningOut(false)
    }, 500)
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
    isSigningOut,
    isSigningIn,
    signUp: supabase ? signUp : signUpFallback,
    signIn: supabase ? signIn : signInFallback,
    signInWithGoogle: supabase ? signInWithGoogle : signInFallback,
    signUpWithGoogle: supabase ? signUpWithGoogle : signUpFallback,
    handleGoogleCallback,
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