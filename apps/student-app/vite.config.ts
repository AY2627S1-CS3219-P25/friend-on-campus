/**
 * AI Assistance Disclosure:
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
      '/admin': {
        target: adminTarget,
        changeOrigin: true,
        ws: true,
      },
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
