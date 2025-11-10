import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// Load environment variables
dotenv.config({ path: join(__dirname, '..', '.env') })

const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase configuration in .env file')
  console.error('   Required: VITE_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

// Comprehensive list of potential tables from codebase analysis
const potentialTables = [
  // Core tables
  'users',
  'profiles',
  
  // Donation tables
  'donations',
  'donation_requests',
  'donation_claims',
  
  // Event tables
  'events',
  'event_participants',
  'event_attendance',
  'event_absences',
  'event_items',
  
  // Delivery tables
  'deliveries',
  'delivery_requests',
  'pickups',
  'direct_deliveries',
  
  // Feedback tables
  'feedback_ratings',
  'platform_feedback',
  
  // Notification tables
  'notifications',
  
  // Settings tables
  'settings',
  'admin_settings',
  
  // System tables
  'system_logs',
  'database_backups',
  'user_reports',
  
  // Matching tables
  'smart_matches'
]

async function checkTableExists(tableName) {
  try {
    const { data, error } = await supabase
      .from(tableName)
      .select('*')
      .limit(1)
    
    if (error) {
      if (error.code === '42P01') {
        return { exists: false, error: null }
      }
      // Other errors might indicate table exists but has RLS issues
      // Try to get schema info anyway
      return { exists: true, error: error.message }
    }
    
    return { exists: true, error: null, sampleData: data?.[0] || null }
  } catch (err) {
    if (err.code === '42P01') {
      return { exists: false, error: null }
    }
    return { exists: false, error: err.message }
  }
}

async function getTableColumns(tableName) {
  try {
    // Try to get at least one row to infer columns
    const { data, error } = await supabase
      .from(tableName)
      .select('*')
      .limit(1)
    
    if (error && error.code !== 'PGRST116') {
      // PGRST116 is "no rows returned" which is fine
      return { columns: [], error: error.message }
    }
    
    if (data && data.length > 0) {
      // Get column names from the first row
      const columns = Object.keys(data[0])
      return { columns, error: null }
    }
    
    // If no data, try to query with a specific column selection
    // This is a fallback - we'll try common column names
    const commonColumns = ['id', 'created_at', 'updated_at']
    const foundColumns = []
    
    for (const col of commonColumns) {
      try {
        const { error: colError } = await supabase
          .from(tableName)
          .select(col)
          .limit(0)
        
        if (!colError) {
          foundColumns.push(col)
        }
      } catch (e) {
        // Column doesn't exist
      }
    }
    
    return { columns: foundColumns, error: null, incomplete: true }
  } catch (error) {
    return { columns: [], error: error.message }
  }
}

async function getAllTables() {
  const existingTables = []
  
  console.log('🔍 Discovering tables in the database...\n')
  
  for (const tableName of potentialTables) {
    const result = await checkTableExists(tableName)
    
    if (result.exists) {
      existingTables.push(tableName)
      if (result.error) {
        console.log(`⚠️  Table "${tableName}" exists (has access restrictions)`)
      } else {
        console.log(`✅ Found table: ${tableName}`)
      }
    }
  }
  
  return existingTables
}

async function scanDatabase() {
  console.log('🔍 Scanning Supabase database for all tables and attributes...\n')
  console.log(`📍 Supabase URL: ${supabaseUrl}\n`)
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')

  try {
    const tables = await getAllTables()

    if (tables.length === 0) {
      console.log('❌ No tables found in the database')
      process.exit(1)
    }

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')
    console.log(`📊 Found ${tables.length} table(s) in the database:\n`)

    for (let i = 0; i < tables.length; i++) {
      const tableName = tables[i]
      console.log(`${i + 1}. Table: ${tableName}`)
      console.log('   ' + '─'.repeat(70))
      
      // Get columns for this table
      const { columns, error, incomplete } = await getTableColumns(tableName)
      
      if (error) {
        console.log(`   ⚠️  Error getting columns: ${error}`)
      } else if (columns.length > 0) {
        if (incomplete) {
          console.log(`   Columns (${columns.length} known, table may be empty):`)
        } else {
          console.log(`   Columns (${columns.length}):`)
        }
        
        // Try to get sample data to show data types
        const { data: sampleData } = await supabase
          .from(tableName)
          .select('*')
          .limit(1)
          .maybeSingle()
        
        columns.forEach((col, idx) => {
          let typeInfo = ''
          if (sampleData && sampleData[col] !== undefined && sampleData[col] !== null) {
            const value = sampleData[col]
            const type = typeof value
            if (type === 'string') {
              typeInfo = ` (string)`
            } else if (type === 'number') {
              typeInfo = ` (number)`
            } else if (type === 'boolean') {
              typeInfo = ` (boolean)`
            } else if (Array.isArray(value)) {
              typeInfo = ` (array)`
            } else if (type === 'object') {
              typeInfo = ` (object/json)`
            }
          }
          console.log(`     ${idx + 1}. ${col}${typeInfo}`)
        })
      } else {
        console.log('   ⚠️  No columns detected (table may be empty or have restricted access)')
      }
      
      console.log('')
    }

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')
    console.log('✅ Database scan complete!\n')
    console.log(`📋 Total tables: ${tables.length}\n`)

  } catch (error) {
    console.error('❌ Fatal error:', error.message)
    console.error(error)
    process.exit(1)
  }
}

scanDatabase().then(() => {
  process.exit(0)
}).catch((error) => {
  console.error('❌ Fatal error:', error)
  process.exit(1)
})

