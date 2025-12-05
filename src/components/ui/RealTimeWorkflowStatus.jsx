import React from 'react'
import { motion } from 'framer-motion'
import { 
  Package, 
  Sparkles, 
  Heart, 
  Truck, 
  CheckCircle2,
  Clock,
  AlertCircle
} from 'lucide-react'

const RealTimeWorkflowStatus = ({ status, donation = null, showDetails = true }) => {
  const workflowSteps = [
    {
      id: 'available',
      step: 1,
      label: 'Available',
      icon: Package,
      color: 'text-blue-400',
      bgColor: 'bg-blue-500/20',
      borderColor: 'border-blue-400',
      message: 'Waiting for matching',
      nextAction: 'System is finding recipients',
      estimatedTime: '24-48 hours'
    },
    {
      id: 'matched',
      step: 2,
      label: 'Matched',
      icon: Sparkles,
      color: 'text-purple-400',
      bgColor: 'bg-purple-500/20',
      borderColor: 'border-purple-400',
      message: 'Matched with recipients',
      nextAction: 'Waiting for recipient to claim',
      estimatedTime: '1-24 hours'
    },
    {
      id: 'claimed',
      step: 3,
      label: 'Claimed',
      icon: Heart,
      color: 'text-pink-400',
      bgColor: 'bg-pink-500/20',
      borderColor: 'border-pink-400',
      message: 'Recipient has claimed',
      nextAction: 'Waiting for volunteer assignment',
      estimatedTime: '1-6 hours'
    },
    {
      id: 'in_transit',
      step: 4,
      label: 'In Transit',
      icon: Truck,
      color: 'text-yellow-400',
      bgColor: 'bg-yellow-500/20',
      borderColor: 'border-yellow-400',
      message: 'Volunteer is delivering',
      nextAction: 'Delivery in progress',
      estimatedTime: '1-3 hours'
    },
    {
      id: 'delivered',
      step: 5,
      label: 'Delivered',
      icon: CheckCircle2,
      color: 'text-green-400',
      bgColor: 'bg-green-500/20',
      borderColor: 'border-green-400',
      message: 'Delivery completed',
      nextAction: 'Waiting for recipient confirmation',
      estimatedTime: 'Within 24 hours'
    },
    {
      id: 'completed',
      step: 6,
      label: 'Completed',
      icon: CheckCircle2,
      color: 'text-emerald-400',
      bgColor: 'bg-emerald-500/20',
      borderColor: 'border-emerald-400',
      message: 'Transaction complete',
      nextAction: 'All parties confirmed',
      estimatedTime: 'Complete'
    }
  ]

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

  const currentIndex = getStatusIndex(status)
  const currentStep = workflowSteps[currentIndex]
  const progress = ((currentIndex + 1) / workflowSteps.length) * 100

  if (!currentStep) return null

  const StepIcon = currentStep.icon

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`p-4 rounded-xl border-2 ${currentStep.borderColor} ${currentStep.bgColor} backdrop-blur-sm`}
    >
      <div className="flex items-start gap-4">
        {/* Icon */}
        <div className={`p-3 rounded-lg ${currentStep.bgColor} border ${currentStep.borderColor} flex-shrink-0`}>
          <StepIcon className={`h-6 w-6 ${currentStep.color}`} />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {/* Step Indicator */}
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xs font-semibold text-yellow-400 uppercase tracking-wide">
              Step {currentStep.step} of {workflowSteps.length}
            </span>
            <div className="flex-1 h-2 bg-navy-800 rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.5 }}
                className="h-full bg-gradient-to-r from-blue-400 via-purple-400 via-pink-400 via-yellow-400 to-green-400"
              />
            </div>
            <span className="text-xs text-gray-400">{Math.round(progress)}%</span>
          </div>

          {/* Status */}
          <div className="mb-2">
            <h3 className="text-lg font-bold text-white mb-1">
              {currentStep.label}
            </h3>
            <p className="text-sm text-yellow-200">
              {currentStep.message}
            </p>
          </div>

          {/* Next Action */}
          {currentStep.step < workflowSteps.length && (
            <div className="flex items-center gap-2 text-sm text-gray-300 mb-2">
              <Clock className="h-4 w-4 text-yellow-400" />
              <span>{currentStep.nextAction}</span>
            </div>
          )}

          {/* Estimated Time */}
          {currentStep.estimatedTime !== 'Complete' && (
            <div className="flex items-center gap-2 text-xs text-yellow-300/80">
              <span className="font-medium">Estimated time:</span>
              <span>{currentStep.estimatedTime}</span>
            </div>
          )}

          {/* Additional Details */}
          {showDetails && donation && (
            <div className="mt-3 pt-3 border-t border-navy-700/50">
              <div className="grid grid-cols-2 gap-2 text-xs">
                {donation.recipient_name && (
                  <div>
                    <span className="text-gray-400">Recipient:</span>
                    <span className="text-white ml-1">{donation.recipient_name}</span>
                  </div>
                )}
                {donation.volunteer_name && (
                  <div>
                    <span className="text-gray-400">Volunteer:</span>
                    <span className="text-white ml-1">{donation.volunteer_name}</span>
                  </div>
                )}
                {donation.updated_at && (
                  <div className="col-span-2">
                    <span className="text-gray-400">Last updated:</span>
                    <span className="text-white ml-1">
                      {new Date(donation.updated_at).toLocaleString()}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Progress Steps */}
      {showDetails && (
        <div className="mt-4 pt-4 border-t border-navy-700/50">
          <div className="flex items-center justify-between text-xs">
            {workflowSteps.map((step, index) => {
              const StepIconSmall = step.icon
              const isActive = index <= currentIndex
              const isCurrent = index === currentIndex

              return (
                <div
                  key={step.id}
                  className="flex flex-col items-center gap-1 flex-1"
                >
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center border-2 transition-all ${
                      isActive
                        ? `${step.bgColor} ${step.borderColor}`
                        : 'bg-navy-800/50 border-navy-700'
                    }`}
                  >
                    <StepIconSmall
                      className={`h-4 w-4 ${
                        isActive ? step.color : 'text-gray-500'
                      }`}
                    />
                  </div>
                  <span
                    className={`text-center ${
                      isCurrent
                        ? 'text-yellow-400 font-semibold'
                        : isActive
                        ? 'text-gray-300'
                        : 'text-gray-500'
                    }`}
                  >
                    {step.step}
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </motion.div>
  )
}

export default RealTimeWorkflowStatus

