import React from 'react'
import { useNavigate, useLocation } from 'react-router-dom'

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null, errorInfo: null }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo)
    this.setState({
      error,
      errorInfo
    })
  }

  componentDidUpdate(prevProps) {
    // Reset error boundary when location changes
    if (this.props.locationKey !== prevProps.locationKey && this.state.hasError) {
      this.setState({ hasError: false, error: null, errorInfo: null })
    }
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null })
    // Optionally navigate to home
    if (this.props.navigate) {
      this.props.navigate('/')
    }
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback(this.state.error, this.handleReset)
      }

      return (
        <div className="min-h-screen flex items-center justify-center" style={{backgroundColor: '#1e293b'}}>
          <div className="text-center p-8">
            <h2 className="text-2xl font-bold text-white mb-4">Something went wrong</h2>
            <p className="text-yellow-300 mb-6">
              {this.state.error?.message || 'An unexpected error occurred'}
            </p>
            <div className="flex gap-4 justify-center">
              <button
                onClick={this.handleReset}
                className="px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700"
              >
                Try Again
              </button>
              <button
                onClick={() => window.location.href = '/'}
                className="px-4 py-2 bg-navy-700 text-yellow-300 rounded-lg hover:bg-navy-600"
              >
                Go Home
              </button>
            </div>
            {(import.meta.env.DEV || process.env.NODE_ENV === 'development') && this.state.errorInfo && (
              <details className="mt-8 text-left">
                <summary className="text-yellow-400 cursor-pointer mb-2">Error Details</summary>
                <pre className="bg-navy-900 p-4 rounded text-xs text-gray-300 overflow-auto max-h-64">
                  {this.state.error?.toString()}
                  {this.state.errorInfo.componentStack}
                </pre>
              </details>
            )}
          </div>
        </div>
      )
    }

    return this.props.children
  }
}

// Wrapper component to use hooks
export const ErrorBoundaryWithNavigate = ({ children, fallback }) => {
  const navigate = useNavigate()
  const location = useLocation()
  return (
    <ErrorBoundary 
      navigate={navigate} 
      fallback={fallback}
      locationKey={location.pathname}
    >
      {children}
    </ErrorBoundary>
  )
}

export default ErrorBoundary

