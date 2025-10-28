const splitProcedures = require('../db/splits');
const { authenticateToken } = require('../middleware/auth');
const { cacheMiddleware, invalidateUserCache } = require('../middleware/cache-redis');

// Split routes
async function splitRoutes(fastify, options) {
  // GET /splits - Get all splits for user
  fastify.get('/splits', {
    preHandler: [authenticateToken, cacheMiddleware({ endpoint: 'splits', ttl: 300 })]
  }, async (request, reply) => {
    try {
      const splits = await splitProcedures.getAll(request.user.id);
      return { success: true, data: splits };
    } catch (error) {
      fastify.log.error(error);
      reply.code(500);
      return { success: false, error: 'Failed to fetch splits' };
    }
  });

  // GET /splits/:id - Get specific split
  fastify.get('/splits/:id', {
    preHandler: [authenticateToken, cacheMiddleware({ endpoint: 'split', ttl: 300 })]
  }, async (request, reply) => {
    try {
      const splitId = parseInt(request.params.id);
      const split = await splitProcedures.getById(splitId, request.user.id);
      
      if (!split) {
        reply.code(404);
        return { success: false, error: 'Split not found' };
      }

      return { success: true, data: split };
    } catch (error) {
      fastify.log.error(error);
      reply.code(500);
      return { success: false, error: 'Failed to fetch split' };
    }
  });

  // POST /splits - Create new split
  fastify.post('/splits', {
    preHandler: [authenticateToken]
  }, async (request, reply) => {
    try {
      const { title, totalAmount, participants, transactionId } = request.body;

      // Basic validation
      if (!title || !totalAmount || !participants || !Array.isArray(participants)) {
        reply.code(400);
        return { success: false, error: 'Title, totalAmount, and participants are required' };
      }

      if (participants.length === 0) {
        reply.code(400);
        return { success: false, error: 'At least one participant is required' };
      }

      // Validate participants
      for (const participant of participants) {
        if (!participant.name || !participant.amount) {
          reply.code(400);
          return { success: false, error: 'Each participant must have name and amount' };
        }
      }

      const split = await splitProcedures.create({
        title,
        totalAmount,
        createdBy: request.user.id,
        transactionId,
        participants
      });

      // Invalidate user's split cache
      invalidateUserCache(request.user.id, 'splits');

      reply.code(201);
      return { success: true, data: split, message: 'Split created successfully' };
    } catch (error) {
      fastify.log.error(error);
      reply.code(400);
      return { success: false, error: error.message || 'Failed to create split' };
    }
  });

  // PATCH /splits/:id/participants/:participantId/paid - Mark participant as paid
  fastify.patch('/splits/:id/participants/:participantId/paid', {
    preHandler: [authenticateToken]
  }, async (request, reply) => {
    try {
      const splitId = parseInt(request.params.id);
      const participantId = parseInt(request.params.participantId);

      const result = await splitProcedures.markParticipantPaid(splitId, participantId, request.user.id);

      // Invalidate user's split cache
      invalidateUserCache(request.user.id, 'splits');

      return { success: true, data: result };
    } catch (error) {
      fastify.log.error(error);
      reply.code(400);
      return { success: false, error: error.message || 'Failed to mark participant as paid' };
    }
  });

  // DELETE /splits/:id - Delete split
  fastify.delete('/splits/:id', {
    preHandler: [authenticateToken]
  }, async (request, reply) => {
    try {
      const splitId = parseInt(request.params.id);

      await splitProcedures.deleteSplit(splitId, request.user.id);

      // Invalidate user's split cache
      invalidateUserCache(request.user.id, 'splits');

      return { success: true, message: 'Split deleted successfully' };
    } catch (error) {
      fastify.log.error(error);
      reply.code(400);
      return { success: false, error: error.message || 'Failed to delete split' };
    }
  });
}

module.exports = splitRoutes;
