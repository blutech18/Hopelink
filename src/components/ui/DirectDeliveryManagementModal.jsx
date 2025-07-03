import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { 
  X, 
  MapPin, 
  Calendar, 
  Clock, 
  MessageCircle, 
  CheckCircle, 
  Truck,
  User,
  Phone,
  AlertCircle,
  Navigation,
  Package,
  Star,
  Send,
  RefreshCw
} from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import { useToast } from '../../contexts/ToastContext'
import { db } from '../../lib/supabase'
import LoadingSpinner from './LoadingSpinner'

const DirectDeliveryManagementModal = ({ 
  isOpen, 
  onClose, 
  donation,
  onStatusUpdate 
}) => {
  const { user } = useAuth()
  const { success, error } = useToast()
  const [loading, setLoading] = useState(false)
  const [directDelivery, setDirectDelivery] = useState(null)
  const [deliveryAddress, setDeliveryAddress] = useState('')
  const [deliveryInstructions, setDeliveryInstructions] = useState('')
  const [notes, setNotes] = useState('')
  const [rating, setRating] = useState(5)
  const [feedback, setFeedback] = useState('')
  const [showConfirmation, setShowConfirmation] = useState(false)
  const [hoveredStar, setHoveredStar] = useState(0)

  const isDonor = user?.id === donation?.donation?.donor_id
  const isRecipient = user?.id === donation?.recipient_id

  // Load direct delivery details
  useEffect(() => {
    if (isOpen && donation?.id) {
      loadDirectDeliveryDetails()
    }
  }, [isOpen, donation?.id])

  const loadDirectDeliveryDetails = async () => {
    try {
      setLoading(true)
      const { data, error: fetchError } = await db.supabase
        .from('direct_deliveries')
        .select('*')
        .eq('claim_id', donation.id)
        .single()

      if (fetchError && fetchError.code !== 'PGRST116') { // Not found error
        throw fetchError
      }

      if (data) {
        setDirectDelivery(data)
        setDeliveryAddress(data.delivery_address || '')
        setDeliveryInstructions(data.delivery_instructions || '')
      }
    } catch (err) {
      console.error('Error loading direct delivery details:', err)
      error('Failed to load delivery details')
    } finally {
      setLoading(false)
    }
  }

  const handleStatusUpdate = async (newStatus) => {
    try {
      setLoading(true)
      
      await db.updateDirectDeliveryStatus(
        donation.id,
        user.id,
        newStatus,
        deliveryAddress,
        deliveryInstructions,
        notes
      )

      success(`Direct delivery status updated to ${newStatus.replace('_', ' ')}`)
      
      if (onStatusUpdate) {
        await onStatusUpdate()
      }
      
      if (newStatus === 'delivered') {
        onClose()
      } else {
        await loadDirectDeliveryDetails()
      }
      
      // Clear form fields after successful update
      setNotes('')
    } catch (err) {
      console.error('Error updating direct delivery status:', err)
      error('Failed to update delivery status')
    } finally {
      setLoading(false)
    }
  }

  const handleConfirmCompletion = async (confirmed = true) => {
    try {
      setLoading(true)
      
      await db.confirmDirectDeliveryCompletion(
        donation.id,
        user.id,
        confirmed,
        confirmed ? rating : null,
        confirmed ? feedback : (feedback || 'Direct delivery disputed')
      )

      success(confirmed ? 'Direct delivery confirmed successfully!' : 'Issue reported successfully')
      
      if (onStatusUpdate) {
        await onStatusUpdate()
      }
      
      setShowConfirmation(false)
      onClose()
    } catch (err) {
      console.error('Error confirming direct delivery:', err)
      error('Failed to confirm direct delivery')
    } finally {
      setLoading(false)
    }
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'coordination_needed': return 'text-yellow-400 bg-yellow-500/20 border-yellow-500/30'
      case 'scheduled': return 'text-blue-400 bg-blue-500/20 border-blue-500/30'
      case 'out_for_delivery': return 'text-orange-400 bg-orange-500/20 border-orange-500/30'
      case 'delivered': return 'text-emerald-400 bg-emerald-500/20 border-emerald-500/30'
      case 'cancelled': return 'text-red-400 bg-red-500/20 border-red-500/30'
      default: return 'text-gray-400 bg-gray-500/20 border-gray-500/30'
    }
  }

  const getStatusIcon = (status) => {
    switch (status) {
      case 'coordination_needed': return MessageCircle
      case 'scheduled': return Calendar
      case 'out_for_delivery': return Truck
      case 'delivered': return Package
      case 'cancelled': return AlertCircle
      default: return Clock
    }
  }

  const formatTimeAgo = (dateString) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffInHours = Math.floor((now - date) / (1000 * 60 * 60))
    
    if (diffInHours < 1) return 'Just now'
    if (diffInHours < 24) return `${diffInHours}h ago`
    return `${Math.floor(diffInHours / 24)}d ago`
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-navy-900 rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-navy-700">
          <div className="flex items-center gap-3">
            <Truck className="h-6 w-6 text-orange-400" />
            <div>
              <h3 className="text-xl font-bold text-white">Direct Delivery Management</h3>
              <p className="text-skyblue-400 text-sm">{donation?.donation?.title}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-navy-700 rounded-lg transition-colors"
          >
            <X className="h-5 w-5 text-skyblue-400" />
          </button>
        </div>

        <div className="p-6 space-y-6 max-h-[calc(90vh-120px)] overflow-y-auto">
          {loading && !directDelivery ? (
            <div className="flex items-center justify-center py-8">
              <LoadingSpinner size="lg" />
            </div>
          ) : (
            <>
              {/* Current Status */}
              {directDelivery && (
                <div className="bg-navy-800/50 rounded-lg p-4">
                  <h4 className="text-md font-semibold text-white mb-3">Current Status</h4>
                  <div className="flex items-center gap-3">
                    {React.createElement(getStatusIcon(directDelivery.status), { 
                      className: "h-5 w-5 text-orange-400" 
                    })}
                    <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium border ${getStatusColor(directDelivery.status)}`}>
                      {directDelivery.status.replace('_', ' ').toUpperCase()}
                    </span>
                    <span className="text-skyblue-400 text-sm">
                      Updated {formatTimeAgo(directDelivery.updated_at)}
                    </span>
                  </div>
                </div>
              )}

              {/* Contact Information */}
              <div className="bg-navy-800/50 rounded-lg p-4">
                <h4 className="text-md font-semibold text-white mb-3">Contact Information</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex items-center gap-3">
                    <User className="h-4 w-4 text-blue-400" />
                    <div>
                      <p className="text-skyblue-400 text-sm">Donor</p>
                      <p className="text-white">{donation?.donation?.donor?.name || 'Unknown'}</p>
                      {donation?.donation?.donor?.phone_number && (
                        <a 
                          href={`tel:${donation.donation.donor.phone_number}`}
                          className="text-skyblue-400 hover:text-skyblue-300 text-sm flex items-center gap-1"
                        >
                          <Phone className="h-3 w-3" />
                          {donation.donation.donor.phone_number}
                        </a>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <User className="h-4 w-4 text-green-400" />
                    <div>
                      <p className="text-skyblue-400 text-sm">Recipient</p>
                      <p className="text-white">{donation?.recipient?.name || 'Unknown'}</p>
                      {donation?.recipient?.phone_number && (
                        <a 
                          href={`tel:${donation.recipient.phone_number}`}
                          className="text-skyblue-400 hover:text-skyblue-300 text-sm flex items-center gap-1"
                        >
                          <Phone className="h-3 w-3" />
                          {donation.recipient.phone_number}
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Delivery Coordination */}
              {directDelivery?.status !== 'delivered' && directDelivery?.status !== 'cancelled' && (
                <div className="bg-navy-800/50 rounded-lg p-4">
                  <h4 className="text-md font-semibold text-white mb-3">Delivery Coordination</h4>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-skyblue-400 mb-2">
                        <MapPin className="h-4 w-4 inline mr-1" />
                        Delivery Address
                      </label>
                      <input
                        type="text"
                        value={deliveryAddress}
                        onChange={(e) => setDeliveryAddress(e.target.value)}
                        className="input w-full"
                        placeholder="Enter delivery address..."
                        disabled={!isDonor && directDelivery?.status === 'scheduled'}
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-skyblue-400 mb-2">
                        <MessageCircle className="h-4 w-4 inline mr-1" />
                        Delivery Instructions
                      </label>
                      <textarea
                        value={deliveryInstructions}
                        onChange={(e) => setDeliveryInstructions(e.target.value)}
                        className="input w-full h-20 resize-none"
                        placeholder="Special instructions, preferred time, etc..."
                        disabled={!isDonor && directDelivery?.status === 'scheduled'}
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-skyblue-400 mb-2">
                        Notes
                      </label>
                      <textarea
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        className="input w-full h-16 resize-none"
                        placeholder="Add any notes about this update..."
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex flex-wrap gap-3">
                {isDonor && directDelivery?.status === 'coordination_needed' && (
                  <button
                    onClick={() => handleStatusUpdate('scheduled')}
                    disabled={loading || !deliveryAddress}
                    className="btn btn-primary flex items-center"
                  >
                    {loading ? (
                      <LoadingSpinner size="sm" />
                    ) : (
                      <>
                        <Calendar className="h-4 w-4 mr-2" />
                        Schedule Delivery
                      </>
                    )}
                  </button>
                )}

                {isDonor && directDelivery?.status === 'scheduled' && (
                  <button
                    onClick={() => handleStatusUpdate('out_for_delivery')}
                    disabled={loading}
                    className="btn btn-warning flex items-center"
                  >
                    {loading ? (
                      <LoadingSpinner size="sm" />
                    ) : (
                      <>
                        <Truck className="h-4 w-4 mr-2" />
                        Out for Delivery
                      </>
                    )}
                  </button>
                )}

                {isDonor && directDelivery?.status === 'out_for_delivery' && (
                  <button
                    onClick={() => handleStatusUpdate('delivered')}
                    disabled={loading}
                    className="btn btn-success flex items-center"
                  >
                    {loading ? (
                      <LoadingSpinner size="sm" />
                    ) : (
                      <>
                        <Package className="h-4 w-4 mr-2" />
                        Mark as Delivered
                      </>
                    )}
                  </button>
                )}

                {directDelivery?.status !== 'delivered' && directDelivery?.status !== 'cancelled' && (
                  <button
                    onClick={() => handleStatusUpdate('cancelled')}
                    disabled={loading}
                    className="btn btn-danger flex items-center"
                  >
                    {loading ? (
                      <LoadingSpinner size="sm" />
                    ) : (
                      <>
                        <X className="h-4 w-4 mr-2" />
                        Cancel Delivery
                      </>
                    )}
                  </button>
                )}

                {/* Completion Confirmation Button */}
                {donation?.status === 'delivered' && (
                  <button
                    onClick={() => setShowConfirmation(true)}
                    className="btn btn-success flex items-center"
                  >
                    <CheckCircle className="h-4 w-4 mr-2" />
                    {isDonor ? 'Confirm Delivery' : 'Confirm Receipt'}
                  </button>
                )}
              </div>

              {/* Delivery Details Display */}
              {directDelivery && (directDelivery.delivery_address || directDelivery.delivery_instructions) && (
                <div className="bg-navy-800/50 rounded-lg p-4">
                  <h4 className="text-md font-semibold text-white mb-3">Delivery Details</h4>
                  {directDelivery.delivery_address && (
                    <div className="mb-2">
                      <span className="text-skyblue-400 text-sm">Address:</span>
                      <p className="text-white">{directDelivery.delivery_address}</p>
                    </div>
                  )}
                  {directDelivery.delivery_instructions && (
                    <div>
                      <span className="text-skyblue-400 text-sm">Instructions:</span>
                      <p className="text-white">{directDelivery.delivery_instructions}</p>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>

        {/* Completion Confirmation Modal */}
        {showConfirmation && (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-navy-800 rounded-lg p-6 w-full max-w-md mx-4"
            >
              <h4 className="text-lg font-semibold text-white mb-4">
                {isDonor ? 'Confirm Delivery Completion' : 'Confirm Receipt'}
              </h4>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-skyblue-400 mb-2">
                    Rate this experience (1-5 stars)
                  </label>
                  <div className="flex gap-1">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        onClick={() => setRating(star)}
                        onMouseEnter={() => setHoveredStar(star)}
                        onMouseLeave={() => setHoveredStar(0)}
                        className="p-1"
                      >
                        <Star
                          className={`h-6 w-6 ${
                            star <= (hoveredStar || rating)
                              ? 'text-yellow-400 fill-current'
                              : 'text-gray-400'
                          }`}
                        />
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-skyblue-400 mb-2">
                    Feedback (optional)
                  </label>
                  <textarea
                    value={feedback}
                    onChange={(e) => setFeedback(e.target.value)}
                    className="input w-full h-20 resize-none"
                    placeholder="Share your experience..."
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
                        Confirm
                      </>
                    )}
                  </button>
                  
                  <button
                    onClick={() => handleConfirmCompletion(false)}
                    disabled={loading}
                    className="btn btn-danger flex-1 flex items-center justify-center"
                  >
                    {loading ? (
                      <LoadingSpinner size="sm" />
                    ) : (
                      <>
                        <AlertCircle className="h-4 w-4 mr-2" />
                        Report Issue
                      </>
                    )}
                  </button>
                  
                  <button
                    onClick={() => setShowConfirmation(false)}
                    className="btn btn-secondary"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </motion.div>
    </div>
  )
}

export default DirectDeliveryManagementModal 