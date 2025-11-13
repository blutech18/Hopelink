import React, { useState, useEffect } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useForm } from 'react-hook-form'
import { Eye, EyeOff, Heart, LogIn, AlertTriangle, Shield } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import { useToast } from '../../contexts/ToastContext'
import { supabase, db } from '../../lib/supabase'
import LoadingSpinner from '../../components/ui/LoadingSpinner'
import CaptchaModal from '../../components/security/CaptchaModal'

const LoginPage = () => {
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [isGoogleLoading, setIsGoogleLoading] = useState(false)
  const [captchaOpen, setCaptchaOpen] = useState(false)
  const [captchaEmail, setCaptchaEmail] = useState('')
  const [failedAttempts, setFailedAttempts] = useState(0)
  const [suspensionError, setSuspensionError] = useState(null)
  const { signIn: emailSignIn, signInWithGoogle, isSigningIn } = useAuth()
  const { success, error } = useToast()
  const navigate = useNavigate()
  const location = useLocation()

  const from = location.state?.from?.pathname || '/dashboard'

  // Load failed attempts from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem('failed_login_attempts')
      const attempts = stored ? parseInt(stored, 10) : 0
      setFailedAttempts(attempts)
    } catch (e) {
      // Ignore localStorage errors
    }
  }, [])
  
  // Check for error message from callback page
  React.useEffect(() => {
    if (location.state?.error) {
      const errorMsg = location.state.error
      // Check if it's a suspension error
      if (errorMsg.includes('suspended') || errorMsg.includes('Suspended')) {
        setSuspensionError(errorMsg)
      } else {
        error(errorMsg)
      }
      // Clear the error from location state
      window.history.replaceState({}, document.title)
    }
  }, [location.state, error])

  // Listen for account suspension events from auth state listener
  useEffect(() => {
    const handleSuspension = (event) => {
      if (event.detail?.message) {
        setSuspensionError(event.detail.message)
        error(event.detail.message, 'Account Suspended')
      }
    }
    
    window.addEventListener('account_suspended', handleSuspension)
    return () => window.removeEventListener('account_suspended', handleSuspension)
  }, [error])

  const {
    register,
    handleSubmit,
    formState: { errors }
  } = useForm()

  const onSubmit = async (data) => {
    setIsLoading(true)
    // Clear any previous suspension error
    setSuspensionError(null)
    
    try {
      if (typeof emailSignIn !== 'function') {
        throw new Error('Email sign-in is temporarily unavailable. Please try again later.')
      }
      
      // Attempt to sign in - this will throw if account is suspended
      await emailSignIn(data.email, data.password)
      
      // If we reach here, login was successful and account is NOT suspended
      // Reset failed attempts on successful login
      try {
        localStorage.removeItem('failed_login_attempts')
        setFailedAttempts(0)
      } catch (e) {
        // Ignore localStorage errors
      }
      
      // Double-check that account is not suspended before navigating
      // This is a safety check in case the auth state listener hasn't run yet
      try {
        const { data: { user: currentUser } } = await supabase.auth.getUser()
        if (currentUser?.id) {
          // Try getProfile first
          try {
            const userProfile = await db.getProfile(currentUser.id)
            console.log('🔍 LoginPage final check - getProfile result:', 'is_active:', userProfile?.is_active, 'type:', typeof userProfile?.is_active)
            // Check for false, string "false", or 0
            const isSuspended = userProfile && (userProfile.is_active === false || userProfile.is_active === 'false' || userProfile.is_active === 0)
            if (isSuspended) {
              // Account is suspended - sign out and throw error
              console.error('🚨 Suspended account detected in LoginPage final check - blocking navigation')
              await supabase.auth.signOut()
              throw new Error('ACCOUNT_SUSPENDED: Your account has been suspended. Please contact the administrator for assistance.')
            }
          } catch (profileErr) {
            // If getProfile fails, try direct query
            if (profileErr?.message?.includes('ACCOUNT_SUSPENDED')) {
              throw profileErr
            }
            try {
              const { data: userData, error: userError } = await supabase
                .from('users')
                .select('id, is_active')
                .eq('id', currentUser.id)
                .single()
              
              console.log('🔍 LoginPage final check - direct query result:', 'is_active:', userData?.is_active, 'type:', typeof userData?.is_active, 'error:', userError)
              // Check for false, string "false", or 0
              const isSuspended = !userError && userData && (userData.is_active === false || userData.is_active === 'false' || userData.is_active === 0)
              if (isSuspended) {
                // Account is suspended - sign out and throw error
                console.error('🚨 Suspended account detected in LoginPage direct query - blocking navigation')
                await supabase.auth.signOut()
                throw new Error('ACCOUNT_SUSPENDED: Your account has been suspended. Please contact the administrator for assistance.')
              }
            } catch (directErr) {
              if (directErr?.message?.includes('ACCOUNT_SUSPENDED')) {
                throw directErr
              }
              console.warn('LoginPage final check - both getProfile and direct query failed:', directErr)
            }
          }
        }
      } catch (finalCheckErr) {
        if (finalCheckErr?.message?.includes('ACCOUNT_SUSPENDED')) {
          throw finalCheckErr
        }
        // If check fails, log but continue - auth state listener will handle it
        console.warn('Final suspension check failed:', finalCheckErr)
      }
      
      // Wait a moment for auth state to update, then navigate
      // Only navigate if we successfully completed login without suspension error
      await new Promise(resolve => setTimeout(resolve, 500))
      
      // Final check: make sure we still have a valid session and no suspension error
      const { data: { session: finalSession } } = await supabase.auth.getSession()
      if (!finalSession?.user) {
        // Session was cleared (likely due to suspension) - don't navigate
        throw new Error('Session was cleared. Please try again.')
      }
      
      let suppressWelcome = false
      try {
        if (localStorage.getItem('justSignedUp') === 'true') {
          suppressWelcome = true
          localStorage.removeItem('justSignedUp')
        }
      } catch {}

      if (!suppressWelcome) {
        success('Welcome back!')
      }
      navigate(from, { replace: true })
    } catch (err) {
      // Increment failed attempts
      const newAttempts = failedAttempts + 1
      setFailedAttempts(newAttempts)
      try {
        localStorage.setItem('failed_login_attempts', newAttempts.toString())
      } catch (e) {
        // Ignore localStorage errors
      }

      // Handle account suspension error
      if (err.message?.includes('ACCOUNT_SUSPENDED')) {
        const suspendMessage = err.message.replace('ACCOUNT_SUSPENDED: ', '')
        // Set persistent suspension error banner
        setSuspensionError(suspendMessage)
        // Also show toast notification
        error(suspendMessage, 'Account Suspended')
      } else if (err.message?.toLowerCase().includes('too many failed attempts')) {
        error(err.message, 'Temporarily Locked')
        // If configured, prompt the CAPTCHA to request safe server-side suspension
        const fnUrl = import.meta.env.VITE_SUPABASE_FUNCTIONS_URL
        const captchaSiteKey = import.meta.env.VITE_HCAPTCHA_SITE_KEY
        if (fnUrl && captchaSiteKey) {
          setCaptchaEmail(data.email)
          setCaptchaOpen(true)
        }
      } else if (err.message?.toLowerCase().includes('multiple failed attempts detected')) {
        error(err.message, 'Security Warning')
      } else {
        // CRITICAL: Automatically suspend account after 7 failed attempts
        if (newAttempts >= 7) {
          try {
            // Find user by email and suspend them
            const { data: userData, error: userError } = await supabase
              .from('users')
              .select('id, email, is_active')
              .eq('email', data.email.toLowerCase())
              .single()
            
            if (!userError && userData) {
              // Suspend the account in the database
              const { error: suspendError } = await supabase
                .from('users')
                .update({ is_active: false, updated_at: new Date().toISOString() })
                .eq('id', userData.id)
              
              if (!suspendError) {
                console.error('🚨 Account automatically suspended after 7 failed login attempts:', data.email)
                const suspendMessage = 'Your account has been automatically suspended after 7 failed login attempts. Please contact the administrator for assistance.'
                setSuspensionError(suspendMessage)
                error(suspendMessage, 'Account Suspended')
                // Dispatch event to notify admin page to refresh
                window.dispatchEvent(new CustomEvent('user_suspended', { 
                  detail: { userId: userData.id, email: data.email }
                }))
                // Clear failed attempts counter
                try {
                  localStorage.removeItem('failed_login_attempts')
                  setFailedAttempts(0)
                } catch (e) {
                  // Ignore localStorage errors
                }
                setIsLoading(false)
                return
              } else {
                console.error('Failed to suspend account:', suspendError)
              }
            }
          } catch (suspendErr) {
            console.error('Error suspending account after 7 attempts:', suspendErr)
          }
          
          // If suspension failed, still show warning
          error('Your account has been suspended after 7 failed login attempts. Please contact support for assistance.', 'Account Suspended')
        } else if (newAttempts >= 5) {
          error(`Warning: ${newAttempts} failed login attempts detected. Your account will be suspended after 7 failed attempts. Please verify your credentials or use "Forgot Password" if needed.`, 'Security Warning')
        } else {
          error(err.message || 'Failed to sign in. Please check your credentials.')
        }
      }
      setIsLoading(false)
    }
  }

  const handleCaptchaVerified = async (token) => {
    try {
      const fnUrl = import.meta.env.VITE_SUPABASE_FUNCTIONS_URL
      if (!fnUrl) {
        error('Service unavailable. Please try again later.')
        setCaptchaOpen(false)
        return
      }
      const resp = await fetch(`${fnUrl}/auto_suspend`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: captchaEmail,
          captchaToken: token
        })
      })
      const body = await resp.json().catch(() => ({}))
      if (!resp.ok) {
        error(body?.error || 'Failed to submit verification. Please try again.')
        return
      }
      success('Account flagged for review due to repeated failed attempts.')
      setCaptchaOpen(false)
    } catch (e) {
      error('Network error while submitting verification. Please try again.')
    }
  }

  const handleGoogleLogin = async () => {
    setIsGoogleLoading(true)
    try {
      await signInWithGoogle()
      // Do not toast or navigate here; OAuth will redirect to /auth/callback
    } catch (err) {
      error(err.message || 'Failed to sign in with Google. Please try again.')
    } finally {
      setIsGoogleLoading(false)
    }
  }

  return (
    <div className="min-h-screen" style={{backgroundColor: '#00237d'}}>
      <div className="max-w-7xl mx-auto px-4 py-4">
        <div className="flex h-[calc(100vh-6rem)] rounded-3xl overflow-hidden shadow-2xl">
        {/* Left Column - Logo and Branding */}
        <div className="hidden lg:flex lg:w-1/2 flex-col justify-center items-center px-12" style={{backgroundColor: '#001a5c'}}>
          <motion.div
            initial={{ opacity: 0, x: -50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8 }}
            className="text-center"
          >
            <img src="/hopelinklogo.png" alt="HopeLink" className="h-20 rounded mx-auto mb-8" />
            <h1 className="text-4xl font-bold text-white mb-6">Welcome Back</h1>
            <p className="text-xl mb-8 max-w-md" style={{color: '#e8ebc4'}}>
              Continue making a difference in your community through HopeLink
            </p>
            
          </motion.div>
        </div>

        {/* Right Column - Login Form (yellow background column) */}
        <div className="w-full lg:w-1/2 flex flex-col justify-center py-6 px-6 sm:px-8" style={{backgroundColor: '#cdd74a'}}>
          <motion.div
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8 }}
            className="mx-auto w-full max-w-md"
          >
            {/* Mobile Logo */}
            <div className="lg:hidden text-center mb-8">
              <div className="inline-block p-3 rounded-lg mb-4" style={{backgroundColor: '#001a5c'}}>
                <img src="/hopelinklogo.png" alt="HopeLink" className="h-16 rounded mx-auto" />
              </div>
              <h2 className="text-2xl font-bold" style={{color: '#001a5c'}}>Welcome Back</h2>
              <p className="mt-2" style={{color: '#001a5c'}}>Sign in to continue making a difference</p>
            </div>

            <div className="py-6 px-6 shadow-xl rounded-2xl" style={{backgroundColor: '#001a5c'}}>
              {/* Account Suspension Error Banner - Most Important */}
              {suspensionError && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mb-4 p-4 bg-red-900/40 border-2 border-red-500 rounded-lg"
                >
                  <div className="flex items-start gap-3">
                    <Shield className="h-5 w-5 text-red-400 flex-shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <h3 className="text-sm font-semibold text-red-300 mb-1">Account Suspended</h3>
                      <p className="text-xs text-red-200 mb-2">
                        {suspensionError}
                      </p>
                      <button
                        onClick={() => setSuspensionError(null)}
                        className="text-xs text-red-300 hover:text-red-200 underline"
                      >
                        Dismiss
                      </button>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* Security Warnings */}
              {!suspensionError && failedAttempts >= 7 && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mb-4 p-4 bg-red-900/30 border-2 border-red-600 rounded-lg"
                >
                  <div className="flex items-start gap-3">
                    <Shield className="h-5 w-5 text-red-400 flex-shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <h3 className="text-sm font-semibold text-red-300 mb-1">Account Suspension Warning</h3>
                      <p className="text-xs text-red-200">
                        You have reached 7 failed login attempts. Your account may be suspended for security purposes. 
                        Please use "Forgot Password" to reset your password or contact support for assistance.
                      </p>
                    </div>
                  </div>
                </motion.div>
              )}
              {!suspensionError && failedAttempts >= 5 && failedAttempts < 7 && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mb-4 p-4 bg-yellow-900/30 border-2 border-yellow-600 rounded-lg"
                >
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="h-5 w-5 text-yellow-400 flex-shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <h3 className="text-sm font-semibold text-yellow-300 mb-1">Security Warning</h3>
                      <p className="text-xs text-yellow-200">
                        {failedAttempts} failed login attempt{failedAttempts > 1 ? 's' : ''} detected. 
                        Your account will be suspended after 7 failed attempts. Please verify your credentials or use "Forgot Password" if needed.
                      </p>
                    </div>
                  </div>
                </motion.div>
              )}

              <form className="space-y-4" onSubmit={handleSubmit(onSubmit)}>
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-white">
                    Email address
                  </label>
                  <div className="mt-1">
                    <input
                      {...register('email', {
                        required: 'Email is required',
                        pattern: {
                          value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                          message: 'Invalid email address'
                        }
                      })}
                      type="email"
                      autoComplete="email"
                      className="input"
                      placeholder="Enter your email"
                    />
                    {errors.email && (
                      <p className="mt-1 text-sm text-danger-600">{errors.email.message}</p>
                    )}
                  </div>
                </div>

                <div>
                  <label htmlFor="password" className="block text-sm font-medium text-white">
                    Password
                  </label>
                  <div className="mt-1 relative">
                    <input
                      {...register('password', {
                        required: 'Password is required',
                        minLength: {
                          value: 6,
                          message: 'Password must be at least 6 characters'
                        }
                      })}
                      type={showPassword ? 'text' : 'password'}
                      autoComplete="current-password"
                      className="input pr-10"
                      placeholder="Enter your password"
                    />
                    <button
                      type="button"
                      className="absolute inset-y-0 right-0 pr-3 flex items-center"
                      tabIndex={-1}
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? (
                        <EyeOff className="h-5 w-5 text-gray-400" />
                      ) : (
                        <Eye className="h-5 w-5 text-gray-400" />
                      )}
                    </button>
                  </div>
                  {errors.password && (
                    <p className="mt-1 text-sm text-danger-600">{errors.password.message}</p>
                  )}
                </div>

                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center flex-shrink-0">
                    <input
                      id="remember-me"
                      name="remember-me"
                      type="checkbox"
                      tabIndex={-1}
                      className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded flex-shrink-0"
                    />
                    <label htmlFor="remember-me" className="ml-2 text-sm text-gray-300 whitespace-nowrap">
                      Remember me
                    </label>
                  </div>

                  <div className="text-sm flex-shrink-0">
                    <Link
                      to="/reset-password"
                      tabIndex={-1}
                      className="font-medium text-primary-600 hover:text-primary-500 whitespace-nowrap"
                    >
                      Forgot Password
                    </Link>
                  </div>
                </div>

                <div>
                  <button
                    type="submit"
                    disabled={isLoading || isSigningIn}
                    className="btn btn-primary rounded-md w-full flex justify-center items-center"
                  >
                    {isLoading || isSigningIn ? (
                      <LoadingSpinner size="sm" />
                    ) : (
                      <>
                        <LogIn className="h-4 w-4 mr-2" />
                        Sign in
                      </>
                    )}
                  </button>
                </div>
              </form>

              <div className="mt-6">
                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-gray-300" />
                  </div>
                  <div className="relative flex justify-center text-sm">
                    <span className="px-2" style={{backgroundColor: '#001a5c', color: '#e8ebc4'}}>Or continue with</span>
                  </div>
                </div>

                <div className="mt-6">
                  <button
                    type="button"
                    onClick={handleGoogleLogin}
                    disabled={isGoogleLoading}
                    className="w-full flex justify-center items-center py-2 px-4 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isGoogleLoading ? (
                      <LoadingSpinner size="sm" />
                    ) : (
                      <>
                        <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
                          <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                          <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                          <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                          <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                        </svg>
                        Continue with Google
                      </>
                    )}
                  </button>
                </div>
              </div>

              <div className="mt-6">
                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-gray-300" />
                  </div>
                  <div className="relative flex justify-center text-sm">
                    <span className="px-2" style={{backgroundColor: '#001a5c', color: '#e8ebc4'}}>New to HopeLink?</span>
                  </div>
                </div>

                <div className="mt-6">
                  <Link
                    to="/signup"
                    className="w-full flex justify-center py-2 px-4 border rounded-lg text-sm font-medium transition-colors"
                    style={{borderColor: '#cdd74a', color: '#cdd74a'}}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(205, 215, 74, 0.1)'}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                  >
                    Create an account
                  </Link>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
        </div>
        <CaptchaModal
          open={captchaOpen}
          siteKey={import.meta.env.VITE_HCAPTCHA_SITE_KEY}
          onVerified={handleCaptchaVerified}
          onClose={() => setCaptchaOpen(false)}
          title="Additional verification required"
          description="Due to repeated failed login attempts, please complete the CAPTCHA. If abuse is detected, your account may be suspended for protection."
        />
      </div>
    </div>
  )
}

export default LoginPage