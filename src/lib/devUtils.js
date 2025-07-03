// Development utilities and helpers
import { supabase } from './supabase'

// Check if we're in development mode
export const isDevelopment = import.meta.env.MODE === 'development'

// Development utilities and configuration

// Test database connection
export const testSupabaseConnection = async () => {
  try {
    const { data, error } = await supabase.from('users').select('count').limit(1)
    
    if (error) {
      console.error('❌ Supabase connection failed:', error.message)
      return false
    }
    
    console.log('✅ Supabase connection successful!')
    return true
  } catch (error) {
    console.error('❌ Supabase connection error:', error)
    return false
  }
}

// Check if database tables exist
export const checkDatabaseSetup = async () => {
  const requiredTables = [
    'users',
    'donations', 
    'donation_requests',
    'donation_claims',
    'deliveries',
    'events'
  ]
  
  const results = {}
  
  for (const table of requiredTables) {
    try {
      const { data, error } = await supabase.from(table).select('count').limit(1)
      results[table] = !error
      
      if (error) {
        console.warn(`⚠️ Table '${table}' not accessible:`, error.message)
      }
    } catch (error) {
      results[table] = false
      console.warn(`⚠️ Table '${table}' check failed:`, error.message)
    }
  }
  
  return results
}

// Get environment configuration status
export const getEnvironmentStatus = () => {
  const config = {
    supabaseUrl: !!import.meta.env.VITE_SUPABASE_URL,
    supabaseKey: !!import.meta.env.VITE_SUPABASE_ANON_KEY,
    isValidSupabaseUrl: import.meta.env.VITE_SUPABASE_URL?.includes('supabase.co'),
    isDevelopment
  }
  
  const isConfigured = config.supabaseUrl && config.supabaseKey && config.isValidSupabaseUrl
  
  return {
    ...config,
    isConfigured,
    status: isConfigured ? '✅ Ready' : '⚠️ Needs Configuration'
  }
}

// Development console helper
export const devLog = (message, type = 'info') => {
  if (!isDevelopment) return
  
  const styles = {
    info: 'color: #3b82f6; font-weight: bold',
    success: 'color: #22c55e; font-weight: bold',
    warning: 'color: #f59e0b; font-weight: bold',
    error: 'color: #ef4444; font-weight: bold'
  }
  
  console.log(`%c[HopeLink Dev] ${message}`, styles[type] || styles.info)
}

// Create a demo user for testing
export const createDemoUser = async (role = 'donor') => {
  const demoUsers = {
    donor: {
      email: 'demo.donor@hopelink.test',
      password: 'demo123456',
      name: 'Demo Donor',
      role: 'donor'
    },
    recipient: {
      email: 'demo.recipient@hopelink.test', 
      password: 'demo123456',
      name: 'Demo Recipient',
      role: 'recipient'
    },
    volunteer: {
      email: 'demo.volunteer@hopelink.test',
      password: 'demo123456', 
      name: 'Demo Volunteer',
      role: 'volunteer'
    }
  }
  
  const userData = demoUsers[role]
  if (!userData) {
    throw new Error('Invalid role specified')
  }
  
  try {
    const { data, error } = await supabase.auth.signUp({
      email: userData.email,
      password: userData.password,
      options: {
        data: {
          name: userData.name,
          role: userData.role
        }
      }
    })
    
    if (error) throw error
    
    devLog(`Demo ${role} user created: ${userData.email}`, 'success')
    return data
  } catch (error) {
    devLog(`Failed to create demo ${role}: ${error.message}`, 'error')
    throw error
  }
}

// Setup wizard helper
export const runSetupWizard = async () => {
  devLog('🚀 Running HopeLink Setup Wizard...', 'info')
  
  // Check environment
  const envStatus = getEnvironmentStatus()
  console.table(envStatus)
  
  if (!envStatus.isConfigured) {
    devLog('⚠️ Environment not configured. Please update your .env file.', 'warning')
    return false
  }
  
  // Test connection
  const connectionOk = await testSupabaseConnection()
  if (!connectionOk) {
    devLog('❌ Cannot connect to Supabase. Check your credentials.', 'error')
    return false
  }
  
  // Check database
  const dbStatus = await checkDatabaseSetup()
  const missingTables = Object.entries(dbStatus)
    .filter(([table, exists]) => !exists)
    .map(([table]) => table)
  
  if (missingTables.length > 0) {
    devLog(`⚠️ Missing database tables: ${missingTables.join(', ')}`, 'warning')
    devLog('📄 Please run the migration script from hopelink_migration.sql', 'info')
    return false
  }
  
  devLog('✅ Setup complete! HopeLink is ready to use.', 'success')
  return true
}

// Development utilities for debugging

export const authDebug = {
  // Log authentication state
  logAuthState: (user, profile, session, loading) => {
    if (import.meta.env.NODE_ENV === 'development') {
      console.log('🔍 Auth State Debug:', {
        user: user ? { id: user.id, email: user.email } : null,
        profile: profile ? { id: profile.id, name: profile.name, role: profile.role } : null,
        session: session ? { expires_at: session.expires_at } : null,
        loading,
        timestamp: new Date().toISOString()
      })
    }
  },

  // Log profile loading attempts
  logProfileLoading: (userId, step, data = null) => {
    if (import.meta.env.NODE_ENV === 'development') {
      console.log(`👤 Profile Loading [${step}]:`, { userId, data, timestamp: new Date().toISOString() })
    }
  },

  // Log sign out attempts
  logSignOut: (step, data = null) => {
    if (import.meta.env.NODE_ENV === 'development') {
      console.log(`🚪 Sign Out [${step}]:`, { data, timestamp: new Date().toISOString() })
    }
  },

  // Test auth functions
  testAuthConnection: async (supabase) => {
    if (import.meta.env.NODE_ENV !== 'development' || !supabase) return

    try {
      const start = performance.now()
      const { data, error } = await supabase.auth.getSession()
      const end = performance.now()
      
      console.log('🧪 Auth Connection Test:', {
        success: !error,
        duration: `${(end - start).toFixed(2)}ms`,
        hasSession: !!data?.session,
        error: error?.message
      })
    } catch (testError) {
      console.log('🧪 Auth Connection Test Failed:', testError.message)
    }
  }
}

// Role debugging utilities
export const roleDebug = {
  // ... existing code ...
} 