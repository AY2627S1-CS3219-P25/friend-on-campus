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