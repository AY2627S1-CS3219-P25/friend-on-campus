<!--
AI Assistance Disclosure:
Tool: Claude Code (model: Claude Fable 5.1), date: 2026-09-21
Scope: Wrote this page from services/credit-service source, docker-compose.yml, the init SQL, common-dtos and D1 / D2-plan text. Descriptive only.
Author review: <to be completed by the service owner>
-->

# credit-service

**Status:** in-memory mock from the starter template. Port **8004**. `credit_db` exists but nothing connects to it. All balances and ledger rows are lost on restart.

## Responsibilities (from the documents)

Initial credit allocation on registration; available, reserved and total balances per user; reserve on errand creation; settle on completion; release on cancellation or expiry; transaction history; idempotent handling of duplicate requests and redelivered events; asynchronous integration through events. [D1 F4.0–F4.7; Credit Service N1–N3; D2 plan work package F, App. D]

## Run

```bash
npm run dev:credit       # needs nothing else running
```

## Configuration

`PORT` (default `8004`). `DATABASE_URL` and `RABBITMQ_URL` are read into constants and set in compose, but no code uses them.

## Files

`src/index.ts` only: `mockWallets` (two sample users), `mockLedger` (two sample rows), and every route.

## API

| Method & path | Identity used | Request | Success | Errors |
|---|---|---|---|---|
| `GET /api/credits/wallet` | `x-user-id` header, else a hardcoded user | — | 200 `CreditWalletDTO`; an unknown user gets a new wallet with 100 available | — |
| `GET /api/credits/ledger` | same | — | 200 `CreditTransactionDTO[]` where the user is sender or receiver | — |
| `POST /api/credits/escrow/reserve` | body | `EscrowReserveRequest`: `orderId, requesterId, amount` | 200 wallet | 400 insufficient available credits |
| `POST /api/credits/escrow/settle` | body | `EscrowSettleRequest`: `orderId, requesterId, courierId, amount` | 200 `{ requesterWallet, courierWallet }` | 400 insufficient escrow |
| `POST /api/credits/escrow/refund` | body | `EscrowRefundRequest`: `orderId, requesterId, amount` | 200 wallet | 400 insufficient escrow |

Only `/api/credits/` (with trailing slash) is routed by the gateway.

## Data

In memory: `CreditWalletDTO` (`userId, availableCredits, escrowCredits, totalEarnedCredits, updatedAt`) and `CreditTransactionDTO` (`id, transactionCode, fromUserId, toUserId, orderId, amount, transactionType, description, createdAt`), types `WELCOME_GRANT | ESCROW_HOLD | ESCROW_RELEASE | ESCROW_REFUND`.

In the init SQL (unused): `credit_wallets` (`user_id` PK, `available_credits INT DEFAULT 100 CHECK (>= 0)`, `escrow_credits CHECK (>= 0)`, `total_earned_credits`, timestamps) and `credit_transactions` (`id`, `transaction_code` unique, `from_user_id?`, `to_user_id?`, `order_id?`, `amount CHECK (> 0)`, `transaction_type`, `description?`, `created_at`). No Prisma schema mirrors them.

## Behaviour as built

- No authentication. The wallet and ledger reads trust `x-user-id`; reserve, settle and refund act on whichever `requesterId` / `courierId` the caller puts in the body.
- `amount` is not validated (type, sign, integer). Reserve compares `available < amount`; settle and refund compare `escrow < amount`.
- No idempotency: repeating a reserve, settle or refund for the same `orderId` applies it again. Nothing links a settle/refund to an earlier reserve for that order.
- A wallet is created implicitly with 100 available credits on first read, first reserve, or first settle as courier; no `WELCOME_GRANT` ledger row is written for it.
- `transactionCode` is `TX-` plus a random 4-digit number, so collisions are possible.
- No events are consumed or published, and order-service does not call these endpoints.

## Differences from the documents

All of F4 as real, persistent, idempotent behaviour, and Credit N1–N3. `../requirements/conflicts.md` row 6: D1's wallet mockup subtracts reserved credits twice. How initial credits reach a new user (F4.1) is not written down: `UserRegisteredEvent` exists in `common-dtos`, user-service emits nothing.

## Tests

None.

## Issues

#15–#22 (F4.0–F4.7), #42–#46 (Credit N1–N3), #69, #60.
