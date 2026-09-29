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
<!--
AI Assistance Disclosure:
Tool: Google Antigravity Agent, date: 2026-09-28
Scope: Appended the Stateless Session State with Symmetric Token Encoding and NGINX Gateway Offloading implementation record below.
Author review: (to be completed by author after review)
-->
<!--
AI Assistance Disclosure:
Tool: Google Antigravity Agent, date: 2026-09-24
Scope: Appended the Database-per-Service schema ownership and migration refactoring record below.
Author review: (to be completed by author after review)
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
## 2026-09-20 23:09 SGT — User Service foundation and local deployment

**Tool:** Codex (referenced tasks; model varied)
**Author:** ngkhengyang
**Branch:** user-service-base

**Prompt (summarised):** Implement a simple, independently runnable User Service setup: configure its Dockerfile, local environment, PostgreSQL database and migrations, seed three sample accounts including one admin, and integrate the service into the root Compose workflow. Keep the initial scope focused on the base service and omit unapproved logging or administrator features.

**Usage scenario:** User Service implementation and local deployment configuration (allowed use). The author selected the initial schema, seed data, environment scope, and deliberately limited feature set.

**Files changed:**
- `docker-compose.yml`, `services/user-service/docker-compose.yml`, `services/user-service/Dockerfile`, and `services/user-service/.env.example` — configured local and Compose-based service startup.
- `services/user-service/src/database/prisma/`, `src/database/seed.ts`, and related configuration — defined the database schema, migrations, and development seed accounts.
- `ai/usage-log.md` — appended this implementation record.

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

## 2026-09-21–2026-09-22 — User Service modules and shared authentication package

**Tool:** Codex (referenced tasks; model varied)
**Author:** ngkhengyang
**Branch:** user-service-base

**Prompt (summarised):** Implement the base User Service modules with dependency-injected authentication, registration/login/refresh/logout flows, scrypt password hashing, Ed25519 access-token issuance, refresh-session handling, authenticated self-profile routes, validated username-only updates, immutable email, and password changes that preserve existing sessions. Add simple validation, request/error logging, and centralized error handling. Create a minimal shared authentication package that verifies Ed25519 tokens with a public key and exposes role helpers such as `isAdmin`; keep token issuance, sessions, and password handling inside User Service.

**Usage scenario:** User Service and shared authentication implementation (allowed use). The author selected the service boundaries, base route scope, token model, validation rules, and downstream verification interface.

**Files changed:**
- `services/user-service/src/{auth,users,http,persistence,utils,app.ts,index.ts}` — implemented authentication, profile modules, repositories, middleware integration, validation, logging, error handling, and route wiring.
- `packages/auth/src/index.ts` — implemented the shared public-key token verifier and role helpers.
- `services/user-service/docs/` — documented the implemented authentication and User Service contracts.
- `ai/usage-log.md` — appended this implementation record.

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
- `CLAUDE.md` — section 6: rule that every PR body links the issue(s) it closes; disclosure entry. Follow-up commit: wording aligned with the workflow (an issue must exist; the check does not accept a PR with none).
- `ai/usage-log.md` — this entry.

## 2026-09-23 23:30 SGT — Automated Claude Code pull-request review workflow

**Tool:** Claude Code (model: Claude Fable 5.1)
**Author:** Reallyeasy1
**Branch:** claude/great-pasteur-kx86kz (from origin/dev 9ff7430)

**Prompt (summarised):** Set up GitHub Actions so that every PR (opened, reopened, ready for review, new commits) is automatically reviewed by Claude Code via `anthropics/claude-code-action@v1`, authenticated with the author's Claude subscription OAuth token (`CLAUDE_CODE_OAUTH_TOKEN` repository secret, no API key), using Fable where available, with a bounded number of turns, least-privilege permissions, no draft/fork runs, and a high-signal review prompt.

**Usage scenario:** Boilerplate/config generation (CI workflow) and documentation. No application code touched. Decisions left to the author: adding the `CLAUDE_CODE_OAUTH_TOKEN` secret, accepting that Fable runs may bill usage credits on Pro/Max, and whether to keep `--model best` (Fable when available, else Opus) or require Fable with `--model fable`. Nothing was committed or pushed.

**Files changed:**
- `.github/workflows/claude-pr-review.yml` — new; runs the Claude Code review on `pull_request` events, skips drafts and fork PRs, one run per PR at a time, read-only tool set, Fable/Opus via `--model best`, `--max-turns 40`.
- `ai/usage-log.md` — this entry.

## 2026-09-23 (later still) — Add Status column and Disable/Reinstate toggle to admin portal Users table

**Tool:** Claude Code (model: Claude Sonnet 5)
**Author:** jagdeepsh

**Prompt (summarised):** User wanted the admin portal's Users table (desktop and mobile) to show the `status` field (added to the User model, and exposed via a new admin-only `PATCH /api/users/:id/admin` endpoint, in earlier prompts this session) as a Status column, plus a per-row button — red "Disable" when active, green "Reinstate" when disabled — that calls that endpoint through the gateway with the admin's Bearer token. Explicitly asked for robust state handling so the button can't end up toggling the wrong direction. Planned in plan mode: found the existing supplier `toggleStatus()` in this same file as the direct precedent to mirror, but noted it has no in-flight guard against double-clicks — the new handler adds one, since that's exactly the failure mode the user was concerned about.

**Usage scenario:** Requirements interpretation and implementation code (allowed use) — reused the existing supplier status-toggle pattern (fetch → update state from server response → success/error `actionAlert`) rather than inventing a new one, and reused the CheckCircle/XCircle Active/Unavailable badge styling already established for suppliers.

**Files changed:**
- `apps/admin-portal/src/App.tsx` — added `togglingUserIds` (`Set<string>`) state and a `toggleUserStatus(userId)` handler that calls `PATCH /api/users/:id/admin` with `getAuthHeaders()`, updates `users` state from the server's returned user object (never flips the boolean locally/optimistically), and tracks the in-flight request per row to disable that row's button until the response lands. Added a Status column (Active/Disabled badge, sortable) and an Actions column with the Disable/Reinstate button to the desktop table, and the equivalent badge + button to the mobile card view.

Verified: `npx tsc --noEmit` passes with no errors in `apps/admin-portal`; rebuilt and restarted the `admin-portal` container.

## 2026-09-24 — Rename student-app "Wallet" tab to "Profile", add Profile Info section (GET/PATCH /me)

**Tool:** Claude Code (model: Claude Sonnet 5)
**Author:** jagdeepsh

**Prompt (summarised):** User wanted the student app's bottom-nav "Wallet" button renamed to "Profile" (with a profile icon), the existing wallet content kept fully intact but shifted below a new "Profile Info" section showing the logged-in user's own account fields via `GET /me`, and an Edit → Cancel/Update flow letting the user change only their username via `PATCH /me`. User asked three specific investigation questions before planning: what `GET /me` returns (confirmed: `{userId, username, email, userRole, status}`, never a password), whether `PATCH /me` is scoped to that specific signed-in user (confirmed: yes, structurally — it reads the target user id from the verified JWT's `sub` claim via `res.locals.auth`, no `:id` param exists to target anyone else), and whether it enforces username uniqueness (confirmed: yes, case-insensitive, via the same `DUPLICATE_USERNAME`/409 mapping used elsewhere). Asked the user via AskUserQuestion which fields should get the red "compulsory" asterisk given only username is actually editable; they chose username and email only (the two NOT NULL + unique fields), not role/status.

**Usage scenario:** Requirements interpretation and implementation code (allowed use) — cross-referenced `docker/postgres-init/01-init-databases.sql` for each field's schema constraints to write the small hint text under each field label, matching the user's "password needs 8-24 characters"-style example.

**Files changed:**
- `apps/student-app/src/App.tsx` — renamed `activeTab`'s `'wallet'` value to `'profile'` throughout; swapped the `Wallet` icon import for `UserCircle` (its only usage) and the nav label to "Profile", now also lazy-triggering `fetchProfile()` on click. Added `profile`/`isLoadingProfile`/`profileError`/`isEditingProfile`/`editUsernameDraft`/`isUpdatingProfile`/`updateProfileError` state, a `getAuthHeaders()` helper (student-app didn't have one yet), `fetchProfile()`, `startEditingProfile()`/`cancelEditingProfile()`, and `handleUpdateProfile()`. Inserted a new "Profile Info" card (User ID/Username/Email/Role/Status, all disabled except Username while editing, Edit/Cancel/Update buttons) immediately before the existing `<h2>Credit Wallet & Ledger</h2>` — everything from that heading down is unchanged, just pushed below the new section.

Verified: `npx tsc --noEmit` passes with no errors in `apps/student-app`; rebuilt and restarted the `student-app` container; live-tested `GET /api/users/me` and `PATCH /api/users/me` (rename + revert) directly against the response shapes the new code consumes.

## 2026-09-24 (later) — Profile Info UI tweaks: drop User ID, colored Role/Status badges

**Tool:** Claude Code (model: Claude Sonnet 5)
**Author:** jagdeepsh

**Prompt (summarised):** Small follow-up to the Profile Info section added earlier today: remove the User ID field from display entirely, and render Role and Status as colored "div box" badges instead of plain disabled text inputs — Status green for Active / red for Disabled, Role green for Student / blue for Admin, using a transparent tinted background with a solid colored border (the badge style already used in the admin portal).

**Usage scenario:** UI refinement on the author's explicit instruction (allowed use) — no new data or endpoints involved, purely display styling of fields already being fetched from `GET /me`.

**Files changed:**
- `apps/student-app/src/App.tsx` — removed the "User ID" field block from the Profile Info card. Replaced the Role and Status `<input disabled>` elements with `<div>` badges: Role uses `bg-blue-50 text-blue-700 border-blue-200` for ADMIN and `bg-emerald-50 text-emerald-700 border-emerald-200` for STUDENT; Status uses the same emerald styling for Active and `bg-rose-50 text-rose-700 border-rose-200` for Disabled.

Verified: `npx tsc --noEmit` passes with no errors in `apps/student-app`; rebuilt and restarted the `student-app` container.

## 2026-09-24 (later) — Wire admin portal Log Out button to the real POST /api/auth/logout

**Tool:** Claude Code (model: Claude Sonnet 5)
**Author:** jagdeepsh

**Prompt (summarised):** User wanted the admin portal's Log Out button to actually call a logout API endpoint through the gateway (revoking the session server-side) instead of only clearing the local JWT and navigating back to the login page, with a loading spinner on the button while the call is in flight. Asked whether this could be done with only `App.tsx` + `usage-ai.md` touched. Investigated first: `POST /api/auth/logout` already exists in `user-service` (`auth-routes.ts`) — reads the `refresh_token` HttpOnly cookie already set at login (or a body fallback), calls `auth.logout()` to revoke the session, clears the cookie, returns `204`; it requires no `Authorization` header (the auth router is mounted without `requireAuthentication`). Gateway and the admin portal's vite proxy already route `/api/auth/` correctly. So unlike several earlier features this session, no backend/gateway file needed touching — the user's scope assumption was correct this time.

**Usage scenario:** Requirements interpretation and implementation code (allowed use) — confirmed the existing endpoint's behavior by reading `auth-routes.ts`/`auth-module.ts` before wiring the frontend to it, rather than assuming.

