// AI Assistance Disclosure:
// Tool: Google Antigravity Agent; Claude Code (model: Claude Fable 5.1), date: 2026-11-08 to 2026-11-09
// Scope: Evidence builders for the k6 performance harness (issue #237): a bounded 10-second time-series derived from k6's JSON output, and per-operation verdicts..; updated across 3 AI-assisted revisions through D4 wrap-up (pR #252 review fix: performanceFromSummary resolves per-tier requiredVus from the matched limit entry before falling back to op.concurrency.required so..).
// Author review: I validated correctness, edited for style, and verified with automated tests.
import { createReadStream, createWriteStream } from 'node:fs';
import { createInterface } from 'node:readline';
import { createGzip } from 'node:zlib';
import { pipeline } from 'node:stream/promises';
import { Readable } from 'node:stream';

const TIMELINE_METRICS = new Set(['http_req_duration', 'http_reqs', 'http_req_failed', 'response_ok', 'order_pending_to_open_ms', 'vus', 'lifecycle_incomplete']);

function percentile(sorted, fraction) {
  if (sorted.length === 0) return null;
  const index = Math.min(sorted.length - 1, Math.max(0, Math.ceil(fraction * sorted.length) - 1));
  return sorted[index];
}

/**
 * Streams k6's `--out json` file into per-bucket aggregates keyed by metric, scenario, operation, phase and
 * stress step. Raw latency values are held per bucket until the end of the stream and then reduced to
 * percentiles, so the written output is bounded by (run seconds / bucketSeconds) x distinct tag combinations
 * rather than by request count.
 */
const VERDICTS = new Set(['PASS', 'FAIL', 'BLOCKED', 'INCOMPLETE']);

/**
 * The status of a stage that threw: the verdict the error carries, BLOCKED for a fixture problem, FAIL otherwise.
 * A gateway error carries an HTTP code in `status`; that is not a verdict (a reconciliation once ended as "401").
 */
export function stageStatus(error) {
  if (VERDICTS.has(error.status)) return error.status;
  return error.name === 'FixtureError' ? 'BLOCKED' : 'FAIL';
}

/** The run's verdict from its required stages; `runCount` k6 runs plus preflight and fixtures must at least have started. */
export function overallVerdict(stages, runCount) {
  const required = stages.filter((entry) => entry.required);
  if (required.some((entry) => entry.status === 'BLOCKED')) return 'BLOCKED';
  if (required.some((entry) => entry.status === 'FAIL')) return 'FAIL';
  if (required.some((entry) => entry.status === 'INCOMPLETE')) return 'INCOMPLETE';
  if (required.length < 2 + runCount) return 'BLOCKED';
  // Anything that is not PASS fails the run, whatever its status is called.
  return required.every((entry) => entry.status === 'PASS') ? 'PASS' : 'FAIL';
}

