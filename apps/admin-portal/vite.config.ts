// AI Assistance Disclosure:
// Tool: Google Antigravity Agent, date: 2026-10-22
// Scope: Added /api/health/{user,supplier,order,credit,notification} proxy routes for live microservice health and readiness checks in host and gateway dev modes.
// Author review: <to be completed by yanhwee>
//
// Tool: Google Antigravity Agent, date: 2026-10-11
// Scope: Added /api/orders proxy route to order service for host-based development.
// Author review: (to be completed by author after review)
//
// Tool: Codex (model: GPT-6), date: 2026-10-01
// Scope: Keep host-based API proxies on local services while Compose routes through the gateway.
// Author review: Approved by ngkhengyang
//
// Tool: Codex (model: GPT-6), date: 2026-09-30
// Scope: Serve admin pages and assets under /admin/ through the gateway.
// Author review: <to be completed by huangjiaxi1111>
// AI-generated (edited by huangjiaxi1111)
// AI-generated (edited by yanhwee)
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// AI-generated (edited by huangjiaxi1111)
// Docker routes through the gateway; host-based development uses local services.
const gatewayTarget = process.env.GATEWAY_URL;
const supplierTarget = gatewayTarget ?? process.env.SUPPLIER_SERVICE_URL ?? 'http://localhost:8002';
const userTarget = gatewayTarget ?? process.env.USER_SERVICE_URL ?? 'http://localhost:8001';
const orderTarget = gatewayTarget ?? process.env.ORDER_SERVICE_URL ?? 'http://localhost:8003';
const creditTarget = gatewayTarget ?? process.env.CREDIT_SERVICE_URL ?? 'http://localhost:8004';
const notificationTarget = gatewayTarget ?? process.env.NOTIFICATION_SERVICE_URL ?? 'http://localhost:8005';

function healthProxy(target: string, serviceKey: string) {
  return {
    target,
    changeOrigin: true,
    rewrite: gatewayTarget
      ? undefined
      : (path: string) => path.replace(new RegExp(`^/api/health/${serviceKey}`), ''),
  };
}

export default defineConfig({
  base: '/admin/',
  plugins: [react()],
  server: {
    port: 5174,
    host: true,
    allowedHosts: ['admin-portal'],
    proxy: {
      '/api/health/user': healthProxy(userTarget, 'user'),
      '/api/health/supplier': healthProxy(supplierTarget, 'supplier'),
      '/api/health/order': healthProxy(orderTarget, 'order'),
      '/api/health/credit': healthProxy(creditTarget, 'credit'),
      '/api/health/notification': healthProxy(notificationTarget, 'notification'),
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
      '/api/orders': {
        target: orderTarget,
        changeOrigin: true,
      },
      '/api': {
        target: supplierTarget,
        changeOrigin: true,
      },
    },
  },
});
