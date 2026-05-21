const prisma = require('../config/prisma');
const { getGameConfig } = require('../config/gameConfig');
const { handleAutoStartCountdown, startSpinWheelLogic } = require('../services/gameEngine');

let ioInstance = null;
function setControllerIo(io) { ioInstance = io; }

async function initializeWheel(req, res) {
  const { adminUserId } = req.body;
  try {
    const admin = await prisma.user.findUnique({ where: { id: adminUserId } });
    if (!admin || admin.role !== 'ADMIN') return res.status(403).json({ error: "Unauthorized. Admin role required." }); 

    const activeWheel = await prisma.spinWheel.findFirst({
      where: { status: { in: ['INITIALIZED', 'ACTIVE'] } }
    });
    if (activeWheel) return res.status(400).json({ error: "Only ONE active spin wheel at a time." }); 

    const config = await getGameConfig();
    const newWheel = await prisma.spinWheel.create({
      data: { entryFee: config.entryFee }
    });

    handleAutoStartCountdown(newWheel.id);

    // Broadcast to all connected clients that a new wheel is available
    if (ioInstance) {
      ioInstance.emit('wheel_created', {
        wheelId: newWheel.id,
        entryFee: newWheel.entryFee,
        status: newWheel.status
      });
    }

    res.status(201).json(newWheel);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

async function joinWheel(req, res) {
  const { userId, wheelId } = req.body;
  try {
    const result = await prisma.$transaction(async (tx) => {
      const config = await getGameConfig();
      const wheel = await tx.spinWheel.findUnique({ where: { id: wheelId } });
      if (!wheel || wheel.status !== 'INITIALIZED') throw new Error("Wheel is not open for joining");

      const user = await tx.user.findUnique({ where: { id: userId } });
      if (!user || user.coins < wheel.entryFee) throw new Error("Insufficient coins balance"); 

      // Check if user already joined
      const existingParticipant = await tx.participant.findUnique({
        where: { spinWheelId_userId: { spinWheelId: wheelId, userId } }
      });
      if (existingParticipant) throw new Error("You have already joined this wheel");

      // Deduct entry fee atomically
      await tx.user.update({
        where: { id: userId },
        data: { coins: { decrement: wheel.entryFee } }
      });

      await tx.transaction.create({
        data: { userId, amount: -wheel.entryFee, type: 'ENTRY_FEE', referenceId: wheelId } 
      });

      // Split according to configuration rules
      const toWinner = Math.floor((wheel.entryFee * config.winnerPct) / 100); 
      const toAdmin = Math.floor((wheel.entryFee * config.adminPct) / 100);   
      const toApp = wheel.entryFee - toWinner - toAdmin;                     

      const updatedWheel = await tx.spinWheel.update({
        where: { id: wheelId },
        data: {
          winnerPool: { increment: toWinner }, 
          adminPool: { increment: toAdmin },   
          appPool: { increment: toApp }        
        },
        include: { participants: { include: { user: { select: { id: true, username: true } } } } }
      });

      const participant = await tx.participant.create({
        data: { spinWheelId: wheelId, userId },
        include: { user: { select: { id: true, username: true } } }
      });

      // Get updated user balance
      const updatedUser = await tx.user.findUnique({ where: { id: userId } });

      return { participant, updatedWheel, updatedUser };
    });

    // Get full participant list for broadcast
    const participants = await prisma.participant.findMany({
      where: { spinWheelId: wheelId },
      include: { user: { select: { id: true, username: true } } }
    });

    ioInstance.to(wheelId).emit('user_joined', {
      userId,
      username: result.participant.user.username,
      currentPool: result.updatedWheel.winnerPool,
      participantCount: participants.length,
      participants: participants.map(p => ({
        userId: p.userId,
        username: p.user.username,
        isEliminated: p.isEliminated
      }))
    });

    res.status(200).json({
      participant: result.participant,
      updatedWheel: result.updatedWheel,
      updatedUser: result.updatedUser
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
}

async function manualStartWheel(req, res) {
  const { adminUserId, wheelId } = req.body;
  try {
    const admin = await prisma.user.findUnique({ where: { id: adminUserId } });
    if (!admin || admin.role !== 'ADMIN') return res.status(403).json({ error: "Unauthorized" }); 

    await startSpinWheelLogic(wheelId); 
    res.status(200).json({ message: "Game started manually by Admin" });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
}

// Get status of a specific wheel
async function getWheelStatus(req, res) {
  const { id } = req.params;
  try {
    const wheel = await prisma.spinWheel.findUnique({
      where: { id },
      include: {
        participants: {
          include: { user: { select: { id: true, username: true } } },
          orderBy: { eliminatedAt: 'asc' }
        }
      }
    });
    if (!wheel) return res.status(404).json({ error: 'Wheel not found' });
    res.status(200).json(wheel);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

// Get currently active or initialized wheel
async function getActiveWheel(req, res) {
  try {
    const wheel = await prisma.spinWheel.findFirst({
      where: { status: { in: ['INITIALIZED', 'ACTIVE'] } },
      include: {
        participants: {
          include: { user: { select: { id: true, username: true } } }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
    res.status(200).json(wheel || null);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

// Get game history
async function getHistory(req, res) {
  try {
    const wheels = await prisma.spinWheel.findMany({
      where: { status: { in: ['COMPLETED', 'ABORTED'] } },
      include: {
        participants: {
          include: { user: { select: { id: true, username: true } } }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: 20
    });
    res.status(200).json(wheels);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

module.exports = { initializeWheel, joinWheel, manualStartWheel, getWheelStatus, getActiveWheel, getHistory, setControllerIo };
