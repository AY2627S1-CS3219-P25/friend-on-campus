-- AI Assistance Disclosure:
-- Tool: Claude Code (model: Sonnet 5), date: 2026-09-23
-- Scope: Added the boolean `status` column (default true) to `users`, so an account can be deactivated
-- without deleting it. Schema/migration layer only — no API route or repository changes in this migration.
-- Author review: (to be completed by author after review)

ALTER TABLE "users" ADD COLUMN "status" BOOLEAN NOT NULL DEFAULT true;
