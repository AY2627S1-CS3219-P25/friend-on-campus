-- AI Assistance Disclosure:
-- Tool: Claude Code (model: Claude Fable 5.1), date: 2026-10-25
-- Scope: Review fix (PR #148 P1): adds conversations.courier_since, backfilled from created_at for existing rows, so an
-- older or replayed order.accepted cannot restore a former courier.
-- Author review: <to be completed by Reallyeasy1>

-- AlterTable
ALTER TABLE "conversations" ADD COLUMN "courier_since" TIMESTAMPTZ(6);
UPDATE "conversations" SET "courier_since" = "created_at" WHERE "courier_since" IS NULL;
ALTER TABLE "conversations" ALTER COLUMN "courier_since" SET NOT NULL;
