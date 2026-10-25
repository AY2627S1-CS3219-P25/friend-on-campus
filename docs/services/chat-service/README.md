<!--
AI Assistance Disclosure:
Tool: Claude Code (model: Claude Fable 5.1), date: 2026-10-25
Scope: Source-linked description of the Chat Service as implemented at PR #148 head f39ab1f (not on main), with module map, configuration, known limits and links to the D4 specification. No application change.
Author review: <to be completed by Reallyeasy1>
-->

# Chat Service implementation (PR #148, pending)

Inspected baseline: PR #148 head [`f39ab1f`](https://github.com/AY2627S1-CS3219-P25/friend-on-campus/commit/f39ab1f252414bca5c5ef7d08f3d45b9e16007a0) on branch `feature/chat-service`; `main` at [`9a36146`](https://github.com/AY2627S1-CS3219-P25/friend-on-campus/commit/9a361461de0e8b3e5d237ebaa64f5b8197c97171); wiki revision `a463e3bd77dd0327414543dba62cd2feb9c9c2a9`; inspected 2026-10-25 (SGT). **The Chat Service is not on `main`.** Everything below describes the pending branch; the rest of this reference still documents the five-service `main` baseline.

Chat Service owns one private text conversation per accepted errand (F8, [issue #56](https://github.com/AY2627S1-CS3219-P25/friend-on-campus/issues/56)): a `conversations` row keyed by order id, append-only `messages` with a per-conversation sequence, an authenticated REST history route, a WebSocket hub for live delivery, and a RabbitMQ consumer that projects Order lifecycle events onto the row. It reads the Order Service over HTTP; it never reads another service's database. The remaining D4 work is specified in [the D4 implementation specification](d4-implementation-specification.md); that document is a proposal and does not describe shipped behavior.

## Composition

[`index.ts`](../../../services/chat-service/src/index.ts) builds the Prisma store, the conversation service with the Order client, the Express app and the socket hub on the same HTTP server, listens, then starts the broker consumer; a consumer fatal callback exits the process for a Compose restart. The container applies Prisma migrations before Node ([`Dockerfile`](../../../services/chat-service/Dockerfile), `CMD`).

| Module | Responsibility |
|---|---|
| [`config.ts`](../../../services/chat-service/src/config.ts) | Port 8006, `chat_db`, broker account `chat_service`, queue `chat-service.events` with `.retry`/`.dlx`/`.dlq`, retry 2000 ms x 30 |
| [`database/client.ts`](../../../services/chat-service/src/database/client.ts) | Service-specific Prisma client facade |
| [`app.ts`](../../../services/chat-service/src/app.ts) | `/health`, `/ready` (consumer ready and `SELECT 1`), `/api/chat` mount, JSON/500 error handler |
| [`clients/order.client.ts`](../../../services/chat-service/src/clients/order.client.ts) | `GET /api/orders/:id` with the caller's token, 4 s timeout; keeps `id`, `requesterId`, `courierId`, `status`, `acceptedAt`, `completedAt` (drops `version`) |
| [`conversations/store.ts`](../../../services/chat-service/src/conversations/store.ts) | `upsertAccepted` with the `courierSince` replay guard, set-once lifecycle marks, `append` with the locked participant/closure recheck, paging, ping |
| [`conversations/service.ts`](../../../services/chat-service/src/conversations/service.ts) | `open` (local row, else Order fallback), `send` pre-checks then store verdict, `history`, read/send rules (`canRead`, `canSend`, `OPEN_STATUSES`) |
| [`conversations/events.ts`](../../../services/chat-service/src/conversations/events.ts) | Six `order.*` routing keys, strict parser, projection (`created_or_recouriered`, `picked_up`, `delivered`, `closed`, `ignored`), failure classifier |
| [`messaging/rabbitmq.ts`](../../../services/chat-service/src/messaging/rabbitmq.ts) | Asserts exchange/queues/bindings, prefetch 1, header-counted retry via a confirmed publisher, dead-letter, `isReady` |
| [`chat/routes.ts`](../../../services/chat-service/src/chat/routes.ts) | `GET /api/chat/:orderId` with `afterSequence` (0..2147483647) and `limit` (1..100, default 50) |
| [`ws/hub.ts`](../../../services/chat-service/src/ws/hub.ts) | AUTH-first handshake (5 s), sockets filed by user, close 4401 at token expiry, 30 s ping eviction, `SEND` to `MESSAGE`/`ERROR`, sender echo carries `clientId` |

Student app: [`apps/student-app/src/chat/useChat.ts`](../../../apps/student-app/src/chat/useChat.ts) (socket, paged history, settle-by-`clientId`, reconnect catch-up) and [`ChatPanel.tsx`](../../../apps/student-app/src/chat/ChatPanel.tsx), opened from each accepted-or-later card in [`pages/TasksPage.tsx`](../../../apps/student-app/src/pages/TasksPage.tsx). Shared contract: `ConversationDTO`, `ChatMessageDTO`, `ChatClientFrame`, `ChatServerFrame`, `ChatHistoryResponse` in [`packages/common-dtos/src/index.ts`](../../../packages/common-dtos/src/index.ts).

## Configuration and wiring

| Variable | Default/behavior |
|---|---|
| PORT | 8006 |
| DATABASE_URL / CHAT_DATABASE_URL | Role `chat_svc`, database `chat_db`; safe reference in [`.env.example`](../../../.env.example) |
| ORDER_SERVICE_URL | `http://localhost:8003`; `http://order-service:8003` in Compose |
| JWT_PUBLIC_KEY / JWT_ISSUER / JWT_AUDIENCE | Shared offline verification ([auth package](../../packages/auth.md)) |
| RABBITMQ_URL, CHAT_EXCHANGE, CHAT_QUEUE, CHAT_RETRY_* , CHAT_DLX / CHAT_DLQ | `campus.events`, `chat-service.events` and derived names |
| CHAT_RETRY_DELAY_MS / CHAT_RETRY_LIMIT | 2000 / 30 |

Gateway: `/api/chat`, `/api/chat/` and the `/ws/chat/` upgrade in [`gateway/nginx.conf`](../../../gateway/nginx.conf) (longest-prefix match keeps it apart from Notification's `/ws/`). Compose service `chat-service` with `init: true`, `/ready` healthcheck, and the gateway depending on it ([`docker-compose.yml`](../../../docker-compose.yml)); role and database in [`docker/postgres-init/01-init-databases.sql`](../../../docker/postgres-init/01-init-databases.sql) (fresh volumes only). Broker account and vhost permissions in [`docker/rabbitmq/definitions.json`](../../../docker/rabbitmq/definitions.json); the queue and its six bindings are asserted by the consumer at startup, and no `topic_permissions` entry exists for `chat_service`. CI matrix entries for unit, integration and messaging suites in [`.github/workflows/ci.yml`](../../../.github/workflows/ci.yml); isolated databases in [`scripts/ci/run-all-tests.mjs`](../../../scripts/ci/run-all-tests.mjs); dev target `chat` in [`scripts/dev.mjs`](../../../scripts/dev.mjs).

## Data

Two migrations: [`20261020000000_init`](../../../services/chat-service/prisma/migrations/20261020000000_init/migration.sql) (both tables, unique `order_id`, unique `(conversation_id, sequence)`) and [`20261025000000_courier_since`](../../../services/chat-service/prisma/migrations/20261025000000_courier_since/migration.sql) (`courier_since`, backfilled from `created_at`, then `NOT NULL`). Schema in [`prisma/schema.prisma`](../../../services/chat-service/prisma/schema.prisma). There is no Order version, no persisted client id and no text length limit in the schema.

## Tests

Source-inspected at `f39ab1f`: [`app.test.ts`](../../../services/chat-service/test/app.test.ts), [`events.test.ts`](../../../services/chat-service/test/events.test.ts), [`service.test.ts`](../../../services/chat-service/test/service.test.ts), [`routes.test.ts`](../../../services/chat-service/test/routes.test.ts), [`hub.test.ts`](../../../services/chat-service/test/hub.test.ts) (unit, in-memory store from [`helpers.ts`](../../../services/chat-service/test/helpers.ts)); [`store.integration.test.ts`](../../../services/chat-service/test/store.integration.test.ts) (PostgreSQL, opt-in `CHAT_TEST_DATABASE_URL`); [`messaging.integration.test.ts`](../../../services/chat-service/test/messaging.integration.test.ts) (PostgreSQL and RabbitMQ). Executed results for this document are in the [verification record](../../audits/review-findings.md). There is no browser scenario for Chat in `scripts/uat/`.

## Known limits at this head

- Authorization for an existing row is local: `open`, `history` and `send` call the Order Service only when no row exists ([`service.ts`](../../../services/chat-service/src/conversations/service.ts), `open`). The consumer does not subscribe to `order.unassigned`, which `main` now publishes, so an unassigned courier keeps access until the next `order.accepted`.
- The replay guard is timestamp-based (`courierSince`), not Order-version-based; the backfill sets every pre-existing row's `courier_since` to its `created_at`.
- `clientId` is correlated on the socket only; it is not persisted, so a retry after an uncertain outcome can store a second message.
- History pages are complete only up to the last short page the client fetched; a live frame can advance the displayed sequence past REST coverage.
- Text length, socket payload (`ws` default `maxPayload`), send rate and outgoing buffer are unbounded; shutdown is not graceful (no signal handler).
- Admin reads are allowed (`canRead`), which issue #56 F8.1.2 does not grant; see the decision register in the specification.

## Source evidence and related reading

- [D4 implementation specification (proposal)](d4-implementation-specification.md)
- [Wiki: Chat Service design and reliability plan](https://github.com/AY2627S1-CS3219-P25/friend-on-campus/wiki/Chat-Service-Design-and-Reliability-Plan) (proposal, revision `a463e3b`)
- [Wiki: AWS Deployment and D4 Delivery Plan](https://github.com/AY2627S1-CS3219-P25/friend-on-campus/wiki/AWS-Deployment-and-D4-Delivery-Plan)
- [PR #148](https://github.com/AY2627S1-CS3219-P25/friend-on-campus/pull/148) · [issue #56](https://github.com/AY2627S1-CS3219-P25/friend-on-campus/issues/56)
- [Order Service contracts](../order-service/contracts-and-data.md) · [Shared DTOs](../../packages/common-dtos.md) · [Messaging](../../packages/messaging.md) · [Gateway](../../infrastructure/api-gateway.md)
- [Documentation index](../../README.md) · [Drift register](../../audits/documentation-drift.md) · [Verification record](../../audits/review-findings.md)
