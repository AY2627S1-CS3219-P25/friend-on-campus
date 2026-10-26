<!--
AI Assistance Disclosure:
Tool: Claude Code (model: Claude Fable 5.1), date: 2026-10-25
Scope: Section 2: added timing and scope rules for the usage log (write before the final reply, question-only prompts count, log is the last file written, entry rides in approved commits, repeated hook warnings point at leftover paths).
Author review: <to be completed by Reallyeasy1>

Tool: Codex (model: GPT-6), date: 2026-10-25
Scope: Added source-linked technical navigation and corrected verified Claude workflow facts; preserved course policy and permissions.
Author review: <to be completed by Reallyeasy1>

Tool: Google Antigravity Agent, date: 2026-10-21
Scope: Slimmed down Sections 4, 5, 7, and 8 to keep CLAUDE.md focused on agent behavioral rules and remove duplicated system documentation and obsolete docs/ pointers.
Author review: <to be completed by yanhwee>

Tool: Google Antigravity Agent, date: 2026-10-21
Scope: Updated Section 5 commands to reflect scripts/dev.mjs parallel dev runner, standard npm workspace -w invocations, and test:e2e:api replacing legacy test:d2 alias.
Author review: <to be completed by yanhwee>

Tool: Claude Code (model: Claude Fable 5.1), date: 2026-10-20
Scope: Section 4 repo map: added services/chat-service (:8006, chat_db), the /ws/chat/ gateway route and the sixth database.
Author review: <to be completed by Reallyeasy1>

Tool: Google Antigravity Agent, date: 2026-10-20
Scope: Updated Section 4 Prisma CLI and root .env loading notes.
Author review: <to be completed by author after review>

Tool: Claude Code (model: Claude Opus 5.5 subagent, Claude Fable 5.1 session), date: 2026-10-18
Scope: Section 4 repo map only: App.tsx line counts updated to the real `wc -l` values (student-app 1703, admin-portal 3855) and `packages/auth` added.
Author review: <to be completed by Reallyeasy1>

