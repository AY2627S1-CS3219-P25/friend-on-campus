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

export interface RegisterInput {
  username: string;
  email: string;
  password: string;
}

export interface LoginInput {
  email: string;
  password: string;
  keepLoggedIn: boolean;
}

export interface AuthenticatedUser {
  userId: string;
  username: string;
  email: string;
  userRole: 'STUDENT' | 'ADMIN';
}

export interface AuthenticatedSessionResult {
  accessToken: string;
  accessTokenExpiresInSeconds: number;
  refreshToken: string;
  refreshTokenExpiresAt: Date;
  user: AuthenticatedUser;
}

export interface TokenRefreshResult {
  accessToken: string;
  accessTokenExpiresInSeconds: number;
  refreshToken: string;
  refreshTokenExpiresAt: Date;
}

/**
 * Owns account registration and the authenticated session lifecycle.
 * Registration creates an account only; login is the sole entry point that
 * creates a session and issues tokens.
 */
export interface AuthModule {
  register(input: RegisterInput): Promise<AuthenticatedUser>;
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

interface PostgresError {
  code?: string;
  constraint?: string;
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

function toAuthenticatedUser(user: UserRecord): AuthenticatedUser {
  return {
    userId: user.id,
    username: user.username,
    email: user.email,
    userRole: user.role,
  };
}

function mapDuplicateUserError(error: unknown): never {
  const postgresError = error as PostgresError;
  if (postgresError.code !== '23505') {
    throw error;
  }

  if (postgresError.constraint === 'users_username_case_insensitive_uq') {
    throw new AuthError('DUPLICATE_USERNAME', 'Username is already in use');
  }

  if (postgresError.constraint === 'users_email_case_insensitive_uq') {
    throw new AuthError('DUPLICATE_EMAIL', 'Email address is already in use');
  }

  throw error;
}

export function createAuthModule(options: AuthModuleOptions): AuthModule {
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

        return toAuthenticatedUser(user);
      } catch (error) {
        mapDuplicateUserError(error);
      }
    },

    async login(input) {
      const email = validateEmail(input?.email);
      const password = validatePassword(input?.password);
      const user = await options.repository.findUserByEmail(email);

      if (!user || !(await verifyPassword(password, user.passwordHash))) {
        throw new AuthError('INVALID_CREDENTIALS', 'Invalid email or password');
      }

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
        user: toAuthenticatedUser(session.user),
      };
    },

    async refresh(refreshToken) {
      if (typeof refreshToken !== 'string' || refreshToken.length === 0) {
        throw new AuthError('INVALID_SESSION', 'Invalid or expired session');
      }

      const nextRefreshToken = options.tokens.generateRefreshToken();
      const now = new Date();
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
