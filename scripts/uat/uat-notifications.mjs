// AI Assistance Disclosure:
// Tool: Claude Code (model: Claude Fable 5.1), date: 2026-10-05
// Scope: Acceptance driver for the Notification Service (issue #52, F5): logs in through the gateway, opens the WebSocket, publishes order events to RabbitMQ as Order Service will, and checks the pushed frames and the REST API.
// Author review: <to be completed by Reallyeasy1>
// AI-generated (edited by Reallyeasy1)
// Run: node scripts/uat/uat-notifications.mjs   (stack up: docker compose up --build -d; uses amqplib from the repo's node_modules)
// Order Service does not publish yet (#72), so this driver publishes the events itself with the order_service
// broker account. Set AMQP_URL when RabbitMQ is not on localhost:5672.
import { randomUUID } from 'node:crypto';
import { setTimeout as delay } from 'node:timers/promises';
import amqp from 'amqplib';

const GW = process.env.GW ?? 'http://localhost';
const WS_URL = process.env.WS_URL ?? GW.replace(/^http/, 'ws') + '/ws/';
const AMQP_URL = process.env.AMQP_URL ?? 'amqp://order_service:order-service-dev@localhost:5672/campus';
const PW = 'Password123!';
const results = [];

function record(id, name, pass, detail) {
  results.push({ id, name, pass, detail });
  console.log(`${pass ? 'PASS' : 'FAIL'}  ${id.padEnd(4)} ${name}${detail ? '  -> ' + detail : ''}`);
}

async function call(path, { method = 'GET', token, body } = {}) {
  const headers = {};
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(GW + path, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) });
  const text = await res.text();
  let json = null;
  try { json = text ? JSON.parse(text) : null; } catch { /* non-JSON */ }
  return { status: res.status, json };
}

async function login(email) {
  const res = await call('/api/auth/login', { method: 'POST', body: { email, password: PW } });
  const token = res.json?.data?.accessToken;
  return { token, userId: token ? JSON.parse(Buffer.from(token.split('.')[1], 'base64url').toString('utf8')).sub : undefined };
}

async function until(check, timeoutMs = 10_000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const value = await check();
    if (value) return value;
    await delay(50);
  }
  return undefined;
}

function openSocket() {
  const ws = new WebSocket(WS_URL);
  const state = { ws, frames: [], closeCode: undefined, opened: false };
  ws.addEventListener('open', () => { state.opened = true; });
  ws.addEventListener('message', (event) => state.frames.push(JSON.parse(event.data)));
  ws.addEventListener('close', (event) => { state.closeCode = event.code; });
  return state;
}

const alice = await login('alice@u.nus.edu');
const bob = await login('bob@u.nus.edu');
record('N0', 'alice and bob log in through the gateway', Boolean(alice.token && bob.token), `alice=${alice.userId}`);

// ---------------------------------------------------------------- REST needs a token
{
  const anonymous = await call('/api/notifications');
  record('N1', 'GET /api/notifications without a token -> 401 (routed by the gateway)', anonymous.status === 401, `HTTP ${anonymous.status} ${anonymous.json?.code}`);
}

// ---------------------------------------------------------------- socket handshake
const unauthenticated = openSocket();
const aliceSocket = openSocket();
const bobSocket = openSocket();
await until(() => aliceSocket.opened && bobSocket.opened && unauthenticated.opened);
aliceSocket.ws.send(JSON.stringify({ type: 'AUTH', token: alice.token }));
bobSocket.ws.send(JSON.stringify({ type: 'AUTH', token: bob.token }));
const aliceOk = await until(() => aliceSocket.frames.find((f) => f.type === 'AUTH_OK'));
await until(() => bobSocket.frames.find((f) => f.type === 'AUTH_OK'));
record('N2', 'AUTH frame with the access token -> AUTH_OK with the unread count', typeof aliceOk?.unreadCount === 'number', JSON.stringify(aliceOk));
const before = (await call('/api/notifications', { token: alice.token })).json?.data;

// ---------------------------------------------------------------- order events, published as Order Service will
const connection = await amqp.connect(AMQP_URL);
const channel = await connection.createConfirmChannel();
const publish = (event) => new Promise((resolve, reject) => {
  channel.publish('campus.events', event.eventType, Buffer.from(JSON.stringify(event)),
    { persistent: true, contentType: 'application/json', messageId: event.eventId }, (error) => (error ? reject(error) : resolve()));
});
const orderId = randomUUID();
const orderCode = `UAT-${Date.now().toString(36).slice(-5).toUpperCase()}`;
const event = (eventType, at) => ({
  eventId: randomUUID(), eventType, timestamp: new Date(Date.now() + at).toISOString(),
  orderId, orderCode, requesterId: alice.userId, courierId: bob.userId,
});
const acceptedEvent = event('order.accepted', 0);
await publish(event('order.created', -1000));
await publish(acceptedEvent);
await publish(event('order.in_transit', 1000));
await publish(event('order.delivered', 2000));
await publish(event('order.completed', 3000));

