import React, { useEffect, useState, useCallback } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { motion } from 'framer-motion'
import { 
  Gift, 
  Heart, 
  Truck, 
  Calendar, 
  Users, 
  TrendingUp,
  Plus,
  Eye,
  Package,
  Clock,
  CheckCircle,
  Award,
  BarChart3,
  PieChart,
  Activity,
  Target,
  Bell,
  ArrowUpRight,
  Percent,
  Layers,
  Info
} from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import { db, supabase } from '../../lib/supabase'
import { DashboardSkeleton } from '../../components/ui/Skeleton'
import ProfileCompletionPrompt from '../../components/ui/ProfileCompletionPrompt'
import { IDVerificationBadge } from '../../components/ui/VerificationBadge'
import RealTimeWorkflowStatus from '../../components/ui/RealTimeWorkflowStatus'
import WorkflowGuideModal from '../../components/ui/WorkflowGuideModal'

const DashboardPage = () => {
  const { profile, isDonor, isRecipient, isVolunteer, isAdmin } = useAuth()
  const [stats, setStats] = useState({})
  const [recentActivity, setRecentActivity] = useState([])
  const [completedEvents, setCompletedEvents] = useState([])
  const [donations, setDonations] = useState([])
  const [categoryBreakdown, setCategoryBreakdown] = useState([])
  const [pendingActions, setPendingActions] = useState([])
  const [loading, setLoading] = useState(true)
  const [showWorkflowGuide, setShowWorkflowGuide] = useState(false)
  const navigate = useNavigate()
  const location = useLocation()

  // CRITICAL: Check if account is suspended - redirect to login immediately
  useEffect(() => {
    if (profile && (profile.is_active === false || profile.is_active === 'false' || profile.is_active === 0)) {
      console.error('🚨 Suspended account detected in DashboardPage - redirecting to login')
      navigate('/login', { replace: true, state: { error: 'Your account has been suspended. Please contact the administrator for assistance.' } })
    }
  }, [profile, navigate])

  const loadDashboardData = useCallback(async () => {
    if (!profile?.id) {
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      // Load role-specific data
      if (isDonor) {
        const [donationsData, events, notifications] = await Promise.all([
          db.getDonations({ donor_id: profile.id }),
          db.getUserCompletedEvents(profile.id),
          db.getUserNotifications(profile.id, 50).catch(() => [])
        ])
        
        setDonations(donationsData || [])
        
        // Calculate comprehensive stats
        const totalDonations = donationsData.length
        const availableDonations = donationsData.filter(d => d.status === 'available').length
        const inProgressDonations = donationsData.filter(d => ['matched', 'claimed', 'in_transit'].includes(d.status)).length
        const completedDonations = donationsData.filter(d => ['delivered', 'completed'].includes(d.status)).length
        const cancelledDonations = donationsData.filter(d => d.status === 'cancelled').length
        const expiredDonations = donationsData.filter(d => d.status === 'expired').length
        
        // Calculate completion rate
        const completedCount = completedDonations
        const totalProcessed = totalDonations - cancelledDonations - expiredDonations
        const completionRate = totalProcessed > 0 ? Math.round((completedCount / totalProcessed) * 100) : 0
        
        // Calculate category breakdown
        const categoryMap = {}
        donationsData.forEach(donation => {
          const category = donation.category || 'Other'
          categoryMap[category] = (categoryMap[category] || 0) + 1
        })
        const breakdown = Object.entries(categoryMap)
          .map(([category, count]) => ({ category, count }))
          .sort((a, b) => b.count - a.count)
          .slice(0, 6)
        setCategoryBreakdown(breakdown)
        
        // Get pending actions from notifications
        const pending = (notifications || [])
          .filter(n => !n.read_at && [
            'donation_request',
            'volunteer_request',
            'delivery_completed',
            'pickup_scheduled',
            'pickup_completed',
            'direct_delivery_request',
            'direct_delivery_completed'
          ].includes(n.type))
          .slice(0, 5)
        setPendingActions(pending)
        
        setStats({
          totalDonations,
          activeDonations: availableDonations,
          inProgressDonations,
          completedDonations,
          cancelledDonations,
          expiredDonations,
          completedEvents: events.length,
          completionRate,
          totalItemsDelivered: completedDonations
        })
        setRecentActivity(donationsData.slice(0, 5))
        setCompletedEvents(events || [])
      } else if (isRecipient) {
        const [requests, notifications] = await Promise.all([
          db.getRequests({ requester_id: profile.id, limit: 100 }),
          db.getUserNotifications(profile.id, 50).catch(() => [])
        ])
        
        setDonations(requests || [])
        
        // Calculate comprehensive stats
        const totalRequests = requests.length
        const openRequests = requests.filter(r => r.status === 'open').length
        const fulfilledRequests = requests.filter(r => r.status === 'fulfilled').length
        const closedRequests = requests.filter(r => r.status === 'closed').length
        
        // Calculate fulfillment rate
        const totalProcessed = totalRequests - closedRequests
        const fulfillmentRate = totalProcessed > 0 ? Math.round((fulfilledRequests / totalProcessed) * 100) : 0
        
        // Get approved donations count from JSONB claims in donations table
        let approvedDonationsCount = 0
        try {
          // Fetch donations that have claims with this recipient - limit to 500 for performance
          const { data: donations, error: donationsError } = await supabase
            .from('donations')
            .select('id, claims')
            .not('claims', 'is', null)
            .order('created_at', { ascending: false })
            .limit(500)
          
          if (!donationsError && donations) {
            // Count claims where recipient_id matches and status is in the allowed list
            const validStatuses = new Set(['claimed', 'delivered', 'completed'])
            donations.forEach(donation => {
              if (Array.isArray(donation.claims)) {
                donation.claims.forEach(claim => {
                  if (claim.recipient_id === profile.id && 
                      validStatuses.has(claim.status)) {
                    approvedDonationsCount++
                  }
                })
              }
            })
          }
        } catch (err) {
          console.error('Error loading approved donations count:', err)
        }
        
        // Calculate category breakdown
        const categoryMap = {}
        requests.forEach(request => {
          const category = request.category || 'Other'
          categoryMap[category] = (categoryMap[category] || 0) + 1
        })
        const breakdown = Object.entries(categoryMap)
          .map(([category, count]) => ({ category, count }))
          .sort((a, b) => b.count - a.count)
          .slice(0, 6)
        setCategoryBreakdown(breakdown)
        
        // Get pending actions from notifications
        const pending = (notifications || [])
          .filter(n => !n.read_at && [
            'donation_approved',
            'delivery_completed',
            'pickup_scheduled',
            'pickup_completed',
            'direct_delivery_completed',
            'rating_reminder'
          ].includes(n.type))
          .slice(0, 5)
        setPendingActions(pending)
        
        setStats({
          totalRequests,
          openRequests,
          fulfilledRequests,
          closedRequests,
          fulfillmentRate,
          approvedDonations: approvedDonationsCount,
          itemsReceived: fulfilledRequests
        })
        setRecentActivity(requests.slice(0, 5))
      } else if (isAdmin) {
        // Load admin stats with optimized counts
        const [donationCounts, requestCounts] = await Promise.all([
          db.getDonationCounts(),
          db.getRequestCounts()
        ])
        
        // Fetch limited data for recent activity only
        const [recentDonations, recentRequests] = await Promise.all([
          db.getDonations({ limit: 10 }),
          db.getRequests({ limit: 10 })
        ])
        
        setStats({
          totalDonations: donationCounts.total,
          totalRequests: requestCounts.total,
          totalUsers: 0 // This would need a proper count function
        })
        setRecentActivity([...recentDonations.slice(0, 3), ...recentRequests.slice(0, 2)])
      }
    } catch (error) {
      console.error('Error loading dashboard data:', error)
    } finally {
      setLoading(false)
    }
  }, [profile?.id, isDonor, isRecipient, isAdmin])

  useEffect(() => {
    if (!profile) {
      setLoading(false)
      return
    }
    
    // Redirect based on role to ensure users see the correct dashboard
    if (isVolunteer) {
      navigate('/volunteer-dashboard', { replace: true })
      return
    }
    
    // Log profile info for debugging
    console.log('Dashboard - Profile role:', profile.role)
    console.log('Dashboard - Role checks:', { isDonor, isRecipient, isVolunteer, isAdmin })
    
    loadDashboardData()

    // Set up real-time subscriptions for live updates
    let donationsSubscription
    let requestsSubscription

    if (supabase && profile?.id) {
      if (isDonor) {
        // Subscribe to donation changes for donors
        donationsSubscription = supabase
          .channel('dashboard_donations')
          .on(
            'postgres_changes',
            {
              event: '*',
              schema: 'public',
              table: 'donations',
              filter: `donor_id=eq.${profile.id}`
            },
            () => {
              console.log('📊 Dashboard donation change detected')
              loadDashboardData()
            }
          )
          .subscribe()
      } else if (isRecipient) {
        // Subscribe to request changes for recipients
        requestsSubscription = supabase
          .channel('dashboard_requests')
          .on(
            'postgres_changes',
            {
              event: '*',
              schema: 'public',
              table: 'donation_requests',
              filter: `requester_id=eq.${profile.id}`
            },
            () => {
              console.log('📊 Dashboard request change detected')
              loadDashboardData()
            }
          )
          .subscribe()
      }
    }

    // Cleanup subscriptions
    return () => {
      if (donationsSubscription) {
        supabase.removeChannel(donationsSubscription)
      }
      if (requestsSubscription) {
        supabase.removeChannel(requestsSubscription)
      }
    }
  }, [profile, isVolunteer, navigate, loadDashboardData, isDonor, isRecipient])

  // Refresh data when navigating to this page
  useEffect(() => {
    if (profile && location.pathname === '/dashboard') {
      loadDashboardData()
    }
  }, [location.pathname, profile, loadDashboardData])

  const getDashboardCards = () => {
    if (isDonor) {
      return [
        {
          title: 'Post New Donation',
          description: 'Share items with your community',
          icon: Plus,
          color: 'bg-blue-500',
          link: '/post-donation'
        },
        {
          title: 'My Donations',
          description: 'Manage your donations',
          icon: Gift,
          color: 'bg-green-500',
          link: '/my-donations'
        },
        {
          title: 'Browse Requests',
          description: 'See what recipients need',
          icon: Users,
          color: 'bg-pink-500',
          link: '/browse-requests'
        },
        {
          title: 'Browse Events',
          description: 'Join community events',
          icon: Calendar,
          color: 'bg-purple-500',
          link: '/events'
        }
      ]
    } else if (isRecipient) {
      return [
        {
          title: 'Browse Donations',
          description: 'Find items you need',
          icon: Eye,
          color: 'bg-blue-500',
          link: '/browse-donations'
        },
        {
          title: 'Create Request',
          description: 'Request specific items',
          icon: Plus,
          color: 'bg-pink-500',
          link: '/create-request'
        },
        {
          title: 'My Requests',
          description: 'Track your requests',
          icon: Heart,
          color: 'bg-green-500',
          link: '/my-requests'
        }
      ]
    } else if (isAdmin) {
      return [
        {
          title: 'Admin Panel',
          description: 'Manage the platform',
          icon: Users,
          color: 'bg-red-500',
          link: '/admin'
        },
        {
          title: 'View All Donations',
          description: 'Monitor all donations',
          icon: Gift,
          color: 'bg-blue-500',
          link: '/admin/donations'
        },
        {
          title: 'Platform Statistics',
          description: 'View platform analytics',
          icon: TrendingUp,
          color: 'bg-green-500',
          link: '/admin/stats'
        }
      ]
    }
    return []
  }

  const getStatsCards = () => {
    if (isDonor) {
      return [
        { 
          label: 'Total Donations', 
          value: stats.totalDonations || 0, 
          icon: Gift,
          color: 'text-blue-400',
          bgColor: 'bg-blue-500/20'
        },
        { 
          label: 'Active Donations', 
          value: stats.activeDonations || 0, 
          icon: Clock,
          color: 'text-green-400',
          bgColor: 'bg-green-500/20'
        },
        { 
          label: 'In Progress', 
          value: stats.inProgressDonations || 0, 
          icon: Activity,
          color: 'text-yellow-400',
          bgColor: 'bg-yellow-500/20'
        },
        { 
          label: 'Completed', 
          value: stats.completedDonations || 0, 
          icon: CheckCircle,
          color: 'text-emerald-400',
          bgColor: 'bg-emerald-500/20'
        },
        { 
          label: 'Completion Rate', 
          value: `${stats.completionRate || 0}%`, 
          icon: Percent,
          color: 'text-purple-400',
          bgColor: 'bg-purple-500/20'
        },
        { 
          label: 'Items Delivered', 
          value: stats.totalItemsDelivered || 0, 
          icon: Package,
          color: 'text-pink-400',
          bgColor: 'bg-pink-500/20'
        }
      ]
    } else if (isRecipient) {
      return [
        { 
          label: 'Total Requests', 
          value: stats.totalRequests || 0, 
          icon: Heart,
          color: 'text-pink-400',
          bgColor: 'bg-pink-500/20'
        },
        { 
          label: 'Open Requests', 
          value: stats.openRequests || 0, 
          icon: Clock,
          color: 'text-blue-400',
          bgColor: 'bg-blue-500/20'
        },
        { 
          label: 'Fulfilled', 
          value: stats.fulfilledRequests || 0, 
          icon: CheckCircle,
          color: 'text-green-400',
          bgColor: 'bg-green-500/20'
        },
        { 
          label: 'Approved Donations', 
          value: stats.approvedDonations || 0, 
          icon: Package,
          color: 'text-yellow-400',
          bgColor: 'bg-yellow-500/20'
        },
        { 
          label: 'Fulfillment Rate', 
          value: `${stats.fulfillmentRate || 0}%`, 
          icon: Percent,
          color: 'text-purple-400',
          bgColor: 'bg-purple-500/20'
        },
        { 
          label: 'Items Received', 
          value: stats.itemsReceived || 0, 
          icon: Gift,
          color: 'text-emerald-400',
          bgColor: 'bg-emerald-500/20'
        }
      ]
    } else if (isAdmin) {
      return [
        { label: 'Total Donations', value: stats.totalDonations || 0, icon: Gift, color: 'text-blue-400', bgColor: 'bg-blue-500/20' },
        { label: 'Total Requests', value: stats.totalRequests || 0, icon: Heart, color: 'text-pink-400', bgColor: 'bg-pink-500/20' },
        { label: 'Total Users', value: stats.totalUsers || 0, icon: Users, color: 'text-purple-400', bgColor: 'bg-purple-500/20' }
      ]
    }
    return []
  }

  if (loading || !profile) {
    return <DashboardSkeleton />
  }

  const dashboardCards = getDashboardCards()
  const statsCards = getStatsCards()

  // Pre-compute impact percentages for donor "Your Impact" donut-style charts
  const donorCompletionPercent = isDonor ? (stats.completionRate || 0) : 0
  const donorConversionPercent = isDonor
    ? (stats.totalDonations > 0
        ? Math.round(((stats.completedDonations || 0) / stats.totalDonations) * 100)
        : 0)
    : 0
  const donorEventsPercent = isDonor
    ? Math.max(0, Math.min(100, (stats.completedEvents || 0) * 20))
    : 0

  // Handle case where user has unexpected role or no role-specific content
  if (!isDonor && !isRecipient && !isAdmin && profile) {
    return (
      <div className="min-h-screen py-8" style={{backgroundColor: '#00237d'}}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h1 className="text-3xl font-bold text-white mb-4">
              Welcome, {profile.name}!
            </h1>
            <p className="text-skyblue-300 mb-8">
              We're setting up your account. Your role: {profile.role}
            </p>
            <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-4 mb-8">
              <p className="text-yellow-400">
                If you're seeing this, there might be an issue with your account role. 
                Please contact support or try logging out and back in.
              </p>
            </div>
            <Link to="/profile" className="btn btn-primary">
              Update Profile
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen py-8" style={{backgroundColor: '#00237d'}}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="mb-8"
        >
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
            <div className="flex-1 min-w-0">
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white break-words">
                Welcome back, <span className="text-yellow-400">{profile?.name}</span>!
              </h1>
              <p className="text-sm sm:text-base text-yellow-200 mt-2">
                {isDonor && "Ready to make a difference with your donations?"}
                {isRecipient && "Let's find the support you need."}
                {isVolunteer && "Thank you for helping connect our community."}
                {isAdmin && "Manage the HopeLink platform."}
              </p>
            </div>
            {/* ID Verification Status Badge + Workflow Info */}
            <div className="flex items-center justify-start sm:justify-end flex-shrink-0 gap-2">
              <IDVerificationBadge
                idStatus={profile?.id_verification_status}
                hasIdUploaded={profile?.primary_id_type && profile?.primary_id_number}
                size="lg"
                showText={true}
                showDescription={false}
              />
              {(isDonor || isRecipient) && (
                <button
                  type="button"
                  onClick={() => setShowWorkflowGuide(true)}
                  className="inline-flex items-center justify-center h-8 sm:h-9 px-1 text-yellow-300 hover:text-yellow-200 transition-colors"
                  title="How the workflow works"
                  aria-label="How the workflow works"
                >
                  <Info className="h-5 w-5 sm:h-6 sm:w-6" />
                </button>
              )}
            </div>
          </div>
        </motion.div>

        {/* Profile Completion Prompt */}
        <ProfileCompletionPrompt />

        {/* Quick Stats */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8"
        >
          {statsCards.map((stat) => (
            <div key={stat.label || stat.title || `stat-${stat.value}`} className="card p-6 border border-gray-600 hover:border-yellow-400/50 transition-colors" style={{backgroundColor: '#001a5c'}}>
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <div className={`flex-shrink-0 p-3 rounded-lg ${stat.bgColor || 'bg-yellow-500/20'}`}>
                    <stat.icon className={`h-6 w-6 ${stat.color || 'text-yellow-300'}`} />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-yellow-200">{stat.label}</p>
                    <p className="text-2xl font-bold text-white mt-1">{stat.value}</p>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </motion.div>

        {/* Quick Actions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="mb-8"
        >
          <h2 className="text-xl font-semibold text-white mb-4">Quick Actions</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {dashboardCards.map((card) => (
            <Link
              key={card.title}
              to={card.link}
                className="card p-6 hover:shadow-lg transition-shadow group border border-gray-600"
                style={{backgroundColor: '#001a5c'}}
              >
                <div className="flex items-center">
                  <div className={`flex-shrink-0 p-3 rounded-lg ${card.color} text-white group-hover:scale-110 transition-transform`}>
                    <card.icon className="h-6 w-6" />
                  </div>
                  <div className="ml-4">
                    <h3 className="text-lg font-medium text-white group-hover:text-yellow-300 transition-colors">
                      {card.title}
                    </h3>
                    <p className="text-sm text-yellow-200">{card.description}</p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </motion.div>

        {/* Dashboard Content Grid */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8"
        >
          {/* Recent Activity */}
          <div className={`${isDonor ? 'lg:col-span-2' : 'lg:col-span-3'} card p-6 border border-gray-600`} style={{backgroundColor: '#001a5c'}}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-white flex items-center gap-2">
                <Activity className="h-5 w-5 text-yellow-400" />
                {(() => {
                  if (isDonor) return 'Recent Donations'
                  if (isRecipient) return 'Recent Requests'
                  return 'Recent Activity'
                })()}
              </h2>
              {isDonor && (
                <Link to="/my-donations" className="text-sm text-yellow-300 hover:text-yellow-200 flex items-center gap-1">
                  View All
                  <ArrowUpRight className="h-4 w-4" />
                </Link>
              )}
              {isRecipient && (
                <Link to="/my-requests" className="text-sm text-yellow-300 hover:text-yellow-200 flex items-center gap-1">
                  View All
                  <ArrowUpRight className="h-4 w-4" />
                </Link>
              )}
            </div>
            {recentActivity.length > 0 ? (
              <div className="space-y-3">
                {recentActivity.map((activity) => {
                  const activityIndex = recentActivity.indexOf(activity)
                  const getStatusConfig = (status) => {
                    const statusConfig = {
                      available: { label: 'Available', color: 'bg-green-500/20 text-green-400 border-green-500/40' },
                      matched: { label: 'Matched', color: 'bg-blue-500/20 text-blue-400 border-blue-500/40' },
                      claimed: { label: 'Claimed', color: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/40' },
                      in_transit: { label: 'In Transit', color: 'bg-purple-500/20 text-purple-400 border-purple-500/40' },
                      delivered: { label: 'Delivered', color: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40' },
                      completed: { label: 'Completed', color: 'bg-green-600/20 text-green-300 border-green-600/40' },
                      cancelled: { label: 'Cancelled', color: 'bg-red-500/20 text-red-400 border-red-500/40' },
                      expired: { label: 'Expired', color: 'bg-gray-500/20 text-gray-400 border-gray-500/40' },
                      open: { label: 'Open', color: 'bg-blue-500/20 text-blue-400 border-blue-500/40' },
                      fulfilled: { label: 'Fulfilled', color: 'bg-green-500/20 text-green-400 border-green-500/40' },
                      closed: { label: 'Closed', color: 'bg-gray-500/20 text-gray-400 border-gray-500/40' }
                    }
                    return statusConfig[status] || { label: status, color: 'bg-gray-500/20 text-gray-400 border-gray-500/40' }
                  }
                  
                  const statusConfig = getStatusConfig(activity.status)
                  let Icon = Activity
                  let linkTo = '#'
                  if (isDonor) {
                    Icon = Gift
                    linkTo = '/my-donations'
                  } else if (isRecipient) {
                    Icon = Heart
                    linkTo = '/my-requests'
                  }
                  
                  const activityId = activity.id || activity.request_id || `activity-${activity.title}-${activityIndex}`
                  
                  return (
                    <Link
                      key={activityId}
                      to={linkTo}
                      className="flex items-center space-x-3 p-3 rounded-lg border border-gray-600 hover:border-yellow-400/50 transition-all group"
                      style={{backgroundColor: '#001a5c'}}
                    >
                      <div className="flex-shrink-0">
                        <Icon className="h-5 w-5 text-yellow-300 group-hover:scale-110 transition-transform" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-white truncate group-hover:text-yellow-300 transition-colors">
                          {activity.title}
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className={`px-2 py-1 rounded text-xs font-semibold border ${statusConfig.color}`}>
                            {statusConfig.label}
                          </span>
                          {activity.category && (
                            <span className="text-xs text-yellow-200/70">
                              {activity.category}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="text-xs text-yellow-300/70 flex-shrink-0">
                        {new Date(activity.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </div>
                    </Link>
                  )
                })}
              </div>
            ) : (
              <div className="text-center py-8">
                {(() => {
                  if (isDonor) {
                    return (
                      <>
                        <Gift className="h-12 w-12 text-gray-600 mx-auto mb-3" />
                        <p className="text-yellow-300">No recent donations</p>
                        <p className="text-sm text-yellow-200 mt-1">Get started by posting your first donation!</p>
                        <Link to="/post-donation" className="mt-4 inline-block text-yellow-400 hover:text-yellow-300 text-sm font-medium">
                          Post Donation →
                        </Link>
                      </>
                    )
                  }
                  if (isRecipient) {
                    return (
                      <>
                        <Heart className="h-12 w-12 text-gray-600 mx-auto mb-3" />
                        <p className="text-yellow-300">No recent requests</p>
                        <p className="text-sm text-yellow-200 mt-1">Get started by creating your first request!</p>
                        <Link to="/create-request" className="mt-4 inline-block text-yellow-400 hover:text-yellow-300 text-sm font-medium">
                          Create Request →
                        </Link>
                      </>
                    )
                  }
                  return (
                    <>
                      <Activity className="h-12 w-12 text-gray-600 mx-auto mb-3" />
                      <p className="text-yellow-300">No recent activity</p>
                      <p className="text-sm text-yellow-200 mt-1">Get started with the quick actions above!</p>
                    </>
                  )
                })()}
              </div>
            )}
          </div>

          {/* Pending Actions */}
          {(isDonor || isRecipient) && (
            <div className="card p-6 border border-gray-600" style={{backgroundColor: '#001a5c'}}>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-white flex items-center gap-2">
                  <Bell className="h-5 w-5 text-yellow-400" />
                  Pending Actions
                </h2>
                {pendingActions.length > 0 && (
                  <span className="px-2 py-1 bg-yellow-500/20 border border-yellow-500/40 rounded text-xs font-semibold text-yellow-400">
                    {pendingActions.length}
                  </span>
                )}
              </div>
              {pendingActions.length > 0 ? (
                <div className="space-y-3 max-h-96 overflow-y-auto custom-scrollbar">
                  {pendingActions.map((action) => {
                    const getActionType = (type) => {
                      const approvedLink = isRecipient ? '/my-approved-donations' : '/my-donations'
                      const types = {
                        donation_request: { label: 'Donation Request', icon: Heart, color: 'text-pink-400', link: '/my-donations' },
                        volunteer_request: { label: 'Volunteer Request', icon: Truck, color: 'text-blue-400', link: '/my-donations' },
                        delivery_completed: { label: 'Confirm Delivery', icon: CheckCircle, color: 'text-green-400', link: approvedLink },
                        pickup_scheduled: { label: 'Pickup Scheduled', icon: Calendar, color: 'text-purple-400', link: approvedLink },
                        pickup_completed: { label: 'Confirm Pickup', icon: Package, color: 'text-yellow-400', link: approvedLink },
                        direct_delivery_request: { label: 'Direct Delivery', icon: Truck, color: 'text-blue-400', link: '/my-donations' },
                        direct_delivery_completed: { label: 'Confirm Delivery', icon: CheckCircle, color: 'text-green-400', link: approvedLink },
                        donation_approved: { label: 'Donation Approved', icon: Gift, color: 'text-green-400', link: '/my-approved-donations' },
                        rating_reminder: { label: 'Rate Donation', icon: Award, color: 'text-yellow-400', link: '/my-approved-donations' }
                      }
                      return types[type] || { label: type, icon: Bell, color: 'text-gray-400', link: '#' }
                    }
                    const actionType = getActionType(action.type)
                    const ActionIcon = actionType.icon
                    const actionId = action.id || `action-${action.type}-${action.created_at || Date.now()}`
                    
                    return (
                      <Link
                        key={actionId}
                        to={actionType.link}
                        className="flex items-start space-x-3 p-3 rounded-lg border border-yellow-500/30 bg-yellow-500/10 hover:bg-yellow-500/20 transition-all group"
                      >
                        <ActionIcon className={`h-5 w-5 ${actionType.color} flex-shrink-0 mt-0.5`} />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-white group-hover:text-yellow-300 transition-colors">
                            {actionType.label}
                          </p>
                          <p className="text-xs text-yellow-200/70 mt-1 line-clamp-2">
                            {action.message || action.data?.message || 'Action required'}
                          </p>
                          <p className="text-xs text-yellow-300/50 mt-1">
                            {new Date(action.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                          </p>
                        </div>
                      </Link>
                    )
                  })}
                </div>
              ) : (
                <div className="text-center py-8">
                  <CheckCircle className="h-12 w-12 text-green-500/50 mx-auto mb-3" />
                  <p className="text-yellow-300 text-sm">All caught up!</p>
                  <p className="text-xs text-yellow-200/70 mt-1">No pending actions</p>
                </div>
              )}
            </div>
          )}
        </motion.div>

        {/* Category Breakdown and Status Distribution */}
        {(isDonor || isRecipient) && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8"
          >
            {/* Donations / Requests by Category – accurate horizontal bar chart */}
            <div className="card p-6 border border-gray-600" style={{backgroundColor: '#001a5c'}}>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-white flex items-center gap-2">
                  <Layers className="h-5 w-5 text-yellow-400" />
                  {isDonor ? 'Donations by Category' : 'Requests by Category'}
                </h2>
                <PieChart className="h-5 w-5 text-yellow-300/50" />
              </div>
              {categoryBreakdown.length > 0 ? (
                <div className="space-y-4">
                  {categoryBreakdown.map((item, itemIndex) => {
                    const total = categoryBreakdown.reduce((sum, c) => sum + (c.count || 0), 0) || 1
                    const percentage = Math.round((item.count / total) * 100)
                    const colors = [
                      'from-fuchsia-500 to-purple-500',
                      'from-sky-500 to-blue-500',
                      'from-emerald-400 to-green-500',
                      'from-amber-400 to-orange-500',
                      'from-pink-500 to-rose-500',
                      'from-cyan-400 to-sky-500'
                    ]
                    const color = colors[itemIndex % colors.length]

                    return (
                      <div key={`category-${item.category}`} className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-xs sm:text-sm font-semibold text-white uppercase tracking-wide">
                            {item.category}
                          </span>
                          <span className="text-xs sm:text-sm text-yellow-300 font-semibold">
                            {item.count} ({percentage}%)
                          </span>
                        </div>
                        <div className="w-full bg-slate-800 rounded-full h-3 sm:h-3.5 overflow-hidden">
                          <div
                            className={`h-full rounded-full bg-gradient-to-r ${color} transition-all duration-500`}
                            style={{ width: `${Math.max(4, percentage)}%` }}
                          />
                        </div>
                      </div>
                    )
                  })}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Layers className="h-12 w-12 text-gray-600 mx-auto mb-3" />
                  <p className="text-yellow-300 text-sm">No category data yet</p>
                  <p className="text-xs text-yellow-200/70 mt-1">
                    {isDonor ? 'Start donating to see your category breakdown' : 'Create requests to see your category breakdown'}
                  </p>
                </div>
              )}
            </div>

            {/* Status Distribution – accurate horizontal bar chart */}
            <div className="card p-6 border border-gray-600" style={{backgroundColor: '#001a5c'}}>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-white flex items-center gap-2">
                  <BarChart3 className="h-5 w-5 text-yellow-400" />
                  Status Overview
                </h2>
                <Target className="h-5 w-5 text-yellow-300/50" />
              </div>
              {donations.length > 0 ? (
                <div className="space-y-4">
                  {(isDonor ? [
                    { status: 'available', label: 'Available', color: 'from-sky-400 to-blue-500', count: stats.activeDonations || 0 },
                    { status: 'in_progress', label: 'In Progress', color: 'from-amber-400 to-orange-500', count: stats.inProgressDonations || 0 },
                    { status: 'completed', label: 'Completed', color: 'from-emerald-400 to-green-500', count: stats.completedDonations || 0 },
                    { status: 'cancelled', label: 'Cancelled', color: 'from-rose-500 to-red-500', count: stats.cancelledDonations || 0 },
                    { status: 'expired', label: 'Expired', color: 'from-slate-400 to-slate-500', count: stats.expiredDonations || 0 }
                  ] : [
                    { status: 'open', label: 'Open', color: 'from-sky-400 to-blue-500', count: stats.openRequests || 0 },
                    { status: 'fulfilled', label: 'Fulfilled', color: 'from-emerald-400 to-green-500', count: stats.fulfilledRequests || 0 },
                    { status: 'closed', label: 'Closed', color: 'from-slate-400 to-slate-500', count: stats.closedRequests || 0 }
                  ]).map((item) => {
                    const total = isDonor
                      ? (stats.activeDonations || 0) +
                        (stats.inProgressDonations || 0) +
                        (stats.completedDonations || 0) +
                        (stats.cancelledDonations || 0) +
                        (stats.expiredDonations || 0) || 1
                      : (stats.openRequests || 0) +
                        (stats.fulfilledRequests || 0) +
                        (stats.closedRequests || 0) || 1
                    const percentage = Math.round((item.count / total) * 100)

                    return (
                      <div key={`legend-${item.label}`} className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-xs sm:text-sm font-semibold text-white uppercase tracking-wide">
                            {item.label}
                          </span>
                          <span className="text-xs sm:text-sm text-yellow-300 font-semibold">
                            {item.count} ({percentage}%)
                          </span>
                        </div>
                        <div className="w-full bg-slate-800 rounded-full h-3 sm:h-3.5 overflow-hidden">
                          <div
                            className={`h-full rounded-full bg-gradient-to-r ${item.color} transition-all duration-500`}
                            style={{ width: `${Math.max(4, percentage)}%` }}
                          />
                        </div>
                      </div>
                    )
                  })}
                </div>
              ) : (
                <div className="text-center py-8">
                  <BarChart3 className="h-12 w-12 text-gray-600 mx-auto mb-3" />
                  <p className="text-yellow-300 text-sm">No status data yet</p>
                  <p className="text-xs text-yellow-200/70 mt-1">
                    {isDonor ? 'Your donation statuses will appear here' : 'Your request statuses will appear here'}
                  </p>
                </div>
              )}
            </div>
          </motion.div>
        )}

        {/* Impact Metrics and Visual Insights */}
        {(isDonor || isRecipient) && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.5 }}
            className="grid grid-cols-1 lg:grid-cols-1 gap-8"
          >
            {/* Impact Metrics */}
            <div className="card p-6 border border-gray-600" style={{backgroundColor: '#001a5c'}}>
              <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
                <Award className="h-5 w-5 text-yellow-400" />
                Your Impact
              </h2>
              <div className="space-y-4">
                {isDonor ? (
                  <>
                    {/* Donor Impact – visual donut graphs only */}
                    <div>
                      <div className="grid grid-cols-3 gap-4">
                        {/* Completion Rate */}
                        <div className="flex flex-col items-center">
                          <div
                            className="relative flex items-center justify-center w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-slate-800"
                            style={{
                              background: `conic-gradient(#22c55e ${donorCompletionPercent}%, rgba(30,41,59,1) 0)`
                            }}
                          >
                            <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-navy-900 flex items-center justify-center">
                              <span className="text-xs sm:text-sm font-semibold text-white">
                                {donorCompletionPercent}%
                              </span>
                            </div>
                          </div>
                          <p className="mt-2 text-[11px] sm:text-xs text-yellow-200 text-center font-medium">
                            Completion Rate
                          </p>
                        </div>

                        {/* Donations Completed */}
                        <div className="flex flex-col items-center">
                          <div
                            className="relative flex items-center justify-center w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-slate-800"
                            style={{
                              background: `conic-gradient(#e11d48 ${donorConversionPercent}%, rgba(30,41,59,1) 0)`
                            }}
                          >
                            <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-navy-900 flex items-center justify-center">
                              <span className="text-xs sm:text-sm font-semibold text-white">
                                {donorConversionPercent}%
                              </span>
                            </div>
                          </div>
                          <p className="mt-2 text-[11px] sm:text-xs text-yellow-200 text-center font-medium">
                            Donations Completed
                          </p>
                        </div>

                        {/* Events Participation */}
                        <div className="flex flex-col items-center">
                          <div
                            className="relative flex items-center justify-center w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-slate-800"
                            style={{
                              background: `conic-gradient(#3b82f6 ${donorEventsPercent}%, rgba(30,41,59,1) 0)`
                            }}
                          >
                            <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-navy-900 flex items-center justify-center">
                              <span className="text-xs sm:text-sm font-semibold text-white">
                                {donorEventsPercent}%
                              </span>
                            </div>
                          </div>
                          <p className="mt-2 text-[11px] sm:text-xs text-yellow-200 text-center font-medium">
                            Events Participation
                          </p>
                        </div>
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="flex items-center justify-between p-4 rounded-lg border border-green-500/20 bg-green-500/10">
                      <div className="flex items-center space-x-3">
                        <div className="p-2 bg-green-500/20 rounded-lg">
                          <Gift className="h-6 w-6 text-green-400" />
                        </div>
                        <div className="flex-1">
                          <p className="text-sm text-green-200">Items Received</p>
                          <p className="text-2xl font-bold text-white">{stats.itemsReceived || 0}</p>
                          <p className="text-xs text-green-300/70 mt-1">
                            Saved ~{Math.max(1, (stats.itemsReceived || 0) * 2)} hours of searching
                          </p>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center justify-between p-4 rounded-lg border border-yellow-500/20 bg-yellow-500/10">
                      <div className="flex items-center space-x-3">
                        <div className="p-2 bg-yellow-500/20 rounded-lg">
                          <Package className="h-6 w-6 text-yellow-400" />
                        </div>
                        <div className="flex-1">
                          <p className="text-sm text-yellow-200">Approved Donations</p>
                          <p className="text-2xl font-bold text-white">{stats.approvedDonations || 0}</p>
                          <p className="text-xs text-yellow-300/70 mt-1">
                            Help on the way
                          </p>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center justify-between p-4 rounded-lg border border-purple-500/20 bg-purple-500/10">
                      <div className="flex items-center space-x-3">
                        <div className="p-2 bg-purple-500/20 rounded-lg">
                          <Percent className="h-6 w-6 text-purple-400" />
                        </div>
                        <div className="flex-1">
                          <p className="text-sm text-purple-200">Fulfillment Rate</p>
                          <p className="text-2xl font-bold text-white">{stats.fulfillmentRate || 0}%</p>
                          <p className="text-xs text-purple-300/70 mt-1">
                            {stats.fulfillmentRate >= 80 ? 'Strong community support!' : 'Community is responding'}
                          </p>
                        </div>
                      </div>
                    </div>
                    {stats.itemsReceived > 0 && (
                      <div className="mt-4 p-4 rounded-lg border border-blue-500/20 bg-blue-500/10">
                        <p className="text-sm text-blue-200">
                          <span className="font-semibold text-white">Estimated Savings:</span> You've saved approximately <span className="font-bold text-white">₱{((stats.itemsReceived || 0) * 1000).toLocaleString()}</span> and <span className="font-bold text-white">{Math.max(1, (stats.itemsReceived || 0) * 2)} hours</span> of time.
                        </p>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          </motion.div>
        )}

        {/* Completed Events Section */}
        {isDonor && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.6 }}
            className="mt-8"
          >
            {completedEvents.length > 0 ? (
            <div className="card p-6 border border-gray-600" style={{backgroundColor: '#001a5c'}}>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-white flex items-center gap-2">
                  <Award className="h-5 w-5 text-yellow-400" />
                  Completed Events
                </h2>
                <span className="px-2 py-1 bg-yellow-400/20 border border-yellow-400/40 rounded text-xs font-semibold text-yellow-400">
                  {completedEvents.length}
                </span>
              </div>
              <div className="space-y-3 max-h-96 overflow-y-auto custom-scrollbar">
                {completedEvents.slice(0, 5).map((participation) => {
                  const event = participation.event
                  if (!event) return null
                  
                  // Double-check: only show events that are finished and marked as present
                  const eventEndDate = new Date(event.end_date)
                  const now = new Date()
                  const isFinished = eventEndDate < now && event.status !== 'cancelled'
                  
                  if (!isFinished || participation.attendance_status !== 'present') {
                    return null
                  }
                  
                  const formatDate = (date) => {
                    return date.toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric'
                    })
                  }
                  
                  return (
                    <Link
                      key={participation.id}
                      to={`/events/${event.id}`}
                      className="flex items-start space-x-3 p-3 rounded-lg border border-gray-600 hover:border-yellow-400/50 transition-all group"
                      style={{backgroundColor: '#001a5c'}}
                    >
                      <div className="flex-shrink-0 mt-0.5">
                        <CheckCircle className="h-5 w-5 text-green-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium text-white group-hover:text-yellow-300 transition-colors truncate">
                            {event.name}
                          </p>
                          <span className="px-1.5 py-0.5 bg-green-500/20 border border-green-500/40 rounded text-[10px] font-semibold text-green-400 flex-shrink-0">
                            COMPLETED
                          </span>
                        </div>
                        <p className="text-xs text-yellow-200 mt-1 line-clamp-1">
                          {event.location}
                        </p>
                        <div className="flex items-center gap-3 mt-1.5">
                          <span className="text-xs text-gray-400 flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {formatDate(eventEndDate)}
                          </span>
                          {event.target_goal && (
                            <span className="text-xs px-2 py-0.5 bg-yellow-400/20 border border-yellow-400/40 rounded text-yellow-400">
                              {event.target_goal}
                            </span>
                          )}
                        </div>
                      </div>
                    </Link>
                  )
                })}
              </div>
              {completedEvents.length > 5 && (
                <Link
                  to="/events"
                  className="block mt-4 text-center text-yellow-300 hover:text-yellow-200 font-medium text-sm"
                >
                  View All Events →
                </Link>
              )}
            </div>
          ) : (
          <div className="card p-6 border border-gray-600" style={{backgroundColor: '#001a5c'}}>
            <h2 className="text-xl font-semibold text-white mb-4">Community Events</h2>
            <div className="space-y-4">
              <div className="flex items-center space-x-3 p-3 rounded-lg border border-gray-600" style={{backgroundColor: '#001a5c'}}>
                <Calendar className="h-5 w-5 text-yellow-300" />
                <div>
                  <p className="text-sm font-medium text-white">Winter Clothing Drive</p>
                  <p className="text-xs text-yellow-200">Dec 15 - Dec 31</p>
                </div>
              </div>
              <div className="flex items-center space-x-3 p-3 rounded-lg border border-gray-600" style={{backgroundColor: '#001a5c'}}>
                <Users className="h-5 w-5 text-yellow-300" />
                <div>
                  <p className="text-sm font-medium text-white">Holiday Food Bank</p>
                  <p className="text-xs text-yellow-200">Ongoing</p>
                </div>
              </div>
            </div>
            <Link
              to="/events"
              className="block mt-4 text-center text-yellow-300 hover:text-yellow-200 font-medium text-sm"
            >
              View All Events →
            </Link>
          </div>
          )}
        </motion.div>
        )}

      </div>

      {/* Workflow Guide Modal (How the workflow works) */}
      {profile?.role && (isDonor || isRecipient) && (
        <WorkflowGuideModal
          isOpen={showWorkflowGuide}
          onClose={() => setShowWorkflowGuide(false)}
          userRole={isDonor ? 'donor' : 'recipient'}
        />
      )}
    </div>
  )
}

export default DashboardPage