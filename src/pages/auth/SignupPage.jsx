import React, { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useForm } from 'react-hook-form'
import { 
  UserPlus, 
  ArrowLeft, 
  ArrowRight,
  Eye, 
  EyeOff, 
  Heart, 
  Phone, 
  User,
  Gift,
  Users
} from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import { useToast } from '../../contexts/ToastContext'
import LoadingSpinner from '../../components/ui/LoadingSpinner'
import TermsModal from '../../components/ui/TermsModal'
import TermsContent from '../../components/ui/TermsContent'
import RoleSelectionModal from '../../components/ui/RoleSelectionModal'
import { db, supabase } from '../../lib/supabase'
import { checkRateLimit, recordAttempt, resetRateLimit, getRateLimitMessage } from '../../lib/rateLimiter'

const SignupPage = () => {
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [isGoogleLoading, setIsGoogleLoading] = useState(false)
  const [currentStep, setCurrentStep] = useState(1)
  const [showLegalModal, setShowLegalModal] = useState(false)
  const [hasReadLegal, setHasReadLegal] = useState(false)
  const [agreeToLegal, setAgreeToLegal] = useState(false)
  const [showRoleModal, setShowRoleModal] = useState(false)
  const [isCheckingEmail, setIsCheckingEmail] = useState(false)
  const [emailTaken, setEmailTaken] = useState(false)
  const [enabledRoles, setEnabledRoles] = useState(['donor', 'recipient', 'volunteer']) // Default to all enabled
  const { signUp, signUpWithGoogle, isSigningIn } = useAuth()
  const { success, error } = useToast()
  const navigate = useNavigate()

  const {
    register,
    handleSubmit,
    watch,
    trigger,
    formState: { errors }
  } = useForm()

  const password = watch('password')
  const selectedRole = watch('role')

  const onSubmit = async (data) => {
    // Check if both terms and privacy are agreed to
    if (!agreeToLegal) {
      error('Please agree to the Terms of Service and Privacy Policy to continue.')
      return
    }

    // Final check: prevent submission if email is taken
    if (emailTaken) {
      error('This email is already registered. Please use a different email or login.')
      return
    }

    // Check rate limit
    const rateLimitStatus = checkRateLimit('signup')
    if (!rateLimitStatus.allowed) {
      const message = getRateLimitMessage('signup')
      error(message || 'Too many signup attempts. Please try again later.')
      return
    }

    // Record attempt
    if (!recordAttempt('signup')) {
      const message = getRateLimitMessage('signup')
      error(message || 'Too many signup attempts. Please try again later.')
      return
    }

    setIsLoading(true)
    try {
      const result = await signUp(data.email, data.password, {
        full_name: data.fullName,
        phone: data.phone,
        role: data.role,
        address: data.address || '',
        city: data.city || '',
        state: data.state || '',
        zip_code: data.zipCode || ''
      })
      
      // Mark that the user just signed up (to adjust first-login messaging)
      try { localStorage.setItem('justSignedUp', 'true') } catch {}

      // Reset rate limit on successful signup
      resetRateLimit('signup')
      
      // Show verification instructions and redirect to login
      setTimeout(() => {
        success('Account created! Please check your email to verify your account.')
        navigate('/login', { replace: true })
      }, 500)
    } catch (err) {
      // Check if error is about existing user
      const errMsg = err.message || ''
      if (errMsg.toLowerCase().includes('already registered') || 
          errMsg.toLowerCase().includes('user already exists') ||
          errMsg.toLowerCase().includes('duplicate') ||
          errMsg.toLowerCase().includes('already exists')) {
        error('This email is already registered. Redirecting to login...')
        setEmailTaken(true)
        // Navigate to login page after showing error (fast redirect)
        setTimeout(() => {
          navigate('/login', { replace: true })
        }, 1000)
      } else {
        error(errMsg || 'Failed to create account. Please try again.')
      }
      setIsLoading(false)
    }
  }

  const handleGoogleSignupClick = () => {
    // Open role selection modal
    setShowRoleModal(true)
  }

  const handleRoleSelected = async (role) => {
    setShowRoleModal(false)
    setIsGoogleLoading(true)
    try {
      // Pass the selected role to the Google signup
      const phone = watch('phone') || '09000000000'
      const roleData = { role, phone }
      await signUpWithGoogle(roleData)
      // Do not toast or navigate here; OAuth will redirect to /auth/callback
    } catch (err) {
      error(err.message || 'Failed to create account with Google. Please try again.')
    } finally {
      setIsGoogleLoading(false)
    }
  }

  const nextStep = async () => {
    const fieldsToValidate = currentStep === 1 
      ? ['fullName', 'email', 'phone'] 
      : ['password', 'confirmPassword']
    
    const isValid = await trigger(fieldsToValidate)
    
    // Additional check: prevent proceeding if email is taken
    if (currentStep === 1 && emailTaken) {
      error('This email is already registered. Please use a different email or login.')
      return
    }
    
    if (isValid && currentStep < 3) {
      setCurrentStep(currentStep + 1)
    }
  }

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1)
    }
  }

  const handleLegalModalClose = () => {
    setShowLegalModal(false)
  }

  const handleLegalScrollComplete = () => {
    setHasReadLegal(true)
  }

  const handleLegalAccept = () => {
    setAgreeToLegal(true)
    setShowLegalModal(false)
  }

  const handleCheckboxClick = (e) => {
    if (!agreeToLegal) {
      e.preventDefault()
      setShowLegalModal(true)
    }
  }

  const checkEmailAvailability = async (email) => {
    if (!email || !/^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i.test(email)) {
      setEmailTaken(false)
      return
    }

    setIsCheckingEmail(true)
    try {
      // Check database for existing accounts (includes both regular and OAuth accounts)
      const isAvailable = await db.checkEmailAvailability(email)
      
      setEmailTaken(!isAvailable)
      
      if (!isAvailable) {
        error('This email is already registered. Please use a different email or login.')
      }
    } catch (err) {
      console.error('Error checking email:', err)
      // Don't block user if check fails, let the actual signup handle it
      setEmailTaken(false)
    } finally {
      setIsCheckingEmail(false)
    }
  }

  const steps = [
    {
      number: 1,
      title: 'Personal Information',
      description: 'Tell us about yourself'
    },
    {
      number: 2,
      title: 'Account Security',
      description: 'Create your password'
    },
    {
      number: 3,
      title: 'Choose Your Role',
      description: 'How will you help?'
    }
  ]

  const allRoles = [
    {
      value: 'donor',
      label: 'Donor',
      description: 'Share items with those in need',
      icon: Gift,
      color: 'bg-green-900/30 border-green-700/30 text-green-300'
    },
    {
      value: 'recipient',
      label: 'Recipient',
      description: 'Find items you need',
      icon: User,
      color: 'bg-blue-900/30 border-blue-700/30 text-blue-300'
    },
    {
      value: 'volunteer',
      label: 'Volunteer',
      description: 'Help coordinate and deliver items',
      icon: Users,
      color: 'bg-purple-900/30 border-purple-700/30 text-purple-300'
    }
  ]

  // Filter roles based on enabled signup settings
  const roles = allRoles.filter(role => enabledRoles.includes(role.value))
  
  // Load enabled roles on component mount
  useEffect(() => {
    const loadRoleSettings = async () => {
      try {
        const settings = await db.getSettings()
        const enabled = []
        if (settings.donor_signup_enabled !== false) enabled.push('donor')
        if (settings.recipient_signup_enabled !== false) enabled.push('recipient')
        if (settings.volunteer_signup_enabled !== false) enabled.push('volunteer')
        setEnabledRoles(enabled)
        
        // If no roles are enabled, show error
        if (enabled.length === 0) {
          error('Signup is currently disabled for all roles. Please contact the administrator.')
        }
      } catch (err) {
        console.error('Error loading role settings:', err)
        // Default to all enabled if check fails
      }
    }
    loadRoleSettings()
  }, [error])

  return (
    <div className="min-h-screen" style={{backgroundColor: '#00237d'}}>
      <div className="max-w-7xl mx-auto px-4 py-4">
        <div className="flex h-[calc(100vh-6rem)] rounded-3xl overflow-hidden shadow-2xl">
        {/* Left Column - Signup Form (yellow background column) */}
        <div className="w-full lg:w-1/2 flex flex-col justify-center py-2 px-4 sm:px-6" style={{backgroundColor: '#cdd74a'}}>
        <motion.div
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8 }}
            className="mx-auto w-full max-w-xl"
          >
            {/* Mobile Logo */}
            <div className="lg:hidden text-center mb-3">
              <div className="inline-block p-2 rounded-lg mb-2" style={{backgroundColor: '#001a5c'}}>
                <img src="/hopelinklogo.png" alt="HopeLink" className="h-12 rounded mx-auto" />
              </div>
              <h2 className="text-lg font-bold" style={{color: '#001a5c'}}>Join HopeLink</h2>
              <p className="text-xs mt-0.5" style={{color: '#001a5c'}}>Create your account and start making a difference</p>
          </div>

            {/* Quick Signup Notice removed for compactness */}

        {/* Progress Steps */}
            <div className="mb-2">
              <div className="flex items-center justify-center space-x-3">
            {steps.map((step, index) => (
              <div key={step.number} className="flex items-center">
                    <div className={`flex items-center justify-center w-6 h-6 rounded-full border-2 text-xs ${
                  currentStep >= step.number 
                        ? 'bg-[#001a5c] border-[#001a5c] text-white' 
                        : 'bg-white border-gray-700 text-gray-900'
                }`}>
                  {step.number}
                </div>
                {index < steps.length - 1 && (
                      <div className={`w-8 h-0.5 ${
                        currentStep > step.number ? 'bg-gray-800' : 'bg-gray-600'
                  }`} />
                )}
              </div>
            ))}
          </div>
          <div className="mt-1.5 text-center">
                <p className="text-xs font-medium text-[#001a5c]">{steps[currentStep - 1].title}</p>
                <p className="text-[10px] text-[#001a5c]">{steps[currentStep - 1].description}</p>
        </div>
      </div>

            <div className="py-3 px-4 shadow-xl rounded-2xl" style={{backgroundColor: '#001a5c'}}>
              <form className="space-y-3" onSubmit={handleSubmit(onSubmit)}>
            <AnimatePresence mode="wait">
              {currentStep === 1 && (
                <motion.div
                  key="step1"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                      className="space-y-3"
                >
                  <div>
                        <label htmlFor="fullName" className="block text-sm font-medium text-white">
                      Full Name
                    </label>
                    <div className="mt-1">
                      <input
                            {...register('fullName', {
                              required: 'Full name is required',
                          minLength: {
                            value: 2,
                            message: 'Name must be at least 2 characters'
                          }
                        })}
                        type="text"
                        autoComplete="name"
                        className="input"
                        placeholder="Enter your full name"
                      />
                          {errors.fullName && (
                            <p className="mt-1 text-sm text-danger-600">{errors.fullName.message}</p>
                      )}
                    </div>
                  </div>

                  <div>
                    <label htmlFor="email" className="block text-sm font-medium text-white">
                          Email Address
                    </label>
                    <div className="mt-1">
                      <input
                        {...register('email', {
                          required: 'Email is required',
                          pattern: {
                            value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                            message: 'Invalid email address'
                          },
                          validate: {
                            notTaken: () => !emailTaken || 'This email is already registered'
                          }
                        })}
                        type="email"
                        autoComplete="email"
                        className={`input ${emailTaken ? 'border-red-500' : ''}`}
                        placeholder="Enter your email"
                        onBlur={(e) => checkEmailAvailability(e.target.value)}
                      />
                      {isCheckingEmail && (
                        <p className="mt-1 text-sm text-gray-400">Checking availability...</p>
                      )}
                      {errors.email && (
                        <p className="mt-1 text-sm text-danger-600">{errors.email.message}</p>
                      )}
                      {emailTaken && (
                        <p className="mt-1 text-sm text-danger-600">This email is already registered</p>
                      )}
                    </div>
                  </div>

                  <div>
                    <label htmlFor="phone" className="block text-sm font-medium text-white">
                      Phone Number
                    </label>
                    <div className="mt-1 relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Phone className="h-5 w-5 text-gray-400" />
                      </div>
                      <input
                        {...register('phone', {
                          required: 'Phone number is required',
                          pattern: {
                                value: /^(09|\+639)\d{9}$/,
                                message: 'Please enter a valid Philippines phone number (e.g., 09123456789 or +639123456789)'
                          }
                        })}
                        type="tel"
                        autoComplete="tel"
                        className="input pl-10"
                            placeholder="09123456789"
                        maxLength="13"
                      />
                    </div>
                    {errors.phone && (
                      <p className="mt-1 text-sm text-danger-600">{errors.phone.message}</p>
                    )}
                  </div>
                    </motion.div>
              )}

              {currentStep === 2 && (
                <motion.div
                  key="step2"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                      className="space-y-3"
                    >
                  <div>
                    <label htmlFor="password" className="block text-sm font-medium text-white">
                      Password
                    </label>
                    <div className="mt-1 relative">
                      <input
                        {...register('password', {
                          required: 'Password is required',
                          minLength: {
                            value: 8,
                            message: 'Password must be at least 8 characters'
                          },
                          validate: {
                            hasUpperCase: (value) => /[A-Z]/.test(value) || 'Password must contain at least one uppercase letter',
                            hasLowerCase: (value) => /[a-z]/.test(value) || 'Password must contain at least one lowercase letter',
                            hasNumber: (value) => /[0-9]/.test(value) || 'Password must contain at least one number'
                          }
                        })}
                        type={showPassword ? 'text' : 'password'}
                        autoComplete="new-password"
                        className="input pr-10"
                        placeholder="Create a strong password"
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
                    {!errors.password && password && (
                      <p className="mt-1 text-xs text-gray-400">
                        Use 8+ characters with uppercase, lowercase, and numbers
                      </p>
                    )}
                  </div>

                  <div>
                    <label htmlFor="confirmPassword" className="block text-sm font-medium text-white">
                      Confirm Password
                    </label>
                    <div className="mt-1 relative">
                      <input
                        {...register('confirmPassword', {
                          required: 'Please confirm your password',
                          validate: value => value === password || 'Passwords do not match'
                        })}
                        type={showConfirmPassword ? 'text' : 'password'}
                        autoComplete="new-password"
                        className="input pr-10"
                        placeholder="Confirm your password"
                      />
                      <button
                        type="button"
                        className="absolute inset-y-0 right-0 pr-3 flex items-center"
                        tabIndex={-1}
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      >
                        {showConfirmPassword ? (
                          <EyeOff className="h-5 w-5 text-gray-400" />
                        ) : (
                          <Eye className="h-5 w-5 text-gray-400" />
                        )}
                      </button>
                    </div>
                    {errors.confirmPassword && (
                      <p className="mt-1 text-sm text-danger-600">{errors.confirmPassword.message}</p>
                    )}
                  </div>
                    </motion.div>
                  )}

                  {currentStep === 3 && (
                    <motion.div
                      key="step3"
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      className="space-y-3"
                    >
                      <div>
                        <label className="block text-sm font-medium text-white mb-3">
                          Choose Your Role
                        </label>
                        {roles.length === 0 ? (
                          <div className="p-4 rounded-lg bg-red-900/20 border border-red-700/30">
                            <p className="text-red-300 text-sm font-medium mb-1">Signup Disabled</p>
                            <p className="text-red-400 text-xs">Signup is currently disabled for all roles. Please contact the administrator for assistance.</p>
                          </div>
                        ) : (
                        <div className="space-y-2">
                          {roles.map((role) => {
                            const IconComponent = role.icon
                            return (
                              <label key={role.value} className="cursor-pointer block">
                                <input
                                  type="radio"
                                  value={role.value}
                                  {...register('role', { required: 'Please select a role' })}
                                  className="sr-only"
                                />
                                <div className={`
                                  flex items-center p-3 rounded-lg border-2 transition-all
                                  ${selectedRole === role.value 
                                    ? 'shadow-lg' 
                                    : 'border-gray-600 bg-gray-800 hover:border-gray-500'
                                  }
                                `}
                                style={selectedRole === role.value ? {
                                  borderColor: '#cdd74a',
                                  backgroundColor: 'rgba(205, 215, 74, 0.2)'
                                } : {}}
                                >
                                  <IconComponent className="h-5 w-5 mr-2.5 flex-shrink-0" style={{color: '#cdd74a'}} />
                                  <div className="flex-1 min-w-0">
                                    <h3 className="text-sm font-medium text-white">{role.label}</h3>
                                    <p className="text-xs text-gray-300">{role.description}</p>
                                  </div>
                                  {selectedRole === role.value && (
                                    <div className="w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0" style={{backgroundColor: '#cdd74a'}}>
                                      <div className="w-2 h-2 bg-white rounded-full"></div>
                                    </div>
                                  )}
                                </div>
                              </label>
                            )
                          })}
                        </div>
                        )}
                        {errors.role && (
                          <p className="mt-2 text-sm text-danger-600">{errors.role.message}</p>
                        )}
                      </div>

                      <div className="bg-gray-800/50 p-2.5 rounded-lg">
                        <label className="flex items-start cursor-pointer" onClick={handleCheckboxClick}>
                          <input
                            type="checkbox"
                            checked={agreeToLegal}
                            onChange={() => {}}
                            onClick={handleCheckboxClick}
                            className="mt-0.5 h-4 w-4 border-gray-300 rounded pointer-events-none flex-shrink-0"
                            style={{accentColor: '#cdd74a'}}
                          />
                          <span className="ml-2.5 text-xs text-gray-300">
                            I agree to the{' '}
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation()
                                setShowLegalModal(true)
                              }}
                              className="underline transition-colors"
                              style={{color: '#cdd74a'}}
                              onMouseEnter={(e) => e.currentTarget.style.color = '#b8c242'}
                              onMouseLeave={(e) => e.currentTarget.style.color = '#cdd74a'}
                            >
                              Terms of Service and Privacy Policy
                            </button>
                          </span>
                        </label>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Navigation Buttons */}
                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={prevStep}
                    disabled={currentStep === 1}
                    tabIndex={currentStep === 2 ? -1 : 0}
                    className="flex items-center justify-center px-4 py-2.5 text-sm font-medium text-white bg-gray-700 rounded-lg hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-95"
                  >
                    <ArrowLeft className="h-4 w-4 mr-1.5" />
                    Previous
                  </button>

                  {currentStep < 3 ? (
                    <button
                      type="button"
                      onClick={nextStep}
                      disabled={currentStep === 1 && (emailTaken || isCheckingEmail)}
                      className="flex-1 flex items-center justify-center px-4 py-2.5 text-sm font-semibold text-navy-900 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md hover:shadow-lg active:scale-95"
                      style={{backgroundColor: '#cdd74a'}}
                      onMouseEnter={(e) => !e.currentTarget.disabled && (e.currentTarget.style.backgroundColor = '#b8c242')}
                      onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#cdd74a'}
                    >
                      Next
                      <ArrowRight className="h-4 w-4 ml-1.5" />
                    </button>
                  ) : (
                    <button
                      type="submit"
                      disabled={isLoading || isSigningIn || !agreeToLegal}
                      className="flex-1 flex items-center justify-center px-4 py-2.5 text-sm font-semibold text-navy-900 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md hover:shadow-lg active:scale-95"
                      style={{backgroundColor: '#cdd74a'}}
                      onMouseEnter={(e) => !e.currentTarget.disabled && (e.currentTarget.style.backgroundColor = '#b8c242')}
                      onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#cdd74a'}
                    >
                      {isLoading || isSigningIn ? (
                        <LoadingSpinner size="sm" />
                      ) : (
                        <>
                          <UserPlus className="h-4 w-4 mr-1.5" />
                          Create Account
                        </>
                      )}
                    </button>
                  )}
                </div>
              </form>

              {/* Google Signup - Only show on Step 1 */}
              {currentStep === 1 && (
                <div className="mt-4">
                  <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                      <div className="w-full border-t border-gray-300" />
                    </div>
                    <div className="relative flex justify-center text-sm">
                      <span className="px-2" style={{backgroundColor: '#001a5c', color: '#e8ebc4'}}>Or sign up with</span>
                    </div>
                  </div>

                  <div className="mt-4">
                    <button
                      type="button"
                      onClick={handleGoogleSignupClick}
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
              )}

              <div className="mt-4 text-center">
              <Link
                to="/login"
                  className="text-sm transition-colors"
                  style={{color: '#cdd74a'}}
                  onMouseEnter={(e) => e.currentTarget.style.color = '#b8c242'}
                  onMouseLeave={(e) => e.currentTarget.style.color = '#cdd74a'}
              >
                Already have an account? Sign in
              </Link>
            </div>
          </div>
          </motion.div>
        </div>

        {/* Right Column - Logo and Branding (moved to right) */}
        <div className="hidden lg:flex lg:w-1/2 flex-col justify-center items-center px-12" style={{backgroundColor: '#001a5c'}}>
        <motion.div
            initial={{ opacity: 0, x: -50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8 }}
            className="text-center"
          >
            <img src="/hopelinklogo.png" alt="HopeLink" className="h-20 rounded mx-auto mb-8" />
            <h1 className="text-4xl font-bold text-white mb-6">Join HopeLink</h1>
            <p className="text-xl mb-8 max-w-md mx-auto" style={{color: '#e8ebc4'}}>
              Become part of a community that connects hearts and makes a real difference
            </p>
            
            
      </motion.div>
        </div>
        </div>
      </div>

              {/* Legal Modal */}
        <TermsModal
          isOpen={showLegalModal}
          onClose={handleLegalModalClose}
          title="Terms of Service and Privacy Policy"
          onScrolledToBottom={handleLegalScrollComplete}
          hasScrolledToBottom={hasReadLegal}
          onAccept={handleLegalAccept}
        >
          <TermsContent />
        </TermsModal>

        {/* Role Selection Modal for Google Signup */}
        <RoleSelectionModal
          isOpen={showRoleModal}
          onClose={() => setShowRoleModal(false)}
          onSelectRole={handleRoleSelected}
          enabledRoles={enabledRoles}
        />
    </div>
  )
}

export default SignupPage 