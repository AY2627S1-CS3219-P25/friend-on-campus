<!--
AI Assistance Disclosure:
Tool: Codex (model: GPT-6), date: 2026-10-01
Scope: Updated proxy paths for Compose and host development after PR #105 review fixes.
Author review: <to be completed by author after review>

Tool: Claude Code (model: Claude Fable 5.1), date: 2026-09-30
Scope: Added the legend, the data-flow colouring and the link to the PlantUML twin; re-pinned to main @ fcd5371 (the gateway and service facts are unchanged by PRs #92-#94 and #93). As built, no rationale.
Author review: <to be completed by Reallyeasy1>

Tool: Claude Code (model: Claude Fable 5.1), date: 2026-09-28
Scope: Drew this component diagram from docker-compose.yml, gateway/nginx.conf and the service entry points on `main` @ f0ee632.
It shows what is built, not a proposal. No rationale.
Author review: <to be completed by Reallyeasy1>
-->

# Component diagram — as built

PlantUML version: [`component.puml`](./component.puml) (see [Rendering](#rendering)).
Intended shape and sources: [`../architecture/overview.md`](../architecture/overview.md).

Legend: black solid arrow = control flow (HTTP or WebSocket request, in the direction of the call); blue solid arrow = data flow
(database read/write); dotted arrow = compile-time dependency, no runtime call; dashed box = in-memory mock from the starter
template; cylinder = database; hexagon = message broker.

```mermaid
flowchart LR
  subgraph Clients
    SA["student-app<br/>React + Vite :5173"]
    AP["admin-portal<br/>React + Vite :5174"]
  end

  GW["api-gateway<br/>nginx :80<br/>routes only, no auth"]

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
  AP -->|"/api/* via Vite proxy in Compose"| GW
  GW -->|"/api/auth/, /api/users[/]"| US
  GW -->|"/api/suppliers"| SS
  GW -->|"/api/orders"| OS
  GW -->|"/api/credits[/]"| CS
  GW -->|"/ws/"| NS

  US -->|"read/write users, sessions"| UDB
  SS -->|"read/write suppliers"| SDB
  US -. uses .-> AUTH
  SS -. uses .-> AUTH
  US -. types .-> DTO
  SS -. types .-> DTO

  subgraph Legend
    direction LR
    L1[ ] -->|"control flow: request"| L2[ ]
    L3[ ] -->|"data flow: DB read/write"| L4[ ]
    L5[ ] -.->|"compile-time dependency"| L6[ ]
  end

  classDef mock stroke-dasharray: 5 5;
  classDef legendDot width:0px,height:0px,stroke:none,fill:none;
  class L1,L2,L3,L4,L5,L6 legendDot;
  linkStyle 7,8,14 stroke:#1F5FBF,stroke-width:2px;
```

Notes (facts):

- supplier-service never calls user-service; it verifies the access token locally with `JWT_PUBLIC_KEY`, issuer and audience.
- The gateway only routes. It does not inspect tokens or sessions.
- Compose sets `GATEWAY_URL` for both Vite apps to route API traffic through nginx; student-app routes `/ws` through nginx too. Host-based development without it uses service URLs or localhost port defaults.
- `http://localhost/admin/` renders the admin portal through nginx. Direct `:5174/admin/` access also works; student-app forwards `/admin` to `ADMIN_PORTAL_URL` (set by Compose, with a localhost default).

## Rendering

Every diagram in this folder exists twice: a Mermaid block in the `.md` (GitHub renders it in place) and a `.puml` file with the same content.
To render the PlantUML files (Java required):

```bash
curl -sL -o /tmp/plantuml.jar https://github.com/plantuml/plantuml/releases/latest/download/plantuml.jar
java -jar /tmp/plantuml.jar -tsvg docs/diagrams/*.puml      # writes .svg next to each .puml; use -tpng for slides
```

Or paste a file into https://www.plantuml.com/plantuml. Rendered images are not committed; export them only for slides.
