/**
 * AI Assistance Disclosure:
 * Tool: Claude Code (model: Claude Fable 5.1), date: 2026-10-20
 * Scope: Unit-test helpers: an in-memory ConversationStore with the same contract as the Prisma one, a principal
 * factory, fixed ids, and (copied from notification-service/test/helpers.ts) an Ed25519 token signer in the format
 * @campus-errand/auth verifies, a WebSocket test client that records frames and the close code, a polling wait, and a
 * throwaway PostgreSQL schema with the service's migrations applied.
 * Author review: <to be completed by Reallyeasy1>
 *
 * Tool: Claude Code (model: Claude Fable 5.1), date: 2026-10-25
 * Scope: Review fixes (PR #148 P1, P2): the in-memory store mirrors the Prisma one's courierSince replay guard and the
 * participant/closure recheck in append (shared checkAppend), with the new return shapes.
 * Author review: <to be completed by Reallyeasy1>
 */
// AI-generated (edited by Reallyeasy1)
import { generateKeyPairSync, randomUUID, sign } from 'node:crypto';
import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';
import { WebSocket } from 'ws';
import type { AuthenticatedPrincipal } from '@campus-errand/auth';
import { PrismaClient } from '../src/database/client';
import { checkAppend, type ConversationRow, type ConversationStore, type MessageRow } from '../src/conversations/store';

export const ISSUER = 'chat-test-issuer';
export const AUDIENCE = 'chat-test-audience';
export const ORDER = '30000000-0000-4000-8000-000000000001';
export const ALICE = '20000000-0000-4000-8000-000000000001';
export const BOB = '20000000-0000-4000-8000-000000000002';
export const CAROL = '20000000-0000-4000-8000-000000000003';
export const ADMIN = '20000000-0000-4000-8000-000000000009';

export function principal(userId: string, overrides: Partial<AuthenticatedPrincipal> = {}): AuthenticatedPrincipal {
  return { userId, sessionId: randomUUID(), role: 'STUDENT', username: `user-${userId.slice(-1)}`, ...overrides } as AuthenticatedPrincipal;
}

export function makeKeys() {
  const { privateKey, publicKey } = generateKeyPairSync('ed25519');
  return { privateKey, publicKey: publicKey.export({ format: 'der', type: 'spki' }).toString('base64url') };
}

/** A token as User Service issues it; lifetimeSeconds may be negative for an already expired one. */
export function signToken(
  privateKey: ReturnType<typeof makeKeys>['privateKey'],
  userId: string,
  claims: Record<string, unknown> = {},
  lifetimeSeconds = 900,
) {
  const now = Math.floor(Date.now() / 1000);
  const part = (value: unknown) => Buffer.from(JSON.stringify(value)).toString('base64url');
  const unsigned = `${part({ alg: 'EdDSA', typ: 'JWT' })}.${part({
    sub: userId, sid: randomUUID(), role: 'STUDENT', username: `user-${userId.slice(-1)}`,
    iat: now, exp: now + lifetimeSeconds, iss: ISSUER, aud: AUDIENCE, ...claims,
  })}`;
  return `${unsigned}.${sign(null, Buffer.from(unsigned), privateKey).toString('base64url')}`;
}

export async function until<T>(check: () => T | Promise<T>, label: string, timeoutMs = 10_000): Promise<NonNullable<T>> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const value = await check();
    if (value) return value as NonNullable<T>;
    await delay(20);
  }
  throw new Error(`Timed out: ${label}`);
}

/** Connects and records every JSON frame and the close code. */
export async function openSocket(url: string) {
  const ws = new WebSocket(url);
  const frames: any[] = [];
  let closeCode: number | undefined;
  ws.on('message', (data) => frames.push(JSON.parse(data.toString())));
  ws.on('close', (code) => { closeCode = code; });
  await new Promise<void>((resolve, reject) => { ws.once('open', resolve); ws.once('error', reject); });
  return {
    ws,
    frames,
    send: (frame: unknown) => ws.send(typeof frame === 'string' ? frame : JSON.stringify(frame)),
    frame: (type: string, nth = 1) => until(() => frames.filter((f) => f.type === type).at(nth - 1), `${type} frame #${nth}`),
    closed: (timeoutMs?: number) => until(() => closeCode, 'socket close', timeoutMs),
    isOpen: () => ws.readyState === WebSocket.OPEN,
  };
}

