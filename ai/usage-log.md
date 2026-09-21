# AI Usage Log

## 2026-09-19 16:35 SGT — Supplier service scaffold (frontend / backend / database)

**Tool:** Claude Code (model: Claude Opus 5)
**Author:** jagdeepsh
**Branch:** supplier_service

**Prompt (summarised):**
Only work in `services/supplier-service/src`. Using `data/csv/supplier-seed-data.csv` as reference: remove `src/index.ts`; create `frontend`, `backend`, `database` folders with boilerplate only. Frontend: React + TypeScript landing page titled "Supplier Service" (no features/styling). Backend: simple Express routing file with skeleton CRUD functions (create / update / delete / get supplier(s)) taking only a supplier name string. Database: use Prisma to connect to PostgreSQL; one standalone dev script that reads the seed CSV and writes it to Postgres, and one application-facing script that the backend CRUD calls. Set up local PostgreSQL if possible. Give a breakdown of files edited.

**Usage scenario:** Boilerplate generation / scaffolding (allowed use). No architecture or schema decisions beyond mirroring the CSV columns 1:1; author to finalise.

**Files created / removed (all under `services/supplier-service/src/`):**
- removed `index.ts`
- `frontend/index.html`, `frontend/main.tsx`, `frontend/App.tsx`
- `backend/server.ts`, `backend/supplierRoutes.ts`
- `database/prisma/schema.prisma`, `database/client.ts`, `database/supplierRepository.ts`, `database/seed.ts`

**Other actions:** created local PostgreSQL database `supplier_db` in Postgres.app (no repo files changed). Appended this log entry.

## 2026-09-19 17:05 SGT — Supplier service frontend: dashboard skeleton

**Tool:** Claude Code (model: Claude Sonnet 5)
**Author:** jagdeepsh
**Branch:** supplier_service

**Prompt (summarised):**
Only edit `services/supplier-service/src/frontend`. Replace the placeholder landing page with a static dashboard skeleton matching a supplied mockup screenshot (minus the sidebar): title "Campus Suppliers & Facility Directory" + "+ Add New Supplier" button, a 3-stat row (Total Active Suppliers / Campus Zones Covered / Total Completed Pickups), and a search row (search bar with icon, field-filter dropdown, Search button) that filters a hardcoded dummy supplier list (mirroring the Prisma schema) client-side on Enter/click. Keep the file count to the minimum Vite needs (index.html, main.tsx, App.tsx, vite.config.ts) — no backend calls, no new dependencies.

**Usage scenario:** Boilerplate/UI generation (allowed use) — static skeleton only, no architecture/schema decisions; styling implemented as inline `style` objects to avoid adding new dependencies.

**Files changed (all under `services/supplier-service/src/frontend/`):**
- `App.tsx` — rewritten: dashboard layout, dummy `Supplier[]` data, search/filter state and filtering logic, results table.
- `index.html` — updated `<title>`.
- `main.tsx` — disclosure comment updated to reflect new scope (no functional change).
- `vite.config.ts` — unchanged.

No files removed (frontend folder already held only the 4 minimum files). No dependencies added; no other folders touched.

## 2026-09-20 18:35 SGT — Milestone D2 Implementation: User Service, Supplier Service RBAC, Admin Portal & Student App

**Tool:** Google Antigravity Agent
**Author:** yanhwee
**Branch:** milestone-d2

**Prompt (summarised):**
Implement CS3219 Milestone D2 requirements across the monorepo:
1. User Service (M2): Production backend with PostgreSQL Prisma schema, client isolation (`output = "../generated/client"`), bcrypt password hashing, JWT authentication, user profile management with immutable field protection (`nusEmail`, `matricNumber`, `role`), role administration with last-admin demotion safeguard, and seed script for admin and student accounts.
2. Supplier Service (M3): Cross-service RBAC middleware verifying User Service JWTs, restricting mutation routes (`POST`, `PUT`, `PATCH /toggle`, `DELETE`) to ADMIN role while keeping read routes public, adding server-side sorting and pagination.
3. Common DTOs (`packages/common-dtos`): Added shared types `JWTPayload`, `UpdateUserProfileRequest`, `PromoteUserRequest`, `SupplierQueryOptions`, and `PaginatedResponse<T>`.
4. Admin Portal (`apps/admin-portal`): Added Edit Modal, Delete Confirmation Modal (soft & hard delete), Supplier Details Inspection Modal, interactive column sorting, pagination controls, responsive mobile card view matching Screen 6 wireframe, and a demo RBAC session switcher allowing live toggling between Admin, Student, and Guest to demonstrate RBAC enforcement.
5. Student App (`apps/student-app`): Replaced hardcoded pickup options with live fetching from Supplier Service (`/api/suppliers?isActive=true`), dynamic dropdown selection, and added a Campus Spots Directory browsing tab.
6. Automated Integration Testing: Created `scripts/test-d2-e2e.ts` running 30 automated integration tests covering authentication, registration validation, profile protection, role safeguards, supplier pagination, and cross-service RBAC enforcement (all 30 passing).

