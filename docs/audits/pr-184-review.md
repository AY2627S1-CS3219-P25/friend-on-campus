<!--
AI Assistance Disclosure:
Tool: Codex (model: GPT-6), date: 2026-10-25
Scope: Source-linked implementation documentation and evidence review requested by Reallyeasy1.
Author review: <to be completed by Reallyeasy1>
-->

# PR #184 inspection and pending-change audit

Implementation baseline: [`52d791e`](https://github.com/AY2627S1-CS3219-P25/friend-on-campus/commit/52d791e4eea28ce7d817f025ef096f8d96bda467); inspected 2026-10-25 (SGT). Pending work is explicitly labelled.

Inspected [PR #184](https://github.com/AY2627S1-CS3219-P25/friend-on-campus/pull/184) at **`a5e1f5bc23e0d3fb06820519ead2377e87652f31`**, compared with main **`52d791e4eea28ce7d817f025ef096f8d96bda467`**, on 2026-10-25 SGT. PR state was open/unmerged. This document describes that branch separately; it does not merge it, approve its design, or change production code. No review/comments were posted to the existing PR.

## Findings

| Priority | Finding | Evidence and reproduction |
|---|---|---|
| P1 | Delayed previous-session responses can appear in the next account's inbox | [apps/student-app/src/notifications/useNotifications.ts:76](https://github.com/AY2627S1-CS3219-P25/friend-on-campus/blob/a5e1f5bc23e0d3fb06820519ead2377e87652f31/apps/student-app/src/notifications/useNotifications.ts#L76); logout resets state without invalidating requests. Actual-hook deferred-fetch harness: Alice request waits, logout/login Bob, Alice then Bob complete; cache contains both bob-private and alice-private. |
| P2 | Filtered refresh retains rows absent from the server result | [apps/student-app/src/notifications/inbox.ts:62](https://github.com/AY2627S1-CS3219-P25/friend-on-campus/blob/a5e1f5bc23e0d3fb06820519ead2377e87652f31/apps/student-app/src/notifications/inbox.ts#L62) and hook applyPages: cached Unread n1 plus server total=0/unreadCount=0 leaves n1 visible with readAt=null. Other-tab read or resolved action can therefore remain displayed. |
| P2 | Switching views during Load more drops the queued refresh | [apps/student-app/src/notifications/useNotifications.ts:109](https://github.com/AY2627S1-CS3219-P25/friend-on-campus/blob/a5e1f5bc23e0d3fb06820519ead2377e87652f31/apps/student-app/src/notifications/useNotifications.ts#L109): view effect sets rerun while loading, but loadMore's finally does not drain it. Actual-hook harness selected Important during All page 2; no Important request followed and All total=100 appeared under Important. |
| P2 | Focused authoritative order does not control the action card | [apps/student-app/src/App.tsx:231](https://github.com/AY2627S1-CS3219-P25/friend-on-campus/blob/a5e1f5bc23e0d3fb06820519ead2377e87652f31/apps/student-app/src/App.tsx#L231) and [apps/student-app/src/pages/TasksPage.tsx:288](https://github.com/AY2627S1-CS3219-P25/friend-on-campus/blob/a5e1f5bc23e0d3fb06820519ead2377e87652f31/apps/student-app/src/pages/TasksPage.tsx#L288): focusOrder is separate from cached orders. Actual React rendering showed a COMPLETED banner and enabled Confirm Delivery for a cached DELIVERED card. Backend validation still protects the mutation. |
| P2 | List transaction does not establish the claimed single snapshot | [services/notification-service/src/notifications/store.ts:215](https://github.com/AY2627S1-CS3219-P25/friend-on-campus/blob/a5e1f5bc23e0d3fb06820519ead2377e87652f31/services/notification-service/src/notifications/store.ts#L215) uses sequential transaction queries without isolation override. Under default PostgreSQL READ COMMITTED, item/count queries may observe different commits. This finding is source-backed; no local DB reproduction was run. |

The first four are executable in-memory reproductions against actual branch source, not live-browser UAT. They require regression coverage of request/session ownership, filtered removals and authoritative action state. This review does not prescribe a new architecture.

For the snapshot finding, a controlled concurrent writer can mark the sole unread item read between item selection and counts, yielding an unread row with total/unreadCount zero. Prisma's unspecified isolation uses the database configuration; PostgreSQL READ COMMITTED takes a new snapshot per statement. References: [Prisma v6 transactions](https://www.prisma.io/docs/orm/v6/prisma-client/queries/transactions), [PostgreSQL 16 isolation](https://www.postgresql.org/docs/16/transaction-iso.html). The test named one-snapshot has no concurrent writer.

## Verified changes from main

| Area | PR implementation |
|---|---|
| Order facts | Optional v2 envelope on existing events; new order.rejected/order.unassigned; committed orderVersion/status, actor/reason and prior assignee; state update and event in one transaction |
| Credit | Ledger-linked settled/refunded receipt outbox records in financial transaction; replay does not create another receipt; orderCode excluded from legacy fingerprint identity |
| Notification policy | policy.ts recipient/copy rules; actor exclusion and recipient dedup; legacy three alerts retained |
| Persistence | processed_notification_events unique by producer/event; fingerprint mismatch detection; per-recipient uniqueness; order_notification_state advances only on greater version |
| Delivery | Eleven subscriptions including two financial outcomes; stale order versions stored as history but no live notification; INBOX_CHANGED hints |
| REST | Server views all/action_needed/important, unread filter, arrival-time ordering, extended DTO and authoritative count fields |
| Retry | Recognized infrastructure failures use unbounded shared classification; unexpected failures default threshold 5, delay 2 seconds |
| Browser | REST-first paging/filters; periodic, focus and visibility reconciliation; typed destinations and focused order lookup |
| CI | Student/Credit unit matrix; optional CLAUDE_PR_REVIEW_ENABLED variable; draft/fork skipping retained |

Explicit schemaVersion=1 is not the legacy wire form accepted by the parser; legacy means schemaVersion absent. Credit receipts do not advance Order projection. A policyVersion field does not automatically reprocess already claimed events. Socket registry remains process-local.

## Upgrade and rollback facts

Migration `20261022120000_recipient_inbox` preserves row IDs/read timestamps/event timestamps, backfills stored_at from created_at and adds recipient identity. It drops the global event_id unique index and makes category/priority required without defaults. **The old Notification binary is incompatible after migration:** its ON CONFLICT(event_id) target is gone and it omits new required columns. Do not assume mixed binaries or code-only rollback work.

Legacy processed identities have null fingerprints; replay is treated as duplicate without content comparison. The new order projection starts empty; legacy delivered alerts can qualify as action-needed while actual Order state is unknown. No historical receipt backfill is provided for already-settled/refunded escrow. These are compatibility limitations, not independently selected migration policy.

## Tests and prior review

- Previous filtered-view/offset-window fixes are present, and five main-versus-PR Credit event-family fingerprint checks matched. The original review threads' author replies alone were not used as proof.
- Actual PR inbox.test.ts: 9/9 passed in the in-memory runner. Those helper/synchronous fake-client tests miss the reproduced hook lifecycle cases.
- Actual completeEvent check retained committed version/status and prior courier.
- The migration-named integration test migrates an empty table then manually creates a legacy identity; it does not test populated backfill preservation.
- The partial-write test manually removes an identity after commit, rather than faulting during the transaction and demonstrating rollback.
- Broker retry tests throw plain unexpected errors; they do not prove recognized infrastructure retries beyond the limit or actual database recovery.
- New test/inbox.test.ts is outside student-app's src-only tsconfig; tsx execution is not full test-source typechecking.

No PostgreSQL/RabbitMQ/Chromium run was performed locally for this PR inspection. Historical PR-reported test counts are not new results. Main-baseline tests are recorded separately in [review findings](review-findings.md).

The branch plan still defers financial receipts in some passages although this PR now implements them. The Wiki AWS proposal also describes a narrower scope. Record these disagreements for the human author; do not choose D4 priorities or infer approval from publication.

## Documentation integration

Current service pages remain pinned to main. After an authorized merge, update the event catalogue, Notification contracts/data/implementation/tests, frontend guide, Credit receipt flow, migration notes and scoped evidence together. Preserve this audit's original head and append any later resolution separately.

## Source evidence and related reading

- [`services/notification-service/src/notifications/store.ts`](../../services/notification-service/src/notifications/store.ts)
- [`apps/student-app/src/notifications/useNotifications.ts`](../../apps/student-app/src/notifications/useNotifications.ts)
- [`packages/common-dtos/src/index.ts`](../../packages/common-dtos/src/index.ts)
- [Wiki: Notification Service](https://github.com/AY2627S1-CS3219-P25/friend-on-campus/wiki/Notification-Service)
- [Documentation index](../README.md) · [Drift register](documentation-drift.md) · [Verification record](review-findings.md)
