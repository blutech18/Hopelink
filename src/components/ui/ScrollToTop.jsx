import { useEffect, useRef } from 'react'
import { useLocation } from 'react-router-dom'

const ScrollToTop = () => {
  const { pathname } = useLocation()
  const prevPathnameRef = useRef(pathname)

  useEffect(() => {
    // Only scroll to top if the pathname actually changed
    if (prevPathnameRef.current !== pathname) {
      prevPathnameRef.current = pathname
      
      // Small delay to ensure the page has rendered and any animations have started
      const timer = setTimeout(() => {
        // Use requestAnimationFrame for better performance
        requestAnimationFrame(() => {
          window.scrollTo({
            top: 0,
            left: 0,
            behavior: 'smooth'
          })
        })
      }, 150)

      // Cleanup timer on unmount or pathname change
      return () => clearTimeout(timer)
    }
  }, [pathname])

  return null
}

export default ScrollToTop
