/**
 * AI Assistance Disclosure:
 * Tool: Codex (model: GPT-6); Google Antigravity Agent; Claude Code (model: Claude Fable 5.1, Claude Opus 5.5, Claude Sonnet 5.5), date: 2026-10-26 to 2026-11-08
 * Scope: The errand details page the author designed on 2026-10-26 (issues #188 and #189): header, status tracker with the order's timestamps and a red end state,..; updated across 15 AI-assisted revisions through D4 wrap-up (resolve main merge conflict by preserving the delivered-requester dispute and confirmation controls alongside redesigned details).
 * Author review: I validated correctness, edited for style, and verified with automated tests.
 */


import type { OrderDTO, SupplierDTO } from '@campus-errand/common-dtos';
import { AlertTriangle, Check, ChevronLeft, Clock, Coins, MapPin, RefreshCw, User, X } from 'lucide-react';
import { useEffect, useState, type ReactNode } from 'react';
import type { FetchOrderResult, TaskOrderAction } from '../api/orders';
import { ChatPanel } from '../chat/ChatPanel';
import type { ChatApi } from '../chat/useChat';
import { formatCoordinates } from '../map/DropoffPicker';
import { ErrandRouteMap } from '../map/ErrandRouteMap';
import { haversineKm, supplierPoint } from '../map/creditEstimate';
import { useMinuteClock } from '../suppliers/minuteClock';
import { HOURS_NOT_LISTED, formatOperatingHours, isOpenAt } from '../suppliers/operatingHours';
import {
  endState,
  escrowCopy,
  escrowState,
  formatCountdown,
  hasConversation,
  statusBadgeClasses,
  trackerSteps,
  viewerRole,
  type TrackerStep,
} from './details';

export interface ErrandDetailsPageProps {
  orderId: string;
  /** Live result from fetchOrderById; null while loading. */
  result: FetchOrderResult | null;
  currentUserId: string | null;
  chat: ChatApi;
  onBack: () => void;
  onReload: () => void;
  /** The action in flight for this errand, or null. */
  actingAction: 'accept' | TaskOrderAction | null;
  /** The last action failure from the Order Service (400 / 403 / 409 text), or null. */
  actionError: string | null;
  onAccept: (orderId: string, courierContactNote?: string) => void;
  onAction: (orderId: string, action: TaskOrderAction, details?: string) => void;
  /** The order's pickup store from the loaded supplier list, for its operating hours; null if not loaded. */
  supplier?: SupplierDTO | null;
}

type Role = ReturnType<typeof viewerRole>;

/** The store's hours and whether it is open at `now`; nulls when the store or its hours are unknown. */
function storeHours(
  supplier: SupplierDTO | null | undefined,
  now: Date
): { hours: string | null; openNow: boolean | null } {
  if (!supplier) return { hours: null, openNow: null };
  return { hours: formatOperatingHours(supplier), openNow: isOpenAt(supplier, now) };
}

const timeOf = (iso: string) =>
  new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
const dateTimeOf = (iso: string) =>
  new Date(iso).toLocaleString([], {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });

const CARD = 'bg-white rounded-2xl border border-slate-200 shadow-subtle';
const BIG =
  'w-full inline-flex items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm sm:text-base font-semibold transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer active:scale-[0.99]';
const PRIMARY = `${BIG} bg-campus-blue hover:bg-campus-blue-hover text-white shadow-subtle hover:shadow-sm`;
const ACCENT = `${BIG} bg-campus-blue hover:bg-campus-blue-hover text-white shadow-subtle hover:shadow-sm`;
const GHOST =
  'w-full inline-flex items-center justify-center gap-1.5 rounded-xl px-4 py-2.5 text-xs sm:text-sm font-bold transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed border cursor-pointer active:scale-[0.99]';
const GHOST_DANGER = `${GHOST} border-rose-200 text-rose-700 bg-rose-50/60 hover:bg-rose-100 hover:border-rose-300`;
const GHOST_QUIET = `${GHOST} border-slate-200 text-slate-700 bg-slate-50 hover:bg-slate-100 hover:border-slate-300`;

