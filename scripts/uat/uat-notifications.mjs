// AI Assistance Disclosure:
// Tool: Claude Code (model: Claude Fable 5.1), date: 2026-10-22
// Scope: Events are published with the version-2 contract of the author's Notification Redesign; N6/N7 now check the
// quiet publication receipt and the courier's completion notice; N17–N19 add the two-recipient admin cancellation
// with its redelivery, the action_needed view before and after completion, and the authoritative unread count on
// PATCH read. Counts updated for the extra receipt.
// Author review: <to be completed by Reallyeasy1>
//
// Tool: Claude Code (model: Claude Fable 5.1), date: 2026-10-17
// Scope: The published events carry courierUsername and N4 asserts the acceptance body names the courier (F5.1.1).
// Author review: <to be completed by Reallyeasy1>
//
// Tool: Claude Code (model: Claude Fable 5.1), date: 2026-10-05
// Scope: Acceptance driver for the Notification Service (issue #52, F5): logs in through the gateway, opens the WebSocket, publishes order events to RabbitMQ as Order Service will, and checks the pushed frames and the REST API.
// Author review: <to be completed by Reallyeasy1>
// AI-generated (edited by Reallyeasy1)
// Run: node scripts/uat/uat-notifications.mjs   (stack up: docker compose up --build -d; uses amqplib from the repo's node_modules)
// The driver publishes the events itself with the order_service broker account, shaped exactly as Order Service
// writes them (schemaVersion 2). Set AMQP_URL when RabbitMQ is not on localhost:5672.
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

// ---------------------------------------------------------------- order events, published as Order Service writes them (schemaVersion 2)
const connection = await amqp.connect(AMQP_URL);
const channel = await connection.createConfirmChannel();
const publish = (event) => new Promise((resolve, reject) => {
  channel.publish('campus.events', event.eventType, Buffer.from(JSON.stringify(event)),
    { persistent: true, contentType: 'application/json', messageId: event.eventId }, (error) => (error ? reject(error) : resolve()));
});
const orderId = randomUUID();
const orderCode = `UAT-${Date.now().toString(36).slice(-5).toUpperCase()}`;
let version = 1;
// One committed Order fact: the envelope of Notification Redesign §6 around the fields the legacy events carried.
const v2 = (eventType, at, { previousStatus, status, actor, reasonCode, extra = {}, order = orderId, code = orderCode }) => ({
  eventId: randomUUID(), eventType, timestamp: new Date(Date.now() + at).toISOString(),
  schemaVersion: 2, producer: 'order-service', correlationId: order,
  orderId: order, orderCode: code, orderVersion: ++version, previousStatus, status,
  requesterId: alice.userId, rewardCredits: 8,
  actorRole: actor === 'SYSTEM' ? 'SYSTEM' : actor === 'ADMIN' ? 'ADMIN' : 'STUDENT',
  ...(actor !== 'SYSTEM' && { actorId: actor === 'ADMIN' ? '90000000-0000-4000-8000-000000000001' : actor }),
  ...(reasonCode && { reasonCode }),
  ...extra,
});
const courier = { courierId: bob.userId, courierUsername: 'bob' };
// Build in commit order: orderVersion must grow with the transitions, or a later event counts as stale.
await publish(v2('order.created', -1000, { previousStatus: 'PENDING', status: 'OPEN', actor: 'SYSTEM', extra: { campusZone: 'UTown', expiresAt: new Date(Date.now() + 3_600_000).toISOString() } }));
const acceptedEvent = v2('order.accepted', 0, { previousStatus: 'OPEN', status: 'ACCEPTED', actor: bob.userId, extra: courier });
await publish(acceptedEvent);
await publish(v2('order.in_transit', 1000, { previousStatus: 'ACCEPTED', status: 'IN_TRANSIT', actor: bob.userId, extra: courier }));
await publish(v2('order.delivered', 2000, { previousStatus: 'IN_TRANSIT', status: 'DELIVERED', actor: bob.userId, extra: courier }));

