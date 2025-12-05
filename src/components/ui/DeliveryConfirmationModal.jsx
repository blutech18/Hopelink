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
  Flag,
  Star
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
  // Enhanced feedback for recipients
  const [rating, setRating] = useState(0)
  const [hoveredRating, setHoveredRating] = useState(0)
  const [itemQualityRating, setItemQualityRating] = useState(0)
  const [deliveryExperienceRating, setDeliveryExperienceRating] = useState(0)
  const [showDetailedFeedback, setShowDetailedFeedback] = useState(false)

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
        // Enhanced feedback data for recipients
        const feedbackData = {
          overall_rating: confirmed ? rating : null,
          item_quality_rating: confirmed ? itemQualityRating : null,
          delivery_experience_rating: confirmed ? deliveryExperienceRating : null,
          feedback_text: confirmed ? feedback : feedback || 'Delivery disputed'
        }
        
        // Use the new recipient confirmation function
        result = await db.confirmReceipt(
          data.delivery_id,
          user.id,
          confirmed,
          confirmed ? rating : null, // Overall rating
          JSON.stringify(feedbackData) // Enhanced feedback data
        )
        
        // If confirmed and ratings provided, submit detailed feedback
        if (confirmed && (rating > 0 || itemQualityRating > 0 || deliveryExperienceRating > 0)) {
          try {
            // Submit feedback to feedback_ratings table
            const volunteerId = data.volunteer_id
            const donorId = data.donor_id || data.donation?.donor_id
            
            // Rate volunteer if available
            if (volunteerId && deliveryExperienceRating > 0) {
              await db.submitFeedback({
                transaction_id: data.delivery_id,
                transaction_type: 'delivery',
                rater_id: user.id,
                rated_user_id: volunteerId,
                rating: deliveryExperienceRating,
                feedback: `Delivery experience: ${feedback || 'Good delivery service'}`,
                created_at: new Date().toISOString()
              })
            }
            
            // Rate donor if available
            if (donorId && itemQualityRating > 0) {
              await db.submitFeedback({
                transaction_id: data.delivery_id,
                transaction_type: 'donation',
                rater_id: user.id,
                rated_user_id: donorId,
                rating: itemQualityRating,
                feedback: `Item quality: ${feedback || 'Items were helpful'}`,
                created_at: new Date().toISOString()
              })
            }
          } catch (feedbackErr) {
            console.error('Error submitting detailed feedback:', feedbackErr)
            // Don't block confirmation if feedback submission fails
          }
        }
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
          // Show feedback prompt message if ratings were provided
          if (rating > 0 || itemQualityRating > 0 || deliveryExperienceRating > 0) {
            success('Receipt confirmed and feedback submitted! Thank you for sharing your experience. Waiting for donor confirmation to complete transaction.')
          } else {
            success('Receipt confirmed! Waiting for donor confirmation to complete transaction. You can provide feedback later from your approved donations page.')
          }
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

        {/* Enhanced Feedback Section for Recipients */}
        {isRecipient && (
          <div className="mb-6 space-y-4">
            {/* Overall Rating */}
            <div>
              <label className="block text-sm font-medium text-yellow-300 mb-2">
                Overall Experience Rating {rating > 0 && <span className="text-yellow-400">({rating}/5)</span>}
              </label>
              <div className="flex items-center gap-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setRating(star)}
                    onMouseEnter={() => setHoveredRating(star)}
                    onMouseLeave={() => setHoveredRating(0)}
                    className="focus:outline-none transition-transform hover:scale-110 active:scale-95"
                  >
                    <Star
                      className={`h-8 w-8 ${
                        star <= (hoveredRating || rating)
                          ? 'text-yellow-400 fill-yellow-400'
                          : 'text-gray-500'
                      }`}
                    />
                  </button>
                ))}
              </div>
            </div>

            {/* Toggle for Detailed Feedback */}
            <button
              type="button"
              onClick={() => setShowDetailedFeedback(!showDetailedFeedback)}
              className="text-sm text-yellow-400 hover:text-yellow-300 underline"
            >
              {showDetailedFeedback ? 'Hide' : 'Show'} detailed feedback options
            </button>

            {/* Detailed Feedback Questions */}
            {showDetailedFeedback && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="space-y-4 bg-navy-800/50 p-4 rounded-lg border border-yellow-500/20"
              >
                {/* Item Quality Rating */}
                <div>
                  <label className="block text-sm font-medium text-yellow-300 mb-2">
                    Item Quality {itemQualityRating > 0 && <span className="text-yellow-400">({itemQualityRating}/5)</span>}
                  </label>
                  <div className="flex items-center gap-2">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        type="button"
                        onClick={() => setItemQualityRating(star)}
                        className="focus:outline-none transition-transform hover:scale-110 active:scale-95"
                      >
                        <Star
                          className={`h-6 w-6 ${
                            star <= itemQualityRating
                              ? 'text-yellow-400 fill-yellow-400'
                              : 'text-gray-500'
                          }`}
                        />
                      </button>
                    ))}
                    <span className="text-xs text-gray-400 ml-2">Were the items helpful and in good condition?</span>
                  </div>
                </div>

                {/* Delivery Experience Rating */}
                {data.volunteer_id && (
                  <div>
                    <label className="block text-sm font-medium text-yellow-300 mb-2">
                      Delivery Experience {deliveryExperienceRating > 0 && <span className="text-yellow-400">({deliveryExperienceRating}/5)</span>}
                    </label>
                    <div className="flex items-center gap-2">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <button
                          key={star}
                          type="button"
                          onClick={() => setDeliveryExperienceRating(star)}
                          className="focus:outline-none transition-transform hover:scale-110 active:scale-95"
                        >
                          <Star
                            className={`h-6 w-6 ${
                              star <= deliveryExperienceRating
                                ? 'text-yellow-400 fill-yellow-400'
                                : 'text-gray-500'
                            }`}
                          />
                        </button>
                      ))}
                      <span className="text-xs text-gray-400 ml-2">How was your delivery/pickup experience?</span>
                    </div>
                  </div>
                )}
              </motion.div>
            )}
          </div>
        )}

        {/* Feedback Text Section */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-yellow-300 mb-2">
            Additional feedback {isRecipient && rating > 0 && '(optional)'}
          </label>
          <textarea
            value={feedback}
            onChange={(e) => setFeedback(e.target.value)}
            placeholder={
              isRecipient && rating > 0
                ? 'Share more details about your experience (optional)...'
                : `Share your experience with ${data.volunteer_name || 'the volunteer'}...`
            }
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