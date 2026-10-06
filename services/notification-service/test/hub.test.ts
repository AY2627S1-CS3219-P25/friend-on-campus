/**
 * AI Assistance Disclosure:
 * Tool: Claude Code (model: Claude Fable 5.1), date: 2026-10-05
 * Scope: Tests for src/ws/hub.ts over real sockets and real Ed25519 tokens: the AUTH handshake and its 4401
 * rejections, addressing a push to one user's sockets, closing at token expiry, and eviction on close.
 * Author review: <to be completed by Reallyeasy1>
 */
// AI-generated (edited by Reallyeasy1)
import { after, before, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import type { AddressInfo } from 'node:net';
import { setTimeout as delay } from 'node:timers/promises';
import { WebSocketServer } from 'ws';
import type { NotificationDTO } from '@campus-errand/common-dtos';
import { createHub, createSocketAuthenticator } from '../src/ws/hub';
import { ALICE, AUDIENCE, BOB, ISSUER, makeKeys, openSocket, signToken, until } from './helpers';

const keys = makeKeys();
const strangerKeys = makeKeys();
const notification: NotificationDTO = {
  id: '40000000-0000-4000-8000-000000000001',
  kind: 'ORDER_ACCEPTED',
  orderId: '30000000-0000-4000-8000-000000000001',
  orderCode: 'ORD-0001',
  courierId: BOB,
  title: 'Your errand ORD-0001 was accepted',
  body: 'A courier has been assigned to your errand.',
  readAt: null,
  createdAt: '2026-10-05T04:00:00.000Z',
};

describe('WebSocket hub', () => {
  let wss: WebSocketServer;
  let url: string;
  const hub = createHub({
    authenticate: createSocketAuthenticator({ publicKey: keys.publicKey, issuer: ISSUER, audience: AUDIENCE }),
    unreadCount: async (userId) => (userId === ALICE ? 3 : 0),
    authTimeoutMs: 150,
  });

  before(async () => {
    wss = new WebSocketServer({ port: 0 });
    wss.on('connection', hub.handleConnection);
    await new Promise<void>((resolve) => wss.once('listening', resolve));
    url = `ws://127.0.0.1:${(wss.address() as AddressInfo).port}`;
  });

  after(async () => {
    hub.close();
    await new Promise<void>((resolve) => wss.close(() => resolve()));
  });

  it('closes with 4401 when no AUTH frame arrives in time, and sends nothing first', async () => {
    const client = await openSocket(url);
    assert.equal(await client.closed(), 4401);
    assert.deepEqual(client.frames, []);
  });

  for (const [name, frame] of [
    ['a garbage token', { type: 'AUTH', token: 'not.a.token' }],
    ['a token signed by another key', { type: 'AUTH', token: signToken(strangerKeys.privateKey, ALICE) }],
    ['an expired token', { type: 'AUTH', token: signToken(keys.privateKey, ALICE, -5) }],
    ['a token for another audience', { type: 'AUTH', token: signToken(keys.privateKey, ALICE, 900, { aud: 'someone-else' }) }],
    ['a first frame that is not AUTH', { type: 'HELLO' }],
    ['a first frame that is not JSON', 'hello'],
  ] as const) {
    it(`closes with 4401 on ${name}`, async () => {
      const client = await openSocket(url);
      client.send(frame);
      assert.equal(await client.closed(), 4401);
      assert.equal(client.frames.length, 0);
    });
  }

  it('answers a valid token with AUTH_OK and the unread count, and keeps the socket past the handshake timeout', async () => {
    const client = await openSocket(url);
    client.send({ type: 'AUTH', token: signToken(keys.privateKey, ALICE) });
    assert.deepEqual(await client.frame('AUTH_OK'), { type: 'AUTH_OK', unreadCount: 3 });
    await delay(250);
    assert.equal(client.isOpen(), true);
    client.ws.close();
  });

  it('pushes a notification to every socket of its user and to nobody else', async () => {
    const [aliceOne, aliceTwo, bob, anonymous] = await Promise.all([1, 2, 3, 4].map(() => openSocket(url)));
    aliceOne.send({ type: 'AUTH', token: signToken(keys.privateKey, ALICE) });
    aliceTwo.send({ type: 'AUTH', token: signToken(keys.privateKey, ALICE) });
    bob.send({ type: 'AUTH', token: signToken(keys.privateKey, BOB) });
    await Promise.all([aliceOne.frame('AUTH_OK'), aliceTwo.frame('AUTH_OK'), bob.frame('AUTH_OK')]);

    assert.equal(hub.push(ALICE, notification), 2);
    assert.deepEqual(await aliceOne.frame('NOTIFICATION'), { type: 'NOTIFICATION', data: notification });
    await aliceTwo.frame('NOTIFICATION');
    await delay(100);
    assert.equal(bob.frames.some((f) => f.type === 'NOTIFICATION'), false);
    assert.deepEqual(anonymous.frames, [], 'an unauthenticated socket receives nothing');

    aliceOne.ws.close();
    await until(() => hub.connectionCount(ALICE) === 1, 'closed socket evicted');
    assert.equal(hub.push(ALICE, notification), 1);
    assert.equal(hub.push('20000000-0000-4000-8000-00000000ffff', notification), 0);
    for (const client of [aliceTwo, bob, anonymous]) client.ws.close();
  });

  it('ignores frames after the handshake instead of echoing them to other clients', async () => {
    const [alice, bob] = await Promise.all([openSocket(url), openSocket(url)]);
    alice.send({ type: 'AUTH', token: signToken(keys.privateKey, ALICE) });
    bob.send({ type: 'AUTH', token: signToken(keys.privateKey, BOB) });
    await Promise.all([alice.frame('AUTH_OK'), bob.frame('AUTH_OK')]);
    alice.send({ type: 'NOTIFICATION', data: { title: 'spam' } });
    await delay(150);
    assert.equal(bob.frames.length, 1, 'only AUTH_OK');
    assert.equal(alice.isOpen(), true);
    alice.ws.close();
    bob.ws.close();
  });

  it('closes the socket with 4401 when the token expires', async () => {
    const client = await openSocket(url);
    client.send({ type: 'AUTH', token: signToken(keys.privateKey, ALICE, 2) });
    await client.frame('AUTH_OK');
    assert.equal(await client.closed(4000), 4401);
    await until(() => hub.connectionCount(ALICE) === 0, 'expired socket evicted');
  });
});
