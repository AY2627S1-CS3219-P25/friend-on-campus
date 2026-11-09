<!--
AI Assistance Disclosure:
Tool: Codex (model: GPT-6), date: 2026-11-09
Scope: Reconcile current implementation, contracts, realtime delivery and verification limits; preserve historical records.
Author review: <to be completed by the author>

Tool: Codex (model: GPT-6), date: 2026-10-25
Scope: Source-linked implementation documentation and evidence review requested by Reallyeasy1.
Author review: <to be completed by Reallyeasy1>
-->

# Notification reliability and tests

Implementation checked against [`b989758`](https://github.com/AY2627S1-CS3219-P25/friend-on-campus/commit/b989758e766cb593c3b8c94102eb6dfb5c7d8491), 2026-11-09 (SGT). This describes repository behavior, not verified deployment state.

[Service overview](README.md) · [Contracts and data](contracts-and-data.md) · [Execution paths](implementation.md)

## Guarantees and limits

| Mechanism | What it establishes | Boundary |
|---|---|---|
| Atomic event application | Processed-event key, projection, all recipient rows and delivery intent commit together | Legacy fingerprint-null records cannot prove replay payload equality |
| Recipient uniqueness and fingerprint | Replayed business event does not duplicate inbox rows; changed payload for a known nonlegacy key is rejected | Publisher IDs/producers must follow the contract |
| Monotonic Order projection | Older versions cannot restore an older projected action state | Projection can lag Order; it never authorizes commands |
| Realtime outbox | A committed inbox/read change leaves an intent even if its process dies before publication | Broker confirmation is not browser acknowledgement |
| Per-replica fanout and owner reread | Each replica can deliver other replicas' changes to its own sockets | Temporary queue expiry/overflow, exhausted handler attempts or disconnect can lose hints |
| REST history and unread count | Missed hints can be reconciled from persisted state | Offset pages can shift while new rows arrive |

These are implementation properties, not measured deployment or SLA results. Durable inbox state and best-effort live hints have different failure guarantees. Full lease, queue and retry behavior is maintained once in [shared messaging](../../packages/messaging.md).

## Failure handling

The business consumer uses the quorum queue `notification-service.events`, prefetch/concurrency 1, default delay 2000 ms and transient retry threshold 5. Invalid envelopes and fingerprint conflicts are permanent failures; recognized infrastructure failures retry outside that application threshold; other failures use the transient budget. Permanent/exhausted messages dead-letter through the configured DLX/DLQ. A retry holds the single consumer slot, so an outage or poison event can delay later work on that replica.

The realtime subscriber has a separate bounded retry policy and **no DLQ**. A failed SQL-outbox publication remains scheduled for retry; a successfully published signal can still be missed by an offline browser. Realtime subscription loss closes sockets and temporarily removes readiness; clients reconnect and reload persisted state. A broker connection failure in the business consumer triggers the service's bounded shutdown.

## Tests

From the repository root with [test prerequisites](../../development/testing-strategy.md):

```bash
npm run test:unit -w @campus-errand/notification-service
npm run test:integration -w @campus-errand/notification-service
npm run test:messaging -w @campus-errand/notification-service
```

`NOTIFICATION_TEST_DATABASE_URL` enables PostgreSQL integration tests. Messaging/realtime integration also needs `NOTIFICATION_TEST_RABBITMQ_URL`. These suites skip when required configuration is missing. Use disposable test databases/broker resources; never run event-injection suites against production.

| Source | Coverage present in the suite |
|---|---|
| [`events.test.ts`](../../../services/notification-service/test/events.test.ts), [`policy.test.ts`](../../../services/notification-service/test/policy.test.ts) | V1/V2 validation, recipients, actor suppression, financial receipts and classification |
| [`hub.test.ts`](../../../services/notification-service/test/hub.test.ts), [`realtime.test.ts`](../../../services/notification-service/test/realtime.test.ts) | Socket authentication, expiry and delivery eligibility |
| [`store-routes.integration.test.ts`](../../../services/notification-service/test/store-routes.integration.test.ts) | Atomic recipients/dedup, fingerprint conflict, projection, owner-scoped filters/read behavior |
| [`messaging.integration.test.ts`](../../../services/notification-service/test/messaging.integration.test.ts) | Real PostgreSQL/broker consumer paths and failure handling |
| [`realtime.integration.test.ts`](../../../services/notification-service/test/realtime.integration.test.ts) | Two replicas, duplicate/stale/read/resolved signals, read-state synchronization, leases, broker reconnect and REST recovery |

Browser scenarios are in [`scripts/uat/uat-realtime.mjs`](../../../scripts/uat/uat-realtime.mjs). Inspect account, data and infrastructure assumptions before reuse. These tests were source-inspected for this refresh; none were executed here. Existing run evidence and its limitations belong in [testing](../../development/testing-strategy.md), not in an inferred deployment pass.

## Troubleshooting

- **No inbox row:** trace the producer event, business queue/DLQ and consumer logs; check parsing/policy suppression before diagnosing socket delivery.
- **Row present, no live update:** check the service's realtime health, pending outbox leases and subscriber connection; reload REST to distinguish durable state from a missed hint.
- **Wrong unread count in one tab:** compare the authenticated REST count, then check `INBOX_CHANGED` and reconnection. Do not infer counts by adding or subtracting frames.
- **Delivery action persists:** inspect the latest locally projected Order version and destination Order state; the projection is asynchronous.

Use the [broker runbook](../../infrastructure/cdc-and-broker.md) and [observability reference](../../new-cloud-architecture-guide.md) for operational tooling. Queue contents alone do not establish the reason for failure; do not replay or purge messages without identifying their owning workflow and idempotency behavior.
