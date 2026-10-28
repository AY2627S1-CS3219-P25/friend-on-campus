/**
 * AI Assistance Disclosure:
 * Tool: Google Antigravity Agent, date: 2026-10-28
 * Scope: Integrated Natural-Language Errand Assistant (F6) with prompt extraction, template chips, draft preview, warning notices, and human-in-the-loop form prefilling.
 * Author review: <to be completed by yanhwee>
 *
 * Tool: Google Antigravity Agent, date: 2026-10-21
 * Scope: Added configurable acceptance duration (durationMinutes, 30-1440 mins, default 30 mins) per D1 F3.1.5.
 * Author review: <to be completed by yanhwee>
 *
 * Tool: Google Antigravity Agent, date: 2026-10-19
 * Scope: Extracted post errand form page from student-app App.tsx into pages/PostErrandPage.tsx.
 * Author review: Verified by yanhwee
 */

// AI-generated (edited by yanhwee)

import { CreditWalletDTO, ParsedErrandDraftDTO, SupplierDTO } from '@campus-errand/common-dtos';
import { AlertCircle, ArrowDown, Check, RefreshCw, Sparkles, Wand2, X } from 'lucide-react';
import React, { useState } from 'react';
import { AuthFetchFn } from '../api/auth';
import { parseErrandDraft } from '../api/orders';

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
  authFetch?: AuthFetchFn;
}

interface QuickTemplate {
  label: string;
  prompt: string;
}

