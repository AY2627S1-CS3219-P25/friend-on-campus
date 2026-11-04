/**
 * AI Assistance Disclosure:
 * Tool: Claude Code (model: Claude Fable 5.1), date: 2026-11-03
 * Scope: Unit test for withRequestDeadline: a default 10 s signal is attached, a caller's signal is kept, and the
 *        deadline actually aborts (N4 design, wiki "Graceful Degradation and Data Durability Design" section 5.1).
 * Author review: <to be completed by Reallyeasy1>
 */

// AI-generated (edited by Reallyeasy1)

import assert from 'node:assert/strict';
import { test } from 'node:test';
import { REQUEST_DEADLINE_MS, withRequestDeadline } from '../src/hooks/useAuthSession';

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
