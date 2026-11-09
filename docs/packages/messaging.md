<!--
AI Assistance Disclosure:
Tool: Codex (model: GPT-6), date: 2026-11-09
Scope: Reconcile current implementation, contracts, realtime delivery and verification limits; preserve historical records.
Author review: <to be completed by the author>

Tool: Codex (model: GPT-6), date: 2026-10-25
Scope: Source-linked implementation documentation and evidence review requested by Reallyeasy1.
Author review: <to be completed by Reallyeasy1>
-->

# Shared RabbitMQ messaging

Implementation checked against [`b989758`](https://github.com/AY2627S1-CS3219-P25/friend-on-campus/commit/b989758e766cb593c3b8c94102eb6dfb5c7d8491), 2026-11-09 (SGT). This describes repository behavior, not verified deployment state.

`@campus-errand/messaging` contains two distinct paths: durable business-event consumers and cross-replica realtime hints. Broker acceptance, database commit and browser receipt are different milestones.

| Path | Used for | Recovery source |
|---|---|---|
| Business consumer (`startRabbitConsumer`) | Order, Credit, Notification and Chat processing committed domain events | Durable queue, service idempotency and configured DLQ |
| Realtime subscriber + SQL outbox relay | Chat messages and Notification inbox/read changes delivered to every running replica | Service-owned database rows; REST catch-up after missed hints |

Exports live in [`index.ts`](../../packages/messaging/src/index.ts), [`realtime.ts`](../../packages/messaging/src/realtime.ts) and [`outbox-sql.ts`](../../packages/messaging/src/outbox-sql.ts). Business producer outboxes/CDC are documented in [CDC and broker](../infrastructure/cdc-and-broker.md); realtime intents are published by application relays, not Debezium.

## Business consumer lifecycle

`startRabbitConsumer` declares a durable topic source exchange, direct DLX, durable DLQ, quorum main queue and bindings. The DLQ declaration does not explicitly request quorum type. Prefetch and handler concurrency are both 1. Readiness follows consumer/connection status; channel/connection failures invoke the supplied fatal callback.

| Handler outcome | Behavior |
|---|---|
| Success, including deliberate ignored/duplicate events | ACK |
| Permanent failure | DROP; main queue dead-letters through configured DLX/routing key |
| Transient failure below retry threshold | Delay in the handler, then REQUEUE |
| Transient failure at/above threshold | DROP/dead-letter |
| Recognized infrastructure failure | Delay/requeue outside the application's transient threshold |
| Shutdown/fatal interruption | Requeue work that did not complete |

The counter is broker `x-delivery-count`, absent initially meaning zero. A configured threshold is not a promised total-attempt count. Retry delay holds the sole prefetch slot; there is no delayed retry queue. Broker delivery limits/policies remain separate from application classification. `close()` aborts the delay and closes consumer/connection; the service entrypoints wire bounded shutdown.

| Service | Delay / transient threshold | Default DLX | Default DLQ |
|---|---|---|---|
| [Order](../services/order-service/README.md) | 5000 ms / 5 | `order-service.events.dlq` | `order-service.events.dlq` |
| [Credit](../services/credit-service/README.md) | 5000 ms / 5 | `campus.events.dlx` | `credit-service.events.dlq` |
| [Notification](../services/notification-service/README.md) | 2000 ms / 5 | `notification-service.events.dlx` | `notification-service.events.dlq` |
| [Chat](../services/chat-service/README.md) | 2000 ms / 30 | `chat-service.events.dlx` | `chat-service.events.dlq` |

Defaults come from each service's `src/config.ts`; runtime overrides can change them. Order's same-name exchange/queue are different broker object types. Queue declarations must match existing broker topology; see the [queue handover guidance](../infrastructure/cdc-and-broker.md#business-queue-ownership-and-failures).

`isInfrastructureFailure` recognizes selected database/connection/timeout errors. Service classifiers decide permanent domain/validation failures; unrecognized errors consume the transient budget. A classifier does not make an operation idempotent: each consumer must commit its own state and deduplication atomically.

## Publishers

`createRabbitPublisher` uses publisher confirms, mandatory routing, durable messages and serialized attempts; an unroutable return rejects publication. Its default confirm timeout is 5 seconds. It is used by tests and utilities; Debezium handles the business outbox path described above.

`createFanoutPublisher` instead declares a durable fanout exchange, sends nonpersistent realtime hints and does **not** require a matching queue. With zero subscribers, a publication can confirm and its SQL intent can be deleted. Neither publisher confirm proves consumer processing or browser delivery.

## Realtime delivery

Chat and Notification each own a fanout exchange and an SQL outbox table. Every running replica has a subscriber queue and can relay pending intents. Default exchanges are `chat-service.events.realtime` and `notification-service.events.realtime`, configurable per service with `RABBITMQ_REALTIME_EXCHANGE`.

1. The service commits its durable row/read change and delivery intent together.
2. `createSqlOutboxStore` claims available intents using `FOR UPDATE SKIP LOCKED` and a lease; it does not hold a database lock during publication.
3. `createOutboxRelay` publishes, then deletes only if it still owns the lease. Failure reschedules the intent and increments attempts; there is no outbox attempt cap or dead-letter table.
4. Each replica receives the hint through its own temporary queue, rereads authoritative service state and sends to eligible local sockets.

A crash after publication but before completion can replay an intent. Owner-checked completion/release prevents an expired worker from deleting another worker's lease. These are at-least-once publication mechanics, not exactly-once user operations.

| Default | Value / effect |
|---|---|
| Relay polling / batch / lease | 250 ms / up to 20 intents / 30 seconds |
| Failed publication reschedule | 1 second |
| Subscriber queue | Unique per replica, classic, exclusive, auto-delete, nondurable |
| Queue bounds | 60-second TTL; maximum 10,000 messages; drop oldest on overflow |
| Subscriber prefetch / handler concurrency | 20 / 1 |
| Handler attempts / timeout | 3 attempts, 5 seconds per attempt, cancellation signal |
| Successful-event dedup cache | 10,000 recent event IDs in process memory |
| Reconnect backoff | Exponential from 1 second, capped at 10 seconds |

Malformed envelopes are dropped. A handler that exhausts its bounded attempts is logged and acknowledged without requeue or DLQ. The subscriber reconnects with a new queue after loss; Chat/Notification close sockets to force client reconnection and REST reconciliation. Queue expiry, overflow, zero subscribers and exhausted attempts can all lose **hints** while durable rows remain available.

Service-specific behavior is in [Chat](../services/chat-service/README.md#persistence-and-live-delivery) and [Notification execution paths](../services/notification-service/implementation.md). Moderation peer notices use transient fanout without a durable message/outbox row.

## Tests and limits

From the repository root:

```bash
npm run test:unit -w @campus-errand/messaging
```

[`test/realtime.test.ts`](../../packages/messaging/test/realtime.test.ts) covers relay completion/retry/ownership, stopping, bounded handler attempts/deadlines, cache behavior and a loopback fake. Chat and Notification `test:messaging` scripts add real PostgreSQL/RabbitMQ two-replica scenarios; their guides specify required test URLs and skip behavior. Order/Credit broker suites cover their business paths.

This refresh inspected source and test definitions; it did not run broker outages, replay tools or live load. Static declarations and unit tests do not establish message-loss guarantees for every broker failure. DLQ monitoring/replay and deployed alarms must be checked against the operational configuration, not inferred from these primitives.
