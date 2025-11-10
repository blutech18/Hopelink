import React, { useState, useEffect, useRef } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Menu, 
  X, 
  Heart, 
  User, 
  LogOut, 
  Settings,
  Gift,
  Users,
  Calendar,
  Truck,
  Shield,
  Bell,
  Clock,
  ChevronDown,
  MessageSquare,
  Building,
  ShieldCheck,
  AlertTriangle,
  Flag,
  CheckCircle,
  Target
} from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import { useToast } from '../../contexts/ToastContext'
import { db } from '../../lib/supabase'
import FeedbackModal from '../ui/FeedbackModal'

const Navbar = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false)
  const [isSigningOut, setIsSigningOut] = useState(false)
  const [isSideMenuOpen, setIsSideMenuOpen] = useState(false)
  const [activeSection, setActiveSection] = useState('home')
  const [showFeedbackFloat, setShowFeedbackFloat] = useState(false)
  const [showFeedbackModal, setShowFeedbackModal] = useState(false)
  const [showNotifications, setShowNotifications] = useState(false)
  const [showNotificationsModal, setShowNotificationsModal] = useState(false)
  const [notifications, setNotifications] = useState([])
  const [unreadCount, setUnreadCount] = useState(0)
  const { isAuthenticated, profile, signOut } = useAuth()
  const { success, error } = useToast()
  const location = useLocation()
  const navigate = useNavigate()
  const desktopProfileMenuRef = useRef(null)
  const mobileProfileMenuRef = useRef(null)
  
  // Hide profile display during callback processing to prevent flash of user info before error handling
  const isCallbackPage = location.pathname === '/auth/callback'
  const shouldShowProfile = isAuthenticated && profile && !isCallbackPage

  // Close profile menu when clicking outside either desktop or mobile dropdowns
  useEffect(() => {
    const handleClickOutside = (event) => {
      const clickedInsideDesktop = desktopProfileMenuRef.current && desktopProfileMenuRef.current.contains(event.target)
      const clickedInsideMobile = mobileProfileMenuRef.current && mobileProfileMenuRef.current.contains(event.target)
      if (!clickedInsideDesktop && !clickedInsideMobile) {
        setIsProfileMenuOpen(false)
      }
    }

    document.addEventListener('click', handleClickOutside)
    return () => document.removeEventListener('click', handleClickOutside)
  }, [])

  // Periodic floating animation for feedback tooltip every 20 minutes
  useEffect(() => {
    const showFloatingTooltip = () => {
      setShowFeedbackFloat(true)
      setTimeout(() => setShowFeedbackFloat(false), 5000) // Show for 5 seconds
    }

    // Show immediately on mount
    const initialTimeout = setTimeout(showFloatingTooltip, 3000) // Show after 3 seconds

    // Then show every 20 minutes
    const interval = setInterval(showFloatingTooltip, 20 * 60 * 1000) // 20 minutes

    return () => {
      clearTimeout(initialTimeout)
      clearInterval(interval)
    }
  }, [])

  // Realtime notifications
  useEffect(() => {
    let unsubscribe = null
    async function load() {
      if (!profile?.id) {
        console.log('⚠️ No profile ID, skipping notification load')
        return
      }
      console.log(`🔄 Loading notifications for user ${profile.id}...`)
      try {
        const items = await db.getUserNotifications(profile.id, 50)
        console.log(`📬 Received ${items?.length || 0} notifications from database:`, items)
        setNotifications(items || [])
        setUnreadCount((items || []).filter(n => !n.read_at).length)
        console.log(`✅ Notifications state updated: ${items?.length || 0} total, ${(items || []).filter(n => !n.read_at).length} unread`)
      } catch (error) {
        console.error('❌ Error loading notifications:', error)
      }
      try {
        unsubscribe = db.subscribeToUserNotifications(profile.id, async (payload) => {
          console.log('🔔 Notification change detected in Navbar:', payload)
          try {
            // Refresh notifications when any change is detected
            const items = await db.getUserNotifications(profile.id, 50)
            console.log(`📬 Polling update - received ${items?.length || 0} notifications`)
            setNotifications(items || [])
            setUnreadCount((items || []).filter(n => !n.read_at).length)
            console.log(`📬 Updated notifications: ${items?.length || 0} total, ${(items || []).filter(n => !n.read_at).length} unread`)
            
            // If it's a new notification (INSERT), show a visual indicator
            if (payload.eventType === 'INSERT' && payload.new) {
              console.log('✨ New notification received:', payload.new)
              // The notification will appear in the list automatically
            }
          } catch (error) {
            console.error('❌ Error refreshing notifications:', error)
          }
        })
      } catch (error) {
        console.error('❌ Error setting up notification subscription:', error)
      }
    }
    load()
    return () => { 
      if (unsubscribe) {
        console.log('🔔 Cleaning up notification subscription')
        unsubscribe() 
      }
    }
  }, [profile?.id])

  const markAllNotificationsAsRead = async () => {
    try {
      const unread = (notifications || []).filter(n => !n.read_at)
      await Promise.all(unread.map(n => db.markNotificationAsRead(n.id)))
      const items = await db.getUserNotifications(profile.id, 50)
      setNotifications(items || [])
      setUnreadCount((items || []).filter(n => !n.read_at).length)
      success('All notifications marked as read')
    } catch (e) {
      error('Failed to mark notifications as read')
    }
  }

  // Close menus when authentication state changes
  useEffect(() => {
    setIsProfileMenuOpen(false)
    setIsMenuOpen(false)
  }, [isAuthenticated])

  // Track scroll position to update active section
  useEffect(() => {
    const handleScroll = () => {
      if (location.pathname !== '/') {
        setActiveSection('home')
        return
      }

      const sections = ['home', 'events', 'about', 'contact']
      const scrollPosition = window.scrollY + 100 // Offset for navbar height

      for (let i = sections.length - 1; i >= 0; i--) {
        const section = sections[i]
        const element = section === 'home' ? document.body : document.getElementById(section)
        
        if (element) {
          const elementTop = section === 'home' ? 0 : element.offsetTop
          if (scrollPosition >= elementTop) {
            setActiveSection(section)
            break
          }
        }
      }
    }

    // Set initial active section
    handleScroll()
    
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [location.pathname])

  const handleSignOut = async () => {
    // Prevent double-clicking
    if (isSigningOut) return
    
    try {
      setIsSigningOut(true)
      
      // Close the profile menu first
      setIsProfileMenuOpen(false)
      
      // Add a loading state to prevent multiple clicks
      console.log('Starting sign out process...')
      
      await signOut()
      
      // Navigate to home page first, then show toast
      // This ensures a smooth transition without double navigation
      navigate('/', { replace: true })
      
      // Show success message after navigation
      setTimeout(() => {
        success('Successfully signed out')
      }, 100)
    } catch (signOutError) {
      console.error('Error signing out:', signOutError)
      // Show error message but still try to navigate (in case of partial sign out)
      error('Error signing out, but you have been logged out locally')
      navigate('/', { replace: true })
    } finally {
      setIsSigningOut(false)
    }
  }

  const handleScrollNavigation = (scrollTo) => {
    // If we're not on the home page, navigate there first
    if (location.pathname !== '/') {
      navigate('/')
      // Wait for navigation to complete, then scroll
      setTimeout(() => {
        if (scrollTo === 'home') {
          window.scrollTo({ top: 0, behavior: 'smooth' })
        } else {
          const element = document.getElementById(scrollTo)
          if (element) {
            element.scrollIntoView({ behavior: 'smooth', block: 'start' })
          }
        }
      }, 100)
    } else {
      // We're already on home page, just scroll
      if (scrollTo === 'home') {
        window.scrollTo({ top: 0, behavior: 'smooth' })
      } else {
        const element = document.getElementById(scrollTo)
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'start' })
        }
      }
    }
  }

  // Public navigation links (shown only when not authenticated or when clicking logo)
  const publicNavLinks = [
    { path: '/', label: 'Home', scrollTo: 'home' },
    { path: '/events', label: 'Events', scrollTo: 'events' },
    { path: '/about', label: 'About', scrollTo: 'about' },
    { path: '/', label: 'Contact', scrollTo: 'contact' },
  ]

  // Helper function to determine if a link is active
  const isLinkActive = (link) => {
    if (link.scrollTo) {
      // For scroll-based navigation, check if current section matches the link's scroll target
      return location.pathname === '/' && activeSection === link.scrollTo
    }
    return location.pathname === link.path
  }

  // Get navigation links based on user role
  const getNavLinksForRole = (role) => {
    switch (role) {
      case 'donor':
      case 'admin':
        return [
          { path: '/events', label: 'Events' },
          { path: '/', label: 'Contact', scrollTo: 'contact' }
        ] // Events and Contact for donors and admins
      case 'recipient':
      case 'volunteer':
        return [{ path: '/', label: 'Contact', scrollTo: 'contact' }] // Contact for recipients and volunteers
      default:
        return publicNavLinks // Show all for non-authenticated users
    }
  }

  const roleBasedLinks = {
    donor: [
      { path: '/dashboard', label: 'Dashboard', icon: User },
      { path: '/post-donation', label: 'Post Donation', icon: Gift },
      { path: '/my-donations', label: 'My Donations', icon: Heart },
      { path: '/pending-requests', label: 'Pending Requests', icon: Bell },
      { path: '/browse-requests', label: 'Browse Requests', icon: Users },
    ],
    recipient: [
      { path: '/dashboard', label: 'Dashboard', icon: User },
      { path: '/browse-donations', label: 'Browse Donations', icon: Gift },
      { path: '/create-request', label: 'Create Request', icon: Heart },
      { path: '/my-requests', label: 'My Requests', icon: Users },
    ],
    volunteer: [
      { path: '/volunteer-dashboard', label: 'Dashboard', icon: User },
      { path: '/available-tasks', label: 'Available Tasks', icon: Truck },
      { path: '/my-deliveries', label: 'My Deliveries', icon: Calendar },
      { path: '/volunteer-schedule', label: 'Manage Schedule', icon: Clock },
    ],
    admin: [
      { path: '/admin', label: 'Dashboard', icon: Shield },
      { path: '/admin/users', label: 'Users', icon: Users },
      { path: '/admin/id-verification', label: 'ID Verification', icon: ShieldCheck },
      { path: '/admin/donations', label: 'Donations', icon: Gift },
      { path: '/admin/cfc-donations', label: 'Direct Donations', icon: Building },
      { path: '/admin/volunteers', label: 'Volunteers', icon: Truck },
      { path: '/admin/requests', label: 'Requests', icon: Heart },
      { path: '/admin/events', label: 'Events', icon: Calendar },
      { path: '/admin/matching-parameters', label: 'Matching Parameters', icon: Target },
      { path: '/admin/feedback', label: 'Feedback', icon: MessageSquare },
    ]
  }

  // Get the current navigation links based on authentication and role
  const currentNavLinks = isAuthenticated && profile?.role 
    ? getNavLinksForRole(profile.role)
    : publicNavLinks

  return (
    <nav className="shadow-sm border-b border-navy-800 sticky top-0 z-40" style={{backgroundColor: '#000f3d'}}>
      <div className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8">
        <div className="flex justify-between h-14 sm:h-16">
          {/* Logo and Hamburger Container */}
          <div className="flex items-center relative">
            {/* Left: Desktop Sidebar Toggle for authenticated users */}
            {shouldShowProfile && (
              <button
                onClick={() => setIsSideMenuOpen(true)}
                className="p-1.5 sm:p-2 rounded-md text-yellow-400 hover:text-white hover:bg-navy-800 mr-1 sm:mr-2 transition-colors"
                aria-label="Open menu"
              >
                <Menu className="h-5 w-5 sm:h-6 sm:w-6" />
              </button>
            )}
            {shouldShowProfile ? (
              <Link to="/" className="flex items-center space-x-1.5 sm:space-x-2">
                <img src="/hopelinklogo.png" alt="HopeLink" className="h-8 sm:h-10 md:h-12 rounded" />
                <div className="flex flex-col">
                  <span className="text-base sm:text-lg md:text-xl font-bold text-white">HopeLink</span>
                  <span className="text-[8px] sm:text-[9px] md:text-[10px] text-yellow-300">CFC-GK</span>
                </div>
              </Link>
            ) : (
              <Link to="/" className="flex items-center space-x-1.5 sm:space-x-2">
                <img src="/hopelinklogo.png" alt="HopeLink" className="h-8 sm:h-10 md:h-12 rounded" />
                <div className="flex flex-col">
                  <span className="text-base sm:text-lg md:text-xl font-bold text-white">HopeLink</span>
                  <span className="text-[8px] sm:text-[9px] md:text-[10px] text-yellow-300">CFC-GK</span>
                </div>
              </Link>
            )}

          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex md:items-center md:space-x-8">
            {/* Public Navigation - show for all users */}
            {publicNavLinks.map((link) => (
              link.scrollTo ? (
                <button
                  key={`${link.path}-${link.scrollTo}`}
                  onClick={() => handleScrollNavigation(link.scrollTo)}
                  className={`px-3 py-2 text-sm font-medium transition-all duration-300 ease-in-out relative ${
                    isLinkActive(link)
                      ? 'text-yellow-400'
                      : 'text-yellow-200 hover:text-yellow-400'
                  }`}
                >
                  {link.label}
                  <div className={`absolute bottom-0 left-0 h-0.5 bg-yellow-400 transition-all duration-300 ease-in-out ${
                    isLinkActive(link) ? 'w-full' : 'w-0'
                  }`} />
                </button>
              ) : (
                <Link
                  key={`${link.path}-${link.label}`}
                  to={link.path}
                  className={`px-3 py-2 text-sm font-medium transition-all duration-300 ease-in-out relative ${
                    isLinkActive(link)
                      ? 'text-yellow-400'
                      : 'text-yellow-200 hover:text-yellow-400'
                  }`}
                >
                  {link.label}
                  <div className={`absolute bottom-0 left-0 h-0.5 bg-yellow-400 transition-all duration-300 ease-in-out ${
                    isLinkActive(link) ? 'w-full' : 'w-0'
                  }`} />
                </Link>
              )
            ))}

            {/* Role-based Navigation - show only for non-authenticated users */}
            {!isAuthenticated && isAuthenticated && profile?.role && roleBasedLinks[profile.role] && (
              <>
                {roleBasedLinks[profile.role].map((link) => (
                  <Link
                    key={link.path}
                    to={link.path}
                    className={`flex items-center space-x-1 px-3 py-2 text-sm font-medium transition-colors ${
                      location.pathname === link.path
                        ? 'text-yellow-400'
                        : 'text-yellow-200 hover:text-yellow-400'
                    }`}
                  >
                    <link.icon className="h-4 w-4" />
                    <span>{link.label}</span>
                  </Link>
                ))}
              </>
            )}

            {/* Auth Section */}
            {shouldShowProfile ? (
              <div className="flex items-center space-x-2">
            {/* Notifications Bell */}
            <div className="relative">
              <button
                onClick={() => setShowNotifications(v => !v)}
                className="p-2 rounded-lg hover:bg-navy-800 transition-colors relative group"
                aria-label="Notifications"
              >
                <Bell className={`h-5 w-5 transition-colors ${unreadCount > 0 ? 'text-yellow-400 animate-pulse' : 'text-yellow-400 hover:text-yellow-300'}`} />
                {unreadCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 bg-gradient-to-br from-red-500 to-red-600 text-white text-[11px] font-bold rounded-full h-5 min-w-[20px] px-1.5 flex items-center justify-center border-2 border-navy-900 shadow-lg animate-bounce">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </button>
              <AnimatePresence>
                {showNotifications && (
                  <motion.div
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    className="absolute right-0 mt-2 w-96 bg-navy-900 border-2 border-yellow-500/30 rounded-lg shadow-2xl z-50 flex flex-col"
                  >
                    {/* Header */}
                    <div className="flex items-center justify-between p-4 border-b-2 border-yellow-500/20 bg-navy-800/50">
                      <div className="flex items-center gap-2">
                        <Bell className="h-5 w-5 text-yellow-400" />
                        <span className="text-white text-base font-bold">Notifications</span>
                        {unreadCount > 0 && (
                          <span className="px-2 py-0.5 bg-red-500 text-white text-xs font-bold rounded-full">
                            {unreadCount} new
                          </span>
                        )}
                      </div>
                      {unreadCount > 0 && (
                        <button 
                          onClick={markAllNotificationsAsRead} 
                          className="text-xs text-yellow-300 hover:text-white font-semibold transition-colors px-2 py-1 hover:bg-navy-700 rounded"
                        >
                          Mark all read
                        </button>
                      )}
                    </div>
                    
                    {/* Notifications List */}
                    <div className="overflow-y-auto max-h-[400px] custom-scrollbar">
                      {!notifications || notifications.length === 0 ? (
                        <div className="p-8 text-center">
                          <Bell className="h-12 w-12 text-gray-600 mx-auto mb-3" />
                          <p className="text-gray-400 text-sm">No notifications yet</p>
                          <p className="text-gray-500 text-xs mt-2">
                            {notifications === null ? 'Loading...' : 'You\'re all caught up!'}
                          </p>
                        </div>
                      ) : (
                        <div className="divide-y divide-navy-800">
                          {notifications.slice(0, 5).map(n => (
                            <div 
                              key={n.id} 
                              className={`p-4 transition-all hover:bg-navy-800/50 cursor-pointer group ${
                                !n.read_at ? 'bg-yellow-900/10 border-l-4 border-yellow-500' : 'border-l-4 border-transparent'
                              }`}
                              onClick={async () => {
                                if (!n.read_at) {
                                  try {
                                    await db.markNotificationAsRead(n.id)
                                    const items = await db.getUserNotifications(profile.id, 50)
                                    setNotifications(items || [])
                                    setUnreadCount((items || []).filter(n => !n.read_at).length)
                                  } catch (_) {}
                                }
                                
                                // Navigate based on notification type for admin users
                                if (profile?.role === 'admin' && n.data?.link) {
                                  const notifType = n.data?.notification_type
                                  let targetPath = n.data.link
                                  
                                  // Add query params for specific notification types
                                  if (notifType === 'user_report') {
                                    targetPath = '/admin/users?openReports=true'
                                  }
                                  
                                  navigate(targetPath)
                                  setShowNotifications(false)
                                }
                              }}
                            >
                              <div className="flex items-start justify-between gap-3">
                                <div className="flex-1 min-w-0">
                                  {/* Title with unread indicator */}
                                  <div className="flex items-center gap-2 mb-1">
                                    {!n.read_at && (
                                      <span className="h-2 w-2 bg-yellow-400 rounded-full flex-shrink-0 animate-pulse"></span>
                                    )}
                                    {n.type === 'user_report' && (
                                      <Flag className="h-4 w-4 text-red-400 flex-shrink-0" />
                                    )}
                                    {n.type !== 'user_report' && n.type === 'system_alert' && (
                                      <AlertTriangle className="h-4 w-4 text-yellow-400 flex-shrink-0" />
                                    )}
                                    <h4 className={`text-sm font-semibold truncate ${
                                      n.type === 'user_report' ? 'text-red-300' : 'text-white'
                                    }`}>
                                      {n.title || 'Notification'}
                                    </h4>
                                  </div>
                                  
                                  {/* Message */}
                                  <p className={`text-xs mb-2 line-clamp-2 ${
                                    n.type === 'user_report' ? 'text-red-200' : 'text-yellow-300'
                                  }`}>
                                    {n.message}
                                  </p>
                                  {/* Show clickable hint for admin notifications with links */}
                                  {profile?.role === 'admin' && n.data?.link && (
                                    <p className="text-blue-300 text-[10px] mt-1 italic flex items-center gap-1">
                                      <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                                      </svg>
                                      Click to view details
                                    </p>
                                  )}
                                  
                                  {/* Timestamp and status */}
                                  <div className="flex items-center justify-between">
                                    <span className="text-gray-400 text-[11px]">
                                      {new Date(n.created_at).toLocaleString()}
                                    </span>
                                    {!n.read_at ? (
                                      <span className="text-yellow-400 text-[10px] font-semibold uppercase tracking-wide">
                                        New
                                      </span>
                                    ) : (
                                      <span className="text-gray-500 text-[10px] uppercase tracking-wide">
                                        Read
                                      </span>
                                    )}
                                  </div>
                                </div>
                                
                                {/* Mark as read button for unread notifications */}
                                {!n.read_at && (
                                  <button
                                    onClick={async (e) => {
                                      e.stopPropagation()
                                      try {
                                        await db.markNotificationAsRead(n.id)
                                        const items = await db.getUserNotifications(profile.id, 50)
                                        setNotifications(items || [])
                                        setUnreadCount((items || []).filter(n => !n.read_at).length)
                                      } catch (_) {}
                                    }}
                                    className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-navy-700 rounded"
                                    title="Mark as read"
                                  >
                                    <svg className="h-4 w-4 text-yellow-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                    </svg>
                                  </button>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                    
                    {/* View All Button */}
                    {notifications && notifications.length > 0 && (
                      <div className="p-2 border-t border-yellow-500/20 bg-navy-800/30">
                        <button
                          onClick={() => {
                            setShowNotificationsModal(true)
                            setShowNotifications(false)
                          }}
                          className="w-full py-1.5 px-3 bg-yellow-500/20 hover:bg-yellow-500/30 text-yellow-400 text-xs font-semibold rounded transition-all duration-200 flex items-center justify-center gap-1.5"
                        >
                          <Bell className="h-3.5 w-3.5" />
                          View All
                        </button>
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Profile Dropdown */}
                <div className="relative" ref={desktopProfileMenuRef}>
                  <button
                    onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
                    className="flex items-center space-x-2 p-2 rounded-lg hover:bg-navy-800 transition-colors"
                  >
                    <div className="h-8 w-8 bg-yellow-600 rounded-full overflow-hidden flex items-center justify-center">
                      {profile?.profile_image_url ? (
                        <img
                          src={profile.profile_image_url}
                          alt="Profile"
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <span className="text-white text-sm font-medium">
                          {profile?.name?.charAt(0)?.toUpperCase() || 'U'}
                        </span>
                      )}
                    </div>
                    <span className="text-sm font-medium text-white">
                      {profile?.name || 'User'}
                    </span>
                    <ChevronDown className={`h-4 w-4 text-yellow-400 transition-transform ${isProfileMenuOpen ? 'rotate-180' : ''}`} />
                  </button>

                <AnimatePresence>
                  {isProfileMenuOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="absolute right-0 mt-2 w-48 bg-navy-900 rounded-lg shadow-lg border border-navy-700 py-1"
                    >
                      <Link
                        to="/profile"
                        className="flex items-center space-x-2 px-4 py-2 text-sm text-yellow-300 hover:bg-navy-800"
                        onClick={() => setIsProfileMenuOpen(false)}
                      >
                        <Settings className="h-4 w-4" />
                        <span>Profile Settings</span>
                      </Link>
                      <hr className="my-1 border-navy-700" />
                      <button
                        onClick={handleSignOut}
                        disabled={isSigningOut}
                        className={`flex items-center space-x-2 w-full px-4 py-2 text-sm transition-colors ${
                          isSigningOut 
                            ? 'text-yellow-400 cursor-not-allowed'
                            : 'text-yellow-300 hover:bg-navy-800'
                        }`}
                      >
                        <LogOut className="h-4 w-4" />
                        <span>{isSigningOut ? 'Signing Out...' : 'Sign Out'}</span>
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
                </div>

                {/* Feedback Button - Hide for admin users */}
                {profile?.role !== 'admin' && (
                  <div className="relative">
                    <button
                      onClick={() => setShowFeedbackModal(true)}
                      className="p-2 rounded-lg hover:bg-navy-800 transition-colors"
                    >
                      <MessageSquare className="h-5 w-5 text-yellow-400 hover:text-yellow-300" />
                    </button>
                    
                    {/* Floating Notification Bubble */}
                    <AnimatePresence>
                      {showFeedbackFloat && (
                        <motion.div
                          initial={{ opacity: 0, y: -10, scale: 0.9 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ opacity: 0, y: -10, scale: 0.9 }}
                          className="absolute top-full right-0 mt-4 w-48 bg-gradient-to-r from-yellow-600 to-yellow-500 text-white text-xs font-medium rounded-lg shadow-xl z-50"
                        >
                          {/* Arrow pointing up to feedback button */}
                          <div className="absolute bottom-full right-3 w-0 h-0 border-l-8 border-r-8 border-b-8 border-transparent border-b-yellow-600"></div>
                          
                          <div className="p-2 relative">
                            <button
                              onClick={(e) => {
                                e.preventDefault()
                                setShowFeedbackFloat(false)
                              }}
                              className="absolute top-1.5 right-1.5 hover:bg-white/20 rounded p-0.5 transition-colors"
                            >
                              <X className="h-3 w-3" />
                            </button>
                            <div className="flex items-center gap-1.5 pr-5">
                              <MessageSquare className="h-3.5 w-3.5 flex-shrink-0" />
                              <div className="flex-1 leading-tight text-center">
                                <div>Help Us Improve!</div>
                                <div>Share your feedback</div>
                              </div>
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center space-x-4">
                <Link
                  to="/login"
                  className={`px-3 py-2 text-sm font-medium transition-colors ${
                    location.pathname === '/login'
                      ? 'text-yellow-400 border-b-2 border-yellow-400'
                      : 'text-yellow-200 hover:text-yellow-400'
                  }`}
                >
                  Sign In
                </Link>
                <Link
                  to="/signup"
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    location.pathname === '/signup' || location.pathname.startsWith('/signup/')
                      ? 'bg-[#001a5c] text-yellow-300 border-2 border-yellow-400'
                      : 'bg-yellow-600 text-navy-950 hover:bg-yellow-700'
                  }`}
                >
                  Sign Up
                </Link>
              </div>
            )}
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden flex items-center space-x-2">
            {/* Mobile Feedback Button */}
            {shouldShowProfile && profile?.role !== 'admin' && (
              <button
                onClick={() => setShowFeedbackModal(true)}
                className="p-2 rounded-md text-yellow-400 hover:text-white hover:bg-navy-800 transition-colors active:scale-95"
                title="Help Us Improve"
                aria-label="Open Feedback Modal"
              >
                <MessageSquare className="h-5 w-5" />
              </button>
            )}

            {/* Mobile Profile Dropdown - for authenticated users */}
            {shouldShowProfile ? (
              <div className="relative" ref={mobileProfileMenuRef}>
                <button
                  onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
                  className="flex items-center space-x-1 p-2 rounded-md text-yellow-400 hover:text-white hover:bg-navy-800"
                >
                  <div className="h-6 w-6 bg-yellow-600 rounded-full overflow-hidden flex items-center justify-center">
                    {profile?.profile_image_url ? (
                      <img
                        src={profile.profile_image_url}
                        alt="Profile"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span className="text-white text-xs font-medium">
                        {profile?.name?.charAt(0)?.toUpperCase() || 'U'}
                      </span>
                    )}
                  </div>
                  <ChevronDown className={`h-4 w-4 transition-transform ${isProfileMenuOpen ? 'rotate-180' : ''}`} />
                </button>

                {/* Mobile Profile Dropdown Menu */}
                <AnimatePresence>
                  {isProfileMenuOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="absolute right-0 mt-2 w-48 bg-navy-900 rounded-lg shadow-lg border border-navy-700 py-1 z-50"
                    >
                      <Link
                        to="/profile"
                        className="flex items-center space-x-2 px-4 py-2 text-sm text-yellow-300 hover:bg-navy-800"
                        onClick={() => setIsProfileMenuOpen(false)}
                      >
                        <Settings className="h-4 w-4" />
                        <span>Profile Settings</span>
                      </Link>
                      <hr className="my-1 border-navy-700" />
                      <button
                        onClick={() => {
                          setIsProfileMenuOpen(false)
                          handleSignOut()
                        }}
                        disabled={isSigningOut}
                        className={`flex items-center space-x-2 w-full px-4 py-2 text-sm transition-colors ${
                          isSigningOut 
                            ? 'text-yellow-400 cursor-not-allowed'
                            : 'text-yellow-300 hover:bg-navy-800'
                        }`}
                      >
                        <LogOut className="h-4 w-4" />
                        <span>{isSigningOut ? 'Signing Out...' : 'Sign Out'}</span>
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ) : (
              /* Mobile Menu Toggle - for non-authenticated users */
              <button
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                className="p-2 rounded-md text-yellow-400 hover:text-white hover:bg-navy-800"
              >
                {isMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Desktop Sidebar Drawer for authenticated users */}
      <AnimatePresence>
        {shouldShowProfile && isSideMenuOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.5 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black z-40"
              onClick={() => setIsSideMenuOpen(false)}
            />
            {/* Drawer */}
            <motion.div
              initial={{ x: -300 }}
              animate={{ x: 0 }}
              exit={{ x: -300 }}
              transition={{ type: 'tween', duration: 0.2 }}
              className="fixed top-0 left-0 bottom-0 w-72 border-r border-navy-800 z-50 p-4 overflow-y-auto"
              style={{backgroundColor: '#000f3d'}}
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-2">
                  <img src="/hopelinklogo.png" alt="HopeLink" className="h-10 rounded" />
                  <span className="text-lg font-bold text-white">Menu</span>
                </div>
                <button
                  onClick={() => setIsSideMenuOpen(false)}
                  className="p-2 rounded-md text-yellow-400 hover:text-white hover:bg-navy-800"
                  aria-label="Close menu"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Role-based links */}
              {profile?.role && roleBasedLinks[profile.role] && (
                <div className="space-y-2">
                  {roleBasedLinks[profile.role].map((link) => (
                    <Link
                      key={link.path}
                      to={link.path}
                      className={`flex items-center justify-center space-x-2 px-3 py-3 rounded-md text-sm font-medium transition-colors border border-navy-700 ${
                        location.pathname === link.path
                          ? 'text-yellow-400 bg-navy-800 border-yellow-400'
                          : 'text-yellow-200 hover:text-yellow-400 hover:bg-navy-800 hover:border-yellow-400'
                      }`}
                      onClick={() => setIsSideMenuOpen(false)}
                    >
                      <link.icon className="h-4 w-4" />
                      <span>{link.label}</span>
                    </Link>
                  ))}
                </div>
              )}

              {/* Feedback Button in Side Menu */}
              {profile?.role !== 'admin' && (
                <div className="mt-2">
                  <button
                    onClick={() => {
                      setShowFeedbackModal(true)
                      setIsSideMenuOpen(false)
                    }}
                    className="w-full flex items-center justify-center space-x-2 px-3 py-3 rounded-md text-sm font-medium transition-colors border border-navy-700 text-yellow-200 hover:text-yellow-400 hover:bg-navy-800 hover:border-yellow-400"
                  >
                    <MessageSquare className="h-4 w-4" />
                    <span>Share Feedback</span>
                  </button>
                </div>
              )}

              {/* Divider */}
              <hr className="my-3 border-navy-700" />

              {/* Public quick links */}
              <div className="space-y-2">
                <h3 className="text-sm font-semibold text-yellow-300 text-center mb-2">Public Links</h3>
                {publicNavLinks.map((link) => (
                  link.scrollTo ? (
                    <button
                      key={`sidebar-${link.path}-${link.scrollTo}`}
                      onClick={() => {
                        handleScrollNavigation(link.scrollTo)
                        setIsSideMenuOpen(false)
                      }}
                      className={`block w-full text-center px-3 py-3 rounded-md text-sm font-medium transition-colors border border-navy-700 ${
                        isLinkActive(link)
                          ? 'text-yellow-400 bg-navy-800 border-yellow-400'
                          : 'text-yellow-200 hover:text-yellow-400 hover:bg-navy-800 hover:border-yellow-400'
                      }`}
                    >
                      {link.label}
                    </button>
                  ) : (
                    <Link
                      key={`sidebar-${link.path}-${link.label}`}
                      to={link.path}
                      className={`block text-center px-3 py-3 rounded-md text-sm font-medium transition-colors border border-navy-700 ${
                        isLinkActive(link)
                          ? 'text-yellow-400 bg-navy-800 border-yellow-400'
                          : 'text-yellow-200 hover:text-yellow-400 hover:bg-navy-800 hover:border-yellow-400'
                      }`}
                      onClick={() => setIsSideMenuOpen(false)}
                    >
                      {link.label}
                    </Link>
                  )
                ))}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Mobile Navigation Menu - Show for all users */}
      <AnimatePresence>
        {isMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden border-t border-navy-800 shadow-lg" style={{backgroundColor: '#000f3d'}}
          >
            <div className="px-6 py-6 space-y-3 max-w-md mx-auto">
              {/* Public Navigation for Mobile */}
              {publicNavLinks.map((link) => (
                link.scrollTo ? (
                  <button
                    key={`mobile-${link.path}-${link.scrollTo}`}
                    onClick={() => {
                      handleScrollNavigation(link.scrollTo)
                      setIsMenuOpen(false)
                    }}
                    className={`block w-full px-6 py-3 text-center text-base font-semibold rounded-lg transition-all duration-200 ${
                      isLinkActive(link)
                        ? 'text-white bg-navy-800 border border-yellow-400/50'
                        : 'text-gray-200 hover:text-white hover:bg-navy-800/70 border border-navy-700'
                    }`}
                  >
                    {link.label}
                  </button>
                ) : (
                  <Link
                    key={`mobile-${link.path}-${link.label}`}
                    to={link.path}
                    className={`block px-6 py-3 text-center text-base font-semibold rounded-lg transition-all duration-200 ${
                      isLinkActive(link)
                        ? 'text-white bg-navy-800 border border-yellow-400/50'
                        : 'text-gray-200 hover:text-white hover:bg-navy-800/70 border border-navy-700'
                    }`}
                    onClick={() => setIsMenuOpen(false)}
                  >
                    {link.label}
                  </Link>
                )
              ))}

              {/* Mobile Auth Section - Only for non-authenticated users */}
              {!isAuthenticated && (
                <div className="pt-4 space-y-3 border-t border-navy-700/50">
                <Link
                  to="/login"
                  className={`block px-6 py-3 text-center text-base font-semibold rounded-lg transition-all duration-200 border ${
                    location.pathname === '/login'
                      ? 'text-white bg-navy-800 border-yellow-400/50'
                      : 'text-gray-200 hover:text-white hover:bg-navy-800/70 border-navy-700'
                  }`}
                  onClick={() => setIsMenuOpen(false)}
                >
                  Sign In
                </Link>
                <Link
                  to="/signup"
                  className={`block px-6 py-3 text-center text-base font-bold rounded-lg transition-all duration-200 shadow-md ${
                    location.pathname === '/signup' || location.pathname.startsWith('/signup/')
                      ? 'bg-yellow-700 text-navy-950 border-2 border-yellow-400'
                      : 'bg-yellow-600 text-navy-950 hover:bg-yellow-500'
                  }`}
                  onClick={() => setIsMenuOpen(false)}
                >
                  Sign Up
                </Link>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Feedback Modal */}
      <FeedbackModal 
        isOpen={showFeedbackModal} 
        onClose={() => setShowFeedbackModal(false)} 
      />

      {/* Notifications Modal */}
      <AnimatePresence>
        {showNotificationsModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[100] flex items-center justify-center p-4"
            onClick={() => setShowNotificationsModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-navy-900 rounded-2xl shadow-2xl border-2 border-yellow-500/30 w-full max-w-4xl max-h-[85vh] overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div className="flex items-center justify-between p-6 border-b-2 border-yellow-500/20 bg-gradient-to-r from-navy-800 to-navy-900">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-yellow-500/20 rounded-xl">
                    <Bell className="h-6 w-6 text-yellow-400" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-white">All Notifications</h2>
                    <p className="text-sm text-gray-400 mt-1">
                      {notifications.length} total • {unreadCount} unread
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {unreadCount > 0 && (
                    <button
                      onClick={markAllNotificationsAsRead}
                      className="px-4 py-2 bg-yellow-500/20 hover:bg-yellow-500/30 text-yellow-400 rounded-lg transition-colors text-sm font-semibold"
                    >
                      Mark all read
                    </button>
                  )}
                  <button
                    onClick={() => setShowNotificationsModal(false)}
                    className="p-2 hover:bg-navy-800 rounded-lg transition-colors"
                  >
                    <X className="h-6 w-6 text-gray-400 hover:text-white" />
                  </button>
                </div>
              </div>

              {/* Modal Body */}
              <div className="overflow-y-auto max-h-[calc(85vh-120px)] custom-scrollbar">
                {!notifications || notifications.length === 0 ? (
                  <div className="p-12 text-center">
                    <div className="inline-flex p-6 bg-navy-800 rounded-full mb-4">
                      <Bell className="h-16 w-16 text-gray-600" />
                    </div>
                    <h3 className="text-xl font-semibold text-white mb-2">No notifications yet</h3>
                    <p className="text-gray-400">
                      {notifications === null ? 'Loading your notifications...' : 'You\'re all caught up! Check back later for updates.'}
                    </p>
                  </div>
                ) : (
                  <div className="grid gap-3 p-6">
                    {notifications.map((n) => (
                      <motion.div
                        key={n.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className={`p-5 rounded-xl border-2 transition-all cursor-pointer group ${
                          !n.read_at
                            ? 'bg-yellow-900/10 border-yellow-500/50 hover:bg-yellow-900/20 hover:border-yellow-500'
                            : 'bg-navy-800/50 border-navy-700 hover:bg-navy-800 hover:border-navy-600'
                        }`}
                        onClick={async () => {
                          if (!n.read_at) {
                            try {
                              await db.markNotificationAsRead(n.id)
                              const items = await db.getUserNotifications(profile.id, 50)
                              setNotifications(items || [])
                              setUnreadCount((items || []).filter(n => !n.read_at).length)
                            } catch (_) {}
                          }
                          
                          // Navigate based on notification type for admin users
                          if (profile?.role === 'admin' && n.data?.link) {
                            const notifType = n.data?.notification_type
                            let targetPath = n.data.link
                            
                            // Add query params for specific notification types
                            if (notifType === 'user_report') {
                              targetPath = '/admin/users?openReports=true'
                            }
                            
                            navigate(targetPath)
                            setShowNotificationsModal(false)
                          }
                        }}
                      >
                        <div className="flex items-start gap-4">
                          {/* Icon */}
                          <div className={`flex-shrink-0 p-3 rounded-xl ${
                            !n.read_at ? 'bg-yellow-500/20' : 'bg-navy-700'
                          }`}>
                            {n.type === 'user_report' && (
                              <Flag className="h-6 w-6 text-red-400" />
                            )}
                            {n.type === 'donation_request' && (
                              <Gift className="h-6 w-6 text-blue-400" />
                            )}
                            {n.type === 'volunteer_request' && (
                              <Truck className="h-6 w-6 text-green-400" />
                            )}
                            {n.type === 'delivery_completed' && (
                              <CheckCircle className="h-6 w-6 text-green-400" />
                            )}
                            {n.type === 'volunteer_approved' && (
                              <CheckCircle className="h-6 w-6 text-green-400" />
                            )}
                            {n.type === 'delivery_assigned' && (
                              <Truck className="h-6 w-6 text-blue-400" />
                            )}
                            {n.type === 'system_alert' && (
                              <AlertTriangle className="h-6 w-6 text-yellow-400" />
                            )}
                            {!['user_report', 'donation_request', 'volunteer_request', 'delivery_completed', 'volunteer_approved', 'delivery_assigned', 'system_alert'].includes(n.type) && (
                              <Bell className="h-6 w-6 text-yellow-400" />
                            )}
                          </div>

                          {/* Content */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-3 mb-2">
                              <div className="flex items-center gap-2">
                                {!n.read_at && (
                                  <span className="h-2.5 w-2.5 bg-yellow-400 rounded-full flex-shrink-0 animate-pulse"></span>
                                )}
                                <h3 className={`text-base font-bold ${
                                  n.type === 'user_report' ? 'text-red-300' : 'text-white'
                                }`}>
                                  {n.title || 'Notification'}
                                </h3>
                              </div>
                              {!n.read_at ? (
                                <span className="px-2.5 py-1 bg-yellow-500 text-navy-900 text-xs font-bold rounded-full whitespace-nowrap">
                                  NEW
                                </span>
                              ) : (
                                <span className="px-2.5 py-1 bg-navy-700 text-gray-400 text-xs font-semibold rounded-full whitespace-nowrap">
                                  READ
                                </span>
                              )}
                            </div>
                            
                            <p className={`text-sm mb-3 ${
                              n.type === 'user_report' ? 'text-red-200' : 'text-gray-300'
                            }`}>
                              {n.message}
                            </p>
                            
                            {/* Show clickable hint for admin notifications with links */}
                            {profile?.role === 'admin' && n.data?.link && (
                              <div className="flex items-center gap-2 text-blue-400 text-xs font-medium mb-2">
                                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                                </svg>
                                Click to view details
                              </div>
                            )}
                            
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2 text-gray-400 text-xs">
                                <Clock className="h-3.5 w-3.5" />
                                <span>{new Date(n.created_at).toLocaleString()}</span>
                              </div>
                              
                              {!n.read_at && (
                                <button
                                  onClick={async (e) => {
                                    e.stopPropagation()
                                    try {
                                      await db.markNotificationAsRead(n.id)
                                      const items = await db.getUserNotifications(profile.id, 50)
                                      setNotifications(items || [])
                                      setUnreadCount((items || []).filter(n => !n.read_at).length)
                                    } catch (_) {}
                                  }}
                                  className="opacity-0 group-hover:opacity-100 transition-opacity px-3 py-1.5 bg-navy-700 hover:bg-navy-600 text-yellow-400 rounded-lg text-xs font-semibold flex items-center gap-1"
                                >
                                  <CheckCircle className="h-3.5 w-3.5" />
                                  Mark as read
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  )
}

export default Navbar 