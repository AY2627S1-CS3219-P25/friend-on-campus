<!--
AI Assistance Disclosure:
Tool: Codex (model: GPT-6), date: 2026-11-09
Scope: Reconcile implementation guidance with current source, simplify duplication and preserve historical attribution.
Author review: <to be completed by the author>

Tool: Codex (model: GPT-6), date: 2026-10-25
Scope: Source-linked implementation documentation and evidence review requested by Reallyeasy1.
Author review: <to be completed by Reallyeasy1>
-->

# Shared authentication package

Implementation baseline: [`b989758`](https://github.com/AY2627S1-CS3219-P25/friend-on-campus/commit/b989758e766cb593c3b8c94102eb6dfb5c7d8491); source inspected 2026-11-09 (SGT). This describes the repository, not a verified live deployment.

`@campus-errand/auth` performs offline Ed25519 access-token verification and exposes Express middleware. User Service owns issuance and refresh sessions. The existing package README remains its usage reference.

| Export | Responsibility |
|---|---|
| readPublicKey | Decode/validate 59-character base64url DER SPKI Ed25519 key |
| verifyAccessToken | Verify token and return authenticated principal |
| authMiddleware | Parse Bearer token and populate res.locals.auth |
| requireAdmin | Require ADMIN role in verified principal |
| AuthenticatedPrincipal, AuthMiddlewareOptions, UserRole | Shared compile-time types |

Verification requires EdDSA/JWT header, valid signature, nonempty sub/sid, STUDENT or ADMIN role, optional username length 1–50, integer iat/exp, expected issuer/audience, future expiry, and issuance no more than 60 seconds ahead. The principal carries user/session IDs, role and optional display name.

No database/session/current-role lookup occurs. Logout, account disable/deletion, password changes and role changes do not immediately revoke already issued tokens in downstream services. Refresh behavior in User is separate. Routes still enforce owner/state rules after authentication.

Missing/invalid/expired credentials map to shared 401 codes; authenticated nonadmins receive 403 from requireAdmin. Supplier public reads intentionally omit this middleware. Chat and Notification also use the verifier outside Express for socket authentication, then apply their own access rules. Order has an explicit development-header fallback when no JWT public key is configured and `ORDER_DEV_AUTH=1` or `true`; it is not a shared-auth feature. Gateway routing is not authentication.

The package has build/typecheck and no dedicated test script. User token tests, Supplier HTTP tests and Chat/Notification socket tests exercise it through consumers. Root typechecking checks interface use, not every cryptographic/security scenario. Consult [security](../architecture/authentication-and-security.md) for cross-service limits and the verification record for actual checks.

## Source evidence and related reading

- [`packages/auth/src/index.ts`](../../packages/auth/src/index.ts)
- [`packages/auth/package.json`](../../packages/auth/package.json)
- [`packages/auth/README.md`](../../packages/auth/README.md)
- [`services/user-service/src/auth/tokens.ts`](../../services/user-service/src/auth/tokens.ts)
- [Wiki: Authentication and Roles](https://github.com/AY2627S1-CS3219-P25/friend-on-campus/wiki/Authentication-and-Roles)
- [Documentation index](../README.md) · [Drift register](../audits/documentation-drift.md) · [Verification record](../audits/review-findings.md)
