/**
 * AI Assistance Disclosure:
 * Tool: Codex (model: GPT-6), date: 2026-11-08
 * Scope: Resolve the merge by preserving shutdown draining and moderation socket tests together.
 * Author review: <to be completed by the author>
 *
 * Tool: Codex (model: GPT-6), date: 2026-11-08
 * Scope: Verify shutdown closes sockets with 1001 and waits for an in-flight SEND operation.
 * Author review: <to be completed by the author>
 *
 * Tool: Claude Code (model: Claude Fable 5.1), date: 2026-10-20
 * Scope: Socket tests for the chat hub: the AUTH handshake and its 4401 rejections, SEND delivered as MESSAGE to
 * both participants and to every tab of the sender but not to a third user, ERROR frames with the client id for
 * empty text, a closed conversation and a non-participant, BAD_FRAME for anything else. In-memory store.
 * Author review: <to be completed by Reallyeasy1>
 *
 * Tool: Claude Code (model: Claude Fable 5.1), date: 2026-10-25
 * Scope: Review fix (PR #148): asserts the sender's MESSAGE echo carries the clientId and the recipient's does not.
 * Author review: <to be completed by Reallyeasy1>
 *
 * Tool: Claude Code (model: Claude Sonnet 5.5), date: 2026-11-07
 * Scope: Moderation socket test: flagged send gives the sender ERROR MODERATED and the other participant MODERATED_PEER, nothing stored.
 * Author review: <to be completed by the author>
 */
// AI-generated (edited by Reallyeasy1)
import assert from 'node:assert/strict';
import { after, before, describe, it } from 'node:test';
import type { AddressInfo } from 'node:net';
import { WebSocketServer } from 'ws';
import { createConversationService } from '../src/conversations/service';
import { createChatHub, createSocketAuthenticator } from '../src/ws/hub';
import { ALICE, AUDIENCE, BOB, CAROL, ISSUER, ORDER, makeKeys, memoryStore, openSocket, signToken, until } from './helpers';

describe('chat hub', () => {
  const keys = makeKeys();
  const { store } = memoryStore();
  const service = createConversationService({ store, orders: { async getOrder() { return { kind: 'not_found' }; } } });
  const hub = createChatHub({
    authenticate: createSocketAuthenticator({ publicKey: keys.publicKey, issuer: ISSUER, audience: AUDIENCE }),
    send: service.send,
    authTimeoutMs: 300,
  });
  let wss: WebSocketServer;
  let url: string;

  before(async () => {
    await store.upsertAccepted({ orderId: ORDER, requesterId: ALICE, courierId: BOB, createdAt: '2026-10-20T04:00:00.000Z' });
    wss = new WebSocketServer({ port: 0 });
    wss.on('connection', hub.handleConnection);
    await new Promise<void>((resolve) => wss.once('listening', resolve));
    url = `ws://127.0.0.1:${(wss.address() as AddressInfo).port}`;
  });

  after(async () => {
    await hub.close();
    await new Promise<void>((resolve) => wss.close(() => resolve()));
  });

  const connect = async (userId: string, claims: Record<string, unknown> = {}) => {
    const client = await openSocket(url);
    client.send({ type: 'AUTH', token: signToken(keys.privateKey, userId, claims) });
    await client.frame('AUTH_OK');
    return client;
  };

  it('closes with 4401 when the first frame is not AUTH, the token is bad, or nothing arrives in time', async () => {
    const notAuth = await openSocket(url);
    notAuth.send({ type: 'SEND', orderId: ORDER, text: 'hi' });
    assert.equal(await notAuth.closed(), 4401);
    const badToken = await openSocket(url);
    badToken.send({ type: 'AUTH', token: 'nope' });
    assert.equal(await badToken.closed(), 4401);
    const silent = await openSocket(url);
    assert.equal(await silent.closed(2000), 4401);
    assert.equal(hub.connectionCount(), 0);
  });

  it('delivers a SEND as MESSAGE to both participants and every tab of the sender, not to others', async () => {
    const alice = await connect(ALICE, { username: 'alice' });
    const aliceTab = await connect(ALICE, { username: 'alice' });
    const bob = await connect(BOB, { username: 'bob' });
    const carol = await connect(CAROL);
    assert.equal(hub.connectionCount(ALICE), 2);

    alice.send({ type: 'SEND', orderId: ORDER, text: '  on my way ', clientId: 'c1' });
    const [a, a2, b] = await Promise.all([alice.frame('MESSAGE'), aliceTab.frame('MESSAGE'), bob.frame('MESSAGE')]);
    for (const frame of [a, a2, b]) {
      assert.equal(frame.orderId, ORDER);
      assert.deepEqual([frame.message.sequence, frame.message.senderId, frame.message.senderUsername, frame.message.senderRole, frame.message.text],
        [1, ALICE, 'alice', 'STUDENT', 'on my way']);
    }
    // The sender's own echo (every tab) names the SEND it answers; the other participant's copy does not.
    assert.deepEqual([a.clientId, a2.clientId, b.clientId], ['c1', 'c1', undefined]);
    bob.send({ type: 'SEND', orderId: ORDER, text: 'ok' });
    assert.equal((await alice.frame('MESSAGE', 2)).message.sequence, 2);
    assert.equal(carol.frames.filter((f) => f.type === 'MESSAGE').length, 0, 'a third user hears nothing');

    for (const c of [alice, aliceTab, bob, carol]) c.ws.close();
    await until(() => hub.connectionCount() === 0, 'sockets evicted');
  });

  it('answers a rejected SEND with ERROR carrying the client id and the reason', async () => {
    const alice = await connect(ALICE, { username: 'alice' });
    const carol = await connect(CAROL);

    alice.send({ type: 'SEND', orderId: ORDER, text: '   ', clientId: 'c2' });
    const empty = await alice.frame('ERROR');
    assert.deepEqual([empty.code, empty.clientId, empty.orderId], ['EMPTY', 'c2', ORDER]);

    carol.send({ type: 'SEND', orderId: ORDER, text: 'let me in' });
    assert.equal((await carol.frame('ERROR')).code, 'FORBIDDEN');

    alice.send({ type: 'SEND', orderId: '30000000-0000-4000-8000-000000000002', text: 'hi' });
    assert.equal((await alice.frame('ERROR', 2)).code, 'NOT_FOUND');

    alice.send({ type: 'PING' });
    assert.equal((await alice.frame('ERROR', 3)).code, 'BAD_FRAME');
    alice.send('not json');
    assert.equal((await alice.frame('ERROR', 4)).code, 'BAD_FRAME');
    assert.equal(alice.isOpen(), true, 'a bad frame after AUTH does not close the socket');

    await store.close(ORDER, '2026-10-20T05:00:00.000Z');
    alice.send({ type: 'SEND', orderId: ORDER, text: 'late' });
    assert.equal((await alice.frame('ERROR', 5)).code, 'CLOSED');

    alice.ws.close();
    carol.ws.close();
    await until(() => hub.connectionCount() === 0, 'sockets evicted');
  });
});

