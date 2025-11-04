const fastify = require('fastify');
const { PrismaClient } = require('@prisma/client');

// Use test database URL if available, otherwise use production (for local dev testing)
// Note: Prisma reads DATABASE_URL from environment, so we ensure it's set
const testDbUrl = process.env.TEST_DATABASE_URL || process.env.DATABASE_URL;
if (testDbUrl) {
  process.env.DATABASE_URL = testDbUrl;
}

// Create a Prisma client for direct DB access in tests
const prisma = new PrismaClient();

// Helper to create test app
async function buildApp() {
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
  return app;
}

describe('Transaction API Integration Tests', () => {
  let app;
  let authToken;
  let userId;
  let budgetId;
  let categoryId;

  beforeAll(async () => {
    app = await buildApp();
  });

  afterAll(async () => {
    // Clean up test data
    if (app) {
      await app.close();
    }
    await prisma.$disconnect();
  });

  beforeEach(async () => {
    // Clean up test data before each test
    try {
      await prisma.transaction.deleteMany({});
      await prisma.category.deleteMany({});
      await prisma.budget.deleteMany({});
      await prisma.user.deleteMany({});
    } catch (error) {
      // Ignore cleanup errors if database doesn't exist
      console.warn('Cleanup warning:', error.message);
    }

    // Create test user and get auth token
    const registerResponse = await app.inject({
      method: 'POST',
      url: '/api/auth/register',
      payload: {
        email: 'test@example.com',
        password: 'password123',
        name: 'Test User'
      }
    });

    expect(registerResponse.statusCode).toBe(201);
    const registerBody = JSON.parse(registerResponse.body);
    expect(registerBody.success).toBe(true);
    authToken = registerBody.data.token;
    userId = registerBody.data.user.id;

    // Create a budget
    const budgetResponse = await app.inject({
      method: 'POST',
      url: '/api/budgets',
      headers: {
        'Authorization': `Bearer ${authToken}`
      },
      payload: {
        name: 'Personal',
        amount: 2000,
        period: 'monthly',
        startDate: '2025-11-01'
      }
    });

    expect(budgetResponse.statusCode).toBe(201);
    const budgetBody = JSON.parse(budgetResponse.body);
    expect(budgetBody.success).toBe(true);
    budgetId = budgetBody.data.id;

    // Create a category
    const categoryResponse = await app.inject({
      method: 'POST',
      url: `/api/budgets/${budgetId}/categories`,
      headers: {
        'Authorization': `Bearer ${authToken}`
      },
      payload: {
        name: 'Movies',
        allocatedAmount: 100
      }
    });

    expect(categoryResponse.statusCode).toBe(201);
    const categoryBody = JSON.parse(categoryResponse.body);
    expect(categoryBody.success).toBe(true);
    categoryId = categoryBody.data.id;
  });

  describe('Transaction Creation and Retrieval', () => {
    test('should create a transaction with description "Dune 2" and retrieve it', async () => {
      // Create transaction
      const createResponse = await app.inject({
        method: 'POST',
        url: '/api/transactions',
        headers: {
          'Authorization': `Bearer ${authToken}`
        },
        payload: {
          budgetId: budgetId,
          categoryId: categoryId,
          amount: 14.99,
          description: 'Dune 2',
          date: new Date().toISOString(),
          type: 'expense'
        }
      });

      expect(createResponse.statusCode).toBe(201);
      const createBody = JSON.parse(createResponse.body);
      expect(createBody.success).toBe(true);
      expect(createBody.data.description).toBe('Dune 2');
      expect(createBody.data.amount).toBe('14.99');
      expect(createBody.data.type).toBe('expense');
      expect(createBody.data.budgetId).toBe(budgetId);
      expect(createBody.data.categoryId).toBe(categoryId);

      const transactionId = createBody.data.id;

      // Retrieve the transaction
      const getResponse = await app.inject({
        method: 'GET',
        url: `/api/transactions/${transactionId}`,
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      });

      expect(getResponse.statusCode).toBe(200);
      const getBody = JSON.parse(getResponse.body);
      expect(getBody.success).toBe(true);
      expect(getBody.data.id).toBe(transactionId);
      expect(getBody.data.description).toBe('Dune 2');
      expect(getBody.data.amount).toBe('14.99');
      expect(getBody.data.type).toBe('expense');
      expect(getBody.data.budget).toBeDefined();
      expect(getBody.data.category).toBeDefined();
    });

    test('should update category spentAmount when transaction is created', async () => {
      // Verify initial category spentAmount is 0
      const initialCategory = await prisma.category.findUnique({
        where: { id: categoryId }
      });
      expect(parseFloat(initialCategory.spentAmount)).toBe(0);

      // Create transaction
      const createResponse = await app.inject({
        method: 'POST',
        url: '/api/transactions',
        headers: {
          'Authorization': `Bearer ${authToken}`
        },
        payload: {
          budgetId: budgetId,
          categoryId: categoryId,
          amount: 14.99,
          description: 'Dune 2',
          date: new Date().toISOString(),
          type: 'expense'
        }
      });

      expect(createResponse.statusCode).toBe(201);

      // Verify category spentAmount was updated
      const updatedCategory = await prisma.category.findUnique({
        where: { id: categoryId }
      });
      expect(parseFloat(updatedCategory.spentAmount)).toBe(14.99);
    });

    test('should include budget and category information in transaction response', async () => {
      // Create transaction
      const createResponse = await app.inject({
        method: 'POST',
        url: '/api/transactions',
        headers: {
          'Authorization': `Bearer ${authToken}`
        },
        payload: {
          budgetId: budgetId,
          categoryId: categoryId,
          amount: 14.99,
          description: 'Dune 2',
          date: new Date().toISOString(),
          type: 'expense'
        }
      });

      expect(createResponse.statusCode).toBe(201);
      const createBody = JSON.parse(createResponse.body);
      expect(createBody.data.budget).toBeDefined();
      expect(createBody.data.budget.id).toBe(budgetId);
      expect(createBody.data.budget.name).toBe('Personal');
      expect(createBody.data.category).toBeDefined();
      expect(createBody.data.category.id).toBe(categoryId);
      expect(createBody.data.category.name).toBe('Movies');
      
      // Note: Category spentAmount may not be updated in the response immediately
      // but we verify it's updated in the database in the separate test above
      // For this test, we just verify the category structure is included
      expect(createBody.data.category.spentAmount).toBeDefined();
      
      // Re-fetch the transaction to get updated category spentAmount
      const transactionId = createBody.data.id;
      const getResponse = await app.inject({
        method: 'GET',
        url: `/api/transactions/${transactionId}`,
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      });
      
      expect(getResponse.statusCode).toBe(200);
      const getBody = JSON.parse(getResponse.body);
      expect(parseFloat(getBody.data.category.spentAmount)).toBe(14.99);
    });

    test('should list transactions for a budget', async () => {
      // Create transaction
      const createResponse = await app.inject({
        method: 'POST',
        url: '/api/transactions',
        headers: {
          'Authorization': `Bearer ${authToken}`
        },
        payload: {
          budgetId: budgetId,
          categoryId: categoryId,
          amount: 14.99,
          description: 'Dune 2',
          date: new Date().toISOString(),
          type: 'expense'
        }
      });

      expect(createResponse.statusCode).toBe(201);

      // List transactions for budget
      const listResponse = await app.inject({
        method: 'GET',
        url: `/api/budgets/${budgetId}/transactions`,
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      });

      expect(listResponse.statusCode).toBe(200);
      const listBody = JSON.parse(listResponse.body);
      expect(listBody.success).toBe(true);
      expect(Array.isArray(listBody.data)).toBe(true);
      expect(listBody.data.length).toBeGreaterThan(0);
      expect(listBody.data[0].description).toBe('Dune 2');
    });
  });
});

