#!/usr/bin/env node

/**
 * HopeLink Setup Script
 * Automated setup for the HopeLink donation platform
 */

const fs = require('fs')
const path = require('path')
const readline = require('readline')

// ANSI color codes for terminal output
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  reset: '\x1b[0m',
  bold: '\x1b[1m'
}

const log = (message, color = 'reset') => {
  console.log(`${colors[color]}${message}${colors.reset}`)
}

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
})

const question = (query) => {
  return new Promise(resolve => rl.question(query, resolve))
}

// ASCII Art Banner
const banner = `
${colors.magenta}${colors.bold}
██╗  ██╗ ██████╗ ██████╗ ███████╗██╗     ██╗███╗   ██╗██╗  ██╗
██║  ██║██╔═══██╗██╔══██╗██╔════╝██║     ██║████╗  ██║██║ ██╔╝
███████║██║   ██║██████╔╝█████╗  ██║     ██║██╔██╗ ██║█████╔╝ 
██╔══██║██║   ██║██╔═══╝ ██╔══╝  ██║     ██║██║╚██╗██║██╔═██╗ 
██║  ██║╚██████╔╝██║     ███████╗███████╗██║██║ ╚████║██║  ██╗
╚═╝  ╚═╝ ╚═════╝ ╚═╝     ╚══════╝╚══════╝╚═╝╚═╝  ╚═══╝╚═╝  ╚═╝
${colors.reset}
${colors.cyan}🤝 Connecting Communities Through Compassion${colors.reset}
${colors.yellow}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}
`

// Main setup function
async function setup() {
  console.clear()
  console.log(banner)
  
  log('Welcome to the HopeLink Setup Wizard!', 'green')
  log('This script will help you configure your HopeLink donation platform.\n', 'cyan')
  
  // Check if .env already exists
  const envPath = path.join(process.cwd(), '.env')
  const envExists = fs.existsSync(envPath)
  
  if (envExists) {
    const overwrite = await question(`${colors.yellow}⚠️  .env file already exists. Overwrite? (y/N): ${colors.reset}`)
    if (overwrite.toLowerCase() !== 'y') {
      log('Setup cancelled. Existing .env file preserved.', 'yellow')
      rl.close()
      return
    }
  }
  
  log('📋 Please provide your Supabase project details:', 'blue')
  log('   (You can find these in your Supabase project settings → API)\n', 'cyan')
  
  // Collect Supabase credentials
  const supabaseUrl = await question('🔗 Supabase Project URL: ')
  const supabaseAnonKey = await question('🔑 Supabase Anon Key: ')
  const supabaseServiceKey = await question('🛡️  Supabase Service Role Key (optional): ')
  
  // Optional configuration
  log('\n📧 Optional: Email service configuration (for notifications)', 'blue')
  const sendgridKey = await question('📬 SendGrid API Key (optional): ')
  
  log('\n🗺️  Optional: Google Maps integration (for location features)', 'blue')
  const googleMapsKey = await question('🗺️  Google Maps API Key (optional): ')
  
  // Generate JWT secret
  const jwtSecret = generateRandomString(64)
  
  // Create .env content
  const envContent = `# HopeLink Environment Configuration
# Generated on ${new Date().toISOString()}

# Supabase Configuration
VITE_SUPABASE_URL=${supabaseUrl}
VITE_SUPABASE_ANON_KEY=${supabaseAnonKey}
SUPABASE_SERVICE_ROLE_KEY=${supabaseServiceKey}

# Server Configuration
PORT=5000
NODE_ENV=development
JWT_SECRET=${jwtSecret}

# Optional: External Service Keys
${sendgridKey ? `SENDGRID_API_KEY=${sendgridKey}` : '# SENDGRID_API_KEY=your-sendgrid-key'}
${googleMapsKey ? `GOOGLE_MAPS_API_KEY=${googleMapsKey}` : '# GOOGLE_MAPS_API_KEY=your-google-maps-key'}

# Development flags
VITE_DEV_MODE=true
`
  
  // Write .env file
  try {
    fs.writeFileSync(envPath, envContent)
    log('\n✅ Environment file created successfully!', 'green')
  } catch (error) {
    log(`\n❌ Error creating .env file: ${error.message}`, 'red')
    rl.close()
    return
  }
  
  // Show next steps
  log('\n🚀 Setup Complete! Next Steps:', 'green')
  log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', 'yellow')
  
  log('\n1. 🗄️  Set up your Supabase database:', 'cyan')
  log('   • Open your Supabase project dashboard', 'white')
  log('   • Go to SQL Editor', 'white')
  log('   • Copy and paste the contents of hopelink_migration.sql', 'white')
  log('   • Run the script to create all tables and functions', 'white')
  
  log('\n2. 🏃‍♂️ Start the development servers:', 'cyan')
  log('   npm run dev', 'yellow')
  
  log('\n3. 🌐 Open your browser and visit:', 'cyan')
  log('   Frontend: http://localhost:3000', 'blue')
  log('   Backend API: http://localhost:5000', 'blue')
  
  log('\n4. 🔍 Use the built-in development tools:', 'cyan')
  log('   • Press F1 for the Setup Guide', 'white')
  log('   • Monitor the browser console for development logs', 'white')
  
  log('\n📚 Additional Resources:', 'magenta')
  log('   • README.md - Complete documentation', 'white')
  log('   • hopelink_migration.sql - Database schema', 'white')
  
  log('\n🎉 Happy coding! Your HopeLink platform is ready to make a difference.', 'green')
  log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n', 'yellow')
  
  rl.close()
}

// Utility function to generate random string
function generateRandomString(length) {
  const charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*'
  let result = ''
  for (let i = 0; i < length; i++) {
    result += charset.charAt(Math.floor(Math.random() * charset.length))
  }
  return result
}

// Handle process termination
process.on('SIGINT', () => {
  log('\n\n👋 Setup cancelled by user.', 'yellow')
  rl.close()
  process.exit(0)
})

// Run setup
setup().catch(error => {
  log(`\n❌ Setup failed: ${error.message}`, 'red')
  rl.close()
  process.exit(1)
}) 