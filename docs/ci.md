<!--
AI Assistance Disclosure:
Tool: Codex (model: GPT-5.6 Sol), date: 2026-10-11
Scope: Documented required CI checks and how new npm workspaces participate in repository validation.
Author review: <to be completed by ngkhengyang>
-->

<!-- AI-generated (edited by ngkhengyang) -->
# Continuous integration

Pull requests and pushes to `main` run these required GitHub Actions jobs:

- **Lint** — installs from `package-lock.json`, generates Prisma clients, and runs `npm run lint`.
- **Build** — installs from `package-lock.json`, generates Prisma clients, and runs every workspace's real `build` script.
- **Type checks and unit tests** — type-checks every applicable workspace and runs the workspaces that have real unit-test commands. A workspace without a test script is not considered tested.
- **API acceptance (Docker Compose)** — builds the Compose stack and runs the API, notification, and D2 end-to-end acceptance suites.

## Adding a workspace

Place the workspace under an existing root workspace glob (`apps/*`, `services/*`, or `packages/*`) and add a real `build` script to its `package.json`. The root build intentionally omits `--if-present`, so CI fails instead of silently skipping a workspace without a build.

Add `typecheck` and real `test` scripts when they apply. Database-backed services must also expose `db:generate`; the root generation command invokes every such script before validation. Run `npm install` at the repository root to update `package-lock.json`, then verify `npm run lint`, `npm run db:generate`, `npm run build`, `npm run typecheck`, and `npm test` before opening a pull request.
