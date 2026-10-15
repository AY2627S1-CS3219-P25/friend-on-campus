# AI Assistance Disclosure:
# Tool: Codex (model: GPT-5), date: 2026-10-15
# Scope: Pinned the Node build and NGINX runtime images to exact Alpine release tags and verified registry digests.
# Author review: <to be completed by ngkhengyang>
#
# Tool: Codex (model: GPT-5), date: 2026-10-14
# Scope: Prepared writable NGINX runtime directories, assigned runtime files to nginx, and run the web server without root privileges.
# Author review: <to be completed by ngkhengyang>
#
# Tool: Codex (model: GPT-5), date: 2026-10-13
# Scope: Build the Vite application in Node and serve only its static output from an NGINX runtime stage.
# Author review: <to be completed by ngkhengyang>
#
# Tool: Codex (model: GPT-5), date: 2026-10-13
# Scope: Made workspace-scoped dependency installation reproducible with the root lockfile and npm ci.
# Author review: <to be completed by ngkhengyang>
# AI-generated (edited by ngkhengyang)
FROM node:20.20.2-alpine3.23@sha256:fb4cd12c85ee03686f6af5362a0b0d56d50c58a04632e6c0fb8363f609372293 AS build

WORKDIR /app

COPY package.json package-lock.json tsconfig.base.json ./
COPY packages/common-dtos/package.json ./packages/common-dtos/
COPY apps/admin-portal/package.json ./apps/admin-portal/

RUN npm ci --workspace=@campus-errand/admin-portal --include-workspace-root=false

COPY packages/common-dtos ./packages/common-dtos
COPY apps/admin-portal ./apps/admin-portal

RUN npm run build --workspace=@campus-errand/admin-portal

FROM nginx:1.31.7-alpine3.24@sha256:42c36dfd0b3503b7966771550a91521262b4750665929821abf5069715610e20 AS runtime

RUN mkdir -p /tmp/nginx/client_temp /tmp/nginx/proxy_temp \
    /tmp/nginx/fastcgi_temp /tmp/nginx/uwsgi_temp /tmp/nginx/scgi_temp \
    && chown -R nginx:nginx /tmp/nginx

COPY --chown=nginx:nginx apps/admin-portal/nginx.conf /etc/nginx/nginx.conf
COPY --chown=nginx:nginx --from=build /app/apps/admin-portal/dist /usr/share/nginx/html/admin

EXPOSE 5174

USER nginx
