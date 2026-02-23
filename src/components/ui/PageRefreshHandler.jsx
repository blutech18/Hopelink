import { useEffect, useRef } from 'react'
import { useLocation } from 'react-router-dom'

/**
 * Component that reacts to route changes without forcing a full browser reload.
 * Kept for backward compatibility but now only ensures scroll-to-top behavior.
 */
const PageRefreshHandler = () => {
  const location = useLocation()
  const prevPathname = useRef(location.pathname)

  useEffect(() => {
    // Only act if pathname actually changed
    if (prevPathname.current !== location.pathname) {
      prevPathname.current = location.pathname

      // Scroll to top on navigation without reloading the entire page
      window.scrollTo({ top: 0, left: 0, behavior: 'instant' })
    }
  }, [location.pathname])

  return null
}

export default PageRefreshHandler

