# AI Assistance Disclosure:
# Tool: Codex (model: GPT-6, GPT-5); Google Antigravity; Google Antigravity Agent, date: 2026-09-24 to 2026-11-08
# Scope: Copied seed CSV data into container and updated startup command to deploy Prisma migrations and seed suppliers on boot; updated across 9 AI-assisted revisions through D4 wrap-up (start only the application; Compose retains local migrations and development seeding).
# Author review: I validated correctness, edited for style, and verified with automated tests.
FROM node:20.20.2-alpine3.23@sha256:fb4cd12c85ee03686f6af5362a0b0d56d50c58a04632e6c0fb8363f609372293 AS build

RUN apk add --no-cache openssl

WORKDIR /app

COPY package.json package-lock.json tsconfig.base.json ./
COPY packages/auth/package.json ./packages/auth/
COPY packages/common-dtos/package.json ./packages/common-dtos/
COPY services/supplier-service/package.json ./services/supplier-service/
COPY services/supplier-service/prisma ./services/supplier-service/prisma

RUN npm ci --workspace=@campus-errand/supplier-service --include-workspace-root=false

COPY packages/auth ./packages/auth
COPY packages/common-dtos ./packages/common-dtos
COPY services/supplier-service ./services/supplier-service

RUN npm run db:generate --workspace=@campus-errand/supplier-service \
    && npm run build --workspace=@campus-errand/common-dtos \
    && npm run build --workspace=@campus-errand/auth \
    && npm run build --workspace=@campus-errand/supplier-service

FROM node:20.20.2-alpine3.23@sha256:fb4cd12c85ee03686f6af5362a0b0d56d50c58a04632e6c0fb8363f609372293 AS production-deps

WORKDIR /app

COPY package.json package-lock.json ./
COPY packages/auth/package.json ./packages/auth/
COPY packages/common-dtos/package.json ./packages/common-dtos/
COPY services/supplier-service/package.json ./services/supplier-service/

RUN npm ci --omit=dev --omit=optional --ignore-scripts \
    --workspace=@campus-errand/supplier-service \
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
COPY --chown=node:node --from=build /app/services/supplier-service/package.json ./services/supplier-service/package.json
COPY --chown=node:node --from=build /app/services/supplier-service/dist ./services/supplier-service/dist
COPY --chown=node:node --from=build /app/services/supplier-service/src/generated ./services/supplier-service/dist/generated
COPY --chown=node:node --from=build /app/services/supplier-service/prisma ./services/supplier-service/prisma
COPY --chown=node:node data/csv ./data/csv

RUN sed -i 's#"main": "src/index.ts"#"main": "dist/index.js"#' \
    packages/auth/package.json packages/common-dtos/package.json \
    && chown node:node packages/auth/package.json packages/common-dtos/package.json

WORKDIR /app/services/supplier-service

EXPOSE 8002

USER node

CMD ["node", "dist/index.js"]