// AI-generated (edited by ngkhengyang)
it('drains an in-flight SEND before shutdown finishes', { timeout: 5000 }, async () => {
  const keys = makeKeys();
  let release!: () => void;
  let started!: () => void;
  const sending = new Promise<void>((resolve) => { started = resolve; });
  const finish = new Promise<void>((resolve) => { release = resolve; });
  const hub = createChatHub({
    authenticate: createSocketAuthenticator({ publicKey: keys.publicKey, issuer: ISSUER, audience: AUDIENCE }),
    async send() { started(); await finish; return { kind: 'not_found' }; },
  });
  const wss = new WebSocketServer({ port: 0 });
  wss.on('connection', hub.handleConnection);
  await new Promise<void>((resolve) => wss.once('listening', resolve));
  const client = await openSocket(`ws://127.0.0.1:${(wss.address() as AddressInfo).port}`);
  try {
    client.send({ type: 'AUTH', token: signToken(keys.privateKey, ALICE, { username: 'alice' }) });
    await client.frame('AUTH_OK');
    client.send({ type: 'SEND', orderId: ORDER, text: 'already in flight' });
    await sending;
    let drained = false;
    const closing = hub.close().then(() => { drained = true; });
    assert.equal(await client.closed(), 1001);
    assert.equal(drained, false, 'database work is still in flight after the socket closes');
    release();
    await closing;
    assert.equal(drained, true);
  } finally {
    release();
    client.ws.terminate();
    await hub.close();
    await new Promise<void>((resolve) => wss.close(() => resolve()));
  }
});

describe('chat hub moderation', () => {
  const keys = makeKeys();
  const { store, messages } = memoryStore();
  const service = createConversationService({
    store,
    orders: { async getOrder() { return { kind: 'not_found' }; } },
    moderate: async (text) => text.includes('badword'),
  });
  const hub = createChatHub({
    authenticate: createSocketAuthenticator({ publicKey: keys.publicKey, issuer: ISSUER, audience: AUDIENCE }),
    send: service.send,
  });
  let wss: WebSocketServer;
  let url: string;

  before(async () => {
    await store.upsertAccepted({ orderId: ORDER, requesterId: ALICE, courierId: BOB, createdAt: '2026-10-20T04:00:00.000Z' });
    wss = new WebSocketServer({ port: 0 });
    wss.on('connection', hub.handleConnection);
    await new Promise<void>((resolve) => wss.once('listening', resolve));
    url = `ws://127.0.0.1:${(wss.address() as AddressInfo).port}`;
  });

  after(async () => {
    await hub.close();
    await new Promise<void>((resolve) => wss.close(() => resolve()));
  });

  const connect = async (userId: string) => {
    const client = await openSocket(url);
    client.send({ type: 'AUTH', token: signToken(keys.privateKey, userId, { username: userId === ALICE ? 'alice' : 'bob' }) });
    await client.frame('AUTH_OK');
    return client;
  };

  it('tells the sender and the other participant, and stores nothing', async () => {
    const alice = await connect(ALICE);
    const bob = await connect(BOB);
    alice.send({ type: 'SEND', orderId: ORDER, text: 'you badword', clientId: 'm1' });
    const mine = await alice.frame('ERROR');
    assert.deepEqual([mine.code, mine.clientId, mine.orderId], ['MODERATED', 'm1', ORDER]);
    const theirs = await bob.frame('ERROR');
    assert.deepEqual([theirs.code, theirs.clientId, theirs.orderId], ['MODERATED_PEER', undefined, ORDER]);
    assert.equal(messages.length, 0);
    assert.equal(alice.frames.filter((f) => f.type === 'MESSAGE').length + bob.frames.filter((f) => f.type === 'MESSAGE').length, 0);

    alice.send({ type: 'SEND', orderId: ORDER, text: 'hello', clientId: 'm2' });
    assert.equal((await bob.frame('MESSAGE')).message.text, 'hello');
    assert.equal(messages.length, 1);
    alice.ws.close();
    bob.ws.close();
    await until(() => hub.connectionCount() === 0, 'sockets evicted');
  });
});
