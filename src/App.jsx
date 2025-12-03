import React, { useState, useEffect } from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import Navbar from './components/layout/Navbar'
import Footer from './components/layout/Footer'
import { DashboardSkeleton } from './components/ui/Skeleton'
import SetupGuide from './components/ui/SetupGuide'
import ScrollToTop from './components/ui/ScrollToTop'
import { ErrorBoundaryWithNavigate } from './components/ui/ErrorBoundary'
import { useAuth } from './contexts/AuthContext'
import { useToast } from './contexts/ToastContext'
import { isDevelopment, getEnvironmentStatus } from './lib/devUtils'
import { supabase } from './lib/supabase'
import lazyWithRetry from './lib/lazyWithRetry'
import { preloadRoutes } from './lib/preloadRoutes'

// Import public pages directly (avoiding lazy loading for these specific pages due to Vercel build issues)
import HomePage from './pages/HomePage.jsx'
import AboutPage from './pages/AboutPage.jsx'

// Lazy load other pages for better performance
const importLoginPage = () => import('./pages/auth/LoginPage')
const importSignupPage = () => import('./pages/auth/SignupPage')
const importCallbackPage = () => import('./pages/auth/CallbackPage')
const importResetPasswordPage = () => import('./pages/auth/ResetPasswordPage')
const importDashboardPage = () => import('./pages/dashboard/DashboardPage')
const importProfilePage = () => import('./pages/profile/ProfilePage')

const LoginPage = lazyWithRetry(importLoginPage)
const SignupPage = lazyWithRetry(importSignupPage)
const CallbackPage = lazyWithRetry(importCallbackPage)
const ResetPasswordPage = lazyWithRetry(importResetPasswordPage)
const DashboardPage = lazyWithRetry(importDashboardPage)
const ProfilePage = lazyWithRetry(importProfilePage)

// Donor pages
const importPostDonationPage = () => import('./pages/donor/PostDonationPage')
const importFulfillRequestPage = () => import('./pages/donor/FulfillRequestPage')
const importMyDonationsPage = () => import('./pages/donor/MyDonationsPage')
const importBrowseRequestsPage = () => import('./pages/donor/BrowseRequestsPage')
const importPendingRequestsPage = () => import('./pages/donor/PendingRequestsPage')

const PostDonationPage = lazyWithRetry(importPostDonationPage)
const FulfillRequestPage = lazyWithRetry(importFulfillRequestPage)
const MyDonationsPage = lazyWithRetry(importMyDonationsPage)
const BrowseRequestsPage = lazyWithRetry(importBrowseRequestsPage)
const PendingRequestsPage = lazyWithRetry(importPendingRequestsPage)

// Recipient pages
const importBrowseDonationsPage = () => import('./pages/recipient/BrowseDonationsPage')
const importCreateRequestPage = () => import('./pages/recipient/CreateRequestPage')
const importMyRequestsPage = () => import('./pages/recipient/MyRequestsPage')
const importMyApprovedDonationsPage = () => import('./pages/recipient/MyApprovedDonationsPage')
const importMyApprovedRequestsPage = () => import('./pages/recipient/MyApprovedRequestsPage')

const BrowseDonationsPage = lazyWithRetry(importBrowseDonationsPage)
const CreateRequestPage = lazyWithRetry(importCreateRequestPage)
const MyRequestsPage = lazyWithRetry(importMyRequestsPage)
const MyApprovedDonationsPage = lazyWithRetry(importMyApprovedDonationsPage)
const MyApprovedRequestsPage = lazyWithRetry(importMyApprovedRequestsPage)

// Volunteer pages
const importVolunteerDashboardPage = () => import('./pages/volunteer/VolunteerDashboardPage')
const importAvailableTasksPage = () => import('./pages/volunteer/AvailableTasksPage')
const importMyDeliveriesPage = () => import('./pages/volunteer/MyDeliveriesPage')
const importVolunteerSchedulePage = () => import('./pages/volunteer/VolunteerSchedulePage')

const VolunteerDashboardPage = lazyWithRetry(importVolunteerDashboardPage)
const AvailableTasksPage = lazyWithRetry(importAvailableTasksPage)
const MyDeliveriesPage = lazyWithRetry(importMyDeliveriesPage)
const VolunteerSchedulePage = lazyWithRetry(importVolunteerSchedulePage)

// Event pages
const importEventsPage = () => import('./pages/events/EventsPage')
const importEventDetailsPage = () => import('./pages/events/EventDetailsPage')

