/**
 * AI Assistance Disclosure:
 * Tool: Google Antigravity Agent, date: 2026-11-10
 * Scope: Remove static FALLBACK_SUPPLIERS placeholder rows so supplier API failures never render non-existent demo records (issue #201).
 * Author review: I validated correctness, edited for style, and verified with automated tests.
 *
 * Tool: Google Antigravity Agent, date: 2026-10-19
 * Scope: Extracted admin supplier API calls and fallback list into src/api/suppliers.ts.
 * Author review: Verified by yanhwee on 2026-10-19
 */

// AI-generated (edited by yanhwee)

import { CreateSupplierRequest, SupplierDTO, UpdateSupplierRequest } from '@campus-errand/common-dtos';

export type AuthFetchFn = (url: string, init?: RequestInit) => Promise<Response>;

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
