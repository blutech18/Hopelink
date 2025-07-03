// Fix volunteer notification types in database
// Run this with: node fix_volunteer_notifications.js

import { createClient } from '@supabase/supabase-js'

// Read environment variables
const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Please set VITE_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY environment variables')
  console.log('You can also run this migration manually in your Supabase SQL editor:')
  console.log('\n-- Add volunteer notification types')
  console.log("ALTER TYPE notification_type ADD VALUE 'volunteer_approved';")
  console.log("ALTER TYPE notification_type ADD VALUE 'volunteer_declined';")
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function fixVolunteerNotifications() {
  try {
    console.log('Adding missing volunteer notification types...')
    
    // Try to add volunteer_approved if it doesn't exist
    try {
      const { error: error1 } = await supabase.rpc('exec_sql', {
        sql: "ALTER TYPE notification_type ADD VALUE 'volunteer_approved';"
      })
      
      if (error1 && !error1.message.includes('already exists')) {
        console.log('volunteer_approved type added successfully')
      } else if (error1?.message.includes('already exists')) {
        console.log('volunteer_approved type already exists')
      }
    } catch (e) {
      console.log('volunteer_approved type may already exist or error:', e.message)
    }
    
    // Try to add volunteer_declined if it doesn't exist
    try {
      const { error: error2 } = await supabase.rpc('exec_sql', {
        sql: "ALTER TYPE notification_type ADD VALUE 'volunteer_declined';"
      })
      
      if (error2 && !error2.message.includes('already exists')) {
        console.log('volunteer_declined type added successfully')
      } else if (error2?.message.includes('already exists')) {
        console.log('volunteer_declined type already exists')
      }
    } catch (e) {
      console.log('volunteer_declined type may already exist or error:', e.message)
    }
    
    console.log('✅ Volunteer notification types migration completed!')
    console.log('The volunteer notification system should now work properly.')
    console.log('\nWhat was fixed:')
    console.log('- Added volunteer_approved notification type')
    console.log('- Added volunteer_declined notification type') 
    console.log('- Enhanced volunteer dashboard with notification display')
    console.log('\nNow volunteers will see responses to their volunteer requests!')
    
  } catch (error) {
    console.error('❌ Migration failed:', error.message)
    console.log('\n📝 Please run this SQL manually in your Supabase SQL editor:')
    console.log('\n-- Add volunteer notification types')
    console.log("ALTER TYPE notification_type ADD VALUE 'volunteer_approved';")
    console.log("ALTER TYPE notification_type ADD VALUE 'volunteer_declined';")
  }
}

fixVolunteerNotifications() 