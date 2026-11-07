/**
 * AI Assistance Disclosure:
 * Tool: Codex (model: GPT-6), date: 2026-11-07
 * Scope: Simplify the approved posting UX with essential fields first, optional disclosures, clearer labels and reservation/timing feedback, preserving the existing form contract and submission rules.
 * Author review: <to be completed by yanhwee>
 *
 * Tool: Codex (model: GPT-6), date: 2026-11-07
 * Scope: Apply the approved student-app consistency pass: calmer surfaces, readable type, blue actions and selection, and preserved semantic status colours.
 * Author review: <to be completed by yanhwee>
 *
 * Tool: Codex (model: GPT-6), date: 2026-11-07
 * Scope: Align the posting assistant controls with the refreshed blue action palette.
 * Author review: <to be completed by yanhwee>
 *
 * Tool: Codex (model: GPT-6), date: 2026-11-07
 * Scope: Refine the approved campus UI with quieter surfaces, readable hierarchy, and accessible interactions.
 * Author review: <to be completed by yanhwee>
 *
 * Tool: Google Antigravity Agent, date: 2026-11-07
 * Scope: Restructured PostErrandPage into a cohesive "Request-First" smart design: integrated natural errand request input at the top with 1-click auto-fill, removed accordion drawer friction, eliminated redundant multi-line helper copy across form fields to reclaim vertical space, and streamlined layout for mobile and desktop screens.
 * Author review: <to be completed by yanhwee>
 *
 * Tool: Google Antigravity Agent, date: 2026-11-07
 * Scope: Removed visual "Post New Errand" title banner and subtitle, preserving accessible sr-only heading and reclaiming vertical space above the fold aligned with Feed and Spots tabs.
 * Author review: <to be completed by yanhwee>
 *
 * Tool: Google Antigravity Agent, date: 2026-11-07
 * Scope: Redesigned AI Errand Assistant into a sleek collapsible smart drawer (Option A) with instant one-click toggle, removed redundant tutorial paragraph, and added smooth auto-scroll to the populated form.
 * Author review: <to be completed by yanhwee>
 *
 * Tool: Google Antigravity Agent, date: 2026-11-07
 * Scope: Streamlined AI Errand Assistant into 1-click inline smart autofill, removing redundant intermediate draft preview card and extra apply step.
 * Author review: <to be completed by yanhwee>
 *
 * Tool: Google Antigravity Agent, date: 2026-11-07
 * Scope: Removed meta milestone labels (NUS SoCLaaS M3) and internal service references from user-facing post-errand builder.
 * Author review: <to be completed by yanhwee>
 *
 * Tool: Google Antigravity Agent, date: 2026-11-06
 * Scope: Redesigned PostErrandPage with elevated card hierarchy, glowing AI assistant hero container, refined stepper & quick-set badges, and glassmorphic styling.
 * Author review: <to be completed by yanhwee>
 *
 * Tool: Google Antigravity Agent, date: 2026-10-28
 * Scope: Disambiguated stepper button aria-labels ('Decrease amount' / 'Increase amount') to resolve Playwright getByLabel('Reward credits') strict mode collision.
 * Author review: <to be completed by yanhwee>
 *
 * Tool: Google Antigravity Agent, date: 2026-10-28
 * Scope: Restored exact UAT drop-off location and notes placeholders to preserve CI test suite compatibility.
 * Author review: <to be completed by yanhwee>
 *
 * Tool: Google Antigravity Agent, date: 2026-10-28
 * Scope: Removed legacy milestone text from form footer.
 * Author review: <to be completed by yanhwee>
 *
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
 *
 * Tool: Claude Code (model: Sonnet 5), date: 2026-10-30
 * Scope: Merge of admin_dashboard into main. Added a Map icon button beside the Pickup Store dropdown, opening
 * an interactive map modal (../map/SupplierPickupMap.tsx, React Leaflet + OpenStreetMap tiles) dropping a pin
 * for every active supplier with coordinates; clicking a pin selects that supplier via the same setFormData
 * fields the dropdown's own onChange already sets, and closes the map. The <select>'s existing id/aria-label/
 * required attributes are unchanged (left intact for the UAT selectors noted above) — it is now wrapped in a
 * flex row alongside the new button instead of being full-width on its own.
 * Author review: (to be completed by author after review)
 *
 * Tool: Claude Code (model: Claude Opus 5.5), date: 2026-11-04
 * Scope: Author's request of 2026-11-04: the selected store's operating hours and open / closed state are shown
 * under the Pickup Store picker, and posting while the store is outside its hours first asks for confirmation in a
 * dialog ("Post anyway" / "Go back"). Stores with no readable hours post without the dialog.
 * Author review: <to be completed by huangjiaxi1111>
 *
 * Tool: Claude Code (model: Claude Opus 5.5), date: 2026-11-04
 * Scope: Drop-off estimator (author's decisions A16-A18, D5, D9): an optional drop-off point under the drop-off field
 * (building search, or a map click when not listed), the suggested reward with its straight-line distance in the
 * reward card, and the suggestion prefilling the reward until the requester sets their own (typing, stepper,
 * presets or an applied assistant draft that carries a reward). A store without coordinates gives no suggestion.
 * Author review: <to be completed by huangjiaxi1111>
 */

