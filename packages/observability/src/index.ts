/**
 * AI Assistance Disclosure:
 * Tool: Codex (model: GPT-6), date: 2026-11-09
 * Scope: Opt-in portable telemetry for the author-approved self-hosted stack.
 * Author review: <to be completed by yanhwee>
 */
// AI-generated (edited by yanhwee)
import { context, propagation, trace, metrics, ROOT_CONTEXT, SpanKind, SpanStatusCode, type Attributes } from '@opentelemetry/api';
import { logs, SeverityNumber } from '@opentelemetry/api';
import type { RequestHandler } from 'express';

const tracer = trace.getTracer('campus-errand');
const meter = metrics.getMeter('campus-errand');
const requests = meter.createCounter('app.http.requests');
const duration = meter.createHistogram('app.http.duration', { unit: 's' });
const deliveries = meter.createCounter('app.messaging.deliveries');
const actions = meter.createCounter('app.messaging.actions');
const processing = meter.createHistogram('app.messaging.duration', { unit: 's' });
const events = meter.createCounter('app.outbox.events');
const sockets = meter.createUpDownCounter('app.websocket.connections');
const socketEvents = meter.createCounter('app.websocket.events');
const dbDuration = meter.createHistogram('app.db.duration', { unit: 's' });

export function telemetryLog(event: string, attributes: Attributes = {}, error = false) {
  if (process.env.OTEL_ENABLED !== 'true') return;
  logs.getLogger('campus-errand').emit({
    body: event, attributes, severityNumber: error ? SeverityNumber.ERROR : SeverityNumber.INFO,
    severityText: error ? 'ERROR' : 'INFO', context: context.active(),
  });
}

export const requestTelemetry: RequestHandler = (req, res, next) => {
  if (process.env.OTEL_ENABLED !== 'true' || /^\/(health|ready)$/.test(req.path)) { next(); return; }
  const started = performance.now();
  const span = trace.getActiveSpan();
  res.once('finish', () => {
    // A route template, never a raw path containing user IDs or a query string.
    const route = typeof req.route?.path === 'string' ? req.route.path : 'unmatched';
    const method = /^(GET|POST|PUT|PATCH|DELETE|HEAD|OPTIONS)$/.test(req.method) ? req.method : 'OTHER';
    const attrs = { 'http.request.method': method, 'http.route': route, 'http.response.status_code': res.statusCode };
    requests.add(1, attrs); duration.record((performance.now() - started) / 1000, attrs);
    span?.setAttribute('http.route', route);
    telemetryLog('http.request.completed', attrs, res.statusCode >= 500);
  });
  next();
};

export interface TraceMetadata { traceparent?: string; tracestate?: string }
export function withTraceContext<T extends object>(event: T): T & { traceContext?: TraceMetadata } {
  if (process.env.OTEL_ENABLED !== 'true') return event;
  const carrier: Record<string, string> = {};
  propagation.inject(context.active(), carrier);
  if (!carrier.traceparent) return event;
  return { ...event, traceContext: { traceparent: carrier.traceparent, ...(carrier.tracestate ? { tracestate: carrier.tracestate } : {}) } };
}

export function serializeOutboxEvent<T extends object>(event: T): string {
  const result = JSON.stringify(withTraceContext(event));
  if (process.env.OTEL_ENABLED === 'true') {
    const eventType = (event as { eventType?: unknown })?.eventType;
    // An attempt counter, NOT a committed or published event counter: surrounding transactions may roll back.
    events.add(1, { 'event.type': typeof eventType === 'string' ? eventType : 'unknown' });
  }
  return result;
}

