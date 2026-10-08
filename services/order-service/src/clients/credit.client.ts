/**
 * AI Assistance Disclosure:
 * Tool: Google Antigravity Agent, date: 2026-10-07
 * Scope: Refactored Credit Service client using extracted helper functions and a lightweight factory function.
 * Author review: (to be completed by author after review)
 */
// AI-generated (edited by yanhwee)

export interface ReserveEscrowParams {
  orderId: string;
  requesterId: string;
  amount: number;
}

export interface ReserveEscrowResult {
  success: boolean;
  status: number;
  error?: string;
}

export interface CreditClient {
  reserveEscrow(params: ReserveEscrowParams): Promise<ReserveEscrowResult>;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function extractErrorMessage(response: Response): Promise<string> {
  let errorMessage = `Credit service returned HTTP ${response.status}`;
  try {
    const data = await response.json() as { error?: string };
    if (data.error) {
      errorMessage = data.error;
    }
  } catch {
    // Non-JSON response payload
  }
  return errorMessage;
}

async function handleReserveEscrow(
  targetUrl: string,
  params: ReserveEscrowParams
): Promise<ReserveEscrowResult> {
  const maxRetries = 2;
  let attempt = 0;

  while (attempt <= maxRetries) {
    attempt++;
    try {
      const response = await fetch(targetUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params),
        signal: AbortSignal.timeout(5000),
      });

      if (response.ok) {
        return { success: true, status: response.status };
      }

      const errorMessage = await extractErrorMessage(response);

      // 4xx (e.g. 400 Bad Request, 409 Conflict) are non-retryable client errors
      if (response.status < 500) {
        return { success: false, status: response.status, error: errorMessage };
      }

      // If 5xx, retry if attempts remain
      if (attempt > maxRetries) {
        return { success: false, status: response.status, error: errorMessage };
      }
    } catch (error) {
      if (attempt > maxRetries) {
        const msg = error instanceof Error ? error.message : 'Unknown network error';
        return { success: false, status: 503, error: `Credit service unavailable: ${msg}` };
      }
    }

    // Brief delay before retry with backoff
    await new Promise((resolve) => setTimeout(resolve, 200 * attempt));
  }

  return { success: false, status: 503, error: 'Credit reservation failed after retries' };
}

// ---------------------------------------------------------------------------
// Lightweight Factory Function
// ---------------------------------------------------------------------------

export function createCreditClient(creditServiceUrl: string): CreditClient {
  const targetUrl = new URL('/api/credits/escrow/reserve', creditServiceUrl).toString();

  return {
    reserveEscrow: (params) => handleReserveEscrow(targetUrl, params),
  };
}
