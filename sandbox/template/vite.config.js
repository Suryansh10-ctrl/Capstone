import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    port: 5173,
    allowedHosts: true,
    hmr: false,
    watch: {
      usePolling: true,
      interval: 1000,
      ignored: [
        '**/node_modules/**',
        '**/.git/**',
        '**/dist/**',
        '**/.vite/**'
      ]
    }
  },
  optimizeDeps: {
    include: ['react', 'react-dom', 'react/jsx-runtime'],
    force: false
  }
})
