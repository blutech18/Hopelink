import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, ArrowRight, ArrowLeft, Play, CheckCircle2, Info } from 'lucide-react'
import InteractiveWorkflowDiagram from './InteractiveWorkflowDiagram'

const WorkflowTutorial = ({ isOpen, onClose, userRole = 'donor' }) => {
  const [currentStep, setCurrentStep] = useState(0)
  const [isAutoPlaying, setIsAutoPlaying] = useState(false)

  const tutorialSteps = {
    donor: [
      {
        id: 'overview',
        title: 'How Donations Flow',
        description: 'Your donation goes through 6 key steps from posting to completion. Let\'s see how it works!',
        content: 'When you post a donation, our smart system matches it with recipients who need it most. A volunteer then delivers it, creating real impact in your community.',
        diagramStatus: null,
        tips: [
          'Each donation helps an average of 2-4 families',
          'The entire process typically takes 2-5 days',
          'You can track progress in real-time'
        ]
      },
      {
        id: 'post',
        title: 'Step 1: Post Your Donation',
        description: 'Create a donation listing with photos and details',
        content: 'Start by posting what you want to donate. Add clear photos, a detailed description, and specify your delivery preferences. The better your listing, the faster it gets matched!',
        diagramStatus: 'available',
        tips: [
          'Use high-quality photos for better matching',
          'Be specific about condition and quantity',
          'Set realistic pickup times'
        ]
      },
      {
        id: 'matching',
        title: 'Step 2: Smart Matching',
        description: 'Our AI finds the best recipients for your donation',
        content: 'Our intelligent matching algorithm analyzes location, need, urgency, and compatibility to find recipients who will benefit most from your donation.',
        diagramStatus: 'matched',
        tips: [
          'Matching typically happens within 24-48 hours',
          'You\'ll receive notifications when matches are found',
          'You can review matched recipients before they claim'
        ]
      },
      {
        id: 'claim',
        title: 'Step 3: Recipient Claims',
        description: 'A recipient claims your donation',
        content: 'When a recipient claims your donation, you\'ll be notified. You can see their profile and verification status. The delivery process begins!',
        diagramStatus: 'claimed',
        tips: [
          'Verified recipients get priority',
          'You can communicate with recipients',
          'Delivery is arranged automatically'
        ]
      },
      {
        id: 'delivery',
        title: 'Step 4: Volunteer Delivery',
        description: 'A verified volunteer delivers your donation',
        content: 'A volunteer picks up your donation and delivers it to the recipient. You can track the delivery in real-time and see when it arrives.',
        diagramStatus: 'in_transit',
        tips: [
          'Track delivery progress in real-time',
          'Volunteers are verified and trusted',
          'Delivery typically takes 1-3 hours'
        ]
      },
      {
        id: 'complete',
        title: 'Step 5-6: Completion',
        description: 'Delivery confirmed and transaction completed',
        content: 'Once the recipient confirms delivery, the transaction is complete. You can provide feedback and see your impact in your dashboard.',
        diagramStatus: 'completed',
        tips: [
          'Your impact is recorded automatically',
          'Feedback helps improve the platform',
          'See how many families you\'ve helped'
        ]
      }
    ],
    recipient: [
      {
        id: 'overview',
        title: 'How Requests Work',
        description: 'Your request goes through 6 steps from creation to receiving your donation',
        content: 'Create a request for what you need. Our system matches you with donors, and volunteers deliver directly to you. It\'s that simple!',
        diagramStatus: null,
        tips: [
          'Verified requests get matched 3x faster',
          'You save 2-4 hours per item',
          'Free delivery from verified volunteers'
        ]
      },
      {
        id: 'request',
        title: 'Step 1: Create Request',
        description: 'Post what you need with details',
        content: 'Create a detailed request describing what you need. Be specific about quantity, condition, and urgency. Verified requests get priority matching!',
        diagramStatus: 'available',
        tips: [
          'Detailed requests match faster',
          'Set appropriate urgency levels',
          'Complete verification for priority'
        ]
      },
      {
        id: 'matching',
        title: 'Step 2: Smart Matching',
        description: 'System finds donations that match your request',
        content: 'Our algorithm finds donations that match your needs. You\'ll see matched donations and can review donor profiles before claiming.',
        diagramStatus: 'matched',
        tips: [
          'Check donor verification status',
          'Multiple donations may be available',
          'Claim quickly - popular items go fast'
        ]
      },
      {
        id: 'claim',
        title: 'Step 3: Claim Donation',
        description: 'Claim a donation that matches your needs',
        content: 'When you find a donation that matches, claim it! The system arranges delivery with a volunteer. You\'ll receive updates throughout the process.',
        diagramStatus: 'claimed',
        tips: [
          'Claim donations that best fit your needs',
          'You\'ll be notified about delivery',
          'Track progress in real-time'
        ]
      },
      {
        id: 'delivery',
        title: 'Step 4: Receive Delivery',
        description: 'Volunteer delivers your donation',
        content: 'A verified volunteer picks up your donation and delivers it directly to you. Track the delivery and be ready to receive it when it arrives.',
        diagramStatus: 'in_transit',
        tips: [
          'Track delivery in real-time',
          'Ensure someone is available to receive',
          'Confirm receipt when it arrives'
        ]
      },
      {
        id: 'complete',
        title: 'Step 5-6: Confirm & Complete',
        description: 'Confirm receipt and complete transaction',
        content: 'Inspect your donation and confirm receipt. Provide feedback to help improve the platform. Your request fulfillment is recorded!',
        diagramStatus: 'completed',
        tips: [
          'Confirm within 24 hours',
          'Report any issues immediately',
          'Your feedback builds community trust'
        ]
      }
    ],
    volunteer: [
      {
        id: 'overview',
        title: 'How Volunteer Delivery Works',
        description: 'Help connect donors with recipients in 6 simple steps',
        content: 'As a volunteer, you help complete the donation cycle by picking up donations and delivering them to recipients. Every delivery makes a difference!',
        diagramStatus: null,
        tips: [
          'Each delivery helps 1-2 families',
          'You save recipients 2-4 hours',
          'Build your volunteer reputation'
        ]
      },
      {
        id: 'available',
        title: 'Step 1: Browse Tasks',
        description: 'See available delivery tasks in your area',
        content: 'Browse delivery tasks that match your location and availability. Check distance, route, and item details before accepting.',
        diagramStatus: 'available',
        tips: [
          'Filter by distance and capacity',
          'Check your schedule before accepting',
          'Accept tasks you can complete'
        ]
      },
      {
        id: 'matched',
        title: 'Step 2: Get Matched',
        description: 'System matches you with delivery tasks',
        content: 'Our system matches you with tasks based on your location, availability, and capacity. Review details and accept tasks that fit your schedule.',
        diagramStatus: 'matched',
        tips: [
          'You\'ll be notified of matches',
          'Review pickup and delivery locations',
          'Check item details before accepting'
        ]
      },
      {
        id: 'claim',
        title: 'Step 3: Accept Task',
        description: 'Accept a delivery task',
        content: 'Accept a delivery task that fits your schedule. Contact the donor to arrange pickup time and prepare for the delivery.',
        diagramStatus: 'claimed',
        tips: [
          'Confirm pickup time with donor',
          'Bring necessary equipment',
          'Update status when you pick up'
        ]
      },
      {
        id: 'delivery',
        title: 'Step 4: Deliver',
        description: 'Pick up and deliver the donation',
        content: 'Pick up the donation from the donor and deliver it to the recipient. Update your status as you progress and keep all parties informed.',
        diagramStatus: 'in_transit',
        tips: [
          'Use navigation for optimal routes',
          'Update status in real-time',
          'Contact recipient when close'
        ]
      },
      {
        id: 'complete',
        title: 'Step 5-6: Complete Delivery',
        description: 'Get confirmation and complete',
        content: 'Deliver the donation and get recipient confirmation. Provide feedback about your experience. Your delivery count and rating are updated!',
        diagramStatus: 'completed',
        tips: [
          'Ensure recipient is satisfied',
          'Get delivery confirmation',
          'See your impact in dashboard'
        ]
      }
    ]
  }

  const steps = tutorialSteps[userRole] || tutorialSteps.donor
  const currentStepData = steps[currentStep]

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1)
      setIsAutoPlaying(false)
    } else {
      handleComplete()
    }
  }

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1)
      setIsAutoPlaying(false)
    }
  }

  const handleComplete = () => {
    localStorage.setItem(`workflow_tutorial_completed_${userRole}`, 'true')
    onClose()
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-black/60 backdrop-blur-md"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="absolute inset-0 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          onClick={(e) => e.stopPropagation()}
          className="relative z-10 w-full max-w-5xl bg-gradient-to-br from-navy-900/95 to-navy-800/95 rounded-2xl border-2 border-yellow-400/30 shadow-2xl backdrop-blur-xl"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-yellow-400/20">
            <div>
              <h2 className="text-2xl font-bold text-white">Workflow Tutorial</h2>
              <p className="text-sm text-yellow-300/80 mt-1">
                Step {currentStep + 1} of {steps.length}
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition-all"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Content */}
          <div className="p-6">
            {/* Step Indicator */}
            <div className="flex gap-2 mb-6">
              {steps.map((step, index) => (
                <div
                  key={step.id}
                  className={`h-2 rounded-full transition-all flex-1 ${
                    index === currentStep
                      ? 'bg-yellow-400'
                      : index < currentStep
                      ? 'bg-green-400'
                      : 'bg-navy-700'
                  }`}
                />
              ))}
            </div>

            {/* Step Content */}
            <AnimatePresence mode="wait">
              <motion.div
                key={currentStep}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
              >
                <div className="mb-6">
                  <h3 className="text-2xl font-bold text-white mb-2">
                    {currentStepData.title}
                  </h3>
                  <p className="text-lg text-yellow-200 mb-4">
                    {currentStepData.description}
                  </p>
                  <p className="text-yellow-100 leading-relaxed mb-6">
                    {currentStepData.content}
                  </p>

                  {/* Tips */}
                  {currentStepData.tips && (
                    <div className="bg-yellow-500/10 rounded-lg p-4 border border-yellow-400/20 mb-6">
                      <div className="flex items-center gap-2 mb-3">
                        <Info className="h-5 w-5 text-yellow-400" />
                        <h4 className="font-semibold text-yellow-400">Key Points</h4>
                      </div>
                      <ul className="space-y-2">
                        {currentStepData.tips.map((tip, index) => (
                          <li key={index} className="flex items-start gap-2 text-yellow-200">
                            <CheckCircle2 className="h-4 w-4 text-yellow-400 mt-0.5 flex-shrink-0" />
                            <span className="text-sm">{tip}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>

                {/* Interactive Diagram */}
                {currentStepData.diagramStatus && (
                  <div className="bg-navy-800/30 rounded-xl p-6 border border-navy-700/50 mb-6">
                    <InteractiveWorkflowDiagram
                      currentStatus={currentStepData.diagramStatus}
                      autoPlay={isAutoPlaying}
                      speed={3000}
                    />
                  </div>
                )}
              </motion.div>
            </AnimatePresence>

            {/* Navigation */}
            <div className="flex items-center justify-between gap-4">
              <button
                onClick={handlePrevious}
                disabled={currentStep === 0}
                className="flex items-center gap-2 px-5 py-2.5 rounded-lg font-semibold transition-all disabled:opacity-40 disabled:cursor-not-allowed bg-navy-800/50 hover:bg-navy-700/70 text-white border border-navy-700"
              >
                <ArrowLeft className="h-4 w-4" />
                Previous
              </button>

              <button
                onClick={() => setIsAutoPlaying(!isAutoPlaying)}
                className="flex items-center gap-2 px-5 py-2.5 rounded-lg font-semibold transition-all bg-yellow-500/20 hover:bg-yellow-500/30 text-yellow-400 border border-yellow-400/30"
              >
                {isAutoPlaying ? (
                  <>
                    <X className="h-4 w-4" />
                    Stop Auto-play
                  </>
                ) : (
                  <>
                    <Play className="h-4 w-4" />
                    Auto-play
                  </>
                )}
              </button>

              <button
                onClick={currentStep === steps.length - 1 ? handleComplete : handleNext}
                className="flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-yellow-500 to-yellow-600 text-navy-950 font-bold rounded-lg hover:from-yellow-400 hover:to-yellow-500 transition-all shadow-lg shadow-yellow-500/30"
              >
                {currentStep === steps.length - 1 ? 'Complete Tutorial' : 'Next'}
                {currentStep < steps.length - 1 && <ArrowRight className="h-4 w-4" />}
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  )
}

export default WorkflowTutorial

