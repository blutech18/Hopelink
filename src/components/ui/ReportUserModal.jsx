import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  X, 
  Flag, 
  AlertTriangle,
  User,
  FileText
} from 'lucide-react'
import { db } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'
import { useToast } from '../../contexts/ToastContext'
import LoadingSpinner from './LoadingSpinner'

const ReportUserModal = ({ 
  isOpen, 
  onClose, 
  reportedUserId,
  reportedUserName,
  reportedUserRole,
  transactionContext = null // Optional: { type, id, title } for context
}) => {
  const { user } = useAuth()
  const { success, error } = useToast()
  const [loading, setLoading] = useState(false)
  const [reason, setReason] = useState('')
  const [description, setDescription] = useState('')
  const [selectedReason, setSelectedReason] = useState('')

  const reportReasons = [
    { value: 'inappropriate_behavior', label: 'Inappropriate Behavior' },
    { value: 'harassment', label: 'Harassment' },
    { value: 'spam', label: 'Spam or Scam' },
    { value: 'fraud', label: 'Fraud or Misrepresentation' },
    { value: 'no_show', label: 'No Show or Failure to Complete Transaction' },
    { value: 'poor_communication', label: 'Poor Communication' },
    { value: 'safety_concern', label: 'Safety Concern' },
    { value: 'other', label: 'Other' }
  ]

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (!selectedReason) {
      error('Please select a reason for reporting')
      return
    }

    if (!description.trim()) {
      error('Please provide a description of the issue')
      return
    }

    if (!user?.id || !reportedUserId) {
      error('Unable to submit report. Please try again.')
      return
    }

    try {
      setLoading(true)

      // Build description with transaction context if available
      let fullDescription = description
      if (transactionContext) {
        fullDescription = `Transaction Context: ${transactionContext.type} - ${transactionContext.title || transactionContext.id}\n\nReport Details: ${description}`
      }

      await db.createUserReport({
        reportedUserId: reportedUserId,
        reportedByUserId: user.id,
        reason: selectedReason,
        description: fullDescription
      })

      success('Report submitted successfully. Our team will review it.')
      onClose()
      
      // Reset form
      setReason('')
      setDescription('')
      setSelectedReason('')
    } catch (err) {
      console.error('Error submitting report:', err)
      error('Failed to submit report. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <AnimatePresence>
      <div 
        className="fixed inset-0 bg-black/90 backdrop-blur-sm flex items-center justify-center z-50 p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.9 }}
          className="relative w-full max-w-md bg-navy-900 rounded-lg border border-red-500/30 shadow-2xl"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 bg-navy-800 border-b border-red-500/30">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-red-500/10 flex items-center justify-center">
                <Flag className="h-5 w-5 text-red-400" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-white">Report User</h2>
                <p className="text-xs text-gray-400">Report inappropriate behavior</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-navy-700 text-gray-400 hover:text-white transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Content */}
          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            {/* Reported User Info */}
            <div className="bg-navy-800/50 rounded-lg p-4 border border-navy-700">
              <div className="flex items-center gap-3">
                <User className="h-5 w-5 text-red-400" />
                <div>
                  <div className="text-sm font-medium text-white">
                    {reportedUserName || 'User'}
                  </div>
                  {reportedUserRole && (
                    <div className="text-xs text-gray-400 capitalize">
                      {reportedUserRole}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Transaction Context */}
            {transactionContext && (
              <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-3">
                <div className="text-xs text-blue-300">
                  <FileText className="h-3 w-3 inline mr-1" />
                  Related to: {transactionContext.title || transactionContext.type}
                </div>
              </div>
            )}

            {/* Reason Selection */}
            <div>
              <label className="block text-sm font-medium text-white mb-2">
                Reason for Report <span className="text-red-400">*</span>
              </label>
              <select
                value={selectedReason}
                onChange={(e) => setSelectedReason(e.target.value)}
                className="w-full px-4 py-2 bg-navy-800 border border-navy-700 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500"
                required
              >
                <option value="">Select a reason...</option>
                {reportReasons.map((reason) => (
                  <option key={reason.value} value={reason.value}>
                    {reason.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-white mb-2">
                Description <span className="text-red-400">*</span>
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Please provide details about the issue..."
                className="w-full h-32 px-4 py-2 bg-navy-800 border border-navy-700 rounded-lg text-white text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 resize-none"
                required
              />
              <p className="text-xs text-gray-400 mt-1">
                Please be specific and provide as much detail as possible to help us investigate.
              </p>
            </div>

            {/* Warning */}
            <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-3">
              <div className="flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 text-yellow-400 mt-0.5 flex-shrink-0" />
                <p className="text-xs text-yellow-300">
                  False reports may result in account restrictions. Please only report genuine violations of our community guidelines.
                </p>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                disabled={loading}
                className="flex-1 px-4 py-2 bg-navy-800 hover:bg-navy-700 border border-navy-700 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading || !selectedReason || !description.trim()}
                className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2"
              >
                {loading ? (
                  <LoadingSpinner size="sm" />
                ) : (
                  <>
                    <Flag className="h-4 w-4" />
                    Submit Report
                  </>
                )}
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  )
}

export default ReportUserModal

