-- AI Assistance Disclosure:
-- Tool: Claude Code (model: Claude Fable 5.1), date: 2026-10-05
-- Scope: Added notification_db for the Notification Service.
-- Author review: <to be completed by Reallyeasy1>
--
-- Tool: Google Antigravity Agent, date: 2026-09-24
-- Scope: Refactored PostgreSQL initialization script to provision only logical databases in compliance with Database-per-Service architecture; delegated table schemas and seeds to individual microservice migration lifecycles.
-- Author review: (to be completed by author after review)
-- AI-generated (edited by yanhwee)

-- ==========================================
-- Database-per-Service Multi-Database Init Script
-- CS3219 NUS CampusErrand
-- ==========================================

CREATE DATABASE user_db;
CREATE DATABASE supplier_db;
CREATE DATABASE order_db;
CREATE DATABASE credit_db;
CREATE DATABASE notification_db;
