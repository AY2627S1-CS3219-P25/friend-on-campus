<!--
AI Assistance Disclosure:
Tool: Google Antigravity Agent, date: 2026-10-07
Scope: Comprehensive architectural map and file interaction guide for Order Service, including component hierarchy, data flows, concurrency mechanisms, and sequence diagrams.
Author review: (to be completed by author after review)
-->

# Order Service Component Architecture & Interaction Map

This document details the architectural layout, file interactions, data flows, and concurrency mechanisms of the persistent **Order Service** microservice in NUS CampusErrand / Friend of Campus (FoC).

---

## 1. High-Level Component & File Interaction Diagram

The diagram below illustrates how incoming HTTP requests flow through the transport layer, orchestrator, and external clients, down into the PostgreSQL persistence layer and out through the Transactional Outbox to RabbitMQ.

```mermaid
flowchart TD
    Client(["HTTP Client (Frontend / Tests)"])

    subgraph Entry ["Bootstrap & Lifecycle"]
        Index["src/index.ts<br/>(Entrypoint & Shutdown)"]
        Config["src/config.ts<br/>(Env & Settings)"]
        App["src/app.ts<br/>(Express App, /health, /ready)"]
    end

    subgraph Transport ["Routing & Security Layer"]
        Routes["src/orders/order.routes.ts<br/>(REST Endpoints & Error Mapping)"]
        AuthM["@campus-errand/auth<br/>(Ed25519 JWT Auth Middleware)"]
    end

    subgraph Core ["Domain Core Layer"]
        Service["src/orders/order.service.ts<br/>(OrderService Orchestrator)"]
        Types["src/orders/order.types.ts<br/>(Domain Errors, DTO Mappers, Code Gen)"]
    end

    subgraph ExternalClients ["External Service HTTP Clients"]
        CreditClient["src/clients/credit.client.ts<br/>(POST /api/credits/escrow/reserve)"]
        SupplierClient["src/clients/supplier.client.ts<br/>(GET /api/suppliers/:id)"]
    end

    subgraph Persistence ["Persistence Layer (PostgreSQL)"]
        OrderRepo["src/repositories/order.repository.ts<br/>(Atomic Locking & Outbox Tx)"]
        PrismaClient["src/database/client.ts<br/>(Singleton Prisma Client)"]
        Schema["src/database/prisma/schema.prisma<br/>(Order & OutboxEvent Models)"]
    end

    subgraph Background ["Async Workers & Messaging"]
        Sweeper["src/orders/expiry.sweeper.ts<br/>(Background Stale Errand Sweeper)"]
        Relay["src/messaging/outbox.relay.ts<br/>(Transactional Outbox Relay Worker)"]
        Publisher["src/messaging/event.publisher.ts<br/>(AMQP Confirmed Publisher)"]
    end

    Broker(["RabbitMQ (campus.events)"])
    CreditSvc(["Credit Service (8004)"])
    SupplierSvc(["Supplier Service (8002)"])
    OrderDB[("PostgreSQL order_db")]

    %% Entrypoint initialization
    Index --> Config
    Index --> PrismaClient
    Index --> OrderRepo
    Index --> CreditClient
    Index --> SupplierClient
    Index --> Service
    Index --> Relay
    Index --> Sweeper
    Index --> App

    %% Request flows
    Client --> App
    App --> Routes
    Routes --> AuthM
    Routes --> Service
    Routes --> Types

    %% Domain interactions
    Service --> Types
    Service --> SupplierClient
    Service --> CreditClient
    Service --> OrderRepo
    Service -.->|Trigger immediate sweep| Relay

    %% External calls
    CreditClient --> CreditSvc
    SupplierClient --> SupplierSvc

    %% Database operations
    OrderRepo --> PrismaClient
    PrismaClient --> Schema
    PrismaClient --> OrderDB

    %% Background messaging & sweeper
    Sweeper --> OrderRepo
    Sweeper -.->|Notify| Relay
    Relay --> PrismaClient
    Relay --> Publisher
    Publisher --> Broker
```

---

## 2. File Responsibilities & Interactions

### 2.1 Bootstrap & Application Factory

| File | Primary Responsibilities | Direct Collaborators |
|---|---|---|
| [`src/config.ts`](../../services/order-service/src/config.ts) | Parses and validates environment variables (`PORT`, `DATABASE_URL`, `CREDIT_SERVICE_URL`, `SUPPLIER_SERVICE_URL`, `RABBITMQ_URL`, `JWT_PUBLIC_KEY`, polling intervals). | Used by `src/index.ts`. |
| [`src/app.ts`](../../services/order-service/src/app.ts) | Factory function creating the Express application. Configures CORS, JSON body parsing, error translation, `/health` and `/ready` probes, and mounts `/api/orders`. | Uses `src/orders/order.routes.ts`. |
| [`src/index.ts`](../../services/order-service/src/index.ts) | Process entrypoint. Connects to `order_db`, instantiates clients, repository, publisher, relay, sweeper, and Express app. Handles graceful shutdown on `SIGINT`/`SIGTERM`. | Instantiates all core components. |

