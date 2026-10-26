/**
 * AI Assistance Disclosure:
 * Tool: Claude Code (model: Claude Fable 5.1), date: 2026-10-26
 * Scope: The errand details page the author designed on 2026-10-26 (issues #188 and #189): header, five-step status
 * tracker with the order's timestamps and a red end state, expiry countdown while open, pickup / dropoff / item /
 * credits sections, the other side's contact note (no names: author's option 1), the embedded chat panel, and every
 * status action (Accept with its confirm step and contact note, pickup, deliver, confirm delivery, cancel, drop)
 * gated by status and viewer role; the Order Service's error text is shown with a reload control. Review pass of the
 * same day: contact notes shown to participants only, accept note kept when the accept fails, tracker state also
 * conveyed with aria-current and hidden text, countdown copy after expiry.
 * Author review: <to be completed by Reallyeasy1>
 */
// AI-generated (edited by Reallyeasy1)
import { useEffect, useState, type ReactNode } from 'react';
import type { OrderDTO } from '@campus-errand/common-dtos';
import { ArrowLeft, CheckCircle2, Clock, Coins, MapPin, PackageCheck, RefreshCw, Truck, XCircle } from 'lucide-react';
import type { FetchOrderResult, TaskOrderAction } from '../api/orders';
import { ChatPanel } from '../chat/ChatPanel';
import type { ChatApi } from '../chat/useChat';
import { endState, escrowCopy, escrowState, formatCountdown, hasConversation, statusBadgeClasses, trackerSteps, viewerRole } from './details';

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

const when = (iso: string) => new Date(iso).toLocaleString([], { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });

const BTN = 'inline-flex items-center justify-center gap-1.5 font-bold text-sm px-4 py-2.5 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed';
const PRIMARY = `${BTN} bg-nus-blue hover:bg-blue-800 text-white shadow-sm`;
const ACCENT = `${BTN} bg-nus-orange hover:bg-orange-600 text-white shadow-sm`;
const SUCCESS = `${BTN} bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm`;
const DANGER = `${BTN} bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200`;
const QUIET = `${BTN} bg-slate-100 hover:bg-slate-200 text-slate-700`;

function Section({ title, children, testId }: { title: string; children: ReactNode; testId?: string }) {
  return (
    <section data-testid={testId} className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 space-y-2">
      <h3 className="text-xs font-bold uppercase tracking-wide text-slate-500">{title}</h3>
      {children}
    </section>
  );
}

function Tracker({ order }: { order: OrderDTO }) {
  const steps = trackerSteps(order);
  const end = endState(order);
  return (
    <Section title="Status" testId="status-tracker">
      <ol className="grid grid-cols-5 gap-1 text-center">
        {steps.map((step) => (
          <li key={step.key} data-step={step.key} data-state={step.state} aria-current={step.state === 'current' ? 'step' : undefined} className="space-y-1 min-w-0">
            <span
              aria-hidden="true"
              className={`mx-auto block h-3 w-3 rounded-full ${
                step.state === 'done' ? 'bg-emerald-500' : step.state === 'current' ? 'ring-2 ring-nus-orange bg-white' : 'bg-slate-200'
              }`}
            />
            <p className={`text-[11px] leading-4 font-semibold ${step.state === 'todo' ? 'text-slate-400' : 'text-slate-700'}`}>
              {step.label}
              <span className="sr-only">{step.state === 'done' ? ' (done)' : step.state === 'current' ? ' (current)' : ' (not yet)'}</span>
            </p>
            {step.at && <time dateTime={step.at} className="block text-[10px] leading-3 text-slate-500">{when(step.at)}</time>}
          </li>
        ))}
      </ol>
      {end && (
        <p data-testid="end-state" className="rounded-lg bg-rose-50 border border-rose-200 px-3 py-2 text-sm text-rose-700">
          <span className="font-bold">{end.label}</span>
          {end.reason && <span> · Reason: {end.reason}</span>}
          {!end.reason && end.label === 'Disputed' && <span> · An admin is reviewing this errand</span>}
        </p>
      )}
    </Section>
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
    <p data-testid="expiry-countdown" className="flex items-center gap-1.5 text-sm font-semibold text-amber-700">
      <Clock className="h-4 w-4" /> {remaining === '0:00' ? 'Expiry time reached; closing shortly' : `Expires in ${remaining}`}
    </p>
  );
}

