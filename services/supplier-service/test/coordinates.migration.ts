/**
 * AI Assistance Disclosure:
 * Tool: Claude Code (model: Claude Fable 5.1), date: 2026-11-04
 * Scope: PR #222 review (P3): one test drives the real Prisma CLI through the documented recovery path. The original
 *        NOT NULL migration is applied to a legacy row and fails, Prisma records the failed migration, then the
 *        runbook's `migrate resolve --rolled-back` and `migrate deploy` run against the corrected history and the
 *        legacy row survives with its nulls.
 * Author review: <to be completed by Reallyeasy1>
 *
 * Tool: Codex (model: GPT-6), date: 2026-11-01
 * Scope: Exercise coordinate migrations on fresh, legacy and already-constrained PostgreSQL schemas.
 * Author review: <to be completed by Reallyeasy1>
 */
// AI-generated (edited by Reallyeasy1)
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { execFile } from 'node:child_process';
import { cp, mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
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

// AI-generated (edited by Reallyeasy1): PR #222 review (P3). The runbook's recovery path, driven through the real
// Prisma CLI against a disposable schema (selected with the URL's `schema` parameter, so `_prisma_migrations` is
// isolated too). A minimal schema.prisma is enough: `migrate deploy` and `migrate resolve` only read the datasource.
const prismaCli = require.resolve('prisma/build/index.js');
const originalNotNullSql =
  'ALTER TABLE "suppliers" ALTER COLUMN "latitude" SET NOT NULL,\nALTER COLUMN "longitude" SET NOT NULL;\n';

function runPrisma(dir: string, databaseUrl: string, ...args: string[]) {
  return new Promise<{ ok: boolean; output: string }>((resolve) => {
    execFile(
      process.execPath,
      [prismaCli, 'migrate', ...args, '--schema', join(dir, 'schema.prisma')],
      { cwd: dir, env: { ...process.env, DATABASE_URL: databaseUrl, CHECKPOINT_DISABLE: '1' } },
      (error, stdout, stderr) => resolve({ ok: !error, output: `${stdout}\n${stderr}` }),
    );
  });
}

test('a failed original coordinate migration is recovered with the documented resolve and deploy commands', async () => {
  const schema = `supplier_test_${randomUUID().replaceAll('-', '')}`;
  const schemaUrl = new URL(url);
  schemaUrl.searchParams.set('schema', schema);
  const dir = await mkdtemp(join(tmpdir(), 'supplier-migrations-'));
  const source = join(__dirname, '../prisma/migrations');
  const client = new Client({ connectionString: url });
  await client.connect();
  try {
    await client.query(`CREATE SCHEMA "${schema}"`);
    await client.query(`SET search_path TO "${schema}"`);
    await writeFile(
      join(dir, 'schema.prisma'),
      'datasource db {\n  provider = "postgresql"\n  url      = env("DATABASE_URL")\n}\n',
    );
    for (const name of initialMigrations) await cp(join(source, name), join(dir, 'migrations', name), { recursive: true });
    let result = await runPrisma(dir, schemaUrl.href, 'deploy');
    assert.ok(result.ok, result.output);
    await insertSupplier(client, 'LEGACY', null, null);

    // The original PR #220 migration, as it shipped, fails on the legacy row and Prisma records the failed attempt.
    await mkdir(join(dir, 'migrations', coordinateMigrations[0]), { recursive: true });
    await writeFile(join(dir, 'migrations', coordinateMigrations[0], 'migration.sql'), originalNotNullSql);
    result = await runPrisma(dir, schemaUrl.href, 'deploy');
    assert.equal(result.ok, false, result.output);
    const failed = await client.query(
      'SELECT finished_at, rolled_back_at FROM _prisma_migrations WHERE migration_name = $1',
      [coordinateMigrations[0]],
    );
    assert.equal(failed.rows.length, 1);
    assert.equal(failed.rows[0].finished_at, null);
    assert.equal(failed.rows[0].rolled_back_at, null);

    // Recovery: the corrected history from the repository, then the runbook's two commands.
    for (const name of coordinateMigrations) await cp(join(source, name), join(dir, 'migrations', name), { recursive: true });
    result = await runPrisma(dir, schemaUrl.href, 'resolve', '--rolled-back', coordinateMigrations[0]);
    assert.ok(result.ok, result.output);
    result = await runPrisma(dir, schemaUrl.href, 'deploy');
    assert.ok(result.ok, result.output);

    const { rows } = await client.query('SELECT supplier_code, latitude, longitude FROM suppliers');
    assert.deepEqual(rows, [{ supplier_code: 'LEGACY', latitude: null, longitude: null }]);
    const applied = await client.query(
      'SELECT migration_name FROM _prisma_migrations WHERE finished_at IS NOT NULL ORDER BY migration_name',
    );
    assert.deepEqual(applied.rows.map((row) => row.migration_name), [...initialMigrations, ...coordinateMigrations]);
  } finally {
    try {
      await client.query('SET search_path TO public');
      await client.query(`DROP SCHEMA IF EXISTS "${schema}" CASCADE`);
    } finally {
      await client.end();
      await rm(dir, { recursive: true, force: true });
    }
  }
});
