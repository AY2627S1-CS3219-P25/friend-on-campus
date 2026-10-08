<!--
AI Assistance Disclosure:

Tool: Google Antigravity Agent, date: 2026-10-08
Scope: Updated supplier-service entry in directory tree to src/index.ts and src/suppliers/.
Author review: <to be completed by author after review>

Tool: Claude Code (model: Claude Fable 5.1), date: 2026-10-06
Scope: notification-service is real (Prisma notification_db, authenticated WebSocket, RabbitMQ consumer); five databases; /api/notifications route.
Author review: <to be completed by Reallyeasy1>

Tool: Google Antigravity Agent, date: 2026-10-03
Scope: Updated user-service intended and built summaries for transactional outbox registration event publication, login disabled checks, and atomic last-admin guards.
Author review: <to be completed by huangjiaxi1111>

Tool: Codex (model: GPT-6), date: 2026-10-01
Scope: Updated gateway and Vite proxy facts after PR #105 review fixes.
Author review: <to be completed by author after review>

Tool: Codex (model: GPT-6), date: 2026-09-30
Scope: Documented the working admin gateway route and student login navigation.
Author review: <to be completed by huangjiaxi1111>

Tool: Claude Code (model: Claude Fable 5.1), date: 2026-09-30
Scope: "Built today" column for user-service, supplier-service, student-app and admin-portal brought in step with main @ 6dc22a6 (PR #93: toggle-status, toggle-role, DELETE /:id, required building/floor, 409 duplicate rule, env-var proxy targets, healthchecks). Facts only.
Author review: <to be completed by Reallyeasy1>

Tool: Claude Code (model: Claude Fable 5.1), date: 2026-09-21
Scope: Compiled this overview from the team's own sources (README, D1, D2 / Sprint 2 plan, docker-compose.yml,
gateway/nginx.conf, packages/common-dtos) and from reading the code on milestone-d2. It restates what those
sources already say and what the code currently does; it proposes nothing and contains no rationale.
Author review: <to be completed by Reallyeasy1>

Tool: Codex (model: GPT-5.6 Terra), date: 2026-09-22
Scope: Corrected User and Supplier Service implementation facts, repository paths, and resolved documentation references.
Author review: <to be completed by ngkhengyang>

Tool: Google Antigravity Agent, date: 2026-09-24
Scope: Updated repository layout and conflict status to reflect that 01-init-databases.sql provisions logical databases only while microservices manage their own migrations.
Author review: (to be completed by author after review)

Tool: Codex (model: GPT-6), date: 2026-09-24
Scope: Updated built Credit Service persistence and source layout facts.
Author review: <to be completed by huangjiaxi1111>

Tool: Claude Code (model: Claude Fable 5.1), date: 2026-09-28
Scope: Updated the "Built today" column for user-service, student-app, admin-portal and gateway, the directory layout
(scripts/uat) and the conflict row list, from the code on `main` @ f0ee632 and the D2 UAT. Facts only.
Author review: <to be completed by Reallyeasy1>
-->






# Architecture overview — intended vs built

Read this before working on any service. **"Intended"** is what the team has written down (source given in brackets). **"Built"** is what the current code does as of 2026-09-28 (`main` @ f0ee632). Where they differ, neither is automatically right: see [`../requirements/conflicts.md`](../requirements/conflicts.md) and ask the author. *Why* the team chose any of this belongs in [`../decisions/`](../decisions/README.md), written by the team.

## 1. The system in one paragraph

Friend of Campus / NUS CampusErrand is a peer-to-peer errand platform for NUS students: a requester posts an errand at a verified campus supplier and offers credits; a courier accepts, picks up and delivers; credits are reserved when the errand is created and settled on completion, inside a closed credit economy. One ordinary account acts as both requester and courier; administrators manage suppliers and users. [README; D1 F1–F4]

## 2. Intended shape

```
 student-app :5173 ─┐                                   ┌─ user-service         :8001 ── user_db
 admin-portal :5174 ─┼─► nginx gateway :80 ── REST ────►├─ supplier-service     :8002 ── supplier_db
                     │        │                          ├─ order-service        :8003 ── order_db
                     │        └── /ws/ (WebSocket) ────► ├─ credit-service       :8004 ── credit_db
                     │                                   └─ notification-service :8005 ── notification_db
                     │
   order-service ── HTTP ──► credit-service          (reserve credits while creating an errand)
   order-service, credit-service ── publish ──► RabbitMQ ── consume ──► credit-service, notification-service
```

