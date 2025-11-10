import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Gift, User, Users } from 'lucide-react'

const RoleSelectionModal = ({ isOpen, onClose, onSelectRole, enabledRoles = ['donor', 'recipient', 'volunteer'] }) => {
  const [selectedRole, setSelectedRole] = useState(null)

  const allRoles = [
    {
      value: 'donor',
      label: 'Donor',
      description: 'Share items with those in need',
      icon: Gift,
      color: 'bg-green-900/30 border-green-700/30 text-green-300'
    },
    {
      value: 'recipient',
      label: 'Recipient',
      description: 'Find items you need',
      icon: User,
      color: 'bg-blue-900/30 border-blue-700/30 text-blue-300'
    },
    {
      value: 'volunteer',
      label: 'Volunteer',
      description: 'Help coordinate and deliver items',
      icon: Users,
      color: 'bg-purple-900/30 border-purple-700/30 text-purple-300'
    }
  ]

  // Filter roles based on enabled signup settings
  const roles = allRoles.filter(role => enabledRoles.includes(role.value))

  const handleContinue = () => {
    if (selectedRole) {
      onSelectRole(selectedRole)
      setSelectedRole(null) // Reset for next time
    }
  }

  const handleClose = () => {
    setSelectedRole(null)
    onClose()
  }

  if (!isOpen) return null

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleClose}
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative bg-gray-900 rounded-2xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto border border-gray-700"
          >
            {/* Header */}
            <div className="sticky top-0 bg-gray-900 border-b border-gray-700 px-6 py-4 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-white">Choose Your Role</h2>
                <p className="text-sm text-gray-400 mt-1">Select how you'd like to help</p>
              </div>
              <button
                onClick={handleClose}
                className="text-gray-400 hover:text-white transition-colors"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            {/* Content */}
            <div className="p-6 space-y-3">
              {roles.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-gray-400 mb-2">Signup is currently disabled for all roles.</p>
                  <p className="text-sm text-gray-500">Please contact the administrator for assistance.</p>
                </div>
              ) : (
                roles.map((role) => {
                const IconComponent = role.icon
                return (
                  <label key={role.value} className="cursor-pointer block">
                    <input
                      type="radio"
                      name="role"
                      value={role.value}
                      checked={selectedRole === role.value}
                      onChange={(e) => setSelectedRole(e.target.value)}
                      className="sr-only"
                    />
                    <div className={`
                      flex items-center p-4 rounded-lg border-2 transition-all
                      ${selectedRole === role.value 
                        ? 'border-yellow-500 bg-yellow-900/20 shadow-lg shadow-yellow-500/20' 
                        : 'border-gray-600 bg-gray-800 hover:border-gray-500 hover:bg-gray-750'
                      }
                    `}>
                      <IconComponent className="h-7 w-7 text-yellow-400 mr-4 flex-shrink-0" />
                      <div className="flex-1">
                        <h3 className="text-base font-semibold text-white">{role.label}</h3>
                        <p className="text-sm text-gray-400 mt-0.5">{role.description}</p>
                      </div>
                      {selectedRole === role.value && (
                        <div className="w-5 h-5 bg-yellow-500 rounded-full flex items-center justify-center ml-3 flex-shrink-0">
                          <div className="w-2.5 h-2.5 bg-white rounded-full"></div>
                        </div>
                      )}
                    </div>
                  </label>
                )
              }))}
            </div>

            {/* Footer */}
            <div className="sticky bottom-0 bg-gray-900 border-t border-gray-700 px-6 py-4 flex justify-end gap-3">
              <button
                onClick={handleClose}
                className="px-4 py-2 text-sm font-medium text-gray-300 bg-gray-700 rounded-lg hover:bg-gray-600 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleContinue}
                disabled={!selectedRole}
                className="px-6 py-2 text-sm font-medium text-white bg-yellow-600 rounded-lg hover:bg-yellow-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-yellow-600"
              >
                Continue with Google
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}

export default RoleSelectionModal