**Usage scenario:** Microservice implementation, cross-service authentication/authorization integration, and full-stack frontend integration for Milestone D2.

**Files changed / created:**
- `packages/common-dtos/src/index.ts` — Added shared DTO types.
- `services/user-service/package.json` — Added bcryptjs, jsonwebtoken, prisma dependencies.
- `services/user-service/src/database/prisma/schema.prisma` [NEW] — User schema mapping to `user_db`.
- `services/user-service/src/database/client.ts` [NEW] — Isolated Prisma client singleton.
- `services/user-service/src/database/userRepository.ts` [NEW] — User CRUD, profile protection, last-admin demotion prevention.
- `services/user-service/src/database/seed.ts` [NEW] — Seed script for Admin and Student accounts.
- `services/user-service/src/middleware/authMiddleware.ts` [NEW] — JWT auth and role check middleware.
- `services/user-service/src/index.ts` — Complete Express app with auth, profile, and role routes.
- `services/user-service/Dockerfile` — Added Prisma generate step.
- `services/supplier-service/package.json` — Added jsonwebtoken.
- `services/supplier-service/src/database/prisma/schema.prisma` — Isolated Prisma client output.
- `services/supplier-service/src/database/client.ts` — Updated import path.
- `services/supplier-service/src/backend/authMiddleware.ts` [NEW] — Cross-service JWT auth and requireAdmin.
- `services/supplier-service/src/database/supplierRepository.ts` — Added sorting, pagination, and total counts.
- `services/supplier-service/src/backend/supplierRoutes.ts` — Attached RBAC middleware and query params.
- `apps/admin-portal/src/App.tsx` — Full D2 implementation (modals, sorting, pagination, mobile layout, demo RBAC switcher).
- `apps/admin-portal/package.json` — Added typecheck script.
- `apps/student-app/src/App.tsx` — Live supplier integration, dynamic errand picker, spots directory tab.
- `apps/student-app/package.json` — Added typecheck script.
- `scripts/test-d2-e2e.ts` [NEW] — Automated end-to-end integration test runner (30/30 tests pass).
- `package.json` — Added `test:d2` command.

## 2026-09-20 18:45 SGT — Automated Browser UI Inspection & End-to-End Verification

**Tool:** Google Antigravity Agent (Browser Subagent)
**Author:** yanhwee
**Branch:** milestone-d2

**Prompt (summarised):**
Use browser subagent to inspect and visually verify the user interfaces for both frontends:
1. Admin Portal (`http://localhost:5174`): verified table loading 21 campus locations, KPI cards, real-time column sorting, category filtering, search, Add/Edit/View Details/Delete modals, RBAC demo switcher triggering 403 Forbidden for non-admin, and responsive Screen 6 mobile card view with drawer.
2. Student App (`http://localhost:5173`): verified feed and wallet balance header, live Spots tab integration consuming Supplier Service API, direct "Pick for Errand" workflow pre-selecting spot into Post Errand form with auto zone resolution, dynamic combobox, and Wallet ledger view.
Captured 14 screenshot artifacts and video session recording.

**Usage scenario:** Automated visual and functional frontend inspection and UI verification for Milestone D2.

**Files changed / created:**
- `apps/admin-portal/vite.config.ts` — Enhanced local proxy mappings for User Service (8001) and Supplier Service (8002).
- `apps/student-app/vite.config.ts` — Enhanced local proxy mappings for Supplier Service (8002) and User Service (8001).
- Visual gallery added to `walkthrough.md`.

## 2026-09-20 18:50 SGT — Milestone D2 Documentation & System Architecture Writeup

**Tool:** Google Antigravity Agent
**Author:** yanhwee
**Branch:** milestone-d2

**Prompt (summarised):**
Compile comprehensive Milestone D2 System Architecture and Progress Check Report (`CS3219_ Project Milestone 2 (D2).md`) addressing all grading criteria from `CS3219-Instructions-MilestoneD2.pdf`:
- Part 1: User Service (role design & capability matrix, PostgreSQL schema & salted bcrypt hashing, stateless JWT authentication & RBAC middleware, cross-service claim verification, profile update immutability protection, and administrative lifecycle with sole-admin demotion prevention).
- Part 2: Supplier Service (PostgreSQL schema & 21 seeded NUS locations, REST API query patterns & sorting/pagination, decoupled backend testability, end-to-end integration, responsive Admin Portal with modals & mobile Screen 6 layout, and Student App live catalog consumption).
- Part 3 & 4: Preparation for Milestone D3 (Order & Credit workflows), 30/30 passing automated test results, step-by-step mentor demo guide, and visual verification gallery with 8 embedded UI screenshots.

