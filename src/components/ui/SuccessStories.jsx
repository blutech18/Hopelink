import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Quote, Star, ArrowLeft, ArrowRight, Users, Heart, TrendingUp } from 'lucide-react'

const SuccessStories = () => {
  const [currentIndex, setCurrentIndex] = useState(0)

  const stories = [
    {
      id: 1,
      role: 'Donor',
      name: 'Maria Santos',
      location: 'Quezon City',
      avatar: '👩',
      rating: 5,
      quote: 'I donated food items through HopeLink and within 2 days, I received a notification that my donation helped feed 3 families. Seeing the impact in real-time made me want to donate more!',
      impact: {
        donations: 12,
        familiesHelped: 36,
        timeSaved: '24 hours'
      },
      highlight: '12 donations made, 36 families helped'
    },
    {
      id: 2,
      role: 'Recipient',
      name: 'Juan Dela Cruz',
      location: 'Manila',
      avatar: '👨',
      rating: 5,
      quote: 'As a single parent, HopeLink helped me get essential items for my children. The verification system gave me confidence, and the volunteers were so kind and reliable.',
      impact: {
        itemsReceived: 8,
        timeSaved: '16 hours',
        moneySaved: '₱5,000'
      },
      highlight: 'Received 8 essential items, saved ₱5,000'
    },
    {
      id: 3,
      role: 'Volunteer',
      name: 'Ana Rodriguez',
      location: 'Makati',
      avatar: '👩‍🦰',
      rating: 5,
      quote: 'Volunteering with HopeLink has been incredibly rewarding. I\'ve completed 25 deliveries and helped connect donors with recipients in my community. The platform makes it so easy!',
      impact: {
        deliveries: 25,
        familiesHelped: 25,
        hoursVolunteered: '50 hours'
      },
      highlight: '25 deliveries completed, 50 hours volunteered'
    },
    {
      id: 4,
      role: 'Donor',
      name: 'Robert Chen',
      location: 'Taguig',
      avatar: '👨‍💼',
      rating: 5,
      quote: 'The smart matching feature is amazing! My furniture donation went to a family that really needed it, and I could track the entire delivery process. This platform builds real trust.',
      impact: {
        donations: 5,
        familiesHelped: 5,
        communityValue: '₱25,000'
      },
      highlight: '5 donations, ₱25,000 community value created'
    },
    {
      id: 5,
      role: 'Recipient',
      name: 'Lila Garcia',
      location: 'Pasig',
      avatar: '👵',
      rating: 5,
      quote: 'At 72, I needed help getting groceries. HopeLink connected me with a donor in my area, and a volunteer delivered everything to my door. The community support is wonderful.',
      impact: {
        itemsReceived: 15,
        timeSaved: '30 hours',
        tripsSaved: 10
      },
      highlight: '15 items received, 10 trips saved'
    }
  ]

  const currentStory = stories[currentIndex]

  const nextStory = () => {
    setCurrentIndex((prev) => (prev + 1) % stories.length)
  }

  const prevStory = () => {
    setCurrentIndex((prev) => (prev - 1 + stories.length) % stories.length)
  }

  return (
    <div className="w-full">
      <div className="text-center mb-8">
        <h2 className="text-3xl md:text-4xl font-bold text-white mb-3">
          Success Stories
        </h2>
        <p className="text-lg text-yellow-300 max-w-2xl mx-auto">
          Real impact from real people in our community
        </p>
      </div>

      <div className="relative">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentIndex}
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -50 }}
            transition={{ duration: 0.3 }}
            className="bg-gradient-to-br from-navy-800/90 to-navy-900/90 rounded-xl p-6 md:p-8 border-2 border-yellow-400/30 backdrop-blur-sm"
          >
            {/* Story Header */}
            <div className="flex items-start gap-4 mb-6">
              <div className="text-5xl">{currentStory.avatar}</div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <h3 className="text-xl font-bold text-white">{currentStory.name}</h3>
                  <span className="px-3 py-1 bg-yellow-400/20 text-yellow-400 text-xs font-semibold rounded-full border border-yellow-400/30">
                    {currentStory.role}
                  </span>
                </div>
                <p className="text-sm text-yellow-300/80 flex items-center gap-1">
                  <span>📍</span> {currentStory.location}
                </p>
                <div className="flex items-center gap-1 mt-2">
                  {[...Array(currentStory.rating)].map((_, i) => (
                    <Star key={i} className="h-4 w-4 text-yellow-400 fill-yellow-400" />
                  ))}
                </div>
              </div>
            </div>

            {/* Quote */}
            <div className="mb-6">
              <Quote className="h-8 w-8 text-yellow-400/50 mb-3" />
              <p className="text-lg text-yellow-200 leading-relaxed italic">
                "{currentStory.quote}"
              </p>
            </div>

            {/* Impact Metrics */}
            <div className="bg-gradient-to-br from-yellow-500/20 to-yellow-400/10 rounded-xl p-5 border border-yellow-400/20">
              <div className="flex items-center gap-2 mb-4">
                <TrendingUp className="h-5 w-5 text-yellow-400" />
                <h4 className="text-sm font-semibold text-yellow-400 uppercase tracking-wide">
                  Impact Achieved
                </h4>
              </div>
              <p className="text-lg font-bold text-white mb-4">{currentStory.highlight}</p>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {Object.entries(currentStory.impact).map(([key, value]) => (
                  <div
                    key={key}
                    className="bg-navy-900/50 rounded-lg p-3 text-center border border-navy-700/50"
                  >
                    <p className="text-2xl font-bold text-white">{value}</p>
                    <p className="text-xs text-yellow-200/80 mt-1 capitalize">
                      {key.replace(/([A-Z])/g, ' $1').trim()}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        </AnimatePresence>

        {/* Navigation */}
        <div className="flex items-center justify-between mt-6">
          <button
            onClick={prevStory}
            className="flex items-center gap-2 px-4 py-2 bg-navy-800/50 hover:bg-navy-700/70 text-white rounded-lg border border-navy-700 transition-all"
          >
            <ArrowLeft className="h-4 w-4" />
            <span className="hidden sm:inline">Previous</span>
          </button>

          {/* Story Indicators */}
          <div className="flex gap-2">
            {stories.map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentIndex(index)}
                className={`h-2 rounded-full transition-all ${
                  index === currentIndex
                    ? 'w-8 bg-yellow-400'
                    : 'w-2 bg-navy-700 hover:bg-navy-600'
                }`}
                aria-label={`Go to story ${index + 1}`}
              />
            ))}
          </div>

          <button
            onClick={nextStory}
            className="flex items-center gap-2 px-4 py-2 bg-navy-800/50 hover:bg-navy-700/70 text-white rounded-lg border border-navy-700 transition-all"
          >
            <span className="hidden sm:inline">Next</span>
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Community Stats */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        className="mt-8 grid grid-cols-2 md:grid-cols-4 gap-4"
      >
        <div className="bg-navy-800/50 rounded-lg p-4 text-center border border-navy-700/50">
          <Users className="h-6 w-6 text-blue-400 mx-auto mb-2" />
          <p className="text-2xl font-bold text-white">10,000+</p>
          <p className="text-xs text-yellow-200/80 mt-1">Active Users</p>
        </div>
        <div className="bg-navy-800/50 rounded-lg p-4 text-center border border-navy-700/50">
          <Heart className="h-6 w-6 text-pink-400 mx-auto mb-2" />
          <p className="text-2xl font-bold text-white">50,000+</p>
          <p className="text-xs text-yellow-200/80 mt-1">Families Helped</p>
        </div>
        <div className="bg-navy-800/50 rounded-lg p-4 text-center border border-navy-700/50">
          <TrendingUp className="h-6 w-6 text-green-400 mx-auto mb-2" />
          <p className="text-2xl font-bold text-white">2,000+</p>
          <p className="text-xs text-yellow-200/80 mt-1">Volunteers</p>
        </div>
        <div className="bg-navy-800/50 rounded-lg p-4 text-center border border-navy-700/50">
          <Star className="h-6 w-6 text-yellow-400 mx-auto mb-2" />
          <p className="text-2xl font-bold text-white">4.9/5</p>
          <p className="text-xs text-yellow-200/80 mt-1">Average Rating</p>
        </div>
      </motion.div>
    </div>
  )
}

export default SuccessStories

