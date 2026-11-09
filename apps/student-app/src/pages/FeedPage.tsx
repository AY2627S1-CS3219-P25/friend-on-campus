/**
 * AI Assistance Disclosure:
 * Tool: Codex (model: GPT-6), date: 2026-11-07
 * Scope: Align browsing filters with the royal-blue navigation identity.
 * Author review: <to be completed by yanhwee>
 *
 * Tool: Codex (model: GPT-6), date: 2026-11-07
 * Scope: Refine the approved campus UI with quieter surfaces, readable hierarchy, and accessible interactions.
 * Author review: <to be completed by yanhwee>
 *
 * Tool: Google Antigravity Agent, date: 2026-11-07
 * Scope: Harmonized FeedPage with Direction A Warm Campus Mango theme: updated selected zone pills to warm orange tint, empty state illustration box to warm amber tint, and spinner to nus-orange.
 * Author review: <to be completed by yanhwee>
 *
 * Tool: Google Antigravity Agent, date: 2026-11-07
 * Scope: Harmonized empty-state CTA button with brand warm orange action styling, eliminating harsh dark navy button.
 * Author review: <to be completed by yanhwee>
 *
 * Tool: Google Antigravity Agent, date: 2026-11-07
 * Scope: Standardized zone filter chips to soft tinted blue styling aligned with SpotsPage category chips.
 * Author review: <to be completed by yanhwee>
 *
 * Tool: Google Antigravity Agent, date: 2026-11-07
 * Scope: Harmonized search input and open errands badge to strict h-11 (44px) matching SpotsPage toolbar height.
 * Author review: <to be completed by yanhwee>
 *
 * Tool: Google Antigravity Agent, date: 2026-11-07
 * Scope: Compact mobile toolbar placing search and open count on a single row, eliminating redundant header whitespace.
 * Author review: <to be completed by yanhwee>
 *
 * Tool: Google Antigravity Agent, date: 2026-11-07
 * Scope: Adjusted skeleton route placeholder height to match 2-line route box.
 * Author review: <to be completed by yanhwee>
 *
 * Tool: Google Antigravity Agent, date: 2026-11-07
 * Scope: Compact skeleton loading cards matching new high-density errand card dimensions.
 * Author review: <to be completed by yanhwee>
 *
 * Tool: Google Antigravity Agent, date: 2026-11-07
 * Scope: Streamlined FeedPage to action-first search and zone filter toolbar, eliminating the redundant hero banner to present open errands immediately above the fold.
 * Author review: <to be completed by yanhwee>
 *
 * Tool: Google Antigravity Agent, date: 2026-11-06
 * Scope: Redesigned FeedPage with campus pulse banner, instant keyword filter search, and elevated card grid.
 * Author review: <to be completed by yanhwee>
 *
 * Tool: Google Antigravity Agent, date: 2026-10-28
 * Scope: Light elegant theme update for reset zone filter button.
 * Author review: <to be completed by yanhwee>
 *
 * Tool: Google Antigravity Agent, date: 2026-10-28
 * Scope: Fixed zone filter chip horizontal clipping on "ALL" chip with padded scroll container.
 * Author review: <to be completed by yanhwee>
 *
 * Tool: Google Antigravity Agent, date: 2026-10-28
 * Scope: Elevated FeedPage with polished campus zone filter chips, skeleton loading shimmers, animated empty state with quick reset, and real-time open errand counters.
 * Author review: <to be completed by yanhwee>
 *
 * Tool: Google Antigravity Agent, date: 2026-10-22
 * Scope: Forwarded optional courierContactNote in onAcceptOrder prop (F3.3.6).
 * Author review: <to be completed by yanhwee>
 *
 * Tool: Google Antigravity Agent, date: 2026-10-19
 * Scope: Extracted errand feed page from student-app App.tsx into pages/FeedPage.tsx.
 * Author review: Verified by yanhwee
 *
 * Tool: Claude Code (model: Claude Fable 5.1), date: 2026-10-26
 * Scope: Errand details page (issues #188, #189): feed cards open the errand's page; the accept props left this file.
 * Author review: <to be completed by Reallyeasy1>
 *
 * Tool: Claude Code (model: Claude Fable 5.1), date: 2026-11-09
 * Scope: Zone tab counts are taken from the whole feed (new feedOrders prop, orders/feedZones.ts) instead of the
 * list already narrowed to the selected tab, which made ALL and the other tabs show 0.
 * Author review: <to be completed by Reallyeasy1>
 */

