FROM node:20-alpine

WORKDIR /app

COPY package.json tsconfig.base.json ./
COPY packages/ packages/
COPY services/notification-service/package.json ./services/notification-service/

RUN npm install

COPY services/notification-service ./services/notification-service

WORKDIR /app/services/notification-service

EXPOSE 8005

CMD ["npx", "tsx", "src/index.ts"]
