<!--
AI Assistance Disclosure:
Tool: Claude Code (model: Claude Fable 5.1), date: 2026-09-21
Scope: Created the docs folder skeleton and this index (structure only, no design content).
Author review: <to be completed by Reallyeasy1>
-->

# Project docs

| Folder | What goes here | Who writes it |
|---|---|---|
| [`architecture/`](./architecture/overview.md) | Intended architecture (with sources) next to what is built, per service; directory layout | Team — AI tools may update the "built" facts, never the intent or any rationale |
| [`services/`](./services/README.md) | One page per service: how to run it, configuration, API, data, behaviour as built, differences from the documents | Service owner — AI tools may update the as-built facts |
| [`requirements/`](./requirements/README.md) | Links to D1 and the D2 / Sprint 2 plan, and the open conflicts list | Team |
| [`decisions/`](./decisions/README.md) | One record per design decision (ADR) | **Humans only** — AI may create the empty file via `/new-adr` |
| [`api/`](./api/README.md) | API contract per service (the D2 plan, Appendix C, asks for OpenAPI) | Service owner |
| [`diagrams/`](./diagrams/README.md) | Component, schema and sequence diagrams for the milestone demos | Team |
| [`evidence/`](./evidence/d2/README.md) | Acceptance-check results and screenshots per milestone | Work-package owner |
| [`mentor-feedback/`](./mentor-feedback/README.md) | Notes from D2 / D3 check-ins, one owner per action | Whoever leads the session |
| [`onboarding-guide-sep-3.md`](./onboarding-guide-sep-3.md) | Beginner walkthrough of the stack | — |

Note: `.dockerignore` excludes `*.md`, so nothing in here reaches a container image.
