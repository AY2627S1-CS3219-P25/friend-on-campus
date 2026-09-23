<!--
AI Assistance Disclosure:
Tool: Claude Code (model: Claude Fable 5.1), date: 2026-09-21
Scope: Wrote this list from the plugins installed on the author's machine (names, marketplaces and versions read
from the local plugin registry) and the project's stack and AI-usage policy. Only plugins verified to exist are named.
Author review: <to be completed by Reallyeasy1>
-->
<!--
AI Assistance Disclosure:
Tool: Codex (model: GPT-5.6 Terra), date: 2026-09-22
Scope: Corrected the password-hashing terminology in the internal plugin guide.
Author review: <to be completed by ngkhengyang>
-->

# Claude Code plugins for this project

Plugins are installed per person (`/plugin`), not by cloning the repo. This file is the team's list; `.claude/settings.json` → `enabledPlugins` turns the **Core** set on for anyone working in this repo. Fewer is better: every enabled plugin adds skills, hooks and sometimes a background server to every session.

Marketplaces: `claude-plugins-official` is built in. `claude-code-plugins` needs `/plugin marketplace add anthropics/claude-code` once.

## 1. Core — enabled in `.claude/settings.json`

| Plugin | Install | Used for | Setup |
|---|---|---|---|
| `typescript-lsp` | `/plugin install typescript-lsp@claude-plugins-official` | Go-to-definition, find-references and hover across the workspaces (the `LSP` tool); tracing who uses a `common-dtos` type before it changes | Once per machine: `npm install -g typescript-language-server typescript`, then `npm install` in the repo; restart Claude Code |
| `context7` | `/plugin install context7@claude-plugins-official` | Current docs for Prisma, Express, `amqplib`, `ws`, Vite, Tailwind | none |
| `github` | `/plugin install github@claude-plugins-official` | Issues, milestones, PRs (the acceptance criteria live in the issues) | GitHub login; the repo is `AY2627S1-CS3219-P25/nus-campus-errand` |
| `playwright` | `/plugin install playwright@claude-plugins-official` | Desktop (~1280px) and phone (~390px) checks and screenshots for #47, #71 and `docs/evidence/` | First use downloads a browser |
| `pr-review-toolkit` | `/plugin install pr-review-toolkit@claude-plugins-official` | `silent-failure-hunter` (swallowed errors in credit/order code), `pr-test-analyzer`, `code-reviewer`, `comment-analyzer` | none — see the caution on `type-design-analyzer` below |

## 2. Recommended — personal choice, not forced on teammates

| Plugin | Marketplace | Used for |
|---|---|---|
| `security-guidance` | `claude-code-plugins` | Warns on risky patterns as files are written (shell exec, injection, secrets) — relevant to JWT, password hashing, and query code |
| `code-review` | `claude-plugins-official` | `/code-review` on a diff or PR |
| `code-simplifier` | `claude-plugins-official` | Refactoring passes (an allowed AI use) |
| `claude-md-management` | `claude-plugins-official` | Keeping `CLAUDE.md` accurate as mocks become real services |
| `hookify` | `claude-code-plugins` | Turning "stop doing X" into a hook without hand-writing one |
| `learning-output-style` / `explanatory-output-style` | `claude-code-plugins` / `claude-plugins-official` | Explanations alongside the work — fits the "learning support" allowed use |
| `superpowers` | `claude-plugins-official` | Only `systematic-debugging`, `test-driven-development`, `verification-before-completion` — see cautions |

## 3. Situational — enable when the work arrives, disable after

| Plugin | When |
|---|---|
| `chrome-devtools-mcp` | Sprint 3–4: inspecting WebSocket frames and network calls for F5 / F8 |
| `frontend-design` | Visual polish of the two apps; D1 §4 wireframes stay the source of what each screen contains |
| `sonarqube` | Only if the team adopts SonarCloud as a CI quality gate (#68) |
| `document-skills` | D4 slides (due 11 Nov 2026) — check first whether the course AI policy covers slides |

## 4. Not in this repo

Because of the course AI policy (`CLAUDE.md` §1 — no AI architecture, requirements prioritisation, sprint planning or rationale):

| Plugin / part | Why |
|---|---|
| `feature-dev` | Its `code-architect` agent proposes architectures and patterns |
| `superpowers` → `brainstorming`, `writing-plans` | Steer into design and planning |
| `pr-review-toolkit` → `type-design-analyzer` | Recommends type designs; read its facts, do not adopt its design advice as your own |
| `product-management`, `operations`, `productivity` | Sprint planning, specs, roadmaps |
| `commit-commands` | The author commits, not the AI |
| `ralph-loop`, `ralph-wiggum`, `harness`, `code-modernization` | Autonomous loops / large agent fleets: cannot satisfy "one usage-log entry per prompt", and the team uses four agents |

Because they have nothing to do with this stack (Node/Express/Prisma/PostgreSQL/RabbitMQ/React): `vercel`, `deploy-on-aws`, `aws-serverless`, `firebase`, `mongodb`, `redis-development`, `forge-skills`, `atlassian`, `slack`, `linear`, `gitlab`, `logfire`, `sonatype-guide`, `serena`, `desktop-commander`, `gopls-lsp`, `modern-go-guidelines`, `agent-sdk-dev`, `plugin-dev`, `superdesign`.

## 5. Housekeeping

- **One copy each.** `code-review`, `pr-review-toolkit`, `frontend-design`, `explanatory-output-style` (and `feature-dev`, `commit-commands`, `plugin-dev`) exist in both marketplaces. Installing both doubles their skills and hooks; keep the `claude-plugins-official` copy.
- **Personal switches** go in `.claude/settings.local.json` (git-ignored): `"enabledPlugins": { "<name>@<marketplace>": false }` turns a globally installed plugin off for this repo only.
- **No plugin needed for:** Postgres (`docker exec -it campuserrand-postgres psql -U postgres`), container logs (`docker compose logs <service>`), RabbitMQ (management UI on :15672).
- Changes to this list are a team decision; update this file and `enabledPlugins` together.
