# AI Assistance Disclosure:
# Tool: Codex (model: GPT-6), date: 2026-09-24
# Scope: Generated Prisma client and deployed Credit Service migrations before startup.
# Author review: <to be completed by huangjiaxi1111>
# AI-generated (edited by huangjiaxi1111)
FROM node:20-alpine

RUN apk add --no-cache openssl

WORKDIR /app

COPY package.json tsconfig.base.json ./
COPY packages/ packages/
COPY services/credit-service/package.json ./services/credit-service/
COPY services/credit-service/src/database/prisma ./services/credit-service/src/database/prisma

RUN npm install

COPY services/credit-service ./services/credit-service

WORKDIR /app/services/credit-service

RUN npm run db:generate

EXPOSE 8004

CMD ["sh", "-c", "npm run db:deploy && exec /app/node_modules/.bin/tsx src/index.ts"]
