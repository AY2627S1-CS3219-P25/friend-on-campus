import { Database } from './database';

export type UserRole = 'STUDENT' | 'ADMIN';

export interface UserRecord {
  id: string;
  username: string;
  email: string;
  passwordHash: string;
  role: UserRole;
}

export interface SessionUserRecord {
  sessionId: string;
  user: UserRecord;
  persistent: boolean;
  idleExpiresAt: Date;
}

export interface CreateUserRecord {
  username: string;
  email: string;
  passwordHash: string;
}

export interface CreateSessionRecord {
  userId: string;
  refreshTokenHash: string;
  persistent: boolean;
  idleExpiresAt: Date;
}

export interface AuthRepository {
  createUser(input: CreateUserRecord): Promise<UserRecord>;
  findUserByEmail(email: string): Promise<UserRecord | null>;
  createSession(input: CreateSessionRecord): Promise<SessionUserRecord>;
  rotateSession(
    currentTokenHash: string,
    nextTokenHash: string,
    standardIdleExpiresAt: Date,
    persistentIdleExpiresAt: Date,
  ): Promise<SessionUserRecord | null>;
  revokeSession(refreshTokenHash: string): Promise<void>;
}

interface UserRow {
  id: string;
  username: string;
  email: string;
  password_hash: string;
  role: UserRole;
}

interface SessionUserRow extends UserRow {
  session_id: string;
  persistent: boolean;
  idle_expires_at: Date;
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

function toSessionUserRecord(row: SessionUserRow): SessionUserRecord {
  return {
    sessionId: row.session_id,
    user: toUserRecord(row),
    persistent: row.persistent,
    idleExpiresAt: row.idle_expires_at,
  };
}

export function createAuthRepository(database: Database): AuthRepository {
  return {
    async createUser(input) {
      const result = await database.pool.query<UserRow>(
        `
          INSERT INTO users (username, email, password_hash, role)
          VALUES ($1, $2, $3, 'STUDENT')
          RETURNING id, username, email, password_hash, role
        `,
        [input.username, input.email, input.passwordHash],
      );

      return toUserRecord(result.rows[0]);
    },

    async findUserByEmail(email) {
      const result = await database.pool.query<UserRow>(
        `
          SELECT id, username, email, password_hash, role
          FROM users
          WHERE LOWER(email) = LOWER($1)
          LIMIT 1
        `,
        [email],
      );

      return result.rows[0] ? toUserRecord(result.rows[0]) : null;
    },

    async createSession(input) {
      const result = await database.pool.query<SessionUserRow>(
        `
          WITH inserted_session AS (
            INSERT INTO sessions (
              user_id,
              refresh_token_hash,
              persistent,
              idle_expires_at
            )
            VALUES ($1, $2, $3, $4)
            RETURNING id, user_id, persistent, idle_expires_at
          )
          SELECT
            inserted_session.id AS session_id,
            inserted_session.persistent,
            inserted_session.idle_expires_at,
            u.id,
            u.username,
            u.email,
            u.password_hash,
            u.role
          FROM inserted_session
          JOIN users u ON u.id = inserted_session.user_id
        `,
        [input.userId, input.refreshTokenHash, input.persistent, input.idleExpiresAt],
      );

      return toSessionUserRecord(result.rows[0]);
    },

    async rotateSession(
      currentTokenHash,
      nextTokenHash,
      standardIdleExpiresAt,
      persistentIdleExpiresAt,
    ) {
      const result = await database.pool.query<SessionUserRow>(
        `
          WITH rotated_session AS (
            UPDATE sessions
            SET
              refresh_token_hash = $2,
              last_used_at = NOW(),
              idle_expires_at = CASE
                WHEN persistent THEN $4::timestamptz
                ELSE $3::timestamptz
              END
            WHERE refresh_token_hash = $1
              AND idle_expires_at > NOW()
            RETURNING id, user_id, persistent, idle_expires_at
          )
          SELECT
            rotated_session.id AS session_id,
            rotated_session.persistent,
            rotated_session.idle_expires_at,
            u.id,
            u.username,
            u.email,
            u.password_hash,
            u.role
          FROM rotated_session
          JOIN users u ON u.id = rotated_session.user_id
        `,
        [
          currentTokenHash,
          nextTokenHash,
          standardIdleExpiresAt,
          persistentIdleExpiresAt,
        ],
      );

      return result.rows[0] ? toSessionUserRecord(result.rows[0]) : null;
    },

    async revokeSession(refreshTokenHash) {
      await database.pool.query(
        'DELETE FROM sessions WHERE refresh_token_hash = $1',
        [refreshTokenHash],
      );
    },
  };
}
