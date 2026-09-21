import { Database } from './database';

export interface SessionRepository {
  isActiveSession(sessionId: string, userId: string): Promise<boolean>;
}

export function createSessionRepository(database: Database): SessionRepository {
  return {
    async isActiveSession(sessionId, userId) {
      const result = await database.pool.query(
        `
          SELECT 1
          FROM sessions
          WHERE id = $1
            AND user_id = $2
            AND idle_expires_at > NOW()
          LIMIT 1
        `,
        [sessionId, userId],
      );

      return result.rowCount === 1;
    },
  };
}
