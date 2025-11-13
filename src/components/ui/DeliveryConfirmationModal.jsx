import React, { useState } from 'react'
import { motion } from 'framer-motion'
import { 
  CheckCircle, 
  XCircle, 
  MessageCircle, 
  X, 
  Truck,
  User,
  Package,
  Flag
} from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import { useToast } from '../../contexts/ToastContext'
import { db } from '../../lib/supabase'
import LoadingSpinner from './LoadingSpinner'
import ReportUserModal from './ReportUserModal'

const DeliveryConfirmationModal = ({ 
  isOpen, 
  onClose, 
  notification,
  onConfirmationComplete 
}) => {
  const { user } = useAuth()
  const { success, error } = useToast()
  const [loading, setLoading] = useState(false)
  const [feedback, setFeedback] = useState('')
  const [showReportModal, setShowReportModal] = useState(false)
  const [reportedUser, setReportedUser] = useState(null)

  if (!isOpen || !notification) return null

  const data = notification.data
  const userRole = data.role
  const isRecipient = userRole === 'recipient'
  const isDonor = userRole === 'donor'

  const handleConfirm = async (confirmed) => {
    if (!user?.id) return

    try {
      setLoading(true)
      
      let result
      if (isRecipient) {
        // Use the new recipient confirmation function
        result = await db.confirmReceipt(
          data.delivery_id,
          user.id,
          confirmed,
          null, // No rating
          confirmed ? feedback : feedback || 'Delivery disputed'
        )
      } else {
        // Fallback to old function for other roles (volunteers, donors, etc.)
        result = await db.confirmDeliveryByUser(
          data.delivery_id,
          user.id,
          userRole,
          confirmed,
          null, // No rating
          confirmed ? feedback : feedback || 'Delivery disputed'
        )
      }

      if (confirmed) {
        if (isRecipient) {
          success('Receipt confirmed! Waiting for donor confirmation to complete transaction.')
        } else {
          success('Delivery confirmed!')
        }
      } else {
        success('Delivery dispute reported. Our team will investigate.')
      }

      onConfirmationComplete?.(result)
      onClose()
    } catch (err) {
      console.error('Error confirming delivery:', err)
      error('Failed to process confirmation. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        transition={{ duration: 0.2 }}
        className="bg-navy-900 border-2 border-yellow-500/30 shadow-2xl rounded-xl p-6 max-w-md w-full"
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-6 pb-4 border-b-2 border-yellow-500/20">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-yellow-500/10 rounded-lg">
              <Truck className="h-6 w-6 text-yellow-400" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white">Confirm Delivery</h3>
              <p className="text-sm text-yellow-300">
                {isRecipient ? 'Did you receive the items?' : 'Did the volunteer pick up the items?'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors p-2 hover:bg-navy-800 rounded-lg"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Delivery Info */}
        <div className="bg-navy-800/50 border border-yellow-500/20 rounded-lg p-4 mb-6">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <User className="h-5 w-5 text-yellow-400" />
              <span className="text-white font-medium">Volunteer: {data.volunteer_name || 'Unknown'}</span>
            </div>
            {data.volunteer_id && data.volunteer_id !== user?.id && (
              <button
                onClick={async () => {
                  try {
                    // Fetch volunteer profile to get name and role
                    const volunteerProfile = await db.getProfile(data.volunteer_id)
                    setReportedUser({
                      id: data.volunteer_id,
                      name: volunteerProfile?.name || data.volunteer_name,
                      role: volunteerProfile?.role || 'volunteer'
                    })
                    setShowReportModal(true)
                  } catch (err) {
                    console.error('Error fetching volunteer profile:', err)
                    // Fallback to basic info
                    setReportedUser({
                      id: data.volunteer_id,
                      name: data.volunteer_name,
                      role: 'volunteer'
                    })
                    setShowReportModal(true)
                  }
                }}
                className="text-xs px-2 py-1 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded transition-colors flex items-center gap-1"
                title="Report this volunteer"
              >
                <Flag className="h-3 w-3" />
                Report
              </button>
            )}
          </div>
          <div className="flex items-center gap-3">
            <Package className="h-5 w-5 text-yellow-400" />
            <span className="text-yellow-300 text-sm">
              {isRecipient 
                ? 'Please confirm that you received the donated items.' 
                : 'Please confirm that the volunteer picked up the items for delivery.'
              }
            </span>
          </div>
        </div>

        {/* Feedback Section */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-yellow-300 mb-2">
            Additional feedback (optional)
          </label>
          <textarea
            value={feedback}
            onChange={(e) => setFeedback(e.target.value)}
            placeholder={`Share your experience with ${data.volunteer_name || 'the volunteer'}...`}
            className="w-full px-3 py-2 bg-navy-800 border border-yellow-500/30 rounded-lg text-white placeholder-yellow-400/50 focus:border-yellow-500 focus:outline-none focus:ring-2 focus:ring-yellow-500/20 resize-none"
            rows={3}
          />
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3">
          <button
            onClick={() => handleConfirm(false)}
            disabled={loading}
            className="flex-1 px-4 py-3 bg-red-600 hover:bg-red-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
          >
            {loading ? (
              <LoadingSpinner size="sm" />
            ) : (
              <>
                <XCircle className="h-4 w-4" />
                Report Issue
              </>
            )}
          </button>
          
          <button
            onClick={() => handleConfirm(true)}
            disabled={loading}
            className="flex-1 px-4 py-3 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
          >
            {loading ? (
              <LoadingSpinner size="sm" />
            ) : (
              <>
                <CheckCircle className="h-4 w-4" />
                Confirm Delivery
              </>
            )}
          </button>
        </div>

        {/* Help Text */}
        <div className="mt-4 p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
          <p className="text-xs text-yellow-300">
            <MessageCircle className="h-3 w-3 inline mr-1" />
            Both you and the {isRecipient ? 'donor' : 'recipient'} need to confirm the delivery for the transaction to complete.
          </p>
        </div>
      </motion.div>

      {/* Report User Modal */}
      {reportedUser && (
        <ReportUserModal
          isOpen={showReportModal}
          onClose={() => {
            setShowReportModal(false)
            setReportedUser(null)
          }}
          reportedUserId={reportedUser.id}
          reportedUserName={reportedUser.name}
          reportedUserRole={reportedUser.role}
          transactionContext={data.delivery_id ? {
            type: 'delivery',
            id: data.delivery_id,
            title: `Delivery #${data.delivery_id}`
          } : null}
        />
      )}
    </div>
  )
}

export default DeliveryConfirmationModal 