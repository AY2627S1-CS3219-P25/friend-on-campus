<!--
AI Assistance Disclosure:
Tool: Claude Code (model: Claude Fable 5.1), date: 2026-09-29
Scope: PR #93: `building` and `floor` are required, the 409 duplicate rule and its index, the 400 on blank fields in `PUT`, and the second migration, as implemented in `supplierRoutes.ts`, `schema.prisma` and the migration SQL. Existing behaviour only.
Author review: <to be completed by the service owner>
-->
<!--
AI Assistance Disclosure:
Tool: Claude Code (model: Claude Fable 5.1), date: 2026-09-21
Scope: Wrote this page from services/supplier-service source, docker-compose.yml, the init SQL and D1 / D2-plan text. Descriptive only.
Author review: <to be completed by the service owner>
-->
<!--
AI Assistance Disclosure:
Tool: Codex (model: GPT-5.6 Terra), date: 2026-09-22
Scope: Documented the author-approved Ed25519 access-token verification migration.
Author review: <to be completed by ngkhengyang>
-->
<!--
AI Assistance Disclosure:
Tool: Google Antigravity Agent, date: 2026-09-28
Scope: Purged asymmetric Ed25519 documentation and updated configuration to reflect symmetric SESSION_SECRET and NGINX gateway header offloading.
Author review: (to be completed by author after review)
-->
<!--
AI Assistance Disclosure:
Tool: Google Antigravity Agent, date: 2026-09-24
Scope: Updated documentation to reflect that table definitions and migrations are managed exclusively by Prisma in supplier-service, resolving conflict 15.
Author review: (to be completed by author after review)
-->
<!--
AI Assistance Disclosure:
Tool: Claude Code (model: Claude Fable 5.1), date: 2026-09-28
Scope: Added facts observed in the D2 UAT on `main` @ f0ee632: name sort order, seed on container boot, denial codes,
and the UAT drivers under Tests. Observed facts only.
Author review: <to be completed by the service owner>
-->

# supplier-service

**Status:** real — PostgreSQL via Prisma. Port **8002**, database **`supplier_db`**.

## Responsibilities (from the documents)

Directory of verified suppliers and pickup locations for all authenticated users: list, search by name, filter, sort, paginate, details; administrators create, edit, change availability and remove records. [D1 F2.1–F2.2; Supplier Service N1–N4; D2 plan work packages B–C, App. A–C]

## Run

```bash
docker compose up postgres -d
npm run db:migrate --workspace=@campus-errand/supplier-service   # only when the schema changed
npm run db:seed    --workspace=@campus-errand/supplier-service   # 21 rows from data/csv/supplier-seed-data.csv
npm run dev:supplier
```

## Configuration

| Variable | Used for | Default in code |
|---|---|---|
| `PORT` | listen port | `8002` |
| `DATABASE_URL` | Prisma connection | none — required |

When requests arrive via NGINX API Gateway, NGINX verifies the session with `user-service` and injects verified `X-User-Id` and `X-User-Role` headers downstream. Backend routes enforce `requireAdmin` based on `X-User-Role: ADMIN`.

## Files

Entry point `src/backend/server.ts` (not `src/index.ts`) · `src/backend/supplierRoutes.ts` (handlers + router) · `@campus-errand/auth` (`getSessionUser`) · `src/database/client.ts` · `src/database/supplierRepository.ts` · `src/database/seed.ts` · `src/database/prisma/schema.prisma` + `migrations/20260919090038_init/` and `migrations/20260929134701_add_location_uniqueness/`.

## API (mounted at `/api/suppliers`)

| Method & path | Auth | Request | Success | Errors |
|---|---|---|---|---|
| `GET /` | **none** | query: `campusZone, category, search, isActive, sortBy, sortOrder, page, limit` | 200 `{ suppliers, total, page, limit, totalPages }` | 500 |
| `GET /:id` | **none** | `:id` is the UUID or a `supplierCode` | 200 supplier | 404 |
| `POST /` | `X-User-Role: ADMIN` | `CreateSupplierRequest`; required `name, campusZone, exactLocation, category, building, floor` | 201 supplier | 400 missing fields; 401; 403; 409 duplicate |
| `PUT /:id` | `X-User-Role: ADMIN` | `UpdateSupplierRequest` (any subset, incl. `isActive`) | 200 supplier | 400 blank `name`, `category`, `building` or `floor`; 401; 403; 404; 409 duplicate |
| `PATCH /:id/toggle` | `X-User-Role: ADMIN` | — | 200 supplier with `isActive` flipped | 401; 403; 404 |
| `DELETE /:id[?permanent=true]` | `X-User-Role: ADMIN` | — | 200 message | 401; 403; 404 |

