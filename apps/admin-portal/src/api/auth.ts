/**
 * AI Assistance Disclosure:
 * Tool: Google Antigravity Agent, date: 2026-10-19 to 2026-10-22
 * Scope: Extracted admin authentication API calls into src/api/auth.ts; updated across 2 AI-assisted revisions through D4 wrap-up (handled non-JSON error responses gracefully in adminLoginApi).
 * Author review: I validated correctness, edited for style, and verified with automated tests.
 */


export async function adminLoginApi(email: string, password: string, keepLoggedIn: boolean) {
  const res = await fetch('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password, keepLoggedIn }),
  });
  const data = await res.json().catch(() => null);
  return { res, data };
}

export async function adminLogoutApi() {
  await fetch('/api/auth/logout', { method: 'POST' });
}

export async function adminRefreshTokenApi(): Promise<string | null> {
  try {
    // Issue #169; bounded so a dead backend does not hold the portal on a spinner.
    const res = await fetch('/api/auth/refresh', { method: 'POST', signal: AbortSignal.timeout(8000) });
    const data = await res.json();
    if (!res.ok || !data.success) return null;
    return data.data.accessToken as string;
  } catch {
    return null;
  }
}
