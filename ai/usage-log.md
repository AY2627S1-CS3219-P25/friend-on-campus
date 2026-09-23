<!--
AI Assistance Disclosure:
Tool: Codex (model: GPT-5.6 Terra), date: 2026-09-22
Scope: Appended the Iteration 1 through Iteration 3, Iteration 5, and Iteration 6 implementation records below.
Author review: <to be completed by ngkhengyang>
-->
<!--
AI Assistance Disclosure:
Tool: Codex (model: GPT-5.6 Terra), date: 2026-09-22
Scope: Appended the Iteration 11 documentation-compliance record below.
Author review: <to be completed by ngkhengyang>
-->
<!--
AI Assistance Disclosure:
Tool: Codex (model: GPT-5.6 Terra), date: 2026-09-22
Scope: Appended the Iteration 10 D2 contract-alignment record below.
Author review: <to be completed by ngkhengyang>
-->
<!--
AI Assistance Disclosure:
Tool: Codex (model: GPT-5.6 Terra), date: 2026-09-22
Scope: Appended the Iteration 8 Supplier Service Ed25519 migration record below.
Author review: <to be completed by ngkhengyang>
-->

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

## 2026-09-22 14:53 SGT — Inventory merged teammate work

**Tool:** Codex (model: GPT-5)
**Author:** ngkhengyang
**Branch:** user-service-base

**Prompt (summarised):** Summarise teammates' merged pull-request work and identify remaining requirements to implement.

**Usage scenario:** Codebase fact-finding (allowed use). Inspected local Git history, branches, and existing documentation to report what is present. The course policy prohibits AI consolidation or prioritisation of remaining requirements, so that part was left to the author.

**Files changed:**
- `ai/usage-log.md` — appended this entry.

## 2026-09-22 16:50 SGT — Iteration 1 shared DTO contract

**Tool:** Codex (model: GPT-5.6 Terra)
**Author:** ngkhengyang
**Branch:** user-service-base

**Prompt (summarised):** Implement the first approved iteration only: replace the shared user and authentication DTO contract with the agreed PR-shaped fields and names.

**Usage scenario:** Implementation code (allowed use). The author had already finalised the user fields, registration/login behaviour, immutable email, password-change payload, and token naming. No new requirements, architecture, or design decisions were made.

**Files changed:**
- `packages/common-dtos/src/index.ts` — replaced legacy user/auth DTO fields with the approved account, authentication, profile-update, password-change, and JWT claim DTOs; renamed the registration event email field.
- `ai/usage-log.md` — appended this implementation record and disclosure header.

## 2026-09-22 17:30 SGT — Iteration 2 Prisma persistence model

**Tool:** Codex (model: GPT-5.6 Terra)
**Author:** ngkhengyang
**Branch:** user-service-base

**Prompt (summarised):** Implement the approved Prisma persistence iteration for the User Service before proceeding to deployment or endpoint work.

**Usage scenario:** Implementation code (allowed use). The author had already selected Prisma, the approved account/session fields, case-insensitive account uniqueness, and one logical database per service. No new requirements, architecture, or design decisions were made.

**Files changed:**
- `services/user-service/src/database/prisma/schema.prisma` and `src/database/prisma/migrations/` — replaced the legacy model with User and Session persistence models and the matching Prisma migration.
- `services/user-service/src/persistence/{database,auth-repository,user-repository}.ts`, `src/index.ts`, and `src/database/seed.ts` — replaced runtime pg access and legacy seed handling with Prisma operations.
- `services/user-service/src/{database/userRepository,middleware/authMiddleware}.ts` and `services/user-service/migrations/` — removed obsolete legacy implementations superseded by the active Prisma path.
- `docker/postgres-init/01-init-databases.sql` — restored user_db and synchronized the fresh-volume schema.
- `services/user-service/package.json`, `package-lock.json` — removed unused raw-pg and legacy JWT/bcrypt dependency declarations.
- `services/user-service/src/auth/auth-module.ts`, `src/users/user-module.ts` — preserved duplicate username/email error mapping for Prisma errors.
- `docs/services/user-service.md` — updated persistence facts.
- `ai/usage-log.md` — appended this entry.

## 2026-09-22 18:24 SGT — Iteration 5 login and session DTO contract

