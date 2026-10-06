# AI Assistance Disclosure:
# Tool: Claude Code (model: Claude Fable 5.1), date: 2026-10-05
# Scope: Same build steps as credit-service: the Prisma schema is copied before npm install, the client is generated in
# the image, and the container applies migrations before starting.
# Author review: <to be completed by Reallyeasy1>

FROM node:20-alpine

RUN apk add --no-cache openssl

WORKDIR /app

COPY package.json tsconfig.base.json ./
COPY packages/ packages/
COPY services/notification-service/package.json ./services/notification-service/
COPY services/notification-service/src/database/prisma ./services/notification-service/src/database/prisma

RUN npm install

COPY services/notification-service ./services/notification-service

WORKDIR /app/services/notification-service

RUN npm run db:generate

EXPOSE 8005

CMD ["sh", "-c", "npm run db:deploy && exec /app/node_modules/.bin/tsx src/index.ts"]
