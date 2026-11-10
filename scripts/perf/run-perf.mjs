// AI Assistance Disclosure:
// Tool: Google Antigravity Agent, date: 2026-11-09
// Scope: Issue #253: Updated summary limitation note now that supplier search runs at its full issue-specified
//        50 and 100 VU populations.
// Author review: <to be completed by yanhwee>
//
// Tool: Claude Code (model: Claude Fable 5.1), date: 2026-11-08
// Scope: Orchestrator for the k6 performance harness (issues #236, #237): preflight -> run-owned fixtures ->
//        k6 per workload -> reconciliation and report -> cleanup, writing the evidence bundle under
//        test-results/<runId>/ and exiting nonzero whenever a required stage fails, blocks or is incomplete.
// Author review: <to be completed by Reallyeasy1>
//
// Tool: Claude Code (model: Claude Fable 5.1), date: 2026-11-09
// Scope: Fixes from run perf-20261108T135152Z-b09772: one self-renewing administrator session for the whole run
//        (reconciliation and cleanup had reused a 26-minute-old token and got HTTP 401); stage statuses and the run
//        verdict come from lib/report.mjs so an HTTP code can no longer stand in for a verdict; --cleanup-tag removes
//        the fixtures of a run whose own cleanup failed; the summary names that command when cleanup had errors.
//        The second load population comes from requirements.json (secondLoadVus), and the summary shows the
//        figure an issue states beside any limit or load the author changed.
// Author review: <to be completed by Reallyeasy1>
// AI-generated (edited by Reallyeasy1)
//
//   npm run perf:k6 -- --target http://127.0.0.1 --profile smoke --workload all
//   npm run perf:k6 -- --target http://127.0.0.1 --cleanup-tag <tag>    (remove a failed run's fixtures)
//   PERF_ADMIN_EMAIL / PERF_ADMIN_PASSWORD select the administrator account used for fixtures and cleanup.
//   A loopback target defaults to the seeded local admin (README "Default Seed Accounts"); remote targets require them.
import { spawn, spawnSync } from 'node:child_process';
import { mkdirSync, readFileSync, rmSync, writeFileSync, existsSync, createWriteStream } from 'node:fs';
import path from 'node:path';
import { parseArgs } from 'node:util';
import { fileURLToPath } from 'node:url';
import { createGateway } from './lib/gateway.mjs';
import { createFixtures, reconcile, cleanup, findRunOwned, fixtureTag, FixtureError } from './lib/fixtures.mjs';
import { buildTimeline, overallVerdict, performanceFromSummary, stageStatus } from './lib/report.mjs';

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const k6Directory = path.join(repositoryRoot, 'tests/k6');
const REQUIREMENTS = JSON.parse(readFileSync(path.join(k6Directory, 'requirements.json'), 'utf8'));
const LIMITS = REQUIREMENTS.limits;
// `all` runs reads first so the credit snapshot check still holds; lifecycle moves credits and runs last.
const WORKLOAD_ORDER = ['discovery', 'supplier', 'credit', 'lifecycle'];

const { values: args } = parseArgs({
  options: {
    target: { type: 'string' },
    profile: { type: 'string', default: 'smoke' },
    workload: { type: 'string', default: 'all' },
    vus: { type: 'string' },
    out: { type: 'string', default: 'test-results' },
    'run-id': { type: 'string' },
    suppliers: { type: 'string' },
    'feed-orders': { type: 'string' },
    'keep-fixtures': { type: 'boolean', default: false },
    'cleanup-tag': { type: 'string' },
    'acknowledge-remote-load': { type: 'boolean', default: false },
    k6: { type: 'string', default: process.env.K6_BIN ?? 'k6' },
  },
});

