/**
 * AI Assistance Disclosure:
 * Tool: Codex (model: GPT-6, GPT-5.6 Terra); Google Antigravity Agent; Claude Code (model: Claude Fable 5.1), date: 2026-09-20 to 2026-11-09
 * Scope: Implemented database seeding for initial Admin and Student accounts for Milestone D2; updated across 6 AI-assisted revisions through D4 wrap-up (seed all demo accounts with Password123!).
 * Author review: I validated correctness, edited for style, and verified with automated tests.
 */



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
