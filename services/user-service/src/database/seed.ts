/**
 * AI Assistance Disclosure:
 * Tool: Codex (model: GPT-6), date: 2026-11-09
 * Scope: Seed all demo accounts with Password123! in every environment using the existing password hasher.
 * Author review: <to be completed by the author>
 *
 * Tool: Codex (model: GPT-6), date: 2026-11-09
 * Scope: Require distinct private credentials for the production demo seed.
 * Author review: <to be completed by the author>
 *
 * Tool: Google Antigravity Agent, date: 2026-10-22
 * Scope: Assigned deterministic UUIDs to development seed accounts so offline Credit and Order Service seeds align across services.
 * Author review: I validated correctness, edited for style, and verified with automated tests.
 *
 * Tool: Google Antigravity Agent, date: 2026-09-20
 * Scope: Implemented database seeding for initial Admin and Student accounts for Milestone D2.
 * Author review: (to be completed by author after review)
 *
 * Tool: Codex (model: GPT-5.6 Terra), date: 2026-09-22
 * Scope: Implemented development seed accounts using the Prisma user model, scrypt password format, and case-insensitive email lookup.
 * Author review: <to be completed by ngkhengyang>
 *
 * Tool: Claude Code (model: Claude Fable 5.1), date: 2026-09-23
 * Scope: Existing-account look-up now matches on LOWER(email) like the service does, so the seed updates an
 * account registered with different letter-casing instead of colliding with the unique index.
 * Author review: <to be completed by ngkhengyang>
 */

// AI-generated (edited by yanhwee)

// AI-generated (edited by ngkhengyang)

// AI-generated (edited by ngkhengyang)
import { hashPassword } from '../auth/password';
import { prisma } from './client';

interface SeedUser {
  id: string;
  username: string;
  email: string;
  role: 'STUDENT' | 'ADMIN';
}

const seedUsers: SeedUser[] = [
  { id: '20000000-0000-4000-8000-000000000001', username: 'alice', email: 'alice@u.nus.edu', role: 'STUDENT' },
  { id: '20000000-0000-4000-8000-000000000002', username: 'bob', email: 'bob@u.nus.edu', role: 'STUDENT' },
  { id: '20000000-0000-4000-8000-000000000003', username: 'admin', email: 'admin@nus.edu.sg', role: 'ADMIN' },
];

async function main() {
  // AI-generated (edited by ngkhengyang)
  for (const user of seedUsers) {
    const passwordHash = await hashPassword('Password123!');
    const existingUsers = await prisma.$queryRaw<Array<{ id: string }>>`
      SELECT id
      FROM users
      WHERE LOWER(email) = LOWER(${user.email})
      LIMIT 1
    `;
    const existing = existingUsers[0];
    if (existing) {
      await prisma.user.update({
        where: { id: existing.id },
        data: { username: user.username, role: user.role, passwordHash },
      });
      continue;
    }

    await prisma.user.create({ data: { ...user, passwordHash } });
  }

  console.log(`[user-seed] Seeded ${seedUsers.length} development users.`);
}

main()
  .catch((error: unknown) => {
    console.error('[user-seed] Error seeding development users:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
