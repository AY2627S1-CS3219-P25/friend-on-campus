/**
 * AI Assistance Disclosure:
 * Tool: Google Antigravity Agent, date: 2026-10-28
 * Scope: Added listActiveSuppliers to SupplierClient for assistant prompt grounding (F6.1).
 * Author review: <to be completed by yanhwee>
 *
 * Tool: Claude Code (model: Claude Fable 5.1), date: 2026-10-24
 * Scope: Lint fix (PR #184): the Supplier Service response body names the four fields read from it instead of any.
 * Author review: <to be completed by Reallyeasy1>
 *
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
  listActiveSuppliers(): Promise<SupplierDetails[]>;
}

// ---------------------------------------------------------------------------
// Extracted Helper
// ---------------------------------------------------------------------------

// AI-generated (edited by yanhwee)
async function handleListActiveSuppliers(baseUrl: string): Promise<SupplierDetails[]> {
  try {
    const url = new URL('/api/suppliers?isActive=true&limit=100', baseUrl).toString();
    const response = await fetch(url, {
      signal: AbortSignal.timeout(4000),
    });

    if (!response.ok) {
      console.warn(`[supplier-client] Supplier Service list returned ${response.status}`);
      return [];
    }

    const body = (await response.json()) as {
      success?: boolean;
      data?:
        | { suppliers?: Array<{ id: string; name: string; campusZone?: string | null; isActive?: boolean }> }
        | Array<{ id: string; name: string; campusZone?: string | null; isActive?: boolean }>;
    };

    if (body.success && body.data) {
      const list = Array.isArray(body.data)
        ? body.data
        : Array.isArray(body.data.suppliers)
        ? body.data.suppliers
        : [];

      return list
        .filter((s) => s.isActive !== false)
        .map((s) => ({
          id: s.id,
          name: s.name,
          campusZone: s.campusZone || 'Campus',
          isActive: true,
        }));
    }
    return [];
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown network failure';
    console.warn(`[supplier-client] Failed to list active suppliers: ${message}`);
    return [];
  }
}

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

    const body = await response.json() as { success?: boolean; data?: { id: string; name: string; campusZone?: string | null; isActive?: boolean } };
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
    listActiveSuppliers: () => handleListActiveSuppliers(supplierServiceUrl),
  };
}
