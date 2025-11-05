const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

async function seedWithDemoData() {
  const prisma = new PrismaClient();
  try {
    const adminPasswordHash = await bcrypt.hash('admin123', 10);
    const testPasswordHash = await bcrypt.hash('password123', 10);

    const admin = await prisma.user.upsert({
      where: { email: 'admin@beven.com' },
      update: {},
      create: {
        email: 'admin@beven.com',
        password: adminPasswordHash,
        name: 'Admin User',
        role: 'admin',
        isActive: true
      }
    });

    const testUser = await prisma.user.upsert({
      where: { email: 'test@example.com' },
      update: {},
      create: {
        email: 'test@example.com',
        password: testPasswordHash,
        name: 'Test User',
        role: 'user',
        isActive: true
      }
    });

    await prisma.transaction.deleteMany({ where: { userId: testUser.id } });
    const existingBudgets = await prisma.budget.findMany({ where: { userId: testUser.id } });
    const existingBudgetIds = existingBudgets.map(b => b.id);
    if (existingBudgetIds.length) {
      await prisma.category.deleteMany({ where: { budgetId: { in: existingBudgetIds } } });
      await prisma.budget.deleteMany({ where: { id: { in: existingBudgetIds } } });
    }

    const personalBudget = await prisma.budget.create({
      data: {
        userId: testUser.id,
        name: 'Personal',
        amount: 2000,
        period: 'monthly',
        startDate: new Date('2025-11-01')
      }
    });

    const sharedBudget = await prisma.budget.create({
      data: {
        userId: testUser.id,
        name: 'Shared Household',
        amount: 3500,
        period: 'monthly',
        startDate: new Date('2025-11-01')
      }
    });

    const categoriesPersonal = await prisma.$transaction([
      prisma.category.create({ data: { budgetId: personalBudget.id, name: 'Movies', allocatedAmount: 100, spentAmount: 0 } }),
      prisma.category.create({ data: { budgetId: personalBudget.id, name: 'Groceries', allocatedAmount: 500, spentAmount: 0 } }),
      prisma.category.create({ data: { budgetId: personalBudget.id, name: 'Video Games', allocatedAmount: 75, spentAmount: 0 } })
    ]);

    const categoriesShared = await prisma.$transaction([
      prisma.category.create({ data: { budgetId: sharedBudget.id, name: 'Rent', allocatedAmount: 2200, spentAmount: 0 } }),
      prisma.category.create({ data: { budgetId: sharedBudget.id, name: 'Utilities', allocatedAmount: 250, spentAmount: 0 } }),
      prisma.category.create({ data: { budgetId: sharedBudget.id, name: 'Groceries', allocatedAmount: 600, spentAmount: 0 } })
    ]);

    await prisma.$transaction([
      prisma.transaction.create({
        data: {
          budgetId: personalBudget.id,
          categoryId: categoriesPersonal[0].id,
          userId: testUser.id,
          amount: 14.99,
          description: 'Dune 2',
          date: new Date().toISOString(),
          type: 'expense'
        }
      }),
      prisma.transaction.create({
        data: {
          budgetId: personalBudget.id,
          categoryId: categoriesPersonal[2].id,
          userId: testUser.id,
          amount: 59.99,
          description: 'Baldur\'s Gate 3',
          date: new Date().toISOString(),
          type: 'expense'
        }
      }),
      prisma.transaction.create({
        data: {
          budgetId: sharedBudget.id,
          categoryId: categoriesShared[1].id,
          userId: testUser.id,
          amount: 89.5,
          description: 'Electricity bill',
          date: new Date().toISOString(),
          type: 'expense'
        }
      })
    ]);

    console.log('Demo data seeded', {
      users: [admin.email, testUser.email],
      budgets: [personalBudget.name, sharedBudget.name],
      personalCategories: categoriesPersonal.map(c => c.name),
      sharedCategories: categoriesShared.map(c => c.name)
    });
  } finally {
    await new PrismaClient().$disconnect();
  }
}

seedWithDemoData();


