<!--
AI Assistance Disclosure:
Tool: Codex (model: GPT-6), date: 2026-11-09
Scope: Reconcile implementation guidance with current source, simplify duplication and preserve historical attribution.
Author review: <to be completed by the author>

Tool: Codex (model: GPT-6), date: 2026-10-25
Scope: Source-linked implementation documentation and evidence review requested by Reallyeasy1.
Author review: <to be completed by Reallyeasy1>
-->

# Shared contracts

Implementation baseline: [`b989758`](https://github.com/AY2627S1-CS3219-P25/friend-on-campus/commit/b989758e766cb593c3b8c94102eb6dfb5c7d8491); source inspected 2026-11-09 (SGT). This describes the repository, not a verified live deployment.

`@campus-errand/common-dtos` exports TypeScript declarations used by services and browser clients. It is a compile-time contract package, not runtime validation or a schema registry. Use [the source](../../packages/common-dtos/src/index.ts) for exact fields and each service's contracts guide for actual routes, envelopes and validation.

| Export group | Current use and important boundary |
|---|---|
| User/authentication/JWT | User routes, shared auth and both apps; registered claims include optional display username |
| Supplier | Directory, admin forms and Order supplier lookup; create coordinates are required, while returned legacy coordinates can be null/absent |
| Order and admin actions | Lifecycle/status/version, dispute details, locations and optional drop-off/estimate fields |
| Errand draft parsing | AI-assisted form draft and warnings; a draft is not a submitted order |
| Credit wallet/ledger/transactions | Wallet reads, reservation, settlement and refund outcomes |
| Registration and versioned Order/Credit events | Cross-service asynchronous contracts; actual producers, bindings and accepted versions are in the [event catalogue](../architecture/communication-and-events.md) |
| Notification | Eleven kinds covering order progress/outcomes and financial receipts; category, priority, action/target, source version and inbox page/unread metadata |
| Chat | Conversation/message DTOs, ordered history, AUTH/SEND client frames and AUTH_OK/MESSAGE/ERROR server frames |
| Generic API/pagination helpers | Shared shapes, although concrete route envelopes differ |

`DISPUTED` remains in `OrderStatus`, but the implemented dispute workflow records a `dispute` flag and party details on the order. Do not infer an implemented status transition from that enum member. Likewise, an event union does not prove that every service publishes or consumes every member.

The inbox and versioned event contracts formerly discussed in PR #184 are present at this baseline. Chat contracts and frontend integration are also present; they are not pending PR #148 work. Read the [Notification](../services/notification-service/contracts-and-data.md), [Chat](../services/chat-service/README.md) and [Order](../services/order-service/contracts-and-data.md) guides for their implemented boundaries.

## Validation and changes

Changing a type alone does not change runtime input checks, stored data or compatible event versions. Follow a proposed interface change through producer, consumer, tests and migration needs. This documentation cleanup changes no interfaces or requirements.

The [package](../../packages/common-dtos/package.json) has build/typecheck scripts and no package-local runtime test suite. Use the root `npm run typecheck` to check consumers. Service validation/integration tests establish runtime behavior; typechecking is not delivery or deployment evidence.

[Documentation index](../README.md) · [Drift register](../audits/documentation-drift.md) · [Verification record](../audits/review-findings.md)
