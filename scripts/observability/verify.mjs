/**
 * AI Assistance Disclosure:
 * Tool: Codex (model: GPT-6), date: 2026-11-09
 * Scope: Isolated full-stack observability verification with ephemeral keys and cleanup.
 * Author review: <to be completed by yanhwee>
 */
// AI-generated (edited by yanhwee)
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { generateKeyPairSync } from 'node:crypto';
import { createServer } from 'node:net';
import { devNull } from 'node:os';
import { mkdir, writeFile, readFile } from 'node:fs/promises';
import { setTimeout as delay } from 'node:timers/promises';
const root = new URL('../..', import.meta.url);
const previous = process.argv.includes('--resume') ? JSON.parse(await readFile(new URL('../../test-results/observability/latest.json', import.meta.url), 'utf8')) : undefined;
const project = previous?.project ?? `foc-obs-verify-${process.pid}`;
if (!/^foc-obs-verify-[0-9]+$/.test(project)) throw new Error('Unexpected verification project name');
const ports = previous?.ports ?? {};
for (const key of (previous ? [] : ['gateway', 'postgres', 'rabbitmq', 'user', 'supplier', 'grafana', 'prometheus', 'otlp'])) {
  const server = createServer();
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  ports[key] = server.address().port;
  await new Promise((resolve) => server.close(resolve));
}
const { privateKey, publicKey } = generateKeyPairSync('ed25519');
const env = { ...process.env, COMPOSE_PARALLEL_LIMIT: '2',
  JWT_PRIVATE_KEY: privateKey.export({ format: 'der', type: 'pkcs8' }).toString('base64url'),
  JWT_PUBLIC_KEY: publicKey.export({ format: 'der', type: 'spki' }).toString('base64url'),
  TEST_GATEWAY_PORT: String(ports.gateway), TEST_POSTGRES_PORT: String(ports.postgres), TEST_RABBITMQ_PORT: String(ports.rabbitmq),
  TEST_USER_PORT: String(ports.user), TEST_SUPPLIER_PORT: String(ports.supplier),
  OBS_GRAFANA_PORT: String(ports.grafana), OBS_PROMETHEUS_PORT: String(ports.prometheus), OBS_OTLP_PORT: String(ports.otlp),
  OTEL_TRACES_SAMPLER_ARG: '1',
};
const prefix = ['compose', '--env-file', devNull, '-p', project, '-f', 'docker-compose.yml', '-f', 'compose.observability.yml', '-f', 'docker-compose.test.yml'];
function run(command, args, extra = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { cwd: root, env: { ...env, ...extra }, stdio: 'inherit' });
    child.once('error', reject); child.once('exit', (code) => code === 0 ? resolve() : reject(new Error(`${command} exited ${code}`)));
  });
}
async function eventually(label, fn) {
  for (let i = 0; i < 60; i++) { try { const value = await fn(); if (value) return value; } catch { /* dependencies may be starting */ } await delay(2000); }
  throw new Error(`${label} did not become ready`);
}
const gateway = `http://127.0.0.1:${ports.gateway}`;
const grafana = `http://127.0.0.1:${ports.grafana}`;
const reportDir = new URL('../../test-results/observability/', import.meta.url);
await mkdir(reportDir, { recursive: true });
await writeFile(new URL('latest.json', reportDir), JSON.stringify({ project, ports, started: new Date().toISOString(), status: 'running' }, null, 2));
try {
  await run(process.execPath, ['scripts/observability/prepare.mjs']);
  if (!previous) await run('docker', [...prefix, 'up', '-d', '--build', '--wait', '--wait-timeout', '420']);
  await eventually('Grafana', async () => (await fetch(`${grafana}/api/health`)).ok);
  await run(process.execPath, ['scripts/observability/smoke.mjs'], { OBS_GRAFANA_URL: grafana, OBS_PROMETHEUS_URL: `http://127.0.0.1:${ports.prometheus}`, OTEL_EXPORTER_OTLP_ENDPOINT: `http://127.0.0.1:${ports.otlp}` });
  const login = await fetch(`${gateway}/api/auth/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: 'alice@u.nus.edu', password: 'Password123!' }) });
  assert.equal(login.status, 200);
  const token = (await login.json()).data.accessToken;
  const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
  const suppliers = (await (await fetch(`${gateway}/api/suppliers`, { headers })).json()).data;
  const supplier = (Array.isArray(suppliers) ? suppliers : suppliers.suppliers)[0];
  assert.ok(supplier?.id);
  const traceId = generateKeyPairSync('ed25519').publicKey.export({ format: 'der', type: 'spki' }).subarray(-16).toString('hex');
  const response = await fetch(`${gateway}/api/orders`, { method: 'POST', headers: { ...headers, traceparent: `00-${traceId}-1234567890abcdef-01` }, body: JSON.stringify({ supplierId: supplier.id, itemDescription: 'Observability verification', dropoffLocation: 'COM1', rewardCredits: 5, durationMinutes: 60 }) });
  assert.equal(response.status, 202);
  const order = (await response.json()).data;
  await eventually('Reservation saga OPEN', async () => (await (await fetch(`${gateway}/api/orders/${order.id}`, { headers })).json()).data?.status === 'OPEN');
  await eventually('Actual CDC consumer trace', async () => {
    const result = await fetch(`${grafana}/api/datasources/proxy/uid/tempo/api/traces/${traceId}`);
    if (!result.ok) return false;
    const body = await result.text();
    return body.includes('credit-service.events process') && body.includes('order-service.events process') && body.includes('notification-service.events process');
  });
  const targets = await eventually('Infrastructure metrics', async () => {
    const data = await (await fetch(`http://127.0.0.1:${ports.prometheus}/api/v1/targets`)).json();
    const active = data.data.activeTargets;
    const infrastructure = active.filter((target) => ['debezium', 'rabbitmq', 'postgres', 'host', 'collector', 'readiness'].includes(target.labels.job));
    return infrastructure.length >= 14 && infrastructure.every((target) => target.health === 'up') ? active : false;
  });
  async function metric(query) {
    const url = new URL(`http://127.0.0.1:${ports.prometheus}/api/v1/query`);
    url.searchParams.set('query', query);
    return (await (await fetch(url)).json()).data?.result ?? [];
  }
  await eventually('PostgreSQL connection and workflow metrics', async () => {
    const health = await metric('pg_up');
    const workflow = await metric('pg_order_workflow_orders');
    return health.some((item) => item.value[1] === '1') && workflow.length > 0;
  });
  await eventually('All three Debezium connector metrics', async () => {
    const connected = await metric('debezium_streaming_connected');
    return connected.length === 3 && connected.every((item) => item.value[1] === '1');
  });
  if (process.argv.includes('--browser')) {
    const { chromium } = await import('playwright');
    const browser = await chromium.launch({ headless: true });
    try {
      const page = await browser.newPage();
      const captured = [];
      page.on('request', (request) => { if (request.url().endsWith('/telemetry/v1/logs')) captured.push(request.postData() ?? ''); });
      await page.goto(gateway);
      await page.evaluate(() => { setTimeout(() => { throw new Error('DO_NOT_EXPORT_PRIVATE_TEXT'); }, 0); });
      await eventually('Browser error ingestion', async () => {
        const url = new URL('/api/datasources/proxy/uid/loki/loki/api/v1/query_range', grafana);
        url.searchParams.set('query', '{service_name="student-app"} |= "browser.error"');
        return (await (await fetch(url)).json()).data?.result?.length > 0;
      });
      assert.ok(captured.length > 0);
      assert.ok(captured.every((body) => !body.includes('DO_NOT_EXPORT_PRIVATE_TEXT')));
    } finally { await browser.close(); }
  }
  await writeFile(new URL('latest.json', reportDir), JSON.stringify({ project, ports, status: 'passed', retained: process.argv.includes('--keep'), browserVerified: process.argv.includes('--browser'), traceId, orderId: order.id, targetCount: targets.length, completed: new Date().toISOString() }, null, 2));
  console.log(`Full-stack observability verification passed; trace ${traceId}.`);
} catch (error) {
  await writeFile(new URL('latest.json', reportDir), JSON.stringify({ project, ports, status: 'failed', retained: process.argv.includes('--keep'), error: String(error), completed: new Date().toISOString() }, null, 2));
  throw error;
} finally {
  if (!process.argv.includes('--keep')) await run('docker', [...prefix, 'down', '--volumes', '--remove-orphans']);
  else console.log(`Retained verification project ${project}; ports are in test-results/observability/latest.json. Do not reuse ephemeral authentication keys.`);
}
