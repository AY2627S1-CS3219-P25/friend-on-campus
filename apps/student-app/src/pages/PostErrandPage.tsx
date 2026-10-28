/**
 * AI Assistance Disclosure:
 * Tool: Google Antigravity Agent, date: 2026-10-28
 * Scope: Refined PostErrandPage layout to remove redundant header wallet card and styled AI Errand Assistant in consistent light theme.
 * Author review: <to be completed by yanhwee>
 *
 * Tool: Google Antigravity Agent, date: 2026-10-28
 * Scope: Redesigned PostErrandPage UI/UX, implemented synchronous double-click submission lock, balance validation guards, presets, and progressive status feedback.
 * Author review: <to be completed by yanhwee>
 *
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
import {
  AlertCircle,
  AlertTriangle,
  ArrowDown,
  Check,
  CheckCircle2,
  Clock,
  Coins,
  FileText,
  MapPin,
  RefreshCw,
  ShoppingBag,
  Sparkles,
  Store,
  Wand2,
  X,
} from 'lucide-react';
import React, { useRef, useState } from 'react';
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
  submissionError?: string | null;
  submissionUnconfirmed?: boolean;
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
  submissionError,
  submissionUnconfirmed,
  onSubmit,
  authFetch,
}: PostErrandPageProps) {
  const [assistantPrompt, setAssistantPrompt] = useState('');
  const [isExtracting, setIsExtracting] = useState(false);
  const [extractError, setExtractError] = useState<string | null>(null);
  const [extractedDraft, setExtractedDraft] = useState<ParsedErrandDraftDTO | null>(null);
  const [appliedNotice, setAppliedNotice] = useState(false);
  const [dismissError, setDismissError] = useState(false);

  // Synchronous submit lock to prevent multi-clicks before React re-render cycles
  const isSubmittingRef = useRef(false);

  // Credit balance safety checks
  const availableCredits = wallet ? wallet.availableCredits : null;
  const isOverdraw = availableCredits !== null && formData.rewardCredits > availableCredits;
  const isZeroBalance = availableCredits !== null && availableCredits <= 0;

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

  // Safe submit handler with synchronous debounce lock
  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmittingRef.current || submissionBusy) return;
    if (isOverdraw || isZeroBalance) return;

    isSubmittingRef.current = true;
    try {
      onSubmit(e);
    } finally {
      // Release lock after a debounce window
      setTimeout(() => {
        isSubmittingRef.current = false;
      }, 1000);
    }
  };

  const handlePresetCredits = (credits: number) => {
    setFormData((prev) => ({ ...prev, rewardCredits: credits }));
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header section */}
      <div className="border-b border-slate-200/80 pb-3">
        <h2 className="text-2xl font-black text-slate-900 tracking-tight">Post New Errand</h2>
        <p className="text-sm text-slate-500 mt-0.5">
          Request items from NUS campus spots. Fellow students deliver for reward credits.
        </p>
      </div>

      {/* Backend / Network Submission Alerts */}
      {submissionError && !dismissError && (
        <div
          role="alert"
          className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 flex items-start justify-between gap-3 shadow-xs animate-in fade-in"
        >
          <div className="flex items-start gap-2.5">
            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-sm">Submission Error</p>
              <p className="text-xs mt-0.5">{submissionError}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setDismissError(true)}
            className="text-rose-600 hover:text-rose-800 p-1 rounded-md"
            aria-label="Dismiss error"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {submissionUnconfirmed && (
        <div
          role="alert"
          className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 flex items-start gap-3 shadow-xs"
        >
          <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="text-xs">
            <p className="font-bold text-sm text-amber-900">Submission confirmation pending</p>
            <p className="mt-0.5">
              Your errand request was sent, but the network connection was interrupted before receiving a receipt. Please
              check your <strong>Tasks</strong> tab before attempting to post again to avoid duplicate orders.
            </p>
          </div>
        </div>
      )}

      {/* AI Errand Assistant Panel (F6) */}
      <section
        aria-label="AI Errand Assistant"
        className="bg-gradient-to-br from-blue-50/70 via-indigo-50/40 to-orange-50/40 text-slate-800 rounded-2xl p-5 md:p-6 shadow-xs border border-blue-200/80 relative overflow-hidden"
      >
        <div className="relative z-10">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2.5">
              <span className="p-1.5 rounded-lg bg-nus-orange/10 text-nus-orange border border-nus-orange/20">
                <Sparkles className="w-4 h-4" />
              </span>
              <h3 className="text-base font-bold text-slate-900 tracking-tight">AI Errand Assistant</h3>
              <span className="text-[11px] bg-nus-blue/10 text-nus-blue font-semibold px-2 py-0.5 rounded-full border border-nus-blue/20">
                NUS SoCLaaS M3
              </span>
            </div>
            {(assistantPrompt || extractedDraft) && (
              <button
                type="button"
                onClick={handleClearAssistant}
                className="text-xs text-slate-500 hover:text-slate-800 flex items-center gap-1 cursor-pointer transition"
              >
                <X className="w-3.5 h-3.5" /> Clear prompt
              </button>
            )}
          </div>

          <p className="text-xs text-slate-600 mb-3 max-w-2xl">
            Type your request in plain natural English. The assistant parses pickup spot, items, dropoff destination, and
            reward credits into a draft for you to review and customize.
          </p>

          <div className="space-y-3">
            <textarea
              id="ai-assistant-prompt"
              rows={2}
              value={assistantPrompt}
              onChange={(e) => setAssistantPrompt(e.target.value)}
              disabled={isExtracting || submissionBusy}
              placeholder="e.g. Can someone buy 2 iced lattes from TOMORO COFFEE to COM2 #02-04 by 3pm? Offering 6 credits"
              className="w-full text-sm p-3.5 rounded-xl border border-blue-200/90 bg-white text-slate-900 placeholder:text-slate-400 focus:ring-2 focus:ring-nus-blue/30 focus:border-nus-blue outline-none resize-none shadow-2xs"
            />

            <div className="flex flex-wrap items-center justify-between gap-2.5">
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-xs font-semibold text-slate-600">Quick prompts:</span>
                {TEMPLATE_PROMPTS.map((tmpl, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setAssistantPrompt(tmpl.prompt)}
                    className="text-xs bg-white hover:bg-slate-50 text-slate-700 px-2.5 py-1 rounded-lg border border-slate-200/90 shadow-2xs transition cursor-pointer"
                  >
                    {tmpl.label}
                  </button>
                ))}
              </div>

              <button
                type="button"
                onClick={handleExtractDraft}
                disabled={isExtracting || !assistantPrompt.trim() || submissionBusy}
                className="inline-flex items-center gap-1.5 bg-nus-orange hover:bg-orange-600 text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow-xs transition disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
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
            <div className="mt-3 p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-800 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" />
              <span>{extractError}</span>
            </div>
          )}

          {extractedDraft && (
            <div className="mt-4 bg-white text-slate-900 rounded-xl border border-slate-200 p-4 space-y-3 shadow-xs">
              <div className="flex items-center justify-between border-b border-slate-200/80 pb-2">
                <span className="text-xs font-extrabold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  Parsed Errand Draft
                </span>
                <button
                  type="button"
                  onClick={handleApplyDraft}
                  className="inline-flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-3.5 py-1.5 rounded-lg shadow-xs transition cursor-pointer"
                >
                  <ArrowDown className="w-3.5 h-3.5" />
                  Apply to Form Below
                </button>
              </div>

              {extractedDraft.warnings && extractedDraft.warnings.length > 0 && (
                <div className="p-2.5 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-800 space-y-1">
                  {extractedDraft.warnings.map((w, idx) => (
                    <div key={idx} className="flex items-start gap-1.5">
                      <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5 text-amber-600" />
                      <span>{w}</span>
                    </div>
                  ))}
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                <div className="p-2.5 bg-slate-50/80 rounded-lg border border-slate-100">
                  <span className="text-slate-500 font-medium block">Pickup Spot:</span>
                  <span className="font-bold text-slate-900">
                    {extractedDraft.matchedSupplierName || extractedDraft.supplierName || '⚠️ Not matched (select below)'}
                  </span>
                </div>
                <div className="p-2.5 bg-slate-50/80 rounded-lg border border-slate-100">
                  <span className="text-slate-500 font-medium block">Delivery Drop-off:</span>
                  <span className="font-bold text-slate-900">
                    {extractedDraft.dropoffLocation || '⚠️ Missing (enter below)'}
                  </span>
                </div>
                <div className="p-2.5 bg-slate-50/80 rounded-lg border border-slate-100 md:col-span-2">
                  <span className="text-slate-500 font-medium block">Item Summary:</span>
                  <span className="font-semibold text-slate-800">{extractedDraft.itemDescription}</span>
                </div>
                <div className="flex gap-4 p-2.5 bg-slate-50/80 rounded-lg border border-slate-100 md:col-span-2">
                  <div>
                    <span className="text-slate-500 font-medium block">Reward Offer:</span>
                    <span className="font-bold text-amber-700">{extractedDraft.rewardCredits} Credits</span>
                  </div>
                  <div>
                    <span className="text-slate-500 font-medium block">Duration Window:</span>
                    <span className="font-bold text-slate-800">{extractedDraft.durationMinutes} mins</span>
                  </div>
                </div>
                {extractedDraft.specialNotes && (
                  <div className="md:col-span-2 p-2.5 bg-slate-50/80 rounded-lg border border-slate-100">
                    <span className="text-slate-500 font-medium block">Special Notes:</span>
                    <span className="text-slate-700 italic">{extractedDraft.specialNotes}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {appliedNotice && (
            <div className="mt-3 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 flex items-center gap-2">
              <Check className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>
                Draft applied to the form below! Review details and click <strong>Post Errand</strong> to submit.
              </span>
            </div>
          )}
        </div>
      </section>

      {/* Manual Errand Form (Human-in-the-loop review & final submission) */}
      <form onSubmit={handleFormSubmit} noValidate={false}>
        <fieldset
          disabled={submissionBusy}
          className="min-w-0 grid grid-cols-1 lg:grid-cols-[minmax(0,2fr)_minmax(0,1.2fr)] gap-6 items-start"
        >
          {/* Main Details Card */}
          <div className="min-w-0 bg-white rounded-2xl p-5 md:p-6 shadow-sm border border-slate-200/90 space-y-5">
            {/* Pickup Spot Selector */}
            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label htmlFor="errand-supplier-select" className="block text-sm font-bold text-slate-800 flex items-center gap-1.5">
                  <Store className="w-4 h-4 text-nus-blue" />
                  <span>Pickup Store / Campus Spot</span>
                  <span className="text-rose-500">*</span>
                </label>
                <span className="text-xs text-nus-blue font-semibold bg-blue-50 px-2 py-0.5 rounded-full border border-blue-100">
                  {activeSuppliers.length} active spots
                </span>
              </div>
              <select
                id="errand-supplier-select"
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
                className="w-full text-sm p-3 rounded-xl border border-slate-300 bg-white focus:ring-2 focus:ring-nus-blue focus:border-transparent outline-none transition"
              >
                {activeSuppliers.length === 0 && (
                  <option value="">
                    {isSuppliersLoading ? 'Loading pickup spots…' : 'No pickup spots available'}
                  </option>
                )}
                {activeSuppliers.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.campusZone} • {s.category})
                  </option>
                ))}
              </select>
              <div className="flex items-center justify-between text-xs text-slate-500 mt-1.5">
                <span>
                  Campus Zone: <strong className="text-slate-800">{formData.campusZone || '—'}</strong>
                </span>
                <span>Exact location pinned automatically</span>
              </div>
            </div>

            {/* Item Description */}
            <div>
              <label htmlFor="errand-item-description" className="block text-sm font-bold text-slate-800 mb-1.5 flex items-center gap-1.5">
                <ShoppingBag className="w-4 h-4 text-nus-blue" />
                <span>Item Description &amp; Order Details</span>
                <span className="text-rose-500">*</span>
              </label>
              <input
                id="errand-item-description"
                type="text"
                required
                maxLength={1000}
                placeholder="e.g. 1x Cold Brew Coffee + 1x Croissant"
                value={formData.itemDescription}
                onChange={(e) => setFormData({ ...formData, itemDescription: e.target.value })}
                className="w-full text-sm p-3 rounded-xl border border-slate-300 bg-white focus:ring-2 focus:ring-nus-blue focus:border-transparent outline-none transition"
              />
              <p className="text-xs text-slate-400 mt-1">
                Be specific about sizes, quantities, and flavor options so the courier gets the right items.
              </p>
            </div>

            {/* Drop-off Location */}
            <div>
              <label htmlFor="errand-dropoff-location" className="block text-sm font-bold text-slate-800 mb-1.5 flex items-center gap-1.5">
                <MapPin className="w-4 h-4 text-nus-orange" />
                <span>Drop-off Study Spot &amp; Visual Cue</span>
                <span className="text-rose-500">*</span>
              </label>
              <input
                id="errand-dropoff-location"
                type="text"
                required
                maxLength={255}
                placeholder="e.g. COM2 Level 2 Room #02-04 (Wearing grey hoodie at window desk)"
                value={formData.dropoffLocation}
                onChange={(e) => setFormData({ ...formData, dropoffLocation: e.target.value })}
                className="w-full text-sm p-3 rounded-xl border border-slate-300 bg-white focus:ring-2 focus:ring-nus-blue focus:border-transparent outline-none transition"
              />
              <p className="text-xs text-slate-400 mt-1">
                Include room or table number and any visual cues to help your courier find you quickly.
              </p>
            </div>

            {/* Special Notes */}
            <div>
              <label htmlFor="errand-special-notes" className="block text-sm font-bold text-slate-800 mb-1.5 flex items-center gap-1.5">
                <FileText className="w-4 h-4 text-slate-500" />
                <span>Special Delivery Notes (Optional)</span>
              </label>
              <textarea
                id="errand-special-notes"
                rows={2}
                maxLength={1000}
                placeholder="e.g. Less ice, separate paper bag, contactless drop at seat"
                value={formData.specialNotes}
                onChange={(e) => setFormData({ ...formData, specialNotes: e.target.value })}
                className="w-full text-sm p-3 rounded-xl border border-slate-300 bg-white focus:ring-2 focus:ring-nus-blue focus:border-transparent outline-none transition resize-none"
              />
            </div>
          </div>

          {/* Aside Section: Reward Credits, Duration Window, & Submit CTA */}
          <aside aria-label="Reward and posting" className="min-w-0 space-y-4">
            {/* Courier Reward Credits Card */}
            <div className={`rounded-2xl p-5 border shadow-sm transition ${
              isOverdraw
                ? 'bg-rose-50/70 border-rose-300'
                : 'bg-gradient-to-br from-amber-50/80 to-orange-50/60 border-amber-200'
            }`}>
              <div className="flex items-center justify-between mb-3">
                <label htmlFor="errand-reward-credits-input" className="text-sm font-black text-amber-950 flex items-center gap-1.5">
                  <Coins className="w-4 h-4 text-amber-600" />
                  <span>Courier Reward</span>
                </label>
                <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-amber-200/80 text-amber-900">
                  Closed Economy
                </span>
              </div>

              {/* Reward Stepper & Input */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  aria-label="Decrease reward credits"
                  disabled={formData.rewardCredits <= 1 || submissionBusy}
                  onClick={() =>
                    setFormData((f) => ({
                      ...f,
                      rewardCredits: Math.max(1, (Number.isFinite(f.rewardCredits) ? f.rewardCredits : 1) - 1),
                    }))
                  }
                  className="w-11 h-11 rounded-xl bg-amber-200/80 hover:bg-amber-300 text-amber-900 font-black text-base flex items-center justify-center transition disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                >
                  -
                </button>
                <div className="relative flex-1">
                  <input
                    id="errand-reward-credits-input"
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
                    className={`reward-input w-full rounded-xl border bg-white py-2.5 px-3 text-center font-black text-lg shadow-inner outline-none transition ${
                      isOverdraw
                        ? 'border-rose-400 text-rose-700 focus:ring-2 focus:ring-rose-400'
                        : 'border-amber-300 text-amber-900 focus:ring-2 focus:ring-amber-500'
                    }`}
                  />
                  <span className="absolute right-3 top-3 text-xs font-bold text-amber-700/60 pointer-events-none">
                    Credits
                  </span>
                </div>
                <button
                  type="button"
                  aria-label="Increase reward credits"
                  disabled={submissionBusy || (availableCredits !== null && formData.rewardCredits >= availableCredits)}
                  onClick={() =>
                    setFormData((f) => ({
                      ...f,
                      rewardCredits: Math.min(
                        availableCredits ?? 2147483647,
                        (Number.isFinite(f.rewardCredits) ? f.rewardCredits : 0) + 1
                      ),
                    }))
                  }
                  className="w-11 h-11 rounded-xl bg-amber-200/80 hover:bg-amber-300 text-amber-900 font-black text-base flex items-center justify-center transition disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                >
                  +
                </button>
              </div>

              {/* Quick Presets */}
              <div className="mt-3 flex flex-wrap items-center gap-1.5">
                <span className="text-[11px] font-semibold text-amber-800">Quick set:</span>
                {[3, 5, 8, 15].map((amt) => (
                  <button
                    key={amt}
                    type="button"
                    onClick={() => handlePresetCredits(amt)}
                    disabled={availableCredits !== null && amt > availableCredits}
                    className={`text-xs px-2 py-0.5 rounded-md font-bold transition ${
                      formData.rewardCredits === amt
                        ? 'bg-amber-600 text-white shadow-xs'
                        : 'bg-white/80 hover:bg-white text-amber-900 border border-amber-200 disabled:opacity-30 disabled:cursor-not-allowed'
                    }`}
                  >
                    {amt} C
                  </button>
                ))}
                {availableCredits !== null && availableCredits > 0 && (
                  <button
                    type="button"
                    onClick={() => handlePresetCredits(availableCredits)}
                    className="text-xs px-2 py-0.5 rounded-md font-bold bg-amber-100 hover:bg-amber-200 text-amber-900 border border-amber-300 transition"
                  >
                    Max ({availableCredits} C)
                  </button>
                )}
              </div>

              {/* Balance Warning / Helper */}
              {isOverdraw ? (
                <div className="mt-3 p-2.5 rounded-xl bg-rose-100/90 border border-rose-300 text-xs text-rose-800 flex items-start gap-2 animate-in fade-in">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold">Insufficient available credits!</span>
                    <p className="mt-0.5">
                      You offer {formData.rewardCredits} C, but only have {availableCredits} C available in your wallet.
                    </p>
                    {availableCredits > 0 && (
                      <button
                        type="button"
                        onClick={() => handlePresetCredits(availableCredits)}
                        className="mt-1 text-xs font-bold text-rose-900 underline hover:no-underline"
                      >
                        Adjust to available balance ({availableCredits} C)
                      </button>
                    )}
                  </div>
                </div>
              ) : isZeroBalance ? (
                <div className="mt-3 p-2.5 rounded-xl bg-amber-100/90 border border-amber-300 text-xs text-amber-900 flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold">Zero Credit Balance</span>
                    <p className="mt-0.5">
                      You need at least 1 available credit to post errands. Fulfill campus deliveries to earn credits!
                    </p>
                  </div>
                </div>
              ) : (
                <p className="text-xs text-amber-800/80 mt-2.5">
                  Available: <strong className="text-amber-950">{availableCredits !== null ? `${availableCredits} C` : '—'}</strong>.
                  Credits are safely held in escrow and released only upon delivery confirmation.
                </p>
              )}
            </div>

            {/* Acceptance Duration Window Card */}
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5">
              <div className="flex items-center justify-between mb-2">
                <label htmlFor="duration-minutes-input" className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
                  <Clock className="w-4 h-4 text-slate-500" />
                  <span>Acceptance Window</span>
                </label>
                <span className="text-xs font-semibold text-slate-500">Auto-expiry</span>
              </div>
              <div className="flex items-center gap-2">
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
                  className="w-24 rounded-xl border border-slate-300 bg-white px-3 py-2 text-center font-bold text-slate-800 shadow-inner outline-none focus:ring-2 focus:ring-nus-blue"
                />
                <span className="text-xs font-medium text-slate-600">minutes (30m – 24h)</span>
              </div>
              <p className="text-xs text-slate-400 mt-2">
                If no student courier accepts before this window expires, your held credits are refunded automatically by Credit Service.
              </p>
            </div>

            {/* Dynamic Submit Button with Multi-State Feedback */}
            <div className="space-y-2 pt-1">
              {submissionPosting && (
                <div className="p-2.5 rounded-xl bg-blue-50 border border-blue-200 text-xs text-blue-800 flex items-center gap-2">
                  <RefreshCw className="w-4 h-4 text-blue-600 animate-spin" />
                  <span>Step 1/2: Submitting errand to campus network…</span>
                </div>
              )}
              {submissionBusy && !submissionPosting && (
                <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900 flex items-center gap-2">
                  <RefreshCw className="w-4 h-4 text-amber-600 animate-spin" />
                  <span>Step 2/2: Reserving {formData.rewardCredits} credits in escrow saga…</span>
                </div>
              )}

              <button
                type="submit"
                aria-label="Post Errand"
                disabled={
                  submissionBusy ||
                  isSuppliersLoading ||
                  !activeSuppliers.some((s) => s.id === formData.supplierId) ||
                  isOverdraw ||
                  isZeroBalance ||
                  !formData.itemDescription.trim() ||
                  !formData.dropoffLocation.trim()
                }
                className="w-full bg-nus-orange hover:bg-orange-600 disabled:bg-slate-300 text-white font-extrabold text-sm py-3.5 px-4 rounded-xl shadow-md transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer flex items-center justify-center gap-2"
              >
                {submissionPosting ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Submitting Errand…</span>
                  </>
                ) : submissionBusy ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin text-amber-300" />
                    <span>Reserving Escrow…</span>
                  </>
                ) : isOverdraw ? (
                  <span>Insufficient Credits</span>
                ) : isZeroBalance ? (
                  <span>Zero Credit Balance</span>
                ) : (
                  <>
                    <span>Post Errand</span>
                    <span className="text-xs bg-white/20 px-2 py-0.5 rounded-full font-bold">
                      {formData.rewardCredits} Credits
                    </span>
                  </>
                )}
              </button>

              <p className="text-[11px] text-center text-slate-400">
                Peer-to-peer campus delivery • Milestone 3 SAGAS protected
              </p>
            </div>
          </aside>
        </fieldset>
      </form>
    </div>
  );
}
