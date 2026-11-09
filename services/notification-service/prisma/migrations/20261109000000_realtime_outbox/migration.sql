-- AI Assistance Disclosure:
-- Tool: Claude Code (model: Claude Fable 5.1), date: 2026-11-09
-- Scope: Transactional realtime outbox (issue #241): a delivery intent committed with the business row, leased by the
--        relay running in each replica and deleted once RabbitMQ confirmed the publication.
-- Author review: <to be completed by Reallyeasy1>

CREATE TABLE "notification_realtime_outbox" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "event_id" UUID NOT NULL,
    "kind" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
    "available_at" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
    "lease_owner" TEXT,
    "lease_expires_at" TIMESTAMPTZ(6),

    CONSTRAINT "notification_realtime_outbox_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "notification_realtime_outbox_event_id_key" ON "notification_realtime_outbox"("event_id");

-- The relay scans due rows oldest first.
CREATE INDEX "notification_realtime_outbox_available_at_created_at_idx" ON "notification_realtime_outbox"("available_at", "created_at");
