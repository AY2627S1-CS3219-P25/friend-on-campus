# AI Assistance Disclosure:
# Tool: Google Antigravity, date: 2026-10-20
# Scope: Updated runtime Prisma generated client copy path to src/generated -> dist/generated.
# Author review: <to be completed by author after review>
#
# Tool: Codex (model: GPT-5), date: 2026-10-16
# Scope: Copied the build-stage Prisma engines into the production runtime so migrations do not download binaries at startup.
# Author review: <to be completed by ngkhengyang>
#
# Tool: Codex (model: GPT-5), date: 2026-10-15
# Scope: Pinned the Node 20 Alpine base image to an exact release tag and verified registry digest.
# Author review: <to be completed by ngkhengyang>
#
# Tool: Codex (model: GPT-5), date: 2026-10-14
# Scope: Assigned runtime files to the built-in node user and run migrations, seeding, and the service without root privileges.
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
# Scope: Restricted dependency installation to the User Service workspace and its local dependencies.
# Author review: <to be completed by ngkhengyang>
#
# Tool: Codex (model: GPT-5.6 Terra), date: 2026-09-23
# Scope: Implemented the User Service container build with workspace dependencies, Prisma generation, and a production start command.
# Author review: <to be completed by ngkhengyang>
#
# Tool: Google Antigravity Agent, date: 2026-09-24
# Scope: Updated startup command to deploy Prisma migrations and seed development accounts on container boot.
# Author review: (to be completed by author after review)


# AI-generated (edited by ngkhengyang)
FROM node:20.20.2-alpine3.23@sha256:fb4cd12c85ee03686f6af5362a0b0d56d50c58a04632e6c0fb8363f609372293 AS build

RUN apk add --no-cache openssl

WORKDIR /app

COPY package.json package-lock.json tsconfig.base.json ./
COPY packages/auth/package.json ./packages/auth/
COPY packages/common-dtos/package.json ./packages/common-dtos/
COPY services/user-service/package.json ./services/user-service/
COPY services/user-service/prisma ./services/user-service/prisma

RUN npm ci --workspace=@campus-errand/user-service --include-workspace-root=false

COPY packages/auth ./packages/auth
COPY packages/common-dtos ./packages/common-dtos
COPY services/user-service ./services/user-service

RUN npm run db:generate --workspace=@campus-errand/user-service \
    && npm run build --workspace=@campus-errand/common-dtos \
    && npm run build --workspace=@campus-errand/auth \
    && npm run build --workspace=@campus-errand/user-service

FROM node:20.20.2-alpine3.23@sha256:fb4cd12c85ee03686f6af5362a0b0d56d50c58a04632e6c0fb8363f609372293 AS production-deps

WORKDIR /app

COPY package.json package-lock.json ./
COPY packages/auth/package.json ./packages/auth/
COPY packages/common-dtos/package.json ./packages/common-dtos/
COPY services/user-service/package.json ./services/user-service/

RUN npm ci --omit=dev --omit=optional --ignore-scripts \
    --workspace=@campus-errand/user-service \
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
COPY --chown=node:node --from=build /app/services/user-service/package.json ./services/user-service/package.json
COPY --chown=node:node --from=build /app/services/user-service/dist ./services/user-service/dist
COPY --chown=node:node --from=build /app/services/user-service/src/generated ./services/user-service/dist/generated
COPY --chown=node:node --from=build /app/services/user-service/prisma ./services/user-service/prisma

RUN sed -i 's#"main": "src/index.ts"#"main": "dist/index.js"#' \
    packages/auth/package.json packages/common-dtos/package.json \
    && chown node:node packages/auth/package.json packages/common-dtos/package.json

WORKDIR /app/services/user-service

EXPOSE 8001

USER node

CMD ["sh", "-c", "/app/node_modules/.bin/prisma migrate deploy --schema prisma/schema.prisma && node dist/database/seed.js && exec node dist/index.js"]
