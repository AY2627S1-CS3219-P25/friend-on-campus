<!--
AI Assistance Disclosure:
Tool: Codex (model: GPT-6), date: 2026-10-25
Scope: Source-linked implementation documentation and evidence review requested by Reallyeasy1.
Author review: <to be completed by Reallyeasy1>
-->

# Source inventory and provenance

Implementation baseline: [`52d791e`](https://github.com/AY2627S1-CS3219-P25/friend-on-campus/commit/52d791e4eea28ce7d817f025ef096f8d96bda467); inspected 2026-10-25 (SGT). Pending work is explicitly labelled.

Repository baseline: `52d791e4eea28ce7d817f025ef096f8d96bda467`. Wiki snapshot: `a463e3bd77dd0327414543dba62cd2feb9c9c2a9`. PR184 inspected head: `a5e1f5bc23e0d3fb06820519ead2377e87652f31`. Inspected 2026-10-25 SGT. Wiki and PRs have independent histories; dates and baseline labels below are essential.

## Repository evidence

Inspected all major application/service/shared-package directories, service schemas and migrations, root and nested instructions, .claude configuration, gateway, Docker/CDC/broker files, scripts, CI, tests and Postman artifacts. Per-document source lists identify concrete evidence. Generated clients, lockfile dependency bodies, images and historical logs are not treated as architectural specifications.

Source selection follows implemented code/configuration, then verified human specifications for intended behavior, issue criteria, established Wiki and README. D1/D2 Google documents linked in CLAUDE.md are upstream references; their current full text was not independently reread in this execution. Requirements are quoted only where available in inspected issues/Wiki/source; no new design approval is inferred.

## Wiki page inventory

Scope is derived from actual page headings. Established descriptions still require comparison with current source; historical runbooks/screenshots do not become current test results. All pages were inventoried; active implementation pages were cross-checked, and historical pages inspected as historical context.

| Page | Status | Scope / relationship |
|---|---|---|
| [Friend on Campus — AWS Design and D4 Delivery Plan](https://github.com/AY2627S1-CS3219-P25/friend-on-campus/wiki/AWS-Deployment-and-D4-Delivery-Plan) | proposal | Contents; 1. Decision: reduce deployment complexity and protect the submission; 2. Verified starting point and delivery obligations |
| [Architecture, as built](https://github.com/AY2627S1-CS3219-P25/friend-on-campus/wiki/Architecture) | established description | Components; Gateway routes (gateway/nginx.conf); Synchronous calls between services |
| [Authentication and roles](https://github.com/AY2627S1-CS3219-P25/friend-on-campus/wiki/Authentication-and-Roles) | established description | How a user is authenticated; Sessions; Roles |
| [Chat Service: design and reliability plan](https://github.com/AY2627S1-CS3219-P25/friend-on-campus/wiki/Chat-Service-Design-and-Reliability-Plan) | proposal | Reading guide; 1. Evidence and scope; 2. Current design |
| [Credit Service](https://github.com/AY2627S1-CS3219-P25/friend-on-campus/wiki/Credit-Service) | established description | How it works; Run; Configuration (src/config.ts) |
| [D2 Demo script](https://github.com/AY2627S1-CS3219-P25/friend-on-campus/wiki/D2-Demo-Script) | historical | 0. Set-up; 1. Authentication and RBAC (User Service); 2. Cross-service RBAC (Supplier Service verifies the User Service's token) |
| [D2 Design decisions](https://github.com/AY2627S1-CS3219-P25/friend-on-campus/wiki/D2-Design-Decisions) | historical | Records; Statements that differ from the code on main; The "why" answers |
| [D2 Diagrams](https://github.com/AY2627S1-CS3219-P25/friend-on-campus/wiki/D2-Diagrams) | historical | 1. Component diagram (D2 scope); 2. User Service schema (user_db); 3. Supplier Service schema (supplier_db) |
| [D2 Evidence](https://github.com/AY2627S1-CS3219-P25/friend-on-campus/wiki/D2-Evidence) | historical | Runs; Results per D2 acceptance check (D2 plan §5); Check IDs |
| [D2 Part 1 — User Service questions](https://github.com/AY2627S1-CS3219-P25/friend-on-campus/wiki/D2-Part-1-User-Service) | historical | 1. Role design; 2. Database choice and schema design; 3. Authentication and authorization |
| [D2 Part 2 — Supplier Service questions](https://github.com/AY2627S1-CS3219-P25/friend-on-campus/wiki/D2-Part-2-Supplier-Service) | historical | 1. Database choice and schema design; 2. Query patterns and API design; 3. CRUD operations in the backend |
| [D2 Presentation runbook](https://github.com/AY2627S1-CS3219-P25/friend-on-campus/wiki/D2-Presentation-Runbook) | historical | T-30 minutes: checklist; Running order; Facts to have ready for follow-up questions |
| [D2 Screenshots](https://github.com/AY2627S1-CS3219-P25/friend-on-campus/wiki/D2-Screenshots) | historical | Admin portal, desktop (1440 px); Admin portal, mobile (390 px); Student app, mobile (390 px) |
| [D3 Screenshots](https://github.com/AY2627S1-CS3219-P25/friend-on-campus/wiki/D3-Screenshots) | historical | Student app, order lifecycle (desktop, 1440 px); Student app, screens (desktop, 1440 px); Student app, mobile (390 px) |
| [Data model](https://github.com/AY2627S1-CS3219-P25/friend-on-campus/wiki/Data-Model) | established description | user_db; supplier_db; order_db |
| [Decisions and open questions](https://github.com/AY2627S1-CS3219-P25/friend-on-campus/wiki/Decisions-and-Open-Questions) | established description | Where decisions are recorded today; Records 0001–0004 (as last on main, commit 07efa01); Decisions merged on 2026-10-21 – 2026-10-22 (from the pull requests) |
| [Deployment and configuration](https://github.com/AY2627S1-CS3219-P25/friend-on-campus/wiki/Deployment-and-Configuration) | established description | Containers; Gateway routes (gateway/nginx.conf); Environment variables |
| [Frontend apps](https://github.com/AY2627S1-CS3219-P25/friend-on-campus/wiki/Frontend-Apps) | established description | How the apps reach the API; Student app (apps/student-app, :5173); How the apps talk to the backend |
| [Getting started](https://github.com/AY2627S1-CS3219-P25/friend-on-campus/wiki/Getting-Started) | established description | Prerequisites; Run the whole stack; Where things are |
| [Friend of Campus (FoC)](https://github.com/AY2627S1-CS3219-P25/friend-on-campus/wiki/Home) | navigation | Pages; Where the detail lives |
| [Milestone D2](https://github.com/AY2627S1-CS3219-P25/friend-on-campus/wiki/Milestone-D2) | historical | Where the project stands; Deliverables; What the D2 instructions ask, in one table |
| [Milestone D3](https://github.com/AY2627S1-CS3219-P25/friend-on-campus/wiki/Milestone-D3) | historical | 1. What is built; 2. Demo script (about 10 minutes); 3. Consistency trade-offs |
| [Order, Credit and Notification Services (historical)](https://github.com/AY2627S1-CS3219-P25/friend-on-campus/wiki/Mock-Services) | historical | Order, Credit and Notification Services (historical) |
| [Notification Service](https://github.com/AY2627S1-CS3219-P25/friend-on-campus/wiki/Notification-Service) | established description | How it works; Run; Configuration (src/config.ts) |
| [Order Service](https://github.com/AY2627S1-CS3219-P25/friend-on-campus/wiki/Order-Service) | established description | How it works; Run; Configuration (src/config.ts) |
| [Roadmap and status](https://github.com/AY2627S1-CS3219-P25/friend-on-campus/wiki/Roadmap) | navigation | Milestones; Pull requests; Work tracked in issues |
| [Services](https://github.com/AY2627S1-CS3219-P25/friend-on-campus/wiki/Services) | established description | Error shape |
| [Supplier Service](https://github.com/AY2627S1-CS3219-P25/friend-on-campus/wiki/Supplier-Service) | established description | How it works; Run; Configuration (src/config.ts) |
| [Team conventions](https://github.com/AY2627S1-CS3219-P25/friend-on-campus/wiki/Team-Conventions) | established description | AI usage (CLAUDE.md §1, course rules); Bookkeeping on every AI-assisted prompt (CLAUDE.md §2); Branches |
| [Testing and evidence](https://github.com/AY2627S1-CS3219-P25/friend-on-campus/wiki/Testing-and-Evidence) | established description | Root commands; Unit tests; Integration, messaging, migration and seed suites |
| [User Service](https://github.com/AY2627S1-CS3219-P25/friend-on-campus/wiki/User-Service) | established description | How it works; Run; Configuration (src/config.ts) |
| [_Sidebar](https://github.com/AY2627S1-CS3219-P25/friend-on-campus/wiki/_Sidebar) | navigation | _Sidebar |

## GitHub issue/PR inventory

| Source | Relationship |
|---|---|
| [#174](https://github.com/AY2627S1-CS3219-P25/friend-on-campus/issues/174) | UAT driver configuration documentation; addressed by testing guide and README navigation |
| [#179](https://github.com/AY2627S1-CS3219-P25/friend-on-campus/issues/179), [#180](https://github.com/AY2627S1-CS3219-P25/friend-on-campus/issues/180), [#181](https://github.com/AY2627S1-CS3219-P25/friend-on-campus/issues/181), [#182](https://github.com/AY2627S1-CS3219-P25/friend-on-campus/issues/182) | D4 Notification proposals/criteria; not implementation completed by this PR |
| [#52](https://github.com/AY2627S1-CS3219-P25/friend-on-campus/issues/52) | Existing F5 requester notification criteria |
| [#134](https://github.com/AY2627S1-CS3219-P25/friend-on-campus/issues/134) | DLQ operations gap |
| [#129](https://github.com/AY2627S1-CS3219-P25/friend-on-campus/issues/129) | Human-authored database rationale gap |
| [#154](https://github.com/AY2627S1-CS3219-P25/friend-on-campus/pull/154) | Previous docs consolidation and deletion |
| [#184](https://github.com/AY2627S1-CS3219-P25/friend-on-campus/pull/184) | Pending Notification/Order/Credit/frontend changes; separate review |
| [#148](https://github.com/AY2627S1-CS3219-P25/friend-on-campus/pull/148) | Pending Chat work; not current five-service implementation |

Official Claude references and verified plugin IDs are recorded in [Claude workflow](../development/claude-code-workflow.md). Missing live runtime, DB/broker/browser and human-review evidence is recorded in [review findings](review-findings.md). No Wiki, issue or existing PR was modified.

## Source evidence and related reading

- [`CLAUDE.md`](../../CLAUDE.md)
- [`README.md`](../../README.md)
- [`.github/pull_request_template.md`](../../.github/pull_request_template.md)
- [Wiki: Home](https://github.com/AY2627S1-CS3219-P25/friend-on-campus/wiki/Home)
- [Documentation index](../README.md) · [Drift register](documentation-drift.md) · [Verification record](review-findings.md)