function Card({
  children,
  testId,
  className = '',
}: {
  children: ReactNode;
  testId?: string;
  className?: string;
}) {
  return (
    <section data-testid={testId} className={`${CARD} ${className}`}>
      {children}
    </section>
  );
}

/** The person on the other side of the errand: role and contact note only (author's option 1: no names). */
function Participant({
  order,
  role,
  hadCourier,
}: {
  order: OrderDTO;
  role: Role;
  hadCourier: boolean;
}) {
  const courierSide = role === 'requester' || role === 'other';
  const ended = endState(order);
  // A drop clears the Order's courier fields; the retained chat conversation is the sign a courier once accepted.
  const dropped = !order.courierId && hadCourier;
  const title = courierSide
    ? order.courierId
      ? 'Your courier'
      : dropped
      ? 'Courier dropped out'
      : ended
      ? 'No courier'
      : 'No courier yet'
    : 'Requester';
  const note = courierSide ? order.courierContactNote : order.requesterContactNote;
  const meta = courierSide
    ? order.courierId
      ? `Accepted ${order.acceptedAt ? dateTimeOf(order.acceptedAt) : 'this errand'}`
      : dropped
      ? ended
        ? `A courier accepted, then dropped it before it was ${ended.label.toLowerCase()}`
        : 'A courier accepted, then dropped it; back on the feed'
      : ended
      ? `Nobody accepted before it was ${ended.label.toLowerCase()}`
      : role === 'other'
      ? 'Accept to become the courier'
      : 'Waiting for a student to accept'
    : `Posted ${dateTimeOf(order.createdAt)}`;

  return (
    <Card className="p-4 sm:p-5 flex items-center gap-3.5" testId="participant-card">
      <span
        aria-hidden="true"
        className="h-11 w-11 shrink-0 rounded-2xl bg-campus-blue-soft border border-blue-200 flex items-center justify-center text-campus-blue shadow-sm"
      >
        <User className="h-5 w-5" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="font-bold text-slate-900 leading-tight">{title}</p>
        <p className="text-xs text-slate-500 mt-0.5 break-words">{meta}</p>
      </div>
      {/* Contact notes are shown to participants only; a pasted link must not show a phone number to anyone else. */}
      {role !== 'other' && (
        <span
          title={note || undefined}
          className={`max-w-[45%] truncate rounded-full border px-3 py-1 text-xs font-bold ${
            note
              ? 'border-blue-300 text-campus-blue bg-campus-blue-soft shadow-2xs'
              : 'border-slate-200 text-slate-500 bg-slate-50'
          }`}
        >
          {note || 'No contact note'}
        </span>
      )}
    </Card>
  );
}

/** Timeline rows with the errand's own facts on them (pickup spot, dropoff, escrow amount). */
function rowCopy(
  step: TrackerStep,
  order: OrderDTO,
  role: Role
): { title: string; detail: string } {
  const spot = order.supplierName ?? 'the pickup spot';
  const credits = `${order.rewardCredits} credits`;
  const at = step.at ? timeOf(step.at) : null;
  switch (step.key) {
    case 'posted':
      return {
        title: step.state === 'done' ? `Posted (${credits} in escrow)` : `Reserving ${credits}`,
        detail: at
          ? `${at} · ${role === 'requester' ? 'You' : 'Requester'}`
          : 'Reserving reward credits…',
      };
    case 'accepted':
      return {
        title:
          step.state === 'done'
            ? role === 'courier'
              ? 'Accepted by you'
              : 'Accepted by a courier'
            : 'Waiting for a courier',
        detail: at
          ? `${at} · Matched`
          : `Open on the feed${order.campusZone ? ` in ${order.campusZone}` : ''}`,
      };
    case 'picked_up':
      return {
        title: step.state === 'done' ? `Picked up from ${spot}` : `Pickup at ${spot}`,
        detail: at
          ? `${at} · En route to ${order.dropoffLocation}`
          : order.campusZone ?? 'Courier heads to the spot',
      };
    case 'delivered':
      return {
        title:
          step.state === 'done'
            ? `Delivered to ${order.dropoffLocation}`
            : `Delivery to ${order.dropoffLocation}`,
        detail: at
          ? `${at} · ${
              order.status === 'DELIVERED'
                ? 'Awaiting the requester’s confirmation'
                : 'Confirmed'
            }`
          : 'Pending',
      };
    case 'completed':
      return {
        title:
          step.state === 'done'
            ? 'Completed · delivery confirmed'
            : `Confirmation, then ${credits} release`,
        detail: at
          ? `${at} · ${credits} paid to the courier once Credit Service settles the escrow`
          : 'Pending',
      };
  }
}

