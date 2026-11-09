/**
 * AI Assistance Disclosure:
 * Tool: Claude Code (model: Claude Fable 5.1), date: 2026-11-09
 * Scope: Unit tests for the subscriber-side notification delivery (issue #241 RT3.2, RT3.3): current-row re-read,
 *        stale and already-read suppression, inbox hints for every recipient, read-state signals, malformed signals.
 * Author review: <to be completed by Reallyeasy1>
 */
// AI-generated (edited by Reallyeasy1)
import assert from 'node:assert/strict';
import { test } from 'node:test';
import type { NotificationDTO } from '@campus-errand/common-dtos';
import { createNotificationDelivery, inboxChangedSignal, notificationsSignal } from '../src/notifications/realtime';
import { ALICE, BOB } from './helpers';

const EVENT = '40000000-0000-4000-8000-000000000001';
const ROW_A = '50000000-0000-4000-8000-000000000001';
const ROW_B = '50000000-0000-4000-8000-000000000002';

function fixture(rows: Record<string, { userId: string; readAt: string | null }>) {
  const steps: string[] = [];
  const delivery = createNotificationDelivery({
    store: {
      async findForUser(userId, id) {
        const row = rows[id];
        if (!row || row.userId !== userId) return null;
        return { id, kind: 'ORDER_ACCEPTED', readAt: row.readAt } as unknown as NotificationDTO;
      },
    },
    hub: {
      push: (userId, n) => { steps.push(`push ${userId} ${n.id}`); return 1; },
      inboxChanged: (userId) => { steps.push(`inbox ${userId}`); return 1; },
    },
  });
  return { steps, handle: (signal: Parameters<typeof delivery.handle>[0]) => delivery.handle(signal, new AbortController().signal) };
}

test('pushes each unread created row to its owner and an inbox hint to every recipient', async () => {
  const { steps, handle } = fixture({ [ROW_A]: { userId: ALICE, readAt: null }, [ROW_B]: { userId: BOB, readAt: null } });
  await handle(notificationsSignal(EVENT, {
    producer: 'order-service',
    created: [{ userId: ALICE, notificationId: ROW_A }, { userId: BOB, notificationId: ROW_B }],
    recipientIds: [ALICE, BOB],
    stale: false,
  }));
  assert.deepEqual(steps, [`push ${ALICE} ${ROW_A}`, `push ${BOB} ${ROW_B}`, `inbox ${ALICE}`, `inbox ${BOB}`]);
});

test('a stale event refreshes inboxes but never toasts', async () => {
  const { steps, handle } = fixture({ [ROW_A]: { userId: ALICE, readAt: null } });
  await handle(notificationsSignal(EVENT, { producer: 'order-service', created: [{ userId: ALICE, notificationId: ROW_A }], recipientIds: [ALICE], stale: true }));
  assert.deepEqual(steps, [`inbox ${ALICE}`]);
});

test('a row already read, missing or owned by someone else is not pushed; the hint still goes out', async () => {
  const { steps, handle } = fixture({ [ROW_A]: { userId: ALICE, readAt: '2026-11-09T00:00:00.000Z' }, [ROW_B]: { userId: BOB, readAt: null } });
  await handle(notificationsSignal(EVENT, {
    producer: 'order-service',
    // ROW_A is read; ROW_B belongs to Bob, so naming Alice as its owner must deliver nothing to her.
    created: [{ userId: ALICE, notificationId: ROW_A }, { userId: ALICE, notificationId: ROW_B }, { userId: ALICE, notificationId: '50000000-0000-4000-8000-000000000099' }],
    recipientIds: [ALICE],
    stale: false,
  }));
  assert.deepEqual(steps, [`inbox ${ALICE}`]);
});

test('an inbox_changed signal reaches only the named user', async () => {
  const { steps, handle } = fixture({});
  await handle(inboxChangedSignal(BOB));
  assert.deepEqual(steps, [`inbox ${BOB}`]);
});

test('malformed signals are rejected before any socket is touched', async () => {
  const { steps, handle } = fixture({ [ROW_A]: { userId: ALICE, readAt: null } });
  for (const payload of [
    { producer: 'order-service', created: 'nope', recipientIds: [ALICE], stale: false },
    { producer: 'order-service', created: [{ userId: 'alice', notificationId: ROW_A }], recipientIds: [ALICE], stale: false },
    { producer: 'order-service', created: [], recipientIds: ['bob'], stale: false },
  ]) {
    await assert.rejects(handle({ eventId: EVENT, kind: 'notifications', payload }));
  }
  await assert.rejects(handle({ eventId: EVENT, kind: 'inbox_changed', payload: { userId: 'not-a-uuid' } }));
  await assert.rejects(handle({ eventId: EVENT, kind: 'something_else', payload: {} }));
  assert.deepEqual(steps, []);
});
