FROM node:20-alpine

WORKDIR /app

COPY package.json tsconfig.base.json ./
COPY packages/ packages/
COPY services/order-service/package.json ./services/order-service/

RUN npm install

COPY services/order-service ./services/order-service

WORKDIR /app/services/order-service

EXPOSE 8003

CMD ["npx", "tsx", "src/index.ts"]
