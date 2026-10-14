<!--
AI Assistance Disclosure:
Tool: Google Antigravity Agent, date: 2026-10-11
Scope: Authored unified Errand Lifecycle & Credit Economy domain specification, formalizing the state machine, escrow interactions, atomic concurrency rules, and event choreography.
Author review: <to be completed by author after review>
-->

# Errand Lifecycle & Credit Economy Specification

This document provides the formal business specification for errand management, credit escrow operations, concurrent order claiming, and event choreography in Friend of Campus.

---

## 1. Errand Lifecycle State Machine

An errand progresses through a deterministic series of states from creation to final fulfillment, cancellation, or expiration.

```mermaid
stateDiagram-v2
  [*] --> DRAFT: Student prepares errand
  DRAFT --> OPEN: Post errand (reserves escrow credits)
  
  OPEN --> ACCEPTED: Courier claims errand (atomic single-winner)
  OPEN --> CANCELLED: Requester cancels errand (refunds escrow)
  OPEN --> EXPIRED: Deadline passed without courier (sweeper refunds escrow)

  ACCEPTED --> IN_TRANSIT: Courier picks up item
  ACCEPTED --> CANCELLED: Permitted cancellation before pickup (refunds escrow)

  IN_TRANSIT --> DELIVERED: Courier drops off item at location
  DELIVERED --> COMPLETED: Requester confirms delivery (settles escrow to courier)

  COMPLETED --> [*]
  CANCELLED --> [*]
  EXPIRED --> [*]
```

### State Definitions

| State | Description | Active Actor |
|---|---|---|
| `DRAFT` | Errand parameters (items, location, reward credits, deadline) are being authored. Not visible to couriers. | Requester |
| `OPEN` | Errand is publicly posted and listed on the student feed. Awaiting a courier. | Open to Couriers |
| `ACCEPTED` | An available student courier has claimed the errand. Courier is assigned. | Courier |
| `IN_TRANSIT` | Courier has collected the item(s) from the supplier and is en route. | Courier |
| `DELIVERED` | Courier has reached the drop-off location and marked the errand delivered. | Courier |
| `COMPLETED` | Delivery verified and confirmed by the requester. Terminal success state. | Requester / System |
| `CANCELLED` | Errand aborted before pickup. Terminal cancellation state. | Requester |
| `EXPIRED` | Errand deadline elapsed while remaining unaccepted in `OPEN` state. Terminal failure state. | Sweeper Daemon |

---

## 2. State Transition Matrix & Credit Actions

Every state transition enforces strict authorization, credit financial rules, and outbox event publishing:

| Transition | Allowed Caller | Preconditions & Validation | Credit Service Action | Domain Event Emitted |
|---|---|---|---|---|
| `DRAFT` &rarr; `OPEN` | Requester | Requester available balance $\ge$ reward credits; valid deadline in the future. | Synchronous HTTP call `POST /api/credits/escrow/reserve`. Holds credits in escrow. | `order.created` |
| `OPEN` &rarr; `ACCEPTED` | Any Student (except Requester) | Order status is `OPEN`; caller $\ne$ requester; caller is active student. | None (credits remain held in escrow). | `order.accepted` |
| `ACCEPTED` &rarr; `IN_TRANSIT` | Assigned Courier | Order status is `ACCEPTED`; caller equals assigned `courierId`. | None. | `order.in_transit` |
| `IN_TRANSIT` &rarr; `DELIVERED` | Assigned Courier | Order status is `IN_TRANSIT`; caller equals assigned `courierId`. | None. | `order.delivered` |
| `DELIVERED` &rarr; `COMPLETED` | Requester (or auto-confirm) | Order status is `DELIVERED`; caller equals `requesterId`. | Asynchronous event triggers Credit Service to transfer escrow credits to courier's available balance. | `order.completed` |
| `OPEN` &rarr; `CANCELLED` | Requester | Order status is `OPEN`; caller equals `requesterId`. | Asynchronous event triggers Credit Service to refund escrow credits back to requester. | `order.cancelled` |
| `OPEN` &rarr; `EXPIRED` | Background Sweeper | Order status is `OPEN`; `current_time > deadline`. | Asynchronous event triggers Credit Service to refund escrow credits back to requester. | `order.expired` |

---

## 3. Credit Economy & Escrow Model

Friend of Campus operates a closed credit economy where credits represent platform utility:

1. **Initial Welcome Grant**:
   - When a new student registers (`user-service`), a `user.registered` event is emitted.
   - Credit Service consumes this event and initializes the student's wallet with an initial balance of **100 credits**.
2. **Escrow Hold (Pessimistic Locking)**:
   - When creating an errand with reward $C$, Credit Service verifies: $\text{available\_credits} \ge C$.
   - $\text{available\_credits} \leftarrow \text{available\_credits} - C$
   - $\text{escrow\_credits} \leftarrow \text{escrow\_credits} + C$
   - This guarantees a requester cannot double-spend the same credits across multiple simultaneous errands.
3. **Escrow Settlement**:
   - Upon receiving `order.completed`, Credit Service transfers the held credits:
   - Requester: $\text{escrow\_credits} \leftarrow \text{escrow\_credits} - C$
   - Courier: $\text{available\_credits} \leftarrow \text{available\_credits} + C$, $\text{total\_earned\_credits} \leftarrow \text{total\_earned\_credits} + C$
