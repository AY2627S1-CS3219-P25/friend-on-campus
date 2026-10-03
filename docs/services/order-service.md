<!--
AI Assistance Disclosure:
Tool: Claude Code (model: Claude Fable 5.1), date: 2026-09-21
Scope: Documented the current Order Service and its dedicated future RabbitMQ publisher identity.
Author review: <to be completed by the service owner>
-->

# order-service

**Status:** in-memory mock from the starter template. Port **8003**. `order_db` exists but nothing connects to it. All data is lost on restart.

## Responsibilities (from the documents)

Create an errand (with credit reservation), show open errands to couriers, accept with exactly one winning courier, pickup / delivery / completion updates, cancellation and expiry, publish lifecycle events. [D1 F3.1–F3.6; Order Service N1–N4; D2 plan work packages F–G, App. D]

## Run

```bash
npm run dev:order        # needs nothing else running
```

## Configuration

`PORT` (default `8003`). `DATABASE_URL`, `RABBITMQ_URL` and `CREDIT_SERVICE_URL` are read into constants and set in compose, but no code uses them. `pg` and `amqplib` are dependencies that are never imported for use. Compose assigns the unused `order_service` RabbitMQ identity permission to publish only documented `order.*` routing keys, ready for the separately scoped publisher implementation.

## Files

`src/index.ts` only: a `mockOrders: OrderDTO[]` array seeded with sample errands, and every route. No `src/database/`, no Prisma schema, no middleware.

## API

| Method & path | Identity used | Request | Success | Errors |
|---|---|---|---|---|
| `GET /api/orders?status=&campusZone=` | none | — | 200 `OrderDTO[]`; without `status` only `OPEN` orders | — |
| `GET /api/orders/:id` | none | — | 200 `OrderDTO` | 404 |
| `GET /api/orders/user/activity?userId=` | `userId` query, else a hardcoded user | — | 200 `{ requested, delivering, history }` | — |
| `POST /api/orders` | `x-user-id` header, else a hardcoded user | `CreateOrderRequest`: `supplierId, itemDescription, dropoffLocation, rewardCredits` required; `specialNotes?, requesterContactNote?` | 201 `OrderDTO` (`OPEN`, expires in 30 min) | 400 missing fields |
| `POST /api/orders/:id/accept` | `x-user-id` header, else a second hardcoded user | — | 200 `OrderDTO` (`ACCEPTED`) | 404; 409 not `OPEN`; 400 own errand |
| `POST /api/orders/:id/pickup` | none | — | 200 (`IN_TRANSIT`) | 404 |
| `POST /api/orders/:id/complete` | none | — | 200 (`COMPLETED`) | 404 |
| `POST /api/orders/:id/cancel` | none | — | 200 (`CANCELLED`) | 404 |

## Data

In memory: `OrderDTO` (`id, orderCode, requesterId, courierId, supplierId, supplierName, campusZone, itemDescription, specialNotes, dropoffLocation, requesterContactNote, rewardCredits, status, expiresAt, acceptedAt, pickedUpAt, completedAt, createdAt, version`).

In `docker/postgres-init/01-init-databases.sql` (unused): table `orders` with the same columns in snake_case, `reward_credits INT CHECK (> 0)`, `status` default `'OPEN'`, `version INT DEFAULT 1`. There is no `supplier_name` or `campus_zone` column there, and no Prisma schema mirrors the table.

## Behaviour as built

- No authentication. Identity is whatever the client puts in `x-user-id` (or `?userId=`), with hardcoded fallbacks.
- Create does not check that the supplier exists, does not call credit-service, and hardcodes `supplierName` and `campusZone`; the success message nevertheless says escrow was reserved. `rewardCredits` is only checked for truthiness.
- "Publishing" `order.created` is a `console.log`; no other event is emitted. `common-dtos` has event types for created, accepted, in_transit, completed and expired — none for cancelled.
- Accept checks `status === 'OPEN'` then mutates; it does not look at `expiresAt`. Pickup, complete and cancel change the status from **any** state, for any caller.
- Nothing expires orders; `expiresAt` is stored and never read.
- `version` is incremented on each change but never compared.

## Differences from the documents

Essentially all of F3 beyond the happy path, and Order N1–N4. `../requirements/conflicts.md` row 3 (whether `ACCEPTED → EXPIRED` is allowed, and `DISPUTED`) is open and affects this service's state machine. Issue #38 names a `PICKED_UP` state; `OrderStatus` has `IN_TRANSIT`.

## Tests

None. `scripts/test-d2-e2e.ts` does not touch this service.

## Issues

#9–#14 (F3.1–F3.6), #34–#41 (Order N1–N4), #50, #72, #74, #60, #64.
