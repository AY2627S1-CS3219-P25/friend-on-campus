// AI Assistance Disclosure:
// Tool: Claude Code (model: Claude Fable 5.1), date: 2026-11-08 to 2026-11-09
// Scope: Run-owned fixtures, post-run reconciliation and cleanup for the k6 performance harness (issue #236): registers accounts and waits for their welcome grants,..; updated across 2 AI-assisted revisions through D4 wrap-up (fixes from run perf-20261108T135152Z-b09772, whose reconciliation and cleanup got HTTP 401 on a 26-minute-old admin token and left 100 accounts and 500..).
// Author review: I validated correctness, edited for style, and verified with automated tests.
import { randomBytes, randomUUID } from 'node:crypto';
import { setTimeout as delay } from 'node:timers/promises';
import { GatewayError, mapLimit, until } from './gateway.mjs';

const WELCOME_GRANT = 100;
const HELD_STATUSES = new Set(['OPEN', 'ACCEPTED', 'IN_TRANSIT', 'DELIVERED']);
const TERMINAL_STATUSES = new Set(['COMPLETED', 'CANCELLED', 'EXPIRED', 'REJECTED']);
const PARALLELISM = 8;

export class FixtureError extends Error {
  constructor(message) {
    super(message);
    this.name = 'FixtureError';
  }
}

function password() {
  // 8-24 characters are accepted by the User Service; 20 random characters stay inside that window.
  return `Pf!${randomBytes(12).toString('base64url').slice(0, 17)}`;
}

export function fixtureTag() {
  return randomBytes(3).toString('hex');
}

/**
 * Creates everything the k6 scripts need. `admin` is the administrator's gateway session (gw.session).
 * Returns { fixtures (safe to publish), accounts (secret: passwords), owned (ids for cleanup) }.
 */
export async function createFixtures(gw, options) {
  const partial = { owned: { userIds: [], supplierIds: [], feedOrderIds: [] }, accounts: [] };
  try {
    return await buildFixtures(gw, options, partial);
  } catch (error) {
    const blocked = error instanceof FixtureError ? error : new FixtureError(error.message);
    blocked.partial = partial;
    throw blocked;
  }
}

