import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      'record-pcm': fileURLToPath(new URL('../dist/index.mjs', import.meta.url)),
    },
  },
  server: {
    port: 5173
  }
})
