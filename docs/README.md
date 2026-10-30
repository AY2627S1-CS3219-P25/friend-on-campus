<!--
AI Assistance Disclosure:
Tool: Claude Code (model: Claude Fable 5.1), date: 2026-10-26
Scope: Inventory row for the errand details page implementation plan (docs/superpowers/plans/, issues #188 and #189).
Author review: <to be completed by Reallyeasy1>

Tool: Claude Code (model: Claude Fable 5.1), date: 2026-10-25
Scope: Chat row now links the new chat-service README and D4 specification (PR #148 head f39ab1f, pending); two inventory rows added.
Author review: <to be completed by Reallyeasy1>

Tool: Claude Code (model: Claude Fable 5.1), date: 2026-10-20
Scope: Added the Chat Service row to the service table.
Author review: <to be completed by Reallyeasy1>

Tool: Codex (model: GPT-6), date: 2026-10-25
Scope: Source-linked implementation documentation and evidence review requested by Reallyeasy1.
Author review: <to be completed by Reallyeasy1>
-->

# Technical implementation reference

Implementation baseline: [`52d791e`](https://github.com/AY2627S1-CS3219-P25/friend-on-campus/commit/52d791e4eea28ce7d817f025ef096f8d96bda467); inspected 2026-10-25 (SGT).

This directory documents the current five-service implementation and its verification boundaries. Start here for code navigation; the root [README](../README.md) remains the quick start and the [Project Wiki](https://github.com/AY2627S1-CS3219-P25/friend-on-campus/wiki) retains architectural records and milestone history. This reference was reintroduced under the approved task after PR #154's earlier documentation consolidation.

Code/configuration establish implemented behavior; verified human specifications establish intended behavior. Issues contain acceptance criteria. Wiki/README statements are cross-checked, and disagreements remain visible in the drift register. Pending PR #184 and Chat/AWS proposals are labelled separately; no new architecture or design rationale is authored here.

## Start by task

| Task | Read |
|---|---|
| Understand runtime components and integrations | [System overview](architecture/system-overview.md), [service boundaries](architecture/service-boundaries.md), [events](architecture/communication-and-events.md) |
| Trace an HTTP/event/data path | Service reference below; [auth](packages/auth.md), [DTOs](packages/common-dtos.md), [messaging](packages/messaging.md) |
| Run locally or diagnose UAT broker targeting | [Local development](development/local-development.md), [test/UAT configuration](development/testing-strategy.md#driver-environment-matrix) |
| Maintain docs or Claude instructions | [Conventions](development/repository-conventions.md), [Claude workflow](development/claude-code-workflow.md) |
| Review evidence or unresolved discrepancies | [Coverage](audits/documentation-coverage.md), [verification](audits/review-findings.md), [drift](audits/documentation-drift.md), [source inventory](audits/source-inventory.md) |
| Inspect the unmerged inbox change | [PR184 review](audits/pr-184-review.md), pinned separately to its inspected head |

## Service coverage

| Service | Implementation coverage | Entry point |
|---|---|---|
| User | Auth, token/session rotation, profile/admin lifecycle, SQL models, outbox, failures and tests | [User](services/user-service/README.md) |
| Supplier | Public directory, admin CRUD, validation/filtering, persistence/seed, errors and tests | [Supplier](services/supplier-service/README.md) |
| Order | Routes/state predicates, Supplier call, reservation saga, concurrent mutation, outbox/CDC and expiry | [Order](services/order-service/README.md) |
| Credit | Wallet/ledger, grants/escrow/refunds/settlement, serializable processing, replay/retry and tests | [Credit](services/credit-service/README.md) |
| Notification | Full module/REST/socket/event traces, mapping, persistence, ACK/retry/DLQ boundaries and structural review | [Notification](services/notification-service/README.md) |
| Chat (pending, PR #148 head `f39ab1f`, not on `main`) | F8 private conversation per accepted errand: REST history route, `/ws/chat/` socket hub, order-event projection, tests, known limits; proposed D4 work with decision register | [Chat](services/chat-service/README.md) · [D4 specification (proposal)](services/chat-service/d4-implementation-specification.md) |

Coverage is source-backed documentation, not a claim that all runtime acceptance checks passed. See the verification record for executed and unavailable checks, and human-only review fields.

## Complete documentation file inventory

The table lists every Markdown file in `docs/`, including this index. Each service's README is its entry point; contracts/data documents enumerate interfaces and models; runtime/testing documents follow the implementation and failure boundaries.

| File | Purpose |
|---|---|
| [README.md](README.md) | Navigation, service coverage and complete inventory |
| [architecture/authentication-and-security.md](architecture/authentication-and-security.md) | Authentication and authorization |
| [architecture/communication-and-events.md](architecture/communication-and-events.md) | Communication and event catalogue |
| [architecture/data-ownership.md](architecture/data-ownership.md) | Data ownership and persistence |
| [architecture/service-boundaries.md](architecture/service-boundaries.md) | Service boundaries |
| [architecture/system-overview.md](architecture/system-overview.md) | System overview |
| [audits/documentation-coverage.md](audits/documentation-coverage.md) | Documentation coverage matrix |
| [audits/documentation-drift.md](audits/documentation-drift.md) | Documentation drift and unresolved questions |
| [audits/pr-184-review.md](audits/pr-184-review.md) | PR #184 inspection and pending-change audit |
| [audits/review-findings.md](audits/review-findings.md) | Independent review and verification record |
| [audits/source-inventory.md](audits/source-inventory.md) | Source inventory and provenance |
| [development/claude-code-workflow.md](development/claude-code-workflow.md) | Claude Code workflow and configuration audit |
| [development/local-development.md](development/local-development.md) | Local development reference |
| [development/repository-conventions.md](development/repository-conventions.md) | Repository and documentation conventions |
| [development/testing-strategy.md](development/testing-strategy.md) | Testing strategy and UAT configuration |
| [frontend/admin-portal.md](frontend/admin-portal.md) | Admin application |
| [frontend/student-app.md](frontend/student-app.md) | Student application |
| [infrastructure/api-gateway.md](infrastructure/api-gateway.md) | Gateway and proxy routing |
| [infrastructure/cdc-and-broker.md](infrastructure/cdc-and-broker.md) | CDC and broker implementation |
| [infrastructure/ci-cd.md](infrastructure/ci-cd.md) | CI and pull-request checks |
| [infrastructure/docker-and-deployment.md](infrastructure/docker-and-deployment.md) | Containers and local deployment |
| [packages/auth.md](packages/auth.md) | Shared authentication package |
| [packages/common-dtos.md](packages/common-dtos.md) | Shared contracts |
| [packages/messaging.md](packages/messaging.md) | Shared RabbitMQ messaging |
| [services/chat-service/README.md](services/chat-service/README.md) | Chat Service implementation at PR #148 head (pending, not on `main`) |
| [services/chat-service/d4-implementation-specification.md](services/chat-service/d4-implementation-specification.md) | Proposed D4 Chat specification: reconciliation, decision register, conditional contracts and verification map |
| [services/credit-service/README.md](services/credit-service/README.md) | Credit Service implementation |
| [services/credit-service/contracts-and-data.md](services/credit-service/contracts-and-data.md) | Credit contracts and data |
| [services/credit-service/runtime-and-testing.md](services/credit-service/runtime-and-testing.md) | Credit runtime, recovery and tests |
| [services/notification-service/README.md](services/notification-service/README.md) | Notification Service implementation |
| [services/notification-service/contracts-and-data.md](services/notification-service/contracts-and-data.md) | Notification contracts and data |
| [services/notification-service/implementation.md](services/notification-service/implementation.md) | Notification execution paths |
| [services/notification-service/reliability-and-testing.md](services/notification-service/reliability-and-testing.md) | Notification reliability and tests |
| [services/notification-service/structure-review.md](services/notification-service/structure-review.md) | Notification structure review |
| [services/order-service/README.md](services/order-service/README.md) | Order Service implementation |
| [services/order-service/contracts-and-data.md](services/order-service/contracts-and-data.md) | Order contracts and data |
| [services/order-service/runtime-and-testing.md](services/order-service/runtime-and-testing.md) | Order runtime, consistency and tests |
| [services/supplier-service/README.md](services/supplier-service/README.md) | Supplier Service implementation |
| [services/supplier-service/contracts-and-data.md](services/supplier-service/contracts-and-data.md) | Supplier contracts and data |
| [services/supplier-service/runtime-and-testing.md](services/supplier-service/runtime-and-testing.md) | Supplier runtime, failures and tests |
| [services/user-service/README.md](services/user-service/README.md) | User Service implementation |
| [services/user-service/contracts-and-data.md](services/user-service/contracts-and-data.md) | User contracts and data |
| [services/user-service/runtime-and-testing.md](services/user-service/runtime-and-testing.md) | User runtime, failure behavior and tests |
| [superpowers/plans/2026-10-26-errand-details-page.md](superpowers/plans/2026-10-26-errand-details-page.md) | Implementation plan for the student-app errand details page (issues #188, #189; author-approved design of 2026-10-26, not a specification) |

## Maintenance and pending work

Follow [CLAUDE.md](../CLAUDE.md) and the docs-scoped rule. Update the service reference and shared contract catalogue together after a source change. Recheck pending-head facts after merge; retain dated test evidence as dated evidence. Do not silently reconcile source disagreements or complete human review fields. The source inventory records all 32 Wiki pages and relevant issues; the verification record lists manual runtime checks and decisions still required.
