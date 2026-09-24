/**
 * AI Assistance Disclosure:
 * Tool: Codex (model: GPT-5.6 Terra), date: 2026-09-22
 * Scope: Typed login and refresh JSON responses with the shared session DTOs.
 * Author review: <to be completed by ngkhengyang>
 */
// AI-generated (edited by ngkhengyang)
/**
 * AI Assistance Disclosure:
 * Tool: Claude Code (model: Claude Fable 5.1), date: 2026-09-23
 * Scope: A malformed (non-URI-encoded) refresh cookie is now treated as absent (401 INVALID_SESSION) instead of
 * throwing URIError into the 500 handler.
 * Author review: <to be completed by ngkhengyang>
 */
// AI-generated (edited by ngkhengyang)
import { CookieOptions, NextFunction, Request, RequestHandler, Response, Router } from 'express';
import type { AuthResponse, RefreshTokenResponse } from '@campus-errand/common-dtos';
import { AuthModule } from './auth-module';

const REFRESH_COOKIE_NAME = 'refresh_token';

export interface AuthRouteOptions {
  secureCookies: boolean;
}

function asyncRoute(
  handler: (req: Request, res: Response) => Promise<void>,
): RequestHandler {
  return (req: Request, res: Response, next: NextFunction) => {
    handler(req, res).catch(next);
  };
}

function readCookie(req: Request, name: string): string | undefined {
  const cookieHeader = req.headers.cookie;
  if (!cookieHeader) {
    return undefined;
  }

  for (const cookie of cookieHeader.split(';')) {
    const separatorIndex = cookie.indexOf('=');
    if (separatorIndex === -1) {
      continue;
    }

    const cookieName = cookie.slice(0, separatorIndex).trim();
    if (cookieName === name) {
      try {
        return decodeURIComponent(cookie.slice(separatorIndex + 1).trim());
      } catch {
        return undefined;
      }
    }
  }

  return undefined;
}

function cookieOptions(secure: boolean): CookieOptions {
  return {
    httpOnly: true,
    secure,
    sameSite: 'lax',
    path: '/api/auth',
  };
}

function setRefreshCookie(
  res: Response,
  refreshToken: string,
  refreshTokenExpiresAt: Date,
  secure: boolean,
) {
  res.cookie(REFRESH_COOKIE_NAME, refreshToken, {
    ...cookieOptions(secure),
    expires: refreshTokenExpiresAt,
  });
}

export function createAuthRouter(auth: AuthModule, options: AuthRouteOptions): Router {
  const router = Router();

  router.post(
    '/register',
    asyncRoute(async (req, res) => {
      const user = await auth.register(req.body);
      res.status(201).json({
        success: true,
        data: {
          user,
        },
      });
    }),
  );

  router.post(
    '/login',
    asyncRoute(async (req, res) => {
      const result = await auth.login({
        email: req.body?.email,
        password: req.body?.password,
        keepLoggedIn: req.body?.keepLoggedIn === true,
      });
      setRefreshCookie(
        res,
        result.refreshToken,
        result.refreshTokenExpiresAt,
        options.secureCookies,
      );
      const response: AuthResponse = {
        accessToken: result.accessToken,
        accessTokenExpiresInSeconds: result.accessTokenExpiresInSeconds,
        user: result.user,
      };
      res.json({
        success: true,
        data: response,
      });
    }),
  );

  router.post(
    '/refresh',
    asyncRoute(async (req, res) => {
      const refreshToken = readCookie(req, REFRESH_COOKIE_NAME) ?? req.body?.refreshToken;
      const result = await auth.refresh(refreshToken);
      setRefreshCookie(
        res,
        result.refreshToken,
        result.refreshTokenExpiresAt,
        options.secureCookies,
      );
      const response: RefreshTokenResponse = {
        accessToken: result.accessToken,
        accessTokenExpiresInSeconds: result.accessTokenExpiresInSeconds,
      };
      res.json({
        success: true,
        data: response,
      });
    }),
  );

  router.post(
    '/logout',
    asyncRoute(async (req, res) => {
      const refreshToken = readCookie(req, REFRESH_COOKIE_NAME) ?? req.body?.refreshToken;
      await auth.logout(refreshToken);
      res.clearCookie(REFRESH_COOKIE_NAME, cookieOptions(options.secureCookies));
      res.status(204).send();
    }),
  );

  return router;
}
