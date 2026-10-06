<!--
AI Assistance Disclosure:
Tool: Claude Code (model: Claude Fable 5.1), date: 2026-10-05
Scope: Rewritten to describe the service as built from the author's Notification Service Design: database, REST API, authenticated WebSocket, event mapping, tests. 2026-10-06: retry defaults and the /ready health check.
Author review: <to be completed by Reallyeasy1>

Tool: Claude Code (model: Claude Fable 5.1), date: 2026-09-21
Scope: Documented the current Notification Service and its dedicated future RabbitMQ consumer identity.
Author review: <to be completed by the service owner>

Tool: Claude Code (model: Claude Fable 5.1), date: 2026-10-03
Scope: Updated Status, Configuration, Files, Behaviour and Tests for the RabbitMQ consumer copied from PR #91.
Author review: <to be completed by Reallyeasy1>
-->

# notification-service

**Status:** real. Consumes order lifecycle events from RabbitMQ, stores a notification for the requester in `notification_db` (Prisma), and pushes it over an authenticated WebSocket. Port **8005**.

## Responsibilities (from the documents)

Notify the requester when a courier accepts their errand and on later status changes, in real time over WebSocket, driven by order lifecycle events from the message broker, and keep unread notifications for review after reconnecting; later, a private conversation per accepted errand. Its unavailability must not stop errands being created, viewed or accepted. [D1 F5, F8, §3.1, N4.1.1]

## Run

```bash
docker compose up postgres rabbitmq -d                                  # the service exits at boot without a reachable broker
npm run db:deploy --workspace=@campus-errand/notification-service       # creates notification_db if missing and applies migrations
npm run dev:notif                                                       # needs JWT_PUBLIC_KEY in the environment
```

In Compose the container runs `db:deploy` itself before starting. `docker/postgres-init` creates `notification_db` only on a fresh volume; on an existing volume `db:deploy` creates it.

## Configuration

`services/notification-service/.env.example` lists every variable.

- `PORT` (default `8005`), `DATABASE_URL` (default `postgresql://postgres:postgres@localhost:5432/notification_db`).
- `JWT_PUBLIC_KEY`, `JWT_ISSUER`, `JWT_AUDIENCE`: the same values as User Service; the service refuses to start without a valid public key.
- `RABBITMQ_URL` (default `amqp://notification_service:notification-service-dev@localhost:5672/campus`; Compose sets the `rabbitmq` host). Optional overrides: `NOTIFICATION_EXCHANGE` (`campus.events`), `NOTIFICATION_QUEUE` (`notification-service.events`), `NOTIFICATION_RETRY_EXCHANGE` / `NOTIFICATION_RETRY_QUEUE` (`<queue>.retry`), `NOTIFICATION_DLX` / `NOTIFICATION_DLQ` (`<queue>.dlx`, `<queue>.dlq`), `NOTIFICATION_RETRY_DELAY_MS` (2000), `NOTIFICATION_RETRY_LIMIT` (30): about a minute of retries, so a database restart does not dead-letter notifications.
- The broker account comes from `docker/rabbitmq/definitions.json`: read on `campus.events` for the seven `order.*` keys, configure/write only on `notification-service.events*` and the default exchange. The dead-letter exchange is therefore the service's own (`notification-service.events.dlx`), not the shared `campus.events.dlx`.

## Files

- `src/index.ts`: wiring only. One HTTP server carries the Express app and the `ws` server; the consumer starts at boot. A broker or channel failure exits the process and Compose restarts it (`restart: unless-stopped`).
- `src/app.ts`: `/health`, `/ready`, the notification routes, a generic error handler.
- `src/config.ts`: the settings above.
- `src/database/`: Prisma schema, one migration, client. The generated client is git-ignored.
- `src/messaging/rabbitmq.ts`: the consumer from `credit-service` with `x-notification-*` headers. Prefetch 1, ack after the handler returns, durable retry queue with a delay worker, dead-letter forwarding under publisher confirms.
- `src/notifications/events.ts`: validates `order.*` messages, maps an event to a notification (`toNotification`), and stores it before pushing (`createDeliver`).
- `src/notifications/store.ts`: inserts, lists and marks notifications read.
- `src/notifications/routes.ts`: the REST routes.
- `src/ws/hub.ts`: the WebSocket hub.

## Events

The queue is bound to seven keys on `campus.events`. A message must be a JSON object whose `eventType` equals the routing key, with UUID `eventId`, `orderId`, `requesterId` (and `courierId` where listed), and a UTC ISO-8601 `timestamp`. Anything else is a permanent failure and goes to `notification-service.events.dlq`. Other failures (a database error, for example) are retried 2 s apart up to 30 times, then dead-lettered; nothing reads that queue, so an operator replays it by hand.

| Routing key | Notification to the requester | Requires `courierId` |
|---|---|---|
| `order.accepted` | `ORDER_ACCEPTED`: "Your errand `<orderCode>` was accepted" / "A courier has been assigned to your errand." | yes |
| `order.in_transit` | `ORDER_PICKED_UP`: "Your errand `<orderCode>` was picked up" / "Your courier has the items and is on the way." | yes |
| `order.delivered` | `ORDER_DELIVERED`: "Your errand `<orderCode>` was delivered" / "Review the delivery and confirm it." | yes |
| `order.completed` | none, acknowledged | yes |
| `order.created`, `order.cancelled`, `order.expired` | none, acknowledged | no |