**Tool:** Codex (model: GPT-5.6 Terra)
**Author:** ngkhengyang
**Branch:** user-service-base

**Prompt (summarised):** Implement the approved login and refresh-session contract using the specified `RefreshTokenResponse` DTO.

**Usage scenario:** Implementation code (allowed use). The author had already selected Ed25519 access tokens, refresh-session rotation, cookie handling, keep-logged-in behaviour, and the DTO name. No new requirements, architecture, or design decisions were made.

**Files changed:**
- `packages/common-dtos/src/index.ts` — added `RefreshTokenResponse`.
- `services/user-service/src/auth/auth-module.ts`, `auth-routes.ts` — adopted the shared login, access-token, and refresh-token response DTOs without exposing refresh tokens in JSON.
- `ai/usage-log.md` — appended this entry.

## 2026-09-22 17:47 SGT — Iteration 3 shared PostgreSQL deployment

**Tool:** Codex (model: GPT-5.6 Terra)
**Author:** ngkhengyang
**Branch:** user-service-base

**Prompt (summarised):** Implement the approved User Service deployment consolidation onto the existing shared PostgreSQL container.

**Usage scenario:** Implementation code and configuration (allowed use). The author had already selected one logical database per service in a shared PostgreSQL container and specified that `user_db` remain there. No new requirements, architecture, or design decisions were made.

**Files changed:**
- `docker-compose.yml` — moved User Service into the root Compose stack and connected it to `postgres:5432/user_db`.
- `services/user-service/docker-compose.yml` — removed the obsolete standalone `user-db` deployment and volume.
- `services/user-service/src/config.ts`, `.env.example` — changed direct local development to `localhost:5432/user_db`.
- `docs/services/user-service.md`, `services/user-service/docs/auth-setup.md` — updated shared-database connection, startup, and reset instructions.
- `ai/usage-log.md` — appended this entry.

## 2026-09-22 18:59 SGT — Iteration 6 immutable profile and password contract

**Tool:** Codex (model: GPT-5.6 Terra)
**Author:** ngkhengyang
**Branch:** user-service-base

**Prompt (summarised):** Implement the approved username-only profile update and shared profile/password DTO contract.

**Usage scenario:** Implementation code (allowed use). The author had already selected immutable email, username-only updates, the shared user field names, and the current-password change flow. No new requirements, architecture, or design decisions were made.

**Files changed:**
- `services/user-service/src/users/user-module.ts`, `src/persistence/user-repository.ts`, `src/http/error-handler.ts` — enforced username-only updates, removed email mutation, and adopted shared user/password DTOs.
- `services/user-service/docs/api-reference.md`, `docs/services/user-service.md` — documented immutable email and `userId`/`userRole` responses.
- `ai/usage-log.md` — appended this entry.

## 2026-09-22 19:20 SGT — Iteration 7 deferred administration endpoints

**Tool:** Codex (model: GPT-5.6 Terra)
**Author:** ngkhengyang
**Branch:** user-service-base

**Prompt (summarised):** Implement the approved iteration only: authenticated, ADMIN-gated
User Service placeholders for future user management.

**Usage scenario:** Implementation code (allowed use). The author had already selected the
User Service as the future owner of administration, the two endpoint paths, the middleware
order, and the required `501` placeholder behavior. No user-management functionality,
data mutation, DTO, or design decision was added.

**Files changed:**
- `services/user-service/src/{index,app}.ts`, `src/users/user-routes.ts` — wired the
  existing `@campus-errand/auth` ADMIN middleware and added the two non-mutating `501` routes.
- `services/user-service/docs/api-reference.md`, `docs/services/user-service.md` — documented
  the deferred routes and their authentication behavior.
- `ai/usage-log.md` — appended this entry.

## 2026-09-22 19:45 SGT — Iteration 8 Supplier Service Ed25519 authentication

**Tool:** Codex (model: GPT-5.6 Terra)
**Author:** ngkhengyang
**Branch:** user-service-base

**Prompt (summarised):** Implement the approved Supplier Service migration from the
legacy HS256 verifier to the established Ed25519 shared authentication package.

**Usage scenario:** Implementation code and configuration (allowed use). The author had
already selected Ed25519 access tokens, the shared authentication package, and the
requirement for other services to accommodate the change. No authentication architecture,
claims contract, or authorization policy was newly decided.

