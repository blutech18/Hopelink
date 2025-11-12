// HopeLink Database Helper Functions
// Utilities for working with optimized database schema

/**
 * Extract user role preferences safely
 */
export function getUserRolePreferences(user) {
  if (!user?.role_preferences) return {}
  
  return {
    donation_types: user.role_preferences.donation_types || [],
    assistance_needs: user.role_preferences.assistance_needs || [],
    preferred_delivery_types: user.role_preferences.preferred_delivery_types || [],
    volunteer_experience: user.role_preferences.volunteer_experience || '',
    special_skills: user.role_preferences.special_skills || [],
    languages_spoken: user.role_preferences.languages_spoken || [],
    delivery_preferences: user.role_preferences.delivery_preferences || [],
    communication_preferences: user.role_preferences.communication_preferences || []
  }
}

/**
 * Extract user contact info safely
 * Note: has_insurance, insurance_provider, insurance_policy_number are now in volunteer_profiles
 * and household_size is in recipient_profiles, but getProfile() flattens them onto the user object
 */
export function getUserContactInfo(user) {
  // Check for flattened fields first (from normalized profile tables via getProfile)
  // Fall back to contact_info JSONB for backward compatibility
  const contactInfo = user?.contact_info || {}
  
  return {
    emergency_contact_name: user?.emergency_contact_name || contactInfo.emergency_contact_name || '',
    emergency_contact_phone: user?.emergency_contact_phone || contactInfo.emergency_contact_phone || '',
    emergency_contact_relationship: contactInfo.emergency_contact_relationship || '',
    // Insurance fields are now in volunteer_profiles (flattened by getProfile)
    has_insurance: user?.has_insurance !== undefined ? user.has_insurance : (contactInfo.has_insurance || false),
    insurance_provider: user?.insurance_provider || contactInfo.insurance_provider || '',
    insurance_policy_number: user?.insurance_policy_number || contactInfo.insurance_policy_number || '',
    // household_size is now in recipient_profiles (flattened by getProfile)
    household_size: user?.household_size !== undefined ? user.household_size : (contactInfo.household_size || null)
  }
}

/**
 * Extract user address details safely
 */
export function getUserAddressDetails(user) {
  if (!user?.address_details) return {}
  
  return {
    house: user.address_details.house || '',
    street: user.address_details.street || '',
    barangay: user.address_details.barangay || '',
    subdivision: user.address_details.subdivision || '',
    landmark: user.address_details.landmark || '',
    zip_code: user.address_details.zip_code || ''
  }
}

/**
 * Extract user ID verification info safely
 */
export function getUserIdVerification(user) {
  if (!user?.id_verification) return {}
  
  return {
    primary_id_type: user.id_verification.primary_id_type || '',
    primary_id_number: user.id_verification.primary_id_number || '',
    primary_id_expiry: user.id_verification.primary_id_expiry || '',
    primary_id_image_url: user.id_verification.primary_id_image_url || '',
    secondary_id_type: user.id_verification.secondary_id_type || '',
    secondary_id_number: user.id_verification.secondary_id_number || '',
    secondary_id_expiry: user.id_verification.secondary_id_expiry || '',
    secondary_id_image_url: user.id_verification.secondary_id_image_url || '',
    status: user.id_verification.status || 'pending',
    notes: user.id_verification.notes || '',
    verified_by: user.id_verification.verified_by || null,
    verified_at: user.id_verification.verified_at || null
  }
}

/**
 * Extract organization info safely
 */
export function getUserOrganizationInfo(user) {
  if (!user?.organization_info) return {}
  
  return {
    name: user.organization_info.name || '',
    website: user.organization_info.website || '',
    account_type: user.organization_info.account_type || 'individual',
    representative_name: user.organization_info.representative_name || '',
    representative_position: user.organization_info.representative_position || ''
  }
}

/**
 * Prepare user data for database update (consolidate into JSONB fields)
 */
