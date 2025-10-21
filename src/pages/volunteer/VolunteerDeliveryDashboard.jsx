import React, { useState, useEffect } from 'react'
import { MapPin, Navigation, Clock, Package, Users, AlertCircle, CheckCircle, Phone, MessageCircle, Zap } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import { db } from '../../lib/supabase'
import { useToast } from '../../contexts/ToastContext'
import DeliveryTrackingModal from '../../components/ui/DeliveryTrackingModal'
import RouteOptimizationPanel from '../../components/ui/RouteOptimizationPanel'

const VolunteerDeliveryDashboard = () => {
  const { user, profile } = useAuth()
  const { success, error } = useToast()
  const [deliveries, setDeliveries] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [selectedDelivery, setSelectedDelivery] = useState(null)
  const [showTrackingModal, setShowTrackingModal] = useState(false)
  const [showRouteOptimization, setShowRouteOptimization] = useState(false)
  const [stats, setStats] = useState({
    totalDeliveries: 0,
    completedToday: 0,
    inProgress: 0,
    pending: 0
  })

  useEffect(() => {
    if (user && profile?.role === 'volunteer') {
      loadDeliveries()
      loadStats()
    }
  }, [user, profile])

  const loadDeliveries = async () => {
    try {
      setIsLoading(true)
      const volunteerDeliveries = await db.getDeliveries({
        volunteer_id: user.id,
        status: ['assigned', 'accepted', 'picked_up', 'in_transit']
      })
      setDeliveries(volunteerDeliveries)
    } catch (err) {
      console.error('Error loading deliveries:', err)
      error('Failed to load deliveries')
    } finally {
      setIsLoading(false)
    }
  }

  const loadStats = async () => {
    try {
      const volunteerStats = await db.getVolunteerStats(user.id)
      setStats(volunteerStats)
    } catch (err) {
      console.error('Error loading stats:', err)
    }
  }

  const handleDeliverySelect = (delivery) => {
    setSelectedDelivery(delivery)
    setShowTrackingModal(true)
  }

  const handleDeliveryComplete = (deliveryId) => {
    // Remove completed delivery from list
    setDeliveries(prev => prev.filter(d => d.id !== deliveryId))
    // Reload stats
    loadStats()
    success('Delivery completed successfully!')
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'assigned': return 'text-blue-400 bg-blue-900/20 border-blue-500/20'
      case 'in_transit': return 'text-yellow-400 bg-yellow-900/20 border-yellow-500/20'
      case 'arrived': return 'text-green-400 bg-green-900/20 border-green-500/20'
      case 'completed': return 'text-gray-300 bg-gray-900/20 border-gray-500/20'
      default: return 'text-gray-300 bg-gray-900/20 border-gray-500/20'
    }
  }

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'high': return 'text-red-400'
      case 'medium': return 'text-yellow-300'
      case 'low': return 'text-green-400'
      default: return 'text-gray-400'
    }
  }

  const getUrgencyColor = (urgency) => {
    switch (urgency) {
      case 'urgent': return 'text-red-400'
      case 'high': return 'text-orange-400'
      case 'medium': return 'text-yellow-300'
      case 'low': return 'text-green-400'
      default: return 'text-gray-400'
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Delivery Dashboard</h1>
          <p className="text-yellow-200">Manage your delivery assignments</p>
        </div>
        
        {deliveries.length > 1 && (
          <button
            onClick={() => setShowRouteOptimization(true)}
            className="bg-skyblue-600 hover:bg-skyblue-700 text-white px-4 py-2 rounded-lg transition-colors flex items-center space-x-2"
          >
            <Navigation className="w-4 h-4" />
            <span>Optimize Route</span>
          </button>
        )}
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="p-6 rounded-lg border border-gray-600" style={{backgroundColor: '#001a5c'}}>
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-navy-800 rounded-lg">
              <Package className="w-6 h-6 text-yellow-300" />
            </div>
            <div>
              <p className="text-sm font-medium text-yellow-200">Total Deliveries</p>
              <p className="text-2xl font-bold text-white">{stats.totalDeliveries}</p>
            </div>
          </div>
        </div>

        <div className="p-6 rounded-lg border border-gray-600" style={{backgroundColor: '#001a5c'}}>
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-navy-800 rounded-lg">
              <CheckCircle className="w-6 h-6 text-yellow-300" />
            </div>
            <div>
              <p className="text-sm font-medium text-yellow-200">Completed Today</p>
              <p className="text-2xl font-bold text-white">{stats.completedToday}</p>
            </div>
          </div>
        </div>

        <div className="p-6 rounded-lg border border-gray-600" style={{backgroundColor: '#001a5c'}}>
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-navy-800 rounded-lg">
              <Navigation className="w-6 h-6 text-yellow-300" />
            </div>
            <div>
              <p className="text-sm font-medium text-yellow-200">In Progress</p>
              <p className="text-2xl font-bold text-white">{stats.inProgress}</p>
            </div>
          </div>
        </div>

        <div className="p-6 rounded-lg border border-gray-600" style={{backgroundColor: '#001a5c'}}>
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-navy-800 rounded-lg">
              <Clock className="w-6 h-6 text-yellow-300" />
            </div>
            <div>
              <p className="text-sm font-medium text-yellow-200">Pending</p>
              <p className="text-2xl font-bold text-white">{stats.pending}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Deliveries List */}
      <div className="rounded-lg border border-gray-600" style={{backgroundColor: '#001a5c'}}>
        <div className="p-6 border-b border-navy-700">
          <h2 className="text-lg font-semibold text-white">Active Deliveries</h2>
          <p className="text-sm text-yellow-200">
            {deliveries.length} delivery{deliveries.length !== 1 ? 's' : ''} assigned
          </p>
        </div>

        {deliveries.length === 0 ? (
          <div className="p-12 text-center">
            <Package className="w-12 h-12 text-yellow-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-white mb-2">No Active Deliveries</h3>
            <p className="text-yellow-200">You don't have any delivery assignments at the moment.</p>
          </div>
        ) : (
          <div className="divide-y divide-navy-700">
            {deliveries.map((delivery) => (
              <div key={delivery.id} className="p-6 hover:bg-navy-800 transition-colors">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <h3 className="text-lg font-medium text-white">
                        {delivery.item_title}
                      </h3>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getStatusColor(delivery.status)}`}>
                        {delivery.status.replace('_', ' ')}
                      </span>
                      <span className={`text-xs font-medium ${getPriorityColor(delivery.priority)}`}>
                        {delivery.priority} priority
                      </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                      <div className="space-y-2">
                        <div className="flex items-center space-x-2">
                          <MapPin className="w-4 h-4 text-yellow-300" />
                          <span className="text-sm text-yellow-200">
                            <strong>Pickup:</strong> {delivery.pickup_location?.address || 'Address not available'}
                          </span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <MapPin className="w-4 h-4 text-yellow-300" />
                          <span className="text-sm text-yellow-200">
                            <strong>Delivery:</strong> {delivery.delivery_address?.address || 'Address not available'}
                          </span>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <div className="flex items-center space-x-2">
                          <Phone className="w-4 h-4 text-yellow-300" />
                          <span className="text-sm text-yellow-200">
                            <strong>Donor:</strong> {delivery.donor_phone || 'Phone not available'}
                          </span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Phone className="w-4 h-4 text-yellow-300" />
                          <span className="text-sm text-yellow-200">
                            <strong>Recipient:</strong> {delivery.recipient_phone || 'Phone not available'}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center space-x-4 text-sm text-yellow-200">
                      {delivery.estimated_delivery_time && (
                        <div className="flex items-center space-x-1">
                          <Clock className="w-4 h-4 text-yellow-300" />
                          <span>ETA: {delivery.estimated_delivery_time}</span>
                        </div>
                      )}
                      {delivery.urgency && (
                        <div className={`flex items-center space-x-1 ${getUrgencyColor(delivery.urgency)}`}>
                          <AlertCircle className="w-4 h-4" />
                          <span className="capitalize">{delivery.urgency} urgency</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex space-x-2">
                    <button
                      onClick={() => handleDeliverySelect(delivery)}
                      className="bg-skyblue-600 hover:bg-skyblue-700 text-white px-4 py-2 rounded-lg transition-colors flex items-center space-x-2"
                    >
                      <Navigation className="w-4 h-4" />
                      <span>Track</span>
                    </button>
                    
                    {delivery.recipient_phone && (
                      <button
                        onClick={() => window.open(`tel:${delivery.recipient_phone}`)}
                        className="px-4 py-2 border border-navy-700 text-yellow-200 rounded-lg hover:bg-navy-800 transition-colors flex items-center space-x-2"
                      >
                        <Phone className="w-4 h-4" />
                        <span>Call</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modals */}
      {selectedDelivery && (
        <DeliveryTrackingModal
          isOpen={showTrackingModal}
          onClose={() => {
            setShowTrackingModal(false)
            setSelectedDelivery(null)
          }}
          delivery={selectedDelivery}
          onDeliveryComplete={handleDeliveryComplete}
        />
      )}

      <RouteOptimizationPanel
        isOpen={showRouteOptimization}
        onClose={() => setShowRouteOptimization(false)}
        deliveries={deliveries}
        onDeliverySelect={handleDeliverySelect}
      />
    </div>
  )
}

export default VolunteerDeliveryDashboard
