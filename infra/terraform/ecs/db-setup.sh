# AI Assistance Disclosure:
# Tool: Codex (model: GPT-6), date: 2026-11-08
# Scope: Create service databases and grant the CDC role access to the existing outbox tables.
# Author review: <to be completed by the author>

# AI-generated (edited by ngkhengyang)
case "$1" in
  roles)
    for name in user supplier order credit notification chat cdc; do
      export ROLE_PASSWORD="$(printenv "DB_$(printf '%s' "$name" | tr '[:lower:]' '[:upper:]')")"
      role="${name}_svc"
      [ "$name" != cdc ] || role=foc_cdc
      psql -X -v ON_ERROR_STOP=1 -d postgres -v role="$role" -v db="${name}_db" -v name="$name" <<'SQL'
\getenv role_password ROLE_PASSWORD
SELECT format('CREATE ROLE %I LOGIN', :'role') WHERE NOT EXISTS (
  SELECT 1 FROM pg_roles WHERE rolname = :'role'
) \gexec
ALTER ROLE :"role" PASSWORD :'role_password';
SELECT format('GRANT rds_replication TO %I', :'role') WHERE :'name' = 'cdc' \gexec
SELECT format('GRANT %I TO %I', :'role', current_user) WHERE :'name' <> 'cdc' \gexec
SELECT format('CREATE DATABASE %I OWNER %I', :'db', :'role') WHERE :'name' <> 'cdc'
  AND NOT EXISTS (SELECT 1 FROM pg_database WHERE datname = :'db') \gexec
SELECT format('REVOKE CONNECT ON DATABASE %I FROM PUBLIC', :'db') WHERE :'name' <> 'cdc' \gexec
SQL
    done
    ;;
  publications)
    for name in order user credit; do
      table=outbox_events
      [ "$name" != credit ] || table=credit_outbox_events
      psql -X -v ON_ERROR_STOP=1 -d "${name}_db" -v owner="${name}_svc" \
        -v db="${name}_db" -v publication="dbz_${name}_publication" -v outbox="$table" <<'SQL'
SET ROLE :"owner";
GRANT CONNECT ON DATABASE :"db" TO foc_cdc;
GRANT USAGE ON SCHEMA public TO foc_cdc;
GRANT SELECT ON TABLE public.:"outbox" TO foc_cdc;
SELECT format('CREATE PUBLICATION %I FOR TABLE public.%I', :'publication', :'outbox')
  WHERE NOT EXISTS (SELECT 1 FROM pg_publication WHERE pubname = :'publication') \gexec
SQL
    done
    ;;
  *) exit 2 ;;
esac
