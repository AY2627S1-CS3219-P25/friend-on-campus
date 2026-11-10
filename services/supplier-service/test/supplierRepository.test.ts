/**
 * AI Assistance Disclosure:
 * Tool: Google Antigravity Agent; Claude Code (model: Claude Fable 5.1, Sonnet 5), date: 2026-09-30 to 2026-11-09
 * Scope: Unit tests for src/database/supplierRepository.ts with the Prisma client replaced by a recording fake (node:test module mock): where-clause and orderBy..; updated across 4 AI-assisted revisions through D4 wrap-up (updated getSuppliers unit tests to verify PostgreSQL $queryRaw SQL construction (LOWER() case-insensitive ORDER BY with deterministic "id" ASC tie-breaker,..).
 * Author review: I validated correctness, edited for style, and verified with automated tests.
 */
import { describe, it, before, beforeEach, mock } from 'node:test';
import assert from 'node:assert/strict';
import { Prisma } from '../src/generated/prisma';

// A Prisma stand-in that records every call and answers from a script.
const calls: Array<{ method: string; args: any }> = [];
const answers: Record<string, any[]> = {};
function answer(method: string) {
  const queue = answers[method] ?? [];
  return queue.length > 0 ? queue.shift() : null;
}
const fakePrisma = {
  async $queryRaw(query: any) {
    const sql = String(query?.sql ?? '').replace(/\s+/g, ' ').trim();
    const values = query?.values ?? [];
    calls.push({ method: '$queryRaw', args: { sql, values } });
    return answer('$queryRaw') ?? [];
  },
  supplier: Object.fromEntries(
    ['findMany', 'count', 'findUnique', 'findFirst', 'create', 'update', 'delete'].map((m) => [
      m,
      async (args: any) => {
        calls.push({ method: m, args });
        return answer(m);
      },
    ]),
  ),
};

// The mock must be registered before the repository module is loaded, and CJS output has no top-level await.
let repo: typeof import('../src/suppliers/supplierRepository');
before(async () => {
  mock.module('../src/database/client', { namedExports: { prisma: fakePrisma, Prisma }, defaultExport: fakePrisma });
  repo = await import('../src/suppliers/supplierRepository.js');
});

beforeEach(() => {
  calls.length = 0;
  for (const key of Object.keys(answers)) delete answers[key];
});

describe('getSuppliers: filters and search', () => {
  it('with no filter queries PostgreSQL sorted by LOWER("name") ASC, "id" ASC and strips totalCount', async () => {
    answers.$queryRaw = [[
      { id: 'a', name: 'Alpha', totalCount: 2 },
      { id: 'b', name: 'Beta', totalCount: 2 },
    ]];
    const result = await repo.getSuppliers();
    assert.equal(calls.length, 1);
    assert.equal(calls[0].method, '$queryRaw');
    assert.equal(calls[0].args.sql.includes('WHERE'), false);
    assert.match(calls[0].args.sql, /ORDER BY LOWER\("name"\) ASC, "id" ASC LIMIT \? OFFSET \?$/);
    assert.deepEqual(calls[0].args.values, [100, 0]);
    assert.deepEqual(result, {
      suppliers: [{ id: 'a', name: 'Alpha' }, { id: 'b', name: 'Beta' }],
      total: 2,
      page: 1,
      limit: 2,
      totalPages: 1,
    });
  });

  it('campusZone, category and isActive become parameterized AND filters; text filters use LOWER()', async () => {
    answers.$queryRaw = [[]];
    await repo.getSuppliers({ campusZone: 'com3', category: 'Food', isActive: false });
    assert.match(
      calls[0].args.sql,
      /WHERE LOWER\("campus_zone"\) = LOWER\(\?\) AND LOWER\("category"\) = LOWER\(\?\) AND "is_active" = \?/,
    );
    assert.deepEqual(calls[0].args.values, ['com3', 'Food', false, 100, 0]);
  });

  it('search is a case-insensitive ILIKE over five columns, trimmed', async () => {
    answers.$queryRaw = [[]];
    await repo.getSuppliers({ search: '  Coffee ' });
    assert.match(
      calls[0].args.sql,
      /WHERE \("name" ILIKE \? OR "exact_location" ILIKE \? OR "building" ILIKE \? OR "description" ILIKE \? OR "supplier_code" ILIKE \?\)/,
    );
    assert.deepEqual(calls[0].args.values, ['%Coffee%', '%Coffee%', '%Coffee%', '%Coffee%', '%Coffee%', 100, 0]);
  });

  it('a whitespace-only search is ignored', async () => {
    answers.$queryRaw = [[]];
    await repo.getSuppliers({ search: '   ' });
    assert.equal(calls[0].args.sql.includes('WHERE'), false);
    assert.deepEqual(calls[0].args.values, [100, 0]);
  });

  it('isActive undefined means no filter, while false and true are filters', async () => {
    answers.$queryRaw = [[], []];
    await repo.getSuppliers({ isActive: undefined });
    await repo.getSuppliers({ isActive: true });
    assert.equal(calls[0].args.sql.includes('"is_active" ='), false);
    assert.match(calls[1].args.sql, /WHERE "is_active" = \?/);
    assert.deepEqual(calls[1].args.values, [true, 100, 0]);
  });
});

