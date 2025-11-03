import Redis from 'ioredis'
import dotenv from 'dotenv'

dotenv.config()

// Production-ready Redis configuration for local and cloud (Upstash/Vercel compatible)
const redisConfig = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD || undefined,
  tls: process.env.REDIS_TLS === 'true' ? {} : undefined,
  retryStrategy: (times) => {
    const delay = Math.min(times * 50, 2000)
    if (process.env.NODE_ENV !== 'production') {
      console.log(`Redis connection retry attempt ${times}, delay ${delay}ms`)
    }
    return delay
  },
  maxRetriesPerRequest: 3,
  enableOfflineQueue: process.env.NODE_ENV === 'production' ? false : true,
  lazyConnect: true // Connect on first use for serverless
}

// Create Redis client
export const redisClient = new Redis(redisConfig)

// Handle connection events
redisClient.on('connect', () => {
  if (process.env.NODE_ENV !== 'production') {
    console.log('✅ Redis client connected successfully')
  }
})

redisClient.on('ready', () => {
  if (process.env.NODE_ENV !== 'production') {
    console.log('✅ Redis client ready to receive commands')
  }
})

redisClient.on('error', (err) => {
  // In production, only log critical errors
  if (process.env.NODE_ENV === 'production' && err.code !== 'ECONNREFUSED') {
    console.error('Redis error:', err.message)
  } else if (process.env.NODE_ENV !== 'production') {
    console.error('❌ Redis client error:', err.message)
  }
  // Don't crash the app if Redis is unavailable
})

redisClient.on('close', () => {
  if (process.env.NODE_ENV !== 'production') {
    console.log('⚠️ Redis connection closed')
  }
})

redisClient.on('reconnecting', () => {
  if (process.env.NODE_ENV !== 'production') {
    console.log('🔄 Redis client reconnecting...')
  }
})

// Graceful shutdown (only in non-serverless environments)
if (process.env.NODE_ENV !== 'production' || process.env.IS_SERVERLESS !== 'true') {
  process.on('SIGINT', async () => {
    console.log('Closing Redis connection...')
    try {
      await redisClient.quit()
    } catch (error) {
      // Ignore errors during shutdown
    }
    process.exit(0)
  })

  process.on('SIGTERM', async () => {
    console.log('Closing Redis connection...')
    try {
      await redisClient.quit()
    } catch (error) {
      // Ignore errors during shutdown
    }
    process.exit(0)
  })
}

// Helper functions for caching
export const cache = {
  // Get cached data
  async get(key) {
    try {
      const data = await redisClient.get(key)
      return data ? JSON.parse(data) : null
    } catch (error) {
      console.error('Cache get error:', error.message)
      return null
    }
  },

  // Set cached data with optional expiration (in seconds)
  async set(key, value, expireInSeconds = null) {
    try {
      const data = JSON.stringify(value)
      if (expireInSeconds) {
        await redisClient.setex(key, expireInSeconds, data)
      } else {
        await redisClient.set(key, data)
      }
      return true
    } catch (error) {
      console.error('Cache set error:', error.message)
      return false
    }
  },

  // Delete cached data
  async delete(key) {
    try {
      await redisClient.del(key)
      return true
    } catch (error) {
      console.error('Cache delete error:', error.message)
      return false
    }
  },

  // Clear all cached data (use with caution)
  async clear() {
    try {
      await redisClient.flushall()
      return true
    } catch (error) {
      console.error('Cache clear error:', error.message)
      return false
    }
  }
}

// Helper functions for pub/sub
export const pubSub = {
  // Subscribe to a channel
  async subscribe(channel, callback) {
    try {
      const subscriber = new Redis(redisConfig)
      
      subscriber.subscribe(channel)
      
      subscriber.on('message', (receivedChannel, message) => {
        if (receivedChannel === channel) {
          try {
            const data = JSON.parse(message)
            callback(data)
          } catch (error) {
            console.error('Error parsing pub/sub message:', error.message)
          }
        }
      })
      
      return subscriber
    } catch (error) {
      console.error('Subscribe error:', error.message)
      return null
    }
  },

  // Publish to a channel
  async publish(channel, data) {
    try {
      const message = JSON.stringify(data)
      await redisClient.publish(channel, message)
      return true
    } catch (error) {
      console.error('Publish error:', error.message)
      return false
    }
  }
}

// Cache key generators for consistency
export const cacheKeys = {
  user: (userId) => `user:${userId}`,
  donation: (donationId) => `donation:${donationId}`,
  request: (requestId) => `request:${requestId}`,
  donationList: (filters) => {
    const filterStr = Object.entries(filters || {})
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, v]) => `${k}:${v}`)
      .join(':')
    return filterStr ? `donations:list:${filterStr}` : 'donations:list:all'
  },
  requestList: (filters) => {
    const filterStr = Object.entries(filters || {})
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, v]) => `${k}:${v}`)
      .join(':')
    return filterStr ? `requests:list:${filterStr}` : 'requests:list:all'
  },
  volunteerTasks: (volunteerId) => `volunteer:${volunteerId}:tasks`,
  donationsByDonor: (donorId) => `donor:${donorId}:donations`,
  requestsByRecipient: (recipientId) => `recipient:${recipientId}:requests`
}

// Pub/sub channel names
export const channels = {
  donations: 'donations:channel',
  requests: 'requests:channel',
  deliveries: 'deliveries:channel',
  notifications: 'notifications:channel',
  matches: 'matches:channel',
  users: 'users:channel'
}

export default redisClient
