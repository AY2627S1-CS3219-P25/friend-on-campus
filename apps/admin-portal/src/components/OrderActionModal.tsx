/**
 * AI Assistance Disclosure:
 * Tool: Google Antigravity Agent, date: 2026-10-19
 * Scope: Extracted AdminOrderActionModal intervention dialog into src/components/OrderActionModal.tsx.
 * Author review: Verified by yanhwee on 2026-10-19
 */

// AI-generated (edited by yanhwee)

import {
  AlertCircle,
  AlertTriangle,
  CheckSquare,
  RefreshCw,
  UserX,
  X,
} from 'lucide-react';
import { OrderDTO } from '@campus-errand/common-dtos';

interface OrderActionModalProps {
  targetOrderForAction: OrderDTO | null;
  orderActionType: 'cancel' | 'complete' | 'unassign' | null;
  closeOrderActionModal: () => void;
  isConflictError: boolean;
  orderActionError: string | null;
  fetchOrders: () => void;
  orderActionReason: string;
  setOrderActionReason: (reason: string) => void;
  isSubmittingOrderAction: boolean;
  handleExecuteOrderAction: () => void;
}

export function OrderActionModal({
  targetOrderForAction,
  orderActionType,
  closeOrderActionModal,
  isConflictError,
  orderActionError,
  fetchOrders,
  orderActionReason,
  setOrderActionReason,
  isSubmittingOrderAction,
  handleExecuteOrderAction,
}: OrderActionModalProps) {
  return (
    <>
      {/* Admin Order Action Modal */}
      {targetOrderForAction && orderActionType && (
        <div className="dialog-overlay fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center space-x-2">
                <div
                  className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                    orderActionType === 'cancel'
                      ? 'bg-rose-100 text-rose-600'
                      : orderActionType === 'complete'
                      ? 'bg-emerald-100 text-emerald-600'
                      : 'bg-amber-100 text-amber-600'
                  }`}
                >
                  {orderActionType === 'cancel' ? (
                    <AlertTriangle className="w-5 h-5" />
                  ) : orderActionType === 'complete' ? (
                    <CheckSquare className="w-5 h-5" />
                  ) : (
                    <UserX className="w-5 h-5" />
                  )}
                </div>
                <div>
                  <h3 className="font-bold text-base text-slate-900">
                    {orderActionType === 'cancel'
                      ? 'Admin Force Cancel Errand'
                      : orderActionType === 'complete'
                      ? 'Admin Force Complete Errand'
                      : 'Admin Unassign Courier'}
                  </h3>
                  <p className="text-xs text-slate-500">
                    Order: <span className="font-mono font-bold text-slate-700">{targetOrderForAction.orderCode}</span> (v{targetOrderForAction.version})
                  </p>
                </div>
              </div>
              <button
                onClick={closeOrderActionModal}
                disabled={isSubmittingOrderAction}
                className="admin-square-button text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Invariant Explanation Banner */}
            <div
              className={`p-3.5 rounded-xl text-xs space-y-1.5 border ${
                orderActionType === 'cancel'
                  ? 'bg-rose-50 border-rose-200 text-rose-800'
                  : orderActionType === 'complete'
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                  : 'bg-amber-50 border-amber-200 text-amber-800'
              }`}
            >
              <p className="font-bold">
                {orderActionType === 'cancel'
                  ? '⚠️ Escrow Refund Guarantee'
                  : orderActionType === 'complete'
                  ? '💰 Escrow Payout Transfer'
                  : '🔄 Courier State Reset'}
              </p>
              <p>
                {orderActionType === 'cancel'
                  ? `Cancelling will set status to CANCELLED and immediately publish an order.cancelled event to refund ${targetOrderForAction.rewardCredits} held credits back to the requester.`
                  : orderActionType === 'complete'
                  ? `Force-completing sets status to COMPLETED and publishes an order.completed event to release ${targetOrderForAction.rewardCredits} credits to courier ${targetOrderForAction.courierId ? targetOrderForAction.courierId.slice(0, 8) + '...' : 'assigned courier'}.`
                  : `Unassigning will revert status to OPEN and clear the courier assignment, allowing another student to accept the errand. Requester escrow remains safely held.`}
              </p>
            </div>

            {/* Concurrency Guard Notice */}
            <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200 text-[11px] text-slate-600 flex items-center justify-between">
              <span>Optimistic Concurrency Lock:</span>
              <span className="font-mono font-bold bg-white px-2 py-0.5 rounded border border-slate-200">
                Expected Version {targetOrderForAction.version}
              </span>
            </div>

            {/* Conflict / Error Banner */}
            {orderActionError && (
              <div
                className={`p-3 rounded-xl text-sm border space-y-2 ${
                  isConflictError
                    ? 'bg-amber-50 border-amber-200 text-amber-800'
                    : 'bg-rose-50 border-rose-200 text-rose-700'
                }`}
              >
                <div className="flex items-start space-x-2">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="font-bold">{isConflictError ? 'Version Conflict (HTTP 409)' : 'Action Error'}</p>
                    <p className="text-xs mt-0.5">{orderActionError}</p>
                  </div>
                </div>
                {isConflictError && (
                  <button
                    type="button"
                    onClick={() => {
                      fetchOrders();
                      closeOrderActionModal();
                    }}
                    className="w-full bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs py-1.5 rounded-lg transition"
                  >
                    Refresh Order List & Close
                  </button>
                )}
              </div>
            )}

            {/* Mandatory Reason Input */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1">
                Administrative Audit Reason <span className="text-rose-500">*</span>
              </label>
              <textarea
                required
                rows={3}
                maxLength={500}
                value={orderActionReason}
                onChange={(e) => setOrderActionReason(e.target.value)}
                placeholder="Explain why admin intervention is required (e.g. Courier emergency uncontactable, Student dispute resolved, Errand duplicate)..."
                disabled={isSubmittingOrderAction}
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <div className="flex justify-between items-center text-[11px] text-slate-400 mt-1">
                <span>Reason will be immutably recorded in the order audit notes.</span>
                <span>{orderActionReason.length}/500</span>
              </div>
            </div>

            {/* Footer Buttons */}
            <div className="flex justify-end space-x-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                disabled={isSubmittingOrderAction}
                onClick={closeOrderActionModal}
                className="px-4 py-2 text-sm font-bold text-slate-600 hover:bg-slate-100 rounded-lg transition"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isSubmittingOrderAction || !orderActionReason.trim()}
                onClick={handleExecuteOrderAction}
                className={`flex items-center justify-center space-x-2 font-bold text-sm px-4 py-2 rounded-lg shadow transition disabled:opacity-50 text-white ${
                  orderActionType === 'cancel'
                    ? 'bg-rose-600 hover:bg-rose-700'
                    : orderActionType === 'complete'
                    ? 'bg-emerald-600 hover:bg-emerald-700'
                    : 'bg-amber-600 hover:bg-amber-700'
                }`}
              >
                {isSubmittingOrderAction && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                <span>
                  {isSubmittingOrderAction
                    ? 'Executing…'
                    : orderActionType === 'cancel'
                    ? 'Confirm Cancellation'
                    : orderActionType === 'complete'
                    ? 'Force Complete & Pay Escrow'
                    : 'Unassign Courier'}
                </span>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
