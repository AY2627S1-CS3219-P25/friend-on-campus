/**
 * AI Assistance Disclosure:
 * Tool: Google Antigravity Agent; Claude Code (model: Claude Fable 5.1), date: 2026-10-19 to 2026-11-10
 * Scope: Extracted authentication session state, silent refresh, and authFetch hook from student-app App.tsx into hooks/useAuthSession.ts; updated across 6 AI-assisted revisions through D4 wrap-up (reset sign-up form state on session clear and after registration (#170), and surface post-registration auto-login failures on the login view via loginError..).
 * Author review: I validated correctness, edited for style, and verified with automated tests.
 */


import React, { useEffect, useRef, useState } from 'react';
import {
  loginWithPassword,
  logoutSession,
  refreshSessionAccessToken,
  registerUserAccount,
} from '../api/auth';
import { tokenUserId } from '../orders/useOrderSubmission';

export interface SignupFormData {
  username: string;
  email: string;
  password: string;
  retypePassword: string;
}

export const EMPTY_SIGNUP_DATA: SignupFormData = {
  username: '',
  email: '',
  password: '',
  retypePassword: '',
};

export type SignupFlowOutcome =
  | { kind: 'authenticated'; accessToken: string }
  | { kind: 'registration_failed'; error: { code: string; message: string } }
  | { kind: 'auto_login_failed'; email: string; error: { code: string; message: string } };

/**
 * Runs account registration followed by automatic sign-in, keeping registration failures distinct from
 * post-registration sign-in failures so a created account always transitions to the login view (issue #204).
 */
export async function runSignupWithAutoLogin(
  input: { username: string; email: string; password: string },
  deps: {
    register?: typeof registerUserAccount;
    login?: typeof loginWithPassword;
  } = {},
): Promise<SignupFlowOutcome> {
  const register = deps.register ?? registerUserAccount;
  const login = deps.login ?? loginWithPassword;
  try {
    const regResult = await register({
      username: input.username.trim(),
      email: input.email,
      password: input.password,
    });
    if (!regResult.ok) {
      return {
        kind: 'registration_failed',
        error: { code: regResult.code, message: regResult.message },
      };
    }
  } catch (err) {
    return {
      kind: 'registration_failed',
      error: {
        code: 'NETWORK_ERROR',
        message: (err instanceof Error && err.message) || 'Could not reach the registration server.',
      },
    };
  }

  try {
    const loginResult = await login(input.email, input.password);
    if (!loginResult.ok) {
      return {
        kind: 'auto_login_failed',
        email: input.email,
        error: {
          code: loginResult.code || 'AUTO_LOGIN_FAILED',
          message:
            loginResult.message ||
            'Account created, but automatic login failed. Please sign in with your new account.',
        },
      };
    }
    return { kind: 'authenticated', accessToken: loginResult.accessToken };
  } catch {
    return {
      kind: 'auto_login_failed',
      email: input.email,
      error: {
        code: 'AUTO_LOGIN_FAILED',
        message: 'Account created, but automatic login could not reach the server. Please sign in with your new account.',
      },
    };
  }
}

/** Default deadline for reads and actions sent through authFetch; create (15 s) and the pending poll (10 s) pass their own signal. */
export const REQUEST_DEADLINE_MS = 10_000;

/**
 * A hung service (N4-O4: delayed, not refused) must produce a bounded error, not hold a screen open until the browser
 * gives up. A caller-supplied signal wins, so existing explicit policies are unchanged. The timeout starts when the
 * request is built, so a retry after token refresh gets a fresh deadline. A session signal, when given, also aborts
 * the request (with AbortError, not TimeoutError) once the account that started it has signed out.
 */
export function withRequestDeadline(
  init: RequestInit,
  deadlineMs = REQUEST_DEADLINE_MS,
  sessionSignal?: AbortSignal,
): RequestInit {
  if (init.signal) return init;
  const deadline = AbortSignal.timeout(deadlineMs);
  return { ...init, signal: sessionSignal ? AbortSignal.any([sessionSignal, deadline]) : deadline };
}

/** An explicit cancel (session ended); unlike a TimeoutError it is never retried. */
export function isAborted(error: unknown): boolean {
  return error instanceof DOMException && error.name === 'AbortError';
}

