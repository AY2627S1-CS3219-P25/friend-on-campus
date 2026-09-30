/**
 * AI Assistance Disclosure:
 * Tool: Claude Code (model: Claude Fable 5.1), date: 2026-09-30
 * Scope: HTTP tests for src/backend/supplierRoutes.ts with the repository module replaced by an in-memory fake
 * (node:test module mock) and the real @campus-errand/auth middleware with a test key pair: public reads and
 * query parsing, RBAC on writes (401 / 403 / tampered / expired), required-field and blank-field rules, the 409
 * duplicate rule on create and update including the unique-index fallback, toggle, soft and permanent delete,
 * and the 500 path.
 * Author review: <to be completed by Reallyeasy1>
 */
// AI-generated (edited by Reallyeasy1)
import { describe, it, before, after, beforeEach, mock } from 'node:test';
import assert from 'node:assert/strict';
import { generateKeyPairSync, sign } from 'node:crypto';
import type { AddressInfo } from 'node:net';
import express from 'express';
import { authMiddleware, requireAdmin } from '@campus-errand/auth';

// ---------------------------------------------------------------- test key pair and token signing
const pair = generateKeyPairSync('ed25519');
const PUBLIC_KEY = pair.publicKey.export({ format: 'der', type: 'spki' }).toString('base64url');
const ISSUER = 'test-issuer';
const AUDIENCE = 'test-audience';

function b64(value: object) {
  return Buffer.from(JSON.stringify(value)).toString('base64url');
}
function token(role: 'STUDENT' | 'ADMIN', overrides: Record<string, unknown> = {}, key = pair.privateKey) {
  const now = Math.floor(Date.now() / 1000);
  const claims = { sub: 'user-1', sid: 'sid-1', role, iat: now, exp: now + 900, iss: ISSUER, aud: AUDIENCE, ...overrides };
  const unsigned = `${b64({ alg: 'EdDSA', typ: 'JWT' })}.${b64(claims)}`;
  return `${unsigned}.${sign(null, Buffer.from(unsigned), key).toString('base64url')}`;
}

// ---------------------------------------------------------------- in-memory repository
type Row = Record<string, any>;
const rows = new Map<string, Row>();
let nextId = 1;
let failNext: Error | null = null;
const seen: Array<{ fn: string; args: any[] }> = [];

function maybeFail() {
  if (failNext) {
    const e = failNext;
    failNext = null;
    throw e;
  }
}
const norm = (v: unknown) => String(v ?? '').trim().toLowerCase();

const fakeRepository = {
  async getSuppliers(filter: any) {
    seen.push({ fn: 'getSuppliers', args: [filter] });
    maybeFail();
    const list = [...rows.values()];
    return { suppliers: list, total: list.length, page: 1, limit: list.length, totalPages: 1 };
  },
  async getSupplierById(id: string) {
    maybeFail();
    return rows.get(id) ?? null;
  },
  async getSupplierByCode(code: string) {
    return [...rows.values()].find((r) => r.supplierCode === code) ?? null;
  },
  async findDuplicateLocation(name: string, category: string, building: string, floor: string, excludeId?: string) {
    seen.push({ fn: 'findDuplicateLocation', args: [name, category, building, floor, excludeId] });
    return (
      [...rows.values()].find(
        (r) =>
          r.id !== excludeId &&
          norm(r.name) === norm(name) &&
          norm(r.category) === norm(category) &&
          norm(r.building) === norm(building) &&
          norm(r.floor) === norm(floor),
      ) ?? null
    );
  },
  async createSupplier(data: any) {
    maybeFail();
    const row = { id: `id-${nextId}`, supplierCode: `SUP-${String(nextId).padStart(3, '0')}`, isActive: true, ...data };
    row.name = row.name.trim();
    nextId += 1;
    rows.set(row.id, row);
    return row;
  },
  async updateSupplier(id: string, data: any) {
    maybeFail();
    const row = { ...rows.get(id), ...data };
    rows.set(id, row);
    return row;
  },
  async toggleSupplierActive(id: string) {
    const row = rows.get(id);
    if (!row) return null;
    row.isActive = !row.isActive;
    return row;
  },
  async deleteSupplier(id: string, softDelete = true) {
    seen.push({ fn: 'deleteSupplier', args: [id, softDelete] });
    if (softDelete) {
      rows.get(id)!.isActive = false;
      return rows.get(id);
    }
    rows.delete(id);
    return {};
  },
};

