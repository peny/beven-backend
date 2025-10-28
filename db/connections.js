const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

/**
 * Get all connections for a user
 * @param {number} userId - User ID
 * @returns {Promise<Array>} Array of connections
 */
async function getAll(userId) {
  return await prisma.connection.findMany({
    where: { userId },
    include: {
      connectedTo: {
        select: { id: true, name: true, email: true }
      }
    },
    orderBy: { createdAt: 'desc' }
  });
}

/**
 * Get a specific connection by ID
 * @param {number} connectionId - Connection ID
 * @param {number} userId - User ID (for authorization)
 * @returns {Promise<Object|null>} Connection object or null
 */
async function getById(connectionId, userId) {
  return await prisma.connection.findFirst({
    where: {
      id: connectionId,
      userId
    },
    include: {
      connectedTo: {
        select: { id: true, name: true, email: true }
      }
    }
  });
}

/**
 * Add a new connection
 * @param {Object} data - Connection data
 * @param {string} data.email - Email of the user to connect to
 * @param {string} [data.name] - Optional name override
 * @param {number} data.userId - User ID who is creating the connection
 * @returns {Promise<Object>} Created connection
 */
async function create(data) {
  const { email, name, userId } = data;

  // Check if the email belongs to an existing user
  const existingUser = await prisma.user.findUnique({
    where: { email },
    select: { id: true, name: true, email: true }
  });

  // Check if connection already exists
  const existingConnection = await prisma.connection.findUnique({
    where: {
      userId_email: {
        userId,
        email
      }
    }
  });

  if (existingConnection) {
    throw new Error('Connection already exists');
  }

  // Create the connection
  const connection = await prisma.connection.create({
    data: {
      userId,
      email,
      name: name || existingUser?.name || email.split('@')[0], // Use provided name, existing user name, or email prefix
      username: existingUser ? existingUser.name : null,
      connectedTo: existingUser ? { connect: { email } } : undefined
    },
    include: {
      connectedTo: {
        select: { id: true, name: true, email: true }
      }
    }
  });

  return connection;
}

/**
 * Delete a connection
 * @param {number} connectionId - Connection ID
 * @param {number} userId - User ID (for authorization)
 * @returns {Promise<Object>} Success response
 */
async function deleteConnection(connectionId, userId) {
  // Verify user owns this connection
  const connection = await prisma.connection.findFirst({
    where: {
      id: connectionId,
      userId
    }
  });

  if (!connection) {
    throw new Error('Connection not found or access denied');
  }

  await prisma.connection.delete({
    where: { id: connectionId }
  });

  return { success: true };
}

/**
 * Search for users by email or name
 * @param {string} query - Search query
 * @param {number} userId - User ID (exclude self from results)
 * @returns {Promise<Array>} Array of matching users
 */
async function searchUsers(query, userId) {
  const users = await prisma.user.findMany({
    where: {
      AND: [
        { id: { not: userId } }, // Exclude self
        { isActive: true },
        {
          OR: [
            { email: { contains: query, mode: 'insensitive' } },
            { name: { contains: query, mode: 'insensitive' } }
          ]
        }
      ]
    },
    select: {
      id: true,
      name: true,
      email: true
    },
    take: 10 // Limit results
  });

  return users;
}

module.exports = {
  getAll,
  getById,
  create,
  deleteConnection,
  searchUsers
};
