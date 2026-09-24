<!--
AI Assistance Disclosure:
Tool: Claude Code (model: Claude Fable 5.1), date: 2026-09-21
Scope: Compiled this overview from the team's own sources (README, D1, D2 / Sprint 2 plan, docker-compose.yml,
gateway/nginx.conf, packages/common-dtos) and from reading the code on milestone-d2. It restates what those
sources already say and what the code currently does; it proposes nothing and contains no rationale.
Author review: <to be completed by Reallyeasy1>
-->
<!--
AI Assistance Disclosure:
Tool: Codex (model: GPT-5.6 Terra), date: 2026-09-22
Scope: Corrected User and Supplier Service implementation facts, repository paths, and resolved documentation references.
Author review: <to be completed by ngkhengyang>
-->

# Architecture overview — intended vs built

Read this before working on any service. **"Intended"** is what the team has written down (source given in brackets). **"Built"** is what the current code does as of 2026-09-22. Where they differ, neither is automatically right: see [`../requirements/conflicts.md`](../requirements/conflicts.md) and ask the author. *Why* the team chose any of this belongs in [`../decisions/`](../decisions/README.md), written by the team.

## 1. The system in one paragraph

Friend of Campus / NUS CampusErrand is a peer-to-peer errand platform for NUS students: a requester posts an errand at a verified campus supplier and offers credits; a courier accepts, picks up and delivers; credits are reserved when the errand is created and settled on completion, inside a closed credit economy. One ordinary account acts as both requester and courier; administrators manage suppliers and users. [README; D1 F1–F4]

## 2. Intended shape

```
 student-app :5173 ─┐                                   ┌─ user-service         :8001 ── user_db
 admin-portal :5174 ─┼─► nginx gateway :80 ── REST ────►├─ supplier-service     :8002 ── supplier_db
                     │        │                          ├─ order-service        :8003 ── order_db
                     │        └── /ws/ (WebSocket) ────► ├─ credit-service       :8004 ── credit_db
                     │                                   └─ notification-service :8005   (no database)
                     │
   order-service ── HTTP ──► credit-service          (reserve credits while creating an errand)
   order-service, credit-service ── publish ──► RabbitMQ ── consume ──► credit-service, notification-service
```

- **Microservices, one database per service**, in an npm-workspaces monorepo. The four currently provisioned service databases live in one PostgreSQL 16 server as separate databases; cross-service user/supplier/order IDs are logical references, never foreign keys. [README; D2 plan §4, App. B; `docker-compose.yml`]
- **Single entry point**: nginx on :80 routes `/api/auth`, `/api/users`, `/api/suppliers`, `/api/orders`, `/api/credits`, `/ws/`, `/admin/` and `/`. Services must also work when called directly with the UI stopped. [`gateway/nginx.conf`; D2 plan §5]
- **Synchronous REST** between clients and services, and from order-service to credit-service for reservation (`CREDIT_SERVICE_URL`). An errand becomes `OPEN` only after the reservation is confirmed; a lost response is retried with the same operation ID rather than treated as failure. [`docker-compose.yml`; D2 plan App. D; D1 F3.1, F4.3]
- **Asynchronous event choreography over RabbitMQ** for everything after that: order lifecycle events (`order.created`, `order.accepted`, `order.completed`, `order.cancelled`, `order.expired`, plus picked-up/delivered) carry order ID, user IDs and timestamp; credit-service settles or releases in response; notification-service turns them into WebSocket pushes. [D1 F3.5.5, F3.6.1, F4.6, F5, §5.4 "M6"]
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
| **user-service** :8001, `user_db` | Registration, login, sessions, profile, roles/RBAC, admin promotion with last-admin guard [D1 F1]. D1 F4.1 requires initial credits when a user registers, and a `UserRegisteredEvent` type exists in `common-dtos`; how the two services coordinate is not written down. | Real: Prisma, password hashes, Ed25519 access tokens, and opaque refresh sessions. Email is immutable; deferred ADMIN user-management routes return `501`. No event is published. |
| **supplier-service** :8002, `supplier_db` | Verified supplier / pickup-location directory: search, filter, sort, paginate, details; admin create/edit/availability/remove [D1 F2; D2 plan App. A–C] | Real: Prisma, CSV seed (21 rows), and `@campus-errand/auth` Ed25519 verification for admin-only writes. Reads are unauthenticated; no `version` column. |
| **order-service** :8003, `order_db` | Errand create → discover → accept → pickup → complete, cancel, expiry; one-winner acceptance; publishes lifecycle events [D1 F3, Order N1–N4] | Mock: in-memory array in one file; identity from an `x-user-id` header; "publish" is a `console.log`. An `orders` table exists in the init SQL only. |
| **credit-service** :8004, `credit_db` | Initial grant, available/reserved/total balances, reserve, settle, release, ledger history, idempotency [D1 F4, Credit N1–N3] | Mock: in-memory wallet and ledger, same header identity. `credit_wallets` / `credit_transactions` exist in the init SQL only. |
| **notification-service** :8005 | Consume events, push status notifications to the right user over WebSocket; later per-errand chat [D1 F5, F8, §3.1] | Mock: `ws` server that re-broadcasts every message to every client; not connected to RabbitMQ; no socket identity. |
| **student-app** :5173 | Mobile-first requester/courier UI: feed, post errand, tracking + chat, my tasks, wallet [D1 §4.1–4.5] | One `App.tsx`; fetches the live supplier directory (with a hardcoded fallback list) and opens `/ws/`; makes no calls to the order or credit APIs yet. |
| **admin-portal** :5174 | Supplier and location management, later user/order admin; must work at desktop and mobile widths [D1 §4.6; D2 plan §7] | One `App.tsx`; login + full supplier CRUD against the real APIs. |
| **gateway** :80 | Reverse proxy / single ingress [`gateway/nginx.conf`] | Built as described; routing only. |

