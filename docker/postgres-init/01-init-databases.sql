-- AI Assistance Disclosure:
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

GRANT ALL PRIVILEGES ON DATABASE user_db TO user_svc;
GRANT ALL PRIVILEGES ON DATABASE supplier_db TO supplier_svc;
GRANT ALL PRIVILEGES ON DATABASE order_db TO order_svc;
GRANT ALL PRIVILEGES ON DATABASE credit_db TO credit_svc;
GRANT ALL PRIVILEGES ON DATABASE notification_db TO notification_svc;

\connect user_db
GRANT ALL ON SCHEMA public TO user_svc;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON TABLES TO user_svc;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON SEQUENCES TO user_svc;

\connect supplier_db
GRANT ALL ON SCHEMA public TO supplier_svc;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON TABLES TO supplier_svc;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON SEQUENCES TO supplier_svc;

\connect order_db
GRANT ALL ON SCHEMA public TO order_svc;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON TABLES TO order_svc;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON SEQUENCES TO order_svc;

\connect credit_db
GRANT ALL ON SCHEMA public TO credit_svc;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON TABLES TO credit_svc;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON SEQUENCES TO credit_svc;

\connect notification_db
GRANT ALL ON SCHEMA public TO notification_svc;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON TABLES TO notification_svc;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON SEQUENCES TO notification_svc;
