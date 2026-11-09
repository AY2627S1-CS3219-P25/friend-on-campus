<!--
AI Assistance Disclosure:
Tool: Codex (model: GPT-6), date: 2026-11-09
Scope: Reconcile implementation guidance with current source, simplify duplication and preserve historical attribution.
Author review: <to be completed by the author>

Tool: Codex (model: GPT-6), date: 2026-10-25
Scope: Source-linked implementation documentation and evidence review requested by Reallyeasy1.
Author review: <to be completed by Reallyeasy1>
-->

# User contracts and data

Implementation baseline: [`b989758`](https://github.com/AY2627S1-CS3219-P25/friend-on-campus/commit/b989758e766cb593c3b8c94102eb6dfb5c7d8491); source inspected 2026-11-09 (SGT). This describes the repository, not a verified live deployment.

This is the implemented API at the pinned baseline. `UserDTO` contains userId, username, email, userRole and status; credential/session internals are not returned.

| Method/path | Input and access | Success | Domain failures |
|---|---|---|---|
| GET /health | Public | 200 {service:"user-service",status:"UP"} | — |
| GET /ready | Public | 200 status/dependencies.database | 503 database/schema unavailable |
| POST /api/auth/register | Public; username,email,password | 201 data:{user}; no token | 400 INVALID_INPUT; 409 DUPLICATE_EMAIL/USERNAME |
| POST /api/auth/login | Public; email,password,keepLoggedIn? | 200 data:{accessToken,accessTokenExpiresInSeconds,user}; cookie | 400 input; 401 INVALID_CREDENTIALS; 403 ACCOUNT_DISABLED |
| POST /api/auth/refresh | Cookie, else body refreshToken | 200 data:{accessToken,accessTokenExpiresInSeconds}; rotated cookie | 401 INVALID_SESSION |
| POST /api/auth/logout | Same token lookup; missing/unknown token harmless | 204; clear cookie | Unexpected storage failure 500 |
| GET /api/users/me | Bearer | 200 data:{user} | 404 USER_NOT_FOUND |
| PATCH /api/users/me | Bearer; exactly {username} | 200 data:{user} | 400 extra/invalid fields; 409 duplicate; 404 missing |
| PUT /api/users/me/password | Bearer; currentPassword,newPassword | 204 | 400 input; 401 INVALID_CURRENT_PASSWORD; 404 missing |
| GET /api/users | ADMIN | 200 data:{users}, username order | 403 ADMIN_REQUIRED |
| PATCH /api/users/:id/toggle-status | ADMIN; UUID | 200 data:{user} | 400 UUID; 404 missing; 409 LAST_ADMIN_REQUIRED |
| PATCH /api/users/:id/toggle-role | ADMIN; not self | 200 data:{user} | 400 UUID; 403 SELF_ACTION_FORBIDDEN; 404; 409 last admin |
| DELETE /api/users/:id | Self or ADMIN | 204; self clears cookie | 400 UUID; 403 FORBIDDEN; 404; 409 last admin |

Protected routes also return shared-auth 401 MISSING_TOKEN/INVALID_TOKEN/TOKEN_EXPIRED. Success JSON carries `success:true`; 204 has no body. Known failures use `success:false,error,code`. Unexpected errors use generic error text and errorId/X-Error-Id. Malformed JSON maps to 400 INVALID_JSON; unknown routes return JSON 404.

Username is trimmed/nonblank and at most 50 JavaScript string units. Email is trimmed/lowercased, at most 320 characters, and validated by a simple address regex; no NUS-only domain rule is enforced. Password is not trimmed, must contain 8–24 Unicode code points, and has no complexity rule. UUID validation uses hexadecimal 8-4-4-4-12 form.

## SQL constraints and event contract

User username/email have case-insensitive unique LOWER(...) indexes in migration SQL, absent from Prisma @unique annotations. SQL also checks role and nonblank identity fields. Sessions reference User with local cascade deletion/update and unique refresh-token hash. `(user_id,idle_expires_at)` supports session lookup/expiry.

Registration writes user and JSON-text outbox row together. The payload is `eventId,eventType=user.registered,timestamp,userId,email,initialGrant=100`. The service publishes no user-deleted event and has no runtime broker publisher. Outbox status/retryCount fields remain despite CDC replacing polling.

There are no cross-database foreign keys or automatic Order/Credit/Notification cleanup on account deletion. A stored token hash is not a recoverable refresh token.


## Persistence reference

| Model | Stored responsibility |
|---|---|
| `User` | Identity, password hash, role/status and timestamps |
| `Session` | User reference, unique refresh-token hash, persistence flag and idle expiry |
| `OutboxEvent` | Registration event payload and timestamps; retained polling-era fields are not CDC delivery acknowledgements |

Use the [Prisma schema](../../../services/user-service/prisma/schema.prisma) for exact fields and the migration links below for SQL-only constraints. This guide does not maintain a second schema copy.

## Source evidence and related reading

- [`services/user-service/src/auth/auth-routes.ts`](../../../services/user-service/src/auth/auth-routes.ts)
- [`services/user-service/src/users/user-routes.ts`](../../../services/user-service/src/users/user-routes.ts)
- [`services/user-service/src/utils/validation.ts`](../../../services/user-service/src/utils/validation.ts)
- [`services/user-service/prisma/schema.prisma`](../../../services/user-service/prisma/schema.prisma)
- [`services/user-service/prisma/migrations/20260922170000_initial_user_service/migration.sql`](../../../services/user-service/prisma/migrations/20260922170000_initial_user_service/migration.sql)
- [`services/user-service/prisma/migrations/20260923150000_add_user_status/migration.sql`](../../../services/user-service/prisma/migrations/20260923150000_add_user_status/migration.sql)
- [`services/user-service/prisma/migrations/20261003233000_add_outbox_events/migration.sql`](../../../services/user-service/prisma/migrations/20261003233000_add_outbox_events/migration.sql)
- [Wiki: User Service](https://github.com/AY2627S1-CS3219-P25/friend-on-campus/wiki/User-Service)
- [Documentation index](../../README.md) · [Drift register](../../audits/documentation-drift.md) · [Verification record](../../audits/review-findings.md)
