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
      'availability_days': 'Availability Days',
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
      className="bg-gradient-to-r from-amber-900/20 to-orange-900/20 border border-amber-700/30 rounded-lg p-4 mb-6"
    >
      <div className="flex items-start space-x-3">
        <div className="flex-shrink-0">
          <AlertCircle className="h-5 w-5 text-amber-400 mt-0.5" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-amber-100">
              Complete Your Profile for Verification
            </h3>
            <div className="flex items-center space-x-2">
              {/* ID Verification Status */}
              <IDVerificationBadge
                idStatus={profile.id_verification_status}
                hasIdUploaded={profile.primary_id_type && profile.primary_id_number}
                size="xs"
                showText={true}
                showDescription={false}
              />
              <span className="text-xs text-amber-300 bg-amber-900/30 px-2 py-1 rounded-full">
                {completionPercentage}% Complete
              </span>
            </div>
          </div>
          
          <p className="text-xs text-amber-200/80 mb-3">
            Complete your profile to gain trust from the community and access all features. 
            Verified profiles are prioritized for {profile.role === 'donor' ? 'donation requests' : 
            profile.role === 'recipient' ? 'receiving donations' : 'volunteer opportunities'}.
          </p>

          {missingFields.length > 0 && (
            <div className="mb-3">
              <p className="text-xs font-medium text-amber-200 mb-1">Missing Information:</p>
              <div className="flex flex-wrap gap-1">
                {missingFields.slice(0, 4).map((field, index) => (
                  <span
                    key={index}
                    className="inline-flex items-center px-2 py-1 text-xs bg-amber-900/40 text-amber-200 rounded"
                  >
                    {field}
                  </span>
                ))}
                {missingFields.length > 4 && (
                  <span className="inline-flex items-center px-2 py-1 text-xs bg-amber-900/40 text-amber-200 rounded">
                    +{missingFields.length - 4} more
                  </span>
                )}
              </div>
            </div>
          )}

          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className="w-20 bg-amber-900/30 rounded-full h-2">
                <div
                  className="bg-gradient-to-r from-amber-500 to-orange-500 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${completionPercentage}%` }}
                />
              </div>
              <span className="text-xs text-amber-300">{completionPercentage}%</span>
            </div>
            
            <Link
              to="/profile"
              className="inline-flex items-center px-3 py-1.5 text-xs font-medium text-white bg-amber-600 hover:bg-amber-700 rounded-md transition-colors duration-200"
            >
              <Settings className="h-3 w-3 mr-1" />
              Complete Profile
              <ArrowRight className="h-3 w-3 ml-1" />
            </Link>
          </div>
        </div>
      </div>
    </motion.div>
  )
}

export default ProfileCompletionPrompt 