<!--
AI Assistance Disclosure:
Tool: Claude Code (model: Claude Fable 5.1), date: 2026-10-04
Scope: Facts for A6, A8, A10, A11 and S8 brought in step with the code: status at login and refresh, last-admin guards, 400 for a non-UUID id, case-insensitive sort.
Author review: <to be completed by Reallyeasy1>

Tool: Claude Code (model: Claude Fable 5.1), date: 2026-09-29
Scope: PR #93: role promotion, account deletion, the renamed status route and the supplier duplicate rule, as implemented on the `admin_dashboard` branch. Facts only; every "Team's answer" slot is unchanged.
Author review: <to be completed by Reallyeasy1>

Tool: Claude Code (model: Claude Fable 5.1), date: 2026-09-28
Scope: Laid out the questions from the CS3219 D2 instructions PDF (Part 1 points 1-6, Part 2 points 1-5) and, under each,
collected the as-built facts and demo pointers already recorded in docs/services, docs/diagrams, docs/api and
docs/evidence/d2 (main @ f0ee632). Author statements are quoted word for word from docs/decisions/0001-0004.
Every "Team's answer" slot is empty: the AI wrote no justification, trade-off, risk or rationale.
Author review: <to be completed by Reallyeasy1>
-->



# D2 progress check — question guide

One section per question in the D2 instructions. Each has three parts:

