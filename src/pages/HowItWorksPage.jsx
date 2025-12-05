import React, { useState } from 'react'
import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import { 
  Gift, 
  Heart, 
  Truck, 
  Users, 
  ArrowRight, 
  CheckCircle,
  Search,
  MapPin,
  Clock,
  Shield,
  Star,
  Package,
  UserCheck,
  Navigation,
  CheckCircle2,
  Circle,
  ArrowDown,
  Info,
  Sparkles,
  TrendingUp,
  Award
} from 'lucide-react'
import SuccessStories from '../components/ui/SuccessStories'
import ValueCalculator from '../components/ui/ValueCalculator'

const HowItWorksPage = () => {
  const [activeRole, setActiveRole] = useState('donor')

  const workflowSteps = {
    donor: [
      {
        step: 1,
        title: 'Post Your Donation',
        description: 'Create a donation listing with photos, description, and delivery preferences. Our system will help match it with recipients in need.',
        icon: Gift,
        color: 'text-blue-400',
        bgColor: 'bg-blue-500/20',
        value: 'Your donation will help families in your community access essential resources.'
      },
      {
        step: 2,
        title: 'Smart Matching',
        description: 'Our intelligent algorithm matches your donation with recipients based on location, need, urgency, and compatibility.',
        icon: Sparkles,
        color: 'text-purple-400',
        bgColor: 'bg-purple-500/20',
        value: 'Each match is optimized to ensure your donation reaches those who need it most.'
      },
      {
        step: 3,
        title: 'Recipient Claims',
        description: 'Matched recipients can claim your donation. You\'ll receive notifications and can review recipient profiles.',
        icon: Heart,
        color: 'text-pink-400',
        bgColor: 'bg-pink-500/20',
        value: 'See the impact: Your donation will help X recipients in your area.'
      },
      {
        step: 4,
        title: 'Volunteer Delivery',
        description: 'A verified volunteer picks up and delivers your donation safely to the recipient.',
        icon: Truck,
        color: 'text-green-400',
        bgColor: 'bg-green-500/20',
        value: 'Track delivery in real-time and receive confirmation when completed.'
      },
      {
        step: 5,
        title: 'Completion & Feedback',
        description: 'Once delivered and confirmed, the transaction is complete. Share feedback to help improve the platform.',
        icon: CheckCircle2,
        color: 'text-yellow-400',
        bgColor: 'bg-yellow-500/20',
        value: 'Your generosity creates lasting positive impact in your community.'
      }
    ],
    recipient: [
      {
        step: 1,
        title: 'Create a Request',
        description: 'Post what you need with details about urgency and quantity. Complete your profile verification for better matching.',
        icon: Package,
        color: 'text-pink-400',
        bgColor: 'bg-pink-500/20',
        value: 'Verified recipients get priority matching with donors.'
      },
      {
        step: 2,
        title: 'Browse Available Donations',
        description: 'Search and browse donations that match your needs. View donor profiles and verification status.',
        icon: Search,
        color: 'text-blue-400',
        bgColor: 'bg-blue-500/20',
        value: 'Find donations from verified donors in your community.'
      },
      {
        step: 3,
        title: 'Claim a Donation',
        description: 'Claim a donation that matches your request. The system will notify the donor and coordinate delivery.',
        icon: Heart,
        color: 'text-red-400',
        bgColor: 'bg-red-500/20',
        value: 'Your request helps donors understand community needs.'
      },
      {
        step: 4,
        title: 'Receive Delivery',
        description: 'A volunteer will deliver your donation. Track the delivery and confirm receipt when it arrives.',
        icon: Truck,
        color: 'text-green-400',
        bgColor: 'bg-green-500/20',
        value: 'Safe, verified delivery directly to your location.'
      },
      {
        step: 5,
        title: 'Confirm & Thank',
        description: 'Confirm receipt and provide feedback. Your feedback helps donors and improves the platform.',
        icon: CheckCircle2,
        color: 'text-yellow-400',
        bgColor: 'bg-yellow-500/20',
        value: 'Your feedback helps build trust and improve the community.'
      }
    ],
    volunteer: [
      {
        step: 1,
        title: 'Complete Profile',
        description: 'Set up your volunteer profile with availability, vehicle type, and delivery preferences.',
        icon: UserCheck,
        color: 'text-green-400',
        bgColor: 'bg-green-500/20',
        value: 'Verified volunteers are trusted by donors and recipients.'
      },
      {
        step: 2,
        title: 'Browse Available Tasks',
        description: 'View delivery tasks in your area. See pickup and delivery locations, item details, and urgency.',
        icon: Search,
        color: 'text-blue-400',
        bgColor: 'bg-blue-500/20',
        value: 'Help connect donors with recipients in your community.'
      },
      {
        step: 3,
        title: 'Accept Delivery Task',
        description: 'Accept a delivery task that fits your schedule and capacity. Get matched based on your location and availability.',
        icon: CheckCircle,
        color: 'text-purple-400',
        bgColor: 'bg-purple-500/20',
        value: 'Your delivery helps X families receive essential resources.'
      },
      {
        step: 4,
        title: 'Pick Up & Deliver',
        description: 'Pick up the donation from the donor and deliver it to the recipient. Update status as you go.',
        icon: Navigation,
        color: 'text-yellow-400',
        bgColor: 'bg-yellow-500/20',
        value: 'Track your route and provide real-time updates to all parties.'
      },
      {
        step: 5,
        title: 'Complete & Rate',
        description: 'Mark delivery as complete and provide feedback. Build your volunteer reputation.',
        icon: Star,
        color: 'text-orange-400',
        bgColor: 'bg-orange-500/20',
        value: 'Your service creates meaningful connections in the community.'
      }
    ]
  }

  const features = [
    {
      icon: Shield,
      title: 'Verified Users',
      description: 'All users go through ID verification to ensure trust and safety in the community.',
      color: 'text-green-400'
    },
    {
      icon: Sparkles,
      title: 'Smart Matching',
      description: 'Our intelligent algorithm matches donations with recipients based on multiple criteria for optimal results.',
      color: 'text-purple-400'
    },
    {
      icon: MapPin,
      title: 'Location-Based',
      description: 'Connect with people in your local community for efficient and meaningful giving.',
      color: 'text-blue-400'
    },
    {
      icon: Clock,
      title: 'Real-Time Tracking',
      description: 'Track donations and deliveries in real-time with status updates and notifications.',
      color: 'text-yellow-400'
    }
  ]

  const currentSteps = workflowSteps[activeRole]

  return (
    <div className="min-h-screen text-white" style={{backgroundColor: '#00237d'}}>
      {/* Hero Section */}
      <section className="py-12 sm:py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center mb-8"
          >
            <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-4">
              How <span className="text-yellow-400">HopeLink</span> Works
            </h1>
            <p className="text-lg lg:text-xl text-yellow-200 max-w-3xl mx-auto leading-relaxed">
              Learn how our platform connects donors, recipients, and volunteers to create meaningful impact in your community.
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

      {/* Workflow Visualization */}
      <section className="py-12 pb-16" style={{backgroundColor: '#001a5c'}}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
            className="text-center mb-8"
          >
            <h2 className="text-2xl md:text-3xl lg:text-4xl font-bold mb-3">
              Step-by-Step Journey
            </h2>
            <p className="text-lg lg:text-xl text-yellow-300 max-w-3xl mx-auto leading-relaxed">
              See how HopeLink guides donors, recipients, and volunteers through each step of the process.
            </p>
          </motion.div>
          <div className="relative">
            {/* Steps */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 lg:gap-3 xl:gap-4 relative z-10">
              {currentSteps.map((step, index) => {
                const Icon = step.icon
                return (
                  <motion.div
                    key={step.step}
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: index * 0.1 }}
                    className="relative flex flex-col items-center"
                  >
                    {/* Step Number Badge - Positioned above container */}
                    <div className="relative z-20 mb-3 lg:mb-4">
                      <div className={`relative w-16 h-16 lg:w-20 lg:h-20 rounded-full ${step.bgColor} border-2 border-yellow-400 flex items-center justify-center shadow-lg backdrop-blur-sm`}>
                        <Icon className={`h-8 w-8 lg:h-10 lg:w-10 ${step.color}`} />
                      </div>
                      {/* Step Number Badge - Yellow circle with number */}
                      <div className="absolute -top-1 -right-1 w-6 h-6 lg:w-8 lg:h-8 bg-yellow-400 rounded-full flex items-center justify-center text-navy-950 font-bold text-sm lg:text-base shadow-md border-2 border-navy-950">
                        {step.step}
                      </div>
                    </div>

                    {/* Step Content Container */}
                    <div className="bg-navy-800/70 rounded-xl p-4 lg:p-5 border-2 border-navy-700 hover:border-yellow-400/60 transition-all duration-300 h-full flex flex-col w-full shadow-lg backdrop-blur-sm hover:shadow-xl hover:scale-[1.02] group">
                      <h3 className="text-base lg:text-lg xl:text-xl font-bold text-white mb-2 lg:mb-3 leading-tight text-center">{step.title}</h3>
                      <p className="text-yellow-200/90 mb-3 lg:mb-4 text-xs lg:text-sm leading-relaxed flex-grow text-center">{step.description}</p>
                      
                      {/* Value Proposition */}
                      <div className="mt-auto pt-3 lg:pt-4 border-t border-navy-600/50 group-hover:border-yellow-400/30 transition-colors">
                        <p className="text-xs text-yellow-300/90 italic leading-relaxed text-center">{step.value}</p>
                      </div>
                    </div>

                    {/* Arrow - Mobile/Tablet */}
                    {index < currentSteps.length - 1 && (
                      <div className="lg:hidden flex justify-center my-4">
                        <ArrowDown className="h-6 w-6 text-yellow-400 animate-bounce" />
                      </div>
                    )}
                  </motion.div>
                )
              })}
            </div>
          </div>
        </div>
      </section>

      {/* Key Features */}
      <section className="py-12 lg:py-16" style={{backgroundColor: '#00237d'}}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
            className="text-center mb-8"
          >
            <h2 className="text-2xl md:text-3xl lg:text-4xl font-bold mb-3">Key Features</h2>
            <p className="text-lg lg:text-xl text-yellow-300 max-w-3xl mx-auto leading-relaxed">
              What makes HopeLink different
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-5">
            {features.map((feature, index) => {
              const Icon = feature.icon
              return (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: index * 0.1 }}
                  viewport={{ once: true }}
                  className="bg-navy-800/60 rounded-xl p-5 lg:p-6 border border-navy-700 hover:border-yellow-400/50 transition-all text-center shadow-lg"
                >
                  <div className={`inline-flex items-center justify-center w-14 h-14 lg:w-16 lg:h-16 rounded-full bg-navy-900 ${feature.color} mb-3 lg:mb-4 shadow-md`}>
                    <Icon className="h-7 w-7 lg:h-8 lg:w-8" />
                  </div>
                  <h3 className="text-lg lg:text-xl font-semibold text-white mb-2 lg:mb-3 leading-tight">{feature.title}</h3>
                  <p className="text-yellow-200 text-sm leading-relaxed">{feature.description}</p>
                </motion.div>
              )
            })}
          </div>
        </div>
      </section>

      {/* Success Stories Section */}
      <section className="py-12 lg:py-16" style={{backgroundColor: '#001a5c'}}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <SuccessStories />
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-12 lg:py-16" style={{backgroundColor: '#00237d'}}>
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
          >
            <h2 className="text-2xl md:text-3xl lg:text-4xl font-bold mb-4">Ready to Get Started?</h2>
            <p className="text-lg lg:text-xl text-yellow-200 mb-6 leading-relaxed">
              Join our community and start making a difference today
            </p>
            <div className="flex flex-col sm:flex-row gap-3 lg:gap-4 justify-center">
              <Link
                to="/signup"
                className="inline-flex items-center justify-center px-8 py-3 bg-yellow-500 text-navy-950 font-semibold rounded-lg hover:bg-yellow-600 transition-colors"
              >
                Create Account
                <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
              <Link
                to="/"
                className="inline-flex items-center justify-center px-8 py-3 border-2 border-yellow-400 text-yellow-400 font-semibold rounded-lg hover:bg-yellow-400 hover:text-navy-950 transition-colors"
              >
                Back to Home
              </Link>
            </div>
          </motion.div>
        </div>
      </section>
    </div>
  )
}

export default HowItWorksPage

