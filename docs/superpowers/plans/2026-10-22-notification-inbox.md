# Student Notification Inbox Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn the F5 requester-only alert consumer into the recipient-aware, duplicate-safe inbox of the author's redesign (increments 1–5), leaving the financial-receipt extension (increment 6) for a later PR.

**Architecture:** Order Service keeps owning transitions and adds two committed facts (`order.rejected`, `order.unassigned`) plus version-2 fields on every outbox event, filled inside the committing transaction. Notification Service becomes a policy consumer: one transaction claims `(producer, event_id)`, advances a per-order attention projection and inserts one row per intended recipient; WebSocket frames are post-commit hints and REST is the recovery path. The student app loads the inbox over REST first, reconciles on focus/reconnect/interval, shows Action needed / Important / All views and deep-links each item to its errand.

**Tech Stack:** TypeScript, Express, Prisma 6 / PostgreSQL 16, RabbitMQ 3.13 via `@campus-errand/messaging`, Debezium outbox CDC (unchanged), React + Vite, Node's built-in test runner via `tsx`.

**Spec:** `C:\Users\Lenovo\Downloads\Friend-on-Campus-Notification-Redesign.md` (team design proposal, 22 Oct 2026, pinned to main 52d791e). Implements its sections 2–11; section 4's credit/chat/reminder/matching rows and section 11 increment 6 are out of scope.

**Repo rules that bind every task:** CLAUDE.md §1–2: no commits/pushes by the agent (changes stay in the working tree on branch `feature/notification-inbox`); one consolidated AI disclosure block per touched file; `// AI-generated (edited by Reallyeasy1)` markers; one `ai/usage-log.md` entry for the whole prompt; CI matrix sync (`npm run ci:validate-tests`) if any `test:*` script changes. Tech stack is closed: no new dependencies.

## Global Constraints

- Message contract: `schemaVersion: 2` is additive; absence means version 1. `eventType` equals the routing key. Required v2 fields: `eventId, eventType, timestamp, schemaVersion, producer, orderId, orderCode, orderVersion, previousStatus, status, actorRole, requesterId, correlationId`; `actorId` required unless `actorRole === 'SYSTEM'`; `reasonCode` from the allowlist below; `courierId`/`priorCourierId` as the matrix requires.
- Reason codes (allowlist, spec §6): `REQUESTER_CANCELLED, ADMIN_CANCELLED, COURIER_DROPPED, ADMIN_UNASSIGNED, OPEN_EXPIRED, PUBLICATION_EXPIRED, INSUFFICIENT_CREDITS, RESERVATION_FAILED, REQUESTER_CONFIRMED, ADMIN_CONFIRMED`.
- Recipient uniqueness: `UNIQUE (producer, event_id, user_id, kind)` replaces `UNIQUE (event_id)`. Processed events keyed `(producer, event_id)`. Existing row ids, `read_at` and `created_at` are preserved by the migration.
- Inbox ordering and paging: `stored_at DESC, id DESC`. `created_at` stays the event occurrence time.
- Notification Service never calls Order or Credit, never writes order state. Opening a notification only marks it read.
- Copy: no message may say credits were transferred, received or refunded. Admin reason text never reaches a notification.
- v1 (legacy) events: only `order.accepted`, `order.in_transit`, `order.delivered` produce rows; every other v1 key is recorded as processed with outcome `suppressed`.
- Toast rule (client): never for `ORDER_PUBLISHED`; otherwise only when the student is not on the Tasks or Alerts tab; never from a duplicate frame or a stale (older-version) event.
- Routing: RabbitMQ topic permissions and consumer bindings add exactly `order.rejected` and `order.unassigned`; nothing else.
- Retry: invalid or mismatched contracts are permanent (DLQ); `isInfrastructureFailure` errors retry without limit; other handler errors retry `NOTIFICATION_RETRY_LIMIT` times (new default 5, 2 s apart).

## Review Focus

Behaviours the spec implies but no acceptance scenario spells out; each has a test in the owning task.

1. A v2 event whose `orderVersion` is lower than the projection's (completion seen before delivery) must still store the delivery row but must not push a `NOTIFICATION` frame and must not move the projection backward. → Task 3 (`applyEvent` stale case) and Task 5 (no push when stale).
2. The same `eventId` arriving with a different normalized payload must dead-letter, not silently no-op or overwrite. → Task 3 (`ContractMismatch`) and Task 4 (classifier → permanent).
3. An admin who is also a participant (admin cancels their own errand) must not receive their own notice; recipients must be deduplicated when requester equals prior courier in corrupt data. → Task 4.
4. `POST /read-all` must not mark a row inserted after the request started, and both read routes must return the authoritative `unreadCount`. → Task 3/5 integration test.
5. `GET /api/notifications?view=action_needed` must exclude a delivered notice whose projection says the order moved on, and must include a legacy delivered row with no projection (client then validates against live order status). → Task 3.

---

## File structure

| Area | Create | Modify |
| --- | --- | --- |
| Contracts | — | `packages/common-dtos/src/index.ts` |
| Order Service | — | `src/orders/order.types.ts`, `src/orders/order.service.ts`, `src/repositories/order.repository.ts`, `src/orders/order.routes.ts`, `test/helpers.ts`, `test/order.service.test.ts`, `test/app.test.ts` |
| Broker | — | `docker/rabbitmq/definitions.json` |
| Notification Service | `prisma/migrations/20261022120000_recipient_inbox/migration.sql`, `src/notifications/policy.ts`, `test/policy.test.ts` | `prisma/schema.prisma`, `src/notifications/events.ts`, `src/notifications/store.ts`, `src/notifications/routes.ts`, `src/ws/hub.ts`, `src/app.ts`, `src/index.ts`, `src/config.ts`, `test/events.test.ts`, `test/hub.test.ts`, `test/store-routes.integration.test.ts`, `test/messaging.integration.test.ts`, `package.json` (test:unit adds policy.test.ts) |
| Student app | `src/notifications/inbox.ts`, `test/inbox.test.ts` | `src/notifications/useNotifications.ts`, `src/notifications/NotificationBell.tsx`, `src/pages/AlertsPage.tsx`, `src/pages/TasksPage.tsx`, `src/api/orders.ts`, `src/App.tsx`, `package.json` (test:unit), delete `src/notifications/errands.ts` + `test/errands.test.ts` |
| Acceptance | — | `scripts/uat/uat-notifications.mjs`, `tests/postman/notification_collection.json`, `README.md` (relay wording), `ai/usage-log.md` |

