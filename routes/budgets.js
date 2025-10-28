const budgetProcedures = require('../db/budgets');
const { authenticateToken } = require('../middleware/auth');
const { cacheMiddleware, invalidateUserCache } = require('../middleware/cache');

// Budget routes
async function budgetRoutes(fastify, options) {
  // GET /budgets - Get all budgets for user
  fastify.get('/budgets', {
    preHandler: [authenticateToken, cacheMiddleware({ endpoint: 'budgets', ttl: 300 })]
  }, async (request, reply) => {
    try {
      const budgets = await budgetProcedures.getAll(request.user.id);
      return { success: true, data: budgets };
    } catch (error) {
      fastify.log.error(error);
      reply.code(500);
      return { success: false, error: 'Failed to fetch budgets' };
    }
  });

  // GET /budgets/:id - Get specific budget
  fastify.get('/budgets/:id', {
    preHandler: [authenticateToken, cacheMiddleware({ endpoint: 'budget', ttl: 300 })]
  }, async (request, reply) => {
    try {
      const { id } = request.params;
      const budget = await budgetProcedures.getById(id, request.user.id);
      
      if (!budget) {
        reply.code(404);
        return { success: false, error: 'Budget not found' };
      }
      
      return { success: true, data: budget };
    } catch (error) {
      fastify.log.error(error);
      reply.code(500);
      return { success: false, error: 'Failed to fetch budget' };
    }
  });

  // POST /budgets - Create new budget
  fastify.post('/budgets', {
    preHandler: [authenticateToken]
  }, async (request, reply) => {
    try {
      const { name, amount, period, startDate, endDate } = request.body;
      
      // Basic validation
      if (!name || !amount || !period || !startDate) {
        reply.code(400);
        return { success: false, error: 'Name, amount, period, and startDate are required' };
      }

      const budget = await budgetProcedures.create({
        userId: request.user.id,
        name,
        amount,
        period,
        startDate,
        endDate
      });
      
      // Invalidate user's budget cache
      invalidateUserCache(request.user.id, 'budgets');
      
      reply.code(201);
      return { success: true, data: budget, message: 'Budget created successfully' };
    } catch (error) {
      fastify.log.error(error);
      reply.code(500);
      return { success: false, error: 'Failed to create budget' };
    }
  });

  // PUT /budgets/:id - Update budget
  fastify.put('/budgets/:id', {
    preHandler: [authenticateToken]
  }, async (request, reply) => {
    try {
      const { id } = request.params;
      const { name, amount, period, startDate, endDate } = request.body;
      
      // Basic validation
      if (!name || !amount || !period || !startDate) {
        reply.code(400);
        return { success: false, error: 'Name, amount, period, and startDate are required' };
      }

      const budget = await budgetProcedures.update(id, request.user.id, {
        name,
        amount,
        period,
        startDate,
        endDate
      });
      
      // Invalidate user's budget cache
      invalidateUserCache(request.user.id, 'budgets');
      invalidateUserCache(request.user.id, 'budget');
      
      return { success: true, data: budget, message: 'Budget updated successfully' };
    } catch (error) {
      fastify.log.error(error);
      
      if (error.code === 'P2025') {
        reply.code(404);
        return { success: false, error: 'Budget not found' };
      }
      
      reply.code(500);
      return { success: false, error: 'Failed to update budget' };
    }
  });

  // DELETE /budgets/:id - Delete budget
  fastify.delete('/budgets/:id', {
    preHandler: [authenticateToken]
  }, async (request, reply) => {
    try {
      const { id } = request.params;
      await budgetProcedures.delete(id, request.user.id);
      
      // Invalidate user's budget cache
      invalidateUserCache(request.user.id, 'budgets');
      invalidateUserCache(request.user.id, 'budget');
      
      return { success: true, message: 'Budget deleted successfully' };
    } catch (error) {
      fastify.log.error(error);
      
      if (error.code === 'P2025') {
        reply.code(404);
        return { success: false, error: 'Budget not found' };
      }
      
      reply.code(500);
      return { success: false, error: 'Failed to delete budget' };
    }
  });

  // GET /budgets/:id/summary - Get budget summary
  fastify.get('/budgets/:id/summary', {
    preHandler: [authenticateToken, cacheMiddleware({ endpoint: 'budget-summary', ttl: 180 })]
  }, async (request, reply) => {
    try {
      const { id } = request.params;
      const summary = await budgetProcedures.getSummary(id, request.user.id);
      
      if (!summary) {
        reply.code(404);
        return { success: false, error: 'Budget not found' };
      }
      
      return { success: true, data: summary };
    } catch (error) {
      fastify.log.error(error);
      reply.code(500);
      return { success: false, error: 'Failed to get budget summary' };
    }
  });
}

module.exports = budgetRoutes;
