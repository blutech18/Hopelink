import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { HelpCircle, X } from 'lucide-react'

const HelpTooltip = ({ 
  content, 
  position = 'top', 
  children, 
  className = '',
  showOnHover = true,
  persistent = false 
}) => {
  const [isVisible, setIsVisible] = useState(false)

  const positionClasses = {
    top: 'bottom-full left-1/2 -translate-x-1/2 mb-2',
    bottom: 'top-full left-1/2 -translate-x-1/2 mt-2',
    left: 'right-full top-1/2 -translate-y-1/2 mr-2',
    right: 'left-full top-1/2 -translate-y-1/2 ml-2'
  }

  const arrowClasses = {
    top: 'top-full left-1/2 -translate-x-1/2 border-t-navy-800 border-l-transparent border-r-transparent border-b-transparent',
    bottom: 'bottom-full left-1/2 -translate-x-1/2 border-b-navy-800 border-l-transparent border-r-transparent border-t-transparent',
    left: 'left-full top-1/2 -translate-y-1/2 border-l-navy-800 border-t-transparent border-b-transparent border-r-transparent',
    right: 'right-full top-1/2 -translate-y-1/2 border-r-navy-800 border-t-transparent border-b-transparent border-l-transparent'
  }

  return (
    <div 
      className={`relative inline-block ${className}`}
      onMouseEnter={showOnHover ? () => setIsVisible(true) : undefined}
      onMouseLeave={showOnHover && !persistent ? () => setIsVisible(false) : undefined}
      onClick={!showOnHover ? () => setIsVisible(!isVisible) : undefined}
    >
      {children}
      
      <AnimatePresence>
        {isVisible && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: position === 'top' ? 5 : position === 'bottom' ? -5 : 0 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ duration: 0.2 }}
            className={`absolute z-50 ${positionClasses[position]}`}
          >
            <div className="bg-navy-800 text-white text-sm rounded-lg shadow-xl border border-yellow-400/30 p-4 max-w-[900px] min-w-[300px]">
              {persistent && (
                <button
                  onClick={() => setIsVisible(false)}
                  className="absolute top-1 right-1 text-gray-400 hover:text-white"
                >
                  <X className="h-3 w-3" />
                </button>
              )}
              <div className="text-yellow-200 whitespace-normal break-words leading-relaxed">{content}</div>
              {/* Arrow */}
              <div className={`absolute w-0 h-0 border-4 ${arrowClasses[position]}`} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// Icon-based tooltip for inline help
export const HelpIcon = ({ content, position = 'top', className = '' }) => {
  return (
    <HelpTooltip content={content} position={position} className={className}>
      <HelpCircle className="h-4 w-4 text-yellow-400 cursor-help hover:text-yellow-300 transition-colors" />
    </HelpTooltip>
  )
}

export default HelpTooltip

