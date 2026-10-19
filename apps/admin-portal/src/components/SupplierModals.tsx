/**
 * AI Assistance Disclosure:
 * Tool: Google Antigravity Agent, date: 2026-10-19
 * Scope: Extracted Supplier Filter, Add, Edit, Delete, and Details Inspection modals into src/components/SupplierModals.tsx.
 * Author review: Verified by yanhwee on 2026-10-19
 */

// AI-generated (edited by yanhwee)

import React from 'react';
import {
  CheckCircle,
  Trash2,
  X,
  XCircle,
} from 'lucide-react';
import {
  CreateSupplierRequest,
  SupplierCategory,
  SupplierDTO,
  UpdateSupplierRequest,
} from '@campus-errand/common-dtos';
import { CAMPUS_ZONES, CATEGORIES, SupplierLocationConflict } from '../constants';

interface SupplierModalsProps {
  isFilterModalOpen: boolean;
  setIsFilterModalOpen: (open: boolean) => void;
  draftSelectedZones: string[];
  setDraftSelectedZones: React.Dispatch<React.SetStateAction<string[]>>;
  draftSelectedCategories: string[];
  setDraftSelectedCategories: React.Dispatch<React.SetStateAction<string[]>>;
  toggleFilterChip: (list: string[], item: string, setter: React.Dispatch<React.SetStateAction<string[]>>) => void;
  resetAdvancedFilters: () => void;
  selectedZones: string[];
  selectedCategories: string[];
  setSelectedZones: (zones: string[]) => void;
  setSelectedCategories: (cats: string[]) => void;
  setCurrentPage: (page: number) => void;
  isAddOpen: boolean;
  setIsAddOpen: (open: boolean) => void;
  handleCreateSupplier: (e: React.FormEvent) => void;
  setAddFormErrors: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  setAddDuplicateConflict: (conflict: SupplierLocationConflict | null) => void;
  addDuplicateConflict: SupplierLocationConflict | null;
  newSupplier: CreateSupplierRequest;
  setNewSupplier: React.Dispatch<React.SetStateAction<CreateSupplierRequest>>;
  addFormErrors: Record<string, string>;
  isSubmitting: boolean;
  editingSupplier: SupplierDTO | null;
  setEditingSupplier: (s: SupplierDTO | null) => void;
  handleUpdateSupplier: (e: React.FormEvent) => void;
  setEditFormErrors: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  setEditDuplicateConflict: (conflict: SupplierLocationConflict | null) => void;
  editDuplicateConflict: SupplierLocationConflict | null;
  editFormData: UpdateSupplierRequest;
  setEditFormData: React.Dispatch<React.SetStateAction<UpdateSupplierRequest>>;
  editFormErrors: Record<string, string>;
  deletingSupplier: SupplierDTO | null;
  setDeletingSupplier: (s: SupplierDTO | null) => void;
  isPermanentDelete: boolean;
  setIsPermanentDelete: (perm: boolean) => void;
  handleDeleteSupplier: () => void;
  viewingSupplier: SupplierDTO | null;
  setViewingSupplier: (s: SupplierDTO | null) => void;
}