const F5 = ['ORDER_ACCEPTED', 'ORDER_PICKED_UP', 'ORDER_DELIVERED'];
const mine = () => aliceSocket.frames.filter((f) => f.type === 'NOTIFICATION' && f.data.orderId === orderId);
const mineF5 = () => mine().filter((f) => F5.includes(f.data.kind));
await until(() => mineF5().length >= 3);
const kinds = mineF5().map((f) => f.data.kind).join(',');
record('N3', 'accepted, picked up and delivered are pushed to the requester in order (F5.1, F5.2, F5.3)', kinds === F5.join(','), kinds);
const first = mineF5()[0]?.data;
record('N4', 'the acceptance notification names the errand and the courier and carries the courier id (F5.1.1)', first?.title === `Your errand ${orderCode} was accepted` && first?.body === 'bob accepted your errand and will pick the items up next.' && first?.courierId === bob.userId, `${first?.title} / ${first?.body}`);
const delivered = mineF5()[2]?.data;
record('N5', 'the delivery notification asks the requester to confirm and is an open action (F5.3.1)', /confirm/i.test(delivered?.body ?? '') && delivered?.actionType === 'REVIEW_DELIVERY' && delivered?.category === 'ACTION' && delivered?.orderStatus === 'DELIVERED', `${delivered?.body} / ${delivered?.actionType} / ${delivered?.orderStatus}`);

// ---------------------------------------------------------------- action_needed view, then completion
const actionBefore = (await call('/api/notifications?view=action_needed', { token: alice.token })).json?.data;
await publish(v2('order.completed', 3000, { previousStatus: 'DELIVERED', status: 'COMPLETED', actor: alice.userId, reasonCode: 'REQUESTER_CONFIRMED', extra: courier }));
const bobCompletion = await until(() => bobSocket.frames.find((f) => f.type === 'NOTIFICATION' && f.data.orderId === orderId && f.data.kind === 'ORDER_COMPLETED'));
await delay(300);
const published = mine().find((f) => f.data.kind === 'ORDER_PUBLISHED')?.data;
record('N6', 'order.created gives the requester a quiet ORDER_PUBLISHED receipt; completion by the requester adds nothing for her', Boolean(published) && published.category === 'PROGRESS' && mine().length === 4, `alice frames for this errand: ${mine().map((f) => f.data.kind).join(',')}`);
record('N7', 'the courier gets exactly the completion notice without a payment claim; an unauthenticated socket gets nothing', Boolean(bobCompletion) && !/received|transferred|refunded/i.test(bobCompletion?.data.body ?? '') && bobSocket.frames.filter((f) => f.type === 'NOTIFICATION' && f.data.orderId === orderId).length === 1 && unauthenticated.frames.length === 0, `${bobCompletion?.data.title} / ${bobCompletion?.data.body}`);
const actionAfter = (await call('/api/notifications?view=action_needed', { token: alice.token })).json?.data;
record('N18', 'view=action_needed lists the delivered errand and drops it once order.completed arrives', (actionBefore?.items ?? []).some((n) => n.orderId === orderId) && !(actionAfter?.items ?? []).some((n) => n.orderId === orderId), `before=${(actionBefore?.items ?? []).filter((n) => n.orderId === orderId).length} after=${(actionAfter?.items ?? []).filter((n) => n.orderId === orderId).length}`);

// ---------------------------------------------------------------- redelivery
await publish(acceptedEvent);
// A later event on another errand of alice's: once it is pushed, the redelivery before it has been handled.
await publish(v2('order.accepted', 4000, { previousStatus: 'OPEN', status: 'ACCEPTED', actor: bob.userId, extra: courier, order: randomUUID(), code: `${orderCode}-B` }));
await until(() => aliceSocket.frames.some((f) => f.type === 'NOTIFICATION' && f.data.orderCode === `${orderCode}-B`));
record('N8', 'a redelivered event adds no second notification', mine().length === 4, `${mine().length} frames after redelivery`);

// ---------------------------------------------------------------- two recipients: an administrator cancels an accepted errand
const secondOrder = randomUUID();
const secondCode = `${orderCode}-C`;
version = 1;
const adminCancel = v2('order.cancelled', 5000, { previousStatus: 'ACCEPTED', status: 'CANCELLED', actor: 'ADMIN', reasonCode: 'ADMIN_CANCELLED', extra: { courierId: bob.userId }, order: secondOrder, code: secondCode });
await publish(adminCancel);
const aliceCancel = await until(() => aliceSocket.frames.find((f) => f.type === 'NOTIFICATION' && f.data.orderId === secondOrder));
const bobCancel = await until(() => bobSocket.frames.find((f) => f.type === 'NOTIFICATION' && f.data.orderId === secondOrder));
await publish(adminCancel);
await delay(500);
const cancelFrames = (socket) => socket.frames.filter((f) => f.type === 'NOTIFICATION' && f.data.orderId === secondOrder).length;
record('N17', 'an admin cancellation (v2) reaches requester and courier once each, and its redelivery adds nothing', Boolean(aliceCancel && bobCancel) && aliceCancel.data.kind === 'ORDER_CANCELLED' && bobCancel.data.priority === 'HIGH' && cancelFrames(aliceSocket) === 1 && cancelFrames(bobSocket) === 1, `${aliceCancel?.data.title}: ${aliceCancel?.data.body}`);

