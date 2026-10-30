<!--
AI Assistance Disclosure:
Tool: Claude Code (model: Claude Fable 5.1), date: 2026-10-25
Scope: Added the Chat (pending PR #148) coverage row; other rows unchanged and not reverified.
Author review: <to be completed by Reallyeasy1>

Tool: Codex (model: GPT-6), date: 2026-10-25
Scope: Source-linked implementation documentation and evidence review requested by Reallyeasy1.
Author review: <to be completed by Reallyeasy1>
-->

# Documentation coverage matrix

Implementation baseline: [`52d791e`](https://github.com/AY2627S1-CS3219-P25/friend-on-campus/commit/52d791e4eea28ce7d817f025ef096f8d96bda467); inspected 2026-10-25 (SGT). Pending work is explicitly labelled.

Coverage means implemented behavior is described with source links; it is not an assertion that every feature is correct or every test ran. The central index is the complete file inventory.

| Component | Documents | Covered evidence | Remaining limits |
|---|---|---|---|
| User | README, contracts/data, runtime/testing | All auth/user routes, sessions, migrations, administration, outbox, probes/tests | Offline revocation and admin semantics; live DB checks unavailable |
| Supplier | Same three | Public reads, admin CRUD, filters, uniqueness, seed, probes/tests | Mocked repository tests; runtime CORS/config discrepancy |
| Order | Same three | All routes, states, supplier lookup, reservation outcomes, concurrency/outbox, expiry/tests | No rejection/unassign event on main; financial copy mismatch |
| Credit | Same three | Read HTTP, ledger/escrow/grants, transactional processing, retry/idempotency, migrations/tests | No main receipt events; live DB/broker checks unavailable |
| Notification | Five files | Modules, all REST/socket/event paths, persistence, retries, structure review and tests | Process-local sockets, missing recovery coverage, bounded DB retry |
| Frontends | Student/admin guides | Page/module maps, auth, orders, notifications, admin probes and proxy modes | No main app unit suites; PR184 state races recorded separately |
| Shared packages | auth, common-dtos, messaging | Exports, runtime limits, event inventory and broker semantics | No package-local runtime suites |
| Infrastructure | Gateway, Docker/deployment, CDC/broker, CI | Routing, startup, persistence, connectors, matrix and review workflow | Local Compose documented; cloud proposals not deployed claims |
| Development | Local, testing, conventions, Claude workflow | Actual commands, #174 variables, evidence/disclosure workflow | Live Claude plugin/rule loading unverified |
| Audits | Source inventory, drift, review findings, PR184 review | Baselines, discrepancies, actual verification and pending-change separation | Human approval fields remain pending |
| Chat (pending PR #148 head `f39ab1f`; not on `main`) | README, D4 specification (proposal) | Module map, configuration/wiring, two migrations, test inventory, reconciliation of the seven review findings, remaining limitations, decision register, conditional D4 contracts and verification map | Policy decisions D1-D7 unapproved; no frontend unit harness or browser scenario; Order-authority, idempotency and bounds remain proposals |

## Maintenance

When a source change lands, update its service reference and shared catalogue together. When PR184 merges, revisit Notification, Credit receipts, Order v2 facts, frontend inbox and migration compatibility. Do not replace baseline facts with pending code before merge.

Inspect migrations as well as Prisma, route bodies as well as DTOs, and both producer/consumer implementations. Mark test results as executed, source-inspected, skipped or blocked. Link human decisions; do not author missing rationales to make coverage appear complete.

## Source evidence and related reading

- [`package.json`](../../package.json)
- [`CLAUDE.md`](../../CLAUDE.md)
- [Wiki: Home](https://github.com/AY2627S1-CS3219-P25/friend-on-campus/wiki/Home)
- [Documentation index](../README.md) · [Drift register](documentation-drift.md) · [Verification record](review-findings.md)
