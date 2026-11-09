/**
 * AI Assistance Disclosure:
 * Tool: Codex (model: GPT-6), date: 2026-11-09
 * Scope: Verify serialized asynchronous context, legacy compatibility and failure semantics.
 * Author review: <to be completed by yanhwee>
 */
// AI-generated (edited by yanhwee)
import assert from 'node:assert/strict';
import { after, test } from 'node:test';
import { trace, SpanStatusCode } from '@opentelemetry/api';
import { NodeSDK } from '@opentelemetry/sdk-node';
import { InMemorySpanExporter, SimpleSpanProcessor } from '@opentelemetry/sdk-trace';
import { serializeOutboxEvent, observeDelivery, instrumentDatabase } from '../src/index';

const exporter = new InMemorySpanExporter();
const provider = new NodeSDK({
  autoDetectResources: false,
  spanProcessors: [new SimpleSpanProcessor({ exporter })],
  logRecordProcessors: [], metricReaders: [],
});
provider.start();
after(() => provider.shutdown());
const tracer = trace.getTracer('test');

test('persisted event connects later consumer to the original trace without changing business fields', async () => {
  process.env.OTEL_ENABLED = 'true';
  let parentId = ''; let traceId = ''; let stored = '';
  const original = { eventId: 'event-1', eventType: 'order.reservation.requested', orderId: 'order-1', correlationId: 'order-1' };
  tracer.startActiveSpan('request', (span) => {
    parentId = span.spanContext().spanId; traceId = span.spanContext().traceId;
    stored = serializeOutboxEvent(original); span.end();
  });
  const payload = JSON.parse(stored);
  assert.equal(payload.traceContext.traceparent.split('-')[1], traceId);
  assert.equal('traceContext' in original, false);
  assert.deepEqual({ ...payload, traceContext: undefined }, { ...original, traceContext: undefined });
  const result = await observeDelivery(Buffer.from(stored), original.eventType, 'credit-service.events', async () => {
    assert.equal(trace.getActiveSpan()?.spanContext().traceId, traceId);
    return 42;
  });
  assert.equal(result, 42);
  const consumer = exporter.getFinishedSpans().find((span) => span.name === 'credit-service.events process');
  assert.equal(consumer?.parentSpanContext?.spanId, parentId);
  assert.equal(consumer?.attributes['app.orderId'], 'order-1');
});

test('legacy and malformed metadata do not prevent normal handler validation', async () => {
  process.env.OTEL_ENABLED = 'true';
  for (const payload of ['{}', '{"traceContext":{"traceparent":12}}', 'invalid-json']) {
    let calls = 0;
    await observeDelivery(Buffer.from(payload), 'event', 'queue', async () => { calls++; });
    assert.equal(calls, 1);
  }
});

test('handler failure is rethrown unchanged and does not export its sensitive message', async () => {
  const error = new Error('sensitive-password-and-body');
  await assert.rejects(observeDelivery(Buffer.from('{}'), 'event', 'failure-queue', async () => { throw error; }), (actual) => actual === error);
  const span = exporter.getFinishedSpans().find((item) => item.name === 'failure-queue process');
  assert.equal(span?.status.code, SpanStatusCode.ERROR);
  assert.equal(JSON.stringify(span?.attributes).includes(error.message), false);
  assert.equal(span?.events.length, 0);
});

test('disabled telemetry preserves serialized payload and original Prisma instance', async () => {
  process.env.OTEL_ENABLED = 'false';
  const event = { eventId: 'same', timestamp: 'unchanged' };
  assert.equal(serializeOutboxEvent(event), JSON.stringify(event));
  const client = { sentinel: true };
  assert.equal(instrumentDatabase(client), client);
  assert.equal(await observeDelivery(Buffer.from('{}'), 'event', 'queue', async () => 7), 7);
});

test('database extension preserves query arguments and error identity without recording SQL', async () => {
  process.env.OTEL_ENABLED = 'true';
  let operation: (input: { operation: string; args: unknown; query: (args: unknown) => Promise<unknown> }) => Promise<unknown>;
  const client = { $extends(extension: unknown) { operation = (extension as { query: { $allOperations: typeof operation } }).query.$allOperations; return this; } };
  instrumentDatabase(client);
  const args = { query: 'SELECT private_value FROM private_table' };
  assert.equal(await operation!({ operation: '$queryRaw', args, query: async (actual) => { assert.equal(actual, args); return 123; } }), 123);
  const span = exporter.getFinishedSpans().at(-1);
  assert.equal(JSON.stringify(span?.attributes).includes('private_value'), false);
});
