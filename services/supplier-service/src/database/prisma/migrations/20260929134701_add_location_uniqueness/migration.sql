-- AI Assistance Disclosure:
-- Tool: Claude Code (model: Sonnet 5), date: 2026-09-29
-- Scope: Makes building/floor required (they must be part of a meaningful uniqueness check), and adds a
-- case-insensitive uniqueness index on (name, category, building, floor) so two suppliers can no longer be
-- created at the same location under the same category. Safe against the live data: no existing supplier has
-- a null building/floor, and no two existing suppliers already collide case-insensitively on this combination.
-- Author review: (to be completed by author after review)

ALTER TABLE "suppliers" ALTER COLUMN "building" SET NOT NULL;
ALTER TABLE "suppliers" ALTER COLUMN "floor" SET NOT NULL;

CREATE UNIQUE INDEX "suppliers_location_case_insensitive_uq"
    ON "suppliers" (LOWER("name"), LOWER("category"), LOWER("building"), LOWER("floor"));