// AI-generated (edited by yanhwee)

import { CreditWalletDTO, ParsedErrandDraftDTO, SupplierDTO } from '@campus-errand/common-dtos';
import {
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  Clock,
  Coins,
  FileText,
  Map as MapIcon,
  MapPin,
  Navigation,
  RefreshCw,
  ShoppingBag,
  Sparkles,
  Store,
  X,
} from 'lucide-react';
import React, { useEffect, useRef, useState } from 'react';
import { AuthFetchFn } from '../api/auth';
import { parseErrandDraft } from '../api/orders';
import { DropoffPicker, type DropoffPoint } from '../map/DropoffPicker';
import { SupplierPickupMap } from '../map/SupplierPickupMap';
import { estimateRewardCredits, haversineKm, supplierPoint } from '../map/creditEstimate';
import { NUS_BUILDINGS, NUS_SPAN_KM, matchBuildingInText } from '../map/nusBuildings';
import { useMinuteClock } from '../suppliers/minuteClock';
import { HOURS_NOT_LISTED, formatOperatingHours, isOpenAt } from '../suppliers/operatingHours';

export interface PostErrandFormData {
  supplierId: string;
  supplierName: string;
  campusZone: string;
  itemDescription: string;
  specialNotes: string;
  dropoffLocation: string;
  rewardCredits: number;
  durationMinutes: number;
  // AI-generated (edited by huangjiaxi1111)
  /** Optional drop-off point behind the suggested reward. */
  dropoffPoint: DropoffPoint | null;
  /** True once the requester sets the reward themselves; the suggestion then stops prefilling it. */
  rewardEdited: boolean;
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
    prompt: 'Can someone buy 2 iced lattes from TOMORO COFFEE to COM3 Level 2? Offering 6 credits',
  },
  {
    label: '🍱 A Hot Hideout',
    prompt: 'Can someone get a mala bowl from A Hot Hideout to UTown Residence? Offering 8 credits',
  },
  {
    label: '🍦 Smooy COM3',
    prompt: 'Can someone grab 1 frozen yogurt from Smooy to COM2 #02-04? Offering 5 credits',
  },
];

