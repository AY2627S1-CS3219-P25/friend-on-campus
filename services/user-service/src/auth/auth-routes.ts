import { CookieOptions, NextFunction, Request, RequestHandler, Response, Router } from 'express';
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
      return decodeURIComponent(cookie.slice(separatorIndex + 1).trim());
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
      res.json({
        success: true,
        data: {
          accessToken: result.accessToken,
          accessTokenExpiresInSeconds: result.accessTokenExpiresInSeconds,
          user: result.user,
        },
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
      res.json({
        success: true,
        data: {
          accessToken: result.accessToken,
          accessTokenExpiresInSeconds: result.accessTokenExpiresInSeconds,
        },
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
