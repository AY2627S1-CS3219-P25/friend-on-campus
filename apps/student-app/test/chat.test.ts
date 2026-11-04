/**
 * AI Assistance Disclosure:
 * Tool: Claude Code (model: Claude Fable 5.1), date: 2026-10-27
 * Scope: Issue #202: findDeliveredCopy settles an unconfirmed send from history only on this user's copy of the same
 * text stored at or after the send started; an older identical message or the peer's text does not count.
 * Author review: <to be completed by Reallyeasy1>
 *
 * Tool: Claude Code (model: Claude Fable 5.1), date: 2026-10-26
 * Scope: Review fix (PR #148, second round): the coverage cursor useChat reconciles from after every AUTH_OK. Replays
 * the reported schedule (REST returns [1], the peer sends 2 before the first AUTH_OK, live 3 arrives) against the
 * hook's pure helpers and checks the catch-up starts after 1, not after 3, and recovers 2.
 * Author review: <to be completed by Reallyeasy1>
 */
// AI-generated (edited by Reallyeasy1)
import assert from 'node:assert/strict';
import { test } from 'node:test';
import type { ChatMessageDTO } from '@campus-errand/common-dtos';
import { coveredThrough, findDeliveredCopy, mergeMessage } from '../src/chat/useChat';

const msg = (sequence: number): ChatMessageDTO => ({
  id: `m${sequence}`, sequence, senderId: 'u1', senderUsername: 'alice', senderRole: 'STUDENT', text: `t${sequence}`, sentAt: '2026-10-26T00:00:00.000Z',
});

test('coverage follows contiguous sequences and stops at the first gap', () => {
  assert.equal(coveredThrough([], 0), 0);
  assert.equal(coveredThrough([msg(1), msg(2), msg(3)], 0), 3);
  assert.equal(coveredThrough([msg(1), msg(3)], 0), 1, 'the gap at 2 is not skipped over');
  assert.equal(coveredThrough([msg(1), msg(3)], 1), 1);
  assert.equal(coveredThrough([msg(1), msg(2), msg(3), msg(5)], 1), 3);
  assert.equal(coveredThrough([msg(2)], 0), 0, 'a live frame with history still unloaded does not claim coverage');
});

test('REST [1], peer sends 2 before the first AUTH_OK, live 3: the catch-up fetches after 1 and recovers 2', () => {
  // What load() stores after the first page: coverage is the last fetched sequence.
  let messages = [msg(1)].reduce(mergeMessage, [] as ChatMessageDTO[]);
  let loadedThrough = coveredThrough(messages, Math.max(0, 1));
  assert.equal(loadedThrough, 1);

  // Message 2 is pushed only to authenticated sockets, so it never arrives as a frame; 3 does, after AUTH_OK.
  messages = mergeMessage(messages, msg(3));
  loadedThrough = coveredThrough(messages, loadedThrough);
  assert.deepEqual(messages.map((m) => m.sequence), [1, 3]);
  assert.equal(loadedThrough, 1, 'the cursor stays before the gap, unlike the highest displayed sequence (3)');

  // The AUTH_OK catch-up loads from loadedThrough; the server answers with [2, 3].
  const page = [msg(2), msg(3)];
  messages = page.reduce(mergeMessage, messages);
  loadedThrough = coveredThrough(messages, Math.max(loadedThrough, page[page.length - 1].sequence));
  assert.deepEqual(messages.map((m) => m.sequence), [1, 2, 3]);
  assert.equal(loadedThrough, 3);
});

// AI-generated (edited by Reallyeasy1)
test('an unconfirmed send is settled by a copy from this user stored at or after the send, not by older or foreign copies', () => {
  const at = (iso: string, overrides: Partial<ChatMessageDTO> = {}): ChatMessageDTO => ({ ...msg(1), sentAt: iso, ...overrides });
  const startedAt = Date.parse('2026-10-27T02:25:13.126Z');
  const sent = { senderId: 'u1', text: 'H03-uncertain', startedAt };
  const delivered = at('2026-10-27T02:25:13.300Z', { id: 'echo-lost', text: 'H03-uncertain' });
  assert.equal(findDeliveredCopy([delivered], sent)?.id, 'echo-lost', 'the committed copy settles the send');
  assert.equal(findDeliveredCopy([at('2026-10-27T02:25:12.000Z', { text: 'H03-uncertain' })], sent), undefined, 'an older identical message is not this send');
  assert.equal(findDeliveredCopy([at('2026-10-27T02:25:13.300Z', { text: 'H03-uncertain', senderId: 'u2' })], sent), undefined, 'a copy from the peer is not this send');
  assert.equal(findDeliveredCopy([at('2026-10-27T02:25:13.300Z', { text: 'other' })], sent), undefined, 'different text is not this send');
  assert.equal(findDeliveredCopy([at('2026-10-27T02:25:12.500Z', { text: 'H03-uncertain' })], sent)?.text, 'H03-uncertain', 'a second of clock skew is tolerated');
});
