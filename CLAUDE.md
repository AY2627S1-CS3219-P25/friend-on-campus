<!--
AI Assistance Disclosure:
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

**Do not make any commits on your own!!** Do not push either. Leave changes in the working tree for the author to review and commit.

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

- Backend: Node.js, Express, TypeScript (run with `tsx`), Prisma for PostgreSQL access
- Frontend: TypeScript, React, Vite, Tailwind (Bun is the agreed frontend runtime; the repo currently runs on npm workspaces — follow what the repo does, do not migrate on your own)
- Database: PostgreSQL 16, one database per service
- Messaging: RabbitMQ 3.13
- New dependency needed? Ask first. If approved, add it to that workspace's `package.json` **and** automatically update the Dockerfile(s)/`docker-compose.yml` so the container build still works.

## 4. Repo map

Compact map (state as of 2026-09-21; if the code differs, trust the code and fix the docs). **Detail lives in `docs/` — read it instead of re-exploring:** per-service pages in `docs/services/<name>.md` (routes, env vars, data, behaviour as built), the system picture and full directory tree in `docs/architecture/overview.md`.

```
services/user-service          :8001  real (Prisma, user_db)      entry src/index.ts
services/supplier-service      :8002  real (Prisma, supplier_db)  entry src/backend/server.ts
services/order-service         :8003  real (Prisma, order_db)     entry src/index.ts
services/credit-service        :8004  Prisma, credit_db           entry src/index.ts, logic src/credits/
services/notification-service  :8005  Prisma, notification_db     entry src/index.ts, REST + ws + consumer
apps/student-app               :5173  one src/App.tsx (~730 lines), no router
apps/admin-portal              :5174  one src/App.tsx (~1650 lines), no router
packages/common-dtos                  shared user/auth DTOs, OrderStatus, events, ApiResponse<T>
gateway/nginx.conf             :80    /api/* -> services, /ws/ -> notifications, /admin/, /
docker/postgres-init/*.sql            creates the 5 databases (tables managed per-service by migrations)
docker-compose.yml                    everything above + postgres:16 (5432) + rabbitmq:3.13 (5672, 15672)
scripts/test-d2-e2e.ts                D2 end-to-end suite        data/  supplier seed CSV + images
docs/  ai/usage-log.md  .claude/      documentation, AI usage log, Claude Code config
```

Things that are easy to get wrong:

- **Table schemas are managed per-service via Prisma migrations.** Tables are no longer created in `docker/postgres-init/*.sql` (which only provisions the empty logical databases). Each service deploys its own migrations on startup (`npx prisma migrate deploy`) or via `npm run db:migrate --workspace=@campus-errand/<service>`. Schema changes belong strictly in each service's `schema.prisma` and `prisma/migrations/`. When starting a fresh Postgres volume with `docker compose down -v`, each service runs its migrations and seeds upon container boot.
- **Access tokens use Ed25519 in `Authorization: Bearer …`**. User Service signs them with `JWT_PRIVATE_KEY`; Supplier Service verifies them with the shared `@campus-errand/auth` package and `JWT_PUBLIC_KEY`, issuer, and audience. Refresh tokens are opaque and remain in an HttpOnly cookie. Keep these service settings aligned when the author approves an authentication-contract change.
- **Prisma clients are per service**, generated into `src/database/generated/` (git-ignored). Import from `../database/client`, never from a root `@prisma/client`. Every Prisma CLI call needs `--schema src/database/prisma/schema.prisma` (the npm scripts already pass it).
- `src/database/client.ts` calls `dotenv.config()` itself so standalone scripts (seed) see `.env`. `.env` files are git-ignored; never read, print or commit them. Root `.env.example` is the reference.
- A service that gains a database should reuse the user/supplier `src/database/` layout rather than a new one.
- `packages/common-dtos` is the contract between services and both apps. Changing it is an interface change — the author decides, you implement and run `npm run typecheck` across all workspaces.
- Vite dev proxies: Compose sets `GATEWAY_URL` for both apps, so API and WebSocket requests go through nginx. Without it, host-based development sends user, supplier and notification requests directly to their localhost ports. The student app sends `/admin` to `ADMIN_PORTAL_URL` (default `http://localhost:5174`); Compose sets that variable to the admin portal container.
- Dockerfiles copy only the root `package.json`, `packages/` and the service's own folder, then `npm install`. A new npm dependency in that service's `package.json` needs no Dockerfile edit; a new shared folder, a native/system package, or a new env var does (Dockerfile and/or `docker-compose.yml`). `.dockerignore` excludes `*.md`.

