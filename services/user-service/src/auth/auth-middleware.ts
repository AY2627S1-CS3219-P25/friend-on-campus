import { NextFunction, Request, RequestHandler, Response } from 'express';
import { SessionRepository } from '../persistence/session-repository';
import { AuthError } from './auth-module';
import { AccessTokenClaims, TokenManager } from './tokens';

export interface AuthenticationMiddlewareOptions {
  tokens: TokenManager;
  sessions: SessionRepository;
}

function readBearerToken(req: Request): string | undefined {
  const authorization = req.header('authorization');
  const match = authorization?.match(/^Bearer\s+(\S+)$/i);
  return match?.[1];
}

export function createAuthenticationMiddleware(
  options: AuthenticationMiddlewareOptions,
): RequestHandler {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const accessToken = readBearerToken(req);
      if (!accessToken) {
        throw new AuthError('INVALID_SESSION', 'Authentication is required');
      }

      let claims: AccessTokenClaims;
      try {
        claims = options.tokens.verifyAccessToken(accessToken);
      } catch {
        throw new AuthError('INVALID_SESSION', 'Invalid or expired session');
      }

      const active = await options.sessions.isActiveSession(
        claims.sessionId,
        claims.userId,
      );
      if (!active) {
        throw new AuthError('INVALID_SESSION', 'Invalid or expired session');
      }

      res.locals.authenticatedUser = claims;
      next();
    } catch (error) {
      next(error);
    }
  };
}
