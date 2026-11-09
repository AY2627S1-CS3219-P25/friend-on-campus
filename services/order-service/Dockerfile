# AI Assistance Disclosure:
# Tool: Codex (model: GPT-6), date: 2026-11-09
# Scope: Upgrade build/runtime stages to approved Node 22 and include the current telemetry SDK workspace.
# Author review: <to be completed by yanhwee>
#
# Tool: Codex (model: GPT-6), date: 2026-11-08
# Scope: Start only the application; Compose retains local migrations and optional sample seeding.
# Author review: <to be completed by the author>
#
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
# Tool: Claude Code (model: Claude Sonnet 5.5), date: 2026-11-05
# Scope: Added the @campus-errand/llm package to the build, dependency and runtime stages.
# Author review: <to be completed by the author>
#
# AI-generated (edited by ngkhengyang)
FROM node:22.23.4-alpine3.23@sha256:2cfe8c19bd3df0192ad5dfd2e13e86567743ffa1eb614e750a706891f19606af AS build

RUN apk add --no-cache openssl

WORKDIR /app

COPY package.json package-lock.json tsconfig.base.json ./
COPY packages/observability/package.json ./packages/observability/
COPY packages/auth/package.json ./packages/auth/
COPY packages/common-dtos/package.json ./packages/common-dtos/
COPY packages/llm/package.json ./packages/llm/
COPY packages/messaging/package.json ./packages/messaging/
COPY services/order-service/package.json ./services/order-service/
COPY services/order-service/prisma ./services/order-service/prisma

RUN npm ci --workspace=@campus-errand/order-service --include-workspace-root=false

COPY packages/observability ./packages/observability
COPY packages/auth ./packages/auth
COPY packages/common-dtos ./packages/common-dtos
COPY packages/llm ./packages/llm
COPY packages/messaging ./packages/messaging
COPY services/order-service ./services/order-service

RUN npm run db:generate --workspace=@campus-errand/order-service \
    && npm run build --workspace=@campus-errand/observability \
    && npm run build --workspace=@campus-errand/common-dtos \
    && npm run build --workspace=@campus-errand/auth \
    && npm run build --workspace=@campus-errand/llm \
    && npm run build --workspace=@campus-errand/messaging \
    && npm run build --workspace=@campus-errand/order-service

FROM node:22.23.4-alpine3.23@sha256:2cfe8c19bd3df0192ad5dfd2e13e86567743ffa1eb614e750a706891f19606af AS production-deps

WORKDIR /app

COPY package.json package-lock.json ./
COPY packages/observability/package.json ./packages/observability/
COPY packages/auth/package.json ./packages/auth/
COPY packages/common-dtos/package.json ./packages/common-dtos/
COPY packages/llm/package.json ./packages/llm/
COPY packages/messaging/package.json ./packages/messaging/
COPY services/order-service/package.json ./services/order-service/

RUN npm ci --omit=dev --omit=optional --ignore-scripts \
    --workspace=@campus-errand/order-service \
    --include-workspace-root=false

RUN mkdir -p /app/packages/observability/node_modules

FROM node:22.23.4-alpine3.23@sha256:2cfe8c19bd3df0192ad5dfd2e13e86567743ffa1eb614e750a706891f19606af AS runtime

RUN apk add --no-cache openssl

WORKDIR /app

COPY --chown=node:node --from=production-deps /app/node_modules ./node_modules
COPY --chown=node:node --from=production-deps /app/packages/observability/node_modules ./packages/observability/node_modules
COPY --chown=node:node --from=build /app/node_modules/@prisma/engines ./node_modules/@prisma/engines
COPY --chown=node:node --from=build /app/packages/observability/package.json ./packages/observability/package.json
COPY --chown=node:node --from=build /app/packages/observability/dist ./packages/observability/dist
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
    packages/observability/package.json packages/auth/package.json packages/common-dtos/package.json packages/llm/package.json packages/messaging/package.json \
    && chown node:node packages/observability/package.json packages/auth/package.json packages/common-dtos/package.json packages/llm/package.json packages/messaging/package.json

RUN node -e 'const fs=require("fs"); const p="packages/observability/package.json"; const j=JSON.parse(fs.readFileSync(p)); j.main="dist/index.js"; j.types="dist/index.d.ts"; j.exports={".":{"types":"./dist/index.d.ts","default":"./dist/index.js"},"./bootstrap":{"types":"./dist/bootstrap.d.ts","default":"./dist/bootstrap.js"}}; fs.writeFileSync(p,JSON.stringify(j));'

WORKDIR /app/services/order-service

EXPOSE 8003

USER node

# AI-generated (edited by ngkhengyang)
CMD ["node", "dist/index.js"]
