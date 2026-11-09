<!--
AI Assistance Disclosure:
Tool: Codex (model: GPT-6), date: 2026-11-09
Scope: Replace task-specific stale permissions and dated file-layout notes with current documentation maintenance guidance.
Author review: <to be completed by Reallyeasy1>

Tool: Codex (model: GPT-6), date: 2026-10-25
Scope: Source-linked implementation documentation and evidence review requested by Reallyeasy1.
Author review: <to be completed by Reallyeasy1>
-->

# Repository and documentation conventions

Source baseline: [`b989758`](https://github.com/AY2627S1-CS3219-P25/friend-on-campus/commit/b989758e766cb593c3b8c94102eb6dfb5c7d8491); inspected 9 November 2026 (SGT). These are source-verified instructions, not evidence of a new runtime test or a live AWS deployment.

[`AGENTS.md`](../../AGENTS.md) points to [`CLAUDE.md`](../../CLAUDE.md), which governs every AI tool used in this repository. This page explains where documentation belongs; it does not replace that policy or grant permission to publish changes.

## Canonical locations

| Information | Home |
|---|---|
| Initial setup, entry URLs and seed accounts | [Root README](../../README.md) |
| Current implementation, service contracts and operational boundaries | [docs index](../README.md) |
| AWS rollout commands and prerequisites | [ECS Terraform README](../../infra/terraform/ecs/README.md) |
| k6 flags, profiles and evidence bundle format | [k6 README](../../tests/k6/README.md) |
| Design context, proposals and milestone records | [Project wiki](https://github.com/AY2627S1-CS3219-P25/friend-on-campus/wiki) |
| Source disagreements and verification limits | [Drift register](../audits/documentation-drift.md) and [review record](../audits/review-findings.md) |

Link to the canonical detail rather than maintaining a second command list or copying a wiki page. Source code/configuration establishes implemented behavior; explicit human decisions and accepted requirements establish intended behavior. A proposal, merged PR or pending `Author review` field does not prove approval, deployment or acceptance completion.

## Editing a technical guide

1. Read the [docs-scoped rule](../../.claude/rules/documentation.md), current source, relevant tests and the existing page.
2. Keep the guide focused on its reader's task. Use short paragraphs, exact commands and source links; use tables or compact diagrams when they reduce ambiguity.
3. Label implementation, intended behavior, proposals and dated evidence separately. Recheck claims before updating a source baseline or verification date.
4. Record unresolved conflicts with both sources and their practical consequence. Do not silently choose new schemas, interfaces, authorization rules or architectural rationale.
5. After moving a page, repair relative links and incoming repository references. Keep a short forwarding page where existing external/wiki links need the old path.
6. Keep historical evidence under its original revision/date and make it reachable from the index. Archive superseded instructions rather than presenting them as current setup guidance.
7. Check local links, anchors, diagrams and documented commands. Record actual verification and unavailable checks; do not execute destructive setup or production load merely to check prose.

Follow each service's existing module layout when linking source. Prisma schemas/migrations remain service-owned, and generated clients are imported through their `database/client` facade. Documentation edits do not authorize runtime changes.

## Attribution and change control

Maintain one consolidated disclosure block in each edited Markdown file, preserving prior authors and review status. Add the current tool/date/scope; leave human review fields for the author. Append the required `ai/usage-log.md` entry before the final reply and make it the last file written, as specified by `CLAUDE.md`.

Use an isolated branch/worktree and preserve unrelated edits. Commits, pushes, merges, issue/PR creation and wiki publication require the relevant explicit user authorization. Tool permission settings do not supply that authorization. A PR closing line must correspond to work that actually satisfies the linked issue's criteria.

See the [Claude workflow reference](claude-code-workflow.md) for the checked-in tooling and its limitations. Changes to active docs belong with the implementation change that invalidates them; historical records retain their provenance.

[Documentation index](../README.md) · [Drift register](../audits/documentation-drift.md) · [Verification record](../audits/review-findings.md)
