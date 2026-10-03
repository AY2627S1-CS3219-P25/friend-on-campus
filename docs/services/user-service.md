<!--
AI Assistance Disclosure:
Tool: Google Antigravity Agent, date: 2026-10-03
Scope: Documented transactional outbox persistence, RabbitMQ event publishing, at-least-once delivery guarantees, and background relay lifecycle.
Author review: <to be completed by huangjiaxi1111>

Tool: Claude Code (model: Claude Fable 5.1), date: 2026-10-01
Scope: Login now refuses disabled accounts (A6); behaviour notes and API table updated.
Author review: <to be completed by Reallyeasy1>

Tool: Codex (model: GPT-6), date: 2026-09-30
Scope: Document atomic last-admin guards, self-deletion logout, and isolated PostgreSQL regression checks.
Author review: <to be completed by huangjiaxi1111>

Tool: Claude Code (model: Claude Fable 5.1), date: 2026-09-30
Scope: Tests section: added the unit-test suite.
Author review: <to be completed by the service owner>

Tool: Claude Code (model: Claude Fable 5.1), date: 2026-09-29
Scope: PR #93: replaced `PATCH /:id/admin` and `POST /:id/promote` with `toggle-status`, `toggle-role` and `DELETE /:id` in the API table, the roles table and the behaviour notes, as implemented in `user-routes.ts`. Existing behaviour only.
Author review: <to be completed by the service owner>

Tool: Claude Code (model: Claude Fable 5.1), date: 2026-09-21
Scope: Wrote this page from services/user-service source, docker-compose.yml, the init SQL and D1 / D2-plan text. Descriptive only.
Author review: <to be completed by the service owner>

Tool: Codex (model: GPT-5.6 Terra), date: 2026-09-22
Scope: Updated the page to describe the author-approved Prisma account and session persistence implementation.
Author review: <to be completed by ngkhengyang>

Tool: Claude Code (model: Claude Fable 5.1), date: 2026-09-23
Scope: Updated the access-token claim names to the RFC 7519 registered names now emitted by the service.
Author review: <to be completed by ngkhengyang>

Tool: Codex (model: GPT-5.6 Terra), date: 2026-09-22
Scope: Updated local and Compose database connection facts for the shared PostgreSQL deployment.
Author review: <to be completed by ngkhengyang>

Tool: Codex (model: GPT-5.6 Terra), date: 2026-09-22
Scope: Updated profile and password endpoint facts for the immutable-email contract.
Author review: <to be completed by ngkhengyang>

Tool: Codex (model: GPT-5.6 Terra), date: 2026-09-22
Scope: Documented the author-approved deferred ADMIN User Service endpoint placeholders, structured `501` responses, and interoperable JWT claims.
Author review: <to be completed by ngkhengyang>

Tool: Google Antigravity Agent, date: 2026-09-24
Scope: Updated persistence documentation to reflect that user-service owns its Prisma migrations on container boot rather than relying on shared init SQL.
Author review: (to be completed by author after review)

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
| `RABBITMQ_URL` | RabbitMQ connection URL | `amqp://user_service:user-service-dev@localhost:5672/campus` |
| `EVENTS_EXCHANGE` | Topic exchange for campus events | `campus.events` |
| `JWT_PRIVATE_KEY` | Ed25519 access-token signing | required |
| `JWT_PUBLIC_KEY` | local access-token verification | required |
| `JWT_ISSUER` | access-token issuer claim | `friend-on-campus-user-service` |
| `JWT_AUDIENCE` | access-token audience claim | `friend-on-campus-services` |
| `JWT_ACCESS_TOKEN_TTL` | access-token lifetime | `15m` |
| `JWT_REFRESH_TOKEN_TTL` | ordinary refresh-session idle lifetime | `1d` |
| `JWT_PERSISTENT_REFRESH_TOKEN_TTL` | keep-logged-in idle lifetime | `30d` |
| `CORS_ORIGIN` | credentialed browser origin | `http://localhost:5173` |

## Persistence

`src/database/prisma/schema.prisma` defines `User`, `Session`, and `OutboxEvent`.

