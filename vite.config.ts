import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  // ⚠️ Si el repo NO se llama "maderna-app", cambiá el segmento de abajo
  base: process.env.GITHUB_PAGES ? '/maderna-app/' : '/',
  build: { sourcemap: true },
})
