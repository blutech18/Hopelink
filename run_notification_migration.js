// Migration script to add notification types
// Run this with: node run_notification_migration.js

import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
import path from 'path'

// Read environment variables
const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Please set VITE_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY environment variables')
  console.log('You can also run this migration manually in your Supabase SQL editor:')
  console.log('\n-- Add new notification types for donation request system')
  console.log("ALTER TYPE notification_type ADD VALUE 'donation_request';")
  console.log("ALTER TYPE notification_type ADD VALUE 'donation_approved';")
  console.log("ALTER TYPE notification_type ADD VALUE 'donation_declined';")
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function runMigration() {
  try {
    console.log('Running notification types migration...')
    
    // Add the new notification types
    const { error: error1 } = await supabase.rpc('exec_sql', {
      sql: "ALTER TYPE notification_type ADD VALUE 'donation_request';"
    })
    
    if (error1 && !error1.message.includes('already exists')) {
      throw error1
    }
    
    const { error: error2 } = await supabase.rpc('exec_sql', {
      sql: "ALTER TYPE notification_type ADD VALUE 'donation_approved';"
    })
    
    if (error2 && !error2.message.includes('already exists')) {
      throw error2
    }
    
    const { error: error3 } = await supabase.rpc('exec_sql', {
      sql: "ALTER TYPE notification_type ADD VALUE 'donation_declined';"
    })
    
    if (error3 && !error3.message.includes('already exists')) {
      throw error3
    }
    
    console.log('✅ Notification types migration completed successfully!')
    console.log('Added: donation_request, donation_approved, donation_declined')
    
  } catch (error) {
    console.error('❌ Migration failed:', error.message)
    console.log('\n📝 Please run this SQL manually in your Supabase SQL editor:')
    console.log('\n-- Add new notification types for donation request system')
    console.log("ALTER TYPE notification_type ADD VALUE 'donation_request';")
    console.log("ALTER TYPE notification_type ADD VALUE 'donation_approved';")
    console.log("ALTER TYPE notification_type ADD VALUE 'donation_declined';")
  }
}

runMigration() 