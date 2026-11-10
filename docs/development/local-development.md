<!--
AI Assistance Disclosure:
Tool: Codex (model: GPT-6), date: 2026-10-25 to 2026-11-09
Scope: Source-linked implementation documentation and evidence review requested by Reallyeasy1; updated across 6 AI-assisted revisions through D4 wrap-up (clarify Compose test-version requirements, foreground development sessions and API E2E target troubleshooting).
Author review: I validated correctness, edited for style, and verified with automated tests.
-->

# Run and develop the application locally

This guide takes you from a checkout to a working student and administrator interface. You can run everything in Docker, or keep the infrastructure in Docker while editing TypeScript with hot reload. Both modes use the same six services and database schemas; they differ in how processes start and how browser requests reach them.

All commands below run from the repository root. The [documentation index](../README.md) records the inspected source revision; [the system guide](../architecture/system-overview.md) explains the components you are starting.

## Choose the mode that fits your work

| | Full Docker Compose | Host development |
|---|---|---|
| Use it for | Trying the application and checking the container stack | Editing backend or frontend code with hot reload |
| Application processes | Built backend JavaScript and static NGINX frontends | `tsx watch` backends and Vite frontends |
| Infrastructure | PostgreSQL, RabbitMQ and Debezium in Compose | The same infrastructure in Compose |
| Browser entry | `http://localhost` and `/admin/` | `http://localhost:5173` and `http://localhost:5174/admin/` |
| Schema/data setup | Compose startup commands migrate and seed | You run migrations and seed commands explicitly |

Install Docker with Compose v2; use **Compose 2.24.4 or newer** if you will run `npm test` or `npm run test:e2e`. Those commands load [`docker-compose.test.yml`](../../docker-compose.test.yml), whose `!override` tags require that version. Check with `docker compose version`; the ordinary local stack does not use those tags. For host commands, use Node **22.3 or newer** and npm; CI uses Node 22.

The application Dockerfiles use their own pinned Node 20/NGINX images, so changing your host Node version does not change the container runtime. Ports 80, 5432, 5672, 15672, 8001–8006 and 5173–5174 must be available for the default full stack.

Do not run both application modes on their default ports simultaneously. Starting a Vite app while its container already occupies 5173, for example, can leave you looking at a different process from the one you are editing.

## Prepare the checkout

Install the lockfile's dependencies:

```bash
npm ci
```

The root postinstall generates a separate Prisma client for each of the six services. Prisma is the database-access library; generating its client creates TypeScript/JavaScript bindings, **not database tables**. If generated imports later disappear, regenerate them without modifying the database:

```bash
npm run db:generate --workspaces --if-present
```

On a fresh checkout, copy [`.env.example`](../../.env.example) to `.env` once, then generate the local signing keys:

```bash
cp .env.example .env
npm run generate:jwt-keys
```

The key command prints `JWT_PRIVATE_KEY` and `JWT_PUBLIC_KEY`; paste the values into your local `.env`. It does not edit the file for you. Do not overwrite an existing `.env` or regenerate an established environment's keys as a routine restart: previously issued tokens would no longer verify. Keep private keys and credentials out of commits, screenshots and shared logs.

User Service signs access tokens with the private key. The other services need the corresponding public key, issuer and audience. A successful login followed by `401` responses from another service often means these values disagree.

The template contains local per-service database URLs and default ports. An empty `SOCLAAS_API_KEY` is sufficient to start local development: the Order assistant has an offline parsing fallback. That does not test live model-backed features such as translation; see the [Chat guide](../services/chat-service/README.md).

## Option A: start the full container stack

```bash
docker compose up --build -d
docker compose ps
```

Wait for the backend dependencies to become healthy before opening `http://localhost`. RabbitMQ has a deliberately long startup allowance, so an initially starting broker is not by itself a failure. Inspect progress rather than repeatedly restarting it:

```bash
docker compose logs --tail=80 postgres rabbitmq
docker compose logs --tail=80 user-service credit-service
```

The gateway serves the student interface at `/` and the administrator interface at `/admin/`. Use this shared entry point for the container stack; the frontends make relative API and WebSocket requests that the gateway routes.

Compose explicitly overrides each backend's startup command to run committed migrations. It seeds User, Supplier, Order and Credit before starting their apps; Notification and Chat have no startup seeder. The images themselves start the application only, which is why [cloud rollout](../architecture/cloud-architecture.md) uses separate migration jobs.