export async function observeDelivery<T>(body: Buffer, routingKey: string, queue: string, handle: () => Promise<T>): Promise<T> {
  if (process.env.OTEL_ENABLED !== 'true') return handle();
  let event: Record<string, unknown> = {};
  try { const parsed: unknown = JSON.parse(body.toString('utf8')); if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) event = parsed as Record<string, unknown>; } catch { /* handler retains validation ownership */ }
  const metadata = event.traceContext;
  const carrier: Record<string, string> = {};
  if (metadata && typeof metadata === 'object') {
    const candidate = metadata as TraceMetadata;
    if (typeof candidate.traceparent === 'string' && candidate.traceparent.length <= 128) carrier.traceparent = candidate.traceparent;
    if (typeof candidate.tracestate === 'string' && candidate.tracestate.length <= 512) carrier.tracestate = candidate.tracestate;
  }
  const parent = propagation.extract(ROOT_CONTEXT, carrier);
  const attrs = { 'messaging.system': 'rabbitmq', 'messaging.destination.name': queue, 'messaging.operation.type': 'process', 'messaging.rabbitmq.destination.routing_key': routingKey };
  return tracer.startActiveSpan(`${queue} process`, { kind: SpanKind.CONSUMER, attributes: attrs }, parent, async (span) => {
    const started = performance.now();
    const ids: Attributes = {};
    for (const key of ['eventId', 'correlationId', 'orderId']) if (typeof event[key] === 'string' && event[key].length <= 128) { span.setAttribute(`app.${key}`, event[key]); ids[`app.${key}`] = event[key]; }
    try {
      const result = await handle();
      deliveries.add(1, { queue, routing_key: routingKey, outcome: 'success' });
      telemetryLog('message.processed', { queue, routing_key: routingKey, ...ids });
      return result;
    } catch (error) {
      deliveries.add(1, { queue, routing_key: routingKey, outcome: 'failure' });
      span.setStatus({ code: SpanStatusCode.ERROR });
      telemetryLog('message.failed', { queue, routing_key: routingKey, ...ids }, true);
      throw error;
    } finally { processing.record((performance.now() - started) / 1000, { queue, routing_key: routingKey }); span.end(); }
  });
}

export function observeSocket(socket: { once: (event: string, listener: () => void) => unknown; on: (event: string, listener: () => void) => unknown }, channel: 'chat' | 'notification') {
  if (process.env.OTEL_ENABLED !== 'true') return;
  sockets.add(1, { channel }); socketEvents.add(1, { channel, event: 'connected' });
  socket.once('close', () => { sockets.add(-1, { channel }); socketEvents.add(1, { channel, event: 'closed' }); });
  socket.on('error', () => socketEvents.add(1, { channel, event: 'error' }));
}

export function instrumentDatabase<T>(client: T): T {
  if (process.env.OTEL_ENABLED !== 'true') return client;
  // Prisma's native engine does not run queries through Node's pg driver.
  const extendable = client as { $extends: (extension: unknown) => T };
  return extendable.$extends({ name: 'observability', query: {
    async $allOperations({ model, operation, args, query }: { model?: string; operation: string; args: unknown; query: (args: unknown) => Promise<unknown> }) {
      const attrs = { 'db.system': 'postgresql', 'db.operation.name': operation, 'db.collection.name': model ?? 'raw' };
      return tracer.startActiveSpan(`postgresql ${model ?? 'raw'}.${operation}`, { kind: SpanKind.CLIENT, attributes: attrs }, async (span) => {
        const started = performance.now();
        try { return await query(args); }
        catch (error) { span.setStatus({ code: SpanStatusCode.ERROR }); throw error; }
        finally { dbDuration.record((performance.now() - started) / 1000, attrs); span.end(); }
      });
    },
  } });
}

export function recordDeliveryAction(queue: string, routingKey: string, action: 'ack' | 'retry' | 'dlq') {
  if (process.env.OTEL_ENABLED === 'true') actions.add(1, { queue, routing_key: routingKey, action });
}

export async function observePublish<T>(exchange: string, routingKey: string, body: unknown, send: (body: unknown) => Promise<T>): Promise<T> {
  if (process.env.OTEL_ENABLED !== 'true') return send(body);
  return tracer.startActiveSpan(`${exchange} send`, { kind: SpanKind.PRODUCER, attributes: { 'messaging.system': 'rabbitmq', 'messaging.destination.name': exchange, 'messaging.rabbitmq.destination.routing_key': routingKey } }, async (span) => {
    try { return await send(body && typeof body === 'object' && !Buffer.isBuffer(body) && !Array.isArray(body) ? withTraceContext(body) : body); }
    catch (error) { span.setStatus({ code: SpanStatusCode.ERROR }); throw error; }
    finally { span.end(); }
  });
}
