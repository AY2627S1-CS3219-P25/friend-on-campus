<!--
AI Assistance Disclosure:
Tool: Codex (model: GPT-6), date: 2026-10-25
Scope: Source-linked implementation documentation and evidence review requested by Reallyeasy1.
Author review: <to be completed by Reallyeasy1>
-->

# Supplier contracts and data

Implementation baseline: [`52d791e`](https://github.com/AY2627S1-CS3219-P25/friend-on-campus/commit/52d791e4eea28ce7d817f025ef096f8d96bda467); inspected 2026-10-25 (SGT). Pending work is explicitly labelled.

## Routes

| Method/path | Access/input | Result |
|---|---|---|
| GET /api/suppliers | Public query | 200 data:{suppliers,total,page,limit,totalPages} |
| GET /api/suppliers/:id | Public; exact ID then supplierCode | 200 data:supplier; 404 absent |
| POST /api/suppliers | ADMIN; required name,campusZone,exactLocation,category,building,floor | 201 data:supplier; 400 required field; 409 duplicate |
| PUT /api/suppliers/:id | ADMIN; partial mutable fields | 200 data:supplier; 400 blank required identity field; 404; 409 |
| PATCH /api/suppliers/:id/toggle | ADMIN | 200 data:supplier; 404 |
| DELETE /api/suppliers/:id | ADMIN; permanent only when query is literal true | 200 success/message; soft delete default; 404 |
| GET /health | Public | 200 process UP, port/timestamp |
| GET /ready | Public | 200 READY / 503 NOT_READY from SELECT 1 |

Mutation middleware supplies shared 401 and 403 codes. Business errors usually contain `success:false,error`, without a machine code. Duplicate precheck includes name/category/building/floor metadata; a database P2002 conflict returns 409 without that metadata. Generic caught errors return 500. This differs from User's centralized error contract.

## Query and payload rules

campusZone/category are case-insensitive equality filters. Trimmed search checks name, exactLocation, building, description and supplierCode. isActive filters only for literal true/false; absent/invalid values include both states. sortBy supports name,campusZone,category,createdAt,supplierCode; otherwise name. sortOrder is descending only for `desc`. Sorting occurs in JavaScript after fetching matches, with ID tie-breaker; pagination slices afterward.

Supplying page or limit enables pagination (defaults 1/10, lower page bound 1, limit clamp 1–100). With neither, all matches are returned. parseInt handling is not strict finite numeric validation; do not advertise stronger rejection behavior than implemented.

Create optionally accepts supplierCode,description,latitude,longitude,startingTime,closingTime,imageUrl. Update accepts mutable fields and isActive, but not supplierCode. The category union is compile-time only; service runtime does not enforce the whole enum. Prisma objects are returned directly, including nullable fields and timestamp serialization.

## Data constraints

ID is SQL TEXT with a Prisma-generated UUID string. supplierCode is unique. The second migration adds a case-insensitive unique expression index on LOWER(name),LOWER(category),LOWER(building),LOWER(floor), intentionally absent from Prisma @@unique. Database uniqueness is the final race guard after service prechecks. No foreign key references Order databases.


Generic caught failures return HTTP 500 with `err.message`, falling back to `"Internal server error"`; unlike User Service, this handler does not consistently suppress internal error messages.

## Schema field inventory

This inventory is extracted from the baseline Prisma schema. SQL-only checks and expression indexes are discussed above; a Prisma annotation is not an exhaustive database constraint inventory.

### Supplier

| Field | Prisma declaration |
|---|---|
| `id` | `String   @id @default(uuid())` |
| `supplierCode` | `String   @unique @map("supplier_code")` |
| `name` | `String` |
| `campusZone` | `String   @map("campus_zone")` |
| `exactLocation` | `String   @map("exact_location")` |
| `category` | `String` |
| `description` | `String?` |
| `building` | `String` |
| `floor` | `String` |
| `latitude` | `Float?` |
| `longitude` | `Float?` |
| `startingTime` | `String?  @map("starting_time")` |
| `closingTime` | `String?  @map("closing_time")` |
| `imageUrl` | `String?  @map("image_url")` |
| `isActive` | `Boolean  @default(true) @map("is_active")` |
| `createdAt` | `DateTime @default(now()) @map("created_at")` |
| `updatedAt` | `DateTime @default(now()) @updatedAt @map("updated_at")` |
| Model constraint | `@@map("suppliers")` |

## Source evidence and related reading

- [`services/supplier-service/src/suppliers/supplierRoutes.ts`](../../../services/supplier-service/src/suppliers/supplierRoutes.ts)
- [`services/supplier-service/src/suppliers/supplierService.ts`](../../../services/supplier-service/src/suppliers/supplierService.ts)
- [`services/supplier-service/src/suppliers/supplierRepository.ts`](../../../services/supplier-service/src/suppliers/supplierRepository.ts)
- [`services/supplier-service/prisma/schema.prisma`](../../../services/supplier-service/prisma/schema.prisma)
- [`services/supplier-service/prisma/migrations/20260929134701_add_location_uniqueness/migration.sql`](../../../services/supplier-service/prisma/migrations/20260929134701_add_location_uniqueness/migration.sql)
- [Wiki: Supplier Service](https://github.com/AY2627S1-CS3219-P25/friend-on-campus/wiki/Supplier-Service)
- [Documentation index](../../README.md) · [Drift register](../../audits/documentation-drift.md) · [Verification record](../../audits/review-findings.md)
