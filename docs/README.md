<!--
AI Assistance Disclosure:
Tool: Claude Code (model: Claude Fable 5.1), date: 2026-10-06
Scope: api entry lists notification-service.yaml.
Author review: <to be completed by Reallyeasy1>

Tool: Claude Code (model: Claude Fable 5.1), date: 2026-09-21
Scope: Created this index; on clean-up reordered it into reading order and folded three placeholder-only
folders (api, diagrams, mentor-feedback) into the "Add when first needed" table. Structure only, no design content.
Author review: <to be completed by Reallyeasy1>

Tool: Claude Code (model: Claude Fable 5.1), date: 2026-09-28
Scope: Extended the evidence entry (checklist, screenshots, UAT drivers). Added the d2-question-guide.md entry. Index text only. 2026-09-30: diagrams entry mentions the PlantUML twins.
Author review: <to be completed by Reallyeasy1>
-->



# Project docs

## Start here

1. [`architecture/overview.md`](./architecture/overview.md) — the system in one page: intended architecture (with sources) beside what is built, and the directory layout.
2. [`services/`](./services/README.md) — one page per service: run, configuration, API, data, behaviour as built. **The single detailed source for service facts**; `CLAUDE.md` and the agent files only summarise it.
3. [`requirements/`](./requirements/README.md) — links to D1, the D2 / Sprint 2 plan and the GitHub backlog, plus [`conflicts.md`](./requirements/conflicts.md), the list of places where documents, issues and code disagree.
4. [`decisions/`](./decisions/README.md) — one record per design decision. **Written by humans only**; `/new-adr <title>` creates the empty numbered file.
5. [`evidence/d2/`](./evidence/d2/README.md) — acceptance-check results for the D2 demo, [`d2-checklist.md`](./evidence/d2/d2-checklist.md) (the D2 instructions point by point, with status), and `screenshots/` at desktop and mobile widths. Produced by `scripts/uat/uat-d2-api.mjs` and `scripts/uat/uat-d2-ui.mjs`.
6. [`diagrams/`](./diagrams/) — as built, each in two forms: a Mermaid block in the `.md` (GitHub renders it) and a PlantUML `.puml` twin with a legend (render with `plantuml.jar`, see [`component.md`](./diagrams/component.md#rendering)): [`component.md`](./diagrams/component.md), [`user-schema.md`](./diagrams/user-schema.md), [`supplier-schema.md`](./diagrams/supplier-schema.md), [`auth-sequence.md`](./diagrams/auth-sequence.md) (login, then an allowed / denied supplier action). Export images only for slides.
7. [`api/`](./api/) — OpenAPI 3.0 transcriptions of the routes that exist: [`user-service.yaml`](./api/user-service.yaml), [`supplier-service.yaml`](./api/supplier-service.yaml), [`notification-service.yaml`](./api/notification-service.yaml).
8. [`d2-question-guide.md`](./d2-question-guide.md) — the D2 instructions question by question: as-built facts, what to show, and empty slots for the team's "why" answers.
9. [`onboarding-guide-sep-3.md`](./onboarding-guide-sep-3.md) — beginner walkthrough of the stack (nginx, Postgres init, Docker, workspaces), written 3 Sep from the starter template; for current service behaviour prefer `services/`.

AI tooling (Claude Code set-up, plugins, agents, hooks) is documented next to its config: [`../.claude/README.md`](../.claude/README.md) and [`../.claude/PLUGINS.md`](../.claude/PLUGINS.md).

## Who may write what

| Content | Humans | AI tools |
|---|---|---|
| As-built facts (routes, env vars, commands, file layout) | yes | yes — keep them in step with the code |
| Intent, requirements, priorities | yes | may quote and link the source documents; never invent or re-rank |
| Decisions, options, trade-offs, risks, rationale | yes | **no** — not even a draft |
| "Author review" lines in disclosure headers | yes | no |

## Add when first needed

Create the folder together with its first real file; an empty folder helps nobody.

| Folder | Put here | Note |
|---|---|---|
| `mentor-feedback/` | `YYYY-MM-DD-d2.md`, `…-d3.md` | One table per session: feedback · action · owner · issue · done. |
| `evidence/d3/`, `evidence/d4/` | same shape as `evidence/d2/` | |

`.dockerignore` excludes `*.md`, so nothing in here reaches a container image.
