/**
 * AI Assistance Disclosure:
 * Tool: Codex (model: GPT-6), date: 2026-11-09
 * Scope: Opt-in portable telemetry for the author-approved self-hosted stack.
 * Author review: <to be completed by yanhwee>
 */
// AI-generated (edited by yanhwee)
import { NodeSDK } from '@opentelemetry/sdk-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { OTLPMetricExporter } from '@opentelemetry/exporter-metrics-otlp-http';
import { OTLPLogExporter } from '@opentelemetry/exporter-logs-otlp-http';
import { hostname } from 'node:os';
import { PeriodicExportingMetricReader, AggregationType } from '@opentelemetry/sdk-metrics';
import { BatchLogRecordProcessor } from '@opentelemetry/sdk-logs';
import { HttpInstrumentation } from '@opentelemetry/instrumentation-http';
import { ExpressInstrumentation } from '@opentelemetry/instrumentation-express';
import { UndiciInstrumentation } from '@opentelemetry/instrumentation-undici';
import { RuntimeNodeInstrumentation } from '@opentelemetry/instrumentation-runtime-node';

let sdk: NodeSDK | undefined;
if (process.env.OTEL_ENABLED === 'true') {
  // Defaults are bounded; an unavailable collector must not block the application.
  process.env.OTEL_EXPORTER_OTLP_TIMEOUT ??= '1000';
  process.env.OTEL_BSP_MAX_QUEUE_SIZE ??= '512';
  process.env.OTEL_BSP_MAX_EXPORT_BATCH_SIZE ??= '128';
  process.env.OTEL_TRACES_SAMPLER ??= 'parentbased_traceidratio';
  process.env.OTEL_TRACES_SAMPLER_ARG ??= '0.1';
  if (!/(?:^|,)service\.instance\.id=/.test(process.env.OTEL_RESOURCE_ATTRIBUTES ?? '')) {
    process.env.OTEL_RESOURCE_ATTRIBUTES = [process.env.OTEL_RESOURCE_ATTRIBUTES, `service.instance.id=${hostname()}-${process.pid}`].filter(Boolean).join(',');
  }
  sdk = new NodeSDK({
    views: ['app.http.duration', 'app.messaging.duration', 'app.db.duration'].map((instrumentName) => ({
      instrumentName, aggregationCardinalityLimit: 2000,
      aggregation: { type: AggregationType.EXPLICIT_BUCKET_HISTOGRAM, options: { boundaries: [0.001, 0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10, 30] } },
    })),
    traceExporter: new OTLPTraceExporter(),
    metricReaders: [new PeriodicExportingMetricReader({
      exporter: new OTLPMetricExporter(), exportIntervalMillis: 5000, exportTimeoutMillis: 2000,
    })],
    logRecordProcessors: [new BatchLogRecordProcessor({ exporter: new OTLPLogExporter(),
      maxQueueSize: 512, maxExportBatchSize: 128, scheduledDelayMillis: 1000, exportTimeoutMillis: 2000,
    })],
    instrumentations: [
      new HttpInstrumentation({
        ignoreIncomingRequestHook: (req) => /^\/(health|ready)(?:[?]|$)/.test(req.url ?? ''),
      }),
      new ExpressInstrumentation(), new UndiciInstrumentation(), new RuntimeNodeInstrumentation(),
    ],
  });
  sdk.start();
  // Application signal handlers drain requests/consumers first. Export timers are unreferenced.
  process.once('beforeExit', () => { void shutdownTelemetry(); });
}

let stopping: Promise<void> | undefined;
export function shutdownTelemetry(): Promise<void> {
  return stopping ??= sdk?.shutdown().catch(() => {}) ?? Promise.resolve();
}
