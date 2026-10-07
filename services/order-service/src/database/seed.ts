/**
 * AI Assistance Disclosure:
 * Tool: Google Antigravity Agent, date: 2026-10-07
 * Scope: Seed initial development errands in Order Service if the database is empty.
 * Author review: (to be completed by author after review)
 */
// AI-generated (edited by yanhwee)
import { prisma } from './client';

export async function seedOrders() {
  const existingCount = await prisma.order.count();
  if (existingCount > 0) {
    console.log(`[order-seed] Database already contains ${existingCount} orders. Skipping seed.`);
    return;
  }

  const sampleOrders = [
    {
      orderCode: 'ORD-98214',
      requesterId: '20000000-0000-4000-8000-000000000001',
      courierId: null,
      supplierId: '10000000-0000-4000-8000-000000000001',
      supplierName: 'Fine Food (UTown)',
      campusZone: 'UTown',
      itemDescription: '1x Chicken Rice (Steamed, no cucumber) + 1x Iced Lemon Tea',
      specialNotes: 'Please request extra chilli packet!',
      dropoffLocation: 'UTown Stephen Riady Centre Level 3 Bench',
      requesterContactNote: 'Wearing red hoodie, waiting near stairs',
      rewardCredits: 15,
      status: 'OPEN',
      expiresAt: new Date(Date.now() + 60 * 60 * 1000), // 1 hour from now
      createdAt: new Date(),
      version: 1,
    },
    {
      orderCode: 'ORD-54312',
      requesterId: '20000000-0000-4000-8000-000000000002',
      courierId: null,
      supplierId: '10000000-0000-4000-8000-000000000002',
      supplierName: 'The Deck (Arts Canteen)',
      campusZone: 'Arts & Social Sciences',
      itemDescription: '2x Yong Tau Foo dry with bee hoon (sweet sauce)',
      specialNotes: 'Less noodles if possible',
      dropoffLocation: 'AS6 Level 2 Foyer',
      requesterContactNote: 'Sitting at study pod',
      rewardCredits: 20,
      status: 'OPEN',
      expiresAt: new Date(Date.now() + 45 * 60 * 1000), // 45 min from now
      createdAt: new Date(),
      version: 1,
    },
  ];

  for (const order of sampleOrders) {
    await prisma.order.create({ data: order });
  }

  console.log(`[order-seed] Seeded ${sampleOrders.length} initial open orders.`);
}

if (require.main === module) {
  seedOrders()
    .then(() => {
      console.log('[order-seed] Completed successfully.');
    })
    .catch((error) => {
      console.error('[order-seed] Failed:', error);
      process.exitCode = 1;
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}
