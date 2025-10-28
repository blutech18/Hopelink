import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { 
  Shield, 
  Users, 
  Package, 
  Truck, 
  Calendar,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  Clock,
  BarChart3
} from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import { db, supabase } from '../../lib/supabase'
import { DashboardSkeleton } from '../../components/ui/Skeleton'
import AdminFeedbackViewer from '../../components/ui/AdminFeedbackViewer'

const AdminDashboard = () => {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [recentActivity, setRecentActivity] = useState([])

  useEffect(() => {
    loadAdminStats()

    // Set up real-time subscriptions for admin dashboard
    let donationsSubscription
    let requestsSubscription
    let usersSubscription
    let deliveriesSubscription

    if (supabase) {
      // Subscribe to donations table changes
      donationsSubscription = supabase
        .channel('admin_donations')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'donations'
          },
          () => {
            console.log('📊 Admin: Donation change detected')
            loadAdminStats()
          }
        )
        .subscribe()

      // Subscribe to requests table changes
      requestsSubscription = supabase
        .channel('admin_requests')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'donation_requests'
          },
          () => {
            console.log('📊 Admin: Request change detected')
            loadAdminStats()
          }
        )
        .subscribe()

      // Subscribe to users table changes
      usersSubscription = supabase
        .channel('admin_users')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'users'
          },
          () => {
            console.log('📊 Admin: User change detected')
            loadAdminStats()
          }
        )
        .subscribe()

      // Subscribe to deliveries table changes
      deliveriesSubscription = supabase
        .channel('admin_deliveries')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'deliveries'
          },
          () => {
            console.log('📊 Admin: Delivery change detected')
            loadAdminStats()
          }
        )
        .subscribe()
    }

    // Cleanup subscriptions
    return () => {
      if (donationsSubscription) {
        supabase.removeChannel(donationsSubscription)
      }
      if (requestsSubscription) {
        supabase.removeChannel(requestsSubscription)
      }
      if (usersSubscription) {
        supabase.removeChannel(usersSubscription)
      }
      if (deliveriesSubscription) {
        supabase.removeChannel(deliveriesSubscription)
      }
    }
  }, [])

  const loadAdminStats = async () => {
    try {
      setLoading(true)
      
      // Fetch all data in parallel
      const [users, donations, requests, deliveries] = await Promise.all([
        db.getAllUsers(),
        db.getDonations(),
        db.getRequests(),
        db.getDeliveries()
      ])
      
      const activeVolunteers = users.filter(u => u.role === 'volunteer' && u.is_active).length
      const verifiedUsers = users.filter(u => u.is_verified).length
      
      setStats({
        totalUsers: users.length,
        totalDonations: donations.length,
        activeVolunteers: activeVolunteers,
        pendingRequests: requests.filter(r => r.status === 'open').length,
        verifiedUsers: verifiedUsers,
        unverifiedUsers: users.length - verifiedUsers,
        completedDeliveries: deliveries.filter(d => d.status === 'delivered').length,
        pendingDeliveries: deliveries.filter(d => d.status === 'pending').length
      })
      
      // Create recent activity from latest data
      const recentActivity = [
        ...donations.slice(0, 3).map(d => ({
          id: `donation-${d.id}`,
          type: 'donation_created',
          message: `New donation: ${d.title}`,
          timestamp: new Date(d.created_at).toLocaleDateString()
        })),
        ...requests.slice(0, 2).map(r => ({
          id: `request-${r.id}`,
          type: 'request_created', 
          message: `New request: ${r.title}`,
          timestamp: new Date(r.created_at).toLocaleDateString()
        }))
      ].slice(0, 5)
      
      setRecentActivity(recentActivity)
    } catch (error) {
      console.error('Error loading admin stats:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return <DashboardSkeleton />
  }

  const StatCard = ({ icon: Icon, title, value, description, trend, color = "yellow" }) => (
    <motion.div
      whileHover={{ scale: 1.02 }}
      className="card p-4 sm:p-6 border border-gray-600"
      style={{backgroundColor: '#001a5c'}}
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center space-x-3">
          <div className={`p-2 sm:p-3 rounded-lg bg-navy-800`}>
            <Icon className={`h-5 w-5 sm:h-6 sm:w-6 text-yellow-300`} />
          </div>
          <div className="flex flex-col">
            <h3 className="text-xl sm:text-2xl font-bold text-white">{value}</h3>
            <p className="text-yellow-200 text-xs sm:text-sm">{title}</p>
          </div>
        </div>
        {trend && (
          <div className="flex items-center text-green-400 text-xs sm:text-sm">
            <TrendingUp className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
            {trend}
          </div>
        )}
      </div>
      {description && (
        <p className="text-yellow-300 text-xs mt-2">{description}</p>
      )}
    </motion.div>
  )

  const ActivityItem = ({ activity }) => {
    const getActivityIcon = (type) => {
      switch (type) {
        case 'user_registration': return Users
        case 'donation_created': return Package
        case 'verification_pending': return AlertTriangle
        case 'delivery_completed': return CheckCircle
        case 'request_created': return Clock
        default: return AlertTriangle
      }
    }

    const getActivityColor = (type) => {
      switch (type) {
        case 'user_registration': return 'text-blue-400'
        case 'donation_created': return 'text-green-400'
        case 'verification_pending': return 'text-yellow-400'
        case 'delivery_completed': return 'text-green-400'
        case 'request_created': return 'text-skyblue-400'
        default: return 'text-skyblue-400'
      }
    }

    const Icon = getActivityIcon(activity.type)
    const colorClass = getActivityColor(activity.type)

    return (
      <div className="flex items-start gap-3 p-3 sm:p-4 hover:bg-navy-800/50 rounded-lg transition-colors">
        <div className={`p-2 rounded-lg bg-navy-800 ${colorClass} flex-shrink-0`}>
          <Icon className="h-4 w-4" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-white text-sm break-words">{activity.message}</p>
          <p className="text-yellow-400 text-xs mt-1">{activity.timestamp}</p>
        </div>
      </div>
    )
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
          <div className="flex items-center gap-3 sm:gap-4 mb-4">
            <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-xl bg-gradient-to-br from-yellow-500 to-yellow-600 flex items-center justify-center shadow-lg flex-shrink-0">
              <Shield className="w-6 h-6 sm:w-7 sm:h-7 text-white" />
            </div>
            <div className="min-w-0">
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white">Admin Dashboard</h1>
              <p className="text-yellow-300 text-xs sm:text-sm">Platform management and oversight</p>
            </div>
          </div>
        </motion.div>

        {/* Stats Grid */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-6 sm:mb-8"
        >
                     <StatCard
             icon={Users}
             title="Total Users"
             value={stats.totalUsers.toLocaleString()}
             description={`${stats.verifiedUsers} verified, ${stats.unverifiedUsers} pending`}
           />
           <StatCard
             icon={Package}
             title="Total Donations"
             value={stats.totalDonations.toLocaleString()}
             description="Posted on platform"
             color="green"
           />
           <StatCard
             icon={Truck}
             title="Active Volunteers"
             value={stats.activeVolunteers.toLocaleString()}
             description="Currently available"
             color="blue"
           />
           <StatCard
             icon={AlertTriangle}
             title="Pending Requests"
             value={stats.pendingRequests.toLocaleString()}
             description="Requiring attention"
             color="yellow"
           />
        </motion.div>

        {/* Dashboard Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8">
          {/* Quick Actions */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
          className="card p-4 sm:p-6 border border-gray-600"
          style={{backgroundColor: '#001a5c'}}
          >
            <h2 className="text-lg sm:text-xl font-semibold text-white mb-4 sm:mb-6 flex items-center">
              <BarChart3 className="h-5 w-5 text-yellow-300 mr-2 flex-shrink-0" />
              Quick Actions
            </h2>
            <div className="space-y-2 sm:space-y-3">
               <button 
                 onClick={() => navigate('/admin/users')}
                 className="w-full btn btn-primary text-left flex items-center border border-gray-600 py-3 active:scale-95 transition-transform"
               >
                 <Users className="h-4 w-4 mr-2 flex-shrink-0" />
                 <span className="text-sm sm:text-base">Manage Users</span>
               </button>
               <button 
                 onClick={() => navigate('/admin/donations')}
                 className="w-full btn btn-secondary text-left flex items-center border border-gray-600 py-3 active:scale-95 transition-transform"
               >
                 <Package className="h-4 w-4 mr-2 flex-shrink-0" />
                 <span className="text-sm sm:text-base">Review Donations</span>
               </button>
               <button 
                 onClick={() => navigate('/admin/volunteers')}
                 className="w-full btn btn-secondary text-left flex items-center border border-gray-600 py-3 active:scale-95 transition-transform"
               >
                 <Truck className="h-4 w-4 mr-2 flex-shrink-0" />
                 <span className="text-sm sm:text-base">Volunteer Management</span>
               </button>
               <button 
                 onClick={() => navigate('/admin/requests')}
                 className="w-full btn btn-secondary text-left flex items-center border border-gray-600 py-3 active:scale-95 transition-transform"
               >
                 <AlertTriangle className="h-4 w-4 mr-2 flex-shrink-0" />
                 <span className="text-sm sm:text-base">Review Requests</span>
               </button>
               <button 
                 onClick={() => navigate('/admin/events')}
                 className="w-full btn btn-secondary text-left flex items-center border border-gray-600 py-3 active:scale-95 transition-transform"
               >
                 <Calendar className="h-4 w-4 mr-2 flex-shrink-0" />
                 <span className="text-sm sm:text-base">Manage Events</span>
               </button>
               <button 
                 onClick={() => navigate('/admin/settings')}
                 className="w-full btn btn-secondary text-left flex items-center border border-gray-600 py-3 active:scale-95 transition-transform"
               >
                 <Shield className="h-4 w-4 mr-2 flex-shrink-0" />
                 <span className="text-sm sm:text-base">Platform Settings</span>
               </button>
             </div>
          </motion.div>

          {/* Recent Activity */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="lg:col-span-2 card p-4 sm:p-6 border border-gray-600"
            style={{backgroundColor: '#001a5c'}}
          >
            <h2 className="text-lg sm:text-xl font-semibold text-white mb-4 sm:mb-6 flex items-center">
              <Clock className="h-5 w-5 text-yellow-300 mr-2 flex-shrink-0" />
              Recent Activity
            </h2>
            <div className="space-y-2 max-h-96 overflow-y-auto custom-scrollbar">
               {recentActivity.length > 0 ? (
                 recentActivity.map((activity) => (
                   <ActivityItem key={activity.id} activity={activity} />
                 ))
               ) : (
                 <div className="text-center py-8">
                  <Clock className="h-12 w-12 text-yellow-300 mx-auto mb-4" />
                  <p className="text-yellow-200">No recent activity</p>
                  <p className="text-yellow-300 text-sm">Activity will appear here as users interact with the platform</p>
                 </div>
               )}
             </div>
          </motion.div>
        </div>

        {/* Performance Metrics */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="mt-6 sm:mt-8 grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6"
        >
          <div className="card p-4 sm:p-6 border border-gray-600" style={{backgroundColor: '#001a5c'}}>
            <h3 className="text-base sm:text-lg font-semibold text-white mb-4 flex items-center">
              <CheckCircle className="h-5 w-5 text-green-400 mr-2 flex-shrink-0" />
              Delivery Status
            </h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-yellow-200">Completed</span>
                <span className="text-white font-medium">{stats.completedDeliveries}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-yellow-200">Pending</span>
                <span className="text-white font-medium">{stats.pendingDeliveries}</span>
              </div>
                             <div className="w-full bg-navy-800 rounded-full h-2">
                 <div 
                   className="bg-green-500 h-2 rounded-full"
                   style={{ 
                     width: `${stats.completedDeliveries + stats.pendingDeliveries > 0 ? (stats.completedDeliveries / (stats.completedDeliveries + stats.pendingDeliveries)) * 100 : 0}%` 
                   }}
                 />
               </div>
            </div>
          </div>

          <div className="card p-4 sm:p-6 border border-gray-600" style={{backgroundColor: '#001a5c'}}>
            <h3 className="text-base sm:text-lg font-semibold text-white mb-4 flex items-center">
              <Users className="h-5 w-5 text-yellow-300 mr-2 flex-shrink-0" />
              User Verification
            </h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-yellow-200">Verified</span>
                <span className="text-white font-medium">{stats.verifiedUsers}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-yellow-200">Unverified</span>
                <span className="text-white font-medium">{stats.unverifiedUsers}</span>
              </div>
                             <div className="w-full bg-navy-800 rounded-full h-2">
                 <div 
                  className="bg-yellow-400 h-2 rounded-full"
                   style={{ 
                     width: `${stats.verifiedUsers + stats.unverifiedUsers > 0 ? (stats.verifiedUsers / (stats.verifiedUsers + stats.unverifiedUsers)) * 100 : 0}%` 
                   }}
                 />
               </div>
            </div>
          </div>
        </motion.div>

        {/* Platform Feedback & Performance Analytics */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.5 }}
          className="mt-6 sm:mt-8"
        >
          <AdminFeedbackViewer />
        </motion.div>
      </div>
    </div>
  )
}

export default AdminDashboard 