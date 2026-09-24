<!--
AI Assistance Disclosure:
Tool: Claude Code (model: Claude Fable 5.1), date: 2026-09-21
Scope: Listed places where D1, the D2 plan, issue #1 and the code on milestone-d2 say different things.
Observations only — the "Resolution" column is deliberately empty and is for the team to fill.
Author review: <to be completed by Reallyeasy1>
-->
<!--
AI Assistance Disclosure:
Tool: Codex (model: GPT-5.6 Terra), date: 2026-09-23
Scope: Corrected stale code references, removed the resolved legacy-registration-fields mismatch, and recorded the approved generic valid-email policy over the superseded NUS-only test behavior.
Author review: <to be completed by ngkhengyang>
-->
<!--
AI Assistance Disclosure:
Tool: Google Antigravity Agent, date: 2026-09-24
Scope: Recorded resolution for conflict 15: decoupled database table creation from 01-init-databases.sql into service-owned Prisma migrations.
Author review: (to be completed by author after review)
-->

# Open conflicts between documents, issues and code

Facts as of 2026-09-23 (current workspace). Nothing here is a recommendation. When the team settles a row, write the outcome in a decision record under [`../decisions/`](../decisions/README.md) and link it in the last column.

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
| 8 | Session method: D2 plan sketches an opaque session token in an HttpOnly cookie with a validation endpoint; the code issues an Ed25519 access token sent as `Authorization: Bearer`, uses an opaque refresh-token cookie, and verifies access tokens locally | D2 plan §8, App. B2 vs `services/user-service/src/auth/`, `packages/auth/`, README | |
| 9 | Role names: D2 plan uses `USER` / `ADMIN`; code and DB default use `STUDENT` / `ADMIN` | D2 plan §4 vs `packages/common-dtos` `UserRole`, init SQL | |
| 10 | Guest access to the supplier list: D2 plan permission matrix says No; `GET /api/suppliers` and `GET /api/suppliers/:id` have no auth middleware | D2 plan App. B vs `supplierRoutes.ts` | |
| 11 | Supplier edit API: D2 plan proposes `PATCH /api/suppliers/{id}` with a `version` field and 409 on stale edits; code has `PUT /:id` and `PATCH /:id/toggle`, and the supplier table has no `version` column | D2 plan App. C / B3 vs `supplierRoutes.ts`, `schema.prisma` | |
| 13 | Frontend runtime: `CLAUDE.md` and the D2 plan say Bun; the repo uses npm workspaces and Node 20 images | CLAUDE.md §3, D2 plan §4 vs `package.json`, Dockerfiles | |
| 14 | Backend stack: D2 plan notes an earlier Spring Boot preference; `CLAUDE.md` mandates Node/Express and all services are Express | D2 plan §4 vs CLAUDE.md §3 | |
| 15 | Table definitions exist twice (raw SQL in `docker/postgres-init` and Prisma schemas) and differ in places, e.g. supplier `id` is `UUID` in SQL and plain `String` in Prisma | `01-init-databases.sql` vs `schema.prisma` files | Resolved: `01-init-databases.sql` provisions logical databases only; table schemas, migrations, and seeds are owned independently by each microservice via Prisma |
| 16 | README marks D2 "Completed"; the D2 milestone has 5 open issues and 0 closed | README vs GitHub milestone | |
| 17 | Earlier D2 behavior rejected non-NUS email domains, while issue #2 F1.1.5 requires only valid email format; the approved implementation accepts syntactically valid domains such as `example.test` | Prior D2 test vs issue #2 F1.1.5, `utils/validation.ts`, `scripts/test-d2-e2e.ts` | Generic valid-email acceptance retained; NUS-only restriction superseded |
