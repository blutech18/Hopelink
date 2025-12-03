let hasStartedPreloading = false

const schedule = (callback) => {
  if (typeof window === 'undefined') {
    return
  }

  if ('requestIdleCallback' in window) {
    window.requestIdleCallback(() => callback(), { timeout: 3000 })
  } else {
    setTimeout(() => callback(), 1500)
  }
}

export const preloadRoutes = (importers = []) => {
  if (hasStartedPreloading || !Array.isArray(importers) || importers.length === 0) {
    return
  }

  if (typeof window === 'undefined') {
    return
  }

  hasStartedPreloading = true

  schedule(() => {
    importers.forEach((importer, index) => {
      if (typeof importer !== 'function') return

      const run = () => {
        try {
          const result = importer()
          if (result && typeof result.then === 'function') {
            result.catch(() => {})
          }
        } catch (error) {
          // Swallow preloading errors silently – they'll be retried on actual navigation
        }
      }

      setTimeout(run, index * 100)
    })
  })
}

