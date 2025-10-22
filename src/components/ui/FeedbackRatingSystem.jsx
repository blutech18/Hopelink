import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Star, 
  MessageSquare, 
  Send, 
  TrendingUp, 
  Award,
  Users,
  CheckCircle,
  X,
  ThumbsUp,
  BarChart3
} from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import { useToast } from '../../contexts/ToastContext'
import { db } from '../../lib/supabase'
import LoadingSpinner from './LoadingSpinner'

const FeedbackRatingSystem = () => {
  const { user, profile } = useAuth()
  const { success, error } = useToast()
  const [loading, setLoading] = useState(true)
  const [completedTransactions, setCompletedTransactions] = useState([])
  const [selectedTransaction, setSelectedTransaction] = useState(null)
  const [showFeedbackModal, setShowFeedbackModal] = useState(false)
  const [performanceMetrics, setPerformanceMetrics] = useState(null)
  const [rating, setRating] = useState(0)
  const [hoveredRating, setHoveredRating] = useState(0)
  const [feedbackText, setFeedbackText] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (user) {
      loadData()
    }
  }, [user])

  const loadData = async () => {
    try {
      setLoading(true)
      await Promise.all([
        loadCompletedTransactions(),
        loadPerformanceMetrics()
      ])
    } catch (err) {
      console.error('Error loading feedback data:', err)
      error('Failed to load feedback data')
    } finally {
      setLoading(false)
    }
  }

  const loadCompletedTransactions = async () => {
    try {
      // Get completed transactions from the last 30 days that haven't been rated
      const thirtyDaysAgo = new Date()
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

      const transactions = await db.getCompletedTransactionsForFeedback(
        user.id,
        thirtyDaysAgo.toISOString()
      )
      setCompletedTransactions(transactions || [])
    } catch (err) {
      console.error('Error loading transactions:', err)
    }
  }

  const loadPerformanceMetrics = async () => {
    try {
      const metrics = await db.getUserPerformanceMetrics(user.id)
      setPerformanceMetrics(metrics)
    } catch (err) {
      console.error('Error loading performance metrics:', err)
    }
  }

  const handleSubmitFeedback = async (e) => {
    e.preventDefault()
    
    if (rating === 0) {
      error('Please select a rating')
      return
    }

    if (!feedbackText.trim()) {
      error('Please provide feedback comments')
      return
    }

    try {
      setSubmitting(true)

      const feedbackData = {
        transaction_id: selectedTransaction.id,
        transaction_type: selectedTransaction.type,
        rater_id: user.id,
        rated_user_id: selectedTransaction.other_user_id,
        rating: rating,
        feedback: feedbackText.trim(),
        created_at: new Date().toISOString()
      }

      await db.submitFeedback(feedbackData)
      
      // Update user rating
      await db.updateUserRating(selectedTransaction.other_user_id)

      success('Feedback submitted successfully!')
      setShowFeedbackModal(false)
      setRating(0)
      setFeedbackText('')
      setSelectedTransaction(null)
      
      // Reload data
      await loadData()
    } catch (err) {
      console.error('Error submitting feedback:', err)
      error('Failed to submit feedback. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  const openFeedbackModal = (transaction) => {
    setSelectedTransaction(transaction)
    setShowFeedbackModal(true)
  }

  const getRatingLabel = (rating) => {
    if (rating === 5) return 'Excellent'
    if (rating === 4) return 'Good'
    if (rating === 3) return 'Average'
    if (rating === 2) return 'Poor'
    if (rating === 1) return 'Very Poor'
    return 'Select Rating'
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
      {/* Performance Metrics Dashboard */}
      {performanceMetrics && (
        <div className="card p-6 border border-gray-600 rounded-lg" style={{backgroundColor: '#001a5c'}}>
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-yellow-500/10 rounded-lg">
              <BarChart3 className="h-6 w-6 text-yellow-400" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-white">Platform Performance Overview</h3>
              <p className="text-sm text-gray-400">Real-time satisfaction and engagement data</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Average Rating */}
            <div className="bg-navy-700/50 rounded-lg p-4 border border-navy-600">
              <div className="flex items-center gap-2 mb-2">
                <Star className="h-5 w-5 text-yellow-400 fill-yellow-400" />
                <span className="text-sm text-gray-400">Average Rating</span>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-bold text-white">
                  {performanceMetrics.average_rating?.toFixed(1) || '0.0'}
                </span>
                <span className="text-sm text-gray-400">/ 5.0</span>
              </div>
              <div className="flex items-center gap-1 mt-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <Star
                    key={star}
                    className={`h-4 w-4 ${
                      star <= Math.round(performanceMetrics.average_rating || 0)
                        ? 'text-yellow-400 fill-yellow-400'
                        : 'text-gray-600'
                    }`}
                  />
                ))}
              </div>
            </div>

            {/* Total Feedback */}
            <div className="bg-navy-700/50 rounded-lg p-4 border border-navy-600">
              <div className="flex items-center gap-2 mb-2">
                <MessageSquare className="h-5 w-5 text-blue-400" />
                <span className="text-sm text-gray-400">Total Feedback</span>
              </div>
              <div className="text-3xl font-bold text-white">
                {performanceMetrics.total_feedback || 0}
              </div>
              <p className="text-xs text-gray-400 mt-2">Received reviews</p>
            </div>

            {/* Positive Rate */}
            <div className="bg-navy-700/50 rounded-lg p-4 border border-navy-600">
              <div className="flex items-center gap-2 mb-2">
                <ThumbsUp className="h-5 w-5 text-green-400" />
                <span className="text-sm text-gray-400">Positive Rate</span>
              </div>
              <div className="text-3xl font-bold text-white">
                {performanceMetrics.positive_rate || 0}%
              </div>
              <p className="text-xs text-gray-400 mt-2">4+ star ratings</p>
            </div>

            {/* Completed Transactions */}
            <div className="bg-navy-700/50 rounded-lg p-4 border border-navy-600">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle className="h-5 w-5 text-green-400" />
                <span className="text-sm text-gray-400">Completed</span>
              </div>
              <div className="text-3xl font-bold text-white">
                {performanceMetrics.completed_transactions || 0}
              </div>
              <p className="text-xs text-gray-400 mt-2">Total transactions</p>
            </div>
          </div>

          {/* Satisfaction Trend */}
          {performanceMetrics.satisfaction_trend && (
            <div className="mt-4 p-4 bg-navy-700/30 rounded-lg border border-navy-600">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-green-400" />
                  <span className="text-sm font-medium text-white">Satisfaction Trend</span>
                </div>
                <span className={`text-sm font-semibold ${
                  performanceMetrics.satisfaction_trend === 'improving' 
                    ? 'text-green-400' 
                    : performanceMetrics.satisfaction_trend === 'declining'
                    ? 'text-red-400'
                    : 'text-yellow-400'
                }`}>
                  {performanceMetrics.satisfaction_trend === 'improving' && '↑ Improving'}
                  {performanceMetrics.satisfaction_trend === 'declining' && '↓ Declining'}
                  {performanceMetrics.satisfaction_trend === 'stable' && '→ Stable'}
                </span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Pending Feedback Section */}
      <div className="card p-6 border border-gray-600 rounded-lg" style={{backgroundColor: '#001a5c'}}>
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-yellow-500/10 rounded-lg">
            <MessageSquare className="h-6 w-6 text-yellow-400" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-white">User Feedback Submissions</h3>
            <p className="text-sm text-gray-400">Track and monitor feedback from all platform users</p>
          </div>
        </div>

        {completedTransactions.length === 0 ? (
          <div className="text-center py-8">
            <Award className="h-12 w-12 text-gray-600 mx-auto mb-3" />
            <p className="text-gray-400">No pending feedback at the moment</p>
            <p className="text-sm text-gray-500 mt-1">Complete transactions will appear here for rating</p>
          </div>
        ) : (
          <div className="space-y-3">
            {completedTransactions.map((transaction) => (
              <div
                key={transaction.id}
                className="bg-navy-700/50 rounded-lg p-4 border border-navy-600 hover:border-yellow-400/40 transition-all"
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <h4 className="font-semibold text-white mb-1">{transaction.title}</h4>
                    <div className="flex items-center gap-4 text-sm text-gray-400">
                      <span className="flex items-center gap-1">
                        <Users className="h-4 w-4" />
                        {transaction.other_user_name}
                      </span>
                      <span>Completed: {new Date(transaction.completed_at).toLocaleDateString()}</span>
                      <span className="text-yellow-400">{transaction.type}</span>
                    </div>
                  </div>
                  <button
                    onClick={() => openFeedbackModal(transaction)}
                    className="px-4 py-2 bg-yellow-600 hover:bg-yellow-700 text-white rounded-lg transition-colors flex items-center gap-2 font-medium"
                  >
                    <Star className="h-4 w-4" />
                    Rate Now
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Feedback Modal */}
      <AnimatePresence>
        {showFeedbackModal && selectedTransaction && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.2 }}
              className="bg-navy-900 border-2 border-yellow-500/30 shadow-2xl rounded-xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col"
            >
              {/* Header */}
              <div className="flex items-center justify-between p-6 border-b-2 border-yellow-500/20 flex-shrink-0">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-yellow-500/10 rounded-lg">
                    <Star className="h-6 w-6 text-yellow-400" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-white">Rate Transaction</h3>
                    <p className="text-xs text-yellow-300">Share your experience</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowFeedbackModal(false)}
                  className="text-gray-400 hover:text-white transition-colors p-2 hover:bg-navy-800 rounded-lg"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Content */}
              <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
                <form onSubmit={handleSubmitFeedback} className="space-y-6">
                  {/* Transaction Info */}
                  <div className="bg-navy-800/50 rounded-lg p-4 border border-navy-700">
                    <h4 className="font-semibold text-white mb-2">{selectedTransaction.title}</h4>
                    <div className="flex items-center gap-4 text-sm text-gray-400">
                      <span className="flex items-center gap-1">
                        <Users className="h-4 w-4" />
                        {selectedTransaction.other_user_name}
                      </span>
                      <span className="text-yellow-400">{selectedTransaction.type}</span>
                    </div>
                  </div>

                  {/* Rating Selection */}
                  <div>
                    <label className="block text-sm font-medium text-white mb-3">
                      Your Rating *
                    </label>
                    <div className="flex items-center gap-2 mb-2">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <button
                          key={star}
                          type="button"
                          onClick={() => setRating(star)}
                          onMouseEnter={() => setHoveredRating(star)}
                          onMouseLeave={() => setHoveredRating(0)}
                          className="transition-transform hover:scale-110"
                        >
                          <Star
                            className={`h-10 w-10 ${
                              star <= (hoveredRating || rating)
                                ? 'text-yellow-400 fill-yellow-400'
                                : 'text-gray-600'
                            }`}
                          />
                        </button>
                      ))}
                    </div>
                    <p className="text-sm text-yellow-300 font-medium">
                      {getRatingLabel(hoveredRating || rating)}
                    </p>
                  </div>

                  {/* Feedback Text */}
                  <div>
                    <label className="block text-sm font-medium text-white mb-2">
                      Your Feedback *
                    </label>
                    <textarea
                      value={feedbackText}
                      onChange={(e) => setFeedbackText(e.target.value)}
                      maxLength={500}
                      className="input h-32 resize-none"
                      placeholder="Share your experience with this transaction..."
                      required
                    />
                    <p className="text-xs text-gray-400 mt-1">
                      {feedbackText.length} / 500 characters
                    </p>
                  </div>
                </form>
              </div>

              {/* Footer */}
              <div className="flex items-center justify-end gap-3 p-6 border-t-2 border-yellow-500/20 flex-shrink-0">
                <button
                  onClick={() => setShowFeedbackModal(false)}
                  className="px-5 py-2.5 bg-navy-700 hover:bg-navy-600 text-yellow-300 rounded-lg transition-colors font-medium border border-navy-600"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSubmitFeedback}
                  disabled={submitting || rating === 0 || !feedbackText.trim()}
                  className="px-5 py-2.5 bg-yellow-600 hover:bg-yellow-700 text-white rounded-lg transition-colors flex items-center gap-2 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {submitting ? (
                    <LoadingSpinner size="sm" />
                  ) : (
                    <>
                      <Send className="h-4 w-4" />
                      Submit Feedback
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default FeedbackRatingSystem