// AI-generated (edited by yanhwee)

import { OrderDTO } from '@campus-errand/common-dtos';
import { AlertCircle, Compass, PackageSearch, RefreshCw, Search, X } from 'lucide-react';
import { useMemo, useState } from 'react';
import { ErrandCard } from '../components/ErrandCard';
import { FEED_ZONES, countByFeedZone } from '../orders/feedZones';

interface FeedPageProps {
  /** Every errand in the feed, whichever tab is selected; the tab counts come from this. */
  feedOrders: OrderDTO[];
  /** The feed narrowed to the selected tab; the cards come from this. */
  filteredOrders: OrderDTO[];
  selectedZone: string;
  onSelectZone: (zone: string) => void;
  ordersLoading: boolean;
  ordersError: string | null;
  currentUserId: string | null;
  /** Opens the errand's details page (#188), which carries Accept. */
  onOpenErrand: (orderId: string) => void;
}

export function FeedPage({
  feedOrders,
  filteredOrders,
  selectedZone,
  onSelectZone,
  ordersLoading,
  ordersError,
  currentUserId,
  onOpenErrand,
}: FeedPageProps) {
  const [keyword, setKeyword] = useState('');

  const displayOrders = useMemo(() => {
    const q = keyword.trim().toLowerCase();
    if (!q) return filteredOrders;
    return filteredOrders.filter(
      (o) =>
        o.itemDescription.toLowerCase().includes(q) ||
        (o.supplierName?.toLowerCase().includes(q) ?? false) ||
        o.dropoffLocation.toLowerCase().includes(q) ||
        (o.specialNotes && o.specialNotes.toLowerCase().includes(q))
    );
  }, [filteredOrders, keyword]);

  // AI-generated (edited by Reallyeasy1): counted over the whole feed. Counting filteredOrders made ALL and every
  // other tab show the selected tab's number or 0.
  const zoneCounts = countByFeedZone(feedOrders);

  return (
    <div className="space-y-4 sm:space-y-5">
      {/* Action-First Search & Zone Filter Bar */}
      <div className="space-y-2.5 sm:space-y-3">
        <div className="flex items-center gap-2 sm:gap-2.5 justify-between">
          {/* Quick Keyword Search */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            <input
              type="text"
              aria-label="Search errands"
              placeholder="Search errands"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              className="w-full h-11 pl-10 pr-9 text-sm bg-white rounded-2xl border border-slate-200/90 focus:outline-none focus:ring-2 focus:ring-nus-orange focus:border-nus-orange shadow-subtle hover:border-slate-300 transition text-slate-900 placeholder:text-slate-400"
            />
            {keyword && (
              <button
                type="button"
                aria-label="Clear filter"
                onClick={() => setKeyword('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition p-1 rounded-full hover:bg-slate-100 cursor-pointer min-h-0"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <span className="h-11 inline-flex items-center gap-1.5 px-2.5 sm:px-3 rounded-2xl text-xs font-bold bg-white border border-slate-200/90 text-slate-700 shadow-2xs whitespace-nowrap">
              <span className="w-2 h-2 rounded-full bg-emerald-600" />
              <span>{filteredOrders.length} {filteredOrders.length === 1 ? 'errand' : 'errands'} open</span>
            </span>
            <div className="text-xs font-semibold text-slate-500 hidden md:block">
              Showing <span className="font-bold text-slate-800">{displayOrders.length}</span>
            </div>
          </div>
        </div>

        {/* Zone Filter Chips */}
        <div className="flex items-center gap-2 overflow-x-auto py-1 px-0.5 md:flex-wrap no-scrollbar">
          {FEED_ZONES.map((zone) => {
            const isSelected = selectedZone === zone;
            const countInZone = zoneCounts[zone];

            return (
              <button
                key={zone}
                type="button"
                onClick={() => onSelectZone(zone)}
                aria-pressed={isSelected}
                className={`px-3 py-1 sm:px-3.5 sm:py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition-all duration-200 cursor-pointer flex items-center gap-1.5 ${
                  isSelected
                    ? 'bg-campus-blue-soft text-campus-blue border border-blue-200'
                    : 'bg-transparent text-slate-600 border border-transparent hover:bg-slate-100 hover:text-slate-900'
                }`}
              >
                <span>{zone}</span>
                <span
                  className={`text-xs px-1.5 py-0.5 rounded-md font-medium ${
                    isSelected ? 'bg-blue-100/80 text-campus-blue' : 'bg-slate-100 text-slate-500'
                  }`}
                >
                  {countInZone}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Orders Error Banner */}
      {ordersError && (
        <div
          role="alert"
          className="rounded-2xl border border-rose-200 bg-rose-50/90 p-4 text-sm text-rose-800 flex items-start gap-3 shadow-subtle"
        >
          <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
          <div>
            <p className="font-bold">Failed to load errands</p>
            <p className="text-xs text-rose-700 mt-0.5">{ordersError}</p>
          </div>
        </div>
      )}

      {/* Loading Skeleton & Status */}
      {ordersLoading && (
        <div role="status" className="space-y-4">
          <p className="sr-only">Loading errands…</p>
          <div className="flex items-center gap-2 text-sm text-slate-500 py-1">
            <RefreshCw className="w-4 h-4 animate-spin text-nus-orange" />
            <span>Loading errands…</span>
          </div>
          <div className="responsive-card-grid">
            {[1, 2, 3].map((n) => (
              <div
                key={n}
                className="rounded-2xl p-4 sm:p-4.5 bg-white border border-slate-200/90 shadow-subtle animate-pulse space-y-2.5"
              >
                <div className="flex justify-between items-center">
                  <div className="h-5 w-16 bg-slate-200 rounded-lg" />
                  <div className="h-5 w-24 bg-slate-200 rounded-full" />
                </div>
                <div className="h-5 w-3/4 bg-slate-200 rounded" />
                <div className="h-14 bg-slate-100 rounded-xl" />
                <div className="h-6 bg-slate-100 rounded-lg" />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Empty State */}
      {!ordersLoading && !ordersError && displayOrders.length === 0 && (
        <div className="rounded-3xl border-2 border-dashed border-slate-200 bg-white/70 p-8 sm:p-12 text-center shadow-subtle flex flex-col items-center justify-center">
          <div className="h-14 w-14 rounded-2xl bg-orange-50 border border-orange-200/80 flex items-center justify-center text-orange-600 mb-3 shadow-2xs">
            <PackageSearch className="h-7 w-7 stroke-[1.8]" />
          </div>
          <p className="font-bold text-slate-800 text-base">
            {keyword ? `No errands match "${keyword}"` : 'No open errands in this zone.'}
          </p>
          <p className="text-xs sm:text-sm text-slate-500 mt-1 max-w-sm">
            {keyword
              ? 'Try searching with a broader keyword or clear the search input.'
              : selectedZone === 'ALL'
              ? 'All caught up! Check back shortly or be the first to request an errand.'
              : `There are currently no active errand requests around ${selectedZone}.`}
          </p>
          <div className="mt-4 flex items-center gap-2">
            {keyword && (
              <button
                type="button"
                onClick={() => setKeyword('')}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-white hover:bg-slate-50 text-slate-700 border border-slate-200/90 shadow-2xs transition cursor-pointer"
              >
                <span>Clear Search</span>
              </button>
            )}
            {selectedZone !== 'ALL' && (
              <button
                type="button"
                onClick={() => onSelectZone('ALL')}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-orange-700 hover:bg-orange-800 text-white shadow-sm hover:shadow-md active:scale-95 transition-all cursor-pointer"
              >
                <Compass className="w-3.5 h-3.5" />
                <span>Show All Campus Zones</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* Errand Cards Grid */}
      {!ordersLoading && displayOrders.length > 0 && (
        <div className="responsive-card-grid">
          {displayOrders.map((order) => (
            <ErrandCard
              key={order.id}
              order={order}
              currentUserId={currentUserId}
              onOpenErrand={onOpenErrand}
            />
          ))}
        </div>
      )}
    </div>
  );
}
