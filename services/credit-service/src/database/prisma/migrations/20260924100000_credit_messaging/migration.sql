-- AI Assistance Disclosure:
-- Tool: Codex (model: GPT-6), date: 2026-09-24
-- Scope: Added persistent grants, escrow lifecycle and processed-event identities for a fresh database.
-- Author review: <to be completed by huangjiaxi1111>
-- AI-generated (edited by huangjiaxi1111)
BEGIN;
CREATE TABLE credit_grants (
  user_id UUID PRIMARY KEY,
  amount INT NOT NULL CHECK (amount > 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TABLE credit_escrows (
  order_id UUID PRIMARY KEY,
  requester_id UUID NOT NULL,
  courier_id UUID,
  amount INT NOT NULL CHECK (amount > 0),
  state VARCHAR(16) NOT NULL CHECK (state IN ('RESERVED', 'SETTLED', 'REFUNDED')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK ((state = 'SETTLED') = (courier_id IS NOT NULL))
);
CREATE TABLE processed_credit_events (
  event_id UUID PRIMARY KEY,
  event_type VARCHAR(64) NOT NULL,
  fingerprint VARCHAR(64) NOT NULL,
  processed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
COMMIT;