### 2.2 Transport & Security

| File | Primary Responsibilities | Direct Collaborators |
|---|---|---|
| [`src/orders/order.routes.ts`](../../services/order-service/src/orders/order.routes.ts) | Maps HTTP REST endpoints (`POST /api/orders`, `/accept`, `/pickup`, `/deliver`, `/complete`, `/cancel`, `/user/activity`). Maps domain errors to HTTP status codes (`400`, `401`, `403`, `404`, `409`). | Uses `@campus-errand/auth`, `src/orders/order.service.ts`, `src/orders/order.types.ts`. |

### 2.3 Domain Orchestration & Integrations

| File | Primary Responsibilities | Direct Collaborators |
|---|---|---|
| [`src/orders/order.service.ts`](../../services/order-service/src/orders/order.service.ts) | Domain orchestrator. Validates business constraints, verifies suppliers, coordinates credit escrow reservation before creation, and dispatches mutations to the repository. | Calls `src/clients/credit.client.ts`, `src/clients/supplier.client.ts`, `src/repositories/order.repository.ts`, `src/messaging/outbox.relay.ts`. |
| [`src/orders/order.types.ts`](../../services/order-service/src/orders/order.types.ts) | Defines custom error hierarchy (`OrderNotFoundError`, `OrderStateConflictError`, `OrderAuthorizationError`, `SelfAcceptForbiddenError`, `OrderValidationError`), DTO mappers, and order code generator (`ORD-XXXXX`). | Imported by `order.service.ts`, `order.routes.ts`, `order.repository.ts`. |
| [`src/clients/credit.client.ts`](../../services/order-service/src/clients/credit.client.ts) | Synchronous HTTP client communicating with Credit Service (`POST /api/credits/escrow/reserve`). Translates insufficient funds errors to domain errors. | Used by `order.service.ts`. |
| [`src/clients/supplier.client.ts`](../../services/order-service/src/clients/supplier.client.ts) | HTTP client verifying that a requested supplier exists and is active, snapshotting its name and campus zone. | Used by `order.service.ts`. |

### 2.4 Persistence & Concurrency

| File | Primary Responsibilities | Direct Collaborators |
|---|---|---|
| [`src/repositories/order.repository.ts`](../../services/order-service/src/repositories/order.repository.ts) | Encapsulates SQL transactions. Executes atomic creation of `Order` + `OutboxEvent`. Performs single-winner optimistic concurrency updates on `version`. Guards self-claims, courier identity, and requester confirmation. | Uses `src/database/client.ts`. |
| [`src/database/client.ts`](../../services/order-service/src/database/client.ts) | Singleton Prisma client instance connected to PostgreSQL `order_db`. | Wraps `src/database/generated/client`. |
| [`src/database/prisma/schema.prisma`](../../services/order-service/src/database/prisma/schema.prisma) | Schema definition for `orders` and `outbox_events` tables with composite indices (`[status, expires_at]`, `[requester_id]`, etc.). | Generates Prisma client. |
| [`src/database/seed.ts`](../../services/order-service/src/database/seed.ts) | Seeds sample open errands for local development when `orders` table is empty. | Uses `client.ts`. |

### 2.5 Background Jobs & Messaging

| File | Primary Responsibilities | Direct Collaborators |
|---|---|---|
| [`src/messaging/event.publisher.ts`](../../services/order-service/src/messaging/event.publisher.ts) | Confirmed channel RabbitMQ publisher. Publishes lifecycle events to `campus.events` exchange with `persistent: true`, `mandatory: true`, and connection recovery. | Uses `amqplib`. |
| [`src/messaging/outbox.relay.ts`](../../services/order-service/src/messaging/outbox.relay.ts) | Transactional Outbox worker. Periodically polls pending outbox rows, publishes via `event.publisher.ts`, marks rows `DELIVERED`, and isolates poisoned payloads to `FAILED`. | Uses `client.ts`, `event.publisher.ts`. |
| [`src/orders/expiry.sweeper.ts`](../../services/order-service/src/orders/expiry.sweeper.ts) | Interval-based background worker scanning for open errands past `expiresAt`. Transitions them to `EXPIRED` and inserts `order.expired` outbox events. | Uses `order.repository.ts`, `outbox.relay.ts`. |

---

## 3. Key Execution Sequences

### 3.1 Flow A: Creating an Errand with Escrow & Transactional Outbox

