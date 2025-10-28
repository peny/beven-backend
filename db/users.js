const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

// User stored procedures
const userProcedures = {
  // Get user by ID
  async getById(id) {
    return await prisma.user.findUnique({
      where: { id: parseInt(id) },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isActive: true,
        createdAt: true,
        updatedAt: true
      }
    });
  },

  // Get user by email (includes password for auth)
  async getByEmail(email) {
    return await prisma.user.findUnique({
      where: { email: email.toLowerCase() }
    });
  },

  // Create new user
  async create(userData) {
    const hashedPassword = await bcrypt.hash(userData.password, 10);
    
    return await prisma.user.create({
      data: {
        email: userData.email.toLowerCase(),
        password: hashedPassword,
        name: userData.name,
        role: userData.role || 'user'
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isActive: true,
        createdAt: true,
        updatedAt: true
      }
    });
  },

  // Update user
  async update(id, userData) {
    const updateData = {
      name: userData.name,
      role: userData.role,
      isActive: userData.isActive
    };

    // Only update password if provided
    if (userData.password) {
      updateData.password = await bcrypt.hash(userData.password, 10);
    }

    return await prisma.user.update({
      where: { id: parseInt(id) },
      data: updateData,
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isActive: true,
        createdAt: true,
        updatedAt: true
      }
    });
  },

  // Verify password
  async verifyPassword(user, password) {
    return await bcrypt.compare(password, user.password);
  },

  // Create default admin user
  async createDefaultAdmin() {
    const existingAdmin = await prisma.user.findFirst({
      where: { role: 'admin' }
    });

    if (existingAdmin) {
      return null; // Admin already exists
    }

    const hashedPassword = await bcrypt.hash('admin123', 10);
    
    return await prisma.user.create({
      data: {
        email: 'admin@beven.com',
        password: hashedPassword,
        name: 'Admin User',
        role: 'admin'
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isActive: true,
        createdAt: true,
        updatedAt: true
      }
    });
  }
};

module.exports = userProcedures;
