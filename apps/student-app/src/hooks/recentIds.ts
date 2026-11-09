/**
 * AI Assistance Disclosure:
 * Tool: Claude Code (model: Claude Fable 5.1), date: 2026-11-09
 * Scope: Bounded recent-id cache for realtime display effects (issue #242, RT4.1 to RT4.3): realtime signals are
 * at-least-once, so the notification toast and the chat removed-message counter ask it whether an id is new.
 * Author review: <to be completed by Reallyeasy1>
 */
// AI-generated (edited by Reallyeasy1)

/** Ids remembered per logged-in session (the wiki's browser display-effect cache). */
export const RECENT_IDS = 1000;

/** Returns true the first time an id is offered and false on a repeat; past `capacity` the oldest id is forgotten. */
export function createFirstSeen(capacity = RECENT_IDS) {
  const ids = new Set<string>();
  return (id: string): boolean => {
    if (ids.has(id)) return false;
    ids.add(id);
    // A Set iterates in insertion order, so its first value is the oldest.
    if (ids.size > capacity) ids.delete(ids.values().next().value as string);
    return true;
  };
}
