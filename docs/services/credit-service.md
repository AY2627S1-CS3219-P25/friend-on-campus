<!--
AI Assistance Disclosure:
Tool: Codex (model: GPT-6), date: 2026-09-24
Scope: Documented JWT-protected wallet/ledger reads, verification configuration and authentication tests.
Author review: <to be completed by huangjiaxi1111>
-->

# Credit Service

Credit Service runs on port **8004**, owns `credit_db`, and persists wallets, ledger entries, initial grants, per-order escrow state and processed event identities with Prisma. HTTP credit operations and RabbitMQ consumers use the same transactional rules.

User, Order and Notification Services remain unchanged. Upstream publication is not implemented by this task. See [the integration contract](./credit-service-integration-contract.md) for their required future behavior and complete message examples.

## Run locally

From the repository root:

```bash
docker compose up -d postgres rabbitmq
export DATABASE_URL=postgresql://postgres:postgres@localhost:5432/credit_db
export RABBITMQ_URL=amqp://guest:guest@localhost:5672
# Use the same public key configured for User Service.
export JWT_PUBLIC_KEY='<shared Ed25519 public key>'
npm run db:generate --workspace=@campus-errand/credit-service
npm run db:deploy --workspace=@campus-errand/credit-service
npm run dev:credit
```

If port 8004 is occupied, set `PORT=8014` for the local process. Compose parses the full project; if it requests JWT keys, use the existing repository key-generation setup. PostgreSQL and RabbitMQ must both be available before startup completes. A missing or malformed public key prevents startup before connections are opened. Credit Service requires only the public key, never `JWT_PRIVATE_KEY`.

For Docker, `docker compose up --build -d credit-service` builds the client, deploys this service's migrations and starts the consumer and HTTP server. Compose supplies PostgreSQL/RabbitMQ addresses and the shared JWT public key, issuer and audience. Docker startup runs `db:deploy` before starting Node. No volumes need to be reset.

## Fresh database initialization

Start with an empty `credit_db` and run `db:deploy`. Both migrations run in order:

1. `20260924050000_existing_credit_tables` creates wallets and ledger entries. Its existing filename is retained; it also initializes a fresh database.
2. `20260924100000_credit_messaging` creates the grant, escrow and processed-event tables.

| Table | Purpose |
|---|---|
| `credit_grants` | One immutable initial allocation amount per user |
| `credit_escrows` | One requester/amount and lifecycle per order; `RESERVED`, `SETTLED` or `REFUNDED` |
| `processed_credit_events` | Event ID, type and hash of the validated payload |

All five tables start empty. Wallets, grants, escrows and ledger entries are created through normal application operations. There is no legacy-data backfill, reconciliation or baseline step. The original migration is unchanged; the new messaging migration only creates its tables and constraints. This setup targets fresh databases rather than upgrading existing credit records.

`src/database/schema.sql` remains the historical pre-messaging schema. The Prisma schema and versioned migrations are authoritative for the running service.

## HTTP API

| Endpoint | Behavior |
|---|---|
| `GET /health` | Liveness, 200 while HTTP is serving |
| `GET /ready` | 200 only when PostgreSQL responds and RabbitMQ consumers are ready; otherwise 503 |
| `GET /api/credits/wallet` | Bearer access token; returns the authenticated user's wallet, lazily initializing 100 credits if missing |
| `GET /api/credits/ledger` | Bearer access token; returns the authenticated user's ledger, newest first |
| `POST /api/credits/escrow/reserve` | `{orderId, requesterId, amount}`; reserves once per order |
| `POST /api/credits/escrow/settle` | `{orderId, requesterId, courierId, amount}`; settles the full matching reservation once |
| `POST /api/credits/escrow/refund` | `{orderId, requesterId, amount}`; refunds the full matching reservation once |

Success response shapes remain `{success:true,data,...}`; settle returns `{requesterWallet,courierWallet}`, reserve/refund return a wallet. UUIDs are normalized to lowercase. Amounts must be positive PostgreSQL integers. Invalid input and insufficient available funds return 400; reservation/terminal/grant conflicts return 409. Unexpected failures return generic 500 errors.

Identical operations do not repeat balance changes, including concurrent requests. Reusing an order with a different requester, amount or settlement courier conflicts. Settlement and refund are mutually exclusive. Partial settlement/refund is no longer supported. Replays return current balances rather than saved historical responses; an identical reserve replay never reopens a terminal escrow.

