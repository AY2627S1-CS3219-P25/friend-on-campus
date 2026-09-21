---
name: issue-start
description: Start work on a GitHub issue in this repo - fetch it from the team repo, show its acceptance criteria as a checklist, and report which code it touches. Args - the issue number. Use when the author says they are picking up an issue.
---
<!--
AI Assistance Disclosure:
Tool: Claude Code (model: Claude Fable 5.1), date: 2026-09-21
Scope: Wrote this skill.
Author review: <to be completed by Reallyeasy1>
-->

# issue-start <number>

1. `gh issue view <number> -R AY2627S1-CS3219-P25/nus-campus-errand --json title,body,milestone,assignees,labels,comments` — the `-R` is required, `gh` may default to the course template repo.
2. Print the acceptance criteria as a checklist with their IDs (`F3.2.1`, `N3`, …), plus milestone, due date and assignees.
3. Report facts only: which files currently implement anything related (paths and line numbers), whether that code is real or mock (see CLAUDE.md repo map), and any place where the issue, D1, the D2 plan and the code disagree.
4. Do **not** rank this issue against others, choose an approach, or design the schema/interface — ask the author for their design, then implement it.
5. Suggest a branch name `feat/<number>-<slug>` off `dev`; create it only if the author says so. Never commit or push.
