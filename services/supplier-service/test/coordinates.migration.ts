/**
 * AI Assistance Disclosure:
 * Tool: Codex (model: GPT-6), date: 2026-11-01
 * Scope: Exercise coordinate migrations on fresh, legacy and already-constrained PostgreSQL schemas.
 * Author review: <to be completed by Reallyeasy1>
 */
// AI-generated (edited by Reallyeasy1)
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import test from 'node:test';
import { Client } from 'pg';

const url = process.env.DATABASE_URL;
if (!url || !new URL(url).pathname.includes('_test')) {
  throw new Error('DATABASE_URL must name a dedicated _test database');
}

const initialMigrations = ['20260919090038_init', '20260929134701_add_location_uniqueness'];
const coordinateMigrations = ['20261017102809_make_coordinates_required', '20261101040000_preserve_legacy_coordinates'];

async function migrate(client: Client, names: string[]) {
  for (const name of names) {
    await client.query(await readFile(join(__dirname, '../prisma/migrations', name, 'migration.sql'), 'utf8'));
  }
}

async function isolated(run: (client: Client) => Promise<void>) {
  const client = new Client({ connectionString: url });
  const schema = `supplier_test_${randomUUID().replaceAll('-', '')}`;
  await client.connect();
  try {
    await client.query(`CREATE SCHEMA "${schema}"`);
    await client.query(`SET search_path TO "${schema}"`);
    await migrate(client, initialMigrations);
    await run(client);
  } finally {
    try {
      await client.query('SET search_path TO public');
      await client.query(`DROP SCHEMA IF EXISTS "${schema}" CASCADE`);
    } finally {
      await client.end();
    }
  }
}

async function insertSupplier(client: Client, code: string, latitude: number | null, longitude: number | null) {
  await client.query(`INSERT INTO suppliers
    (id, supplier_code, name, campus_zone, exact_location, category, building, floor, latitude, longitude, updated_at)
    VALUES ($1, $2, $2, 'COM3', 'Level 1', 'Food', 'COM3', '1', $3, $4, NOW())`,
  [randomUUID(), code, latitude, longitude]);
}

test('fresh schema accepts a supplier with coordinates', () => isolated(async (client) => {
  await migrate(client, coordinateMigrations);
  await insertSupplier(client, 'NEW', 1.2948308, 103.7716305);
  const { rows } = await client.query('SELECT latitude, longitude FROM suppliers');
  assert.deepEqual(rows, [{ latitude: 1.2948308, longitude: 103.7716305 }]);
}));

test('upgrade preserves legacy nulls, known coordinates and supplier identities', () => isolated(async (client) => {
  await insertSupplier(client, 'LEGACY', null, null);
  await insertSupplier(client, 'PARTIAL', 1.2948308, null);
  await insertSupplier(client, 'KNOWN', 1.2948308, 103.7716305);
  const before = await client.query('SELECT * FROM suppliers ORDER BY supplier_code');
  await migrate(client, coordinateMigrations);
  const after = await client.query('SELECT * FROM suppliers ORDER BY supplier_code');
  assert.deepEqual(after.rows, before.rows);
  await client.query("UPDATE suppliers SET latitude=1.2948308, longitude=103.7716305 WHERE supplier_code='LEGACY'");
  assert.equal((await client.query("SELECT latitude FROM suppliers WHERE supplier_code='LEGACY'")).rows[0].latitude, 1.2948308);
}));

test('forward migration reconciles the original successfully applied NOT NULL change', () => isolated(async (client) => {
  await insertSupplier(client, 'KNOWN', 1.2948308, 103.7716305);
  await client.query('ALTER TABLE suppliers ALTER COLUMN latitude SET NOT NULL, ALTER COLUMN longitude SET NOT NULL');
  const before = await client.query('SELECT * FROM suppliers');
  await migrate(client, coordinateMigrations.slice(1));
  assert.deepEqual((await client.query('SELECT * FROM suppliers')).rows, before.rows);
  const { rows } = await client.query(`SELECT column_name, is_nullable FROM information_schema.columns
    WHERE table_schema=current_schema() AND table_name='suppliers' AND column_name IN ('latitude', 'longitude')
    ORDER BY column_name`);
  assert.deepEqual(rows, [
    { column_name: 'latitude', is_nullable: 'YES' },
    { column_name: 'longitude', is_nullable: 'YES' },
  ]);
}));
