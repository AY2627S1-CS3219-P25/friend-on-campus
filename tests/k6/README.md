<!--
AI Assistance Disclosure:
Tool: Codex (model: GPT-6), date: 2026-11-09
Scope: Correct credential persistence, configured performance limits, proposed harness status and cleanup/target-safety limitations.
Author review: <to be completed by Reallyeasy1>

Tool: Claude Code (model: Claude Fable 5.1), date: 2026-11-08
Scope: Rewrote the k6 notes for issues #236/#237: wrapper-driven smoke/load/stress profiles, run-owned fixtures,
       per-operation thresholds from the linked issues, evidence bundle layout and the claim-race script's scope.
Author review: <to be completed by Reallyeasy1>

Tool: Claude Code (model: Claude Fable 5.1), date: 2026-11-09
Scope: Documented --cleanup-tag (removing a failed run's fixtures), the wrapper's self-renewing logins, its self-tests
       and the run comparison (scripts/perf/compare-runs.mjs).
       The threshold table and wording follow the limits the author raised on 2026-11-09 (requirements.json).
Author review: <to be completed by Reallyeasy1>
-->

# k6 API load tests

k6 generates HTTP load through the gateway, checks responses and fails on per-operation thresholds. Browser
journeys use Playwright (`npm run test:e2e:ui` and `npm run test:e2e:ui:realtime`). The broader C20/W100
concurrency and recovery Node harness in issue #64 is proposed, not implemented at this baseline. Design: wiki [Automated System Testing and Evidence Design](https://github.com/AY2627S1-CS3219-P25/friend-on-campus/wiki/Automated-System-Testing-and-Evidence-Design), sections 6-8.

Prerequisite: the `k6` binary (pinned to **v1.5.0** in CI; `winget install k6`, `brew install k6` or the
[k6 releases](https://github.com/grafana/k6/releases)). `npm ci` does not install it.

## Run through the wrapper

The scripts read fixtures the wrapper creates (run-owned accounts, suppliers, open errands); they refuse to start
without them. Fixtures and cleanup need an administrator login: a loopback target defaults to the seeded local
admin (README "Default Seed Accounts"); any other target requires `PERF_ADMIN_EMAIL` and `PERF_ADMIN_PASSWORD`
in the environment. The wrapper does not write those administrator credentials to its evidence bundle.
Generated test-account credentials are temporarily written to `test-results/<runId>/.secrets/accounts.json`
for k6, then deleted on the wrapper's normal completion path (also with `--keep-fixtures`). The performance
workflow excludes `.secrets` from artifact uploads. An interrupted process can leave that local file behind;
exclude it when sharing results. See [run-perf.mjs](../../scripts/perf/run-perf.mjs) and
[performance.yml](../../.github/workflows/performance.yml).

```bash
npm run perf:k6 -- --target http://127.0.0.1 --profile smoke --workload all

# Every load population in one go (discovery, supplier at 20 and 30 VUs, credit, lifecycle;
# about 40 minutes against the local stack). Extra flags after -- override, e.g. -- --target http://host
npm run perf:k6:load

# One requirement-load population at a time
npm run perf:k6 -- --target http://127.0.0.1 --profile load --workload discovery      # #74, 100 VUs
npm run perf:k6 -- --target http://127.0.0.1 --profile load --workload supplier       # #29, 20 VUs (lowered from 50)
npm run perf:k6 -- --target http://127.0.0.1 --profile load --workload supplier --vus 30    # #33 (lowered from 100)
npm run perf:k6 -- --target http://127.0.0.1 --profile load --workload credit         # #43/#45, 100 VUs
npm run perf:k6 -- --target http://127.0.0.1 --profile load --workload lifecycle      # #36, 50 VUs

# Bounded stress above a passing baseline (non-loopback targets also need --acknowledge-remote-load)
npm run perf:k6 -- --target http://127.0.0.1 --profile stress --workload discovery
```

| Flag | Meaning | Bounds |
|---|---|---|
| `--target` | Gateway URL (plain http/https, no credentials) | load/stress against a non-loopback host requires `--acknowledge-remote-load` |
| `--profile` | `smoke` (1-5 VUs, 1 min), `load` (configured VUs; 1 min warm-up excluded, 5 min measured, up to 1 min drain), `stress` (+25 VUs every 2 min up to 150 VUs / 10 min) | fixed in `tests/k6/requirements.json` |
| `--workload` | `all`, `discovery`, `supplier`, `credit`, `lifecycle` | `all` runs reads first, lifecycle last; under `load` it also runs supplier at its second population of 30 VUs (`supplier-30vus`) |
| `--vus` | VU override | smoke 1-5, otherwise 1-150 |
| `--suppliers`, `--feed-orders` | Run-owned dataset sizes | defaults 25/5 (smoke), 500/50 (load, stress); max 1000/200 |
| `--keep-fixtures` | Skip cleanup for debugging | fixtures stay on the target |
| `--cleanup-tag <tag>` | Only remove the fixtures of an earlier run, then exit | the six-character `tag` in that run's `fixtures.json` (also in `manifest.json` and, when cleanup failed, in `summary.md`) |
| `PERF_ADMIN_EMAIL`, `PERF_ADMIN_PASSWORD` | Administrator login for fixtures and cleanup | required for non-loopback targets; loopback defaults to the seeded admin |
| `PERF_OPEN_TIMEOUT_MS`, `PERF_RECONCILE_TIMEOUT_MS`, `PERF_CONCURRENCY_TOLERANCE`, `PERF_KEEP_RAW`, `K6_BIN` | Environment knobs | documented in `scripts/perf/run-perf.mjs` |

Stages: **preflight** (gateway `/health`, k6 present, admin login) -> **fixtures** -> **k6** per workload ->
**reconciliation** (run-owned orders, wallets and ledgers; issue #64 invariants) -> **cleanup** (cancel run orders,
delete run suppliers and accounts, delete the credentials file). Any required stage that fails, blocks or is
incomplete makes the exit code nonzero; cleanup and reporting never turn that into success.

A load run takes longer than one access token lives (15 minutes), so the wrapper's administrator and account logins
renew themselves, as the k6 sessions do. Cleanup is best effort: inspect `cleanup.json` for errors and skipped
orders. Tag-based cleanup can recover records owned by surviving test accounts, but the current cleanup can
delete an account while skipping its PENDING orders, making those orders undiscoverable by tag. Outstanding
fixture workers can also finish after cleanup. See the [open PR #252 findings](../../docs/audits/documentation-drift.md#pr-252-findings-still-open).

```bash
npm run perf:k6 -- --target http://127.0.0.1 --cleanup-tag 746e82
```

The wrapper's own logic (login renewal, stage verdicts, finding a run by tag, run comparison) has self-tests that
need no stack:

```bash
node --test scripts/perf/test/harness.test.mjs
```

## Benchmarking: compare two runs

A run's verdict says whether it met the configured harness thresholds; this does not establish the original requirements. To see how one run moved against another (a kept
baseline, the run before a change), compare their evidence bundles. The table lists p50, p95 and throughput per
operation with the change; it measures nothing itself and gives no pass or fail.

```bash
# keep a baseline under a name you choose
npm run perf:k6 -- --target http://127.0.0.1 --profile load --workload all --run-id baseline-local-20261109

# later: run again, then compare (run ids under test-results/, or paths to run directories)
node scripts/perf/compare-runs.mjs baseline-local-20261109 <new run id> --out comparison.md
```

Compare like with like: the same profile, virtual-user counts and machine. Rows whose virtual-user counts differ are
marked. On a laptop the load generator, the containers and their health checks share the CPU, so expect run-to-run
variation; repeat a run before reading a small change as real.

Let the stack settle before a run. A load run leaves work behind: after the order lifecycle workload the
Notification Service still had about 2,000 events queued and drained them at roughly 1,000 a minute, and after an
overloaded supplier workload the Supplier Service stayed unhealthy for a while. On 2026-11-09 the wallet workload
measured p95 946 ms straight after such a run and 391 ms on a settled stack, with identical code. For the local
Compose stack, wait until this prints nothing but the header before starting:

```bash
docker exec campuserrand-rabbitmq su-exec rabbitmq rabbitmqctl -q -p campus list_queues name messages | awk '$2>0'
```

## Workloads and thresholds

Thresholds come from `tests/k6/requirements.json` and apply to the
steady-state population only (`phase=steady`; warm-up, `auth` and `polling` requests are excluded). Every
operation also needs response correctness (`response_ok` rate > 99%) and `http_req_failed` < 1%; where the
issue has no error wording that 1% is a harness default and is labelled so in the report.

The latency limits were **raised by the author on 2026-11-09** so that the local load run passes. For the feed, the
wallet and the order lifecycle each limit is the highest p95 seen in three local load runs plus 50%, rounded up to
the next 100 ms.

Supplier search also runs at a **lowered load**: 20 virtual users and a second population of 30, where #29 and #33
state 50 and 100. At 50 and 100 back-to-back users the Supplier Service ran out of database connections and returned
HTTP 500 in three of four local runs (tracked in #253); at 20 and 30 it returned no errors (p95 4,318 ms and 6,186 ms). Its limits are
those measurements plus 50%. The dataset stays at 500 records. The figure the issue states is kept beside it (`requirementP95Ms`) and printed in every summary.
A PASS against a raised limit does not show that the issue's requirement is met.

| Script | Workload | Population | Limit |
|---|---|---|---|
| `discovery-load.js` (`WORKLOAD=discovery`) | order feed and query variants (status, page/limit, campusZone, search) | `order_feed` | p95 < 3200 ms at 100 VUs (raised; #74 states 1000 ms) |
| `discovery-load.js` (`WORKLOAD=supplier`) | supplier listing, search, filters, pagination over >= 500 run-owned active records | `supplier_search` | p95 <= 6500 ms at 20 VUs (raised and lowered load; #29 states 2000 ms at 50 VUs); <= 9300 ms at 30 VUs (#33 states 4000 ms at 100 VUs) above 20 VUs (#33) |
| `credit-balance-load.js` | wallet read of the VU's own account, compared with the fixture snapshot | `credit_wallet` | p95 <= 1900 ms at 100 VUs (raised; #43 states 500 ms), errors < 1% (#45) |
| `order-lifecycle-load.js` | requester/courier pair per VU: create -> poll OPEN -> accept -> pickup -> deliver -> complete | `order_create`, `order_accept`, `order_pickup`, `order_deliver`, `order_complete` | each p95 <= 4000 ms at 50 VUs (raised; #36 states 500 ms); `lifecycle_incomplete == 0` |

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

The manual GitHub Actions workflow `.github/workflows/performance.yml` runs the same wrapper and uploads the bundle even when the run fails. Its target allowlist has a known VU-argument bypass; see the [open PR #252 findings](../../docs/audits/documentation-drift.md#pr-252-findings-still-open) before using it with credentials.

## `order-claim-race.js`

Twenty concurrent claims with one courier token against a run-owned OPEN errand; expects one `200` and nineteen
`409`. It aborts on a failed login, a missing token or an errand that never becomes `OPEN`, and never picks an
errand from the shared feed. It does not implement C20 (twenty distinct couriers with a dispatch barrier and
persisted assertions); the broader C20 harness in issue #64 remains a design proposal at this baseline. Isolated stack only:

```bash
RACE_COURIER_EMAIL=... RACE_COURIER_PASSWORD=... RACE_REQUESTER_EMAIL=... RACE_REQUESTER_PASSWORD=... \
RACE_SUPPLIER_ID=<active supplier uuid> TARGET_HOST=http://127.0.0.1 k6 run tests/k6/order-claim-race.js
```