describe('getSuppliers: sorting', () => {
  it('orders text columns with LOWER() and createdAt directly, with deterministic "id" ASC tie-breaker', async () => {
    const expectedSqlByField: Record<string, string> = {
      name: 'LOWER("name")',
      campusZone: 'LOWER("campus_zone")',
      category: 'LOWER("category")',
      createdAt: '"created_at"',
      supplierCode: 'LOWER("supplier_code")',
    };
    for (const [field, expr] of Object.entries(expectedSqlByField)) {
      answers.$queryRaw = [[], []];
      await repo.getSuppliers({ sortBy: field as any, sortOrder: 'asc' });
      assert.equal(calls.at(-1)!.args.sql.includes(`ORDER BY ${expr} ASC, "id" ASC`), true, `${field} asc`);
      await repo.getSuppliers({ sortBy: field as any, sortOrder: 'desc' });
      assert.equal(calls.at(-1)!.args.sql.includes(`ORDER BY ${expr} DESC, "id" ASC`), true, `${field} desc`);
    }
  });

  it('falls back to LOWER("name") for an unknown sortBy and to ASC for anything but desc', async () => {
    answers.$queryRaw = [[], [], []];
    await repo.getSuppliers({ sortBy: 'price' as any });
    await repo.getSuppliers({ sortBy: 'supplierCode', sortOrder: 'DESC' as any });
    await repo.getSuppliers({ sortBy: 'supplierCode', sortOrder: 'desc' });
    assert.equal(calls[0].args.sql.includes('ORDER BY LOWER("name") ASC, "id" ASC'), true);
    assert.equal(calls[1].args.sql.includes('ORDER BY LOWER("supplier_code") ASC, "id" ASC'), true);
    assert.equal(calls[2].args.sql.includes('ORDER BY LOWER("supplier_code") DESC, "id" ASC'), true);
  });
});

