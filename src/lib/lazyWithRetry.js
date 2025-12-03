import React from 'react'

let hasForcedReload = false
const retryCache = new Map() // Cache for retry attempts per factory

const isChunkLoadError = (error) => {
  if (!error) return false
  const message = error.message || ''
  return (
    error.name === 'ChunkLoadError' ||
    /Loading chunk [\d]+ failed/i.test(message) ||
    /ChunkLoadError/i.test(message) ||
    /Failed to fetch dynamically imported module/i.test(message) ||
    /Importing a module script failed/i.test(message)
  )
}

/**
 * Wraps React.lazy to gracefully recover from stale chunk references.
 * Supports automatic retries without browser refresh by allowing React to remount.
 */
const lazyWithRetry = (factory) => {
  const factoryKey = factory.toString().slice(0, 50) // Use function signature as key
  
  return React.lazy(() => {
    // Add timeout to prevent infinite hanging (reduced to 2 seconds for faster retry)
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => {
        reject(new Error('Component import timeout after 2 seconds'))
      }, 2000)
    })

    return Promise.race([
      factory(),
      timeoutPromise
    ]).catch((error) => {
      // Log the error for debugging
      console.error('Error loading lazy component:', error)
      
      // Track retry attempts
      const retryCount = retryCache.get(factoryKey) || 0
      retryCache.set(factoryKey, retryCount + 1)
      
      // Allow up to 5 retries before giving up
      if (retryCount < 5) {
        console.log(`Retrying lazy component load (attempt ${retryCount + 1}/5)...`)
        // Retry immediately - React will catch this and retry when remounted
        return factory().catch((retryError) => {
          // If retry also fails, throw to allow React to handle it
          throw retryError
        })
      }
      
      // In development, always throw to see the error
      if (import.meta.env.DEV) {
        console.error('Lazy loading error in development after retries:', error)
        retryCache.delete(factoryKey) // Reset cache for next navigation
        throw error
      }

      // In production, handle chunk load errors specially
      if (isChunkLoadError(error)) {
        if (!hasForcedReload && retryCount >= 5) {
          hasForcedReload = true
          console.warn('Dynamic import failed after retries, refreshing to fetch the latest assets...')
          // Use setTimeout to allow error to propagate first
          setTimeout(() => {
            window.location.reload()
          }, 100)
        }
        // Return a promise that never resolves (page will reload)
        return new Promise(() => {})
      }

      // Reset retry cache on non-chunk errors
      retryCache.delete(factoryKey)
      
      // For other errors in production, throw them so ErrorBoundary can catch
      throw error
    })
  })
}

export default lazyWithRetry

