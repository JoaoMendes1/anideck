import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    //Redireciona chamadas do React (/api) Silenciosamente para o GO (porta 8080)
    proxy: {
      '/api': {
        target: 'http://localhost:8080', 
        changeOrigin: true,
      }
    }
  }
})
