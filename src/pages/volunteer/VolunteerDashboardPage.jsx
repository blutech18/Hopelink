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
  Star,
  Users,
  Bell,
  CheckCircle,
  XCircle,
  AlertCircle,
  X
} from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import { useToast } from '../../contexts/ToastContext'
import { db } from '../../lib/supabase'
import LoadingSpinner from '../../components/ui/LoadingSpinner'
import ProfileCompletionPrompt from '../../components/ui/ProfileCompletionPrompt'

const VolunteerDashboardPage = () => {
  const { profile, user } = useAuth()
  const { success, error } = useToast()
  const [stats, setStats] = useState({})
  const [recentDeliveries, setRecentDeliveries] = useState([])
  const [volunteerNotifications, setVolunteerNotifications] = useState([])
  const [loading, setLoading] = useState(true)
  const [showNotificationsModal, setShowNotificationsModal] = useState(false)

  useEffect(() => {
    loadVolunteerData()
  }, [profile])

  const loadVolunteerData = async () => {
    if (!profile) return

    try {
      const deliveries = await db.getDeliveries({ volunteer_id: profile.id })
      setStats({
        totalDeliveries: deliveries.length,
        pendingDeliveries: deliveries.filter(d => d.status === 'assigned').length,
        completedDeliveries: deliveries.filter(d => d.status === 'delivered').length,
        rating: 4.8 // This could come from a rating calculation function
      })
      setRecentDeliveries(deliveries.slice(0, 5))
    } catch (error) {
      console.error('Error loading volunteer data:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchVolunteerNotifications = useCallback(async () => {
    if (!user?.id) return

    try {
      // Get notifications for volunteer request responses
      const notifications = await db.getUserNotifications(user.id, 100)
      
      // Filter volunteer-related notifications (responses to volunteer requests)
      const volunteerResponseNotifications = notifications.filter(n => 
        (n.type === 'volunteer_approved' || n.type === 'volunteer_declined' || n.type === 'delivery_assigned') && !n.read_at
      )
      
      setVolunteerNotifications(volunteerResponseNotifications)
    } catch (err) {
      console.error('Error fetching volunteer notifications:', err)
    }
  }, [user?.id])

  useEffect(() => {
    fetchVolunteerNotifications()
  }, [fetchVolunteerNotifications])

  const handleMarkNotificationAsRead = async (notificationId) => {
    try {
      await db.markNotificationAsRead(notificationId)
      success('Notification marked as read')
      await fetchVolunteerNotifications()
    } catch (err) {
      console.error('Error marking notification as read:', err)
      error('Failed to mark notification as read')
    }
  }

  const handleViewNotifications = () => {
    setShowNotificationsModal(true)
  }

  const getNotificationIcon = (type) => {
    switch (type) {
      case 'volunteer_approved':
      case 'delivery_assigned':
        return CheckCircle
      case 'volunteer_declined':
        return XCircle
      default:
        return Bell
    }
  }

  const getNotificationColor = (type) => {
    switch (type) {
      case 'volunteer_approved':
      case 'delivery_assigned':
        return 'text-green-400 bg-green-500/10 border-green-500/20'
      case 'volunteer_declined':
        return 'text-red-400 bg-red-500/10 border-red-500/20'
      default:
        return 'text-skyblue-400 bg-skyblue-500/10 border-skyblue-500/20'
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    )
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
    { label: 'Total Deliveries', value: stats.totalDeliveries || 0, icon: Truck },
    { label: 'Pending Tasks', value: stats.pendingDeliveries || 0, icon: Clock },
    { label: 'Completed', value: stats.completedDeliveries || 0, icon: TrendingUp },
    { label: 'Rating', value: stats.rating || 0, icon: Star, isRating: true }
  ]

  return (
    <div className="min-h-screen bg-navy-950 py-8">
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
              <p className="text-skyblue-300 mt-2">
                Thank you for helping connect our community through volunteer deliveries.
              </p>
            </div>
            
            {/* Notification Bell */}
            {volunteerNotifications.length > 0 && (
              <button
                onClick={handleViewNotifications}
                className="relative p-3 text-amber-400 hover:text-amber-300 hover:bg-navy-800 rounded-lg transition-all"
                title={`${volunteerNotifications.length} new notification(s)`}
              >
                <Bell className="h-6 w-6" />
                <span className="absolute -top-1 -right-1 bg-red-600 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                  {volunteerNotifications.length}
                </span>
              </button>
            )}
          </div>
        </motion.div>

        {/* Profile Completion Prompt */}
        <ProfileCompletionPrompt />

        {/* Quick Stats */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8"
        >
          {statsCards.map((stat, index) => (
            <div key={index} className="card p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <stat.icon className="h-8 w-8 text-skyblue-500" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-skyblue-300">{stat.label}</p>
                  <p className="text-2xl font-bold text-white">
                    {stat.isRating ? `${stat.value}★` : stat.value}
                  </p>
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
            {quickActions.map((action, index) => (
              <Link
                key={index}
                to={action.link}
                className="card p-6 hover:shadow-lg transition-shadow group"
              >
                <div className="flex items-center">
                  <div className={`flex-shrink-0 p-3 rounded-lg ${action.color} text-white group-hover:scale-110 transition-transform`}>
                    <action.icon className="h-6 w-6" />
                  </div>
                  <div className="ml-4">
                    <h3 className="text-lg font-medium text-white group-hover:text-skyblue-400 transition-colors">
                      {action.title}
                    </h3>
                    <p className="text-sm text-skyblue-300">{action.description}</p>
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
        >
          <h2 className="text-xl font-semibold text-white mb-4">Recent Deliveries</h2>
          <div className="card p-6">
            {recentDeliveries.length > 0 ? (
              <div className="space-y-4">
                {recentDeliveries.map((delivery, index) => (
                  <div key={index} className="flex items-center justify-between p-4 bg-navy-800 rounded-lg">
                    <div className="flex items-center">
                      <MapPin className="h-5 w-5 text-skyblue-500 mr-3" />
                      <div>
                        <p className="text-white font-medium">
                          Delivery #{delivery.id?.slice(0, 8)}
                        </p>
                        <p className="text-sm text-skyblue-300">
                          Status: {delivery.status}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-skyblue-300">
                        {new Date(delivery.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <Truck className="h-12 w-12 text-skyblue-400 mx-auto mb-4" />
                <p className="text-skyblue-300">No deliveries yet. Check out available tasks to get started!</p>
                <Link to="/available-tasks" className="btn btn-primary mt-4">
                  Browse Available Tasks
                </Link>
              </div>
            )}
          </div>
        </motion.div>

        {/* Notifications Modal */}
        {showNotificationsModal && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ duration: 0.2 }}
              className="bg-navy-900 border border-navy-700 shadow-xl rounded-lg p-6 max-w-2xl w-full max-h-[90vh] overflow-hidden"
            >
              {/* Header */}
              <div className="flex items-center justify-between mb-6 border-b border-navy-700 pb-4">
                <div className="flex items-center">
                  <Bell className="h-6 w-6 text-skyblue-500 mr-3" />
                  <div>
                    <h3 className="text-xl font-semibold text-white">Volunteer Notifications</h3>
                    <p className="text-sm text-skyblue-300">Responses to your volunteer requests</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowNotificationsModal(false)}
                  className="text-skyblue-400 hover:text-white transition-colors p-2 hover:bg-navy-800 rounded-lg"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Notifications List */}
              <div className="space-y-4 max-h-96 overflow-y-auto custom-scrollbar">
                {volunteerNotifications.length > 0 ? (
                  volunteerNotifications.map((notification) => {
                    const Icon = getNotificationIcon(notification.type)
                    return (
                      <div key={notification.id} className={`border rounded-lg p-4 ${getNotificationColor(notification.type)}`}>
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <Icon className="h-5 w-5" />
                              <span className="font-medium text-white">{notification.title}</span>
                            </div>
                            
                            <p className="text-sm text-white mb-3">
                              {notification.message}
                            </p>

                            <div className="flex items-center gap-2 mb-3">
                              <Calendar className="h-4 w-4" />
                              <span className="text-sm">
                                {new Date(notification.created_at).toLocaleDateString()}
                              </span>
                            </div>
                          </div>

                          <button
                            onClick={() => handleMarkNotificationAsRead(notification.id)}
                            className="px-3 py-1 bg-navy-700 hover:bg-navy-600 text-white text-sm rounded-lg font-medium transition-colors flex items-center gap-2"
                          >
                            <CheckCircle className="h-4 w-4" />
                            Mark Read
                          </button>
                        </div>
                      </div>
                    )
                  })
                ) : (
                  <div className="text-center py-8">
                    <Bell className="h-12 w-12 text-skyblue-400 mx-auto mb-4" />
                    <p className="text-skyblue-300">No new notifications.</p>
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="mt-6 pt-4 border-t border-navy-700 flex justify-end">
                <button
                  onClick={() => setShowNotificationsModal(false)}
                  className="btn btn-secondary"
                >
                  Close
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </div>
    </div>
  )
}

export default VolunteerDashboardPage 