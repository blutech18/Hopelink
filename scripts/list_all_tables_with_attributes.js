import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import { readdirSync, readFileSync, statSync } from 'fs'

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

function getLatestRemoteSchemaPath() {
  try {
    const migrationsDir = join(__dirname, '..', 'supabase', 'migrations')
    const files = readdirSync(migrationsDir)
      .filter((file) => file.endsWith('_remote_schema.sql'))

    if (files.length === 0) {
      return null
    }

    const filesWithStat = files
      .map((file) => {
        const fullPath = join(migrationsDir, file)
        const stats = statSync(fullPath)
        return { file, fullPath, mtime: stats.mtime }
      })
      .sort((a, b) => a.mtime - b.mtime)

    return filesWithStat[filesWithStat.length - 1].fullPath
  } catch (error) {
    console.warn('⚠️  Unable to locate remote schema file:', error.message)
    return null
  }
}

function getObjectsFromSchemaFile(schemaPath) {
  try {
    const content = readFileSync(schemaPath, 'utf8')
    const tableRegex = /create table\s+"public"\."([^"]+)"/gi
    const viewRegex = /create\s+(?:or\s+replace\s+)?view\s+"public"\."([^"]+)"/gi
    const tables = new Set()
    const views = new Set()
    let match

    while ((match = tableRegex.exec(content)) !== null) {
      tables.add(match[1])
    }

    while ((match = viewRegex.exec(content)) !== null) {
      views.add(match[1])
    }

    return { tables: Array.from(tables), views }
  } catch (error) {
    console.warn('⚠️  Unable to parse remote schema file:', error.message)
    return { tables: [], views: new Set() }
  }
}

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

async function getAllTablesFromSchema() {
  console.log('🔍 Discovering all tables using PostgreSQL system catalog...\n')
  
  try {
    // Use raw SQL to query PostgreSQL's information_schema
    const { data, error } = await supabase
      .rpc('exec_sql', { 
        sql: `
          SELECT table_name 
          FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_type = 'BASE TABLE'
          ORDER BY table_name;
        `
      })
    
    if (error) {
      console.log('⚠️  Could not query information_schema, trying alternative method...\n')
      return null
    }
    
    const tableNames = data.map(row => row.table_name)
    console.log(`✅ Found ${tableNames.length} tables via PostgreSQL system catalog`)
    
    return tableNames
    
  } catch (error) {
    console.log('⚠️  PostgreSQL system query failed:', error.message)
    return null
  }
}

async function getAllTables() {
  // First try to get all tables from PostgreSQL system catalog
  const systemTables = await getAllTablesFromSchema()
  
  if (systemTables && systemTables.length > 0) {
    console.log('\n📋 Tables discovered from system catalog:')
    systemTables.forEach((table, index) => {
      console.log(`✅ ${index + 1}. ${table}`)
    })
    console.log('')
    return systemTables
  }

  // Next try to read from the latest remote schema file generated by `supabase db pull`
  const schemaPath = getLatestRemoteSchemaPath()
  if (schemaPath) {
    console.log(`🔍 Using local remote schema file: ${schemaPath}\n`)
    const { tables: schemaTables, views: schemaViews } = getObjectsFromSchemaFile(schemaPath)
    if (schemaTables.length > 0) {
      const filteredTables = schemaTables.filter((table) => !schemaViews.has(table))
      filteredTables.forEach((table, index) => {
        console.log(`✅ ${index + 1}. ${table}`)
      })
      console.log('')
      return filteredTables
    }
  }
  
  // Final fallback: manual discovery using a curated list
  console.log('🔍 Falling back to manual table discovery...\n')
  
  // Curated fallback list of known tables in the production schema
  const fallbackTables = [
    'admin_settings',
    'audit_logs',
    'database_backups',
    'deliveries',
    'delivery_confirmations',
    'direct_deliveries',
    'donation_claims',
    'donation_requests',
    'donations',
    'event_items',
    'event_participants',
    'events',
    'feedback_ratings',
    'matching_parameters',
    'notifications',
    'performance_metrics',
    'platform_feedback',
    'settings',
    'system_logs',
    'system_settings',
    'user_preferences',
    'user_reports',
    'user_verifications',
    'users',
    'volunteer_ratings',
    'volunteer_requests',
    'volunteer_time_tracking'
  ]
  
  const existingTables = []
  
  for (const tableName of fallbackTables) {
    const result = await checkTableExists(tableName)
    
    if (result.exists) {
      existingTables.push(tableName)
      console.log(`✅ Found table: ${tableName}`)
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

