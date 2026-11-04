/**
 * AI Assistance Disclosure:
 * Tool: Claude Code (model: Claude Fable 5.1), date: 2026-11-04
 * Scope: Added cases for isSafeRead, readRetryDelayMs bounds, retrySafeRead (5xx/throw retried, 4xx not, last outcome
 *        returned or rethrown) and describeWriteFailure (lost response copy versus server message).
 * Author review: <to be completed by Reallyeasy1>
 *
 * Tool: Claude Code (model: Claude Fable 5.1), date: 2026-11-03
 * Scope: Unit test for withRequestDeadline: a default 10 s signal is attached, a caller's signal is kept, and the
 *        deadline actually aborts (N4 design, wiki "Graceful Degradation and Data Durability Design" section 5.1).
 * Author review: <to be completed by Reallyeasy1>
 */

// AI-generated (edited by Reallyeasy1)

import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  READ_RETRY_ATTEMPTS,
  READ_RETRY_BASE_MS,
  REQUEST_DEADLINE_MS,
  UNCONFIRMED_WRITE_MESSAGE,
  describeWriteFailure,
  isSafeRead,
  readRetryDelayMs,
  retrySafeRead,
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