function seed(overrides: Row = {}): Row {
  const row = {
    id: `id-${nextId}`,
    supplierCode: `SUP-${String(nextId).padStart(3, '0')}`,
    name: 'Smooy',
    campusZone: 'COM3',
    exactLocation: 'COM3 Level 1',
    category: 'Food',
    building: 'COM3',
    floor: '1',
    isActive: true,
    ...overrides,
  };
  nextId += 1;
  rows.set(row.id, row);
  return row;
}

const VALID = { name: 'Demo Cafe', campusZone: 'COM3', exactLocation: 'COM3 Level 1', category: 'Food', building: 'COM3', floor: '1' };

// ---------------------------------------------------------------- app under test
let base = '';
let server: ReturnType<express.Express['listen']>;

async function call(method: string, path: string, options: { body?: unknown; token?: string } = {}) {
  const headers: Record<string, string> = {};
  if (options.body !== undefined) headers['Content-Type'] = 'application/json';
  if (options.token) headers.Authorization = `Bearer ${options.token}`;
  const res = await fetch(base + path, { method, headers, body: options.body === undefined ? undefined : JSON.stringify(options.body) });
  const text = await res.text();
  return { status: res.status, body: text ? JSON.parse(text) : null };
}

before(async () => {
  mock.module('../src/database/supplierRepository', { namedExports: fakeRepository });
  const { createSupplierRouter } = await import('../src/backend/supplierRoutes.js');
  const app = express();
  app.use(express.json());
  app.use('/api/suppliers', createSupplierRouter(authMiddleware({ publicKey: PUBLIC_KEY, issuer: ISSUER, audience: AUDIENCE }), requireAdmin));
  server = app.listen(0);
  await new Promise<void>((resolve) => server.once('listening', resolve));
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  // silence the handlers' console.error for the expected 500 cases
  mock.method(console, 'error', () => {});
});

after(async () => {
  await new Promise<void>((resolve) => server.close(() => resolve()));
});

beforeEach(() => {
  rows.clear();
  nextId = 1;
  failNext = null;
  seen.length = 0;
});

// ---------------------------------------------------------------- tests
describe('reads need no token', () => {
  it('GET / returns the page shape', async () => {
    seed();
    const res = await call('GET', '/api/suppliers');
    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.deepEqual(Object.keys(res.body.data).sort(), ['limit', 'page', 'suppliers', 'total', 'totalPages']);
    assert.equal(res.body.data.suppliers[0].name, 'Smooy');
  });

  it('GET / parses the query string into typed repository options', async () => {
    await call('GET', '/api/suppliers?campusZone=COM3&category=Food&search=cafe&isActive=false&sortBy=category&sortOrder=desc&page=2&limit=5');
    assert.deepEqual(seen[0].args[0], {
      campusZone: 'COM3',
      category: 'Food',
      search: 'cafe',
      isActive: false,
      sortBy: 'category',
      sortOrder: 'desc',
      page: 2,
      limit: 5,
    });
  });

  it('GET / leaves absent parameters undefined and treats isActive=maybe as no filter', async () => {
    await call('GET', '/api/suppliers?isActive=maybe&sortOrder=DESC');
    const opts = seen[0].args[0];
    assert.equal(opts.isActive, undefined);
    assert.equal(opts.sortOrder, 'asc');
    assert.equal(opts.page, undefined);
    assert.equal(opts.limit, undefined);
    assert.equal(opts.search, undefined);
  });

  it('GET /:id finds by uuid, then by supplierCode, else 404', async () => {
    const row = seed();
    assert.equal((await call('GET', `/api/suppliers/${row.id}`)).body.data.id, row.id);
    assert.equal((await call('GET', `/api/suppliers/${row.supplierCode}`)).body.data.id, row.id);
    const missing = await call('GET', '/api/suppliers/does-not-exist');
    assert.equal(missing.status, 404);
    assert.deepEqual(missing.body, { success: false, error: "Supplier 'does-not-exist' not found" });
  });

  it('GET / answers 500 with the error message when the repository throws', async () => {
    failNext = new Error('db down');
    const res = await call('GET', '/api/suppliers');
    assert.equal(res.status, 500);
    assert.deepEqual(res.body, { success: false, error: 'db down' });
  });
});

