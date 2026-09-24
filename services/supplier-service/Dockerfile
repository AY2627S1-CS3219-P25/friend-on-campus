# AI Assistance Disclosure:
# Tool: Google Antigravity Agent, date: 2026-09-24
# Scope: Copied seed CSV data into container and updated startup command to deploy Prisma migrations and seed suppliers on boot.
# Author review: (to be completed by author after review)
# AI-generated (edited by yanhwee)

FROM node:20-alpine

WORKDIR /app

COPY package.json tsconfig.base.json ./
COPY packages/ packages/
COPY services/supplier-service/package.json ./services/supplier-service/
COPY services/supplier-service/src/database/prisma ./services/supplier-service/src/database/prisma
COPY data/csv ./data/csv

RUN npm install

COPY services/supplier-service ./services/supplier-service

WORKDIR /app/services/supplier-service

RUN npx prisma generate --schema src/database/prisma/schema.prisma

EXPOSE 8002

CMD ["sh", "-c", "npx prisma migrate deploy --schema src/database/prisma/schema.prisma && npx tsx src/database/seed.ts && npx tsx src/backend/server.ts"]