## 5. Commands

```bash
npm install                                   # also runs prisma generate for every service
docker compose up postgres rabbitmq -d        # backing services only
docker compose up --build                     # whole stack
npm run dev:user | dev:supplier | dev:order | dev:credit | dev:notif | dev:student | dev:admin
npm run db:migrate --workspace=@campus-errand/<service>
npm run db:seed    --workspace=@campus-errand/<service>
npm run typecheck                             # all workspaces — run after every code change
npm run test                                  # unit tests: user-, supplier- and notification-service (node:test + tsx, no database)
npm run test:d2                               # D2 end-to-end suite — see note below
docker exec -it campuserrand-postgres psql -U postgres
```

`npm run test:d2` **spawns user-service and supplier-service itself** on 8001/8002 against `localhost:5432`. It needs Postgres up and both databases seeded, and ports 8001/8002 **free** — stop `docker compose` app containers and any `npm run dev:user|dev:supplier` first, or it tests whatever is already listening.

**Set-up:** new machine or new teammate → `.claude/README.md` (prerequisites, plugins, checks, troubleshooting).

**Plugins:** the team's list (core, recommended, situational, and what must stay off in this repo) is `.claude/PLUGINS.md`; the core set is enabled in `.claude/settings.json`. Do not suggest or use plugins from its "Not in this repo" section.

**Code intelligence:** the `typescript-lsp` plugin is enabled for this project (`.claude/settings.json`). It needs the server on your PATH once per machine — `npm install -g typescript-language-server typescript` — and `npm install` in the repo so imports and the generated Prisma clients resolve. With it, prefer the `LSP` tool (go to definition, find references, hover) over grepping when tracing a type or function across workspaces, e.g. who uses a `common-dtos` type. It does not replace `npm run typecheck` before reporting.

