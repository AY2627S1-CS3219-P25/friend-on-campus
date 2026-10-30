<!--
AI Assistance Disclosure:
Tool: Codex (model: GPT-6), date: 2026-10-25
Scope: Source-linked implementation documentation and evidence review requested by Reallyeasy1.
Author review: <to be completed by Reallyeasy1>
-->

# Repository and documentation conventions

Implementation baseline: [`52d791e`](https://github.com/AY2627S1-CS3219-P25/friend-on-campus/commit/52d791e4eea28ce7d817f025ef096f8d96bda467); inspected 2026-10-25 (SGT). Pending work is explicitly labelled.

The root CLAUDE.md policy and AGENTS.md pointer govern every AI tool. This page is navigation and process documentation, not a replacement policy or a grant of new authority.

## Sources and ownership

Source/configuration establishes current behavior. Human-approved specifications establish intended behavior; issues supply acceptance criteria. Wiki pages preserve established system documentation, proposals and milestone history. README owns quick-start commands. New docs provide implementation traceability, exact boundaries and verification records.

Never silently resolve disagreements. Record source path/line or URL, expected versus observed behavior, baseline, and the human question. A proposal, open PR or an AI disclosure with a pending review field is not proof of human approval.

## File conventions

Preserve existing service layouts instead of imposing a generic structure: User uses auth/users/persistence, Supplier suppliers/, Order orders/repositories/clients/messaging, Credit credits/, Notification notifications/ws. Use generated Prisma clients only through each database/client facade. Runtime changes to contracts/schemas require human decisions and root typechecking.

Every new document names its purpose and source baseline, links relevant implementation/test files, distinguishes implementation from intent, and names limitations. Keep shared event topology in one catalogue; service pages describe local behavior. Use compact Mermaid diagrams with exact source functions/states and link related docs.

## AI bookkeeping and Git

Append one usage-log entry per prompt; the planning prompt's entry was deferred because the user explicitly required no writes before approval. Maintain one consolidated disclosure block per comment-capable file, preserving earlier attribution. Never fill human review attestations. JSON files cannot hold such comments and must be listed in the log when changed.

Start from a verified main baseline in an isolated branch and preserve unrelated working changes. Commit/push/PR actions require explicit authorization; the approved task supplies it for this draft documentation PR only. Do not merge, rewrite history, close unrelated issues or remove permission denials. A closing issue line must describe work actually completed.

The independent reviewer reports defects without editing the reviewed docs/config. Human-owned architectural rationales and policy choices remain unresolved when evidence is absent. Consult [Claude workflow](claude-code-workflow.md) and [review findings](../audits/review-findings.md).

## Source evidence and related reading

- [`CLAUDE.md`](../../CLAUDE.md)
- [`AGENTS.md`](../../AGENTS.md)
- [`.claude/agents/reviewer.md`](../../.claude/agents/reviewer.md)
- [`.github/pull_request_template.md`](../../.github/pull_request_template.md)
- [Wiki: Team Conventions](https://github.com/AY2627S1-CS3219-P25/friend-on-campus/wiki/Team-Conventions)
- [Documentation index](../README.md) · [Drift register](../audits/documentation-drift.md) · [Verification record](../audits/review-findings.md)