- **Microservices, one database per service**, in an npm-workspaces monorepo. The five provisioned service databases live in one PostgreSQL 16 server as separate databases; cross-service user/supplier/order IDs are logical references, never foreign keys. [README; D2 plan §4, App. B; `docker-compose.yml`]
- **Single entry point**: nginx on :80 routes `/api/auth`, `/api/users`, `/api/suppliers`, `/api/orders`, `/api/credits`, `/api/notifications`, `/ws/`, `/admin/` and `/`. Services must also work when called directly with the UI stopped. [`gateway/nginx.conf`; D2 plan §5]
- **Synchronous REST** between clients and services, and from order-service to credit-service for reservation (`CREDIT_SERVICE_URL`). An errand becomes `OPEN` only after the reservation is confirmed; a lost response is retried with the same operation ID rather than treated as failure. [`docker-compose.yml`; D2 plan App. D; D1 F3.1, F4.3]
- **Asynchronous event choreography over RabbitMQ** for everything after that: order lifecycle events (`order.created`, `order.accepted`, `order.completed`, `order.cancelled`, `order.expired`, `order.in_transit`, `order.delivered`) carry order ID, user IDs and timestamp; credit-service settles or releases in response; notification-service stores a notification for the requester and pushes it over WebSocket. [D1 F3.5.5, F3.6.1, F4.6, F5, §5.4 "M6"]
- **Idempotent credit operations**: duplicate requests or redelivered events must cause zero duplicate balance changes, including after a crash and recovery. [D1 F4.0, Credit N3.1.1]
- **Errand state machine**: `OPEN → ACCEPTED → (picked up / in transit) → COMPLETED`, with `CANCELLED` and `EXPIRED` exits. [D1 §6.1; `OrderStatus` in `packages/common-dtos`]
- **Identity and access**: user-service owns identity, roles and login; other services apply their own access rules using trusted identity, never a client-supplied role. 401 for missing/expired identity, 403 for insufficient role, fail closed if identity cannot be checked. [D2 plan §4, §8]
- **Graceful degradation**: if a non-critical service such as notification-service is down, creating, viewing and accepting errands must keep working. [D1 N4.1, N4.1.1]
- **Shared contract**: request/response DTOs and event types live in `packages/common-dtos`, imported by every service and both apps. [README]
- **Delivery**: Docker Compose runs the whole stack locally (D1 "M7"); GitHub Actions CI with quality/type/unit/build gates, integration tests on release candidates, then cloud deployment with health monitoring that separates "running" from "ready". [D1 §3.6, §5.4–5.5]
- **Later features**: natural-language errand creation (F6), admin order/user management (F7), per-errand private chat (F8), credit-amount recommendation (F9). [D1 §3, §6.3]

## 3. Service by service

Detail for each service (API, configuration, data, behaviour as built) is in [`../services/`](../services/README.md).

| Service | Owns (intended) | Built today |
|---|---|---|
| **user-service** :8001, `user_db` | Registration, login, sessions, profile, roles/RBAC, admin promotion with last-admin guard [D1 F1]. Initial credits on registration [D1 F4.1]; coordinates with credit-service via `user.registered` on topic exchange `campus.events` [docs/services/credit-service-integration-contract.md]. | Real: Prisma, password hashes, Ed25519 access tokens, and opaque refresh sessions. Email is immutable. Login refuses disabled accounts (403 `ACCOUNT_DISABLED`). ADMIN can list users, toggle status (`PATCH /:id/toggle-status`), and flip roles (`PATCH /:id/toggle-role`, own id refused). Any user can delete their own account (clearing session) and an ADMIN any account (`DELETE /:id`). Atomic PostgreSQL advisory-lock guards protect last-admin demotion and deletion (409 `LAST_ADMIN_REQUIRED`). User registration commits an outbox record in `outbox_events` and an Outbox Relay worker publishes `user.registered` (`eventId`, `userId`, `email`, `initialGrant: 100`) to topic exchange `campus.events` with publisher confirms and retries (at-least-once delivery; broker unavailability does not fail registration). |
| **supplier-service** :8002, `supplier_db` | Verified supplier / pickup-location directory: search, filter, sort, paginate, details; admin create/edit/availability/remove [D1 F2; D2 plan App. A–C] | Real: Prisma, CSV seed (21 rows), and `@campus-errand/auth` Ed25519 verification for admin-only writes. `building` and `floor` are required; a supplier with the same name, category, building and floor as another (case-insensitive) is rejected with 409. Reads are unauthenticated; no `version` column. |
| **order-service** :8003, `order_db` | Errand create → discover → accept → pickup → complete, cancel, expiry; one-winner acceptance; publishes lifecycle events [D1 F3, Order N1–N4] | Mock: in-memory array in one file; identity from an `x-user-id` header; "publish" is a `console.log`. An `orders` table exists in the init SQL only. |
| **credit-service** :8004, `credit_db` | Initial grant, available/reserved/total balances, reserve, settle, release, ledger history, idempotency [D1 F4, Credit N1–N3] | Real: Prisma on `credit_db` for wallets, ledger entries, grants, escrows and processed events. Wallet/ledger reads require JWT authentication; reserve uses unauthenticated HTTP while service authentication remains pending. User registration and order completion, cancellation and expiry are consumed from RabbitMQ with persistent event and order idempotency. |
| **notification-service** :8005 | Consume events, push status notifications to the right user over WebSocket; later per-errand chat [D1 F5, F8, §3.1] | Real: consumes the seven `order.*` keys from `campus.events`; `order.accepted`, `order.in_transit` and `order.delivered` each store a notification for the requester in `notification_db` (Prisma; unique event id as the duplicate guard) and push it to that user's authenticated sockets; REST list / mark-read under `/api/notifications`; a socket must send the access token as its first frame or is closed with 4401. Order Service does not publish yet, so events are hand-published for now. [`docs/services/notification-service.md`] |
| **student-app** :5173 | Mobile-first requester/courier UI: feed, post errand, tracking + chat, my tasks, wallet [D1 §4.1–4.5] | One `App.tsx`; register / login / silent refresh / logout and profile edit against user-service; fetches the live supplier directory (with a hardcoded fallback list used only when the call fails); after login opens `/ws/`, authenticates with the access token and shows pushed notifications (toast, Alerts bell with unread badge, Alerts view with mark-read). Wallet, escrow, earned credits and ledger are loaded from authenticated Credit Service APIs with loading/error/retry states. Orders remain local previews; previewing an errand does not change credit balances or reserve escrow. Vite proxies credit requests through the gateway in Compose and to `CREDIT_SERVICE_URL` (default localhost:8004) on the host. |
| **admin-portal** :5174 | Supplier and location management, later user/order admin; must work at desktop and mobile widths [D1 §4.6; D2 plan §7] | One `App.tsx`; login gate that refuses non-`ADMIN` accounts, full supplier CRUD with search / filter / sort / pagination (page size 8) / details, and a Users page (list, search, disable / reinstate, upgrade / downgrade role, delete) against the real APIs; the Add / Edit supplier forms require building and floor and show the 409 duplicate; table at desktop width, cards and a drawer at 390 px. |
| **gateway** :80 | Reverse proxy / single ingress [`gateway/nginx.conf`] | Routing only. Known `/api/*` paths reach their services; unknown API paths return 404. `/admin/` serves the admin portal and its assets: Vite uses `/admin/` as its base and nginx preserves that prefix. The student login page links to `/admin/`. Direct access on `:5174` redirects to the same base path. Bare `/api/users` and `/api/credits` paths also reach their services. After a service container is restarted on its own, `/api/*` returns 502 until the gateway is restarted. `docker-compose.yml` starts the gateway only after every service's healthcheck passes (`service_healthy`). |

