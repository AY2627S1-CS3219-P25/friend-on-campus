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
| `JWT_PUBLIC_KEY` | Ed25519 access-token verification | required |
| `JWT_ISSUER` | required access-token issuer claim | `friend-on-campus-user-service` |
| `JWT_AUDIENCE` | required access-token audience claim | `friend-on-campus-services` |

`docker-compose.yml` passes the public key, issuer, and audience to this container; it
does not receive the User Service private signing key.

## Files

Entry point `src/backend/server.ts` (not `src/index.ts`) · `src/backend/supplierRoutes.ts` (handlers + router) · `@campus-errand/auth` (configured Ed25519 verifier and `requireAdmin`) · `src/database/client.ts` · `src/database/supplierRepository.ts` · `src/database/seed.ts` · `src/database/prisma/schema.prisma` + `migrations/20260919090038_init/`.

## API (mounted at `/api/suppliers`)

| Method & path | Auth | Request | Success | Errors |
|---|---|---|---|---|
| `GET /` | **none** | query: `campusZone, category, search, isActive, sortBy, sortOrder, page, limit` | 200 `{ suppliers, total, page, limit, totalPages }` | 500 |
| `GET /:id` | **none** | `:id` is the UUID or a `supplierCode` | 200 supplier | 404 |
| `POST /` | Bearer + `ADMIN` | `CreateSupplierRequest`; required `name, campusZone, exactLocation, category` | 201 supplier | 400 missing fields; 401; 403 |
| `PUT /:id` | Bearer + `ADMIN` | `UpdateSupplierRequest` (any subset, incl. `isActive`) | 200 supplier | 401; 403; 404 |
| `PATCH /:id/toggle` | Bearer + `ADMIN` | — | 200 supplier with `isActive` flipped | 401; 403; 404 |
| `DELETE /:id[?permanent=true]` | Bearer + `ADMIN` | — | 200 message | 401; 403; 404 |

## Data

Table `suppliers`: `id`, `supplier_code` unique, `name`, `campus_zone`, `exact_location`, `category`, `description?`, `building?`, `floor?`, `latitude?`, `longitude?`, `starting_time?`, `closing_time?`, `image_url?`, `is_active` default true, `created_at`, `updated_at`. Defined in both `schema.prisma` (+ migration) and the init SQL, where `id` is `UUID` while Prisma declares `String`; the init SQL also inserts 5 sample rows (`SUP-001`…`SUP-005`).

## Behaviour as built

- `campusZone` and `category` filters are case-insensitive equality; `search` is a case-insensitive "contains" over `name`, `exactLocation`, `building`, `description`, `supplierCode`; a whitespace-only `search` is ignored. Filters combine with AND.
- `sortBy` accepts `name, campusZone, category, createdAt, supplierCode`; anything else silently falls back to `name`. `sortOrder` is `desc` only if exactly `desc`.
- Pagination applies only when `page` or `limit` is sent (default limit 10, max 100); otherwise the whole list is returned as one page.
- `supplierCode` is generated as `SUP-NNN` from the row count when not supplied, with a timestamp-based fallback if that code exists.
- `DELETE` soft-deletes (sets `isActive=false`) unless `?permanent=true`, which removes the row. Nothing checks order-service for references.
- No duplicate check on name + campus location; no `version` column, so concurrent edits are last-write-wins; `category` is not validated against `SupplierCategory`.
- Access tokens are verified locally with Ed25519 against the configured public key,
  issuer, and audience; this service never calls User Service.

## Differences from the documents

`../requirements/conflicts.md` rows 10 (guest reads), 11 (`PATCH` + `version` + 409 contract), 15 (duplicated table definitions). Also observable against D2 plan App. B–C: duplicate name + campus location should be rejected with 409; unsupported sort/filter values should return 400; list shape there is `{ items, page, pageSize, totalItems }`.

## Tests

`npm run test:d2` covers supplier queries and admin-vs-student access. It starts this service itself on 8002.

## Issues

#6, #7 (F2.1), #8 (F2.2), #27–#33 (Supplier N1–N4).