async function buildFixtures(gw, { tag, admin, accountCount, supplierCount, feedOrderCount, openTimeoutMs, log }, partial) {
  const owned = partial.owned;
  const adminLogin = await admin.current().catch((error) => {
    throw new FixtureError(`admin login failed: ${error.message}`);
  });
  if (adminLogin.role !== 'ADMIN') throw new FixtureError('the configured admin account is not an administrator');
  log(`admin login ok; registering ${accountCount} run-owned accounts`);

  const accounts = await mapLimit(Array.from({ length: accountCount }, (_, index) => index), PARALLELISM, async (index) => {
    const account = { index, username: `perf_${tag}_${index}`, email: `perf-${tag}-${index}@u.nus.edu`, password: password() };
    const registered = await gw.request('/api/auth/register', { method: 'POST', body: account });
    const data = gw.expect(registered, 201, 'POST /api/auth/register');
    if (!data.user?.userId) throw new FixtureError('registration returned no user id');
    owned.userIds.push(data.user.userId);
    const session = await gw.login(account.email, account.password);
    const created = { index, email: account.email, password: account.password, userId: data.user.userId, token: session.token };
    partial.accounts.push(created);
    return created;
  }).catch((error) => {
    throw new FixtureError(`account registration failed: ${error.message}`);
  });

  log('waiting for each welcome grant (User CDC -> Credit)');
  await mapLimit(accounts, PARALLELISM, (account) => until(`welcome grant for account ${account.index}`, async () => {
    const response = await gw.request('/api/credits/wallet', { token: account.token });
    if (response.status === 404) return { done: false, state: 'wallet not initialised' };
    const wallet = gw.expect(response, 200, 'GET /api/credits/wallet');
    if (wallet.userId !== account.userId) throw new FixtureError('wallet belongs to a different user');
    return { done: wallet.availableCredits === WELCOME_GRANT && wallet.escrowCredits === 0, state: `available=${wallet.availableCredits}` };
  }, { timeoutMs: openTimeoutMs })).catch((error) => {
    throw new FixtureError(`welcome grant missing: ${error.message}`);
  });

  const campusZone = `Perf Zone ${tag}`;
  const category = `Perf ${tag}`;
  if (supplierCount > 0) {
    log(`creating ${supplierCount} run-owned active suppliers`);
    await mapLimit(Array.from({ length: supplierCount }, (_, index) => index), PARALLELISM, async (index) => {
      const response = await gw.request('/api/suppliers', {
        method: 'POST',
        token: await admin.token(),
        body: {
          // Explicit code: the service derives codes from count + 1, which collides under parallel creation.
          supplierCode: `PERF-${tag.toUpperCase()}-${String(index).padStart(3, '0')}`,
          name: `perf-${tag} stall ${index}`,
          campusZone,
          exactLocation: `Perf lane ${index}`,
          category,
          building: `Perf Block ${tag}`,
          floor: String(index),
          latitude: 1.2966,
          longitude: 103.7764,
          description: 'performance fixture',
        },
      });
      const supplier = gw.expect(response, 201, 'POST /api/suppliers');
      if (!supplier.id || supplier.isActive !== true) throw new FixtureError('created supplier is missing an id or is inactive');
      owned.supplierIds.push(supplier.id);
    }).catch((error) => {
      throw new FixtureError(`supplier dataset failed: ${error.message}`);
    });
  }

  if (feedOrderCount > 0) {
    if (owned.supplierIds.length === 0) throw new FixtureError('feed errands need at least one run-owned supplier');
    log(`creating ${feedOrderCount} run-owned open errands`);
    await mapLimit(Array.from({ length: feedOrderCount }, (_, index) => index), PARALLELISM, async (index) => {
      const requester = accounts[index % accounts.length];
      const response = await gw.request('/api/orders', {
        method: 'POST',
        token: requester.token,
        body: {
          supplierId: owned.supplierIds[0],
          itemDescription: `perf-${tag} feed errand ${index}`,
          dropoffLocation: 'COM1 Basement',
          rewardCredits: 1,
          durationMinutes: 180,
        },
      });
      const order = gw.expect(response, 202, 'POST /api/orders');
      owned.feedOrderIds.push(order.id);
      await until(`feed errand ${index} OPEN`, async () => {
        const current = gw.expect(await gw.request(`/api/orders/${order.id}`, { token: requester.token }), 200, 'GET /api/orders/{id}');
        if (current.status !== 'PENDING' && current.status !== 'OPEN') throw new FixtureError(`feed errand ended as ${current.status}`);
        return { done: current.status === 'OPEN', state: current.status };
      }, { timeoutMs: openTimeoutMs });
    }).catch((error) => {
      throw new FixtureError(`feed errands failed: ${error.message}`);
    });
  }

  log('snapshotting wallets for the credit workload checks');
  await mapLimit(accounts, PARALLELISM, async (account) => {
    const wallet = gw.expect(await gw.request('/api/credits/wallet', { token: account.token }), 200, 'GET /api/credits/wallet');
    account.expectedAvailableCredits = wallet.availableCredits;
    account.expectedEscrowCredits = wallet.escrowCredits;
  });

  return {
    owned,
    fixtures: {
      tag,
      supplierId: owned.supplierIds[0] ?? null,
      campusZone,
      category,
      searchTerm: `perf-${tag}`,
      feedOrderCount,
      requiredActiveSuppliers: supplierCount,
      accountCount,
    },
    accounts: accounts.map((account) => {
      const copy = { ...account };
      delete copy.token;
      return copy;
    }),
  };
}

/**
 * Finds what the run tagged `tag` created, from its naming scheme: suppliers named "perf-<tag> stall N" and accounts
 * perf-<tag>-N@u.nus.edu. For a run whose own cleanup failed or never ran; the account passwords are gone by then.
 */