---

### Task 1: Shared contracts (common-dtos)

**Files:**
- Modify: `packages/common-dtos/src/index.ts` (section 5 events, Notification block)

**Interfaces (Produces):**

```ts
export type OrderActorRole = 'STUDENT' | 'ADMIN' | 'SYSTEM';
export type OrderReasonCode =
  | 'REQUESTER_CANCELLED' | 'ADMIN_CANCELLED' | 'COURIER_DROPPED' | 'ADMIN_UNASSIGNED'
  | 'OPEN_EXPIRED' | 'PUBLICATION_EXPIRED' | 'INSUFFICIENT_CREDITS' | 'RESERVATION_FAILED'
  | 'REQUESTER_CONFIRMED' | 'ADMIN_CONFIRMED';
/** Version 2 of the Order event contract (spec §6). Optional on the pre-existing event types because v1 messages exist. */
export interface OrderEventV2Fields {
  schemaVersion: 2;
  producer: 'order-service';
  orderVersion: number;
  previousStatus: OrderStatus;
  status: OrderStatus;
  actorRole: OrderActorRole;
  actorId?: string;        // absent only for SYSTEM
  reasonCode?: OrderReasonCode;
  correlationId: string;   // the order id
}
// Existing OrderCreated/Accepted/InTransit/Delivered/Completed/Expired/Cancelled events: `extends BaseEvent, Partial<OrderEventV2Fields>`;
// OrderCancelledEvent and OrderExpiredEvent gain `courierId?: string` (assignee at the transition, if any).
export interface OrderRejectedEvent extends BaseEvent, OrderEventV2Fields {
  eventType: 'order.rejected'; orderId: string; orderCode: string; requesterId: string; rewardCredits: number;
  reasonCode: 'INSUFFICIENT_CREDITS' | 'RESERVATION_FAILED';
}
export interface OrderUnassignedEvent extends BaseEvent, OrderEventV2Fields {
  eventType: 'order.unassigned'; orderId: string; orderCode: string; requesterId: string; priorCourierId: string;
  reasonCode: 'COURIER_DROPPED' | 'ADMIN_UNASSIGNED';
}
// CampusErrandEvent union gains both.

export type NotificationKind =
  | 'ORDER_ACCEPTED' | 'ORDER_PICKED_UP' | 'ORDER_DELIVERED'
  | 'ORDER_PUBLISHED' | 'ORDER_REJECTED' | 'ORDER_EXPIRED' | 'ORDER_COMPLETED' | 'ORDER_CANCELLED' | 'ORDER_UNASSIGNED';
export type NotificationCategory = 'PROGRESS' | 'ACTION' | 'IMPORTANT';
export type NotificationPriority = 'NORMAL' | 'HIGH';
export type NotificationActionType = 'VIEW_ERRAND' | 'REVIEW_DELIVERY' | 'REVIEW_WALLET';
export type NotificationView = 'all' | 'action_needed' | 'important';
export interface NotificationDTO {
  id: string; kind: NotificationKind; orderId: string; orderCode?: string | null; courierId?: string | null;
  title: string; body: string; readAt?: string | null; createdAt: string;
  producer: string; category: NotificationCategory; priority: NotificationPriority;
  actionType: NotificationActionType | null; targetId: string | null; sourceVersion: number | null; storedAt: string;
  /** Latest order status in Notification Service's attention projection; null until a v2 event for the order was seen. */
  orderStatus: OrderStatus | null;
}
export interface NotificationPageDTO extends PaginatedResponse<NotificationDTO> { unreadCount: number }
```

- [ ] **Step 1: Add the types above, keep every existing export name.**
- [ ] **Step 2: Verify** — `npm run typecheck -w @campus-errand/common-dtos` passes; `npm run typecheck` at root reports errors only in notification-service and student-app (consumers of `NotificationDTO`, fixed in Tasks 3–7) — note them, do not fix here.

---

### Task 2: Order Service emits version-2 facts, rejection and unassignment

**Files:**
- Modify: `services/order-service/src/orders/order.types.ts`, `src/orders/order.service.ts`, `src/repositories/order.repository.ts`, `src/orders/order.routes.ts`
- Modify: `docker/rabbitmq/definitions.json`
- Test: `services/order-service/test/helpers.ts`, `test/order.service.test.ts`, `test/app.test.ts`

**Interfaces:**
- Consumes: Task 1 types.
- Produces:
  - `order.types.ts`: `OrderLifecycleEvent` union adds `OrderRejectedEvent | OrderUnassignedEvent`. New `export type OrderEventDraft = Omit<OrderLifecycleEvent, 'orderVersion' | 'previousStatus' | 'status'>` (the service builds drafts; the repository completes them) and `export function completeEvent(draft: OrderEventDraft, before: PrismaOrder, after: PrismaOrder): OrderLifecycleEvent` = `{ ...draft, orderVersion: after.version, previousStatus: before.status, status: after.status }` plus, for `order.cancelled`/`order.expired`, `courierId: before.courierId ?? undefined`, and for `order.unassigned`, `priorCourierId: before.courierId!`.
  - `OrderRepository`: `unassignOrder(orderId, courierId, event: OrderEventDraft)`, `adminUnassignOrder(orderId, adminUserId, reason, event: OrderEventDraft, expectedVersion?)`; all other mutating methods take `OrderEventDraft` instead of `OrderLifecycleEvent`.
  - `order.service.ts`: a private `v2(order: OrderDTO, actor: { role: OrderActorRole; id?: string }, reasonCode?: OrderReasonCode)` returning `{ schemaVersion: 2, producer: 'order-service', correlationId: order.id, actorRole, actorId, reasonCode }`, spread into every draft. Actors: accept/pickup/deliver/unassign → `{ role: 'STUDENT', id: courierId }`; complete/cancel → `{ role: 'STUDENT', id: requesterId }` with reason `REQUESTER_CONFIRMED` / `REQUESTER_CANCELLED`; admin → `{ role: 'ADMIN', id: adminUserId }` with `ADMIN_CONFIRMED` / `ADMIN_CANCELLED` / `ADMIN_UNASSIGNED`; courier drop → `COURIER_DROPPED`.
  - Repository-built events (inside `applyReservationResult` and `expireDueOrders`) are SYSTEM-actor v2: `order.created` (no reason), `order.rejected` with `reasonCode: /insufficient/i.test(event.reason) ? 'INSUFFICIENT_CREDITS' : 'RESERVATION_FAILED'`, `order.expired` with `PUBLICATION_EXPIRED` (from PENDING) or `OPEN_EXPIRED` (sweeper).

