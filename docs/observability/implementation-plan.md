<!--
AI Assistance Disclosure:
Tool: Codex (model: GPT-6), date: 2026-11-09
Scope: Record authorized self-hosted observability scope, integration steps, verification and continuation instructions.
Author review: <to be completed by yanhwee>
-->

# Self hosted observability implementation plan

## Authorization and working state

The author requested the open-source stack (OpenTelemetry SDK and Collector, Prometheus, Loki, Tempo and Grafana), full application/infrastructure/workflow coverage, an isolated worktree and durable continuation documentation. Optional trace context metadata in stored event payloads was explicitly approved on 9 November 2026. The author also approved preparing one shared persistent backend stack and one collection agent per existing ECS host, without deploying. Existing business fields and transactional semantics must remain unchanged. On 9 November 2026 the author additionally authorized committing the completed worktree and pushing `codex/self-hosted-observability` to `origin`. No cloud deployment or PR creation was requested.

Worktree: `/Users/yanhwee/Downloads/CS3219 Student Project/friend-on-campus-observability`.
Branch: `codex/self-hosted-observability`, based on `bdc1d19`.
Original checkout has unrelated uncommitted AI usage-log entries; do not copy or overwrite them.

Read `AGENTS.md` and `CLAUDE.md` before continuing. Record each prompt in this worktree's `ai/usage-log.md` as the last written file. Existing course rules reserve additional architectural decisions to the author. The already selected tools and optional event metadata are authorized; do not infer authorization for cloud changes beyond the approved existing-three-host layout or for business schema changes.

## Coverage and verification checklist

- [x] Shared Node telemetry package: opt-in SDK startup before library imports, OTLP traces/metrics/logs, bounded buffering/export and shutdown. Never make business requests depend on backend availability.
- [x] Six services: HTTP method/route/status/duration, errors, process metrics, safe structured logs; ignore probes in request metrics.
- [x] HTTP client instrumentation including fetch/undici. Database instrumentation must work with actual Prisma 6 generated clients; do not claim pg instrumentation observes Prisma's native engine.
- [x] Event metadata: inject W3C trace context when serializing outbox payloads, persist it within existing transaction, extract it in shared rabbitmq-client consumer; retain eventId and correlationId. Older messages without context still process normally.
- [x] Shared RabbitMQ consumer instrumentation: processing spans, duration/outcome counters, retry/DLQ outcomes and event correlation; publisher context where directly used. Library is rabbitmq-client, not amqplib; amqplib auto-instrumentation is insufficient.
- [x] RabbitMQ: enable native prometheus plugin without removing management plugin, scrape node and per-queue metrics, view ready/unacked/retries/DLQ/consumers and resource alarms.
- [x] Debezium: Java-agent JMX exporter for all three Server 2.7 instances, checksum-verified pinned artifact, streaming/snapshot/connectivity/lag metrics; verify on actual container, not merely docs for Kafka Connect.
- [x] PostgreSQL exporter: connections/transactions/locks, replication-slot retained WAL and database availability. Use a dedicated monitoring role; no production admin credential in committed config.
- [x] Gateway: request status/latency access logs plus readiness probes. Basic nginx stub_status does not provide per-route error/latency metrics; use access records or external probes honestly.
- [x] Host/container resources: CPU/memory/disk/restarts with a Linux-compatible collector. Document Docker Desktop VM limitations. Never assume Docker socket read-only mount makes Docker API read-only.
- [x] Frontends: browser errors and failed requests, WebSocket failures/reconnects and active sockets, no tokens, cookies, bodies, user messages or sensitive query strings. No automatic session replay.
- [x] Business workflow: bounded-label metrics for order/credit outcomes and pending age; account for asynchronous completion and retries; outbox status is NOT delivery state because CDC does not update it.
- [x] Prometheus/Loki/Tempo persistence and explicit retention; resource caps; dashboard provisioning and useful failure alerts. Distinguish alert evaluation from external notification routing (no channel destination supplied).
- [x] Monitor the monitor: scrape/export failures, target availability, collector drops and storage limits.
- [x] Local overlay with no changes to default startup behavior; loopback-only UI ports, internal ingest/exporter ports, isolated test project/volumes; no destructive reset of existing stack.
- [x] Cloud integration: ECS bridge/dynamic host-port discovery, per-host log/resource collection, ARM64 images, persistent storage and three-host/S$250 constraints. The approved topology is implemented behind a disabled-by-default flag. Cloud execution remains unrequested; capacity, live IAM/networking, host replacement and costs require verification before a rollout.

## Implementation sequence

