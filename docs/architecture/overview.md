<!--
AI Assistance Disclosure:

Tool: Google Antigravity Agent, date: 2026-10-08
Scope: Streamlined Section 3 service matrix to enduring component responsibilities and interfaces; decoupled overview from drifting commit-hash pins.
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






# Architecture overview

Read this before working on any service. It outlines the core architectural boundaries, service communication patterns, and repository structure. Requirements and open conflict tracking are in [`../requirements/`](../requirements/README.md). *Why* the team chose any design pattern belongs in [`../decisions/`](../decisions/README.md), written by the team.

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

| Component | Port | Database | Primary Responsibility | Interface & Communication |
|---|---|---|---|---|
| **user-service** | 8001 | `user_db` | Identity, authentication (Ed25519 JWT), session management, and RBAC | REST (`/api/auth`, `/api/users`), publishes `user.registered` via RabbitMQ |
| **supplier-service** | 8002 | `supplier_db` | Campus supplier & pickup location directory (search, filter, categorize) | REST (`/api/suppliers`), public reads, admin writes |
| **order-service** | 8003 | `order_db` | Errand lifecycle state machine (post, browse, accept, complete, cancel) | REST (`/api/orders`), sync HTTP reserve with credit-service, publishes `order.*` to RabbitMQ |
| **credit-service** | 8004 | `credit_db` | Wallet balances, credit reservation, escrow, ledger, and idempotency | REST (`/api/credits`), sync HTTP reserve, consumes `order.*` from RabbitMQ |
| **notification-service** | 8005 | `notification_db` | Real-time status notifications for errands | REST (`/api/notifications`), authenticated WebSocket (`/ws/`), consumes `order.*` from RabbitMQ |
| **student-app** | 5173 | — | Student errand requester & courier web application | React SPA via Vite proxy / gateway |
| **admin-portal** | 5174 | — | Administrative dashboard for suppliers and user management | React SPA mounted at `/admin/` |
| **gateway** | 80 | — | Reverse proxy and single entry ingress | Nginx routing `/api/*`, `/ws/`, `/admin/`, and `/` |

## 4. Directory layout

```
nus-campus-errand/
├── apps/
│   ├── student-app/            Vite + React + Tailwind; src/App.tsx, vite.config.ts (dev proxy), Dockerfile
│   └── admin-portal/           same shape; API proxy via GATEWAY_URL in Compose, direct service defaults on host
├── services/
│   ├── user-service/           src/{index,app,auth,users,persistence,database}/, database/prisma/schema.prisma
│   ├── supplier-service/       src/backend/{server,supplierRoutes}.ts, src/database/{client,supplierRepository,seed}.ts, prisma/{schema.prisma,migrations/}
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
