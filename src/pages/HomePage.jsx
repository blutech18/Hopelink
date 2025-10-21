import React, { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
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
  UserPlus,
  Facebook,
  Download,
  X
} from 'lucide-react'
import { db } from '../lib/supabase'
import { useToast } from '../contexts/ToastContext'
import { useAuth } from '../contexts/AuthContext'

const HomePage = () => {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { error } = useToast()
  const [upcomingEvents, setUpcomingEvents] = useState([])
  const [loadingEvents, setLoadingEvents] = useState(true)
  const [showQRModal, setShowQRModal] = useState(false)
  const [selectedPayment, setSelectedPayment] = useState(null)

  const paymentMethods = [
    {
      id: 'gcash',
      name: 'GCash',
      logo: '/gcashlogo.png',
      description: 'Scan to donate via GCash',
      qrCode: '/qrplaceholder.png',
      account: 'HopeLink Foundation',
      accountNumber: '09123456789',
      color: 'blue'
    },
    {
      id: 'bpi',
      name: 'BPI',
      logo: '/bpilogo.png',
      description: 'Scan to donate via BPI',
      qrCode: '/qrplaceholder.png',
      account: 'HopeLink Foundation',
      accountNumber: '1234-5678-90',
      color: 'red'
    },
    {
      id: 'bdo',
      name: 'BDO',
      logo: '/bdologo.jpg',
      description: 'Scan to donate via BDO',
      qrCode: '/qrplaceholder.png',
      account: 'HopeLink Foundation',
      accountNumber: '0987-6543-21',
      color: 'blue'
    }
  ]

  const handlePaymentClick = (method) => {
    setSelectedPayment(method)
    setShowQRModal(true)
  }

  const handleDownloadQR = () => {
    if (!selectedPayment) return
    const link = document.createElement('a')
    link.href = selectedPayment.qrCode
    link.download = `${selectedPayment.name}-QR-Code.png`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

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

      {/* Events Section */}
      <section id="events" className="py-20 text-white" style={{backgroundColor: '#00237d'}}>
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
      <section id="about" className="py-20 text-white relative overflow-hidden" style={{backgroundColor: '#001a5c'}}>
        {/* Background Pattern Overlay */}
        <div className="absolute inset-0 opacity-5">
          <div className="absolute inset-0" style={{
            backgroundImage: 'url("data:image/svg+xml,%3Csvg width="60" height="60" viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg"%3E%3Cg fill="none" fill-rule="evenodd"%3E%3Cg fill="%23ffffff" fill-opacity="1"%3E%3Cpath d="M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z"/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")',
            backgroundSize: '60px 60px'
          }}></div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
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

          {/* Organization Image Showcase */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
            className="mb-16"
          >
            <div className="relative rounded-2xl overflow-hidden shadow-2xl border-2 border-yellow-400/30">
              <div className="relative h-96">
                {/* Organization Image */}
                <img 
                  src="/landingIMG.jpg" 
                  alt="HopeLink Community" 
                  className="w-full h-full object-cover object-center"
                  loading="eager"
                  style={{ imageRendering: 'high-quality' }}
                />
              </div>
            </div>
          </motion.div>

          {/* Mission & Vision Section */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 mb-16">
            {/* Mission Card */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6 }}
              viewport={{ once: true }}
              className="rounded-2xl shadow-2xl overflow-hidden border-2 border-yellow-400/30 relative"
              style={{backgroundColor: '#001a5c'}}
            >
              {/* Background Pattern */}
              <div className="absolute inset-0 opacity-5 pointer-events-none" style={{
                backgroundImage: 'radial-gradient(circle at 20% 50%, #fbbf24 2px, transparent 2px), radial-gradient(circle at 80% 80%, #fbbf24 2px, transparent 2px)',
                backgroundSize: '50px 50px'
              }}></div>
              
              <div className="relative p-8 text-white">
                <div className="flex items-center mb-6">
                  <div className="w-16 h-16 rounded-full bg-yellow-400/20 flex items-center justify-center border-2 border-yellow-400 mr-4">
                    <Heart className="h-8 w-8 text-yellow-400" />
                  </div>
                  <h3 className="text-3xl font-bold text-white">Our Mission</h3>
                </div>
                
                <p className="text-yellow-200 mb-6 text-lg leading-relaxed">
                  Building Renewed Families and Communities for God and Country
                </p>
              </div>
            </motion.div>

            {/* Vision Card */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6 }}
              viewport={{ once: true }}
              className="rounded-2xl shadow-2xl overflow-hidden border-2 border-yellow-400/30 relative"
              style={{backgroundColor: '#001a5c'}}
            >
              {/* Background Pattern */}
              <div className="absolute inset-0 opacity-5 pointer-events-none" style={{
                backgroundImage: 'radial-gradient(circle at 20% 50%, #fbbf24 2px, transparent 2px), radial-gradient(circle at 80% 80%, #fbbf24 2px, transparent 2px)',
                backgroundSize: '50px 50px'
              }}></div>
              
              <div className="relative p-8 text-white">
                <div className="flex items-center mb-6">
                  <div className="w-16 h-16 rounded-full bg-yellow-400/20 flex items-center justify-center border-2 border-yellow-400 mr-4">
                    <Users className="h-8 w-8 text-yellow-400" />
                  </div>
                  <h3 className="text-3xl font-bold text-white">Our Vision</h3>
                </div>
                
                <p className="text-yellow-200 mb-6 text-lg leading-relaxed">
                  Faith on Action for Spiritual and Temporal Transformation
                </p>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Contact Section */}
      <section id="contact" className="py-20 text-white" style={{backgroundColor: '#00237d'}}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
          >
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">Contact Us</h2>
              <p className="text-yellow-200 text-lg">Get in touch with HopeLink</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {/* Address */}
              <div className="flex flex-col items-center text-center p-6 bg-navy-700/30 rounded-lg border border-yellow-400/20 hover:border-yellow-400/40 transition-all">
                <div className="w-16 h-16 rounded-full bg-yellow-400/20 flex items-center justify-center border-2 border-yellow-400 mb-4">
                  <MapPin className="h-8 w-8 text-yellow-400" />
                </div>
                <h4 className="text-white font-semibold mb-3 text-lg">Address</h4>
                <a 
                  href="https://www.google.com/maps/dir/8.4785357,124.6524662/8.4993342,124.6427564/@8.4903841,124.6372611,15z/data=!3m1!4b1!4m4!4m3!1m1!4e1!1m0?entry=ttu&g_ep=EgoyMDI1MTAxNC4wIKXMDSoASAFQAw%3D%3D" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-yellow-200 text-sm hover:text-yellow-300 transition-colors cursor-pointer"
                >
                  Pasil, Kauswagan<br />
                  Kauswagan, Philippines
                </a>
              </div>

              {/* Phone */}
              <div className="flex flex-col items-center text-center p-6 bg-navy-700/30 rounded-lg border border-yellow-400/20 hover:border-yellow-400/40 transition-all">
                <div className="w-16 h-16 rounded-full bg-yellow-400/20 flex items-center justify-center border-2 border-yellow-400 mb-4">
                  <Phone className="h-8 w-8 text-yellow-400" />
                </div>
                <h4 className="text-white font-semibold mb-3 text-lg">Phone</h4>
                <p className="text-yellow-200 text-sm">
                  +63 123 456 7890
                </p>
              </div>

              {/* Email */}
              <div className="flex flex-col items-center text-center p-6 bg-navy-700/30 rounded-lg border border-yellow-400/20 hover:border-yellow-400/40 transition-all">
                <div className="w-16 h-16 rounded-full bg-yellow-400/20 flex items-center justify-center border-2 border-yellow-400 mb-4">
                  <Mail className="h-8 w-8 text-yellow-400" />
                </div>
                <h4 className="text-white font-semibold mb-3 text-lg">Email</h4>
                <p className="text-yellow-200 text-sm">
                  cfcgkmisor@gmail.com
                </p>
              </div>

              {/* Facebook Page */}
              <div className="flex flex-col items-center text-center p-6 bg-navy-700/30 rounded-lg border border-yellow-400/20 hover:border-yellow-400/40 transition-all">
                <div className="w-16 h-16 rounded-full bg-yellow-400/20 flex items-center justify-center border-2 border-yellow-400 mb-4">
                  <Facebook className="h-8 w-8 text-yellow-400" />
                </div>
                <h4 className="text-white font-semibold mb-3 text-lg">Facebook Page</h4>
                <a 
                  href="https://web.facebook.com/cfcgkmisormain" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-yellow-200 text-sm hover:text-yellow-300 transition-colors"
                >
                  Visit Our Page
                </a>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Monetary Donations Section */}
      <section className="py-20 text-white" style={{backgroundColor: '#001a5c'}}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
          >
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">Support Through Monetary Donations</h2>
              <p className="text-yellow-200 text-lg">Scan the QR codes below to donate directly</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
              {paymentMethods.map((method, index) => (
                <motion.button
                  key={method.id}
                  initial={{ opacity: 0, scale: 0.9 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.5, delay: 0.1 * (index + 1) }}
                  viewport={{ once: true }}
                  onClick={() => handlePaymentClick(method)}
                  className="bg-navy-800/50 rounded-xl p-6 border-2 border-yellow-400/30 hover:border-yellow-400/60 transition-all hover:shadow-xl hover:shadow-yellow-400/20 cursor-pointer group"
                >
                  <div className="text-center">
                    <div className="w-32 h-32 rounded-lg bg-white flex items-center justify-center mb-4 mx-auto p-4 overflow-hidden">
                      <img 
                        src={method.logo} 
                        alt={`${method.name} Logo`}
                        className="w-full h-full object-contain"
                      />
                    </div>
                    <h3 className="text-xl font-bold text-white mb-2 group-hover:text-yellow-300 transition-colors">{method.name}</h3>
                    <p className="text-yellow-300 text-sm mb-4">{method.description}</p>
                    <div className="inline-flex items-center gap-2 text-yellow-400 text-sm font-medium">
                      <span>Click to view QR Code</span>
                      <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                    </div>
                  </div>
                </motion.button>
              ))}
            </div>

            {/* Additional Info */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.4 }}
              viewport={{ once: true }}
              className="mt-12 text-center"
            >
              <div className="bg-yellow-900/20 border border-yellow-400/30 rounded-lg p-6 max-w-3xl mx-auto">
                <h4 className="text-xl font-semibold text-yellow-300 mb-3">Thank You for Your Generosity!</h4>
                <p className="text-gray-300 leading-relaxed">
                  Your monetary donations help us provide essential resources to those in need. 
                  Every contribution, no matter the size, makes a significant difference in someone's life. 
                  After donating, please send us a screenshot of your transaction to <span className="text-yellow-400 font-medium">cfcgkmisor@gmail.com</span> for our records.
                </p>
              </div>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* Partners & Sponsors Section */}
      <section className="py-20 text-white" style={{backgroundColor: '#00237d'}}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
          >
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">Our Partners & Sponsors</h2>
              <p className="text-yellow-200 text-lg">Organizations that support our mission</p>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-8 items-center">
              {/* Partner 1 */}
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5, delay: 0.1 }}
                viewport={{ once: true }}
                className="bg-white rounded-lg p-6 flex items-center justify-center hover:shadow-xl transition-shadow"
              >
                <div className="text-center">
                  <div className="w-24 h-24 mx-auto mb-3 bg-gray-100 rounded-lg flex items-center justify-center">
                    <span className="text-4xl font-bold text-gray-400">P1</span>
                  </div>
                  <p className="text-sm font-semibold text-gray-700">Partner Name</p>
                </div>
              </motion.div>

              {/* Partner 2 */}
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5, delay: 0.2 }}
                viewport={{ once: true }}
                className="bg-white rounded-lg p-6 flex items-center justify-center hover:shadow-xl transition-shadow"
              >
                <div className="text-center">
                  <div className="w-24 h-24 mx-auto mb-3 bg-gray-100 rounded-lg flex items-center justify-center">
                    <span className="text-4xl font-bold text-gray-400">P2</span>
                  </div>
                  <p className="text-sm font-semibold text-gray-700">Partner Name</p>
                </div>
              </motion.div>

              {/* Partner 3 */}
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5, delay: 0.3 }}
                viewport={{ once: true }}
                className="bg-white rounded-lg p-6 flex items-center justify-center hover:shadow-xl transition-shadow"
              >
                <div className="text-center">
                  <div className="w-24 h-24 mx-auto mb-3 bg-gray-100 rounded-lg flex items-center justify-center">
                    <span className="text-4xl font-bold text-gray-400">P3</span>
                  </div>
                  <p className="text-sm font-semibold text-gray-700">Partner Name</p>
                </div>
              </motion.div>

              {/* Partner 4 */}
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5, delay: 0.4 }}
                viewport={{ once: true }}
                className="bg-white rounded-lg p-6 flex items-center justify-center hover:shadow-xl transition-shadow"
              >
                <div className="text-center">
                  <div className="w-24 h-24 mx-auto mb-3 bg-gray-100 rounded-lg flex items-center justify-center">
                    <span className="text-4xl font-bold text-gray-400">P4</span>
                  </div>
                  <p className="text-sm font-semibold text-gray-700">Partner Name</p>
                </div>
              </motion.div>
            </div>

            {/* Call to Action */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.5 }}
              viewport={{ once: true }}
              className="mt-12 text-center"
            >
              <p className="text-yellow-200 text-lg mb-4">Interested in partnering with us?</p>
              <a
                href="mailto:cfcgkmisor@gmail.com"
                className="inline-flex items-center gap-2 px-6 py-3 bg-yellow-600 hover:bg-yellow-700 text-white rounded-lg transition-colors font-semibold"
              >
                <Mail className="h-5 w-5" />
                Contact Us
              </a>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* QR Code Modal */}
      {showQRModal && selectedPayment && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ duration: 0.2 }}
            className="bg-navy-900 border-2 border-yellow-500/30 shadow-2xl rounded-xl max-w-md w-full"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-3 border-b-2 border-yellow-500/20">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center p-1">
                  <img 
                    src={selectedPayment.logo} 
                    alt={`${selectedPayment.name} Logo`}
                    className="w-full h-full object-contain"
                  />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">{selectedPayment.name} QR Code</h3>
                  <p className="text-xs text-yellow-300">Scan to donate</p>
                </div>
              </div>
              <button
                onClick={() => setShowQRModal(false)}
                className="text-gray-400 hover:text-white transition-colors p-1.5 hover:bg-navy-800 rounded-lg"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Content - Centered Layout */}
            <div className="p-4">
              {/* QR Code */}
              <div className="bg-white rounded-lg p-4 mb-3">
                <img 
                  src={selectedPayment.qrCode} 
                  alt={`${selectedPayment.name} QR Code`}
                  className="w-full h-auto"
                />
              </div>
              
              {/* Account Info */}
              <div className="grid grid-cols-2 gap-3 mb-3">
                <div className="text-center">
                  <p className="text-gray-400 text-xs mb-1">Account Name</p>
                  <p className="text-white font-semibold text-xs">{selectedPayment.account}</p>
                </div>

                <div className="text-center">
                  <p className="text-gray-400 text-xs mb-1">Account Number</p>
                  <p className="text-yellow-300 font-mono font-semibold text-xs tracking-wide">{selectedPayment.accountNumber}</p>
                </div>
              </div>

              {/* Buttons for mobile */}
              <div className="flex items-center gap-2 md:hidden">
                <button
                  onClick={() => setShowQRModal(false)}
                  className="flex-1 px-3 py-2 bg-navy-700 hover:bg-navy-600 text-yellow-300 rounded-lg transition-colors font-medium border border-navy-600 text-xs"
                >
                  Close
                </button>
                <button
                  onClick={handleDownloadQR}
                  className="flex-1 px-3 py-2 bg-yellow-600 hover:bg-yellow-700 text-white rounded-lg transition-colors flex items-center justify-center gap-1.5 font-medium text-xs"
                >
                  <Download className="h-3 w-3" />
                  Download
                </button>
              </div>
            </div>

            {/* Footer - Desktop only */}
            <div className="hidden md:flex items-center justify-end gap-2 p-3 border-t-2 border-yellow-500/20">
              <button
                onClick={() => setShowQRModal(false)}
                className="px-3 py-2 bg-navy-700 hover:bg-navy-600 text-yellow-300 rounded-lg transition-colors font-medium border border-navy-600 text-xs"
              >
                Close
              </button>
              <button
                onClick={handleDownloadQR}
                className="px-3 py-2 bg-yellow-600 hover:bg-yellow-700 text-white rounded-lg transition-colors flex items-center gap-1.5 font-medium text-xs"
              >
                <Download className="h-3 w-3" />
                Download
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  )
}

export default HomePage 