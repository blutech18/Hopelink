import { useEffect, useRef } from 'react'
import { useLocation } from 'react-router-dom'

/**
 * Component that forces a full browser page reload when navigating to a new route
 * This ensures pages fully reload and show fresh data
 */
const PageRefreshHandler = () => {
  const location = useLocation()
  const prevPathname = useRef(location.pathname)
  const reloadTimeoutRef = useRef(null)

  useEffect(() => {
    // Only trigger reload if pathname actually changed
    if (prevPathname.current !== location.pathname) {
      prevPathname.current = location.pathname
      
      // Clear any existing timeout
      if (reloadTimeoutRef.current) {
        clearTimeout(reloadTimeoutRef.current)
      }
      
      // Force scroll to top on navigation
      window.scrollTo({ top: 0, left: 0, behavior: 'instant' })
      
      // Trigger a full browser page reload after 0.1 seconds
      reloadTimeoutRef.current = setTimeout(() => {
        window.location.reload()
      }, 100)
    }

    // Cleanup timeout on unmount
    return () => {
      if (reloadTimeoutRef.current) {
        clearTimeout(reloadTimeoutRef.current)
      }
    }
  }, [location.pathname])

  return null
}

export default PageRefreshHandler

