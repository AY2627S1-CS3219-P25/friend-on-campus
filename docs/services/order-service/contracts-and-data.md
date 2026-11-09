<!--
AI Assistance Disclosure:
Tool: Codex (model: GPT-6), date: 2026-10-25
Scope: Source-linked implementation documentation and evidence review requested by Reallyeasy1.
Author review: <to be completed by Reallyeasy1>

Tool: Codex (model: GPT-6), date: 2026-11-09
Scope: Reconciled this guide with current service code, schemas, configuration and tests; consolidated duplicated reference material.
Author review: <to be completed by Reallyeasy1>
-->

# Order contracts and data

Source baseline: [`b989758`](https://github.com/AY2627S1-CS3219-P25/friend-on-campus/commit/b989758e766cb593c3b8c94102eb6dfb5c7d8491), inspected 2026-11-09 (SGT). This describes repository behavior, not a verified deployment.

## HTTP interface

All routes below use `/api/orders` and require authentication. Successful responses use `{ success: true, data: ... }`; collection results also include `total`. Known domain failures return `{ success: false, error }`.

| Method and suffix | Caller and behavior |
|---|---|
| `GET /` | List/filter by status, campus zone, search, requester or courier; requester/courier filters must match the caller unless admin; positive page and limit, maximum limit `100` |
| `GET /user/activity` | Current caller's requested, delivering and historical orders |
| `GET /:id` | Find by UUID or order code; `PENDING` / `REJECTED` restricted to requester/admin; other states readable by authenticated users |
| `POST /assistant/draft` | Extract a draft from a nonblank `prompt`; creates no order or reservation |
| `POST /` | Validate and commit `PENDING`; return `202` and `Location` while reservation is pending |
| `POST /:id/accept` | Nonrequester accepts an `OPEN` order |
| `POST /:id/pickup` | Assigned courier: `ACCEPTED` → `IN_TRANSIT` |
| `POST /:id/deliver` | Assigned courier: `IN_TRANSIT` → `DELIVERED` |
| `POST /:id/complete` | Requester: undisputed `DELIVERED` → `COMPLETED`; settlement follows asynchronously |
| `POST /:id/cancel` | Requester: `OPEN` / `ACCEPTED` → `CANCELLED`; refund follows asynchronously |
| `POST /:id/unassign` | Assigned courier: `ACCEPTED` → `OPEN` |
| `POST /:id/dispute` | Requester records delivery dispute details while `DELIVERED` |
| `POST /:id/courier-dispute` | Assigned courier records delivery dispute details while `DELIVERED` |
| `POST /:id/admin/cancel` | Admin cancels `OPEN`, `ACCEPTED`, `IN_TRANSIT` or `DELIVERED` |
| `POST /:id/admin/complete` | Admin completes `DELIVERED`, including disputed delivery |
| `POST /:id/admin/unassign` | Admin reopens `ACCEPTED` |

The API does not make every order participant-private: an authenticated detail lookup can read other users' published orders. A dependent service must check participant IDs itself when its feature requires that restriction.

### Input boundaries

Creation requires a supplier UUID, trimmed nonblank item description (maximum `1000` characters), dropoff location (maximum `255`) and integer reward from `1` to `2147483647`. Duration defaults to `30` minutes and accepts integer `30–1440`. Optional notes allow `1000` characters; contact notes allow `255`.

`dropoffLatitude`, `dropoffLongitude` and `estimatedRewardCredits` must be supplied together or all omitted. Coordinates must be finite and within geographic ranges; the estimate must be a positive PostgreSQL integer. The server validates these ranges, not a distance-derived relationship between the estimate and chosen reward.

Dispute `details` must contain `1–2000` trimmed characters. Each party can submit once; either party can initiate the dispute. Admin actions require a trimmed reason of `1–500` characters and accept an optional `expectedVersion` for conflict detection.

Validation errors are `400`, ownership/role failures `403`, missing orders `404`, and state/version conflicts `409`. Supplier timeout/unavailability during posting is `503`; a missing or inactive supplier is `400`. See the [routes](../../../services/order-service/src/orders/order.routes.ts) and [validators](../../../services/order-service/src/orders/order.service.ts) for exact payloads.

## State and event matrix

State and the corresponding outbox record commit in the same Order transaction.

| Trigger | Resulting status | Emitted event |
|---|---|---|
| Valid submission | `PENDING` | `order.reservation.requested` |
| Successful reservation before expiry | `OPEN` | `order.created` |
| Failed reservation | `REJECTED` | `order.rejected` |
| Successful reservation after expiry | `EXPIRED` | `order.expired` |
| Courier accepts | `ACCEPTED` | `order.accepted` |
| Courier picks up | `IN_TRANSIT` | `order.in_transit` |
| Courier delivers | `DELIVERED` | `order.delivered` |
| Requester/admin completes | `COMPLETED` | `order.completed` |
| Requester/admin cancels | `CANCELLED` | `order.cancelled` |
| Courier/admin unassigns | `OPEN` | `order.unassigned` |
| Sweeper expires an overdue open order | `EXPIRED` | `order.expired` |
| Either party submits dispute details | Remains `DELIVERED` | None |

Lifecycle events carry schema version `2`, producer, correlation ID, actor metadata and optional reason codes, plus the committed `orderVersion`, `previousStatus` and `status`. Unassignment includes the previous courier identity. Consumers must use the actual event contract rather than assume every state change publishes an event.

Disputes are a `dispute` boolean and per-party detail fields. They increment the version and block requester completion, but do not produce a `DISPUTED` state or `order.disputed` event. Admin completion/cancellation clears the flag. The shared `DISPUTED` enum is not a state produced by these routes.

## Persistence

| Model | Ownership and constraints |
|---|---|
| `Order` | UUID and unique public order code; requester/courier/supplier IDs; supplier name/zone snapshots; description, location, reward and optional estimate; state, dispute details, expiry, timestamps and version |
| `OutboxEvent` | Event identity, aggregate, type and serialized payload committed alongside applicable Order writes; consumed through CDC |

User and supplier IDs are scalar references across service databases, not foreign keys into those databases. Outbox status/retry fields are not proof of downstream delivery. The [Prisma schema](../../../services/order-service/prisma/schema.prisma) and [migrations](../../../services/order-service/prisma/migrations) are the canonical field/constraint reference.

## Source evidence and related reading

- [Repository transitions and event insertion](../../../services/order-service/src/repositories/order.repository.ts)
- [Event creation and validation](../../../services/order-service/src/orders/order.service.ts) · [Shared DTOs](../../packages/common-dtos.md)
- [Runtime and testing](runtime-and-testing.md) · [Order overview](README.md) · [Documentation index](../../README.md)
