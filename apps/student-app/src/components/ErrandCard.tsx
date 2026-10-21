/**
 * AI Assistance Disclosure:
 * Tool: Google Antigravity Agent, date: 2026-10-22
 * Scope: Added inline two-step confirmation (Confirm / Cancel) when clicking Accept Errand to prevent accidental single-click claims.
 * Author review: <to be completed by yanhwee>
 *
 * Tool: Google Antigravity Agent, date: 2026-10-19
 * Scope: Extracted errand card component from student-app App.tsx into components/ErrandCard.tsx.
 * Author review: Verified by yanhwee
 */

// AI-generated (edited by yanhwee)

import { OrderDTO } from '@campus-errand/common-dtos';
import { ArrowRight, Clock, Coins, MapPin } from 'lucide-react';
import { useState } from 'react';
import { ExpandableNotes } from './ExpandableNotes';

interface ErrandCardProps {
  order: OrderDTO;
  currentUserId: string | null;
  acceptingOrderId: string | null;
  onAcceptOrder: (orderId: string) => void;
}

export function ErrandCard({
  order,
  currentUserId,
  acceptingOrderId,
  onAcceptOrder,
}: ErrandCardProps) {
  const [confirmingAccept, setConfirmingAccept] = useState(false);

  return (
    <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-200 hover:shadow-md transition">
      <div className="flex items-start justify-between">
        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-bold bg-blue-50 text-nus-blue border border-blue-100">
          {order.campusZone}
        </span>
        <div className="flex items-center space-x-1 text-amber-600 font-black text-sm bg-amber-50 px-2.5 py-0.5 rounded-full border border-amber-200">
          <Coins className="w-3.5 h-3.5" />
          <span>+{order.rewardCredits} Credits</span>
        </div>
      </div>

      <h3
        title={order.itemDescription}
        className="font-bold text-slate-900 text-sm mt-2 h-10 leading-5 line-clamp-2"
      >
        {order.itemDescription}
      </h3>
      <ExpandableNotes notes={order.specialNotes} />

      <div className="mt-3 bg-slate-50 rounded-lg p-2.5 space-y-1.5 text-sm text-slate-700">
        <div className="grid grid-cols-[0.875rem_auto_minmax(0,1fr)] items-start gap-x-1.5">
          <MapPin className="w-3.5 h-3.5 mt-0.5 text-nus-blue" />
          <span className="font-semibold text-slate-600 whitespace-nowrap">Pickup:</span>
          <span className="min-w-0 whitespace-normal [overflow-wrap:anywhere]">
            {order.supplierName}
          </span>
        </div>
        <div className="grid grid-cols-[0.875rem_auto_minmax(0,1fr)] items-start gap-x-1.5">
          <ArrowRight className="w-3.5 h-3.5 mt-0.5 text-nus-orange" />
          <span className="font-semibold text-slate-600 whitespace-nowrap">Dropoff:</span>
          <span className="min-w-0 whitespace-normal [overflow-wrap:anywhere]">
            {order.dropoffLocation}
          </span>
        </div>
      </div>

      <div className="mt-3.5 flex items-center justify-between pt-2 border-t border-slate-100">
        <span className="text-xs text-slate-400 flex items-center space-x-1">
          <Clock className="w-3 h-3" />
          <span>
            Expires{' '}
            {new Date(order.expiresAt).toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit',
            })}
          </span>
        </span>

        {order.status === 'OPEN' ? (
          confirmingAccept && acceptingOrderId !== order.id && order.requesterId !== currentUserId ? (
            <div className="flex items-center space-x-1.5">
              <button
                type="button"
                data-testid="confirm-accept-order-btn"
                onClick={() => {
                  setConfirmingAccept(false);
                  onAcceptOrder(order.id);
                }}
                disabled={!!acceptingOrderId}
                className="bg-nus-orange hover:bg-orange-600 text-white font-bold text-xs px-3 py-1.5 rounded-lg shadow-sm transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Confirm
              </button>
              <button
                type="button"
                data-testid="cancel-accept-order-btn"
                onClick={() => setConfirmingAccept(false)}
                disabled={!!acceptingOrderId}
                className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs px-2.5 py-1.5 rounded-lg transition disabled:opacity-50"
              >
                Cancel
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setConfirmingAccept(true)}
              disabled={!!acceptingOrderId || order.requesterId === currentUserId}
              className="bg-nus-orange hover:bg-orange-600 text-white font-bold text-sm px-3.5 py-1.5 rounded-lg shadow-sm transition flex items-center space-x-1 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <span>
                {order.requesterId === currentUserId
                  ? 'Your errand'
                  : acceptingOrderId === order.id
                  ? 'Accepting…'
                  : 'Accept Errand'}
              </span>
            </button>
          )
        ) : (
          <span className="text-sm font-bold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded">
            Accepted by You
          </span>
        )}
      </div>
    </div>
  );
}
