import React from 'react'
import { LoadScript } from '@react-google-maps/api'

const libraries = ['places', 'geometry', 'drawing']

/**
 * Shared Google Maps Loader Component
 * Loads Google Maps API only once for the entire application
 * Prevents duplicate element warnings
 */
export const GoogleMapsLoader = ({ children, onLoad, onError }) => {
  return (
    <LoadScript
      googleMapsApiKey={import.meta.env.VITE_GOOGLE_MAPS_API_KEY}
      libraries={libraries}
      onLoad={onLoad}
      onError={onError}
      loadingElement={
        <div className="flex items-center justify-center p-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      }
      preventGoogleFontsLoading={false}
    >
      {children}
    </LoadScript>
  )
}

export default GoogleMapsLoader

