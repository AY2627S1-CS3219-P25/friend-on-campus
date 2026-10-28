/**
 * AI Assistance Disclosure:
 * Tool: Google Antigravity Agent, date: 2026-10-28
 * Scope: Modernized ErrandDetailsPage with pulsing active tracker rings, route card layout, tactile action buttons, and responsive grid layout.
 * Author review: <to be completed by yanhwee>
 *
 * Tool: Claude Code (model: Claude Fable 5.1), date: 2026-10-26
 * Scope: UAT finding: the participant card's "Accepted <date>" line wraps instead of truncating at phone width.
 * Author review: <to be completed by Reallyeasy1>
 *
 * Tool: Claude Code (model: Claude Fable 5.1), date: 2026-10-26
 * Scope: The errand details page the author designed on 2026-10-26 (issues #188 and #189): header, status tracker with
 * the order's timestamps and a red end state, expiry countdown while open, pickup / dropoff / item / credits, the other
 * side's contact note (no names: author's option 1), the embedded chat panel, and every status action (Accept with its
 * confirm step and contact note, pickup, deliver, confirm delivery, cancel, drop) gated by status and viewer role; the
 * Order Service's error text is shown with a reload control. Review pass of the same day: contact notes shown to
 * participants only, accept note kept when the accept fails, tracker state also conveyed with aria-current and hidden
 * text, countdown copy after expiry. Restyled the same day to the author's wireframe: back header with status pill,
 * participant card, vertical timeline whose rows carry the pickup spot, dropoff and escrow amount, live chat card,
 * one primary action with a caption, two columns on desktop with the chat card stretched to the left column's height.
 * PR #192 review: the chat panel is kept for retained history after a drop, and the completion row no longer claims
 * the payout before Credit Service settles it.
 * Author review: <to be completed by Reallyeasy1>
 */

// AI-generated (edited by Reallyeasy1)
// AI-generated (edited by yanhwee)

import { useEffect, useState, type ReactNode } from 'react';
import type { OrderDTO } from '@campus-errand/common-dtos';
import { Check, ChevronLeft, Clock, Coins, MapPin, RefreshCw, User, X } from 'lucide-react';
import type { FetchOrderResult, TaskOrderAction } from '../api/orders';
import { ChatPanel } from '../chat/ChatPanel';
import type { ChatApi } from '../chat/useChat';
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
  onAction: (orderId: string, action: TaskOrderAction) => void;
}

type Role = ReturnType<typeof viewerRole>;

const timeOf = (iso: string) =>
  new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
const dateTimeOf = (iso: string) =>
  new Date(iso).toLocaleString([], {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });

const CARD = 'bg-white rounded-2xl border border-slate-200/90 shadow-subtle';
const BIG =
  'w-full inline-flex items-center justify-center gap-2 rounded-xl px-4 py-3.5 text-sm sm:text-base font-extrabold transition disabled:opacity-50 disabled:cursor-not-allowed';
const PRIMARY = `${BIG} bg-nus-blue hover:bg-blue-900 text-white shadow-md shadow-nus-blue/20`;
const ACCENT = `${BIG} bg-nus-orange hover:bg-orange-600 text-white shadow-md shadow-nus-orange/20`;
const GHOST =
  'w-full inline-flex items-center justify-center gap-1.5 rounded-xl px-4 py-2.5 text-xs sm:text-sm font-bold transition disabled:opacity-50 disabled:cursor-not-allowed border';
