import React, { useState, useEffect } from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import Navbar from './components/layout/Navbar'
import Footer from './components/layout/Footer'
import { DashboardSkeleton } from './components/ui/Skeleton'
import SetupGuide from './components/ui/SetupGuide'
import ScrollToTop from './components/ui/ScrollToTop'
import { useAuth } from './contexts/AuthContext'
import { useToast } from './contexts/ToastContext'
import { isDevelopment, getEnvironmentStatus } from './lib/devUtils'

// Import public pages directly (avoiding lazy loading for these specific pages due to Vercel build issues)
import HomePage from './pages/HomePage.jsx'
import AboutPage from './pages/AboutPage.jsx'

// Lazy load other pages for better performance
const LoginPage = React.lazy(() => import('./pages/auth/LoginPage'))
const SignupPage = React.lazy(() => import('./pages/auth/SignupPage'))
const CallbackPage = React.lazy(() => import('./pages/auth/CallbackPage'))
const ResetPasswordPage = React.lazy(() => import('./pages/auth/ResetPasswordPage'))
const DashboardPage = React.lazy(() => import('./pages/dashboard/DashboardPage'))
const ProfilePage = React.lazy(() => import('./pages/profile/ProfilePage'))

// Donor pages
const PostDonationPage = React.lazy(() => import('./pages/donor/PostDonationPage'))
const MyDonationsPage = React.lazy(() => import('./pages/donor/MyDonationsPage'))
const BrowseRequestsPage = React.lazy(() => import('./pages/donor/BrowseRequestsPage'))

// Recipient pages
const BrowseDonationsPage = React.lazy(() => import('./pages/recipient/BrowseDonationsPage'))
const CreateRequestPage = React.lazy(() => import('./pages/recipient/CreateRequestPage'))
const MyRequestsPage = React.lazy(() => import('./pages/recipient/MyRequestsPage'))
const MyApprovedDonationsPage = React.lazy(() => import('./pages/recipient/MyApprovedDonationsPage'))

// Volunteer pages
const VolunteerDashboardPage = React.lazy(() => import('./pages/volunteer/VolunteerDashboardPage'))
const AvailableTasksPage = React.lazy(() => import('./pages/volunteer/AvailableTasksPage'))
const MyDeliveriesPage = React.lazy(() => import('./pages/volunteer/MyDeliveriesPage'))
const VolunteerSchedulePage = React.lazy(() => import('./pages/volunteer/VolunteerSchedulePage'))

// Event pages
const EventsPage = React.lazy(() => import('./pages/events/EventsPage'))
const EventDetailsPage = React.lazy(() => import('./pages/events/EventDetailsPage'))

// Admin pages
const AdminDashboard = React.lazy(() => import('./pages/admin/AdminDashboard'))
const UserManagementPage = React.lazy(() => import('./pages/admin/UserManagementPage'))
const AdminSettingsPage = React.lazy(() => import('./pages/admin/AdminSettingsPage'))
const AdminDonationsPage = React.lazy(() => import('./pages/admin/AdminDonationsPage'))
const AdminVolunteersPage = React.lazy(() => import('./pages/admin/AdminVolunteersPage'))
const AdminRequestsPage = React.lazy(() => import('./pages/admin/AdminRequestsPage'))
const AdminEventsPage = React.lazy(() => import('./pages/admin/AdminEventsPage'))

// Legal pages
const TermsOfServicePage = React.lazy(() => import('./pages/legal/TermsOfServicePage'))
const PrivacyPolicyPage = React.lazy(() => import('./pages/legal/PrivacyPolicyPage'))
const CookiesPolicyPage = React.lazy(() => import('./pages/legal/CookiesPolicyPage'))
const CodeOfConductPage = React.lazy(() => import('./pages/legal/CodeOfConductPage'))

// Protected Route component
const ProtectedRoute = ({ children, allowedRoles }) => {
  const { user, profile, loading, isSigningOut } = useAuth()
  
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
  
  if (allowedRoles && profile && !allowedRoles.includes(profile.role)) {
    return <Navigate to="/dashboard" replace />
  }
  
  return children
}

// Public Route component (redirect if already logged in)
const PublicRoute = ({ children }) => {
  const { user, loading, isSigningIn } = useAuth()
  
  if (loading) {
    return (
      <div className="min-h-screen" style={{backgroundColor: '#1e293b'}}>
        <DashboardSkeleton />
      </div>
    )
  }
  
  // Don't redirect if user is signing in - let the auth flow complete smoothly
  if (user && !isSigningIn) {
    return <Navigate to="/dashboard" replace />
  }
  
  return children
}

// Component to conditionally render Footer
function AppContent() {
  const location = useLocation()
  const { loading, profile } = useAuth()
  const { showToast } = useToast()
  const [showSetupGuide, setShowSetupGuide] = useState(false)
  
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

  if (loading) {
    return (
      <div className="min-h-screen" style={{backgroundColor: '#1e293b'}}>
        <DashboardSkeleton />
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col" style={{backgroundColor: '#1e293b'}}>
      <Navbar />
      
      <main className="flex-1">
          <React.Suspense 
            fallback={
              <div className="min-h-screen" style={{backgroundColor: '#1e293b'}}>
                <DashboardSkeleton />
              </div>
            }
          >
            <Routes>
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

              <Route path="/reset-password" element={
                <PublicRoute>
                  <ResetPasswordPage />
                </PublicRoute>
              } />
              
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
              <Route path="/admin/settings" element={
                <ProtectedRoute allowedRoles={['admin']}>
                  <AdminSettingsPage />
                </ProtectedRoute>
              } />
              <Route path="/admin/donations" element={
                <ProtectedRoute allowedRoles={['admin']}>
                  <AdminDonationsPage />
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