1. Establish this handoff document before code and keep it current with exact files and check results.
2. Implement isolated backend containers/configuration, export all three signals, provision data sources and baseline dashboards.
3. Add shared opt-in SDK and service wiring; update lockfile AND all six Dockerfiles for workspace runtime/build dependencies. Preserve compiled Node startup and host tsx development. ESM/CJS startup order must be verified.
4. Add optional outbox metadata and manual rabbitmq-client instrumentation; verify existing consumers tolerate extra fields, no secrets in trace attributes, and retries stay idempotent. Add cross-boundary test proving trace continuity after serialized round-trip.
5. Add native infrastructure metrics/log pipelines and externally visible probes; check exporter output against the pinned service versions.
6. Add browser/WebSocket/workflow coverage and alerts with cardinality controls.
7. Verify in an isolated Docker project; run root typecheck, lint and relevant existing unit/integration/messaging tests. Test a compiled container, not only tsx. Keep a smoke driver that submits telemetry and queries all backends.
8. Document commands, data flow, dashboards, alert meanings, resource/retention settings, failure exercises, recovery and ECS gaps. Update this checklist with implementation status and actual evidence.

## Important integration difficulties

- Adding containers alone does not capture existing stdout logs: a receiver/agent must read them or applications must explicitly export logs.
- SDK initialization must precede Express/HTTP/undici imports; tests should remain quiet and fast when telemetry is disabled.
- Prisma queries use its engine, not necessarily Node pg; verify database spans and use explicit instrumentation when needed.
- CDC routing may not forward Kafka-style headers to RabbitMQ; optional context inside event JSON survives the existing bare JSON route. Debezium's own internal spans are a separate integration and must not be fabricated.
- Tracing is sampled; workflow metrics must count all operations independently. Do not use order/user/event/trace IDs as Prometheus labels.
- Each event delivery gets a processing span; an acknowledgement means handler processing succeeded, not completion of every downstream workflow.
- RabbitMQ queue metric configuration and alert expressions must match actual metric names; aggregated default metrics cannot identify a specific dead-letter queue.
- Monitor PostgreSQL replication-slot retained bytes separately from Debezium event timestamp lag; idle traffic and clock skew affect lag interpretation.
- ECS bridge networks do not provide Compose service DNS or access to other hosts' container ports. Do not ship a local config as cloud-ready.
- Self-hosted monitoring data needs explicit persistence and bounded retention. Local volumes do not prove recovery after EC2 replacement.

## Continuation instructions

Read this document and `runbook.md` if present. Inspect `git status --short` and the latest usage-log entry. Do not recreate the worktree or redo passing checks without changes. Use checked-in commands rather than assuming the original checkout's node_modules or .env exists here; never read/print .env. Continue unchecked items only within author approvals. Report partial/blocked coverage accurately. No commit/push/deploy without explicit instruction.

## Verification evidence

Verified on 9 November 2026:

- `npm run typecheck`, `npm run lint`, `npm run ci:validate-tests`: passed; static matrix reports 20 workspace suites and 4 system commands.
- `npm test`: passed all unit, integration, messaging, migration, seed, acceptance, API E2E and Chromium UI suites on the final patched dependencies. Its own Compose project/volumes were removed. Detailed log in `/tmp/foc-observability-node22-regression.log` for this host/session.
- `npm run observability:verify -- --browser`: passed from fresh volumes with current SDK 0.301 / 3.1 in production Node 22.23.4 images, all three SDK signals, actual CDC order saga trace, 16 scrape targets, PostgreSQL workflow metrics, three connected Debezium connectors and browser error ingestion. Trace `dde1941c3eecb8e3bc61961ad7287616`; report `test-results/observability/latest.json` (ignored). Disposable project/volumes removed. Detailed log in `/tmp/foc-observability-node22-verify.log`.
- Controlled Credit consumer failure exercise: detected failed readiness, broker backlog and pending workflow; restarting the consumer recovered the order to OPEN and drained the queue. The retained disposable project was subsequently removed.
- Infrastructure logs confirmed in Loki for RabbitMQ, Debezium and gateway; actual container/nginx/PostgreSQL metrics confirmed in Prometheus.
- Prometheus alert-rule tests: passed three healthy/failure fixtures; all 12 rules parse correctly.
- `npm run observability:validate-cloud`: passed all three bundle-render modes, cloud Collector and Prometheus configuration validation and simulated ECS bridge-port discovery with fake AWS responses. No AWS calls.
- Terraform `fmt -check` / `validate`: passed without a plan/apply. Cloud bootstrap modes separately rendered and shell-checked: disabled 2456 bytes, enabled 3568 bytes, both below the 16 KiB EC2 user-data limit. The storage-ready attribute is valid JSON and appears only in the enabled mode.
- `npm audit --omit=dev`: zero known production dependency advisories after maintenance SDK and compatible existing Express/body-parser/qs patches.
- Full root production build and all six backend / both frontend Docker builds passed as part of the suites. CI workflow/overlay YAML parsed successfully. Remote CI has not been triggered.

