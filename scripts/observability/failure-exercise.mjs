/**
 * AI Assistance Disclosure:
 * Tool: Codex (model: GPT-6), date: 2026-11-09
 * Scope: Exercise broker backlog and recovery only in the disposable verification project.
 * Author review: <to be completed by yanhwee>
 */
// AI-generated (edited by yanhwee)
import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import { setTimeout as delay } from 'node:timers/promises';
const reportUrl = new URL('../../test-results/observability/latest.json', import.meta.url);
const report = JSON.parse(await readFile(reportUrl, 'utf8'));
if (!/^foc-obs-verify-[0-9]+$/.test(report.project)) throw new Error('Only a disposable verification project can be exercised');
const gateway = `http://127.0.0.1:${report.ports.gateway}`;
const prometheus = `http://127.0.0.1:${report.ports.prometheus}`;
const credit = `${report.project}-credit-service-1`;
function docker(action, container) {
  return new Promise((resolve, reject) => {
    const child = spawn('docker', [action, container], { stdio: 'inherit' });
    child.once('error', reject); child.once('exit', (code) => code === 0 ? resolve() : reject(new Error(`Docker ${action} failed`)));
  });
}
async function metric(query) {
  const url = new URL('/api/v1/query', prometheus); url.searchParams.set('query', query);
  return (await (await fetch(url)).json()).data?.result ?? [];
}
async function eventually(label, fn) {
  for (let i = 0; i < 60; i++) { if (await fn()) { console.log(`${label}: passed`); return; } await delay(1500); }
  throw new Error(`${label}: timed out`);
}
const login = await fetch(`${gateway}/api/auth/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: 'alice@u.nus.edu', password: 'Password123!' }) });
assert.equal(login.status, 200);
const token = (await login.json()).data.accessToken;
const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
const supplier = (await (await fetch(`${gateway}/api/suppliers`)).json()).data.suppliers[0];
let order;
try {
  await docker('stop', credit);
  const response = await fetch(`${gateway}/api/orders`, { method: 'POST', headers, body: JSON.stringify({ supplierId: supplier.id, itemDescription: 'Disposable monitoring failure exercise', dropoffLocation: 'COM1', rewardCredits: 1, durationMinutes: 60 }) });
  assert.equal(response.status, 202); order = (await response.json()).data;
  assert.equal(order.status, 'PENDING');
  await eventually('Consumer outage detected', async () => (await metric('probe_success{instance="http://credit-service:8004/ready"}')).some((item) => item.value[1] === '0'));
  await eventually('Broker backlog detected', async () => (await metric('rabbitmq_queue_messages_ready{queue="credit-service.events"}')).some((item) => Number(item.value[1]) > 0));
  await eventually('Pending workflow detected', async () => (await metric('pg_order_workflow_oldest_pending_seconds{status="PENDING"}')).some((item) => Number(item.value[1]) > 0));
} finally { await docker('start', credit); }
await eventually('Order recovered to OPEN', async () => (await (await fetch(`${gateway}/api/orders/${order.id}`, { headers })).json()).data?.status === 'OPEN');
await eventually('Broker backlog drained', async () => (await metric('rabbitmq_queue_messages_ready{queue="credit-service.events"}')).every((item) => Number(item.value[1]) === 0));
await writeFile(reportUrl, JSON.stringify({ ...report, consumerFailureExercise: 'passed', failureExerciseOrderId: order.id }, null, 2));
console.log('Consumer failure and recovery verified without touching the original application stack.');
