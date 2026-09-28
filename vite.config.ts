import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  base: process.env.PAGES_BASE || '/',
  plugins: [vue()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('src', import.meta.url)),
      '@fixtures': fileURLToPath(new URL('fixtures', import.meta.url)),
    },
  },
  server: { port: 5310 },
  build: {
    rollupOptions: {
      output: { manualChunks: { echarts: ['echarts', 'vue-echarts'], tabulator: ['tabulator-tables'] } },
    },
  },
})
