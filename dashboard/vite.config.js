// dashboard/vite.config.js
import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ mode }) => {
  // Baca .env dari root project (satu level di atas dashboard/)
  const env = loadEnv(mode, '../', '')
  const serverPort = parseInt(env.PORT) || 3000

  return {
    plugins: [react()],
    base: '/dashboard/',
    build: { outDir: 'dist' },
    server: {
      port: serverPort + 1,  // Dashboard dev server: PORT+1 (misal 3001 jika server di 3000)
      proxy: {
        '/api':       { target: `http://localhost:${serverPort}`, changeOrigin: true },
        '/socket.io': { target: `http://localhost:${serverPort}`, ws: true },
        '/webhook':   { target: `http://localhost:${serverPort}`, changeOrigin: true },
      }
    }
  }
})
