import React, { useState, useEffect, useRef } from 'react'
import { Marker, DirectionsRenderer, GoogleMap } from '@react-google-maps/api'
import { X, Navigation, Clock, MapPin, CheckCircle, AlertCircle, Phone, MessageCircle } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import { db } from '../../lib/supabase'
import { useToast } from '../../contexts/ToastContext'

const DeliveryTrackingModal = ({ 
  isOpen, 
  onClose, 
  delivery, 
  onDeliveryComplete 
}) => {
  const { user } = useAuth()
  const { showToast } = useToast()
  const [currentLocation, setCurrentLocation] = useState(null)
  const [directions, setDirections] = useState(null)
  const [isNavigating, setIsNavigating] = useState(false)
  const [deliveryStatus, setDeliveryStatus] = useState(delivery?.status || 'assigned')
  const [estimatedTime, setEstimatedTime] = useState(null)
  const [actualDistance, setActualDistance] = useState(null)
  const [isLoading, setIsLoading] = useState(false)
  const [showConfirmation, setShowConfirmation] = useState(false)
  const [deliveryNotes, setDeliveryNotes] = useState('')
  const [rating, setRating] = useState(5)
  const [feedback, setFeedback] = useState('')
  
  const mapRef = useRef(null)
  const directionsServiceRef = useRef(null)
  const watchIdRef = useRef(null)

  const mapContainerStyle = {
    width: '100%',
    height: '400px',
    borderRadius: '8px'
  }

  const center = {
    lat: delivery?.pickup_location?.lat || 14.5995,
    lng: delivery?.pickup_location?.lng || 120.9842
  }

  const mapOptions = {
    disableDefaultUI: false,
    zoomControl: true,
    streetViewControl: false,
    mapTypeControl: false,
    fullscreenControl: true
  }

  useEffect(() => {
    if (isOpen && delivery) {
      getCurrentLocation()
      calculateRoute()
    }

    return () => {
      if (watchIdRef.current) {
        navigator.geolocation.clearWatch(watchIdRef.current)
      }
    }
  }, [isOpen, delivery])

  const getCurrentLocation = () => {
    if (!navigator.geolocation) {
      showToast('Geolocation is not supported by this browser', 'error')
      return
    }

    setIsLoading(true)
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const location = {
          lat: position.coords.latitude,
          lng: position.coords.longitude
        }
        setCurrentLocation(location)
        setIsLoading(false)
        
        // Start watching location for real-time updates
        watchIdRef.current = navigator.geolocation.watchPosition(
          (position) => {
            const newLocation = {
              lat: position.coords.latitude,
              lng: position.coords.longitude
            }
            setCurrentLocation(newLocation)
            updateDeliveryLocation(newLocation)
          },
          (error) => {
            console.error('Error watching location:', error)
          },
          {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 0
          }
        )
      },
      (error) => {
        console.error('Error getting location:', error)
        showToast('Unable to get your location', 'error')
        setIsLoading(false)
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
      }
    )
  }

  const calculateRoute = () => {
    if (!currentLocation || !delivery) return

    const directionsService = new window.google.maps.DirectionsService()
    const directionsRenderer = new window.google.maps.DirectionsRenderer()

    const request = {
      origin: currentLocation,
      destination: delivery.delivery_address,
      travelMode: window.google.maps.TravelMode.DRIVING,
      optimizeWaypoints: true,
      avoidHighways: false,
      avoidTolls: false
    }

    directionsService.route(request, (result, status) => {
      if (status === window.google.maps.DirectionsStatus.OK) {
        setDirections(result)
        directionsRenderer.setDirections(result)
        
        // Calculate estimated time and distance
        const route = result.routes[0]
        const leg = route.legs[0]
        setEstimatedTime(leg.duration.text)
        setActualDistance(leg.distance.text)
      } else {
        console.error('Directions request failed:', status)
        showToast('Unable to calculate route', 'error')
      }
    })
  }

  const updateDeliveryLocation = async (location) => {
    try {
      await db.updateDelivery(delivery.id, {
        volunteer_location: location,
        updated_at: new Date().toISOString()
      })
    } catch (error) {
      console.error('Error updating delivery location:', error)
    }
  }

  const startNavigation = () => {
    setIsNavigating(true)
    setDeliveryStatus('in_transit')
    
    // Update delivery status in database
    db.updateDelivery(delivery.id, {
      status: 'in_transit',
      started_at: new Date().toISOString()
    }).catch(error => {
      console.error('Error updating delivery status:', error)
    })
  }

  const arriveAtDestination = () => {
    setDeliveryStatus('arrived')
    setShowConfirmation(true)
    
    // Update delivery status in database
    db.updateDelivery(delivery.id, {
      status: 'arrived',
      arrived_at: new Date().toISOString()
    }).catch(error => {
      console.error('Error updating delivery status:', error)
    })
  }

  const completeDelivery = async () => {
    try {
      setIsLoading(true)
      
      // Update delivery status
      await db.updateDelivery(delivery.id, {
        status: 'completed',
        completed_at: new Date().toISOString(),
        delivery_notes: deliveryNotes,
        volunteer_rating: rating,
        volunteer_feedback: feedback
      })

      // Create delivery confirmation request
      await db.createDeliveryConfirmationRequest(delivery.id, user.id)

      showToast('Delivery completed successfully!', 'success')
      onDeliveryComplete?.(delivery.id)
      onClose()
    } catch (error) {
      console.error('Error completing delivery:', error)
      showToast('Error completing delivery', 'error')
    } finally {
      setIsLoading(false)
    }
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'assigned': return 'text-blue-600 bg-blue-100'
      case 'in_transit': return 'text-yellow-600 bg-yellow-100'
      case 'arrived': return 'text-green-600 bg-green-100'
      case 'completed': return 'text-green-600 bg-green-100'
      default: return 'text-gray-600 bg-gray-100'
    }
  }

  const getStatusIcon = (status) => {
    switch (status) {
      case 'assigned': return <Clock className="w-4 h-4" />
      case 'in_transit': return <Navigation className="w-4 h-4" />
      case 'arrived': return <MapPin className="w-4 h-4" />
      case 'completed': return <CheckCircle className="w-4 h-4" />
      default: return <AlertCircle className="w-4 h-4" />
    }
  }

  if (!isOpen || !delivery) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Delivery Tracking</h2>
            <p className="text-sm text-gray-600">Delivery ID: {delivery.id}</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Delivery Status */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(deliveryStatus)}`}>
                <div className="flex items-center space-x-2">
                  {getStatusIcon(deliveryStatus)}
                  <span className="capitalize">{deliveryStatus.replace('_', ' ')}</span>
                </div>
              </div>
            </div>
            
            {estimatedTime && (
              <div className="text-sm text-gray-600">
                <Clock className="w-4 h-4 inline mr-1" />
                ETA: {estimatedTime}
              </div>
            )}
          </div>

          {/* Map */}
          <div className="relative">
            {/* Google Maps is loaded globally in main.jsx */}
            <GoogleMap
                mapContainerStyle={mapContainerStyle}
                center={center}
                zoom={13}
                options={mapOptions}
                onLoad={(map) => {
                  mapRef.current = map
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

                {/* Pickup Location Marker */}
                {delivery.pickup_location && (
                  <Marker
                    position={delivery.pickup_location}
                    title="Pickup Location"
                    icon={{
                      url: 'https://maps.google.com/mapfiles/ms/icons/green-dot.png'
                    }}
                  />
                )}

                {/* Delivery Address Marker */}
                {delivery.delivery_address && (
                  <Marker
                    position={delivery.delivery_address}
                    title="Delivery Address"
                    icon={{
                      url: 'https://maps.google.com/mapfiles/ms/icons/red-dot.png'
                    }}
                  />
                )}

                {/* Directions */}
                {directions && (
                  <DirectionsRenderer directions={directions} />
                )}
            </GoogleMap>
            
            {isLoading && (
              <div className="absolute inset-0 bg-white bg-opacity-75 flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              </div>
            )}
          </div>

          {/* Delivery Details */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <h3 className="font-semibold text-gray-900">Pickup Details</h3>
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <MapPin className="w-4 h-4 text-gray-400" />
                  <span className="text-sm text-gray-600">
                    {delivery.pickup_location?.address || 'Address not available'}
                  </span>
                </div>
                <div className="flex items-center space-x-2">
                  <Phone className="w-4 h-4 text-gray-400" />
                  <span className="text-sm text-gray-600">
                    {delivery.donor_phone || 'Phone not available'}
                  </span>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="font-semibold text-gray-900">Delivery Details</h3>
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <MapPin className="w-4 h-4 text-gray-400" />
                  <span className="text-sm text-gray-600">
                    {delivery.delivery_address?.address || 'Address not available'}
                  </span>
                </div>
                <div className="flex items-center space-x-2">
                  <Phone className="w-4 h-4 text-gray-400" />
                  <span className="text-sm text-gray-600">
                    {delivery.recipient_phone || 'Phone not available'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex space-x-4">
            {deliveryStatus === 'assigned' && (
              <button
                onClick={startNavigation}
                className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center space-x-2"
              >
                <Navigation className="w-4 h-4" />
                <span>Start Navigation</span>
              </button>
            )}

            {deliveryStatus === 'in_transit' && (
              <button
                onClick={arriveAtDestination}
                className="flex-1 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors flex items-center justify-center space-x-2"
              >
                <MapPin className="w-4 h-4" />
                <span>Arrived at Destination</span>
              </button>
            )}

            {deliveryStatus === 'arrived' && (
              <button
                onClick={() => setShowConfirmation(true)}
                className="flex-1 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors flex items-center justify-center space-x-2"
              >
                <CheckCircle className="w-4 h-4" />
                <span>Complete Delivery</span>
              </button>
            )}
          </div>

          {/* Delivery Confirmation Modal */}
          {showConfirmation && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-60 p-4">
              <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Complete Delivery</h3>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Delivery Notes
                    </label>
                    <textarea
                      value={deliveryNotes}
                      onChange={(e) => setDeliveryNotes(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      rows="3"
                      placeholder="Any notes about the delivery..."
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Rating (1-5)
                    </label>
                    <div className="flex space-x-2">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <button
                          key={star}
                          onClick={() => setRating(star)}
                          className={`w-8 h-8 rounded-full ${
                            star <= rating ? 'text-yellow-400' : 'text-gray-300'
                          }`}
                        >
                          ★
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Feedback
                    </label>
                    <textarea
                      value={feedback}
                      onChange={(e) => setFeedback(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      rows="2"
                      placeholder="How was the delivery experience?"
                    />
                  </div>
                </div>

                <div className="flex space-x-4 mt-6">
                  <button
                    onClick={() => setShowConfirmation(false)}
                    className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={completeDelivery}
                    disabled={isLoading}
                    className="flex-1 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
                  >
                    {isLoading ? 'Completing...' : 'Complete Delivery'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default DeliveryTrackingModal