When an event carries no `orderCode` the title reads "Your errand was …". The notification stores `courierId`; it does not carry the courier's name.

A redelivered event is harmless: `event_id` is unique, the second insert returns nothing, and nothing is pushed again.

## Data

`notification_db`, table `notifications`: `id`, `user_id` (the requester), `event_id` (unique), `kind`, `order_id`, `order_code` (nullable), `courier_id` (nullable), `title`, `body`, `read_at` (null means unread), `created_at` (the event's timestamp, not the insert time). Index on `(user_id, created_at desc)`. Rows are never deleted. ER diagram: `docs/diagrams/notification-schema.md`.

## Interfaces

All REST routes need `Authorization: Bearer <access token>` and act only on the caller's own notifications. Through the gateway they are under `http://localhost/api/notifications`.

| Interface | Behaviour |
|---|---|
| `GET /api/notifications?unread=true&page=1&limit=20` | Newest first. `{ success, data: { items: NotificationDTO[], total, page, limit, totalPages, unreadCount } }`. `page` defaults to 1, `limit` to 20 (clamped to 1..100). `unread=true` lists unread rows only; `unreadCount` always counts all unread rows. |
| `PATCH /api/notifications/:id/read` | Marks one read and returns it. 404 `NOTIFICATION_NOT_FOUND` for an unknown id, a non-UUID id, or another user's notification. Reading twice keeps the first `readAt`. |
| `POST /api/notifications/read-all` | `{ success, data: { updated } }`. |
| `GET /health` | Usual fields plus `activeWsClients` and `rabbitmq` (`UP` once the consumer is bound). |
| `GET /ready` | 200 `READY` when the consumer is bound and the database answers, else 503 `NOT_READY`. The Compose health check probes this, so `docker compose up --wait` returns only once events can be received. |
| WebSocket on `/` (through the gateway: `ws://localhost/ws/`) | See below. |

`NotificationDTO` is in `packages/common-dtos`: `id`, `kind`, `orderId`, `orderCode`, `courierId`, `title`, `body`, `readAt`, `createdAt`.

### WebSocket frames

| Direction | Frame | When |
|---|---|---|
| client to server | `{ "type": "AUTH", "token": "<access token>" }` | first frame, within 5 seconds of connecting |
| server to client | `{ "type": "AUTH_OK", "unreadCount": n }` | token verified |
| server to client | `{ "type": "NOTIFICATION", "data": NotificationDTO }` | after each new notification for this user |
| server closes | code `4401` | no AUTH frame in time, a first frame that is not a valid AUTH, or the token's `exp` is reached |

The token is checked with the same key, issuer and audience as the HTTP middleware. The socket carries new notifications only; history comes from `GET /api/notifications`, which a client calls after every `AUTH_OK`. Frames a client sends after the handshake are ignored. The server pings every 30 seconds and drops sockets that do not answer.

## Behaviour as built

- The starter stub's echo-to-everyone handler and `POST /api/notifications/broadcast` are removed.
- The student app still opens `/ws/` without sending `AUTH`, so its socket is closed after 5 seconds until the app is updated (the design's third pull request). Nothing else in the app depends on the socket.
- Order Service does not publish yet (#72, #14), and `OrderStatus` has no delivered state, so the queue only receives hand-published messages. Publish one from the RabbitMQ management UI (`localhost:15672`, exchange `campus.events`) or with `amqplib` as `order_service`.
- A notification stored while its user is offline is not pushed later; the client sees it in the list after reconnecting.
- While this service is down, events wait in its durable queue and are processed when it returns. No other service calls it.

## Differences from the documents

- F5.1.1 asks the acceptance notification to identify the courier; the notification carries `courierId` only. How the name is shown is an open decision in the design.
- F5.3 depends on an `order.delivered` event that Order Service cannot emit until a delivered state exists (`docs/requirements/conflicts.md`).
- F8 (chat) is not built.

## Tests

`npm test --workspace=@campus-errand/notification-service` (Node's built-in runner):

- `test/events.test.ts`: validation, failure classification, the mapping to notifications, store-before-push.
- `test/hub.test.ts`: the handshake and its `4401` rejections, addressing, token expiry, over real sockets with real Ed25519 tokens.
- `test/store-routes.integration.test.ts`: the duplicate guard, ordering, ownership, read and read-all. Runs when `NOTIFICATION_TEST_DATABASE_URL` is set; creates and drops its own schema.
- `test/messaging.integration.test.ts`: event in, one row, one pushed frame, redelivery ignored, malformed message dead-lettered. Runs when `NOTIFICATION_TEST_RABBITMQ_URL` is also set (the `notification_service` account); uses its own exchange and queues under `notification-service.events.test-<id>` and removes them.

`node scripts/uat/uat-notifications.mjs` drives the running stack through the gateway (17 checks): login, the socket handshake, events published with the `order_service` broker account, the pushed frames, the REST list and read state, and the `4401` closes. Set `AMQP_URL` when RabbitMQ is not on `localhost:5672`.

CI sets both variables and runs the driver against the Compose stack.

## Issues

#52 (F5), #56 (F8), #72 and #60 (events), #51 (graceful degradation).
