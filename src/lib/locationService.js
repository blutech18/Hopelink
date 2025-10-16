// Location Service Utilities for Google Maps Integration
export class LocationService {
  // Single API Key for all services
  static getApiKey() {
    return import.meta.env.VITE_GOOGLE_MAPS_API_KEY
  }
  static async getCurrentLocation() {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Geolocation is not supported by this browser'))
        return
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          resolve({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
            accuracy: position.coords.accuracy,
            timestamp: position.timestamp
          })
        },
        (error) => {
          reject(error)
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0
        }
      )
    })
  }

  static watchLocation(callback, errorCallback) {
    if (!navigator.geolocation) {
      errorCallback(new Error('Geolocation is not supported by this browser'))
      return null
    }

    return navigator.geolocation.watchPosition(
      (position) => {
        callback({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          accuracy: position.coords.accuracy,
          timestamp: position.timestamp
        })
      },
      errorCallback,
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
      }
    )
  }

  static clearWatch(watchId) {
    if (watchId) {
      navigator.geolocation.clearWatch(watchId)
    }
  }

  static async geocodeAddress(address) {
    try {
      if (!window.google || !window.google.maps) {
        throw new Error('Google Maps API not loaded')
      }

      const geocoder = new window.google.maps.Geocoder()
      
      return new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Geocoding request timed out'))
        }, 10000)

        geocoder.geocode({ address }, (results, status) => {
          clearTimeout(timeout)
          
          if (status === 'OK' && results[0]) {
            const location = results[0].geometry.location
            resolve({
              lat: location.lat(),
              lng: location.lng(),
              formatted_address: results[0].formatted_address,
              place_id: results[0].place_id
            })
          } else if (status === 'ZERO_RESULTS') {
            reject(new Error('No results found for the given address'))
          } else if (status === 'OVER_QUERY_LIMIT') {
            reject(new Error('Geocoding quota exceeded'))
          } else if (status === 'REQUEST_DENIED') {
            reject(new Error('Geocoding request denied - check API key'))
          } else if (status === 'INVALID_REQUEST') {
            reject(new Error('Invalid geocoding request'))
          } else {
            reject(new Error(`Geocoding failed: ${status}`))
          }
        })
      })
    } catch (error) {
      if (error.message.includes('timeout') || error.message.includes('network')) {
        throw new Error('Network error - please check your internet connection')
      }
      throw error
    }
  }

  static async reverseGeocode(lat, lng) {
    try {
      if (!window.google || !window.google.maps) {
        throw new Error('Google Maps API not loaded')
      }

      // Check network connectivity first
      if (!navigator.onLine) {
        throw new Error('No internet connection available')
      }

      const geocoder = new window.google.maps.Geocoder()
      
      return new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Reverse geocoding request timed out - please check your internet connection'))
        }, 15000) // Increased timeout

        geocoder.geocode({ location: { lat, lng } }, (results, status) => {
          clearTimeout(timeout)
          
          if (status === 'OK' && results[0]) {
            resolve({
              formatted_address: results[0].formatted_address,
              place_id: results[0].place_id,
              address_components: results[0].address_components
            })
          } else if (status === 'ZERO_RESULTS') {
            reject(new Error('No address found for the given coordinates'))
          } else if (status === 'OVER_QUERY_LIMIT') {
            reject(new Error('Geocoding quota exceeded - please try again later'))
          } else if (status === 'REQUEST_DENIED') {
            reject(new Error('Reverse geocoding request denied - check API key and domain restrictions'))
          } else if (status === 'INVALID_REQUEST') {
            reject(new Error('Invalid reverse geocoding request'))
          } else if (status === 'UNKNOWN_ERROR') {
            reject(new Error('Network error - please check your internet connection and try again'))
          } else {
            reject(new Error(`Reverse geocoding failed: ${status}`))
          }
        })
      })
    } catch (error) {
      if (error.message.includes('timeout') || error.message.includes('network') || error.message.includes('internet')) {
        throw new Error('Network error - please check your internet connection')
      }
      throw error
    }
  }

  static calculateDistance(lat1, lng1, lat2, lng2) {
    const R = 6371 // Earth's radius in kilometers
    const dLat = this.toRadians(lat2 - lat1)
    const dLng = this.toRadians(lng2 - lng1)
    
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(this.toRadians(lat1)) * Math.cos(this.toRadians(lat2)) *
              Math.sin(dLng / 2) * Math.sin(dLng / 2)
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
    const distance = R * c
    
    return distance
  }

  static toRadians(degrees) {
    return degrees * (Math.PI / 180)
  }

  static formatDistance(distanceKm) {
    if (distanceKm < 1) {
      return `${Math.round(distanceKm * 1000)}m`
    }
    return `${distanceKm.toFixed(1)}km`
  }

  static formatDuration(seconds) {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    
    if (hours > 0) {
      return `${hours}h ${minutes}m`
    }
    return `${minutes}m`
  }

  static async optimizeRoute(origin, destinations, travelMode = 'DRIVING') {
    try {
      const directionsService = new window.google.maps.DirectionsService()
      
      const request = {
        origin,
        destination: destinations[destinations.length - 1],
        waypoints: destinations.slice(0, -1).map(dest => ({ location: dest, stopover: true })),
        optimizeWaypoints: true,
        travelMode: window.google.maps.TravelMode[travelMode],
        avoidHighways: false,
        avoidTolls: false
      }

      return new Promise((resolve, reject) => {
        directionsService.route(request, (result, status) => {
          if (status === 'OK') {
            resolve(result)
          } else {
            reject(new Error(`Route optimization failed: ${status}`))
          }
        })
      })
    } catch (error) {
      throw new Error('Route optimization service not available')
    }
  }

  static async getDirections(origin, destination, travelMode = 'DRIVING') {
    try {
      const directionsService = new window.google.maps.DirectionsService()
      
      const request = {
        origin,
        destination,
        travelMode: window.google.maps.TravelMode[travelMode],
        avoidHighways: false,
        avoidTolls: false
      }

      return new Promise((resolve, reject) => {
        directionsService.route(request, (result, status) => {
          if (status === 'OK') {
            resolve(result)
          } else {
            reject(new Error(`Directions request failed: ${status}`))
          }
        })
      })
    } catch (error) {
      throw new Error('Directions service not available')
    }
  }

  static extractRouteInfo(route) {
    if (!route || !route.routes || !route.routes[0]) {
      return null
    }

    const routeData = route.routes[0]
    const totalDistance = routeData.legs.reduce((sum, leg) => sum + leg.distance.value, 0)
    const totalDuration = routeData.legs.reduce((sum, leg) => sum + leg.duration.value, 0)

    return {
      totalDistance: totalDistance,
      totalDuration: totalDuration,
      distanceText: routeData.legs[0].distance.text,
      durationText: routeData.legs[0].duration.text,
      waypointOrder: routeData.waypoint_order || [],
      legs: routeData.legs.map(leg => ({
        distance: leg.distance,
        duration: leg.duration,
        startAddress: leg.start_address,
        endAddress: leg.end_address
      }))
    }
  }

  static validateLocation(location) {
    if (!location || typeof location.lat !== 'number' || typeof location.lng !== 'number') {
      return false
    }

    // Check if coordinates are within valid ranges
    if (location.lat < -90 || location.lat > 90) {
      return false
    }

    if (location.lng < -180 || location.lng > 180) {
      return false
    }

    return true
  }

  static isLocationNearby(location1, location2, maxDistanceKm = 0.1) {
    const distance = this.calculateDistance(
      location1.lat, location1.lng,
      location2.lat, location2.lng
    )
    
    return distance <= maxDistanceKm
  }

  static async getNearbyPlaces(location, radius = 1000, type = 'restaurant') {
    try {
      const service = new window.google.maps.places.PlacesService(
        new window.google.maps.Map(document.createElement('div'))
      )

      return new Promise((resolve, reject) => {
        service.nearbySearch({
          location,
          radius,
          type
        }, (results, status) => {
          if (status === 'OK') {
            resolve(results)
          } else {
            reject(new Error(`Places search failed: ${status}`))
          }
        })
      })
    } catch (error) {
      throw new Error('Places service not available')
    }
  }
}

export default LocationService
