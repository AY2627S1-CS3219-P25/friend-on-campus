<!--
AI Assistance Disclosure:
Tool: Codex (model: GPT-6, GPT-5, GPT-5.6 Terra); Claude Code (model: Claude Fable 5.1, Claude Opus 5.5); Google Antigravity Agent, date: 2026-09-21 to 2026-11-10
Scope: Course AI usage policy, consolidated 4-line disclosure header policy, repository architecture map, verification commands, and subagent boundaries.
Author review: I validated correctness, edited for style, and verified with automated tests.
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
   - When a prompt ends with a merge to `main`, write and commit the entry on the feature branch **before** merging (phrase it as "merging once CI is green"). `main` requires a pull request, so an entry written on `main` afterwards needs its own issue and PR to land.
   - If the hook still warns after the entry is written, do not add another entry: the warning is about other uncommitted or untracked paths. Name those paths to the author and let them decide (commit, revert, ignore, or delete).

2. **Short file-header disclosure.** Maintain a **single concise 4-line `AI Assistance Disclosure:` block** at the top of each AI-influenced file (after any frontmatter or shebang, using the file's comment syntax), matching the CS3219 Project Document (Appendix 2):

   ```
   AI Assistance Disclosure:
   Tool: <tool(s) & model(s)>, date: YYYY-MM-DD (or YYYY-MM-DD to YYYY-MM-DD)
   Scope: <concise 1-line summary of AI-assisted work in this file>
   Author review: I validated correctness, edited for style, and verified with automated tests.
   ```

   Update the single `Tool:`, `date:`, and `Scope:` lines in place rather than stacking multiple chronological blocks at the top of the file; full chronological prompt history belongs in `ai/usage-log.md`. Skip files that cannot hold comments (`package.json`, `package-lock.json`, other JSON, generated files) and list those in `ai/usage-log.md` instead.

3. **No inline `AI-generated` clutter & Project-Level AI Use Summary.** Do **not** scatter `// AI-generated (edited by ...)`, `# AI-generated`, `%% AI-generated`, or `<!-- AI-generated -->` inline tags inside code or Markdown blocks — the top-of-file 4-line disclosure block and `ai/usage-log.md` provide full attribution without cluttering source or documentation files. Preserve the `## AI Use Summary` section at the end of `README.md` (required by CS3219 Appendix 2).

## 3. Tech stack (do not add anything outside this)

- Backend: Node.js, Express, TypeScript (`tsx` for development/tests; compiled JavaScript on Node in containers), Prisma for PostgreSQL access
- Frontend: TypeScript, React, Vite, Tailwind (Vite builds static container assets served by NGINX; Bun is the agreed frontend runtime, while the repo currently runs on npm workspaces — follow what the repo does, do not migrate on your own)
- Database: PostgreSQL 16, one database per service
- Messaging: RabbitMQ 3.13
- New dependency needed? Ask first. If approved, add it to that workspace's `package.json` **and** automatically update the Dockerfile(s)/`docker-compose.yml` so the container build still works.

### Cloud deployment and evaluation constraints

- Deploy only on AWS in Asia Pacific (Singapore), `ap-southeast-1`. The total project cloud allowance is **S$250**. **Kubernetes is optional**. Use the [ECS Terraform rollout](infra/terraform/ecs/README.md) and [Cloud Architecture Guide](docs/architecture/cloud-architecture.md) for current cloud deployment instructions.
- Application services must be able to scale independently. Keep the application runnable and testable locally with Docker Compose. Live features can depend on external APIs: NUS SoCLaaS calls from AWS are allowed, and live translation is required for the demo.
- For the November 2026 demo, showcase all features and preserve committed order and credit data. The full order and credit workflow should recover within a few minutes after a host failure. A full Availability Zone outage is out of scope for this demo. A fresh environment may start from seed data.
- Keep the deployment available for verification through the **28 November 2026 exam**. After the **12 November demo**, resources may be stopped and brought back up when requested. Continuous uptime after the demo is not required.
- Use checked-in configuration (`infra/terraform/ecs/`, `.github/workflows/deploy-ecs.yml`, `.github/workflows/deploy-infra.yml`) for current cloud deployment behavior and require explicit human approval for any new architectural changes. The author owns all architectural decisions and their rationale (§1).

## 4. Repo map & coding rules

Architecture, setup, seed accounts, and test categories are documented in `README.md` and the 12 canonical developer guides indexed in [docs/README.md](docs/README.md) (see also [known limitations](docs/README.md#known-limits-and-design-context)). Code (`packages/common-dtos`, `services/*/prisma/schema.prisma`, `gateway/nginx.conf`, `docker-compose.yml`) is the source of truth for implementation.

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
packages/llm                          @campus-errand/llm: shared NUS SoCLaaS client for order assistant, chat translation, and moderation
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

- **Before saying a change works:** always run `npm run typecheck` (which covers both `src/**` and `test/**` across all 12 workspaces) and the directly relevant test categories (`npm run test:unit`, `test:integration`, `test:messaging`, `test:e2e:api`, or full isolated `npm test`). Report the real output and any unavailable infrastructure.
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
- When the author asks you to address review findings and has approved replying, post the reply in each review thread in the **same prompt** as the fix commit, quoting the commit hash and the regression test or manual check. If posting is not approved or is denied by the session's permissions, hand the reply texts to the author in that same reply.
- Worktrees: before `git worktree remove`, make sure no editor window is open on that folder. Editor language servers run from its `node_modules` and keep the directory locked.

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