- [ ] **Step 1: Write the failing tests** in `test/order.service.test.ts` (fake repo stores the completed payload the real repo would write — see Step 3):

```ts
it('credit.reservation.failed commits REJECTED and an order.rejected v2 fact with a safe reason code', async () => {
  // createOrder, then fakeRepo.reject(order.id, 'Insufficient available credits for escrow hold')
  const rejected = fakeRepo.outboxEvents.find((e) => e.eventType === 'order.rejected');
  assert.ok(rejected);
  const p = JSON.parse(rejected.payload);
  assert.deepEqual([p.schemaVersion, p.producer, p.actorRole, p.reasonCode, p.previousStatus, p.status, p.orderVersion],
    [2, 'order-service', 'SYSTEM', 'INSUFFICIENT_CREDITS', 'PENDING', 'REJECTED', 2]);
  assert.equal(p.correlationId, order.id);
});
it('courier drop writes order.unassigned with priorCourierId and COURIER_DROPPED', ...);   // actorId === COURIER_1_ID, status OPEN, previousStatus ACCEPTED
it('admin unassign writes order.unassigned with ADMIN_UNASSIGNED and the admin as actor', ...);
it('requester cancel of an ACCEPTED errand carries the assignee, actor and committed version', ...); // courierId === COURIER_1_ID, actorRole STUDENT, reasonCode REQUESTER_CANCELLED, orderVersion === cancelled.version
it('admin completion is ADMIN_CONFIRMED; requester completion is REQUESTER_CONFIRMED', ...);
it('the sweeper marks expiry OPEN_EXPIRED and a late reservation marks it PUBLICATION_EXPIRED', ...);
```

- [ ] **Step 2: Run** `npm run test:unit -w @campus-errand/order-service` → the new tests fail (`order.rejected` not found, `priorCourierId` undefined).
- [ ] **Step 3: Implement.** Repository: every outbox write becomes `payload: JSON.stringify(completeEvent(event, order, refreshed))` where `order` is the row read at the start of the transaction and `refreshed` the row re-read after `updateMany`. Add the outbox write to `handleUnassignOrder` and `handleAdminUnassignOrder`; add the `order.rejected` write in the failed branch of `handleApplyReservationResult` (same transaction as the REJECTED update, `id: event.eventId` of the new fact). Fake repository (`test/helpers.ts`) mirrors `completeEvent` using its in-memory `before`/`after` snapshots so payloads carry the same fields. Service: build drafts with `v2(...)`; `unassignOrder`/`adminUnassignOrder` build `order.unassigned` drafts (`priorCourierId` is filled by the repository, so the draft omits it: type the draft as `Omit<OrderUnassignedEvent, ... | 'priorCourierId'>` inside `OrderEventDraft`).
- [ ] **Step 4: Route copy** (`order.routes.ts`): `'Delivery confirmed! Credits transferred to courier.'` → `'Delivery confirmed. The courier is paid once Credit Service settles the escrow.'`; `'Errand cancelled. Escrow credits refunded.'` → `'Errand cancelled. Reserved credits are returned once Credit Service processes the cancellation.'`; admin cancel → `'Order cancelled by administrator. Reserved credits are returned once Credit Service processes it.'`; admin complete → `'Order completed by administrator. Courier payment is settled by Credit Service.'`. Grep `test/app.test.ts` for the old strings and update.
- [ ] **Step 5: Broker** `docker/rabbitmq/definitions.json`: `order_service` topic write regex → `^order\.(created|accepted|in_transit|delivered|completed|cancelled|expired|rejected|unassigned|reservation\.requested)$`; `notification_service` topic read regex → `^(order\.(created|accepted|in_transit|delivered|completed|cancelled|expired|rejected|unassigned))$`.
- [ ] **Step 6: Run** `npm run test:unit -w @campus-errand/order-service` and `npm run typecheck -w @campus-errand/order-service` → PASS. The credit-service parser (`services/credit-service/src/credits/events.ts`) reads named fields only, so extra fields are ignored; run `npm run test:unit -w @campus-errand/credit-service` to confirm nothing there depends on the shape.

---

### Task 3: Notification persistence — schema, migration, store

**Files:**
- Modify: `services/notification-service/prisma/schema.prisma`
- Create: `services/notification-service/prisma/migrations/20261022120000_recipient_inbox/migration.sql`
- Modify: `services/notification-service/src/notifications/store.ts`
- Test: `services/notification-service/test/store-routes.integration.test.ts` (store `describe` only in this task)

**Interfaces (Produces):**

