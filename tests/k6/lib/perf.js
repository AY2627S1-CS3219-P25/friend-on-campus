/**
 * AI Assistance Disclosure:
 * Tool: Google Antigravity Agent; Claude Code (model: Claude Fable 5.1), date: 2026-11-08 to 2026-11-09
 * Scope: Shared k6 helpers for the performance workloads (issue #236): bounded smoke/load/stress scenarios, run-owned account sessions with token renewal,..; updated across 2 AI-assisted revisions through D4 wrap-up (pR #252 review fixes: buildScenario resolves baselineVus from requirements.json when given a workload name, and smoke profile gracefulStop is raised from..).
 * Author review: I validated correctness, edited for style, and verified with automated tests.
 */
import http from 'k6/http';
import exec from 'k6/execution';
import { Rate } from 'k6/metrics';

export const REQUIREMENTS = JSON.parse(open('../requirements.json'));
export const LIMITS = REQUIREMENTS.limits;
export const BASE_URL = (__ENV.TARGET_HOST || __ENV.BASE_URL || 'http://localhost').replace(/\/$/, '');
export const PROFILE = __ENV.PROFILE || 'smoke';
export const OUT_DIR = __ENV.PERF_OUT_DIR || '';
export const RUN_ID = __ENV.PERF_RUN_ID || 'local';

// Fixtures and accounts are written by scripts/perf/run-perf.mjs. The accounts file holds generated
// passwords, so it lives outside the evidence bundle and is deleted at cleanup.
export const FIXTURES = __ENV.PERF_FIXTURES ? JSON.parse(open(__ENV.PERF_FIXTURES)) : null;
const ACCOUNTS = __ENV.PERF_ACCOUNTS ? JSON.parse(open(__ENV.PERF_ACCOUNTS)).accounts : null;

if (!FIXTURES || !ACCOUNTS) {
  throw new Error('PERF_FIXTURES and PERF_ACCOUNTS are required: run this script through `npm run perf:k6`, which creates run-owned fixtures first.');
}

function intEnv(name, fallback) {
  const raw = __ENV[name];
  if (raw === undefined || raw === '') return fallback;
  const value = Number(raw);
  if (!Number.isInteger(value)) throw new Error(`${name} must be an integer, received "${raw}"`);
  return value;
}

function clamp(value, low, high) {
  return Math.min(high, Math.max(low, value));
}

export function requestedVus(baselineVus) {
  return clamp(intEnv('VUS', baselineVus), 1, LIMITS.maxVus);
}

/** Scenario for the selected PROFILE. VU counts and durations are clamped to the hard limits in requirements.json. */
export function buildScenario(execName, workloadOrBaselineVus) {
  const baselineVus = typeof workloadOrBaselineVus === 'string'
    ? REQUIREMENTS.workloads[workloadOrBaselineVus].baselineVus
    : workloadOrBaselineVus;
  if (PROFILE === 'smoke') {
    const { minVus, maxVus, maxDurationSeconds, defaultVus } = LIMITS.smoke;
    const vus = clamp(intEnv('VUS', defaultVus), minVus, maxVus);
    const duration = clamp(intEnv('DURATION_SECONDS', maxDurationSeconds), 5, maxDurationSeconds);
    return { executor: 'constant-vus', exec: execName, vus, duration: `${duration}s`, gracefulStop: '30s' };
  }
  if (PROFILE === 'load') {
    const { warmupSeconds, measureSeconds, drainSeconds } = LIMITS.load;
    return {
      executor: 'constant-vus',
      exec: execName,
      vus: requestedVus(baselineVus),
      duration: `${warmupSeconds + measureSeconds}s`,
      gracefulStop: `${drainSeconds}s`,
    };
  }
  if (PROFILE === 'stress') {
    const { stepVus, holdSeconds, maxVus, maxTotalSeconds } = LIMITS.stress;
    const startVUs = requestedVus(baselineVus);
    const ceiling = clamp(intEnv('STRESS_MAX_VUS', maxVus), startVUs, maxVus);
    const stages = [];
    let total = 0;
    for (let target = startVUs + stepVus; target <= ceiling && total + holdSeconds <= maxTotalSeconds; target += stepVus) {
      stages.push({ duration: '0s', target }, { duration: `${holdSeconds}s`, target });
      total += holdSeconds;
    }
    if (stages.length === 0) {
      throw new Error(`stress profile needs one ${stepVus}-VU step above the ${startVUs}-VU baseline within ${maxVus} VUs`);
    }
    return { executor: 'ramping-vus', exec: execName, startVUs, stages, gracefulRampDown: '0s', gracefulStop: '60s' };
  }
  throw new Error(`Unknown PROFILE "${PROFILE}" (smoke | load | stress)`);
}

