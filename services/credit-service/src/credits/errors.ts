/**
 * AI Assistance Disclosure:
 * Tool: Codex (model: GPT-6), date: 2026-09-24
 * Scope: Implemented the author-specified persistent credit messaging and idempotency contract.
 * Author review: I validated correctness, edited for style, and verified with automated tests.
 */
export class CreditError extends Error {
  constructor(message: string, public readonly status = 400) { super(message); }
}
export class CreditConflict extends CreditError {
  constructor(message: string) { super(message, 409); }
}
export class InvalidCreditEvent extends CreditError {}