describe('getSuppliers: pagination', () => {
  const rows = (n: number, totalCount = n) =>
    Array.from({ length: n }, (_, i) => ({ id: `id-${i}`, name: `S${String(i).padStart(2, '0')}`, totalCount }));

  it('page and limit become LIMIT and OFFSET in SQL, with total and totalPages from COUNT(*) OVER()', async () => {
    answers.$queryRaw = [rows(5, 21)];
    const result = await repo.getSuppliers({ page: 3, limit: 5 });
    assert.equal(calls.length, 1);
    assert.deepEqual(calls[0].args.values, [5, 10]);
    assert.deepEqual(
      { ...result, suppliers: result.suppliers.length },
      { suppliers: 5, total: 21, page: 3, limit: 5, totalPages: 5 },
    );
  });

  it('paginates when only one of page or limit is sent, with defaults page 1 and limit 10', async () => {
    answers.$queryRaw = [rows(10, 21), rows(7, 21)];
    const second = await repo.getSuppliers({ page: 2 });
    assert.deepEqual(calls[0].args.values, [10, 10]);
    assert.deepEqual([second.page, second.limit, second.total], [2, 10, 21]);
    const first = await repo.getSuppliers({ limit: 7 });
    assert.deepEqual(calls[1].args.values, [7, 0]);
    assert.deepEqual([first.page, first.limit, first.total], [1, 7, 21]);
  });

  it('clamps page to at least 1, limit to 1..100, and caps unpaginated queries at 100 rows', async () => {
    answers.$queryRaw = [rows(100, 120), rows(1, 120), rows(100, 521)];
    const wide = await repo.getSuppliers({ page: 0, limit: 500 });
    assert.deepEqual(calls[0].args.values, [100, 0]);
    assert.deepEqual([wide.page, wide.limit, wide.suppliers.length, wide.totalPages], [1, 100, 100, 2]);

    const narrow = await repo.getSuppliers({ page: -3, limit: 0 });
    assert.deepEqual(calls[1].args.values, [1, 0]);
    assert.deepEqual([narrow.page, narrow.limit, narrow.suppliers.length], [1, 1, 1]);

    const unpaginatedLarge = await repo.getSuppliers({ isActive: true });
    assert.deepEqual(calls[2].args.values, [true, 100, 0]);
    assert.deepEqual(
      [unpaginatedLarge.page, unpaginatedLarge.limit, unpaginatedLarge.total, unpaginatedLarge.totalPages],
      [1, 100, 521, 6],
    );
  });

  it('totalPages rounds up and is 0 for an empty result; a page past the end falls back to COUNT(*)', async () => {
    answers.$queryRaw = [rows(5, 11), [], [], [{ totalCount: 11 }]];
    assert.equal((await repo.getSuppliers({ limit: 5 })).totalPages, 3);
    assert.equal((await repo.getSuppliers({ limit: 5 })).totalPages, 0);
    assert.equal(calls.length, 2, 'empty first page needs no fallback count query');

    const pastEnd = await repo.getSuppliers({ page: 9, limit: 5 });
    assert.equal(calls.length, 4, 'empty page with skip > 0 issues fallback count query');
    assert.match(calls[3].args.sql, /^SELECT COUNT\(\*\)::int AS "totalCount" FROM "suppliers"$/);
    assert.deepEqual(pastEnd, { suppliers: [], total: 11, page: 9, limit: 5, totalPages: 3 });
  });

  it('applies the same WHERE clause to the fallback count query when a filtered page is past the end', async () => {
    answers.$queryRaw = [[], [{ totalCount: 4 }]];
    const res = await repo.getSuppliers({ category: 'Food', page: 2, limit: 5 });
    assert.equal(calls.length, 2);
    assert.match(calls[0].args.sql, /WHERE LOWER\("category"\) = LOWER\(\?\)/);
    assert.match(calls[1].args.sql, /WHERE LOWER\("category"\) = LOWER\(\?\)/);
    assert.deepEqual(calls[1].args.values, ['Food']);
    assert.deepEqual(res, { suppliers: [], total: 4, page: 2, limit: 5, totalPages: 1 });
  });
});

describe('lookups', () => {
  it('getSupplierById and getSupplierByCode use findUnique on the right key', async () => {
    answers.findUnique = [{ id: '1' }, { id: '2' }];
    assert.deepEqual(await repo.getSupplierById('1'), { id: '1' });
    assert.deepEqual(calls[0].args, { where: { id: '1' } });
    assert.deepEqual(await repo.getSupplierByCode('SUP-002'), { id: '2' });
    assert.deepEqual(calls[1].args, { where: { supplierCode: 'SUP-002' } });
  });

  it('findDuplicateLocation matches all four fields case-insensitively and can exclude one id', async () => {
    answers.findFirst = [null, null];
    await repo.findDuplicateLocation('Smooy', 'Food', 'COM3', '1');
    assert.deepEqual(calls[0].args.where, {
      name: { equals: 'Smooy', mode: 'insensitive' },
      category: { equals: 'Food', mode: 'insensitive' },
      building: { equals: 'COM3', mode: 'insensitive' },
      floor: { equals: '1', mode: 'insensitive' },
    });
    await repo.findDuplicateLocation('Smooy', 'Food', 'COM3', '1', 'self-id');
    assert.deepEqual(calls[1].args.where.id, { not: 'self-id' });
  });
});

