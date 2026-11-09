<!--
AI Assistance Disclosure:
Tool: Codex (model: GPT-6), date: 2026-11-09
Scope: Index preserved plans and dated audits; record old-to-new paths without changing historical decisions.
Author review: <to be completed by Reallyeasy1>

-->

# Historical documentation

These snapshots preserve earlier plans, reviews, decisions and test evidence. Their implementation descriptions and commands belong to their recorded dates and commits. An archived proposal is not an approval, and an archived finding is not automatically resolved.

Use the [documentation index](../README.md) for current behavior and the [drift register](../audits/documentation-drift.md) for outstanding questions. Deployment commands have one current home: the [ECS Terraform runbook](../../infra/terraform/ecs/README.md).

## Archive map

Paths in the first column are relative to `docs/`. Existing entry points remain available, so repository and wiki links to those files still open.

| Original path | Preserved snapshot | Current treatment |
|---|---|---|
| [`cloud-deployment-and-devops-guide.md`](../cloud-deployment-and-devops-guide.md) | [infrastructure/cloud-deployment-and-devops-guide.md](infrastructure/cloud-deployment-and-devops-guide.md) | Forwarding page; historical K3s runbook |
| [`new-cloud-architecture-guide.md`](../new-cloud-architecture-guide.md) | [infrastructure/2026-11-09-cloud-architecture-guide.md](infrastructure/2026-11-09-cloud-architecture-guide.md) | Active path rewritten as ECS overview; deployment commands stay in the Terraform README |
| [`services/chat-service/d4-implementation-specification.md`](../services/chat-service/d4-implementation-specification.md) | [services/chat-service/d4-implementation-specification.md](services/chat-service/d4-implementation-specification.md) | Forwarding page; dated D4 proposal and unresolved decision record |
| [`services/notification-service/structure-review.md`](../services/notification-service/structure-review.md) | [services/notification-service/structure-review.md](services/notification-service/structure-review.md) | Forwarding page; dated structure review |
| [`superpowers/plans/2026-10-22-notification-inbox.md`](../superpowers/plans/2026-10-22-notification-inbox.md) | [plans/2026-10-22-notification-inbox.md](plans/2026-10-22-notification-inbox.md) | Forwarding page; original notification plan |
| [`superpowers/plans/2026-10-26-errand-details-page.md`](../superpowers/plans/2026-10-26-errand-details-page.md) | [plans/2026-10-26-errand-details-page.md](plans/2026-10-26-errand-details-page.md) | Forwarding page; original UI plan |
| [`audits/documentation-coverage.md`](../audits/documentation-coverage.md) | [audits/2026-10-25-documentation-coverage.md](audits/2026-10-25-documentation-coverage.md) | Active path refreshed; original October audit retained |
| [`audits/documentation-drift.md`](../audits/documentation-drift.md) | [audits/2026-10-25-documentation-drift.md](audits/2026-10-25-documentation-drift.md) | Active path refreshed; original October audit retained |
| [`audits/pr-184-review.md`](../audits/pr-184-review.md) | [audits/2026-10-25-pr-184-review.md](audits/2026-10-25-pr-184-review.md) | Forwarding page; dated PR review |
| [`audits/review-findings.md`](../audits/review-findings.md) | [audits/2026-10-25-review-findings.md](audits/2026-10-25-review-findings.md) | Active path refreshed; original October audit retained |
| [`audits/source-inventory.md`](../audits/source-inventory.md) | [audits/2026-10-25-source-inventory.md](audits/2026-10-25-source-inventory.md) | Active path refreshed; original October audit retained |

## Preservation rules

Original authorship, incomplete human-review fields, source commits and recorded results are retained. Archive notices and relative links were adjusted for the move, four diagram punctuation marks were repaired for Mermaid rendering, and inherited trailing whitespace was normalized; historical technical claims were not rewritten as current facts. Some old links now lead through forwarding pages; use each snapshot's source revision when reproducing past behavior.

The previous cloud architecture guide remains here because it contains detailed cost assumptions and decision context. Its figures are dated estimates, not a current AWS quote or proof of live resource configuration.

[Complete documentation and wiki inventory](../audits/source-inventory.md)
