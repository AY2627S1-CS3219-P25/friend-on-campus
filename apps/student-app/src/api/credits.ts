/**
 * AI Assistance Disclosure:
 * Tool: Google Antigravity Agent, date: 2026-10-19
 * Scope: Extracted credit wallet and ledger API client functions from student-app App.tsx into modular api/credits.ts.
 * Author review: Verified by yanhwee
 */

// AI-generated (edited by yanhwee)

import { CreditTransactionDTO, CreditWalletDTO } from '@campus-errand/common-dtos';
import { AuthFetchFn } from './auth';

export type FetchCreditsResult =
  | { status: 'ok'; wallet: CreditWalletDTO; ledger: CreditTransactionDTO[] }
  | { status: 'not_initialized'; message: string }
  | { status: 'error'; message: string };

export async function fetchWalletAndLedger(authFetch: AuthFetchFn): Promise<FetchCreditsResult> {
  try {
    const walletResponse = await authFetch('/api/credits/wallet');
    const walletResult = await walletResponse.json();
    if (walletResponse.status === 404) {
      return {
        status: 'not_initialized',
        message: 'Your credit wallet has not been initialized yet.',
      };
    }
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
