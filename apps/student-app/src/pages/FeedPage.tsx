/**
 * AI Assistance Disclosure:
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
import { AlertCircle, Compass, PackageSearch, RefreshCw, Sparkles } from 'lucide-react';
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
  return (
    <div className="space-y-5">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              Campus Errand <span className="text-nus-orange">Feed</span>
            </h2>
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-nus-blue-50 text-nus-blue border border-nus-blue-100">
              <Sparkles className="w-3 h-3 text-nus-orange" />
              Live
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Deliver on your way to lecture or earn credits across NUS campus
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <span className="inline-flex items-center gap-1.5 text-xs font-bold bg-slate-100 text-slate-700 px-3 py-1 rounded-full border border-slate-200 shadow-sm">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            {filteredOrders.length} {filteredOrders.length === 1 ? 'Errand Open' : 'Errands Open'}
          </span>
        </div>
      </div>

      {/* Zone Filter Chips */}
      <div className="flex gap-2 overflow-x-auto pb-1.5 pt-0.5 md:flex-wrap no-scrollbar">
        {FEED_ZONES.map((zone) => {
          const isSelected = selectedZone === zone;
          return (
            <button
              key={zone}
              type="button"
              onClick={() => onSelectZone(zone)}
              className={`px-3.5 py-1.5 rounded-full text-xs sm:text-sm font-bold whitespace-nowrap transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-nus-orange focus:ring-offset-1 ${
                isSelected
                  ? 'bg-nus-orange text-white shadow-md shadow-nus-orange/20 scale-105'
                  : 'bg-white text-slate-600 border border-slate-200/90 hover:bg-slate-50 hover:text-slate-900 hover:border-slate-300 shadow-subtle'
              }`}
            >
              {zone}
            </button>
          );
        })}
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
                className="rounded-2xl p-5 bg-white border border-slate-200 shadow-subtle animate-pulse space-y-4"
              >
                <div className="flex justify-between items-center">
                  <div className="h-5 w-16 bg-slate-200 rounded-lg" />
                  <div className="h-6 w-24 bg-slate-200 rounded-full" />
                </div>
                <div className="h-6 w-3/4 bg-slate-200 rounded" />
                <div className="h-16 bg-slate-100 rounded-xl" />
                <div className="h-8 bg-slate-100 rounded-lg" />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Empty State */}
      {!ordersLoading && !ordersError && filteredOrders.length === 0 && (
        <div className="rounded-2xl border-2 border-dashed border-slate-200 bg-white/60 p-8 sm:p-12 text-center shadow-subtle flex flex-col items-center justify-center">
          <div className="h-12 w-12 rounded-2xl bg-nus-blue-50 border border-nus-blue-100 flex items-center justify-center text-nus-blue mb-3">
            <PackageSearch className="h-6 w-6" />
          </div>
          <p className="font-bold text-slate-800 text-base">No open errands in this zone.</p>
          <p className="text-xs sm:text-sm text-slate-500 mt-1 max-w-sm">
            {selectedZone === 'ALL'
              ? 'All caught up! Check back shortly or be the first to request an errand.'
              : `There are currently no active errand requests around ${selectedZone}.`}
          </p>
          {selectedZone !== 'ALL' && (
            <button
              type="button"
              onClick={() => onSelectZone('ALL')}
              className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-nus-blue text-white hover:bg-nus-blue/90 shadow-sm transition"
            >
              <Compass className="w-3.5 h-3.5" />
              <span>Show All Campus Zones</span>
            </button>
          )}
        </div>
      )}

      {/* Errand Cards Grid */}
      {!ordersLoading && filteredOrders.length > 0 && (
        <div className="responsive-card-grid">
          {filteredOrders.map((order) => (
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
