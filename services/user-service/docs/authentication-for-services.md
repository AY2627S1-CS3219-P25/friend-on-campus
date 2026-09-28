<!--
AI Assistance Disclosure:
Tool: Google Antigravity Agent, date: 2026-09-28
Scope: Purged Ed25519 documentation. Updated guide to describe NGINX gateway authentication offloading and symmetric SESSION_SECRET verification.
Author review: (to be completed by author after review)
-->
<!--
AI Assistance Disclosure:
Tool: Claude Code (model: Claude Fable 5.1), date: 2026-09-23
Scope: Updated the access-token payload section to the RFC 7519 registered claim names (sub, sid, role, iat, exp, iss, aud).
Author review: <to be completed by ngkhengyang>
-->

# Authentication for Backend Services

Use this document when adding authentication to a backend HTTP route.

## Ownership and Architecture

- **NGINX Gateway Offloading:** All external requests enter through the NGINX API Gateway. For protected endpoints, NGINX executes an internal subrequest to `user-service` (`GET /api/auth/verify`) using the `session` cookie or bearer token. On success, NGINX injects trusted identity headers (`X-User-Id`, `X-User-Role`, `X-User-Email`) downstream.
- **Direct Verification (Local/Testing):** For requests hitting microservices directly without NGINX, `@campus-errand/auth` verifies tokens signed symmetrically with `SESSION_SECRET` (HMAC-SHA256).
- **User Service:** Owns login, logout, session verification, password hashing, and user profile persistence.
- **Resource Ownership:** Each resource-owning service decides authorization beyond the platform `ADMIN` role, such as order ownership or wallet access.

## Setup

Add the shared package to the service's `package.json`:

```json
"@campus-errand/auth": "*"
```

Configure the service with the shared session secret:

```env
SESSION_SECRET=<copy from root .env>
JWT_ISSUER=friend-on-campus-user-service
JWT_AUDIENCE=friend-on-campus-services
```

## Access-token payload

An access/session token issued by the User Service contains this payload:

```json
{
  "sub": "a-user-id",
  "sid": "a-session-id",
  "role": "STUDENT",
  "email": "user@u.nus.edu",
  "iat": 1789870000,
  "exp": 1789870900,
  "iss": "friend-on-campus-user-service",
  "aud": "friend-on-campus-services"
}
```

The claim names are the RFC 7519 registered ones, so standard JWT libraries (`jsonwebtoken`, `jose`) also enforce expiry, issuer, and audience.

| Claim | Meaning |
|---|---|
| `sub` | ID of the authenticated user. Use this for ownership checks. |
| `sid` | ID of the login session that issued the token. |
| `role` | Platform role: `STUDENT` or `ADMIN`. |
| `email` | User email address. |
| `iat` | Time the token was issued, as Unix time in seconds. |
| `exp` | Time the token expires, as Unix time in seconds. |
| `iss` | Service that issued the token. It must match the middleware configuration. |
| `aud` | Services allowed to accept the token. It must match the middleware configuration. |

## Protect HTTP routes

Create the authentication middleware once during startup:

```ts
import { authMiddleware, requireAdmin } from '@campus-errand/auth';

const authenticate = authMiddleware({
  secretKey: process.env.SESSION_SECRET,
  issuer: process.env.JWT_ISSUER ?? 'friend-on-campus-user-service',
  audience: process.env.JWT_AUDIENCE ?? 'friend-on-campus-services',
});
```

Apply it before protected handlers:

```ts
app.get('/api/credits/wallet', authenticate, getWallet);
app.post('/api/suppliers', authenticate, requireAdmin, createSupplier);
```

`requireAdmin` must run after `authenticate`.

After authentication, use the verified identity:

```ts
const { userId, sessionId, role, email } = res.locals.auth;
```

`userId`, `sessionId`, `role`, and `email` are populated either from NGINX's forwarded gateway headers or by `@campus-errand/auth` verifying the session token directly.

## Responses and refresh

The middleware responds with:

| Status | Code | Meaning |
|---:|---|---|
| `401` | `MISSING_TOKEN` | No session cookie or Bearer token was supplied |
| `401` | `TOKEN_EXPIRED` | The access token expired |
| `401` | `INVALID_TOKEN` | Signature, claims, issuer, or audience are invalid |
| `403` | `ADMIN_REQUIRED` | The authenticated user is not an administrator |

Token refresh is separate from this package. When the frontend receives `401 TOKEN_EXPIRED`, its shared request wrapper calls `POST /api/auth/refresh` and retries the original request once.

## Authorization rules

Authentication establishes who is calling. The route must still enforce its own resource rules. Examples include checking that the authenticated user owns a wallet, requested an order, or is the assigned courier. `requireAdmin` only implements the platform-wide `ADMIN` role check.
