const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

/**
 * Get all splits for a user
 * @param {number} userId - User ID
 * @returns {Promise<Array>} Array of splits with participants
 */
async function getAll(userId) {
  return await prisma.split.findMany({
    where: {
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
    },
    orderBy: { createdAt: 'desc' }
  });
}

/**
 * Get a specific split by ID
 * @param {number} splitId - Split ID
 * @param {number} userId - User ID (for authorization)
 * @returns {Promise<Object|null>} Split object or null
 */
async function getById(splitId, userId) {
  const split = await prisma.split.findFirst({
    where: {
      id: splitId,
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
 * Create a new split
 * @param {Object} data - Split data
 * @param {string} data.title - Split title
 * @param {number} data.totalAmount - Total amount
 * @param {number} data.createdBy - Creator user ID
 * @param {number} [data.transactionId] - Optional transaction ID
 * @param {Array} data.participants - Array of participants
 * @returns {Promise<Object>} Created split
 */
async function create(data) {
  const { title, totalAmount, createdBy, transactionId, participants } = data;

  // Validate total amount matches participant amounts
  const participantTotal = participants.reduce((sum, p) => sum + parseFloat(p.amount), 0);
  if (Math.abs(participantTotal - parseFloat(totalAmount)) > 0.01) {
    throw new Error('Participant amounts must equal total amount');
  }

  // Check if participants with emails are existing users
  const participantEmails = participants.filter(p => p.email).map(p => p.email);
  const existingUsers = await prisma.user.findMany({
    where: { email: { in: participantEmails } },
    select: { id: true, email: true, name: true }
  });

  // Create the split with participants
  const split = await prisma.split.create({
    data: {
      title,
      totalAmount: parseFloat(totalAmount),
      createdBy,
      transactionId: transactionId ? parseInt(transactionId) : null,
      participants: {
        create: participants.map(participant => {
          const existingUser = existingUsers.find(u => u.email === participant.email);
          return {
            name: participant.name,
            email: participant.email || null,
            amount: parseFloat(participant.amount),
            isPaid: participant.email === existingUsers.find(u => u.id === createdBy)?.email, // Auto-pay creator
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
 * Mark a participant as paid
 * @param {number} splitId - Split ID
 * @param {number} participantId - Participant ID
 * @param {number} userId - User ID (for authorization)
 * @returns {Promise<Object>} Success response
 */
async function markParticipantPaid(splitId, participantId, userId) {
  // Verify user has access to this split
  const split = await prisma.split.findFirst({
    where: {
      id: splitId,
      OR: [
        { createdBy: userId },
        { participants: { some: { userId: userId } } }
      ]
    }
  });

  if (!split) {
    throw new Error('Split not found or access denied');
  }

  // Update participant payment status
  const updatedParticipant = await prisma.splitParticipant.update({
    where: { id: participantId },
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
 * Delete a split
 * @param {number} splitId - Split ID
 * @param {number} userId - User ID (for authorization)
 * @returns {Promise<Object>} Success response
 */
async function deleteSplit(splitId, userId) {
  // Verify user is the creator
  const split = await prisma.split.findFirst({
    where: {
      id: splitId,
      createdBy: userId
    }
  });

  if (!split) {
    throw new Error('Split not found or access denied');
  }

  await prisma.split.delete({
    where: { id: splitId }
  });

  return { success: true };
}

module.exports = {
  getAll,
  getById,
  create,
  markParticipantPaid,
  deleteSplit
};
