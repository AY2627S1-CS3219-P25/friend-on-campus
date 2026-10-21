<!--
AI Assistance Disclosure:
Tool: Claude Code (model: Claude Opus 5.5 subagent, Claude Fable 5.1 session), date: 2026-10-18
Scope: Verified the Quick Reference and seeded accounts against main @ 7f2d972; added the gateway URL, the `npm test` line and the wiki link.
Author review: <to be completed by Reallyeasy1>

Tool: Google Antigravity Agent, date: 2026-10-11
Scope: Rewrote documentation index to point directly to the simplified, flattened specification documents (architecture.md, errand-specification.md, security.md).
Author review: <to be completed by author after review>
-->

# Friend of Campus (FoC) Documentation

Welcome to the central system documentation for **Friend of Campus** (NUS CS3219 Software Design and Architecture).

This documentation is organized into focused, authoritative specifications that describe system boundaries, domain rules, state machines, and security patterns.

---

## 📚 Core System Specifications

| Document | Purpose & Scope |
|---|---|
| **[`architecture.md`](./architecture.md)** | **System Architecture & Infrastructure**: High-level component topology diagram, microservice responsibilities, database-per-service isolation, synchronous HTTP vs asynchronous RabbitMQ event choreography, and Docker Compose orchestration. |
| **[`errand-specification.md`](./errand-specification.md)** | **Errand Domain & Credit Economy**: Complete errand lifecycle state machine (`DRAFT` &rarr; `PENDING` &rarr; `OPEN` / `REJECTED` &rarr; `ACCEPTED` &rarr; `IN_TRANSIT` &rarr; `DELIVERED` &rarr; `COMPLETED`), credit escrow reservation saga/settlement/refunds, atomic single-winner claiming under concurrency, background expiry sweeper, and RabbitMQ domain event matrix. |
| **[`security.md`](./security.md)** | **Security & Access Control**: Asymmetric Ed25519 token issuance and offline verification, HttpOnly refresh token session management, Role-Based Access Control (`STUDENT` vs `ADMIN`), resource ownership rules, and atomic last-administrator safety guard. |
| **[`ci.md`](./ci.md)** | **Continuous Integration & Testing**: GitHub Actions workflow structure, public test commands, isolated aggregate orchestration, static test matrix maintenance, and containerized acceptance/E2E test pipelines. |

---

## 📦 Microservices Summary

| Service | Port | Database | Primary Purpose |
|---|---|---|---|
| **User Service** | `8001` | `user_db` | Authentication (Ed25519 signing), sessions, user profiles, RBAC, and registration outbox publishing. |
| **Supplier Service** | `8002` | `supplier_db` | Campus merchant and spot directory CRUD, category filtering, and campus zone queries. |
| **Order Service** | `8003` | `order_db` | Errand lifecycle state transitions, asynchronous credit escrow reservation saga, atomic single-winner claiming, and CDC outbox event publishing. |
| **Credit Service** | `8004` | `credit_db` | Closed credit economy, wallet accounts, transaction ledgers, escrow holds/settlement/refunds, and idempotent event consumer/publisher. |
| **Notification Service** | `8005` | `notification_db` | In-app notification persistence, authenticated WebSocket real-time push (`/ws`), and errand event consumer. |

*API request/response types and domain event payload interfaces are authoritatively defined in code at `packages/common-dtos/src/index.ts`. Access-token verification is shared through `packages/auth` (see its `README.md`), and RabbitMQ quorum-queue/DLQ messaging is shared through `packages/messaging`.*

Milestone pages (demo scripts, evidence) live on the project wiki: [Milestone D3](https://github.com/AY2627S1-CS3219-P25/friend-on-campus/wiki/Milestone-D3).

---

## 🚀 Local Development Quick Reference

```bash
# 1. Generate local JWT signing keys (if not already in .env)
npm run generate:jwt-keys -- --print > .env

# 2. Start PostgreSQL, RabbitMQ, all microservices, and frontends
docker compose up --build

# 3. Access applications
# Gateway:      http://localhost (student app at /, admin portal at /admin/, APIs at /api/*, WebSocket at /ws/)
# Student App:  http://localhost:5173
# Admin Portal: http://localhost:5174 (or http://localhost/admin/ via gateway)
# RabbitMQ UI:  http://localhost:15672 (campus_admin / campus-admin-dev)

# 4. Run every test category in an isolated Compose project (see ci.md)
npm test
```

### Pre-Seeded Accounts
- **Admin**: `admin@nus.edu.sg` / `Password123!` (Role: `ADMIN`)
- **Student**: `alice@u.nus.edu` / `Password123!` (Role: `STUDENT`, Balance: 100 credits)
- **Student**: `bob@u.nus.edu` / `Password123!` (Role: `STUDENT`, Balance: 100 credits)

---

## ⚖️ AI Usage Policy (CS3219 Appendix 2)

| Task | Allowed for AI Assistants |
|---|---|
| Writing code implementations, unit tests, refactoring, and boilerplate | ✅ Yes (requires citation header and review) |
| System documentation refactoring, organizing, and formatting | ✅ Yes |
| Proposing system architecture or drafting architectural decision rationales | ❌ **NO** (Must be authored by team members) |
| Author review confirmation checkboxes | ❌ **NO** (Must be verified by human author) |
