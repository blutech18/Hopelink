import React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { AlertTriangle, X, CheckCircle, XCircle } from 'lucide-react'
import LoadingSpinner from './LoadingSpinner'

const ConfirmationModal = ({
  isOpen,
  onClose,
  onConfirm,
  title = "Confirm Action",
  message,
  confirmText = "Confirm",
  cancelText = "Cancel",
  type = "warning", // warning, danger, info
  loading = false,
  confirmButtonVariant = "primary" // primary, danger, success
}) => {
  if (!isOpen) return null

  const getIcon = () => {
    switch (type) {
      case 'danger':
        return <XCircle className="h-6 w-6 text-danger-400" />
      case 'success':
        return <CheckCircle className="h-6 w-6 text-success-400" />
      default:
        return <AlertTriangle className="h-6 w-6 text-warning-400" />
    }
  }

  const getIconBg = () => {
    switch (type) {
      case 'danger':
        return 'bg-danger-500/10'
      case 'success':
        return 'bg-success-500/10'
      default:
        return 'bg-warning-500/10'
    }
  }

  const getConfirmButtonClass = () => {
    switch (confirmButtonVariant) {
      case 'danger':
        return 'btn btn-danger'
      case 'success':
        return 'btn btn-success'
      default:
        return 'btn btn-primary'
    }
  }

  const handleConfirm = () => {
    onConfirm()
  }

  const handleCancel = () => {
    onClose()
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={onClose}
          />
          
          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ duration: 0.2 }}
            className="relative bg-navy-900 border border-navy-700 shadow-xl rounded-xl p-6 max-w-md w-full mx-4"
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${getIconBg()}`}>
                  {getIcon()}
                </div>
                <h3 className="text-lg font-semibold text-white">{title}</h3>
              </div>
              <button
                onClick={onClose}
                className="text-skyblue-400 hover:text-white transition-colors p-2 hover:bg-navy-800 rounded-lg"
                disabled={loading}
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Message */}
            <div className="mb-6">
              <p className="text-skyblue-300 leading-relaxed">
                {message}
              </p>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3">
              <button
                onClick={handleCancel}
                disabled={loading}
                className="btn btn-secondary flex-1"
              >
                {cancelText}
              </button>
              
              <button
                onClick={handleConfirm}
                disabled={loading}
                className={`${getConfirmButtonClass()} flex-1 flex items-center justify-center gap-2`}
              >
                {loading ? (
                  <>
                    <LoadingSpinner size="sm" />
                    Processing...
                  </>
                ) : (
                  confirmText
                )}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}

export default ConfirmationModal
