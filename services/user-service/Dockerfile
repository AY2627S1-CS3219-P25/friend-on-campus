# AI Assistance Disclosure:
# Tool: Codex (model: GPT-6, GPT-5, GPT-5.6 Terra); Google Antigravity; Google Antigravity Agent, date: 2026-09-23 to 2026-11-08
# Scope: Implemented the User Service container build with workspace dependencies, Prisma generation, and a production start command; updated across 11 AI-assisted revisions through D4 wrap-up (start only the application; Compose retains local migrations and development seeding).
# Author review: I validated correctness, edited for style, and verified with automated tests.


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

CMD ["node", "dist/index.js"]
