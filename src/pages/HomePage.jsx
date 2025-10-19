import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { 
  Heart, 
  Users, 
  Truck, 
  Gift, 
  ArrowRight, 
  CheckCircle,
  Calendar,
  Info,
  MapPin,
  Phone,
  Mail,
  Clock,
  UserPlus
} from 'lucide-react'
import { db } from '../lib/supabase'
import { useToast } from '../contexts/ToastContext'

const HomePage = () => {
  const { error } = useToast()
  const [upcomingEvents, setUpcomingEvents] = useState([])
  const [loadingEvents, setLoadingEvents] = useState(true)

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

  // Fetch upcoming events from database
  const fetchUpcomingEvents = async () => {
    try {
      setLoadingEvents(true)
      const allEvents = await db.getEvents()
      
      // Filter for upcoming/active events and limit to 3 for homepage
      const upcoming = allEvents
        .filter(event => {
          const eventDate = new Date(event.start_date)
          const today = new Date()
          return event.status === 'active' || event.status === 'upcoming' || eventDate >= today
        })
        .sort((a, b) => new Date(a.start_date) - new Date(b.start_date))
        .slice(0, 3)
      
      setUpcomingEvents(upcoming)
    } catch (err) {
      console.error('Error fetching events:', err)
      error('Failed to load upcoming events')
      setUpcomingEvents([])
    } finally {
      setLoadingEvents(false)
    }
  }

  useEffect(() => {
    fetchUpcomingEvents()
  }, [])

  const teamMembers = [
    {
      name: 'Sarah Johnson',
      role: 'Founder & CEO',
      description: 'Passionate about community building and social impact.',
      image: '👩‍💼'
    },
    {
      name: 'Michael Chen',
      role: 'CTO',
      description: 'Technology enthusiast focused on creating meaningful solutions.',
      image: '👨‍💻'
    },
    {
      name: 'Maria Rodriguez',
      role: 'Community Director',
      description: 'Dedicated to fostering connections and supporting local communities.',
      image: '👩‍🎓'
    }
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
                <button
                  onClick={() => document.getElementById('about')?.scrollIntoView({ behavior: 'smooth' })}
                  className="inline-flex items-center justify-center px-8 py-3 border-2 border-yellow-400 text-yellow-400 font-semibold rounded-lg hover:bg-yellow-400 hover:text-navy-950 transition-colors"
                >
                  Learn More
                </button>
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
              <button
                onClick={() => document.getElementById('events')?.scrollIntoView({ behavior: 'smooth' })}
                className="inline-flex items-center justify-center px-8 py-3 border-2 border-yellow-400 text-yellow-400 font-semibold rounded-lg hover:bg-yellow-400 hover:text-navy-950 transition-colors"
              >
                View Community Events
                <Calendar className="ml-2 h-5 w-5" />
              </button>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Events Section */}
      <section id="events" className="py-20 text-white" style={{backgroundColor: '#001a5c'}}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
              Upcoming Community Events
            </h2>
            <p className="text-xl text-yellow-300 max-w-3xl mx-auto">
              Join us in making a difference through organized community events and initiatives.
            </p>
          </motion.div>

          {loadingEvents ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {[1, 2, 3].map((i) => (
                <div key={i} className="bg-navy-800 rounded-lg p-6 border border-gray-600 animate-pulse">
                  <div className="h-6 bg-gray-600 rounded mb-4"></div>
                  <div className="h-4 bg-gray-600 rounded mb-3"></div>
                  <div className="space-y-2 mb-4">
                    <div className="h-3 bg-gray-600 rounded"></div>
                    <div className="h-3 bg-gray-600 rounded"></div>
                  </div>
                  <div className="h-3 bg-gray-600 rounded mb-4"></div>
                  <div className="h-8 bg-gray-600 rounded"></div>
                </div>
              ))}
            </div>
          ) : upcomingEvents.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {upcomingEvents.map((event, index) => (
                <motion.div
                  key={event.id}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: index * 0.1 }}
                  viewport={{ once: true }}
                  className="bg-navy-800 rounded-lg p-6 border border-gray-600 hover:border-yellow-400 transition-colors"
                >
                  <div className="flex items-center justify-between mb-4">
                    <span className="px-3 py-1 bg-yellow-500 text-navy-950 text-sm font-semibold rounded-full">
                      {event.target_goal || 'Community Event'}
                    </span>
                    <Calendar className="h-5 w-5 text-yellow-400" />
                  </div>
                  <h3 className="text-xl font-semibold text-white mb-3">
                    {event.name}
                  </h3>
                  <div className="space-y-2 mb-4">
                    <div className="flex items-center text-yellow-300">
                      <Calendar className="h-4 w-4 mr-2" />
                      <span className="text-sm">
                        {new Date(event.start_date).toLocaleDateString('en-US', {
                          month: 'long',
                          day: 'numeric',
                          year: 'numeric'
                        })}
                      </span>
                    </div>
                    <div className="flex items-center text-yellow-300">
                      <MapPin className="h-4 w-4 mr-2" />
                      <span className="text-sm">{event.location}</span>
                    </div>
                    {event.max_participants && (
                      <div className="flex items-center text-yellow-300">
                        <UserPlus className="h-4 w-4 mr-2" />
                        <span className="text-sm">
                          {event.current_participants || 0}/{event.max_participants} participants
                        </span>
                      </div>
                    )}
                  </div>
                  <p className="text-yellow-200 text-sm mb-4 line-clamp-3">
                    {event.description}
                  </p>
                  <Link
                    to="/events"
                    className="w-full px-4 py-2 bg-yellow-500 text-navy-950 font-semibold rounded-lg hover:bg-yellow-600 transition-colors text-center block"
                  >
                    Learn More
                  </Link>
                </motion.div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <Calendar className="h-16 w-16 text-yellow-400 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-white mb-2">No Upcoming Events</h3>
              <p className="text-yellow-300 mb-6">
                Check back soon for new community events and initiatives.
              </p>
              <Link
                to="/events"
                className="inline-flex items-center px-6 py-3 bg-yellow-500 text-navy-950 font-semibold rounded-lg hover:bg-yellow-600 transition-colors"
              >
                View All Events
                <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
            </div>
          )}
        </div>
      </section>

      {/* About Section */}
      <section id="about" className="py-20 text-white" style={{backgroundColor: '#00237d'}}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
              About HopeLink
            </h2>
            <p className="text-xl text-yellow-300 max-w-3xl mx-auto">
              We believe in the power of community and the impact of collective action. 
              Our mission is to create a seamless platform that connects those who want to help 
              with those who need support.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center mb-16">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6 }}
              viewport={{ once: true }}
            >
              <h3 className="text-2xl font-bold text-white mb-6">Our Mission</h3>
              <p className="text-yellow-200 mb-6">
                HopeLink was founded on the principle that every community member has something valuable to contribute. 
                Whether you're donating items, requesting assistance, or volunteering your time, you're part of 
                a larger movement toward a more connected and supportive society.
              </p>
              <div className="space-y-4">
                <div className="flex items-start">
                  <CheckCircle className="h-5 w-5 text-green-400 mr-3 mt-1 flex-shrink-0" />
                  <div>
                    <h4 className="text-white font-semibold mb-1">Transparent & Trustworthy</h4>
                    <p className="text-yellow-200 text-sm">All interactions are verified and secure</p>
                  </div>
                </div>
                <div className="flex items-start">
                  <CheckCircle className="h-5 w-5 text-green-400 mr-3 mt-1 flex-shrink-0" />
                  <div>
                    <h4 className="text-white font-semibold mb-1">Community-Focused</h4>
                    <p className="text-yellow-200 text-sm">Built by and for local communities</p>
                  </div>
                </div>
                <div className="flex items-start">
                  <CheckCircle className="h-5 w-5 text-green-400 mr-3 mt-1 flex-shrink-0" />
                  <div>
                    <h4 className="text-white font-semibold mb-1">Easy to Use</h4>
                    <p className="text-yellow-200 text-sm">Simple interface for all skill levels</p>
                  </div>
                </div>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6 }}
              viewport={{ once: true }}
              className="rounded-2xl shadow-2xl p-8 text-white border border-gray-600"
              style={{backgroundColor: '#001a5c'}}
            >
              <h3 className="text-2xl font-bold text-white mb-6">Contact Us</h3>
              <div className="space-y-4">
                <div className="flex items-center">
                  <Mail className="h-5 w-5 text-yellow-400 mr-3" />
                  <span className="text-yellow-200">info@hopelink.com</span>
                </div>
                <div className="flex items-center">
                  <Phone className="h-5 w-5 text-yellow-400 mr-3" />
                  <span className="text-yellow-200">+1 (555) 123-4567</span>
                </div>
                <div className="flex items-center">
                  <MapPin className="h-5 w-5 text-yellow-400 mr-3" />
                  <span className="text-yellow-200">123 Community St, City, State 12345</span>
                </div>
              </div>
            </motion.div>
          </div>

          {/* Team Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
          >
            <h3 className="text-2xl font-bold text-white text-center mb-12">Meet Our Team</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {teamMembers.map((member, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: index * 0.1 }}
                  viewport={{ once: true }}
                  className="text-center rounded-2xl shadow-2xl p-6 text-white border border-gray-600"
                  style={{backgroundColor: '#001a5c'}}
                >
                  <div className="text-6xl mb-4">{member.image}</div>
                  <h4 className="text-xl font-semibold text-white mb-2">{member.name}</h4>
                  <p className="text-yellow-400 mb-3">{member.role}</p>
                  <p className="text-yellow-200 text-sm">{member.description}</p>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>
    </div>
  )
}

export default HomePage 