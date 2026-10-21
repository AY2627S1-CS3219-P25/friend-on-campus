/**
 * AI Assistance Disclosure:
 * Tool: Google Antigravity Agent, date: 2026-10-22
 * Scope: Added offline deterministic seed UUID fallback when User Service is unreachable during host-based CLI database seeding, and idempotent sample order escrow reservation seeding when SEED_SAMPLE_ORDERS=true.
 * Author review: <to be completed by yanhwee>
 *
 * Tool: Codex (model: GPT-5.6 Sol), date: 2026-10-11
 * Scope: Preserved seed-session cleanup while removing an unsafe throw from a finally block.
 * Author review: <to be completed by ngkhengyang>
 *
 * Tool: Codex (model: GPT-6), date: 2026-10-03
 * Scope: Initialize development wallets explicitly using the existing seeded users' identities from User Service; keep wallet reads read-only.
 * Author review: <to be completed by huangjiaxi1111>
 */
// AI-generated (edited by yanhwee)
// AI-generated (edited by huangjiaxi1111)
import type { ApiResponse, AuthResponse } from '@campus-errand/common-dtos';
import { config } from '../config';
import { createCreditService, type CreditService } from '../credits/service';
import { createCreditStore } from '../credits/store';
import { prisma } from './client';

// Keep these development fixtures aligned with user-service/src/database/seed.ts.
const seedAccounts = [
  { email: 'alice@u.nus.edu', fallbackUserId: '20000000-0000-4000-8000-000000000001' },
  { email: 'bob@u.nus.edu', fallbackUserId: '20000000-0000-4000-8000-000000000002' },
  { email: 'admin@nus.edu.sg', fallbackUserId: '20000000-0000-4000-8000-000000000003' },
] as const;
const seedPassword = 'Password123!';

// Keep these development sample order reservations aligned with order-service/src/database/seed.ts.
const sampleOrderReservations = [
  { orderId: '30000000-0000-4000-8000-000000000001', accountIndex: 0, amount: 15 },
  { orderId: '30000000-0000-4000-8000-000000000002', accountIndex: 1, amount: 20 },
  { orderId: '30000000-0000-4000-8000-000000000003', accountIndex: 0, amount: 12 },
  { orderId: '30000000-0000-4000-8000-000000000004', accountIndex: 1, amount: 18 },
] as const;

async function resolveSeedUserId(
  userServiceUrl: string,
  email: string,
  fallbackUserId?: string,
): Promise<string> {
  let response: Response;
  try {
    response = await fetch(new URL('/api/auth/login', userServiceUrl), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password: seedPassword, keepLoggedIn: false }),
      redirect: 'error',
      signal: AbortSignal.timeout(10_000),
    });
  } catch (error) {
    if (fallbackUserId) {
      return fallbackUserId;
    }
    throw error;
  }
  if (!response.ok) throw new Error(`Cannot resolve seed account ${email}: login returned ${response.status}`);

  const cookie = response.headers.get('set-cookie')?.split(';')[0];
  if (!cookie?.startsWith('refresh_token=')) throw new Error('User Service did not return a seed session cookie');
  let userId: string | undefined;
  let identityError: unknown;
  try {
    const result = await response.json() as ApiResponse<AuthResponse>;
    const user = result.data?.user;
    if (!result.success || !user || typeof user.userId !== 'string' ||
        !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(user.userId) ||
        typeof user.email !== 'string' || user.email.toLowerCase() !== email) {
      throw new Error(`User Service returned an invalid identity for seed account ${email}`);
    }
    userId = user.userId.toLowerCase();
  } catch (error) {
    identityError = error;
  }

  const logout = await fetch(new URL('/api/auth/logout', userServiceUrl), {
    method: 'POST',
    headers: { Cookie: cookie },
    redirect: 'error',
    signal: AbortSignal.timeout(10_000),
  });
  if (!logout.ok) throw new Error(`Cannot close seed session for ${email}: logout returned ${logout.status}`);
  if (identityError) throw identityError;
  if (!userId) throw new Error(`User Service returned no identity for seed account ${email}`);
  return userId;
}

export async function seedCreditWallets(
  credits: Pick<CreditService, 'initializeWallet'> & Partial<Pick<CreditService, 'reserve'>>,
  userServiceUrl: string,
  options?: { allowOfflineFallback?: boolean; seedSampleOrders?: boolean },
) {
  const allowOfflineFallback = options?.allowOfflineFallback ?? false;
  const seedSampleOrders = options?.seedSampleOrders ?? false;
  if (seedSampleOrders && typeof credits.reserve !== 'function') {
    throw new Error('Sample order escrow seeding requires CreditService.reserve');
  }

  const userIds: string[] = [];
  for (const account of seedAccounts) {
    userIds.push(
      await resolveSeedUserId(
        userServiceUrl,
        account.email,
        allowOfflineFallback ? account.fallbackUserId : undefined,
      ),
    );
  }
  if (new Set(userIds).size !== seedAccounts.length) throw new Error('Seed accounts must have distinct user IDs');

  const wallets = [];
  for (const userId of userIds) {
    // Existing transactional initialization preserves balances and grants credits at most once.
    wallets.push(await credits.initializeWallet(userId));
  }
  if (seedSampleOrders && credits.reserve) {
    for (const sample of sampleOrderReservations) {
      wallets[sample.accountIndex] = await credits.reserve({
        orderId: sample.orderId,
        requesterId: userIds[sample.accountIndex],
        amount: sample.amount,
      });
    }
  }
  return wallets;
}

if (require.main === module) {
  const credits = createCreditService(createCreditStore(prisma));
  const seedSampleOrders = process.env.SEED_SAMPLE_ORDERS === 'true';
  seedCreditWallets(credits, config.seedUserServiceUrl, {
    allowOfflineFallback: true,
    seedSampleOrders,
  })
    .then(wallets => console.log(`[credit-seed] Initialized or retained ${wallets.length} development wallets${seedSampleOrders ? ' and sample order escrows' : ''}`))
    .catch((error: unknown) => {
      const detail = error instanceof Error ? error.message : 'Unknown error';
      console.error(`[credit-seed] Failed: ${detail}`);
      process.exitCode = 1;
    })
    .finally(async () => { await prisma.$disconnect(); });
}
