<!--
AI Assistance Disclosure:
Tool: Codex (model: GPT-6), date: 2026-10-25
Scope: Source-linked implementation documentation and evidence review requested by Reallyeasy1.
Author review: <to be completed by Reallyeasy1>

Tool: Codex (model: GPT-6), date: 2026-11-09
Scope: Reconciled this guide with current service code, schemas, configuration and tests; consolidated duplicated reference material.
Author review: <to be completed by Reallyeasy1>
-->

# Order Service

Source baseline: [`b989758`](https://github.com/AY2627S1-CS3219-P25/friend-on-campus/commit/b989758e766cb593c3b8c94102eb6dfb5c7d8491), inspected 2026-11-09 (SGT). This describes repository behavior, not a verified deployment.

Order Service owns errand state, assignment, disputes and expiry. Credit Service owns the money: posting requests a reservation asynchronously; completion, cancellation and expiry trigger later settlement or refund. An Order HTTP response does not prove that a wallet has changed.

Start with [contracts and data](contracts-and-data.md) for routes and state transitions, then [runtime and testing](runtime-and-testing.md) for the reservation flow, recovery and checks.

## Implementation map

| Source | Responsibility |
|---|---|
| [`index.ts`](../../../services/order-service/src/index.ts), [`app.ts`](../../../services/order-service/src/app.ts) | Startup, authentication, probes and shutdown |
| [`order.routes.ts`](../../../services/order-service/src/orders/order.routes.ts) | Authenticated HTTP endpoints and response envelopes |
| [`order.service.ts`](../../../services/order-service/src/orders/order.service.ts) | Input validation, ownership checks and transition commands |
| [`order.repository.ts`](../../../services/order-service/src/repositories/order.repository.ts) | Transactional state changes, version checks and outbox writes |
| [`reservation.consumer.ts`](../../../services/order-service/src/messaging/reservation.consumer.ts) | Credit reservation result handling |
| [`expiry.sweeper.ts`](../../../services/order-service/src/orders/expiry.sweeper.ts) | Expire overdue `OPEN` orders |
| [`assistant.service.ts`](../../../services/order-service/src/assistant/assistant.service.ts) | Natural-language draft extraction with Supplier grounding and an offline fallback |

## Configuration and startup

Use the repository [quick start](../../../README.md) for the full local stack. For an individually configured service, the workspace command is `npm run dev -w @campus-errand/order-service`. It needs a migrated Order database, RabbitMQ and a valid JWT public key; posting also needs Supplier Service. The complete Saga needs Credit and the CDC connectors.

Key settings in [`config.ts`](../../../services/order-service/src/config.ts):

| Setting | Behavior/default |
|---|---|
| `PORT` / `ORDER_SERVICE_PORT` | HTTP port; default `8003` |
| `DATABASE_URL` / `ORDER_DATABASE_URL` | `DATABASE_URL` takes precedence |
| `JWT_PUBLIC_KEY`, `JWT_ISSUER`, `JWT_AUDIENCE` | Access-token verification |
| `SUPPLIER_SERVICE_URL` | Supplier API; default `http://localhost:8002` |
| `RABBITMQ_URL`, `EVENTS_EXCHANGE` | Broker connection and exchange; exchange defaults to `campus.events` |
| `ORDER_RETRY_DELAY_MS`, `ORDER_RETRY_LIMIT` | Delayed retry: `5000` ms; unknown transient failure limit: `5` |
| `EXPIRY_SWEEPER_INTERVAL_MS` | Default `30000`; minimum `5000` |
| `SOCLAAS_BASE_URL`, `SOCLAAS_API_KEY`, `SOCLAAS_MODEL` | Optional assistant model configuration |

The consumer queue is `order-service.events`. Its dead-letter exchange and queue are separate broker objects both named `order-service.events.dlq`. These are fixed in this service's configuration.

Missing JWT configuration fails startup unless `ORDER_DEV_AUTH=1` or `true` explicitly enables development header authentication. That development mode trusts `x-user-id` / `x-user-role`; production must use verified tokens.

`/health` is liveness; `/ready` checks the database, consumer and shutdown state. The process starts the reservation consumer and expiry sweeper, and stops them during shutdown. Fatal broker failure exits for the deployment supervisor to restart the process. No application outbox polling worker runs: Debezium publishes committed outbox records.

## Related reading

- [Credit Service](../credit-service/README.md) · [Shared messaging](../../packages/messaging.md)
- [Wiki: Order Service](https://github.com/AY2627S1-CS3219-P25/friend-on-campus/wiki/Order-Service) — design context; source behavior above takes precedence for implementation details.
- [Documentation index](../../README.md) · [Drift register](../../audits/documentation-drift.md)
