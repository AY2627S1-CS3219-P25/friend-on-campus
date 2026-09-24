/**
 * AI Assistance Disclosure:
 * Tool: Codex (model: GPT-6), date: 2026-09-24
 * Scope: Tested fresh database initialization and persistent credit constraints from the migrations.
 * Author review: <to be completed by huangjiaxi1111>
 */
// AI-generated (edited by huangjiaxi1111)
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';
import { Client } from 'pg';

async function main() {
  const url = process.env.CREDIT_TEST_DATABASE_URL;
  if (!url || !new URL(url).pathname.includes('_test')) throw new Error('CREDIT_TEST_DATABASE_URL must name a dedicated _test database');
  const client = new Client({ connectionString: url });
  await client.connect();
  const migrations = join(__dirname, '../src/database/prisma/migrations');
  const schema = `credit_test_${randomUUID().replaceAll('-', '')}`;
  await client.query(`CREATE SCHEMA "${schema}"`);
  try {
    await client.query(`SET search_path TO "${schema}"`);
    for (const name of ['20260924050000_existing_credit_tables', '20260924100000_credit_messaging']) {
      await client.query(await readFile(join(migrations, name, 'migration.sql'), 'utf8'));
    }
    const tables = ['credit_wallets', 'credit_transactions', 'credit_grants', 'credit_escrows', 'processed_credit_events'];
    const created = (await client.query('SELECT tablename FROM pg_tables WHERE schemaname=$1 ORDER BY tablename', [schema])).rows.map(row => row.tablename);
    assert.deepEqual(created, [...tables].sort());
    for (const table of tables) {
      assert.equal((await client.query(`SELECT COUNT(*)::int AS count FROM ${table}`)).rows[0].count, 0);
    }

    const userId = randomUUID(); const orderId = randomUUID(); const eventId = randomUUID();
    // These checks exercise actual SQL constraints, including those not expressed by Prisma.
    await client.query('INSERT INTO credit_grants (user_id, amount) VALUES ($1,100)', [userId]);
    await assert.rejects(client.query('INSERT INTO credit_grants (user_id, amount) VALUES ($1,100)', [userId]), { code: '23505' });
    await assert.rejects(client.query('INSERT INTO credit_grants (user_id, amount) VALUES ($1,0)', [randomUUID()]), { code: '23514' });
    await client.query("INSERT INTO credit_escrows (order_id, requester_id, amount, state) VALUES ($1,$2,20,'RESERVED')", [orderId, userId]);
    await assert.rejects(client.query("INSERT INTO credit_escrows (order_id, requester_id, amount, state) VALUES ($1,$2,20,'RESERVED')", [orderId, userId]), { code: '23505' });
    await assert.rejects(client.query("UPDATE credit_escrows SET state='UNKNOWN' WHERE order_id=$1", [orderId]), { code: '23514' });
    await assert.rejects(client.query("UPDATE credit_escrows SET state='SETTLED' WHERE order_id=$1", [orderId]), { code: '23514' });
    await client.query("UPDATE credit_escrows SET state='SETTLED', courier_id=$2 WHERE order_id=$1", [orderId, randomUUID()]);
    await client.query('INSERT INTO processed_credit_events (event_id, event_type, fingerprint) VALUES ($1,$2,$3)', [eventId, 'user.registered', 'a'.repeat(64)]);
    await assert.rejects(client.query('INSERT INTO processed_credit_events (event_id, event_type, fingerprint) VALUES ($1,$2,$3)', [eventId, 'user.registered', 'a'.repeat(64)]), { code: '23505' });
    await assert.rejects(client.query('INSERT INTO credit_wallets (user_id, available_credits) VALUES ($1,-1)', [userId]), { code: '23514' });
    console.log('PASS: fresh migrations create five empty tables and enforce grant/event/order uniqueness, positive grants, valid escrow states and nonnegative balances');
  } finally {
    try {
      await client.query('ROLLBACK');
      await client.query('SET search_path TO public');
      await client.query(`DROP SCHEMA "${schema}" CASCADE`);
    } finally { await client.end(); }
  }
}
void main().catch(error => { console.error(error instanceof Error ? error.message : 'Migration test failed'); process.exitCode = 1; });
