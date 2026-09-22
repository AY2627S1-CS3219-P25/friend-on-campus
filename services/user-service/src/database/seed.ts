/**
 * AI Assistance Disclosure:
 * Tool: Google Antigravity Agent, date: 2026-09-20
 * Scope: Implemented database seeding for initial Admin and Student accounts for Milestone D2.
 * Author review: (to be completed by author after review)
 */
// AI-generated (edited by yanhwee)
/**
 * AI Assistance Disclosure:
 * Tool: Codex (model: GPT-5.6 Terra), date: 2026-09-22
 * Scope: Updated development seed accounts for the author-approved Prisma user model and scrypt password format.
 * Author review: <to be completed by ngkhengyang>
 */
// AI-generated (edited by ngkhengyang)
import { hashPassword } from '../auth/password';
import { prisma } from './client';

interface SeedUser {
  username: string;
  email: string;
  role: 'STUDENT' | 'ADMIN';
}

const seedUsers: SeedUser[] = [
  { username: 'alice', email: 'alice@u.nus.edu', role: 'STUDENT' },
  { username: 'bob', email: 'bob@u.nus.edu', role: 'STUDENT' },
  { username: 'admin', email: 'admin@nus.edu.sg', role: 'ADMIN' },
];

async function main() {
  const passwordHash = await hashPassword('Password123!');

  for (const user of seedUsers) {
    const existing = await prisma.user.findFirst({ where: { email: user.email } });
    if (existing) {
      await prisma.user.update({
        where: { id: existing.id },
        data: { username: user.username, role: user.role, passwordHash },
      });
      continue;
    }

    await prisma.user.create({ data: { ...user, passwordHash } });
  }
}

main()
  .catch((error: unknown) => {
    console.error('[user-seed] Error seeding development users:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
