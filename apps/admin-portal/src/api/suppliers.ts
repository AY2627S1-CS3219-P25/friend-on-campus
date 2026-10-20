/**
 * AI Assistance Disclosure:
 * Tool: Google Antigravity Agent, date: 2026-10-19
 * Scope: Extracted admin supplier API calls and fallback list into src/api/suppliers.ts.
 * Author review: Verified by yanhwee on 2026-10-19
 */

// AI-generated (edited by yanhwee)

import { CreateSupplierRequest, SupplierDTO, UpdateSupplierRequest } from '@campus-errand/common-dtos';

export type AuthFetchFn = (url: string, init?: RequestInit) => Promise<Response>;

export const FALLBACK_SUPPLIERS: SupplierDTO[] = [
  {
    id: 's1',
    supplierCode: 'SUP-001',
    name: 'CoffeeBean @ COM3',
    campusZone: 'COM3',
    exactLocation: 'COM3 Level 1 Lobby',
    category: 'Beverages',
    description: 'Specialty coffee, pastries, and sandwiches',
    building: 'COM3',
    floor: '1',
    startingTime: '0800hrs',
    closingTime: '2000hrs',
    isActive: true,
    createdAt: new Date().toISOString(),
  },
  {
    id: 's2',
    supplierCode: 'SUP-002',
    name: 'Printers @ PCCommons',
    campusZone: 'UTown',
    exactLocation: 'Stephen Riady Centre Level 1',
    category: 'Printing',
    description: 'Fast printing & lecture note pickup hub',
    building: 'Stephen Riady Centre',
    floor: '1',
    startingTime: '0000hrs',
    closingTime: '2359hrs',
    isActive: true,
    createdAt: new Date().toISOString(),
  },
  {
    id: 's3',
    supplierCode: 'SUP-003',
    name: 'PGP Mailroom & Smart Lockers',
    campusZone: 'PGPR',
    exactLocation: "Prince George's Park Residences Foyer",
    category: 'Parcels',
    description: 'Courier parcel lockers and delivery collection point',
    building: "Prince George's Park",
    floor: '1',
    startingTime: '0000hrs',
    closingTime: '2359hrs',
    isActive: true,
    createdAt: new Date().toISOString(),
  },
  {
    id: 's4',
    supplierCode: 'SUP-004',
    name: 'Fine Food Canteen (UTown)',
    campusZone: 'UTown',
    exactLocation: 'Town Plaza Level 1',
    category: 'Food',
    description: 'Mala Xiang Guo, Chicken Rice, and Drinks',
    building: 'Town Plaza',
    floor: '1',
    startingTime: '0730hrs',
    closingTime: '2100hrs',
    isActive: true,
    createdAt: new Date().toISOString(),
  },
];

export async function fetchSuppliersApi(): Promise<SupplierDTO[]> {
  const res = await fetch('/api/suppliers');
  if (!res.ok) {
    throw new Error(`HTTP error ${res.status}: ${res.statusText}`);
  }
  const json = await res.json();
  if (json.success && json.data) {
    return Array.isArray(json.data) ? json.data : json.data.suppliers || [];
  }
  throw new Error(json.error || 'Failed to parse suppliers payload');
}

export async function createSupplierApi(authFetch: AuthFetchFn, payload: CreateSupplierRequest) {
  const res = await authFetch('/api/suppliers', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  return { res, data };
}

export async function updateSupplierApi(authFetch: AuthFetchFn, id: string, payload: UpdateSupplierRequest) {
  const res = await authFetch(`/api/suppliers/${id}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  return { res, data };
}

export async function deleteSupplierApi(authFetch: AuthFetchFn, id: string, permanent: boolean) {
  const url = `/api/suppliers/${id}${permanent ? '?permanent=true' : ''}`;
  const res = await authFetch(url, { method: 'DELETE' });
  const data = await res.json();
  return { res, data };
}

export async function toggleSupplierStatusApi(authFetch: AuthFetchFn, id: string) {
  const res = await authFetch(`/api/suppliers/${id}/toggle`, { method: 'PATCH' });
  const data = await res.json();
  return { res, data };
}