**Usage scenario:** Comprehensive system architecture documentation and milestone submission writeup.

**Files changed / created:**
- `CS3219 Student Project (Notes)/09-20 deliverable-2/CS3219_ Project Milestone 2 (D2).md` [NEW] — Complete D2 report in notes workspace.
- `docs/CS3219_Project_Milestone_2_D2.md` [NEW] — Repository copy in `docs/`.

## 2026-09-20 18:55 SGT — Visual Artifact Export & Relative Link Harmonization

**Tool:** Google Antigravity Agent
**Author:** yanhwee
**Branch:** milestone-d2

**Prompt (summarised):**
Export captured screenshots and browser verification video recording into `09-20 deliverable-2/images` and `docs/images/`, and update Section 8 of `CS3219_ Project Milestone 2 (D2).md` with portable relative image paths (`./images/*.png`).

**Usage scenario:** Asset packaging and portable documentation formatting for Milestone D2.

**Files changed / created:**
- `CS3219 Student Project (Notes)/09-20 deliverable-2/images/` [NEW DIRECTORY] — 14 PNG screenshots + `recording.webm`.
- `docs/images/` [NEW DIRECTORY] — 14 PNG screenshots + `recording.webm`.
- `CS3219 Student Project (Notes)/09-20 deliverable-2/CS3219_ Project Milestone 2 (D2).md` — Updated Section 8 image markdown references to `./images/...`.
- `docs/CS3219_Project_Milestone_2_D2.md` — Synchronized repository copy.

## 2026-09-20 19:17 SGT — Git Hygiene & Prisma Client Ignore Configuration

**Tool:** Google Antigravity Agent
**Author:** yanhwee
**Branch:** milestone-d2

**Prompt (summarised):**
Check if `.gitignore` requires additions for any files:
- Added `**/generated/` and `**/src/database/generated/` to `.gitignore` to prevent tracking of architecture-specific Prisma client binaries (`libquery_engine-darwin-arm64.dylib.node`, `.wasm`, and compiled JS).
- Added `.turbo/`, `coverage/`, and environment configuration variants (`.env.test`, `.env.development`, `.env.production`) to `.gitignore`.
- Added `"db:generate"` and `"postinstall": "npm run db:generate --workspaces --if-present"` to root `package.json` to ensure automated code generation on clean checkouts.

**Usage scenario:** Repository hygiene and cross-platform build safety.

**Files changed / created:**
- `.gitignore` — Added Prisma generated directory ignore rules and build artifact exclusions.
- `package.json` — Added root `db:generate` and `postinstall` hook.

## 2026-09-20 19:20 SGT — README Documentation Overhaul for Milestone D2

**Tool:** Google Antigravity Agent
**Author:** yanhwee
**Branch:** milestone-d2

**Prompt (summarised):**
Update root `README.md` to reflect current system state and Milestone D2 deliverables:
- Updated system architecture diagram with accurate service assignments (`User Service (M2)`, `Supplier Service (M3)`, `Order Service (M1)`, `Credit Service (M4)`, `Notification Service (M5)`).
- Added multi-service Prisma client isolation architectural note.
- Added Milestone D2 completion summary and milestone roadmap.
- Documented local development commands (`npm install`, `npm run db:seed`, `npm run dev:*`).
- Added automated verification section documenting `npm run test:d2` (30 integration tests) and `npm run typecheck`.
- Added seed accounts table (`admin@nus.edu.sg`, `alice@u.nus.edu`, `bob@u.nus.edu`).
- Updated monorepo directory layout and added milestone writeup references.

**Usage scenario:** Developer onboarding, system documentation, and repository orientation.

**Files changed / created:**
- `README.md` — Comprehensive documentation overhaul.
## 2026-09-20 — dotenv.config() fix for standalone seed scripts

**Tool:** Claude Code (model: Claude Sonnet 5)
**Author:** jagdeepsh

**Prompt (summarised):** Local `npm run db:seed` failed with `DATABASE_URL` not found for user-service (after an earlier stale-node_modules `bcryptjs` error was fixed by `npm install`). Root cause: `client.ts` in both services never called `dotenv.config()` — only the app entrypoints did — so standalone scripts like `seed.ts` never saw `.env`. Fix both services.

**Usage scenario:** Debugging assistance (allowed use).

**Files changed:**
- `services/user-service/src/database/client.ts` — added `dotenv.config({ path: path.resolve(__dirname, '../.env') })`.
- `services/supplier-service/src/database/client.ts` — same fix.
- `services/user-service/src/.env` (new) — `DATABASE_URL=postgresql://postgres:postgres@localhost:5432/user_db`.

Verified: `npm run db:seed --workspace=@campus-errand/user-service` and `--workspace=@campus-errand/supplier-service` both now run cleanly with no inline env var needed.

