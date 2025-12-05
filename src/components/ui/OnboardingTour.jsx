import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, ArrowRight, ArrowLeft, HelpCircle, CheckCircle, Heart } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'

const OnboardingTour = ({ isOpen, onClose, userRole }) => {
  const navigate = useNavigate()
  const { profile } = useAuth()
  const [currentStep, setCurrentStep] = useState(0)
  const [completedSteps, setCompletedSteps] = useState(new Set())

  // Role-specific tour steps
  const tourSteps = {
    donor: [
      {
        id: 'dashboard',
        title: 'Welcome to Your Impact Hub',
        description: 'Track your community impact in real-time. See how many families you\'ve helped, your completion rate, and the value you\'ve created in your community.',
        target: '/dashboard',
        action: 'View Dashboard',
        value: 'Every donation you make helps an average of 3 families in your community',
        tips: [
          'Monitor your impact: See families helped and items delivered',
          'Track your efficiency: High completion rates show your commitment',
          'Review your community value: Each donation creates 1.5x economic value'
        ]
      },
      {
        id: 'post-donation',
        title: 'Create Lasting Impact',
        description: 'Transform unused items into hope. Your donation helps feed families, clothe children, and support neighbors in need. Our smart matching ensures maximum impact.',
        target: '/post-donation',
        action: 'Post Donation',
        value: 'A single donation can help 2-4 families, saving them hours of searching and hundreds of pesos',
        tips: [
          'Add clear photos: Better visibility = faster matching = quicker impact',
          'Specify delivery preferences: Saves time for volunteers and recipients',
          'Use the impact calculator: See exactly how many families you\'ll help'
        ]
      },
      {
        id: 'browse-requests',
        title: 'Respond to Real Needs',
        description: 'See exactly what your community needs right now. Fulfill requests directly and see the immediate impact of your generosity.',
        target: '/browse-requests',
        action: 'Browse Requests',
        value: 'Fulfilling requests creates instant impact - recipients get help within 24-48 hours',
        tips: [
          'Filter by urgency: Help those who need it most urgently',
          'Check verification status: Verified recipients ensure your donation reaches real need',
          'See impact preview: Know exactly how your donation will help'
        ]
      },
      {
        id: 'my-donations',
        title: 'Track Your Generosity',
        description: 'See the full journey of your donations - from posting to delivery. Watch as your generosity transforms into real community impact.',
        target: '/my-donations',
        action: 'View Donations',
        value: 'Every completed donation strengthens community trust and builds lasting connections',
        tips: [
          'Track delivery progress: Real-time updates show your impact in action',
          'Read recipient confirmations: See the gratitude and difference you\'ve made',
          'Review your giving history: Celebrate your cumulative community impact'
        ]
      }
    ],
    recipient: [
      {
        id: 'dashboard',
        title: 'Your Support Center',
        description: 'Monitor your requests and see how the community is responding. Track items received, fulfillment rates, and the time and money you\'ve saved.',
        target: '/dashboard',
        action: 'View Dashboard',
        value: 'Verified recipients get 3x faster matching and priority access to donations',
        tips: [
          'Check fulfillment progress: See how quickly your requests are being met',
          'Track items received: Monitor what you\'ve saved in time and money',
          'View your fulfillment rate: High rates show strong community support'
        ]
      },
      {
        id: 'create-request',
        title: 'Connect with Community Support',
        description: 'Share your needs with a caring community. Verified requests get matched 3x faster with donors who want to help.',
        target: '/create-request',
        action: 'Create Request',
        value: 'Detailed requests get fulfilled 2x faster and save you hours of searching',
        tips: [
          'Be specific: Detailed requests match faster and save you time',
          'Set urgency appropriately: Helps donors prioritize your needs',
          'Complete verification: Verified profiles get priority matching'
        ]
      },
      {
        id: 'browse-donations',
        title: 'Find What You Need',
        description: 'Browse donations from verified donors in your area. Claim items that match your needs and save time and money.',
        target: '/browse-donations',
        action: 'Browse Donations',
        value: 'Claiming donations saves an average of 2 hours and ₱500-₱2,000 per item',
        tips: [
          'Check donor verification: Verified donors ensure quality and trust',
          'Filter by location: Local donations mean faster, free delivery',
          'Claim quickly: Popular items get claimed fast by other recipients'
        ]
      },
      {
        id: 'my-requests',
        title: 'Track Your Support',
        description: 'See how the community is responding to your needs. Track matches, approved donations, and delivery progress.',
        target: '/my-requests',
        action: 'View Requests',
        value: 'High fulfillment rates show strong community support and build trust',
        tips: [
          'Monitor matches: See which donations match your requests',
          'Track delivery status: Know exactly when help is arriving',
          'Manage approved items: Coordinate delivery with volunteers'
        ]
      }
    ],
    volunteer: [
      {
        id: 'dashboard',
        title: 'Your Impact Dashboard',
        description: 'See the real difference you\'re making. Track deliveries completed, families helped, and your volunteer rating. Every delivery connects donors with recipients.',
        target: '/volunteer-dashboard',
        action: 'View Dashboard',
        value: 'Each delivery you complete helps 1-2 families and saves them 2-4 hours of time',
        tips: [
          'Monitor your impact: See families helped and deliveries completed',
          'Track your efficiency: High completion rates show reliability',
          'Build your reputation: Good ratings get you more delivery opportunities'
        ]
      },
      {
        id: 'available-tasks',
        title: 'Make a Difference Today',
        description: 'Browse delivery tasks in your area. Every task you accept helps connect a donor with a recipient, creating immediate community impact.',
        target: '/available-tasks',
        action: 'View Tasks',
        value: 'Volunteers save recipients 2-4 hours per delivery and enable faster community support',
        tips: [
          'Check route optimization: Efficient routes help more people',
          'Respect capacity: Reliable delivery builds community trust',
          'Accept strategically: Multiple nearby tasks maximize your impact'
        ]
      },
      {
        id: 'my-deliveries',
        title: 'Track Your Service',
        description: 'Monitor your active deliveries and see your completed impact. Real-time updates keep donors and recipients informed.',
        target: '/my-deliveries',
        action: 'View Deliveries',
        value: 'Every completed delivery strengthens community connections and builds trust',
        tips: [
          'Update status in real-time: Keeps everyone informed and builds trust',
          'Communicate clearly: Good communication improves recipient experience',
          'Complete deliveries promptly: Fast service creates lasting positive impact'
        ]
      },
      {
        id: 'schedule',
        title: 'Maximize Your Availability',
        description: 'Set your schedule to help more people. The system matches you with tasks that fit your availability, maximizing your community impact.',
        target: '/volunteer-schedule',
        action: 'Set Schedule',
        value: 'Setting availability helps you get matched with 3x more delivery opportunities',
        tips: [
          'Set realistic availability: Consistent schedules build trust',
          'Specify distance preferences: Helps match you with nearby tasks',
          'Update capacity regularly: Accurate capacity ensures reliable service'
        ]
      }
    ]
  }

  const steps = tourSteps[userRole] || tourSteps.donor
  const currentStepData = steps[currentStep]

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1)
    } else {
      handleComplete()
    }
  }

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1)
    }
  }

  const handleComplete = () => {
    // Mark tour as completed in localStorage
    localStorage.setItem(`onboarding_tour_completed_${userRole}`, 'true')
    setCompletedSteps(new Set(steps.map(s => s.id)))
    onClose()
  }

  const handleSkip = () => {
    localStorage.setItem(`onboarding_tour_skipped_${userRole}`, 'true')
    onClose()
  }

  const handleNavigate = () => {
    if (currentStepData.target) {
      navigate(currentStepData.target)
      setCompletedSteps(prev => new Set([...prev, currentStepData.id]))
    }
  }

  if (!isOpen) return null

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 overflow-y-auto">
        {/* Backdrop with enhanced blur */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/60 backdrop-blur-md pointer-events-none"
        />
        <div 
          className="fixed inset-0"
          onClick={handleSkip}
        />

        {/* Tour Card with Glassmorphism */}
        <div className="relative min-h-screen flex items-center justify-center p-4 sm:p-6 pointer-events-none">
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            onClick={(e) => e.stopPropagation()}
            className="relative z-10 w-full max-w-4xl my-8 pointer-events-auto"
            style={{ maxHeight: 'calc(100vh - 4rem)' }}
          >
            {/* Glass Container */}
            <div className="relative rounded-2xl overflow-hidden flex flex-col" style={{ maxHeight: 'calc(100vh - 4rem)' }}>
              {/* Glass effect background */}
              <div 
                className="backdrop-blur-xl bg-gradient-to-br from-navy-900/90 via-navy-800/85 to-navy-900/90 flex flex-col"
                style={{
                  background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.9) 0%, rgba(30, 41, 59, 0.85) 50%, rgba(15, 23, 42, 0.9) 100%)',
                  backdropFilter: 'blur(20px) saturate(180%)',
                  WebkitBackdropFilter: 'blur(20px) saturate(180%)',
                  maxHeight: 'calc(100vh - 4rem)'
                }}
              >
                {/* Border glow effect */}
                <div className="absolute inset-0 rounded-2xl border-2 border-yellow-400/40 shadow-[0_0_30px_rgba(250,204,21,0.3)]" />
                
                {/* Content Container */}
                <div className="relative flex flex-col flex-1 min-h-0">
                  {/* Header */}
                  <div className="flex items-center justify-between p-6 border-b border-yellow-400/20 bg-gradient-to-r from-yellow-500/5 to-transparent flex-shrink-0">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-yellow-400/20 border border-yellow-400/30">
                        <HelpCircle className="h-6 w-6 text-yellow-400" />
                      </div>
                      <div>
                        <h3 className="text-xl font-bold text-white">Getting Started</h3>
                        <p className="text-xs text-yellow-300/80 mt-0.5">Welcome to HopeLink</p>
                      </div>
                    </div>
                    <button
                      onClick={handleSkip}
                      className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition-all duration-200"
                      aria-label="Close tour"
                    >
                      <X className="h-5 w-5" />
                    </button>
                  </div>

                  {/* Content */}
                  <div className="p-6 sm:p-8 flex-1 overflow-y-auto">
                    {/* Step Indicator - Enhanced */}
                    <div className="flex items-center justify-between mb-8">
                      <div className="flex gap-2 flex-1">
                        {steps.map((step, index) => (
                          <div
                            key={step.id}
                            className={`h-2 rounded-full transition-all duration-300 ${
                              index === currentStep
                                ? 'bg-gradient-to-r from-yellow-400 to-yellow-500 flex-1 shadow-lg shadow-yellow-500/50'
                                : completedSteps.has(step.id)
                                ? 'bg-gradient-to-r from-green-400 to-green-500 w-8'
                                : 'bg-navy-700/50 w-2'
                            }`}
                          />
                        ))}
                      </div>
                      <div className="ml-4 px-3 py-1 rounded-full bg-yellow-400/10 border border-yellow-400/30">
                        <span className="text-sm font-semibold text-yellow-400">
                          {currentStep + 1} / {steps.length}
                        </span>
                      </div>
                    </div>

                    {/* Step Content */}
                    <div className="mb-8">
                      <h4 className="text-2xl sm:text-3xl font-bold text-white mb-3 bg-gradient-to-r from-white to-yellow-200 bg-clip-text text-transparent">
                        {currentStepData.title}
                      </h4>
                      <p className="text-base sm:text-lg text-yellow-200/90 mb-6 leading-relaxed">
                        {currentStepData.description}
                      </p>

                      {/* Value Proposition */}
                      {currentStepData.value && (
                        <div className="mb-6 p-4 rounded-xl border border-green-400/30 bg-gradient-to-r from-green-500/10 to-green-400/5 backdrop-blur-sm">
                          <div className="flex items-start gap-3">
                            <div className="p-1.5 rounded-lg bg-green-400/20 flex-shrink-0">
                              <Heart className="h-5 w-5 text-green-400" />
                            </div>
                            <div>
                              <p className="text-sm font-semibold text-green-400 mb-1 uppercase tracking-wide">
                                Impact Value
                              </p>
                              <p className="text-sm text-green-200 leading-relaxed">
                                {currentStepData.value}
                              </p>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Tips - Enhanced */}
                      {currentStepData.tips && (
                        <div 
                          className="rounded-xl p-5 border border-yellow-400/20 bg-gradient-to-br from-yellow-500/10 via-yellow-400/5 to-transparent backdrop-blur-sm"
                          style={{
                            background: 'linear-gradient(135deg, rgba(250, 204, 21, 0.1) 0%, rgba(250, 204, 21, 0.05) 50%, transparent 100%)'
                          }}
                        >
                          <div className="flex items-center gap-2 mb-3">
                            <div className="p-1.5 rounded-lg bg-yellow-400/20">
                              <CheckCircle className="h-4 w-4 text-yellow-400" />
                            </div>
                            <p className="text-sm font-semibold text-yellow-400 uppercase tracking-wider">
                              Quick Tips
                            </p>
                          </div>
                          <ul className="space-y-2.5">
                            {currentStepData.tips.map((tip, index) => (
                              <li key={index} className="text-sm sm:text-base text-yellow-200/90 flex items-start gap-3">
                                <div className="mt-1.5 flex-shrink-0">
                                  <div className="w-1.5 h-1.5 rounded-full bg-green-400 shadow-lg shadow-green-400/50" />
                                </div>
                                <span className="leading-relaxed">{tip}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>

                    {/* Action Button - Enhanced */}
                    {currentStepData.target && (
                      <button
                        onClick={handleNavigate}
                        className="w-full mb-6 px-6 py-3.5 bg-gradient-to-r from-yellow-500 to-yellow-600 text-navy-950 font-bold rounded-xl hover:from-yellow-400 hover:to-yellow-500 transition-all duration-200 flex items-center justify-center gap-2 shadow-lg shadow-yellow-500/30 hover:shadow-yellow-500/50 transform hover:scale-[1.02] active:scale-[0.98]"
                      >
                        <span className="text-base">{currentStepData.action}</span>
                        <ArrowRight className="h-5 w-5" />
                      </button>
                    )}

                    {/* Navigation - Enhanced */}
                    <div className="flex items-center justify-between gap-3 sm:gap-4 flex-shrink-0 pt-4 border-t border-yellow-400/20">
                      <button
                        onClick={handlePrevious}
                        disabled={currentStep === 0}
                        className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed bg-navy-800/50 hover:bg-navy-700/70 text-white border border-navy-700/50 hover:border-navy-600/50 backdrop-blur-sm"
                      >
                        <ArrowLeft className="h-4 w-4" />
                        <span className="hidden sm:inline">Previous</span>
                      </button>
                      
                      <button
                        onClick={handleSkip}
                        className="px-5 py-2.5 text-gray-400 hover:text-white font-medium rounded-xl hover:bg-white/5 transition-all duration-200"
                      >
                        Skip Tour
                      </button>
                      
                      <button
                        onClick={handleNext}
                        className="flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-yellow-500 to-yellow-600 text-navy-950 font-bold rounded-xl hover:from-yellow-400 hover:to-yellow-500 transition-all duration-200 shadow-lg shadow-yellow-500/30 hover:shadow-yellow-500/50 transform hover:scale-[1.02] active:scale-[0.98]"
                      >
                        <span>{currentStep === steps.length - 1 ? 'Complete' : 'Next'}</span>
                        {currentStep < steps.length - 1 && <ArrowRight className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </AnimatePresence>
  )
}

export default OnboardingTour

