/**
 * AI Assistance Disclosure:
 * Tool: Google Antigravity Agent, date: 2026-10-21
 * Scope: Added configurable acceptance duration (durationMinutes, 30-1440 mins, default 30 mins) per D1 F3.1.5.
 * Author review: <to be completed by yanhwee>
 *
 * Tool: Google Antigravity Agent, date: 2026-10-19
 * Scope: Extracted post errand form page from student-app App.tsx into pages/PostErrandPage.tsx.
 * Author review: Verified by yanhwee
 */

// AI-generated (edited by yanhwee)

import { CreditWalletDTO, SupplierDTO } from '@campus-errand/common-dtos';
import React from 'react';

export interface PostErrandFormData {
  supplierId: string;
  supplierName: string;
  campusZone: string;
  itemDescription: string;
  specialNotes: string;
  dropoffLocation: string;
  rewardCredits: number;
  durationMinutes: number;
}

interface PostErrandPageProps {
  formData: PostErrandFormData;
  setFormData: React.Dispatch<React.SetStateAction<PostErrandFormData>>;
  suppliers: SupplierDTO[];
  activeSuppliers: SupplierDTO[];
  isSuppliersLoading: boolean;
  wallet: CreditWalletDTO | null;
  submissionBusy: boolean;
  submissionPosting: boolean;
  onSubmit: (e: React.FormEvent) => void;
}

