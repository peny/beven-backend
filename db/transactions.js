const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

// Transaction stored procedures
const transactionProcedures = {
  // Get all transactions for user (with filters)
  async getAll(userId, filters = {}) {
    const where = {
      userId: parseInt(userId)
    };

    if (filters.budgetId) {
      where.budgetId = parseInt(filters.budgetId);
    }

    if (filters.categoryId) {
      where.categoryId = parseInt(filters.categoryId);
    }

    if (filters.dateFrom || filters.dateTo) {
      where.date = {};
      if (filters.dateFrom) {
        where.date.gte = new Date(filters.dateFrom);
      }
      if (filters.dateTo) {
        where.date.lte = new Date(filters.dateTo);
      }
    }

    if (filters.type) {
      where.type = filters.type;
    }

    return await prisma.transaction.findMany({
      where,
      include: {
        budget: true,
        category: true
      },
      orderBy: { date: 'desc' }
    });
  },

  // Get transactions for specific budget
  async getByBudgetId(budgetId, userId) {
    return await prisma.transaction.findMany({
      where: {
        budgetId: parseInt(budgetId),
        userId: parseInt(userId)
      },
      include: {
        budget: true,
        category: true
      },
      orderBy: { date: 'desc' }
    });
  },

  // Get specific transaction (with ownership check)
  async getById(id, userId) {
    return await prisma.transaction.findFirst({
      where: {
        id: parseInt(id),
        userId: parseInt(userId)
      },
      include: {
        budget: true,
        category: true
      }
    });
  },

  // Create transaction (and update category spent amount)
  async create(transactionData) {
    const transaction = await prisma.transaction.create({
      data: {
        budgetId: parseInt(transactionData.budgetId),
        categoryId: parseInt(transactionData.categoryId),
        userId: parseInt(transactionData.userId),
        amount: parseFloat(transactionData.amount),
        description: transactionData.description,
        date: transactionData.date ? new Date(transactionData.date) : new Date(),
        type: transactionData.type || 'expense'
      },
      include: {
        budget: true,
        category: true
      }
    });

    // Update category spent amount
    await this.updateCategorySpentAmount(transaction.categoryId);

    return transaction;
  },

  // Update transaction (and adjust category spent amount)
  async update(id, userId, transactionData) {
    const oldTransaction = await this.getById(id, userId);
    if (!oldTransaction) return null;

    const transaction = await prisma.transaction.update({
      where: {
        id: parseInt(id),
        userId: parseInt(userId)
      },
      data: {
        amount: parseFloat(transactionData.amount),
        description: transactionData.description,
        date: transactionData.date ? new Date(transactionData.date) : oldTransaction.date,
        type: transactionData.type || oldTransaction.type
      },
      include: {
        budget: true,
        category: true
      }
    });

    // Update category spent amount
    await this.updateCategorySpentAmount(transaction.categoryId);

    return transaction;
  },

  // Delete transaction (and adjust category spent amount)
  async delete(id, userId) {
    const transaction = await this.getById(id, userId);
    if (!transaction) return null;

    const categoryId = transaction.categoryId;

    await prisma.transaction.delete({
      where: {
        id: parseInt(id),
        userId: parseInt(userId)
      }
    });

    // Update category spent amount
    await this.updateCategorySpentAmount(categoryId);

    return { success: true };
  },

  // Update category spent amount based on transactions
  async updateCategorySpentAmount(categoryId) {
    const transactions = await prisma.transaction.findMany({
      where: { categoryId: parseInt(categoryId) }
    });

    const spentAmount = transactions.reduce((sum, tx) => {
      return sum + (tx.type === 'expense' ? parseFloat(tx.amount) : -parseFloat(tx.amount));
    }, 0);

    return await prisma.category.update({
      where: { id: parseInt(categoryId) },
      data: { spentAmount: spentAmount }
    });
  },

  // Get transaction summary for a budget
  async getBudgetSummary(budgetId, userId) {
    const transactions = await this.getByBudgetId(budgetId, userId);
    
    const summary = transactions.reduce((acc, tx) => {
      const amount = parseFloat(tx.amount);
      if (tx.type === 'expense') {
        acc.totalExpenses += amount;
        acc.expenseCount++;
      } else {
        acc.totalIncome += amount;
        acc.incomeCount++;
      }
      return acc;
    }, {
      totalExpenses: 0,
      totalIncome: 0,
      expenseCount: 0,
      incomeCount: 0,
      netAmount: 0
    });

    summary.netAmount = summary.totalIncome - summary.totalExpenses;

    return summary;
  }
};

module.exports = transactionProcedures;
