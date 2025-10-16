import React, { useState, useEffect } from 'react'
import { GoogleMap, Marker, DirectionsRenderer } from '@react-google-maps/api'
import { MapPin, Navigation, Clock, Package, Users, Zap } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import { db } from '../../lib/supabase'
import { useToast } from '../../contexts/ToastContext'

const RouteOptimizationPanel = ({ 
  isOpen, 
  onClose, 
  deliveries = [], 
  onDeliverySelect 
}) => {
  const { user } = useAuth()
  const { showToast } = useToast()
  const [optimizedRoute, setOptimizedRoute] = useState(null)
  const [routeStats, setRouteStats] = useState(null)
  const [isOptimizing, setIsOptimizing] = useState(false)
  const [selectedDelivery, setSelectedDelivery] = useState(null)
  const [currentLocation, setCurrentLocation] = useState(null)

  const mapContainerStyle = {
    width: '100%',
    height: '500px',
    borderRadius: '8px'
  }

  const center = {
    lat: 14.5995,
    lng: 120.9842
  }

  useEffect(() => {
    if (isOpen && deliveries.length > 0) {
      getCurrentLocation()
      optimizeRoute()
    }
  }, [isOpen, deliveries])

  const getCurrentLocation = () => {
    if (!navigator.geolocation) return

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setCurrentLocation({
          lat: position.coords.latitude,
          lng: position.coords.longitude
        })
      },
      (error) => {
        console.error('Error getting location:', error)
      }
    )
  }

  const optimizeRoute = async () => {
    if (deliveries.length === 0) return

    setIsOptimizing(true)
    try {
      // Create waypoints for optimization
      const waypoints = deliveries.map(delivery => ({
        location: delivery.delivery_address,
        stopover: true
      }))

      const directionsService = new window.google.maps.DirectionsService()
      
      const request = {
        origin: currentLocation || deliveries[0].pickup_location,
        destination: deliveries[deliveries.length - 1].delivery_address,
        waypoints: waypoints.slice(0, -1), // Remove last waypoint as it's the destination
        optimizeWaypoints: true,
        travelMode: window.google.maps.TravelMode.DRIVING,
        avoidHighways: false,
        avoidTolls: false
      }

      directionsService.route(request, (result, status) => {
        if (status === window.google.maps.DirectionsStatus.OK) {
          setOptimizedRoute(result)
          calculateRouteStats(result)
        } else {
          console.error('Route optimization failed:', status)
          showToast('Unable to optimize route', 'error')
        }
        setIsOptimizing(false)
      })
    } catch (error) {
      console.error('Error optimizing route:', error)
      showToast('Error optimizing route', 'error')
      setIsOptimizing(false)
    }
  }

  const calculateRouteStats = (route) => {
    const totalDistance = route.routes[0].legs.reduce((sum, leg) => sum + leg.distance.value, 0)
    const totalDuration = route.routes[0].legs.reduce((sum, leg) => sum + leg.duration.value, 0)
    
    setRouteStats({
      totalDistance: (totalDistance / 1000).toFixed(1) + ' km',
      totalDuration: Math.round(totalDuration / 60) + ' minutes',
      deliveryCount: deliveries.length,
      estimatedFuelCost: calculateFuelCost(totalDistance / 1000)
    })
  }

  const calculateFuelCost = (distanceKm) => {
    const fuelEfficiency = 12 // km per liter
    const fuelPrice = 60 // pesos per liter
    const fuelUsed = distanceKm / fuelEfficiency
    return '₱' + (fuelUsed * fuelPrice).toFixed(2)
  }

  const getDeliveryStatusColor = (status) => {
    switch (status) {
      case 'assigned': return 'bg-blue-100 text-blue-800'
      case 'in_transit': return 'bg-yellow-100 text-yellow-800'
      case 'arrived': return 'bg-green-100 text-green-800'
      case 'completed': return 'bg-gray-100 text-gray-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'high': return 'text-red-600'
      case 'medium': return 'text-yellow-600'
      case 'low': return 'text-green-600'
      default: return 'text-gray-600'
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-6xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Route Optimization</h2>
            <p className="text-sm text-gray-600">
              Optimized route for {deliveries.length} deliveries
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Route Stats */}
          {routeStats && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-blue-50 p-4 rounded-lg">
                <div className="flex items-center space-x-2">
                  <Navigation className="w-5 h-5 text-blue-600" />
                  <span className="text-sm font-medium text-blue-900">Total Distance</span>
                </div>
                <p className="text-lg font-semibold text-blue-900 mt-1">
                  {routeStats.totalDistance}
                </p>
              </div>

              <div className="bg-green-50 p-4 rounded-lg">
                <div className="flex items-center space-x-2">
                  <Clock className="w-5 h-5 text-green-600" />
                  <span className="text-sm font-medium text-green-900">Est. Time</span>
                </div>
                <p className="text-lg font-semibold text-green-900 mt-1">
                  {routeStats.totalDuration}
                </p>
              </div>

              <div className="bg-purple-50 p-4 rounded-lg">
                <div className="flex items-center space-x-2">
                  <Package className="w-5 h-5 text-purple-600" />
                  <span className="text-sm font-medium text-purple-900">Deliveries</span>
                </div>
                <p className="text-lg font-semibold text-purple-900 mt-1">
                  {routeStats.deliveryCount}
                </p>
              </div>

              <div className="bg-orange-50 p-4 rounded-lg">
                <div className="flex items-center space-x-2">
                  <Zap className="w-5 h-5 text-orange-600" />
                  <span className="text-sm font-medium text-orange-900">Fuel Cost</span>
                </div>
                <p className="text-lg font-semibold text-orange-900 mt-1">
                  {routeStats.estimatedFuelCost}
                </p>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Map */}
            <div className="lg:col-span-2">
              <div className="relative">
                {/* Google Maps is loaded globally in main.jsx */}
                <GoogleMap
                    mapContainerStyle={mapContainerStyle}
                    center={center}
                    zoom={12}
                    options={{
                      disableDefaultUI: false,
                      zoomControl: true,
                      streetViewControl: false,
                      mapTypeControl: false,
                      fullscreenControl: true
                    }}
                  >
                    {/* Current Location Marker */}
                    {currentLocation && (
                      <Marker
                        position={currentLocation}
                        title="Your Location"
                        icon={{
                          url: 'https://maps.google.com/mapfiles/ms/icons/blue-dot.png'
                        }}
                      />
                    )}

                    {/* Delivery Markers */}
                    {deliveries.map((delivery, index) => (
                      <Marker
                        key={delivery.id}
                        position={delivery.delivery_address}
                        title={`Delivery ${index + 1}: ${delivery.item_title}`}
                        icon={{
                          url: 'https://maps.google.com/mapfiles/ms/icons/red-dot.png'
                        }}
                        onClick={() => setSelectedDelivery(delivery)}
                      />
                    ))}

                    {/* Optimized Route */}
                    {optimizedRoute && (
                      <DirectionsRenderer directions={optimizedRoute} />
                    )}
                </GoogleMap>

                {isOptimizing && (
                  <div className="absolute inset-0 bg-white bg-opacity-75 flex items-center justify-center">
                    <div className="text-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
                      <p className="text-sm text-gray-600">Optimizing route...</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Delivery List */}
            <div className="space-y-4">
              <h3 className="font-semibold text-gray-900">Delivery Sequence</h3>
              
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {deliveries.map((delivery, index) => (
                  <div
                    key={delivery.id}
                    className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                      selectedDelivery?.id === delivery.id
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                    onClick={() => setSelectedDelivery(delivery)}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center space-x-2">
                        <div className="w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs font-medium">
                          {index + 1}
                        </div>
                        <span className="text-sm font-medium text-gray-900">
                          Delivery {index + 1}
                        </span>
                      </div>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getDeliveryStatusColor(delivery.status)}`}>
                        {delivery.status.replace('_', ' ')}
                      </span>
                    </div>

                    <div className="space-y-1">
                      <p className="text-sm text-gray-600 font-medium">
                        {delivery.item_title}
                      </p>
                      <p className="text-xs text-gray-500">
                        {delivery.delivery_address?.address || 'Address not available'}
                      </p>
                      <div className="flex items-center space-x-2 mt-2">
                        <span className={`text-xs font-medium ${getPriorityColor(delivery.priority)}`}>
                          {delivery.priority} priority
                        </span>
                        {delivery.estimated_delivery_time && (
                          <span className="text-xs text-gray-500">
                            ETA: {delivery.estimated_delivery_time}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="mt-3 flex space-x-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          onDeliverySelect?.(delivery)
                        }}
                        className="flex-1 bg-blue-600 text-white px-3 py-1 rounded text-xs hover:bg-blue-700 transition-colors"
                      >
                        Track Delivery
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          // Call recipient
                          if (delivery.recipient_phone) {
                            window.open(`tel:${delivery.recipient_phone}`)
                          }
                        }}
                        className="px-3 py-1 border border-gray-300 text-gray-700 rounded text-xs hover:bg-gray-50 transition-colors"
                      >
                        <Phone className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex space-x-4">
            <button
              onClick={optimizeRoute}
              disabled={isOptimizing}
              className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center justify-center space-x-2"
            >
              <Zap className="w-4 h-4" />
              <span>{isOptimizing ? 'Optimizing...' : 'Re-optimize Route'}</span>
            </button>
            
            <button
              onClick={() => {
                // Export route to external navigation app
                if (optimizedRoute) {
                  const waypoints = optimizedRoute.routes[0].waypoint_order
                  const orderedDeliveries = waypoints.map(index => deliveries[index])
                  const addresses = orderedDeliveries.map(d => d.delivery_address?.address).join(' to ')
                  const googleMapsUrl = `https://www.google.com/maps/dir/${addresses}`
                  window.open(googleMapsUrl, '_blank')
                }
              }}
              className="flex-1 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors flex items-center justify-center space-x-2"
            >
              <Navigation className="w-4 h-4" />
              <span>Open in Maps</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default RouteOptimizationPanel
