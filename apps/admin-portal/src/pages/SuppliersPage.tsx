/**
 * AI Assistance Disclosure:
 * Tool: Google Antigravity Agent, date: 2026-10-19
 * Scope: Extracted SuppliersPage directory component into src/pages/SuppliersPage.tsx.
 * Author review: Verified by yanhwee on 2026-10-19
 */

// AI-generated (edited by yanhwee)

import {
  ArrowUpDown,
  CheckCircle,
  ChevronLeft,
  ChevronRight,
  Clock,
  Edit2,
  Eye,
  Search,
  SlidersHorizontal,
  Trash2,
  X,
  XCircle,
} from 'lucide-react';
import { SupplierDTO } from '@campus-errand/common-dtos';
import { CATEGORIES } from '../constants';

interface SuppliersPageProps {
  suppliers: SupplierDTO[];
  uniqueZones: number;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  setCurrentPage: (page: number | ((p: number) => number)) => void;
  selectedZones: string[];
  selectedCategories: string[];
  setDraftSelectedZones: (zones: string[]) => void;
  setDraftSelectedCategories: (cats: string[]) => void;
  setIsFilterModalOpen: (open: boolean) => void;
  activeFilterCount: number;
  pageSize: number;
  paginatedSuppliers: SupplierDTO[];
  filteredAndSorted: SupplierDTO[];
  setViewingSupplier: (s: SupplierDTO | null) => void;
  toggleStatus: (id: string) => void;
  openEditModal: (s: SupplierDTO) => void;
  setIsPermanentDelete: (perm: boolean) => void;
  setDeletingSupplier: (s: SupplierDTO | null) => void;
  handleSort: (field: keyof SupplierDTO) => void;
  currentPage: number;
  totalPages: number;
}

