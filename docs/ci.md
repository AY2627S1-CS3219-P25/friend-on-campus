<!--
AI Assistance Disclosure:
Tool: Codex (model: GPT-5), date: 2026-10-12
Scope: Documented validation that every workspace test file is selected by a classified test script.
Author review: <to be completed by ngkhengyang>

Tool: Codex (model: GPT-5), date: 2026-10-11
Scope: Documented dynamic aggregate-test host ports and coexistence with the normal development Compose stack.
Author review: <to be completed by ngkhengyang>

Tool: Codex (model: GPT-5), date: 2026-10-11
Scope: Documented the public test commands, aggregate runner, matrix validator, isolated system stacks, and Chromium UAT.
Author review: <to be completed by ngkhengyang>

Tool: Codex (model: GPT-5), date: 2026-10-11
Scope: Replaced dynamic test discovery guidance with explicit static CI matrix maintenance instructions.
Author review: <to be completed by ngkhengyang>

Tool: Codex (model: GPT-5), date: 2026-10-11
Scope: Documented package-script test discovery, test categories, per-category infrastructure, system jobs, and the final gate.
Author review: <to be completed by ngkhengyang>

Tool: Codex (model: GPT-5.6 Sol), date: 2026-10-11
Scope: Documented required CI checks and how new npm workspaces participate in repository validation.
Author review: <to be completed by ngkhengyang>
-->

<!-- AI-generated (edited by ngkhengyang) -->
# Continuous integration

Pull requests and pushes to `main` run these required GitHub Actions jobs:

- **Lint** — installs from `package-lock.json` and runs `npm run lint`.
- **Build** — installs from `package-lock.json` and runs every workspace's real `build` script.
- **Type checks** — type-checks every applicable workspace independently of test execution.
- **Test matrix consistency** — compares package test scripts with the static workflow entries and rejects missing, stale, duplicate, unknown, watch-mode, or incorrectly provisioned entries.
- **Unit, integration, messaging, migration, and seed matrices** — explicitly list and run every package test script as a separately named check with `fail-fast: false`.
- **Acceptance, API E2E, and browser UAT** — use separate isolated Compose projects for API/notification UAT, D2 API E2E, and headless Chromium UI checks.
- **Test gate** — performs no checkout or installation; it fails unless every required job reports success.

Every ordinary job runs its own checkout, Node 22 setup, and `npm ci`. The root `postinstall` script generates Prisma clients, so jobs do not repeat that command explicitly.

## Public test commands

| Command | Scope | Direct-use prerequisites |
| --- | --- | --- |
| `npm run test:unit` | All workspace unit suites | Node dependencies only |
| `npm run test:integration` | All integration suites | PostgreSQL and the documented test database variables |
| `npm run test:messaging` | All messaging suites | PostgreSQL, RabbitMQ, migrations, and test variables |
| `npm run test:migration` | Credit migration validation | PostgreSQL and `CREDIT_TEST_DATABASE_URL` ending in `_test` |
| `npm run test:seed` | Credit seed validation | Migrated PostgreSQL test database |
| `npm run test:acceptance` | API and notification UAT | Healthy full Compose stack |
| `npm run test:e2e:api` | D2 API E2E | Seeded PostgreSQL; ports 8001/8002 free |
| `npm run test:e2e:ui` | Chromium browser UAT | Healthy full Compose stack and installed Chromium |
| `npm run test:e2e` | API E2E, then browser UAT | Docker engine; uses isolated system-test orchestration |
| `npm test` | Every category above | Docker engine; the runner installs Chromium if needed |

`npm test` is the self-contained path. `scripts/ci/run-all-tests.mjs` creates a uniquely named Compose project with its own containers and volumes, selects available loopback ports for the gateway, PostgreSQL, RabbitMQ AMQP, User Service, and Supplier Service, and passes those endpoints to every test command. It then creates dedicated `_test` databases, deploys required migrations, runs the five package categories, builds the full stack, runs acceptance and API E2E, restores the stack, and runs Chromium UAT. `npm run test:e2e` uses the same port-isolated orchestration for the API and browser system suites.

The dynamic host ports allow either aggregate command to run while the normal development `docker compose` stack still owns ports 80, 5432, 5672, and 8001–8002. Services not accessed directly by a host-side test are exposed only within the temporary Compose network. Success, failure, SIGINT, and SIGTERM all remove only the uniquely named test project's containers and volumes; the default development project is not stopped, inspected, restarted, or cleaned.

## Test-script convention

Test commands follow these names:

| Script | Category | CI infrastructure |
| --- | --- | --- |
| `test:unit` | Unit | Node.js only |
| `test:integration` | Database/service integration | PostgreSQL 16 |
| `test:messaging` | Broker integration | PostgreSQL 16 and RabbitMQ 3.13 |
| `test:migration` | Migration validation | PostgreSQL 16 with a fresh `_test` database |
| `test:seed` | Seed validation | PostgreSQL 16 with workspace migrations deployed |
| `test:acceptance` | Compose system acceptance | Full Compose stack |
| `test:e2e:api` | API end-to-end | PostgreSQL and service processes |
| `test:e2e:ui` | Browser end-to-end | Full Compose stack and Chromium |
| `test:e2e` | System-test convenience command | Prepared API and UI infrastructure |

Use `test:watch` or `test:<category>:watch` only for persistent local watch commands; never add a watch command to CI.

The matrices are intentionally static. Whenever a test script is added, renamed, moved, or removed, update the matching matrix or system-test command in `.github/workflows/ci.yml` in the same change and run `npm run ci:validate-tests`. Every workspace file named `*.test.js`, `*.test.jsx`, `*.test.ts`, or `*.test.tsx` (including the `c`/`m` module variants) must be selected by at least one classified package script, either explicitly or through a glob. The validator fails with an actionable message for unselected test files, recognised scripts missing from CI, stale or duplicate entries, unknown `test:*` names, watch commands, and invalid database/RabbitMQ metadata. Workspaces with no test files or test scripts are valid.

Matrix metadata uses `database: none`, `schema`, or `deploy`, plus `rabbitmq: true|false`. Database-backed jobs provide shared and service-specific test URLs; messaging jobs also provide broker URLs. Tests remain console-only. On failure, infrastructure jobs upload PostgreSQL, RabbitMQ, or Compose logs; acceptance and browser jobs also upload their existing JSON results, and browser UAT uploads screenshots.

## Adding a workspace

Place the workspace under an existing root workspace glob (`apps/*`, `services/*`, or `packages/*`) and add a real `build` script to its `package.json`. The root build intentionally omits `--if-present`, so CI fails instead of silently skipping a workspace without a build.

Add `typecheck` and convention-compliant test scripts when they apply, then add each test command to the appropriate static matrix or system-test job in `.github/workflows/ci.yml`. Database-backed services must also expose `db:generate`; a suite that needs application tables should expose `db:deploy` and use `database: deploy`. Run `npm install` at the repository root to update `package-lock.json`, then verify `npm run ci:validate-tests`, `npm run lint`, `npm run build`, `npm run typecheck`, the practical category commands, and `npm test` when Docker is available.
