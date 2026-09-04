FROM node:20-alpine

WORKDIR /app

# Copy root configurations and workspace manifests
COPY package.json tsconfig.base.json ./
COPY packages/ packages/
COPY services/user-service/package.json ./services/user-service/

# Install dependencies using npm workspace
RUN npm install

# Copy service source code
COPY services/user-service ./services/user-service

WORKDIR /app/services/user-service

EXPOSE 8001

CMD ["npx", "tsx", "src/index.ts"]
