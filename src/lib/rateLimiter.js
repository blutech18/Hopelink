/**
 * Client-side rate limiting utility
 * Note: This is a client-side check. Server-side rate limiting should also be implemented.
 */

const RATE_LIMIT_CONFIG = {
  signup: {
    maxAttempts: 3,
    windowMs: 3600000, // 1 hour
    storageKey: 'rate_limit_signup'
  },
  passwordReset: {
    maxAttempts: 5,
    windowMs: 3600000, // 1 hour
    storageKey: 'rate_limit_password_reset'
  },
  login: {
    maxAttempts: 10,
    windowMs: 900000, // 15 minutes
    storageKey: 'rate_limit_login'
  }
}

/**
 * Check if an action is rate limited
 * @param {string} action - The action type (signup, passwordReset, login)
 * @returns {{allowed: boolean, remaining: number, resetAt: number}}
 */
export function checkRateLimit(action) {
  const config = RATE_LIMIT_CONFIG[action]
  if (!config) {
    return { allowed: true, remaining: Infinity, resetAt: Date.now() }
  }

  try {
    const stored = localStorage.getItem(config.storageKey)
    const now = Date.now()
    
    if (!stored) {
      // First attempt
      const data = {
        count: 0,
        resetAt: now + config.windowMs
      }
      localStorage.setItem(config.storageKey, JSON.stringify(data))
      return { allowed: true, remaining: config.maxAttempts, resetAt: data.resetAt }
    }

    const data = JSON.parse(stored)
    
    // Check if window has expired
    if (now > data.resetAt) {
      // Reset window
      const newData = {
        count: 0,
        resetAt: now + config.windowMs
      }
      localStorage.setItem(config.storageKey, JSON.stringify(newData))
      return { allowed: true, remaining: config.maxAttempts, resetAt: newData.resetAt }
    }

    // Check if limit exceeded
    if (data.count >= config.maxAttempts) {
      const remaining = 0
      const minutesUntilReset = Math.ceil((data.resetAt - now) / 60000)
      return { 
        allowed: false, 
        remaining, 
        resetAt: data.resetAt,
        minutesUntilReset
      }
    }

    // Within limit
    const remaining = config.maxAttempts - data.count - 1
    return { allowed: true, remaining, resetAt: data.resetAt }
  } catch (error) {
    console.error('Rate limit check error:', error)
    // On error, allow the action (fail open, but log the error)
    return { allowed: true, remaining: config.maxAttempts, resetAt: Date.now() }
  }
}

/**
 * Record an attempt for rate limiting
 * @param {string} action - The action type
 * @returns {boolean} - true if allowed, false if rate limited
 */
export function recordAttempt(action) {
  const config = RATE_LIMIT_CONFIG[action]
  if (!config) {
    return true
  }

  try {
    const stored = localStorage.getItem(config.storageKey)
    const now = Date.now()
    
    if (!stored) {
      const data = {
        count: 1,
        resetAt: now + config.windowMs
      }
      localStorage.setItem(config.storageKey, JSON.stringify(data))
      return true
    }

    const data = JSON.parse(stored)
    
    // Check if window has expired
    if (now > data.resetAt) {
      const newData = {
        count: 1,
        resetAt: now + config.windowMs
      }
      localStorage.setItem(config.storageKey, JSON.stringify(newData))
      return true
    }

    // Increment count
    data.count += 1
    localStorage.setItem(config.storageKey, JSON.stringify(data))
    
    // Check if limit exceeded
    if (data.count > config.maxAttempts) {
      return false
    }

    return true
  } catch (error) {
    console.error('Rate limit record error:', error)
    // On error, allow the action
    return true
  }
}

/**
 * Reset rate limit for an action (e.g., after successful operation)
 * @param {string} action - The action type
 */
export function resetRateLimit(action) {
  const config = RATE_LIMIT_CONFIG[action]
  if (!config) return

  try {
    localStorage.removeItem(config.storageKey)
  } catch (error) {
    console.error('Rate limit reset error:', error)
  }
}

/**
 * Get rate limit status message
 * @param {string} action - The action type
 * @returns {string} - User-friendly message
 */
export function getRateLimitMessage(action) {
  const status = checkRateLimit(action)
  if (status.allowed) {
    return null
  }

  const minutes = status.minutesUntilReset || Math.ceil((status.resetAt - Date.now()) / 60000)
  const actionName = action === 'signup' ? 'sign up' : 
                     action === 'passwordReset' ? 'reset password' : 
                     'log in'
  
  return `Too many ${actionName} attempts. Please try again in ${minutes} minute${minutes !== 1 ? 's' : ''}.`
}

