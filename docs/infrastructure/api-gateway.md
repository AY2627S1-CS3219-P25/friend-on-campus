<!--
AI Assistance Disclosure:
Tool: Codex (model: GPT-6), date: 2026-10-25
Scope: Source-linked implementation documentation and evidence review requested by Reallyeasy1.
Author review: <to be completed by Reallyeasy1>
-->

# Gateway and proxy routing

Implementation baseline: [`52d791e`](https://github.com/AY2627S1-CS3219-P25/friend-on-campus/commit/52d791e4eea28ce7d817f025ef096f8d96bda467); inspected 2026-10-25 (SGT). Pending work is explicitly labelled.

The gateway is routing infrastructure. Service middleware performs authentication/authorization. A direct host service port, a host Vite proxy and a container NGINX proxy are different paths and should be named in test evidence.

| Incoming path | Destination/behavior |
|---|---|
| /api/auth/ and /api/users[/] | User 8001; API path retained |
| /api/suppliers[/] | Supplier 8002 |
| /api/orders[/] | Order 8003 |
| /api/credits/escrow prefix | Gateway 403; there is no current Credit HTTP escrow mutation route |
| /api/credits[/] | Credit 8004 |
| /api/notifications[/] | Notification 8005 |
| /api/health/{user,supplier,order,credit,notification}/{health,ready} | Rewrite to target service probe |
| /ws/ | Notification root path, HTTP/1.1 WebSocket upgrade |
| /admin | Redirect to /admin/ |
| /admin/ | Admin static frontend |
| /images/ | Mounted supplier image files |
| Other /api paths | Gateway 404 |
| / | Student static frontend |

API proxy locations forward normal authorization headers. The socket is authenticated after upgrade by an AUTH frame. Gateway socket timeouts are 86400 seconds; socket token expiry is independently enforced by Notification.

Host Vite configs default to individual backend services; `GATEWAY_URL` can route host development through the gateway. Container applications are built static assets with their own NGINX proxy configuration, not running Vite dev servers. Admin's base path is `/admin/`.

## Failure diagnostics

Compare service `/ready` directly with gateway probes when diagnosing 502. Static upstream resolution can retain a replaced container's address (tracked in issue #173). A process health response does not establish database or consumer readiness. NGINX connect timeout and frontend request cancellation are separate concerns; existing timeout issues are not fixed here.

No production route changes are included. Verify path tables against gateway plus both app NGINX/Vite files when deployments change. Browser UAT tests one configured ingress and does not prove every direct-port path has identical behavior.

## Source evidence and related reading

- [`gateway/nginx.conf`](../../gateway/nginx.conf)
- [`apps/student-app/nginx.conf`](../../apps/student-app/nginx.conf)
- [`apps/admin-portal/nginx.conf`](../../apps/admin-portal/nginx.conf)
- [`apps/student-app/vite.config.ts`](../../apps/student-app/vite.config.ts)
- [`apps/admin-portal/vite.config.ts`](../../apps/admin-portal/vite.config.ts)
- [Wiki: Deployment and Configuration](https://github.com/AY2627S1-CS3219-P25/friend-on-campus/wiki/Deployment-and-Configuration)
- [Documentation index](../README.md) · [Drift register](../audits/documentation-drift.md) · [Verification record](../audits/review-findings.md)
