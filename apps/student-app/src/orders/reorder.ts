/**
 * AI Assistance Disclosure:
 * Tool: Google Antigravity Agent; Claude Code (model: Claude Sonnet 5.5), date: 2026-11-06 to 2026-11-10
 * Scope: Builds the create-order request for "Order again": the same details as a completed errand, without the admin audit tags that admin actions append to special..; updated across 2 AI-assisted revisions through D4 wrap-up (add confirmReorderWhenStoreClosed so "Order again" requires confirmation when the pickup store is outside operating hours (issue #234)).
 * Author review: I validated correctness, edited for style, and verified with automated tests.
 */
import type { CreateOrderRequest, OrderDTO, SupplierDTO } from '@campus-errand/common-dtos';
import { formatOperatingHours, isOpenAt } from '../suppliers/operatingHours';

const DEFAULT_DURATION_MINUTES = 30;
const MAX_DURATION_MINUTES = 1440;

/** Admin actions append "[Admin ... by <id>: <reason>]" segments to special notes; they are not the requester's words. */
export function stripAdminNotes(notes: string | undefined): string | undefined {
  if (!notes) return undefined;
  const kept = notes.split(' | ').filter((part) => !part.trim().startsWith('[Admin '));
  const text = kept.join(' | ').trim();
  return text.length > 0 ? text : undefined;
}

/** How long the original errand was open for acceptance, clamped to the allowed 30 to 1440 minutes. */
export function originalDurationMinutes(order: Pick<OrderDTO, 'createdAt' | 'expiresAt'>): number {
  const minutes = Math.round((new Date(order.expiresAt).getTime() - new Date(order.createdAt).getTime()) / 60000);
  if (!Number.isFinite(minutes)) return DEFAULT_DURATION_MINUTES;
  return Math.min(MAX_DURATION_MINUTES, Math.max(DEFAULT_DURATION_MINUTES, minutes));
}

export function buildReorderRequest(order: OrderDTO): CreateOrderRequest {
  const notes = stripAdminNotes(order.specialNotes);
  const hasDropoffEstimate =
    order.dropoffLatitude !== undefined && order.dropoffLongitude !== undefined && order.estimatedRewardCredits !== undefined;
  return {
    supplierId: order.supplierId,
    itemDescription: order.itemDescription,
    ...(notes ? { specialNotes: notes } : {}),
    dropoffLocation: order.dropoffLocation,
    ...(order.requesterContactNote ? { requesterContactNote: order.requesterContactNote } : {}),
    rewardCredits: order.rewardCredits,
    durationMinutes: originalDurationMinutes(order),
    ...(hasDropoffEstimate
      ? {
        dropoffLatitude: order.dropoffLatitude,
        dropoffLongitude: order.dropoffLongitude,
        estimatedRewardCredits: order.estimatedRewardCredits,
      }
      : {}),
  };
}

// Require confirmation before re-posting when the pickup store is currently closed (issue #234).
export function confirmReorderWhenStoreClosed(
  order: Pick<OrderDTO, 'supplierId' | 'supplierName'>,
  suppliers: readonly SupplierDTO[],
  now: Date = new Date(),
  confirm: (message: string) => boolean = (message) => window.confirm(message),
): boolean {
  const supplier = suppliers.find((s) => s.id === order.supplierId);
  if (!supplier || isOpenAt(supplier, now) !== false) return true;
  const hours = formatOperatingHours(supplier);
  const storeName = supplier.name || order.supplierName || 'This pickup store';
  const hoursClause = hours ? ` (operating hours: ${hours})` : '';
  return confirm(`${storeName} is currently closed${hoursClause}. Post this errand anyway?`);
}
