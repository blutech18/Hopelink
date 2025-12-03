import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

// Get the directory of the current file
const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// Load environment variables from .env file in the project root
dotenv.config({ path: join(__dirname, '..', '.env') })

const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY

// Check if Supabase is properly configured
if (!supabaseUrl || !supabaseAnonKey || supabaseUrl === 'your_supabase_project_url') {
  console.error('❌ Supabase not configured. Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your .env file')
  process.exit(1)
}

// Create Supabase client
const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Define tables to clear (excluding 'users')
// Order matters: delete from child tables first to respect foreign key constraints
const tablesToClear = [
  // Child tables (with foreign keys) - delete first
  'deliveries',
  'donation_claims',
  'event_items',
  'event_attendance', // Optional table
  'smart_matches', // Optional table
  'pickups', // Optional table
  
  // Parent tables
  'donations',
  'donation_requests',
  'events',
  
  // Independent tables
  'notifications',
  'settings',
  'feedback_ratings',
  'platform_feedback',
  'database_backups',
  'system_logs', // Optional table
]

/**
 * Clear all data from a specific table
 */
async function clearTable(tableName) {
  try {
    // First, try to get the table structure to determine the best delete strategy
    // We'll use a condition that should match all rows
    // For tables with created_at, use a date filter that matches all
    // For other tables, try deleting with a condition that matches all rows
    
    // Try deleting with a condition that should match all rows
    // Using .gte('created_at', '1970-01-01') for tables with created_at
    // For tables without created_at, we'll try a different approach
    
    let deleteQuery = supabase.from(tableName).delete()
    
    // Try with created_at filter first (most tables have this)
    let { error } = await deleteQuery.gte('created_at', '1970-01-01')
    
    // If that fails, try with id filter (for tables without created_at)
    if (error && (error.code === 'PGRST202' || error.message.includes('No rows found') || error.message.includes('created_at'))) {
      // Try with a different condition - use id filter if it's a UUID table
      deleteQuery = supabase.from(tableName).delete()
      const { error: error2 } = await deleteQuery.neq('id', '')
      if (!error2) {
        // Success with id filter
        console.log(`✅ Cleared table '${tableName}'`)
        return { success: true, skipped: false }
      }
      // If error2 is about table not existing, handle it
      if (error2.code === 'PGRST116' || error2.message.includes('does not exist')) {
        console.log(`⚠️  Table '${tableName}' does not exist, skipping...`)
        return { success: false, skipped: true }
      }
      // If it's a "no rows" error, that's actually success
      if (error2.code === 'PGRST202' || error2.message.includes('No rows')) {
        console.log(`ℹ️  Table '${tableName}' is already empty`)
        return { success: true, skipped: false }
      }
      // Otherwise, use the original error
      error = error2
    }
    
    // If still error and it's about table not existing, handle gracefully
    if (error) {
      if (error.code === 'PGRST116' || error.message.includes('does not exist') || error.message.includes('relation') && error.message.includes('does not exist')) {
        console.log(`⚠️  Table '${tableName}' does not exist, skipping...`)
        return { success: false, skipped: true }
      }
      // If it's a "no rows" error, that's actually success (table is already empty)
      if (error.code === 'PGRST202' || error.message.includes('No rows')) {
        console.log(`ℹ️  Table '${tableName}' is already empty`)
        return { success: true, skipped: false }
      }
      throw error
    }
    
    console.log(`✅ Cleared table '${tableName}'`)
    return { success: true, skipped: false }
  } catch (error) {
    // Handle case where table doesn't exist gracefully
    if (error.code === 'PGRST116' || error.message.includes('does not exist') || (error.message.includes('relation') && error.message.includes('does not exist'))) {
      console.log(`⚠️  Table '${tableName}' does not exist, skipping...`)
      return { success: false, skipped: true }
    }
    // If it's a "no rows" error, that's actually success
    if (error.code === 'PGRST202' || error.message.includes('No rows')) {
      console.log(`ℹ️  Table '${tableName}' is already empty`)
      return { success: true, skipped: false }
    }
    console.error(`❌ Error clearing table '${tableName}':`, error.message)
    return { success: false, skipped: false, error: error.message }
  }
}

/**
 * Clear all data from all tables except users
 */
async function clearAllTables() {
  console.log('🗑️  Starting database cleanup (preserving users table)...\n')
  
  const results = {
    cleared: [],
    skipped: [],
    errors: []
  }
  
  // Clear each table
  for (const table of tablesToClear) {
    const result = await clearTable(table)
    
    if (result.success) {
      results.cleared.push(table)
    } else if (result.skipped) {
      results.skipped.push(table)
    } else {
      results.errors.push({ table, error: result.error })
    }
  }
  
  // Summary
  console.log('\n' + '='.repeat(50))
  console.log('📊 Cleanup Summary:')
  console.log('='.repeat(50))
  console.log(`✅ Successfully cleared: ${results.cleared.length} table(s)`)
  if (results.cleared.length > 0) {
    results.cleared.forEach(table => console.log(`   - ${table}`))
  }
  
  if (results.skipped.length > 0) {
    console.log(`\n⚠️  Skipped (table doesn't exist): ${results.skipped.length} table(s)`)
    results.skipped.forEach(table => console.log(`   - ${table}`))
  }
  
  if (results.errors.length > 0) {
    console.log(`\n❌ Errors: ${results.errors.length} table(s)`)
    results.errors.forEach(({ table, error }) => {
      console.log(`   - ${table}: ${error}`)
    })
  }
  
  console.log('\n✅ Database cleanup completed!')
  console.log('ℹ️  Note: The users table was preserved.')
  
  return results
}

// Run the cleanup
clearAllTables()
  .then(() => {
    console.log('\n✨ Done!')
    process.exit(0)
  })
  .catch((error) => {
    console.error('\n❌ Fatal error:', error)
    process.exit(1)
  })

