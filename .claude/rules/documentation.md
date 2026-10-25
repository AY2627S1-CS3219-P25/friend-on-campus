---
paths:
  - "docs/**/*.md"
---
<!--
AI Assistance Disclosure:
Tool: Codex (model: GPT-6), date: 2026-10-25
Scope: Added documentation-scoped source verification instructions from the approved task.
Author review: <to be completed by Reallyeasy1>
-->

# Documentation maintenance

- Read `docs/README.md` and the relevant implementation before editing a technical claim. Record the inspected commit and date.
- Link executable source, configuration and tests. Check both ends of APIs/events and all service-specific failure/retry paths; avoid inferring guarantees from names or comments.
- Distinguish implemented behavior, human-approved intent, dated evidence and unapproved proposals. A pending PR is not the current main baseline.
- Record contradictions in `docs/audits/documentation-drift.md`; do not silently choose a new architecture, schema, interface or rationale to resolve them.
- Keep Wiki history/decisions separate from this implementation reference. Do not rewrite the Wiki without authorization.
- Maintain the index and coverage map; verify local links and diagrams after edits. Report actual checks and unavailable runtime verification in the review record.
- Global course policy, disclosure, usage logging and human-review requirements remain in `CLAUDE.md`; this rule does not grant tools or Git permissions.
