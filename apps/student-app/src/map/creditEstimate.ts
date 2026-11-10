/**
 * AI Assistance Disclosure:
 * Tool: Claude Code (model: Claude Opus 5.5), date: 2026-11-04
 * Scope: Pure helpers for the drop-off credit estimate (author's decisions A17/A18 with D9 = 5 to 70): haversine straight-line distance, the longest span across a...
 * Author review: I validated correctness, edited for style, and verified with automated tests.
 */
import type { SupplierDTO } from '@campus-errand/common-dtos';

export interface LatLng {
  latitude: number;
  longitude: number;
}

/** Same point (d = 0). */
export const SAME_BUILDING_CREDITS = 5;
/** The longest span across NUS (d = D_MAX) and anything farther. */
export const LONGEST_SPAN_CREDITS = 70;

const EARTH_RADIUS_KM = 6371.0088;

function toRadians(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

export function haversineKm(a: LatLng, b: LatLng): number {
  const dLat = toRadians(b.latitude - a.latitude);
  const dLng = toRadians(b.longitude - a.longitude);
  const h = Math.sin(dLat / 2) ** 2
    + Math.cos(toRadians(a.latitude)) * Math.cos(toRadians(b.latitude)) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.min(1, Math.sqrt(h)));
}

/** The largest pairwise distance in the list, in km; 0 for fewer than two points. */
export function longestSpanKm(points: LatLng[]): number {
  let longest = 0;
  for (let i = 0; i < points.length; i += 1) {
    for (let j = i + 1; j < points.length; j += 1) {
      longest = Math.max(longest, haversineKm(points[i], points[j]));
    }
  }
  return longest;
}

/** The supplier's coordinates, or null when it has none (legacy rows may lack them). */
export function supplierPoint(supplier: SupplierDTO | null | undefined): LatLng | null {
  if (!supplier) return null;
  const { latitude, longitude } = supplier;
  if (typeof latitude !== 'number' || typeof longitude !== 'number'
    || !Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;
  return { latitude, longitude };
}

/**
 * Linear in distance: SAME_BUILDING_CREDITS at 0 km up to LONGEST_SPAN_CREDITS at dMaxKm, held there beyond it.
 * Returns null when either point is missing or dMaxKm is not positive.
 */
export function estimateRewardCredits(
  pickup: LatLng | null | undefined,
  dropoff: LatLng | null | undefined,
  dMaxKm: number,
): number | null {
  if (!pickup || !dropoff || !(dMaxKm > 0)) return null;
  const distance = haversineKm(pickup, dropoff);
  const raw = SAME_BUILDING_CREDITS
    + (LONGEST_SPAN_CREDITS - SAME_BUILDING_CREDITS) * (Math.min(distance, dMaxKm) / dMaxKm);
  return Math.round(raw);
}
