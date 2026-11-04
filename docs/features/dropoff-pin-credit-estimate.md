<!--
AI Assistance Disclosure:
Tool: Claude Code (model: Claude Opus 5.5), date: 2026-11-04
Scope: Revision from the author's clarification of the bounds (upper bound = the farthest pickup store to any drop-off
point on campus; lower bound = a same-campus-zone delivery) and request for an algorithm. Replaced the candidate curves
with one proposed algorithm (floor, linear ramp, cap; constants in section 5.3), derived the same-zone distance from the
seeded zone spreads, and redefined D_max as the farthest store to any outline vertex.
Author review: <to be completed by huangjiaxi1111>

Tool: Claude Code (model: Claude Opus 5.5), date: 2026-11-04
Scope: Revision from the author's follow-up decisions of 2026-11-04 (Kent Ridge only, UI label, browser calculation,
account for PR #222, Cheers kept as seeded, tracking issue deferred). Recorded them as A2, A5 and A8-A12, closed D1 and
D6, recalculated the reference distances and candidate curves for Kent Ridge, and added PR #222's relevant changes.
Author review: <to be completed by huangjiaxi1111>

Tool: Claude Code (model: Claude Opus 5.5), date: 2026-11-04
Scope: Dev doc for the drop-off pin and estimated credit feature, written from the requirements and decisions the
author stated in conversation on 2026-11-04 and from source inspected on main at 8ef8dcb. The decisions in section 2
are the author's. Field names, file layout, UI details and the candidate credit curves are this doc's calls, listed in
section 10 for the author to confirm; everything in section 9 is undecided.
Author review: <to be completed by huangjiaxi1111>
-->

# Drop-off pin and estimated credit (dev doc)

**Status:** draft for the author's review; nothing is implemented. **Baseline:** `main` at `8ef8dcb` and open PR #222 at `10a5e21`, inspected 2026-11-04 (SGT). **Tracking issue:** deferred by the author (A12).

**How to read it:**
- §4 is implemented behavior on `main`; §4.1 is the pending PR #222.
- §2 is the author's stated intent.
- §5–8 and §10 are unapproved proposals.
- §9 is undecided.

## 1. Feature summary

- **Posting.** On Post Errand, the requester can open a map of the NUS Kent Ridge campus and click any point inside the campus outline to drop a pin. The browser computes a suggested reward from the straight-line distance between the selected pickup spot and the pin, and prefills the reward field. The requester can still raise or lower it within their available balance. The pin is optional.
- **Accepting.** Anyone viewing an open errand sees the coordinates the poster clicked, the pin on a map, and the estimated credit beside the offered reward, and then decides whether to accept. An errand posted without a pin carries a label saying it did not use the estimator.
- **Credits.** Credit Service keeps reserving the confirmed `rewardCredits`, as it does today. The estimate is stored for display only.

## 2. Decisions recorded (author, 2026-11-04)

| # | Decision |
|---|---|
| A1 | No external building API; the NUS Digital Twin API is not used. |
| A2 | The map covers the NUS Kent Ridge (main) campus only; the Bukit Timah (Law) campus is out of scope. Clicks are accepted only inside the campus outline (a polygon). |
| A3 | The pin is approximate: no building or floor precision. It exists to produce the suggestion and to show the accepter where the poster pointed. |
| A4 | Distance is the only input for now. |
| A5 | Bounds. The lower bound (≈ 10 credits) is a delivery within the same campus zone. The upper bound (≈ 80–90 credits) is the longest trip: from the farthest pickup store (likely Cheers) to any drop-off point inside the campus. New wallets start with 100 credits. The bounds are a guide, not a hard rule, and the author asked this doc to propose the algorithm between them (§5). |
| A6 | The pin coordinates and the estimated credit are stored with the order and shown to the accepter, who decides whether to accept. |
| A7 | The new fields are optional and named after the existing field patterns. |
| A8 | The browser calculates the estimate; the Order Service stores what it is sent. Closes D1. |
| A9 | An errand with no estimate shows a UI label saying it did not use the estimator. There is no Notification Service message. Closes D6. |
| A10 | Seeded supplier coordinates are used as they are, including Cheers Unmanned Convenience Store, which sits outside the campus. Trips from it are calculated like any other. |
| A11 | Code for this feature accounts for the bug-fix PR #222 (§4.1). |
| A12 | No tracking issue for now. |

