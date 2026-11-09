<!--
AI Assistance Disclosure:
Tool: Codex (model: GPT-6), date: 2026-11-09
Scope: Reconcile current implementation, contracts, realtime delivery and verification limits; preserve historical records.
Author review: <to be completed by the author>

Tool: Codex (model: GPT-6), date: 2026-10-25
Scope: Source-linked implementation documentation and evidence review requested by Reallyeasy1.
Author review: <to be completed by Reallyeasy1>
-->

# Notification contracts and data

Implementation checked against [`b989758`](https://github.com/AY2627S1-CS3219-P25/friend-on-campus/commit/b989758e766cb593c3b8c94102eb6dfb5c7d8491), 2026-11-09 (SGT). This describes repository behavior, not verified deployment state.

[Service overview](README.md) · [Execution paths](implementation.md) · [Reliability and tests](reliability-and-testing.md)

## REST and sockets

All `/api/notifications` routes use the authenticated caller's user ID. There is no recipient selector or administrator bypass. [`routes.ts`](../../../services/notification-service/src/notifications/routes.ts) defines envelopes; [`common-dtos`](../../../packages/common-dtos/src/index.ts) defines DTO fields.

| Route | Input | Success result |
|---|---|---|
| `GET /api/notifications` | `view=all\|action_needed\|important`, `unread=true`, `page`, `limit` | `data: {items,total,page,limit,totalPages,unreadCount}` |
| `PATCH /api/notifications/:id/read` | UUID notification ID | `data: NotificationDTO`, `meta: {unreadCount}` |
| `POST /api/notifications/read-all` | No recipient/body needed | `data: {updated,unreadCount}` |

Page defaults to 1 and is lower-bounded at 1. Limit defaults to 20 and clamps to 1–100; parsing uses integer conversion/fallback. Invalid views return 400 `INVALID_VIEW`. Invalid, missing and other-user notification IDs all return 404 `NOTIFICATION_NOT_FOUND`. Shared authentication can return 401. Unread count covers the caller's complete unread inbox, independently of the current filter.

`action_needed` selects delivery-review actions whose projected order state is absent or still `DELIVERED`; it is not simply the unread filter. `important` selects category `IMPORTANT`. Rows order by insertion time (`storedAt DESC, id DESC`), while `createdAt` retains the source event's occurrence time. Offset pagination is not a stable snapshot across requests when new rows arrive.

The [socket hub](../../../services/notification-service/src/ws/hub.ts) accepts `AUTH` as the first frame within 5 seconds, verifies the access token, closes with 4401 on invalid/expired credentials and pings every 30 seconds. Later client messages are ignored; read changes use HTTP.

| Server frame | Meaning |
|---|---|
| `AUTH_OK` with `unreadCount` | Authentication completed; refetch REST to cover the connection window |
| `NOTIFICATION` with `data: NotificationDTO` | A currently eligible unread item; a live hint, not the complete inbox |
| `INBOX_CHANGED` | Refetch the inbox/count; no count arithmetic or mutation should be inferred from the frame |

## Event and recipient policy

[`events.ts`](../../../services/notification-service/src/notifications/events.ts) validates routing key/envelope consistency. [`policy.ts`](../../../services/notification-service/src/notifications/policy.ts) is the canonical mapping and wording, currently policy version 1. Order V1 compatibility retains only the original accepted/picked-up/delivered requester alerts. V2 carries producer, committed version, actor, status and reason data for the expanded policy below.

| Committed fact | Recipients and purpose |
|---|---|
| `order.created` | Requester: publication confirmation |
| `order.accepted`, `order.in_transit` | Requester: accepted/picked-up progress |
| `order.delivered` | Requester: high-priority delivery review action |
| `order.completed` | Courier for requester completion; requester and courier for administrator completion |
| `order.cancelled` | Assigned courier for requester cancellation; requester and any courier for administrator cancellation |
| `order.expired`, `order.rejected` | Requester: expiry/publication failure and the relevant next action |
| `order.unassigned` | Requester; also prior courier for administrator removal |
| `credit.escrow.settled` | Validated courier beneficiary: credits received receipt |
| `credit.escrow.refunded` | Validated requester beneficiary: credits returned receipt |

Order recipients are deduplicated and the acting user is excluded when `actorId` is present. No-draft events are still recorded as processed. Credit receipts come from Credit's committed financial outcome, not an inference from Order completion/cancellation. They use category `RECEIPT` and a wallet action; student toast policy suppresses receipts and publication confirmations. An inbox item is not itself proof that its linked command remains authorized: the destination service checks current state and permissions.

## Stored data

The [Prisma schema](../../../services/notification-service/prisma/schema.prisma) and [migrations](../../../services/notification-service/prisma/migrations) are authoritative.

| Table | Purpose and constraint |
|---|---|
| `notifications` | Recipient content, category/priority/action, source version and read timestamps. Unique `(producer,event_id,user_id,kind)`; inbox index `(user_id,stored_at DESC,id DESC)` and unread index `(user_id,read_at)`. |
| `processed_notification_events` | Primary key `(producer,event_id)`; normalized payload fingerprint, schema/policy version and created/suppressed/legacy outcome. Legacy fingerprints can be null. |
| `order_notification_state` | Primary key `order_id`; highest seen Order version, status and participants. A display projection, never command authorization. |
| `notification_realtime_outbox` | Unique event ID with delivery intent, retry schedule and lease metadata. Index `(available_at,created_at)`. |

`readAt = null` means unread. Mark-one preserves its first read timestamp. Mark-all updates only the caller's unread rows stored by the transaction's time boundary; later arrivals remain unread. The store commits read changes and the corresponding realtime intent together. There is no service API for deleting inbox history.
