const userProcedures = require('../db/users');

// Authentication middleware
async function authenticateToken(request, reply) {
  try {
    const authHeader = request.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN
    
    if (!token) {
      return reply.code(401).send({ success: false, error: 'Access token required' });
    }

    const decoded = request.server.jwt.verify(token);
    
    const user = await userProcedures.getById(decoded.userId);
    
    if (!user || !user.isActive) {
      return reply.code(401).send({ success: false, error: 'Invalid or inactive user' });
    }

    request.user = user;
  } catch (error) {
    request.log.debug('Auth error:', error.message);
    return reply.code(401).send({ success: false, error: 'Invalid token' });
  }
}

// Admin role middleware
async function requireAdmin(request, reply) {
  try {
    // First authenticate the user
    await authenticateToken(request, reply);
    
    // Check if user is admin
    if (!request.user || request.user.role !== 'admin') {
      return reply.code(403).send({ success: false, error: 'Admin access required' });
    }
  } catch (error) {
    return reply.code(403).send({ success: false, error: 'Admin access required' });
  }
}

// Generate JWT token
function generateToken(request, user) {
  return request.server.jwt.sign(
    { 
      userId: user.id, 
      email: user.email, 
      role: user.role 
    },
    { expiresIn: '7d' }
  );
}

module.exports = {
  authenticateToken,
  requireAdmin,
  generateToken
};
