/**
 * AI Assistance Disclosure:
 * Tool: Claude Code (model: Claude Fable 5.1, Sonnet 5); Codex (model: GPT-6), date: 2026-09-27 to 2026-10-20
 * Scope: Proxy targets now read from env vars (falling back to localhost for host-based dev), mirroring the admin-portal fix — student-app runs in its own container..; updated across 7 AI-assisted revisions through D4 wrap-up (/api/chat and /ws/chat proxy entries for the Chat Service (F8) in host-based development).
 * Author review: I validated correctness, edited for style, and verified with automated tests.
 */

import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Docker routes through the gateway; host-based development uses local services.
const gatewayTarget = process.env.GATEWAY_URL;
const supplierTarget = gatewayTarget ?? process.env.SUPPLIER_SERVICE_URL ?? 'http://localhost:8002';
const userTarget = gatewayTarget ?? process.env.USER_SERVICE_URL ?? 'http://localhost:8001';
const orderTarget = gatewayTarget ?? process.env.ORDER_SERVICE_URL ?? 'http://localhost:8003';
const creditTarget = gatewayTarget ?? process.env.CREDIT_SERVICE_URL ?? 'http://localhost:8004';
const notificationTarget = gatewayTarget ?? process.env.NOTIFICATION_SERVICE_URL ?? 'ws://localhost:8005';
// The same service over HTTP for /api/notifications.
const notificationApiTarget = gatewayTarget ?? notificationTarget.replace(/^ws/, 'http');
const adminTarget = process.env.ADMIN_PORTAL_URL ?? 'http://localhost:5174';
// The Chat Service (F8) over WebSocket and HTTP.
const chatTarget = gatewayTarget ?? process.env.CHAT_SERVICE_URL ?? 'ws://localhost:8006';
const chatApiTarget = gatewayTarget ?? chatTarget.replace(/^ws/, 'http');

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
      '/api/orders': {
        target: orderTarget,
        changeOrigin: true,
      },
      '/api/credits': {
        target: creditTarget,
        changeOrigin: true,
      },
      '/api/notifications': {
        target: notificationApiTarget,
        changeOrigin: true,
      },
      '/api/chat': {
        target: chatApiTarget,
        changeOrigin: true,
      },
      '/ws/chat': {
        target: chatTarget,
        ws: true,
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