## 2026-09-20 (later) — Fix admin-portal "Showing 1 to 4 of 4 campus locations" bug

**Tool:** Claude Code (model: Claude Sonnet 5)
**Author:** jagdeepsh

**Prompt (summarised):** After seeding 21 real suppliers and rebuilding the full docker-compose stack, admin-portal (accessed directly at http://localhost:5174) showed only 4 mock campus locations instead of the real 21. Investigated (read-only) and found: admin-portal's Vite dev-server proxy hardcodes `target: 'http://localhost:8002'`/`:8001`; inside its own Docker container `localhost` refers to itself, not supplier-service/user-service, so the proxied `/api/suppliers` call gets ECONNREFUSED, and the frontend's `fetchSuppliers()` silently falls back to a hardcoded 4-item mock array. (Accessing via the gateway at http://localhost/admin/ already worked, since nginx proxies `/api/suppliers` directly to the real service, bypassing this Vite proxy.) User chose to fix the vite config (not just the gateway workaround).

**Usage scenario:** Debugging assistance / config fix (allowed use) — no schema/architecture decisions, just making an existing proxy target environment-aware, mirroring the env-var-driven pattern already used elsewhere in docker-compose.yml.

**Files changed:**
- `apps/admin-portal/vite.config.ts` — proxy targets now read from `SUPPLIER_SERVICE_URL`/`USER_SERVICE_URL` env vars, falling back to `http://localhost:8002`/`:8001` for normal host-based dev.
- `docker-compose.yml` — added `SUPPLIER_SERVICE_URL=http://supplier-service:8002` and `USER_SERVICE_URL=http://user-service:8001` to admin-portal's `environment:` block (Docker's internal service DNS names).

Verified: rebuilt/restarted the admin-portal container; `curl http://localhost:5174/api/suppliers` now returns all 21 real seeded suppliers (previously would have hit the broken proxy). `apps/student-app/vite.config.ts` has the identical latent bug but was explicitly left unfixed per user's choice (Option B was admin-portal only).

## 2026-09-21 — Fix admin-portal filter UI: remove redundant chips, gate filtering behind "Apply Filters"

**Tool:** Claude Code (model: Claude Sonnet 5)
**Author:** jagdeepsh

**Prompt (summarised):** User noticed two issues in the admin portal's supplier list toolbar: (1) a redundant row of quick category chip buttons sat next to the "Filter" button, duplicating the category filter already inside the Filter modal; (2) inside the Filter modal, clicking category/zone chips filtered the supplier list immediately, making the "Apply Filters" button a no-op. User wanted the chip row removed and filtering to only take effect once "Apply Filters" is clicked. Planned in plan mode (Explore agent to locate the code, Plan agent to design the draft/applied state split), then clarified two open UX decisions with the user via AskUserQuestion (discard draft on modal close via X — confirmed yes; also reset pagination on "Reset All Filters" — confirmed yes) before implementing.

**Usage scenario:** Requirements interpretation (bug report → concrete UI/state changes) and implementation code (allowed use) — no new architecture, component boundaries, or data schema; purely local React state/UI wiring in an existing component.

**Files changed:**
- `apps/admin-portal/src/App.tsx` — removed the `selectedCategory` quick-filter state and its chip row (toolbar now shows only the "Filter" button); added `draftSelectedCategories`/`draftSelectedZones` state so modal chip clicks no longer mutate the state `filteredAndSorted` depends on; "Apply Filters" now copies draft → applied state (previously only closed the modal); modal's X (close) button now discards draft changes back to applied state; `resetAdvancedFilters` now also resets `draftSelected*` state and `currentPage`.

Verified: `npx tsc --noEmit` passes with no errors in `apps/admin-portal`.

## 2026-09-21 (later) — Fix stale "permanent delete" checkbox and add client-side RBAC gating to admin-portal action buttons


**Tool:** Claude Code (model: Claude Sonnet 5)
**Author:** jagdeepsh

**Prompt (summarised):** User found two more bugs while manually testing role switching in the admin portal: (1) the "Permanent Hard Delete" checkbox in the Delete Supplier confirmation modal stayed checked across separate delete attempts (e.g. checked while testing as Student, still checked after switching to Guest), risking an accidental hard delete instead of the intended soft-delete safeguard; (2) although the backend already rejects CUD API calls from non-ADMIN roles, the Student/Guest UI still rendered the "Add Location" button and the per-row Deactivate/Edit/Delete controls — user wants these hidden entirely for non-admin roles so only the "view details" (Eye icon) is visible, as defense in depth on top of the existing server-side enforcement.

**Usage scenario:** Debugging assistance and implementation code (allowed use) — no new architecture or API surface; purely local component state/UI gating using the existing `currentRole` demo-auth state already in the file.

