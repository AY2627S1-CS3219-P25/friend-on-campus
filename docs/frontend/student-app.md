<!--
AI Assistance Disclosure:
Tool: Codex (model: GPT-6), date: 2026-11-09
Scope: Reconcile implementation guidance with current source, simplify duplication and preserve historical attribution.
Author review: <to be completed by the author>

Tool: Codex (model: GPT-6), date: 2026-10-25
Scope: Source-linked implementation documentation and evidence review requested by Reallyeasy1.
Author review: <to be completed by Reallyeasy1>
-->

# Student application

Implementation baseline: [`b989758`](https://github.com/AY2627S1-CS3219-P25/friend-on-campus/commit/b989758e766cb593c3b8c94102eb6dfb5c7d8491); source inspected 2026-11-09 (SGT). This describes the repository, not a verified live deployment.

The React/Vite app implements authentication, supplier discovery, errands, wallet/history, notifications and chat. `main.tsx` mounts `App`; screen selection and errand details use application state rather than a general route registry.

## Find the implementation

Paths below are relative to [`apps/student-app/src/`](../../apps/student-app/src).

| Area | Entry points and behavior |
|---|---|
| Session | `hooks/useAuthSession.ts`, `api/auth.ts`, `pages/AuthGatePage.tsx`: registration, login, refresh and logout |
| Browse and suppliers | `pages/FeedPage.tsx`, `pages/SpotsPage.tsx`, `orders/feedZones.ts`, `suppliers/`: search, availability and pickup selection |
| Posting | `pages/PostErrandPage.tsx`, `orders/useOrderSubmission.ts`: validated submission, AI-assisted draft and pending-result recovery |
| Maps | `map/`: live supplier coordinates, pickup/drop-off selection, route display and reward estimate |
| Errands | `pages/TasksPage.tsx`, `errand/`, `orders/reorder.ts`: lifecycle actions, details, disputes and reorder draft |
| Wallet and profile | `pages/ProfileWalletPage.tsx`, `api/credits.ts`, `api/users.ts`: balance/ledger and account controls |
| Inbox | `notifications/`, `pages/AlertsPage.tsx`: unread count, filtered/paginated inbox and notification navigation |
| Chat | `chat/`: per-errand conversation, connection state, translation and moderation feedback |

Backend authorization and persisted state remain authoritative. An enabled UI control does not establish that a transition or asynchronous credit operation completed.

## Session and request behavior

The access token stays in memory; refresh uses the HttpOnly cookie and shares an in-flight promise. Authenticated fetch retries once after a 401. Ordinary GET/HEAD calls without a caller-supplied signal also retry network/timeout/5xx failures, up to three attempts with jitter. The default per-attempt deadline is 10 seconds; callers such as order creation and inbox/history reads can supply their own signal. Session clearing aborts requests tied to that session.

Writes are not automatically replayed after a lost response. Lifecycle actions display an unconfirmed result and ask the user to inspect the errand. Registration followed by login is separate from asynchronous wallet creation; HTTP registration success is not a wallet-ready guarantee. See [User runtime](../services/user-service/runtime-and-testing.md) and [Order runtime](../services/order-service/runtime-and-testing.md).

## Posting and recovery

`useOrderSubmission` handles HTTP 202/PENDING, stores the receipt identifier in per-user `sessionStorage`, and polls order detail until it observes a resolved state or stops with unresolved feedback. Refresh can resume that receipt. An AI-assisted draft still passes through the form and normal submission validation; it does not create an errand itself.

Supplier map markers use live records with usable coordinates. Legacy records with missing coordinates remain in directory data but cannot supply a map marker. Reward estimates and route presentation are UI assistance; service validation and confirmed order/credit state determine the outcome.

## Inbox and chat recovery

The inbox fetches REST history independently of socket connection. It supports All, Action needed and Important views, server unread counts, load more, read and read-all. `NOTIFICATION` and `INBOX_CHANGED` frames trigger reconciliation; repeated notification IDs do not repeat the toast callback within the logged-in session. Refresh reloads every loaded page. Visible-page reconciliation starts at 30 seconds, backs off on failures, and also runs on reconnect/focus/online; failed refreshes retain rows with a stale indicator.

Chat connects at `/ws/chat/` and fetches history by errand. Messages merge by ID and sort by sequence; a contiguous cursor prevents a later live message from hiding a gap in history. Authentication/reconnection, focus and visible-page reconciliation recover missed persisted messages. Send waits for an echo/rejection; a timeout checks history before reporting an unconfirmed delivery. Matching history by sender/text/time is recovery behavior, not a server idempotency guarantee. Translation and moderation depend on the Chat service's configured capabilities.

These are client recovery mechanisms. They do not alone prove cross-replica delivery or end-to-end latency. The [Notification](../services/notification-service/README.md) and [Chat](../services/chat-service/README.md) guides describe server delivery boundaries.

## Run and test

Follow [local development](../development/local-development.md) and [gateway routing](../infrastructure/api-gateway.md) for host Vite versus container paths.

```sh
npm run dev -w @campus-errand/student-app
npm run typecheck -w @campus-errand/student-app
npm run test:unit -w @campus-errand/student-app
```

The [package script](../../apps/student-app/package.json) runs helpers for inbox, chat, details, assistant, request recovery, maps, estimates, reorder and feed zones. These are not full browser/rendering coverage. Browser UAT and realtime scenarios have separate prerequisites and limitations in the [testing guide](../development/testing-strategy.md); this source review does not establish a deployed-site pass.

## Source and related reading

- [App composition](../../apps/student-app/src/App.tsx) · [Session/request handling](../../apps/student-app/src/hooks/useAuthSession.ts)
- [Order submission](../../apps/student-app/src/orders/useOrderSubmission.ts) · [Map coordinates](../../apps/student-app/src/map/supplierLocations.ts)
- [Inbox hook](../../apps/student-app/src/notifications/useNotifications.ts) · [Chat hook](../../apps/student-app/src/chat/useChat.ts)
- [Documentation index](../README.md) · [Drift register](../audits/documentation-drift.md) · [Verification record](../audits/review-findings.md)