- `users`: UUID, username, email, password hash (scrypt), `STUDENT`/`ADMIN` role (default `STUDENT`), `status` boolean (default `true`), and timestamps.
- `sessions.user_id` references `users.id` with `ON DELETE CASCADE`; index `sessions_user_expiry_idx` on (`user_id`, `idle_expires_at`).
- `outbox_events`: UUID primary key, `event_type` (`user.registered`), `payload` JSON text, `status` (`PENDING`/`DELIVERED`/`FAILED`), `retry_count`, and timestamps; index `outbox_events_status_created_at_idx` on (`status`, `created_at`).
- Migrations: `20260922170000_initial_user_service`, `20260923150000_add_user_status`, `20261003233000_add_outbox_events`.
- `sessions`: UUID, user reference, refresh-token hash, persistence flag, timestamps, and idle expiry.
- Usernames and emails are unique case-insensitively through PostgreSQL indexes.
- `src/database/prisma/migrations/` is the service migration source, deployed automatically on container startup or via `npm run db:migrate`. The tables are owned exclusively by User Service and are no longer created in the shared postgres-init script.

The Prisma repositories are `src/persistence/auth-repository.ts` and
`src/persistence/user-repository.ts`; no runtime `pg` pool is used.

## Messaging and transactional outbox

When a new student registers (`POST /api/auth/register`), User Service coordinates account creation and credit grant event publication:
- The user account and a `user.registered` event record (`initialGrant: 100`) are committed atomically within the same PostgreSQL transaction into `users` and `outbox_events`.
- A background Outbox Relay polls `outbox_events` (`status = 'PENDING'`) and publishes events to RabbitMQ topic exchange `campus.events` using a confirmed channel (`mandatory: true`, `persistent: true`).
- Upon broker confirmation, the outbox record is marked `status = 'DELIVERED'`.
- If RabbitMQ or downstream queue bindings are temporarily unavailable (e.g. broker rebooting or Credit Service still initialising), registration returns HTTP 201 immediately without failure, and the event remains `PENDING` in the database.
- The relay periodically retries pending records with incremented `retry_count`, maintaining the exact same `eventId` and payload across attempts.
- Records with malformed JSON or unsupported event types are permanent failures and are marked `FAILED`; they are not polled again and cannot block later records.
- **Delivery Guarantee**: At-least-once. Downstream consumers (Credit Service) must handle `user.registered` idempotently.

## API

| Method & path | Auth | Result |
|---|---|---|
| `POST /api/auth/register` | none | Creates a `username`/`email`/`password` account; does not create a session. |
| `POST /api/auth/login` | none | Returns access token and user; sets refresh-token cookie. Disabled account with correct credentials → 403 `ACCOUNT_DISABLED`. |
| `POST /api/auth/refresh` | refresh cookie or body | Rotates refresh token and returns access token. |
| `POST /api/auth/logout` | refresh cookie or body | Revokes that refresh session and clears the cookie. |
| `GET /api/users/me` | Bearer token | Returns authenticated profile. |
| `PATCH /api/users/me` | Bearer token | Updates username only; any other field in the body (`role`, `status`, `userId`, `email`) → 400 `INVALID_INPUT`. Taken username → 409 `DUPLICATE_USERNAME`. |
| `PUT /api/users/me/password` | Bearer token | Verifies current password (401 `INVALID_CURRENT_PASSWORD`) and changes password; 204. |
| `GET /api/users` | ADMIN Bearer token | 200 `{ users: [{ userId, username, email, userRole, status }] }`. |
| `PATCH /api/users/:id/toggle-status` | ADMIN Bearer token | Flips the target's `status`; 200 with the user; unknown UUID → 404 `USER_NOT_FOUND`. |
| `PATCH /api/users/:id/toggle-role` | ADMIN Bearer token | Flips the target's role between `STUDENT` and `ADMIN`; 200 with the user; own id → 403 `SELF_ACTION_FORBIDDEN`; last-admin demotion → 409 `LAST_ADMIN_REQUIRED`; unknown UUID → 404 `USER_NOT_FOUND`. |
| `DELETE /api/users/:id` | Bearer token; own id, or ADMIN for any id | Deletes the account and, by cascade, its sessions; clears the refresh cookie on self-deletion; 204; last-admin deletion → 409 `LAST_ADMIN_REQUIRED`; another user's id as `STUDENT` → 403 `FORBIDDEN`; unknown UUID → 404 `USER_NOT_FOUND`. |

