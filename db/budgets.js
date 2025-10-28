const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

// Budget stored procedures
const budgetProcedures = {
  // Get all budgets for user
  async getAll(userId) {
    return await prisma.budget.findMany({
      where: { userId: parseInt(userId) },
      include: {
        categories: true,
        transactions: {
          take: 5, // Limit recent transactions
          orderBy: { createdAt: 'desc' }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
  },

  // Get specific budget (with ownership check)
  async getById(id, userId) {
    return await prisma.budget.findFirst({
      where: { 
        id: parseInt(id),
        userId: parseInt(userId)
      },
      include: {
        categories: true,
        transactions: {
          orderBy: { createdAt: 'desc' }
        }
      }
    });
  },

  // Create new budget
  async create(budgetData) {
    return await prisma.budget.create({
      data: {
        userId: parseInt(budgetData.userId),
        name: budgetData.name,
        amount: parseFloat(budgetData.amount),
        period: budgetData.period,
        startDate: new Date(budgetData.startDate),
        endDate: budgetData.endDate ? new Date(budgetData.endDate) : null
      },
      include: {
        categories: true,
        transactions: true
      }
    });
  },

  // Update budget
  async update(id, userId, budgetData) {
    return await prisma.budget.update({
      where: { 
        id: parseInt(id),
        userId: parseInt(userId)
      },
      data: {
        name: budgetData.name,
        amount: parseFloat(budgetData.amount),
        period: budgetData.period,
        startDate: new Date(budgetData.startDate),
        endDate: budgetData.endDate ? new Date(budgetData.endDate) : null
      },
      include: {
        categories: true,
        transactions: true
      }
    });
  },

  // Delete budget
  async delete(id, userId) {
    return await prisma.budget.delete({
      where: { 
        id: parseInt(id),
        userId: parseInt(userId)
      }
    });
  },

  // Get budget summary (total spent, remaining, etc.)
  async getSummary(id, userId) {
    const budget = await this.getById(id, userId);
    if (!budget) return null;

    const totalSpent = budget.transactions.reduce((sum, tx) => {
      return sum + (tx.type === 'expense' ? parseFloat(tx.amount) : -parseFloat(tx.amount));
    }, 0);

    const totalAllocated = budget.categories.reduce((sum, cat) => {
      return sum + parseFloat(cat.allocatedAmount);
    }, 0);

    return {
      budget,
      totalSpent,
      totalAllocated,
      remaining: parseFloat(budget.amount) - totalSpent,
      allocatedRemaining: totalAllocated - budget.categories.reduce((sum, cat) => {
        return sum + parseFloat(cat.spentAmount);
      }, 0)
    };
  }
};

module.exports = budgetProcedures;
