/**
 * AI Assistance Disclosure:
 * Tool: Claude Code (model: Claude Fable 5.1), date: 2026-11-09
 * Scope: Unit tests for the realtime primitives (issue #239 RT1.1): relay claim/publish/complete ordering, owner-checked completion after a lost lease, release with...
 * Author review: I validated correctness, edited for style, and verified with automated tests.
 */
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { setTimeout as delay } from 'node:timers/promises';
import {
  createLoopbackRealtime,
  createOutboxRelay,
  createRecentSet,
  runWithAttempts,
  type OutboxRow,
  type OutboxStore,
  type RealtimeSignal,
} from '../src/realtime';

/** An in-memory outbox with the same lease semantics the SQL stores implement. */
function memoryOutbox(rows: OutboxRow[]) {
  const state = new Map(rows.map((row) => [row.id, { row, owner: null as string | null, leaseUntil: 0, availableAt: 0 }]));
  const calls: string[] = [];
  let now = 1_000;
  const store: OutboxStore = {
    async claim(owner, leaseMs, limit) {
      calls.push(`claim ${owner}`);
      const due = [...state.values()]
        .filter((entry) => entry.availableAt <= now && (entry.owner === null || entry.leaseUntil <= now))
        .slice(0, limit);
      for (const entry of due) { entry.owner = owner; entry.leaseUntil = now + leaseMs; }
      return due.map((entry) => entry.row);
    },
    async complete(id, owner) {
      calls.push(`complete ${id} ${owner}`);
      const entry = state.get(id);
      if (!entry || entry.owner !== owner) return false;
      state.delete(id);
      return true;
    },
    async release(id, owner, delayMs) {
      calls.push(`release ${id} ${owner}`);
      const entry = state.get(id);
      if (!entry || entry.owner !== owner) return false;
      entry.owner = null;
      entry.leaseUntil = 0;
      entry.availableAt = now + delayMs;
      entry.row.attempts += 1;
      return true;
    },
  };
  return { store, calls, state, advance: (ms: number) => { now += ms; } };
}

const row = (id: string): OutboxRow => ({ id, eventId: `event-${id}`, kind: 'message', payload: { id }, attempts: 0 });

describe('outbox relay', () => {
  it('claims, publishes and completes each row once, in order', async () => {
    const outbox = memoryOutbox([row('a'), row('b')]);
    const published: RealtimeSignal[] = [];
    const relay = createOutboxRelay({ store: outbox.store, publish: async (signal) => { published.push(signal); }, owner: 'r1', log: () => {} });
    assert.equal(await relay.runOnce(), 2);
    assert.deepEqual(published.map((signal) => signal.eventId), ['event-a', 'event-b']);
    assert.deepEqual(outbox.calls, ['claim r1', 'complete a r1', 'complete b r1']);
    assert.equal(outbox.state.size, 0);
    assert.equal(await relay.runOnce(), 0, 'nothing left to publish');
  });

  it('releases a row whose publish failed and republishes it after the failure delay', async () => {
    const outbox = memoryOutbox([row('a')]);
    let failures = 1;
    const relay = createOutboxRelay({
      store: outbox.store,
      publish: async () => { if (failures-- > 0) throw new Error('broker down'); },
      owner: 'r1',
      failureDelayMs: 1_000,
      log: () => {},
    });
    assert.equal(await relay.runOnce(), 0);
    assert.deepEqual(outbox.calls, ['claim r1', 'release a r1']);
    assert.equal(outbox.state.get('a')?.row.attempts, 1);
    assert.equal(await relay.runOnce(), 0, 'still delayed');
    outbox.advance(1_000);
    assert.equal(await relay.runOnce(), 1);
    assert.equal(outbox.state.size, 0);
  });

  it('a relay whose lease expired cannot complete a row another relay has reclaimed', async () => {
    const outbox = memoryOutbox([row('a')]);
    const published: string[] = [];
    let release: () => void = () => {};
    const slowPublish = new Promise<void>((resolve) => { release = resolve; });
    const slow = createOutboxRelay({
      store: outbox.store, owner: 'slow', leaseMs: 100, log: () => {},
      publish: async (signal) => { published.push(`slow ${signal.eventId}`); await slowPublish; },
    });
    const fast = createOutboxRelay({
      store: outbox.store, owner: 'fast', leaseMs: 100, log: () => {},
      publish: async (signal) => { published.push(`fast ${signal.eventId}`); },
    });
    const slowRun = slow.runOnce();
    await delay(10);
    outbox.advance(200); // the slow relay's lease has expired
    assert.equal(await fast.runOnce(), 1, 'the second relay reclaims and completes the row');
    release();
    assert.equal(await slowRun, 0, 'the late completion is refused');
    assert.deepEqual(published, ['slow event-a', 'fast event-a']);
    assert.deepEqual(outbox.calls, ['claim slow', 'claim fast', 'complete a fast', 'complete a slow']);
  });

  it('start/stop runs the loop and stops promptly while idle', async () => {
    const outbox = memoryOutbox([row('a')]);
    const relay = createOutboxRelay({ store: outbox.store, publish: async () => {}, owner: 'r1', pollMs: 5_000, log: () => {} });
    relay.start();
    await delay(50);
    assert.equal(outbox.state.size, 0);
    const started = Date.now();
    await relay.stop();
    assert.ok(Date.now() - started < 1_000, 'stop interrupts the idle poll');
  });
});

