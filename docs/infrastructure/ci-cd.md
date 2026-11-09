<!--
AI Assistance Disclosure:
Tool: Codex (model: GPT-6), date: 2026-11-09
Scope: Refresh current CI matrices, manual ECS release workflows, manual k6 coverage and unresolved harness findings.
Author review: <to be completed by Reallyeasy1>

Tool: Claude Code (model: Claude Fable 5.1), date: 2026-11-08
Scope: Added the manual k6 performance workflow section (performance.yml, npm run perf:k6; issues #236, #237).
Author review: <to be completed by Reallyeasy1>

Tool: Codex (model: GPT-6), date: 2026-10-25
Scope: Source-linked implementation documentation and evidence review requested by Reallyeasy1.
Author review: <to be completed by Reallyeasy1>
-->

# CI and delivery workflows

Source baseline: [`b989758`](https://github.com/AY2627S1-CS3219-P25/friend-on-campus/commit/b989758e766cb593c3b8c94102eb6dfb5c7d8491); inspected 9 November 2026 (SGT). These are source-verified instructions, not evidence of a new runtime test or a live AWS deployment.

The [CI workflow](../../.github/workflows/ci.yml) runs on pull requests and pushes to `main`. Application deployment, infrastructure changes and k6 load generation have separate **manual** workflows. A merge does not automatically deploy the application.

## Required test categories

| Job/category | What is configured |
|---|---|
| Lint, Build, Type checks | ESLint, workspace builds, and all 12 workspace typechecks on Node 22 |
| Test matrix consistency | Validates package test scripts; runs deployment-wrapper checks and nine k6 wrapper self-tests |
| Unit | Nine suites: six backend services, Student, Admin and shared messaging |
| Integration | Four suites: User, Credit, Notification and Chat against PostgreSQL |
| Messaging | Four suites: Credit, Order, Notification and Chat against PostgreSQL/RabbitMQ; Order also provisions dedicated Credit CDC |
| Migration | Credit and Supplier migration suites |
| Seed | Credit seed validation |
| Acceptance | API, Notification and CDC drivers against an isolated Compose stack; includes credential-exposure review |
| API E2E | Stops stack User/Supplier processes before the driver starts its own instances |
| Browser UAT | Main Chromium UAT followed by the four-client realtime notification/chat script |
| Test gate | Requires every listed CI category to succeed |

The static matrix contains **20 workspace suites** and validates four root system-test commands. Adding, renaming or removing a workspace `test:*` script requires a matching matrix update and `npm run ci:validate-tests`. The wrapper self-tests are explicit job steps; the `perf:k6` load command itself is not a PR gate.

API, Notification, CDC and browser drivers now return failure exit codes for failed checks. Inspect uploaded results for skipped scenarios and coverage boundaries; a green test gate does not establish a production deployment, original NFR compliance or untested failure recovery. See [testing strategy](../development/testing-strategy.md) for prerequisites, driver variables and differences between CI and `npm test`.

## Manual application delivery

[deploy-ecs.yml](../../.github/workflows/deploy-ecs.yml) implements **Deploy applications to ECS**:

1. Accepts a service selection (`all` or one of nine application/gateway services), deployment toggle and optional AWS access check.
2. Requires the selected ref to be `main` and rejects a superseded main commit. Except for access-only checks, the latest push-triggered CI run for that commit must have succeeded.
3. Builds `linux/arm64` images on native ARM64 runners, with at most three builds in parallel, then pushes immutable run-specific tags to ECR.
4. When deployment is enabled, invokes [deploy-applications.sh](../../infra/terraform/ecs/deploy-applications.sh).

AWS authentication uses OIDC and `AWS_DEPLOY_ROLE_ARN` (or the dispatch override), in `ap-southeast-1`. Role trust and permissions must already be configured. Use the [ECS Terraform runbook](../../infra/terraform/ecs/README.md) for operational prerequisites, migrations, rollout and failure handling; source configuration alone does not prove those resources exist in an AWS account.

## Manual infrastructure delivery

[deploy-infra.yml](../../.github/workflows/deploy-infra.yml) implements **Deploy ECS infrastructure** on `main`. It initializes an existing shared Terraform state, validates and plans changes, and applies the saved plan only when the `apply` input is enabled. Applying also rolls application task configuration using the currently deployed images.

It requires the configured infrastructure role, state bucket and private Terraform inputs. Application and infrastructure workflows share the non-cancelling `foc-ecs-release` concurrency group. They are release operations, not documentation verification commands.

## Manual performance workflow

[performance.yml](../../.github/workflows/performance.yml) runs only through `workflow_dispatch`. It defines `target`, `profile`, `workload` and optional `vus` inputs, pins k6 **1.5.0**, permits one run per target through a non-cancelling concurrency group and sets a 75-minute job timeout.

The Compose target creates an isolated stack. The AWS target reads `PERF_AWS_GATEWAY_URL` and administrator secrets `PERF_AWS_ADMIN_EMAIL` / `PERF_AWS_ADMIN_PASSWORD`, using the `performance-aws` environment. The environment permits required reviewers to be configured; the workflow file does not prove that protection is enabled.

The wrapper runs preflight → fixture creation → k6 → reconciliation/report → cleanup. Reports live under `test-results/<runId>/`; artifact upload runs even after failure and excludes `.secrets`. Generated account credentials are stored temporarily under `.secrets`, while administrator credentials come from environment variables. Required-stage failure produces a nonzero result; cleanup is optional in the overall verdict, so inspect its report separately.

Use the [k6 README](../../tests/k6/README.md) for flags and [`requirements.json`](../../tests/k6/requirements.json) for the enforced profile values. Raised latency thresholds and the reduced 20/30-VU Supplier populations do **not** establish the original linked NFRs. No cloud load result or autoscaling evidence is produced merely by merging the workflow.

The [four P2 findings on merged PR #252](https://github.com/AY2627S1-CS3219-P25/friend-on-campus/pull/252#pullrequestreview-5825829477) remain present at this baseline: argument handling can bypass target selection, workers can outlive fixture cleanup, pending orders can lose recovery accounts, and empty result lists can pass correctness checks. Consequently, the input choices and PASS/cleanup reports should not be described as complete safety or correctness guarantees. Details are retained in the [drift register](../audits/documentation-drift.md).

## Automated review and human checks

[claude-pr-review.yml](../../.github/workflows/claude-pr-review.yml) runs for eligible same-repository, non-draft PRs unless `CLAUDE_PR_REVIEW_ENABLED=false`. It has a 30-minute timeout and requires its configured authentication. A skipped review is not an approval.

Follow the [PR template](../../.github/pull_request_template.md), actual linked acceptance criteria and [repository conventions](../development/repository-conventions.md). Human review attestations remain for the author; no tooling configuration grants permission to commit, publish or merge.

[Documentation index](../README.md) · [Drift register](../audits/documentation-drift.md) · [Verification record](../audits/review-findings.md)
