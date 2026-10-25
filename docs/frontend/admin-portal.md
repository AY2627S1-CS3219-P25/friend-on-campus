<!--
AI Assistance Disclosure:
Tool: Codex (model: GPT-6), date: 2026-10-25
Scope: Source-linked implementation documentation and evidence review requested by Reallyeasy1.
Author review: <to be completed by Reallyeasy1>
-->

# Admin application

Implementation baseline: [`52d791e`](https://github.com/AY2627S1-CS3219-P25/friend-on-campus/commit/52d791e4eea28ce7d817f025ef096f8d96bda467); inspected 2026-10-25 (SGT). Pending work is explicitly labelled.

The admin React/Vite app provides User, Supplier and Order management plus a live service-health dashboard. App.tsx selects pages through local state; the built application is served under /admin/.

| Page/module | Responsibility |
|---|---|
| hooks/useAdminAuth.ts; api/auth.ts | Login/refresh, in-memory token, ADMIN UI gate and one-retry authenticated fetch |
| pages/AdminLoginPage.tsx | Login/error presentation |
| pages/SuppliersPage.tsx; components/SupplierModals.tsx | Directory filtering/sorting, create/update/toggle/delete |
| pages/UsersPage.tsx; components/UserModals.tsx | List users, role/status controls and deletion |
| pages/OrdersPage.tsx; components/OrderActionModal.tsx | Query orders and administrative cancel/complete/unassign with reason |
| pages/HealthPage.tsx; api/health.ts | Poll per-service /health and /ready through gateway, measure request latency |
| components/AdminHeader.tsx; AdminSidebar.tsx | Navigation and shell |

The frontend checks the decoded role for presentation. Services verify signature/claims and enforce ADMIN; manipulating client state cannot grant permission. Refresh is shared while in flight, tokens are kept in memory, and a failed protected request gets one refresh-and-retry. Revocation of offline token claims is limited by expiry.

## Mutation and failure flow

Modal validation precedes the corresponding API call; server responses remain authoritative for uniqueness, last-admin rules and Order transition conflicts. Refreshing the list follows a successful mutation. A disabled or demoted account's behavior depends on User refresh and downstream token semantics, not only the role displayed in the sidebar.

Health shows separate liveness/readiness results; a measured HTTP request duration is not an NFR benchmark or evidence that CDC delivery works. Source labels for service module numbers differ from root documentation, so these docs use service names. The old AuditPage placeholder is absent at this baseline.

When Supplier fetching fails, `App.tsx` displays static `FALLBACK_SUPPLIERS` with a warning. These are not live or cached server results. User/Order fetch failures instead clear their lists. This is observed existing behavior, not a recommendation to extend the fallback.

## Operations and testing

Host Vite uses /admin/ and direct service proxies unless configured otherwise. Container NGINX serves static assets and proxies API calls. Main has no app-specific unit test script; root typecheck/lint and browser/API UAT cover selected workflows, including role gates and administrative operations. There is no claim of exhaustive modal/render-state coverage or production browser compatibility testing.

Use [service contracts](../README.md) for exact endpoints and [testing strategy](../development/testing-strategy.md) for configured ingress and artifacts. No UI code changed in the documentation PR.

## Source evidence and related reading

- [`apps/admin-portal/src/App.tsx`](../../apps/admin-portal/src/App.tsx)
- [`apps/admin-portal/src/hooks/useAdminAuth.ts`](../../apps/admin-portal/src/hooks/useAdminAuth.ts)
- [`apps/admin-portal/src/api/health.ts`](../../apps/admin-portal/src/api/health.ts)
- [`apps/admin-portal/src/pages/OrdersPage.tsx`](../../apps/admin-portal/src/pages/OrdersPage.tsx)
- [`apps/admin-portal/src/pages/UsersPage.tsx`](../../apps/admin-portal/src/pages/UsersPage.tsx)
- [`apps/admin-portal/vite.config.ts`](../../apps/admin-portal/vite.config.ts)
- [`apps/admin-portal/nginx.conf`](../../apps/admin-portal/nginx.conf)
- [`scripts/uat/uat-d2-ui.mjs`](../../scripts/uat/uat-d2-ui.mjs)
- [Wiki: Frontend Apps](https://github.com/AY2627S1-CS3219-P25/friend-on-campus/wiki/Frontend-Apps)
- [Documentation index](../README.md) · [Drift register](../audits/documentation-drift.md) · [Verification record](../audits/review-findings.md)