**Files changed:**
- `apps/admin-portal/src/App.tsx` — `setIsPermanentDelete(false)` now runs wherever the Delete Supplier modal is opened (mobile card view, desktop table view) or dismissed via Cancel, so the checkbox no longer carries a stale checked state into the next delete attempt. Added a derived `isAdmin = currentRole === 'ADMIN'` and used it to conditionally render the "Add Location" button and the Deactivate/Activate, Edit, and Delete controls in both the mobile card list and the desktop table; the Eye (view details) button remains visible for all roles.

Verified: `npx tsc --noEmit` passes with no errors in `apps/admin-portal`.

## 2026-09-21 (later still) — Add admin-only "Users" directory page to admin-portal

**Tool:** Claude Code (model: Claude Sonnet 5)
**Author:** jagdeepsh

**Prompt (summarised):** User wanted a new admin-only "Users" page in the admin portal, alongside the existing Campus Suppliers page, listing all registered users pulled from the User Service's `GET /api/users` endpoint via the standard API Gateway path (not called directly), with the same layout/search/filter UX as the Suppliers page but strictly read-only — no add/edit/delete. Search across nusEmail, fullName, matricNumber, phoneNumber, telegramHandle (case-insensitive); filter by role, min rating, min completed orders. User explicitly restricted scope to `apps/admin-portal/src` only — no backend, gateway, or config changes. Planned in plan mode: confirmed via investigation that `/api/users` is already proxied by both `vite.config.ts` (dev) and `gateway/nginx.conf` (prod) with zero changes needed, and that the existing demo-admin JWT (`authToken`/`getAuthHeaders()`) already satisfies the endpoint's auth requirement. Clarified two open design choices with the user via AskUserQuestion (numeric min-value filter inputs for rating/completed-orders vs. preset chips; whether to include a KPI stat-card row) before implementing.

**Usage scenario:** Requirements interpretation and implementation code (allowed use) — followed the existing single-file component's established patterns (duplicated the suppliers page's search/filter/sort/pagination/draft-vs-applied-filter logic for users rather than introducing a new shared abstraction, consistent with the file's existing convention and to avoid unilaterally making component-boundary/architecture decisions).

**Files changed:**
- `apps/admin-portal/src/App.tsx` — added `fetchUsers()` (GET `/api/users?limit=100` with existing `getAuthHeaders()`), an admin-gated "Users" nav entry (desktop sidebar + mobile drawer) that lazily fetches on click, a new `activeNav === 'users'` content section (KPI cards, search+filter toolbar, mobile card list, desktop table, pagination — no action buttons), and a "Filter Users" modal (role chips + min-rating/min-completed-orders number inputs) following the same draft-until-"Apply Filters" pattern used by the Suppliers filter modal. Header refresh button and error banner are now tab-aware (target users vs. suppliers depending on the active nav). No other files touched.

Verified: `npx tsc --noEmit` passes with no errors in `apps/admin-portal`.
## 2026-09-21 12:57 SGT — Issue/milestone review and Claude Code tooling plan

**Tool:** Claude Code (model: Claude Fable 5.1)
**Author:** Reallyeasy1
**Branch:** milestone-d2

**Prompt (summarised):** Clone the repo, switch to `dev` then `milestone-d2` and pull. Read the GitHub issues/milestones and summarise what is assigned to me. Then plan the Claude Code setup for this project (configs, hooks, MCP, plugins, skills, agents) and a docs / design-decisions folder, using the D1 document, the D2 / Sprint 2 plan and the `friend-on-campus` repo as reference.

**Usage scenario:** Learning support / developer-tooling planning (allowed use). Read-only review of issues and docs; the plan covers AI tooling only. No product architecture, schema, interface or requirement-prioritisation decisions were made by the AI; design-decision records are to be authored by the team (AI supplies an empty template only).

**Files changed:**
- `ai/usage-log.md` — appended this entry. No other repo files changed; nothing committed.

## 2026-09-21 13:10 SGT — Restructure and extend CLAUDE.md

**Tool:** Claude Code (model: Claude Fable 5.1)
**Author:** Reallyeasy1
**Branch:** milestone-d2 (uncommitted; `CLAUDE.md` is identical on `dev`, so the change can be committed on either)

**Prompt (summarised):** Enhance `CLAUDE.md` as part of the Claude Code tooling plan.

**Usage scenario:** Documentation improvement / config boilerplate (allowed use). The course AI-usage policy wording was kept unchanged; added content is factual only (repo map, ports, npm scripts, usage-log format, `gh -R` note, links to D1/D2 docs). No architecture, schema or interface decisions. The "When a request crosses the line" paragraph is a default left for the team to edit; the disclosure header's "Author review" line is left for the author.

**Files changed:**
- `CLAUDE.md` — rewritten into 7 sections (policy, bookkeeping, stack, repo map, commands, git/GitHub, source documents).
- `ai/usage-log.md` — appended this entry.

