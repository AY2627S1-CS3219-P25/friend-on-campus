/**
 * ==============================================================================
 * k6 Load Test: Distributed Order Claim Race Condition Verification
 * ==============================================================================
 * Course: NUS CS3219 Software Design and Architecture (AY26/27 S1)
 * Target: Category N3 (Testing & Reliability) + Category N4 (Cloud Scalability)
 * 
 * Purpose:
 * Demonstrates distributed ACID concurrency control and optimistic locking.
 * When multiple couriers attempt to claim/accept the exact same open errand
 * simultaneously, EXACTLY ONE request must succeed (HTTP 200), and all remaining
 * concurrent attempts must fail cleanly with HTTP 409 Conflict.
 * 
 * Execution:
 *   # Against local stack:
 *   k6 run tests/k6/order-claim-race.js
 * 
 *   # Against AWS Application Load Balancer:
 *   TARGET_HOST=http://foc-prod-alb-xxxx.ap-southeast-1.elb.amazonaws.com k6 run tests/k6/order-claim-race.js
 * ==============================================================================
 */

import http from 'k6/http';
import { check } from 'k6';
import { Counter } from 'k6/metrics';

// Custom metric counters to track single-winner guarantee
const claimSuccesses = new Counter('claim_winner_200');
const claimConflicts = new Counter('claim_conflict_409');
const claimUnexpected = new Counter('claim_unexpected_code');

export const options = {
  scenarios: {
    courier_race: {
      executor: 'per-vu-iterations',
      vus: 20,          // 20 concurrent virtual couriers
      iterations: 1,    // Each VU makes exactly 1 claim attempt at the same instant
      maxDuration: '15s',
    },
  },
  thresholds: {
    // Assert exactly 1 winner across all 20 attempts
    'claim_winner_200': ['count == 1'],
    // Assert exactly 19 couriers receive 409 Conflict
    'claim_conflict_409': ['count == 19'],
    // Zero unexpected error codes (no 500 crashes)
    'claim_unexpected_code': ['count == 0'],
  },
};

const BASE_URL = __ENV.TARGET_HOST || 'http://localhost';

// Setup phase: Authenticate courier and retrieve or create an OPEN errand
export function setup() {
  console.log(`[k6 Setup] Target Gateway: ${BASE_URL}`);

  // 1. Authenticate as Bob (Courier) to obtain JWT access token
  const loginRes = http.post(
    `${BASE_URL}/api/auth/login`,
    JSON.stringify({
      email: 'bob@u.nus.edu',
      password: 'Password123!',
    }),
    { headers: { 'Content-Type': 'application/json' } }
  );

  let token = null;
  if (loginRes.status === 200) {
    const data = JSON.parse(loginRes.body);
    token = data.data ? data.data.accessToken : data.accessToken;
  } else {
    console.warn(`[k6 Setup] Login failed (HTTP ${loginRes.status}). Using pre-seeded mock token.`);
  }

  // 2. Discover an OPEN errand created by someone other than Bob
  let orderId = '30000000-0000-4000-8000-000000000001'; // Default Alice seed order

  const listRes = http.get(`${BASE_URL}/api/orders?status=OPEN`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });

  if (listRes.status === 200) {
    try {
      const orders = JSON.parse(listRes.body);
      const openOrders = Array.isArray(orders) ? orders : (orders.data || []);
      const eligible = openOrders.find(o => o.status === 'OPEN' && o.requesterId !== '20000000-0000-4000-8000-000000000002');
      if (eligible) {
        orderId = eligible.id;
        console.log(`[k6 Setup] Found open target errand ID: ${orderId} (${eligible.orderCode || ''})`);
      }
    } catch (e) {
      console.warn('[k6 Setup] Could not parse orders list, using default seed order.');
    }
  }

  return { token, orderId };
}

export default function (data) {
  const headers = {
    'Content-Type': 'application/json',
  };

  if (data.token) {
    headers['Authorization'] = `Bearer ${data.token}`;
  }

  const payload = JSON.stringify({
    courierContactNote: `Claimed by VU ${__VU} in concurrency race test`,
  });

  // Execute simultaneous claim
  const res = http.post(`${BASE_URL}/api/orders/${data.orderId}/accept`, payload, {
    headers,
    tags: { name: 'AcceptOrderRace' },
  });

  // Record outcome based on status code
  if (res.status === 200) {
    claimSuccesses.add(1);
    console.log(`[RACE WINNER] VU ${__VU} successfully claimed errand! HTTP ${res.status}`);
  } else if (res.status === 409) {
    claimConflicts.add(1);
    console.log(`[EXPECTED CONFLICT] VU ${__VU} received 409 Conflict (Order already claimed).`);
  } else {
    claimUnexpected.add(1);
    console.warn(`[UNEXPECTED STATUS] VU ${__VU} got HTTP ${res.status}: ${res.body}`);
  }

  check(res, {
    'Status is either 200 (Winner) or 409 (Conflict)': (r) => r.status === 200 || r.status === 409,
    'No internal server crash (500)': (r) => r.status !== 500,
  });
}

export function teardown(data) {
  console.log('[k6 Teardown] Race condition verification completed.');
}
