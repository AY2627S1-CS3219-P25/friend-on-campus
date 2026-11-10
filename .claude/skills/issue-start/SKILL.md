---
name: issue-start
description: Start work on a GitHub issue in this repo - fetch it from the team repo, show its acceptance criteria as a checklist, and report which code it touches. Args - the issue number. Use when the author says they are picking up an issue.
---
<!--
AI Assistance Disclosure:
Tool: Codex (model: GPT-6); Claude Code (model: Claude Fable 5.1), date: 2026-09-21 to 2026-11-09
Scope: Wrote this skill; updated across 3 AI-assisted revisions through D4 wrap-up (repair documentation references after consolidation and align factual setup/count wording; preserve authorization policy).
Author review: I validated correctness, edited for style, and verified with automated tests.
-->

# issue-start <number>

1. `gh issue view <number> -R AY2627S1-CS3219-P25/friend-on-campus --json title,body,milestone,assignees,labels,comments` — the `-R` is required, `gh` may default to the course template repo.
2. Print the acceptance criteria as a checklist with their IDs (`F3.2.1`, `N3`, …), plus milestone, due date and assignees.
3. Use `docs/README.md` and `docs/README.md#known-limits-and-design-context` to orient, then verify against source; pending PRs/proposals are not current behavior. Report facts only: which files currently implement anything related (paths and line numbers), whether that code is real or mock (see CLAUDE.md repo map), and any place where the issue, D1, the D2 plan and the code disagree.
4. Do **not** rank this issue against others, choose an approach, or design the schema/interface — ask the author for their design, then implement it.
5. Suggest a branch name `feat/<number>-<slug>` off current `main`; create it only if the author says so. Never commit or push.
