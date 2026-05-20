import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: '/developer/',
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
  },
  server: {
    port: 5174,
    proxy: {
      '/developer': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
    },
  },
})
