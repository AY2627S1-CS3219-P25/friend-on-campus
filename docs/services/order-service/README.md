<!--
AI Assistance Disclosure:
Tool: Codex (model: GPT-6), date: 2026-10-25
Scope: Source-linked implementation documentation and evidence review requested by Reallyeasy1.
Author review: <to be completed by Reallyeasy1>
-->

# Order Service implementation

Implementation baseline: [`52d791e`](https://github.com/AY2627S1-CS3219-P25/friend-on-campus/commit/52d791e4eea28ce7d817f025ef096f8d96bda467); inspected 2026-10-25 (SGT). Pending work is explicitly labelled.

Order Service owns errand lifecycle and assignment in order_db. It validates suppliers synchronously and coordinates reservation outcomes asynchronously. Credit owns financial mutation; Notification owns persisted alerts.

| Module | Responsibility |
|---|---|
| src/index.ts; app.ts | Compose config, Prisma, auth, supplier client, repository/service/router, reservation consumer, sweeper and probes |
| orders/order.routes.ts | Authenticated APIs, principal extraction, admin checks and domain-error mapping |
| orders/order.service.ts | Input/state/ownership checks and event construction |
| repositories/order.repository.ts | Reads, conditional transitions, row locks, atomic outbox writes |
| clients/supplier.client.ts | Timed supplier HTTP lookup and availability result |
| messaging/reservation.consumer.ts | Validate and apply Credit result events; classify failures |
| orders/expiry.sweeper.ts | Periodic OPEN expiry batches |
| orders/order.types.ts | Domain errors, DTO conversion and order-code generation |

Config defaults: port 8003; supplier URL http://localhost:8002; events exchange campus.events; queue order-service.events; retry delay 5000 ms and threshold 5; connection timeout 5000 ms; expiry interval 30000 ms (minimum 5000). Database selection uses DATABASE_URL then ORDER_DATABASE_URL; JWT_PUBLIC_KEY/issuer/audience configure offline auth. The queue's DLX and DLQ both use the name order-service.events.dlq, distinct broker objects.

User-visible supplier names/zones are snapshots on the order. Source-generated order codes are `ORD-` plus eight uppercase hexadecimal characters. Startup installs shutdown handling, consumer readiness and expiry scheduling; it does not run an outbox polling worker. Compose probes /health, although /ready checks database/consumer dependencies separately.

`SEED_SAMPLE_ORDERS` controls development sample orders. Applying committed migrations and seeding are separate operations from generating Prisma clients. Workspace dev/db/test scripts are documented in [local development](../../development/local-development.md).

Read [contracts/data](contracts-and-data.md), [runtime/tests](runtime-and-testing.md) and the shared [event catalogue](../../architecture/communication-and-events.md). The v2 envelope, rejected/unassigned events and credit receipts in PR #184 remain pending and are covered only in its audit.

When no public key is configured, only explicit `ORDER_DEV_AUTH=1` or `true` enables development header identity (`x-user-id`, `x-user-role`); otherwise startup fails. See the contract page for this implemented authentication exception.

## Source evidence and related reading

- [`services/order-service/src/index.ts`](../../../services/order-service/src/index.ts)
- [`services/order-service/src/app.ts`](../../../services/order-service/src/app.ts)
- [`services/order-service/src/config.ts`](../../../services/order-service/src/config.ts)
- [`services/order-service/src/orders/order.service.ts`](../../../services/order-service/src/orders/order.service.ts)
- [`services/order-service/src/repositories/order.repository.ts`](../../../services/order-service/src/repositories/order.repository.ts)
- [`services/order-service/src/orders/expiry.sweeper.ts`](../../../services/order-service/src/orders/expiry.sweeper.ts)
- [`services/order-service/package.json`](../../../services/order-service/package.json)
- [Wiki: Order Service](https://github.com/AY2627S1-CS3219-P25/friend-on-campus/wiki/Order-Service)
- [Documentation index](../../README.md) · [Drift register](../../audits/documentation-drift.md) · [Verification record](../../audits/review-findings.md)