## 4. Directory layout

```
nus-campus-errand/
├── apps/
│   ├── student-app/            Vite + React + Tailwind; src/App.tsx, vite.config.ts (dev proxy), Dockerfile
│   └── admin-portal/           same shape; proxy targets from SUPPLIER_SERVICE_URL / USER_SERVICE_URL
├── services/
│   ├── user-service/           src/{index,app,auth,users,persistence,database}/, database/prisma/schema.prisma
│   ├── supplier-service/       src/backend/{server,supplierRoutes}.ts, src/database/{client,supplierRepository,seed}.ts, prisma/{schema.prisma,migrations/}
│   ├── order-service/          src/index.ts            (mock)
│   ├── credit-service/         src/index.ts            (mock)
│   └── notification-service/   src/index.ts            (mock)
│       each service: package.json, tsconfig.json (extends ../../tsconfig.base.json), Dockerfile
├── packages/common-dtos/       src/index.ts — shared user/auth DTOs, OrderStatus, event types, ApiResponse<T>
├── gateway/nginx.conf          ingress routing
├── docker/postgres-init/       01-init-databases.sql — creates the 4 databases AND their tables (first boot only)
├── docker-compose.yml          gateway, 2 apps, 5 services, postgres:16, rabbitmq:3.13-management
├── scripts/test-d2-e2e.ts      D2 end-to-end suite (npm run test:d2)
├── data/{csv,images}/          supplier seed data
├── docs/                       see docs/README.md
├── ai/usage-log.md             mandatory AI usage log
├── .claude/                    settings.json, hooks/, skills/, agents/
├── CLAUDE.md, AGENTS.md        rules for AI tools
└── package.json                npm workspaces + root scripts
```

Generated and ignored: `node_modules/`, `dist/`, `**/src/database/generated/` (per-service Prisma clients), `.env*` (except `.env.example`).

## 5. Where intent and code currently differ

Tracked row by row in [`../requirements/conflicts.md`](../requirements/conflicts.md): session method (row 8), role names (9), guest reads of suppliers (10), supplier edit contract and `version` (11), Bun vs npm (13), backend stack mention (14), duplicated table definitions (15), README's D2 status (16). Unresolved rows are open questions for the team, not defects for an AI tool to fix.