export async function findRunOwned(gw, admin, tag) {
  if (!/^[0-9a-f]{6}$/.test(String(tag))) throw new FixtureError('a run tag is six hexadecimal characters ("tag" in the run\'s fixtures.json)');
  const supplierIds = [];
  const stallPrefix = `perf-${tag} stall `;
  for (let page = 1; ; page += 1) {
    const response = await gw.request(`/api/suppliers?search=perf-${tag}&page=${page}&limit=100`, { token: await admin.token() });
    const data = gw.expect(response, 200, 'GET /api/suppliers?search');
    // The search is a substring match; only the exact fixture name pattern is run-owned.
    supplierIds.push(...data.suppliers.filter((supplier) => String(supplier.name).startsWith(stallPrefix)).map((supplier) => supplier.id));
    if (data.suppliers.length === 0 || page * 100 >= data.total) break;
  }
  const listed = gw.expect(await gw.request('/api/users', { token: await admin.token() }), 200, 'GET /api/users');
  const pattern = new RegExp(`^perf-${tag}-(\\d+)@u\\.nus\\.edu$`);
  const accounts = listed.users
    .flatMap((user) => {
      const match = pattern.exec(String(user.email));
      return match ? [{ index: Number(match[1]), userId: user.userId, email: user.email }] : [];
    })
    .sort((a, b) => a.index - b.index);
  return { accounts, owned: { supplierIds, userIds: accounts.map((account) => account.userId), feedOrderIds: [] } };
}

async function listOrdersFor(gw, admin, userId) {
  const orders = [];
  for (let page = 1; ; page += 1) {
    const response = await gw.request(`/api/orders?requesterId=${userId}&status=ALL&limit=100&page=${page}`, { token: await admin.token() });
    const data = gw.expect(response, 200, 'GET /api/orders?requesterId');
    orders.push(...data);
    if (data.length === 0 || orders.length >= (response.json.total ?? 0)) return orders;
  }
}

async function snapshot(gw, admin, accounts, sessions) {
  const perAccount = await mapLimit(accounts, PARALLELISM, async (account) => {
    const token = await sessions.get(account.userId).token();
    const [orders, walletResponse, ledgerResponse] = await Promise.all([
      listOrdersFor(gw, admin, account.userId),
      gw.request('/api/credits/wallet', { token }),
      gw.request('/api/credits/ledger', { token }),
    ]);
    return {
      account,
      orders,
      wallet: gw.expect(walletResponse, 200, 'GET /api/credits/wallet'),
      ledger: gw.expect(ledgerResponse, 200, 'GET /api/credits/ledger'),
    };
  });
  const ledger = new Map();
  for (const entry of perAccount) for (const row of entry.ledger) ledger.set(row.id, row);
  return { perAccount, orders: perAccount.flatMap((entry) => entry.orders), ledger: [...ledger.values()] };
}

function ledgerCounts(ledger) {
  const byOrder = new Map();
  for (const row of ledger) {
    if (!row.orderId) continue;
    const counts = byOrder.get(row.orderId) ?? { ESCROW_HOLD: 0, ESCROW_RELEASE: 0, ESCROW_REFUND: 0 };
    counts[row.transactionType] = (counts[row.transactionType] ?? 0) + 1;
    byOrder.set(row.orderId, counts);
  }
  return byOrder;
}

function settled(order, counts) {
  if (order.status === 'PENDING') return false;
  if (order.status === 'REJECTED') return true;
  if (counts.ESCROW_HOLD !== 1) return false;
  if (order.status === 'COMPLETED') return counts.ESCROW_RELEASE === 1;
  if (order.status === 'CANCELLED' || order.status === 'EXPIRED') return counts.ESCROW_REFUND === 1;
  return true;
}

/**
 * Waits (bounded) for the run's asynchronous credit effects to converge, then asserts the invariants over
 * run-owned accounts only. Returns { pass, checks, summary } and never throws on a violation.
 */
