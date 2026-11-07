/**
 * AI Assistance Disclosure:
 * Tool: Google Antigravity Agent, date: 2026-11-06
 * Scope: Redesigned SpotCard with live operating hours indicator, category-specific icons, and refined micro-hover states.
 * Author review: <to be completed by yanhwee>
 *
 * Tool: Google Antigravity Agent, date: 2026-10-28
 * Scope: Light interactive pill button styling for Pick for Errand CTA.
 * Author review: <to be completed by yanhwee>
 *
 * Tool: Google Antigravity Agent, date: 2026-10-28
 * Scope: Modernized campus spot directory card with category icons, live availability indicators, zone pills, and ergonomic CTA button.
 * Author review: <to be completed by yanhwee>
 *
 * Tool: Google Antigravity Agent, date: 2026-10-19
 * Scope: Extracted campus spot directory card component from student-app App.tsx into components/SpotCard.tsx.
 * Author review: Verified by yanhwee
 */

// AI-generated (edited by yanhwee)

import { SupplierDTO } from '@campus-errand/common-dtos';
import { ArrowRight, Clock, Coffee, MapPin, Package, Printer, Store, Utensils } from 'lucide-react';
import { formatOperatingHours, isOpenAt } from '../suppliers/operatingHours';

interface SpotCardProps {
  supplier: SupplierDTO;
  onPickForErrand: (supplier: SupplierDTO) => void;
}

function getCategoryIcon(category: string) {
  const cat = category.toUpperCase();
  if (cat.includes('FOOD') || cat.includes('DIN') || cat.includes('CANTEEN')) return Utensils;
  if (cat.includes('CAFE') || cat.includes('COFFEE') || cat.includes('BEV')) return Coffee;
  if (cat.includes('PRINT') || cat.includes('BOOK')) return Printer;
  if (cat.includes('LOCKER') || cat.includes('MAIL')) return Package;
  if (cat.includes('STORE') || cat.includes('MART') || cat.includes('SHOP')) return Store;
  return MapPin;
}

export function SpotCard({ supplier, onPickForErrand }: SpotCardProps) {
  const CategoryIcon = getCategoryIcon(supplier.category);
  const hoursFormatted = formatOperatingHours(supplier);
  const openStatus = isOpenAt(supplier, new Date());

  return (
    <div
      className={`group relative flex flex-col justify-between rounded-2xl p-4 sm:p-5 border shadow-subtle hover:shadow-card-hover transition-all duration-200 ${
        supplier.isActive
          ? 'bg-white border-slate-200/90 hover:border-nus-blue/50 hover:-translate-y-1'
          : 'bg-slate-50/80 border-slate-200/60 opacity-60'
      }`}
    >
      <div className="space-y-3">
        {/* Top Badges: Code & Campus Zone & Open State */}
        <div className="flex items-center justify-between gap-2">
          <span className="text-[11px] font-mono font-bold bg-slate-100 text-slate-700 px-2 py-0.5 rounded-lg border border-slate-200">
            {supplier.supplierCode}
          </span>
          <div className="flex items-center gap-1.5 shrink-0">
            <span className="text-xs bg-nus-blue-50 text-nus-blue font-bold px-2.5 py-0.5 rounded-lg border border-nus-blue-100 whitespace-nowrap">
              {supplier.campusZone}
            </span>
            {!supplier.isActive ? (
              <span className="text-xs bg-rose-50 text-rose-700 border border-rose-200 font-bold px-2 py-0.5 rounded-lg">
                Unavailable
              </span>
            ) : openStatus === true ? (
              <span className="inline-flex items-center gap-1 text-[11px] bg-emerald-50 text-emerald-700 border border-emerald-200 font-bold px-2 py-0.5 rounded-lg">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Open
              </span>
            ) : openStatus === false ? (
              <span className="inline-flex items-center gap-1 text-[11px] bg-slate-100 text-slate-600 border border-slate-200 font-semibold px-2 py-0.5 rounded-lg">
                Closed
              </span>
            ) : null}
          </div>
        </div>

        {/* Spot Name & Location */}
        <div>
          <h3 className="font-bold text-base text-slate-900 group-hover:text-nus-blue transition-colors line-clamp-1">
            {supplier.name}
          </h3>
          <p className="text-xs text-slate-500 mt-1 flex items-start gap-1 line-clamp-2">
            <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
            <span>{supplier.exactLocation}</span>
          </p>
        </div>

        {/* Operating Hours Snippet */}
        {hoursFormatted && (
          <div className="flex items-center gap-1.5 text-xs text-slate-500 bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-100">
            <Clock className="w-3 h-3 text-slate-400 shrink-0" />
            <span className="truncate">{hoursFormatted}</span>
          </div>
        )}
      </div>

      {/* Footer: Category & Action */}
      <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
        <span className="inline-flex items-center gap-1.5 text-xs text-slate-600 bg-slate-100/90 font-medium px-2.5 py-1 rounded-lg">
          <CategoryIcon className="w-3.5 h-3.5 text-slate-500" />
          <span>{supplier.category}</span>
        </span>

        <button
          type="button"
          disabled={!supplier.isActive}
          onClick={() => onPickForErrand(supplier)}
          className="inline-flex items-center gap-1.5 text-xs font-bold text-nus-orange bg-orange-50/90 hover:bg-orange-100 border border-orange-200/90 hover:border-orange-300 px-3.5 py-1.5 rounded-xl shadow-2xs hover:shadow-xs disabled:opacity-40 disabled:cursor-not-allowed disabled:text-slate-400 transition cursor-pointer group-hover:scale-[1.02]"
        >
          <span>Pick for Errand</span>
          <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />
        </button>
      </div>
    </div>
  );
}