OpenAPI form: [`../api/supplier-service.yaml`](../api/supplier-service.yaml).

## Data

Diagram: [`../diagrams/supplier-schema.md`](../diagrams/supplier-schema.md).

Table `suppliers`: `id`, `supplier_code` unique, `name`, `campus_zone`, `exact_location`, `category`, `description?`, `building`, `floor`, `latitude?`, `longitude?`, `starting_time?`, `closing_time?`, `image_url?`, `is_active` default true, `created_at`, `updated_at`. Unique expression index `suppliers_location_case_insensitive_uq` on `LOWER(name), LOWER(category), LOWER(building), LOWER(floor)`, created in the migration SQL. Defined in `schema.prisma` (+ migrations). The table is managed independently by Prisma migrations and seeded via `src/database/seed.ts` (21 rows from `data/csv/supplier-seed-data.csv`).

## Behaviour as built

- `campusZone` and `category` filters are case-insensitive equality; `search` is a case-insensitive "contains" over `name`, `exactLocation`, `building`, `description`, `supplierCode`; a whitespace-only `search` is ignored. Filters combine with AND.
- `sortBy` accepts `name, campusZone, category, createdAt, supplierCode`; anything else silently falls back to `name`. `sortOrder` is `desc` only if exactly `desc`.
- `sortBy=name` is case-sensitive as returned by the database: ascending, `he by He Brews` comes after `TOMORO COFFEE` (UAT S8).
- Denials on write routes: missing identity headers → 401 `MISSING_TOKEN`, `STUDENT` → 403 `ADMIN_REQUIRED` (UAT W1, W2, W12).
- The container start command runs `prisma migrate deploy`, the seed, then the server. On a fresh volume the seed reports `created=21`; on later boots `created=0 updated=21`, which puts the 21 CSV rows' fields back to the CSV values. Rows created through the API are not touched.
- Pagination applies only when `page` or `limit` is sent (default limit 10, max 100); otherwise the whole list is returned as one page.
- `supplierCode` is generated as `SUP-NNN` from the row count when not supplied, with a timestamp-based fallback if that code exists.
- `DELETE` soft-deletes (sets `isActive=false`) unless `?permanent=true`, which removes the row. Nothing checks order-service for references.
- Duplicate check on create and update: a supplier whose `name`, `category`, `building` and `floor` match another one (trimmed, case-insensitive) is rejected with 409 and a `duplicate` object holding those four fields of the existing record. A unique-index violation that gets past that check is also answered with 409.
- The migration `20260929134701_add_location_uniqueness` sets `building` and `floor` to `NOT NULL` without a backfill. On a database volume that already holds a supplier with no building or floor, `prisma migrate deploy` fails and the service does not start; `docker compose down -v` recreates the volume.
- No `version` column, so concurrent edits are last-write-wins; `category` is not validated against `SupplierCategory`.
- Access tokens are verified locally with HMAC-SHA256 (via `@campus-errand/auth`) against the configured symmetric session secret,
  issuer, and audience, or forwarded via verified gateway headers; this service never calls User Service.

## Differences from the documents

`../requirements/conflicts.md` rows 10 (guest reads), 11 (`PATCH` + `version` + 409 contract), 15 (duplicated table definitions - resolved). Also observable against D2 plan App. B–C: the plan's duplicate rule is name + campus location, the code's is name + category + building + floor; unsupported sort/filter values should return 400; list shape there is `{ items, page, pageSize, totalItems }`.

## Tests

`npm run test:d2` covers supplier queries and admin-vs-student access. It starts this service itself on 8002. Its supplier and cross-service blocks pass on f0ee632.

`node scripts/uat/uat-d2-api.mjs` (S1–S11 queries, W1–W12 CRUD + RBAC) and `node scripts/uat/uat-d2-ui.mjs` (admin portal and student app in a browser) run against an already running stack; results in `../evidence/d2/`.

## Issues

#6, #7 (F2.1), #8 (F2.2), #27–#33 (Supplier N1–N4).