export async function reconcile(gw, { admin, accounts, timeoutMs, log }) {
  // Sessions, not tokens: the wait below and the cleanup after it can outlast one access token.
  const sessions = new Map(accounts.map((account) => [account.userId, gw.session(account.email, account.password)]));

  let state;
  const deadline = Date.now() + timeoutMs;
  for (;;) {
    state = await snapshot(gw, admin, accounts, sessions);
    const counts = ledgerCounts(state.ledger);
    const unsettled = state.orders.filter((order) => !settled(order, counts.get(order.id) ?? { ESCROW_HOLD: 0, ESCROW_RELEASE: 0, ESCROW_REFUND: 0 }));
    if (unsettled.length === 0) break;
    if (Date.now() >= deadline) {
      log(`reconciliation: ${unsettled.length} orders still unsettled after ${timeoutMs} ms`);
      break;
    }
    log(`reconciliation: waiting for ${unsettled.length} orders to settle`);
    await delay(2000);
  }

  const counts = ledgerCounts(state.ledger);
  const checks = [];
  const record = (id, name, violations, detail) => checks.push({ id, name, pass: violations.length === 0, detail, violations: violations.slice(0, 20) });

  record('R0', 'no run-owned order is still PENDING', state.orders.filter((order) => order.status === 'PENDING').map((order) => order.id), `${state.orders.length} orders`);

  record('R1', 'every run-owned wallet is nonnegative',
    state.perAccount.filter(({ wallet }) => wallet.availableCredits < 0 || wallet.escrowCredits < 0).map(({ account }) => `account ${account.index}`),
    `${state.perAccount.length} wallets`);

  const supply = state.perAccount.reduce((sum, { wallet }) => sum + wallet.availableCredits + wallet.escrowCredits, 0);
  const expectedSupply = WELCOME_GRANT * accounts.length;
  record('R2', 'available + escrow across run accounts equals the welcome grants (transfers stay inside the run)',
    supply === expectedSupply ? [] : [`supply ${supply} != ${expectedSupply}`], `supply=${supply}`);

  const grantViolations = state.perAccount
    .filter(({ account, ledger }) => ledger.filter((row) => row.transactionType === 'WELCOME_GRANT' && row.toUserId === account.userId).length !== 1)
    .map(({ account }) => `account ${account.index}`);
  record('R3', 'exactly one welcome grant per run account', grantViolations, '');

  const holdViolations = [];
  const terminalViolations = [];
  for (const order of state.orders) {
    const c = counts.get(order.id) ?? { ESCROW_HOLD: 0, ESCROW_RELEASE: 0, ESCROW_REFUND: 0 };
    if (order.status === 'PENDING') continue;
    const expectedHolds = order.status === 'REJECTED' ? 0 : 1;
    if (c.ESCROW_HOLD !== expectedHolds) holdViolations.push(`${order.id}: ${c.ESCROW_HOLD} holds (${order.status})`);
    const expectedRelease = order.status === 'COMPLETED' ? 1 : 0;
    const expectedRefund = order.status === 'CANCELLED' || order.status === 'EXPIRED' ? 1 : 0;
    if (c.ESCROW_RELEASE !== expectedRelease || c.ESCROW_REFUND !== expectedRefund) {
      terminalViolations.push(`${order.id}: ${order.status} has ${c.ESCROW_RELEASE} releases, ${c.ESCROW_REFUND} refunds`);
    }
  }
  record('R4', 'exactly one escrow hold per non-rejected order', holdViolations, '');
  record('R5', 'one payout per COMPLETED order, one refund per CANCELLED/EXPIRED order, none otherwise', terminalViolations, '');

  const escrowViolations = [];
  const ledgerViolations = [];
  for (const { account, orders, wallet } of state.perAccount) {
    const held = orders.filter((order) => HELD_STATUSES.has(order.status)).reduce((sum, order) => sum + order.rewardCredits, 0);
    if (wallet.escrowCredits !== held) escrowViolations.push(`account ${account.index}: escrow ${wallet.escrowCredits} != held ${held}`);
    let available = 0;
    let escrow = 0;
    for (const row of state.ledger) {
      const from = row.fromUserId === account.userId;
      const to = row.toUserId === account.userId;
      if (row.transactionType === 'WELCOME_GRANT' && to) available += row.amount;
      if (row.transactionType === 'ESCROW_HOLD' && from) { available -= row.amount; escrow += row.amount; }
      if (row.transactionType === 'ESCROW_RELEASE' && from) escrow -= row.amount;
      if (row.transactionType === 'ESCROW_RELEASE' && to) available += row.amount;
      if (row.transactionType === 'ESCROW_REFUND' && to) { escrow -= row.amount; available += row.amount; }
    }
    if (available !== wallet.availableCredits || escrow !== wallet.escrowCredits) {
      ledgerViolations.push(`account ${account.index}: ledger says available=${available} escrow=${escrow}, wallet says ${wallet.availableCredits}/${wallet.escrowCredits}`);
    }
  }
  record('R6', 'requester escrow equals the rewards of their held orders', escrowViolations, '');
  record('R7', 'ledger-derived balances agree with wallets', ledgerViolations, '');

  const byStatus = {};
  for (const order of state.orders) byStatus[order.status] = (byStatus[order.status] ?? 0) + 1;
  return {
    pass: checks.every((check) => check.pass),
    checks,
    summary: { accounts: accounts.length, orders: state.orders.length, ordersByStatus: byStatus, ledgerRows: state.ledger.length, supply },
    sessions,
  };
}

