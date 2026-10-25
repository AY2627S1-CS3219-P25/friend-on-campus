<!--
AI Assistance Disclosure:
Tool: Codex (model: GPT-6), date: 2026-10-25
Scope: Source-linked implementation documentation and evidence review requested by Reallyeasy1.
Author review: <to be completed by Reallyeasy1>
-->

# Local development reference

Implementation baseline: [`52d791e`](https://github.com/AY2627S1-CS3219-P25/friend-on-campus/commit/52d791e4eea28ce7d817f025ef096f8d96bda467); inspected 2026-10-25 (SGT). Pending work is explicitly labelled.

README remains the quick-start entrypoint. This page explains command ownership and host/container differences for debugging. Run commands from the repository root unless a workspace flag is shown. Use the pinned lockfile and Node >=22.3.

| Task | Existing command | What it does |
|---|---|---|
| Install locked dependencies | npm ci | Installs lockfile versions; root postinstall generates all five Prisma clients |
| Generate clients explicitly | npm run db:generate --workspaces --if-present | Generates isolated clients; does not apply migrations |
| Start backing services | docker compose up -d postgres rabbitmq | Starts local dependencies |
| Apply committed schemas | npm run db:deploy | Runs workspace migration deployment via shared helper |
| Start CDC after migrations | docker compose up --no-deps -d debezium-user debezium-order debezium-credit | Enables User/Order/Credit outbox transport |
| Seed | npm run db:seed | User, Supplier, Order and Credit development data; may alter existing seeded accounts |
| All host processes | npm run dev | Parallel five services and two apps |
| Filter host processes | npm run dev -- user supplier | Existing dev-runner aliases |
| Apps/services only | npm run dev:apps / npm run dev:services | Parallel selected workspace group |
| Individual service | npm run dev -w @campus-errand/notification-service | tsx development entrypoint |
| Container stack | docker compose up --build | Builds and starts full local stack |

Configure environment using README and `.env.example`; do not paste private key material into documentation or logs. `generate:jwt-keys` prints keys, so it is an explicit local setup step rather than a verification command to run during an audit.

The shared Prisma runner selects service/root configuration and runs the service's schema. `db:deploy` applies existing migrations. `db:migrate` is for authoring changes and may require a shadow-database-capable identity; it is not interchangeable with deployment.

Host Vite requests default to direct backend targets or optional GATEWAY_URL. Container apps are static NGINX builds. The gateway serves Student `/`, Admin `/admin/`, supplier images and Notification `/ws/`. Check which mode is running before changing proxy variables.

## Troubleshooting

- A wallet 404 immediately after signup may reflect pending User CDC/credit initialization; inspect the event chain before treating it as lost data.
- An order that remains PENDING requires tracing reservation request and result, not another POST that could create a second errand.
- A live HTTP server may fail `/ready`; inspect DB and consumer state separately.
- Migration failures require checking migration status, target database and permissions. Volume deletion is destructive and not an automatic remedy.
- UAT may connect to a native broker rather than the Compose mapping; explicitly select AMQP_URL as documented in [testing strategy](testing-strategy.md).

This PR does not change local environment files, ports, seeds or infrastructure. Test infrastructure availability is reported in the verification record.

## Source evidence and related reading

- [`README.md`](../../README.md)
- [`package.json`](../../package.json)
- [`scripts/dev.mjs`](../../scripts/dev.mjs)
- [`scripts/prisma-migrate.mjs`](../../scripts/prisma-migrate.mjs)
- [`.env.example`](../../.env.example)
- [`docker-compose.yml`](../../docker-compose.yml)
- [Wiki: Getting Started](https://github.com/AY2627S1-CS3219-P25/friend-on-campus/wiki/Getting-Started)
- [Documentation index](../README.md) · [Drift register](../audits/documentation-drift.md) · [Verification record](../audits/review-findings.md)
