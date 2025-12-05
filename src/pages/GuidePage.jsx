import React, { useState } from 'react'
import { motion } from 'framer-motion'
import { Link, useNavigate } from 'react-router-dom'
import { 
  HelpCircle, 
  CheckCircle, 
  Heart, 
  ArrowRight,
  Gift,
  Package,
  Truck,
  Target,
  BarChart3,
  Bell,
  UserCheck,
  Search,
  Shield,
  Settings,
  FileText,
  MapPin,
  Calendar,
  Users,
  Building,
  Edit3,
  Eye,
  Home,
  TrendingUp,
  Award,
  BellRing,
  User,
  BookOpen
} from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'

const GuidePage = () => {
  const { profile } = useAuth()
  const navigate = useNavigate()
  const [activeRole, setActiveRole] = useState(profile?.role || 'donor')

  const roleGuides = {
    donor: {
      title: 'Donor Guide',
      description: 'Learn how to navigate HopeLink as a donor and make the most impact in your community',
      icon: Gift,
      sections: [
        {
          title: 'Getting Started',
          icon: Home,
          items: [
            {
              title: 'Complete Your Profile',
              description: 'Fill out your profile information including location, preferences, and upload your ID for verification.',
              page: '/profile',
              steps: [
                'Go to your Profile page from the navigation menu',
                'Fill in your personal information and location',
                'Upload a valid government-issued ID',
                'Wait for admin verification (24-48 hours)',
                'Get your verification badge once approved'
              ]
            },
            {
              title: 'Explore Your Dashboard',
              description: 'Your dashboard shows your impact statistics, recent activity, and quick actions.',
              page: '/dashboard',
              steps: [
                'View your impact metrics (families helped, completion rate)',
                'See your recent donations and their status',
                'Check pending actions and notifications',
                'Monitor your community value created'
              ]
            }
          ]
        },
        {
          title: 'Posting Donations',
          icon: Gift,
          items: [
            {
              title: 'Create a Donation',
              description: 'Post items you want to donate with photos, descriptions, and delivery preferences.',
              page: '/post-donation',
              steps: [
                'Click "Post Donation" from the dashboard or navigation',
                'Upload clear photos of the items',
                'Write a detailed description including condition',
                'Select the appropriate category',
                'Set quantity and delivery mode (pickup, volunteer, direct)',
                'Add pickup location and preferences',
                'Submit your donation listing'
              ]
            },
            {
              title: 'Manage Your Donations',
              description: 'Track and manage all your posted donations in one place.',
              page: '/my-donations',
              steps: [
                'View all your donations and their current status',
                'Edit or delete donations that haven\'t been claimed',
                'Track delivery progress in real-time',
                'See recipient confirmations and feedback',
                'Monitor completion rates'
              ]
            },
            {
              title: 'Browse Requests',
              description: 'See what your community needs and fulfill requests directly.',
              page: '/browse-requests',
              steps: [
                'Browse requests from verified recipients',
                'Filter by category, urgency, and location',
                'View request details and recipient information',
                'Fulfill requests by creating matching donations',
                'See impact preview before fulfilling'
              ]
            }
          ]
        },
        {
          title: 'Understanding Status',
          icon: BarChart3,
          items: [
            {
              title: 'Donation Status Workflow',
              description: 'Learn what each status means and what happens at each stage.',
              steps: [
                'Available: Your donation is posted and waiting for matching',
                'Matched: System matched your donation with recipients',
                'Claimed: A recipient has claimed your donation',
                'In Transit: Volunteer is delivering to recipient',
                'Delivered: Item reached the recipient',
                'Completed: Recipient confirmed receipt, transaction complete'
              ]
            },
            {
              title: 'Notifications',
              description: 'Stay informed about your donations through real-time notifications.',
              steps: [
                'Receive notifications when donations are matched',
                'Get alerts when recipients claim your donations',
                'Track delivery status updates',
                'See recipient confirmations and feedback',
                'View notifications in the bell icon in navigation'
              ]
            }
          ]
        }
      ]
    },
    recipient: {
      title: 'Recipient Guide',
      description: 'Learn how to request items, browse donations, and receive help through HopeLink',
      icon: Heart,
      sections: [
        {
          title: 'Getting Started',
          icon: Home,
          items: [
            {
              title: 'Complete ID Verification',
              description: 'Verify your identity to get priority matching and unlock all features.',
              page: '/profile#id-verification',
              steps: [
                'Go to your Profile page',
                'Scroll to "ID Verification" section',
                'Upload a valid government-issued ID',
                'Fill in ID details (type, number)',
                'Wait for admin review (24-48 hours)',
                'Get verified badge for priority matching'
              ]
            },
            {
              title: 'Explore Your Dashboard',
              description: 'Monitor your requests, matches, and track items you\'ve received.',
              page: '/dashboard',
              steps: [
                'View your request statistics',
                'See fulfillment rates and items received',
                'Check pending matches and approved donations',
                'Track time and money saved'
              ]
            }
          ]
        },
        {
          title: 'Creating Requests',
          icon: Package,
          items: [
            {
              title: 'Create a Request',
              description: 'Post what you need with details to help donors understand your needs.',
              page: '/create-request',
              steps: [
                'Click "Create Request" from dashboard or navigation',
                'Fill in title and detailed description',
                'Select category and quantity needed',
                'Set urgency level (low, medium, high, critical)',
                'Add your location for delivery coordination',
                'Upload sample image if available',
                'Set deadline if applicable',
                'Submit your request'
              ]
            },
            {
              title: 'Manage Your Requests',
              description: 'Track all your requests and see how the community is responding.',
              page: '/my-requests',
              steps: [
                'View all your requests and their current status',
                'Edit open requests to update details',
                'See matches and approved donations',
                'Track delivery progress',
                'Confirm receipt when items arrive',
                'Delete requests that are no longer needed'
              ]
            }
          ]
        },
        {
          title: 'Finding Donations',
          icon: Search,
          items: [
            {
              title: 'Browse Available Donations',
              description: 'Search and claim donations that match your needs.',
              page: '/browse-donations',
              steps: [
                'Browse all available donations from verified donors',
                'Filter by category, location, and condition',
                'Check donor verification status',
                'View donation details and photos',
                'Claim donations that match your needs',
                'Coordinate pickup or delivery'
              ]
            },
            {
              title: 'My Approved Requests',
              description: 'View donations that have been matched and approved for your requests.',
              page: '/my-approved-requests',
              steps: [
                'See donations approved for your requests',
                'Review donor information and donation details',
                'Coordinate delivery with volunteers',
                'Track delivery status',
                'Confirm receipt when items arrive'
              ]
            }
          ]
        },
        {
          title: 'Understanding Status',
          icon: BarChart3,
          items: [
            {
              title: 'Request Status Workflow',
              description: 'Learn what each request status means.',
              steps: [
                'Open: Your request is active and waiting for matches',
                'Claimed: A donor has claimed your request',
                'In Progress: Delivery is in progress',
                'Fulfilled: You have received the items',
                'Cancelled: Request was cancelled',
                'Expired: Request deadline has passed'
              ]
            }
          ]
        }
      ]
    },
    volunteer: {
      title: 'Volunteer Guide',
      description: 'Learn how to help connect donors and recipients through delivery services',
      icon: Truck,
      sections: [
        {
          title: 'Getting Started',
          icon: Home,
          items: [
            {
              title: 'Complete Volunteer Profile',
              description: 'Set up your volunteer profile with availability and preferences.',
              page: '/profile',
              steps: [
                'Go to your Profile page',
                'Complete personal information and location',
                'Set your availability schedule',
                'Specify vehicle type and delivery capacity',
                'Set distance preferences for deliveries',
                'Save your profile settings'
              ]
            },
            {
              title: 'Explore Volunteer Dashboard',
              description: 'Monitor your volunteer impact and delivery statistics.',
              page: '/volunteer-dashboard',
              steps: [
                'View deliveries completed',
                'See families helped count',
                'Check your volunteer rating',
                'Monitor active deliveries',
                'View upcoming scheduled tasks'
              ]
            }
          ]
        },
        {
          title: 'Managing Deliveries',
          icon: Truck,
          items: [
            {
              title: 'Browse Available Tasks',
              description: 'Find delivery tasks in your area that match your availability.',
              page: '/available-tasks',
              steps: [
                'View all available delivery tasks',
                'Filter by location, distance, and urgency',
                'Check pickup and delivery locations',
                'Review item details and recipient information',
                'Accept tasks that fit your schedule and capacity'
              ]
            },
            {
              title: 'Track Your Deliveries',
              description: 'Manage active deliveries and update status in real-time.',
              page: '/my-deliveries',
              steps: [
                'View all your active and completed deliveries',
                'Update delivery status (picked up, in transit, delivered)',
                'Communicate with donors and recipients',
                'Track route and delivery progress',
                'Mark deliveries as complete',
                'View feedback and ratings'
              ]
            },
            {
              title: 'Set Your Schedule',
              description: 'Manage your availability to get matched with more delivery tasks.',
              page: '/volunteer-schedule',
              steps: [
                'Set weekly availability schedule',
                'Specify time slots you\'re available',
                'Set maximum delivery capacity per day',
                'Define distance preferences',
                'Update availability as needed',
                'Get matched with tasks automatically'
              ]
            }
          ]
        },
        {
          title: 'Delivery Process',
          icon: CheckCircle,
          items: [
            {
              title: 'Delivery Workflow',
              description: 'Understand the complete delivery process from acceptance to completion.',
              steps: [
                'Accept a delivery task from available tasks',
                'Coordinate pickup time with donor',
                'Update status to "Picked Up" when collected',
                'Update status to "In Transit" when en route',
                'Navigate to recipient location',
                'Update status to "Delivered" upon arrival',
                'Wait for recipient confirmation',
                'Delivery marked complete'
              ]
            },
            {
              title: 'Best Practices',
              description: 'Tips for being an effective volunteer.',
              steps: [
                'Update status promptly for real-time tracking',
                'Communicate clearly with donors and recipients',
                'Respect scheduled pickup and delivery times',
                'Handle items with care during transport',
                'Confirm delivery details before arrival',
                'Complete deliveries promptly'
              ]
            }
          ]
        }
      ]
    }
  }

  const currentGuide = roleGuides[activeRole] || roleGuides.donor
  const RoleIcon = currentGuide.icon

  return (
    <div className="min-h-screen text-white" style={{backgroundColor: '#00237d'}}>
      {/* Hero Section */}
      <section className="py-12 sm:py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center mb-8"
          >
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-yellow-400/20 border border-yellow-400/30 mb-4">
              <BookOpen className="h-8 w-8 text-yellow-400" />
            </div>
            <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-4">
              User <span className="text-yellow-400">Guide</span>
            </h1>
            <p className="text-lg lg:text-xl text-yellow-200 max-w-3xl mx-auto leading-relaxed">
              Step-by-step guide to navigate and use HopeLink features effectively
            </p>
          </motion.div>

          {/* Role Selector */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="flex flex-wrap justify-center gap-3 mb-8"
          >
            {[
              { id: 'donor', label: 'For Donors', icon: Gift },
              { id: 'recipient', label: 'For Recipients', icon: Heart },
              { id: 'volunteer', label: 'For Volunteers', icon: Truck }
            ].map((role) => {
              const Icon = role.icon
              return (
                <button
                  key={role.id}
                  onClick={() => setActiveRole(role.id)}
                  className={`flex items-center gap-2 px-5 py-2 rounded-lg font-semibold transition-all text-sm ${
                    activeRole === role.id
                      ? 'bg-yellow-500 text-navy-950 shadow-lg scale-105'
                      : 'bg-navy-800 text-white border border-navy-700 hover:border-yellow-400'
                  }`}
                >
                  <Icon className="h-5 w-5" />
                  {role.label}
                </button>
              )
            })}
          </motion.div>
        </div>
      </section>

      {/* Guide Content */}
      <section className="py-12 lg:py-16" style={{backgroundColor: '#001a5c'}}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Role Header */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-yellow-400/20 border border-yellow-400/30 mb-4">
              <RoleIcon className="h-10 w-10 text-yellow-400" />
            </div>
            <h2 className="text-2xl md:text-3xl lg:text-4xl font-bold mb-3">
              {currentGuide.title}
            </h2>
            <p className="text-lg lg:text-xl text-yellow-300 max-w-3xl mx-auto leading-relaxed">
              {currentGuide.description}
            </p>
          </motion.div>

          {/* Guide Sections */}
          <div className="space-y-8">
            {currentGuide.sections.map((section, sectionIndex) => {
              const SectionIcon = section.icon
              return (
                <motion.div
                  key={sectionIndex}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: sectionIndex * 0.1 }}
                  viewport={{ once: true }}
                  className="bg-navy-800/60 rounded-xl p-6 sm:p-8 border border-navy-700"
                >
                  <div className="flex items-center gap-3 mb-6">
                    <div className="p-3 rounded-lg bg-yellow-400/20 border border-yellow-400/30">
                      <SectionIcon className="h-6 w-6 text-yellow-400" />
                    </div>
                    <h3 className="text-xl md:text-2xl font-bold text-white">{section.title}</h3>
                  </div>

                  <div className="space-y-6">
                    {section.items.map((item, itemIndex) => (
                      <div
                        key={itemIndex}
                        className="bg-navy-900/50 rounded-lg p-5 border border-navy-700/50"
                      >
                        <div className="flex items-start justify-between gap-4 mb-4">
                          <div className="flex-1">
                            <h4 className="text-lg font-semibold text-white mb-2">{item.title}</h4>
                            <p className="text-yellow-200/90 text-sm leading-relaxed">{item.description}</p>
                          </div>
                          {item.page && (
                            <button
                              onClick={() => navigate(item.page)}
                              className="flex items-center gap-2 px-4 py-2 bg-yellow-500/20 hover:bg-yellow-500/30 text-yellow-400 rounded-lg transition-all border border-yellow-500/30 flex-shrink-0"
                            >
                              <ArrowRight className="h-4 w-4" />
                              <span className="text-sm font-medium">Go to Page</span>
                            </button>
                          )}
                        </div>

                        {item.steps && (
                          <div className="mt-4 pt-4 border-t border-navy-700/50">
                            <p className="text-sm font-semibold text-yellow-400 mb-3 uppercase tracking-wide">
                              Steps:
                            </p>
                            <ol className="space-y-2">
                              {item.steps.map((step, stepIndex) => (
                                <li key={stepIndex} className="flex items-start gap-3 text-sm text-gray-300">
                                  <span className="flex-shrink-0 w-6 h-6 rounded-full bg-yellow-400/20 border border-yellow-400/30 flex items-center justify-center text-yellow-400 font-semibold text-xs mt-0.5">
                                    {stepIndex + 1}
                                  </span>
                                  <span className="leading-relaxed">{step}</span>
                                </li>
                              ))}
                            </ol>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </motion.div>
              )
            })}
          </div>
        </div>
      </section>

      {/* Quick Links */}
      <section className="py-12 lg:py-16" style={{backgroundColor: '#00237d'}}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
            className="text-center mb-8"
          >
            <h2 className="text-2xl md:text-3xl lg:text-4xl font-bold mb-3">Quick Links</h2>
            <p className="text-lg lg:text-xl text-yellow-300 max-w-3xl mx-auto leading-relaxed">
              Access important pages and resources
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {activeRole === 'donor' && [
              { title: 'Post Donation', path: '/post-donation', icon: Gift },
              { title: 'My Donations', path: '/my-donations', icon: BarChart3 },
              { title: 'Browse Requests', path: '/browse-requests', icon: Search },
              { title: 'Dashboard', path: '/dashboard', icon: Home },
              { title: 'Profile', path: '/profile', icon: User }
            ].map((link) => {
              const LinkIcon = link.icon
              return (
                <Link
                  key={link.path}
                  to={link.path}
                  className="flex items-center gap-3 p-4 bg-navy-800/60 rounded-lg border border-navy-700 hover:border-yellow-400/50 transition-all group"
                >
                  <LinkIcon className="h-5 w-5 text-yellow-400 group-hover:scale-110 transition-transform" />
                  <span className="text-white font-medium">{link.title}</span>
                  <ArrowRight className="h-4 w-4 text-gray-400 ml-auto group-hover:text-yellow-400 group-hover:translate-x-1 transition-all" />
                </Link>
              )
            })}

            {activeRole === 'recipient' && [
              { title: 'Create Request', path: '/create-request', icon: Package },
              { title: 'My Requests', path: '/my-requests', icon: FileText },
              { title: 'Browse Donations', path: '/browse-donations', icon: Search },
              { title: 'Dashboard', path: '/dashboard', icon: Home },
              { title: 'Profile', path: '/profile', icon: User }
            ].map((link) => {
              const LinkIcon = link.icon
              return (
                <Link
                  key={link.path}
                  to={link.path}
                  className="flex items-center gap-3 p-4 bg-navy-800/60 rounded-lg border border-navy-700 hover:border-yellow-400/50 transition-all group"
                >
                  <LinkIcon className="h-5 w-5 text-yellow-400 group-hover:scale-110 transition-transform" />
                  <span className="text-white font-medium">{link.title}</span>
                  <ArrowRight className="h-4 w-4 text-gray-400 ml-auto group-hover:text-yellow-400 group-hover:translate-x-1 transition-all" />
                </Link>
              )
            })}

            {activeRole === 'volunteer' && [
              { title: 'Available Tasks', path: '/available-tasks', icon: Truck },
              { title: 'My Deliveries', path: '/my-deliveries', icon: BarChart3 },
              { title: 'Volunteer Schedule', path: '/volunteer-schedule', icon: Calendar },
              { title: 'Dashboard', path: '/volunteer-dashboard', icon: Home },
              { title: 'Profile', path: '/profile', icon: User }
            ].map((link) => {
              const LinkIcon = link.icon
              return (
                <Link
                  key={link.path}
                  to={link.path}
                  className="flex items-center gap-3 p-4 bg-navy-800/60 rounded-lg border border-navy-700 hover:border-yellow-400/50 transition-all group"
                >
                  <LinkIcon className="h-5 w-5 text-yellow-400 group-hover:scale-110 transition-transform" />
                  <span className="text-white font-medium">{link.title}</span>
                  <ArrowRight className="h-4 w-4 text-gray-400 ml-auto group-hover:text-yellow-400 group-hover:translate-x-1 transition-all" />
                </Link>
              )
            })}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-12 lg:py-16" style={{backgroundColor: '#001a5c'}}>
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
          >
            <h2 className="text-2xl md:text-3xl lg:text-4xl font-bold mb-4">Need More Help?</h2>
            <p className="text-lg lg:text-xl text-yellow-200 mb-6 leading-relaxed">
              Learn how the platform works or get support from our community
            </p>
            <div className="flex flex-col sm:flex-row gap-3 lg:gap-4 justify-center">
              <Link
                to="/how-it-works"
                className="inline-flex items-center justify-center px-8 py-3 bg-yellow-500 text-navy-950 font-semibold rounded-lg hover:bg-yellow-600 transition-colors"
              >
                How It Works
                <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
              <Link
                to="/about"
                className="inline-flex items-center justify-center px-8 py-3 border-2 border-yellow-400 text-yellow-400 font-semibold rounded-lg hover:bg-yellow-400 hover:text-navy-950 transition-colors"
              >
                About HopeLink
              </Link>
            </div>
          </motion.div>
        </div>
      </section>
    </div>
  )
}

export default GuidePage
