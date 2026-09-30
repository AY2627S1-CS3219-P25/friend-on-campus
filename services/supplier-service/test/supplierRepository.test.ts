/**
 * AI Assistance Disclosure:
 * Tool: Claude Code (model: Claude Fable 5.1), date: 2026-09-30
 * Scope: Unit tests for src/database/supplierRepository.ts with the Prisma client replaced by a recording fake
 * (node:test module mock): where-clause and orderBy construction, pagination arithmetic and clamping, the
 * duplicate lookup, trimming and null defaults on create and update, supplier-code generation, toggle and delete.
 * Author review: <to be completed by the service owner>
 */
// AI-generated (edited by the service owner)
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
    answers.findMany = [[{ id: 'a' }, { id: 'b' }]];
    const result = await repo.getSuppliers();
    assert.deepEqual(calls[0].args, { where: {}, orderBy: { name: 'asc' } });
    assert.deepEqual(result, { suppliers: [{ id: 'a' }, { id: 'b' }], total: 2, page: 1, limit: 2, totalPages: 1 });
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
  it('accepts the five sortable fields', async () => {
    for (const field of ['name', 'campusZone', 'category', 'createdAt', 'supplierCode'] as const) {
      answers.findMany = [[]];
      await repo.getSuppliers({ sortBy: field });
      assert.deepEqual(calls.at(-1)!.args.orderBy, { [field]: 'asc' });
    }
  });

  it('falls back to name for an unknown sortBy and to asc for anything but desc', async () => {
    answers.findMany = [[], [], []];
    await repo.getSuppliers({ sortBy: 'price' as any });
    await repo.getSuppliers({ sortBy: 'category', sortOrder: 'DESC' as any });
    await repo.getSuppliers({ sortBy: 'category', sortOrder: 'desc' });
    assert.deepEqual(calls[0].args.orderBy, { name: 'asc' });
    assert.deepEqual(calls[1].args.orderBy, { category: 'asc' });
    assert.deepEqual(calls[2].args.orderBy, { category: 'desc' });
  });
});

describe('getSuppliers: pagination', () => {
  it('page and limit become skip and take, with total and totalPages from a count query', async () => {
    answers.findMany = [[{ id: 'x' }]];
    answers.count = [21];
    const result = await repo.getSuppliers({ page: 3, limit: 5 });
    const findMany = calls.find((c) => c.method === 'findMany')!;
    assert.equal(findMany.args.skip, 10);
    assert.equal(findMany.args.take, 5);
    const count = calls.find((c) => c.method === 'count')!;
    assert.deepEqual(count.args, { where: {} });
    assert.deepEqual(result, { suppliers: [{ id: 'x' }], total: 21, page: 3, limit: 5, totalPages: 5 });
  });

  it('paginates when only one of page or limit is sent, with defaults page 1 and limit 10', async () => {
    answers.findMany = [[], []];
    answers.count = [0, 0];
    await repo.getSuppliers({ page: 2 });
    await repo.getSuppliers({ limit: 7 });
    const [first, second] = calls.filter((c) => c.method === 'findMany');
    assert.equal(first.args.skip, 10);
    assert.equal(first.args.take, 10);
    assert.equal(second.args.skip, 0);
    assert.equal(second.args.take, 7);
  });

  it('clamps page to at least 1 and limit to 1..100', async () => {
    answers.findMany = [[], [], []];
    answers.count = [0, 0, 0];
    await repo.getSuppliers({ page: 0, limit: 500 });
    await repo.getSuppliers({ page: -3, limit: 0 });
    await repo.getSuppliers({ page: 1, limit: 100 });
    const pages = calls.filter((c) => c.method === 'findMany').map((c) => [c.args.skip, c.args.take]);
    assert.deepEqual(pages, [[0, 100], [0, 1], [0, 100]]);
  });

  it('totalPages rounds up and is 0 for an empty result', async () => {
    answers.findMany = [[], []];
    answers.count = [11, 0];
    assert.equal((await repo.getSuppliers({ limit: 5 })).totalPages, 3);
    assert.equal((await repo.getSuppliers({ limit: 5 })).totalPages, 0);
  });

  it('applies the same where clause to the page query and the count', async () => {
    answers.findMany = [[]];
    answers.count = [0];
    await repo.getSuppliers({ category: 'Food', page: 1 });
    const [findMany, count] = [calls.find((c) => c.method === 'findMany')!, calls.find((c) => c.method === 'count')!];
    assert.deepEqual(findMany.args.where, count.args.where);
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
