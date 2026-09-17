import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

// https://vite.dev/config/
export default defineConfig({
  base: '/002-palette-generator/',
  plugins: [react()],
  test: {
    environment: 'jsdom',
  },
})
