import React, { useEffect, useState, useRef } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useAuth } from '../../contexts/AuthContext'
import { useToast } from '../../contexts/ToastContext'
import LoadingSpinner from '../../components/ui/LoadingSpinner'

const CallbackPage = () => {
  const [isProcessing, setIsProcessing] = useState(true)
  const [error, setError] = useState(null)
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { handleGoogleCallback } = useAuth()
  const { success, error: showError, removeErrorToasts } = useToast()
  const hasProcessed = useRef(false)

  useEffect(() => {
    const processCallback = async () => {
      // Prevent multiple executions
      if (hasProcessed.current) {
        return
      }
      hasProcessed.current = true
      
      // Clear any existing error toasts
      removeErrorToasts()
      
      try {
        const isSignup = searchParams.get('signup') === 'true'
        const result = await handleGoogleCallback(isSignup)
        
        if (result.isNewUser) {
          success(`Welcome to HopeLink! Your ${result.role} account has been created.`)
          // Redirect to appropriate dashboard based on role
          switch (result.role) {
            case 'donor':
              navigate('/dashboard', { replace: true })
              break
            case 'recipient':
              navigate('/dashboard', { replace: true })
              break
            case 'volunteer':
              navigate('/volunteer-dashboard', { replace: true })
              break
            case 'admin':
              navigate('/admin', { replace: true })
              break
            default:
              navigate('/dashboard', { replace: true })
          }
        } else {
          success('Welcome back!')
          // Redirect to appropriate dashboard based on role
          switch (result.role) {
            case 'donor':
              navigate('/dashboard', { replace: true })
              break
            case 'recipient':
              navigate('/dashboard', { replace: true })
              break
            case 'volunteer':
              navigate('/volunteer-dashboard', { replace: true })
              break
            case 'admin':
              navigate('/admin', { replace: true })
              break
            default:
              navigate('/dashboard', { replace: true })
          }
        }
      } catch (err) {
        console.error('Callback processing error:', err)
        setError(err.message)
        
        // Show error toast with better error handling
        const errorMessage = err.message || 'Authentication failed. Please try again.'
        
        // Only show error toast for errors that won't be redirected with state
        if (!err.message.includes('No account found')) {
          showError(errorMessage)
        }
        
        // Redirect based on error type
        if (err.message.includes('No account found')) {
          // Keep user on login page with error message
          setTimeout(() => navigate('/login', { state: { error: 'No account found. Please sign up first.' }, replace: true }), 2000)
        } else if (err.message.includes('Account already exists')) {
          setTimeout(() => navigate('/login', { state: { error: 'Account already exists. Please use the login option instead.' }, replace: true }), 2000)
        } else if (err.message.includes('Role selection required')) {
          setTimeout(() => navigate('/signup', { replace: true }), 2000)
        } else {
          setTimeout(() => navigate('/login', { replace: true }), 2000)
        }
      } finally {
        setIsProcessing(false)
      }
    }

    processCallback()
  }, [handleGoogleCallback, navigate, searchParams, success, showError])

  return (
    <div className="min-h-screen bg-navy-950 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="flex justify-center"
        >
          <img src="/hopelinklogo.png" alt="HopeLink" className="h-12 w-12 rounded" />
        </motion.div>
        
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="mt-8 text-center"
        >
          {isProcessing ? (
            <div className="space-y-4">
              <LoadingSpinner size="lg" />
              <h2 className="text-2xl font-bold text-white">Processing Authentication</h2>
              <p className="text-skyblue-300">Please wait while we complete your sign-in...</p>
            </div>
          ) : error ? (
            <div className="space-y-4">
              <div className="w-16 h-16 mx-auto bg-red-900/30 rounded-full flex items-center justify-center">
                <svg className="w-8 h-8 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-white">Authentication Error</h2>
              <p className="text-red-300">{error}</p>
              <p className="text-skyblue-300 text-sm">Redirecting you back...</p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="w-16 h-16 mx-auto bg-green-900/30 rounded-full flex items-center justify-center">
                <svg className="w-8 h-8 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-white">Success!</h2>
              <p className="text-skyblue-300">Redirecting to your dashboard...</p>
            </div>
          )}
        </motion.div>
      </div>
    </div>
  )
}

export default CallbackPage
