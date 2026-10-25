<!--
AI Assistance Disclosure:
Tool: Codex (model: GPT-6), date: 2026-10-25
Scope: Source-linked implementation documentation and evidence review requested by Reallyeasy1.
Author review: <to be completed by Reallyeasy1>
-->

# Credit Service implementation

Implementation baseline: [`52d791e`](https://github.com/AY2627S1-CS3219-P25/friend-on-campus/commit/52d791e4eea28ce7d817f025ef096f8d96bda467); inspected 2026-10-25 (SGT). Pending work is explicitly labelled.

Credit Service owns the closed credit economy: wallet balances, welcome grants, ledger, escrow and durable processed-event identities. HTTP exposes authenticated reads; event handling performs business mutations.

| Module | Responsibility |
|---|---|
| src/index.ts; app.ts | Compose Prisma store/service/consumer/router; schema verification, probes and shutdown |
| credits/routes.ts | Caller-scoped wallet/ledger reads |
| credits/service.ts | Grant/reserve/settle/refund business rules and transactional event application |
| credits/store.ts | Serializable transaction adapter, wallet/escrow/ledger operations, savepoints and retries |
| credits/events.ts | Parse/normalize events and compute fingerprint before dispatch |
| credits/consumer.ts | Bind events and classify failures |
| credits/errors.ts; types.ts | Domain errors and internal command/store types |

Defaults: port 8004; DATABASE_URL then CREDIT_DATABASE_URL; JWT_PUBLIC_KEY and common issuer/audience; CREDIT_EXCHANGE=campus.events; CREDIT_QUEUE=credit-service.events; CREDIT_DLX defaults campus.events.dlx; CREDIT_DLQ defaults credit-service.events.dlq; retry delay 5000 ms and threshold 5. USER_SERVICE_URL is used by development seed, not the runtime reserve path.

Startup verifies the six expected tables. `/health` reports liveness; `/ready` checks database and consumer. Container health probes liveness. SIGINT/SIGTERM paths perform cleanup; broker fatal failure can exit for restart. No polling outbox worker runs.

Seed resolves development account IDs by User login. The CLI permits deterministic offline IDs on failed fetch/transport; reachable non-2xx login, wrong identity or failed logout still fails seeding. It initializes the development wallets/grants; secrets are not reproduced here. Migrations own SQL checks; generated clients are service-local.

Read [contracts/data](contracts-and-data.md), [runtime/tests](runtime-and-testing.md), and [shared messaging](../../packages/messaging.md). Financial receipt events in PR #184 are pending, not current-main behavior.

## Source evidence and related reading

- [`services/credit-service/src/index.ts`](../../../services/credit-service/src/index.ts)
- [`services/credit-service/src/app.ts`](../../../services/credit-service/src/app.ts)
- [`services/credit-service/src/config.ts`](../../../services/credit-service/src/config.ts)
- [`services/credit-service/src/credits/service.ts`](../../../services/credit-service/src/credits/service.ts)
- [`services/credit-service/src/credits/store.ts`](../../../services/credit-service/src/credits/store.ts)
- [`services/credit-service/src/database/seed.ts`](../../../services/credit-service/src/database/seed.ts)
- [`services/credit-service/package.json`](../../../services/credit-service/package.json)
- [Wiki: Credit Service](https://github.com/AY2627S1-CS3219-P25/friend-on-campus/wiki/Credit-Service)
- [Documentation index](../../README.md) · [Drift register](../../audits/documentation-drift.md) · [Verification record](../../audits/review-findings.md)