```ts
export interface NotificationDraft {            // one intended recipient
  userId: string; kind: NotificationKind; title: string; body: string;
  category: NotificationCategory; priority: NotificationPriority; actionType: NotificationActionType | null;
}
export interface ProcessedEventInput {           // from the parsed event
  producer: 'order-service'; eventId: string; fingerprint: string; schemaVersion: 1 | 2; policyVersion: 1;
  orderId: string; orderCode: string | null; courierId: string | null; occurredAt: string;
  projection?: { orderVersion: number; status: OrderStatus; requesterId: string; courierId: string | null }; // v2 only
}
export type AppliedEvent =
  | { outcome: 'created' | 'suppressed'; created: NotificationDTO[]; stale: boolean }
  | { outcome: 'duplicate'; created: []; stale: false };
export class ContractMismatch extends Error {}   // same eventId, different fingerprint
export interface NotificationStore {
  applyEvent(event: ProcessedEventInput, drafts: NotificationDraft[]): Promise<AppliedEvent>;
  list(userId: string, options: { view: NotificationView; unreadOnly: boolean; page: number; limit: number }): Promise<NotificationPageDTO>;
  unreadCount(userId: string): Promise<number>;
  markRead(userId: string, id: string): Promise<{ notification: NotificationDTO; unreadCount: number } | null>;
  markAllRead(userId: string): Promise<{ updated: number; unreadCount: number }>;
  ping(): Promise<boolean>;
}
```

Schema (Prisma): `Notification` gains `producer String @default("order-service")`, `category String`, `priority String`, `actionType String? @map("action_type")`, `targetId String? @map("target_id") @db.Uuid`, `sourceVersion Int? @map("source_version")`, `storedAt DateTime @default(now()) @map("stored_at") @db.Timestamptz(6)`; `@@unique([producer, eventId, userId, kind])`; `@@index([userId, storedAt(sort: Desc), id(sort: Desc)])`; `@@index([userId, readAt])`; drop `@unique` on `eventId` and the old `(userId, createdAt)` index. New models `ProcessedNotificationEvent` (`@@id([producer, eventId])`, `fingerprint String?`, `schemaVersion Int`, `policyVersion Int`, `outcome String`, `processedAt DateTime @default(now())`) → table `processed_notification_events`, and `OrderNotificationState` (`orderId @id`, `highestOrderVersion Int`, `status String`, `requesterId Uuid`, `courierId Uuid?`, `updatedAt`) → table `order_notification_state`.

Migration SQL (hand-written, in this order): `ALTER TABLE notifications ADD COLUMN producer TEXT NOT NULL DEFAULT 'order-service', ADD COLUMN category TEXT, ADD COLUMN priority TEXT, ADD COLUMN action_type TEXT, ADD COLUMN target_id UUID, ADD COLUMN source_version INTEGER, ADD COLUMN stored_at TIMESTAMPTZ(6) NOT NULL DEFAULT now();` → backfill `UPDATE notifications SET stored_at = created_at, target_id = order_id, category = CASE WHEN kind = 'ORDER_DELIVERED' THEN 'ACTION' ELSE 'PROGRESS' END, priority = CASE WHEN kind = 'ORDER_DELIVERED' THEN 'HIGH' ELSE 'NORMAL' END, action_type = CASE WHEN kind = 'ORDER_DELIVERED' THEN 'REVIEW_DELIVERY' ELSE 'VIEW_ERRAND' END;` → `ALTER COLUMN category SET NOT NULL, ALTER COLUMN priority SET NOT NULL;` → create the two tables → `INSERT INTO processed_notification_events (producer, event_id, fingerprint, schema_version, policy_version, outcome, processed_at) SELECT producer, event_id, NULL, 1, 1, 'legacy', created_at FROM notifications;` → `CREATE UNIQUE INDEX notifications_producer_event_id_user_id_kind_key ...; DROP INDEX notifications_event_id_key; CREATE INDEX notifications_user_id_stored_at_id_idx ON notifications (user_id, stored_at DESC, id DESC); CREATE INDEX notifications_user_id_read_at_idx ON notifications (user_id, read_at); DROP INDEX notifications_user_id_created_at_idx;`. Verify afterwards with `npx prisma migrate diff --from-migrations prisma/migrations --to-schema-datamodel prisma/schema.prisma --shadow-database-url <test db>` → "No difference detected" (or regenerate the index names from its output).

`applyEvent` algorithm (one `prisma.$transaction(async tx => ...)`): (1) `INSERT INTO processed_notification_events ... ON CONFLICT DO NOTHING RETURNING event_id`; if nothing returned, `SELECT fingerprint FROM processed_notification_events WHERE producer=$1 AND event_id=$2` → equal or NULL fingerprint ⇒ return `duplicate`; different ⇒ throw `ContractMismatch`. (2) If `projection` given: `INSERT INTO order_notification_state ... ON CONFLICT (order_id) DO UPDATE SET highest_order_version=EXCLUDED..., status=..., courier_id=..., updated_at=now() WHERE order_notification_state.highest_order_version < EXCLUDED.highest_order_version RETURNING order_id`; `stale = projection given && nothing returned && existing.highest_order_version > projection.orderVersion`. (3) For each draft: `INSERT INTO notifications (...) VALUES (...) ON CONFLICT (producer, event_id, user_id, kind) DO NOTHING RETURNING <all DTO columns>`; `target_id = order_id`, `source_version = projection?.orderVersion ?? null`, `created_at = occurredAt`. (4) `UPDATE processed_notification_events SET outcome = drafts.length ? 'created' : 'suppressed'`. Return created DTOs with `orderStatus` from the projection row (one `SELECT status FROM order_notification_state WHERE order_id = $1`).

`list` (raw SQL inside `prisma.$transaction([...])` so items, total and unreadCount come from one snapshot): `SELECT n.*, s.status AS "orderStatus" FROM notifications n LEFT JOIN order_notification_state s ON s.order_id = n.order_id WHERE n.user_id = $1 [AND n.read_at IS NULL] [AND n.action_type = 'REVIEW_DELIVERY' AND (s.status IS NULL OR s.status = 'DELIVERED')] [AND n.category = 'IMPORTANT'] ORDER BY n.stored_at DESC, n.id DESC LIMIT $ OFFSET $`.

- [ ] **Step 1: Write the failing store tests** (replace the three existing store `it`s):