**Files changed:**
- `services/supplier-service/src/backend/{server,supplierRoutes}.ts` — configured and
  injected the shared Ed25519 verifier; preserved public reads and ADMIN-only mutations.
- `services/supplier-service/src/backend/authMiddleware.ts` — removed the superseded local
  HS256 verifier and request-payload adapter.
- `services/supplier-service/package.json`, `package-lock.json` — replaced direct
  `jsonwebtoken` declarations with the existing shared authentication package.
- `docker-compose.yml`, `docs/services/supplier-service.md` — passed and documented the
  public-key verification configuration.
- `ai/usage-log.md` — appended this entry.

## 2026-09-22 20:10 SGT — Iteration 10 D2 contract alignment

**Tool:** Codex (model: GPT-5.6 Terra)
**Author:** ngkhengyang
**Branch:** user-service-base

**Prompt (summarised):** Implement the approved D2 test migration using a generated
test-only Ed25519 key pair, without using the supplied `.env` key pair.

**Usage scenario:** Test implementation and documentation (allowed use). The author had
already selected the test-only key source and the implemented account, profile, deferred
administration, and Supplier Service contracts under test. No new test scope, key-management
policy, endpoint behavior, or design decision was added.

**Files changed:**
- `scripts/test-d2-e2e.ts` — generates an in-memory Ed25519 key pair for each run and
  validates the implemented User and Supplier Service contracts.
- `README.md` — updated D2 test prerequisites and current seed-account facts.
- `ai/usage-log.md` — appended this entry.

## 2026-09-22 20:35 SGT — Iteration 11 documentation compliance

**Tool:** Codex (model: GPT-5.6 Terra)
**Author:** ngkhengyang
**Branch:** user-service-base

**Prompt (summarised):** Update public and internal documentation facts for the approved
Prisma, Ed25519 authentication, DTO, deployment, deferred-administration, and D2 test work.

**Usage scenario:** Documentation of implemented code and project guidance (allowed use).
The author had already approved the underlying behavior and explicitly chose public and
internal documentation as the scope. No requirements, architecture, or rationale was added.

**Files changed:**
- `README.md`, `docs/architecture/overview.md`, `docs/requirements/conflicts.md` — corrected
  stale public implementation facts and references.
- `CLAUDE.md`, `.claude/README.md`, `.claude/PLUGINS.md`, `.claude/agents/{backend,infrastructure}.md` — corrected
  factual agent guidance for the current paths and Ed25519 configuration.
- `ai/usage-log.md` — appended this entry.

## 2026-09-23 00:34 SGT — Align admin portal demo login

**Tool:** Codex (model: GPT-5.6 Terra)
**Author:** ngkhengyang
**Branch:** user-service-base

**Prompt (summarised):** Implement the approved admin-portal login alignment with the existing User Service request, response, and seed-password contract.

**Usage scenario:** Implementation code (allowed use). The author approved updating the portal to the established User Service contract; no API, authentication, or data-model decision was made.

**Files changed:**
- `apps/admin-portal/src/App.tsx` — sent `email`, read `accessToken`, and used the current seeded demo password.
- `ai/usage-log.md` — appended this approved implementation record.
## 2026-09-21 (later still) — Add real Admin Login gate to admin-portal, remove now-redundant role gating

**Tool:** Claude Code (model: Claude Sonnet 5)
**Author:** jagdeepsh

**Prompt (summarised):** User wanted the admin portal to stop auto-displaying the dashboard on load and instead show a real "Admin Log In" page (NUS email + password, styled like a typical login box). On submit, POST to `/api/auth/login` through the gateway, show a loading spinner on the button while in flight, then decode the returned JWT's role claim client-side and only show the dashboard if it's ADMIN; otherwise show a red error box with the error code and message (covers bad credentials, network errors, and a valid-but-non-admin account). Planned in plan mode; user then asked (mid-review) to also: replace the sidebar/mobile "Demo RBAC Role" Admin/Student/Guest switcher with a Log Out button (confirmed via AskUserQuestion: fully functional client-side logout, no API call since no logout endpoint exists and none is needed for a stateless JWT), and remove the now-redundant `isAdmin` role checks gating Add Location/Deactivate/Edit/Delete and the Users nav item, since only Admins can reach the dashboard at all now. Scope explicitly restricted to `apps/admin-portal/src` only.