export function memoryStore() {
  const conversations = new Map<string, ConversationRow>();
  const messages: MessageRow[] = [];
  const setOnce = (orderId: string, field: 'pickedUpAt' | 'deliveredAt' | 'closedAt', at: string) => {
    const row = conversations.get(orderId);
    if (!row || row[field]) return false;
    row[field] = at;
    return true;
  };
  const store: ConversationStore = {
    async findByOrderId(orderId) { return conversations.get(orderId) ?? null; },
    async upsertAccepted(c) {
      const existing = conversations.get(c.orderId);
      if (existing) {
        // Same rule as the Prisma store: only an accept newer than courierSince moves the courier (P1).
        if (!(new Date(c.createdAt) > new Date(existing.courierSince))) return { conversation: existing, outcome: 'ignored' };
        existing.courierId = c.courierId;
        existing.courierSince = c.createdAt;
        return { conversation: existing, outcome: 'recouriered' };
      }
      const row: ConversationRow = {
        id: randomUUID(), orderId: c.orderId, requesterId: c.requesterId, courierId: c.courierId, courierSince: c.createdAt,
        createdAt: c.createdAt, pickedUpAt: null, deliveredAt: null, closedAt: c.closedAt ?? null,
      };
      conversations.set(c.orderId, row);
      return { conversation: row, outcome: 'created' };
    },
    async markPickedUp(orderId, at) { return setOnce(orderId, 'pickedUpAt', at); },
    async markDelivered(orderId, at) { return setOnce(orderId, 'deliveredAt', at); },
    async close(orderId, at) { return setOnce(orderId, 'closedAt', at); },
    async append(m) {
      // Same recheck as the Prisma store's locked read (P2), against the row as it is now.
      const row = [...conversations.values()].find((c) => c.id === m.conversationId) ?? null;
      const check = checkAppend(row, m.senderId);
      if (check.kind !== 'ok') return check;
      const sequence = messages.filter((x) => x.conversationId === m.conversationId).length + 1;
      const message: MessageRow = { id: randomUUID(), sequence, ...m };
      messages.push(message);
      return { kind: 'appended', message, recipientIds: check.recipientIds };
    },
    async listMessages(conversationId, { afterSequence, limit }) {
      return messages.filter((m) => m.conversationId === conversationId && m.sequence > afterSequence).slice(0, limit);
    },
    async ping() { return true; },
  };
  return { store, conversations, messages };
}

/** A PrismaClient on its own schema with the migrations applied; drop() removes the schema. */
export async function makeTestDatabase(databaseUrl: string) {
  const schema = `chat_test_${randomUUID().replaceAll('-', '')}`;
  const url = new URL(databaseUrl);
  url.searchParams.set('schema', schema);
  const db = new PrismaClient({ datasources: { db: { url: url.toString() } } });
  await db.$executeRawUnsafe(`CREATE SCHEMA "${schema}"`);
  const migrations = path.resolve(__dirname, '../prisma/migrations');
  const dirs = (await readdir(migrations, { withFileTypes: true })).filter((entry) => entry.isDirectory());
  for (const dir of dirs.sort((a, b) => a.name.localeCompare(b.name))) {
    const sql = await readFile(path.join(migrations, dir.name, 'migration.sql'), 'utf8');
    for (const statement of sql.split(';').filter((part) => part.trim())) await db.$executeRawUnsafe(statement);
  }
  return {
    db,
    async drop() {
      try {
        await db.$executeRawUnsafe(`DROP SCHEMA IF EXISTS "${schema}" CASCADE`);
      } finally {
        await db.$disconnect();
      }
    },
  };
}
