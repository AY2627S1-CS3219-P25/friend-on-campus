import { Pool, PoolClient } from 'pg';
import { logError } from '../utils/logger';

export interface Database {
  pool: Pool;
  isReady(): Promise<boolean>;
  withTransaction<T>(work: (client: PoolClient) => Promise<T>): Promise<T>;
  close(): Promise<void>;
}

export function createDatabase(connectionString: string): Database {
  const pool = new Pool({ connectionString });

  pool.on('error', (error) => {
    logError('database_pool_error', error);
  });

  return {
    pool,

    async isReady() {
      try {
        await pool.query(`
          SELECT
            u.id,
            u.username,
            u.email,
            u.password_hash,
            u.role,
            s.id,
            s.refresh_token_hash,
            s.persistent,
            s.idle_expires_at
          FROM users u
          LEFT JOIN sessions s ON FALSE
          LIMIT 0
        `);
        return true;
      } catch (error) {
        logError('database_readiness_check_failed', error);
        return false;
      }
    },

    async withTransaction<T>(work: (client: PoolClient) => Promise<T>) {
      const client = await pool.connect();

      try {
        await client.query('BEGIN');
        const result = await work(client);
        await client.query('COMMIT');
        return result;
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      } finally {
        client.release();
      }
    },

    async close() {
      await pool.end();
    },
  };
}
