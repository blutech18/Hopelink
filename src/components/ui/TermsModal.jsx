import React, { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, ScrollText, CheckCircle } from 'lucide-react'

const TermsModal = ({ isOpen, onClose, title, children, onScrolledToBottom, hasScrolledToBottom, onAccept }) => {
  const [isScrolledToBottom, setIsScrolledToBottom] = useState(false)
  const contentRef = useRef(null)

  // Reset scroll state when modal opens
  useEffect(() => {
    if (isOpen) {
      setIsScrolledToBottom(hasScrolledToBottom || false)
    }
  }, [isOpen, hasScrolledToBottom])

  const handleScroll = (e) => {
    const element = e.target
    const threshold = 5 // Small threshold to account for pixel differences
    const isAtBottom = element.scrollHeight - element.scrollTop <= element.clientHeight + threshold
    
    if (isAtBottom && !isScrolledToBottom) {
      setIsScrolledToBottom(true)
      if (onScrolledToBottom) {
        onScrolledToBottom()
      }
    }
  }

  const handleAccept = () => {
    if (isScrolledToBottom) {
      if (onAccept) {
        onAccept() // Use the onAccept callback if provided
      } else {
        onClose(true) // Fallback to old behavior
      }
    }
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen p-3 sm:p-4 text-center">
            {/* Background overlay */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 backdrop-blur-sm"
              onClick={() => onClose(false)}
            />

            {/* Modal */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ duration: 0.2 }}
              className="inline-block w-full max-w-4xl p-4 sm:p-6 my-4 sm:my-8 overflow-hidden text-left align-middle transition-all transform bg-navy-900 border-2 border-yellow-500/30 shadow-2xl rounded-lg sm:rounded-xl relative"
            >
              {/* Header */}
              <div className="flex items-center justify-between mb-4 sm:mb-6 border-b-2 border-yellow-500/20 pb-3 sm:pb-4">
                <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
                  <div className="p-1.5 sm:p-2 bg-yellow-500/10 rounded-lg flex-shrink-0">
                    <ScrollText className="h-4 w-4 sm:h-5 sm:w-5 text-yellow-400" />
                  </div>
                  <h3 className="text-base sm:text-lg lg:text-xl font-bold text-white truncate">
                    {title}
                  </h3>
                </div>
                <button
                  onClick={() => onClose(false)}
                  className="text-gray-400 hover:text-white transition-colors p-1.5 sm:p-2 hover:bg-navy-800 rounded-lg flex-shrink-0"
                  aria-label="Close modal"
                >
                  <X className="h-4 w-4 sm:h-5 sm:w-5" />
                </button>
              </div>

              {/* Scroll instruction */}
              {!isScrolledToBottom && (
                <div className="mb-3 sm:mb-4 p-2.5 sm:p-3 bg-yellow-900/20 border border-yellow-500/30 rounded-lg">
                  <p className="text-yellow-300 text-xs sm:text-sm">
                    📄 Please scroll to the bottom to read the complete {title.toLowerCase()} before continuing.
                  </p>
                </div>
              )}

              {/* Content */}
              <div 
                ref={contentRef}
                className="max-h-[50vh] sm:max-h-96 overflow-y-auto pr-2 custom-scrollbar"
                onScroll={handleScroll}
              >
                <div className="text-gray-300 text-xs sm:text-sm leading-relaxed">
                  {children}
                </div>
              </div>

              {/* Footer */}
              <div className="mt-4 sm:mt-6 pt-3 sm:pt-4 border-t-2 border-yellow-500/20 flex flex-col sm:flex-row justify-between items-center gap-3">
                <div className="flex items-center w-full sm:w-auto">
                  {isScrolledToBottom && (
                    <div className="flex items-center text-green-400 text-xs sm:text-sm">
                      <CheckCircle className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1.5 sm:mr-2 flex-shrink-0" />
                      <span>You have read the complete document</span>
                    </div>
                  )}
                </div>
                <div className="flex gap-2 sm:gap-3 w-full sm:w-auto">
                  <button
                    onClick={() => onClose(false)}
                    className="flex-1 sm:flex-none px-4 py-2 text-sm font-medium border border-gray-600 text-gray-300 bg-navy-800 hover:bg-navy-700 rounded-lg transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleAccept}
                    disabled={!isScrolledToBottom}
                    className={`flex-1 sm:flex-none px-4 py-2 text-sm font-semibold rounded-lg transition-all ${
                      isScrolledToBottom 
                        ? 'bg-yellow-500 text-navy-900 hover:bg-yellow-600 shadow-md hover:shadow-lg' 
                        : 'bg-gray-600 text-gray-400 cursor-not-allowed'
                    }`}
                  >
                    Accept & Continue
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      )}
    </AnimatePresence>
  )
}

export default TermsModal 