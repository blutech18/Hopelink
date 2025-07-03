import React, { useState } from 'react'
import { motion } from 'framer-motion'
import { 
  MapPin, 
  Clock, 
  User, 
  Phone, 
  MessageCircle, 
  CheckCircle, 
  XCircle, 
  Calendar,
  Package,
  AlertCircle,
  X,
  Star
} from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import { useToast } from '../../contexts/ToastContext'
import { db } from '../../lib/supabase'
import LoadingSpinner from './LoadingSpinner'

const PickupManagementModal = ({ 
  isOpen, 
  onClose, 
  claim,
  onStatusUpdate 
}) => {
  const { user } = useAuth()
  const { success, error } = useToast()
  const [loading, setLoading] = useState(false)
  const [selectedStatus, setSelectedStatus] = useState('')
  const [notes, setNotes] = useState('')
  const [rating, setRating] = useState(5)
  const [feedback, setFeedback] = useState('')
  const [showConfirmation, setShowConfirmation] = useState(false)

  if (!isOpen || !claim) return null

  const pickup = claim.pickup?.[0]
  const donation = claim.donation
  const isDonor = user?.id === donation.donor_id
  const isRecipient = user?.id === claim.recipient_id

  const handleStatusUpdate = async () => {
    if (!selectedStatus) return

    try {
      setLoading(true)
      
      await db.updatePickupStatus(claim.id, user.id, selectedStatus, notes)
      
      success(`Pickup status updated to ${selectedStatus.replace('_', ' ')}`)
      onStatusUpdate?.()
      onClose()
    } catch (err) {
      console.error('Error updating pickup status:', err)
      error('Failed to update pickup status')
    } finally {
      setLoading(false)
    }
  }

  const handleConfirmCompletion = async (confirmed) => {
    try {
      setLoading(true)
      
      await db.confirmPickupCompletion(
        claim.id, 
        user.id, 
        confirmed, 
        confirmed ? rating : null, 
        confirmed ? feedback : 'Pickup completion disputed'
      )
      
      success(confirmed ? 'Pickup confirmed successfully!' : 'Pickup completion disputed')
      onStatusUpdate?.()
      onClose()
    } catch (err) {
      console.error('Error confirming pickup:', err)
      error('Failed to confirm pickup completion')
    } finally {
      setLoading(false)
    }
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'scheduled': return 'text-blue-400 bg-blue-500/20 border-blue-500/30'
      case 'confirmed': return 'text-purple-400 bg-purple-500/20 border-purple-500/30'
      case 'completed': return 'text-emerald-400 bg-emerald-500/20 border-emerald-500/30'
      case 'cancelled': return 'text-red-400 bg-red-500/20 border-red-500/30'
      default: return 'text-gray-400 bg-gray-500/20 border-gray-500/30'
    }
  }

  const availableStatuses = [
    { value: 'confirmed', label: 'Confirmed', description: 'Pickup time and location confirmed' },
    { value: 'completed', label: 'Completed', description: 'Items have been picked up' },
    { value: 'cancelled', label: 'Cancelled', description: 'Cancel this pickup arrangement' }
  ]

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-navy-900 rounded-xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto"
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-bold text-white">Pickup Management</h2>
            <p className="text-skyblue-300">{donation.title}</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-white hover:bg-navy-800 rounded-lg transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Current Status */}
        <div className="mb-6 p-4 bg-navy-800 rounded-lg">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-lg font-semibold text-white">Current Status</h3>
            <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium border ${getStatusColor(pickup?.status || 'scheduled')}`}>
              <Package className="h-3 w-3 mr-1" />
              {pickup?.status ? pickup.status.replace('_', ' ') : 'Scheduled'}
            </span>
          </div>
          {pickup?.notes && (
            <p className="text-skyblue-300 text-sm">{pickup.notes}</p>
          )}
        </div>

        {/* Pickup Details */}
        <div className="mb-6 space-y-4">
          <h3 className="text-lg font-semibold text-white">Pickup Information</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <MapPin className="h-5 w-5 text-blue-400 mt-0.5" />
                <div>
                  <p className="text-white font-medium">Pickup Location</p>
                  <p className="text-skyblue-300 text-sm">{pickup?.pickup_location || donation.pickup_location}</p>
                </div>
              </div>
              
              {pickup?.pickup_instructions && (
                <div className="flex items-start gap-3">
                  <MessageCircle className="h-5 w-5 text-green-400 mt-0.5" />
                  <div>
                    <p className="text-white font-medium">Instructions</p>
                    <p className="text-skyblue-300 text-sm">{pickup.pickup_instructions}</p>
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <User className="h-5 w-5 text-purple-400 mt-0.5" />
                <div>
                  <p className="text-white font-medium">
                    {isDonor ? 'Recipient' : 'Donor'}
                  </p>
                  <p className="text-skyblue-300 text-sm">
                    {isDonor ? claim.recipient?.name : donation.donor?.name}
                  </p>
                  {(isDonor ? claim.recipient?.phone_number : donation.donor?.phone_number) && (
                    <a
                      href={`tel:${isDonor ? claim.recipient?.phone_number : donation.donor?.phone_number}`}
                      className="text-skyblue-400 hover:text-skyblue-300 text-sm flex items-center gap-1 mt-1"
                    >
                      <Phone className="h-3 w-3" />
                      {isDonor ? claim.recipient?.phone_number : donation.donor?.phone_number}
                    </a>
                  )}
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Calendar className="h-5 w-5 text-orange-400 mt-0.5" />
                <div>
                  <p className="text-white font-medium">Claimed</p>
                  <p className="text-skyblue-300 text-sm">
                    {new Date(claim.claimed_at).toLocaleDateString()}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Action Section */}
        {pickup?.status !== 'completed' && pickup?.status !== 'cancelled' && (
          <div className="mb-6 p-4 bg-navy-800 rounded-lg">
            <h3 className="text-lg font-semibold text-white mb-4">Update Pickup Status</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-white mb-2">
                  New Status
                </label>
                <select
                  value={selectedStatus}
                  onChange={(e) => setSelectedStatus(e.target.value)}
                  className="w-full px-3 py-2 bg-navy-700 border border-navy-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-skyblue-500"
                >
                  <option value="">Select status...</option>
                  {availableStatuses.map((status) => (
                    <option key={status.value} value={status.value}>
                      {status.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-white mb-2">
                  Notes (optional)
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full px-3 py-2 bg-navy-700 border border-navy-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-skyblue-500 resize-none h-20"
                  placeholder="Add any notes about the pickup..."
                />
              </div>

              <button
                onClick={handleStatusUpdate}
                disabled={!selectedStatus || loading}
                className="btn btn-primary w-full flex items-center justify-center"
              >
                {loading ? (
                  <LoadingSpinner size="sm" />
                ) : (
                  <>
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Update Status
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* Completion Confirmation Section */}
        {pickup?.status === 'completed' && claim.status === 'delivered' && (
          <div className="mb-6 p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-lg">
            <div className="flex items-center gap-3 mb-4">
              <CheckCircle className="h-6 w-6 text-emerald-500" />
              <div>
                <h3 className="text-lg font-semibold text-white">Confirm Pickup Completion</h3>
                <p className="text-emerald-300 text-sm">
                  The pickup has been marked as completed. Please confirm to finalize the transaction.
                </p>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-white mb-2">
                  Rate this transaction (optional)
                </label>
                <div className="flex items-center gap-1">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      onClick={() => setRating(star)}
                      className={`p-1 rounded ${
                        star <= rating ? 'text-yellow-400' : 'text-gray-400'
                      }`}
                    >
                      <Star className="h-5 w-5" fill={star <= rating ? 'currentColor' : 'none'} />
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-white mb-2">
                  Feedback (optional)
                </label>
                <textarea
                  value={feedback}
                  onChange={(e) => setFeedback(e.target.value)}
                  className="w-full px-3 py-2 bg-navy-700 border border-navy-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-skyblue-500 resize-none h-20"
                  placeholder="Share your experience with this transaction..."
                />
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => handleConfirmCompletion(true)}
                  disabled={loading}
                  className="btn btn-success flex-1 flex items-center justify-center"
                >
                  {loading ? (
                    <LoadingSpinner size="sm" />
                  ) : (
                    <>
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Confirm Completion
                    </>
                  )}
                </button>
                
                <button
                  onClick={() => handleConfirmCompletion(false)}
                  disabled={loading}
                  className="btn btn-danger flex-1 flex items-center justify-center"
                >
                  <XCircle className="h-4 w-4 mr-2" />
                  Dispute
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Transaction Completed */}
        {claim.status === 'completed' && (
          <div className="mb-6 p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-lg">
            <div className="flex items-center gap-3">
              <CheckCircle className="h-6 w-6 text-emerald-500" />
              <div>
                <h3 className="text-lg font-semibold text-white">Transaction Completed!</h3>
                <p className="text-emerald-300 text-sm">
                  This pickup has been successfully completed and confirmed by all parties.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="flex justify-end">
          <button
            onClick={onClose}
            className="btn btn-secondary"
          >
            Close
          </button>
        </div>
      </motion.div>
    </div>
  )
}

export default PickupManagementModal 