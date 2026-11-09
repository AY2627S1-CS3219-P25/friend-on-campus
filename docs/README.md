<!--
AI Assistance Disclosure:
Tool: Codex (model: GPT-6), date: 2026-11-09
Scope: Reconcile the active documentation with main b989758 and simplify navigation; preserve historical attribution.
Author review: <to be completed by Reallyeasy1>

Tool: Codex (model: GPT-6), date: 2026-11-08
Scope: Link the ECS rollout after retirement of the K3s deployment files.
Author review: <to be completed by the author>

Tool: Codex (model: GPT-6), date: 2026-11-08
Scope: Update confirmed migration decisions and architecture navigation.
Author review: <to be completed by the author>

Tool: Codex (model: GPT-6), date: 2026-11-08
Scope: Update target-architecture navigation for the author-requested CloudFront entry point, origin TLS requirements and incremental costs.
Author review: <to be completed by the author>

Tool: Codex (model: GPT-6), date: 2026-11-08
Scope: Link the author's confirmed shared-host ECS target architecture separately from implemented deployment references.
Author review: <to be completed by the author>

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

# Developer documentation

Implementation inspected at [`b989758`](https://github.com/AY2627S1-CS3219-P25/friend-on-campus/commit/b989758e766cb593c3b8c94102eb6dfb5c7d8491) on 9 November 2026 (SGT). This is a code/configuration reference, not verification of the live deployment.

Use this folder for the current implementation and operating procedures. The root [README](../README.md) is the quick start; the [wiki](https://github.com/AY2627S1-CS3219-P25/friend-on-campus/wiki) retains design context and milestone history. Older wiki claims are tracked in [documentation drift](audits/documentation-drift.md), not silently adopted as current behavior.

## Start with your task

| Task | Start here |
|---|---|
| Understand the system | [Overview](architecture/system-overview.md), [ownership](architecture/service-boundaries.md), [data](architecture/data-ownership.md), [security](architecture/authentication-and-security.md) |
| Run locally or upgrade local data | [Local development](development/local-development.md), [Supplier coordinate upgrades](services/supplier-service/coordinate-upgrades.md) |
| Trace an asynchronous order or credit effect | [Events and Saga](architecture/communication-and-events.md), [Order runtime](services/order-service/runtime-and-testing.md), [Credit runtime](services/credit-service/runtime-and-testing.md) |
| Debug notifications or chat across replicas | [Notification](services/notification-service/README.md), [Chat](services/chat-service/README.md), [shared messaging](packages/messaging.md) |
| Diagnose routing, containers or CDC | [Gateway](infrastructure/api-gateway.md), [containers](infrastructure/docker-and-deployment.md), [CDC and broker](infrastructure/cdc-and-broker.md) |
| Deploy or inspect cloud configuration | [Cloud overview](new-cloud-architecture-guide.md), [canonical ECS rollout](../infra/terraform/ecs/README.md) |
| Choose and run a test suite | [Testing strategy](development/testing-strategy.md), [CI/CD](infrastructure/ci-cd.md), [k6 runbook](../tests/k6/README.md) |
| Update documentation or use coding tools | [Repository conventions](development/repository-conventions.md), [Claude workflow](development/claude-code-workflow.md) |
| Find verification limits or historical evidence | [Verification](audits/review-findings.md), [drift](audits/documentation-drift.md), [archive](archive/README.md) |

## Components

| Component | Reference |
|---|---|
| Identity, sessions and user administration | [User Service](services/user-service/README.md) |
| Supplier directory and locations | [Supplier Service](services/supplier-service/README.md) |
| Errands, assignment, disputes and assistant | [Order Service](services/order-service/README.md) |
| Wallets, escrow and financial receipts | [Credit Service](services/credit-service/README.md) |
| Inbox and read-state delivery | [Notification Service](services/notification-service/README.md) |
| Conversations and messages | [Chat Service](services/chat-service/README.md) |
| Browser interfaces | [Student app](frontend/student-app.md), [admin portal](frontend/admin-portal.md) |
| Shared contracts and infrastructure helpers | [Auth](packages/auth.md), [DTOs](packages/common-dtos.md), [messaging](packages/messaging.md) |

Each service README links its contracts, runtime and tests. The [source inventory](audits/source-inventory.md) lists every retained document, relevant external README and wiki page; the [coverage map](audits/documentation-coverage.md) records what was inspected.

## Reading status correctly

- **Current implementation** means present in the inspected source commit, not necessarily deployed or runtime-verified.
- **Proposal** remains an intended change until approval and implementation are established.
- **Historical** material preserves its original date, commit, decisions and results. Commands there are not current runbooks.
- **Known limitation** stays visible until evidence establishes a fix. PR #252 is merged, but its four P2 review findings remain unresolved at this baseline, and its relaxed load thresholds do not establish the original NFRs.

No wiki pages, production resources, issues or PRs were changed by this cleanup.
