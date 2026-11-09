/**
 * AI Assistance Disclosure:
 * Tool: Claude Code (model: Claude Fable 5.1), date: 2026-11-08
 * Scope: Repaired for issue #236 (T4a.10): credentials come from environment variables instead of seeded
 *        accounts, the target errand is a run-owned order (RACE_ORDER_ID, or one created as the configured
 *        requester) and never an arbitrary open errand from the shared feed, and a failed login, missing token
 *        or an order that never becomes OPEN aborts the run instead of continuing.
 * Author review: <to be completed by Reallyeasy1>
 *
 * Earlier version: hand-written 20-VU race using the seeded bob/alice accounts and the first open errand found.
 *
 * Scope note: this script reuses one courier token for all 20 attempts, so it demonstrates the single-winner
 * update under identical concurrent requests, not twenty distinct eligible couriers with a shared dispatch
 * barrier. The issue #64 C20 harness is the authoritative evidence for that. Run only against an isolated stack.
 *
 *   RACE_COURIER_EMAIL=... RACE_COURIER_PASSWORD=... RACE_REQUESTER_EMAIL=... RACE_REQUESTER_PASSWORD=... \
 *   RACE_SUPPLIER_ID=<active supplier uuid> TARGET_HOST=http://127.0.0.1 k6 run tests/k6/order-claim-race.js
 *   # or, with an OPEN order you created for this run: RACE_ORDER_ID=<uuid> plus the courier credentials.
 */
// AI-generated (edited by Reallyeasy1)
import http from 'k6/http';
import { check, sleep } from 'k6';
import exec from 'k6/execution';
import { Counter } from 'k6/metrics';

const claimSuccesses = new Counter('claim_winner_200');
const claimConflicts = new Counter('claim_conflict_409');
const claimUnexpected = new Counter('claim_unexpected_code');

export const options = {
  scenarios: {
    courier_race: {
      executor: 'per-vu-iterations',
      vus: 20,
      iterations: 1,
      maxDuration: '15s',
    },
  },
  thresholds: {
    claim_winner_200: ['count==1'],
    claim_conflict_409: ['count==19'],
    claim_unexpected_code: ['count==0'],
  },
  systemTags: ['proto', 'status', 'method', 'name', 'scenario', 'expected_response'],
  setupTimeout: '90s',
};

const BASE_URL = (__ENV.TARGET_HOST || __ENV.BASE_URL || 'http://localhost').replace(/\/$/, '');

function required(name) {
  const value = __ENV[name];
  if (!value) exec.test.abort(`${name} is required (credentials are injected through the environment, never stored in the script)`);
  return value;
}

function login(email, password, label) {
  const res = http.post(`${BASE_URL}/api/auth/login`, JSON.stringify({ email, password }), {
    headers: { 'Content-Type': 'application/json' },
    tags: { name: '/api/auth/login' },
  });
  let token = null;
  try {
    token = JSON.parse(res.body).data.accessToken;
  } catch {
    token = null;
  }
  if (res.status !== 200 || typeof token !== 'string' || token.length === 0) {
    exec.test.abort(`${label} login failed (HTTP ${res.status}); refusing to run the race without a valid token`);
  }
  return token;
}

export function setup() {
  console.log(`[setup] target gateway ${BASE_URL}`);
  const courierToken = login(required('RACE_COURIER_EMAIL'), required('RACE_COURIER_PASSWORD'), 'courier');

  let orderId = __ENV.RACE_ORDER_ID || null;
  let requesterToken = null;
  if (!orderId) {
    requesterToken = login(required('RACE_REQUESTER_EMAIL'), required('RACE_REQUESTER_PASSWORD'), 'requester');
    const createRes = http.post(
      `${BASE_URL}/api/orders`,
      JSON.stringify({
        supplierId: required('RACE_SUPPLIER_ID'),
        itemDescription: `claim race fixture ${Date.now()}`,
        dropoffLocation: 'COM1 Basement',
        rewardCredits: 1,
        durationMinutes: 30,
      }),
      { headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${requesterToken}` }, tags: { name: '/api/orders' } },
    );
    if (createRes.status !== 202) exec.test.abort(`fixture order creation failed (HTTP ${createRes.status})`);
    orderId = JSON.parse(createRes.body).data.id;
  }

  const viewerToken = requesterToken || courierToken;
  let status = 'UNKNOWN';
  for (let i = 0; i < 60; i += 1) {
    const res = http.get(`${BASE_URL}/api/orders/${orderId}`, {
      headers: { Authorization: `Bearer ${viewerToken}` },
      tags: { name: '/api/orders/{id}' },
    });
    if (res.status === 200) status = JSON.parse(res.body).data.status;
    if (status === 'OPEN') break;
    if (status !== 'PENDING' && status !== 'UNKNOWN') break;
    sleep(1);
  }
  if (status !== 'OPEN') exec.test.abort(`fixture order is ${status}, not OPEN; the race needs a run-owned OPEN errand`);
  console.log('[setup] run-owned errand is OPEN; releasing 20 concurrent claims');
  return { token: courierToken, orderId };
}

export default function (data) {
  const res = http.post(
    `${BASE_URL}/api/orders/${data.orderId}/accept`,
    JSON.stringify({ courierContactNote: `claim race VU ${__VU}` }),
    { headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${data.token}` }, tags: { name: '/api/orders/{id}/accept' } },
  );

  if (res.status === 200) claimSuccesses.add(1);
  else if (res.status === 409) claimConflicts.add(1);
  else claimUnexpected.add(1);

  check(res, {
    'status is 200 (winner) or 409 (conflict)': (r) => r.status === 200 || r.status === 409,
    'no server error': (r) => r.status < 500,
  });
}

export function teardown() {
  console.log('[teardown] claim race finished; cancel the fixture errand with the requester account if it is still open');
}
