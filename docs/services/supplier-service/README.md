<!--
AI Assistance Disclosure:
Tool: Codex (model: GPT-6), date: 2026-11-09
Scope: Reconcile implementation guidance with current source, simplify duplication and preserve historical attribution.
Author review: <to be completed by the author>

Tool: Claude Code (model: Claude Fable 5.1), date: 2026-11-04
Scope: PR #222 review: seed description notes that recorded coordinates survive a reseed.
Author review: <to be completed by Reallyeasy1>

Tool: Codex (model: GPT-6), date: 2026-11-01
Scope: Link the supplier coordinate upgrade and recovery instructions.
Author review: <to be completed by Reallyeasy1>

Tool: Codex (model: GPT-6), date: 2026-10-25
Scope: Source-linked implementation documentation and evidence review requested by Reallyeasy1.
Author review: <to be completed by Reallyeasy1>
-->

# Supplier Service implementation

Implementation baseline: [`b989758`](https://github.com/AY2627S1-CS3219-P25/friend-on-campus/commit/b989758e766cb593c3b8c94102eb6dfb5c7d8491); source inspected 2026-11-09 (SGT). This describes the repository, not a verified live deployment.

Supplier Service owns the campus pickup directory in `supplier_db`. Reads are public at this baseline; mutations require ADMIN. Order consults it synchronously before creating an errand and copies supplier name/zone into the order.

| Module | Responsibility |
|---|---|
| src/index.ts | Create app with Prisma readiness callback, start listener, install shutdown handlers |
| src/app.ts | Express middleware, public probes, supplier router |
| src/suppliers/supplierRoutes.ts | HTTP extraction, authentication/RBAC on mutations, status/error mapping |
| supplierService.ts | Required fields, effective update values, duplicate precheck |
| supplierRepository.ts | Prisma CRUD/filtering and in-memory sorting/pagination |
| src/database/seed.ts | CSV validation and upsert of directory records |

`PORT`/`SUPPLIER_SERVICE_PORT` defaults to 8002; DATABASE_URL precedes SUPPLIER_DATABASE_URL. JWT_PUBLIC_KEY and issuer/audience configure mutation verification. Although CORS_ORIGIN is loaded in config, `app.use(cors())` does not apply that value; record actual behavior rather than claiming an origin allowlist.

Readiness runs SELECT 1 and does not verify the suppliers table/schema. There is no RabbitMQ producer/consumer, application retry loop, or cross-service transaction in this service. `index.ts` registers SIGINT/SIGTERM handlers; shutdown disconnects Prisma, then closes the HTTP server.

Seed source is CLI path, then SEED_CSV_PATH, then `data/csv/supplier-seed-data.csv`. It validates expected headers/count/location/coordinates and upserts SUP-NNN records; existing IDs, active state and already-recorded coordinates are preserved while descriptive data updates (a missing coordinate is filled from the CSV). Sequential seed writes are not one atomic batch. The image starts only the application. Local Compose explicitly applies migrations and development seeds before listening; cloud execution uses separate tasks in the [ECS runbook](../../../infra/terraform/ecs/README.md).

Use [contracts and data](contracts-and-data.md) and [runtime/tests](runtime-and-testing.md). Workspace scripts provide dev, db:generate, db:deploy, db:seed, unit testing and a PostgreSQL coordinate migration test. Source-specific limits and test results are recorded centrally.

For databases created before coordinates became required on new API records, follow [coordinate upgrades](coordinate-upgrades.md) before upgrading an existing database. New suppliers require coordinates; legacy records remain repairable without fabricated locations.

## Source evidence and related reading

- [`services/supplier-service/src/index.ts`](../../../services/supplier-service/src/index.ts)
- [`services/supplier-service/src/app.ts`](../../../services/supplier-service/src/app.ts)
- [`services/supplier-service/src/config.ts`](../../../services/supplier-service/src/config.ts)
- [`services/supplier-service/src/suppliers/supplierService.ts`](../../../services/supplier-service/src/suppliers/supplierService.ts)
- [`services/supplier-service/src/database/seed.ts`](../../../services/supplier-service/src/database/seed.ts)
- [`services/supplier-service/package.json`](../../../services/supplier-service/package.json)
- [Wiki: Supplier Service](https://github.com/AY2627S1-CS3219-P25/friend-on-campus/wiki/Supplier-Service)
- [Documentation index](../../README.md) · [Drift register](../../audits/documentation-drift.md) · [Verification record](../../audits/review-findings.md)
