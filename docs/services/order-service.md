<!--
AI Assistance Disclosure:
Tool: Google Antigravity Agent, date: 2026-10-07
Scope: Updated documentation to reflect the production Order Service implementation with PostgreSQL persistence via Prisma, synchronous credit escrow reservation, RabbitMQ transactional outbox, single-winner concurrency control, and automated background expiration sweeper.
Author review: (to be completed by author after review)

Tool: Claude Code (model: Claude Fable 5.1), date: 2026-09-21
Scope: Documented the current Order Service and its dedicated future RabbitMQ publisher identity.
Author review: <to be completed by the service owner>
-->

# order-service

**Status:** real. Microservice managing campus errand requests and the errand lifecycle state machine, backed by PostgreSQL (`order_db`) via Prisma, synchronous Credit Service escrow reservations, and asynchronous RabbitMQ event choreography on `campus.events` using a Transactional Outbox. Port **8003**.

## Responsibilities (from the documents)

- Create errands with synchronous Credit Service credit escrow reservations (`POST /api/credits/escrow/reserve`) and supplier validation [D1 F3.1, N2.1].
- Provide real-time feed of open, non-expired errands filterable by campus zone and status [D1 F3.2].
- Atomic single-winner errand claiming with self-claim prevention [D1 F3.3, N1.3, N3.1].
- Strict role-based state machine mutations:
  - `OPEN` &rarr; `ACCEPTED` (courier claim)
  - `ACCEPTED` &rarr; `IN_TRANSIT` (courier pickup)
  - `IN_TRANSIT` &rarr; `DELIVERED` (courier dropoff)
  - `DELIVERED` &rarr; `COMPLETED` (requester confirmation & credit settlement)
  - `OPEN` / `ACCEPTED` &rarr; `CANCELLED` (requester cancellation before pickup with escrow refund)
  - `OPEN` &rarr; `EXPIRED` (automatic background expiration sweeper with escrow refund) [D1 F3.4, F3.5, N3.3].
- Publish transactional lifecycle events to RabbitMQ topic exchange `campus.events` with at-least-once delivery guarantees [D1 F3.6, N4.1].

## Run

```bash
docker compose up postgres rabbitmq -d                                  # database and message broker
npm run db:deploy --workspace=@campus-errand/order-service              # applies Prisma migrations to order_db
npm run db:seed --workspace=@campus-errand/order-service                # seeds initial sample orders (if empty)
npm run dev:order                                                       # starts the service on port 8003
```

In Compose, the container runs `db:deploy` and `db:seed` automatically at boot before starting the server.

## Configuration

`services/order-service/.env.example` lists every configuration variable:

- `PORT` (default `8003`).
- `DATABASE_URL` (default `postgresql://postgres:postgres@localhost:5432/order_db`).
- `CREDIT_SERVICE_URL` (default `http://localhost:8004` or `http://credit-service:8004` in Docker).
- `SUPPLIER_SERVICE_URL` (default `http://localhost:8002` or `http://supplier-service:8002` in Docker).
- `JWT_PUBLIC_KEY`, `JWT_ISSUER`, `JWT_AUDIENCE`: Ed25519 public key and claims aligned with `user-service`.
- `RABBITMQ_URL` (default `amqp://order_service:order-service-dev@localhost:5672/campus`).
- `EVENTS_EXCHANGE` (default `campus.events`).
- `EXPIRY_SWEEPER_INTERVAL_MS` (default `30000`).
- `OUTBOX_RELAY_INTERVAL_MS` (default `2000`).

## Architecture & Files

- `src/index.ts`: entrypoint wiring Prisma client, confirmed RabbitMQ publisher, transactional outbox relay, background expiry sweeper, and authenticated Express server with graceful shutdown handling.
- `src/app.ts`: Express application setup configuring CORS, JSON parsing, `/health` and `/ready` probes, and mounting `/api/orders`.
- `src/config.ts`: centralized environment variable validation and type-safe config object.
- `src/database/`:
  - `prisma/schema.prisma`: persistent `Order` and `OutboxEvent` models targeting `src/database/generated/client`.
  - `prisma/migrations/`: versioned PostgreSQL migration scripts.
  - `client.ts`: singleton Prisma client instance.
  - `seed.ts`: initial development order seed.
