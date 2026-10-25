<!--
AI Assistance Disclosure:
Tool: Codex (model: GPT-6), date: 2026-10-25
Scope: Source-linked implementation documentation and evidence review requested by Reallyeasy1.
Author review: <to be completed by Reallyeasy1>
-->

# Containers and local deployment

Implementation baseline: [`52d791e`](https://github.com/AY2627S1-CS3219-P25/friend-on-campus/commit/52d791e4eea28ce7d817f025ef096f8d96bda467); inspected 2026-10-25 (SGT). Pending work is explicitly labelled.

This document describes current Compose/Docker implementation. The AWS Wiki page is a proposal; no cloud deployment is asserted here.

## Startup and persistence

PostgreSQL starts with logical replication enabled. Provisioning SQL creates five databases and roles. Backend images run `prisma migrate deploy` before the service; User/Supplier/Order/Credit also seed development data, while Notification does not. Order/Credit seed failures are logged without necessarily stopping startup. Each backend uses `init: true`; application runtime stages use the base image's non-root user.

User and Supplier depend on PostgreSQL. Order/Credit/Notification additionally depend on RabbitMQ. Credit seed startup waits for User. Each Debezium connector waits for the corresponding service so its outbox table exists. Gateway waits for all five services and both frontends, but not CDC readiness. A healthy gateway does not prove an event has traversed the connectors.

| Component | Compose check | Meaning |
|---|---|---|
| User/Supplier/Notification | /ready | Service-defined dependency check |
| Order/Credit | /health | Process liveness; /ready exists separately |
| Apps | Local HTTP request to static NGINX | Assets can be served |
| PostgreSQL | pg_isready | Server accepts connections |
| RabbitMQ | check_port_connectivity as rabbitmq user | Broker probe, not end-to-end message processing |
| Debezium | No Compose healthcheck | Inspect connector logs and actual event progress |

The RabbitMQ health command uses `su-exec rabbitmq`; changing its effective user can affect cookie ownership during cold boot. Retain this and backend `init: true` per repository instructions. Order/Credit/Notification and CDC containers have restart policies; check actual lifecycle callbacks before claiming graceful shutdown.

## Build and environment

Backend containers run compiled Node JavaScript. Frontend containers serve Vite-built static files through NGINX. Root requires Node >=22.3 and CI uses Node 22; all backend Docker stages and frontend build images use Node 20.20.2 at this baseline. This is recorded drift, not normalized by this documentation change.

Use `.env.example` as the safe variable reference. Runtime examples in this documentation omit passwords and keys. Existing public development defaults must not be reused as a production security claim. Compose currently publishes host service, database and broker ports in addition to the gateway.

## Operations and limitations

Use [local development](../development/local-development.md) for commands and [CDC/broker](cdc-and-broker.md) for replication state. Persistent volumes survive ordinary restart. Deleting volumes destroys local data and offsets; do not use it as a routine troubleshooting step. Isolated tests create separate projects/databases and remove only their own resources.

No production restart, database migration, volume reset or deployment was performed for this documentation change. Actual validation is recorded separately.

## Source evidence and related reading

- [`docker-compose.yml`](../../docker-compose.yml)
- [`docker-compose.test.yml`](../../docker-compose.test.yml)
- [`docker/postgres-init/01-init-databases.sql`](../../docker/postgres-init/01-init-databases.sql)
- [`services/notification-service/Dockerfile`](../../services/notification-service/Dockerfile)
- [`services/order-service/Dockerfile`](../../services/order-service/Dockerfile)
- [`apps/student-app/Dockerfile`](../../apps/student-app/Dockerfile)
- [`apps/admin-portal/Dockerfile`](../../apps/admin-portal/Dockerfile)
- [Wiki: Deployment and Configuration](https://github.com/AY2627S1-CS3219-P25/friend-on-campus/wiki/Deployment-and-Configuration)
- [Documentation index](../README.md) · [Drift register](../audits/documentation-drift.md) · [Verification record](../audits/review-findings.md)