There is no `GET /api/users/:id` route (404 "Route not found"). `PATCH /api/users/:id/admin` and
`POST /api/users/:id/promote` no longer exist; the two toggle routes above replaced them.

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
| Promote or demote a user (`PATCH /api/users/:id/toggle-role`) | 401 | 403 | yes, except own id (403) or last admin (409) |
| Delete own account (`DELETE /api/users/:id`) | 401 | yes | unless last admin (409) |
| Delete another user's account (`DELETE /api/users/:id`) | 401 | 403 | unless target is last admin (409) |
| List, search, read suppliers (`GET /api/suppliers`, `/:id`) | yes | yes | yes |
| Create, edit, toggle, delete suppliers | 401 | 403 | yes |
| Log in to the admin portal UI | — | refused by the portal's login gate | yes |

New registrations always get `STUDENT`. After a fresh seed the only `ADMIN` is the seeded account; an `ADMIN` can make
another user an `ADMIN` with `toggle-role`. The seed puts the three seed accounts' roles back on every container boot.

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

Items with a UAT check ID in brackets were observed on `main` @ f0ee632 (see `../evidence/d2/d2-checklist.md`);
the updated admin-removal guards and self-deletion session cleanup have PostgreSQL integration coverage.

- `status` is read by login (a disabled account gets 403 `ACCOUNT_DISABLED`, checked after the password; A6 fixed 2026-10-01) but not by refresh or the auth middleware: an already-issued access token and refresh session keep working until they expire [A11].
- `PATCH /api/users/:id/toggle-role` still refuses the caller's own id. Role changes and deletions share a PostgreSQL transaction advisory lock; the remaining-admin check and mutation commit together. Attempts to demote or delete the last `ADMIN` return 409 `LAST_ADMIN_REQUIRED`, including concurrent requests across service instances. This guard counts `ADMIN` roles, independently of `status`.
- `DELETE /api/users/:id` allows admin self-deletion only when another admin remains. Successful self-deletion clears the refresh cookie and cascades to all sessions. The admin portal immediately clears its local session and returns to login; deleting someone else keeps the caller signed in.
- `PATCH /api/users/:id/toggle-status` (formerly `/admin`) does not compare the target with the caller or count remaining admins: the seeded admin can disable its own account, including when it is the only `ADMIN` [A8].
- A non-UUID `:id` on `toggle-status` returns 500 `Internal server error` [A10].
- Refresh rotation: a replayed (already rotated) refresh cookie gets 401 `INVALID_SESSION`; the current cookie keeps working [L7, L8].
- Refresh cookie: `HttpOnly`, `Path=/api/auth`, about 1 day, or about 30 days with `keepLoggedIn: true` [L2, L5].
- No password or password hash appears in any response [R3, P3].
- Through the gateway, `GET /api/users` without a trailing slash is answered by nginx with a 301 to `/api/users/` (only `/api/users/` has a `location` block in `gateway/nginx.conf`) [A0].

## Tests

- `npm test --workspace=@campus-errand/user-service` — 92 unit tests in `test/` (Node's built-in runner via `tsx`, no database): validation rules, scrypt hashing, token signing, the auth and user modules against in-memory repositories, and the assembled app over HTTP (cookies, token errors, RBAC, self-target rules, error bodies).
- `npm run test:d2` — Scenario 4 covers the user list, `toggle-status` and `toggle-role`. The last recorded run (40/44, on f0ee632) predates that rewrite.
- `tests/postman/` — Postman collection and environment for this service and Supplier Service, run against ports 8001 / 8002.
- `node scripts/uat/uat-d2-api.mjs` — 63 API checks against a running stack; the recorded results in `../evidence/d2/` are from f0ee632.

### Admin concurrency regression checks

Set `ADMIN_GUARD_TEST_DATABASE_URL` to a disposable PostgreSQL database, then run from the repository root:

```bash
node --import tsx --test services/user-service/test/admin-guard.integration.test.ts
```

The suite creates and removes a random schema using the existing migrations. It checks concurrent demotion, deletion and mixed requests through two app instances, last-admin rejection, and session/cookie cleanup. Without the environment variable, these database tests are skipped by `npm test`. Existing account tables are not modified.
