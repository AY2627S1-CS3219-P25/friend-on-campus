<!--
AI Assistance Disclosure:
Tool: Codex (model: GPT-6), date: 2026-10-25
Scope: Source-linked implementation documentation and evidence review requested by Reallyeasy1.
Author review: <to be completed by Reallyeasy1>
-->

# User Service implementation

Implementation baseline: [`52d791e`](https://github.com/AY2627S1-CS3219-P25/friend-on-campus/commit/52d791e4eea28ce7d817f025ef096f8d96bda467); inspected 2026-10-25 (SGT). Pending work is explicitly labelled.

User Service owns account identity, credentials, refresh sessions and user administration in `user_db`. It issues tokens and registration events; it does not create Credit wallets synchronously.

## Composition and modules

| File/module | Responsibility |
|---|---|
| src/index.ts | Creates Prisma/database facade, repositories, token manager, auth/user modules and Express app; installs SIGINT/SIGTERM cleanup |
| src/app.ts | CORS/cookies/JSON handling, request logging, /health and /ready, auth/users routers, centralized error handling |
| src/auth/auth-module.ts | Registration/login/refresh/logout orchestration and validation |
| src/auth/password.ts; tokens.ts | scrypt hashing/verification; Ed25519 token and opaque refresh-token operations |
| src/persistence/auth-repository.ts | Atomic account/outbox creation; session creation, cleanup, conditional rotation and revocation |
| src/users/user-module.ts | Profile/password and administrator operations |
| src/persistence/user-repository.ts | User queries/mutations and transaction advisory-lock safeguards |
| src/http/; src/utils/ | Error/request correlation, redaction, input validation |

Routes receive injected modules; modules depend on repository/token abstractions. Prisma remains behind persistence facades. Import the generated client via `src/database/client.ts`.

## Configuration

| Variable | Effective behavior/default |
|---|---|
| PORT / USER_SERVICE_PORT | 8001; integer 1–65535 |
| DATABASE_URL / USER_DATABASE_URL | Direct DATABASE_URL has priority; use safe .env.example for local setup |
| JWT_PRIVATE_KEY / JWT_PUBLIC_KEY | Required signing/verification keys |
| JWT_ACCESS_TOKEN_TTL | 15m |
| JWT_REFRESH_TOKEN_TTL | 1d idle lifetime |
| JWT_PERSISTENT_REFRESH_TOKEN_TTL | 30d idle lifetime |
| JWT_ISSUER / JWT_AUDIENCE | friend-on-campus-user-service / friend-on-campus-services |
| CORS_ORIGIN | http://localhost:5173; credentialed CORS |
| NODE_ENV | Secure cookie enabled for production |

Durations accept a positive integer and s/m/h/d suffix. Refresh cookie name is `refresh_token`, path `/api/auth`, HttpOnly, SameSite=Lax. Both ordinary and persistent sessions have expiry; keepLoggedIn changes lifetime.

The development seed creates deterministic Alice/Bob/Admin identities. Existing accounts found by case-insensitive email retain ID/status but may have username/role/password overwritten. It bypasses registration/outbox, so Credit is seeded separately. Containers run migrations and seed on each start. These are development semantics, not production account administration.

## Operations and navigation

Use workspace `dev`, `db:generate`, `db:deploy` and `db:seed` scripts. `/health` reports process liveness; `/ready` checks expected User/Session columns, not the outbox schema or CDC. Shutdown disconnects the database and closes the server. Request logging uses a generated X-Request-Id; unexpected errors expose a correlation ID, not internal details.

Read [contracts and data](contracts-and-data.md) for every route and model, [runtime and testing](runtime-and-testing.md) for transaction/authorization behavior, and [shared auth](../../packages/auth.md) for downstream verification. Unresolved behavioral differences belong in the drift register.

## Source evidence and related reading

- [`services/user-service/src/index.ts`](../../../services/user-service/src/index.ts)
- [`services/user-service/src/app.ts`](../../../services/user-service/src/app.ts)
- [`services/user-service/src/config.ts`](../../../services/user-service/src/config.ts)
- [`services/user-service/src/database/seed.ts`](../../../services/user-service/src/database/seed.ts)
- [`services/user-service/src/http/error-handler.ts`](../../../services/user-service/src/http/error-handler.ts)
- [`services/user-service/package.json`](../../../services/user-service/package.json)
- [Wiki: User Service](https://github.com/AY2627S1-CS3219-P25/friend-on-campus/wiki/User-Service)
- [Documentation index](../../README.md) · [Drift register](../../audits/documentation-drift.md) · [Verification record](../../audits/review-findings.md)
