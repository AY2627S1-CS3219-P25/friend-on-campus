# AI Assistance Disclosure:
# Tool: Codex (model: GPT-5.6 Terra), date: 2026-09-23
# Scope: Implemented the User Service container build with workspace dependencies, Prisma generation, and a production start command.
# Author review: <to be completed by ngkhengyang>

FROM node:20-alpine

WORKDIR /app

# Copy root configurations and workspace manifests
COPY package.json tsconfig.base.json ./
COPY packages/ packages/
COPY services/user-service/package.json ./services/user-service/
COPY services/user-service/src/database/prisma ./services/user-service/src/database/prisma

# Install dependencies using npm workspace
RUN npm install

# Copy service source code
COPY services/user-service ./services/user-service

WORKDIR /app/services/user-service

RUN npx prisma generate --schema src/database/prisma/schema.prisma

EXPOSE 8001

CMD ["npx", "tsx", "src/index.ts"]
