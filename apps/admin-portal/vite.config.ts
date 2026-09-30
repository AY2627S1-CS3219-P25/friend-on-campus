// AI Assistance Disclosure:
// Tool: Codex (model: GPT-6), date: 2026-09-30
// Scope: Serve admin pages and assets under /admin/ through the gateway.
// Author review: <to be completed by huangjiaxi1111>
// AI-generated (edited by huangjiaxi1111)
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Proxy targets default to localhost for normal host-based dev (`npm run dev:admin`
// with the backend services also running on the host). Inside Docker, admin-portal
// runs in its own container where "localhost" refers to itself, not the backend
// containers — so docker-compose.yml overrides these to the real service names
// (e.g. http://supplier-service:8002) via env vars.
const supplierTarget = process.env.SUPPLIER_SERVICE_URL ?? 'http://localhost:8002';
const userTarget = process.env.USER_SERVICE_URL ?? 'http://localhost:8001';

export default defineConfig({
  base: '/admin/',
  plugins: [react()],
  server: {
    port: 5174,
    host: true,
    proxy: {
      '/api/auth': {
        target: userTarget,
        changeOrigin: true,
      },
      '/api/users': {
        target: userTarget,
        changeOrigin: true,
      },
      '/api/suppliers': {
        target: supplierTarget,
        changeOrigin: true,
      },
      '/api': {
        target: supplierTarget,
        changeOrigin: true,
      },
    },
  },
});