export function SupplierModals({
  isFilterModalOpen,
  setIsFilterModalOpen,
  draftSelectedZones,
  setDraftSelectedZones,
  draftSelectedCategories,
  setDraftSelectedCategories,
  toggleFilterChip,
  resetAdvancedFilters,
  selectedZones,
  selectedCategories,
  setSelectedZones,
  setSelectedCategories,
  setCurrentPage,
  isAddOpen,
  setIsAddOpen,
  handleCreateSupplier,
  setAddFormErrors,
  setAddDuplicateConflict,
  addDuplicateConflict,
  newSupplier,
  setNewSupplier,
  addFormErrors,
  isSubmitting,
  editingSupplier,
  setEditingSupplier,
  handleUpdateSupplier,
  setEditFormErrors,
  setEditDuplicateConflict,
  editDuplicateConflict,
  editFormData,
  setEditFormData,
  editFormErrors,
  deletingSupplier,
  setDeletingSupplier,
  isPermanentDelete,
  setIsPermanentDelete,
  handleDeleteSupplier,
  viewingSupplier,
  setViewingSupplier,
}: SupplierModalsProps) {
  return (
    <>
      {/* Advanced Filter Modal */}
      {isFilterModalOpen && (
        <div className="dialog-overlay fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-bold text-base text-slate-900">Filter Campus Suppliers</h3>
              <button
                onClick={() => {
                  setDraftSelectedCategories(selectedCategories);
                  setDraftSelectedZones(selectedZones);
                  setIsFilterModalOpen(false);
                }}
                className="admin-square-button text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">Category / Type</label>
              <div className="flex flex-wrap gap-2">
                {CATEGORIES.map((cat) => {
                  const active = draftSelectedCategories.includes(cat);
                  return (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => toggleFilterChip(draftSelectedCategories, cat, setDraftSelectedCategories)}
                      className={`px-3 py-1.5 rounded-lg text-sm font-semibold transition border ${
                        active
                          ? 'bg-blue-600 border-blue-600 text-white'
                          : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      {cat}
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">Campus Zone</label>
              <div className="flex flex-wrap gap-2">
                {CAMPUS_ZONES.map((zone) => {
                  const active = draftSelectedZones.includes(zone);
                  return (
                    <button
                      key={zone}
                      type="button"
                      onClick={() => toggleFilterChip(draftSelectedZones, zone, setDraftSelectedZones)}
                      className={`px-3 py-1.5 rounded-lg text-sm font-semibold transition border ${
                        active
                          ? 'bg-blue-600 border-blue-600 text-white'
                          : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      {zone}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={resetAdvancedFilters}
                className="text-sm font-bold text-slate-600 hover:text-slate-900"
              >
                Reset All Filters
              </button>
              <button
                type="button"
                onClick={() => {
                  setSelectedCategories(draftSelectedCategories);
                  setSelectedZones(draftSelectedZones);
                  setIsFilterModalOpen(false);
                  setCurrentPage(1);
                }}
                className="bg-slate-900 hover:bg-slate-800 text-white font-bold text-sm px-4 py-2 rounded-lg shadow"
              >
                Apply Filters
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Add Supplier Modal */}
      {isAddOpen && (
        <div className="dialog-overlay fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <form
            onSubmit={handleCreateSupplier}
            className="bg-white rounded-2xl max-w-2xl w-full p-4 sm:p-6 shadow-2xl space-y-4"
          >
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h3 className="font-bold text-base text-slate-900">Add New Campus Supplier</h3>
              <button
                type="button"
                onClick={() => {
                  setAddFormErrors({});
                  setAddDuplicateConflict(null);
                  setIsAddOpen(false);
                }}
                className="admin-square-button text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-400">
              Fields marked with <span className="text-rose-600 font-bold">*</span> are required.
            </p>
            <p className="text-xs text-slate-400">
              Admins are not allowed to create duplicate suppliers of the same category and location.
            </p>

            {addDuplicateConflict && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-sm space-y-1">
                <p className="font-bold">Duplicate supplier found</p>
                <p>An existing supplier already occupies this exact spot:</p>
                <ul className="list-disc list-inside">
                  <li>Name: {addDuplicateConflict.name}</li>
                  <li>Category: {addDuplicateConflict.category}</li>
                  <li>Building: {addDuplicateConflict.building}</li>
                  <li>Floor: {addDuplicateConflict.floor}</li>
                </ul>
              </div>
            )}

            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1">
                Store / Spot Name <span className="text-rose-600">*</span>
              </label>
              {addFormErrors.name && <p className="text-xs text-rose-600 mb-1">{addFormErrors.name}</p>}
              <input
                type="text"
                placeholder="e.g. LiHO Tea @ UTown"
                value={newSupplier.name}
                onChange={(e) => {
                  setNewSupplier({ ...newSupplier, name: e.target.value });
                  if (addFormErrors.name) setAddFormErrors({ ...addFormErrors, name: '' });
                }}
                className={`w-full text-sm p-2.5 rounded-lg border focus:ring-2 focus:ring-blue-500 outline-none ${
                  addFormErrors.name ? 'border-rose-400' : 'border-slate-300'
                }`}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">
                  Campus Zone <span className="text-rose-600">*</span>
                </label>
                {addFormErrors.campusZone && (
                  <p className="text-xs text-rose-600 mb-1">{addFormErrors.campusZone}</p>
                )}
                <select
                  value={newSupplier.campusZone}
                  onChange={(e) => {
                    setNewSupplier({ ...newSupplier, campusZone: e.target.value });
                    if (addFormErrors.campusZone) setAddFormErrors({ ...addFormErrors, campusZone: '' });
                  }}
                  className={`w-full text-sm p-2.5 rounded-lg border focus:ring-2 focus:ring-blue-500 outline-none ${
                    addFormErrors.campusZone ? 'border-rose-400' : 'border-slate-300'
                  }`}
                >
                  {CAMPUS_ZONES.map((z) => (
                    <option key={z} value={z}>{z}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">
                  Category <span className="text-rose-600">*</span>
                </label>
                {addFormErrors.category && <p className="text-xs text-rose-600 mb-1">{addFormErrors.category}</p>}
                <select
                  value={newSupplier.category}
                  onChange={(e) => {
                    setNewSupplier({ ...newSupplier, category: e.target.value as SupplierCategory });
                    if (addFormErrors.category) setAddFormErrors({ ...addFormErrors, category: '' });
                  }}
                  className={`w-full text-sm p-2.5 rounded-lg border focus:ring-2 focus:ring-blue-500 outline-none ${
                    addFormErrors.category ? 'border-rose-400' : 'border-slate-300'
                  }`}
                >
                  {CATEGORIES.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1">
                Exact Pickup Spot Description <span className="text-rose-600">*</span>
              </label>
              {addFormErrors.exactLocation && (
                <p className="text-xs text-rose-600 mb-1">{addFormErrors.exactLocation}</p>
              )}
              <input
                type="text"
                placeholder="e.g. Stephen Riady Centre Level 1 next to FairPrice"
                value={newSupplier.exactLocation}
                onChange={(e) => {
                  setNewSupplier({ ...newSupplier, exactLocation: e.target.value });
                  if (addFormErrors.exactLocation) setAddFormErrors({ ...addFormErrors, exactLocation: '' });
                }}
                className={`w-full text-sm p-2.5 rounded-lg border focus:ring-2 focus:ring-blue-500 outline-none ${
                  addFormErrors.exactLocation ? 'border-rose-400' : 'border-slate-300'
                }`}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">
                  Building <span className="text-rose-600">*</span>
                </label>
                {addFormErrors.building && <p className="text-xs text-rose-600 mb-1">{addFormErrors.building}</p>}
                <input
                  type="text"
                  placeholder="e.g. COM3"
                  value={newSupplier.building || ''}
                  onChange={(e) => setNewSupplier({ ...newSupplier, building: e.target.value })}
                  className="w-full text-sm p-2.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">
                  Floor <span className="text-rose-600">*</span>
                </label>
                {addFormErrors.floor && <p className="text-xs text-rose-600 mb-1">{addFormErrors.floor}</p>}
                <input
                  type="text"
                  placeholder="e.g. 1"
                  value={newSupplier.floor || ''}
                  onChange={(e) => setNewSupplier({ ...newSupplier, floor: e.target.value })}
                  className="w-full text-sm p-2.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">Opening Time</label>
                <input
                  type="text"
                  placeholder="0800hrs"
                  value={newSupplier.startingTime || ''}
                  onChange={(e) => setNewSupplier({ ...newSupplier, startingTime: e.target.value })}
                  className="w-full text-sm p-2.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">Closing Time</label>
                <input
                  type="text"
                  placeholder="2000hrs"
                  value={newSupplier.closingTime || ''}
                  onChange={(e) => setNewSupplier({ ...newSupplier, closingTime: e.target.value })}
                  className="w-full text-sm p-2.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1">Description</label>
              <textarea
                rows={4}
                placeholder="e.g. Specialty coffee, pastries, and sandwiches"
                value={newSupplier.description || ''}
                onChange={(e) => setNewSupplier({ ...newSupplier, description: e.target.value })}
                className="w-full text-sm p-2.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>

            <div className="flex justify-end space-x-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => {
                  setAddFormErrors({});
                  setAddDuplicateConflict(null);
                  setIsAddOpen(false);
                }}
                className="px-4 py-2 text-sm font-bold text-slate-600 hover:bg-slate-100 rounded-lg"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white font-bold text-sm px-4 py-2 rounded-lg shadow"
              >
                {isSubmitting ? 'Saving...' : 'Save Location'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Edit Supplier Modal */}
      {editingSupplier && (
        <div className="dialog-overlay fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <form
            onSubmit={handleUpdateSupplier}
            className="bg-white rounded-2xl max-w-2xl w-full p-4 sm:p-6 shadow-2xl space-y-4"
          >
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div>
                <h3 className="font-bold text-base text-slate-900">Edit Campus Location</h3>
                <span className="text-xs font-mono font-bold text-slate-400">
                  Code: {editingSupplier.supplierCode}
                </span>
              </div>
              <button
                type="button"
                onClick={() => {
                  setEditFormErrors({});
                  setEditDuplicateConflict(null);
                  setEditingSupplier(null);
                }}
                className="admin-square-button text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-400">
              Fields marked with <span className="text-rose-600 font-bold">*</span> are required.
            </p>
            <p className="text-xs text-slate-400">
              Admins are not allowed to create duplicate suppliers of the same category and location.
            </p>

            {editDuplicateConflict && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-sm space-y-1">
                <p className="font-bold">Duplicate supplier found</p>
                <p>An existing supplier already occupies this exact spot:</p>
                <ul className="list-disc list-inside">
                  <li>Name: {editDuplicateConflict.name}</li>
                  <li>Category: {editDuplicateConflict.category}</li>
                  <li>Building: {editDuplicateConflict.building}</li>
                  <li>Floor: {editDuplicateConflict.floor}</li>
                </ul>
              </div>
            )}

            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1">
                Store / Spot Name <span className="text-rose-600">*</span>
              </label>
              {editFormErrors.name && <p className="text-xs text-rose-600 mb-1">{editFormErrors.name}</p>}
              <input
                type="text"
                value={editFormData.name || ''}
                onChange={(e) => {
                  setEditFormData({ ...editFormData, name: e.target.value });
                  if (editFormErrors.name) setEditFormErrors({ ...editFormErrors, name: '' });
                }}
                className={`w-full text-sm p-2.5 rounded-lg border focus:ring-2 focus:ring-blue-500 outline-none ${
                  editFormErrors.name ? 'border-rose-400' : 'border-slate-300'
                }`}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">
                  Campus Zone <span className="text-rose-600">*</span>
                </label>
                {editFormErrors.campusZone && (
                  <p className="text-xs text-rose-600 mb-1">{editFormErrors.campusZone}</p>
                )}
                <select
                  value={editFormData.campusZone}
                  onChange={(e) => {
                    setEditFormData({ ...editFormData, campusZone: e.target.value });
                    if (editFormErrors.campusZone) setEditFormErrors({ ...editFormErrors, campusZone: '' });
                  }}
                  className={`w-full text-sm p-2.5 rounded-lg border focus:ring-2 focus:ring-blue-500 outline-none ${
                    editFormErrors.campusZone ? 'border-rose-400' : 'border-slate-300'
                  }`}
                >
                  {CAMPUS_ZONES.map((z) => (
                    <option key={z} value={z}>{z}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">
                  Category <span className="text-rose-600">*</span>
                </label>
                {editFormErrors.category && (
                  <p className="text-xs text-rose-600 mb-1">{editFormErrors.category}</p>
                )}
                <select
                  value={editFormData.category}
                  onChange={(e) => {
                    setEditFormData({ ...editFormData, category: e.target.value as SupplierCategory });
                    if (editFormErrors.category) setEditFormErrors({ ...editFormErrors, category: '' });
                  }}
                  className={`w-full text-sm p-2.5 rounded-lg border focus:ring-2 focus:ring-blue-500 outline-none ${
                    editFormErrors.category ? 'border-rose-400' : 'border-slate-300'
                  }`}
                >
                  {CATEGORIES.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1">
                Exact Pickup Spot Description <span className="text-rose-600">*</span>
              </label>
              {editFormErrors.exactLocation && (
                <p className="text-xs text-rose-600 mb-1">{editFormErrors.exactLocation}</p>
              )}
              <input
                type="text"
                value={editFormData.exactLocation || ''}
                onChange={(e) => {
                  setEditFormData({ ...editFormData, exactLocation: e.target.value });
                  if (editFormErrors.exactLocation) setEditFormErrors({ ...editFormErrors, exactLocation: '' });
                }}
                className={`w-full text-sm p-2.5 rounded-lg border focus:ring-2 focus:ring-blue-500 outline-none ${
                  editFormErrors.exactLocation ? 'border-rose-400' : 'border-slate-300'
                }`}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">
                  Building <span className="text-rose-600">*</span>
                </label>
                {editFormErrors.building && <p className="text-xs text-rose-600 mb-1">{editFormErrors.building}</p>}
                <input
                  type="text"
                  value={editFormData.building || ''}
                  onChange={(e) => setEditFormData({ ...editFormData, building: e.target.value })}
                  className="w-full text-sm p-2.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">
                  Floor <span className="text-rose-600">*</span>
                </label>
                {editFormErrors.floor && <p className="text-xs text-rose-600 mb-1">{editFormErrors.floor}</p>}
                <input
                  type="text"
                  value={editFormData.floor || ''}
                  onChange={(e) => setEditFormData({ ...editFormData, floor: e.target.value })}
                  className="w-full text-sm p-2.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">Opening Time</label>
                <input
                  type="text"
                  value={editFormData.startingTime || ''}
                  onChange={(e) => setEditFormData({ ...editFormData, startingTime: e.target.value })}
                  className="w-full text-sm p-2.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">Closing Time</label>
                <input
                  type="text"
                  value={editFormData.closingTime || ''}
                  onChange={(e) => setEditFormData({ ...editFormData, closingTime: e.target.value })}
                  className="w-full text-sm p-2.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1">Description</label>
              <textarea
                rows={4}
                value={editFormData.description || ''}
                onChange={(e) => setEditFormData({ ...editFormData, description: e.target.value })}
                className="w-full text-sm p-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>

            <div className="flex justify-end space-x-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => {
                  setEditFormErrors({});
                  setEditDuplicateConflict(null);
                  setEditingSupplier(null);
                }}
                className="px-4 py-2 text-sm font-bold text-slate-600 hover:bg-slate-100 rounded-lg"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold text-sm px-4 py-2 rounded-lg shadow"
              >
                {isSubmitting ? 'Updating...' : 'Save Changes'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Delete Supplier Confirmation Modal */}
      {deletingSupplier && (
        <div className="dialog-overlay fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center space-x-3 text-rose-600">
              <div className="w-10 h-10 rounded-full bg-rose-50 flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-base text-slate-900">Delete Campus Supplier</h3>
                <p className="text-sm text-slate-500">Confirm removal of supplier location</p>
              </div>
            </div>

            <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 text-sm space-y-1">
              <div className="font-bold text-slate-900">{deletingSupplier.name}</div>
              <div className="text-slate-500">{deletingSupplier.exactLocation} ({deletingSupplier.campusZone})</div>
              <div className="font-mono text-xs text-slate-400">Code: {deletingSupplier.supplierCode}</div>
            </div>

            <div className="space-y-2">
              <label className="flex items-start space-x-2 text-sm text-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isPermanentDelete}
                  onChange={(e) => setIsPermanentDelete(e.target.checked)}
                  className="rounded text-rose-600 focus:ring-rose-500 mt-0.5"
                />
                <div>
                  <span className="font-bold text-slate-900">Permanent Hard Delete</span>
                  <p className="text-xs text-slate-500">
                    Default is a soft-delete (marked inactive) to preserve student errand history. Checking this completely purges the record from the database.
                  </p>
                </div>
              </label>
            </div>

            <div className="flex justify-end space-x-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => {
                  setDeletingSupplier(null);
                  setIsPermanentDelete(false);
                }}
                className="px-4 py-2 text-sm font-bold text-slate-600 hover:bg-slate-100 rounded-lg"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isSubmitting}
                onClick={handleDeleteSupplier}
                className="bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white font-bold text-sm px-4 py-2 rounded-lg shadow"
              >
                {isSubmitting ? 'Deleting...' : isPermanentDelete ? 'Permanently Delete' : 'Deactivate Supplier'}
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Supplier Details Inspection Modal */}
      {viewingSupplier && (
        <div className="dialog-overlay fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <span className="text-xs font-mono font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded">
                  {viewingSupplier.supplierCode}
                </span>
                <h3 className="font-bold text-lg text-slate-900 mt-1">{viewingSupplier.name}</h3>
              </div>
              <button
                onClick={() => setViewingSupplier(null)}
                className="admin-square-button text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                <span className="text-slate-400 font-semibold block text-xs uppercase">Campus Zone</span>
                <span className="font-bold text-slate-800 text-sm mt-0.5 block">{viewingSupplier.campusZone}</span>
              </div>
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                <span className="text-slate-400 font-semibold block text-xs uppercase">Category</span>
                <span className="font-bold text-slate-800 text-sm mt-0.5 block">{viewingSupplier.category}</span>
              </div>
            </div>

            <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-100 space-y-2 text-sm">
              <div>
                <span className="text-slate-400 font-semibold block text-xs uppercase">Exact Pickup Spot</span>
                <span className="font-semibold text-slate-800">{viewingSupplier.exactLocation}</span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs text-slate-600 pt-1">
                <div>
                  <span className="text-slate-400">Building:</span>{' '}
                  <span className="font-medium">{viewingSupplier.building || 'Not specified'}</span>
                </div>
                <div>
                  <span className="text-slate-400">Floor / Level:</span>{' '}
                  <span className="font-medium">{viewingSupplier.floor || 'Not specified'}</span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                <span className="text-slate-400 font-semibold block text-xs uppercase">Operating Hours</span>
                <span className="font-mono font-semibold text-slate-700 mt-0.5 block">
                  {viewingSupplier.startingTime && viewingSupplier.closingTime
                    ? `${viewingSupplier.startingTime} - ${viewingSupplier.closingTime}`
                    : '24 / 7 or Unspecified'}
                </span>
              </div>
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                <span className="text-slate-400 font-semibold block text-xs uppercase">Availability Status</span>
                <span className="mt-0.5 block">
                  {viewingSupplier.isActive ? (
                    <span className="text-emerald-600 font-bold inline-flex items-center space-x-1">
                      <CheckCircle className="w-3.5 h-3.5" />
                      <span>Active</span>
                    </span>
                  ) : (
                    <span className="text-rose-600 font-bold inline-flex items-center space-x-1">
                      <XCircle className="w-3.5 h-3.5" />
                      <span>Unavailable</span>
                    </span>
                  )}
                </span>
              </div>
            </div>

            {viewingSupplier.description && (
              <div className="text-sm">
                <span className="text-slate-400 font-semibold block text-xs uppercase mb-1">Description</span>
                <p className="text-slate-600 bg-slate-50 p-3 rounded-xl border border-slate-100 italic">
                  {viewingSupplier.description}
                </p>
              </div>
            )}

            <div className="pt-2 text-xs text-slate-400 flex justify-between items-center font-mono">
              <span>ID: {viewingSupplier.id}</span>
              <span>Added: {new Date(viewingSupplier.createdAt).toLocaleDateString()}</span>
            </div>

            <div className="flex justify-end pt-3 border-t border-slate-100">
              <button
                onClick={() => setViewingSupplier(null)}
                className="bg-slate-900 hover:bg-slate-800 text-white font-bold text-sm px-4 py-2 rounded-lg"
              >
                Close Details
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
