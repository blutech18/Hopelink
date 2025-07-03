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
  Bell
} from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import { useToast } from '../../contexts/ToastContext'

const Navbar = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false)
  const [isLogoMenuOpen, setIsLogoMenuOpen] = useState(false)
  const [isSigningOut, setIsSigningOut] = useState(false)
  const { isAuthenticated, profile, signOut } = useAuth()
  const { success, error } = useToast()
  const location = useLocation()
  const navigate = useNavigate()
  const profileMenuRef = useRef(null)
  const logoMenuRef = useRef(null)

  // Close menus when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (profileMenuRef.current && !profileMenuRef.current.contains(event.target)) {
        setIsProfileMenuOpen(false)
      }
      if (logoMenuRef.current && !logoMenuRef.current.contains(event.target)) {
        setIsLogoMenuOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [])

  // Close menus when authentication state changes
  useEffect(() => {
    setIsProfileMenuOpen(false)
    setIsLogoMenuOpen(false)
    setIsMenuOpen(false)
  }, [isAuthenticated])

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
      success('Successfully signed out')
      
      // Navigate immediately after successful sign out
      navigate('/')
    } catch (signOutError) {
      console.error('Error signing out:', signOutError)
      // Show error message but still try to navigate (in case of partial sign out)
      error('Error signing out, but you have been logged out locally')
      navigate('/')
    } finally {
      setIsSigningOut(false)
    }
  }

  // Public navigation links (shown only when not authenticated or when clicking logo)
  const publicNavLinks = [
    { path: '/', label: 'Home' },
    { path: '/events', label: 'Events' },
    { path: '/about', label: 'About' },
  ]

  // Get navigation links based on user role
  const getNavLinksForRole = (role) => {
    switch (role) {
      case 'donor':
      case 'admin':
        return [{ path: '/events', label: 'Events' }] // Events for donors and admins
      case 'recipient':
      case 'volunteer':
        return [] // No public nav links for recipients and volunteers
      default:
        return publicNavLinks // Show all for non-authenticated users
    }
  }

  const roleBasedLinks = {
    donor: [
      { path: '/dashboard', label: 'Dashboard', icon: User },
      { path: '/post-donation', label: 'Post Donation', icon: Gift },
      { path: '/my-donations', label: 'My Donations', icon: Heart },
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
    ],
    admin: [
      { path: '/admin', label: 'Dashboard', icon: Shield },
      { path: '/admin/users', label: 'Users', icon: Users },
      { path: '/admin/donations', label: 'Donations', icon: Gift },
      { path: '/admin/volunteers', label: 'Volunteers', icon: Truck },
      { path: '/admin/requests', label: 'Requests', icon: Heart },
    ]
  }

  // Get the current navigation links based on authentication and role
  const currentNavLinks = isAuthenticated && profile?.role 
    ? getNavLinksForRole(profile.role)
    : publicNavLinks

  return (
    <nav className="bg-gradient-to-r from-navy-900 to-navy-800 shadow-sm border-b border-navy-800 sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          {/* Logo */}
          <div className="flex items-center relative" ref={logoMenuRef}>
            {isAuthenticated ? (
              <button
                onClick={() => setIsLogoMenuOpen(!isLogoMenuOpen)}
                className="flex items-center space-x-2 p-2 rounded-lg hover:bg-navy-800 transition-colors"
              >
                <img src="/hopelinklogo.png" alt="HopeLink" className="h-8 w-8 rounded" />
                <span className="text-xl font-bold text-white">HopeLink</span>
              </button>
            ) : (
              <Link to="/" className="flex items-center space-x-2">
                <img src="/hopelinklogo.png" alt="HopeLink" className="h-8 w-8 rounded" />
                <span className="text-xl font-bold text-white">HopeLink</span>
              </Link>
            )}

            {/* Logo Dropdown Menu for authenticated users */}
            <AnimatePresence>
              {isLogoMenuOpen && isAuthenticated && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="absolute left-0 top-full mt-2 w-48 bg-navy-900 rounded-lg shadow-lg border border-navy-700 py-1"
                >
                  {publicNavLinks.map((link) => (
                    <Link
                      key={link.path}
                      to={link.path}
                      className="block px-4 py-2 text-sm text-skyblue-300 hover:bg-navy-800"
                      onClick={() => setIsLogoMenuOpen(false)}
                    >
                      {link.label}
                    </Link>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex md:items-center md:space-x-8">
            {/* Role-based Public Navigation */}
            {currentNavLinks.map((link) => (
              <Link
                key={link.path}
                to={link.path}
                className={`px-3 py-2 text-sm font-medium transition-colors ${
                  location.pathname === link.path
                    ? 'text-skyblue-400 border-b-2 border-skyblue-400'
                    : 'text-skyblue-200 hover:text-skyblue-400'
                }`}
              >
                {link.label}
              </Link>
            ))}

            {/* Role-based Navigation */}
            {isAuthenticated && profile?.role && roleBasedLinks[profile.role] && (
              <>
                {roleBasedLinks[profile.role].map((link) => (
                  <Link
                    key={link.path}
                    to={link.path}
                    className={`flex items-center space-x-1 px-3 py-2 text-sm font-medium transition-colors ${
                      location.pathname === link.path
                        ? 'text-skyblue-400'
                        : 'text-skyblue-200 hover:text-skyblue-400'
                    }`}
                  >
                    <link.icon className="h-4 w-4" />
                    <span>{link.label}</span>
                  </Link>
                ))}
              </>
            )}

            {/* Auth Section */}
            {isAuthenticated ? (
              <div className="relative" ref={profileMenuRef}>
                <button
                  onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
                  className="flex items-center space-x-2 p-2 rounded-lg hover:bg-navy-800 transition-colors"
                >
                  <div className="h-8 w-8 bg-skyblue-600 rounded-full overflow-hidden flex items-center justify-center">
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
                        className="flex items-center space-x-2 px-4 py-2 text-sm text-skyblue-300 hover:bg-navy-800"
                        onClick={() => setIsProfileMenuOpen(false)}
                      >
                        <Settings className="h-4 w-4" />
                        <span>Profile Settings</span>
                      </Link>
                      {profile?.role === 'admin' && (
                        <Link
                          to="/admin/settings"
                          className="flex items-center space-x-2 px-4 py-2 text-sm text-skyblue-300 hover:bg-navy-800"
                          onClick={() => setIsProfileMenuOpen(false)}
                        >
                          <Shield className="h-4 w-4" />
                          <span>Admin Settings</span>
                        </Link>
                      )}
                      <hr className="my-1 border-navy-700" />
                      <button
                        onClick={handleSignOut}
                        disabled={isSigningOut}
                        className={`flex items-center space-x-2 w-full px-4 py-2 text-sm transition-colors ${
                          isSigningOut 
                            ? 'text-skyblue-400 cursor-not-allowed'
                            : 'text-skyblue-300 hover:bg-navy-800'
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
              <div className="flex items-center space-x-4">
                <Link
                  to="/login"
                  className={`px-3 py-2 text-sm font-medium transition-colors ${
                    location.pathname === '/login'
                      ? 'text-skyblue-400 border-b-2 border-skyblue-400'
                      : 'text-skyblue-200 hover:text-skyblue-400'
                  }`}
                >
                  Sign In
                </Link>
                <Link
                  to="/signup"
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    location.pathname === '/signup' || location.pathname.startsWith('/signup/')
                      ? 'bg-skyblue-700 text-white border-2 border-skyblue-400'
                      : 'bg-skyblue-600 text-white hover:bg-skyblue-700'
                  }`}
                >
                  Sign Up
                </Link>
              </div>
            )}
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden flex items-center">
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="p-2 rounded-md text-skyblue-400 hover:text-white hover:bg-navy-800"
            >
              {isMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Navigation Menu */}
      <AnimatePresence>
        {isMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden bg-navy-900 border-t border-navy-800"
          >
            <div className="px-2 pt-2 pb-3 space-y-1">
              {/* Role-based Public Navigation for Mobile */}
              {currentNavLinks.map((link) => (
                <Link
                  key={link.path}
                  to={link.path}
                  className={`block px-3 py-2 text-base font-medium ${
                    location.pathname === link.path
                      ? 'text-skyblue-400 bg-navy-800'
                      : 'text-skyblue-200 hover:text-skyblue-400 hover:bg-navy-800'
                  }`}
                  onClick={() => setIsMenuOpen(false)}
                >
                  {link.label}
                </Link>
              ))}

              {/* Mobile Logo Menu for authenticated users */}
              {isAuthenticated && (
                <>
                  <hr className="my-2 border-navy-700" />
                  <div className="px-3 py-2 text-sm font-medium text-skyblue-400">Quick Links</div>
                  {publicNavLinks.map((link) => (
                    <Link
                      key={link.path}
                      to={link.path}
                      className="block px-3 py-2 text-base font-medium text-skyblue-200 hover:text-skyblue-400 hover:bg-navy-800"
                      onClick={() => setIsMenuOpen(false)}
                    >
                      {link.label}
                    </Link>
                  ))}
                </>
              )}

              {/* Mobile Role-based Navigation */}
              {isAuthenticated && profile?.role && roleBasedLinks[profile.role] && (
                <>
                  <hr className="my-2 border-navy-700" />
                  {roleBasedLinks[profile.role].map((link) => (
                    <Link
                      key={link.path}
                      to={link.path}
                      className={`flex items-center space-x-2 px-3 py-2 text-base font-medium ${
                        location.pathname === link.path
                          ? 'text-skyblue-400 bg-navy-800'
                          : 'text-skyblue-200 hover:text-skyblue-400 hover:bg-navy-800'
                      }`}
                      onClick={() => setIsMenuOpen(false)}
                    >
                      <link.icon className="h-5 w-5" />
                      <span>{link.label}</span>
                    </Link>
                  ))}
                </>
              )}

              {/* Mobile Auth Section */}
              {isAuthenticated ? (
                <>
                  <hr className="my-2 border-navy-700" />
                  <Link
                    to="/profile"
                    className="block px-3 py-2 text-base font-medium text-skyblue-200 hover:text-skyblue-400 hover:bg-navy-800"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    Profile Settings
                  </Link>
                  <button
                    onClick={() => {
                      setIsMenuOpen(false)
                      handleSignOut()
                    }}
                    disabled={isSigningOut}
                    className={`block w-full text-left px-3 py-2 text-base font-medium transition-colors ${
                      isSigningOut 
                        ? 'text-skyblue-400 cursor-not-allowed'
                        : 'text-skyblue-200 hover:text-skyblue-400 hover:bg-navy-800'
                    }`}
                  >
                    {isSigningOut ? 'Signing Out...' : 'Sign Out'}
                  </button>
                </>
              ) : (
                <>
                  <hr className="my-2 border-navy-700" />
                  <Link
                    to="/login"
                    className={`block px-3 py-2 text-base font-medium ${
                      location.pathname === '/login'
                        ? 'text-skyblue-400 bg-navy-800'
                        : 'text-skyblue-200 hover:text-skyblue-400 hover:bg-navy-800'
                    }`}
                    onClick={() => setIsMenuOpen(false)}
                  >
                    Sign In
                  </Link>
                  <Link
                    to="/signup"
                    className={`block px-3 py-2 text-base font-medium rounded-lg mx-3 text-center ${
                      location.pathname === '/signup' || location.pathname.startsWith('/signup/')
                        ? 'bg-skyblue-700 text-white border-2 border-skyblue-400'
                        : 'bg-skyblue-600 text-white'
                    }`}
                    onClick={() => setIsMenuOpen(false)}
                  >
                    Sign Up
                  </Link>
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  )
}

export default Navbar 