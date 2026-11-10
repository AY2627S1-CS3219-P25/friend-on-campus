-- AI Assistance Disclosure:
-- Tool: Google Antigravity, date: 2026-10-19
-- Scope: Add aggregate_type and aggregate_id columns to credit_outbox_events for Debezium CDC Outbox routing.
-- Author review: I validated correctness, edited for style, and verified with automated tests.

ALTER TABLE "credit_outbox_events"
  ADD COLUMN IF NOT EXISTS "aggregate_type" VARCHAR(64) NOT NULL DEFAULT 'credit',
  ADD COLUMN IF NOT EXISTS "aggregate_id" VARCHAR(64) NOT NULL DEFAULT '';
