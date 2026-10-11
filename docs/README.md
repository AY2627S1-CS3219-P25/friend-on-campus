<!--
AI Assistance Disclosure:
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
| **[`errand-specification.md`](./errand-specification.md)** | **Errand Domain & Credit Economy**: Complete errand lifecycle state machine (`DRAFT` &rarr; `OPEN` &rarr; `ACCEPTED` &rarr; `IN_TRANSIT` &rarr; `DELIVERED` &rarr; `COMPLETED`), credit escrow holds/settlement/refunds, atomic single-winner claiming under concurrency, background expiry sweeper, and RabbitMQ domain event matrix. |
| **[`security.md`](./security.md)** | **Security & Access Control**: Asymmetric Ed25519 token issuance and offline verification, HttpOnly refresh token session management, Role-Based Access Control (`STUDENT` vs `ADMIN`), resource ownership rules, and atomic last-administrator safety guard. |

---

## 📦 Microservices Summary

| Service | Port | Database | Primary Purpose |
|---|---|---|---|
| **User Service** | `8001` | `user_db` | Authentication (Ed25519 signing), sessions, user profiles, RBAC, and registration outbox publishing. |
| **Supplier Service** | `8002` | `supplier_db` | Campus merchant and spot directory CRUD, category filtering, and campus zone queries. |
| **Order Service** | `8003` | `order_db` | Errand lifecycle state transitions, synchronous credit escrow reservation, atomic single-winner claiming, and outbox event publishing. |
| **Credit Service** | `8004` | `credit_db` | Closed credit economy, wallet accounts, transaction ledgers, escrow holds/settlement/refunds, and idempotent event consumer. |
| **Notification Service** | `8005` | `notification_db` | In-app notification persistence, authenticated WebSocket real-time push (`/ws`), and errand event consumer. |

*API request/response types and domain event payload interfaces are authoritatively defined in code at `packages/common-dtos/src/index.ts`.*

---

## 🚀 Local Development Quick Reference

```bash
# 1. Generate local JWT signing keys (if not already in .env)
npm run generate:jwt-keys -- --print > .env

# 2. Start PostgreSQL, RabbitMQ, all microservices, and frontends
docker compose up --build

# 3. Access applications
# Student App:  http://localhost:5173
# Admin Portal: http://localhost:5174 (or http://localhost/admin/ via gateway)
# RabbitMQ UI:  http://localhost:15672 (campus_admin / campus-admin-dev)
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
