/**
 * AI Assistance Disclosure:
 * Tool: Codex (model: GPT-5.6 Terra), date: 2026-09-22
 * Scope: Preserved duplicate-account error handling while adapting it to Prisma constraint errors.
 * Author review: <to be completed by ngkhengyang>
 */
// AI-generated (edited by ngkhengyang)
/**
 * AI Assistance Disclosure:
 * Tool: Codex (model: GPT-5.6 Terra), date: 2026-09-22
 * Scope: Adopted the shared registration request and user response DTOs for account creation.
 * Author review: <to be completed by ngkhengyang>
 */
// AI-generated (edited by ngkhengyang)
/**
 * AI Assistance Disclosure:
 * Tool: Codex (model: GPT-5.6 Terra), date: 2026-09-22
 * Scope: Adopted shared login, access-token, and refresh-token response DTOs for session handling.
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
import { randomBytes } from 'node:crypto';
import type {
  AuthResponse,
  LoginUserRequest,
  RefreshTokenResponse,
  RegisterUserRequest,
  UserDTO,
} from '@campus-errand/common-dtos';
import {
  AuthRepository,
  SessionUserRecord,
  UserRecord,
} from '../persistence/auth-repository';
import {
  isValidEmail,
  isValidPassword,
  isValidUsername,
  normalizeEmail,
} from '../utils/validation';
import { hashPassword, verifyPassword } from './password';
import { TokenManager } from './tokens';

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
  // Verified against when no account matches, so a login for an unknown email costs the same
  // scrypt work as a wrong password (no account-enumeration timing side channel).
  const dummyPasswordHash = hashPassword(randomBytes(32).toString('base64url'));

  function issueAccessToken(session: SessionUserRecord): string {
    return options.tokens.issueAccessToken(
      session.user.id,
      session.sessionId,
      session.user.role,
    );
  }

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

      const passwordMatches = await verifyPassword(
        password,
        user ? user.passwordHash : await dummyPasswordHash,
      );
      if (!user || !passwordMatches) {
        throw new AuthError('INVALID_CREDENTIALS', 'Invalid email or password');
      }

      await options.repository.deleteExpiredSessions(new Date());

      const persistent = input.keepLoggedIn === true;
      const refreshTokenIdleLifetimeSeconds = persistent
        ? options.persistentRefreshTokenIdleLifetimeSeconds
        : options.refreshTokenIdleLifetimeSeconds;
      const refreshTokenExpiresAt = addSeconds(
        new Date(),
        refreshTokenIdleLifetimeSeconds,
      );
      const refreshToken = options.tokens.generateRefreshToken();
      const session = await options.repository.createSession({
        userId: user.id,
        refreshTokenHash: options.tokens.hashRefreshToken(refreshToken),
        persistent,
        idleExpiresAt: refreshTokenExpiresAt,
      });

      return {
        accessToken: issueAccessToken(session),
        accessTokenExpiresInSeconds: options.accessTokenLifetimeSeconds,
        refreshToken,
        refreshTokenExpiresAt,
        user: toUserDTO(session.user),
      };
    },

    async refresh(refreshToken) {
      if (typeof refreshToken !== 'string' || refreshToken.length === 0) {
        throw new AuthError('INVALID_SESSION', 'Invalid or expired session');
      }

      const nextRefreshToken = options.tokens.generateRefreshToken();
      const now = new Date();
      await options.repository.deleteExpiredSessions(now);
      const standardIdleExpiresAt = addSeconds(now, options.refreshTokenIdleLifetimeSeconds);
      const persistentIdleExpiresAt = addSeconds(
        now,
        options.persistentRefreshTokenIdleLifetimeSeconds,
      );
      const session = await options.repository.rotateSession(
        options.tokens.hashRefreshToken(refreshToken),
        options.tokens.hashRefreshToken(nextRefreshToken),
        standardIdleExpiresAt,
        persistentIdleExpiresAt,
      );

      if (!session) {
        throw new AuthError('INVALID_SESSION', 'Invalid or expired session');
      }

      return {
        accessToken: issueAccessToken(session),
        accessTokenExpiresInSeconds: options.accessTokenLifetimeSeconds,
        refreshToken: nextRefreshToken,
        refreshTokenExpiresAt: session.idleExpiresAt,
      };
    },

    async logout(refreshToken) {
      if (typeof refreshToken !== 'string' || refreshToken.length === 0) {
        return;
      }

      await options.repository.revokeSession(options.tokens.hashRefreshToken(refreshToken));
    },
  };
}
