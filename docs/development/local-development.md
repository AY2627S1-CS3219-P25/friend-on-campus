<!--
AI Assistance Disclosure:
Tool: Codex (model: GPT-6), date: 2026-11-09
Scope: Refresh six-service local commands, migration ownership, host/container routing and troubleshooting against main.
Author review: <to be completed by Reallyeasy1>

Tool: Codex (model: GPT-6), date: 2026-10-25
Scope: Source-linked implementation documentation and evidence review requested by Reallyeasy1.
Author review: <to be completed by Reallyeasy1>
-->

# Local development

Source baseline: [`b989758`](https://github.com/AY2627S1-CS3219-P25/friend-on-campus/commit/b989758e766cb593c3b8c94102eb6dfb5c7d8491); inspected 9 November 2026 (SGT). These are source-verified instructions, not evidence of a new runtime test or a live AWS deployment.

Use the [root quick start](../../README.md) for initial environment setup and seed accounts. This page explains which command to use and how host development differs from the container stack. Commands below run from the repository root.

## Choose a runtime

| Mode | Application processes | Dependencies and routing |
|---|---|---|
| Full Compose | Six backend services, two static NGINX frontends and the API gateway | Compose PostgreSQL, RabbitMQ and three Debezium connectors; use the gateway at `http://localhost` |
| Host development | `tsx watch` backends on 8001–8006 and Vite apps on 5173/5174 | Start PostgreSQL/RabbitMQ and CDC separately; Vite proxies API/socket requests to local services unless an override is supplied |

Host tooling requires Node **>=22.3** and npm. CI uses Node 22. The checked-in application Dockerfiles use Node 20 build/backend images and NGINX frontend runtime images; those are separate environments, not evidence that every supported host version was tested.

## Command reference

| Task | Command | Prerequisite or effect |
|---|---|---|
| Install locked dependencies | `npm ci` | Uses the lockfile; root postinstall generates all **six** isolated Prisma clients |
| Regenerate Prisma clients | `npm run db:generate --workspaces --if-present` | Does not apply migrations or seed data |
| Start local dependencies | `docker compose up -d postgres rabbitmq` | Configure local environment first; wait for health before migrations |
| Apply committed migrations | `npm run db:deploy` | Applies all six service schemas to the configured databases |
| Start outbox transport | `docker compose up --no-deps -d debezium-user debezium-order debezium-credit` | Start after the relevant migrations; `--no-deps` does not start application services |
| Seed development data | `npm run db:seed` | User, Supplier, Order and Credit seeders; run only against intended development data |
| All host applications | `npm run dev` | Six backends and two frontends |
| Only backends / frontends | `npm run dev:services` / `npm run dev:apps` | Uses the same parallel workspace runner |
| Select processes | `npm run dev -- user supplier chat` | Other aliases: `order`, `credit`, `notif`, `student`, `admin` |
| One workspace | `npm run dev -w @campus-errand/chat-service` | Runs that package's dev script |
| Full container stack | `docker compose up --build` | Builds images and starts the configured stack |

Seeders are mutations, not health checks. In particular, sample errands require `SEED_SAMPLE_ORDERS=true`, and running seeders can update seeded accounts or wallets. Keep secrets out of command logs and documentation. `.env.example` is the committed configuration reference; key generation is an explicit setup step, not a documentation verification check.

## Migrations and connection settings

Each service owns its schema and migrations under `services/<service>/prisma/`. PostgreSQL init scripts create databases and roles, not service tables. `db:deploy` applies committed migrations; `db:migrate` authors a new migration and can require a shadow-database-capable identity.

User, Supplier, Order, Credit and Notification invoke the [shared migration helper](../../scripts/prisma-migrate.mjs). Chat has the equivalent command in its [package scripts](../../services/chat-service/package.json). These select an existing `DATABASE_URL` first, then the service-specific URL (`USER_DATABASE_URL`, `CHAT_DATABASE_URL`, and so on), then a development fallback. An exported `DATABASE_URL` therefore overrides the per-service values when running the root migration command: verify the target before applying migrations.

## Host and container routes

The [Student Vite configuration](../../apps/student-app/vite.config.ts) uses `GATEWAY_URL` when supplied; otherwise each API/socket route selects its service URL or localhost fallback. It forwards `/admin` to the separate Admin Vite process. Admin uses `/admin/` as its base path and has its own [proxy configuration](../../apps/admin-portal/vite.config.ts).

Compose frontends serve built assets through NGINX, not Vite. Their proxy behavior is controlled by [gateway configuration](../infrastructure/api-gateway.md), including `/ws/` for Notification and `/ws/chat/` for Chat. Changing a Vite variable does not reconfigure a deployed static frontend or the ECS gateway.

## Troubleshooting

| Symptom | Check first |
|---|---|
| Imports or generated Prisma types are missing | Run `npm ci` or regenerate clients; do not substitute a shared root Prisma client |
| A column is missing | Inspect the affected service's migration state and database target; do not delete volumes as routine repair |
| Wallet is missing immediately after signup | Trace User outbox → CDC → Credit welcome grant; account creation and wallet initialization are asynchronous |
| An order stays `PENDING` | Trace reservation request/result and Order consumer readiness before retrying the POST |
| Gateway works but socket connections fail | Check the selected host/container mode and both websocket paths |
| Broker returns `ACCESS_REFUSED` during UAT | Check the driver-specific AMQP identity, port and vhost; changing `GW` does not change `AMQP_URL` |
| API E2E cannot bind User/Supplier ports | The driver starts those services itself; stop conflicting listeners or use its `TEST_USER_PORT` / `TEST_SUPPLIER_PORT` settings |

See [testing and UAT configuration](testing-strategy.md) before running scripts that create or cancel records. For cloud operations use the [ECS rollout runbook](../../infra/terraform/ecs/README.md).

## Sources

[Root scripts](../../package.json), [dev runner](../../scripts/dev.mjs), [Compose](../../docker-compose.yml), [configuration template](../../.env.example), [User Dockerfile](../../services/user-service/Dockerfile), [Student Dockerfile](../../apps/student-app/Dockerfile).

[Documentation index](../README.md) · [Drift register](../audits/documentation-drift.md) · [Verification record](../audits/review-findings.md)