function usage(message) {
  console.error(`run-perf: ${message}`);
  console.error('usage: node scripts/perf/run-perf.mjs --target <gateway url> [--profile smoke|load|stress] [--workload all|discovery|supplier|credit|lifecycle] [--vus N] [--suppliers N] [--feed-orders N] [--out dir] [--keep-fixtures] [--acknowledge-remote-load]');
  console.error('       node scripts/perf/run-perf.mjs --target <gateway url> --cleanup-tag <tag>   (remove the fixtures of an earlier run; the tag is in its fixtures.json)');
  process.exit(2);
}

function integer(name, raw, fallback, { min, max }) {
  if (raw === undefined) return fallback;
  const value = Number(raw);
  if (!Number.isInteger(value) || value < min || value > max) usage(`--${name} must be an integer between ${min} and ${max}`);
  return value;
}

if (!args.target) usage('--target is required');
let targetUrl;
try {
  targetUrl = new URL(args.target);
} catch {
  usage('--target must be an http(s) URL');
}
if (!/^https?:$/.test(targetUrl.protocol) || targetUrl.username || targetUrl.password) usage('--target must be a plain http(s) URL without credentials');
if (!['smoke', 'load', 'stress'].includes(args.profile)) usage('--profile must be smoke, load or stress');
const workloads = args.workload === 'all' ? WORKLOAD_ORDER : [args.workload];
if (!workloads.every((name) => REQUIREMENTS.workloads[name])) usage(`--workload must be all or one of ${WORKLOAD_ORDER.join(', ')}`);
const vusOverride = integer('vus', args.vus, undefined, args.profile === 'smoke' ? { min: LIMITS.smoke.minVus, max: LIMITS.smoke.maxVus } : { min: 1, max: LIMITS.maxVus });
const isLoopback = ['localhost', '127.0.0.1', '[::1]'].includes(targetUrl.hostname);
if (!isLoopback && args.profile !== 'smoke' && !args['acknowledge-remote-load']) {
  usage('load and stress profiles against a non-loopback target need --acknowledge-remote-load (agreed target, owner and limits)');
}
// Same seeded administrator as scripts/uat/uat-d2-api.mjs; only ever used for a loopback target.
const SEED_ADMIN = { email: 'admin@nus.edu.sg', password: 'Password123!' };
const admin = process.env.PERF_ADMIN_EMAIL && process.env.PERF_ADMIN_PASSWORD
  ? { email: process.env.PERF_ADMIN_EMAIL, password: process.env.PERF_ADMIN_PASSWORD, source: 'environment' }
  : isLoopback ? { ...SEED_ADMIN, source: 'seeded local admin (loopback default)' } : null;
if (!admin) usage('PERF_ADMIN_EMAIL and PERF_ADMIN_PASSWORD must be set for a non-loopback target');

const profile = args.profile;
const baselineVus = (name) => vusOverride ?? (profile === 'smoke' ? LIMITS.smoke.defaultVus : REQUIREMENTS.workloads[name].baselineVus);
// One k6 process per run. `all` under the load profile adds a workload's second population (secondLoadVus in
// requirements.json; supplier has one for #33) so it is measured alongside the first.
const runs = workloads.flatMap((name) => {
  const base = { label: name, workload: name, vus: baselineVus(name) };
  const second = REQUIREMENTS.workloads[name].secondLoadVus;
  if (args.workload === 'all' && profile === 'load' && vusOverride === undefined && second) {
    return [base, { label: `${name}-${second}vus`, workload: name, vus: second }];
  }
  return [base];
});
const vusFor = (run) => run.vus;
const maxVusFor = (run) => {
  if (profile !== 'stress') return vusFor(run);
  const start = vusFor(run);
  const { stepVus, holdSeconds, maxVus, maxTotalSeconds } = LIMITS.stress;
  let target = start;
  let total = 0;
  while (target + stepVus <= maxVus && total + holdSeconds <= maxTotalSeconds) {
    target += stepVus;
    total += holdSeconds;
  }
  return target;
};
const accountCount = Math.max(...runs.map((run) => maxVusFor(run) * REQUIREMENTS.workloads[run.workload].accountSlots));
const needsSuppliers = workloads.some((name) => REQUIREMENTS.workloads[name].needsSuppliers);
const needsFeed = workloads.some((name) => REQUIREMENTS.workloads[name].needsFeedOrders);
const supplierCount = needsSuppliers ? integer('suppliers', args.suppliers, profile === 'smoke' ? 25 : 500, { min: 1, max: 1000 }) : 0;
const feedOrderCount = needsFeed ? integer('feed-orders', args['feed-orders'], profile === 'smoke' ? 5 : 50, { min: 1, max: 200 }) : 0;
const openTimeoutMs = Math.min(Number(process.env.PERF_OPEN_TIMEOUT_MS) || 60_000, 180_000);
const reconcileTimeoutMs = Math.min(Number(process.env.PERF_RECONCILE_TIMEOUT_MS) || 90_000, 600_000);

