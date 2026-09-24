<!--
AI Assistance Disclosure:
Tool: Codex (model: GPT-6), date: 2026-09-24
Scope: Documented the Prisma replacement, SQL-compatible requests, migrations and integration checks.
Author review: <to be completed by huangjiaxi1111>
-->
<!--
AI Assistance Disclosure:
Tool: Claude Code (model: Claude Fable 5.1), date: 2026-09-21
Scope: Wrote this page from services/credit-service source, docker-compose.yml, the init SQL, common-dtos and D1 / D2-plan text. Descriptive only.
Author review: <to be completed by the service owner>
-->

# credit-service

**Status:** PostgreSQL persistence through the service-local Prisma client, using the existing `credit_db` tables. Port **8004**. Wallets and ledger entries survive service restarts. Authentication, idempotency and RabbitMQ integration are still pending.

## Responsibilities (from the documents)

Initial credit allocation on registration; available, reserved and total balances per user; reserve on errand creation; settle on completion; release on cancellation or expiry; transaction history; idempotent handling of duplicate requests and redelivered events; asynchronous integration through events. [D1 F4.0–F4.7; Credit Service N1–N3; D2 plan work package F, App. D]

## Run

```bash
docker compose up postgres -d
export DATABASE_URL=postgresql://postgres:postgres@localhost:5432/credit_db
npm install
# Once, only when adopting the tables already created by Docker init SQL:
npm run db:baseline --workspace=@campus-errand/credit-service
npm run db:deploy --workspace=@campus-errand/credit-service
npm run dev:credit
```

Compose parses the full project: if it reports missing JWT keys, follow its existing `npm run generate:jwt-keys` setup instruction. Only Postgres is needed when running this service locally. If the existing Credit container already occupies port 8004, use `PORT=8014 npm run dev:credit`.

For Docker, `docker compose up --build -d credit-service` generates the Prisma client in the image and uses the existing PostgreSQL and RabbitMQ dependencies. Docker's init SQL already provisions the credit tables on first boot; the service does not run migrations automatically.

The initial Prisma migration copies the existing credit SQL, including CHECK constraints. For tables already created by Docker with that exact SQL, run `db:baseline` once to record the initial migration as applied, then use `db:deploy`. On a completely empty database, skip `db:baseline` and run `db:deploy` to create the tables. Running `db:deploy` on existing tables without a baseline produces Prisma P3005; repeating `db:baseline` after it is recorded produces P3008. Neither command repairs schema drift. Future schema edits require matching SQL and migrations. `db:generate` only generates the client; `db:migrate` is the development migration command. No volume reset is required.

Example request (replace with your actual user UUID):

```bash
curl -H 'x-user-id: 11111111-1111-4111-8111-111111111111' \
  http://localhost:8004/api/credits/wallet
```

## Configuration

`src/config.ts` loads environment configuration: `PORT` (default `8004`), `DATABASE_URL` (default `postgresql://postgres:postgres@localhost:5432/credit_db`) and the still-unused `RABBITMQ_URL`. Compose uses hostname `postgres` instead of `localhost`. `src/database/client.ts` uses this same configuration, including the local database fallback. Prisma CLI commands need `DATABASE_URL` exported or set in a service-root `.env`; see `.env.example`.

## Files

- `src/index.ts` connects Prisma and checks both credit tables before starting HTTP; disconnects on shutdown.
- `src/app.ts` assembles Express, CORS, JSON parsing, the health check and credit router; importing it does not start a server.
- `src/config.ts` loads environment configuration.
- `src/credits/routes.ts` translates HTTP requests and credit-rule errors to the existing API responses.
- `src/credits/service.ts` owns wallet creation and reserve, settle and refund rules.
- `src/credits/store.ts` owns Prisma queries, DTO mapping and transaction-scoped balance updates. No sample data is inserted.
- `src/credits/types.ts` re-exports shared credit DTOs and names the existing settlement response shape.
- `src/database/client.ts` exports the configured Prisma singleton and generated database types.
- `src/database/prisma/schema.prisma` mirrors the existing tables; `migrations/` includes their original SQL.
- `src/credits/credits.integration.test.ts` checks the HTTP and persistence behavior against a dedicated test database.

## API