/** Safe-read retry budget: total attempts, and the full-jitter backoff base (pause n is drawn from [0, base · 2^n)). */
export const READ_RETRY_ATTEMPTS = 3;
export const READ_RETRY_BASE_MS = 300;

/**
 * Only idempotent reads running under the default deadline are retried. A POST/PATCH/DELETE is never replayed (the
 * server may have applied it), and a caller-owned signal means the caller already has its own policy (create, poll).
 */
export function isSafeRead(init: RequestInit): boolean {
  const method = (init.method ?? 'GET').toUpperCase();
  return (method === 'GET' || method === 'HEAD') && !init.signal;
}

export function readRetryDelayMs(attempt: number, random: () => number = Math.random): number {
  return Math.floor(random() * READ_RETRY_BASE_MS * 2 ** attempt);
}

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

/**
 * Runs a safe read up to `attempts` times. A thrown error (network failure, deadline abort) or a 5xx is retried after
 * a jittered pause; 2xx/3xx/4xx return at once, and an AbortError (the session that started the read has ended) is
 * rethrown at once. The last attempt's outcome is returned or rethrown unchanged, so the callers' existing error
 * handling still applies.
 * ponytail: worst case is attempts × deadline (~30 s) against a hung service; lower READ_RETRY_ATTEMPTS if a screen
 * needs a tighter bound.
 */
export async function retrySafeRead(
  run: () => Promise<Response>,
  attempts = READ_RETRY_ATTEMPTS,
  wait: (ms: number) => Promise<void> = sleep,
  delayMs: (attempt: number) => number = readRetryDelayMs,
): Promise<Response> {
  for (let attempt = 0; ; attempt++) {
    const last = attempt >= attempts - 1;
    try {
      const res = await run();
      if (res.status < 500 || last) return res;
    } catch (error) {
      if (last || isAborted(error)) throw error;
    }
    await wait(delayMs(attempt));
  }
}

/** Copy from the N4 design table, row "Write response lost". */
export const UNCONFIRMED_WRITE_MESSAGE = "We couldn't confirm the result. Check this errand before trying again.";

/** The deadline abort (AbortSignal.timeout) or fetch's network failure: the request may have reached the server. */
export function isResponseLost(error: unknown): boolean {
  return (error instanceof DOMException && error.name === 'TimeoutError') || error instanceof TypeError;
}

/**
 * Message for a failed lifecycle write. A lost response is reported as unconfirmed rather than as a failure, because
 * the server may have applied the action and "failed" would invite a replay.
 */
export function describeWriteFailure(error: unknown, fallback: string): string {
  if (isResponseLost(error)) return UNCONFIRMED_WRITE_MESSAGE;
  return error instanceof Error && error.message ? error.message : fallback;
}

