import React, { useState, useEffect, useRef } from 'react'
import { GoogleMap, Marker, DirectionsRenderer } from '@react-google-maps/api'
import { X, Navigation, Clock, MapPin, CheckCircle, AlertCircle, Phone, MessageCircle, User, Package, Star } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import { db } from '../../lib/supabase'
import { useToast } from '../../contexts/ToastContext'

const DonorRecipientTrackingModal = ({ 
  isOpen, 
  onClose, 
  delivery, 
  userType // 'donor' or 'recipient'
}) => {
  const { user } = useAuth()
  const { success, error } = useToast()
  const [volunteerLocation, setVolunteerLocation] = useState(null)
  const [directions, setDirections] = useState(null)
  const [deliveryStatus, setDeliveryStatus] = useState(delivery?.status || 'assigned')
  const [estimatedTime, setEstimatedTime] = useState(null)
  const [actualDistance, setActualDistance] = useState(null)
  const [isLoading, setIsLoading] = useState(false)
  const [showRatingModal, setShowRatingModal] = useState(false)
  const [rating, setRating] = useState(5)
  const [feedback, setFeedback] = useState('')
  const [volunteerInfo, setVolunteerInfo] = useState(null)
  
  const mapRef = useRef(null)
  const locationUpdateIntervalRef = useRef(null)

  const mapContainerStyle = {
    width: '100%',
    height: '400px',
    borderRadius: '8px'
  }

  const center = userType === 'donor' 
    ? delivery?.pickup_location || { lat: 14.5995, lng: 120.9842 }
    : delivery?.delivery_address || { lat: 14.5995, lng: 120.9842 }

  const mapOptions = {
    disableDefaultUI: false,
    zoomControl: true,
    streetViewControl: false,
    mapTypeControl: false,
    fullscreenControl: true
  }

  useEffect(() => {
    if (isOpen && delivery) {
      loadVolunteerInfo()
      loadVolunteerLocation()
      calculateRoute()
      
      // Poll for location updates every 10 seconds
      locationUpdateIntervalRef.current = setInterval(() => {
        loadVolunteerLocation()
      }, 10000)
    }

    return () => {
      if (locationUpdateIntervalRef.current) {
        clearInterval(locationUpdateIntervalRef.current)
      }
    }
  }, [isOpen, delivery])

  const loadVolunteerInfo = async () => {
    if (!delivery?.volunteer_id) return

    try {
      const volunteer = await db.getProfile(delivery.volunteer_id)
      setVolunteerInfo(volunteer)
    } catch (err) {
      console.error('Error loading volunteer info:', err)
    }
  }

  const loadVolunteerLocation = async () => {
    if (!delivery?.id) return

    try {
      // Get the latest delivery data with volunteer location
      const { data, error: fetchError } = await supabase
        .from('deliveries')
        .select('volunteer_location, status, updated_at')
        .eq('id', delivery.id)
        .single()

      if (fetchError) throw fetchError

      if (data?.volunteer_location) {
        setVolunteerLocation(data.volunteer_location)
        setDeliveryStatus(data.status)
      }
    } catch (err) {
      console.error('Error loading volunteer location:', err)
    }
  }

  const calculateRoute = () => {
    if (!delivery) return

    const directionsService = new window.google.maps.DirectionsService()

    const origin = delivery.pickup_location
    const destination = delivery.delivery_address

    if (!origin || !destination) return

    const request = {
      origin,
      destination,
      travelMode: window.google.maps.TravelMode.DRIVING,
      avoidHighways: false,
      avoidTolls: false
    }

    directionsService.route(request, (result, status) => {
      if (status === window.google.maps.DirectionsStatus.OK) {
        setDirections(result)
        
        // Calculate estimated time and distance
        const route = result.routes[0]
        const leg = route.legs[0]
        setEstimatedTime(leg.duration.text)
        setActualDistance(leg.distance.text)
      } else {
        console.error('Directions request failed:', status)
      }
    })
  }

  const confirmDelivery = async () => {
    try {
      setIsLoading(true)

      if (userType === 'donor') {
        await db.confirmDonorDelivery(delivery.id, user.id, true, rating, feedback)
      } else {
        await db.confirmReceipt(delivery.id, user.id, true, rating, feedback)
      }

      success('Delivery confirmed successfully!')
      onClose()
    } catch (err) {
      console.error('Error confirming delivery:', err)
      error('Error confirming delivery')
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

  const getStatusMessage = () => {
    switch (deliveryStatus) {
      case 'assigned':
        return 'Your volunteer has been assigned and will be on the way soon.'
      case 'in_transit':
        return 'Your volunteer is on the way!'
      case 'arrived':
        return userType === 'donor' 
          ? 'Volunteer has arrived at your location for pickup.'
          : 'Volunteer has arrived with your delivery!'
      case 'completed':
        return 'Delivery completed. Thank you!'
      default:
        return 'Waiting for updates...'
    }
  }

  if (!isOpen || !delivery) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">
              {userType === 'donor' ? 'Track Pickup' : 'Track Delivery'}
            </h2>
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
          {/* Status Banner */}
          <div className="bg-gradient-to-r from-blue-50 to-green-50 p-4 rounded-lg border border-blue-200">
            <div className="flex items-center space-x-3 mb-2">
              <div className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(deliveryStatus)}`}>
                <div className="flex items-center space-x-2">
                  {getStatusIcon(deliveryStatus)}
                  <span className="capitalize">{deliveryStatus.replace('_', ' ')}</span>
                </div>
              </div>
              
              {estimatedTime && deliveryStatus !== 'completed' && (
                <div className="text-sm text-gray-600">
                  <Clock className="w-4 h-4 inline mr-1" />
                  ETA: {estimatedTime}
                </div>
              )}
            </div>
            <p className="text-gray-700">{getStatusMessage()}</p>
          </div>

          {/* Volunteer Info */}
          {volunteerInfo && (
            <div className="bg-white border border-gray-200 rounded-lg p-4">
              <h3 className="font-semibold text-gray-900 mb-3 flex items-center">
                <User className="w-5 h-5 mr-2 text-blue-600" />
                Your Volunteer
              </h3>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  {volunteerInfo.profile_image_url ? (
                    <img 
                      src={volunteerInfo.profile_image_url} 
                      alt={volunteerInfo.name}
                      className="w-12 h-12 rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                      <User className="w-6 h-6 text-blue-600" />
                    </div>
                  )}
                  <div>
                    <p className="font-medium text-gray-900">{volunteerInfo.name}</p>
                    {volunteerInfo.volunteer_rating && (
                      <div className="flex items-center space-x-1">
                        <Star className="w-4 h-4 text-yellow-400 fill-current" />
                        <span className="text-sm text-gray-600">
                          {volunteerInfo.volunteer_rating.toFixed(1)} ({volunteerInfo.total_deliveries} deliveries)
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {volunteerInfo.phone_number && (
                  <button
                    onClick={() => window.open(`tel:${volunteerInfo.phone_number}`)}
                    className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors flex items-center space-x-2"
                  >
                    <Phone className="w-4 h-4" />
                    <span>Call</span>
                  </button>
                )}
              </div>
            </div>
          )}

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
                {/* Volunteer Location Marker */}
                {volunteerLocation && deliveryStatus !== 'completed' && (
                  <Marker
                    position={volunteerLocation}
                    title="Volunteer Location"
                    icon={{
                      url: 'https://maps.google.com/mapfiles/ms/icons/blue-dot.png'
                    }}
                  />
                )}

                {/* Pickup Location Marker */}
                <Marker
                  position={delivery.pickup_location}
                  title="Pickup Location"
                  icon={{
                    url: 'https://maps.google.com/mapfiles/ms/icons/green-dot.png'
                  }}
                  label={userType === 'donor' ? 'You' : 'Pickup'}
                />

                {/* Delivery Address Marker */}
                <Marker
                  position={delivery.delivery_address}
                  title="Delivery Address"
                  icon={{
                    url: 'https://maps.google.com/mapfiles/ms/icons/red-dot.png'
                  }}
                  label={userType === 'recipient' ? 'You' : 'Delivery'}
                />

                {/* Route */}
                {directions && (
                  <DirectionsRenderer 
                    directions={directions}
                    options={{
                      suppressMarkers: true,
                      polylineOptions: {
                        strokeColor: '#2563eb',
                        strokeWeight: 4
                      }
                    }}
                  />
                )}
            </GoogleMap>
          </div>

          {/* Delivery Details */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <h3 className="font-semibold text-gray-900 flex items-center">
                <Package className="w-5 h-5 mr-2 text-blue-600" />
                Item Details
              </h3>
              <div className="space-y-2">
                <p className="text-sm text-gray-600">
                  <strong>Item:</strong> {delivery.item_title || 'N/A'}
                </p>
                <p className="text-sm text-gray-600">
                  <strong>Category:</strong> {delivery.category || 'N/A'}
                </p>
                {delivery.quantity && (
                  <p className="text-sm text-gray-600">
                    <strong>Quantity:</strong> {delivery.quantity}
                  </p>
                )}
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="font-semibold text-gray-900 flex items-center">
                <MapPin className="w-5 h-5 mr-2 text-blue-600" />
                Locations
              </h3>
              <div className="space-y-2">
                <div className="flex items-start space-x-2">
                  <MapPin className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-xs font-medium text-gray-700">Pickup</p>
                    <p className="text-sm text-gray-600">
                      {delivery.pickup_location?.address || 'Address not available'}
                    </p>
                  </div>
                </div>
                <div className="flex items-start space-x-2">
                  <MapPin className="w-4 h-4 text-red-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-xs font-medium text-gray-700">Delivery</p>
                    <p className="text-sm text-gray-600">
                      {delivery.delivery_address?.address || 'Address not available'}
                    </p>
                  </div>
                </div>
                {actualDistance && (
                  <p className="text-sm text-gray-600">
                    <strong>Distance:</strong> {actualDistance}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Confirmation Button */}
          {deliveryStatus === 'arrived' && (
            <div className="flex justify-end">
              <button
                onClick={() => setShowRatingModal(true)}
                className="bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 transition-colors flex items-center space-x-2"
              >
                <CheckCircle className="w-5 h-5" />
                <span>Confirm {userType === 'donor' ? 'Pickup' : 'Delivery'}</span>
              </button>
            </div>
          )}

          {/* Rating Modal */}
          {showRatingModal && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-60 p-4">
              <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  Rate Your Experience
                </h3>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      How was your experience with the volunteer?
                    </label>
                    <div className="flex space-x-2 justify-center">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <button
                          key={star}
                          onClick={() => setRating(star)}
                          className={`w-12 h-12 rounded-full transition-colors ${
                            star <= rating ? 'text-yellow-400' : 'text-gray-300'
                          }`}
                        >
                          <Star className={`w-full h-full ${star <= rating ? 'fill-current' : ''}`} />
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Feedback (Optional)
                    </label>
                    <textarea
                      value={feedback}
                      onChange={(e) => setFeedback(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      rows="3"
                      placeholder="Share your experience..."
                    />
                  </div>
                </div>

                <div className="flex space-x-4 mt-6">
                  <button
                    onClick={() => setShowRatingModal(false)}
                    className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={confirmDelivery}
                    disabled={isLoading}
                    className="flex-1 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
                  >
                    {isLoading ? 'Confirming...' : 'Confirm'}
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

export default DonorRecipientTrackingModal

