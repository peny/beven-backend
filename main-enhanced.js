require('dotenv').config();
const config = require('./config');
const { initializeRedis } = require('./middleware/cache-redis');
const { 
  rateLimit, 
  requestLogger, 
  securityHeaders, 
  errorHandler, 
  sanitizeRequest 
} = require('./middleware/enhanced');

const fastify = require('fastify')({
  logger: {
    level: config.server.environment === 'development' ? 'debug' : 'info',
    prettyPrint: config.server.environment === 'development',
    serializers: {
      req: (req) => ({
        method: req.method,
        url: req.url,
        headers: {
          host: req.headers.host,
          'user-agent': req.headers['user-agent'],
          'content-type': req.headers['content-type']
        },
        remoteAddress: req.ip,
        remotePort: req.connection?.remotePort
      }),
      res: (res) => ({
        statusCode: res.statusCode,
        headers: res.getHeaders()
      })
    }
  },
  disableRequestLogging: false,
  requestIdHeader: 'x-request-id',
  requestIdLogLabel: 'reqId',
  genReqId: () => Math.random().toString(36).substring(2, 15)
});

// Register security headers middleware
fastify.register(securityHeaders);

// Register request sanitization
fastify.register(sanitizeRequest);

// Register request logging
fastify.register(requestLogger({ logBody: false, logHeaders: false }));

// Register rate limiting
fastify.register(rateLimit({ maxRequests: 200, windowMs: 60000 }));

// Register CORS with enhanced configuration
fastify.register(require('@fastify/cors'), {
  ...config.cors,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin']
});

// Register JWT with enhanced configuration
fastify.register(require('@fastify/jwt'), {
  secret: config.jwt.secret,
  sign: {
    expiresIn: '7d',
    issuer: 'beven-budget-api',
    audience: 'beven-budget-app'
  },
  verify: {
    issuer: 'beven-budget-api',
    audience: 'beven-budget-app'
  }
});

// Register error handler
fastify.setErrorHandler(errorHandler());

// Register not found handler
fastify.setNotFoundHandler((request, reply) => {
  reply.code(404).send({
    success: false,
    error: 'Route not found',
    path: request.url,
    method: request.method
  });
});

// Register routes with enhanced error handling
fastify.register(require('./routes/auth'), { prefix: '/api' });
fastify.register(require('./routes/budgets'), { prefix: '/api' });
fastify.register(require('./routes/categories'), { prefix: '/api' });
fastify.register(require('./routes/transactions'), { prefix: '/api' });
fastify.register(require('./routes/splits'), { prefix: '/api' });
fastify.register(require('./routes/connections'), { prefix: '/api' });

// Enhanced health check endpoint
fastify.get('/health', {
  schema: {
    response: {
      200: {
        type: 'object',
        properties: {
          status: { type: 'string' },
          timestamp: { type: 'string' },
          uptime: { type: 'number' },
          environment: { type: 'string' },
          version: { type: 'string' },
          memory: { type: 'object' },
          redis: { type: 'object' }
        }
      }
    }
  }
}, async (request, reply) => {
  const memoryUsage = process.memoryUsage();
  const redisStatus = require('./middleware/cache-redis').isRedisReady();
  
  return {
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: config.server.environment,
    version: '1.0.0',
    memory: {
      rss: `${Math.round(memoryUsage.rss / 1024 / 1024)}MB`,
      heapTotal: `${Math.round(memoryUsage.heapTotal / 1024 / 1024)}MB`,
      heapUsed: `${Math.round(memoryUsage.heapUsed / 1024 / 1024)}MB`,
      external: `${Math.round(memoryUsage.external / 1024 / 1024)}MB`
    },
    redis: {
      connected: redisStatus(),
      type: redisStatus() ? 'redis' : 'in-memory'
    }
  };
});

// Enhanced root endpoint with API documentation
fastify.get('/', {
  schema: {
    response: {
      200: {
        type: 'object',
        properties: {
          message: { type: 'string' },
          version: { type: 'string' },
          environment: { type: 'string' },
          endpoints: { type: 'object' },
          features: { type: 'array' },
          documentation: { type: 'object' }
        }
      }
    }
  }
}, async (request, reply) => {
  return {
    message: 'Beven Budget API',
    version: '1.0.0',
    environment: config.server.environment,
    endpoints: {
      auth: '/api/auth',
      budgets: '/api/budgets',
      categories: '/api/categories',
      transactions: '/api/transactions',
      splits: '/api/splits',
      connections: '/api/connections',
      health: '/health'
    },
    features: [
      'JWT Authentication',
      'Redis Caching',
      'Rate Limiting',
      'Request Validation',
      'Error Handling',
      'Security Headers',
      'Request Logging'
    ],
    documentation: {
      health: '/health',
      apiInfo: '/',
      frontendGuide: 'See FRONTEND_INTEGRATION.md'
    }
  };
});

// Graceful shutdown handling
const gracefulShutdown = async (signal) => {
  fastify.log.info(`Received ${signal}, shutting down gracefully...`);
  
  try {
    await fastify.close();
    fastify.log.info('Server closed successfully');
    process.exit(0);
  } catch (error) {
    fastify.log.error('Error during shutdown:', error);
    process.exit(1);
  }
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  fastify.log.error('Uncaught Exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  fastify.log.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// Start the server
const start = async () => {
  try {
    // Initialize Redis cache
    const redisInitialized = await initializeRedis();
    if (redisInitialized) {
      fastify.log.info('Redis cache initialized successfully');
    } else {
      fastify.log.info('Using in-memory cache fallback');
    }

    // Initialize default admin user if no users exist
    const userProcedures = require('./db/users');
    const defaultAdmin = await userProcedures.createDefaultAdmin();

    if (defaultAdmin) {
      fastify.log.info('Default admin user created:');
      fastify.log.info(`Email: ${defaultAdmin.email}`);
      fastify.log.info('Password: admin123');
      fastify.log.info('Please change the password after first login!');
    }

    const port = config.server.port;
    const host = config.server.host;

    await fastify.listen({ port, host });
    fastify.log.info(`Server is running on http://${host}:${port}`);
    fastify.log.info(`Environment: ${config.server.environment}`);
    fastify.log.info(`Health check: http://${host}:${port}/health`);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();
