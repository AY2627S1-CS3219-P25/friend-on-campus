-- AI Assistance Disclosure:
-- Tool: Codex (model: GPT-6), date: 2026-11-09
-- Scope: Local-only least-privilege monitoring account for the optional overlay.
-- Author review: <to be completed by yanhwee>
-- AI-generated (edited by yanhwee)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'observability') THEN
    CREATE ROLE observability LOGIN PASSWORD 'observability-local-only';
  END IF;
END $$;
GRANT pg_monitor TO observability;
GRANT CONNECT ON DATABASE order_db TO observability;
\connect order_db
GRANT USAGE ON SCHEMA public TO observability;
GRANT SELECT (status, created_at) ON orders TO observability;
