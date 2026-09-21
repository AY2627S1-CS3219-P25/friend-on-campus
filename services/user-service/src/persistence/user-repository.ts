import { Database } from './database';

export type UserRole = 'STUDENT' | 'ADMIN';

export interface UserRecord {
  id: string;
  username: string;
  email: string;
  passwordHash: string;
  role: UserRole;
}

export interface UpdateUserRecord {
  username?: string;
  email?: string;
}

export interface UserRepository {
  findById(userId: string): Promise<UserRecord | null>;
  updateProfile(userId: string, input: UpdateUserRecord): Promise<UserRecord | null>;
  updatePassword(
    userId: string,
    currentPasswordHash: string,
    newPasswordHash: string,
  ): Promise<boolean>;
}

interface UserRow {
  id: string;
  username: string;
  email: string;
  password_hash: string;
  role: UserRole;
}

function toUserRecord(row: UserRow): UserRecord {
  return {
    id: row.id,
    username: row.username,
    email: row.email,
    passwordHash: row.password_hash,
    role: row.role,
  };
}

export function createUserRepository(database: Database): UserRepository {
  return {
    async findById(userId) {
      const result = await database.pool.query<UserRow>(
        `
          SELECT id, username, email, password_hash, role
          FROM users
          WHERE id = $1
          LIMIT 1
        `,
        [userId],
      );

      return result.rows[0] ? toUserRecord(result.rows[0]) : null;
    },

    async updateProfile(userId, input) {
      const result = await database.pool.query<UserRow>(
        `
          UPDATE users
          SET
            username = COALESCE($2, username),
            email = COALESCE($3, email),
            updated_at = NOW()
          WHERE id = $1
          RETURNING id, username, email, password_hash, role
        `,
        [userId, input.username ?? null, input.email ?? null],
      );

      return result.rows[0] ? toUserRecord(result.rows[0]) : null;
    },

    async updatePassword(userId, currentPasswordHash, newPasswordHash) {
      const result = await database.pool.query(
        `
          UPDATE users
          SET password_hash = $2, updated_at = NOW()
          WHERE id = $1 AND password_hash = $3
        `,
        [userId, newPasswordHash, currentPasswordHash],
      );

      return result.rowCount === 1;
    },
  };
}
