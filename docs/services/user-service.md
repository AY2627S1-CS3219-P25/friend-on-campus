<!--
AI Assistance Disclosure:
Tool: Claude Code (model: Claude Fable 5.1), date: 2026-09-29
Scope: PR #93: replaced `PATCH /:id/admin` and `POST /:id/promote` with `toggle-status`, `toggle-role` and `DELETE /:id` in the API table, the roles table and the behaviour notes, as implemented in `user-routes.ts`. Existing behaviour only.
Author review: <to be completed by the service owner>
-->
<!--
AI Assistance Disclosure:
Tool: Claude Code (model: Claude Fable 5.1), date: 2026-09-21
Scope: Wrote this page from services/user-service source, docker-compose.yml, the init SQL and D1 / D2-plan text. Descriptive only.
Author review: <to be completed by the service owner>
-->
<!--
AI Assistance Disclosure:
Tool: Codex (model: GPT-5.6 Terra), date: 2026-09-22
Scope: Updated the page to describe the author-approved Prisma account and session persistence implementation.
Author review: <to be completed by ngkhengyang>
-->
<!--
AI Assistance Disclosure:
Tool: Claude Code (model: Claude Fable 5.1), date: 2026-09-23
Scope: Updated the access-token claim names to the RFC 7519 registered names now emitted by the service.
Author review: <to be completed by ngkhengyang>
-->
<!--
AI Assistance Disclosure:
Tool: Codex (model: GPT-5.6 Terra), date: 2026-09-22
Scope: Updated local and Compose database connection facts for the shared PostgreSQL deployment.
Author review: <to be completed by ngkhengyang>
-->
<!--
AI Assistance Disclosure:
Tool: Codex (model: GPT-5.6 Terra), date: 2026-09-22
Scope: Updated profile and password endpoint facts for the immutable-email contract.
Author review: <to be completed by ngkhengyang>
-->
<!--
AI Assistance Disclosure:
Tool: Codex (model: GPT-5.6 Terra), date: 2026-09-22
Scope: Documented the author-approved deferred ADMIN User Service endpoint placeholders, structured `501` responses, and interoperable JWT claims.
Author review: <to be completed by ngkhengyang>
-->
<!--
AI Assistance Disclosure:
Tool: Google Antigravity Agent, date: 2026-09-28
Scope: Updated documentation to reflect symmetric session token issuance (SESSION_SECRET), NGINX gateway authentication offloading via GET /api/auth/verify, and downstream X-User-Id/X-User-Role header propagation.
Author review: (to be completed by author after review)
-->
<!--
AI Assistance Disclosure:
Tool: Google Antigravity Agent, date: 2026-09-24
Scope: Updated persistence documentation to reflect that user-service owns its Prisma migrations on container boot rather than relying on shared init SQL.
Author review: (to be completed by author after review)
-->
<!--
AI Assistance Disclosure:
Tool: Claude Code (model: Claude Fable 5.1), date: 2026-09-28
Scope: Brought the page in step with `main` @ f0ee632 after the D2 UAT: `users.status` column and second migration, the
implemented `GET /api/users` and `PATCH /api/users/:id/admin`, the removed `GET /api/users/:id`, and new sections
"Roles as enforced", "Behaviour as built" and "Tests". Observed facts only, no recommendation.
Author review: <to be completed by the service owner>
-->

# user-service

**Status:** real — Prisma with PostgreSQL. Port **8001**, database **`user_db`**.

## Responsibilities

The service owns account registration, login sessions, refresh-token rotation, logout,
an authenticated user's profile and password, account deletion (own account, or any account
for an ADMIN), and the ADMIN-only user list, account status toggle and role toggle. Other services verify issued access tokens locally with `@campus-errand/auth`.

## Run

```bash
npm run db:generate --workspace=@campus-errand/user-service
npm run db:migrate --workspace=@campus-errand/user-service
npm run db:seed --workspace=@campus-errand/user-service
npm run dev:user
```

`DATABASE_URL` selects `user_db`. Direct local development connects to
`postgresql://postgres:postgres@localhost:5432/user_db`; the Compose service uses
the shared `postgres` hostname on port `5432`.

## Configuration