## 2026-09-21 13:45 SGT — Repo walkthrough, CLAUDE.md repo map, Claude Code tooling and docs skeleton

**Tool:** Claude Code (model: Claude Fable 5.1)
**Author:** Reallyeasy1
**Branch:** chore/claude-tooling (created from `milestone-d2`; nothing committed)

**Prompt (summarised):** Make the usage-log hook warn instead of block. Read through the whole project before updating the repo map in `CLAUDE.md`. Then build the agreed Claude Code setup (settings, hooks, skills, agents) and a docs / design-decisions folder.

**Usage scenario:** Documentation improvement, boilerplate/config generation and requirements *discovery/formatting* (allowed uses). The repo map and `docs/requirements/conflicts.md` record observed facts only; the conflicts table's "Resolution" column and every ADR section (context, options, decision, rationale, consequences) are left empty for the team. No product architecture, schema or interface was proposed or changed. Two "TEAM:" markers flag policy wording the team should set themselves (`CLAUDE.md` "When a request crosses the line"; the exempt-file list in `check-disclosure.js`).

**Files changed:**
- `CLAUDE.md` — section 4 rewritten as a per-path table + "easy to get wrong" list from reading the code; corrected the `npm run test:d2` note (it spawns user/supplier services itself and needs ports 8001/8002 free).
- `AGENTS.md` — was empty; now a one-line pointer to `CLAUDE.md`.
- `.gitignore` — ignore `.claude/settings.local.json`.
- `.claude/settings.json` (JSON, no header possible) — deny commit/push/merge/PR and `.env` reads; allow typecheck/test/read-only git+gh; wire the two hooks.
- `.claude/settings.local.json` (JSON, git-ignored, personal) — disables unrelated global plugins for this project.
- `.claude/hooks/check-usage-log.js` — Stop hook, warn-only.
- `.claude/hooks/check-disclosure.js` — PostToolUse hook on Edit/Write, reminder-only.
- `.claude/hooks/hooks.test.js` — self-check for both hooks (`node .claude/hooks/hooks.test.js` → "hooks ok").
- `.claude/skills/{usage-log,new-adr,issue-start}/SKILL.md` — three project skills.
- `.claude/agents/{ai-policy-reviewer,acceptance-checker}.md` — two read-only agents.
- `docs/README.md`, `docs/decisions/{README,0000-template}.md`, `docs/requirements/{README,conflicts}.md`, `docs/api/README.md`, `docs/diagrams/README.md`, `docs/evidence/d2/README.md`, `docs/mentor-feedback/README.md` — skeleton.
- `ai/usage-log.md` — appended this entry.

## 2026-09-21 14:00 SGT — Suggested Claude Code subagent roster

**Tool:** Claude Code (model: Claude Fable 5.1)
**Author:** Reallyeasy1
**Branch:** chore/claude-tooling

**Prompt (summarised):** Suggest an agent team (Claude Code subagents) for this project.

**Usage scenario:** Learning support / developer-tooling advice (allowed use). Suggestion given in chat only; concerns AI tooling, not product architecture. Roster deliberately excludes architecture, requirements-prioritisation, sprint-planning, rationale-writing and committing agents, per the course AI policy.

**Files changed:**
- `ai/usage-log.md` — appended this entry. No other files changed.

## 2026-09-21 14:30 SGT — Role-based Claude Code agent team

**Tool:** Claude Code (model: Claude Fable 5.1)
**Author:** Reallyeasy1
**Branch:** chore/claude-tooling (nothing committed)

**Prompt (summarised):** Make the agent team role-based: backend engineer, frontend engineer, QA agent, router agent; then also one agent per service and an infrastructure agent.

**Usage scenario:** Boilerplate / developer-tooling config (allowed use). The team composition was chosen by the author. Every agent prompt carries a stop rule (return the question instead of making a schema/interface/pattern/trade-off decision), the router is dispatch-only (does not rank or plan the backlog), and the tech-writer is barred from rationale. "Facts about this service" blocks describe the code as it is; they contain no proposals.

**Files changed:**
- `.claude/agents/router.md` — new, read-only dispatcher (returns a plan; the main session launches agents).
- `.claude/agents/backend-engineer.md` — new; cross-service work + shared backend rulebook.
- `.claude/agents/{user,supplier,order,credit,notification}-service-engineer.md` — new; one per service, each scoped to its own folder.
- `.claude/agents/frontend-engineer.md`, `qa-engineer.md`, `tech-writer.md` — new.
- `.claude/agents/infrastructure-engineer.md` — new (first drafted as `devops-engineer.md`, renamed).
- `CLAUDE.md` — added section 8 "Agent team".
- `ai/usage-log.md` — appended this entry.

## 2026-09-21 15:00 SGT — Consolidate agent team from 13 to 4