export function useAuthSession(onSessionCleared: () => void) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isCheckingSession, setIsCheckingSession] = useState(true);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [authToken, setAuthToken] = useState('');
  const [authView, setAuthView] = useState<'login' | 'signup'>('login');

  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [loginError, setLoginError] = useState<{ code: string; message: string } | null>(null);

  const [signupData, setSignupData] = useState<SignupFormData>({
    username: '',
    email: '',
    password: '',
    retypePassword: '',
  });
  const [isSigningUp, setIsSigningUp] = useState(false);
  const [signupError, setSignupError] = useState<{ code: string; message: string } | null>(null);

  const refreshInFlight = useRef<Promise<string | null> | null>(null);
  // One controller per signed-in session. Clearing the session aborts every
  // request (and pending retry) that session started, so a 503 retry cannot run with the previous account's token
  // after the next account signs in (PR #225 review, P1).
  const sessionAbort = useRef(new AbortController());

  const refreshAccessToken = (): Promise<string | null> => {
    if (!refreshInFlight.current) {
      refreshInFlight.current = (async () => {
        try {
          const token = await refreshSessionAccessToken();
          if (token) {
            setAuthToken(token);
          }
          return token;
        } finally {
          refreshInFlight.current = null;
        }
      })();
    }
    return refreshInFlight.current;
  };

  useEffect(() => {
    refreshAccessToken()
      .then((token) => {
        if (token) setIsAuthenticated(true);
      })
      .finally(() => setIsCheckingSession(false));
  }, []);

  const clearLocalSession = () => {
    sessionAbort.current.abort(new DOMException('Session ended', 'AbortError'));
    sessionAbort.current = new AbortController();
    onSessionCleared();
    setIsAuthenticated(false);
    setAuthToken('');
    setAuthView('login');
    setLoginEmail('');
    setLoginPassword('');
    setLoginError(null);
    setRememberMe(false);
    // Clear sign-up form state when session ends (issue #170).
    setSignupData(EMPTY_SIGNUP_DATA);
    setSignupError(null);
  };

  const authFetch = async (url: string, init: RequestInit = {}): Promise<Response> => {
    let token = authToken;
    // Captured here, not in send(): a retry after the session changed must abort, not borrow the new session.
    const session = sessionAbort.current.signal;
    const send = () =>
      fetch(url, {
        ...withRequestDeadline(init, REQUEST_DEADLINE_MS, session),
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      });
    // One attempt, with the 401 refresh; safe reads repeat it with backoff.
    const attempt = async (): Promise<Response> => {
      const res = await send();
      if (res.status !== 401) return res;
      const fresh = await refreshAccessToken();
      if (!fresh) {
        clearLocalSession();
        return res;
      }
      token = fresh;
      return send();
    };
    return isSafeRead(init) ? retrySafeRead(attempt) : attempt();
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoggingIn(true);
    setLoginError(null);
    try {
      const result = await loginWithPassword(loginEmail, loginPassword, rememberMe);
      if (!result.ok) {
        setLoginError({
          code: result.code,
          message: result.message || 'Login failed. Please check your credentials.',
        });
        return;
      }
      setAuthToken(result.accessToken);
      setIsAuthenticated(true);
    } catch (err) {
      setLoginError({
        code: 'NETWORK_ERROR',
        message: (err instanceof Error && err.message) || 'Could not reach the authentication server.',
      });
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setSignupError(null);

    if (
      !signupData.username.trim() ||
      !signupData.email ||
      !signupData.password ||
      !signupData.retypePassword
    ) {
      setSignupError({
        code: 'VALIDATION_ERROR',
        message: 'Please fill in all required fields marked with *.',
      });
      return;
    }
    if (signupData.password !== signupData.retypePassword) {
      setSignupError({ code: 'PASSWORD_MISMATCH', message: 'Passwords do not match.' });
      return;
    }
    if (signupData.password.length < 8 || signupData.password.length > 24) {
      setSignupError({
        code: 'INVALID_PASSWORD',
        message: 'Password must be between 8 and 24 characters long.',
      });
      return;
    }

    setIsSigningUp(true);
    try {
      // Keep post-registration auto-login failures on loginError and reset sign-up fields (#170, #204).
      const outcome = await runSignupWithAutoLogin({
        username: signupData.username,
        email: signupData.email,
        password: signupData.password,
      });
      if (outcome.kind === 'registration_failed') {
        setSignupError(outcome.error);
        return;
      }
      setSignupData(EMPTY_SIGNUP_DATA);
      setSignupError(null);
      setAuthView('login');
      if (outcome.kind === 'auto_login_failed') {
        setLoginEmail(outcome.email);
        setLoginPassword('');
        setLoginError(outcome.error);
        return;
      }
      setLoginError(null);
      setAuthToken(outcome.accessToken);
      setIsAuthenticated(true);
    } finally {
      setIsSigningUp(false);
    }
  };

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await logoutSession();
    } finally {
      clearLocalSession();
      setIsLoggingOut(false);
    }
  };

  const currentUserId = isAuthenticated ? tokenUserId(authToken) : null;

  return {
    isAuthenticated,
    isCheckingSession,
    isLoggingOut,
    authToken,
    authView,
    setAuthView,
    loginEmail,
    setLoginEmail,
    loginPassword,
    setLoginPassword,
    rememberMe,
    setRememberMe,
    isLoggingIn,
    loginError,
    setLoginError,
    signupData,
    setSignupData,
    isSigningUp,
    signupError,
    setSignupError,
    handleLogin,
    handleSignup,
    handleLogout,
    clearLocalSession,
    refreshAccessToken,
    authFetch,
    currentUserId,
  };
}
