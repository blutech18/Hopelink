import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { useToast } from '../../contexts/ToastContext'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Bell, 
  Truck, 
  User, 
  MapPin, 
  Phone, 
  Mail, 
  Package, 
  CheckCircle, 
  XCircle,
  Clock,
  Search,
  TrendingUp,
  Eye,
  X,
  Calendar,
  MessageSquare,
  Building2,
  FileText,
  Heart,
  Users,
  Shield,
  AlertCircle,
  Camera,
  Globe,
  Gift,
  Star
} from 'lucide-react'
import { db, supabase } from '../../lib/supabase'
import LoadingSpinner from '../../components/ui/LoadingSpinner'
import { ListPageSkeleton } from '../../components/ui/Skeleton'
import { IDVerificationBadge } from '../../components/ui/VerificationBadge'

const PendingRequestsPage = () => {
  const { user } = useAuth()
  const { success, error } = useToast()

  // Helper function to calculate age from birthdate
  const calculateAge = (birthDate) => {
    if (!birthDate) return null
    const today = new Date()
    const birth = new Date(birthDate)
    let age = today.getFullYear() - birth.getFullYear()
    const monthDiff = today.getMonth() - birth.getMonth()
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--
    }
    return age
  }

  // Helper function to convert ID type value to readable label
  const getIDTypeLabel = (idType) => {
    if (!idType) return 'No ID'
    
    const idTypeMap = {
      'fourps_id': '4Ps Beneficiary ID (DSWD)',
      'philsys_id': 'Philippine National ID (PhilSys)',
      'voters_id': 'Voter\'s ID or Certificate',
      'drivers_license': 'Driver\'s License',
      'passport': 'Passport',
      'postal_id': 'Postal ID',
      'barangay_certificate': 'Barangay Certificate with photo',
      'senior_citizen_id': 'Senior Citizen ID',
      'school_id': 'School ID',
      'sss_umid': 'SSS or UMID Card',
      'prc_id': 'PRC ID',
      'sec_registration': 'SEC Registration Certificate',
      'dti_registration': 'DTI Business Registration',
      'barangay_clearance': 'Barangay Clearance or Mayor\'s Permit',
      'dswd_accreditation': 'DSWD Accreditation'
    }
    
    return idTypeMap[idType] || idType
  }
  
  const [loading, setLoading] = useState(true)
  const [donationRequests, setDonationRequests] = useState([])
  const [volunteerRequests, setVolunteerRequests] = useState([])
  const [processingRequestId, setProcessingRequestId] = useState(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedRequest, setSelectedRequest] = useState(null)
  const [showDetailsModal, setShowDetailsModal] = useState(false)
  const [selectedProfile, setSelectedProfile] = useState(null)
  const [showProfileModal, setShowProfileModal] = useState(false)
  const [showProfileImageModal, setShowProfileImageModal] = useState(false)

  const fetchRequests = useCallback(async () => {
    if (!user?.id) {
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      
      // Query notifications directly by type for better performance and to ensure we get all relevant notifications
      // Query for donation_request and volunteer_request notifications separately
      const [allNotifications, volunteerRequestNotificationsQuery, donationRequestNotificationsQuery] = await Promise.all([
        db.getUserNotifications(user.id, 100), // Fallback: get all notifications
        // Direct query for volunteer_request notifications
        supabase
          .from('notifications')
          .select('*')
          .eq('user_id', user.id)
          .eq('type', 'volunteer_request')
          .is('read_at', null)
          .order('created_at', { ascending: false })
          .limit(50),
        // Direct query for donation_request notifications
        supabase
          .from('notifications')
          .select('*')
          .eq('user_id', user.id)
          .eq('type', 'donation_request')
          .is('read_at', null)
          .order('created_at', { ascending: false })
          .limit(50)
      ])
      
      // Use direct queries if available, otherwise fall back to filtering all notifications
      const donationRequestNotifications = donationRequestNotificationsQuery.data || 
        allNotifications.filter(n => n.type === 'donation_request' && !n.read_at)
      
      const volunteerRequestNotifications = volunteerRequestNotificationsQuery.data || 
        allNotifications.filter(n => n.type === 'volunteer_request' && !n.read_at)
      
      // Debug logging
      console.log('📋 PendingRequestsPage - Notification counts:', {
        totalNotifications: allNotifications.length,
        donationRequests: donationRequestNotifications.length,
        volunteerRequests: volunteerRequestNotifications.length,
        volunteerRequestQueryResult: volunteerRequestNotificationsQuery.data?.length || 0
      })
      
      // Show notifications immediately for better perceived performance
      setDonationRequests(donationRequestNotifications.map(r => ({ ...r, donation: null })))
      setVolunteerRequests(volunteerRequestNotifications.map(r => ({ ...r, donation: null })))
      setLoading(false) // Show page immediately, enrichment happens in background
      
      // Enrich requests in background (non-blocking) after initial render
      // Fire and forget - don't await to avoid blocking the UI
      if (donationRequestNotifications.length > 0 || volunteerRequestNotifications.length > 0) {
        // Wrap enrichment in async IIFE to make it truly non-blocking
        ;(async () => {
          try {
            // Collect all unique donation IDs and user IDs for batch fetching
            const donationIds = []
            const requesterIds = []
            const volunteerIds = []
            
            donationRequestNotifications.forEach(request => {
              // Validate donation_id is a valid UUID string
              if (request.data?.donation_id && 
                  typeof request.data.donation_id === 'string' && 
                  request.data.donation_id.length > 0 &&
                  !donationIds.includes(request.data.donation_id)) {
                donationIds.push(request.data.donation_id)
              }
              if (request.data?.requester_id && 
                  typeof request.data.requester_id === 'string' &&
                  !requesterIds.includes(request.data.requester_id)) {
                requesterIds.push(request.data.requester_id)
              }
            })
            
            volunteerRequestNotifications.forEach(request => {
              // Validate donation_id is a valid UUID string
              if (request.data?.donation_id && 
                  typeof request.data.donation_id === 'string' && 
                  request.data.donation_id.length > 0 &&
                  !donationIds.includes(request.data.donation_id)) {
                donationIds.push(request.data.donation_id)
              }
              if (request.data?.volunteer_id && 
                  typeof request.data.volunteer_id === 'string' &&
                  !volunteerIds.includes(request.data.volunteer_id)) {
                volunteerIds.push(request.data.volunteer_id)
              }
            })
            
            // Batch fetch donations using .in() query for efficiency
            const donationsMap = new Map()
            if (donationIds.length > 0) {
              try {
                // Filter out any invalid IDs (must be valid UUIDs)
                const validDonationIds = donationIds.filter(id => 
                  typeof id === 'string' && 
                  id.length === 36 && // UUID length
                  id.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)
                )
                
                if (validDonationIds.length === 0) {
                  console.warn('No valid donation IDs found for batch fetch')
                } else {
                  // Use simpler query without foreign key reference to avoid errors
                  // Fetch donations first, then fetch donors separately if needed
                  let donationsQuery = supabase
                    .from('donations')
                    .select('*')
                  
                  // Use .eq() for single ID, .in() for multiple IDs
                  if (validDonationIds.length === 1) {
                    donationsQuery = donationsQuery.eq('id', validDonationIds[0])
                  } else {
                    donationsQuery = donationsQuery.in('id', validDonationIds)
                  }
                  
                  const { data: donations, error: donationsError } = await donationsQuery
                  
                  if (donationsError) {
                    console.error('Error batch fetching donations:', donationsError)
                  } else if (donations && donations.length > 0) {
                    // Fetch donors separately for the donations we found
                    const donorIds = [...new Set(donations.map(d => d.donor_id).filter(Boolean))]
                    
                    if (donorIds.length > 0) {
                      // Validate donor IDs are valid UUIDs
                      const validDonorIds = donorIds.filter(id => 
                        typeof id === 'string' && 
                        id.length === 36 && 
                        id.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)
                      )
                      
                      if (validDonorIds.length > 0) {
                        let donorsQuery = supabase
                          .from('users')
                          .select('id, name, email, profile_image_url, latitude, longitude')
                        
                        // Use .eq() for single ID, .in() for multiple IDs
                        if (validDonorIds.length === 1) {
                          donorsQuery = donorsQuery.eq('id', validDonorIds[0])
                        } else {
                          donorsQuery = donorsQuery.in('id', validDonorIds)
                        }
                        
                        const { data: donors, error: donorsError } = await donorsQuery
                        
                        if (!donorsError && donors) {
                          const donorsMap = new Map(donors.map(d => [d.id, d]))
                          // Attach donor data to each donation
                          donations.forEach(donation => {
                            if (donorsMap.has(donation.donor_id)) {
                              donation.donor = donorsMap.get(donation.donor_id)
                            }
                            donationsMap.set(donation.id, donation)
                          })
                        } else {
                          if (donorsError) {
                            console.error('Error fetching donors:', donorsError)
                          }
                          // Even if donor fetch fails, still add donations without donor data
                          donations.forEach(d => donationsMap.set(d.id, d))
                        }
                      } else {
                        // No valid donor IDs, just add donations
                        donations.forEach(d => donationsMap.set(d.id, d))
                      }
                    } else {
                      // No donor IDs, just add donations
                      donations.forEach(d => donationsMap.set(d.id, d))
                    }
                  }
                }
              } catch (err) {
                console.error('Error batch fetching donations:', err)
              }
            }
            
            // Batch fetch requester profiles in parallel batches to avoid overwhelming the database
            const requesterProfilesMap = new Map()
            if (requesterIds.length > 0) {
              // Validate requester IDs are valid UUIDs
              const validRequesterIds = requesterIds.filter(id => 
                typeof id === 'string' && 
                id.length === 36 && 
                id.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)
              )
              
              if (validRequesterIds.length > 0) {
                const batchSize = 5
                for (let i = 0; i < validRequesterIds.length; i += batchSize) {
                  const batch = validRequesterIds.slice(i, i + batchSize)
                  await Promise.all(
                    batch.map(async (requesterId) => {
                      try {
                        const profile = await db.getProfile(requesterId)
                        if (profile) requesterProfilesMap.set(requesterId, profile)
                      } catch (err) {
                        console.warn(`Could not fetch profile for requester ${requesterId}:`, err)
                      }
                    })
                  )
                }
              }
            }
            
            // Batch fetch volunteer profiles in parallel batches
            const volunteerProfilesMap = new Map()
            if (volunteerIds.length > 0) {
              // Validate volunteer IDs are valid UUIDs
              const validVolunteerIds = volunteerIds.filter(id => 
                typeof id === 'string' && 
                id.length === 36 && 
                id.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)
              )
              
              if (validVolunteerIds.length > 0) {
                const batchSize = 5
                for (let i = 0; i < validVolunteerIds.length; i += batchSize) {
                  const batch = validVolunteerIds.slice(i, i + batchSize)
                  await Promise.all(
                    batch.map(async (volunteerId) => {
                      try {
                        const profile = await db.getProfile(volunteerId)
                        if (profile) volunteerProfilesMap.set(volunteerId, profile)
                      } catch (err) {
                        console.warn(`Could not fetch profile for volunteer ${volunteerId}:`, err)
                      }
                    })
                  )
                }
              }
            }
            
            // Enrich donation requests with batch-fetched data
            const enrichedDonationRequests = donationRequestNotifications.map(request => {
              const donation = donationsMap.get(request.data?.donation_id) || null
              const requesterProfile = request.data?.requester_id 
                ? requesterProfilesMap.get(request.data.requester_id) || null
                : null
              
              return {
                ...request,
                donation,
                requesterProfile,
                data: {
                  ...request.data,
                  requester_email: requesterProfile?.email || request.data?.requester_email,
                  requester_phone: requesterProfile?.phone_number || request.data?.requester_phone,
                  requester_address: requesterProfile?.address || request.data?.requester_address,
                  requester_address_street: requesterProfile?.address_street,
                  requester_address_barangay: requesterProfile?.address_barangay,
                  requester_address_landmark: requesterProfile?.address_landmark,
                  requester_city: requesterProfile?.city,
                  requester_province: requesterProfile?.province,
                  requester_zip_code: requesterProfile?.zip_code
                }
              }
            })
            
            // Enrich volunteer requests with batch-fetched data
            const enrichedVolunteerRequests = volunteerRequestNotifications.map(request => {
              const donation = donationsMap.get(request.data?.donation_id) || null
              const volunteerProfile = request.data?.volunteer_id
                ? volunteerProfilesMap.get(request.data.volunteer_id) || null
                : null
              
              return {
                ...request,
                donation,
                volunteerProfile,
                data: {
                  ...request.data,
                  volunteer_email: volunteerProfile?.email || request.data?.volunteer_email,
                  volunteer_phone: volunteerProfile?.phone_number || request.data?.volunteer_phone,
                  volunteer_address_street: volunteerProfile?.address_street,
                  volunteer_address_barangay: volunteerProfile?.address_barangay,
                  volunteer_address_landmark: volunteerProfile?.address_landmark,
                  volunteer_city: volunteerProfile?.city,
                  volunteer_province: volunteerProfile?.province,
                  volunteer_zip_code: volunteerProfile?.zip_code
                }
              }
            })
            
            // Update state with enriched data
            setDonationRequests(enrichedDonationRequests)
            setVolunteerRequests(enrichedVolunteerRequests)
          } catch (err) {
            console.error('Error enriching requests:', err)
            // Don't show error to user - requests are already displayed
          }
        })()
      }
    } catch (err) {
      console.error('Error fetching requests:', err)
      error('Failed to load pending requests')
      setLoading(false)
    }
  }, [user?.id, error])

  useEffect(() => {
    fetchRequests()
  }, [fetchRequests])

  const handleApproveRequest = async (request) => {
    try {
      setProcessingRequestId(request.id)
      
      // Create a claim record
      await db.claimDonation(request.data.donation_id, request.data.requester_id)
      
      // Create approval notification for requester
      await db.createNotification({
        user_id: request.data.requester_id,
        type: 'donation_approved',
        title: 'Donation Request Approved',
        message: `Your request for "${request.donation?.title || 'a donation'}" has been approved!`,
        data: {
          donation_id: request.data.donation_id,
          donor_id: user.id
        }
      })

      // Mark original request as read
      await db.markNotificationAsRead(request.id)

      success('Request approved successfully!')
      await fetchRequests()
    } catch (err) {
      console.error('Error approving request:', err)
      error(err.message || 'Failed to approve request')
    } finally {
      setProcessingRequestId(null)
    }
  }

  const handleDeclineRequest = async (request) => {
    try {
      setProcessingRequestId(request.id)
      
      // Create decline notification for requester
      await db.createNotification({
        user_id: request.data.requester_id,
        type: 'donation_declined',
        title: 'Donation Request Declined',
        message: `Your request for "${request.donation?.title || 'a donation'}" was declined.`,
        data: {
          donation_id: request.data.donation_id,
          donor_id: user.id
        }
      })

      // Mark original request as read
      await db.markNotificationAsRead(request.id)

      success('Request declined')
      await fetchRequests()
    } catch (err) {
      console.error('Error declining request:', err)
      error(err.message || 'Failed to decline request')
    } finally {
      setProcessingRequestId(null)
    }
  }

  const handleApproveVolunteerRequest = async (request) => {
    try {
      setProcessingRequestId(request.id)
      
      // Update volunteer request status to approved
      if (request.data.volunteer_request_id) {
        await db.updateVolunteerRequestStatus(
          request.data.volunteer_request_id, 
          'approved', 
          user.id
        )
      }
      
      // Create a delivery assignment for the volunteer
      if (request.data.claim_id) {
        await db.assignVolunteerToDelivery(
          request.data.claim_id,
          request.data.volunteer_id
        )
      }
      
      // Create approval notification for volunteer
      await db.createNotification({
        user_id: request.data.volunteer_id,
        type: 'volunteer_approved',
        title: 'Volunteer Request Approved',
        message: `Your volunteer request has been approved! You can now manage the delivery.`,
        data: {
          claim_id: request.data.claim_id,
          donor_id: user.id,
          volunteer_request_id: request.data.volunteer_request_id
        }
      })

      // Mark original request as read
      await db.markNotificationAsRead(request.id)

      success('Volunteer request approved successfully!')
      await fetchRequests()
    } catch (err) {
      console.error('Error approving volunteer request:', err)
      error(err.message || 'Failed to approve volunteer request')
    } finally {
      setProcessingRequestId(null)
    }
  }

  const handleDeclineVolunteerRequest = async (request) => {
    try {
      setProcessingRequestId(request.id)
      
      // Update volunteer request status to rejected
      if (request.data.volunteer_request_id) {
        await db.updateVolunteerRequestStatus(
          request.data.volunteer_request_id, 
          'rejected', 
          user.id
        )
      }
      
      // Create decline notification for volunteer
      await db.createNotification({
        user_id: request.data.volunteer_id,
        type: 'volunteer_declined',
        title: 'Volunteer Request Declined',
        message: `Your volunteer request was declined.`,
        data: {
          claim_id: request.data.claim_id,
          donor_id: user.id,
          volunteer_request_id: request.data.volunteer_request_id
        }
      })

      // Mark original request as read
      await db.markNotificationAsRead(request.id)

      success('Volunteer request declined')
      await fetchRequests()
    } catch (err) {
      console.error('Error declining volunteer request:', err)
      error(err.message || 'Failed to decline volunteer request')
    } finally {
      setProcessingRequestId(null)
    }
  }

  // Memoize filtered requests to avoid recalculating on every render
  const filteredDonationRequests = useMemo(() => {
    return donationRequests.filter(request =>
      !searchTerm || 
      request.donation?.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      request.data?.requester_name?.toLowerCase().includes(searchTerm.toLowerCase())
    )
  }, [donationRequests, searchTerm])

  const filteredVolunteerRequests = useMemo(() => {
    return volunteerRequests.filter(request =>
      !searchTerm ||
      request.donation?.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      request.data?.volunteer_name?.toLowerCase().includes(searchTerm.toLowerCase())
    )
  }, [volunteerRequests, searchTerm])

  // Calculate stats
  const stats = {
    total: donationRequests.length + volunteerRequests.length,
    donationRequests: donationRequests.length,
    volunteerRequests: volunteerRequests.length
  }

  const handleViewDetails = (request) => {
    setSelectedRequest(request)
    setShowDetailsModal(true)
  }

  const handleViewProfile = async (userId) => {
    try {
      const profile = await db.getProfile(userId)
      setSelectedProfile(profile)
      setShowProfileModal(true)
    } catch (err) {
      console.error('Error fetching profile:', err)
      error('Failed to load user profile')
    }
  }

  if (loading) {
    return <ListPageSkeleton />
  }

  return (
    <div className="min-h-screen py-4 sm:py-8 custom-scrollbar" style={{backgroundColor: '#00237d'}}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6 sm:mb-8"
        >
          <div className="flex items-center justify-between gap-3 sm:gap-4 mb-6">
            <div className="min-w-0">
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white">Pending Requests</h1>
              <p className="text-yellow-300 text-xs sm:text-sm">Manage donation and volunteer requests for your donations</p>
            </div>
          </div>

          {/* Search */}
          <div className="flex flex-col gap-3 sm:gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-yellow-400 flex-shrink-0" />
              <input
                type="text"
                placeholder="Search by donation title or requester name..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-3 sm:py-2.5 bg-navy-800 border-2 border-navy-700 rounded-lg text-white text-sm sm:text-base placeholder-gray-400 focus:outline-none focus:border-yellow-500 focus:ring-2 focus:ring-yellow-500/20 transition-all duration-200"
              />
            </div>
          </div>
        </motion.div>

        {/* Stats */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6 mb-6 sm:mb-8"
        >
          <div className="card p-4 sm:p-6">
            <div className="flex items-center space-x-3">
              <TrendingUp className="h-6 w-6 sm:h-8 sm:w-8 text-blue-400" />
              <div className="flex flex-col">
                <p className="text-xl sm:text-2xl font-bold text-white">{stats.total}</p>
                <p className="text-yellow-300 text-xs sm:text-sm">Total Requests</p>
              </div>
            </div>
          </div>
          
          <div className="card p-4 sm:p-6">
            <div className="flex items-center space-x-3">
              <Bell className="h-6 w-6 sm:h-8 sm:w-8 text-yellow-400" />
              <div className="flex flex-col">
                <p className="text-xl sm:text-2xl font-bold text-white">{stats.donationRequests}</p>
                <p className="text-yellow-300 text-xs sm:text-sm">Donation Requests</p>
              </div>
            </div>
          </div>
          
          <div className="card p-4 sm:p-6">
            <div className="flex items-center space-x-3">
              <Truck className="h-6 w-6 sm:h-8 sm:w-8 text-green-400" />
              <div className="flex flex-col">
                <p className="text-xl sm:text-2xl font-bold text-white">{stats.volunteerRequests}</p>
                <p className="text-yellow-300 text-xs sm:text-sm">Volunteer Requests</p>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Donation Requests Table */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="card overflow-hidden mb-6"
        >
          <div className="bg-navy-900 border-b border-navy-700 px-4 sm:px-6 py-4">
            <div className="flex items-center gap-2">
              <Bell className="h-5 w-5 text-yellow-400" />
              <h2 className="text-lg sm:text-xl font-bold text-white">Donation Requests</h2>
              <span className="ml-2 px-2 py-0.5 rounded-full bg-navy-700 text-xs text-gray-300">
                {filteredDonationRequests.length}
              </span>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-navy-800">
                <tr>
                  <th className="px-4 sm:px-6 py-4 text-left text-xs font-medium text-yellow-300 uppercase tracking-wider">Donation</th>
                  <th className="px-4 sm:px-6 py-4 text-center text-xs font-medium text-yellow-300 uppercase tracking-wider">Recipient</th>
                  <th className="px-4 sm:px-6 py-4 text-center text-xs font-medium text-yellow-300 uppercase tracking-wider">Contact</th>
                  <th className="px-4 sm:px-6 py-4 text-center text-xs font-medium text-yellow-300 uppercase tracking-wider">Date</th>
                  <th className="px-4 sm:px-6 py-4 text-center text-xs font-medium text-yellow-300 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-navy-700">
                {filteredDonationRequests.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="px-4 sm:px-6 py-12 text-center">
                      <Bell className="h-12 w-12 text-yellow-400 mx-auto mb-4" />
                      <p className="text-yellow-300">No donation requests found</p>
                      <p className="text-yellow-400 text-sm mt-1">
                        {searchTerm
                          ? 'Try adjusting your search'
                          : 'Donation requests will appear here'}
                      </p>
                    </td>
                  </tr>
                ) : (
                  filteredDonationRequests.map((request, index) => (
                    <motion.tr
                      key={request.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: index * 0.05 }}
                      className="hover:bg-navy-800/50 transition-colors"
                    >
                      <td className="px-4 sm:px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-yellow-600 to-yellow-500 flex items-center justify-center shadow-lg flex-shrink-0">
                            <Package className="h-5 w-5 text-white" />
                          </div>
                          <div>
                            <div className="text-sm font-semibold text-white max-w-[200px] truncate">
                              {request.donation?.title || 'N/A'}
                            </div>
                            <div className="text-xs text-gray-400">
                              {request.donation?.category || 'N/A'} • Qty: {request.donation?.quantity || 'N/A'}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 sm:px-6 py-4">
                        <button
                          onClick={() => handleViewProfile(request.data?.requester_id)}
                          className="px-3 py-1.5 bg-blue-600/20 hover:bg-blue-600/30 border border-blue-500/30 hover:border-blue-500/50 text-blue-300 hover:text-blue-200 text-xs sm:text-sm font-medium rounded-lg transition-all"
                        >
                          {request.data?.requester_name || 'Unknown'}
                        </button>
                      </td>
                      <td className="px-4 sm:px-6 py-4">
                        <div className="text-sm text-gray-300 space-y-1">
                          {request.data?.requester_email && (
                            <div className="flex items-center gap-2">
                              <Mail className="h-3.5 w-3.5 text-yellow-400 flex-shrink-0" />
                              <span className="truncate max-w-[200px]">{request.data.requester_email}</span>
                            </div>
                          )}
                          {request.data?.requester_phone && (
                            <div className="flex items-center gap-2">
                              <Phone className="h-3.5 w-3.5 text-yellow-400 flex-shrink-0" />
                              <span>{request.data.requester_phone}</span>
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-4 sm:px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2 text-sm text-gray-300">
                          <Clock className="h-3.5 w-3.5 text-yellow-400" />
                          <span>{new Date(request.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                        </div>
                      </td>
                      <td className="px-4 sm:px-6 py-4">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleViewDetails(request)}
                            className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs sm:text-sm font-medium rounded-lg transition-all flex items-center gap-1"
                          >
                            <Eye className="h-4 w-4" />
                            View
                          </button>
                          <button
                            onClick={() => handleApproveRequest(request)}
                            disabled={processingRequestId === request.id}
                            className="px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white text-xs sm:text-sm font-medium rounded-lg transition-all flex items-center gap-1 disabled:opacity-50"
                          >
                            {processingRequestId === request.id ? (
                              <LoadingSpinner size="sm" />
                            ) : (
                              <>
                                <CheckCircle className="h-4 w-4" />
                                Approve
                              </>
                            )}
                          </button>
                          <button
                            onClick={() => handleDeclineRequest(request)}
                            disabled={processingRequestId === request.id}
                            className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white text-xs sm:text-sm font-medium rounded-lg transition-all flex items-center gap-1 disabled:opacity-50"
                          >
                            <XCircle className="h-4 w-4" />
                            Decline
                          </button>
                        </div>
                      </td>
                    </motion.tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </motion.div>

        {/* Volunteer Requests Table */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="card overflow-hidden"
        >
          <div className="bg-navy-900 border-b border-navy-700 px-4 sm:px-6 py-4">
            <div className="flex items-center gap-2">
              <Truck className="h-5 w-5 text-yellow-400" />
              <h2 className="text-lg sm:text-xl font-bold text-white">Volunteer Requests</h2>
              <span className="ml-2 px-2 py-0.5 rounded-full bg-navy-700 text-xs text-gray-300">
                {filteredVolunteerRequests.length}
              </span>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-navy-800">
                <tr>
                  <th className="px-4 sm:px-6 py-4 text-left text-xs font-medium text-yellow-300 uppercase tracking-wider">Donation</th>
                  <th className="px-4 sm:px-6 py-4 text-center text-xs font-medium text-yellow-300 uppercase tracking-wider">Volunteer</th>
                  <th className="px-4 sm:px-6 py-4 text-center text-xs font-medium text-yellow-300 uppercase tracking-wider">Location</th>
                  <th className="px-4 sm:px-6 py-4 text-center text-xs font-medium text-yellow-300 uppercase tracking-wider">Date</th>
                  <th className="px-4 sm:px-6 py-4 text-center text-xs font-medium text-yellow-300 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-navy-700">
                {filteredVolunteerRequests.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="px-4 sm:px-6 py-12 text-center">
                      <Truck className="h-12 w-12 text-yellow-400 mx-auto mb-4" />
                      <p className="text-yellow-300">No volunteer requests found</p>
                      <p className="text-yellow-400 text-sm mt-1">
                        {searchTerm
                          ? 'Try adjusting your search'
                          : 'Volunteer requests will appear here'}
                      </p>
                    </td>
                  </tr>
                ) : (
                  filteredVolunteerRequests.map((request, index) => (
                    <motion.tr
                      key={request.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: index * 0.05 }}
                      className="hover:bg-navy-800/50 transition-colors"
                    >
                      <td className="px-4 sm:px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-green-600 to-green-500 flex items-center justify-center shadow-lg flex-shrink-0">
                            <Package className="h-5 w-5 text-white" />
                          </div>
                          <div>
                            <div className="text-sm font-semibold text-white max-w-[200px] truncate">
                              {request.donation?.title || 'N/A'}
                            </div>
                            <div className="text-xs text-gray-400">
                              {request.donation?.category || 'N/A'} • Qty: {request.donation?.quantity || 'N/A'}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 sm:px-6 py-4">
                        <button
                          onClick={() => handleViewProfile(request.data?.volunteer_id)}
                          className="px-3 py-1.5 bg-blue-600/20 hover:bg-blue-600/30 border border-blue-500/30 hover:border-blue-500/50 text-blue-300 hover:text-blue-200 text-xs sm:text-sm font-medium rounded-lg transition-all"
                        >
                          {request.data?.volunteer_name || 'Unknown'}
                        </button>
                      </td>
                      <td className="px-4 sm:px-6 py-4">
                        <div className="flex items-start gap-2 text-sm text-gray-300 max-w-[200px]">
                          <MapPin className="h-3.5 w-3.5 text-green-400 flex-shrink-0 mt-0.5" />
                          <span className="truncate">{request.donation?.pickup_location || 'Not specified'}</span>
                        </div>
                      </td>
                      <td className="px-4 sm:px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2 text-sm text-gray-300">
                          <Clock className="h-3.5 w-3.5 text-yellow-400" />
                          <span>{new Date(request.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                        </div>
                      </td>
                      <td className="px-4 sm:px-6 py-4">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleViewDetails(request)}
                            className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs sm:text-sm font-medium rounded-lg transition-all flex items-center gap-1"
                          >
                            <Eye className="h-4 w-4" />
                            View
                          </button>
                          <button
                            onClick={() => handleApproveVolunteerRequest(request)}
                            disabled={processingRequestId === request.id}
                            className="px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white text-xs sm:text-sm font-medium rounded-lg transition-all flex items-center gap-1 disabled:opacity-50"
                          >
                            {processingRequestId === request.id ? (
                              <LoadingSpinner size="sm" />
                            ) : (
                              <>
                                <CheckCircle className="h-4 w-4" />
                                Approve
                              </>
                            )}
                          </button>
                          <button
                            onClick={() => handleDeclineVolunteerRequest(request)}
                            disabled={processingRequestId === request.id}
                            className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white text-xs sm:text-sm font-medium rounded-lg transition-all flex items-center gap-1 disabled:opacity-50"
                          >
                            <XCircle className="h-4 w-4" />
                            Decline
                          </button>
                        </div>
                      </td>
                    </motion.tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </motion.div>

        {/* Details Modal */}
        <AnimatePresence>
          {showDetailsModal && selectedRequest && (
            <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-3 sm:p-4" onClick={() => setShowDetailsModal(false)}>
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                transition={{ duration: 0.2 }}
                className="bg-navy-900 border-2 border-yellow-500/30 shadow-2xl rounded-lg sm:rounded-xl max-w-3xl w-full max-h-[95vh] sm:max-h-[90vh] overflow-hidden flex flex-col"
                onClick={(e) => e.stopPropagation()}
              >
                {/* Header */}
                <div className="flex items-center justify-between p-4 sm:p-6 border-b-2 border-yellow-500/20 flex-shrink-0 gap-3">
                  <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
                    <div className="p-1.5 sm:p-2 bg-yellow-500/10 rounded-lg flex-shrink-0">
                      <Bell className="h-5 w-5 sm:h-6 sm:w-6 text-yellow-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-base sm:text-lg lg:text-xl font-bold text-white truncate">Request Details</h3>
                      <p className="text-[10px] sm:text-xs text-yellow-300">Complete information</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setShowDetailsModal(false)}
                    className="text-gray-400 hover:text-white transition-colors p-1.5 sm:p-2 hover:bg-navy-800 rounded-lg flex-shrink-0"
                  >
                    <X className="h-5 w-5 sm:h-6 sm:w-6" />
                  </button>
                </div>

                {/* Content with Custom Scrollbar */}
                <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-3 sm:py-4 custom-scrollbar">
                  <div className="space-y-4 sm:space-y-6">
                    {/* Image Section */}
                    {selectedRequest.donation?.images && selectedRequest.donation.images.length > 0 && (
                      <div className="relative rounded-lg overflow-hidden bg-navy-800">
                        <img 
                          src={selectedRequest.donation.images[0]} 
                          alt={selectedRequest.donation.title}
                          className="w-full h-48 sm:h-64 object-cover"
                        />
                        <div className="absolute top-2 right-2 bg-orange-600 text-white px-3 py-1.5 rounded-full text-xs font-medium flex items-center">
                          <Clock className="h-3 w-3 mr-1" />
                          Pending Review
                        </div>
                      </div>
                    )}

                    {/* Title and Type */}
                    <div className="bg-navy-800/50 rounded-lg p-3 sm:p-4 border border-navy-700">
                      <div className="flex flex-col sm:flex-row items-start justify-between gap-2 sm:gap-4 mb-2 sm:mb-3">
                        <h4 className="text-lg sm:text-xl lg:text-2xl font-bold text-white">{selectedRequest.donation?.title || 'N/A'}</h4>
                        {(!selectedRequest.donation?.images || selectedRequest.donation.images.length === 0) && (
                          <span className="px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-full text-[10px] sm:text-xs font-semibold bg-yellow-900/30 text-yellow-300 border border-yellow-500/30 whitespace-nowrap">
                            {selectedRequest.type === 'donation_request' ? 'Donation Request' : 'Volunteer Request'}
                          </span>
                        )}
                      </div>
                      <p className="text-sm sm:text-base text-gray-300 leading-relaxed">{selectedRequest.donation?.description || 'No description provided'}</p>
                    </div>

                    {/* Details Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="bg-navy-800/30 rounded-lg p-4 border border-navy-700">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Package className="h-4 w-4 text-blue-400" />
                            <label className="text-sm font-semibold text-yellow-300">Category</label>
                          </div>
                          <p className="text-white text-lg font-medium">{selectedRequest.donation?.category || 'N/A'}</p>
                        </div>
                      </div>
                      
                      <div className="bg-navy-800/30 rounded-lg p-4 border border-navy-700">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Package className="h-4 w-4 text-green-400" />
                            <label className="text-sm font-semibold text-yellow-300">Quantity</label>
                          </div>
                          <p className="text-white text-lg font-medium">{selectedRequest.donation?.quantity || 'N/A'}</p>
                        </div>
                      </div>
                    </div>

                    {/* Delivery Info */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="bg-navy-800/30 rounded-lg p-4 border border-navy-700">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Truck className="h-4 w-4 text-purple-400" />
                            <label className="text-sm font-semibold text-yellow-300">Delivery Mode</label>
                          </div>
                          <p className="text-white text-lg font-medium capitalize">{selectedRequest.donation?.delivery_mode || 'N/A'}</p>
                        </div>
                      </div>

                      <div className="bg-navy-800/30 rounded-lg p-4 border border-navy-700">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <CheckCircle className="h-4 w-4 text-green-400" />
                            <label className="text-sm font-semibold text-yellow-300">Status</label>
                          </div>
                          <p className="text-white text-lg font-medium capitalize">{selectedRequest.donation?.status || 'N/A'}</p>
                        </div>
                      </div>
                    </div>

                    {/* Location */}
                    {selectedRequest.donation?.pickup_location && (
                      <div className="bg-navy-800/30 rounded-lg p-4 border border-navy-700">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <MapPin className="h-4 w-4 text-purple-400" />
                            <label className="text-sm font-semibold text-yellow-300">Pickup Location</label>
                          </div>
                          <p className="text-white text-center max-w-[60%] break-words">{selectedRequest.donation.pickup_location}</p>
                        </div>
                      </div>
                    )}

                    {/* Contact Information and Address Details - Same Row */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                      {/* Requester/Volunteer Information */}
                      <div className="bg-navy-800/30 rounded-lg p-3 border border-navy-700">
                        <div className="flex items-center gap-2 mb-2">
                          <User className="h-4 w-4 text-blue-400" />
                          <label className="text-sm font-semibold text-yellow-300">
                            {selectedRequest.type === 'donation_request' ? 'Recipient' : 'Volunteer'} Contact
                          </label>
                        </div>
                        <div className="space-y-2">
                          <div className="flex items-start gap-2">
                            <span className="text-gray-400 text-xs font-medium">Name:</span>
                            <span className={`font-medium flex-1 break-words text-sm ${(selectedRequest.data?.requester_name || selectedRequest.data?.volunteer_name) ? 'text-white' : 'text-gray-400 italic'}`}>
                              {selectedRequest.data?.requester_name || selectedRequest.data?.volunteer_name || 'Not provided'}
                            </span>
                          </div>
                          <div className="flex items-start gap-2">
                            <span className="text-gray-400 text-xs font-medium">Email:</span>
                            <span className={`flex-1 break-words text-sm ${(selectedRequest.data?.requester_email || selectedRequest.data?.volunteer_email) ? 'text-white' : 'text-gray-400 italic'}`}>
                              {selectedRequest.data?.requester_email || selectedRequest.data?.volunteer_email || 'Not provided'}
                            </span>
                          </div>
                          <div className="flex items-start gap-2">
                            <span className="text-gray-400 text-xs font-medium">Phone:</span>
                            <span className={`flex-1 break-words text-sm ${(selectedRequest.data?.requester_phone || selectedRequest.data?.volunteer_phone) ? 'text-white' : 'text-gray-400 italic'}`}>
                              {selectedRequest.data?.requester_phone || selectedRequest.data?.volunteer_phone || 'Not provided'}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Address Details */}
                      <div className="bg-navy-800/30 rounded-lg p-3 border border-navy-700">
                        <div className="flex items-center gap-2 mb-2">
                          <MapPin className="h-4 w-4 text-purple-400" />
                          <label className="text-sm font-semibold text-yellow-300">Address Details</label>
                        </div>
                        <div className="space-y-2">
                          <div className="flex items-start gap-2">
                            <span className="text-gray-400 text-xs font-medium">Street:</span>
                            <span className={`flex-1 break-words text-sm ${(selectedRequest.data?.requester_address_street || selectedRequest.data?.volunteer_address_street) ? 'text-white' : 'text-gray-400 italic'}`}>
                              {selectedRequest.data?.requester_address_street || selectedRequest.data?.volunteer_address_street || 'Not provided'}
                            </span>
                          </div>
                          <div className="flex items-start gap-2">
                            <span className="text-gray-400 text-xs font-medium">Barangay:</span>
                            <span className={`flex-1 break-words text-sm ${(selectedRequest.data?.requester_address_barangay || selectedRequest.data?.volunteer_address_barangay) ? 'text-white' : 'text-gray-400 italic'}`}>
                              {selectedRequest.data?.requester_address_barangay || selectedRequest.data?.volunteer_address_barangay || 'Not provided'}
                            </span>
                          </div>
                          <div className="flex items-start gap-2">
                            <span className="text-gray-400 text-xs font-medium">City:</span>
                            <span className={`flex-1 break-words text-sm ${(selectedRequest.data?.requester_city || selectedRequest.data?.volunteer_city) ? 'text-white' : 'text-gray-400 italic'}`}>
                              {selectedRequest.data?.requester_city || selectedRequest.data?.volunteer_city || 'Not provided'}
                            </span>
                          </div>
                          <div className="flex items-start gap-2">
                            <span className="text-gray-400 text-xs font-medium">Province:</span>
                            <span className={`flex-1 break-words text-sm ${(selectedRequest.data?.requester_province || selectedRequest.data?.volunteer_province) ? 'text-white' : 'text-gray-400 italic'}`}>
                              {selectedRequest.data?.requester_province || selectedRequest.data?.volunteer_province || 'Not provided'}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Request Timeline */}
                    <div className="bg-navy-800/30 rounded-lg p-4 border border-navy-700">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-orange-400" />
                          <label className="text-sm font-semibold text-yellow-300">Date Submitted</label>
                        </div>
                        <p className="text-white">{new Date(selectedRequest.created_at).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric'
                        })}</p>
                      </div>
                    </div>

                    {/* Message */}
                    {selectedRequest.message && (
                      <div className="bg-navy-800/30 rounded-lg p-4 border border-navy-700">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <MessageSquare className="h-4 w-4 text-blue-400" />
                            <label className="text-sm font-semibold text-yellow-300">Message</label>
                          </div>
                          <p className="text-white text-center max-w-[60%] break-words">{selectedRequest.message}</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Footer */}
                <div className="p-4 sm:p-6 pt-3 sm:pt-4 border-t-2 border-yellow-500/20 flex justify-end flex-shrink-0">
                  <button
                    onClick={() => setShowDetailsModal(false)}
                    className="px-4 sm:px-6 py-2.5 bg-navy-800 hover:bg-navy-700 text-white rounded-lg font-medium transition-colors border border-navy-600"
                  >
                    Close
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* Profile Modal - Shows Requester Profile for recipients or Volunteer Profile for volunteers */}
        <AnimatePresence>
          {showProfileModal && selectedProfile && (
            <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-2 sm:p-4">
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                transition={{ duration: 0.2 }}
                className="bg-navy-900 border-2 border-yellow-500/30 shadow-2xl rounded-lg sm:rounded-xl p-3 sm:p-5 max-w-3xl w-full max-h-[95vh] sm:max-h-[90vh] overflow-y-auto overflow-x-hidden custom-scrollbar"
              >
                {/* Header */}
                <div className="flex justify-between items-center mb-3 sm:mb-4 pb-2 sm:pb-3 border-b-2 border-yellow-500/20">
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    <div className="p-1.5 bg-yellow-500/10 rounded-lg flex-shrink-0">
                      <User className="h-4 w-4 text-yellow-400" />
                    </div>
                    <h3 className="text-base sm:text-lg font-bold text-white truncate">
                      {selectedProfile?.role === 'recipient' ? 'Requester Profile' : selectedProfile?.role === 'volunteer' ? 'Volunteer Profile' : 'User Profile'}
                    </h3>
                  </div>
                  <button
                    onClick={() => setShowProfileModal(false)}
                    className="text-gray-400 hover:text-white transition-colors p-1.5 hover:bg-navy-800 rounded-lg flex-shrink-0 ml-2"
                    aria-label="Close profile modal"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>

                {/* Profile Content */}
                <div className="space-y-3 sm:space-y-4">
                  <>
                    {/* Profile Header */}
                    <div className="relative flex items-center gap-4">
                      <div className="relative flex-shrink-0">
                        <div 
                          className="h-28 w-28 sm:h-36 sm:w-36 rounded-full overflow-hidden border-2 border-yellow-500 shadow-lg flex items-center justify-center cursor-pointer hover:border-yellow-400 transition-colors"
                          onClick={() => setShowProfileImageModal(true)}
                          title="View profile picture"
                        >
                          {selectedProfile?.profile_image_url ? (
                            <img 
                              src={selectedProfile.profile_image_url} 
                              alt={selectedProfile?.name || selectedProfile?.full_name || 'User'}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="h-full w-full bg-navy-700 flex items-center justify-center">
                              <User className="h-16 w-16 sm:h-20 sm:w-20 text-yellow-400" />
                            </div>
                          )}
                        </div>
                        {/* View Overlay - Shows on hover */}
                        <div
                          className="absolute inset-0 h-28 w-28 sm:h-36 sm:w-36 rounded-full bg-black bg-opacity-50 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity pointer-events-none cursor-pointer"
                        >
                          <Camera className="h-6 w-6 text-white" />
                        </div>
                      </div>
                      
                      <div className="flex flex-col justify-center min-w-0 flex-1">
                        <h4 className="text-white font-bold text-base sm:text-lg mb-1">
                          {selectedProfile?.name || selectedProfile?.full_name || 'Anonymous'}
                        </h4>
                        <div className="flex flex-wrap items-center gap-2 text-xs">
                          <span className="text-yellow-400 flex items-center gap-1 whitespace-nowrap">
                            <Calendar className="h-3.5 w-3.5 flex-shrink-0" />
                            {(() => {
                              const memberDate = selectedProfile?.created_at || selectedProfile?.user_created_at || selectedProfile?.joined_at || selectedProfile?.signup_date;
                              if (memberDate) {
                                try {
                                  const date = new Date(memberDate);
                                  if (!isNaN(date.getTime())) {
                                    return `Member since ${date.toLocaleDateString('en-US', { 
                                      year: 'numeric', 
                                      month: 'short', 
                                      day: 'numeric' 
                                    })}`;
                                  }
                                } catch (e) {
                                  console.error('Error parsing date:', e);
                                }
                              }
                              return 'New member';
                            })()}
                          </span>
                          {selectedProfile?.account_type && selectedProfile.account_type !== 'individual' && (
                            <span className="text-yellow-400 flex items-center gap-1 whitespace-nowrap">
                              <Building2 className="h-3.5 w-3.5 flex-shrink-0" />
                              {selectedProfile.account_type === 'business' ? 'Business' : 'Organization'}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* ID Verification Badge - Top Right Corner */}
                      <div className="absolute top-0 right-0 flex-shrink-0">
                        <IDVerificationBadge
                          idStatus={selectedProfile?.id_verification_status}
                          hasIdUploaded={selectedProfile?.primary_id_type && selectedProfile?.primary_id_number}
                          size="sm"
                          showText={true}
                          showDescription={false}
                        />
                      </div>
                    </div>

                    {/* Basic Information and Contact Information - 2 Column Layout */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {/* Basic Information */}
                      <div className="bg-navy-800/30 rounded-lg p-3 border border-yellow-500/20">
                        <h5 className="text-white font-semibold mb-2 text-sm flex items-center gap-2">
                          <User className="h-3.5 w-3.5 text-yellow-400 flex-shrink-0" />
                          Basic Information
                        </h5>
                        <div className="space-y-2 text-xs sm:text-sm">
                          <div className="flex items-start gap-2 min-w-0">
                            <span className="text-yellow-400 font-medium flex-shrink-0">Birthdate:</span>
                            <span className={`break-words flex-1 ${selectedProfile?.birthdate ? 'text-white' : 'text-gray-400 italic'}`}>
                              {selectedProfile?.birthdate ? (
                                new Date(selectedProfile.birthdate).toLocaleDateString('en-US', {
                                  year: 'numeric',
                                  month: 'long',
                                  day: 'numeric'
                                })
                              ) : (
                                'Not provided'
                              )}
                            </span>
                          </div>
                          <div className="flex items-start gap-2 min-w-0">
                            <span className="text-yellow-400 font-medium flex-shrink-0">Age:</span>
                            <span className={`break-words flex-1 ${selectedProfile?.birthdate ? 'text-white' : 'text-gray-400 italic'}`}>
                              {selectedProfile?.birthdate ? (calculateAge(selectedProfile.birthdate) || 'Not available') : 'Not provided'}
                            </span>
                          </div>
                          <div className="flex items-start gap-2 min-w-0">
                            <span className="text-yellow-400 font-medium flex-shrink-0">Account Type:</span>
                            <span className={`break-words flex-1 ${selectedProfile?.account_type ? 'text-white' : 'text-gray-400 italic'}`}>
                              {selectedProfile?.account_type ? (selectedProfile.account_type === 'business' ? 'Business/Organization' : 'Individual') : 'Not provided'}
                            </span>
                          </div>
                          {selectedProfile?.account_type === 'business' && (
                            <>
                              <div className="flex items-start gap-2 min-w-0">
                                <span className="text-yellow-400 font-medium flex-shrink-0">Organization:</span>
                                <span className={`break-words flex-1 ${selectedProfile?.organization_name ? 'text-white' : 'text-gray-400 italic'}`}>
                                  {selectedProfile?.organization_name || 'Not provided'}
                                </span>
                              </div>
                              <div className="flex items-start gap-2 min-w-0">
                                <span className="text-yellow-400 font-medium flex-shrink-0">Website:</span>
                                {selectedProfile?.website_link ? (
                                  <a
                                    href={selectedProfile.website_link}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-yellow-300 hover:text-yellow-200 break-all flex-1 flex items-center gap-1"
                                  >
                                    <Globe className="h-3 w-3 flex-shrink-0" />
                                    {selectedProfile.website_link}
                                  </a>
                                ) : (
                                  <span className="text-gray-400 italic break-words flex-1">Not provided</span>
                                )}
                              </div>
                            </>
                          )}
                        </div>
                      </div>

                      {/* Contact Information */}
                      <div className="bg-navy-800/30 rounded-lg p-3 border border-yellow-500/20">
                        <h5 className="text-white font-semibold mb-2 text-sm flex items-center gap-2">
                          <Phone className="h-3.5 w-3.5 text-yellow-400 flex-shrink-0" />
                          Contact Information
                        </h5>
                        <div className="space-y-2 text-xs sm:text-sm">
                          <div className="flex items-start gap-2 min-w-0">
                            <span className="text-yellow-400 font-medium flex-shrink-0">Phone:</span>
                            <span className="text-white break-words flex-1">
                              {selectedProfile?.phone_number || selectedProfile?.phone ? (
                                <a
                                  href={`tel:${selectedProfile.phone_number || selectedProfile.phone}`}
                                  className="text-white hover:text-yellow-300 transition-colors break-all"
                                >
                                  {selectedProfile.phone_number || selectedProfile.phone}
                                </a>
                              ) : (
                                <span className="text-gray-400 italic">Not provided</span>
                              )}
                            </span>
                          </div>
                          <div className="flex items-start gap-2 min-w-0">
                            <span className="text-yellow-400 font-medium flex-shrink-0">Email:</span>
                            <span className="text-white break-words flex-1">
                              {selectedProfile?.email ? (
                                <a
                                  href={`mailto:${selectedProfile.email}`}
                                  className="text-white hover:text-yellow-300 transition-colors break-all"
                                >
                                  {selectedProfile.email}
                                </a>
                              ) : (
                                <span className="text-gray-400 italic">Not provided</span>
                              )}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Address Details - Combined Location and Address */}
                    <div className="bg-navy-800/30 rounded-lg p-3 border border-yellow-500/20">
                      <h5 className="text-white font-semibold mb-2 text-sm flex items-center gap-2">
                        <MapPin className="h-3.5 w-3.5 text-yellow-400 flex-shrink-0" />
                        Address Details
                      </h5>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-xs sm:text-sm">
                        <div className="flex items-start gap-2 min-w-0">
                          <span className="text-yellow-400 font-medium flex-shrink-0">Street:</span>
                          <span className={`break-words flex-1 ${selectedProfile?.address_street ? 'text-white' : 'text-gray-400 italic'}`}>
                            {selectedProfile?.address_street || 'Not provided'}
                          </span>
                        </div>
                        <div className="flex items-start gap-2 min-w-0">
                          <span className="text-yellow-400 font-medium flex-shrink-0">Barangay:</span>
                          <span className={`break-words flex-1 ${selectedProfile?.address_barangay ? 'text-white' : 'text-gray-400 italic'}`}>
                            {selectedProfile?.address_barangay || 'Not provided'}
                          </span>
                        </div>
                        <div className="flex items-start gap-2 min-w-0">
                          <span className="text-yellow-400 font-medium flex-shrink-0">Landmark:</span>
                          <span className={`break-words flex-1 ${selectedProfile?.address_landmark ? 'text-white' : 'text-gray-400 italic'}`}>
                            {selectedProfile?.address_landmark || 'Not provided'}
                          </span>
                        </div>
                        <div className="flex items-start gap-2 min-w-0">
                          <span className="text-yellow-400 font-medium flex-shrink-0">City:</span>
                          <span className={`break-words flex-1 ${selectedProfile?.city ? 'text-white' : 'text-gray-400 italic'}`}>
                            {selectedProfile?.city || 'Not provided'}
                          </span>
                        </div>
                        <div className="flex items-start gap-2 min-w-0">
                          <span className="text-yellow-400 font-medium flex-shrink-0">Province:</span>
                          <span className={`break-words flex-1 ${selectedProfile?.province ? 'text-white' : 'text-gray-400 italic'}`}>
                            {selectedProfile?.province || 'Not provided'}
                          </span>
                        </div>
                        <div className="flex items-start gap-2 min-w-0">
                          <span className="text-yellow-400 font-medium flex-shrink-0">ZIP Code:</span>
                          <span className={`break-words flex-1 ${selectedProfile?.zip_code ? 'text-white' : 'text-gray-400 italic'}`}>
                            {selectedProfile?.zip_code || 'Not provided'}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Emergency Contact and Recipient Details - 2 Column Layout */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {/* Emergency Contact */}
                      {selectedProfile?.role !== 'volunteer' && (
                        <div className="bg-navy-800/30 rounded-lg p-3 border border-yellow-500/20">
                          <h5 className="text-white font-semibold mb-2 text-sm flex items-center gap-2">
                            <AlertCircle className="h-3.5 w-3.5 text-yellow-400 flex-shrink-0" />
                            Emergency Contact
                          </h5>
                          <div className="space-y-2 text-xs sm:text-sm">
                            <div className="flex items-start gap-2 min-w-0">
                              <span className="text-yellow-400 font-medium flex-shrink-0">Name:</span>
                              <span className={`break-words flex-1 ${selectedProfile?.emergency_contact_name ? 'text-white' : 'text-gray-400 italic'}`}>
                                {selectedProfile?.emergency_contact_name || 'Not provided'}
                              </span>
                            </div>
                            <div className="flex items-start gap-2 min-w-0">
                              <span className="text-yellow-400 font-medium flex-shrink-0">Phone:</span>
                              {selectedProfile?.emergency_contact_phone ? (
                                <a
                                  href={`tel:${selectedProfile.emergency_contact_phone}`}
                                  className="text-white hover:text-yellow-300 transition-colors break-all flex-1"
                                >
                                  {selectedProfile.emergency_contact_phone}
                                </a>
                              ) : (
                                <span className="text-gray-400 italic break-words flex-1">Not provided</span>
                              )}
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Recipient-specific information */}
                      {selectedProfile?.role === 'recipient' && (
                        <div className="bg-navy-800/30 rounded-lg p-3 border border-yellow-500/20">
                          <h5 className="text-white font-semibold mb-2 text-sm flex items-center gap-2">
                            <Heart className="h-3.5 w-3.5 text-yellow-400 flex-shrink-0" />
                            Recipient Details
                          </h5>
                          <div className="space-y-2 text-xs sm:text-sm">
                            <div className="flex items-start gap-2 min-w-0">
                              <span className="text-yellow-400 font-medium flex-shrink-0">Household Size:</span>
                              <span className={`break-words flex-1 ${selectedProfile?.household_size ? 'text-white' : 'text-gray-400 italic'}`}>
                                {selectedProfile?.household_size ? (
                                  `${selectedProfile.household_size} ${selectedProfile.household_size === 1 ? 'person' : 'people'}`
                                ) : (
                                  'Not provided'
                                )}
                              </span>
                            </div>
                            <div className="flex items-start gap-2 min-w-0">
                              <span className="text-yellow-400 font-medium flex-shrink-0">ID Type:</span>
                              <span className={`break-words flex-1 ${selectedProfile?.primary_id_type ? 'text-white' : 'text-gray-400 italic'}`}>
                                {selectedProfile?.primary_id_type ? getIDTypeLabel(selectedProfile.primary_id_type) : 'No ID'}
                              </span>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Assistance Needs - Separate Container */}
                    {selectedProfile?.role === 'recipient' && (
                      <div className="bg-navy-800/30 rounded-lg p-3 border border-yellow-500/20">
                        <h5 className="text-white font-semibold mb-2 text-sm flex items-center gap-2">
                          <Heart className="h-3.5 w-3.5 text-yellow-400 flex-shrink-0" />
                          Assistance Needs
                        </h5>
                        {selectedProfile?.assistance_needs?.length > 0 ? (
                          <div className="flex gap-1.5 overflow-x-auto custom-scrollbar">
                            {selectedProfile.assistance_needs.map((need, i) => (
                              <span key={i} className="bg-navy-700 text-xs px-2 py-1 rounded-full text-yellow-300 border border-yellow-500/30 font-medium whitespace-nowrap flex-shrink-0">
                                {need}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <p className="text-gray-400 italic text-xs">Not provided</p>
                        )}
                      </div>
                    )}

                    {/* Volunteer-specific information - 2x2 Grid */}
                    {selectedProfile?.role === 'volunteer' && (
                      <div className="bg-navy-800/30 rounded-lg p-3 border border-yellow-500/20">
                        <h5 className="text-white font-semibold mb-2 text-sm flex items-center gap-2">
                          <Truck className="h-3.5 w-3.5 text-yellow-400 flex-shrink-0" />
                          Volunteer Details
                        </h5>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs sm:text-sm">
                          <div className="flex items-start gap-2 min-w-0">
                            <span className="text-yellow-400 font-medium flex-shrink-0">ID Type:</span>
                            <span className={`break-words flex-1 ${selectedProfile?.primary_id_type ? 'text-white' : 'text-gray-400 italic'}`}>
                              {selectedProfile?.primary_id_type ? getIDTypeLabel(selectedProfile.primary_id_type) : 'Not provided'}
                            </span>
                          </div>
                          <div className="flex items-start gap-2 min-w-0">
                            <span className="text-yellow-400 font-medium flex-shrink-0">Experience:</span>
                            <span className={`break-words flex-1 ${selectedProfile?.volunteer_experience ? 'text-white' : 'text-gray-400 italic'}`}>
                              {selectedProfile?.volunteer_experience || 'Not provided'}
                            </span>
                          </div>
                          <div className="flex items-start gap-2 min-w-0">
                            <span className="text-yellow-400 font-medium flex-shrink-0">Insurance:</span>
                            <span className={`break-words flex-1 ${selectedProfile?.has_insurance !== undefined ? 'text-white' : 'text-gray-400 italic'}`}>
                              {selectedProfile?.has_insurance !== undefined ? (selectedProfile.has_insurance ? 'Yes' : 'No') : 'Not provided'}
                            </span>
                          </div>
                          {selectedProfile?.has_insurance && (
                            <div className="flex items-start gap-2 min-w-0">
                              <span className="text-yellow-400 font-medium flex-shrink-0">Insurance Provider:</span>
                              <span className={`break-words flex-1 ${selectedProfile?.insurance_provider ? 'text-white' : 'text-gray-400 italic'}`}>
                                {selectedProfile?.insurance_provider || 'Not provided'}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Preferred Delivery Types and Special Skills - 2 Column Layout */}
                    {selectedProfile?.role === 'volunteer' && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {/* Preferred Delivery Types */}
                        <div className="bg-navy-800/30 rounded-lg p-3 border border-yellow-500/20">
                          <h5 className="text-white font-semibold mb-2 text-sm flex items-center gap-2">
                            <Truck className="h-3.5 w-3.5 text-yellow-400 flex-shrink-0" />
                            Preferred Delivery Types
                          </h5>
                          {selectedProfile?.preferred_delivery_types?.length > 0 ? (
                            <div className="flex gap-1.5 overflow-x-auto custom-scrollbar">
                              {selectedProfile.preferred_delivery_types.map((type, i) => (
                                <span key={i} className="bg-navy-700 text-xs px-2 py-1 rounded-full text-yellow-300 border border-yellow-500/30 font-medium whitespace-nowrap flex-shrink-0">
                                  {type}
                                </span>
                              ))}
                            </div>
                          ) : (
                            <p className="text-gray-400 italic text-xs">Not provided</p>
                          )}
                        </div>

                        {/* Special Skills */}
                        <div className="bg-navy-800/30 rounded-lg p-3 border border-yellow-500/20">
                          <h5 className="text-white font-semibold mb-2 text-sm flex items-center gap-2">
                            <Star className="h-3.5 w-3.5 text-yellow-400 flex-shrink-0" />
                            Special Skills
                          </h5>
                          {selectedProfile?.special_skills?.length > 0 ? (
                            <div className="flex gap-1.5 overflow-x-auto custom-scrollbar">
                              {selectedProfile.special_skills.map((skill, i) => (
                                <span key={i} className="bg-navy-700 text-xs px-2 py-1 rounded-full text-yellow-300 border border-yellow-500/30 font-medium whitespace-nowrap flex-shrink-0">
                                  {skill}
                                </span>
                              ))}
                            </div>
                          ) : (
                            <p className="text-gray-400 italic text-xs">Not provided</p>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Languages Spoken and Communication Preferences - 2 Column Layout */}
                    {selectedProfile?.role === 'volunteer' && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {/* Languages Spoken */}
                        <div className="bg-navy-800/30 rounded-lg p-3 border border-yellow-500/20">
                          <h5 className="text-white font-semibold mb-2 text-sm flex items-center gap-2">
                            <MessageSquare className="h-3.5 w-3.5 text-yellow-400 flex-shrink-0" />
                            Languages Spoken
                          </h5>
                          {selectedProfile?.languages_spoken?.length > 0 ? (
                            <div className="flex gap-1.5 overflow-x-auto custom-scrollbar">
                              {selectedProfile.languages_spoken.map((lang, i) => (
                                <span key={i} className="bg-navy-700 text-xs px-2 py-1 rounded-full text-yellow-300 border border-yellow-500/30 font-medium whitespace-nowrap flex-shrink-0">
                                  {lang}
                                </span>
                              ))}
                            </div>
                          ) : (
                            <p className="text-gray-400 italic text-xs">Not provided</p>
                          )}
                        </div>

                        {/* Communication Preferences */}
                        <div className="bg-navy-800/30 rounded-lg p-3 border border-yellow-500/20">
                          <h5 className="text-white font-semibold mb-2 text-sm flex items-center gap-2">
                            <Mail className="h-3.5 w-3.5 text-yellow-400 flex-shrink-0" />
                            Communication Preferences
                          </h5>
                          {selectedProfile?.communication_preferences?.length > 0 ? (
                            <div className="flex gap-1.5 overflow-x-auto custom-scrollbar">
                              {selectedProfile.communication_preferences.map((pref, i) => (
                                <span key={i} className="bg-navy-700 text-xs px-2 py-1 rounded-full text-yellow-300 border border-yellow-500/30 font-medium whitespace-nowrap flex-shrink-0">
                                  {pref}
                                </span>
                              ))}
                            </div>
                          ) : (
                            <p className="text-gray-400 italic text-xs">Not provided</p>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Donor-specific information */}
                    {selectedProfile?.role === 'donor' && (
                      <div className="bg-navy-800/30 rounded-lg p-3 border border-yellow-500/20">
                        <h5 className="text-white font-semibold mb-2 text-sm flex items-center gap-2">
                          <Gift className="h-3.5 w-3.5 text-yellow-400 flex-shrink-0" />
                          Donation Preferences
                        </h5>
                        <div className="space-y-2 text-xs sm:text-sm">
                          <div className="min-w-0">
                            <span className="text-yellow-400 font-medium block mb-1.5 text-xs">Donation Types:</span>
                            {selectedProfile?.donation_types?.length > 0 ? (
                              <div className="flex flex-wrap gap-1.5">
                                {selectedProfile.donation_types.map((type, i) => (
                                  <span key={i} className="bg-navy-700 text-xs px-2 py-1 rounded-full text-yellow-300 border border-yellow-500/30 font-medium break-words">
                                    {type}
                                  </span>
                                ))}
                              </div>
                            ) : (
                              <p className="text-gray-400 italic text-xs">Not provided</p>
                            )}
                          </div>
                          <div className="flex items-start gap-2 min-w-0">
                            <span className="text-yellow-400 font-medium flex-shrink-0">Frequency:</span>
                            <span className={`break-words flex-1 ${selectedProfile?.donation_frequency ? 'text-white' : 'text-gray-400 italic'}`}>
                              {selectedProfile?.donation_frequency || 'Not provided'}
                            </span>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Bio/About */}
                    <div className="bg-navy-800/30 rounded-lg p-3 border border-yellow-500/20">
                      <h5 className="text-white font-semibold mb-2 text-sm flex items-center gap-2">
                        <MessageSquare className="h-3.5 w-3.5 text-yellow-400 flex-shrink-0" />
                        About
                      </h5>
                      <p className={`text-xs sm:text-sm leading-relaxed break-words ${selectedProfile?.bio ? 'text-yellow-200' : 'text-gray-400 italic'}`}>
                        {selectedProfile?.bio || 'Not provided'}
                      </p>
                    </div>

                    {/* Delivery Notes - Separate Section */}
                    {selectedProfile?.role === 'volunteer' && (
                      <div className="bg-navy-800/30 rounded-lg p-3 border border-yellow-500/20">
                        <h5 className="text-white font-semibold mb-2 text-sm flex items-center gap-2">
                          <Truck className="h-3.5 w-3.5 text-yellow-400 flex-shrink-0" />
                          Delivery Notes
                        </h5>
                        <p className={`text-xs sm:text-sm leading-relaxed break-words ${selectedProfile?.delivery_notes ? 'text-white' : 'text-gray-400 italic'}`}>
                          {selectedProfile?.delivery_notes || 'Not provided'}
                        </p>
                      </div>
                    )}
                  </>
                </div>

                {/* Footer */}
                <div className="mt-3 sm:mt-4 pt-3 border-t border-yellow-500/20">
                  <button
                    onClick={() => setShowProfileModal(false)}
                    className="btn btn-primary text-sm py-2 w-full"
                  >
                    Close
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* Profile Image Viewer Modal */}
        <AnimatePresence>
          {showProfileImageModal && selectedProfile && (
            <div className="fixed inset-0 z-[60]">
              {/* Backdrop */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setShowProfileImageModal(false)}
                className="absolute inset-0 bg-black/90 backdrop-blur-sm"
              />
              
              {/* Image Container */}
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="relative w-full h-full flex items-center justify-center p-4 sm:p-6"
                onClick={(e) => e.stopPropagation()}
              >
                {selectedProfile?.profile_image_url ? (
                  <>
                    <img
                      src={selectedProfile.profile_image_url}
                      alt={selectedProfile?.name || selectedProfile?.full_name || 'Profile'}
                      className="max-w-full max-h-[85vh] w-auto h-auto object-contain rounded-lg shadow-2xl"
                    />
                    {/* Close Button */}
                    <button
                      type="button"
                      onClick={() => setShowProfileImageModal(false)}
                      className="absolute top-4 right-4 p-2.5 rounded-full bg-black/70 hover:bg-black/90 text-white transition-colors backdrop-blur-sm z-10 shadow-lg"
                      title="Close"
                      aria-label="Close image viewer"
                    >
                      <X className="h-5 w-5" />
                    </button>
                  </>
                ) : (
                  <div className="relative flex flex-col items-center justify-center text-center">
                    <div className="w-32 h-32 sm:w-40 sm:h-40 rounded-full bg-navy-800 border-4 border-navy-700 flex items-center justify-center mb-4">
                      <User className="h-16 w-16 sm:h-20 sm:w-20 text-yellow-400" />
                    </div>
                    <p className="text-gray-400 text-sm sm:text-base">No profile picture uploaded</p>
                    {/* Close Button */}
                    <button
                      type="button"
                      onClick={() => setShowProfileImageModal(false)}
                      className="absolute top-4 right-4 p-2.5 rounded-full bg-black/70 hover:bg-black/90 text-white transition-colors backdrop-blur-sm z-10 shadow-lg"
                      title="Close"
                      aria-label="Close image viewer"
                    >
                      <X className="h-5 w-5" />
                    </button>
                  </div>
                )}
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}

export default PendingRequestsPage
