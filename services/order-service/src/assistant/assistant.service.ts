/**
 * AI Assistance Disclosure:
 * Tool: Google Antigravity Agent, date: 2026-10-28
 * Scope: Refactored AssistantService into modular, single-responsibility helper functions (prompt building, SoCLaaS gateway call, supplier matching, timing rules, offline fallback).
 * Author review: <to be completed by yanhwee>
 *
 * Tool: Google Antigravity Agent, date: 2026-10-28
 * Scope: Natural-Language Errand Creation Assistant service (F6) calling NUS SoCLaaS OpenAI-compatible gateway with supplier grounding and D1 §3.3 timing constraints.
 * Author review: <to be completed by yanhwee>
 */
// AI-generated (edited by yanhwee)

import type { ParsedErrandDraftDTO, ParsedErrandItemDTO } from '@campus-errand/common-dtos';
import type { SupplierClient, SupplierDetails } from '../clients/supplier.client';

export interface AssistantServiceConfig {
  soclaasBaseUrl: string;
  soclaasApiKey: string;
  soclaasModel: string;
}

export interface AssistantService {
  parseErrandDraft(prompt: string): Promise<ParsedErrandDraftDTO>;
}

interface RawLlmExtraction {
  supplierId?: string | null;
  supplierName?: string | null;
  items?: Array<{
    itemDescription?: string;
    quantity?: number;
    estimatedUnitCost?: number;
    unitSize?: string;
  }>;
  itemDescription?: string;
  totalEstimatedCost?: number;
  dropoffLocation?: string;
  rewardCredits?: number;
  durationMinutes?: number;
  specialNotes?: string;
  requestedDeadline?: string | null;
}

// ---------------------------------------------------------------------------
// Extracted Helpers
// ---------------------------------------------------------------------------

// AI-generated (edited by yanhwee)
function matchSupplier(
  rawName: string | null | undefined,
  rawId: string | null | undefined,
  activeSuppliers: SupplierDetails[]
): { supplierId?: string; matchedSupplierName?: string } {
  if (rawId) {
    const matchById = activeSuppliers.find((s) => s.id === rawId);
    if (matchById) {
      return { supplierId: matchById.id, matchedSupplierName: matchById.name };
    }
  }

  if (!rawName || rawName.trim() === '') {
    return {};
  }

  const clean = rawName.toLowerCase().trim();

  // Exact name match
  const exact = activeSuppliers.find((s) => s.name.toLowerCase() === clean);
  if (exact) {
    return { supplierId: exact.id, matchedSupplierName: exact.name };
  }

  // Substring match (e.g. "starbucks" matches "Starbucks UTown")
  const substringMatch = activeSuppliers.find(
    (s) => s.name.toLowerCase().includes(clean) || clean.includes(s.name.toLowerCase())
  );
  if (substringMatch) {
    return { supplierId: substringMatch.id, matchedSupplierName: substringMatch.name };
  }

  return {};
}

// AI-generated (edited by yanhwee)
function fallbackOfflineExtract(
  prompt: string,
  activeSuppliers: SupplierDetails[]
): ParsedErrandDraftDTO {
  const warnings: string[] = [
    'Parsed via offline fallback mode (SoCLaaS gateway was not reached or returned an error).',
  ];

  let matchedSupplier: { supplierId?: string; matchedSupplierName?: string } = {};
  for (const s of activeSuppliers) {
    if (prompt.toLowerCase().includes(s.name.toLowerCase())) {
      matchedSupplier = { supplierId: s.id, matchedSupplierName: s.name };
      break;
    }
  }

  if (!matchedSupplier.supplierId) {
    warnings.push('Could not automatically determine pickup spot. Please choose from active spots.');
  }

  // Match credit mention: e.g. "5 credits" or "reward 5"
  let rewardCredits = 5;
  const creditMatch = prompt.match(/(\d+)\s*credits?/i) || prompt.match(/reward\s*(\d+)/i);
  if (creditMatch) {
    rewardCredits = Math.max(1, parseInt(creditMatch[1], 10));
  }

  // Look for deadline cues
  let specialNotes = '';
  const deadlineMatch = prompt.match(/\b(by|before|at)\s+([0-9]{1,2}(?::[0-9]{2})?\s*(?:am|pm)?)\b/i);
  if (deadlineMatch) {
    specialNotes = `Requested delivery deadline: ${deadlineMatch[0]}`;
    warnings.push(`Clock deadline "${deadlineMatch[0]}" preserved in Special Notes (acceptance duration is 30 mins).`);
  }

  return {
    supplierId: matchedSupplier.supplierId,
    matchedSupplierName: matchedSupplier.matchedSupplierName,
    itemDescription: prompt.slice(0, 200),
    dropoffLocation: '',
    rewardCredits,
    durationMinutes: 30,
    specialNotes: specialNotes || undefined,
    warnings,
  };
}