User/Supplier seed failure prevents their container startup. Order/Credit startup logs seed failure and continues, so a running container does not prove that demonstration errands or wallets were created. Use the seeded accounts described in the [root README](../../README.md), then inspect their actual data in the UI.

For a simple stop that preserves local data:

```bash
docker compose down
```

## Option B: edit applications on the host

Start the databases and broker, then check their health:

```bash
docker compose up -d postgres rabbitmq
docker compose ps
```

After they are ready, apply the service schemas, start the three outbox connectors, seed development data and start the applications:

```bash
npm run db:deploy
docker compose up --no-deps -d debezium-user debezium-order debezium-credit
npm run db:seed
npm run dev
```

`--no-deps` is intentional here: the connectors need PostgreSQL/RabbitMQ and migrated outbox tables, but Compose must not also start the application containers whose ports the host processes will use. Debezium reads committed database changes and forwards business events to RabbitMQ. Without it, account creation can succeed while the welcome wallet or a later order reservation remains unprocessed.

`npm run dev` starts six backends and both frontends with prefixed logs and stays in the foreground. The student app is at `http://localhost:5173`; the admin app is at `http://localhost:5174/admin/`. Keep this terminal open and use a second terminal at the repository root for typechecks and focused tests. Ctrl+C stops the child application processes. The infrastructure containers continue running until you stop them separately.

For a smaller editing session, select only the processes you need:

```bash
npm run dev -- user supplier student
npm run dev:services
npm run dev:apps
npm run dev -w @campus-errand/chat-service
```

These are alternatives, not commands to run simultaneously. Supported short names are `user`, `supplier`, `order`, `credit`, `notif`, `chat`, `student` and `admin`. A partial session supports only the features whose dependencies are running: selecting Chat alone does not create the accepted-order conversation it needs.

### How host requests find their service

Vite proxies the browser's `/api/...` and WebSocket paths to the host service ports. The Student proxy also forwards `/admin` to the Admin Vite process. `/ws/` is Notification; `/ws/chat/` is Chat.

Both [Student](../../apps/student-app/vite.config.ts) and [Admin](../../apps/admin-portal/vite.config.ts) read proxy overrides from `process.env`. To route host frontends through an already-running local gateway, set the variable in the shell launching them:

```bash
GATEWAY_URL=http://localhost npm run dev:apps
```

This example uses POSIX shell syntax; in PowerShell, set `$env:GATEWAY_URL` before starting npm. The current Vite configs do not load the repository root `.env` into `process.env`, so adding this override only to that file is insufficient. Backend dotenv loading and frontend proxy configuration are different mechanisms.

A Vite override also cannot change a built frontend or the cloud gateway. Those use the checked-in NGINX/ECS configuration described in the [cloud guide](../architecture/cloud-architecture.md).

## Manage schemas and development data deliberately

Each service owns its `prisma/schema.prisma`, migrations and generated client. The PostgreSQL initialization scripts create six logical databases and service roles; they do not create application tables. Initialization scripts run when the PostgreSQL volume is first created, so editing them does not automatically update an existing volume.

| Task | Command / behavior |
|---|---|
| Apply existing migrations across services | `npm run db:deploy` |
| Apply one service's migrations | `npm run db:deploy -w @campus-errand/user-service` |
| Author a new migration after an approved schema change | `npm run db:migrate -w @campus-errand/user-service` |
| Refresh generated code after schema changes | `npm run db:generate --workspaces --if-present` |
| Seed all development data | `npm run db:seed` |
| Seed one service | `npm run db:seed -w @campus-errand/supplier-service` |

The migration helpers select an existing `DATABASE_URL` before the service-specific `USER_DATABASE_URL`, `CREDIT_DATABASE_URL`, and equivalent settings. A global exported `DATABASE_URL` can therefore send every root migration command to the same database. Verify the selected target before running it. The shared [migration helper](../../scripts/prisma-migrate.mjs) and [Chat package scripts](../../services/chat-service/package.json) contain the exact precedence.

`db:migrate` creates a migration and may need permission to create a shadow database. The least-privilege development service roles do not have that permission. Use a suitable identity against a disposable development database when authoring migrations; `SHADOW_DATABASE_URL` alone is not wired into the current schemas. Use `db:deploy` when you simply need migrations already in Git.

