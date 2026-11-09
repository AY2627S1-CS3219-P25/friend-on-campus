<!--
AI Assistance Disclosure:
Tool: Codex (model: GPT-6), date: 2026-10-25
Scope: Source-linked implementation documentation and evidence review requested by Reallyeasy1.
Author review: <to be completed by Reallyeasy1>
-->

# Supplier contracts and data

Baseline: branch `order_dispute`, HEAD `d49e883`, inspected 2026-11-08 (SGT).

## Routes

| Method and path | Access | Result |
|---|---|---|
| `GET /api/suppliers` | Public | 200 `data:{suppliers,total,page,limit,totalPages}` |
| `GET /api/suppliers/:id` | Public; id, then `supplierCode` | 200 `data:supplier`; 404 |
| `POST /api/suppliers` | ADMIN | 201 `data`+`message`; 400 missing field or non-numeric coordinates; 409 duplicate |
| `PUT /api/suppliers/:id` | ADMIN; partial | 200 `data`+`message`; 400 blank name/category/building/floor or non-finite coordinate; 404; 409 |
| `PATCH /api/suppliers/:id/toggle` | ADMIN | 200 `data`+`message`; 404 |
| `DELETE /api/suppliers/:id` | ADMIN; row removed only with `?permanent=true`, else `isActive=false` | 200 `message`; 404 |
| `GET /health` | Public | 200, process UP |
| `GET /ready` | Public | 200 READY / 503 NOT_READY (`SELECT 1` only, does not check the table) |

Auth errors are `{success:false,error,code}` (401 `MISSING_TOKEN`/`INVALID_TOKEN`/`TOKEN_EXPIRED`, 403 `ADMIN_REQUIRED`); see [authorization notes](README.md#5-authorization-notes). Business errors carry `error` only; a duplicate 409 adds `duplicate:{name,category,building,floor}` (not on a unique-index race). Unexpected failures return 500 with the error message.

## Query and payload rules

- **Filters:** `campusZone` and `category` are case-insensitive equality; `search` matches name, exactLocation, building, description and supplierCode; `isActive` filters only for literal `true`/`false`.
- **Sort:** `sortBy` is one of name, campusZone, category, createdAt, supplierCode (default name); `sortOrder=desc` reverses. Sorting and paging happen in JavaScript after the query, with id as tie-breaker.
- **Paging:** only when `page` or `limit` is given (defaults 1 and 10, limit clamped 1 to 100); otherwise every match is returned.
- **Create:** required name, campusZone, exactLocation, category, building, floor, latitude, longitude (finite numbers). Optional supplierCode (else generated `SUP-NNN` from the row count), description, startingTime, closingTime, imageUrl.
- **Update:** any mutable field plus `isActive`, not `supplierCode`. Omitted coordinates keep their value; an explicit null or non-finite one is rejected. The duplicate check uses the merged existing and new values.
- The category list is a compile-time type only; the service does not enforce it.

## Data

Table `suppliers` in `supplier_db`; no foreign keys to other services.

| Field | Type |
|---|---|
| `id` | UUID string (seeded rows use `10000000-0000-4000-8000-NNNNNNNNNNNN`) |
| `supplierCode` | unique, `SUP-NNN` |
| `name`, `campusZone`, `exactLocation`, `category`, `building`, `floor` | required text |
| `description`, `startingTime`, `closingTime`, `imageUrl` | optional text |
| `latitude`, `longitude` | nullable in the database (see [coordinate upgrades](coordinate-upgrades.md)); required by the API on create |
| `isActive` | boolean, default true |
| `createdAt`, `updatedAt` | timestamps |

A case-insensitive unique index on `LOWER(name), LOWER(category), LOWER(building), LOWER(floor)` (second migration, not in `schema.prisma`) is the final guard against duplicates that slip past the precheck.

## Source

[`supplierRoutes.ts`](../../../services/supplier-service/src/suppliers/supplierRoutes.ts) · [`supplierService.ts`](../../../services/supplier-service/src/suppliers/supplierService.ts) · [`supplierRepository.ts`](../../../services/supplier-service/src/suppliers/supplierRepository.ts) · [`schema.prisma`](../../../services/supplier-service/prisma/schema.prisma) · [Docs index](../../README.md)