export async function buildTimeline(rawPath, gzPath, { bucketSeconds = 10 } = {}) {
  const buckets = new Map();
  let lines = 0;
  const reader = createInterface({ input: createReadStream(rawPath), crlfDelay: Infinity });
  for await (const line of reader) {
    lines += 1;
    if (!line.startsWith('{"metric"') && !line.includes('"type":"Point"')) continue;
    let point;
    try {
      point = JSON.parse(line);
    } catch {
      continue;
    }
    if (point.type !== 'Point' || !TIMELINE_METRICS.has(point.metric)) continue;
    const tags = point.data.tags ?? {};
    const start = Math.floor(Date.parse(point.data.time) / 1000 / bucketSeconds) * bucketSeconds;
    const key = [point.metric, tags.scenario ?? '-', tags.operation ?? '-', tags.phase ?? '-', tags.step ?? '-', start].join('|');
    let bucket = buckets.get(key);
    if (!bucket) {
      bucket = { metric: point.metric, scenario: tags.scenario ?? null, operation: tags.operation ?? null, phase: tags.phase ?? null, step: tags.step ?? null, start: new Date(start * 1000).toISOString(), count: 0, sum: 0, min: Infinity, max: -Infinity, values: [] };
      buckets.set(key, bucket);
    }
    const value = point.data.value;
    bucket.count += 1;
    bucket.sum += value;
    bucket.min = Math.min(bucket.min, value);
    bucket.max = Math.max(bucket.max, value);
    if (point.metric === 'http_req_duration' || point.metric === 'order_pending_to_open_ms') bucket.values.push(value);
  }

  const rows = [...buckets.values()].map((bucket) => {
    const row = { metric: bucket.metric, scenario: bucket.scenario, operation: bucket.operation, phase: bucket.phase, step: bucket.step, start: bucket.start, count: bucket.count };
    if (bucket.values.length > 0) {
      const sorted = bucket.values.sort((a, b) => a - b);
      Object.assign(row, { avg: bucket.sum / bucket.count, min: bucket.min, max: bucket.max, p50: percentile(sorted, 0.5), p95: percentile(sorted, 0.95), p99: percentile(sorted, 0.99) });
    } else if (bucket.metric === 'http_req_failed' || bucket.metric === 'response_ok') {
      row.rate = bucket.sum / bucket.count;
    } else if (bucket.metric === 'vus') {
      row.max = bucket.max;
    } else {
      row.sum = bucket.sum;
    }
    return row;
  }).sort((a, b) => a.start.localeCompare(b.start) || a.metric.localeCompare(b.metric) || String(a.operation).localeCompare(String(b.operation)));

  const document = { schemaVersion: 1, bucketSeconds, rawLines: lines, buckets: rows };
  await pipeline(Readable.from([JSON.stringify(document)]), createGzip(), createWriteStream(gzPath));
  return { buckets: rows.length, rawLines: lines };
}

function metricValues(summary, name) {
  return summary.metrics?.[name]?.values ?? null;
}

function thresholdRows(summary, selector) {
  const rows = [];
  for (const metric of ['http_req_duration', 'response_ok', 'http_req_failed', 'http_reqs']) {
    const entry = summary.metrics?.[`${metric}${selector}`];
    if (!entry?.thresholds) continue;
    for (const [expression, result] of Object.entries(entry.thresholds)) rows.push({ metric, expression, ok: result.ok === true });
  }
  return rows;
}

/**
 * Per-operation verdicts for one workload. `context` carries profile, configured/max VUs, the k6 exit code,
 * the sample minimum and the concurrency tolerance so the report states every rule it applied.
 */
