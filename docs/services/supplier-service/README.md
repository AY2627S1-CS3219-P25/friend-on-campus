<!--
AI Assistance Disclosure:
Tool: Codex (model: GPT-6), date: 2026-11-09
Scope: Consolidate Supplier directory behavior, APIs, safe coordinate upgrades, operations and tests into one practical guide with an explained uniqueness sequence.
Author review: <to be completed by Reallyeasy1>

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

Tool: Claude Code (model: Claude Fable 5.1), date: 2026-11-04
Scope: PR #222 review: recovery commands now show how to set DATABASE_URL (the bare Prisma CLI bypasses the repository wrapper's SUPPLIER_DATABASE_URL mapping); documented that reseeding keeps recorded coordinates and that the migration suite exercises the recovery path through the Prisma CLI.
Author review: <to be completed by Reallyeasy1>

Tool: Codex (model: GPT-6), date: 2026-11-01
Scope: Document staged coordinate enforcement and recovery from the PR #220 migration.
Author review: <to be completed by Reallyeasy1>
-->

# Supplier Service: the campus pickup directory

Supplier Service owns places students can choose as pickup points: their names, campus zones, descriptions, opening hours, map coordinates and availability. The data lives in `supplier_db`. Directory reads are public at this baseline; changing a supplier requires an ADMIN token.

Order Service looks up a supplier synchronously before accepting a new errand and copies its name and zone into the order. Supplier edits do not rewrite old orders. This service has no RabbitMQ producer or consumer, so disabling a supplier does not itself send clients a broker notification.

This guide describes code at `b989758` (inspected 9 November 2026), carried by documentation PR #255. It combines API behavior, local operation and the coordinate-upgrade procedure. Use [local development](../../development/local-development.md) for the shared setup.

## Follow a directory request

A student searching for a pickup point sends a request such as:

```http
GET /api/suppliers?campusZone=COM3&isActive=true&search=coffee&page=1&limit=10
```

The route converts query parameters, the repository filters matching rows in PostgreSQL, and then the Node process sorts those rows and slices out the requested page. The response is shaped like:

```json
{
  "success": true,
  "data": {
    "suppliers": [],
    "total": 0,
    "page": 1,
    "limit": 10,
    "totalPages": 0
  }
}
```

This example is an empty search result, not a server failure. `total` counts all matches before paging. With neither `page` nor `limit`, the API returns **every match**, not a default ten-row page. Clients should explicitly request `isActive=true` when they only want currently available pickup points; omitted or invalid values include both active and inactive suppliers.