Seeding is a data mutation, not a health check. User seeding restores the defined demonstration accounts' usernames, roles and password hashes. Credit seeding initializes missing wallets without resetting existing balances, and can reserve credits for sample errands. `SEED_SAMPLE_ORDERS=true` enables the sample Order/Credit fixtures. Credit can use deterministic seed identities when User Service is unreachable; an explicit failed login is not treated as that offline case.

For older Supplier rows without coordinates, follow the targeted upgrade procedure in the [Supplier guide](../services/supplier-service/README.md). Do not reset the entire stack to repair a missing coordinate or a pending migration.

### Reset only a disposable stack

The following removes this Compose project's named volumes, including database, broker and CDC checkpoint data. Use it only when you deliberately want a fresh local environment and have no data to retain:

```bash
docker compose down -v
docker compose up --build -d
```

A normal restart or upgrade should preserve volumes. If an existing environment fails to migrate, first inspect the failing migration and its database target rather than deleting the evidence.

## Troubleshoot the first failing boundary

| Symptom | Check | What it tells you |
|---|---|---|
| Generated Prisma import missing | Regenerate clients after installing dependencies | Generated code is separate from applying database migrations |
| Port already in use / edits not visible | Compare running host processes with `docker compose ps` | Another copy of the app may own the URL you opened |
| Missing column or relation | Check the affected service's migration output and target database | A healthy PostgreSQL server does not prove that service schema is current |
| Login works but another API returns `401` | Compare public key, issuer and audience across processes | Services verify tokens independently |
| Wallet absent after signup | Inspect User outbox, `debezium-user` and Credit consumer logs | Wallet initialization is asynchronous |
| Errand remains `PENDING` | Trace reservation request/result through Order, Credit and CDC | Repeating the POST can create more work without fixing the original transition |
| Chat/alerts work only after refresh | Check both WebSocket routes, then the realtime relay/subscriber | REST history and live delivery are separate paths |
| UAT gets broker `ACCESS_REFUSED` | Check AMQP port, identity and `/campus` vhost | `GW` changes HTTP routing, not the broker used by a test driver |
| API E2E cannot bind 8001/8002 | Stop existing User/Supplier listeners or use the driver's port overrides | That driver starts its own service processes |
| API E2E ignores a configured test database URL | Check the [driver's fixed database targets](testing-strategy.md#run-user-and-supplier-api-e2e-directly) and selected PostgreSQL port | It always uses `user_db` and `supplier_db` with local `postgres:postgres` credentials; URL overrides do not retarget it |
| Aggregate tests fail while parsing `!override` | Run `docker compose version` | The test override file requires Compose 2.24.4+ |

For event, queue and retry diagnosis continue with [messaging and recovery](../infrastructure/cdc-and-broker.md). For a failing test, use the [testing guide](testing-strategy.md) rather than changing live infrastructure to satisfy a local test.

## Make a change and keep the next developer oriented

Start with the affected service guide, then follow its links to routes, validation, persistence and tests. Shared DTOs live in `packages/common-dtos`; Prisma imports go through each service's `database/client` facade. After an approved implementation change, update the guide that owns that behavior instead of adding another overview.

Run the focused tests and workspace typecheck described in the [testing guide](testing-strategy.md). If a `test:*` script is added, renamed or removed, update the static CI matrix and run `npm run ci:validate-tests`. Keep the root README a quick start, `docs/` an implementation/operations reference, and the wiki a source of design and milestone context.

[AGENTS.md](../../AGENTS.md) and [CLAUDE.md](../../CLAUDE.md) govern AI-assisted work, attribution, usage logging and publication approval. Preserve human-review placeholders rather than completing them yourself. The checked-in [Claude setup](../../.claude/README.md), [settings](../../.claude/settings.json), [plugins](../../.claude/PLUGINS.md), [agents](../../.claude/agents) and [hooks](../../.claude/hooks) describe tooling; a tool permission or warning-only hook is not authorization to publish. Setup prose claiming Git writes are denied is stale relative to the current settings, while the explicit-approval policy still applies.

The source for these commands is the [root package](../../package.json), [dev runner](../../scripts/dev.mjs), [Compose configuration](../../docker-compose.yml) and service package scripts. Verify changed commands there before refreshing this guide's claims.
