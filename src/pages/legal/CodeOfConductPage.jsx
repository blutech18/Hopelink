import React from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowLeft, Users, Heart, Shield, AlertTriangle, CheckCircle, XCircle, Flag } from 'lucide-react'

const CodeOfConductPage = () => {
  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative text-white py-20" style={{backgroundColor: '#00237d'}}>
        {/* Back Button */}
        <div className="absolute top-4 left-4 z-10">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
          >
            <Link
              to="/"
              className="inline-flex items-center text-yellow-400 hover:text-yellow-300 transition-colors bg-black/20 backdrop-blur-sm rounded-lg px-3 py-2"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Home
            </Link>
          </motion.div>
        </div>
        
        <div className="w-full px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center max-w-4xl mx-auto"
          >
            <img src="/hopelinklogo.png" alt="HopeLink" className="h-16 rounded mx-auto mb-6" />
            <h1 className="text-4xl font-bold text-white mb-4">Code of Conduct</h1>
            <p className="text-xl text-yellow-200 mb-6">Last updated: {new Date().toLocaleDateString()}</p>
            <p className="text-lg text-yellow-200 max-w-2xl mx-auto">
              Our commitment to creating a safe, respectful, and inclusive community for all HopeLink users.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Our Commitment Section */}
      <section className="py-16 text-white" style={{backgroundColor: '#001a5c'}}>
        <div className="w-full px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="max-w-6xl mx-auto"
          >
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold text-white mb-6 flex items-center justify-center">
                <Heart className="h-8 w-8 text-yellow-400 mr-3" />
                Our Commitment
              </h2>
              <p className="text-lg text-yellow-200 max-w-3xl mx-auto">
                HopeLink is built on the foundation of kindness, respect, and community support. 
                We believe that every interaction should reflect our shared values of compassion, 
                dignity, and mutual respect.
              </p>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Expected Behavior Section */}
      <section className="py-16 text-white" style={{backgroundColor: '#00237d'}}>
        <div className="w-full px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="max-w-6xl mx-auto"
          >
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold text-white mb-6 flex items-center justify-center">
                <CheckCircle className="h-8 w-8 text-green-400 mr-3" />
                Expected Behavior
              </h2>
              <p className="text-lg text-yellow-200 max-w-2xl mx-auto">
                We expect all community members to uphold these standards in all interactions.
              </p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <div className="bg-white/10 rounded-lg p-6">
                <h3 className="text-xl font-semibold text-white mb-4 flex items-center">
                  <Heart className="h-5 w-5 text-green-400 mr-2" />
                  Respect and Kindness
                </h3>
                <ul className="list-disc list-outside text-yellow-200 space-y-2 ml-6">
                  <li>Treat all community members with dignity and respect</li>
                  <li>Use inclusive language that welcomes everyone</li>
                  <li>Be patient and understanding of different circumstances</li>
                  <li>Offer help and support when possible</li>
                  <li>Listen actively and consider others' perspectives</li>
                </ul>
              </div>
              
              <div className="bg-white/10 rounded-lg p-6">
                <h3 className="text-xl font-semibold text-white mb-4 flex items-center">
                  <Shield className="h-5 w-5 text-blue-400 mr-2" />
                  Safety and Security
                </h3>
                <ul className="list-disc list-outside text-yellow-200 space-y-2 ml-6">
                  <li>Provide accurate information about items and services</li>
                  <li>Maintain the safety and security of all interactions</li>
                  <li>Respect privacy and personal boundaries</li>
                  <li>Report suspicious or concerning behavior immediately</li>
                  <li>Follow all local laws and regulations</li>
                </ul>
              </div>
              
              <div className="bg-white/10 rounded-lg p-6">
                <h3 className="text-xl font-semibold text-white mb-4 flex items-center">
                  <Users className="h-5 w-5 text-purple-400 mr-2" />
                  Community Spirit
                </h3>
                <ul className="list-disc list-outside text-yellow-200 space-y-2 ml-6">
                  <li>Participate constructively in community discussions</li>
                  <li>Share knowledge and resources generously</li>
                  <li>Celebrate the diversity of our community</li>
                  <li>Help maintain a positive environment for everyone</li>
                  <li>Support others in their time of need</li>
                </ul>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Prohibited Behavior Section */}
      <section className="py-16 text-white" style={{backgroundColor: '#001a5c'}}>
        <div className="w-full px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="max-w-6xl mx-auto"
          >
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold text-white mb-6 flex items-center justify-center">
                <XCircle className="h-8 w-8 text-red-400 mr-3" />
                Prohibited Behavior
              </h2>
              <p className="text-lg text-yellow-200 max-w-2xl mx-auto">
                The following behaviors are strictly prohibited and will result in immediate action.
              </p>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div className="bg-white/10 rounded-lg p-6">
                <h3 className="text-xl font-semibold text-white mb-4">Discrimination and Harassment</h3>
                <ul className="list-disc list-outside text-yellow-200 space-y-2 ml-6">
                  <li>Discrimination based on race, ethnicity, gender, religion, age, disability, or sexual orientation</li>
                  <li>Harassment, bullying, or intimidation of any kind</li>
                  <li>Hate speech or inflammatory language</li>
                  <li>Threats of violence or harm</li>
                  <li>Stalking or unwanted persistent contact</li>
                  <li>Inappropriate sexual advances or comments</li>
                </ul>
              </div>
              
              <div className="bg-white/10 rounded-lg p-6">
                <h3 className="text-xl font-semibold text-white mb-4">Fraud and Misconduct</h3>
                <ul className="list-disc list-outside text-yellow-200 space-y-2 ml-6">
                  <li>Providing false information about items or services</li>
                  <li>Attempting to defraud other users</li>
                  <li>Creating fake accounts or impersonating others</li>
                  <li>Spam, unsolicited advertising, or promotional content</li>
                  <li>Abusing the platform for commercial purposes without authorization</li>
                  <li>Violating intellectual property rights</li>
                </ul>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Reporting and Enforcement Section */}
      <section className="py-16 text-white" style={{backgroundColor: '#00237d'}}>
        <div className="w-full px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.5 }}
            className="max-w-6xl mx-auto"
          >
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold text-white mb-6 flex items-center justify-center">
                <Flag className="h-8 w-8 text-yellow-400 mr-3" />
                Reporting and Enforcement
              </h2>
              <p className="text-lg text-yellow-200 max-w-2xl mx-auto">
                We take violations seriously and have clear procedures for reporting and addressing misconduct.
              </p>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div className="bg-white/10 rounded-lg p-6">
                <h3 className="text-xl font-semibold text-white mb-4">How to Report</h3>
                <p className="text-yellow-200 mb-4">
                  If you witness or experience behavior that violates this Code of Conduct:
                </p>
                <ul className="list-disc list-outside text-yellow-200 space-y-2 ml-6">
                  <li>Use the "Report" button on any user profile or content</li>
                  <li>Contact our support team directly at support@hopelink.ph</li>
                  <li>Include as much detail as possible about the incident</li>
                  <li>Provide screenshots or evidence if available</li>
                  <li>Report immediately - don't wait or hesitate</li>
                </ul>
                <div className="mt-4 p-4 bg-green-400/20 rounded-lg">
                  <p className="text-yellow-200 text-sm">
                    <strong>Remember:</strong> All reports are taken seriously and handled confidentially.
                  </p>
                </div>
              </div>
              
              <div className="bg-white/10 rounded-lg p-6">
                <h3 className="text-xl font-semibold text-white mb-4">Enforcement Actions</h3>
                <p className="text-yellow-200 mb-4">
                  Depending on the severity and nature of the violation, we may take these actions:
                </p>
                <ul className="list-disc list-outside text-yellow-200 space-y-2 ml-6">
                  <li><strong>Warning:</strong> First-time minor violations may result in a warning</li>
                  <li><strong>Content Removal:</strong> Inappropriate content will be removed immediately</li>
                  <li><strong>Temporary Suspension:</strong> Users may be temporarily restricted from the platform</li>
                  <li><strong>Permanent Ban:</strong> Severe violations result in permanent account termination</li>
                  <li><strong>Legal Action:</strong> We may involve law enforcement for criminal behavior</li>
                </ul>
                <div className="mt-4 p-4 bg-red-400/20 rounded-lg">
                  <p className="text-yellow-200 text-sm">
                    <strong>Note:</strong> We reserve the right to take immediate action for severe violations.
                  </p>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Appeal Process Section */}
      <section className="py-16 text-white" style={{backgroundColor: '#001a5c'}}>
        <div className="w-full px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.6 }}
            className="max-w-6xl mx-auto"
          >
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold text-white mb-6 flex items-center justify-center">
                <AlertTriangle className="h-8 w-8 text-yellow-400 mr-3" />
                Appeal Process
              </h2>
              <p className="text-lg text-yellow-200 max-w-2xl mx-auto">
                If you believe an enforcement action was taken in error, you have the right to appeal.
              </p>
            </div>
            
            <div className="bg-white/10 rounded-lg p-8 max-w-4xl mx-auto">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div>
                  <h3 className="text-xl font-semibold text-white mb-4">How to Appeal</h3>
                  <ul className="list-disc list-outside text-yellow-200 space-y-2 ml-6">
                    <li>Submit your appeal within 30 days of the enforcement action</li>
                    <li>Send detailed explanation to appeals@hopelink.ph</li>
                    <li>Include any evidence that supports your case</li>
                    <li>Be honest and take responsibility where appropriate</li>
                    <li>Demonstrate understanding of the violated policy</li>
                  </ul>
                </div>
                
                <div>
                  <h3 className="text-xl font-semibold text-white mb-4">Review Process</h3>
                  <ul className="list-disc list-outside text-yellow-200 space-y-2 ml-6">
                    <li>All appeals are reviewed by our moderation team</li>
                    <li>We consider the circumstances and context</li>
                    <li>Previous violations and user history are evaluated</li>
                    <li>Decisions are typically made within 7-14 days</li>
                    <li>You will receive a written explanation of the decision</li>
                  </ul>
                </div>
              </div>
              
              <div className="mt-8 p-4 bg-yellow-400/20 rounded-lg">
                <p className="text-yellow-200 text-sm">
                  <strong>Fair Process:</strong> We are committed to fair and impartial review of all appeals. 
                  Our goal is to maintain community standards while being understanding of individual circumstances.
                </p>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Community Guidelines Section */}
      <section className="py-16 text-white" style={{backgroundColor: '#00237d'}}>
        <div className="w-full px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.7 }}
            className="max-w-6xl mx-auto"
          >
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold text-white mb-6 flex items-center justify-center">
                <Users className="h-8 w-8 text-yellow-400 mr-3" />
                Community Guidelines
              </h2>
              <p className="text-lg text-yellow-200 max-w-2xl mx-auto">
                Additional guidelines to help maintain a positive community environment.
              </p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <div className="bg-white/10 rounded-lg p-6">
                <h3 className="text-xl font-semibold text-white mb-4">Communication</h3>
                <ul className="list-disc list-outside text-yellow-200 space-y-2 ml-6">
                  <li>Be clear and honest in all communications</li>
                  <li>Respond to messages in a timely manner</li>
                  <li>Use appropriate language for the platform</li>
                  <li>Respect others' communication preferences</li>
                  <li>Keep personal information private</li>
                </ul>
              </div>
              
              <div className="bg-white/10 rounded-lg p-6">
                <h3 className="text-xl font-semibold text-white mb-4">Donations and Requests</h3>
                <ul className="list-disc list-outside text-yellow-200 space-y-2 ml-6">
                  <li>Provide accurate descriptions of items</li>
                  <li>Include clear photos when possible</li>
                  <li>Be specific about condition and availability</li>
                  <li>Follow through on commitments</li>
                  <li>Update listings when items are no longer available</li>
                </ul>
              </div>
              
              <div className="bg-white/10 rounded-lg p-6">
                <h3 className="text-xl font-semibold text-white mb-4">Volunteer Services</h3>
                <ul className="list-disc list-outside text-yellow-200 space-y-2 ml-6">
                  <li>Only commit to tasks you can complete</li>
                  <li>Arrive on time for scheduled activities</li>
                  <li>Communicate any schedule changes promptly</li>
                  <li>Follow safety guidelines and protocols</li>
                  <li>Respect the dignity of those you're helping</li>
                </ul>
              </div>
            </div>
          </motion.div>
        </div>
      </section>
    </div>
  )
}

export default CodeOfConductPage
