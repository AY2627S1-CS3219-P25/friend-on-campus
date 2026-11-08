/**
 * AI Assistance Disclosure:
 * Tool: Claude Code (model: Claude Fable 5.1), date: 2026-11-08
 * Scope: New order lifecycle write workload for issue #236 (#36 Order N2.2): each VU owns a requester/courier
 *        pair and drives create -> (PENDING -> OPEN, polled) -> accept -> pickup -> deliver -> complete; every
 *        write is measured separately, the HTTP 202 latency is kept apart from the PENDING -> OPEN duration,
 *        and polling is excluded from the measured populations.
 * Author review: <to be completed by Reallyeasy1>
 *
 *   npm run perf:k6 -- --target http://127.0.0.1 --profile load --workload lifecycle
 *
 * Roles alternate each iteration so one credit flows back and forth inside the pair and no wallet runs dry.
 * Expected 409 conflicts belong to the claim-race population only; here any non-2xx is a failure.
 */
// AI-generated (edited by Reallyeasy1)
import { sleep } from 'k6';
import { Counter, Trend } from 'k6/metrics';
import {
  FIXTURES,
  Session,
  accountFor,
  assertAccounts,
  baseOptions,
  buildScenario,
  envelope,
  measured,
  measurementTags,
  operationThresholds,
  scenarioMaxVus,
  summaryHandler,
} from './lib/perf.js';

const scenario = buildScenario('lifecycle', 50);
const maxVus = scenarioMaxVus(scenario);
const OPEN_TIMEOUT_MS = Math.min(Number(__ENV.PERF_OPEN_TIMEOUT_MS) || 30000, 120000);

export const options = baseOptions({ order_lifecycle: scenario }, operationThresholds('lifecycle', maxVus));

const pendingToOpen = new Trend('order_pending_to_open_ms', true);
const incomplete = new Counter('lifecycle_incomplete');

export function setup() {
  assertAccounts(maxVus * 2);
  console.log(`[setup] lifecycle workload, ${maxVus} max VUs, two run-owned accounts per VU, OPEN timeout ${OPEN_TIMEOUT_MS} ms`);
}

let pair;

function expectOrder(status, expectedStatus, extra) {
  return (res, json) => {
    const shape = envelope(res, json, status);
    if (shape !== true) return shape;
    if (json.data.status !== expectedStatus) return `order status ${json.data.status} (expected ${expectedStatus})`;
    if (extra) return extra(json.data);
    return true;
  };
}

export function lifecycle() {
  pair = pair || [new Session(accountFor(2, 0)), new Session(accountFor(2, 1))];
  const requester = pair[__ITER % 2];
  const courier = pair[(__ITER + 1) % 2];
  const creationTags = measurementTags('order_pending_to_open');

  const created = measured(requester, 'order_create', {
    method: 'POST',
    path: '/api/orders',
    template: '/api/orders',
    body: {
      supplierId: FIXTURES.supplierId,
      itemDescription: `${FIXTURES.searchTerm} lifecycle`,
      dropoffLocation: 'COM1 Basement',
      rewardCredits: 1,
      durationMinutes: 30,
    },
    validate: expectOrder(202, 'PENDING', (order) => (order.requesterId === requester.account.userId ? true : 'requester differs')),
  });
  if (!created.ok) {
    incomplete.add(1, { stage: 'create' });
    return;
  }
  const orderId = created.json.data.id;
  const submittedAt = Date.now();

  // Bounded polling until the Order/Credit CDC saga opens the order. Tagged phase=polling: never measured.
  let status = 'PENDING';
  while (status === 'PENDING' && Date.now() - submittedAt < OPEN_TIMEOUT_MS) {
    sleep(0.25);
    const polled = measured(requester, 'order_poll', {
      path: `/api/orders/${orderId}`,
      template: '/api/orders/{id}',
      phase: 'polling',
      validate: (res, json) => envelope(res, json, 200),
    });
    if (polled.ok) status = polled.json.data.status;
  }
  if (status !== 'OPEN') {
    incomplete.add(1, { stage: status === 'PENDING' ? 'open_timeout' : status.toLowerCase() });
    console.warn(`[lifecycle] order never became OPEN within ${OPEN_TIMEOUT_MS} ms (last status ${status})`);
    return;
  }
  pendingToOpen.add(Date.now() - submittedAt, creationTags);

  const accepted = measured(courier, 'order_accept', {
    method: 'POST',
    path: `/api/orders/${orderId}/accept`,
    template: '/api/orders/{id}/accept',
    body: { courierContactNote: 'perf run' },
    validate: expectOrder(200, 'ACCEPTED', (order) => (order.courierId === courier.account.userId ? true : 'courier differs')),
  });
  if (!accepted.ok) return void incomplete.add(1, { stage: 'accept' });

  const picked = measured(courier, 'order_pickup', {
    method: 'POST',
    path: `/api/orders/${orderId}/pickup`,
    template: '/api/orders/{id}/pickup',
    validate: expectOrder(200, 'IN_TRANSIT'),
  });
  if (!picked.ok) return void incomplete.add(1, { stage: 'pickup' });

  const delivered = measured(courier, 'order_deliver', {
    method: 'POST',
    path: `/api/orders/${orderId}/deliver`,
    template: '/api/orders/{id}/deliver',
    validate: expectOrder(200, 'DELIVERED'),
  });
  if (!delivered.ok) return void incomplete.add(1, { stage: 'deliver' });

  const completed = measured(requester, 'order_complete', {
    method: 'POST',
    path: `/api/orders/${orderId}/complete`,
    template: '/api/orders/{id}/complete',
    validate: expectOrder(200, 'COMPLETED'),
  });
  if (!completed.ok) incomplete.add(1, { stage: 'complete' });
}

export const handleSummary = summaryHandler('lifecycle');
