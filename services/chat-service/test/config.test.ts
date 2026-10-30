/**
 * AI Assistance Disclosure:
 * Tool: Claude Code (model: Claude Fable 5.1), date: 2026-10-26
 * Scope: Review fix (PR #148, second round): src/config.ts takes the database URL from CHAT_DATABASE_URL and the port
 * from CHAT_SERVICE_PORT when the generic variables are absent, as the root .env.example documents. Probe values only;
 * the test reads no .env file itself.
 * Author review: <to be completed by Reallyeasy1>
 */
// AI-generated (edited by Reallyeasy1)
import assert from 'node:assert/strict';
import { test } from 'node:test';

test('config falls back to CHAT_DATABASE_URL and CHAT_SERVICE_PORT (the root .env variables)', async () => {
  // Set before the module loads: config.ts reads the environment once, at import. dotenv never overrides a variable
  // that is already set, so a developer's .env files cannot change these probe values. (.env.example defines no bare
  // DATABASE_URL or PORT, only the per-service names, so these fallbacks are what a root .env exercises.)
  delete process.env.DATABASE_URL;
  delete process.env.PORT;
  process.env.CHAT_DATABASE_URL = 'postgresql://probe:probe@localhost:5432/probe_db';
  process.env.CHAT_SERVICE_PORT = '18006';
  const { config } = await import('../src/config.js');
  assert.equal(config.databaseUrl, 'postgresql://probe:probe@localhost:5432/probe_db');
  assert.equal(process.env.DATABASE_URL, config.databaseUrl, 'Prisma reads DATABASE_URL from the environment');
  assert.equal(config.port, '18006');
});
