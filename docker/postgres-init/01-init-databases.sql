-- AI Assistance Disclosure:
-- Tool: Google Antigravity Agent, date: 2026-10-21
-- Scope: Removed redundant GRANT ALL PRIVILEGES ON DATABASE, \connect, GRANT ALL ON SCHEMA public, and ALTER DEFAULT PRIVILEGES statements already covered by CREATE DATABASE ... OWNER on PostgreSQL 16.
-- Author review: <to be completed by yanhwee>
--
-- Tool: Google Antigravity (model: Claude Opus 4.6), date: 2026-10-19
-- Scope: Provisioned dedicated least-privilege PostgreSQL roles per microservice (user_svc, supplier_svc, order_svc, credit_svc, notification_svc) and revoked PUBLIC cross-database CONNECT privileges to enforce Database-per-Service isolation.
-- Author review: Validated by Yee Yan Hwee (yanhwee)
--
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

CREATE ROLE user_svc WITH LOGIN PASSWORD 'user-service-dev';
CREATE ROLE supplier_svc WITH LOGIN PASSWORD 'supplier-service-dev';
CREATE ROLE order_svc WITH LOGIN PASSWORD 'order-service-dev';
CREATE ROLE credit_svc WITH LOGIN PASSWORD 'credit-service-dev';
CREATE ROLE notification_svc WITH LOGIN PASSWORD 'notification-service-dev';

CREATE DATABASE user_db OWNER user_svc;
CREATE DATABASE supplier_db OWNER supplier_svc;
CREATE DATABASE order_db OWNER order_svc;
CREATE DATABASE credit_db OWNER credit_svc;
CREATE DATABASE notification_db OWNER notification_svc;

REVOKE CONNECT ON DATABASE user_db FROM PUBLIC;
REVOKE CONNECT ON DATABASE supplier_db FROM PUBLIC;
REVOKE CONNECT ON DATABASE order_db FROM PUBLIC;
REVOKE CONNECT ON DATABASE credit_db FROM PUBLIC;
REVOKE CONNECT ON DATABASE notification_db FROM PUBLIC;
