<!--
AI Assistance Disclosure:
Tool: Codex (model: GPT-6), date: 2026-10-25
Scope: Source-linked implementation documentation and evidence review requested by Reallyeasy1.
Author review: <to be completed by Reallyeasy1>
-->

# Service boundaries

Implementation baseline: [`52d791e`](https://github.com/AY2627S1-CS3219-P25/friend-on-campus/commit/52d791e4eea28ce7d817f025ef096f8d96bda467); inspected 2026-10-25 (SGT). Pending work is explicitly labelled.

Use this ownership map when tracing a request or reviewing a change. It describes existing boundaries, not proposed module reorganizations.

| Owner | Responsibilities | Public entry points | Does not own |
|---|---|---|---|
| User | Accounts, password hashes, token issuance, refresh sessions, user administration | /api/auth, /api/users | Wallet balances and financial settlement |
| Supplier | Campus pickup-directory records, availability and admin CRUD | /api/suppliers | Order acceptance or credit reservation |
| Order | Errand state, assignee, supplier snapshot, reservation outcome application, expiry | /api/orders; credit.reservation.* consumer | Credit balance/ledger mutation |
| Credit | Wallets, grants, escrow, ledger and processed-event identities | /api/credits/wallet and /ledger; event consumer | Order lifecycle state |
| Notification | Requester notification persistence, read state, authenticated real-time delivery | /api/notifications and WebSocket; order event consumer | Order/wallet mutation or saga decisions |

All services expose health/readiness routes, with different dependency checks. Client applications coordinate API calls but cannot authorize their own privileges. Admin UI role checks are user experience gates; backend middleware is the enforcement point.

Shared packages have narrower roles: `auth` verifies tokens offline; `common-dtos` declares compile-time contracts; `messaging` owns broker connection/topology/retry utilities. Runtime validation remains in service code. None is a shared business-data repository.

Cross-service IDs are scalar references. A User deletion does not cascade through other databases. Supplier name/zone are copied into orders; a later supplier edit does not rewrite those snapshots. Eventual credit initialization means an immediate wallet read after registration can return 404 while CDC processing is pending.

## Tracing a feature

Trace browser action → API wrapper → gateway/Vite route → service router → business module → repository/transaction → outbox/consumer → user-visible response. Consult [communication and events](communication-and-events.md) before attributing a financial effect to an HTTP response. Follow [component navigation](../README.md) for file-level maps.

## Open boundaries

The shared OrderStatus type declares DISPUTED, but no inspected current Order transition produces it. Pending chat and inbox PRs do not establish current interfaces. Requirements, issue criteria and implementation disagreements belong in the drift register and remain human decisions.

## Source evidence and related reading

- [`packages/auth/src/index.ts`](../../packages/auth/src/index.ts)
- [`packages/common-dtos/src/index.ts`](../../packages/common-dtos/src/index.ts)
- [`packages/messaging/src/index.ts`](../../packages/messaging/src/index.ts)
- [`services/order-service/src/repositories/order.repository.ts`](../../services/order-service/src/repositories/order.repository.ts)
- [Wiki: Services](https://github.com/AY2627S1-CS3219-P25/friend-on-campus/wiki/Services)
- [Documentation index](../README.md) · [Drift register](../audits/documentation-drift.md) · [Verification record](../audits/review-findings.md)
