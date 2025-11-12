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

          // React core and ALL React-dependent libraries - MUST stay together
          // This prevents "Cannot read properties of undefined" errors for React APIs
          // Be very aggressive - catch ANY package that might use React
          
          // Extract the package name from the path
          const nodeModulesIndex = id.indexOf('node_modules/')
          if (nodeModulesIndex !== -1) {
            const afterNodeModules = id.substring(nodeModulesIndex + 'node_modules/'.length)
            const packagePath = afterNodeModules.split('/')
            const packageName = packagePath[0].startsWith('@') 
              ? `${packagePath[0]}/${packagePath[1]}` 
              : packagePath[0]
            
            // Known React libraries and their common dependencies
            const reactLibraries = [
              'react', 'react-dom', 'react-router', 'react-router-dom',
              'framer-motion', 'recharts', 'lucide-react', 'react-hook-form',
              '@radix-ui', '@react-google-maps', '@vis.gl/react-google-maps'
            ]
            
            // Check if it's a React library or contains "react" in name/path
            const isReactRelated = 
              reactLibraries.some(lib => packageName.includes(lib)) ||
              id.includes('/react') ||
              id.includes('react/') ||
              id.match(/react/i) ||
              // Common dependencies of React libraries that might use React
              packageName.includes('@radix-ui') ||
              packageName.includes('@floating-ui') || // Used by Radix UI
              packageName.includes('@dnd-kit') || // Sometimes used with React
              packageName.includes('zustand') || // React state management
              packageName.includes('jotai') || // React state management
              packageName.includes('valtio') || // React state management
              // Common utility packages used by React libraries
              packageName === 'clsx' || // Used by many React libraries
              packageName === 'tailwind-merge' || // Used with React
              packageName.includes('@emotion') || // CSS-in-JS for React
              packageName.includes('styled-components') || // CSS-in-JS for React
              packageName.includes('polished') // CSS utilities used with React
          
            if (isReactRelated) {
              return 'vendor-react'
            }
          } else {
            // Fallback: if we can't parse, check for react in path
            if (id.includes('react') || id.includes('@radix-ui')) {
              return 'vendor-react'
            }
          }

          // PDF libraries (large, can be split)
          if (id.includes('node_modules/jspdf')) {
            return 'vendor-pdf'
          }

          // Canvas library (large, can be split)
          if (id.includes('node_modules/html2canvas')) {
            return 'vendor-canvas'
          }

          // Supabase (non-React)
          if (id.includes('node_modules/@supabase')) {
            return 'vendor-supabase'
          }

          // Other large node_modules (non-React)
          return 'vendor-misc'
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