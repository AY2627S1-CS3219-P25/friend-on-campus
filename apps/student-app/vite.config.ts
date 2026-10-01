/**
 * AI Assistance Disclosure:
 * Tool: Codex (model: GPT-6), date: 2026-10-01
 * Scope: Restore the admin proxy target and keep host-based API and WebSocket service fallbacks.
 * Author review: <to be completed by author after review>
 *
 * Tool: Claude Code (model: Sonnet 5), date: 2026-09-27
 * Scope: Proxy targets now read from env vars (falling back to localhost for host-based dev), mirroring
 * the admin-portal fix — student-app runs in its own container where "localhost" refers to itself, not
 * the backend containers, so docker-compose.yml overrides these to the real service names.
 * Author review: (to be completed by author after review)
 *
 * Tool: Codex (model: GPT-6), date: 2026-09-30
 * Scope: Forward admin navigation and assets during direct Vite development.
 * Author review: <to be completed by huangjiaxi1111>
 */

import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// AI-generated (edited by huangjiaxi1111)
// Docker routes through the gateway; host-based development uses local services.
const gatewayTarget = process.env.GATEWAY_URL;
const supplierTarget = gatewayTarget ?? process.env.SUPPLIER_SERVICE_URL ?? 'http://localhost:8002';
const userTarget = gatewayTarget ?? process.env.USER_SERVICE_URL ?? 'http://localhost:8001';
const notificationTarget = gatewayTarget ?? process.env.NOTIFICATION_SERVICE_URL ?? 'ws://localhost:8005';
const adminTarget = process.env.ADMIN_PORTAL_URL ?? 'http://localhost:5174';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    host: true,
    proxy: {
      '/admin': {
        target: adminTarget,
        changeOrigin: true,
        ws: true,
      },
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
        target: gatewayTarget ?? supplierTarget,
        changeOrigin: true,
      },
      '/ws': {
        target: notificationTarget,
        ws: true,
      },
    },
  },
});
