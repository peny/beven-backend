const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

// Category stored procedures
const categoryProcedures = {
  // Get categories for budget (with ownership check)
  async getByBudgetId(budgetId, userId) {
    return await prisma.category.findMany({
      where: {
        budget: {
          id: parseInt(budgetId),
          userId: parseInt(userId)
        }
      },
      include: {
        transactions: {
          orderBy: { createdAt: 'desc' }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
  },

  // Get specific category (with ownership check)
  async getById(id, userId) {
    return await prisma.category.findFirst({
      where: {
        id: parseInt(id),
        budget: {
          userId: parseInt(userId)
        }
      },
      include: {
        budget: true,
        transactions: {
          orderBy: { createdAt: 'desc' }
        }
      }
    });
  },

  // Create category
  async create(categoryData) {
    return await prisma.category.create({
      data: {
        budgetId: parseInt(categoryData.budgetId),
        name: categoryData.name,
        allocatedAmount: parseFloat(categoryData.allocatedAmount)
      },
      include: {
        budget: true,
        transactions: true
      }
    });
  },

  // Update category
  async update(id, userId, categoryData) {
    return await prisma.category.update({
      where: {
        id: parseInt(id),
        budget: {
          userId: parseInt(userId)
        }
      },
      data: {
        name: categoryData.name,
        allocatedAmount: parseFloat(categoryData.allocatedAmount)
      },
      include: {
        budget: true,
        transactions: true
      }
    });
  },

  // Delete category
  async delete(id, userId) {
    return await prisma.category.delete({
      where: {
        id: parseInt(id),
        budget: {
          userId: parseInt(userId)
        }
      }
    });
  },

  // Update spent amount (called when transactions are created/updated/deleted)
  async updateSpentAmount(id, amount) {
    return await prisma.category.update({
      where: { id: parseInt(id) },
      data: { spentAmount: parseFloat(amount) }
    });
  },

  // Recalculate spent amount from transactions
  async recalculateSpentAmount(id) {
    const category = await prisma.category.findUnique({
      where: { id: parseInt(id) },
      include: { transactions: true }
    });

    if (!category) return null;

    const spentAmount = category.transactions.reduce((sum, tx) => {
      return sum + (tx.type === 'expense' ? parseFloat(tx.amount) : -parseFloat(tx.amount));
    }, 0);

    return await prisma.category.update({
      where: { id: parseInt(id) },
      data: { spentAmount: spentAmount }
    });
  }
};

module.exports = categoryProcedures;
