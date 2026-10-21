/**
 * AI Assistance Disclosure:
 * Tool: Google Antigravity Agent, date: 2026-10-19
 * Scope: Extracted campus spot directory card component from student-app App.tsx into components/SpotCard.tsx.
 * Author review: Verified by yanhwee
 */

// AI-generated (edited by yanhwee)

import { SupplierDTO } from '@campus-errand/common-dtos';
import { ArrowRight } from 'lucide-react';

interface SpotCardProps {
  supplier: SupplierDTO;
  onPickForErrand: (supplier: SupplierDTO) => void;
}

export function SpotCard({ supplier, onPickForErrand }: SpotCardProps) {
  return (
    <div
      className={`rounded-xl p-3.5 border shadow-sm space-y-2 ${
        supplier.isActive
          ? 'bg-white border-slate-200'
          : 'bg-slate-50 border-slate-200 opacity-60'
      }`}
    >
      <div className="flex items-start justify-between">
        <div>
          <span className="text-xs font-mono font-bold bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded">
            {supplier.supplierCode}
          </span>
          <h3 className="font-bold text-sm text-slate-900 mt-1">{supplier.name}</h3>
          <p className="text-sm text-slate-500">{supplier.exactLocation}</p>
        </div>
        <div className="flex flex-col items-end gap-1">
          <span className="text-xs bg-blue-50 text-blue-700 font-bold px-2 py-0.5 rounded">
            {supplier.campusZone}
          </span>
          {!supplier.isActive && (
            <span className="text-xs bg-rose-50 text-rose-700 border border-rose-200 font-bold px-2 py-0.5 rounded">
              Unavailable
            </span>
          )}
        </div>
      </div>

      <div className="flex items-center justify-between pt-2 border-t border-slate-100">
        <span className="text-xs text-slate-600 bg-slate-100 px-2 py-0.5 rounded">
          {supplier.category}
        </span>
        <button
          disabled={!supplier.isActive}
          onClick={() => onPickForErrand(supplier)}
          className="text-sm font-bold text-nus-orange hover:text-orange-700 flex items-center space-x-1 disabled:opacity-40 disabled:cursor-not-allowed disabled:text-slate-400 disabled:hover:text-slate-400"
        >
          <span>Pick for Errand</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
