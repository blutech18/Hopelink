import React, { createContext, useContext, useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, CheckCircle, AlertCircle, Info, AlertTriangle } from 'lucide-react'

const ToastContext = createContext()

export const useToast = () => {
  const context = useContext(ToastContext)
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider')
  }
  return context
}

const Toast = React.forwardRef(({ toast, onRemove }, ref) => {
  const icons = {
    success: CheckCircle,
    error: AlertCircle,
    warning: AlertTriangle,
    info: Info,
  }

  const Icon = icons[toast.type] || Info

  const bgColors = {
    success: 'bg-[#001a5c] border-navy-700',
    error: 'bg-[#001a5c] border-navy-700',
    warning: 'bg-[#001a5c] border-navy-700',
    info: 'bg-[#001a5c] border-navy-700',
  }

  const leftBorderColors = {
    success: 'border-l-4 border-l-yellow-500',
    error: 'border-l-4 border-l-yellow-500',
    warning: 'border-l-4 border-l-yellow-500',
    info: 'border-l-4 border-l-yellow-500',
  }

  const textColors = {
    success: 'text-white',
    error: 'text-white',
    warning: 'text-white',
    info: 'text-white',
  }

  const iconColors = {
    success: 'text-yellow-300',
    error: 'text-yellow-300',
    warning: 'text-yellow-300',
    info: 'text-yellow-300',
  }

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, x: 300, scale: 0.9 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, x: 300, scale: 0.9, transition: { duration: 0.3 } }}
      className={`w-full max-w-xs sm:min-w-80 sm:max-w-md border rounded-lg shadow-lg p-3 sm:p-4 ${bgColors[toast.type]} ${leftBorderColors[toast.type]}`}
    >
      <div className="flex items-start space-x-2 sm:space-x-3">
        <div className="flex-shrink-0 mt-0.5">
          <Icon className={`h-4 w-4 sm:h-5 sm:w-5 ${iconColors[toast.type]}`} />
        </div>
        <div className="flex-1 min-w-0">
          {toast.title && (
            <p className={`text-xs sm:text-sm font-medium ${textColors[toast.type]} leading-snug`}>
              {toast.title}
            </p>
          )}
          {toast.message && (
            <p className={`text-xs sm:text-sm ${toast.title ? 'mt-0.5 sm:mt-1' : ''} ${textColors[toast.type]} leading-normal opacity-90`}>
              {toast.message}
            </p>
          )}
        </div>
        <div className="flex-shrink-0">
          <button
            className={`rounded p-0.5 sm:p-1 hover:bg-navy-800 transition-colors duration-200 focus:outline-none focus:ring-1 focus:ring-yellow-400 ${textColors[toast.type]} opacity-70 hover:opacity-100`}
            onClick={() => onRemove(toast.id)}
            aria-label="Close notification"
          >
            <X className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
          </button>
        </div>
      </div>
    </motion.div>
  )
})

Toast.displayName = 'Toast'

export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([])

  const addToast = useCallback((toast) => {
    const id = Math.random().toString(36).substr(2, 9)
    const newToast = {
      id,
      type: 'info',
      duration: 5000,
      ...toast,
    }

    setToasts((prevToasts) => {
      // Check for duplicate error messages to prevent spam
      const isDuplicate = prevToasts.some(existingToast => 
        existingToast.type === newToast.type && 
        existingToast.message === newToast.message &&
        existingToast.title === newToast.title
      )
      
      if (isDuplicate) {
        return prevToasts // Don't add duplicate
      }
      
      // For error toasts, remove any existing error toasts to show only the latest
      if (newToast.type === 'error') {
        const filteredToasts = prevToasts.filter(t => t.type !== 'error')
        return [...filteredToasts, newToast]
      }
      
      return [...prevToasts, newToast]
    })

    // Auto remove after duration
    if (newToast.duration > 0) {
      setTimeout(() => {
        removeToast(id)
      }, newToast.duration)
    }

    return id
  }, [])

  const removeToast = useCallback((id) => {
    setToasts((prevToasts) => prevToasts.filter((toast) => toast.id !== id))
  }, [])

  const removeAllToasts = useCallback(() => {
    setToasts([])
  }, [])

  const removeErrorToasts = useCallback(() => {
    setToasts(prev => prev.filter(t => t.type !== 'error'))
  }, [])

  // Convenience methods with professional messaging
  const success = useCallback((message, title) => {
    return addToast({ type: 'success', title, message, duration: 4000 })
  }, [addToast])

  const error = useCallback((message, title) => {
    // Clear any existing error toasts first
    setToasts(prev => prev.filter(t => t.type !== 'error'))
    return addToast({ type: 'error', title, message, duration: 8000 })
  }, [addToast])

  const warning = useCallback((message, title) => {
    return addToast({ type: 'warning', title, message, duration: 5000 })
  }, [addToast])

  const info = useCallback((message, title) => {
    return addToast({ type: 'info', title, message, duration: 4000 })
  }, [addToast])

  const value = {
    toasts,
    addToast,
    removeToast,
    removeAllToasts,
    removeErrorToasts,
    success,
    error,
    warning,
    info,
  }

  return (
    <ToastContext.Provider value={value}>
      {children}
      
      {/* Toast Container */}
      <div className="fixed top-20 right-3 left-auto sm:top-4 sm:right-4 z-50 space-y-2 max-w-xs sm:max-w-md">
        <AnimatePresence mode="popLayout">
          {toasts.map((toast) => (
            <Toast
              key={toast.id}
              toast={toast}
              onRemove={removeToast}
            />
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  )
} 