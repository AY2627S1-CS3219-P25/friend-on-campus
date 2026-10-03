// AI Assistance Disclosure:
// Tool: Codex (model: GPT-6), date: 2026-10-01
// Scope: Keep host-based API proxies on local services while Compose routes through the gateway.
// Author review: Approved by ngkhengyang
//
// Tool: Codex (model: GPT-6), date: 2026-09-30
// Scope: Serve admin pages and assets under /admin/ through the gateway.
// Author review: <to be completed by huangjiaxi1111>
// AI-generated (edited by huangjiaxi1111)
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// AI-generated (edited by huangjiaxi1111)
// Docker routes through the gateway; host-based development uses local services.
const gatewayTarget = process.env.GATEWAY_URL;
const supplierTarget = gatewayTarget ?? process.env.SUPPLIER_SERVICE_URL ?? 'http://localhost:8002';
const userTarget = gatewayTarget ?? process.env.USER_SERVICE_URL ?? 'http://localhost:8001';

export default defineConfig({
  base: '/admin/',
  plugins: [react()],
  server: {
    port: 5174,
    host: true,
    allowedHosts: ['admin-portal'],
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
