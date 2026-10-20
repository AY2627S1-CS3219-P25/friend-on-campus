/**
 * AI Assistance Disclosure:
 * Tool: Google Antigravity Agent, date: 2026-10-19
 * Scope: Centralized Supplier Service configuration loading from local and root .env files.
 * Author review: (to be completed by yanhwee)
 */
// AI-generated (edited by yanhwee)
import path from 'node:path';
import dotenv from 'dotenv';

dotenv.config({
  path: [
    path.resolve(__dirname, '../.env'),
    path.resolve(__dirname, '../../../.env'),
  ],
});

if (!process.env.DATABASE_URL && process.env.SUPPLIER_DATABASE_URL) {
  process.env.DATABASE_URL = process.env.SUPPLIER_DATABASE_URL;
}

export const config = Object.freeze({
  port: Number(process.env.PORT || process.env.SUPPLIER_SERVICE_PORT || 8002),
  databaseUrl:
    process.env.DATABASE_URL ||
    'postgresql://supplier_svc:supplier-service-dev@localhost:5432/supplier_db',
  corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  auth: {
    publicKey: process.env.JWT_PUBLIC_KEY ?? '',
    issuer: process.env.JWT_ISSUER ?? 'friend-on-campus-user-service',
    audience: process.env.JWT_AUDIENCE ?? 'friend-on-campus-services',
  },
});
