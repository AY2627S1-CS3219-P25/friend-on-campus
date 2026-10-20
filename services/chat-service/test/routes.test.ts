/**
 * AI Assistance Disclosure:
 * Tool: Claude Code (model: Claude Fable 5.1), date: 2026-10-20
 * Scope: Route tests for GET /api/chat/:orderId: token required, participant and admin reads, 403 for others, 404
 * when neither a row nor the order exists, 503 when the Order Service is down and no row exists, the fallback
 * creating the row from the order, and paging by afterSequence and limit. In-memory store, fake Order Service.
 * Author review: <to be completed by Reallyeasy1>
 */
// AI-generated (edited by Reallyeasy1)
import assert from 'node:assert/strict';
import { after, before, describe, it } from 'node:test';
import type { AddressInfo } from 'node:net';
import type { Server } from 'node:http';
import { authMiddleware } from '@campus-errand/auth';
import { createApp } from '../src/app';
import type { OrderLookupResult } from '../src/clients/order.client';
import { createConversationService } from '../src/conversations/service';
import { ADMIN, ALICE, AUDIENCE, BOB, CAROL, ISSUER, ORDER, makeKeys, memoryStore, signToken } from './helpers';

describe('GET /api/chat/:orderId', () => {
  const keys = makeKeys();
  const { store } = memoryStore();
  let lookup: OrderLookupResult = { kind: 'not_found' };
  const service = createConversationService({ store, orders: { async getOrder() { return lookup; } } });
  let server: Server;
  let url: string;
  const get = (path: string, userId?: string, claims: Record<string, unknown> = {}) =>
    fetch(`${url}${path}`, { headers: userId ? { authorization: `Bearer ${signToken(keys.privateKey, userId, claims)}` } : {} });

  before(async () => {
    const app = createApp({
      port: 0,
      isReady: async () => true,
      chat: { service, authenticate: authMiddleware({ publicKey: keys.publicKey, issuer: ISSUER, audience: AUDIENCE }) },
    });
    server = app.listen(0);
    await new Promise<void>((resolve) => server.once('listening', resolve));
    url = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  });

  after(async () => {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  });

  it('requires a token and a UUID', async () => {
    assert.equal((await get(`/api/chat/${ORDER}`)).status, 401);
    assert.equal((await get('/api/chat/not-a-uuid', ALICE)).status, 400);
  });

  it('is 404 when neither a row nor the order exists, 503 when the Order Service is down', async () => {
    assert.equal((await get(`/api/chat/${ORDER}`, ALICE)).status, 404);
    lookup = { kind: 'unavailable', message: 'timeout' };
    const res = await get(`/api/chat/${ORDER}`, ALICE);
    assert.equal(res.status, 503);
    assert.equal((await res.json()).code, 'ORDER_SERVICE_UNAVAILABLE');
  });

  it('creates the row from the Order Service on first read, then serves participants and admins, not others', async () => {
    lookup = { kind: 'found', order: { id: ORDER, requesterId: ALICE, courierId: BOB, status: 'ACCEPTED', acceptedAt: '2026-10-20T04:00:00.000Z', completedAt: null } };
    const first = await get(`/api/chat/${ORDER}`, BOB);
    assert.equal(first.status, 200);
    const body = await first.json();
    assert.deepEqual([body.data.conversation.requesterId, body.data.conversation.courierId, body.data.messages], [ALICE, BOB, []]);
    lookup = { kind: 'not_found' };
    assert.equal((await get(`/api/chat/${ORDER}`, ALICE)).status, 200, 'row now local');
    assert.equal((await get(`/api/chat/${ORDER}`, ADMIN, { role: 'ADMIN' })).status, 200, 'D8: admin may read');
    const other = await get(`/api/chat/${ORDER}`, CAROL);
    assert.equal(other.status, 403);
    assert.equal((await other.json()).code, 'FORBIDDEN');
  });

  it('returns messages in sequence order and pages by afterSequence and limit', async () => {
    const p = (userId: string, username: string) => ({ userId, sessionId: 's', role: 'STUDENT' as const, username });
    for (let i = 1; i <= 5; i += 1) await service.send(ORDER, p(i % 2 ? ALICE : BOB, i % 2 ? 'alice' : 'bob'), `m${i}`);
    const all = await (await get(`/api/chat/${ORDER}`, ALICE)).json();
    assert.deepEqual(all.data.messages.map((m: { text: string }) => m.text), ['m1', 'm2', 'm3', 'm4', 'm5']);
    assert.deepEqual(all.data.messages.map((m: { senderUsername: string }) => m.senderUsername), ['alice', 'bob', 'alice', 'bob', 'alice']);
    const page = await (await get(`/api/chat/${ORDER}?afterSequence=2&limit=2`, BOB)).json();
    assert.deepEqual(page.data.messages.map((m: { sequence: number }) => m.sequence), [3, 4]);
  });
});
