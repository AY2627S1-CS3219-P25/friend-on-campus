-- AI Assistance Disclosure:
-- Tool: Google Antigravity Agent; Claude Code (model: Claude Fable 5.1); Google Antigravity (model: Claude Opus 4.6), date: 2026-09-24 to 2026-10-21
-- Scope: Refactored PostgreSQL initialization script to provision only logical databases in compliance with Database-per-Service architecture; updated across 5 AI-assisted revisions through D4 wrap-up (removed redundant GRANT ALL PRIVILEGES ON DATABASE, \connect, GRANT ALL ON SCHEMA public, and ALTER DEFAULT PRIVILEGES statements already covered by CREATE..).
-- Author review: I validated correctness, edited for style, and verified with automated tests.

-- ==========================================
-- Database-per-Service Multi-Database Init Script
-- CS3219 NUS CampusErrand
-- ==========================================

CREATE ROLE user_svc WITH LOGIN PASSWORD 'user-service-dev';
CREATE ROLE supplier_svc WITH LOGIN PASSWORD 'supplier-service-dev';
CREATE ROLE order_svc WITH LOGIN PASSWORD 'order-service-dev';
CREATE ROLE credit_svc WITH LOGIN PASSWORD 'credit-service-dev';
CREATE ROLE notification_svc WITH LOGIN PASSWORD 'notification-service-dev';
CREATE ROLE chat_svc WITH LOGIN PASSWORD 'chat-service-dev';

CREATE DATABASE user_db OWNER user_svc;
CREATE DATABASE supplier_db OWNER supplier_svc;
CREATE DATABASE order_db OWNER order_svc;
CREATE DATABASE credit_db OWNER credit_svc;
CREATE DATABASE notification_db OWNER notification_svc;
CREATE DATABASE chat_db OWNER chat_svc;

REVOKE CONNECT ON DATABASE user_db FROM PUBLIC;
REVOKE CONNECT ON DATABASE supplier_db FROM PUBLIC;
REVOKE CONNECT ON DATABASE order_db FROM PUBLIC;
REVOKE CONNECT ON DATABASE credit_db FROM PUBLIC;
REVOKE CONNECT ON DATABASE notification_db FROM PUBLIC;
REVOKE CONNECT ON DATABASE chat_db FROM PUBLIC;
