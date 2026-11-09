<!--
AI Assistance Disclosure:
Tool: Codex (model: GPT-6), date: 2026-11-09
Scope: Refresh six-service quick-start facts, test scope and documentation navigation; remove stale duplicated topology and routine volume-reset advice.
Author review: <to be completed by Reallyeasy1>

Tool: Claude Code (model: Claude Fable 5.1), date: 2026-11-08
Scope: Documented the k6 performance harness command (npm run perf:k6, tests/k6/README.md, performance.yml) in the test table and the D4 cheat sheet; removed the unbounded discovery/claim-race commands (issues #236, #237).
Author review: <to be completed by Reallyeasy1>

Tool: Codex (model: GPT-6), date: 2026-11-09
Scope: Link the manual main-branch application and infrastructure delivery workflows.
Author review: <to be completed by the author>

Tool: Codex (model: GPT-6), date: 2026-11-08
Scope: Retire K3s deployment references and link the ECS Terraform rollout and manual deployment workflow.
Author review: <to be completed by the author>

Tool: Codex (model: GPT-6), date: 2026-11-08
Scope: Record confirmed HTTP origin and bridge networking, link the accepted sizing budget and record legacy retirement approval.
Author review: <to be completed by the author>

Tool: Codex (model: GPT-6), date: 2026-11-08
Scope: Add the confirmed CloudFront entry point and separate origin TLS and incremental pricing from the shared-host migration baseline.
Author review: <to be completed by the author>

Tool: Codex (model: GPT-6), date: 2026-11-08
Scope: Link the confirmed shared-host ECS architecture and distinguish it from the existing K3s deployment configuration.
Author review: <to be completed by the author>
Tool: Codex (model: GPT-6), date: 2026-11-07
Scope: Restore Friend on Campus as the product name in the heading and overview.
Author review: <to be completed by yanhwee>

Tool: Google Antigravity Agent, date: 2026-11-07
Scope: Updated project heading and overview to tompang. — Friend on Campus (FoC), fixing historical 'Friend of Campus' typo to align with official CS3219 lecture project designation (FoC – Friend on Campus).
Author review: <to be completed by yanhwee>

Tool: Google Antigravity Agent, date: 2026-10-28
Scope: Added infra/k8s/README.md documentation index, updated worker ASG sizing (min=2, desired=2) in Day 1/Day 2 operations guide and ASCII topology, documented Docker k6 commands, recorded ServiceLB ALB port forwarding and Debezium CDC outbox integration, and documented Natural-Language Errand Assistant (F6) environment configuration (SOCLAAS_*), offline fallback resilience, and monorepo structure updates.
Author review: <to be completed by yanhwee>

Tool: Claude Code (model: Claude Fable 5.1), date: 2026-10-26
Scope: Test-command table gained the `npm run test:e2e:ui:realtime` row and the artifacts note names `test-results/uat-realtime/` (issue #197).
Author review: <to be completed by Reallyeasy1>

Tool: Claude Code (model: Claude Fable 5.1), date: 2026-10-25
Scope: Test-command table gained the `npm run coverage` row (moved here from the deleted docs/ci.md while merging main into PR #147).
Author review: <to be completed by Reallyeasy1>

Tool: Codex (model: GPT-6), date: 2026-10-25
Scope: Added source-linked technical navigation and corrected verified Claude workflow facts; preserved course policy and permissions.
Author review: <to be completed by Reallyeasy1>

Tool: Google Antigravity Agent, date: 2026-10-22
Scope: Fixed Local Development Workflow migration/seeding ordering (db:deploy before db:seed), documented root db:deploy and offline db:seed commands, added .env setup to Quick Start with Docker, and updated test:seed and test:acceptance descriptions.
Author review: <to be completed by yanhwee>

Tool: Google Antigravity Agent, date: 2026-10-21
Scope: Updated JWT key generation instructions after removing clipboard copying from scripts/generate-jwt-keys.mjs.
Author review: <to be completed by yanhwee>

Tool: Google Antigravity Agent, date: 2026-10-21
Scope: Consolidated CI/testing documentation from docs/ci.md into Testing & Verification, removed docs/ from the monorepo tree, and updated System Documentation links to point to the project Wiki.
Author review: <to be completed by yanhwee>

Tool: Google Antigravity Agent, date: 2026-10-21
Scope: Updated local development server commands, test category table, and monorepo structure tree for scripts/dev.mjs, scripts/prisma-migrate.mjs, and test:e2e:api.
Author review: <to be completed by yanhwee>

Tool: Claude Code (model: Claude Opus 5.5 subagent, Claude Fable 5.1 session), date: 2026-10-18
Scope: Refreshed facts to main @ 7f2d972: diagram arrows, Milestone Status (D2 done, D3 prepared, wiki link), access URLs for all services, seed commands, Testing & Verification categories, seed-account permissions, Monorepo Structure tree; merged the second disclosure block into this one.
Author review: <to be completed by Reallyeasy1>

Tool: Google Antigravity Agent, date: 2026-10-11
Scope: Updated documentation links to the flattened specification structure.
Author review: <to be completed by author after review>

Tool: Codex (model: GPT-6), date: 2026-09-30
Scope: Documented the working admin gateway route and student login navigation.
Author review: <to be completed by huangjiaxi1111>

Tool: Codex (model: GPT-5.6 Terra), date: 2026-09-22
Scope: Updated D2 test and seed-account descriptions to match the author-approved User Service contracts.
Author review: <to be completed by ngkhengyang>

Tool: Codex (model: GPT-5.6 Terra), date: 2026-09-22
Scope: Corrected stale Milestone D2 implementation facts after the author-approved User and Supplier Service migrations.
Author review: <to be completed by ngkhengyang>

Tool: Claude Code (model: Claude Fable 5.1), date: 2026-09-21
Scope: Added the "Documentation index" and "Claude Code set-up" links under Milestone Documentation. Nothing else in this file was changed.
Author review: <to be completed by Reallyeasy1>

Tool: Codex (model: GPT-6), date: 2026-09-24
Scope: Updated the local RabbitMQ dashboard login for separate service identities.
Author review: <to be completed by huangjiaxi1111>
-->

# Friend on Campus (FoC) 🏃‍♂️💨

> **CS3219 Software Design and Architecture (AY26/27 S1) — Project Group 25**  
> Peer-to-Peer Campus Errand Platform with Closed Credit Economy & Verified Campus Suppliers

**Friend on Campus (FoC)** connects NUS students who need quick favors (coffee from COM3, printing at Central Library, parcel pickup from PGPR) with peers already walking nearby. The platform operates on a **closed credit economy** with escrow guarantees, discrete milestone updates, role-based access control, and asynchronous event notifications.

---

## 🏛️ Architecture & System Design

The current implementation has six backend services (User, Supplier, Order, Credit, Notification and Chat), two React apps and an NGINX gateway. Each service owns a logical PostgreSQL database. User/Order/Credit domain events flow through transactional outboxes, Debezium and RabbitMQ; Chat/Notification use separate realtime outboxes and fanout signals between replicas.

Start with the [system overview](docs/architecture/system-overview.md), [service boundaries](docs/architecture/service-boundaries.md) and [event flow](docs/architecture/communication-and-events.md). Local development uses Docker Compose; cloud rollout uses [ECS Terraform](infra/terraform/ecs/README.md).

Each service generates its own Prisma client from `prisma/schema.prisma` and imports it through `src/database/client.ts`. Schemas and migrations are service-owned.

---

## 🎯 Milestone Records

| Milestone | Scope & Deliverables | Status |
| :--- | :--- | :---: |
| **D1** | System Design, Product Backlog, Wireframes & Contracts | ✅ Completed |
| **D2** | **User Service (M2) & Supplier Service (M3) Integration**<br/>• PostgreSQL persistence via Prisma ORM<br/>• Password hashing and valid-email account registration<br/>• Ed25519 access tokens, opaque refresh sessions, and Express RBAC middleware<br/>• Cross-service authorization (Admin CRUD vs Student 403 Forbidden)<br/>• Admin Portal (CRUD modals, sorting, search, Screen 6 mobile cards)<br/>• Student App live directory integration & spot pre-selection<br/>• Automated end-to-end contract suite requiring seeded PostgreSQL | ✅ **Completed** |
| **D3 (historical scope)** | **Order Service (M1), Credit Service (M4) & Notification Service (M5)**<br/>• All five services real (Prisma + PostgreSQL 16, one database each)<br/>• Errand lifecycle with transactional outbox, optimistic locking and single-winner accept<br/>• Credit wallets, ledger, escrow reserve/settle/refund and welcome grant over RabbitMQ<br/>• Notification consumer, store, REST and authenticated WebSocket; student-app bell, toasts and Alerts board<br/>• Admin order management (cancel, complete, unassign) and user management<br/>• CI with isolated test orchestration | 📋 **Prepared** (demo script and evidence: wiki [Milestone D3](https://github.com/AY2627S1-CS3219-P25/friend-on-campus/wiki/Milestone-D3); Week 10) |
| **D4** | **AWS ECS Deployment & Distributed Concurrency Testing**<br/>• Terraform for ECS, CloudFront, RDS, RabbitMQ and EFS<br/>• k6 concurrency and load tests | Infrastructure code ready for deployment testing |

---

## 🚀 Quick Start with Docker (Recommended)

Start the local services, frontends, PostgreSQL, RabbitMQ, Debezium CDC and NGINX gateway. Compose runs the configured service migrations and User/Supplier/Order/Credit seeds; application images themselves start the app only:

```bash
# 1. One-time environment setup (if .env does not exist yet):
cp .env.example .env
npm run generate:jwt-keys   # paste the printed JWT_PRIVATE_KEY and JWT_PUBLIC_KEY into .env

# 2. Build and start the full stack:
docker compose up --build
```

> **Existing data:** follow the [local upgrade and troubleshooting guide](docs/development/local-development.md) before changing database or broker state. `docker compose down -v` deletes local volumes; it is a deliberate disposable-stack reset, not a routine upgrade step.

### Accessing the Platform
| Component | Local Access URL | Description |
| :--- | :--- | :--- |
| **Unified Web Ingress** | [http://localhost](http://localhost) | Main Gateway (routes to Student Mobile App) |
| **Admin Portal** | [http://localhost/admin/](http://localhost/admin/) | Admin login, supplier, user and order management; also available directly at [port 5174](http://localhost:5174/admin/) |
| **Student App** | [http://localhost:5173](http://localhost:5173) | Student Errand Feed & Campus Spots |
| **User Service Health** | [http://localhost:8001/health](http://localhost:8001/health) | M2 Health Probe (`/api/users/me` for auth) |
| **Supplier Service Health**| [http://localhost:8002/health](http://localhost:8002/health) | M3 Health Probe (`/api/suppliers` for catalog) |
| **Order Service Health** | [http://localhost:8003/health](http://localhost:8003/health) | M1 Health Probe (`/api/orders` for errands) |
| **Credit Service Health** | [http://localhost:8004/health](http://localhost:8004/health) | M4 Health Probe (`/api/credits/wallet`, `/api/credits/ledger`) |
| **Notification Service Health** | [http://localhost:8005/health](http://localhost:8005/health) | M5 Health Probe (`/api/notifications`; WebSocket through the gateway at `ws://localhost/ws/`) |
| **Chat Service Health** | [http://localhost:8006/health](http://localhost:8006/health) | `/api/chat`; WebSocket through `ws://localhost/ws/chat/` |
| **RabbitMQ Web Dashboard** | [http://localhost:15672](http://localhost:15672) | Development login: `campus_admin` / `campus-admin-dev` (vhost `campus`; AMQP on port 5672) |
| **PostgreSQL Shell** | `docker exec -it campuserrand-postgres psql -U postgres` | Database shell |

---

## 💻 Local Development Workflow (Without Docker)

When developing individual features directly on your machine with instant TypeScript execution (`tsx`) and hot-reloading:

### 1. Install dependencies & generate Prisma clients
```bash
npm ci
```
*(Runs root `postinstall` hook which automatically executes `prisma generate` across all services).*

### 2. Configure Environment & JWT Keys
Copy `.env.example` to `.env` and generate an Ed25519 key pair for JWT access token signing:
```bash
cp .env.example .env
npm run generate:jwt-keys   # prints JWT_PRIVATE_KEY and JWT_PUBLIC_KEY; paste them into .env
```

#### Optional: Natural-Language Errand Assistant (F6 / SoCLaaS)
To enable zero-shot LLM parsing in the errand creation flow, obtain an API key from the [NUS School of Computing SoCLaaS Portal](https://soclaas-portal.comp.nus.edu.sg/) (only accessible on school network, use VPN if needed) and configure it in `.env`:
```env
SOCLAAS_BASE_URL=https://soclaas-api.comp.nus.edu.sg/v1
SOCLAAS_API_KEY=your_soclaas_api_key_here
SOCLAAS_MODEL=default
```
> **Note (Offline Fallback Resilience):** If `SOCLAAS_API_KEY` is omitted or left empty, `order-service` gracefully falls back to a deterministic offline regex/heuristic parser. An API key is **not** required for local development or automated tests.

### 3. Start PostgreSQL & RabbitMQ
```bash
docker compose up postgres rabbitmq -d
```

### 4. Apply Database Migrations
`docker/postgres-init/` only provisions the six empty databases and least-privilege service roles (`user_svc`, `supplier_svc`, `order_svc`, `credit_svc`, `notification_svc`, `chat_svc`). Apply all committed Prisma migrations across every service before seeding or starting Debezium CDC:
```bash
# Apply committed migrations across all 6 services (prisma migrate deploy)
npm run db:deploy

# Or apply migrations for an individual service:
npm run db:deploy -w @campus-errand/user-service
```
*(Note: Use `db:deploy` to apply existing migrations—the least-privilege service roles do not have `CREATEDB` permissions for Prisma's shadow database. When authoring a new schema change with `npm run db:migrate -w @campus-errand/<service>`, use a disposable development database and a `DATABASE_URL` role with the permissions needed to create the shadow database. `SHADOW_DATABASE_URL` is not wired into the current schemas.)*

Transactional outbox events from User, Order, and Credit are published to RabbitMQ by Debezium (`debezium-user`, `debezium-order`, `debezium-credit`). Once migrations are applied, start the CDC connectors so outbox events flow during host-based development:
```bash
docker compose up --no-deps -d debezium-user debezium-order debezium-credit
```

### 5. Seed Databases (First-Time Setup)
```bash
# Seed all services at once (User, Supplier, Order, and Credit)
npm run db:seed

# Or seed individual workspaces:
npm run db:seed -w @campus-errand/user-service     # admin@nus.edu.sg, alice@u.nus.edu, bob@u.nus.edu
npm run db:seed -w @campus-errand/supplier-service # 21 verified NUS campus locations from CSV
npm run db:seed -w @campus-errand/order-service    # sample OPEN errands (requires SEED_SAMPLE_ORDERS=true in .env)
npm run db:seed -w @campus-errand/credit-service   # 100-credit wallets for the three seed accounts
```
*(When `user-service` is running at `USER_SERVICE_URL`, `credit-service` resolves the seed accounts via HTTP login; when run offline before starting dev servers, it falls back to the deterministic seed account UUIDs.)*

### 6. Run Development Servers
```bash
# Run everything in parallel (6 backend services + 2 frontend apps)
npm run dev

# Or run only backend services or only frontend apps in parallel
npm run dev:services    # Ports 8001–8006
npm run dev:apps        # Ports 5173–5174

# Or run individual workspaces (via scripts/dev.mjs filter or native npm -w)
npm run dev -- user supplier
npm run dev -w services/user-service         # Port 8001 (User & Auth Service)
npm run dev -w services/supplier-service     # Port 8002 (Supplier Directory Service)
npm run dev -w services/order-service        # Port 8003 (Order Service)
npm run dev -w services/credit-service       # Port 8004 (Credit Service)
npm run dev -w services/notification-service # Port 8005 (Notification Service)
npm run dev -w services/chat-service         # Port 8006 (Chat Service)
npm run dev -w apps/student-app              # Port 5173 (Student Web App)
npm run dev -w apps/admin-portal             # Port 5174 (Admin Web Portal)
```

---

## 🧪 Testing & Verification

### Full Isolated Suite
Creates a uniquely named Compose project on free loopback ports, runs its configured workspace and system suites (installing Chromium if needed), and removes only that project's containers and volumes:
```bash
npm test
```

The separate `test:e2e:ui:realtime` command and k6 campaigns are not part of this aggregate. CI explicitly runs the realtime browser command. See the [testing guide](docs/development/testing-strategy.md) for exact scope and prerequisites.

### Test Categories
| Command | Scope |
| :--- | :--- |
| `npm run test:unit` | Nine unit suites across six backends, both frontends and shared messaging |
| `npm run test:integration` | PostgreSQL-backed suites: User admin guard, Credit, Notification and Chat |
| `npm run test:messaging` | PostgreSQL + RabbitMQ suites: Credit, Notification, Order and Chat (`npm test` provisions isolated `credit_messaging_test` and `order_messaging_test` databases automatically; direct runs require migrated `_test` databases and the `*_TEST_*` env vars below) |
| `npm run test:migration` / `npm run test:seed` | Migration checks for Credit and Supplier; seed validation for Credit |
| `npm run test:acceptance` | Acceptance drivers against a healthy Compose stack: `scripts/uat/uat-d2-api.mjs`, `scripts/uat/uat-notifications.mjs`, and `scripts/uat/uat-cdc.mjs` |
| `npm run test:e2e:api` | Milestone D2 API end-to-end suite (`scripts/test-d2-e2e.ts`, below) |
| `npm run test:e2e:ui` | Chromium browser UAT (`scripts/uat/uat-d2-ui.mjs`, Playwright) against a healthy Compose stack |
| `npm run test:e2e:ui:realtime` | Multi-client real-time UAT (`scripts/uat/uat-realtime.mjs`, Playwright): the requester on two clients, two couriers racing for one errand; checks notifications and chat stay consistent live. Registers one throwaway `uatcourier-<stamp>@u.nus.edu` account. `UAT_RESTART_CHAT=1` adds a Chat Service container restart under load (opt-in; runs `docker restart` on the host) |
| `npm run coverage` | Unit coverage per service via Node's built-in reporter; writes `services/<svc>/coverage/lcov.info` (git-ignored) for editor extensions such as Coverage Gutters. Not a CI check |
| `npm run test:e2e` | API E2E, then browser UAT, using the isolated orchestration |
| `npm run ci:validate-tests` | Checks workspace `test:*` scripts against the static CI matrices in `.github/workflows/ci.yml` |
| `npm run perf:k6 -- --target http://localhost --profile smoke --workload all` | k6 API load harness (manual, not a CI gate): run-owned fixtures, per-operation thresholds linked to issues #74/#29/#33/#43/#45/#36, with author-raised latency limits and lowered supplier VUs, reconciliation and an evidence bundle under `test-results/<runId>/`; needs the `k6` binary; remote targets also need `PERF_ADMIN_EMAIL`/`PERF_ADMIN_PASSWORD` (loopback defaults to the seeded admin). `npm run perf:k6:load` runs every configured load population against the local stack; PASS does not establish the original NFRs. See [`tests/k6/README.md`](tests/k6/README.md) and the manual `performance.yml` workflow |

### CI & Test-Suite Conventions (`.github/workflows/ci.yml`)
- **Naming convention:** Package-level automated tests use `test:unit`, `test:integration`, `test:messaging`, `test:migration`, or `test:seed`. Interactive/watch scripts (`test:watch`) are excluded from CI.
- **Static matrix validation:** Whenever adding, renaming, moving, or removing a test script, update the corresponding matrix entry in `.github/workflows/ci.yml` and run `npm run ci:validate-tests`.
- **Direct category environment variables:** `npm test` injects isolated test URLs. Direct suite runs require the migrated test databases and suite-specific variables in the [testing guide](docs/development/testing-strategy.md); User uses `ADMIN_GUARD_TEST_DATABASE_URL`, not `USER_TEST_DATABASE_URL`. Never point mutation/seed suites at shared production data.
- **Test artifacts:** Browser UAT screenshots and JSON reports are written to the git-ignored `test-results/` directory (`test-results/screenshots/`, `test-results/uat-d2-ui-results.json`, `test-results/uat-d2-api-results.json`, `test-results/uat-realtime/`) and uploaded as CI workflow artifacts.

### Automated Milestone D2 End-to-End Suite
Generates a test-only Ed25519 key pair and verifies account registration followed by
separate login, immutable email, administration authorization (user list, status and role toggles), supplier querying,
and cross-service ADMIN RBAC enforcement. It requires PostgreSQL with the User and Supplier
Service seed data present; it does not use the `.env` JWT key pair. It spawns user-service and
supplier-service itself on ports 8001/8002, so those ports must be free.

```bash
npm run test:e2e:api
```

### Lint, Build & Universal Typecheck
Typechecks all 12 workspaces (2 apps, 6 services, 4 packages); each service's `typecheck` covers its tests too:
```bash
npm run lint
npm run build
npm run typecheck
```

---

## ☁️ Cloud Deployment & DevOps (Milestone D4)

Use the [ECS Terraform rollout](infra/terraform/ecs/README.md) to deploy in AWS Singapore. The stack runs on three shared ARM64 hosts behind CloudFront and an Application Load Balancer. The [cloud architecture guide](docs/new-cloud-architecture-guide.md) covers sizing, costs and verification. From `main`, use **Deploy applications to ECS** for tested ARM64 application releases and migrations, or **Deploy ECS infrastructure** to preview and apply infrastructure updates. Both workflows are manually triggered. Complete the linked OIDC and shared-state setup before using GitHub delivery.

After deployment, use the CloudFront URL from Terraform's `public_url` output for k6 tests. Run from the repository root.

```bash
# AI-generated (edited by ngkhengyang)
export TARGET_HOST="$(terraform -chdir=infra/terraform/ecs output -raw public_url)"
# Bounded k6 API load against the deployed gateway. Agree the target and limits first; the manual
# "Performance (k6, manual)" GitHub Actions workflow runs the same command. The k6 scripts need the fixtures
# this wrapper creates, so they are not run directly (tests/k6/README.md).
PERF_ADMIN_EMAIL=<admin email> PERF_ADMIN_PASSWORD=<admin password> \
  npm run perf:k6 -- --target "$TARGET_HOST" --profile smoke --workload all
# Load and stress profiles against a deployed target also need --acknowledge-remote-load.
```

---

## 🔐 Default Seed Accounts & Credentials

For local development, testing, and mentor demonstrations, the following accounts are pre-seeded:

| Role | Email Address | Password | Permissions |
| :--- | :--- | :--- | :--- |
| **Administrator** | `admin@nus.edu.sg` | `Password123!` | Full directory CRUD; user management (list, enable/disable, role toggle, delete); admin order cancel / complete / unassign |
| **Student (Alice)** | `alice@u.nus.edu` | `Password123!` | Dual-role (Requester/Courier), read directory, manage profile; 100 starting credits |
| **Student (Bob)** | `bob@u.nus.edu` | `Password123!` | Dual-role (Requester/Courier), read directory, manage profile; 100 starting credits |

---

## 📦 Monorepo Structure

| Directory | Purpose |
|---|---|
| `apps/` | Student and admin frontends |
| `services/` | Six backend services, schemas, migrations and tests |
| `packages/` | Shared auth, DTOs, messaging and LLM helpers |
| `gateway/`, `docker/` | Local ingress, PostgreSQL initialization, RabbitMQ and CDC |
| `infra/terraform/ecs/` | AWS configuration and canonical rollout runbook |
| `scripts/`, `tests/` | Development tools, CI/UAT drivers, k6 harness and Postman examples |
| `docs/` | Implementation, operations, testing and historical references |
| `data/` | Supplier seed datasets and images |
| `ai/` | Required AI usage record |

[`docker-compose.yml`](docker-compose.yml) runs the local stack; [`docker-compose.test.yml`](docker-compose.test.yml) supplies isolated-test overrides.


---

## 📄 System Documentation & Project Wiki

- **[Confirmed CloudFront and ECS cloud architecture](docs/new-cloud-architecture-guide.md)**: Viewer HTTPS, HTTP origin, bridge networking, three-host ceiling, accepted trial resources, costs and deferred team decisions.
- **[ECS Terraform rollout](infra/terraform/ecs/README.md)**: Provisioning, secrets, database setup and startup order.
- **[Technical reference and complete documentation index](docs/README.md)**: Six services, frontends, packages, operations and source verification.
- **[Test and UAT configuration](docs/development/testing-strategy.md#driver-environment-matrix)**: `GW`, `AMQP_URL`, `WS_URL`, output paths and broker-port overrides for each driver.
- **[Documentation verification and pending questions](docs/audits/review-findings.md)**: Actual check results, source boundaries and human review items.

Design context, domain proposals and milestone history are retained in the **[Project Wiki](https://github.com/AY2627S1-CS3219-P25/friend-on-campus/wiki)**. Some pages retain older baselines; use the [current reference](docs/README.md) and [drift register](docs/audits/documentation-drift.md) for implementation facts:

- **[Wiki Home](https://github.com/AY2627S1-CS3219-P25/friend-on-campus/wiki)**: Project overview & milestone navigation
- **[System Architecture](https://github.com/AY2627S1-CS3219-P25/friend-on-campus/wiki/Architecture)**: Microservice topology, Debezium CDC outbox connectors, RabbitMQ quorum queues, and reservation saga choreography
- **[Authentication & Roles](https://github.com/AY2627S1-CS3219-P25/friend-on-campus/wiki/Authentication-and-Roles)**: Ed25519 access tokens, rotating opaque refresh cookies, RBAC matrix, and least-privilege database/broker identities
- **[Services & Domain Lifecycle](https://github.com/AY2627S1-CS3219-P25/friend-on-campus/wiki/Services)**: Order state machine (`PENDING` → `OPEN` → `ACCEPTED` → `IN_TRANSIT` → `DELIVERED` → `COMPLETED`), closed credit economy & escrow ledger, and real-time notifications
- **[Data Model](https://github.com/AY2627S1-CS3219-P25/friend-on-campus/wiki/Data-Model)**: Per-service PostgreSQL schemas (`user_db`, `supplier_db`, `order_db`, `credit_db`, `notification_db`, `chat_db`)
- **[Testing & Evidence](https://github.com/AY2627S1-CS3219-P25/friend-on-campus/wiki/Testing-and-Evidence)** & **[Milestone D3](https://github.com/AY2627S1-CS3219-P25/friend-on-campus/wiki/Milestone-D3)**: Automated test matrix, acceptance evidence, and Milestone D3 presentation runbook
- **Claude Code Set-up**: [`.claude/README.md`](./.claude/README.md) & [`CLAUDE.md`](./CLAUDE.md)
