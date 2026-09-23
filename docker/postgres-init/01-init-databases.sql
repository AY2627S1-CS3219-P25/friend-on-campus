-- AI Assistance Disclosure:
-- Tool: Codex (model: GPT-5.6 Terra), date: 2026-09-23
-- Scope: Restored user_db and the author-approved User Service schema to the shared PostgreSQL initialization script; synchronized the session foreign key's update action with the Prisma migration.
-- Author review: <to be completed by ngkhengyang>
-- AI-generated (edited by ngkhengyang)

-- ==========================================
-- Database-per-Service Multi-Database Init Script
-- CS3219 NUS CampusErrand
-- ==========================================

CREATE DATABASE user_db;
CREATE DATABASE supplier_db;
CREATE DATABASE order_db;
CREATE DATABASE credit_db;

-- Connect to user_db and create schema
\c user_db;

CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username VARCHAR(50) NOT NULL,
    email VARCHAR(320) NOT NULL,
    password_hash TEXT NOT NULL,
    role VARCHAR(20) NOT NULL DEFAULT 'STUDENT' CHECK (role IN ('STUDENT', 'ADMIN')),
    status BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),

    CHECK (BTRIM(username) <> ''),
    CHECK (BTRIM(email) <> '')
);

CREATE UNIQUE INDEX IF NOT EXISTS users_username_case_insensitive_uq
    ON users (LOWER(username));
CREATE UNIQUE INDEX IF NOT EXISTS users_email_case_insensitive_uq
    ON users (LOWER(email));

CREATE TABLE IF NOT EXISTS sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE ON UPDATE CASCADE,
    refresh_token_hash TEXT NOT NULL UNIQUE,
    persistent BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    last_used_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    idle_expires_at TIMESTAMP WITH TIME ZONE NOT NULL
);

CREATE INDEX IF NOT EXISTS sessions_user_expiry_idx
    ON sessions (user_id, idle_expires_at);

-- Connect to supplier_db and create schema & seeds
\c supplier_db;

CREATE TABLE IF NOT EXISTS suppliers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    supplier_code VARCHAR(20) UNIQUE NOT NULL,
    name VARCHAR(150) NOT NULL,
    campus_zone VARCHAR(50) NOT NULL,
    exact_location VARCHAR(255) NOT NULL,
    category VARCHAR(50) NOT NULL,
    description TEXT,
    building VARCHAR(100),
    floor VARCHAR(20),
    latitude DOUBLE PRECISION,
    longitude DOUBLE PRECISION,
    starting_time VARCHAR(20),
    closing_time VARCHAR(20),
    image_url TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

INSERT INTO suppliers (supplier_code, name, campus_zone, exact_location, category, description, building, floor, latitude, longitude, starting_time, closing_time) VALUES
('SUP-001', 'CoffeeBean @ COM3', 'COM3', 'COM3 Level 1 Lobby', 'Beverages', 'Specialty coffee, pastries, and sandwiches', 'COM3', '1', 1.2949, 103.7740, '0800hrs', '2000hrs'),
('SUP-002', 'Printers @ PCCommons', 'UTown', 'Stephen Riady Centre Level 1', 'Printing', 'NUS fast printing & lecture note pickup hub', 'Stephen Riady Centre', '1', 1.3045, 103.7732, '0000hrs', '2359hrs'),
('SUP-003', 'PGP Mailroom & Smart Lockers', 'PGPR', 'Prince George''s Park Residences Foyer', 'Parcels', 'Courier parcel lockers and delivery collection point', 'Prince George''s Park Residences', '1', 1.2908, 103.7771, '0000hrs', '2359hrs'),
('SUP-004', 'Fine Food Canteen (UTown)', 'UTown', 'Town Plaza Level 1', 'Food', 'Mala Xiang Guo, Chicken Rice, and Drinks', 'Town Plaza', '1', 1.3040, 103.7725, '0730hrs', '2100hrs'),
('SUP-005', 'The Deck @ FASS', 'FASS', 'Faculty of Arts & Social Sciences Level 2', 'Food', 'Yong Tau Foo and Japanese Bento', 'FASS', '2', 1.2968, 103.7720, '0800hrs', '1930hrs')
ON CONFLICT (supplier_code) DO NOTHING;

-- Connect to order_db and create schema
\c order_db;

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

-- Connect to credit_db and create schema
\c credit_db;

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
