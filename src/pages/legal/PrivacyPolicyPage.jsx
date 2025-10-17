import React from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowLeft, Shield, Eye, Lock, Database, Users } from 'lucide-react'

const PrivacyPolicyPage = () => {
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
            <h1 className="text-4xl font-bold text-white mb-4">Privacy Policy</h1>
            <p className="text-xl text-yellow-200 mb-6">Last updated: {new Date().toLocaleDateString()}</p>
            <p className="text-lg text-yellow-200 max-w-2xl mx-auto">
              Your privacy is important to us. This policy explains how we collect, use, and protect your information.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Introduction Section */}
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
                <Shield className="h-8 w-8 text-yellow-400 mr-3" />
                Our Commitment to Privacy
              </h2>
              <p className="text-lg text-yellow-200 leading-relaxed max-w-3xl mx-auto">
                At HopeLink, we are committed to protecting your privacy and ensuring the security of your 
                personal information. This Privacy Policy explains how we collect, use, disclose, and 
                safeguard your information when you use our platform.
              </p>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Information Collection Section */}
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
                <Database className="h-8 w-8 text-yellow-400 mr-3" />
                Information We Collect
              </h2>
              <p className="text-lg text-yellow-200 max-w-2xl mx-auto">
                We collect information to provide and improve our services while respecting your privacy.
              </p>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="bg-white/10 rounded-lg p-6">
                <h3 className="text-xl font-semibold text-white mb-4">Personal Information</h3>
                <p className="text-yellow-200 mb-4">
                  We collect information you provide directly to us when you:
                </p>
                <ul className="list-disc list-outside text-yellow-200 space-y-2 ml-6">
                  <li>Create an account (name, email, phone number, address)</li>
                  <li>Complete your profile (bio, organization details, preferences)</li>
                  <li>Post donations or requests</li>
                  <li>Communicate with other users through our platform</li>
                  <li>Contact our support team</li>
                </ul>
              </div>

              <div className="bg-white/10 rounded-lg p-6">
                <h3 className="text-xl font-semibold text-white mb-4">Role-Specific Data</h3>
                <div className="space-y-4">
                  <div>
                    <h4 className="text-base font-medium text-white mb-2">For Donors:</h4>
                    <ul className="list-disc list-outside text-yellow-200 space-y-1 text-sm ml-6">
                      <li>Account type (individual/business)</li>
                      <li>Donation preferences and history</li>
                      <li>Organization details (if applicable)</li>
                    </ul>
                  </div>
                  <div>
                    <h4 className="text-base font-medium text-white mb-2">For Recipients:</h4>
                    <ul className="list-disc list-outside text-yellow-200 space-y-1 text-sm ml-6">
                      <li>Household size and composition</li>
                      <li>Assistance needs and preferences</li>
                      <li>Emergency contact information</li>
                    </ul>
                  </div>
                  <div>
                    <h4 className="text-base font-medium text-white mb-2">For Volunteers:</h4>
                    <ul className="list-disc list-outside text-yellow-200 space-y-1 text-sm ml-6">
                      <li>Vehicle information and delivery capacity</li>
                      <li>Availability schedule</li>
                      <li>Volunteer experience and background check consent</li>
                    </ul>
                  </div>
                </div>
              </div>

              <div className="bg-white/10 rounded-lg p-6">
                <h3 className="text-xl font-semibold text-white mb-4">Automatically Collected</h3>
                <p className="text-yellow-200 mb-4">
                  We automatically collect certain information when you use our platform:
                </p>
                <ul className="list-disc list-outside text-yellow-200 space-y-2 ml-6">
                  <li>Device information (IP address, browser type, operating system)</li>
                  <li>Usage data (pages visited, time spent, interactions)</li>
                  <li>Location data (if you enable location services)</li>
                  <li>Cookies and similar tracking technologies</li>
                </ul>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* How We Use Information Section */}
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
                <Eye className="h-8 w-8 text-yellow-400 mr-3" />
                How We Use Your Information
              </h2>
              <p className="text-lg text-yellow-200 max-w-2xl mx-auto">
                We use your information responsibly to provide and improve our services.
              </p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white/10 rounded-lg p-6">
                <h3 className="text-xl font-semibold text-white mb-4">Service Delivery</h3>
                <ul className="list-disc list-outside text-yellow-200 space-y-2 ml-6">
                  <li>Provide, maintain, and improve our services</li>
                  <li>Facilitate connections between donors, recipients, and volunteers</li>
                  <li>Process and manage donations and requests</li>
                  <li>Send notifications about platform activities and updates</li>
                </ul>
              </div>
              
              <div className="bg-white/10 rounded-lg p-6">
                <h3 className="text-xl font-semibold text-white mb-4">Platform Operations</h3>
                <ul className="list-disc list-outside text-yellow-200 space-y-2 ml-6">
                  <li>Provide customer support and respond to inquiries</li>
                  <li>Ensure platform security and prevent fraud</li>
                  <li>Analyze usage patterns to improve user experience</li>
                  <li>Comply with legal obligations</li>
                </ul>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Information Sharing Section */}
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
                <Users className="h-8 w-8 text-yellow-400 mr-3" />
                Information Sharing and Disclosure
              </h2>
              <p className="text-lg text-yellow-200 max-w-2xl mx-auto">
                We share information responsibly and transparently with appropriate parties.
              </p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="bg-white/10 rounded-lg p-6">
                <h3 className="text-xl font-semibold text-white mb-4">With Other Users</h3>
                <p className="text-yellow-200 mb-4">
                  To facilitate donations and volunteer services, we share certain information with other users:
                </p>
                <ul className="list-disc list-outside text-yellow-200 space-y-2 ml-6">
                  <li>Profile information (name, general location, contact preferences)</li>
                  <li>Donation listings and requests</li>
                  <li>Volunteer availability and capabilities</li>
                  <li>Communication necessary for coordination</li>
                </ul>
              </div>
              
              <div className="bg-white/10 rounded-lg p-6">
                <h3 className="text-xl font-semibold text-white mb-4">With Third Parties</h3>
                <p className="text-yellow-200 mb-4">
                  We may share information with third parties in the following circumstances:
                </p>
                <ul className="list-disc list-outside text-yellow-200 space-y-2 ml-6">
                  <li>With your explicit consent</li>
                  <li>To comply with legal obligations or court orders</li>
                  <li>To protect the rights, property, or safety of HopeLink, our users, or others</li>
                  <li>With service providers who assist in operating our platform</li>
                  <li>In connection with a business transfer or merger</li>
                </ul>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Data Security Section */}
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
                <Lock className="h-8 w-8 text-yellow-400 mr-3" />
                Data Security & Your Rights
              </h2>
              <p className="text-lg text-yellow-200 max-w-2xl mx-auto">
                We protect your data with industry-standard security measures and respect your privacy rights.
              </p>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div className="bg-white/10 rounded-lg p-6">
                <h3 className="text-xl font-semibold text-white mb-4">Security Measures</h3>
                <p className="text-yellow-200 mb-4">
                  We implement appropriate technical and organizational measures to protect your information:
                </p>
                <ul className="list-disc list-outside text-yellow-200 space-y-2 ml-6">
                  <li>Encryption of data in transit and at rest</li>
                  <li>Regular security assessments and updates</li>
                  <li>Access controls and authentication mechanisms</li>
                  <li>Secure hosting infrastructure</li>
                  <li>Employee training on data protection</li>
                </ul>
                <p className="text-yellow-200 mt-4 text-sm">
                  While we strive to protect your information, no method is 100% secure.
                </p>
              </div>
              
              <div className="bg-white/10 rounded-lg p-6">
                <h3 className="text-xl font-semibold text-white mb-4">Your Privacy Rights</h3>
                <p className="text-yellow-200 mb-4">
                  You have the following rights regarding your personal information:
                </p>
                <ul className="list-disc list-outside text-yellow-200 space-y-2 ml-6">
                  <li><strong>Access:</strong> Request a copy of your personal information</li>
                  <li><strong>Correction:</strong> Request correction of inaccurate information</li>
                  <li><strong>Deletion:</strong> Request deletion of your personal information</li>
                  <li><strong>Portability:</strong> Request transfer of your data to another service</li>
                  <li><strong>Restriction:</strong> Request limitation of processing</li>
                  <li><strong>Objection:</strong> Object to processing for certain purposes</li>
                  <li><strong>Withdrawal:</strong> Withdraw consent where applicable</li>
                </ul>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Additional Information Section */}
      <section className="py-16 text-white" style={{backgroundColor: '#00237d'}}>
        <div className="w-full px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.7 }}
            className="max-w-6xl mx-auto"
          >
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold text-white mb-6">Additional Information</h2>
              <p className="text-lg text-yellow-200 max-w-2xl mx-auto">
                Important details about data handling, cookies, and privacy protection.
              </p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <div className="bg-white/10 rounded-lg p-6">
                <h3 className="text-xl font-semibold text-white mb-4">Data Retention</h3>
                <p className="text-yellow-200">
                  We retain your information for as long as necessary to provide our services, 
                  comply with legal obligations, resolve disputes, and enforce our agreements.
                </p>
              </div>
              
              <div className="bg-white/10 rounded-lg p-6">
                <h3 className="text-xl font-semibold text-white mb-4">Cookies & Tracking</h3>
                <p className="text-yellow-200 mb-4">
                  We use cookies to enhance your experience:
                </p>
                <ul className="list-disc list-outside text-yellow-200 space-y-1 text-sm ml-6">
                  <li>Essential cookies for functionality</li>
                  <li>Performance cookies for analytics</li>
                  <li>Functional cookies for preferences</li>
                </ul>
              </div>
              
              <div className="bg-white/10 rounded-lg p-6">
                <h3 className="text-xl font-semibold text-white mb-4">Children's Privacy</h3>
                <p className="text-yellow-200">
                  Our platform is not intended for children under 13. We do not knowingly 
                  collect information from children under 13.
                </p>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

    </div>
  )
}

export default PrivacyPolicyPage 