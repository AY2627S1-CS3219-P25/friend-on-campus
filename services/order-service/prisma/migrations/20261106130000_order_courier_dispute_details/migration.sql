-- AI Assistance Disclosure:
-- Tool: Claude Code (model: Claude Sonnet 5.5), date: 2026-11-06
-- Scope: Nullable courier_dispute_details on orders: the assigned courier's answer to a delivery dispute.
-- Author review: I validated correctness, edited for style, and verified with automated tests.

ALTER TABLE "orders"
  ADD COLUMN IF NOT EXISTS "courier_dispute_details" TEXT;
