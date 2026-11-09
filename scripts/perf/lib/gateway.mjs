// AI Assistance Disclosure:
// Tool: Claude Code (model: Claude Fable 5.1), date: 2026-11-08
// Scope: HTTP-only gateway client for the performance harness (issue #236/#237), following the
//        scripts/uat/uat-cdc.mjs conventions: no request or response bodies in errors, bounded polling,
//        redacted routes (query strings and UUIDs removed) in messages.
// Author review: <to be completed by Reallyeasy1>
//
// Tool: Claude Code (model: Claude Fable 5.1), date: 2026-11-09
// Scope: session(): a login that renews itself before its access token expires, as the k6 Session does. Run
//        perf-20261108T135152Z-b09772 reused one admin token for 26 minutes and its reconciliation and cleanup
//        got HTTP 401. The clock is injectable for the self-tests.
// Author review: <to be completed by Reallyeasy1>
// AI-generated (edited by Reallyeasy1)
import { setTimeout as delay } from 'node:timers/promises';

const UUID_PATTERN = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi;
// Same values as tests/k6/lib/perf.js: renew a minute early; 15 minutes when the login does not state a lifetime.
const RENEW_BEFORE_MS = 60_000;
const DEFAULT_TOKEN_TTL_SECONDS = 15 * 60;

export class GatewayError extends Error {
  constructor(message, status) {
    super(message);
    this.name = 'GatewayError';
    this.status = status;
  }
}

export function redactRoute(route) {
  return route.split('?')[0].replace(UUID_PATTERN, '{id}');
}

export function createGateway(baseUrl, { timeoutMs = 10_000, now = Date.now } = {}) {
  const base = baseUrl.replace(/\/$/, '');

  async function request(route, { method = 'GET', body, token } = {}) {
    const headers = {};
    if (body !== undefined) headers['Content-Type'] = 'application/json';
    if (token) headers.Authorization = `Bearer ${token}`;
    let response;
    try {
      response = await fetch(`${base}${route}`, {
        method,
        headers,
        body: body === undefined ? undefined : JSON.stringify(body),
        signal: AbortSignal.timeout(timeoutMs),
        redirect: 'manual',
      });
    } catch {
      throw new GatewayError(`${method} ${redactRoute(route)}: request failed or timed out`);
    }
    let json;
    try {
      json = await response.json();
    } catch {
      json = undefined;
    }
    return { status: response.status, json };
  }

  function expect(response, status, label) {
    if (response.status !== status) {
      throw new GatewayError(`${label}: expected HTTP ${status}, received HTTP ${response.status}`, response.status);
    }
    if (response.json?.success !== true) throw new GatewayError(`${label}: response did not indicate success`, response.status);
    return response.json.data;
  }

  async function login(email, password) {
    const response = await request('/api/auth/login', { method: 'POST', body: { email, password } });
    const data = expect(response, 200, 'POST /api/auth/login');
    if (typeof data.accessToken !== 'string' || data.accessToken.length === 0) throw new GatewayError('POST /api/auth/login: no access token');
    if (!data.user?.userId) throw new GatewayError('POST /api/auth/login: no user id');
    const ttlSeconds = Number(data.accessTokenExpiresInSeconds) || DEFAULT_TOKEN_TTL_SECONDS;
    return { token: data.accessToken, userId: data.user.userId, role: data.user.userRole, expiresAt: now() + ttlSeconds * 1000 };
  }

  /**
   * A login that renews itself. A run outlives one access token, so anything used after the k6 stages (the
   * administrator, the account logins of reconciliation and cleanup) asks token() each time instead of keeping a string.
   */
  function session(email, password) {
    let latest = null;
    let pending = null;
    async function current() {
      if (latest && now() < latest.expiresAt - RENEW_BEFORE_MS) return latest;
      // Parallel callers share one login.
      pending ??= login(email, password).then((fresh) => { latest = fresh; return fresh; }).finally(() => { pending = null; });
      return pending;
    }
    return { current, token: async () => (await current()).token };
  }

  return { base, request, expect, login, session };
}

/** Poll `probe` until it reports done or the deadline passes. The probe returns { done, state, value }. */
export async function until(name, probe, { timeoutMs, intervalMs = 250 }) {
  const deadline = Date.now() + timeoutMs;
  let lastState = 'not observed';
  for (;;) {
    const result = await probe();
    lastState = result.state;
    if (result.done) return result.value;
    if (Date.now() >= deadline) break;
    await delay(intervalMs);
  }
  throw new GatewayError(`${name}: timed out after ${timeoutMs} ms; last state: ${lastState}`);
}

/** Run `fn` over `items` with at most `limit` in flight; results keep input order. */
export async function mapLimit(items, limit, fn) {
  const results = new Array(items.length);
  let next = 0;
  async function worker() {
    for (;;) {
      const index = next;
      next += 1;
      if (index >= items.length) return;
      results[index] = await fn(items[index], index);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return results;
}
