import React from 'react'
import { motion } from 'framer-motion'
import { AlertCircle, CheckCircle, Settings, ArrowRight } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { IDVerificationBadge } from './VerificationBadge'

const ProfileCompletionPrompt = () => {
  const { profile } = useAuth()

  if (!profile) return null
  
  // Don't show completion prompt for admin users
  if (profile.role === 'admin') return null

  // Check completion status based on role (matching ProfilePage logic)
  const getCompletionStatus = () => {
    if (!profile) return { isComplete: false, missingFields: [] }

    // Admin users don't require ID verification and have minimal requirements
    const baseRequiredFields = profile.role === 'admin' 
      ? ['name', 'phone_number'] // Only essential contact info for admins
      : ['name', 'phone_number', 'address', 'city', 'primary_id_type', 'primary_id_number']
    
    const roleSpecificFields = {
      donor: ['donation_types', 'preferred_contact_method'],
      recipient: ['household_size', 'assistance_needs', 'emergency_contact_name'],
      volunteer: ['availability_days', 'background_check_consent'],
      admin: [] // Admins have minimal required fields
    }

    // Additional recommended fields for better profile completion
    const recommendedFields = {
      donor: ['bio', 'preferred_pickup_location', 'donation_frequency', 'availability_days'],
      recipient: [],
      volunteer: [],
      admin: []
    }

    // Add organization-specific required fields
    let organizationFields = []
    if ((profile.account_type === 'business' || profile.account_type === 'organization') && 
        (profile.role === 'donor' || profile.role === 'recipient')) {
      organizationFields = ['secondary_id_type', 'secondary_id_number', 'organization_representative_name']
    }

    const allRequiredFields = [...baseRequiredFields, ...(roleSpecificFields[profile.role] || []), ...organizationFields]
    const allRecommendedFields = [...allRequiredFields, ...(recommendedFields[profile.role] || [])]
    
    const missingRequired = allRequiredFields.filter(field => {
      const value = profile[field]
      if (Array.isArray(value)) return value.length === 0
      return !value || value === 'To be completed' || value === '09000000000'
    })
    
    // Special validation for volunteers - must have driver's license (not applicable to admins)
    if (profile.role === 'volunteer' && profile.primary_id_type !== 'drivers_license') {
      missingRequired.push('drivers_license_required')
    }

    const missingRecommended = allRecommendedFields.filter(field => {
      const value = profile[field]
      if (Array.isArray(value)) return value.length === 0
      return !value || value === 'To be completed' || value === '09000000000'
    })

    // Calculate percentage based on recommended fields for better UX
    const percentage = Math.round(((allRecommendedFields.length - missingRecommended.length) / allRecommendedFields.length) * 100)

    // Convert field names to display names
    const fieldDisplayNames = {
      'name': 'Full Name',
      'phone_number': 'Phone Number',
      'address': 'Address',
      'city': 'City',
      'primary_id_type': 'Primary ID Type',
      'primary_id_number': 'Primary ID Number',
      'secondary_id_type': 'Secondary ID Type',
      'secondary_id_number': 'Secondary ID Number',
      'organization_representative_name': 'Organization Representative Name',
      'donation_types': 'Donation Types',
      'preferred_contact_method': 'Preferred Contact Method',
      'preferred_pickup_location': 'Pickup Location',
      'donation_frequency': 'Donation Frequency',
      'bio': 'Bio/Description',
      'availability_days': 'Available Days',
      'household_size': 'Household Size',
      'assistance_needs': 'Assistance Needs',
      'emergency_contact_name': 'Emergency Contact Name',
      'emergency_contact_phone': 'Emergency Contact Phone',
      'availability_times': 'Availability Times',
      'background_check_consent': 'Background Check Consent',
      'has_vehicle': 'Vehicle Ownership',
      'vehicle_type': 'Vehicle Type',
      'max_delivery_distance': 'Maximum Delivery Distance',
      'volunteer_experience': 'Volunteer Experience',
      'drivers_license_required': 'Driver\'s License (Required for Volunteers)',
      'organization_name': 'Organization Name',
      'website_link': 'Website Link'
    }

    const missingFieldsDisplay = missingRequired.map(field => fieldDisplayNames[field] || field)

    return {
      isComplete: missingRequired.length === 0,
      missingFields: missingFieldsDisplay,
      completionPercentage: percentage
    }
  }

  const { isComplete, missingFields, completionPercentage } = getCompletionStatus()

  // Don't show if profile is complete
  if (isComplete) return null

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="rounded-lg p-4 sm:p-5 mb-6 border-2 border-yellow-500/30 shadow-lg"
      style={{ backgroundColor: '#001a5c' }}
    >
      <div className="flex items-start space-x-3">
        <div className="flex-shrink-0 mt-1">
          <AlertCircle className="h-5 w-5 sm:h-6 sm:w-6 text-yellow-400" />
        </div>
        <div className="flex-1 min-w-0">
          {/* Header Section - Responsive */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-3">
            <h3 className="text-sm sm:text-base font-semibold text-white">
              Complete Your Profile for Verification
            </h3>
            <div className="flex items-center gap-2 flex-wrap">
              {/* ID Verification Status */}
              <IDVerificationBadge
                idStatus={profile.id_verification_status}
                hasIdUploaded={profile.primary_id_type && profile.primary_id_number}
                size="xs"
                showText={true}
                showDescription={false}
              />
              <span className="text-xs font-medium text-yellow-300 bg-navy-800 px-2.5 py-1 rounded-full whitespace-nowrap">
                {completionPercentage}% Complete
              </span>
            </div>
          </div>
          
          <p className="text-xs sm:text-sm text-yellow-200 mb-3 leading-relaxed">
            Complete your profile to gain trust from the community and access all features. 
            Verified profiles are prioritized for {profile.role === 'donor' ? 'donation requests' : 
            profile.role === 'recipient' ? 'receiving donations' : 'volunteer opportunities'}.
          </p>

          {missingFields.length > 0 && (
            <div className="mb-4">
              <p className="text-xs sm:text-sm font-medium text-yellow-200 mb-2">Missing Information:</p>
              <div className="flex flex-wrap gap-1.5">
                {missingFields.slice(0, 4).map((field, index) => (
                  <span
                    key={index}
                    className="inline-flex items-center px-2.5 py-1 text-xs bg-navy-800 text-yellow-200 rounded-md border border-navy-700"
                  >
                    {field}
                  </span>
                ))}
                {missingFields.length > 4 && (
                  <span className="inline-flex items-center px-2.5 py-1 text-xs bg-navy-800 text-yellow-200 rounded-md border border-navy-700 font-medium">
                    +{missingFields.length - 4} more
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Progress Bar and Action Button - Responsive */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex items-center space-x-3 flex-1">
              <div className="flex-1 max-w-[200px] bg-navy-800 rounded-full h-2.5">
                <div
                  className="bg-gradient-to-r from-yellow-400 to-yellow-500 h-2.5 rounded-full transition-all duration-300 shadow-sm"
                  style={{ width: `${completionPercentage}%` }}
                />
              </div>
              <span className="text-xs sm:text-sm font-semibold text-yellow-300 whitespace-nowrap">{completionPercentage}%</span>
            </div>
            
            <Link
              to="/profile"
              className="inline-flex items-center justify-center px-4 py-2 text-xs sm:text-sm font-semibold text-navy-950 bg-gradient-to-r from-yellow-500 to-yellow-600 hover:from-yellow-600 hover:to-yellow-700 rounded-lg transition-all duration-200 shadow-md hover:shadow-lg active:scale-95 whitespace-nowrap"
            >
              <Settings className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1.5" />
              Complete Profile
              <ArrowRight className="h-3.5 w-3.5 sm:h-4 sm:w-4 ml-1.5" />
            </Link>
          </div>
        </div>
      </div>
    </motion.div>
  )
}

export default ProfileCompletionPrompt 