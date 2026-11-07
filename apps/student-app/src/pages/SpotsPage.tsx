/**
 * AI Assistance Disclosure:
 * Tool: Google Antigravity Agent, date: 2026-11-07
 * Scope: Harmonized height across search input, verified badge, and list/grid view switcher to strict h-11 (44px) using min-h-0, resolving tall button container protrusion.
 * Author review: <to be completed by yanhwee>
 *
 * Tool: Google Antigravity Agent, date: 2026-11-07
 * Scope: Redesigned SpotsPage into a high-density campus directory list view with list/grid toggle, dense mobile rows, and unified search toolbar.
 * Author review: <to be completed by yanhwee>
 *
 * Tool: Google Antigravity Agent, date: 2026-11-07
 * Scope: Streamlined page layout to action-first search and category filtering, eliminating redundant static page header while preserving Verified badge for UAT compatibility.
 * Author review: <to be completed by yanhwee>
 *
 * Tool: Google Antigravity Agent, date: 2026-11-07
 * Scope: Removed internal backend service attribution from directory header for a formal consumer app appearance.
 * Author review: <to be completed by yanhwee>
 *
 * Tool: Google Antigravity Agent, date: 2026-11-06
 * Scope: Redesigned SpotsPage with polished campus spot directory layout, sleek frosted search bar, tactile category pills, responsive skeleton states, and verified count badge.
 * Author review: <to be completed by yanhwee>
 *
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
import {
  ArrowRight,
  Clock,
  Compass,
  LayoutGrid,
  List,
  MapPin,
  RefreshCw,
  Search,
  Store,
  X,
} from 'lucide-react';
import { useState } from 'react';
import { SpotCard, getCategoryIcon } from '../components/SpotCard';
import { formatOperatingHours, isOpenAt } from '../suppliers/operatingHours';

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
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');

  return (
    <div className="space-y-4 sm:space-y-5">
      {/* Action-First Search Bar, Verified Counter & View Mode Toggle */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Spot Search Bar with Quick Clear */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          <input
            type="text"
            placeholder="Search food, cafes, lockers, print hubs..."
            value={supplierSearch}
            onChange={(e) => onChangeSearch(e.target.value)}
            className="w-full h-11 pl-10 pr-9 text-sm bg-white rounded-2xl border border-slate-200/90 focus:outline-none focus:ring-2 focus:ring-nus-blue focus:border-nus-blue shadow-subtle hover:border-slate-300 transition-all text-slate-900 placeholder:text-slate-400"
          />
          {supplierSearch && (
            <button
              type="button"
              aria-label="Clear search"
              onClick={() => onChangeSearch('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition p-1 rounded-full hover:bg-slate-100 cursor-pointer min-h-0"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Counter & View Mode Toggle Cluster */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          <span className="h-11 inline-flex items-center text-xs bg-nus-blue-50 text-nus-blue border border-nus-blue-100 font-bold px-2.5 sm:px-3 rounded-2xl shadow-2xs gap-1.5 whitespace-nowrap">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>{filteredSuppliers.length} Verified</span>
          </span>

          {/* List / Grid View Switcher */}
          <div className="h-11 flex items-center p-1 bg-slate-100/90 rounded-2xl border border-slate-200/60 shadow-2xs shrink-0">
            <button
              type="button"
              onClick={() => setViewMode('list')}
              aria-label="List view"
              title="Directory list view"
              className={`h-full w-8 sm:w-8.5 min-h-0 rounded-xl flex items-center justify-center transition cursor-pointer ${
                viewMode === 'list'
                  ? 'bg-white text-nus-blue shadow-xs'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <List className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </button>
            <button
              type="button"
              onClick={() => setViewMode('grid')}
              aria-label="Grid view"
              title="Card grid view"
              className={`h-full w-8 sm:w-8.5 min-h-0 rounded-xl flex items-center justify-center transition cursor-pointer ${
                viewMode === 'grid'
                  ? 'bg-white text-nus-blue shadow-xs'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </button>
          </div>
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
              className={`px-3 py-1 sm:px-3.5 sm:py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all duration-200 cursor-pointer ${
                isSelected
                  ? 'bg-blue-50 text-nus-blue border border-blue-300 shadow-2xs'
                  : 'bg-white text-slate-600 border border-slate-200/90 hover:bg-slate-50 hover:text-slate-900 shadow-2xs'
              }`}
            >
              {cat}
            </button>
          );
        })}
      </div>

      {/* Loading Skeleton */}
      {isSuppliersLoading && (
        <div role="status" className="space-y-3">
          <div className="flex items-center gap-2 text-sm text-slate-500 py-1 font-medium">
            <RefreshCw className="w-4 h-4 animate-spin text-nus-blue" />
            <span>Loading campus spots...</span>
          </div>
          {viewMode === 'list' ? (
            <div className="space-y-2">
              {[1, 2, 3, 4, 5, 6].map((n) => (
                <div
                  key={n}
                  className="flex items-center justify-between p-3.5 bg-white rounded-2xl border border-slate-200/90 shadow-subtle animate-pulse gap-4"
                >
                  <div className="flex items-center gap-3 flex-1">
                    <div className="w-9 h-9 rounded-xl bg-slate-200 shrink-0" />
                    <div className="space-y-1.5 flex-1">
                      <div className="h-4 w-1/3 bg-slate-200 rounded-lg" />
                      <div className="h-3 w-1/2 bg-slate-100 rounded-lg" />
                    </div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <div className="h-6 w-16 bg-slate-100 rounded-lg" />
                    <div className="h-7 w-28 bg-slate-200 rounded-xl" />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4.5">
              {[1, 2, 3, 4, 5, 6].map((n) => (
                <div
                  key={n}
                  className="rounded-3xl p-5 bg-white border border-slate-200/90 shadow-card animate-pulse space-y-4"
                >
                  <div className="flex justify-between items-center">
                    <div className="h-5 w-16 bg-slate-200 rounded-full" />
                    <div className="h-5 w-20 bg-slate-200 rounded-full" />
                  </div>
                  <div className="h-6 w-2/3 bg-slate-200 rounded-xl" />
                  <div className="h-4 w-5/6 bg-slate-100 rounded-lg" />
                  <div className="h-9 bg-slate-100 rounded-2xl pt-2" />
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Spots View: Directory List or Card Grid */}
      {!isSuppliersLoading && (
        <>
          {filteredSuppliers.length === 0 ? (
            <div className="rounded-3xl border-2 border-dashed border-slate-200 bg-white/70 p-8 sm:p-12 text-center shadow-card flex flex-col items-center justify-center">
              <div className="h-12 w-12 rounded-2xl bg-nus-blue-50 border border-nus-blue-100 flex items-center justify-center text-nus-blue mb-3 shadow-2xs">
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
                  className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 rounded-2xl text-xs font-bold bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 shadow-2xs transition-all cursor-pointer"
                >
                  <Compass className="w-3.5 h-3.5" />
                  <span>Show All Spots</span>
                </button>
              )}
            </div>
          ) : viewMode === 'list' ? (
            /* Sleek High-Density Directory List View */
            <div className="space-y-2">
              {filteredSuppliers.map((s) => {
                const CategoryIcon = getCategoryIcon(s.category);
                const hoursFormatted = formatOperatingHours(s);
                const openStatus = isOpenAt(s, new Date());

                return (
                  <div
                    key={s.id}
                    className={`group flex flex-col sm:flex-row sm:items-center justify-between p-3 sm:py-3 sm:px-4 rounded-2xl border transition-all duration-150 gap-2.5 sm:gap-4 ${
                      s.isActive
                        ? 'bg-white border-slate-200/90 hover:border-nus-blue/50 hover:shadow-subtle'
                        : 'bg-slate-50/80 border-slate-200/60 opacity-60'
                    }`}
                  >
                    {/* Left Column: Icon + Name + Code + Location */}
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div className="w-9 h-9 rounded-xl bg-slate-100 flex items-center justify-center text-slate-600 shrink-0 group-hover:bg-blue-50 group-hover:text-nus-blue transition-colors">
                        <CategoryIcon className="w-4 h-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="font-bold text-sm sm:text-base text-slate-900 group-hover:text-nus-blue transition-colors truncate">
                            {s.name}
                          </h4>
                          <span className="text-[10px] font-mono text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200/70 font-semibold">
                            {s.supplierCode}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5 truncate">
                          <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                          <span className="truncate">{s.exactLocation}</span>
                        </p>
                      </div>
                    </div>

                    {/* Right Column: Zone + Hours + Open Badge + CTA Button */}
                    <div className="flex items-center justify-between sm:justify-end gap-2.5 sm:gap-3 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100">
                      <div className="flex items-center gap-1.5 sm:gap-2">
                        <span className="text-xs font-bold text-nus-blue bg-blue-50/80 px-2.5 py-1 rounded-lg border border-blue-100 whitespace-nowrap">
                          {s.campusZone}
                        </span>

                        {hoursFormatted && (
                          <span className="hidden md:flex items-center gap-1 text-xs text-slate-500 bg-slate-50 px-2 py-1 rounded-lg border border-slate-100">
                            <Clock className="w-3 h-3 text-slate-400 shrink-0" />
                            <span className="truncate max-w-[140px]">{hoursFormatted}</span>
                          </span>
                        )}

                        {!s.isActive ? (
                          <span className="text-[11px] bg-rose-50 text-rose-700 border border-rose-200 font-bold px-2 py-0.5 rounded-lg whitespace-nowrap">
                            Unavailable
                          </span>
                        ) : openStatus === true ? (
                          <span className="inline-flex items-center gap-1 text-[11px] bg-emerald-50 text-emerald-700 border border-emerald-200 font-bold px-2 py-0.5 rounded-lg whitespace-nowrap">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                            Open
                          </span>
                        ) : openStatus === false ? (
                          <span className="inline-flex items-center gap-1 text-[11px] bg-slate-100 text-slate-600 border border-slate-200 font-semibold px-2 py-0.5 rounded-lg whitespace-nowrap">
                            Closed
                          </span>
                        ) : null}
                      </div>

                      <button
                        type="button"
                        disabled={!s.isActive}
                        onClick={() => onPickForErrand(s)}
                        className="inline-flex items-center gap-1 text-xs font-bold text-nus-orange bg-orange-50/90 hover:bg-orange-100 border border-orange-200/90 hover:border-orange-300 px-3 py-1.5 rounded-xl shadow-2xs hover:shadow-xs disabled:opacity-40 disabled:cursor-not-allowed disabled:text-slate-400 transition cursor-pointer shrink-0 group-hover:scale-[1.02]"
                      >
                        <span>Pick for Errand</span>
                        <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            /* Traditional Card Grid View */
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4.5">
              {filteredSuppliers.map((s) => (
                <SpotCard key={s.id} supplier={s} onPickForErrand={onPickForErrand} />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