## 3. Original feature description vs. these decisions

| Original description | Now |
|---|---|
| Lives in the Credit Service | Calculated in the browser (A8) |
| Inputs: multi-zone transit distance, deadline urgency, package volume | Distance only (A4), Kent Ridge only (A2) |
| Recommended amount or range prefills the reward; requester can change it within balance | Kept (§7.1); exact prefill rule open (D5) |
| Credit Service reserves the confirmed amount, not the recommendation | Kept; already how reservation works (§4) |
| On timeout or failure, the UI falls back to a static campus lookup table | Open (D7); browser calculation makes no remote call |

## 4. Current state (main @ 8ef8dcb)

- **Map.** [`SupplierPickupMap.tsx`](../../apps/student-app/src/map/SupplierPickupMap.tsx) (React Leaflet 4, Leaflet 1.9, OpenStreetMap tiles) shows one pin per supplier that has coordinates; clicking a pin selects that supplier and closes the map. It has no free-point click, no outline and no bounds.
- **No geo helpers.** Nothing in `apps/`, `services/` or `packages/` computes distance, tests a point against a polygon, or reads browser geolocation.
- **Supplier coordinates.** Required in the Supplier database ([`schema.prisma:48-49`](../../services/supplier-service/prisma/schema.prisma#L48-L49)) and optional in [`SupplierDTO`](../../packages/common-dtos/src/index.ts#L168). PR #222 makes them nullable again (§4.1).
- **Orders carry no coordinates.** [`CreateOrderRequest`](../../packages/common-dtos/src/index.ts#L272), [`OrderDTO`](../../packages/common-dtos/src/index.ts#L247) and the `Order` model in the [order-service schema](../../services/order-service/prisma/schema.prisma) have only the free-text `dropoffLocation` (required, at most 255 characters).
- **Reward.** An integer from 1 to 2147483647 ([`order.service.ts:158`](../../services/order-service/src/orders/order.service.ts#L158)). The form starts at 15 ([`App.tsx:191`](../../apps/student-app/src/App.tsx#L191)), the F6 assistant defaults to 5, and the form blocks submission when the reward exceeds `availableCredits`. New wallets get a 100-credit welcome grant ([`credit-service service.ts:61`](../../services/credit-service/src/credits/service.ts#L61)).
- **Reservation.** Order creation puts `rewardCredits` into the `order.reservation.requested` event ([`order.service.ts:217`](../../services/order-service/src/orders/order.service.ts#L217)), and Credit Service reserves that amount.
- **Events.** [`OrderCreatedEvent`](../../packages/common-dtos/src/index.ts#L424) lists its fields explicitly (`orderId`, `orderCode`, `requesterId`, `rewardCredits`, `campusZone`, `expiresAt`). New `OrderDTO` fields reach no event unless they are added there.
- **Accepter views.** [`ErrandCard.tsx`](../../apps/student-app/src/components/ErrandCard.tsx#L79) shows the zone, "+N Credits", and the pickup and drop-off text. [`ErrandDetailsPage.tsx`](../../apps/student-app/src/errand/ErrandDetailsPage.tsx#L179) shows the same text, with no map.
- **Seed data.** There are 21 seeded suppliers, and one pair of them shares coordinates (the map case PR #222 fixes). "Cheers Unmanned Convenience Store" is seeded at (1.2994341, 103.7526298), about 2.3 km west of the other 20 and outside the campus. It is used as it is (A10).

### 4.1 Pending: PR #222 (open, `fix/pr220-review-and-ci` @ `10a5e21`)

[PR #222](https://github.com/AY2627S1-CS3219-P25/friend-on-campus/pull/222) is neither on `main` nor on the `feat/credit-estimator` branch (at `8ef8dcb`). These are the changes this feature builds on (A11):

| Area | Change in PR #222 | Effect on this feature |
|---|---|---|
| Supplier coordinates | Nullable again in the database (`Float?`, migration `20261101040000_preserve_legacy_coordinates`) and in `SupplierDTO` (`latitude?: number \| null`). New suppliers must still send coordinates; legacy rows may have none. | A selected supplier can have no coordinates, which means no distance and no estimate (§5.1, §7.1). Such suppliers are also left out of `D_max` (§5.2). |
| Pickup map | `SupplierPickupMap.tsx` groups suppliers that share coordinates, using a new pure helper `src/map/supplierLocations.ts` (`groupSuppliersByLocation`). A pin opens a popup listing those suppliers, each with a select button. Suppliers without coordinates are left off the map. | The pin map and its helpers sit beside these files and follow the same split into a pure helper and a component. |
| Student-app unit tests | New `test/supplier-map.test.ts`, appended to `test:unit` in `apps/student-app/package.json` | New test files are appended after it. |
| Shared DTOs | `packages/common-dtos/src/index.ts` (the `SupplierDTO` change above) | This feature edits the same file (`CreateOrderRequest`, `OrderDTO`). |

## 5. Estimate calculation (proposed algorithm)

### 5.1 Inputs and distance

- The pickup point is the selected supplier's latitude/longitude; the drop-off point is the pin.
- Distance `d` is the great-circle (haversine) straight-line distance in km. There is no routing (A3).
- There is no estimate when no supplier is selected, when there is no pin, or when the supplier has no coordinates (possible after PR #222).

### 5.2 Bounds (A5)

**Lower bound, same-zone delivery: `MIN_CREDITS = 10`.** A pin carries no zone, and distance is the only input (A4), so "same campus zone" is expressed as a distance: any trip of `SAME_ZONE_KM = 0.3 km` or less gets the lower bound. That value comes from how far apart the seeded stores of one zone are:

| Zone (stores) | Farthest two stores apart |
|---|---|
| Central Lib (3) | 0.05 km |
| Yusof Ishak House (2) | 0.06 km |
| PGPR (3) | 0.19 km |
| COM3 (4) | 0.33 km |
| Science (2) | 1.02 km |
| Engineering (3, including Cheers) | 2.02 km |

0.3 km covers four of the six zones that have more than one store; the other four zones have a single store each. Science and Engineering are spread wider in the seed data.

**Upper bound, the longest trip: `MAX_CREDITS = 85`** (within A5's 80–90). It applies at `D_max`, the longest straight-line distance from any pickup store to any point inside the campus outline.
- The farthest point of a polygon from a store is always one of its vertices. So `D_max` is the largest distance from a store to an outline vertex, which is exact and cheap to compute (21 stores × the outline's vertices).
- Only stores with coordinates count, active or not, so `D_max` doesn't change as stores open and close.
- It is computed in the browser each time the supplier list loads.
- Until the outline exists, the estimate is about 3.5 km, from Cheers to the east edge of campus. It is at least 3.07 km (Cheers to Octobox) if Prince George's Park is inside the outline. Cheers is the farthest store, as A5 expected.

### 5.3 Algorithm

The suggestion has a floor, then a linear ramp, then a cap, and is rounded to the nearest 5:

```text
MIN_CREDITS  = 10    lower bound: same-zone delivery
MAX_CREDITS  = 85    upper bound: the longest possible trip
SAME_ZONE_KM = 0.3   trips this short count as same-zone
STEP         = 5     suggestions are multiples of 5

D_max = max over stores with coordinates, over outline vertices, of haversine(store, vertex)

estimate(store, pin):
  if store has no coordinates, or there is no pin: no estimate
  d = haversine(store, pin)
  if D_max <= SAME_ZONE_KM: return MIN_CREDITS
  t = clamp((d - SAME_ZONE_KM) / (D_max - SAME_ZONE_KM), 0, 1)
  raw = MIN_CREDITS + t × (MAX_CREDITS - MIN_CREDITS)
  return clamp(round(raw / STEP) × STEP, MIN_CREDITS, MAX_CREDITS)
```

Properties:
- The suggestion never decreases as the distance grows.
- It always stays between 10 and 85.
- It is 10 for any trip up to 0.3 km, and reaches 85 only at `D_max`.
- With `D_max ≈ 3.5 km`, the ramp is about 23.4 credits per km.

### 5.4 Example outputs (`D_max ≈ 3.5 km`)

| d (km) | Reference | Before rounding | Suggestion |
|---|---|---|---|
| 0 | same building | 10.0 | 10 |
| 0.05 | Central Lib zone spread | 10.0 | 10 |
| 0.3 | same-zone bound | 10.0 | 10 |
| 0.53 | median distance between two seeded stores | 15.4 | 15 |
| 1.0 | | 26.4 | 25 |
| 1.45 | longest store pair without Cheers | 37.0 | 35 |
| 2.0 | | 49.8 | 50 |
| 2.5 | | 61.6 | 60 |
| 3.07 | Cheers to Octobox (PGP) | 74.9 | 75 |
| 3.5 | `D_max` (estimate) | 85.0 | 85 |

`D_max` follows the data. If Cheers' coordinates are corrected later, `D_max` drops to about 2.1 km (estimate) and the same trips get higher suggestions; for example, the median trip goes from 15 to 20.

## 6. Data changes

The names and types follow the existing patterns (A7); they are listed in §10 for confirmation.

| Field | DTOs | Column (`orders`) | Prisma | Modelled on |
|---|---|---|---|---|
| `dropoffLatitude?: number` | `CreateOrderRequest`, `OrderDTO` | `dropoff_latitude` | `Float?` | `Supplier.latitude` |
| `dropoffLongitude?: number` | `CreateOrderRequest`, `OrderDTO` | `dropoff_longitude` | `Float?` | `Supplier.longitude` |
| `estimatedRewardCredits?: number` | `CreateOrderRequest`, `OrderDTO` | `estimated_reward_credits` | `Int?` | `rewardCredits` |

- **Migration:** one new migration under `services/order-service/prisma/migrations/` adds the three nullable columns. Existing orders get `NULL` and show as "no estimate".
- **Mapping:** `toOrderDTO` maps `NULL` to `undefined`, as it does for `specialNotes`.
- **Validation** in `validateCreateOrderRequest`:
  - All three fields are present, or all three are absent; anything else is a 400.
  - Latitude is a finite number in [-90, 90] and longitude a finite number in [-180, 180]. Whether the server also checks the outline is D2.
  - `estimatedRewardCredits` is an integer in the same 1–2147483647 range as `rewardCredits`. The server doesn't know the algorithm, since the browser calculates it (A8).
  - The `rewardCredits` rules don't change, and `rewardCredits` may differ from the estimate.

## 7. Student app

### 7.1 Post Errand

- A "Pin on map" control sits beside the drop-off text field ([`PostErrandPage.tsx:560`](../../apps/student-app/src/pages/PostErrandPage.tsx#L560)). The text field stays required.
- **Map pop-up:**
  - The Kent Ridge outline is drawn as a polygon, and `maxBounds` keeps the view on it.
  - A click inside the outline drops or moves the single pin. A click outside leaves the pin unchanged and shows "Choose a point inside the NUS Kent Ridge campus".
- **After a supplier and a pin are set:** the page shows "Suggested N credits · about X km straight-line from <supplier>" and prefills `rewardCredits` (D5).
  - `D_max` is computed when the supplier list loads (§5.2).
  - Changing the supplier recomputes the suggestion.
  - Removing the pin clears the suggestion and the three fields.
  - A supplier without coordinates (PR #222) gives no suggestion. The page says the pickup spot has no map location, and none of the three fields is sent.
- **Submit:** the three fields are added to the request built in [`App.tsx:566`](../../apps/student-app/src/App.tsx#L566). [`useOrderSubmission.ts:96`](../../apps/student-app/src/orders/useOrderSubmission.ts#L96) already posts any `CreateOrderRequest` unchanged.
- **F6 assistant:** it produces no pin, and applying a draft ([`PostErrandPage.tsx:169`](../../apps/student-app/src/pages/PostErrandPage.tsx#L169)) leaves the pin and the suggestion alone. Whether a draft's `rewardCredits` replaces a suggestion is part of D5.

### 7.2 Feed card

[`ErrandCard.tsx:79`](../../apps/student-app/src/components/ErrandCard.tsx#L79): beside "+N Credits", show "Est. M" when an estimate exists and the "No estimate" label when it doesn't (A9).

### 7.3 Errand page

[`ErrandDetailsPage.tsx`](../../apps/student-app/src/errand/ErrandDetailsPage.tsx) gets a read-only mini map with the drop-off pin, and the pickup pin when the supplier has coordinates. Beside it:
- the clicked coordinates, to 5 decimal places;
- the straight-line distance;
- "Estimated M · Offered N credits", or the label "The poster did not use the estimator" (A9).

All of this is visible before accepting, since Accept lives on this page. The pickup pin uses the supplier's current coordinates; the stored estimate is not recalculated.

### 7.4 Pure helpers

These sit beside PR #222's `supplierLocations.ts`. All of them can be unit tested with `node --test`, and none needs a new dependency:
- `src/map/campusOutline.ts`: the Kent Ridge polygon and a ray-casting `isInsideCampus(lat, lng)`.
- `src/map/creditEstimate.ts`: haversine distance, `longestTripKm(suppliers, outline)` for `D_max`, and `estimateRewardCredits(pickup, pin, dMaxKm)` for §5.3. It returns no estimate when either point is missing.

## 8. Files to change

| Area | File | Change |
|---|---|---|
| Shared DTOs | [`packages/common-dtos/src/index.ts`](../../packages/common-dtos/src/index.ts#L247) | Three optional fields on `CreateOrderRequest` and `OrderDTO` (PR #222 edits `SupplierDTO` in the same file), then `npm run typecheck` across all workspaces |
| Order schema | [`services/order-service/prisma/schema.prisma`](../../services/order-service/prisma/schema.prisma) plus a new migration | Three nullable columns |
| Order validation | [`order.service.ts:130-182`](../../services/order-service/src/orders/order.service.ts#L130-L182), [`:227`](../../services/order-service/src/orders/order.service.ts#L227) | Validate the fields and pass them to the repository |
| Order persistence | [`order.repository.ts:54`](../../services/order-service/src/repositories/order.repository.ts#L54), [`:113`](../../services/order-service/src/repositories/order.repository.ts#L113) | `CreateOrderParams` and `tx.order.create` |
| DTO mapping | [`order.types.ts:124`](../../services/order-service/src/orders/order.types.ts#L124) | `toOrderDTO` |
| Student app | `src/map/` (new helpers and pin map, beside PR #222's `supplierLocations.ts`), `PostErrandPage.tsx`, `App.tsx`, `ErrandCard.tsx`, `ErrandDetailsPage.tsx` | See §7 |
| Student-app tests | `test:unit` in `apps/student-app/package.json` | Append the new test files after PR #222's `test/supplier-map.test.ts` |
| Docs (after implementation) | `docs/services/order-service/contracts-and-data.md`, `docs/packages/common-dtos.md`, `docs/frontend/student-app.md` | Describe the new fields and UI |

## 9. Open decisions (author)

| # | Question | Facts |
|---|---|---|
| D1 | Closed by A8: the browser calculates the estimate. | |
| D2 | Does the Order Service also check that the pin is inside the outline? | Yes means both the student app and the Order Service need the outline data, either shared through a workspace package or duplicated. No means the server checks only number ranges (§6). |
| D3 | Approve the algorithm in §5.3 and its constants: `MIN_CREDITS` 10, `MAX_CREDITS` 85, `SAME_ZONE_KM` 0.3, `STEP` 5, and a linear ramp between them. | The author asked for this proposal on 2026-11-04; it is not yet approved. |
| D4 | Where do the outline vertices come from, and which areas count? | No outline data exists in the repo. Possible sources: traced by hand on the OpenStreetMap tiles the map already uses, or taken from OpenStreetMap's campus boundary data. Scope questions include University Town, Prince George's Park, Kent Vale and the hospital (NUH). The outline also sets `D_max` (§5.2), so its east edge changes every estimate. |
| D5 | What is the prefill rule? | Does a new suggestion (pin moved, supplier changed) overwrite a reward the requester already edited? If the suggestion exceeds `availableCredits`, is it prefilled as-is (the form then blocks submit until the requester lowers it) or capped at `availableCredits`? Does an applied F6 draft's `rewardCredits` replace a suggestion? |
| D6 | Closed by A9: a UI label, with no notification. | |
| D7 | Is the static lookup fallback from the original description still needed? | Under A8 the estimate is computed locally, so there is no remote call that can time out. If a static table is still wanted, it would map distance bands to credits. |
| D8 | Should order events carry the new fields? | No current consumer (notification, chat or credit service) reads them. |

## 10. Calls made by this doc (author to confirm)

- The field names and types in §6, and the all-or-none validation rule.
- When the supplier has no coordinates, none of the three fields is sent, so the pin isn't stored in that case (§7.1).
- The algorithm and constants in §5.3 (D3).
- `D_max` is computed in the browser each time the supplier list loads, over all stores with coordinates, active or not (§5.2).
- The helper file and function names in §7.4. Whether the pin map is a new component in `src/map/` or a second mode of `SupplierPickupMap` is left to implementation.
- UI details: a single movable pin, `maxBounds` on the outline, coordinates to 5 decimal places, and the "Est. M" / "No estimate" labels.
- This doc's location, `docs/features/` (a new folder).

## 11. Tests and verification

- **Student app unit tests** (`apps/student-app/test/`, appended to `test:unit` after PR #222's `test/supplier-map.test.ts`):
  - outline check: points inside and outside the campus, plus edge points;
  - haversine distance against known pairs;
  - `longestTripKm`: on a synthetic outline and stores, it equals the largest store-to-vertex distance and skips stores without coordinates;
  - `estimateRewardCredits`:
    - any trip of 0.3 km or less → 10, and `D_max` → 85;
    - never decreases with distance, always a multiple of 5, clamped to 10–85;
    - `D_max ≤ SAME_ZONE_KM` → 10;
    - no estimate when the supplier has no coordinates.
- **Order Service unit tests** ([`order.service.test.ts`](../../services/order-service/test/order.service.test.ts)):
  - create with all three fields → stored and returned;
  - create with none → absent from the DTO;
  - a partial set → 400;
  - out-of-range coordinates → 400;
  - a non-integer estimate → 400;
  - `rewardCredits` different from the estimate → accepted.
- **Migration:** applies on a database that already has orders (the columns are nullable).
- **Postman:** in [`tests/postman/order_credit_collection.json`](../../tests/postman/order_credit_collection.json), a create-with-pin request whose response shows all three fields.
- **UAT** (`scripts/uat/`): the Post Errand flow still passes with no pin.
- **Commands:** `npm run typecheck`, `npm run test:unit`, `npm run ci:validate-tests` (after editing `test:unit`), and `npm run test:e2e:api`.

## 12. Related work

- **#171:** the student app loads suppliers once per page load, so `D_max` and each suggestion use the supplier coordinates from that load.