function Timeline({ order, role }: { order: OrderDTO; role: Role }) {
  const steps = trackerSteps(order);
  const end = endState(order);

  return (
    <Card className="p-4 sm:p-5" testId="status-tracker">
      <ol className="relative space-y-0">
        {steps.map((step, index) => {
          const { title, detail } = rowCopy(step, order, role);
          const last = index === steps.length - 1 && !end;
          return (
            <li
              key={step.key}
              data-step={step.key}
              data-state={step.state}
              aria-current={step.state === 'current' ? 'step' : undefined}
              className="relative flex gap-3.5 pb-4 last:pb-0"
            >
              {!last && (
                <span
                  aria-hidden="true"
                  className={`absolute left-[11px] top-6 bottom-0 w-0.5 ${
                    step.state === 'done' ? 'bg-campus-blue' : 'bg-slate-200'
                  }`}
                />
              )}
              <span
                aria-hidden="true"
                className={`relative z-10 mt-0.5 h-6 w-6 shrink-0 rounded-full border-2 flex items-center justify-center transition-all ${
                  step.state === 'done'
                    ? 'bg-campus-blue border-blue-600 text-white shadow-sm'
                    : step.state === 'current'
                    ? 'bg-white border-blue-600 ring-4 ring-blue-100'
                    : 'bg-white border-slate-300'
                }`}
              >
                {step.state === 'done' && <Check className="h-3.5 w-3.5" strokeWidth={3} />}
                {step.state === 'current' && (
                  <span className="h-2.5 w-2.5 rounded-full bg-campus-blue" />
                )}
              </span>
              <div className="min-w-0 pt-0.5">
                <p
                  className={`text-xs sm:text-sm font-bold leading-5 break-words ${
                    step.state === 'todo' ? 'text-slate-500' : 'text-slate-900'
                  }`}
                >
                  {title}
                  <span className="sr-only">
                    {step.state === 'done'
                      ? ' (done)'
                      : step.state === 'current'
                      ? ' (current)'
                      : ' (not yet)'}
                  </span>
                </p>
                <p
                  className={`text-xs leading-4 break-words ${
                    step.state === 'todo' ? 'text-slate-500' : 'text-slate-500'
                  }`}
                >
                  {step.at ? <time dateTime={step.at}>{detail}</time> : detail}
                </p>
              </div>
            </li>
          );
        })}
        {end && (
          <li data-testid="end-state" className="relative flex gap-3.5 pt-1">
            <span
              aria-hidden="true"
              className="relative z-10 mt-0.5 h-6 w-6 shrink-0 rounded-full border-2 border-rose-500 bg-rose-500 text-white flex items-center justify-center shadow-sm"
            >
              <X className="h-3.5 w-3.5" strokeWidth={3} />
            </span>
            <div className="min-w-0 pt-0.5">
              <p className="text-sm font-bold leading-5 text-rose-700">{end.label}</p>
              <p className="text-xs leading-4 text-rose-600 break-words">
                {end.reason
                  ? `Reason: ${end.reason}`
                  : end.label === 'Disputed'
                  ? 'An admin is reviewing this errand'
                  : escrowCopy(escrowState(order.status), order.rewardCredits)}
              </p>
            </div>
          </li>
        )}
      </ol>
    </Card>
  );
}

