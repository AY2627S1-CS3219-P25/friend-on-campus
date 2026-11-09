<!--
AI Assistance Disclosure:
Tool: Codex (model: GPT-6), date: 2026-10-25
Scope: Source-linked implementation documentation and evidence review requested by Reallyeasy1.
Author review: <to be completed by Reallyeasy1>

Tool: Codex (model: GPT-6), date: 2026-11-09
Scope: Reconciled this guide with current service code, schemas, configuration and tests; consolidated duplicated reference material.
Author review: <to be completed by Reallyeasy1>
-->

# Credit contracts and data

Source baseline: [`b989758`](https://github.com/AY2627S1-CS3219-P25/friend-on-campus/commit/b989758e766cb593c3b8c94102eb6dfb5c7d8491), inspected 2026-11-09 (SGT). This describes repository behavior, not a verified deployment.

## HTTP and event interfaces

Both HTTP routes require a verified access token and derive the user ID from that token. Query/body parameters do not select another user's wallet.

| Route | Result |
|---|---|
| `GET /api/credits/wallet` | Caller wallet; `404` if absent; does not create it |
| `GET /api/credits/ledger` | Transactions where caller is sender or recipient, newest first by `createdAt`, then ID; currently unpaginated |

Responses use `{ success: true, data }`; known credit failures use `{ success: false, error }`. There are no HTTP reserve, settle, refund or administrative ledger-repair routes. See [routes](../../../services/credit-service/src/credits/routes.ts) and [store queries](../../../services/credit-service/src/credits/store.ts).

The consumer accepts these routing keys:

| Incoming event | Credit operation |
|---|---|
| `user.registered` | Initialize wallet and one welcome grant |
| `order.reservation.requested` | Reserve reward and publish success/failure result |
| `order.completed` | Settle escrow to the assigned courier |
| `order.cancelled` | Refund reserved reward to requester |
| `order.expired` | Refund reserved reward to requester |

The [parser](../../../services/credit-service/src/credits/events.ts) checks event/routing-key agreement, UUID identities, UTC timestamps and positive integer amounts within PostgreSQL integer range. It normalizes UUID case and builds a SHA-256 fingerprint from the normalized event. Optional `orderCode` is excluded from that fingerprint so older otherwise-identical replays still match; it is not financial identity. Extra envelope fields are ignored.

### Outgoing events

| Event | Meaning |
|---|---|
| `credit.reservation.succeeded` | Reservation and associated financial writes committed |
| `credit.reservation.failed` | Business reservation failure recorded; attempted reservation writes rolled back |
| `credit.escrow.settled` | Escrow settlement, courier credit and ledger transaction committed |
| `credit.escrow.refunded` | Escrow refund, requester credit and ledger transaction committed |

Reservation results retain the request correlation ID and carry order, requester and reward; failure adds a reason. Settlement/refund receipts include schema version `2`, producer `credit-service`, order/correlation IDs, amount, beneficiary, ledger transaction ID and transaction code. Optional order code is display metadata; event-driven receipts also identify the causative Order event. A receipt is inserted in the same transaction as its financial changes; downstream delivery still depends on CDC and the broker.

## Persistence and invariants

| Model | Purpose and key identity |
|---|---|
| `CreditWallet` | Per-user available, escrow and earned balances; user ID is the primary key |
| `CreditTransaction` | Immutable operation record with unique transaction code and participant/order references |
| `CreditGrant` | One welcome grant marker per user |
| `CreditEscrow` | One reservation per order; state `RESERVED`, `SETTLED` or `REFUNDED` |
| `ProcessedCreditEvent` | Event ID, type and normalized fingerprint for transactional deduplication |
| `CreditOutboxEvent` | Result/receipt payload inserted with the business transaction for CDC delivery |

Available and escrow balances cannot go negative; amounts must be positive. Escrow stores its original requester and amount, and settlement records its courier. The service rejects conflicting replay identities, attempts to settle refunded escrow, and attempts to refund settled escrow. User/order IDs are scalar cross-service references, not database foreign keys to User or Order.

Credit uses serializable transactions and conditional balance/escrow updates. The processed-event marker, balance mutations, ledger records and applicable outbox event commit together. This provides idempotent financial processing over at-least-once message delivery, not exactly-once transport.

Use the [Prisma schema](../../../services/credit-service/prisma/schema.prisma) and [SQL migrations](../../../services/credit-service/prisma/migrations) for exact columns, indexes and database checks. A copied field inventory would duplicate those canonical definitions. Outbox status/retry columns are not confirmation that a consumer received an event.

## Source evidence and related reading

- [Financial operations and receipt construction](../../../services/credit-service/src/credits/service.ts)
- [Event validation](../../../services/credit-service/src/credits/events.ts) · [Transaction adapter](../../../services/credit-service/src/credits/store.ts)
- [Runtime and testing](runtime-and-testing.md) · [Credit overview](README.md) · [Documentation index](../../README.md)
