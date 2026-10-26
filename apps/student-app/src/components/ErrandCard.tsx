/**
 * AI Assistance Disclosure:
 * Tool: Claude Code (model: Claude Fable 5.1), date: 2026-10-26
 * Scope: Errand details page (issues #188, #189; author's design of 2026-10-26): the feed card is now a summary that
 * links to the errand's page (/?tab=feed&orderId=), where Accept with its confirm step and contact note now lives.
 * Author review: <to be completed by Reallyeasy1>
 *
 * Tool: Google Antigravity Agent, date: 2026-10-22
 * Scope: Added inline two-step confirmation (Confirm / Cancel) with optional courierContactNote input (F3.3.6) when clicking Accept Errand to prevent accidental single-click claims.
 * Author review: <to be completed by yanhwee>
 *
 * Tool: Google Antigravity Agent, date: 2026-10-19
 * Scope: Extracted errand card component from student-app App.tsx into components/ErrandCard.tsx.
 * Author review: Verified by yanhwee
 */

// AI-generated (edited by yanhwee)
// AI-generated (edited by Reallyeasy1)

import { OrderDTO } from '@campus-errand/common-dtos';
import { ArrowRight, Clock, Coins, MapPin } from 'lucide-react';
import { ExpandableNotes } from './ExpandableNotes';

interface ErrandCardProps {
  order: OrderDTO;
  currentUserId: string | null;
  /** Opens the errand's details page (#188), which carries Accept. */
  onOpenErrand: (orderId: string) => void;
}

export function ErrandCard({ order, currentUserId, onOpenErrand }: ErrandCardProps) {
  const mine = order.requesterId === currentUserId;
  return (
    <article className="relative bg-white rounded-xl p-4 shadow-sm border border-slate-200 hover:shadow-md transition focus-within:ring-2 focus-within:ring-nus-orange">
      <div>
        <div className="flex items-start justify-between">
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-bold bg-blue-50 text-nus-blue border border-blue-100">
            {order.campusZone}
          </span>
          <div className="flex items-center space-x-1 text-amber-600 font-black text-sm bg-amber-50 px-2.5 py-0.5 rounded-full border border-amber-200">
            <Coins className="w-3.5 h-3.5" />
            <span>+{order.rewardCredits} Credits</span>
          </div>
        </div>

        <h3 title={order.itemDescription} className="font-bold text-slate-900 text-sm mt-2 h-10 leading-5 line-clamp-2">
          {order.itemDescription}
        </h3>
        <ExpandableNotes notes={order.specialNotes} />

        <div className="mt-3 bg-slate-50 rounded-lg p-2.5 space-y-1.5 text-sm text-slate-700">
          <div className="grid grid-cols-[0.875rem_auto_minmax(0,1fr)] items-start gap-x-1.5">
            <MapPin className="w-3.5 h-3.5 mt-0.5 text-nus-blue" />
            <span className="font-semibold text-slate-600 whitespace-nowrap">Pickup:</span>
            <span className="min-w-0 whitespace-normal [overflow-wrap:anywhere]">{order.supplierName}</span>
          </div>
          <div className="grid grid-cols-[0.875rem_auto_minmax(0,1fr)] items-start gap-x-1.5">
            <ArrowRight className="w-3.5 h-3.5 mt-0.5 text-nus-orange" />
            <span className="font-semibold text-slate-600 whitespace-nowrap">Dropoff:</span>
            <span className="min-w-0 whitespace-normal [overflow-wrap:anywhere]">{order.dropoffLocation}</span>
          </div>
        </div>

        <div className="mt-3.5 flex items-center justify-between pt-2 border-t border-slate-100">
          <span className="text-xs text-slate-400 flex items-center space-x-1">
            <Clock className="w-3 h-3" />
            <span>Expires {new Date(order.expiresAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
          </span>
          {/* The footer link is stretched over the whole card (after:inset-0), so the card is the link without
              wrapping other interactive content; Show more sits above it (z-10). */}
          <a
            href={`/?tab=feed&orderId=${encodeURIComponent(order.id)}`}
            data-testid="open-errand-link"
            aria-label={`View details of errand ${order.orderCode}`}
            onClick={(event) => { event.preventDefault(); onOpenErrand(order.id); }}
            className={`inline-flex items-center gap-1 rounded focus:outline-none after:absolute after:inset-0 after:rounded-xl after:content-[''] ${
              mine ? 'text-xs font-bold text-slate-500 bg-slate-100 px-2.5 py-1' : 'text-sm font-bold text-nus-orange'
            }`}
          >
            {mine ? 'Your errand' : <>View &amp; accept <ArrowRight className="h-4 w-4" /></>}
          </a>
        </div>
      </div>
    </article>
  );
}
