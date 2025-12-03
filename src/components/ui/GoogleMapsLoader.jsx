import React, { useState, useEffect } from 'react'
import { LoadScript } from '@react-google-maps/api'

const libraries = ['places', 'geometry', 'drawing']

/**
 * Shared Google Maps Loader Component
 * Loads Google Maps API only once for the entire application
 * Prevents duplicate element warnings
 * Handles errors gracefully, including ad blocker interference
 * 
 * Note: If you see "ERR_BLOCKED_BY_CLIENT" for "gen_204?csp_test=true" in the console,
 * this is a harmless error caused by ad blockers blocking Google's CSP test request.
 * Maps will still work normally - this error can be safely ignored.
 */
export const GoogleMapsLoader = ({ children, onLoad, onError }) => {
  const [mapsError, setMapsError] = useState(null)
  const [mapsLoaded, setMapsLoaded] = useState(false)

  // Monitor for Google Maps API loading (handles cases where CSP test fails but Maps still loads)
  useEffect(() => {
    if (mapsLoaded) return

    // Initial check
    if (window.google?.maps) {
      setMapsLoaded(true)
      setMapsError(null)
      if (onLoad) {
        onLoad()
      }
      return
    }

    // Check periodically if Maps loaded despite any errors
    const checkMapsLoaded = setInterval(() => {
      if (window.google?.maps) {
        setMapsLoaded(true)
        setMapsError(null)
        if (onLoad) {
          onLoad()
        }
        clearInterval(checkMapsLoaded)
      }
    }, 500)

    // Clear interval after 15 seconds
    const timeout = setTimeout(() => {
      clearInterval(checkMapsLoaded)
    }, 15000)

    return () => {
      clearInterval(checkMapsLoaded)
      clearTimeout(timeout)
    }
  }, [mapsLoaded, onLoad])

  const handleLoad = () => {
    setMapsLoaded(true)
    setMapsError(null)
    if (onLoad) {
      onLoad()
    }
  }

  const handleError = (error) => {
    // Check if Maps actually loaded despite the error
    if (window.google?.maps) {
      // Maps loaded successfully despite any error
      handleLoad()
      return
    }

    // Only show error if Maps didn't load and it's not a CSP test error
    const errorMessage = error?.message || error?.toString() || ''
    const isCSPTestError = 
      errorMessage.includes('gen_204') ||
      errorMessage.includes('ERR_BLOCKED_BY_CLIENT') ||
      errorMessage.includes('mapsjs/gen_204') ||
      errorMessage.includes('csp_test')

    if (isCSPTestError) {
      // CSP test errors are non-critical - this is expected with ad blockers
      // Don't set error state - Maps should still load
      // Give Maps time to load - the monitoring useEffect will handle it
      return
    }

    // For other errors (not CSP test), set the error state
    console.error(
      '%c❌ Google Maps API Error',
      'color: #ef4444; font-weight: bold;',
      'Failed to load:',
      error
    )
    setMapsError(error)
    if (onError) {
      onError(error)
    }
  }

  // Check if API key is configured
  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY
  if (!apiKey) {
    console.warn('Google Maps API key not configured. Maps functionality will be limited.')
  }

  return (
    <>
      <LoadScript
        googleMapsApiKey={apiKey}
        libraries={libraries}
        onLoad={handleLoad}
        onError={handleError}
        loadingElement={
          <div className="flex items-center justify-center p-4">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        }
        preventGoogleFontsLoading={false}
      >
        {children}
      </LoadScript>
      {mapsError && !mapsLoaded && (
        <div className="fixed bottom-4 right-4 bg-yellow-500 text-white px-4 py-2 rounded-lg shadow-lg z-50 max-w-md">
          <p className="text-sm font-medium">
            ⚠️ Google Maps may not be available. If you're using an ad blocker, try disabling it for this site.
          </p>
        </div>
      )}
    </>
  )
}

export default GoogleMapsLoader

