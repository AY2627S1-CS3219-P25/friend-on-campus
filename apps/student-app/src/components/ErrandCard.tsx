/**
 * AI Assistance Disclosure:
 * Tool: Google Antigravity Agent, date: 2026-10-28
 * Scope: Modernized errand feed card with elevated card styling, visual route connection (pickup -> dropoff), relative urgency countdown, and accessible touch targets.
 * Author review: <to be completed by yanhwee>
 *
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

function getRelativeExpiry(expiresAt: string): { label: string; urgent: boolean; critical: boolean } {
  const diffMs = new Date(expiresAt).getTime() - Date.now();
  if (diffMs <= 0) return { label: 'Expired', urgent: true, critical: true };
  const diffMinutes = Math.floor(diffMs / 60000);
  if (diffMinutes < 15) return { label: `Expires in ${diffMinutes}m`, urgent: true, critical: true };
  if (diffMinutes < 60) return { label: `Expires in ${diffMinutes}m`, urgent: true, critical: false };
  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return { label: `Expires in ${diffHours}h`, urgent: false, critical: false };
  return {
    label: `Expires ${new Date(expiresAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`,
    urgent: false,
    critical: false,
  };
}

export function ErrandCard({ order, currentUserId, onOpenErrand }: ErrandCardProps) {
  const mine = order.requesterId === currentUserId;
  const expiry = getRelativeExpiry(order.expiresAt);

  return (
    <article className="group relative flex flex-col justify-between bg-white rounded-2xl p-4 sm:p-5 shadow-subtle border border-slate-200/90 hover:border-nus-blue/40 hover:shadow-elevated hover:-translate-y-0.5 transition-all duration-200 focus-within:ring-2 focus-within:ring-nus-orange">
      <div>
        {/* Header: Zone Badge + Reward Badge */}
        <div className="flex items-center justify-between gap-2">
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-nus-blue-50 text-nus-blue border border-nus-blue-100">
            <span className="h-1.5 w-1.5 rounded-full bg-nus-blue" />
            {order.campusZone}
          </span>
          <div className="inline-flex items-center gap-1.5 text-amber-700 font-extrabold text-xs sm:text-sm bg-gradient-to-r from-amber-50 to-orange-50 px-3 py-1 rounded-full border border-amber-200 shadow-sm">
            <Coins className="w-3.5 h-3.5 text-amber-500 fill-amber-400" />
            <span>+{order.rewardCredits} Credits</span>
          </div>
        </div>

        {/* Item Title */}
        <h3
          title={order.itemDescription}
          className="font-bold text-slate-900 text-base mt-3 leading-snug line-clamp-2 group-hover:text-nus-blue transition-colors"
        >
          {order.itemDescription}
        </h3>

        {/* Expandable Notes */}
        <div className="mt-1">
          <ExpandableNotes notes={order.specialNotes} />
        </div>

        {/* Route Card (Pickup -> Dropoff) */}
        <div className="mt-3.5 bg-slate-50/80 rounded-xl p-3 border border-slate-100 space-y-2 text-xs">
          <div className="flex items-center gap-2">
            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-nus-blue-50 text-nus-blue border border-nus-blue-100">
              <MapPin className="w-3 h-3" />
            </span>
            <span className="font-bold text-slate-500 shrink-0">Pickup:</span>
            <span className="font-semibold text-slate-800 truncate" title={order.supplierName}>
              {order.supplierName}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-nus-orange-50 text-nus-orange border border-nus-orange-100">
              <ArrowRight className="w-3 h-3" />
            </span>
            <span className="font-bold text-slate-500 shrink-0">Dropoff:</span>
            <span className="font-semibold text-slate-800 truncate" title={order.dropoffLocation}>
              {order.dropoffLocation}
            </span>
          </div>
        </div>
      </div>

      {/* Footer: Expiration & Action CTA */}
      <div className="mt-4 flex items-center justify-between pt-3 border-t border-slate-100 text-xs">
        <span
          className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md font-medium transition ${
            expiry.critical
              ? 'bg-rose-50 text-rose-700 border border-rose-200 font-bold'
              : expiry.urgent
              ? 'bg-amber-50 text-amber-700 border border-amber-200'
              : 'text-slate-500'
          }`}
        >
          <Clock className="w-3.5 h-3.5" />
          <span>{expiry.label}</span>
        </span>

        {/* Stretched link covers whole card for seamless touch interaction */}
        <a
          href={`/?tab=feed&orderId=${encodeURIComponent(order.id)}`}
          data-testid="open-errand-link"
          aria-label={`View details of errand ${order.orderCode}`}
          onClick={(event) => {
            event.preventDefault();
            onOpenErrand(order.id);
          }}
          className={`inline-flex items-center gap-1 font-bold rounded-lg transition-all focus:outline-none after:absolute after:inset-0 after:rounded-2xl after:content-[''] ${
            mine
              ? 'text-xs text-slate-600 bg-slate-100 hover:bg-slate-200 px-3 py-1.5 border border-slate-200'
              : 'text-xs sm:text-sm text-nus-orange group-hover:text-orange-600 group-hover:translate-x-0.5'
          }`}
        >
          {mine ? (
            <span>Your errand</span>
          ) : (
            <>
              <span>View &amp; accept</span>
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </>
          )}
        </a>
      </div>
    </article>
  );
}