const startedAt = new Date();
const runId = args['run-id'] ?? `perf-${startedAt.toISOString().replace(/[-:]/g, '').replace(/\.\d+Z$/, 'Z')}-${fixtureTag()}`;
const runDirectory = path.resolve(repositoryRoot, args.out, runId);
const secretsDirectory = path.join(runDirectory, '.secrets');
mkdirSync(secretsDirectory, { recursive: true });

const logFile = createWriteStream(path.join(runDirectory, 'run.log'), { flags: 'a' });
function log(message) {
  const line = `${new Date().toISOString()} ${message}`;
  console.log(line);
  logFile.write(`${line}\n`);
}
function writeJson(name, value) {
  writeFileSync(path.join(runDirectory, name), JSON.stringify(value, null, 2));
}

const stages = [];
async function stage(name, required, fn) {
  const entry = { stage: name, required, status: 'RUNNING', startedAt: new Date().toISOString() };
  stages.push(entry);
  log(`stage ${name}: start`);
  try {
    const result = await fn();
    entry.status = result?.status ?? 'PASS';
    entry.detail = result?.detail ?? '';
    return result;
  } catch (error) {
    if (error.partial) partialFixtures = error.partial;
    entry.status = stageStatus(error);
    entry.detail = error.message;
    log(`stage ${name}: ${entry.status} - ${error.message}`);
    return null;
  } finally {
    entry.endedAt = new Date().toISOString();
    log(`stage ${name}: ${entry.status}`);
  }
}

function k6Version() {
  const result = spawnSync(args.k6, ['version'], { encoding: 'utf8' });
  if (result.error || result.status !== 0) return null;
  return /v(\d+\.\d+\.\d+)/.exec(result.stdout)?.[1] ?? result.stdout.trim();
}

function gitValue(gitArgs) {
  const result = spawnSync('git', gitArgs, { cwd: repositoryRoot, encoding: 'utf8' });
  return result.status === 0 ? result.stdout.trim() : null;
}

function runK6(workload, env, directory) {
  return new Promise((resolve) => {
    const k6Args = ['run', '--no-usage-report', '--out', `json=${path.join(directory, 'k6-raw.json')}`, path.join(k6Directory, REQUIREMENTS.workloads[workload].script)];
    const child = spawn(args.k6, k6Args, { cwd: k6Directory, env: { ...process.env, ...env }, stdio: ['ignore', 'pipe', 'pipe'] });
    const k6Log = createWriteStream(path.join(directory, 'k6.log'));
    for (const stream of [child.stdout, child.stderr]) {
      stream.on('data', (chunk) => {
        process.stdout.write(chunk);
        k6Log.write(chunk);
      });
    }
    child.on('error', (error) => resolve({ exitCode: -1, error: error.message }));
    child.on('close', (code) => {
      k6Log.end();
      resolve({ exitCode: code ?? -1 });
    });
  });
}

