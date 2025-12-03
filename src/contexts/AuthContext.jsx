import React, { createContext, useContext, useEffect, useState, useRef } from 'react'
import { supabase, db } from '../lib/supabase'
import { authDebug } from '../lib/devUtils'

const AuthContext = createContext({})

// Production detection (module level for use in authLog)
const isProductionEnv = import.meta.env.PROD || import.meta.env.MODE === 'production'
const enableVerboseAuthLogs = false
const authLog = (...args) => {
  // Only log in development, never in production
  if (!isProductionEnv && enableVerboseAuthLogs) {
    console.log(...args)
  }
}

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

// Fast Refresh: This component is compatible with Fast Refresh
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
  // Flag to track profile creation status across auth flows (moved from module level for Fast Refresh compatibility)
  const profileCreationInProgressRef = useRef(false)

  // Production: More aggressive timeout to prevent infinite loading
  const isProduction = import.meta.env.PROD || import.meta.env.MODE === 'production'
  const loadingTimeout = isProduction ? 3000 : 5000 // 3 seconds in production, 5 in dev
  
  // Failsafe: Force stop loading after timeout to prevent infinite loading
  useEffect(() => {
    const failsafeTimeout = setTimeout(() => {
      if (isProduction) {
        // In production, silently complete loading to prevent skeleton screens
        setLoading(false)
      } else {
        authLog('🔒 Auth initialization timeout reached - completing authentication flow')
        setLoading(false)
      }
    }, loadingTimeout)

    return () => clearTimeout(failsafeTimeout)
  }, [loadingTimeout, isProduction])

  // Additional safeguard: prevent loading state from lasting too long
  useEffect(() => {
    if (loading) {
      const maxLoadingTimeout = setTimeout(() => {
        // In production, silently resolve loading state to prevent skeleton screens
        // Only log warnings in development
        if (!isProduction) {
          console.warn('⚠️ Loading state lasted too long, forcing completion')
        }
        setLoading(false)
      }, loadingTimeout + 1000)

      return () => clearTimeout(maxLoadingTimeout)
    }
  }, [loading, loadingTimeout, isProduction])

  useEffect(() => {
    let mounted = true
    let accountStatusCheckInterval = null
    let sessionRefreshInterval = null
    
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

        // Get initial session and refresh if expired
        let { data: { session }, error: sessionError } = await supabase.auth.getSession()
        
        // Check if session is expired or invalid
        if (session && session.expires_at) {
          const expiresAt = session.expires_at * 1000 // Convert to milliseconds
          const now = Date.now()
          const timeUntilExpiry = expiresAt - now
          
          // If session expires in less than 5 minutes, refresh it proactively
          if (timeUntilExpiry < 5 * 60 * 1000) {
            authLog('⚠️ Session expiring soon, refreshing proactively')
            try {
              const refreshResult = await supabase.auth.refreshSession()
              if (!refreshResult.error && refreshResult.data?.session) {
                session = refreshResult.data.session
                authLog('✅ Session refreshed successfully')
              }
            } catch (refreshErr) {
              console.warn('Error refreshing session during init:', refreshErr)
            }
          }
        }
        
        // If session is invalid or expired, try to refresh
        if (sessionError || !session || (session.expires_at && session.expires_at * 1000 < Date.now())) {
          authLog('⚠️ Initial session expired or invalid, attempting refresh')
          try {
            const refreshResult = await supabase.auth.refreshSession()
            if (!refreshResult.error && refreshResult.data?.session) {
              session = refreshResult.data.session
              authLog('✅ Session refreshed successfully')
            } else {
              // Session refresh failed, user needs to login again
              authLog('❌ Session refresh failed, clearing state')
              if (mounted) {
                setSession(null)
                setUser(null)
                setProfile(null)
                setLoading(false)
              }
              return
            }
          } catch (refreshErr) {
            console.error('Error refreshing initial session:', refreshErr)
            if (mounted) {
              setSession(null)
              setUser(null)
              setProfile(null)
              setLoading(false)
            }
            return
          }
        }
        
        if (!mounted) return

        setSession(session)
        setUser(session?.user ?? null)
        
        if (session?.user) {
          try {
            await loadUserProfile(session.user.id)
          } catch (profileError) {
            // If error is about account suspension, it's already been handled by loadUserProfile
            // (user signed out, state cleared, event dispatched)
            // Just set loading to false and let the error propagate if needed
            if (profileError?.message?.includes('ACCOUNT_SUSPENDED')) {
              authLog('Account suspended during initialization - already handled')
              setLoading(false)
              // Don't re-throw - the suspension has been handled
              return
            }
            // For other errors, ensure loading is cleared
            console.error('Error loading profile during initialization:', profileError)
            setLoading(false)
          }
        } else {
          setLoading(false)
        }

        // Listen for auth changes
        const {
          data: { subscription },
        } = supabase.auth.onAuthStateChange(async (event, session) => {
          if (!mounted) return
          
          authLog('Auth state changed:', event, session?.user?.email)
          
          // Clear existing intervals if user logs out
          if (!session?.user) {
            if (accountStatusCheckInterval) {
              clearInterval(accountStatusCheckInterval)
              accountStatusCheckInterval = null
            }
            if (sessionRefreshInterval) {
              clearInterval(sessionRefreshInterval)
              sessionRefreshInterval = null
            }
            setSession(null)
            setUser(null)
            setProfile(null)
            return
          }
          
          if (session?.user) {
            // Skip profile loading if we're handling Google callback
            if (isHandlingGoogleCallback) {
              authLog('Skipping profile loading during Google callback')
              setSession(session)
              setUser(session.user)
              setLoading(false)
              return
            }
            
            // CRITICAL: Check account suspension BEFORE setting session/user/profile
            // This prevents suspended users from accessing the app
            let accountIsSuspended = false
            try {
              const userProfile = await db.getProfile(session.user.id)
              authLog('🔍 Auth listener checking account status for:', session.user.id, 'is_active:', userProfile?.is_active, 'type:', typeof userProfile?.is_active)
              if (userProfile) {
                // Check explicitly for false (suspended) - also check for string "false" or 0
                const isSuspended = userProfile.is_active === false || userProfile.is_active === 'false' || userProfile.is_active === 0
                if (isSuspended) {
                  accountIsSuspended = true
                  console.error('🚨 Suspended account detected in auth state listener - blocking access')
                } else if (userProfile.is_active === null || userProfile.is_active === undefined) {
                  authLog('⚠️ is_active is null/undefined in auth listener, treating as active')
                }
              }
            } catch (suspendCheckErr) {
              // If we can't check, try direct query
              try {
                const { data: userData, error: userError } = await supabase
                  .from('users')
                  .select('id, is_active')
                  .eq('id', session.user.id)
                  .single()
                
                authLog('🔍 Auth listener direct query for:', session.user.id, 'is_active:', userData?.is_active, 'type:', typeof userData?.is_active, 'error:', userError)
                if (!userError && userData) {
                  // Check explicitly for false (suspended) - also check for string "false" or 0
                  const isSuspended = userData.is_active === false || userData.is_active === 'false' || userData.is_active === 0
                  if (isSuspended) {
                    accountIsSuspended = true
                    console.error('🚨 Suspended account detected via direct query in auth listener - blocking access')
                  } else if (userData.is_active === null || userData.is_active === undefined) {
                    authLog('⚠️ is_active is null/undefined in direct query (auth listener), treating as active')
                  }
                }
              } catch (directErr) {
                console.warn('Could not verify account status in auth listener:', directErr)
                // If we can't verify, don't set session/user - this is a security measure
                // The user will need to log in again and the signIn function will check
                setLoading(false)
                return
              }
            }
            
            // If account is suspended, sign out and don't set any state
            if (accountIsSuspended) {
              await supabase.auth.signOut()
              setProfile(null)
              setUser(null)
              setSession(null)
              setLoading(false)
              // Dispatch custom event for login page to show suspension banner
              window.dispatchEvent(new CustomEvent('account_suspended', { 
                detail: { message: 'Your account has been suspended. Please contact the administrator for assistance.' }
              }))
              return
            }
            
            // Only set session/user if account is NOT suspended
            setSession(session)
            setUser(session.user)
            
            try {
              await loadUserProfile(session.user.id)
              
              // Set up periodic session refresh to prevent idle timeout (every 10 minutes)
              // Clear any existing session refresh interval first
              if (sessionRefreshInterval) {
                clearInterval(sessionRefreshInterval)
              }
              
              sessionRefreshInterval = setInterval(async () => {
                if (!mounted) {
                  clearInterval(sessionRefreshInterval)
                  return
                }
                
                try {
                  const { data: { session: currentSession } } = await supabase.auth.getSession()
                  if (currentSession && currentSession.expires_at) {
                    const expiresAt = currentSession.expires_at * 1000
                    const now = Date.now()
                    const timeUntilExpiry = expiresAt - now
                    
                    // Refresh session if it expires in less than 5 minutes
                    if (timeUntilExpiry < 5 * 60 * 1000) {
                      if (!isProduction) {
                        authLog('🔄 Refreshing session proactively before expiry')
                      }
                      const { data: { session: refreshedSession }, error: refreshError } = await supabase.auth.refreshSession()
                      if (!refreshError && refreshedSession) {
                        setSession(refreshedSession)
                        setUser(refreshedSession.user)
                        if (!isProduction) {
                          authLog('✅ Session refreshed successfully')
                        }
                      } else {
                        // Only log in development
                        if (!isProduction) {
                          console.warn('Failed to refresh session:', refreshError)
                        }
                        // If refresh fails, clear intervals and sign out
                        clearInterval(sessionRefreshInterval)
                        if (accountStatusCheckInterval) {
                          clearInterval(accountStatusCheckInterval)
                        }
                        await supabase.auth.signOut()
                        setProfile(null)
                        setUser(null)
                        setSession(null)
                      }
                    }
                  } else if (!currentSession) {
                    // No session, clear intervals
                    clearInterval(sessionRefreshInterval)
                    if (accountStatusCheckInterval) {
                      clearInterval(accountStatusCheckInterval)
                    }
                  }
                } catch (refreshErr) {
                  console.warn('Error during session refresh interval:', refreshErr)
                }
              }, 10 * 60 * 1000) // Check every 10 minutes
              
              // Set up periodic account status check for logged-in users
              // Clear any existing interval first
              if (accountStatusCheckInterval) {
                clearInterval(accountStatusCheckInterval)
              }
              
              accountStatusCheckInterval = setInterval(async () => {
                if (!mounted) {
                  clearInterval(accountStatusCheckInterval)
                  return
                }
                
                try {
                  // Get fresh session to check current user
                  const { data: { session: currentSession } } = await supabase.auth.getSession()
                  if (!currentSession?.user) {
                    clearInterval(accountStatusCheckInterval)
                    return
                  }
                  
                  const userProfile = await db.getProfile(currentSession.user.id)
                  const isSuspended = userProfile && (userProfile.is_active === false || userProfile.is_active === 'false' || userProfile.is_active === 0)
                  if (isSuspended) {
                    // Account was suspended - sign out immediately
                    console.error('🚨 Account status check: Account is suspended - signing out')
                    clearInterval(accountStatusCheckInterval)
                    clearInterval(sessionRefreshInterval)
                    await supabase.auth.signOut()
                    setProfile(null)
                    setUser(null)
                    setSession(null)
                  }
                } catch (checkError) {
                  // Handle expired session errors
                  if (checkError.status === 401 || checkError.status === 403 || 
                      checkError.message?.includes('JWT') || checkError.message?.includes('token') ||
                      checkError.message?.includes('expired') || checkError.message?.includes('invalid')) {
                    authLog('⚠️ Session expired during status check, attempting refresh')
                    try {
                      const { data: { session: refreshedSession }, error: refreshError } = await supabase.auth.refreshSession()
                      if (!refreshError && refreshedSession) {
                        setSession(refreshedSession)
                        setUser(refreshedSession.user)
                      } else {
                        // Refresh failed, sign out
                        clearInterval(accountStatusCheckInterval)
                        clearInterval(sessionRefreshInterval)
                        await supabase.auth.signOut()
                        setProfile(null)
                        setUser(null)
                        setSession(null)
                      }
                    } catch (refreshErr) {
                      console.error('Error refreshing session during status check:', refreshErr)
                    }
                    return
                  }
                  // Ignore other errors during status check
                  if (!checkError.message?.includes('Failed to fetch') && 
                      !checkError.message?.includes('NetworkError')) {
                    console.warn('Error checking account status:', checkError)
                  }
                }
              }, 30000) // Check every 30 seconds
            } catch (profileError) {
              // Check if error is about account suspension
              if (profileError?.message?.includes('ACCOUNT_SUSPENDED')) {
                console.error('Account suspended during auth state change:', profileError.message)
                // Clear intervals if account is suspended
                if (accountStatusCheckInterval) {
                  clearInterval(accountStatusCheckInterval)
                  accountStatusCheckInterval = null
                }
                if (sessionRefreshInterval) {
                  clearInterval(sessionRefreshInterval)
                  sessionRefreshInterval = null
                }
                // User has already been signed out by loadUserProfile
                // Set loading to false since suspension is handled
                setLoading(false)
                return
              }
              
              // Handle expired session errors
              if (profileError.status === 401 || profileError.status === 403 || 
                  profileError.message?.includes('JWT') || profileError.message?.includes('token') ||
                  profileError.message?.includes('expired') || profileError.message?.includes('invalid')) {
                console.warn('⚠️ Session expired during auth state change, attempting refresh')
                try {
                  const { data: { session: refreshedSession }, error: refreshError } = await supabase.auth.refreshSession()
                  if (!refreshError && refreshedSession) {
                    setSession(refreshedSession)
                    setUser(refreshedSession.user)
                    // Retry loading profile with refreshed session
                    try {
                      await loadUserProfile(refreshedSession.user.id)
                      return
                    } catch (retryErr) {
                      console.error('Error loading profile after session refresh:', retryErr)
                      setLoading(false)
                      return
                    }
                  } else {
                    // Refresh failed, sign out
                    await supabase.auth.signOut()
                    setProfile(null)
                    setUser(null)
                    setSession(null)
                    setLoading(false)
                    return
                  }
                } catch (refreshErr) {
                  console.error('Error refreshing session during auth state change:', refreshErr)
                  await supabase.auth.signOut()
                  setProfile(null)
                  setUser(null)
                  setSession(null)
                  setLoading(false)
                  return
                }
              }
              
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
          if (accountStatusCheckInterval) {
            clearInterval(accountStatusCheckInterval)
          }
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
      if (accountStatusCheckInterval) {
        clearInterval(accountStatusCheckInterval)
      }
      if (sessionRefreshInterval) {
        clearInterval(sessionRefreshInterval)
      }
      cleanup?.then(unsubscribe => unsubscribe?.())
    }
  }, [])

  const loadUserProfile = async (userId) => {
    if (!userId) {
      authLog('🔒 No user ID provided, stopping loading')
      setLoading(false)
      return
    }
    
    // Check if profile creation is already in progress elsewhere (like in Google callback)
    if (profileCreationInProgressRef.current) {
      authLog('⚠️ Profile creation already in progress elsewhere, skipping duplicate attempt')
      authDebug.logProfileLoading(userId, 'SKIPPED_DUPLICATE_ATTEMPT')
      setLoading(false)
      return
    }

    // Refresh session before loading profile to handle expired sessions
    try {
      const { data: { session: currentSession }, error: sessionError } = await supabase.auth.getSession()
      
      // If session is expired or invalid, try to refresh it
      if (sessionError || !currentSession) {
        authLog('⚠️ Session expired or invalid, attempting refresh')
        try {
          const { data: { session: refreshedSession }, error: refreshError } = await supabase.auth.refreshSession()
          if (refreshError || !refreshedSession) {
            console.warn('Failed to refresh session:', refreshError)
            // If refresh fails, sign out and clear state
            await supabase.auth.signOut()
            setProfile(null)
            setUser(null)
            setSession(null)
            setLoading(false)
            return
          }
          // Update session state
          setSession(refreshedSession)
          setUser(refreshedSession.user)
        } catch (refreshErr) {
          console.error('Error refreshing session:', refreshErr)
          // If refresh fails, sign out and clear state
          await supabase.auth.signOut()
          setProfile(null)
          setUser(null)
          setSession(null)
          setLoading(false)
          return
        }
      } else {
        // Session is valid, update state
        setSession(currentSession)
        setUser(currentSession.user)
      }
    } catch (sessionCheckErr) {
      console.error('Error checking session:', sessionCheckErr)
      // If we can't check session, try to continue but ensure loading is cleared
      setLoading(false)
      return
    }

    // Check cache first, but always verify is_active status from database
    // This ensures suspended accounts are detected even if profile is cached
    const cachedProfile = profileCacheRef.current.get(userId)
    if (cachedProfile) {
      authLog('📋 Found cached profile for user:', userId)
      // Always verify is_active status from database to catch suspensions
      try {
        const { data: userData, error: userError } = await supabase
          .from('users')
          .select('id, is_active')
          .eq('id', userId)
          .single()
        
        if (!userError && userData) {
          // If account is suspended, don't use cached profile - sign out immediately
          const isSuspended = userData.is_active === false || userData.is_active === 'false' || userData.is_active === 0
          if (isSuspended) {
            console.error('🚨 Suspended account detected via cache verification - signing out')
            profileCacheRef.current.delete(userId)
            await supabase.auth.signOut()
            setProfile(null)
            setUser(null)
            setSession(null)
            setLoading(false)
            throw new Error('ACCOUNT_SUSPENDED: Your account has been suspended. Please contact the administrator for assistance.')
          }
          // Update cached profile with latest is_active status
          cachedProfile.is_active = userData.is_active
        }
      } catch (verifyErr) {
        if (verifyErr?.message?.includes('ACCOUNT_SUSPENDED')) {
          throw verifyErr
        }
        // If verification fails, log but continue with cached profile
        console.warn('Could not verify account status for cached profile:', verifyErr)
      }
      
      authLog('✅ Using cached profile for user:', userId)
      setProfile(cachedProfile)
      setLoading(false)
      return
    }

    authDebug.logProfileLoading(userId, 'START')

    try {
      // Retry mechanism with exponential backoff for profile loading
      // This handles cases where profile isn't immediately available after login
      let userProfile = null
      const maxRetries = 3
      const baseDelay = 500 // Start with 500ms
      
      for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
          userProfile = await db.getProfile(userId)
          if (userProfile) {
            break // Success, exit retry loop
          }
          
          // If profile is null, check if it's a timing issue (user just logged in)
          // Only retry if user exists in auth (indicating recent login)
          if (attempt < maxRetries && userProfile === null) {
            try {
              const { data: { user: currentUser } } = await supabase.auth.getUser()
              if (currentUser) {
                // User exists in auth but profile is null - might be timing issue, retry
                const delay = baseDelay * Math.pow(2, attempt) // Exponential backoff: 500ms, 1000ms, 2000ms
                authLog(`Profile not found but user exists in auth, retrying in ${delay}ms (attempt ${attempt + 1}/${maxRetries + 1})`)
                await new Promise(resolve => setTimeout(resolve, delay))
                continue
              }
            } catch (authCheckError) {
              // If we can't check auth, don't retry
              break
            }
          }
          // If profile is null and user doesn't exist or we're out of retries, break
          break
        } catch (retryError) {
          // Handle expired/invalid session errors
          if (retryError.status === 401 || retryError.status === 403 || 
              retryError.message?.includes('JWT') || retryError.message?.includes('token') ||
              retryError.message?.includes('expired') || retryError.message?.includes('invalid')) {
            authLog('⚠️ Session expired or invalid during profile load, attempting refresh')
            try {
              const { data: { session: refreshedSession }, error: refreshError } = await supabase.auth.refreshSession()
              if (refreshError || !refreshedSession) {
                console.error('Failed to refresh expired session:', refreshError)
                await supabase.auth.signOut()
                setProfile(null)
                setUser(null)
                setSession(null)
                setLoading(false)
                return
              }
              // Session refreshed, update state and retry
              setSession(refreshedSession)
              setUser(refreshedSession.user)
              // Retry profile load with refreshed session
              if (attempt < maxRetries) {
                const delay = baseDelay * Math.pow(2, attempt)
                await new Promise(resolve => setTimeout(resolve, delay))
                continue
              }
            } catch (refreshErr) {
              console.error('Error refreshing session:', refreshErr)
              await supabase.auth.signOut()
              setProfile(null)
              setUser(null)
              setSession(null)
              setLoading(false)
              return
            }
          }
          
          // If it's a network error and we have retries left, retry
          if (attempt < maxRetries && (
            retryError.message?.includes('Failed to fetch') || 
            retryError.message?.includes('CORS') || 
            retryError.message?.includes('NetworkError') ||
            retryError.message?.includes('QUIC') ||
            retryError.message?.includes('TypeError: Failed to fetch')
          )) {
            const delay = baseDelay * Math.pow(2, attempt)
            authLog(`Network error, retrying in ${delay}ms (attempt ${attempt + 1}/${maxRetries + 1})`)
            await new Promise(resolve => setTimeout(resolve, delay))
            continue
          }
          // If it's a "profile not found" error, don't retry - let fallback logic handle it
          if (retryError.code === 'PGRST116' || 
              retryError.message?.includes('No rows found') || 
              retryError.message?.includes('Profile not found')) {
            // Break out of retry loop and let the fallback logic handle it
            userProfile = null
            break
          }
          // If it's not a network error or we're out of retries, throw
          throw retryError
        }
      }
      
      if (userProfile) {
        authDebug.logProfileLoading(userId, 'SUCCESS', userProfile)
        
        // For volunteers, merge schedule fields from user_metadata (these aren't in the users table)
        if (userProfile.role === 'volunteer') {
          try {
            const { data: { user: currentUser }, error: volMetadataError } = await supabase.auth.getUser()
            
            // Handle 403 Forbidden for volunteer metadata
            if (volMetadataError) {
              if (volMetadataError.status === 403 || volMetadataError.message?.includes('403') || volMetadataError.message?.includes('Forbidden')) {
                console.error('🚨 403 Forbidden when fetching volunteer metadata - Invalid JWT token, signing out')
                await supabase.auth.signOut()
                setProfile(null)
                setUser(null)
                setSession(null)
                setLoading(false)
                return
              }
            }
            
            if (currentUser?.user_metadata) {
              // Merge volunteer schedule fields from user_metadata
              userProfile.availability_days = currentUser.user_metadata.availabilityDays || userProfile.availability_days || []
              userProfile.availability_times = currentUser.user_metadata.availabilityTimes || userProfile.availability_times || []
              userProfile.max_delivery_distance = currentUser.user_metadata.maxDeliveryDistance || userProfile.max_delivery_distance || 20
              userProfile.delivery_preferences = currentUser.user_metadata.deliveryPreferences || userProfile.delivery_preferences || []
            }
          } catch (metadataError) {
            // Handle 403 in catch block as well
            if (metadataError?.status === 403 || metadataError?.message?.includes('403') || metadataError?.message?.includes('Forbidden')) {
              console.error('🚨 403 Forbidden caught when fetching volunteer metadata - signing out')
              try {
                await supabase.auth.signOut()
              } catch (e) {
                console.error('Error during sign out:', e)
              }
              setProfile(null)
              setUser(null)
              setSession(null)
              setLoading(false)
              return
            }
            console.warn('Error loading user_metadata for volunteer schedule:', metadataError)
            // Continue with profile even if metadata load fails
          }
        }
        
        // Check if user account is suspended
        // Also check for string "false" or 0 in case it's stored differently
        authLog('🔍 loadUserProfile checking account status for:', userId, 'is_active:', userProfile.is_active, 'type:', typeof userProfile.is_active)
        const isSuspended = userProfile.is_active === false || userProfile.is_active === 'false' || userProfile.is_active === 0
        if (isSuspended) {
          console.error('🚨 Account is suspended - signing out user')
          authDebug.logProfileLoading(userId, 'ACCOUNT_SUSPENDED')
          // Clear cache
          profileCacheRef.current.delete(userId)
          // Sign out the user immediately
          await supabase.auth.signOut()
          setProfile(null)
          setUser(null)
          setSession(null)
          setLoading(false)
          // Throw error with specific message that can be caught by login page
          throw new Error('ACCOUNT_SUSPENDED: Your account has been suspended. Please contact the administrator for assistance.')
        }
        
        // Cache the profile for future use
        profileCacheRef.current.set(userId, userProfile)
        setProfile(userProfile)
        setLoading(false)
        return
      } else {
        // Profile is null - could be network error or user doesn't exist in database yet
        // Check if this is a network error by trying to get user from auth
        try {
          const { data: { user: currentUser }, error: authError } = await supabase.auth.getUser()
          
          // Handle 403 Forbidden - token is invalid, sign out user
          if (authError) {
            if (authError.status === 403 || authError.message?.includes('403') || authError.message?.includes('Forbidden')) {
              console.error('🚨 403 Forbidden - Invalid JWT token, signing out user')
              authDebug.logProfileLoading(userId, 'INVALID_TOKEN_SIGNOUT')
              // Sign out to clear invalid session
              await supabase.auth.signOut()
              setProfile(null)
              setUser(null)
              setSession(null)
              setLoading(false)
              return
            }
          }
          
          if (currentUser) {
            // User exists in auth but profile is null after retries
            // This could be a network error or the profile truly doesn't exist
            // Try to create from metadata as a fallback
            console.warn('Profile is null but user exists in auth after retries - attempting to create from metadata')
            authDebug.logProfileLoading(userId, 'NULL_PROFILE_AFTER_RETRIES')
            
            // Don't set profile to null yet - let the fallback logic below try to create from metadata
            // This will be handled by the catch block that checks for "Profile not found"
            throw new Error('Profile not found - needs creation from metadata')
          }
        } catch (authError) {
          // Handle 403 Forbidden errors specifically
          if (authError?.status === 403 || authError?.message?.includes('403') || authError?.message?.includes('Forbidden')) {
            console.error('🚨 403 Forbidden caught in catch - Invalid JWT token, signing out user')
            authDebug.logProfileLoading(userId, 'INVALID_TOKEN_SIGNOUT_CATCH')
            // Sign out to clear invalid session
            try {
              await supabase.auth.signOut()
            } catch (signOutError) {
              console.error('Error during emergency sign out:', signOutError)
            }
            setProfile(null)
            setUser(null)
            setSession(null)
            setLoading(false)
            return
          }
          
          // If this is a "Profile not found" error, re-throw it so outer catch can handle metadata creation
          if (authError?.message?.includes('Profile not found - needs creation from metadata')) {
            throw authError
          }
          
          // Auth check also failed - likely network issue
          console.warn('Both profile and auth check failed - network error, setting profile to null')
          authDebug.logProfileLoading(userId, 'NETWORK_ERROR')
          setProfile(null)
          setLoading(false)
          return
        }
        
        // If we get here, user doesn't exist in auth either, so profile truly doesn't exist
        authLog('Profile is null, user may need to be created from metadata')
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
        
        // Handle expired/invalid session errors
        if (error.status === 401 || error.status === 403 || 
            error.message?.includes('JWT') || error.message?.includes('token') ||
            error.message?.includes('expired') || error.message?.includes('invalid') ||
            error.message?.includes('Forbidden')) {
          console.warn('⚠️ Session expired or invalid, attempting refresh')
          try {
            const { data: { session: refreshedSession }, error: refreshError } = await supabase.auth.refreshSession()
            if (refreshError || !refreshedSession) {
              console.error('Failed to refresh expired session:', refreshError)
              await supabase.auth.signOut()
              setProfile(null)
              setUser(null)
              setSession(null)
              setLoading(false)
              return
            }
            // Session refreshed, update state
            setSession(refreshedSession)
            setUser(refreshedSession.user)
            // Try loading profile again with refreshed session
            try {
              const refreshedProfile = await db.getProfile(userId)
              if (refreshedProfile) {
                profileCacheRef.current.set(userId, refreshedProfile)
                setProfile(refreshedProfile)
                setLoading(false)
                return
              }
            } catch (retryErr) {
              console.error('Error loading profile after session refresh:', retryErr)
            }
          } catch (refreshErr) {
            console.error('Error refreshing session:', refreshErr)
          }
          // If refresh or retry fails, sign out
          await supabase.auth.signOut()
          setProfile(null)
          setUser(null)
          setSession(null)
          setLoading(false)
          return
        }
        
        // For network errors, set profile to null and continue
        if (error.message?.includes('Failed to fetch') || 
            error.message?.includes('CORS') || 
            error.message?.includes('NetworkError') || 
            error.message?.includes('QUIC') ||
            error.message?.includes('TypeError: Failed to fetch')) {
          console.warn('Network error loading profile, setting profile to null')
          setProfile(null)
          setLoading(false)
          return
        }
        
        // For any other error, ensure loading is cleared
        setLoading(false)
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
          const { data: { user: currentUser }, error: metadataFetchError } = await supabase.auth.getUser()
          
          // Handle 403 Forbidden when fetching metadata
          if (metadataFetchError) {
            if (metadataFetchError.status === 403 || metadataFetchError.message?.includes('403') || metadataFetchError.message?.includes('Forbidden')) {
              console.error('🚨 403 Forbidden when fetching metadata - Invalid JWT token, signing out')
              authDebug.logProfileLoading(userId, 'INVALID_TOKEN_METADATA')
              await supabase.auth.signOut()
              setProfile(null)
              setUser(null)
              setSession(null)
              setLoading(false)
              return
            }
          }
          
          authLog('Current user metadata:', currentUser?.user_metadata)
          authLog('Current user email:', currentUser?.email)
          authLog('User metadata keys:', currentUser?.user_metadata ? Object.keys(currentUser.user_metadata) : 'none')
          
          // Check for pending Google signup role data first
          // IMPORTANT: Don't create profile here during Google signup flow
          // Let handleGoogleCallback do it after checking for existing accounts
          const pendingRoleData = localStorage.getItem('pendingGoogleSignupRole')
          
          // Skip profile creation if there's pending Google signup data
          // The callback handler will create the profile after verifying no existing account
          if (pendingRoleData) {
            authLog('⏭️ Skipping profile creation in loadUserProfile - pending Google signup detected')
            authDebug.logProfileLoading(userId, 'SKIPPED_PENDING_GOOGLE_SIGNUP')
            setProfile(null)
            setLoading(false)
            return
          }
          
          // Check for name or full_name in metadata for regular (non-Google) signups
          const userName = currentUser?.user_metadata?.full_name || currentUser?.user_metadata?.name
          
          // If metadata is missing but user exists, this might be after email confirmation
          // Try to get metadata from the session or check if we can create a basic profile
          if (!currentUser?.user_metadata || !userName) {
            console.warn('⚠️ User metadata is missing or incomplete after email confirmation')
            console.warn('This might happen if metadata was lost during email confirmation')
            console.warn('User email:', currentUser?.email)
            
            // If we have an email but no metadata, we can't create a profile
            // The user will need to complete signup or contact support
            if (currentUser?.email) {
              console.error('Cannot create profile without user metadata. User may need to complete signup.')
              authDebug.logProfileLoading(userId, 'MISSING_METADATA_AFTER_CONFIRMATION')
              setProfile(null)
              setLoading(false)
              return
            }
          }
          
          if (currentUser?.user_metadata && userName) {
            // Set flag to prevent duplicate profile creation
            profileCreationInProgressRef.current = true
            authLog('🔄 Profile creation from metadata started in loadUserProfile, flag set')
            
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
              profileData.delivery_preferences = currentUser.user_metadata.deliveryPreferences || []
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
            
            authLog('Creating profile from metadata:', profileData)
            authDebug.logProfileLoading(userId, 'CREATING_FROM_METADATA', profileData)
            const newProfile = await db.createProfile(userId, profileData)
            authLog('Created profile:', newProfile)
            authDebug.logProfileLoading(userId, 'CREATED_FROM_METADATA', newProfile)
            // Cache the new profile
            profileCacheRef.current.set(userId, newProfile)
            setProfile(newProfile)
            setLoading(false)
            
            // Reset flag after successful profile creation
            profileCreationInProgressRef.current = false
            authLog('🔄 Profile creation from metadata completed, flag cleared')
            return
          } else {
            authLog('No user metadata found or name missing, user might need to complete signup')
            authDebug.logProfileLoading(userId, 'NO_METADATA')
          }
        } catch (createError) {
          console.error('Error creating profile from metadata:', createError)
          authDebug.logProfileLoading(userId, 'METADATA_ERROR', { error: createError.message })
          // Reset flag in case of error
          profileCreationInProgressRef.current = false
          authLog('🔄 Profile creation from metadata failed, flag cleared')
          
          // If it's a network error, don't give up - the profile might still be created
          // Let the user try refreshing or logging in again
          if (createError.message?.includes('Failed to fetch') || 
              createError.message?.includes('CORS') || 
              createError.message?.includes('NetworkError') ||
              createError.message?.includes('QUIC') ||
              createError.message?.includes('TypeError: Failed to fetch')) {
            console.warn('Network error during profile creation - profile may still be created, setting profile to null for now')
            setProfile(null)
            setLoading(false)
            return
          }
          
          // For other errors, log and continue - user might need to complete signup
          console.warn('Profile creation failed - user may need to complete signup process')
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
      
      authLog('AUTHCONTEXT SIGNUP - USERDATA:', userData)
      authLog('AUTHCONTEXT SIGNUP - ROLE FIELD:', userData.role)
      
      // Validate that role is correctly set
      if (!userData.role || !['donor', 'recipient', 'volunteer', 'admin'].includes(userData.role)) {
        throw new Error(`Invalid role provided: ${userData.role}. Must be one of: donor, recipient, volunteer, admin`)
      }
      
      // Check if signup is enabled for this role
      const isRoleEnabled = await db.isRoleSignupEnabled(userData.role)
      if (!isRoleEnabled) {
        const roleName = userData.role.charAt(0).toUpperCase() + userData.role.slice(1)
        throw new Error(`${roleName} signup is currently disabled. Please contact the administrator for assistance.`)
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
      
      authLog('SUPABASE SIGNUP RESPONSE:', data)
      authLog('SUPABASE USER METADATA:', data?.user?.user_metadata)
      
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
        authLog('Email confirmation required for:', email)
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
      
      // CRITICAL: Check if account is suspended BEFORE attempting authentication
      // This prevents wasted auth attempts and provides immediate feedback
      try {
        const { data: userData, error: userError } = await supabase
          .from('users')
          .select('id, email, is_active')
          .eq('email', email.toLowerCase())
          .maybeSingle()
        
        if (!userError && userData) {
          const isSuspended = userData.is_active === false || userData.is_active === 'false' || userData.is_active === 0
          if (isSuspended) {
            console.error('🚨 Suspended account detected before authentication - blocking login')
            setIsSigningIn(false)
            throw new Error('ACCOUNT_SUSPENDED: Your account has been suspended. Please contact the administrator for assistance.')
          }
        }
      } catch (preCheckErr) {
        if (preCheckErr?.message?.includes('ACCOUNT_SUSPENDED')) {
          throw preCheckErr
        }
        // If pre-check fails, log but continue with authentication attempt
        console.warn('Pre-authentication suspension check failed:', preCheckErr)
      }
      
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
          // After auth failure, check again if account is suspended (in case it was suspended between attempts)
          try {
            const { data: userData, error: userError } = await supabase
              .from('users')
              .select('id, email, is_active')
              .eq('email', email.toLowerCase())
              .maybeSingle()
            
            if (!userError && userData) {
              const isSuspended = userData.is_active === false || userData.is_active === 'false' || userData.is_active === 0
              if (isSuspended) {
                console.error('🚨 Suspended account detected after auth failure - blocking login')
                throw new Error('ACCOUNT_SUSPENDED: Your account has been suspended. Please contact the administrator for assistance.')
              }
            }
          } catch (postCheckErr) {
            if (postCheckErr?.message?.includes('ACCOUNT_SUSPENDED')) {
              throw postCheckErr
            }
            // If post-check fails, continue with generic error
          }
          
          // Note: record_failed_login RPC function doesn't exist, so we track attempts client-side
          // The LoginPage component handles the warning display based on localStorage
          // Generic message (enumeration safe) and hint for Google OAuth
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
      
      // CRITICAL: Check if account is suspended IMMEDIATELY after authentication
      // This must happen BEFORE any state updates or navigation
      // We MUST block login if account is suspended
      if (data?.user?.id) {
        let accountIsSuspended = false
        let suspensionError = null
        
        // First, try to get profile via getProfile
        try {
          const userProfile = await db.getProfile(data.user.id)
          
          // If profile exists and is suspended, block login immediately
          // Check explicitly for false (not null or undefined)
          // Also check for null/undefined and treat as active (default)
          authLog('🔍 Checking account status for user:', data.user.id, 'is_active:', userProfile?.is_active, 'type:', typeof userProfile?.is_active)
          if (userProfile) {
            // Check if is_active is explicitly false (suspended)
            // Also check for string "false" in case it's stored as string
            const isSuspended = userProfile.is_active === false || userProfile.is_active === 'false' || userProfile.is_active === 0
            if (isSuspended) {
              console.error('🚨 Suspended account detected during login - blocking access')
              accountIsSuspended = true
              suspensionError = new Error('ACCOUNT_SUSPENDED: Your account has been suspended. Please contact the administrator for assistance.')
            } else if (userProfile.is_active === null || userProfile.is_active === undefined) {
              // If is_active is null/undefined, treat as active (default behavior)
              authLog('⚠️ is_active is null/undefined for user, treating as active')
            }
          }
        } catch (profileErr) {
          // If error is about suspension, use it
          if (profileErr?.message?.includes('ACCOUNT_SUSPENDED')) {
            accountIsSuspended = true
            suspensionError = profileErr
          } else {
            // Profile check failed - try direct query as fallback
            console.warn('Profile check failed, trying direct users table query:', profileErr)
            
            try {
              // Direct query to users table to check is_active status
              const { data: userData, error: userError } = await supabase
                .from('users')
                .select('id, is_active')
                .eq('id', data.user.id)
                .single()
              
              if (!userError && userData) {
                // We got user data - check if suspended
                // Check explicitly for false (not null or undefined)
                authLog('🔍 Direct query result for user:', data.user.id, 'is_active:', userData.is_active, 'type:', typeof userData.is_active)
                // Check for false, string "false", or 0
                const isSuspended = userData.is_active === false || userData.is_active === 'false' || userData.is_active === 0
                if (isSuspended) {
                  console.error('🚨 Suspended account detected via direct query - blocking access')
                  accountIsSuspended = true
                  suspensionError = new Error('ACCOUNT_SUSPENDED: Your account has been suspended. Please contact the administrator for assistance.')
                } else if (userData.is_active === null || userData.is_active === undefined) {
                  authLog('⚠️ is_active is null/undefined in direct query, treating as active')
                }
              } else if (userError && userError.code !== 'PGRST116') {
                // If it's not a "not found" error, log it
                console.error('Failed to verify account status from users table:', userError)
              }
            } catch (directCheckErr) {
              // If direct check also fails, log it
              console.warn('Direct account status check failed:', directCheckErr)
              // Don't block login if we can't verify - auth state listener will check
            }
          }
        }
        
        // If account is suspended, sign out and block login
        if (accountIsSuspended && suspensionError) {
          await supabase.auth.signOut()
          setIsSigningIn(false)
          throw suspensionError
        }
      }
      
      // Reset failed attempts on successful authentication (best-effort)
      try {
        await supabase.rpc('reset_failed_logins', { p_email: email, p_ip: null })
      } catch (resetErr) {
        // Ignore reset errors
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
        authLog('Storing role data for Google signup:', roleData)
        localStorage.setItem('pendingGoogleSignupRole', JSON.stringify(roleData))
        
        // Verify storage was successful
        const storedData = localStorage.getItem('pendingGoogleSignupRole')
        authLog('Verified stored role data:', storedData)
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
    
            // Set flag to indicate we're handling profile creation here
            profileCreationInProgressRef.current = true
            authLog('🔄 Google callback started, profile creation flag set')

    try {
      // Minimal delay for session establishment (100ms for maximum speed)
      await new Promise(resolve => setTimeout(resolve, 100))
      
      const { data: { session }, error } = await supabase.auth.getSession()
      
      if (error) throw error
      
      if (!session?.user) {
        // If no session, check if we were signed out due to suspension
        // This can happen if loadUserProfile detected suspension during initialization
        // In that case, throw suspension error instead of "No session found"
        // Check if there's a pending suspension event or if we just got signed out
        const suspendError = new Error('ACCOUNT_SUSPENDED: Your account has been suspended. Please contact the administrator for assistance.')
        throw suspendError
      }
      
      try {
        // Check if user exists in our database (ignore cache for signup verification)
        let existingProfile = null
        let profileError = null
        
        try {
          existingProfile = await db.getProfile(session.user.id)
          authLog('👤 Profile check result:', existingProfile ? 'Found existing profile' : 'No profile found')
          
          // Check if account is suspended BEFORE processing the callback
          // This prevents the "No session found" error that occurs when loadUserProfile signs out the user
          const isSuspended = existingProfile && (existingProfile.is_active === false || existingProfile.is_active === 'false' || existingProfile.is_active === 0)
          if (isSuspended) {
            // Sign out and clear state
            await supabase.auth.signOut()
            setProfile(null)
            setUser(null)
            setSession(null)
            // Throw suspension error
            throw new Error('ACCOUNT_SUSPENDED: Your account has been suspended. Please contact the administrator for assistance.')
          }
        } catch (error) {
          // If error is about suspension, re-throw it
          if (error?.message?.includes('ACCOUNT_SUSPENDED')) {
            throw error
          }
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
              authLog('⛔ Existing profile found during signup flow - account already exists')
              await supabase.auth.signOut()
              // Clear the pending role data
              localStorage.removeItem('pendingGoogleSignupRole')
              throw new Error('Account already exists. Please use the login option instead.')
            }
            
            // Get stored role data for signup
            const storedRoleData = localStorage.getItem('pendingGoogleSignupRole')
            authLog('Retrieved stored role data:', storedRoleData)
            let roleData = null
            
            if (storedRoleData) {
              try {
                roleData = JSON.parse(storedRoleData)
                authLog('Parsed role data:', roleData)
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
            
            // Check if signup is enabled for this role
            const isRoleEnabled = await db.isRoleSignupEnabled(roleData.role)
            if (!isRoleEnabled) {
              const roleName = roleData.role.charAt(0).toUpperCase() + roleData.role.slice(1)
              localStorage.removeItem('pendingGoogleSignupRole')
              await supabase.auth.signOut()
              throw new Error(`${roleName} signup is currently disabled. Please contact the administrator for assistance.`)
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
            
            authLog('Creating Google profile with data:', profileData)
            
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
            authLog('✅ Successfully created new profile for Google signup:', newProfile)
            
            // Check if account is suspended (shouldn't happen for new accounts, but check anyway)
            const isSuspended = newProfile.is_active === false || newProfile.is_active === 'false' || newProfile.is_active === 0
            if (isSuspended) {
              await supabase.auth.signOut()
              localStorage.removeItem('pendingGoogleSignupRole')
              throw new Error('ACCOUNT_SUSPENDED: Your account has been suspended. Please contact the administrator for assistance.')
            }
            
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
            
            // Check if account is suspended
            const isSuspended = existingProfile.is_active === false || existingProfile.is_active === 'false' || existingProfile.is_active === 0
            if (isSuspended) {
              // Note: loadUserProfile already dispatched the toast notification during initialization
              // Don't dispatch again to avoid duplicate notifications
              // Sign out and clear state
              await supabase.auth.signOut()
              setProfile(null)
              setUser(null)
              setSession(null)
              // Create and throw suspension error
              const suspendError = new Error('ACCOUNT_SUSPENDED: Your account has been suspended. Please contact the administrator for assistance.')
              throw suspendError
            }
            
            // Cache the existing profile for login flow
            profileCacheRef.current.set(session.user.id, existingProfile)
            authLog('✅ Existing profile cached for Google login')
            
            // Set the profile state immediately so dashboard can load
            setProfile(existingProfile)
            setLoading(false)
            
            return { user: session.user, isNewUser: false, role: existingProfile.role }
          }
        } catch (profileError) {
          // Check if error is about account suspension - if so, don't sign out again (already done)
          if (profileError?.message?.includes('ACCOUNT_SUSPENDED')) {
            // Already signed out and dispatched event in the suspension check above
            // Just re-throw the error without additional processing
            throw profileError
          }
          // For any other error in profile handling, ensure we sign out
          if (!profileError?.message?.includes('Account already exists') &&
              !profileError?.message?.includes('No account found') &&
              !profileError?.message?.includes('Role selection required')) {
            // Only sign out if we haven't already signed out for other known errors
            try {
              await supabase.auth.signOut()
            } catch (signOutError) {
              // Ignore sign out errors
            }
          }
          throw profileError
        }
    } catch (error) {
      // Only log unexpected errors, not controlled flow errors
      if (!error.message.includes('Account already exists') && 
          !error.message.includes('No account found') &&
          !error.message.includes('Role selection required') &&
          !error.message.includes('ACCOUNT_SUSPENDED')) {
        console.error('Google callback error:', error)
      }
      throw error
    } finally {
      // Clear flags regardless of success or failure
      setIsHandlingGoogleCallback(false)
      profileCreationInProgressRef.current = false
      authLog('🔄 Google callback completed, profile creation flag cleared')
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
        authLog('Sign out completed (no Supabase connection)')
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
        authLog('Successfully signed out from Supabase')
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
    authLog('Sign out completed (no authentication service)')
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
      // Check if updates contain volunteer schedule fields that should be stored in user_metadata
      const volunteerScheduleFields = ['availability_days', 'availability_times', 'max_delivery_distance', 'delivery_preferences']
      const hasVolunteerScheduleFields = volunteerScheduleFields.some(field => updates.hasOwnProperty(field))
      
      if (hasVolunteerScheduleFields && !supabase) {
        throw new Error('Supabase not configured')
      }
      
      // If updating volunteer schedule fields, update user_metadata first
      if (hasVolunteerScheduleFields) {
        const { data: { user: currentUser } } = await supabase.auth.getUser()
        const currentMetadata = currentUser?.user_metadata || {}
        
        // Prepare user_metadata updates with camelCase keys
        const metadataUpdates = {}
        if (updates.hasOwnProperty('availability_days')) {
          metadataUpdates.availabilityDays = updates.availability_days
        }
        if (updates.hasOwnProperty('availability_times')) {
          metadataUpdates.availabilityTimes = updates.availability_times
        }
        if (updates.hasOwnProperty('max_delivery_distance')) {
          metadataUpdates.maxDeliveryDistance = updates.max_delivery_distance
        }
        if (updates.hasOwnProperty('delivery_preferences')) {
          metadataUpdates.deliveryPreferences = updates.delivery_preferences
        }
        
        // Update user_metadata in Supabase Auth
        const { error: metadataError } = await supabase.auth.updateUser({
          data: {
            ...currentMetadata,
            ...metadataUpdates
          }
        })
        
        if (metadataError) {
          console.error('Error updating user_metadata:', metadataError)
          throw metadataError
        }
      }
      
      // Filter out volunteer schedule fields from users table update
      const usersTableUpdates = { ...updates }
      volunteerScheduleFields.forEach(field => {
        delete usersTableUpdates[field]
      })
      
      // Update users table with remaining fields (if any)
      let updatedProfile
      if (Object.keys(usersTableUpdates).length > 0) {
        updatedProfile = await db.updateProfile(user.id, usersTableUpdates)
      } else {
        // If only volunteer schedule fields were updated, just refresh the profile
        updatedProfile = await db.getProfile(user.id)
      }
      
      // Sync volunteer schedule fields from user_metadata to profile object
      if (hasVolunteerScheduleFields) {
        const { data: { user: updatedUser } } = await supabase.auth.getUser()
        if (updatedUser?.user_metadata) {
          updatedProfile.availability_days = updatedUser.user_metadata.availabilityDays || []
          updatedProfile.availability_times = updatedUser.user_metadata.availabilityTimes || []
          updatedProfile.max_delivery_distance = updatedUser.user_metadata.maxDeliveryDistance || 20
          updatedProfile.delivery_preferences = updatedUser.user_metadata.deliveryPreferences || []
        }
      }
      
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