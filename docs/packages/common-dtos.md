<!--
AI Assistance Disclosure:
Tool: Codex (model: GPT-6), date: 2026-10-25
Scope: Source-linked implementation documentation and evidence review requested by Reallyeasy1.
Author review: <to be completed by Reallyeasy1>
-->

# Shared contracts

Implementation baseline: [`52d791e`](https://github.com/AY2627S1-CS3219-P25/friend-on-campus/commit/52d791e4eea28ce7d817f025ef096f8d96bda467); inspected 2026-10-25 (SGT). Pending work is explicitly labelled.

`@campus-errand/common-dtos` exports TypeScript declarations used by services and browser clients. It is a compile-time contract package, not a runtime request validator or schema registry. Service parsers still decide which malformed inputs are rejected.

| Export group | Consumers and content |
|---|---|
| UserRole, UserDTO, authentication requests/responses, JWTPayload | User routes, shared auth and both apps; registered JWT claim names plus optional display username |
| Supplier DTO/create/update/query types | Supplier service, both apps and Order supplier client |
| OrderStatus, OrderDTO, create/accept/admin-action types | Order service and both apps; fields include state/version, contact notes and lifecycle timestamps |
| Credit wallet, ledger and transaction types | Credit read endpoints and student wallet |
| UserRegisteredEvent and order lifecycle events | Producers and service-specific parsing/mapping |
| Credit reservation request/result interfaces | Order/Credit saga, separately exported from the general CampusErrandEvent union |
| NotificationKind, NotificationDTO | Current three requester stages, REST and browser/socket rendering |
| ApiResponse and pagination helpers | Shared shapes; actual route envelopes still differ |

`DISPUTED` is declared in OrderStatus but an implemented producing transition was not found. Do not document it as an available dispute workflow. Likewise a broad union is not evidence that every service binds every event. The [event catalogue](../architecture/communication-and-events.md) traces actual publishers/consumers.

Changes to DTOs/events are human-owned interface decisions under CLAUDE.md. This documentation PR changes none. PR #184 adds versioned event fields, notification metadata and financial receipts; refer to its separate audit rather than reading those pending shapes into main.

Package verification is build/typecheck; there is no package-local runtime test suite. Service validation and integration tests establish runtime behavior. Run the root typecheck when contracts change to include all consumers.

## Source evidence and related reading

- [`packages/common-dtos/src/index.ts`](../../packages/common-dtos/src/index.ts)
- [`packages/common-dtos/package.json`](../../packages/common-dtos/package.json)
- [Wiki: Services](https://github.com/AY2627S1-CS3219-P25/friend-on-campus/wiki/Services)
- [Documentation index](../README.md) · [Drift register](../audits/documentation-drift.md) · [Verification record](../audits/review-findings.md)
