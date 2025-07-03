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
    success: 'bg-navy-900 border-success-700',
    error: 'bg-navy-900 border-danger-700',
    warning: 'bg-navy-900 border-warning-700',
    info: 'bg-navy-900 border-skyblue-700',
  }

  const textColors = {
    success: 'text-white',
    error: 'text-white',
    warning: 'text-white',
    info: 'text-white',
  }

  const iconColors = {
    success: 'text-success-400',
    error: 'text-danger-400',
    warning: 'text-warning-400',
    info: 'text-skyblue-400',
  }

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, x: 300, scale: 0.9 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, x: 300, scale: 0.9, transition: { duration: 0.3 } }}
      className={`min-w-80 max-w-md w-full border rounded-lg shadow-lg p-4 ${bgColors[toast.type]}`}
    >
      <div className="flex items-start space-x-3">
        <div className="flex-shrink-0 mt-0.5">
          <Icon className={`h-5 w-5 ${iconColors[toast.type]}`} />
        </div>
        <div className="flex-1 min-w-0">
          {toast.title && (
            <p className={`text-sm font-medium ${textColors[toast.type]} leading-snug`}>
              {toast.title}
            </p>
          )}
          {toast.message && (
            <p className={`text-sm ${toast.title ? 'mt-1' : ''} ${textColors[toast.type]} leading-normal opacity-90`}>
              {toast.message}
            </p>
          )}
        </div>
        <div className="flex-shrink-0">
          <button
            className={`rounded p-1 hover:bg-navy-800 transition-colors duration-200 focus:outline-none focus:ring-1 focus:ring-skyblue-500 ${textColors[toast.type]} opacity-70 hover:opacity-100`}
            onClick={() => onRemove(toast.id)}
          >
            <X className="h-4 w-4" />
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

    setToasts((prevToasts) => [...prevToasts, newToast])

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

  // Convenience methods with professional messaging
  const success = useCallback((message, title) => {
    return addToast({ type: 'success', title, message, duration: 4000 })
  }, [addToast])

  const error = useCallback((message, title) => {
    return addToast({ type: 'error', title, message, duration: 6000 })
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
    success,
    error,
    warning,
    info,
  }

  return (
    <ToastContext.Provider value={value}>
      {children}
      
      {/* Toast Container */}
      <div className="fixed top-4 right-4 z-50 space-y-2">
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