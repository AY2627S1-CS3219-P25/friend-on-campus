<!--
AI Assistance Disclosure:
Tool: Codex (model: GPT-6), date: 2026-11-09
Scope: Separate business CDC from implemented realtime outbox relays; verify topology, retry behavior and environment-specific persistence.
Author review: <to be completed by Reallyeasy1>

Tool: Codex (model: GPT-6), date: 2026-11-08
Scope: Document Chat's shared quorum consumer and the non-destructive handover required for an existing classic Chat queue.
Author review: <to be completed by the author>

Tool: Codex (model: GPT-6), date: 2026-10-25
Scope: Source-linked implementation documentation and evidence review requested by Reallyeasy1.
Author review: <to be completed by Reallyeasy1>
-->

# CDC and broker operations

Implementation checked against [`b989758`](https://github.com/AY2627S1-CS3219-P25/friend-on-campus/commit/b989758e766cb593c3b8c94102eb6dfb5c7d8491) on 9 November 2026 (SGT). This is a source review, not a verification of the running AWS deployment.

Business events and realtime delivery use different outboxes. Use the [event catalogue](../architecture/communication-and-events.md) for business contracts and [messaging reference](../packages/messaging.md) for shared delivery primitives.

## Business-event CDC

Three Debezium Server 2.7 connectors tail PostgreSQL logical replication and route business outbox records to RabbitMQ's `campus.events` topic exchange. The former User/Order/Credit polling publishers are not the runtime path.

| Source | Configuration | Source table | Publisher identity |
|---|---|---|---|
| User | [user.properties](../../docker/debezium/user.properties) | `user_db.public.outbox_events` | `user_service` |
| Order | [application.properties](../../docker/debezium/application.properties) | `order_db.public.outbox_events` | `order_service` |
| Credit | [credit.properties](../../docker/debezium/credit.properties) | `credit_db.public.credit_outbox_events` | `credit_service` |

Each connector has its own replication slot/publication and persisted offset file. Routing uses event type; payload fields and AMQP routing keys are separately validated by consumers. CDC does not update the old outbox delivery-status column, so a row labelled `PENDING` alone does not demonstrate an undelivered event.

| Environment | Connector lifecycle and offsets |
|---|---|
| Compose | Three containers, with separate named volumes mounted at `/debezium/data`; they wait for the matching service, PostgreSQL and RabbitMQ health |
| ECS | Three singleton services, enabled only in `live`; separate EFS access points and explicit database publications; see [data-tasks.tf](../../infra/terraform/ecs/data-tasks.tf) |

ECS overrides the local database/broker endpoints and credentials, sets database TLS, and uses the `foc_cdc` role. EFS access points use UID 185/GID 0. Checkpoint or slot loss must be investigated separately from an ordinary connector restart; do not reset either to clear an incident.

## Realtime delivery is a separate path

Chat commits a `realtime_outbox` intent with a persisted message. Notification commits a `notification_realtime_outbox` intent with inbox/read-state changes. Application SQL outbox relays publish these intents to dedicated RabbitMQ fanout exchanges; per-replica subscribers notify their local sockets. These relays are implemented in [packages/messaging/src/realtime.ts](../../packages/messaging/src/realtime.ts) and [outbox-sql.ts](../../packages/messaging/src/outbox-sql.ts), not in the three Debezium configurations above.

Replica subscriptions are transient delivery channels. Persisted history/inbox reads provide reconnect recovery; do not equate a fanout publish confirmation with every browser receiving or reading an update. The [Chat](../services/chat-service/README.md) and [Notification](../services/notification-service/README.md) references describe readiness, reconnect and deduplication behavior.

## Business queue ownership and failures

[Broker definitions](../../docker/rabbitmq/definitions.json) import the vhost, users/permissions, business exchange and baseline queues/bindings. Application consumers complete their topology. Order, Credit, Chat and Notification use [the shared quorum consumer](../../packages/messaging/src/index.ts); User has no runtime broker consumer.

| Handler result | Shared consumer action |
|---|---|
| Success | ACK |
| Recognised infrastructure failure | Delay and requeue without the handler retry limit |
| Transient failure below its configured limit | Delay and requeue using `x-delivery-count` |
| Permanent failure or exhausted transient retries | DROP to the configured dead-letter route |

Classifiers and idempotency remain service-specific. A database outage and an invalid event should not be diagnosed as the same failure. The queue's dead-letter arguments and broker permissions are part of the route; a DTO declaration alone does not create a binding.

An existing classic queue cannot be redeclared as quorum. For upgrades, an operator must preserve messages and choose a drain/recreate or queue-handover procedure. The retired Chat retry exchange/queue is not automatically deleted. Do not delete broker volumes or DLQ contents as a migration shortcut.

## Trace a delayed asynchronous result

1. Identify the committed operation and the owning service/outbox; distinguish business CDC from realtime relay delivery.
2. Check the transaction's order/wallet/inbox state through the authorised API and identify the expected event type.
3. Inspect the relevant connector or relay logs, including replication/offset or publish-confirm failures.
4. Inspect queue bindings, consumer readiness, failure classification and dead-letter counts.
5. Verify the consumer's persisted effect and the UI's refresh/reconnect behavior. HTTP `202`, a queue ACK or a green process probe alone is not end-to-end completion.

No automatic business DLQ replay worker or operational alerting system is provisioned in this baseline. The richer failed-message recovery wiki design is not proof of implementation. Replay remains an explicitly authorised operation; no broker injection, replay, offset change or queue deletion was performed for this documentation review.

## Verification sources

The Order saga messaging test manually publishes the Order side and uses real Credit CDC for the response path. The aggregate test runner and CI provision a separate Credit test connector/database/exchange and wait for streaming. The CDC UAT driver exercises registration, welcome credits, reservation, publication and refund. Reading these tests does not constitute a fresh successful run.

- [CDC readiness check](../../scripts/ci/wait-for-cdc.mjs)
- [Aggregate test runner](../../scripts/ci/run-all-tests.mjs)
- [CDC UAT driver](../../scripts/uat/uat-cdc.mjs)
- [Testing strategy](../development/testing-strategy.md)

[Documentation index](../README.md) · [Known discrepancies](../audits/documentation-drift.md)
