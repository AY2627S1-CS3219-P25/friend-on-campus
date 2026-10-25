<!--
AI Assistance Disclosure:
Tool: Codex (model: GPT-6), date: 2026-10-25
Scope: Source-linked implementation documentation and evidence review requested by Reallyeasy1.
Author review: <to be completed by Reallyeasy1>
-->

# Data ownership and persistence

Implementation baseline: [`52d791e`](https://github.com/AY2627S1-CS3219-P25/friend-on-campus/commit/52d791e4eea28ce7d817f025ef096f8d96bda467); inspected 2026-10-25 (SGT). Pending work is explicitly labelled.

Each service owns its logical PostgreSQL database and generated Prisma client. `docker/postgres-init/01-init-databases.sql` creates roles/databases and privileges; service migrations create tables and constraints. Do not interpret provisioning SQL as the schema migration source.

| Database | Tables | Important ownership/consistency boundary |
|---|---|---|
| user_db | users, sessions, outbox_events | User creation and registration outbox are atomic; sessions cascade on user deletion locally |
| supplier_db | suppliers | Active flag supports soft deletion; directory uniqueness includes SQL expression index |
| order_db | orders, outbox_events | State/version/owner predicates and outbox writes share transactions |
| credit_db | credit_wallets, credit_transactions, credit_grants, credit_escrows, processed_credit_events, credit_outbox_events | Serializable financial transaction includes event identity and reservation result |
| notification_db | notifications | Global unique event_id deduplicates one requester notification per event |

Clients are generated into `services/<service>/src/generated/prisma` and re-exported by `src/database/client.ts`; those generated clients are not a root shared schema. Read schema plus all migration SQL: User case-insensitive identity indexes, Supplier location uniqueness and Credit checks are not fully represented by Prisma declarations.

Cross-service user/order/supplier IDs do not create cross-database foreign keys. Existing balances, orders and notifications are not deleted by a User-service cascade. Current Notification `createdAt` is the source event timestamp, not insertion time. Order carries supplier name/zone snapshots. Credit ledger rows and escrow state have their own transaction boundary after Order commits.

## Migration and seed operations

Use committed migrations via root `npm run db:deploy` or a workspace's `db:deploy`. Authoring migrations is outside this PR. Least-privilege service users do not necessarily have permission to create a Prisma shadow database. Generated clients can be refreshed without applying migrations.

User seeding can update existing account credentials/roles; Supplier CSV seeding preserves existing identity/active state. Order sample seeding is controlled by `SEED_SAMPLE_ORDERS`; Credit seeds grant/wallet data separately, including deterministic offline account IDs. These are development operations, not a production data repair guarantee. Notification has no seed script.

Persistent Compose volumes are distinct from isolated test resources. Never use volume deletion as a routine migration repair. Review migration status, the selected database and the original SQL first.

## Source evidence and related reading

- [`docker/postgres-init/01-init-databases.sql`](../../docker/postgres-init/01-init-databases.sql)
- [`scripts/prisma-migrate.mjs`](../../scripts/prisma-migrate.mjs)
- [`services/user-service/prisma/schema.prisma`](../../services/user-service/prisma/schema.prisma)
- [`services/supplier-service/prisma/schema.prisma`](../../services/supplier-service/prisma/schema.prisma)
- [`services/order-service/prisma/schema.prisma`](../../services/order-service/prisma/schema.prisma)
- [`services/credit-service/prisma/schema.prisma`](../../services/credit-service/prisma/schema.prisma)
- [`services/notification-service/prisma/schema.prisma`](../../services/notification-service/prisma/schema.prisma)
- [Wiki: Data Model](https://github.com/AY2627S1-CS3219-P25/friend-on-campus/wiki/Data-Model)
- [Documentation index](../README.md) · [Drift register](../audits/documentation-drift.md) · [Verification record](../audits/review-findings.md)
