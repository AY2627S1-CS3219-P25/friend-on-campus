/**
 * AI Assistance Disclosure:
 * Tool: Google Antigravity Agent, date: 2026-10-28
 * Scope: Restored exact UAT search placeholder 'Search food, cafes, lockers, print hubs...' to preserve CI test suite compatibility.
 * Author review: <to be completed by yanhwee>
 *
 * Tool: Google Antigravity Agent, date: 2026-10-28
 * Scope: Light elegant theme update for category shortcut filters.
 * Author review: <to be completed by yanhwee>
 *
 * Tool: Google Antigravity Agent, date: 2026-10-28
 * Scope: Refined category filter chips padding to prevent negative overflow clipping.
 * Author review: <to be completed by yanhwee>
 *
 * Tool: Google Antigravity Agent, date: 2026-10-28
 * Scope: Redesigned SpotsPage with search quick-clear, category shortcut filter chips, skeleton loading states, and responsive grid layout.
 * Author review: <to be completed by yanhwee>
 *
 * Tool: Google Antigravity Agent, date: 2026-10-19
 * Scope: Extracted campus spots directory page from student-app App.tsx into pages/SpotsPage.tsx.
 * Author review: Verified by yanhwee
 */

// AI-generated (edited by yanhwee)

import { SupplierDTO } from '@campus-errand/common-dtos';
import { Compass, RefreshCw, Search, Store, X } from 'lucide-react';
import { SpotCard } from '../components/SpotCard';

interface SpotsPageProps {
  filteredSuppliers: SupplierDTO[];
  supplierSearch: string;
  onChangeSearch: (query: string) => void;
  isSuppliersLoading: boolean;
  onPickForErrand: (supplier: SupplierDTO) => void;
}

const CATEGORY_SHORTCUTS = ['All', 'Food', 'Cafe', 'Print', 'Locker', 'Convenience'];

export function SpotsPage({
  filteredSuppliers,
  supplierSearch,
  onChangeSearch,
  isSuppliersLoading,
  onPickForErrand,
}: SpotsPageProps) {
  return (
    <div className="space-y-5">
      {/* Page Header & Search Bar */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
              Campus Spots Directory
            </h2>
            <span className="text-xs bg-nus-blue-50 text-nus-blue border border-nus-blue-100 font-bold px-2.5 py-0.5 rounded-full">
              {filteredSuppliers.length} Verified
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Real-time verified campus pickup points from Supplier Service
          </p>
        </div>

        {/* Spot Search Bar with Quick Clear */}
        <div className="relative w-full lg:max-w-md">
          <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-400 pointer-events-none" />
          <input
            type="text"
            placeholder="Search food, cafes, lockers, print hubs..."
            value={supplierSearch}
            onChange={(e) => onChangeSearch(e.target.value)}
            className="w-full pl-10 pr-9 py-2.5 text-sm bg-white rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-nus-blue focus:border-nus-blue shadow-subtle transition"
          />
          {supplierSearch && (
            <button
              type="button"
              aria-label="Clear search"
              onClick={() => onChangeSearch('')}
              className="absolute right-3 top-3 text-slate-400 hover:text-slate-600 transition"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Category Shortcuts */}
      <div className="flex items-center gap-2 overflow-x-auto p-1 md:flex-wrap no-scrollbar">
        {CATEGORY_SHORTCUTS.map((cat) => {
          const isSelected =
            cat === 'All'
              ? !supplierSearch
              : supplierSearch.toLowerCase() === cat.toLowerCase();
          return (
            <button
              key={cat}
              type="button"
              onClick={() => onChangeSearch(cat === 'All' ? '' : cat)}
              className={`px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap transition-all duration-150 cursor-pointer ${
                isSelected
                  ? 'bg-blue-50 text-nus-blue border border-blue-300 font-bold shadow-2xs'
                  : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50 hover:text-slate-900'
              }`}
            >
              {cat}
            </button>
          );
        })}
      </div>

      {/* Loading Skeleton */}
      {isSuppliersLoading && (
        <div role="status" className="space-y-4">
          <div className="flex items-center gap-2 text-sm text-slate-500 py-1">
            <RefreshCw className="w-4 h-4 animate-spin text-nus-blue" />
            <span>Loading campus spots...</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3, 4, 5, 6].map((n) => (
              <div
                key={n}
                className="rounded-2xl p-5 bg-white border border-slate-200 shadow-subtle animate-pulse space-y-4"
              >
                <div className="flex justify-between items-center">
                  <div className="h-5 w-16 bg-slate-200 rounded" />
                  <div className="h-5 w-20 bg-slate-200 rounded" />
                </div>
                <div className="h-6 w-2/3 bg-slate-200 rounded" />
                <div className="h-4 w-5/6 bg-slate-100 rounded" />
                <div className="h-8 bg-slate-100 rounded-lg pt-2" />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* List of Verified Spots */}
      {!isSuppliersLoading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4.5">
          {filteredSuppliers.length === 0 && (
            <div className="col-span-full rounded-2xl border-2 border-dashed border-slate-200 bg-white/60 p-8 sm:p-12 text-center shadow-subtle flex flex-col items-center justify-center">
              <div className="h-12 w-12 rounded-2xl bg-nus-blue-50 border border-nus-blue-100 flex items-center justify-center text-nus-blue mb-3">
                <Store className="h-6 w-6" />
              </div>
              <p className="font-bold text-slate-800 text-base">No campus spots match your search.</p>
              <p className="text-xs sm:text-sm text-slate-500 mt-1 max-w-sm">
                Try searching for a building name like "UTown", "COM3", or category like "Cafe" or "Printing".
              </p>
              {supplierSearch && (
                <button
                  type="button"
                  onClick={() => onChangeSearch('')}
                  className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-white hover:bg-slate-50 text-slate-700 border border-slate-200/90 shadow-2xs transition cursor-pointer"
                >
                  <Compass className="w-3.5 h-3.5" />
                  <span>Show All Spots</span>
                </button>
              )}
            </div>
          )}
          {filteredSuppliers.map((s) => (
            <SpotCard key={s.id} supplier={s} onPickForErrand={onPickForErrand} />
          ))}
        </div>
      )}
    </div>
  );
}
