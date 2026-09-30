// AI Assistance Disclosure:
// Tool: Claude Code (model: Sonnet 5), date: 2026-09-27
// Scope: Proxy targets now read from env vars (falling back to localhost for host-based dev), mirroring
// the admin-portal fix — student-app runs in its own container where "localhost" refers to itself, not
// the backend containers, so docker-compose.yml overrides these to the real service names.
// Author review: (to be completed by author after review)
//
// AI Assistance Disclosure:
// Tool: Claude Code (model: Sonnet 5), date: 2026-09-30
// Scope: Proxy no longer routes to user-service/supplier-service/notification-service directly — every
// rule (including /ws) now points at the nginx API Gateway (GATEWAY_URL), so every request from this app
// goes through the gateway regardless of which port the app is accessed on (previously only true when
// accessed via the gateway's own port 80, or when hitting the generic /api fallback).
// Author review: (to be completed by author after review)

import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Proxy target defaults to localhost for normal host-based dev (`npm run dev:student`, gateway also
// running on the host). Inside Docker, student-app runs in its own container where "localhost" refers
// to itself, not the gateway — so docker-compose.yml overrides this to the gateway's real service name
// (http://api-gateway:80) via GATEWAY_URL.
const gatewayTarget = process.env.GATEWAY_URL ?? 'http://localhost';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    host: true,
    proxy: {
      '/api/suppliers': {
        target: gatewayTarget,
        changeOrigin: true,
      },
      '/api/auth': {
        target: gatewayTarget,
        changeOrigin: true,
      },
      '/api/users': {
        target: gatewayTarget,
        changeOrigin: true,
      },
      '/api': {
        target: gatewayTarget,
        changeOrigin: true,
      },
      '/ws': {
        target: gatewayTarget,
        ws: true,
      },
    },
  },
});