Unit tests use Node's built-in runner (`node --test` through `tsx`; no test framework is installed; needs Node 22.3+, pinned in the root `package.json` `engines`; the Dockerfiles stay on `node:20-alpine` because containers do not run the tests): `services/<name>/test/*.test.ts`, run with `npm test` at the root or in the workspace. They need no database: user-service tests use in-memory repositories, supplier-service tests replace the Prisma client and the repository with `mock.module` (hence `--experimental-test-module-mocks` in its script). Each service's `typecheck` script uses `tsconfig.test.json`, which includes `src/**` and `test/**`, so `npm run typecheck` covers the tests too (`build` still uses `tsconfig.json`, src only). There is no lint script (tracked in issue #68). Do not add a test framework or linter unprompted.

Before saying a change works: run `npm run typecheck` and `npm test`, and `npm run test:d2` if user-service, supplier-service or either app was touched. Report the real output, including failures.

CI (`.github/workflows/ci.yml`) runs on every pull request and on pushes to `main`: `npm run typecheck` and `npm test` with a PostgreSQL service (`ADMIN_GUARD_TEST_DATABASE_URL` set, so the user-service admin-guard tests run), then the whole Compose stack with `scripts/uat/uat-d2-api.mjs`, the notification-service broker test and `scripts/uat/uat-notifications.mjs`, and `npm run test:d2`. The browser driver `scripts/uat/uat-d2-ui.mjs` is not in CI: Playwright is not a dependency of this repo.

## 6. Git and GitHub

- Team repo: `AY2627S1-CS3219-P25/friend-on-campus`. Some clones also have an `upstream` remote (`CS3219-AY2627S1/FoC-Template`) and `gh` may default to it — **always pass `-R AY2627S1-CS3219-P25/friend-on-campus`** to `gh issue` / `gh pr` commands.
- Branches: `main` (releases), `dev` (integration), `milestone-d2` (D2 demo baseline), feature branches off `dev`.
- Issues carry the acceptance criteria (`[F3.2]`, `[Order Service] [N3]`, …). Read the issue before implementing, and quote the criterion IDs you covered in your summary.
- **Every PR must link the issue(s) it closes.** The PR body (not only the title or commits) must contain one closing-keyword line per issue — `Closes #<n>` (`Fixes #<n>` / `Resolves #<n>` also work) — so GitHub closes the issue when the PR is merged. `.github/pull_request_template.md` has a **Linked issues** section for this. The `Claude PR review` workflow (`.github/workflows/claude-pr-review.yml`) checks it on every push: it reads the linked issues, compares their acceptance criteria with the diff, searches open issues for related work the PR does not link, and reports all of this in a **Linked issues** section of its summary comment with `Closes #<n>` lines to paste. It does not fail the PR or edit its body; the author decides which issues a PR closes. When you draft a PR title/body for the author, use the template, take the issue number from the task or from the matching open issue, and never leave `Closes #` blank — if no issue matches, tell the author an issue must be created first.
- Never commit, push, merge, force-push, or open/close issues and PRs yourself.

## 7. Source documents

- D1 (requirements F1–F9, NFRs, sprint plan, state diagram): https://docs.google.com/document/d/1pGy36fN4PxwMNIlgRTL3MW0ZTM3tERtG15KpUSY3c3M
- D2 / Sprint 2 plan (work packages, acceptance checks, API sketch): https://docs.google.com/document/d/1I8sma-xUGapxvc6mSDyOLj8kihsAhL5erxinlP82pv8
- Architecture overview (intended vs built, per service, with sources; directory layout): `docs/architecture/overview.md` — read it before any cross-service work
- Per-service documentation (run, config, API, data, behaviour as built): `docs/services/<name>.md` — update the page in the same change that alters a service's routes, env vars, data model or mock/real status
- Open conflicts: `docs/requirements/conflicts.md` · Recorded decisions: `docs/decisions/` · API contracts: `docs/api/` (created when the first contract is written)
- Onboarding: `docs/archive/onboarding-guide-sep-3.md`

Where the documents, the issues and the code disagree, do not pick a side silently: point out the conflict and let the author decide.

## 8. Agent team (`.claude/agents/`)

Four subagents. The **main session is the orchestrator**: it owns the task, integrates the pieces and does the final verification. (Architecture decisions belong to the human author, not to the main session and not to any agent — section 1.)

| Agent | Writes to | Workstream |
|---|---|---|
| `backend` | `services/**`, `packages/common-dtos`, Prisma schemas + `docker/postgres-init` SQL | Services, shared contracts, database work |
| `frontend` | `apps/**` | student-app, admin-portal |
| `infrastructure` | Dockerfiles, `docker-compose.yml`, `gateway/`, `.env.example`, `.github/` | Containers, gateway, CI, startup/proxy debugging |
| `reviewer` | `scripts/**` and test files only | Tests, acceptance evidence, drift, code review, AI-policy check |

**When to delegate — default is don't.** Use 0 agents for most prompts. Number of agents = number of *independent* pieces of work in this task, not number of folders it touches.

- Do it yourself when the task is small, sequential, or tightly coupled — e.g. an access-token change that touches User Service, Supplier Service verification, and nginx together is **one** piece of work: do it in the main session (or give the whole thing to one agent), never split it across agents editing both sides independently.
- Delegate when a piece can genuinely proceed in parallel (a `backend` endpoint and the `frontend` screen against an already-agreed contract), when it needs heavy reading or noisy logs you do not want in context (`frontend` for the big `App.tsx` files, `infrastructure` for container logs), or when you want independent eyes (`reviewer` after you or another agent wrote the code).
- Never run two agents whose file sets overlap, and never two instances of the same agent on the same service.
- Do not explore the same code yourself that you just sent an agent to explore.

**Rules of use**
- Every agent stops and returns a question when it needs a design decision the author has not stated. Relay it to the author verbatim; do not answer it yourself and re-launch.
- Put the author's decided design **in the task text** — agents do not see this conversation.
- Agents report files changed; the main session writes **one** `ai/usage-log.md` entry per prompt.
- Service facts have one home: `docs/services/<name>.md`. When a change makes a page wrong (e.g. a mock becomes real), update the page in the same change, and the one-line summaries in section 4 and `.claude/agents/backend.md` only if they became false.
