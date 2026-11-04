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

New supplier creation requires numeric latitude and longitude. Existing suppliers may have missing coordinates because earlier versions allowed them. Those records remain readable and editable; the map excludes records without both coordinates. Administrators can enter verified coordinates in **Edit Supplier**; other fields of such a record can be edited while its coordinates stay blank. The migration does not invent positions or delete records. Container startup reruns the CSV seed on every boot: it fills only coordinates that are still missing and keeps values an administrator has recorded, so a correction survives a restart.

Database columns remain nullable during this repair period. API validation enforces coordinates on new suppliers and rejects explicit null coordinate updates. Database-level `NOT NULL` enforcement is deferred until all historical records have verified coordinates.

## Migration paths

Use the service's canonical `prisma/migrations/` directory. The old copy under `src/database/prisma/` is not used by the configured migration command.

| Database state | Action |
| --- | --- |
| Fresh database or coordinate migration not yet attempted | Run `npm run db:deploy -w @campus-errand/supplier-service` with the intended database configured. The corrected migration preserves existing nulls. |
| Original coordinate migration already succeeded | Run the same deployment command. The new `20261101040000_preserve_legacy_coordinates` migration drops the original constraints without changing row values. |
| Original coordinate migration failed specifically because existing rows contain null coordinates | Verify the failed migration and original error, then use the recovery commands below. |

The original `20261017102809_make_coordinates_required` migration is corrected to a no-op because a later migration cannot run past its failure on legacy data. Databases that already applied its earlier SQL can report a changed-migration checksum warning; the forward migration reconciles their schema. `migrate dev` can request a reset after this history correction. Do not reset a database containing needed data: use `migrate deploy` for this upgrade, and use a separate disposable database for migration development.

## Recovering a failed original attempt

Back up the intended database and inspect migration status first. These commands must use that same database configuration, from `services/supplier-service`. The bare Prisma CLI reads only `DATABASE_URL`; the repository wrapper behind `npm run db:deploy` (`scripts/prisma-migrate.mjs`) maps `SUPPLIER_DATABASE_URL` onto it for you, so set it yourself here:

```sh
# sh / bash — PowerShell: $env:DATABASE_URL = $env:SUPPLIER_DATABASE_URL
export DATABASE_URL="$SUPPLIER_DATABASE_URL"   # e.g. postgresql://supplier_svc:...@localhost:5432/supplier_db
npx prisma migrate status --schema prisma/schema.prisma
npx prisma migrate resolve --rolled-back 20261017102809_make_coordinates_required --schema prisma/schema.prisma
npx prisma migrate deploy --schema prisma/schema.prisma   # or: npm run db:deploy
```

Only mark this migration rolled back when its original single `ALTER TABLE` statement failed on null coordinates. That statement is atomic; it does not partially set one column's constraint. Investigate other errors or manual database changes before resolving them. Do not mark a successful migration rolled back, edit Prisma's history table, or delete volumes to repair this upgrade.

The supplier migration test exercises fresh schemas, legacy rows with missing coordinates, databases with the original constraints already applied, and the recovery path above: it applies the original failing migration to a legacy row through the Prisma CLI, then runs `migrate resolve --rolled-back` and `migrate deploy` against the corrected history and checks the legacy row survives. API tests verify required coordinates for new records and repair of old records. Run `npm run test:migration -w @campus-errand/supplier-service` against a dedicated database whose name contains `_test`.

References: [Prisma v6 failed migration recovery](https://www.prisma.io/docs/orm/v6/prisma-migrate/workflows/patching-and-hotfixing#failed-migration), [deployment versus development migration behaviour](https://www.prisma.io/docs/orm/v6/prisma-migrate/workflows/development-and-production).
