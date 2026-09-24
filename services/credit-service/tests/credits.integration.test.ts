/**
 * AI Assistance Disclosure:
 * Tool: Codex (model: GPT-6), date: 2026-09-24
 * Scope: Tested JWT authentication and wallet ownership alongside HTTP and PostgreSQL regressions.
 * Author review: <to be completed by huangjiaxi1111>
 */
// AI-generated (edited by huangjiaxi1111)
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { once } from 'node:events';
import { createApp } from '../src/app';
import { PrismaClient } from '../src/database/client';
import { createCreditService } from '../src/credits/service';
import { createCreditStore, type CreditStore } from '../src/credits/store';
import { createTestAuth } from './auth-fixture';

async function main() {
  const url = process.env.CREDIT_TEST_DATABASE_URL;
  if (!url || !new URL(url).pathname.includes('_test')) {
    throw new Error('Set CREDIT_TEST_DATABASE_URL to a dedicated database with _test in its name');
  }
  const db = new PrismaClient({ datasources: { db: { url } } });
  const store = createCreditStore(db);
  const credits = createCreditService(store);
  const users = Array.from({ length: 8 }, () => randomUUID());
  const [requesterId, courierId, raceUser, newRaceUser, rollbackUser, rollbackCourier, sharedCourier, unknownUser] = users;
  const orderId = randomUUID();
  const auth = createTestAuth();
  const server = createApp({ credits, authenticate: auth.authenticate, port: 0 }).listen(0, '127.0.0.1');
  try {
    await once(server, 'listening');
    const address = server.address();
    assert(address && typeof address !== 'string');
    const base = `http://127.0.0.1:${address.port}`;
    async function request(path: string, body?: unknown, userId?: string) {
      const response = await fetch(`${base}${path}`, {
        method: body === undefined ? 'GET' : 'POST',
        headers: { 'content-type': 'application/json', ...(userId ? { authorization: `Bearer ${auth.token(userId)}` } : {}) },
        ...(body === undefined ? {} : { body: JSON.stringify(body) }),
      });
      return { status: response.status, body: await response.json() as any };
    }
    assert.equal((await request('/health')).status, 200);
    assert.equal((await request('/ready')).status, 503);
    const invalidTokens: Array<[string | undefined, string]> = [
      [undefined, 'MISSING_TOKEN'],
      ['Basic ignored', 'MISSING_TOKEN'],
      ['Bearer malformed', 'INVALID_TOKEN'],
      [`Bearer ${auth.token(unknownUser, { exp: 1 })}`, 'TOKEN_EXPIRED'],
      [`Bearer ${auth.token(unknownUser, { iss: 'wrong-issuer' })}`, 'INVALID_TOKEN'],
      [`Bearer ${auth.token(unknownUser, { aud: 'wrong-audience' })}`, 'INVALID_TOKEN'],
      [`Bearer ${auth.token(unknownUser, { sid: null })}`, 'INVALID_TOKEN'],
      [`Bearer ${auth.token(unknownUser, { role: 'UNKNOWN' })}`, 'INVALID_TOKEN'],
      [`Bearer ${auth.token(unknownUser, { iat: Math.floor(Date.now() / 1000) + 3600 })}`, 'INVALID_TOKEN'],
      [`Bearer ${createTestAuth().token(unknownUser)}`, 'INVALID_TOKEN'],
    ];
    for (const endpoint of ['wallet', 'ledger']) {
      for (const [authorization, code] of invalidTokens) {
        const response = await fetch(`${base}/api/credits/${endpoint}?userId=${unknownUser}`, {
          headers: { 'x-user-id': unknownUser, ...(authorization ? { authorization } : {}) },
        });
        assert.equal(response.status, 401, `${endpoint}: ${code}`);
        const body = await response.json() as any;
        assert.equal(body.success, false);
        assert.equal(body.code, code);
      }
    }
    assert.equal(await db.creditWallet.count({ where: { userId: unknownUser } }), 0);
    assert.equal(await db.creditGrant.count({ where: { userId: unknownUser } }), 0);
    assert.equal((await request('/api/credits/wallet', undefined, 'u1111111-1111-1111-1111-111111111111')).status, 400);
    const wallet = await request('/api/credits/wallet', undefined, requesterId);
    assert.equal(wallet.status, 200);
    assert.equal(wallet.body.data.availableCredits, 100);
    assert.equal(typeof wallet.body.data.updatedAt, 'string');
    assert.equal((await request('/api/credits/ledger', undefined, requesterId)).body.data[0].transactionType, 'WELCOME_GRANT');
    for (const role of ['STUDENT', 'ADMIN']) {
      for (const endpoint of ['wallet', 'ledger']) {
        const response = await fetch(`${base}/api/credits/${endpoint}?userId=${unknownUser}`, {
          headers: { authorization: `Bearer ${auth.token(requesterId, { role })}`, 'x-user-id': unknownUser },
        });
        assert.equal(response.status, 200);
        const body = await response.json() as any;
        if (endpoint === 'wallet') assert.equal(body.data.userId, requesterId);
        else assert.equal(body.data[0].toUserId, requesterId);
      }
    }
    assert.equal(await db.creditWallet.count({ where: { userId: unknownUser } }), 0);
    console.log('PASS: JWT validation, authenticated wallet/ledger ownership, spoofed identity rejection and public health endpoints');

    for (const amount of [0, -1, 1.5, '10', null, 2147483648]) {
      assert.equal((await request('/api/credits/escrow/reserve', { requesterId, orderId, amount })).status, 400);
    }
    for (const body of [{}, { requesterId, orderId: 'ord-1001', amount: 10 }]) {
      assert.equal((await request('/api/credits/escrow/reserve', body)).status, 400);
    }
    const malformed = await fetch(`${base}/api/credits/escrow/reserve`, {
      method: 'POST', headers: { 'content-type': 'application/json' }, body: '{',
    });
    assert.equal(malformed.status, 400);
    assert.equal((await malformed.json() as any).success, false);

    const reserve = await request('/api/credits/escrow/reserve', { requesterId, orderId, amount: 25 });
    assert.equal(reserve.status, 200);
    assert.equal(reserve.body.data.availableCredits, 75);
    assert.equal(reserve.body.data.escrowCredits, 25);
    const settle = await request('/api/credits/escrow/settle', { requesterId, courierId, orderId, amount: 25 });
    assert.equal(settle.status, 200);
    assert.equal(settle.body.data.requesterWallet.escrowCredits, 0);
    assert.equal(settle.body.data.courierWallet.availableCredits, 125);
    assert.equal(settle.body.data.courierWallet.totalEarnedCredits, 25);
    const refundOrder = randomUUID();
    await credits.reserve({ requesterId, orderId: refundOrder, amount: 15 });
    const refund = await request('/api/credits/escrow/refund', { requesterId, orderId: refundOrder, amount: 15 });
    assert.equal(refund.status, 200);
    assert.equal(refund.body.data.availableCredits, 75);
    assert.equal(refund.body.data.escrowCredits, 0);
    assert.equal((await request('/api/credits/escrow/reserve', { requesterId, orderId: randomUUID(), amount: 1000 })).status, 400);
    for (const operation of ['reserve', 'settle', 'refund']) {
      assert.equal((await request(`/api/credits/escrow/${operation}`, { requesterId, courierId, orderId, amount: 1000 })).status, 409);
    }
    const replay = await request('/api/credits/escrow/reserve', { requesterId, orderId, amount: 25 });
    assert.equal(replay.status, 200);
    assert.equal(replay.body.data.escrowCredits, 0);
    assert.equal((await request('/api/credits/escrow/refund', { requesterId, orderId, amount: 25 })).status, 409);
    assert.equal((await request('/api/credits/escrow/settle', { requesterId, courierId, orderId: refundOrder, amount: 15 })).status, 409);
    for (const operation of ['settle', 'refund']) {
      assert.equal((await request(`/api/credits/escrow/${operation}`, { requesterId: unknownUser, courierId, orderId, amount: 1 })).status, 409);
    }
    assert.equal(await db.creditWallet.count({ where: { userId: unknownUser } }), 0);
    const ledger = (await request('/api/credits/ledger', undefined, requesterId)).body.data;
    assert.deepEqual(ledger.map((t: any) => t.transactionType), ['ESCROW_REFUND', 'ESCROW_HOLD', 'ESCROW_RELEASE', 'ESCROW_HOLD', 'WELCOME_GRANT']);
    assert.equal(new Set(ledger.map((t: any) => t.transactionCode)).size, 5);
    assert(ledger.every((t: any) => t.transactionCode.length <= 30 && /^[0-9a-f-]{36}$/.test(t.id)));
    assert.equal((await request('/api/credits/ledger', undefined, courierId)).body.data.length, 2);
    assert.deepEqual((await request('/api/credits/ledger', undefined, unknownUser)).body.data, []);

    // A separately constructed client sees committed data; no module memory is involved.
    const secondClient = new PrismaClient({ datasources: { db: { url } } });
    try {
      const reloaded = await createCreditService(createCreditStore(secondClient)).getWallet(requesterId);
      assert.equal(reloaded.availableCredits, 75);
      assert.equal(reloaded.escrowCredits, 0);
    } finally { await secondClient.$disconnect(); }

    const firstReads = await Promise.all(Array.from({ length: 6 }, () => credits.getWallet(newRaceUser)));
    assert(firstReads.every(w => w.availableCredits === 100));
    assert.equal(await db.creditWallet.count({ where: { userId: newRaceUser } }), 1);
    const raceOrders = Array.from({ length: 6 }, () => randomUUID());
    const racing = await Promise.all(raceOrders.map(orderId => request('/api/credits/escrow/reserve', {
      requesterId: raceUser, orderId, amount: 30,
    })));
    assert.equal(racing.filter(r => r.status === 200).length, 3);
    assert.equal(racing.filter(r => r.status === 400).length, 3);
    assert.equal((await credits.getWallet(raceUser)).availableCredits, 10);
    assert.equal((await credits.getWallet(raceUser)).escrowCredits, 90);
    assert.equal((await credits.getLedger(raceUser)).length, 4);
    const payouts = await Promise.all(raceOrders.map(orderId => request('/api/credits/escrow/settle', {
      requesterId: raceUser, courierId: sharedCourier, orderId, amount: 30,
    })));
    assert.equal(payouts.filter(r => r.status === 200).length, 3);
    assert.equal(payouts.filter(r => r.status === 409).length, 3);
    assert.equal((await credits.getWallet(sharedCourier)).availableCredits, 190);
    assert.equal((await credits.getWallet(sharedCourier)).totalEarnedCredits, 90);
    assert.equal((await credits.getWallet(raceUser)).escrowCredits, 0);

    // Force a real PostgreSQL unique-constraint failure after balances were changed.
    const failingStore: CreditStore = {
      ...store,
      transaction: operation => store.transaction(tx => operation({
        ...tx,
        addTransaction: data => tx.addTransaction({ ...data, transactionCode: ledger[0].transactionCode }),
      })),
    };
    const failing = createCreditService(failingStore);
    const rollbackOrder = randomUUID();
    await assert.rejects(failing.reserve({ requesterId: rollbackUser, orderId: rollbackOrder, amount: 10 }));
    assert.equal(await db.creditWallet.count({ where: { userId: rollbackUser } }), 0);
    await credits.reserve({ requesterId: rollbackUser, orderId: rollbackOrder, amount: 50 });
    const before = await credits.getWallet(rollbackUser);
    await assert.rejects(failing.settle({ requesterId: rollbackUser, courierId: rollbackCourier, orderId: rollbackOrder, amount: 50 }));
    assert.deepEqual(await credits.getWallet(rollbackUser), before);
    assert.equal(await db.creditWallet.count({ where: { userId: rollbackCourier } }), 0);
    await assert.rejects(failing.refund({ requesterId: rollbackUser, orderId: rollbackOrder, amount: 50 }));
    assert.deepEqual(await credits.getWallet(rollbackUser), before);
    assert.equal((await credits.getLedger(rollbackUser)).length, 2);
    console.log('PASS: HTTP lifecycle, validation, persistence, concurrent creation/reserve/settle, and database-failure rollback');
  } finally {
    if (server.listening) await new Promise<void>((resolve, reject) => server.close(e => e ? reject(e) : resolve()));
    try {
      await db.creditTransaction.deleteMany({ where: { OR: [{ fromUserId: { in: users } }, { toUserId: { in: users } }] } });
      await db.creditEscrow.deleteMany({ where: { requesterId: { in: users } } });
      await db.creditGrant.deleteMany({ where: { userId: { in: users } } });
      await db.creditWallet.deleteMany({ where: { userId: { in: users } } });
    } finally { await db.$disconnect(); }
  }
}

void main().catch(error => { console.error(error); process.exitCode = 1; });
