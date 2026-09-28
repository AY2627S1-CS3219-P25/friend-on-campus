// AI Assistance Disclosure:
// Tool: Claude Code (model: Sonnet 5), date: 2026-09-27
// Scope: Proxy targets now read from env vars (falling back to localhost for host-based dev), mirroring
// the admin-portal fix — student-app runs in its own container where "localhost" refers to itself, not
// the backend containers, so docker-compose.yml overrides these to the real service names.
// Author review: (to be completed by author after review)

import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Proxy targets default to localhost for normal host-based dev (`npm run dev:student`
// with the backend services also running on the host). Inside Docker, student-app
// runs in its own container where "localhost" refers to itself, not the backend
// containers — so docker-compose.yml overrides these to the real service names
// (e.g. http://user-service:8001) via env vars.
const supplierTarget = process.env.SUPPLIER_SERVICE_URL ?? 'http://localhost:8002';
const userTarget = process.env.USER_SERVICE_URL ?? 'http://localhost:8001';
const gatewayTarget = process.env.GATEWAY_URL ?? 'http://localhost';
const notificationTarget = process.env.NOTIFICATION_SERVICE_URL ?? 'ws://localhost:8005';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    host: true,
    proxy: {
      '/api/suppliers': {
        target: supplierTarget,
        changeOrigin: true,
      },
      '/api/auth': {
        target: userTarget,
        changeOrigin: true,
      },
      '/api/users': {
        target: userTarget,
        changeOrigin: true,
      },
      '/api': {
        target: gatewayTarget,
        changeOrigin: true,
      },
      '/ws': {
        target: notificationTarget,
        ws: true,
      },
    },
  },
});
