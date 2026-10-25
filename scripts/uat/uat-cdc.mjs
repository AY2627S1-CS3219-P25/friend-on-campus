// AI Assistance Disclosure:
// Tool: Codex (model: GPT-6), date: 2026-10-21
// Scope: Added gateway acceptance coverage of real User, Order and Credit Debezium delivery through registration, reservation and cancellation.
// Author review: <to be completed by huangjiaxi1111>
// AI-generated (edited by huangjiaxi1111)
// Run against the seeded Compose stack: node scripts/uat/uat-cdc.mjs
// Uses HTTP only: no direct database writes or synthetic RabbitMQ events.
// The isolated full-suite harness removes its own test volume and fixture data.
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';
import { fileURLToPath } from 'node:url';

const BASE_URL = (process.env.BASE_URL ?? process.env.GW ?? 'http://localhost').replace(/\/$/, '');
const timeoutMs = Number(process.env.CDC_TIMEOUT_MS ?? 60_000);
const rewardCredits = 15;
const initialGrant = 100;
const results = [];
let currentCheck = { id: 'C0', name: 'CDC acceptance configuration is valid' };
let token;
let userId;
let orderId;
let cancelled = false;

function record(pass, detail) {
  results.push({ ...currentCheck, pass, detail });
  console.log(`${pass ? 'PASS' : 'FAIL'}  ${currentCheck.id.padEnd(4)} ${currentCheck.name}${detail ? `  -> ${detail}` : ''}`);
}

async function check(id, name, operation) {
  currentCheck = { id, name };
  const detail = await operation();
  record(true, detail);
}

