-- AI Assistance Disclosure:
-- Tool: Codex (model: GPT-6), date: 2026-09-27
-- Scope: Squashed the complete fresh Credit Service schema into one initial migration.
-- Author review: <to be completed by huangjiaxi1111>
-- AI-generated (edited by huangjiaxi1111)
-- Requires an empty credit_db. Earlier migration layouts are not supported by this
-- fresh-start migration and must be replaced by recreating the database.

BEGIN;

CREATE TABLE credit_wallets (
    user_id UUID PRIMARY KEY,
    available_credits INT NOT NULL DEFAULT 100 CHECK (available_credits >= 0),
    escrow_credits INT NOT NULL DEFAULT 0 CHECK (escrow_credits >= 0),
    total_earned_credits INT NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE credit_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    transaction_code VARCHAR(30) UNIQUE NOT NULL,
    from_user_id UUID,
    to_user_id UUID,
    order_id UUID,
    amount INT NOT NULL CHECK (amount > 0),
    transaction_type VARCHAR(30) NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

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
