-- AI Assistance Disclosure:
-- Tool: Claude Code (model: Claude Sonnet 5.5), date: 2026-11-06
-- Scope: Delivery dispute flag (default false) and the requester's dispute details on orders; existing rows get false / NULL.
-- Author review: <to be completed by the author>
-- AI-generated (edited by jagdeepsh)

ALTER TABLE "orders"
  ADD COLUMN IF NOT EXISTS "dispute" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "requester_dispute_details" TEXT;