Wallet creation writes exactly one welcome ledger entry and grant marker in the same transaction. Existing read DTO fields, including `totalEarnedCredits`, remain unchanged.

### User authentication

Wallet and ledger reads use `@campus-errand/auth` following [User Service's authentication contract](../../services/user-service/docs/authentication-for-services.md). The middleware verifies Ed25519 signatures, token claims, expiry, issuer and audience locally. Routes use only `res.locals.auth.userId` (the verified `sub` claim); `x-user-id` and query/body identifiers cannot select another wallet or ledger. Both `STUDENT` and `ADMIN` tokens access only their own records through these endpoints. Credit user IDs must be UUIDs; a verified token with a non-UUID subject receives 400.

```bash
curl http://localhost:8004/api/credits/wallet \
  -H "Authorization: Bearer $ACCESS_TOKEN"
curl http://localhost:8004/api/credits/ledger \
  -H "Authorization: Bearer $ACCESS_TOKEN"
```

Obtain `ACCESS_TOKEN` through User Service login. Missing Bearer tokens return `401 MISSING_TOKEN`; expired tokens return `401 TOKEN_EXPIRED`; invalid signatures or claims return `401 INVALID_TOKEN`. Failures preserve the shared `{success:false,error,code}` response. Rejected requests never invoke credit rules or create wallets/grants. Refresh remains the frontend/User Service responsibility; logout prevents refresh but an existing access token remains valid until expiry.

`/health` and `/ready` remain public. Service-to-service authentication is deferred: reserve, settle and refund still accept body identifiers without caller authentication. RabbitMQ delivery behavior is unchanged. User JWT authentication on reads does not protect those mutation endpoints.

## Registration and messages

The consumer accepts `user.registered`, `order.completed`, `order.cancelled` and `order.expired`. Registration initializes the wallet from `initialGrant`; completion settles; cancellation/expiry refund. JSON, UUIDs, positive integer amounts, email, UTC timestamps, event type and routing-key agreement are validated before credit rules execute.

Compatibility: first read/reserve/courier settlement still creates an unknown wallet with 100 credits. A later registration with the same grant records the event without changing balances. A different grant conflicts and is dead-lettered. If registration arrives first, its amount determines the allocation. This is a compatibility bridge while User Service event publishing is pending.

Processed event ID and payload fingerprint are committed with all credit changes. Reusing an ID with a different validated payload conflicts. Different IDs for the same grant/order operation are also protected by persistent business state. Concurrent work uses serializable transactions with up to ten attempts for serialization/uniqueness contention; exhausted infrastructure failures pass to the bounded message retry policy.

Cancellation uses a temporary local type in `src/credits/events.ts` until future shared DTO work adds `OrderCancelledEvent`.

## Configuration and delivery

All configuration is owned by `src/config.ts`; see the service's `.env.example`.

| Environment variable | Default |
|---|---|
| `PORT` | `8004` |
| `DATABASE_URL` | Local `credit_db` PostgreSQL URL |
| `JWT_PUBLIC_KEY` | Required 59-character Base64URL DER SPKI Ed25519 public key shared with User Service |
| `JWT_ISSUER` | `friend-on-campus-user-service` |
| `JWT_AUDIENCE` | `friend-on-campus-services` |
| `RABBITMQ_URL` | Local development broker URL, `amqp://guest:guest@localhost:5672` |
| `CREDIT_EXCHANGE` | `campus.events` (topic) |
| `CREDIT_QUEUE` | `credit-service.events` |
| `CREDIT_RETRY_EXCHANGE` | `<CREDIT_QUEUE>.retry` (direct) |
| `CREDIT_RETRY_QUEUE` | `<CREDIT_QUEUE>.retry` |
| `CREDIT_DLX` | `<CREDIT_EXCHANGE>.dlx` (direct) |
| `CREDIT_DLQ` | `<CREDIT_QUEUE>.dlq` |
| `CREDIT_RETRY_DELAY_MS` | `1000` |
| `CREDIT_RETRY_LIMIT` | `5` retries after the initial attempt |

Topology is durable and declaration is repeatable for matching settings. A broker object with the same name but incompatible settings causes startup failure; the service never deletes shared topology to repair it. Both the main and retry consumer use prefetch 1 and manual acknowledgement.

Transient processing failures are forwarded persistently to the retry queue. A retry consumer waits until the message's scheduled time and forwards with confirms directly to Credit Service's main queue. Shutdown leaves waiting retries unacknowledged for the next consumer. There is no TTL dead-letter dependency on retry forwarding. Permanent failures and exhausted retries are persistently forwarded to the DLQ. Every forwarding requires a publisher confirm and no mandatory return before acknowledging its source. A forwarding failure closes the consumer so RabbitMQ can redeliver the original.

Failure logs contain event ID/type, retry count and category with a fixed reason code, not raw payloads, credentials or connection URLs. Original message bodies, IDs, routing keys and failure headers are retained for inspection. See the integration contract for DLQ replay instructions.

On dependency startup failure the process exits unsuccessfully. On a RabbitMQ connection/channel failure or consumer cancellation, it becomes unready and drains/closes the consumer and HTTP server, then disconnects Prisma and exits with an error status. Restart after recovery; automatic reconnect/process supervision is not implemented here. SIGINT/SIGTERM cancel consumers, finish in-flight processing and close resources. Importing `app.ts` does not create connections or listen.

## Files

- `src/index.ts`: constructs JWT middleware once, dependency startup, readiness and shutdown.
- `src/app.ts`: Express middleware, health/readiness and router assembly.
- `src/config.ts`: environment defaults, JWT verification settings and retry validation.
- `src/credits/routes.ts`: authenticated wallet/ledger ownership, HTTP validation and error translation.
- `src/credits/service.ts`: grant, escrow and event idempotency rules.
- `src/credits/store.ts`: Prisma queries and serializable transaction retries.
- `src/credits/errors.ts`: expected business and validation errors.
- `src/credits/types.ts`: existing shared HTTP DTO exports.
- `src/credits/events.ts`: message validation and event-to-command translation.
- `src/credits/consumer.ts`: binds credit handling/error classification to RabbitMQ.
- `src/messaging/rabbitmq.ts`: generic topology, confirmed forwarding, consumption and shutdown.
- `src/database/client.ts`: service-local Prisma client.
- `src/database/prisma/`: authoritative schema and migrations.
- `tests/*.integration.test.ts`: PostgreSQL/HTTP, messaging and fresh migration checks.
- `tests/auth-fixture.ts`: ephemeral signing keys and access tokens for tests; no real login or configured private key is needed.
- `tsconfig.test.json`: typechecks source and tests without adding tests to the application build.

## Tests

Create a dedicated database containing `_test` in its name, then from the repository root:

```bash
export CREDIT_TEST_DATABASE_URL=postgresql://postgres:postgres@localhost:5432/credit_service_test
export CREDIT_TEST_RABBITMQ_URL=amqp://guest:guest@localhost:5672
npm run db:generate --workspace=@campus-errand/credit-service
DATABASE_URL="$CREDIT_TEST_DATABASE_URL" npm run db:deploy --workspace=@campus-errand/credit-service
npm run test:integration --workspace=@campus-errand/credit-service
npm run test:messaging --workspace=@campus-errand/credit-service
npm run test:migration --workspace=@campus-errand/credit-service
npm run typecheck
```

Tests require real PostgreSQL; messaging tests additionally require RabbitMQ and local HTTP listening. HTTP tests cover valid student/admin tokens, missing/malformed/expired tokens, wrong signing keys, issuer/audience and invalid claims; spoofed identity headers/query parameters cannot change ownership or create another user's wallet. They also preserve validation, lifecycle, persistence, concurrent balance mutation and real constraint-failure rollback coverage. Messaging tests cover duplicate IDs/business operations, conflicts, malformed contracts, concurrent consumers, confirmed mandatory returns, retries/DLQ, rollback, readiness, retry restart, and a child process killed after commit before acknowledgement. Migration tests use an empty random schema inside the test database and check that all five tables are created empty and that SQL uniqueness and balance/state constraints are enforced.

Test records, queues, exchanges and schemas use isolated identifiers and are cleaned up. The tests do not delete databases or shared volumes. The person creating a temporary database is responsible for removing it afterward.

## Remaining integration work

User and Order publishers are still unimplemented; no complete application registration/order workflow is claimed. Credit Service does not publish credit outcome events, and Notification Service was not changed. Service-to-service authentication and authorization, frontend token wiring for credit requests, automatic service restart, operational DLQ recovery, and orphan reservation recovery remain outside this implementation. The existing in-memory Order Service needs separately approved persistence/outbox work for crash-safe publishing. Performance targets have not been benchmarked.

Tracked service requirements: F4.0–F4.7, Credit N1–N3; existing issue references #15–#22, #42–#46, #69 and #60. This change does not claim all of those requirements complete.
