/**
 * AI Assistance Disclosure:
 * Tool: Google Antigravity Agent, date: 2026-09-28
 * Scope: Implemented symmetric session cookie management (Path=/), GET /verify endpoint for NGINX auth_request subrequests, and response header injection (X-Auth-User-Id, X-Auth-User-Role).
 * Author review: (to be completed by author after review)
 */
// AI-generated (edited by yanhwee)
/**
 * AI Assistance Disclosure:
 * Tool: Codex (model: GPT-5.6 Terra), date: 2026-09-22
 * Scope: Implemented User Service authentication HTTP routes with typed responses and safe malformed-cookie handling.
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
import { AuthError, AuthModule } from './auth-module';

const SESSION_COOKIE_NAME = 'session';
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

function readBearerToken(authorization: string | undefined): string | undefined {
  return authorization?.match(/^Bearer\s+(\S+)$/i)?.[1];
}

function cookieOptions(secure: boolean): CookieOptions {
  return {
    httpOnly: true,
    secure,
    sameSite: 'lax',
    path: '/api/auth',
  };
}

function sessionCookieOptions(secure: boolean): CookieOptions {
  return {
    httpOnly: true,
    secure,
    sameSite: 'lax',
    path: '/',
  };
}

export function createAuthRouter(auth: AuthModule, options: AuthRouteOptions): Router {
  const router = Router();

  // NGINX auth_request verification subrequest
  router.get(
    '/verify',
    asyncRoute(async (req, res) => {
      const sessionToken =
        readCookie(req, SESSION_COOKIE_NAME) ??
        readBearerToken(req.header('authorization'));

      if (!sessionToken) {
        res.status(401).json({
          success: false,
          error: 'Authentication is required',
          code: 'MISSING_TOKEN',
        });
        return;
      }

      const principal = auth.verify(sessionToken);
      if (!principal) {
        res.status(401).json({
          success: false,
          error: 'Invalid or expired session',
          code: 'INVALID_SESSION',
        });
        return;
      }

      const isActive = await auth.checkUserStatus(principal.userId);
      if (!isActive) {
        res.status(401).json({
          success: false,
          error: 'User account is deactivated or deleted',
          code: 'INVALID_SESSION',
        });
        return;
      }

      res.setHeader('X-Auth-User-Id', principal.userId);
      res.setHeader('X-Auth-User-Role', principal.role);
      res.setHeader('X-Auth-Session-Id', principal.sessionId);
      if (principal.email) {
        res.setHeader('X-Auth-User-Email', principal.email);
      }
      res.status(200).send();
    }),
  );

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

      // Set single symmetric session cookie for NGINX gateway and browser
      res.cookie(SESSION_COOKIE_NAME, result.accessToken, {
        ...sessionCookieOptions(options.secureCookies),
        maxAge: result.accessTokenExpiresInSeconds * 1000,
      });

      // Clear legacy refresh cookie if present
      res.clearCookie(REFRESH_COOKIE_NAME, cookieOptions(options.secureCookies));

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
      const sessionToken =
        readCookie(req, SESSION_COOKIE_NAME) ??
        readBearerToken(req.header('authorization')) ??
        req.body?.refreshToken ??
        readCookie(req, REFRESH_COOKIE_NAME);
      const result = await auth.refresh(sessionToken);

      // Extend single session cookie
      res.cookie(SESSION_COOKIE_NAME, result.accessToken, {
        ...sessionCookieOptions(options.secureCookies),
        maxAge: result.accessTokenExpiresInSeconds * 1000,
      });

      res.clearCookie(REFRESH_COOKIE_NAME, cookieOptions(options.secureCookies));

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
      const token =
        readCookie(req, SESSION_COOKIE_NAME) ??
        readBearerToken(req.header('authorization')) ??
        readCookie(req, REFRESH_COOKIE_NAME) ??
        req.body?.refreshToken;
      if (token) {
        try {
          await auth.logout(token);
        } catch {
          // Ignore error if session already cleared
        }
      }
      res.clearCookie(SESSION_COOKIE_NAME, sessionCookieOptions(options.secureCookies));
      res.clearCookie(REFRESH_COOKIE_NAME, cookieOptions(options.secureCookies));
      res.status(204).send();
    }),
  );

  return router;
}