// AI-generated (edited by yanhwee)
function buildSystemPrompt(activeSuppliers: SupplierDetails[]): string {
  const suppliersContext = activeSuppliers
    .map((s) => `- ${s.name} (Zone: ${s.campusZone}, ID: ${s.id})`)
    .join('\n');

  return `You are an errand assistant parser for the NUS "Friend on Campus" student delivery platform.
Extract errand details from the user's natural language request into a clean JSON object.

ACTIVE CAMPUS PICKUP SPOTS:
${suppliersContext || 'None available currently'}

OUTPUT REQUIREMENTS:
Respond ONLY with a valid JSON object matching this schema (no markdown formatting, no backticks, no comments):
{
  "supplierId": "string (UUID from ACTIVE CAMPUS PICKUP SPOTS above if matched, or null if unknown)",
  "supplierName": "string (name of the store/spot mentioned)",
  "items": [
    {
      "itemDescription": "string",
      "quantity": 1,
      "estimatedUnitCost": 0.0,
      "unitSize": "cup/piece/bowl"
    }
  ],
  "itemDescription": "string (concise summary of all requested items, e.g. '2x Iced Americano')",
  "totalEstimatedCost": 0.0,
  "dropoffLocation": "string (destination or delivery room/spot)",
  "rewardCredits": 5,
  "durationMinutes": 30,
  "specialNotes": "string (dietary notes, packaging, etc.)",
  "requestedDeadline": "string or null (e.g. 'by 2pm' if the student stated a specific clock time)"
}

IMPORTANT RULES:
1. TIMING RULE (D1 §3.3): durationMinutes is the errand expiration countdown in minutes (default 30). Absolute clock times like "by 2pm" or "at 3:30pm" must NOT set durationMinutes. Keep durationMinutes = 30 and store the clock time in requestedDeadline.
2. REWARD CREDITS: Extract mentioned credits (e.g., "for 5 credits" -> 5). If none mentioned, default to 5.
3. ITEM SUMMARY: If multiple items are listed, provide itemDescription as a clear formatted list (e.g. "2x Iced Americano, 1x Croissant").`;
}

// AI-generated (edited by yanhwee)
async function callSoclaas(
  prompt: string,
  activeSuppliers: SupplierDetails[],
  config: AssistantServiceConfig
): Promise<RawLlmExtraction | null> {
  if (!config.soclaasApiKey || config.soclaasApiKey.trim() === '') {
    return null;
  }

  try {
    const requestPayload = {
      model: config.soclaasModel || 'default',
      messages: [
        { role: 'system', content: buildSystemPrompt(activeSuppliers) },
        { role: 'user', content: prompt },
      ],
      temperature: 0.1,
    };

    const response = await fetch(`${config.soclaasBaseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${config.soclaasApiKey}`,
      },
      body: JSON.stringify(requestPayload),
      signal: AbortSignal.timeout(10_000),
    });

    if (!response.ok) {
      console.warn(`[assistant-service] SoCLaaS returned HTTP ${response.status}: ${await response.text()}`);
      return null;
    }

    const json = (await response.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };

    const rawContent = json.choices?.[0]?.message?.content;
    if (!rawContent) return null;

    const cleaned = rawContent.replace(/^```json\s*/i, '').replace(/```\s*$/, '').trim();
    return JSON.parse(cleaned) as RawLlmExtraction;
  } catch (err) {
    console.warn('[assistant-service] Failed to call SoCLaaS API:', err);
    return null;
  }
}

