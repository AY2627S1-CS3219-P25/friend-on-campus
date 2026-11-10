/**
 * AI Assistance Disclosure:
 * Tool: Claude Code (model: Claude Fable 5.1, Sonnet 5); Codex (model: GPT-6, GPT-5.6 Terra), date: 2026-09-22 to 2026-10-01
 * Scope: Implemented centralized User Service error handling, structured deferred-route responses, and safe error responses; updated across 6 AI-assisted revisions through D4 wrap-up (map ACCOUNT_DISABLED to HTTP 403).
 * Author review: I validated correctness, edited for style, and verified with automated tests.
 */




import { ErrorRequestHandler } from 'express';
import { AuthError, AuthErrorCode } from '../auth/auth-module';
import { logError } from '../utils/logger';
import { UserError, UserErrorCode } from '../users/user-module';

const AUTH_ERROR_STATUS: Record<AuthErrorCode, number> = {
  INVALID_INPUT: 400,
  DUPLICATE_EMAIL: 409,
  DUPLICATE_USERNAME: 409,
  INVALID_CREDENTIALS: 401,
  ACCOUNT_DISABLED: 403,
  INVALID_SESSION: 401,
};

const USER_ERROR_STATUS: Record<UserErrorCode, number> = {
  INVALID_INPUT: 400,
  DUPLICATE_USERNAME: 409,
  INVALID_CURRENT_PASSWORD: 401,
  USER_NOT_FOUND: 404,
  FORBIDDEN: 403,
  SELF_ACTION_FORBIDDEN: 403,
  LAST_ADMIN_REQUIRED: 409,
};

interface HttpClientError {
  status?: unknown;
  type?: unknown;
}

export const errorHandler: ErrorRequestHandler = (error, req, res, _next) => {
  // express.json() rejects a malformed or oversized body with an error carrying a 4xx `status`.
  const clientError = error as HttpClientError;
  if (typeof clientError.status === 'number' && clientError.status >= 400 && clientError.status < 500) {
    const malformedJson = clientError.type === 'entity.parse.failed';
    res.status(clientError.status).json({
      success: false,
      error: malformedJson ? 'Request body must be valid JSON' : 'Invalid request',
      code: malformedJson ? 'INVALID_JSON' : 'INVALID_REQUEST',
    });
    return;
  }

  const statusCode = error instanceof AuthError
    ? AUTH_ERROR_STATUS[error.code]
    : error instanceof UserError
      ? USER_ERROR_STATUS[error.code]
      : 500;

  if (error instanceof AuthError || error instanceof UserError) {
    res.status(statusCode).json({
      success: false,
      error: error.message,
      code: error.code,
    });
    return;
  }

  const requestId =
    typeof res.locals.requestId === 'string' ? res.locals.requestId : undefined;
  const errorId = logError('http_request_failed', error, {
    requestId,
    method: req.method,
    path: req.path,
    statusCode,
  });

  res.locals.errorId = errorId;
  res.locals.serverErrorMessage =
    error instanceof Error ? error.message : String(error);
  res.setHeader('X-Error-Id', errorId);

  res.status(500).json({
    success: false,
    error: 'Internal server error',
    errorId,
  });
};
