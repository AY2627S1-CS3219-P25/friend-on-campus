-- AI Assistance Disclosure:
-- Tool: Google Antigravity Agent, date: 2026-10-07
-- Scope: Initial migration for Order Service creating orders and outbox_events tables with performance and state indexes.
-- Author review: (to be completed by author after review)

-- CreateTable
CREATE TABLE "orders" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "order_code" VARCHAR(20) NOT NULL,
    "requester_id" UUID NOT NULL,
    "courier_id" UUID,
    "supplier_id" UUID NOT NULL,
    "supplier_name" VARCHAR(128),
    "campus_zone" VARCHAR(64),
    "item_description" TEXT NOT NULL,
    "special_notes" TEXT,
    "dropoff_location" VARCHAR(255) NOT NULL,
    "requester_contact_note" VARCHAR(255),
    "courier_contact_note" VARCHAR(255),
    "reward_credits" INTEGER NOT NULL CHECK ("reward_credits" > 0),
    "status" VARCHAR(30) NOT NULL DEFAULT 'OPEN',
    "expires_at" TIMESTAMPTZ(6) NOT NULL,
    "accepted_at" TIMESTAMPTZ(6),
    "picked_up_at" TIMESTAMPTZ(6),
    "delivered_at" TIMESTAMPTZ(6),
    "completed_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "version" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "outbox_events" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "event_type" VARCHAR(64) NOT NULL,
    "payload" TEXT NOT NULL,
    "status" VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    "retry_count" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "outbox_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "orders_order_code_key" ON "orders"("order_code");

-- CreateIndex
CREATE INDEX "orders_status_expires_at_idx" ON "orders"("status", "expires_at");

-- CreateIndex
CREATE INDEX "orders_requester_id_idx" ON "orders"("requester_id");

-- CreateIndex
CREATE INDEX "orders_courier_id_idx" ON "orders"("courier_id");

-- CreateIndex
CREATE INDEX "outbox_events_status_created_at_idx" ON "outbox_events"("status", "created_at");