**Usage scenario:** Requirements interpretation and implementation code (allowed use) — followed the existing file's conventions throughout (relative-path gateway fetches, Tailwind vocabulary already used for cards/inputs/errors, `RefreshCw` reused for the spinner); no new npm dependency for JWT decoding (plain `atob()` on the token's payload segment instead of pulling in a jwt-decode library, which would have required Dockerfile/package.json changes outside the requested scope).

**Files changed:**
- `apps/admin-portal/src/App.tsx` — added `isAuthenticated`/`loginEmail`/`loginPassword`/`isLoggingIn`/`loginError` state, a module-level `decodeJwtRole()` helper, `handleAdminLogin`/`handleLogout` handlers, and an early-return login page rendered whenever `!isAuthenticated`. Removed the mount-time `loginDemoUser('ADMIN')` auto-login effect and the `loginDemoUser` function itself (now fully replaced by the real login flow); removed the "Demo RBAC Role" switcher (sidebar footer + mobile drawer), replaced with a "Log Out" button in both places. Removed the `isAdmin` derived flag and every conditional it gated (Add Location button, Deactivate/Activate + Edit + Delete buttons in both the mobile card and desktop table views, and the Users nav item in both sidebar and mobile drawer) — these now render unconditionally since the login gate itself is the access control. Dropped the now-unused `ShieldAlert`/`User` icon imports, added `LogOut`.

Verified: `npx tsc --noEmit` passes with no errors in `apps/admin-portal`.

## 2026-09-21 (later still) — Add Log In / Sign Up gate to student-app

**Tool:** Claude Code (model: Claude Sonnet 5)
**Author:** jagdeepsh

**Prompt (summarised):** Extended the same login-gate idea used for the admin portal to the student app, but with both a Log In box and a Sign Up box toggled via links, matching the User Service's existing `/api/auth/login` and `/api/auth/register` endpoints. Log In: email + password, loading spinner on submit, red error box (code + message) on failure — same style as the admin login page. Sign Up: NUS Email, Password, Re-type Password, Full Name, Matric Number, Phone Number, Telegram Handle, with the first five marked compulsory (red asterisk) and a note below the fields explaining that; client-side checks before any API call that all compulsory fields are filled, that Re-type Password matches Password, and that Password is 8-24 characters (with a hint under the Password label); on successful registration the returned token logs the user in automatically. Planned in plan mode first — confirmed no role restriction is needed here (unlike the admin gate) since any authenticated account should be let into the student app, and confirmed no other files need changes (vite.config.ts and the gateway already proxy /api/auth).

**Usage scenario:** Requirements interpretation and implementation code (allowed use) — reused the admin login page's error-box and spinner patterns for visual/UX consistency across both apps, but styled with the student app's own branding (`bg-nus-blue`/`text-nus-orange`, mobile card shell) instead of copying the admin portal's slate dashboard look.

