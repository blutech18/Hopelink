import React from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowLeft, Heart, Shield, Users, Truck, FileText, AlertTriangle, Scale } from 'lucide-react'

const TermsOfServicePage = () => {
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
            <h1 className="text-4xl font-bold text-white mb-4">Terms of Service</h1>
            <p className="text-xl text-yellow-200 mb-6">Last updated: {new Date().toLocaleDateString()}</p>
            <p className="text-lg text-yellow-200 max-w-2xl mx-auto">
              These terms govern your use of HopeLink. Please read them carefully before using our platform.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Agreement Section */}
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
                Agreement to Terms
              </h2>
              <p className="text-lg text-yellow-200 leading-relaxed max-w-3xl mx-auto">
                Welcome to HopeLink! These Terms of Service ("Terms") govern your use of the HopeLink platform 
                ("Service") operated by HopeLink ("us", "we", or "our"). By accessing or using our Service, 
                you agree to be bound by these Terms.
              </p>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Service Description Section */}
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
                <Heart className="h-8 w-8 text-yellow-400 mr-3" />
                Description of Service
              </h2>
              <p className="text-lg text-yellow-200 max-w-2xl mx-auto">
                HopeLink is a community-driven platform that connects donors, recipients, and volunteers.
              </p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="bg-white/10 rounded-lg p-6 text-center">
                <Users className="h-12 w-12 text-yellow-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-white mb-3">Donors</h3>
                <p className="text-yellow-200 text-sm">Post available items and resources for donation</p>
              </div>
              
              <div className="bg-white/10 rounded-lg p-6 text-center">
                <Heart className="h-12 w-12 text-yellow-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-white mb-3">Recipients</h3>
                <p className="text-yellow-200 text-sm">Browse and request needed items and assistance</p>
              </div>
              
              <div className="bg-white/10 rounded-lg p-6 text-center">
                <Truck className="h-12 w-12 text-yellow-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-white mb-3">Volunteers</h3>
                <p className="text-yellow-200 text-sm">Coordinate delivery and distribution services</p>
              </div>
              
              <div className="bg-white/10 rounded-lg p-6 text-center">
                <Users className="h-12 w-12 text-yellow-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-white mb-3">Community</h3>
                <p className="text-yellow-200 text-sm">Organize and participate in charitable events</p>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* User Accounts Section */}
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
                <Users className="h-8 w-8 text-yellow-400 mr-3" />
                User Accounts and Responsibilities
              </h2>
              <p className="text-lg text-yellow-200 max-w-2xl mx-auto">
                Your responsibilities and obligations when using our platform.
              </p>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div className="bg-white/10 rounded-lg p-6">
                <h3 className="text-xl font-semibold text-white mb-4">Account Creation</h3>
                <p className="text-yellow-200 mb-4">
                  To use certain features of our Service, you must register for an account. You agree to:
                </p>
                <ul className="list-disc list-outside text-yellow-200 space-y-2 ml-6">
                  <li>Provide accurate, current, and complete information during registration</li>
                  <li>Maintain and update your account information</li>
                  <li>Maintain the security of your password and account</li>
                  <li>Accept responsibility for all activities under your account</li>
                </ul>
              </div>
              
              <div className="bg-white/10 rounded-lg p-6">
                <h3 className="text-xl font-semibold text-white mb-4">User Conduct</h3>
                <p className="text-yellow-200 mb-4">You agree not to:</p>
                <ul className="list-disc list-outside text-yellow-200 space-y-2 ml-6">
                  <li>Use the Service for any unlawful purposes or illegal activities</li>
                  <li>Post false, misleading, or fraudulent donation requests or offers</li>
                  <li>Harass, abuse, or harm other users of the platform</li>
                  <li>Violate any local, state, national, or international laws</li>
                  <li>Interfere with or disrupt the Service or servers</li>
                  <li>Use the Service for commercial purposes without authorization</li>
                </ul>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Donations and Transactions Section */}
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
                <Truck className="h-8 w-8 text-yellow-400 mr-3" />
                Donations and Transactions
              </h2>
              <p className="text-lg text-yellow-200 max-w-2xl mx-auto">
                Important information about donation processes, safety, and volunteer services.
              </p>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="bg-white/10 rounded-lg p-6">
                <h3 className="text-xl font-semibold text-white mb-4">Donation Process</h3>
                <p className="text-yellow-200">
                  HopeLink facilitates connections between donors and recipients but is not a party to 
                  any donation transactions. All donations are made directly between users.
                </p>
              </div>
              
              <div className="bg-white/10 rounded-lg p-6">
                <h3 className="text-xl font-semibold text-white mb-4">Item Quality and Safety</h3>
                <ul className="list-disc list-outside text-yellow-200 space-y-2 ml-6">
                  <li>Donors are responsible for ensuring donated items are safe and in good condition</li>
                  <li>Recipients should inspect items before acceptance</li>
                  <li>HopeLink is not responsible for the quality, safety, or condition of donated items</li>
                  <li>Users should exercise caution when arranging pickups and deliveries</li>
                </ul>
              </div>
              
              <div className="bg-white/10 rounded-lg p-6">
                <h3 className="text-xl font-semibold text-white mb-4">Volunteer Services</h3>
                <p className="text-yellow-200">
                  Volunteers provide services at their own discretion. HopeLink does not employ volunteers 
                  and is not responsible for their actions or the quality of their services.
                </p>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Legal Information Section */}
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
                <Scale className="h-8 w-8 text-yellow-400 mr-3" />
                Legal Information
              </h2>
              <p className="text-lg text-yellow-200 max-w-2xl mx-auto">
                Important legal terms, liability limitations, and governing laws.
              </p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <div className="bg-white/10 rounded-lg p-6">
                <h3 className="text-xl font-semibold text-white mb-4 flex items-center">
                  <FileText className="h-5 w-5 text-yellow-400 mr-2" />
                  Privacy Policy
                </h3>
                <p className="text-yellow-200">
                  Your privacy is important to us. Our collection and use of personal information is 
                  governed by our <Link to="/privacy-policy" className="text-yellow-400 hover:text-yellow-300 underline">Privacy Policy</Link>, 
                  which is incorporated into these Terms by reference.
                </p>
              </div>
              
              <div className="bg-white/10 rounded-lg p-6">
                <h3 className="text-xl font-semibold text-white mb-4 flex items-center">
                  <AlertTriangle className="h-5 w-5 text-yellow-400 mr-2" />
                  Limitation of Liability
                </h3>
                <p className="text-yellow-200 mb-3">
                  TO THE MAXIMUM EXTENT PERMITTED BY LAW, HOPELINK SHALL NOT BE LIABLE FOR ANY INDIRECT, 
                  INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES.
                </p>
                <p className="text-yellow-200 text-sm">
                  HopeLink provides the platform "as is" and makes no warranties regarding availability, 
                  accuracy, or reliability.
                </p>
              </div>
              
              <div className="bg-white/10 rounded-lg p-6">
                <h3 className="text-xl font-semibold text-white mb-4 flex items-center">
                  <Scale className="h-5 w-5 text-yellow-400 mr-2" />
                  Governing Law
                </h3>
                <p className="text-yellow-200">
                  These Terms shall be governed by and construed in accordance with the laws of the 
                  Republic of the Philippines, without regard to its conflict of law provisions.
                </p>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Terms Management Section */}
      <section className="py-16 text-white" style={{backgroundColor: '#00237d'}}>
        <div className="w-full px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.7 }}
            className="max-w-6xl mx-auto"
          >
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold text-white mb-6">Terms Management</h2>
              <p className="text-lg text-yellow-200 max-w-2xl mx-auto">
                How we handle changes to these terms and account management.
              </p>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div className="bg-white/10 rounded-lg p-6">
                <h3 className="text-xl font-semibold text-white mb-4">Modifications to Terms</h3>
                <p className="text-yellow-200">
                  We reserve the right to modify these Terms at any time. We will notify users of significant 
                  changes by posting the new Terms on this page with an updated date. Your continued use of 
                  the Service after such modifications constitutes acceptance of the updated Terms.
                </p>
              </div>
              
              <div className="bg-white/10 rounded-lg p-6">
                <h3 className="text-xl font-semibold text-white mb-4">Termination</h3>
                <p className="text-yellow-200">
                  We may terminate or suspend your account and access to the Service immediately, without 
                  prior notice, for conduct that we believe violates these Terms or is harmful to other 
                  users, us, or third parties.
                </p>
              </div>
            </div>
          </motion.div>
        </div>
      </section>
    </div>
  )
}

export default TermsOfServicePage 