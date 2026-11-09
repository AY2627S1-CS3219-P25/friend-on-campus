<!--
AI Assistance Disclosure:
Tool: Codex (model: GPT-6), date: 2026-11-09
Scope: Reconcile current implementation, contracts, realtime delivery and verification limits; preserve historical records.
Author review: <to be completed by the author>

Tool: Codex (model: GPT-6), date: 2026-10-25
Scope: Source-linked implementation documentation and evidence review requested by Reallyeasy1.
Author review: <to be completed by Reallyeasy1>
-->

# Notification Service

Implementation checked against [`b989758`](https://github.com/AY2627S1-CS3219-P25/friend-on-campus/commit/b989758e766cb593c3b8c94102eb6dfb5c7d8491), 2026-11-09 (SGT). This describes repository behavior, not verified deployment state.

Notification owns the durable, recipient-scoped inbox, read state and live inbox hints. It consumes committed Order and Credit facts. It does not decide errand outcomes, reserve credits or authorize Order commands. The recipient-aware inbox and cross-replica delivery are implemented on `main`; PR #184 and #246 are historical context, not pending setup work.

## Read by task

- [Contracts and data](contracts-and-data.md): REST/socket API, recipient policy and schema.
- [Execution paths](implementation.md): event processing, deduplication, projection and live delivery.
- [Reliability and tests](reliability-and-testing.md): guarantees, recovery, test commands and operational checks.
- [Historical structure review](structure-review.md): the earlier three-alert implementation; not current guidance.

## Code map

| Source | Responsibility |
|---|---|
| [`index.ts`](../../../services/notification-service/src/index.ts), [`app.ts`](../../../services/notification-service/src/app.ts) | HTTP/socket composition, readiness, relay/subscriber startup and bounded shutdown |
| [`config.ts`](../../../services/notification-service/src/config.ts) | Environment configuration and retry validation |
| [`notifications/events.ts`](../../../services/notification-service/src/notifications/events.ts) | Parse nine Order/two Credit routing keys, fingerprint and classify failures |
| [`notifications/policy.ts`](../../../services/notification-service/src/notifications/policy.ts) | Recipient, category, action and wording policy |
| [`notifications/store.ts`](../../../services/notification-service/src/notifications/store.ts) | Atomic event application, inbox/read state, projection and realtime intents |
| [`notifications/routes.ts`](../../../services/notification-service/src/notifications/routes.ts) | Authenticated caller-scoped HTTP operations |
| [`notifications/realtime.ts`](../../../services/notification-service/src/notifications/realtime.ts), [`ws/hub.ts`](../../../services/notification-service/src/ws/hub.ts) | Reread stored state and signal each replica's local sockets |

The student client is [`useNotifications.ts`](../../../apps/student-app/src/notifications/useNotifications.ts), with display/toast policy in [`inbox.ts`](../../../apps/student-app/src/notifications/inbox.ts). Protocol types live in [`common-dtos`](../../../packages/common-dtos/src/index.ts).

## Configuration

Use [`.env.example`](../../../.env.example) and [`config.ts`](../../../services/notification-service/src/config.ts); keep credentials out of reports.

| Variable | Default / role |
|---|---|
| `PORT` / `NOTIFICATION_SERVICE_PORT` | 8005; `PORT` takes priority |
| `DATABASE_URL` / `NOTIFICATION_DATABASE_URL` | Service-owned Notification database; direct URL takes priority |
| `JWT_PUBLIC_KEY`, `JWT_ISSUER`, `JWT_AUDIENCE` | Shared offline token verification |
| `RABBITMQ_URL`, `NOTIFICATION_EXCHANGE`, `NOTIFICATION_QUEUE` | Broker connection; `campus.events`; `notification-service.events` |
| `NOTIFICATION_DLX`, `NOTIFICATION_DLQ` | Default `<queue>.dlx`, `<queue>.dlq` |
| `NOTIFICATION_RETRY_DELAY_MS`, `NOTIFICATION_RETRY_LIMIT` | 2000 ms / 5 for transient business-event failures |
| `RABBITMQ_REALTIME_EXCHANGE` | `notification-service.events.realtime` |

The gateway exposes `/api/notifications` and `/ws/` ([configuration](../../../gateway/nginx.conf)). `/health` reports active sockets and business/realtime connection status. `/ready` also requires a successful database ping and no shutdown in progress. The service rejects new sockets with 1013 while its realtime subscription is unavailable, and closes existing sockets on subscription loss to trigger client recovery.

`SIGINT`, `SIGTERM` and fatal startup/consumer errors enter bounded shutdown: stop readiness, stop accepting work, close relay/subscriber/consumer, drain requests/sockets, then close publisher and Prisma. The hard deadline is 10 seconds. Container startup and migrations are covered by [Docker and deployment](../../infrastructure/docker-and-deployment.md); broker queue handover is covered by [CDC and broker](../../infrastructure/cdc-and-broker.md).
