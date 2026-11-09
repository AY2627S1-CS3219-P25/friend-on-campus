// AI Assistance Disclosure:
// Tool: Claude Code (model: Claude Fable 5.1), date: 2026-11-09
// Scope: Self-tests for the k6 performance wrapper, written from the defects of run perf-20261108T135152Z-b09772:
//        admin and account logins that renew themselves (that run's reconciliation and cleanup got HTTP 401 after
//        26 minutes on a 15-minute token), stage statuses that are verdicts and never HTTP codes, and removal of a
//        failed run's fixtures by tag. Uses an in-process fake gateway with an injected clock; no stack needed.
// Author review: <to be completed by Reallyeasy1>
// AI-generated (edited by Reallyeasy1)
//
//   node --test scripts/perf/test/harness.test.mjs
import assert from 'node:assert/strict';
import http from 'node:http';
import { after, before, test } from 'node:test';
import { cleanup, findRunOwned, FixtureError } from '../lib/fixtures.mjs';
import { createGateway, GatewayError } from '../lib/gateway.mjs';
import { compareRuns, overallVerdict, renderComparison, stageStatus } from '../lib/report.mjs';

const TTL_SECONDS = 900;
const MINUTE = 60_000;
let clock = 1_700_000_000_000;
let logins = 0;
const issuedAt = new Map(); // token -> clock value at login
const deleted = { suppliers: [], users: [], cancelled: [] };
// The fake target's data: one run tagged abc123 beside records that belong to nobody's run.
const suppliers = [
  ...Array.from({ length: 150 }, (_, index) => ({ id: `s${index}`, name: `perf-abc123 stall ${index}` })),
  { id: 'real-1', name: 'Real Stall with perf-abc123 in its name' },
];
const users = [
  { userId: 'u0', email: 'perf-abc123-0@u.nus.edu' },
  { userId: 'u1', email: 'perf-abc123-1@u.nus.edu' },
  { userId: 'other-run', email: 'perf-ffffff-0@u.nus.edu' },
  { userId: 'alice', email: 'alice@u.nus.edu' },
];
const orders = { u0: [{ id: 'o-open', status: 'OPEN' }, { id: 'o-done', status: 'COMPLETED' }], u1: [{ id: 'o-transit', status: 'IN_TRANSIT' }] };

let server;
let gw;

before(async () => {
  server = http.createServer((req, res) => {
    const url = new URL(req.url, 'http://fake');
    const send = (status, body) => { res.writeHead(status, { 'Content-Type': 'application/json' }); res.end(body === undefined ? '' : JSON.stringify(body)); };
    if (req.method === 'POST' && url.pathname === '/api/auth/login') {
      logins += 1;
      const token = `t${logins}`;
      issuedAt.set(token, clock);
      return send(200, { success: true, data: { accessToken: token, accessTokenExpiresInSeconds: TTL_SECONDS, user: { userId: 'admin', userRole: 'ADMIN' } } });
    }
    // Every other route rejects an expired token exactly as the services do.
    const token = (req.headers.authorization ?? '').replace('Bearer ', '');
    if (!issuedAt.has(token) || clock >= issuedAt.get(token) + TTL_SECONDS * 1000) return send(401, { success: false });
    if (req.method === 'GET' && url.pathname === '/api/orders') {
      const list = orders[url.searchParams.get('requesterId')] ?? [];
      return send(200, { success: true, data: url.searchParams.get('page') === '1' ? list : [], total: list.length });
    }
    if (req.method === 'GET' && url.pathname === '/api/suppliers') {
      const term = url.searchParams.get('search') ?? '';
      const page = Number(url.searchParams.get('page'));
      const limit = Number(url.searchParams.get('limit'));
      const matches = suppliers.filter((supplier) => supplier.name.includes(term));
      return send(200, { success: true, data: { suppliers: matches.slice((page - 1) * limit, page * limit), total: matches.length, page, limit } });
    }
    if (req.method === 'GET' && url.pathname === '/api/users') return send(200, { success: true, data: { users } });
    if (req.method === 'POST' && /^\/api\/orders\/[^/]+\/(admin\/)?cancel$/.test(url.pathname)) { deleted.cancelled.push(url.pathname); return send(200, { success: true, data: {} }); }
    if (req.method === 'DELETE' && url.pathname.startsWith('/api/suppliers/')) { deleted.suppliers.push(url.pathname.split('/').pop()); return send(200, { success: true }); }
    if (req.method === 'DELETE' && url.pathname.startsWith('/api/users/')) { deleted.users.push(url.pathname.split('/').pop()); return send(204); }
    return send(404, { success: false });
  });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  gw = createGateway(`http://127.0.0.1:${server.address().port}`, { now: () => clock });
});

