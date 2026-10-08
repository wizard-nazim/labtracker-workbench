import path from 'path'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  // Lets the default same-origin '/api' base (src/lib/api-client.ts) reach the
  // API's launchSettings port without a .env file.
  server: {
    proxy: {
      '/api': 'http://localhost:5119',
    },
  },
})
