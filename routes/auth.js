const userProcedures = require('../db/users');
const { authenticateToken, generateToken } = require('../middleware/auth');

// Auth routes
async function authRoutes(fastify, options) {
  // POST /auth/register - User registration
  fastify.post('/auth/register', async (request, reply) => {
    try {
      const { email, password, name } = request.body;
      
      // Basic validation
      if (!email || !password || !name) {
        reply.code(400);
        return { success: false, error: 'Email, password, and name are required' };
      }

      // Check if user already exists
      const existingUser = await userProcedures.getByEmail(email);
      if (existingUser) {
        reply.code(409);
        return { success: false, error: 'User already exists' };
      }

      const user = await userProcedures.create({
        email,
        password,
        name
      });
      
      const token = generateToken(request, user);
      
      reply.code(201);
      return { 
        success: true, 
        data: { user, token },
        message: 'User created successfully' 
      };
    } catch (error) {
      fastify.log.error(error);
      reply.code(500);
      return { success: false, error: 'Failed to create user' };
    }
  });

  // POST /auth/login - User login
  fastify.post('/auth/login', async (request, reply) => {
    try {
      const { email, password } = request.body;
      
      // Basic validation
      if (!email || !password) {
        reply.code(400);
        return { success: false, error: 'Email and password are required' };
      }

      const user = await userProcedures.getByEmail(email);
      if (!user) {
        reply.code(401);
        return { success: false, error: 'Invalid credentials' };
      }

      const isValidPassword = await userProcedures.verifyPassword(user, password);
      if (!isValidPassword) {
        reply.code(401);
        return { success: false, error: 'Invalid credentials' };
      }

      if (!user.isActive) {
        reply.code(401);
        return { success: false, error: 'Account is deactivated' };
      }

      const token = generateToken(request, user);
      
      // Return user without password
      const { password: _, ...userWithoutPassword } = user;
      
      return { 
        success: true, 
        data: { user: userWithoutPassword, token },
        message: 'Login successful' 
      };
    } catch (error) {
      fastify.log.error(error);
      reply.code(500);
      return { success: false, error: 'Failed to login' };
    }
  });

  // GET /auth/me - Get current user
  fastify.get('/auth/me', {
    preHandler: [authenticateToken]
  }, async (request, reply) => {
    try {
      return { 
        success: true, 
        data: { user: request.user } 
      };
    } catch (error) {
      fastify.log.error(error);
      reply.code(500);
      return { success: false, error: 'Failed to get user info' };
    }
  });
}

module.exports = authRoutes;
