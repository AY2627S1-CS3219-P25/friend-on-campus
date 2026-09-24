-- AI Assistance Disclosure:
-- Tool: Google Antigravity Agent, date: 2026-09-24
-- Scope: Preserved Order Service database schema definitions within service domain boundaries for future database persistence migration.
-- Author review: (to be completed by author after review)
-- AI-generated (edited by yanhwee)

-- ==========================================
-- Order Service Schema (PostgreSQL)
-- Database: order_db
-- ==========================================

CREATE TABLE IF NOT EXISTS orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_code VARCHAR(20) UNIQUE NOT NULL,
    requester_id UUID NOT NULL,
    courier_id UUID,
    supplier_id UUID NOT NULL,
    item_description TEXT NOT NULL,
    special_notes TEXT,
    dropoff_location VARCHAR(255) NOT NULL,
    requester_contact_note VARCHAR(255),
    reward_credits INT NOT NULL CHECK (reward_credits > 0),
    status VARCHAR(30) NOT NULL DEFAULT 'OPEN',
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    accepted_at TIMESTAMP WITH TIME ZONE,
    pickedUp_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    version INT DEFAULT 1
);
