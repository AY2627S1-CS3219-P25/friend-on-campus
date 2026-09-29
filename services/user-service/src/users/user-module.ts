/**
 * AI Assistance Disclosure:
 * Tool: Google Antigravity Agent, date: 2026-09-29
 * Scope: Centralized all user account lifecycle logic (registration, profile management, password updates, status toggling, role toggling, deletion) in UserModule.
 * Author review: (to be completed by author after review)
 */
// AI-generated (edited by yanhwee)
import type {
  ChangePasswordRequest,
  RegisterUserRequest,
  UpdateUserProfileRequest,
  UserDTO,
} from '@campus-errand/common-dtos';
import { hashPassword, verifyPassword } from '../auth/password';
import {
  CreateUserRecord,
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

export interface UserModule {
  register(input: RegisterUserRequest): Promise<UserDTO>;
  getOwnProfile(userId: string): Promise<UserDTO>;
  listUsers(): Promise<UserDTO[]>;
  updateOwnProfile(userId: string, input: UpdateUserProfileRequest): Promise<UserDTO>;
  changePassword(userId: string, input: ChangePasswordRequest): Promise<void>;
  toggleUserStatus(targetUserId: string): Promise<UserDTO>;
  toggleUserRole(targetUserId: string): Promise<UserDTO>;
  deleteUser(targetUserId: string): Promise<void>;
}

export type UserErrorCode =
  | 'INVALID_INPUT'
  | 'DUPLICATE_EMAIL'
  | 'DUPLICATE_USERNAME'
  | 'INVALID_CURRENT_PASSWORD'
  | 'USER_NOT_FOUND'
  | 'ADMIN_REQUIRED'
  | 'FORBIDDEN'
  | 'SELF_ACTION_FORBIDDEN';

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
    status: user.status,
  };
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function validateRegistration(input: unknown): {
  username: string;
  email: string;
  password: string;
} {
  if (!isObject(input)) {
    throw new UserError('INVALID_INPUT', 'Registration payload is required');
  }

  const { username, email, password } = input;

  if (!isValidUsername(username)) {
    throw new UserError('INVALID_INPUT', 'Username must be between 1 and 50 characters');
  }

  if (typeof email !== 'string' || !isValidEmail(email)) {
    throw new UserError('INVALID_INPUT', 'A valid email address is required');
  }

  const normalizedEmail = normalizeEmail(email);

  if (!isValidPassword(password)) {
    throw new UserError(
      'INVALID_INPUT',
      'Password must be between 8 and 24 characters',
    );
  }

  return {
    username: (username as string).trim(),
    email: normalizedEmail,
    password: password as string,
  };
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
  const isEmailConflict =
    databaseError.constraint === 'users_email_case_insensitive_uq' ||
    (databaseError.code === 'P2002' && prismaTarget.includes('email'));
  const isUsernameConflict =
    databaseError.constraint === 'users_username_case_insensitive_uq' ||
    (databaseError.code === 'P2002' && prismaTarget.includes('username'));

  if (databaseError.code !== '23505' && databaseError.code !== 'P2002') {
    throw error;
  }

  if (isEmailConflict) {
    throw new UserError('DUPLICATE_EMAIL', 'Email address is already registered');
  }
  if (isUsernameConflict) {
    throw new UserError('DUPLICATE_USERNAME', 'Username is already in use');
  }

  throw error;
}

export function createUserModule(options: UserModuleOptions): UserModule {
  return {
    async register(input) {
      const validated = validateRegistration(input);
      const passwordHash = await hashPassword(validated.password);

      const record: CreateUserRecord = {
        username: validated.username,
        email: validated.email,
        passwordHash,
        role: 'STUDENT',
      };

      try {
        const user = await options.repository.createUser(record);
        return toUserDTO(user);
      } catch (error) {
        if (error instanceof UserError) {
          throw error;
        }
        mapDuplicateUserError(error);
      }
    },

    async getOwnProfile(userId) {
      const user = await options.repository.findById(userId);
      if (!user) {
        throw new UserError('USER_NOT_FOUND', 'User not found');
      }

      return toUserDTO(user);
    },

    async listUsers() {
      const users = await options.repository.listAll();
      return users.map(toUserDTO);
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

    async toggleUserStatus(targetUserId) {
      const user = await options.repository.toggleStatus(targetUserId);
      if (!user) {
        throw new UserError('USER_NOT_FOUND', 'User not found');
      }

      return toUserDTO(user);
    },

    async toggleUserRole(targetUserId) {
      const user = await options.repository.toggleRole(targetUserId);
      if (!user) {
        throw new UserError('USER_NOT_FOUND', 'User not found');
      }

      return toUserDTO(user);
    },

    async deleteUser(targetUserId) {
      const deleted = await options.repository.deleteById(targetUserId);
      if (!deleted) {
        throw new UserError('USER_NOT_FOUND', 'User not found');
      }
    },
  };
}
