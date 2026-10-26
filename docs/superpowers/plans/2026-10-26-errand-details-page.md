<!--
AI Assistance Disclosure:
Tool: Claude Code (model: Claude Fable 5.1), date: 2026-10-26
Scope: Implementation plan for the errand details page (issues #188 and #189) from the design the author approved in
conversation on 2026-10-26. The design decisions recorded here are the author's; the file layout and names are the
plan's calls, listed under "Calls made by the plan".
Author review: <to be completed by Reallyeasy1>
-->

# Errand Details Page Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. **Repo rule:** no step commits; every task leaves its changes in the working tree for the author to review and commit (CLAUDE.md §1).

**Goal:** One full page per errand in the student app, opened from any Feed or Tasks card and from Alerts, that shows the Grab-style order view and owns every status action, with the cards reduced to summaries.

**Architecture:** A view state in `App.tsx` (the existing `focusOrderId` / `focusOrder` pair, fetched live via `fetchOrderById`) renders `ErrandDetailsPage` in place of the active tab's page; the URL is the existing deep link `/?tab=<tab>&orderId=<id>` pushed with `history.pushState`, and `popstate` restores the tab. Derived values (tracker, end state, escrow state, countdown, viewer role) are pure functions in `src/errand/details.ts` so they can be unit-tested with `node --test`; the page component itself is verified by typecheck, lint and the browser UAT.

**Tech Stack:** React 18, TypeScript, Vite, Tailwind, lucide-react (all already in `apps/student-app`). No new dependency, no router, no backend change.

**Spec:** GitHub issues #188 (page, DP1.1–DP1.8) and #189 (actions, DP2.1–DP2.6) in `AY2627S1-CS3219-P25/friend-on-campus`; the design conversation of 2026-10-26 (author's decisions: Grab-style content list, page owns all actions including Accept from the Feed, option 1 = contact notes and no names).

## Global Constraints

- No new dependency without asking (CLAUDE.md §3); no router.
- Every edited file carries the consolidated AI disclosure block and `// AI-generated (edited by Reallyeasy1)` markers; JSON files are listed in the usage log instead.
- Student-app unit tests are pure `node --test` via `tsx` over `test/*.test.ts` (no DOM, no React renderer); new test files are added to `test:unit` in `apps/student-app/package.json` and `npm run ci:validate-tests` must pass.
- Copy for credit states must not claim a transfer happened: "paid once Credit Service settles the escrow", "returned by Credit Service" (existing TasksPage wording).
- Phone width: 16px gutters, no horizontal scroll (existing `student-main` layout).
- The Order Service decides which action is legal; the UI only decides what to show, and surfaces the service's 400 / 403 / 409 text.
- Branch: `feature/errand-details-page` from `feature/chat-service` HEAD (the page embeds `ChatPanel`, which only exists there), in a separate git worktree so the author's uncommitted PR #148 fixes stay untouched.

## Review Focus

1. A former courier (unassigned, then the errand re-accepted by someone else) opens an old link: `fetchOrderById` answers 403 → the page must show "no longer available", never a stale action. Test: `viewerRole` returns `'other'` for a user who is neither requester nor courier (Task 1); page renders the 403 message (Task 2, manual check).
2. `expiresAt` already in the past while the status is still `OPEN` (sweeper lag): the countdown must show `Expired` / 0:00, not a negative number. Test in Task 1 (`formatCountdown` clamps at zero).
3. Terminal order with partial timestamps (cancelled after pickup: `pickedUpAt` set, `deliveredAt` null): tracker shows Posted, Accepted, Picked up done and the red end state; nothing marked current. Test in Task 1.
4. Browser Back after opening the page from a notification (no page was pushed by a card click): the app must not leave the user on a blank state. Task 3 handles `popstate` by re-reading the URL; manual check.
5. An action answered 409 (stale version): the page shows the message and a Reload control that refetches; the stale `orders` list is replaced on the next poll. Task 4, manual check with two sessions.

---

### Task 1: Pure helpers for the page

**Files:**
- Create: `apps/student-app/src/errand/details.ts`
- Test: `apps/student-app/test/errand-details.test.ts`
- Modify: `apps/student-app/package.json` (`test:unit` adds the file)

**Interfaces:**
- Produces:
  - `type TrackerStep = { key: 'posted' | 'accepted' | 'picked_up' | 'delivered' | 'completed'; label: string; at: string | null; state: 'done' | 'current' | 'todo' }`
  - `trackerSteps(order: Pick<OrderDTO, 'status' | 'createdAt' | 'acceptedAt' | 'pickedUpAt' | 'deliveredAt' | 'completedAt'>): TrackerStep[]` — five steps in order; `done` when the step's timestamp is set or the status is at/after it; `current` for the next step while the status is non-terminal; all remaining `todo` when terminal.
  - `type EndState = { label: 'Cancelled' | 'Expired' | 'Declined' | 'Disputed'; reason: string | null } | null`
  - `endState(order: Pick<OrderDTO, 'status' | 'rejectionReason'>): EndState` — `CANCELLED` → Cancelled, `EXPIRED` → Expired, `REJECTED` → Declined, `DISPUTED` → Disputed, else null; `reason` is `rejectionReason` or null.
  - `type EscrowState = 'reserving' | 'held' | 'released' | 'returned' | 'disputed'`
  - `escrowState(status: OrderStatus): EscrowState` — PENDING reserving; OPEN, ACCEPTED, IN_TRANSIT, DELIVERED held; COMPLETED released; CANCELLED, EXPIRED, REJECTED returned; DISPUTED disputed.
  - `escrowCopy(state: EscrowState, credits: number): string` — the exact strings: `Reserving ${n} credits…`, `${n} credits held in escrow`, `${n} credits paid to the courier once Credit Service settles the escrow`, `${n} reserved credits are returned by Credit Service`, `${n} credits held while the dispute is resolved`.
  - `viewerRole(order: Pick<OrderDTO, 'requesterId' | 'courierId'>, userId: string | null): 'requester' | 'courier' | 'other'`
  - `formatCountdown(expiresAt: string, nowMs: number): string` — `m:ss` under an hour, `h:mm:ss` otherwise, `0:00` when past.
  - `hasConversation(status: OrderStatus): boolean` — true for ACCEPTED, IN_TRANSIT, DELIVERED, COMPLETED, CANCELLED, EXPIRED, DISPUTED (moved from `TasksPage.tsx` `CHAT_STATUSES`).

- [ ] **Step 1: Write the failing tests** in `test/errand-details.test.ts` (`node:test`, `node:assert/strict`), one `test()` per helper:

```ts
test('tracker: IN_TRANSIT with timestamps marks posted, accepted, picked up done and delivered current', () => {
  const steps = trackerSteps({ status: 'IN_TRANSIT', createdAt: T0, acceptedAt: T1, pickedUpAt: T2, deliveredAt: null, completedAt: null });
  assert.deepEqual(steps.map((s) => [s.key, s.state, s.at]), [
    ['posted', 'done', T0], ['accepted', 'done', T1], ['picked_up', 'done', T2], ['delivered', 'current', null], ['completed', 'todo', null]]);
});
test('tracker: CANCELLED after pickup shows three done and nothing current', ...)  // Review Focus 3
test('tracker: PENDING has posted current and nothing done', ...)
test('endState: CANCELLED with a reason, EXPIRED, REJECTED, DISPUTED, and null for OPEN', ...)
test('escrowState per status and escrowCopy wording never claims a transfer happened', ...)
test('viewerRole: requester, courier, other (former courier)', ...)  // Review Focus 1
test('formatCountdown: 5:03 under an hour, 1:02:03 above, 0:00 when past', ...)  // Review Focus 2
test('hasConversation: false for PENDING, OPEN, REJECTED; true from ACCEPTED onwards', ...)
```

- [ ] **Step 2: Run to verify failure**

Run: `node --import tsx --test apps/student-app/test/errand-details.test.ts`
Expected: FAIL, cannot find module `../src/errand/details`.

- [ ] **Step 3: Implement the helpers** in `src/errand/details.ts` with the signatures above and a disclosure header.

- [ ] **Step 4: Run to verify pass**

Run: `node --import tsx --test apps/student-app/test/errand-details.test.ts`
Expected: all tests `ok`.

- [ ] **Step 5: Register the file** in `apps/student-app/package.json` `test:unit` and run `npm run ci:validate-tests` (expected: "Test matrix validation passed").

---

### Task 2: The page component (view only)

**Files:**
- Create: `apps/student-app/src/errand/ErrandDetailsPage.tsx`
- Modify: `apps/student-app/src/pages/TasksPage.tsx` (import `hasConversation` instead of its local `CHAT_STATUSES`)

**Interfaces:**
- Consumes: Task 1 helpers; `FetchOrderResult` from `src/api/orders.ts`; `ChatPanel` and `ChatApi` from `src/chat/`.
- Produces:

```ts
export interface ErrandDetailsPageProps {
  orderId: string;
  /** Live result from fetchOrderById; null while loading. */
  result: FetchOrderResult | null;
  currentUserId: string | null;
  chat: ChatApi;
  onBack: () => void;
  onReload: () => void;
  // Task 4 adds the action props here.
}
export function ErrandDetailsPage(props: ErrandDetailsPageProps): JSX.Element
```

- [ ] **Step 1: Build the component** top to bottom, each block its own small function in the same file:
  1. Back control (`data-testid="errand-back-btn"`, lucide `ArrowLeft`, label "Back"), then the header: order code (mono badge as on the cards), status badge (copy `getStatusBadgeClasses` out of `TasksPage.tsx` into `details.ts` as `statusBadgeClasses(status)` and import it from both), item description as `<h2>`.
  2. Loading state (`result === null`): "Loading errand…" with `RefreshCw` spinner. Error states (`result.status !== 'ok'`): the `message`, a Reload button (`onReload`) for `'error'`, "This errand is no longer available to you." for `'forbidden'` / `'not_found'`.
  3. `<ol data-testid="status-tracker">` from `trackerSteps`: a dot per step (emerald filled done, orange ring current, slate todo), label, and `<time>` with `toLocaleString([], { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })` when `at` is set. When `endState` is non-null, append a red end-state row with the label and `reason` ("Reason: …") beneath the track.
  4. Countdown while `status === 'OPEN'`: `Expires in {formatCountdown(expiresAt, now)}`; `now` comes from a `useState(Date.now())` ticked by `setInterval(1000)` in a `useEffect` that is only installed while OPEN (`data-testid="expiry-countdown"`).
  5. Sections as `<section>` with an `<h3>`: Pickup (supplier name, campus zone), Dropoff (location; requester contact note under "Requester's contact note" when present), Item (description and `specialNotes` in `whitespace-pre-wrap`, untruncated; "No special notes." when empty), Credits (`escrowCopy(escrowState(status), rewardCredits)`).
  6. Other side: for `viewerRole === 'requester'` show "Courier's contact note" with `courierContactNote` (or "Not provided" once `courierId` is set; the section is absent while OPEN); for `'courier'` show "Requester's contact note"; for `'other'` nothing.
  7. Chat: `hasConversation(status) && viewerRole !== 'other'` → `<ChatPanel orderId status currentUserId chat />` inside a section titled "Conversation".
  8. Footer: `Order ID {id}` and `Posted {createdAt formatted}` in `text-xs text-slate-500`.
  Layout: `max-w-3xl mx-auto space-y-6`, each section a white rounded card as the existing cards are.

- [ ] **Step 2: Typecheck and lint**

Run: `npm run typecheck --workspace=@campus-errand/student-app && npm run lint`
Expected: both clean.

---

### Task 3: Navigation: open from cards and Alerts, URL, Back, scroll restore

**Files:**
- Modify: `apps/student-app/src/App.tsx` (state around `focusOrderId` / `focusOrder`, `readDeepLink`, `openNotification`, `clearFocus`, the render tree)
- Modify: `apps/student-app/src/pages/TasksPage.tsx` (remove the focus panel, highlight and `focusOrderId` / `focusOrder` / `onClearFocus` props; add `onOpenErrand`)
- Modify: `apps/student-app/src/components/ErrandCard.tsx`, `apps/student-app/src/pages/FeedPage.tsx` (add `onOpenErrand`)

**Interfaces:**
- Produces in `App.tsx`:
  - `openErrand(orderId: string, tab: 'feed' | 'tasks')` — `setActiveTab(tab)`, `setFocusOrderId`, `setFocusOrder(null)`, remembers `window.scrollY` in a ref, `history.pushState({ errand: orderId }, '', '/?tab=<tab>&orderId=<id>')`, `window.scrollTo(0, 0)`.
  - `closeErrand()` — if `history.state?.errand` then `history.back()` (the `popstate` handler clears), else clear state directly and `history.replaceState(null, '', '/?tab=<activeTab>')`; afterwards restore the saved `scrollY` in an effect keyed on `focusOrderId` becoming null.
  - `popstate` listener (one `useEffect`): `const link = readDeepLink(); setActiveTab(link.tab ?? activeTab); setFocusOrderId(link.orderId); setFocusOrder(null)`.
  - `reloadErrand()` — `setFocusOrder(null)` and bump a `reloadKey` state that the fetch effect depends on.
- Card contract: `onOpenErrand: (orderId: string) => void` on `TasksPage`, `FeedPage`, `ErrandCard`. The card's summary block (code/zone through dropoff) is wrapped in `<a href={`/?tab=<tab>&orderId=${id}`} data-testid="open-errand-link" onClick={(e) => { e.preventDefault(); onOpenErrand(id); }} className="block">`, so the URL is real (middle-click, copy link) and the existing action buttons below it stay outside the anchor until Task 4 removes them.

- [ ] **Step 1: App.tsx** — add the three functions and the `popstate` effect; `openNotification` for non-wallet actions calls `openErrand(n.orderId, 'tasks')` (replacing the `replaceState` line); the existing fetch effect keeps `[isAuthenticated, focusOrderId, orders, reloadKey]`; in the render tree, when `focusOrderId` is set render `<ErrandDetailsPage orderId result={focusOrder} currentUserId chat onBack={closeErrand} onReload={reloadErrand} />` instead of the active tab's page (the header, notice bar, bottom nav and modals stay).
- [ ] **Step 2: TasksPage.tsx** — drop the `focusOrderId` / `focusOrder` / `onClearFocus` props, the focus `useEffect`, the `focused-errand` section and the ring class; wrap the summary in the anchor; add `onOpenErrand` to the props.
- [ ] **Step 3: ErrandCard.tsx / FeedPage.tsx** — same anchor over the summary (zone pill through the pickup/dropoff block); thread `onOpenErrand` from `App.tsx` (`(id) => openErrand(id, 'feed')`).
- [ ] **Step 4: Typecheck, lint, unit tests**

Run: `npm run typecheck --workspace=@campus-errand/student-app && npm run lint && npm run test:unit --workspace=@campus-errand/student-app`
Expected: clean; the chat and inbox suites still pass.

- [ ] **Step 5: Manual check in the browser against the Compose stack** (`docker compose up -d --build student-app`): open Tasks, click a card → page with tracker; Back → Tasks at the same scroll; refresh on the page URL keeps the page; open an Alert → page; a former-courier link → "no longer available" (Review Focus 1, 4).

---

### Task 4: Actions move onto the page; cards become summaries (#189)

**Files:**
- Modify: `apps/student-app/src/errand/ErrandDetailsPage.tsx` (action block)
- Modify: `apps/student-app/src/App.tsx` (pass the handlers and the action state; show `ordersError` on the page)
- Modify: `apps/student-app/src/pages/TasksPage.tsx`, `apps/student-app/src/components/ErrandCard.tsx`, `apps/student-app/src/pages/FeedPage.tsx` (remove buttons, chat toggle and the accept confirm step; whole card is the anchor)
- Modify: `scripts/uat/uat-d2-ui.mjs` (UO2 and the lifecycle steps open the page first)

**Interfaces:**
- `ErrandDetailsPageProps` gains:

```ts
  actingAction: 'accept' | TaskOrderAction | null;   // the in-flight action for this errand, or null
  actionError: string | null;                         // App's ordersError while the page is open
  onAccept: (orderId: string, courierContactNote?: string) => void;
  onAction: (orderId: string, action: TaskOrderAction) => void;
```

- Action block rules (status × viewer role), rendered under the tracker with the existing button classes and `data-testid`s so the UAT keeps its names:
  - `OPEN` & role `other` (another student's errand): "Accept Errand" → confirm step with the optional contact note input (`accept-contact-note-input`, maxLength 255), `confirm-accept-order-btn`, `cancel-accept-order-btn`.
  - `OPEN` & requester: `cancel-order-btn`.
  - `ACCEPTED` & courier: `pickup-order-btn`, `unassign-order-btn`; & requester: `cancel-order-btn`.
  - `IN_TRANSIT` & courier: `deliver-order-btn`.
  - `DELIVERED` & requester: `complete-order-btn`; & courier: "Waiting for requester confirmation".
  - Everything else: no button; the tracker and end state say it all.
  - All buttons disabled while `actingAction !== null`; the busy label matches the card's current wording ("Marking Picked Up…" etc.).
  - `actionError` renders as `role="alert"` with a "Reload errand" button → `onReload` (DP2.4).

- [ ] **Step 1: Page** — add the props and the action block.
- [ ] **Step 2: App.tsx** — pass `actingAction` (`acceptingOrder === focusOrderId ? 'accept' : taskActionInFlight?.orderId === focusOrderId ? taskActionInFlight.action : null`), `actionError={ordersError}`, `onAccept={handleAcceptOrder}`, `onAction={handleTaskOrderAction}`; the existing `ordersError` banner stays hidden while the page is open (it is already gated on `activeTab`; add `&& !focusOrderId`). The handlers already update `orders`, which re-runs the page fetch (DP2.3); the wallet refresh on complete/cancel stays.
- [ ] **Step 3: Cards** — TasksPage card: remove the accepted/posted action blocks and the chat toggle (keep the one-line status copy such as "Delivered · Waiting for requester confirmation"); the whole `<article>` becomes the anchor. ErrandCard: remove the confirm step, `onAcceptOrder` and `acceptingOrderId` props, keep "Your errand" / expiry footer; whole card is the anchor. FeedPage drops the accept props. App.tsx drops `onAcceptOrder` / `acceptingOrderId` from FeedPage and the five action props from TasksPage.
- [ ] **Step 4: UAT script** — in `scripts/uat/uat-d2-ui.mjs` replace each `card.getByTestId('<action>-btn')` with: click the card's `open-errand-link`, wait for `status-tracker`, click the button by its test id, then `errand-back-btn`. UO2: click the feed card's link, then "Accept Errand" and `confirm-accept-order-btn` on the page.
- [ ] **Step 5: Typecheck, lint, unit tests, matrix**

Run: `npm run typecheck && npm run lint && npm run test:unit --workspace=@campus-errand/student-app && npm run ci:validate-tests`
Expected: all clean.

- [ ] **Step 6: Browser UAT** — rebuild `student-app` and run `node scripts/uat/uat-d2-ui.mjs` against the healthy Compose stack (needs Playwright, see the script header); expected: the lifecycle and cancel steps pass through the page. If Playwright is unavailable, record that in the usage log and do the lifecycle by hand with two seeded accounts.

---

### Task 5: Wrap-up

- [ ] **Step 1: Disclosure headers** on every edited file; `// AI-generated (edited by Reallyeasy1)` markers on new blocks.
- [ ] **Step 2: Usage log** entry (last file written), listing the two JSON edits.
- [ ] **Step 3: PR body draft** for the author (not opened): `Closes #188`, `Closes #189`, DP criteria covered, the UAT result; base `feature/chat-service` until PR #148 merges, then retarget `main`.

## Calls made by the plan

- Files: `src/errand/details.ts` (pure helpers) and `src/errand/ErrandDetailsPage.tsx` (component), following the `src/chat/` and `src/notifications/` split of helpers and UI.
- The existing `focusOrderId` / `focusOrder` state is reused as the page's state instead of adding a parallel one; the Tasks focus panel is removed because the page replaces it.
- Cards expose a real `<a href>` deep link rather than a click handler on a `div`, for keyboard and middle-click behaviour.
- The countdown ticks once per second and only while the errand is OPEN.
