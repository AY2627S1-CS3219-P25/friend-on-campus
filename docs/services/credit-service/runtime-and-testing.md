<!--
AI Assistance Disclosure:
Tool: Codex (model: GPT-6), date: 2026-10-25
Scope: Source-linked implementation documentation and evidence review requested by Reallyeasy1.
Author review: <to be completed by Reallyeasy1>

Tool: Codex (model: GPT-6), date: 2026-11-09
Scope: Reconciled this guide with current service code, schemas, configuration and tests; consolidated duplicated reference material.
Author review: <to be completed by Reallyeasy1>
-->

# Credit runtime, recovery and tests

Source baseline: [`b989758`](https://github.com/AY2627S1-CS3219-P25/friend-on-campus/commit/b989758e766cb593c3b8c94102eb6dfb5c7d8491), inspected 2026-11-09 (SGT). This describes repository behavior, not a verified deployment.

## Financial flows

All amounts below are integer virtual credits. The ledger records the movement; an Order status or browser toast is not financial completion evidence.

| Operation | Balance movement | Ledger / outgoing result |
|---|---|---|
| Welcome grant | Add grant to available balance once | `WELCOME_GRANT` |
| Reserve reward | Requester available decreases; requester escrow increases | `ESCROW_HOLD`; reservation success/failure event |
| Settle delivery | Requester escrow decreases; courier available and earned increase | `ESCROW_RELEASE`; `credit.escrow.settled` |
| Refund cancellation/expiry | Requester escrow decreases; requester available increases | `ESCROW_REFUND`; `credit.escrow.refunded` |

Registration supplies the initial grant. Lazy initialization during reservation/settlement uses the service's default of `100`. The grant marker prevents a second welcome grant. An existing wallet without its grant marker, a marker without its wallet, or a conflicting grant amount is a consistency error; the service does not silently repair it.

A reservation has one identity per order and checks the original requester and amount. For a reservation-request event, a savepoint isolates attempted financial writes: a business failure rolls them back, but the outer transaction commits the processed-event marker and `credit.reservation.failed`. Infrastructure errors roll back the entire transaction for retry; they must not become insufficient-credit results.

Settlement requires reserved escrow matching requester and amount. It conditionally marks it `SETTLED`, debits requester escrow and credits the courier. Refund similarly moves `RESERVED` to `REFUNDED` and restores requester availability. A matching terminal replay is a no-op; settlement after refund, refund after settlement, or a different settlement courier conflicts. No terminal replay should create another ledger row or receipt.

## Idempotency and concurrency

`applyEvent` verifies the event identity before applying business changes in the same transaction. An identical processed event returns without reapplying; reuse of the ID with a different type or normalized payload conflicts. Distinct event IDs are also constrained by the escrow/grant business identity, so a repeated business command cannot pay twice merely by changing its event ID.

The [store](../../../services/credit-service/src/credits/store.ts) uses PostgreSQL `Serializable` transactions. It retries the whole operation for Prisma `P2034` / `P2002` conflicts, up to ten attempts, with a transaction timeout of ten seconds and maximum connection wait of five seconds. These transaction retries are separate from RabbitMQ delivery retries.

A committed settlement/refund writes the ledger, balances, escrow state and receipt outbox atomically. CDC publication and consumers are separate steps. To reconcile an apparently delayed order, inspect the corresponding escrow/ledger and outbox/consumer progress; do not infer payment failure from delayed UI notification or repeat a financial write manually.

## Retry and diagnostics

| Failure | Consumer handling |
|---|---|
| Invalid event, business conflict, recognized permanent database constraint violation | Dead-letter |
| Recognized infrastructure failure | Delayed retry without the transient attempt limit |
| Unknown processing error | Delayed retry up to the configured limit, then dead-letter |

See [shared messaging](../../packages/messaging.md) for acknowledgement and retry transport details. There is no automatic business repair or DLQ replay in Credit. Correct the cause and use a reviewed recovery procedure; replays remain subject to event and escrow identity checks.

For stalled reservations, follow Order request outbox → CDC → Credit consumer → Credit result outbox → CDC → Order consumer. For delayed settlement/refund, start with the triggering Order lifecycle event and Credit escrow/ledger. HTTP liveness does not establish that this chain is working. `/ready` checks database/consumer availability, not complete Saga progress or CDC health.

## Test inventory

After repository dependency installation and Prisma client generation, the no-infrastructure suite is:

```sh
npm run test:unit -w @campus-errand/credit-service
```

| Workspace script | Scope and prerequisites |
|---|---|
| `test:unit` | [`service.unit.test.ts`](../../../services/credit-service/tests/service.unit.test.ts) and [`events.unit.test.ts`](../../../services/credit-service/tests/events.unit.test.ts): financial rules, event parsing/replays and store retry behavior with test doubles |
| `test:integration` | [`credits.integration.test.ts`](../../../services/credit-service/tests/credits.integration.test.ts): real disposable PostgreSQL financial/concurrency checks |
| `test:messaging` | [`messaging.integration.test.ts`](../../../services/credit-service/tests/messaging.integration.test.ts): PostgreSQL plus RabbitMQ delivery, retry and replay behavior |
| `test:migration` | [`migration.integration.test.ts`](../../../services/credit-service/tests/migration.integration.test.ts): temporary schema checks for the original migration; not complete later CDC/outbox migration coverage |
| `test:seed` | [`seed.integration.test.ts`](../../../services/credit-service/tests/seed.integration.test.ts): development identity/seed behavior with disposable database fixtures |

Run other scripts with `npm run <script> -w @campus-errand/credit-service` only after preparing their isolated prerequisites. Read each test and the [aggregate runner](../../../scripts/ci/run-all-tests.mjs) before setting database/broker variables: these suites mutate test data. Never point them at live wallets.

Unit tests are implemented now; older descriptions that Credit has no `test:unit` command are obsolete. Test source inspection is not a passing execution or deployed acceptance result. No live financial, broker or CDC suite was run to refresh this document.

## Source evidence and related reading

- [Financial service](../../../services/credit-service/src/credits/service.ts) · [Consumer classification](../../../services/credit-service/src/credits/consumer.ts)
- [Package scripts](../../../services/credit-service/package.json) · [Contracts and data](contracts-and-data.md)
- [Order runtime](../order-service/runtime-and-testing.md) · [Documentation index](../../README.md) · [Verification record](../../audits/review-findings.md)
