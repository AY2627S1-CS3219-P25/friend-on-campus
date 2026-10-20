# AI Assistance Disclosure:
# Tool: Claude Code (model: Claude Fable 5.1), date: 2026-10-20
# Scope: Copied from services/notification-service/Dockerfile (main @ a6aff23) with the workspace name and port
# substituted. The build stages, Prisma engine copy, non-root runtime and migrate-then-exec command are the
# Notification Service's (records: Codex GPT-5 2026-10-12 to 2026-10-16, ngkhengyang; Claude Code 2026-10-05, Reallyeasy1).
# Author review: <to be completed by Reallyeasy1>

# AI-generated (edited by ngkhengyang)
FROM node:20.20.2-alpine3.23@sha256:fb4cd12c85ee03686f6af5362a0b0d56d50c58a04632e6c0fb8363f609372293 AS build

RUN apk add --no-cache openssl

WORKDIR /app

COPY package.json package-lock.json tsconfig.base.json ./
COPY packages/auth/package.json ./packages/auth/
COPY packages/common-dtos/package.json ./packages/common-dtos/
COPY services/chat-service/package.json ./services/chat-service/
COPY services/chat-service/prisma ./services/chat-service/prisma

RUN npm ci --workspace=@campus-errand/chat-service --include-workspace-root=false

COPY packages/auth ./packages/auth
COPY packages/common-dtos ./packages/common-dtos
COPY services/chat-service ./services/chat-service

RUN npm run db:generate --workspace=@campus-errand/chat-service \
    && npm run build --workspace=@campus-errand/common-dtos \
    && npm run build --workspace=@campus-errand/auth \
    && npm run build --workspace=@campus-errand/chat-service

FROM node:20.20.2-alpine3.23@sha256:fb4cd12c85ee03686f6af5362a0b0d56d50c58a04632e6c0fb8363f609372293 AS production-deps

WORKDIR /app

COPY package.json package-lock.json ./
COPY packages/auth/package.json ./packages/auth/
COPY packages/common-dtos/package.json ./packages/common-dtos/
COPY services/chat-service/package.json ./services/chat-service/

RUN npm ci --omit=dev --omit=optional --ignore-scripts \
    --workspace=@campus-errand/chat-service \
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
COPY --chown=node:node --from=build /app/services/chat-service/package.json ./services/chat-service/package.json
COPY --chown=node:node --from=build /app/services/chat-service/dist ./services/chat-service/dist
COPY --chown=node:node --from=build /app/services/chat-service/src/generated ./services/chat-service/dist/generated
COPY --chown=node:node --from=build /app/services/chat-service/prisma ./services/chat-service/prisma

RUN sed -i 's#"main": "src/index.ts"#"main": "dist/index.js"#' \
    packages/auth/package.json packages/common-dtos/package.json \
    && chown node:node packages/auth/package.json packages/common-dtos/package.json

WORKDIR /app/services/chat-service

EXPOSE 8006

USER node

CMD ["sh", "-c", "/app/node_modules/.bin/prisma migrate deploy --schema prisma/schema.prisma && exec node dist/index.js"]
