<!--
AI Assistance Disclosure:
Tool: Codex (model: GPT-6), date: 2026-11-09
Scope: Reconcile implementation guidance with current source, simplify duplication and preserve historical attribution.
Author review: <to be completed by the author>

Tool: Codex (model: GPT-6), date: 2026-10-25
Scope: Source-linked implementation documentation and evidence review requested by Reallyeasy1.
Author review: <to be completed by Reallyeasy1>
-->

# Supplier contracts and data

Implementation baseline: [`b989758`](https://github.com/AY2627S1-CS3219-P25/friend-on-campus/commit/b989758e766cb593c3b8c94102eb6dfb5c7d8491); source inspected 2026-11-09 (SGT). This describes the repository, not a verified live deployment.

## Routes

| Method/path | Access/input | Result |
|---|---|---|
| GET /api/suppliers | Public query | 200 data:{suppliers,total,page,limit,totalPages} |
| GET /api/suppliers/:id | Public; exact ID then supplierCode | 200 data:supplier; 404 absent |
| POST /api/suppliers | ADMIN; required name,campusZone,exactLocation,category,building,floor,latitude,longitude | 201 data:supplier; 400 required field; 409 duplicate |
| PUT /api/suppliers/:id | ADMIN; partial mutable fields | 200 data:supplier; 400 blank required identity field; 404; 409 |
| PATCH /api/suppliers/:id/toggle | ADMIN | 200 data:supplier; 404 |
| DELETE /api/suppliers/:id | ADMIN; permanent only when query is literal true | 200 success/message; soft delete default; 404 |
| GET /health | Public | 200 process UP, port/timestamp |
| GET /ready | Public | 200 READY / 503 NOT_READY from SELECT 1 |

Mutation middleware supplies shared 401 and 403 codes. Business errors usually contain `success:false,error`, without a machine code. Duplicate precheck includes name/category/building/floor metadata; a database P2002 conflict returns 409 without that metadata. Generic caught errors return 500. This differs from User's centralized error contract.

## Query and payload rules

campusZone/category are case-insensitive equality filters. Trimmed search checks name, exactLocation, building, description and supplierCode. isActive filters only for literal true/false; absent/invalid values include both states. sortBy supports name,campusZone,category,createdAt,supplierCode; otherwise name. sortOrder is descending only for `desc`. Sorting occurs in JavaScript after fetching matches, with ID tie-breaker; pagination slices afterward.

Supplying page or limit enables pagination (defaults 1/10, lower page bound 1, limit clamp 1–100). With neither, all matches are returned. parseInt handling is not strict finite numeric validation; do not advertise stronger rejection behavior than implemented.

Create requires finite numeric latitude and longitude; missing, null and string coordinates are rejected. The API does not enforce geographic ranges. Optional create fields are supplierCode,description,startingTime,closingTime,imageUrl. Update accepts mutable fields and isActive, but not supplierCode. Omitted coordinates preserve existing values, including legacy nulls; explicitly supplied coordinates must be finite numbers. See [coordinate upgrades](coordinate-upgrades.md) for repair and migration behavior. The category union is compile-time only; service runtime does not enforce the whole enum. Prisma objects are returned directly, including nullable fields and timestamp serialization.

## Data constraints

ID is SQL TEXT with a Prisma-generated UUID string. supplierCode is unique. The second migration adds a case-insensitive unique expression index on LOWER(name),LOWER(category),LOWER(building),LOWER(floor), intentionally absent from Prisma @@unique. Database uniqueness is the final race guard after service prechecks. No foreign key references Order databases.


Generic caught failures return HTTP 500 with `err.message`, falling back to `"Internal server error"`; unlike User Service, this handler does not consistently suppress internal error messages.

## Persistence reference

The [Prisma schema](../../../services/supplier-service/prisma/schema.prisma) is the field reference: one `Supplier` row holds directory identity, location, opening hours, image, active status and timestamps. Latitude/longitude remain nullable for legacy records even though create validation now requires them. The [coordinate migrations](coordinate-upgrades.md) explain that difference.

## Source evidence and related reading

- [`services/supplier-service/src/suppliers/supplierRoutes.ts`](../../../services/supplier-service/src/suppliers/supplierRoutes.ts)
- [`services/supplier-service/src/suppliers/supplierService.ts`](../../../services/supplier-service/src/suppliers/supplierService.ts)
- [`services/supplier-service/src/suppliers/supplierRepository.ts`](../../../services/supplier-service/src/suppliers/supplierRepository.ts)
- [`services/supplier-service/prisma/schema.prisma`](../../../services/supplier-service/prisma/schema.prisma)
- [`services/supplier-service/prisma/migrations/20260929134701_add_location_uniqueness/migration.sql`](../../../services/supplier-service/prisma/migrations/20260929134701_add_location_uniqueness/migration.sql)
- [Wiki: Supplier Service](https://github.com/AY2627S1-CS3219-P25/friend-on-campus/wiki/Supplier-Service)
- [Documentation index](../../README.md) · [Drift register](../../audits/documentation-drift.md) · [Verification record](../../audits/review-findings.md)