after(() => new Promise((resolve) => server.close(resolve)));

test('a session keeps its token while it is valid and logs in again a minute before it expires', async () => {
  const before_ = logins;
  const session = gw.session('admin@nus.edu.sg', 'pw');
  const first = await session.token();
  clock += 13 * MINUTE;
  assert.equal(await session.token(), first, 'two minutes of validity left: no new login');
  clock += MINUTE + 1000;
  const second = await session.token();
  assert.notEqual(second, first, 'inside the last minute: renewed');
  assert.equal(logins - before_, 2);
  assert.equal((await session.current()).role, 'ADMIN');
});

test('parallel callers of an expired session share one login', async () => {
  const session = gw.session('admin@nus.edu.sg', 'pw');
  const before_ = logins;
  const tokens = await Promise.all(Array.from({ length: 8 }, () => session.token()));
  assert.deepEqual([new Set(tokens).size, logins - before_], [1, 1]);
});

test('cleanup still works after the run outlived the first admin token (run perf-20261108T135152Z-b09772)', async () => {
  const admin = gw.session('admin@nus.edu.sg', 'pw');
  await admin.token(); // the login made while the fixtures were created
  clock += 26 * MINUTE; // the k6 stages
  const report = await cleanup(gw, {
    admin,
    accounts: [{ index: 0, userId: 'u0', email: 'perf-abc123-0@u.nus.edu', password: 'pw' }, { index: 1, userId: 'u1', email: 'perf-abc123-1@u.nus.edu', password: 'pw' }],
    owned: { supplierIds: ['s0', 's1'], userIds: ['u0', 'u1'] },
    log: () => {},
  });
  assert.deepEqual(report.errors, [], 'no HTTP 401 from an expired token');
  assert.deepEqual([report.cancelledOrders, report.deletedSuppliers, report.deletedAccounts], [2, 2, 2]);
});

test('findRunOwned names exactly one run by its tag, across pages, and nothing else', async () => {
  const admin = gw.session('admin@nus.edu.sg', 'pw');
  const found = await findRunOwned(gw, admin, 'abc123');
  assert.equal(found.owned.supplierIds.length, 150, 'all pages of the run-owned suppliers');
  assert.ok(!found.owned.supplierIds.includes('real-1'), 'a supplier that merely contains the term is not run-owned');
  assert.deepEqual(found.owned.userIds, ['u0', 'u1'], 'neither another run nor a real account');
  assert.deepEqual(found.accounts.map((account) => [account.index, account.password]), [[0, undefined], [1, undefined]]);
  await assert.rejects(findRunOwned(gw, admin, '../x'), FixtureError, 'the tag is validated before it reaches a URL');
});

test('cleanup of a found run cancels through the administrator when no account password is known', async () => {
  deleted.cancelled.length = 0;
  const admin = gw.session('admin@nus.edu.sg', 'pw');
  const found = await findRunOwned(gw, admin, 'abc123');
  const report = await cleanup(gw, { admin, accounts: found.accounts, owned: { supplierIds: [], userIds: [] }, log: () => {} });
  assert.deepEqual(report.errors, []);
  assert.deepEqual(deleted.cancelled.sort(), ['/api/orders/o-open/admin/cancel', '/api/orders/o-transit/admin/cancel']);
});

test('a stage status is a verdict, never an HTTP status code', () => {
  assert.equal(stageStatus(new GatewayError('GET /api/orders: expected HTTP 200, received HTTP 401', 401)), 'FAIL');
  assert.equal(stageStatus(new FixtureError('admin login failed')), 'BLOCKED');
  assert.equal(stageStatus(Object.assign(new Error('k6'), { status: 'INCOMPLETE' })), 'INCOMPLETE');
  assert.equal(stageStatus(new Error('anything else')), 'FAIL');
});