| Variable | Used for | Default in code |
|---|---|---|
| `PORT` | HTTP listen port | `8001` |
| `DATABASE_URL` | Prisma connection | local `user_db` URL above |
| `SESSION_SECRET` | Symmetric HMAC-SHA256 session token signing & verification | **Required** (no default; min 32 chars) |
| `JWT_ISSUER` | access-token issuer claim | `friend-on-campus-user-service` |
| `JWT_AUDIENCE` | access-token audience claim | `friend-on-campus-services` |
| `JWT_ACCESS_TOKEN_TTL` | access-token lifetime | `1d` |
| `JWT_REFRESH_TOKEN_TTL` | ordinary session lifetime | `1d` |
| `JWT_PERSISTENT_REFRESH_TOKEN_TTL` | keep-logged-in session lifetime | `30d` |
| `CORS_ORIGIN` | credentialed browser origin | `http://localhost:5173` |

## Persistence

`src/database/prisma/schema.prisma` defines `User` (and an unused legacy `Session` schema model). Session state is stateless JWT and does not write to the database.

- `users`: UUID, username, email, password hash (scrypt), `STUDENT`/`ADMIN` role (default `STUDENT`), `status` boolean (default `true`), and timestamps.
- Migrations: `20260922170000_initial_user_service`, `20260923150000_add_user_status`.
- Usernames and emails are unique case-insensitively through PostgreSQL indexes.
- `src/database/prisma/migrations/` is the service migration source, deployed automatically on container startup or via `npm run db:migrate`. The tables are owned exclusively by User Service and are no longer created in the shared postgres-init script.

The Prisma repository is `src/persistence/user-repository.ts`; no runtime `pg` pool is used.

## API

| Method & path | Auth | Result |
|---|---|---|
| `POST /api/auth/register` | none | Creates a `username`/`email`/`password` account; does not create a session. |
| `POST /api/auth/login` | none | Returns session token and user; sets `session` cookie (Path=/). |
| `GET /api/auth/verify` | session cookie (`session`) | Gateway verification subrequest; returns `200` with `X-Auth-User-Id` and `X-Auth-User-Role` headers, or `401`. Query `role=ADMIN` checks for admin privilege (returns `403` if student). |
| `POST /api/auth/refresh` | session cookie (`session`) | Re-issues and extends stateless `session` cookie. |
| `POST /api/auth/logout` | session cookie (`session`) | Clears `session` cookie. |
| `GET /api/users/me` | Gateway perimeter header (`X-User-Id`) | Returns authenticated profile. |
| `PATCH /api/users/me` | Gateway perimeter header (`X-User-Id`) | Updates username only; any other field in the body (`role`, `status`, `userId`, `email`) → 400 `INVALID_INPUT`. Taken username → 409 `DUPLICATE_USERNAME`. |
| `PUT /api/users/me/password` | Gateway perimeter header (`X-User-Id`) | Verifies current password (401 `INVALID_CURRENT_PASSWORD`) and changes password; 204. |
| `GET /api/users` | Gateway perimeter header (`X-User-Role: ADMIN`) | 200 `{ users: [{ userId, username, email, userRole, status }] }`. |
| `PATCH /api/users/:id/toggle-status` | Gateway perimeter header (`X-User-Role: ADMIN`) | Flips the target's `status`; 200 with the user; unknown UUID → 404 `USER_NOT_FOUND`. |
| `PATCH /api/users/:id/toggle-role` | Gateway perimeter header (`X-User-Role: ADMIN`) | Flips the target's role between `STUDENT` and `ADMIN`; 200 with the user; own id → 403 `SELF_ACTION_FORBIDDEN`; unknown UUID → 404 `USER_NOT_FOUND`. |
| `DELETE /api/users/:id` | Gateway perimeter header; own id, or ADMIN for any id | Deletes the account; 204; another user's id as `STUDENT` → 403 `FORBIDDEN`; unknown UUID → 404 `USER_NOT_FOUND`. |

The endpoint-level request and response examples are in
[`../../services/user-service/docs/api-reference.md`](../../services/user-service/docs/api-reference.md);
the OpenAPI form is [`../api/user-service.yaml`](../api/user-service.yaml). Schema diagram:
[`../diagrams/user-schema.md`](../diagrams/user-schema.md); login and RBAC sequence:
[`../diagrams/auth-sequence.md`](../diagrams/auth-sequence.md).

## Roles as enforced

What the code allows today, from `user-routes.ts`, `supplierRoutes.ts` and the D2 UAT (`../evidence/d2/d2-checklist.md`).
Denials: no/invalid/expired token → 401 `MISSING_TOKEN` / `INVALID_TOKEN` / `TOKEN_EXPIRED`; wrong role → 403 `ADMIN_REQUIRED`;
another user's account on `DELETE` → 403 `FORBIDDEN`; own id on `toggle-role` → 403 `SELF_ACTION_FORBIDDEN`.

