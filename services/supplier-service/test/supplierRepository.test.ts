/**
 * AI Assistance Disclosure:
 * Tool: Claude Code (model: Claude Fable 5.1), date: 2026-10-04
 * Scope: Sorting and pagination tests now assert on the returned rows (case-insensitive order, stable ties,
 * slicing) because the repository sorts and pages in memory (UAT S8).
 * Author review: <to be completed by Reallyeasy1>
 *
 * Tool: Claude Code (model: Claude Fable 5.1), date: 2026-09-30
 * Scope: Unit tests for src/database/supplierRepository.ts with the Prisma client replaced by a recording fake
 * (node:test module mock): where-clause and orderBy construction, pagination arithmetic and clamping, the
 * duplicate lookup, trimming and null defaults on create and update, supplier-code generation, toggle and delete.
 * Author review: <to be completed by Reallyeasy1>
 */
// AI-generated (edited by Reallyeasy1)
import { describe, it, before, beforeEach, mock } from 'node:test';
import assert from 'node:assert/strict';

// A Prisma stand-in that records every call and answers from a script.
const calls: Array<{ method: string; args: any }> = [];
const answers: Record<string, any[]> = {};
function answer(method: string) {
  const queue = answers[method] ?? [];
  return queue.length > 0 ? queue.shift() : null;
}
const fakePrisma = {
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
let repo: typeof import('../src/database/supplierRepository');
before(async () => {
  mock.module('../src/database/client', { namedExports: { prisma: fakePrisma }, defaultExport: fakePrisma });
  repo = await import('../src/database/supplierRepository.js');
});

beforeEach(() => {
  calls.length = 0;
  for (const key of Object.keys(answers)) delete answers[key];
});

describe('getSuppliers: filters and search', () => {
  it('with no filter returns the whole list as one page, sorted by name ascending', async () => {
    answers.findMany = [[{ id: 'b', name: 'Beta' }, { id: 'a', name: 'Alpha' }]];
    const result = await repo.getSuppliers();
    assert.deepEqual(calls[0].args, { where: {} });
    assert.deepEqual(result, {
      suppliers: [{ id: 'a', name: 'Alpha' }, { id: 'b', name: 'Beta' }], total: 2, page: 1, limit: 2, totalPages: 1,
    });
    assert.equal(calls.some((c) => c.method === 'count'), false, 'no count query without pagination');
  });

  it('campusZone, category and isActive become AND filters; text filters are case-insensitive', async () => {
    answers.findMany = [[]];
    await repo.getSuppliers({ campusZone: 'com3', category: 'Food', isActive: false });
    assert.deepEqual(calls[0].args.where, {
      campusZone: { equals: 'com3', mode: 'insensitive' },
      category: { equals: 'Food', mode: 'insensitive' },
      isActive: false,
    });
  });

  it('search is a case-insensitive contains over five columns, trimmed', async () => {
    answers.findMany = [[]];
    await repo.getSuppliers({ search: '  Coffee ' });
    assert.deepEqual(calls[0].args.where.OR, [
      { name: { contains: 'Coffee', mode: 'insensitive' } },
      { exactLocation: { contains: 'Coffee', mode: 'insensitive' } },
      { building: { contains: 'Coffee', mode: 'insensitive' } },
      { description: { contains: 'Coffee', mode: 'insensitive' } },
      { supplierCode: { contains: 'Coffee', mode: 'insensitive' } },
    ]);
  });

  it('a whitespace-only search is ignored', async () => {
    answers.findMany = [[]];
    await repo.getSuppliers({ search: '   ' });
    assert.equal('OR' in calls[0].args.where, false);
  });

  it('isActive undefined means no filter, while false is a filter', async () => {
    answers.findMany = [[], []];
    await repo.getSuppliers({ isActive: undefined });
    await repo.getSuppliers({ isActive: true });
    assert.equal('isActive' in calls[0].args.where, false);
    assert.equal(calls[1].args.where.isActive, true);
  });
});

describe('getSuppliers: sorting', () => {
  // Stored order is deliberately unsorted; byte order would put the lower-case name last.
  const stored = () => [
    { id: '3', name: 'The Deck', campusZone: 'FASS', category: 'Food', supplierCode: 'SUP-002', createdAt: new Date('2026-09-03') },
    { id: '1', name: 'he by He Brews', campusZone: 'UTown', category: 'Drinks', supplierCode: 'SUP-004', createdAt: new Date('2026-09-01') },
    { id: '4', name: 'TOMORO COFFEE', campusZone: 'COM3', category: 'drinks', supplierCode: 'SUP-001', createdAt: new Date('2026-09-04') },
    { id: '2', name: 'A Hot Hideout', campusZone: 'com3', category: 'Food', supplierCode: 'SUP-003', createdAt: new Date('2026-09-02') },
  ];
  const ids = async (filter?: Parameters<typeof repo.getSuppliers>[0]) => {
    answers.findMany = [stored()];
    return (await repo.getSuppliers(filter)).suppliers.map((s: any) => s.id).join('');
  };

  it('orders names without regard to letter case, in both directions', async () => {
    assert.equal(await ids({ sortBy: 'name' }), '2134');
    assert.equal(await ids({ sortBy: 'name', sortOrder: 'desc' }), '4312');
  });

  it('accepts the five sortable fields', async () => {
    assert.equal(await ids({ sortBy: 'supplierCode' }), '4321');
    assert.equal(await ids({ sortBy: 'createdAt' }), '1234');
    assert.equal(await ids({ sortBy: 'createdAt', sortOrder: 'desc' }), '4321');
    // Equal values (ignoring case) keep a fixed order by id, so pages do not shuffle between requests.
    assert.equal(await ids({ sortBy: 'category' }), '1423');
    assert.equal(await ids({ sortBy: 'campusZone' }), '2431');
  });

  it('falls back to name for an unknown sortBy and to asc for anything but desc', async () => {
    assert.equal(await ids({ sortBy: 'price' as any }), '2134');
    assert.equal(await ids({ sortBy: 'supplierCode', sortOrder: 'DESC' as any }), '4321');
    assert.equal(await ids({ sortBy: 'supplierCode', sortOrder: 'desc' }), '1234');
  });
});

describe('getSuppliers: pagination', () => {
  const rows = (n: number) => Array.from({ length: n }, (_, i) => ({ id: `id-${i}`, name: `S${String(i).padStart(2, '0')}` }));
  const names = (result: { suppliers: any[] }) => result.suppliers.map((s) => s.name);

  it('page and limit slice the sorted matches, with total and totalPages from the match count', async () => {
    answers.findMany = [rows(21).reverse()];
    const result = await repo.getSuppliers({ page: 3, limit: 5 });
    assert.deepEqual(names(result), ['S10', 'S11', 'S12', 'S13', 'S14']);
    assert.deepEqual({ ...result, suppliers: undefined }, { suppliers: undefined, total: 21, page: 3, limit: 5, totalPages: 5 });
  });

  it('paginates when only one of page or limit is sent, with defaults page 1 and limit 10', async () => {
    answers.findMany = [rows(21), rows(21)];
    const second = await repo.getSuppliers({ page: 2 });
    assert.deepEqual([names(second)[0], second.suppliers.length, second.limit], ['S10', 10, 10]);
    const first = await repo.getSuppliers({ limit: 7 });
    assert.deepEqual([names(first)[0], first.suppliers.length, first.page], ['S00', 7, 1]);
  });

  it('clamps page to at least 1 and limit to 1..100', async () => {
    answers.findMany = [rows(120), rows(120)];
    const wide = await repo.getSuppliers({ page: 0, limit: 500 });
    assert.deepEqual([wide.page, wide.limit, wide.suppliers.length], [1, 100, 100]);
    const narrow = await repo.getSuppliers({ page: -3, limit: 0 });
    assert.deepEqual([narrow.page, narrow.limit, names(narrow)], [1, 1, ['S00']]);
  });

  it('totalPages rounds up and is 0 for an empty result; a page past the end is empty', async () => {
    answers.findMany = [rows(11), [], rows(11)];
    assert.equal((await repo.getSuppliers({ limit: 5 })).totalPages, 3);
    assert.equal((await repo.getSuppliers({ limit: 5 })).totalPages, 0);
    assert.deepEqual((await repo.getSuppliers({ page: 9, limit: 5 })).suppliers, []);
  });

  it('filters are applied by the query, before sorting and paging', async () => {
    answers.findMany = [[]];
    await repo.getSuppliers({ category: 'Food', page: 1 });
    assert.deepEqual(calls.map((c) => c.method), ['findMany']);
    assert.deepEqual(calls[0].args, { where: { category: { equals: 'Food', mode: 'insensitive' } } });
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
      latitude: null,
      longitude: null,
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
