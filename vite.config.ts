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
      output: {
        /* **vue를 먼저 제 청크로 묶는다.** 안 그러면 vue-echarts가 import하는 vue 런타임이 echarts 청크로
           끌려가고, 입구가 거기서 ref·openBlock을 받아 오느라 로그인 화면에서도 echarts 235KB(gzip)를 싣는다.
           첫 로드가 24KB여야 할 것이 259KB였다(2026-09-28 실측). 객체 형식도 경로 함수도 그 자체로는
           못 막는다 — Rollup이 수동 청크의 의존성을 끌어당기기 때문이다. vue를 명시해야 끊긴다. */
        manualChunks(id) {
          if (/node_modules\/(vue|@vue|vue-router)\//.test(id)) return 'vue'
          if (/node_modules\/(echarts|zrender|vue-echarts)\//.test(id)) return 'echarts'
          if (id.includes('node_modules/tabulator-tables/')) return 'tabulator'
        },
      },
    },
  },
})
