import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Info, ArrowRight, CheckCircle2, Heart } from 'lucide-react'
import WorkflowProgressBar from './WorkflowProgressBar'

const WorkflowGuideModal = ({ isOpen, onClose, userRole = 'donor' }) => {
  const [selectedStatus, setSelectedStatus] = useState('available')

  const statusExplanations = {
    donor: {
      available: {
        title: 'Available Status',
        description: 'Your donation has been posted and is now visible to recipients in the community.',
        value: 'Your donation is now helping the matching algorithm find recipients who need it most. This typically takes 24-48 hours.',
        nextSteps: [
          'Wait for the smart matching algorithm to find suitable recipients',
          'You may receive notifications when recipients show interest',
          'Your donation will be matched based on location, need, and compatibility'
        ],
        tips: [
          'Keep your donation details updated for better matching',
          'Respond promptly to recipient inquiries',
          'You can edit or cancel the donation if needed'
        ]
      },
      matched: {
        title: 'Matched Status',
        description: 'Our intelligent matching system has found potential recipients for your donation.',
        value: 'Your donation is now matched with recipients who need it. This means your generosity will reach those who need it most, typically helping 2-4 families.',
        nextSteps: [
          'Review the matched recipients and their requests',
          'The system considers location, urgency, and compatibility',
          'Recipients will be notified about your donation'
        ],
        tips: [
          'You can see why recipients were matched in the details',
          'Multiple recipients may be matched to your donation',
          'The best match will be highlighted'
        ]
      },
      claimed: {
        title: 'Claimed Status',
        description: 'A recipient has claimed your donation. The delivery process will begin soon.',
        value: 'Your donation is making an impact! A recipient has claimed it, meaning your generosity is directly helping someone in need. Delivery typically happens within 24-48 hours.',
        nextSteps: [
          'A volunteer will be assigned to pick up your donation',
          'You\'ll receive notifications about delivery progress',
          'Prepare the donation for pickup at the specified location'
        ],
        tips: [
          'Ensure the donation is ready when the volunteer arrives',
          'You can communicate with the recipient if needed',
          'Track the delivery progress in real-time'
        ]
      },
      in_transit: {
        title: 'In Transit Status',
        description: 'A volunteer has picked up your donation and is delivering it to the recipient.',
        value: 'Your donation is on its way! A verified volunteer is delivering it, saving the recipient 2-4 hours of searching and transportation time.',
        nextSteps: [
          'Track the delivery in real-time',
          'You\'ll receive updates when the volunteer picks up the donation',
          'Wait for delivery confirmation from the recipient'
        ],
        tips: [
          'You can view the delivery route and estimated arrival time',
          'Contact the volunteer if you have any concerns',
          'The recipient will confirm receipt when delivered'
        ]
      },
      delivered: {
        title: 'Delivered Status',
        description: 'Your donation has been successfully delivered to the recipient.',
        value: 'Success! Your donation has reached the recipient. Your generosity has helped someone in need and strengthened community connections.',
        nextSteps: [
          'Wait for recipient confirmation',
          'Once confirmed, you can provide feedback',
          'The transaction will be marked as completed'
        ],
        tips: [
          'Recipients typically confirm within 24 hours',
          'You can rate the recipient and volunteer experience',
          'Your donation impact will be recorded'
        ]
      },
      completed: {
        title: 'Completed Status',
        description: 'The transaction has been completed successfully. All parties have confirmed.',
        value: 'Impact achieved! Your donation has been confirmed and your impact recorded. You\'ve helped a family in need and created lasting community value.',
        nextSteps: [
          'Provide feedback about your experience',
          'View your donation history and impact',
          'Consider posting another donation to help more people'
        ],
        tips: [
          'Your feedback helps improve the platform',
          'See how many people you\'ve helped in your dashboard',
          'Share your experience to encourage others to donate'
        ]
      }
    },
    recipient: {
      available: {
        title: 'Available Status',
        description: 'Your request has been posted and is visible to donors in the community.',
        value: 'Your request is now visible to verified donors. Verified requests get matched 3x faster, typically within 24-48 hours.',
        nextSteps: [
          'Wait for the matching algorithm to find suitable donations',
          'You may receive notifications when donations match your request',
          'Browse available donations that match your needs'
        ],
        tips: [
          'Keep your request details updated',
          'Complete your profile verification for better matching',
          'You can edit or cancel the request if needed'
        ]
      },
      matched: {
        title: 'Matched Status',
        description: 'Our system has found donations that match your request.',
        value: 'Great news! Donations matching your request have been found. This saves you 2-4 hours of searching and helps you get what you need faster.',
        nextSteps: [
          'Review the matched donations',
          'Check donor verification status',
          'Claim the donation that best fits your needs'
        ],
        tips: [
          'Verified donors are highlighted',
          'You can see why donations were matched',
          'Multiple donations may be available'
        ]
      },
      claimed: {
        title: 'Claimed Status',
        description: 'You have successfully claimed a donation. Delivery will be arranged.',
        value: 'Success! You\'ve claimed a donation. A volunteer will deliver it to you, saving you time and transportation costs. Delivery typically happens within 24-48 hours.',
        nextSteps: [
          'A volunteer will be assigned to deliver your donation',
          'You\'ll receive notifications about delivery progress',
          'Prepare to receive the donation at your specified location'
        ],
        tips: [
          'Ensure someone is available to receive the donation',
          'You can communicate with the donor and volunteer',
          'Track the delivery progress in real-time'
        ]
      },
      in_transit: {
        title: 'In Transit Status',
        description: 'A volunteer is delivering your donation. It\'s on the way!',
        value: 'Your donation is on its way! A verified volunteer is delivering it directly to you, saving you time and money on transportation.',
        nextSteps: [
          'Track the delivery in real-time',
          'You\'ll receive updates on the delivery progress',
          'Be ready to receive the donation when it arrives'
        ],
        tips: [
          'You can view the delivery route and estimated arrival',
          'Contact the volunteer if you need to change the delivery time',
          'Confirm receipt when the donation arrives'
        ]
      },
      delivered: {
        title: 'Delivered Status',
        description: 'Your donation has been delivered. Please confirm receipt.',
        value: 'Your donation has arrived! Please confirm receipt to complete the transaction. You\'ve saved time and money by using HopeLink.',
        nextSteps: [
          'Inspect the donation to ensure it matches the description',
          'Confirm receipt in the delivery confirmation modal',
          'Provide feedback about your experience'
        ],
        tips: [
          'Confirm receipt within 24 hours if everything is correct',
          'Report any issues immediately',
          'Your feedback helps improve the platform'
        ]
      },
      completed: {
        title: 'Completed Status',
        description: 'The transaction has been completed. You have received your donation.',
        value: 'Transaction complete! You\'ve received your donation and saved time and money. Your feedback helps build community trust.',
        nextSteps: [
          'Provide feedback about your experience',
          'Thank the donor and volunteer',
          'Update your request status if you need more items'
        ],
        tips: [
          'Your feedback helps build trust in the community',
          'Consider creating new requests for other needs',
          'Share your positive experience with others'
        ]
      }
    },
    volunteer: {
      available: {
        title: 'Available Status',
        description: 'Delivery tasks are available in your area. Browse and accept tasks that fit your schedule.',
        value: 'Delivery tasks are waiting! Each task you complete helps 1-2 families and saves recipients 2-4 hours of time.',
        nextSteps: [
          'Browse available delivery tasks',
          'Check distance, route, and item details',
          'Accept tasks that fit your capacity and schedule'
        ],
        tips: [
          'Respect your capacity limits',
          'Check your schedule before accepting',
          'Multiple tasks can be accepted if you have capacity'
        ]
      },
      matched: {
        title: 'Matched Status',
        description: 'You have been matched with a delivery task based on your location and availability.',
        value: 'You\'ve been matched with a delivery task! Your service will help connect a donor with a recipient, creating immediate community impact.',
        nextSteps: [
          'Review the delivery details',
          'Confirm pickup and delivery locations',
          'Accept the task to begin delivery'
        ],
        tips: [
          'Verify the pickup and delivery addresses',
          'Check item details and special instructions',
          'Contact donor/recipient if you have questions'
        ]
      },
      claimed: {
        title: 'Claimed Status',
        description: 'You have accepted the delivery task. Prepare to pick up the donation.',
        value: 'You\'ve accepted a delivery task! Your service helps connect donors with recipients, creating immediate community impact.',
        nextSteps: [
          'Contact the donor to arrange pickup time',
          'Navigate to the pickup location',
          'Update status when you pick up the donation'
        ],
        tips: [
          'Confirm pickup time with the donor',
          'Bring necessary equipment for the items',
          'Update status to "in_transit" after pickup'
        ]
      },
      in_transit: {
        title: 'In Transit Status',
        description: 'You have picked up the donation and are delivering it to the recipient.',
        value: 'You\'re making a difference! Your delivery is saving the recipient time and money, and connecting them with community support.',
        nextSteps: [
          'Navigate to the recipient\'s location',
          'Update delivery status as you progress',
          'Contact recipient when you\'re close to arrival'
        ],
        tips: [
          'Use the navigation feature for optimal routes',
          'Keep all parties updated on your progress',
          'Mark as "delivered" when you arrive'
        ]
      },
      delivered: {
        title: 'Delivered Status',
        description: 'You have successfully delivered the donation to the recipient.',
        value: 'Delivery complete! You\'ve successfully connected a donor with a recipient, creating positive community impact.',
        nextSteps: [
          'Wait for recipient confirmation',
          'Get confirmation from the recipient',
          'Complete the delivery and provide feedback'
        ],
        tips: [
          'Ensure the recipient is satisfied',
          'Get delivery confirmation signature if needed',
          'Your feedback helps improve matching'
        ]
      },
      completed: {
        title: 'Completed Status',
        description: 'The delivery has been completed and confirmed by all parties.',
        value: 'Impact achieved! You\'ve completed another delivery and helped connect the community. Your service builds trust and strengthens neighborhoods.',
        nextSteps: [
          'Provide feedback about the experience',
          'View your delivery history and statistics',
          'Accept new delivery tasks to help more people'
        ],
        tips: [
          'Your delivery count and rating will be updated',
          'See your impact in the volunteer dashboard',
          'Maintain your availability for future tasks'
        ]
      }
    }
  }

  const explanations = statusExplanations[userRole] || statusExplanations.donor
  const currentExplanation = explanations[selectedStatus] || explanations.available

  if (!isOpen) return null

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 overflow-hidden">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-black/60 backdrop-blur-md"
          onClick={onClose}
        />

        {/* Modal */}
        <div className="absolute inset-0 flex items-center justify-center p-3 sm:p-5">
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            onClick={(e) => e.stopPropagation()}
            className="relative z-10 w-full max-w-5xl max-h-[88vh] overflow-y-auto"
          >
            {/* Glass Container */}
            <div className="relative rounded-2xl overflow-hidden">
              <div 
                className="backdrop-blur-xl bg-gradient-to-br from-navy-900/90 via-navy-800/85 to-navy-900/90"
                style={{
                  background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.9) 0%, rgba(30, 41, 59, 0.85) 50%, rgba(15, 23, 42, 0.9) 100%)',
                  backdropFilter: 'blur(20px) saturate(180%)',
                  WebkitBackdropFilter: 'blur(20px) saturate(180%)'
                }}
              >
                {/* Border glow */}
                <div className="absolute inset-0 rounded-2xl border-2 border-yellow-400/40 shadow-[0_0_30px_rgba(250,204,21,0.3)]" />
                
                <div className="relative">
                  {/* Header */}
                  <div className="flex items-center justify-between px-5 py-4 sm:px-6 sm:py-4 border-b border-yellow-400/20 bg-gradient-to-r from-yellow-500/5 to-transparent">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-yellow-400/20 border border-yellow-400/30">
                        <Info className="h-6 w-6 text-yellow-400" />
                      </div>
                      <div>
                        <h3 className="text-lg sm:text-xl font-bold text-white">Workflow Guide</h3>
                        <p className="text-xs text-yellow-300/80 mt-0.5">
                          {userRole === 'recipient' 
                            ? 'Understand the request process' 
                            : userRole === 'volunteer'
                            ? 'Understand the delivery process'
                            : 'Understand the donation process'}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={onClose}
                      className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition-all duration-200"
                    >
                      <X className="h-5 w-5" />
                    </button>
                  </div>

                  {/* Content */}
                  <div className="p-5 sm:p-6">
                    {/* Workflow Visualization */}
                    <div className="mb-6 sm:mb-7">
                      <h4 className="text-base sm:text-lg font-semibold text-white mb-3">Complete Workflow</h4>
                      <div className="bg-navy-800/30 rounded-xl p-4 sm:p-5 border border-navy-700/50">
                        <WorkflowProgressBar 
                          status={selectedStatus} 
                          showLabels={true}
                          size="md"
                        />
                      </div>
                    </div>

                    {/* Status Selector */}
                    <div className="mb-5">
                      <h4 className="text-base sm:text-lg font-semibold text-white mb-3">Select Status to Learn More</h4>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                        {Object.keys(explanations).map((status) => (
                          <button
                            key={status}
                            onClick={() => setSelectedStatus(status)}
                            className={`px-4 py-2 rounded-lg font-medium text-sm transition-all ${
                              selectedStatus === status
                                ? 'bg-yellow-500 text-navy-950 shadow-lg shadow-yellow-500/30'
                                : 'bg-navy-800/50 text-gray-300 hover:bg-navy-700/70 border border-navy-700'
                            }`}
                          >
                            {explanations[status].title.replace(' Status', '')}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Status Explanation section removed per UX simplification request */}
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

export default WorkflowGuideModal


