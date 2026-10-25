<!--
AI Assistance Disclosure:
Tool: Codex (model: GPT-6), date: 2026-10-25
Scope: Source-linked implementation documentation and evidence review requested by Reallyeasy1.
Author review: <to be completed by Reallyeasy1>
-->

# Supplier Service implementation

Implementation baseline: [`52d791e`](https://github.com/AY2627S1-CS3219-P25/friend-on-campus/commit/52d791e4eea28ce7d817f025ef096f8d96bda467); inspected 2026-10-25 (SGT). Pending work is explicitly labelled.

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

Seed source is CLI path, then SEED_CSV_PATH, then `data/csv/supplier-seed-data.csv`. It validates expected headers/count/location/coordinates and upserts SUP-NNN records; existing IDs and active state are preserved while descriptive data updates. Sequential seed writes are not one atomic batch. Container startup applies migrations and seeds before listening.

Use [contracts and data](contracts-and-data.md) and [runtime/tests](runtime-and-testing.md). Workspace scripts provide dev, db:generate, db:deploy, db:seed and unit testing. Source-specific limits and test results are recorded centrally.

## Source evidence and related reading

- [`services/supplier-service/src/index.ts`](../../../services/supplier-service/src/index.ts)
- [`services/supplier-service/src/app.ts`](../../../services/supplier-service/src/app.ts)
- [`services/supplier-service/src/config.ts`](../../../services/supplier-service/src/config.ts)
- [`services/supplier-service/src/suppliers/supplierService.ts`](../../../services/supplier-service/src/suppliers/supplierService.ts)
- [`services/supplier-service/src/database/seed.ts`](../../../services/supplier-service/src/database/seed.ts)
- [`services/supplier-service/package.json`](../../../services/supplier-service/package.json)
- [Wiki: Supplier Service](https://github.com/AY2627S1-CS3219-P25/friend-on-campus/wiki/Supplier-Service)
- [Documentation index](../../README.md) · [Drift register](../../audits/documentation-drift.md) · [Verification record](../../audits/review-findings.md)
