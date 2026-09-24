/**
 * AI Assistance Disclosure:
 * Tool: Codex (model: GPT-5.6 Terra), date: 2026-09-23
 * Scope: Implemented structured HTTP request logging with correlation IDs and response timing.
 * Author review: <to be completed by ngkhengyang>
 */
import { randomUUID } from 'node:crypto';
import { RequestHandler } from 'express';
import { logHttpResponse } from '../utils/logger';

/**
 * Logs one completion record for every HTTP request. Only safe metadata is
 * recorded; query parameters, headers, cookies, and bodies are excluded.
 */
export const requestLogger: RequestHandler = (req, res, next) => {
  const requestId = randomUUID();
  const startedAt = Date.now();

  res.locals.requestId = requestId;
  res.setHeader('X-Request-Id', requestId);

  res.once('finish', () => {
    logHttpResponse({
      path: req.path,
      statusCode: res.statusCode,
      durationMilliseconds: Date.now() - startedAt,
      errorMessage:
        typeof res.locals.serverErrorMessage === 'string'
          ? res.locals.serverErrorMessage
          : undefined,
    });
  });

  next();
};