- **Facts** — what the code does, with the UAT check ID in brackets. Check IDs refer to the run on `main` @ f0ee632; facts about `toggle-role`, account deletion and the supplier duplicate rule (added in PR #93) are read from the code.
- **Show** — the diagram, file, command or screenshot to put on screen.
- **Team's answer** — empty. The "why" is written by the team (course AI policy; see [`README.md`](./README.md) "Who may write what").

Sources: [`services/user-service.md`](./services/user-service.md), [`services/supplier-service.md`](./services/supplier-service.md),
[`diagrams/`](./diagrams/), [`api/`](./api/), [`evidence/d2/d2-checklist.md`](./evidence/d2/d2-checklist.md),
[`requirements/conflicts.md`](./requirements/conflicts.md), [`decisions/`](./decisions/README.md).

## Where the project stands against the PDF

| Service | PDF points met | Level |
|---|---|---|
| Supplier Service | 1-5 | near-complete (written database justification still missing) |
| User Service | 1-5, part of 6 | significant progress (points 1-4) plus profile management and role promotion |

## Demo set-up

```bash
npm run generate:jwt-keys -- --print > .env    # once
docker compose up --build -d
```

| Thing | Value |
|---|---|
| Seed accounts | `alice`, `bob` (`STUDENT`), `admin` (`ADMIN`); password `Password123!` |
| Student app | `http://localhost/` |
| Admin portal | `http://localhost:5174/` — not `http://localhost/admin/`, which renders the student app (conflicts row 19) |
| API through the gateway | `http://localhost/api/...` |
| Services directly | User `:8001`, Supplier `:8002` |
| Scripted checks | `node scripts/uat/uat-d2-api.mjs` (56/63), `node scripts/uat/uat-d2-ui.mjs` (29/29) |

After restarting a single service, restart `api-gateway` too, or `/api/*` returns 502.

---

# Part 1 — User Service

## 1. Role design

### 1a. What roles have you defined?

**Facts**
- Two roles in code: `STUDENT` and `ADMIN` (`UserRole` in `packages/common-dtos`, column `users.role`).
- Registration always creates a `STUDENT` [R3]. After a fresh seed the only `ADMIN` is the seeded account; an `ADMIN` can change another user's role.
- A request without a token is treated as a guest. Guest is not a stored role.

**Author's statement** (verbatim, [`decisions/0003-roles.md`](./decisions/0003-roles.md))
> For two roles, user have courier and requester, and admin is basically in charge of ensuring that the platforms run well, essentially keeping track of the transactions, orders, etc.

**Differences between the statement and the code, for the team to settle**
- The statement says "user"; the code and database say `STUDENT`. The D2 plan says `USER` (conflicts row 9).
- Courier and requester are not separate values of `role`; one `STUDENT` account covers both.
- Tracking transactions and orders is not built: order-service and credit-service are in-memory mocks. What `ADMIN` can do today is in the table below.

### 1b. Why are these roles appropriate, and what problem does each solve?

**Team's answer**

<to be written by the team>

### 1c. Each role's capabilities

**Facts** — copied from "Roles as enforced" in [`services/user-service.md`](./services/user-service.md).

| Action | Part of the system | Guest | `STUDENT` | `ADMIN` |
|---|---|---|---|---|
| Register, log in, refresh, log out | User Service `/api/auth/*` | yes | yes | yes |
| Read / edit own profile, change own password | User Service `/api/users/me*` | 401 | yes | yes |
| List users | User Service `GET /api/users` | 401 | 403 | yes |
| Enable / disable an account | User Service `PATCH /api/users/:id/toggle-status` | 401 | 403 | yes |
| Promote or demote a user | User Service `PATCH /api/users/:id/toggle-role` | 401 | 403 | yes, except own id (403) |
| Delete own account | User Service `DELETE /api/users/:id` | 401 | yes | yes |
| Delete another user's account | User Service `DELETE /api/users/:id` | 401 | 403 | yes |
| List, search, read suppliers | Supplier Service `GET /api/suppliers`, `/:id` | yes | yes | yes |
| Create, edit, toggle, delete suppliers | Supplier Service writes | 401 | 403 | yes |
| Log in to the admin portal | `apps/admin-portal` | — | refused by the login gate | yes |

Open: guests can read the supplier directory, while the D2 plan permission matrix says No (conflicts row 10).

**Show** this table; checks A1, A2, A4, A5, W1-W12.

## 2. Database choice and schema design

### 2a. Which database, and why?

**Facts**
- PostgreSQL 16, accessed through Prisma. One database per service; this one is `user_db`.
- Migrations are owned by the service and deployed on container start: `20260922170000_initial_user_service`, `20260923150000_add_user_status`.
- Queries the service runs: look up a user by email (login) or by id (profile); case-insensitive uniqueness checks on username and email; look up a session by refresh-token hash; list all users ordered by username.
- No cross-database foreign keys. Other services refer to `users.id` as a logical reference.

**Author's statement** (verbatim, [`decisions/0001-database-choice.md`](./decisions/0001-database-choice.md))
> for database choice, we picked PostgreSQL as it is ACID and can support concurrency, other decisions include MongoDB, MySQL, SQlite.

**Team's answer** — the PDF asks for the nature of the user data, expected query patterns and scalability requirements.

<to be written by the team>

### 2b. Concrete schema

**Facts** — two tables, one relation: a user has zero or more sessions; deleting a user deletes its sessions (`ON DELETE CASCADE`).

| `users` | Type | Notes |
|---|---|---|
| `id` | uuid, PK | |
| `username` | varchar(50) | unique on `LOWER(username)` |
| `email` | varchar(320) | unique on `LOWER(email)` |
| `password_hash` | text | scrypt; never returned by the API |
| `role` | varchar(20) | `STUDENT` (default) or `ADMIN` |
| `status` | boolean | default `true` |
| `created_at`, `updated_at` | timestamptz | |

| `sessions` | Type | Notes |
|---|---|---|
| `id` | uuid, PK | the token's `sid` claim |
| `user_id` | uuid, FK → `users.id` | |
| `refresh_token_hash` | text, unique | |
| `persistent` | boolean | `true` when `keepLoggedIn` |
| `created_at`, `last_used_at`, `idle_expires_at` | timestamptz | |

Index `sessions_user_expiry_idx` on (`user_id`, `idle_expires_at`).

**Show** [`diagrams/user-schema.md`](./diagrams/user-schema.md); `services/user-service/src/database/prisma/schema.prisma`.

### 2c. How are credentials stored and managed?

**Facts**
- Passwords: scrypt (N=16384, r=8, p=1) with a 16-byte random salt per password; comparison uses `timingSafeEqual` (`services/user-service/src/auth/password.ts`).
- Login for an unknown email still runs a verification against a constant dummy hash (`auth-module.ts`).
- No password or hash appears in any API response [R3, P3].
- Refresh tokens: 32 random bytes; only the SHA-256 hash is stored (`auth/tokens.ts`). The token itself lives in an `HttpOnly` cookie with `Path=/api/auth` [L2].
- Changing a password requires the current one; wrong → 401 `INVALID_CURRENT_PASSWORD` [P8, P9].
- Signing key: `JWT_PRIVATE_KEY` is given to User Service only. `.env` is git-ignored.

**Team's answer**

<to be written by the team>

## 3. Authentication and authorization

### 3a. How are users authenticated?

**Facts**
- Token-based, issued by User Service itself; no third-party identity service.
- `POST /api/auth/login` returns an access token and sets the refresh cookie.
- Access token: Ed25519-signed JWT, sent as `Authorization: Bearer`, lifetime 15 minutes. Claims: `sub`, `sid`, `role`, `iat`, `exp`, `iss`, `aud` [L3].
- Refresh token: opaque, rotated on every refresh. A replayed old token gets 401 `INVALID_SESSION`; the current one keeps working [L6-L8].
- Cookie lifetime about 1 day, or about 30 days with `keepLoggedIn: true` [L5].
- Logout revokes the refresh session [L9]. Access tokens already issued stay valid until they expire.

**Show** [`diagrams/auth-sequence.md`](./diagrams/auth-sequence.md) (login and refresh).

### 3b. How is authorization enforced after authentication?

**Facts**
- Shared package `@campus-errand/auth` (`packages/auth`), used as Express middleware by each service.
- `authMiddleware` verifies signature, issuer, audience and expiry → 401 `MISSING_TOKEN` / `INVALID_TOKEN` / `TOKEN_EXPIRED` [P1, P2].
- `requireAdmin` reads `role` from the verified token claims → 403 `ADMIN_REQUIRED` [A1, W2].
- The gateway (`gateway/nginx.conf`) routes requests only; it does not check tokens or sessions.

**Author's statement** (verbatim, [`decisions/0002-token-verification.md`](./decisions/0002-token-verification.md))
> As for token based auth, we decided to go with a common middleware for every service that they can use to verify whether they are admin or user and then also have the session auth by the api gateway, rather than make a call at the user service every time to reduce single point of failure.

**Difference between the statement and the code, for the team to settle**
- The statement places session authentication at the API gateway. In the code each service verifies the token itself; nginx does no authentication.

**Related facts the mentor may ask about**
- The role is read from the token, so a role or status change reaches a user's requests when their token is next issued (at most 15 minutes).
- `status` is read at login (403 `ACCOUNT_DISABLED`) and at refresh (401 `INVALID_SESSION`), not at access-token verification: a disabled account keeps the access token it already holds until it expires, 15 minutes by default [A6, A11, issue #108].
- The D2 plan sketched an opaque session cookie with a validation endpoint (conflicts row 8).

**Team's answer** — the PDF asks you to justify why this approach suits FoC.

<to be written by the team>

### 3c. Live demonstration

| Step | Call | Expected |
|---|---|---|
| 1 | `POST /api/auth/login` wrong password | 401 `INVALID_CREDENTIALS` [L1] |
| 2 | `POST /api/auth/login` as `alice` | 200, access token, `Set-Cookie` HttpOnly [L2] |
| 3 | `GET /api/users/me` without a token | 401 `MISSING_TOKEN` [P1] |
| 4 | `GET /api/users/me` with alice's token | 200 profile [P3] |
| 5 | `GET /api/users/` with alice's token | 403 `ADMIN_REQUIRED` [A1] |
| 6 | `GET /api/users/` with admin's token | 200 user list [A2] |
| 7 | `POST /api/auth/refresh`, then replay the old cookie | 200, then 401 [L6, L7] |

Use the trailing slash on `/api/users/` through the gateway; without it nginx answers 301 [A0].

## 4. Integration with the Supplier Service

**Facts**
- Supplier Service imports `@campus-errand/auth` and verifies the token locally with `JWT_PUBLIC_KEY`, `JWT_ISSUER` and `JWT_AUDIENCE`.
- It makes no call to User Service. `docker-compose.yml` gives it the public key only, not the private key.
- Reads (`GET`) have no auth middleware. Writes need a valid token with `role` = `ADMIN`.

**Show** [`diagrams/auth-sequence.md`](./diagrams/auth-sequence.md) (allowed / denied supplier action), then:

| Step | Call | Expected |
|---|---|---|
| 1 | `POST /api/suppliers` without a token | 401 `MISSING_TOKEN` [W1] |
| 2 | Same, alice's token | 403 `ADMIN_REQUIRED` [W2] |
| 3 | Same, admin's token | 201, `SUP-NNN` code [W4] |
| 4 | Same, admin's token with one character of the signature changed | 401 `INVALID_TOKEN` [W12] |

## 5. User profile management

### 5a. How are profile updates validated and protected?

**Facts**
- `PATCH /api/users/me` needs a valid token and acts on the user id in the token's `sub` claim. There is no user id in the path.
- Empty username → 400; taken username (case-insensitive) → 409 `DUPLICATE_USERNAME` [P6, P7].
- `PUT /api/users/me/password` verifies the current password first [P8].
- The password update uses a conditional `updateMany`, so it applies only if the stored hash is still the one that was verified.

### 5b. How are role, status and user ID protected?

**Facts**
- The endpoint accepts `username` only. A body containing `role`, `status`, `userId` or `email` is rejected with 400 `INVALID_INPUT` and nothing is changed [P5].
- Email cannot be changed after registration.
- The student app's Profile page shows Email, Role and Status as read-only [US8].

**Show** `PATCH /api/users/me` with `{"role":"ADMIN"}` as alice → 400, then `GET /api/users/me` → still `STUDENT`.

**Team's answer**

<to be written by the team>

## 6. Role lifecycle and administration

Promotion is implemented; the last-administrator cases are not guarded (conflicts row 18).

### 6a. How is the first administrator created?

**Facts**
- `services/user-service/src/database/seed.ts` creates or updates `admin` (`admin@nus.edu.sg`, `ADMIN`, `Password123!`).
- The container start command runs migrations, then the seed, then the service, so every boot resets the three seed accounts' username, role and password. The seed does not write `status`.
- Registration cannot create an `ADMIN`. An existing `ADMIN` can promote another user (6b).

**Author's statement** (verbatim, [`decisions/0004-first-administrator.md`](./decisions/0004-first-administrator.md))
> As for admin story, well we wanted to have an admin that everyone can log in to and is reproducible across different machines so we try and keep this consistent

**Team's answer** — the PDF asks how the process is controlled and secured.

<to be written by the team>

### 6b. How does a user get promoted?

**Facts**
- `PATCH /api/users/:id/toggle-role` is `ADMIN`-only and flips the target between `STUDENT` and `ADMIN`; the same call demotes [A3].
- The admin portal's Users page calls it, so a promotion needs no developer.
- The new role is in the target's access token from their next login or refresh.
- The seed puts the three seed accounts' roles back on every container boot.

**Team's answer** — the intended workflow.

<to be written by the team>

### 6c. Edge cases

| Case in the PDF | What happens today |
|---|---|
| An administrator revokes their own privileges | Changing their own role is refused: 403 `SELF_ACTION_FORBIDDEN`. Disabling their own account through `toggle-status` is allowed while another enabled `ADMIN` exists [A8]. Deleting their own account through `DELETE /api/users/:id` is allowed while another `ADMIN` exists. |
| The only administrator deletes, demotes or disables their account | Demoting is refused by the own-id rule above. Deleting returns 409 `LAST_ADMIN_REQUIRED`. Disabling returns 409 `LAST_ADMIN_REQUIRED` [A8]. The delete and demote guard counts `ADMIN` roles, not enabled accounts (issue #109). |
| Non-UUID id on a `/:id` user route | 400 `INVALID_INPUT` [A10]. |

**Team's answer** — intended behaviour for each case.

<to be written by the team>

---

# Part 2 — Supplier Service

## 1. Database choice and schema design

### 1a. Which database, and why?

**Facts**
- PostgreSQL 16 through Prisma, database `supplier_db`, separate from `user_db`.
- Every supplier has the same fixed set of columns; five of them are nullable. There are no free-form or nested fields.
- Migrations `20260919090038_init` and `20260929134701_add_location_uniqueness`; seeded with 21 rows from `data/csv/supplier-seed-data.csv` on container start.
- Indexes: primary key, the unique index on `supplier_code`, and a unique index on the lower-cased `name`, `category`, `building` and `floor`.

**Author's statement** — the same as Part 1 §2a ([`decisions/0001-database-choice.md`](./decisions/0001-database-choice.md)).

**Team's answer** — the PDF asks about structured vs flexible data, query patterns and scalability.

<to be written by the team>

### 1b. Concrete schema

**Facts** — one table, `suppliers`, no relations.

| Column | Type | Notes |
|---|---|---|
| `id` | text, PK | uuid stored as text |
| `supplier_code` | text, unique | `SUP-NNN`, generated when not supplied |
| `name` | text | |
| `campus_zone` | text | |
| `exact_location` | text | |
| `category` | text | not validated against `SupplierCategory` |
| `building`, `floor` | text | required; with `name` and `category` they must be unique, ignoring case |
| `description` | text, nullable | |
| `latitude`, `longitude` | float, nullable | |
| `starting_time`, `closing_time` | text, nullable | |
| `image_url` | text, nullable | |
| `is_active` | boolean | default `true`; soft delete sets `false` |
| `created_at`, `updated_at` | timestamp | |

**Show** [`diagrams/supplier-schema.md`](./diagrams/supplier-schema.md).

### 1c. Supplier metadata: how stored and queried

| Metadata | Columns | Queried by |
|---|---|---|
| Name | `name` | `search` (contains, case-insensitive), `sortBy=name` |
| Type | `category` | `category` filter (equality, case-insensitive), `sortBy=category` |
| Location | `campus_zone`, `exact_location`, `building`, `floor`, `latitude`, `longitude` | `campusZone` filter; `search` covers `exact_location` and `building` |
| Opening hours | `starting_time`, `closing_time` | returned, not filterable |
| Availability | `is_active` | `isActive` filter |

`latitude` and `longitude` are stored and returned. No query uses them; "by location" means by campus zone or text search.

## 2. Query patterns and API design

### 2a. Key query patterns and their endpoints

| Pattern | Call | Check |
|---|---|---|
| All suppliers | `GET /api/suppliers` | S1 |
| By id | `GET /api/suppliers/<uuid>` | S2 |
| By supplier code | `GET /api/suppliers/SUP-001` | S3 |
| Unknown id | `GET /api/suppliers/<unknown>` → 404 | S4 |
| Search | `GET /api/suppliers?search=coffee` | S5, S10 |
| By location | `GET /api/suppliers?campusZone=<zone>` | S6 |
| By type | `GET /api/suppliers?category=<category>` | S7 |
| Sort | `GET /api/suppliers?sortBy=name&sortOrder=desc` | S8 |
| Paginate | `GET /api/suppliers?page=1&limit=5` → `total`, `totalPages` | S9 |

Filters combine with AND. Full contract: [`api/supplier-service.yaml`](./api/supplier-service.yaml).

**Behaviour the mentor may notice**
- `sortBy=name` ignores letter case: `he by He Brews` sorts among the names starting with H [S8]. Sorting and paging happen in the service, not in SQL (issue #110).
- An unsupported `sortBy` falls back to `name`; the D2 plan expects 400.
- Pagination applies only when `page` or `limit` is sent (default limit 10, max 100).

### 2b. How endpoints use identity and role from the User Service

**Facts** — as in Part 1 §4.

| Request | Response |
|---|---|
| Write without a token | 401 `MISSING_TOKEN` |
| Write with a bad or tampered token | 401 `INVALID_TOKEN` |
| Write with an expired token | 401 `TOKEN_EXPIRED` |
| Write as `STUDENT` | 403 `ADMIN_REQUIRED` |
| Write as `ADMIN` | 2xx |

## 3. CRUD operations in the backend

**Facts and demo order** (admin token)

| Step | Call | Expected |
|---|---|---|
| Create, fields missing | `POST /api/suppliers` | 400 [W3] |
| Create, same name, category, building and floor as an existing supplier | `POST /api/suppliers` | 409 with a `duplicate` object |
| Create | `POST /api/suppliers` | 201, `SUP-022` [W4] |
| Read back | `GET /api/suppliers/<id>` | 200 [W5] |
| Update | `PUT /api/suppliers/<id>` | 200 [W7] |
| Toggle | `PATCH /api/suppliers/<id>/toggle` | `isActive` flipped [W8] |
| Soft delete | `DELETE /api/suppliers/<id>` | row kept, `isActive=false` [W9] |
| Permanent delete | `DELETE /api/suppliers/<id>?permanent=true` | row gone, then 404 [W11] |

**Independent of the UI**
- `http://localhost:8002/api/suppliers` answers directly [S11].
- `docker compose stop student-app admin-portal`: `GET /` and `/admin/` → 502, `GET /api/suppliers` → 200 (21 rows), `POST /api/auth/login` → 200.

**Database connection** — `docker exec -it campuserrand-postgres psql -U postgres -d supplier_db -c "select supplier_code, name, is_active from suppliers order by supplier_code;"`

## 4. End-to-end integration

**Facts**
- Path: browser → nginx gateway → Supplier Service → PostgreSQL. [`diagrams/component.md`](./diagrams/component.md).
- A supplier created in the admin portal is readable through the API and is still there after `docker compose restart` [UA11, W5].

| Who | Sees |
|---|---|
| Guest | Supplier list and details through the API |
| `STUDENT` (alice) | Student app Spots directory, search, Post form; no admin controls [US5-US7]; refused by the admin portal login [UA2]; 403 on writes |
| `ADMIN` (admin) | Admin portal: suppliers and users pages; all writes |

## 5. Responsive supplier management UI

**Facts**

| Workflow | Where | Check |
|---|---|---|
| View records | Admin portal table (desktop), cards (mobile) | UA3, UM1 |
| Search, including no results | Admin portal | UA5, UA6 |
| Filter | Admin portal | UA7 |
| Sort | Admin portal | UA8 |
| Paginate (page size 8) | Admin portal | UA9 |
| Details | Admin portal modal | UA10, UM3 |
| Create | Admin portal | UA11 |
| Edit | Admin portal | UA12 |
| Delete, soft and permanent | Admin portal | UA13, UA14 |
| Browse and search as a student | Student app Spots tab | US5, US6 |

- Viewports checked: 1440 px and 390 px. At 390 px there is no horizontal overflow and the navigation becomes a hamburger drawer.
- Live data: both apps fetch `/api/suppliers`; every admin write goes through the API and was confirmed by reading it back from the API.
- The student app has a hard-coded fallback list used only when the API call fails (`apps/student-app/src/App.tsx`). Its wallet and escrow figures are mock data.

**Show** the live apps, or `evidence/d2/screenshots/` (`admin-*-desktop.png`, `admin-*-mobile.png`, `student-*`).

---

# Still to be written by the team

| Item | Where |
|---|---|
| Why these roles (1b) | this file, [`decisions/0003-roles.md`](./decisions/0003-roles.md) |
| Database justification, both services (Part 1 §2a, Part 2 §1a) | this file, [`decisions/0001-database-choice.md`](./decisions/0001-database-choice.md) |
| Why this authentication and authorization approach (3b) | this file, [`decisions/0002-token-verification.md`](./decisions/0002-token-verification.md) |
| First administrator: control and security (6a) | this file, [`decisions/0004-first-administrator.md`](./decisions/0004-first-administrator.md) |
| Promotion workflow and edge cases (6b, 6c) | this file |
| Statement vs code differences in 1a and 3b | the two decision records above |