describe('writes are ADMIN-only', () => {
  it('no token -> 401 MISSING_TOKEN on every write route', async () => {
    const row = seed();
    for (const [method, path] of [
      ['POST', '/api/suppliers'],
      ['PUT', `/api/suppliers/${row.id}`],
      ['PATCH', `/api/suppliers/${row.id}/toggle`],
      ['DELETE', `/api/suppliers/${row.id}`],
    ] as const) {
      const res = await call(method, path, { body: VALID });
      assert.equal(res.status, 401, `${method} ${path}`);
      assert.equal(res.body.code, 'MISSING_TOKEN');
    }
    assert.equal(rows.size, 1, 'nothing changed');
  });

  it('STUDENT -> 403 ADMIN_REQUIRED on every write route', async () => {
    const row = seed();
    const student = token('STUDENT');
    for (const [method, path] of [
      ['POST', '/api/suppliers'],
      ['PUT', `/api/suppliers/${row.id}`],
      ['PATCH', `/api/suppliers/${row.id}/toggle`],
      ['DELETE', `/api/suppliers/${row.id}`],
    ] as const) {
      const res = await call(method, path, { body: VALID, token: student });
      assert.equal(res.status, 403, `${method} ${path}`);
      assert.equal(res.body.code, 'ADMIN_REQUIRED');
    }
    assert.equal(rows.get(row.id)!.isActive, true);
  });

  it('tampered signature, wrong key, wrong issuer or audience -> 401 INVALID_TOKEN', async () => {
    const admin = token('ADMIN');
    const otherKey = generateKeyPairSync('ed25519').privateKey;
    for (const bad of [
      admin.slice(0, -4) + 'AAAA',
      token('ADMIN', {}, otherKey),
      token('ADMIN', { iss: 'other' }),
      token('ADMIN', { aud: 'other' }),
      token('ADMIN', { role: 'ROOT' }),
    ]) {
      const res = await call('POST', '/api/suppliers', { body: VALID, token: bad });
      assert.equal(res.status, 401);
      assert.equal(res.body.code, 'INVALID_TOKEN');
    }
  });

  it('expired token -> 401 TOKEN_EXPIRED', async () => {
    const now = Math.floor(Date.now() / 1000);
    const res = await call('POST', '/api/suppliers', { body: VALID, token: token('ADMIN', { iat: now - 1000, exp: now - 10 }) });
    assert.equal(res.status, 401);
    assert.equal(res.body.code, 'TOKEN_EXPIRED');
  });
});

describe('POST /api/suppliers', () => {
  const admin = token('ADMIN');

  it('creates with 201 and trims the duplicate-check values', async () => {
    const res = await call('POST', '/api/suppliers', { body: { ...VALID, name: '  Demo Cafe ' }, token: admin });
    assert.equal(res.status, 201);
    assert.equal(res.body.success, true);
    assert.equal(res.body.data.name, 'Demo Cafe');
    assert.match(res.body.data.supplierCode, /^SUP-\d{3}$/);
    const check = seen.find((s) => s.fn === 'findDuplicateLocation')!;
    assert.deepEqual(check.args, ['Demo Cafe', 'Food', 'COM3', '1', undefined]);
  });

  it('400 when any required field is missing, empty or whitespace-only', async () => {
    for (const key of ['name', 'campusZone', 'exactLocation', 'category', 'building', 'floor'] as const) {
      for (const bad of [undefined, '', '   ']) {
        const body: any = { ...VALID, [key]: bad };
        if (bad === undefined) delete body[key];
        const res = await call('POST', '/api/suppliers', { body, token: admin });
        assert.equal(res.status, 400, `${key}=${JSON.stringify(bad)}`);
        assert.match(res.body.error, /Missing required fields/);
      }
    }
    assert.equal(rows.size, 0);
  });

  it('409 with the existing record when name, category, building and floor match ignoring case and spaces', async () => {
    seed({ name: 'Smooy', category: 'Food', building: 'COM3', floor: '1' });
    const res = await call('POST', '/api/suppliers', {
      body: { ...VALID, name: ' smooy ', category: 'FOOD', building: 'com3', floor: '1 ' },
      token: admin,
    });
    assert.equal(res.status, 409);
    assert.equal(res.body.success, false);
    assert.deepEqual(res.body.duplicate, { name: 'Smooy', category: 'Food', building: 'COM3', floor: '1' });
    assert.equal(rows.size, 1);
  });

  it('a different floor or building is not a duplicate', async () => {
    seed();
    const floor2 = await call('POST', '/api/suppliers', { body: { ...VALID, name: 'Smooy', floor: '2' }, token: admin });
    assert.equal(floor2.status, 201);
    const otherBuilding = await call('POST', '/api/suppliers', { body: { ...VALID, name: 'Smooy', building: 'COM1' }, token: admin });
    assert.equal(otherBuilding.status, 201);
  });

  it('a unique-index violation (Prisma P2002) from the insert is answered with 409, not 500', async () => {
    failNext = Object.assign(new Error('Unique constraint failed'), { code: 'P2002' });
    const res = await call('POST', '/api/suppliers', { body: VALID, token: admin });
    assert.equal(res.status, 409);
    assert.equal(res.body.success, false);
    assert.equal('duplicate' in res.body, false);
  });

  it('any other repository error is 500 with the message', async () => {
    failNext = new Error('disk full');
    const res = await call('POST', '/api/suppliers', { body: VALID, token: admin });
    assert.equal(res.status, 500);
    assert.equal(res.body.error, 'disk full');
  });
});

