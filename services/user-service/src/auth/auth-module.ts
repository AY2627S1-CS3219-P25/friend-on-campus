/**
 * AI Assistance Disclosure:
 * Tool: Google Antigravity Agent, date: 2026-09-28
 * Scope: Extended AuthModule with verify(token) method to validate session tokens for NGINX auth_request subrequests and included user email claim.
 * Author review: (to be completed by author after review)
 */
// AI-generated (edited by yanhwee)
/**
 * AI Assistance Disclosure:
 * Tool: Codex (model: GPT-5.6 Terra), date: 2026-09-22
 * Scope: Implemented account registration, authentication, session lifecycle, timing-safe unknown-user login handling, and Prisma duplicate-constraint error handling.
 * Author review: <to be completed by ngkhengyang>
 */
// AI-generated (edited by ngkhengyang)
/**
 * AI Assistance Disclosure:
 * Tool: Codex (model: GPT-5.6 Terra), date: 2026-09-22
 * Scope: Implemented account creation with shared registration request and user response DTOs.
 * Author review: <to be completed by ngkhengyang>
 */
// AI-generated (edited by ngkhengyang)
/**
 * AI Assistance Disclosure:
 * Tool: Codex (model: GPT-5.6 Terra), date: 2026-09-22
 * Scope: Implemented login and session handling with shared access-token and refresh-token response DTOs.
 * Author review: <to be completed by ngkhengyang>
 */
// AI-generated (edited by ngkhengyang)
/**
 * AI Assistance Disclosure:
 * Tool: Claude Code (model: Claude Fable 5.1), date: 2026-09-23
 * Scope: Login now verifies the password against a constant dummy scrypt hash when the email is unknown, so
 * unknown-email and wrong-password attempts take comparable time; login and refresh opportunistically delete
 * idle-expired session rows.
 * Author review: <to be completed by ngkhengyang>
 */
// AI-generated (edited by ngkhengyang)
import { randomUUID } from 'node:crypto';
import type {
  AuthResponse,
  LoginUserRequest,
  RefreshTokenResponse,
  RegisterUserRequest,
  UserDTO,
} from '@campus-errand/common-dtos';
import { AuthRepository, UserRecord } from '../persistence/auth-repository';
import {
  isValidEmail,
  isValidPassword,
  isValidUsername,
  normalizeEmail,
} from '../utils/validation';
import { DUMMY_PASSWORD_HASH, hashPassword, verifyPassword } from './password';
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
 * Owns account registration and the authenticated session lifecycle.
 * Registration creates an account only; login is the sole entry point that
 * creates a session and issues tokens.
 */
export interface AuthModule {
  register(input: RegisterUserRequest): Promise<UserDTO>;
  login(input: LoginInput): Promise<AuthenticatedSessionResult>;
  refresh(refreshToken: string): Promise<TokenRefreshResult>;
  logout(refreshToken: string): Promise<void>;
  verify(token: string): Promise<AuthenticatedPrincipal | null>;
  checkUserStatus(userId: string): Promise<boolean>;
}

export type AuthErrorCode =
  | 'INVALID_INPUT'
  | 'DUPLICATE_EMAIL'
  | 'DUPLICATE_USERNAME'
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
  repository: AuthRepository;
  tokens: TokenManager;
  accessTokenLifetimeSeconds: number;
  refreshTokenIdleLifetimeSeconds: number;
  persistentRefreshTokenIdleLifetimeSeconds: number;
}

interface DuplicateUserError {
  code?: string;
  constraint?: string;
  meta?: { target?: unknown };
}

function addSeconds(date: Date, seconds: number): Date {
  return new Date(date.getTime() + seconds * 1000);
}

function validateEmail(email: unknown): string {
  if (!isValidEmail(email)) {
    throw new AuthError('INVALID_INPUT', 'A valid email address is required');
  }

  return normalizeEmail(email);
}

function validatePassword(password: unknown): string {
  if (!isValidPassword(password)) {
    throw new AuthError('INVALID_INPUT', 'Password must be between 8 and 24 characters');
  }

  return password;
}

function validateUsername(username: unknown): string {
  if (!isValidUsername(username)) {
    throw new AuthError('INVALID_INPUT', 'Username must be between 1 and 50 characters');
  }

  return username.trim();
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

function mapDuplicateUserError(error: unknown): never {
  const databaseError = error as DuplicateUserError;
  const prismaTarget = JSON.stringify(databaseError.meta?.target)?.toLowerCase() ?? '';
  const isUsernameConflict =
    databaseError.constraint === 'users_username_case_insensitive_uq' ||
    (databaseError.code === 'P2002' && prismaTarget.includes('username'));
  const isEmailConflict =
    databaseError.constraint === 'users_email_case_insensitive_uq' ||
    (databaseError.code === 'P2002' && prismaTarget.includes('email'));

  if (databaseError.code !== '23505' && databaseError.code !== 'P2002') {
    throw error;
  }

  if (isUsernameConflict) {
    throw new AuthError('DUPLICATE_USERNAME', 'Username is already in use');
  }

  if (isEmailConflict) {
    throw new AuthError('DUPLICATE_EMAIL', 'Email address is already in use');
  }

  throw error;
}

export function createAuthModule(options: AuthModuleOptions): AuthModule {
  return {
    async register(input) {
      const username = validateUsername(input?.username);
      const email = validateEmail(input?.email);
      const password = validatePassword(input?.password);
      const passwordHash = await hashPassword(password);

      try {
        const user = await options.repository.createUser({
          username,
          email,
          passwordHash,
        });

        return toUserDTO(user);
      } catch (error) {
        mapDuplicateUserError(error);
      }
    },

    async login(input) {
      const email = validateEmail(input?.email);
      const password = validatePassword(input?.password);
      const user = await options.repository.findUserByEmail(email);
      const passwordHash = user?.passwordHash ?? DUMMY_PASSWORD_HASH;
      const passwordMatches = await verifyPassword(password, passwordHash);
      if (!user || !passwordMatches) {
        throw new AuthError('INVALID_CREDENTIALS', 'Invalid email or password');
      }

      const persistent = input.keepLoggedIn === true;
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

      if (options.repository.findById) {
        const user = await options.repository.findById(principal.userId);
        if (!user || !user.status) {
          throw new AuthError('INVALID_SESSION', 'Account is deactivated or does not exist');
        }
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
      if (!options.repository.findById) {
        return true;
      }
      const user = await options.repository.findById(userId);
      return Boolean(user && user.status);
    },
  };
}
