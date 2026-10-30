-- AI Assistance Disclosure:
-- Tool: Claude Code (model: Claude Fable 5.1), date: 2026-10-22
-- Scope: Hand-written migration for the author's Notification Redesign (§7, §11 increment 2): additive columns on
-- notifications with a backfill of the legacy F5 rows, processed_notification_events seeded from existing rows with
-- outcome 'legacy' and no fabricated fingerprint, order_notification_state, recipient-scoped uniqueness replacing the
-- global event_id key, and the stored_at inbox index. Existing ids, read_at and created_at are untouched.
-- Author review: <to be completed by Reallyeasy1>
-- AI-generated (edited by Reallyeasy1)

-- 1. Additive columns (nullable first so the backfill can run)
ALTER TABLE "notifications"
  ADD COLUMN "producer" TEXT NOT NULL DEFAULT 'order-service',
  ADD COLUMN "category" TEXT,
  ADD COLUMN "priority" TEXT,
  ADD COLUMN "action_type" TEXT,
  ADD COLUMN "target_id" UUID,
  ADD COLUMN "source_version" INTEGER,
  ADD COLUMN "stored_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- 2. Backfill the legacy F5 rows: delivered rows were the only action, the rest were progress updates
UPDATE "notifications"
SET "stored_at" = "created_at",
    "target_id" = "order_id",
    "category" = CASE WHEN "kind" = 'ORDER_DELIVERED' THEN 'ACTION' ELSE 'PROGRESS' END,
    "priority" = CASE WHEN "kind" = 'ORDER_DELIVERED' THEN 'HIGH' ELSE 'NORMAL' END,
    "action_type" = CASE WHEN "kind" = 'ORDER_DELIVERED' THEN 'REVIEW_DELIVERY' ELSE 'VIEW_ERRAND' END;

ALTER TABLE "notifications"
  ALTER COLUMN "category" SET NOT NULL,
  ALTER COLUMN "priority" SET NOT NULL;

-- 3. Processed events (dedup key and payload fingerprint)
CREATE TABLE "processed_notification_events" (
    "producer" TEXT NOT NULL,
    "event_id" UUID NOT NULL,
    "fingerprint" TEXT,
    "schema_version" INTEGER NOT NULL,
    "policy_version" INTEGER NOT NULL,
    "outcome" TEXT NOT NULL,
    "processed_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "processed_notification_events_pkey" PRIMARY KEY ("producer","event_id")
);

-- Legacy rows: known processed, fingerprint unknown (never fabricated)
INSERT INTO "processed_notification_events" ("producer", "event_id", "fingerprint", "schema_version", "policy_version", "outcome", "processed_at")
SELECT DISTINCT ON ("producer", "event_id") "producer", "event_id", NULL, 1, 1, 'legacy', "created_at"
FROM "notifications"
ORDER BY "producer", "event_id", "created_at";

-- 4. Attention projection
CREATE TABLE "order_notification_state" (
    "order_id" UUID NOT NULL,
    "highest_order_version" INTEGER NOT NULL,
    "status" TEXT NOT NULL,
    "requester_id" UUID NOT NULL,
    "courier_id" UUID,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "order_notification_state_pkey" PRIMARY KEY ("order_id")
);

-- 5. Recipient-scoped uniqueness replaces the global event_id key, inbox index by arrival
CREATE UNIQUE INDEX "notifications_producer_event_id_user_id_kind_key" ON "notifications"("producer", "event_id", "user_id", "kind");

DROP INDEX "notifications_event_id_key";

CREATE INDEX "notifications_user_id_stored_at_id_idx" ON "notifications"("user_id", "stored_at" DESC, "id" DESC);

CREATE INDEX "notifications_user_id_read_at_idx" ON "notifications"("user_id", "read_at");

DROP INDEX "notifications_user_id_created_at_idx";
