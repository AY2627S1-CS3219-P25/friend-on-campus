-- AI Assistance Disclosure:
-- Tool: Google Antigravity Agent, date: 2026-09-24
-- Scope: Preserved Credit Service database schema definitions within service domain boundaries for future database persistence migration.
-- Author review: (to be completed by author after review)
-- AI-generated (edited by yanhwee)

-- ==========================================
-- Credit Service Schema (PostgreSQL)
-- Database: credit_db
-- ==========================================

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
