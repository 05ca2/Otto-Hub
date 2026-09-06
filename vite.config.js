import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// 本地开发：前端跑在 5173，AI 请求经 /api 代理到后端 8787（同源，无 CORS 问题）
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:8787',
        changeOrigin: true
      }
    }
  },
  build: {
    outDir: 'dist',
    chunkSizeWarningLimit: 1500
  }
});
