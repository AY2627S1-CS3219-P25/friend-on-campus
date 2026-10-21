/**
 * AI Assistance Disclosure:
 * Tool: Codex (model: GPT-6), date: 2026-10-21
 * Scope: Wait for an isolated messaging-test connector to stream its PostgreSQL replication slot before testing delivery.
 * Author review: <to be completed by huangjiaxi1111>
 */
// AI-generated (edited by huangjiaxi1111)
import pg from 'pg';
import { setTimeout as delay } from 'node:timers/promises';

const { Client } = pg;
const databaseUrl = process.env.CREDIT_TEST_DATABASE_URL;
if (!databaseUrl || !new URL(databaseUrl).pathname.endsWith('_test')) {
  throw new Error('CREDIT_TEST_DATABASE_URL must select an isolated _test database');
}
const client = new Client({ connectionString: databaseUrl });
await client.connect();
try {
  const deadline = Date.now() + 90_000;
  while (Date.now() < deadline) {
    const { rowCount } = await client.query(`
      SELECT 1 FROM pg_replication_slots AS slot
      JOIN pg_stat_replication AS replication ON replication.pid = slot.active_pid
      WHERE slot.slot_name = 'debezium_credit_messaging'
        AND slot.database = current_database() AND slot.active
        AND replication.state = 'streaming'
    `);
    if (rowCount) {
      console.log('Credit messaging CDC is streaming');
      break;
    }
    await delay(250);
  }
  if (Date.now() >= deadline) throw new Error('Credit messaging CDC did not begin streaming within 90 seconds');
} finally {
  await client.end();
}
