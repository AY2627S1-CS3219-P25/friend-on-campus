/**
 * AI Assistance Disclosure:
 * Tool: Claude Code (model: Claude Fable 5.1), date: 2026-11-08
 * Scope: New credit balance read workload for issue #236 (#43 p95 <= 500 ms at 100 VUs, #45 < 1% errors):
 *        each VU reads its own run-owned wallet and the response must match the fixture snapshot.
 * Author review: <to be completed by Reallyeasy1>
 *
 *   npm run perf:k6 -- --target http://127.0.0.1 --profile load --workload credit
 *
 * Gateway timing includes the network and routing path; #43 is stated at the Credit service boundary, so the
 * report labels this population as "gateway" evidence. #44 (reservation/settlement/release) is not covered here.
 */
// AI-generated (edited by Reallyeasy1)
import {
  Session,
  accountFor,
  assertAccounts,
  baseOptions,
  buildScenario,
  envelope,
  measured,
  operationThresholds,
  scenarioMaxVus,
  summaryHandler,
} from './lib/perf.js';

const scenario = buildScenario('walletRead', 'credit');
const maxVus = scenarioMaxVus(scenario);

export const options = baseOptions({ credit_balance: scenario }, operationThresholds('credit', maxVus));

export function setup() {
  assertAccounts(maxVus);
  console.log(`[setup] credit workload, ${maxVus} max VUs, one run-owned wallet per VU`);
}

let session;

export function walletRead() {
  session = session || new Session(accountFor(1, 0));
  const account = session.account;
  measured(session, 'credit_wallet', {
    path: '/api/credits/wallet',
    template: '/api/credits/wallet',
    validate: (res, json) => {
      const shape = envelope(res, json, 200);
      if (shape !== true) return shape;
      const wallet = json.data;
      if (wallet.userId !== account.userId) return 'wallet belongs to a different user';
      if (!Number.isInteger(wallet.availableCredits) || !Number.isInteger(wallet.escrowCredits)) return 'credits are not integers';
      if (wallet.availableCredits < 0 || wallet.escrowCredits < 0) return 'negative balance';
      if (wallet.availableCredits !== account.expectedAvailableCredits || wallet.escrowCredits !== account.expectedEscrowCredits) {
        return 'balance differs from the fixture snapshot';
      }
      return true;
    },
  });
}

export const handleSummary = summaryHandler('credit');
