<!--
AI Assistance Disclosure:
Tool: Codex (model: GPT-6), date: 2026-11-09
Scope: Reconcile the active documentation with main b989758 and simplify navigation; preserve historical attribution.
Author review: <to be completed by Reallyeasy1>

Tool: Codex (model: GPT-6), date: 2026-10-25
Scope: Source-linked implementation documentation and evidence review requested by Reallyeasy1.
Author review: <to be completed by Reallyeasy1>
-->

# Data ownership and persistence

Implementation inspected at [`b989758`](https://github.com/AY2627S1-CS3219-P25/friend-on-campus/commit/b989758e766cb593c3b8c94102eb6dfb5c7d8491) on 9 November 2026 (SGT). This is a code/configuration reference, not verification of the live deployment.

Each backend owns a logical database, Prisma schema, migrations and generated client. [Provisioning SQL](../../docker/postgres-init/01-init-databases.sql) creates databases and roles; service migrations create tables and constraints. Local Compose uses one PostgreSQL instance for these logical databases; the cloud configuration uses RDS.

| Database | Persisted tables | Consistency boundary |
|---|---|---|
| `user_db` | `users`, `sessions`, `outbox_events` | Registration and its domain outbox commit together; sessions cascade only within User |
| `supplier_db` | `suppliers` | Directory identity/uniqueness and active state belong to Supplier |
| `order_db` | `orders`, `outbox_events` | Lifecycle predicates/version and any resulting domain event commit transactionally; disputes update state without an event |
| `credit_db` | `credit_wallets`, `credit_transactions`, `credit_grants`, `credit_escrows`, `processed_credit_events`, `credit_outbox_events` | Serializable wallet/ledger/escrow processing includes event deduplication and result/receipt outbox |
| `notification_db` | `notifications`, `processed_notification_events`, `order_notification_state`, `notification_realtime_outbox` | Event processing, recipient rows, projection and realtime signals are committed together |
| `chat_db` | `conversations`, `messages`, `realtime_outbox` | Conversation locking allocates message sequence and commits the message with its signal |

Schema sources: [User](../../services/user-service/prisma/schema.prisma), [Supplier](../../services/supplier-service/prisma/schema.prisma), [Order](../../services/order-service/prisma/schema.prisma), [Credit](../../services/credit-service/prisma/schema.prisma), [Notification](../../services/notification-service/prisma/schema.prisma), [Chat](../../services/chat-service/prisma/schema.prisma). Read the adjacent migrations too: SQL-only expression indexes and checks are not fully represented by Prisma declarations.

## What the boundaries mean

Cross-service references do not create cascading foreign keys. Account deletion does not remove another service's committed orders or credit history. Order holds supplier snapshots; Credit owns the later financial outcome. Notification deduplication is recipient-aware (`producer`, `eventId`, `userId`, `kind`), not one global inbox row per event. Chat sequences are unique within a conversation; `clientId` correlation is not persistent send idempotency.

Domain outboxes (User/Order/Credit) are published through CDC. Realtime outboxes (Chat/Notification) are polled by service-owned leased relays. Those relays are implemented; old statements that no polling publisher exists no longer describe the whole system. See [messaging paths](communication-and-events.md).

## Migrations and seeds

- `npm run db:generate --workspaces --if-present` generates the six service clients without applying schema changes. Application imports use each service's `src/database/client.ts`.
- `npm run db:deploy` applies existing migrations. Use a selected local/test target and the [development guide](../development/local-development.md) for environment setup.
- `npm run db:seed` runs User, Supplier, Order and Credit seeds. Chat and Notification have no seed command. Seeds can mutate existing data and are not a production repair mechanism.
- [Supplier coordinate upgrades](../services/supplier-service/coordinate-upgrades.md) document the specific older-database recovery path.
- Persistent volumes, RDS backups and filesystem persistence are separate concerns. See the [deployment reference](../infrastructure/docker-and-deployment.md); deleting volumes is not routine migration repair.

[Documentation index](../README.md) · [Credit contracts](../services/credit-service/contracts-and-data.md) · [Verification](../audits/review-findings.md)
