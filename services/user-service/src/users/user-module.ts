/**
 * AI Assistance Disclosure:
 * Tool: Codex (model: GPT-5.6 Terra), date: 2026-09-22
 * Scope: Preserved duplicate-profile error handling while adapting it to Prisma constraint errors.
 * Author review: <to be completed by ngkhengyang>
 */
// AI-generated (edited by ngkhengyang)
import { hashPassword, verifyPassword } from '../auth/password';
import {
  UserRecord,
  UserRepository,
  UpdateUserRecord,
} from '../persistence/user-repository';
import {
  isValidEmail,
  isValidPassword,
  isValidUsername,
  normalizeEmail,
} from '../utils/validation';

export interface UserProfile {
  id: string;
  username: string;
  email: string;
  role: 'STUDENT' | 'ADMIN';
}

export interface UpdateOwnProfileInput {
  username?: string;
  email?: string;
}

export interface ChangePasswordInput {
  currentPassword: string;
  newPassword: string;
}

export interface UserModule {
  getOwnProfile(userId: string): Promise<UserProfile>;
  updateOwnProfile(userId: string, input: UpdateOwnProfileInput): Promise<UserProfile>;
  changePassword(userId: string, input: ChangePasswordInput): Promise<void>;
}

export type UserErrorCode =
  | 'INVALID_INPUT'
  | 'DUPLICATE_USERNAME'
  | 'DUPLICATE_EMAIL'
  | 'INVALID_CURRENT_PASSWORD'
  | 'USER_NOT_FOUND';

export class UserError extends Error {
  constructor(
    public readonly code: UserErrorCode,
    message: string,
  ) {
    super(message);
    this.name = 'UserError';
  }
}

export interface UserModuleOptions {
  repository: UserRepository;
}

interface DuplicateUserError {
  code?: string;
  constraint?: string;
  meta?: { target?: unknown };
}

function toUserProfile(user: UserRecord): UserProfile {
  return {
    id: user.id,
    username: user.username,
    email: user.email,
    role: user.role,
  };
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function validateProfileUpdate(input: unknown): UpdateUserRecord {
  if (!isObject(input)) {
    throw new UserError('INVALID_INPUT', 'A profile update is required');
  }

  const supportedFields = new Set(['username', 'email']);
  const fields = Object.keys(input);
  if (fields.length === 0 || fields.some((field) => !supportedFields.has(field))) {
    throw new UserError('INVALID_INPUT', 'Only username and email can be updated');
  }

  const update: UpdateUserRecord = {};
  if (Object.prototype.hasOwnProperty.call(input, 'username')) {
    if (!isValidUsername(input.username)) {
      throw new UserError('INVALID_INPUT', 'Username must be between 1 and 50 characters');
    }
    update.username = input.username.trim();
  }

  if (Object.prototype.hasOwnProperty.call(input, 'email')) {
    if (!isValidEmail(input.email)) {
      throw new UserError('INVALID_INPUT', 'A valid email address is required');
    }
    update.email = normalizeEmail(input.email);
  }

  return update;
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
    throw new UserError('DUPLICATE_USERNAME', 'Username is already in use');
  }

  if (isEmailConflict) {
    throw new UserError('DUPLICATE_EMAIL', 'Email address is already in use');
  }

  throw error;
}

export function createUserModule(options: UserModuleOptions): UserModule {
  return {
    async getOwnProfile(userId) {
      const user = await options.repository.findById(userId);
      if (!user) {
        throw new UserError('USER_NOT_FOUND', 'User not found');
      }

      return toUserProfile(user);
    },

    async updateOwnProfile(userId, input) {
      const update = validateProfileUpdate(input);

      try {
        const user = await options.repository.updateProfile(userId, update);
        if (!user) {
          throw new UserError('USER_NOT_FOUND', 'User not found');
        }

        return toUserProfile(user);
      } catch (error) {
        if (error instanceof UserError) {
          throw error;
        }
        mapDuplicateUserError(error);
      }
    },

    async changePassword(userId, input) {
      if (!isObject(input) || typeof input.currentPassword !== 'string') {
        throw new UserError('INVALID_INPUT', 'Current password is required');
      }
      if (!isValidPassword(input.newPassword)) {
        throw new UserError(
          'INVALID_INPUT',
          'New password must be between 8 and 24 characters',
        );
      }

      const user = await options.repository.findById(userId);
      if (!user) {
        throw new UserError('USER_NOT_FOUND', 'User not found');
      }
      if (!(await verifyPassword(input.currentPassword, user.passwordHash))) {
        throw new UserError('INVALID_CURRENT_PASSWORD', 'Current password is incorrect');
      }

      const newPasswordHash = await hashPassword(input.newPassword);
      const updated = await options.repository.updatePassword(
        userId,
        user.passwordHash,
        newPasswordHash,
      );
      if (!updated) {
        throw new UserError('INVALID_CURRENT_PASSWORD', 'Current password is incorrect');
      }
    },
  };
}
