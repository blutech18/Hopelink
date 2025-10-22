import React, { useEffect, useState, useCallback } from 'react'
import { Link, useNavigate } from 'react-router-dom'
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
  AlertCircle
} from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import { db, supabase } from '../../lib/supabase'
import { DashboardSkeleton } from '../../components/ui/Skeleton'
import ProfileCompletionPrompt from '../../components/ui/ProfileCompletionPrompt'
import { IDVerificationBadge } from '../../components/ui/VerificationBadge'

const DashboardPage = () => {
  const { profile, isDonor, isRecipient, isVolunteer, isAdmin } = useAuth()
  const [stats, setStats] = useState({})
  const [recentActivity, setRecentActivity] = useState([])
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  const loadDashboardData = useCallback(async () => {
    if (!profile?.id) {
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      // Load role-specific data
      if (isDonor) {
        const donations = await db.getDonations({ donor_id: profile.id })
        setStats({
          totalDonations: donations.length,
          activeDonations: donations.filter(d => d.status === 'available').length,
          completedDonations: donations.filter(d => d.status === 'delivered').length
        })
        setRecentActivity(donations.slice(0, 5))
      } else if (isRecipient) {
        const requests = await db.getRequests({ requester_id: profile.id })
        setStats({
          totalRequests: requests.length,
          openRequests: requests.filter(r => r.status === 'open').length,
          fulfilledRequests: requests.filter(r => r.status === 'fulfilled').length
        })
        setRecentActivity(requests.slice(0, 5))
      } else if (isAdmin) {
        // Load admin stats
        const [allDonations, allRequests] = await Promise.all([
          db.getDonations(),
          db.getRequests()
        ])
        setStats({
          totalDonations: allDonations.length,
          totalRequests: allRequests.length,
          totalUsers: 0 // This would need a proper count function
        })
        setRecentActivity([...allDonations.slice(0, 3), ...allRequests.slice(0, 2)])
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
        { label: 'Total Donations', value: stats.totalDonations || 0, icon: Gift },
        { label: 'Active Donations', value: stats.activeDonations || 0, icon: Clock },
        { label: 'Completed', value: stats.completedDonations || 0, icon: TrendingUp }
      ]
    } else if (isRecipient) {
      return [
        { label: 'Total Requests', value: stats.totalRequests || 0, icon: Heart },
        { label: 'Open Requests', value: stats.openRequests || 0, icon: Clock },
        { label: 'Fulfilled', value: stats.fulfilledRequests || 0, icon: TrendingUp }
      ]
    } else if (isAdmin) {
      return [
        { label: 'Total Donations', value: stats.totalDonations || 0, icon: Gift },
        { label: 'Total Requests', value: stats.totalRequests || 0, icon: Heart },
        { label: 'Total Users', value: stats.totalUsers || 0, icon: Users }
      ]
    }
    return []
  }

  if (loading || !profile) {
    return <DashboardSkeleton />
  }

  const dashboardCards = getDashboardCards()
  const statsCards = getStatsCards()

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
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-white">
                Welcome back, {profile?.name}!
              </h1>
              <p className="text-yellow-200 mt-2">
                {isDonor && "Ready to make a difference with your donations?"}
                {isRecipient && "Let's find the support you need."}
                {isVolunteer && "Thank you for helping connect our community."}
                {isAdmin && "Manage the HopeLink platform."}
              </p>
            </div>
            {/* ID Verification Status Badge */}
            <div className="flex items-center">
              <IDVerificationBadge
                idStatus={profile?.id_verification_status}
                hasIdUploaded={profile?.primary_id_type && profile?.primary_id_number}
                size="lg"
                showText={true}
                showDescription={false}
              />
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
          className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8"
        >
          {statsCards.map((stat, index) => (
            <div key={index} className="card p-6 border border-gray-600" style={{backgroundColor: '#001a5c'}}>
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <stat.icon className="h-8 w-8 text-yellow-300" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-yellow-200">{stat.label}</p>
                  <p className="text-2xl font-bold text-white">{stat.value}</p>
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
            {dashboardCards.map((card, index) => (
              <Link
                key={index}
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

        {/* Recent Activity */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="grid grid-cols-1 lg:grid-cols-2 gap-8"
        >
          <div className="card p-6 border border-gray-600" style={{backgroundColor: '#001a5c'}}>
            <h2 className="text-xl font-semibold text-white mb-4">Recent Activity</h2>
            {recentActivity.length > 0 ? (
              <div className="space-y-4">
                {recentActivity.map((activity, index) => (
                  <div key={index} className="flex items-center space-x-3 p-3 rounded-lg border border-gray-600" style={{backgroundColor: '#001a5c'}}>
                    <div className="flex-shrink-0">
                      {isDonor && <Gift className="h-5 w-5 text-yellow-300" />}
                      {isRecipient && <Heart className="h-5 w-5 text-yellow-300" />}
                      {isVolunteer && <Truck className="h-5 w-5 text-yellow-300" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-white truncate">
                        {activity.title}
                      </p>
                      <p className="text-sm text-yellow-200">
                        Status: {activity.status}
                      </p>
                    </div>
                    <div className="text-xs text-yellow-300">
                      {new Date(activity.created_at).toLocaleDateString()}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-yellow-300">No recent activity</p>
                <p className="text-sm text-yellow-200 mt-1">Get started with the quick actions above!</p>
              </div>
            )}
          </div>

          {/* Community Events */}
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
        </motion.div>

      </div>
    </div>
  )
}

export default DashboardPage 