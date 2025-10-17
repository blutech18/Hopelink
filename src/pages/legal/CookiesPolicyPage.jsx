import React from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowLeft, Cookie, Settings, Eye, Shield, Database, AlertTriangle, CheckCircle } from 'lucide-react'

const CookiesPolicyPage = () => {
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
            <h1 className="text-4xl font-bold text-white mb-4">Cookies Policy</h1>
            <p className="text-xl text-yellow-200 mb-6">Last updated: {new Date().toLocaleDateString()}</p>
            <p className="text-lg text-yellow-200 max-w-2xl mx-auto">
              This policy explains how HopeLink uses cookies and similar technologies to enhance your experience.
            </p>
          </motion.div>
        </div>
      </section>

      {/* What Are Cookies Section */}
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
                <Cookie className="h-8 w-8 text-yellow-400 mr-3" />
                What Are Cookies?
              </h2>
              <p className="text-lg text-yellow-200 max-w-3xl mx-auto">
                Cookies are small text files that are placed on your device when you visit our website. 
                They help us provide you with a better experience and understand how you use our platform.
              </p>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Types of Cookies Section */}
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
                <Settings className="h-8 w-8 text-yellow-400 mr-3" />
                Types of Cookies We Use
              </h2>
              <p className="text-lg text-yellow-200 max-w-2xl mx-auto">
                We use different types of cookies to provide various functionalities and improve your experience.
              </p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="bg-white/10 rounded-lg p-6">
                <div className="text-center mb-4">
                  <CheckCircle className="h-12 w-12 text-green-400 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-white mb-3">Essential Cookies</h3>
                  <p className="text-yellow-200 text-sm mb-4">
                    Required for basic platform functionality and security
                  </p>
                </div>
                <ul className="list-disc list-outside text-yellow-200 space-y-1 text-xs ml-6">
                  <li>Authentication and login sessions</li>
                  <li>Security and fraud prevention</li>
                  <li>Basic site navigation</li>
                </ul>
              </div>
              
              <div className="bg-white/10 rounded-lg p-6">
                <div className="text-center mb-4">
                  <Eye className="h-12 w-12 text-blue-400 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-white mb-3">Performance Cookies</h3>
                  <p className="text-yellow-200 text-sm mb-4">
                    Help us understand how you use our platform
                  </p>
                </div>
                <ul className="list-disc list-outside text-yellow-200 space-y-1 text-xs ml-6">
                  <li>Page views and user interactions</li>
                  <li>Site performance analytics</li>
                  <li>Error tracking and debugging</li>
                </ul>
              </div>
              
              <div className="bg-white/10 rounded-lg p-6">
                <div className="text-center mb-4">
                  <Settings className="h-12 w-12 text-purple-400 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-white mb-3">Functional Cookies</h3>
                  <p className="text-yellow-200 text-sm mb-4">
                    Remember your preferences and settings
                  </p>
                </div>
                <ul className="list-disc list-outside text-yellow-200 space-y-1 text-xs ml-6">
                  <li>Language and region preferences</li>
                  <li>Theme and display settings</li>
                  <li>Form data and user inputs</li>
                </ul>
              </div>
              
              <div className="bg-white/10 rounded-lg p-6">
                <div className="text-center mb-4">
                  <Database className="h-12 w-12 text-orange-400 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-white mb-3">Analytics Cookies</h3>
                  <p className="text-yellow-200 text-sm mb-4">
                    Provide insights for platform improvement
                  </p>
                </div>
                <ul className="list-disc list-outside text-yellow-200 space-y-1 text-xs ml-6">
                  <li>User behavior analysis</li>
                  <li>Feature usage statistics</li>
                  <li>Conversion and engagement metrics</li>
                </ul>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* How We Use Cookies Section */}
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
                How We Use Cookies
              </h2>
              <p className="text-lg text-yellow-200 max-w-2xl mx-auto">
                We use cookies responsibly to enhance your experience and improve our platform.
              </p>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div className="bg-white/10 rounded-lg p-6">
                <h3 className="text-xl font-semibold text-white mb-4">Platform Functionality</h3>
                <p className="text-yellow-200 mb-4">
                  Essential cookies enable core platform features:
                </p>
                <ul className="list-disc list-outside text-yellow-200 space-y-2 ml-6">
                  <li>Maintain your login session across pages</li>
                  <li>Remember your role (donor, recipient, volunteer)</li>
                  <li>Keep your shopping cart and preferences</li>
                  <li>Enable secure transactions and communications</li>
                  <li>Prevent unauthorized access to your account</li>
                </ul>
              </div>
              
              <div className="bg-white/10 rounded-lg p-6">
                <h3 className="text-xl font-semibold text-white mb-4">User Experience</h3>
                <p className="text-yellow-200 mb-4">
                  Functional cookies improve your browsing experience:
                </p>
                <ul className="list-disc list-outside text-yellow-200 space-y-2 ml-6">
                  <li>Remember your language and region preferences</li>
                  <li>Save your theme and display settings</li>
                  <li>Keep form data when navigating between pages</li>
                  <li>Provide personalized content recommendations</li>
                  <li>Enable location-based services (if permitted)</li>
                </ul>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Third-Party Cookies Section */}
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
                <Database className="h-8 w-8 text-yellow-400 mr-3" />
                Third-Party Cookies
              </h2>
              <p className="text-lg text-yellow-200 max-w-2xl mx-auto">
                We may use third-party services that place their own cookies on your device.
              </p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <div className="bg-white/10 rounded-lg p-6">
                <h3 className="text-xl font-semibold text-white mb-4">Google Analytics</h3>
                <p className="text-yellow-200 mb-4">
                  Helps us understand how users interact with our platform:
                </p>
                <ul className="list-disc list-outside text-yellow-200 space-y-2 ml-6">
                  <li>Page views and user journeys</li>
                  <li>Time spent on different sections</li>
                  <li>Most popular features and content</li>
                  <li>Geographic distribution of users</li>
                </ul>
              </div>
              
              <div className="bg-white/10 rounded-lg p-6">
                <h3 className="text-xl font-semibold text-white mb-4">Social Media Integration</h3>
                <p className="text-yellow-200 mb-4">
                  Enable sharing and social features:
                </p>
                <ul className="list-disc list-outside text-yellow-200 space-y-2 ml-6">
                  <li>Facebook, Twitter, and LinkedIn sharing</li>
                  <li>Social login and authentication</li>
                  <li>Social media content embedding</li>
                  <li>Social proof and testimonials</li>
                </ul>
              </div>
              
              <div className="bg-white/10 rounded-lg p-6">
                <h3 className="text-xl font-semibold text-white mb-4">Payment Processing</h3>
                <p className="text-yellow-200 mb-4">
                  Secure payment and transaction processing:
                </p>
                <ul className="list-disc list-outside text-yellow-200 space-y-2 ml-6">
                  <li>Payment gateway integration</li>
                  <li>Transaction security and fraud prevention</li>
                  <li>Payment method preferences</li>
                  <li>Billing and subscription management</li>
                </ul>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Cookie Management Section */}
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
                <Settings className="h-8 w-8 text-yellow-400 mr-3" />
                Managing Your Cookie Preferences
              </h2>
              <p className="text-lg text-yellow-200 max-w-2xl mx-auto">
                You have control over how cookies are used on our platform.
              </p>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div className="bg-white/10 rounded-lg p-6">
                <h3 className="text-xl font-semibold text-white mb-4">Browser Settings</h3>
                <p className="text-yellow-200 mb-4">
                  You can control cookies through your browser settings:
                </p>
                <ul className="list-disc list-outside text-yellow-200 space-y-2 ml-6">
                  <li>Accept or reject all cookies</li>
                  <li>Delete existing cookies</li>
                  <li>Set preferences for different cookie types</li>
                  <li>Receive notifications when cookies are set</li>
                  <li>Block third-party cookies specifically</li>
                </ul>
                <div className="mt-4 p-4 bg-yellow-400/20 rounded-lg">
                  <p className="text-yellow-200 text-sm">
                    <strong>Note:</strong> Disabling essential cookies may affect platform functionality.
                  </p>
                </div>
              </div>
              
              <div className="bg-white/10 rounded-lg p-6">
                <h3 className="text-xl font-semibold text-white mb-4">Platform Preferences</h3>
                <p className="text-yellow-200 mb-4">
                  Manage your preferences directly on our platform:
                </p>
                <ul className="list-disc list-outside text-yellow-200 space-y-2 ml-6">
                  <li>Cookie consent management</li>
                  <li>Privacy settings and preferences</li>
                  <li>Data sharing and analytics opt-out</li>
                  <li>Marketing communication preferences</li>
                  <li>Account privacy controls</li>
                </ul>
                <div className="mt-4 p-4 bg-blue-400/20 rounded-lg">
                  <p className="text-yellow-200 text-sm">
                    <strong>Tip:</strong> You can update these preferences anytime in your account settings.
                  </p>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Data Protection Section */}
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
                <Shield className="h-8 w-8 text-yellow-400 mr-3" />
                Data Protection and Privacy
              </h2>
              <p className="text-lg text-yellow-200 max-w-2xl mx-auto">
                We are committed to protecting your privacy and using cookies responsibly.
              </p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <div className="bg-white/10 rounded-lg p-6">
                <h3 className="text-xl font-semibold text-white mb-4 flex items-center">
                  <Shield className="h-5 w-5 text-yellow-400 mr-2" />
                  Data Security
                </h3>
                <p className="text-yellow-200">
                  All cookie data is encrypted and stored securely. We implement industry-standard 
                  security measures to protect your information.
                </p>
              </div>
              
              <div className="bg-white/10 rounded-lg p-6">
                <h3 className="text-xl font-semibold text-white mb-4 flex items-center">
                  <Eye className="h-5 w-5 text-yellow-400 mr-2" />
                  Transparency
                </h3>
                <p className="text-yellow-200">
                  We provide clear information about the cookies we use and why. You can always 
                  see what data we collect and how it's used.
                </p>
              </div>
              
              <div className="bg-white/10 rounded-lg p-6">
                <h3 className="text-xl font-semibold text-white mb-4 flex items-center">
                  <AlertTriangle className="h-5 w-5 text-yellow-400 mr-2" />
                  Your Rights
                </h3>
                <p className="text-yellow-200">
                  You have the right to access, modify, or delete your cookie preferences. 
                  Contact us if you have any concerns about your data.
                </p>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

    </div>
  )
}

export default CookiesPolicyPage
