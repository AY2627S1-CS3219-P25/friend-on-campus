/**
 * AI Assistance Disclosure:
 * Tool: Claude Code (model: Claude Opus 5.5), date: 2026-11-04
 * Scope: A wall clock that ticks at each minute boundary and again when the tab comes back into view, so the operating-hours labels (Post Errand, Errand Details, map...
 * Author review: I validated correctness, edited for style, and verified with automated tests.
 */
import { useEffect, useState } from 'react';

const MINUTE_MS = 60_000;

export interface MinuteClockEnv {
  now: () => number;
  setTimeout: (fn: () => void, ms: number) => unknown;
  clearTimeout: (handle: unknown) => void;
  /** Calls `listener` whenever the tab is shown again; returns the unsubscribe. */
  onResume: (listener: () => void) => () => void;
}

/** Milliseconds from `nowMs` to the next whole minute (a full minute when already on one). */
export function msUntilNextMinute(nowMs: number): number {
  return MINUTE_MS - (nowMs % MINUTE_MS);
}

function browserEnv(): MinuteClockEnv {
  return {
    now: () => Date.now(),
    setTimeout: (fn, ms) => window.setTimeout(fn, ms),
    clearTimeout: (handle) => window.clearTimeout(handle as number),
    onResume: (listener) => {
      const onVisible = () => { if (document.visibilityState === 'visible') listener(); };
      // Background tabs throttle timers, so a tab return re-reads the clock (focus and visibilitychange both fire).
      document.addEventListener('visibilitychange', onVisible);
      window.addEventListener('focus', listener);
      return () => {
        document.removeEventListener('visibilitychange', onVisible);
        window.removeEventListener('focus', listener);
      };
    },
  };
}

/** Calls `onTick` with the current time at every minute boundary and on tab resume; returns the unsubscribe. */
export function subscribeMinuteClock(onTick: (at: Date) => void, env: MinuteClockEnv = browserEnv()): () => void {
  let timer: unknown = null;
  const schedule = () => {
    timer = env.setTimeout(() => {
      onTick(new Date(env.now()));
      schedule();
    }, msUntilNextMinute(env.now()));
  };
  const stopResume = env.onResume(() => {
    env.clearTimeout(timer);
    onTick(new Date(env.now()));
    schedule();
  });
  schedule();
  return () => {
    env.clearTimeout(timer);
    stopResume();
  };
}

/** The current time, re-rendering the caller once a minute (and on tab resume) rather than on every tick. */
export function useMinuteClock(): Date {
  const [now, setNow] = useState(() => new Date());
  useEffect(
    () =>
      subscribeMinuteClock((at) =>
        setNow((prev) =>
          Math.floor(prev.getTime() / MINUTE_MS) === Math.floor(at.getTime() / MINUTE_MS) ? prev : at
        )
      ),
    []
  );
  return now;
}
