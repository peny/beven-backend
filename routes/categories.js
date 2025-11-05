const categoryProcedures = require('../db/categories');
const { authenticateToken } = require('../middleware/auth');

// Category routes
async function categoryRoutes(fastify, options) {
  // GET /budgets/:id/categories - Get categories for budget
  fastify.get('/budgets/:id/categories', {
    preHandler: [authenticateToken]
  }, async (request, reply) => {
    try {
      const { id } = request.params;
      const categories = await categoryProcedures.getByBudgetId(id, request.user.id);
      return { success: true, data: categories };
    } catch (error) {
      fastify.log.error(error);
      reply.code(500);
      return { success: false, error: 'Failed to fetch categories' };
    }
  });

  // GET /categories/:id - Get specific category
  fastify.get('/categories/:id', {
    preHandler: [authenticateToken]
  }, async (request, reply) => {
    try {
      const { id } = request.params;
      const category = await categoryProcedures.getById(id, request.user.id);
      
      if (!category) {
        reply.code(404);
        return { success: false, error: 'Category not found' };
      }
      
      return { success: true, data: category };
    } catch (error) {
      fastify.log.error(error);
      reply.code(500);
      return { success: false, error: 'Failed to fetch category' };
    }
  });

  // POST /budgets/:id/categories - Add category to budget
  fastify.post('/budgets/:id/categories', {
    preHandler: [authenticateToken]
  }, async (request, reply) => {
    try {
      const { id } = request.params;
      const { name, allocatedAmount } = request.body;

      // Basic validation (allow 0 as a valid allocatedAmount)
      if (!name || allocatedAmount === undefined) {
        reply.code(400);
        return { success: false, error: 'Name and allocatedAmount are required' };
      }

      const category = await categoryProcedures.create({
        budgetId: parseInt(id),
        name,
        allocatedAmount
      });
      
      reply.code(201);
      return { success: true, data: category, message: 'Category created successfully' };
    } catch (error) {
      fastify.log.error(error);
      reply.code(500);
      return { success: false, error: 'Failed to create category' };
    }
  });

  // PUT /categories/:id - Update category
  fastify.put('/categories/:id', {
    preHandler: [authenticateToken]
  }, async (request, reply) => {
    try {
      const { id } = request.params;
      const { name, allocatedAmount } = request.body;
      
      // Basic validation
      if (!name || !allocatedAmount) {
        reply.code(400);
        return { success: false, error: 'Name and allocatedAmount are required' };
      }

      const category = await categoryProcedures.update(id, request.user.id, {
        name,
        allocatedAmount
      });
      
      return { success: true, data: category, message: 'Category updated successfully' };
    } catch (error) {
      fastify.log.error(error);
      
      if (error.code === 'P2025') {
        reply.code(404);
        return { success: false, error: 'Category not found' };
      }
      
      reply.code(500);
      return { success: false, error: 'Failed to update category' };
    }
  });

  // DELETE /categories/:id - Delete category
  fastify.delete('/categories/:id', {
    preHandler: [authenticateToken]
  }, async (request, reply) => {
    try {
      const { id } = request.params;
      await categoryProcedures.delete(id, request.user.id);
      
      return { success: true, message: 'Category deleted successfully' };
    } catch (error) {
      fastify.log.error(error);
      
      if (error.code === 'P2025') {
        reply.code(404);
        return { success: false, error: 'Category not found' };
      }
      
      reply.code(500);
      return { success: false, error: 'Failed to delete category' };
    }
  });
}

module.exports = categoryRoutes;
