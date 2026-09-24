FROM node:20-alpine

WORKDIR /app

COPY package.json tsconfig.base.json ./
COPY packages/ packages/
COPY services/supplier-service/package.json ./services/supplier-service/
COPY services/supplier-service/src/database/prisma ./services/supplier-service/src/database/prisma

RUN npm install

COPY services/supplier-service ./services/supplier-service

WORKDIR /app/services/supplier-service

RUN npx prisma generate --schema src/database/prisma/schema.prisma

EXPOSE 8002

CMD ["npx", "tsx", "src/backend/server.ts"]
