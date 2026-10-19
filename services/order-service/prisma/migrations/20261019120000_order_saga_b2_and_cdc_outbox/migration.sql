-- AI Assistance Disclosure:
-- Tool: Google Antigravity, date: 2026-10-19
-- Scope: Add rejection_reason and PENDING default status to orders for Saga Approach B2, and aggregate_type/aggregate_id to outbox_events for Debezium CDC routing.
-- Author review: Reviewed and verified by yanhwee.
-- AI-generated (edited by yanhwee)

ALTER TABLE "orders"
  ALTER COLUMN "status" SET DEFAULT 'PENDING',
  ADD COLUMN IF NOT EXISTS "rejection_reason" TEXT;

ALTER TABLE "outbox_events"
  ADD COLUMN IF NOT EXISTS "aggregate_type" VARCHAR(64) NOT NULL DEFAULT 'order',
  ADD COLUMN IF NOT EXISTS "aggregate_id" VARCHAR(64) NOT NULL DEFAULT '';