```mermaid
sequenceDiagram
    autonumber
    actor Requester
    participant Routes as order.routes.ts
    participant Service as order.service.ts
    participant CreditSvc as credit.client.ts (Credit Svc)
    participant Repo as order.repository.ts
    participant DB as PostgreSQL (order_db)
    participant Relay as outbox.relay.ts
    participant Broker as RabbitMQ (campus.events)

    Requester->>Routes: POST /api/orders (JWT, Order Data)
    Routes->>Service: createOrder(requesterId, data)
    Service->>CreditSvc: reserveEscrow(orderId, requesterId, amount)
    Note over Service,CreditSvc: Synchronous Escrow Guard
    CreditSvc-->>Service: 200 OK (Escrow reserved)
    Service->>Repo: createOrderWithOutbox(data, event)
    rect rgb(240, 248, 255)
        Note over Repo,DB: BEGIN TRANSACTION
        Repo->>DB: INSERT INTO orders (status = 'OPEN', version = 1)
        Repo->>DB: INSERT INTO outbox_events (eventType = 'order.created', status = 'PENDING')
        Note over Repo,DB: COMMIT TRANSACTION
    end
    Repo-->>Service: OrderDTO
    Service-->>Routes: OrderDTO
    Routes-->>Requester: 201 Created (OrderDTO)
    
    par Async Outbox Relay
        Relay->>DB: SELECT * FROM outbox_events WHERE status = 'PENDING'
        Relay->>Broker: publish(order.created) [Confirmed]
        Broker-->>Relay: Ack
        Relay->>DB: UPDATE outbox_events SET status = 'DELIVERED'
    end
```

### 3.2 Flow B: Single-Winner Atomic Errand Claiming

```mermaid
sequenceDiagram
    autonumber
    actor CourierA as Courier A (Fast)
    actor CourierB as Courier B (Slow)
    participant Routes as order.routes.ts
    participant Repo as order.repository.ts
    participant DB as PostgreSQL (order_db)

    par Race Condition on Claim
        CourierA->>Routes: POST /api/orders/:id/accept
        CourierB->>Routes: POST /api/orders/:id/accept
    end

    Routes->>Repo: acceptOrder(id, courierA)
    Routes->>Repo: acceptOrder(id, courierB)

    rect rgb(240, 255, 240)
        Note over Repo,DB: Courier A hits DB first
        Repo->>DB: UPDATE orders SET status='ACCEPTED', courier_id=A, version=2 WHERE id=:id AND status='OPEN' AND version=1
        DB-->>Repo: 1 row updated (WINNER)
    end
    Repo-->>Routes: OrderDTO (status: ACCEPTED)
    Routes-->>CourierA: 200 OK (Errand Accepted)

    rect rgb(255, 240, 240)
        Note over Repo,DB: Courier B hits DB second
        Repo->>DB: UPDATE orders SET status='ACCEPTED', courier_id=B, version=2 WHERE id=:id AND status='OPEN' AND version=1
        DB-->>Repo: 0 rows updated (LOSER)
    end
    Repo-->>Routes: Throw OrderStateConflictError
    Routes-->>CourierB: 409 Conflict ("Order has already been claimed")
```

### 3.3 Flow C: Automatic Errand Expiration & Refund

```mermaid
sequenceDiagram
    autonumber
    participant Sweeper as expiry.sweeper.ts
    participant Repo as order.repository.ts
    participant DB as PostgreSQL (order_db)
    participant Relay as outbox.relay.ts
    participant Broker as RabbitMQ (campus.events)
    participant CreditService as Credit Service Consumer

    loop Every 30 seconds
        Sweeper->>Repo: expireDueOrders(now)
        rect rgb(255, 248, 240)
            Note over Repo,DB: Atomic Expiry Batch
            Repo->>DB: UPDATE orders SET status='EXPIRED', version=version+1 WHERE status='OPEN' AND expires_at <= now
            Repo->>DB: INSERT INTO outbox_events (eventType='order.expired', status='PENDING')
        end
        Repo-->>Sweeper: sweptCount = N
        Sweeper->>Relay: processPending()
        Relay->>Broker: publish(order.expired)
        Broker->>CreditService: consume(order.expired)
        CreditService->>CreditService: Release held escrow -> Refund requester balance
    end
```

---

## 4. Published Events Matrix (`campus.events`)

| Event Type | Trigger | Key Payload Fields | Primary Consumers |
|---|---|---|---|
| `order.created` | New errand opened | `orderId, orderCode, requesterId, rewardCredits, campusZone, expiresAt` | `notification-service` |
| `order.accepted` | Courier claims errand | `orderId, orderCode, requesterId, courierId, acceptedAt` | `notification-service` |
| `order.in_transit` | Courier picks up item | `orderId, orderCode, requesterId, courierId, pickedUpAt` | `notification-service` |
| `order.delivered` | Courier drops off item | `orderId, orderCode, requesterId, courierId, deliveredAt` | `notification-service` |
| `order.completed` | Requester confirms delivery | `orderId, orderCode, requesterId, courierId, rewardCredits` | `credit-service` (transfers reward credits to courier), `notification-service` |
| `order.cancelled` | Requester cancels errand | `orderId, orderCode, requesterId, rewardCredits` | `credit-service` (refunds escrowed credits to requester balance), `notification-service` |
| `order.expired` | Sweeper detects expired deadline | `orderId, orderCode, requesterId, rewardCredits` | `credit-service` (refunds escrowed credits to requester balance), `notification-service` |
