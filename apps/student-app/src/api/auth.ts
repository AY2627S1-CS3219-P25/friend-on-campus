/**
 * AI Assistance Disclosure:
 * Tool: Google Antigravity Agent, date: 2026-10-22
 * Scope: Handled non-JSON error responses (e.g. NGINX 502/503 HTML pages during container startup) gracefully in loginWithPassword and registerUserAccount.
 * Author review: <to be completed by yanhwee>
 *
 * Tool: Google Antigravity Agent, date: 2026-10-19
 * Scope: Extracted authentication API client functions from student-app App.tsx into modular api/auth.ts.
 * Author review: Verified by yanhwee
 */

// AI-generated (edited by yanhwee)

export type AuthFetchFn = (url: string, init?: RequestInit) => Promise<Response>;

export async function loginWithPassword(
  email: string,
  password: string,
  keepLoggedIn: boolean = false
): Promise<{ ok: true; accessToken: string } | { ok: false; code: string; message: string }> {
  const res = await fetch('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password, keepLoggedIn }),
  });
  const data = await res.json().catch(() => null);
  if (!res.ok || !data?.success) {
    return {
      ok: false,
      code: data?.code || `HTTP_${res.status}`,
      message:
        data?.error ||
        (res.status >= 500
          ? 'Authentication service is temporarily unavailable. Please try again in a moment.'
          : 'Login failed. Please check your credentials.'),
    };
  }
  return { ok: true, accessToken: data.data.accessToken as string };
}

export async function registerUserAccount(payload: {
  username: string;
  email: string;
  password: string;
}): Promise<{ ok: true } | { ok: false; code: string; message: string }> {
  const res = await fetch('/api/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const data = await res.json().catch(() => null);
  if (!res.ok || !data?.success) {
    return {
      ok: false,
      code: data?.code || `HTTP_${res.status}`,
      message:
        data?.error ||
        (res.status >= 500
          ? 'Registration service is temporarily unavailable. Please try again in a moment.'
          : 'Sign up failed.'),
    };
  }
  return { ok: true };
}

export async function refreshSessionAccessToken(): Promise<string | null> {
  try {
    // AI-generated (edited by Reallyeasy1): issue #169; a gateway that cannot reach User Service must not hold the
    // session check (and the whole app) on a spinner; after the timeout the login form shows with its error path.
    const res = await fetch('/api/auth/refresh', { method: 'POST', signal: AbortSignal.timeout(8000) });
    const data = await res.json();
    if (!res.ok || !data.success) return null;
    return data.data.accessToken as string;
  } catch {
    return null;
  }
}

export async function logoutSession(): Promise<void> {
  try {
    await fetch('/api/auth/logout', { method: 'POST' });
  } catch {
    // Ignore network failure during logout so local session is still cleared.
  }
}