export function scenarioMaxVus(scenario) {
  if (scenario.executor === 'ramping-vus') return Math.max(scenario.startVUs, ...scenario.stages.map((stage) => stage.target));
  return scenario.vus;
}

function stressStep() {
  const scenario = exec.test.options.scenarios[exec.scenario.name];
  const elapsedSeconds = (Date.now() - exec.scenario.startTime) / 1000;
  const index = Math.min(Math.floor(elapsedSeconds / LIMITS.stress.holdSeconds), scenario.stages.length / 2 - 1);
  return scenario.stages[index * 2].target;
}

/** warmup | steady for the load profile; everything else is steady (stress also carries the current VU step). */
export function phase() {
  if (PROFILE !== 'load') return 'steady';
  return Date.now() - exec.scenario.startTime < LIMITS.load.warmupSeconds * 1000 ? 'warmup' : 'steady';
}

export function measurementTags(operation, extra) {
  const tags = Object.assign({ operation, phase: phase() }, extra || {});
  if (PROFILE === 'stress') tags.step = String(stressStep());
  return tags;
}

export function accountFor(slots, slot) {
  const index = (exec.vu.idInTest - 1) * slots + slot;
  const account = ACCOUNTS[index];
  if (!account) exec.test.abort(`VU ${exec.vu.idInTest} has no run-owned account at index ${index}; fixtures created ${ACCOUNTS.length}`);
  return account;
}

export function assertAccounts(required) {
  if (ACCOUNTS.length < required) {
    exec.test.abort(`workload needs ${required} run-owned accounts but fixtures provide ${ACCOUNTS.length}`);
  }
}

const RENEW_BEFORE_MS = 60 * 1000;

/** Per-VU authenticated client for one run-owned account. Login requests are tagged operation=auth and never measured. */
export class Session {
  constructor(account) {
    this.account = account;
    this.token = null;
    this.expiresAt = 0;
  }

  ensureToken() {
    if (this.token && Date.now() < this.expiresAt - RENEW_BEFORE_MS) return;
    let status = 0;
    for (let attempt = 1; attempt <= 3; attempt += 1) {
      const res = http.post(
        `${BASE_URL}/api/auth/login`,
        JSON.stringify({ email: this.account.email, password: this.account.password }),
        { headers: { 'Content-Type': 'application/json' }, tags: { operation: 'auth', phase: 'auth', name: '/api/auth/login' }, responseType: 'text' },
      );
      status = res.status;
      if (res.status === 200) {
        const body = parseJson(res);
        const token = body && body.data ? body.data.accessToken : null;
        if (typeof token === 'string' && token.length > 0) {
          const ttlSeconds = Number(body.data.accessTokenExpiresInSeconds) || 15 * 60;
          this.token = token;
          this.expiresAt = Date.now() + ttlSeconds * 1000;
          return;
        }
      }
    }
    // Authentication failures must not silently replace the intended workload.
    exec.test.abort(`VU ${exec.vu.idInTest}: login failed for its run-owned account (last HTTP ${status})`);
  }

  headers(hasBody) {
    const headers = { Authorization: `Bearer ${this.token}` };
    if (hasBody) headers['Content-Type'] = 'application/json';
    return headers;
  }
}

function parseJson(res) {
  try {
    return JSON.parse(res.body);
  } catch {
    return null;
  }
}

export const responseOk = new Rate('response_ok');
let failureLogs = 0;

/**
 * One measured request: bounded tags (operation, phase, step, variant, route template), exactly one
 * response_ok sample, and a validator that returns true or a short reason without echoing bodies.
 */
