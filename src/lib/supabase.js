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

    // Apply limit first for better performance
    const limit = filters.limit || 1000 // Default reasonable limit

    let query = supabase
      .from('donations')
      .select(`
        *,
        donor:users!donations_donor_id_fkey(name, email, profile_image_url)
      `)
      .order('created_at', { ascending: false })
      .limit(limit)

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

    // Apply limit first for better performance
    const limit = filters.limit || 1000 // Default reasonable limit

    let query = supabase
      .from('donation_requests')
      .select(`
        *,
        requester:users!donation_requests_requester_id_fkey(name, email, profile_image_url)
      `)
      .order('created_at', { ascending: false })
      .limit(limit)

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
      .select('status, quantity, delivery_mode, donor_id, pickup_location, pickup_instructions')
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

    // Handle different delivery modes
    if (donation.delivery_mode === 'volunteer') {
      // Create delivery record for volunteer assignments
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
      }
    } else if (donation.delivery_mode === 'pickup') {
      // Create a pickup record for self-pickup tracking
      const { error: pickupError } = await supabase
        .from('pickups')
        .insert({
          claim_id: claim.id,
          pickup_location: donation.pickup_location,
          pickup_instructions: donation.pickup_instructions,
          status: 'scheduled' // Initial status for self-pickup
        })

      if (pickupError) {
        console.error('Error creating pickup record:', pickupError)
        // Don't throw error here as the claim was successful
      }

      // Notify donor about the pickup arrangement
      await this.createNotification({
        user_id: donation.donor_id,
        type: 'pickup_scheduled',
        title: 'Pickup Scheduled',
        message: `A recipient has claimed your donation and will arrange pickup. Please coordinate the pickup time and location.`,
        data: {
          claim_id: claim.id,
          donation_id: donationId,
          pickup_location: donation.pickup_location
        }
      })

      // Notify recipient with pickup instructions  
      await this.createNotification({
        user_id: recipientId,
        type: 'pickup_instructions',
        title: 'Pickup Instructions',
        message: `Your donation claim has been approved! Please coordinate with the donor to arrange pickup.`,
        data: {
          claim_id: claim.id,
          donation_id: donationId,
          pickup_location: donation.pickup_location,
          pickup_instructions: donation.pickup_instructions,
          donor_id: donation.donor_id
        }
      })
    } else if (donation.delivery_mode === 'direct') {
      // Create a direct delivery record for donor-to-recipient coordination
      const { error: directDeliveryError } = await supabase
        .from('direct_deliveries')
        .insert({
          claim_id: claim.id,
          delivery_address: 'TBD', // Will be filled during coordination
          delivery_instructions: '',
          status: 'coordination_needed' // Initial status for direct delivery
        })

      if (directDeliveryError) {
        console.error('Error creating direct delivery record:', directDeliveryError)
        // Don't throw error here as the claim was successful
      }

      // Notify donor about the direct delivery request
      await this.createNotification({
        user_id: donation.donor_id,
        type: 'direct_delivery_request',
        title: 'Direct Delivery Requested',
        message: `A recipient has claimed your donation and requested direct delivery. Please coordinate the delivery details.`,
        data: {
          claim_id: claim.id,
          donation_id: donationId,
          recipient_id: recipientId
        }
      })

      // Notify recipient about coordination needed
      await this.createNotification({
        user_id: recipientId,
        type: 'direct_delivery_coordination',
        title: 'Delivery Coordination Needed',
        message: `Your direct delivery request has been approved! Please coordinate with the donor to arrange delivery details.`,
        data: {
          claim_id: claim.id,
          donation_id: donationId,
          donor_id: donation.donor_id
        }
      })
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

    // Apply limit first for better performance
    const limit = filters.limit || 500 // Default reasonable limit

    let query = supabase
      .from('deliveries')
      .select(`
        *,
        volunteer:users!deliveries_volunteer_id_fkey(id, name, email, phone_number),
        claim:donation_claims(
          *,
          donation:donations(title, description, category),
          recipient:users!donation_claims_recipient_id_fkey(id, name, phone_number)
        )
      `)
      .order('created_at', { ascending: false })
      .limit(limit)

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

      // AUTOMATICALLY UPDATE DONATION STATUS TO DELIVERED when volunteer marks as delivered
      console.log('🔄 Updating donation claim to delivered:', delivery.claim.id)
      
      // Update donation claim status to delivered (not completed yet)
      const { error: claimUpdateError } = await supabase
        .from('donation_claims')
        .update({ 
          status: 'delivered'
        })
        .eq('id', delivery.claim.id)

      if (claimUpdateError) {
        console.error('❌ Error updating donation claim:', claimUpdateError)
        throw claimUpdateError
      }

      console.log('🔄 Updating donation to delivered:', delivery.claim.donation_id || delivery.claim.donation?.id)
      
      // Update donation status to delivered
      const donationId = delivery.claim.donation_id || delivery.claim.donation?.id
      
      if (!donationId) {
        console.error('❌ No donation ID found in delivery claim')
        throw new Error('Could not find donation ID to update')
      }
      
      const { error: donationUpdateError } = await supabase
        .from('donations')
        .update({ status: 'delivered' })
        .eq('id', donationId)

      if (donationUpdateError) {
        console.error('❌ Error updating donation:', donationUpdateError)
        throw donationUpdateError
      }

      console.log('✅ Successfully updated donation claim and donation to delivered status')

      // Create confirmation request notifications for both donor and recipient
      const confirmationMessage = `${delivery.volunteer.name} has delivered the items: "${delivery.claim.donation.title}". Please confirm receipt/delivery to complete the transaction.`

      // Notify donor for confirmation
      if (delivery.claim.donation.donor?.id) {
        await this.createNotification({
          user_id: delivery.claim.donation.donor.id,
          type: 'delivery_completed',
          title: 'Delivery Reported - Please Confirm',
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
          title: 'Delivery Reported - Please Confirm Receipt',
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

      return { success: true, message: 'Delivery reported. Awaiting confirmations from donor and recipient to complete transaction.' }
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

  // New function for recipient to confirm receipt
  async confirmReceipt(deliveryId, recipientId, confirmed = true, rating = null, feedback = '') {
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

      // Send notification to recipient confirming their action
      await this.createNotification({
        user_id: recipientId,
        type: 'delivery_completed',
        title: 'Receipt Confirmed',
        message: `Thank you for confirming receipt of "${delivery.claim.donation.title}". Waiting for donor confirmation to complete the transaction.`,
        data: { 
          delivery_id: deliveryId,
          claim_id: delivery.claim.id,
          confirmed: confirmed,
          rating: rating,
          feedback: feedback,
          user_role: 'recipient',
          recipient_confirmed: true
        }
      })

      // Notify donor that recipient has confirmed and ask for final confirmation
      await this.createNotification({
        user_id: delivery.claim.donation.donor_id,
        type: 'delivery_completed',
        title: 'Recipient Confirmed Receipt - Please Complete',
        message: `The recipient has confirmed receiving "${delivery.claim.donation.title}". Please mark this donation as complete to finalize the transaction.`,
        data: { 
          delivery_id: deliveryId,
          claim_id: delivery.claim.id,
          recipient_confirmed: true,
          action_required: 'donor_final_confirmation'
        }
      })

      // Mark recipient confirmation notifications as read
      const { data: unreadNotifications } = await supabase
        .from('notifications')
        .select('id, data')
        .eq('user_id', recipientId)
        .eq('type', 'delivery_completed')
        .is('read_at', null)

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
        success: true,
        message: 'Receipt confirmed successfully. Awaiting donor confirmation to complete transaction.'
      }
    } catch (error) {
      console.error('Error confirming receipt:', error)
      throw error
    }
  },

  // New function for donor to confirm and complete transaction
  async confirmDonorDelivery(deliveryId, donorId, confirmed = true, rating = null, feedback = '') {
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

      // Update the claim to complete transaction
      const { error: updateError } = await supabase
        .from('donation_claims')
        .update({
          status: 'completed'
        })
        .eq('id', delivery.claim.id)

      if (updateError) throw updateError

      // Update donation status to completed
      const { error: donationUpdateError } = await supabase
        .from('donations')
        .update({ status: 'completed' })
        .eq('id', delivery.claim.donation.id)

      if (donationUpdateError) throw donationUpdateError

      // Send completion notifications to all parties
      await this.createNotification({
        user_id: donorId,
        type: 'delivery_completed',
        title: 'Transaction Completed!',
        message: `Thank you for confirming the delivery of "${delivery.claim.donation.title}". The transaction is now complete!`,
        data: { 
          delivery_id: deliveryId,
          claim_id: delivery.claim.id,
          transaction_completed: true,
          confirmed_by: 'donor',
          donor_confirmed: true,
          rating: rating,
          feedback: feedback
        }
      })

      await this.createNotification({
        user_id: delivery.claim.recipient_id,
        type: 'delivery_completed',
        title: 'Transaction Completed!',
        message: `The donation transaction for "${delivery.claim.donation.title}" is now complete. Thank you for being part of our community!`,
        data: { 
          delivery_id: deliveryId,
          claim_id: delivery.claim.id,
          transaction_completed: true,
          confirmed_by: 'donor'
        }
      })

      // Get volunteer ID and notify them
      const { data: deliveryData } = await supabase
        .from('deliveries')
        .select('volunteer_id')
        .eq('id', deliveryId)
        .single()

      if (deliveryData?.volunteer_id) {
        await this.createNotification({
          user_id: deliveryData.volunteer_id,
          type: 'delivery_completed',
          title: 'Transaction Completed!',
          message: `The delivery for "${delivery.claim.donation.title}" has been completed and confirmed by all parties. Thank you for your volunteer service!`,
          data: { 
            delivery_id: deliveryId,
            claim_id: delivery.claim.id,
            transaction_completed: true,
            confirmed_by: 'donor'
          }
        })
      }

      // Mark donor confirmation notifications as read
      const { data: unreadNotifications } = await supabase
        .from('notifications')
        .select('id, data')
        .eq('user_id', donorId)
        .eq('type', 'delivery_completed')
        .is('read_at', null)

      const targetNotifications = unreadNotifications?.filter(n => 
        n.data?.delivery_id === deliveryId && 
        (n.data?.action_required === 'confirm_delivery' || n.data?.action_required === 'donor_confirm_delivery')
      ) || []

      if (targetNotifications.length > 0) {
        await supabase
          .from('notifications')
          .update({ read_at: new Date().toISOString() })
          .in('id', targetNotifications.map(n => n.id))
      }

      return { 
        success: true,
        message: 'Transaction completed successfully!'
      }
    } catch (error) {
      console.error('Error confirming donor delivery:', error)
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
          status: 'completed'
        })
        .eq('id', delivery.claim.id)

              // Update donation status to delivered  
        await supabase
        .from('donations')
        .update({ status: 'delivered' })
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

    // Apply limit first for better performance
    const limit = filters.limit || 500 // Default reasonable limit

    let query = supabase
      .from('users')
      .select('id, name, email, phone_number, city, province, role, is_active, is_verified, created_at, volunteer_rating, total_deliveries, completed_deliveries')
      .eq('role', 'volunteer')
      .order('created_at', { ascending: false })
      .limit(limit)

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

  // New function to handle pickup status updates
  async updatePickupStatus(claimId, userId, status, notes = '') {
    if (!supabase) {
      throw new Error('Supabase not configured. Please set up your environment variables.')
    }

    try {
      // Get pickup and claim details
      const { data: pickup, error: pickupError } = await supabase
        .from('pickups')
        .select(`
          *,
          claim:donation_claims(
            *,
            donation:donations(title, donor_id),
            recipient_id,
            donor:users!donation_claims_donor_id_fkey(id, name),
            recipient:users!donation_claims_recipient_id_fkey(id, name)
          )
        `)
        .eq('claim_id', claimId)
        .single()

      if (pickupError) throw pickupError

      // Update pickup status
      const { error: updateError } = await supabase
        .from('pickups')
        .update({
          status: status,
          notes: notes,
          updated_at: new Date().toISOString(),
          ...(status === 'completed' && { completed_at: new Date().toISOString() })
        })
        .eq('claim_id', claimId)

      if (updateError) throw updateError

      // Handle status-specific logic
      let notificationTitle, notificationMessage

      switch (status) {
        case 'confirmed':
          notificationTitle = 'Pickup Confirmed'
          notificationMessage = `Pickup has been confirmed. The recipient will collect the items soon.`
          break
        case 'completed':
          notificationTitle = 'Pickup Completed'
          notificationMessage = `The donation "${pickup.claim.donation.title}" has been successfully picked up!`
          
          // Update donation claim status to delivered
          await supabase
            .from('donation_claims')
            .update({ status: 'delivered' })
            .eq('id', pickup.claim.id)

          // Update donation status to delivered
          await supabase
            .from('donations')
            .update({ status: 'delivered' })
            .eq('id', pickup.claim.donation.id)

          // Create completion confirmation requests for both parties
          await this.createPickupCompletionRequest(claimId, userId)
          return { success: true, message: 'Pickup completed successfully!' }
          
        case 'cancelled':
          notificationTitle = 'Pickup Cancelled'
          notificationMessage = `The pickup for "${pickup.claim.donation.title}" has been cancelled.`
          
          // Reset donation and claim status back to available
          await supabase
            .from('donation_claims')
            .update({ status: 'cancelled' })
            .eq('id', pickup.claim.id)

          await supabase
            .from('donations')
            .update({ status: 'available' })
            .eq('id', pickup.claim.donation.id)
          break
          
        default:
          notificationTitle = 'Pickup Status Updated'
          notificationMessage = `Pickup status updated to: ${status.replace('_', ' ')}`
      }

      // Send notifications to both parties (except for completion, which is handled separately)
      if (status !== 'completed') {
        // Notify donor
        await this.createNotification({
          user_id: pickup.claim.donation.donor_id,
          type: 'pickup_update',
          title: notificationTitle,
          message: notificationMessage,
          data: { claim_id: claimId, status: status, notes: notes }
        })

        // Notify recipient
        await this.createNotification({
          user_id: pickup.claim.recipient_id,
          type: 'pickup_update',
          title: notificationTitle,
          message: notificationMessage,
          data: { claim_id: claimId, status: status, notes: notes }
        })
      }

      return { success: true, message: `Pickup status updated to ${status}` }
      
    } catch (error) {
      console.error('Error updating pickup status:', error)
      throw error
    }
  },

  // New function to create pickup completion confirmation requests
  async createPickupCompletionRequest(claimId, completedByUserId) {
    if (!supabase) {
      throw new Error('Supabase not configured. Please set up your environment variables.')
    }

    try {
      // Get full pickup details with user information
      const { data: pickup, error: pickupError } = await supabase
        .from('pickups')
        .select(`
          *,
          claim:donation_claims(
            *,
            donation:donations(
              *,
              donor:users!donations_donor_id_fkey(id, name)
            ),
            recipient:users!donation_claims_recipient_id_fkey(id, name)
          )
        `)
        .eq('claim_id', claimId)
        .single()

      if (pickupError) throw pickupError

      // Determine who completed the pickup
      const isCompletedByDonor = completedByUserId === pickup.claim.donation.donor_id
      const isCompletedByRecipient = completedByUserId === pickup.claim.recipient_id
      
      const completedByName = isCompletedByDonor 
        ? pickup.claim.donation.donor.name 
        : isCompletedByRecipient 
          ? pickup.claim.recipient.name 
          : 'Someone'

      const confirmationMessage = `${completedByName} has marked the pickup as completed for "${pickup.claim.donation.title}". Please confirm to finalize the transaction.`

      // Notify donor for confirmation (if not the one who completed it)
      if (!isCompletedByDonor) {
        await this.createNotification({
          user_id: pickup.claim.donation.donor_id,
          type: 'pickup_completed',
          title: 'Pickup Completed - Please Confirm',
          message: confirmationMessage,
          data: { 
            claim_id: claimId,
            completed_by: completedByUserId,
            completed_by_name: completedByName,
            role: 'donor',
            action_required: 'confirm_pickup',
            pickup_id: pickup.id
          }
        })
      }

      // Notify recipient for confirmation (if not the one who completed it)
      if (!isCompletedByRecipient) {
        await this.createNotification({
          user_id: pickup.claim.recipient_id,
          type: 'pickup_completed',
          title: 'Pickup Completed - Please Confirm',
          message: confirmationMessage,
          data: { 
            claim_id: claimId,
            completed_by: completedByUserId,
            completed_by_name: completedByName,
            role: 'recipient',
            action_required: 'confirm_pickup',
            pickup_id: pickup.id
          }
        })
      }

    } catch (error) {
      console.error('Error creating pickup completion request:', error)
      throw error
    }
  },

  // New function to confirm pickup completion
  async confirmPickupCompletion(claimId, userId, confirmed = true, rating = null, feedback = '') {
    if (!supabase) {
      throw new Error('Supabase not configured. Please set up your environment variables.')
    }

    try {
      // Get pickup and claim details
      const { data: pickup, error: pickupError } = await supabase
        .from('pickups')
        .select(`
          *,
          claim:donation_claims(
            *,
            donation:donations(title, donor_id),
            recipient_id
          )
        `)
        .eq('claim_id', claimId)
        .single()

      if (pickupError) throw pickupError

      if (confirmed) {
        // Update claim status to completed
        await supabase
          .from('donation_claims')
          .update({ status: 'completed' })
          .eq('id', pickup.claim.id)

        // Update donation status to completed
        await supabase
          .from('donations')
          .update({ status: 'completed' })
          .eq('id', pickup.claim.donation.id)

        // Send completion notifications to both parties
        await this.createNotification({
          user_id: pickup.claim.donation.donor_id,
          type: 'pickup_completed',
          title: 'Transaction Completed!',
          message: `The pickup for "${pickup.claim.donation.title}" has been completed and confirmed by all parties. Thank you for your generosity!`,
          data: { 
            claim_id: claimId,
            transaction_completed: true,
            confirmed_by: userId,
            rating: rating,
            feedback: feedback
          }
        })

        await this.createNotification({
          user_id: pickup.claim.recipient_id,
          type: 'pickup_completed',
          title: 'Transaction Completed!',
          message: `You have successfully received "${pickup.claim.donation.title}". Thank you for being part of our community!`,
          data: { 
            claim_id: claimId,
            transaction_completed: true,
            confirmed_by: userId
          }
        })
      }

      // Mark confirmation notifications as read
      const { data: unreadNotifications } = await supabase
        .from('notifications')
        .select('id, data')
        .eq('user_id', userId)
        .eq('type', 'pickup_completed')
        .is('read_at', null)

      const targetNotifications = unreadNotifications?.filter(n => 
        n.data?.claim_id === claimId && 
        n.data?.action_required === 'confirm_pickup'
      ) || []

      if (targetNotifications.length > 0) {
        await supabase
          .from('notifications')
          .update({ read_at: new Date().toISOString() })
          .in('id', targetNotifications.map(n => n.id))
      }

      return { 
        success: true, 
        message: confirmed 
          ? 'Pickup confirmed successfully. Transaction completed!' 
          : 'Pickup completion disputed.'
      }
      
    } catch (error) {
      console.error('Error confirming pickup completion:', error)
      throw error
    }
  },

  // Direct Delivery Management Functions
  async updateDirectDeliveryStatus(claimId, userId, status, deliveryAddress = '', instructions = '', notes = '') {
    if (!supabase) {
      throw new Error('Supabase not configured. Please set up your environment variables.')
    }

    try {
      // Get direct delivery details with claim information
      const { data: directDelivery, error: directDeliveryError } = await supabase
        .from('direct_deliveries')
        .select(`
          *,
          claim:donation_claims(
            *,
            donation:donations(id, title, donor_id),
            recipient:users!donation_claims_recipient_id_fkey(id, name)
          )
        `)
        .eq('claim_id', claimId)
        .single()

      if (directDeliveryError) throw directDeliveryError

      // Update the direct delivery record
      const updateData = { 
        status,
        updated_at: new Date().toISOString()
      }

      if (deliveryAddress) updateData.delivery_address = deliveryAddress
      if (instructions) updateData.delivery_instructions = instructions
      if (notes) updateData.notes = notes

      const { error: updateError } = await supabase
        .from('direct_deliveries')
        .update(updateData)
        .eq('claim_id', claimId)

      if (updateError) throw updateError

      // Handle status-specific logic and notifications
      let notificationTitle, notificationMessage

      switch (status) {
        case 'scheduled':
          notificationTitle = 'Direct Delivery Scheduled'
          notificationMessage = `Direct delivery has been scheduled for "${directDelivery.claim.donation.title}". Delivery details have been confirmed.`
          break
        case 'out_for_delivery':
          notificationTitle = 'Out for Delivery'
          notificationMessage = `The donor is on their way to deliver "${directDelivery.claim.donation.title}"!`
          break
        case 'delivered':
          notificationTitle = 'Direct Delivery Completed'
          notificationMessage = `The donation "${directDelivery.claim.donation.title}" has been delivered!`
          
          // Update donation claim status to delivered
          await supabase
            .from('donation_claims')
            .update({ status: 'delivered' })
            .eq('id', directDelivery.claim.id)

          // Update donation status to delivered
          await supabase
            .from('donations')
            .update({ status: 'delivered' })
            .eq('id', directDelivery.claim.donation.id)

          // Create completion confirmation requests for both parties
          await this.createDirectDeliveryCompletionRequest(claimId, userId)
          return { success: true, message: 'Direct delivery completed successfully!' }
          
        case 'cancelled':
          notificationTitle = 'Direct Delivery Cancelled'
          notificationMessage = `The direct delivery for "${directDelivery.claim.donation.title}" has been cancelled.`
          
          // Reset donation and claim status back to available
          await supabase
            .from('donation_claims')
            .update({ status: 'cancelled' })
            .eq('id', directDelivery.claim.id)

          await supabase
            .from('donations')
            .update({ status: 'available' })
            .eq('id', directDelivery.claim.donation.id)
          break
          
        default:
          notificationTitle = 'Direct Delivery Updated'
          notificationMessage = `Direct delivery status updated to: ${status.replace('_', ' ')}`
      }

      // Send notifications to both parties (except for delivered status which is handled above)
      if (status !== 'delivered') {
        // Notify recipient
        await this.createNotification({
          user_id: directDelivery.claim.recipient.id,
          type: 'direct_delivery_update',
          title: notificationTitle,
          message: notificationMessage,
          data: {
            claim_id: claimId,
            status: status,
            delivery_address: deliveryAddress,
            instructions: instructions
          }
        })

        // Notify donor
        await this.createNotification({
          user_id: directDelivery.claim.donation.donor_id,
          type: 'direct_delivery_update',
          title: notificationTitle,
          message: notificationMessage,
          data: {
            claim_id: claimId,
            status: status,
            delivery_address: deliveryAddress,
            instructions: instructions
          }
        })
      }

      return { success: true, message: 'Direct delivery status updated successfully!' }
    } catch (error) {
      console.error('Error updating direct delivery status:', error)
      throw error
    }
  },

  async createDirectDeliveryCompletionRequest(claimId, userId) {
    if (!supabase) {
      throw new Error('Supabase not configured. Please set up your environment variables.')
    }

    try {
      // Get direct delivery details
      const { data: directDelivery, error: directDeliveryError } = await supabase
        .from('direct_deliveries')
        .select(`
          *,
          claim:donation_claims(
            *,
            donation:donations(id, title, donor_id),
            recipient:users!donation_claims_recipient_id_fkey(id, name)
          )
        `)
        .eq('claim_id', claimId)
        .single()

      if (directDeliveryError) throw directDeliveryError

      // Create completion confirmation request for recipient
      await this.createNotification({
        user_id: directDelivery.claim.recipient.id,
        type: 'direct_delivery_completed',
        title: 'Direct Delivery Completed - Please Confirm',
        message: `The donor has marked "${directDelivery.claim.donation.title}" as delivered. Please confirm receipt to complete the transaction.`,
        data: {
          claim_id: claimId,
          donor_id: directDelivery.claim.donation.donor_id,
          role: 'recipient',
          action_required: 'confirm_direct_delivery'
        }
      })

      // Create completion confirmation request for donor
      await this.createNotification({
        user_id: directDelivery.claim.donation.donor_id,
        type: 'direct_delivery_completed',
        title: 'Direct Delivery Completed - Please Confirm',
        message: `You have marked "${directDelivery.claim.donation.title}" as delivered. Please confirm delivery completion.`,
        data: {
          claim_id: claimId,
          recipient_id: directDelivery.claim.recipient.id,
          role: 'donor',
          action_required: 'confirm_direct_delivery'
        }
      })

      return { success: true }
    } catch (error) {
      console.error('Error creating direct delivery completion request:', error)
      throw error
    }
  },

  async confirmDirectDeliveryCompletion(claimId, userId, confirmed = true, rating = null, feedback = '') {
    if (!supabase) {
      throw new Error('Supabase not configured. Please set up your environment variables.')
    }

    try {
      // Get direct delivery details
      const { data: directDelivery, error: directDeliveryError } = await supabase
        .from('direct_deliveries')
        .select(`
          *,
          claim:donation_claims(
            *,
            donation:donations(id, title, donor_id),
            recipient:users!donation_claims_recipient_id_fkey(id, name)
          )
        `)
        .eq('claim_id', claimId)
        .single()

      if (directDeliveryError) throw directDeliveryError

      const isDonor = userId === directDelivery.claim.donation.donor_id
      const isRecipient = userId === directDelivery.claim.recipient.id

      // Check if both parties have already confirmed
      const { data: existingNotifications } = await supabase
        .from('notifications')
        .select('data')
        .eq('type', 'direct_delivery_completed')
        .eq('data->claim_id', claimId)
        .eq('read_at', null)

      const donorConfirmed = existingNotifications?.some(n => 
        n.data?.role === 'donor' && n.data?.confirmed === true
      ) || false

      const recipientConfirmed = existingNotifications?.some(n => 
        n.data?.role === 'recipient' && n.data?.confirmed === true
      ) || false

      // Update confirmation status
      const userRole = isDonor ? 'donor' : 'recipient'
      const bothConfirmed = (isDonor && recipientConfirmed) || (isRecipient && donorConfirmed)

      if (bothConfirmed) {
        // Both parties have confirmed - complete the transaction
        await supabase
          .from('donation_claims')
          .update({ status: 'completed' })
          .eq('id', directDelivery.claim.id)

        await supabase
          .from('donations')
          .update({ status: 'completed' })
          .eq('id', directDelivery.claim.donation.id)

        // Send completion notifications to both parties
        await this.createNotification({
          user_id: directDelivery.claim.donation.donor_id,
          type: 'direct_delivery_completed',
          title: 'Direct Delivery Transaction Completed!',
          message: `The direct delivery transaction for "${directDelivery.claim.donation.title}" is now complete. Thank you for your generosity!`,
          data: {
            claim_id: claimId,
            transaction_completed: true,
            confirmed_by: userRole,
            rating: rating,
            feedback: feedback
          }
        })

        await this.createNotification({
          user_id: directDelivery.claim.recipient.id,
          type: 'direct_delivery_completed',
          title: 'Direct Delivery Transaction Completed!',
          message: `The direct delivery transaction for "${directDelivery.claim.donation.title}" is now complete. Thank you for being part of our community!`,
          data: {
            claim_id: claimId,
            transaction_completed: true,
            confirmed_by: userRole
          }
        })
      } else {
        // First confirmation - notify the other party
        const otherPartyId = isDonor ? directDelivery.claim.recipient.id : directDelivery.claim.donation.donor_id
        const otherPartyRole = isDonor ? 'recipient' : 'donor'

        await this.createNotification({
          user_id: userId,
          type: 'direct_delivery_completed',
          title: 'Direct Delivery Confirmed',
          message: `Thank you for confirming ${isDonor ? 'delivery completion' : 'receipt'} of "${directDelivery.claim.donation.title}". Waiting for the ${otherPartyRole} to confirm.`,
          data: {
            claim_id: claimId,
            confirmed: confirmed,
            rating: rating,
            feedback: feedback,
            user_role: userRole,
            [`${userRole}_confirmed`]: true
          }
        })

        await this.createNotification({
          user_id: otherPartyId,
          type: 'direct_delivery_completed',
          title: `${userRole === 'donor' ? 'Donor' : 'Recipient'} Confirmed - Please Complete`,
          message: `The ${userRole} has confirmed the direct delivery of "${directDelivery.claim.donation.title}". Please confirm to complete the transaction.`,
          data: {
            claim_id: claimId,
            [`${userRole}_confirmed`]: true,
            action_required: 'confirm_direct_delivery'
          }
        })
      }

      // Mark related notifications as read
      await supabase
        .from('notifications')
        .update({ read_at: new Date().toISOString() })
        .eq('user_id', userId)
        .eq('type', 'direct_delivery_completed')
        .eq('data->claim_id', claimId)
        .eq('data->action_required', 'confirm_direct_delivery')

      return { 
        success: true, 
        message: bothConfirmed ? 'Transaction completed successfully!' : 'Your confirmation has been recorded. Waiting for the other party to confirm.'
      }
    } catch (error) {
      console.error('Error confirming direct delivery completion:', error)
      throw error
    }
  },

  // Location Tracking
  async updateDeliveryLocation(deliveryId, location, volunteerId) {
    if (!supabase) {
      throw new Error('Supabase not configured')
    }

    try {
      const { data, error } = await supabase
        .from('deliveries')
        .update({
          volunteer_location: location,
          location_updated_at: new Date().toISOString()
        })
        .eq('id', deliveryId)
        .eq('volunteer_id', volunteerId)
        .select()

      if (error) throw error
      return data?.[0]
    } catch (error) {
      console.error('Error updating delivery location:', error)
      throw error
    }
  },

  async getDeliveryLocationHistory(deliveryId) {
    if (!supabase) {
      throw new Error('Supabase not configured')
    }

    try {
      const { data, error } = await supabase
        .from('delivery_location_history')
        .select('*')
        .eq('delivery_id', deliveryId)
        .order('created_at', { ascending: false })

      if (error) throw error
      return data || []
    } catch (error) {
      console.error('Error getting delivery location history:', error)
      throw error
    }
  },

  async logDeliveryLocation(deliveryId, location, volunteerId) {
    if (!supabase) {
      throw new Error('Supabase not configured')
    }

    try {
      const { data, error } = await supabase
        .from('delivery_location_history')
        .insert({
          delivery_id: deliveryId,
          volunteer_id: volunteerId,
          location: location,
          created_at: new Date().toISOString()
        })
        .select()

      if (error) throw error
      return data?.[0]
    } catch (error) {
      console.error('Error logging delivery location:', error)
      throw error
    }
  },

  async getVolunteerDeliveriesWithLocation(volunteerId, status = null) {
    if (!supabase) {
      throw new Error('Supabase not configured')
    }

    try {
      let query = supabase
        .from('deliveries')
        .select(`
          *,
          donation:donation_id(*),
          recipient:recipient_id(*),
          donor:donor_id(*)
        `)
        .eq('volunteer_id', volunteerId)

      if (status) {
        if (Array.isArray(status)) {
          query = query.in('status', status)
        } else {
          query = query.eq('status', status)
        }
      }

      const { data, error } = await query.order('created_at', { ascending: false })

      if (error) throw error
      return data || []
    } catch (error) {
      console.error('Error getting volunteer deliveries with location:', error)
      throw error
    }
  },

  async updateDeliveryStatus(deliveryId, status, volunteerId, additionalData = {}) {
    if (!supabase) {
      throw new Error('Supabase not configured')
    }

    try {
      const updateData = {
        status,
        updated_at: new Date().toISOString(),
        ...additionalData
      }

      // Add timestamp based on status
      switch (status) {
        case 'in_transit':
          updateData.started_at = new Date().toISOString()
          break
        case 'arrived':
          updateData.arrived_at = new Date().toISOString()
          break
        case 'completed':
          updateData.completed_at = new Date().toISOString()
          break
      }

      const { data, error } = await supabase
        .from('deliveries')
        .update(updateData)
        .eq('id', deliveryId)
        .eq('volunteer_id', volunteerId)
        .select()

      if (error) throw error
      return data?.[0]
    } catch (error) {
      console.error('Error updating delivery status:', error)
      throw error
    }
  },

  // Intelligent Matching Functions
  async findMatchesForRequest(requestId, maxResults = 10) {
    if (!supabase) {
      throw new Error('Supabase not configured. Please set up your environment variables.')
    }

    try {
      // Import matching algorithm
      const { intelligentMatcher } = await import('./matchingAlgorithm.js')
      
      // Get the specific request
      const { data: request, error: requestError } = await supabase
        .from('donation_requests')
        .select(`
          *,
          requester:users!donation_requests_requester_id_fkey(*)
        `)
        .eq('id', requestId)
        .single()

      if (requestError) throw requestError

      // Get available donations
      const availableDonations = await this.getAvailableDonations()

      // Find matches using the intelligent algorithm
      const matches = await intelligentMatcher.matchDonorsToRequest(request, availableDonations, maxResults)

      return {
        request,
        matches,
        totalMatches: matches.length,
        algorithm: 'Weighted Sum Model (WSM)',
        criteria: ['geographic_proximity', 'item_compatibility', 'urgency_alignment', 'user_reliability', 'delivery_compatibility']
      }
    } catch (error) {
      console.error('Error finding matches for request:', error)
      throw error
    }
  },

  async findVolunteersForTask(taskId, taskType = 'claim', maxResults = 5) {
    if (!supabase) {
      throw new Error('Supabase not configured. Please set up your environment variables.')
    }

    try {
      const { intelligentMatcher } = await import('./matchingAlgorithm.js')
      
      let task = null

      if (taskType === 'claim') {
        // Get claim details
        const { data: claim, error: claimError } = await supabase
          .from('donation_claims')
          .select(`
            *,
            donation:donations(
              *,
              donor:users!donations_donor_id_fkey(*)
            ),
            recipient:users!donation_claims_recipient_id_fkey(*)
          `)
          .eq('id', taskId)
          .single()

        if (claimError) throw claimError

        task = {
          type: 'delivery',
          claim,
          donation: claim.donation,
          urgency: claim.donation.is_urgent ? 'high' : 'medium',
          pickup_location: claim.donation.pickup_location,
          pickup_latitude: claim.donation.donor?.latitude,
          pickup_longitude: claim.donation.donor?.longitude,
          delivery_location: claim.recipient?.address || claim.recipient?.city,
          delivery_latitude: claim.recipient?.latitude,
          delivery_longitude: claim.recipient?.longitude
        }
      } else {
        // Get request details
        const { data: request, error: requestError } = await supabase
          .from('donation_requests')
          .select(`
            *,
            requester:users!donation_requests_requester_id_fkey(*)
          `)
          .eq('id', taskId)
          .single()

        if (requestError) throw requestError

        task = {
          type: 'request_fulfillment',
          request,
          urgency: request.urgency,
          delivery_location: request.location,
          delivery_latitude: request.requester?.latitude,
          delivery_longitude: request.requester?.longitude
        }
      }

      // Find volunteer matches
      const matches = await intelligentMatcher.matchVolunteersToTask(task, null, maxResults)

      return {
        task,
        matches,
        totalMatches: matches.length,
        algorithm: 'Weighted Sum Model (WSM)',
        criteria: ['geographic_proximity', 'availability_match', 'skill_compatibility', 'user_reliability', 'urgency_response']
      }
    } catch (error) {
      console.error('Error finding volunteers for task:', error)
      throw error
    }
  },

  async findOptimalMatches(filters = {}) {
    if (!supabase) {
      throw new Error('Supabase not configured. Please set up your environment variables.')
    }

    try {
      const { intelligentMatcher } = await import('./matchingAlgorithm.js')

      // Get open requests
      const requests = await this.getRequests({ status: 'open', ...filters })
      
      // Get available donations
      const donations = await this.getAvailableDonations()

      // Find optimal matches
      const optimalMatches = await intelligentMatcher.findOptimalMatches(requests, donations)

      return {
        matches: optimalMatches,
        totalMatches: optimalMatches.length,
        algorithm: 'Weighted Sum Model (WSM)',
        processingTime: new Date().toISOString(),
        filters: filters
      }
    } catch (error) {
      console.error('Error finding optimal matches:', error)
      throw error
    }
  },

  async getMatchingRecommendations(userId, userRole, limit = 5) {
    if (!supabase) {
      throw new Error('Supabase not configured. Please set up your environment variables.')
    }

    try {
      const { intelligentMatcher } = await import('./matchingAlgorithm.js')
      let recommendations = []

      if (userRole === 'recipient') {
        // Get user's open requests
        const userRequests = await this.getRequests({ 
          requester_id: userId, 
          status: 'open' 
        })

        for (const request of userRequests.slice(0, 3)) {
          const matches = await this.findMatchesForRequest(request.id, 3)
          if (matches.matches.length > 0) {
            recommendations.push({
              type: 'donation_matches',
              request,
              topMatches: matches.matches.slice(0, 2),
              reason: 'Found potential donors for your request'
            })
          }
        }
      } else if (userRole === 'donor') {
        // Get user's available donations
        const userDonations = await this.getDonations({ 
          donor_id: userId, 
          status: 'available' 
        })

        // Find requests that match user's donations
        const openRequests = await this.getRequests({ status: 'open' })
        
        for (const donation of userDonations.slice(0, 3)) {
          const compatibleRequests = []
          
          for (const request of openRequests) {
            const categoryMatch = donation.category === request.category
            const quantityMatch = donation.quantity >= request.quantity_needed
            
            if (categoryMatch && quantityMatch) {
              compatibleRequests.push({
                request,
                compatibility: intelligentMatcher.calculateItemCompatibility(
                  donation.category, request.category,
                  donation.title, request.title,
                  request.quantity_needed, donation.quantity
                )
              })
            }
          }

          if (compatibleRequests.length > 0) {
            recommendations.push({
              type: 'request_matches',
              donation,
              topMatches: compatibleRequests
                .sort((a, b) => b.compatibility - a.compatibility)
                .slice(0, 2),
              reason: 'Found recipients who need your donation'
            })
          }
        }
      } else if (userRole === 'volunteer') {
        // Get available volunteer tasks
        const availableTasks = await this.getAvailableVolunteerTasks()
        
        // Score tasks based on volunteer's location and preferences
        const userProfile = await this.getProfile(userId)
        const scoredTasks = []

        for (const task of availableTasks.slice(0, 10)) {
          let score = 0.5 // Base score

          // Geographic proximity bonus
          if (userProfile?.latitude && userProfile?.longitude) {
            const distance = intelligentMatcher.calculateGeographicScore(
              userProfile.latitude, userProfile.longitude,
              task.donor?.latitude, task.donor?.longitude
            )
            score += distance * 0.3
          }

          // Urgency bonus
          if (task.urgency === 'high' || task.urgency === 'critical') {
            score += 0.2
          }

          scoredTasks.push({ ...task, score })
        }

        const topTasks = scoredTasks
          .sort((a, b) => b.score - a.score)
          .slice(0, 3)

        recommendations.push({
          type: 'volunteer_opportunities',
          tasks: topTasks,
          reason: 'High-priority volunteer opportunities near you'
        })
      }

      return {
        recommendations,
        userId,
        userRole,
        generatedAt: new Date().toISOString(),
        algorithm: 'Weighted Sum Model (WSM)'
      }
    } catch (error) {
      console.error('Error getting matching recommendations:', error)
      throw error
    }
  },

  async createSmartMatch(requestId, donationId, volunteerId = null) {
    if (!supabase) {
      throw new Error('Supabase not configured. Please set up your environment variables.')
    }

    try {
      // Get request and donation details
      const [requestResult, donationResult] = await Promise.all([
        supabase.from('donation_requests').select('*').eq('id', requestId).single(),
        supabase.from('donations').select('*').eq('id', donationId).single()
      ])

      if (requestResult.error) throw requestResult.error
      if (donationResult.error) throw donationResult.error

      const request = requestResult.data
      const donation = donationResult.data

      // Verify compatibility
      const { intelligentMatcher } = await import('./matchingAlgorithm.js')
      const compatibility = intelligentMatcher.calculateItemCompatibility(
        request.category, donation.category,
        request.title, donation.title,
        request.quantity_needed, donation.quantity
      )

      if (compatibility < 0.5) {
        throw new Error('Items are not sufficiently compatible for matching')
      }

      // Create the match by having the requester claim the donation
      const claim = await this.claimDonation(donationId, request.requester_id)

      // If volunteer is specified, assign them
      if (volunteerId && (request.delivery_mode === 'volunteer' || donation.delivery_mode === 'volunteer')) {
        await this.assignVolunteerToDelivery(claim.id, volunteerId)
      }

      // Update request status
      await this.updateRequest(requestId, { 
        status: 'matched',
        matched_donation_id: donationId,
        matched_at: new Date().toISOString()
      })

      // Create success notifications
      await this.createNotification({
        user_id: request.requester_id,
        type: 'smart_match',
        title: 'Smart Match Found!',
        message: `We found a perfect match for your request: "${request.title}". The donation has been automatically claimed for you.`,
        data: {
          request_id: requestId,
          donation_id: donationId,
          claim_id: claim.id,
          compatibility_score: compatibility,
          match_type: 'smart_match'
        }
      })

      await this.createNotification({
        user_id: donation.donor_id,
        type: 'smart_match',
        title: 'Your Donation Was Matched!',
        message: `Great news! Your donation "${donation.title}" was intelligently matched with someone in need.`,
        data: {
          request_id: requestId,
          donation_id: donationId,
          claim_id: claim.id,
          compatibility_score: compatibility,
          match_type: 'smart_match'
        }
      })

      return {
        success: true,
        match: {
          request,
          donation,
          claim,
          volunteer_id: volunteerId,
          compatibility_score: compatibility,
          match_algorithm: 'Weighted Sum Model (WSM)',
          created_at: new Date().toISOString()
        }
      }
    } catch (error) {
      console.error('Error creating smart match:', error)
      throw error
    }
  }
}

// Export the supabase client and helper functions
export { supabase }
export default db