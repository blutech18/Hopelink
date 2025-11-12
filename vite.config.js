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
          // React core libraries - bundle with React-dependent libraries to ensure single React instance
          if (id.includes('node_modules/react') || id.includes('node_modules/react-dom')) {
            return 'vendor-react'
          }
          // Bundle React-dependent UI libraries with React to ensure they share the same React instance
          if (id.includes('node_modules/@radix-ui')) {
            return 'vendor-react' // Bundle with React to avoid forwardRef issues
          }
          // Router - also React-dependent, bundle with React
          if (id.includes('node_modules/react-router-dom')) {
            return 'vendor-react' // Bundle with React to ensure single React instance
          }
          // Framer Motion (animations) - also React-dependent
          if (id.includes('node_modules/framer-motion')) {
            return 'vendor-react' // Bundle with React to avoid forwardRef issues
          }
          // Lucide icons
          if (id.includes('node_modules/lucide-react')) {
            return 'vendor-icons'
          }
          // Supabase
          if (id.includes('node_modules/@supabase')) {
            return 'vendor-supabase'
          }
          // React Hook Form - React-dependent
          if (id.includes('node_modules/react-hook-form')) {
            return 'vendor-react' // Bundle with React to avoid forwardRef issues
          }
          // Google Maps
          if (id.includes('node_modules/@react-google-maps') || id.includes('node_modules/@vis.gl/react-google-maps')) {
            return 'vendor-maps'
          }
          // Recharts - React-dependent
          if (id.includes('node_modules/recharts')) {
            return 'vendor-react' // Bundle with React to avoid forwardRef issues
          }
          // Other large node_modules
          if (id.includes('node_modules')) {
            return 'vendor-misc'
          }
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