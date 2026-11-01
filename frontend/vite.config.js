import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      // The browser calls /api/..., Vite forwards it to the FastAPI backend.
      // The backend's routes have no /api prefix (/trees, /auth/login, /me),
      // so it must be stripped or every call would 404.
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ''),
      },
    },
  },
})
