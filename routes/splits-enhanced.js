const { authenticateToken, invalidateUserCache } = require('../middleware/cache-redis');
const splitProcedures = require('../db/splits-enhanced');

async function splitsRoutes(fastify, options) {
  // Enhanced GET /splits with pagination and filtering
  fastify.get('/splits', {
    preHandler: [authenticateToken],
    schema: {
      querystring: {
        type: 'object',
        properties: {
          limit: { type: 'integer', minimum: 1, maximum: 100, default: 50 },
          offset: { type: 'integer', minimum: 0, default: 0 },
          status: { type: 'string', enum: ['paid', 'unpaid', 'all'], default: 'all' },
          search: { type: 'string', minLength: 2 }
        }
      }
    }
  }, async (request, reply) => {
    try {
      const { limit, offset, status, search } = request.query;

      let result;
      if (search) {
        result = await splitProcedures.searchSplits(request.user.id, search, { limit });
        return { success: true, data: result };
      } else {
        result = await splitProcedures.getAll(request.user.id, { limit, offset, status });
        return { success: true, data: result.splits, pagination: result.pagination };
      }
    } catch (error) {
      fastify.log.error(error);
      reply.code(400);
      return { success: false, error: error.message };
    }
  });

  // Enhanced POST /splits with validation
  fastify.post('/splits', {
    preHandler: [authenticateToken],
    schema: {
      body: {
        type: 'object',
        required: ['title', 'totalAmount', 'participants'],
        properties: {
          title: { type: 'string', minLength: 1, maxLength: 200 },
          totalAmount: { type: 'number', minimum: 0.01 },
          participants: {
            type: 'array',
            minItems: 1,
            items: {
              type: 'object',
              required: ['name', 'amount'],
              properties: {
                name: { type: 'string', minLength: 1, maxLength: 100 },
                email: { type: 'string', format: 'email' },
                amount: { type: 'number', minimum: 0.01 }
              }
            }
          },
          transactionId: { type: 'integer', minimum: 1 }
        }
      }
    }
  }, async (request, reply) => {
    try {
      const splitData = {
        ...request.body,
        createdBy: request.user.id
      };

      const split = await splitProcedures.create(splitData);

      // Invalidate user's splits cache
      invalidateUserCache(request.user.id, 'splits');

      reply.code(201);
      return { success: true, data: split, message: 'Split created successfully' };
    } catch (error) {
      fastify.log.error(error);
      reply.code(400);
      return { success: false, error: error.message };
    }
  });

  // Enhanced GET /splits/:id
  fastify.get('/splits/:id', {
    preHandler: [authenticateToken],
    schema: {
      params: {
        type: 'object',
        properties: {
          id: { type: 'integer', minimum: 1 }
        }
      }
    }
  }, async (request, reply) => {
    try {
      const split = await splitProcedures.getById(request.params.id, request.user.id);

      if (!split) {
        reply.code(404);
        return { success: false, error: 'Split not found' };
      }

      return { success: true, data: split };
    } catch (error) {
      fastify.log.error(error);
      reply.code(400);
      return { success: false, error: error.message };
    }
  });

  // Enhanced PATCH /splits/:id/participants/:participantId/paid
  fastify.patch('/splits/:id/participants/:participantId/paid', {
    preHandler: [authenticateToken],
    schema: {
      params: {
        type: 'object',
        properties: {
          id: { type: 'integer', minimum: 1 },
          participantId: { type: 'integer', minimum: 1 }
        }
      }
    }
  }, async (request, reply) => {
    try {
      const result = await splitProcedures.markParticipantPaid(
        request.params.id,
        request.params.participantId,
        request.user.id
      );

      // Invalidate user's splits cache
      invalidateUserCache(request.user.id, 'splits');

      return { success: true, data: result };
    } catch (error) {
      fastify.log.error(error);
      reply.code(400);
      return { success: false, error: error.message };
    }
  });

  // Enhanced DELETE /splits/:id
  fastify.delete('/splits/:id', {
    preHandler: [authenticateToken],
    schema: {
      params: {
        type: 'object',
        properties: {
          id: { type: 'integer', minimum: 1 }
        }
      }
    }
  }, async (request, reply) => {
    try {
      await splitProcedures.deleteSplit(request.params.id, request.user.id);

      // Invalidate user's splits cache
      invalidateUserCache(request.user.id, 'splits');

      return { success: true, message: 'Split deleted successfully' };
    } catch (error) {
      fastify.log.error(error);
      reply.code(400);
      return { success: false, error: error.message };
    }
  });

  // New endpoint: GET /splits/stats - Get split statistics for user
  fastify.get('/splits/stats', {
    preHandler: [authenticateToken]
  }, async (request, reply) => {
    try {
      const userId = request.user.id;
      
      const [totalSplits, paidSplits, unpaidSplits, totalAmount] = await Promise.all([
        // Total splits user is involved in
        fastify.prisma.split.count({
          where: {
            OR: [
              { createdBy: userId },
              { participants: { some: { userId: userId } } }
            ]
          }
        }),
        
        // Splits where user has paid
        fastify.prisma.split.count({
          where: {
            participants: {
              some: {
                userId: userId,
                isPaid: true
              }
            }
          }
        }),
        
        // Splits where user hasn't paid
        fastify.prisma.split.count({
          where: {
            participants: {
              some: {
                userId: userId,
                isPaid: false
              }
            }
          }
        }),
        
        // Total amount user owes across all splits
        fastify.prisma.splitParticipant.aggregate({
          where: {
            userId: userId,
            isPaid: false
          },
          _sum: {
            amount: true
          }
        })
      ]);

      return {
        success: true,
        data: {
          totalSplits,
          paidSplits,
          unpaidSplits,
          totalOwed: totalAmount._sum.amount || 0
        }
      };
    } catch (error) {
      fastify.log.error(error);
      reply.code(500);
      return { success: false, error: 'Failed to fetch split statistics' };
    }
  });
}

module.exports = splitsRoutes;
