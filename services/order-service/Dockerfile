# AI Assistance Disclosure:
# Tool: Codex (model: GPT-5), date: 2026-10-14
# Scope: Assigned runtime files to the built-in node user and run migrations, optional seeding, and the service without root privileges.
# Author review: <to be completed by ngkhengyang>
#
# Tool: Codex (model: GPT-5), date: 2026-10-13
# Scope: Split dependency installation, TypeScript/Prisma generation, and the compiled Node runtime into separate stages.
# Author review: <to be completed by ngkhengyang>
#
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
# AI-generated (edited by ngkhengyang)
FROM node:20-alpine AS build

RUN apk add --no-cache openssl

WORKDIR /app

COPY package.json package-lock.json tsconfig.base.json ./
COPY packages/auth/package.json ./packages/auth/
COPY packages/common-dtos/package.json ./packages/common-dtos/
COPY services/order-service/package.json ./services/order-service/
COPY services/order-service/src/database/prisma ./services/order-service/src/database/prisma

RUN npm ci --workspace=@campus-errand/order-service --include-workspace-root=false

COPY packages/auth ./packages/auth
COPY packages/common-dtos ./packages/common-dtos
COPY services/order-service ./services/order-service

RUN npm run db:generate --workspace=@campus-errand/order-service \
    && npm run build --workspace=@campus-errand/common-dtos \
    && npm run build --workspace=@campus-errand/auth \
    && npm run build --workspace=@campus-errand/order-service

FROM node:20-alpine AS production-deps

WORKDIR /app

COPY package.json package-lock.json ./
COPY packages/auth/package.json ./packages/auth/
COPY packages/common-dtos/package.json ./packages/common-dtos/
COPY services/order-service/package.json ./services/order-service/

RUN npm ci --omit=dev --omit=optional --ignore-scripts \
    --workspace=@campus-errand/order-service \
    --include-workspace-root=false

FROM node:20-alpine AS runtime

RUN apk add --no-cache openssl

WORKDIR /app

COPY --chown=node:node --from=production-deps /app/node_modules ./node_modules
COPY --chown=node:node --from=build /app/packages/auth/package.json ./packages/auth/package.json
COPY --chown=node:node --from=build /app/packages/auth/dist ./packages/auth/dist
COPY --chown=node:node --from=build /app/packages/common-dtos/package.json ./packages/common-dtos/package.json
COPY --chown=node:node --from=build /app/packages/common-dtos/dist ./packages/common-dtos/dist
COPY --chown=node:node --from=build /app/services/order-service/package.json ./services/order-service/package.json
COPY --chown=node:node --from=build /app/services/order-service/dist ./services/order-service/dist
COPY --chown=node:node --from=build /app/services/order-service/src/database/generated ./services/order-service/dist/database/generated
COPY --chown=node:node --from=build /app/services/order-service/src/database/prisma ./services/order-service/src/database/prisma

RUN sed -i 's#"main": "src/index.ts"#"main": "dist/index.js"#' \
    packages/auth/package.json packages/common-dtos/package.json \
    && chown node:node packages/auth/package.json packages/common-dtos/package.json

WORKDIR /app/services/order-service

EXPOSE 8003

USER node

CMD ["sh", "-c", "/app/node_modules/.bin/prisma migrate deploy --schema src/database/prisma/schema.prisma && (node dist/database/seed.js || echo >&2 '[order-seed] Automatic startup seed skipped or failed') && exec node dist/index.js"]