const gateway = createGateway(targetUrl.toString(), { timeoutMs: 15_000 });
// One administrator login for the whole run; it renews itself, because a load run outlives one access token.
const adminSession = gateway.session(admin.email, admin.password);
// Names every fixture of this run; --cleanup-tag finds them again if the run's own cleanup fails.
const tag = fixtureTag();
const k6Binary = k6Version();
const manifest = {
  schemaVersion: 1,
  runId,
  status: 'RUNNING',
  startedAt: startedAt.toISOString(),
  command: `node scripts/perf/run-perf.mjs ${process.argv.slice(2).join(' ')}`,
  target: { url: targetUrl.origin, hostname: targetUrl.hostname, loopback: isLoopback, trafficPath: 'gateway', remoteLoadAcknowledged: args['acknowledge-remote-load'], adminCredentials: admin.source },
  profile,
  workloads: runs.map((run) => ({ name: run.label, workload: run.workload, script: REQUIREMENTS.workloads[run.workload].script, configuredVus: vusFor(run), maxVus: maxVusFor(run), accountSlots: REQUIREMENTS.workloads[run.workload].accountSlots })),
  limits: LIMITS,
  fixtures: { tag, accountCount, supplierCount, feedOrderCount, openTimeoutMs, reconcileTimeoutMs },
  tools: { k6: k6Binary, node: process.version, platform: `${process.platform}/${process.arch}` },
  commit: process.env.GITHUB_SHA ?? gitValue(['rev-parse', 'HEAD']),
  branch: process.env.GITHUB_REF_NAME ?? gitValue(['branch', '--show-current']),
  ci: process.env.GITHUB_RUN_ID ? { runId: process.env.GITHUB_RUN_ID, repository: process.env.GITHUB_REPOSITORY } : null,
  limitations: [
    'Latency is measured at the gateway from the load generator; service-boundary timings need server-side correlation.',
    'Concurrency is a client-side estimate (Little\'s law); server-side in-flight counts were not instrumented.',
    'k6 HTTP results do not close #44; Credit mutation latency belongs to the Node correctness harness (#64).',
    'No autoscaling claim: pod/node evidence must be collected separately with timestamps.',
  ],
};
writeJson('manifest.json', manifest);
writeJson('thresholds.json', { schemaVersion: 1, source: 'tests/k6/requirements.json', limits: LIMITS, workloads: Object.fromEntries(workloads.map((name) => [name, REQUIREMENTS.workloads[name]])) });
log(`run ${runId}: profile=${profile} runs=${runs.map((run) => `${run.label}@${run.vus}`).join(',')} target=${targetUrl.hostname} k6=${k6Binary ?? 'missing'}`);

let fixtureSet = null;
let partialFixtures = null;
const workloadResults = {};
let reconciliation = null;
let cleanupReport = null;

await stage('preflight', true, async () => {
  if (!k6Binary) throw new FixtureError(`k6 binary "${args.k6}" is not available`);
  const health = await gateway.request('/health').catch((error) => {
    throw new FixtureError(`gateway unreachable: ${error.message}`);
  });
  if (health.status !== 200) throw new FixtureError(`gateway /health returned HTTP ${health.status}`);
  const session = await adminSession.current().catch((error) => {
    throw new FixtureError(`admin login failed (${admin.source}): ${error.message}`);
  });
  if (session.role !== 'ADMIN') throw new FixtureError('the configured admin account is not an administrator');
  return { detail: `gateway healthy, k6 v${k6Binary}, admin login ok (${admin.source})` };
});

