/**
 * AI Assistance Disclosure:
 * Tool: Codex (model: GPT-6), date: 2026-10-03
 * Scope: Initialize development wallets explicitly using the existing seeded users' identities from User Service; keep wallet reads read-only.
 * Author review: <to be completed by huangjiaxi1111>
 */
// AI-generated (edited by huangjiaxi1111)
import type { ApiResponse, AuthResponse } from '@campus-errand/common-dtos';
import { config } from '../config';
import { createCreditService, type CreditService } from '../credits/service';
import { createCreditStore } from '../credits/store';
import { prisma } from './client';

// Keep these development fixtures aligned with user-service/src/database/seed.ts.
const seedEmails = ['alice@u.nus.edu', 'bob@u.nus.edu', 'admin@nus.edu.sg'];
const seedPassword = 'Password123!';

async function resolveSeedUserId(userServiceUrl: string, email: string): Promise<string> {
  const response = await fetch(new URL('/api/auth/login', userServiceUrl), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password: seedPassword, keepLoggedIn: false }),
    redirect: 'error',
    signal: AbortSignal.timeout(10_000),
  });
  if (!response.ok) throw new Error(`Cannot resolve seed account ${email}: login returned ${response.status}`);

  const cookie = response.headers.get('set-cookie')?.split(';')[0];
  if (!cookie?.startsWith('refresh_token=')) throw new Error('User Service did not return a seed session cookie');
  try {
    const result = await response.json() as ApiResponse<AuthResponse>;
    const user = result.data?.user;
    if (!result.success || !user || typeof user.userId !== 'string' ||
        !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(user.userId) ||
        typeof user.email !== 'string' || user.email.toLowerCase() !== email) {
      throw new Error(`User Service returned an invalid identity for seed account ${email}`);
    }
    return user.userId.toLowerCase();
  } finally {
    const logout = await fetch(new URL('/api/auth/logout', userServiceUrl), {
      method: 'POST',
      headers: { Cookie: cookie },
      redirect: 'error',
      signal: AbortSignal.timeout(10_000),
    });
    if (!logout.ok) throw new Error(`Cannot close seed session for ${email}: logout returned ${logout.status}`);
  }
}

export async function seedCreditWallets(credits: Pick<CreditService, 'initializeWallet'>, userServiceUrl: string) {
  // Resolve every account before writing any wallets; never invent or hardcode UUIDs.
  const userIds: string[] = [];
  for (const email of seedEmails) userIds.push(await resolveSeedUserId(userServiceUrl, email));
  if (new Set(userIds).size !== seedEmails.length) throw new Error('Seed accounts must have distinct user IDs');

  const wallets = [];
  for (const userId of userIds) {
    // Existing transactional initialization preserves balances and grants credits at most once.
    wallets.push(await credits.initializeWallet(userId));
  }
  return wallets;
}

if (require.main === module) {
  const credits = createCreditService(createCreditStore(prisma));
  seedCreditWallets(credits, config.seedUserServiceUrl)
    .then(wallets => console.log(`[credit-seed] Initialized or retained ${wallets.length} development wallets`))
    .catch(() => {
      console.error('[credit-seed] Failed. Check User Service availability, enabled development seed accounts and deployed credit migrations.');
      process.exitCode = 1;
    })
    .finally(async () => { await prisma.$disconnect(); });
}
