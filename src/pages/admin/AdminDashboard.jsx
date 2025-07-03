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
import LoadingSpinner from '../../components/ui/LoadingSpinner'

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
          type: 'donation_created',
          message: `New donation: ${d.title}`,
          timestamp: new Date(d.created_at).toLocaleDateString()
        })),
        ...requests.slice(0, 2).map(r => ({
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
    return (
      <div className="min-h-screen bg-navy-950 flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  const StatCard = ({ icon: Icon, title, value, description, trend, color = "skyblue" }) => (
    <motion.div
      whileHover={{ scale: 1.02 }}
      className="card p-6"
    >
      <div className="flex items-center justify-between mb-4">
        <div className={`p-3 rounded-lg bg-${color}-500/20`}>
          <Icon className={`h-6 w-6 text-${color}-400`} />
        </div>
        {trend && (
          <div className="flex items-center text-green-400 text-sm">
            <TrendingUp className="h-4 w-4 mr-1" />
            {trend}
          </div>
        )}
      </div>
      <h3 className="text-2xl font-bold text-white mb-1">{value}</h3>
      <p className="text-skyblue-300 text-sm">{title}</p>
      {description && (
        <p className="text-skyblue-400 text-xs mt-2">{description}</p>
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
      <div className="flex items-start space-x-3 p-4 hover:bg-navy-800/50 rounded-lg transition-colors">
        <div className={`p-2 rounded-lg bg-navy-800 ${colorClass}`}>
          <Icon className="h-4 w-4" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-white text-sm">{activity.message}</p>
          <p className="text-skyblue-400 text-xs mt-1">{activity.timestamp}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-navy-950 py-8 custom-scrollbar">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex items-center space-x-3 mb-4">
            <Shield className="h-8 w-8 text-amber-400" />
            <div>
              <h1 className="text-3xl font-bold text-white">Admin Dashboard</h1>
              <p className="text-skyblue-300">Platform management and oversight</p>
            </div>
          </div>
        </motion.div>

        {/* Stats Grid */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8"
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
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Quick Actions */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
            className="card p-6"
          >
            <h2 className="text-xl font-semibold text-white mb-6 flex items-center">
              <BarChart3 className="h-5 w-5 text-skyblue-400 mr-2" />
              Quick Actions
            </h2>
                         <div className="space-y-3">
               <button 
                 onClick={() => navigate('/admin/users')}
                 className="w-full btn btn-primary text-left flex items-center"
               >
                 <Users className="h-4 w-4 mr-2" />
                 Manage Users
               </button>
               <button 
                 onClick={() => navigate('/admin/donations')}
                 className="w-full btn btn-secondary text-left flex items-center"
               >
                 <Package className="h-4 w-4 mr-2" />
                 Review Donations
               </button>
               <button 
                 onClick={() => navigate('/admin/volunteers')}
                 className="w-full btn btn-secondary text-left flex items-center"
               >
                 <Truck className="h-4 w-4 mr-2" />
                 Volunteer Management
               </button>
               <button 
                 onClick={() => navigate('/admin/requests')}
                 className="w-full btn btn-secondary text-left flex items-center"
               >
                 <AlertTriangle className="h-4 w-4 mr-2" />
                 Review Requests
               </button>
               <button 
                 onClick={() => navigate('/admin/settings')}
                 className="w-full btn btn-secondary text-left flex items-center"
               >
                 <Shield className="h-4 w-4 mr-2" />
                 Platform Settings
               </button>
             </div>
          </motion.div>

          {/* Recent Activity */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="lg:col-span-2 card p-6"
          >
            <h2 className="text-xl font-semibold text-white mb-6 flex items-center">
              <Clock className="h-5 w-5 text-skyblue-400 mr-2" />
              Recent Activity
            </h2>
                         <div className="space-y-2 max-h-96 overflow-y-auto custom-scrollbar">
               {recentActivity.length > 0 ? (
                 recentActivity.map((activity) => (
                   <ActivityItem key={activity.id} activity={activity} />
                 ))
               ) : (
                 <div className="text-center py-8">
                   <Clock className="h-12 w-12 text-skyblue-400 mx-auto mb-4" />
                   <p className="text-skyblue-300">No recent activity</p>
                   <p className="text-skyblue-400 text-sm">Activity will appear here as users interact with the platform</p>
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
          className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6"
        >
          <div className="card p-6">
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
              <CheckCircle className="h-5 w-5 text-green-400 mr-2" />
              Delivery Status
            </h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-skyblue-300">Completed</span>
                <span className="text-white font-medium">{stats.completedDeliveries}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-skyblue-300">Pending</span>
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

          <div className="card p-6">
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
              <Users className="h-5 w-5 text-skyblue-400 mr-2" />
              User Verification
            </h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-skyblue-300">Verified</span>
                <span className="text-white font-medium">{stats.verifiedUsers}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-skyblue-300">Unverified</span>
                <span className="text-white font-medium">{stats.unverifiedUsers}</span>
              </div>
                             <div className="w-full bg-navy-800 rounded-full h-2">
                 <div 
                   className="bg-skyblue-500 h-2 rounded-full"
                   style={{ 
                     width: `${stats.verifiedUsers + stats.unverifiedUsers > 0 ? (stats.verifiedUsers / (stats.verifiedUsers + stats.unverifiedUsers)) * 100 : 0}%` 
                   }}
                 />
               </div>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  )
}

export default AdminDashboard 