describe('recent set', () => {
  it('remembers the most recent ids and forgets the oldest beyond its capacity', () => {
    const recent = createRecentSet(3);
    for (const id of ['a', 'b', 'c']) recent.add(id);
    assert.equal(recent.has('a'), true);
    recent.add('d');
    assert.equal(recent.has('a'), false);
    assert.deepEqual(['b', 'c', 'd'].map((id) => recent.has(id)), [true, true, true]);
    recent.add('b');
    assert.equal(recent.size, 3, 'a known id is not counted twice');
  });
});

describe('bounded handler attempts', () => {
  it('stops after the configured attempts and reports each failure', async () => {
    const failures: number[] = [];
    let calls = 0;
    const ok = await runWithAttempts(async () => { calls += 1; throw new Error('nope'); }, {
      attempts: 3, attemptTimeoutMs: 1_000, onFailure: (attempt) => failures.push(attempt),
    });
    assert.deepEqual([ok, calls, failures], [false, 3, [1, 2, 3]]);
  });

  it('aborts a stalled attempt at the deadline and succeeds on a later one', async () => {
    let calls = 0;
    const ok = await runWithAttempts(async (signal) => {
      calls += 1;
      if (calls === 1) {
        await new Promise<void>((_resolve, reject) => signal.addEventListener('abort', () => reject(new Error('aborted'))));
      }
    }, { attempts: 2, attemptTimeoutMs: 30 });
    assert.deepEqual([ok, calls], [true, 2]);
  });

  // PR #246 review: the deadline must hold even when the handler cannot be interrupted (a stalled database read).
  it('abandons an attempt that ignores the abort signal and never settles, then tries again', { timeout: 5_000 }, async () => {
    let calls = 0;
    const failures: string[] = [];
    const ok = await runWithAttempts(async () => {
      calls += 1;
      if (calls === 1) await new Promise<void>(() => {});
    }, { attempts: 2, attemptTimeoutMs: 30, onFailure: (_attempt, error) => failures.push((error as Error).name) });
    assert.deepEqual([ok, calls, failures], [true, 2, ['RealtimeAttemptAborted']]);
  });

  it('does not count an attempt that returns after its deadline as handled', async () => {
    // What the delivery handlers do: the read comes back late, they see the abort and return without pushing.
    const ok = await runWithAttempts(async (signal) => { await delay(80); if (signal.aborted) return; }, { attempts: 1, attemptTimeoutMs: 20 });
    assert.equal(ok, false);
  });

  it('stops waiting as soon as the parent aborts during a stalled attempt', { timeout: 5_000 }, async () => {
    const parent = new AbortController();
    setTimeout(() => parent.abort(), 20);
    const started = Date.now();
    const ok = await runWithAttempts(() => new Promise<void>(() => {}), { attempts: 3, attemptTimeoutMs: 60_000, parent: parent.signal });
    assert.equal(ok, false);
    assert.ok(Date.now() - started < 2_000, 'returned at the abort, not at the attempt deadline');
  });

  it('does not start another attempt once the parent is aborted', async () => {
    const parent = new AbortController();
    let calls = 0;
    const ok = await runWithAttempts(async () => { calls += 1; parent.abort(); throw new Error('closing'); }, {
      attempts: 3, attemptTimeoutMs: 1_000, parent: parent.signal,
    });
    assert.deepEqual([ok, calls], [false, 1]);
  });
});

describe('loopback realtime', () => {
  it('fans a signal out to every subscriber and honours unsubscribe', async () => {
    const loopback = createLoopbackRealtime();
    const seen: string[] = [];
    const off = loopback.subscribe(async (signal) => { seen.push(`a ${signal.eventId}`); });
    loopback.subscribe(async (signal) => { seen.push(`b ${signal.eventId}`); });
    await loopback.publish({ eventId: '1', kind: 'k', payload: {} });
    off();
    await loopback.publish({ eventId: '2', kind: 'k', payload: {} });
    assert.deepEqual(seen, ['a 1', 'b 1', 'b 2']);
  });
});
