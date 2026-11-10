/**
 * AI Assistance Disclosure:
 * Tool: Google Antigravity Agent; Claude Code (model: Claude Fable 5.1), date: 2026-11-03 to 2026-11-10
 * Scope: Unit test for withRequestDeadline: a default 10 s signal is attached, a caller's signal is kept, and the deadline actually aborts (N4 design, wiki "Graceful..; updated across 4 AI-assisted revisions through D4 wrap-up (add unit tests for runSignupWithAutoLogin and EMPTY_SIGNUP_DATA covering post-registration auto-login failures and sign-up state reset (issues #170, #204)).
 * Author review: I validated correctness, edited for style, and verified with automated tests.
 */


import assert from 'node:assert/strict';
import { test } from 'node:test';
import { DRAFT_DEADLINE_MS, acceptOrderById, parseErrandDraft } from '../src/api/orders';
import { fetchWalletAndLedger } from '../src/api/credits';
import {
  EMPTY_SIGNUP_DATA,
  READ_RETRY_ATTEMPTS,
  READ_RETRY_BASE_MS,
  REQUEST_DEADLINE_MS,
  UNCONFIRMED_WRITE_MESSAGE,
  describeWriteFailure,
  isSafeRead,
  readRetryDelayMs,
  retrySafeRead,
  runSignupWithAutoLogin,
  withRequestDeadline,
} from '../src/hooks/useAuthSession';

test('a request without its own signal gets the default deadline', () => {
  assert.equal(REQUEST_DEADLINE_MS, 10_000);
  const init = withRequestDeadline({ method: 'GET' });
  assert.ok(init.signal instanceof AbortSignal);
  assert.equal(init.signal.aborted, false);
  assert.equal(init.method, 'GET');
});

test('a caller-supplied signal is preserved, so the 15 s create and 10 s pending-poll policies are unchanged', () => {
  const own = new AbortController();
  const init = withRequestDeadline({ method: 'POST', signal: own.signal });
  assert.equal(init.signal, own.signal);
});

test('each call builds a fresh signal, so a retry after token refresh gets a full deadline', () => {
  const first = withRequestDeadline({});
  const second = withRequestDeadline({});
  assert.notEqual(first.signal, second.signal);
});

test('the deadline aborts with TimeoutError once it elapses', async () => {
  const init = withRequestDeadline({}, 20);
  // AbortSignal.timeout's timer is unref'd in Node, so a plain (ref'd) wait keeps the loop alive until it fires.
  await new Promise((resolve) => setTimeout(resolve, 60));
  assert.equal(init.signal!.aborted, true);
  assert.ok(init.signal!.reason instanceof DOMException);
  assert.equal(init.signal!.reason.name, 'TimeoutError');
});

test('only GET/HEAD requests without a caller-owned signal count as safe reads', () => {
  assert.equal(isSafeRead({}), true);
  assert.equal(isSafeRead({ method: 'get' }), true);
  assert.equal(isSafeRead({ method: 'HEAD' }), true);
  assert.equal(isSafeRead({ method: 'POST' }), false);
  assert.equal(isSafeRead({ method: 'PATCH' }), false);
  assert.equal(isSafeRead({ method: 'DELETE' }), false);
  // The create POST and the pending poll bring their own signal and keep their own policy.
  assert.equal(isSafeRead({ signal: new AbortController().signal }), false);
});

test('the backoff is full-jitter: pause n lies in [0, base * 2^n)', () => {
  assert.equal(readRetryDelayMs(0, () => 0), 0);
  assert.equal(readRetryDelayMs(0, () => 0.999), Math.floor(0.999 * READ_RETRY_BASE_MS));
  assert.equal(readRetryDelayMs(2, () => 0.5), Math.floor(0.5 * READ_RETRY_BASE_MS * 4));
  for (let i = 0; i < 50; i++) {
    const d = readRetryDelayMs(1);
    assert.ok(d >= 0 && d < READ_RETRY_BASE_MS * 2);
  }
});

const immediate = () => {
  const waits: number[] = [];
  return { waits, wait: async (ms: number) => void waits.push(ms) };
};

test('a safe read that throws, then returns 503, then 200 settles on the 200 after two growing pauses', async () => {
  const outcomes: Array<() => Promise<Response>> = [
    () => Promise.reject(new TypeError('Failed to fetch')),
    () => Promise.resolve(new Response(null, { status: 503 })),
    () => Promise.resolve(new Response('ok', { status: 200 })),
  ];
  const { waits, wait } = immediate();
  const res = await retrySafeRead(() => outcomes.shift()!(), 3, wait, (n) => 100 * 2 ** n);
  assert.equal(res.status, 200);
  assert.deepEqual(waits, [100, 200]);
  assert.equal(READ_RETRY_ATTEMPTS, 3);
});

