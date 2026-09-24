<!--
AI Assistance Disclosure:
Tool: Codex (model: GPT-6), date: 2026-09-24
Scope: Specified future User and Order Service integration with the implemented Credit Service contracts.
Author review: <to be completed by huangjiaxi1111>
-->

# Credit Service integration contract

## RabbitMQ publishing contract

- AMQP 0-9-1; durable **topic** exchange `campus.events` in the broker's default `/` virtual host.
- UTF-8 JSON, `contentType: application/json`, persistent delivery (`deliveryMode: 2`).
- Routing key equals JSON `eventType`; use `eventId` as AMQP `messageId` as well.
- All IDs are UUID strings (case normalized by Credit Service).
- `timestamp` is a real UTC ISO-8601 date, `YYYY-MM-DDTHH:mm:ssZ` or `YYYY-MM-DDTHH:mm:ss.sssZ` (for example `new Date().toISOString()`).
- Amounts are integer credits in `1..2147483647`. Zero, fractions and numeric strings are rejected.
- Generate `eventId` once when recording the event. Publication retries must keep the same ID **and payload**, including timestamp.
- Publish using a confirm channel; retain/retry unconfirmed publications. Use `mandatory: true` and handle `basic.return` so an unroutable publication is not treated as delivered. A confirm reports broker acceptance, not completion of credit processing.
- Credit Service declares its queue and bindings on startup. Provision/start it before publishing initial events; the durable exchange alone does not retain unrouted messages.
- Do not set expiration on credit events. Do not supply the internal `x-credit-*` headers.
- Local development: host processes use `amqp://guest:guest@localhost:5672`; Compose processes use `amqp://guest:guest@rabbitmq:5672`. Use configured credentials outside local development and never log connection URLs.

Credit Service's durable queue `credit-service.events` has bindings for exactly `user.registered`, `order.completed`, `order.cancelled`, and `order.expired`. Other service subscribers must have their own queues. There is no business outcome event published by Credit Service in this implementation.

## User Service: expected future implementation

After successful registration, publish `user.registered`. Registration must not synchronously call Credit Service.

Coordinate event creation with the user database transaction. A future approved transactional outbox implementation should commit the user and its event record together, publish pending records with confirms, and mark them delivered only after confirmation. Keep the event ID stable across retries. Publishing directly after committing the user leaves a crash window and does not meet reliable publication on its own.

Complete payload:

```json
{
  "eventId": "10000000-0000-4000-8000-000000000001",
  "eventType": "user.registered",
  "timestamp": "2026-09-24T10:00:00.000Z",
  "userId": "20000000-0000-4000-8000-000000000001",
  "email": "student@example.edu",
  "initialGrant": 100
}
```

Routing key: `user.registered`. `email` is required, must be syntactically valid, and is limited to 254 characters; Credit Service validates it but does not persist it. Reuse `UserRegisteredEvent` from `@campus-errand/common-dtos`.

Credit Service atomically creates a wallet, a grant marker and a `WELCOME_GRANT` ledger entry. Repeated events with the same or a new event ID do not grant credits again. A different amount for an existing grant is a permanent conflict and goes to the DLQ.

Compatibility behavior: a wallet read, first reservation or first courier payout can still initialize an unknown wallet with 100 credits and one grant entry before registration delivery. A later registration with `initialGrant: 100` records the event without changing the balance. A different amount then conflicts; it is never added on top of the existing grant. If the registration event arrives first, its amount initializes the wallet. Upstream code must not rely on an arbitrary grant amount overriding an earlier lazy grant.

## Order Service: expected future implementation

### Reserve before opening an order

Call Credit Service synchronously before the order becomes `OPEN`:

```http
POST /api/credits/escrow/reserve
Content-Type: application/json

{
  "orderId": "30000000-0000-4000-8000-000000000001",
  "requesterId": "20000000-0000-4000-8000-000000000001",
  "amount": 20
}
```

Inside Compose, the base URL is `http://credit-service:8004`; locally it is `http://localhost:8004`. Use the existing `CREDIT_SERVICE_URL` configuration when implementing the caller.

- `200`: `{ "success": true, "data": CreditWalletDTO, "message": "Escrow reserved successfully" }`.
- `400`: invalid identifiers/amount or insufficient available credits. Insufficient funds must reject order creation.
- `409`: the order ID was previously used with a different requester or amount.
- `500`: unexpected processing error. A lost response or timeout leaves the result uncertain; retry with the **same order ID, requester and amount**.

The reservation identity is `orderId`; no additional idempotency header is required. Never generate a replacement ID for the same ambiguous operation. Replays return current wallet balances, not a historical response snapshot. An identical reservation replay after settlement/refund also returns 200 without reserving again; Order Service must retain its order lifecycle and must never reopen or reuse a terminal order ID.

A reservation may finish before Order Service saves the order. Recovery of an orphan reservation and ambiguous order creation must be implemented in the separately scoped Order Service work. Credit Service does not expire reservations autonomously.

### Publish committed lifecycle transitions

Publish only after the corresponding order transition succeeds. Do not emit both completion and refund outcomes for one order. The referenced reservation must exist, and `requesterId` and `rewardCredits` must exactly match it. Partial settlement/refund is not supported.

