# AI Assistance Disclosure:
# Tool: Codex (model: GPT-6, GPT-5); Google Antigravity; Google Antigravity Agent; Claude Code (model: Claude Sonnet 5.5), date: 2026-10-07 to 2026-11-08
# Scope: Configured Dockerfile for Order Service with OpenSSL, Prisma client generation, database migration deployment, and tsx execution; updated across 10 AI-assisted revisions through D4 wrap-up (start only the application; Compose retains local migrations and optional sample seeding).
# Author review: I validated correctness, edited for style, and verified with automated tests.
#
FROM node:20.20.2-alpine3.23@sha256:fb4cd12c85ee03686f6af5362a0b0d56d50c58a04632e6c0fb8363f609372293 AS build

RUN apk add --no-cache openssl

WORKDIR /app

COPY package.json package-lock.json tsconfig.base.json ./
COPY packages/auth/package.json ./packages/auth/
COPY packages/common-dtos/package.json ./packages/common-dtos/
COPY packages/llm/package.json ./packages/llm/
COPY packages/messaging/package.json ./packages/messaging/
COPY services/order-service/package.json ./services/order-service/
COPY services/order-service/prisma ./services/order-service/prisma

RUN npm ci --workspace=@campus-errand/order-service --include-workspace-root=false

COPY packages/auth ./packages/auth
COPY packages/common-dtos ./packages/common-dtos
COPY packages/llm ./packages/llm
COPY packages/messaging ./packages/messaging
COPY services/order-service ./services/order-service

RUN npm run db:generate --workspace=@campus-errand/order-service \
    && npm run build --workspace=@campus-errand/common-dtos \
    && npm run build --workspace=@campus-errand/auth \
    && npm run build --workspace=@campus-errand/llm \
    && npm run build --workspace=@campus-errand/messaging \
    && npm run build --workspace=@campus-errand/order-service

FROM node:20.20.2-alpine3.23@sha256:fb4cd12c85ee03686f6af5362a0b0d56d50c58a04632e6c0fb8363f609372293 AS production-deps

WORKDIR /app

COPY package.json package-lock.json ./
COPY packages/auth/package.json ./packages/auth/
COPY packages/common-dtos/package.json ./packages/common-dtos/
COPY packages/llm/package.json ./packages/llm/
COPY packages/messaging/package.json ./packages/messaging/
COPY services/order-service/package.json ./services/order-service/

RUN npm ci --omit=dev --omit=optional --ignore-scripts \
    --workspace=@campus-errand/order-service \
    --include-workspace-root=false

FROM node:20.20.2-alpine3.23@sha256:fb4cd12c85ee03686f6af5362a0b0d56d50c58a04632e6c0fb8363f609372293 AS runtime

RUN apk add --no-cache openssl

WORKDIR /app

COPY --chown=node:node --from=production-deps /app/node_modules ./node_modules
COPY --chown=node:node --from=build /app/node_modules/@prisma/engines ./node_modules/@prisma/engines
COPY --chown=node:node --from=build /app/packages/auth/package.json ./packages/auth/package.json
COPY --chown=node:node --from=build /app/packages/auth/dist ./packages/auth/dist
COPY --chown=node:node --from=build /app/packages/common-dtos/package.json ./packages/common-dtos/package.json
COPY --chown=node:node --from=build /app/packages/common-dtos/dist ./packages/common-dtos/dist
COPY --chown=node:node --from=build /app/packages/llm/package.json ./packages/llm/package.json
COPY --chown=node:node --from=build /app/packages/llm/dist ./packages/llm/dist
COPY --chown=node:node --from=build /app/packages/messaging/package.json ./packages/messaging/package.json
COPY --chown=node:node --from=build /app/packages/messaging/dist ./packages/messaging/dist
COPY --chown=node:node --from=build /app/services/order-service/package.json ./services/order-service/package.json
COPY --chown=node:node --from=build /app/services/order-service/dist ./services/order-service/dist
COPY --chown=node:node --from=build /app/services/order-service/src/generated ./services/order-service/dist/generated
COPY --chown=node:node --from=build /app/services/order-service/prisma ./services/order-service/prisma

RUN sed -i 's#"main": "src/index.ts"#"main": "dist/index.js"#' \
    packages/auth/package.json packages/common-dtos/package.json packages/llm/package.json packages/messaging/package.json \
    && chown node:node packages/auth/package.json packages/common-dtos/package.json packages/llm/package.json packages/messaging/package.json

WORKDIR /app/services/order-service

EXPOSE 8003

USER node

CMD ["node", "dist/index.js"]
