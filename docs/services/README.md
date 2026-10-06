<!--
AI Assistance Disclosure:
Tool: Claude Code (model: Claude Fable 5.1), date: 2026-10-06
Scope: notification-service row: database and state. Added the "Databases: where they run and how to open them" section.
Author review: <to be completed by Reallyeasy1>

Tool: Google Antigravity Agent, date: 2026-10-03
Scope: Updated service states for User Service (RabbitMQ transactional outbox) and Credit Service (JWT auth, RabbitMQ consumer).
Author review: <to be completed by huangjiaxi1111>

Tool: Codex (model: GPT-6), date: 2026-09-24
Scope: Updated Credit Service persistence status.
Author review: <to be completed by huangjiaxi1111>

Tool: Claude Code (model: Claude Fable 5.1), date: 2026-09-21
Scope: Created this index and the per-service pages by reading the code on milestone-d2 and the team's requirement documents.
Author review: <to be completed by Reallyeasy1>
-->

# Service documentation

One page per service. Each page describes **what the code does today** (verified against the source on `milestone-d2`, 2026-09-21) and, separately, **what the requirement documents say it should do**. The pages describe; they do not recommend. Reasons for design choices go in [`../decisions/`](../decisions/README.md), written by the team.

| Service | Port | Database | State | Issue assignees (GitHub, 2026-09-21) |
|---|---|---|---|---|
| [user-service](./user-service.md) | 8001 | `user_db` | Real (Prisma, RabbitMQ transactional outbox) | jagdeepsh |
| [supplier-service](./supplier-service.md) | 8002 | `supplier_db` | Real (Prisma) | yanhwee |
| [order-service](./order-service.md) | 8003 | `order_db` (unused) | In-memory mock | Reallyeasy1 (with huangjiaxi1111 intended on F3.2–F3.3; yanhwee + ngkhengyang on F3.1) |
| [credit-service](./credit-service.md) | 8004 | `credit_db` | Real (Prisma, JWT auth, RabbitMQ consumer) | ngkhengyang |
| [notification-service](./notification-service.md) | 8005 | `notification_db` | Real (Prisma, authenticated WebSocket, RabbitMQ consumer) | Reallyeasy1 (F5, F8) |

System-level picture: [`../architecture/overview.md`](../architecture/overview.md). Shared types for every request, response and event: `packages/common-dtos/src/index.ts`.

## Conventions shared by all services

- Express + TypeScript run with `tsx`; `npm run dev:<name>` from the repo root (`dev:user`, `dev:supplier`, `dev:order`, `dev:credit`, `dev:notif`).
- `GET /health` → `{ service, status: "UP", port, timestamp }` on every service.
- Response envelope `ApiResponse<T>`: `{ success, data?, error?, message? }`.
- Behind the gateway (`http://localhost`) the same paths apply; direct ports work too.

## Databases: where they run and how to open them

All five databases live in one PostgreSQL 16 server that runs as the `postgres` service of `docker-compose.yml` (container `campuserrand-postgres`, image `postgres:16-alpine`). Its data is the named Docker volume `postgres_data`, so it survives `docker compose down` and is wiped only by `docker compose down -v`. `docker/postgres-init/01-init-databases.sql` creates the empty databases on a fresh volume; each service creates its own tables with Prisma migrations when its container starts. User and password are `postgres` / `postgres` (development only).

| Database | Owner | Tables |
|---|---|---|
| `user_db` | user-service | `users`, `sessions`, `outbox_events` |
| `supplier_db` | supplier-service | `suppliers` |
| `order_db` | order-service | none yet (the service is still in memory) |
| `credit_db` | credit-service | `credit_wallets`, `credit_transactions`, `credit_escrows`, `credit_grants`, `processed_credit_events` |
| `notification_db` | notification-service | `notifications` |

Open a `psql` session either inside the container (nothing to install) or from the host:

```bash
docker exec -it campuserrand-postgres psql -U postgres -d notification_db   # inside the container
psql -h localhost -p 5432 -U postgres -d notification_db                    # from the host; password: postgres
```

Useful once connected: `\l` lists the databases, `\c user_db` switches, `\dt` lists tables, `\d notifications` shows a table, `\q` quits. Prisma keeps its migration history in `_prisma_migrations` in every database; leave that table alone.

Example queries (each database is separate, so there are no joins across services; user ids in `supplier_db`, `credit_db` and `notification_db` are plain UUIDs that refer to `user_db.users.id`):

```sql
-- user_db
select id, username, email, role, status, created_at from users order by created_at desc;
select u.username, s.persistent, s.last_used_at, s.idle_expires_at
  from sessions s join users u on u.id = s.user_id order by s.last_used_at desc;      -- live refresh sessions
select id, event_type, status, retry_count, created_at from outbox_events order by created_at desc limit 20;

-- supplier_db
select supplier_code, name, campus_zone, category, is_active from suppliers order by name;
select campus_zone, count(*) from suppliers where is_active group by 1 order by 2 desc;

-- credit_db
select user_id, available_credits, escrow_credits, total_earned_credits from credit_wallets;
select transaction_code, transaction_type, amount, from_user_id, to_user_id, order_id, created_at
  from credit_transactions order by created_at desc limit 20;

-- notification_db
select user_id, kind, title, read_at is null as unread, created_at
  from notifications order by created_at desc limit 20;
select user_id, count(*) filter (where read_at is null) as unread, count(*) as total
  from notifications group by user_id;
select * from notifications where order_code = 'ORD-0042';            -- everything about one errand
```

To look up a user id from another database, take it from `user_db` first: `select id from users where email = 'alice@u.nus.edu';`. The passwords are scrypt hashes and the refresh tokens are SHA-256 hashes; neither can be read back.

If another PostgreSQL already listens on port 5432 on your machine (a native install, for example), the container cannot bind the port and `psql -p 5432` would reach the wrong server. Keep a Compose override outside the repo that moves the published port, and pass it on every `docker compose` call:

```yaml
# ~/campus-ports.yml (not committed)
services:
  postgres:
    ports: !override
      - "5440:5432"
```

```bash
docker compose -f docker-compose.yml -f ~/campus-ports.yml up -d
psql -h localhost -p 5440 -U postgres -d notification_db
```

The services inside Compose are unaffected: they reach the server as `postgres:5432` on the Docker network. Host-run commands that have the port in them (`npm run test:d2`, a service started with `npm run dev:<name>`, the test environment variables) need the moved port instead.

## Keeping a page current

Update the page in the same change that alters the service's routes, environment variables, data model or mock/real status. Each page has the same sections: Status · Responsibilities (from the documents) · Run · Configuration · Files · API · Data · Behaviour as built · Differences from the documents · Tests · Issues.