/**
 * Cancels the run's open work and deletes run-owned suppliers and accounts. Errors are reported, never thrown.
 * `admin` is the administrator's session; `sessions` (userId -> session) may come from reconcile.
 */
export async function cleanup(gw, { admin, accounts, owned, sessions, log }) {
  const report = { cancelledOrders: 0, skippedOrders: [], deletedSuppliers: 0, deletedAccounts: 0, errors: [] };
  const note = (message) => { report.errors.push(message); log(`cleanup: ${message}`); };

  try {
    await admin.token();
  } catch (error) {
    note(`admin login failed (${error.message}); run-owned data was left in place`);
    return report;
  }
  const own = new Map(sessions ?? []);
  for (const account of accounts) {
    let orders = [];
    try {
      orders = await listOrdersFor(gw, admin, account.userId);
    } catch (error) {
      note(`could not list orders for account ${account.index}: ${error.message}`);
      continue;
    }
    for (const order of orders) {
      if (TERMINAL_STATUSES.has(order.status)) continue;
      if (order.status === 'PENDING') {
        report.skippedOrders.push(`${order.id}: PENDING cannot be cancelled`);
        continue;
      }
      try {
        // The requester cancels their own OPEN or ACCEPTED errand. Everything else goes through the administrator, and
        // so does every errand of an account whose password is not known (a run found again by its tag).
        let requester = null;
        if (order.status === 'OPEN' || order.status === 'ACCEPTED') {
          if (!own.has(account.userId) && account.password) own.set(account.userId, gw.session(account.email, account.password));
          requester = own.get(account.userId) ?? null;
        }
        const response = requester
          ? await gw.request(`/api/orders/${order.id}/cancel`, { method: 'POST', token: await requester.token() })
          : await gw.request(`/api/orders/${order.id}/admin/cancel`, { method: 'POST', token: await admin.token(), body: { reason: 'performance run cleanup' } });
        if (response.status === 200) report.cancelledOrders += 1;
        else report.skippedOrders.push(`${order.id}: HTTP ${response.status} (${order.status})`);
      } catch (error) {
        note(`cancel ${order.id}: ${error.message}`);
      }
    }
  }
  for (const supplierId of owned.supplierIds) {
    try {
      const response = await gw.request(`/api/suppliers/${supplierId}?permanent=true`, { method: 'DELETE', token: await admin.token() });
      if (response.status === 200) report.deletedSuppliers += 1;
      else note(`delete supplier: HTTP ${response.status}`);
    } catch (error) {
      note(`delete supplier: ${error.message}`);
    }
  }
  for (const userId of owned.userIds) {
    try {
      const response = await gw.request(`/api/users/${userId}`, { method: 'DELETE', token: await admin.token() });
      if (response.status === 204) report.deletedAccounts += 1;
      else note(`delete account: HTTP ${response.status}`);
    } catch (error) {
      note(`delete account: ${error.message}`);
    }
  }
  return report;
}

export { GatewayError, randomUUID };
