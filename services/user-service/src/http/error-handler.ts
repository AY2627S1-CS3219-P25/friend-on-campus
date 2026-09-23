/**
 * AI Assistance Disclosure:
 * Tool: Codex (model: GPT-5.6 Terra), date: 2026-09-22
 * Scope: Implemented centralized User Service error handling, structured deferred-route responses, and safe error responses.
 * Author review: <to be completed by ngkhengyang>
 */
// AI-generated (edited by ngkhengyang)
import { ErrorRequestHandler } from 'express';
import { AuthError, AuthErrorCode } from '../auth/auth-module';
import { logError } from '../utils/logger';
import { UserError, UserErrorCode } from '../users/user-module';

const AUTH_ERROR_STATUS: Record<AuthErrorCode, number> = {
  INVALID_INPUT: 400,
  DUPLICATE_EMAIL: 409,
  DUPLICATE_USERNAME: 409,
  INVALID_CREDENTIALS: 401,
  INVALID_SESSION: 401,
};

const USER_ERROR_STATUS: Record<UserErrorCode, number> = {
  INVALID_INPUT: 400,
  DUPLICATE_USERNAME: 409,
  INVALID_CURRENT_PASSWORD: 401,
  USER_NOT_FOUND: 404,
  NOT_IMPLEMENTED: 501,
};

export const errorHandler: ErrorRequestHandler = (error, req, res, _next) => {
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
