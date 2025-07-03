import React from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowLeft, Heart, Shield, Eye, Lock, Database, Users } from 'lucide-react'

const PrivacyPolicyPage = () => {
  return (
    <div className="min-h-screen bg-navy-950 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center mb-8"
        >
          <img src="/hopelinklogo.png" alt="HopeLink" className="h-12 w-12 rounded mx-auto mb-4" />
          <h1 className="text-3xl font-bold text-white mb-2">Privacy Policy</h1>
          <p className="text-skyblue-300">Last updated: {new Date().toLocaleDateString()}</p>
        </motion.div>

        {/* Back Button */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="mb-6"
        >
          <Link
            to="/"
            className="inline-flex items-center text-primary-600 hover:text-primary-500 transition-colors"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Home
          </Link>
        </motion.div>

        {/* Content */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="bg-navy-900 rounded-lg shadow-lg p-8"
        >
          <div className="prose prose-invert max-w-none">
            
            {/* Introduction */}
            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-white mb-4 flex items-center">
                <Shield className="h-6 w-6 text-primary-600 mr-3" />
                Our Commitment to Privacy
              </h2>
              <p className="text-skyblue-200 leading-relaxed">
                At HopeLink, we are committed to protecting your privacy and ensuring the security of your 
                personal information. This Privacy Policy explains how we collect, use, disclose, and 
                safeguard your information when you use our platform.
              </p>
            </section>

            {/* Information We Collect */}
            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-white mb-4 flex items-center">
                <Database className="h-6 w-6 text-primary-600 mr-3" />
                Information We Collect
              </h2>
              
              <h3 className="text-xl font-semibold text-white mb-3">Personal Information</h3>
              <p className="text-skyblue-200 leading-relaxed mb-4">
                We collect information you provide directly to us when you:
              </p>
              <ul className="list-disc list-inside text-skyblue-200 space-y-2 ml-4 mb-4">
                <li>Create an account (name, email, phone number, address)</li>
                <li>Complete your profile (bio, organization details, preferences)</li>
                <li>Post donations or requests</li>
                <li>Communicate with other users through our platform</li>
                <li>Contact our support team</li>
              </ul>

              <h3 className="text-xl font-semibold text-white mb-3">Role-Specific Information</h3>
              <div className="space-y-4">
                <div className="p-4 bg-navy-800 rounded-lg">
                  <h4 className="text-lg font-medium text-white mb-2">For Donors:</h4>
                  <ul className="list-disc list-inside text-skyblue-200 space-y-1 ml-4">
                    <li>Account type (individual/business)</li>
                    <li>Donation preferences and history</li>
                    <li>Organization name and website (if applicable)</li>
                  </ul>
                </div>
                
                <div className="p-4 bg-navy-800 rounded-lg">
                  <h4 className="text-lg font-medium text-white mb-2">For Recipients:</h4>
                  <ul className="list-disc list-inside text-skyblue-200 space-y-1 ml-4">
                    <li>Household size and composition</li>
                    <li>Assistance needs and preferences</li>
                    <li>Emergency contact information</li>
                  </ul>
                </div>
                
                <div className="p-4 bg-navy-800 rounded-lg">
                  <h4 className="text-lg font-medium text-white mb-2">For Volunteers:</h4>
                  <ul className="list-disc list-inside text-skyblue-200 space-y-1 ml-4">
                    <li>Vehicle information and delivery capacity</li>
                    <li>Availability schedule</li>
                    <li>Volunteer experience and background check consent</li>
                  </ul>
                </div>
              </div>

              <h3 className="text-xl font-semibold text-white mb-3 mt-6">Automatically Collected Information</h3>
              <ul className="list-disc list-inside text-skyblue-200 space-y-2 ml-4">
                <li>Device information (IP address, browser type, operating system)</li>
                <li>Usage data (pages visited, time spent, interactions)</li>
                <li>Location data (if you enable location services)</li>
                <li>Cookies and similar tracking technologies</li>
              </ul>
            </section>

            {/* How We Use Information */}
            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-white mb-4 flex items-center">
                <Eye className="h-6 w-6 text-primary-600 mr-3" />
                How We Use Your Information
              </h2>
              
              <p className="text-skyblue-200 leading-relaxed mb-4">
                We use the information we collect to:
              </p>
              <ul className="list-disc list-inside text-skyblue-200 space-y-2 ml-4">
                <li>Provide, maintain, and improve our services</li>
                <li>Facilitate connections between donors, recipients, and volunteers</li>
                <li>Process and manage donations and requests</li>
                <li>Send notifications about platform activities and updates</li>
                <li>Provide customer support and respond to inquiries</li>
                <li>Ensure platform security and prevent fraud</li>
                <li>Analyze usage patterns to improve user experience</li>
                <li>Comply with legal obligations</li>
              </ul>
            </section>

            {/* Information Sharing */}
            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-white mb-4 flex items-center">
                <Users className="h-6 w-6 text-primary-600 mr-3" />
                Information Sharing and Disclosure
              </h2>
              
              <h3 className="text-xl font-semibold text-white mb-3">With Other Users</h3>
              <p className="text-skyblue-200 leading-relaxed mb-4">
                To facilitate donations and volunteer services, we share certain information with other users:
              </p>
              <ul className="list-disc list-inside text-skyblue-200 space-y-2 ml-4 mb-4">
                <li>Profile information (name, general location, contact preferences)</li>
                <li>Donation listings and requests</li>
                <li>Volunteer availability and capabilities</li>
                <li>Communication necessary for coordination</li>
              </ul>

              <h3 className="text-xl font-semibold text-white mb-3">With Third Parties</h3>
              <p className="text-skyblue-200 leading-relaxed mb-4">
                We may share information with third parties in the following circumstances:
              </p>
              <ul className="list-disc list-inside text-skyblue-200 space-y-2 ml-4">
                <li>With your explicit consent</li>
                <li>To comply with legal obligations or court orders</li>
                <li>To protect the rights, property, or safety of HopeLink, our users, or others</li>
                <li>With service providers who assist in operating our platform</li>
                <li>In connection with a business transfer or merger</li>
              </ul>
            </section>

            {/* Data Security */}
            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-white mb-4 flex items-center">
                <Lock className="h-6 w-6 text-primary-600 mr-3" />
                Data Security
              </h2>
              
              <p className="text-skyblue-200 leading-relaxed mb-4">
                We implement appropriate technical and organizational measures to protect your personal 
                information against unauthorized access, alteration, disclosure, or destruction:
              </p>
              <ul className="list-disc list-inside text-skyblue-200 space-y-2 ml-4">
                <li>Encryption of data in transit and at rest</li>
                <li>Regular security assessments and updates</li>
                <li>Access controls and authentication mechanisms</li>
                <li>Secure hosting infrastructure</li>
                <li>Employee training on data protection</li>
              </ul>
              
              <p className="text-skyblue-200 leading-relaxed mt-4">
                However, no method of transmission over the internet or electronic storage is 100% secure. 
                While we strive to protect your information, we cannot guarantee absolute security.
              </p>
            </section>

            {/* Your Rights */}
            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-white mb-4">Your Privacy Rights</h2>
              
              <p className="text-skyblue-200 leading-relaxed mb-4">
                You have the following rights regarding your personal information:
              </p>
              <ul className="list-disc list-inside text-skyblue-200 space-y-2 ml-4">
                <li><strong>Access:</strong> Request a copy of the personal information we hold about you</li>
                <li><strong>Correction:</strong> Request correction of inaccurate or incomplete information</li>
                <li><strong>Deletion:</strong> Request deletion of your personal information</li>
                <li><strong>Portability:</strong> Request transfer of your data to another service</li>
                <li><strong>Restriction:</strong> Request limitation of processing of your information</li>
                <li><strong>Objection:</strong> Object to processing of your information for certain purposes</li>
                <li><strong>Withdrawal:</strong> Withdraw consent for processing where applicable</li>
              </ul>
              
              <p className="text-skyblue-200 leading-relaxed mt-4">
                To exercise these rights, please contact us using the information provided at the end of this policy.
              </p>
            </section>

            {/* Data Retention */}
            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-white mb-4">Data Retention</h2>
              <p className="text-skyblue-200 leading-relaxed">
                We retain your personal information for as long as necessary to provide our services, 
                comply with legal obligations, resolve disputes, and enforce our agreements. When you 
                delete your account, we will delete or anonymize your personal information, except where 
                retention is required by law.
              </p>
            </section>

            {/* Cookies */}
            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-white mb-4">Cookies and Tracking</h2>
              <p className="text-skyblue-200 leading-relaxed mb-4">
                We use cookies and similar technologies to enhance your experience on our platform:
              </p>
              <ul className="list-disc list-inside text-skyblue-200 space-y-2 ml-4">
                <li><strong>Essential cookies:</strong> Required for basic platform functionality</li>
                <li><strong>Performance cookies:</strong> Help us understand how you use our platform</li>
                <li><strong>Functional cookies:</strong> Remember your preferences and settings</li>
              </ul>
              
              <p className="text-skyblue-200 leading-relaxed mt-4">
                You can control cookie settings through your browser preferences, though this may affect 
                platform functionality.
              </p>
            </section>

            {/* Children's Privacy */}
            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-white mb-4">Children's Privacy</h2>
              <p className="text-skyblue-200 leading-relaxed">
                Our platform is not intended for use by children under 13 years of age. We do not 
                knowingly collect personal information from children under 13. If we become aware that 
                we have collected such information, we will take steps to delete it promptly.
              </p>
            </section>

            {/* International Transfers */}
            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-white mb-4">International Data Transfers</h2>
              <p className="text-skyblue-200 leading-relaxed">
                Your information may be processed and stored in countries other than the Philippines. 
                We ensure that such transfers are conducted in accordance with applicable data protection 
                laws and with appropriate safeguards in place.
              </p>
            </section>

            {/* Changes to Policy */}
            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-white mb-4">Changes to This Privacy Policy</h2>
              <p className="text-skyblue-200 leading-relaxed">
                We may update this Privacy Policy from time to time. We will notify you of any material 
                changes by posting the new Privacy Policy on this page with an updated date. We encourage 
                you to review this Privacy Policy periodically.
              </p>
            </section>

            {/* Contact Information */}
            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-white mb-4">Contact Us</h2>
              <p className="text-skyblue-200 leading-relaxed mb-4">
                If you have any questions about this Privacy Policy or our privacy practices, please contact us:
              </p>
              <div className="p-4 bg-navy-800 rounded-lg">
                <p className="text-white font-medium">HopeLink Privacy Officer</p>
                <p className="text-skyblue-300">Email: privacy@hopelink.ph</p>
                <p className="text-skyblue-300">Support: support@hopelink.ph</p>
                <p className="text-skyblue-300">Address: Cagayan de Oro City, Philippines</p>
              </div>
              
              <p className="text-skyblue-200 leading-relaxed mt-4">
                We will respond to your inquiry within 30 days of receipt.
              </p>
            </section>

          </div>
        </motion.div>

        {/* Footer Navigation */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="mt-8 text-center"
        >
          <div className="flex justify-center space-x-6">
            <Link
              to="/terms"
              className="text-primary-400 hover:text-primary-300 transition-colors"
            >
              Terms of Service
            </Link>
            <Link
              to="/signup"
              className="text-primary-400 hover:text-primary-300 transition-colors"
            >
              Create Account
            </Link>
            <Link
              to="/login"
              className="text-primary-400 hover:text-primary-300 transition-colors"
            >
              Sign In
            </Link>
          </div>
        </motion.div>
      </div>
    </div>
  )
}

export default PrivacyPolicyPage 