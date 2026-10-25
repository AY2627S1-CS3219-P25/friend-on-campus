<!--
AI Assistance Disclosure:
Tool: Codex (model: GPT-6), date: 2026-10-25
Scope: Source-linked implementation documentation and evidence review requested by Reallyeasy1.
Author review: <to be completed by Reallyeasy1>
-->

# Order contracts and data

Implementation baseline: [`52d791e`](https://github.com/AY2627S1-CS3219-P25/friend-on-campus/commit/52d791e4eea28ce7d817f025ef096f8d96bda467); inspected 2026-10-25 (SGT). Pending work is explicitly labelled.

Normally all /api/orders routes require a valid access token. If no public key is set and ORDER_DEV_AUTH is explicitly 1 or true, startup instead uses x-user-id/x-user-role headers. Without a key or that explicit flag startup fails; this is a development exception, not a recommended deployment setting. Common domain errors are 400 validation/self-accept, 403 ownership/role, 404 missing, 409 state/concurrency conflict, and 503 supplier unavailability. Known errors use `success:false,error`; unexpected failures return generic 500.

| Method/path under /api/orders | Rule/input | Successful result |
|---|---|---|
| GET / | status,campusZone,search,requesterId,courierId,page,limit | 200 data:OrderDTO[], total |
| GET /user/activity | Token user | 200 data activity groups |
| GET /:id | ID or order code; PENDING/REJECTED requester/admin only | 200 data:OrderDTO |
| POST / | Create fields below; requester from token | 202 data:PENDING OrderDTO; Location /api/orders/:id |
| POST /:id/accept | Nonrequester courier; optional courierContactNote | 200 ACCEPTED |
| POST /:id/pickup | Assigned courier | 200 IN_TRANSIT |
| POST /:id/deliver | Assigned courier | 200 DELIVERED |
| POST /:id/complete | Requester | 200 COMPLETED |
| POST /:id/cancel | Requester before pickup | 200 CANCELLED |
| POST /:id/unassign | Assigned courier, ACCEPTED | 200 OPEN |
| POST /:id/admin/cancel | ADMIN, reason input | 200 CANCELLED |
| POST /:id/admin/complete | ADMIN, reason input | 200 COMPLETED |
| POST /:id/admin/unassign | ADMIN, reason input | 200 OPEN |

Nonadmins may filter requesterId/courierId only by their own ID. PENDING/REJECTED visibility is constrained in list/detail; do not describe all order details as private to participants. Detail serves other lifecycle states to authenticated users.

Create requires UUID supplierId, trimmed nonblank itemDescription (≤1000), dropoffLocation (≤255), integer rewardCredits 1–2147483647. Optional specialNotes ≤1000, requesterContactNote ≤255; durationMinutes defaults 30, integer 30–1440. Supplier must exist and be active. The source DTO defines the full returned order shape including snapshots, timestamps, rejectionReason and version.

## State and event matrix

| Trigger | Transition | Event written |
|---|---|---|
| Submit | New → PENDING | order.reservation.requested |
| Matching reserve success, not expired | PENDING → OPEN | order.created |
| Reserve business failure | PENDING → REJECTED | None at this baseline |
| Reserve success after expiry | PENDING → EXPIRED | order.expired |
| Accept | OPEN → ACCEPTED | order.accepted |
| Pickup | ACCEPTED → IN_TRANSIT | order.in_transit |
| Deliver | IN_TRANSIT → DELIVERED | order.delivered |
| Requester confirm | DELIVERED → COMPLETED | order.completed |
| Requester cancel | OPEN/ACCEPTED → CANCELLED | order.cancelled |
| Courier/admin unassign | ACCEPTED → OPEN | None at this baseline |
| Expiry sweeper | Expired OPEN → EXPIRED | order.expired |

All three admin actions require trimmed nonempty `reason` ≤500 characters, appended to `specialNotes`. Optional `expectedVersion` must match the current version or return 409. Admin complete allows DELIVERED only; admin unassign allows ACCEPTED only and emits no event on main. Admin cancel rejects PENDING and COMPLETED/CANCELLED/EXPIRED/REJECTED, so it permits more states than requester cancellation. They are not unrestricted state setters. DISPUTED is declared in shared DTOs but no producing transition is implemented. Outbox rows preserve event JSON text and CDC metadata; their status/retry fields are not maintained by an application relay.

Orders use UUID identity, unique orderCode, version, scalar requester/courier/supplier IDs, copied supplierName/campusZone, reward and lifecycle fields. Status/expiry and requester/courier indexes support queries. Migration SQL adds checks and current saga columns. Service-owned transactions cannot atomically mutate Credit's database.


## Schema field inventory

This inventory is extracted from the baseline Prisma schema. SQL-only checks and expression indexes are discussed above; a Prisma annotation is not an exhaustive database constraint inventory.

### Order

| Field | Prisma declaration |
|---|---|
| `id` | `String    @id @default(uuid()) @db.Uuid` |
| `orderCode` | `String    @unique @map("order_code") @db.VarChar(20)` |
| `requesterId` | `String    @map("requester_id") @db.Uuid` |
| `courierId` | `String?   @map("courier_id") @db.Uuid` |
| `supplierId` | `String    @map("supplier_id") @db.Uuid` |
| `supplierName` | `String?   @map("supplier_name") @db.VarChar(128)` |
| `campusZone` | `String?   @map("campus_zone") @db.VarChar(64)` |
| `itemDescription` | `String    @map("item_description") @db.Text` |
| `specialNotes` | `String?   @map("special_notes") @db.Text` |
| `dropoffLocation` | `String    @map("dropoff_location") @db.VarChar(255)` |
| `requesterContactNote` | `String?   @map("requester_contact_note") @db.VarChar(255)` |
| `courierContactNote` | `String?   @map("courier_contact_note") @db.VarChar(255)` |
| `rewardCredits` | `Int       @map("reward_credits")` |
| `status` | `String    @default("PENDING") @db.VarChar(30)` |
| `rejectionReason` | `String?   @map("rejection_reason") @db.Text` |
| `expiresAt` | `DateTime  @map("expires_at") @db.Timestamptz(6)` |
| `acceptedAt` | `DateTime? @map("accepted_at") @db.Timestamptz(6)` |
| `pickedUpAt` | `DateTime? @map("picked_up_at") @db.Timestamptz(6)` |
| `deliveredAt` | `DateTime? @map("delivered_at") @db.Timestamptz(6)` |
| `completedAt` | `DateTime? @map("completed_at") @db.Timestamptz(6)` |
| `createdAt` | `DateTime  @default(now()) @map("created_at") @db.Timestamptz(6)` |
| `updatedAt` | `DateTime  @default(now()) @updatedAt @map("updated_at") @db.Timestamptz(6)` |
| `version` | `Int       @default(1)` |
| Model constraint | `@@index([status, expiresAt], map: "orders_status_expires_at_idx")` |
| Model constraint | `@@index([requesterId], map: "orders_requester_id_idx")` |
| Model constraint | `@@index([courierId], map: "orders_courier_id_idx")` |
| Model constraint | `@@map("orders")` |

### OutboxEvent

| Field | Prisma declaration |
|---|---|
| `id` | `String   @id @default(uuid()) @db.Uuid` |
| `aggregateType` | `String   @default("order") @map("aggregate_type") @db.VarChar(64)` |
| `aggregateId` | `String   @default("") @map("aggregate_id") @db.VarChar(64)` |
| `eventType` | `String   @map("event_type") @db.VarChar(64)` |
| `payload` | `String   @db.Text` |
| `status` | `String   @default("PENDING") @db.VarChar(20)` |
| `retryCount` | `Int      @default(0) @map("retry_count")` |
| `createdAt` | `DateTime @default(now()) @map("created_at") @db.Timestamptz(6)` |
| `updatedAt` | `DateTime @default(now()) @updatedAt @map("updated_at") @db.Timestamptz(6)` |
| Model constraint | `@@index([status, createdAt], map: "outbox_events_status_created_at_idx")` |
| Model constraint | `@@map("outbox_events")` |

## Source evidence and related reading

- [`services/order-service/src/orders/order.routes.ts`](../../../services/order-service/src/orders/order.routes.ts)
- [`services/order-service/src/orders/order.service.ts`](../../../services/order-service/src/orders/order.service.ts)
- [`services/order-service/src/orders/order.types.ts`](../../../services/order-service/src/orders/order.types.ts)
- [`services/order-service/src/repositories/order.repository.ts`](../../../services/order-service/src/repositories/order.repository.ts)
- [`services/order-service/prisma/schema.prisma`](../../../services/order-service/prisma/schema.prisma)
- [`services/order-service/prisma/migrations/20261007120000_init_order_service/migration.sql`](../../../services/order-service/prisma/migrations/20261007120000_init_order_service/migration.sql)
- [`services/order-service/prisma/migrations/20261019120000_order_saga_b2_and_cdc_outbox/migration.sql`](../../../services/order-service/prisma/migrations/20261019120000_order_saga_b2_and_cdc_outbox/migration.sql)
- [Wiki: Order Service](https://github.com/AY2627S1-CS3219-P25/friend-on-campus/wiki/Order-Service)
- [Documentation index](../../README.md) · [Drift register](../../audits/documentation-drift.md) · [Verification record](../../audits/review-findings.md)
