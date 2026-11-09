<!--
AI Assistance Disclosure:
Tool: Codex (model: GPT-6), date: 2026-11-09
Scope: Reconcile implementation guidance with current source, simplify duplication and preserve historical attribution.
Author review: <to be completed by the author>

Tool: Codex (model: GPT-6), date: 2026-10-25
Scope: Source-linked implementation documentation and evidence review requested by Reallyeasy1.
Author review: <to be completed by Reallyeasy1>
-->

# Admin application

Implementation baseline: [`b989758`](https://github.com/AY2627S1-CS3219-P25/friend-on-campus/commit/b989758e766cb593c3b8c94102eb6dfb5c7d8491); source inspected 2026-11-09 (SGT). This describes the repository, not a verified live deployment.

The React/Vite admin app provides Supplier, User and Order management and a service-health dashboard. `App.tsx` selects pages using local state. The built application is served under `/admin/`.

## Find the implementation

Paths below are relative to [`apps/admin-portal/src/`](../../apps/admin-portal/src).

| Area | Entry points and behavior |
|---|---|
| Session | `hooks/useAdminAuth.ts`, `api/auth.ts`, `pages/AdminLoginPage.tsx`: login/refresh, in-memory token and ADMIN UI gate |
| Suppliers | `pages/SuppliersPage.tsx`, `components/SupplierModals.tsx`: filter/sort, create/edit, coordinates, toggle and delete |
| Users | `pages/UsersPage.tsx`, `components/UserModals.tsx`: list, role/status and delete controls |
| Orders | `pages/OrdersPage.tsx`, `components/OrderActionModal.tsx`: queries and administrative cancel/complete/unassign |
| Disputes | `components/DisputeModal.tsx`: display both parties' reports and resolve through existing refund/cancel or complete actions |
| Health | `pages/HealthPage.tsx`, `api/health.ts`: poll liveness/readiness for all six services, including Chat |

The client checks a decoded role for presentation. Services separately verify tokens and enforce permissions. Refresh is shared while in flight and a protected request receives one refresh-and-retry. Current role/status changes do not immediately invalidate downstream offline access tokens; see [shared authentication](../packages/auth.md).

## Mutations and failure states

Forms validate input before sending. Server rules decide duplicate supplier/user conflicts, last-admin protections and order transitions. New suppliers require numeric coordinates; existing suppliers with missing coordinates remain editable. [Coordinate upgrades](../services/supplier-service/coordinate-upgrades.md) explains the API/database distinction.

Dispute filtering checks the order's `dispute` flag. It does not depend on a transition to the shared DTO's `DISPUTED` status. Administrative completion/refund actions still follow the Order/Credit asynchronous flow; inspect final order and wallet state when validating the business result.

A failed Supplier fetch displays static `FALLBACK_SUPPLIERS` with a warning currently calling them “cached records.” They are neither a live result nor a cache of this user's previous response. Failed User/Order fetches clear their lists. This limitation is recorded here rather than described as reliable offline data.

## Health display

The Health page polls `/api/health/<service>/health` and `/ready` while that page is active. Each probe has a four-second timeout. Liveness and readiness combine into ONLINE, DEGRADED or OFFLINE; the displayed latency is the duration of the pair of HTTP probes. It is not an NFR benchmark, persistent monitoring system, alert delivery mechanism or proof of successful CDC/Saga processing.

## Run and test

```sh
npm run dev -w @campus-errand/admin-portal
npm run typecheck -w @campus-errand/admin-portal
npm run test:unit -w @campus-errand/admin-portal
```

The unit script currently runs supplier-form helper tests, not every page or modal. API/browser UAT covers selected role and administration flows; see [testing](../development/testing-strategy.md) for actual execution and prerequisites. Host Vite and static-container routing are described in the [gateway guide](../infrastructure/api-gateway.md).

## Source and related reading

- [App composition and fallbacks](../../apps/admin-portal/src/App.tsx) · [Session handling](../../apps/admin-portal/src/hooks/useAdminAuth.ts)
- [Order/dispute UI](../../apps/admin-portal/src/pages/OrdersPage.tsx) · [Health client](../../apps/admin-portal/src/api/health.ts)
- [Package scripts](../../apps/admin-portal/package.json) · [Supplier form tests](../../apps/admin-portal/test/supplier-form.test.ts)
- [Documentation index](../README.md) · [Drift register](../audits/documentation-drift.md) · [Verification record](../audits/review-findings.md)
