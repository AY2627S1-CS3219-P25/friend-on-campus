/**
 * AI Assistance Disclosure:
 * Tool: Codex (model: GPT-6), date: 2026-11-01
 * Scope: Group suppliers sharing coordinates into one selectable map location.
 * Author review: <to be completed by Reallyeasy1>
 */
// AI-generated (edited by Reallyeasy1)
import type { SupplierDTO } from '@campus-errand/common-dtos';

export interface SupplierLocation {
  key: string;
  position: [number, number];
  suppliers: SupplierDTO[];
}

export function groupSuppliersByLocation(suppliers: SupplierDTO[]): SupplierLocation[] {
  const locations = new Map<string, SupplierLocation>();

  for (const supplier of suppliers) {
    const { latitude, longitude } = supplier;
    if (typeof latitude !== 'number' || typeof longitude !== 'number'
      || !Number.isFinite(latitude) || !Number.isFinite(longitude)) continue;

    const key = `${latitude},${longitude}`;
    let location = locations.get(key);
    if (!location) {
      location = { key, position: [latitude, longitude], suppliers: [] };
      locations.set(key, location);
    }
    location.suppliers.push(supplier);
  }

  return [...locations.values()];
}