export function SuppliersPage({
  suppliers,
  uniqueZones,
  searchQuery,
  setSearchQuery,
  setCurrentPage,
  selectedZones,
  selectedCategories,
  setDraftSelectedZones,
  setDraftSelectedCategories,
  setIsFilterModalOpen,
  activeFilterCount,
  pageSize,
  paginatedSuppliers,
  filteredAndSorted,
  setViewingSupplier,
  toggleStatus,
  openEditModal,
  setIsPermanentDelete,
  setDeletingSupplier,
  handleSort,
  currentPage,
  totalPages,
}: SuppliersPageProps) {
  return (
            <div className="space-y-4">
              {/* Desktop KPI Stats Grid */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
                <div className="bg-white p-3.5 md:p-4 rounded-xl border border-slate-200 shadow-sm">
                  <span className="text-xs md:text-sm text-slate-500 font-semibold">Total Suppliers</span>
                  <p className="text-xl md:text-2xl font-black text-slate-900 mt-1">{suppliers.length}</p>
                </div>
                <div className="bg-white p-3.5 md:p-4 rounded-xl border border-slate-200 shadow-sm">
                  <span className="text-xs md:text-sm text-slate-500 font-semibold">Active Locations</span>
                  <p className="text-xl md:text-2xl font-black text-emerald-600 mt-1">
                    {suppliers.filter((s) => s.isActive).length}
                  </p>
                </div>
                <div className="bg-white p-3.5 md:p-4 rounded-xl border border-slate-200 shadow-sm">
                  <span className="text-xs md:text-sm text-slate-500 font-semibold">Campus Zones</span>
                  <p className="text-xl md:text-2xl font-black text-blue-600 mt-1">{uniqueZones} Zones</p>
                </div>
                <div className="bg-white p-3.5 md:p-4 rounded-xl border border-slate-200 shadow-sm">
                  <span className="text-xs md:text-sm text-slate-500 font-semibold">Categories</span>
                  <p className="text-xl md:text-2xl font-black text-amber-600 mt-1">{CATEGORIES.length} Types</p>
                </div>
              </div>

              {/* Filters & Search Row */}
              <div className="bg-white p-3.5 md:p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col xl:flex-row xl:items-center justify-between gap-3">
                <div className="relative flex-1 max-w-md flex items-center">
                  <Search className="w-4 h-4 absolute left-3 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search by name, building, code, or zone..."
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value);
                      setCurrentPage(1);
                    }}
                    className="w-full pl-9 pr-12 py-2 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery('')}
                      className="admin-square-button absolute right-0 text-slate-400 hover:text-slate-600"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    onClick={() => {
                      setDraftSelectedCategories(selectedCategories);
                      setDraftSelectedZones(selectedZones);
                      setIsFilterModalOpen(true);
                    }}
                    className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold border shrink-0 transition ${
                      activeFilterCount > 0
                        ? 'bg-blue-50 border-blue-300 text-blue-700'
                        : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <SlidersHorizontal className="w-3.5 h-3.5" />
                    <span>Filter</span>
                    {activeFilterCount > 0 && (
                      <span className="ml-1 bg-blue-600 text-white rounded-full text-xs w-4 h-4 inline-flex items-center justify-center font-bold">
                        {activeFilterCount}
                      </span>
                    )}
                  </button>
                </div>
              </div>

              {/* Mobile Card List View (Visible below the desktop table breakpoint) */}
              <div className="block xl:hidden space-y-3">
                {paginatedSuppliers.map((s) => (
                  <div
                    key={s.id}
                    className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-2.5"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <span className="text-xs font-mono font-bold bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded">
                          {s.supplierCode}
                        </span>
                        <h3 className="font-bold text-sm text-slate-900 mt-1">{s.name}</h3>
                        <p className="text-sm text-slate-500 mt-0.5">{s.exactLocation}</p>
                      </div>
                      <span
                        className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                          s.isActive
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : 'bg-rose-50 text-rose-700 border border-rose-200'
                        }`}
                      >
                        {s.isActive ? 'Active' : 'Unavailable'}
                      </span>
                    </div>

                    <div className="flex flex-wrap gap-2 text-xs text-slate-600">
                      <span className="bg-blue-50 text-blue-700 font-semibold px-2 py-0.5 rounded">
                        Zone: {s.campusZone}
                      </span>
                      <span className="bg-slate-100 text-slate-700 font-medium px-2 py-0.5 rounded">
                        {s.category}
                      </span>
                      {s.startingTime && s.closingTime && (
                        <span className="inline-flex items-center space-x-1 font-mono text-slate-500">
                          <Clock className="w-3 h-3 text-slate-400" />
                          <span>{s.startingTime} - {s.closingTime}</span>
                        </span>
                      )}
                    </div>

                    {s.description && (
                      <p className="text-xs text-slate-400 italic line-clamp-2">{s.description}</p>
                    )}

                    <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                      <button
                        onClick={() => toggleStatus(s.id)}
                        className={`text-sm font-semibold px-2.5 py-1 rounded transition ${
                          s.isActive ? 'text-amber-600 hover:bg-amber-50' : 'text-emerald-600 hover:bg-emerald-50'
                        }`}
                      >
                        {s.isActive ? 'Deactivate' : 'Activate'}
                      </button>

                      <div className="flex items-center space-x-1">
                        <button
                          onClick={() => setViewingSupplier(s)}
                          className="admin-square-button p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg"
                          title="View Details"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => openEditModal(s)}
                          className="admin-square-button p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg"
                          title="Edit Location"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => {
                            setDeletingSupplier(s);
                            setIsPermanentDelete(false);
                          }}
                          className="admin-square-button p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg"
                          title="Delete Location"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Desktop Data Table View (Visible when the desktop content area can accommodate a table) */}
              <div className="hidden xl:block bg-white rounded-xl border border-slate-200 shadow-sm overflow-x-auto">
                <table className="w-full min-w-[1100px] text-left border-collapse text-sm">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider select-none">
                      <th
                        onClick={() => handleSort('supplierCode')}
                        className="p-3.5 cursor-pointer hover:bg-slate-100 transition"
                      >
                        <div className="flex items-center space-x-1">
                          <span>Code</span>
                          <ArrowUpDown className="w-3 h-3 text-slate-400" />
                        </div>
                      </th>
                      <th
                        onClick={() => handleSort('name')}
                        className="p-3.5 cursor-pointer hover:bg-slate-100 transition"
                      >
                        <div className="flex items-center space-x-1">
                          <span>Store / Facility Name</span>
                          <ArrowUpDown className="w-3 h-3 text-slate-400" />
                        </div>
                      </th>
                      <th
                        onClick={() => handleSort('campusZone')}
                        className="p-3.5 cursor-pointer hover:bg-slate-100 transition"
                      >
                        <div className="flex items-center space-x-1">
                          <span>Campus Zone</span>
                          <ArrowUpDown className="w-3 h-3 text-slate-400" />
                        </div>
                      </th>
                      <th className="p-3.5">Building & Location</th>
                      <th
                        onClick={() => handleSort('category')}
                        className="p-3.5 cursor-pointer hover:bg-slate-100 transition"
                      >
                        <div className="flex items-center space-x-1">
                          <span>Category</span>
                          <ArrowUpDown className="w-3 h-3 text-slate-400" />
                        </div>
                      </th>
                      <th className="p-3.5">Operating Hours</th>
                      <th
                        onClick={() => handleSort('isActive')}
                        className="p-3.5 cursor-pointer hover:bg-slate-100 transition"
                      >
                        <div className="flex items-center space-x-1">
                          <span>Status</span>
                          <ArrowUpDown className="w-3 h-3 text-slate-400" />
                        </div>
                      </th>
                      <th className="p-3.5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {paginatedSuppliers.map((s) => (
                      <tr key={s.id} className="hover:bg-slate-50 transition">
                        <td className="p-3.5 font-mono font-bold text-slate-700">{s.supplierCode}</td>
                        <td className="p-3.5">
                          <div className="font-semibold text-slate-900">{s.name}</div>
                          {s.description && (
                            <div className="text-xs text-slate-400 truncate max-w-xs">{s.description}</div>
                          )}
                        </td>
                        <td className="p-3.5">
                          <span className="bg-blue-50 text-blue-700 px-2 py-0.5 rounded font-bold">
                            {s.campusZone}
                          </span>
                        </td>
                        <td className="p-3.5 text-slate-600">
                          <div>{s.exactLocation}</div>
                          {s.building && (
                            <span className="text-xs text-slate-400">
                              {s.building} {s.floor ? `· L${s.floor}` : ''}
                            </span>
                          )}
                        </td>
                        <td className="p-3.5">
                          <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded font-medium">
                            {s.category}
                          </span>
                        </td>
                        <td className="p-3.5 text-slate-600">
                          {s.startingTime && s.closingTime ? (
                            <span className="inline-flex items-center space-x-1 font-mono text-xs text-slate-500">
                              <Clock className="w-3 h-3 text-slate-400" />
                              <span>{s.startingTime} - {s.closingTime}</span>
                            </span>
                          ) : (
                            <span className="text-slate-400 italic text-xs">Unspecified</span>
                          )}
                        </td>
                        <td className="p-3.5">
                          {s.isActive ? (
                            <span className="inline-flex items-center space-x-1 text-emerald-600 font-semibold">
                              <CheckCircle className="w-3.5 h-3.5" />
                              <span>Active</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center space-x-1 text-rose-500 font-semibold">
                              <XCircle className="w-3.5 h-3.5" />
                              <span>Unavailable</span>
                            </span>
                          )}
                        </td>
                        <td className="p-3.5 text-right whitespace-nowrap space-x-1">
                          <button
                            onClick={() => toggleStatus(s.id)}
                            className={`text-sm font-semibold px-2 py-1 rounded transition ${
                              s.isActive ? 'text-amber-600 hover:bg-amber-50' : 'text-emerald-600 hover:bg-emerald-50'
                            }`}
                            title={s.isActive ? 'Deactivate supplier' : 'Activate supplier'}
                          >
                            {s.isActive ? 'Deactivate' : 'Activate'}
                          </button>
                          <button
                            onClick={() => setViewingSupplier(s)}
                            className="admin-square-button p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded"
                            title="View full details"
                          >
                            <Eye className="w-3.5 h-3.5 inline" />
                          </button>
                          <button
                            onClick={() => openEditModal(s)}
                            className="admin-square-button p-1 text-blue-500 hover:text-blue-700 hover:bg-blue-50 rounded"
                            title="Edit details"
                          >
                            <Edit2 className="w-3.5 h-3.5 inline" />
                          </button>
                          <button
                            onClick={() => {
                              setDeletingSupplier(s);
                              setIsPermanentDelete(false);
                            }}
                            className="admin-square-button p-1 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded"
                            title="Delete supplier"
                          >
                            <Trash2 className="w-3.5 h-3.5 inline" />
                          </button>
                        </td>
                      </tr>
                    ))}
                    {paginatedSuppliers.length === 0 && (
                      <tr>
                        <td colSpan={8} className="p-8 text-center text-slate-400">
                          No campus suppliers found matching your query.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Unified Pagination Bar */}
              <div className="p-3 bg-white rounded-xl border border-slate-200 text-sm text-slate-600 flex flex-col sm:flex-row justify-between items-center gap-2">
                <span>
                  Showing {Math.min(filteredAndSorted.length, (currentPage - 1) * pageSize + 1)} to{' '}
                  {Math.min(filteredAndSorted.length, currentPage * pageSize)} of {filteredAndSorted.length} campus locations
                </span>

                <div className="flex max-w-full flex-wrap items-center justify-center gap-1">
                  <button
                    disabled={currentPage <= 1}
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    className="admin-square-button p-1.5 rounded-lg border border-slate-200 disabled:opacity-40 hover:bg-slate-50 transition"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>

                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                    <button
                      key={page}
                      onClick={() => setCurrentPage(page)}
                      className={`admin-square-button rounded-lg text-sm font-bold transition ${
                        currentPage === page
                          ? 'bg-slate-900 text-white'
                          : 'border border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      {page}
                    </button>
                  ))}

                  <button
                    disabled={currentPage >= totalPages}
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    className="admin-square-button p-1.5 rounded-lg border border-slate-200 disabled:opacity-40 hover:bg-slate-50 transition"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
  );
}