Tool: Claude Code (model: Claude Fable 5.1), date: 2026-10-16
Scope: Section 4: recorded why backend services run with `init: true` and the rabbitmq health probe runs via `su-exec rabbitmq` in Compose; corrected which services register SIGTERM handlers (PR #120 review).
Author review: <to be completed by Reallyeasy1>

Tool: Codex (model: GPT-5), date: 2026-10-14
Scope: Documented that all application runtime stages use their base image's built-in non-root user.
Author review: <to be completed by ngkhengyang>

Tool: Codex (model: GPT-5), date: 2026-10-13
Scope: Updated container runtime facts for compiled backend and static NGINX multi-stage images.
Author review: <to be completed by ngkhengyang>

Tool: Codex (model: GPT-5), date: 2026-10-13
Scope: Updated the Dockerfile repository fact to describe lockfile-based npm ci installation.
Author review: <to be completed by ngkhengyang>

Tool: Google Antigravity Agent, date: 2026-10-11
Scope: Updated documentation pointers to the flattened system specifications in docs/ (architecture.md, errand-specification.md, security.md), and clarified in Section 1 and Section 6 that git commits/pushes/PRs require explicit user approval.
Author review: <to be completed by author after review>

Tool: Codex (model: GPT-5), date: 2026-10-11
Scope: Updated test commands, static-matrix maintenance, Chromium CI coverage, lint facts, and removed references to the deleted dev branch.
Author review: <to be completed by ngkhengyang>

Tool: Codex (model: GPT-5), date: 2026-10-11
Scope: Replaced dynamic test-discovery facts with the mandatory static CI matrix maintenance rule.
Author review: <to be completed by ngkhengyang>

Tool: Codex (model: GPT-5), date: 2026-10-11
Scope: Updated the CI repo facts for package-script discovery and category-specific automated test jobs.
Author review: <to be completed by ngkhengyang>

Tool: Claude Code (model: Claude Fable 5.1), date: 2026-10-05
Scope: Repo map: notification-service is no longer a mock; postgres-init creates five databases; npm test covers three services.
Author review: <to be completed by Reallyeasy1>

Tool: Claude Code (model: Claude Fable 5.1), date: 2026-10-04
Scope: Section 5: what the CI workflow runs.
Author review: <to be completed by Reallyeasy1>

Tool: Codex (model: GPT-6), date: 2026-10-01
Scope: Updated Vite proxy guidance for gateway routing in Compose and direct service routing on the host.
Author review: <to be completed by author after review>

Tool: Claude Code (model: Claude Fable 5.1), date: 2026-09-30
Scope: Section 5: added `npm test` and the unit-test note (Node's built-in runner, no framework), and put `npm test` in the before-you-say-it-works rule.
Author review: <to be completed by Reallyeasy1>

Tool: Claude Code (model: Claude Fable 5.1), date: 2026-09-29
Scope: PR #93: the Vite dev proxy note in section 4 now says student-app reads its proxy targets from env vars.
Author review: <to be completed by Reallyeasy1>

Tool: Claude Code (model: Claude Fable 5.1), date: 2026-09-21
Scope: Restructured this file into sections and added repo map, commands, gh/branch notes and
the usage-log format. The AI-usage policy wording in section 1 is the team's original text, unchanged.
Author review: <to be completed by Reallyeasy1>

Tool: Codex (model: GPT-5.6 Terra), date: 2026-09-22
Scope: Corrected internal repository facts for the author-approved Prisma and Ed25519 authentication implementation.
Author review: <to be completed by ngkhengyang>

Tool: Claude Code (model: Claude Fable 5.1), date: 2026-09-23
Scope: Added the "every PR must link the issue(s) it closes" rule to section 6, alongside the new PR template and workflow.
Author review: <to be completed by Reallyeasy1>

Tool: Claude Code (model: Claude Fable 5.1), date: 2026-09-24
Scope: Section 6 linked-issue rule now describes the Claude PR review's Linked-issues check; the separate pr-linked-issue.yml workflow was removed.
Author review: <to be completed by Reallyeasy1>

Tool: Google Antigravity Agent, date: 2026-09-24
Scope: Updated repo map and database schema management notes to reflect single-source-of-truth Prisma migration ownership per service.
Author review: (to be completed by author after review)

Tool: Codex (model: GPT-6), date: 2026-09-24
Scope: Updated the credit-service repo-map entry after replacing mock storage with Prisma.
Author review: <to be completed by huangjiaxi1111>
-->

# CLAUDE.md — NUS CampusErrand / Friend of Campus (CS3219 AY26/27 S1, Group 25)

## 1. AI usage policy (course rules — these override everything else in this file)

**Do not make any commits on your own!!** Do not push either. Leave changes in the working tree for the author to review and commit, unless the human user explicitly approves or requests you to do so.

Things you are allowed to do:
- Requirements work: discovering, interpreting, formatting, specific style writing
- Writing implementation code (e.g., functions, classes, unit tests) once requirements and architecture are finalized by you (the human author).
- Boilerplate generation (e.g., config, scaffolding, repetitive glue code).
- Debugging assistance (e.g., error explanations, test suggestions).
- Refactoring and documentation improvements (e.g., docstrings, comments).
- Learning support (e.g., "explain this algorithm").

Things you are not allowed to do:
- Requirements work: wholesale outsourcing of requirements elicitation to AI tools, prioritizing project requirements; consolidating backlog, sprint planning.
- Architecture & design: proposing/changing system architecture, component boundaries, selecting design patterns, deciding data schemas, defining interfaces, or making performance/security trade-offs.
- Decision rationales: drafting your trade-off analyses, risk mentions, or justification mentions.

### When a request crosses the line
<!-- TEAM: this paragraph is a default. Edit it to say what you actually want the AI to do. -->
If a prompt asks for something in the not-allowed list (e.g. "which schema should I use", "which issue should I do first", "write the rationale for this ADR"), say so plainly, do not answer the forbidden part, and offer the allowed alternative: explain the concepts involved, list the facts from the code/issues/docs, or implement a design the author has already decided. Do not use architecture, requirements-analysis or sprint-planning agents/skills in this repo.

## 2. Mandatory bookkeeping on every prompt

1. **Usage log.** Append an entry to `ai/usage-log.md` (newest at the bottom) in the format already used there:

   ```markdown
   ## YYYY-MM-DD HH:MM SGT — <short title>

   **Tool:** Claude Code (model: <model name>)
   **Author:** <GitHub login of the person prompting — `gh api user --jq .login`>
   **Branch:** <git branch --show-current>

   **Prompt (summarised):** <what was asked>

   **Usage scenario:** <which allowed category this falls under, and what was left to the author>

   **Files changed:**
   - `path` — what changed
   ```

   Timing and scope rules (the `/usage-log` skill does the collecting and appending):
   - Write the entry **before the final reply of every prompt**, in the same turn as the work. Never defer it to "the next prompt" or wait for the Stop hook to complain.
   - Question-only prompts, explanations and "check this" prompts count too. Write `- none` under **Files changed**; one short entry per prompt, never batched across prompts after the fact.
   - Make `ai/usage-log.md` the **last file written** in the turn, so the Stop hook (which compares file modification times) sees it as newest.
   - When the author approves a commit or push, the entry describing that prompt goes **into that commit**, not left behind in the working tree.
   - If the hook still warns after the entry is written, do not add another entry: the warning is about other uncommitted or untracked paths. Name those paths to the author and let them decide (commit, revert, ignore, or delete).

2. **Disclosure header.** Maintain exactly one consolidated disclosure block per file, at the top (after any frontmatter or shebang, using the file's comment syntax). Add new tool/date/scope and author-review records to that existing block rather than creating another heading. Preserve earlier attribution and review status. For a file without a block, use this format:

   ```
   <disclosure heading, as used at the top of this file>
   Tool: <tool> (model: <model>), date: YYYY-MM-DD
   Scope: <what the AI generated or changed in this file>
   Author review: <left for the human author to fill in — never write this for them>
   ```

   Skip files that cannot hold comments (`package.json`, `package-lock.json`, other JSON, generated files); list those in the usage-log entry instead.

3. **Inline marker.** Mark AI-written code blocks with `// AI-generated (edited by <name>)`.

## 3. Tech stack (do not add anything outside this)

- Backend: Node.js, Express, TypeScript (`tsx` for development/tests; compiled JavaScript on Node in containers), Prisma for PostgreSQL access
- Frontend: TypeScript, React, Vite, Tailwind (Vite builds static container assets served by NGINX; Bun is the agreed frontend runtime, while the repo currently runs on npm workspaces — follow what the repo does, do not migrate on your own)
- Database: PostgreSQL 16, one database per service
- Messaging: RabbitMQ 3.13
- New dependency needed? Ask first. If approved, add it to that workspace's `package.json` **and** automatically update the Dockerfile(s)/`docker-compose.yml` so the container build still works.

## 4. Repo map & coding rules

Architecture, setup, seed accounts, and test categories are documented in `README.md` and the [Project Wiki](https://github.com/AY2627S1-CS3219-P25/friend-on-campus/wiki). Use [docs/README.md](docs/README.md) for source-linked implementation navigation and [documentation drift](docs/audits/documentation-drift.md) for unresolved source conflicts. Pending PRs and proposals do not establish current behavior or human approval. Code (`packages/common-dtos`, `services/*/prisma/schema.prisma`, `gateway/nginx.conf`, `docker-compose.yml`) is the source of truth for implementation.

```
services/user-service          :8001  Prisma (user_db)          entry src/index.ts
services/supplier-service      :8002  Prisma (supplier_db)      entry src/index.ts, logic src/suppliers/
services/order-service         :8003  Prisma (order_db)         entry src/index.ts, Debezium CDC outbox
services/credit-service        :8004  Prisma (credit_db)        entry src/index.ts, logic src/credits/
services/notification-service  :8005  Prisma (notification_db)  entry src/index.ts, REST + ws + consumer
services/chat-service          :8006  Prisma (chat_db)          entry src/index.ts, REST + ws hub + consumer (F8)
apps/student-app               :5173  modular src/ (App.tsx, pages/, components/, hooks/, api/)
apps/admin-portal              :5174  modular src/ (App.tsx, pages/, components/, hooks/, api/)
packages/auth                         @campus-errand/auth: offline Ed25519 token verification, authMiddleware, requireAdmin
packages/common-dtos                  shared DTOs, OrderStatus, events, ApiResponse<T>
packages/messaging                    @campus-errand/messaging: RabbitMQ quorum-queue & DLQ consumer/publisher client
gateway/nginx.conf             :80    /api/* -> services, /ws/ -> notifications, /ws/chat/ -> chat, /admin/, /
docker/                               debezium/, postgres-init/, rabbitmq/
```

Rules for working in this repo:

- **Prisma migrations & isolated clients:** `docker/postgres-init/*.sql` only provisions empty logical databases and per-service roles. Schema changes belong strictly in each service's `prisma/schema.prisma` and `prisma/migrations/`. Import the Prisma client from `../database/client`, never directly from `src/generated/prisma` or a root `@prisma/client`.
- **Environment variables:** Never read, print, or commit `.env` files. Root `.env.example` is the single reference; every new env var must be added there with a safe placeholder.
- **Shared contracts (`packages/common-dtos`):** Changing shared DTOs or events is an interface change — the human author decides, you implement and run `npm run typecheck` across all workspaces.
- **Authentication (`packages/auth`):** User Service signs Ed25519 access tokens with `JWT_PRIVATE_KEY`; downstream services verify them offline via `@campus-errand/auth` (`JWT_PUBLIC_KEY`, issuer, audience). Refresh tokens are opaque and remain in an `HttpOnly` cookie.
- **Containers & Compose:** Do not remove `init: true` on backend services or `su-exec rabbitmq` on the RabbitMQ healthcheck in `docker-compose.yml` (see inline comments in `docker-compose.yml`). Every application Dockerfile runtime stage runs as its non-root user (`node` or `nginx`).

## 5. Verification & commands

See `README.md` for full local dev, seeding, and test commands. Key agent verification rules:

- **Before saying a change works:** always run `npm run typecheck` (which covers both `src/**` and `test/**` across all 10 workspaces) and the directly relevant test categories (`npm run test:unit`, `test:integration`, `test:messaging`, `test:e2e:api`, or full isolated `npm test`). Report the real output and any unavailable infrastructure.
- **`npm run test:e2e:api` port requirement:** spawns `user-service` and `supplier-service` itself on ports 8001/8002 against `localhost:5432` (with seeded databases), so stop host/container listeners on 8001/8002 first.
- **Test runner & linter:** Unit tests use Node's built-in `node --test` via `tsx` (no external test framework). Root `npm run lint` runs ESLint. Do not add another test framework or linter unprompted.
- **Mandatory CI matrix sync:** whenever adding, renaming, moving, or removing a `test:*` script in any `package.json`, update `.github/workflows/ci.yml` in the same change and run `npm run ci:validate-tests`.
- **Claude Code tooling:** see `.claude/README.md` (setup) and `.claude/PLUGINS.md` (allowed/forbidden plugins). Prefer the `LSP` tool over grepping when tracing TypeScript symbols across workspaces.

## 6. Git and GitHub

- Team repo: `AY2627S1-CS3219-P25/friend-on-campus`. Always pass `-R AY2627S1-CS3219-P25/friend-on-campus` to `gh issue` / `gh pr` commands (some clones also have an `upstream` remote).
- Branches: `main` (releases) and `milestone-d2` (D2 demo baseline).
- Issues carry the acceptance criteria (`[F3.2]`, `[Order Service] [N3]`, …). Read the issue before implementing, and quote the criterion IDs you covered in your summary.
- **Every PR must link the issue(s) it closes.** The PR body must contain one closing-keyword line per issue (`Closes #<n>`, `Fixes #<n>`, or `Resolves #<n>`) under the **Linked issues** section of `.github/pull_request_template.md`. When drafting a PR body for the author, never leave `Closes #` blank — if no issue matches, tell the author an issue must be created first.
- Never commit, push, merge, force-push, or open/close issues and PRs yourself, unless the human user explicitly approves or requests you to do so.

## 7. Source documents

- D1 (requirements F1–F9, NFRs, sprint plan, state diagram): https://docs.google.com/document/d/1pGy36fN4PxwMNIlgRTL3MW0ZTM3tERtG15KpUSY3c3M
- D2 / Sprint 2 plan (work packages, acceptance checks, API sketch): https://docs.google.com/document/d/1I8sma-xUGapxvc6mSDyOLj8kihsAhL5erxinlP82pv8
- Project Wiki (architecture, authentication & roles, services, data model, milestone runbooks): https://github.com/AY2627S1-CS3219-P25/friend-on-campus/wiki
- Data transfer objects and API schemas: `packages/common-dtos` (TypeScript source of truth)

Where the documents, the issues and the code disagree, do not pick a side silently: point out the conflict and let the author decide.

## 8. Agent team (`.claude/agents/`)

Four subagents. The **main session is the orchestrator**: it owns the task, integrates the pieces and does the final verification. (Architecture decisions belong to the human author, not to the main session and not to any agent — section 1.)

| Agent | Writes to | Workstream |
|---|---|---|
| `backend` | `services/**`, `packages/**`, Prisma schemas + `docker/postgres-init` SQL | Services, shared contracts, database work |
| `frontend` | `apps/**` | student-app, admin-portal |
| `infrastructure` | Dockerfiles, `docker-compose.yml`, `gateway/`, `.env.example`, `.github/` | Containers, gateway, CI, startup/proxy debugging |
| `reviewer` | `scripts/**` and test files only | Tests, acceptance evidence, drift, code review, AI-policy check |

**When to delegate — default is don't.** Use 0 agents for most prompts. Number of agents = number of *independent* pieces of work in this task, not number of folders it touches.

- Do it yourself when the task is small, sequential, or tightly coupled — e.g. an access-token change that touches User Service, Supplier Service verification, and nginx together is **one** piece of work: do it in the main session (or give the whole thing to one agent), never split it across agents editing both sides independently.
- Delegate when a piece can genuinely proceed in parallel (a `backend` endpoint and the `frontend` screen against an already-agreed contract), when it needs heavy reading or noisy logs you do not want in context, or when you want independent eyes (`reviewer` after you or another agent wrote the code).
- Never run two agents whose file sets overlap, and never two instances of the same agent on the same service.
- Do not explore the same code yourself that you just sent an agent to explore.

**Rules of use**
- Every agent stops and returns a question when it needs a design decision the author has not stated. Relay it to the author verbatim; do not answer it yourself and re-launch.
- Put the author's decided design **in the task text** — agents do not see this conversation.
- Agents report files changed; the main session writes **one** `ai/usage-log.md` entry per prompt.
