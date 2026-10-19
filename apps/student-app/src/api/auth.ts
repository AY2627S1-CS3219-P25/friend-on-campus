/**
 * AI Assistance Disclosure:
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
  const data = await res.json();
  if (!res.ok || !data.success) {
    return { ok: false, code: data.code || `HTTP_${res.status}`, message: data.error };
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
  const data = await res.json();
  if (!res.ok || !data.success) {
    return {
      ok: false,
      code: data.code || `HTTP_${res.status}`,
      message: data.error || 'Sign up failed.',
    };
  }
  return { ok: true };
}

export async function refreshSessionAccessToken(): Promise<string | null> {
  try {
    const res = await fetch('/api/auth/refresh', { method: 'POST' });
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
