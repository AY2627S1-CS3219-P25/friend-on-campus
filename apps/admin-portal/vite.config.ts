// AI Assistance Disclosure:
// Tool: Claude Code (model: Sonnet 5), date: 2026-09-30
// Scope: Proxy no longer routes to user-service/supplier-service directly — every rule now points at the
// nginx API Gateway (GATEWAY_URL), so every request from this app goes through the gateway regardless of
// which port the app is accessed on (previously only true when accessed via the gateway's own port 80).
// Author review: (to be completed by author after review)

import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Proxy target defaults to localhost for normal host-based dev (`npm run dev:admin`, gateway also
// running on the host). Inside Docker, admin-portal runs in its own container where "localhost" refers
// to itself, not the gateway — so docker-compose.yml overrides this to the gateway's real service name
// (http://api-gateway:80) via GATEWAY_URL.
const gatewayTarget = process.env.GATEWAY_URL ?? 'http://localhost';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5174,
    host: true,
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