const EventsPage = lazyWithRetry(importEventsPage)
const EventDetailsPage = lazyWithRetry(importEventDetailsPage)

// Admin pages
const importAdminDashboard = () => import('./pages/admin/AdminDashboard')
const importUserManagementPage = () => import('./pages/admin/UserManagementPage')
const importIDVerificationPage = () => import('./pages/admin/IDVerificationPage')
const importAdminSettingsPage = () => import('./pages/admin/AdminSettingsPage')
const importMatchingParametersPage = () => import('./pages/admin/MatchingParametersPage')
const importAdminDonationsPage = () => import('./pages/admin/AdminDonationsPage')
const importAdminCFCDonationsPage = () => import('./pages/admin/AdminCFCDonationsPage')
const importAdminVolunteersPage = () => import('./pages/admin/AdminVolunteersPage')
const importAdminRequestsPage = () => import('./pages/admin/AdminRequestsPage')
const importAdminEventsPage = () => import('./pages/admin/AdminEventsPage')
const importAdminFeedbackPage = () => import('./pages/admin/AdminFeedbackPage')

const AdminDashboard = lazyWithRetry(importAdminDashboard)
const UserManagementPage = lazyWithRetry(importUserManagementPage)
const IDVerificationPage = lazyWithRetry(importIDVerificationPage)
const AdminSettingsPage = lazyWithRetry(importAdminSettingsPage)
const MatchingParametersPage = lazyWithRetry(importMatchingParametersPage)
const AdminDonationsPage = lazyWithRetry(importAdminDonationsPage)
const AdminCFCDonationsPage = lazyWithRetry(importAdminCFCDonationsPage)
const AdminVolunteersPage = lazyWithRetry(importAdminVolunteersPage)
const AdminRequestsPage = lazyWithRetry(importAdminRequestsPage)
const AdminEventsPage = lazyWithRetry(importAdminEventsPage)
const AdminFeedbackPage = lazyWithRetry(importAdminFeedbackPage)

// Legal pages
const importTermsOfServicePage = () => import('./pages/legal/TermsOfServicePage')
const importPrivacyPolicyPage = () => import('./pages/legal/PrivacyPolicyPage')
const importCookiesPolicyPage = () => import('./pages/legal/CookiesPolicyPage')
const importCodeOfConductPage = () => import('./pages/legal/CodeOfConductPage')

const TermsOfServicePage = lazyWithRetry(importTermsOfServicePage)
const PrivacyPolicyPage = lazyWithRetry(importPrivacyPolicyPage)
const CookiesPolicyPage = lazyWithRetry(importCookiesPolicyPage)
const CodeOfConductPage = lazyWithRetry(importCodeOfConductPage)

const routePreloaders = [
  importLoginPage,
  importSignupPage,
  importCallbackPage,
  importResetPasswordPage,
  importDashboardPage,
  importProfilePage,
  importPostDonationPage,
  importFulfillRequestPage,
  importMyDonationsPage,
  importBrowseRequestsPage,
  importPendingRequestsPage,
  importBrowseDonationsPage,
  importCreateRequestPage,
  importMyRequestsPage,
  importMyApprovedDonationsPage,
  importMyApprovedRequestsPage,
  importVolunteerDashboardPage,
  importAvailableTasksPage,
  importMyDeliveriesPage,
  importVolunteerSchedulePage,
  importEventsPage,
  importEventDetailsPage,
  importAdminDashboard,
  importUserManagementPage,
  importIDVerificationPage,
  importAdminSettingsPage,
  importMatchingParametersPage,
  importAdminDonationsPage,
  importAdminCFCDonationsPage,
  importAdminVolunteersPage,
  importAdminRequestsPage,
  importAdminEventsPage,
  importAdminFeedbackPage,
  importTermsOfServicePage,
  importPrivacyPolicyPage,
  importCookiesPolicyPage,
  importCodeOfConductPage,
]