**Files changed:**
- `apps/admin-portal/src/App.tsx` — `handleLogout` is now async: calls `POST /api/auth/logout` (network errors are swallowed, not surfaced, since a failed server-side revoke shouldn't block the user from being logged out locally), then always clears `isAuthenticated`/`authToken`/login form state in a `finally` block. Added `isLoggingOut` state; both Log Out buttons (sidebar footer, mobile drawer) swap the `LogOut` icon for a spinning `RefreshCw` and "Logging out…" label while the call is in flight, and are `disabled` during that window.

Verified: `npx tsc --noEmit` passes with no errors in `apps/admin-portal`.

## 2026-09-24 (later) — Log Out button for student app Profile page

**Tool:** Claude Code (model: Claude Sonnet 5)
**Author:** jagdeepsh

**Prompt (summarised):** Add a "Log Out" button at the bottom of the student app's Profile page, in a blue box, mirroring the admin portal's Log Out feature added a couple of turns earlier: call `POST /api/auth/logout` through the gateway to clear tokens server-side, and double-check that client-side tokens are also cleared regardless of outcome.

**Usage scenario:** Requirements interpretation and implementation code (allowed use) — reused the already-verified `POST /api/auth/logout` endpoint behavior from the admin portal work; the "double check" ask was addressed by structuring the clearing logic in a `finally` block (runs whether the fetch succeeds, throws, or the server returns a non-2xx status) and confirmed live.

**Files changed:**
- `apps/student-app/src/App.tsx` — added `isLoggingOut` state and a `handleLogout` handler that calls `POST /api/auth/logout` (network errors swallowed, not surfaced) then unconditionally clears `isAuthenticated`, `authToken`, login form fields, `rememberMe`, `profile`, and resets `activeTab` to `'feed'` inside a `finally` block. Added a full-width blue "Log Out" button (with spinner + "Logging out…" while in flight) as the last element of the Profile page's Profile Info section, below the Transaction Ledger.

Verified: `npx tsc --noEmit` passes with no errors in `apps/student-app`; rebuilt and restarted the `student-app` container; live-tested end-to-end with curl/cookie jars — logged in with `keepLoggedIn: true`, confirmed a `sessions` row existed, called `POST /api/auth/logout` (returned `204`), confirmed the session count dropped by exactly one and the `refresh_token` cookie was cleared server-side, then confirmed a follow-up `POST /api/auth/refresh` with the cleared cookie correctly returned `401 INVALID_SESSION`.

## 2026-09-24 (later) — "Remember me" + silent session restore for admin portal

**Tool:** Claude Code (model: Claude Sonnet 5)
**Author:** jagdeepsh
**Branch:** admin_dashboard

**Prompt (summarised):** Mirror the student app's "Remember me" checkbox and silent session-restore feature (added earlier this session) into the admin portal's login gate: same checkbox sending `keepLoggedIn` to `POST /api/auth/login`, same default-on silent restore via `POST /api/auth/refresh` on page load so an admin stays logged in across refreshes. Log Out was already implemented and did not need changes.

**Usage scenario:** Requirements interpretation and implementation code (allowed use) — reused the already-verified backend session/TTL behavior confirmed in a prior investigation this session (non-persistent sessions default to a 1-day idle window, persistent ones to 30 days, and a session/cookie is always created on login regardless of `keepLoggedIn`). One implementation detail required judgment rather than being handed a design: the admin login gate additionally checks the JWT's `role` claim and only admits ADMIN accounts, so the new silent-restore effect applies that same role check to the restored token (falling through silently to the login page for a non-admin session, matching how a non-admin password login is already handled today) rather than trusting any valid refreshed token.

**Files changed:**
- `apps/admin-portal/src/App.tsx` — added `isCheckingSession` and `rememberMe` state. New mount effect calls `POST /api/auth/refresh`; on success it decodes the restored access token's role and only auto-authenticates if `ADMIN`. Added an `isCheckingSession` spinner gate before the existing `!isAuthenticated` login-page gate. `handleAdminLogin`'s request body now includes `keepLoggedIn: rememberMe`. Added a "Remember me?" checkbox to the login form between Password and the Log In button. `handleLogout`'s `finally` block now also resets `rememberMe` to `false` and `activeNav` back to `'suppliers'`.

Verified: `npx tsc --noEmit` passes with no errors in `apps/admin-portal`; rebuilt and restarted the `admin-portal` container; live-tested end-to-end with curl/cookie jars against the real `admin@nus.edu.sg` account — logged in with `keepLoggedIn: false` and confirmed the resulting `sessions` row had `persistent = false` with ~24h remaining on `idle_expires_at`; called `POST /api/auth/refresh` with that cookie (simulating a page reload) and got a rotated access token back; logged out (`204`, session deleted); logged back in with `keepLoggedIn: true` and confirmed `persistent = true` with ~30 days remaining; logged out again and confirmed a subsequent `POST /api/auth/refresh` correctly returned `401 INVALID_SESSION`.

## 2026-09-24 (later) — Relabel "Remember me?" checkbox to "Keep me logged in"

**Tool:** Claude Code (model: Claude Sonnet 5)
**Author:** jagdeepsh
**Branch:** admin_dashboard

**Prompt (summarised):** Rephrase the "Remember me?" checkbox label to "Keep me logged in" on both the admin portal and student app login pages — copy-only, no behavior change.

**Usage scenario:** Requirements-driven copy change (allowed use) — no logic, state, or API contract touched.

**Files changed:**
- `apps/admin-portal/src/App.tsx` — checkbox `<span>` text changed from "Remember me?" to "Keep me logged in".
- `apps/student-app/src/App.tsx` — checkbox `<span>` text changed from "Remember me?" to "Keep me logged in".

Verified: `npx tsc --noEmit` passes with no errors in both `apps/admin-portal` and `apps/student-app`; rebuilt and restarted both containers.
## 2026-09-24 (afternoon) — Enforce Database-per-Service schema ownership & migrations

**Tool:** Google Antigravity Agent
**Author:** yanhwee
**Branch:** fix/database-per-service-migrations

**Prompt (summarised):**
User asked whether `01-init-databases.sql` should be creating tables across all services given the database-per-service pattern, explored production vs development database provisioning, and directed the agent to fix the architectural issue. Refactored `01-init-databases.sql` to strictly provision logical databases (`user_db`, `supplier_db`, `order_db`, `credit_db`) without table DDLs or seed data. Delegated table migrations and seeding to `user-service` and `supplier-service` on container startup via `prisma migrate deploy` and `seed.ts`. Preserved `order-service` and `credit-service` DDLs into their respective local service database directories for future Milestone D3 persistence. Updated architecture documentation and resolved conflict #15 in `docs/requirements/conflicts.md`.

**Usage scenario:**
Refactoring, boilerplate/config generation, and documentation improvements (allowed use). Implemented the author-approved design to align the codebase with the Database-per-Service architectural pattern and resolve dual-source-of-truth schema drift.

**Files changed / created:**
- `docker/postgres-init/01-init-databases.sql` — stripped all table DDLs, indexes, and seed inserts; kept only `CREATE DATABASE` statements for the 4 logical databases.
- `services/user-service/Dockerfile` — updated `CMD` to run `npx prisma migrate deploy` and `npx tsx src/database/seed.ts` before starting the service.
- `services/supplier-service/Dockerfile` — copied `data/csv` into container and updated `CMD` to run `npx prisma migrate deploy` and `npx tsx src/database/seed.ts` before starting the service.
- `services/order-service/src/database/schema.sql` — created; archived `orders` table DDL within the service's domain boundary.
- `services/credit-service/src/database/schema.sql` — created; archived `credit_wallets` and `credit_transactions` table DDLs within the service's domain boundary.
- `docs/requirements/conflicts.md` — recorded resolution for conflict #15.
- `docs/architecture/overview.md` — updated database initialization description and marked conflict #15 resolved.
- `docs/services/supplier-service.md` — updated data persistence documentation and marked conflict #15 resolved.
- `docs/services/user-service.md` — updated persistence section to state that migrations are run by the service.
- `scripts/test-d2-e2e.ts` — fixed `decodeJwtPayload` typo to `decodeJwtClaims`.
- `ai/usage-log.md` — this entry.

Verified:
- Created local `.env` with Ed25519 development keys.
- Executed `docker compose down -v` to reset data volume.
- Booted `postgres`, `user-service`, and `supplier-service` via `docker compose up --build -d`.
- Verified container logs: both services applied Prisma migrations and executed database seeding on boot.
- Verified PostgreSQL: `user_db` has 3 seeded users, `supplier_db` has 21 seeded suppliers, `order_db` and `credit_db` have zero relations.
- Executed `npm run test:d2`: 40/44 tests passed (all registration, authentication, token claims, user profile immutability, supplier querying, and cross-service RBAC passed).

## 2026-09-24 12:30 SGT — Fold the linked-issue check into the Claude PR review

**Tool:** Claude Code (model: Claude Fable 5.1)
**Author:** Reallyeasy1
**Branch:** ci/claude-review-linked-issues

**Prompt (summarised):** Diagnose why the `Claude PR review` run on PR #86 failed, then remove the `PR links an issue` CI check and make the Claude review find the GitHub issues related to each PR instead.

**Usage scenario:** CI configuration (allowed use). The failed run was an authentication failure: the `CLAUDE_CODE_OAUTH_TOKEN` secret held an invalid token (the action hides the error text; the signature is `is_error: true`, one turn, zero cost). The author regenerated the token with `claude setup-token`, it was verified locally against `--model best`, the secret was updated, and the rerun reviewed PR #86 successfully. The two earlier "successful" runs had never executed Claude: the action skips PRs that change the workflow file. Then, on the author's instruction, deleted the hard-failing linked-issue workflow and added a Linked-issues step to the review prompt; the review reports and suggests `Closes #<n>` lines but never edits the PR body or fails the PR.

**Files changed:**
- `.github/workflows/pr-linked-issue.yml` — deleted.
- `.github/workflows/claude-pr-review.yml` — Linked-issues section in the prompt, `gh issue view` / `gh issue list` allowed, summary comment must include the section; disclosure header appended.
- `CLAUDE.md` — section 6 linked-issue rule now describes the Claude review check instead of the deleted workflow; disclosure header appended.
- `ai/usage-log.md` — this entry.

## 2026-09-26 14:05 SGT — PR #89 review follow-up: refresh-and-retry on 401 in both apps

**Tool:** Claude Code (model: Claude Fable 5.1)
**Author:** Reallyeasy1
**Branch:** admin_dashboard (PR #89, jagdeepsh's branch)

**Prompt (summarised):** Attend to the code review on PR #89, then merge it.

**Usage scenario:** Implementation code on a teammate's branch, on Reallyeasy1's instruction. The automated review's one finding (Low, `apps/student-app/src/App.tsx:273`): the session restore ran only on mount, so a tab open longer than the 15-minute access-token lifetime lost every authenticated call until a reload; same gap in the admin portal. Verified the contract first in `services/user-service/src/auth/auth-routes.ts` (refresh returns `{ accessToken, accessTokenExpiresInSeconds }` and rotates the cookie) before changing the clients. Fix, identical in both apps: a `refreshAccessToken()` helper with one shared in-flight promise (concurrent 401s cannot race the refresh-token rotation, and the React StrictMode double mount now issues one refresh instead of two), and an `authFetch()` wrapper that attaches the bearer token, refreshes once and retries on 401, and logs out if the refresh also fails. Every `/api/users/*` and admin supplier write goes through it; `getAuthHeaders` deleted. The public `GET /api/suppliers` reads are untouched. Merged `origin/main` (post PR #90) into the branch first, no conflicts; that also drops the old `pr-linked-issue.yml` whose stale failing run was on the previous head. PR body gained a Linked issues section with `Refs #3` rather than `Closes #3`, because #3 stays open for the F1.2.5 gap per the author's 2026-09-23 status comment.

**Files changed:**
- `apps/student-app/src/App.tsx` — `refreshAccessToken`, `authFetch`; `fetchProfile` and `handleUpdateProfile` use it; `getAuthHeaders` removed; `useRef` import; disclosure header.
- `apps/admin-portal/src/App.tsx` — same helpers; `fetchUsers`, supplier create/update/delete/toggle and `toggleUserStatus` use `authFetch`; `getAuthHeaders` removed; `useRef` import; disclosure header.
- `ai/usage-log.md` — this entry.

Verified: `npm run typecheck` passes for `@campus-errand/student-app` and `@campus-errand/admin-portal` in a scratch worktree with a fresh `npm ci`. Not run: a live browser test of the expiry path (the Docker stack is not up on this machine), so the 401 → refresh → retry branch is verified by reading, not by execution.

Follow-up (same prompt): the review run on 744a5dd raised one Low finding, confirmed against `auth-module.ts` (a replayed refresh token is rejected without revoking the session, but `logout` revokes whatever cookie arrives): calling `handleLogout()` from the failed-refresh path could revoke another tab's freshly rotated session. Fixed in both apps by extracting `clearLocalSession()` from the logout handler's cleanup and calling that from `authFetch` instead of the server logout. Typecheck re-run, passes in both apps.

## 2026-09-28 20:30 SGT — Stateless session state with symmetric token encoding & NGINX gateway offloading

**Tool:** Google Antigravity Agent
**Author:** yanhwee
**Branch:** main

**Prompt (summarised):**
Transition authentication in User Service and the API gateway to use NGINX gateway authentication offloading (`auth_request`) with symmetric session encoding (`SESSION_SECRET`). Set up stateless session cookies on `Path=/`, add a `GET /api/auth/verify` endpoint in User Service, propagate authenticated user identity headers (`X-User-Id`, `X-User-Role`, `X-User-Email`) downstream from NGINX, and ensure `@campus-errand/auth` can accept gateway-forwarded headers while preserving direct token verification for local integration tests.

**Usage scenario:** Architecture refactoring and security simplification (allowed use). The author chose symmetric HMAC-SHA256 (`SESSION_SECRET`) for single auth-service simplicity, eliminating the need to generate asymmetric Ed25519 keypairs for local docker runs, while offloading auth checks to NGINX via `auth_request`.

**Files changed:**
- `packages/auth/src/index.ts` — Updated `authMiddleware` to check for gateway offloaded headers (`X-User-Id`, `X-User-Role`), populate `res.locals.auth` without redundant crypto verification, and support symmetric HMAC-SHA256 (`HS256`) along with asymmetric EdDSA (`options.secretKey ?? process.env.SESSION_SECRET`). Also added cookie extraction for `session` cookie.
- `services/user-service/src/config.ts` — Added `sessionSecret` resolution with fallback cascade (`SESSION_SECRET` -> `JWT_SECRET` -> `JWT_PRIVATE_KEY` -> default dev secret); made asymmetric Ed25519 keys optional.
- `services/user-service/src/auth/tokens.ts` — Added symmetric HMAC-SHA256 (`HS256`) token generation and verification method (`verifyToken`), maintaining RFC 7519 standard claims (`sub`, `sid`, `role`, `email`, `iat`, `exp`, `iss`, `aud`).
- `services/user-service/src/auth/auth-module.ts` — Added `verify(token)` method to `AuthModule` interface and included `email` claim when issuing access tokens.
- `services/user-service/src/auth/auth-routes.ts` — Added `GET /api/auth/verify` endpoint for NGINX `auth_request` subrequests (setting `X-Auth-User-Id`, `X-Auth-User-Role`, `X-Auth-User-Email` response headers), set `session` cookie on `Path=/` (15m TTL) on login and refresh, and cleared `session` cookie on logout.
- `services/user-service/src/users/user-routes.ts` — Restored `GET /api/users/:id` returning 501 Not Implemented placeholder.
- `services/user-service/src/index.ts` — Passed `sessionSecret` into `createTokenManager` and `authMiddleware`.
- `services/supplier-service/src/backend/server.ts` — Passed `process.env.SESSION_SECRET` to `authMiddleware`.
- `gateway/nginx.conf` — Added `/internal/auth/verify` location with `internal; proxy_pass http://user_service_upstream/api/auth/verify;` and configured `auth_request` on protected routes (`/api/users/`, `/api/orders/`, `/api/credits/`), setting `X-User-Id`, `X-User-Role`, `X-User-Email` headers downstream.
- `docker-compose.yml` & `.env.example` — Added default `SESSION_SECRET` and removed blocking missing-key validation so containers start out-of-the-box.
- `scripts/test-d2-e2e.ts` — Added `SESSION_SECRET` to test environment, added test assertions verifying `GET /api/auth/verify` and downstream header offloading, and updated `supplierProcess` environment.
- `docs/services/user-service.md` — Updated configuration table, API table, and session architecture documentation.
- `ai/usage-log.md` — Appended this implementation log entry.

**Verification:**
- Executed `npm run typecheck`: Passed across all 9 workspaces with zero errors.
- Executed `npm run test:d2`: 50/50 tests passed (100% pass rate across all 6 scenarios).

## 2026-09-28 20:45 SGT — Full purge of legacy asymmetric Ed25519 authentication

**Tool:** Google Antigravity Agent
**Author:** yanhwee
**Branch:** main

**Prompt (summarised):**
Perform a full purge of the old asymmetric Ed25519 authentication mechanism across the repository: remove `scripts/generate-jwt-keys.mjs` and its npm script, eliminate Ed25519 key reading and verification logic from `@campus-errand/auth` and `user-service`, remove `JWT_PRIVATE_KEY` / `JWT_PUBLIC_KEY` references from configuration files and documentation, and align all services strictly around symmetric `SESSION_SECRET` and NGINX gateway authentication offloading.

**Usage scenario:** Codebase simplification and dead code removal (allowed use). The author approved completely removing the legacy asymmetric signing pathways in favor of the single symmetric session secret architecture.

**Files changed / removed:**
- `scripts/generate-jwt-keys.mjs` — Deleted obsolete key generation script.
- `package.json` — Removed `generate:jwt-keys` npm script.
- `packages/auth/src/index.ts` — Purged Ed25519 public key parsing, asymmetric verification imports (`createPublicKey`, `verify`), and simplified `authMiddleware` to symmetric HMAC-SHA256 (`HS256`) and gateway header verification.
- `services/user-service/src/config.ts` — Removed `JWT_PRIVATE_KEY` and `JWT_PUBLIC_KEY` configuration variables and helper functions.
- `services/user-service/src/auth/tokens.ts` — Purged Ed25519 signing (`sign`) and verification; simplified `TokenManager` to pure symmetric `HS256` token issuance.
- `services/user-service/src/index.ts` — Removed asymmetric key wiring to `createTokenManager` and `authMiddleware`.
- `services/user-service/.env.example` — Replaced `JWT_PRIVATE_KEY` / `JWT_PUBLIC_KEY` with `SESSION_SECRET`.
- `services/supplier-service/src/backend/server.ts` — Removed `JWT_PUBLIC_KEY` parameter from `authMiddleware`.
- `docker-compose.yml` & `.env.example` & `.env` — Removed `JWT_PRIVATE_KEY` and `JWT_PUBLIC_KEY` environment definitions.
- `scripts/test-d2-e2e.ts` — Removed `generateKeyPairSync('ed25519')` and asymmetric key passing in test environment.
- `docs/services/supplier-service.md`, `docs/services/user-service.md`, `services/user-service/docs/auth-setup.md`, `services/user-service/docs/authentication-for-services.md` — Updated documentation to remove all references to Ed25519 keys and reflect the pure symmetric session secret architecture.
- `CLAUDE.md` & `.claude/agents/infrastructure.md` — Updated team guide and infrastructure agent instructions.
- `ai/usage-log.md` — Appended this purge log entry.

**Verification:**
- Executed `npm run typecheck`: Passed across all 9 workspaces with zero errors.
- Executed `npm run test:d2`: 50/50 tests passed (100% pass rate).
- Verified zero remaining references to asymmetric keys in active code via `git grep`.

## 2026-09-28 21:30 SGT — Transition to True Single Stateless Session Cookie Architecture

**Tool:** Google Antigravity Agent
**Author:** yanhwee
**Branch:** main

**Prompt (summarised):**
Transition authentication from the dual-token hybrid model (`session` 15-min cookie + `refresh_token` cookie backed by database `sessions` table) to a true single stateless session cookie (`session`), eliminating the `refresh_token` cookie and stopping writes/queries to the PostgreSQL `sessions` table. Set default session TTL to 24 hours (`1d`, configurable via `SESSION_TTL`), supporting 30 days for persistent logins.

**Usage scenario:** Authentication architecture simplification and stateless refactoring (allowed use). The author approved eliminating database-backed refresh tokens in favor of a single stateless session cookie validated via the NGINX gateway.

**Files changed:**
- `services/user-service/src/config.ts` — Updated default session TTL from 15m to 24 hours (`1d`) via `SESSION_TTL` / `JWT_ACCESS_TOKEN_TTL`.
- `services/user-service/src/auth/tokens.ts` — Updated `issueAccessToken` to accept an optional `lifetimeSeconds` parameter.
- `services/user-service/src/auth/auth-module.ts` — Refactored `login()`, `refresh()`, and `logout()` to be 100% stateless; eliminated calls to `createSession()`, `rotateSession()`, and `revokeSession()`; session validity is verified in-memory.
- `services/user-service/src/persistence/auth-repository.ts` — Added `findById(id)` method for stateless user active-status verification.
- `services/user-service/src/auth/auth-routes.ts` — Updated `/login` and `/refresh` routes to issue only the `session` cookie (`Path=/; HttpOnly; SameSite=Lax; Max-Age=86400`) and clear legacy `refresh_token` cookies.
- `docker-compose.yml`, `.env`, `.env.example` — Added `SESSION_TTL=1d` and updated defaults.
- `PR.md` — Updated pull request description and changelog.
- `ai/usage-log.md` — Appended this implementation log entry.

**Verification:**
- Executed `npm run typecheck`: Passed across all 9 workspaces with zero errors.
- Executed `npm run test:d2`: 50/50 tests passed (100% pass rate across all 6 scenarios).
- Rebuilt Docker container `campuserrand-user-service` and tested live login, gateway authentication, session refresh, and logout via `curl`.
- Verified that database `sessions` table row count remained unchanged (0 writes) during logins.

## 2026-09-28 22:00 SGT — Adopt 'jose' in @campus-errand/auth

**Tool:** Google Antigravity Agent
**Author:** yanhwee
**Branch:** feat/stateless-single-session-cookie

**Prompt (summarised):**
Replace the hand-rolled crypto and JWT decoding functions in `packages/auth/src/index.ts` with the industry-standard `jose` library (`jwtVerify`), ensuring constant-time cryptographic verification and standards-compliant claim validation while maintaining NGINX gateway header offloading.

**Usage scenario:** Library adoption and cryptographic reliability improvement (allowed use). The author approved adopting `jose` to replace custom crypto code.

**Files changed:**
- `packages/auth/package.json` — Added `jose` dependency (`^6.2.12`).
- `package-lock.json` — Updated package lock.
## 2026-09-28 22:30 SGT — Security Hardening and PR Review Findings Remediation

**Tool:** Google Antigravity Agent
**Author:** yanhwee
**Branch:** feat/stateless-single-session-cookie

**Prompt (summarised):**
Address code review feedback from Claude PR review bot on PR #95:
1. Critical: Prevent gateway header spoofing by injecting internal gateway key (`X-Gateway-Key`) on verified routes and stripping identity headers on unauthenticated routes (`/api/suppliers`, `/api/auth`, `/`, `/admin/`, `/ws/`). Update `authMiddleware` to only trust forwarded identity headers if verified with the internal gateway key.
2. High: Guard `SESSION_SECRET` in `docker-compose.yml` with `:?Set SESSION_SECRET in .env` and enforce a minimum 32-character secret in production in `user-service/src/config.ts`.
3. Medium: Preserve 30-day session lifetime across token refreshes by tracking `persistent: true` on claims when `keepLoggedIn: true` is requested.
4. Low: Reject deactivated and deleted users on token refresh and at `/internal/auth/verify`.
5. Low: Use `crypto.timingSafeEqual` in `tokens.ts` for constant-time HMAC comparison.
6. Low: Strictly assert `adminList.status === 200` in `test-d2-e2e.ts` and add tests asserting spoofed headers without gateway key return 401.

**Usage scenario:** Security hardening, bug fixing, and test refinement based on peer code review.

**Files changed:**
- `gateway/nginx.conf` — Added `X-Gateway-Key` injection on protected routes; stripped `X-Gateway-Key` and `X-User-*` on public/unauthenticated routes.
- `packages/auth/src/index.ts` — Verified `x-gateway-key` header before trusting downstream identity headers. Enforced minimum secret length in production.
- `docker-compose.yml` — Required `SESSION_SECRET` with `${SESSION_SECRET:?Set SESSION_SECRET in .env}`.
- `services/user-service/src/config.ts` — Added production length validation for `SESSION_SECRET`.
- `services/user-service/src/auth/tokens.ts` — Used `timingSafeEqual` for HMAC signature validation and added `persistent` claim tracking.
- `services/user-service/src/auth/auth-module.ts` — Preserved 30-day session lifetime on refresh for persistent sessions; rejected deactivated/deleted users on refresh; added `checkUserStatus`.
- `services/user-service/src/auth/auth-routes.ts` — Checked active user status during gateway subrequest verification (`/api/auth/verify`).
- `scripts/test-d2-e2e.ts` — Added assertions verifying spoofed headers return 401, valid gateway headers return 200, persistent sessions preserve 30-day lifetime on refresh, and admin user list returns 200 strictly.
- `ai/usage-log.md` — Appended this implementation record.

**Verification:**
- Executed `npm run typecheck`: Passed with 0 errors across 9 workspaces.
- Executed `npm run test:d2`: 51/51 tests passed.
- Tested curl requests against live NGINX gateway and microservice ports to verify spoofing rejection (401).

## 2026-09-28 22:50 SGT — Secret Hardening, Dynamic Gateway Key & Loopback Port Isolation

**Tool:** Google Antigravity Agent
**Author:** yanhwee
**Branch:** feat/stateless-single-session-cookie

**Prompt (summarised):**
Address follow-up PR review findings on PR #95:
1. Dynamic `GATEWAY_KEY`: Remove hardcoded internal gateway constant from NGINX configuration and code. Pass `GATEWAY_KEY` through Docker Compose via `gateway/nginx.conf.template` using NGINX Alpine's native `envsubst` template processor (`NGINX_ENVSUBST_FILTER=GATEWAY_KEY`).
2. Secret Enforcement: In `packages/auth` and `user-service/src/config.ts`, strictly require `SESSION_SECRET` (>= 32 chars) and `GATEWAY_KEY` (>= 16 chars) across all environments without fallback defaults.
3. Example Secrets: Clear default secret literals in `.env.example` and `services/user-service/.env.example` and provide `openssl rand` generation hints.
4. Direct Port Isolation: Bind all service and infrastructure ports (`8001`-`8005`, `5173`, `5174`, `5432`, `5672`, `15672`) to loopback interface `127.0.0.1` in `docker-compose.yml` so only the API gateway (`80:80`) is exposed externally.
5. Documentation: Update environment variable reference tables in `docs/services/user-service.md` and `docs/services/supplier-service.md` marking `SESSION_SECRET` and `GATEWAY_KEY` as required.

**Files changed:**
- `gateway/nginx.conf.template` — Added template substituting `${GATEWAY_KEY}` into NGINX proxy headers.
- `docker-compose.yml` — Configured `GATEWAY_KEY` env and template mount for `api-gateway`; bound internal ports to `127.0.0.1`; passed `GATEWAY_KEY` to `user-service` and `supplier-service`.
- `packages/auth/src/index.ts` — Removed string defaults for `SESSION_SECRET` and `GATEWAY_KEY`; enforced non-empty validation.
- `services/user-service/src/config.ts` — Removed default fallback for `SESSION_SECRET` and added required `readGatewayKey`.
- `services/user-service/src/index.ts` — Passed `gatewayKey` to `authMiddleware`.
- `services/supplier-service/src/backend/server.ts` — Passed `gatewayKey` to `authMiddleware`.
- `.env.example` & `services/user-service/.env.example` — Blanked secrets with `openssl rand` generation instructions.
- `scripts/test-d2-e2e.ts` — Injected dynamic `GATEWAY_KEY` into test environment and offloaded header assertions.
- `docs/services/user-service.md` & `docs/services/supplier-service.md` — Updated configuration tables.

## 2026-09-28 — PR #95 Review Polish: Remove dead nginx.conf, repoint configs to template, X-Session-Id propagation, and doc alignment

**Tool:** Google Antigravity Agent (model: gemini-3-pro)
**Author:** yanhwee

**Prompt (summarised):** Address final automated PR review finding and documentation drift on PR #95:
1. Dead File Cleanup: Remove stale `gateway/nginx.conf` (which contained hardcoded keys) now that Compose mounts `gateway/nginx.conf.template`.
2. Repoint References: Update all pointers in `CLAUDE.md`, `.claude/agents/*.md`, and `docs/` to reference `gateway/nginx.conf.template` and note `envsubst` rendering.
3. Propagate `X-Session-Id`: In `user-service/src/auth/auth-routes.ts`, set `X-Auth-Session-Id` header from `principal.sessionId` on `/verify`. In `gateway/nginx.conf.template`, capture `auth_request_set $auth_session_id $upstream_http_x_auth_session_id` and pass `proxy_set_header X-Session-Id $auth_session_id` on protected routes, while explicitly stripping `X-Session-Id ""` on public routes.
4. Docs & Example Alignment: Update `services/user-service/.env.example` TTL defaults and add character guidance for keys (avoiding `"`, `\`, `$`). Resolve row 8 in `docs/requirements/conflicts.md` and clean up stale Ed25519 references in `README.md`, `docs/architecture/overview.md`, `.claude/agents/backend.md`, and `docs/services/user-service.md`.

**Files changed:**
- `gateway/nginx.conf` — Deleted stale file.
- `gateway/nginx.conf.template` — Added `X-Session-Id` forwarding on protected routes and stripping on public routes.
- `services/user-service/src/auth/auth-routes.ts` — Injected `X-Auth-Session-Id` header on `/api/auth/verify`.
- `services/user-service/.env.example` & `.env.example` — Added key character guidance; aligned `SESSION_TTL=1d`.
- `CLAUDE.md` & `.claude/agents/{infrastructure,frontend,reviewer,backend}.md` — Repointed config paths to `gateway/nginx.conf.template` and updated backend facts.
- `README.md`, `docs/architecture/overview.md`, `docs/onboarding-guide-sep-3.md`, `docs/services/user-service.md`, `docs/requirements/conflicts.md` — Updated documentation, resolved conflict row 8, and replaced stale Ed25519 references.
- `ai/usage-log.md` — Appended this implementation log.

**Verification:**
- `npm run typecheck`: Passed with 0 errors across 9 workspaces.
- `npm run test:d2`: Passed 51/51 tests.
- Rebuilt and restarted `user-service` and `api-gateway` in Docker. Verified `curl` login, session cookie verification (`200 OK`), and spoofed header rejection (`401 Unauthorized`).

## 2026-09-28 — PR #95 Review Hardening: Constant-time gateway key comparison and gateway 401 JSON error responses

**Tool:** Google Antigravity Agent (model: gemini-3-pro)
**Author:** yanhwee

**Prompt (summarised):** Address two review findings on PR #95:
1. Constant-time Gateway Key Comparison: In `packages/auth/src/index.ts`, replace `===` check for `x-gateway-key` with `crypto.timingSafeEqual` over buffers to prevent timing side-channel attacks against the internal identity-header bypass.
2. Gateway JSON 401 Error Page: In `gateway/nginx.conf.template`, configure `error_page 401 = @auth_failed` mapping to a named location that returns `Content-Type: application/json` with `{ success: false, error: "Authentication is required", code: "MISSING_TOKEN" }`. This prevents NGINX from returning default HTML 401 pages when `auth_request` fails, ensuring frontend `res.json()` callers do not encounter JSON parse errors.

**Files changed:**
- `packages/auth/src/index.ts` — Implemented `isGatewayRequest` using `Buffer.from` and `timingSafeEqual`.
- `gateway/nginx.conf.template` — Added `error_page 401 = @auth_failed;` and `@auth_failed` named location.
- `ai/usage-log.md` — Appended this implementation log.

**Verification:**
- `npm run typecheck`: Passed with 0 errors across 9 workspaces.
- `npm run test:d2`: Passed 51/51 tests.
- Rebuilt containers and verified via curl: unauthenticated requests to `/api/users/me` receive clean JSON 401 responses, and invalid login attempts properly pass upstream 401 error payloads (`INVALID_CREDENTIALS`).

## 2026-09-29 — PR #95 Review Hardening: Align token precedence to prefer Bearer header over session cookie

**Tool:** Google Antigravity Agent (model: gemini-3-pro)
**Author:** yanhwee

**Prompt (summarised):** Address review finding on PR #95 regarding credential precedence:
1. Unified Credential Precedence: In `services/user-service/src/auth/auth-routes.ts`, update `/verify`, `/refresh`, and `/logout` to inspect `readBearerToken(req.header('authorization'))` before falling back to `readCookie(req, SESSION_COOKIE_NAME)`. This matches the shared middleware precedence in `packages/auth/src/index.ts`.
2. Multi-App / Multi-Tab Session Isolation: Resolves credential collision when both `admin-portal` and `student-app` are active on the same origin (`http://localhost`), ensuring explicit client-sent Bearer tokens take precedence over ambient cookies.

**Files changed:**
- `services/user-service/src/auth/auth-routes.ts` — Updated `/verify`, `/refresh`, and `/logout` to prioritize Bearer token before cookie.
- `ai/usage-log.md` — Appended this implementation log.

**Verification:**
- `npm run typecheck`: Passed with 0 errors across 9 workspaces.
- `npm run test:d2`: Passed 51/51 tests.
- Verified in Docker via curl: when sending a request with an `admin` Bearer token and an `alice` (student) cookie simultaneously, `/api/users` correctly recognizes the admin identity (`200 OK`) and does not demote to student (`403 Forbidden`).

## 2026-09-29 — Implement Dual Persona Cookies (student_session / admin_session) and Gateway-Level Role Enforcement

**Tool:** Google Antigravity Agent (model: gemini-3-pro)
**Author:** yanhwee
**Branch:** feat/dual-cookie-gateway-rbac

**Prompt (summarised):** Implement clean dual named cookies (`student_session` and `admin_session`), gateway-level coarse-grained role enforcement, and completely independent persona logouts:
1. Dual Persona Cookies & Code Simplification:
   - On login, set `student_session` for students and `admin_session` for administrators. Removed all legacy `session` and `refresh_token` cookie backwards-compatibility cruft for maximal code simplicity.
   - In `/refresh`, support optional `?role=STUDENT` and `?role=ADMIN` query parameters to target the correct persona session cookie.
2. Completely Isolated Persona Logouts:
   - In `apps/student-app/src/App.tsx`, logout calls `POST /api/auth/logout?role=STUDENT`.
   - In `apps/admin-portal/src/App.tsx`, logout calls `POST /api/auth/logout?role=ADMIN`.
   - In `user-service` `/logout`, only the cookie matching the requesting persona is revoked and cleared. A student logging out leaves the admin session untouched in other tabs, and an admin logging out leaves the student session untouched.
3. Gateway-Level Coarse-Grained Role Enforcement:
   - In `gateway/nginx.conf.template`, configure `/internal/auth/verify-admin` subrequest passing `?role=ADMIN` and `/internal/auth/verify-student` passing `?role=STUDENT`.
   - Protect admin user directory (`/api/users`) using `auth_request /internal/auth/verify-admin`.
   - Add `error_page 403 = @auth_forbidden` returning standard JSON error (`{"success":false,"error":"Administrator access required","code":"ADMIN_REQUIRED"}`).
4. Automated Test Suite Expansion:
   - Added automated tests to `scripts/test-d2-e2e.ts` verifying dual cookie issuance, role-constrained verification endpoints, 403 rejection for mismatched roles, and independent persona logouts.

**Files changed:**
- `gateway/nginx.conf.template` — Added `/internal/auth/verify-admin`, `/internal/auth/verify-student`, `error_page 403` JSON handler, and protected `/api/users` with admin verification.
- `services/user-service/src/auth/auth-routes.ts` — Implemented `student_session` and `admin_session` cookies, `?role=` query parameter role checking on `/verify`, targeted refresh, and isolated role logouts.
- `apps/student-app/src/App.tsx` — Targeted `/api/auth/refresh?role=STUDENT` and `/api/auth/logout?role=STUDENT`.
- `apps/admin-portal/src/App.tsx` — Targeted `/api/auth/refresh?role=ADMIN` and `/api/auth/logout?role=ADMIN`.
- `scripts/test-d2-e2e.ts` — Added automated tests for dual-cookie verification, role gating, and isolated persona logouts.
- `ai/usage-log.md` — Appended this implementation record.

**Verification:**
- `npm run typecheck`: Passed with 0 errors across 9 workspaces.
- `npm run test:d2`: Passed 62/62 tests (100%).
- Rebuilt Docker containers and verified live behavior via `curl`:
  - Student login issues `student_session` cookie.
  - Admin login issues `admin_session` cookie.
  - Student requesting `/api/users` is rejected with `403 Forbidden` (`ADMIN_REQUIRED`) directly at the NGINX gateway.
  - Admin requesting `/api/users` succeeds with `200 OK`.
  - Both cookies coexist without collision on `http://localhost`.
  - Student logout clears only `student_session` and preserves `admin_session`.
  - Admin logout clears only `admin_session` and preserves `student_session`.

## 2026-09-29 — Adopt Security Perimeter Architecture: Remove Bearer Tokens, Strip Gateway Key Cruft, and Streamline Downstream Microservices

**Tool:** Google Antigravity Agent (model: gemini-3-pro)
**Author:** yanhwee
**Branch:** feat/dual-cookie-gateway-rbac

**Prompt (summarised):** Transition the architecture completely to the security perimeter model:
1. Remove all `Authorization: Bearer <token>` handling across frontend clients and backend services; rely entirely on HTTP-only session cookies (`student_session` / `admin_session`) at the gateway ingress.
2. Eliminate `X-Gateway-Key` and `GATEWAY_KEY` configuration across all downstream services, NGINX templates, and Docker Compose definitions. The NGINX API Gateway forms the trusted outer perimeter, stripping any client-supplied `X-User-*` headers at ingress and injecting authentic identity headers downstream upon successful verification.
3. Remove downstream direct JWT fallback verification logic. Downstream services (`supplier-service`, etc.) act as plain internal REST services reading trusted headers (`X-User-Id`, `X-User-Role`) populated by the perimeter middleware.
4. Support public and mixed-access endpoints (`/api/suppliers`) via optional gateway authentication (`/internal/auth/verify-optional`), passing through unauthenticated requests while injecting identity headers when valid session cookies are present.
5. Modernize the end-to-end integration test runner (`scripts/test-d2-e2e.ts`) to verify downstream internal microservice contracts directly using perimeter-injected headers.

**Files changed:**
- `packages/auth/src/index.ts` — Completely removed `jose`, crypto utilities, cookie parsers, and Bearer token decoders. Streamlined to lightweight middleware (~50 lines) reading `req.header('x-user-id')` and `req.header('x-user-role')`.
- `services/supplier-service/src/backend/server.ts` — Updated `authMiddleware()` to zero-argument call; eliminated cryptographic and JWT configuration dependencies.
- `services/user-service/src/index.ts` — Updated `authMiddleware()` for user profile and internal routes.
- `services/user-service/src/config.ts` — Removed `gatewayKey` and `readGatewayKey()`.
- `services/user-service/src/auth/auth-routes.ts` — Removed `readBearerToken()`. Added support for `GET /api/auth/verify?optional=true` returning 200 OK with unauthenticated status for public routes.
- `gateway/nginx.conf.template` — Added `/internal/auth/verify-optional` subrequest handler. Routed `/api/suppliers` through `auth_request /internal/auth/verify-optional`. Stripped client `X-User-*` headers at ingress across all routes. Removed all `X-Gateway-Key` and `Authorization` forwarding headers.
- `docker-compose.yml` — Removed `GATEWAY_KEY` from `api-gateway`, `user-service`, and `supplier-service`. Removed unnecessary JWT environment variables from `supplier-service`.
- `apps/student-app/src/App.tsx` — Purged `authToken` state and Bearer token headers; authenticated requests rely exclusively on HTTP-only cookies.
- `apps/admin-portal/src/App.tsx` — Purged `authToken` state and Bearer token headers; authenticated requests rely exclusively on HTTP-only cookies.
- `scripts/test-d2-e2e.ts` — Updated E2E scenarios to test downstream services via perimeter identity headers directly and verify optional gateway auth.
- `ai/usage-log.md` — Appended this implementation record.

**Verification:**
- `npm run typecheck`: Passed with 0 errors across 9 workspaces.
- `npm run test:d2`: Passed 62/62 tests (100%).
- Rebuilt Docker containers (`api-gateway`, `user-service`, `supplier-service`, `student-app`, `admin-portal`) and verified live behavior via `curl`:
  - `GET /api/suppliers` succeeds for unauthenticated public clients (200 OK, 21 locations returned).
  - `POST /api/suppliers` rejected without credentials (401 `MISSING_TOKEN`).
  - `POST /api/suppliers` with `student_session` cookie rejected (403 `ADMIN_REQUIRED`).
  - `POST /api/suppliers` with `admin_session` cookie succeeds (201 Created).
  - Admin access to `/api/users` succeeds (200 OK) with `admin_session`.
  - Student access to `/api/users` rejected (403 `ADMIN_REQUIRED`) with `student_session`.

## 2026-09-29 — Enforce Gateway-Level Method-Based RBAC and Remove `?optional=true`

**Tool:** Google Antigravity Agent (model: gemini-3-pro)
**Author:** yanhwee
**Branch:** feat/dual-cookie-gateway-rbac

**Prompt (summarised):** Centralize all access control and role gating at NGINX for mixed-permission endpoints (`/api/suppliers`):
1. In NGINX, distinguish read operations (`GET`, `HEAD`, `OPTIONS`) from write operations (`POST`, `PUT`, `PATCH`, `DELETE`) using `error_page 418 = @supplier_write`.
2. Public reads bypass authentication completely with zero subrequest overhead.
3. Write operations trigger `auth_request /internal/auth/verify-admin`, blocking unauthorized guests (401) and students (403) directly at the gateway ingress.
4. Eliminate `?optional=true` and `/internal/auth/verify-optional` from both `user-service` and NGINX configuration.
5. Enable `recursive_error_pages on;` in NGINX so internal redirects properly render JSON auth failure error pages (`@auth_failed`, `@auth_forbidden`).

**Files changed:**
- `gateway/nginx.conf.template` — Added `recursive_error_pages on;`, removed `/internal/auth/verify-optional`, routed `location /api/suppliers` writes via `error_page 418 = @supplier_write` with `auth_request /internal/auth/verify-admin`.
- `services/user-service/src/auth/auth-routes.ts` — Removed `isOptional` handling from `GET /verify`.
- `scripts/test-d2-e2e.ts` — Removed optional verify test assertion; verified 61/61 tests pass.
- `ai/usage-log.md` — Appended this implementation record.

**Verification:**
- `npm run typecheck`: Passed with 0 errors across 9 workspaces.
- `npm run test:d2`: Passed 61/61 tests (100%).
- Verified live behavior via `curl`:
  - `GET /api/suppliers` (guest) $\rightarrow$ 200 OK (public read).
  - `POST /api/suppliers` (unauthenticated) $\rightarrow$ 401 `MISSING_TOKEN` JSON returned directly from NGINX.
  - `POST /api/suppliers` (student) $\rightarrow$ 403 `ADMIN_REQUIRED` JSON returned directly from NGINX without hitting `supplier-service`.
  - `DELETE /api/suppliers/:id` (student) $\rightarrow$ 403 `ADMIN_REQUIRED` JSON returned directly from NGINX.
## 2026-09-29 — Elimination of `requireAdmin`, Transition to `getSessionUser`, and Pure RESTful Microservices

**Tool:** Google Antigravity Agent (model: gemini-3-pro)
**Author:** yanhwee
**Branch:** feat/dual-cookie-gateway-rbac

**Prompt (summarised):** Eliminate `requireAdmin` and legacy auth middleware completely without backward-compatibility wrappers. Simplify downstream microservices into pure RESTful services with strongly-typed session utilities:
1. In `@campus-errand/auth` (`packages/auth/src/index.ts`):
   - Removed `requireAdmin` and `authMiddleware` middleware functions entirely.
   - Retained only lightweight, strongly-typed session extraction utilities: `SESSION_HEADERS`, `SessionUser` interface, `getSessionUser(req: Request)`, and `getSessionUserId(req: Request)`.
2. In `services/supplier-service`:
   - Removed `requireAdmin` and `adminGuard` from `supplierRoutes.ts`.
   - `createSupplierRouter()` mounts plain REST handlers with zero middleware. All role gating is enforced upstream at the NGINX API Gateway.
3. In `services/user-service`:
   - Removed `requireAuthentication` and `requireAdmin` from `index.ts`, `app.ts`, and `user-routes.ts`.
   - Admin user management routes (`/api/users`) and self-profile routes (`/me`) are unburdened by internal auth middleware. Gateway perimeter verification enforces access control before requests hit the service.
4. In `scripts/test-d2-e2e.ts`:
   - Updated Scenario 4 and Scenario 6 to validate gateway-level verification (`/api/auth/verify?role=ADMIN`) for unauthorized and non-admin requests, matching the gateway perimeter model.
   - Maintained all 61 automated tests passing (100%).

**Files changed:**
- `packages/auth/src/index.ts` — Purged `requireAdmin`, `authMiddleware`, and legacy types. Provided `SESSION_HEADERS`, `SessionUser`, `getSessionUser`, `getSessionUserId`.
- `services/supplier-service/src/backend/supplierRoutes.ts` — Removed `requireAdmin` import and `adminGuard` argument from `createSupplierRouter()`.
- `services/supplier-service/src/backend/server.ts` — Instantiates plain `createSupplierRouter()`.
- `services/user-service/src/index.ts` — Removed `@campus-errand/auth` middleware imports and parameters from `createApp()`.
- `services/user-service/src/app.ts` — Simplified `AppDependencies` and `createUserRouter` instantiation.
- `services/user-service/src/users/user-routes.ts` — Removed `router.use(requireAuthentication)` and `requireAdmin` middleware wrappers.
- `scripts/test-d2-e2e.ts` — Aligned Scenario 4 and 6 tests with gateway role verification.
- `ai/usage-log.md` — Documented architectural cleanup and test results.

**Verification:**
- `npm run typecheck`: Passed with 0 errors across 9 workspaces.
- `npm run test:d2`: Passed 61/61 tests (100%).
- Rebuilt containers (`user-service`, `supplier-service`, `api-gateway`) and verified live behavior via `curl`:
  - `GET /api/suppliers` (guest) $\rightarrow$ 200 OK.
  - `POST /api/suppliers` (guest) $\rightarrow$ 401 `MISSING_TOKEN` from NGINX.
  - `POST /api/suppliers` (student cookie) $\rightarrow$ 403 `ADMIN_REQUIRED` from NGINX.
  - `POST /api/suppliers` (admin cookie) $\rightarrow$ 201 Created from `supplier-service`.
  - `GET /api/users` (guest) $\rightarrow$ 401 `MISSING_TOKEN` from NGINX.
  - `GET /api/users` (student cookie) $\rightarrow$ 403 `ADMIN_REQUIRED` from NGINX.
  - `GET /api/users` (admin cookie) $\rightarrow$ 200 OK from `user-service`.

## 2026-09-29 — Complete Removal of `sessionId` and `email` from Tokens, Gateway Headers, and Session Context

**Tool:** Google Antigravity Agent (model: gemini-3-pro)
**Author:** yanhwee
**Branch:** feat/dual-cookie-gateway-rbac

**Prompt (summarised):** Remove both `sessionId` and `email` across the authentication system, gateway forwarding, and downstream session context:
1. In `packages/common-dtos`: Removed `sid` from `JWTPayload` (`sub`, `role`, `iat`, `exp`, `iss`, `aud`).
2. In `packages/auth`: Removed `SESSION_ID` and `USER_EMAIL` from `SESSION_HEADERS`. Simplified `SessionUser` to `{ userId: string; role: UserRole; }`. Removed `getSessionUserId` so callers exclusively use `getSessionUser`.
3. In `services/user-service`:
   - `tokens.ts`: Removed `sessionId` and `email` from `AuthenticatedPrincipal` and `TokenManager.issueAccessToken`.
   - `auth-module.ts`: Simplified `login` and `refresh` to issue tokens without `sessionId` or `email`.
   - `auth-routes.ts`: `GET /api/auth/verify` now only sets `X-Auth-User-Id` and `X-Auth-User-Role`.
4. In `gateway/nginx.conf.template`:
   - Stripped all forwarding and stripping directives for `X-User-Email` and `X-Session-Id`.
   - Gateway solely forwards and strips `X-User-Id` and `X-User-Role`.
5. In `scripts/test-d2-e2e.ts`:
   - Aligned Scenario 2 JWT claims tests to assert standard minimal claims (`sub`, `role`, `iat`, `exp`, `iss`, `aud`) without checking for `sid`.
   - All 61/61 integration tests pass (100%).

**Files changed:**
- `packages/common-dtos/src/index.ts`
- `packages/auth/src/index.ts`
- `gateway/nginx.conf.template`
- `services/user-service/src/auth/tokens.ts`
- `services/user-service/src/auth/auth-module.ts`
- `services/user-service/src/auth/auth-routes.ts`
- `scripts/test-d2-e2e.ts`
- `ai/usage-log.md`

**Verification:**
- `npm run typecheck`: Passed with 0 errors across 9 workspaces.
- `npm run test:d2`: Passed 61/61 tests (100%).
- Rebuilt containers and verified decoded JWT payload on live logins (`sub`, `role`, `iat`, `exp`, `iss`, `aud` with zero `sid` / `email` claims).
- Live Gateway RBAC verified: public 200, unauthorized 401, student 403, admin 201/200.

## 2026-09-29 — Cleanup of Dead Session Methods in `auth-repository.ts`

**Tool:** Google Antigravity Agent (model: gemini-3-pro)
**Author:** yanhwee
**Branch:** feat/dual-cookie-gateway-rbac

**Prompt (summarised):** Delete dead database session code in `auth-repository.ts`.
- Removed legacy unused methods: `createSession`, `rotateSession`, `revokeSession`, `cleanupExpiredSessions`, and `deleteExpiredSessions`.
- Removed legacy unused types: `SessionUserRecord`, `CreateSessionRecord`, and `SessionWithUser`.
- `AuthRepository` now strictly defines user lookup and registration (`createUser`, `findUserByEmail`, `findById`).

**Files changed:**
- `services/user-service/src/persistence/auth-repository.ts`
- `ai/usage-log.md`

**Verification:**
- `npm run typecheck`: Passed with 0 errors across 9 workspaces.
- `npm run test:d2`: Passed 61/61 tests (100%).

## 2026-09-29 — Adopted `jose` for Standard RFC 7519 JWT Signing and Verification

**Tool:** Google Antigravity Agent (model: gemini-3-pro)
**Author:** yanhwee
**Branch:** feat/dual-cookie-gateway-rbac

**Prompt (summarised):** Adopt `jose` library for session token issuance and verification; update documentation for team on session key setup and production security.
1. Installed `jose` in `@campus-errand/user-service`.
2. Refactored `services/user-service/src/auth/tokens.ts`:
   - Eliminated custom base64url and HMAC serialization boilerplate.
   - Replaced with standard `SignJWT` and `jwtVerify` (pinned to algorithm `HS256`, standard claims `sub`, `role`, `iat`, `exp`, `iss`, `aud`).
3. Refactored `auth-module.ts` and `auth-routes.ts` to asynchronously await `issueAccessToken` and `verify`.
4. Updated documentation:
   - `services/user-service/docs/auth-setup.md`: Added instructions for generating high-entropy 256-bit secrets (`node -e` / `openssl`) and production security rules (never generating at startup; injecting via secrets vault).
   - `services/user-service/docs/authentication-for-services.md`: Updated access token claims reference and documented `getSessionUser(req)` from `@campus-errand/auth`.

**Files changed:**
- `services/user-service/package.json`
- `package-lock.json`
- `services/user-service/src/auth/tokens.ts`
- `services/user-service/src/auth/auth-module.ts`
- `services/user-service/src/auth/auth-routes.ts`
- `services/user-service/docs/auth-setup.md`
- `services/user-service/docs/authentication-for-services.md`
- `ai/usage-log.md`

**Verification:**
- `npm run typecheck`: Passed with 0 errors across 9 workspaces.
- `npm run test:d2`: Passed 61/61 tests (100%).
- Rebuilt Docker containers and verified live:
  - `POST /api/auth/login` issues valid HS256 JWT cookie via `jose`.
  - `GET /api/users/me` verified by NGINX gateway subrequest and returns authenticated profile.

## 2026-09-29 — Reorganized User Service Domain Logic & Unified Persistence

**Tool:** Google Antigravity Agent (model: gemini-3-pro)
**Author:** yanhwee
**Branch:** feat/dual-cookie-gateway-rbac

**Prompt (summarised):** Reorganize User Service to separate pure authentication from user domain logic and eliminate duplicate repositories.
1. Unified persistence in `services/user-service/src/persistence/user-repository.ts`:
   - Absorbed `createUser` and `findByEmail` (with case-insensitive index query).
   - Deleted redundant `auth-repository.ts`.
2. Moved user account lifecycle logic to `services/user-service/src/users/user-module.ts`:
   - Moved `register` (username, email, password validation, password hashing, duplicate error handling) into `UserModule`.
   - Updated `error-handler.ts` to map `DUPLICATE_EMAIL` in `USER_ERROR_STATUS`.
3. Streamlined `services/user-service/src/auth/auth-module.ts`:
   - Focused strictly on session authentication: `login`, `refresh`, `logout`, `verify`, and `checkUserStatus`.
4. Updated wiring in `app.ts` and `index.ts`:
   - Injected single `userRepository` into both modules.
   - Connected `POST /api/auth/register` to `users.register`.

**Files changed:**
- `services/user-service/src/persistence/user-repository.ts`
- `services/user-service/src/persistence/auth-repository.ts` (deleted)
- `services/user-service/src/users/user-module.ts`
- `services/user-service/src/auth/auth-module.ts`
- `services/user-service/src/auth/auth-routes.ts`
- `services/user-service/src/auth/tokens.ts`
- `services/user-service/src/http/error-handler.ts`
- `services/user-service/src/app.ts`
- `services/user-service/src/index.ts`
- `ai/usage-log.md`

**Verification:**
- `npm run typecheck`: Passed with 0 errors across 9 workspaces.
- `npm run test:d2`: Passed 61/61 tests (100%).
- Rebuilt Docker containers and verified live:
  - `POST /api/auth/register` successfully creates account and returns 201 with UserDTO.
  - `POST /api/auth/login` authenticates newly created account and issues JWT cookie.

## 2026-09-29 — Purge of Dead Code Across User Service

**Tool:** Google Antigravity Agent (model: gemini-3-pro)
**Author:** yanhwee
**Branch:** feat/dual-cookie-gateway-rbac

**Prompt (summarised):** Clean up all dead code across `user-service`.
1. Purged dead refresh token generator and hash methods (`generateRefreshToken`, `hashRefreshToken`) and removed unused `node:crypto` imports in `tokens.ts`.
2. Removed unused `cookieOptions(path: '/api/auth')` function from `auth-routes.ts`.
3. Removed unused `refreshTokenIdleLifetimeSeconds` configuration and option from `config.ts`, `index.ts`, and `auth-module.ts`.
4. Removed dead `notImplemented` handler in `user-routes.ts`.
5. Cleaned up obsolete session-table join in `database.ts` database readiness check (`SELECT 1 FROM users LIMIT 1`).

**Files changed:**
- `services/user-service/src/auth/tokens.ts`
- `services/user-service/src/auth/auth-routes.ts`
- `services/user-service/src/auth/auth-module.ts`
- `services/user-service/src/config.ts`
- `services/user-service/src/index.ts`
- `services/user-service/src/users/user-routes.ts`
- `services/user-service/src/persistence/database.ts`
- `ai/usage-log.md`

**Verification:**
- `npm run typecheck`: Passed with 0 errors across 9 workspaces.
- `npm run test:d2`: Passed 61/61 tests (100%).
- Rebuilt Docker containers and verified live:
  - System healthy and login functional.





## 2026-09-28 — Postman API test collection for user-service and supplier-service

**Tool:** Claude Code (model: Claude Sonnet 5)
**Author:** jagdeepsh
**Branch:** admin_dashboard

**Prompt (summarised):** Author wants to test every user-service and supplier-service API endpoint through Postman, with proper authentication/authorization checks, independent of the app UIs — true-positive and true-negative cases for correct vs wrong authorization, hitting the two services' published ports directly (no gateway). Must-have cases: login/logout as both admin and a regular user, admin deactivate/reactivate a user with the true-negative (student attempting the same, expecting an access-denied error code), the same for a supplier, plus the rest of each service's CRUD. Stateless approach requested since there's no test DB yet: any test involving editing/deleting a specific record must first create that record itself (register a throwaway test user; as admin, create a throwaway test supplier), then operate on and finally delete/deactivate what it created, rather than touching real seeded rows. This is the author's own test-architecture and design decision (allowed use: I investigated the actual route/auth/error-code behavior and implemented the design given, I did not choose the test strategy).

**Investigation performed first (read-only, via an Explore subagent):** catalogued every route in both services by reading `auth-routes.ts`/`auth-module.ts`/`user-routes.ts`/`user-module.ts`, the shared `@campus-errand/auth` middleware (exact 401 vs 403 codes: `MISSING_TOKEN`/`TOKEN_EXPIRED`/`INVALID_TOKEN` vs `ADMIN_REQUIRED`), `supplierRoutes.ts`, and `common-dtos` for the request/response shapes — confirmed live-code facts the author asked me to verify: `POST /api/auth/register` hardcodes `role: 'STUDENT'` server-side regardless of request body (cannot self-register as ADMIN); both services publish their ports directly in `docker-compose.yml` (8001/8002) so Postman can bypass the gateway entirely, confirming the author's own instinct; user-service has no delete-user endpoint at all (only a status-toggle), which the author was told and explicitly decided the test user should just remain active at the end of the run rather than be deleted or deactivated as a substitute.

**Usage scenario:** Implementation/boilerplate generation of a design the author specified (allowed use) — no architecture or schema decisions made by me; the "create-then-operate-then-cleanup" stateless test strategy, folder ordering, and the "leave test user active, no cleanup" decision were the author's, given directly or via a clarifying question I asked before implementing.

**Files changed:**
- `tests/postman/postman_environment.json` (new) — base URLs for both services, seeded admin/student credentials, and empty placeholder variables (`adminAccessToken`, `studentAccessToken`, `testUserId`, `testUserAccessToken`, `testSupplierId`, `seedSupplierId`, etc.) that the collection's test scripts populate as it runs. Cannot hold a comment header (JSON) — disclosure is embedded as an `_disclosure` field instead.
- `tests/postman/postman_collection.json` (new) — 44 requests across 5 folders: (1) Setup & Auth Lifecycle — login/logout as admin and as student (alice), plus a refresh-with-no-session negative case right after the cookie is cleared by logout; (2) User Service: Registration & Login — register success plus duplicate-email/duplicate-username/weak-password/bad-email negatives, then log in as the new test user; (3) User Service: Profile & Admin Management — GET/PATCH /me, PUT /me/password, GET /api/users (list, admin-only), PATCH /:id/admin deactivate/reactivate with the student-forbidden negative, POST /:id/promote (still a 501 stub) with its own forbidden negative, plus two documented-quirk assertions (unknown UUID → 404, syntactically invalid UUID → 500 because Prisma throws before the route's own not-found handling); (4) Supplier Service: Public Reads — list/get/unknown-id, capturing a real seeded supplier id dynamically since supplier UUIDs aren't fixed; (5) Supplier Service: Admin CRUD — create/update/toggle-deactivate/toggle-reactivate/delete on a throwaway supplier the collection creates itself, each paired with a student-forbidden negative, ending with a real `DELETE ?permanent=true` cleanup (supplier-service does have a delete endpoint, unlike user-service). Every request has a `pm.test` assertion on status code and, where relevant, the response's `success`/`code`/data fields; requests that hand off a value to later requests (`adminAccessToken`, `testUserId`, `testSupplierId`, etc.) write it via `pm.environment.set(...)` in their test script. Disclosure is embedded in `info.description` (visible in the Postman GUI) since JSON can't hold a comment block.

Verified: both files parse as valid JSON (`python3 -m json.load`); folder/request counts match the approved plan (5 folders, 44 requests: 5+8+17+3+11); spot-checked a representative request's structure (method, headers, URL, body, test script) renders correctly. Not run: an actual Postman Collection Runner execution against the live stack — that's the author's next step, per their own plan ("I will run in postman GUI to test to see if it works").

## 2026-09-28 (later) — Fix 3 test-script syntax errors surfaced by the first Postman run

**Tool:** Claude Code (model: Claude Sonnet 5)
**Author:** jagdeepsh
**Branch:** admin_dashboard

**Prompt (summarised):** Author ran the collection for the first time via `postman collection run`; all 44 requests succeeded against the live services, but 3 of 44 test-scripts threw `SyntaxError: Unexpected token '{'`. Asked me to investigate and fix.

**Usage scenario:** Debugging assistance (allowed use) — root cause was my own generation mistake, not a bug in the services being tested.

**Root cause:** three assertions compared a response field against a *previously-saved* dynamic value using `{{variableName}}` mustache syntax directly inside the JavaScript test script (`pm.expect(x).to.eql({{testEmail}})`). Mustache substitution only happens in the "template" parts of a request (URL, headers, body) — Postman does not pre-process it inside test-script `exec` code, so the sandbox saw literal `{{testEmail}}`, which isn't valid JavaScript (`{` followed by `{` is a syntax error), hence the failure on all 3.

**Files changed:**
- `tests/postman/postman_collection.json` — replaced the 3 broken lines with the correct in-script way to read a saved variable, `pm.environment.get('varName')`: in "3.1 GET /me - Success", "3.3 PATCH /me - Update Username Success", and "4.2 GET /api/suppliers/:id - Success".

Verified: file re-parses as valid JSON; the fixed lines were diffed against the reported failing request names to confirm exact match (no unrelated lines touched).

## 2026-09-28 (later) — Add DELETE /api/users/:id (self-or-admin account deletion)

**Tool:** Claude Code (model: Claude Sonnet 5)
**Author:** jagdeepsh
**Branch:** admin_dashboard

**Prompt (summarised):** Add a new user-service endpoint to delete a user account, backed by the same user-service DB as every other user-service route. Authorization must allow only the ADMIN role or the specific logged-in student deleting their own account — never any authenticated student deleting someone else's. Author explicitly scoped this to user-service files plus this log only, and asked first for the file list before implementing (approved plan, then asked to proceed).

**Usage scenario:** Implementation of an author-specified design (allowed use) — the endpoint, its authorization rule, and the file scope were all given directly by the author; I investigated the existing routes → module → repository → error-handler pattern this service already uses and implemented the new endpoint the same way, and confirmed via a live read of `gateway/nginx.conf` that its `location /api/users/` block already proxies every HTTP method (including DELETE) with no change needed there.

**Files changed:**
- `services/user-service/src/persistence/user-repository.ts` — added `deleteById(userId): Promise<boolean>` (Prisma `deleteMany` + count check, same not-found-safe pattern as `updateProfile`/`updatePassword`).
- `services/user-service/src/users/user-module.ts` — added `deleteUser(targetUserId): Promise<void>`, throwing `UserError('USER_NOT_FOUND', ...)` if the row didn't exist; added the new `'FORBIDDEN'` `UserErrorCode`.
- `services/user-service/src/users/user-routes.ts` — added `DELETE /:id` behind a new local `requireSelfOrAdmin` middleware (reads `res.locals.auth`, allows through if `role === 'ADMIN'` or `auth.userId === req.params.id`, else throws `UserError('FORBIDDEN', 'You can only delete your own account')`). Deliberately kept local to this file rather than added to the shared `@campus-errand/auth` package, since "does the URL's `:id` match the caller's own id" is specific to this one route. Success response is `204 No Content`, matching this service's existing `PUT /me/password` precedent for a mutation with nothing to return.
- `services/user-service/src/http/error-handler.ts` — mapped the new `FORBIDDEN` code to HTTP 403 in `USER_ERROR_STATUS`.

Verified: `npm run typecheck` passes across all workspaces; rebuilt and restarted the `user-service` container; live-tested every path with curl — a student deleting another student's account correctly gets `403 FORBIDDEN`; a student deleting their own account gets `204` and the row plus its sessions (via the existing `ON DELETE CASCADE` FK) are actually gone from Postgres; no token gets `401 MISSING_TOKEN`; an admin can delete any account (`204`); deleting an already-deleted id correctly returns `404 USER_NOT_FOUND`; also confirmed the same self-delete flow works unchanged through the gateway on `localhost:80`, confirming `gateway/nginx.conf` genuinely needed no edit.

## 2026-09-28 (later) — Delete Account UI (student-app + admin-portal) and Postman DELETE coverage

**Tool:** Claude Code (model: Claude Sonnet 5)
**Author:** jagdeepsh
**Branch:** admin_dashboard

**Prompt (summarised):** Wire the DELETE /api/users/:id endpoint (added earlier this session) into both frontends. student-app: a red "Delete Account" button below Log Out on the Profile page, opening a confirmation popup (irreversibility warning, a required checkbox, a red confirm button that shows a loading spinner while calling the API), an inline error on failure, and a success popup whose dismissal returns to the login page. admin-portal: a trash-can delete button beside each user row's Disable/Reinstate button (both desktop and mobile), same confirmation-popup pattern but without a soft/permanent-delete toggle (user deletion is always hard), and a dismissible success popup the admin closes to keep using the dashboard. tests/postman/: extend the existing test-user lifecycle with true-positive and true-negative coverage of the new endpoint, finishing by actually deleting the test user (closing the one gap flagged when the collection was first built).

**Usage scenario:** Implementation of an author-specified design (allowed use). Investigated first via 3 parallel read-only Explore agents (one per file/area) before writing any code: confirmed student-app has no existing modal/overlay pattern (built new, matched to its existing rose-error-box/RefreshCw-spinner conventions); confirmed admin-portal already has a near-identical "Delete Supplier" modal and `Trash2` row button to mirror; confirmed the exact current state of Postman folder 3 and its test-script conventions before appending to it. All UI copy, confirmation-flow shape, and button placement were specified directly by the author; I chose only the concrete state-variable names/JSX structure needed to implement that shape, following each file's own existing conventions (e.g. reusing `authFetch`, `handleDeleteSupplier`'s local-state-filter pattern, and each file's existing icon imports where already present).

**Files changed:**
- `apps/student-app/src/App.tsx` — new state (`showDeleteAccountModal`, `deleteAccountConfirmed`, `isDeletingAccount`, `deleteAccountError`, `deleteAccountSuccess`); `handleDeleteAccount()` calling `authFetch(\`/api/users/${profile.userId}\`, { method: 'DELETE' })`; a red "Delete Account" button under Log Out; a new confirmation modal (warning, inline error box, required checkbox, spinner-while-deleting confirm button) and a new success modal whose "Return to Login" button calls the existing `clearLocalSession()`. Added `CheckCircle` to the `lucide-react` import list (the warning icon reuses the already-imported `AlertCircle`).
- `apps/admin-portal/src/App.tsx` — new state (`deletingUser`, `deleteUserConfirmed`, `isDeletingUser`, `deleteUserError`, `deletedUserSuccess`); `handleDeleteUser()` calling `authFetch(\`/api/users/${deletingUser.userId}\`, { method: 'DELETE' })`, filtering the deleted user out of local `users` state on success (no refetch, mirrors `handleDeleteSupplier`); a `Trash2` button beside Disable/Reinstate in both the desktop table row and mobile card; a confirmation modal styled identically to the existing "Delete Supplier" modal (single checkbox, no soft/permanent toggle) with an inline error box on failure; a success modal naming the deleted username, dismissed via a "Close" button. No new icon imports needed (`Trash2`/`CheckCircle` already imported).
- `tests/postman/postman_collection.json` — appended 5 requests to the end of folder 3 ("User Service: Profile & Admin Management"), continuing its existing numbering/style: 3.18 a different student (alice) is forbidden from deleting the test user (`403 FORBIDDEN`); 3.19 no token (`401 MISSING_TOKEN`); 3.20 admin deletes an unknown UUID (`404 USER_NOT_FOUND`); 3.21 the test user deletes themselves (`204`, the real cleanup); 3.22 admin retries deleting the now-gone id (`404 USER_NOT_FOUND`, confirms idempotent-not-found behavior). No new environment variables needed. Also appended an addendum to the collection's `info.description` documenting this addition (JSON can't hold a comment header).

Verified: `npm run typecheck` passes for both `@campus-errand/student-app` and `@campus-errand/admin-portal`; rebuilt and restarted both containers, confirmed healthy, and grepped each container's served source to confirm the new markup ("Delete Account" / "Delete User Account") is actually present in what's being served. `postman_collection.json` re-parses as valid JSON; folder 3's item count is now 22 (was 17), confirmed by re-reading the file after the edit. Not done: an actual in-browser click-through of either new modal, or a live Postman Collection Runner execution of the 5 new requests — no browser-automation tool was available in this session; both are the author's natural next step.

## 2026-09-28 22:51 SGT — Responsive desktop/mobile breakpoints for student-app and admin-portal

**Tool:** Claude Code (model: Claude Sonnet 5)
**Author:** jagdeepsh
**Branch:** admin_dashboard

**Prompt (summarised):** Author observed student-app always renders as a phone-card layout even on a full desktop window, while admin-portal is desktop-only. Requested: both apps render a full desktop view by default; both snap to a phone-friendly layout (same buttons/features, just rearranged) below a phone-typical breakpoint, and back to desktop above it. Explicitly scoped to reading first (plan mode) then editing only each app's `src/App.tsx`.

**Usage scenario:** Specific style writing / UI implementation of an author-specified design (allowed use). Planned in plan mode first: two read-only Explore agents surveyed both apps' current layout, then I asked the author to choose the desktop nav pattern for student-app (top nav bar vs. left sidebar — they chose top nav bar) since student-app had no desktop layout to reuse. Breakpoint choice (Tailwind's default `md`, 768px) and grid-column counts for card lists were left to me as implementation detail, matching admin-portal's own existing `md:` convention. Delegated the two independent, non-overlapping file edits to parallel `frontend` agents per the repo's agent-team rules.

**Files changed:**
- `apps/student-app/src/App.tsx` — added a `md:` (768px)-gated desktop layout alongside the existing mobile one: root wrapper releases its `max-w-md`/shadow phone-card look at `md:` in favour of a wide `md:max-w-6xl` container; a new top nav bar (`hidden md:flex`, same 5 tabs/icons/handlers as the existing bottom nav) added to the header; existing bottom nav gated `md:hidden`; feed/spots/tasks card lists become `md:grid` (2-3 columns) instead of a single stacked column at desktop width; `<main>`'s mobile-nav-clearance padding relaxes at `md:`. No business logic, state shape, or API calls changed.
- `apps/admin-portal/src/App.tsx` — fixed a pre-existing mobile-nav parity gap found during exploration: the sub-768px hamburger drawer was missing the "Audit & Disputes" item present in the desktop sidebar, making that section unreachable on mobile. Added the missing nav button, matching the drawer's existing 3 siblings' style and click-handler pattern. No other change — the app's existing desktop-by-default + `md:`-gated mobile layout (sidebar/drawer, table/card-list) already matched the target design.

Verified: `npm run typecheck` passes across all workspaces (re-run independently after both agents reported success). Not done: an in-browser visual check at the ~768px boundary and a full click-through of every tab/section at both breakpoints — no browser-automation tool was available in this session; this is the author's recommended next step before merging.

## 2026-09-28 (later) — Rename /admin to /toggle-status; implement /toggle-role (promote/demote)

**Tool:** Claude Code (model: Claude Sonnet 5)
**Author:** jagdeepsh
**Branch:** admin_dashboard

**Prompt (summarised):** Two changes to user-service, scoped to user-service files plus admin-portal's caller: (1) rename `PATCH /api/users/:id/admin` to `.../toggle-status` (same behavior, clearer name — the old name implied it touched the ADMIN role, which it never did) and update admin-portal's `toggleUserStatus()` to call the new path; (2) implement the `POST /:id/promote` endpoint (previously a permanent 501 stub), renamed `PATCH /:id/toggle-role`: admin-only, flips a target user between STUDENT and ADMIN, an admin may not target their own id, and a non-admin cannot call it at all. Also asked me to check nothing else in the repo references the old `/admin` path.

**Usage scenario:** Implementation of an author-specified design (allowed use) — the route names, the toggle semantics (promote/demote via one flip), and both authorization rules (admin-only, no self-targeting) were all given directly by the author. Investigated first: grepped the whole repo for the old `/admin` path and for `promote` — confirmed the only other references were `tests/postman/postman_collection.json` (5 requests) and `scripts/test-d2-e2e.ts` (asserts the old stub returns `501`), both explicitly out of the scope the author gave for this round; flagged both to the author as now-stale rather than silently leaving them or silently fixing them out of scope.

**Files changed:**
- `services/user-service/src/users/user-routes.ts` — renamed the route `PATCH /:id/admin` → `PATCH /:id/toggle-status` (handler unchanged). Replaced `POST /:id/promote` (the `notImplemented` 501 stub) with `PATCH /:id/toggle-role`: `requireAdmin`-gated, throws `UserError('SELF_ACTION_FORBIDDEN', ...)` if `req.params.id === authenticatedUserId(res)`, otherwise calls the new `toggleUserRole`. Removed the now-fully-dead `throwNotImplemented`/`notImplemented` helpers.
- `services/user-service/src/users/user-module.ts` — added `toggleUserRole(targetUserId)` (same shape as `toggleUserStatus`: call the repository, throw `USER_NOT_FOUND` if nothing was found). Added `SELF_ACTION_FORBIDDEN` to `UserErrorCode`; removed `NOT_IMPLEMENTED` (nothing throws it anymore).
- `services/user-service/src/persistence/user-repository.ts` — added `toggleRole(userId)`: find-then-flip-then-update, identical shape to `toggleStatus`, flipping `role` between `'ADMIN'` and `'STUDENT'` instead of `status`.
- `services/user-service/src/http/error-handler.ts` — mapped `SELF_ACTION_FORBIDDEN` to 403; removed the now-unused `NOT_IMPLEMENTED: 501` mapping.
- `apps/admin-portal/src/App.tsx` — `toggleUserStatus()` now calls `PATCH /api/users/${userId}/toggle-status` instead of `.../admin`. No other change; no new toggle-role UI was added, since the author's stated scope for the admin-portal side was specifically "call toggle status instead of admin."

Verified: `npm run typecheck` passes for both `@campus-errand/user-service` and `@campus-errand/admin-portal`; rebuilt and restarted both containers. Live-tested every case with curl: the old `/admin` and `/promote` paths both now correctly 404 (no route matches); the renamed `/toggle-status` works identically to before; `/toggle-role` — a student gets `403 ADMIN_REQUIRED` even on their own id, an admin promotes a student to ADMIN (`200`, `userRole: "ADMIN"`) and can demote them straight back (`200`, `userRole: "STUDENT"`), an admin targeting their own id gets `403 SELF_ACTION_FORBIDDEN`, and no token gets `401 MISSING_TOKEN`. Confirmed admin-portal's served container source now references `toggle-status`, not `admin`.

**Flagged to the author (not fixed, out of this round's scope):** `tests/postman/postman_collection.json` requests 3.11–3.17 and `scripts/test-d2-e2e.ts`'s two `/promote` assertions now reference dead paths / assert stale behavior and will fail if run as-is.

## 2026-09-28 (later) — Update both test suites for /toggle-status and /toggle-role

**Tool:** Claude Code (model: Claude Sonnet 5)
**Author:** jagdeepsh
**Branch:** admin_dashboard

**Prompt (summarised):** Update the Postman collection and `scripts/test-d2-e2e.ts` (asked what this script was — explained: a standalone `npm run test:d2` runner that spawns its own throwaway copies of user-service/supplier-service and fires real `fetch()` assertions at them, separate from the Postman collection, named after the course's "Milestone D2") to match the previous round's `/admin` → `/toggle-status` rename and the new `/toggle-role` endpoint, with proper edge-case coverage for all its error codes.

**Usage scenario:** Implementation of an author-specified follow-up (allowed use) — the rename target and the endpoint's authorization rules were already established in the prior round; this round is test coverage for that existing design. One thing surfaced during investigation that went beyond the literal ask: `scripts/test-d2-e2e.ts`'s Scenario 4 had two assertions that were already stale *before* this change (`GET /api/users` asserted `501` when it's returned a real `200` for a while; a `GET /api/users/:id` check asserted `501` for a route that was never implemented at all, so it actually 404s). Fixing only the promote/toggle-role lines would have left `npm run test:d2` still failing in the same scenario for unrelated reasons, so I fixed the whole scenario coherently and flagged this explicitly rather than silently doing extra work.

**Files changed:**
- `tests/postman/postman_environment.json` — added `adminUserId`, captured by the "Login as Admin" request, needed to test an admin targeting their own id.
- `tests/postman/postman_collection.json` — 3.11–3.15 renamed `PATCH /:id/admin` → `PATCH /:id/toggle-status` (URL and title; behavior/assertions unchanged). Replaced the two old `/:id/promote` 501-stub requests (3.16–3.17) with six new requests covering `/:id/toggle-role`: forbidden for a non-admin, no token, an unknown UUID, an admin targeting their own id (blocked), and the real promote/demote round-trip on the test user (ending back at STUDENT). The trailing DELETE requests renumbered from 3.18–3.22 to 3.22–3.26. Folder 3 now has 26 requests (was 22).
- `scripts/test-d2-e2e.ts` — rewrote Scenario 4 (renamed from "Deferred Administration Endpoint Authorization" to "User Listing, Status & Role Administration," since nothing there is deferred anymore): fixed the user-listing assertion to expect the real `200`/array response; removed the `GET /api/users/:id` check entirely (no such route exists); added forbidden-for-student checks on both `toggle-status` and `toggle-role`; added an admin round-tripping a target user's status (true→false→true) and role (STUDENT→ADMIN→STUDENT) with assertions on the actual returned value each time, not just the status code; added the admin-cannot-target-self check for `toggle-role` (`403 SELF_ACTION_FORBIDDEN`); added an unknown-UUID `404 USER_NOT_FOUND` check. Left the malformed-cookie `/api/auth/refresh` check at the end untouched.

Verified: both JSON files re-parse as valid JSON; `npx tsc --noEmit` (using the repo's base compiler options) on the `.ts` script reports no errors. Ran both suites for real against the live stack: temporarily stopped the `user-service`/`supplier-service` containers (freeing ports 8001/8002, per this script's own documented requirement) and ran `npm run test:d2` — **55/55 assertions passed**, including every new/changed Scenario 4 check; restarted both containers afterward (same containers, `stop`/`start` not `recreate`, so no IP-cache risk from the gateway issue diagnosed earlier this session). Then ran the Postman collection for real via `postman collection run tests/postman/postman_collection.json -e tests/postman/postman_environment.json` — **53/53 requests, 96/96 assertions passed**, zero failures, including all six new 3.16–3.21 toggle-role requests individually confirmed.

## 2026-09-29 — Upgrade/Downgrade role-toggle button for admin-portal Users page

**Tool:** Claude Code (model: Claude Sonnet 5)
**Author:** jagdeepsh
**Branch:** admin_dashboard

**Prompt (summarised):** Add an Upgrade/Downgrade button to each user row on the Users page, beside Disable — green "Upgrade" for a current student, red "Downgrade" for a current admin — calling the existing `PATCH /api/users/:id/toggle-role` (through the gateway to user-service). Clicking it opens a confirmation popup (same "are you sure" pattern as Delete: a required checkbox, then a colored confirm button showing a loading spinner while the call is in flight); on success the row's displayed role/button updates, on failure an error shows in a div box, including the case where an admin tries to downgrade themselves.

**Usage scenario:** Implementation of an author-specified design (allowed use), reusing the already-implemented and already-verified `toggle-role` endpoint from an earlier round. One design call I flagged in the approved plan rather than assuming silently: unlike Delete (which the author explicitly asked to end in a dedicated success popup), this request only asked for the row's UI to update on success and an error box on failure — so the confirmation modal simply closes on success (row re-renders with its new role in place, same silent-update convention `toggleUserStatus` already uses) rather than showing a separate "Role Changed" popup; author can ask for one if they'd rather have it. The self-targeting case needed no new client-side logic — the backend's existing `SELF_ACTION_FORBIDDEN` error message ("Admins cannot change their own role") is displayed via the same inline error box used for every other failure.

**Files changed:**
- `apps/admin-portal/src/App.tsx` — added `togglingRoleUser`/`toggleRoleConfirmed`/`isTogglingRole`/`toggleRoleError` state; `handleToggleUserRole()` calling `authFetch(\`/api/users/${togglingRoleUser.userId}/toggle-role\`, { method: 'PATCH' })`, updating the matching row in `users` from the server's returned user on success (no refetch, mirrors `toggleUserStatus`). Added the Upgrade/Downgrade row button (beside Disable/Reinstate, before the delete icon) in both the desktop table and mobile card, colored green/red by the row's current role. Added a confirmation modal modeled on the existing Delete User modal (same backdrop/card/checkbox/spinner shape, colored emerald for upgrade / rose for downgrade, using the already-imported `ShieldCheck` icon), with an inline error box that naturally surfaces the self-targeting rejection.

Verified: `npm run typecheck --workspace=@campus-errand/admin-portal` passes; rebuilt and restarted the `admin-portal` container, confirmed healthy, and grepped its served source to confirm the new modal text ("Upgrade to Admin", "Downgrade to Student", the confirmation checkbox copy) is actually shipped. Live-tested the exact request/response shapes the new handler consumes with curl: an admin targeting their own id returns `{"error":"Admins cannot change their own role","code":"SELF_ACTION_FORBIDDEN"}` (403) — exactly the message the inline error box will show; promoting a real student returns `{"data":{"user":{...,"userRole":"ADMIN"}}}` (200) — exactly the shape the row-update logic reads. Not done: an in-browser click-through of the actual modal/button — no browser-automation tool was available in this session; that's the author's manual follow-up per the approved plan's verification section.

## 2026-09-29 (later) — Client-side self-downgrade guard for the role toggle

**Tool:** Claude Code (model: Claude Sonnet 5)
**Author:** jagdeepsh
**Branch:** admin_dashboard

**Prompt (summarised):** Add the "admin cannot change their own role" check on the frontend too, ahead of the API call — so an admin targeting themselves sees the error instantly, with no wasted network round-trip, instead of relying solely on the backend's existing rejection.

**Usage scenario:** Implementation of an author-specified optimization (allowed use) — a pure UX/efficiency addition; the actual authorization boundary remains the backend's existing `SELF_ACTION_FORBIDDEN` check, unchanged and untouched.

**Files changed:**
- `apps/admin-portal/src/App.tsx` — added `decodeJwtUserId()` (reads the JWT's `sub` claim, same pattern as the existing `decodeJwtRole`) and a `currentAdminUserId` state, set from the access token at login and at session-restore, cleared on logout (in `clearLocalSession`). `handleToggleUserRole()` now checks `togglingRoleUser.userId === currentAdminUserId` first and, if true, sets the exact same error text the backend returns ("Admins cannot change their own role") without calling `authFetch` at all.

Verified: `npm run typecheck --workspace=@campus-errand/admin-portal` passes; rebuilt and restarted the `admin-portal` container, confirmed healthy, grepped its served source to confirm `decodeJwtUserId`/`currentAdminUserId` are actually shipped. Confirmed live via curl + manual JWT decode that the token's `sub` claim exactly equals the login response's `user.userId` (the same identity the backend itself uses for its own self-check), so the client-side comparison is checking the right thing. Not done: an in-browser click-through confirming the instant (no-network-tab-activity) rejection — no browser-automation tool was available in this session.

## 2026-09-29 (later) — Revert the client-side self-downgrade guard

**Tool:** Claude Code (model: Claude Sonnet 5)
**Author:** jagdeepsh
**Branch:** admin_dashboard

**Prompt (summarised):** Undo just the previous prompt's client-side self-targeting check — go back to relying solely on the backend's existing `SELF_ACTION_FORBIDDEN` rejection, surfaced via the confirmation modal's error box. Keep everything else from the round before that (the Upgrade/Downgrade button, confirmation modal, and the `toggle-role` API call itself) exactly as it is.

**Usage scenario:** Reverting a specific prior change on explicit author instruction (allowed use) — no new logic, a pure removal.

**Files changed:**
- `apps/admin-portal/src/App.tsx` — removed `decodeJwtUserId()`, the `currentAdminUserId` state (including its three call sites: login, session-restore, `clearLocalSession`), and `handleToggleUserRole`'s early-return self-check. The handler now goes straight to `authFetch` exactly as it did in the round before the client-side guard was added; self-downgrade is caught only by the backend, same as every other error case in this modal.

Verified: `npm run typecheck --workspace=@campus-errand/admin-portal` passes; rebuilt and restarted the `admin-portal` container, confirmed healthy; grepped the served source and confirmed `decodeJwtUserId`/`currentAdminUserId` no longer appear anywhere (0 matches), while the Upgrade/Downgrade feature's own text ("Upgrade to Admin", "Downgrade to Student") is still present and unaffected. Re-tested self-targeting `PATCH /api/users/:id/toggle-role` live with curl: still correctly returns `403 SELF_ACTION_FORBIDDEN` — behavior unchanged from the backend's perspective, only the now-removed client-side shortcut is gone.

## 2026-09-29 (later) — Supplier location-uniqueness constraint (name, category, building, floor)

**Tool:** Claude Code (model: Claude Sonnet 5)
**Author:** jagdeepsh
**Branch:** admin_dashboard

**Prompt (summarised):** Enforce a case-insensitive uniqueness rule across (name, category, building, floor) for suppliers, at the DB schema level, in the create/update API endpoints (with the conflicting record's details returned so the admin can be shown exactly which existing supplier collides), and in the admin-portal Add/Edit Supplier forms (building/floor become required fields, a warning line about the duplicate rule, and an inline display of the returned conflict).

**Usage scenario:** Implementation of an author-specified design, arrived at through several rounds of investigation-then-clarification-then-plan-approval (allowed use) — the exact column combination, case-insensitivity, the two-layer DB-index-plus-app-check approach, and the later addition of returning/displaying the specific conflicting record were all discussed and confirmed with the author turn-by-turn before implementing. Investigated first and corrected two of the author's assumptions before starting: confirmed no such uniqueness check exists anywhere in the current code (DB, repository, routes, or frontend validation) despite the author's recollection that it had been decided before; and confirmed `CreateSupplierRequest` lives in the shared `packages/common-dtos` package, not supplier-service or admin-portal as the author guessed, so it needed a small change too.

**Files changed:**
- `packages/common-dtos/src/index.ts` — `CreateSupplierRequest.building`/`.floor` changed from optional to required.
- `services/supplier-service/src/database/prisma/schema.prisma` — `building`/`floor` changed from `String?` to `String`; documented (comment, mirroring user-service's existing pattern) that the case-insensitive uniqueness lives in a raw SQL expression index, not a Prisma `@@unique`.
- `services/supplier-service/src/database/prisma/migrations/20260929134701_add_location_uniqueness/migration.sql` (new) — `ALTER COLUMN ... SET NOT NULL` for building/floor, plus `CREATE UNIQUE INDEX suppliers_location_case_insensitive_uq ON suppliers (LOWER(name), LOWER(category), LOWER(building), LOWER(floor))`. A genuinely new, second migration file, additive alongside the existing `20260919090038_init` — not a rewrite of it.
- `services/supplier-service/src/database/supplierRepository.ts` — added `findDuplicateLocation(name, category, building, floor, excludeId?)` using Prisma's native `mode: 'insensitive'` string filter; fixed `createSupplier`'s `building`/`floor` assignment (`data.building?.trim() || null` → `data.building.trim()`) now that they're required, non-nullable fields.
- `services/supplier-service/src/database/seed.ts` — added a `requireField()` helper; `building`/`floor` now use it instead of `emptyToNull()`, so the seed script fails loudly with a clear error if a future CSV edit ever omits either, instead of silently trying to seed a null the database would reject. No disclosure header existed on this file before; added one.
- `services/supplier-service/src/backend/supplierRoutes.ts` — `createSupplier`'s required-fields check now also covers `building`/`floor`; both `createSupplier` and `updateSupplier` call `findDuplicateLocation` before writing and return `409` with a `duplicate: { name, category, building, floor }` object when one is found. `updateSupplier` merges the already-fetched `existing` row with the incoming partial body to get the *effective* post-update values (since PUT allows partial updates) before checking, excluding its own id so it isn't flagged against itself.
- `apps/admin-portal/src/App.tsx` — `validateSupplierForm` gained required checks for `building`/`floor`; both Add/Edit Supplier modals gained a red asterisk + inline error on those two fields, a new legend line under the existing "Fields marked with *" text, and new `addDuplicateConflict`/`editDuplicateConflict` state populated from the `409` response's `duplicate` field and rendered as an inline rose box inside the modal (not the top-level `actionAlert` banner, which would be hidden behind the modal's backdrop while it's open) — reset at every existing modal open/cancel/close touchpoint.

Verified: `npm run typecheck` passes clean across every workspace in the monorepo (not just the touched ones, since the `common-dtos` change is a shared-contract change). Rebuilt `supplier-service` and `admin-portal` (no `docker compose down -v`, confirmed unnecessary beforehand and again after — `_prisma_migrations` now has 2 rows, `\d suppliers` shows `building`/`floor` as `NOT NULL` and the new unique index present, seed re-ran cleanly against all 21 existing rows with 0 failures). Live-tested with curl end-to-end: creating `Starbucks`/`Food`/`COM3`/`1` then attempting `STARBUCKS`/`FOOD`/`com3`/`1` correctly returns `409` with the exact original record echoed back in `duplicate`; updating a second, different supplier into that same combination is also correctly rejected `409`; updating that same second supplier with only an unrelated field changed (its own name/category/building/floor unchanged) succeeds `200`, confirming the `excludeId` exclusion works and a no-op update doesn't get flagged as duplicating itself. Grepped the rebuilt `admin-portal` container's served source and confirmed the new legend line and "Duplicate supplier found" box text are actually shipped. Not done: an in-browser click-through of the actual forms — no browser-automation tool was available in this session.

## 2026-09-29 (later) — Postman coverage for supplier duplicate-location rejection

**Tool:** Claude Code (model: Claude Sonnet 5)
**Author:** jagdeepsh
**Branch:** admin_dashboard

**Prompt (summarised):** Add Postman test cases for creating and updating duplicate suppliers (same name, category, building, floor), checking the correct responses come back.

**Usage scenario:** Test coverage for an already-implemented, already-curl-verified feature (allowed use). Investigated first by actually running the existing collection before touching anything, per this session's established practice — found a real regression unrelated to the literal ask: folder 5's own "Create Success" request had never been updated when `building`/`floor` became required fields in the previous round, so it had been failing with `400` (cascading into every request depending on `testSupplierId`) since that change shipped. Fixed as a necessary prerequisite, flagged clearly rather than silently folded in.

**Files changed:**
- `tests/postman/postman_environment.json` — added `testSupplierId2`, a second throwaway supplier needed to test the *update* path's duplicate check (create's and update's duplicate checks are different code paths — update merges the existing row with a partial body — so create's own throwaway supplier isn't a sufficient target to prove update's check independently).
- `tests/postman/postman_collection.json` — rebuilt folder 5 ("Supplier Service: Admin CRUD") end to end, 11 → 15 requests: fixed 5.1's body to include `building`/`floor`; added 5.2 (attempt to create a case-varied duplicate of 5.1's supplier, expect `409` with the `duplicate` object matching the original exactly); added 5.6 (create a second, genuinely different throwaway supplier, capturing `testSupplierId2`); added 5.8 (attempt to update the second supplier into a case-varied duplicate of the first, expect `409`); added 5.15 (permanently delete the second supplier, keeping the DB stateless per this collection's existing cleanup philosophy). Every other existing request preserved unchanged, just renumbered.

Verified: both JSON files re-parse as valid JSON. Ran the full collection for real via `postman collection run` — **57/57 requests, 103/103 assertions passed, zero failures** (up from a previously-broken folder 5 that would have failed at request 1). Confirmed directly in Postgres afterward that both throwaway suppliers (`Postman Test Supplier`, `Postman Second Supplier`) were actually deleted, not just marked inactive.
## 2026-09-26 17:10 SGT — D2 requirements checklist and localhost UAT of main

**Tool:** Claude Code (model: Claude Fable 5.1)
**Author:** Reallyeasy1
**Branch:** main (f0ee632; the uncommitted usage-log entries from `claude-config` are in `git stash` "claude-config: uncommitted ai/usage-log.md entries")

**Prompt (summarised):** Pull main, build a checklist of the D2 requirements from the CS3219 D2 instructions PDF, mark what is done, then run UAT on localhost.

**Usage scenario:** Requirements formatting (checklist from the PDF, facts only), debugging assistance and test writing (UAT drivers, evidence). No architecture or rationale written; the "why" answers the PDF asks for are left to the team, and the defects found are reported, not fixed. Stack: `docker compose up --build -d` from a fresh volume with a compose override (postgres `5440:5432`, rabbitmq `5673:5672` / `15673:15672`, because native PostgreSQL and RabbitMQ own the default ports on this machine) and a new git-ignored `.env` from `generate-jwt-keys`. Results: API driver 56/63 (the 7 failures are findings: nginx 301 on `/api/users`, promote 501, disabled account still logs in and keeps its session, admin can disable self/last admin, non-UUID id → 500, byte-order sort); browser driver 29/29 with the admin portal on `:5174` (via the gateway `/admin/` renders the student app — root-absolute Vite assets); `test:d2` 40/44 (4 stale 501 assertions). API also verified with both UI containers stopped, and data verified after `docker compose restart`. UAT accounts created during the run were deleted from `user_db` afterwards; the 21 suppliers and 3 seed users are untouched.

**Files changed:**
- `docs/evidence/d2/d2-checklist.md` — new: PDF points 1-6 / 1-5 with [x]/[~]/[ ] status, check IDs, and the cross-cutting findings.
- `docs/evidence/d2/README.md` — results table filled in, reproduction steps.
- `docs/evidence/d2/screenshots/*.png` — 29 desktop/mobile screenshots from the browser run (binary, no header).
- `scripts/uat/uat-d2-api.mjs` — new UAT driver, 63 API checks, no dependencies.
- `scripts/uat/uat-d2-ui.mjs` — new UAT driver, 29 Playwright checks (Playwright installed with `--no-save`, not added to package.json).
- `.env` — created locally (git-ignored, not listed in the diff).

Not changed: the compose override lives outside the repo (`docker-compose.override.yml` is not git-ignored here, so it was not added); paste this into one if needed:

```yaml
services:
  postgres:
    ports: !override
      - "5440:5432"
  rabbitmq:
    ports: !override
      - "5673:5672"
      - "15673:15672"
```

Verified: the four runs above, `node --check` on both drivers. The stack was left running for the author's own UAT.

## 2026-09-28 14:24 SGT — D2 checklist and localhost UAT re-run

**Tool:** Claude Code (model: Claude Fable 5.1)
**Author:** Reallyeasy1
**Branch:** main (f0ee632)

**Prompt (summarised):** Pull main, build a checklist of the D2 requirements from the CS3219 D2 instructions PDF, mark what is done, then run UAT on localhost.

**Usage scenario:** Debugging assistance / test evidence. origin/main was already at the local commit, so the existing checklist was kept and the UAT was re-run against the docker compose stack: `uat-d2-api` 56/63, `uat-d2-ui` 29/29, `test:d2` 40/44, API reachable with the UI containers stopped. Results only; the role artifact, database justifications, the promotion workflow and the admin edge-case behaviour are left to the author.

**Files changed:**
- `docs/evidence/d2/d2-checklist.md` — re-run line and header date.
- `docs/evidence/d2/README.md` — re-run line and header date.
- `scripts/uat/uat-d2-ui.mjs` — fixed the `ADMIN_URL` default (it referenced itself and threw when the variable was unset).
- `docs/evidence/d2/screenshots/*.png` — regenerated by the UI run (binary, no header).

## 2026-09-28 14:34 SGT — Bring docs/ in step with the D2 UAT findings

**Tool:** Claude Code (model: Claude Fable 5.1)
**Author:** Reallyeasy1
**Branch:** main (f0ee632)

**Prompt (summarised):** Based on the UAT session, update the docs/ directory and say what else should be added to it.

**Usage scenario:** Documentation improvements, as-built facts only. Each change was checked against the code (`user-routes.ts`, `schema.prisma`, Dockerfiles, `gateway/nginx.conf`, `vite.config.ts`) and the UAT output. No rationale, decision or recommendation was written; the conflicts' Resolution column, the decision records and the "why" answers are left to the author.

**Files changed:**
- `docs/services/user-service.md` — `status` column and migrations, corrected API table, new "Roles as enforced", "Behaviour as built" and "Tests" sections, seed-on-boot note.
- `docs/services/supplier-service.md` — name sort order, denial codes, seed-on-boot, UAT drivers under Tests.
- `docs/architecture/overview.md` — "Built today" for user-service, student-app, admin-portal, gateway; `scripts/uat/` in the layout; conflict rows 18-21 listed.
- `docs/requirements/conflicts.md` — rows 18-21 (Resolution empty).
- `docs/README.md` — evidence entry extended.
- `docs/onboarding-guide-sep-3.md` — troubleshooting: Windows port override, 502 after single-service restart, missing JWT keys.

## 2026-09-28 14:46 SGT — Diagrams, OpenAPI files and User Service API reference

**Tool:** Claude Code (model: Claude Fable 5.1)
**Author:** Reallyeasy1
**Branch:** main (f0ee632)

**Prompt (summarised):** Generate docs/diagrams, docs/api and update api-reference.md. The author also stated the team's decisions (PostgreSQL, shared verification middleware, two roles, reproducible seeded admin) in the prompt.

**Usage scenario:** Documentation improvements: transcription of the existing schema, routes and request flow. Nothing was designed or changed. The decisions and their reasons stated by the author were not written into any file; the decision records in `docs/decisions/` are left to the author. All 5 Mermaid blocks render and both OpenAPI files parse with every `$ref` resolving.

**Files changed:**
- `docs/diagrams/component.md`, `user-schema.md`, `supplier-schema.md`, `auth-sequence.md` — new, Mermaid, as built.
- `docs/api/user-service.yaml`, `docs/api/supplier-service.yaml` — new, OpenAPI 3.0.3 transcriptions of existing routes.
- `services/user-service/docs/api-reference.md` — `status` in user objects, implemented admin routes, removed `GET /api/users/:id`, body-parser error codes.
- `docs/README.md`, `docs/services/user-service.md`, `docs/services/supplier-service.md` — links to the new files.
- `docs/requirements/conflicts.md`, `docs/architecture/overview.md` — row 21 marked resolved.

## 2026-09-28 14:49 SGT — Ignore local-only docs, branch and push

**Tool:** Claude Code (model: Claude Fable 5.1)
**Author:** Reallyeasy1
**Branch:** docs/d2-as-built (from main @ f0ee632)

**Prompt (summarised):** Git-ignore docs/evidence/, docs/requirements/ and the onboarding guide, then create a new branch and push it to the remote.

**Usage scenario:** Boilerplate / configuration. The commit and push were made at the author's explicit request. Files already tracked under the ignored paths were left tracked and their local edits were left out of the commit.

**Files changed:**
- `.gitignore` — three ignore rules.

## 2026-09-28 15:16 SGT — PR #92 opened; Claude PR review failure diagnosed, turn limit raised

**Tool:** Claude Code (model: Claude Fable 5.1)
**Author:** Reallyeasy1
**Branch:** docs/d2-as-built

**Prompt (summarised):** Open a pull request to main, then find out why its CI check fails and raise the Claude review's turn limit above 1000.

**Usage scenario:** Debugging assistance and configuration. PR #92 was opened at the author's request. Run 36389908313 failed because the review finished in 57 turns against `--max-turns 40`; the review itself was posted. The workflow edit is left uncommitted for the author.

**Files changed:**
- `.github/workflows/claude-pr-review.yml` — `--max-turns` 40 to 1500, comment and disclosure header.

## 2026-09-28 16:04 SGT — Decision record files 0001-0004 created

**Tool:** Claude Code (model: Claude Fable 5.1)
**Author:** Reallyeasy1
**Branch:** docs/d2-as-built

**Prompt (summarised):** Update docs/decisions/.

**Usage scenario:** Boilerplate generation and formatting. Four records were created from the template with title, date and Related links. Each holds the author's own statement from an earlier prompt, pasted word for word. The AI wrote no context, options, decision, rationale or consequences; those sections, Status and Deciders are left to the author. Also corrected the time in today's five earlier headings, which were UTC labelled as SGT.

**Files changed:**
- `docs/decisions/0001-database-choice.md`, `0002-token-verification.md`, `0003-roles.md`, `0004-first-administrator.md` — new.
- `docs/decisions/README.md` — index rows.
- `ai/usage-log.md` — heading times of today's entries.

## 2026-09-28 20:19 SGT — D2 question guide

**Tool:** Claude Code (model: Claude Fable 5.1)
**Author:** Reallyeasy1
**Branch:** docs/d2-as-built

**Prompt (summarised):** Write the docs that help answer the questions in the CS3219 D2 instructions PDF.

**Usage scenario:** Documentation and formatting. The guide lists each PDF question with the as-built facts, demo steps and links already recorded in docs/, and quotes the author's statements from decision records 0001-0004 word for word. Differences between those statements and the code are listed as observations. Every "why" answer (role rationale, database justification, authentication approach, first-administrator security, promotion workflow, edge-case behaviour) is left empty for the team.

**Files changed:**
- `docs/d2-question-guide.md` — new.
- `docs/README.md` — index entry and disclosure scope.

## 2026-09-28 20:23 SGT — PR for the D2 question guide and decision record files

**Tool:** Claude Code (model: Claude Fable 5.1)
**Author:** Reallyeasy1
**Branch:** docs/d2-question-guide (from docs/d2-as-built)

**Prompt (summarised):** Make a pull request to the GitHub repo.

**Usage scenario:** Boilerplate / configuration. Branch, commit, push and pull request were made at the author's explicit request. Left out of the commit: the workflow turn-limit edit, the git-ignored local docs (evidence, requirements, onboarding guide) and the generated UAT results file.

**Files changed:**
- none beyond this entry; the commit contains the files from the two entries above and the decision records.

## 2026-09-28 21:21 SGT — Seed account lookup; Word copy of the D2 question guide

**Tool:** Claude Code (model: Claude Fable 5.1)
**Author:** Reallyeasy1
**Branch:** docs/d2-question-guide

**Prompt (summarised):** Two prompts: give the test account names and password; create a Word document from docs/d2-question-guide.md.

**Usage scenario:** Learning support (facts read from the seed script and service page) and formatting. The Word file is a pandoc conversion of the guide with no change to its content; the disclosure header is kept as visible text and the "Team's answer" slots are still empty.

**Files changed:**
- none in the repository besides this entry. Output written outside the repo: `../d2-question-guide.docx`.

## 2026-09-29 12:12 SGT — Checked main for changes before a docs update

**Tool:** Claude Code (model: Claude Fable 5.1)
**Author:** Reallyeasy1
**Branch:** docs/d2-question-guide

**Prompt (summarised):** Pull from main, then update the diagrams and documentation accordingly.

**Usage scenario:** Documentation upkeep. Fetched the remote: `origin/main` is still f0ee632, the commit the diagrams and service pages already describe, so nothing was merged and no document was changed. PRs #91, #93 and #95 are open and not on main.

**Files changed:**
- none besides this entry.

## 2026-09-29 14:07 SGT — PR #92 review findings addressed

**Tool:** Claude Code (model: Claude Fable 5.1)
**Author:** Reallyeasy1
**Branch:** docs/d2-as-built

**Prompt (summarised):** Resolve the code review on PR #92 and merge it.

**Usage scenario:** Debugging assistance and documentation improvements. Two of the three review findings were fixed in the UAT drivers. The `.gitignore` finding was not changed: which folders stay local is the author's decision. Commit, push and merge were made at the author's explicit request.

**Files changed:**
- `scripts/uat/uat-d2-api.mjs` — R3 detail reads `userRole`; header comment states the real output path.
- `scripts/uat/uat-d2-ui.mjs` — results file goes to the temp folder or `UAT_OUT`; header comment corrected.

## 2026-09-29 14:14 SGT — PR #92 merged; PR #94 brought up to date with main

**Tool:** Claude Code (model: Claude Fable 5.1)
**Author:** Reallyeasy1
**Branch:** docs/d2-question-guide

**Prompt (summarised):** Resolve the code review on PRs #92 and #94 and merge them; do not merge PR #93 yet.

**Usage scenario:** Debugging assistance and configuration. A second review pass on PR #92 found a missing `tmpdir` import in the browser driver (fixed in f984922), after which #92 was merged. PR #94 was retargeted to main and main was merged into it; the only conflict was this log, resolved by keeping the entries of both sides. PR #93 was not touched. Merges were made at the author's explicit request.

**Files changed:**
- `ai/usage-log.md` — merge resolution and this entry.

## 2026-09-29 14:34 SGT — PR #93 review findings addressed

**Tool:** Claude Code (model: Claude Fable 5.1)
**Author:** Reallyeasy1
**Branch:** admin_dashboard

**Prompt (summarised):** Resolve the code review on PR #93 and merge it.

**Usage scenario:** Debugging assistance, test updates and documentation improvements. Fixed the defects the review reported in code the branch author had already designed, updated the tests and the as-built documents for the routes and rules this branch introduces, and merged main into the branch. Not done, left to the authors: whether an ADMIN may delete their own or the last ADMIN account, whether the migration backfills old rows, and the usage-log entry for the branch author's own AI use on 2026-09-27. `npm run typecheck` passes on all workspaces. `npm run test:d2`, the UAT drivers and the Postman collection were not run: Docker is not running on this machine. Commit, push and merge were made at the author's explicit request.

**Files changed:**
- `services/user-service/src/users/user-routes.ts` — self checks compare the id in lower case.
- `services/supplier-service/src/backend/supplierRoutes.ts` — trimmed duplicate check, 409 on a unique-index violation, 400 on blank fields in PUT.
- `scripts/test-d2-e2e.ts`, `scripts/uat/uat-d2-api.mjs` — building and floor in the create body, renamed user routes, toggle-role check.
- `tests/postman/postman_collection.json` — request 3.15 accepts 400, 404 or 500 (JSON file, disclosure is in its description field).
- `docs/services/user-service.md`, `docs/services/supplier-service.md`, `docs/api/user-service.yaml`, `docs/api/supplier-service.yaml`, `docs/diagrams/supplier-schema.md`, `docs/d2-question-guide.md`, `services/user-service/docs/api-reference.md` — routes and rules as built on this branch.
- `CLAUDE.md`, `.claude/agents/frontend.md`, `.claude/agents/infrastructure.md` — student-app proxy note.
- Second review pass: `supplierRoutes.ts` — create treats whitespace-only required fields as missing; `scripts/test-d2-e2e.ts` — the test supplier's name carries the random test code.

## 2026-09-29 22:30 SGT — PR #97 review findings: dynamic role reflection & perimeter docs

**Tool:** Google Antigravity Agent
**Author:** yanhwee
**Branch:** feat/gateway-auth-session-management

**Prompt (summarised):** Address Claude Bot review findings on PR #97: reflect role promotions/demotions immediately in /verify and refresh, remove unused dependencies, update stale service docs claiming HMAC token verification in downstream services, and add verification tests.

**Usage scenario:** Code review fixes, test suite extensions, and documentation refinement.

**Files changed:**
- `services/user-service/src/auth/auth-routes.ts` — `/verify` queries the active user and uses `user.role` from the database instead of the frozen JWT role claim.
- `services/user-service/src/auth/auth-module.ts` — added `getActiveUser` and updated `refresh()` to mint refreshed tokens with `user.role` from the database.
- `packages/auth/package.json` — removed unused `jose` dependency.
- `services/user-service/docs/authentication-for-services.md` & `docs/services/supplier-service.md` & `.claude/agents/infrastructure.md` — updated architecture documentation to reflect that downstream microservices trust perimeter headers injected by NGINX.
- `scripts/test-d2-e2e.ts` — added Scenario 4 assertion verifying that user demotion immediately causes `GET /api/auth/verify?role=ADMIN` with their existing session cookie to fail with 403 `ADMIN_REQUIRED`, and `refresh()` to re-mint a `STUDENT` token. Added Scenario 7 verifying NGINX gateway header stripping and `@supplier_write` RBAC enforcement.

