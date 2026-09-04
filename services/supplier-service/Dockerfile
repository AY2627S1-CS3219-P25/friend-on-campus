FROM node:20-alpine

WORKDIR /app

COPY package.json tsconfig.base.json ./
COPY packages/ packages/
COPY services/supplier-service/package.json ./services/supplier-service/

RUN npm install

COPY services/supplier-service ./services/supplier-service

WORKDIR /app/services/supplier-service

EXPOSE 8002

CMD ["npx", "tsx", "src/index.ts"]