// Protected Route component
const ProtectedRoute = ({ children, allowedRoles }) => {
  const { user, profile, loading, isSigningOut } = useAuth()
  const navigate = useNavigate()
  
  // Check if account is suspended - this is a critical security check
  React.useEffect(() => {
    if (profile && (profile.is_active === false || profile.is_active === 'false' || profile.is_active === 0)) {
      console.error('🚨 Suspended account detected in ProtectedRoute - redirecting to login')
      // The auth context should handle sign out, but we'll redirect to login as a safeguard
      navigate('/login', { replace: true, state: { error: 'Your account has been suspended. Please contact the administrator for assistance.' } })
    }
  }, [profile, navigate])
  
  if (loading || isSigningOut) {
    return (
      <div className="min-h-screen" style={{backgroundColor: '#1e293b'}}>
        <DashboardSkeleton />
      </div>
    )
  }
  
  if (!user) {
    return <Navigate to="/login" replace />
  }
  
  // CRITICAL: Block access if account is suspended
  if (profile && (profile.is_active === false || profile.is_active === 'false' || profile.is_active === 0)) {
    console.error('🚨 Suspended account blocked in ProtectedRoute')
    return <Navigate to="/login" replace state={{ error: 'Your account has been suspended. Please contact the administrator for assistance.' }} />
  }
  
  if (allowedRoles && profile && !allowedRoles.includes(profile.role)) {
    return <Navigate to="/dashboard" replace />
  }
  
  return children
}

// Public Route component (redirect if already logged in)
const PublicRoute = ({ children }) => {
  const { user, loading, isSigningIn } = useAuth()
  const location = useLocation()
  const isPasswordRecoveryRoute = location?.pathname === '/reset-password'
  
  if (loading) {
    return (
      <div className="min-h-screen" style={{backgroundColor: '#1e293b'}}>
        <DashboardSkeleton />
      </div>
    )
  }
  
  // Don't redirect if user is signing in - let the auth flow complete smoothly
  if (user && !isSigningIn && !isPasswordRecoveryRoute) {
    return <Navigate to="/dashboard" replace />
  }
  
  return children
}