if (args['cleanup-tag']) {
  // Recovery only: remove what an earlier run left behind (its cleanup failed, or it was interrupted), then stop.
  if (stages.at(-1).status === 'PASS') {
    await stage('cleanup', true, async () => {
      const found = await findRunOwned(gateway, adminSession, args['cleanup-tag']);
      log(`tag ${args['cleanup-tag']}: found ${found.accounts.length} accounts and ${found.owned.supplierIds.length} suppliers`);
      const report = await cleanup(gateway, { admin: adminSession, accounts: found.accounts, owned: found.owned, log });
      writeJson('cleanup.json', report);
      return { status: report.errors.length === 0 ? 'PASS' : 'FAIL', detail: `${report.cancelledOrders} orders cancelled, ${report.deletedSuppliers} suppliers and ${report.deletedAccounts} accounts deleted, ${report.skippedOrders.length} orders skipped, ${report.errors.length} errors` };
    });
  }
  const cleaned = stages.every((entry) => entry.status === 'PASS');
  manifest.status = cleaned ? 'PASS' : 'FAIL';
  manifest.mode = `cleanup of tag ${args['cleanup-tag']}`;
  manifest.endedAt = new Date().toISOString();
  writeJson('manifest.json', manifest);
  writeJson('results.json', { schemaVersion: 1, runId, status: manifest.status, exitCode: cleaned ? 0 : 1, stages });
  rmSync(secretsDirectory, { recursive: true, force: true });
  log(`cleanup of tag ${args['cleanup-tag']}: ${manifest.status}; ${stages.at(-1).detail}`);
  await new Promise((resolve) => logFile.end(resolve));
  process.exit(cleaned ? 0 : 1);
}

if (stages.at(-1).status === 'PASS') {
  fixtureSet = await stage('fixtures', true, async () => {
    const created = await createFixtures(gateway, { tag, admin: adminSession, accountCount, supplierCount, feedOrderCount, openTimeoutMs, log });
    writeJson('fixtures.json', { ...created.fixtures, owned: { users: created.owned.userIds.length, suppliers: created.owned.supplierIds.length, feedOrders: created.owned.feedOrderIds.length } });
    writeFileSync(path.join(secretsDirectory, 'accounts.json'), JSON.stringify({ accounts: created.accounts }));
    created.status = 'PASS';
    created.detail = `${created.accounts.length} accounts, ${created.owned.supplierIds.length} suppliers, ${created.owned.feedOrderIds.length} open errands`;
    return created;
  });
}

if (fixtureSet) {
  for (const run of runs) {
    const spec = REQUIREMENTS.workloads[run.workload];
    const directory = path.join(runDirectory, run.label);
    mkdirSync(directory, { recursive: true });
    await stage(`k6:${run.label}`, true, async () => {
      const env = {
        ...spec.env,
        TARGET_HOST: targetUrl.origin,
        PROFILE: profile,
        PERF_RUN_ID: runId,
        PERF_OUT_DIR: directory,
        PERF_FIXTURES: path.join(runDirectory, 'fixtures.json'),
        PERF_ACCOUNTS: path.join(secretsDirectory, 'accounts.json'),
        PERF_OPEN_TIMEOUT_MS: String(Math.min(openTimeoutMs, 120_000)),
        VUS: String(run.vus),
      };
      const k6Run = await runK6(run.workload, env, directory);
      const rawPath = path.join(directory, 'k6-raw.json');
      let timeline = null;
      if (existsSync(rawPath)) {
        timeline = await buildTimeline(rawPath, path.join(directory, 'k6-metrics.json.gz'));
        if (!process.env.PERF_KEEP_RAW) rmSync(rawPath);
      }
      const summaryPath = path.join(directory, 'k6-summary.json');
      if (!existsSync(summaryPath)) throw new Error(`k6 exited with ${k6Run.exitCode}${k6Run.error ? ` (${k6Run.error})` : ''} and wrote no summary`);
      const summary = JSON.parse(readFileSync(summaryPath, 'utf8'));
      const performance = performanceFromSummary(summary, spec, {
        profile,
        maxVus: maxVusFor(run),
        limits: LIMITS,
        minSteadySamples: LIMITS.minSteadySamples[profile],
        concurrencyTolerance: Number(process.env.PERF_CONCURRENCY_TOLERANCE) || LIMITS.concurrencyTolerance,
        k6ExitCode: k6Run.exitCode,
      });
      performance.timeline = timeline;
      performance.scenarios = summary.options?.scenarios ?? null;
      workloadResults[run.label] = performance;
      writeFileSync(path.join(directory, 'performance.json'), JSON.stringify(performance, null, 2));
      if (performance.verdict !== 'PASS') {
        const failure = new Error(`${performance.verdict}: k6 exit ${k6Run.exitCode}; ${performance.operations.flatMap((op) => op.problems.map((problem) => `${op.operation}: ${problem}`)).concat(performance.operations.filter((op) => op.verdict === 'INCOMPLETE').map((op) => `${op.operation}: concurrency ${op.concurrency.status}`)).join('; ') || 'see performance.json'}`);
        failure.status = performance.verdict;
        throw failure;
      }
      return { detail: `k6 exit ${k6Run.exitCode}; ${performance.operations.map((op) => `${op.operation} p95=${typeof op.steady.p95Ms === 'number' ? op.steady.p95Ms.toFixed(0) : 'n/a'}ms n=${op.steady.count}`).join(', ')}` };
    });
  }

  reconciliation = await stage('reconciliation', true, async () => {
    const result = await reconcile(gateway, { admin: adminSession, accounts: fixtureSet.accounts, timeoutMs: reconcileTimeoutMs, log });
    writeJson('reconciliation.json', { pass: result.pass, summary: result.summary, checks: result.checks });
    if (!result.pass) throw new Error(result.checks.filter((check) => !check.pass).map((check) => `${check.id} ${check.name}`).join('; '));
    result.status = 'PASS';
    result.detail = `${result.checks.length} invariant checks over ${result.summary.orders} orders and ${result.summary.accounts} wallets`;
    return result;
  });
}

