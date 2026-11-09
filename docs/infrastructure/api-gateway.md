<!--
AI Assistance Disclosure:
Tool: Codex (model: GPT-6), date: 2026-11-09
Scope: Verify gateway routes and distinguish Compose DNS, Vite proxying and ECS Service Connect at the current baseline.
Author review: <to be completed by Reallyeasy1>

Tool: Claude Code (model: Claude Fable 5.1), date: 2026-10-27
Scope: Issues #173/#169/#206: upstreams resolved per request through Docker DNS (variables, 10 s TTL), 3 s connect timeout, Chat health routes; diagnostics paragraph updated accordingly.
Author review: <to be completed by Reallyeasy1>

Tool: Claude Code (model: Claude Fable 5.1), date: 2026-10-25
Scope: Added the /api/chat and /ws/chat/ routes of the Chat Service (F8, PR #148) while merging main into that PR.
Author review: <to be completed by Reallyeasy1>

Tool: Codex (model: GPT-6), date: 2026-10-25
Scope: Source-linked implementation documentation and evidence review requested by Reallyeasy1.
Author review: <to be completed by Reallyeasy1>
-->

# Gateway and proxy routing

Implementation checked against [`b989758`](https://github.com/AY2627S1-CS3219-P25/friend-on-campus/commit/b989758e766cb593c3b8c94102eb6dfb5c7d8491) on 9 November 2026 (SGT). This is a source review, not a verification of the running AWS deployment.

The gateway forwards requests. Service middleware enforces authentication and authorization. Name the tested path in evidence: host Vite, local Compose, direct service ports and AWS ingress are different configurations.

## Route table

The table follows [gateway/nginx.conf](../../gateway/nginx.conf). Normal API paths retain their URI.

| Incoming path | Destination or result |
|---|---|
| `/health` | NGINX liveness response; does not probe dependencies |
| `/api/auth/`, `/api/users` and `/api/users/` | User, port 8001 |
| `/api/suppliers`, `/api/suppliers/` | Supplier, port 8002 |
| `/api/orders`, `/api/orders/` | Order, port 8003 |
| `/api/credits/escrow` prefix | 403 at the gateway; Credit has no public HTTP escrow mutation endpoint |
| `/api/credits`, `/api/credits/` | Credit, port 8004 |
| `/api/notifications`, `/api/notifications/` | Notification, port 8005 |
| `/api/chat`, `/api/chat/` | Chat, port 8006 |
| `/api/health/{user,supplier,order,credit,notification,chat}/{health,ready}` | Corresponding service probe |
| `/ws/chat/` | Chat root, WebSocket upgrade |
| `/ws/` | Notification root, WebSocket upgrade |
| `/admin` | Redirect to `/admin/` |
| `/admin/` | Admin static frontend, port 5174 |
| `/images/` | Supplier image files |
| Other `/api` paths | 404 |
| `/` | Student static frontend, port 5173 |

Both WebSocket routes use HTTP/1.1 upgrades and 86400-second NGINX read/send timeouts. Authentication occurs inside the socket protocol; gateway timeouts do not override service token expiry or upstream idle timeouts. Cross-replica delivery belongs to [Chat](../services/chat-service/README.md) and [Notification](../services/notification-service/README.md), not to the gateway.

## Local and AWS name resolution

| Path | How upstreams are reached |
|---|---|
| Host Vite development | Both app Vite configs use individual service targets by default; `GATEWAY_URL` selects a gateway |
| Docker Compose | Mounted NGINX configuration uses service-name variables and Docker DNS at `127.0.0.11`, cached for 10 seconds |
| ECS | [gateway-start.sh](../../infra/terraform/ecs/gateway-start.sh) reads IPv4 Service Connect aliases from `/etc/hosts`, substitutes addresses in NGINX configuration and starts NGINX |

The ECS task overrides the image entry point, so the image's generic [DNS hook](../../gateway/entrypoint.sh) is not the ECS routing mechanism. Container frontends serve built assets through NGINX; they do not run Vite development servers. Admin uses the `/admin/` base path.

## AWS ingress

[edge.tf](../../infra/terraform/ecs/edge.tf) configures CloudFront → HTTP ALB → gateway tasks. ECS registers dynamically assigned **host** ports in the ALB instance target group. The ALB does not address Kubernetes pods; the current stack contains no Kubernetes ingress controller. The gateway reaches frontend and backend services through Service Connect.

CloudFront uses HTTPS/WSS toward the browser and HTTP/WS toward the origin. All-path caching is disabled. The ALB accepts the CloudFront origin-facing prefix list and requires the private origin header. See the [cloud overview](../new-cloud-architecture-guide.md) for the network boundaries.

## Failure diagnosis

1. Compare gateway `/health` with the relevant proxied service `/ready`. A healthy gateway can still route to an unavailable backend.
2. For local 502s after container replacement, inspect the service's health and Docker DNS; upstream resolution is cached for 10 seconds.
3. For ECS 502s, inspect ALB target health, gateway task logs and the Service Connect alias/task configuration. Do not apply Compose DNS fixes to ECS.
4. Inspect the service and its database/broker dependencies. NGINX uses a three-second connect timeout and 60-second default read/send timeouts; it does not retry a failed business operation or prove whether a write committed.
5. For dropped sockets, inspect all hops and service readiness. The ALB idle timeout is 120 seconds; an 86400-second NGINX setting alone does not keep a connection alive.

## Source evidence

- [Gateway configuration](../../gateway/nginx.conf), [image](../../gateway/Dockerfile) and [ECS startup](../../infra/terraform/ecs/gateway-start.sh)
- [Student NGINX](../../apps/student-app/nginx.conf) and [Vite](../../apps/student-app/vite.config.ts)
- [Admin NGINX](../../apps/admin-portal/nginx.conf) and [Vite](../../apps/admin-portal/vite.config.ts)
- [ECS application/Service Connect configuration](../../infra/terraform/ecs/applications.tf)

[Documentation index](../README.md) · [Known discrepancies](../audits/documentation-drift.md)
