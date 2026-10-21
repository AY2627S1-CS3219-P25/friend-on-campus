/**
 * AI Assistance Disclosure:
 * Tool: Google Antigravity Agent, date: 2026-10-19
 * Scope: Extracted campus spots directory page from student-app App.tsx into pages/SpotsPage.tsx.
 * Author review: Verified by yanhwee
 */

// AI-generated (edited by yanhwee)

import { SupplierDTO } from '@campus-errand/common-dtos';
import { Search } from 'lucide-react';
import { SpotCard } from '../components/SpotCard';

interface SpotsPageProps {
  filteredSuppliers: SupplierDTO[];
  supplierSearch: string;
  onChangeSearch: (query: string) => void;
  isSuppliersLoading: boolean;
  onPickForErrand: (supplier: SupplierDTO) => void;
}

export function SpotsPage({
  filteredSuppliers,
  supplierSearch,
  onChangeSearch,
  isSuppliersLoading,
  onPickForErrand,
}: SpotsPageProps) {
  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl lg:text-2xl font-bold text-slate-800">Campus Spots (M3)</h2>
            <p className="text-sm text-slate-500">Live directory fetched from Supplier Service</p>
          </div>
          <span className="text-sm bg-blue-50 text-blue-700 border border-blue-200 font-bold px-2 py-0.5 rounded-full">
            {filteredSuppliers.length} Verified
          </span>
        </div>

        {/* Spot Search Bar */}
        <div className="relative w-full lg:max-w-md">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            placeholder="Search food, cafes, lockers, print hubs..."
            value={supplierSearch}
            onChange={(e) => onChangeSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-sm bg-white rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-nus-blue shadow-sm"
          />
        </div>
      </div>

      {/* Loading Indicator */}
      {isSuppliersLoading && (
        <div className="p-4 text-center text-sm text-slate-400">Loading campus spots...</div>
      )}

      {/* List of Verified Spots */}
      <div className="responsive-card-grid">
        {!isSuppliersLoading && filteredSuppliers.length === 0 && (
          <p className="col-span-full rounded-xl border border-dashed border-slate-300 p-8 text-center text-slate-500">
            No campus spots match your search.
          </p>
        )}
        {filteredSuppliers.map((s) => (
          <SpotCard key={s.id} supplier={s} onPickForErrand={onPickForErrand} />
        ))}
      </div>
    </div>
  );
}