Docker Server 29.9.2; host Node 26.8.1; the six backend Docker runtimes now use Node 22.23.4 after the explicit follow-up approval. Public tool images are pinned to verified manifest digests. JMX agent 1.0.1 is fetched by `observability:prepare`, checksum-verified, ignored by Git and included in the cloud bundle only at build time.

## Primary references

- https://opentelemetry.io/docs/languages/js/getting-started/nodejs/
- https://opentelemetry.io/docs/collector/
- https://www.rabbitmq.com/docs/prometheus
- https://debezium.io/documentation/reference/2.7/connectors/postgresql.html#postgresql-monitoring
- https://prometheus.github.io/jmx_exporter/deployment/java-agent/
- https://grafana.com/docs/loki/latest/send-data/otel/


## Approved Node 22 and current SDK migration

After the initial implementation, the author explicitly approved upgrading all six backend Dockerfiles to Node 22 and using the current patched SDK. The backend build, production-dependency and runtime stages now pin Node 22.23.4 on Alpine 3.23 by manifest digest `2cfe8c19bd3df0192ad5dfd2e13e86567743ffa1eb614e750a706891f19606af`. The project and telemetry package require Node >=22.15.0 for host development. Frontend build images and the independent cloud configuration bundle are outside this six-backend runtime update.

Telemetry now uses SDK 0.301 / 3.1, API 1.10 and current instrumentation packages. Logging comes from the stable API; the legacy api-logs and sdk-trace-node/sdk-trace-base packages are removed. Tests use the unified sdk-trace package and an isolated NodeSDK. Unit tests disable asynchronous host resource detection so trace assertions do not race resource discovery. The metric-reader configuration uses the current plural API. No event contracts, deployment topology, sampling policy or business behavior changes are needed for this migration.

The Node 22 full-stack check passed, including all three signals, real CDC saga context, database/connector metrics and browser ingestion. Direct offline checks confirmed Node 22.23.4 and SDK 0.301.0 inside all six backend images. The complete root regression suite passed on the updated implementation: unit, integration, messaging, migration, seed, acceptance, API E2E and Chromium UI checks. Root typecheck, lint and static matrix validation passed; the production dependency audit remains at zero known advisories. Disposable verification and regression projects were cleaned up. The runtime approval did not authorize deployment. Branch publication was subsequently authorized separately; no cloud deployment is requested.

## Files to read first in a continuation

1. `docs/observability/runbook.md`: startup, signal semantics, limits, failure exercises and AWS preparation steps.
2. `compose.observability.yml` and `docker/observability/`: backend images, metrics/log pipelines, alert rules, dashboards and exporter configuration.
3. `packages/observability/src/bootstrap.ts` and `index.ts`: compatible SDK bootstrap and shared instrumentation.
4. `packages/messaging/src/index.ts` and the three outbox serialization sites: manual rabbitmq-client instrumentation and context persistence.
5. `packages/browser-observability/src/index.ts`: opt-in generic browser diagnostics.
6. `infra/terraform/ecs/observability.tf`, `host-bootstrap.sh.tftpl` and `docker/observability/cloud/`: prepared persistent backend, daemon agents, storage-ready placement and target discovery.
7. `scripts/observability/`: checksum preparation, synthetic SDK smoke, fresh full-stack verification, controlled failure exercise and cloud fixture validation.
8. `.github/workflows/ci.yml`: telemetry unit suite, self-hosted integration/configuration job and required gate. `.github/workflows/deploy-ecs.yml` exposes the optional browser build flag.

## Remaining operational work outside this implementation

- [ ] Author reviews the implementation and course disclosures. Committing/pushing the observability branch is authorized; PR creation and deployment remain unrequested.
- [ ] Publish an ARM64 configuration bundle and application images only when explicitly requested.
- [ ] Add the monitoring password to the existing AWS runtime secret without rotating other values, provision its role with the `monitoring` setup command, and review an actual Terraform plan.
- [ ] Provision/mount the monitoring disk on slot 1 and verify its storage-ready ECS attribute and host-network task-role support before scheduling the backend.
- [ ] Verify capacity, costs, all replica targets, real IAM/networking and persistent telemetry recovery in AWS. No cloud rollout was performed in this session.
- [ ] Select a notification destination if external alerts are desired. Alert evaluation/dashboard visibility is implemented; no external messages or test alerts were sent.

Historical `/tmp` logs and ignored test reports are local evidence, not prerequisites for running the checked-in verification commands. Re-run a meaningful check when changing code/configuration; do not claim the unexecuted cloud rollout is verified.
