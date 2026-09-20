/**
 * AI Assistance Disclosure:
 * Tool: Google Antigravity Agent, date: 2026-09-20
 * Scope: Implemented database seeding for initial Admin and Student accounts for Milestone D2 demonstration.
 * Author review: (to be completed by author after review)
 */
// AI-generated (edited by yanhwee)

import bcrypt from 'bcryptjs';
import { prisma } from './client';

async function main() {
  console.log('[user-seed] Seeding initial users...');

  const adminPasswordHash = await bcrypt.hash('AdminPassword123!', 10);
  const studentPasswordHash = await bcrypt.hash('Password123!', 10);

  const initialUsers = [
    {
      nusEmail: 'admin@nus.edu.sg',
      passwordHash: adminPasswordHash,
      fullName: 'NUS Campus Admin',
      matricNumber: 'STAFF001',
      phoneNumber: '+65 6516 0000',
      telegramHandle: '@nus_admin',
      role: 'ADMIN',
    },
    {
      nusEmail: 'alice@u.nus.edu',
      passwordHash: studentPasswordHash,
      fullName: 'Alice Tan',
      matricNumber: 'A0212345X',
      phoneNumber: '+65 9123 4567',
      telegramHandle: '@alice_nus',
      role: 'STUDENT',
    },
    {
      nusEmail: 'bob@u.nus.edu',
      passwordHash: studentPasswordHash,
      fullName: 'Bob Lim',
      matricNumber: 'A0223456Y',
      phoneNumber: '+65 9234 5678',
      telegramHandle: '@bob_courier',
      role: 'STUDENT',
    },
  ];

  for (const u of initialUsers) {
    const existing = await prisma.user.findUnique({
      where: { nusEmail: u.nusEmail },
    });

    if (existing) {
      await prisma.user.update({
        where: { nusEmail: u.nusEmail },
        data: {
          fullName: u.fullName,
          role: u.role,
          passwordHash: u.passwordHash,
          phoneNumber: u.phoneNumber,
          telegramHandle: u.telegramHandle,
        },
      });
      console.log(`[user-seed] Updated existing user: ${u.nusEmail} (${u.role})`);
    } else {
      await prisma.user.create({
        data: u,
      });
      console.log(`[user-seed] Created initial user: ${u.nusEmail} (${u.role})`);
    }
  }

  console.log('[user-seed] Completed user seeding.');
}

main()
  .catch((e) => {
    console.error('[user-seed] Error seeding users:', e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