The distinction between database filtering and in-process pagination matters when diagnosing slow queries: requesting ten rows does not mean the database fetched only ten rows. Source inspection does not establish the original 50/100-VU performance requirements; the remaining Supplier query work is tracked by [#253](https://github.com/AY2627S1-CS3219-P25/friend-on-campus/issues/253).

### Filters and ordering

| Query field | Implemented behavior |
|---|---|
| `campusZone`, `category` | Case-insensitive equality |
| `search` | Trimmed, case-insensitive substring over name, exact location, building, description and supplier code |
| `isActive` | Filters only for literal `true` or `false` |
| `sortBy` | `name`, `campusZone`, `category`, `createdAt` or `supplierCode`; otherwise `name` |
| `sortOrder` | Descending only for `desc`; otherwise ascending |
| `page`, `limit` | Either enables pagination; defaults 1/10, page minimum 1 and limit clamped to 1–100 |

Text sorting ignores case and breaks equal-sort-key ties by ID. Query numbers use `parseInt`, not strict finite-number validation: do not rely on malformed numeric inputs being rejected cleanly.

## Add, update or disable a place

The browser's edit form is not the security boundary. Supplier mutation routes verify the access token using the shared auth package and require ADMIN. A non-admin cannot bypass that check by calling the URL directly. Read routes remain public even when a frontend screen requires login.

| Request | Access | Result |
|---|---|---|
| `GET /api/suppliers` | Public | `200 data.{suppliers,total,page,limit,totalPages}` |
| `GET /api/suppliers/:id` | Public | Looks up ID, then supplier code; `200 data` or `404` |
| `POST /api/suppliers` | ADMIN | Creates a supplier; `201 data` |
| `PUT /api/suppliers/:id` | ADMIN | Partial update; `200 data` |
| `PATCH /api/suppliers/:id/toggle` | ADMIN | Flips active status; `200 data` |
| `DELETE /api/suppliers/:id` | ADMIN | Soft delete by default; permanent removal only with `?permanent=true`; `200` message |

Responses serialize the stored Supplier row directly, including nullable optional fields and timestamps. Supplier IDs are text columns containing generated UUID strings; `supplierCode` is a separate unique lookup key.

Creation requires `name`, `campusZone`, `exactLocation`, `category`, `building`, `floor`, `latitude` and `longitude`. Coordinates must be finite JSON numbers: strings, missing values and explicit `null` are rejected. The API currently does not enforce latitude/longitude geographic ranges. Optional fields are `supplierCode`, `description`, `startingTime`, `closingTime` and `imageUrl`; new rows are active.

Updates accept only the fields implemented by the repository; `supplierCode` is not mutable. Omitted coordinates retain their old values, including legacy nulls. Explicit coordinate updates must be finite numbers. Updating `name`, `category`, `building` or `floor` to a blank string returns `400`. The TypeScript category union is not a complete runtime enum check; do not assume the backend rejects every category outside that union.

### Why two apparently identical creates can conflict

A place is unique by the case-insensitive combination of **name, category, building and floor**. The service first checks that combination so it can return helpful duplicate details. The SQL unique index then protects against two requests that pass the precheck at the same time.

```mermaid
%% AI-generated (edited by Reallyeasy1)
sequenceDiagram
    participant Admin
    participant API as Supplier API
    participant DB as supplier_db
    Admin->>API: Create or update a supplier
    API->>API: Check ADMIN and required values
    API->>DB: Look for the effective location
    alt Duplicate found
        DB-->>API: Existing supplier
        API-->>Admin: 409 with duplicate details
    else No duplicate found
        API->>DB: Write under unique indexes
        alt Database accepts write
            DB-->>API: Saved supplier
            API-->>Admin: 201 create or 200 update
        else Concurrent write collided
            DB-->>API: Unique violation
            API-->>Admin: 409 without duplicate details
        end
    end
```

For updates, the precheck combines changed values with the existing row and excludes that row itself. Changing an unrelated field therefore does not count as duplicating your own supplier.

Supplier codes have a separate unique constraint. Automatic code allocation uses a count-based candidate and timestamp fallback; it is not a collision-free sequence allocation guarantee. Toggling active status also reads then writes the inverse rather than performing one atomic SQL toggle. These details matter for concurrent administrative requests; the service does not automatically retry them.

Soft deletion sets `isActive=false`. Permanent deletion removes the Supplier row but has no cross-database cascade. Existing orders keep their copied details; new order creation independently checks current availability.

## Run it locally

After completing the [shared setup](../../development/local-development.md), run from the repository root:

```sh
# AI-generated (edited by Reallyeasy1)
npm run db:generate -w @campus-errand/supplier-service
npm run db:deploy -w @campus-errand/supplier-service
npm run dev -w @campus-errand/supplier-service
```

The generated client is service-local, migrations apply the canonical `prisma/migrations/` history, and the watched listener defaults to port 8002. Avoid starting a second listener if Compose already owns that port.

| Setting | Behavior |
|---|---|
| `PORT` / `SUPPLIER_SERVICE_PORT` | Default 8002 |
| `DATABASE_URL` / `SUPPLIER_DATABASE_URL` | Explicit `DATABASE_URL` takes priority |
| `JWT_PUBLIC_KEY`, `JWT_ISSUER`, `JWT_AUDIENCE` | Used to verify mutation requests; align them with User Service |
| `SEED_CSV_PATH` | Optional seed CSV; a command-line path takes priority |
| `CORS_ORIGIN` | Loaded by config but **not applied** by the current `app.use(cors())` call |

`GET /health` reports process liveness. `GET /ready` runs `SELECT 1`, so it can succeed even when the `suppliers` table or a migration is missing. SIGINT/SIGTERM handlers disconnect Prisma and close the server.

### Seed data without losing corrected coordinates

`npm run db:seed -w @campus-errand/supplier-service` reads a command-line CSV path, then `SEED_CSV_PATH`, then `data/csv/supplier-seed-data.csv`. CSV parsing validates the headers and row shape; each row then validates its required location fields and coordinates before its upsert. Rows use `SUP-NNN` codes.

For an existing matching code, seeding preserves the row ID, active state and each already-recorded coordinate. It updates descriptive fields and fills a coordinate only when it is missing. An administrator's corrected coordinates therefore survive reseeding. Writes happen sequentially rather than as one atomic batch: if a later row fails validation or its write fails, earlier rows may already be updated.

Local Compose explicitly runs migrations and this development seed before listening. The application image itself starts only the app; [cloud deployment](../../new-cloud-architecture-guide.md) uses separate migration/seed tasks. Reseeding is not an automatic production recovery procedure.

## Upgrade a database with missing coordinates

Older suppliers can have null coordinates because earlier API versions allowed them. New API creates now require coordinates, while the database columns deliberately remain nullable so historical rows can be repaired without being deleted or assigned invented locations. The frontend map excludes a supplier without both coordinates. An administrator can enter verified values in **Edit Supplier**, or update other fields while leaving legacy coordinates unset.

The supported migration history lives in [services/supplier-service/prisma/migrations](../../../services/supplier-service/prisma/migrations). The old copy under `src/database/prisma/` is not used by the configured deployment script.

| Database state | Safe upgrade path |
|---|---|
| Fresh database, or coordinate migration never attempted | Apply committed migrations with `npm run db:deploy -w @campus-errand/supplier-service`; corrected history preserves nulls |
| Original coordinate migration already succeeded | Apply the same history; `20261101040000_preserve_legacy_coordinates` drops its NOT NULL constraints without changing values |
| Original coordinate migration failed on existing nulls | Verify that exact failure, then use the recovery procedure below |

`20261017102809_make_coordinates_required` is now a no-op. This correction lets a database that failed the original migration advance to later migrations. A database that applied the older SQL can report a changed-migration checksum warning; the forward migration reconciles its schema. `migrate dev` may request a reset after this history change. **Do not reset a database containing needed data.** Use `migrate deploy` for this upgrade and a separate disposable database for migration development.

### Recover a failed original attempt

Back up the intended database and inspect the recorded migration failure first. Continue only if the original single `ALTER TABLE` statement failed because existing latitude/longitude values were null. That statement is atomic; the recovery is not an instruction to undo arbitrary partial manual changes.

Run from `services/supplier-service`. The bare Prisma CLI reads `DATABASE_URL`; unlike the repository's `db:deploy` wrapper, it does not map `SUPPLIER_DATABASE_URL` for you. Configure the intended connection privately in your shell. If it is already exported as `SUPPLIER_DATABASE_URL`, use:

```sh
# AI-generated (edited by Reallyeasy1)
: "${SUPPLIER_DATABASE_URL:?Set the intended database connection first}"
export DATABASE_URL="$SUPPLIER_DATABASE_URL"
npx prisma migrate status --schema prisma/schema.prisma
```

After confirming the specific failed migration, mark **that failed attempt** rolled back and deploy the corrected history:

```sh
# AI-generated (edited by Reallyeasy1)
npx prisma migrate resolve --rolled-back 20261017102809_make_coordinates_required --schema prisma/schema.prisma
npx prisma migrate deploy --schema prisma/schema.prisma
```

In PowerShell the variable assignment is `$env:DATABASE_URL = $env:SUPPLIER_DATABASE_URL`; ensure it is set to the intended database before running Prisma. A successful deployment should leave the legacy row intact with its original values and make the migration status current. Investigate other failure causes separately. Do not mark a successful migration rolled back, edit Prisma's history table or delete volumes to force this upgrade through.

The [migration test](../../../services/supplier-service/test/coordinates.migration.ts) exercises this exact recovery using the Prisma CLI, in addition to fresh schemas and databases where the original constraints were already applied. Database-level NOT NULL enforcement remains deferred until historical coordinates are verified; this guide does not introduce it.

## Troubleshoot and test

| Symptom | Likely boundary | What to inspect |
|---|---|---|
| `401` / `403` on a mutation | Authentication or administrator authorization | Access-token expiry, issuer/audience/public key and role; read access does not imply write access |
| `400` creating a location | Missing/blank required input or invalid coordinate type | Send numeric latitude/longitude, not form strings or nulls |
| `409` saving a location | Location or supplier-code uniqueness | Case-insensitive name/category/building/floor combination; concurrent inserts may omit duplicate metadata |
| Inactive places appear in search | `isActive` filter omitted or invalid | Send literal `isActive=true` |
| `/ready` is green but queries return `500` | Connectivity works; schema/query may not | Selected database, committed migrations and server logs |
| Directory response slows as it grows | All matching rows fetched and sorted in Node | Dataset size and filter selectivity; pagination alone does not reduce fetched matches |
| Supplier is absent from the map | One or both coordinates are null | Repair with verified coordinates; do not fabricate a fallback location |
| Seed stops partway through | Sequential upserts or invalid CSV | Preserve logs and inspect prior writes before rerunning |

Business errors generally return `{success:false,error}` without a stable machine code. Unexpected caught errors return `500` with `err.message` when present; unlike User Service, this handler does not consistently suppress internal error details. Avoid treating response messages as a guaranteed safe/public diagnostic contract.

Run the focused suites from the repository root:

```sh
# AI-generated (edited by Reallyeasy1)
npm run test:unit -w @campus-errand/supplier-service
npm run test:migration -w @campus-errand/supplier-service
```

Unit route tests combine HTTP/shared auth with a mocked repository; repository tests mock Prisma. They cover read filters, mutation authorization, validation, duplicates, ordering, paging, delete semantics and probes. They do not prove concurrent database CRUD or cloud performance.

The migration suite requires `DATABASE_URL` naming a **dedicated `_test` database**. It creates and drops isolated schemas and intentionally rehearses a failing migration and its recovery. Never point it at application data. Supplier has no `test:integration` script; real seeded API coverage comes from the system suites described in [testing strategy](../../development/testing-strategy.md).

## Find the implementation

- [supplierRoutes.ts](../../../services/supplier-service/src/suppliers/supplierRoutes.ts) extracts HTTP inputs and maps errors; [supplierService.ts](../../../services/supplier-service/src/suppliers/supplierService.ts) validates writes and effective update values.
- [supplierRepository.ts](../../../services/supplier-service/src/suppliers/supplierRepository.ts) implements database filters, in-memory ordering/pagination, code allocation and CRUD.
- The [schema](../../../services/supplier-service/prisma/schema.prisma) defines the directory row; [migration SQL](../../../services/supplier-service/prisma/migrations/20260929134701_add_location_uniqueness/migration.sql) defines its case-insensitive location index.
- [seed.ts](../../../services/supplier-service/src/database/seed.ts) owns CSV parsing and coordinate preservation; [coordinates.migration.ts](../../../services/supplier-service/test/coordinates.migration.ts) is the upgrade/recovery executable reference.

[Documentation index](../../README.md) · [Order Service](../order-service/README.md)