test('a 4xx is a server verdict and is returned without retrying', async () => {
  let calls = 0;
  const { waits, wait } = immediate();
  const res = await retrySafeRead(
    () => {
      calls++;
      return Promise.resolve(new Response(null, { status: 404 }));
    },
    3,
    wait,
  );
  assert.equal(res.status, 404);
  assert.equal(calls, 1);
  assert.deepEqual(waits, []);
});

test('when every attempt fails the last outcome is handed back unchanged', async () => {
  const { wait } = immediate();
  let calls = 0;
  const last5xx = await retrySafeRead(
    () => {
      calls++;
      return Promise.resolve(new Response(null, { status: 502 }));
    },
    3,
    wait,
  );
  assert.equal(last5xx.status, 502);
  assert.equal(calls, 3);

  const boom = new TypeError('Failed to fetch');
  await assert.rejects(retrySafeRead(() => Promise.reject(boom), 2, wait), (err) => err === boom);
});

test('a lost write response is reported as unconfirmed, a server message is passed through', () => {
  const timeout = new DOMException('The operation was aborted due to timeout', 'TimeoutError');
  assert.equal(describeWriteFailure(timeout, 'fallback'), UNCONFIRMED_WRITE_MESSAGE);
  assert.equal(describeWriteFailure(new TypeError('Failed to fetch'), 'fallback'), UNCONFIRMED_WRITE_MESSAGE);
  assert.equal(describeWriteFailure(new Error('Order is no longer OPEN'), 'fallback'), 'Order is no longer OPEN');
  assert.equal(describeWriteFailure('???', 'Unable to accept this errand.'), 'Unable to accept this errand.');
  assert.equal(UNCONFIRMED_WRITE_MESSAGE, "We couldn't confirm the result. Check this errand before trying again.");
});

// PR #225 review cases.
test('a session abort stops the retry loop at once, while a deadline abort is still retried', async () => {
  const { waits, wait } = immediate();
  const ended = new DOMException('Session ended', 'AbortError');
  let calls = 0;
  await assert.rejects(
    retrySafeRead(() => {
      calls++;
      return Promise.reject(ended);
    }, 3, wait),
    (err) => err === ended,
  );
  assert.equal(calls, 1);
  assert.deepEqual(waits, []);

  const timedOut = new DOMException('The operation was aborted due to timeout', 'TimeoutError');
  calls = 0;
  await assert.rejects(retrySafeRead(() => {
    calls++;
    return Promise.reject(timedOut);
  }, 3, wait));
  assert.equal(calls, 3);
});

test('the session signal is combined with the deadline and aborts the request with AbortError', () => {
  const session = new AbortController();
  const init = withRequestDeadline({ method: 'GET' }, 10_000, session.signal);
  assert.ok(init.signal instanceof AbortSignal);
  assert.notEqual(init.signal, session.signal);
  assert.equal(init.signal.aborted, false);
  session.abort(new DOMException('Session ended', 'AbortError'));
  assert.equal(init.signal.aborted, true);
  assert.equal((init.signal.reason as DOMException).name, 'AbortError');
  // A caller-owned signal still wins over both.
  const own = new AbortController();
  assert.equal(withRequestDeadline({ signal: own.signal }, 10_000, session.signal).signal, own.signal);
});

test('a lifecycle write whose 2xx body is lost is reported as unconfirmed, not as "HTTP 200"', async () => {
  const dropped = new TypeError('network error');
  const okButUnreadable = {
    ok: true,
    status: 200,
    json: () => Promise.reject(dropped),
  } as unknown as Response;
  await assert.rejects(
    acceptOrderById(async () => okButUnreadable, 'order-1'),
    (err) => err === dropped,
  );
  assert.equal(describeWriteFailure(dropped, 'Unable to accept this errand.'), UNCONFIRMED_WRITE_MESSAGE);

  // A server error with an unreadable body still falls back to the status message.
  const badGateway = { ok: false, status: 502, json: () => Promise.reject(new SyntaxError('bad json')) } as unknown as Response;
  await assert.rejects(acceptOrderById(async () => badGateway, 'order-1'), /Unable to accept this errand\. \(HTTP 502\)/);
  // And a server verdict is passed through unchanged.
  const conflict = new Response(JSON.stringify({ success: false, error: 'Order is no longer OPEN' }), { status: 409 });
  await assert.rejects(acceptOrderById(async () => conflict, 'order-1'), /Order is no longer OPEN/);
});

test('the draft assistant sends its own deadline that outlasts the supplier lookup plus the 10 s AI call', async () => {
  // Order Service: supplier client 4 s + SoCLaaS 10 s before the offline fallback is returned.
  assert.ok(DRAFT_DEADLINE_MS > 14_000, `expected > 14 s, got ${DRAFT_DEADLINE_MS}`);
  assert.ok(DRAFT_DEADLINE_MS > REQUEST_DEADLINE_MS);
  let seen: RequestInit | undefined;
  const draft = await parseErrandDraft(async (_url, init) => {
    seen = init;
    return new Response(JSON.stringify({ success: true, data: { itemDescription: 'coffee' } }), { status: 200 });
  }, 'get me a coffee');
  assert.equal((draft as { itemDescription: string }).itemDescription, 'coffee');
  assert.ok(seen?.signal instanceof AbortSignal);
  assert.equal(isSafeRead(seen!), false);
});

