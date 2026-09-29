import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const gatewayTarget = process.env.GATEWAY_URL ?? 'http://localhost';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5174,
    host: true,
    proxy: {
      '/api': {
        target: gatewayTarget,
        changeOrigin: true,
      },
    },
  },
});
