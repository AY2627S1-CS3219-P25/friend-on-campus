<!--
AI Assistance Disclosure:
Tool: Codex (model: GPT-6), date: 2026-11-09
Scope: Reconcile the active documentation with main b989758 and simplify navigation; preserve historical attribution.
Author review: <to be completed by Reallyeasy1>

Tool: Claude Code (model: Claude Fable 5.1), date: 2026-10-25
Scope: Added drift rows D26-D30 (Chat PR #148 head f39ab1f versus main 9a36146, issue #56 and the wiki Chat proposal) and a pointer to the Chat decision register; earlier rows unchanged.
Author review: <to be completed by Reallyeasy1>

Tool: Codex (model: GPT-6), date: 2026-10-25
Scope: Source-linked implementation documentation and evidence review requested by Reallyeasy1.
Author review: <to be completed by Reallyeasy1>
-->

# Documentation drift and unresolved questions

Implementation inspected at [`b989758`](https://github.com/AY2627S1-CS3219-P25/friend-on-campus/commit/b989758e766cb593c3b8c94102eb6dfb5c7d8491) on 9 November 2026 (SGT). This is a code/configuration reference, not verification of the live deployment.

Wiki inspected read-only at `0571db5d4ad8c89679131c8707aae105402c7618`. This register separates stale documentation from unresolved implementation or policy questions. The [25 October register](../archive/audits/2026-10-25-documentation-drift.md) retains its original D01–D30 findings; archiving it does not declare every item fixed.

## Corrections made in the active documentation

| Earlier claim | Verified current fact | Evidence |
|---|---|---|
| Five backend services; Chat pending | Six backends/six logical databases; Chat is on main | [System map](../architecture/system-overview.md), [PR #148](https://github.com/AY2627S1-CS3219-P25/friend-on-campus/pull/148) |
| PR #184 remains pending; only three requester alerts | Recipient-aware inbox, nine Order and two Credit event bindings, committed financial receipts | [Notification implementation](../services/notification-service/implementation.md), [PR #184](https://github.com/AY2627S1-CS3219-P25/friend-on-campus/pull/184) |
| Reject/unassign emits no event | Versioned `order.rejected` and `order.unassigned` facts exist | [Order contracts](../services/order-service/contracts-and-data.md) |
| Chat/Notification delivery is process-local only | SQL realtime outboxes and RabbitMQ per-replica fanout are implemented; recovery still needs persisted history | [Messaging](../packages/messaging.md), [PR #246](https://github.com/AY2627S1-CS3219-P25/friend-on-campus/pull/246) |
| K3s/Traefik deployment and HPA are current | Current Terraform targets ECS with a fixed three-host ceiling and service task autoscaling | [Cloud overview](../new-cloud-architecture-guide.md) |
| Browser UAT can finish successfully after failed assertions | Current driver sets a failing exit code when checks fail | [Testing guide](../development/testing-strategy.md), [driver](../../scripts/uat/uat-d2-ui.mjs) |
| k6 is an unimplemented plan / PASS proves original limits | Harness and manual workflow exist, but several latency thresholds and supplier populations were relaxed | [k6 runbook](../../tests/k6/README.md), [requirements configuration](../../tests/k6/requirements.json) |

## Open implementation and requirement boundaries

| Topic | Evidence at this baseline | Treatment |
|---|---|---|
| Chat membership and administrator reads | Local participant projection does not consume `order.unassigned`; admins may read. [Issue #56](https://github.com/AY2627S1-CS3219-P25/friend-on-campus/issues/56) restricts access to current participants despite being closed | [Chat guide](../services/chat-service/README.md) documents implementation separately from the [historical D4 proposal](../archive/services/chat-service/d4-implementation-specification.md); policy/fixes remain human work |
| Chat SEND idempotency | `clientId` correlates responses, but is not a persistent uniqueness key | Do not claim retries cannot create duplicate messages |
| Business and realtime dead letters | Business DLQs exist; no general automated inspection/replay/operational-alert loop. Realtime bounded signals have no DLQ | [Messaging boundaries](../packages/messaging.md); [#134](https://github.com/AY2627S1-CS3219-P25/friend-on-campus/issues/134) remains open, but its old retry/outbox description is itself dated |
| Order recovery | Expiry selects OPEN orders; there is no general PENDING watchdog. Credit effects are asynchronous | [Order runtime](../services/order-service/runtime-and-testing.md); do not promise automatic recovery of every interrupted Saga |
| Performance acceptance | [#236](https://github.com/AY2627S1-CS3219-P25/friend-on-campus/issues/236) remains open; #237 closed on harness merge. Supplier work at original 50/100 VUs is tracked by [#253](https://github.com/AY2627S1-CS3219-P25/friend-on-campus/issues/253) | Retain original and enforced limits separately; local runs do not establish cloud capacity |
| Broader concurrency/recovery harness | The C20/W100 Node harness described in issue #64/wiki is proposed; the repository has narrower race/realtime tests and k6 reconciliation | [Testing guide](../development/testing-strategy.md) and [k6 runbook](../../tests/k6/README.md) distinguish implemented checks from the proposal |
| Monitoring and cloud evidence | awslogs and scaling policy configuration exist; a complete dashboard/alert/tracing stack is not checked in | Document configuration, not live availability, delivered alerts, observed scaling or restore success |
| Claude setup instructions | [`.claude/README.md`](../../.claude/README.md) still describes five generated clients and says Git writes are denied; checked-in [settings](../../.claude/settings.json) allow Git commands | [Current workflow guide](../development/claude-code-workflow.md) distinguishes tool permissions from human-approval policy. The external setup text was not rewritten |

### PR #252 findings still open

The [published review](https://github.com/AY2627S1-CS3219-P25/friend-on-campus/pull/252#pullrequestreview-5825829477) has four unresolved P2 threads; merging did not fix them:

| Finding | Current location | Consequence |
|---|---|---|
| Unquoted VU flags can override the allowlisted target | [performance workflow](../../.github/workflows/performance.yml) | An injected target can receive the configured administrator login |
| Fixture workers outlive fail-fast cleanup | [gateway helper](../../scripts/perf/lib/gateway.mjs) | Successful outstanding requests can leave records after cleanup |
| Cleanup deletes owners of skipped PENDING orders | [fixtures](../../scripts/perf/lib/fixtures.mjs) | Recovery by run tag can no longer find those orders |
| Empty pages pass discovery correctness checks | [discovery workload](../../tests/k6/discovery-load.js) | Empty results with expected totals can falsely count as correct |

These are existing findings, not code fixes or newly executed load evidence in this documentation task.

## Wiki corrections needed (not published)

| Wiki page(s) | Required reconciliation |
|---|---|
| [Home](https://github.com/AY2627S1-CS3219-P25/friend-on-campus/wiki/Home), [_Sidebar](https://github.com/AY2627S1-CS3219-P25/friend-on-campus/wiki/_Sidebar), [Services](https://github.com/AY2627S1-CS3219-P25/friend-on-campus/wiki/Services), [Data Model](https://github.com/AY2627S1-CS3219-P25/friend-on-campus/wiki/Data-Model) | Update service/schema coverage and current navigation; distinguish old milestone snapshots |
| [Notification](https://github.com/AY2627S1-CS3219-P25/friend-on-campus/wiki/Notification-Service) | Replace seven-binding/three-alert descriptions with the current eleven bindings, recipient rules and retry/infra classification |
| [Frontend apps](https://github.com/AY2627S1-CS3219-P25/friend-on-campus/wiki/Frontend-Apps), [Authentication](https://github.com/AY2627S1-CS3219-P25/friend-on-campus/wiki/Authentication-and-Roles) | Reconcile server-backed unread state, Chat/maps/assistant/disputes, six-service scope and current security boundaries |
| [Chat plan](https://github.com/AY2627S1-CS3219-P25/friend-on-campus/wiki/Chat-Service-Design-and-Reliability-Plan) | Keep proposed policies distinct; link merged implementation and current residual limitations |
| [Order](https://github.com/AY2627S1-CS3219-P25/friend-on-campus/wiki/Order-Service), [Credit](https://github.com/AY2627S1-CS3219-P25/friend-on-campus/wiki/Credit-Service) | Reconcile reject/unassign events, disputes/assistant fields and Credit settlement/refund receipts |
| [RabbitMQ realtime](https://github.com/AY2627S1-CS3219-P25/friend-on-campus/wiki/RabbitMQ-Cross%E2%80%90Replica-Chat-and-Notification-Delivery) | Change branch-only implementation status to merged PR #246 while retaining dated test evidence |
| [AWS plan](https://github.com/AY2627S1-CS3219-P25/friend-on-campus/wiki/AWS-Deployment-and-D4-Delivery-Plan), [deployment](https://github.com/AY2627S1-CS3219-P25/friend-on-campus/wiki/Deployment-and-Configuration), [monitoring design](https://github.com/AY2627S1-CS3219-P25/friend-on-campus/wiki/Centralised-Logging-Health-Monitoring-and-Alerts-Design), [async recovery design](https://github.com/AY2627S1-CS3219-P25/friend-on-campus/wiki/Failed-Asynchronous-Message-Recovery-Design) | Separate historical EC2/K3s plans from configured ECS; do not relabel proposed observability/recovery work as implemented |
| [System testing design](https://github.com/AY2627S1-CS3219-P25/friend-on-campus/wiki/Automated-System-Testing-and-Evidence-Design) | Retain the November 9 k6 update, but rewrite active K3s/Traefik/HPA passages or move them to historical material |
| [Supplier](https://github.com/AY2627S1-CS3219-P25/friend-on-campus/wiki/Supplier-Service), [Getting Started](https://github.com/AY2627S1-CS3219-P25/friend-on-campus/wiki/Getting-Started), [Testing](https://github.com/AY2627S1-CS3219-P25/friend-on-campus/wiki/Testing-and-Evidence) | Recheck current commands, six-service startup and test categories; `dev:supplier` is not a current package script. Supplier writes require coordinates; existing coordinates are not overwritten by normal seeding, and image defaults do not run migrations/seeds |

No approval, issue closure, deployment or historical test result is inferred from this cleanup. See [source inventory](source-inventory.md) and [verification](review-findings.md).