test('runSignupWithAutoLogin distinguishes registration failures from post-registration auto-login failures (issues #170, #204)', async () => {
  assert.deepEqual(EMPTY_SIGNUP_DATA, { username: '', email: '', password: '', retypePassword: '' });

  // 1. Registration failure keeps user in registration_failed state without attempting login
  let loginCalled = false;
  const regFailed = await runSignupWithAutoLogin(
    { username: ' alice ', email: 'alice@u.nus.edu', password: 'Password123!' },
    {
      register: async () => ({ ok: false, code: 'DUPLICATE_EMAIL', message: 'Email already registered' }),
      login: async () => {
        loginCalled = true;
        return { ok: true, accessToken: 'tok' };
      },
    },
  );
  assert.equal(loginCalled, false);
  assert.deepEqual(regFailed, {
    kind: 'registration_failed',
    error: { code: 'DUPLICATE_EMAIL', message: 'Email already registered' },
  });

  // 2. Registration succeeds, but auto-login returns !ok -> returns auto_login_failed with email for login view
  const autoLoginRejected = await runSignupWithAutoLogin(
    { username: ' alice ', email: 'alice@u.nus.edu', password: 'Password123!' },
    {
      register: async () => ({ ok: true }),
      login: async () => ({ ok: false, code: 'RATE_LIMITED', message: '' }),
    },
  );
  assert.deepEqual(autoLoginRejected, {
    kind: 'auto_login_failed',
    email: 'alice@u.nus.edu',
    error: {
      code: 'RATE_LIMITED',
      message: 'Account created, but automatic login failed. Please sign in with your new account.',
    },
  });

  // 3. Registration succeeds, but auto-login throws a network error -> still returns auto_login_failed so user is sent to login view
  const autoLoginNetworkErr = await runSignupWithAutoLogin(
    { username: ' alice ', email: 'alice@u.nus.edu', password: 'Password123!' },
    {
      register: async () => ({ ok: true }),
      login: async () => {
        throw new TypeError('Failed to fetch');
      },
    },
  );
  assert.deepEqual(autoLoginNetworkErr, {
    kind: 'auto_login_failed',
    email: 'alice@u.nus.edu',
    error: {
      code: 'AUTO_LOGIN_FAILED',
      message: 'Account created, but automatic login could not reach the server. Please sign in with your new account.',
    },
  });

  // 4. Both succeed -> authenticated
  const ok = await runSignupWithAutoLogin(
    { username: ' alice ', email: 'alice@u.nus.edu', password: 'Password123!' },
    {
      register: async (payload) => {
        assert.equal(payload.username, 'alice');
        return { ok: true };
      },
      login: async () => ({ ok: true, accessToken: 'jwt-123' }),
    },
  );
  assert.deepEqual(ok, { kind: 'authenticated', accessToken: 'jwt-123' });
});

test('fetchWalletAndLedger retries HTTP 404 while a new account wallet is being initialized by CDC (issue #168)', async () => {
  const waits: number[] = [];
  let walletCalls = 0;
  const wallet = {
    userId: 'u1',
    availableCredits: 100,
    escrowCredits: 0,
    totalEarnedCredits: 100,
    updatedAt: '2026-11-10T00:00:00.000Z',
  };

  const settled = await fetchWalletAndLedger(
    async (url) => {
      if (url === '/api/credits/wallet') {
        walletCalls++;
        if (walletCalls < 3) {
          return new Response(JSON.stringify({ success: false, error: 'Wallet not found' }), { status: 404 });
        }
        return new Response(JSON.stringify({ success: true, data: wallet }), { status: 200 });
      }
      return new Response(JSON.stringify({ success: true, data: [] }), { status: 200 });
    },
    { initRetryAttempts: 5, initRetryDelayMs: 500, wait: async (ms) => void waits.push(ms) },
  );
  assert.equal(settled.status, 'ok');
  assert.equal(walletCalls, 3);
  assert.deepEqual(waits, [500, 500]);

  // Exhausting all attempts returns not_initialized
  let exhaustedCalls = 0;
  const uninitialized = await fetchWalletAndLedger(
    async () => {
      exhaustedCalls++;
      return new Response(JSON.stringify({ success: false, error: 'Wallet not found' }), { status: 404 });
    },
    { initRetryAttempts: 3, initRetryDelayMs: 250, wait: async () => {} },
  );
  assert.equal(uninitialized.status, 'not_initialized');
  assert.equal(exhaustedCalls, 3);
});
