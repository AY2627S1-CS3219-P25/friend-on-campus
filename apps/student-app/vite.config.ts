import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    host: true,
    proxy: {
      '/api/suppliers': {
        target: 'http://localhost:8002',
        changeOrigin: true,
      },
      '/api/auth': {
        target: 'http://localhost:8001',
        changeOrigin: true,
      },
      '/api/users': {
        target: 'http://localhost:8001',
        changeOrigin: true,
      },
      '/api': {
        target: 'http://localhost',
        changeOrigin: true,
      },
      '/ws': {
        target: 'ws://localhost:8005',
        ws: true,
      },
    },
  },
});
