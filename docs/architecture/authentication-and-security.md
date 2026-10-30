<!--
AI Assistance Disclosure:
Tool: Codex (model: GPT-6), date: 2026-10-25
Scope: Source-linked implementation documentation and evidence review requested by Reallyeasy1.
Author review: <to be completed by Reallyeasy1>
-->

# Authentication and authorization

Implementation baseline: [`52d791e`](https://github.com/AY2627S1-CS3219-P25/friend-on-campus/commit/52d791e4eea28ce7d817f025ef096f8d96bda467); inspected 2026-10-25 (SGT). Pending work is explicitly labelled.

User Service signs Ed25519 access tokens. Other services and the Notification socket authenticator verify them offline through `@campus-errand/auth`; NGINX routes requests and does not check credentials. Order has an explicit development exception: without a public key, ORDER_DEV_AUTH=1/true enables x-user-id/x-user-role identity; otherwise startup fails. This page states implemented controls, not a security certification.

| Layer | Implemented control | Boundary |
|---|---|---|
| Login | Password verification and enabled-account check | Registration itself returns a user; frontend then logs in |
| Access token | Signature, issuer, audience, expiry and claim validation; default 15-minute TTL | Existing claims remain valid offline until expiry; no per-request session lookup in shared auth |
| Refresh | Opaque token hash stored in sessions; conditional rotation; idle expiry; disabled-user rejection | Replayed old token is rejected without revoking the replacement session |
| Cookie | HttpOnly, SameSite=Lax, /api/auth path; Secure in production | Development cookies are not unconditionally Secure |
| HTTP authorization | Service-specific ADMIN/owner checks | Public Supplier reads are an explicit current implementation exception |
| Socket | First-frame AUTH within 5 seconds; user-scoped registry; close at token expiry | Connection upgrade alone is not authentication |

The frontend holds access tokens in memory and performs refresh-and-retry. The default normal refresh idle window is one day; persistent sessions use 30 days. Password change, logout, disabling and demotion have different effects; do not claim immediate downstream access-token revocation. User administrative mutations use last-admin checks with a database advisory lock, while the enabled-admin interpretation remains an existing documented question.

REST ownership derives from authenticated identity rather than a client-supplied notification/wallet user ID. Order limits PENDING/REJECTED detail visibility to requester/admin and restricts user-ID filtering. Supplier ADMIN mutation enforcement occurs in the service even if the UI hides controls.

## Operational boundaries

The local gateway config does not supply TLS, rate limiting or token validation. Compose exposes development ports in addition to ingress. Public repository development credentials are not production secrets and must not be represented as a production deployment model. Read only `.env.example` when documenting variables; never copy live environment values.

Sources and tests establish individual controls. Authentication UAT and integration checks do not establish that every security/NFR issue is closed. See User/Supplier service contracts, [auth package](../packages/auth.md), and the drift register.

## Source evidence and related reading

- [`services/user-service/src/auth/auth-module.ts`](../../services/user-service/src/auth/auth-module.ts)
- [`services/user-service/src/auth/auth-routes.ts`](../../services/user-service/src/auth/auth-routes.ts)
- [`services/user-service/src/config.ts`](../../services/user-service/src/config.ts)
- [`packages/auth/src/index.ts`](../../packages/auth/src/index.ts)
- [`services/notification-service/src/ws/hub.ts`](../../services/notification-service/src/ws/hub.ts)
- [`gateway/nginx.conf`](../../gateway/nginx.conf)
- [Wiki: Authentication and Roles](https://github.com/AY2627S1-CS3219-P25/friend-on-campus/wiki/Authentication-and-Roles)
- [Documentation index](../README.md) · [Drift register](../audits/documentation-drift.md) · [Verification record](../audits/review-findings.md)
