import React from 'react'
import { motion } from 'framer-motion'
import { 
  Package, 
  Heart, 
  Truck, 
  CheckCircle2
} from 'lucide-react'

const RequestWorkflowProgressBar = ({ 
  status, 
  currentStep = null, 
  showLabels = true, 
  showStatusInfo = true,
  size = 'md',
  orientation = 'horizontal' 
}) => {
  // Define workflow steps for requests
  const workflowSteps = [
    {
      id: 'open',
      label: 'Open',
      icon: Package,
      color: 'text-blue-400',
      bgColor: 'bg-blue-500/20',
      borderColor: 'border-blue-400',
      description: 'Request is open and waiting for donations'
    },
    {
      id: 'claimed',
      label: 'Claimed',
      icon: Heart,
      color: 'text-pink-400',
      bgColor: 'bg-pink-500/20',
      borderColor: 'border-pink-400',
      description: 'Donor has claimed your request'
    },
    {
      id: 'in_progress',
      label: 'In Progress',
      icon: Truck,
      color: 'text-yellow-400',
      bgColor: 'bg-yellow-500/20',
      borderColor: 'border-yellow-400',
      description: 'Delivery is in progress'
    },
    {
      id: 'fulfilled',
      label: 'Fulfilled',
      icon: CheckCircle2,
      color: 'text-green-400',
      bgColor: 'bg-green-500/20',
      borderColor: 'border-green-400',
      description: 'Request has been fulfilled and received'
    }
  ]

  // Map status to step index
  const getStatusIndex = (status) => {
    const statusMap = {
      'open': 0,
      'claimed': 1,
      'in_progress': 2,
      'fulfilled': 3
    }
    return statusMap[status] ?? 0
  }

  const currentIndex = currentStep !== null ? currentStep : getStatusIndex(status)
  const activeIndex = Math.min(currentIndex, workflowSteps.length - 1)

  const sizeClasses = {
    sm: {
      icon: 'h-4 w-4',
      text: 'text-[10px]',
      container: 'gap-1',
      stepGap: 'gap-0.5'
    },
    md: {
      icon: 'h-6 w-6',
      text: 'text-sm',
      container: 'gap-3',
      stepGap: 'gap-2'
    },
    lg: {
      icon: 'h-7 w-7',
      text: 'text-base',
      container: 'gap-4',
      stepGap: 'gap-3'
    }
  }

  const classes = sizeClasses[size]

  // Horizontal layout (default)
  return (
    <div className="w-full">
      <div className={`flex items-center ${classes.container} relative`}>
        {workflowSteps.map((step, index) => {
          const StepIcon = step.icon
          const isActive = index <= activeIndex
          const isCurrent = index === activeIndex
          const isCompleted = index < activeIndex

          return (
            <React.Fragment key={step.id}>
              {/* Step */}
              <div className="flex flex-col items-center flex-1 relative z-10">
                <motion.div
                  initial={false}
                  animate={{
                    scale: isCurrent ? 1.15 : 1,
                  }}
                  className={`relative w-10 h-10 sm:w-11 sm:h-11 rounded-full border-2 flex items-center justify-center transition-all ${
                    isCompleted 
                      ? 'bg-green-500/20 border-green-400 shadow-lg shadow-green-400/30' 
                      : isCurrent 
                      ? `${step.bgColor} ${step.borderColor} shadow-xl shadow-yellow-400/60` 
                      : 'bg-white/20 border-white/40'
                  }`}
                >
                  <StepIcon className={`${classes.icon} ${isActive ? step.color : 'text-white'}`} />
                  {isCurrent && (
                    <>
                      <motion.div
                        animate={{ scale: [1, 1.3, 1] }}
                        transition={{ repeat: Infinity, duration: 2 }}
                        className="absolute inset-0 rounded-full border-2 border-yellow-400 opacity-80"
                      />
                      <motion.div
                        animate={{ scale: [1, 1.5, 1] }}
                        transition={{ repeat: Infinity, duration: 2, delay: 0.1 }}
                        className="absolute inset-0 rounded-full border-2 border-yellow-500 opacity-60"
                      />
                    </>
                  )}
                </motion.div>

                {/* Label */}
                {showLabels && (
                <div className="mt-1.5 text-center">
                    <div className={`font-medium ${classes.text} ${isActive ? 'text-white' : 'text-white'}`}>
                      {step.label}
                    </div>
                  </div>
                )}
              </div>

              {/* Connector Line */}
              {index < workflowSteps.length - 1 && (
                <div 
                  className={`flex-1 h-0.5 relative -mx-1 sm:-mx-1.5 ${
                    index < activeIndex ? 'bg-green-400' : 'bg-white/30'
                  }`}
                >
                  {index < activeIndex && (
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: '100%' }}
                      transition={{ duration: 0.5 }}
                      className="h-full bg-green-400"
                    />
                  )}
                </div>
              )}
            </React.Fragment>
          )
        })}
      </div>

      {/* Current Status Info */}
      {showStatusInfo && workflowSteps[activeIndex] && (() => {
        const CurrentIcon = workflowSteps[activeIndex].icon
        return (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className={`mt-4 p-3 rounded-lg border ${workflowSteps[activeIndex].bgColor} ${workflowSteps[activeIndex].borderColor} border-opacity-30`}
          >
            <div className="flex items-center gap-2">
              <CurrentIcon className={`${classes.icon} ${workflowSteps[activeIndex].color}`} />
              <div>
                <div className={`font-semibold ${classes.text} text-white`}>
                  Current Status: {workflowSteps[activeIndex].label}
                </div>
                <div className="text-xs text-gray-300 mt-0.5">
                  {workflowSteps[activeIndex].description}
                </div>
              </div>
            </div>
          </motion.div>
        )
      })()}
    </div>
  )
}

export default RequestWorkflowProgressBar

