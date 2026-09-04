FROM node:20-alpine

WORKDIR /app

COPY package.json tsconfig.base.json ./
COPY packages/ packages/
COPY services/credit-service/package.json ./services/credit-service/

RUN npm install

COPY services/credit-service ./services/credit-service

WORKDIR /app/services/credit-service

EXPOSE 8004

CMD ["npx", "tsx", "src/index.ts"]
