<!--
AI Assistance Disclosure:
Tool: Codex (model: GPT-6), date: 2026-10-25
Scope: Source-linked implementation documentation and evidence review requested by Reallyeasy1.
Author review: <to be completed by Reallyeasy1>
-->

# Shared RabbitMQ messaging

Implementation baseline: [`52d791e`](https://github.com/AY2627S1-CS3219-P25/friend-on-campus/commit/52d791e4eea28ce7d817f025ef096f8d96bda467); inspected 2026-10-25 (SGT). Pending work is explicitly labelled.

`@campus-errand/messaging` wraps `rabbitmq-client` for consumer topology, delivery handling and confirm-mode publication. Production services use consumers; Debezium publishes their outbox rows. Tests and UAT use publisher utilities.

## Consumer lifecycle

`startRabbitConsumer` creates a connection, durable DLQ, source exchange, DLX, quorum main queue and bindings. The configured consumer uses prefetch 1 and concurrency 1. Readiness follows connection/consumer status; connection/channel failure invokes the supplied fatal callback. Service startup decides whether that exits the process.

| Handler result/failure | Shared behavior |
|---|---|
| Successful handler, including a deliberate ignored event | ACK |
| Permanent classified failure | DROP; queue dead-letters using configured DLX/routing key |
| Transient below retry threshold | Wait inside delivery callback, then REQUEUE |
| Transient at/above threshold | DROP |
| Infrastructure failure | Wait/requeue without the transient threshold |

The counter is broker `x-delivery-count`, with an absent initial value interpreted as zero. A threshold is not necessarily the same as a total-attempt count. Sleeping holds the sole prefetch slot; there is no separate delayed retry queue in this implementation. `close()` aborts retry sleep and closes consumer/connection. Not every service wires that method into signal handling.

| Service | Default delay / threshold | Classification use | DLX / DLQ |
|---|---|---|---|
| Order | 5000 ms / 5 | Permanent, infrastructure, transient | order-service.events.dlq / same name |
| Credit | 5000 ms / 5 | Permanent, infrastructure, transient | campus.events.dlx / credit-service.events.dlq |
| Notification | 2000 ms / 30 | InvalidNotificationEvent permanent; all other errors transient | notification-service.events.dlx / notification-service.events.dlq |

The same exchange/queue name for Order names separate broker object types. Broker definitions and application declarations must agree; see [CDC and broker](../infrastructure/cdc-and-broker.md).

## Publisher and guarantees

The shared publisher uses confirms, mandatory routing and serialized publish attempts. A confirm is broker acceptance, not proof a consumer applied a database transaction. Message redelivery remains possible. Consumer success requires each service's own atomicity/idempotency controls.

There is no package-local test script. Credit/Order/Notification messaging suites exercise selected paths; readiness, interruption and queue semantics require a real broker. No automatic dead-letter monitoring/replay worker was found. Static queue declarations alone do not establish message-loss guarantees under every broker failure.

## Source evidence and related reading

- [`packages/messaging/src/index.ts`](../../packages/messaging/src/index.ts)
- [`packages/messaging/package.json`](../../packages/messaging/package.json)
- [`services/order-service/src/messaging/reservation.consumer.ts`](../../services/order-service/src/messaging/reservation.consumer.ts)
- [`services/credit-service/src/credits/consumer.ts`](../../services/credit-service/src/credits/consumer.ts)
- [`services/notification-service/src/notifications/events.ts`](../../services/notification-service/src/notifications/events.ts)
- [Wiki: Architecture](https://github.com/AY2627S1-CS3219-P25/friend-on-campus/wiki/Architecture)
- [Documentation index](../README.md) · [Drift register](../audits/documentation-drift.md) · [Verification record](../audits/review-findings.md)
