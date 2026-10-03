<!--
AI Assistance Disclosure:
Tool: Claude Code (model: Claude Fable 5.1), date: 2026-09-21
Scope: Created this placeholder page (structure only).
Author review: <to be completed by Reallyeasy1>
-->
<!--
AI Assistance Disclosure:
Tool: Claude Code (model: Claude Fable 5.1), date: 2026-09-26
Scope: Filled the results table from the 2026-09-26 UAT run of `main` @ f0ee632 (docker compose stack on localhost; API checks,
Playwright browser checks, the repo's test:d2 suite) and added the reproduction steps. Results only, no interpretation.
2026-09-28: added the re-run line. 2026-10-01: added the 754331f re-run line and result files.
Author review: <to be completed by Reallyeasy1>
-->

# D2 evidence

Pass/fail results for the acceptance checks in the D2 plan §5, with enough detail to reproduce each one.
The requirement-by-requirement view of the same run is [`d2-checklist.md`](./d2-checklist.md).

Run: 2026-09-26, `main` @ f0ee632, Windows 11 + Docker Desktop 28.1.1, `docker compose up --build` from a fresh volume.
Re-run: 2026-09-28, same commit (origin/main unchanged), existing volume — identical results: API 56/63, UI 29/29, `test:d2` 40/44.
Re-run: 2026-10-01, `main` @ 754331f (PR #103 gateway `/admin/` host fix, PR #104 atomic last-admin guard + self-deletion logout), existing volume — API 57/63 (same six known gaps), UI 30/30 now through the gateway `/admin/` route, `test:d2` 56/56, unit 143/143, plus 34 targeted checks for the last-admin guard (`uat-admin-guards-results-2026-10-01.json`: 32/34; the two failures are findings — a demoted admin keeps ADMIN rights on its unexpired access token, and a non-UUID id on `DELETE /api/users/:id` returns 500) and 8 browser checks for self-deletion logout and the last-admin dialog error (screenshots `admin-selfdelete-back-to-login-desktop.png`, `admin-lastadmin-delete-refused-desktop.png`).
Re-run: 2026-10-01 (later), `main` @ e999596 (PR #105: both Vite dev servers proxy `/api` and `/ws` to the gateway inside Compose; nginx exact-match `/api/users`, `/api/credits` and a 404 catch-all for unknown `/api/*`) — API 58/63 (A0 now passes: bare `/api/users` is served, no 301; A6 A8 A10 A11 S8 remain), UI 30/30 through the gateway and 30/30 again through the direct ports 5173/5174, `test:d2` 56/56, last-admin guard checks 32/34 (same two findings), self-deletion browser checks 8/8 on both origins, student-app `/ws/` socket connects on both origins, gateway access log shows the frontend-proxied requests arriving from the app containers. Result files `*-2026-10-01-e999596*.json`.
Re-run: 2026-10-01 (branch `fix/a6-disabled-login`, uncommitted, on top of e999596) — login refuses a disabled account with 403 `ACCOUNT_DISABLED` (checked after the password). API 59/63 (A6 now passes; A8 A10 A11 S8 remain), UI 30/30, `test:d2` 56/56, unit 146/146, guard checks 32/34 (unchanged), plus 4 browser checks that a disabled student sees the message in both login forms (`student-login-disabled-mobile.png`, `admin-login-disabled-desktop.png`).
Drivers: `scripts/uat/uat-d2-api.mjs` (63 checks, no dependencies) and `scripts/uat/uat-d2-ui.mjs` (29 checks, Playwright 1.63 headless Chromium).

| Check (D2 plan §5) | Result | Evidence (command output, screenshot, test name) | Date | By |
|---|---|---|---|---|
| Authentication | **Pass** | `uat-d2-api` R1-R5, L1-L10 all pass: register validation/409s, login 200 + HttpOnly refresh cookie (`Path=/api/auth`, 1 d vs 30 d with `keepLoggedIn`), token claims (`sub sid role iat exp iss aud`, 900 s), refresh rotation, replay refused, logout 204 then refresh 401. `test:d2` auth block 100 %. Screenshots `student-login-*`, `admin-login-*`. | 2026-09-26 | Reallyeasy1 (Claude Code) |
| RBAC (direct API calls + UI) | **Pass** | API: P1/P2 (401 `MISSING_TOKEN`/`INVALID_TOKEN`), A1/A4 (STUDENT 403 `ADMIN_REQUIRED` on `/api/users`), W1/W2/W6/W10 (supplier writes: anon 401, STUDENT 403), W12 (tampered token 401), A2/W4-W11 (ADMIN 2xx). UI: `admin-login-student-denied-desktop.png` (admin gate refuses a STUDENT login); student app shows no admin controls (`student-spots-mobile.png`). | 2026-09-26 | Reallyeasy1 (Claude Code) |
| Supplier CRUD | **Pass** | API W3-W11: 400 missing fields, 201 `SUP-022`, read-back, PUT 200, toggle, soft delete (`isActive=false`), permanent delete → 404. UI UA11-UA14 with `admin-add-*`, `admin-edit-modal-desktop.png`, `admin-delete-*`. `test:d2` supplier block 100 %. | 2026-09-26 | Reallyeasy1 (Claude Code) |
| Directory (search, filters, sort, pagination, details, no-results) | **Pass** (note) | API S1-S10: 21 seeded rows, by id / by code / 404, search, zone + category filters, sort, `page=1&limit=5` → `totalPages=5`, empty result. UI UA5-UA10 (`admin-search-*`, `admin-filter-*`, `admin-sort-desktop.png`, `admin-page2-desktop.png`, `admin-details-*`), student US5-US6 (`student-spots-*`). Note: `sortBy=name` is byte-order (lower-case names sort last, S8 flagged). | 2026-09-26 | Reallyeasy1 (Claude Code) |
| UI at desktop and mobile widths; API works with UI stopped | **Pass** (caveat) | 1440 px and 390 px screenshots for both apps (`*-desktop.png`, `*-mobile.png`; mobile has no horizontal overflow, cards replace the table, hamburger drawer `admin-drawer-mobile.png`). With `student-app` and `admin-portal` containers stopped: `GET /` and `/admin/` → 502, `GET /api/suppliers` → 200 (total 21), `POST /api/auth/login` → 200, `:8002` direct → 200. **Caveat:** the admin portal only renders on `http://localhost:5174/`; `http://localhost/admin/` through nginx renders the student app because the Vite assets are root-absolute. | 2026-09-26 | Reallyeasy1 (Claude Code) |
| Reproducibility (fresh start from README; data survives restart) | **Pass** (notes) | Fresh volume: `docker compose up --build -d` → both services applied their Prisma migrations and seeded (`[seed] Done. created=21`, 3 users). `docker compose restart` of the whole stack: 21 suppliers still there, `alice` still logs in, seed reports `created=0 updated=21`. Notes: `.env` must hold `JWT_PRIVATE_KEY`/`JWT_PUBLIC_KEY` first (`npm run generate:jwt-keys -- --print > .env`); on this machine ports 5432 and 5672/15672 were taken by native services, so an override mapped postgres to 5440 and rabbitmq to 5673/15673; restarting only `user-service`/`supplier-service` leaves nginx with stale upstream IPs (502 on `/api/*`) until the gateway restarts. `npm run test:d2`: 40/44, the 4 failures are the suite's stale 501 expectations for the now-implemented `GET /api/users` and the non-existent `GET /api/users/:id`. | 2026-09-26 | Reallyeasy1 (Claude Code) |

Open defects found by the run (details and check IDs in `d2-checklist.md`): disabled accounts can still log in and their sessions keep working (A6, A11); an admin can disable their own or the last admin account (A8); a non-UUID user id returns 500 (A10); `POST /api/users/:id/promote` is a 501 placeholder (A3); `/admin/` via the gateway; `test:d2` stale assertions.

## Reproduce

```bash
npm run generate:jwt-keys -- --print > .env        # once; .env is git-ignored
docker compose up --build -d                       # add -f docker-compose.yml -f <override> if 5432/5672 are taken
node scripts/uat/uat-d2-api.mjs                    # API checks through http://localhost and :8001/:8002
npm i --no-save playwright@1.63.0 && npx playwright install chromium
node scripts/uat/uat-d2-ui.mjs                     # browser checks; ADMIN_URL defaults to http://localhost:5174/
docker compose stop user-service supplier-service && npm run test:d2 && docker compose start user-service supplier-service
```

Screenshots are in `screenshots/`, named `<check>-<desktop|mobile>.png`.