function ItemCard({ order, supplier, now }: { order: OrderDTO; supplier?: SupplierDTO | null; now: Date }) {
  const { hours, openNow } = storeHours(supplier, now);
  // Drop-off estimator: all three fields are stored together or not at all.
  const { dropoffLatitude, dropoffLongitude, estimatedRewardCredits } = order;
  const dropoff = typeof dropoffLatitude === 'number' && typeof dropoffLongitude === 'number'
    ? { latitude: dropoffLatitude, longitude: dropoffLongitude }
    : null;
  // The pickup pin uses the store's current coordinates; the stored estimate is not recalculated.
  const pickup = supplierPoint(supplier);
  return (
    <Card className="p-4 sm:p-5 space-y-3.5" testId="item-card">
      <div>
        <p className="text-xs font-semibold uppercase tracking-widest text-slate-500">
          Errand Request
        </p>
        <p className="text-base sm:text-lg font-semibold text-slate-900 break-words mt-0.5">
          {order.itemDescription}
        </p>
        <p
          className="text-xs sm:text-sm text-slate-600 whitespace-pre-wrap break-words mt-1.5 bg-slate-50/90 p-3 rounded-2xl border border-slate-100"
          data-testid="special-notes-full"
        >
          {order.specialNotes || 'No special notes.'}
        </p>
      </div>
      <dl className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
        <div className="rounded-2xl bg-slate-50/90 border border-slate-100 p-3.5 min-w-0 shadow-2xs">
          <dt className="flex items-center gap-1.5 text-slate-500 font-semibold mb-1">
            <MapPin className="h-3.5 w-3.5 text-campus-blue" />
            <span>Pickup</span>
          </dt>
          <dd className="text-slate-900 font-bold truncate" title={order.supplierName}>
            {order.supplierName ?? 'Pickup spot'}
          </dd>
          {order.campusZone && (
            <dd className="text-xs text-campus-blue font-semibold mt-0.5">{order.campusZone}</dd>
          )}
          {supplier && (
            <dd
              data-testid="pickup-operating-hours"
              className="flex flex-wrap items-center gap-x-1 text-xs text-slate-500 mt-0.5"
            >
              <Clock className="h-3 w-3 shrink-0" />
              <span className="whitespace-nowrap">{hours ?? HOURS_NOT_LISTED}</span>
              {openNow === true && <span className="whitespace-nowrap font-bold text-emerald-700">· Open now</span>}
              {openNow === false && <span className="whitespace-nowrap font-bold text-rose-700">· Closed now</span>}
            </dd>
          )}
        </div>
        <div className="rounded-2xl bg-slate-50/90 border border-slate-100 p-3.5 min-w-0 shadow-2xs">
          <dt className="flex items-center gap-1.5 text-slate-500 font-semibold mb-1">
            <MapPin className="h-3.5 w-3.5 text-orange-700" />
            <span>Dropoff</span>
          </dt>
          <dd className="text-slate-900 font-bold truncate" title={order.dropoffLocation}>
            {order.dropoffLocation}
          </dd>
          {dropoff ? (
            <dd data-testid="dropoff-point" className="text-xs text-slate-500 mt-0.5">
              <span className="font-mono">{formatCoordinates(dropoff)}</span>
              {pickup && <span className="block">{haversineKm(pickup, dropoff).toFixed(2)} km from pickup</span>}
            </dd>
          ) : (
            <dd className="text-xs text-slate-500 mt-0.5">Final destination</dd>
          )}
        </div>
        <div className="rounded-2xl bg-amber-50/80 border border-amber-200/80 p-3.5 min-w-0 shadow-2xs">
          <dt className="flex items-center gap-1.5 text-amber-700/80 font-semibold mb-1">
            <Coins className="h-3.5 w-3.5 text-amber-600 fill-amber-400" />
            <span>Reward</span>
          </dt>
          <dd className="text-amber-900 font-semibold text-sm">{order.rewardCredits} credits</dd>
          <dd className="text-xs text-amber-700/90 leading-tight mt-0.5">
            {escrowCopy(escrowState(order.status), order.rewardCredits)}
          </dd>
          <dd data-testid="reward-estimate" className="text-xs text-amber-700/90 leading-tight mt-1 font-semibold">
            {typeof estimatedRewardCredits === 'number'
              ? `Estimated ${estimatedRewardCredits} · Offered ${order.rewardCredits} credits`
              : 'The poster did not use the estimator'}
          </dd>
        </div>
      </dl>
      {dropoff && <ErrandRouteMap dropoff={dropoff} pickup={pickup} pickupName={order.supplierName} />}
    </Card>
  );
}

