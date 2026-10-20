-- AI Assistance Disclosure:
-- Tool: Codex (model: GPT-6), date: 2026-10-18
-- Scope: Persist reservation saga results atomically with credit mutations.
-- Author review: <to be completed by huangjiaxi1111>
-- AI-generated (edited by huangjiaxi1111)
CREATE TABLE "credit_outbox_events" (
  "id" UUID NOT NULL PRIMARY KEY,
  "event_type" VARCHAR(64) NOT NULL,
  "payload" TEXT NOT NULL,
  "status" VARCHAR(20) NOT NULL DEFAULT 'PENDING',
  "retry_count" INTEGER NOT NULL DEFAULT 0,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX "credit_outbox_status_created_at_idx" ON "credit_outbox_events" ("status", "created_at");
