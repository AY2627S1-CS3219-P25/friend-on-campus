# AI Assistance Disclosure:
# Tool: Codex (model: GPT-5), date: 2026-10-13
# Scope: Build the Vite application in Node and serve only its static output from an NGINX runtime stage.
# Author review: <to be completed by ngkhengyang>
#
# Tool: Codex (model: GPT-5), date: 2026-10-13
# Scope: Made workspace-scoped dependency installation reproducible with the root lockfile and npm ci.
# Author review: <to be completed by ngkhengyang>
# AI-generated (edited by ngkhengyang)
FROM node:20-alpine AS build

WORKDIR /app

COPY package.json package-lock.json tsconfig.base.json ./
COPY packages/common-dtos/package.json ./packages/common-dtos/
COPY apps/student-app/package.json ./apps/student-app/

RUN npm ci --workspace=@campus-errand/student-app --include-workspace-root=false

COPY packages/common-dtos ./packages/common-dtos
COPY apps/student-app ./apps/student-app

ARG VITE_SHOW_WS_STATUS=true
ENV VITE_SHOW_WS_STATUS=${VITE_SHOW_WS_STATUS}

RUN npm run build --workspace=@campus-errand/student-app

FROM nginx:alpine AS runtime

COPY apps/student-app/nginx.conf /etc/nginx/nginx.conf
COPY --from=build /app/apps/student-app/dist /usr/share/nginx/html

EXPOSE 5173