**Files changed:**
- `apps/student-app/src/App.tsx` — added `isAuthenticated`/`authToken`/`authView`/login-form/signup-form state, `handleLogin`/`handleSignup` handlers, and an early-return Log In/Sign Up page rendered whenever `!isAuthenticated`. Added `RefreshCw` to the `lucide-react` import for the loading spinner. Attached the stored `authToken` as an `Authorization` header on the existing `fetchLiveSuppliers()` call (harmless — that route stays public by the author's own prior decision — but needed so the token variable isn't flagged as unused under this app's `noUnusedLocals` tsconfig, and is forward-compatible if that route ever requires auth). Rest of the app (Feed/Post/Spots/Tasks/Wallet, mock orders/wallet keyed to the hardcoded demo user id) is unchanged — the real logged-in user is not yet wired into that mock data, flagged as a separate future task.

Verified: `npx tsc --noEmit` passes with no errors in `apps/student-app`.

## 2026-09-21 (later still) — Show deactivated suppliers as disabled cards in student-app "Spots" tab instead of hiding them

**Tool:** Claude Code (model: Claude Sonnet 5)
**Author:** jagdeepsh

**Prompt (summarised):** User noticed that deactivating a supplier in the admin portal made it disappear entirely from the student app's Spots directory, and wanted it to still show up there instead — visually dimmed, with a red "Unavailable" label, and its "Pick for Errand" button disabled/unclickable. Planned in plan mode: root cause was `fetchLiveSuppliers()` calling `/api/suppliers?isActive=true`, a server-side filter that meant inactive suppliers were never sent to the frontend at all. Since that same `suppliers` list also feeds the Post Errand pickup dropdown (which must keep excluding unavailable suppliers, since you shouldn't be able to select one as a new errand's pickup point), the fix needed to split the two consumers rather than just removing the filter outright.

**Usage scenario:** Debugging assistance and implementation code (allowed use) — reused the rose/emerald active-inactive badge convention already established in the admin portal for visual consistency across the app family.

**Files changed:**
- `apps/student-app/src/App.tsx` — `fetchLiveSuppliers()` now fetches `/api/suppliers` (dropped `?isActive=true`), and its post-fetch default-selection logic picks the first *active* supplier instead of just `items[0]`. Added a derived `activeSuppliers` list, used for the Post Errand dropdown's options and its "N active spots" counter, so unavailable suppliers stay unselectable there. The Spots tab's card list (`filteredSuppliers`, unchanged) now naturally includes inactive suppliers; each card is dimmed (`bg-slate-50 opacity-60`) when `!s.isActive`, shows a red "Unavailable" badge next to the campus-zone badge, and its "Pick for Errand" button gets `disabled={!s.isActive}` plus matching disabled styling.

Verified: `npx tsc --noEmit` passes with no errors in `apps/student-app`.

## 2026-09-21 (later still) — Add missing Description field, red required-field indicators, and client-side validation to Add/Edit Supplier modals

**Tool:** Claude Code (model: Claude Sonnet 5)
**Author:** jagdeepsh

**Prompt (summarised):** User noticed the Add Supplier modal in the admin portal has no Description field at all (only reachable via a follow-up Edit), required fields in both Add and Edit modals are marked with a plain unstyled `*` with no explanatory legend, neither form validates required fields client-side before hitting the API, and the Edit modal's "Exact Pickup Spot Description" field is missing the asterisk/required treatment the equivalent Add-modal field has. Planned in plan mode: confirmed `description` is already a fully supported optional field on both `CreateSupplierRequest`/`UpdateSupplierRequest` and already present (unused) in the Add form's own state — pure frontend gap, no backend/DTO changes needed; confirmed the backend's actual required fields for create (name, campusZone, exactLocation, category) exactly match the four fields already asterisked in the Add modal, informing which fields to validate in both forms for consistency.

**Usage scenario:** Requirements interpretation and implementation code (allowed use) — added a small shared `validateSupplierForm()` helper reused by both the create and update handlers rather than duplicating the same four checks twice.

**Files changed:**
- `apps/admin-portal/src/App.tsx` — added a Description `<textarea>` to the Add Supplier modal (previously missing entirely). Added `addFormErrors`/`editFormErrors` state and `validateSupplierForm()`, called in `handleCreateSupplier`/`handleUpdateSupplier` before their `fetch()` calls; a failed check blocks submission and populates the errors, which render as inline red text directly under each invalid field's label (and a red border on that field), clearing as soon as the field is edited. Turned every required-field `*` red via a `<span className="text-rose-600">*</span>`, and added a "Fields marked with * are required" legend near the top of both forms. Edit modal's "Exact Pickup Spot Description" field now has the same asterisk + required check as Add's equivalent field (previously the one inconsistency between the two forms), and Campus Zone/Category also gained asterisks there for full parity with Add. Both modals' open/Cancel/X handlers now also reset their respective error state so a previous attempt's messages don't linger into a fresh open.

Verified: `npx tsc --noEmit` passes with no errors in `apps/admin-portal`.

## 2026-09-23 19:10 SGT — Merge dev into user-service-base and apply review-round-2 fixes (PR #76)

**Tool:** Claude Code (model: Claude Fable 5.1)
**Author:** Reallyeasy1
**Branch:** pr76-fixes (local branch from origin/user-service-base 48e0518, `git merge --no-commit origin/dev`)

**Prompt (summarised):** Fix the findings of the second review round on PR #76 so the PR can be merged.

**Usage scenario:** Implementation of changes the PR author had already agreed to in the review threads (replies marked "Addressed" whose commits were never pushed), plus the mechanical merge with `dev`. No new design decisions were taken: the contract changes (RFC 7519 claim names, optional `keepLoggedIn`, required `username` on profile update) were the author's stated intent; the admin Users page keeps its UI behind a local type until the deferred `GET /api/users` exists (issue #70) — whether that page should instead be hidden, whether profile fields such as Telegram handle belong in the product, and whether a password change should revoke other sessions are left to the team. Verified with `npm run typecheck` (all 9 workspaces) and `npm run test:d2` (see result in the PR). Left uncommitted, merge in progress, for the author to review and commit; nothing was pushed.

**Files changed:**
- `ai/usage-log.md` — merge conflict resolved (both sides kept); this entry.
- `apps/admin-portal/src/App.tsx` — merge conflict resolved: dev's login gate kept and moved to `{ email, password }` / `accessToken` / `{ error, code }`; Users page typed with local `AdminUserListItem`; 501 from `/api/users` shown as "not implemented yet".
- `apps/student-app/src/App.tsx` — login and sign-up moved to the User Service contract (`username`, `email`, `password`); auto-login after registration via a follow-up login call; full name, matric, phone, Telegram inputs removed.
- `packages/common-dtos/src/index.ts` — `JWTPayload` uses `sub, sid, role, iat, exp, iss, aud`; `keepLoggedIn?`; `UpdateUserProfileRequest.username` required.
- `packages/auth/src/index.ts`, `packages/auth/package.json` — verifies the standard claims; imports `JWTPayload` from common-dtos (new workspace dependency, lockfile updated).
- `services/user-service/src/auth/tokens.ts` — emits the standard claims.
- `services/user-service/src/auth/auth-module.ts` — dummy-hash verification for unknown emails; expired-session clean-up on login and refresh.
- `services/user-service/src/persistence/auth-repository.ts` — `LOWER(email)` look-up; `deleteExpiredSessions`.
- `services/user-service/src/auth/auth-routes.ts` — malformed cookie treated as absent.
- `services/user-service/src/http/error-handler.ts` — body-parser 4xx errors answered as JSON 4xx.
- `services/user-service/src/users/user-routes.ts` — 501 placeholders return a JSON body with code `NOT_IMPLEMENTED`.
- `services/user-service/src/database/prisma/schema.prisma` — comment explaining the missing `@unique`.
- `services/user-service/src/database/seed.ts` — `LOWER(email)` look-up.
- `services/user-service/package.json` — removed unused `@types/amqplib` (no header possible).
- `docker-compose.yml` — `${JWT_PRIVATE_KEY:?…}` / `${JWT_PUBLIC_KEY:?…}` fail fast; `CORS_ORIGIN` passed to user-service.
- `.env.example`, `services/user-service/.env.example` — `CORS_ORIGIN` listed.
- `scripts/test-d2-e2e.ts` — Windows-runnable (shell spawn, process-tree kill), 30 s readiness timeout, standard-claims assertion.
- `docs/services/user-service.md`, `services/user-service/docs/authentication-for-services.md` — claim names updated.
- `package-lock.json` — regenerated for the auth package dependency.

## 2026-09-23 20:02 SGT — Require PRs to link the issues they close

**Tool:** Claude Code (model: Claude Fable 5.1)
**Author:** Reallyeasy1
**Branch:** claude/great-pasteur-kx86kz (rebased onto origin/dev 6ac4fcf)

**Prompt (summarised):** Make it so that pull requests on GitHub tag the issue(s) they close; then rebase the change onto `dev`.

**Usage scenario:** Boilerplate/config generation (PR template, GitHub Actions check) and documentation (CLAUDE.md rule). No product or architecture decision involved; the convention itself (closing keywords in the PR body) is GitHub's standard mechanism. Committed and pushed to the author's own feature branch at the author's explicit request in the Claude Code session; nothing was pushed to `dev` or `main`.

**Files changed:**
- `.github/pull_request_template.md` — new; PR body layout with a **Linked issues** section pre-filled with `Closes #`.
- `.github/workflows/pr-linked-issue.yml` — new; fails a PR whose body has no `Closes/Fixes/Resolves #N` (or issue URL) reference.
- `CLAUDE.md` — section 6: rule that every PR body links the issue(s) it closes; disclosure entry.
- `ai/usage-log.md` — this entry.