**Tool:** Claude Code (model: Claude Fable 5.1)
**Author:** Reallyeasy1
**Branch:** chore/claude-tooling (nothing committed)

**Prompt (summarised):** Author supplied guidance (3–5 specialised subagents; main session orchestrates; agent count = independent workstreams, not repo components; avoid over-delegation) and asked for the agent setup to be optimised accordingly.

**Usage scenario:** Boilerplate / developer-tooling config (allowed use). One departure from the supplied layout, flagged to the author: `database` was folded into `backend` and the fourth slot given to `infrastructure`, because in this repo table definitions are edited together with the service's repository code (overlapping files), while container/gateway work is independent. The supplied guidance's "main agent owns architecture decisions" was not adopted: per the course policy those stay with the human author, and every agent keeps its stop rule.

**Files changed:**
- `.claude/agents/` — removed the 13 earlier agent files (kept outside the repo as a backup) and added `backend.md`, `frontend.md`, `infrastructure.md`, `reviewer.md`.
- `CLAUDE.md` — section 8 rewritten: four agents, main session as orchestrator, "when to delegate — default is don't" rules.
- `ai/usage-log.md` — appended this entry.

## 2026-09-21 15:30 SGT — Architecture overview doc and agent orientation

**Tool:** Claude Code (model: Claude Fable 5.1)
**Author:** Reallyeasy1
**Branch:** chore/claude-tooling (nothing committed)

**Prompt (summarised):** Give the agents information about the directory, let them read `docs/`, and include the different services and the intended architecture.

**Usage scenario:** Documentation of existing material (allowed use). `docs/architecture/overview.md` restates what the team's own sources already say (README, D1, D2 / Sprint 2 plan, compose, nginx, common-dtos), each statement tagged with its source, beside what the code currently does. It proposes no architecture and contains no rationale; differences are pointed to `docs/requirements/conflicts.md` for the team to resolve.

**Files changed:**
- `docs/architecture/overview.md` — new: system summary, intended shape, per-service intended-vs-built table, directory layout, pointer to open conflicts.
- `.claude/agents/{backend,frontend,infrastructure,reviewer}.md` — added an "Orientation" section (reading list incl. `docs/`, and a directory view per role); `infrastructure.md` stop rule now reflects that D1 §3.6 already names GitHub Actions. Author-review lines left as the author wrote them; the author should re-review since content was added after approval.
- `docs/README.md` — index row for `architecture/`.
- `CLAUDE.md` — section 7 links to the overview, conflicts, decisions and API folders.
- `ai/usage-log.md` — appended this entry.

## 2026-09-21 16:00 SGT — Per-service documentation

**Tool:** Claude Code (model: Claude Fable 5.1)
**Author:** Reallyeasy1
**Branch:** chore/claude-tooling (nothing committed)

**Prompt (summarised):** Add documentation for each of the services.

**Usage scenario:** Documentation of existing code (allowed use). Each page was written after reading that service's source in full and describes what the code does today (run, configuration, files, API table, data, behaviour as built), separately from what D1 / the D2 plan say it should do. "Differences from the documents" sections list observations only — no fixes, designs or priorities are proposed.

**Files changed:**
- `docs/services/README.md` — index, shared conventions, page template.
- `docs/services/{user,supplier,order,credit,notification}-service.md` — one page each.
- `.claude/agents/{backend,frontend,infrastructure,reviewer}.md` — reading list now includes `docs/services/<name>.md`.
- `docs/README.md`, `docs/architecture/overview.md`, `CLAUDE.md` (section 7) — links to the service pages.
- `ai/usage-log.md` — appended this entry.

## 2026-09-21 16:20 SGT — Commit Claude Code config and docs to `claude-config` (part 1 of 2)

**Tool:** Claude Code (model: Claude Fable 5.1)
**Author:** Reallyeasy1
**Branch:** claude-config (renamed from the local, never-pushed `chore/claude-tooling`)

**Prompt (summarised):** Branch out to `claude-config`, commit the work, then clean up the docs.

**Usage scenario:** Version-control housekeeping on the author's explicit instruction (the "no commits on your own" rule is about unprompted commits). One local commit containing the tooling and docs listed in the entries above; not pushed. Docs clean-up is logged separately as part 2.

**Files changed:**
- `ai/usage-log.md` — appended this entry. Everything else in the commit is described in the 2026-09-21 entries above.

## 2026-09-21 16:45 SGT — Docs clean-up (part 2 of 2)

**Tool:** Claude Code (model: Claude Fable 5.1)
**Author:** Reallyeasy1
**Branch:** claude-config (these changes are uncommitted, on top of commit 8a897ce)

**Prompt (summarised):** After committing, clean up the docs.

**Usage scenario:** Documentation refactoring (allowed use): removing duplication and placeholder files; no content about design, requirements or priorities was added or changed.

