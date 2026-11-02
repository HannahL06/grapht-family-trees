import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      // The browser calls /api/..., Vite forwards it to the FastAPI backend
      // unchanged: the backend serves all its routes under /api too, so no
      // path rewriting is needed here or in production.
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
    },
  },
})
