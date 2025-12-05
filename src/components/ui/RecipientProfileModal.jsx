import React from 'react'
import { motion } from 'framer-motion'
import { 
  X, 
  User, 
  CheckCircle, 
  AlertCircle, 
  Clock,
  Calendar,
  MapPin,
  Mail,
  Phone,
  Shield,
  Users,
  Heart,
  Building2,
  Clock as ClockIcon,
  Award,
  Star
} from 'lucide-react'
import { IDVerificationBadge } from './VerificationBadge'

const RecipientProfileModal = ({ isOpen, onClose, recipient, request = null }) => {
  if (!isOpen || !recipient) return null

  const getVerificationLevel = () => {
    if (!recipient.primary_id_type || !recipient.primary_id_number) {
      return {
        level: 'unverified',
        label: 'Unverified',
        color: 'text-orange-400',
        bgColor: 'bg-orange-500/20',
        borderColor: 'border-orange-400/30',
        icon: AlertCircle,
        description: 'Profile incomplete - ID verification required'
      }
    }
    
    if (recipient.id_verification_status === 'verified') {
      // Check if they have completed requests/donations to determine trust level
      // Use fulfilled_requests if available, otherwise check other indicators
      const completedCount = recipient.fulfilled_requests || recipient.completed_requests_count || recipient.total_requests || 0
      if (completedCount >= 5) {
        return {
          level: 'trusted',
          label: 'Trusted Member',
          color: 'text-emerald-400',
          bgColor: 'bg-emerald-500/20',
          borderColor: 'border-emerald-400/30',
          icon: Award,
          description: 'Verified member with excellent community standing'
        }
      }
      return {
        level: 'verified',
        label: 'Verified',
        color: 'text-green-400',
        bgColor: 'bg-green-500/20',
        borderColor: 'border-green-400/30',
        icon: CheckCircle,
        description: 'ID verified by admin'
      }
    }
    
    if (recipient.id_verification_status === 'pending') {
      return {
        level: 'pending',
        label: 'Verifying',
        color: 'text-yellow-400',
        bgColor: 'bg-yellow-500/20',
        borderColor: 'border-yellow-400/30',
        icon: Clock,
        description: 'Verification in progress'
      }
    }
    
    return {
      level: 'unverified',
      label: 'Unverified',
      color: 'text-orange-400',
      bgColor: 'bg-orange-500/20',
      borderColor: 'border-orange-400/30',
      icon: AlertCircle,
      description: 'Profile incomplete'
    }
  }

  const verificationLevel = getVerificationLevel()
  const VerificationIcon = verificationLevel.icon

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A'
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      })
    } catch {
      return dateString
    }
  }

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-black/60 backdrop-blur-md"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="absolute inset-0 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          onClick={(e) => e.stopPropagation()}
          className="relative z-10 w-full max-w-3xl bg-gradient-to-br from-navy-900/95 to-navy-800/95 rounded-2xl border-2 border-yellow-400/30 shadow-2xl backdrop-blur-xl max-h-[90vh] overflow-y-auto"
        >
          {/* Header */}
          <div className="sticky top-0 z-20 flex items-center justify-between p-6 border-b border-yellow-400/20 bg-gradient-to-r from-yellow-500/5 to-transparent backdrop-blur-sm">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-yellow-400/20 border border-yellow-400/30">
                <User className="h-6 w-6 text-yellow-400" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-white">Recipient Profile</h3>
                <p className="text-xs text-yellow-300/80 mt-0.5">Review recipient information</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition-all"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Content */}
          <div className="p-6 space-y-6">
            {/* Verification Status Banner */}
            <div className={`p-4 rounded-xl border-2 ${verificationLevel.borderColor} ${verificationLevel.bgColor} backdrop-blur-sm`}>
              <div className="flex items-start gap-4">
                <div className={`p-3 rounded-lg ${verificationLevel.bgColor} border ${verificationLevel.borderColor}`}>
                  <VerificationIcon className={`h-6 w-6 ${verificationLevel.color}`} />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h4 className={`text-lg font-bold ${verificationLevel.color}`}>
                      {verificationLevel.label}
                    </h4>
                    <IDVerificationBadge
                      idStatus={recipient.id_verification_status}
                      hasIdUploaded={recipient.primary_id_type && recipient.primary_id_number}
                      size="sm"
                      showText={true}
                    />
                  </div>
                  <p className="text-sm text-yellow-200 mb-3">
                    {verificationLevel.description}
                  </p>
                  {recipient.id_verification_status === 'verified' && recipient.verified_at && (
                    <div className="flex items-center gap-2 text-xs text-yellow-300/80">
                      <Calendar className="h-3.5 w-3.5" />
                      <span>Verified on {formatDate(recipient.verified_at)}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Profile Header */}
            <div className="bg-navy-800/50 rounded-xl p-6 border border-navy-700/50">
              <div className="flex items-start gap-4">
                <div className="w-20 h-20 rounded-full bg-gradient-to-br from-yellow-500/20 to-yellow-400/10 border-2 border-yellow-400/30 flex items-center justify-center flex-shrink-0">
                  <User className="h-10 w-10 text-yellow-400" />
                </div>
                <div className="flex-1">
                  <h4 className="text-xl font-bold text-white mb-1">{recipient.name || 'Anonymous'}</h4>
                  <div className="flex flex-wrap items-center gap-2 mb-3">
                    {recipient.account_type && recipient.account_type !== 'individual' && (
                      <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-500/20 text-blue-300 text-xs font-medium rounded border border-blue-400/30">
                        <Building2 className="h-3 w-3" />
                        {recipient.account_type === 'business' ? 'Business' : 'Organization'}
                      </span>
                    )}
                    {recipient.role && (
                      <span className="inline-flex items-center gap-1 px-2 py-1 bg-purple-500/20 text-purple-300 text-xs font-medium rounded border border-purple-400/30">
                        <Heart className="h-3 w-3" />
                        {recipient.role.charAt(0).toUpperCase() + recipient.role.slice(1)}
                      </span>
                    )}
                  </div>
                  {recipient.bio && (
                    <p className="text-sm text-yellow-200 leading-relaxed">{recipient.bio}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-navy-800/50 rounded-lg p-4 border border-navy-700/50 text-center">
                <Heart className="h-6 w-6 text-pink-400 mx-auto mb-2" />
                <p className="text-2xl font-bold text-white">{recipient.total_requests || 0}</p>
                <p className="text-xs text-yellow-200/80 mt-1">Total Requests</p>
              </div>
              <div className="bg-navy-800/50 rounded-lg p-4 border border-navy-700/50 text-center">
                <CheckCircle className="h-6 w-6 text-green-400 mx-auto mb-2" />
                <p className="text-2xl font-bold text-white">{recipient.fulfilled_requests || 0}</p>
                <p className="text-xs text-yellow-200/80 mt-1">Fulfilled</p>
              </div>
              <div className="bg-navy-800/50 rounded-lg p-4 border border-navy-700/50 text-center">
                <Star className="h-6 w-6 text-yellow-400 mx-auto mb-2" />
                <p className="text-2xl font-bold text-white">
                  {recipient.average_rating ? recipient.average_rating.toFixed(1) : 'N/A'}
                </p>
                <p className="text-xs text-yellow-200/80 mt-1">Avg Rating</p>
              </div>
              <div className="bg-navy-800/50 rounded-lg p-4 border border-navy-700/50 text-center">
                <Users className="h-6 w-6 text-blue-400 mx-auto mb-2" />
                <p className="text-2xl font-bold text-white">{recipient.household_size || 'N/A'}</p>
                <p className="text-xs text-yellow-200/80 mt-1">Household Size</p>
              </div>
            </div>

            {/* Contact Information */}
            <div className="bg-navy-800/50 rounded-xl p-6 border border-navy-700/50">
              <h5 className="text-white font-semibold mb-4 text-sm flex items-center gap-2">
                <Mail className="h-4 w-4 text-yellow-400" />
                Contact Information
              </h5>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {recipient.email && (
                  <div className="flex items-center gap-3">
                    <Mail className="h-4 w-4 text-yellow-400 flex-shrink-0" />
                    <div>
                      <p className="text-xs text-gray-400">Email</p>
                      <p className="text-sm text-white">{recipient.email}</p>
                    </div>
                  </div>
                )}
                {recipient.phone_number && (
                  <div className="flex items-center gap-3">
                    <Phone className="h-4 w-4 text-yellow-400 flex-shrink-0" />
                    <div>
                      <p className="text-xs text-gray-400">Phone</p>
                      <p className="text-sm text-white">{recipient.phone_number}</p>
                    </div>
                  </div>
                )}
                {recipient.address && (
                  <div className="flex items-start gap-3 md:col-span-2">
                    <MapPin className="h-4 w-4 text-yellow-400 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-xs text-gray-400">Address</p>
                      <p className="text-sm text-white">{recipient.address}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Additional Information */}
            {(recipient.household_size || recipient.special_needs || recipient.income_level) && (
              <div className="bg-navy-800/50 rounded-xl p-6 border border-navy-700/50">
                <h5 className="text-white font-semibold mb-4 text-sm flex items-center gap-2">
                  <Users className="h-4 w-4 text-yellow-400" />
                  Background Information
                </h5>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {recipient.household_size && (
                    <div>
                      <p className="text-xs text-gray-400 mb-1">Household Size</p>
                      <p className="text-sm text-white">{recipient.household_size} {recipient.household_size === 1 ? 'person' : 'people'}</p>
                    </div>
                  )}
                  {recipient.income_level && (
                    <div>
                      <p className="text-xs text-gray-400 mb-1">Income Level</p>
                      <p className="text-sm text-white capitalize">{recipient.income_level}</p>
                    </div>
                  )}
                  {recipient.special_needs && (
                    <div className="md:col-span-2">
                      <p className="text-xs text-gray-400 mb-1">Special Needs</p>
                      <p className="text-sm text-white">{recipient.special_needs}</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Request Information (if provided) */}
            {request && (
              <div className="bg-yellow-500/10 rounded-xl p-6 border border-yellow-400/20">
                <h5 className="text-white font-semibold mb-4 text-sm flex items-center gap-2">
                  <Heart className="h-4 w-4 text-yellow-400" />
                  Current Request
                </h5>
                <div className="space-y-2">
                  <div>
                    <p className="text-xs text-gray-400 mb-1">Request Title</p>
                    <p className="text-sm font-medium text-white">{request.title}</p>
                  </div>
                  {request.description && (
                    <div>
                      <p className="text-xs text-gray-400 mb-1">Description</p>
                      <p className="text-sm text-yellow-200">{request.description}</p>
                    </div>
                  )}
                  <div className="grid grid-cols-2 gap-4 mt-3">
                    <div>
                      <p className="text-xs text-gray-400 mb-1">Quantity Needed</p>
                      <p className="text-sm font-medium text-white">{request.quantity_needed}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-400 mb-1">Urgency</p>
                      <p className="text-sm font-medium text-white capitalize">{request.urgency}</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Trust Indicators */}
            {verificationLevel.level === 'verified' || verificationLevel.level === 'trusted' ? (
              <div className="bg-green-500/10 rounded-xl p-4 border border-green-400/20">
                <div className="flex items-start gap-3">
                  <Shield className="h-5 w-5 text-green-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-green-300 mb-1">Trusted Community Member</p>
                    <p className="text-xs text-green-200/80">
                      This recipient has been verified and has a positive track record in the community.
                      {verificationLevel.level === 'trusted' && ' They are a trusted member with excellent standing.'}
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-orange-500/10 rounded-xl p-4 border border-orange-400/20">
                <div className="flex items-start gap-3">
                  <AlertCircle className="h-5 w-5 text-orange-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-orange-300 mb-1">Verification Pending</p>
                    <p className="text-xs text-orange-200/80">
                      This recipient's profile is not yet fully verified. Consider reviewing their request details carefully.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="sticky bottom-0 p-6 border-t border-yellow-400/20 bg-gradient-to-r from-yellow-500/5 to-transparent backdrop-blur-sm">
            <button
              onClick={onClose}
              className="w-full px-6 py-3 bg-gradient-to-r from-yellow-500 to-yellow-600 hover:from-yellow-400 hover:to-yellow-500 text-navy-950 font-bold rounded-lg transition-all shadow-lg shadow-yellow-500/30"
            >
              Close
            </button>
          </div>
        </motion.div>
      </div>
    </div>
  )
}

export default RecipientProfileModal

