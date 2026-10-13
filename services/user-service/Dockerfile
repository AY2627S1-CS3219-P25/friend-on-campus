# AI Assistance Disclosure:
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


# AI-generated (edited by yanhwee)

FROM node:20-alpine

WORKDIR /app

# Copy root configurations and workspace manifests
COPY package.json package-lock.json tsconfig.base.json ./
COPY packages/ packages/
COPY services/user-service/package.json ./services/user-service/
COPY services/user-service/src/database/prisma ./services/user-service/src/database/prisma

# Install dependencies using the npm workspace lockfile
RUN npm ci --workspace=@campus-errand/user-service --include-workspace-root=false

# Copy service source code
COPY services/user-service ./services/user-service

WORKDIR /app/services/user-service

RUN npx prisma generate --schema src/database/prisma/schema.prisma

EXPOSE 8001

CMD ["sh", "-c", "npx prisma migrate deploy --schema src/database/prisma/schema.prisma && npx tsx src/database/seed.ts && npx tsx src/index.ts"]