describe('createSupplier', () => {
  const body = {
    name: '  Demo Cafe ',
    campusZone: ' COM3',
    exactLocation: 'Level 1 ',
    category: 'Food',
    building: ' COM3 ',
    floor: ' 1',
    description: '   ',
    latitude: 1.2966,
    longitude: 103.7764,
    startingTime: '0900',
    imageUrl: '',
  };

  it('trims text fields, turns blank optionals into null and sets isActive true', async () => {
    answers.count = [21];
    answers.findUnique = [null];
    answers.create = [{ id: 'new' }];
    const result = await repo.createSupplier(body as any);
    assert.deepEqual(result, { id: 'new' });
    const create = calls.find((c) => c.method === 'create')!;
    assert.deepEqual(create.args.data, {
      supplierCode: 'SUP-022',
      name: 'Demo Cafe',
      campusZone: 'COM3',
      exactLocation: 'Level 1',
      category: 'Food',
      description: null,
      building: 'COM3',
      floor: '1',
      latitude: 1.2966,
      longitude: 103.7764,
      startingTime: '0900',
      closingTime: null,
      imageUrl: null,
      isActive: true,
    });
  });

  it('uses a supplied supplierCode, trimmed, without generating one', async () => {
    answers.create = [{}];
    await repo.createSupplier({ ...body, supplierCode: ' CUSTOM-1 ' } as any);
    assert.equal(calls.some((c) => c.method === 'count'), false);
    assert.equal(calls.find((c) => c.method === 'create')!.args.data.supplierCode, 'CUSTOM-1');
  });

  it('generates SUP-NNN from the row count, zero-padded, and falls back to a timestamp code when taken', async () => {
    answers.count = [4];
    answers.findUnique = [{ id: 'taken' }];
    answers.create = [{}];
    await repo.createSupplier(body as any);
    const code = calls.find((c) => c.method === 'create')!.args.data.supplierCode;
    assert.notEqual(code, 'SUP-005', 'SUP-005 was taken');
    assert.match(code, /^SUP-\d{4}$/);
  });

  it('keeps numeric coordinates as given', async () => {
    answers.count = [0];
    answers.findUnique = [null];
    answers.create = [{}];
    await repo.createSupplier({ ...body, latitude: 1.29, longitude: 103.77 } as any);
    const data = calls.find((c) => c.method === 'create')!.args.data;
    assert.equal(data.latitude, 1.29);
    assert.equal(data.longitude, 103.77);
  });
});

describe('updateSupplier', () => {
  it('writes only the fields that were sent, trimmed', async () => {
    answers.update = [{}];
    await repo.updateSupplier('id-1', { name: ' New ', floor: ' 2 ', isActive: false } as any);
    assert.deepEqual(calls[0].args, { where: { id: 'id-1' }, data: { name: 'New', floor: '2', isActive: false } });
  });

  it('an empty body updates nothing but still issues the update', async () => {
    answers.update = [{}];
    await repo.updateSupplier('id-1', {});
    assert.deepEqual(calls[0].args.data, {});
  });

  it('writes an empty string when a text field is sent blank (no null conversion on update)', async () => {
    answers.update = [{}];
    await repo.updateSupplier('id-1', { description: '   ' } as any);
    assert.equal(calls[0].args.data.description, '');
  });
});

describe('toggleSupplierActive and deleteSupplier', () => {
  it('toggle flips the stored flag and returns null for an unknown id', async () => {
    answers.findUnique = [{ id: 'id-1', isActive: true }, null];
    answers.update = [{ id: 'id-1', isActive: false }];
    assert.deepEqual(await repo.toggleSupplierActive('id-1'), { id: 'id-1', isActive: false });
    assert.deepEqual(calls[1].args, { where: { id: 'id-1' }, data: { isActive: false } });
    assert.equal(await repo.toggleSupplierActive('missing'), null);
    assert.equal(calls.filter((c) => c.method === 'update').length, 1);
  });

  it('delete is soft by default (isActive=false) and removes the row when asked', async () => {
    answers.update = [{}];
    answers.delete = [{}];
    await repo.deleteSupplier('id-1');
    assert.deepEqual(calls[0], { method: 'update', args: { where: { id: 'id-1' }, data: { isActive: false } } });
    await repo.deleteSupplier('id-1', false);
    assert.deepEqual(calls[1], { method: 'delete', args: { where: { id: 'id-1' } } });
  });
});
