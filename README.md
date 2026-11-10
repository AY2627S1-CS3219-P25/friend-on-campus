<!--
AI Assistance Disclosure:
Tool: Google Antigravity Agent; Codex (model: GPT-6, GPT-5.6 Terra); Claude Code (model: Claude Fable 5.1, Claude Opus 5.5), date: 2026-09-21 to 2026-11-10
Scope: Repository overview, system architecture, local and Docker setup instructions, test suite guide, API URL reference link, and project-level AI use summary.
Author review: I validated correctness, edited for style, and verified with automated tests.
-->

# Friend on Campus

A campus errand application with a student interface, an admin portal and six backend services. Students post errands, reserve credit rewards, coordinate with couriers and confirm delivery. Order and Credit complete cross-service work asynchronously.

Start with the [developer guides](docs/README.md) for the system explanation, testing and troubleshooting. Use the [API URL reference](docs/api-reference.md) to find HTTP routes, WebSockets and health probes. The [wiki](https://github.com/AY2627S1-CS3219-P25/friend-on-campus/wiki) holds design and milestone context; its older implementation descriptions may differ from current source.

## Quick start

Prerequisites: Git, Node.js 22.3 or later with npm, and Docker with Compose. The setup below creates a local development stack; it is not a production deployment procedure.

From the repository root, create `.env` only if it does not already exist:

```bash
cp .env.example .env
npm run generate:jwt-keys
```

Copy the generated `JWT_PRIVATE_KEY` and `JWT_PUBLIC_KEY` values into your local `.env`, then start the stack:

```bash
docker compose up --build
```

Compose starts PostgreSQL, RabbitMQ, the three Debezium connectors, six backends, both frontends and NGINX. Its service commands apply committed migrations and run the configured User/Supplier/Order/Credit seeds. Application image defaults themselves start the application only.

| Open | Purpose |
|---|---|
| [http://localhost](http://localhost) | Student application through the gateway |
| [http://localhost/admin/](http://localhost/admin/) | Administration portal |
| [http://localhost/health](http://localhost/health) | Gateway liveness only, not a full-system health check |

For the default local seed, `alice@u.nus.edu` and `bob@u.nus.edu` are student accounts and `admin@nus.edu.sg` is the administrator; the seeded password is `Password123!`. These are development fixtures. The Credit seeder initializes their wallets directly; wallets for newly registered accounts are initialized asynchronously.

For host-based development, port conflicts, migrated data or startup failures, follow [local development](docs/development/local-development.md). Do not delete volumes to fix an ordinary startup error: `docker compose down -v` destroys the local stack's persisted data.

## Develop and test

Follow the [host development setup](docs/development/local-development.md#option-b-edit-applications-on-the-host), which ends by starting the applications in one terminal:

```bash
npm run dev
```

Keep that terminal running while you use the application. In a second terminal at the repository root, check types and run unit tests:

```bash
npm run typecheck
npm run test:unit
```

The development guide covers `npm ci`, environment keys, database migrations, seeding and the database/broker/CDC startup sequence. `npm ci` generates the six Prisma clients; it does not create database tables.

The [testing guide](docs/development/testing-strategy.md) explains integration, messaging, browser, concurrency and k6 coverage, prerequisites and interpretation. Before using `npm test`, follow its [aggregate setup](docs/development/testing-strategy.md#let-the-aggregate-runner-provision-an-isolated-stack): Compose 2.24.4+ is required, and inherited target overrides must be cleared. Realtime browser checks and k6 campaigns have separate scope. Do not run seeded/admin UAT drivers unchanged against a live shared site.

## Find the implementation

| Directory | Contents |
|---|---|
| `apps/` | Student and admin React frontends |
| `services/` | Six backends, per-service schemas/migrations and tests |
| `packages/` | Shared auth, contracts, messaging and LLM libraries |
| `gateway/`, `docker/` | Local routing, PostgreSQL initialization, RabbitMQ and CDC |
| `infra/terraform/ecs/` | Current AWS configuration and deployment runbook |
| `scripts/`, `tests/` | Development/CI/UAT drivers, k6 and Postman fixtures |
| `docs/` | Thirteen implementation/operational guides and their index |

For AWS, read the [cloud explanation](docs/new-cloud-architecture-guide.md), then use the [ECS Terraform runbook](infra/terraform/ecs/README.md). For code contributions and AI bookkeeping, read [AGENTS.md](AGENTS.md) and [CLAUDE.md](CLAUDE.md). Historical milestone records remain in the wiki and Git history.

## AI Use Summary

**Tools:** Claude Code (Claude Sonnet 5.5, Claude Fable 5.1, Claude Opus 5.5), Codex (GPT-5, GPT-5.6 Terra, GPT-6), Google Antigravity Agent, ChatGPT (GPT-5.6 Sol)

**Prohibited phases avoided:** Wholesale requirements elicitation, backlog prioritization, sprint planning, proposing/changing system architecture or component boundaries, selecting design patterns, deciding data schemas, defining interfaces, and drafting architectural decision rationales or trade-off analyses.

**Used for:**
- Refining requirement phrasing and checking for edge-case contradictions in human-defined functional and non-functional specifications.
- Generating Express, React, Prisma, Docker, NGINX, and Terraform implementation code and boilerplate against human-approved schemas, contracts, and architectural boundaries.
- Writing and maintaining automated unit, integration, messaging, migration, browser UAT, and k6 load/concurrency test suites.
- Debugging assistance, code review, refactoring, and source-linked developer documentation.

**Verification & Disclosure:**
- All AI outputs were reviewed, edited, and verified against automated tests by the human authors.
- File-level attributions are recorded at the top of each AI-influenced file.
- Agent configuration and policy enforcement files are tracked in [`AGENTS.md`](AGENTS.md), [`CLAUDE.md`](CLAUDE.md), and [`.claude/`](.claude/).
- Timestamped prompts, usage scenarios, and affected files are archived in [`ai/usage-log.md`](ai/usage-log.md).