4. **Escrow Refund**:
   - Upon receiving `order.cancelled` or `order.expired`, Credit Service refunds the requester:
   - Requester: $\text{escrow\_credits} \leftarrow \text{escrow\_credits} - C$, $\text{available\_credits} \leftarrow \text{available\_credits} + C$

```mermaid
sequenceDiagram
  autonumber
  actor Requester
  participant Order as Order Service
  participant Credit as Credit Service
  actor Courier

  Requester->>Order: POST /api/orders (Create Errand, reward: 20)
  Order->>Credit: POST /api/credits/escrow/reserve (amount: 20)
  Note over Credit: Lock 20 credits in escrow<br/>available -= 20, escrow += 20
  Credit-->>Order: 200 OK (Reservation Confirmed)
  Order-->>Requester: 201 Created (Order OPEN)

  Courier->>Order: POST /api/orders/{id}/accept
  Order-->>Courier: 200 OK (Assigned as Courier)

  Courier->>Order: POST /api/orders/{id}/pickup (IN_TRANSIT)
  Courier->>Order: POST /api/orders/{id}/deliver (DELIVERED)

  Requester->>Order: POST /api/orders/{id}/complete
  Order->>Order: Outbox Event: order.completed
  Order-->>Requester: 200 OK (Completed)

  Order-)Credit: RabbitMQ Event: order.completed
  Note over Credit: Transfer 20 credits<br/>Requester escrow -= 20<br/>Courier available += 20
```

---

## 4. Concurrency & Atomic Claiming

A critical challenge in peer-to-peer delivery is handling concurrent claims when multiple students tap "Accept" on an errand at the exact same millisecond.

### Single-Winner Atomic Claim Strategy
To prevent double-assignment without slow global distributed locks, `order-service` executes a single atomic PostgreSQL conditional update:

```sql
UPDATE orders
SET status = 'ACCEPTED',
    courier_id = :courier_id,
    updated_at = NOW()
WHERE id = :order_id
  AND status = 'OPEN'
  AND requester_id <> :courier_id;
```

```mermaid
sequenceDiagram
  autonumber
  actor Courier A
  actor Courier B
  participant OrderSvc as Order Service (PostgreSQL)

  par Simultaneous Claims
    Courier A->>OrderSvc: POST /api/orders/123/accept
    Courier B->>OrderSvc: POST /api/orders/123/accept
  end

  Note over OrderSvc: Atomic row lock on orders WHERE id = 123 AND status = 'OPEN'
  Note over OrderSvc: Courier A executes first: 1 row affected. status -> ACCEPTED
  OrderSvc-->>Courier A: 200 OK (Errand Claimed)

  Note over OrderSvc: Courier B executes second: 0 rows affected (status is no longer OPEN)
  OrderSvc-->>Courier B: 409 Conflict ("Order is no longer available")
```

- **Winning Courier**: Database returns `affected_rows == 1`. The transaction succeeds, records `order.accepted` in the outbox, and returns `200 OK`.
- **Losing Couriers**: Database returns `affected_rows == 0`. The transaction immediately returns `409 CONFLICT` with an explanatory message. No state corruption or race condition can occur.
- **Requester Protection**: The condition `requester_id <> :courier_id` ensures students can never accept their own errands.

---

## 5. Domain Events Choreography (RabbitMQ)

All events are published to the durable topic exchange `campus.events` using the Transactional Outbox pattern.

| Routing Key | Event Type | Publisher | Consumers | Business Purpose |
|---|---|---|---|---|
| `user.registered` | `UserRegisteredEvent` | `user-service` | `credit-service` | Grants initial 100 credits upon account registration. |
| `order.created` | `OrderCreatedEvent` | `order-service` | `notification-service` | Logs new errand and alerts potential couriers. |
| `order.accepted` | `OrderAcceptedEvent` | `order-service` | `notification-service` | Notifies requester that a courier has accepted the errand. |
| `order.in_transit` | `OrderInTransitEvent` | `order-service` | `notification-service` | Notifies requester that item has been picked up. |
| `order.delivered` | `OrderDeliveredEvent` | `order-service` | `notification-service` | Notifies requester to inspect and confirm drop-off. |
| `order.completed` | `OrderCompletedEvent` | `order-service` | `credit-service`, `notification-service` | Settles escrow reward to courier; sends confirmation notification. |
| `order.cancelled` | `OrderCancelledEvent` | `order-service` | `credit-service`, `notification-service` | Releases escrow refund to requester; alerts participants of cancellation. |
| `order.expired` | `OrderExpiredEvent` | `order-service` | `credit-service`, `notification-service` | Releases escrow refund to requester; cleans up open feed. |

### Deduplication & Idempotency
- Every event includes a unique UUID `eventId`.
- Consuming services check their local tables (`processed_credit_events`, `notifications`) inside their database transactions. If an `eventId` was already processed, the consumer acknowledges RabbitMQ and skips execution.
- If processing fails due to an unexpected error, RabbitMQ retries up to 5 times with exponential backoff before sending the poison message to `campus.events.dlx` (Dead-Letter Queue).
