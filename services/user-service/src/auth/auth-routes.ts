/**
 * AI Assistance Disclosure:
 * Tool: Google Antigravity Agent, date: 2026-09-29
 * Scope: Stateless single session cookie (session), role-based GET /verify?role= query parameter, and gateway coarse-grained RBAC.
 * Author review: (to be completed by author after review)
 */
// AI-generated (edited by yanhwee)
import { CookieOptions, NextFunction, Request, RequestHandler, Response, Router } from 'express';
import type { AuthResponse, RefreshTokenResponse } from '@campus-errand/common-dtos';
import { AuthError, AuthModule } from './auth-module';

import { UserModule } from '../users/user-module';

const SESSION_COOKIE_NAME = 'session';

export interface AuthRouteOptions {
  auth: AuthModule;
  users: UserModule;
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

function sessionCookieOptions(secure: boolean): CookieOptions {
  return {
    httpOnly: true,
    secure,
    sameSite: 'lax',
    path: '/',
  };
}

export function createAuthRouter(options: AuthRouteOptions): Router {
  const { auth, users } = options;
  const router = Router();

  // NGINX auth_request verification subrequest
  router.get(
    '/verify',
    asyncRoute(async (req, res) => {
      const requiredRole =
        typeof req.query.role === 'string'
          ? req.query.role.toUpperCase()
          : undefined;

      const sessionToken =
        readCookie(req, SESSION_COOKIE_NAME) ?? req.body?.refreshToken;

      if (!sessionToken) {
        res.status(401).json({
          success: false,
          error: 'Authentication is required',
          code: 'MISSING_TOKEN',
        });
        return;
      }

      const principal = await auth.verify(sessionToken);
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

      if (requiredRole && principal.role !== requiredRole) {
        res.status(403).json({
          success: false,
          error:
            requiredRole === 'ADMIN'
              ? 'Administrator access required'
              : 'Unauthorized role',
          code: requiredRole === 'ADMIN' ? 'ADMIN_REQUIRED' : 'FORBIDDEN',
        });
        return;
      }

      res.setHeader('X-Auth-User-Id', principal.userId);
      res.setHeader('X-Auth-User-Role', principal.role);
      res.status(200).send();
    }),
  );

  router.post(
    '/register',
    asyncRoute(async (req, res) => {
      const user = await users.register(req.body);
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

      const cookieOpts = {
        ...sessionCookieOptions(options.secureCookies),
        maxAge: result.accessTokenExpiresInSeconds * 1000,
      };

      res.cookie(SESSION_COOKIE_NAME, result.accessToken, cookieOpts);

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
        readCookie(req, SESSION_COOKIE_NAME) ?? req.body?.refreshToken;
      const result = await auth.refresh(sessionToken);

      const cookieOpts = {
        ...sessionCookieOptions(options.secureCookies),
        maxAge: result.accessTokenExpiresInSeconds * 1000,
      };

      res.cookie(SESSION_COOKIE_NAME, result.accessToken, cookieOpts);

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
        readCookie(req, SESSION_COOKIE_NAME) ?? req.body?.refreshToken;

      if (token) {
        try {
          await auth.logout(token);
        } catch {
          // Ignore error if session already cleared
        }
      }

      res.clearCookie(SESSION_COOKIE_NAME, sessionCookieOptions(options.secureCookies));
      res.status(204).send();
    }),
  );

  return router;
}
