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