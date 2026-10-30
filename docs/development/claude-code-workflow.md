<!--
AI Assistance Disclosure:
Tool: Codex (model: GPT-6), date: 2026-10-25
Scope: Source-linked implementation documentation and evidence review requested by Reallyeasy1.
Author review: <to be completed by Reallyeasy1>
-->

# Claude Code workflow and configuration audit

Implementation baseline: [`52d791e`](https://github.com/AY2627S1-CS3219-P25/friend-on-campus/commit/52d791e4eea28ce7d817f025ef096f8d96bda467); inspected 2026-10-25 (SGT). Pending work is explicitly labelled.

This guide records conservative tooling corrections for the approved documentation task. Root CLAUDE.md retains the course policy, bookkeeping, secret restrictions, testing obligations and protected Git rules.

## Corrections and preserved behavior

| Area | Correction | Preserved boundary |
|---|---|---|
| .claude/README.md | Current repository, five Prisma clients, existing two skills and migration diagnostics | No automatic destructive reset |
| .claude/PLUGINS.md | Current repository and accurate authentication/prerequisite notes | Same five configured plugins; no installation/enablement |
| issue-start skill | Correct repository and main base | Human design/branch control; no commit/push grant |
| Existing agent instructions | Correct stale paths/proxy descriptions and link technical docs | Existing responsibilities/tool permissions |
| CLAUDE.md | Concise implementation-reference links | Course-policy wording and attribution retained |
| rules/documentation.md | Scope evidence/drift instructions to docs/**/*.md | No new application architecture conventions |

No hook behavior or settings permission lists are changed. Existing warn-only hooks are reminders, not proof of compliance: disclosure scans only a bounded prefix/file set; usage-log check uses changed-file mtimes and cannot establish that every read-only prompt was logged. Human review fields remain pending until the author fills them.

## Existing tools and setup

The five configured identifiers were verified against Anthropic's official marketplace at `58267944f92187b7d6a1c822165c96c81c864806`:

| Plugin | Setup/allowed use |
|---|---|
| typescript-lsp | External TypeScript language-server prerequisite; symbol navigation |
| context7 | Library documentation; follow remote authentication prompts if required |
| github | GitHub MCP; current manifest references GITHUB_PERSONAL_ACCESS_TOKEN, not merely gh auth login |
| playwright | Browser automation MCP; external runtime/browser prerequisites may apply |
| pr-review-toolkit | Permitted review tasks only; preserve existing exclusions for reserved design decisions |

Configured does not mean installed, authenticated or exercised on a teammate's machine. No tokens are requested/stored by this PR. No new plugins or persistent agents are introduced.

## Working procedure

Read root instructions, docs index and the issue. Trace source before changing behavior. Reuse backend/frontend/infrastructure profiles for independent permitted tasks and reviewer for a fresh verification pass. Assign nonoverlapping ownership and keep read-only research separate from writes. An allowed-tools skill field is a permission grant, not a read-only sandbox; do not add it as a purported restriction.

For documentation, record source baseline and links; preserve implemented/intended/proposed distinctions; compare both sides of each contract; log disagreements. Do not turn a pending PR into current implementation or author architectural rationales. The docs-scoped rule adds these maintenance requirements without duplicating global course restrictions.

## Validation and limits

Existing hook tests, JSON/frontmatter syntax, referenced paths and permission preservation are checked. Root typecheck and CI matrix validation are run. Rule path matching is statically checked with inside/outside examples. No live Claude session or teammate plugin connection is available here, so runtime rule loading, LSP connectivity, browser MCP startup and authentication are explicitly unverified.

Official references: [memory/rules](https://code.claude.com/docs/en/memory), [subagents](https://code.claude.com/docs/en/sub-agents), [skills](https://code.claude.com/docs/en/skills), [hooks](https://code.claude.com/docs/en/hooks), [plugin setup](https://code.claude.com/docs/en/discover-plugins), [pinned marketplace](https://github.com/anthropics/claude-plugins-official/blob/58267944f92187b7d6a1c822165c96c81c864806/.claude-plugin/marketplace.json).

## Source evidence and related reading

- [`CLAUDE.md`](../../CLAUDE.md)
- [`AGENTS.md`](../../AGENTS.md)
- [`.claude/README.md`](../../.claude/README.md)
- [`.claude/PLUGINS.md`](../../.claude/PLUGINS.md)
- [`.claude/settings.json`](../../.claude/settings.json)
- [`.claude/agents/reviewer.md`](../../.claude/agents/reviewer.md)
- [`.claude/skills/issue-start/SKILL.md`](../../.claude/skills/issue-start/SKILL.md)
- [`.claude/hooks/hooks.test.js`](../../.claude/hooks/hooks.test.js)
- [Wiki: Team Conventions](https://github.com/AY2627S1-CS3219-P25/friend-on-campus/wiki/Team-Conventions)
- [Documentation index](../README.md) · [Drift register](../audits/documentation-drift.md) · [Verification record](../audits/review-findings.md)