function Countdown({ expiresAt }: { expiresAt: string }) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);
  const remaining = formatCountdown(expiresAt, now);
  return (
    <p
      data-testid="expiry-countdown"
      className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 border border-amber-200 px-3.5 py-1 text-xs font-bold text-amber-800 tabular-nums shadow-sm"
    >
      <Clock className="h-3.5 w-3.5 text-amber-600" />
      <span>{remaining === '0:00' ? 'Expiry time reached; closing shortly' : `Expires in ${remaining}`}</span>
    </p>
  );
}

/**
 * The requester's DELIVERED block: confirm whenever they like, or Raise Dispute. Once a dispute exists (theirs or the
 * courier's) confirmation is disabled until an administrator settles the errand; the requester can still add their own
 * side if they have not yet.
 */
function DeliveredRequesterActions({
  order,
  actingAction,
  onAction,
}: {
  order: OrderDTO;
  actingAction: ErrandDetailsPageProps['actingAction'];
  onAction: ErrandDetailsPageProps['onAction'];
}) {
  const [reason, setReason] = useState('');
  const disputed = Boolean(order.dispute);
  const raised = Boolean(order.requesterDisputeDetails);
  const busy = actingAction !== null;
  const credits = order.rewardCredits;

  const canDispute = !raised && !busy && reason.trim().length > 0;
  const label = (action: 'complete' | 'dispute', idle: string, active: string) => (actingAction === action ? active : idle);

  return (
    <div className="space-y-3">
      <div className="space-y-2">
        <button
          type="button"
          data-testid="complete-order-btn"
          disabled={busy || disputed}
          onClick={() => onAction(order.id, 'complete')}
          className={PRIMARY}
        >
          {label('complete', `Confirm received & release ${credits} credits`, 'Confirming…')}
        </button>
        <p className="text-center text-xs text-slate-500 leading-relaxed">
          Releases {credits} credits from escrow to the courier.
        </p>
      </div>

      {disputed && (
        <p role="status" data-testid="dispute-raised-note" className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-800">
          {raised ? 'Dispute raised.' : 'The courier raised a dispute.'} An administrator will review it; the {credits} credits stay held until then.
        </p>
      )}
      {!raised && (
        <div className="space-y-2">
          <button
            type="button"
            data-testid="raise-dispute-btn"
            disabled={!canDispute}
            onClick={() => onAction(order.id, 'dispute', reason.trim())}
            className={`${BIG} bg-rose-600 hover:bg-rose-700 text-white shadow-xs`}
          >
            {label('dispute', 'Raise Dispute', 'Raising dispute…')}
          </button>
          <textarea
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            maxLength={1000}
            rows={3}
            aria-label="Reason for the dispute"
            placeholder="Why are you disputing this delivery? (required)"
            disabled={busy}
            className="w-full resize-none rounded-xl border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-rose-200 disabled:opacity-50"
          />
        </div>
      )}
    </div>
  );
}

