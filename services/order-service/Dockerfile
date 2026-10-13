# AI Assistance Disclosure:
# Tool: Codex (model: GPT-5), date: 2026-10-13
# Scope: Made workspace-scoped dependency installation reproducible with the root lockfile and npm ci.
# Author review: <to be completed by ngkhengyang>
#
# Tool: Codex (model: GPT-5), date: 2026-10-12
# Scope: Restricted dependency installation to the Order Service workspace and its local dependencies.
# Author review: <to be completed by ngkhengyang>
#
# Tool: Google Antigravity Agent, date: 2026-10-07
# Scope: Configured Dockerfile for Order Service with OpenSSL, Prisma client generation, database migration deployment, and tsx execution.
# Author review: (to be completed by author after review)
FROM node:20-alpine

RUN apk add --no-cache openssl

WORKDIR /app

# AI-generated (edited by ngkhengyang)
COPY package.json package-lock.json tsconfig.base.json ./
COPY packages/ packages/
COPY services/order-service/package.json ./services/order-service/
COPY services/order-service/src/database/prisma ./services/order-service/src/database/prisma

# AI-generated (edited by ngkhengyang)
RUN npm ci --workspace=@campus-errand/order-service --include-workspace-root=false

COPY services/order-service ./services/order-service

WORKDIR /app/services/order-service

RUN npm run db:generate

EXPOSE 8003

CMD ["sh", "-c", "npm run db:deploy && (npm run db:seed || echo >&2 '[order-seed] Automatic startup seed skipped or failed') && exec /app/node_modules/.bin/tsx src/index.ts"]