**Files changed:**
- `CLAUDE.md` — section 4's long per-path table replaced by a compact map that points to `docs/services/` and `docs/architecture/overview.md` (pitfalls list kept); section 8 now names `docs/services/` as the single home for service facts.
- `.claude/agents/backend.md` — "Service facts" reduced to one line per service plus a pointer to the service pages.
- `docs/README.md` — rewritten in reading order, with a "who may write what" table and an "add when first needed" table.
- `docs/api/README.md`, `docs/diagrams/README.md`, `docs/mentor-feedback/README.md` — removed (placeholder-only; their guidance moved into `docs/README.md`).
- `README.md` — one added line linking to `docs/README.md`, plus a disclosure comment at the end of the file.
- `ai/usage-log.md` — appended this entry.

## 2026-09-21 17:00 SGT — Commit docs clean-up; list useful Claude Code plugins

**Tool:** Claude Code (model: Claude Fable 5.1)
**Author:** Reallyeasy1
**Branch:** claude-config

**Prompt (summarised):** Commit the docs clean-up, then list Claude Code plugins that would be useful for this project.

**Usage scenario:** Version-control housekeeping on the author's explicit instruction, and learning support / developer-tooling advice (allowed uses). The plugin list is given in chat only; plugins whose purpose is architecture design, requirements analysis or sprint planning are listed as "do not use here" because of the course AI policy.

**Files changed:**
- `ai/usage-log.md` — appended this entry. The commit itself contains the clean-up described in the previous entry.

## 2026-09-21 17:30 SGT — Set up the typescript-lsp plugin

**Tool:** Claude Code (model: Claude Fable 5.1)
**Author:** Reallyeasy1
**Branch:** claude-config (uncommitted)

**Prompt (summarised):** See whether the TypeScript LSP plugin (claude.com/plugins/typescript-lsp) can be added.

**Usage scenario:** Developer-tooling setup (allowed use: config/boilerplate). The plugin was already installed for the author but its prerequisite binary was missing. Machine-level actions, outside the repo: `npm install -g typescript-language-server typescript`; `npm install` in the repo (no lockfile change). No application code touched.

**Files changed:**
- `.claude/settings.json` (JSON, no header possible) — `enabledPlugins` now lists `typescript-lsp@claude-plugins-official` so teammates are offered it.
- `.claude/agents/{backend,frontend,reviewer}.md` — `LSP` added to `tools`.
- `CLAUDE.md` — section 5: prerequisite and when to use the `LSP` tool.
- `ai/usage-log.md` — appended this entry.

## 2026-09-21 17:50 SGT — Write down the project's Claude Code plugin list

**Tool:** Claude Code (model: Claude Fable 5.1)
**Author:** Reallyeasy1
**Branch:** claude-config (uncommitted)

**Prompt (summarised):** Write down the list of Claude Code plugins the team will use for this project.

**Usage scenario:** Developer-tooling documentation / config (allowed use). Concerns AI tooling only. Plugins whose purpose is architecture design, requirements prioritisation, sprint planning or autonomous loops are listed under "Not in this repo" because of the course AI policy. The final choice of list remains the team's.

**Files changed:**
- `.claude/PLUGINS.md` — new: core / recommended / situational / not-in-this-repo, with install commands and per-machine setup.
- `.claude/settings.json` (JSON, no header possible) — `enabledPlugins` now holds the five core plugins.
- `CLAUDE.md` — section 5 points to the list.
- `ai/usage-log.md` — appended this entry.

## 2026-09-21 18:10 SGT — Claude Code set-up guide

**Tool:** Claude Code (model: Claude Fable 5.1)
**Author:** Reallyeasy1
**Branch:** claude-config (uncommitted)

**Prompt (summarised):** Include a Claude Code set-up guide as well.

**Usage scenario:** Developer-tooling documentation (allowed use). Describes the existing configuration and the set-up problems actually encountered; no product design content.

**Files changed:**
- `.claude/README.md` — new: prerequisites, repo and `gh` set-up, language server, plugins, load checks, what each config file does, daily workflow, troubleshooting.
- `CLAUDE.md` (section 5), `docs/README.md`, `README.md` — one-line links to the guide.
- `ai/usage-log.md` — appended this entry.

## 2026-09-21 18:30 SGT — Commit, push `claude-config`, open PR into `dev`

**Tool:** Claude Code (model: Claude Fable 5.1)
**Author:** Reallyeasy1
**Branch:** claude-config

**Prompt (summarised):** Commit, push to the `claude-config` branch and create a pull request into `dev`.

**Usage scenario:** Version-control housekeeping on the author's explicit instruction. The commit contains the typescript-lsp set-up, plugin list and set-up guide described in the three entries above. The PR description states what is AI-generated and that the branch is stacked on `milestone-d2`.

**Files changed:**
- `ai/usage-log.md` — appended this entry.