const toClean = fixtureSet ?? partialFixtures;
if (toClean && !args['keep-fixtures']) {
  await stage('cleanup', false, async () => {
    cleanupReport = await cleanup(gateway, { admin: adminSession, accounts: toClean.accounts, owned: toClean.owned, sessions: reconciliation?.sessions, log });
    writeJson('cleanup.json', cleanupReport);
    return { status: cleanupReport.errors.length === 0 ? 'PASS' : 'FAIL', detail: `${cleanupReport.cancelledOrders} orders cancelled, ${cleanupReport.deletedSuppliers} suppliers and ${cleanupReport.deletedAccounts} accounts deleted, ${cleanupReport.errors.length} errors` };
  });
}
rmSync(secretsDirectory, { recursive: true, force: true });

const overall = overallVerdict(stages, runs.length);
const exitCode = overall === 'PASS' ? 0 : 1;
manifest.status = overall;
manifest.endedAt = new Date().toISOString();
writeJson('manifest.json', manifest);
writeJson('results.json', { schemaVersion: 1, runId, status: overall, exitCode, stages, workloads: Object.fromEntries(Object.entries(workloadResults).map(([name, result]) => [name, { verdict: result.verdict, k6ExitCode: result.k6ExitCode, operations: result.operations.map((op) => ({ operation: op.operation, verdict: op.verdict, p95Ms: op.steady.p95Ms ?? null, count: op.steady.count })) }])) });

