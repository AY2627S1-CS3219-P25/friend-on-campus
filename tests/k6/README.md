<!--
AI Assistance Disclosure:
Tool: Claude Code (model: Claude Fable 5.1), date: 2026-11-08
Scope: Rewrote the k6 notes for issues #236/#237: wrapper-driven smoke/load/stress profiles, run-owned fixtures,
       per-operation thresholds from the linked issues, evidence bundle layout and the claim-race script's scope.
Author review: <to be completed by Reallyeasy1>
-->

# k6 API load tests

k6 generates HTTP load through the gateway, checks responses and fails on per-operation thresholds. Browser
journeys stay in Playwright (`npm run test:e2e:ui*`); financial correctness, C20/W100 and recovery stay in the
Node harness (issue #64). Design: wiki [Automated System Testing and Evidence Design](https://github.com/AY2627S1-CS3219-P25/friend-on-campus/wiki/Automated-System-Testing-and-Evidence-Design), sections 6-8.

Prerequisite: the `k6` binary (pinned to **v1.5.0** in CI; `winget install k6`, `brew install k6` or the
[k6 releases](https://github.com/grafana/k6/releases)). `npm ci` does not install it.

## Run through the wrapper

The scripts read fixtures the wrapper creates (run-owned accounts, suppliers, open errands); they refuse to start
without them. Fixtures and cleanup need an administrator login: a loopback target defaults to the seeded local
admin (README "Default Seed Accounts"); any other target requires `PERF_ADMIN_EMAIL` and `PERF_ADMIN_PASSWORD`
in the environment. Credentials are never written to disk.

```bash
npm run perf:k6 -- --target http://127.0.0.1 --profile smoke --workload all

# Every requirement-load population in one go (discovery, supplier at 50 and 100 VUs, credit, lifecycle;
# about 40 minutes against the local stack). Extra flags after -- override, e.g. -- --target http://host
npm run perf:k6:load

# One requirement-load population at a time
npm run perf:k6 -- --target http://127.0.0.1 --profile load --workload discovery      # #74, 100 VUs
npm run perf:k6 -- --target http://127.0.0.1 --profile load --workload supplier       # #29, 50 VUs
npm run perf:k6 -- --target http://127.0.0.1 --profile load --workload supplier --vus 100   # #33
npm run perf:k6 -- --target http://127.0.0.1 --profile load --workload credit         # #43/#45, 100 VUs
npm run perf:k6 -- --target http://127.0.0.1 --profile load --workload lifecycle      # #36, 50 VUs

# Bounded stress above a passing baseline (non-loopback targets also need --acknowledge-remote-load)
npm run perf:k6 -- --target http://127.0.0.1 --profile stress --workload discovery
```

| Flag | Meaning | Bounds |
|---|---|---|
| `--target` | Gateway URL (plain http/https, no credentials) | load/stress against a non-loopback host requires `--acknowledge-remote-load` |
| `--profile` | `smoke` (1-5 VUs, 1 min), `load` (issue VUs; 1 min warm-up excluded, 5 min measured, up to 1 min drain), `stress` (+25 VUs every 2 min up to 150 VUs / 10 min) | fixed in `tests/k6/requirements.json` |
| `--workload` | `all`, `discovery`, `supplier`, `credit`, `lifecycle` | `all` runs reads first, lifecycle last; under `load` it also runs supplier at 100 VUs (`supplier-100vus`) |
| `--vus` | VU override | smoke 1-5, otherwise 1-150 |
| `--suppliers`, `--feed-orders` | Run-owned dataset sizes | defaults 25/5 (smoke), 500/50 (load, stress); max 1000/200 |
| `--keep-fixtures` | Skip cleanup for debugging | fixtures stay on the target |
| `PERF_ADMIN_EMAIL`, `PERF_ADMIN_PASSWORD` | Administrator login for fixtures and cleanup | required for non-loopback targets; loopback defaults to the seeded admin |
| `PERF_OPEN_TIMEOUT_MS`, `PERF_RECONCILE_TIMEOUT_MS`, `PERF_CONCURRENCY_TOLERANCE`, `PERF_KEEP_RAW`, `K6_BIN` | Environment knobs | documented in `scripts/perf/run-perf.mjs` |

Stages: **preflight** (gateway `/health`, k6 present, admin login) -> **fixtures** -> **k6** per workload ->
**reconciliation** (run-owned orders, wallets and ledgers; issue #64 invariants) -> **cleanup** (cancel run orders,
delete run suppliers and accounts, delete the credentials file). Any required stage that fails, blocks or is
incomplete makes the exit code nonzero; cleanup and reporting never turn that into success.

## Workloads and thresholds

Thresholds are taken verbatim from the linked issues (`tests/k6/requirements.json`) and apply to the
steady-state population only (`phase=steady`; warm-up, `auth` and `polling` requests are excluded). Every
operation also needs response correctness (`response_ok` rate > 99%) and `http_req_failed` < 1%; where the
issue has no error wording that 1% is a harness default and is labelled so in the report.

| Script | Workload | Population | Limit |
|---|---|---|---|
| `discovery-load.js` (`WORKLOAD=discovery`) | order feed and query variants (status, page/limit, campusZone, search) | `order_feed` | p95 < 1000 ms at 100 VUs (#74) |
| `discovery-load.js` (`WORKLOAD=supplier`) | supplier listing, search, filters, pagination over >= 500 run-owned active records | `supplier_search` | p95 <= 2000 ms at 50 VUs (#29); <= 4000 ms above 50 VUs (#33) |
| `credit-balance-load.js` | wallet read of the VU's own account, compared with the fixture snapshot | `credit_wallet` | p95 <= 500 ms at 100 VUs (#43), errors < 1% (#45) |
| `order-lifecycle-load.js` | requester/courier pair per VU: create -> poll OPEN -> accept -> pickup -> deliver -> complete | `order_create`, `order_accept`, `order_pickup`, `order_deliver`, `order_complete` | each p95 <= 500 ms at 50 VUs (#36); `lifecycle_incomplete == 0` |

Order creation reports the HTTP `202` latency and the PENDING -> OPEN duration (`order_pending_to_open_ms`)
separately. Neither closes #44: Credit mutation latency is a service-boundary measurement for the Node harness.

The report distinguishes configured VUs, estimated in-flight requests (Little's law over the steady window,
client side) and requests per second. "Sustained N concurrent" issues (#43) are marked `INCOMPLETE` when the
estimate is below N x tolerance (default 0.95); "up to N" issues are met when N VUs were configured. The smoke
profile reports concurrency as `NOT_ASSESSED`: it proves plumbing, never a requirement.

## Evidence bundle (`test-results/<runId>/`)

`manifest.json` (run, target, profile, VUs, limits, k6/Node versions, commit), `thresholds.json`, `fixtures.json`
(counts and search keys, no credentials), `results.json` (stage verdicts and exit code), `reconciliation.json`,
`cleanup.json`, `summary.md`, `run.log`, and per workload `k6-summary.json`, `k6-metrics.json.gz` (10-second
buckets per metric/scenario/operation/phase/step), `performance.json` and `k6.log`. Metric tags hold route
templates only; raw URLs, query strings, IDs and tokens are never tagged or logged.

The manual GitHub Actions workflow `.github/workflows/performance.yml` runs the same wrapper with allowlisted
targets and uploads the bundle even when the run fails.

## `order-claim-race.js`

Twenty concurrent claims with one courier token against a run-owned OPEN errand; expects one `200` and nineteen
`409`. It aborts on a failed login, a missing token or an errand that never becomes `OPEN`, and never picks an
errand from the shared feed. It does not implement C20 (twenty distinct couriers with a dispatch barrier and
persisted assertions); issue #64's harness does. Isolated stack only:

```bash
RACE_COURIER_EMAIL=... RACE_COURIER_PASSWORD=... RACE_REQUESTER_EMAIL=... RACE_REQUESTER_PASSWORD=... \
RACE_SUPPLIER_ID=<active supplier uuid> TARGET_HOST=http://127.0.0.1 k6 run tests/k6/order-claim-race.js
```
