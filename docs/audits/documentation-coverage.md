<!--
AI Assistance Disclosure:
Tool: Codex (model: GPT-6), date: 2026-11-09
Scope: Reconcile the active documentation with main b989758 and simplify navigation; preserve historical attribution.
Author review: <to be completed by Reallyeasy1>

Tool: Claude Code (model: Claude Fable 5.1), date: 2026-10-25
Scope: Added the Chat (pending PR #148) coverage row; other rows unchanged and not reverified.
Author review: <to be completed by Reallyeasy1>

Tool: Codex (model: GPT-6), date: 2026-10-25
Scope: Source-linked implementation documentation and evidence review requested by Reallyeasy1.
Author review: <to be completed by Reallyeasy1>
-->

# Documentation coverage

Implementation inspected at [`b989758`](https://github.com/AY2627S1-CS3219-P25/friend-on-campus/commit/b989758e766cb593c3b8c94102eb6dfb5c7d8491) on 9 November 2026 (SGT). This is a code/configuration reference, not verification of the live deployment.

Coverage here means source inspection and documentation reconciliation. Runtime verification is recorded separately in [review findings](review-findings.md).

| Area | Current reference | Evidence inspected |
|---|---|---|
| Components, ownership, events and security | [Architecture](../architecture/system-overview.md) | Service composition, Prisma schemas, event producers/consumers, JWT and gateway boundaries |
| User / Supplier | [User](../services/user-service/README.md), [Supplier](../services/supplier-service/README.md) | Routes, validation, persistence, migrations, seeds and test contracts |
| Order / Credit Saga | [Order](../services/order-service/README.md), [Credit](../services/credit-service/README.md) | Lifecycle predicates, v2 domain events, escrow transactions/receipts, idempotency and failure paths |
| Notification / Chat | [Notification](../services/notification-service/README.md), [Chat](../services/chat-service/README.md) | Recipient mapping, inbox projection, local authorization, history and realtime outboxes/relays |
| Frontends | [Student](../frontend/student-app.md), [admin](../frontend/admin-portal.md) | Modular pages, API wrappers, refresh/reconnect behavior, role gates and tests |
| Shared packages | [Auth](../packages/auth.md), [DTOs](../packages/common-dtos.md), [messaging](../packages/messaging.md) | Public exports, validation boundaries, consumer retry paths and realtime transport |
| Local development and testing | [Development](../development/local-development.md), [testing](../development/testing-strategy.md) | Package scripts, dev/test runners, fixture/target requirements, CI matrix and k6 limitations |
| Cloud and operations | [Cloud](../new-cloud-architecture-guide.md), [gateway](../infrastructure/api-gateway.md), [CDC](../infrastructure/cdc-and-broker.md), [CI/CD](../infrastructure/ci-cd.md) | ECS Terraform, gateway entrypoint, Compose, Dockerfiles, Debezium, broker and workflows |
| History and wiki | [Archive](../archive/README.md), [inventory](source-inventory.md), [drift](documentation-drift.md) | Preserved dated plans/audits, wiki navigation and selected conflicting pages |

The full file inventory is maintained in one place: [source inventory](source-inventory.md). Old October coverage counts are preserved in the [historical coverage record](../archive/audits/2026-10-25-documentation-coverage.md), not reused as current verification.

[Documentation index](../README.md)
