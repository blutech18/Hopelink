import React, { useState, useEffect, useRef } from 'react'
import { GoogleMap, Marker, Autocomplete } from '@react-google-maps/api'
import { MapPin, Navigation, Search, X, CheckCircle } from 'lucide-react'
import { useToast } from '../../contexts/ToastContext'
import LocationService from '../../lib/locationService'

const libraries = ['places']

const LocationPicker = ({ 
  isOpen, 
  onClose, 
  onLocationSelect,
  initialLocation = null,
  title = 'Select Location'
}) => {
  const { success, error } = useToast()
  const [selectedLocation, setSelectedLocation] = useState(initialLocation || null)
  const [mapCenter, setMapCenter] = useState(initialLocation || { lat: 14.5995, lng: 120.9842 })
  const [searchQuery, setSearchQuery] = useState('')
  const [address, setAddress] = useState('')
  const [addressComponents, setAddressComponents] = useState(null)
  const [isLoadingLocation, setIsLoadingLocation] = useState(false)
  const [autocomplete, setAutocomplete] = useState(null)
  const [isOfflineMode, setIsOfflineMode] = useState(false)
  const [mapsApiLoaded, setMapsApiLoaded] = useState(!!window.google?.maps)
  const [mapsApiError, setMapsApiError] = useState(null)
  
  const mapRef = useRef(null)
  const markerRef = useRef(null)

  const mapContainerStyle = {
    width: '100%',
    height: '320px',
    borderRadius: '8px'
  }

  const mapOptions = {
    disableDefaultUI: false,
    zoomControl: true,
    streetViewControl: false,
    mapTypeControl: false,
    fullscreenControl: true,
    clickableIcons: true
  }

  useEffect(() => {
    if (isOpen && !initialLocation) {
      getCurrentLocation()
    }
  }, [isOpen])

  useEffect(() => {
    if (selectedLocation) {
      reverseGeocode(selectedLocation.lat, selectedLocation.lng)
    }
  }, [selectedLocation])

  useEffect(() => {
    // Check if we're in offline mode
    const checkOnlineStatus = () => {
      setIsOfflineMode(!navigator.onLine)
    }
    
    checkOnlineStatus()
    window.addEventListener('online', checkOnlineStatus)
    window.addEventListener('offline', checkOnlineStatus)
    
    return () => {
      window.removeEventListener('online', checkOnlineStatus)
      window.removeEventListener('offline', checkOnlineStatus)
    }
  }, [])

  useEffect(() => {
    if (!isOpen) return

    let attempts = 0
    const maxAttempts = 20 // 10 seconds total (20 * 500ms)

    // Check if Google Maps API is loaded
    const checkMapsLoaded = () => {
      if (window.google?.maps) {
        setMapsApiLoaded(true)
        setMapsApiError(null)
      } else if (attempts < maxAttempts) {
        attempts++
        setTimeout(checkMapsLoaded, 500)
      } else {
        // Timeout after 10 seconds
        setMapsApiError('Google Maps failed to load. You can still select a location manually.')
      }
    }

    checkMapsLoaded()
  }, [isOpen])

  const getCurrentLocation = async () => {
    try {
      setIsLoadingLocation(true)
      const location = await LocationService.getCurrentLocation()
      setSelectedLocation(location)
      setMapCenter(location)
      success('Current location detected')
    } catch (err) {
      console.error('Error getting current location:', err)
      error('Unable to get current location')
    } finally {
      setIsLoadingLocation(false)
    }
  }

  const reverseGeocode = async (lat, lng) => {
    try {
      const result = await LocationService.reverseGeocode(lat, lng)
      setAddress(result.formatted_address)
      setAddressComponents(result.address_components)
    } catch (err) {
      console.error('Error reverse geocoding:', err)
      // Set a fallback address if geocoding fails
      setAddress(`Location: ${lat.toFixed(6)}, ${lng.toFixed(6)}`)
      setAddressComponents(null)
      if (err.message.includes('Network error')) {
        error('Network error: Unable to get address. Please check your internet connection.')
      } else if (err.message.includes('API key')) {
        error('Maps API configuration error. Please contact support.')
      }
    }
  }

  const handleMapClick = (e) => {
    const location = {
      lat: e.latLng.lat(),
      lng: e.latLng.lng()
    }
    setSelectedLocation(location)
  }

  const handlePlaceSelect = () => {
    if (autocomplete !== null) {
      const place = autocomplete.getPlace()
      
      if (place.geometry) {
        const location = {
          lat: place.geometry.location.lat(),
          lng: place.geometry.location.lng()
        }
        setSelectedLocation(location)
        setMapCenter(location)
        setAddress(place.formatted_address)
        setAddressComponents(place.address_components)
        
        // Zoom to the selected place
        if (mapRef.current) {
          mapRef.current.panTo(location)
          mapRef.current.setZoom(16)
        }
      }
    }
  }

  const handleManualSearch = async () => {
    if (!searchQuery.trim()) return
    
    try {
      setIsLoadingLocation(true)
      const result = await LocationService.geocodeAddress(searchQuery)
      const location = {
        lat: result.lat,
        lng: result.lng
      }
      setSelectedLocation(location)
      setMapCenter(location)
      setAddress(result.formatted_address)
      setAddressComponents(result.address_components)
      
      // Zoom to the searched location
      if (mapRef.current) {
        mapRef.current.panTo(location)
        mapRef.current.setZoom(16)
      }
      
      success('Location found!')
    } catch (error) {
      console.error('Manual search error:', error)
      error('Unable to find that location. Please try a different search term.')
    } finally {
      setIsLoadingLocation(false)
    }
  }

  const handleConfirm = () => {
    if (!selectedLocation) {
      error('Please select a location')
      return
    }

    onLocationSelect({
      lat: selectedLocation.lat,
      lng: selectedLocation.lng,
      address: address,
      addressComponents: addressComponents
    })
    
    onClose()
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2">
      <div className="bg-[#001a5c] rounded-lg shadow-xl max-w-3xl w-full overflow-hidden border border-gray-600">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-600">
          <div>
            <h2 className="text-lg font-semibold text-white">{title}</h2>
            <p className="text-xs text-yellow-200">Click on the map or search for a location</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-yellow-300 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-4 space-y-3">
          {/* Google Maps is loaded globally in main.jsx */}
          <div className="space-y-3">
              {/* Network Status Indicator */}
              {isOfflineMode && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                  <p className="text-sm text-yellow-800">
                    <strong>Offline Mode:</strong> Some features may be limited. Search functionality will work with manual input.
                  </p>
                </div>
              )}

              {/* Maps API Error Indicator */}
              {mapsApiError && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                  <p className="text-sm text-red-800">
                    <strong>Maps API Error:</strong> {mapsApiError}
                  </p>
                  <p className="text-xs text-red-600 mt-1">
                    You can still select a location manually by entering coordinates or using the map below.
                  </p>
                </div>
              )}

              <div className="flex space-x-2">
                <div className="flex-1 relative">
                  {!isOfflineMode ? (
                    <Autocomplete
                      onLoad={setAutocomplete}
                      onPlaceChanged={handlePlaceSelect}
                    >
                      <input
                        type="text"
                        placeholder="Search for a location..."
                        className="w-full pl-8 pr-3 py-2 bg-[#00237d] border border-gray-600 text-white placeholder-gray-400 rounded-lg focus:ring-2 focus:ring-yellow-300 focus:border-yellow-300 text-sm"
                      />
                    </Autocomplete>
                  ) : (
                    <input
                      type="text"
                      placeholder="Enter location (e.g., 'Manila, Philippines')"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && handleManualSearch()}
                      className="w-full pl-8 pr-3 py-2 bg-[#00237d] border border-gray-600 text-white placeholder-gray-400 rounded-lg focus:ring-2 focus:ring-yellow-300 focus:border-yellow-300 text-sm"
                    />
                  )}
                  <Search className="w-4 h-4 text-yellow-300 absolute left-2.5 top-2.5" />
                </div>
                
                {/* Search Button for Manual Search */}
                {isOfflineMode && (
                  <button
                    onClick={handleManualSearch}
                    disabled={isLoadingLocation || !searchQuery.trim()}
                    className="px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center space-x-2 disabled:opacity-50 disabled:bg-gray-600 text-sm"
                  >
                    <Search className="w-4 h-4" />
                    <span>Search</span>
                  </button>
                )}
                
                <button
                  onClick={getCurrentLocation}
                  disabled={isLoadingLocation}
                  className="px-3 py-2 bg-yellow-500 text-[#00237d] font-semibold rounded-lg hover:bg-yellow-400 transition-colors flex items-center space-x-2 disabled:opacity-50 disabled:bg-gray-600 text-sm"
                >
                  <Navigation className="w-4 h-4" />
                  <span>{isLoadingLocation ? 'Loading...' : 'Use Current'}</span>
                </button>
              </div>

              {/* Selected Address Display */}
              {address && (
                <div className="bg-[#00237d] p-2 rounded-lg border border-gray-600">
                  <div className="flex items-start space-x-2">
                    <MapPin className="w-4 h-4 text-yellow-300 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-xs font-medium text-white">Selected Location</p>
                      <p className="text-xs text-yellow-200">{address}</p>
                      {selectedLocation && (
                        <p className="text-[11px] text-gray-400 mt-1">
                          Coordinates: {selectedLocation.lat.toFixed(6)}, {selectedLocation.lng.toFixed(6)}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Map */}
              <div className="relative">
                {mapsApiLoaded ? (
                  <GoogleMap
                    mapContainerStyle={mapContainerStyle}
                    center={mapCenter}
                    zoom={15}
                    options={mapOptions}
                    onClick={handleMapClick}
                    onLoad={(map) => {
                      mapRef.current = map
                    }}
                  >
                    {selectedLocation && (
                      <Marker
                        position={selectedLocation}
                        draggable={true}
                        onDragEnd={(e) => {
                          const location = {
                            lat: e.latLng.lat(),
                            lng: e.latLng.lng()
                          }
                          setSelectedLocation(location)
                        }}
                        // Note: Marker is deprecated as of Feb 2024, but AdvancedMarkerElement 
                        // is not yet supported by @react-google-maps/api v2.20.7
                        // TODO: Upgrade to @vis.gl/react-google-maps when ready for full migration
                        icon={window.google?.maps ? {
                          url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(`
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                              <circle cx="12" cy="12" r="8" fill="#ef4444" stroke="#ffffff" stroke-width="2"/>
                              <path d="M12 2L15.09 8.26L22 9L17 14L18.18 21L12 17.77L5.82 21L7 14L2 9L8.91 8.26L12 2Z" fill="#ffffff" transform="translate(6, 6) scale(0.5)"/>
                            </svg>
                          `),
                          scaledSize: new window.google.maps.Size(24, 24),
                          anchor: new window.google.maps.Point(12, 12)
                        } : undefined}
                      />
                    )}
                  </GoogleMap>
                ) : (
                  /* Fallback Map Interface */
                  <div className="relative" style={mapContainerStyle}>
                    <div className="absolute inset-0 bg-gray-100 rounded-lg border-2 border-dashed border-gray-300 flex flex-col items-center justify-center p-6">
                      <MapPin className="w-12 h-12 text-gray-400 mb-4" />
                      {mapsApiError ? (
                        <>
                          <p className="text-gray-600 text-center mb-4 font-semibold">
                            Google Maps Unavailable
                          </p>
                          <p className="text-sm text-gray-500 text-center mb-4">
                            {mapsApiError}
                          </p>
                        </>
                      ) : (
                        <>
                          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-4"></div>
                          <p className="text-gray-600 text-center mb-2 font-semibold">
                            Loading map...
                          </p>
                          <p className="text-xs text-gray-500 text-center">
                            This may take a few moments
                          </p>
                        </>
                      )}
                      <p className="text-sm text-gray-500 text-center max-w-xs">
                        You can still select a location by entering coordinates manually below.
                      </p>
                      
                      {/* Manual Coordinate Input */}
                      <div className="mt-6 w-full max-w-sm space-y-3">
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-xs text-gray-300 mb-1">Latitude</label>
                            <input
                              type="number"
                              step="0.000001"
                              placeholder="14.5995"
                              value={selectedLocation?.lat || ''}
                              onChange={(e) => {
                                const lat = parseFloat(e.target.value)
                                if (!isNaN(lat)) {
                                  setSelectedLocation(prev => ({
                                    lat,
                                    lng: prev?.lng || 120.9842
                                  }))
                                }
                              }}
                              className="w-full px-3 py-2 bg-white border border-gray-300 text-gray-900 placeholder-gray-500 rounded-lg text-sm focus:ring-2 focus:ring-yellow-300 focus:border-yellow-300"
                            />
                          </div>
                          <div>
                            <label className="block text-xs text-gray-300 mb-1">Longitude</label>
                            <input
                              type="number"
                              step="0.000001"
                              placeholder="120.9842"
                              value={selectedLocation?.lng || ''}
                              onChange={(e) => {
                                const lng = parseFloat(e.target.value)
                                if (!isNaN(lng)) {
                                  setSelectedLocation(prev => ({
                                    lat: prev?.lat || 14.5995,
                                    lng
                                  }))
                                }
                              }}
                              className="w-full px-3 py-2 bg-white border border-gray-300 text-gray-900 placeholder-gray-500 rounded-lg text-sm focus:ring-2 focus:ring-yellow-300 focus:border-yellow-300"
                            />
                          </div>
                        </div>
                        
                        <button
                          onClick={() => {
                            if (selectedLocation) {
                              reverseGeocode(selectedLocation.lat, selectedLocation.lng)
                            }
                          }}
                          className="w-full px-4 py-2 bg-yellow-500 text-[#00237d] font-semibold rounded-lg hover:bg-yellow-400 transition-colors text-sm"
                        >
                          Get Address
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {isLoadingLocation && (
                  <div className="absolute inset-0 bg-white bg-opacity-75 flex items-center justify-center">
                    <div className="text-center">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto mb-2"></div>
                      <p className="text-xs text-gray-600">Getting your location...</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Instructions */}
              <div className="bg-[#00237d] p-2 rounded-lg border border-gray-600">
                {mapsApiLoaded ? (
                  <p className="text-xs text-gray-300">
                    <strong className="text-yellow-300">Tip:</strong> Drag the marker or click the map to set position.
                  </p>
                ) : (
                  <div className="space-y-2">
                    <p className="text-xs text-gray-300">
                      <strong className="text-yellow-300">Manual Location Selection:</strong> Since Google Maps is unavailable, you can:
                    </p>
                    <ul className="text-[11px] text-gray-400 space-y-1 ml-4">
                      <li>• Enter coordinates manually in the fields above</li>
                      <li>• Use the "Get Address" button to find the location name</li>
                      <li>• Search for addresses using the search box above</li>
                    </ul>
                  </div>
                )}
                
                {isOfflineMode && (
                  <p className="text-xs text-yellow-300 mt-2">
                    <strong>Offline Mode:</strong> If you see network errors, check your internet connection or try disabling browser extensions that might block Google Maps requests.
                  </p>
                )}
                
                {mapsApiError && (
                  <p className="text-xs text-red-400 mt-2">
                    <strong>API Error:</strong> Google Maps API failed to load. This might be due to network issues, API key restrictions, or missing API permissions.
                  </p>
                )}
              </div>
            </div>

          {/* Action Buttons */}
          <div className="flex space-x-3 p-4 pt-3 border-t border-gray-600">
            <button
              onClick={onClose}
              className="flex-1 px-3 py-2 border border-gray-600 text-yellow-200 rounded-lg hover:bg-[#00237d] hover:border-yellow-300 transition-colors text-sm"
            >
              Cancel
            </button>
            <button
              onClick={handleConfirm}
              disabled={!selectedLocation}
              className="flex-1 bg-green-600 text-white px-3 py-2 rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:bg-gray-600 flex items-center justify-center space-x-2 text-sm"
            >
              <CheckCircle className="w-4 h-4" />
              <span>Confirm Location</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default LocationPicker

