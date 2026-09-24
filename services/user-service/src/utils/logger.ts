/**
 * AI Assistance Disclosure:
 * Tool: Codex (model: GPT-5.6 Terra), date: 2026-09-23
 * Scope: Implemented structured logging helpers with sensitive-value redaction.
 * Author review: <to be completed by ngkhengyang>
 */
import { randomUUID } from 'node:crypto';

type LogContextValue = string | number | boolean | null | undefined;

export type LogContext = Record<string, LogContextValue>;

interface ErrorWithCode extends Error {
  code?: unknown;
}

export interface HttpResponseLog {
  statusCode: number;
  path: string;
  durationMilliseconds: number;
  errorMessage?: string;
}

const ANSI = Object.freeze({
  reset: '\u001b[0m',
  bold: '\u001b[1m',
  green: '\u001b[32m',
  lightBlue: '\u001b[96m',
  yellow: '\u001b[33m',
  red: '\u001b[31m',
});

function sanitizeLogText(value: string): string {
  return value
    .replace(/[\r\n]+/g, ' ')
    .replace(/\b(Bearer\s+)[^\s]+/gi, '$1<REDACTED>')
    .replace(
      /((?:postgres(?:ql)?|amqp):\/\/[^:\s/]+:)[^@\s/]+@/gi,
      '$1<REDACTED>@',
    )
    .replace(/\b(refresh_token=)[^;\s]+/gi, '$1<REDACTED>');
}

function responseStyle(statusCode: number): { label: string; color: string } {
  if (statusCode >= 500) {
    return { label: 'SERVER ERROR', color: ANSI.red };
  }
  if (statusCode >= 400) {
    return { label: 'CLIENT ERROR', color: ANSI.yellow };
  }
  if (statusCode >= 300) {
    return { label: 'REDIRECT', color: ANSI.lightBlue };
  }

  return { label: 'OK', color: ANSI.green };
}

function writeLog(
  level: 'info' | 'error',
  event: string,
  context: LogContext,
  details: Record<string, unknown> = {},
): void {
  const entry = JSON.stringify({
    timestamp: new Date().toISOString(),
    level,
    event,
    context,
    ...details,
  });

  if (level === 'error') {
    console.error(entry);
    return;
  }

  console.info(entry);
}

/**
 * Writes a colored, single-line HTTP completion record. Server errors use
 * stderr; all other response classes use stdout.
 */
export function logHttpResponse(response: HttpResponseLog): void {
  const { label, color } = responseStyle(response.statusCode);
  const timestamp = new Date().toISOString();
  const path = sanitizeLogText(response.path);
  const errorSuffix =
    response.statusCode >= 500
      ? ` - ${sanitizeLogText(response.errorMessage ?? 'Server error')}`
      : '';
  const line =
    `${color}${ANSI.bold}${label}${ANSI.reset}${color} ` +
    `${response.statusCode} ${timestamp} @ ${path} ` +
    `(${response.durationMilliseconds}ms)${errorSuffix}${ANSI.reset}`;

  if (response.statusCode >= 500) {
    console.error(line);
    return;
  }

  console.info(line);
}

/**
 * Writes a structured error to stderr, which Docker exposes through
 * `docker logs`. Callers must provide metadata only, never request bodies,
 * headers, credentials, or tokens.
 */
export function logError(
  event: string,
  error: unknown,
  context: LogContext = {},
): string {
  const errorId = randomUUID();
  const normalizedError =
    error instanceof Error
      ? {
          name: error.name,
          message: sanitizeLogText(error.message),
          code:
            typeof (error as ErrorWithCode).code === 'string'
              ? (error as ErrorWithCode).code
              : undefined,
          stack: error.stack ? sanitizeLogText(error.stack) : undefined,
        }
      : {
          name: 'NonErrorThrown',
          message: sanitizeLogText(String(error)),
        };

  writeLog('error', event, context, {
    errorId,
    error: normalizedError,
  });

  return errorId;
}
