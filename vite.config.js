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

          // Bundle ALL React and React-dependent code together
          // This ensures React is always available when needed
          if (
            id.includes('node_modules/react') ||
            id.includes('node_modules/react-dom') ||
            id.includes('node_modules/@radix-ui') ||
            id.includes('node_modules/react-router') ||
            id.includes('node_modules/framer-motion') ||
            id.includes('node_modules/react-hook-form') ||
            id.includes('node_modules/recharts') ||
            id.includes('node_modules/lucide-react') ||
            id.includes('node_modules/@react-google-maps') ||
            id.includes('node_modules/@vis.gl/react-google-maps') ||
            // Catch any package with "react" in its path (including transitive deps)
            (id.includes('node_modules') && (
              id.includes('/react') ||
              id.includes('react/') ||
              id.match(/node_modules\/[^/]*react[^/]*\//)
            ))
          ) {
            return 'vendor-react'
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