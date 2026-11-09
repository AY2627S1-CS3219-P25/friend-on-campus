# AI Assistance Disclosure:
# Tool: Codex (model: GPT-6), date: 2026-11-09
# Scope: Package versioned configuration and the verified Java metrics agent for ECS init/discovery tasks.
# Author review: <to be completed by yanhwee>
# AI-generated (edited by yanhwee)
FROM node:20.20.2-alpine3.23@sha256:fb4cd12c85ee03686f6af5362a0b0d56d50c58a04632e6c0fb8363f609372293
RUN apk add --no-cache aws-cli jq
COPY docker/observability /bundle
RUN echo '7d61f737fd661610ccc14aea79764faa1ea94a340cbc8f0029b3d2edea3d80c1  /bundle/vendor/jmx-agent.jar' | sha256sum -c -
ENTRYPOINT ["node", "/bundle/cloud/render.mjs"]
