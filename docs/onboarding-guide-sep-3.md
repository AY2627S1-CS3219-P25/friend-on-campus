# 🎓 NUS CampusErrand — Engineering Guide

> **CS3219 Software Design and Architecture (AY26/27 S1)**  
> *Target Audience*: Team Members, New Contributors, and Beginner Developers  
> *Goal*: Explain **everything** about our tech stack, why each piece exists, how they connect, and how to build features with confidence.

---

## 📑 Table of Contents
1. [Mental Model & What We Are Building](#1-mental-model--what-we-are-building)
2. [Monorepo & npm Workspaces (From Scratch)](#2-monorepo--npm-workspaces-from-scratch)
3. [TypeScript & Configuration Demystified](#3-typescript--configuration-demystified)
4. [Backend Stack: Node.js, Express & Plain `tsx`](#4-backend-stack-nodejs-express--plain-tsx)
5. [Frontend Stack: Vite, React & Tailwind CSS](#5-frontend-stack-vite-react--tailwind-css)
6. [Deep Dive: Nginx API Gateway & Configuration (`gateway/nginx.conf`)](#6-deep-dive-nginx-api-gateway--configuration-gatewaynginxconf)
7. [Deep Dive: PostgreSQL & Database-per-Service (`docker/postgres-init/01-init-databases.sql`)](#7-deep-dive-postgresql--database-per-service-dockerpostgres-init01-init-databasessql)
8. [Comprehensive Deep Dive: Docker & Container Orchestration (`Dockerfile` & `docker-compose.yml`)](#8-comprehensive-deep-dive-docker--container-orchestration-dockerfile--docker-composeyml)
9. [Event Bus: Asynchronous Choreography with RabbitMQ](#9-event-bus-asynchronous-choreography-with-rabbitmq)
10. [Environment Variables & Networking (`localhost` vs `postgres`)](#10-environment-variables--networking-localhost-vs-postgres)
11. [Daily Developer Workflows & Step-by-Step Tutorial](#11-daily-developer-workflows--step-by-step-tutorial)
12. [Troubleshooting & Common Beginner Mistakes](#12-troubleshooting--common-beginner-mistakes)

---

## 1. Mental Model & What We Are Building

### What is NUS CampusErrand?
**CampusErrand** is a peer-to-peer errand platform for university students. If you are studying in COM2 and crave a coffee from COM3, or need tutorial handouts printed from UTown PCCommons, you post an errand. A peer who is already walking past accepts your request and brings it to you.

### Why a "Closed Credit Economy"?
* **No Real Money Transactions**: Students do not pay dollars to peers.
* **Earn by Helping, Spend by Requesting**: You start with 100 welcome credits. You spend credits when requesting favors, and earn credits when fulfilling favors for others.
* **Escrow Guarantee**: When an errand is created, reward credits are **locked in escrow** by the Credit Service. When the requester confirms delivery, credits are atomically transferred to the courier.

### Why Microservices Instead of a Monolith?
In a traditional **monolith**, all code lives in one giant backend program with one shared database. If one part crashes or gets overloaded, the entire app dies.

In our **Microservices Architecture**:
* Each service is an independent, specialized mini-server with its own database and responsibility.
* If `notification-service` is busy streaming WebSockets, `order-service` and `credit-service` continue running with zero performance degradation.

```mermaid
%%{init: {"flowchart": {"defaultRenderer": "elk"}} }%%
flowchart TB
    subgraph Clients["Frontend Applications (Vite + React)"]
        StudentApp["📱 Student Mobile Web<br/>(Port 5173 / Requester & Courier)"]
        AdminApp["💻 Staff Admin Portal<br/>(Port 5174 / Supplier Directory)"]
    end

    subgraph Ingress["Ingress Layer (Port 80)"]
        Nginx["🛡️ Nginx API Gateway & Reverse Proxy"]
    end

    subgraph Services["Backend Microservices (Node.js + plain tsx)"]
        UserSvc["👤 User Service<br/>:8001 (Auth & Profiles)"]
        SupplierSvc["📍 Supplier Service<br/>:8002 (Campus Locations)"]
        OrderSvc["📦 Order Service<br/>:8003 (State Machine)"]
        CreditSvc["💳 Credit Service<br/>:8004 (Escrow & Ledger)"]
        NotifSvc["🔔 Notification Service<br/>:8005 (WebSockets Hub)"]
    end

    subgraph Infrastructure["Backing Infrastructure"]
        Postgres[("🐘 PostgreSQL 16<br/>(4 Isolated Logical DBs)")]
        RabbitMQ[("🐰 RabbitMQ 3.13<br/>(Event Broker)")]
    end

    Clients --> Nginx
    Nginx -->|/api/users| UserSvc
    Nginx -->|/api/suppliers| SupplierSvc
    Nginx -->|/api/orders| OrderSvc
    Nginx -->|/api/credits| CreditSvc
    Nginx -->|/ws/| NotifSvc

    UserSvc -->|user_db| Postgres
    SupplierSvc -->|supplier_db| Postgres
    OrderSvc -->|order_db| Postgres
    CreditSvc -->|credit_db| Postgres

    OrderSvc -.->|"order.created / completed"| RabbitMQ
    CreditSvc -.->|"escrow.settled"| RabbitMQ
    RabbitMQ -.->|"consume events"| NotifSvc
```

---

## 2. Monorepo & npm Workspaces (From Scratch)

### Monorepo vs Multirepo
* **Multirepo**: 7 different Git repositories for 5 backend services and 2 frontend apps. (Painful to coordinate pull requests, sync shared types, or run everything locally).
* **Monorepo**: A single Git repository containing all applications, services, and shared libraries.

### How npm Workspaces Work
Look at our root [`package.json`](../package.json):
```json
{
  "name": "nus-campus-errand-monorepo",
  "workspaces": [
    "apps/*",
    "services/*",
    "packages/*"
  ]
}
```
When you run `npm install` once in the project root:
1. npm looks inside `apps/`, `services/`, and `packages/`.
2. It installs all dependencies into a **single root `node_modules`** folder.
3. It creates **symbolic links** for our internal packages.

### The Magic of `packages/common-dtos`
In [`packages/common-dtos/package.json`](../packages/common-dtos/package.json), its name is `"@campus-errand/common-dtos"`.

In any backend service or frontend app, we add it to `dependencies`:
```json
"dependencies": {
  "@campus-errand/common-dtos": "*"
}
```
Now, whenever you edit [`packages/common-dtos/src/index.ts`](../packages/common-dtos/src/index.ts) to add a new TypeScript interface or DTO (Data Transfer Object), **every service and frontend immediately sees the new type with full VS Code autocomplete**!

---

## 3. TypeScript & Configuration Demystified

### Why TypeScript?
JavaScript allows you to pass any data anywhere, leading to bugs like `undefined is not a function` at runtime. TypeScript adds compile-time type checking so bugs are caught immediately in your editor before code ever runs.

### Why are there multiple `tsconfig.json` files?
In a monorepo, backend microservices and frontend web apps run in **two completely different JavaScript environments**:

| Environment | Backend (`services/*`) | Frontend (`apps/*`) |
| :--- | :--- | :--- |
| **Runtime** | Node.js (Server) | Web Browser (Chrome, Safari) |
| **Available APIs** | `process`, `Buffer`, `fs`, `crypto` | `window`, `document`, `localStorage`, `fetch` |
| **UI Syntax** | None (pure JSON APIs) | React JSX (`<button onClick={...} />`) |
| **Module System** | NodeNext | Bundler (Vite ESM) |

If we had only 1 global `tsconfig.json`, TypeScript would either throw errors when using React JSX in the frontend or allow invalid browser APIs inside Node backend code.

### How We Keep It Clean using `extends`
All shared compiler rules live in one root file: [`tsconfig.base.json`](../tsconfig.base.json).

Each backend service has a tiny 7-line [`tsconfig.json`](../services/order-service/tsconfig.json):
```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "rootDir": "./src",
    "outDir": "./dist"
  },
  "include": ["src/**/*"]
}
```
If you change a TypeScript rule (e.g. enabling stricter null checks), you edit `tsconfig.base.json` once and all services inherit it.

---

## 4. Backend Stack: Node.js, Express & Plain `tsx`

### What is Node.js & Express?
* **Node.js**: The runtime engine that lets us execute JavaScript/TypeScript outside the browser on a server.
* **Express**: The minimalist web framework for defining REST API routes (`app.get('/api/orders', ...)`, `app.post('/api/orders', ...)`).

### What is `tsx` (and why it saves your sanity)?
Historically in TypeScript, running a backend server required:
1. Setting up a slow compiler (`tsc --watch`) that writes JavaScript files into a `dist/` folder.
2. Running `node dist/index.js` and configuring file watchers like `nodemon`.

**`tsx` (TypeScript Execute)** is a modern runtime powered by `esbuild`:
* **Zero build steps**: It reads and executes `.ts` files on the fly in milliseconds.
* **Instant Hot-Reloading**: `tsx watch src/index.ts` watches all imports (including `common-dtos`) and reloads instantly when you hit Save in your editor.
* **Lean dependencies**: No heavy webpack or complex babel configurations needed.

---

## 5. Frontend Stack: Vite, React & Tailwind CSS

### 1. Vite (Next Generation Frontend Tooling)
* Vite serves your code using native browser ES Modules.
* Instead of waiting 10–20 seconds for Webpack to bundle everything on startup, Vite starts in under 300ms and updates your browser with **Hot Module Replacement (HMR)** instantaneously when you modify UI components.

### 2. React (Component-Based UI)
* Everything is a reusable UI component (e.g., `<OrderCard />`, `<WalletBadge />`).
* State is managed reactively: when `orders` state changes via `setOrders(...)`, React automatically re-renders only the changed DOM nodes.

### 3. Tailwind CSS (Utility-First Styling)
Instead of writing separate `.css` files with custom class names, you apply utility classes directly in JSX:
```tsx
<button className="bg-nus-orange hover:bg-orange-600 text-white font-bold text-xs px-3.5 py-1.5 rounded-lg shadow-sm">
  Accept Errand
</button>
```
We customized NUS official brand colors in [`apps/student-app/tailwind.config.js`](../apps/student-app/tailwind.config.js):
* `nus-blue`: `#003D7C`
* `nus-orange`: `#EF7C00`

---

## 6. Deep Dive: Nginx API Gateway & Configuration (`gateway/nginx.conf`)

### What is Nginx?
**Nginx** (pronounced "Engine-X") is a high-performance web server, reverse proxy, and load balancer. In our architecture, it acts as the single security guard and traffic router standing between the outside world and our 5 microservices.

### Why do we need an API Gateway?
Without a gateway, your frontend would have to make requests to:
* `http://localhost:8001` (Users)
* `http://localhost:8002` (Suppliers)
* `http://localhost:8003` (Orders)
* `http://localhost:8004` (Credits)
* `ws://localhost:8005` (WebSockets)

This creates 3 major problems:
1. **CORS (Cross-Origin Resource Sharing) Errors**: Browsers block web apps on port `5173` from making AJAX calls to different ports.
2. **Security & Leakage**: Exposes internal microservice ports and topology to the public internet.
3. **Configuration Complexity**: Frontend must juggle 5 different base URLs.

---

### Line-by-Line Breakdown of [`gateway/nginx.conf`](../gateway/nginx.conf)

Let's understand every block in our Nginx config file:

#### 1. The Global & Events Block
```nginx
events {
    worker_connections 1024;
}
```
* **`worker_connections 1024`**: Tells Nginx that each worker process can simultaneously handle up to 1024 active connections (requests/WebSockets).

---

#### 2. Upstream Definitions
```nginx
upstream student_app_upstream {
    server student-app:5173;
}

upstream order_service_upstream {
    server order-service:8003;
}

upstream notification_service_upstream {
    server notification-service:8005;
}
```
* **What is an `upstream`?** An upstream gives a logical nickname to a destination server.
* Notice the hostname: `order-service:8003`. Inside Docker's virtual network, `order-service` resolves to the IP address of that specific container.

---

#### 3. The Server Block & Ingress Port
```nginx
server {
    listen 80;
    server_name localhost;
```
* **`listen 80`**: Nginx binds to standard HTTP port 80. Whenever anyone visits `http://localhost`, this server block catches the traffic.

---

#### 4. REST Route Reverse Proxying
```nginx
location /api/orders/ {
    proxy_pass http://order_service_upstream/api/orders/;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
}
```
* **`location /api/orders/`**: Matches any incoming URL that begins with `/api/orders/`.
* **`proxy_pass`**: Forwards the raw HTTP request transparently to `order-service:8003`.
* **`proxy_set_header Host $host`**: Preserves the original domain name requested by the user.
* **`proxy_set_header X-Real-IP $remote_addr`**: Passes the true client IP address to the backend so the microservice knows who made the request (instead of thinking Nginx is the client).

> [!TIP]
> **The Trailing Slash Rule in `proxy_pass`:**
> * If `proxy_pass http://order_service_upstream/api/orders/;` has a trailing slash `/`, Nginx strips the matching prefix and appends the remainder.
> * If `proxy_pass http://order_service_upstream;` has NO URI path, Nginx passes the exact full URI as-is.

---

#### 5. WebSocket Protocol Upgrades (`/ws/`)
```nginx
location /ws/ {
    proxy_pass http://notification_service_upstream/;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
    proxy_set_header Host $host;
    proxy_read_timeout 86400s;
    proxy_send_timeout 86400s;
}
```
* **The Challenge**: HTTP is short-lived (request $\to$ response $\to$ disconnect). WebSockets are continuous, bidirectional TCP streams.
* **`proxy_http_version 1.1`**: HTTP/1.1 is required for connection protocol upgrades.
* **`Upgrade $http_upgrade` & `Connection "upgrade"`**: Tells Nginx to switch protocols from standard HTTP to a persistent WebSocket stream.
* **`proxy_read_timeout 86400s`**: Prevents Nginx from killing idle WebSocket connections after 60 seconds (keeps it open for 24 hours).

---

#### 6. Frontend App Ingress
```nginx
location / {
    proxy_pass http://student_app_upstream;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
    proxy_set_header Host $host;
}
```
* Any URL that is not an `/api/*` or `/ws/*` route falls through to `/`, which loads the Vite React application.
* The WebSocket upgrade headers here enable **Vite Hot Module Reloading (HMR)** to work seamlessly through Nginx!

---

## 7. Deep Dive: PostgreSQL & Database-per-Service (`docker/postgres-init/01-init-databases.sql`)

### What is the Database-per-Service Pattern?
In microservices, **services must never query or modify another service's database tables directly**.

* `user-service` is the single source of truth for users.
* `order-service` is the single source of truth for orders.
* `credit-service` is the single source of truth for balances and escrow.

If `order-service` needs user information, it **must** ask `user-service` via REST API or listen to events on RabbitMQ. It can never run `SELECT * FROM users`.

---

### How PostgreSQL Auto-Initializes on First Boot
Look at our `docker-compose.yml` Postgres volume configuration:
```yaml
volumes:
  - ./docker/postgres-init:/docker-entrypoint-initdb.d
```
The official PostgreSQL Docker image has a built-in feature: **on its very first startup**, it scans `/docker-entrypoint-initdb.d` and executes all `.sql` scripts in alphabetical order!

---

### Line-by-Line Breakdown of [`docker/postgres-init/01-init-databases.sql`](../docker/postgres-init/01-init-databases.sql)

#### 1. Creating Isolated Logical Databases
```sql
CREATE DATABASE user_db;
CREATE DATABASE supplier_db;
CREATE DATABASE order_db;
CREATE DATABASE credit_db;
```
* Creates 4 independent databases inside the single PostgreSQL server engine.

---

#### 2. Switching Context with `\c` Meta-Command
```sql
\c user_db;
```
* **`\c <database_name>`**: In PostgreSQL CLI (`psql`), `\c` stands for "connect". It switches the active session to `user_db`.
* Any `CREATE TABLE` statements executed after this line will only exist inside `user_db`!

---

#### 3. User Table & UUID Keys
```sql
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nus_email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(100) NOT NULL,
    matric_number VARCHAR(10) UNIQUE NOT NULL,
    telegram_handle VARCHAR(50),
    role VARCHAR(20) NOT NULL DEFAULT 'STUDENT',
    rating_avg NUMERIC(3, 2) DEFAULT 5.00,
    total_completed_orders INT DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```
* **`gen_random_uuid()`**: Built-in Postgres function that generates cryptographically secure v4 UUIDs (e.g. `c4b1d643-9821-4f3b-...`) so ID generation does not rely on auto-incrementing sequential integers (which are vulnerable to enumeration attacks).
* **`TIMESTAMP WITH TIME ZONE` (`TIMESTAMPTZ`)**: Stores dates in UTC with timezone offset awareness.

---

#### 4. Supplier Table & Idempotent Seeding
```sql
\c supplier_db;

CREATE TABLE IF NOT EXISTS suppliers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    supplier_code VARCHAR(20) UNIQUE NOT NULL,
    name VARCHAR(150) NOT NULL,
    campus_zone VARCHAR(50) NOT NULL,
    exact_location VARCHAR(255) NOT NULL,
    category VARCHAR(50) NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

INSERT INTO suppliers (supplier_code, name, campus_zone, exact_location, category, description) VALUES
('SUP-001', 'CoffeeBean @ COM3', 'COM3', 'COM3 Level 1 Lobby', 'Beverages', 'Specialty coffee and pastries')
ON CONFLICT (supplier_code) DO NOTHING;
```
* **`ON CONFLICT (supplier_code) DO NOTHING`**: Makes the seed script **idempotent** (safe to run multiple times without throwing duplicate key errors).

---

#### 5. Constraints & Data Integrity in `credit_db`
```sql
\c credit_db;

CREATE TABLE IF NOT EXISTS credit_wallets (
    user_id UUID PRIMARY KEY,
    available_credits INT NOT NULL DEFAULT 100 CHECK (available_credits >= 0),
    escrow_credits INT NOT NULL DEFAULT 0 CHECK (escrow_credits >= 0),
    total_earned_credits INT NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```
* **`CHECK (available_credits >= 0)`**: A database-level constraint that guarantees balances can **never go negative**, preventing overdraft glitches at the storage layer.

---

### 💻 Useful `psql` Commands Cheatsheet

To open a terminal inside your running PostgreSQL container:
```bash
# Connect to order_db:
docker exec -it campuserrand-postgres psql -U postgres -d order_db
```

| `psql` Command | What it does |
| :--- | :--- |
| `\l` | List all databases (`user_db`, `order_db`, etc.) |
| `\c <dbname>` | Connect / switch to another database |
| `\dt` | List all tables in current database |
| `\d <tablename>` | Describe table schema & column types |
| `SELECT * FROM orders;` | Query rows (always end with a semicolon `;`) |
| `\q` | Quit `psql` and return to Mac terminal |

---

## 8. Comprehensive Deep Dive: Docker & Container Orchestration (`Dockerfile` & `docker-compose.yml`)

### The Docker Lifecycle Analogy
$$\text{Dockerfile (Source Recipe)} \xrightarrow{\text{docker build}} \text{Docker Image (Frozen Blueprint)} \xrightarrow{\text{docker run}} \text{Docker Container (Running Process)}$$

---

### Line-by-Line Breakdown of a Service [`Dockerfile`](../services/order-service/Dockerfile)

```dockerfile
# 1. Base Image
FROM node:20-alpine

# 2. Set working directory inside container
WORKDIR /app

# 3. Copy monorepo dependency manifests FIRST
COPY package.json tsconfig.base.json ./
COPY packages/ packages/
COPY services/order-service/package.json ./services/order-service/

# 4. Install dependencies inside container
RUN npm install

# 5. Copy actual service source code
COPY services/order-service ./services/order-service

# 6. Switch working directory to the service
WORKDIR /app/services/order-service

# 7. Document exposed port
EXPOSE 8003

# 8. Start the service process
CMD ["npx", "tsx", "src/index.ts"]
```

#### Why are lines 3 and 4 ordered before line 5?
* **Docker Layer Caching**: Each line in a Dockerfile produces a cached layer on disk.
* `npm install` takes several seconds. If we copied all source code before `npm install`, every single time you edit a `.ts` file, Docker would invalidate the cache and re-download all npm packages!
* By copying `package.json` first, Docker **caches the `node_modules` layer**. When you edit TypeScript code, Docker reuses the cached layer and builds in **under 1 second**.

---

### Why `.dockerignore` is Essential
Look at [`.dockerignore`](../.dockerignore):
```
node_modules
dist
.git
.env
```
Without `.dockerignore`, `COPY .` would copy your host Mac's 500MB `node_modules` and compiled Mac binaries into the Linux container, causing massive build slowdowns and binary architecture mismatches!

---

### Complete Field-by-Field Breakdown of [`docker-compose.yml`](../docker-compose.yml)

Docker Compose allows you to define and run a multi-container Docker application with a single YAML configuration file.

Let's examine every single section in [`docker-compose.yml`](../docker-compose.yml):

```yaml
services:
  # ----------------------------------------------------
  # 1. Ingress API Gateway & Reverse Proxy (Nginx)
  # ----------------------------------------------------
  api-gateway:
    image: nginx:alpine
    container_name: campuserrand-gateway
    ports:
      - "80:80"
    volumes:
      - ./gateway/nginx.conf:/etc/nginx/nginx.conf:ro
    depends_on:
      - student-app
      - admin-portal
      - user-service
      - supplier-service
      - order-service
      - credit-service
      - notification-service
```
* **`services:`**: The top-level YAML key that defines all containers to be created.
* **`image: nginx:alpine`**: Instead of writing a custom Dockerfile, we pull the official, ultra-lightweight Nginx image from Docker Hub.
* **`container_name: campuserrand-gateway`**: Gives a human-readable name in `docker ps` instead of an auto-generated random hash.
* **`ports: ["80:80"]`**: Maps port 80 on your Mac (`localhost`) to port 80 inside the container.
* **`volumes: ./gateway/nginx.conf:...:ro`**: A **Bind Mount** that mounts our local configuration file into Nginx in read-only mode (`:ro`).
* **`depends_on:`**: Lists all 7 downstream applications so Nginx doesn't start until they are launched.

---

```yaml
  # ----------------------------------------------------
  # 2. Frontend Applications (Vite + React)
  # ----------------------------------------------------
  student-app:
    build:
      context: .
      dockerfile: apps/student-app/Dockerfile
    container_name: campuserrand-student-app
    ports:
      - "5173:5173"
    environment:
      - VITE_API_BASE_URL=/api
```
* **`build:`**:
  * **`context: .`**: Sets the build context to the **monorepo root directory**. This is critical because the frontend's Dockerfile needs to copy [`packages/common-dtos`](../packages/common-dtos) to compile shared types!
  * **`dockerfile: apps/student-app/Dockerfile`**: Specifies the path to the Dockerfile.
* **`environment: VITE_API_BASE_URL=/api`**: Injects environment variables into the React app so all API requests go through the relative `/api` path on Nginx.

---

```yaml
  # ----------------------------------------------------
  # 3. Backend Microservices (Order Service Example)
  # ----------------------------------------------------
  order-service:
    build:
      context: .
      dockerfile: services/order-service/Dockerfile
    container_name: campuserrand-order-service
    ports:
      - "8003:8003"
    environment:
      - PORT=8003
      - DATABASE_URL=postgresql://postgres:postgres@postgres:5432/order_db
      - RABBITMQ_URL=amqp://guest:guest@rabbitmq:5672
      - CREDIT_SERVICE_URL=http://credit-service:8004
    depends_on:
      postgres:
        condition: service_healthy
      rabbitmq:
        condition: service_healthy
```
* **`DATABASE_URL=postgresql://postgres:postgres@postgres:5432/order_db`**:
  * Notice the hostname is `postgres` (not `localhost`).
  * Docker Compose automatically creates an internal DNS network where every service is reachable by its service name!
* **`condition: service_healthy` (Crucial!)**:
  * A basic `depends_on` only waits until the Postgres container *starts*, but Postgres needs 2–3 seconds to run initialization scripts. If `order-service` connects immediately, it crashes with `ECONNREFUSED`.
  * `condition: service_healthy` ensures Docker waits until PostgreSQL's healthcheck passes before booting `order-service`.

---

```yaml
  # ----------------------------------------------------
  # 4. PostgreSQL Database Container
  # ----------------------------------------------------
  postgres:
    image: postgres:16-alpine
    container_name: campuserrand-postgres
    ports:
      - "5432:5432"
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./docker/postgres-init:/docker-entrypoint-initdb.d
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 5s
      timeout: 5s
      retries: 5
```
* **`POSTGRES_USER` & `POSTGRES_PASSWORD`**: Default superuser credentials.
* **`postgres_data:/var/lib/postgresql/data`**: A **Named Volume** that stores PostgreSQL's data directory outside the container on disk so database records persist across restarts.
* **`./docker/postgres-init:/docker-entrypoint-initdb.d`**: Mounts our initialization SQL directory so Postgres runs [`01-init-databases.sql`](../docker/postgres-init/01-init-databases.sql) on first boot.
* **`healthcheck`**:
  * `test: ["CMD-SHELL", "pg_isready -U postgres"]`: Periodically runs `pg_isready` inside the container.
  * `interval: 5s`, `timeout: 5s`, `retries: 5`: Checks every 5 seconds until Postgres responds.

---

```yaml
  # ----------------------------------------------------
  # 5. RabbitMQ Message Broker Container
  # ----------------------------------------------------
  rabbitmq:
    image: rabbitmq:3.13-management-alpine
    container_name: campuserrand-rabbitmq
    ports:
      - "5672:5672"    # AMQP protocol
      - "15672:15672"  # Management Web Dashboard
    volumes:
      - rabbitmq_data:/var/lib/rabbitmq
    healthcheck:
      test: ["CMD", "rabbitmq-diagnostics", "check_port_connectivity"]
      interval: 10s
      timeout: 5s
      retries: 5
```
* **`rabbitmq:3.13-management-alpine`**: The `management` flavor includes the web dashboard on port `15672`.
* **Port `5672`**: For Node.js `amqplib` connections.
* **Port `15672`**: For your browser at `http://localhost:15672` (`guest`/`guest`).

---

```yaml
# ----------------------------------------------------
# 6. Top-Level Named Volumes Declaration
# ----------------------------------------------------
volumes:
  postgres_data:
  rabbitmq_data:
```
* Declares the persistent storage volumes managed by Docker Engine.

---

### 🐳 Essential Docker Compose CLI Cheatsheet

| Command | What it does | When to use |
| :--- | :--- | :--- |
| `docker compose up --build` | Builds images and starts all containers | First-time setup or after changing Dockerfile/dependencies |
| `docker compose up -d` | Starts containers in background (detached mode) | When you want your terminal free |
| `docker compose down` | Stops and removes containers and network | When you are done working |
| `docker compose down -v` | Stops containers **and deletes all database volumes** | When you want to completely wipe and reset database |
| `docker compose ps` | Lists all containers and their health status | To verify if all services are `healthy` |
| `docker compose logs -f order-service` | Follows live logs of a specific service | When debugging an API error |
| `docker compose restart api-gateway` | Restarts only the gateway | After editing `gateway/nginx.conf` |

---

## 9. Event Bus: Asynchronous Choreography with RabbitMQ

### Why Asynchronous Events?
If the Order Service had to make synchronous HTTP calls to 4 different services every time an order changed:
* If the Notification Service was slow, the user's "Accept Errand" button would freeze.
* If a service was temporarily down, the whole request would fail.

With **RabbitMQ (Message Broker)**, communication is decoupled:

### Errand Lifecycle Event Choreography:
1. **Requester posts an errand**:
   * `order-service` saves order with status `OPEN`.
   * Publishes event **`order.created`** to RabbitMQ.
2. **Notification Service receives `order.created`**:
   * Broadcasts WebSocket alert to couriers near that campus zone.
3. **Courier accepts the errand**:
   * `order-service` updates status to `ACCEPTED`.
   * Publishes **`order.accepted`**.
4. **Requester confirms delivery**:
   * `order-service` updates status to `COMPLETED`.
   * Publishes **`order.completed`**.
   * `credit-service` consumes `order.completed` and atomically releases escrow credits to the courier's wallet!

You can inspect all queues visually at **[http://localhost:15672](http://localhost:15672)** (Login: `guest` / `guest`).

---

## 10. Environment Variables & Networking (`localhost` vs `postgres`)

### Why Do Connection URLs Differ?
When you run code in two different environments, hostnames resolve differently:

```
Scenario A: Running on your Mac (npm run dev:user)
Your Mac (Host) ────────► connects to "localhost:5432" (Docker port mapped to Mac)

Scenario B: Running inside Docker (docker compose up)
user-service Container ──► connects to "postgres:5432" (Docker internal DNS name)
```

### Zero-Config Code Fallbacks
Our backend microservices are written with smart fallbacks:
```typescript
const DB_URL = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/order_db';
const RABBIT_URL = process.env.RABBITMQ_URL || 'amqp://guest:guest@localhost:5672';
```
* **Local Mac Dev**: It automatically connects to `localhost:5432`.
* **Docker Containers**: Docker injects `postgres:5432`, overriding the fallback.

---

## 11. Daily Developer Workflows & Step-by-Step Tutorial

### Workflow A: Super-Fast Local Dev (Recommended for Daily Coding) ⚡

You do **not** need to rebuild Docker containers every time you edit code!

```bash
# Step 1: Start Postgres & RabbitMQ in background (takes 2 seconds)
export PATH="/Users/yanhwee/.docker/bin:$PATH"
docker compose up postgres rabbitmq -d

# Step 2: In separate terminal tabs, run the service and app you are editing:
npm run dev:order       # Backend Order Service on Port 8003 (hot-reloads with tsx)
npm run dev:student     # Frontend Student App on Port 5173 (hot-reloads with Vite)
```

---

### Workflow B: Full Stack Docker Compose (For System Testing) 🚢

To test the entire system together with the Nginx Gateway:

```bash
export PATH="/Users/yanhwee/.docker/bin:$PATH"
docker compose up --build
```
* Open **[http://localhost](http://localhost)** to access the Student App via Gateway.
* Open **[http://localhost:5174](http://localhost:5174)** for Admin Portal.
* Open **[http://localhost:15672](http://localhost:15672)** for RabbitMQ Dashboard.

---

### Tutorial: How to Add a New Feature in 3 Steps

Suppose you want to add a new endpoint: `POST /api/orders/:id/cancel`.

#### Step 1: Define the Type Contract in `packages/common-dtos`
Open [`packages/common-dtos/src/index.ts`](../packages/common-dtos/src/index.ts):
```typescript
export interface CancelOrderRequest {
  orderId: string;
  cancelReason: string;
}
```

#### Step 2: Implement the Route in `services/order-service`
Open [`services/order-service/src/index.ts`](../services/order-service/src/index.ts):
```typescript
import { CancelOrderRequest, ApiResponse } from '@campus-errand/common-dtos';

app.post('/api/orders/:id/cancel', (req: Request, res: Response) => {
  const { id } = req.params;
  const { cancelReason }: CancelOrderRequest = req.body;

  // 1. Update order status to CANCELLED in database
  // 2. Publish order.cancelled event to RabbitMQ for credit refund
  res.json({ success: true, message: `Order ${id} cancelled.` });
});
```

#### Step 3: Call the Endpoint from the Frontend
In [`apps/student-app/src/App.tsx`](../apps/student-app/src/App.tsx):
```typescript
import { CancelOrderRequest } from '@campus-errand/common-dtos';

const cancelErrand = async (orderId: string) => {
  const payload: CancelOrderRequest = { orderId, cancelReason: 'No longer needed' };
  await fetch(`/api/orders/${orderId}/cancel`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
};
```

---

## 12. Troubleshooting & Common Beginner Mistakes

### 1. `Error: listen EADDRINUSE: address already in use :::5432` (or `:80`, `:8001`)
* **What it means**: Another program or container is already using that port.
* **Fix**:
  ```bash
  # Find what process is using the port:
  lsof -i :5432
  # Stop existing docker containers:
  docker compose down
  ```

### 2. `ECONNREFUSED` when connecting to database
* **What it means**: PostgreSQL is not running or not ready yet.
* **Fix**: Run `docker compose up postgres -d` and verify it is running with `docker ps`.

### 3. Changes in `common-dtos` are not showing up in another service
* **Fix**: Run `npm install` in the root folder so npm refreshes the workspace symlinks.

### 4. How to completely reset the database and seed data
* **Fix**:
  ```bash
  # Remove all persistent volumes and rebuild from scratch
  docker compose down -v
  docker compose up --build
  ```

---

*For detailed entity relationships, sequence diagrams, and requirements, check the project documentation in the repository.*
