/**
 * AI Assistance Disclosure:
 * Tool: Claude Code (model: Claude Fable 5.1), date: 2026-11-09
 * Scope: PostgreSQL implementation of the leased realtime outbox (issue #239) shared by the Chat and Notification services: claim with FOR UPDATE SKIP LOCKED,...
 * Author review: I validated correctness, edited for style, and verified with automated tests.
 */
import type { OutboxRow, OutboxStore } from './realtime';

/** The two raw-query methods every generated Prisma client exposes; no Prisma import, so one implementation serves both services. */
export interface RawSqlClient {
  $queryRawUnsafe<T = unknown>(query: string, ...values: unknown[]): Promise<T>;
  $executeRawUnsafe(query: string, ...values: unknown[]): Promise<number>;
}

const TABLE = /^[a-z_][a-z0-9_]*$/;

interface Row {
  id: string;
  event_id: string;
  kind: string;
  payload: Record<string, unknown>;
  attempts: number;
}

/**
 * Leases are plain columns, so the row lock is held only for the claim statement itself and never across the
 * network publish. Completion and release both require the caller to still be the lease owner.
 */
export function createSqlOutboxStore(client: RawSqlClient, table: string): OutboxStore {
  if (!TABLE.test(table)) throw new Error(`Invalid outbox table name "${table}"`);
  const t = `"${table}"`;
  return {
    async claim(owner, leaseMs, limit) {
      const rows = await client.$queryRawUnsafe<Row[]>(
        `UPDATE ${t} SET lease_owner = $1, lease_expires_at = now() + ($2::int * interval '1 millisecond')
         WHERE id IN (
           SELECT id FROM ${t}
           WHERE available_at <= now() AND (lease_owner IS NULL OR lease_expires_at <= now())
           ORDER BY created_at, id
           LIMIT $3
           FOR UPDATE SKIP LOCKED)
         RETURNING id, event_id, kind, payload, attempts`,
        owner, leaseMs, limit,
      );
      return rows.map((row): OutboxRow => ({ id: row.id, eventId: row.event_id, kind: row.kind, payload: row.payload, attempts: row.attempts }));
    },
    async complete(id, owner) {
      const deleted = await client.$executeRawUnsafe(`DELETE FROM ${t} WHERE id = $1::uuid AND lease_owner = $2`, id, owner);
      return deleted === 1;
    },
    async release(id, owner, delayMs) {
      const updated = await client.$executeRawUnsafe(
        `UPDATE ${t} SET lease_owner = NULL, lease_expires_at = NULL, attempts = attempts + 1,
           available_at = now() + ($3::int * interval '1 millisecond')
         WHERE id = $1::uuid AND lease_owner = $2`,
        id, owner, delayMs,
      );
      return updated === 1;
    },
  };
}
