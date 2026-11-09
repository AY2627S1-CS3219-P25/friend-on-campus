/**
 * AI Assistance Disclosure:
 * Tool: Codex (model: GPT-6), date: 2026-11-09
 * Scope: Optional browser error, network and WebSocket diagnostics without user content.
 * Author review: <to be completed by yanhwee>
 */
// AI-generated (edited by yanhwee)
export function startBrowserTelemetry(service: 'student-app' | 'admin-portal', enabled: boolean) {
  if (!enabled || typeof window === 'undefined') return;
  const originalFetch = window.fetch.bind(window);
  let count = 0;
  let intervalStart = Date.now();
  function report(event: string, extra: Record<string, string | number> = {}) {
    const now = Date.now();
    if (now - intervalStart >= 60_000) { count = 0; intervalStart = now; }
    if (++count > 30) return;
    const attributes = Object.entries(extra).map(([key, value]) => ({ key, value: typeof value === 'number' ? { intValue: String(value) } : { stringValue: value } }));
    // Do not send error messages, stacks, page URLs, API paths, bodies or user identities.
    const payload = { resourceLogs: [{ resource: { attributes: [{ key: 'service.name', value: { stringValue: service } }] }, scopeLogs: [{ scope: { name: 'campus-browser' }, logRecords: [{ timeUnixNano: String(BigInt(now) * 1000000n), severityNumber: 9, body: { stringValue: event }, attributes }] }] }] };
    void originalFetch('/telemetry/v1/logs', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload), credentials: 'omit', keepalive: true }).catch(() => {});
  }
  window.addEventListener('error', () => report('browser.error'));
  window.addEventListener('unhandledrejection', () => report('browser.unhandled_rejection'));
  window.fetch = async (input, init) => {
    const url = new URL(input instanceof Request ? input.url : String(input), window.location.href);
    if (url.origin !== window.location.origin || !url.pathname.startsWith('/api/')) return originalFetch(input, init);
    const started = performance.now();
    try {
      const response = await originalFetch(input, init);
      if (!response.ok) report('browser.api_failure', { status: response.status, duration_ms: Math.round(performance.now() - started) });
      return response;
    } catch (error) { report('browser.network_failure'); throw error; }
  };
  // addEventListener preserves application onopen/onclose handlers and reconnection behavior.
  const OriginalSocket = window.WebSocket;
  window.WebSocket = class ObservedWebSocket extends OriginalSocket {
    constructor(url: string | URL, protocols?: string | string[]) {
      super(url, protocols);
      this.addEventListener('open', () => report('browser.websocket_open'));
      this.addEventListener('close', (event) => report('browser.websocket_close', { code: event.code, clean: event.wasClean ? 1 : 0 }));
      this.addEventListener('error', () => report('browser.websocket_error'));
    }
  };
}