const GHOST_DANGER = `${GHOST} border-rose-200 text-rose-700 bg-white hover:bg-rose-50`;
const GHOST_QUIET = `${GHOST} border-slate-200 text-slate-700 bg-white hover:bg-slate-50`;

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
        className="h-11 w-11 shrink-0 rounded-2xl bg-nus-blue-50 border border-nus-blue-100 flex items-center justify-center text-nus-blue shadow-sm"
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
              ? 'border-nus-blue/40 text-nus-blue bg-nus-blue-50/50'
              : 'border-slate-200 text-slate-400 bg-slate-50'
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
          : 'Credit Service is reserving the reward',
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
                    step.state === 'done' ? 'bg-nus-blue' : 'bg-slate-200'
                  }`}
                />
              )}
              <span
                aria-hidden="true"
                className={`relative z-10 mt-0.5 h-6 w-6 shrink-0 rounded-full border-2 flex items-center justify-center transition-all ${
                  step.state === 'done'
                    ? 'bg-nus-blue border-nus-blue text-white shadow-sm'
                    : step.state === 'current'
                    ? 'bg-white border-nus-orange shadow-sm ring-4 ring-orange-100'
                    : 'bg-white border-slate-300'
                }`}
              >
                {step.state === 'done' && <Check className="h-3.5 w-3.5" strokeWidth={3} />}
                {step.state === 'current' && (
                  <span className="h-2.5 w-2.5 rounded-full bg-nus-orange animate-pulse" />
                )}
              </span>
              <div className="min-w-0 pt-0.5">
                <p
                  className={`text-xs sm:text-sm font-bold leading-5 break-words ${
                    step.state === 'todo' ? 'text-slate-400' : 'text-slate-900'
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
                    step.state === 'todo' ? 'text-slate-400' : 'text-slate-500'
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

function ItemCard({ order }: { order: OrderDTO }) {
  return (
    <Card className="p-4 sm:p-5 space-y-3.5" testId="item-card">
      <div>
        <p className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400">
          Errand Request
        </p>
        <p className="text-sm sm:text-base font-bold text-slate-900 break-words mt-0.5">
          {order.itemDescription}
        </p>
        <p
          className="text-xs sm:text-sm text-slate-600 whitespace-pre-wrap break-words mt-1.5 bg-slate-50/80 p-3 rounded-xl border border-slate-100"
          data-testid="special-notes-full"
        >
          {order.specialNotes || 'No special notes.'}
        </p>
      </div>
      <dl className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs">
        <div className="rounded-xl bg-slate-50/90 border border-slate-100 p-3 min-w-0">
          <dt className="flex items-center gap-1.5 text-slate-400 font-semibold mb-1">
            <MapPin className="h-3.5 w-3.5 text-nus-blue" />
            <span>Pickup</span>
          </dt>
          <dd className="text-slate-900 font-bold truncate" title={order.supplierName}>
            {order.supplierName ?? 'Pickup spot'}
          </dd>
          {order.campusZone && (
            <dd className="text-[11px] text-nus-blue font-semibold mt-0.5">{order.campusZone}</dd>
          )}
        </div>
        <div className="rounded-xl bg-slate-50/90 border border-slate-100 p-3 min-w-0">
          <dt className="flex items-center gap-1.5 text-slate-400 font-semibold mb-1">
            <MapPin className="h-3.5 w-3.5 text-nus-orange" />
            <span>Dropoff</span>
          </dt>
          <dd className="text-slate-900 font-bold truncate" title={order.dropoffLocation}>
            {order.dropoffLocation}
          </dd>
          <dd className="text-[11px] text-slate-500 mt-0.5">Final destination</dd>
        </div>
        <div className="rounded-xl bg-amber-50/80 border border-amber-200/80 p-3 min-w-0">
          <dt className="flex items-center gap-1.5 text-amber-700/80 font-semibold mb-1">
            <Coins className="h-3.5 w-3.5 text-amber-600 fill-amber-400" />
            <span>Escrow Reward</span>
          </dt>
          <dd className="text-amber-900 font-black text-sm">{order.rewardCredits} credits</dd>
          <dd className="text-[10px] text-amber-700/90 leading-tight mt-0.5">
            {escrowCopy(escrowState(order.status), order.rewardCredits)}
          </dd>
        </div>
      </dl>
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

/** The one thing to do next, as the wireframe's bottom button: a primary action, its caption, and any secondary one. */
function Actions({
  order,
  role,
  actingAction,
  onAccept,
  onAction,
}: {
  order: OrderDTO;
  role: Role;
  actingAction: ErrandDetailsPageProps['actingAction'];
  onAccept: ErrandDetailsPageProps['onAccept'];
  onAction: ErrandDetailsPageProps['onAction'];
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
    return confirmingAccept ? (
      <div className="space-y-2.5 bg-slate-50 p-4 rounded-2xl border border-slate-200 shadow-sm">
        <label className="block text-xs font-bold text-slate-700">
          Contact details for the requester (optional)
          <input
            type="text"
            data-testid="accept-contact-note-input"
            value={contactNote}
            onChange={(e) => setContactNote(e.target.value)}
            maxLength={255}
            placeholder="e.g. @telegram_handle or 9123 4567"
            className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-normal text-slate-800 placeholder:text-slate-400 focus:border-nus-blue focus:outline-none bg-white shadow-inner"
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
          `You become the courier. The ${credits} credits are paid to you after the requester confirms delivery and Credit Service settles the escrow.`
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
          {caption(`The requester confirms, then Credit Service releases ${credits} credits to you.`)}
        </div>
      );
    }
    if (order.status === 'DELIVERED')
      return caption('Delivered · Waiting for requester confirmation');
  }
  if (role === 'requester') {
    if (order.status === 'DELIVERED') {
      return (
        <div className="space-y-2">
          <button
            type="button"
            data-testid="complete-order-btn"
            disabled={busy}
            onClick={() => onAction(order.id, 'complete')}
            className={PRIMARY}
          >
            {label('complete', `Confirm received & release ${credits} credits`, 'Confirming…')}
          </button>
          {caption(`Releases ${credits} credits from escrow to the courier; Credit Service settles the transfer.`)}
        </div>
      );
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
          {caption(`Your ${credits} reserved credits are returned by Credit Service.`)}
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
}: ErrandDetailsPageProps) {
  const order = result?.status === 'ok' ? result.order : null;
  const role: Role = order ? viewerRole(order, currentUserId) : 'other';
  const actions =
    order && showsActions(order.status, role) ? (
      <Actions
        order={order}
        role={role}
        actingAction={actingAction}
        onAccept={onAccept}
        onAction={onAction}
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
          className="rounded-xl bg-rose-50 border border-rose-200 px-3 py-2 text-sm text-rose-700"
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
    <div className="max-w-5xl mx-auto" data-testid="errand-details" data-order-id={orderId}>
      {/* Header: back, title, status pill, as the wireframe's top row. */}
      <header className="flex items-center gap-2 mb-4">
        <button
          type="button"
          data-testid="errand-back-btn"
          onClick={onBack}
          aria-label="Back"
          className="-ml-2 h-10 w-10 shrink-0 rounded-full flex items-center justify-center text-slate-700 hover:bg-slate-200/80 transition"
        >
          <ChevronLeft className="h-6 w-6" />
        </button>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h2 className="text-lg lg:text-xl font-black text-slate-900 leading-tight truncate">
              Errand
            </h2>
            {order && (
              <span className="font-mono text-xs font-bold text-nus-blue bg-nus-blue-50 border border-nus-blue-100 px-2 py-0.5 rounded-md">
                {order.orderCode}
              </span>
            )}
          </div>
          {order && (
            <p className="text-xs text-slate-500 truncate mt-0.5" title={order.itemDescription}>
              {order.itemDescription}
            </p>
          )}
        </div>
        {order && (
          <span
            className={`shrink-0 rounded-full px-3 py-1 text-xs font-bold tracking-wide shadow-sm ${statusBadgeClasses(
              order.status
            )}`}
          >
            {order.status.replace(/_/g, ' ')}
          </span>
        )}
      </header>

      {result === null && (
        <p role="status" className="flex items-center gap-2 text-sm text-slate-500 py-12 justify-center">
          <RefreshCw className="h-4 w-4 animate-spin text-nus-blue" />
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
        <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(0,26rem)] lg:gap-6 lg:items-stretch">
          {/* Left column: who, what, where it stands. */}
          <div className="space-y-3.5">
            {order.status === 'OPEN' && <Countdown expiresAt={order.expiresAt} />}
            <Participant
              order={order}
              role={role}
              hadCourier={Boolean(chat.threads[order.id]?.conversation)}
            />
            <Timeline order={order} role={role} />
            <ItemCard order={order} />
          </div>

          {/* Right column on desktop: the live chat and the action. On phones they follow in the single column. */}
          <div className="mt-3.5 lg:mt-0 lg:relative lg:min-h-[34rem]">
            <div className="flex flex-col gap-3 lg:absolute lg:inset-0">
              {showChat && (
                <Card className="p-4 sm:p-5 lg:flex-1 lg:flex lg:flex-col lg:min-h-0">
                  <ChatPanel
                    orderId={order.id}
                    status={order.status}
                    currentUserId={currentUserId}
                    chat={chat}
                  />
                </Card>
              )}
              {actionBlock}
              <footer className="text-[11px] text-slate-400 space-y-0.5 px-1 pt-1">
                <p className="break-all font-mono">Order ID {order.id}</p>
                <p>Posted {dateTimeOf(order.createdAt)}</p>
              </footer>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
