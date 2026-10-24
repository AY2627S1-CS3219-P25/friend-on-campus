<!--
AI Assistance Disclosure:
Tool: Codex (model: GPT-6), date: 2026-10-25
Scope: Source-linked implementation documentation and evidence review requested by Reallyeasy1.
Author review: <to be completed by Reallyeasy1>
-->

# Notification Service implementation

Implementation baseline: [`52d791e`](https://github.com/AY2627S1-CS3219-P25/friend-on-campus/commit/52d791e4eea28ce7d817f025ef096f8d96bda467); inspected 2026-10-25 (SGT). Pending work is explicitly labelled.

Notification Service persists requester-facing F5 alerts and serves authenticated REST/WebSocket clients. It consumes committed Order events; it does not decide order state, reserve credits or mutate another service's database. The baseline is the three-kind implementation, not unmerged PR #184's recipient-aware inbox.

## Composition

`index.ts` builds the Prisma store, socket hub/authenticator and Express app, attaches WebSocketServer to the same HTTP server, listens, then starts the broker consumer. Public-key validation can fail before listening. Prisma connects lazily. A broker fatal callback logs and exits; Compose restarts the service.

| Module | Responsibility |
|---|---|
| config.ts | Environment/defaults and retry integer validation |
| database/client.ts | Service-specific Prisma client facade |
| app.ts | HTTP app, auth wiring, health/readiness and route mounting |
| notifications/events.ts | Seven subscriptions, parser, three mappings, store-before-push handler, failure classifier |
| notifications/store.ts | Raw SQL insert/dedup, list/count, read operations and ping |
| notifications/routes.ts | Authenticated caller-scoped REST and HTTP envelopes |
| ws/hub.ts | First-frame authentication, user/socket sets, expiry/heartbeat and push |

## Configuration

| Variable | Default/behavior |
|---|---|
| PORT / NOTIFICATION_SERVICE_PORT | 8005 |
| DATABASE_URL / NOTIFICATION_DATABASE_URL | Direct URL takes priority; safe configuration reference is .env.example |
| JWT_PUBLIC_KEY / JWT_ISSUER / JWT_AUDIENCE | Verification key and common issuer/audience |
| RABBITMQ_URL | Broker connection; credentials omitted here |
| NOTIFICATION_EXCHANGE | campus.events |
| NOTIFICATION_QUEUE | notification-service.events |
| NOTIFICATION_DLX / NOTIFICATION_DLQ | queue name + .dlx / .dlq |
| NOTIFICATION_RETRY_DELAY_MS | 2000, minimum 1 |
| NOTIFICATION_RETRY_LIMIT | 30, minimum 0; broker delivery-count threshold |

There is no retry queue/exchange configuration and no seed script. Container startup applies Prisma migrations before Node. `/health` reports UP, activeWsClients and rabbitmq status; `/ready` needs consumer readiness and SELECT 1. Startup installs no signal handler, so implemented hub/consumer close methods are not wired to graceful process termination.

Read [contracts/data](contracts-and-data.md), [implementation](implementation.md), [reliability/testing](reliability-and-testing.md), and the [structure review](structure-review.md). PR #184 behavior, migration compatibility and review findings are isolated in [its audit](../../audits/pr-184-review.md).

## Source evidence and related reading

- [`services/notification-service/src/index.ts`](../../../services/notification-service/src/index.ts)
- [`services/notification-service/src/app.ts`](../../../services/notification-service/src/app.ts)
- [`services/notification-service/src/config.ts`](../../../services/notification-service/src/config.ts)
- [`services/notification-service/src/database/client.ts`](../../../services/notification-service/src/database/client.ts)
- [`services/notification-service/package.json`](../../../services/notification-service/package.json)
- [`services/notification-service/Dockerfile`](../../../services/notification-service/Dockerfile)
- [Wiki: Notification Service](https://github.com/AY2627S1-CS3219-P25/friend-on-campus/wiki/Notification-Service)
- [Documentation index](../../README.md) · [Drift register](../../audits/documentation-drift.md) · [Verification record](../../audits/review-findings.md)
