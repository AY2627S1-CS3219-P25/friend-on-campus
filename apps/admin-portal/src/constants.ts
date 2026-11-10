/**
 * AI Assistance Disclosure:
 * Tool: Google Antigravity Agent; Claude Code (model: Claude Fable 5.1, Sonnet 5), date: 2026-10-19 to 2026-11-10
 * Scope: Extracted shared admin portal constants, types, JWT claim decoders, and supplier validation helpers into src/constants.ts; updated across 5 AI-assisted revisions through D4 wrap-up (add describeOrderEscrowSubtitle helper so terminal order rows describe asynchronous escrow settlement/refund accurately without claiming Credit Service..).
 * Author review: I validated correctness, edited for style, and verified with automated tests.
 */


import { OrderStatus, SupplierCategory, UserRole } from '@campus-errand/common-dtos';

export type AdminNavSection = 'suppliers' | 'orders' | 'health' | 'users';

export type DemoRole = 'ADMIN' | 'STUDENT' | 'GUEST';

export interface SupplierLocationConflict {
  name: string;
  category: string;
  building: string;
  floor: string;
}

export const CATEGORIES: SupplierCategory[] = [
  'Beverages',
  'Food',
  'Printing',
  'Parcels',
  'Shopping',
  'General',
];

export const CAMPUS_ZONES = ['COM3', 'UTown', 'PGPR', 'FASS', 'Central Lib', 'Science', 'Engineering'];

export const USER_ROLES: UserRole[] = ['STUDENT', 'ADMIN'];

export function decodeJwtRole(token: string): string | null {
  try {
    const payload = token.split('.')[1];
    const json = atob(payload.replace(/-/g, '+').replace(/_/g, '/'));
    return JSON.parse(json).role ?? null;
  } catch {
    return null;
  }
}

export function decodeJwtUserId(token: string): string | null {
  try {
    const payload = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
    return typeof payload.sub === 'string' ? payload.sub.toLowerCase() : null;
  } catch {
    return null;
  }
}

export function validateSupplierForm(data: {
  name?: string;
  campusZone?: string;
  category?: string;
  exactLocation?: string;
  building?: string;
  floor?: string;
  latitude?: number | '';
  longitude?: number | '';
}, existing?: { latitude?: number | null; longitude?: number | null }): Record<string, string> {
  const errors: Record<string, string> = {};
  if (!data.name?.trim()) errors.name = 'Store / Spot Name is required.';
  if (!data.campusZone?.trim()) errors.campusZone = 'Campus Zone is required.';
  if (!data.category?.trim()) errors.category = 'Category is required.';
  if (!data.exactLocation?.trim()) errors.exactLocation = 'Exact Pickup Spot Description is required.';
  if (!data.building?.trim()) errors.building = 'Building is required.';
  if (!data.floor?.trim()) errors.floor = 'Floor is required.';
  // On create (no `existing`) both coordinates are mandatory. On edit, a
  // coordinate the record never had may stay blank (the request omits it and the API keeps the legacy null), but a
  // recorded value cannot be blanked silently, since the API would keep the old value behind the admin's back.
  for (const key of ['latitude', 'longitude'] as const) {
    const value = data[key];
    const blank = value === undefined || value === null || value === '';
    const mayStayBlank = existing !== undefined && existing[key] == null;
    if ((blank && !mayStayBlank) || (!blank && Number.isNaN(Number(value)))) {
      errors[key] = `${key === 'latitude' ? 'Latitude' : 'Longitude'} is required.`;
    }
  }
  return errors;
}

// Describe order escrow state without claiming Credit Service has already settled/refunded from Order status alone (issue #200).
export function describeOrderEscrowSubtitle(status: OrderStatus): string {
  switch (status) {
    case 'COMPLETED':
      return 'Settlement queued';
    case 'CANCELLED':
    case 'EXPIRED':
      return 'Refund queued';
    case 'REJECTED':
      return 'Not Reserved';
    case 'PENDING':
      return 'Awaiting Escrow';
    default:
      return 'Held in Escrow';
  }
}
