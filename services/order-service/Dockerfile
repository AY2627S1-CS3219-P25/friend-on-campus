# AI Assistance Disclosure:
# Tool: Google Antigravity Agent, date: 2026-10-07
# Scope: Configured Dockerfile for Order Service with OpenSSL, Prisma client generation, database migration deployment, and tsx execution.
# Author review: (to be completed by author after review)
FROM node:20-alpine

RUN apk add --no-cache openssl

WORKDIR /app

COPY package.json tsconfig.base.json ./
COPY packages/ packages/
COPY services/order-service/package.json ./services/order-service/
COPY services/order-service/src/database/prisma ./services/order-service/src/database/prisma

RUN npm install

COPY services/order-service ./services/order-service

WORKDIR /app/services/order-service

RUN npm run db:generate

EXPOSE 8003

CMD ["sh", "-c", "npm run db:deploy && (npm run db:seed || echo >&2 '[order-seed] Automatic startup seed skipped or failed') && exec /app/node_modules/.bin/tsx src/index.ts"]
