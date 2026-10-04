<!--
AI Assistance Disclosure:
Tool: Claude Code (model: Claude Fable 5.1), date: 2026-09-21
Scope: Documented the current Notification Service and its dedicated future RabbitMQ consumer identity.
Author review: <to be completed by the service owner>

Tool: Claude Code (model: Claude Fable 5.1), date: 2026-10-03
Scope: Updated Status, Configuration, Files, Behaviour and Tests for the RabbitMQ consumer copied from PR #91.
Author review: <to be completed by Reallyeasy1>
-->

# notification-service

**Status:** consumes order lifecycle events from RabbitMQ; WebSocket part is still the starter-template mock. Port **8005**. No database yet.

## Responsibilities (from the documents)

Notify the requester when a courier accepts their errand and on later status changes, in real time over WebSocket, driven by order lifecycle events from the message broker; later, a private conversation per accepted errand. Its unavailability must not stop errands being created, viewed or accepted. [D1 F5, F8, §3.1, N4.1.1]

## Run

```bash
npm run dev:notif        # needs nothing else running
```

## Configuration

`PORT` (default `8005`). `RABBITMQ_URL` (default `amqp://notification_service:notification-service-dev@localhost:5672/campus`; compose sets the `rabbitmq` host). Optional overrides: `NOTIFICATION_EXCHANGE` (`campus.events`), `NOTIFICATION_QUEUE` (`notification-service.events`), `NOTIFICATION_RETRY_EXCHANGE` / `NOTIFICATION_RETRY_QUEUE` (`<queue>.retry`), `NOTIFICATION_DLX` / `NOTIFICATION_DLQ` (`<queue>.dlx`, `<queue>.dlq`), `NOTIFICATION_RETRY_DELAY_MS` (1000), `NOTIFICATION_RETRY_LIMIT` (5). The broker account comes from `docker/rabbitmq/definitions.json`: read on `campus.events` for `order.*`, configure/write only on `notification-service.events*` and the default exchange.

## Files

- `src/index.ts`: Express app and `ws` `WebSocketServer` on one HTTP server, a `Set` of connected clients, and the consumer start-up. A broker or channel failure exits the process so Compose restarts it.
- `src/config.ts`: port and broker settings above.
- `src/messaging/rabbitmq.ts`: generic consumer copied from `credit-service` on PR #91 with `x-notification-*` headers. Prefetch 1, ack after the handler returns, durable retry queue with a delay worker, dead-letter forwarding under publisher confirms.
- `src/notifications/events.ts`: validates `order.*` messages (JSON object, `eventType` equals the routing key, UUID ids, UTC ISO-8601 timestamp), classifies failures (validation is permanent, anything else transient) and maps events to notifications in `toNotification`, which currently returns `null` for everything.

## Interfaces

| Interface | Behaviour |
|---|---|
| WebSocket on `/` (through the gateway: `ws://localhost/ws/`) | On connect the server sends `{ type: "CONNECTION_ACK", message, timestamp }`. Any JSON message a client sends is re-sent to **every** connected client with `broadcastedAt` added. Non-JSON messages are logged and dropped. |
| `POST /api/notifications/broadcast` `{ title?, message? }` | Sends `{ type: "SYSTEM_BROADCAST", title, message, timestamp }` to every client → `{ success, broadcastedTo }`. |
| `GET /health` | Adds `activeWsClients` and `rabbitmq` (`UP` once the consumer is bound, else `DOWN`) to the usual fields. |

The gateway proxies `/ws/` (upgrade headers, 24 h timeouts) but has **no** route for `/api/notifications`, so the broadcast endpoint is reachable only on port 8005 directly. student-app opens `/ws/` on load.

## Behaviour as built

- No authentication on the socket or the HTTP endpoint; anyone who can connect receives everything and can broadcast anything.
- No mapping from a connection to a user, so nothing can be addressed to "the requester of errand X" or to the two participants of a chat.
- Subscribes `notification-service.events` to all six `order.*` keys on `campus.events`. Malformed messages go to `notification-service.events.dlq`; valid ones are acknowledged. Because `toNotification` is not yet written, no valid event produces output beyond the ack. order-service still does not publish, so the queue only receives hand-published test messages.
- Closed sockets are removed from the set; there is no heartbeat/ping.

## Differences from the documents

All of F5 and F8 as specified (targeted, event-driven, private). Exchange/queue names and delivery semantics are not written down anywhere yet.

## Tests

`npm test --workspace=@campus-errand/notification-service`: `test/events.test.ts` (node:test, no broker) covers event validation and failure classification. No broker integration test yet.

## Issues

#52 (F5), #56 (F8), #72 and #60 (events), #51 (graceful degradation).
