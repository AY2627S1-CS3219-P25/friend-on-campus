/**
 * AI Assistance Disclosure:
 * Tool: Codex (model: GPT-6), date: 2026-10-03
 * Scope: Verify seed identity matching, session cleanup and repeat-safe PostgreSQL wallet initialization.
 * Author review: <to be completed by huangjiaxi1111>
 */
// AI-generated (edited by huangjiaxi1111)
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { once } from 'node:events';
import express from 'express';
import { PrismaClient } from '../src/database/client';
import { seedCreditWallets } from '../src/database/seed';
import { createCreditService } from '../src/credits/service';
import { createCreditStore } from '../src/credits/store';

async function main() {
  const url = process.env.CREDIT_TEST_DATABASE_URL;
  if (!url || !new URL(url).pathname.includes('_test')) {
    throw new Error('CREDIT_TEST_DATABASE_URL must name a dedicated _test database');
  }
  const db = new PrismaClient({ datasources: { db: { url } } });
  const credits = createCreditService(createCreditStore(db));
  const emails = ['alice@u.nus.edu', 'bob@u.nus.edu', 'admin@nus.edu.sg'];
  const userIds = emails.map(() => randomUUID());
  const orderIds = [randomUUID(), randomUUID()];
  const sessions = new Set<string>();
  let fault: 'none' | 'disabled' | 'wrong-email' | 'invalid-id' | 'logout' = 'none';
  let logouts = 0;

  // HTTP fixture follows the existing User Service login/logout contract.
  const app = express();
  app.use(express.json());
  app.post('/api/auth/login', (req, res) => {
    const index = emails.indexOf(req.body.email);
    if (index < 0 || req.body.password !== 'Password123!' || req.body.keepLoggedIn !== false) {
      res.status(401).json({ success: false });
      return;
    }
    if (fault === 'disabled' && index === 2) {
      res.status(403).json({ success: false, code: 'ACCOUNT_DISABLED' });
      return;
    }
    const cookie = `refresh_token=${randomUUID()}`;
    sessions.add(cookie);
    res.setHeader('Set-Cookie', `${cookie}; Path=/api/auth; HttpOnly; SameSite=Lax`);
    res.json({ success: true, data: {
      accessToken: 'unused-by-seed', accessTokenExpiresInSeconds: 900,
      user: {
        userId: fault === 'invalid-id' && index === 2 ? 'not-a-uuid' : userIds[index],
        email: fault === 'wrong-email' && index === 2 ? 'someone-else@u.nus.edu' : emails[index].toUpperCase(),
        username: ['alice', 'bob', 'admin'][index], userRole: index === 2 ? 'ADMIN' : 'STUDENT', status: true,
      },
    } });
  });
  app.post('/api/auth/logout', (req, res) => {
    if (fault === 'logout') { res.sendStatus(503); return; }
    if (!sessions.delete(req.headers.cookie ?? '')) { res.sendStatus(401); return; }
    logouts++;
    res.sendStatus(204);
  });
  const server = app.listen(0, '127.0.0.1');
  try {
    await once(server, 'listening');
    const address = server.address();
    assert(address && typeof address !== 'string');
    const base = `http://127.0.0.1:${address.port}`;

    for (const failure of ['disabled', 'wrong-email', 'invalid-id'] as const) {
      fault = failure;
      await assert.rejects(seedCreditWallets(credits, base));
      assert.equal(await db.creditWallet.count({ where: { userId: { in: userIds } } }), 0);
      assert.equal(sessions.size, 0, 'identity failures still close all successful logins');
    }
    fault = 'logout';
    await assert.rejects(seedCreditWallets(credits, base), /Cannot close seed session/);
    assert.equal(await db.creditWallet.count({ where: { userId: { in: userIds } } }), 0);
    sessions.clear();
    fault = 'none';

    const wallets = await seedCreditWallets(credits, base);
    assert.deepEqual(wallets.map(wallet => wallet.userId), userIds);
    for (const wallet of wallets) {
      assert.equal(wallet.availableCredits, 100);
      assert.equal(wallet.escrowCredits, 0);
      assert.equal(wallet.totalEarnedCredits, 0);
      assert.equal((await credits.getLedger(wallet.userId))[0].transactionType, 'WELCOME_GRANT');
      assert.equal((await db.creditGrant.findUniqueOrThrow({ where: { userId: wallet.userId } })).amount, 100);
    }

    // Existing activity must survive both ordinary and concurrent seed reruns.
    await credits.reserve({ orderId: orderIds[0], requesterId: userIds[0], amount: 20 });
    await credits.settle({ orderId: orderIds[0], requesterId: userIds[0], courierId: userIds[1], amount: 20 });
    await credits.reserve({ orderId: orderIds[1], requesterId: userIds[0], amount: 15 });
    const before = await Promise.all(userIds.map(userId => credits.getWallet(userId)));
    const ledgerBefore = await Promise.all(userIds.map(userId => credits.getLedger(userId)));
    await Promise.all([seedCreditWallets(credits, base), seedCreditWallets(credits, base)]);
    assert.deepEqual(await Promise.all(userIds.map(userId => credits.getWallet(userId))), before);
    assert.deepEqual(await Promise.all(userIds.map(userId => credits.getLedger(userId))), ledgerBefore);
    assert.equal(await db.creditGrant.count({ where: { userId: { in: userIds } } }), 3);
    assert.equal(await db.creditTransaction.count({ where: {
      toUserId: { in: userIds }, transactionType: 'WELCOME_GRANT',
    } }), 3);
    assert.equal(sessions.size, 0);
    assert.equal(logouts, 17);
    console.log('PASS: real UUID matching, three 100-credit wallets, one grant each, preserved spent/earned/escrow balances and ledger on concurrent reruns, identity failure before writes and session cleanup');
  } finally {
    await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
    try {
      await db.creditEscrow.deleteMany({ where: { orderId: { in: orderIds } } });
      await db.creditTransaction.deleteMany({ where: { OR: [
        { fromUserId: { in: userIds } }, { toUserId: { in: userIds } },
      ] } });
      await db.creditGrant.deleteMany({ where: { userId: { in: userIds } } });
      await db.creditWallet.deleteMany({ where: { userId: { in: userIds } } });
    } finally { await db.$disconnect(); }
  }
}

void main().catch(error => {
  console.error(error instanceof Error ? error.message : 'Credit seed integration test failed');
  process.exitCode = 1;
});
