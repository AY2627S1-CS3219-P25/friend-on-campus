<!--
AI Assistance Disclosure:
Tool: Codex (model: GPT-6), date: 2026-10-25
Scope: Source-linked implementation documentation and evidence review requested by Reallyeasy1.
Author review: <to be completed by Reallyeasy1>
-->

# Testing strategy and UAT configuration

Implementation baseline: [`52d791e`](https://github.com/AY2627S1-CS3219-P25/friend-on-campus/commit/52d791e4eea28ce7d817f025ef096f8d96bda467); inspected 2026-10-25 (SGT). Pending work is explicitly labelled.

This reference maps commands to actual tests, dependencies and outputs. It resolves issue #174's documentation gap: standalone UAT drivers can connect to the wrong local RabbitMQ unless AMQP_URL is set explicitly.

## Existing commands

| Root command | Scope/dependency |
|---|---|
| npm run typecheck | All ten workspaces; backend test tsconfigs included |
| npm run lint | ESLint; warnings and errors reported separately |
| npm run test:unit | User, Supplier, Order and Notification on main; Node/tsx |
| npm run test:integration | PostgreSQL-backed service suites |
| npm run test:messaging | PostgreSQL/RabbitMQ; Order suite requires dedicated Credit CDC |
| npm run test:migration / test:seed | Credit migration/seed suites |
| npm run test:acceptance | API UAT → Notification UAT → CDC UAT |
| npm run test:e2e:api | D2 API E2E; starts User/Supplier on 8001/8002 |
| npm run test:e2e:ui | Playwright Chromium browser UAT |
| npm run ci:validate-tests | Static CI matrix/workspace scripts consistency |
| npm test | Isolated aggregate Compose orchestration; includes browser setup and cleanup |

The aggregate runner assigns a unique project, free loopback ports, test-only JWT keys, isolated databases and the required CDC connector. It overrides driver network settings. It can install Chromium; it is not a lightweight Markdown check. Do not reuse its teardown command against a development project.

## Driver environment matrix

Set variables for the specific driver. A variable not listed for that driver has no documented effect.

| Driver | Variable | Default and meaning |
|---|---|---|
| uat-d2-ui.mjs | GW | http://localhost; browser ingress |
| uat-d2-ui.mjs | ADMIN_URL | GW + /admin/ |
| uat-d2-ui.mjs | AMQP_URL | Development Order publisher identity, localhost:5672, vhost campus; use configured credentials |
| uat-d2-ui.mjs | SHOTS | test-results/screenshots under repository root |
| uat-d2-ui.mjs | UAT_OUT | test-results/uat-d2-ui-results.json |
| uat-notifications.mjs | GW | http://localhost; REST ingress |
| uat-notifications.mjs | WS_URL | GW with http→ws, plus /ws/ |
| uat-notifications.mjs | AMQP_URL | Same development broker host/port/vhost convention as UI driver |
| uat-d2-api.mjs | GW | http://localhost |
| uat-d2-api.mjs | SUP_DIRECT / USER_DIRECT | http://localhost:8002 / http://localhost:8001 |
| uat-d2-api.mjs | UAT_OUT | test-results/uat-d2-api-results.json |
| uat-cdc.mjs | BASE_URL / GW | BASE_URL wins, then GW, then http://localhost |
| uat-cdc.mjs | CDC_TIMEOUT_MS | 60000 |
| uat-cdc.mjs | UAT_OUT | test-results/uat-cdc-results.json |

Notification UAT supports neither UAT_OUT nor SHOTS: it reports to stdout. WS_URL configures that standalone driver, not the browser's notification hook; browser sockets derive from page origin. Driver authentication/publisher defaults are local-development settings, not production credentials.

## Running against a broker exposed on 5673

First inspect the chosen Compose mapping and set AMQP_URL to its configured broker identity, **localhost:5673** and vhost campus. Set GW to the reachable gateway. Do not assume changing GW also changes AMQP_URL.

| Check | Command after setting variables |
|---|---|
| Browser | npm run test:e2e:ui |
| Notification | node scripts/uat/uat-notifications.mjs |
| Whole acceptance chain | npm run test:acceptance |

For a single invocation, the shape is `AMQP_URL='<configured AMQP URL on port 5673>' GW='http://localhost' npm run test:e2e:ui`; substitute the configured URL locally. The same AMQP_URL override belongs beside `node scripts/uat/uat-notifications.mjs`. Keep credential-bearing values out of committed files and shared logs.

If authentication reports ACCESS_REFUSED while Compose is healthy, verify which process owns 5672 and which host port Compose exposes. A native RabbitMQ on 5672 can accept the connection but reject the Compose publisher identity. This is not evidence that Notification parsing or storage failed. Do not change broker permissions or reset volumes to hide a wrong target.

## Test evidence boundaries

The browser driver catches individual step failures into its results, then prints/writes the totals without setting a nonzero exit code for failed checks. Inspect the JSON/log pass/fail counts: a zero exit or green CI job alone does not establish 40/40 success. This behavior is recorded, not fixed, by this documentation change.

User integration uses ADMIN_GUARD_TEST_DATABASE_URL and creates/applies/drops its own random schema. Notification integration/messaging skip when required variables are absent. Credit suites require safe isolated test URLs and fail their guard when missing/unsafe; inspect each script rather than treating all suites as optional. Supplier unit tests mock Prisma; its real database behavior is covered through selected acceptance paths.

Order saga messaging uses real Credit CDC but manually relays Order outbox records. Full CDC UAT covers registration, welcome grant, reservation and cancellation/refund. Browser UAT's 40 checks include notifications and order actions; its older D2 label is not a complete coverage description. Postman collections provide calls/assertions but do not prove all failure/recovery interleavings.

The current local run record is [review findings](../audits/review-findings.md). Historical Wiki screenshots/counts apply to their recorded commit, not this run. Tests can create users/orders/financial test data; run against explicit isolated environments, not production.

## Source evidence and related reading

- [`package.json`](../../package.json)
- [`scripts/ci/run-all-tests.mjs`](../../scripts/ci/run-all-tests.mjs)
- [`scripts/ci/validate-test-matrix.mjs`](../../scripts/ci/validate-test-matrix.mjs)
- [`scripts/uat/uat-d2-ui.mjs`](../../scripts/uat/uat-d2-ui.mjs)
- [`scripts/uat/uat-notifications.mjs`](../../scripts/uat/uat-notifications.mjs)
- [`scripts/uat/uat-d2-api.mjs`](../../scripts/uat/uat-d2-api.mjs)
- [`scripts/uat/uat-cdc.mjs`](../../scripts/uat/uat-cdc.mjs)
- [`scripts/test-d2-e2e.ts`](../../scripts/test-d2-e2e.ts)
- [`tests/postman/order_credit_README.md`](../../tests/postman/order_credit_README.md)
- [Wiki: Testing and Evidence](https://github.com/AY2627S1-CS3219-P25/friend-on-campus/wiki/Testing-and-Evidence)
- [Documentation index](../README.md) · [Drift register](../audits/documentation-drift.md) · [Verification record](../audits/review-findings.md)
