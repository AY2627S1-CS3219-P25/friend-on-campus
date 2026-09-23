<!--
AI Assistance Disclosure:
Tool: Codex (model: GPT-5.6 Terra), date: 2026-09-23
Scope: Documented how backend services verify User Service Ed25519 access tokens, including interoperable JWT claims, and apply service-owned authorization.
Author review: <to be completed by ngkhengyang>
-->

# Authentication for Backend Services

Use this document when adding authentication to a backend HTTP route.

## Ownership

- The User Service signs short-lived access tokens with its private Ed25519 key and owns login, logout, refresh tokens, and sessions.
- `@campus-errand/auth` verifies access tokens locally with the public key. It does not call the User Service or query its database.
- Each resource-owning service decides authorization beyond the broad `ADMIN` role, such as order ownership or wallet access.

## Setup

Add the workspace dependency to the service's `package.json`:

```json
"@campus-errand/auth": "*"
```

Configure the service with the shared 59-character public key:

```env
JWT_PUBLIC_KEY=<Ed25519 public key>
JWT_ISSUER=friend-on-campus-user-service
JWT_AUDIENCE=friend-on-campus-services
```

Only the User Service receives `JWT_PRIVATE_KEY`.

## Access-token payload

An access token issued by the User Service contains this payload:

```json
{
  "sub": "a-user-id",
  "sid": "a-session-id",
  "role": "STUDENT",
  "iat": 1789870000,
  "exp": 1789870900,
  "iss": "friend-on-campus-user-service",
  "aud": "friend-on-campus-services"
}
```

| Attribute | Meaning |
|---|---|
| `sub` | ID of the authenticated user. Use this for ownership checks. |
| `sid` | ID of the login session that issued the token. Other services do not need to query or store the session. |
| `role` | Platform role: `STUDENT` or `ADMIN`. |
| `iat` | Time the token was issued, as Unix time in seconds. |
| `exp` | Time the token expires, as Unix time in seconds. |
| `iss` | Service that issued the token. It must match the middleware configuration. |
| `aud` | Services allowed to accept the token. It must match the middleware configuration. |

A JWT is encoded and signed, not encrypted. A client can read this payload, so do not place secrets in it. Do not trust a decoded payload directly; only use the identity exposed by `authMiddleware` after it verifies the signature, payload shape, expiry, issuer, and audience.

## Protect HTTP routes

Create the authentication middleware once during startup:

```ts
import { authMiddleware, requireAdmin } from '@campus-errand/auth';

const authenticate = authMiddleware({
  publicKey: process.env.JWT_PUBLIC_KEY!,
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
const { userId, sessionId, role } = res.locals.auth;
```

Only `userId`, `sessionId`, and `role` are exposed to route handlers. The remaining payload attributes are used internally by the middleware to validate the token.

Use `userId` from `res.locals.auth` for ownership checks. Treat user IDs supplied through request bodies, query parameters, or client-provided identity headers as untrusted.

## Responses and refresh

The middleware responds with:

| Status | Code | Meaning |
|---:|---|---|
| `401` | `MISSING_TOKEN` | No Bearer token was supplied |
| `401` | `TOKEN_EXPIRED` | The access token expired |
| `401` | `INVALID_TOKEN` | Signature, claims, issuer, or audience are invalid |
| `403` | `ADMIN_REQUIRED` | The authenticated user is not an administrator |

Token refresh is separate from this package. When the frontend receives `401 TOKEN_EXPIRED`, its shared request wrapper calls `POST /api/auth/refresh` and retries the original request once. Backend services should not refresh user tokens themselves.

Logout prevents future refreshes. An already-issued access token remains valid until its short expiry.

## Authorization rules

Authentication establishes who is calling. The route must still enforce its own resource rules. Examples include checking that the authenticated user owns a wallet, requested an order, or is the assigned courier. `requireAdmin` only implements the platform-wide `ADMIN` role check.

This package currently covers Express HTTP middleware. WebSocket authentication and service-to-service credentials require separate handling.
