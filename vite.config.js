import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 3000,
    headers: {
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'DENY',
      'X-XSS-Protection': '1; mode=block',
      'Referrer-Policy': 'strict-origin-when-cross-origin',
      'Content-Security-Policy': "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://*.supabase.co https://*.hcaptcha.com https://maps.googleapis.com https://*.googleapis.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; img-src 'self' data: https: blob:; font-src 'self' data: https://fonts.gstatic.com; connect-src 'self' https://*.supabase.co https://*.hcaptcha.com https://*.googleapis.com https://hcaptcha.com; frame-src https://*.hcaptcha.com;"
    },
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
      },
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          // React core libraries
          if (id.includes('node_modules/react') || id.includes('node_modules/react-dom')) {
            return 'vendor-react'
          }
          // Router
          if (id.includes('node_modules/react-router-dom')) {
            return 'vendor-router'
          }
          // Framer Motion (animations)
          if (id.includes('node_modules/framer-motion')) {
            return 'vendor-motion'
          }
          // Lucide icons
          if (id.includes('node_modules/lucide-react')) {
            return 'vendor-icons'
          }
          // Radix UI components
          if (id.includes('node_modules/@radix-ui')) {
            return 'vendor-ui'
          }
          // Supabase
          if (id.includes('node_modules/@supabase')) {
            return 'vendor-supabase'
          }
          // React Hook Form
          if (id.includes('node_modules/react-hook-form')) {
            return 'vendor-forms'
          }
          // Google Maps
          if (id.includes('node_modules/@react-google-maps')) {
            return 'vendor-maps'
          }
          // Other large node_modules
          if (id.includes('node_modules')) {
            return 'vendor-misc'
          }
        },
      },
    },
    chunkSizeWarningLimit: 600,
  },
})