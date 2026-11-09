<!--
AI Assistance Disclosure:
Tool: Codex (model: GPT-6), date: 2026-11-09
Scope: Reconcile implementation guidance with current source, simplify duplication and preserve historical attribution.
Author review: <to be completed by the author>

Tool: Codex (model: GPT-6), date: 2026-10-25
Scope: Source-linked implementation documentation and evidence review requested by Reallyeasy1.
Author review: <to be completed by Reallyeasy1>
-->

# Supplier runtime, failures and tests

Implementation baseline: [`b989758`](https://github.com/AY2627S1-CS3219-P25/friend-on-campus/commit/b989758e766cb593c3b8c94102eb6dfb5c7d8491); source inspected 2026-11-09 (SGT). This describes the repository, not a verified live deployment.

For reads, route query extraction feeds repository filtering, JavaScript sorting and optional slicing. There is no requirement for a token on current collection/detail GET routes. The frontend may still gate its screens behind login; that is a different layer.

```mermaid
%% AI-generated (edited by Reallyeasy1)
sequenceDiagram
  participant Admin
  participant Router
  participant Service
  participant Repo as Repository and supplier_db
  Admin->>Router: POST /api/suppliers
  Router->>Router: Verify token and ADMIN role
  Router->>Service: createNewSupplier(body)
  Service->>Service: Check required fields
  Service->>Repo: Find duplicate location
  alt Duplicate
    Service-->>Router: Conflict
    Router-->>Admin: 409
  else No precheck match
    Service->>Repo: Insert with unique constraints
    Repo-->>Service: Row or P2002
    Service-->>Router: Row or SupplierConflictError
    Router-->>Admin: 201 or 409
  end
```

Updates validate the effective combination of existing and changed values before duplicate checking. SQL uniqueness handles concurrent races missed by the precheck. Supplier-code generation uses count-based numbering with a timestamp fallback; it is not a demonstrated collision-free concurrent allocation guarantee.

Default deletion sets isActive=false; permanent=true removes the row. Toggle reads the current state then writes its inverse, not a single atomic database toggle. There is no automatic retry. Existing orders retain copied supplier details; new order creation independently checks current supplier availability.

## Failure boundaries

Validation/duplicate/missing records map to 400/409/404. Authentication errors precede mutations. Unexpected database errors become 500; no local compensation workflow runs. SELECT 1 readiness can succeed despite a missing table. The service has no event publication, so changing availability does not itself send a broker notification to clients.

## Tests

`npm run test:unit -w @campus-errand/supplier-service` uses Node/tsx and module mocks. `supplierRoutes.test.ts` combines HTTP/shared auth with a mocked repository; `supplierRepository.test.ts` mocks Prisma. Cases cover public reads, every mutation's authorization, validation, duplicates, sorting, pagination, delete semantics and probes.

`npm run test:migration -w @campus-errand/supplier-service` runs `test/coordinates.migration.ts` against `DATABASE_URL`, which must name a dedicated `_test` database. It creates/drops isolated schemas and checks fresh migration, preservation of legacy nulls, reconciliation of earlier constraints, and recovery through Prisma CLI. See [coordinate upgrades](coordinate-upgrades.md).

There is no Supplier `test:integration` script. The migration suite is real PostgreSQL coverage, but mocked unit tests and migration tests do not establish arbitrary concurrent CRUD behavior or production performance. D2 API acceptance adds real seeded database coverage. Current executions belong in the [verification record](../../audits/review-findings.md).

## Source evidence and related reading

- [`services/supplier-service/src/suppliers/supplierRoutes.ts`](../../../services/supplier-service/src/suppliers/supplierRoutes.ts)
- [`services/supplier-service/src/suppliers/supplierService.ts`](../../../services/supplier-service/src/suppliers/supplierService.ts)
- [`services/supplier-service/src/suppliers/supplierRepository.ts`](../../../services/supplier-service/src/suppliers/supplierRepository.ts)
- [`services/supplier-service/test/supplierRoutes.test.ts`](../../../services/supplier-service/test/supplierRoutes.test.ts)
- [`services/supplier-service/test/supplierRepository.test.ts`](../../../services/supplier-service/test/supplierRepository.test.ts)
- [`services/supplier-service/package.json`](../../../services/supplier-service/package.json)
- [Wiki: Supplier Service](https://github.com/AY2627S1-CS3219-P25/friend-on-campus/wiki/Supplier-Service)
- [Documentation index](../../README.md) · [Drift register](../../audits/documentation-drift.md) · [Verification record](../../audits/review-findings.md)
