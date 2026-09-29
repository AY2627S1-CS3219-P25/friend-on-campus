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
an authenticated user's profile and password, and the ADMIN-only user list and account
status toggle. Other services verify issued access tokens locally with `@campus-errand/auth`.

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
| `JWT_PRIVATE_KEY` | Ed25519 access-token signing | required |
| `JWT_PUBLIC_KEY` | local access-token verification | required |
| `JWT_ISSUER` | access-token issuer claim | `friend-on-campus-user-service` |
| `JWT_AUDIENCE` | access-token audience claim | `friend-on-campus-services` |
| `JWT_ACCESS_TOKEN_TTL` | access-token lifetime | `15m` |
| `JWT_REFRESH_TOKEN_TTL` | ordinary refresh-session idle lifetime | `1d` |
| `JWT_PERSISTENT_REFRESH_TOKEN_TTL` | keep-logged-in idle lifetime | `30d` |
| `CORS_ORIGIN` | credentialed browser origin | `http://localhost:5173` |

## Persistence

`src/database/prisma/schema.prisma` defines `User` and `Session`.

- `users`: UUID, username, email, password hash (scrypt), `STUDENT`/`ADMIN` role (default `STUDENT`), `status` boolean (default `true`), and timestamps.
- `sessions.user_id` references `users.id` with `ON DELETE CASCADE`; index `sessions_user_expiry_idx` on (`user_id`, `idle_expires_at`).
- Migrations: `20260922170000_initial_user_service`, `20260923150000_add_user_status`.
- `sessions`: UUID, user reference, refresh-token hash, persistence flag, timestamps, and idle expiry.
- Usernames and emails are unique case-insensitively through PostgreSQL indexes.
- `src/database/prisma/migrations/` is the service migration source, deployed automatically on container startup or via `npm run db:migrate`. The tables are owned exclusively by User Service and are no longer created in the shared postgres-init script.

The Prisma repositories are `src/persistence/auth-repository.ts` and
`src/persistence/user-repository.ts`; no runtime `pg` pool is used.

## API

| Method & path | Auth | Result |
|---|---|---|
| `POST /api/auth/register` | none | Creates a `username`/`email`/`password` account; does not create a session. |
| `POST /api/auth/login` | none | Returns access token and user; sets refresh-token cookie. |
| `POST /api/auth/refresh` | refresh cookie or body | Rotates refresh token and returns access token. |
| `POST /api/auth/logout` | refresh cookie or body | Revokes that refresh session and clears the cookie. |
| `GET /api/users/me` | Bearer token | Returns authenticated profile. |
| `PATCH /api/users/me` | Bearer token | Updates username only; any other field in the body (`role`, `status`, `userId`, `email`) → 400 `INVALID_INPUT`. Taken username → 409 `DUPLICATE_USERNAME`. |
| `PUT /api/users/me/password` | Bearer token | Verifies current password (401 `INVALID_CURRENT_PASSWORD`) and changes password; 204. |
| `GET /api/users` | ADMIN Bearer token | 200 `{ users: [{ userId, username, email, userRole, status }] }`. |
| `PATCH /api/users/:id/admin` | ADMIN Bearer token | Flips the target's `status`; 200 with the user; unknown UUID → 404 `USER_NOT_FOUND`. |
| `POST /api/users/:id/promote` | ADMIN Bearer token | Deferred placeholder; returns a structured `501` with code `NOT_IMPLEMENTED`. |

There is no `GET /api/users/:id` route (404 "Route not found").

The endpoint-level request and response examples are in
[`../../services/user-service/docs/api-reference.md`](../../services/user-service/docs/api-reference.md);
the OpenAPI form is [`../api/user-service.yaml`](../api/user-service.yaml). Schema diagram:
[`../diagrams/user-schema.md`](../diagrams/user-schema.md); login and RBAC sequence:
[`../diagrams/auth-sequence.md`](../diagrams/auth-sequence.md).

## Roles as enforced

What the code allows today, from `user-routes.ts`, `supplierRoutes.ts` and the D2 UAT (`../evidence/d2/d2-checklist.md`).
Denials: no/invalid/expired token → 401 `MISSING_TOKEN` / `INVALID_TOKEN` / `TOKEN_EXPIRED`; wrong role → 403 `ADMIN_REQUIRED`.

| Action | Guest (no token) | `STUDENT` | `ADMIN` |
|---|---|---|---|
| Register, log in, refresh, log out (`/api/auth/*`) | yes | yes | yes |
| Read / edit own profile, change own password (`/api/users/me*`) | 401 | yes | yes |
| List users (`GET /api/users`) | 401 | 403 | yes |
| Enable / disable an account (`PATCH /api/users/:id/admin`) | 401 | 403 | yes |
| Promote a user (`POST /api/users/:id/promote`) | 401 | 403 | 501 |
| List, search, read suppliers (`GET /api/suppliers`, `/:id`) | yes | yes | yes |
| Create, edit, toggle, delete suppliers | 401 | 403 | yes |
| Log in to the admin portal UI | — | refused by the portal's login gate | yes |

New registrations always get `STUDENT`. The only `ADMIN` account is the seeded one.

## Authentication and sessions

Access tokens use Ed25519 and carry the RFC 7519 registered claims `sub` (user id),
`sid` (session id), `role`, `iat`, `exp`, `iss`, and `aud`. Refresh tokens are opaque and only their
hashes are persisted. Logout prevents refresh-token use; access tokens already issued
remain valid until their configured expiry.

## Development seed accounts

`npm run db:seed --workspace=@campus-errand/user-service` creates or updates
`alice` (`alice@u.nus.edu`), `bob` (`bob@u.nus.edu`), and `admin` (`admin@nus.edu.sg`)
with `Password123!`. Alice and Bob have the `STUDENT` role; Admin has `ADMIN`.

The container start command runs `prisma migrate deploy`, then this seed, then the service
(`Dockerfile` `CMD`), so every container boot resets those three accounts' username, role and
password to the values above. The seed does not write `status`.

## Behaviour as built

Observed on `main` @ f0ee632 (UAT check IDs in brackets, see `../evidence/d2/d2-checklist.md`).

- `status` is stored and returned but not read by login, refresh or the auth middleware: a disabled account still logs in [A6], and its existing access token and refresh session keep working [A11].
- `PATCH /api/users/:id/admin` does not compare the target with the caller or count remaining admins: the seeded admin can disable its own account, including when it is the only `ADMIN` [A8].
- A non-UUID `:id` on that route returns 500 `Internal server error` [A10].
- Refresh rotation: a replayed (already rotated) refresh cookie gets 401 `INVALID_SESSION`; the current cookie keeps working [L7, L8].
- Refresh cookie: `HttpOnly`, `Path=/api/auth`, about 1 day, or about 30 days with `keepLoggedIn: true` [L2, L5].
- No password or password hash appears in any response [R3, P3].
- Through the gateway, `GET /api/users` without a trailing slash is answered by nginx with a 301 to `/api/users/` (only `/api/users/` has a `location` block in `gateway/nginx.conf`) [A0].

## Tests

- `npm run test:d2` — 40/44 on f0ee632. The 4 failures are assertions that expect `GET /api/users` and `GET /api/users/:id` to return `501`.
- `node scripts/uat/uat-d2-api.mjs` — 63 API checks against a running stack; results in `../evidence/d2/`.
