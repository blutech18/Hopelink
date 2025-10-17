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
          <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
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
              className="inline-block w-full max-w-4xl p-6 my-8 overflow-hidden text-left align-middle transition-all transform bg-navy-900 border border-navy-700 shadow-xl rounded-lg relative"
            >
              {/* Header */}
              <div className="flex items-center justify-between mb-6 border-b border-navy-700 pb-4">
                <div className="flex items-center">
                  <ScrollText className="h-6 w-6 text-skyblue-500 mr-3" />
                  <h3 className="text-xl font-semibold text-white">
                    {title}
                  </h3>
                </div>
                <button
                  onClick={() => onClose(false)}
                  className="text-skyblue-400 hover:text-white transition-colors p-2 hover:bg-navy-800 rounded-lg"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Scroll instruction */}
              {!isScrolledToBottom && (
                <div className="mb-4 p-3 bg-amber-900/30 border border-amber-700/50 rounded-lg">
                  <p className="text-amber-300 text-sm">
                    📄 Please scroll to the bottom to read the complete {title.toLowerCase()} before continuing.
                  </p>
                </div>
              )}

              {/* Content */}
              <div 
                ref={contentRef}
                className="max-h-96 overflow-y-auto pr-2 custom-scrollbar"
                onScroll={handleScroll}
              >
                <div className="text-skyblue-200 text-sm leading-relaxed">
                  {children}
                </div>
              </div>

              {/* Footer */}
              <div className="mt-6 pt-4 border-t border-navy-700 flex justify-between items-center">
                <div className="flex items-center">
                  {isScrolledToBottom && (
                    <div className="flex items-center text-green-400 text-sm">
                      <CheckCircle className="h-4 w-4 mr-2" />
                      <span>You have read the complete document</span>
                    </div>
                  )}
                </div>
                <div className="flex space-x-3">
                  <button
                    onClick={() => onClose(false)}
                    className="btn border border-gray-600 text-gray-400 bg-navy-800 hover:bg-navy-700"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleAccept}
                    disabled={!isScrolledToBottom}
                    className={`btn ${
                      isScrolledToBottom 
                        ? 'btn-primary hover:bg-skyblue-700' 
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