FROM node:20-alpine

WORKDIR /app

COPY package.json tsconfig.base.json ./
COPY packages/ packages/
COPY apps/student-app/package.json ./apps/student-app/

RUN npm install

COPY apps/student-app ./apps/student-app

WORKDIR /app/apps/student-app

EXPOSE 5173

CMD ["npm", "run", "dev", "--", "--host"]