function Actions({ order, role, actingAction, onAccept, onAction }: {
  order: OrderDTO;
  role: ReturnType<typeof viewerRole>;
  actingAction: ErrandDetailsPageProps['actingAction'];
  onAccept: ErrandDetailsPageProps['onAccept'];
  onAction: ErrandDetailsPageProps['onAction'];
}) {
  const [confirmingAccept, setConfirmingAccept] = useState(false);
  const [contactNote, setContactNote] = useState('');
  const busy = actingAction !== null;
  const label = (action: ErrandDetailsPageProps['actingAction'], idle: string, active: string) => (actingAction === action ? active : idle);

  if (order.status === 'OPEN' && role === 'other') {
    return confirmingAccept ? (
      <div className="space-y-2">
        <label className="block text-xs font-semibold text-slate-600">
          Contact details for requester (optional)
          <input
            type="text"
            data-testid="accept-contact-note-input"
            value={contactNote}
            onChange={(e) => setContactNote(e.target.value)}
            maxLength={255}
            placeholder="e.g. @telegram_handle or 9123 4567"
            className="mt-1 w-full rounded-lg border border-slate-200 px-2.5 py-2 text-sm font-normal text-slate-800 placeholder:text-slate-400 focus:border-nus-blue focus:outline-none"
          />
        </label>
        <div className="flex gap-2">
          <button
            type="button"
            data-testid="confirm-accept-order-btn"
            disabled={busy}
            onClick={() => { setConfirmingAccept(false); onAccept(order.id, contactNote.trim() || undefined); }} // the note stays typed if the accept fails
            className={`flex-1 ${ACCENT}`}
          >
            {label('accept', 'Confirm', 'Accepting…')}
          </button>
          <button type="button" data-testid="cancel-accept-order-btn" disabled={busy} onClick={() => { setConfirmingAccept(false); setContactNote(''); }} className={QUIET}>
            Cancel
          </button>
        </div>
      </div>
    ) : (
      <button type="button" data-testid="accept-order-btn" disabled={busy} onClick={() => setConfirmingAccept(true)} className={`w-full ${ACCENT}`}>
        {label('accept', 'Accept Errand', 'Accepting…')}
      </button>
    );
  }
  if (role === 'courier') {
    if (order.status === 'ACCEPTED') {
      return (
        <div className="flex flex-col sm:flex-row gap-2">
          <button type="button" data-testid="pickup-order-btn" disabled={busy} onClick={() => onAction(order.id, 'pickup')} className={`flex-1 ${PRIMARY}`}>
            <Truck className="h-4 w-4" /> {label('pickup', 'Mark Picked Up', 'Marking Picked Up…')}
          </button>
          <button type="button" data-testid="unassign-order-btn" disabled={busy} onClick={() => onAction(order.id, 'unassign')} className={DANGER}>
            <XCircle className="h-4 w-4" /> {label('unassign', 'Drop Errand', 'Dropping…')}
          </button>
        </div>
      );
    }
    if (order.status === 'IN_TRANSIT') {
      return (
        <button type="button" data-testid="deliver-order-btn" disabled={busy} onClick={() => onAction(order.id, 'deliver')} className={`w-full ${ACCENT}`}>
          <PackageCheck className="h-4 w-4" /> {label('deliver', 'Mark Delivered', 'Marking Delivered…')}
        </button>
      );
    }
    if (order.status === 'DELIVERED') return <p className="text-sm font-medium text-blue-700">Delivered · Waiting for requester confirmation</p>;
  }
  if (role === 'requester') {
    if (order.status === 'DELIVERED') {
      return (
        <button type="button" data-testid="complete-order-btn" disabled={busy} onClick={() => onAction(order.id, 'complete')} className={`w-full ${SUCCESS}`}>
          <CheckCircle2 className="h-4 w-4" /> {label('complete', 'Confirm Delivery', 'Confirming Delivery…')}
        </button>
      );
    }
    if (order.status === 'OPEN' || order.status === 'ACCEPTED') {
      return (
        <button type="button" data-testid="cancel-order-btn" disabled={busy} onClick={() => onAction(order.id, 'cancel')} className={`w-full ${DANGER}`}>
          <XCircle className="h-4 w-4" /> {label('cancel', 'Cancel Errand', 'Cancelling…')}
        </button>
      );
    }
    if (order.status === 'PENDING') return <p className="text-sm font-medium text-amber-700">Reserving credits…</p>;
    if (order.status === 'IN_TRANSIT') return <p className="text-sm font-medium text-amber-700">In transit · Courier has picked up your item</p>;
  }
  return null;
}

/** Whether the Actions block has a button or a status line for this viewer; otherwise the card is not shown at all. */
function showsActions(status: OrderDTO['status'], role: ReturnType<typeof viewerRole>): boolean {
  if (role === 'other') return status === 'OPEN';
  if (role === 'courier') return status === 'ACCEPTED' || status === 'IN_TRANSIT' || status === 'DELIVERED';
  return status === 'PENDING' || status === 'OPEN' || status === 'ACCEPTED' || status === 'IN_TRANSIT' || status === 'DELIVERED';
}

