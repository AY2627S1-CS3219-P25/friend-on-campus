/**
 * AI Assistance Disclosure:
 * Tool: Claude Code (model: Claude Fable 5.1), date: 2026-11-08
 * Scope: Rewrote the discovery read workload for issue #236: WORKLOAD=discovery (order feed and query variants,
 *        #74) or WORKLOAD=supplier (listing/search/filter over >= 500 run-owned active records, #29/#33);
 *        bounded smoke/load/stress profiles, run-owned accounts, per-operation steady-state thresholds and
 *        response-correctness checks replace the seeded-account ramp with global thresholds.
 * Author review: <to be completed by Reallyeasy1>
 *
 * Earlier version: hand-written staged ramp (10 -> 150 VUs over two minutes) with seeded credentials.
 *
 * Run through the wrapper, which creates the fixtures this script reads:
 *   npm run perf:k6 -- --target http://127.0.0.1 --profile smoke --workload discovery
 *   npm run perf:k6 -- --target http://127.0.0.1 --profile load --workload supplier --vus 100
 */
// AI-generated (edited by Reallyeasy1)
import {
  FIXTURES,
  Session,
  accountFor,
  assertAccounts,
  baseOptions,
  buildScenario,
  envelope,
  measured,
  operationThresholds,
  scenarioMaxVus,
  summaryHandler,
} from './lib/perf.js';

const WORKLOAD = __ENV.WORKLOAD || 'discovery';
if (WORKLOAD !== 'discovery' && WORKLOAD !== 'supplier') {
  throw new Error(`WORKLOAD must be "discovery" or "supplier", received "${WORKLOAD}"`);
}

const SCENARIO_NAME = WORKLOAD === 'discovery' ? 'order_feed' : 'supplier_search';
const scenario = buildScenario(WORKLOAD === 'discovery' ? 'orderFeed' : 'supplierSearch', WORKLOAD === 'discovery' ? 100 : 50);
const maxVus = scenarioMaxVus(scenario);

export const options = baseOptions({ [SCENARIO_NAME]: scenario }, operationThresholds(WORKLOAD, maxVus));

export function setup() {
  assertAccounts(maxVus);
  console.log(`[setup] ${WORKLOAD} workload, ${maxVus} max VUs, ${FIXTURES.feedOrderCount} run-owned open errands, ${FIXTURES.requiredActiveSuppliers} run-owned suppliers`);
}

let session;

// Variants rotate per iteration so the population covers the feed and its query forms (#74).
const FEED_VARIANTS = [
  { variant: 'feed', template: '/api/orders?status=OPEN', path: () => '/api/orders?status=OPEN' },
  { variant: 'page', template: '/api/orders?status=OPEN&page&limit', path: () => '/api/orders?status=OPEN&page=1&limit=20' },
  { variant: 'zone', template: '/api/orders?status=OPEN&campusZone', path: () => `/api/orders?status=OPEN&campusZone=${encodeURIComponent(FIXTURES.campusZone)}` },
  { variant: 'search', template: '/api/orders?status=OPEN&search', path: () => `/api/orders?status=OPEN&search=${encodeURIComponent(FIXTURES.searchTerm)}` },
];

function validateFeed(variant) {
  return (res, json) => {
    const shape = envelope(res, json, 200);
    if (shape !== true) return shape;
    if (!Array.isArray(json.data) || typeof json.total !== 'number') return 'data is not an array with a total';
    const now = Date.now();
    for (const order of json.data) {
      if (order.status !== 'OPEN') return `non-OPEN order (${order.status}) in the open feed`;
      if (!(Date.parse(order.expiresAt) > now)) return 'expired order in the open feed';
    }
    if (variant === 'page' && json.data.length > 20) return 'limit=20 not honoured';
    if (variant === 'zone') {
      if (json.total < FIXTURES.feedOrderCount) return 'campusZone total below run-owned open errands';
      if (json.data.some((order) => String(order.campusZone || '').toLowerCase() !== FIXTURES.campusZone.toLowerCase())) return 'campusZone filter not honoured';
    }
    if (variant === 'search') {
      if (json.total < FIXTURES.feedOrderCount) return 'search total below run-owned open errands';
      if (json.data.some((order) => !String(order.itemDescription || '').includes(FIXTURES.searchTerm))) return 'search filter not honoured';
    }
    if (variant === 'feed' && json.total < FIXTURES.feedOrderCount) return 'feed total below run-owned open errands';
    return true;
  };
}

export function orderFeed() {
  session = session || new Session(accountFor(1, 0));
  const chosen = FEED_VARIANTS[__ITER % FEED_VARIANTS.length];
  measured(session, 'order_feed', {
    path: chosen.path(),
    template: chosen.template,
    tags: { variant: chosen.variant },
    validate: validateFeed(chosen.variant),
  });
}

const SUPPLIER_VARIANTS = [
  { variant: 'list', template: '/api/suppliers?isActive', path: () => '/api/suppliers?isActive=true' },
  { variant: 'search', template: '/api/suppliers?isActive&search', path: () => `/api/suppliers?isActive=true&search=${encodeURIComponent(FIXTURES.searchTerm)}` },
  { variant: 'zone', template: '/api/suppliers?isActive&campusZone', path: () => `/api/suppliers?isActive=true&campusZone=${encodeURIComponent(FIXTURES.campusZone)}` },
  { variant: 'page', template: '/api/suppliers?isActive&category&page&limit', path: () => `/api/suppliers?isActive=true&category=${encodeURIComponent(FIXTURES.category)}&page=2&limit=20` },
];

function validateSuppliers(variant) {
  return (res, json) => {
    const shape = envelope(res, json, 200);
    if (shape !== true) return shape;
    const suppliers = json.data.suppliers;
    if (!Array.isArray(suppliers) || typeof json.data.total !== 'number') return 'data.suppliers is not an array with a total';
    if (suppliers.some((supplier) => supplier.isActive !== true)) return 'inactive supplier returned for isActive=true';
    if (variant === 'list' && json.data.total < FIXTURES.requiredActiveSuppliers) return 'active total below the run-owned dataset';
    if (variant === 'search' || variant === 'zone' || variant === 'page') {
      if (json.data.total !== FIXTURES.requiredActiveSuppliers) return `${variant} total ${json.data.total} != run-owned ${FIXTURES.requiredActiveSuppliers}`;
    }
    if (variant === 'search' && suppliers.some((supplier) => !String(supplier.name).toLowerCase().includes(FIXTURES.searchTerm.toLowerCase()))) return 'search filter not honoured';
    if (variant === 'zone' && suppliers.some((supplier) => String(supplier.campusZone).toLowerCase() !== FIXTURES.campusZone.toLowerCase())) return 'campusZone filter not honoured';
    if (variant === 'page' && (suppliers.length > 20 || json.data.page !== 2)) return 'pagination not honoured';
    return true;
  };
}

export function supplierSearch() {
  session = session || new Session(accountFor(1, 0));
  const chosen = SUPPLIER_VARIANTS[__ITER % SUPPLIER_VARIANTS.length];
  measured(session, 'supplier_search', {
    path: chosen.path(),
    template: chosen.template,
    tags: { variant: chosen.variant },
    validate: validateSuppliers(chosen.variant),
  });
}

export const handleSummary = summaryHandler(WORKLOAD);
