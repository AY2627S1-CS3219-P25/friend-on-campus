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

# user-service

**Status:** real — Prisma with PostgreSQL. Port **8001**, database **`user_db`**.

## Responsibilities

The service owns account registration, login sessions, refresh-token rotation, logout,
and an authenticated user's profile and password. Other services verify issued access
tokens locally with `@campus-errand/auth`.

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
| `SESSION_SECRET` | Symmetric HMAC-SHA256 session token signing & verification | `dev-campuserrand-session-secret-key-32-chars-minimum` |
| `JWT_ISSUER` | access-token issuer claim | `friend-on-campus-user-service` |
| `JWT_AUDIENCE` | access-token audience claim | `friend-on-campus-services` |
| `JWT_ACCESS_TOKEN_TTL` | access-token lifetime | `15m` |
| `JWT_REFRESH_TOKEN_TTL` | ordinary refresh-session idle lifetime | `1d` |
| `JWT_PERSISTENT_REFRESH_TOKEN_TTL` | keep-logged-in idle lifetime | `30d` |
| `CORS_ORIGIN` | credentialed browser origin | `http://localhost:5173` |

## Persistence

`src/database/prisma/schema.prisma` defines `User` and `Session`.

- `users`: UUID, username, email, password hash, `STUDENT`/`ADMIN` role, and timestamps.
- `sessions`: UUID, user reference, refresh-token hash, persistence flag, timestamps, and idle expiry.
- Usernames and emails are unique case-insensitively through PostgreSQL indexes.
- `src/database/prisma/migrations/` is the service migration source, deployed automatically on container startup or via `npm run db:migrate`. The tables are owned exclusively by User Service and are no longer created in the shared postgres-init script.

The Prisma repositories are `src/persistence/auth-repository.ts` and
`src/persistence/user-repository.ts`; no runtime `pg` pool is used.

## API

| Method & path | Auth | Result |
|---|---|---|
| `POST /api/auth/register` | none | Creates a `username`/`email`/`password` account; does not create a session. |
| `POST /api/auth/login` | none | Returns access token and user; sets `session` cookie (Path=/) and `refresh_token` cookie (Path=/api/auth). |
| `GET /api/auth/verify` | `session` cookie or Bearer | Gateway verification subrequest; returns `200` with `X-Auth-User-Id`, `X-Auth-User-Role`, and `X-Auth-User-Email` headers, or `401`. |
| `POST /api/auth/refresh` | refresh/session cookie or body | Rotates refresh token and returns access token; refreshes `session` cookie. |
| `POST /api/auth/logout` | refresh cookie or body | Revokes that refresh session and clears `session` and `refresh_token` cookies. |
| `GET /api/users/me` | Bearer token or Gateway header | Returns authenticated profile. |
| `PATCH /api/users/me` | Bearer token or Gateway header | Updates username only; email is immutable. |
| `PUT /api/users/me/password` | Bearer token or Gateway header | Verifies current password and changes password. |
| `GET /api/users` | ADMIN Bearer token or Gateway header | Returns list of all registered users (or `501 Not Implemented` in deferred mock mode). |
| `GET /api/users/:id` | ADMIN Bearer token or Gateway header | Deferred user-management placeholder; returns a structured `501 Not Implemented` response. |
| `POST /api/users/:id/promote` | ADMIN Bearer token or Gateway header | Deferred user-management placeholder; returns a structured `501 Not Implemented` response. |
| `PATCH /api/users/:id/admin` | ADMIN Bearer token or Gateway header | Toggles active status of target user. |

The endpoint-level request and response examples are in
[`../../services/user-service/docs/api-reference.md`](../../services/user-service/docs/api-reference.md).

## Authentication and sessions

Sessions use symmetric HMAC-SHA256 (HS256) stateless session tokens placed into an `HttpOnly`, `SameSite=Lax`, `Path=/` cookie named `session`. When requests pass through the NGINX API Gateway, NGINX executes an internal subrequest to `GET /api/auth/verify`. Upon verification, NGINX injects `X-User-Id`, `X-User-Role`, and `X-User-Email` upstream headers into downstream microservices (e.g. `supplier-service`, `order-service`).

Downstream services consuming `@campus-errand/auth` inspect these gateway headers directly, bypassing cryptographic verification while retaining dual-mode direct token verification for local integration tests.

## Development seed accounts

`npm run db:seed --workspace=@campus-errand/user-service` creates or updates
`alice`, `bob`, and `admin` with `Password123!`. Alice and Bob have the `STUDENT`
role; Admin has `ADMIN`.
