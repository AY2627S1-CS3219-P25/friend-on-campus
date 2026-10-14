# AI Assistance Disclosure:
# Tool: Codex (model: GPT-5), date: 2026-10-13
# Scope: Split dependency installation, TypeScript/Prisma generation, and the compiled Node runtime into separate stages.
# Author review: <to be completed by ngkhengyang>
#
# Tool: Codex (model: GPT-5), date: 2026-10-13
# Scope: Made workspace-scoped dependency installation reproducible with the root lockfile and npm ci.
# Author review: <to be completed by ngkhengyang>
#
# Tool: Codex (model: GPT-5), date: 2026-10-12
# Scope: Restricted dependency installation to the Supplier Service workspace and its local dependencies.
# Author review: <to be completed by ngkhengyang>
#
# Tool: Google Antigravity Agent, date: 2026-09-24
# Scope: Copied seed CSV data into container and updated startup command to deploy Prisma migrations and seed suppliers on boot.
# Author review: (to be completed by author after review)
# AI-generated (edited by ngkhengyang)
FROM node:20-alpine AS build

RUN apk add --no-cache openssl

WORKDIR /app

COPY package.json package-lock.json tsconfig.base.json ./
COPY packages/auth/package.json ./packages/auth/
COPY packages/common-dtos/package.json ./packages/common-dtos/
COPY services/supplier-service/package.json ./services/supplier-service/
COPY services/supplier-service/src/database/prisma ./services/supplier-service/src/database/prisma

RUN npm ci --workspace=@campus-errand/supplier-service --include-workspace-root=false

COPY packages/auth ./packages/auth
COPY packages/common-dtos ./packages/common-dtos
COPY services/supplier-service ./services/supplier-service

RUN npm run db:generate --workspace=@campus-errand/supplier-service \
    && npm run build --workspace=@campus-errand/common-dtos \
    && npm run build --workspace=@campus-errand/auth \
    && npm run build --workspace=@campus-errand/supplier-service

FROM node:20-alpine AS production-deps

WORKDIR /app

COPY package.json package-lock.json ./
COPY packages/auth/package.json ./packages/auth/
COPY packages/common-dtos/package.json ./packages/common-dtos/
COPY services/supplier-service/package.json ./services/supplier-service/

RUN npm ci --omit=dev --omit=optional --ignore-scripts \
    --workspace=@campus-errand/supplier-service \
    --include-workspace-root=false

FROM node:20-alpine AS runtime

RUN apk add --no-cache openssl

WORKDIR /app

COPY --from=production-deps /app/node_modules ./node_modules
COPY --from=build /app/packages/auth/package.json ./packages/auth/package.json
COPY --from=build /app/packages/auth/dist ./packages/auth/dist
COPY --from=build /app/packages/common-dtos/package.json ./packages/common-dtos/package.json
COPY --from=build /app/packages/common-dtos/dist ./packages/common-dtos/dist
COPY --from=build /app/services/supplier-service/package.json ./services/supplier-service/package.json
COPY --from=build /app/services/supplier-service/dist ./services/supplier-service/dist
COPY --from=build /app/services/supplier-service/src/database/generated ./services/supplier-service/dist/database/generated
COPY --from=build /app/services/supplier-service/src/database/prisma ./services/supplier-service/src/database/prisma
COPY data/csv ./data/csv

RUN sed -i 's#"main": "src/index.ts"#"main": "dist/index.js"#' \
    packages/auth/package.json packages/common-dtos/package.json

WORKDIR /app/services/supplier-service

EXPOSE 8002

CMD ["sh", "-c", "/app/node_modules/.bin/prisma migrate deploy --schema src/database/prisma/schema.prisma && node dist/database/seed.js && exec node dist/index.js"]
