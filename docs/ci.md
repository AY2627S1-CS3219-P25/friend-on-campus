<!--
AI Assistance Disclosure:
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

- **Lint** — installs from `package-lock.json`, generates Prisma clients, and runs `npm run lint`.
- **Build** — installs from `package-lock.json`, generates Prisma clients, and runs every workspace's real `build` script.
- **Type checks** — type-checks every applicable workspace independently of test execution.
- **Unit, integration, messaging, migration, and seed matrices** — explicitly list and run every package test script as a separately named check with `fail-fast: false`.
- **Acceptance and E2E system tests** — build the Compose stack and run the existing API/notification UAT and D2 E2E commands as separate checks.
- **Test gate** — fails unless lint, build, type checks, every test matrix, and both system-test categories succeed.

## Test-script convention

Test commands follow these names:

| Script | Category | CI infrastructure |
| --- | --- | --- |
| `test` or `test:unit` | Unit | Node.js only |
| `test:integration` | Database/service integration | PostgreSQL 16 |
| `test:messaging` | Broker integration | PostgreSQL 16 and RabbitMQ 3.13 |
| `test:migration` | Migration validation | PostgreSQL 16 with a fresh `_test` database |
| `test:seed` | Seed validation | PostgreSQL 16 with workspace migrations deployed |
| `test:acceptance` or `test:uat` | Compose system acceptance | Full Compose stack |
| `test:e2e` or the existing `test:d2` | End-to-end system tests | Full Compose stack |

Use `test:watch` or `test:<category>:watch` only for persistent local watch commands; never add a watch command to CI.

The matrices are intentionally static. Whenever a test script is added, renamed, moved, or removed, update the matching matrix or system-test command in `.github/workflows/ci.yml` in the same change. A new suite is not covered merely because its `package.json` script follows the naming convention.

Database-backed jobs provide `DATABASE_URL` and `TEST_DATABASE_URL`; messaging jobs also provide `RABBITMQ_URL` and `TEST_RABBITMQ_URL`. Existing service-specific test variables remain available, and migrations are deployed when the selected matrix entry sets `deployDatabase: true`. Failed jobs upload any existing TAP, JUnit, coverage, or test-result files without changing the tests' reporting format; database, RabbitMQ, and Compose jobs also upload their service logs.

## Adding a workspace

Place the workspace under an existing root workspace glob (`apps/*`, `services/*`, or `packages/*`) and add a real `build` script to its `package.json`. The root build intentionally omits `--if-present`, so CI fails instead of silently skipping a workspace without a build.

Add `typecheck` and convention-compliant test scripts when they apply, then add each test command to the appropriate static matrix or system-test job in `.github/workflows/ci.yml`. Database-backed services must also expose `db:generate`; the root generation command invokes every such script before validation. A database-backed suite that needs application tables should expose `db:deploy` and set `deployDatabase: true` in its matrix entry. Run `npm install` at the repository root to update `package-lock.json`, then verify `npm run lint`, `npm run db:generate`, `npm run build`, `npm run typecheck`, and `npm test` before opening a pull request.
