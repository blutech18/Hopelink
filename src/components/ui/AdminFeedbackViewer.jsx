import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { 
  Star, 
  MessageSquare, 
  Users,
  Gift,
  Heart,
  Truck,
  TrendingUp,
  BarChart3,
  Calendar,
  Filter
} from 'lucide-react'
import { db } from '../../lib/supabase'
import LoadingSpinner from './LoadingSpinner'

const AdminFeedbackViewer = () => {
  const [loading, setLoading] = useState(true)
  const [allFeedback, setAllFeedback] = useState([])
  const [filteredFeedback, setFilteredFeedback] = useState([])
  const [roleFilter, setRoleFilter] = useState('all')
  const [stats, setStats] = useState({
    totalFeedback: 0,
    averageRating: 0,
    donorCount: 0,
    recipientCount: 0,
    volunteerCount: 0,
    donorAvg: 0,
    recipientAvg: 0,
    volunteerAvg: 0
  })

  useEffect(() => {
    loadAllFeedback()
  }, [])

  useEffect(() => {
    filterFeedback()
  }, [roleFilter, allFeedback])

  const loadAllFeedback = async () => {
    try {
      setLoading(true)
      const feedback = await db.getAllPlatformFeedback()
      setAllFeedback(feedback || [])
      calculateStats(feedback || [])
    } catch (err) {
      console.error('Error loading feedback:', err)
    } finally {
      setLoading(false)
    }
  }

  const calculateStats = (feedback) => {
    const totalFeedback = feedback.length
    const averageRating = totalFeedback > 0
      ? feedback.reduce((sum, f) => sum + f.rating, 0) / totalFeedback
      : 0

    const donorFeedback = feedback.filter(f => f.user_role === 'donor')
    const recipientFeedback = feedback.filter(f => f.user_role === 'recipient')
    const volunteerFeedback = feedback.filter(f => f.user_role === 'volunteer')

    const donorAvg = donorFeedback.length > 0
      ? donorFeedback.reduce((sum, f) => sum + f.rating, 0) / donorFeedback.length
      : 0
    const recipientAvg = recipientFeedback.length > 0
      ? recipientFeedback.reduce((sum, f) => sum + f.rating, 0) / recipientFeedback.length
      : 0
    const volunteerAvg = volunteerFeedback.length > 0
      ? volunteerFeedback.reduce((sum, f) => sum + f.rating, 0) / volunteerFeedback.length
      : 0

    setStats({
      totalFeedback,
      averageRating,
      donorCount: donorFeedback.length,
      recipientCount: recipientFeedback.length,
      volunteerCount: volunteerFeedback.length,
      donorAvg,
      recipientAvg,
      volunteerAvg
    })
  }

  const filterFeedback = () => {
    if (roleFilter === 'all') {
      setFilteredFeedback(allFeedback)
    } else {
      setFilteredFeedback(allFeedback.filter(f => f.user_role === roleFilter))
    }
  }

  const getRoleIcon = (role) => {
    if (role === 'donor') return Gift
    if (role === 'recipient') return Heart
    if (role === 'volunteer') return Truck
    return Users
  }

  const getRoleColor = (role) => {
    if (role === 'donor') return 'text-blue-400'
    if (role === 'recipient') return 'text-green-400'
    if (role === 'volunteer') return 'text-purple-400'
    return 'text-gray-400'
  }

  const getRoleBgColor = (role) => {
    if (role === 'donor') return 'bg-blue-500/10 border-blue-500/30'
    if (role === 'recipient') return 'bg-green-500/10 border-green-500/30'
    if (role === 'volunteer') return 'bg-purple-500/10 border-purple-500/30'
    return 'bg-gray-500/10 border-gray-500/30'
  }

  const getQuestionLabel = (questionId) => {
    const labels = {
      // Donor questions
      'ease_of_posting': 'Ease of Posting',
      'matching_quality': 'Matching Quality',
      'communication': 'Communication',
      // Recipient questions
      'ease_of_requesting': 'Ease of Requesting',
      'item_quality': 'Item Quality',
      'delivery_experience': 'Delivery Experience',
      // Volunteer questions
      'task_clarity': 'Task Clarity',
      'route_efficiency': 'Route Efficiency',
      'support': 'Platform Support'
    }
    return labels[questionId] || questionId
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Statistics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Feedback */}
        <div className="card p-4 border border-gray-600" style={{backgroundColor: '#001a5c'}}>
          <div className="flex items-center gap-2 mb-2">
            <MessageSquare className="h-5 w-5 text-yellow-400" />
            <span className="text-sm text-gray-400">Total Feedback</span>
          </div>
          <div className="text-3xl font-bold text-white">{stats.totalFeedback}</div>
          <div className="flex items-center gap-1 mt-2">
            <Star className="h-4 w-4 text-yellow-400 fill-yellow-400" />
            <span className="text-sm text-yellow-300">{stats.averageRating.toFixed(1)} avg</span>
          </div>
        </div>

        {/* Donor Feedback */}
        <div className="card p-4 border border-gray-600" style={{backgroundColor: '#001a5c'}}>
          <div className="flex items-center gap-2 mb-2">
            <Gift className="h-5 w-5 text-blue-400" />
            <span className="text-sm text-gray-400">Donors</span>
          </div>
          <div className="text-3xl font-bold text-white">{stats.donorCount}</div>
          <div className="flex items-center gap-1 mt-2">
            <Star className="h-4 w-4 text-yellow-400 fill-yellow-400" />
            <span className="text-sm text-yellow-300">{stats.donorAvg.toFixed(1)} avg</span>
          </div>
        </div>

        {/* Recipient Feedback */}
        <div className="card p-4 border border-gray-600" style={{backgroundColor: '#001a5c'}}>
          <div className="flex items-center gap-2 mb-2">
            <Heart className="h-5 w-5 text-green-400" />
            <span className="text-sm text-gray-400">Recipients</span>
          </div>
          <div className="text-3xl font-bold text-white">{stats.recipientCount}</div>
          <div className="flex items-center gap-1 mt-2">
            <Star className="h-4 w-4 text-yellow-400 fill-yellow-400" />
            <span className="text-sm text-yellow-300">{stats.recipientAvg.toFixed(1)} avg</span>
          </div>
        </div>

        {/* Volunteer Feedback */}
        <div className="card p-4 border border-gray-600" style={{backgroundColor: '#001a5c'}}>
          <div className="flex items-center gap-2 mb-2">
            <Truck className="h-5 w-5 text-purple-400" />
            <span className="text-sm text-gray-400">Volunteers</span>
          </div>
          <div className="text-3xl font-bold text-white">{stats.volunteerCount}</div>
          <div className="flex items-center gap-1 mt-2">
            <Star className="h-4 w-4 text-yellow-400 fill-yellow-400" />
            <span className="text-sm text-yellow-300">{stats.volunteerAvg.toFixed(1)} avg</span>
          </div>
        </div>
      </div>

      {/* Filter */}
      <div className="card p-4 sm:p-5 border border-gray-600" style={{backgroundColor: '#001a5c'}}>
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
          <div className="flex items-center gap-2 flex-shrink-0">
            <Filter className="h-5 w-5 text-yellow-400" />
            <span className="text-sm font-medium text-white whitespace-nowrap">Filter by Role:</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {['all', 'donor', 'recipient', 'volunteer'].map((role) => (
              <button
                key={role}
                onClick={() => setRoleFilter(role)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all active:scale-95 ${
                  roleFilter === role
                    ? 'bg-yellow-600 text-white shadow-lg'
                    : 'bg-navy-700 text-gray-300 hover:bg-navy-600'
                }`}
              >
                {role.charAt(0).toUpperCase() + role.slice(1)}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Feedback List */}
      <div className="space-y-4">
        {filteredFeedback.length === 0 ? (
          <div className="card p-8 border border-gray-600 text-center" style={{backgroundColor: '#001a5c'}}>
            <MessageSquare className="h-12 w-12 text-gray-600 mx-auto mb-3" />
            <p className="text-gray-400">No feedback found</p>
          </div>
        ) : (
          filteredFeedback.map((feedback, index) => {
            const RoleIcon = getRoleIcon(feedback.user_role)
            return (
              <motion.div
                key={feedback.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className="card p-4 sm:p-5 border border-gray-600" 
                style={{backgroundColor: '#001a5c'}}
              >
                {/* Header */}
                <div className="flex flex-col sm:flex-row items-start justify-between gap-3 mb-4">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className={`p-2 rounded-lg border ${getRoleBgColor(feedback.user_role)}`}>
                      <RoleIcon className={`h-5 w-5 ${getRoleColor(feedback.user_role)}`} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-white capitalize">
                          {feedback.user_role || 'User'}
                        </span>
                        <span className="text-xs text-gray-500">•</span>
                        <span className="text-xs text-gray-400">
                          {new Date(feedback.created_at).toLocaleDateString()}
                        </span>
                      </div>
                      <div className="flex items-center gap-1 mt-1">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <Star
                            key={star}
                            className={`h-4 w-4 ${
                              star <= feedback.rating
                                ? 'text-yellow-400 fill-yellow-400'
                                : 'text-gray-600'
                            }`}
                          />
                        ))}
                        <span className="text-sm text-yellow-300 ml-1">
                          {feedback.rating}/5
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Feedback Text */}
                <div className="mb-4">
                  <p className="text-gray-300 text-sm leading-relaxed break-words">
                    {feedback.feedback}
                  </p>
                </div>

                {/* Role-Specific Answers */}
                {feedback.role_specific_answers && Object.keys(feedback.role_specific_answers).length > 0 && (
                  <div className="bg-navy-900/50 rounded-lg p-3 sm:p-4 border border-navy-700">
                    <h4 className="text-xs font-semibold text-yellow-400 mb-3 uppercase">
                      Detailed Ratings
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                      {Object.entries(feedback.role_specific_answers).map(([key, value]) => (
                        <div key={key} className="flex items-center justify-between">
                          <span className="text-xs text-gray-400">
                            {getQuestionLabel(key)}
                          </span>
                          <div className="flex items-center gap-1">
                            {[1, 2, 3, 4, 5].map((star) => (
                              <Star
                                key={star}
                                className={`h-3 w-3 ${
                                  star <= value
                                    ? 'text-yellow-400 fill-yellow-400'
                                    : 'text-gray-600'
                                }`}
                              />
                            ))}
                            <span className="text-xs text-yellow-300 ml-1">{value}/5</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </motion.div>
            )
          })
        )}
      </div>
    </div>
  )
}

export default AdminFeedbackViewer