```ts
it('one event with two recipients commits two rows atomically and replay adds nothing and keeps read_at', async () => {
  const ev = processed({ eventId: id1 });
  const first = await store.applyEvent(ev, [draft(ALICE, 'ORDER_CANCELLED'), draft(BOB, 'ORDER_CANCELLED')]);
  assert.equal(first.outcome, 'created'); assert.equal(first.created.length, 2);
  await store.markRead(ALICE, first.created.find(n => n.userId === ALICE)!.id);   // userId is not on the DTO: find by list(ALICE)
  const again = await store.applyEvent(ev, [draft(ALICE, 'ORDER_CANCELLED'), draft(BOB, 'ORDER_CANCELLED')]);
  assert.deepEqual([again.outcome, again.created.length], ['duplicate', 0]);
  assert.equal(await database.db.notification.count(), 2);
  assert.ok((await store.list(ALICE, { view: 'all', unreadOnly: false, page: 1, limit: 20 })).items[0].readAt);
});
it('the same event id with a different fingerprint is a contract error', async () => {
  await store.applyEvent(processed({ eventId: id1, fingerprint: 'a' }), [draft(ALICE, 'ORDER_ACCEPTED')]);
  await assert.rejects(() => store.applyEvent(processed({ eventId: id1, fingerprint: 'b' }), []), ContractMismatch);
});
it('a suppressed event is recorded so replay stays a no-op', ...);  // outcome 'suppressed', then 'duplicate'
it('the projection only moves forward and an older event is flagged stale', async () => {
  await store.applyEvent(processed({ eventId: id1, projection: { orderVersion: 7, status: 'COMPLETED', ... } }), [draft(BOB, 'ORDER_COMPLETED')]);
  const late = await store.applyEvent(processed({ eventId: id2, projection: { orderVersion: 6, status: 'DELIVERED', ... } }), [draft(ALICE, 'ORDER_DELIVERED', 'REVIEW_DELIVERY')]);
  assert.equal(late.stale, true); assert.equal(late.created[0].orderStatus, 'COMPLETED');
  assert.equal((await store.list(ALICE, { view: 'action_needed', unreadOnly: false, page: 1, limit: 20 })).total, 0);
});
it('view=action_needed keeps a delivered row while the order is DELIVERED or unknown; view=important lists IMPORTANT only', ...);
it('lists by stored_at (arrival) newest first with paging and a snapshot unreadCount', ...);  // insert createdAt out of order; order follows insertion
it('markRead and markAllRead return the authoritative unread count; a row stored after read-all stays unread', ...);
```

- [ ] **Step 2: Run** `NOTIFICATION_TEST_DATABASE_URL=... npm run test:integration -w @campus-errand/notification-service` → FAIL (no `applyEvent`).
- [ ] **Step 3: Implement** schema, migration, `store.ts` as specified; `npm run db:generate -w @campus-errand/notification-service`.
- [ ] **Step 4: Run** the integration suite → store tests PASS (route tests still fail until Task 5).

---

### Task 4: Event parsing (v1 + v2) and the recipient policy

**Files:**
- Modify: `services/notification-service/src/notifications/events.ts` (parsing, routing keys, classifier only)
- Create: `services/notification-service/src/notifications/policy.ts`
- Test: `test/events.test.ts` (rewrite parse/classify section), create `test/policy.test.ts`; add it to `test:unit` in `package.json` (CI matrix unchanged: same script name).

**Interfaces (Produces):**

```ts
// events.ts
export const notificationRoutingKeys = [...existing 7, 'order.rejected', 'order.unassigned'] as const;
export interface OrderEventV1 { schemaVersion: 1; eventId; eventType; timestamp; orderId; orderCode?; requesterId; courierId?; courierUsername? }
export interface OrderEventV2 extends Omit<OrderEventV1, 'schemaVersion' | 'orderCode'> {
  schemaVersion: 2; producer: 'order-service'; orderCode: string; orderVersion: number; previousStatus: OrderStatus; status: OrderStatus;
  actorRole: OrderActorRole; actorId?: string; reasonCode?: OrderReasonCode; correlationId: string; priorCourierId?: string;
}
export type OrderEvent = OrderEventV1 | OrderEventV2;
export function parseOrderEvent(content: Buffer, routingKey: string): OrderEvent;   // v2 when input.schemaVersion === 2; any other schemaVersion value → InvalidNotificationEvent
export function fingerprint(event: OrderEvent): string;   // sha256 hex of JSON with keys sorted recursively
export function classifyNotificationFailure(error: unknown): Failure;  // InvalidNotificationEvent | ContractMismatch → permanent; isInfrastructureFailure → infrastructure; else transient
// policy.ts
export const POLICY_VERSION = 1;
export function toNotifications(event: OrderEvent): NotificationDraft[];
```

Validation rules for v2 (each failure → `InvalidNotificationEvent`): `producer === 'order-service'`; `orderVersion` positive integer; `previousStatus`/`status` in `OrderStatus`; `actorRole` in `STUDENT|ADMIN|SYSTEM`; `actorId` UUID, required unless SYSTEM; `reasonCode` in allowlist when present; `correlationId` UUID; `courierId` UUID required for accepted/in_transit/delivered/completed, optional for cancelled/expired; `priorCourierId` UUID required for unassigned; `reasonCode` required for rejected, unassigned, cancelled, expired, completed. v1 rules are the existing ones; v1 `order.rejected`/`order.unassigned` → invalid (they never existed in v1).

Policy matrix (`toNotifications`): the errand label is `` `${orderCode}` `` (v2 always has it; v1 falls back to `'Your errand'` as today). Recipient set is deduplicated and `actorId` is removed from it.