/** The courier's dispute block on a DELIVERED errand: the requester's message (empty until they write one), then the courier's own report (once). */
function CourierDisputeResponse({
  order,
  actingAction,
  onAction,
}: {
  order: OrderDTO;
  actingAction: ErrandDetailsPageProps['actingAction'];
  onAction: ErrandDetailsPageProps['onAction'];
}) {
  const [reason, setReason] = useState('');
  const busy = actingAction !== null;
  const submitted = Boolean(order.courierDisputeDetails);
  const readOnlyBox = 'w-full resize-none rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700';
  return (
    <div className="space-y-2" data-testid="courier-dispute">
      {submitted || order.dispute ? (
        <p role="status" className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-800">
          This delivery is under dispute. An administrator will settle it; the credits stay held until then.
        </p>
      ) : (
        <p className="text-center text-xs text-slate-500 leading-relaxed">Delivered · Waiting for requester confirmation. If something went wrong you can report it below.</p>
      )}
      <label className="block text-xs font-bold text-slate-600" htmlFor="requester-dispute-message">What the requester said</label>
      <textarea id="requester-dispute-message" readOnly rows={3} value={order.requesterDisputeDetails ?? ''} className={readOnlyBox} />
      {submitted ? (
        <>
          <label className="block text-xs font-bold text-slate-600" htmlFor="courier-dispute-sent">Your dispute report</label>
          <textarea id="courier-dispute-sent" readOnly rows={3} value={order.courierDisputeDetails ?? ''} className={readOnlyBox} />
        </>
      ) : (
        <>
          <textarea
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            maxLength={1000}
            rows={3}
            aria-label="Your account of what happened"
            placeholder="What happened, and why? (required)"
            disabled={busy}
            className="w-full resize-none rounded-xl border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200 disabled:opacity-50"
          />
          <button
            type="button"
            data-testid="submit-courier-dispute-btn"
            disabled={busy || reason.trim().length === 0}
            onClick={() => onAction(order.id, 'courier-dispute', reason.trim())}
            className={PRIMARY}
          >
            {actingAction === 'courier-dispute' ? 'Submitting…' : 'Submit dispute report'}
          </button>
        </>
      )}
    </div>
  );
}

