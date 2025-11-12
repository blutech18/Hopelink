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

          // React core libraries
          if (id.includes('node_modules/react') || id.includes('node_modules/react-dom')) {
            return 'vendor-react'
          }

          // Catch ALL React-related packages (including transitive dependencies)
          // Check for any package with "react" in its path to ensure React APIs are available
          // This catches packages like "react-*", "@*/react-*", and transitive deps
          const reactPatterns = [
            '/react-',
            'react-',
            '/react/',
            'react/',
            '@radix-ui',
            'framer-motion',
            'recharts',
            'lucide-react',
            '@react-google-maps',
            '@vis.gl/react-google-maps',
            'react-router',
            'react-hook-form'
          ]
          
          if (reactPatterns.some(pattern => id.includes(pattern))) {
            return 'vendor-react' // Bundle with React to avoid React API access issues
          }

          // Supabase (non-React)
          if (id.includes('@supabase')) {
            return 'vendor-supabase'
          }

          // Other large node_modules (non-React)
          return 'vendor-misc'
        },
      },
    },
    chunkSizeWarningLimit: 600,
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