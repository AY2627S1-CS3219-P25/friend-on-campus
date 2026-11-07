/**
 * AI Assistance Disclosure:
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
 */

// AI-generated (edited by yanhwee)

import { OrderDTO } from '@campus-errand/common-dtos';
import { AlertCircle, Compass, PackageSearch, RefreshCw, Search, X } from 'lucide-react';
import { useMemo, useState } from 'react';
import { ErrandCard } from '../components/ErrandCard';

const FEED_ZONES = ['ALL', 'COM3', 'UTown', 'PGPR', 'FASS', 'Science', 'Engineering'];

interface FeedPageProps {
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

  return (
    <div className="space-y-6">
      {/* Action-First Search & Zone Filter Bar */}
      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row gap-2.5 items-stretch sm:items-center justify-between">
          {/* Quick Keyword Search */}
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            <input
              type="text"
              placeholder="Filter errands by food, drink, location..."
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              className="w-full pl-10 pr-9 py-2.5 text-sm bg-white rounded-2xl border border-slate-200/90 focus:outline-none focus:ring-2 focus:ring-nus-orange focus:border-nus-orange shadow-subtle hover:border-slate-300 transition text-slate-900 placeholder:text-slate-400"
            />
            {keyword && (
              <button
                type="button"
                aria-label="Clear filter"
                onClick={() => setKeyword('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition p-1 rounded-full hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-2 self-end sm:self-center">
            <span className="inline-flex items-center gap-1.5 px-3 py-2 rounded-2xl text-xs font-bold bg-white border border-slate-200/90 text-slate-700 shadow-2xs">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              {filteredOrders.length} {filteredOrders.length === 1 ? 'errand' : 'errands'} open
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
            const countInZone =
              zone === 'ALL'
                ? filteredOrders.length
                : filteredOrders.filter((o) => o.campusZone === zone).length;

            return (
              <button
                key={zone}
                type="button"
                onClick={() => onSelectZone(zone)}
                className={`px-3.5 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all duration-150 cursor-pointer flex items-center gap-1.5 focus:outline-none focus:ring-2 focus:ring-nus-orange focus:ring-offset-1 ${
                  isSelected
                    ? 'bg-nus-orange text-white shadow-md shadow-nus-orange/25 scale-[1.03]'
                    : 'bg-white text-slate-600 border border-slate-200/90 hover:bg-slate-50 hover:text-slate-900 hover:border-slate-300 shadow-subtle'
                }`}
              >
                <span>{zone}</span>
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full font-black ${
                    isSelected ? 'bg-white/25 text-white' : 'bg-slate-100 text-slate-500'
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
            <RefreshCw className="w-4 h-4 animate-spin text-nus-blue" />
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
          <div className="h-14 w-14 rounded-2xl bg-nus-blue-50 border border-nus-blue-100 flex items-center justify-center text-nus-blue mb-3 shadow-2xs">
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
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-nus-blue hover:bg-nus-blue-hover text-white shadow-2xs transition cursor-pointer"
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