/** The one thing to do next, as the wireframe's bottom button: a primary action, its caption, and any secondary one. */
function Actions({
  order,
  role,
  actingAction,
  onAccept,
  onAction,
  supplier,
  now,
}: {
  order: OrderDTO;
  role: Role;
  actingAction: ErrandDetailsPageProps['actingAction'];
  onAccept: ErrandDetailsPageProps['onAccept'];
  onAction: ErrandDetailsPageProps['onAction'];
  supplier?: SupplierDTO | null;
  now: Date;
}) {
  const [confirmingAccept, setConfirmingAccept] = useState(false);
  const [contactNote, setContactNote] = useState('');
  const busy = actingAction !== null;
  const credits = order.rewardCredits;
  const label = (
    action: ErrandDetailsPageProps['actingAction'],
    idle: string,
    active: string
  ) => (actingAction === action ? active : idle);
  const caption = (text: string) => (
    <p className="text-center text-xs text-slate-500 leading-relaxed">{text}</p>
  );

  if (order.status === 'OPEN' && role === 'other') {
    const { hours, openNow } = storeHours(supplier, now);
    const closedReminder = openNow === false && (
      <p
        role="note"
        data-testid="accept-store-closed-note"
        className="flex items-start gap-2 rounded-2xl bg-amber-50 border border-amber-200 px-3 py-2 text-xs text-amber-900"
      >
        <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600" />
        <span>
          {order.supplierName ?? 'The pickup store'} is closed now{hours ? ` (open ${hours})` : ''}. Check you can
          buy the items before accepting.
        </span>
      </p>
    );
    return confirmingAccept ? (
      <div className="space-y-2.5 bg-slate-50/90 p-4 rounded-2xl border border-slate-200 shadow-card">
        {closedReminder}
        <label className="block text-xs font-bold text-slate-700">
          Contact details for the requester (optional)
          <input
            type="text"
            data-testid="accept-contact-note-input"
            value={contactNote}
            onChange={(e) => setContactNote(e.target.value)}
            maxLength={255}
            placeholder="e.g. @telegram_handle or 9123 4567"
            className="mt-1.5 w-full rounded-2xl border border-slate-200 px-3.5 py-2.5 text-sm font-normal text-slate-800 placeholder:text-slate-500 focus:border-blue-600 focus:outline-none bg-white shadow-inner"
          />
        </label>
        {/* The note stays typed if the accept fails. */}
        <button
          type="button"
          data-testid="confirm-accept-order-btn"
          disabled={busy}
          onClick={() => {
            setConfirmingAccept(false);
            onAccept(order.id, contactNote.trim() || undefined);
          }}
          className={ACCENT}
        >
          {label('accept', `Confirm & accept for ${credits} credits`, 'Accepting…')}
        </button>
        <button
          type="button"
          data-testid="cancel-accept-order-btn"
          disabled={busy}
          onClick={() => {
            setConfirmingAccept(false);
            setContactNote('');
          }}
          className={GHOST_QUIET}
        >
          Not now
        </button>
      </div>
    ) : (
      <div className="space-y-2">
        {closedReminder}
        <button
          type="button"
          data-testid="accept-order-btn"
          disabled={busy}
          onClick={() => setConfirmingAccept(true)}
          className={ACCENT}
        >
          {label('accept', `Accept errand · earn ${credits} credits`, 'Accepting…')}
        </button>
        {caption(
          `You become the courier. The ${credits} credits are paid to you after the requester confirms delivery.`
        )}
      </div>
    );
  }
  if (role === 'courier') {
    if (order.status === 'ACCEPTED') {
      return (
        <div className="space-y-2">
          <button
            type="button"
            data-testid="pickup-order-btn"
            disabled={busy}
            onClick={() => onAction(order.id, 'pickup')}
            className={PRIMARY}
          >
            {label('pickup', `Picked up from ${order.supplierName ?? 'the spot'}`, 'Marking picked up…')}
          </button>
          {caption('Tells the requester the item is on its way.')}
          <button
            type="button"
            data-testid="unassign-order-btn"
            disabled={busy}
            onClick={() => onAction(order.id, 'unassign')}
            className={GHOST_DANGER}
          >
            {label('unassign', 'Drop errand', 'Dropping…')}
          </button>
        </div>
      );
    }
    if (order.status === 'IN_TRANSIT') {
      return (
        <div className="space-y-2">
          <button
            type="button"
            data-testid="deliver-order-btn"
            disabled={busy}
            onClick={() => onAction(order.id, 'deliver')}
            className={ACCENT}
          >
            {label('deliver', `Delivered to ${order.dropoffLocation}`, 'Marking delivered…')}
          </button>
          {caption(`Once the requester confirms delivery, ${credits} credits are released to you.`)}
        </div>
      );
    }
    if (order.status === 'DELIVERED') {
      return <CourierDisputeResponse order={order} actingAction={actingAction} onAction={onAction} />;
    }
  }
  if (role === 'requester') {
    if (order.status === 'DELIVERED') {
      return <DeliveredRequesterActions order={order} actingAction={actingAction} onAction={onAction} />;
    }
    if (order.status === 'OPEN' || order.status === 'ACCEPTED') {
      return (
        <div className="space-y-2">
          <button
            type="button"
            data-testid="cancel-order-btn"
            disabled={busy}
            onClick={() => onAction(order.id, 'cancel')}
            className={GHOST_DANGER}
          >
            {label('cancel', 'Cancel errand', 'Cancelling…')}
          </button>
          {caption(`Your ${credits} reserved credits will be returned to your balance.`)}
        </div>
      );
    }
    if (order.status === 'PENDING') return caption('Reserving your credits…');
    if (order.status === 'IN_TRANSIT')
      return caption('In transit. The courier has picked up your item.');
  }
  return null;
}

/** Whether the action block has anything for this viewer; otherwise it is not rendered at all. */
function showsActions(status: OrderDTO['status'], role: Role): boolean {
  if (role === 'other') return status === 'OPEN';
  if (role === 'courier')
    return status === 'ACCEPTED' || status === 'IN_TRANSIT' || status === 'DELIVERED';
  return (
    status === 'PENDING' ||
    status === 'OPEN' ||
    status === 'ACCEPTED' ||
    status === 'IN_TRANSIT' ||
    status === 'DELIVERED'
  );
}

