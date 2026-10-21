/**
 * AI Assistance Disclosure:
 * Tool: Google Antigravity Agent, date: 2026-10-19
 * Scope: Extracted supplier directory API client helper from student-app App.tsx into modular api/suppliers.ts.
 * Author review: Verified by yanhwee
 */

// AI-generated (edited by yanhwee)

import { SupplierDTO } from '@campus-errand/common-dtos';

export async function fetchAllSuppliers(): Promise<SupplierDTO[]> {
  const res = await fetch('/api/suppliers');
  const json = await res.json();
  if (!res.ok || !json.success) {
    throw new Error('Supplier API unavailable');
  }
  return Array.isArray(json.data) ? json.data : json.data?.suppliers || [];
}
