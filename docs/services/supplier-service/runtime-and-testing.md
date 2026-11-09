<!--
AI Assistance Disclosure:
Tool: Codex (model: GPT-6), date: 2026-10-25
Scope: Source-linked implementation documentation and evidence review requested by Reallyeasy1.
Author review: <to be completed by Reallyeasy1>
-->

# Supplier runtime, failures and tests

Baseline: branch `order_dispute`, HEAD `d49e883`, inspected 2026-11-08 (SGT).

The request flows are in the [README diagrams](README.md#diagrams).

## Behaviour to know

- **Deletes:** default is a soft delete (`isActive=false`) so existing orders keep their supplier details; `?permanent=true` removes the row.
- **Toggle:** reads the current state, then writes the opposite (two statements, not atomic).
- **Codes:** supplier-code generation counts rows and falls back to a timestamp suffix; it is not collision-proof under concurrency, but the unique column catches a clash.
- **Orders:** an existing order keeps its copied supplier name and zone. Order Service checks the supplier again for each new order.
- **No events:** availability changes are not published, so nothing notifies clients.
- **Seed:** upserts are sequential, not one transaction. Existing ids, active state and recorded coordinates are kept.

## Failures

| Case | Result |
|---|---|
| Missing or invalid token / not ADMIN | 401 / 403, before any validation |
| Bad input | 400 |
| Unknown id | 404 |
| Duplicate location (precheck or unique index) | 409 |
| Database or other error | 500; no retry or compensation |
| Table missing | `/ready` still returns READY (`SELECT 1` only) |

## Tests

`npm run test:unit -w @campus-errand/supplier-service` (Node test runner with tsx and module mocks):

- `supplierRoutes.test.ts`: HTTP and shared auth against a mocked repository: public reads, each mutation's authorization, validation, duplicates, sorting, paging, delete, probes.
- `supplierRepository.test.ts`: filtering, sorting and paging against a mocked Prisma client.
- `seed.test.ts`: a reseed keeps coordinates an administrator has recorded.

`npm run test:migration -w @campus-errand/supplier-service` runs `coordinates.migration.ts` against a dedicated database whose name contains `_test`. There is no database test for the case-insensitive unique index or real concurrency; the D2 API acceptance run covers real PostgreSQL.

## Source

[`supplierRoutes.test.ts`](../../../services/supplier-service/test/supplierRoutes.test.ts) · [`supplierRepository.test.ts`](../../../services/supplier-service/test/supplierRepository.test.ts) · [`seed.test.ts`](../../../services/supplier-service/test/seed.test.ts) · [`package.json`](../../../services/supplier-service/package.json) · [Docs index](../../README.md) · [Verification record](../../audits/review-findings.md)