| event | recipients | kind / category / priority / actionType | title / body |
| --- | --- | --- | --- |
| v1 accepted, in_transit, delivered | requester | as today (PROGRESS/NORMAL/VIEW_ERRAND; delivered ACTION/HIGH/REVIEW_DELIVERY) | existing copy, unchanged |
| v1 anything else | — | suppressed | — |
| v2 created | requester | ORDER_PUBLISHED / PROGRESS / NORMAL / VIEW_ERRAND | `Errand ORD-x is posted` / `Couriers can now see it. You will hear here when one accepts it.` |
| v2 accepted / in_transit / delivered | requester | as v1 (accepted body names `courierUsername` when present) | existing copy |
| v2 completed, actorRole STUDENT | courier | ORDER_COMPLETED / IMPORTANT / NORMAL / VIEW_ERRAND | `Delivery confirmed for ORD-x` / `The requester confirmed your delivery. Your payment appears in your wallet once it is settled.` |
| v2 completed, actorRole ADMIN | requester + courier | ORDER_COMPLETED / IMPORTANT / HIGH / VIEW_ERRAND | `ORD-x was completed by an administrator` / `An administrator confirmed this delivery. Open the errand to see its final state.` |
| v2 cancelled, reason REQUESTER_CANCELLED, courierId present | courier | ORDER_CANCELLED / IMPORTANT / HIGH / VIEW_ERRAND | `Errand cancelled` / `The requester cancelled ORD-x before pickup.` |
| v2 cancelled, REQUESTER_CANCELLED, no courier | — | suppressed | — |
| v2 cancelled, ADMIN_CANCELLED | requester + courier (if any) | ORDER_CANCELLED / IMPORTANT / HIGH / VIEW_ERRAND | `Errand cancelled` / `An administrator cancelled ORD-x. Open the errand for its current status.` |
| v2 expired, OPEN_EXPIRED | requester | ORDER_EXPIRED / IMPORTANT / NORMAL / VIEW_ERRAND | `Errand ORD-x expired` / `No courier accepted it before the deadline. You can post a new request.` |
| v2 expired, PUBLICATION_EXPIRED | requester | ORDER_EXPIRED / IMPORTANT / NORMAL / VIEW_ERRAND | `Errand ORD-x could not be posted in time` / `The deadline passed before publication completed. Any reserved credits are returned separately.` |
| v2 unassigned, COURIER_DROPPED | requester | ORDER_UNASSIGNED / IMPORTANT / HIGH / VIEW_ERRAND | `Your courier dropped ORD-x` / `It is open again for another courier.` |
| v2 unassigned, ADMIN_UNASSIGNED | requester; priorCourierId | requester: same kind, `Courier removed from ORD-x` / `An administrator removed the courier. It is open again.`; prior courier: `You were removed from ORD-x` / `An administrator removed you from this errand.` |
| v2 rejected, INSUFFICIENT_CREDITS | requester | ORDER_REJECTED / IMPORTANT / HIGH / REVIEW_WALLET | `Errand ORD-x could not be posted` / `There were not enough available credits. Review your wallet or lower the reward and try again.` |
| v2 rejected, RESERVATION_FAILED | requester | ORDER_REJECTED / IMPORTANT / HIGH / VIEW_ERRAND | `Errand ORD-x could not be posted` / `The credit reservation was declined. Open the errand for details.` |

- [ ] **Step 1: Write the failing tests.** `test/events.test.ts`: keep the v1 cases; add `parses a v2 cancellation and keeps actor, reason, versions and assignee`, `rejects v2 without actorId unless SYSTEM`, `rejects an unknown reasonCode`, `rejects v1 order.rejected`, `fingerprint is stable under key order and differs on content`, `ContractMismatch and InvalidNotificationEvent are permanent, P1001 is infrastructure, Error is transient`. `test/policy.test.ts`: one `test` per matrix row asserting `deepEqual(toNotifications(ev), [...])` with the exact copy above, plus `admin who is also the requester gets nothing` and `requester equal to prior courier yields one row`.
- [ ] **Step 2: Run** `npm run test:unit -w @campus-errand/notification-service` → FAIL.
- [ ] **Step 3: Implement** `events.ts` and `policy.ts`.
- [ ] **Step 4: Run** unit suite → PASS.

---

### Task 5: Consumer transaction, hub invalidation, REST views

**Files:**
- Modify: `services/notification-service/src/notifications/events.ts` (`createDeliver`, handler), `src/ws/hub.ts`, `src/notifications/routes.ts`, `src/app.ts`, `src/index.ts`, `src/config.ts`
- Test: `test/events.test.ts` (deliver section), `test/hub.test.ts`, `test/store-routes.integration.test.ts` (routes), `test/messaging.integration.test.ts`

