/**
 * AI Assistance Disclosure:
 * Tool: Claude Code (model: Claude Fable 5.1), date: 2026-10-24
 * Scope: Upgrade regression for the Credit event handler (PR #184 review): an Order event carrying orderCode must
 * produce the fingerprint the previous version stored (which discarded the code), while the command still carries the
 * code for the receipt. A same-version replay test cannot catch this, so the expected hash is computed from the
 * pre-upgrade normalized shape by hand.
 * Author review: <to be completed by Reallyeasy1>
 */
// AI-generated (edited by Reallyeasy1)
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { test } from 'node:test';
import { createCreditEventHandler } from '../src/credits/events';
import type { CreditCommand, CreditService } from '../src/credits/service';

const eventId = '7b1d0d2e-5f7a-4c1e-9a3b-2d4f6e8a0c12';
const orderId = '0f9e8d7c-6b5a-4433-8211-00ffeeddccbb';
const requesterId = '11111111-2222-4333-8444-555555555555';
const courierId = '66666666-7777-4888-8999-aaaaaaaaaaaa';
const timestamp = '2026-10-20T08:00:00.000Z';

/** The handler before this upgrade hashed exactly this object (orderCode dropped, keys in this order). */
const legacyFingerprint = (event: Record<string, unknown>) => createHash('sha256').update(JSON.stringify(event)).digest('hex');

function capture() {
  const calls: { identity: { eventId: string; eventType: string; fingerprint: string }; command: CreditCommand }[] = [];
  const credits = { applyEvent: async (identity: typeof calls[number]['identity'], command: CreditCommand) => { calls.push({ identity, command }); } };
  return { calls, handle: createCreditEventHandler(credits as unknown as CreditService) };
}

test('a cancellation with orderCode keeps the fingerprint the previous version stored, and the refund names the code', async () => {
  const { calls, handle } = capture();
  const message = { eventId, eventType: 'order.cancelled', timestamp, orderId, requesterId, rewardCredits: 30, orderCode: 'ORD-0042' };
  await handle(Buffer.from(JSON.stringify(message)), 'order.cancelled');
  assert.equal(calls.length, 1);
  assert.equal(calls[0].identity.fingerprint, legacyFingerprint({ eventId, timestamp, orderId, requesterId, rewardCredits: 30, eventType: 'order.cancelled' }));
  assert.deepEqual(calls[0].command, { kind: 'refund', body: { orderId, requesterId, amount: 30, orderCode: 'ORD-0042' } });
});

test('with or without orderCode the same completion event has one fingerprint', async () => {
  const { calls, handle } = capture();
  const base = { eventId, eventType: 'order.completed', timestamp, orderId, requesterId, courierId, rewardCredits: 12 };
  await handle(Buffer.from(JSON.stringify(base)), 'order.completed');
  await handle(Buffer.from(JSON.stringify({ ...base, orderCode: 'ORD-0007' })), 'order.completed');
  assert.equal(calls[0].identity.fingerprint, calls[1].identity.fingerprint);
  assert.equal(calls[0].identity.fingerprint, legacyFingerprint({ eventId, timestamp, orderId, requesterId, rewardCredits: 12, eventType: 'order.completed', courierId }));
  assert.equal(calls[1].command.kind, 'settle');
  assert.equal((calls[1].command as { body: { orderCode?: string } }).body.orderCode, 'ORD-0007');
});
