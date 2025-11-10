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
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

// All tables found
const tables = [
  'users',
  'donations',
  'donation_requests',
  'donation_claims',
  'events',
  'event_participants',
  'event_items',
  'deliveries',
  'direct_deliveries',
  'feedback_ratings',
  'platform_feedback',
  'notifications',
  'settings',
  'admin_settings',
  'system_logs',
  'database_backups',
  'user_reports'
]

async function getTableSchema(tableName) {
  try {
    // Try to get multiple rows to ensure we capture all columns
    const { data, error } = await supabase
      .from(tableName)
      .select('*')
      .limit(10)
    
    if (error && error.code !== 'PGRST116') {
      return { columns: [], error: error.message }
    }
    
    if (data && data.length > 0) {
      // Get all unique columns from all rows (in case some rows have null values)
      const allColumns = new Set()
      data.forEach(row => {
        Object.keys(row).forEach(key => allColumns.add(key))
      })
      
      // Get column types from the first non-null value
      const columnInfo = {}
      Array.from(allColumns).forEach(col => {
        for (const row of data) {
          if (row[col] !== null && row[col] !== undefined) {
            const value = row[col]
            let type = typeof value
            if (Array.isArray(value)) {
              type = 'array'
            } else if (type === 'object' && value !== null) {
              type = 'jsonb'
            } else if (type === 'string') {
              // Try to detect if it's a date
              if (/^\d{4}-\d{2}-\d{2}/.test(value) && !isNaN(Date.parse(value))) {
                type = 'timestamp'
              }
            }
            columnInfo[col] = type
            break
          }
        }
      })
      
      return { 
        columns: Array.from(allColumns).map(col => ({
          name: col,
          type: columnInfo[col] || 'unknown'
        })),
        error: null,
        rowCount: data.length
      }
    }
    
    // Table is empty, return empty result
    return { columns: [], error: null, rowCount: 0 }
  } catch (error) {
    return { columns: [], error: error.message, rowCount: 0 }
  }
}

async function generateReport() {
  console.log('📊 Supabase Database Schema Report\n')
  console.log(`📍 Project: ${supabaseUrl}\n`)
  console.log('='.repeat(80))
  console.log('')

  const allTablesInfo = []

  for (const tableName of tables) {
    console.log(`🔍 Analyzing table: ${tableName}...`)
    const schema = await getTableSchema(tableName)
    allTablesInfo.push({ name: tableName, ...schema })
  }

  console.log('\n')
  console.log('='.repeat(80))
  console.log('DATABASE SCHEMA SUMMARY')
  console.log('='.repeat(80))
  console.log('')

  allTablesInfo.forEach((table, index) => {
    console.log(`${index + 1}. ${table.name.toUpperCase()}`)
    console.log('-'.repeat(80))
    
    if (table.error) {
      console.log(`   ❌ Error: ${table.error}\n`)
    } else if (table.columns.length === 0) {
      console.log(`   ⚠️  Table is empty - no columns detected`)
      console.log(`   💡 This table exists but has no data to infer schema\n`)
    } else {
      console.log(`   Columns: ${table.columns.length}`)
      if (table.rowCount > 0) {
        console.log(`   Sample rows analyzed: ${table.rowCount}`)
      }
      console.log('')
      table.columns.forEach((col, idx) => {
        const typeStr = col.type ? ` (${col.type})` : ''
        console.log(`   ${String(idx + 1).padStart(3)}. ${col.name.padEnd(40)}${typeStr}`)
      })
      console.log('')
    }
  })

  console.log('='.repeat(80))
  console.log(`\n📋 Total Tables: ${allTablesInfo.length}`)
  console.log(`📊 Tables with data: ${allTablesInfo.filter(t => t.columns.length > 0).length}`)
  console.log(`⚠️  Empty tables: ${allTablesInfo.filter(t => t.columns.length === 0 && !t.error).length}`)
  console.log('')
}

generateReport().then(() => {
  process.exit(0)
}).catch((error) => {
  console.error('❌ Fatal error:', error)
  process.exit(1)
})