**Interfaces (Produces):**
- `hub.inboxChanged(userId: string): number` sends `{ type: 'INBOX_CHANGED' }` to the user's open sockets.
- `createDeliver(store: Pick<NotificationStore,'applyEvent'>, hub: { push, inboxChanged })` → `(event: OrderEvent) => Promise<void>`: builds `ProcessedEventInput` (`fingerprint(event)`, `projection` for v2 from `orderVersion/status/requesterId/courierId`), calls `toNotifications`, `applyEvent`; after it resolves: for every created row `hub.push(row.userId...)` — the DTO has no userId, so `applyEvent` returns `created: Array<{ userId: string; notification: NotificationDTO }>` (adjust Task 3's type accordingly) — skipped when `stale`; then `hub.inboxChanged(userId)` once per distinct recipient. `duplicate` → nothing.
- Routes: `GET /` reads `view` (`all` default; anything else than the three values → 400 `{ code: 'INVALID_VIEW' }`), `unread`, `page`, `limit`. `PATCH /:id/read` → `{ success, data: NotificationDTO, meta: { unreadCount } }`. `POST /read-all` → `{ success, data: { updated, unreadCount } }`. `createNotificationRouter(store, authenticate, onInboxChanged?: (userId) => void)`; `createApp` gains `onInboxChanged?`; `index.ts` passes `hub.inboxChanged`.
- `config.ts`: `retryLimit` default 5; comment explains infrastructure failures now retry without limit via the shared classifier.

- [ ] **Step 1: Write the failing tests.** `events.test.ts`: `deliver pushes one frame per created recipient after the store call, then one INBOX_CHANGED per recipient` (two drafts → steps `['apply','push bob','push alice','inbox alice','inbox bob']` order-insensitive on the pair), `a stale event is stored but not pushed`, `a duplicate is neither pushed nor invalidated`. `hub.test.ts`: `inboxChanged reaches every socket of the user and nobody else`. Integration routes: update the key-set assertion to the new DTO keys; `GET ?view=action_needed` and `?view=important` filter; `?view=bogus` → 400; `PATCH /:id/read` returns `meta.unreadCount`; `read-all` returns `unreadCount`; the `onInboxChanged` callback fires with the caller's id on both. Messaging: replace `acknowledges events that map to no notification` with a v1 `order.completed` (suppressed, no row) and add `a v2 admin cancellation reaches requester and courier, once, and a redelivery adds nothing` (two sockets, two rows, replay → still two).
- [ ] **Step 2: Run** unit + integration + messaging → FAIL.
- [ ] **Step 3: Implement** as specified.
- [ ] **Step 4: Run** `npm run test:unit`, `test:integration`, `test:messaging` for the workspace and `npm run typecheck -w @campus-errand/notification-service` → PASS.

---

### Task 6: Student app — inbox helpers and REST-first hook

**Files:**
- Create: `apps/student-app/src/notifications/inbox.ts`, `apps/student-app/test/inbox.test.ts`
- Modify: `apps/student-app/src/notifications/useNotifications.ts`, `apps/student-app/package.json` (`test:unit` → `test/inbox.test.ts`)
- Delete: `apps/student-app/src/notifications/errands.ts`, `apps/student-app/test/errands.test.ts` (superseded; their fix is now server-side + `isActionOpen`)

**Interfaces (Produces):**

```ts
// inbox.ts
export type InboxView = 'action_needed' | 'important' | 'all' | 'unread';
export const VIEWS: { key: InboxView; label: string }[];  // 'Action needed', 'Important', 'All', 'Unread'
export function isActionOpen(n: NotificationDTO, liveStatus?: OrderStatus): boolean;   // REVIEW_DELIVERY && (liveStatus ?? n.orderStatus ?? 'DELIVERED') === 'DELIVERED'
export function inView(n: NotificationDTO, view: InboxView, liveStatus?: OrderStatus): boolean; // action_needed → isActionOpen; important → category IMPORTANT; unread → !readAt; all → true
export function mergeNotifications(current: NotificationDTO[], incoming: NotificationDTO[]): NotificationDTO[]; // by id, incoming wins, sorted storedAt desc then id desc
export function shouldToast(n: NotificationDTO, activeTab: string): boolean;  // see Global Constraints
export function kindLabel(kind: string): string;   // known kinds → 'Accepted' | 'Picked up' | 'Delivered' | 'Posted' | 'Not posted' | 'Expired' | 'Completed' | 'Cancelled' | 'Courier changed'; unknown → 'Update'
// useNotifications returns additionally: loadMore(): Promise<void>; hasMore: boolean; stale: boolean (last refresh failed but items are shown)
```

Hook behaviour: `refresh()` runs as soon as `enabled` (not after AUTH_OK), fetches `/api/notifications?limit=50&page=1`, replaces page 1 by merge and sets `unreadCount` from the server; `loadMore()` fetches the next page and merges; `NOTIFICATION` frame → merge the row (no count increment) then `refresh()` of counts via a `/api/notifications?limit=1` call (cheap authoritative `unreadCount`) — implement as one `refreshCounts()`; `INBOX_CHANGED` → `refresh()`; listeners: `window` `focus`, `online`, `document` `visibilitychange` (visible) → `refresh()`; interval 30 s while `document.visibilityState === 'visible'`, doubling up to 5 min after a failure; refresh is serialized (if one is in flight, set `pending = true` and run again when it finishes); on failure keep items and set `stale = true`; `markRead`/`markAllRead` take `unreadCount` from the response meta/data.

- [ ] **Step 1: Write the failing tests** `test/inbox.test.ts` for `isActionOpen` (DELIVERED/unknown → true; live COMPLETED beats projection DELIVERED → false), `inView` per view, `mergeNotifications` (duplicate id keeps one, newest storedAt first), `shouldToast` (PUBLISHED never; tasks/alerts tab never; otherwise true), `kindLabel('WHATEVER') === 'Update'`.
- [ ] **Step 2: Run** `npm run test:unit -w @campus-errand/student-app` → FAIL (module missing).
- [ ] **Step 3: Implement** `inbox.ts`, rewrite `useNotifications.ts`.
- [ ] **Step 4: Run** unit suite → PASS; `npm run ci:validate-tests` → PASS (same script name, file list changed).

---

### Task 7: Student app — inbox panel, deep link, truthful copy

**Files:**
- Modify: `apps/student-app/src/notifications/NotificationBell.tsx`, `src/pages/AlertsPage.tsx`, `src/pages/TasksPage.tsx`, `src/api/orders.ts`, `src/App.tsx`

**Interfaces:**
- `api/orders.ts`: `export async function fetchOrderById(authFetch, orderId): Promise<{ status: 'ok'; order: OrderDTO } | { status: 'forbidden' | 'not_found' | 'error'; message: string }>` (GET `/api/orders/:id`; 403 → forbidden, 404 → not_found).
- `NotificationPanel` props: `{ items, unreadCount, isLoading, stale, error, hasMore, liveStatus: (orderId: string) => OrderStatus | undefined, onMarkRead, onMarkAllRead, onRefresh, onLoadMore, onOpen: (n: NotificationDTO) => void }` — `awaitingConfirmation` is removed. Layout: tablist of the four `VIEWS` (`role="tab"`, names `Action needed · n`, `Important · n`, `All · n`, `Unread · n`); rows keep `data-testid="notification-row"` and `data-unread`; a row is a `<button>` whose click marks read and selects; detail pane heading is the order code (`<h3>`); CTA label by `actionType`: `REVIEW_DELIVERY` and open → `Review delivery`; `REVIEW_DELIVERY` resolved → `View errand` with a line `Current status: <liveStatus ?? orderStatus>`; `VIEW_ERRAND` → `View errand`; `REVIEW_WALLET` → `Review wallet`; unknown kind renders title/body with `kindLabel` and no icon crash (`ICON[kind] ?? Bell`). Empty states: unread view → `You're all caught up`; others → `No alerts yet`. `stale` shows `Showing saved alerts; last refresh failed.`; `hasMore` shows a `Load more` button.
- `AlertsPage` forwards the new props; subtitle: `Changes to your errands, newest first. Open one to go to the errand.`
- `App.tsx`: `focusOrderId: string | null` state and `focusOrder` (result of `fetchOrderById`) state; `onOpen(n)` → `markRead` if unread, `REVIEW_WALLET` → `setActiveTab('wallet')`, else `setFocusOrderId(n.orderId)` + `setActiveTab('tasks')` + `history.replaceState(null, '', '/?tab=tasks&orderId=<id>')`; on mount read `tab`/`orderId` from `location.search` and apply once authenticated. `liveStatus = (id) => orders.find(o => o.id === id)?.status`. Toast: `if (shouldToast(n, activeTab)) setNotification(n.title)`; HIGH priority toast uses the amber style (`bg-amber-600`), others the existing emerald. Copy: `'Delivery confirmed! Credits transferred to courier.'` → `'Delivery confirmed. The courier is paid once Credit Service settles it.'`; `'Errand cancelled. Escrow credits refunded.'` → `'Errand cancelled. Reserved credits are returned once Credit Service processes it.'`; `'Errand ... posted. Credits reserved.'` stays (reservation did commit).
- `TasksPage`: new props `focusOrderId: string | null`, `focusOrder: FetchOrderResult | null`, `onClearFocus`. Renders a focus panel above the groups when `focusOrderId` is set: order code + status badge from `focusOrder.order` (or `This errand is no longer available to you.` for forbidden/not_found) and a `Dismiss` button; the matching card gets `ring-2 ring-nus-orange` and `scrollIntoView` on mount. Copy: `Completed · +N credits earned` → `Completed · Payment of N credits is settled by Credit Service`; `Completed · Credits released to courier` → `Completed · Delivery confirmed`; `Cancelled · Escrow credits refunded` → `Cancelled · Reserved credits are returned by Credit Service`; `Expired · Escrow credits refunded` → `Expired · Reserved credits are returned by Credit Service`.

- [ ] **Step 1: Implement** the files above (UI has no unit harness; the checks are typecheck, build and the browser UAT in Task 8).
- [ ] **Step 2: Run** `npm run typecheck -w @campus-errand/student-app` and `npm run build -w @campus-errand/student-app` → PASS. Grep the app for `awaitingConfirmation`, `errands'` → no hits.

---

### Task 8: Acceptance drivers, Postman, docs, bookkeeping

**Files:**
- Modify: `scripts/uat/uat-notifications.mjs`, `tests/postman/notification_collection.json`, `README.md` line 336, `ai/usage-log.md`, disclosure headers in every file touched by Tasks 1–7.

- [ ] **Step 1: `uat-notifications.mjs`** publishes v2 payloads (helper `v2(eventType, at, extra)` adds `schemaVersion: 2, producer: 'order-service', orderVersion: n++, previousStatus/status, actorRole, actorId, reasonCode, correlationId: orderId`). Checks: N3 filters frames to the three F5 kinds; N6 → `order.created produces a quiet ORDER_PUBLISHED receipt for the requester; order.completed (REQUESTER_CONFIRMED) notifies only the courier` (alice has 4 frames, bob 1 `ORDER_COMPLETED`); N7 → unauthenticated socket receives nothing; N9 kinds `ORDER_DELIVERED,ORDER_PICKED_UP,ORDER_ACCEPTED,ORDER_PUBLISHED`, unread +4; new N17 `an admin cancellation (v2) reaches requester and courier once each, and its redelivery adds nothing` on a second order; new N18 `GET ?view=action_needed lists the delivered errand and drops it after order.completed`; new N19 `PATCH read returns meta.unreadCount`. Keep N8 (redelivery), N10–N16 as they are except counts.
- [ ] **Step 2: Postman** `notification_collection.json`: adjust the real-flow expectations: after OPEN the requester has one `ORDER_PUBLISHED` row (unread 1), accepted → total 2, pickup → 3, delivered → 4, `Still exactly four alerts after completion` for the requester and one `ORDER_COMPLETED` for the courier (new request `Courier sees the completion notice`); the `['ORDER_ACCEPTED','ORDER_PICKED_UP','ORDER_DELIVERED']` includes stay valid for their rows; pagination numbers +1. Run `npx newman@6.2.1 run tests/postman/notification_collection.json --env-var baseUrl=http://localhost:8080` against the rebuilt stack → 0 failures.
- [ ] **Step 3: Browser UAT** `scripts/uat/uat-d2-ui.mjs` UD2–UD5 need no change if Task 7 kept `notification-badge`, `notification-row`, `data-unread`, tab names `/^Unread/` `/^All/`, heading = order code and `You're all caught up`. Run it against the stack; fix selectors only if a step fails.
- [ ] **Step 4: README** line 336: `Debezium CDC & polling outbox relays` → `Debezium CDC outbox connectors`.
- [ ] **Step 5: Bookkeeping**: disclosure block entry (date 2026-10-22, scope per file) in every touched source/test/SQL file; `// AI-generated (edited by Reallyeasy1)` above new blocks; one `ai/usage-log.md` entry (branch `feature/notification-inbox`, usage scenario: implementation code and tests for the author's redesign document; design decisions quoted from it, none made here; increment 6 and wiki refresh left to the author). `npm run ci:validate-tests` → PASS.
- [ ] **Step 6: Whole-branch verification**: `npm run typecheck`; `npm run lint`; `npm run test:unit`; notification-service `test:integration` + `test:messaging` against local PostgreSQL/RabbitMQ; `docker compose up --build -d` then `node scripts/uat/uat-notifications.mjs`, `node scripts/uat/uat-d2-ui.mjs`, newman. Record pass counts in the usage-log entry.

---

## Out of scope (recorded for the author)

- Increment 6 (`credit.escrow.settled` / `credit.escrow.refunded`, Credit outbox, receipts), chat, reminders, matching alerts, browser push, email, multi-instance fan-out, DLQ monitoring/alerting and the audited replay procedure (spec §4, §10, §11 row 6).
- Wiki pages (Notification-Service, Data-Model, Architecture) describe the pre-redesign service; refresh is a separate task in the wiki clone.
- The spec suggests `/tasks?orderId=`; the gateway serves the SPA at `/` only, so the deep link is `/?tab=tasks&orderId=<id>` to avoid an nginx change.
