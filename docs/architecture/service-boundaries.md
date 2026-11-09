<!--
AI Assistance Disclosure:
Tool: Codex (model: GPT-6), date: 2026-11-09
Scope: Reconcile the active documentation with main b989758 and simplify navigation; preserve historical attribution.
Author review: <to be completed by Reallyeasy1>

Tool: Codex (model: GPT-6), date: 2026-10-25
Scope: Source-linked implementation documentation and evidence review requested by Reallyeasy1.
Author review: <to be completed by Reallyeasy1>
-->

# Service boundaries

Implementation inspected at [`b989758`](https://github.com/AY2627S1-CS3219-P25/friend-on-campus/commit/b989758e766cb593c3b8c94102eb6dfb5c7d8491) on 9 November 2026 (SGT). This is a code/configuration reference, not verification of the live deployment.

Use this map to find the owner of a change. Shared contracts describe messages and API shapes; they do not transfer business-data ownership.

| Owner | Responsibilities | Entry points | Boundary |
|---|---|---|---|
| [User](../services/user-service/README.md) | Accounts, login, refresh sessions, profile and administration | `/api/auth`, `/api/users` | Does not own wallets or financial settlement |
| [Supplier](../services/supplier-service/README.md) | Directory, location data and admin CRUD | `/api/suppliers` | Does not reserve credits or claim errands |
| [Order](../services/order-service/README.md) | Errand lifecycle, assignment, supplier snapshots, disputes and assistant drafts | `/api/orders`, Credit reservation-result consumer | Commits lifecycle state; Credit commits money effects separately |
| [Credit](../services/credit-service/README.md) | Welcome grants, wallet/ledger, escrow and financial receipts | `/api/credits/wallet`, `/api/credits/ledger`, domain-event consumer | Does not decide Order lifecycle transitions |
| [Notification](../services/notification-service/README.md) | Recipient inbox, read state, lifecycle projection and realtime delivery | `/api/notifications`, `/ws/`, Order/Credit events | Reads facts; does not complete or refund orders |
| [Chat](../services/chat-service/README.md) | Conversation projection, messages, translation/moderation and realtime delivery | `/api/chat`, `/ws/chat/`, Order events | Its participant/status projection has documented freshness limits |

The [auth package](../packages/auth.md) verifies access tokens offline. [Common DTOs](../packages/common-dtos.md) supply TypeScript contracts; each service still validates input at runtime. [Messaging](../packages/messaging.md) supplies broker and realtime infrastructure. The [LLM package](../../packages/llm/src/index.ts) is a shared external-API helper, not another backend service.

## Consistency boundaries

- Cross-service IDs are scalar references, not cross-database foreign keys. Deleting a User does not cascade into Order, Credit, Chat or Notification databases.
- Orders retain supplier snapshots; directory edits do not rewrite existing orders.
- A wallet may be unavailable immediately after registration while `user.registered` is still being processed.
- An Order success response and a later Credit receipt represent different commits. Follow the [Saga and event flow](communication-and-events.md).
- UI role checks improve navigation; backend authorization is the enforcement point. Gateway routing is not authorization.

Trace a feature from browser API wrapper through gateway/Vite routing, service router, transaction/outbox and consumer to its persisted UI result. Current detail lives in the service references above; older proposals and reviewed PR snapshots live in the [archive](../archive/README.md).

[Documentation index](../README.md) · [Data ownership](data-ownership.md) · [Open discrepancies](../audits/documentation-drift.md)