const mine = () => aliceSocket.frames.filter((f) => f.type === 'NOTIFICATION' && f.data.orderId === orderId);
await until(() => mine().length >= 3);
const kinds = mine().map((f) => f.data.kind).join(',');
record('N3', 'accepted, picked up and delivered are pushed to the requester in order (F5.1, F5.2, F5.3)', kinds === 'ORDER_ACCEPTED,ORDER_PICKED_UP,ORDER_DELIVERED', kinds);
const first = mine()[0]?.data;
record('N4', 'the acceptance notification names the errand and carries the courier id (F5.1.1)', first?.title === `Your errand ${orderCode} was accepted` && first?.courierId === bob.userId, first?.title);
record('N5', 'the delivery notification asks the requester to confirm (F5.3.1)', /confirm/i.test(mine()[2]?.data.body ?? ''), mine()[2]?.data.body);
await delay(300);
record('N6', 'order.created and order.completed produce no notification', mine().length === 3, `${mine().length} frames for this errand`);
record('N7', 'the courier and an unauthenticated socket receive nothing', !bobSocket.frames.some((f) => f.type === 'NOTIFICATION' && f.data.orderId === orderId) && unauthenticated.frames.length === 0, `bob frames=${bobSocket.frames.length - 1}, unauthenticated frames=${unauthenticated.frames.length}`);

// ---------------------------------------------------------------- redelivery
await publish(acceptedEvent);
await publish({ ...event('order.accepted', 4000), requesterId: bob.userId, courierId: alice.userId });
await until(() => bobSocket.frames.some((f) => f.type === 'NOTIFICATION' && f.data.orderId === orderId));
record('N8', 'a redelivered event adds no second notification', mine().length === 3, `${mine().length} frames after redelivery`);

// ---------------------------------------------------------------- REST: retained, scoped, read state
const list = (await call('/api/notifications', { token: alice.token })).json?.data;
const rows = (list?.items ?? []).filter((n) => n.orderId === orderId);
record('N9', 'the notifications are retained and listed newest first', rows.map((n) => n.kind).join(',') === 'ORDER_DELIVERED,ORDER_PICKED_UP,ORDER_ACCEPTED' && list.unreadCount === (before?.unreadCount ?? 0) + 3, `unread ${before?.unreadCount} -> ${list?.unreadCount}`);
const bobList = (await call('/api/notifications', { token: bob.token })).json?.data;
record('N10', "another user's list does not contain them", (bobList?.items ?? []).filter((n) => n.orderId === orderId).length === 1, `bob sees ${(bobList?.items ?? []).filter((n) => n.orderId === orderId).length} (his own)`);
const foreign = await call(`/api/notifications/${rows[0]?.id}/read`, { method: 'PATCH', token: bob.token });
record('N11', "marking another user's notification read -> 404", foreign.status === 404, `HTTP ${foreign.status} ${foreign.json?.code}`);
const read = await call(`/api/notifications/${rows[0]?.id}/read`, { method: 'PATCH', token: alice.token });
const unreadOnly = (await call('/api/notifications?unread=true', { token: alice.token })).json?.data;
record('N12', 'PATCH /:id/read marks one read and unread=true no longer lists it', read.status === 200 && Boolean(read.json?.data?.readAt) && !unreadOnly.items.some((n) => n.id === rows[0].id), `readAt=${read.json?.data?.readAt}`);
const readAll = await call('/api/notifications/read-all', { method: 'POST', token: alice.token });
const after = (await call('/api/notifications?unread=true', { token: alice.token })).json?.data;
record('N13', 'POST /read-all marks the rest read', readAll.status === 200 && after?.total === 0 && after?.unreadCount === 0, `updated=${readAll.json?.data?.updated}, unread now ${after?.unreadCount}`);

// ---------------------------------------------------------------- a reconnect starts with the retained state
const again = openSocket();
await until(() => again.opened);
again.ws.send(JSON.stringify({ type: 'AUTH', token: bob.token }));
const againOk = await until(() => again.frames.find((f) => f.type === 'AUTH_OK'));
record('N14', 'a new socket reports the unread count kept from before (retained for review after reconnecting)', againOk?.unreadCount >= 1, JSON.stringify(againOk));

// ---------------------------------------------------------------- sockets without AUTH are closed
const closeCode = await until(() => unauthenticated.closeCode, 8000);
record('N15', 'a socket that never sends AUTH is closed with 4401', closeCode === 4401, `close code ${closeCode}`);
const bad = openSocket();
await until(() => bad.opened);
bad.ws.send(JSON.stringify({ type: 'AUTH', token: alice.token.slice(0, -4) + 'AAAA' }));
const badCode = await until(() => bad.closeCode, 4000);
record('N16', 'a tampered token is closed with 4401', badCode === 4401, `close code ${badCode}`);

await call('/api/notifications/read-all', { method: 'POST', token: bob.token });
for (const socket of [aliceSocket, bobSocket, again]) socket.ws.close();
await channel.close();
await connection.close();

const passed = results.filter((r) => r.pass).length;
console.log(`\n${passed}/${results.length} notification checks passed`);
process.exit(passed === results.length ? 0 : 1);
