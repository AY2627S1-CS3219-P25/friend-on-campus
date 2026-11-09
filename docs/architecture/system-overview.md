<!--
AI Assistance Disclosure:
Tool: Codex (model: GPT-6), date: 2026-11-09
Scope: Reconcile the active documentation with main b989758 and simplify navigation; preserve historical attribution.
Author review: <to be completed by Reallyeasy1>

Tool: Claude Code (model: Claude Fable 5.1), date: 2026-10-25
Scope: Added the Chat Service (F8, PR #148) row to the runtime table while merging main into that PR.
Author review: <to be completed by Reallyeasy1>

Tool: Codex (model: GPT-6), date: 2026-10-25
Scope: Source-linked implementation documentation and evidence review requested by Reallyeasy1.
Author review: <to be completed by Reallyeasy1>
-->

# System overview

Implementation inspected at [`b989758`](https://github.com/AY2627S1-CS3219-P25/friend-on-campus/commit/b989758e766cb593c3b8c94102eb6dfb5c7d8491) on 9 November 2026 (SGT). This is a code/configuration reference, not verification of the live deployment.

Friend on Campus has **six backend services**, two React frontends and an NGINX gateway. Each backend owns a logical PostgreSQL database. Database-per-service does not mean one physical PostgreSQL host per service.

## Runtime map

| Component | Local port | Owned data | Reference |
|---|---:|---|---|
| User | 8001 | Accounts, sessions, registration outbox (`user_db`) | [User](../services/user-service/README.md) |
| Supplier | 8002 | Campus directory (`supplier_db`) | [Supplier](../services/supplier-service/README.md) |
| Order | 8003 | Errands, lifecycle and domain outbox (`order_db`) | [Order](../services/order-service/README.md) |
| Credit | 8004 | Wallets, ledger, escrow and domain outbox (`credit_db`) | [Credit](../services/credit-service/README.md) |
| Notification | 8005 | Inbox, read state, event projection and realtime outbox (`notification_db`) | [Notification](../services/notification-service/README.md) |
| Chat | 8006 | Conversations, messages and realtime outbox (`chat_db`) | [Chat](../services/chat-service/README.md) |
| Student / admin apps | 5173 / 5174 | Browser UI state | [Student](../frontend/student-app.md), [admin](../frontend/admin-portal.md) |
| NGINX gateway | 80 | No business data | [Routing](../infrastructure/api-gateway.md) |

Ports above describe local development. ECS uses its own service discovery and target-port configuration; they are not a list of public cloud ports.

## How work moves through the system

1. Browsers call HTTP APIs and authenticated WebSockets through the gateway. Services enforce identity, role and ownership checks.
2. Order validates the selected supplier over HTTP, then starts a reservation Saga by committing `PENDING` and an outbox event. Credit reserves funds asynchronously; Order applies the result. A `202` is not proof that an errand is `OPEN`.
3. Three Debezium connectors publish committed User, Order and Credit domain outboxes to RabbitMQ. Durable business consumers apply their own transactional effects.
4. Chat and Notification also run SQL-backed realtime relays. They publish small fanout signals so every replica can reread persisted changes and notify its own connected clients. Missed signals are recovered through persisted history, not replayed socket frames.

The [event guide](communication-and-events.md) explains those two separate messaging paths. [Data ownership](data-ownership.md) explains which transaction commits each effect.

## Local and cloud environments

[Docker Compose](../../docker-compose.yml) runs the local PostgreSQL, RabbitMQ, CDC, applications and gateway. [ECS Terraform](../../infra/terraform/ecs/README.md) is the current cloud rollout reference; the [cloud overview](../new-cloud-architecture-guide.md) explains its configured CloudFront, ALB, shared EC2 capacity, RDS and EFS boundaries. K3s material is [historical](../archive/README.md).

Repository configuration and passing local tests do not establish live AWS state, failover success or NFR compliance. See [verification](../audits/review-findings.md) and [known discrepancies](../audits/documentation-drift.md).

## Source navigation

- [`services/`](../../services), [`apps/`](../../apps), [`packages/`](../../packages)
- [`docker-compose.yml`](../../docker-compose.yml), [`gateway/nginx.conf`](../../gateway/nginx.conf)
- [Service boundaries](service-boundaries.md), [authentication](authentication-and-security.md)
- [Documentation index](../README.md)