test('the run passes only when every required stage passed', () => {
  const stages = (reconciliation) => [
    { stage: 'preflight', required: true, status: 'PASS' },
    { stage: 'fixtures', required: true, status: 'PASS' },
    { stage: 'k6:credit', required: true, status: 'PASS' },
    { stage: 'reconciliation', required: true, status: reconciliation },
    { stage: 'cleanup', required: false, status: 'FAIL' },
  ];
  assert.equal(overallVerdict(stages('PASS'), 1), 'PASS', 'an optional stage does not change the verdict');
  assert.equal(overallVerdict(stages('FAIL'), 1), 'FAIL');
  // What the old code recorded for that run's reconciliation; with every k6 stage green it would have passed the run.
  assert.equal(overallVerdict(stages('401'), 1), 'FAIL');
  assert.equal(overallVerdict(stages('BLOCKED'), 1), 'BLOCKED');
  assert.equal(overallVerdict(stages('INCOMPLETE'), 1), 'INCOMPLETE');
  assert.equal(overallVerdict(stages('PASS').slice(0, 2), 1), 'BLOCKED', 'stages that never ran');
});

test('compareRuns reports the change per operation and marks runs at different load as not comparable', () => {
  const operation = (name, vus, p50Ms, p95Ms, requestsPerSecond) => ({
    operation: name, verdict: 'FAIL', concurrency: { configuredVus: vus }, steady: { p50Ms, p95Ms, requestsPerSecond, httpFailedRate: 0 },
  });
  const run = (runId, workloads) => ({ manifest: { runId, startedAt: '2026-11-09T00:00:00.000Z', profile: 'load', commit: 'abcdef1234', tools: { k6: '1.5.0' }, target: { hostname: '127.0.0.1' } }, workloads });
  const baseline = run('before', {
    discovery: { operations: [operation('order_feed', 100, 1000, 2000, 50)], asyncMetrics: [] },
    supplier: { operations: [operation('supplier_search', 50, 400, 800, 10)], asyncMetrics: [] },
    lifecycle: { operations: [], asyncMetrics: [{ metric: 'order_pending_to_open_ms', steady: { p50Ms: 10_000, p95Ms: 20_000 } }] },
  });
  const current = run('after', {
    discovery: { operations: [operation('order_feed', 100, 500, 1000, 100)], asyncMetrics: [] },
    supplier: { operations: [operation('supplier_search', 100, 400, 800, 10)], asyncMetrics: [] },
    lifecycle: { operations: [operation('order_create', 50, 30, 40, 2)], asyncMetrics: [{ metric: 'order_pending_to_open_ms', steady: { p50Ms: 5_000, p95Ms: 30_000 } }] },
    credit: { operations: [operation('credit_wallet', 100, 8, 14, 200)], asyncMetrics: [] },
  });
  const rows = compareRuns(baseline, current);
  assert.deepEqual(rows.map((row) => `${row.workload}/${row.operation}`), ['discovery/order_feed', 'supplier/supplier_search', 'lifecycle/order_pending_to_open_ms (reported only)'],
    'an operation or workload missing from the baseline is left out');
  const feed = rows[0];
  assert.deepEqual([feed.p50Ms.change, feed.p95Ms.change, feed.requestsPerSecond.change, feed.comparable], [-0.5, -0.5, 1, true]);
  assert.equal(rows[1].comparable, false, '50 and 100 virtual users are different measurements');
  assert.deepEqual([rows[2].p50Ms.change, rows[2].p95Ms.change], [-0.5, 0.5]);
  const markdown = renderComparison(rows, { baseline: baseline.manifest, current: current.manifest });
  assert.match(markdown, /\| discovery \| order_feed \| 100 \| 1000 -> 500 \| -50% \| 2000 -> 1000 \| -50% \| 50\.0 -> 100\.0 \| \+100% \|/);
  assert.match(markdown, /50 -> 100 \*/);
  assert.match(markdown, /not a like-for-like comparison/);
});
