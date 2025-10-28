const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

/**
 * Validate split data
 * @param {Object} data - Split data to validate
 * @returns {Object} Validation result
 */
function validateSplitData(data) {
  const errors = [];

  // Required fields
  if (!data.title || typeof data.title !== 'string' || data.title.trim().length === 0) {
    errors.push('Title is required and must be a non-empty string');
  }

  if (!data.totalAmount || isNaN(parseFloat(data.totalAmount)) || parseFloat(data.totalAmount) <= 0) {
    errors.push('Total amount is required and must be a positive number');
  }

  if (!data.participants || !Array.isArray(data.participants) || data.participants.length === 0) {
    errors.push('At least one participant is required');
  }

  // Validate participants
  if (data.participants && Array.isArray(data.participants)) {
    data.participants.forEach((participant, index) => {
      if (!participant.name || typeof participant.name !== 'string' || participant.name.trim().length === 0) {
        errors.push(`Participant ${index + 1}: Name is required`);
      }

      if (!participant.amount || isNaN(parseFloat(participant.amount)) || parseFloat(participant.amount) <= 0) {
        errors.push(`Participant ${index + 1}: Amount is required and must be a positive number`);
      }

      if (participant.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(participant.email)) {
        errors.push(`Participant ${index + 1}: Invalid email format`);
      }
    });

    // Check if participant amounts equal total amount
    if (data.totalAmount && data.participants.length > 0) {
      const participantTotal = data.participants.reduce((sum, p) => sum + parseFloat(p.amount || 0), 0);
      const totalAmount = parseFloat(data.totalAmount);
      
      if (Math.abs(participantTotal - totalAmount) > 0.01) {
        errors.push(`Participant amounts (${participantTotal}) must equal total amount (${totalAmount})`);
      }
    }
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Get all splits for a user with enhanced filtering
 * @param {number} userId - User ID
 * @param {Object} options - Query options
 * @param {number} [options.limit] - Limit results
 * @param {number} [options.offset] - Offset for pagination
 * @param {string} [options.status] - Filter by payment status
 * @returns {Promise<Object>} Paginated splits result
 */
async function getAll(userId, options = {}) {
  const { limit = 50, offset = 0, status } = options;

  // Build where clause
  const whereClause = {
    OR: [
      { createdBy: userId },
      { participants: { some: { userId: userId } } }
    ]
  };

  // Add status filter if provided
  if (status === 'paid') {
    whereClause.participants = {
      some: {
        userId: userId,
        isPaid: true
      }
    };
  } else if (status === 'unpaid') {
    whereClause.participants = {
      some: {
        userId: userId,
        isPaid: false
      }
    };
  }

  const [splits, totalCount] = await Promise.all([
    prisma.split.findMany({
      where: whereClause,
      include: {
        participants: {
          include: {
            user: {
              select: { id: true, name: true, email: true }
            }
          }
        },
        creator: {
          select: { id: true, name: true, email: true }
        },
        transaction: {
          select: { id: true, description: true, amount: true }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: Math.min(limit, 100), // Cap at 100
      skip: offset
    }),
    prisma.split.count({ where: whereClause })
  ]);

  return {
    splits,
    pagination: {
      total: totalCount,
      limit,
      offset,
      hasMore: offset + splits.length < totalCount
    }
  };
}

/**
 * Get a specific split by ID with enhanced security
 * @param {number} splitId - Split ID
 * @param {number} userId - User ID (for authorization)
 * @returns {Promise<Object|null>} Split object or null
 */
async function getById(splitId, userId) {
  if (!splitId || isNaN(parseInt(splitId))) {
    throw new Error('Invalid split ID');
  }

  const split = await prisma.split.findFirst({
    where: {
      id: parseInt(splitId),
      OR: [
        { createdBy: userId },
        { participants: { some: { userId: userId } } }
      ]
    },
    include: {
      participants: {
        include: {
          user: {
            select: { id: true, name: true, email: true }
          }
        }
      },
      creator: {
        select: { id: true, name: true, email: true }
      },
      transaction: {
        select: { id: true, description: true, amount: true }
      }
    }
  });

  return split;
}

/**
 * Create a new split with enhanced validation and business logic
 * @param {Object} data - Split data
 * @returns {Promise<Object>} Created split
 */
async function create(data) {
  // Validate input data
  const validation = validateSplitData(data);
  if (!validation.isValid) {
    throw new Error(`Validation failed: ${validation.errors.join(', ')}`);
  }

  const { title, totalAmount, createdBy, transactionId, participants } = data;

  // Check if transaction exists and belongs to user (if provided)
  if (transactionId) {
    const transaction = await prisma.transaction.findFirst({
      where: {
        id: parseInt(transactionId),
        userId: createdBy
      }
    });

    if (!transaction) {
      throw new Error('Transaction not found or access denied');
    }
  }

  // Check if participants with emails are existing users
  const participantEmails = participants.filter(p => p.email).map(p => p.email);
  const existingUsers = await prisma.user.findMany({
    where: { 
      email: { in: participantEmails },
      isActive: true 
    },
    select: { id: true, email: true, name: true }
  });

  // Create the split with participants
  const split = await prisma.split.create({
    data: {
      title: title.trim(),
      totalAmount: parseFloat(totalAmount),
      createdBy,
      transactionId: transactionId ? parseInt(transactionId) : null,
      participants: {
        create: participants.map(participant => {
          const existingUser = existingUsers.find(u => u.email === participant.email);
          const isCreator = existingUser && existingUser.id === createdBy;
          
          return {
            name: participant.name.trim(),
            email: participant.email ? participant.email.trim() : null,
            amount: parseFloat(participant.amount),
            isPaid: isCreator, // Auto-pay creator
            isConnectedUser: !!existingUser,
            userId: existingUser ? existingUser.id : null
          };
        })
      }
    },
    include: {
      participants: {
        include: {
          user: {
            select: { id: true, name: true, email: true }
          }
        }
      },
      creator: {
        select: { id: true, name: true, email: true }
      },
      transaction: {
        select: { id: true, description: true, amount: true }
      }
    }
  });

  return split;
}

/**
 * Mark a participant as paid with enhanced validation
 * @param {number} splitId - Split ID
 * @param {number} participantId - Participant ID
 * @param {number} userId - User ID (for authorization)
 * @returns {Promise<Object>} Success response
 */
async function markParticipantPaid(splitId, participantId, userId) {
  if (!splitId || isNaN(parseInt(splitId))) {
    throw new Error('Invalid split ID');
  }

  if (!participantId || isNaN(parseInt(participantId))) {
    throw new Error('Invalid participant ID');
  }

  // Verify user has access to this split
  const split = await prisma.split.findFirst({
    where: {
      id: parseInt(splitId),
      OR: [
        { createdBy: userId },
        { participants: { some: { userId: userId } } }
      ]
    }
  });

  if (!split) {
    throw new Error('Split not found or access denied');
  }

  // Verify participant belongs to this split
  const participant = await prisma.splitParticipant.findFirst({
    where: {
      id: parseInt(participantId),
      splitId: parseInt(splitId)
    }
  });

  if (!participant) {
    throw new Error('Participant not found in this split');
  }

  // Update participant payment status
  const updatedParticipant = await prisma.splitParticipant.update({
    where: { id: parseInt(participantId) },
    data: { isPaid: true },
    include: {
      user: {
        select: { id: true, name: true, email: true }
      }
    }
  });

  return { success: true, participant: updatedParticipant };
}

/**
 * Delete a split with enhanced validation
 * @param {number} splitId - Split ID
 * @param {number} userId - User ID (for authorization)
 * @returns {Promise<Object>} Success response
 */
async function deleteSplit(splitId, userId) {
  if (!splitId || isNaN(parseInt(splitId))) {
    throw new Error('Invalid split ID');
  }

  // Verify user is the creator
  const split = await prisma.split.findFirst({
    where: {
      id: parseInt(splitId),
      createdBy: userId
    }
  });

  if (!split) {
    throw new Error('Split not found or access denied');
  }

  await prisma.split.delete({
    where: { id: parseInt(splitId) }
  });

  return { success: true };
}

/**
 * Search splits by title or participant name
 * @param {number} userId - User ID
 * @param {string} query - Search query
 * @param {Object} options - Search options
 * @returns {Promise<Array>} Matching splits
 */
async function searchSplits(userId, query, options = {}) {
  if (!query || query.trim().length < 2) {
    throw new Error('Search query must be at least 2 characters');
  }

  const { limit = 20 } = options;
  const searchTerm = query.trim();

  const splits = await prisma.split.findMany({
    where: {
      AND: [
        {
          OR: [
            { createdBy: userId },
            { participants: { some: { userId: userId } } }
          ]
        },
        {
          OR: [
            { title: { contains: searchTerm, mode: 'insensitive' } },
            { participants: { some: { name: { contains: searchTerm, mode: 'insensitive' } } } }
          ]
        }
      ]
    },
    include: {
      participants: {
        include: {
          user: {
            select: { id: true, name: true, email: true }
          }
        }
      },
      creator: {
        select: { id: true, name: true, email: true }
      }
    },
    orderBy: { createdAt: 'desc' },
    take: Math.min(limit, 50)
  });

  return splits;
}

module.exports = {
  validateSplitData,
  getAll,
  getById,
  create,
  markParticipantPaid,
  deleteSplit,
  searchSplits
};