| Action | Guest (no token) | `STUDENT` | `ADMIN` |
|---|---|---|---|
| Register, log in, refresh, log out (`/api/auth/*`) | yes | yes | yes |
| Read / edit own profile, change own password (`/api/users/me*`) | 401 | yes | yes |
| List users (`GET /api/users`) | 401 | 403 | yes |
| Enable / disable an account (`PATCH /api/users/:id/toggle-status`) | 401 | 403 | yes |
| Promote or demote a user (`PATCH /api/users/:id/toggle-role`) | 401 | 403 | yes, except own id (403) |
| Delete own account (`DELETE /api/users/:id`) | 401 | yes | yes |
| Delete another user's account (`DELETE /api/users/:id`) | 401 | 403 | yes |
| List, search, read suppliers (`GET /api/suppliers`, `/:id`) | yes | yes | yes |
| Create, edit, toggle, delete suppliers | 401 | 403 | yes |
| Log in to the admin portal UI | — | refused by the portal's login gate | yes |

New registrations always get `STUDENT`. After a fresh seed the only `ADMIN` is the seeded account; an `ADMIN` can make
another user an `ADMIN` with `toggle-role`. The seed puts the three seed accounts' roles back on every container boot.

## Authentication and sessions

Sessions use symmetric HMAC-SHA256 (HS256) stateless session tokens placed into `HttpOnly`, `SameSite=Lax`, `Path=/` cookies named `session`. When requests pass through the NGINX API Gateway, NGINX executes an internal subrequest to `GET /api/auth/verify`. Upon verification, NGINX injects `X-User-Id` and `X-User-Role` upstream headers into downstream microservices (e.g. `supplier-service`, `order-service`).

Downstream services consuming `@campus-errand/auth` inspect these gateway headers directly via `getSessionUser`.

## Development seed accounts

`npm run db:seed --workspace=@campus-errand/user-service` creates or updates
`alice` (`alice@u.nus.edu`), `bob` (`bob@u.nus.edu`), and `admin` (`admin@nus.edu.sg`)
with `Password123!`. Alice and Bob have the `STUDENT` role; Admin has `ADMIN`.

The container start command runs `prisma migrate deploy`, then this seed, then the service
(`Dockerfile` `CMD`), so every container boot resets those three accounts' username, role and
password to the values above. The seed does not write `status`.

## Behaviour as built

Items with a UAT check ID in brackets were observed on `main` @ f0ee632 (see `../evidence/d2/d2-checklist.md`);
the items about `toggle-role` and `DELETE` are read from the code and have not been run in a UAT.

- `status` is stored and returned but not read by login, refresh or the auth middleware: a disabled account still logs in [A6], and its existing access token and refresh session keep working [A11].
- `PATCH /api/users/:id/toggle-role` refuses the caller's own id (compared in lower case) and does not count remaining admins.
- `DELETE /api/users/:id` does not count remaining admins and does not refuse an `ADMIN` deleting their own account.
- `PATCH /api/users/:id/toggle-status` (formerly `/admin`) does not compare the target with the caller or count remaining admins: the seeded admin can disable its own account, including when it is the only `ADMIN` [A8].
- A non-UUID `:id` on `toggle-status` returns 500 `Internal server error` [A10].
- Refresh rotation: a replayed (already rotated) refresh cookie gets 401 `INVALID_SESSION`; the current cookie keeps working [L7, L8].
- Refresh cookie: `HttpOnly`, `Path=/api/auth`, about 1 day, or about 30 days with `keepLoggedIn: true` [L2, L5].
- No password or password hash appears in any response [R3, P3].
- Through the gateway, `GET /api/users` without a trailing slash is answered by nginx with a 301 to `/api/users/` (only `/api/users/` has a `location` block in `gateway/nginx.conf`) [A0].

## Tests

- `npm run test:d2` — Scenario 4 covers the user list, `toggle-status` and `toggle-role`. The last recorded run (40/44, on f0ee632) predates that rewrite.
- `tests/postman/` — Postman collection and environment for this service and Supplier Service, run against ports 8001 / 8002.
- `node scripts/uat/uat-d2-api.mjs` — 63 API checks against a running stack; the recorded results in `../evidence/d2/` are from f0ee632.