describe('PUT /api/suppliers/:id', () => {
  const admin = token('ADMIN');

  it('404 for an unknown id', async () => {
    const res = await call('PUT', '/api/suppliers/nope', { body: { name: 'x' }, token: admin });
    assert.equal(res.status, 404);
  });

  it('updates a subset of fields and does not flag the record as its own duplicate', async () => {
    const row = seed();
    const res = await call('PUT', `/api/suppliers/${row.id}`, { body: { description: 'new text' }, token: admin });
    assert.equal(res.status, 200);
    assert.equal(res.body.data.description, 'new text');
    const check = seen.find((s) => s.fn === 'findDuplicateLocation')!;
    assert.deepEqual(check.args, ['Smooy', 'Food', 'COM3', '1', row.id], 'effective values merged from the stored row, own id excluded');
  });

  it('400 when name, category, building or floor is sent blank', async () => {
    const row = seed();
    for (const key of ['name', 'category', 'building', 'floor']) {
      const res = await call('PUT', `/api/suppliers/${row.id}`, { body: { [key]: '  ' }, token: admin });
      assert.equal(res.status, 400, key);
      assert.equal(res.body.error, `${key} cannot be empty`);
    }
    assert.equal(rows.get(row.id)!.name, 'Smooy');
  });

  it('409 when the update would collide with another record', async () => {
    const a = seed({ name: 'Smooy' });
    seed({ name: 'Other Cafe' });
    const res = await call('PUT', `/api/suppliers/${a.id}`, { body: { name: 'other cafe' }, token: admin });
    assert.equal(res.status, 409);
    assert.equal(res.body.duplicate.name, 'Other Cafe');
    assert.equal(rows.get(a.id)!.name, 'Smooy', 'unchanged');
  });

  it('a unique-index violation on update is 409', async () => {
    const row = seed();
    failNext = Object.assign(new Error('unique'), { code: 'P2002' });
    const res = await call('PUT', `/api/suppliers/${row.id}`, { body: { name: 'x' }, token: admin });
    assert.equal(res.status, 409);
  });
});

describe('PATCH /:id/toggle and DELETE /:id', () => {
  const admin = token('ADMIN');

  it('toggle flips isActive and reports the new state in the message', async () => {
    const row = seed();
    const off = await call('PATCH', `/api/suppliers/${row.id}/toggle`, { token: admin });
    assert.equal(off.status, 200);
    assert.equal(off.body.data.isActive, false);
    assert.match(off.body.message, /deactivated/);
    const on = await call('PATCH', `/api/suppliers/${row.id}/toggle`, { token: admin });
    assert.equal(on.body.data.isActive, true);
    assert.match(on.body.message, /activated/);
    assert.equal((await call('PATCH', '/api/suppliers/nope/toggle', { token: admin })).status, 404);
  });

  it('DELETE soft-deletes by default and keeps the row', async () => {
    const row = seed();
    const res = await call('DELETE', `/api/suppliers/${row.id}`, { token: admin });
    assert.equal(res.status, 200);
    assert.match(res.body.message, /inactive/);
    assert.deepEqual(seen.find((s) => s.fn === 'deleteSupplier')!.args, [row.id, true]);
    assert.equal(rows.get(row.id)!.isActive, false);
  });

  it('DELETE ?permanent=true removes the row; only the exact value true counts', async () => {
    const row = seed();
    const notQuite = await call('DELETE', `/api/suppliers/${row.id}?permanent=yes`, { token: admin });
    assert.equal(notQuite.status, 200);
    assert.ok(rows.has(row.id), 'still there after permanent=yes');
    const gone = await call('DELETE', `/api/suppliers/${row.id}?permanent=true`, { token: admin });
    assert.equal(gone.status, 200);
    assert.match(gone.body.message, /permanently/);
    assert.equal(rows.has(row.id), false);
    assert.equal((await call('GET', `/api/suppliers/${row.id}`)).status, 404);
  });

  it('DELETE 404 for an unknown id', async () => {
    const res = await call('DELETE', '/api/suppliers/nope', { token: admin });
    assert.equal(res.status, 404);
  });
});
