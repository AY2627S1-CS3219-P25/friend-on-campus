<!--
AI Assistance Disclosure:
Tool: Codex (model: GPT-6), date: 2026-11-09
Scope: Reconcile the active documentation with main b989758 and simplify navigation; preserve historical attribution.
Author review: <to be completed by Reallyeasy1>

Tool: Codex (model: GPT-6), date: 2026-10-25
Scope: Source-linked implementation documentation and evidence review requested by Reallyeasy1.
Author review: <to be completed by Reallyeasy1>
-->

# Authentication and authorization

Implementation inspected at [`b989758`](https://github.com/AY2627S1-CS3219-P25/friend-on-campus/commit/b989758e766cb593c3b8c94102eb6dfb5c7d8491) on 9 November 2026 (SGT). This is a code/configuration reference, not verification of the live deployment.

User signs Ed25519 access tokens. Downstream services verify them offline through the [shared auth package](../packages/auth.md). NGINX routes requests; backend services enforce roles and ownership. These are implementation facts, not a security certification.

| Layer | Implemented control | Important limit |
|---|---|---|
| Login | Password verification and enabled-account check | Registration and wallet initialization are separate asynchronous steps |
| Access token | Signature, issuer, audience, expiry and claim checks; default lifetime 15 minutes | Verification does not query User sessions or account state per request |
| Refresh | Opaque token hash stored in User sessions; conditional rotation; enabled-user check | Default idle windows are one day, or 30 days with keep-logged-in |
| Cookie | HttpOnly, SameSite=Lax, `/api/auth` path; Secure in production | Local development does not imply end-to-end production TLS |
| HTTP | Service-specific role and ownership checks | Supplier directory reads are public; writes require ADMIN |
| Notification socket | First-frame authentication, expiry enforcement and user-scoped delivery | A successful socket upgrade is not authenticated access |
| Chat | Participant authorization for sending; participant or ADMIN for history | Checks use the local conversation projection; unassignment freshness and admin-read policy remain documented gaps |

See [User contracts](../services/user-service/contracts-and-data.md) for session rotation and administrative actions, and [Chat](../services/chat-service/README.md) for its exact read/send rules. The frontends keep access tokens in memory and refresh through User.

## Revocation and configuration boundaries

Logout removes the matching refresh session. Disabling an account prevents new login/refresh; these actions do not immediately invalidate an already-issued JWT at offline downstream verifiers. Password change updates the password without automatically revoking all existing sessions. Do not document immediate global logout as a guarantee.

Order has an explicit development exception: when the public key is absent, `ORDER_DEV_AUTH=1` or `true` enables `x-user-id` / `x-user-role` authentication. This is not gated by `NODE_ENV`; it must not be enabled for an exposed deployment. See [Order startup](../../services/order-service/src/index.ts).

Local Compose publishes development service ports. The cloud configuration restricts the ALB entry to CloudFront and an origin header, but CloudFront-to-ALB is configured as HTTP. Viewer HTTPS alone is not encryption on that origin hop. Refer to [gateway routing](../infrastructure/api-gateway.md) and [cloud configuration](../new-cloud-architecture-guide.md).

Document variable names and safe examples from [`.env.example`](../../.env.example); never copy live secrets. Authentication middleware, UI validation, network controls and application authorization cover different boundaries.

Sources: [User auth module](../../services/user-service/src/auth/auth-module.ts), [User configuration](../../services/user-service/src/config.ts), [shared verifier](../../packages/auth/src/index.ts), [gateway](../../gateway/nginx.conf).

[Documentation index](../README.md) · [Known discrepancies](../audits/documentation-drift.md) · [Verification](../audits/review-findings.md)
