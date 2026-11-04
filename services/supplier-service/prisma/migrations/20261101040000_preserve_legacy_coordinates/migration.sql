-- AI Assistance Disclosure:
-- Tool: Codex (model: GPT-6), date: 2026-11-01
-- Scope: Reconcile databases that already applied the original coordinate constraint.
-- Author review: <to be completed by Reallyeasy1>

ALTER TABLE "suppliers" ALTER COLUMN "latitude" DROP NOT NULL,
ALTER COLUMN "longitude" DROP NOT NULL;
