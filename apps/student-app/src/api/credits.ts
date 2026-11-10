/**
 * AI Assistance Disclosure:
 * Tool: Google Antigravity Agent, date: 2026-10-19 to 2026-11-10
 * Scope: Extracted credit wallet and ledger API client functions from student-app App.tsx into modular api/credits.ts; updated across 2 AI-assisted revisions through D4 wrap-up (poll wallet initialization briefly on HTTP 404 so newly registered accounts wait for the async welcome-grant CDC event instead of flashing an immediate..).
 * Author review: I validated correctness, edited for style, and verified with automated tests.
 */


import { CreditTransactionDTO, CreditWalletDTO } from '@campus-errand/common-dtos';
import { AuthFetchFn } from './auth';

export const WALLET_INIT_RETRY_ATTEMPTS = 8;
export const WALLET_INIT_RETRY_DELAY_MS = 1_000;

export type FetchCreditsResult =
  | { status: 'ok'; wallet: CreditWalletDTO; ledger: CreditTransactionDTO[] }
  | { status: 'not_initialized'; message: string }
  | { status: 'error'; message: string };

export async function fetchWalletAndLedger(
  authFetch: AuthFetchFn,
  options: {
    initRetryAttempts?: number;
    initRetryDelayMs?: number;
    wait?: (ms: number) => Promise<void>;
  } = {},
): Promise<FetchCreditsResult> {
  const attempts = Math.max(1, options.initRetryAttempts ?? WALLET_INIT_RETRY_ATTEMPTS);
  const delayMs = options.initRetryDelayMs ?? WALLET_INIT_RETRY_DELAY_MS;
  const wait = options.wait ?? ((ms: number) => new Promise((resolve) => setTimeout(resolve, ms)));

  try {
    let walletResponse: Response | null = null;
    // Retry HTTP 404 briefly while the user.registered CDC event initializes the wallet (#168).
    for (let attempt = 0; attempt < attempts; attempt++) {
      walletResponse = await authFetch('/api/credits/wallet');
      if (walletResponse.status !== 404) break;
      if (attempt < attempts - 1) {
        await wait(delayMs);
      }
    }
    if (!walletResponse || walletResponse.status === 404) {
      return {
        status: 'not_initialized',
        message: 'Your credit wallet is still being set up. Please refresh in a moment.',
      };
    }
    const walletResult = await walletResponse.json();
    if (!walletResponse.ok || !walletResult.success || !walletResult.data) {
      throw new Error('Unable to load your credits. Please try again.');
    }

    const ledgerResponse = await authFetch('/api/credits/ledger');
    const ledgerResult = await ledgerResponse.json();
    if (!ledgerResponse.ok || !ledgerResult.success || !Array.isArray(ledgerResult.data)) {
      throw new Error('Unable to load your transactions. Please try again.');
    }

    return {
      status: 'ok',
      wallet: walletResult.data as CreditWalletDTO,
      ledger: ledgerResult.data as CreditTransactionDTO[],
    };
  } catch {
    return {
      status: 'error',
      message: 'Unable to load your wallet and transactions. Please try again.',
    };
  }
}
