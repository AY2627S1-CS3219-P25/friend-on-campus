<!--
AI Assistance Disclosure:
Tool: Claude Code (model: Claude Fable 5.1), date: 2026-09-28
Scope: Drew this component diagram from docker-compose.yml, gateway/nginx.conf and the service entry points on `main` @ f0ee632.
It shows what is built, not a proposal. No rationale.
Author review: <to be completed by Reallyeasy1>
-->

# Component diagram — as built (`main` @ f0ee632)

Solid arrows are calls that happen today. Dashed boxes are in-memory mocks from the starter template.
Intended shape and sources: [`../architecture/overview.md`](../architecture/overview.md).

```mermaid
flowchart LR
  subgraph Clients
    SA["student-app<br/>React + Vite :5173"]
    AP["admin-portal<br/>React + Vite :5174"]
  end

  GW["api-gateway<br/>nginx :80"]

  subgraph Real["Real services"]
    US["user-service :8001<br/>signs tokens (Ed25519 private key)"]
    SS["supplier-service :8002<br/>verifies tokens (public key)"]
  end

  subgraph Mock["In-memory mocks"]
    OS["order-service :8003"]:::mock
    CS["credit-service :8004"]:::mock
    NS["notification-service :8005<br/>WebSocket"]:::mock
  end

  AUTH[["@campus-errand/auth<br/>authMiddleware, requireAdmin"]]
  DTO[["@campus-errand/common-dtos"]]

  subgraph PG["PostgreSQL 16 (one server)"]
    UDB[("user_db<br/>users, sessions")]
    SDB[("supplier_db<br/>suppliers")]
    ODB[("order_db<br/>empty")]
    CDB[("credit_db<br/>empty")]
  end

  MQ{{"RabbitMQ 3.13<br/>running, no publisher or consumer yet"}}

  SA -->|"/ , /api/*, /ws/"| GW
  AP -->|"/api/* via Vite proxy on :5174"| US
  AP -->|"/api/suppliers via Vite proxy"| SS
  GW -->|"/api/auth/, /api/users/"| US
  GW -->|"/api/suppliers"| SS
  GW -->|"/api/orders"| OS
  GW -->|"/api/credits/"| CS
  GW -->|"/ws/"| NS

  US --> UDB
  SS --> SDB
  US -. uses .-> AUTH
  SS -. uses .-> AUTH
  US -. types .-> DTO
  SS -. types .-> DTO

  classDef mock stroke-dasharray: 5 5;
```

Notes (facts):

- supplier-service never calls user-service; it verifies the access token locally with `JWT_PUBLIC_KEY`, issuer and audience.
- The gateway only routes. It does not inspect tokens or sessions.
- `http://localhost/admin/` does not render the admin portal (see `../requirements/conflicts.md` row 19); the portal is reached on `:5174`, whose Vite dev server proxies `/api/*` to the services.