// ---------------------------------------------------------------- new routing key: the courier drops an accepted errand
const thirdOrder = randomUUID();
version = 1;
await publish(v2('order.unassigned', 6000, { previousStatus: 'ACCEPTED', status: 'OPEN', actor: bob.userId, reasonCode: 'COURIER_DROPPED', extra: { priorCourierId: bob.userId }, order: thirdOrder, code: `${orderCode}-D` }));
const dropped = await until(() => aliceSocket.frames.find((f) => f.type === 'NOTIFICATION' && f.data.orderId === thirdOrder));
record('N20', 'order.unassigned (new key, bound and permitted) tells the requester her courier dropped the errand; the courier gets no self-alert', dropped?.data.kind === 'ORDER_UNASSIGNED' && dropped?.data.priority === 'HIGH' && !bobSocket.frames.some((f) => f.type === 'NOTIFICATION' && f.data.orderId === thirdOrder), `${dropped?.data.title}: ${dropped?.data.body}`);

// ---------------------------------------------------------------- REST: retained, scoped, read state
const list = (await call('/api/notifications', { token: alice.token })).json?.data;
const rows = (list?.items ?? []).filter((n) => n.orderId === orderId);
// alice's new rows: four for this errand, the acceptance of B, the admin cancellation of C and the courier drop of D.
record('N9', 'the notifications are retained and listed newest first', rows.map((n) => n.kind).join(',') === 'ORDER_DELIVERED,ORDER_PICKED_UP,ORDER_ACCEPTED,ORDER_PUBLISHED' && list.unreadCount === (before?.unreadCount ?? 0) + 7, `unread ${before?.unreadCount} -> ${list?.unreadCount}`);
const bobList = (await call('/api/notifications', { token: bob.token })).json?.data;
record('N10', "another user's list holds only his own notices for these errands", (bobList?.items ?? []).filter((n) => n.orderId === orderId).length === 1 && (bobList?.items ?? []).filter((n) => n.orderId === secondOrder).length === 1, `bob sees ${(bobList?.items ?? []).filter((n) => [orderId, secondOrder].includes(n.orderId)).map((n) => n.kind).join(',')}`);
const foreign = await call(`/api/notifications/${rows[0]?.id}/read`, { method: 'PATCH', token: bob.token });
record('N11', "marking another user's notification read -> 404", foreign.status === 404, `HTTP ${foreign.status} ${foreign.json?.code}`);
const read = await call(`/api/notifications/${rows[0]?.id}/read`, { method: 'PATCH', token: alice.token });
const unreadOnly = (await call('/api/notifications?unread=true', { token: alice.token })).json?.data;
record('N12', 'PATCH /:id/read marks one read and unread=true no longer lists it', read.status === 200 && Boolean(read.json?.data?.readAt) && !unreadOnly.items.some((n) => n.id === rows[0].id), `readAt=${read.json?.data?.readAt}`);
record('N19', 'PATCH /:id/read returns the authoritative unread count', read.json?.meta?.unreadCount === list.unreadCount - 1 && unreadOnly?.unreadCount === read.json?.meta?.unreadCount, `meta.unreadCount=${read.json?.meta?.unreadCount}`);
const readAll = await call('/api/notifications/read-all', { method: 'POST', token: alice.token });
const after = (await call('/api/notifications?unread=true', { token: alice.token })).json?.data;
record('N13', 'POST /read-all marks the rest read and reports the count', readAll.status === 200 && readAll.json?.data?.unreadCount === 0 && after?.total === 0 && after?.unreadCount === 0, `updated=${readAll.json?.data?.updated}, unread now ${after?.unreadCount}`);

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
