const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

async function main() {
  const prisma = new PrismaClient();
  try {
    // Users
    const adminPassword = await bcrypt.hash('admin123', 10);
    const testPassword = await bcrypt.hash('password123', 10);

    const admin = await prisma.user.upsert({
      where: { email: 'admin@beven.com' },
      update: {},
      create: {
        email: 'admin@beven.com',
        password: adminPassword,
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
        password: testPassword,
        name: 'Test User',
        role: 'user',
        isActive: true
      }
    });

    // Clean existing budgets for test user to avoid duplicates across runs
    await prisma.transaction.deleteMany({ where: { userId: testUser.id } });
    const testUserBudgets = await prisma.budget.findMany({ where: { userId: testUser.id } });
    const budgetIds = testUserBudgets.map(b => b.id);
    await prisma.category.deleteMany({ where: { budgetId: { in: budgetIds } } });
    await prisma.budget.deleteMany({ where: { userId: testUser.id } });

    // Budget for test user
    const budget = await prisma.budget.create({
      data: {
        userId: testUser.id,
        name: 'Personal',
        amount: 2000,
        period: 'monthly',
        startDate: new Date('2025-11-01')
      }
    });

    // Categories
    const movies = await prisma.category.create({
      data: {
        budgetId: budget.id,
        name: 'Movies',
        allocatedAmount: 100,
        spentAmount: 0
      }
    });

    const groceries = await prisma.category.create({
      data: {
        budgetId: budget.id,
        name: 'Groceries',
        allocatedAmount: 500,
        spentAmount: 0
      }
    });

    // Example transaction
    await prisma.transaction.create({
      data: {
        budgetId: budget.id,
        categoryId: movies.id,
        userId: testUser.id,
        amount: 14.99,
        description: 'Dune 2',
        date: new Date().toISOString(),
        type: 'expense'
      }
    });

    console.log('Seed completed:', { admin: admin.email, testUser: testUser.email, budget: budget.name, categories: [movies.name, groceries.name] });
  } catch (e) {
    console.error('Seed failed:', e);
    process.exit(1);
  } finally {
    await new PrismaClient().$disconnect();
  }
}

main();


