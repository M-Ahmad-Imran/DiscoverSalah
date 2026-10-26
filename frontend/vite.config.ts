import react from '@vitejs/plugin-react';
import { defineConfig,loadEnv } from 'vite';
export default defineConfig(({ mode }) => {
  const target = loadEnv(mode, '.', '').API_PROXY_TARGET || 'http://127.0.0.1:4000';
  return {
    plugins: [react()],
    build: { target: 'chrome80' },
    server: {
      proxy: {
        '/api': { target, changeOrigin: false },
        '/health': { target, changeOrigin: false },
      },
    },
  };
});
