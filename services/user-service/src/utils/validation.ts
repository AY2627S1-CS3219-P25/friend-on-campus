/**
 * AI Assistance Disclosure:
 * Tool: Claude Code (model: Claude Fable 5.1), date: 2026-10-04
 * Scope: Added isUuid for the /:id route parameter check (UAT A10).
 * Author review: <to be completed by Reallyeasy1>
 *
 * Tool: Codex (model: GPT-5.6 Terra), date: 2026-09-23
 * Scope: Implemented User Service validation and normalization helpers for account and profile inputs.
 * Author review: <to be completed by ngkhengyang>
 */
const MAX_USERNAME_LENGTH = 50;
const MAX_EMAIL_LENGTH = 320;
const MIN_PASSWORD_LENGTH = 8;
const MAX_PASSWORD_LENGTH = 24;

export function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

export function isValidUsername(value: unknown): value is string {
  if (!isNonEmptyString(value)) {
    return false;
  }

  return value.trim().length <= MAX_USERNAME_LENGTH;
}

export function isValidEmail(value: unknown): value is string {
  if (!isNonEmptyString(value)) {
    return false;
  }

  const email = value.trim();
  return email.length <= MAX_EMAIL_LENGTH && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export function isValidPassword(value: unknown): value is string {
  if (typeof value !== 'string') {
    return false;
  }

  const length = Array.from(value).length;
  return (
    length >= MIN_PASSWORD_LENGTH &&
    length <= MAX_PASSWORD_LENGTH
  );
}

// AI-generated (edited by Reallyeasy1)
export function isUuid(value: unknown): value is string {
  return typeof value === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
}

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}
