/**
 * AI Assistance Disclosure:
 * Tool: Claude Code (model: Claude Fable 5.1), date: 2026-10-05
 * Scope: Test helpers: an Ed25519 access-token signer in the format @campus-errand/auth verifies, a WebSocket test
 * client that records frames and the close code, a polling wait, and a throwaway PostgreSQL schema with the
 * service's migrations applied.
 * Author review: <to be completed by Reallyeasy1>
 */
// AI-generated (edited by Reallyeasy1)
import { generateKeyPairSync, randomUUID, sign } from 'node:crypto';
import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';
import { WebSocket } from 'ws';
import { PrismaClient } from '../src/database/generated/client';

export const ISSUER = 'notification-test-issuer';
export const AUDIENCE = 'notification-test-audience';
export const ALICE = '20000000-0000-4000-8000-000000000001';
export const BOB = '20000000-0000-4000-8000-000000000002';

export function makeKeys() {
  const { privateKey, publicKey } = generateKeyPairSync('ed25519');
  return { privateKey, publicKey: publicKey.export({ format: 'der', type: 'spki' }).toString('base64url') };
}

/** A token as User Service issues it; lifetimeSeconds may be negative for an already expired one. */
export function signToken(
  privateKey: ReturnType<typeof makeKeys>['privateKey'],
  userId: string,
  lifetimeSeconds = 900,
  claims: Record<string, unknown> = {},
) {
  const now = Math.floor(Date.now() / 1000);
  const part = (value: unknown) => Buffer.from(JSON.stringify(value)).toString('base64url');
  const unsigned = `${part({ alg: 'EdDSA', typ: 'JWT' })}.${part({
    sub: userId, sid: randomUUID(), role: 'STUDENT', iat: now, exp: now + lifetimeSeconds, iss: ISSUER, aud: AUDIENCE, ...claims,
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
    frame: (type: string) => until(() => frames.find((f) => f.type === type), `${type} frame`),
    closed: (timeoutMs?: number) => until(() => closeCode, 'socket close', timeoutMs),
    isOpen: () => ws.readyState === WebSocket.OPEN,
  };
}

/** A PrismaClient on its own schema with the migrations applied; drop() removes the schema. */
export async function makeTestDatabase(databaseUrl: string) {
  const schema = `notification_test_${randomUUID().replaceAll('-', '')}`;
  const url = new URL(databaseUrl);
  url.searchParams.set('schema', schema);
  const db = new PrismaClient({ datasources: { db: { url: url.toString() } } });
  await db.$executeRawUnsafe(`CREATE SCHEMA "${schema}"`);
  const migrations = path.resolve(__dirname, '../src/database/prisma/migrations');
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
