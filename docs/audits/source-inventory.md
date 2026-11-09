<!--
AI Assistance Disclosure:
Tool: Codex (model: GPT-6), date: 2026-11-09
Scope: Reconcile the active documentation with main b989758 and simplify navigation; preserve historical attribution.
Author review: <to be completed by Reallyeasy1>

Tool: Claude Code (model: Claude Fable 5.1), date: 2026-10-25
Scope: Recorded the PR #148 head and main commit inspected for the Chat documents and added the issue #56 row; wiki snapshot unchanged.
Author review: <to be completed by Reallyeasy1>

Tool: Codex (model: GPT-6), date: 2026-10-25
Scope: Source-linked implementation documentation and evidence review requested by Reallyeasy1.
Author review: <to be completed by Reallyeasy1>
-->

# Source inventory and provenance

Implementation inspected at [`b989758`](https://github.com/AY2627S1-CS3219-P25/friend-on-campus/commit/b989758e766cb593c3b8c94102eb6dfb5c7d8491) on 9 November 2026 (SGT). This is a code/configuration reference, not verification of the live deployment.

| Source | Inspected revision |
|---|---|
| Repository `main` | `b989758e766cb593c3b8c94102eb6dfb5c7d8491` |
| Wiki, read-only | `0571db5d4ad8c89679131c8707aae105402c7618` |
| Local cleanup | Branch `codex/docs-refresh-20261109`; uncommitted documentation changes based on that main commit. Remote main was rechecked unchanged before handoff |

## Evidence boundaries

Current code, schemas, configuration and tests establish implemented behavior. Human requirements and explicit decisions establish intent; issue/PR discussions and wiki pages supply acceptance criteria and history. Neither a merged PR nor a closed issue proves deployment, fixes every review finding, or changes an original performance requirement.

The [coverage map](documentation-coverage.md) identifies inspected source areas; each active guide links concrete source files. All wiki page names and navigation were inventoried; relevant implementation/design pages were compared with source. Historical screenshots and milestone evidence were retained as dated records, not rerun. External D1/D2 Google documents were not independently revalidated in this task.

## Complete `docs/` inventory

All retained files are Markdown. **Current** identifies implementation/reference material; **Forwarder** preserves an old path; **Historical** identifies a snapshot. The [archive map](../archive/README.md) records every move or preserved copy.

| File | Role |
|---|---|
| [README.md](../README.md) | Current |
| [architecture/authentication-and-security.md](../architecture/authentication-and-security.md) | Current |
| [architecture/communication-and-events.md](../architecture/communication-and-events.md) | Current |
| [architecture/data-ownership.md](../architecture/data-ownership.md) | Current |
| [architecture/service-boundaries.md](../architecture/service-boundaries.md) | Current |
| [architecture/system-overview.md](../architecture/system-overview.md) | Current |
| [archive/README.md](../archive/README.md) | Archive navigation |
| [archive/audits/2026-10-25-documentation-coverage.md](../archive/audits/2026-10-25-documentation-coverage.md) | Historical |
| [archive/audits/2026-10-25-documentation-drift.md](../archive/audits/2026-10-25-documentation-drift.md) | Historical |
| [archive/audits/2026-10-25-pr-184-review.md](../archive/audits/2026-10-25-pr-184-review.md) | Historical |
| [archive/audits/2026-10-25-review-findings.md](../archive/audits/2026-10-25-review-findings.md) | Historical |
| [archive/audits/2026-10-25-source-inventory.md](../archive/audits/2026-10-25-source-inventory.md) | Historical |
| [archive/infrastructure/2026-11-09-cloud-architecture-guide.md](../archive/infrastructure/2026-11-09-cloud-architecture-guide.md) | Historical |
| [archive/infrastructure/cloud-deployment-and-devops-guide.md](../archive/infrastructure/cloud-deployment-and-devops-guide.md) | Historical |
| [archive/plans/2026-10-22-notification-inbox.md](../archive/plans/2026-10-22-notification-inbox.md) | Historical |
| [archive/plans/2026-10-26-errand-details-page.md](../archive/plans/2026-10-26-errand-details-page.md) | Historical |
| [archive/services/chat-service/d4-implementation-specification.md](../archive/services/chat-service/d4-implementation-specification.md) | Historical |
| [archive/services/notification-service/structure-review.md](../archive/services/notification-service/structure-review.md) | Historical |
| [audits/documentation-coverage.md](documentation-coverage.md) | Current |
| [audits/documentation-drift.md](documentation-drift.md) | Current |
| [audits/pr-184-review.md](pr-184-review.md) | Forwarder |
| [audits/review-findings.md](review-findings.md) | Current |
| [audits/source-inventory.md](source-inventory.md) | Current |
| [cloud-deployment-and-devops-guide.md](../cloud-deployment-and-devops-guide.md) | Forwarder |
| [development/claude-code-workflow.md](../development/claude-code-workflow.md) | Current |
| [development/local-development.md](../development/local-development.md) | Current |
| [development/repository-conventions.md](../development/repository-conventions.md) | Current |
| [development/testing-strategy.md](../development/testing-strategy.md) | Current |
| [frontend/admin-portal.md](../frontend/admin-portal.md) | Current |
| [frontend/student-app.md](../frontend/student-app.md) | Current |
| [infrastructure/api-gateway.md](../infrastructure/api-gateway.md) | Current |
| [infrastructure/cdc-and-broker.md](../infrastructure/cdc-and-broker.md) | Current |
| [infrastructure/ci-cd.md](../infrastructure/ci-cd.md) | Current |
| [infrastructure/docker-and-deployment.md](../infrastructure/docker-and-deployment.md) | Current |
| [new-cloud-architecture-guide.md](../new-cloud-architecture-guide.md) | Current |
| [packages/auth.md](../packages/auth.md) | Current |
| [packages/common-dtos.md](../packages/common-dtos.md) | Current |
| [packages/messaging.md](../packages/messaging.md) | Current |
| [services/chat-service/README.md](../services/chat-service/README.md) | Current |
| [services/chat-service/d4-implementation-specification.md](../services/chat-service/d4-implementation-specification.md) | Forwarder |
| [services/credit-service/README.md](../services/credit-service/README.md) | Current |
| [services/credit-service/contracts-and-data.md](../services/credit-service/contracts-and-data.md) | Current |
| [services/credit-service/runtime-and-testing.md](../services/credit-service/runtime-and-testing.md) | Current |
| [services/notification-service/README.md](../services/notification-service/README.md) | Current |
| [services/notification-service/contracts-and-data.md](../services/notification-service/contracts-and-data.md) | Current |
| [services/notification-service/implementation.md](../services/notification-service/implementation.md) | Current |
| [services/notification-service/reliability-and-testing.md](../services/notification-service/reliability-and-testing.md) | Current |
| [services/notification-service/structure-review.md](../services/notification-service/structure-review.md) | Forwarder |
| [services/order-service/README.md](../services/order-service/README.md) | Current |
| [services/order-service/contracts-and-data.md](../services/order-service/contracts-and-data.md) | Current |
| [services/order-service/runtime-and-testing.md](../services/order-service/runtime-and-testing.md) | Current |
| [services/supplier-service/README.md](../services/supplier-service/README.md) | Current |
| [services/supplier-service/contracts-and-data.md](../services/supplier-service/contracts-and-data.md) | Current |
| [services/supplier-service/coordinate-upgrades.md](../services/supplier-service/coordinate-upgrades.md) | Current |
| [services/supplier-service/runtime-and-testing.md](../services/supplier-service/runtime-and-testing.md) | Current |
| [services/user-service/README.md](../services/user-service/README.md) | Current |
| [services/user-service/contracts-and-data.md](../services/user-service/contracts-and-data.md) | Current |
| [services/user-service/runtime-and-testing.md](../services/user-service/runtime-and-testing.md) | Current |
| [superpowers/plans/2026-10-22-notification-inbox.md](../superpowers/plans/2026-10-22-notification-inbox.md) | Forwarder |
| [superpowers/plans/2026-10-26-errand-details-page.md](../superpowers/plans/2026-10-26-errand-details-page.md) | Forwarder |

## Related READMEs outside `docs/`

The six service READMEs are already listed above. There are no additional service-local README files at this baseline.

| Reference | Role / result of reconciliation |
|---|---|
| [Root README](../../README.md) | Quick start and top-level commands; service count, test coverage and navigation corrected |
| [ECS Terraform](../../infra/terraform/ecs/README.md) | Canonical rollout, state and GitHub delivery runbook; stale realtime status corrected |
| [Auth package](../../packages/auth/README.md) | Public auth API examples; implementation context lives in the short [auth reference](../packages/auth.md) |
| [k6](../../tests/k6/README.md) | Canonical harness usage; credential handling, configured thresholds and known limitations clarified |
| [Order/Credit Postman flows](../../tests/postman/order_credit_README.md) | Supplemental collection usage; actual automation scope is in the [testing guide](../development/testing-strategy.md) |
| [Claude setup](../../.claude/README.md) | Existing setup guide; stale client-count/permission statements are recorded in the [drift register](documentation-drift.md), not treated as policy changes |

## Wiki inventory

The inspected wiki has **42 Markdown files**, including `Home` and `_Sidebar`. Status below describes how to use a page, not an endorsement of every technical claim. Current discrepancies are listed in the [wiki correction table](documentation-drift.md#wiki-corrections-needed-not-published). No wiki content or navigation was modified.

| Wiki page | Context |
|---|---|
| [AWS Deployment and D4 Delivery Plan](https://github.com/AY2627S1-CS3219-P25/friend-on-campus/wiki/AWS-Deployment-and-D4-Delivery-Plan) | Design / execution context; implementation must be checked |
| [Architecture](https://github.com/AY2627S1-CS3219-P25/friend-on-campus/wiki/Architecture) | Implementation description; subject to drift |
| [Authentication and Roles](https://github.com/AY2627S1-CS3219-P25/friend-on-campus/wiki/Authentication-and-Roles) | Implementation description; subject to drift |
| [Automated Concurrency and Recovery Suite Design](https://github.com/AY2627S1-CS3219-P25/friend-on-campus/wiki/Automated-Concurrency-and-Recovery-Suite-Design) | Design / execution context; implementation must be checked |
| [Automated System Testing and Evidence Design](https://github.com/AY2627S1-CS3219-P25/friend-on-campus/wiki/Automated-System-Testing-and-Evidence-Design) | Design / execution context; implementation must be checked |
| [Centralised Logging Health Monitoring and Alerts Design](https://github.com/AY2627S1-CS3219-P25/friend-on-campus/wiki/Centralised-Logging-Health-Monitoring-and-Alerts-Design) | Design / execution context; implementation must be checked |
| [Chat Service Design and Reliability Plan](https://github.com/AY2627S1-CS3219-P25/friend-on-campus/wiki/Chat-Service-Design-and-Reliability-Plan) | Design / execution context; implementation must be checked |
| [Credit Service](https://github.com/AY2627S1-CS3219-P25/friend-on-campus/wiki/Credit-Service) | Implementation description; subject to drift |
| [D2 Demo Script](https://github.com/AY2627S1-CS3219-P25/friend-on-campus/wiki/D2-Demo-Script) | Historical milestone / evidence |
| [D2 Design Decisions](https://github.com/AY2627S1-CS3219-P25/friend-on-campus/wiki/D2-Design-Decisions) | Historical milestone / evidence |
| [D2 Diagrams](https://github.com/AY2627S1-CS3219-P25/friend-on-campus/wiki/D2-Diagrams) | Historical milestone / evidence |
| [D2 Evidence](https://github.com/AY2627S1-CS3219-P25/friend-on-campus/wiki/D2-Evidence) | Historical milestone / evidence |
| [D2 Part 1 User Service](https://github.com/AY2627S1-CS3219-P25/friend-on-campus/wiki/D2-Part-1-User-Service) | Historical milestone / evidence |
| [D2 Part 2 Supplier Service](https://github.com/AY2627S1-CS3219-P25/friend-on-campus/wiki/D2-Part-2-Supplier-Service) | Historical milestone / evidence |
| [D2 Presentation Runbook](https://github.com/AY2627S1-CS3219-P25/friend-on-campus/wiki/D2-Presentation-Runbook) | Historical milestone / evidence |
| [D2 Screenshots](https://github.com/AY2627S1-CS3219-P25/friend-on-campus/wiki/D2-Screenshots) | Historical milestone / evidence |
| [D3 Screenshots](https://github.com/AY2627S1-CS3219-P25/friend-on-campus/wiki/D3-Screenshots) | Historical milestone / evidence |
| [Data Model](https://github.com/AY2627S1-CS3219-P25/friend-on-campus/wiki/Data-Model) | Implementation description; subject to drift |
| [Decisions and Open Questions](https://github.com/AY2627S1-CS3219-P25/friend-on-campus/wiki/Decisions-and-Open-Questions) | Decision history and open questions |
| [Deployment and Configuration](https://github.com/AY2627S1-CS3219-P25/friend-on-campus/wiki/Deployment-and-Configuration) | Implementation description; subject to drift |
| [Failed Asynchronous Message Recovery Design](https://github.com/AY2627S1-CS3219-P25/friend-on-campus/wiki/Failed-Asynchronous-Message-Recovery-Design) | Design / execution context; implementation must be checked |
| [Frontend Apps](https://github.com/AY2627S1-CS3219-P25/friend-on-campus/wiki/Frontend-Apps) | Implementation description; subject to drift |
| [Getting Started](https://github.com/AY2627S1-CS3219-P25/friend-on-campus/wiki/Getting-Started) | Implementation description; subject to drift |
| [Graceful Degradation and Data Durability Design](https://github.com/AY2627S1-CS3219-P25/friend-on-campus/wiki/Graceful-Degradation-and-Data-Durability-Design) | Design / execution context; implementation must be checked |
| [Home](https://github.com/AY2627S1-CS3219-P25/friend-on-campus/wiki/Home) | Navigation / status; compare with current source |
| [Milestone D2](https://github.com/AY2627S1-CS3219-P25/friend-on-campus/wiki/Milestone-D2) | Historical milestone / evidence |
| [Milestone D3](https://github.com/AY2627S1-CS3219-P25/friend-on-campus/wiki/Milestone-D3) | Historical milestone / evidence |
| [Mock Services](https://github.com/AY2627S1-CS3219-P25/friend-on-campus/wiki/Mock-Services) | Historical milestone / evidence |
| [Notification Service](https://github.com/AY2627S1-CS3219-P25/friend-on-campus/wiki/Notification-Service) | Implementation description; subject to drift |
| [Order Service](https://github.com/AY2627S1-CS3219-P25/friend-on-campus/wiki/Order-Service) | Implementation description; subject to drift |
| [RabbitMQ Cross‐Replica Chat and Notification Delivery](https://github.com/AY2627S1-CS3219-P25/friend-on-campus/wiki/RabbitMQ-Cross%E2%80%90Replica-Chat-and-Notification-Delivery) | Design / execution context; implementation must be checked |
| [Roadmap](https://github.com/AY2627S1-CS3219-P25/friend-on-campus/wiki/Roadmap) | Navigation / status; compare with current source |
| [Services](https://github.com/AY2627S1-CS3219-P25/friend-on-campus/wiki/Services) | Implementation description; subject to drift |
| [Simulated UAT Environment and Evidence](https://github.com/AY2627S1-CS3219-P25/friend-on-campus/wiki/Simulated-UAT-Environment-and-Evidence) | Design / execution context; implementation must be checked |
| [Simulated UAT Findings and Follow up](https://github.com/AY2627S1-CS3219-P25/friend-on-campus/wiki/Simulated-UAT-Findings-and-Follow-up) | Historical milestone / evidence |
| [Simulated UAT Plan and Claude Code Handoff](https://github.com/AY2627S1-CS3219-P25/friend-on-campus/wiki/Simulated-UAT-Plan-and-Claude-Code-Handoff) | Design / execution context; implementation must be checked |
| [Simulated UAT Test Scenarios](https://github.com/AY2627S1-CS3219-P25/friend-on-campus/wiki/Simulated-UAT-Test-Scenarios) | Design / execution context; implementation must be checked |
| [Supplier Service](https://github.com/AY2627S1-CS3219-P25/friend-on-campus/wiki/Supplier-Service) | Implementation description; subject to drift |
| [Team Conventions](https://github.com/AY2627S1-CS3219-P25/friend-on-campus/wiki/Team-Conventions) | Implementation description; subject to drift |
| [Testing and Evidence](https://github.com/AY2627S1-CS3219-P25/friend-on-campus/wiki/Testing-and-Evidence) | Implementation description; subject to drift |
| [User Service](https://github.com/AY2627S1-CS3219-P25/friend-on-campus/wiki/User-Service) | Implementation description; subject to drift |
| [_Sidebar](https://github.com/AY2627S1-CS3219-P25/friend-on-campus/wiki/_Sidebar) | Navigation / status; compare with current source |

## Rechecked PR and issue states

States were read from GitHub on 9 November 2026 (SGT). Original requirements and review threads remain separate evidence.

| Source | Verified state / significance |
|---|---|
| [PR #148](https://github.com/AY2627S1-CS3219-P25/friend-on-campus/pull/148) | Merged; Chat is present on main, not a pending fifth-to-sixth-service proposal |
| [PR #184](https://github.com/AY2627S1-CS3219-P25/friend-on-campus/pull/184) | Merged; recipient-aware inbox and Order/Credit changes are current |
| [PR #246](https://github.com/AY2627S1-CS3219-P25/friend-on-campus/pull/246) | Merged; RabbitMQ realtime fanout and service-owned outboxes are current |
| [PR #252](https://github.com/AY2627S1-CS3219-P25/friend-on-campus/pull/252) | Merged at the inspected main commit; four P2 review threads remain unresolved |
| [#56](https://github.com/AY2627S1-CS3219-P25/friend-on-campus/issues/56) | Closed; participant-only acceptance wording still differs from current Chat admin reads and stale membership behavior |
| [#134](https://github.com/AY2627S1-CS3219-P25/friend-on-campus/issues/134) | Open; operational DLQ recovery remains incomplete, but older implementation descriptions in the issue require care |
| [#236](https://github.com/AY2627S1-CS3219-P25/friend-on-campus/issues/236) | Open; original performance acceptance remains distinct from relaxed harness limits |
| [#237](https://github.com/AY2627S1-CS3219-P25/friend-on-campus/issues/237) | Closed; merged harness work does not establish every original NFR |
| [#253](https://github.com/AY2627S1-CS3219-P25/friend-on-campus/issues/253) | Open; Supplier query work at original 50/100 VUs |

[25 October inventory](../archive/audits/2026-10-25-source-inventory.md) retains older issue and source provenance. Its pending-work labels apply to that earlier snapshot.

## Checks and maintenance

See [verification](review-findings.md) for actual checks and unavailable runtime evidence. Keep this inventory in step with additions/moves, link developer tasks from [the index](../README.md), and retain original source dates when archiving. Do not refresh verification dates without inspecting the affected claims.