## 4. Directory layout

```
nus-campus-errand/
├── apps/
│   ├── student-app/            Vite + React + Tailwind; src/App.tsx, vite.config.ts (dev proxy), Dockerfile
│   └── admin-portal/           same shape; API proxy via GATEWAY_URL in Compose, direct service defaults on host
├── services/
│   ├── user-service/           src/{index,app,auth,users,persistence,database}/, database/prisma/schema.prisma
│   ├── supplier-service/       src/index.ts, src/suppliers/{supplierRoutes,supplierRepository}.ts, src/database/{client,seed}.ts, prisma/{schema.prisma,migrations/}
│   ├── order-service/          src/index.ts            (mock)
│   ├── credit-service/         src/{index,app,config}.ts, credits/, database/{client.ts,prisma/}
│   └── notification-service/   src/{index,app,config}.ts, notifications/{events,store,routes}.ts, ws/hub.ts, messaging/rabbitmq.ts, database/{client.ts,prisma/}
│       each service: package.json, tsconfig.json (extends ../../tsconfig.base.json), Dockerfile
├── packages/common-dtos/       src/index.ts — shared user/auth DTOs, OrderStatus, event types, ApiResponse<T>
├── gateway/nginx.conf          ingress routing
├── docker/postgres-init/       01-init-databases.sql — creates the 5 databases (tables managed per-service by migrations)
├── docker-compose.yml          gateway, 2 apps, 5 services, postgres:16, rabbitmq:3.13-management
├── scripts/test-d2-e2e.ts      D2 end-to-end suite (npm run test:d2)
├── scripts/uat/                uat-d2-api.mjs, uat-d2-ui.mjs, uat-notifications.mjs — acceptance drivers run against a live stack
├── data/{csv,images}/          supplier seed data
├── docs/                       see docs/README.md
├── ai/usage-log.md             mandatory AI usage log
├── .claude/                    settings.json, hooks/, skills/, agents/
├── CLAUDE.md, AGENTS.md        rules for AI tools
└── package.json                npm workspaces + root scripts
```

Generated and ignored: `node_modules/`, `dist/`, `**/src/database/generated/` (per-service Prisma clients), `.env*` (except `.env.example`).

## 5. Where intent and code currently differ

Tracked row by row in [`../requirements/conflicts.md`](../requirements/conflicts.md): session method (row 8), role names (9), guest reads of suppliers (10), supplier edit contract and `version` (11), Bun vs npm (13), backend stack mention (14), duplicated table definitions (15 - resolved), README's D2 status (16), promotion and last-admin guard (18), `/admin/` through the gateway (19; fixed 2026-09-30), `test:d2` expectations (20), stale user-service API reference (21 - resolved). Unresolved rows are open questions for the team, not defects for an AI tool to fix.

## Admin navigation in local development

The student Vite server forwards `/admin` requests, including asset and HMR requests, to `ADMIN_PORTAL_URL` (default `http://localhost:5174`). Compose sets it to `http://admin-portal:5174`. The login-page link therefore also works when opening the student frontend directly on port 5173. API requests remain under `/api/`; the existing backend authentication and ADMIN checks apply.