export function performanceFromSummary(summary, workloadSpec, context) {
  const { profile, maxVus, limits, minSteadySamples, concurrencyTolerance, k6ExitCode } = context;
  const runSeconds = (summary.state?.testRunDurationMs ?? 0) / 1000;
  const steadySeconds = profile === 'load' ? Math.max(1, runSeconds - limits.load.warmupSeconds) : Math.max(1, runSeconds);

  const operations = workloadSpec.operations.map((op) => {
    const selector = `{operation:${op.operation},phase:steady}`;
    const duration = metricValues(summary, `http_req_duration${selector}`);
    const reqs = metricValues(summary, `http_reqs${selector}`);
    const failed = metricValues(summary, `http_req_failed${selector}`);
    const ok = metricValues(summary, `response_ok${selector}`);
    const limit = op.limits.find((candidate) => maxVus <= candidate.upToVus) ?? op.limits.at(-1);
    const thresholds = thresholdRows(summary, selector);
    const count = reqs?.count ?? 0;
    const requestsPerSecond = count / steadySeconds;
    const estimatedInFlight = duration ? requestsPerSecond * (duration.avg / 1000) : 0;

    const problems = [];
    if (!duration || !reqs || !ok || !failed) problems.push('required steady-state metrics are missing');
    if (count < minSteadySamples) problems.push(`only ${count} steady samples (minimum ${minSteadySamples})`);
    for (const row of thresholds) if (!row.ok) problems.push(`${row.metric} ${row.expression} failed`);

    const requiredConcurrency = limit.requiredVus ?? op.concurrency.required;
    let concurrencyStatus;
    if (profile === 'smoke') {
      // Smoke proves accounts, data, routes and checks; it never claims the issue's concurrency.
      concurrencyStatus = 'NOT_ASSESSED';
    } else if (op.concurrency.mode === 'sustained') {
      concurrencyStatus = estimatedInFlight >= requiredConcurrency * concurrencyTolerance ? 'MET' : 'INCOMPLETE';
    } else {
      concurrencyStatus = maxVus >= requiredConcurrency ? 'MET' : 'INCOMPLETE';
    }

    const verdict = problems.length > 0 ? 'FAIL' : concurrencyStatus === 'INCOMPLETE' ? 'INCOMPLETE' : 'PASS';
    return {
      operation: op.operation,
      description: op.description,
      issue: limit.issue,
      criterion: limit.criterion,
      // requirementP95Ms / requirementVus: what the linked issue states, when the enforced limit was raised above it
      // or the workload runs with fewer users than the issue describes.
      limit: { p95Ms: limit.p95Ms, comparator: limit.comparator, requirementP95Ms: limit.requirementP95Ms ?? null, requirementVus: limit.requirementVus ?? null, maxErrorRate: op.maxErrorRate, errorRateSource: op.errorRateSource },
      thresholds,
      steady: duration ? {
        count,
        p50Ms: duration['p(50)'] ?? duration.med,
        p95Ms: duration['p(95)'],
        p99Ms: duration['p(99)'],
        avgMs: duration.avg,
        maxMs: duration.max,
        httpFailedRate: failed?.rate ?? null,
        responseOkRate: ok?.rate ?? null,
        requestsPerSecond,
        steadySeconds,
      } : { count: 0, steadySeconds },
      concurrency: {
        configuredVus: maxVus,
        required: requiredConcurrency,
        mode: op.concurrency.mode,
        estimatedInFlight,
        tolerance: concurrencyTolerance,
        status: concurrencyStatus,
        method: 'client-side Little\'s law over the steady window (requests/s x mean latency); the server-side in-flight count was not instrumented',
      },
      problems,
      verdict,
    };
  });

  const asyncMetrics = (workloadSpec.asyncMetrics ?? []).map((spec) => {
    const values = metricValues(summary, `${spec.metric}{phase:steady}`) ?? metricValues(summary, spec.metric);
    return { metric: spec.metric, description: spec.description, steady: values ? { count: values.count ?? null, p50Ms: values['p(50)'] ?? values.med, p95Ms: values['p(95)'], p99Ms: values['p(99)'], maxMs: values.max } : null };
  });

  const extra = Object.entries(workloadSpec.extraThresholds ?? {}).flatMap(([metric, expressions]) => {
    const entry = summary.metrics?.[metric];
    return expressions.map((expression) => ({ metric, expression, ok: entry?.thresholds?.[expression]?.ok === true, value: entry?.values ?? null }));
  });

  let verdict = operations.some((op) => op.verdict === 'FAIL') ? 'FAIL' : operations.some((op) => op.verdict === 'INCOMPLETE') ? 'INCOMPLETE' : 'PASS';
  if (k6ExitCode !== 0) verdict = 'FAIL';
  if (extra.some((row) => !row.ok)) verdict = 'FAIL';
  return { verdict, k6ExitCode, runSeconds, steadySeconds, operations, asyncMetrics, extraThresholds: extra, notCovered: workloadSpec.notCovered ?? [] };
}

/**
 * Benchmark rows for two runs ({ manifest, workloads: { label: performance.json } }), one per operation present in
 * both. `comparable` is false when the virtual-user counts differ: latency under another load is another measurement.
 * Changes are fractions of the baseline (-0.5 = half); null when either side is missing.
 */
