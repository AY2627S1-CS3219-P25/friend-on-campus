<!--
AI Assistance Disclosure:
Tool: Claude Code (model: Claude Fable 5.1), date: 2026-11-04
Scope: PR #222 review: recovery commands now show how to set DATABASE_URL (the bare Prisma CLI bypasses the repository wrapper's SUPPLIER_DATABASE_URL mapping); documented that reseeding keeps recorded coordinates and that the migration suite exercises the recovery path through the Prisma CLI.
Author review: <to be completed by Reallyeasy1>

Tool: Codex (model: GPT-6), date: 2026-11-01
Scope: Document staged coordinate enforcement and recovery from the PR #220 migration.
Author review: <to be completed by Reallyeasy1>
-->

# Supplier coordinate upgrades

New suppliers need numeric latitude and longitude (enforced by the API). Older suppliers may have none; they stay readable and editable, and the map skips them until an administrator enters coordinates in **Edit Supplier**. Nothing invents positions or deletes records. Database columns stay nullable until every record has verified coordinates. Each container start reruns the CSV seed, which fills only missing coordinates and keeps recorded ones.

## Upgrading

Use `services/supplier-service/prisma/migrations/` (the old copy under `src/database/prisma/` is unused).

| Database state | Action |
|---|---|
| Fresh, or the coordinate migration never ran | `npm run db:deploy -w @campus-errand/supplier-service` |
| Original `20261017102809_make_coordinates_required` already succeeded | Same command; `20261101040000_preserve_legacy_coordinates` drops the constraints and keeps every row |
| Original migration failed on rows with null coordinates | Recover as below |

`20261017102809_make_coordinates_required` is now a no-op. A database that applied its earlier SQL may show a checksum warning; the forward migration reconciles it. Use `migrate deploy` for this upgrade, not `migrate dev`, which can ask to reset the database.

## Recovering a failed original attempt

Back up the database and check `migrate status` first. Run from `services/supplier-service` against the same database. The bare Prisma CLI reads only `DATABASE_URL`, so map it yourself:

```sh
# sh / bash. PowerShell: $env:DATABASE_URL = $env:SUPPLIER_DATABASE_URL
export DATABASE_URL="$SUPPLIER_DATABASE_URL"
npx prisma migrate status --schema prisma/schema.prisma
npx prisma migrate resolve --rolled-back 20261017102809_make_coordinates_required --schema prisma/schema.prisma
npx prisma migrate deploy --schema prisma/schema.prisma   # or: npm run db:deploy
```

Only mark it rolled back if its single `ALTER TABLE` failed on null coordinates (that statement is atomic). Investigate any other error first. Never mark a successful migration rolled back, edit Prisma's history table, or delete volumes.

## Tests

`npm run test:migration -w @campus-errand/supplier-service` covers fresh schemas, legacy rows with missing coordinates, databases with the original constraints, and this recovery path. Run it only against a dedicated database whose name contains `_test`.
