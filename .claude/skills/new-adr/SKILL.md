---
name: new-adr
description: Create the next numbered design-decision record in docs/decisions/ from the template, filling in metadata only. Use when the author says they have made, or need to record, a design decision. Args - the decision title, optionally an issue number.
---
<!--
AI Assistance Disclosure:
Tool: Claude Code (model: Claude Fable 5.1), date: 2026-09-21
Scope: Wrote this skill (file scaffolding only).
Author review: <to be completed by Reallyeasy1>
-->

# new-adr

The course AI policy forbids AI-drafted trade-off analyses, risks and justifications. This skill only does the clerical part.

1. Find the highest `NNNN-*.md` in `docs/decisions/` and add 1 (zero-padded to 4 digits).
2. Copy `docs/decisions/0000-template.md` to `docs/decisions/NNNN-<kebab-case-title>.md`.
3. Fill in **only**: title, date, `Status: Proposed`, deciders (`gh api user --jq .login`), and links to the related issue / D1 / D2 section if the author gave them.
4. Leave **Context, Options considered, Decision, Rationale, Consequences** exactly as the template has them. Do not pre-fill, suggest wording, or list pros and cons — even if asked. You may, if asked, list *facts* under a separate "Facts from the codebase" heading (file paths, current behaviour, what the issue text says), with no evaluation.
5. Add a row to the index table in `docs/decisions/README.md`.
6. Tell the author which sections are theirs to write.
