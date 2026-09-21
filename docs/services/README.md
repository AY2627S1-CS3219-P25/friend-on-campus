<!--
AI Assistance Disclosure:
Tool: Claude Code (model: Claude Fable 5.1), date: 2026-09-21
Scope: Created this index and the per-service pages by reading the code on milestone-d2 and the team's requirement documents.
Author review: <to be completed by Reallyeasy1>
-->

# Service documentation

One page per service. Each page describes **what the code does today** (verified against the source on `milestone-d2`, 2026-09-21) and, separately, **what the requirement documents say it should do**. The pages describe; they do not recommend. Reasons for design choices go in [`../decisions/`](../decisions/README.md), written by the team.

| Service | Port | Database | State | Issue assignees (GitHub, 2026-09-21) |
|---|---|---|---|---|
| [user-service](./user-service.md) | 8001 | `user_db` | Real (Prisma) | jagdeepsh |
| [supplier-service](./supplier-service.md) | 8002 | `supplier_db` | Real (Prisma) | yanhwee |
| [order-service](./order-service.md) | 8003 | `order_db` (unused) | In-memory mock | Reallyeasy1 (with huangjiaxi1111 intended on F3.2–F3.3; yanhwee + ngkhengyang on F3.1) |
| [credit-service](./credit-service.md) | 8004 | `credit_db` (unused) | In-memory mock | ngkhengyang |
| [notification-service](./notification-service.md) | 8005 | none | In-memory mock | Reallyeasy1 (F5, F8) |

System-level picture: [`../architecture/overview.md`](../architecture/overview.md). Shared types for every request, response and event: `packages/common-dtos/src/index.ts`.

## Conventions shared by all services

- Express + TypeScript run with `tsx`; `npm run dev:<name>` from the repo root (`dev:user`, `dev:supplier`, `dev:order`, `dev:credit`, `dev:notif`).
- `GET /health` → `{ service, status: "UP", port, timestamp }` on every service.
- Response envelope `ApiResponse<T>`: `{ success, data?, error?, message? }`.
- Behind the gateway (`http://localhost`) the same paths apply; direct ports work too.

## Keeping a page current

Update the page in the same change that alters the service's routes, environment variables, data model or mock/real status. Each page has the same sections: Status · Responsibilities (from the documents) · Run · Configuration · Files · API · Data · Behaviour as built · Differences from the documents · Tests · Issues.
