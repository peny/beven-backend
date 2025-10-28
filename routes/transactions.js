const transactionProcedures = require('../db/transactions');
const { authenticateToken } = require('../middleware/auth');

// Transaction routes
async function transactionRoutes(fastify, options) {
  // GET /transactions - Get all transactions (with filters)
  fastify.get('/transactions', {
    preHandler: [authenticateToken]
  }, async (request, reply) => {
    try {
      const filters = request.query;
      const transactions = await transactionProcedures.getAll(request.user.id, filters);
      return { success: true, data: transactions };
    } catch (error) {
      fastify.log.error(error);
      reply.code(500);
      return { success: false, error: 'Failed to fetch transactions' };
    }
  });

  // GET /budgets/:id/transactions - Get transactions for budget
  fastify.get('/budgets/:id/transactions', {
    preHandler: [authenticateToken]
  }, async (request, reply) => {
    try {
      const { id } = request.params;
      const transactions = await transactionProcedures.getByBudgetId(id, request.user.id);
      return { success: true, data: transactions };
    } catch (error) {
      fastify.log.error(error);
      reply.code(500);
      return { success: false, error: 'Failed to fetch transactions' };
    }
  });

  // GET /transactions/:id - Get specific transaction
  fastify.get('/transactions/:id', {
    preHandler: [authenticateToken]
  }, async (request, reply) => {
    try {
      const { id } = request.params;
      const transaction = await transactionProcedures.getById(id, request.user.id);
      
      if (!transaction) {
        reply.code(404);
        return { success: false, error: 'Transaction not found' };
      }
      
      return { success: true, data: transaction };
    } catch (error) {
      fastify.log.error(error);
      reply.code(500);
      return { success: false, error: 'Failed to fetch transaction' };
    }
  });

  // POST /transactions - Create transaction
  fastify.post('/transactions', {
    preHandler: [authenticateToken]
  }, async (request, reply) => {
    try {
      const { budgetId, categoryId, amount, description, date, type } = request.body;
      
      // Basic validation
      if (!budgetId || !categoryId || !amount) {
        reply.code(400);
        return { success: false, error: 'BudgetId, categoryId, and amount are required' };
      }

      const transaction = await transactionProcedures.create({
        budgetId,
        categoryId,
        userId: request.user.id,
        amount,
        description,
        date,
        type: type || 'expense'
      });
      
      reply.code(201);
      return { success: true, data: transaction, message: 'Transaction created successfully' };
    } catch (error) {
      fastify.log.error(error);
      reply.code(500);
      return { success: false, error: 'Failed to create transaction' };
    }
  });

  // PUT /transactions/:id - Update transaction
  fastify.put('/transactions/:id', {
    preHandler: [authenticateToken]
  }, async (request, reply) => {
    try {
      const { id } = request.params;
      const { amount, description, date, type } = request.body;
      
      // Basic validation
      if (!amount) {
        reply.code(400);
        return { success: false, error: 'Amount is required' };
      }

      const transaction = await transactionProcedures.update(id, request.user.id, {
        amount,
        description,
        date,
        type
      });
      
      return { success: true, data: transaction, message: 'Transaction updated successfully' };
    } catch (error) {
      fastify.log.error(error);
      
      if (error.code === 'P2025') {
        reply.code(404);
        return { success: false, error: 'Transaction not found' };
      }
      
      reply.code(500);
      return { success: false, error: 'Failed to update transaction' };
    }
  });

  // DELETE /transactions/:id - Delete transaction
  fastify.delete('/transactions/:id', {
    preHandler: [authenticateToken]
  }, async (request, reply) => {
    try {
      const { id } = request.params;
      const result = await transactionProcedures.delete(id, request.user.id);
      
      if (!result) {
        reply.code(404);
        return { success: false, error: 'Transaction not found' };
      }
      
      return { success: true, message: 'Transaction deleted successfully' };
    } catch (error) {
      fastify.log.error(error);
      
      if (error.code === 'P2025') {
        reply.code(404);
        return { success: false, error: 'Transaction not found' };
      }
      
      reply.code(500);
      return { success: false, error: 'Failed to delete transaction' };
    }
  });

}

module.exports = transactionRoutes;
