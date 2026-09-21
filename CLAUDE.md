<!--
AI Assistance Disclosure:
Tool: Claude Code (model: Claude Fable 5.1), date: 2026-09-21
Scope: Restructured this file into sections and added repo map, commands, gh/branch notes and
the usage-log format. The AI-usage policy wording in section 1 is the team's original text, unchanged.
Author review: <to be completed by Reallyeasy1>
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

2. **Disclosure header.** Every file you create or edit gets this at the top (as a comment in that file's syntax), or the existing header is updated with the new date/scope:

   ```
   AI Assistance Disclosure:
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
services/order-service         :8003  in-memory mock              single src/index.ts
services/credit-service        :8004  in-memory mock              single src/index.ts
services/notification-service  :8005  in-memory mock (ws)         single src/index.ts
apps/student-app               :5173  one src/App.tsx (~730 lines), no router
apps/admin-portal              :5174  one src/App.tsx (~1650 lines), no router
packages/common-dtos                  shared DTOs, JWTPayload, OrderStatus, events, ApiResponse<T>
gateway/nginx.conf             :80    /api/* -> services, /ws/ -> notifications, /admin/, /
docker/postgres-init/*.sql            creates the 4 databases AND their tables (first boot only)
docker-compose.yml                    everything above + postgres:16 (5432) + rabbitmq:3.13 (5672, 15672)
scripts/test-d2-e2e.ts                D2 end-to-end suite        data/  supplier seed CSV + images
docs/  ai/usage-log.md  .claude/      documentation, AI usage log, Claude Code config
```

Things that are easy to get wrong:

- **Table definitions live in two places.** Tables are created by `docker/postgres-init/*.sql`, which Postgres runs **only on first boot of an empty volume**; the Dockerfiles run `prisma generate` but never `prisma migrate`. So a column change means editing the init SQL *and* `schema.prisma` (and adding a migration where a `migrations/` folder exists), then `docker compose down -v` to re-run the init script (this wipes local data). Deciding the change is the author's job; keeping the copies in sync is yours.
- **Auth is a JWT in `Authorization: Bearer …`**, signed by user-service and verified locally by each service with `JWT_SECRET`. Each service has its own copy of `authMiddleware.ts`. Both copies fall back to a hardcoded dev secret when `JWT_SECRET` is unset, and `docker-compose.yml` sets `JWT_SECRET` only on user-service — do not "tidy" either without asking, the services stop trusting each other if they diverge.
- **Prisma clients are per service**, generated into `src/database/generated/` (git-ignored). Import from `../database/client`, never from a root `@prisma/client`. Every Prisma CLI call needs `--schema src/database/prisma/schema.prisma` (the npm scripts already pass it).
- `src/database/client.ts` calls `dotenv.config()` itself so standalone scripts (seed) see `.env`. `.env` files are git-ignored; never read, print or commit them. Root `.env.example` is the reference.
- A service that gains a database should reuse the user/supplier `src/database/` layout rather than a new one.
- `packages/common-dtos` is the contract between services and both apps. Changing it is an interface change — the author decides, you implement and run `npm run typecheck` across all workspaces.
- Vite dev proxies: admin-portal reads `SUPPLIER_SERVICE_URL` / `USER_SERVICE_URL`; student-app still hardcodes `localhost` targets, which does not work from inside its container (go through the gateway on :80 instead).
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
npm run test:d2                               # D2 end-to-end suite — see note below
docker exec -it campuserrand-postgres psql -U postgres
```

`npm run test:d2` **spawns user-service and supplier-service itself** on 8001/8002 against `localhost:5432`. It needs Postgres up and both databases seeded, and ports 8001/8002 **free** — stop `docker compose` app containers and any `npm run dev:user|dev:supplier` first, or it tests whatever is already listening.

There is no lint script and no unit-test runner yet (tracked in issue #68). Do not add one unprompted.

Before saying a change works: run `npm run typecheck`, and `npm run test:d2` if user-service, supplier-service or either app was touched. Report the real output, including failures.

## 6. Git and GitHub

- Team repo: `AY2627S1-CS3219-P25/nus-campus-errand`. Some clones also have an `upstream` remote (`CS3219-AY2627S1/FoC-Template`) and `gh` may default to it — **always pass `-R AY2627S1-CS3219-P25/nus-campus-errand`** to `gh issue` / `gh pr` commands.
- Branches: `main` (releases), `dev` (integration), `milestone-d2` (D2 demo baseline), feature branches off `dev`.
- Issues carry the acceptance criteria (`[F3.2]`, `[Order Service] [N3]`, …). Read the issue before implementing, and quote the criterion IDs you covered in your summary.
- Never commit, push, merge, force-push, or open/close issues and PRs yourself.

## 7. Source documents

- D1 (requirements F1–F9, NFRs, sprint plan, state diagram): https://docs.google.com/document/d/1pGy36fN4PxwMNIlgRTL3MW0ZTM3tERtG15KpUSY3c3M
- D2 / Sprint 2 plan (work packages, acceptance checks, API sketch): https://docs.google.com/document/d/1I8sma-xUGapxvc6mSDyOLj8kihsAhL5erxinlP82pv8
- Architecture overview (intended vs built, per service, with sources; directory layout): `docs/architecture/overview.md` — read it before any cross-service work
- Per-service documentation (run, config, API, data, behaviour as built): `docs/services/<name>.md` — update the page in the same change that alters a service's routes, env vars, data model or mock/real status
- Open conflicts: `docs/requirements/conflicts.md` · Recorded decisions: `docs/decisions/` · API contracts: `docs/api/` (created when the first contract is written)
- Onboarding: `docs/onboarding-guide-sep-3.md`

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

- Do it yourself when the task is small, sequential, or tightly coupled — e.g. a JWT change that touches user-service, supplier-service middleware and nginx together is **one** piece of work: do it in the main session (or give the whole thing to one agent), never split it across agents editing both sides independently.
- Delegate when a piece can genuinely proceed in parallel (a `backend` endpoint and the `frontend` screen against an already-agreed contract), when it needs heavy reading or noisy logs you do not want in context (`frontend` for the big `App.tsx` files, `infrastructure` for container logs), or when you want independent eyes (`reviewer` after you or another agent wrote the code).
- Never run two agents whose file sets overlap, and never two instances of the same agent on the same service.
- Do not explore the same code yourself that you just sent an agent to explore.

**Rules of use**
- Every agent stops and returns a question when it needs a design decision the author has not stated. Relay it to the author verbatim; do not answer it yourself and re-launch.
- Put the author's decided design **in the task text** — agents do not see this conversation.
- Agents report files changed; the main session writes **one** `ai/usage-log.md` entry per prompt.
- Service facts have one home: `docs/services/<name>.md`. When a change makes a page wrong (e.g. a mock becomes real), update the page in the same change, and the one-line summaries in section 4 and `.claude/agents/backend.md` only if they became false.
