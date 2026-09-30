// AI Assistance Disclosure:
// Tool: Codex (model: GPT-6), date: 2026-09-30
// Scope: Serve admin pages and assets under /admin/ through the gateway.
// Author review: <to be completed by huangjiaxi1111>
// AI-generated (edited by huangjiaxi1111)
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Proxy target defaults to localhost for normal host-based dev (`npm run dev:admin`, gateway also
// running on the host). Inside Docker, admin-portal runs in its own container where "localhost" refers
// to itself, not the gateway — so docker-compose.yml overrides this to the gateway's real service name
// (http://api-gateway:80) via GATEWAY_URL.
const gatewayTarget = process.env.GATEWAY_URL ?? 'http://localhost';

export default defineConfig({
  base: '/admin/',
  plugins: [react()],
  server: {
    port: 5174,
    host: true,
    allowedHosts: ['admin-portal'],
    proxy: {
      '/api/auth': {
        target: gatewayTarget,
        changeOrigin: true,
      },
      '/api/users': {
        target: gatewayTarget,
        changeOrigin: true,
      },
      '/api/suppliers': {
        target: gatewayTarget,
        changeOrigin: true,
      },
      '/api': {
        target: gatewayTarget,
        changeOrigin: true,
      },
    },
  },
});
