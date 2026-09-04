FROM node:20-alpine

WORKDIR /app

COPY package.json tsconfig.base.json ./
COPY packages/ packages/
COPY apps/admin-portal/package.json ./apps/admin-portal/

RUN npm install

COPY apps/admin-portal ./apps/admin-portal

WORKDIR /app/apps/admin-portal

EXPOSE 5174

CMD ["npm", "run", "dev", "--", "--host", "--port", "5174"]
