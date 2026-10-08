/**
 * AI Assistance Disclosure:
 * Tool: Google Antigravity Agent, date: 2026-10-07
 * Scope: Refactored Supplier Service client using extracted helper functions and a lightweight factory function.
 * Author review: (to be completed by author after review)
 */
// AI-generated (edited by yanhwee)

export interface SupplierDetails {
  id: string;
  name: string;
  campusZone?: string;
  isActive: boolean;
}

export type SupplierLookupResult =
  | { kind: 'found'; supplier: SupplierDetails }
  | { kind: 'not_found' }
  | { kind: 'unavailable'; message: string };

export interface SupplierClient {
  getSupplier(supplierId: string): Promise<SupplierLookupResult>;
}

// ---------------------------------------------------------------------------
// Extracted Helper
// ---------------------------------------------------------------------------

async function handleGetSupplier(
  baseUrl: string,
  supplierId: string
): Promise<SupplierLookupResult> {
  try {
    const url = new URL(`/api/suppliers/${supplierId}`, baseUrl).toString();
    const response = await fetch(url, {
      signal: AbortSignal.timeout(4000),
    });

    if (response.status === 404 || response.status === 400) {
      return { kind: 'not_found' };
    }

    if (!response.ok) {
      return { kind: 'unavailable', message: `Supplier Service returned status ${response.status}` };
    }

    const body = await response.json() as { success?: boolean; data?: any };
    if (body.success && body.data) {
      const supplier = body.data;
      return {
        kind: 'found',
        supplier: {
          id: supplier.id,
          name: supplier.name,
          campusZone: supplier.campusZone || 'Campus',
          isActive: supplier.isActive !== false,
        },
      };
    }
    return { kind: 'not_found' };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown network failure';
    console.warn(`[supplier-client] Failed to reach Supplier Service for ${supplierId}: ${message}`);
    return { kind: 'unavailable', message };
  }
}

// ---------------------------------------------------------------------------
// Lightweight Factory Function
// ---------------------------------------------------------------------------

export function createSupplierClient(supplierServiceUrl: string): SupplierClient {
  return {
    getSupplier: (supplierId) => handleGetSupplier(supplierServiceUrl, supplierId),
  };
}
