/**
 * AI Assistance Disclosure:
 * Tool: Claude Code (model: Claude Sonnet 5.5), date: 2026-11-06
 * Scope: Admin dialog for a disputed errand: shows the requester's reason (read only) and settles it with Refund (the
 * existing admin cancel, which publishes order.cancelled) or Complete (the existing admin complete, which publishes
 * order.completed). Order Service clears the dispute flag in the same transaction.
 * Author review: <to be completed by the author>
 */
// AI-generated (edited by jagdeepsh)
import { useState } from 'react';
import { AlertCircle, AlertTriangle, RefreshCw, X } from 'lucide-react';
import { OrderDTO } from '@campus-errand/common-dtos';
import { executeAdminOrderActionApi } from '../api/orders';
import type { AuthFetchFn } from '../api/suppliers';

type Choice = 'cancel' | 'complete';

interface DisputeModalProps {
  order: OrderDTO | null;
  authFetch: AuthFetchFn;
  onClose: () => void;
  /** Called with the settled order and the server's message once the admin's choice has been applied. */
  onSettled: (order: OrderDTO, message: string) => void;
  /** Reloads the order list, used after a version conflict. */
  onReload: () => void;
}

export function DisputeModal({ order, authFetch, onClose, onSettled, onReload }: DisputeModalProps) {
  const [choice, setChoice] = useState<Choice | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  if (!order) return null;

  const close = () => {
    if (submitting) return;
    setChoice(null);
    setError(null);
    onClose();
  };

  const settle = async () => {
    if (!choice) return;
    setSubmitting(true);
    setError(null);
    try {
      const reason = choice === 'cancel'
        ? 'Dispute settled in favour of the requester (refund)'
        : 'Dispute settled in favour of the courier (completed)';
      const { res, data } = await executeAdminOrderActionApi(authFetch, order.id, choice, reason, order.version);
      if (!res.ok || !data.success) {
        if (res.status === 409) onReload();
        throw new Error(data.error || `Action failed with status ${res.status}`);
      }
      onSettled(data.data as OrderDTO, data.message || `Dispute on ${order.orderCode} settled.`);
      setChoice(null);
    } catch (err) {
      setError((err instanceof Error && err.message) || 'Could not settle the dispute.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="dialog-overlay fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div role="dialog" aria-label="Order dispute" className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center space-x-2">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-rose-100 text-rose-600">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-slate-900">Delivery dispute</h3>
              <p className="text-xs text-slate-500">
                Order: <span className="font-mono font-bold text-slate-700">{order.orderCode}</span> · {order.rewardCredits} credits held · v{order.version}
              </p>
            </div>
          </div>
          <button onClick={close} disabled={submitting} className="admin-square-button text-slate-400 hover:text-slate-600" aria-label="Close">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div>
          <label htmlFor="dispute-details" className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1">
            Requester's dispute details
          </label>
          <textarea
            id="dispute-details"
            readOnly
            rows={3}
            value={order.requesterDisputeDetails ?? ''}
            className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 bg-slate-50 text-slate-700 resize-none"
          />
        </div>

        <div>
          <label htmlFor="courier-dispute-details" className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1">
            Courier's dispute details
          </label>
          <textarea
            id="courier-dispute-details"
            readOnly
            rows={order.courierDisputeDetails ? 4 : 2}
            value={order.courierDisputeDetails ?? ''}
            placeholder="The courier has not responded yet."
            className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 bg-slate-50 text-slate-700 placeholder:text-slate-400 resize-none"
          />
        </div>

        {error && (
          <div className="p-3 rounded-xl text-xs border bg-rose-50 border-rose-200 text-rose-700 flex items-start space-x-2">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {choice ? (
          <div className="p-3 rounded-xl border border-slate-200 bg-slate-50 space-y-2">
            <p className="text-sm font-bold text-slate-800">
              {choice === 'cancel' ? 'Refund the requester and cancel this order?' : 'Complete the order and pay the courier?'}
            </p>
            <div className="flex space-x-2">
              <button
                type="button"
                disabled={submitting}
                onClick={() => void settle()}
                className={`flex items-center space-x-2 font-bold text-sm px-4 py-2 rounded-lg text-white disabled:opacity-50 ${choice === 'cancel' ? 'bg-rose-600 hover:bg-rose-700' : 'bg-emerald-600 hover:bg-emerald-700'}`}
              >
                {submitting && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                <span>Yes, {choice === 'cancel' ? 'refund' : 'complete'}</span>
              </button>
              <button type="button" disabled={submitting} onClick={() => setChoice(null)} className="px-4 py-2 text-sm font-bold text-slate-600 hover:bg-slate-100 rounded-lg">
                Back
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            <div className="flex space-x-2">
              <button
                type="button"
                data-testid="dispute-refund-btn"
                onClick={() => setChoice('cancel')}
                className="flex-1 font-bold text-sm px-4 py-2 rounded-lg text-white bg-rose-600 hover:bg-rose-700 shadow"
              >
                Refund
              </button>
              <button
                type="button"
                data-testid="dispute-complete-btn"
                onClick={() => setChoice('complete')}
                className="flex-1 font-bold text-sm px-4 py-2 rounded-lg text-white bg-emerald-600 hover:bg-emerald-700 shadow"
              >
                Complete
              </button>
            </div>
            <p className="text-[11px] leading-relaxed text-slate-400">
              Refund means you side with the requester: the credits are not transferred out and are returned from holding to the requester.
              Complete means you side with the courier: the order is completed and the credits are transferred to the courier.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