const TEMPLATE_PROMPTS: QuickTemplate[] = [
  {
    label: '☕ TOMORO COFFEE',
    prompt: 'Can someone buy 2 iced lattes from TOMORO COFFEE to COM3 Level 2 by 2pm? Offering 6 credits',
  },
  {
    label: '🍱 A Hot Hideout',
    prompt: 'Can someone get a mala bowl from A Hot Hideout to UTown Residence by 1pm? Offering 8 credits',
  },
  {
    label: '🍦 Smooy COM3',
    prompt: 'Can someone grab 1 frozen yogurt from Smooy to COM2 #02-04? Offering 5 credits',
  },
];

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
  authFetch,
}: PostErrandPageProps) {
  const [assistantPrompt, setAssistantPrompt] = useState('');
  const [isExtracting, setIsExtracting] = useState(false);
  const [extractError, setExtractError] = useState<string | null>(null);
  const [extractedDraft, setExtractedDraft] = useState<ParsedErrandDraftDTO | null>(null);
  const [appliedNotice, setAppliedNotice] = useState(false);

  const handleExtractDraft = async () => {
    if (!assistantPrompt.trim()) return;
    if (!authFetch) {
      setExtractError('Authentication required to use AI Errand Assistant.');
      return;
    }

    setIsExtracting(true);
    setExtractError(null);
    setAppliedNotice(false);

    try {
      const draft = await parseErrandDraft(authFetch, assistantPrompt.trim());
      setExtractedDraft(draft);
    } catch (err) {
      setExtractError(err instanceof Error ? err.message : 'Failed to extract draft. Please try again.');
    } finally {
      setIsExtracting(false);
    }
  };

  const handleApplyDraft = () => {
    if (!extractedDraft) return;

    let targetSupplierId = formData.supplierId;
    let targetSupplierName = formData.supplierName;
    let targetCampusZone = formData.campusZone;

    if (extractedDraft.supplierId) {
      const found = suppliers.find((s) => s.id === extractedDraft.supplierId);
      if (found) {
        targetSupplierId = found.id;
        targetSupplierName = found.name;
        targetCampusZone = found.campusZone;
      }
    } else if (extractedDraft.matchedSupplierName) {
      const found = suppliers.find(
        (s) => s.name.toLowerCase() === extractedDraft.matchedSupplierName?.toLowerCase()
      );
      if (found) {
        targetSupplierId = found.id;
        targetSupplierName = found.name;
        targetCampusZone = found.campusZone;
      }
    }

    setFormData((prev) => ({
      ...prev,
      supplierId: targetSupplierId,
      supplierName: targetSupplierName,
      campusZone: targetCampusZone,
      itemDescription: extractedDraft.itemDescription || prev.itemDescription,
      dropoffLocation: extractedDraft.dropoffLocation || prev.dropoffLocation,
      specialNotes: extractedDraft.specialNotes ?? prev.specialNotes,
      rewardCredits:
        typeof extractedDraft.rewardCredits === 'number' && Number.isFinite(extractedDraft.rewardCredits)
          ? extractedDraft.rewardCredits
          : prev.rewardCredits,
      durationMinutes:
        typeof extractedDraft.durationMinutes === 'number' && Number.isFinite(extractedDraft.durationMinutes)
          ? extractedDraft.durationMinutes
          : prev.durationMinutes,
    }));

    setAppliedNotice(true);
    setTimeout(() => setAppliedNotice(false), 5000);
  };

  const handleClearAssistant = () => {
    setAssistantPrompt('');
    setExtractedDraft(null);
    setExtractError(null);
    setAppliedNotice(false);
  };

  return (
    <div className="space-y-4">
      <h2 className="text-xl lg:text-2xl font-bold text-slate-800">Post New Errand</h2>

      {/* AI Errand Assistant Panel (F6) */}
      <section
        aria-label="AI Errand Assistant"
        className="bg-gradient-to-r from-blue-50/80 via-indigo-50/60 to-purple-50/80 border border-blue-200/90 rounded-xl p-4 md:p-5 shadow-sm"
      >
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-nus-blue" />
            <h3 className="text-base font-bold text-slate-800">AI Errand Assistant</h3>
            <span className="text-xs bg-nus-blue/10 text-nus-blue font-semibold px-2 py-0.5 rounded-full">
              NUS SoCLaaS
            </span>
          </div>
          {(assistantPrompt || extractedDraft) && (
            <button
              type="button"
              onClick={handleClearAssistant}
              className="text-xs text-slate-500 hover:text-slate-700 flex items-center gap-1 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" /> Clear
            </button>
          )}
        </div>

        <p className="text-xs text-slate-600 mb-3">
          Type your errand request in plain English. The assistant extracts pickup spot, items, delivery location, and rewards into a draft for you to review and customize before posting.
        </p>

        <div className="space-y-2">
          <textarea
            rows={2}
            value={assistantPrompt}
            onChange={(e) => setAssistantPrompt(e.target.value)}
            disabled={isExtracting || submissionBusy}
            placeholder="e.g. Can someone buy 2 iced lattes from TOMORO COFFEE to COM2 #02-04 by 3pm? Offering 6 credits"
            className="w-full text-sm p-3 rounded-lg border border-slate-300 bg-white focus:ring-2 focus:ring-nus-blue outline-none resize-none shadow-inner"
          />

          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-xs font-medium text-slate-500">Quick templates:</span>
              {TEMPLATE_PROMPTS.map((tmpl, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setAssistantPrompt(tmpl.prompt)}
                  className="text-xs bg-white hover:bg-slate-100 text-slate-700 px-2 py-1 rounded-md border border-slate-200 shadow-sm transition cursor-pointer"
                >
                  {tmpl.label}
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={handleExtractDraft}
              disabled={isExtracting || !assistantPrompt.trim() || submissionBusy}
              className="inline-flex items-center gap-1.5 bg-nus-blue hover:bg-blue-900 text-white text-xs font-bold px-4 py-2 rounded-lg shadow-sm transition disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              {isExtracting ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  Extracting Draft…
                </>
              ) : (
                <>
                  <Wand2 className="w-3.5 h-3.5" />
                  Extract Draft
                </>
              )}
            </button>
          </div>
        </div>

        {extractError && (
          <div className="mt-3 p-2.5 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-500" />
            <span>{extractError}</span>
          </div>
        )}

        {extractedDraft && (
          <div className="mt-4 bg-white rounded-lg border border-slate-200 p-3.5 space-y-3 shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-600">
                Parsed Errand Draft
              </span>
              <button
                type="button"
                onClick={handleApplyDraft}
                className="inline-flex items-center gap-1 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-3 py-1.5 rounded-md shadow-sm transition cursor-pointer"
              >
                <ArrowDown className="w-3.5 h-3.5" />
                Apply to Form
              </button>
            </div>

            {extractedDraft.warnings && extractedDraft.warnings.length > 0 && (
              <div className="p-2.5 rounded-md bg-amber-50 border border-amber-200 text-xs text-amber-800 space-y-1">
                {extractedDraft.warnings.map((w, idx) => (
                  <div key={idx} className="flex items-start gap-1.5">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5 text-amber-600" />
                    <span>{w}</span>
                  </div>
                ))}
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
              <div>
                <span className="text-slate-500 block">Pickup Spot:</span>
                <span className="font-semibold text-slate-800">
                  {extractedDraft.matchedSupplierName || extractedDraft.supplierName || '⚠️ Not matched (select below)'}
                </span>
              </div>
              <div>
                <span className="text-slate-500 block">Delivery Drop-off:</span>
                <span className="font-semibold text-slate-800">
                  {extractedDraft.dropoffLocation || '⚠️ Missing (enter below)'}
                </span>
              </div>
              <div>
                <span className="text-slate-500 block">Item Summary:</span>
                <span className="font-semibold text-slate-800">{extractedDraft.itemDescription}</span>
              </div>
              <div className="flex gap-4">
                <div>
                  <span className="text-slate-500 block">Reward:</span>
                  <span className="font-semibold text-amber-700">{extractedDraft.rewardCredits} C</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Acceptance Duration:</span>
                  <span className="font-semibold text-slate-800">{extractedDraft.durationMinutes} mins</span>
                </div>
              </div>
              {extractedDraft.specialNotes && (
                <div className="md:col-span-2">
                  <span className="text-slate-500 block">Special Notes:</span>
                  <span className="text-slate-700 italic">{extractedDraft.specialNotes}</span>
                </div>
              )}
            </div>
          </div>
        )}

        {appliedNotice && (
          <div className="mt-3 p-2.5 rounded-md bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 flex items-center gap-2">
            <Check className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>
              Draft successfully applied to the form below! Please review and click <strong>Post Errand</strong> to confirm.
            </span>
          </div>
        )}
      </section>

      {/* Manual Errand Form (Human-in-the-loop review & final submission) */}
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
                    className="w-11 h-11 rounded bg-amber-200 text-amber-900 font-bold text-sm cursor-pointer"
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
                    className="w-11 h-11 rounded bg-amber-200 text-amber-900 font-bold text-sm cursor-pointer"
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
              className="w-full bg-nus-blue hover:bg-blue-900 text-white font-bold text-sm py-2.5 rounded-lg shadow transition disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
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
