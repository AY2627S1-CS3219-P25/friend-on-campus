<!--
AI Assistance Disclosure:
Tool: Codex (model: GPT-6), date: 2026-10-25
Scope: Source-linked implementation documentation and evidence review requested by Reallyeasy1.
Author review: <to be completed by Reallyeasy1>
-->

# Credit contracts and data

Implementation baseline: [`52d791e`](https://github.com/AY2627S1-CS3219-P25/friend-on-campus/commit/52d791e4eea28ce7d817f025ef096f8d96bda467); inspected 2026-10-25 (SGT). Pending work is explicitly labelled.

## HTTP and event interfaces

| Interface | Access/input | Result |
|---|---|---|
| GET /api/credits/wallet | Token user; no arbitrary owner parameter | Wallet DTO; missing wallet 404 without creation |
| GET /api/credits/ledger | Token user; query parameters ignored | success:true,data:CreditTransactionDTO[]; all caller-visible rows, createdAt DESC then id DESC |
| GET /health | Public | Process liveness |
| GET /ready | Public | Database and consumer readiness, 200/503 |

Reserve/settle/refund are internal operations, not HTTP endpoints. Gateway returns 403 for the escrow prefix; direct service calls have no corresponding route. Protected reads return shared-auth 401 on invalid/missing token. Domain errors preserve their status; unexpected errors do not become a successful financial result.

| Consumed event | Required business identifiers/effect |
|---|---|
| user.registered | userId, email, initialGrant; record welcome grant and wallet/ledger |
| order.reservation.requested | orderId, requesterId, rewardCredits, correlationId; reserve or failure result |
| order.completed | orderId, requesterId, courierId, rewardCredits; settle RESERVED escrow |
| order.cancelled | orderId, requesterId, rewardCredits; refund matching reserved escrow |
| order.expired | orderId, requesterId, rewardCredits; refund matching reserved escrow |

Every event requires `eventId`, matching `eventType` and a UTC `timestamp`, in addition to the fields above. Parsers check event/routing-key agreement, identifiers, timestamps and required amounts/participants. Normalized payload is hashed for processed-event identity. Exact replay is a no-op; reusing identity with different content is a conflict. This is scoped idempotent business processing, not a promise of exactly-once transport.

Only reservation results are written to the Credit outbox at this baseline: credit.reservation.succeeded/failed. No post-settlement/refund receipt event exists on main.

## Persistence and invariants

Wallet uses user UUID as primary key and separates available, escrow and total-earned balances. Escrow uses order UUID as primary key and transitions from RESERVED to SETTLED or REFUNDED. Grant identity prevents duplicate welcome allocation. Processed events persist event type and fingerprint. Ledger has unique transaction code, amount/type, optional participant/order IDs and timestamp.

Migrations check available/escrow balances ≥0, ledger/grant/escrow amounts >0, allowed escrow states, and SETTLED iff courier is non-null. There is no SQL transaction-type CHECK or total-earned nonnegative CHECK; transaction-type validation occurs during DTO conversion. Conditional balance updates and escrow-state predicates enforce mutation preconditions. Cross-service IDs are scalar; database ownership does not provide cross-database foreign keys. All financial updates must be interpreted with their enclosing transaction in service/store, not as isolated helper calls.


## Schema field inventory

This inventory is extracted from the baseline Prisma schema. SQL-only checks and expression indexes are discussed above; a Prisma annotation is not an exhaustive database constraint inventory.

### CreditWallet

| Field | Prisma declaration |
|---|---|
| `userId` | `String    @id @map("user_id") @db.Uuid` |
| `availableCredits` | `Int       @default(100) @map("available_credits")` |
| `escrowCredits` | `Int       @default(0) @map("escrow_credits")` |
| `totalEarnedCredits` | `Int       @default(0) @map("total_earned_credits")` |
| `createdAt` | `DateTime? @default(now()) @map("created_at") @db.Timestamptz(6)` |
| `updatedAt` | `DateTime? @default(now()) @map("updated_at") @db.Timestamptz(6)` |
| Model constraint | `@@map("credit_wallets")` |

### CreditTransaction

| Field | Prisma declaration |
|---|---|
| `id` | `String    @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid` |
| `transactionCode` | `String    @unique @map("transaction_code") @db.VarChar(30)` |
| `fromUserId` | `String?   @map("from_user_id") @db.Uuid` |
| `toUserId` | `String?   @map("to_user_id") @db.Uuid` |
| `orderId` | `String?   @map("order_id") @db.Uuid` |
| `amount` | `Int` |
| `transactionType` | `String    @map("transaction_type") @db.VarChar(30)` |
| `description` | `String?` |
| `createdAt` | `DateTime? @default(now()) @map("created_at") @db.Timestamptz(6)` |
| Model constraint | `@@map("credit_transactions")` |

### CreditGrant

| Field | Prisma declaration |
|---|---|
| `userId` | `String   @id @map("user_id") @db.Uuid` |
| `amount` | `Int` |
| `createdAt` | `DateTime @default(now()) @map("created_at") @db.Timestamptz(6)` |
| Model constraint | `@@map("credit_grants")` |

### CreditEscrow

| Field | Prisma declaration |
|---|---|
| `orderId` | `String   @id @map("order_id") @db.Uuid` |
| `requesterId` | `String   @map("requester_id") @db.Uuid` |
| `courierId` | `String?  @map("courier_id") @db.Uuid` |
| `amount` | `Int` |
| `state` | `String   @db.VarChar(16)` |
| `createdAt` | `DateTime @default(now()) @map("created_at") @db.Timestamptz(6)` |
| `updatedAt` | `DateTime @default(now()) @map("updated_at") @db.Timestamptz(6)` |
| Model constraint | `@@map("credit_escrows")` |

### ProcessedCreditEvent

| Field | Prisma declaration |
|---|---|
| `eventId` | `String   @id @map("event_id") @db.Uuid` |
| `eventType` | `String   @map("event_type") @db.VarChar(64)` |
| `fingerprint` | `String   @db.VarChar(64)` |
| `processedAt` | `DateTime @default(now()) @map("processed_at") @db.Timestamptz(6)` |
| Model constraint | `@@map("processed_credit_events")` |

### CreditOutboxEvent

| Field | Prisma declaration |
|---|---|
| `id` | `String   @id @db.Uuid` |
| `aggregateType` | `String   @default("credit") @map("aggregate_type") @db.VarChar(64)` |
| `aggregateId` | `String   @default("") @map("aggregate_id") @db.VarChar(64)` |
| `eventType` | `String   @map("event_type") @db.VarChar(64)` |
| `payload` | `String   @db.Text` |
| `status` | `String   @default("PENDING") @db.VarChar(20)` |
| `retryCount` | `Int      @default(0) @map("retry_count")` |
| `createdAt` | `DateTime @default(now()) @map("created_at") @db.Timestamptz(6)` |
| `updatedAt` | `DateTime @default(now()) @updatedAt @map("updated_at") @db.Timestamptz(6)` |
| Model constraint | `@@index([status, createdAt], map: "credit_outbox_status_created_at_idx")` |
| Model constraint | `@@map("credit_outbox_events")` |

## Source evidence and related reading

- [`services/credit-service/src/credits/routes.ts`](../../../services/credit-service/src/credits/routes.ts)
- [`services/credit-service/src/credits/events.ts`](../../../services/credit-service/src/credits/events.ts)
- [`services/credit-service/src/credits/types.ts`](../../../services/credit-service/src/credits/types.ts)
- [`services/credit-service/src/credits/errors.ts`](../../../services/credit-service/src/credits/errors.ts)
- [`services/credit-service/prisma/schema.prisma`](../../../services/credit-service/prisma/schema.prisma)
- [`services/credit-service/prisma/migrations/20260924050000_init/migration.sql`](../../../services/credit-service/prisma/migrations/20260924050000_init/migration.sql)
- [`services/credit-service/prisma/migrations/20261018150000_reservation_outbox/migration.sql`](../../../services/credit-service/prisma/migrations/20261018150000_reservation_outbox/migration.sql)
- [`services/credit-service/prisma/migrations/20261019120000_cdc_outbox_columns/migration.sql`](../../../services/credit-service/prisma/migrations/20261019120000_cdc_outbox_columns/migration.sql)
- [Wiki: Credit Service](https://github.com/AY2627S1-CS3219-P25/friend-on-campus/wiki/Credit-Service)
- [Documentation index](../../README.md) · [Drift register](../../audits/documentation-drift.md) · [Verification record](../../audits/review-findings.md)
