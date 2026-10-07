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

export interface SupplierClient {
  getSupplier(supplierId: string): Promise<SupplierDetails | null>;
}

// ---------------------------------------------------------------------------
// Extracted Helper
// ---------------------------------------------------------------------------

async function handleGetSupplier(
  baseUrl: string,
  supplierId: string
): Promise<SupplierDetails | null> {
  try {
    const url = new URL(`/api/suppliers/${supplierId}`, baseUrl).toString();
    const response = await fetch(url, {
      signal: AbortSignal.timeout(4000),
    });

    if (!response.ok) {
      return null;
    }

    const body = await response.json() as { success?: boolean; data?: any };
    if (body.success && body.data) {
      const supplier = body.data;
      return {
        id: supplier.id,
        name: supplier.name,
        campusZone: supplier.campusZone || 'Campus',
        isActive: supplier.isActive !== false,
      };
    }
    return null;
  } catch (err) {
    console.warn(`[supplier-client] Failed to fetch supplier ${supplierId}:`, err);
    return null;
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
