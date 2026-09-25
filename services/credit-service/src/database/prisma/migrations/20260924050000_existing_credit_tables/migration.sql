-- AI Assistance Disclosure:
-- Tool: Codex (model: GPT-5), date: 2026-09-25
-- Scope: Copied the initial schema and clarified empty-database or verified-baseline deployment.
-- Author review: <to be completed by huangjiaxi1111>
-- AI-generated (edited by huangjiaxi1111)
-- Requires an empty credit_db, or a verified baseline recorded with:
-- prisma migrate resolve --schema src/database/prisma/schema.prisma --applied 20260924050000_existing_credit_tables
-- IF NOT EXISTS does not bypass Prisma P3005 for a non-empty, unbaselined database.

CREATE TABLE IF NOT EXISTS credit_wallets (
    user_id UUID PRIMARY KEY,
    available_credits INT NOT NULL DEFAULT 100 CHECK (available_credits >= 0),
    escrow_credits INT NOT NULL DEFAULT 0 CHECK (escrow_credits >= 0),
    total_earned_credits INT NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS credit_transactions (
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
