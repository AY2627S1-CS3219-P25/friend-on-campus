/**
 * AI Assistance Disclosure:
 * Tool: Codex (model: GPT-6); Google Antigravity Agent; Claude Code (model: Claude Opus 5.5, Claude Fable 5.1, Sonnet 5), date: 2026-10-19 to 2026-11-07
 * Scope: Extracted errand card component from student-app App.tsx into components/ErrandCard.tsx; updated across 15 AI-assisted revisions through D4 wrap-up (use blue for errand links and amber for credit rewards, matching the refreshed brand roles).
 * Author review: I validated correctness, edited for style, and verified with automated tests.
 */


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
    <article className="group relative flex flex-col justify-between bg-white rounded-2xl p-5 shadow-subtle hover:shadow-card border border-slate-200 hover:border-slate-300 transition-all duration-200 focus-within:ring-2 focus-within:ring-nus-orange">
      <div>
        {/* Header: Zone Badge + Reward Badge */}
        <div className="flex items-center justify-between gap-2">
          <span className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-600 min-w-0">
            <span className="truncate">{order.campusZone}</span>
          </span>
          {/* Locked Escrow Reward Badge */}
          <div className="inline-flex items-center gap-1.5 text-amber-800 font-semibold text-sm bg-amber-50 px-2.5 py-1 rounded-lg whitespace-nowrap shrink-0">
            <Coins className="w-3.5 h-3.5 text-amber-700 shrink-0" />
            <span>+{order.rewardCredits} Credits</span>
            {typeof order.estimatedRewardCredits === 'number' && (
              <span data-testid="errand-estimate" className="sr-only">
                Est. {order.estimatedRewardCredits}
              </span>
            )}
          </div>
        </div>

        {/* Item Title */}
        <h3
          title={order.itemDescription}
          className="font-semibold text-slate-900 text-base mt-3 leading-snug line-clamp-2 group-hover:text-campus-blue transition-colors"
        >
          {order.itemDescription}
        </h3>

        {/* Expandable Notes */}
        <div className="mt-1">
          <ExpandableNotes notes={order.specialNotes} />
        </div>

        {/* Clear 2-Line Connected Route (Pickup & Dropoff) */}
        <div className="mt-4 text-sm space-y-2.5">
          <div className="flex items-start gap-2 min-w-0">
            <MapPin className="w-4 h-4 mt-0.5 text-slate-400 shrink-0" />
            <span className="text-slate-500 font-medium text-xs w-14 pt-0.5 whitespace-nowrap shrink-0">Pickup:</span>
            <span className="font-medium text-slate-700 min-w-0 break-words" title={order.supplierName}>
              {order.supplierName}
            </span>
          </div>
          <div className="flex items-start gap-2 min-w-0">
            <ArrowRight className="w-4 h-4 mt-0.5 text-slate-400 shrink-0" />
            <span className="text-slate-500 font-medium text-xs w-14 pt-0.5 whitespace-nowrap shrink-0">Dropoff:</span>
            <span className="font-medium text-slate-700 min-w-0 break-words" title={order.dropoffLocation}>
              {order.dropoffLocation}
            </span>
          </div>
        </div>
      </div>

      {/* Footer: Expiration & Action CTA */}
      <div className="mt-4 flex items-center justify-between gap-2 pt-3 border-t border-slate-100 text-xs">
        <span
          className={`inline-flex items-center gap-1.5 py-1 rounded-lg font-medium transition min-w-0 ${
            expiry.critical
              ? 'bg-rose-50 text-rose-700 border border-rose-200 font-bold'
              : expiry.urgent
              ? 'bg-amber-50 text-amber-700 border border-amber-200 font-semibold'
              : 'text-slate-500'
          }`}
        >
          <Clock className="w-3.5 h-3.5 shrink-0" />
          <span className="truncate">{expiry.label}</span>
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
          className={`inline-flex items-center gap-1.5 font-bold rounded-xl whitespace-nowrap shrink-0 transition-all focus:outline-none after:absolute after:inset-0 after:rounded-2xl after:content-[''] ${
            mine
              ? 'text-xs text-slate-600 bg-slate-100 hover:bg-slate-200 px-3 py-1.5 border border-slate-200 shadow-2xs'
              : 'text-sm text-campus-blue hover:text-campus-blue-hover px-2 py-2'
          }`}
        >
          {mine ? (
            <span>Your errand</span>
          ) : (
            <>
              <span>View &amp; accept</span>
              <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
            </>
          )}
        </a>
      </div>
    </article>
  );
}
