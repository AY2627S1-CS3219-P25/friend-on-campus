# AI Assistance Disclosure:
# Tool: Codex (model: GPT-5), date: 2026-10-16
# Scope: Copied the build-stage Prisma engines into the production runtime so migrations do not download binaries at startup.
# Author review: <to be completed by ngkhengyang>
#
# Tool: Codex (model: GPT-5), date: 2026-10-15
# Scope: Pinned the Node 20 Alpine base image to an exact release tag and verified registry digest.
# Author review: <to be completed by ngkhengyang>
#
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
# Scope: Restricted dependency installation to the Credit Service workspace and its local dependencies.
# Author review: <to be completed by ngkhengyang>
#
# Tool: Codex (model: GPT-6), date: 2026-10-03
# Scope: Initialize matching development credit wallets after migrations and before serving.
# Author review: <to be completed by huangjiaxi1111>
#
# Tool: Codex (model: GPT-6), date: 2026-09-24
# Scope: Generated Prisma client and deployed Credit Service migrations before startup.
# Author review: <to be completed by huangjiaxi1111>
# AI-generated (edited by ngkhengyang)
FROM node:20.20.2-alpine3.23@sha256:fb4cd12c85ee03686f6af5362a0b0d56d50c58a04632e6c0fb8363f609372293 AS build

RUN apk add --no-cache openssl

WORKDIR /app

COPY package.json package-lock.json tsconfig.base.json ./
COPY packages/auth/package.json ./packages/auth/
COPY packages/common-dtos/package.json ./packages/common-dtos/
COPY services/credit-service/package.json ./services/credit-service/
COPY services/credit-service/src/database/prisma ./services/credit-service/src/database/prisma

RUN npm ci --workspace=@campus-errand/credit-service --include-workspace-root=false

COPY packages/auth ./packages/auth
COPY packages/common-dtos ./packages/common-dtos
COPY services/credit-service ./services/credit-service

RUN npm run db:generate --workspace=@campus-errand/credit-service \
    && npm run build --workspace=@campus-errand/common-dtos \
    && npm run build --workspace=@campus-errand/auth \
    && npm run build --workspace=@campus-errand/credit-service

FROM node:20.20.2-alpine3.23@sha256:fb4cd12c85ee03686f6af5362a0b0d56d50c58a04632e6c0fb8363f609372293 AS production-deps

WORKDIR /app

COPY package.json package-lock.json ./
COPY packages/auth/package.json ./packages/auth/
COPY packages/common-dtos/package.json ./packages/common-dtos/
COPY services/credit-service/package.json ./services/credit-service/

RUN npm ci --omit=dev --omit=optional --ignore-scripts \
    --workspace=@campus-errand/credit-service \
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
COPY --chown=node:node --from=build /app/services/credit-service/package.json ./services/credit-service/package.json
COPY --chown=node:node --from=build /app/services/credit-service/dist ./services/credit-service/dist
COPY --chown=node:node --from=build /app/services/credit-service/src/database/generated ./services/credit-service/dist/database/generated
COPY --chown=node:node --from=build /app/services/credit-service/src/database/prisma ./services/credit-service/src/database/prisma

RUN sed -i 's#"main": "src/index.ts"#"main": "dist/index.js"#' \
    packages/auth/package.json packages/common-dtos/package.json \
    && chown node:node packages/auth/package.json packages/common-dtos/package.json

WORKDIR /app/services/credit-service

EXPOSE 8004

USER node

CMD ["sh", "-c", "/app/node_modules/.bin/prisma migrate deploy --schema src/database/prisma/schema.prisma && (node dist/database/seed.js || echo >&2 '[credit-seed] Automatic startup seed failed; continuing without development wallet seeding') && exec node dist/index.js"]
