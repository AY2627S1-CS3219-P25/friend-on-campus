<!--
AI Assistance Disclosure:
Tool: Codex (model: GPT-6), date: 2026-11-09
Scope: Refresh test categories, isolation boundaries, driver variables, failure exits and k6 evidence limitations.
Author review: <to be completed by Reallyeasy1>

Tool: Claude Code (model: Claude Fable 5.1), date: 2026-10-26
Scope: Driver environment matrix rows for scripts/uat/uat-realtime.mjs (issue #197).
Author review: <to be completed by Reallyeasy1>

Tool: Codex (model: GPT-6), date: 2026-10-25
Scope: Source-linked implementation documentation and evidence review requested by Reallyeasy1.
Author review: <to be completed by Reallyeasy1>
-->

# Testing and evidence

Source baseline: [`b989758`](https://github.com/AY2627S1-CS3219-P25/friend-on-campus/commit/b989758e766cb593c3b8c94102eb6dfb5c7d8491); inspected 9 November 2026 (SGT). These are source-verified instructions, not evidence of a new runtime test or a live AWS deployment.

Choose a suite by the behavior being changed. [CI](../infrastructure/ci-cd.md) defines required jobs; [service references](../README.md) explain individual cases. Test drivers can register accounts, modify supplier data, spend credits and publish events. Run them against explicitly selected test environments, not an arbitrary deployed site.

## Choose a command

| Root command | Coverage and prerequisites |
|---|---|
| `npm run typecheck` | All 12 workspaces; service and messaging test sources are included through their test tsconfigs |
| `npm run lint` / `npm run build` | ESLint / all workspace builds; install dependencies and generate clients first |
| `npm run test:unit` | Nine suites: six services, both apps and shared messaging; Node's test runner through `tsx` |
| `npm run test:integration` | Four PostgreSQL suites: User admin guards, Credit, Notification, Chat |
| `npm run test:messaging` | Four PostgreSQL/RabbitMQ suites: Credit, Order, Notification, Chat; Order also needs Credit CDC |
| `npm run test:migration` | Credit and Supplier migration suites against isolated databases |
| `npm run test:seed` | Credit seed suite against an isolated database |
| `npm run test:acceptance` | API UAT → Notification UAT → CDC UAT against an already-running seeded stack |
| `npm run test:e2e:api` | Starts User/Supplier processes itself; needs prepared local PostgreSQL and available selected ports |
| `npm run test:e2e:ui` | Playwright Chromium browser UAT against a healthy seeded stack |
| `npm run test:e2e:ui:realtime` | Four browser clients exercising notification/chat consistency; creates a temporary courier |
| `npm run ci:validate-tests` | Validates the static CI test matrices and package script selection |
| `node --test scripts/perf/test/harness.test.mjs` | Nine wrapper self-tests at this baseline; no k6, database or broker needed |
| `node --test scripts/ci/deployment.test.mjs` | Release-script and workflow regression checks; does not deploy |
| `npm run coverage` | Per-service unit coverage reports; not a CI gate |

## Isolated aggregate runner

`npm test` invokes [run-all-tests.mjs](../../scripts/ci/run-all-tests.mjs). It creates a uniquely named Compose project, chooses free loopback ports, generates temporary signing keys, creates test databases, runs the category and system suites, then removes its own stack and volumes. It also checks Chat/Notification socket shutdown. It can install Chromium and takes substantially longer than static checks.

`npm run test:e2e` uses the same isolation with `--system-only`: API E2E, browser UAT and socket shutdown; it omits unit/database categories and the acceptance chain.

**Neither aggregate command invokes `test:e2e:ui:realtime` at this baseline.** The CI browser job runs that script separately. Do not describe `npm test` as covering every available root command. k6, coverage and deployment-wrapper tests also have separate entry points.

## Direct database suites

Prefer the aggregate runner when you need its infrastructure setup. For direct category runs, inspect the relevant test and supply dedicated test resources; some suites skip when an opt-in variable is absent, while others fail their safety guard.

| Suite | Required settings / isolation |
|---|---|
| User integration | `ADMIN_GUARD_TEST_DATABASE_URL`; creates and drops a random schema. `USER_TEST_DATABASE_URL` is not its opt-in variable |
| Credit integration, messaging, migration, seed | `CREDIT_TEST_DATABASE_URL` naming a `_test` database; messaging also uses `CREDIT_TEST_RABBITMQ_URL` |
| Notification integration / messaging | `NOTIFICATION_TEST_DATABASE_URL`; messaging additionally needs `NOTIFICATION_TEST_RABBITMQ_URL`; suites skip without the required settings |
| Chat integration / messaging | `CHAT_TEST_DATABASE_URL`; messaging additionally needs `CHAT_TEST_RABBITMQ_URL`; suites skip without the required settings |
| Order messaging | `ORDER_TEST_DATABASE_URL` and `CREDIT_TEST_DATABASE_URL` ending in `_test`, `CREDIT_TEST_RABBITMQ_URL`, and a dedicated Credit CDC connector/exchange (`SAGA_TEST_EXCHANGE`) |
| Supplier migration | `DATABASE_URL` naming a `_test` database; creates temporary schemas and exercises migration history |

The [CI workflow](../../.github/workflows/ci.yml) and aggregate runner show the current database creation/migration sequence. Order messaging manually relays Order outbox rows while exercising real Credit CDC; [CDC UAT](../../scripts/uat/uat-cdc.mjs) exercises the deployed User/Order/Credit publication chain. Neither is a complete simulation of every failure interleaving.

## Driver environment matrix

These standalone drivers do not inherit each other's configuration. Settings below come from their source, not from a global UAT configuration file.

| Driver | Settings | Defaults / effect |
|---|---|---|
| [Browser UAT](../../scripts/uat/uat-d2-ui.mjs) | `GW`, `ADMIN_URL` | `http://localhost`; admin defaults to `GW` + `/admin/` |
| Browser UAT | `AMQP_URL`, `SHOTS`, `UAT_OUT` | Order publisher on localhost:5672/campus; screenshots under `test-results/screenshots`; JSON at `test-results/uat-d2-ui-results.json` |
| [Notification UAT](../../scripts/uat/uat-notifications.mjs) | `GW`, `WS_URL` | `http://localhost`; socket defaults to the equivalent `/ws/` URL |
| Notification UAT | `AMQP_URL`, `CREDIT_AMQP_URL` | Order publisher and Credit publisher; Credit URL defaults to a credential substitution in `AMQP_URL`, so set both explicitly for a custom broker identity |
| [API UAT](../../scripts/uat/uat-d2-api.mjs) | `GW`, `SUP_DIRECT`, `USER_DIRECT`, `UAT_OUT` | Gateway localhost; direct Supplier/User ports 8002/8001; JSON at `test-results/uat-d2-api-results.json` |
| [CDC UAT](../../scripts/uat/uat-cdc.mjs) | `BASE_URL`, `GW`, `CDC_TIMEOUT_MS`, `UAT_OUT` | `BASE_URL` takes priority over `GW`, then localhost; observation timeout defaults to 60000 ms |
| [Realtime browser UAT](../../scripts/uat/uat-realtime.mjs) | `GW`, `UAT_OUT` | localhost; JSON and screenshots under `test-results/uat-realtime/` |
| Realtime browser UAT | `UAT_RESTART_CHAT`, `UAT_CHAT_CONTAINER` | Restart check is skipped unless `UAT_RESTART_CHAT=1`; then executes `docker restart` against the named container (default `campuserrand-chat-service`) |
| [API E2E](../../scripts/test-d2-e2e.ts) | `TEST_USER_PORT`, `TEST_SUPPLIER_PORT`, `TEST_POSTGRES_PORT` | Defaults 8001, 8002, 5432; starts the two services itself |

Notification UAT reports to stdout; it has no `UAT_OUT` or `SHOTS` option. Browser socket URLs derive from page origin; `WS_URL` only changes the standalone Notification driver. The browser/API scripts assume documented seed accounts and administrative actions, so they are not a general single-account live-site UAT runner.

### Broker targeting

If the selected test stack exposes AMQP on 5673, configure `AMQP_URL` with the correct identity, localhost:5673 and vhost `campus`. Set `CREDIT_AMQP_URL` independently for Notification UAT when using custom credentials. Set `GW` to the gateway address separately. Keep credential-bearing values in local environment configuration, not reports or committed commands.

An `ACCESS_REFUSED` response can mean the driver reached a different native broker on 5672. Check listeners and Compose port mappings before changing broker permissions or resetting volumes.

## Load testing with k6

The canonical workload commands and profile details are in [tests/k6/README.md](../../tests/k6/README.md); [`requirements.json`](../../tests/k6/requirements.json) defines the enforced values. `npm ci` does not install k6. The manual [performance workflow](../../.github/workflows/performance.yml) pins k6 1.5.0 and runs the wrapper, which creates run-owned accounts/suppliers/orders and reconciles credit effects.

`npm run perf:k6:load` targets the local gateway and runs all configured load populations. Remote targets require administrator environment credentials; non-loopback load/stress additionally requires `--acknowledge-remote-load`. Obtain authorization and agree bounds before generating shared-environment load.

The author raised latency thresholds and lowered Supplier load to 20/30 VUs. Original issue figures remain in `requirementP95Ms` / `requirementVus`. **A PASS establishes only the configured harness criteria, not the original NFRs**, cloud capacity, autoscaling or service-boundary Credit mutation latency (#44).

PR #252 is merged, but its [four P2 review findings](https://github.com/AY2627S1-CS3219-P25/friend-on-campus/pull/252#pullrequestreview-5825829477) remain present at this baseline: workflow argument handling can bypass target selection; fixture workers can outlive cleanup; skipped pending orders can lose recovery accounts; empty discovery lists can pass correctness checks. Account for these limits when interpreting results or using cleanup. Generated test-account credentials are temporarily written under the run's `.secrets` directory and removed during normal cleanup; administrator credentials are supplied through environment variables.

## Interpret the evidence

The API, Notification, CDC, main browser and realtime drivers propagate failed checks through a nonzero exit status. The old claim that Browser UAT always exits successfully is no longer true: see its [final verdict](../../scripts/uat/uat-d2-ui.mjs). Still inspect skipped cases, JSON reports and screenshots; passing CI proves only the scenarios actually executed.

Record the target, source revision, command, fixture scope, timing and artifact paths with every run. An HTTP `202`, success toast or test script's early step does not prove the asynchronous credit effect completed. Historical wiki results remain tied to their original revision. This documentation refresh does not execute runtime, load, recovery or live-AWS tests.

[Documentation index](../README.md) · [Drift register](../audits/documentation-drift.md) · [Verification record](../audits/review-findings.md)
