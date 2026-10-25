/**
 * AI Assistance Disclosure:
 * Tool: Google Antigravity Agent, date: 2026-10-22
 * Scope: Created microservice health and readiness probe API client for the Admin Portal HealthPage.
 * Author review: <to be completed by yanhwee>
 */

// AI-generated (edited by yanhwee)

export type ServiceHealthKey = 'user' | 'supplier' | 'order' | 'credit' | 'notification';

export interface ServiceHealthSpec {
  key: ServiceHealthKey;
  name: string;
  port: number;
  db: string;
}

export interface ServiceHealthStatus extends ServiceHealthSpec {
  overall: 'ONLINE' | 'DEGRADED' | 'OFFLINE' | 'UNKNOWN';
  liveness: 'UP' | 'DOWN' | 'UNKNOWN';
  readiness: 'READY' | 'NOT_READY' | 'UNKNOWN';
  latencyMs: number | null;
  checkedAt: string;
  details?: string;
}

export const SERVICE_HEALTH_SPECS: ServiceHealthSpec[] = [
  { key: 'user', name: 'User Service (M2)', port: 8001, db: 'user_db (PostgreSQL)' },
  { key: 'supplier', name: 'Supplier Service (M3)', port: 8002, db: 'supplier_db (PostgreSQL)' },
  {
    key: 'order',
    name: 'Order Service (M4)',
    port: 8003,
    db: 'order_db (PostgreSQL) + Debezium CDC Outbox',
  },
  {
    key: 'credit',
    name: 'Credit Service (M5)',
    port: 8004,
    db: 'credit_db (PostgreSQL) + RabbitMQ',
  },
  {
    key: 'notification',
    name: 'Notification Service (M6)',
    port: 8005,
    db: 'notification_db (PostgreSQL) + RabbitMQ',
  },
];

async function fetchJsonWithTimeout(
  url: string,
  timeoutMs = 4000
): Promise<{ ok: boolean; body: Record<string, unknown> | null }> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      cache: 'no-store',
      signal: controller.signal,
    });
    const body = (await res.json().catch(() => null)) as Record<string, unknown> | null;
    return { ok: res.ok, body };
  } catch {
    return { ok: false, body: null };
  } finally {
    clearTimeout(timer);
  }
}

export async function probeServiceHealth(spec: ServiceHealthSpec): Promise<ServiceHealthStatus> {
  const start = performance.now();
  const [healthRes, readyRes] = await Promise.all([
    fetchJsonWithTimeout(`/api/health/${spec.key}/health`),
    fetchJsonWithTimeout(`/api/health/${spec.key}/ready`),
  ]);
  const elapsed = Math.max(1, Math.round(performance.now() - start));

  const liveness: 'UP' | 'DOWN' =
    healthRes.ok && healthRes.body?.status === 'UP' ? 'UP' : 'DOWN';
  const readiness: 'READY' | 'NOT_READY' =
    readyRes.ok && readyRes.body?.status === 'READY' ? 'READY' : 'NOT_READY';

  const overall: 'ONLINE' | 'DEGRADED' | 'OFFLINE' =
    liveness === 'DOWN' ? 'OFFLINE' : readiness === 'READY' ? 'ONLINE' : 'DEGRADED';

  let details: string | undefined;
  if (typeof healthRes.body?.activeWsClients === 'number') {
    const mq = typeof healthRes.body?.rabbitmq === 'string' ? healthRes.body.rabbitmq : undefined;
    details = `Active WebSocket Clients: ${healthRes.body.activeWsClients}${mq ? ` | RabbitMQ: ${mq}` : ''}`;
  }

  return {
    ...spec,
    overall,
    liveness,
    readiness,
    latencyMs: liveness === 'UP' || readiness === 'READY' ? elapsed : null,
    checkedAt: new Date().toISOString(),
    details,
  };
}

export async function fetchAllServicesHealthApi(): Promise<ServiceHealthStatus[]> {
  return Promise.all(SERVICE_HEALTH_SPECS.map((spec) => probeServiceHealth(spec)));
}
