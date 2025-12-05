import React, { useEffect, useState, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { 
  Truck, 
  Package, 
  Clock, 
  TrendingUp,
  MapPin,
  Calendar,
  Users,
  Bell,
  CheckCircle,
  XCircle,
  AlertCircle,
  X,
  BarChart3,
  PieChart,
  Activity,
  Target,
  Award,
  Percent,
  ArrowUpRight,
  Star,
  Zap,
  Gauge,
  Info
} from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import { useToast } from '../../contexts/ToastContext'
import { db, supabase } from '../../lib/supabase'
import { DashboardSkeleton } from '../../components/ui/Skeleton'
import LoadingSpinner from '../../components/ui/LoadingSpinner'
import ProfileCompletionPrompt from '../../components/ui/ProfileCompletionPrompt'
import WorkflowGuideModal from '../../components/ui/WorkflowGuideModal'

const VolunteerDashboardPage = () => {
  const { profile, user } = useAuth()
  const { success, error } = useToast()
  const [stats, setStats] = useState({})
  const [recentDeliveries, setRecentDeliveries] = useState([])
  const [deliveries, setDeliveries] = useState([])
  const [pendingActions, setPendingActions] = useState([])
  const [loading, setLoading] = useState(true)
  const [showWorkflowGuide, setShowWorkflowGuide] = useState(false)


  const loadVolunteerData = async () => {
    if (!profile) return

    try {
      const [deliveriesData, notifications] = await Promise.all([
        db.getDeliveries({ volunteer_id: profile.id }),
        db.getUserNotifications(profile.id, 50).catch(() => [])
      ])
      
      setDeliveries(deliveriesData || [])
      
      // Calculate comprehensive stats
      const totalDeliveries = deliveriesData.length
      const assignedDeliveries = deliveriesData.filter(d => d.status === 'assigned').length
      const acceptedDeliveries = deliveriesData.filter(d => d.status === 'accepted').length
      const inProgressDeliveries = deliveriesData.filter(d => ['picked_up', 'in_transit'].includes(d.status)).length
      const completedDeliveries = deliveriesData.filter(d => d.status === 'delivered').length
      
      // Calculate completion rate
      const totalProcessed = totalDeliveries
      const completionRate = totalProcessed > 0 ? Math.round((completedDeliveries / totalProcessed) * 100) : 0
      
      // Calculate weekly capacity utilization
      const now = new Date()
      const startOfWeek = new Date(now)
      startOfWeek.setDate(now.getDate() - now.getDay() + 1) // Monday
      startOfWeek.setHours(0, 0, 0, 0)
      
      const thisWeekDeliveries = deliveriesData.filter(d => {
        const deliveryDate = new Date(d.created_at || d.assigned_at)
        return deliveryDate >= startOfWeek
      })
      
      const activeThisWeek = thisWeekDeliveries.filter(d => 
        ['assigned', 'accepted', 'picked_up', 'in_transit'].includes(d.status)
      ).length
      
      const maxCapacity = profile?.max_deliveries_per_week || 10
      const capacityUtilization = maxCapacity > 0 ? Math.round((activeThisWeek / maxCapacity) * 100) : 0
      const remainingCapacity = Math.max(0, maxCapacity - activeThisWeek)
      
      // Get pending actions from notifications
      const pending = (notifications || [])
        .filter(n => !n.read_at && [
          'volunteer_approved',
          'volunteer_declined',
          'delivery_assigned'
        ].includes(n.type))
        .slice(0, 5)
      setPendingActions(pending)
      
      setStats({
        totalDeliveries,
        assignedDeliveries,
        acceptedDeliveries,
        inProgressDeliveries,
        completedDeliveries,
        completionRate,
        pendingDeliveries: assignedDeliveries,
        activeThisWeek,
        maxCapacity,
        capacityUtilization,
        remainingCapacity
      })
      setRecentDeliveries(deliveriesData.slice(0, 5))
    } catch (error) {
      console.error('Error loading volunteer data:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadVolunteerData()

    // Set up real-time subscriptions for live updates
    let deliveriesSubscription
    let notificationsSubscription

    if (supabase && profile?.id) {
      // Subscribe to delivery changes for this volunteer
      deliveriesSubscription = supabase
        .channel('volunteer_deliveries')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'deliveries',
            filter: `volunteer_id=eq.${profile.id}`
          },
          () => {
            console.log('🚚 Volunteer delivery change detected')
            loadVolunteerData()
          }
        )
        .subscribe()

      // Subscribe to notifications for this volunteer
      notificationsSubscription = supabase
        .channel('volunteer_notifications')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'notifications',
            filter: `user_id=eq.${profile.id}`
          },
          () => {
            console.log('🔔 Volunteer notification change detected')
          }
        )
        .subscribe()
    }

    // Cleanup subscriptions
    return () => {
      if (deliveriesSubscription) {
        supabase.removeChannel(deliveriesSubscription)
      }
      if (notificationsSubscription) {
        supabase.removeChannel(notificationsSubscription)
      }
    }
  }, [profile])



  if (loading) {
    return <DashboardSkeleton />
  }

  const quickActions = [
    {
      title: 'Available Tasks',
      description: 'Find delivery opportunities',
      icon: Package,
      color: 'bg-blue-500',
      link: '/available-tasks'
    },
    {
      title: 'My Deliveries',
      description: 'Track your deliveries',
      icon: Truck,
      color: 'bg-green-500',
      link: '/my-deliveries'
    },
    {
      title: 'Manage Schedule',
      description: 'Update availability & preferences',
      icon: Calendar,
      color: 'bg-purple-500',
      link: '/volunteer-schedule'
    },
    {
      title: 'Profile Settings',
      description: 'Update volunteer information',
      icon: Users,
      color: 'bg-orange-500',
      link: '/profile'
    }
  ]

  const statsCards = [
    { 
      label: 'Total Deliveries', 
      value: stats.totalDeliveries || 0, 
      icon: Truck,
      color: 'text-blue-400',
      bgColor: 'bg-blue-500/20'
    },
    { 
      label: 'Assigned', 
      value: stats.assignedDeliveries || 0, 
      icon: Clock,
      color: 'text-yellow-400',
      bgColor: 'bg-yellow-500/20'
    },
    { 
      label: 'Accepted', 
      value: stats.acceptedDeliveries || 0, 
      icon: CheckCircle,
      color: 'text-purple-400',
      bgColor: 'bg-purple-500/20'
    },
    { 
      label: 'In Progress', 
      value: stats.inProgressDeliveries || 0, 
      icon: Activity,
      color: 'text-orange-400',
      bgColor: 'bg-orange-500/20'
    },
    { 
      label: 'Completed', 
      value: stats.completedDeliveries || 0, 
      icon: Star,
      color: 'text-green-400',
      bgColor: 'bg-green-500/20'
    },
    { 
      label: 'Completion Rate', 
      value: `${stats.completionRate || 0}%`, 
      icon: Percent,
      color: 'text-emerald-400',
      bgColor: 'bg-emerald-500/20'
    }
  ]

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
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <h1 className="text-3xl font-bold text-white">
                Welcome back, {profile?.name}!
              </h1>
              <p className="text-yellow-200 mt-2">
                Thank you for helping connect our community through volunteer deliveries.
              </p>
            </div>
            <div className="flex items-center justify-start sm:justify-end flex-shrink-0 gap-2">
              <button
                type="button"
                onClick={() => setShowWorkflowGuide(true)}
                className="inline-flex items-center justify-center h-8 sm:h-9 px-1 text-yellow-300 hover:text-yellow-200 transition-colors"
                title="How the workflow works"
                aria-label="How the workflow works"
              >
                <Info className="h-5 w-5 sm:h-6 sm:w-6" />
              </button>
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
            <div key={stat.label} className="card p-6 border border-gray-600 hover:border-yellow-400/50 transition-colors" style={{backgroundColor: '#001a5c'}}>
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
          
          {/* Capacity Utilization Card */}
          {stats.maxCapacity !== undefined && (
            <div className="card p-6 border border-gray-600 hover:border-yellow-400/50 transition-colors" style={{backgroundColor: '#001a5c'}}>
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <div className={`flex-shrink-0 p-3 rounded-lg ${
                    stats.capacityUtilization >= 90 ? 'bg-red-500/20' :
                    stats.capacityUtilization >= 75 ? 'bg-orange-500/20' :
                    stats.capacityUtilization >= 50 ? 'bg-yellow-500/20' :
                    'bg-green-500/20'
                  }`}>
                    <Gauge className={`h-6 w-6 ${
                      stats.capacityUtilization >= 90 ? 'text-red-400' :
                      stats.capacityUtilization >= 75 ? 'text-orange-400' :
                      stats.capacityUtilization >= 50 ? 'text-yellow-400' :
                      'text-green-400'
                    }`} />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-yellow-200">Weekly Capacity</p>
                    <p className="text-2xl font-bold text-white mt-1">
                      {stats.activeThisWeek || 0} / {stats.maxCapacity}
                    </p>
                    <p className="text-xs text-gray-400 mt-1">
                      {stats.capacityUtilization || 0}% utilized
                    </p>
                  </div>
                </div>
              </div>
              {/* Capacity Progress Bar */}
              <div className="mt-4">
                <div className="w-full bg-gray-700 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full transition-all duration-500 ${
                      stats.capacityUtilization >= 90 ? 'bg-red-500' :
                      stats.capacityUtilization >= 75 ? 'bg-orange-500' :
                      stats.capacityUtilization >= 50 ? 'bg-yellow-500' :
                      'bg-green-500'
                    }`}
                    style={{ width: `${Math.min(stats.capacityUtilization || 0, 100)}%` }}
                  />
                </div>
              </div>
            </div>
          )}
        </motion.div>
        
        {/* Capacity Warning Banner */}
        {stats.capacityUtilization !== undefined && stats.capacityUtilization >= 75 && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className={`mb-6 p-4 rounded-lg border ${
              stats.capacityUtilization >= 90 ? 'border-red-500/30 bg-red-500/10' :
              'border-orange-500/30 bg-orange-500/10'
            }`}
          >
            <div className="flex items-start gap-3">
              <AlertCircle className={`h-5 w-5 flex-shrink-0 mt-0.5 ${
                stats.capacityUtilization >= 90 ? 'text-red-400' : 'text-orange-400'
              }`} />
              <div className="flex-1">
                <h3 className={`font-semibold mb-1 ${
                  stats.capacityUtilization >= 90 ? 'text-red-300' : 'text-orange-300'
                }`}>
                  {stats.capacityUtilization >= 90 ? 'Capacity Limit Reached!' : 'Approaching Capacity Limit'}
                </h3>
                <p className={`text-sm ${
                  stats.capacityUtilization >= 90 ? 'text-red-200' : 'text-orange-200'
                }`}>
                  {stats.capacityUtilization >= 90 ? (
                    <>You've reached your weekly capacity limit of {stats.maxCapacity} deliveries. Complete some deliveries or increase your capacity in <Link to="/volunteer-schedule" className="underline font-medium">Schedule Settings</Link>.</>
                  ) : (
                    <>You're at {stats.capacityUtilization}% of your weekly capacity ({stats.activeThisWeek}/{stats.maxCapacity}). Only {stats.remainingCapacity} delivery{stats.remainingCapacity === 1 ? '' : 's'} remaining this week.</>
                  )}
                </p>
              </div>
            </div>
          </motion.div>
        )}

        {/* Quick Actions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="mb-8"
        >
          <h2 className="text-xl font-semibold text-white mb-4">Quick Actions</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {quickActions.map((action, index) => (
              <Link
                key={index}
                to={action.link}
                className="card p-6 hover:shadow-lg transition-shadow group border border-gray-600"
                style={{backgroundColor: '#001a5c'}}
              >
                <div className="flex items-center">
                  <div className={`flex-shrink-0 p-3 rounded-lg ${action.color} text-white group-hover:scale-110 transition-transform`}>
                    <action.icon className="h-6 w-6" />
                  </div>
                  <div className="ml-4">
                    <h3 className="text-lg font-medium text-white group-hover:text-yellow-300 transition-colors">
                      {action.title}
                    </h3>
                    <p className="text-sm text-yellow-200">{action.description}</p>
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
          {/* Recent Deliveries */}
          <div className="lg:col-span-2 card p-6 border border-gray-600" style={{backgroundColor: '#001a5c'}}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-white flex items-center gap-2">
                <Activity className="h-5 w-5 text-yellow-400" />
                Recent Deliveries
              </h2>
              <Link to="/my-deliveries" className="text-sm text-yellow-300 hover:text-yellow-200 flex items-center gap-1">
                View All
                <ArrowUpRight className="h-4 w-4" />
              </Link>
            </div>
            {recentDeliveries.length > 0 ? (
              <div className="space-y-3">
                {recentDeliveries.map((delivery, index) => {
                  const getStatusConfig = (status) => {
                    const statusConfig = {
                      assigned: { label: 'Assigned', color: 'bg-blue-500/20 text-blue-400 border-blue-500/40' },
                      accepted: { label: 'Accepted', color: 'bg-purple-500/20 text-purple-400 border-purple-500/40' },
                      picked_up: { label: 'Picked Up', color: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/40' },
                      in_transit: { label: 'In Transit', color: 'bg-orange-500/20 text-orange-400 border-orange-500/40' },
                      delivered: { label: 'Delivered', color: 'bg-green-500/20 text-green-400 border-green-500/40' }
                    }
                    return statusConfig[status] || { label: status, color: 'bg-gray-500/20 text-gray-400 border-gray-500/40' }
                  }
                  
                  const statusConfig = getStatusConfig(delivery.status)
                  const donationTitle = delivery.claim?.donation?.title || 'Delivery'
                  
                  return (
                    <Link
                      key={index}
                      to="/my-deliveries"
                      className="flex items-center space-x-3 p-3 rounded-lg border border-gray-600 hover:border-yellow-400/50 transition-all group"
                      style={{backgroundColor: '#001a5c'}}
                    >
                      <div className="flex-shrink-0">
                        <Truck className="h-5 w-5 text-yellow-300 group-hover:scale-110 transition-transform" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-white truncate group-hover:text-yellow-300 transition-colors">
                          {donationTitle}
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className={`px-2 py-1 rounded text-xs font-semibold border ${statusConfig.color}`}>
                            {statusConfig.label}
                          </span>
                          {delivery.claim?.recipient?.name && (
                            <span className="text-xs text-yellow-200/70">
                              To: {delivery.claim.recipient.name}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="text-xs text-yellow-300/70 flex-shrink-0">
                        {new Date(delivery.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </div>
                    </Link>
                  )
                })}
              </div>
            ) : (
              <div className="text-center py-8">
                <Truck className="h-12 w-12 text-gray-600 mx-auto mb-3" />
                <p className="text-yellow-300">No deliveries yet</p>
                <p className="text-sm text-yellow-200 mt-1">Check out available tasks to get started!</p>
                <Link to="/available-tasks" className="mt-4 inline-block text-yellow-400 hover:text-yellow-300 text-sm font-medium">
                  Browse Available Tasks →
                </Link>
              </div>
            )}
          </div>

          {/* Pending Actions */}
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
                {pendingActions.map((action, index) => {
                  const getActionType = (type) => {
                    const types = {
                      volunteer_approved: { label: 'Request Approved', icon: CheckCircle, color: 'text-green-400', link: '/available-tasks' },
                      volunteer_declined: { label: 'Request Declined', icon: XCircle, color: 'text-red-400', link: '/available-tasks' },
                      delivery_assigned: { label: 'New Delivery', icon: Truck, color: 'text-blue-400', link: '/my-deliveries' }
                    }
                    return types[type] || { label: type, icon: Bell, color: 'text-gray-400', link: '#' }
                  }
                  const actionType = getActionType(action.type)
                  const ActionIcon = actionType.icon
                  
                  return (
                    <Link
                      key={index}
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
        </motion.div>

        {/* Status Distribution and Impact Metrics */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8"
        >
          {/* Status Distribution */}
          <div className="card p-6 border border-gray-600" style={{backgroundColor: '#001a5c'}}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-white flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-yellow-400" />
                Status Overview
              </h2>
              <Target className="h-5 w-5 text-yellow-300/50" />
            </div>
            {deliveries.length > 0 ? (
              <div className="space-y-4">
                {[
                  { status: 'assigned', label: 'Assigned', color: 'bg-blue-500', count: stats.assignedDeliveries || 0 },
                  { status: 'accepted', label: 'Accepted', color: 'bg-purple-500', count: stats.acceptedDeliveries || 0 },
                  { status: 'in_progress', label: 'In Progress', color: 'bg-orange-500', count: stats.inProgressDeliveries || 0 },
                  { status: 'delivered', label: 'Delivered', color: 'bg-green-500', count: stats.completedDeliveries || 0 }
                ].map((item, index) => {
                  const total = deliveries.length
                  const percentage = total > 0 ? Math.round((item.count / total) * 100) : 0
                  
                  return (
                    <div key={index} className="flex items-center space-x-3">
                      <div className={`w-3 h-3 rounded ${item.color} flex-shrink-0`} />
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm font-medium text-white">{item.label}</span>
                          <span className="text-sm text-yellow-300">{item.count}</span>
                        </div>
                        <div className="w-full bg-gray-700 rounded-full h-2">
                          <div
                            className={`${item.color} h-2 rounded-full transition-all duration-500`}
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : (
              <div className="text-center py-8">
                <BarChart3 className="h-12 w-12 text-gray-600 mx-auto mb-3" />
                <p className="text-yellow-300 text-sm">No status data yet</p>
                <p className="text-xs text-yellow-200/70 mt-1">Your delivery statuses will appear here</p>
              </div>
            )}
          </div>

          {/* Impact Metrics */}
          <div className="card p-6 border border-gray-600" style={{backgroundColor: '#001a5c'}}>
            <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
              <Award className="h-5 w-5 text-yellow-400" />
              Your Impact
            </h2>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 rounded-lg border border-green-500/20 bg-green-500/10">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-green-500/20 rounded-lg">
                    <Star className="h-6 w-6 text-green-400" />
                  </div>
                  <div>
                    <p className="text-sm text-green-200">Deliveries Completed</p>
                    <p className="text-2xl font-bold text-white">{stats.completedDeliveries || 0}</p>
                  </div>
                </div>
              </div>
              <div className="flex items-center justify-between p-4 rounded-lg border border-purple-500/20 bg-purple-500/10">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-purple-500/20 rounded-lg">
                    <Percent className="h-6 w-6 text-purple-400" />
                  </div>
                  <div>
                    <p className="text-sm text-purple-200">Completion Rate</p>
                    <p className="text-2xl font-bold text-white">{stats.completionRate || 0}%</p>
                  </div>
                </div>
              </div>
              <div className="flex items-center justify-between p-4 rounded-lg border border-blue-500/20 bg-blue-500/10">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-blue-500/20 rounded-lg">
                    <Truck className="h-6 w-6 text-blue-400" />
                  </div>
                  <div>
                    <p className="text-sm text-blue-200">Total Deliveries</p>
                    <p className="text-2xl font-bold text-white">{stats.totalDeliveries || 0}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Quick Insights */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.5 }}
          className="mb-8"
        >
          <div className="card p-6 border border-gray-600" style={{backgroundColor: '#001a5c'}}>
            <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-yellow-400" />
              Quick Insights
            </h2>
            <div className="space-y-4">
              {stats.totalDeliveries === 0 ? (
                <div className="p-4 rounded-lg border border-yellow-500/20 bg-yellow-500/10">
                  <p className="text-sm text-yellow-200">
                    <span className="font-semibold text-white">Get Started!</span> Browse available tasks to start making deliveries and help connect our community.
                  </p>
                </div>
              ) : (
                <>
                  {stats.assignedDeliveries > 0 && (
                    <div className="p-4 rounded-lg border border-blue-500/20 bg-blue-500/10">
                      <p className="text-sm text-blue-200">
                        <span className="font-semibold text-white">{stats.assignedDeliveries}</span> delivery{stats.assignedDeliveries !== 1 ? 'ies' : ''} {stats.assignedDeliveries === 1 ? 'is' : 'are'} assigned and waiting for your acceptance.
                      </p>
                    </div>
                  )}
                  {stats.inProgressDeliveries > 0 && (
                    <div className="p-4 rounded-lg border border-orange-500/20 bg-orange-500/10">
                      <p className="text-sm text-orange-200">
                        <span className="font-semibold text-white">{stats.inProgressDeliveries}</span> delivery{stats.inProgressDeliveries !== 1 ? 'ies' : ''} {stats.inProgressDeliveries === 1 ? 'is' : 'are'} currently in progress.
                      </p>
                    </div>
                  )}
                  {stats.completedDeliveries > 0 && (
                    <div className="p-4 rounded-lg border border-green-500/20 bg-green-500/10">
                      <p className="text-sm text-green-200">
                        <span className="font-semibold text-white">Great job!</span> You've successfully completed {stats.completedDeliveries} delivery{stats.completedDeliveries !== 1 ? 'ies' : ''}.
                      </p>
                    </div>
                  )}
                  {stats.completionRate >= 80 && stats.completedDeliveries > 0 && (
                    <div className="p-4 rounded-lg border border-purple-500/20 bg-purple-500/10">
                      <p className="text-sm text-purple-200">
                        <span className="font-semibold text-white">Excellent!</span> Your {stats.completionRate}% completion rate shows your dedication to helping others.
                      </p>
                    </div>
                  )}
                  {pendingActions.length > 0 && (
                    <div className="p-4 rounded-lg border border-yellow-500/30 bg-yellow-500/20">
                      <p className="text-sm text-yellow-200">
                        <span className="font-semibold text-white">Action Required:</span> You have {pendingActions.length} pending action{pendingActions.length !== 1 ? 's' : ''} that need your attention.
                      </p>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </motion.div>

        {/* Workflow Guide Modal */}
        <WorkflowGuideModal
          isOpen={showWorkflowGuide}
          onClose={() => setShowWorkflowGuide(false)}
          userRole="volunteer"
        />
      </div>
    </div>
  )
}

export default VolunteerDashboardPage 