---
name: usage-log
description: Append the mandatory AI usage-log entry for the current prompt to ai/usage-log.md. Use at the end of every prompt that was answered in this repo, and whenever the usage-log hook warns.
---
<!--
AI Assistance Disclosure:
Tool: Claude Code (model: Claude Fable 5.1), date: 2026-09-21
Scope: Wrote this skill; it restates the log format the team already uses in ai/usage-log.md.
Author review: <to be completed by Reallyeasy1>
-->

# usage-log

1. Collect: `gh api user --jq .login` (author), `git branch --show-current`, `git status --porcelain` (files), and the current date/time in SGT.
2. Append (never rewrite or reorder older entries) to `ai/usage-log.md`:

```markdown

## YYYY-MM-DD HH:MM SGT — <short title>

**Tool:** Claude Code (model: <your model name>)
**Author:** <login>
**Branch:** <branch>

**Prompt (summarised):** <what the author asked, faithfully; no secrets>

**Usage scenario:** <which allowed category from CLAUDE.md section 1 this was, and what was left for the author to decide>

**Files changed:**
- `path` — what changed
```

3. If no files changed, still log the prompt and write `- none` under Files changed.
4. If part of the prompt was declined under the AI policy, say so in **Usage scenario**.
5. List files that cannot carry a disclosure header (JSON, lock files) here instead.
