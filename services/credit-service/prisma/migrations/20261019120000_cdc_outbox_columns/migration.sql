-- AI Assistance Disclosure:
-- Tool: Google Antigravity, date: 2026-10-19
-- Scope: Add aggregate_type and aggregate_id columns to credit_outbox_events for Debezium CDC Outbox routing.
-- Author review: Reviewed and verified by yanhwee.

ALTER TABLE "credit_outbox_events"
  ADD COLUMN IF NOT EXISTS "aggregate_type" VARCHAR(64) NOT NULL DEFAULT 'credit',
  ADD COLUMN IF NOT EXISTS "aggregate_id" VARCHAR(64) NOT NULL DEFAULT '';