export function measured(session, operation, options) {
  session.ensureToken();
  const tags = measurementTags(operation, options.tags);
  if (options.phase) tags.phase = options.phase;
  tags.name = options.template;
  const params = { headers: session.headers(options.body !== undefined), tags, responseType: 'text', timeout: '30s' };
  const url = BASE_URL + options.path;
  const res = options.method === 'POST'
    ? http.post(url, options.body === undefined ? null : JSON.stringify(options.body), params)
    : http.get(url, params);
  const json = parseJson(res);
  let verdict;
  try {
    verdict = options.validate(res, json);
  } catch (error) {
    verdict = `validator threw: ${error.message}`;
  }
  const ok = verdict === true;
  responseOk.add(ok, tags);
  if (!ok && failureLogs < 5) {
    failureLogs += 1;
    console.warn(`[${operation}] HTTP ${res.status} rejected: ${verdict}`);
  }
  return { res, json, ok };
}

export function envelope(res, json, status) {
  if (res.status !== status) return `HTTP ${res.status} (expected ${status})`;
  if (!json || json.success !== true || json.data === undefined) return 'body is not a success envelope';
  return true;
}

/** Thresholds for the steady-state population of each operation, taken from requirements.json. */
export function operationThresholds(workload, maxVus) {
  const spec = REQUIREMENTS.workloads[workload];
  const thresholds = Object.assign({}, spec.extraThresholds || {});
  for (const op of spec.operations) {
    const limit = op.limits.find((candidate) => maxVus <= candidate.upToVus);
    if (!limit) throw new Error(`${op.operation}: no latency limit covers ${maxVus} VUs`);
    const selector = `{operation:${op.operation},phase:steady}`;
    thresholds[`http_req_duration${selector}`] = [`p(95)${limit.comparator}${limit.p95Ms}`];
    thresholds[`response_ok${selector}`] = [
      `rate>${1 - op.maxErrorRate}`,
      // Proposed stop condition from the design: more than 5% unexpected errors for 30 seconds aborts the run.
      { threshold: 'rate>0.95', abortOnFail: true, delayAbortEval: '30s' },
    ];
    thresholds[`http_req_failed${selector}`] = [`rate<${op.maxErrorRate}`];
    thresholds[`http_reqs${selector}`] = ['count>0'];
  }
  return thresholds;
}

export function baseOptions(scenarios, thresholds) {
  return {
    scenarios,
    thresholds,
    summaryTrendStats: ['avg', 'min', 'med', 'max', 'p(50)', 'p(95)', 'p(99)'],
    // `url` is deliberately excluded: raw URLs carry query strings and entity IDs. `name` holds a route template.
    systemTags: ['proto', 'status', 'method', 'name', 'group', 'check', 'error', 'error_code', 'scenario', 'expected_response'],
    setupTimeout: '120s',
    teardownTimeout: '60s',
    userAgent: `foc-perf/${RUN_ID}`,
  };
}

function formatValue(value) {
  return typeof value === 'number' ? value.toFixed(value >= 100 ? 0 : 2) : String(value);
}

/** handleSummary: native summary to <PERF_OUT_DIR>/k6-summary.json plus a compact, token-free console report. */
export function summaryHandler(workload) {
  return function handleSummary(data) {
    const lines = [`k6 ${workload} (${PROFILE}) finished in ${(data.state.testRunDurationMs / 1000).toFixed(1)}s`];
    const names = Object.keys(data.metrics).sort();
    for (const name of names) {
      const metric = data.metrics[name];
      if (!metric.thresholds) continue;
      for (const expression of Object.keys(metric.thresholds)) {
        const ok = metric.thresholds[expression].ok;
        const value = metric.type === 'trend' ? `p(95)=${formatValue(metric.values['p(95)'])}` : metric.type === 'rate' ? `rate=${formatValue(metric.values.rate)}` : `count=${metric.values.count}`;
        lines.push(`${ok ? 'PASS' : 'FAIL'}  ${name} ${expression} (${value})`);
      }
    }
    for (const name of names) {
      const match = /^http_req_duration\{operation:([a-z_]+),phase:steady\}$/.exec(name);
      if (!match) continue;
      const values = data.metrics[name].values;
      const reqs = data.metrics[`http_reqs{operation:${match[1]},phase:steady}`];
      lines.push(`steady ${match[1]}: n=${reqs ? reqs.values.count : '?'} p50=${formatValue(values['p(50)'])}ms p95=${formatValue(values['p(95)'])}ms p99=${formatValue(values['p(99)'])}ms`);
    }
    const output = { stdout: `${lines.join('\n')}\n` };
    if (OUT_DIR) output[`${OUT_DIR}/k6-summary.json`] = JSON.stringify(data, null, 2);
    return output;
  };
}
