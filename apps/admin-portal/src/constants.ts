/**
 * AI Assistance Disclosure:
 * Tool: Claude Code (model: Claude Fable 5.1), date: 2026-11-04
 * Scope: PR #222 review: validateSupplierForm takes the record being edited, so a coordinate a legacy supplier never
 * had may stay blank on edit (the PUT omits it and the API preserves the null); creation and clearing an existing
 * value remain errors.
 * Author review: <to be completed by Reallyeasy1>
 *
 * Tool: Google Antigravity Agent, date: 2026-10-22
 * Scope: Removed dead 'audit' navigation section from AdminNavSection union.
 * Author review: <to be completed by yanhwee>
 *
 * Tool: Google Antigravity Agent, date: 2026-10-19
 * Scope: Extracted shared admin portal constants, types, JWT claim decoders, and supplier validation helpers into src/constants.ts.
 * Author review: Verified by yanhwee on 2026-10-19
 *
 * Tool: Claude Code (model: Sonnet 5), date: 2026-10-30
 * Scope: Merge of admin_dashboard into main. validateSupplierForm now also requires latitude/longitude (red
 * asterisk, inline error, no API call until both are filled with a valid number), matching the supplier-service
 * DB columns made NOT NULL on 2026-10-17.
 * Author review: (to be completed by author after review)
 */

// AI-generated (edited by yanhwee)

import { SupplierCategory, UserRole } from '@campus-errand/common-dtos';

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

// AI-generated (edited by jagdeepsh)
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
  // AI-generated (edited by Reallyeasy1): on create (no `existing`) both coordinates are mandatory. On edit, a
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
