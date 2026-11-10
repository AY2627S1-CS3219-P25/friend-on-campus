<!--
AI Assistance Disclosure:
Tool: Codex (model: GPT-6), date: 2026-11-10
Scope: Document source-checked API URLs, access requirements, WebSocket endpoints, probes and local read-only examples.
Author review: I validated correctness, edited for style, and verified with automated tests.
-->

# API URLs and access

Use this page to find an endpoint and understand what a successful request means. The service guides explain the full data contracts and failure handling. This reference covers the routes in [main at `d5e9f61`](https://github.com/AY2627S1-CS3219-P25/friend-on-campus/commit/d5e9f61b2bf73eff80d248f12a361055c346f6ae), checked on 10 November 2026 (SGT); it is a source inventory, not evidence that this revision is deployed.

## Choose a base URL

Append the paths below to the appropriate base. For example, the local supplier list is `http://localhost/api/suppliers`.

| Environment | Base URL | How to use it |
|---|---|---|
| Local Compose gateway | `http://localhost` | Preferred entry point for the complete application; start it using [local development](development/local-development.md) |
| AWS public entry point | `https://<cloudfront-domain>` | Use the `public_url` output from the initialized ECS Terraform state for the intended environment |
| Student Vite development server | `http://localhost:5173` | Proxies all six business APIs and both socket paths in the default host setup |
| Admin Vite development server | `http://localhost:5174` | Default host setup proxies User, Supplier and Order business APIs; see the exceptions below |

Read the configured AWS URL from the repository root after initializing the correct Terraform backend/workspace:

```bash
terraform -chdir=infra/terraform/ecs output -raw public_url
```

This reads state; it does not establish availability. The checked-in [CloudFront/ALB configuration](../infra/terraform/ecs/edge.tf) restricts ALB forwarding with an origin header, so the raw ALB hostname is not the public API base. All API paths start at `/api/`, including requests from the admin UI at `/admin/`; do not prepend `/admin` to them.

For direct local debugging, use the service ports below. The `/api/...` prefix is still required when bypassing the gateway.

| Service | Direct local base | Business path prefixes |
|---|---|---|
| User | `http://localhost:8001` | `/api/auth`, `/api/users` |
| Supplier | `http://localhost:8002` | `/api/suppliers` |
| Order | `http://localhost:8003` | `/api/orders` |
| Credit | `http://localhost:8004` | `/api/credits` |
| Notification | `http://localhost:8005` | `/api/notifications` |
| Chat | `http://localhost:8006` | `/api/chat` |

These ports come from [Compose](../docker-compose.yml), not a promise of public AWS ports. The [student](../apps/student-app/vite.config.ts) and [admin](../apps/admin-portal/vite.config.ts) Vite proxies are development conveniences. In default host mode, Student has no explicit health aliases; Admin has five service health families but no Chat health alias or Credit/Notification/Chat business routes. Their generic `/api` fallback points to Supplier. With `GATEWAY_URL` configured, the fallback instead reaches the gateway. Use the gateway or a direct service base for predictable diagnostic calls.

## Authentication and identifiers

- **Public** means no access token is required; it does not mean the operation is read-only.
- **Bearer** means send `Authorization: Bearer <access-token>`. **Admin** additionally requires the signed `ADMIN` role. Requester/courier permissions refer to ownership of that order, not separate token roles.
- Refresh/logout use the `refresh_token` cookie, with a `refreshToken` request-body fallback. A supplied cookie takes precedence. Browser requests must retain the cookie; an access token alone cannot refresh a session.
- Use the stored `id` returned by the API for mutations. Supplier and Order detail lookups also accept their public codes, but Chat uses an order UUID and the dispute routes require the stored order UUID.
- Business successes generally return `{ "success": true, "data": ... }`; a `204` has no response body. Health probes use their own response format. Send JSON bodies with `Content-Type: application/json`.

## User: accounts and sessions

Source: [auth routes](../services/user-service/src/auth/auth-routes.ts), [user routes](../services/user-service/src/users/user-routes.ts). See the [User guide](services/user-service/README.md) for validation and session behavior.

| Method | Path | Access | Request and result |
|---|---|---|---|
| POST | `/api/auth/register` | Public | `username`, `email`, `password`; `201` with the user. Does not log in; wallet initialization is asynchronous |
| POST | `/api/auth/login` | Public | `email`, `password`, optional `keepLoggedIn`; returns an access token/user and sets the refresh cookie |
| POST | `/api/auth/refresh` | Refresh credential | Rotates the refresh credential and returns a new access token |
| POST | `/api/auth/logout` | Refresh credential if present | Revokes that refresh session and clears the cookie; `204`. Missing/unknown refresh credentials are harmless |
| GET | `/api/users/me` | Bearer | Own profile |
| PATCH | `/api/users/me` | Bearer | Update own `username`; other editable fields are not supported |
| PUT | `/api/users/me/password` | Bearer | `currentPassword`, `newPassword`; `204` |
| GET | `/api/users` | Admin | User list, without pagination |
| PATCH | `/api/users/:id/toggle-status` | Admin | Toggle enabled status; preserves at least one enabled administrator |
| PATCH | `/api/users/:id/toggle-role` | Admin | Toggle role; cannot change own role and cannot remove the last enabled administrator |
| DELETE | `/api/users/:id` | Self or Admin | Delete account and refresh sessions; `204`, subject to the enabled-admin guard |

There is no `GET /api/users/:id`. Logout does not immediately invalidate already issued access tokens. Changing a password does not revoke all sessions, and deleting an account is not a cascade that removes its records from other services.

## Supplier: campus places

Source: [routes](../services/supplier-service/src/suppliers/supplierRoutes.ts), [query implementation](../services/supplier-service/src/suppliers/supplierRepository.ts). See the [Supplier guide](services/supplier-service/README.md) for validation, coordinates and operating hours.

| Method | Path | Access | Request and result |
|---|---|---|---|
| GET | `/api/suppliers` | Public | Directory query; returns `data: {suppliers, total, page, limit, totalPages}` |
| GET | `/api/suppliers/:id` | Public | Detail by stored ID or supplier code |
| POST | `/api/suppliers` | Admin | Create a supplier; `201` |
| PUT | `/api/suppliers/:id` | Admin | Partial update by stored ID, despite the `PUT` method |
| PATCH | `/api/suppliers/:id/toggle` | Admin | Flip active status by stored ID; no body needed |
| DELETE | `/api/suppliers/:id` | Admin | Deactivate by default; `?permanent=true` physically deletes the supplier |

Creation requires `name`, `campusZone`, `exactLocation`, `category`, `building`, `floor`, `latitude` and `longitude`. Optional fields and allowed values are in the service guide; deleting a supplier does not delete existing orders.

| List parameter | Behavior |
|---|---|
| `campusZone`, `category` | Case-insensitive equality |
| `search` | Case-insensitive text match across name, exact location, building, description and supplier code |
| `isActive` | Exact `true` or `false`; otherwise both active and inactive records |
| `sortBy` | `name` (default), `campusZone`, `category`, `createdAt`, `supplierCode` |
| `sortOrder` | `desc` for descending; otherwise ascending |
| `page`, `limit` | Supplying either enables pagination: default page 1/limit 10, page at least 1, limit clamped to 1–100 |

Without pagination parameters, the query returns **at most 100 suppliers**, while `total` still counts all matches. Use explicit pagination when retrieving the whole directory. For example: `/api/suppliers?isActive=true&page=1&limit=10`.

## Order: errands and lifecycle commands

Source: [routes](../services/order-service/src/orders/order.routes.ts), [validation](../services/order-service/src/orders/order.service.ts), [state and query guards](../services/order-service/src/repositories/order.repository.ts). The [Order guide](services/order-service/README.md) explains the Order/Credit Saga and complete transition rules.

All routes require a bearer token. Lifecycle commands normally return `200` with the updated order. That response does not establish that Credit has processed payment or refund.

| Method | Path | Access / state | Request and result |
|---|---|---|---|
| GET | `/api/orders` | Bearer | Filtered order array in `data`, with top-level `total` |
| GET | `/api/orders/user/activity` | Bearer | Own `requested`, `delivering` and `history` collections |
| GET | `/api/orders/:id` | Bearer | Detail by UUID or order code; `PENDING`/`REJECTED` restricted to requester or admin |
| POST | `/api/orders` | Bearer | Submit an errand; returns `202`, a `PENDING` order and its polling URL in `Location` |
| POST | `/api/orders/assistant/draft` | Bearer | Nonblank `prompt`; returns editable draft fields without creating an order |
| POST | `/api/orders/:id/accept` | Non-requester; unexpired `OPEN` | Assign caller as courier; optional `courierContactNote` |
| POST | `/api/orders/:id/pickup` | Assigned courier; `ACCEPTED` | Move to `IN_TRANSIT` |
| POST | `/api/orders/:id/deliver` | Assigned courier; `IN_TRANSIT` | Move to `DELIVERED` |
| POST | `/api/orders/:id/complete` | Requester; undisputed `DELIVERED` | Move to `COMPLETED`; payment follows asynchronously |
| POST | `/api/orders/:id/dispute` | Requester; `DELIVERED` | Nonblank `details`, maximum 1,000 characters; records a dispute without changing status |
| POST | `/api/orders/:id/courier-dispute` | Assigned courier; `DELIVERED` | Same `details` requirement; may initiate a courier report without an earlier requester report |
| POST | `/api/orders/:id/cancel` | Requester; `OPEN` or `ACCEPTED` | Move to `CANCELLED`; refund follows asynchronously |
| POST | `/api/orders/:id/unassign` | Assigned courier; `ACCEPTED` | Return to `OPEN`, clearing courier assignment; credits remain held |
| POST | `/api/orders/:id/admin/cancel` | Admin; `OPEN`, `ACCEPTED`, `IN_TRANSIT`, `DELIVERED` | Required `reason`, optional `expectedVersion`; cancel and request refund |
| POST | `/api/orders/:id/admin/complete` | Admin; `DELIVERED`, including disputed | Required `reason`, optional `expectedVersion`; complete and request payment |
| POST | `/api/orders/:id/admin/unassign` | Admin; `ACCEPTED` | Required `reason`, optional `expectedVersion`; remove courier and reopen |

Create bodies require `supplierId` (UUID), `itemDescription`, `dropoffLocation` and integer `rewardCredits` (1–2,147,483,647). Optional `durationMinutes` defaults to 30 and accepts 30–1,440; notes are optional. The optional `dropoffLatitude`, `dropoffLongitude` and `estimatedRewardCredits` must be supplied together. Admin reasons contain 1–500 trimmed characters. Each party can submit its dispute report once.

For listing, `status` defaults to unexpired `OPEN`, or `ALL` when filtering by `requesterId`/`courierId`. Non-admin callers can use those owner filters only for themselves. `campusZone` is a case-insensitive match; `search` matches order code, item description, dropoff or supplier name, and also requester/courier IDs when the search is a UUID. Pagination defaults to page 1/limit 50; non-positive/non-integer values or a limit above 100 return `400`.

After submission, follow `Location` until the reservation resolves to `OPEN`, `REJECTED` or `EXPIRED`. There is no separate submission-status endpoint and no general order update/delete route. A requester cannot cancel `PENDING`. Before retrying a write after a timeout, check whether it already succeeded; the HTTP response can be lost after a committed change.

## Credit: wallets and ledger

Source: [routes](../services/credit-service/src/credits/routes.ts). See the [Credit guide](services/credit-service/README.md) for wallet initialization, escrow and reconciliation.

| Method | Path | Access | Result |
|---|---|---|---|
| GET | `/api/credits/wallet` | Bearer | Own wallet; `404` when it has not been initialized |
| GET | `/api/credits/ledger` | Bearer | Own ledger, newest first, without pagination |

Neither endpoint accepts a user ID to select another wallet. Reading does not create a missing wallet. Financial writes arrive through broker events: there is **no HTTP reserve, settle or refund endpoint**. The gateway's `/api/credits/escrow` denial is a guard, not an available business API.

## Notification: inbox and read state

Source: [routes](../services/notification-service/src/notifications/routes.ts). See the [Notification guide](services/notification-service/README.md) for categories, durable storage and replica delivery.

| Method | Path | Access | Request and result |
|---|---|---|---|
| GET | `/api/notifications` | Bearer | Own inbox page in `data`: `items`, `total`, `page`, `limit`, `totalPages`, `unreadCount` |
| PATCH | `/api/notifications/:id/read` | Owner | No body; returns the notification and `meta.unreadCount`; repeated reads preserve the original read timestamp |
| POST | `/api/notifications/read-all` | Bearer | No body; returns `data.updated` and `data.unreadCount` |

List parameters: `view=all` (default), `action_needed` or `important`; `unread=true` selects unread items. Page defaults to 1, with a minimum of 1. Limit defaults to 20 and is clamped to 1–100. `total` reflects the selected filters, while `unreadCount` is the caller's overall unread count.

Even administrators read only their own inbox. A malformed, missing or other user's notification ID returns `404`. Read-all applies to the rows processed by that operation; a later notification can still be unread.

## Chat: persisted history and translation

Source: [routes](../services/chat-service/src/chat/routes.ts), [conversation service](../services/chat-service/src/conversations/service.ts). See the [Chat guide](services/chat-service/README.md) for projection delays, sending, moderation and recovery.

| Method | Path | Access | Request and result |
|---|---|---|---|
| GET | `/api/chat/:orderId` | Stored participant or Admin | Conversation and ascending message history; closed conversations remain readable |
| POST | `/api/chat/:orderId/translate` | Stored participant or Admin | `language`, `messageIds` (at most 200 UUIDs); returns display translations without changing stored text |

Both routes require a bearer token and an order UUID. History accepts `afterSequence` (exclusive, default 0) and `limit` (default 50, clamped to 1–100). Continue from the last returned sequence; there is no total or separate next-page token.

When history finds no conversation, it can fetch the order and create a conversation if a courier is assigned, then check access. Translation does not perform that fallback. There is no collection `GET /api/chat` or HTTP send-message endpoint: sending uses the socket below.

## WebSocket URLs

These are long-lived connections, not HTTP polling routes. Use `ws` locally and `wss` with the public HTTPS entry point.

| Stream | Local gateway | AWS public entry | Direct local service |
|---|---|---|---|
| Notifications | `ws://localhost/ws/` | `wss://<cloudfront-domain>/ws/` | `ws://localhost:8005/` |
| Chat | `ws://localhost/ws/chat/` | `wss://<cloudfront-domain>/ws/chat/` | `ws://localhost:8006/` |

Student Vite uses the same gateway-style paths on port 5173. The gateway strips the socket path before forwarding; the service WebSocket servers currently do not restrict the upgrade path.

Send `{"type":"AUTH","token":"<access-token>"}` as the first frame within five seconds, then wait for `AUTH_OK`. Do not put the token in the URL. Invalid or expired authentication closes the socket with code `4401`.

| Stream | Client actions after authentication | Server messages |
|---|---|---|
| Notifications | Later client frames are ignored; use REST to mark items read | `AUTH_OK` includes unread count; `NOTIFICATION` and `INBOX_CHANGED` prompt inbox updates |
| Chat | `{"type":"SEND","orderId":"<uuid>","text":"Hello","clientId":"<optional-correlation-id>"}` | `AUTH_OK`, `MESSAGE`, `ERROR` |

Chat sending requires an open conversation, current stored membership and a username in the authenticated principal. Admin read access alone does not grant send permission. `clientId` correlates a send with its result; it is **not** a persistent idempotency key. Recover missed data with the REST history/inbox after reconnecting; a socket alone is not a durable history store. Frame handling is in the [Chat hub](../services/chat-service/src/ws/hub.ts) and [Notification hub](../services/notification-service/src/ws/hub.ts).

## Health and readiness URLs

All probes use unauthenticated `GET`. Gateway `/health` returns a static `200 healthy`; it proves only that NGINX is answering. Each backend exposes `/health` for liveness and `/ready` for its own dependency checks, with the gateway aliases below.

| Service | Gateway liveness path | Gateway readiness path | Direct local readiness URL |
|---|---|---|---|
| User | `/api/health/user/health` | `/api/health/user/ready` | `http://localhost:8001/ready` |
| Supplier | `/api/health/supplier/health` | `/api/health/supplier/ready` | `http://localhost:8002/ready` |
| Order | `/api/health/order/health` | `/api/health/order/ready` | `http://localhost:8003/ready` |
| Credit | `/api/health/credit/health` | `/api/health/credit/ready` | `http://localhost:8004/ready` |
| Notification | `/api/health/notification/health` | `/api/health/notification/ready` | `http://localhost:8005/ready` |
| Chat | `/api/health/chat/health` | `/api/health/chat/ready` | `http://localhost:8006/ready` |

Replace `/ready` with `/health` for each direct liveness URL. Readiness returns `200`/`READY` or `503`/`NOT_READY`; liveness can remain `200` while a dependency is unavailable. There is no aggregate gateway `/ready`. A ready response does not prove CDC progress or completion of an individual Saga. The [gateway configuration](../gateway/nginx.conf) defines the aliases, while the service guides describe their dependencies.

## Try safe local reads

After starting the local stack, these requests check the gateway, Order readiness and a public supplier page:

```bash
curl --fail-with-body http://localhost/health
curl --fail-with-body http://localhost/api/health/order/ready
curl --fail-with-body 'http://localhost/api/suppliers?isActive=true&page=1&limit=10'
```

For an authenticated read, privately set `ACCESS_TOKEN` to an access token returned by login, then run:

```bash
curl --fail-with-body \
  --header "Authorization: Bearer ${ACCESS_TOKEN:?Set an access token first}" \
  http://localhost/api/credits/wallet
```

Expected results are a health string, readiness object, supplier page and own wallet respectively. Keep credentials and tokens out of committed scripts and reports. `401` usually means missing/expired authentication; `403` means access is denied; `404` can mean a missing or deliberately hidden record. On `409`, reload the current state before choosing another action. On `503`, check the relevant dependency and service logs. These are diagnostic clues, not a single uniform error schema across services.

[Back to developer documentation](README.md)