export function compareRuns(baseline, current) {
  const change = (before, after) => (typeof before === 'number' && typeof after === 'number' && before > 0 ? (after - before) / before : null);
  const pair = (before, after) => ({ baseline: before ?? null, current: after ?? null, change: change(before, after) });
  const rows = [];
  for (const [workload, now] of Object.entries(current.workloads)) {
    const then = baseline.workloads[workload];
    if (!then) continue;
    for (const op of now.operations ?? []) {
      const old = (then.operations ?? []).find((candidate) => candidate.operation === op.operation);
      if (!old?.steady || !op.steady) continue;
      const vus = { baseline: old.concurrency?.configuredVus ?? null, current: op.concurrency?.configuredVus ?? null };
      rows.push({
        workload,
        operation: op.operation,
        vus,
        comparable: vus.baseline === vus.current,
        p50Ms: pair(old.steady.p50Ms, op.steady.p50Ms),
        p95Ms: pair(old.steady.p95Ms, op.steady.p95Ms),
        requestsPerSecond: pair(old.steady.requestsPerSecond, op.steady.requestsPerSecond),
        errorRate: { baseline: old.steady.httpFailedRate ?? null, current: op.steady.httpFailedRate ?? null },
        verdict: { baseline: old.verdict, current: op.verdict },
      });
    }
    for (const metric of now.asyncMetrics ?? []) {
      const old = (then.asyncMetrics ?? []).find((candidate) => candidate.metric === metric.metric);
      if (!old?.steady || !metric.steady) continue;
      rows.push({
        workload,
        operation: `${metric.metric} (reported only)`,
        vus: { baseline: null, current: null },
        comparable: true,
        p50Ms: pair(old.steady.p50Ms, metric.steady.p50Ms),
        p95Ms: pair(old.steady.p95Ms, metric.steady.p95Ms),
        requestsPerSecond: pair(null, null),
        errorRate: { baseline: null, current: null },
        verdict: { baseline: 'n/a', current: 'n/a' },
      });
    }
  }
  return rows;
}

/** Markdown for compareRuns rows. `meta` carries the two manifests. States measurements only, no pass or fail. */
export function renderComparison(rows, meta) {
  const ms = (value) => (typeof value === 'number' ? value.toFixed(0) : 'n/a');
  const rate = (value) => (typeof value === 'number' ? value.toFixed(1) : 'n/a');
  const percent = (value) => (typeof value === 'number' ? `${value > 0 ? '+' : ''}${(value * 100).toFixed(0)}%` : 'n/a');
  const errors = (value) => (typeof value === 'number' ? `${(value * 100).toFixed(1)}%` : 'n/a');
  const describe = (manifest) => [manifest.runId, manifest.startedAt, manifest.profile, (manifest.commit ?? 'unknown').slice(0, 7), manifest.tools?.k6 ?? 'unknown', manifest.target?.hostname ?? 'unknown'];
  const [a, b] = [describe(meta.baseline), describe(meta.current)];
  const lines = [
    '# Benchmark comparison',
    '',
    '| | Baseline | Current |',
    '|---|---|---|',
    ...['Run', 'Started', 'Profile', 'Harness commit', 'k6', 'Target'].map((label, index) => `| ${label} | ${a[index]} | ${b[index]} |`),
    '',
    'Steady-state measurements at the gateway. Lower latency and higher throughput are better. This table compares',
    'two runs; whether a run meets its requirement thresholds is in that run\'s own `summary.md`.',
    '',
    '| Workload | Operation | VUs | p50 ms | p50 change | p95 ms | p95 change | req/s | req/s change | Errors |',
    '|---|---|---|---|---|---|---|---|---|---|',
  ];
  for (const row of rows) {
    const vus = row.vus.current === null ? '-' : row.comparable ? String(row.vus.current) : `${row.vus.baseline} -> ${row.vus.current} *`;
    lines.push(`| ${row.workload} | ${row.operation} | ${vus} | ${ms(row.p50Ms.baseline)} -> ${ms(row.p50Ms.current)} | ${percent(row.p50Ms.change)} | ${ms(row.p95Ms.baseline)} -> ${ms(row.p95Ms.current)} | ${percent(row.p95Ms.change)} | ${rate(row.requestsPerSecond.baseline)} -> ${rate(row.requestsPerSecond.current)} | ${percent(row.requestsPerSecond.change)} | ${errors(row.errorRate.baseline)} -> ${errors(row.errorRate.current)} |`);
  }
  if (rows.length === 0) lines.push('| - | no operation is present in both runs | | | | | | | | |');
  if (rows.some((row) => !row.comparable)) lines.push('', '\\* Different virtual-user counts: not a like-for-like comparison.');
  return `${lines.join('\n')}\n`;
}