export function prepareUserUpdateData(formData) {
  const updateData = {}
  
  // Core fields (direct mapping)
  const coreFields = ['name', 'phone_number', 'address', 'city', 'province', 'bio', 'birthdate', 'age', 'latitude', 'longitude', 'profile_image_url']
  for (const field of coreFields) {
    if (formData[field] !== undefined) {
      updateData[field] = formData[field]
    }
  }
  
  // Role preferences (consolidate into JSONB)
  const rolePreferences = {}
  const roleFields = ['donation_types', 'assistance_needs', 'preferred_delivery_types', 'volunteer_experience', 'special_skills', 'languages_spoken', 'delivery_preferences', 'communication_preferences']
  for (const field of roleFields) {
    if (formData[field] !== undefined) {
      rolePreferences[field] = formData[field]
    }
  }
  if (Object.keys(rolePreferences).length > 0) {
    updateData.role_preferences = rolePreferences
  }
  
  // Contact info (consolidate into JSONB)
  // Note: has_insurance, insurance_provider, insurance_policy_number go to volunteer_profiles
  // household_size goes to recipient_profiles, not contact_info
  const contactInfo = {}
  const contactFields = ['emergency_contact_name', 'emergency_contact_phone', 'emergency_contact_relationship']
  for (const field of contactFields) {
    if (formData[field] !== undefined) {
      contactInfo[field] = formData[field]
    }
  }
  if (Object.keys(contactInfo).length > 0) {
    updateData.contact_info = contactInfo
  }
  
  // Insurance fields go directly to updateData (will be routed to volunteer_profiles by updateProfile)
  if (formData.has_insurance !== undefined) {
    updateData.has_insurance = formData.has_insurance
  }
  if (formData.insurance_provider !== undefined) {
    updateData.insurance_provider = formData.insurance_provider
  }
  if (formData.insurance_policy_number !== undefined) {
    updateData.insurance_policy_number = formData.insurance_policy_number
  }
  
  // household_size goes directly to updateData (will be routed to recipient_profiles by updateProfile)
  if (formData.household_size !== undefined) {
    updateData.household_size = formData.household_size
  }
  
  // Address details (consolidate into JSONB)
  const addressDetails = {}
  const addressMapping = {
    address_house: 'house',
    address_street: 'street',
    address_barangay: 'barangay',
    address_subdivision: 'subdivision',
    address_landmark: 'landmark',
    zip_code: 'zip_code'
  }
  for (const [formField, dbField] of Object.entries(addressMapping)) {
    if (formData[formField] !== undefined) {
      addressDetails[dbField] = formData[formField]
    }
  }
  if (Object.keys(addressDetails).length > 0) {
    updateData.address_details = addressDetails
  }
  
  // ID verification fields are handled separately by updateProfile
  // They are stored in user_id_documents table, not in users.id_verification JSONB
  // Pass ID fields directly to updateProfile which will route them to user_id_documents
  const idFields = ['primary_id_type', 'primary_id_number', 'primary_id_expiry', 'primary_id_image_url', 'secondary_id_type', 'secondary_id_number', 'secondary_id_expiry', 'secondary_id_image_url']
  for (const field of idFields) {
    if (formData[field] !== undefined) {
      updateData[field] = formData[field]
    }
  }
  
  // Organization info (consolidate into JSONB)
  const organizationInfo = {}
  const orgMapping = {
    organization_name: 'name',
    website_link: 'website',
    account_type: 'account_type',
    organization_representative_name: 'representative_name',
    organization_representative_position: 'representative_position'
  }
  for (const [formField, dbField] of Object.entries(orgMapping)) {
    if (formData[formField] !== undefined) {
      organizationInfo[dbField] = formData[formField]
    }
  }
  if (Object.keys(organizationInfo).length > 0) {
    updateData.organization_info = organizationInfo
  }
  
  return updateData
}

/**
 * Optimized user queries for common use cases
 */
export const optimizedQueries = {
  // Basic profile for display
  basicProfile: `
    id, email, name, role, phone_number,
    is_verified, is_active, verification_status,
    address, city, province, latitude, longitude,
    profile_image_url, bio, birthdate, age,
    created_at, updated_at
  `,
  
  // Profile with role preferences
  profileWithPreferences: `
    id, name, role, city, province,
    role_preferences,
    is_verified, is_active
  `,
  
  // Profile with contact info
  profileWithContact: `
    id, name, phone_number,
    contact_info,
    address_details
  `,
  
  // Profile with ID verification
  profileWithIdVerification: `
    id, name, email, role,
    id_verification,
    is_verified, verification_status
  `,
  
  // For matching algorithm
  matchingProfile: `
    id, name, role,
    city, province, latitude, longitude,
    role_preferences,
    is_verified, is_active
  `,
  
  // Admin user list
  adminUserList: `
    id, name, email, role, phone_number,
    city, province,
    is_verified, is_active, verification_status,
    created_at
  `
}
