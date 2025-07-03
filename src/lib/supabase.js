import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

// Check if Supabase is properly configured
const isSupabaseConfigured = supabaseUrl && supabaseAnonKey && supabaseUrl !== 'your_supabase_project_url'

let supabase = null

// Log configuration status
console.log('🔧 HopeLink Configuration:', {
  isSupabaseConfigured,
  hasSupabaseUrl: !!supabaseUrl,
  hasSupabaseKey: !!supabaseAnonKey,
  env: import.meta.env.NODE_ENV
})

if (isSupabaseConfigured) {
  try {
    supabase = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true
      }
    })
    console.log('✅ Supabase client initialized successfully')
  } catch (error) {
    console.warn('❌ Failed to initialize Supabase:', error)
  }
} else {
  console.warn('⚠️ Supabase not configured. Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY')
}

// Helper functions for common database operations
export const db = {
  // Users
  async getProfile(userId) {
    if (!supabase) {
      throw new Error('Supabase not configured. Please set up your environment variables.')
    }

    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .maybeSingle() // Use maybeSingle instead of single to avoid throwing on no results
      
      if (error) {
        // Log the specific error for debugging
        console.error('Database error in getProfile:', error)
        throw error
      }
      
      return data
    } catch (error) {
      console.error('Error in getProfile:', error)
      throw error
    }
  },

  async createProfile(userId, profileData) {
    if (!supabase) {
      throw new Error('Supabase not configured. Please set up your environment variables.')
    }

    const { data, error } = await supabase
      .from('users')
      .insert({
        id: userId,
        ...profileData,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single()
    
    if (error) throw error
    return data
  },

  async updateProfile(userId, updates) {
    if (!supabase) {
      throw new Error('Supabase not configured. Please set up your environment variables.')
    }

    const { data, error } = await supabase
      .from('users')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', userId)
      .select()
      .single()
    
    if (error) throw error
    return data
  },

  // Donations
  async getDonations(filters = {}) {
    if (!supabase) {
      throw new Error('Supabase not configured. Please set up your environment variables.')
    }

    let query = supabase
      .from('donations')
      .select(`
        *,
        donor:users!donations_donor_id_fkey(name, email, profile_image_url),
        event:events(name, id)
      `)
      .order('created_at', { ascending: false })

    if (filters.status) {
      query = query.eq('status', filters.status)
    }
    
    if (filters.category) {
      query = query.eq('category', filters.category)
    }

    if (filters.donor_id) {
      query = query.eq('donor_id', filters.donor_id)
    }

    const { data, error } = await query
    if (error) throw error
    return data
  },

  async createDonation(donation) {
    if (!supabase) {
      throw new Error('Supabase not configured. Please set up your environment variables.')
    }

    // Simplified insert without complex joins for better performance
    const { data, error } = await supabase
      .from('donations')
      .insert(donation)
      .select('*')
      .single()
    
    if (error) throw error
    return data
  },

  async updateDonation(donationId, updates, userId = null) {
    if (!supabase) {
      throw new Error('Supabase not configured. Please set up your environment variables.')
    }

    // If userId is provided, check ownership and status restrictions
    if (userId) {
      const { data: donation, error: checkError } = await supabase
        .from('donations')
        .select('donor_id, status')
        .eq('id', donationId)
        .single()

      if (checkError) throw checkError

      if (donation.donor_id !== userId) {
        throw new Error('You can only edit your own donations')
      }

      if (!['available'].includes(donation.status)) {
        throw new Error('Cannot edit donations that are claimed or completed')
      }
    }

    // Remove fields that shouldn't be updated
    const { donor_id, created_at, ...allowedUpdates } = updates

    let query = supabase
      .from('donations')
      .update({
        ...allowedUpdates,
        updated_at: new Date().toISOString()
      })
      .eq('id', donationId)

    // Add user restriction only if userId is provided
    if (userId) {
      query = query.eq('donor_id', userId)
    }

    const { data, error } = await query.select('*').single()

    if (error) throw error
    return data
  },

  async deleteDonation(donationId, userId) {
    if (!supabase) {
      throw new Error('Supabase not configured. Please set up your environment variables.')
    }

    // First check if the donation belongs to the user and can be deleted
    const { data: donation, error: checkError } = await supabase
      .from('donations')
      .select('donor_id, status')
      .eq('id', donationId)
      .single()

    if (checkError) throw checkError

    if (donation.donor_id !== userId) {
      throw new Error('You can only delete your own donations')
    }

    if (!['available', 'cancelled', 'expired'].includes(donation.status)) {
      throw new Error('Cannot delete donations that are claimed or in progress')
    }

    const { error } = await supabase
      .from('donations')
      .delete()
      .eq('id', donationId)
      .eq('donor_id', userId)

    if (error) throw error
    return true
  },

  // Donation Requests
  async getRequests(filters = {}) {
    if (!supabase) {
      throw new Error('Supabase not configured. Please set up your environment variables.')
    }

    let query = supabase
      .from('donation_requests')
      .select(`
        *,
        requester:users!donation_requests_requester_id_fkey(name, email, profile_image_url),
        event:events(name, id)
      `)
      .order('created_at', { ascending: false })

    if (filters.status) {
      query = query.eq('status', filters.status)
    }
    
    if (filters.category) {
      query = query.eq('category', filters.category)
    }

    if (filters.requester_id) {
      query = query.eq('requester_id', filters.requester_id)
    }

    const { data, error } = await query
    if (error) throw error
    return data
  },

  async createRequest(request) {
    if (!supabase) {
      throw new Error('Supabase not configured. Please set up your environment variables.')
    }

    const { data, error } = await supabase
      .from('donation_requests')
      .insert(request)
      .select(`
        *,
        requester:users!donation_requests_requester_id_fkey(name, email, profile_image_url)
      `)
      .single()
    
    if (error) throw error
    return data
  },

  async updateRequest(requestId, updates) {
    if (!supabase) {
      throw new Error('Supabase not configured. Please set up your environment variables.')
    }

    const { data, error } = await supabase
      .from('donation_requests')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', requestId)
      .select()
      .single()

    if (error) throw error
    return data
  },

  // Additional recipient-specific functions
  async getAvailableDonations() {
    if (!supabase) {
      throw new Error('Supabase not configured. Please set up your environment variables.')
    }

    const { data, error } = await supabase
      .from('donations')
      .select(`
        *,
        donor:users!donations_donor_id_fkey(id, name, email, profile_image_url, city)
      `)
      .eq('status', 'available')
      .order('is_urgent', { ascending: false })
      .order('created_at', { ascending: false })

    if (error) throw error
    return data
  },

  async claimDonation(donationId, recipientId) {
    if (!supabase) {
      throw new Error('Supabase not configured. Please set up your environment variables.')
    }

    // First, check if donation is still available and get delivery mode
    const { data: donation, error: checkError } = await supabase
      .from('donations')
      .select('status, quantity, delivery_mode, donor_id')
      .eq('id', donationId)
      .single()

    if (checkError) throw checkError
    
    if (donation.status !== 'available') {
      throw new Error('This donation is no longer available')
    }

    // Create a claim
    const { data: claim, error } = await supabase
      .from('donation_claims')
      .insert({
        donation_id: donationId,
        recipient_id: recipientId,
        donor_id: donation.donor_id,
        quantity_claimed: donation.quantity,
        status: 'claimed'
      })
      .select()
      .single()

    if (error) throw error

    // Update donation status
    await supabase
      .from('donations')
      .update({ status: 'claimed' })
      .eq('id', donationId)

    // If this is a volunteer delivery, create a delivery record so it appears in volunteer dashboard
    if (donation.delivery_mode === 'volunteer') {
      const { error: deliveryError } = await supabase
        .from('deliveries')
        .insert({
          claim_id: claim.id,
          pickup_address: 'TBD', // Will be filled when volunteer is assigned
          delivery_address: 'TBD', // Will be filled when volunteer is assigned
          pickup_city: 'TBD',
          delivery_city: 'TBD',
          status: 'pending' // Waiting for volunteer assignment
        })

      if (deliveryError) {
        console.error('Error creating delivery record:', deliveryError)
        // Don't throw error here as the claim was successful
        // The delivery can be created manually if needed
      }
    }

    return claim
  },

  async createDonationRequest(requestData) {
    if (!supabase) {
      throw new Error('Supabase not configured. Please set up your environment variables.')
    }

    const { data, error } = await supabase
      .from('donation_requests')
      .insert({
        ...requestData,
        status: 'open'
      })
      .select(`
        *,
        requester:users!donation_requests_requester_id_fkey(name, email, profile_image_url)
      `)
      .single()
    
    if (error) throw error
    return data
  },

  async getUserDonationRequests(userId) {
    if (!supabase) {
      throw new Error('Supabase not configured. Please set up your environment variables.')
    }

    const { data, error } = await supabase
      .from('donation_requests')
      .select(`
        *,
        claims:donation_claims(count)
      `)
      .eq('requester_id', userId)
      .order('created_at', { ascending: false })

    if (error) throw error
    
    // Add claims count to each request
    return data.map(request => ({
      ...request,
      claims_count: request.claims?.[0]?.count || 0
    }))
  },

  async deleteDonationRequest(requestId, userId) {
    if (!supabase) {
      throw new Error('Supabase not configured. Please set up your environment variables.')
    }

    // First check if the request belongs to the user and can be deleted
    const { data: request, error: checkError } = await supabase
      .from('donation_requests')
      .select('requester_id, status')
      .eq('id', requestId)
      .single()

    if (checkError) throw checkError

    if (request.requester_id !== userId) {
      throw new Error('You can only delete your own requests')
    }

    if (!['open', 'cancelled', 'expired'].includes(request.status)) {
      throw new Error('Cannot delete requests that are in progress or fulfilled')
    }

    const { error } = await supabase
      .from('donation_requests')
      .delete()
      .eq('id', requestId)
      .eq('requester_id', userId)

    if (error) throw error
    return true
  },

  // Events
  async getEvents(filters = {}) {
    if (!supabase) {
      throw new Error('Supabase not configured. Please set up your environment variables.')
    }

    let query = supabase
      .from('events')
      .select(`
        *,
        creator:users!events_created_by_fkey(name, email),
        event_items(*),
        participants:event_participants(count)
      `)
      .order('created_at', { ascending: false })

    if (filters.status) {
      query = query.eq('status', filters.status)
    }

    const { data, error } = await query
    if (error) throw error
    return data
  },

  async createEvent(eventData, donationItems = []) {
    if (!supabase) {
      throw new Error('Supabase not configured. Please set up your environment variables.')
    }

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      throw new Error('User not authenticated')
    }

    // Create the event first
    const { data: event, error: eventError } = await supabase
      .from('events')
      .insert({
        ...eventData,
        created_by: user.id,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single()

    if (eventError) throw eventError

    // Create event items if provided
    if (donationItems && donationItems.length > 0) {
      const eventItemsToInsert = donationItems.map(item => ({
        event_id: event.id,
        name: item.name,
        category: item.category,
        quantity: item.quantity,
        description: item.description || null,
        collected_quantity: item.collected_quantity || 0,
        created_at: new Date().toISOString()
      }))

      const { error: itemsError } = await supabase
        .from('event_items')
        .insert(eventItemsToInsert)

      if (itemsError) throw itemsError
    }

    // Return event with items
    const { data: fullEvent, error: fetchError } = await supabase
      .from('events')
      .select(`
        *,
        creator:users!events_created_by_fkey(name, email),
        event_items(*),
        participants:event_participants(count)
      `)
      .eq('id', event.id)
      .single()

    if (fetchError) throw fetchError
    return fullEvent
  },

  async updateEvent(eventId, eventData, donationItems = []) {
    if (!supabase) {
      throw new Error('Supabase not configured. Please set up your environment variables.')
    }

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      throw new Error('User not authenticated')
    }

    // Update the event
    const { data: event, error: eventError } = await supabase
      .from('events')
      .update({
        ...eventData,
        updated_at: new Date().toISOString()
      })
      .eq('id', eventId)
      .select()
      .single()

    if (eventError) throw eventError

    // Delete existing event items
    const { error: deleteError } = await supabase
      .from('event_items')
      .delete()
      .eq('event_id', eventId)

    if (deleteError) throw deleteError

    // Create new event items if provided
    if (donationItems && donationItems.length > 0) {
      const eventItemsToInsert = donationItems.map(item => ({
        event_id: eventId,
        name: item.name,
        category: item.category,
        quantity: item.quantity,
        description: item.description || null,
        collected_quantity: item.collected_quantity || 0,
        created_at: new Date().toISOString()
      }))

      const { error: itemsError } = await supabase
        .from('event_items')
        .insert(eventItemsToInsert)

      if (itemsError) throw itemsError
    }

    // Return updated event with items
    const { data: fullEvent, error: fetchError } = await supabase
      .from('events')
      .select(`
        *,
        creator:users!events_created_by_fkey(name, email),
        event_items(*),
        participants:event_participants(count)
      `)
      .eq('id', eventId)
      .single()

    if (fetchError) throw fetchError
    return fullEvent
  },

  // Deliveries
  async getDeliveries(filters = {}) {
    if (!supabase) {
      throw new Error('Supabase not configured. Please set up your environment variables.')
    }

    let query = supabase
      .from('deliveries')
      .select(`
        *,
        volunteer:users!deliveries_volunteer_id_fkey(id, name, email, phone_number),
        claim:donation_claims(
          *,
          donation:donations(title, description, category, donor:users!donations_donor_id_fkey(id, name, phone_number)),
          request:donation_requests(title, requester:users!donation_requests_requester_id_fkey(id, name, phone_number)),
          donor:users!donation_claims_donor_id_fkey(id, name, phone_number),
          recipient:users!donation_claims_recipient_id_fkey(id, name, phone_number)
        )
      `)
      .order('created_at', { ascending: false })

    if (filters.volunteer_id) {
      query = query.eq('volunteer_id', filters.volunteer_id)
    }

    if (filters.status) {
      query = query.eq('status', filters.status)
    }

    const { data, error } = await query
    if (error) throw error
    return data
  },

  async createDelivery(deliveryData) {
    if (!supabase) {
      throw new Error('Supabase not configured. Please set up your environment variables.')
    }

    const { data, error } = await supabase
      .from('deliveries')
      .insert({
        ...deliveryData,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single()
    
    if (error) throw error
    return data
  },

  async updateDelivery(deliveryId, updates) {
    if (!supabase) {
      throw new Error('Supabase not configured. Please set up your environment variables.')
    }

    const { data, error } = await supabase
      .from('deliveries')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', deliveryId)
      .select()
      .single()
    
    if (error) throw error
    return data
  },

  // Volunteer-specific functions
  async getAvailableVolunteerTasks() {
    if (!supabase) {
      throw new Error('Supabase not configured. Please set up your environment variables.')
    }

    try {
      // Get claimed donations with volunteer delivery mode that don't have assigned volunteers yet
      const { data: claimedDonations, error: claimedError } = await supabase
        .from('donation_claims')
        .select(`
          *,
          donation:donations(
            *,
            donor:users!donations_donor_id_fkey(id, name, phone_number, city, address)
          ),
          recipient:users!donation_claims_recipient_id_fkey(id, name, phone_number, city, address),
          delivery:deliveries(id, volunteer_id, status)
        `)
        .eq('donation.delivery_mode', 'volunteer')
        .eq('status', 'claimed')
        .order('claimed_at', { ascending: false })

      if (claimedError) throw claimedError

      // Filter out donations that already have volunteer assignments and ensure only volunteer delivery mode
      const availableForDelivery = (claimedDonations || []).filter(claim => 
        claim.donation && 
        claim.donation.delivery_mode === 'volunteer' &&
        (!claim.delivery || claim.delivery.length === 0 || 
        claim.delivery.every(d => !d.volunteer_id))
      )

      // Get open donation requests with volunteer delivery mode that don't have claims yet
      const { data: requests, error: requestsError } = await supabase
        .from('donation_requests')
        .select(`
          *,
          requester:users!donation_requests_requester_id_fkey(id, name, phone_number, city, address)
        `)
        .eq('status', 'open')
        .eq('delivery_mode', 'volunteer')
        .order('created_at', { ascending: false })

      if (requestsError) throw requestsError

      // Transform claimed donations into task format - these are approved donations needing volunteers
      const deliveryTasks = availableForDelivery
        .filter(claim => claim.donation && claim.donation.title) // Filter out claims with null donations
        .map(claim => ({
          id: `claim-${claim.id}`,
          type: 'approved_donation',
          title: `Deliver: ${claim.donation.title}`,
          description: claim.donation.description || 'No description available',
          category: claim.donation.category,
          urgency: claim.donation.is_urgent ? 'high' : 'medium',
          pickupLocation: claim.donation.pickup_location,
          deliveryLocation: claim.recipient?.address || claim.recipient?.city || 'Address TBD',
          donor: claim.donation.donor,
          recipient: claim.recipient,
          originalId: claim.id,
          claimId: claim.id,
          createdAt: claim.claimed_at,
          isUrgent: claim.donation.is_urgent,
          quantity: claim.donation.quantity,
          condition: claim.donation.condition,
          expiryDate: claim.donation.expiry_date,
          pickup_instructions: claim.donation.pickup_instructions
        }))

      // Transform requests into task format - these are still just requests without donors
      const requestTasks = (requests || []).map(request => ({
        id: `request-${request.id}`,
        type: 'request',
        title: `Needed: ${request.title}`,
        description: request.description || 'No description available',
        category: request.category,
        urgency: request.urgency,
        pickupLocation: 'To be determined when matched with donor',
        deliveryLocation: request.location,
        donor: null,
        recipient: request.requester,
        originalId: request.id,
        createdAt: request.created_at,
        quantityNeeded: request.quantity_needed,
        neededBy: request.needed_by
      }))

      // Combine and sort by urgency and date
      const allTasks = [...deliveryTasks, ...requestTasks]
      
      allTasks.sort((a, b) => {
        const urgencyOrder = { critical: 4, high: 3, medium: 2, low: 1 }
        if (urgencyOrder[a.urgency] !== urgencyOrder[b.urgency]) {
          return urgencyOrder[b.urgency] - urgencyOrder[a.urgency]
        }
        return new Date(b.createdAt) - new Date(a.createdAt)
      })

      return allTasks
    } catch (error) {
      console.error('Error fetching volunteer tasks:', error)
      throw error
    }
  },

  async assignVolunteerToDelivery(claimId, volunteerId) {
    if (!supabase) {
      throw new Error('Supabase not configured. Please set up your environment variables.')
    }

    // First check if delivery record exists for this claim
    const { data: existingDelivery, error: checkError } = await supabase
      .from('deliveries')
      .select('*')
      .eq('claim_id', claimId)
      .single()

    if (checkError && checkError.code !== 'PGRST116') { // PGRST116 means no rows found
      throw checkError
    }

    if (existingDelivery) {
      // Update existing delivery record
      const { data, error } = await supabase
        .from('deliveries')
        .update({
          volunteer_id: volunteerId,
          status: 'assigned'
        })
        .eq('id', existingDelivery.id)
        .select()
        .single()
      
      if (error) throw error
      return data
    } else {
      // Create new delivery record
      const { data: claim } = await supabase
        .from('donation_claims')
        .select('donor_id, recipient_id')
        .eq('id', claimId)
        .single()

      const { data, error } = await supabase
        .from('deliveries')
        .insert({
          claim_id: claimId,
          volunteer_id: volunteerId,
          pickup_address: 'TBD', // Will be filled by volunteer
          delivery_address: 'TBD', // Will be filled by volunteer
          pickup_city: 'TBD',
          delivery_city: 'TBD',
          status: 'assigned'
        })
        .select()
        .single()
      
      if (error) throw error
      return data
    }
  },

  async getVolunteerStats(volunteerId) {
    if (!supabase) {
      throw new Error('Supabase not configured. Please set up your environment variables.')
    }

    // Get delivery statistics
    const { data: deliveries, error: deliveryError } = await supabase
      .from('deliveries')
      .select('status, created_at')
      .eq('volunteer_id', volunteerId)

    if (deliveryError) throw deliveryError

    // Get volunteer ratings
    const { data: ratings, error: ratingError } = await supabase
      .from('volunteer_ratings')
      .select('rating')
      .eq('volunteer_id', volunteerId)

    if (ratingError) throw ratingError

    const totalDeliveries = deliveries.length
    const completedDeliveries = deliveries.filter(d => d.status === 'delivered').length
    const activeDeliveries = deliveries.filter(d => !['delivered', 'cancelled'].includes(d.status)).length
    const averageRating = ratings.length > 0 ? 
      ratings.reduce((sum, r) => sum + r.rating, 0) / ratings.length : 0

    return {
      totalDeliveries,
      completedDeliveries,
      activeDeliveries,
      averageRating: Number(averageRating.toFixed(1)),
      totalRatings: ratings.length
    }
  },

  async createVolunteerRating(ratingData) {
    if (!supabase) {
      throw new Error('Supabase not configured. Please set up your environment variables.')
    }

    const { data, error } = await supabase
      .from('volunteer_ratings')
      .insert(ratingData)
      .select()
      .single()
    
    if (error) throw error
    return data
  },

  async getVolunteerRatings(volunteerId) {
    if (!supabase) {
      throw new Error('Supabase not configured. Please set up your environment variables.')
    }

    const { data, error } = await supabase
      .from('volunteer_ratings')
      .select(`
        *,
        delivery:deliveries(
          claim:donation_claims(
            donation:donations(title),
            recipient:users!donation_claims_recipient_id_fkey(name)
          )
        ),
        rater:users!volunteer_ratings_rated_by_fkey(name)
      `)
      .eq('volunteer_id', volunteerId)
      .order('created_at', { ascending: false })

    if (error) throw error
    return data
  },

  // Notifications
  async createNotification(notificationData) {
    if (!supabase) {
      throw new Error('Supabase not configured. Please set up your environment variables.')
    }

    const { data, error } = await supabase
      .from('notifications')
      .insert(notificationData)
      .select()
      .single()
    
    if (error) throw error
    return data
  },

  async getUserNotifications(userId, limit = 50) {
    if (!supabase) {
      throw new Error('Supabase not configured. Please set up your environment variables.')
    }

    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (error) throw error
    return data
  },

  async markNotificationAsRead(notificationId) {
    if (!supabase) {
      throw new Error('Supabase not configured. Please set up your environment variables.')
    }

    const { data, error } = await supabase
      .from('notifications')
      .update({ read_at: new Date().toISOString() })
      .eq('id', notificationId)
      .select()
      .single()
    
    if (error) throw error
    return data
  },

  // Profile completion check
  async checkProfileCompletion(userId) {
    if (!supabase) {
      throw new Error('Supabase not configured. Please set up your environment variables.')
    }

    const { data, error } = await supabase
      .rpc('check_profile_completion', { user_uuid: userId })

    if (error) throw error
    return data
  },

  // Volunteer request confirmation functions
  async confirmVolunteerRequest(notificationId, volunteerId, claimId, approved = true) {
    if (!supabase) {
      throw new Error('Supabase not configured. Please set up your environment variables.')
    }

    try {
      if (approved) {
        // Assign volunteer to delivery
        const deliveryRecord = await this.assignVolunteerToDelivery(claimId, volunteerId)
        
        // Mark notification as read
        await this.markNotificationAsRead(notificationId)
        
        // Get claim details for notifications
        const { data: claim } = await supabase
          .from('donation_claims')
          .select(`
            *,
            donation:donations(title, donor:users!donations_donor_id_fkey(id, name)),
            recipient:users!donation_claims_recipient_id_fkey(id, name)
          `)
          .eq('id', claimId)
          .single()

        if (claim) {
          // Notify volunteer of confirmation
          await this.createNotification({
            user_id: volunteerId,
            type: 'delivery_assigned',
            title: 'Volunteer Request Approved',
            message: `Your volunteer request has been approved! You can now start the delivery process for: ${claim.donation?.title}`,
            data: { delivery_id: deliveryRecord.id, claim_id: claimId }
          })

          // Notify other party (donor/recipient) about confirmation
          const otherPartyId = claim.donation?.donor?.id === volunteerId ? claim.recipient?.id : claim.donation?.donor?.id
          if (otherPartyId) {
            await this.createNotification({
              user_id: otherPartyId,
              type: 'delivery_assigned',
              title: 'Volunteer Confirmed',
              message: `The volunteer request has been approved and delivery will proceed for: ${claim.donation?.title}`,
              data: { delivery_id: deliveryRecord.id, claim_id: claimId }
            })
          }
        }

        return deliveryRecord
      } else {
        // Mark notification as read (declined)
        await this.markNotificationAsRead(notificationId)
        
        // Optionally notify volunteer of decline
        await this.createNotification({
          user_id: volunteerId,
          type: 'system_alert',
          title: 'Volunteer Request Declined',
          message: 'Your volunteer request was not approved. Please check other available opportunities.',
          data: { claim_id: claimId }
        })

        return null
      }
    } catch (error) {
      console.error('Error confirming volunteer request:', error)
      throw error
    }
  },

  // Volunteer request management
  async createVolunteerRequest(requestData) {
    if (!supabase) {
      throw new Error('Supabase not configured. Please set up your environment variables.')
    }

    try {
      // Insert volunteer request record
      const { data: volunteerRequest, error: requestError } = await supabase
        .from('volunteer_requests')
        .insert({
          volunteer_id: requestData.volunteer_id,
          claim_id: requestData.claim_id || null,
          request_id: requestData.request_id || null,
          task_type: requestData.task_type,
          status: 'pending',
          created_at: new Date().toISOString()
        })
        .select()
        .single()

      if (requestError) throw requestError

      // Create notifications for relevant parties
      if (requestData.task_type === 'approved_donation' && requestData.claim_id) {
        // Get claim details for donor and recipient notifications
        const { data: claim } = await supabase
          .from('donation_claims')
          .select(`
            *,
            donation:donations(
              *,
              donor:users!donations_donor_id_fkey(id, name)
            ),
            recipient:users!donation_claims_recipient_id_fkey(id, name)
          `)
          .eq('id', requestData.claim_id)
          .single()

        if (claim) {
          // Notify donor
          await this.createNotification({
            user_id: claim.donation.donor.id,
            type: 'volunteer_request',
            title: 'Volunteer Request',
            message: `${requestData.volunteer_name} is requesting to deliver your donation: ${claim.donation.title}. Please confirm if you approve this volunteer.`,
            data: { 
              volunteer_id: requestData.volunteer_id,
              volunteer_name: requestData.volunteer_name,
              claim_id: requestData.claim_id,
              donation_id: claim.donation.id,
              task_type: 'approved_donation',
              volunteer_request_id: volunteerRequest.id
            }
          })
          
          // Notify recipient
          await this.createNotification({
            user_id: claim.recipient.id,
            type: 'volunteer_request',
            title: 'Volunteer Request',
            message: `${requestData.volunteer_name} is requesting to deliver your requested item: ${claim.donation.title}. Please confirm if you approve this volunteer.`,
            data: { 
              volunteer_id: requestData.volunteer_id,
              volunteer_name: requestData.volunteer_name,
              claim_id: requestData.claim_id,
              donation_id: claim.donation.id,
              task_type: 'approved_donation',
              volunteer_request_id: volunteerRequest.id
            }
          })
        }
      } else if (requestData.task_type === 'request' && requestData.request_id) {
        // Get request details for requester notification
        const { data: request } = await supabase
          .from('donation_requests')
          .select(`
            *,
            requester:users!donation_requests_requester_id_fkey(id, name)
          `)
          .eq('id', requestData.request_id)
          .single()

        if (request) {
          // Notify requester
          await this.createNotification({
            user_id: request.requester.id,
            type: 'volunteer_request',
            title: 'Volunteer Available',
            message: `${requestData.volunteer_name} is requesting to help with your request: ${request.title}. Please confirm if you would like this volunteer to assist.`,
            data: { 
              volunteer_id: requestData.volunteer_id,
              volunteer_name: requestData.volunteer_name,
              request_id: requestData.request_id,
              task_type: 'request',
              volunteer_request_id: volunteerRequest.id
            }
          })
        }
      }

      return volunteerRequest
    } catch (error) {
      console.error('Error creating volunteer request:', error)
      throw error
    }
  },

  async getVolunteerRequestStatus(volunteerId, taskId) {
    if (!supabase) {
      throw new Error('Supabase not configured. Please set up your environment variables.')
    }

    try {
      let query = supabase
        .from('volunteer_requests')
        .select('*')
        .eq('volunteer_id', volunteerId)

      // Check if it's a claim or request task
      if (taskId.startsWith('claim-')) {
        const claimId = taskId.replace('claim-', '')
        query = query.eq('claim_id', claimId)
      } else if (taskId.startsWith('request-')) {
        const requestId = taskId.replace('request-', '')
        query = query.eq('request_id', requestId)
      }

      const { data, error } = await query.single()
      
      if (error && error.code !== 'PGRST116') { // PGRST116 means no rows found
        throw error
      }

      return data
    } catch (error) {
      console.error('Error getting volunteer request status:', error)
      return null
    }
  },

  async updateVolunteerRequestStatus(requestId, status, volunteerId = null) {
    if (!supabase) {
      throw new Error('Supabase not configured. Please set up your environment variables.')
    }

    const updates = { 
      status,
      updated_at: new Date().toISOString()
    }

    if (volunteerId && status === 'approved') {
      updates.approved_by = volunteerId
    }

    const { data, error } = await supabase
      .from('volunteer_requests')
      .update(updates)
      .eq('id', requestId)
      .select()
      .single()

    if (error) throw error
    return data
  },

  // Post-delivery completion workflow
  async createDeliveryConfirmationRequest(deliveryId, volunteerId) {
    if (!supabase) {
      throw new Error('Supabase not configured. Please set up your environment variables.')
    }

    try {
      // Get delivery and claim details
      const { data: delivery, error: deliveryError } = await supabase
        .from('deliveries')
        .select(`
          *,
          claim:donation_claims(
            *,
            donation:donations(id, title, donor:users!donations_donor_id_fkey(id, name)),
            recipient:users!donation_claims_recipient_id_fkey(id, name)
          ),
          volunteer:users!deliveries_volunteer_id_fkey(id, name)
        `)
        .eq('id', deliveryId)
        .single()

      if (deliveryError) throw deliveryError

      if (!delivery) {
        throw new Error('Delivery not found')
      }

      console.log('📦 Delivery data retrieved:', {
        delivery_id: delivery.id,
        claim_id: delivery.claim.id,
        donation_id: delivery.claim.donation_id,
        donation_title: delivery.claim.donation?.title
      })

      // AUTOMATICALLY UPDATE DONATION STATUS TO COMPLETED when volunteer marks as delivered
      console.log('🔄 Updating donation claim to completed:', delivery.claim.id)
      
      // Update donation claim status to completed
      const { error: claimUpdateError } = await supabase
        .from('donation_claims')
        .update({ 
          status: 'completed',
          completed_at: new Date().toISOString()
        })
        .eq('id', delivery.claim.id)

      if (claimUpdateError) {
        console.error('❌ Error updating donation claim:', claimUpdateError)
        throw claimUpdateError
      }

      console.log('🔄 Updating donation to completed:', delivery.claim.donation_id || delivery.claim.donation?.id)
      
      // Update donation status to completed
      const donationId = delivery.claim.donation_id || delivery.claim.donation?.id
      
      if (!donationId) {
        console.error('❌ No donation ID found in delivery claim')
        throw new Error('Could not find donation ID to update')
      }
      
      const { error: donationUpdateError } = await supabase
        .from('donations')
        .update({ status: 'completed' })
        .eq('id', donationId)

      if (donationUpdateError) {
        console.error('❌ Error updating donation:', donationUpdateError)
        throw donationUpdateError
      }

      console.log('✅ Successfully updated donation and claim to completed status')

      // Create confirmation request notifications for both donor and recipient
      const confirmationMessage = `${delivery.volunteer.name} has reported the delivery as complete. Please confirm that you received/sent the items: "${delivery.claim.donation.title}". This helps us maintain trust in our community.`

      // Notify donor for confirmation
      if (delivery.claim.donation.donor?.id) {
        await this.createNotification({
          user_id: delivery.claim.donation.donor.id,
          type: 'delivery_completed',
          title: 'Please Confirm Delivery',
          message: confirmationMessage,
          data: { 
            delivery_id: deliveryId,
            volunteer_id: volunteerId,
            volunteer_name: delivery.volunteer.name,
            role: 'donor',
            action_required: 'confirm_delivery'
          }
        })
      }

      // Notify recipient for confirmation
      if (delivery.claim.recipient?.id) {
        await this.createNotification({
          user_id: delivery.claim.recipient.id,
          type: 'delivery_completed',
          title: 'Please Confirm Delivery',
          message: confirmationMessage,
          data: { 
            delivery_id: deliveryId,
            volunteer_id: volunteerId,
            volunteer_name: delivery.volunteer.name,
            role: 'recipient',
            action_required: 'confirm_delivery'
          }
        })
      }

      return { success: true, message: 'Delivery completed and confirmation requests sent to donor and recipient' }
    } catch (error) {
      console.error('Error creating delivery confirmation request:', error)
      throw error
    }
  },

  async confirmDeliveryByUser(deliveryId, userId, userRole, confirmed = true, rating = null, feedback = '') {
    if (!supabase) {
      throw new Error('Supabase not configured. Please set up your environment variables.')
    }

    try {
      // Get current delivery details
      const { data: delivery, error: deliveryError } = await supabase
        .from('deliveries')
        .select(`
          *,
          claim:donation_claims(
            *,
            donation:donations(title, donor_id),
            recipient_id
          )
        `)
        .eq('id', deliveryId)
        .single()

      if (deliveryError) throw deliveryError

      // Since delivery_confirmations table doesn't exist yet, we'll just mark the notification as read
      // and send completion notifications directly without storing confirmations
      
      // Send completion notification to the user who confirmed
      await this.createNotification({
        user_id: userId,
        type: 'delivery_completed',
        title: 'Delivery Confirmation Received',
        message: `Thank you for confirming the delivery${confirmed ? '' : ' dispute'}${rating ? ` and rating ${rating} stars` : ''}. ${confirmed ? 'Your feedback helps maintain trust in our community!' : 'We will investigate this matter.'}`,
        data: { 
          delivery_id: deliveryId,
          claim_id: delivery.claim.id,
          confirmed: confirmed,
          rating: rating,
          feedback: feedback,
          user_role: userRole
        }
      })

      // Send final completion notifications to all parties since transaction is already marked complete
      await this.createNotification({
        user_id: delivery.claim.donation.donor_id,
        type: 'delivery_completed',
        title: 'Transaction Confirmed!',
        message: `The ${userRole} has confirmed ${confirmed ? 'successful delivery' : 'an issue with delivery'} for your donation "${delivery.claim.donation.title}". Thank you for your generosity!`,
        data: { 
          delivery_id: deliveryId,
          claim_id: delivery.claim.id,
          transaction_completed: true,
          confirmed_by: userRole
        }
      })

      await this.createNotification({
        user_id: delivery.claim.recipient_id,
        type: 'delivery_completed',
        title: 'Transaction Confirmed!',
        message: `The ${userRole} has confirmed ${confirmed ? 'successful delivery' : 'an issue with delivery'} for "${delivery.claim.donation.title}". Thank you for being part of our community!`,
        data: { 
          delivery_id: deliveryId,
          claim_id: delivery.claim.id,
          transaction_completed: true,
          confirmed_by: userRole
        }
      })

      // Get volunteer ID from delivery and notify them
      const { data: deliveryData } = await supabase
        .from('deliveries')
        .select('volunteer_id')
        .eq('id', deliveryId)
        .single()

      if (deliveryData?.volunteer_id) {
        await this.createNotification({
          user_id: deliveryData.volunteer_id,
          type: 'delivery_completed',
          title: 'Delivery Confirmation Received!',
          message: `The ${userRole} has confirmed ${confirmed ? 'successful delivery' : 'an issue with delivery'} for "${delivery.claim.donation.title}". Thank you for your volunteer service!`,
          data: { 
            delivery_id: deliveryId,
            claim_id: delivery.claim.id,
            transaction_completed: true,
            confirmed_by: userRole
          }
        })
      }

      // Mark confirmation request notifications as read
      // Get unread notifications for this user and type, then filter in JavaScript
      const { data: unreadNotifications } = await supabase
        .from('notifications')
        .select('id, data')
        .eq('user_id', userId)
        .eq('type', 'delivery_completed')
        .is('read_at', null)

      // Filter by delivery_id and action_required in JavaScript since JSON path queries can be problematic
      const targetNotifications = unreadNotifications?.filter(n => 
        n.data?.delivery_id === deliveryId && 
        n.data?.action_required === 'confirm_delivery'
      ) || []

      if (targetNotifications.length > 0) {
        await supabase
          .from('notifications')
          .update({ read_at: new Date().toISOString() })
          .in('id', targetNotifications.map(n => n.id))
      }

      return { 
        confirmation: {
          delivery_id: deliveryId,
          user_id: userId,
          user_role: userRole,
          confirmed: confirmed,
          rating: rating,
          feedback: feedback
        }, 
        transactionCompleted: true, // Since transaction is already marked complete
        message: confirmed ? 'Delivery confirmed successfully' : 'Delivery issue reported successfully'
      }
    } catch (error) {
      console.error('Error confirming delivery:', error)
      throw error
    }
  },

  async completeTransaction(deliveryId, delivery) {
    if (!supabase) {
      throw new Error('Supabase not configured. Please set up your environment variables.')
    }

    try {
      // Update donation claim status to completed
      await supabase
        .from('donation_claims')
        .update({ 
          status: 'completed',
          completed_at: new Date().toISOString()
        })
        .eq('id', delivery.claim.id)

      // Update donation status to completed
      await supabase
        .from('donations')
        .update({ status: 'completed' })
        .eq('id', delivery.claim.donation_id)

      // Send completion notifications
      await this.createNotification({
        user_id: delivery.claim.donation.donor_id,
        type: 'delivery_completed',
        title: 'Transaction Completed!',
        message: `Your donation "${delivery.claim.donation.title}" has been successfully delivered and confirmed by all parties. Thank you for your generosity!`,
        data: { 
          delivery_id: deliveryId,
          claim_id: delivery.claim.id,
          transaction_completed: true
        }
      })

      await this.createNotification({
        user_id: delivery.claim.recipient_id,
        type: 'delivery_completed',
        title: 'Transaction Completed!',
        message: `You have successfully received "${delivery.claim.donation.title}". Thank you for being part of our community!`,
        data: { 
          delivery_id: deliveryId,
          claim_id: delivery.claim.id,
          transaction_completed: true
        }
      })

      await this.createNotification({
        user_id: delivery.volunteer_id,
        type: 'delivery_completed',
        title: 'Delivery Completed Successfully!',
        message: `Thank you for completing the delivery of "${delivery.claim.donation.title}". Both parties have confirmed the successful delivery. You're making a real difference in our community!`,
        data: { 
          delivery_id: deliveryId,
          claim_id: delivery.claim.id,
          transaction_completed: true
        }
      })

      return { success: true, message: 'Transaction completed successfully' }
    } catch (error) {
      console.error('Error completing transaction:', error)
      throw error
    }
  },

  async getDeliveryConfirmations(deliveryId) {
    if (!supabase) {
      throw new Error('Supabase not configured. Please set up your environment variables.')
    }

    // Since delivery_confirmations table doesn't exist yet, return empty array
    // In future, this will query the actual confirmations table
    return []
  },

  // Admin-specific functions
  async getVolunteers(filters = {}) {
    if (!supabase) {
      throw new Error('Supabase not configured. Please set up your environment variables.')
    }

    let query = supabase
      .from('users')
      .select('*')
      .eq('role', 'volunteer')
      .order('created_at', { ascending: false })

    if (filters.status) {
      query = query.eq('is_active', filters.status === 'active')
    }

    const { data, error } = await query
    if (error) throw error
    return data
  },

  async getAllUsers() {
    if (!supabase) {
      throw new Error('Supabase not configured. Please set up your environment variables.')
    }

    const { data, error } = await supabase
      .from('users')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) throw error
    return data
  },
}

// Export the client
export { supabase } 