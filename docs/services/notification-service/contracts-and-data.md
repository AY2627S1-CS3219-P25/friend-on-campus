<!--
AI Assistance Disclosure:
Tool: Codex (model: GPT-6), date: 2026-10-25
Scope: Source-linked implementation documentation and evidence review requested by Reallyeasy1.
Author review: <to be completed by Reallyeasy1>
-->

# Notification contracts and data

Implementation baseline: [`52d791e`](https://github.com/AY2627S1-CS3219-P25/friend-on-campus/commit/52d791e4eea28ce7d817f025ef096f8d96bda467); inspected 2026-10-25 (SGT). Pending work is explicitly labelled.

## REST

All routes under /api/notifications use shared authentication and derive owner from res.locals.auth.userId. Callers cannot select another recipient.

| Method/path | Input | Response |
|---|---|---|
| GET /api/notifications | unread=true, page, limit | 200 success/data:{items,total,page,limit,totalPages,unreadCount} |
| PATCH /api/notifications/:id/read | UUID path | 200 success/data:NotificationDTO; first read timestamp preserved |
| POST /api/notifications/read-all | No owner/body required | 200 success/data:{updated} |

page defaults 1 and is lower-bounded at 1; limit defaults 20 and clamps to 1–100. Parsing uses parseInt/fallback rather than a strict numeric schema. Invalid/missing/other-user IDs all return 404 NOTIFICATION_NOT_FOUND for mark-read. Protected routes can return shared-auth 401. Malformed JSON returns 400 `{success:false,error:"Invalid JSON request body"}`; other request failures return 500 `{success:false,error:"Notification operation failed"}` without a code. List unreadCount always counts the owner's complete unread set, independent of filtered total.

`NotificationDTO` includes id, kind, orderId, orderCode, courierId, title, body, readAt and createdAt. The shared type permits optional orderCode/courierId/readAt; this store always serializes all three, using null where absent/unread. The three kinds are ORDER_ACCEPTED, ORDER_PICKED_UP and ORDER_DELIVERED. There is no current view=important/action_needed contract or INBOX_CHANGED frame on main.

## WebSocket

| Input/condition | Result |
|---|---|
| First frame within 5 seconds: type AUTH, token | Verify Ed25519 claims; query unread count |
| Valid auth/count | AUTH_OK with unreadCount, then register user socket |
| New stored notification | NOTIFICATION with data:NotificationDTO to that user's open sockets |
| Missing/invalid auth or token expiry | Close 4401 |
| Unread-count query failure | Close 1011 |
| Later client frames | Ignored |
| Missed heartbeat pong | Terminate socket; default interval 30 seconds |

Gateway /ws/ proxies to the service root. Upgrade does not authenticate. The hub does not provide replay cursors, delivery acknowledgments, cross-process fan-out or read-state broadcasts.

## Events and persistence

Subscribed keys are order.created, accepted, in_transit, delivered, completed, cancelled, expired. Only accepted/in_transit/delivered produce requester notifications. Parser validates object/JSON, routing-key type, UUIDs and UTC timestamp, optional orderCode/courierUsername, and courierId where the lifecycle event requires it. Valid ignored events are ACKed.

| Event field | Requirement |
|---|---|
| eventId, orderId, requesterId | Required UUIDs, normalized to lowercase |
| eventType | Required; exactly equals the routing key |
| timestamp | Required UTC timestamp |
| courierId | Required UUID for accepted/in_transit/delivered/completed |
| orderCode | Optional; 1–32 characters |
| courierUsername | Optional; 1–50 characters |

The notifications table has globally unique event_id. `INSERT ... ON CONFLICT(event_id) DO NOTHING RETURNING` returns a row only for a first insert; a duplicate is not pushed again. created_at is event timestamp. Listing sorts created_at descending then id descending. SQL/index behavior and tests, not an event name alone, establish deduplication.


## Schema field inventory

This inventory is extracted from the baseline Prisma schema. The initial migration defines the unique event index and user/created-time index; it does not define additional expression indexes or CHECK constraints.

### Notification

| Field | Prisma declaration |
|---|---|
| `id` | `String    @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid` |
| `userId` | `String    @map("user_id") @db.Uuid` |
| `eventId` | `String    @unique @map("event_id") @db.Uuid` |
| `kind` | `String` |
| `orderId` | `String    @map("order_id") @db.Uuid` |
| `orderCode` | `String?   @map("order_code")` |
| `courierId` | `String?   @map("courier_id") @db.Uuid` |
| `title` | `String` |
| `body` | `String` |
| `readAt` | `DateTime? @map("read_at") @db.Timestamptz(6)` |
| `createdAt` | `DateTime  @map("created_at") @db.Timestamptz(6)` |
| Model constraint | `@@index([userId, createdAt(sort: Desc)])` |
| Model constraint | `@@map("notifications")` |

Related contracts: [event catalogue](../../architecture/communication-and-events.md), [shared DTOs](../../packages/common-dtos.md), and [messaging semantics](../../packages/messaging.md).

## Source evidence and related reading

- [`services/notification-service/src/notifications/routes.ts`](../../../services/notification-service/src/notifications/routes.ts)
- [`services/notification-service/src/notifications/events.ts`](../../../services/notification-service/src/notifications/events.ts)
- [`services/notification-service/src/notifications/store.ts`](../../../services/notification-service/src/notifications/store.ts)
- [`services/notification-service/src/ws/hub.ts`](../../../services/notification-service/src/ws/hub.ts)
- [`services/notification-service/prisma/schema.prisma`](../../../services/notification-service/prisma/schema.prisma)
- [`services/notification-service/prisma/migrations/20261005000000_init/migration.sql`](../../../services/notification-service/prisma/migrations/20261005000000_init/migration.sql)
- [Wiki: Notification Service](https://github.com/AY2627S1-CS3219-P25/friend-on-campus/wiki/Notification-Service)
- [Documentation index](../../README.md) · [Drift register](../../audits/documentation-drift.md) · [Verification record](../../audits/review-findings.md)
