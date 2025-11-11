import React, { useEffect, useState, useRef } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useAuth } from '../../contexts/AuthContext'
import { useToast } from '../../contexts/ToastContext'
import { DashboardSkeleton } from '../../components/ui/Skeleton'

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
          // Immediate navigation for maximum speed
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
          // Immediate navigation for maximum speed
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
        // Only log unexpected errors, not controlled flow errors
        if (!err.message.includes('Account already exists') && 
            !err.message.includes('No account found') &&
            !err.message.includes('Role selection required') &&
            !err.message.includes('ACCOUNT_SUSPENDED')) {
          console.error('Callback processing error:', err)
        }
        
        // Show error toast and redirect based on error type (fast redirects)
        if (err.message.includes('ACCOUNT_SUSPENDED')) {
          const suspendMessage = err.message.replace('ACCOUNT_SUSPENDED: ', '')
          // Don't show toast here - let LoginPage handle it to avoid duplicate notifications
          setTimeout(() => {
            setIsProcessing(false)
            navigate('/login', { replace: true, state: { error: suspendMessage } })
          }, 1000)
        } else if (err.message.includes('No account found')) {
          showError('No account found. Please sign up first.')
          setTimeout(() => {
            setIsProcessing(false)
            navigate('/signup', { replace: true })
          }, 1000)
        } else if (err.message.includes('Account already exists')) {
          showError('This account already exists. Redirecting to login...')
          setTimeout(() => {
            setIsProcessing(false)
            navigate('/login', { replace: true })
          }, 1000)
        } else if (err.message.includes('Role selection required')) {
          showError('Role selection required. Please complete the signup process.')
          setTimeout(() => {
            setIsProcessing(false)
            navigate('/signup', { replace: true })
          }, 1000)
        } else {
          setError(err.message)
          showError(err.message || 'Authentication failed. Please try again.')
          setTimeout(() => {
            setIsProcessing(false)
            navigate('/login', { replace: true })
          }, 1000)
        }
      }
    }

    processCallback()
  }, [handleGoogleCallback, navigate, searchParams, success, showError])

  return (
    <div className="min-h-screen" style={{backgroundColor: '#1e293b'}}>
      {isProcessing ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3 }}
        >
          <DashboardSkeleton />
        </motion.div>
      ) : error ? (
        <div className="min-h-screen flex flex-col justify-center py-12 sm:px-6 lg:px-8">
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
              <div className="space-y-4">
                <div className="w-16 h-16 mx-auto bg-red-900/30 rounded-full flex items-center justify-center">
                  <svg className="w-8 h-8 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </div>
                <h2 className="text-2xl font-bold text-white">Authentication Error</h2>
                <p className="text-red-300">{error}</p>
                <p className="text-gray-400 text-sm">Redirecting you back...</p>
              </div>
            </motion.div>
          </div>
        </div>
      ) : (
        <div className="min-h-screen flex flex-col justify-center py-12 sm:px-6 lg:px-8">
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
              <div className="space-y-4">
                <div className="w-16 h-16 mx-auto bg-green-900/30 rounded-full flex items-center justify-center">
                  <svg className="w-8 h-8 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <h2 className="text-2xl font-bold text-white">Success!</h2>
                <p className="text-gray-400">Redirecting to your dashboard...</p>
              </div>
            </motion.div>
          </div>
        </div>
      )}
    </div>
  )
}

export default CallbackPage
