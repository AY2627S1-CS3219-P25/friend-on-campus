<!--
AI Assistance Disclosure:
Tool: Claude Code (model: Claude Fable 5.1), date: 2026-09-21
Scope: Wrote this page from services/user-service source, docker-compose.yml, the init SQL and D1 / D2-plan text. Descriptive only.
Author review: <to be completed by the service owner>
-->

# user-service

**Status:** real — PostgreSQL via Prisma. Port **8001**, database **`user_db`**.

## Responsibilities (from the documents)

Account creation, login and sessions, profile management, one account acting as requester and courier, roles and access control, admin promotion. [D1 F1.1–F1.4; User Service N1–N3; D2 plan work package A]

## Run

```bash
docker compose up postgres -d
npm run db:seed --workspace=@campus-errand/user-service   # admin@nus.edu.sg, alice@u.nus.edu, bob@u.nus.edu (passwords in README)
npm run dev:user
```

## Configuration

| Variable | Used for | Default in code |
|---|---|---|
| `PORT` | listen port | `8001` |
| `DATABASE_URL` | Prisma connection | none — required (`src/.env` locally, compose in Docker) |
| `JWT_SECRET` | signing and verifying tokens | a hardcoded development string |

Token lifetime is the constant `JWT_EXPIRES_IN = '24h'` in `src/index.ts`. `RABBITMQ_URL` is set in compose but not read by the code.

## Files

`src/index.ts` (all routes, `generateToken`) · `src/middleware/authMiddleware.ts` (`authenticateToken`, `requireRole(...roles)`) · `src/database/client.ts` (Prisma client, loads `.env`) · `src/database/userRepository.ts` (`findUserByEmail/ById/ByMatric`, `createUser`, `updateUserProfile`, `updateUserRole`, `countAdmins`, `listUsers`, `toUserDTO`) · `src/database/seed.ts` · `src/database/prisma/schema.prisma` (no `migrations/` folder).

## API

| Method & path | Auth | Request | Success | Errors |
|---|---|---|---|---|
| `POST /api/auth/register` | none | `RegisterUserRequest`: `nusEmail, password, fullName, matricNumber, phoneNumber?, telegramHandle?` | 201 `{ token, user }` | 400 `VALIDATION_ERROR` / `INVALID_EMAIL` / `INVALID_PASSWORD`; 409 `EMAIL_EXISTS` / `MATRIC_EXISTS` |
| `POST /api/auth/login` | none | `nusEmail, password` | 200 `{ token, user }` | 400 `VALIDATION_ERROR`; 401 `INVALID_CREDENTIALS` (same message for unknown email and wrong password) |
| `GET /api/users/me` | Bearer | — | 200 `UserDTO` | 401; 404 |
| `PUT /api/users/profile` | Bearer | `fullName?, phoneNumber?, telegramHandle?` | 200 `UserDTO` | 401 |
| `POST /api/users/:id/promote` | Bearer + `ADMIN` | `{ role: 'STUDENT' \| 'ADMIN' }` | 200 `UserDTO` | 400 `INVALID_ROLE` / `LAST_ADMIN_PROTECTION`; 401; 403; 404 |
| `GET /api/users?page=&limit=` | Bearer (any role) | — | 200 `{ items, total, page, limit, totalPages }` (limit capped at 100, default 20) | 401 |
| `GET /api/users/:id` | **none** | — | 200 `UserDTO` | 404 |

Auth failures from the middleware: 401 `UNAUTHORIZED` (no token), 401 `INVALID_TOKEN` (bad or expired), 403 `FORBIDDEN` (role).

## Data

Table `users` (`schema.prisma` ↔ `docker/postgres-init/01-init-databases.sql`): `id` uuid, `nus_email` unique, `password_hash`, `full_name`, `matric_number` unique, `phone_number?`, `telegram_handle?`, `role` default `STUDENT`, `rating_avg` default 5.00, `total_completed_orders` default 0, `created_at`, `updated_at`. `UserDTO` never includes the hash.

## Behaviour as built

- Email must match `…@…nus.edu` or `…nus.edu.sg`; password 8–24 characters; bcrypt cost 10.
- Registration always sets role `STUDENT`; a `role` in the request body is ignored.
- Profile update only touches `fullName`, `phoneNumber`, `telegramHandle`; other fields in the body are ignored.
- Demoting an `ADMIN` is refused when `countAdmins() <= 1`.
- JWT payload (`JWTPayload`): `id, nusEmail, role, fullName`. Other services verify this token locally with the same secret; nothing calls back into user-service.
- No logout endpoint and no server-side session store: a token stays valid until it expires, and a role change does not affect tokens already issued.
- The register handler's comment mentions 100 welcome credits; no call to credit-service and no event is made.

## Differences from the documents

See `../requirements/conflicts.md` rows 8 (JWT vs the D2 plan's opaque cookie session), 9 (`STUDENT` vs `USER`), 12 (no username). Also observable: F1.2.2 "keep me logged in" and F1.2.3 logout have no counterpart in the code; D2 plan App. C lists `POST /api/auth/logout`.

## Tests

`npm run test:d2` (`scripts/test-d2-e2e.ts`) covers registration rules, login, profile immutability, last-admin protection and RBAC against supplier-service. It starts this service itself on 8001.

## Issues

#2–#5 (F1.1–F1.4), #23–#26, #48, #49 (NFRs), #70 (admin user search).
