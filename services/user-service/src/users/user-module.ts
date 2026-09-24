/**
 * AI Assistance Disclosure:
 * Tool: Codex (model: GPT-5.6 Terra), date: 2026-09-22
 * Scope: Implemented User Service profile business logic, deferred administration errors, and Prisma duplicate-constraint error handling.
 * Author review: <to be completed by ngkhengyang>
 */
// AI-generated (edited by ngkhengyang)
/**
 * AI Assistance Disclosure:
 * Tool: Codex (model: GPT-5.6 Terra), date: 2026-09-22
 * Scope: Implemented username-only profile updates and shared user and password DTO handling.
 * Author review: <to be completed by ngkhengyang>
 */
// AI-generated (edited by ngkhengyang)
import type {
  ChangePasswordRequest,
  UpdateUserProfileRequest,
  UserDTO,
} from '@campus-errand/common-dtos';
import { hashPassword, verifyPassword } from '../auth/password';
import {
  UserRecord,
  UserRepository,
  UpdateUserRecord,
} from '../persistence/user-repository';
import { isValidPassword, isValidUsername } from '../utils/validation';

export interface UserModule {
  getOwnProfile(userId: string): Promise<UserDTO>;
  updateOwnProfile(userId: string, input: UpdateUserProfileRequest): Promise<UserDTO>;
  changePassword(userId: string, input: ChangePasswordRequest): Promise<void>;
}

export type UserErrorCode =
  | 'INVALID_INPUT'
  | 'DUPLICATE_USERNAME'
  | 'INVALID_CURRENT_PASSWORD'
  | 'USER_NOT_FOUND'
  | 'NOT_IMPLEMENTED';

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

function toUserDTO(user: UserRecord): UserDTO {
  return {
    userId: user.id,
    username: user.username,
    email: user.email,
    userRole: user.role,
  };
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function validateProfileUpdate(input: unknown): UpdateUserRecord {
  if (!isObject(input)) {
    throw new UserError('INVALID_INPUT', 'A profile update is required');
  }

  const fields = Object.keys(input);
  if (fields.length !== 1 || fields[0] !== 'username') {
    throw new UserError('INVALID_INPUT', 'Only username can be updated');
  }

  if (!isValidUsername(input.username)) {
    throw new UserError('INVALID_INPUT', 'Username must be between 1 and 50 characters');
  }

  return { username: input.username.trim() };
}

function mapDuplicateUserError(error: unknown): never {
  const databaseError = error as DuplicateUserError;
  const prismaTarget = JSON.stringify(databaseError.meta?.target)?.toLowerCase() ?? '';
  const isUsernameConflict =
    databaseError.constraint === 'users_username_case_insensitive_uq' ||
    (databaseError.code === 'P2002' && prismaTarget.includes('username'));
  if (databaseError.code !== '23505' && databaseError.code !== 'P2002') {
    throw error;
  }

  if (isUsernameConflict) {
    throw new UserError('DUPLICATE_USERNAME', 'Username is already in use');
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

      return toUserDTO(user);
    },

    async updateOwnProfile(userId, input) {
      const update = validateProfileUpdate(input);

      try {
        const user = await options.repository.updateProfile(userId, update);
        if (!user) {
          throw new UserError('USER_NOT_FOUND', 'User not found');
        }

        return toUserDTO(user);
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
