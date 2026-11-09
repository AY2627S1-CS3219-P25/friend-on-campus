<!--
AI Assistance Disclosure:
Tool: Codex (model: GPT-6), date: 2026-11-09
Scope: Replace a dated tooling audit with current checked-in configuration, authorization boundaries and verification pointers.
Author review: <to be completed by Reallyeasy1>

Tool: Codex (model: GPT-6), date: 2026-10-25
Scope: Source-linked implementation documentation and evidence review requested by Reallyeasy1.
Author review: <to be completed by Reallyeasy1>
-->

# Claude Code workflow reference

Source baseline: [`b989758`](https://github.com/AY2627S1-CS3219-P25/friend-on-campus/commit/b989758e766cb593c3b8c94102eb6dfb5c7d8491); inspected 9 November 2026 (SGT). These are source-verified instructions, not evidence of a new runtime test or a live AWS deployment.

This page describes the repository's checked-in AI tooling. [`CLAUDE.md`](../../CLAUDE.md) is the policy; [`.claude/README.md`](../../.claude/README.md) and [`.claude/PLUGINS.md`](../../.claude/PLUGINS.md) contain setup material. Local installation, authentication and runtime loading must be checked on the developer's machine.

## Checked-in configuration

| Path | Current responsibility |
|---|---|
| [`.claude/settings.json`](../../.claude/settings.json) | Tool permission entries, hooks and five enabled-plugin identifiers |
| [Documentation rule](../../.claude/rules/documentation.md) | Evidence, source conflicts, links and verification rules scoped to `docs/**/*.md` |
| [Agents directory](../../.claude/agents) | `backend`, `frontend`, `infrastructure`, `reviewer`; use nonoverlapping ownership when delegating |
| [Issue-start skill](../../.claude/skills/issue-start/SKILL.md) | Read issue criteria and identify affected implementation |
| [Usage-log skill](../../.claude/skills/usage-log/SKILL.md) | Record each prompt using the repository's required format |
| [Disclosure hook](../../.claude/hooks/check-disclosure.js) | Reminder after edits/writes when disclosure is missing |
| [Usage-log hook](../../.claude/hooks/check-usage-log.js) | Stop-time reminder based on changed files and log timing |

The configured plugins are `typescript-lsp`, `context7`, `github`, `playwright` and `pr-review-toolkit`, all under `claude-plugins-official`. An enabled identifier does not establish that its runtime, credentials or browser/language-server prerequisites are installed. Plugin setup details in older documents remain dated observations until rechecked against the installed version.

## Permissions and authorization

At this baseline, `settings.json` **allows** several Git write commands, including commit, push, merge and PR create/merge. Its explicit deny entries cover `.env` and `.env.local` reads. Older setup prose claiming that the file denies Git writes contradicts the configuration.

The policy in `CLAUDE.md` still requires explicit human authorization for those actions. A tool allow entry is not consent to perform an action, and a warn-only hook is not a security barrier or proof of compliance. Do not read or print real environment files, request tokens in documentation, fill human attestations, or interpret a prior task's approval as permission for unrelated work.

## Working procedure

Read the root instructions, relevant issue and docs index. Inspect executable source before changing a technical claim. Preserve the distinction between implemented behavior, human-approved intent and proposals; record disagreements in the [drift register](../audits/documentation-drift.md).

For an authorized documentation task, update only the scoped documentation and necessary links. Reuse canonical runbooks, preserve historical evidence and test documented commands by inspecting their definitions before considering execution. Architecture, schemas, interfaces and decision rationale remain the human author's responsibility.

## Verification

`node .claude/hooks/hooks.test.js` runs the existing hook self-checks without launching a Claude session. Inspect the settings JSON, referenced files and rule frontmatter separately. Verify `/agents`, `/hooks`, `/plugin` and scoped-rule loading in the actual Claude installation when diagnosing local setup.

This source review does not establish live plugin connectivity, current marketplace compatibility, teammate authentication or runtime rule activation. Executed repository checks are recorded in [review findings](../audits/review-findings.md).

The [previous audit](https://github.com/AY2627S1-CS3219-P25/friend-on-campus/blob/b989758e766cb593c3b8c94102eb6dfb5c7d8491/docs/development/claude-code-workflow.md), dated 25 October 2026 with source baseline `52d791e`, recorded checking the five identifiers against [marketplace revision `58267944`](https://github.com/anthropics/claude-plugins-official/blob/58267944f92187b7d6a1c822165c96c81c864806/.claude-plugin/marketplace.json). That is historical provenance, not a new marketplace or runtime compatibility check.

[Documentation index](../README.md) · [Drift register](../audits/documentation-drift.md) · [Verification record](../audits/review-findings.md)