// Component to conditionally render Footer
function AppContent() {
  const location = useLocation()
  const navigate = useNavigate()
  const { loading, profile } = useAuth()
  const { showToast, error: showError } = useToast()
  const [showSetupGuide, setShowSetupGuide] = useState(false)
  const [forceRemountKey, setForceRemountKey] = useState(0)
  
  useEffect(() => {
    preloadRoutes(routePreloaders)
  }, [])

  // Real-time navigation watchdog - forces React to retry loading without browser refresh
  useEffect(() => {
    // Reset remount key when route changes
    setForceRemountKey(0)
    
    const routeLoadStart = Date.now()
    let checkCount = 0
    let lastRemountTime = Date.now()
    
    // Check every 0.1 seconds if page is still loading
    const checkInterval = setInterval(() => {
      checkCount++
      const loadTime = Date.now() - routeLoadStart
      const timeSinceLastRemount = Date.now() - lastRemountTime
      
      // Check if Suspense fallback is still visible
      const suspenseFallback = document.querySelector('[data-suspense-fallback="true"]')
      const skeletonElements = document.querySelectorAll('[class*="Skeleton"], [class*="skeleton"]')
      const isStillLoading = suspenseFallback || skeletonElements.length > 0
      
      // If stuck loading for more than 0.5 seconds, force React to remount
      if (isStillLoading && loadTime > 500 && timeSinceLastRemount > 500) {
        const attemptNumber = Math.floor(checkCount / 5) + 1
        console.log(`Route ${location.pathname} stuck, forcing React remount (attempt ${attemptNumber})...`)
        // Force remount by changing the key - this will cause React to retry loading the lazy component
        setForceRemountKey(prev => prev + 1)
        lastRemountTime = Date.now()
      }
      
      // If page has loaded successfully, stop checking
      if (!isStillLoading && checkCount > 3) {
        clearInterval(checkInterval)
      }
      
      // Safety: stop after 10 seconds of checking
      if (checkCount > 100) {
        clearInterval(checkInterval)
        console.warn(`Route ${location.pathname} still loading after 10 seconds, stopping watchdog`)
      }
    }, 100) // Check every 0.1 seconds
    
    return () => {
      clearInterval(checkInterval)
    }
  }, [location.pathname])

  // Hide footer on login and signup pages
  const hideFooter = location.pathname === '/login' || location.pathname === '/signup'

  useEffect(() => {
    // Check if setup is needed in development
    if (isDevelopment) {
      const envStatus = getEnvironmentStatus()
      
      if (!envStatus.isConfigured) {
        setShowSetupGuide(true)
        showToast('Environment configuration needed for full functionality', 'warning')
      }
    }
  }, [showToast])


  // Ensure recovery links always land on the reset password page
  useEffect(() => {
    // If Supabase redirected us to Site URL with ?redirect_to=<absolute-url>, forward immediately
    const params = new URLSearchParams(window.location.search)
    const redirectTo = params.get('redirect_to')
    if (redirectTo) {
      try {
        // Use a hard navigation to preserve any subsequent token appends from Supabase
        window.location.replace(redirectTo)
        return
      } catch {
        navigate(new URL(redirectTo).pathname + (new URL(redirectTo).search || '') + (new URL(redirectTo).hash || ''), { replace: true })
        return
      }
    }

    const { data: subscription } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        const hash = window.location.hash || ''
        const search = window.location.search || ''
        // Preserve tokens when navigating
        navigate(`/reset-password${hash || search ? '' : ''}${hash}${!hash && search ? search : ''}`, { replace: true })
      }
    })
    return () => {
      subscription.subscription?.unsubscribe()
    }
  }, [navigate])

  if (loading) {
    return (
      <div className="min-h-screen" style={{backgroundColor: '#1e293b'}}>
        <DashboardSkeleton />
      </div>
    )
  }

  const shouldShowSidebar = profile && location.pathname !== '/auth/callback'
  
  return (
    <div className="min-h-screen flex flex-col" style={{backgroundColor: '#1e293b'}}>
      <Navbar />
      
      <main className={`flex-1 transition-all duration-200 ${shouldShowSidebar ? 'ml-12 sm:ml-16' : ''}`}>
          <ErrorBoundaryWithNavigate>
            <React.Suspense 
              key={`${location.pathname}-${forceRemountKey}`}
              fallback={
                <div 
                  className="min-h-screen" 
                  style={{backgroundColor: '#1e293b'}}
                  data-suspense-fallback="true"
                >
                  <DashboardSkeleton />
                </div>
              }
            >
              <Routes key={`routes-${forceRemountKey}`}>
              {/* Public routes */}
              <Route path="/" element={<HomePage />} />
              <Route path="/about" element={<AboutPage />} />
              <Route path="/events" element={<EventsPage />} />
              <Route path="/events/:id" element={<EventDetailsPage />} />
              
              {/* Legal pages */}
              <Route path="/terms" element={<TermsOfServicePage />} />
              <Route path="/privacy-policy" element={<PrivacyPolicyPage />} />
              <Route path="/cookies" element={<CookiesPolicyPage />} />
              <Route path="/conduct" element={<CodeOfConductPage />} />
              
              {/* Public auth routes */}
              <Route path="/login" element={
                <PublicRoute>
                  <LoginPage />
                </PublicRoute>
              } />
              <Route path="/signup" element={
                <PublicRoute>
                  <SignupPage />
                </PublicRoute>
              } />

              <Route path="/reset-password" element={<ResetPasswordPage />} />
              
              {/* OAuth callback route */}
              <Route path="/auth/callback" element={<CallbackPage />} />
              
              {/* Protected routes */}
              <Route path="/dashboard" element={
                <ProtectedRoute>
                  <DashboardPage />
                </ProtectedRoute>
              } />
              <Route path="/profile" element={
                <ProtectedRoute>
                  <ProfilePage />
                </ProtectedRoute>
              } />
              
              {/* Donor routes */}
              <Route path="/post-donation" element={
                <ProtectedRoute allowedRoles={['donor']}>
                  <PostDonationPage />
                </ProtectedRoute>
              } />
              <Route path="/donate-request/:requestId" element={
                <ProtectedRoute allowedRoles={['donor']}>
                  <FulfillRequestPage />
                </ProtectedRoute>
              } />
              <Route path="/my-donations" element={
                <ProtectedRoute allowedRoles={['donor']}>
                  <MyDonationsPage />
                </ProtectedRoute>
              } />
              <Route path="/browse-requests" element={
                <ProtectedRoute allowedRoles={['donor']}>
                  <BrowseRequestsPage />
                </ProtectedRoute>
              } />
              <Route path="/pending-requests" element={
                <ProtectedRoute allowedRoles={['donor']}>
                  <PendingRequestsPage />
                </ProtectedRoute>
              } />
              
              {/* Recipient routes */}
              <Route path="/browse-donations" element={
                <ProtectedRoute allowedRoles={['recipient']}>
                  <BrowseDonationsPage />
                </ProtectedRoute>
              } />
              <Route path="/create-request" element={
                <ProtectedRoute allowedRoles={['recipient']}>
                  <CreateRequestPage />
                </ProtectedRoute>
              } />
              <Route path="/my-requests" element={
                <ProtectedRoute allowedRoles={['recipient']}>
                  <MyRequestsPage />
                </ProtectedRoute>
              } />
              <Route path="/my-approved-requests" element={
                <ProtectedRoute allowedRoles={['recipient']}>
                  <MyApprovedRequestsPage />
                </ProtectedRoute>
              } />
              <Route path="/my-approved-donations" element={
                <ProtectedRoute allowedRoles={['recipient']}>
                  <MyApprovedDonationsPage />
                </ProtectedRoute>
              } />
              
              {/* Volunteer routes */}
              <Route path="/volunteer-dashboard" element={
                <ProtectedRoute allowedRoles={['volunteer']}>
                  <VolunteerDashboardPage />
                </ProtectedRoute>
              } />
              <Route path="/available-tasks" element={
                <ProtectedRoute allowedRoles={['volunteer']}>
                  <AvailableTasksPage />
                </ProtectedRoute>
              } />
              <Route path="/my-deliveries" element={
                <ProtectedRoute allowedRoles={['volunteer']}>
                  <MyDeliveriesPage />
                </ProtectedRoute>
              } />
              <Route path="/volunteer-schedule" element={
                <ProtectedRoute allowedRoles={['volunteer']}>
                  <VolunteerSchedulePage />
                </ProtectedRoute>
              } />
              
              {/* Admin routes */}
              <Route path="/admin" element={
                <ProtectedRoute allowedRoles={['admin']}>
                  <AdminDashboard />
                </ProtectedRoute>
              } />
              <Route path="/admin/users" element={
                <ProtectedRoute allowedRoles={['admin']}>
                  <UserManagementPage />
                </ProtectedRoute>
              } />
              <Route path="/admin/id-verification" element={
                <ProtectedRoute allowedRoles={['admin']}>
                  <IDVerificationPage />
                </ProtectedRoute>
              } />
              <Route path="/admin/settings" element={
                <ProtectedRoute allowedRoles={['admin']}>
                  <Navigate to="/profile#admin-settings" replace />
                </ProtectedRoute>
              } />
              <Route path="/admin/matching-parameters" element={
                <ProtectedRoute allowedRoles={['admin']}>
                  <MatchingParametersPage />
                </ProtectedRoute>
              } />
              <Route path="/admin/donations" element={
                <ProtectedRoute allowedRoles={['admin']}>
                  <AdminDonationsPage />
                </ProtectedRoute>
              } />
              <Route path="/admin/cfc-donations" element={
                <ProtectedRoute allowedRoles={['admin']}>
                  <AdminCFCDonationsPage />
                </ProtectedRoute>
              } />
              <Route path="/admin/volunteers" element={
                <ProtectedRoute allowedRoles={['admin']}>
                  <AdminVolunteersPage />
                </ProtectedRoute>
              } />
              <Route path="/admin/requests" element={
                <ProtectedRoute allowedRoles={['admin']}>
                  <AdminRequestsPage />
                </ProtectedRoute>
              } />
              <Route path="/admin/events" element={
                <ProtectedRoute allowedRoles={['admin']}>
                  <AdminEventsPage />
                </ProtectedRoute>
              } />
              <Route path="/admin/feedback" element={
                <ProtectedRoute allowedRoles={['admin']}>
                  <AdminFeedbackPage />
                </ProtectedRoute>
              } />
              
              {/* Catch all route */}
              <Route path="*" element={
                <div className="min-h-screen flex items-center justify-center">
                  <div className="text-center">
                    <h1 className="text-4xl font-bold text-white mb-4">404</h1>
                    <p className="text-accent-300 mb-8">Page not found</p>
                    <a href="/" className="btn btn-primary">
                      Go Home
                    </a>
                  </div>
                </div>
              } />
            </Routes>
          </React.Suspense>
          </ErrorBoundaryWithNavigate>
        </main>
        
        {!hideFooter && <Footer userRole={profile?.role} />}
        
        {/* Development Tools */}
        <AnimatePresence>
          {showSetupGuide && (
            <SetupGuide onClose={() => setShowSetupGuide(false)} />
          )}
        </AnimatePresence>
        
        {/* Development Tools */}
        {isDevelopment && (
          <>
          </>
        )}
      </div>
  )
}

function App() {
  return (
    <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <ScrollToTop />
      <AppContent />
    </Router>
  )
}

// Global keyboard shortcuts for development
if (isDevelopment) {
  window.addEventListener('keydown', (e) => {
    if (e.key === 'F1') {
      e.preventDefault()
      window.dispatchEvent(new CustomEvent('showSetupGuide'))
    }
  })
}

export default App 