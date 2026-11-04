-- AI Assistance Disclosure:
-- Tool: Claude Code (model: Claude Opus 5.5), date: 2026-11-04
-- Scope: Nullable drop-off coordinates and estimated reward on orders; existing rows keep NULL (no estimate).
-- Author review: <to be completed by huangjiaxi1111>
-- AI-generated (edited by huangjiaxi1111)

ALTER TABLE "orders"
  ADD COLUMN IF NOT EXISTS "dropoff_latitude" DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS "dropoff_longitude" DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS "estimated_reward_credits" INTEGER;