`order.completed` (reuse `OrderCompletedEvent`):

```json
{
  "eventId": "10000000-0000-4000-8000-000000000002",
  "eventType": "order.completed",
  "timestamp": "2026-09-24T10:10:00.000Z",
  "orderId": "30000000-0000-4000-8000-000000000001",
  "requesterId": "20000000-0000-4000-8000-000000000001",
  "courierId": "20000000-0000-4000-8000-000000000002",
  "rewardCredits": 20
}
```

Routing key: `order.completed`. Settlement debits the requester's reserved balance, credits the courier, increments the courier's earned credits and creates one `ESCROW_RELEASE` entry.

`order.expired` (reuse `OrderExpiredEvent`):

```json
{
  "eventId": "10000000-0000-4000-8000-000000000003",
  "eventType": "order.expired",
  "timestamp": "2026-09-24T10:10:00.000Z",
  "orderId": "30000000-0000-4000-8000-000000000002",
  "requesterId": "20000000-0000-4000-8000-000000000001",
  "rewardCredits": 20
}
```

Routing key: `order.expired`. This refunds an existing reservation, returning the full amount to the requester and recording one `ESCROW_REFUND` entry.

`order.cancelled`:

```json
{
  "eventId": "10000000-0000-4000-8000-000000000004",
  "eventType": "order.cancelled",
  "timestamp": "2026-09-24T10:10:00.000Z",
  "orderId": "30000000-0000-4000-8000-000000000003",
  "requesterId": "20000000-0000-4000-8000-000000000001",
  "rewardCredits": 20
}
```

Routing key: `order.cancelled`. Refund behavior matches expiry. The different order IDs above describe separate example reservations; reserve each before publishing its terminal event.

`OrderCancelledEvent` must be added to `packages/common-dtos` and its event union in the future shared-contract work. Credit Service currently uses a clearly marked temporary local type in `src/credits/events.ts`, with exactly these fields. Replace that type with the shared import when available.

### Replay and conflict behavior

- Exact validated event replay: acknowledged without another financial effect.
- Same event ID with a different validated payload: permanent conflict.
- New event ID repeating the same business operation: recorded/acknowledged without another financial effect.
- Another completion specifying a different courier: permanent conflict.
- Completion after refund, or refund after settlement: permanent conflict.
- Cancellation after expiry (or vice versa) with identical reservation details: already refunded, no additional effect.
- Missing reservation or mismatched amount/requester: permanent conflict; do not send a terminal event before reservation confirmation.

HTTP settle/refund and RabbitMQ events share the same escrow state, so they cannot independently apply a transition twice. HTTP endpoints remain available for existing callers but should not become a second uncontrolled writer of order outcomes.

### Publication reliability still pending

Order Service currently stores orders in memory and logs fake publications. It has not been changed by this task. Publisher confirms alone cannot atomically coordinate order persistence and event publication, and an in-memory service cannot guarantee crash-safe publishing. A separately approved Order Service persistence/outbox implementation is needed to durably record transitions and events together and reuse event IDs after restart.

## Credit consumer delivery behavior

Credit Service commits its processed-event marker, escrow transition, wallet updates and ledger entry together before acknowledging. It uses serializable PostgreSQL transactions with bounded contention retries.

Permanent validation/business failures go to the durable queue `credit-service.events.dlq` through durable **direct** exchange `campus.events.dlx`, routing key `credit-service.events.dlq`. Transient failures receive up to five delayed retries (six processing attempts including the original). The default delay is one second.

The retry exchange and queue are both `credit-service.events.retry` (direct exchange, queue-name binding). A separate retry consumer holds the delivery until the scheduled time, then forwards it with a confirm to the default exchange targeting only `credit-service.events`. This avoids redistributing retry copies to other service queues and avoids relying on unconfirmed classic-queue TTL dead-letter forwarding. Main and retry consumers each use prefetch 1.

Bodies and original message IDs are preserved. Headers include `x-credit-original-routing-key`, `x-credit-retry-count`, `x-credit-failure-category`, `x-credit-failure-reason`, `x-credit-failed-at`, and (on retry) `x-credit-not-before`. Confirmed mandatory forwarding precedes acknowledgement; an unroutable/failed forwarding closes the consumer and leaves the original available for redelivery. Crashes can still duplicate deliveries, which persistence makes harmless.

After fixing a DLQ message's cause, an operator can replay its original body to `campus.events` with the original routing key and event ID, removing internal retry/failure headers to begin a fresh retry budget. Already committed IDs remain protected; changing a committed event's content is not a repair operation. DLQ recovery is manual in this implementation.

A broker/channel failure makes the consumer unready and shuts the Credit Service process down with an error status. Restart it after broker recovery; automatic process restart policy is outside this change.

## Verification expected in future upstream work

Verify that actual registration publishes a durable event and results in one grant; actual order creation reserves before OPEN; completed orders settle once; cancelled/expired orders refund once; replay after lost confirms preserves IDs and has no duplicate effect. Verify producer crash recovery independently of Credit Service's isolated integration tests.

RabbitMQ reference semantics: [publisher confirms and mandatory returns](https://www.rabbitmq.com/docs/3.13/publishers), [dead-letter forwarding safety](https://www.rabbitmq.com/docs/3.13/dlx).
