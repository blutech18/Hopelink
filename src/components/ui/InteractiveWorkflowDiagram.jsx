import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Gift, 
  Sparkles, 
  Heart, 
  Truck, 
  CheckCircle2,
  Users,
  ArrowRight,
  Play,
  Pause,
  RotateCcw,
  Info
} from 'lucide-react'

const InteractiveWorkflowDiagram = ({ 
  currentStatus = null, 
  autoPlay = false,
  speed = 2000,
  onStepClick = null 
}) => {
  const [activeStep, setActiveStep] = useState(0)
  const [isPlaying, setIsPlaying] = useState(autoPlay)
  const [isHovered, setIsHovered] = useState(null)

  const workflowSteps = [
    {
      id: 'available',
      step: 1,
      label: 'Donor Posts',
      icon: Gift,
      color: 'text-blue-400',
      bgColor: 'bg-blue-500/20',
      borderColor: 'border-blue-400',
      description: 'Donor creates a donation listing',
      actor: 'Donor',
      timeEstimate: '2-5 min',
      details: 'Donor uploads photos, adds description, and sets delivery preferences'
    },
    {
      id: 'matched',
      step: 2,
      label: 'Smart Matching',
      icon: Sparkles,
      color: 'text-purple-400',
      bgColor: 'bg-purple-500/20',
      borderColor: 'border-purple-400',
      description: 'AI algorithm matches with recipients',
      actor: 'System',
      timeEstimate: '24-48 hours',
      details: 'Matches based on location, need, urgency, and compatibility'
    },
    {
      id: 'claimed',
      step: 3,
      label: 'Recipient Claims',
      icon: Heart,
      color: 'text-pink-400',
      bgColor: 'bg-pink-500/20',
      borderColor: 'border-pink-400',
      description: 'Recipient claims the donation',
      actor: 'Recipient',
      timeEstimate: '1-2 hours',
      details: 'Recipient reviews match and claims donation'
    },
    {
      id: 'in_transit',
      step: 4,
      label: 'Volunteer Delivery',
      icon: Truck,
      color: 'text-yellow-400',
      bgColor: 'bg-yellow-500/20',
      borderColor: 'border-yellow-400',
      description: 'Volunteer picks up and delivers',
      actor: 'Volunteer',
      timeEstimate: '1-3 hours',
      details: 'Volunteer picks up from donor and delivers to recipient'
    },
    {
      id: 'delivered',
      step: 5,
      label: 'Delivery Confirmed',
      icon: CheckCircle2,
      color: 'text-green-400',
      bgColor: 'bg-green-500/20',
      borderColor: 'border-green-400',
      description: 'Recipient confirms delivery',
      actor: 'Recipient',
      timeEstimate: 'Within 24 hours',
      details: 'Recipient inspects and confirms receipt'
    },
    {
      id: 'completed',
      step: 6,
      label: 'Transaction Complete',
      icon: CheckCircle2,
      color: 'text-emerald-400',
      bgColor: 'bg-emerald-500/20',
      borderColor: 'border-emerald-400',
      description: 'All parties provide feedback',
      actor: 'All',
      timeEstimate: '5-10 min',
      details: 'Donor, recipient, and volunteer share feedback'
    }
  ]

  // Map current status to step index
  const getStatusIndex = (status) => {
    const statusMap = {
      'available': 0,
      'matched': 1,
      'claimed': 2,
      'in_transit': 3,
      'delivered': 4,
      'completed': 5
    }
    return statusMap[status] ?? 0
  }

  // Set active step based on current status
  useEffect(() => {
    if (currentStatus) {
      const statusIndex = getStatusIndex(currentStatus)
      setActiveStep(statusIndex)
    }
  }, [currentStatus])

  // Auto-play animation
  useEffect(() => {
    if (!isPlaying) return

    const interval = setInterval(() => {
      setActiveStep((prev) => {
        const next = (prev + 1) % workflowSteps.length
        return next
      })
    }, speed)

    return () => clearInterval(interval)
  }, [isPlaying, speed, workflowSteps.length])

  const handleStepClick = (index) => {
    setActiveStep(index)
    setIsPlaying(false)
    if (onStepClick) {
      onStepClick(workflowSteps[index])
    }
  }

  const handlePlayPause = () => {
    setIsPlaying(!isPlaying)
  }

  const handleReset = () => {
    setActiveStep(0)
    setIsPlaying(false)
  }

  const currentStepData = workflowSteps[activeStep]

  return (
    <div className="w-full">
      {/* Controls */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <button
            onClick={handlePlayPause}
            className="flex items-center gap-2 px-4 py-2 bg-yellow-500/20 hover:bg-yellow-500/30 text-yellow-400 rounded-lg border border-yellow-400/30 transition-all"
          >
            {isPlaying ? (
              <>
                <Pause className="h-4 w-4" />
                <span className="text-sm font-medium">Pause</span>
              </>
            ) : (
              <>
                <Play className="h-4 w-4" />
                <span className="text-sm font-medium">Play</span>
              </>
            )}
          </button>
          <button
            onClick={handleReset}
            className="flex items-center gap-2 px-4 py-2 bg-navy-800/50 hover:bg-navy-700/70 text-white rounded-lg border border-navy-700 transition-all"
          >
            <RotateCcw className="h-4 w-4" />
            <span className="text-sm font-medium">Reset</span>
          </button>
        </div>
        <div className="text-sm text-yellow-300">
          Step {activeStep + 1} of {workflowSteps.length}
        </div>
      </div>

      {/* Workflow Steps */}
      <div className="relative">
        {/* Connection Lines */}
        <div className="absolute top-12 left-0 right-0 h-0.5 bg-navy-700 z-0" />
        <motion.div
          className="absolute top-12 left-0 h-0.5 bg-gradient-to-r from-blue-400 via-purple-400 via-pink-400 via-yellow-400 to-green-400 z-10"
          initial={{ width: 0 }}
          animate={{ 
            width: `${(activeStep / (workflowSteps.length - 1)) * 100}%` 
          }}
          transition={{ duration: 0.5 }}
        />

        {/* Steps */}
        <div className="relative flex items-start justify-between gap-2">
          {workflowSteps.map((step, index) => {
            const StepIcon = step.icon
            const isActive = index <= activeStep
            const isCurrent = index === activeStep
            const isCompleted = index < activeStep

            return (
              <div
                key={step.id}
                className="flex flex-col items-center flex-1 relative z-20 cursor-pointer group"
                onClick={() => handleStepClick(index)}
                onMouseEnter={() => setIsHovered(index)}
                onMouseLeave={() => setIsHovered(null)}
              >
                {/* Step Circle */}
                <motion.div
                  initial={false}
                  animate={{
                    scale: isCurrent ? 1.2 : isHovered === index ? 1.1 : 1,
                    backgroundColor: isCompleted 
                      ? 'rgba(34, 197, 94, 0.2)' 
                      : isCurrent 
                      ? step.bgColor.replace('/20', '/30')
                      : 'rgba(51, 65, 85, 0.2)',
                    borderColor: isCompleted 
                      ? 'rgb(34, 197, 94)' 
                      : isCurrent 
                      ? step.borderColor.replace('border-', 'rgb(')
                      : 'rgb(51, 65, 85)'
                  }}
                  className={`relative w-16 h-16 sm:w-20 sm:h-20 rounded-full border-2 flex flex-col items-center justify-center transition-all ${
                    isCompleted 
                      ? 'bg-green-500/20 border-green-400 shadow-lg shadow-green-400/30' 
                      : isCurrent 
                      ? `${step.bgColor} ${step.borderColor} shadow-lg shadow-yellow-400/30` 
                      : 'bg-navy-800/50 border-navy-700'
                  }`}
                >
                  {/* Step Number */}
                  <div className={`absolute -top-2 -right-2 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                    isCompleted 
                      ? 'bg-green-400 text-white' 
                      : isCurrent 
                      ? 'bg-yellow-400 text-navy-950' 
                      : 'bg-navy-700 text-gray-400'
                  }`}>
                    {step.step}
                  </div>
                  
                  <StepIcon className={`h-8 w-8 sm:h-10 sm:w-10 ${
                    isActive ? step.color : 'text-gray-500'
                  }`} />
                  
                  {/* Pulse animation for current step */}
                  {isCurrent && (
                    <motion.div
                      animate={{ scale: [1, 1.3, 1], opacity: [0.5, 0, 0.5] }}
                      transition={{ repeat: Infinity, duration: 2 }}
                      className="absolute inset-0 rounded-full border-2 border-yellow-400"
                    />
                  )}
                </motion.div>

                {/* Step Label */}
                <div className="mt-3 text-center w-full">
                  <div className={`font-semibold text-sm sm:text-base ${
                    isActive ? 'text-white' : 'text-gray-400'
                  }`}>
                    {step.label}
                  </div>
                  <div className={`text-xs mt-1 ${
                    isActive ? 'text-gray-300' : 'text-gray-500'
                  }`}>
                    {step.actor}
                  </div>
                  {isCurrent && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="mt-2 text-xs text-yellow-400 font-medium"
                    >
                      {step.timeEstimate}
                    </motion.div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Current Step Details */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeStep}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.3 }}
          className={`mt-8 p-6 rounded-xl border-2 ${currentStepData.borderColor} ${currentStepData.bgColor} backdrop-blur-sm`}
        >
          <div className="flex items-start gap-4">
            <div className={`p-3 rounded-lg ${currentStepData.bgColor} border ${currentStepData.borderColor}`}>
              <currentStepData.icon className={`h-6 w-6 ${currentStepData.color}`} />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <h3 className="text-xl font-bold text-white">
                  Step {currentStepData.step}: {currentStepData.label}
                </h3>
                <span className="px-2 py-1 bg-yellow-400/20 text-yellow-400 text-xs font-semibold rounded border border-yellow-400/30">
                  {currentStepData.actor}
                </span>
              </div>
              <p className="text-yellow-200 mb-3 leading-relaxed">
                {currentStepData.description}
              </p>
              <div className="flex items-center gap-4 text-sm">
                <div className="flex items-center gap-2 text-gray-300">
                  <Info className="h-4 w-4" />
                  <span>{currentStepData.details}</span>
                </div>
                <div className="flex items-center gap-2 text-yellow-300">
                  <span className="font-medium">Time:</span>
                  <span>{currentStepData.timeEstimate}</span>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </AnimatePresence>

      {/* Role Flow Visualization */}
      <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-navy-800/50 rounded-lg p-4 border border-blue-400/20">
          <div className="flex items-center gap-2 mb-2">
            <Gift className="h-5 w-5 text-blue-400" />
            <h4 className="font-semibold text-white">Donor</h4>
          </div>
          <p className="text-sm text-gray-300">
            Posts donation → Reviews matches → Prepares for pickup
          </p>
        </div>
        <div className="bg-navy-800/50 rounded-lg p-4 border border-purple-400/20">
          <div className="flex items-center gap-2 mb-2">
            <Sparkles className="h-5 w-5 text-purple-400" />
            <h4 className="font-semibold text-white">System</h4>
          </div>
          <p className="text-sm text-gray-300">
            Matches donations → Assigns volunteers → Tracks progress
          </p>
        </div>
        <div className="bg-navy-800/50 rounded-lg p-4 border border-green-400/20">
          <div className="flex items-center gap-2 mb-2">
            <Users className="h-5 w-5 text-green-400" />
            <h4 className="font-semibold text-white">Recipient & Volunteer</h4>
          </div>
          <p className="text-sm text-gray-300">
            Claims donation → Receives delivery → Confirms receipt
          </p>
        </div>
      </div>
    </div>
  )
}

export default InteractiveWorkflowDiagram