// AI-generated (edited by yanhwee)
const DISCLOSURE_SUMMARY = 'flex min-h-11 cursor-pointer list-none items-center gap-2 rounded-lg text-sm text-slate-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-blue-600 [&::-webkit-details-marker]:hidden';

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
  const formRef = useRef<HTMLFormElement>(null);
  const [isExtracting, setIsExtracting] = useState(false);
  const [extractError, setExtractError] = useState<string | null>(null);
  const [extractedDraft, setExtractedDraft] = useState<ParsedErrandDraftDTO | null>(null);
  // AI-generated (edited by jagdeepsh)
  const [isPickupMapOpen, setIsPickupMapOpen] = useState(false);
  const [appliedNotice, setAppliedNotice] = useState(false);
  const [dismissError, setDismissError] = useState(false);

  // Synchronous submit lock to prevent multi-clicks before React re-render cycles
  const isSubmittingRef = useRef(false);

  // Posting outside the store's operating hours waits here for the student's confirmation.
  const [isClosedStoreConfirmOpen, setIsClosedStoreConfirmOpen] = useState(false);
  const pendingSubmitRef = useRef<React.FormEvent | null>(null);
  const selectedSupplier = suppliers.find((s) => s.id === formData.supplierId) ?? null;
  const selectedHours = selectedSupplier ? formatOperatingHours(selectedSupplier) : null;
  const now = useMinuteClock();
  const selectedOpenNow = selectedSupplier ? isOpenAt(selectedSupplier, now) : null;

  // Credit balance safety checks
  const availableCredits = wallet ? wallet.availableCredits : null;
  const isOverdraw = availableCredits !== null && formData.rewardCredits > availableCredits;
  const isZeroBalance = availableCredits !== null && availableCredits <= 0;

  // AI-generated (edited by yanhwee)
  const durationLabel = !Number.isFinite(formData.durationMinutes)
    ? 'Choose an acceptance window'
    : formData.durationMinutes >= 60 && formData.durationMinutes % 60 === 0
    ? `${formData.durationMinutes / 60} ${formData.durationMinutes === 60 ? 'hour' : 'hours'}`
    : `${formData.durationMinutes} minutes`;

  // Suggested reward from the pickup store to the drop-off point (linear 5-70 credits over the NUS span).
  const pickupPoint = supplierPoint(selectedSupplier);
  const suggestedReward = estimateRewardCredits(pickupPoint, formData.dropoffPoint, NUS_SPAN_KM);
  const suggestedDistanceKm =
    pickupPoint && formData.dropoffPoint ? haversineKm(pickupPoint, formData.dropoffPoint) : null;

  useEffect(() => {
    if (suggestedReward === null) return;
    setFormData((prev) =>
      prev.rewardEdited || prev.rewardCredits === suggestedReward ? prev : { ...prev, rewardCredits: suggestedReward }
    );
  }, [suggestedReward, setFormData]);

  // The drop-off text is the requester's own exact address; picking a point never writes to it.
  const handleDropoffPointChange = (point: DropoffPoint | null) => {
    setFormData((prev) => ({ ...prev, dropoffPoint: point }));
  };

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

      let targetSupplierId = formData.supplierId;
      let targetSupplierName = formData.supplierName;
      let targetCampusZone = formData.campusZone;

      if (draft.supplierId) {
        const found = suppliers.find((s) => s.id === draft.supplierId);
        if (found) {
          targetSupplierId = found.id;
          targetSupplierName = found.name;
          targetCampusZone = found.campusZone;
        }
      } else if (draft.matchedSupplierName) {
        const found = suppliers.find(
          (s) => s.name.toLowerCase() === draft.matchedSupplierName?.toLowerCase()
        );
        if (found) {
          targetSupplierId = found.id;
          targetSupplierName = found.name;
          targetCampusZone = found.campusZone;
        }
      }

      const draftHasReward =
        typeof draft.rewardCredits === 'number' && Number.isFinite(draft.rewardCredits);
      // Select the drop-off building the draft names, if it is in the NUS list; otherwise keep the current point.
      const draftBuilding = draft.dropoffLocation
        ? matchBuildingInText(NUS_BUILDINGS, draft.dropoffLocation)
        : null;

      setFormData((prev) => ({
        ...prev,
        supplierId: targetSupplierId,
        supplierName: targetSupplierName,
        campusZone: targetCampusZone,
        itemDescription: draft.itemDescription || prev.itemDescription,
        dropoffLocation: draft.dropoffLocation || prev.dropoffLocation,
        specialNotes: draft.specialNotes ?? prev.specialNotes,
        rewardCredits: draftHasReward ? (draft.rewardCredits as number) : prev.rewardCredits,
        rewardEdited: prev.rewardEdited || draftHasReward,
        dropoffPoint: draftBuilding
          ? { latitude: draftBuilding.latitude, longitude: draftBuilding.longitude, buildingName: draftBuilding.name }
          : prev.dropoffPoint,
        durationMinutes:
          typeof draft.durationMinutes === 'number' && Number.isFinite(draft.durationMinutes)
            ? draft.durationMinutes
            : prev.durationMinutes,
      }));

      setAppliedNotice(true);
      setTimeout(() => {
        formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 100);
    } catch (err) {
      setExtractError(err instanceof Error ? err.message : 'Failed to parse errand draft. Please try again.');
    } finally {
      setIsExtracting(false);
    }
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

    // Checked against the clock at submit time, not at render, so a page left open past closing still asks.
    if (selectedSupplier && isOpenAt(selectedSupplier, new Date()) === false) {
      pendingSubmitRef.current = e;
      setIsClosedStoreConfirmOpen(true);
      return;
    }
    submitNow(e);
  };

  // AI-generated (edited by huangjiaxi1111)
  const handleConfirmClosedStore = () => {
    const pending = pendingSubmitRef.current;
    pendingSubmitRef.current = null;
    setIsClosedStoreConfirmOpen(false);
    if (pending && !isSubmittingRef.current && !submissionBusy) submitNow(pending);
  };

  const handleCancelClosedStore = () => {
    pendingSubmitRef.current = null;
    setIsClosedStoreConfirmOpen(false);
  };

  const submitNow = (e: React.FormEvent) => {
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
    setFormData((prev) => ({ ...prev, rewardCredits: credits, rewardEdited: true }));
  };

  return (
    <div className="space-y-4 sm:space-y-5">
      {/* AI-generated (edited by yanhwee) */}
      <header className="space-y-1">
        <h2 className="text-xl sm:text-2xl font-semibold text-campus-ink">Post an errand</h2>
        <p className="text-sm text-slate-600">What do you need, and where should we bring it?</p>
      </header>

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
              check your <strong>My Errands</strong> tab before attempting to post again to avoid duplicate orders.
            </p>
          </div>
        </div>
      )}

      {/* AI-generated (edited by yanhwee): optional shortcut; the form below works independently. */}
      <details className="group rounded-2xl border border-slate-200 bg-white px-4 sm:px-5">
        <summary className={DISCLOSURE_SUMMARY}>
          <Sparkles className="h-4 w-4 shrink-0 text-campus-blue" aria-hidden="true" />
          <span className="flex-1 font-medium">Fill from a description</span>
          <span className="text-xs text-slate-500">Optional</span>
          <ChevronDown className="h-4 w-4 shrink-0 transition-transform group-open:rotate-180" aria-hidden="true" />
        </summary>
        <div className="flex items-start justify-between gap-3 pb-3 pt-1">
          <p className="text-sm text-slate-600">Describe your errand in a sentence. We’ll fill in the details for you to review.</p>
          {(assistantPrompt || extractedDraft) && (
            <button
              type="button"
              onClick={handleClearAssistant}
              className="text-xs font-semibold text-slate-500 hover:text-slate-800 flex items-center gap-1 cursor-pointer transition px-2 py-0.5 rounded-lg hover:bg-slate-200/50"
            >
              <X className="w-3.5 h-3.5" /> Clear
            </button>
          )}
        </div>
        <div className="space-y-2.5 pb-4 sm:pb-5">
          <textarea
            id="ai-assistant-prompt"
            aria-label="Describe your errand for auto-fill"
            rows={2}
            value={assistantPrompt}
            onChange={(e) => setAssistantPrompt(e.target.value)}
            disabled={isExtracting || submissionBusy}
            placeholder="e.g. Two iced lattes from TOMORO COFFEE to COM2 #02-04, offering 6 credits"
            className="w-full text-base sm:text-sm p-3 rounded-xl border border-blue-200/90 bg-white text-slate-900 placeholder:text-slate-400 focus:ring-4 focus:ring-blue-100 focus:border-blue-600 outline-none resize-none shadow-2xs transition-all"
          />

          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-xs font-bold text-slate-500">Quick ideas:</span>
              {TEMPLATE_PROMPTS.map((tmpl, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setAssistantPrompt(tmpl.prompt)}
                  className="text-xs sm:text-xs font-semibold bg-white hover:bg-slate-50 text-slate-700 px-2.5 py-1 rounded-lg border border-slate-200/90 shadow-2xs hover:shadow-xs hover:border-slate-300 transition-all cursor-pointer"
                >
                  {tmpl.label}
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={handleExtractDraft}
              disabled={isExtracting || !assistantPrompt.trim() || submissionBusy}
              className="inline-flex items-center gap-1.5 bg-campus-blue hover:bg-campus-blue-hover active:scale-95 text-white text-xs font-semibold px-3.5 py-1.5 sm:py-2 rounded-xl shadow-xs transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              {isExtracting ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  Auto-filling Form…
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5" />
                  Auto-fill Form
                </>
              )}
            </button>
          </div>

          {extractError && (
            <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-800 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" />
              <span>{extractError}</span>
            </div>
          )}

        </div>
      </details>

      {/* 2. Structured Errand Form */}
      <form ref={formRef} onSubmit={handleFormSubmit} noValidate={false} className="space-y-4">
          {appliedNotice && (
            <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-900 flex items-center justify-between gap-2 shadow-2xs animate-in fade-in">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>
                  <strong>Form auto-filled!</strong> Review the details below and customize as needed.
                </span>
              </div>
              <button
                type="button"
                onClick={() => setAppliedNotice(false)}
                className="text-emerald-700 hover:text-emerald-900 p-0.5 rounded cursor-pointer"
                aria-label="Dismiss notice"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {extractedDraft?.warnings && extractedDraft.warnings.length > 0 && (
            <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900 space-y-1 shadow-2xs">
              <div className="font-bold flex items-center gap-1.5 text-amber-800">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                <span>Please check these details:</span>
              </div>
              {extractedDraft.warnings.map((w, idx) => (
                <div key={idx} className="pl-5 text-amber-800/90 text-xs">
                  • {w}
                </div>
              ))}
            </div>
          )}

        <fieldset
          disabled={submissionBusy}
          className="min-w-0 grid grid-cols-1 lg:grid-cols-[minmax(0,2fr)_minmax(0,1.2fr)] gap-4 sm:gap-5 items-start"
        >
          {/* AI-generated (edited by yanhwee): two concise groups keep the essential fields visible. */}
          <div className="min-w-0 rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 shadow-subtle space-y-6">
            <section aria-labelledby="post-details-heading" className="space-y-4">
              <h3 id="post-details-heading" className="flex items-center gap-2 text-base font-semibold text-campus-ink">
                <span aria-hidden="true" className="flex h-6 w-6 items-center justify-center rounded-full bg-campus-blue-soft text-xs text-campus-blue">1</span>
                Errand details
              </h3>
            {/* Item Description */}
            <div>
              <label htmlFor="errand-item-description" className="block text-xs sm:text-sm font-semibold text-slate-800 mb-1.5 flex items-center gap-1.5">
                <ShoppingBag className="w-4 h-4 text-campus-blue" />
                <span>What do you need?</span>
                <span className="text-rose-500 font-bold">*</span>
              </label>
              <input
                id="errand-item-description"
                type="text"
                required
                maxLength={1000}
                placeholder="e.g. Two iced lattes and a croissant"
                value={formData.itemDescription}
                onChange={(e) => setFormData({ ...formData, itemDescription: e.target.value })}
                className="w-full text-base sm:text-sm p-2.5 sm:p-3 rounded-xl border border-slate-300/80 bg-white focus:ring-4 focus:ring-blue-100 focus:border-blue-600 outline-none transition-all shadow-2xs"
              />
            </div>

            {/* Pickup Spot Selector */}
            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label htmlFor="errand-supplier-select" className="text-xs sm:text-sm font-semibold text-slate-800 flex items-center gap-1.5">
                  <Store className="w-4 h-4 text-campus-blue" />
                  <span>Pickup location</span>
                  <span className="text-rose-500 font-bold">*</span>
                </label>
                <span className="text-xs text-campus-blue font-bold bg-blue-50/80 px-2 py-0.5 rounded-full border border-blue-200/70">
                  {activeSuppliers.length} active spots
                </span>
              </div>
              {/* AI-generated (edited by jagdeepsh) */}
              <div className="flex items-stretch gap-2">
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
                  className="flex-1 min-w-0 text-base sm:text-sm p-2.5 sm:p-3 rounded-xl border border-slate-300/80 bg-white font-medium focus:ring-4 focus:ring-blue-100 focus:border-blue-600 outline-none transition-all shadow-2xs"
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
                <button
                  type="button"
                  onClick={() => setIsPickupMapOpen(true)}
                  title="Pick a spot on the map"
                  aria-label="Pick a spot on the map"
                  className="shrink-0 px-3 sm:px-3.5 rounded-xl border border-slate-300/80 bg-white text-slate-700 hover:bg-blue-50 hover:text-campus-blue hover:border-blue-300 flex items-center justify-center transition-all duration-200 cursor-pointer shadow-2xs"
                >
                  <MapIcon className="w-4 h-4" />
                </button>
              </div>
              <div className="flex items-center justify-between text-xs text-slate-500 mt-1.5">
                <span>
                  Campus Zone: <strong className="text-slate-800">{formData.campusZone || '—'}</strong>
                </span>

              </div>
              {selectedSupplier && (
                <div
                  data-testid="supplier-operating-hours"
                  className={`mt-2 flex items-center gap-2 text-xs rounded-xl px-2.5 py-1.5 border transition-all ${
                    selectedOpenNow === false
                      ? 'bg-rose-50/80 border-rose-200 text-rose-800'
                      : 'bg-slate-50/80 border-slate-200 text-slate-600'
                  }`}
                >
                  <Clock className="w-3.5 h-3.5 shrink-0" />
                  <span>
                    Operating hours:{' '}
                    <strong className="text-slate-800">{selectedHours ?? HOURS_NOT_LISTED}</strong>
                  </span>
                  {selectedOpenNow === true && (
                    <span className="ml-auto font-bold text-emerald-700 bg-emerald-100/70 px-2 py-0.5 rounded-md">Open now</span>
                  )}
                  {selectedOpenNow === false && (
                    <span className="ml-auto font-bold text-rose-700 bg-rose-100/70 px-2 py-0.5 rounded-md">Closed now</span>
                  )}
                </div>
              )}
            </div>

            </section>
            <section aria-labelledby="post-delivery-heading" className="space-y-4 border-t border-slate-100 pt-5">
              <h3 id="post-delivery-heading" className="flex items-center gap-2 text-base font-semibold text-campus-ink">
                <span aria-hidden="true" className="flex h-6 w-6 items-center justify-center rounded-full bg-campus-blue-soft text-xs text-campus-blue">2</span>
                Delivery
              </h3>
            {/* Drop-off Location */}
            <div>
              <label htmlFor="errand-dropoff-location" className="block text-xs sm:text-sm font-semibold text-slate-800 mb-1.5 flex items-center gap-1.5">
                <MapPin className="w-4 h-4 text-nus-orange" />
                <span>Delivery location</span>
                <span className="text-rose-500 font-bold">*</span>
              </label>
              <input
                id="errand-dropoff-location"
                type="text"
                required
                pattern=".*\S.*"
                title="Enter the exact drop-off address, e.g. room or table number"
                maxLength={255}
                placeholder="e.g. COM2, #02-04, near the lift"
                value={formData.dropoffLocation}
                onChange={(e) => setFormData({ ...formData, dropoffLocation: e.target.value })}
                className="w-full text-base sm:text-sm p-2.5 sm:p-3 rounded-xl border border-slate-300/80 bg-white focus:ring-4 focus:ring-blue-100 focus:border-blue-600 outline-none transition-all shadow-2xs"
              />
            </div>

              <details className="group border-t border-slate-100 pt-1">
                <summary className={DISCLOSURE_SUMMARY}>
                  <MapIcon className="h-4 w-4 shrink-0 text-slate-500" aria-hidden="true" />
                  <span className="flex-1">{formData.dropoffPoint ? `Map pin: ${formData.dropoffPoint.buildingName ?? 'Selected on map'}` : 'Add a map pin for a reward suggestion'}</span>
                  <ChevronDown className="h-4 w-4 shrink-0 transition-transform group-open:rotate-180" aria-hidden="true" />
                </summary>
                <div className="pb-2 pt-2">
                  <p className="mb-3 text-xs text-slate-500">Optional. The pin helps suggest a reward; your delivery address above is still required.</p>
            <DropoffPicker
              value={formData.dropoffPoint}
              onChange={handleDropoffPointChange}
              pickup={pickupPoint}
              pickupName={selectedSupplier?.name}
            />

                </div>
              </details>
              <details className="group border-t border-slate-100 pt-1">
                <summary className={DISCLOSURE_SUMMARY}>
                  <FileText className="h-4 w-4 shrink-0 text-slate-500" aria-hidden="true" />
                  <span className="flex-1">Additional instructions</span>
                  <span className="text-xs text-slate-500">{formData.specialNotes.trim() ? 'Added' : 'Optional'}</span>
                  <ChevronDown className="h-4 w-4 shrink-0 transition-transform group-open:rotate-180" aria-hidden="true" />
                </summary>
                <div className="pb-2 pt-2">
            {/* Special Notes */}
            <div>
              <label htmlFor="errand-special-notes" className="block text-xs sm:text-sm font-semibold text-slate-800 mb-1.5 flex items-center gap-1.5">
                <FileText className="w-4 h-4 text-slate-500" />
                <span>Instructions for your courier</span>
              </label>
              <textarea
                id="errand-special-notes"
                rows={2}
                maxLength={1000}
                placeholder="e.g. Less ice, or call when you arrive"
                value={formData.specialNotes}
                onChange={(e) => setFormData({ ...formData, specialNotes: e.target.value })}
                className="w-full text-base sm:text-sm p-2.5 sm:p-3 rounded-xl border border-slate-300/80 bg-white focus:ring-4 focus:ring-blue-100 focus:border-blue-600 outline-none transition-all resize-none shadow-2xs"
              />
            </div>
                </div>
              </details>
            </section>
          </div>

          {/* Aside Section: Reward Credits, Duration Window, & Submit CTA */}
          <aside aria-label="Reward and posting" className="min-w-0 space-y-4 lg:sticky lg:top-24">
            {/* Courier Reward Credits Card */}
            <div className={`rounded-2xl p-4 sm:p-5 border shadow-subtle hover:shadow-card transition-all duration-300 ${
              isOverdraw
                ? 'bg-rose-50/80 border-rose-300'
                : 'bg-amber-50/60 border-amber-200'
            }`}>
            <h3 className="flex items-center gap-2 mb-4 text-base font-semibold text-campus-ink">
              <span aria-hidden="true" className="flex h-6 w-6 items-center justify-center rounded-full bg-campus-blue-soft text-xs text-campus-blue">3</span>
              Reward &amp; posting
            </h3>
              <div className="flex items-center justify-between mb-3">
                <label htmlFor="errand-reward-credits-input" className="text-xs sm:text-sm font-semibold text-amber-950 flex items-center gap-1.5">
                  <Coins className="w-4 h-4 fill-amber-500/30 text-amber-700" />
                  <span>Reward for your courier</span>
                </label>
              </div>

              {/* Reward Stepper & Input */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  aria-label="Decrease amount"
                  disabled={formData.rewardCredits <= 1 || submissionBusy}
                  onClick={() =>
                    setFormData((f) => ({
                      ...f,
                      rewardCredits: Math.max(1, (Number.isFinite(f.rewardCredits) ? f.rewardCredits : 1) - 1),
                      rewardEdited: true,
                    }))
                  }
                  className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-amber-200/80 hover:bg-amber-300 active:scale-95 text-amber-950 font-semibold text-base flex items-center justify-center transition disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer shadow-2xs"
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
                        rewardEdited: true,
                      }))
                    }
                    className={`reward-input w-full rounded-xl border bg-white py-2 sm:py-2.5 px-3 text-center font-semibold text-lg sm:text-xl shadow-inner outline-none transition-all ${
                      isOverdraw
                        ? 'border-rose-400 text-rose-700 focus:ring-4 focus:ring-rose-200'
                        : 'border-amber-300 text-amber-950 focus:ring-4 focus:ring-amber-500/20'
                    }`}
                  />
                  <span className="absolute right-3 top-2.5 text-xs font-bold text-amber-700/60 pointer-events-none">
                    Credits
                  </span>
                </div>
                <button
                  type="button"
                  aria-label="Increase amount"
                  disabled={submissionBusy || (availableCredits !== null && formData.rewardCredits >= availableCredits)}
                  onClick={() =>
                    setFormData((f) => ({
                      ...f,
                      rewardCredits: Math.min(
                        availableCredits ?? 2147483647,
                        (Number.isFinite(f.rewardCredits) ? f.rewardCredits : 0) + 1
                      ),
                      rewardEdited: true,
                    }))
                  }
                  className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-amber-200/80 hover:bg-amber-300 active:scale-95 text-amber-950 font-semibold text-base flex items-center justify-center transition disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer shadow-2xs"
                >
                  +
                </button>
              </div>

              {suggestedReward !== null && suggestedDistanceKm !== null && (
                <div
                  data-testid="suggested-reward"
                  className="mt-2.5 flex items-center gap-1.5 text-xs rounded-xl px-2.5 py-1.5 border bg-white/80 backdrop-blur-xs border-amber-200 text-amber-900 shadow-2xs"
                >
                  <Navigation className="w-3.5 h-3.5 shrink-0 text-amber-600" />
                  <span className="min-w-0 font-medium">
                    Suggested <strong className="font-semibold">{suggestedReward} C</strong> &middot; {suggestedDistanceKm.toFixed(2)} km from{' '}
                    {selectedSupplier?.name}
                  </span>
                </div>
              )}
              {formData.dropoffPoint && selectedSupplier && !pickupPoint && (
                <div className="mt-2.5 flex items-center gap-1.5 text-xs rounded-xl px-2.5 py-1.5 border bg-white/80 border-slate-200 text-slate-600">
                  <Navigation className="w-3.5 h-3.5 shrink-0" />
                  <span>This pickup spot has no map location, so there is no suggested reward.</span>
                </div>
              )}

              {/* Quick Presets */}
              <div role="group" aria-label="Quick reward amounts" className="mt-3 flex flex-wrap items-center gap-1.5">
                {[3, 5, 8, 15].map((amt) => (
                  <button
                    key={amt}
                    type="button"
                    onClick={() => handlePresetCredits(amt)}
                    disabled={availableCredits !== null && amt > availableCredits}
                    className={`text-xs px-2 py-0.5 rounded-lg font-bold transition-all cursor-pointer ${
                      formData.rewardCredits === amt
                        ? 'bg-amber-100 text-amber-950 border border-amber-300'
                        : 'bg-white/90 hover:bg-white text-amber-900 border border-amber-200/80 disabled:opacity-30 disabled:cursor-not-allowed shadow-2xs'
                    }`}
                  >
                    {amt} C
                  </button>
                ))}
                {availableCredits !== null && availableCredits > 0 && (
                  <button
                    type="button"
                    onClick={() => handlePresetCredits(availableCredits)}
                    className="text-xs px-2 py-0.5 rounded-lg font-bold bg-amber-100 hover:bg-amber-200 text-amber-950 border border-amber-300 transition-all cursor-pointer"
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
                        className="mt-1 text-xs font-bold text-rose-900 underline hover:no-underline cursor-pointer"
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
                <p className="text-xs text-amber-800/80 mt-2.5 font-medium">
                  Available: <strong className="text-amber-950 font-semibold">{availableCredits !== null ? `${availableCredits} credits` : 'Loading…'}</strong>
                </p>
              )}
            </div>

            <details className="group rounded-2xl border border-slate-200 bg-white px-4 sm:px-5">
              <summary className={DISCLOSURE_SUMMARY}>
                <Clock className="h-4 w-4 shrink-0 text-slate-500" aria-hidden="true" />
                <span className="flex-1">{Number.isFinite(formData.durationMinutes) ? `Accept within ${durationLabel}` : 'Set an acceptance window'}</span>
                <span className="text-xs text-campus-blue">Change</span>
                <ChevronDown className="h-4 w-4 shrink-0 transition-transform group-open:rotate-180" aria-hidden="true" />
              </summary>
              <div className="space-y-2 pb-4 pt-2">
                <label htmlFor="duration-minutes-input" className="block text-sm font-medium text-slate-700">Time to find a courier</label>
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
                  className="w-24 rounded-xl border border-slate-300/80 bg-white px-3 py-2 text-center font-semibold text-slate-800 shadow-inner outline-none focus:ring-4 focus:ring-blue-100 focus:border-blue-600 text-base sm:text-sm"
                />
                <span className="text-xs font-semibold text-slate-600">minutes (30m – 24h)</span>
              </div>
                <p className="text-xs leading-relaxed text-slate-500">Your errand expires if nobody accepts in this time. This is not a delivery deadline.</p>
              </div>
            </details>

            {/* Dynamic Submit Button with Multi-State Feedback */}
            <div className="space-y-3 pt-1">
              {Number.isFinite(formData.rewardCredits) && formData.rewardCredits > 0 && !isOverdraw && (
                <p className="text-sm leading-relaxed text-slate-600">Posting will reserve <strong className="font-semibold text-campus-ink">{formData.rewardCredits} credits</strong> for this errand.</p>
              )}
              {(!formData.itemDescription.trim() || !formData.dropoffLocation.trim()) && (
                <p className="text-xs text-slate-500">Add what you need and a delivery location to post.</p>
              )}
              {submissionPosting && (
                <div className="p-2.5 rounded-xl bg-blue-50 border border-blue-200 text-xs text-blue-800 flex items-center gap-2 font-medium">
                  <RefreshCw className="w-3.5 h-3.5 text-blue-600 animate-spin" />
                  <span>Posting your errand…</span>
                </div>
              )}
              {submissionBusy && !submissionPosting && (
                <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900 flex items-center gap-2 font-medium">
                  <RefreshCw className="w-3.5 h-3.5 text-amber-600 animate-spin" />
                  <span>Reserving {formData.rewardCredits} credits for this errand…</span>
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
                className="w-full bg-campus-coral hover:bg-campus-coral-hover active:scale-98 disabled:bg-slate-300 text-campus-ink font-semibold text-sm py-3.5 px-4 rounded-xl shadow-subtle transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer flex items-center justify-center gap-2"
              >
                {submissionPosting ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Submitting Errand…</span>
                  </>
                ) : submissionBusy ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin text-amber-300" />
                    <span>Reserving Credits…</span>
                  </>
                ) : isOverdraw ? (
                  <span>Insufficient Credits</span>
                ) : isZeroBalance ? (
                  <span>Zero Credit Balance</span>
                ) : (
                  <>
                    <span>Post Errand</span>
                    <span className="text-xs bg-white/25 px-2 py-0.5 rounded-full font-bold">
                      {formData.rewardCredits} Credits
                    </span>
                  </>
                )}
              </button>
            </div>
          </aside>
        </fieldset>
      </form>

      {/* AI-generated (edited by jagdeepsh) */}
      {isPickupMapOpen && (
        <SupplierPickupMap
          suppliers={activeSuppliers}
          selectedSupplierId={formData.supplierId}
          onSelect={(chosen) => {
            setFormData({
              ...formData,
              supplierId: chosen.id,
              supplierName: chosen.name,
              campusZone: chosen.campusZone,
            });
          }}
          onClose={() => setIsPickupMapOpen(false)}
        />
      )}

      {isClosedStoreConfirmOpen && selectedSupplier && (
        <ClosedStoreDialog
          supplierName={selectedSupplier.name}
          hours={selectedHours}
          onConfirm={handleConfirmClosedStore}
          onCancel={handleCancelClosedStore}
        />
      )}
    </div>
  );
}

