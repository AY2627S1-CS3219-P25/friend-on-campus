<!--
AI Assistance Disclosure:
Tool: Codex (model: GPT-6), date: 2026-10-25
Scope: Source-linked implementation documentation and evidence review requested by Reallyeasy1.
Author review: <to be completed by Reallyeasy1>

Tool: Codex (model: GPT-6), date: 2026-11-09
Scope: Reconciled this guide with current service code, schemas, configuration and tests; consolidated duplicated reference material.
Author review: <to be completed by Reallyeasy1>
-->

# Credit Service

Source baseline: [`b989758`](https://github.com/AY2627S1-CS3219-P25/friend-on-campus/commit/b989758e766cb593c3b8c94102eb6dfb5c7d8491), inspected 2026-11-09 (SGT). This describes repository behavior, not a verified deployment.

Credit Service owns wallets, welcome grants, the credit ledger, escrow and processed-event identities. Its HTTP API only reads the authenticated caller's wallet and ledger. RabbitMQ events initiate financial writes.

Order Service decides the errand lifecycle; Credit applies its financial consequences asynchronously. Settlement and refund now emit committed receipt events, `credit.escrow.settled` and `credit.escrow.refunded`. These are current implementation, not pending PR work.

Start with [contracts and data](contracts-and-data.md), then [runtime and testing](runtime-and-testing.md) for balance movements, replay handling and recovery boundaries.

## Implementation map

| Source | Responsibility |
|---|---|
| [`index.ts`](../../../services/credit-service/src/index.ts), [`app.ts`](../../../services/credit-service/src/app.ts) | Startup, schema checks, authentication, probes and shutdown |
| [`routes.ts`](../../../services/credit-service/src/credits/routes.ts) | Caller-scoped wallet/ledger reads |
| [`service.ts`](../../../services/credit-service/src/credits/service.ts) | Grant, reserve, settle, refund and transactional event application |
| [`store.ts`](../../../services/credit-service/src/credits/store.ts) | Serializable transactions, conditional balance changes, savepoints and conflict retries |
| [`events.ts`](../../../services/credit-service/src/credits/events.ts) | Validate/normalize messages and compute replay fingerprints |
| [`consumer.ts`](../../../services/credit-service/src/credits/consumer.ts) | Broker subscriptions and failure classification |

## Configuration and startup

Use the repository [quick start](../../../README.md) for the complete stack. The individual workspace command is `npm run dev -w @campus-errand/credit-service`; it needs the migrated Credit database, RabbitMQ and JWT public key. CDC must also run for result/receipt delivery.

Key settings in [`config.ts`](../../../services/credit-service/src/config.ts):

| Setting | Behavior/default |
|---|---|
| `PORT` / `CREDIT_SERVICE_PORT` | HTTP port; default `8004` |
| `DATABASE_URL` / `CREDIT_DATABASE_URL` | `DATABASE_URL` takes precedence |
| `JWT_PUBLIC_KEY`, `JWT_ISSUER`, `JWT_AUDIENCE` | Access-token verification |
| `RABBITMQ_URL`, `CREDIT_EXCHANGE` | Broker connection and exchange; default exchange `campus.events` |
| `CREDIT_QUEUE` | `credit-service.events` |
| `CREDIT_DLX`, `CREDIT_DLQ` | Default `<exchange>.dlx` and `<queue>.dlq` |
| `CREDIT_RETRY_DELAY_MS`, `CREDIT_RETRY_LIMIT` | `5000` ms delay; unknown transient failure limit `5` |
| `USER_SERVICE_URL` | Development wallet seeding only; not the runtime reservation path |

Startup checks all six expected database models before serving. `/health` reports liveness; `/ready` checks the database, consumer and shutdown state. Fatal broker failure stops the process for the deployment supervisor to restart it. Debezium publishes the outbox; there is no application outbox polling worker.

The [seed implementation](../../../services/credit-service/src/database/seed.ts) resolves development identities via User login and initializes grants/wallets. Its fallback behavior is for local development, not production identity provisioning. Do not use seed commands as a repair for an existing financial ledger.

## Related reading

- [Order Service](../order-service/README.md) · [Shared messaging](../../packages/messaging.md)
- [Wiki: Credit Service](https://github.com/AY2627S1-CS3219-P25/friend-on-campus/wiki/Credit-Service) — design context; source behavior above is the implementation reference.
- [Documentation index](../../README.md) · [Drift register](../../audits/documentation-drift.md)