const ms = (value) => (typeof value === 'number' ? value.toFixed(0) : 'n/a');
const lines = [
  `# Performance run ${runId}`,
  '',
  `**Status: ${overall}** (exit code ${exitCode}). Profile \`${profile}\`, workloads ${workloads.join(', ')}, target \`${targetUrl.hostname}\` through the gateway, k6 v${k6Binary ?? 'unknown'}, commit \`${manifest.commit ?? 'unknown'}\`.`,
  '',
  '```',
  manifest.command,
  '```',
  '',
  '## Stages',
  '',
  '| Stage | Required | Status | Detail |',
  '|---|---|---|---|',
  ...stages.map((entry) => `| ${entry.stage} | ${entry.required ? 'yes' : 'no'} | ${entry.status} | ${(entry.detail ?? '').replace(/\|/g, '/')} |`),
  '',
  '## Operations (steady state only; warm-up, auth and polling excluded)',
  '',
  '| Workload | Operation | Issue | Limit | p50 | p95 | p99 | n | req/s | VUs | est. in-flight | Verdict |',
  '|---|---|---|---|---|---|---|---|---|---|---|---|',
];
for (const [workload, result] of Object.entries(workloadResults)) {
  for (const op of result.operations) {
    lines.push(`| ${workload} | ${op.operation} | ${op.issue} | p95 ${op.limit.comparator} ${op.limit.p95Ms} ms${op.limit.requirementP95Ms ? ` (raised; the issue states ${op.limit.requirementP95Ms} ms${op.limit.requirementVus ? ` at ${op.limit.requirementVus} users` : ''})` : ''}, errors < ${op.limit.maxErrorRate * 100}% |${ms(op.steady.p50Ms)} | ${ms(op.steady.p95Ms)} | ${ms(op.steady.p99Ms)} | ${op.steady.count} | ${op.steady.requestsPerSecond?.toFixed(1) ?? 'n/a'} | ${op.concurrency.configuredVus} | ${op.concurrency.estimatedInFlight?.toFixed(1) ?? 'n/a'} (${op.concurrency.status}) | ${op.verdict} |`);
  }
  for (const metric of result.asyncMetrics ?? []) {
    if (metric.steady) lines.push(`| ${workload} | ${metric.metric} (reported, no threshold) | - | - | ${ms(metric.steady.p50Ms)} | ${ms(metric.steady.p95Ms)} | ${ms(metric.steady.p99Ms)} | ${metric.steady.count ?? ''} | - | - | - | n/a |`);
  }
}
lines.push('', '## Reconciliation', '');
if (reconciliation) {
  lines.push(`Orders: ${JSON.stringify(reconciliation.summary.ordersByStatus)}; supply ${reconciliation.summary.supply} credits across ${reconciliation.summary.accounts} run accounts.`, '');
  for (const check of reconciliation.checks) lines.push(`- ${check.pass ? 'PASS' : 'FAIL'} ${check.id} ${check.name}${check.violations.length ? ` (${check.violations.length} violation(s), first: ${check.violations[0]})` : ''}`);
} else {
  lines.push(stages.find((entry) => entry.stage === 'reconciliation')?.detail ?? 'Not run (fixtures or preflight failed).');
}
lines.push('', '## Limitations and scope', '', ...manifest.limitations.map((item) => `- ${item}`));
if (Object.values(workloadResults).some((result) => result.operations.some((op) => op.limit.requirementP95Ms))) {
  lines.push('- Limits marked "raised" are above the figure in their linked issue (tests/k6/requirements.json); a PASS against them does not show that the issue\'s requirement is met.');
}
for (const result of Object.values(workloadResults)) for (const item of result.notCovered) lines.push(`- ${item}`);
if (profile === 'stress') lines.push('- A stress run that crosses a threshold describes saturation; it is not a passing requirement-load result.');
if (cleanupReport) lines.push('', `Cleanup: ${cleanupReport.cancelledOrders} orders cancelled, ${cleanupReport.deletedSuppliers} suppliers and ${cleanupReport.deletedAccounts} accounts deleted; ${cleanupReport.skippedOrders.length} orders skipped; ${cleanupReport.errors.length} errors. Credit wallets of deleted accounts remain in credit_db.`);
if (cleanupReport?.errors.length) lines.push('', `Run-owned fixtures are still on the target. Remove them with \`node scripts/perf/run-perf.mjs --target ${targetUrl.origin} --cleanup-tag ${tag}\`.`);
lines.push('', '## Artifacts', '', '`manifest.json`, `thresholds.json`, `fixtures.json`, `results.json`, `reconciliation.json`, `cleanup.json`, `run.log`, and per workload `k6-summary.json`, `k6-metrics.json.gz`, `performance.json`, `k6.log`. The run-local credentials file was deleted.');
writeFileSync(path.join(runDirectory, 'summary.md'), `${lines.join('\n')}\n`);

log(`run ${runId}: ${overall}; evidence in ${runDirectory}`);
logFile.end();
process.exitCode = exitCode;
