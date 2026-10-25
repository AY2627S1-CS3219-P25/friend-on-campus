/**
 * AI Assistance Disclosure:
 * Tool: Google Antigravity, date: 2026-10-21
 * Scope: Shared Prisma migration helper loading service and root .env files with per-service database URL fallbacks.
 * Author review: <to be completed by author after review>
 */
// AI-generated (edited by yanhwee)
import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import path from 'node:path';

const SERVICES = {
  credit: {
    envVar: 'CREDIT_DATABASE_URL',
    defaultUrl: 'postgresql://credit_svc:credit-service-dev@localhost:5432/credit_db',
  },
  notification: {
    envVar: 'NOTIFICATION_DATABASE_URL',
    defaultUrl: 'postgresql://notification_svc:notification-service-dev@localhost:5432/notification_db',
  },
  order: {
    envVar: 'ORDER_DATABASE_URL',
    defaultUrl: 'postgresql://order_svc:order-service-dev@localhost:5432/order_db',
  },
  supplier: {
    envVar: 'SUPPLIER_DATABASE_URL',
    defaultUrl: 'postgresql://supplier_svc:supplier-service-dev@localhost:5432/supplier_db',
  },
  user: {
    envVar: 'USER_DATABASE_URL',
    defaultUrl: 'postgresql://user_svc:user-service-dev@localhost:5432/user_db',
  },
};

const [serviceKey, mode, ...extraArgs] = process.argv.slice(2);
const serviceConfig = SERVICES[serviceKey];

if (!serviceConfig || (mode !== 'dev' && mode !== 'deploy')) {
  console.error(
    'Usage: node ../../scripts/prisma-migrate.mjs <credit|notification|order|supplier|user> <dev|deploy> [...prismaArgs]',
  );
  process.exit(1);
}

const requireFromCwd = createRequire(path.join(process.cwd(), 'package.json'));
requireFromCwd('dotenv').config({ path: ['.env', '../../.env'] });

process.env.DATABASE_URL ||= process.env[serviceConfig.envVar] || serviceConfig.defaultUrl;

const prismaCli = requireFromCwd.resolve('prisma/build/index.js');
const result = spawnSync(
  process.execPath,
  [prismaCli, 'migrate', mode, '--schema', 'prisma/schema.prisma', ...extraArgs],
  { stdio: 'inherit' },
);

process.exit(result.status ?? 1);