export function ErrandDetailsPage({
  orderId,
  result,
  currentUserId,
  chat,
  onBack,
  onReload,
  actingAction,
  actionError,
  onAccept,
  onAction,
  supplier,
}: ErrandDetailsPageProps) {
  const order = result?.status === 'ok' ? result.order : null;
  const role: Role = order ? viewerRole(order, currentUserId) : 'other';
  const now = useMinuteClock();
  const actions =
    order && showsActions(order.status, role) ? (
      <Actions
        order={order}
        role={role}
        actingAction={actingAction}
        onAccept={onAccept}
        onAction={onAction}
        supplier={supplier}
        now={now}
      />
    ) : null;
  // A conversation exists from the first accept onwards and is retained after a courier drops the errand, while the
  // Order DTO then clears courierId / acceptedAt; so the panel is shown for every status from ACCEPTED on and the
  // Chat Service's 404 (never accepted) is rendered quietly by ChatPanel (PR #192 review).
  const showChat = Boolean(order && hasConversation(order.status) && role !== 'other');

  const actionBlock = (actions || actionError) && (
    <div data-testid="errand-actions" className="space-y-2">
      {actionError && (
        <p
          role="alert"
          className="rounded-2xl bg-rose-50 border border-rose-200 px-3.5 py-2.5 text-sm text-rose-700"
        >
          {actionError}{' '}
          <button
            type="button"
            data-testid="reload-errand-btn"
            onClick={onReload}
            className="font-bold underline"
          >
            Reload errand
          </button>
        </p>
      )}
      {actions}
    </div>
  );

  return (
    <div data-testid="errand-details" data-order-id={orderId} className="w-full max-w-3xl mx-auto space-y-4 sm:space-y-6">
      {/* Header: back, title, order code, status pill, countdown */}
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <button
            type="button"
            data-testid="errand-back-btn"
            onClick={onBack}
            aria-label="Back"
            className="-ml-2 h-10 w-10 shrink-0 rounded-full flex items-center justify-center text-slate-700 hover:bg-slate-200/80 transition cursor-pointer"
          >
            <ChevronLeft className="h-6 w-6" />
          </button>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-xl sm:text-2xl font-semibold text-slate-900 leading-tight">
                Errand
              </h2>
              {order && (
                <span className="font-mono text-xs font-bold text-campus-blue bg-campus-blue-soft border border-blue-100 px-2 py-0.5 rounded-md">
                  {order.orderCode}
                </span>
              )}
              {order && (
                <span
                  className={`rounded-full px-3 py-1 text-xs font-bold tracking-wide shadow-2xs ${statusBadgeClasses(
                    order.status
                  )}`}
                >
                  {order.status.replace(/_/g, ' ')}
                </span>
              )}
            </div>
          </div>
        </div>

        {order?.status === 'OPEN' && (
          <div className="self-start sm:self-auto">
            <Countdown expiresAt={order.expiresAt} />
          </div>
        )}
      </header>

      {result === null && (
        <p role="status" className="flex items-center gap-2 text-sm text-slate-500 py-12 justify-center">
          <RefreshCw className="h-4 w-4 animate-spin text-campus-blue" />
          <span>Loading errand…</span>
        </p>
      )}
      {result && result.status !== 'ok' && (
        <div
          role="alert"
          className={`${CARD} border-rose-200 bg-rose-50 p-5 text-sm text-rose-800 space-y-2 shadow-subtle`}
        >
          <p className="font-semibold">
            {result.status === 'error' ? result.message : 'This errand is no longer available to you.'}
          </p>
          {result.status === 'error' && (
            <button
              type="button"
              onClick={onReload}
              className="font-bold underline hover:text-rose-950"
            >
              Reload
            </button>
          )}
        </div>
      )}

      {order && (
        <div className="space-y-4 sm:space-y-5">
          {/* Main request card */}
          <ItemCard order={order} supplier={supplier} now={now} />

          {/* Primary action block (Accept, Pickup, Deliver, Complete, or Cancel) */}
          {actionBlock}

          {/* Participant and lifecycle progress */}
          <Participant
            order={order}
            role={role}
            hadCourier={Boolean(chat.threads[order.id]?.conversation)}
          />
          <Timeline order={order} role={role} />

          {/* Live chat conversation when active */}
          {showChat && (
            <Card className="p-4 sm:p-5 lg:h-[28rem] flex flex-col">
              <ChatPanel
                orderId={order.id}
                status={order.status}
                currentUserId={currentUserId}
                chat={chat}
              />
            </Card>
          )}

          {/* Clean footer */}
          <footer className="text-center text-xs text-slate-500 py-2">
            <p>Posted {dateTimeOf(order.createdAt)}</p>
          </footer>
        </div>
      )}
    </div>
  );
}
