<!--
AI Assistance Disclosure:
Tool: Codex (model: GPT-6), date: 2026-11-09
Scope: Refresh container startup, local/cloud probe differences and current realtime shutdown; preserve the actual runtime-version and gateway-user distinctions.
Author review: <to be completed by Reallyeasy1>

Tool: Codex (model: GPT-6), date: 2026-11-08
Scope: Document application-only image startup, preserved Compose bootstrap, and graceful socket-service shutdown.
Author review: <to be completed by the author>

Tool: Codex (model: GPT-6), date: 2026-10-25
Scope: Source-linked implementation documentation and evidence review requested by Reallyeasy1.
Author review: <to be completed by Reallyeasy1>
-->

# Containers and local deployment

Implementation checked against [`b989758`](https://github.com/AY2627S1-CS3219-P25/friend-on-campus/commit/b989758e766cb593c3b8c94102eb6dfb5c7d8491) on 9 November 2026 (SGT). This is a source review, not a verification of the running AWS deployment.

Use [local development](../development/local-development.md) for setup commands and the [ECS Terraform runbook](../../infra/terraform/ecs/README.md) for AWS. This page explains what container startup and health checks establish.

## Startup and persistence

[Docker Compose](../../docker-compose.yml) starts six backend services, two static frontend containers, the NGINX gateway, PostgreSQL, RabbitMQ and three Debezium connectors. [PostgreSQL provisioning SQL](../../docker/postgres-init/01-init-databases.sql) creates six logical databases and per-service roles; service-owned Prisma migrations create their schemas.

| Runtime path | Migrations and seeds |
|---|---|
| Backend image default | Starts `node dist/index.js`; no automatic migration or seed |
| Compose command override | Applies that service's migrations before startup; User/Supplier/Order/Credit also run development seeds |
| ECS initial rollout | Separate role/publication setup and migration jobs; seeds are explicit fresh-environment jobs |
| ECS application release | Selected backend migration jobs run before application updates; no automatic seeding |

Order and Credit Compose commands log seed failure and can continue without sample data. User and Supplier seed failures stop their startup chain. Existing-volume data is not recreated merely because an image is rebuilt. Never reuse a fresh-environment seed or volume-reset procedure as a routine deployment repair.

All six backend services use `init: true` in Compose. Backend images run as `node`, and frontend runtime images run as `nginx`. The gateway image uses the base NGINX image's entry point; it has no explicit non-root `USER` override. Preserve these distinctions when reviewing container security.

## Dependencies and health

User and Supplier require PostgreSQL. Order, Credit, Chat and Notification also require RabbitMQ; Credit's initial seed waits for User. Each Debezium connector starts after the matching service so its outbox table exists. Gateway startup waits for the services and frontends, but not for CDC progress.

| Component | Compose check | What it establishes |
|---|---|---|
| User, Supplier, Chat, Notification | `/ready` | The service's configured readiness conditions |
| Order, Credit | `/health` | Process liveness; readiness is available separately |
| Frontends | HTTP fetch from local static NGINX | The static site responds |
| PostgreSQL | `pg_isready` | Server connection readiness |
| RabbitMQ | `check_port_connectivity` as `rabbitmq` user | Broker port connectivity |
| Debezium | No Compose health check | Inspect logs and actual event progress |
| Gateway | No Compose health check; exposes `/health` | The endpoint only reports NGINX liveness |

ECS uses backend `/ready` checks and ALB gateway `/health`; see [applications.tf](../../infra/terraform/ecs/applications.tf). These differences matter when comparing Compose and cloud test evidence.

Chat and Notification readiness includes both their business consumer and realtime subscriber. They stop accepting normal traffic during shutdown, close sockets, drain work and disconnect Prisma. Their shutdown deadline is ten seconds; Compose allows a 30-second stop grace period. A lost realtime subscription disconnects clients so they can reconnect and reload persisted data.

## Build and environment

Backend images execute compiled Node JavaScript. Frontends serve Vite-built assets through NGINX. The root package requires Node >=22.3 and CI uses Node 22, while backend Docker stages and frontend build stages are pinned to Node 20.20.2. This version difference is existing configuration, not evidence of runtime equivalence.

Use [.env.example](../../.env.example) as the safe variable reference. Do not inspect, print or publish private `.env` files. Compose exposes local service/database/broker ports as well as the gateway and includes development defaults; it is not the cloud network security policy. Current AWS tasks receive secrets via Secrets Manager and use service-specific connection settings.

## Troubleshooting without losing state

- Start at [gateway routing](api-gateway.md) for HTTP/502 failures and [CDC/broker operations](cdc-and-broker.md) for delayed credits or order publication.
- Inspect the service's logs and readiness, then the relevant database, consumer and connector. A green `/health` does not prove the Saga completed.
- Named volumes preserve PostgreSQL data, RabbitMQ state and connector offsets across ordinary restarts. Deleting volumes removes that state.
- Use the isolated test runner for disposable test infrastructure; do not point its cleanup at development or cloud resources.

No containers, migrations, destructive commands or AWS operations were executed for this documentation cleanup. See [verification](../audits/review-findings.md) for the actual checks.

## Source evidence

- [Compose](../../docker-compose.yml) and [test overrides](../../docker-compose.test.yml)
- [Backend Dockerfile example](../../services/order-service/Dockerfile)
- [Student Dockerfile](../../apps/student-app/Dockerfile), [admin Dockerfile](../../apps/admin-portal/Dockerfile), [gateway Dockerfile](../../gateway/Dockerfile)
- [Chat startup/shutdown](../../services/chat-service/src/index.ts), [Notification startup/shutdown](../../services/notification-service/src/index.ts)
- [ECS database and CDC jobs](../../infra/terraform/ecs/data-tasks.tf)

[Documentation index](../README.md) · [Known discrepancies](../audits/documentation-drift.md)
