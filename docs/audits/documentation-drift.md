<!--
AI Assistance Disclosure:
Tool: Codex (model: GPT-6), date: 2026-10-25
Scope: Source-linked implementation documentation and evidence review requested by Reallyeasy1.
Author review: <to be completed by Reallyeasy1>
-->

# Documentation drift and unresolved questions

Implementation baseline: [`52d791e`](https://github.com/AY2627S1-CS3219-P25/friend-on-campus/commit/52d791e4eea28ce7d817f025ef096f8d96bda467); inspected 2026-10-25 (SGT). Pending work is explicitly labelled.

This register records factual conflicts and pending questions. It does not resolve architecture or policy choices, rewrite Wiki pages, or treat an issue's existence as proof a defect still reproduces.

| ID | Sources / discrepancy | Treatment in this PR |
|---|---|---|
| D01 | PR #154 removed docs in favor of README/Wiki | Recreate approved implementation reference; retain Wiki decisions/history and README quick start |
| D02 | README mentions polling relays; runtime publishers removed | New docs identify three Debezium connectors; no production/README prose rewrite beyond navigation |
| D03 | README USER_TEST_DATABASE_URL versus test/CI ADMIN_GUARD_TEST_DATABASE_URL | New test guide names actual variable and random-schema behavior |
| D04 | Claude setup old nus-campus-errand repo, dev base, removed new-adr | Correct active guidance; preserve historical attribution |
| D05 | Backend agent obsolete User/Credit messaging paths and generic layout | Reference actual service modules |
| D06 | Frontend agent says Compose uses GATEWAY_URL; containers serve static NGINX | Correct agent orientation; retain host Vite distinction |
| D07 | Notification events TODO claims unfinished mapping/delivered absent | Document actual three mappings; source comment unchanged |
| D08 | User schema comment assigns expression indexes to init SQL; current init only provisions roles/databases | Treat migrations as constraint evidence; source comment unchanged |
| D09 | Root/CI Node22 versus backend Docker stages and frontend builds on Node20 | Record build/runtime distinction; no image/dependency changes |
| D10 | Module numbers differ across DTO/gateway/admin and root docs | Use service names; leave numbering decision to team |
| D11 | Wiki Order introduction says every transition emits an event, but rejected/unassign exceptions exist | Document exact baseline transition matrix |
| D12 | Wiki Roadmap #140 still open, omits #184; #164 title attribution incorrect | Inventory dated snapshots; GitHub current PR metadata controls current state |
| D13 | Order completion/cancel response copy claims transferred/refunded before Credit consumes | Document asynchronous boundary; PR #184 changes wording, remains unmerged |
| D14 | Supplier CORS_ORIGIN read but app uses cors() without it | Do not claim origin enforcement |
| D15 | Shared DTO DISPUTED exists without producing Order transition | Mark declared, not implemented workflow |
| D16 | Notification main bounded DB retry versus shared infrastructure class | Document actual classifier; PR184 changes it |
| D17 | AWS/Chat Wiki pages explicitly proposals; PR184 broader inbox/receipt scope | Record as pending intent; no inferred approval or D4 prioritization |
| D18 | PR184 plan still defers financial receipts, branch implements them | Separate pending-head audit |
| D19 | Reviewer checklist expects completed human review before author commit; requested draft precedes review | Preserve pending human fields and disclose incomplete human gate; do not fabricate approval |
| D20 | Configured plugins not proof installed/authenticated | Verify identities; state live runtime checks unavailable |
| D21 | Wiki Supplier run section uses removed dev:supplier; response summary claims data for deletion | Use current dev runner/workspace scripts and actual success/message delete response |
| D22 | Wiki Milestone-D3 says 1s ×5 retries and bounded database hiccups | Order/Credit defaults are 5000ms; recognized infrastructure failures have a distinct requeue path |
| D23 | Wiki Milestone-D3 says all order events produce a notification | Seven bindings, only three mapped alerts on main |
| D24 | D3 demo block uses undefined SUPPLIER and accepts immediately after 202 | Do not present as verified reproduction; supplier selection and PENDING→OPEN wait are necessary |
| D25 | Historical D2 index/evidence/screenshots contain different dated commits | Retain as historical multi-revision evidence, not one current verification run |

Wiki evidence for D21: [Supplier Service, running/responses](https://github.com/AY2627S1-CS3219-P25/friend-on-campus/wiki/Supplier-Service), compared with root package.json and supplierRoutes.ts. D22–D24: [Milestone D3](https://github.com/AY2627S1-CS3219-P25/friend-on-campus/wiki/Milestone-D3), compared with Order/Credit config and classifiers, Notification events.ts, and Order create route. D25: [Milestone D2](https://github.com/AY2627S1-CS3219-P25/friend-on-campus/wiki/Milestone-D2), [D2 Evidence](https://github.com/AY2627S1-CS3219-P25/friend-on-campus/wiki/D2-Evidence), and [D2 Screenshots](https://github.com/AY2627S1-CS3219-P25/friend-on-campus/wiki/D2-Screenshots). All Wiki observations use the snapshot in the source inventory. Historical --print, test:d2, unsupported /admin and volume-reset instructions are not current setup guidance.

The independent source review also found that browser UAT catches failed steps but does not set a failing exit code (`scripts/uat/uat-d2-ui.mjs`, step/results handling). Its JSON/log counts must be checked independently of CI status. Admin Supplier fetch failure can display static fallback records; see the frontend reference for its warning behavior.

## Outstanding human questions

Which pending Notification/Chat/AWS proposal is approved as intended design; required historical inbox reconciliation and deployment compatibility; existing database-choice rationale issues (#129); enabled-admin semantics; unresolved NFR evidence. No rationale or trade-off is authored here.

Source hierarchy: current code/configuration for implementation, verified human specifications for intended behavior, issue criteria, then established Wiki/README descriptions. Contradictions remain explicit rather than silently selecting a policy.

Operational bugs in PR #184 are in [its separate review](pr-184-review.md); they are not fixed or claimed closed by this documentation change.

## Source evidence and related reading

- [`README.md`](../../README.md)
- [`CLAUDE.md`](../../CLAUDE.md)
- [`services/notification-service/src/notifications/events.ts`](../../services/notification-service/src/notifications/events.ts)
- [`services/user-service/prisma/schema.prisma`](../../services/user-service/prisma/schema.prisma)
- [`services/order-service/src/orders/order.routes.ts`](../../services/order-service/src/orders/order.routes.ts)
- [`services/supplier-service/src/app.ts`](../../services/supplier-service/src/app.ts)
- [Wiki: Decisions and Open Questions](https://github.com/AY2627S1-CS3219-P25/friend-on-campus/wiki/Decisions-and-Open-Questions)
- [Documentation index](../README.md) · [Drift register](documentation-drift.md) · [Verification record](review-findings.md)
