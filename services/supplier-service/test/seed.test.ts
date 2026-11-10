/**
 * AI Assistance Disclosure:
 * Tool: Claude Code (model: Claude Fable 5.1), date: 2026-11-04
 * Scope: Unit test for the CSV seed's coordinate handling (PR #222 review): an administrator's correction survives a second seed run, and a legacy row without...
 * Author review: I validated correctness, edited for style, and verified with automated tests.
 */
import assert from 'node:assert/strict';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { after, before, beforeEach, describe, it, mock } from 'node:test';

type Row = Record<string, unknown> & { supplierCode: string; latitude: number | null; longitude: number | null };
const rows = new Map<string, Row>();
const fakePrisma = {
  supplier: {
    findUnique: async ({ where }: { where: { supplierCode: string } }) => rows.get(where.supplierCode) ?? null,
    upsert: async ({ where, create, update }: { where: { supplierCode: string }; create: Row; update: Partial<Row> }) => {
      const current = rows.get(where.supplierCode);
      const next = (current ? { ...current, ...update } : { ...create }) as Row;
      rows.set(where.supplierCode, next);
      return next;
    },
  },
  $disconnect: async () => undefined,
};

const csv = [
  'Name,Type,Building,Floor,Location Description,Latitude,Longitude,StartingTime,ClosingTime,ImageURL',
  'NUS Co-op,Shopping,Central Library,1,Inside the library,1.2967866,103.7732677,0900hrs,1600hrs,/images/NUS_COOP.jpeg',
].join('\n');

// The mock must be registered before the seed module is loaded, and CJS output has no top-level await.
let seed: typeof import('../src/database/seed');
let dir: string;
let csvPath: string;
before(async () => {
  mock.module('../src/database/client', { namedExports: { prisma: fakePrisma }, defaultExport: fakePrisma });
  seed = await import('../src/database/seed.js');
  dir = await mkdtemp(join(tmpdir(), 'supplier-seed-'));
  csvPath = join(dir, 'suppliers.csv');
  await writeFile(csvPath, csv);
});
after(() => rm(dir, { recursive: true, force: true }));
beforeEach(() => rows.clear());

describe('seedSuppliers and coordinates', () => {
  it("keeps an administrator's coordinate correction across the next seed run", async () => {
    await seed.seedSuppliers(csvPath);
    const first = rows.get('SUP-001')!;
    assert.deepEqual([first.latitude, first.longitude], [1.2967866, 103.7732677]);

    // Edit Supplier in the admin portal, between two container starts.
    rows.set('SUP-001', { ...first, latitude: 1.2970001, longitude: 103.7740002, description: 'edited by admin' });
    await seed.seedSuppliers(csvPath);

    const second = rows.get('SUP-001')!;
    assert.deepEqual([second.latitude, second.longitude], [1.2970001, 103.7740002]);
    // Descriptive data still follows the CSV, as before.
    assert.equal(second.description, 'Inside the library');
  });

  it('fills a legacy row that has no coordinates from the CSV', async () => {
    rows.set('SUP-001', { id: 'legacy', supplierCode: 'SUP-001', name: 'NUS Co-op', latitude: null, longitude: null });
    await seed.seedSuppliers(csvPath);
    const row = rows.get('SUP-001')!;
    assert.deepEqual([row.latitude, row.longitude], [1.2967866, 103.7732677]);
    assert.equal(row.id, 'legacy');
  });
});
