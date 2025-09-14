import React, { useState } from 'react'
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
  Users,
  Truck
} from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import { useToast } from '../../contexts/ToastContext'
import LoadingSpinner from '../../components/ui/LoadingSpinner'
import TermsModal from '../../components/ui/TermsModal'
import TermsContent from '../../components/ui/TermsContent'

const SignupPage = () => {
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [isGoogleLoading, setIsGoogleLoading] = useState(false)
  const [currentStep, setCurrentStep] = useState(1)
  const [showLegalModal, setShowLegalModal] = useState(false)
  const [hasReadLegal, setHasReadLegal] = useState(false)
  const [agreeToLegal, setAgreeToLegal] = useState(false)
  const { signUp, signUpWithGoogle } = useAuth()
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
      error('You must agree to the Terms of Service and Privacy Policy to create an account.')
      return
    }

    setIsLoading(true)
    try {
      const { email, password, ...userData } = data
      const userMetadata = {
        ...userData,
        // Provide default values for fields that will be completed later
        accountType: 'individual',
        address: 'To be completed',
        city: 'Cagayan de Oro City',
        province: 'Misamis Oriental',
        zipcode: '9000'
      }
      const result = await signUp(email, password, userMetadata)
      
      if (result.user && !result.session) {
        success('Account created! Please check your email and click the verification link before signing in.')
      } else {
        success('Account created successfully!')
      }
      
      navigate('/login')
    } catch (err) {
      error(err.message || 'Failed to create account. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const nextStep = async () => {
    const fieldsToValidate = ['name', 'email', 'phone', 'role']
    const isValid = await trigger(fieldsToValidate)
    if (isValid) {
      setCurrentStep(2)
    }
  }

  const prevStep = () => {
    setCurrentStep(1)
  }

  // Handle Legal modal interactions
  const handleLegalModalClose = (accepted) => {
    setShowLegalModal(false)
    if (accepted) {
      setAgreeToLegal(true)
    }
  }

  const handleLegalScrollComplete = () => {
    setHasReadLegal(true)
  }

  const handleLegalCheckboxClick = (e) => {
    if (!agreeToLegal) {
      e.preventDefault()
      setShowLegalModal(true)
    } else {
      setAgreeToLegal(false)
    }
  }

  const handleGoogleSignup = async () => {
    // Get the current value directly from the form
    const currentRole = watch('role')
    const phone = watch('phone')
    
    if (!currentRole) {
      error('Please select your role before continuing with Google signup.')
      return
    }

    if (!agreeToLegal) {
      error('You must agree to the Terms of Service and Privacy Policy to create an account.')
      return
    }

    setIsGoogleLoading(true)
    try {
      console.log('Google signup with role data:', { role: currentRole, phone })
      await signUpWithGoogle({ role: currentRole, phone })
      // The redirect will be handled by the OAuth flow
    } catch (err) {
      error(err.message || 'Failed to sign up with Google. Please try again.')
      setIsGoogleLoading(false)
    }
  }

  const steps = [
    { number: 1, title: 'Basic Information', description: 'Essential details and role selection' },
    { number: 2, title: 'Account Security', description: 'Password and terms agreement' }
  ]

  const roleOptions = [
    {
      value: 'donor',
      label: 'Donor',
      description: 'Share resources with those in need',
      icon: Gift,
      color: 'bg-blue-900/30 border-blue-700/30 text-blue-300'
    },
    {
      value: 'recipient',
      label: 'Recipient',
      description: 'Request assistance from the community',
      icon: Users,
      color: 'bg-green-900/30 border-green-700/30 text-green-300'
    },
    {
      value: 'volunteer',
      label: 'Volunteer',
      description: 'Help deliver donations and support',
      icon: Truck,
      color: 'bg-purple-900/30 border-purple-700/30 text-purple-300'
    }
  ]

  return (
    <div className="min-h-screen bg-navy-950 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-2xl">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="flex justify-center"
        >
          <img src="/hopelinklogo.png" alt="HopeLink" className="h-12 w-12 rounded" />
        </motion.div>
        <motion.h2
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="mt-6 text-center text-3xl font-bold text-white"
        >
          Join HopeLink Community
        </motion.h2>
        <motion.p
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="mt-2 text-center text-sm text-skyblue-300"
        >
          Create your account and start making a difference
        </motion.p>
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="mt-4 text-center"
        >
          <div className="inline-flex items-center px-3 py-1 text-xs bg-blue-900/30 text-blue-300 rounded-full border border-blue-700/30">
            <span>✨ Quick signup - Complete your profile later for verification</span>
          </div>
        </motion.div>

        {/* Progress Steps */}
        <div className="mt-8">
          <div className="flex items-center justify-between">
            {steps.map((step, index) => (
              <div key={step.number} className="flex items-center">
                <div className={`flex items-center justify-center w-8 h-8 rounded-full border-2 ${
                  currentStep >= step.number 
                    ? 'bg-skyblue-600 border-skyblue-600 text-white' 
                    : 'border-navy-700 text-skyblue-400'
                }`}>
                  {step.number}
                </div>
                {index < steps.length - 1 && (
                  <div className={`w-24 h-0.5 ${
                    currentStep > step.number ? 'bg-skyblue-600' : 'bg-navy-700'
                  }`} />
                )}
              </div>
            ))}
          </div>
          <div className="mt-2 text-center">
            <p className="text-sm font-medium text-white">{steps[currentStep - 1].title}</p>
            <p className="text-xs text-skyblue-300">{steps[currentStep - 1].description}</p>
          </div>
        </div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.3 }}
        className="mt-8 sm:mx-auto sm:w-full sm:max-w-2xl"
      >
        <div className="bg-navy-900 py-8 px-4 shadow-lg sm:rounded-lg sm:px-10">
          <form className="space-y-6" onSubmit={handleSubmit(onSubmit)}>
            <AnimatePresence mode="wait">
              {currentStep === 1 && (
                <motion.div
                  key="step1"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.3 }}
                  className="space-y-6"
                >
                  {/* Name Field */}
                  <div>
                    <label htmlFor="name" className="block text-sm font-medium text-white">
                      Full Name
                    </label>
                    <div className="mt-1">
                      <input
                        {...register('name', {
                          required: 'Name is required',
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
                      {errors.name && (
                        <p className="mt-1 text-sm text-danger-600">{errors.name.message}</p>
                      )}
                    </div>
                  </div>

                  {/* Email Field */}
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

                  {/* Phone Field */}
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
                            value: /^09\d{9}$/,
                            message: 'Please enter a valid 11-digit Philippines phone number starting with 09'
                          }
                        })}
                        type="tel"
                        autoComplete="tel"
                        className="input pl-10"
                        placeholder="09123456789"
                        maxLength="11"
                      />
                    </div>
                    {errors.phone && (
                      <p className="mt-1 text-sm text-danger-600">{errors.phone.message}</p>
                    )}
                  </div>

                  {/* Role Selection */}
                  <div>
                    <label className="block text-sm font-medium text-white mb-3">
                      How would you like to participate?
                    </label>
                    <div className="grid grid-cols-1 gap-3">
                      {roleOptions.map((role) => {
                        const IconComponent = role.icon
                        return (
                          <label key={role.value} className="cursor-pointer">
                            <input
                              {...register('role', {
                                required: 'Please select your role'
                              })}
                              type="radio"
                              value={role.value}
                              className="sr-only"
                            />
                            <div className={`
                              flex items-center p-4 rounded-lg border transition-all
                              ${selectedRole === role.value 
                                ? 'border-skyblue-500 bg-skyblue-900/20' 
                                : 'border-navy-700 bg-navy-800 hover:border-navy-600'
                              }
                            `}>
                              <IconComponent className="h-6 w-6 text-skyblue-400 mr-3" />
                              <div className="flex-1">
                                <h3 className="text-sm font-medium text-white">{role.label}</h3>
                                <p className="text-xs text-skyblue-300">{role.description}</p>
                              </div>
                              {selectedRole === role.value && (
                                <div className="w-4 h-4 bg-skyblue-500 rounded-full flex items-center justify-center">
                                  <div className="w-2 h-2 bg-white rounded-full"></div>
                                </div>
                              )}
                            </div>
                          </label>
                        )
                      })}
                    </div>
                    {errors.role && (
                      <p className="mt-1 text-sm text-danger-600">{errors.role.message}</p>
                    )}
                  </div>

                  {/* Terms of Service Agreement - Moved from step 2 */}
                  <div className="flex items-start mb-4">
                    <input
                      id="agree-to-legal"
                      type="checkbox"
                      checked={agreeToLegal}
                      onChange={handleLegalCheckboxClick}
                      className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded mt-0.5"
                    />
                    <label htmlFor="agree-to-legal" className="ml-2 block text-sm text-white">
                      I agree to the{' '}
                      <button
                        type="button"
                        onClick={() => setShowLegalModal(true)}
                        className="text-primary-600 hover:text-primary-500 underline"
                      >
                        Terms of Service and Privacy Policy
                      </button>
                    </label>
                  </div>

                  {/* Error message if agreement is missing */}
                  {!agreeToLegal && (
                    <div className="p-3 bg-red-900/30 border border-red-700/50 rounded-lg mb-4">
                      <p className="text-red-300 text-sm">
                        ⚠️ You must agree to the Terms of Service and Privacy Policy to create an account.
                      </p>
                    </div>
                  )}

                  <div className="space-y-4">
                    <button
                      type="button"
                      onClick={nextStep}
                      className="btn btn-primary w-full flex items-center justify-center"
                    >
                      Next Step
                      <ArrowRight className="h-4 w-4 ml-2" />
                    </button>

                    <div className="relative">
                      <div className="absolute inset-0 flex items-center">
                        <div className="w-full border-t border-gray-300" />
                      </div>
                      <div className="relative flex justify-center text-sm">
                        <span className="px-2 bg-navy-900 text-skyblue-300">Or continue with</span>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={handleGoogleSignup}
                      disabled={isLoading || isGoogleLoading || !selectedRole || !agreeToLegal}
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

                    {(!selectedRole || !agreeToLegal) && (
                      <p className="text-xs text-yellow-400 text-center">
                        {!selectedRole ? "Please select a role" : ""}
                        {!selectedRole && !agreeToLegal ? " and " : ""}
                        {!agreeToLegal ? "agree to the terms" : ""}
                        {" to enable Google signup"}
                      </p>
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
                  transition={{ duration: 0.3 }}
                  className="space-y-6"
                >
                  {/* Info Message */}
                  <div className="bg-navy-800 border border-skyblue-700 rounded-lg p-4">
                    <div className="flex items-start">
                      <div className="flex-shrink-0">
                        <Heart className="h-5 w-5 text-skyblue-400 mt-0.5" />
                      </div>
                      <div className="ml-3">
                        <h3 className="text-sm font-medium text-white">Complete Your Profile Later</h3>
                        <p className="text-xs text-skyblue-300 mt-1">
                          After registration, you can complete your profile with role-specific details for verification and better community trust.
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Password Field */}
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
                        autoComplete="new-password"
                        className="input pr-10"
                        placeholder="Create a password"
                      />
                      <button
                        type="button"
                        className="absolute inset-y-0 right-0 pr-3 flex items-center"
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

                  {/* Confirm Password Field */}
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

                  {/* Terms agreement has been moved to step 1 */}

                  <div className="flex space-x-4">
                    <button
                      type="button"
                      onClick={prevStep}
                      className="flex-1 btn border border-skyblue-600 text-skyblue-400 bg-navy-800 hover:bg-navy-700 flex items-center justify-center"
                    >
                      <ArrowLeft className="h-4 w-4 mr-2" />
                      Previous
                    </button>
                    <button
                      type="submit"
                      disabled={isLoading || isGoogleLoading}
                      className="flex-1 btn btn-primary flex items-center justify-center"
                    >
                      {isLoading ? (
                        <LoadingSpinner size="sm" />
                      ) : (
                        <>
                          <UserPlus className="h-4 w-4 mr-2" />
                          Create Account
                        </>
                      )}
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </form>

          <div className="mt-6">
            <div className="flex items-center justify-center">
              <Link
                to="/login"
                className="text-sm text-primary-600 hover:text-primary-500"
              >
                Already have an account? Sign in
              </Link>
            </div>
          </div>
        </div>
      </motion.div>

              {/* Legal Modal */}
        <TermsModal
          isOpen={showLegalModal}
          onClose={handleLegalModalClose}
          title="Terms of Service and Privacy Policy"
          onScrolledToBottom={handleLegalScrollComplete}
          hasScrolledToBottom={hasReadLegal}
        >
          <TermsContent />
        </TermsModal>
    </div>
  )
}

export default SignupPage 