<!--
AI Assistance Disclosure:
Tool: Claude Code (model: Claude Fable 5.1), date: 2026-09-21
Scope: Wrote this page from services/notification-service source, gateway/nginx.conf, docker-compose.yml and D1 text. Descriptive only.
Author review: <to be completed by the service owner>
-->

# notification-service

**Status:** in-memory mock from the starter template. Port **8005**. No database.

## Responsibilities (from the documents)

Notify the requester when a courier accepts their errand and on later status changes, in real time over WebSocket, driven by order lifecycle events from the message broker; later, a private conversation per accepted errand. Its unavailability must not stop errands being created, viewed or accepted. [D1 F5, F8, §3.1, N4.1.1]

## Run

```bash
npm run dev:notif        # needs nothing else running
```

## Configuration

`PORT` (default `8005`). `RABBITMQ_URL` is read into a constant and set in compose, but no code connects to RabbitMQ; `amqplib` is an unused dependency.

## Files

`src/index.ts` only: an Express app and a `ws` `WebSocketServer` sharing one HTTP server, and a `Set` of connected clients.

## Interfaces

| Interface | Behaviour |
|---|---|
| WebSocket on `/` (through the gateway: `ws://localhost/ws/`) | On connect the server sends `{ type: "CONNECTION_ACK", message, timestamp }`. Any JSON message a client sends is re-sent to **every** connected client with `broadcastedAt` added. Non-JSON messages are logged and dropped. |
| `POST /api/notifications/broadcast` `{ title?, message? }` | Sends `{ type: "SYSTEM_BROADCAST", title, message, timestamp }` to every client → `{ success, broadcastedTo }`. |
| `GET /health` | Adds `activeWsClients` to the usual fields. |

The gateway proxies `/ws/` (upgrade headers, 24 h timeouts) but has **no** route for `/api/notifications`, so the broadcast endpoint is reachable only on port 8005 directly. student-app opens `/ws/` on load.

## Behaviour as built

- No authentication on the socket or the HTTP endpoint; anyone who can connect receives everything and can broadcast anything.
- No mapping from a connection to a user, so nothing can be addressed to "the requester of errand X" or to the two participants of a chat.
- No event consumption: order-service does not publish, and this service does not subscribe.
- Closed sockets are removed from the set; there is no heartbeat/ping.

## Differences from the documents

All of F5 and F8 as specified (targeted, event-driven, private). Exchange/queue names and delivery semantics are not written down anywhere yet.

## Tests

None.

## Issues

#52 (F5), #56 (F8), #72 and #60 (events), #51 (graceful degradation).
