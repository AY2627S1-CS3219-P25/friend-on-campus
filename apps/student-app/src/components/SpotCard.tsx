/**
 * AI Assistance Disclosure:
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
import { ArrowRight, Coffee, MapPin, Package, Printer, Store, Utensils } from 'lucide-react';

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

  return (
    <div
      className={`group relative flex flex-col justify-between rounded-2xl p-4 sm:p-5 border shadow-subtle transition-all duration-200 ${
        supplier.isActive
          ? 'bg-white border-slate-200/90 hover:border-nus-blue/40 hover:shadow-elevated hover:-translate-y-0.5'
          : 'bg-slate-50/80 border-slate-200/60 opacity-60'
      }`}
    >
      <div>
        {/* Top Badges: Code & Campus Zone */}
        <div className="flex items-center justify-between gap-2">
          <span className="text-[11px] font-mono font-bold bg-slate-100 text-slate-600 px-2 py-0.5 rounded-md border border-slate-200">
            {supplier.supplierCode}
          </span>
          <div className="flex items-center gap-1.5 shrink-0">
            <span className="text-xs bg-nus-blue-50 text-nus-blue font-bold px-2.5 py-0.5 rounded-md border border-nus-blue-100 whitespace-nowrap">
              {supplier.campusZone}
            </span>
            {!supplier.isActive && (
              <span className="text-xs bg-rose-50 text-rose-700 border border-rose-200 font-bold px-2 py-0.5 rounded-md">
                Unavailable
              </span>
            )}
          </div>
        </div>

        {/* Spot Name & Location */}
        <div className="mt-3">
          <h3 className="font-bold text-base text-slate-900 group-hover:text-nus-blue transition-colors line-clamp-1">
            {supplier.name}
          </h3>
          <p className="text-xs text-slate-500 mt-1 flex items-start gap-1 line-clamp-2">
            <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
            <span>{supplier.exactLocation}</span>
          </p>
        </div>
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
          className="inline-flex items-center gap-1.5 text-xs font-bold text-nus-orange bg-orange-50/80 hover:bg-orange-100 border border-orange-200/80 hover:border-orange-300 px-3 py-1.5 rounded-xl shadow-2xs hover:shadow-xs disabled:opacity-40 disabled:cursor-not-allowed disabled:text-slate-400 transition cursor-pointer"
        >
          <span>Pick for Errand</span>
          <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />
        </button>
      </div>
    </div>
  );
}