// AI-generated (edited by yanhwee)
function buildDraftFromExtraction(
  rawExtraction: RawLlmExtraction,
  trimmedPrompt: string,
  activeSuppliers: SupplierDetails[]
): ParsedErrandDraftDTO {
  const warnings: string[] = [];

  // Match supplier
  const { supplierId, matchedSupplierName } = matchSupplier(
    rawExtraction.supplierName,
    rawExtraction.supplierId,
    activeSuppliers
  );

  if (!supplierId) {
    const spotName = rawExtraction.supplierName || 'mentioned spot';
    warnings.push(
      `Could not automatically match "${spotName}" with a registered campus pickup spot. Please select one from the list.`
    );
  }

  // Handle items summary
  let itemDescription = (rawExtraction.itemDescription || '').trim();
  const items: ParsedErrandItemDTO[] = Array.isArray(rawExtraction.items)
    ? rawExtraction.items.map((i) => ({
        itemDescription: i.itemDescription || 'Errand item',
        quantity: Math.max(1, Number(i.quantity) || 1),
        estimatedUnitCost: typeof i.estimatedUnitCost === 'number' ? i.estimatedUnitCost : undefined,
        unitSize: i.unitSize || undefined,
      }))
    : [];

  if (!itemDescription && items.length > 0) {
    itemDescription = items.map((i) => `${i.quantity}x ${i.itemDescription}`).join(', ');
  }
  if (!itemDescription) {
    itemDescription = trimmedPrompt.slice(0, 200);
  }

  // Handle timing & D1 §3.3 deadline constraint
  let durationMinutes = 30;
  if (typeof rawExtraction.durationMinutes === 'number' && Number.isFinite(rawExtraction.durationMinutes)) {
    // Enforce valid range [30, 1440]
    durationMinutes = Math.min(1440, Math.max(30, Math.round(rawExtraction.durationMinutes)));
  }

  let specialNotes = (rawExtraction.specialNotes || '').trim();
  if (rawExtraction.requestedDeadline) {
    const deadlineRemark = `Requested delivery deadline: ${rawExtraction.requestedDeadline}`;
    if (!specialNotes.includes(rawExtraction.requestedDeadline)) {
      specialNotes = specialNotes ? `${specialNotes}. ${deadlineRemark}` : deadlineRemark;
    }
    warnings.push(
      `Clock deadline "${rawExtraction.requestedDeadline}" noted in Special Notes (standard acceptance duration set to ${durationMinutes} mins per campus rules).`
    );
  }

  // Dropoff location
  const dropoffLocation = (rawExtraction.dropoffLocation || '').trim();
  if (!dropoffLocation) {
    warnings.push('Drop-off study spot was not detected. Please enter your delivery location.');
  }

  // Reward credits
  let rewardCredits = 5;
  if (typeof rawExtraction.rewardCredits === 'number' && Number.isFinite(rawExtraction.rewardCredits)) {
    rewardCredits = Math.max(1, Math.round(rawExtraction.rewardCredits));
  }

  return {
    supplierId,
    supplierName: rawExtraction.supplierName || undefined,
    matchedSupplierName,
    itemDescription,
    items: items.length > 0 ? items : undefined,
    totalEstimatedCost:
      typeof rawExtraction.totalEstimatedCost === 'number' ? rawExtraction.totalEstimatedCost : undefined,
    dropoffLocation,
    rewardCredits,
    durationMinutes,
    specialNotes: specialNotes || undefined,
    warnings: warnings.length > 0 ? warnings : undefined,
  };
}

// ---------------------------------------------------------------------------
// Service Factory
// ---------------------------------------------------------------------------

// AI-generated (edited by yanhwee)
export function createAssistantService(
  supplierClient: SupplierClient,
  config: AssistantServiceConfig
): AssistantService {
  let cachedSuppliers: SupplierDetails[] = [];
  let cacheExpiresAt = 0;

  async function getActiveSuppliers(): Promise<SupplierDetails[]> {
    const now = Date.now();
    if (cachedSuppliers.length > 0 && now < cacheExpiresAt) {
      return cachedSuppliers;
    }
    const fresh = await supplierClient.listActiveSuppliers();
    if (fresh.length > 0) {
      cachedSuppliers = fresh;
      cacheExpiresAt = now + 60_000;
    }
    return cachedSuppliers;
  }

  return {
    async parseErrandDraft(prompt: string): Promise<ParsedErrandDraftDTO> {
      const trimmedPrompt = prompt.trim();
      if (!trimmedPrompt) {
        throw new Error('Errand prompt must not be empty.');
      }

      const activeSuppliers = await getActiveSuppliers();
      const rawExtraction = await callSoclaas(trimmedPrompt, activeSuppliers, config);

      if (!rawExtraction) {
        return fallbackOfflineExtract(trimmedPrompt, activeSuppliers);
      }

      return buildDraftFromExtraction(rawExtraction, trimmedPrompt, activeSuppliers);
    },
  };
}
