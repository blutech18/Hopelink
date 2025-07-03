import React from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowLeft, Heart, Shield, Users, Truck } from 'lucide-react'

const TermsOfServicePage = () => {
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
          <h1 className="text-3xl font-bold text-white mb-2">Terms of Service</h1>
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
                Agreement to Terms
              </h2>
              <p className="text-skyblue-200 leading-relaxed">
                Welcome to HopeLink! These Terms of Service ("Terms") govern your use of the HopeLink platform 
                ("Service") operated by HopeLink ("us", "we", or "our"). By accessing or using our Service, 
                you agree to be bound by these Terms.
              </p>
            </section>

            {/* Service Description */}
            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-white mb-4 flex items-center">
                <Heart className="h-6 w-6 text-primary-600 mr-3" />
                Description of Service
              </h2>
              <p className="text-skyblue-200 leading-relaxed mb-4">
                HopeLink is a community-driven platform that connects donors, recipients, and volunteers 
                to facilitate the donation and distribution of goods and services. Our platform enables:
              </p>
              <ul className="list-disc list-inside text-skyblue-200 space-y-2 ml-4">
                <li>Donors to post available items and resources for donation</li>
                <li>Recipients to browse and request needed items and assistance</li>
                <li>Volunteers to coordinate delivery and distribution services</li>
                <li>Community members to organize and participate in charitable events</li>
              </ul>
            </section>

            {/* User Accounts */}
            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-white mb-4 flex items-center">
                <Users className="h-6 w-6 text-primary-600 mr-3" />
                User Accounts and Responsibilities
              </h2>
              
              <h3 className="text-xl font-semibold text-white mb-3">Account Creation</h3>
              <p className="text-skyblue-200 leading-relaxed mb-4">
                To use certain features of our Service, you must register for an account. You agree to:
              </p>
              <ul className="list-disc list-inside text-skyblue-200 space-y-2 ml-4 mb-4">
                <li>Provide accurate, current, and complete information during registration</li>
                <li>Maintain and update your account information</li>
                <li>Maintain the security of your password and account</li>
                <li>Accept responsibility for all activities under your account</li>
              </ul>

              <h3 className="text-xl font-semibold text-white mb-3">User Conduct</h3>
              <p className="text-skyblue-200 leading-relaxed mb-4">You agree not to:</p>
              <ul className="list-disc list-inside text-skyblue-200 space-y-2 ml-4">
                <li>Use the Service for any unlawful purposes or illegal activities</li>
                <li>Post false, misleading, or fraudulent donation requests or offers</li>
                <li>Harass, abuse, or harm other users of the platform</li>
                <li>Violate any local, state, national, or international laws</li>
                <li>Interfere with or disrupt the Service or servers</li>
                <li>Use the Service for commercial purposes without authorization</li>
              </ul>
            </section>

            {/* Donations and Transactions */}
            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-white mb-4 flex items-center">
                <Truck className="h-6 w-6 text-primary-600 mr-3" />
                Donations and Transactions
              </h2>
              
              <h3 className="text-xl font-semibold text-white mb-3">Donation Process</h3>
              <p className="text-skyblue-200 leading-relaxed mb-4">
                HopeLink facilitates connections between donors and recipients but is not a party to 
                any donation transactions. All donations are made directly between users.
              </p>

              <h3 className="text-xl font-semibold text-white mb-3">Item Quality and Safety</h3>
              <ul className="list-disc list-inside text-skyblue-200 space-y-2 ml-4 mb-4">
                <li>Donors are responsible for ensuring donated items are safe and in good condition</li>
                <li>Recipients should inspect items before acceptance</li>
                <li>HopeLink is not responsible for the quality, safety, or condition of donated items</li>
                <li>Users should exercise caution when arranging pickups and deliveries</li>
              </ul>

              <h3 className="text-xl font-semibold text-white mb-3">Volunteer Services</h3>
              <p className="text-skyblue-200 leading-relaxed">
                Volunteers provide services at their own discretion. HopeLink does not employ volunteers 
                and is not responsible for their actions or the quality of their services.
              </p>
            </section>

            {/* Privacy and Data */}
            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-white mb-4">Privacy and Data Protection</h2>
              <p className="text-skyblue-200 leading-relaxed">
                Your privacy is important to us. Our collection and use of personal information is 
                governed by our <Link to="/privacy-policy" className="text-primary-400 hover:text-primary-300">Privacy Policy</Link>, 
                which is incorporated into these Terms by reference.
              </p>
            </section>

            {/* Liability and Disclaimers */}
            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-white mb-4">Limitation of Liability</h2>
              <p className="text-skyblue-200 leading-relaxed mb-4">
                TO THE MAXIMUM EXTENT PERMITTED BY LAW, HOPELINK SHALL NOT BE LIABLE FOR ANY INDIRECT, 
                INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, OR ANY LOSS OF PROFITS OR REVENUES.
              </p>
              <p className="text-skyblue-200 leading-relaxed">
                HopeLink provides the platform "as is" and makes no warranties regarding the availability, 
                accuracy, or reliability of the Service.
              </p>
            </section>

            {/* Modifications */}
            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-white mb-4">Modifications to Terms</h2>
              <p className="text-skyblue-200 leading-relaxed">
                We reserve the right to modify these Terms at any time. We will notify users of significant 
                changes by posting the new Terms on this page with an updated date. Your continued use of 
                the Service after such modifications constitutes acceptance of the updated Terms.
              </p>
            </section>

            {/* Termination */}
            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-white mb-4">Termination</h2>
              <p className="text-skyblue-200 leading-relaxed">
                We may terminate or suspend your account and access to the Service immediately, without 
                prior notice, for conduct that we believe violates these Terms or is harmful to other 
                users, us, or third parties.
              </p>
            </section>

            {/* Governing Law */}
            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-white mb-4">Governing Law</h2>
              <p className="text-skyblue-200 leading-relaxed">
                These Terms shall be governed by and construed in accordance with the laws of the 
                Republic of the Philippines, without regard to its conflict of law provisions.
              </p>
            </section>

            {/* Contact Information */}
            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-white mb-4">Contact Information</h2>
              <p className="text-skyblue-200 leading-relaxed">
                If you have any questions about these Terms of Service, please contact us at:
              </p>
              <div className="mt-4 p-4 bg-navy-800 rounded-lg">
                <p className="text-white font-medium">HopeLink Support</p>
                <p className="text-skyblue-300">Email: support@hopelink.ph</p>
                <p className="text-skyblue-300">Address: Cagayan de Oro City, Philippines</p>
              </div>
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
              to="/privacy-policy"
              className="text-primary-400 hover:text-primary-300 transition-colors"
            >
              Privacy Policy
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

export default TermsOfServicePage 