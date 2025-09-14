import React, { useState, useEffect } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { useToast } from '../../contexts/ToastContext'
import { db } from '../../lib/supabase'
import LoadingSpinner from './LoadingSpinner'

const SmartMatchingPanel = ({ userRole, onMatchCreated }) => {
  const { user } = useAuth()
  const { addToast } = useToast()
  const [loading, setLoading] = useState(false)
  const [recommendations, setRecommendations] = useState([])
  const [selectedMatch, setSelectedMatch] = useState(null)
  const [showDetails, setShowDetails] = useState(false)

  useEffect(() => {
    if (user && userRole) {
      loadRecommendations()
    }
  }, [user, userRole])

  const loadRecommendations = async () => {
    try {
      setLoading(true)
      const result = await db.getMatchingRecommendations(user.id, userRole, 5)
      setRecommendations(result.recommendations)
    } catch (error) {
      console.error('Error loading recommendations:', error)
      addToast('Failed to load smart matching recommendations', 'error')
    } finally {
      setLoading(false)
    }
  }

  const handleCreateMatch = async (requestId, donationId, volunteerId = null) => {
    try {
      setLoading(true)
      const result = await db.createSmartMatch(requestId, donationId, volunteerId)
      
      if (result.success) {
        addToast('Smart match created successfully!', 'success')
        setSelectedMatch(null)
        setShowDetails(false)
        await loadRecommendations() // Refresh recommendations
        onMatchCreated?.(result.match)
      }
    } catch (error) {
      console.error('Error creating smart match:', error)
      addToast(error.message || 'Failed to create smart match', 'error')
    } finally {
      setLoading(false)
    }
  }

  const getMatchScore = (match) => {
    if (match.score !== undefined) return Math.round(match.score * 100)
    if (match.compatibility !== undefined) return Math.round(match.compatibility * 100)
    return 85 // Default score
  }

  const getScoreColor = (score) => {
    if (score >= 90) return 'text-green-600 bg-green-100'
    if (score >= 75) return 'text-blue-600 bg-blue-100'
    if (score >= 60) return 'text-yellow-600 bg-yellow-100'
    return 'text-red-600 bg-red-100'
  }

  const renderRecipientRecommendations = (recommendation) => (
    <div key={recommendation.request.id} className="bg-white rounded-lg border border-gray-200 p-4 mb-4">
      <div className="flex justify-between items-start mb-3">
        <div>
          <h4 className="font-semibold text-gray-900">{recommendation.request.title}</h4>
          <p className="text-sm text-gray-600">{recommendation.reason}</p>
        </div>
        <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
          {recommendation.topMatches.length} matches
        </span>
      </div>

      <div className="space-y-2">
        {recommendation.topMatches.map((match, index) => (
          <div key={match.donation.id} className="border border-gray-100 rounded-lg p-3">
            <div className="flex justify-between items-start">
              <div className="flex-1">
                <h5 className="font-medium text-gray-900">{match.donation.title}</h5>
                <p className="text-sm text-gray-600 mb-2">{match.donation.description}</p>
                <div className="flex items-center space-x-4 text-xs text-gray-500">
                  <span>📍 {match.donation.donor?.city || 'Location TBD'}</span>
                  <span>📦 Qty: {match.donation.quantity}</span>
                  <span>🚚 {match.donation.delivery_mode}</span>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${getScoreColor(getMatchScore(match))}`}>
                  {getMatchScore(match)}% match
                </span>
                <button
                  onClick={() => handleCreateMatch(recommendation.request.id, match.donation.id)}
                  disabled={loading}
                  className="px-3 py-1 bg-green-600 text-white text-xs rounded-md hover:bg-green-700 disabled:opacity-50"
                >
                  Claim
                </button>
              </div>
            </div>
            {match.matchReason && (
              <p className="text-xs text-gray-500 mt-2">💡 {match.matchReason}</p>
            )}
          </div>
        ))}
      </div>
    </div>
  )

  const renderDonorRecommendations = (recommendation) => (
    <div key={recommendation.donation.id} className="bg-white rounded-lg border border-gray-200 p-4 mb-4">
      <div className="flex justify-between items-start mb-3">
        <div>
          <h4 className="font-semibold text-gray-900">{recommendation.donation.title}</h4>
          <p className="text-sm text-gray-600">{recommendation.reason}</p>
        </div>
        <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">
          {recommendation.topMatches.length} requests
        </span>
      </div>

      <div className="space-y-2">
        {recommendation.topMatches.map((match, index) => (
          <div key={match.request.id} className="border border-gray-100 rounded-lg p-3">
            <div className="flex justify-between items-start">
              <div className="flex-1">
                <h5 className="font-medium text-gray-900">{match.request.title}</h5>
                <p className="text-sm text-gray-600 mb-2">{match.request.description}</p>
                <div className="flex items-center space-x-4 text-xs text-gray-500">
                  <span>📍 {match.request.location || 'Location TBD'}</span>
                  <span>📦 Need: {match.request.quantity_needed}</span>
                  <span className={`px-1 py-0.5 rounded text-xs ${
                    match.request.urgency === 'high' ? 'bg-red-100 text-red-800' :
                    match.request.urgency === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {match.request.urgency} priority
                  </span>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${getScoreColor(getMatchScore(match))}`}>
                  {getMatchScore(match)}% match
                </span>
                <button
                  onClick={() => {
                    setSelectedMatch({
                      type: 'donor_to_request',
                      donation: recommendation.donation,
                      request: match.request,
                      compatibility: match.compatibility
                    })
                    setShowDetails(true)
                  }}
                  className="px-3 py-1 bg-blue-600 text-white text-xs rounded-md hover:bg-blue-700"
                >
                  Match
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )

  const renderVolunteerRecommendations = (recommendation) => (
    <div key="volunteer-tasks" className="bg-white rounded-lg border border-gray-200 p-4 mb-4">
      <div className="flex justify-between items-start mb-3">
        <div>
          <h4 className="font-semibold text-gray-900">Available Volunteer Tasks</h4>
          <p className="text-sm text-gray-600">{recommendation.reason}</p>
        </div>
        <span className="px-2 py-1 bg-purple-100 text-purple-800 text-xs rounded-full">
          {recommendation.tasks.length} opportunities
        </span>
      </div>

      <div className="space-y-2">
        {recommendation.tasks.map((task, index) => (
          <div key={task.id} className="border border-gray-100 rounded-lg p-3">
            <div className="flex justify-between items-start">
              <div className="flex-1">
                <h5 className="font-medium text-gray-900">{task.title}</h5>
                <p className="text-sm text-gray-600 mb-2">{task.description}</p>
                <div className="flex items-center space-x-4 text-xs text-gray-500">
                  <span>📍 {task.pickupLocation || 'Pickup TBD'}</span>
                  <span>🚚 → {task.deliveryLocation || 'Delivery TBD'}</span>
                  <span className={`px-1 py-0.5 rounded text-xs ${
                    task.urgency === 'high' || task.urgency === 'critical' ? 'bg-red-100 text-red-800' :
                    task.urgency === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {task.urgency} priority
                  </span>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${getScoreColor(Math.round(task.score * 100))}`}>
                  {Math.round(task.score * 100)}% match
                </span>
                <button
                  onClick={() => {
                    // Handle volunteer task assignment
                    if (task.type === 'approved_donation' && task.claimId) {
                      handleVolunteerAssignment(task.claimId)
                    }
                  }}
                  className="px-3 py-1 bg-purple-600 text-white text-xs rounded-md hover:bg-purple-700"
                >
                  Volunteer
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )

  const handleVolunteerAssignment = async (claimId) => {
    try {
      setLoading(true)
      await db.assignVolunteerToDelivery(claimId, user.id)
      addToast('Successfully volunteered for delivery task!', 'success')
      await loadRecommendations()
    } catch (error) {
      console.error('Error volunteering for task:', error)
      addToast('Failed to volunteer for task', 'error')
    } finally {
      setLoading(false)
    }
  }

  if (loading && recommendations.length === 0) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex items-center justify-center">
          <LoadingSpinner />
          <span className="ml-2 text-gray-600">Finding smart matches...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-4 border border-blue-200">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 flex items-center">
              🤖 Smart Matching
              <span className="ml-2 px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                WSM Algorithm
              </span>
            </h3>
            <p className="text-sm text-gray-600 mt-1">
              AI-powered matching based on location, compatibility, urgency, and reliability
            </p>
          </div>
          <button
            onClick={loadRecommendations}
            disabled={loading}
            className="px-3 py-2 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? 'Updating...' : 'Refresh'}
          </button>
        </div>
      </div>

      {/* Recommendations */}
      {recommendations.length === 0 ? (
        <div className="bg-white rounded-lg border border-gray-200 p-6 text-center">
          <div className="text-gray-400 text-4xl mb-2">🔍</div>
          <h4 className="font-medium text-gray-900 mb-1">No Smart Matches Found</h4>
          <p className="text-sm text-gray-600">
            {userRole === 'recipient' && "Create a request to get personalized donation matches"}
            {userRole === 'donor' && "Post a donation to find recipients who need your items"}
            {userRole === 'volunteer' && "Check back later for new volunteer opportunities"}
          </p>
        </div>
      ) : (
        <div>
          {recommendations.map((recommendation) => {
            if (recommendation.type === 'donation_matches') {
              return renderRecipientRecommendations(recommendation)
            } else if (recommendation.type === 'request_matches') {
              return renderDonorRecommendations(recommendation)
            } else if (recommendation.type === 'volunteer_opportunities') {
              return renderVolunteerRecommendations(recommendation)
            }
            return null
          })}
        </div>
      )}

      {/* Match Details Modal */}
      {showDetails && selectedMatch && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold mb-4">Confirm Smart Match</h3>
            
            <div className="space-y-4 mb-6">
              <div>
                <h4 className="font-medium text-gray-900">Your Donation:</h4>
                <p className="text-sm text-gray-600">{selectedMatch.donation.title}</p>
              </div>
              
              <div>
                <h4 className="font-medium text-gray-900">Recipient's Request:</h4>
                <p className="text-sm text-gray-600">{selectedMatch.request.title}</p>
              </div>
              
              <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                <span className="text-sm font-medium text-green-800">Compatibility Score</span>
                <span className="text-lg font-bold text-green-600">
                  {Math.round(selectedMatch.compatibility * 100)}%
                </span>
              </div>
            </div>

            <div className="flex space-x-3">
              <button
                onClick={() => {
                  setShowDetails(false)
                  setSelectedMatch(null)
                }}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={() => handleCreateMatch(selectedMatch.request.id, selectedMatch.donation.id)}
                disabled={loading}
                className="flex-1 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50"
              >
                {loading ? 'Creating...' : 'Create Match'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default SmartMatchingPanel
