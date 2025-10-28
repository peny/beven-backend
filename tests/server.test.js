const fastify = require('fastify');

// Simple test to verify the server can start
describe('Server Tests', () => {
  test('should create Fastify app without errors', () => {
    const app = fastify({
      logger: false
    });

    expect(app).toBeDefined();
    expect(typeof app.register).toBe('function');
    expect(typeof app.listen).toBe('function');
  });

  test('should register plugins without errors', async () => {
    const app = fastify({
      logger: false
    });

    // Register plugins
    app.register(require('@fastify/cors'), {
      origin: true,
      credentials: false,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization']
    });

    app.register(require('@fastify/jwt'), {
      secret: 'test-secret'
    });

    await app.ready();
    expect(app).toBeDefined();
  });

  test('should register routes without errors', async () => {
    const app = fastify({
      logger: false
    });

    // Register plugins
    app.register(require('@fastify/cors'), {
      origin: true,
      credentials: false,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization']
    });

    app.register(require('@fastify/jwt'), {
      secret: 'test-secret'
    });

    // Register routes
    app.register(require('../routes/auth'), { prefix: '/api' });
    app.register(require('../routes/budgets'), { prefix: '/api' });
    app.register(require('../routes/categories'), { prefix: '/api' });
    app.register(require('../routes/transactions'), { prefix: '/api' });

    await app.ready();
    expect(app).toBeDefined();
  });
});