| Method & path | Identity used | Request | Success | Errors |
|---|---|---|---|---|
| `GET /api/credits/wallet` | required `x-user-id` UUID header | — | 200 `CreditWalletDTO`; an unknown user gets a persisted wallet with 100 available | 400 invalid/missing UUID |
| `GET /api/credits/ledger` | same | — | 200 `CreditTransactionDTO[]` where the user is sender or receiver | 400 invalid/missing UUID |
| `POST /api/credits/escrow/reserve` | body | `EscrowReserveRequest`: `orderId, requesterId, amount` | 200 wallet | 400 insufficient available credits |
| `POST /api/credits/escrow/settle` | body | `EscrowSettleRequest`: `orderId, requesterId, courierId, amount` | 200 `{ requesterWallet, courierWallet }` | 400 insufficient escrow |
| `POST /api/credits/escrow/refund` | body | `EscrowRefundRequest`: `orderId, requesterId, amount` | 200 wallet | 400 insufficient escrow |

Only `/api/credits/` (with trailing slash) is routed by the gateway.

All POSTs require UUID identifiers and an integer `amount` in `1..2147483647`, matching PostgreSQL UUID/INT columns and the positive-amount CHECK. Invalid input returns 400. Unexpected database failures return a generic JSON 500, with transaction changes rolled back. The old `u111...`, `ord-1001` and `tx-1` mock identifiers are not valid database UUIDs. Wallet reads no longer select a fake fallback user.

## Data

HTTP DTOs remain `CreditWalletDTO` (`userId, availableCredits, escrowCredits, totalEarnedCredits, updatedAt`) and `CreditTransactionDTO` (`id, transactionCode, fromUserId, toUserId, orderId, amount, transactionType, description, createdAt`), types `WELCOME_GRANT | ESCROW_HOLD | ESCROW_RELEASE | ESCROW_REFUND`.

The existing init SQL is unchanged. Prisma maps `credit_wallets` and `credit_transactions` to camelCase model properties, preserving PostgreSQL UUIDs, INTs, VARCHAR lengths, defaults, nullability and the unique transaction code. SQL CHECK constraints remain in the init SQL and migration. Timestamps remain nullable in SQL; normal service writes populate them. An externally inserted null DTO timestamp or unknown transaction type produces an error rather than inventing a date or changing the shared DTO.

## Behaviour as built

- No authentication. The wallet and ledger reads trust `x-user-id`; reserve, settle and refund act on whichever `requesterId` / `courierId` the caller puts in the body.
- Balance changes use conditional database increments/decrements, and each escrow operation plus its ledger entry runs in one Prisma transaction. Insufficient funds cannot cause a negative balance, including during concurrent requests. A failed ledger insertion rolls back wallet creation and balance changes from that operation.
- No idempotency: repeating a reserve, settle or refund for the same `orderId` applies it again. Nothing links a settle/refund to an earlier reserve for that order.
- A wallet is created implicitly with 100 available credits on first read, first reserve, or first settle as courier; no `WELCOME_GRANT` ledger row is written for it.
- PostgreSQL generates transaction UUIDs; transaction codes are `TX-` plus 24 random hexadecimal characters (27 characters total), protected by the existing unique constraint. A uniqueness failure rolls back the transaction.
- Ledger reads sort by creation time descending, then ID descending to break timestamp ties.
- No events are consumed or published, and order-service does not call these endpoints.

## Differences from the documents

Persistence and transaction atomicity are implemented, but this does not complete all of F4 or Credit N1–N3. Authentication, order-specific escrow tracking, idempotency, event handling and performance criteria remain pending. F4.2.1–F4.2.2 describe available/reserved/total balances; the existing approved table and shared DTO instead include `totalEarnedCredits`, which this change preserves. How initial credits reach a newly registered user (F4.1) remains unresolved: `UserRegisteredEvent` exists, but user-service emits nothing.

## Tests

Create a separate database whose name includes `_test`, then run:

```bash
export CREDIT_TEST_DATABASE_URL=postgresql://postgres:postgres@localhost:5432/credit_service_test
DATABASE_URL="$CREDIT_TEST_DATABASE_URL" npm run db:deploy --workspace=@campus-errand/credit-service
npm run test:integration --workspace=@campus-errand/credit-service
npm run typecheck
```

The integration script uses a real PostgreSQL database and a temporary HTTP port. It verifies wallet creation, UUID/amount validation, reserve/settle/refund, insufficient funds, ledger filtering, persistence through a second client, concurrent first reads/reservations/settlements, and rollback after a real ledger unique-constraint failure. It deletes only the random test users and their transactions in `finally`. No additional test framework is required.

## Issues

#15–#22 (F4.0–F4.7), #42–#46 (Credit N1–N3), #69, #60.
