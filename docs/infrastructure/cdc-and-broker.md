<!--
AI Assistance Disclosure:
Tool: Codex (model: GPT-6), date: 2026-10-25
Scope: Source-linked implementation documentation and evidence review requested by Reallyeasy1.
Author review: <to be completed by Reallyeasy1>
-->

# CDC and broker implementation

Implementation baseline: [`52d791e`](https://github.com/AY2627S1-CS3219-P25/friend-on-campus/commit/52d791e4eea28ce7d817f025ef096f8d96bda467); inspected 2026-10-25 (SGT). Pending work is explicitly labelled.

Three Debezium Server 2.7 connectors tail PostgreSQL logical replication and route outbox records to RabbitMQ. Application processes do not run their former polling outbox workers.

| Connector | Config | Source table | Broker publisher identity |
|---|---|---|---|
| debezium-user | docker/debezium/user.properties | user_db.public.outbox_events | user_service |
| debezium-order | docker/debezium/application.properties | order_db.public.outbox_events | order_service |
| debezium-credit | docker/debezium/credit.properties | credit_db.public.credit_outbox_events | credit_service |

Connectors use separate slots/publications and persisted offset storage. Their configured outbox routing maps event type to the `campus.events` routing key. Inspect configuration directly when diagnosing an event type mismatch; JSON payload fields and AMQP routing keys are independently validated by consumers.

## Topology ownership

Broker definitions import the vhost, identities/permissions, exchanges, Order/Credit quorum queues and bindings. Application `startRabbitConsumer` declarations complete service topology, including Notification's queue/DLX/DLQ. The consumer's queue arguments determine dead-letter destinations. A wildcard DTO type does not grant broker read/write permission.

See the [event catalogue](../architecture/communication-and-events.md) for producer/consumer relationships and [messaging](../packages/messaging.md) for ACK, REQUEUE and DROP behavior. User has no runtime broker connection. Order/Credit consume while their separate connectors publish.

## Trace a delayed event

1. Establish which service transaction committed and the expected event ID/type.
2. Confirm the outbox table exists and the owning migration is applied.
3. Inspect the correct connector's startup/streaming logs, slot and offset state.
4. Check exchange/routing-key permissions, queue bindings and consumer readiness.
5. Check consumer failure logs and DLQ contents; distinguish permanent validation failure from an unavailable database.
6. Verify the target database effect and authorized API response. A queue ACK alone does not prove the UI refreshed.

Do not manually edit offsets, delete queues/volumes or replay financial messages as part of a read-only diagnosis. No automatic DLQ replay/alert worker is implemented (issue #134). Replay policy remains human-controlled.

## Test coverage boundary

The Order saga messaging test manually publishes its Order outbox and receives Credit results through real Debezium. The aggregate runner and CI provision a dedicated Credit test connector/database/exchange and wait for streaming. `uat-cdc.mjs` exercises the broader registration → welcome grant → reservation → OPEN → cancellation/refund chain. Neither an old Wiki pass count nor inspected test source is a fresh execution result.

## Source evidence and related reading

- [`docker/debezium/user.properties`](../../docker/debezium/user.properties)
- [`docker/debezium/application.properties`](../../docker/debezium/application.properties)
- [`docker/debezium/credit.properties`](../../docker/debezium/credit.properties)
- [`docker/rabbitmq/definitions.json`](../../docker/rabbitmq/definitions.json)
- [`packages/messaging/src/index.ts`](../../packages/messaging/src/index.ts)
- [`scripts/ci/wait-for-cdc.mjs`](../../scripts/ci/wait-for-cdc.mjs)
- [`scripts/ci/run-all-tests.mjs`](../../scripts/ci/run-all-tests.mjs)
- [`scripts/uat/uat-cdc.mjs`](../../scripts/uat/uat-cdc.mjs)
- [Wiki: Architecture](https://github.com/AY2627S1-CS3219-P25/friend-on-campus/wiki/Architecture)
- [Documentation index](../README.md) · [Drift register](../audits/documentation-drift.md) · [Verification record](../audits/review-findings.md)
