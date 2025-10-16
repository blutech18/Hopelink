import React from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { 
  Heart, 
  Users, 
  Truck, 
  Gift, 
  ArrowRight, 
  CheckCircle,
  Calendar
} from 'lucide-react'

const HomePage = () => {
  const features = [
    {
      icon: Gift,
      title: 'Easy Donations',
      description: 'Post your donations with photos and details. Connect directly with those in need.',
      color: 'text-blue-400'
    },
    {
      icon: Heart,
      title: 'Community Requests',
      description: 'Browse community requests and find meaningful ways to help your neighbors.',
      color: 'text-pink-400'
    },
    {
      icon: Truck,
      title: 'Volunteer Delivery',
      description: 'Join our volunteer network to help deliver donations across your community.',
      color: 'text-green-400'
    },
    {
      icon: Users,
      title: 'Community Events',
      description: 'Participate in organized community events and collective giving initiatives.',
      color: 'text-purple-400'
    }
  ]

  const stats = [
    { value: '10,000+', label: 'Donations Made' },
    { value: '5,000+', label: 'Families Helped' },
    { value: '2,000+', label: 'Volunteers' },
    { value: '50+', label: 'Communities' }
  ]

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative text-white" style={{backgroundColor: '#00237d'}}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6 }}
            >
              <h1 className="text-4xl md:text-6xl font-bold mb-6">
                Building Bridges of
                <span className="text-yellow-400"> Hope</span>
              </h1>
              <p className="text-xl mb-8 text-yellow-200">
                Connect donors, recipients, and volunteers in a seamless ecosystem 
                for resource sharing and community support. Together, we create lasting impact.
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <Link
                  to="/signup"
                  className="inline-flex items-center justify-center px-8 py-3 bg-yellow-500 text-navy-950 font-semibold rounded-lg hover:bg-yellow-600 transition-colors"
                >
                  Get Started
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Link>
                <Link
                  to="/about"
                  className="inline-flex items-center justify-center px-8 py-3 border-2 border-yellow-400 text-yellow-400 font-semibold rounded-lg hover:bg-yellow-400 hover:text-navy-950 transition-colors"
                >
                  Learn More
                </Link>
              </div>
            </motion.div>
            
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="relative"
            >
              <div className="rounded-2xl shadow-2xl p-8 text-white border border-gray-600" style={{backgroundColor: '#001a5c'}}>
                <h3 className="text-2xl font-bold mb-6 text-yellow-300">Quick Impact Stats</h3>
                <div className="grid grid-cols-2 gap-4">
                  {stats.map((stat, index) => (
                    <div key={index} className="text-center">
                      <div className="text-3xl font-bold text-yellow-400">{stat.value}</div>
                      <div className="text-sm text-yellow-200">{stat.label}</div>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 text-white" style={{backgroundColor: '#001a5c'}}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
              How HopeLink Works
            </h2>
            <p className="text-xl text-yellow-300 max-w-3xl mx-auto">
              Our platform makes it simple to give, receive, and volunteer in your community.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {features.map((feature, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                viewport={{ once: true }}
                className="text-center"
              >
                <div className={`inline-flex items-center justify-center w-16 h-16 rounded-full bg-navy-800 ${feature.color} mb-6`}>
                  <feature.icon className="h-8 w-8" />
                </div>
                <h3 className="text-xl font-semibold text-white mb-3">
                  {feature.title}
                </h3>
                <p className="text-yellow-300">
                  {feature.description}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 text-white" style={{backgroundColor: '#00237d'}}>
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
          >
            <h2 className="text-3xl md:text-4xl font-bold mb-6">
              Ready to Make a Difference?
            </h2>
            <p className="text-xl mb-8 text-yellow-300">
              Join thousands of community members who are already making an impact. 
              Every donation, every request, every delivery creates a ripple of hope.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                to="/signup"
                className="inline-flex items-center justify-center px-8 py-3 bg-yellow-500 text-navy-950 font-semibold rounded-lg hover:bg-yellow-600 transition-colors"
              >
                Join Our Community
                <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
              <Link
                to="/events"
                className="inline-flex items-center justify-center px-8 py-3 border-2 border-yellow-400 text-yellow-400 font-semibold rounded-lg hover:bg-yellow-400 hover:text-navy-950 transition-colors"
              >
                View Community Events
                <Calendar className="ml-2 h-5 w-5" />
              </Link>
            </div>
          </motion.div>
        </div>
      </section>
    </div>
  )
}

export default HomePage 