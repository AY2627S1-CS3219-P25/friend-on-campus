/**
 * AI Assistance Disclosure:
 * Tool: Claude Code (model: Claude Sonnet 5.5), date: 2026-11-06
 * Scope: Builds the create-order request for "Order again": the same details as a completed errand, without the admin
 * audit tags that admin actions append to special notes.
 * Author review: <to be completed by the author>
 */
// AI-generated (edited by jagdeepsh)
import type { CreateOrderRequest, OrderDTO } from '@campus-errand/common-dtos';

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
