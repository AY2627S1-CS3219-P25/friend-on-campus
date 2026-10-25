<!--
AI Assistance Disclosure:
Tool: Codex (model: GPT-6), date: 2026-10-25
Scope: Source-linked implementation documentation and evidence review requested by Reallyeasy1.
Author review: <to be completed by Reallyeasy1>
-->

# CI and pull-request checks

Implementation baseline: [`52d791e`](https://github.com/AY2627S1-CS3219-P25/friend-on-campus/commit/52d791e4eea28ce7d817f025ef096f8d96bda467); inspected 2026-10-25 (SGT). Pending work is explicitly labelled.

The repository has a static test matrix and automated PR review. These workflows are verification, not evidence of an implemented cloud deployment pipeline.

`ci.yml` runs lint/build/typecheck, checks workspace test scripts against the static matrix, runs unit/integration/messaging/migration/seed suites and system acceptance/API/browser checks. Its final test gate depends on required jobs. Adding/removing a test script requires synchronizing the matrix and running `npm run ci:validate-tests`.

| Category | Important environment/behavior |
|---|---|
| Unit | Node built-in test runner through tsx; service-specific test selection |
| Integration | Isolated PostgreSQL databases; User uses ADMIN_GUARD_TEST_DATABASE_URL |
| Messaging | PostgreSQL and RabbitMQ; Order suite additionally provisions real Credit CDC |
| Migration/seed | Credit schema/seed checks against isolated databases |
| Acceptance | API, Notification and CDC drivers against a healthy stack |
| E2E API | D2 suite starts User/Supplier; test-only signing keys |
| E2E UI | Chromium/Playwright driver; JSON and screenshots under test-results |

The browser driver catches individual step failures into its results, then prints/writes the totals without setting a nonzero exit code for failed checks. Inspect the JSON/log pass/fail counts: a zero exit or green CI job alone does not establish 40/40 success. This behavior is recorded, not fixed, by this documentation change.

`claude-pr-review.yml` reviews same-repository, non-draft PRs with bounded permissions/runtime. Draft/fork PRs are skipped. Therefore this documentation draft receives an independent local review; it does not claim that the automatic Claude review ran.

The PR template requires a Summary, Linked issues with actual closing keywords, Changes, How to test and Checklist. Only fully resolved acceptance criteria belong on closing lines. The documentation PR addresses #174's UAT configuration documentation; D4 implementation issues remain references.

Review `ai/usage-log.md` and consolidated per-file disclosure blocks with the diff. Human Author review fields remain for the human. Explicit user authorization permits the requested draft publication but does not authorize merging or weakening settings.

Current check results, skipped infrastructure checks and the source baseline are recorded in [review findings](../audits/review-findings.md).

## Source evidence and related reading

- [`.github/workflows/ci.yml`](../../.github/workflows/ci.yml)
- [`.github/workflows/claude-pr-review.yml`](../../.github/workflows/claude-pr-review.yml)
- [`.github/pull_request_template.md`](../../.github/pull_request_template.md)
- [`scripts/ci/validate-test-matrix.mjs`](../../scripts/ci/validate-test-matrix.mjs)
- [`package.json`](../../package.json)
- [Wiki: Testing and Evidence](https://github.com/AY2627S1-CS3219-P25/friend-on-campus/wiki/Testing-and-Evidence)
- [Documentation index](../README.md) · [Drift register](../audits/documentation-drift.md) · [Verification record](../audits/review-findings.md)
