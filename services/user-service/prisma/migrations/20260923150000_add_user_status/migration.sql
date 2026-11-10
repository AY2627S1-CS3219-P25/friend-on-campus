-- AI Assistance Disclosure:
-- Tool: Claude Code (model: Sonnet 5), date: 2026-09-23
-- Scope: Added the boolean `status` column (default true) to `users`, so an account can be deactivated without deleting it.
-- Author review: I validated correctness, edited for style, and verified with automated tests.

ALTER TABLE "users" ADD COLUMN "status" BOOLEAN NOT NULL DEFAULT true;
