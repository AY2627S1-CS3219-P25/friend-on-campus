/**
 * AI Assistance Disclosure:
 * Tool: Codex (model: GPT-6), date: 2026-11-09
 * Scope: Verify SDK export through Collector into Prometheus, Loki and Tempo.
 * Author review: <to be completed by yanhwee>
 */
// AI-generated (edited by yanhwee)
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { setTimeout as delay } from 'node:timers/promises';
const grafana = process.env.OBS_GRAFANA_URL ?? 'http://127.0.0.1:13000';
const prometheus = process.env.OBS_PROMETHEUS_URL ?? 'http://127.0.0.1:19090';
const endpoint = process.env.OTEL_EXPORTER_OTLP_ENDPOINT ?? 'http://127.0.0.1:14318';
const child = spawn(process.execPath, ['--import', 'tsx', '-e', `
  require('@campus-errand/observability/bootstrap');
  const { observeDelivery, serializeOutboxEvent, telemetryLog } = require('@campus-errand/observability');
  const { shutdownTelemetry } = require('@campus-errand/observability/bootstrap');
  (async () => {
    let stored;
    await observeDelivery(Buffer.from('{}'), 'smoke.request', 'smoke-producer', async () => {
      stored = serializeOutboxEvent({ eventId: 'smoke-event', eventType: 'smoke.delivery' });
      telemetryLog('observability.smoke');
    });
    await observeDelivery(Buffer.from(stored), 'smoke.delivery', 'smoke-consumer', async () => {
      telemetryLog('observability.smoke.consumer');
    });
    await shutdownTelemetry();
    console.log(JSON.parse(stored).traceContext.traceparent.split('-')[1]);
  })().catch(() => { process.exitCode = 1; });
`], { cwd: new URL('../..', import.meta.url), env: { ...process.env, OTEL_ENABLED: 'true', OTEL_SERVICE_NAME: 'observability-smoke', OTEL_TRACES_SAMPLER_ARG: '1', OTEL_EXPORTER_OTLP_ENDPOINT: endpoint }, stdio: ['ignore', 'pipe', 'inherit'] });
let output = '';
child.stdout.on('data', (chunk) => { output += chunk; });
await new Promise((resolve, reject) => { child.once('error', reject); child.once('exit', (code) => code === 0 ? resolve() : reject(new Error(`SDK emitter exited ${code}`))); });
const traceId = output.trim().split('\n').at(-1);
assert.match(traceId, /^[a-f0-9]{32}$/);
async function eventually(label, fn) {
  const deadline = Date.now() + 60000;
  while (Date.now() < deadline) {
    try { if (await fn()) { console.log(`${label}: passed`); return; } } catch { /* Backends may still be flushing. */ }
    await delay(1500);
  }
  throw new Error(`${label}: data unavailable after 60 seconds`);
}
await eventually('Prometheus SDK metrics', async () => {
  const url = new URL('/api/v1/query', prometheus);
  url.searchParams.set('query', 'app_messaging_deliveries_total{service_name="observability-smoke"}');
  const result = await (await fetch(url)).json();
  const series = result.data?.result ?? [];
  assert.ok(series.every((item) => !('process_command_args' in item.metric)));
  return series.some((item) => Number(item.value[1]) >= 1 && item.metric.service_instance_id);
});
await eventually('Loki SDK logs', async () => {
  const url = new URL('/api/datasources/proxy/uid/loki/loki/api/v1/query_range', grafana);
  url.searchParams.set('query', '{service_name="observability-smoke"} |= "observability.smoke"');
  const result = await (await fetch(url)).json();
  return result.data?.result?.length > 0;
});
await eventually('Tempo serialized event trace', async () => {
  const result = await fetch(`${grafana}/api/datasources/proxy/uid/tempo/api/traces/${traceId}`);
  if (!result.ok) return false;
  const body = await result.text();
  return body.includes('smoke-producer process') && body.includes('smoke-consumer process');
});
console.log(`All three SDK signals reached their backends; trace ${traceId}.`);
