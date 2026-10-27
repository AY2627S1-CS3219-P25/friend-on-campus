/**
 * AI Assistance Disclosure:
 * Tool: Google Antigravity Agent, date: 2026-10-22
 * Scope: Handled non-JSON error responses gracefully in adminLoginApi.
 * Author review: <to be completed by yanhwee>
 *
 * Tool: Google Antigravity Agent, date: 2026-10-19
 * Scope: Extracted admin authentication API calls into src/api/auth.ts.
 * Author review: Verified by yanhwee on 2026-10-19
 */

// AI-generated (edited by yanhwee)

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
    // AI-generated (edited by Reallyeasy1): issue #169; bounded so a dead backend does not hold the portal on a spinner.
    const res = await fetch('/api/auth/refresh', { method: 'POST', signal: AbortSignal.timeout(8000) });
    const data = await res.json();
    if (!res.ok || !data.success) return null;
    return data.data.accessToken as string;
  } catch {
    return null;
  }
}
