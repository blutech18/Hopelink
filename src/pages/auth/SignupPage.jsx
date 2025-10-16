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

    setIsLoading(true)
    try {
      await signUp(data.email, data.password, {
        full_name: data.fullName,
        phone: data.phone,
        role: data.role,
        address: data.address || '',
        city: data.city || '',
        state: data.state || '',
        zip_code: data.zipCode || ''
      })
      
      // Wait for auth state to update before navigating
      setTimeout(() => {
        success('Account created successfully! Welcome to HopeLink!')
        navigate('/dashboard', { replace: true })
      }, 500)
    } catch (err) {
      error(err.message || 'Failed to create account. Please try again.')
      setIsLoading(false)
    }
  }

  const handleGoogleSignup = async () => {
    setIsGoogleLoading(true)
    try {
      // Pass along any available role/phone so callback can create profile correctly
      const role = selectedRole
      const phone = watch('phone')
      const roleData = role ? { role, phone } : undefined
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

  const roles = [
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
      description: 'Help coordinate deliveries',
      icon: Users,
      color: 'bg-purple-900/30 border-purple-700/30 text-purple-300'
    },
    {
      value: 'volunteer',
      label: 'Driver',
      description: 'Transport items to recipients',
      icon: Truck,
      color: 'bg-purple-900/30 border-purple-700/30 text-purple-300'
    }
  ]

  return (
    <div className="min-h-screen" style={{backgroundColor: '#00237d'}}>
      <div className="max-w-7xl mx-auto px-4 py-4">
        <div className="flex h-[calc(100vh-6rem)] rounded-3xl overflow-hidden shadow-2xl">
        {/* Left Column - Signup Form (yellow background column) */}
        <div className="w-full lg:w-1/2 flex flex-col justify-center py-2 px-4 sm:px-6" style={{backgroundColor: '#fbbf24'}}>
        <motion.div
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8 }}
            className="mx-auto w-full max-w-xl"
          >
            {/* Mobile Logo */}
            <div className="lg:hidden text-center mb-6">
              <img src="/hopelinklogo.png" alt="HopeLink" className="h-16 rounded mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-white">Join HopeLink</h2>
              <p className="text-yellow-800 mt-2">Create your account and start making a difference</p>
          </div>

            {/* Quick Signup Notice removed for compactness */}

        {/* Progress Steps */}
            <div className="mb-4">
              <div className="flex items-center justify-center space-x-4">
            {steps.map((step, index) => (
              <div key={step.number} className="flex items-center">
                    <div className={`flex items-center justify-center w-7 h-7 rounded-full border-2 ${
                  currentStep >= step.number 
                        ? 'bg-[#001a5c] border-[#001a5c] text-white' 
                        : 'bg-white border-gray-700 text-gray-900'
                }`}>
                  {step.number}
                </div>
                {index < steps.length - 1 && (
                      <div className={`w-12 h-0.5 ${
                        currentStep > step.number ? 'bg-gray-800' : 'bg-gray-600'
                  }`} />
                )}
              </div>
            ))}
          </div>
          <div className="mt-2 text-center">
                <p className="text-sm font-medium text-[#001a5c]">{steps[currentStep - 1].title}</p>
                <p className="text-xs text-[#001a5c]">{steps[currentStep - 1].description}</p>
        </div>
      </div>

            <div className="py-4 px-5 shadow-xl rounded-2xl" style={{backgroundColor: '#001a5c'}}>
              <form className="space-y-4" onSubmit={handleSubmit(onSubmit)}>
            <AnimatePresence mode="wait">
              {currentStep === 1 && (
                <motion.div
                  key="step1"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                      className="space-y-4"
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
                      className="space-y-4"
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
                    </motion.div>
                  )}

                  {currentStep === 3 && (
                    <motion.div
                      key="step3"
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      className="space-y-4"
                    >
                      <div>
                        <label className="block text-sm font-medium text-white mb-4">
                          Choose Your Role
                        </label>
                        <div className="space-y-2">
                          {roles.map((role) => {
                            const IconComponent = role.icon
                            return (
                              <label key={role.value} className="cursor-pointer">
                                <input
                                  type="radio"
                                  value={role.value}
                                  {...register('role', { required: 'Please select a role' })}
                                  className="sr-only"
                                />
                                <div className={`
                                  flex items-center p-3 rounded-lg border transition-all
                                  ${selectedRole === role.value 
                                    ? 'border-yellow-500 bg-yellow-900/20' 
                                    : 'border-gray-600 bg-gray-800 hover:border-gray-500'
                                  }
                                `}>
                                  <IconComponent className="h-6 w-6 text-yellow-400 mr-3" />
                                  <div className="flex-1">
                                    <h3 className="text-sm font-medium text-white">{role.label}</h3>
                                    <p className="text-xs text-yellow-200">{role.description}</p>
                                  </div>
                                  {selectedRole === role.value && (
                                    <div className="w-4 h-4 bg-yellow-500 rounded-full flex items-center justify-center">
                                      <div className="w-2 h-2 bg-white rounded-full"></div>
                                    </div>
                                  )}
                                </div>
                              </label>
                            )
                          })}
                        </div>
                        {errors.role && (
                          <p className="mt-2 text-sm text-danger-600">{errors.role.message}</p>
                        )}
                      </div>

                      <div className="bg-gray-800/50 p-4 rounded-lg">
                        <label className="flex items-start">
                          <input
                            type="checkbox"
                            checked={agreeToLegal}
                            onChange={(e) => setAgreeToLegal(e.target.checked)}
                            className="mt-1 h-4 w-4 text-yellow-600 focus:ring-yellow-500 border-gray-300 rounded"
                          />
                          <span className="ml-3 text-sm text-gray-300">
                            I agree to the{' '}
                            <button
                              type="button"
                              onClick={() => setShowLegalModal(true)}
                              className="text-yellow-400 hover:text-yellow-300 underline"
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
                <div className="flex justify-between pt-6">
                  <button
                    type="button"
                    onClick={prevStep}
                    disabled={currentStep === 1}
                    className="flex items-center px-4 py-2 text-sm font-medium text-gray-300 bg-gray-700 rounded-lg hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Previous
                  </button>

                  {currentStep < 3 ? (
                    <button
                      type="button"
                      onClick={nextStep}
                      className="flex items-center px-4 py-2 text-sm font-medium text-white bg-yellow-600 rounded-lg hover:bg-yellow-700 transition-colors"
                    >
                      Next
                      <ArrowRight className="h-4 w-4 ml-2" />
                    </button>
                  ) : (
                    <button
                      type="submit"
                      disabled={isLoading || isSigningIn || !agreeToLegal}
                      className="btn-primary flex items-center"
                    >
                      {isLoading || isSigningIn ? (
                        <LoadingSpinner size="sm" />
                      ) : (
                        <>
                          <UserPlus className="h-4 w-4 mr-2" />
                          Create Account
                        </>
                      )}
                    </button>
                  )}
                </div>
              </form>

              {/* Google Signup */}
              <div className="mt-6">
                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-gray-300" />
                  </div>
                  <div className="relative flex justify-center text-sm">
                    <span className="px-2 text-yellow-200" style={{backgroundColor: '#001a5c'}}>Or sign up with</span>
                  </div>
                </div>

          <div className="mt-6">
                  <button
                    type="button"
                    onClick={handleGoogleSignup}
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

              <div className="mt-6 text-center">
              <Link
                to="/login"
                  className="text-sm text-yellow-400 hover:text-yellow-300"
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
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8 }}
            className="text-center"
          >
            <img src="/hopelinklogo.png" alt="HopeLink" className="h-20 rounded mx-auto mb-8" />
            <h1 className="text-4xl font-bold text-white mb-6">Join HopeLink</h1>
            <p className="text-xl text-yellow-200 mb-8 max-w-md mx-auto">
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
        >
          <TermsContent />
        </TermsModal>
    </div>
  )
}

export default SignupPage 