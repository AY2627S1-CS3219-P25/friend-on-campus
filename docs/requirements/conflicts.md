<!--
AI Assistance Disclosure:
Tool: Claude Code (model: Claude Fable 5.1), date: 2026-09-21
Scope: Listed places where D1, the D2 plan, issue #1 and the code on milestone-d2 say different things.
Observations only — the "Resolution" column is deliberately empty and is for the team to fill.
Author review: <to be completed by Reallyeasy1>
-->

# Open conflicts between documents, issues and code

Facts as of 2026-09-21 (`milestone-d2`). Nothing here is a recommendation. When the team settles a row, write the outcome in a decision record under [`../decisions/`](../decisions/README.md) and link it in the last column.

## Already listed in issue #1

| # | Conflict | Sources | Resolution |
|---|---|---|---|
| 1 | Full supplier CRUD is scheduled for Sprint 3 in D1, but D2 (Week 7) expects it | D1 §5; D2 plan §1 | |
| 2 | CI/CD timing: Sprint 3 in one place, Sprint 4 in another | D1 §3.6 vs §5.5 | |
| 3 | `ACCEPTED → EXPIRED` allowed by Order N3.2, but F3.5.3 expires only unaccepted `OPEN` errands; `DISPUTED` handling undefined | D1 Order N3.2 vs F3.5.3 | |
| 4 | Repeated NFR identifiers with different performance thresholds | D1 §6.2 and appendices | |
| 5 | Credit estimator input: item count vs item weight | D1 F9.1.1 vs §3.4 | |
| 6 | Mockup escrow arithmetic subtracts reserved credits twice | D1 §4.5 mockup | |
| 7 | D2 / D3 mentor appointment dates not confirmed | milestones | |

## Found while reading the code

| # | Conflict | Sources | Resolution |
|---|---|---|---|
| 8 | Session method: D2 plan sketches an opaque session token in an HttpOnly cookie with a validation endpoint; the code issues a JWT sent as `Authorization: Bearer` and each service verifies it locally | D2 plan §8, App. B2 vs `services/*/authMiddleware.ts`, README | |
| 9 | Role names: D2 plan uses `USER` / `ADMIN`; code and DB default use `STUDENT` / `ADMIN` | D2 plan §4 vs `packages/common-dtos` `UserRole`, init SQL | |
| 10 | Guest access to the supplier list: D2 plan permission matrix says No; `GET /api/suppliers` and `GET /api/suppliers/:id` have no auth middleware | D2 plan App. B vs `supplierRoutes.ts` | |
| 11 | Supplier edit API: D2 plan proposes `PATCH /api/suppliers/{id}` with a `version` field and 409 on stale edits; code has `PUT /:id` and `PATCH /:id/toggle`, and the supplier table has no `version` column | D2 plan App. C / B3 vs `supplierRoutes.ts`, `schema.prisma` | |
| 12 | Registration fields: D1 F1.1 says username, email, password; the `users` table has `nus_email`, `full_name`, `matric_number` and no username | D1 F1.1 vs `schema.prisma` (user-service) | |
| 13 | Frontend runtime: `CLAUDE.md` and the D2 plan say Bun; the repo uses npm workspaces and Node 20 images | CLAUDE.md §3, D2 plan §4 vs `package.json`, Dockerfiles | |
| 14 | Backend stack: D2 plan notes an earlier Spring Boot preference; `CLAUDE.md` mandates Node/Express and all services are Express | D2 plan §4 vs CLAUDE.md §3 | |
| 15 | Table definitions exist twice (raw SQL in `docker/postgres-init` and Prisma schemas) and differ in places, e.g. supplier `id` is `UUID` in SQL and plain `String` in Prisma; user-service has no Prisma migrations | `01-init-databases.sql` vs `schema.prisma` files | |
| 16 | README marks D2 "Completed"; the D2 milestone has 5 open issues and 0 closed | README vs GitHub milestone | |