export function PostErrandPage({
  formData,
  setFormData,
  suppliers,
  activeSuppliers,
  isSuppliersLoading,
  wallet,
  submissionBusy,
  submissionPosting,
  onSubmit,
}: PostErrandPageProps) {
  return (
    <div className="space-y-4">
      <h2 className="text-xl lg:text-2xl font-bold text-slate-800">Post New Errand</h2>
      <form onSubmit={onSubmit}>
        <fieldset
          disabled={submissionBusy}
          className="min-w-0 grid grid-cols-1 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)] gap-6 items-start"
        >
          <div className="min-w-0 bg-white rounded-xl p-4 md:p-6 shadow-sm border border-slate-200 space-y-5">
            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="block text-sm font-bold text-slate-700">
                  Pickup Store / Spot (Live M3 Directory)
                </label>
                <span className="text-xs text-blue-600 font-semibold">
                  {activeSuppliers.length} active spots
                </span>
              </div>
              <select
                required
                aria-label="Pickup spot"
                value={formData.supplierId}
                onChange={(e) => {
                  const chosen = suppliers.find((s) => s.id === e.target.value);
                  if (chosen) {
                    setFormData({
                      ...formData,
                      supplierId: chosen.id,
                      supplierName: chosen.name,
                      campusZone: chosen.campusZone,
                    });
                  }
                }}
                className="w-full text-sm p-2.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-nus-blue outline-none"
              >
                {activeSuppliers.length === 0 && (
                  <option value="">
                    {isSuppliersLoading ? 'Loading pickup spots…' : 'No pickup spots available'}
                  </option>
                )}
                {activeSuppliers.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.campusZone} - {s.category})
                  </option>
                ))}
              </select>
              <p className="text-xs text-slate-400 mt-1">
                Selected Zone: <span className="font-bold text-slate-600">{formData.campusZone}</span>
              </p>
            </div>

            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1">
                Item Description & Order Details
              </label>
              <input
                type="text"
                required
                maxLength={1000}
                placeholder="e.g. 1x Cold Brew Coffee + 1x Croissant"
                value={formData.itemDescription}
                onChange={(e) => setFormData({ ...formData, itemDescription: e.target.value })}
                className="w-full text-sm p-2.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-nus-blue outline-none"
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1">
                Drop-off Study Spot & Visual Cue
              </label>
              <input
                type="text"
                required
                maxLength={255}
                placeholder="e.g. COM2 Level 2 Room #02-04 (Wearing NUS grey hoodie)"
                value={formData.dropoffLocation}
                onChange={(e) => setFormData({ ...formData, dropoffLocation: e.target.value })}
                className="w-full text-sm p-2.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-nus-blue outline-none"
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1">
                Special Delivery Notes (Optional)
              </label>
              <textarea
                rows={2}
                maxLength={1000}
                placeholder="e.g. Less ice, separate paper bag, PIN code for lockers"
                value={formData.specialNotes}
                onChange={(e) => setFormData({ ...formData, specialNotes: e.target.value })}
                className="w-full text-sm p-2.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-nus-blue outline-none"
              />
            </div>
          </div>

          <aside aria-label="Reward and posting" className="min-w-0 space-y-4">
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 md:p-6">
              <div className="flex flex-wrap gap-3 items-center justify-between">
                <span className="text-sm font-bold text-amber-900">Courier Reward Credits:</span>
                <div className="flex items-center space-x-2">
                  <button
                    type="button"
                    aria-label="Decrease reward"
                    onClick={() =>
                      setFormData((f) => ({
                        ...f,
                        rewardCredits: Math.max(
                          1,
                          (Number.isFinite(f.rewardCredits) ? f.rewardCredits : 1) - 1
                        ),
                      }))
                    }
                    className="w-11 h-11 rounded bg-amber-200 text-amber-900 font-bold text-sm"
                  >
                    -
                  </button>
                  <input
                    type="number"
                    aria-label="Reward credits"
                    required
                    min={1}
                    max={2147483647}
                    step={1}
                    value={Number.isFinite(formData.rewardCredits) ? formData.rewardCredits : ''}
                    onChange={(event) =>
                      setFormData((current) => ({
                        ...current,
                        rewardCredits: event.target.valueAsNumber,
                      }))
                    }
                    className="reward-input w-24 rounded border border-amber-300 bg-white px-2 text-center font-bold text-amber-900"
                  />
                  <button
                    type="button"
                    aria-label="Increase reward"
                    onClick={() =>
                      setFormData((f) => ({
                        ...f,
                        rewardCredits: Math.min(
                          2147483647,
                          (Number.isFinite(f.rewardCredits) ? f.rewardCredits : 0) + 1
                        ),
                      }))
                    }
                    className="w-11 h-11 rounded bg-amber-200 text-amber-900 font-bold text-sm"
                  >
                    +
                  </button>
                </div>
              </div>
              <p className="text-xs text-amber-700 mt-1">
                Enter a whole number of at least 1 credit. Available:{' '}
                {wallet ? `${wallet.availableCredits} C` : '—'}. Credits are reserved before your
                errand is posted.
              </p>
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 md:p-6">
              <div className="flex flex-wrap gap-3 items-center justify-between">
                <label htmlFor="duration-minutes-input" className="text-sm font-bold text-slate-800">
                  Acceptance Duration (mins):
                </label>
                <input
                  id="duration-minutes-input"
                  type="number"
                  aria-label="Acceptance duration in minutes"
                  required
                  min={30}
                  max={1440}
                  step={1}
                  value={Number.isFinite(formData.durationMinutes) ? formData.durationMinutes : ''}
                  onChange={(event) =>
                    setFormData((current) => ({
                      ...current,
                      durationMinutes: event.target.valueAsNumber,
                    }))
                  }
                  className="w-24 rounded border border-slate-300 bg-white px-2 py-1.5 text-center font-bold text-slate-800"
                />
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Between 30 and 1440 mins (30 mins – 24 hrs, default 30). Unaccepted errands expire automatically and refund reserved credits.
              </p>
            </div>

            <button
              type="submit"
              disabled={
                submissionBusy ||
                isSuppliersLoading ||
                !activeSuppliers.some((s) => s.id === formData.supplierId)
              }
              className="w-full bg-nus-blue hover:bg-blue-900 text-white font-bold text-sm py-2.5 rounded-lg shadow transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submissionPosting
                ? 'Submitting…'
                : submissionBusy
                ? 'Reserving credits…'
                : 'Post Errand'}
            </button>
          </aside>
        </fieldset>
      </form>
    </div>
  );
}
