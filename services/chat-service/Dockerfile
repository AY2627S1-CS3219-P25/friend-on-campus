# AI Assistance Disclosure:
# Tool: Codex (model: GPT-6), date: 2026-11-09
# Scope: Upgrade build/runtime stages to approved Node 22 and include the current telemetry SDK workspace.
# Author review: <to be completed by yanhwee>
#
# Tool: Codex (model: GPT-6), date: 2026-11-08
# Scope: Include the existing messaging workspace and start only the application; Compose retains local migration startup.
# Author review: <to be completed by the author>
#
# Tool: Claude Code (model: Claude Fable 5.1), date: 2026-10-20
# Scope: Copied from services/notification-service/Dockerfile (main @ a6aff23) with the workspace name and port
# substituted. The build stages, Prisma engine copy, non-root runtime and migrate-then-exec command are the
# Notification Service's (records: Codex GPT-5 2026-10-12 to 2026-10-16, ngkhengyang; Claude Code 2026-10-05, Reallyeasy1).
# Author review: <to be completed by Reallyeasy1>
#
# Tool: Claude Code (model: Claude Sonnet 5.5), date: 2026-11-05
# Scope: Added the @campus-errand/llm package to the build, dependency and runtime stages.
# Author review: <to be completed by the author>
#
# Tool: Google Antigravity Agent, date: 2026-11-06
# Scope: Consolidated the @campus-errand/llm disclosure record into the top disclosure block.
# Author review: <to be completed by yanhwee>

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
COPY services/chat-service/package.json ./services/chat-service/
COPY services/chat-service/prisma ./services/chat-service/prisma

RUN npm ci --workspace=@campus-errand/chat-service --include-workspace-root=false

COPY packages/observability ./packages/observability
COPY packages/auth ./packages/auth
COPY packages/common-dtos ./packages/common-dtos
COPY packages/llm ./packages/llm
COPY packages/messaging ./packages/messaging
COPY services/chat-service ./services/chat-service

RUN npm run db:generate --workspace=@campus-errand/chat-service \
    && npm run build --workspace=@campus-errand/observability \
    && npm run build --workspace=@campus-errand/common-dtos \
    && npm run build --workspace=@campus-errand/auth \
    && npm run build --workspace=@campus-errand/llm \
    && npm run build --workspace=@campus-errand/messaging \
    && npm run build --workspace=@campus-errand/chat-service

FROM node:22.23.4-alpine3.23@sha256:2cfe8c19bd3df0192ad5dfd2e13e86567743ffa1eb614e750a706891f19606af AS production-deps

WORKDIR /app

COPY package.json package-lock.json ./
COPY packages/observability/package.json ./packages/observability/
COPY packages/auth/package.json ./packages/auth/
COPY packages/common-dtos/package.json ./packages/common-dtos/
COPY packages/llm/package.json ./packages/llm/
COPY packages/messaging/package.json ./packages/messaging/
COPY services/chat-service/package.json ./services/chat-service/

RUN npm ci --omit=dev --omit=optional --ignore-scripts \
    --workspace=@campus-errand/chat-service \
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
COPY --chown=node:node --from=build /app/services/chat-service/package.json ./services/chat-service/package.json
COPY --chown=node:node --from=build /app/services/chat-service/dist ./services/chat-service/dist
COPY --chown=node:node --from=build /app/services/chat-service/src/generated ./services/chat-service/dist/generated
COPY --chown=node:node --from=build /app/services/chat-service/prisma ./services/chat-service/prisma

RUN sed -i 's#"main": "src/index.ts"#"main": "dist/index.js"#' \
    packages/observability/package.json packages/auth/package.json packages/common-dtos/package.json packages/llm/package.json packages/messaging/package.json \
    && chown node:node packages/observability/package.json packages/auth/package.json packages/common-dtos/package.json packages/llm/package.json packages/messaging/package.json

RUN node -e 'const fs=require("fs"); const p="packages/observability/package.json"; const j=JSON.parse(fs.readFileSync(p)); j.main="dist/index.js"; j.types="dist/index.d.ts"; j.exports={".":{"types":"./dist/index.d.ts","default":"./dist/index.js"},"./bootstrap":{"types":"./dist/bootstrap.d.ts","default":"./dist/bootstrap.js"}}; fs.writeFileSync(p,JSON.stringify(j));'

WORKDIR /app/services/chat-service

EXPOSE 8006

USER node

# AI-generated (edited by ngkhengyang)
CMD ["node", "dist/index.js"]
