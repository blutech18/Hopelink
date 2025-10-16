import { useNavigate, useLocation } from 'react-router-dom'
import { useCallback } from 'react'

const useNavigateWithScroll = () => {
  const navigate = useNavigate()
  const location = useLocation()

  const navigateToTop = useCallback((path, options = {}) => {
    // Navigate to the new path
    navigate(path, options)
    
    // Scroll to top after navigation
    setTimeout(() => {
      window.scrollTo({
        top: 0,
        left: 0,
        behavior: 'smooth'
      })
    }, 100)
  }, [navigate])

  const scrollToTop = useCallback(() => {
    window.scrollTo({
      top: 0,
      left: 0,
      behavior: 'smooth'
    })
  }, [])

  return {
    navigateToTop,
    scrollToTop,
    currentPath: location.pathname
  }
}

export default useNavigateWithScroll
