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

An access/session token issued by the User Service (using `jose`) contains this RFC 7519 payload:

```json
{
  "sub": "a-user-id",
  "role": "STUDENT",
  "iat": 1789870000,
  "exp": 1789870900,
  "iss": "friend-on-campus-user-service",
  "aud": "friend-on-campus-services"
}
```

Standard JWT libraries (such as `jose`) enforce expiry, issuer, audience, and the `HS256` signature.

| Claim | Meaning |
|---|---|
| `sub` | ID of the authenticated user (UUID). Use this for resource ownership checks. |
| `role` | Platform role: `STUDENT` or `ADMIN`. |
| `iat` | Time the token was issued, as Unix time in seconds. |
| `exp` | Time the token expires, as Unix time in seconds. |
| `iss` | Service that issued the token (`friend-on-campus-user-service`). |
| `aud` | Services allowed to accept the token (`friend-on-campus-services`). |

## Accessing User Identity in Microservices

Behind the NGINX API Gateway perimeter, NGINX verifies the session token and forwards identity via internal headers:
- `X-User-Id`
- `X-User-Role`

Microservices extract this identity using `getSessionUser(req)` from `@campus-errand/auth`:

```ts
import { getSessionUser } from '@campus-errand/auth';

app.get('/api/orders/mine', (req, res) => {
  const session = getSessionUser(req);
  if (!session) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  const { userId, role } = session;
  // Use userId for ownership checks (e.g. SELECT * FROM orders WHERE customer_id = userId)
});
```

## Authorization rules

Authentication establishes who is calling (`userId` and `role`). The route must still enforce its own resource rules:
- Platform role enforcement (e.g., `ADMIN` requirement on supplier mutations) is handled at the Gateway perimeter.
- Domain ownership checks (e.g., checking that the authenticated `userId` owns the specific order, wallet, or errand) are handled in the service route handler using `session.userId`.

