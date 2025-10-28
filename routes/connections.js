const connectionProcedures = require('../db/connections');
const { authenticateToken } = require('../middleware/auth');
const { cacheMiddleware, invalidateUserCache } = require('../middleware/cache-redis');

// Connection routes
async function connectionRoutes(fastify, options) {
  // GET /connections - Get all connections for user
  fastify.get('/connections', {
    preHandler: [authenticateToken, cacheMiddleware({ endpoint: 'connections', ttl: 300 })]
  }, async (request, reply) => {
    try {
      const connections = await connectionProcedures.getAll(request.user.id);
      return { success: true, data: connections };
    } catch (error) {
      fastify.log.error(error);
      reply.code(500);
      return { success: false, error: 'Failed to fetch connections' };
    }
  });

  // GET /connections/:id - Get specific connection
  fastify.get('/connections/:id', {
    preHandler: [authenticateToken, cacheMiddleware({ endpoint: 'connection', ttl: 300 })]
  }, async (request, reply) => {
    try {
      const connectionId = parseInt(request.params.id);
      const connection = await connectionProcedures.getById(connectionId, request.user.id);
      
      if (!connection) {
        reply.code(404);
        return { success: false, error: 'Connection not found' };
      }

      return { success: true, data: connection };
    } catch (error) {
      fastify.log.error(error);
      reply.code(500);
      return { success: false, error: 'Failed to fetch connection' };
    }
  });

  // POST /connections - Add new connection
  fastify.post('/connections', {
    preHandler: [authenticateToken]
  }, async (request, reply) => {
    try {
      const { email, name } = request.body;

      // Basic validation
      if (!email) {
        reply.code(400);
        return { success: false, error: 'Email is required' };
      }

      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        reply.code(400);
        return { success: false, error: 'Invalid email format' };
      }

      // Don't allow adding self as connection
      if (email === request.user.email) {
        reply.code(400);
        return { success: false, error: 'Cannot add yourself as a connection' };
      }

      const connection = await connectionProcedures.create({
        email,
        name,
        userId: request.user.id
      });

      // Invalidate user's connection cache
      invalidateUserCache(request.user.id, 'connections');

      reply.code(201);
      return { success: true, data: connection, message: 'Connection added successfully' };
    } catch (error) {
      fastify.log.error(error);
      reply.code(400);
      return { success: false, error: error.message || 'Failed to add connection' };
    }
  });

  // DELETE /connections/:id - Delete connection
  fastify.delete('/connections/:id', {
    preHandler: [authenticateToken]
  }, async (request, reply) => {
    try {
      const connectionId = parseInt(request.params.id);

      await connectionProcedures.deleteConnection(connectionId, request.user.id);

      // Invalidate user's connection cache
      invalidateUserCache(request.user.id, 'connections');

      return { success: true, message: 'Connection deleted successfully' };
    } catch (error) {
      fastify.log.error(error);
      reply.code(400);
      return { success: false, error: error.message || 'Failed to delete connection' };
    }
  });

  // GET /connections/search - Search for users to connect with
  fastify.get('/connections/search', {
    preHandler: [authenticateToken, cacheMiddleware({ endpoint: 'user-search', ttl: 60 })]
  }, async (request, reply) => {
    try {
      const { q } = request.query;

      if (!q || q.length < 2) {
        reply.code(400);
        return { success: false, error: 'Search query must be at least 2 characters' };
      }

      const users = await connectionProcedures.searchUsers(q, request.user.id);

      return { success: true, data: users };
    } catch (error) {
      fastify.log.error(error);
      reply.code(500);
      return { success: false, error: 'Failed to search users' };
    }
  });
}

module.exports = connectionRoutes;
