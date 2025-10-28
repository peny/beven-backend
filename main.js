require('dotenv').config();
const config = require('./config');
const { initializeRedis } = require('./middleware/cache-redis');

const fastify = require('fastify')({
  logger: {
    level: 'info',
    prettyPrint: config.server.environment === 'development'
  }
});

// Register CORS
fastify.register(require('@fastify/cors'), config.cors);

// Register JWT
fastify.register(require('@fastify/jwt'), {
  secret: config.jwt.secret
});

// Register routes
fastify.register(require('./routes/auth'), { prefix: '/api' });
fastify.register(require('./routes/budgets'), { prefix: '/api' });
fastify.register(require('./routes/categories'), { prefix: '/api' });
fastify.register(require('./routes/transactions'), { prefix: '/api' });

// Register new routes with error handling
try {
  fastify.register(require('./routes/splits'), { prefix: '/api' });
  fastify.log.info('Splits routes registered successfully');
} catch (error) {
  fastify.log.error('Failed to register splits routes:', error);
}

try {
  fastify.register(require('./routes/connections'), { prefix: '/api' });
  fastify.log.info('Connections routes registered successfully');
} catch (error) {
  fastify.log.error('Failed to register connections routes:', error);
}

// Health check endpoint
fastify.get('/health', async (request, reply) => {
  return { 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: config.server.environment
  };
});

// Root endpoint
fastify.get('/', async (request, reply) => {
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
    deployment: 'enhanced-v2'
  };
});

// Test endpoint to verify deployment
fastify.get('/test', async (request, reply) => {
  return {
    message: 'Deployment test successful',
    timestamp: new Date().toISOString(),
    version: 'enhanced-v2'
  };
});

// Simple test route for splits
fastify.get('/api/splits-test', async (request, reply) => {
  return {
    success: true,
    message: 'Splits endpoint is working',
    timestamp: new Date().toISOString()
  };
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
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();