export function ErrandDetailsPage({ orderId, result, currentUserId, chat, onBack, onReload, actingAction, actionError, onAccept, onAction }: ErrandDetailsPageProps) {
  const order = result?.status === 'ok' ? result.order : null;
  const role = order ? viewerRole(order, currentUserId) : 'other';
  const actions = order && showsActions(order.status, role)
    ? <Actions order={order} role={role} actingAction={actingAction} onAccept={onAccept} onAction={onAction} />
    : null;

  return (
    <div className="max-w-3xl mx-auto space-y-4" data-testid="errand-details" data-order-id={orderId}>
      <button type="button" data-testid="errand-back-btn" onClick={onBack} className="inline-flex items-center gap-1 text-sm font-semibold text-blue-700 hover:underline">
        <ArrowLeft className="h-4 w-4" /> Back
      </button>

      {result === null && (
        <p role="status" className="flex items-center gap-2 text-sm text-slate-500"><RefreshCw className="h-4 w-4 animate-spin" /> Loading errand…</p>
      )}
      {result && result.status !== 'ok' && (
        <div role="alert" className="rounded-xl bg-rose-50 border border-rose-200 p-4 text-sm text-rose-700 space-y-2">
          <p>{result.status === 'error' ? result.message : 'This errand is no longer available to you.'}</p>
          {result.status === 'error' && <button type="button" onClick={onReload} className="font-bold underline">Reload</button>}
        </div>
      )}

      {order && (
        <>
          <header className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm font-mono font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded">{order.orderCode}</span>
              <span className={`text-xs font-bold px-2 py-1 rounded ${statusBadgeClasses(order.status)}`}>{order.status.replace(/_/g, ' ')}</span>
              {order.campusZone && (
                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-bold bg-blue-50 text-nus-blue border border-blue-100">{order.campusZone}</span>
              )}
            </div>
            <h2 className="text-xl lg:text-2xl font-bold text-slate-900 break-words">{order.itemDescription}</h2>
            {order.status === 'OPEN' && <Countdown expiresAt={order.expiresAt} />}
          </header>

          <Tracker order={order} />

          {(actions || actionError) && (
            <Section title="Actions" testId="errand-actions">
              {actionError && (
                <p role="alert" className="rounded-lg bg-rose-50 border border-rose-200 px-3 py-2 text-sm text-rose-700">
                  {actionError}{' '}
                  <button type="button" data-testid="reload-errand-btn" onClick={onReload} className="font-bold underline">Reload errand</button>
                </p>
              )}
              {actions}
            </Section>
          )}

          <Section title="Pickup">
            <p className="flex items-start gap-1.5 text-sm text-slate-800"><MapPin className="h-4 w-4 mt-0.5 text-nus-blue shrink-0" /><span>{order.supplierName ?? 'Pickup spot'}{order.campusZone ? ` · ${order.campusZone}` : ''}</span></p>
          </Section>

          <Section title="Dropoff">
            <p className="text-sm text-slate-800">{order.dropoffLocation}</p>
            {/* Participants only: a pasted link must not show a phone number to someone outside the errand. */}
            {role === 'courier' && order.requesterContactNote && (
              <p className="text-sm text-slate-600"><span className="font-semibold">Requester's contact note:</span> {order.requesterContactNote}</p>
            )}
          </Section>

          <Section title="Item">
            <p className="text-sm text-slate-800 break-words">{order.itemDescription}</p>
            <p className="text-sm text-slate-600 whitespace-pre-wrap break-words" data-testid="special-notes-full">{order.specialNotes || 'No special notes.'}</p>
          </Section>

          <Section title="Credits">
            <p className="flex items-center gap-1.5 text-sm font-bold text-amber-700"><Coins className="h-4 w-4" /> {order.rewardCredits} credits</p>
            <p className="text-sm text-slate-600">{escrowCopy(escrowState(order.status), order.rewardCredits)}</p>
          </Section>

          {role === 'requester' && order.courierId && (
            <Section title="Courier">
              <p className="text-sm text-slate-600">
                <span className="font-semibold">Contact note:</span> {order.courierContactNote || 'Not provided'}
              </p>
            </Section>
          )}

          {hasConversation(order.status) && role !== 'other' && (
            <Section title="Conversation">
              <ChatPanel orderId={order.id} status={order.status} currentUserId={currentUserId} chat={chat} />
            </Section>
          )}

          <footer className="text-xs text-slate-500 space-y-0.5 px-1">
            <p>Order ID {order.id}</p>
            <p>Posted {when(order.createdAt)}</p>
          </footer>
        </>
      )}
    </div>
  );
}
