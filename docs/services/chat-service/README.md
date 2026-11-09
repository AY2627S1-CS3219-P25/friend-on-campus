<!--
AI Assistance Disclosure:
Tool: Codex (model: GPT-6), date: 2026-11-09
Scope: Reconcile current implementation, contracts, realtime delivery and verification limits; preserve historical records.
Author review: <to be completed by the author>

Tool: Codex (model: GPT-6), date: 2026-11-08
Scope: Update runtime composition, shared quorum messaging, shutdown behavior and migration guidance for cloud preparation.
Author review: <to be completed by the author>

Tool: Claude Code (model: Claude Fable 5.1), date: 2026-10-25
Scope: Source-linked description of the Chat Service as implemented at PR #148 head f39ab1f (not on main), with module map, configuration, known limits and links to the D4 specification. No application change.
Author review: <to be completed by Reallyeasy1>
-->

# Chat Service

Implementation checked against [`b989758`](https://github.com/AY2627S1-CS3219-P25/friend-on-campus/commit/b989758e766cb593c3b8c94102eb6dfb5c7d8491), 2026-11-09 (SGT). This describes repository behavior, not verified deployment state.

Chat owns one conversation per accepted errand, persisted messages, authenticated history and live delivery. It is part of `main`. Order owns errand state; Chat maintains a local conversation projection and calls Order when opening a conversation that is not yet stored.

Start with [local setup](../../development/local-development.md). For deployment use the [infrastructure documentation](../../new-cloud-architecture-guide.md). The [D4 specification](d4-implementation-specification.md) is a historical proposal, not a current implementation checklist.

## Code map

| Source | Responsibility |
|---|---|
| [`index.ts`](../../../services/chat-service/src/index.ts), [`app.ts`](../../../services/chat-service/src/app.ts) | Compose HTTP, sockets, consumer, realtime subscriber/relay, readiness and shutdown |
| [`conversations/service.ts`](../../../services/chat-service/src/conversations/service.ts), [`clients/order.client.ts`](../../../services/chat-service/src/clients/order.client.ts) | Open/history/send rules and Order fallback |
| [`conversations/store.ts`](../../../services/chat-service/src/conversations/store.ts) | Conversation projection, serialized message appends and delivery intents |
| [`conversations/events.ts`](../../../services/chat-service/src/conversations/events.ts) | Order event parsing and lifecycle projection |
| [`ws/hub.ts`](../../../services/chat-service/src/ws/hub.ts), [`realtime/delivery.ts`](../../../services/chat-service/src/realtime/delivery.ts) | Authenticate sockets; reread committed state and deliver to local participants |
| [`moderation/moderate.ts`](../../../services/chat-service/src/moderation/moderate.ts), [`translation/translate.ts`](../../../services/chat-service/src/translation/translate.ts) | Optional LLM moderation and requested translation |

The student client is [`useChat.ts`](../../../apps/student-app/src/chat/useChat.ts) and [`ChatPanel.tsx`](../../../apps/student-app/src/chat/ChatPanel.tsx). Wire types live in [`common-dtos`](../../../packages/common-dtos/src/index.ts); shared broker mechanics live in [messaging](../../packages/messaging.md).

## API and access

All REST requests require the shared access token. The gateway exposes `/api/chat` and upgrades `/ws/chat/`; see [`gateway/nginx.conf`](../../../gateway/nginx.conf).

| Operation | Current behavior |
|---|---|
| `GET /api/chat/:orderId` | Returns `{conversation,messages}`. UUID order ID; `afterSequence` clamped to 0–2147483647; `limit` clamped to 1–100, default 50. Pages are in ascending sequence order. |
| `POST /api/chat/:orderId/translate` | Takes `language` and up to 200 UUID `messageIds`; returns translations for found messages. It does not change stored originals. |
| Socket `AUTH` | First frame within 5 seconds. Token checks match HTTP; invalid/expired token closes with 4401. Heartbeat every 30 seconds evicts unresponsive sockets. |
| Socket `SEND` | Takes `orderId`, text and optional `clientId`. Successful delivery uses `MESSAGE`; validation, authorization and moderation failures use `ERROR`. Sender tabs receive the correlation ID; peers do not. |

[`routes.ts`](../../../services/chat-service/src/chat/routes.ts) defines validation and response envelopes. Invalid order IDs return 400; missing conversations/orders, forbidden access and unavailable dependencies return 404, 403 and 503 respectively where mapped. Cursor parsing is permissive clamping, not strict numeric validation.

For a stored conversation, reads and translation permit the local requester, courier or an administrator. Sending permits only the local requester/courier and requires an open conversation, nonempty trimmed text and a username claim. The append transaction locks the conversation and checks membership/closure again before writing. This prevents a concurrent **local** membership or closure update from being bypassed.

Order is consulted only when the conversation is absent, with the caller's token and a 4-second timeout. Open Order statuses are `ACCEPTED`, `IN_TRANSIT` and `DELIVERED`. The stored projection consumes `order.accepted`, `order.in_transit`, `order.delivered`, `order.completed`, `order.cancelled` and `order.expired`; terminal events set `closedAt`.

## Persistence and live delivery

The [Prisma schema](../../../services/chat-service/prisma/schema.prisma) and [migrations](../../../services/chat-service/prisma/migrations) define:

| Table | Invariant |
|---|---|
| `conversations` | One row per unique `order_id`; participant IDs, `courier_since` and lifecycle timestamps |
| `messages` | Append-only text, sender identity copied from the token, receive time and unique `(conversation_id, sequence)` |
| `realtime_outbox` | Unique event ID, payload, retry schedule and lease ownership; indexed by availability/creation time |

A message and its realtime intent commit together. Relays in all Chat replicas claim intents, publish to `chat-service.events.realtime`, then delete successfully published intents. Each replica has its own temporary fanout queue and rereads the message/current conversation before sending to its local sockets. Eligible recipients must be both an original intended recipient and a current local participant. There is no direct success push from `SEND` in parallel with this subscriber path.

Broker hints can repeat or be missed. The shared [realtime contract](../../packages/messaging.md#realtime-delivery) defines leases, bounded queues and retries. REST history is the recovery source. The student client deduplicates by message ID, tracks contiguous history coverage separately from a high live sequence, and catches up on `AUTH_OK`, including the first connection. These controls do not provide exactly-once sends: `clientId` is correlation metadata, not a persisted idempotency key.

Moderation checks text before append. A positive result stores no message, returns `MODERATED` to the sender, and attempts a transient `MODERATED_PEER` notice to the peer. Moderation errors/timeouts fail open. Translation requires configured credentials, batches at most 30 messages per LLM call, and can fail with 503; neither feature changes the original text. See the source and [LLM package](../../../packages/llm/src/index.ts) for provider behavior.

## Configuration and operations

[`config.ts`](../../../services/chat-service/src/config.ts) and [`.env.example`](../../../.env.example) are the configuration references. Do not copy credentials into documentation.

| Variable | Default / role |
|---|---|
| `PORT` / `CHAT_SERVICE_PORT` | 8006; `PORT` takes priority |
| `DATABASE_URL` / `CHAT_DATABASE_URL` | Service-owned Chat database; direct URL takes priority |
| `ORDER_SERVICE_URL` | `http://localhost:8003` outside Compose |
| `JWT_PUBLIC_KEY`, `JWT_ISSUER`, `JWT_AUDIENCE` | Shared offline token verification |
| `RABBITMQ_URL`, `CHAT_EXCHANGE`, `CHAT_QUEUE` | Broker connection; `campus.events`; `chat-service.events` |
| `CHAT_DLX`, `CHAT_DLQ` | Default `<queue>.dlx`, `<queue>.dlq` |
| `CHAT_RETRY_DELAY_MS`, `CHAT_RETRY_LIMIT` | 2000 ms / 30 for transient business-event failures |
| `RABBITMQ_REALTIME_EXCHANGE` | `chat-service.events.realtime`; separate from the business exchange |
| `SOCLAAS_BASE_URL`, `SOCLAAS_API_KEY`, `SOCLAAS_MODEL` | Moderation/translation provider configuration |

`/health` reports socket count and business/realtime connection status. `/ready` requires the business consumer, realtime subscriber, a database ping and no shutdown in progress. Lost realtime subscriptions close existing sockets so clients reconnect/catch up; new sockets receive 1013 until the subscriber is ready. Signals and fatal errors stop readiness and drain HTTP, sockets, in-flight sends, relay and consumer, then close Prisma. A 10-second deadline bounds shutdown.

Container migrations/startup are documented in [Docker and deployment](../../infrastructure/docker-and-deployment.md). Queue declarations must agree with [broker topology](../../infrastructure/cdc-and-broker.md); switching an existing classic queue to quorum needs an explicit handover.

## Known limits

- Existing-row authorization uses the local projection. `order.unassigned` is not consumed, so a removed courier can retain access until another accepted event changes the row. The Order client also drops `version`; reassignment replay protection uses `courierSince`, not Order versions.
- Administrator reads and retained membership after unassignment are existing behavior, not new policy decisions made by this document. The archived D4 record preserves conflicting requirements and pending decisions.
- Retrying an uncertain send can create a second message. The client reconciles persisted history before retry decisions, but the server does not deduplicate by `clientId`.
- No application-level text-length, send-rate or outgoing-buffer limit is configured. The WebSocket server uses the library's default payload limit.
- A ready process and passing source tests do not prove live deployment health, cross-replica routing or a latency requirement.

## Tests

From the repository root after [test prerequisites](../../development/testing-strategy.md):

```bash
npm run test:unit -w @campus-errand/chat-service
npm run test:integration -w @campus-errand/chat-service
npm run test:messaging -w @campus-errand/chat-service
```

Integration uses `CHAT_TEST_DATABASE_URL`; broker suites also require `CHAT_TEST_RABBITMQ_URL`. Suites skip when prerequisites are absent. Use isolated test infrastructure, never production URLs.

[Unit tests](../../../services/chat-service/test) cover access, routing, lifecycle projection, socket correlation, translation and moderation. [`realtime.integration.test.ts`](../../../services/chat-service/test/realtime.integration.test.ts) exercises two replicas, delivery after a committed intent survives process loss, duplicates, membership rereads, leases and reconnect behavior. Browser coverage exists in [`scripts/uat/uat-realtime.mjs`](../../../scripts/uat/uat-realtime.mjs); inspect its account/infrastructure assumptions before use. Tests were source-inspected, not executed for this documentation refresh. See [testing](../../development/testing-strategy.md) for execution and evidence limits.
