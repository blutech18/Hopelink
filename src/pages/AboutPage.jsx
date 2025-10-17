import React from 'react'
import { motion } from 'framer-motion'
import { Heart, Users, Target, Hand, Globe, Zap } from 'lucide-react'

const AboutPage = () => {
  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative text-white py-20" style={{backgroundColor: '#00237d'}}>
        
        <div className="w-full px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center max-w-4xl mx-auto"
          >
            <img src="/hopelinklogo.png" alt="HopeLink" className="h-16 rounded mx-auto mb-6" />
            <h1 className="text-4xl font-bold text-white mb-4">About HopeLink</h1>
            <p className="text-xl text-yellow-200 mb-6">Last updated: {new Date().toLocaleDateString()}</p>
            <p className="text-lg text-yellow-200 max-w-2xl mx-auto">
              Building bridges of hope through community-driven donation management.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Our Mission Section */}
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
                <Target className="h-8 w-8 text-yellow-400 mr-3" />
                Our Mission
              </h2>
              <p className="text-lg text-yellow-200 max-w-3xl mx-auto">
                HopeLink connects donors, recipients, and volunteers in a seamless ecosystem 
                for resource sharing and community support. We believe that every donation, 
                every request, and every delivery creates a ripple of hope that strengthens our communities.
              </p>
            </div>
          </motion.div>
        </div>
      </section>

      {/* How It Works Section */}
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
                <Zap className="h-8 w-8 text-yellow-400 mr-3" />
                How It Works
              </h2>
              <p className="text-lg text-yellow-200 max-w-2xl mx-auto">
                Our platform makes it simple for community members to give, receive, and volunteer.
              </p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-white/10 rounded-lg p-6 text-center">
                <Heart className="h-12 w-12 text-red-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-white mb-3">Donors</h3>
                <p className="text-yellow-200 text-sm">
                  Easily post items you want to share and make a difference in your community
                </p>
              </div>
              
              <div className="bg-white/10 rounded-lg p-6 text-center">
                <Users className="h-12 w-12 text-blue-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-white mb-3">Recipients</h3>
                <p className="text-yellow-200 text-sm">
                  Browse available donations or create specific requests for what you need
                </p>
              </div>
              
              <div className="bg-white/10 rounded-lg p-6 text-center">
                <Hand className="h-12 w-12 text-green-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-white mb-3">Volunteers</h3>
                <p className="text-yellow-200 text-sm">
                  Help ensure items reach those who need them most through delivery coordination
                </p>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Community Impact Section */}
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
                <Globe className="h-8 w-8 text-yellow-400 mr-3" />
                Community Impact
              </h2>
              <p className="text-lg text-yellow-200 max-w-2xl mx-auto">
                Together, we're building a network where generosity flows freely and no one goes without.
              </p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="bg-white/10 rounded-lg p-6 text-center">
                <div className="text-3xl font-bold text-yellow-400 mb-2">1000+</div>
                <div className="text-yellow-200 text-sm">Items Donated</div>
              </div>
              
              <div className="bg-white/10 rounded-lg p-6 text-center">
                <div className="text-3xl font-bold text-blue-400 mb-2">500+</div>
                <div className="text-yellow-200 text-sm">Families Helped</div>
              </div>
              
              <div className="bg-white/10 rounded-lg p-6 text-center">
                <div className="text-3xl font-bold text-green-400 mb-2">200+</div>
                <div className="text-yellow-200 text-sm">Active Volunteers</div>
              </div>
              
              <div className="bg-white/10 rounded-lg p-6 text-center">
                <div className="text-3xl font-bold text-purple-400 mb-2">50+</div>
                <div className="text-yellow-200 text-sm">Communities Served</div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Our Values Section */}
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
                <Heart className="h-8 w-8 text-yellow-400 mr-3" />
                Our Values
              </h2>
              <p className="text-lg text-yellow-200 max-w-2xl mx-auto">
                The principles that guide everything we do at HopeLink.
              </p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <div className="bg-white/10 rounded-lg p-6">
                <h3 className="text-xl font-semibold text-white mb-4 flex items-center">
                  <Heart className="h-5 w-5 text-red-400 mr-2" />
                  Compassion
                </h3>
                <p className="text-yellow-200">
                  We approach every interaction with empathy and understanding, recognizing that 
                  everyone's circumstances are unique and deserving of dignity and respect.
                </p>
              </div>
              
              <div className="bg-white/10 rounded-lg p-6">
                <h3 className="text-xl font-semibold text-white mb-4 flex items-center">
                  <Users className="h-5 w-5 text-blue-400 mr-2" />
                  Community
                </h3>
                <p className="text-yellow-200">
                  We believe in the power of community and work to strengthen connections 
                  between neighbors, building a network of mutual support and care.
                </p>
              </div>
              
              <div className="bg-white/10 rounded-lg p-6">
                <h3 className="text-xl font-semibold text-white mb-4 flex items-center">
                  <Target className="h-5 w-5 text-green-400 mr-2" />
                  Transparency
                </h3>
                <p className="text-yellow-200">
                  We maintain open and honest communication, ensuring that all platform 
                  activities are transparent and trustworthy for all community members.
                </p>
              </div>
            </div>
          </motion.div>
        </div>
      </section>
    </div>
  )
}

export default AboutPage 