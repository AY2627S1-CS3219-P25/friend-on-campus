# AI Assistance Disclosure:
# Tool: Codex (model: GPT-5), date: 2026-10-13
# Scope: Made workspace-scoped dependency installation reproducible with the root lockfile and npm ci.
# Author review: <to be completed by ngkhengyang>
FROM node:20-alpine

WORKDIR /app

# AI-generated (edited by ngkhengyang)
COPY package.json package-lock.json tsconfig.base.json ./
COPY packages/ packages/
COPY apps/student-app/package.json ./apps/student-app/

RUN npm ci --workspace=@campus-errand/student-app --include-workspace-root=false

COPY apps/student-app ./apps/student-app

WORKDIR /app/apps/student-app

EXPOSE 5173

CMD ["npm", "run", "dev", "--", "--host"]