- `src/messaging/`:
  - `publisher.ts`: confirmed RabbitMQ publisher with connection recovery, mandatory routing, and persistent message flags.
  - `outbox-relay.ts`: transactional outbox worker polling `outbox_events` and publishing to `campus.events` with retry backoff and poison message isolation.
- `src/orders/`:
  - `types.ts`: domain errors (`OrderNotFoundError`, `OrderStateConflictError`, `OrderAuthorizationError`, `SelfAcceptForbiddenError`, `OrderValidationError`) and DTO mappers.
  - `credit-client.ts`: synchronous HTTP client for escrow reservation (`POST /api/credits/escrow/reserve`).
  - `supplier-client.ts`: HTTP client validating supplier existence, active status, and campus zone.
  - `order-repository.ts`: database operations with transaction boundaries, version checks, and atomic outbox insertions.
  - `expiry-sweeper.ts`: periodic background sweeper finding expired open errands and triggering escrow refunds.
  - `service.ts`: core domain business logic orchestrator.
  - `routes.ts`: Express router implementing REST endpoints with Ed25519 token verification.

## REST API Reference

| Method & path | Auth | Description | Success | Errors |
|---|---|---|---|---|
| `GET /health` | None | Service liveness probe | 200 `{ status: "UP" }` | — |
| `GET /ready` | None | Service readiness probe (checks DB) | 200 `{ status: "READY" }` | 503 |
| `GET /api/orders` | Optional | Feed of open errands (filters: `status`, `campusZone`, pagination) | 200 `{ success: true, data: OrderDTO[], total }` | — |
| `GET /api/orders/:id` | Optional | Get order by UUID or orderCode | 200 `{ success: true, data: OrderDTO }` | 404 |
| `GET /api/orders/user/activity` | Required | Partitioned activity (`requested`, `delivering`, `history`) | 200 `{ success: true, data: { requested, delivering, history } }` | 401 |
| `POST /api/orders` | Required | Create errand with synchronous credit escrow reservation | 201 `{ success: true, data: OrderDTO }` | 400, 401 |
| `POST /api/orders/:id/accept` | Required | Single courier claim (rejects self-claims & expired orders) | 200 `{ success: true, data: OrderDTO }` | 400, 401, 404, 409 |
| `POST /api/orders/:id/pickup` | Required | Courier marks item picked up (`ACCEPTED` &rarr; `IN_TRANSIT`) | 200 `{ success: true, data: OrderDTO }` | 401, 403, 404, 409 |
| `POST /api/orders/:id/deliver` | Required | Courier marks item delivered (`IN_TRANSIT` &rarr; `DELIVERED`) | 200 `{ success: true, data: OrderDTO }` | 401, 403, 404, 409 |
| `POST /api/orders/:id/complete` | Required | Requester confirms delivery (`DELIVERED` &rarr; `COMPLETED`) | 200 `{ success: true, data: OrderDTO }` | 401, 403, 404, 409 |
| `POST /api/orders/:id/cancel` | Required | Requester cancels errand before pickup (`OPEN`/`ACCEPTED` &rarr; `CANCELLED`) | 200 `{ success: true, data: OrderDTO }` | 401, 403, 404, 409 |

## Published Events (`campus.events`)

Order Service publishes 7 lifecycle events using the Transactional Outbox pattern:

1. `order.created`: emitted when an errand is successfully opened.
2. `order.accepted`: emitted when a courier successfully claims an errand.
3. `order.in_transit`: emitted when the assigned courier picks up the errand.
4. `order.delivered`: emitted when the courier drops off the errand.
5. `order.completed`: emitted when the requester confirms delivery (consumed by `credit-service` to transfer escrow to courier, and by `notification-service`).
6. `order.cancelled`: emitted when requester cancels the errand (consumed by `credit-service` to refund escrow).
7. `order.expired`: emitted when an unclaimed open errand expires (consumed by `credit-service` to refund escrow).

## Tests

The service includes comprehensive automated test coverage executed via Node's native test runner (`node --test`):

```bash
npm test --workspace=@campus-errand/order-service
```

Test suites cover:
- State machine progression and role authorization.
- Concurrency and single-winner atomic claiming under contention.
- Self-claim rejection (requesters cannot claim their own orders).
- Escrow reservation validation and insufficient funds handling.
- Automatic expiration sweeping and outbox event emission.
- Transactional outbox relay worker, publisher confirms, and poison payload isolation.
- HTTP application endpoints, status codes, and Ed25519 authentication middleware.