async function call(route, { method = 'GET', body, authenticated = true } = {}) {
  const headers = {};
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (authenticated && token) headers.Authorization = `Bearer ${token}`;
  let response;
  try {
    response = await fetch(`${BASE_URL}${route}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: AbortSignal.timeout(5000),
      redirect: 'manual',
    });
  } catch {
    // Omit request/response bodies and tokens from errors and result artifacts.
    throw new Error(`${method} ${route}: gateway request failed or timed out`);
  }
  let json;
  try { json = await response.json(); } catch { /* handled by response assertions */ }
  return { status: response.status, json };
}

function expectResponse(response, status, route) {
  assert.equal(response.status, status, `${route}: expected HTTP ${status}, received HTTP ${response.status}`);
  assert.equal(response.json?.success, true, `${route}: response did not indicate success`);
  assert.ok(response.json?.data, `${route}: response is missing data`);
  return response.json.data;
}

async function until(name, probe) {
  const deadline = Date.now() + timeoutMs;
  let lastState = 'not observed';
  do {
    const result = await probe();
    lastState = result.state;
    if (result.done) return result.value;
    if (Date.now() < deadline) await delay(250);
  } while (Date.now() < deadline);
  throw new Error(`${name}: timed out after ${timeoutMs} ms; last state: ${lastState}`);
}

async function waitForWallet(availableCredits, escrowCredits) {
  return until('Credit wallet CDC update', async () => {
    const response = await call('/api/credits/wallet');
    if (response.status === 404) return { done: false, state: 'HTTP 404 (wallet not initialized)' };
    const wallet = expectResponse(response, 200, 'GET /api/credits/wallet');
    assert.equal(wallet.userId, userId, 'Wallet belongs to a different user');
    return {
      done: wallet.availableCredits === availableCredits && wallet.escrowCredits === escrowCredits,
      value: wallet,
      state: `available=${wallet.availableCredits}, escrow=${wallet.escrowCredits}`,
    };
  });
}

async function ledger() {
  const response = await call('/api/credits/ledger');
  const rows = expectResponse(response, 200, 'GET /api/credits/ledger');
  assert.ok(Array.isArray(rows), 'Credit ledger is not an array');
  return rows;
}

function assertLedger(rows, refunded) {
  const grants = rows.filter(row => row.transactionType === 'WELCOME_GRANT');
  const holds = rows.filter(row => row.transactionType === 'ESCROW_HOLD' && row.orderId === orderId);
  const refunds = rows.filter(row => row.transactionType === 'ESCROW_REFUND' && row.orderId === orderId);
  assert.equal(grants.length, 1, 'Expected exactly one welcome grant');
  assert.equal(grants[0].amount, initialGrant, 'Welcome grant amount differs');
  assert.equal(grants[0].toUserId, userId, 'Welcome grant recipient differs');
  assert.equal(holds.length, 1, 'Expected exactly one escrow hold for the new order');
  assert.equal(holds[0].amount, rewardCredits, 'Escrow hold amount differs');
  assert.equal(holds[0].fromUserId, userId, 'Escrow hold sender differs');
  assert.equal(refunds.length, refunded ? 1 : 0, 'Escrow refund count differs');
  if (refunded) {
    assert.equal(refunds[0].amount, rewardCredits, 'Escrow refund amount differs');
    assert.equal(refunds[0].toUserId, userId, 'Escrow refund recipient differs');
  }
  assert.equal(rows.length, refunded ? 3 : 2, 'Fresh account has unexpected additional ledger entries');
}

try {
  assert.ok(Number.isInteger(timeoutMs) && timeoutMs >= 1000 && timeoutMs <= 300_000,
    'CDC_TIMEOUT_MS must be an integer between 1000 and 300000');
  const fixture = randomUUID().replaceAll('-', '');
  const account = {
    username: `cdc_${fixture}`,
    email: `cdc_${fixture}@u.nus.edu`,
    password: `Cdc!${randomUUID().replaceAll('-', '').slice(0, 16)}`,
  };

  await check('C1', 'registration commits a new student account', async () => {
    const response = await call('/api/auth/register', { method: 'POST', body: account, authenticated: false });
    const data = expectResponse(response, 201, 'POST /api/auth/register');
    assert.ok(data.user?.userId, 'Registration response has no user ID');
    assert.equal(data.user.userRole, 'STUDENT', 'Registered account is not a student');
    userId = data.user.userId;
    return 'HTTP 201';
  });

  await check('C2', 'new student can log in through the gateway', async () => {
    const response = await call('/api/auth/login', {
      method: 'POST', body: { email: account.email, password: account.password }, authenticated: false,
    });
    const data = expectResponse(response, 200, 'POST /api/auth/login');
    assert.equal(data.user?.userId, userId, 'Login returned a different account');
    assert.equal(typeof data.accessToken, 'string', 'Login returned no access token');
    assert.ok(data.accessToken.length > 0, 'Login returned an empty access token');
    token = data.accessToken;
    return 'HTTP 200';
  });

  await check('C3', 'User CDC initializes the wallet and one welcome grant', async () => {
    await waitForWallet(initialGrant, 0);
    const rows = await ledger();
    assert.equal(rows.length, 1, 'Fresh account must have exactly one ledger entry');
    assert.equal(rows[0].transactionType, 'WELCOME_GRANT', 'Missing welcome grant');
    assert.equal(rows[0].amount, initialGrant, 'Welcome grant amount differs');
    assert.equal(rows[0].toUserId, userId, 'Welcome grant recipient differs');
    return 'available=100, escrow=0, welcome grants=1';
  });

  await check('C4', 'order submission returns HTTP 202 and PENDING', async () => {
    const response = await call('/api/suppliers?isActive=true');
    const data = expectResponse(response, 200, 'GET /api/suppliers?isActive=true');
    const suppliers = Array.isArray(data) ? data : data.suppliers;
    assert.ok(Array.isArray(suppliers), 'Supplier list is missing');
    const supplier = suppliers.find(item => item.isActive === true);
    assert.ok(supplier?.id, 'A seeded active supplier is required');
    const created = await call('/api/orders', {
      method: 'POST',
      body: {
        supplierId: supplier.id,
        itemDescription: `CDC acceptance fixture ${fixture}`,
        dropoffLocation: 'COM3 entrance',
        rewardCredits,
        durationMinutes: 30,
      },
    });
    const order = expectResponse(created, 202, 'POST /api/orders');
    assert.ok(order.id, 'Order response has no order ID');
    orderId = order.id;
    assert.equal(order.requesterId, userId, 'Order requester differs');
    assert.equal(order.status, 'PENDING', 'New order must await asynchronous reservation');
    return 'HTTP 202, status=PENDING';
  });

  await check('C5', 'Order and Credit CDC open the order after reserving credits', async () => {
    await until('PENDING to OPEN through Order and Credit CDC', async () => {
      const response = await call(`/api/orders/${orderId}`);
      const order = expectResponse(response, 200, 'GET /api/orders/:id');
      assert.ok(['PENDING', 'OPEN'].includes(order.status), `Reservation ended unexpectedly: ${order.status}`);
      return { done: order.status === 'OPEN', state: order.status, value: order };
    });
    await waitForWallet(initialGrant - rewardCredits, rewardCredits);
    assertLedger(await ledger(), false);
    return 'status=OPEN, available=85, escrow=15, holds=1';
  });

  await check('C6', 'requester cancels the fixture order', async () => {
    const response = await call(`/api/orders/${orderId}/cancel`, { method: 'POST' });
    const order = expectResponse(response, 200, 'POST /api/orders/:id/cancel');
    assert.equal(order.status, 'CANCELLED', 'Cancellation did not persist CANCELLED status');
    cancelled = true;
    return 'HTTP 200, status=CANCELLED';
  });

  await check('C7', 'Order CDC refunds escrow with one grant, hold and refund', async () => {
    await waitForWallet(initialGrant, 0);
    assertLedger(await ledger(), true);
    return 'available=100, escrow=0, welcome grants=1, holds=1, refunds=1';
  });
} catch (error) {
  record(false, error instanceof Error ? error.message : 'Unexpected CDC acceptance failure');
} finally {
  // Only cancel the order created by this run; retain data for isolated-harness teardown.
  if (orderId && token && !cancelled) {
    try {
      const response = await call(`/api/orders/${orderId}/cancel`, { method: 'POST' });
      console.log(`Fixture cleanup: cancellation returned HTTP ${response.status}`);
    } catch {
      console.log('Fixture cleanup: cancellation unavailable; isolated test-stack teardown removes the fixture');
    }
  }
  const out = process.env.UAT_OUT ?? path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../test-results/uat-cdc-results.json');
  mkdirSync(path.dirname(out), { recursive: true });
  writeFileSync(out, JSON.stringify(results, null, 2));
  const passed = results.filter(result => result.pass).length;
  console.log(`\n${passed}/${results.length} CDC checks passed; results written to ${out}`);
  process.exitCode = results.some(result => !result.pass) ? 1 : 0;
}