function ClosedStoreDialog({
  supplierName,
  hours,
  onConfirm,
  onCancel,
}: {
  supplierName: string;
  hours: string | null;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const goBackRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    if (!dialog.open) dialog.showModal();
    goBackRef.current?.focus();
    return () => {
      if (dialog.open) dialog.close();
      opener?.focus();
    };
  }, []);

  return (
    // Escape closes a native dialog by itself; onClose treats that the same as "Go back". The open check skips the
    // close event queued by the effect cleanup when StrictMode re-runs the effect and re-opens the dialog.
    <dialog
      ref={dialogRef}
      aria-labelledby="closed-store-dialog-title"
      onClose={() => { if (!dialogRef.current?.open) onCancel(); }}
      className="bg-white rounded-2xl max-w-sm w-[calc(100%-2rem)] p-6 shadow-2xl backdrop:bg-black/50 backdrop:backdrop-blur-sm"
    >
      <div className="space-y-4">
        <div className="flex items-center space-x-3 text-amber-600">
          <div className="w-10 h-10 rounded-full bg-amber-50 flex items-center justify-center shrink-0">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div>
            <h3 id="closed-store-dialog-title" className="font-bold text-base text-slate-900">
              Store may be closed
            </h3>
            <p className="text-sm text-slate-500">Outside operating hours</p>
          </div>
        </div>

        <p className="text-sm text-slate-600">
          <strong className="text-slate-800">{supplierName}</strong> is outside its operating hours
          {hours ? ` (${hours})` : ''}. A courier may not be able to buy your items until it opens. Post this errand
          anyway?
        </p>

        <div className="flex justify-end space-x-2 pt-3 border-t border-slate-100">
          <button
            ref={goBackRef}
            type="button"
            onClick={onCancel}
            className="px-4 py-2 text-sm font-bold text-slate-600 hover:bg-slate-100 rounded-lg"
          >
            Go back
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="bg-campus-blue hover:bg-campus-blue-hover text-white font-bold text-sm px-4 py-2 rounded-lg shadow"
          >
            Post anyway
          </button>
        </div>
      </div>
    </dialog>
  );
}
