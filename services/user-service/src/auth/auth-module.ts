/**
 * AI Assistance Disclosure:
 * Tool: Google Antigravity Agent, date: 2026-09-29
 * Scope: Streamlined AuthModule to focus exclusively on session authentication (login, refresh, logout, verify, status check).
 * Author review: (to be completed by author after review)
 */
// AI-generated (edited by yanhwee)
import type {
  AuthResponse,
  LoginUserRequest,
  RefreshTokenResponse,
  UserDTO,
} from '@campus-errand/common-dtos';
import { UserRecord, UserRepository } from '../persistence/user-repository';
import { DUMMY_PASSWORD_HASH, verifyPassword } from './password';
import { AuthenticatedPrincipal, TokenManager } from './tokens';

export type LoginInput = LoginUserRequest;

export interface AuthenticatedSessionResult extends AuthResponse {
  refreshToken: string;
  refreshTokenExpiresAt: Date;
}

export interface TokenRefreshResult extends RefreshTokenResponse {
  refreshToken: string;
  refreshTokenExpiresAt: Date;
}

/**
 * Owns session authentication and the JWT session cookie lifecycle:
 * login, session verification, refresh, and logout.
 */
export interface AuthModule {
  login(input: LoginInput): Promise<AuthenticatedSessionResult>;
  refresh(refreshToken: string): Promise<TokenRefreshResult>;
  logout(refreshToken: string): Promise<void>;
  verify(token: string): Promise<AuthenticatedPrincipal | null>;
  checkUserStatus(userId: string): Promise<boolean>;
}

export type AuthErrorCode =
  | 'INVALID_INPUT'
  | 'INVALID_CREDENTIALS'
  | 'INVALID_SESSION';

export class AuthError extends Error {
  constructor(
    public readonly code: AuthErrorCode,
    message: string,
  ) {
    super(message);
    this.name = 'AuthError';
  }
}

export interface AuthModuleOptions {
  repository: UserRepository;
  tokens: TokenManager;
  accessTokenLifetimeSeconds: number;
  persistentRefreshTokenIdleLifetimeSeconds: number;
}

function addSeconds(date: Date, seconds: number): Date {
  return new Date(date.getTime() + seconds * 1000);
}

function toUserDTO(user: UserRecord): UserDTO {
  return {
    userId: user.id,
    username: user.username,
    email: user.email,
    userRole: user.role,
    status: user.status,
  };
}

export function createAuthModule(options: AuthModuleOptions): AuthModule {
  return {
    async login(input) {
      if (!input || typeof input.email !== 'string' || typeof input.password !== 'string') {
        throw new AuthError('INVALID_INPUT', 'Email and password are required');
      }

      const user = await options.repository.findByEmail(input.email);
      const passwordHash = user?.passwordHash ?? DUMMY_PASSWORD_HASH;
      const isPasswordValid = await verifyPassword(input.password, passwordHash);

      if (!user || !isPasswordValid) {
        throw new AuthError('INVALID_CREDENTIALS', 'Invalid email address or password');
      }

      if (!user.status) {
        throw new AuthError('INVALID_SESSION', 'Account is deactivated');
      }

      const persistent = Boolean(input.keepLoggedIn);
      const sessionLifetimeSeconds = persistent
        ? options.persistentRefreshTokenIdleLifetimeSeconds
        : options.accessTokenLifetimeSeconds;
      const sessionExpiresAt = addSeconds(new Date(), sessionLifetimeSeconds);
      const sessionToken = await options.tokens.issueAccessToken(
        user.id,
        user.role,
        sessionLifetimeSeconds,
        persistent,
      );

      return {
        accessToken: sessionToken,
        accessTokenExpiresInSeconds: sessionLifetimeSeconds,
        refreshToken: sessionToken,
        refreshTokenExpiresAt: sessionExpiresAt,
        user: toUserDTO(user),
      };
    },

    async refresh(token) {
      if (typeof token !== 'string' || token.length === 0) {
        throw new AuthError('INVALID_SESSION', 'Invalid or expired session');
      }

      const principal = await options.tokens.verifyToken(token);
      if (!principal) {
        throw new AuthError('INVALID_SESSION', 'Invalid or expired session');
      }

      const user = await options.repository.findById(principal.userId);
      if (!user || !user.status) {
        throw new AuthError('INVALID_SESSION', 'Account is deactivated or does not exist');
      }

      const isPersistent = Boolean(principal.persistent);
      const sessionLifetimeSeconds = isPersistent
        ? options.persistentRefreshTokenIdleLifetimeSeconds
        : options.accessTokenLifetimeSeconds;
      const sessionExpiresAt = addSeconds(new Date(), sessionLifetimeSeconds);
      const nextSessionToken = await options.tokens.issueAccessToken(
        principal.userId,
        principal.role,
        sessionLifetimeSeconds,
        isPersistent,
      );

      return {
        accessToken: nextSessionToken,
        accessTokenExpiresInSeconds: sessionLifetimeSeconds,
        refreshToken: nextSessionToken,
        refreshTokenExpiresAt: sessionExpiresAt,
      };
    },

    async logout(_token) {
      // Stateless single session cookie: client clears cookie
    },

    verify(token) {
      return options.tokens.verifyToken(token);
    },

    async checkUserStatus(userId: string): Promise<boolean> {
      const user = await options.repository.findById(userId);
      return Boolean(user && user.status);
    },
  };
}
