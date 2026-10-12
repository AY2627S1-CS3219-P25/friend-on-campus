/**
 * AI Assistance Disclosure:
 * Tool: Codex (model: GPT-5), date: 2026-10-11
 * Scope: Create the isolated PostgreSQL database used by database-backed CI test matrices.
 * Author review: <to be completed by ngkhengyang>
 */
// AI-generated (edited by ngkhengyang)
import pg from 'pg';

const { Client } = pg;
const adminUrl = process.env.POSTGRES_ADMIN_URL;
const databaseName = process.env.TEST_DATABASE_NAME;

if (!adminUrl) throw new Error('POSTGRES_ADMIN_URL is required');
if (!databaseName || !/^[a-z][a-z0-9_]*_test$/.test(databaseName)) {
  throw new Error('TEST_DATABASE_NAME must be a lowercase PostgreSQL identifier ending in _test');
}

const client = new Client({ connectionString: adminUrl });
await client.connect();
try {
  const existing = await client.query('SELECT 1 FROM pg_database WHERE datname = $1', [databaseName]);
  if (existing.rowCount === 0) await client.query(`CREATE DATABASE "${databaseName}"`);
  console.log(`PostgreSQL database ready: ${databaseName}`);
} finally {
  await client.end();
}
