/**
 * AI Assistance Disclosure:
 * Tool: Google Antigravity Agent, date: 2026-10-22
 * Scope: Removed dead 'audit' navigation section from AdminNavSection union.
 * Author review: <to be completed by yanhwee>
 *
 * Tool: Google Antigravity Agent, date: 2026-10-19
 * Scope: Extracted shared admin portal constants, types, JWT claim decoders, and supplier validation helpers into src/constants.ts.
 * Author review: Verified by yanhwee on 2026-10-19
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

export function validateSupplierForm(data: {
  name?: string;
  campusZone?: string;
  category?: string;
  exactLocation?: string;
  building?: string;
  floor?: string;
}): Record<string, string> {
  const errors: Record<string, string> = {};
  if (!data.name?.trim()) errors.name = 'Store / Spot Name is required.';
  if (!data.campusZone?.trim()) errors.campusZone = 'Campus Zone is required.';
  if (!data.category?.trim()) errors.category = 'Category is required.';
  if (!data.exactLocation?.trim()) errors.exactLocation = 'Exact Pickup Spot Description is required.';
  if (!data.building?.trim()) errors.building = 'Building is required.';
  if (!data.floor?.trim()) errors.floor = 'Floor is required.';
  return errors;
}
