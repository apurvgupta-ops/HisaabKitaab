import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { SYSTEM_CATEGORIES } from '@splitwise/shared';

const prisma = new PrismaClient();

const seed = async () => {
  console.log('Seeding database...');

  for (const cat of SYSTEM_CATEGORIES) {
    const existingCategory = await prisma.category.findFirst({
      where: { name: cat.name, isSystem: true },
      select: { id: true },
    });

    if (!existingCategory) {
      await prisma.category.create({
        data: {
          name: cat.name,
          icon: cat.icon,
          color: cat.color,
          isSystem: true,
        },
      });
    }
  }
  console.log(`Seeded ${SYSTEM_CATEGORIES.length} system categories`);

  const passwordHash = await bcrypt.hash('Password123', 12);

  const demoUser = await prisma.user.upsert({
    where: { email: 'demo@splitwise.app' },
    update: {},
    create: {
      email: 'demo@splitwise.app',
      name: 'Demo User',
      passwordHash,
      preferredCurrency: 'USD',
      preferences: {
        theme: 'system',
        language: 'en',
        notifications: {
          email: true,
          push: true,
          sms: false,
          expenseAdded: true,
          settlementReceived: true,
          budgetAlert: true,
          weeklyReport: true,
        },
        defaultSplitType: 'equal',
      },
    },
  });

  const alice = await prisma.user.upsert({
    where: { email: 'alice@example.com' },
    update: {},
    create: {
      email: 'alice@example.com',
      name: 'Alice Johnson',
      passwordHash,
      preferredCurrency: 'USD',
      preferences: {},
    },
  });

  const bob = await prisma.user.upsert({
    where: { email: 'bob@example.com' },
    update: {},
    create: {
      email: 'bob@example.com',
      name: 'Bob Smith',
      passwordHash,
      preferredCurrency: 'USD',
      preferences: {},
    },
  });

  console.log('Seeded demo users:', demoUser.email, alice.email, bob.email);

  const featureFlags = [
    {
      key: 'ai_expense_copilot',
      enabled: true,
      rolloutPercent: 100,
      metadata: {
        owner: 'product',
        description: 'Natural-language expense draft generation',
      },
    },
    {
      key: 'android_sms_ingestion',
      enabled: true,
      rolloutPercent: 100,
      metadata: {
        owner: 'mobile',
        description: 'Android SMS to draft-expense automation pipeline',
      },
    },
  ];

  for (const flag of featureFlags) {
    await prisma.featureFlag.upsert({
      where: { key: flag.key },
      update: {
        enabled: flag.enabled,
        rolloutPercent: flag.rolloutPercent,
        metadata: flag.metadata,
      },
      create: {
        key: flag.key,
        enabled: flag.enabled,
        rolloutPercent: flag.rolloutPercent,
        targetUserIds: [],
        metadata: flag.metadata,
      },
    });
  }
  console.log(`Seeded ${featureFlags.length} feature flags`);

  const group = await prisma.group.create({
    data: {
      name: 'Weekend Trip',
      type: 'trip',
      currency: 'USD',
      createdBy: demoUser.id,
      settings: { simplifyDebts: true, defaultSplitType: 'equal', allowSettlements: true },
      members: {
        create: [
          { userId: demoUser.id, role: 'admin' },
          { userId: alice.id, role: 'member' },
          { userId: bob.id, role: 'member' },
        ],
      },
    },
  });

  console.log('Seeded group:', group.name);
  console.log('Seed complete!');
};

seed()
  .catch((err) => {
    console.error('Seed error:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
