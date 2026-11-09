# AI Assistance Disclosure:
# Tool: Codex (model: GPT-6), date: 2026-11-08
# Scope: Build private connection URLs from injected URL-safe passwords.
# Author review: <to be completed by the author>

# AI-generated (edited by ngkhengyang)
export DATABASE_URL="postgresql://$DB_USER:$DB_PASSWORD@$DB_HOST:5432/$DB_NAME?sslmode=require"
if [ -n "${AMQP_HOST:-}" ]; then
    export RABBITMQ_URL="amqp://$AMQP_USER:$AMQP_PASSWORD@$AMQP_HOST:5672/campus"
fi
unset DB_PASSWORD AMQP_PASSWORD

case "${1:-serve}" in
    migrate) exec /app/node_modules/.bin/prisma migrate deploy --schema prisma/schema.prisma ;;
    seed) exec node dist/database/seed.js ;;
esac
