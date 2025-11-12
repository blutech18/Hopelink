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
          // Don't chunk source files
          if (!id.includes('node_modules')) {
            return null
          }

          // WHITELIST APPROACH: Put everything into vendor-react EXCEPT explicitly non-React packages
          // This ensures React is always available and prevents "Cannot read properties of undefined" errors
          
          // Explicitly non-React packages that can be split out
          const nonReactPackages = [
            'jspdf',
            'html2canvas',
            '@supabase/supabase-js',
            // Server-side packages (shouldn't be in client bundle, but just in case)
            'express',
            'bcryptjs',
            'compression',
            'cors',
            'dotenv',
            'helmet',
            'jsonwebtoken',
            'multer',
            'pg'
          ]
          
          // Check if this is an explicitly non-React package
          const isNonReact = nonReactPackages.some(pkg => id.includes(`node_modules/${pkg}`))
          
          if (isNonReact) {
            // Split non-React packages into appropriate chunks
            if (id.includes('node_modules/jspdf')) {
              return 'vendor-pdf'
            }
            if (id.includes('node_modules/html2canvas')) {
              return 'vendor-canvas'
            }
            if (id.includes('node_modules/@supabase')) {
              return 'vendor-supabase'
            }
            // Other non-React packages go to vendor-misc
            return 'vendor-misc'
          }
          
          // EVERYTHING ELSE goes to vendor-react to ensure React is always available
          // This includes all React libraries, their dependencies, and any unknown packages
          return 'vendor-react'
        },
      },
    },
    chunkSizeWarningLimit: 1000, // Increased limit - vendor-react at ~900kB is reasonable for React apps
    commonjsOptions: {
      include: [/node_modules/],
      transformMixedEsModules: true,
    },
  },
  optimizeDeps: {
    include: ['react', 'react-dom', 'react/jsx-runtime'],
    force: true,
  },
})