<!--
AI Assistance Disclosure:
Tool: Codex (model: GPT-6), date: 2026-10-25
Scope: Source-linked implementation documentation and evidence review requested by Reallyeasy1.
Author review: <to be completed by Reallyeasy1>
-->

# Credit runtime, recovery and tests

Implementation baseline: [`52d791e`](https://github.com/AY2627S1-CS3219-P25/friend-on-campus/commit/52d791e4eea28ce7d817f025ef096f8d96bda467); inspected 2026-10-25 (SGT). Pending work is explicitly labelled.

`applyEvent` inserts the processed identity and applies the business operation inside one serializable transaction. The normalized fingerprint distinguishes replay from identity reuse with altered content. The same transaction persists reservation results to the outbox. A commit before ACK can be safely replayed through this identity guard.

## Financial flows

| Operation | Transactional effects |
|---|---|
| Welcome grant | Record grant, initialize wallet and grant ledger without duplicate allocation |
| Reserve | Check/initialize wallet as applicable, decrease available, increase escrow, record RESERVED escrow and ESCROW_HOLD ledger |
| Settle | Verify matching requester/courier/amount and RESERVED escrow, decrease requester escrow, credit courier available/earned, record settlement ledger and SETTLED |
| Refund | Verify requester and RESERVED escrow, return escrow to available, record refund ledger and REFUNDED |

Already terminal escrow does not repeat financial mutations. Invalid participant/amount/state combinations produce domain conflicts instead of silently transferring funds. HTTP wallet reads do not use the internal initialization path.

```mermaid
%% AI-generated (edited by Reallyeasy1)
sequenceDiagram
  participant Consumer
  participant Service
  participant Store as Serializable store
  participant DB as credit_db
  Consumer->>Service: Apply reservation request and fingerprint
  Service->>Store: Transaction
  Store->>DB: Record processed identity; create savepoint
  alt Reservation succeeds
    Store->>DB: Hold balances; escrow and ledger
    Store->>DB: Insert succeeded outbox
  else Business rejection
    Store->>DB: Roll back reserve attempt to savepoint
    Store->>DB: Insert failed outbox
  end
  Store->>DB: Commit result and identity
  Service-->>Consumer: Handler success; ACK
```

Savepoint rollback preserves the enclosing transaction's event identity and business-failure result while undoing attempted hold effects. Unexpected database/infrastructure failure rolls back the transaction instead of becoming a terminal insufficient-credit result.

## Retry and diagnostics

The Prisma store retries the whole transaction on P2034/P2002 up to 10 attempts. Broker retries are a separate layer: permanent failures dead-letter; recognized infrastructure errors requeue without transient threshold; unexpected retryable errors use configured threshold 5. Repeating these layers does not mean infinite retry of every business error.

Inspect service logs, processed identity, escrow state, ledger, result outbox, connector and queue as separate evidence. An Order HTTP completion is earlier than Credit settlement. No automatic dead-letter replay/alerting or manual balance repair API is provided.

## Test inventory

| Script | Source coverage |
|---|---|
| test:integration | credits.integration.test.ts: caller scope, internal financial rules, concurrency, rollback and idempotency |
| test:messaging | messaging.integration.test.ts: replay, conflict, failure/recovery and DLQ paths |
| test:migration | migration.integration.test.ts: only the initial migration in a temporary schema; five tables and selected constraints, excluding later outbox/CDC migrations |
| test:seed | seed.integration.test.ts: development initialization |

Current main has no Credit unit script; PR #184 adds unit tests. All four suites throw when CREDIT_TEST_DATABASE_URL is absent or unsafe. Messaging uses CREDIT_TEST_RABBITMQ_URL if supplied, otherwise a local test-broker default. Run through the existing isolated orchestration when available; do not use application data.

The actual source/CI evidence and local execution results are separate in the verification record. New receipt transaction/fingerprint behavior is reviewed in the pending PR audit.

## Source evidence and related reading

- [`services/credit-service/src/credits/service.ts`](../../../services/credit-service/src/credits/service.ts)
- [`services/credit-service/src/credits/store.ts`](../../../services/credit-service/src/credits/store.ts)
- [`services/credit-service/src/credits/consumer.ts`](../../../services/credit-service/src/credits/consumer.ts)
- [`services/credit-service/tests/credits.integration.test.ts`](../../../services/credit-service/tests/credits.integration.test.ts)
- [`services/credit-service/tests/messaging.integration.test.ts`](../../../services/credit-service/tests/messaging.integration.test.ts)
- [`services/credit-service/tests/migration.integration.test.ts`](../../../services/credit-service/tests/migration.integration.test.ts)
- [`services/credit-service/tests/seed.integration.test.ts`](../../../services/credit-service/tests/seed.integration.test.ts)
- [`services/credit-service/package.json`](../../../services/credit-service/package.json)
- [Wiki: Credit Service](https://github.com/AY2627S1-CS3219-P25/friend-on-campus/wiki/Credit-Service)
- [Documentation index](../../README.md) · [Drift register](../../audits/documentation-drift.md) · [Verification record](../../audits/review-findings.md)
